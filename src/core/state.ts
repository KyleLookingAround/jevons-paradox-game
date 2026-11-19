/**
 * State construction: a fresh meta, run stats and sector, the baseline snapshot, history samples, and createState.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { SAVE_VERSION } from '../types';
import type { AppState, Content, GameState, HistorySample, LeverState, MetaState, RunStats, SectorDef, SectorId, SectorState } from '../types';
import { HISTORY_MAX } from './constants';
import { idx } from './contentIndex';
import { computeMods, etaAt, flowCapacity } from './effects';
import type { Mods } from './effects';
import { computeFlows } from './flows';
import type { Flows } from './flows';
import { leverMaxLevel } from './levers';
import type { SectorFlow } from './solver';
import { budgetROf } from './steady';
import { fin } from './util';

/* ------------------------------------------------------------------ */
/* State construction                                                  */
/* ------------------------------------------------------------------ */

export function freshMeta(content: Content): MetaState {
  return {
    hindsight: 0, hindsightEarned: 0, reckonings: 0, knowhow: {}, institutions: {}, achievements: {},
    steadySectors: {}, sectorsOpened: {}, totalSeconds: 0,
    slots: content.global?.startingSlots ?? 2, loadout: [], backfiredSectors: {},
  };
}

export function freshRunStats(): RunStats {
  return {
    peakWellbeing: 0, decoupledYears: 0, resourceUsed: {}, clicks: 0, steadySectors: {},
    wellbeingYears: 0, yearsAtTarget: 0, budgetDecades: 0, firstBackfires: {},
  };
}

export function freshSector(def: SectorDef, mods: Mods, open: boolean): SectorState {
  const apps: Record<string, AppState> = {};
  for (const a of def.applications) {
    const avail = open && a.visibleBelow === Infinity;
    apps[a.id] = { available: avail, founded: avail && a.foundCost <= 0, satMul: 1, peakD: 0 };
  }
  const q = def.resourceKind === 'flow' ? flowCapacity(def, mods) : Math.max(0, def.reserve * (1 + (mods.reserveAdd[def.id] ?? 0)));
  return {
    open, openFor: 0, eta: open ? etaAt(def, mods, 0) : def.baseEta, etaAtBase: 0, reserve: open ? q : 0,
    reserveMax: open ? q : 0, pressure: 0, crisesFired: 0, apps, baseR: 0, baseD: 0, basePs: 0, smoothR: 0, trendR: 0,
    peakR: 0, steadyYears: 0, backfired: false, budget: null, serviceDelivered: 0, decadesWithin: [],
  };
}

export function snapshotBase(es: SectorState, f: SectorFlow): SectorState {
  if (es.baseR > 0 || !(f.D > 0) || !(f.R > 0)) return es;
  return { ...es, baseR: f.R, baseD: f.D, basePs: f.ps, etaAtBase: f.eta, smoothR: f.R, peakR: Math.max(es.peakR, f.R) };
}

export function historySample(state: GameState, content: Content, flows: Flows): HistorySample {
  const sectors: HistorySample['sectors'] = {};
  const budget: Record<SectorId, number> = {};
  let anyBudget = false;
  for (const s of idx(content).ids) {
    const f = flows.sectors[s];
    const es = state.sectors[s];
    if (!f || !es) continue;
    sectors[s] = [fin(f.etaFold, 1), es.baseR > 0 ? fin(f.R / es.baseR, 1) : 1];
    const b = budgetROf(es, content.sectors[s], content, state.time);
    if (b !== null && es.baseR > 0) { budget[s] = fin(b / es.baseR); anyBudget = true; }
  }
  const h: HistorySample = { time: state.time, sectors, wellbeing: flows.wellbeing };
  if (anyBudget) h.budget = budget;
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
  const mods = computeMods(upgrades, m, content, {}, '');
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
      if (!apps[a.id].available && f.ps <= a.visibleBelow) apps[a.id] = { ...apps[a.id], available: true, founded: a.foundCost <= 0 };
    }
    es = { ...es, apps };
    next[id] = snapshotBase(es, f);
  }
  s = { ...s, sectors: next };
  s = { ...s, history: [historySample(s, content, computeFlows(s, content))] };
  return s;
}
