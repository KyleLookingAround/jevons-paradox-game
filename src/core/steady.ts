/**
 * Budget lines and the Steady State parameters: paces and the declining line (its floor and hold), the standing-cap draw
 * delay, the decade length and decade rewards; M2: the wellbeing a decade is judged against (the line's own day), the
 * clear level, clear skies and the sink line, and the decade choices. The streak, decade and Steady State rules
 * themselves run inside step.ts.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND, BUDGET_TOLERANCE, CLEAR_RATE_TOLERANCE } from '../types';
import type { BudgetState, Content, EffectDef, PaceDef, SectorDef, SectorId, SectorState } from '../types';
import {
  DEFAULT_BUDGET_DECLINE, DEFAULT_DECADE_YEARS, DEFAULT_DRAWN_SLACK, DEFAULT_CLEAR_BELOW, DEFAULT_CLEAR_FLOOR,
  DEFAULT_CLEAR_CEILING,
} from './constants';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* Parameters                                                          */
/* ------------------------------------------------------------------ */

export function steadyCfg(content: Content): { decline: number; decadeYears: number; decadeEffects: EffectDef[]; first: EffectDef[] } {
  const st = content.global?.steady;
  const dy = st?.decadeYears;
  return {
    decline: fin(st?.budgetDeclinePerDecade ?? DEFAULT_BUDGET_DECLINE, DEFAULT_BUDGET_DECLINE),
    decadeYears: dy !== undefined && dy > 0 ? dy : DEFAULT_DECADE_YEARS,
    decadeEffects: st?.decadeEffects ?? [],
    first: st?.firstSteadyEffects ?? [],
  };
}
export const decadeEffectsOf = (content: Content, s: SectorId): EffectDef[] =>
  content.sectors[s]?.steady?.decadeEffects ?? steadyCfg(content).decadeEffects;

/** Per-sector resolved M2 parameters (cached per content and sector). */
export interface SectorSteady {
  paces: PaceDef[];
  mode: 'drawn' | 'target';
  slack: number;
  clearBelow: number; clearFloor: number; clearCeiling: number;
  floor: number;
  choices: [string, string][];
}
const sectorSteadyCache = new WeakMap<Content, Record<SectorId, SectorSteady>>();
let lastContent: Content | null = null;
let lastMap: Record<SectorId, SectorSteady> | null = null;
export function sectorSteady(content: Content, s: SectorId): SectorSteady {
  let m: Record<SectorId, SectorSteady> | undefined;
  if (content === lastContent) m = lastMap!;
  else {
    m = sectorSteadyCache.get(content);
    if (!m) { m = Object.create(null) as Record<SectorId, SectorSteady>; sectorSteadyCache.set(content, m); }
    lastContent = content; lastMap = m;
  }
  const hit = m[s];
  if (hit) return hit;
  const g = content.global?.steady;
  const o = content.sectors[s]?.steady;
  const given = o?.paces ?? g?.paces;
  const paces: PaceDef[] = given && given.length ? given : [{
    id: 'gentle', name: 'Gentle', declinePerDecade: fin(o?.declinePerDecade ?? g?.budgetDeclinePerDecade ?? DEFAULT_BUDGET_DECLINE, DEFAULT_BUDGET_DECLINE),
    dividendMul: 1,
  }];
  const known = new Set((content.dividends ?? []).map((d) => d.id));
  const choices = (o?.decadeChoices ?? g?.decadeChoices ?? [])
    .filter((p) => Array.isArray(p) && p.length === 2 && known.has(p[0]) && known.has(p[1]));
  const r: SectorSteady = {
    paces,
    mode: g?.decadeWellbeing === 'target' ? 'target' : 'drawn',
    slack: clamp(fin(g?.drawnSlack ?? DEFAULT_DRAWN_SLACK, DEFAULT_DRAWN_SLACK), 0, 1),
    clearBelow: fin(o?.clearBelow ?? g?.clearBelow ?? DEFAULT_CLEAR_BELOW, DEFAULT_CLEAR_BELOW),
    clearFloor: fin(o?.clearFloor ?? g?.clearFloor ?? DEFAULT_CLEAR_FLOOR, DEFAULT_CLEAR_FLOOR),
    clearCeiling: fin(o?.clearCeiling ?? g?.clearCeiling ?? DEFAULT_CLEAR_CEILING, DEFAULT_CLEAR_CEILING),
    floor: clamp(fin(o?.budgetFloor ?? g?.budgetFloor ?? 0), 0, 1),
    choices,
  };
  m[s] = r;
  return r;
}
export const pacesOf = (content: Content, s: SectorId): PaceDef[] => sectorSteady(content, s).paces;
/** The pace with this id among the sector's paces, or the first (the default) when absent or unknown. */
export function paceOf(content: Content, s: SectorId, id: string | undefined): PaceDef {
  const ps = pacesOf(content, s);
  if (id !== undefined) for (const p of ps) if (p.id === id) return p;
  return ps[0];
}

/* ------------------------------------------------------------------ */
/* Budget line                                                         */
/* ------------------------------------------------------------------ */

/** M1 balance: the line declines until held (Steady State reached on it), never below floor × r0. M2: d = the pace's. */
export function budgetROf(es: SectorState | undefined, def: SectorDef, content: Content, time: number, st0?: SectorSteady): number | null {
  const b = es?.budget;
  if (!b) return null;
  const st = st0 ?? sectorSteady(content, def.id);
  let pace = st.paces[0];
  for (const p of st.paces) if (p.id === b.pace) { pace = p; break; }
  const d = pace.declinePerDecade;
  const until = b.heldAt !== undefined && Number.isFinite(b.heldAt) ? Math.min(time, b.heldAt) : time;
  return fin(Math.max(st.floor * b.r0, b.r0 * Math.pow(Math.max(0, 1 - d), ((until - b.since) * YEARS_PER_SECOND) / 10)));
}
export const standingDrawYearsOf = (def: SectorDef, content: Content): number =>
  Math.max(0, fin(def.steady?.standingDrawYears ?? content.global?.steady?.standingDrawYears ?? 0));
export const isWithin = (R: number, budgetR: number | null): boolean => budgetR !== null && R <= budgetR * (1 + BUDGET_TOLERANCE);

/** A new line drawn now (every route: drawBudget, a lever raise, a standing cap). */
export function newBudget(content: Content, s: SectorId, R: number, time: number, year: number, W: number, P: number, pace?: string): BudgetState {
  return { r0: R, since: time, drawnYear: Math.floor(year), w0: fin(W), p0: Math.max(0, fin(P)), pace: paceOf(content, s, pace).id };
}

/* ------------------------------------------------------------------ */
/* M2: decades against the drawn day, clear skies, the sink line        */
/* ------------------------------------------------------------------ */

/** The wellbeing decades are judged against now: target without a budget or in 'target' mode; else min(target, w0 × (1 − slack)). */
export function decadeWellbeingOf(es: SectorState | undefined, content: Content, s: SectorId, st0?: SectorSteady): number {
  const target = content.global.wellbeingTarget;
  const b = es?.budget;
  if (!b) return target;
  const st = st0 ?? sectorSteady(content, s);
  if (!b || st.mode === 'target' || !(b.w0 >= 0)) return target;
  return Math.min(target, b.w0 * (1 - st.slack));
}

/** clearP = clamp(clearBelow × p0, clearFloor × collapseAt, clearCeiling × collapseAt) (the lower bound wins), or null. */
export function clearPOf(es: SectorState | undefined, def: SectorDef, content: Content, st0?: SectorSteady): number | null {
  const b = es?.budget;
  if (!b) return null;
  const st = st0 ?? sectorSteady(content, def.id);
  const lo = st.clearFloor * def.collapseAt, hi = st.clearCeiling * def.collapseAt;
  const v = st.clearBelow * Math.max(0, fin(b.p0));
  return Math.max(lo, Math.min(hi, v));
}

/** The pressure rates the step uses: net = pressureIn − deletionOut − absorption × P. */
export function pressureNet(pressureIn: number, deletionOut: number, absorption: number, P: number): number {
  return pressureIn - deletionOut - absorption * P;
}

/** Clear skies (unsettled sectors): a budget, P ≤ clearP and the net rate not rising (within the tolerance). */
export function isClear(es: SectorState, def: SectorDef, content: Content, pressureIn: number, deletionOut: number, absorption: number, clearP?: number | null): boolean {
  const cp = clearP !== undefined ? clearP : clearPOf(es, def, content);
  if (cp === null) return false;
  return es.pressure <= cp && pressureNet(pressureIn, deletionOut, absorption, es.pressure) <= CLEAR_RATE_TOLERANCE * def.collapseAt;
}

/** The sink line: (clearP × absorption + deletionOut) × R / pressureIn; null without a budget, absorption ≤ 0, no inflow or R ≤ 0. */
export function sinkROf(es: SectorState, def: SectorDef, content: Content, R: number, pressureIn: number, deletionOut: number, absorption: number, clearP?: number | null): number | null {
  const cp = clearP !== undefined ? clearP : clearPOf(es, def, content);
  if (cp === null || !(absorption > 0) || !(pressureIn > 0) || !(R > 0)) return null;
  return fin((cp * absorption + deletionOut) * R / pressureIn);
}

/* M3 finish: holding settlements together (GlobalParams.settleHold) */
/** GlobalParams.settleHold: each settled Industry's hold cost (Mandate/s) when n are settled. */
export function holdEach(content: Content, n: number): number {
  if (n <= 0) return 0;
  const h = content.global.settleHold;
  const base = Math.max(0, Number.isFinite(h?.holdUpkeep) ? h!.holdUpkeep! : 0), step = Math.max(0, Number.isFinite(h?.holdStep) ? h!.holdStep! : 0);
  return base + step * (n - 1);
}
/** The total hold cost of n settlements (n × holdEach(n)). */
export const holdTotal = (content: Content, n: number): number => n * holdEach(content, n);
