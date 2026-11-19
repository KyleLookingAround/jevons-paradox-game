/**
 * State construction: a fresh meta, run stats and sector, the baseline snapshot, history samples, and createState.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { SAVE_VERSION } from '../types';
import type { AppState, Content, GameState, HistorySample, LeverState, MetaState, OrdersState, RunStats, SectorDef, SectorId, SectorState } from '../types';
import { HISTORY_MAX, DEFAULT_MARKET_PAYBACK, DEFAULT_KEEP_SECONDS } from './constants';
import { idx } from './contentIndex';
import { computeMods, etaAt, flowCapacity, modsOf, NO_SOURCES } from './effects';
import type { Mods } from './effects';
import { computeFlows } from './flows';
import type { Flows } from './flows';
import { leverMaxLevel } from './levers';
import type { SectorFlow } from './solver';
import { budgetROf, sinkROf } from './steady';
import { absorptionOf } from './effects';
import { fin } from './util';
import { featureOn } from './features';

/* ------------------------------------------------------------------ */
/* State construction                                                  */
/* ------------------------------------------------------------------ */

/** M2: the default standing orders (see OrdersState). */
export function defaultOrders(content: Content): OrdersState {
  const pb = content.global?.orders?.marketPaybackMax;
  return {
    market: { on: true, paybackMax: typeof pb === 'number' && Number.isFinite(pb) ? pb : DEFAULT_MARKET_PAYBACK, sectors: {} },
    civilService: { on: false, levers: {} },
    treasury: { on: false, keepSeconds: DEFAULT_KEEP_SECONDS, projects: [] },
  };
}

export function freshMeta(content: Content): MetaState {
  return {
    hindsight: 0, hindsightEarned: 0, reckonings: 0, knowhow: {}, institutions: {}, achievements: {},
    steadySectors: {}, sectorsOpened: {}, totalSeconds: 0,
    slots: content.global?.startingSlots ?? 2, loadout: [], backfiredSectors: {},
    charter: null, orders: defaultOrders(content), runs: [], eventSeq: 0, knowhowPeak: {}, peakPopulationEver: 1, features: {},
  };
}

export function freshRunStats(): RunStats {
  return {
    peakWellbeing: 0, decoupledYears: 0, resourceUsed: {}, clicks: 0, steadySectors: {},
    wellbeingYears: 0, yearsAtTarget: 0, budgetDecades: 0, firstBackfires: {},
    leanDecades: 0, decisions: 0, decisionsByDecade: [], automated: 0, automatedByDecade: [], opening: [], firstBudgetAt: null,
  };
}

export function freshSector(def: SectorDef, mods: Mods, open: boolean): SectorState {
  const apps: Record<string, AppState> = {};
  for (const a of def.applications) {
    const avail = open && a.visibleBelow === Infinity;
    const start = open && mods.startFounded.has(a.id);
    apps[a.id] = { available: avail || start, founded: (avail && a.foundCost <= 0) || start, satMul: 1, peakD: 0, peakAdoption: 0 };
  }
  const q = def.resourceKind === 'flow' ? flowCapacity(def, mods) : Math.max(0, def.reserve * (1 + (mods.reserveAdd[def.id] ?? 0)));
  return {
    open, openFor: 0, eta: open ? etaAt(def, mods, 0) : def.baseEta, etaAtBase: 0, reserve: open ? q : 0,
    reserveMax: open ? q : 0, pressure: 0, crisesFired: 0, apps, baseR: 0, baseD: 0, basePs: 0, smoothR: 0, trendR: 0,
    peakR: 0, steadyYears: 0, backfired: false, budget: null, serviceDelivered: 0, decadesWithin: [],
    decadesLean: [], windowLean: false, clearYears: 0, settled: null, settledBefore: false, dividends: [], peakPressure: 0,
  };
}

export function snapshotBase(es: SectorState, f: SectorFlow): SectorState {
  if (es.baseR > 0 || !(f.D > 0) || !(f.R > 0)) return es;
  return { ...es, baseR: f.R, baseD: f.D, basePs: f.ps, etaAtBase: f.eta, smoothR: f.R, peakR: Math.max(es.peakR, f.R) };
}

export function historySample(state: GameState, content: Content, flows: Flows): HistorySample {
  const sectors: HistorySample['sectors'] = {};
  const budget: Record<SectorId, number> = {};
  const sink: Record<SectorId, number> = {};
  let anyBudget = false, anySink = false;
  const skies = featureOn(content, state.meta, 'clearSkies');
  for (const s of idx(content).ids) {
    const f = flows.sectors[s];
    const es = state.sectors[s];
    if (!f || !es) continue;
    sectors[s] = [fin(f.etaFold, 1), es.baseR > 0 ? fin(f.R / es.baseR, 1) : 1];
    const b = budgetROf(es, content.sectors[s], content, state.time);
    if (b !== null && es.baseR > 0) { budget[s] = fin(b / es.baseR); anyBudget = true; }
    if (b !== null && es.baseR > 0 && !es.settled && skies) {
      const def = content.sectors[s];
      const sr = sinkROf(es, def, content, f.R, f.pressureIn, f.deletionOut, absorptionOf(def, modsOf(state, content)));
      if (sr !== null) { sink[s] = fin(sr / es.baseR); anySink = true; }
    }
  }
  const h: HistorySample = { time: state.time, sectors, wellbeing: flows.wellbeing };
  if (anyBudget) h.budget = budget;
  if (anySink) h.sink = sink;
  return h;
}

export function pushHistory(history: HistorySample[], s: HistorySample): HistorySample[] {
  let h = history.concat([s]);
  if (h.length > HISTORY_MAX) {
    const half = Math.floor(h.length / 2);
    const older = h.slice(0, half).filter((_, i) => i % 2 === 0);
    h = older.concat(h.slice(half));
  }
  return h;
}

export function createState(content: Content, meta?: MetaState, seed?: number): GameState {
  const ix = idx(content);
  const m0: MetaState = meta ? { ...freshMeta(content), ...meta } : freshMeta(content);
  const first = ix.ids[0];
  const m: MetaState = first && !m0.sectorsOpened[first] ? { ...m0, sectorsOpened: { ...m0.sectorsOpened, [first]: true } } : m0;
  const upgrades: Record<string, number> = {};
  const mods = computeMods(upgrades, m, content, NO_SOURCES, '');
  const sectors: Record<SectorId, SectorState> = {};
  for (const s of ix.ids) sectors[s] = freshSector(content.sectors[s], mods, s === first);
  const levers: Record<string, LeverState> = {};
  for (const l of content.levers ?? []) levers[l.id] = { level: Math.min(mods.startLevers[l.id] ?? 0, leverMaxLevel(l)), ref: 0 };
  const g = content.global;
  let s: GameState = {
    version: SAVE_VERSION, seed: (seed ?? 1) >>> 0, time: 0,
    capital: fin(g.startCapital * mods.startCapitalMul), mandate: 0, population: 1, peakPopulation: 1,
    upgrades, levers, sectors, flags: { revealed: mods.reveal, won: false }, steadyYearsAll: 0,
    news: [], history: [], run: freshRunStats(), meta: m,
    pendingDividends: [], commons: { levels: {}, fund: 0 }, events: [], lastOffline: null, charterOffer: [],
  };
  // initial availability check and baseline
  const flows = computeFlows(s, content);
  const next = { ...s.sectors };
  for (const id of ix.ids) {
    const f = flows.sectors[id];
    if (!f) continue;
    let es = next[id];
    const apps = { ...es.apps };
    for (const a of content.sectors[id].applications) {
      if (!apps[a.id].available && f.ps <= a.visibleBelow) apps[a.id] = { ...apps[a.id], available: true, founded: apps[a.id].founded || a.foundCost <= 0 };
    }
    es = { ...es, apps };
    next[id] = snapshotBase(es, f);
  }
  s = { ...s, sectors: next };
  s = { ...s, history: [historySample(s, content, computeFlows(s, content))] };
  return s;
}

/** M1: true while the run is untouched (Derived.freshRun). */
export const isFreshRun = (state: GameState): boolean =>
  state.time === 0 && !Object.values(state.upgrades).some((l) => (l ?? 0) > 0);

/**
 * The between-runs rebuild: Hindsight is spent only while the run is untouched, and start-of-run effects live in state,
 * so the run is rebuilt from the new meta, keeping its news, Mandate, clicks and any capital clicked in the meantime;
 * M2: and its events, Charter offer and offline report.
 */
export function withMeta(state: GameState, content: Content, meta: MetaState): GameState {
  const before = createState(content, state.meta, state.seed);
  const fresh = createState(content, meta, state.seed);
  return {
    ...fresh, capital: fresh.capital + Math.max(0, state.capital - before.capital), mandate: state.mandate,
    run: { ...fresh.run, clicks: state.run.clicks }, news: state.news,
    events: state.events, charterOffer: state.charterOffer, lastOffline: state.lastOffline,
  };
}
