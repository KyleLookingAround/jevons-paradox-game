/**
 * M5 (Core A): inspection and concealment (ChairState, "INSPECTION AND CONCEALMENT"): the Inspectors and their rest,
 * the rival's quiet period and coverage, the concealment ramp at order ticks, inspect() and Standing inspection, the
 * reported figure, the levy and cap scaling for the solver, certified decades, and the sector fields of the views.
 * (A cap's or quota's target ÷ (1 − c) is applied in levers.ts's sectorLevers through chair/acting.ts.) Layer 6.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { CONFIDENCE_MAX, YEARS_PER_SECOND } from '../../types';
import type { ChairState, Content, GameState, SectorDerived, SectorId } from '../../types';
import { calendarYear } from '../calendar';
import { idx } from '../contentIndex';
import { modsOf } from '../effects';
import type { Mods } from '../effects';
import { emit } from '../events';
import type { EvDraft } from '../events';
import { featureOn } from '../features';
import { computeFlows } from '../flows';
import type { Flows } from '../flows';
import { headline, newsWith } from '../headlines';
import { mandateShareOf } from '../levers';
import { recordAutomated } from '../record';
import { clamp, fin } from '../util';
import { chairIdx } from './chairIndex';
import { concealOf, effectiveOf } from './acting';
import { leverEscape } from './acting';

/** Inspection rules run: a Ministry with feature 'inspection' on and ChairDef present. */
export const inspectionOn = (state: GameState, content: Content): boolean =>
  !!state.chair && !!content.chair && featureOn(content, state.meta, 'inspection');

/** A rival sector: an open chair sector, or a capstoned one, in a Ministry. */
export function isRivalSector(state: GameState, content: Content, s: SectorId): boolean {
  if (!state.chair) return false;
  const es = state.sectors[s];
  return !!es?.open && (chairIdx(content).chairSet.has(s) || !!es.capstoned);
}
/** Open rival sectors, in sectorOrder. */
export function rivalSectors(state: GameState, content: Content): SectorId[] {
  if (!state.chair) return [];
  return idx(content).ids.filter((s) => isRivalSector(state, content, s));
}

/** Inspectors in total (ChairDef.inspection.inspectors + Σ inspectorAdd, floored at 0, whole). */
export function inspectorTotal(content: Content, mods: Mods): number {
  return Math.max(0, Math.floor(fin(content.chair?.inspection.inspectors ?? 0) + fin(mods.inspectorAdd) + 1e-9));
}
/** Seconds until each Inspector is ready (0 = ready), index order. */
export function inspectorsReadyIn(state: GameState, content: Content, mods?: Mods): number[] {
  const ch = state.chair;
  if (!ch) return [];
  const n = inspectorTotal(content, mods ?? modsOf(state, content));
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Math.max(0, fin((ch.inspectors[i] ?? 0) - state.time)));
  return out;
}
/** ChairView.inspectors (total 0 while feature 'inspection' is off). */
export function inspectorsView(state: GameState, content: Content): { ready: number; total: number; nextReadyIn: number | null; readyIn: number[] } {
  if (!inspectionOn(state, content)) return { ready: 0, total: 0, nextReadyIn: null, readyIn: [] };
  const readyIn = inspectorsReadyIn(state, content);
  const ready = readyIn.filter((x) => x <= 0).length;
  const waiting = readyIn.filter((x) => x > 0);
  return { ready, total: readyIn.length, nextReadyIn: ready > 0 || !waiting.length ? null : Math.min(...waiting), readyIn };
}

const lerpRound = (x: number): number => Math.round(x);
/** The rival's quiet period now, model years: quietYears + round((0.5 − drawn) × quietSpread) + Σ quietYearsAdd, ≥ 0. */
export function quietYearsOf(state: GameState, content: Content, mods?: Mods): number {
  const cd = content.chair, rv = content.rival;
  if (!cd || !rv) return 0;
  const drawn = clamp(fin(state.meta.office?.profile?.drawn ?? rv.defaultProfile.drawn), 0, 1);
  const m = mods ?? modsOf(state, content);
  return Math.max(0, fin(cd.inspection.quietYears) + lerpRound((0.5 - drawn) * fin(rv.policy.quietSpread)) + fin(m.quietYearsAdd));
}
/** The fine multiplier in force: fineMul × Π fineMul effects. */
const fineMulOf = (content: Content, mods: Mods): number => Math.max(0, fin(content.chair?.inspection.fineMul ?? 0)) * fin(mods.fineMul, 1);

/** The sector has a duty, charge, cap or quota acting (effective level ≥ 1). */
function hasLevy(state: GameState, content: Content, ch: ChairState, s: SectorId): boolean {
  for (const l of idx(content).leversBySector[s] ?? []) {
    if (l.kind !== 'duty' && l.kind !== 'charge' && l.kind !== 'cap' && l.kind !== 'quota') continue;
    if (effectiveOf(ch, l.id, state.levers[l.id]?.level ?? 0, state.time) >= 1) return true;
  }
  return false;
}

/**
 * The concealment ramp at an order tick of `years` model years (step 3 of the rival's decision), per rival sector: only
 * with a 'conceal' row whose feature is on. A standing 'certify' holds it at 0; otherwise it ramps by concealPerYear ×
 * years (up to concealMax) once the quiet period since the last inspection (or the Ministry's start) has passed, on a
 * capstoned sector or one with a levy, cap or quota acting while fineMul × coverage < 1.
 */
export function concealTick(state: GameState, content: Content, years: number): GameState {
  const ch = state.chair;
  const cd = content.chair, rv = content.rival;
  if (!ch || !cd || !rv) return state;
  const row = chairIdx(content).responses.get('conceal');
  if (!row || (row.feature && !featureOn(content, state.meta, row.feature))) return state;
  const mods = modsOf(state, content);
  const sectors = rivalSectors(state, content);
  if (!sectors.length) return state;
  const quiet = quietYearsOf(state, content, mods);
  const coverage = Math.min(1, inspectorTotal(content, mods) / sectors.length);
  const fm = fineMulOf(content, mods);
  const max = clamp(fin(cd.inspection.concealMax), 0, 0.99);
  const per = Math.max(0, fin(cd.inspection.concealPerYear));
  let conc: Record<SectorId, number> | null = null;
  for (const s of sectors) {
    const c0 = ch.rival.concealment[s] ?? 0;
    let c = c0;
    if (mods.certify.has(s)) c = 0;
    else if ((state.time - (ch.inspected[s] ?? 0)) * YEARS_PER_SECOND >= quiet - 1e-9
      && (state.sectors[s].capstoned || (hasLevy(state, content, ch, s) && fm * coverage < 1))) c = Math.min(max, c0 + per * years);
    if (c !== c0) (conc ??= { ...ch.rival.concealment })[s] = fin(c);
  }
  return conc ? { ...state, chair: { ...ch, rival: { ...ch.rival, concealment: conc } } } : state;
}

/** The sector's levy revenue per second at the TRUE R (duty, permit and charge parts × D, before concealment). */
function trueLevy(fl: Flows, s: SectorId): number {
  const f = fl.sectors[s];
  if (!f || fl.settled[s] !== undefined) return 0;
  return Math.max(0, fin((Math.max(0, f.dutyPart) + Math.max(0, f.permitPart) + Math.max(0, f.chargePart ?? 0)) * f.D));
}

/** inspect() would accept sector s now (feature, a Ministry, no Reckoning pending, an open rival sector, an Inspector ready). */
export function canInspect(state: GameState, content: Content, s: SectorId): boolean {
  if (!inspectionOn(state, content) || !isRivalSector(state, content, s)) return false;
  if (computeFlows(state, content).pending) return false;
  return inspectorsReadyIn(state, content).some((x) => x <= 0);
}

/**
 * ModelApi.inspect (by 'player', a decision) and Standing inspection (by 'inspectorate'). The same reference when refused.
 */
export function inspect(state: GameState, content: Content, s: SectorId, by: 'player' | 'inspectorate' = 'player'): GameState {
  if (!canInspect(state, content, s)) return state;
  const ch = state.chair!;
  const cd = content.chair!;
  const mods = modsOf(state, content);
  const readyIn = inspectorsReadyIn(state, content, mods);
  const i = readyIn.findIndex((x) => x <= 0);
  const inspectors = ch.inspectors.slice();
  while (inspectors.length <= i) inspectors.push(0);
  inspectors[i] = state.time + Math.max(0, fin(cd.inspection.cooldownYears)) / YEARS_PER_SECOND;
  const c = concealOf(state, s);
  const year = calendarYear(state, content);
  const ev: EvDraft[] = [];
  let mandate = state.mandate;
  let confidence = ch.confidence;
  let rival = ch.rival;
  let found = ch.found;
  let findings = ch.findings ?? 0;
  if (c > 0) {
    const fl = computeFlows(state, content);
    const L = trueLevy(fl, s) * mandateShareOf(content);
    mandate = fin(mandate + fineMulOf(content, mods) * c * L * quietYearsOf(state, content, mods) / YEARS_PER_SECOND);
    confidence = clamp(fin(confidence + fin(cd.confidence.fineFound)), 0, CONFIDENCE_MAX);
    found = { ...found, [s]: { share: c, t: state.time } };
    rival = { ...rival, concealment: { ...rival.concealment, [s]: 0 } };
    findings++;
    ev.push({ kind: 'inspected', sector: s, n: Math.round(c * 100), by }, { kind: 'concealmentFound', sector: s, n: Math.round(c * 100), by });
  } else ev.push({ kind: 'inspected', sector: s, n: 0, by });
  const item = headline(state, content, c > 0 ? 'concealmentFound' : 'inspectedClean', state.time, { year, n: Math.round(c * 100) }, s);
  let out: GameState = {
    ...state, mandate,
    chair: { ...ch, confidence, inspectors, inspected: { ...ch.inspected, [s]: state.time }, found, rival,
      inspections: (ch.inspections ?? 0) + 1, findings },
    ...newsWith(state, content, [item]),
  };
  if (by === 'inspectorate') out = { ...out, run: recordAutomated(out.run, state.time, 1) };
  return emit(out, ev, state.time, year);
}

/** Standing inspection is available (a standing orderUnlock 'inspection' and feature 'inspection'). */
export const standingAvailable = (state: GameState, content: Content, mods?: Mods): boolean =>
  inspectionOn(state, content) && (mods ?? modsOf(state, content)).orderUnlock.has('inspection');

/** Standing inspection at a model-decade boundary of run time (OrdersState.inspection; by 'inspectorate'). */
export function standingInspection(prev: GameState, next: GameState, content: Content): GameState {
  const o = next.meta.orders?.inspection;
  if (!o?.on || o.sector === null || !next.chair) return next;
  const dec = (t: number): number => Math.floor((t * YEARS_PER_SECOND) / 10 + 1e-9);
  if (dec(next.time) <= dec(prev.time) || !standingAvailable(next, content)) return next;
  return inspect(next, content, o.sector, 'inspectorate');
}

/* ------------------------------------------------------------------ */
/* For the solver, the step and the views                              */
/* ------------------------------------------------------------------ */

/** Levy REVENUE of sector s × this (duty, permit, charge; not the price part): 1 − c while 'inspection' is on, else 1. */
export function levyScale(state: GameState, content: Content, s: SectorId): number {
  return state.chair && featureOn(content, state.meta, 'inspection') ? 1 - concealOf(state, s) : 1;
}
/** Informational: the factor on a cap's or quota's target in s, 1 / ((1 − c)(1 − escape of the tightest acting rung)).
 *  ALREADY applied in levers.ts (sectorLevers); the solver needs nothing. Uses the largest escape among s's caps/quotas. */
export function capTargetScale(state: GameState, content: Content, s: SectorId): number {
  if (!state.chair) return 1;
  let esc = 0;
  for (const l of idx(content).leversBySector[s] ?? []) if (l.kind === 'cap' || l.kind === 'quota') esc = Math.max(esc, leverEscape(state, content, l.id));
  return 1 / ((1 - esc) * (1 - concealOf(state, s)));
}
/** The official gauge: R × (1 − c) on a rival sector while feature 'inspection' is on; R otherwise. */
export function reportedR(state: GameState, content: Content, s: SectorId, R: number): number {
  return state.chair && featureOn(content, state.meta, 'inspection') ? R * (1 - concealOf(state, s)) : R;
}
/** A decade of sector s ending at run time tEnd (decadeYears long) is certified: recorded in office on a rival sector
 *  with an inspection inside its window. */
export function certifyDecade(state: GameState, content: Content, s: SectorId, tEnd: number): boolean {
  const ch = state.chair;
  if (!ch || !isRivalSector(state, content, s)) return false;
  const t = ch.inspected[s];
  const years = fin(content.global?.steady?.decadeYears ?? 10, 10);
  return typeof t === 'number' && t <= tEnd + 1e-9 && t >= tEnd - years / YEARS_PER_SECOND - 1e-9;
}

/** SectorDerived's M5 inspection fields for sector s (the rest of the M5 fields are Core B's). */
export function sectorInspectFields(state: GameState, content: Content, s: SectorId, R: number): Pick<SectorDerived,
  'reportedR' | 'inspectedUntil' | 'found' | 'inspectedAt' | 'rival' | 'certifiedDecades'> {
  const ch = state.chair;
  const es = state.sectors[s];
  let certified = 0;
  for (const x of es?.decadesCertified ?? []) if (x) certified++;
  if (!ch) return { reportedR: R, inspectedUntil: null, found: null, inspectedAt: null, rival: false, certifiedDecades: certified };
  const t = ch.inspected[s];
  const reveal = Math.max(0, fin(content.chair?.inspection.revealYears ?? 0)) / YEARS_PER_SECOND;
  return {
    reportedR: reportedR(state, content, s, R),
    inspectedUntil: typeof t === 'number' && t + reveal > state.time ? t + reveal : null,
    found: ch.found[s] ?? null,
    inspectedAt: typeof t === 'number' ? t : null,
    rival: isRivalSector(state, content, s),
    certifiedDecades: certified,
  };
}
