/**
 * Between runs: the Reckoning, Know-how, Institutions and the loadout (actions and views).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { RUN_HISTORY_MAX } from '../types';
import type { Content, GameState, InstitutionDef, InstitutionView, KnowhowDef, KnowhowView, MetaState, NewsItem, OpeningRecord, RunSummary } from '../types';
import { calendarYear } from './calendar';
import { drawOffer } from './charters';
import { idx } from './contentIndex';
import { fireOneOffs, applyM3OneOffs, institutionMax, isSeated } from './effects';
import type { OneOffs } from './effects';
import { emit } from './events';
import type { EvDraft } from './events';
import { featureOn } from './features';
import { dueFeature, unlockFeature } from './unfold';
import { computeFlows } from './flows';
import { headline, newsWith } from './headlines';
import { hindsightTerms } from './hindsight';
import { stageOf } from './purchases';
import { clearedThisRun } from './history';
import { publish } from './returns';
import { sprawlOf } from './travel';
import { createState, isFreshRun, withMeta } from './state';
import { milestone } from './milestones';
import { evalCond, condCheck } from './conditions';
import { clamp, fin } from './util';
import { chairIdx } from './chair/chairIndex';

export { isFreshRun } from './state';

/** M5: RunSummary.ministry for a run that was a Ministry. */
function ministrySummary(state: GameState, content: Content): NonNullable<RunSummary['ministry']> {
  const ch = state.chair!;
  const cx = chairIdx(content);
  let closed = 0;
  for (const id in ch.loopholes) if (ch.loopholes[id].status === 'closed') closed++;
  return {
    electionsWon: ch.electionsWon, lost: ch.electionsLost ?? 0, inspections: ch.inspections ?? 0, found: ch.findings ?? 0,
    loopholesClosed: closed, treasury: state.capital,
    settledFromChair: cx.chairSectors.filter((s) => !!state.sectors[s]?.open && !!state.sectors[s].settled),
    ...(state.meta.office ? { profile: state.meta.office.profile } : {}),
  };
}
/** M5: meta.office after a Reckoning in office: one more Ministry begun, and the run's Precedent terms recorded. */
function officeAfterReckoning(state: GameState, content: Content): NonNullable<MetaState['office']> {
  const o = state.meta.office!;
  const ch = state.chair!;
  const settled = chairIdx(content).chairSectors.filter((s) => !!state.sectors[s]?.open && !!state.sectors[s].settled).length;
  const r = o.record;
  return {
    ...o, ministries: o.ministries + 1,
    record: {
      certifiedDecades: r.certifiedDecades + (state.run.certifiedDecades ?? 0), settledFromChair: r.settledFromChair + settled,
      parliamentsWon: r.parliamentsWon + ch.electionsWon, wellbeingYears: fin(r.wellbeingYears + (state.run.wellbeingYears ?? 0)),
    },
  };
}

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
  const m5 = !!content.office;
  const cx = chairIdx(content);
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
    // M3: seams, load factor, speed and sprawl at the end (absent where the sector has no such kind)
    if (def.seams?.length && def.resourceKind === 'stock') summary[s].seams = es.seamsSunk ?? 0;
    if (def.load) { const lf = es.settled ? es.settled.load?.factor : f.load?.factor; if (lf !== undefined) summary[s].loadFactor = lf; }
    if (def.travel) {
      const v = es.settled ? es.settled.travel?.speed : f.travel?.v;
      if (v !== undefined) summary[s].speed = v;
      summary[s].sprawl = es.settled?.travel ? es.settled.travel.sprawl : sprawlOf(def, es);
    }
    // M4: the lowest stock and the crossing; the order book's peaks; capstoned
    if (def.resourceKind === 'renewable') { summary[s].minStock = es.minStock ?? (es.reserveMax > 0 ? clamp(es.reserve / es.reserveMax, 0, 1) : 0); summary[s].crossed = !!es.crossed; }
    if (es.feedPeak) summary[s].feedR = { ...es.feedPeak };
    if (es.capstoned) summary[s].capstoned = true;
    // M5: how long it was open (the offer's "five minutes"); in office, certified decades and who ran it
    if (m5) summary[s].openFor = es.openFor;
    if (state.chair) {
      summary[s].certified = (es.decadesCertified ?? []).filter((x) => x).length;
      if (cx.chairSet.has(s) || es.capstoned) summary[s].rival = true;
    }
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
    ...(state.meta.history ? { history: state.meta.history, historyCleared: clearedThisRun(state) } : {}),
    dispatchesAnswered: run.dispatchesAnswered ?? 0, dispatchesDefaulted: run.dispatchesDefaulted ?? 0,
    ...(state.chair ? { ministry: ministrySummary(state, content) } : {}),
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
    history: null,
    ...(state.meta.office && state.chair ? { office: officeAfterReckoning(state, content) } : {}), // M5
  };
  const nextSeed = (Math.imul(state.seed >>> 0, 1103515245) + 12345) >>> 0;
  let s0 = createState(content, meta, nextSeed);
  // the unfolding: a feature that waits on a Reckoning arrives with the new run (before the Charter draw it may open)
  const fItems: NewsItem[] = [];
  const fEv: EvDraft[] = [];
  const due = dueFeature(s0, content, true); // M5 (follow-up 2): the gap does not hold back the Reckoning's arrival
  if (due) s0 = { ...s0, meta: unlockFeature(s0.meta, content, due, 0, calendarYear(s0, content), fItems, fEv) };
  const offer = featureOn(content, s0.meta, 'charters') ? drawOffer(s0, content, charter ?? undefined) : [];
  // M5: the invitation, judged on the run just ended (OfficeDef.when), while office is not taken
  const s = { ...s0, charterOffer: offer, ...(content.office && !meta.office && evalCond(state, content, content.office.when) ? { officeOffer: true } : {}) };
  const year = calendarYear(s, content);
  const out = { ...s, ...newsWith(s, content, [headline(s, content, 'reckoning', 0, { year }, fl.pending?.sector), ...fItems]) };
  // M4: one 'capstoned' event per capstoned sector after 'reckoning'; the milestone 'capstone' the first time
  const capEv: EvDraft[] = [];
  for (const x of idx(content).ids) if (out.sectors[x]?.capstoned) capEv.push({ kind: 'capstoned', sector: x, id: out.meta.world?.capstone?.[x]?.act });
  const out2 = capEv.length ? { ...out, meta: milestone(out.meta, 'capstone', null, year) } : out;
  const r = emit(out2, [{ kind: 'reckoning', id: cause, ...(fl.pending?.sector ? { sector: fl.pending.sector } : {}) }, ...capEv, ...fEv], 0, year);
  // M3: an unpublished household return is published into the new run's news (only once the Proprietor's Day has come)
  return r.meta.flags?.proprietor === true ? publish(r, content, 0, true) : r;
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
/** M5: the node's tree is held by the rival while office is taken (KnowhowView.held). */
const knowhowHeld = (state: GameState, content: Content, def: KnowhowDef): boolean =>
  !!state.meta.office && content.knowhowTrees?.[def.tree ?? 'general']?.holder === 'rival';

export function buyKnowhow(state: GameState, content: Content, id: string): GameState {
  const def = idx(content).knowhow.get(id);
  if (!def || !isFreshRun(state)) return state;
  const lvl = state.meta.knowhow[id] ?? 0;
  if (lvl >= def.maxLevel) return state;
  if (knowhowHeld(state, content, def) || (def.when && !evalCond(state, content, def.when))) return state; // M5
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
  const s1 = applyM3OneOffs(s, content, { ...one, pop: undefined, pressure: undefined });
  if (!one.capital && !one.mandate) return s1;
  const inc = computeFlows(s1, content).income;
  const one2: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  fireOneOffs(def.effects, 1, inc, one2);
  return { ...s1, capital: Math.max(0, s1.capital + one2.capital), mandate: Math.max(0, s1.mandate + one2.mandate) };
}

const institutionCost = (def: InstitutionDef, level: number): number | null =>
  level >= institutionMax(def) ? null : level === 0 ? def.cost : def.nextLevels![level - 1].cost;

/** M4 (polish): the label of the next level's unmet `needs` (InstitutionDef.needs, InstitutionLevelDef.needs), else null. */
export function institutionNeeds(state: GameState, content: Content, def: InstitutionDef, level: number): string | null {
  if (level >= institutionMax(def)) return null;
  const c = level === 0 ? def.needs : def.nextLevels![level - 1].needs;
  if (!c || evalCond(state, content, c)) return null;
  return condCheck(state, content, c).label;
}

export function buyInstitution(state: GameState, content: Content, id: string): GameState {
  const def = idx(content).institutions.get(id);
  if (!def || !isFreshRun(state)) return state;
  const lvl = state.meta.institutions[id] ?? 0;
  const cost = institutionCost(def, lvl);
  if (cost === null) return state;
  if (!(def.requires ?? []).every((r) => (state.meta.institutions[r] ?? 0) >= 1)) return state;
  // M5: an Institution unlocked at level 0 (Take office, the Treaty) was bought once: its level-1 `needs` pass. M5 (amend):
  // its `when` still applies (content's "not in a Ministry" gates hold for a wiped Institution too)
  const unlocked = Object.prototype.hasOwnProperty.call(state.meta.institutions, id);
  if (lvl < 1 && def.when && !evalCond(state, content, def.when)) return state; // M4 (amend): not offered yet
  if (!(unlocked && lvl === 0) && institutionNeeds(state, content, def, lvl) !== null) return state; // M4 (polish): the level's evidence
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
    const held = knowhowHeld(state, content, def);
    const visible = !def.when || evalCond(state, content, def.when);
    return {
      def, level, cost, requirementsMet: gate.req, maxed, excludedBy: gate.excludedBy, affordable,
      canBuy: gate.req && !maxed && !gate.excludedBy && affordable && fresh && !held && visible,
      ...(content.office ? { held, visible } : {}),
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
    const unlocked = Object.prototype.hasOwnProperty.call(state.meta.institutions, def.id); // M5: level 0 = unlocked
    const visible = level >= 1 || !def.when || evalCond(state, content, def.when); // M4 (amend); M5 (amend): also when unlocked at 0
    const needs = unlocked && level === 0 ? null : institutionNeeds(state, content, def, level); // M4 (polish)
    return {
      def, level, maxLevel: institutionMax(def), nextCost, requirementsMet, affordable, seated, slots,
      canBuy: visible && requirementsMet && nextCost !== null && affordable && fresh && needs === null,
      canSeat: level >= 1 && !seated && free >= slots && fresh,
      visible, needs, ...(content.office ? { unlocked } : {}),
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
