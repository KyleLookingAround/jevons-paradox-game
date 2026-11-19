/**
 * Between runs: the Reckoning, Know-how, Institutions and the loadout (actions and views).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { RUN_HISTORY_MAX } from '../types';
import type { Content, GameState, InstitutionDef, InstitutionView, KnowhowDef, KnowhowView, MetaState, OpeningRecord, RunSummary } from '../types';
import { calendarYear } from './calendar';
import { drawOffer } from './charters';
import { idx } from './contentIndex';
import { fireOneOffs, institutionMax, isSeated } from './effects';
import type { OneOffs } from './effects';
import { emit } from './events';
import { computeFlows } from './flows';
import { headline, withNews } from './headlines';
import { hindsightTerms } from './hindsight';
import { stageOf } from './purchases';
import { createState, isFreshRun, withMeta } from './state';
import { clamp, fin } from './util';

export { isFreshRun } from './state';

export function slotsUsed(meta: MetaState, content: Content): number {
  const ix = idx(content);
  let used = 0;
  for (const id of meta.loadout ?? []) {
    const d = ix.institutions.get(id);
    if (d && (meta.institutions[id] ?? 0) >= 1) used += d.slots ?? 1;
  }
  return used;
}

export function reckon(state: GameState, content: Content): GameState {
  const fl = computeFlows(state, content);
  const cause = fl.pending?.cause ?? 'chosen';
  const terms = hindsightTerms(state, content);
  const hs = terms.total;
  const summary: RunSummary['sectors'] = {};
  for (const s of idx(content).ids) {
    const es = state.sectors[s];
    const f = fl.sectors[s];
    if (!es?.open || !f) continue;
    const def = content.sectors[s];
    const peakAdoption: Record<string, number> = {};
    for (const a of def.applications) if (es.apps[a.id]?.founded) peakAdoption[a.id] = es.apps[a.id].peakAdoption ?? 0;
    summary[s] = {
      etaFold: f.etaFold, peakRFold: es.baseR > 0 ? es.peakR / es.baseR : 1, resourceUsed: state.run.resourceUsed[s] ?? 0,
      decades: es.decadesWithin.length,
      leanDecades: (es.decadesLean ?? []).filter((x) => x).length,
      peakPressure: def.collapseAt > 0 ? fin((es.peakPressure ?? 0) / def.collapseAt) : 0,
      peakAdoption, stage: stageOf(state, content, s) ?? 0, steady: !!state.run.steadySectors[s], settled: !!es.settled,
    };
    if (def.resourceKind === 'stock') summary[s].unburnt = es.reserveMax > 0 ? clamp(es.reserve / es.reserveMax, 0, 1) : 0;
  }
  const charter = state.meta.charter ?? null;
  let commonsLevels = 0;
  for (const k in state.commons?.levels ?? {}) commonsLevels += state.commons.levels[k] ?? 0;
  const run = state.run;
  const lastRun: RunSummary = {
    cause, seconds: state.time, yearReached: Math.floor(calendarYear(state, content)), hindsightGained: hs,
    peakWellbeing: run.peakWellbeing, sectors: summary, hindsightTerms: terms,
    ...(fl.pending?.sector ? { causeSector: fl.pending.sector } : {}),
    index: state.meta.reckonings + 1, totalSecondsAtEnd: state.meta.totalSeconds,
    ...(charter !== null ? { charter } : {}),
    decisions: run.decisions ?? 0, automated: run.automated ?? 0,
    decisionsByDecade: (run.decisionsByDecade ?? []).slice(), automatedByDecade: (run.automatedByDecade ?? []).slice(),
    commonsLevels, peakPopulation: state.peakPopulation,
  };
  const opening: OpeningRecord = {
    actions: (run.opening ?? []).slice(), firstBudgetAt: run.firstBudgetAt ?? null, seconds: state.time,
    ...(charter !== null ? { charter } : {}),
  };
  const runs = [...(state.meta.runs ?? []), lastRun];
  const meta: MetaState = {
    ...state.meta,
    hindsight: state.meta.hindsight + hs,
    hindsightEarned: state.meta.hindsightEarned + hs,
    reckonings: state.meta.reckonings + 1,
    achievements: { ...state.meta.achievements, firstReckoning: true },
    lastRun,
    runs: runs.length > RUN_HISTORY_MAX ? runs.slice(runs.length - RUN_HISTORY_MAX) : runs,
    opening,
    ...(state.meta.firstOpening ? {} : { firstOpening: opening }),
    charter: null,
  };
  const nextSeed = (Math.imul(state.seed >>> 0, 1103515245) + 12345) >>> 0;
  const s0 = createState(content, meta, nextSeed);
  const s = { ...s0, charterOffer: drawOffer(s0, content, charter ?? undefined) };
  const year = calendarYear(s, content);
  const out = { ...s, news: withNews(s.news, [headline(s, content, 'reckoning', 0, { year }, fl.pending?.sector)]) };
  return emit(out, [{ kind: 'reckoning', id: cause, ...(fl.pending?.sector ? { sector: fl.pending.sector } : {}) }], 0, year);
}

function knowhowGate(meta: MetaState, content: Content, def: KnowhowDef): { req: boolean; excludedBy: string | null } {
  const tree = def.tree ?? 'general';
  const tier = def.tier ?? 1;
  let req = true;
  if (tier >= 2) {
    req = (content.knowhow ?? []).some((k) => (k.tree ?? 'general') === tree && (k.tier ?? 1) === tier - 1 && (meta.knowhow[k.id] ?? 0) >= 1);
  }
  let excludedBy: string | null = null;
  if (def.branch !== undefined) {
    for (const k of content.knowhow ?? []) {
      if (k.id !== def.id && k.branch === def.branch && (meta.knowhow[k.id] ?? 0) >= 1) { excludedBy = k.id; break; }
    }
  }
  return { req, excludedBy };
}
const knowhowCost = (def: KnowhowDef, lvl: number): number => def.cost * Math.pow(def.costGrowth, lvl);

export function buyKnowhow(state: GameState, content: Content, id: string): GameState {
  const def = idx(content).knowhow.get(id);
  if (!def || !isFreshRun(state)) return state;
  const lvl = state.meta.knowhow[id] ?? 0;
  if (lvl >= def.maxLevel) return state;
  const gate = knowhowGate(state.meta, content, def);
  if (!gate.req || gate.excludedBy) return state;
  const cost = knowhowCost(def, lvl);
  if (!(state.meta.hindsight >= cost)) return state;
  // M2: one-offs fire only the first time this level is ever owned (knowhowPeak), so respec and re-buy grants nothing twice
  const peak = state.meta.knowhowPeak?.[id] ?? 0;
  const fires = lvl + 1 > peak;
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  if (fires) fireOneOffs(def.effects, 1, computeFlows(state, content).income, one);
  const s = withMeta(state, content, {
    ...state.meta, hindsight: state.meta.hindsight - cost, knowhow: { ...state.meta.knowhow, [id]: lvl + 1 },
    slots: state.meta.slots + one.slots, knowhowPeak: { ...(state.meta.knowhowPeak ?? {}), [id]: Math.max(peak, lvl + 1) },
  });
  if (!one.capital && !one.mandate) return s;
  const inc = computeFlows(s, content).income;
  const one2: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  fireOneOffs(def.effects, 1, inc, one2);
  return { ...s, capital: s.capital + one2.capital, mandate: s.mandate + one2.mandate };
}

const institutionCost = (def: InstitutionDef, level: number): number | null =>
  level >= institutionMax(def) ? null : level === 0 ? def.cost : def.nextLevels![level - 1].cost;

export function buyInstitution(state: GameState, content: Content, id: string): GameState {
  const def = idx(content).institutions.get(id);
  if (!def || !isFreshRun(state)) return state;
  const lvl = state.meta.institutions[id] ?? 0;
  const cost = institutionCost(def, lvl);
  if (cost === null) return state;
  if (!(def.requires ?? []).every((r) => (state.meta.institutions[r] ?? 0) >= 1)) return state;
  if (!(state.meta.hindsight >= cost)) return state;
  return withMeta(state, content,
    { ...state.meta, hindsight: state.meta.hindsight - cost, institutions: { ...state.meta.institutions, [id]: lvl + 1 } });
}

export function setLoadout(state: GameState, content: Content, ids: string[]): GameState {
  if (!Array.isArray(ids) || !isFreshRun(state)) return state;
  const ix = idx(content);
  if (new Set(ids).size !== ids.length) return state;
  let used = 0;
  for (const id of ids) {
    const d = ix.institutions.get(id);
    if (!d || (state.meta.institutions[id] ?? 0) < 1) return state;
    used += d.slots ?? 1;
  }
  if (used > state.meta.slots) return state;
  const cur = state.meta.loadout ?? [];
  if (cur.length === ids.length && cur.every((x, i) => x === ids[i])) return state;
  return withMeta(state, content, { ...state.meta, loadout: ids.slice() });
}

export function knowhowViews(state: GameState, content: Content): KnowhowView[] {
  const fresh = isFreshRun(state);
  return (content.knowhow ?? []).map((def) => {
    const level = state.meta.knowhow[def.id] ?? 0;
    const maxed = level >= def.maxLevel;
    const cost = maxed ? null : knowhowCost(def, level);
    const gate = knowhowGate(state.meta, content, def);
    const affordable = cost !== null && state.meta.hindsight >= cost;
    return {
      def, level, cost, requirementsMet: gate.req, maxed, excludedBy: gate.excludedBy, affordable,
      canBuy: gate.req && !maxed && !gate.excludedBy && affordable && fresh,
    };
  });
}

export function institutionViews(state: GameState, content: Content): InstitutionView[] {
  const fresh = isFreshRun(state);
  const free = state.meta.slots - slotsUsed(state.meta, content);
  return (content.institutions ?? []).map((def) => {
    const level = state.meta.institutions[def.id] ?? 0;
    const nextCost = institutionCost(def, level);
    const requirementsMet = (def.requires ?? []).every((r) => (state.meta.institutions[r] ?? 0) >= 1);
    const affordable = nextCost !== null && state.meta.hindsight >= nextCost;
    const seated = isSeated(state.meta, def.id);
    const slots = def.slots ?? 1;
    return {
      def, level, maxLevel: institutionMax(def), nextCost, requirementsMet, affordable, seated, slots,
      canBuy: requirementsMet && nextCost !== null && affordable && fresh,
      canSeat: level >= 1 && !seated && free >= slots && fresh,
    };
  });
}

/* ------------------------------------------------------------------ */
/* M2: the respec                                                      */
/* ------------------------------------------------------------------ */

/** Hindsight a respec would refund, per tree id (trees with nothing owned are absent). */
export function respecRefunds(state: GameState, content: Content): Record<string, number> {
  const mul = clamp(fin(content.global?.respecRefund ?? 1, 1), 0, 1);
  const out: Record<string, number> = {};
  for (const def of content.knowhow ?? []) {
    const lvl = state.meta.knowhow[def.id] ?? 0;
    if (lvl <= 0) continue;
    let paid = 0;
    for (let l = 0; l < lvl; l++) paid += knowhowCost(def, l);
    const t = def.tree ?? 'general';
    out[t] = (out[t] ?? 0) + mul * paid;
  }
  return out;
}

export function respecKnowhow(state: GameState, content: Content, tree?: string): GameState {
  if (!isFreshRun(state)) return state;
  const refunds = respecRefunds(state, content);
  const scope = (content.knowhow ?? []).filter((d) => (state.meta.knowhow[d.id] ?? 0) > 0 && (tree === undefined || (d.tree ?? 'general') === tree));
  if (!scope.length) return state;
  const refund = tree === undefined ? Object.values(refunds).reduce((a, b) => a + b, 0) : refunds[tree] ?? 0;
  const knowhow = { ...state.meta.knowhow };
  for (const d of scope) delete knowhow[d.id];
  return withMeta(state, content, { ...state.meta, knowhow, hindsight: fin(state.meta.hindsight + refund) });
}
