/**
 * Settlement (M2): settle and unsettle. The frozen flow of a settled sector, its excess and defence are computed in
 * flows.ts (settledFlow, Flows.settled); the forced unsettle of the lapse rule runs in step.ts through unsettleIn.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { STEADY_STATE_YEARS } from '../types';
import type { Actor, Content, GameState, LeverState, NewsItem, SectorId, SectorState, SettledState } from '../types';
import { calendarYear } from './calendar';
import { DEFECT_PENALTY } from './constants';
import { idx } from './contentIndex';
import { modsOf, etaAt, fireOneOffs, applyM3OneOffs } from './effects';
import { sprawlOf, hoursPerHead } from './travel';
import { milestone } from './milestones';
import type { OneOffs } from './effects';
import { emit } from './events';
import { computeFlows, steadyView } from './flows';
import { headline, newsWith } from './headlines';
import { sectorLevers, NO_LEVERS } from './levers';
import { clamp, fin } from './util';
import { featureOn } from './features';
import { condCheck, evalCond } from './conditions';

/** M3 finish: how many Industries may be settled at once (GlobalParams.settleMax + settleSlotAdd; Infinity without). */
export function settleRoom(state: GameState, content: Content): number {
  const max = content.global.settleMax;
  if (typeof max !== 'number' || !Number.isFinite(max)) return Infinity;
  return Math.max(0, Math.floor(max + modsOf(state, content).settleSlots));
}
/** Settlements that use room (M4: capstoned sectors do not). */
export const roomCount = (state: GameState, content: Content): number =>
  idx(content).ids.reduce((n, s) => n + (state.sectors[s]?.open && state.sectors[s]?.settled && !state.sectors[s].capstoned ? 1 : 0), 0);
const settledCount = roomCount;

/** ModelApi.settle would succeed now (SectorDerived.canSettle). */
export function canSettle(state: GameState, content: Content, s: SectorId): boolean {
  const es = state.sectors[s];
  const def = content.sectors[s];
  if (!es?.open || es.settled || !def?.settle || !state.flags.revealed || !featureOn(content, state.meta, 'settlement')) return false;
  if (settledCount(state, content) >= settleRoom(state, content)) return false; // M3 finish: GlobalParams.settleMax
  const fl = computeFlows(state, content);
  if (fl.pending || !(es.clearYears >= STEADY_STATE_YEARS - 1e-9)) return false;
  if (!steadyView(state, content, fl, s).sinkHeld) return false;
  return !def.settle.requires || evalCond(state, content, def.settle.requires); // M4: settle.requires
}

/** M4: SectorDerived.settleBlocked: the failing settle.requires' label while at Steady State and unsettled, else null. */
export function settleBlockedOf(state: GameState, content: Content, s: SectorId, sinkHeld: boolean): string | null {
  const es = state.sectors[s];
  const req = content.sectors[s]?.settle?.requires;
  if (!req || !es?.open || es.settled || !sinkHeld || !(es.clearYears >= STEADY_STATE_YEARS - 1e-9)) return null;
  return evalCond(state, content, req) ? null : condCheck(state, content, req).label;
}

export function settle(state: GameState, content: Content, s: SectorId): GameState {
  if (!canSettle(state, content, s)) return state;
  const fl = computeFlows(state, content);
  const es = state.sectors[s];
  const def = content.sectors[s];
  const f = fl.sectors[s];
  const inp = fl.inputs[s];
  const lev = sectorLevers(state, content)[s] ?? NO_LEVERS;
  const appD: Record<string, number> = {}, appAdoption: Record<string, number> = {};
  def.applications.forEach((a, i) => {
    if (!es.apps[a.id]?.founded) return;
    appD[a.id] = f.appD[i];
    appAdoption[a.id] = f.appSat[i] > 0 ? clamp(f.appD[i] / f.appSat[i], 0, 1) : 0;
  });
  const year = calendarYear(state, content);
  const settled: SettledState = {
    since: state.time, sinceYear: Math.floor(year), D: f.D, R: f.R, ps: f.ps, pPre: f.pPre, income: f.income,
    P: es.pressure, eta: f.eta,
    defect: def.resourceKind === 'flow' ? fin(1 - DEFECT_PENALTY * f.unrev * (1 - lev.review), 1) : 1,
    N0: state.population, spillMul0: inp?.spillMul ?? 1, extraD0: inp?.extraD ?? 0, appD, appAdoption,
  };
  // M3: the frozen shapes the widgets redraw from while settled
  if (f.load) settled.load = { factor: f.load.factor, hours: f.load.hours.slice(), capCostEff: f.load.cEff };
  if (f.travel) settled.travel = { speed: f.travel.v, hoursPerHead: hoursPerHead(def, f.D, state.population, f.travel.v), roads: f.travel.K, sprawl: sprawlOf(def, es) };
  if (f.appSeen) {
    const seen: Record<string, number> = {};
    def.applications.forEach((a, i) => { if (es.apps[a.id]?.founded) seen[a.id] = f.appSeen![i]; });
    settled.appPriceSeen = seen;
  }
  // the sector's levers to 0 (recycle kept)
  let levers = state.levers;
  for (const ld of idx(content).leversBySector[s] ?? []) {
    const ls = levers[ld.id];
    if (ls && ls.level > 0) {
      if (levers === state.levers) levers = { ...levers };
      const out: LeverState = { ...ls, level: 0, ref: 0 };
      levers[ld.id] = out;
    }
  }
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  if (!es.settledBefore) fireOneOffs(def.settle!.dividend, 1, fl.income, one);
  const ns: SectorState = { ...es, settled, settledBefore: true };
  const items: NewsItem[] = [headline(state, content, 'settled', state.time, { year }, s)];
  let out: GameState = {
    ...state, levers, sectors: { ...state.sectors, [s]: ns }, capital: Math.max(0, fin(state.capital + one.capital)),
    mandate: Math.max(0, fin(state.mandate + one.mandate)), ...newsWith(state, content, items),
  };
  out = applyM3OneOffs(out, content, one);
  out = { ...out, meta: milestone(out.meta, `settled:${s}`, null, year) };
  return emit(out, [{ kind: 'settled', sector: s, by: 'player' }], state.time, year);
}

/**
 * The sector map after ending a settlement (no checks): η recomputed for today's openFor, both streaks and the window
 * reset; heldAt, reserve, pressure and apps as they were. Mods must be those AFTER the change (settle.dividend gone).
 */
export function unsettledSector(state: GameState, content: Content, s: SectorId): SectorState {
  const es = state.sectors[s];
  const def = content.sectors[s];
  const draft: GameState = { ...state, sectors: { ...state.sectors, [s]: { ...es, settled: null } } };
  const mods = modsOf(draft, content);
  return { ...es, settled: null, eta: etaAt(def, mods, es.openFor), steadyYears: 0, clearYears: 0, windowLean: false };
}

/** End a settlement by `by` with its headline and event (used by unsettle and by the lapse rule in the step). */
export function unsettleAs(state: GameState, content: Content, s: SectorId, by: Actor, time: number): GameState {
  const es = state.sectors[s];
  if (!es?.settled) return state;
  const year = calendarYear(state, content);
  const out: GameState = {
    ...state, sectors: { ...state.sectors, [s]: unsettledSector(state, content, s) },
    ...newsWith(state, content, [headline(state, content, 'unsettled', time, { year }, s)]),
  };
  return emit(out, [{ kind: 'unsettled', sector: s, by }], time, year);
}

export function unsettle(state: GameState, content: Content, s: SectorId): GameState {
  if (!state.sectors[s]?.settled || state.sectors[s].capstoned || computeFlows(state, content).pending) return state; // M4: never a capstone
  return unsettleAs(state, content, s, 'player', state.time);
}
