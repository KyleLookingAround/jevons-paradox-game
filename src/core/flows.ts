/**
 * Whole-state flows (every open sector solved in solve order, with spill and drawsOn), cached per state object; the
 * pending Reckoning; the shadow and the instruments read from it (direct rebound, frontier fold).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { EXHAUSTED_BELOW } from '../types';
import type { Content, GameState, ReckoningCause, SectorDef, SectorId, SectorState, SettledState } from '../types';
import { POP_MIN, REBOUND_MIN_FOLD, FLOW_MIN_CAPACITY_SHARE, DEFAULT_FREE_EXCESS } from './constants';
import { addCommonsIntensity, commonsWellbeing } from './commons';
import { idx } from './contentIndex';
import { modsOf, flowCapacity, absorptionOf, leverMulOf } from './effects';
import type { Mods } from './effects';
import { sectorLevers, NO_LEVERS, leverNetUpkeep, mandateShareOf } from './levers';
import { solveSector } from './solver';
import type { SectorFlow } from './solver';
import { budgetROf, isWithin, decadeWellbeingOf, clearPOf, isClear, sinkROf, sectorSteady, holdEach } from './steady';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* Whole-state flows (cached per state object)                         */
/* ------------------------------------------------------------------ */

export interface Flows {
  sectors: Record<SectorId, SectorFlow>;
  /** Inputs each sector was solved with (re-used by the shadow solve). */
  inputs: Record<SectorId, { extraD: number; spillMul: number; capR: number }>;
  wellbeing: number;
  income: number;
  levyRevenue: number;
  treasuryLevy: number;
  mandateGain: number;
  upkeep: number;
  pending: { cause: ReckoningCause; sector?: SectorId } | null;
  /* M2 */
  /** Levy revenue routed to 'commons' (before fundShare). */
  commonsLevy: number;
  /** Wellbeing the Commons add (inside `wellbeing`). */
  commonsWellbeing: number;
  /** Lever upkeep alone (upkeep = leverUpkeep + Σ defences). */
  leverUpkeep: number;
  /** Settled sectors: excess and defence (Mandate per second). */
  settled: Record<SectorId, { excess: number; defence: number }>;
}

function pendingOf(state: GameState, content: Content): { cause: ReckoningCause; sector?: SectorId } | null {
  const ids = idx(content).ids;
  for (const s of ids) {
    const es = state.sectors[s];
    if (es?.open && !es.settled && content.sectors[s].resourceKind === 'stock' && es.reserve <= EXHAUSTED_BELOW * es.reserveMax) return { cause: 'exhausted', sector: s };
  }
  for (const s of ids) {
    const es = state.sectors[s];
    const def = content.sectors[s];
    if (es?.open && !es.settled && def.collapseAt > 0 && es.pressure >= def.collapseAt) return { cause: 'collapse', sector: s };
  }
  return null;
}

const flowsCache = new WeakMap<GameState, { content: Content; flows: Flows }>();
export function computeFlows(state: GameState, content: Content): Flows {
  const hit = flowsCache.get(state);
  if (hit && hit.content === content) return hit.flows;
  const flows = solveFlows(state, content, null, null);
  flowsCache.set(state, { content, flows });
  return flows;
}

/**
 * Projections only (see projections.ts): cache for `state` flows in which every open sector outside `focus` takes its
 * SectorFlow from `reuse` (the same step of the without-upgrade clone) instead of being solved. Sectors in `focus` are
 * solved, with spill and drawsOn inputs accumulated from all sources as usual. Exact for the focus sectors' inputs
 * whenever the non-focus sectors would have solved to the reused flows (they differ only through population).
 */
export function primeFocusedFlows(state: GameState, content: Content, reuse: Flows, focus: ReadonlySet<SectorId>): void {
  flowsCache.set(state, { content, flows: solveFlows(state, content, reuse, focus) });
}

function solveFlows(state: GameState, content: Content, reuse: Flows | null, focus: ReadonlySet<SectorId> | null): Flows {
  const ix = idx(content);
  const mods = modsOf(state, content);
  const levs = sectorLevers(state, content);
  const N = Math.max(POP_MIN, fin(state.population, 1));
  const spill: Record<string, number> = {};
  const extra: Record<string, number> = {};
  const sectors: Record<SectorId, SectorFlow> = {};
  const inputs: Flows['inputs'] = {};
  const settled: Flows['settled'] = {};
  let wellbeing = 0, income = 0, levy = 0, treasury = 0, commonsLevy = 0, defence = 0;
  addCommonsIntensity(state, content, N, extra);
  // M3 finish: the hold cost of settlements together (GlobalParams.settleHold), each settled Industry's share
  let nSettled = 0;
  for (const s of ix.ids) if (state.sectors[s]?.open && state.sectors[s]?.settled) nSettled++;
  const hold = nSettled ? holdEach(content, nSettled) : 0;
  for (const s of ix.solveOrder) {
    const es = state.sectors[s];
    if (!es || !es.open) continue;
    const def = content.sectors[s];
    if (es.settled) {
      const st = es.settled;
      const inp = { extraD: extra[s] ?? 0, spillMul: spill[s] ?? 1, capR: Infinity };
      const f = settledFlow(def, es, st, N, mods);
      sectors[s] = f;
      inputs[s] = inp;
      const excess = Math.max(0, (N * inp.spillMul) / (Math.max(POP_MIN, st.N0) * (st.spillMul0 > 0 ? st.spillMul0 : 1)) - 1)
        + Math.max(0, inp.extraD - st.extraD0) / Math.max(st.D, 1e-12);
      const dfn = (def.settle ? Math.max(0, fin(def.settle.upkeepPerSpill) * Math.max(0, excess - (def.settle.freeExcess ?? DEFAULT_FREE_EXCESS))) : 0) + hold;
      settled[s] = { excess: fin(excess), defence: fin(dfn) };
      defence += settled[s].defence;
      wellbeing += f.wellbeingShare;
      income += f.income;
      if (def.spill && state.sectors[def.spill.to]?.open && es.basePs > 0) {
        const a = def.spill.rate * (mods.spillMul[s] ?? 1) * Math.max(0, 1 - f.ps / es.basePs);
        spill[def.spill.to] = (spill[def.spill.to] ?? 1) * (1 + Math.max(0, a));
      }
      if (def.drawsOn && state.sectors[def.drawsOn.sector]?.open) {
        extra[def.drawsOn.sector] = (extra[def.drawsOn.sector] ?? 0) + Math.max(0, def.drawsOn.perService * f.D);
      }
      continue;
    }
    const lev = levs[s] ?? NO_LEVERS;
    let capR = Infinity;
    if (Number.isFinite(lev.capFrac)) {
      const b = budgetROf(es, def, content, state.time);
      if (b !== null) capR = lev.capFrac * b;
    }
    const inp = { extraD: extra[s] ?? 0, spillMul: spill[s] ?? 1, capR };
    const f = reuse !== null && !focus!.has(s) && reuse.sectors[s] !== undefined ? reuse.sectors[s]
      : solveSector(def, es, N, mods, lev, inp.extraD, inp.spillMul, capR);
    sectors[s] = f;
    inputs[s] = inp;
    wellbeing += f.wellbeingShare;
    income += f.income;
    levy += f.dutyRevenue + f.permitRevenue;
    treasury += f.treasuryLevy;
    if (lev.dutyRecycle === 'commons') commonsLevy += f.dutyRevenue;
    if (lev.capRecycle === 'commons') commonsLevy += f.permitRevenue;
    if (def.spill && state.sectors[def.spill.to]?.open && es.basePs > 0) {
      const a = def.spill.rate * (mods.spillMul[s] ?? 1) * (1 - lev.green) * Math.max(0, 1 - f.ps / es.basePs);
      spill[def.spill.to] = (spill[def.spill.to] ?? 1) * (1 + Math.max(0, a));
    }
    if (def.drawsOn && state.sectors[def.drawsOn.sector]?.open) {
      extra[def.drawsOn.sector] = (extra[def.drawsOn.sector] ?? 0) + Math.max(0, def.drawsOn.perService * f.D);
    }
  }
  const cw = commonsWellbeing(state, content, mods.commonsYieldMul);
  wellbeing = Math.max(0, fin(wellbeing + mods.wellbeingAdd + cw));
  const g = content.global;
  const mandateGain = g.mandateRate * Math.max(0, wellbeing - g.mandateFloor) * mods.mandateRateMul + mandateShareOf(content) * treasury;
  let upkeep = 0;
  for (const def of content.levers ?? []) {
    const ls = state.levers[def.id];
    if (ls && ls.level > 0) upkeep += leverNetUpkeep(def, ls.level, mods.startLevers[def.id] ?? 0, leverMulOf(mods, def).upkeep);
  }
  const flows: Flows = {
    sectors, inputs, wellbeing, income: fin(income), levyRevenue: fin(levy), treasuryLevy: fin(treasury),
    mandateGain: fin(mandateGain), upkeep: fin(upkeep + defence), pending: pendingOf(state, content),
    commonsLevy: fin(commonsLevy), commonsWellbeing: fin(cw), leverUpkeep: fin(upkeep), settled,
  };
  return flows;
}

/** A settled sector's flow: the frozen SettledState values (see the contract's SettledState); wellbeing with today's N. */
export function settledFlow(def: SectorDef, es: SectorState, st: SettledState, N: number, mods: Mods): SectorFlow {
  const c = Math.max(0, def.capCost * (mods.capMul[def.id] ?? 1));
  const m = Math.max(0, def.margin + (mods.marginAdd[def.id] ?? 0));
  const n = def.applications.length;
  const appD = new Array<number>(n), appSat = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const id = def.applications[i].id;
    const d = fin(st.appD[id] ?? 0), a = fin(st.appAdoption[id] ?? 0);
    appD[i] = d;
    appSat[i] = a > 0 ? d / a : 0;
  }
  let capacity = 0, usable = 0, util = 0;
  if (def.resourceKind === 'flow') {
    capacity = flowCapacity(def, mods);
    usable = Math.max(1e-12, Math.max(FLOW_MIN_CAPACITY_SHARE * capacity, capacity - fin(st.P) * def.pressureUpkeep));
    util = clamp(st.R / usable, 0, 1);
  }
  const nPos = Math.max(POP_MIN, N);
  const wb = def.wellbeingWeight * fin(st.defect, 1) * Math.log(1 + st.D / (nPos * (def.wellbeingScale > 0 ? def.wellbeingScale : 1)))
    - def.pressureWellbeingCost * (def.collapseAt > 0 ? clamp(fin(st.P) / def.collapseAt, 0, 1) : 0);
  const etaBase = es.etaAtBase > 0 ? es.etaAtBase : def.baseEta || 1;
  const prBase = Math.max(0, (st.pPre - c) * st.eta);
  return {
    eta: st.eta, etaFold: fin(st.eta / etaBase, 1), c, m, prBase: fin(prBase), permit: 0, pr: fin(prBase),
    pPre: st.pPre, permitPart: 0, dutyPart: 0, ps: st.ps, D: st.D, R: st.R, sigma: 0,
    income: st.income, dutyRevenue: 0, permitRevenue: 0, treasuryLevy: 0,
    capacity, usable, util, unrev: 0, appD, appSat, reserveGain: 0, pressureIn: 0, deletionOut: 0, wellbeingShare: fin(wb),
    load: null, travel: null, appSeen: null, seamMul: 1, ren: null,
  };
}

/** The shadow (η frozen at etaAtBase, everything else identical), lazily per sector, cached per flows object. */
const shadowCache = new WeakMap<Flows, Record<SectorId, number>>();
function shadowR(state: GameState, content: Content, fl: Flows, s: SectorId): number {
  let rec = shadowCache.get(fl);
  if (!rec) { rec = {}; shadowCache.set(fl, rec); }
  const hit = rec[s];
  if (hit !== undefined) return hit;
  const es = state.sectors[s];
  const f = fl.sectors[s];
  const inp = fl.inputs[s];
  let r = 0;
  if (es && f && inp && es.baseR > 0) {
    const etaBase = es.etaAtBase > 0 ? es.etaAtBase : f.eta / (f.etaFold || 1);
    if (Math.abs(etaBase - f.eta) <= 1e-12 * f.eta) r = f.R; // identical solve
    else {
      const def = content.sectors[s];
      const lev = sectorLevers(state, content)[s] ?? NO_LEVERS;
      r = solveSector(def, es, Math.max(POP_MIN, fin(state.population, 1)), modsOf(state, content), lev, inp.extraD, inp.spillMul, inp.capR, etaBase).R;
    }
  }
  rec[s] = fin(r);
  return rec[s];
}

interface Instruments { shadowR: number; promisedR: number; rebound: number | null; frontierFold: number }
export function instruments(state: GameState, content: Content, fl: Flows, s: SectorId): Instruments {
  const es = state.sectors[s];
  const f = fl.sectors[s];
  if (!es || !f || !(es.baseR > 0)) return { shadowR: 0, promisedR: 0, rebound: null, frontierFold: 1 };
  if (es.settled) return { shadowR: f.R, promisedR: f.R, rebound: null, frontierFold: fin(f.R / es.baseR, 1) };
  const sh = shadowR(state, content, fl, s);
  const promised = f.etaFold > 0 ? sh / f.etaFold : 0;
  const rebound = f.etaFold > REBOUND_MIN_FOLD && sh > 0 && sh - promised > 1e-9 * sh
    ? fin((f.R - promised) / (sh - promised)) : null;
  return { shadowR: sh, promisedR: fin(promised), rebound, frontierFold: fin(sh / es.baseR, 1) };
}

export function reserveFractionOf(def: SectorDef, es: SectorState, f: SectorFlow): number {
  return def.resourceKind === 'stock'
    ? (es.reserveMax > 0 ? clamp(es.reserve / es.reserveMax, 0, 1) : 0)
    : clamp(1 - f.util, 0, 1);
}

/** M2: the budget, decade and Steady conditions of one open sector (the definitions derive, the step and settle share). */
export interface SteadyView {
  budgetR: number | null; withinBudget: boolean; decadeW: number; decoupling: boolean;
  clearP: number | null; clear: boolean; sinkR: number | null; sinkHeld: boolean;
}
let noLine: SteadyView | null = null;
export function steadyView(state: GameState, content: Content, fl: Flows, s: SectorId, mods0?: Mods, withSink = true): SteadyView {
  const es = state.sectors[s];
  const f = fl.sectors[s];
  const def = content.sectors[s];
  const target = content.global.wellbeingTarget;
  const W = fl.wellbeing;
  if (!es?.budget && !es?.settled) { // no line: nothing counts (one shared, frozen answer per target)
    if (noLine === null || noLine.decadeW !== target) {
      noLine = Object.freeze({ budgetR: null, withinBudget: false, decadeW: target, decoupling: false, clearP: null, clear: false, sinkR: null, sinkHeld: false });
    }
    return noLine;
  }
  const st = sectorSteady(content, s);
  const budgetR = budgetROf(es!, def, content, state.time, st);
  const withinBudget = !!f && isWithin(f.R, budgetR);
  const decadeW = decadeWellbeingOf(es, content, s, st);
  const clearP = clearPOf(es, def, content, st);
  if (es.settled) {
    return { budgetR, withinBudget, decadeW, decoupling: W >= target && !fl.pending, clearP, clear: true, sinkR: null, sinkHeld: false };
  }
  if (!f) return { budgetR, withinBudget: false, decadeW, decoupling: false, clearP, clear: false, sinkR: null, sinkHeld: false };
  const ab = absorptionOf(def, mods0 ?? modsOf(state, content));
  const clear = isClear(es, def, content, f.pressureIn, f.deletionOut, ab, clearP);
  return {
    budgetR, withinBudget, decadeW, decoupling: withinBudget && W >= decadeW && !fl.pending, clearP, clear,
    sinkR: withSink ? sinkROf(es, def, content, f.R, f.pressureIn, f.deletionOut, ab, clearP) : null,
    sinkHeld: withinBudget && W >= target && clear && !fl.pending,
  };
}
