/**
 * Whole-state flows (every open sector solved in solve order, with spill and drawsOn), cached per state object; the
 * pending Reckoning; the shadow and the instruments read from it (direct rebound, frontier fold).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { EXHAUSTED_BELOW, CAPSTONE_INCOME_SHARE } from '../types';
import type { Content, GameState, ReckoningCause, RenewableDef, SectorDef, SectorId, SectorState, SettledState } from '../types';
import { POP_MIN, REBOUND_MIN_FOLD, FLOW_MIN_CAPACITY_SHARE, DEFAULT_FREE_EXCESS, CAP_SQUEEZE_MAX } from './constants';
import { feedMulOf, feedSatOf, handedByFeeds } from './feeds';
import { lineR } from './account';
import { renewableOf, renewablePrice, scarMulOf, depletionSinkR, foreignShareOf, foreignCatch, foreignRoomOf, growthOf, reportedOf, sizeOf } from './renewable';
import { addCommonsIntensity, commonsWellbeing } from './commons';
import { idx } from './contentIndex';
import { modsOf, flowCapacity, absorptionOf, leverMulOf } from './effects';
import type { Mods } from './effects';
import { sectorLevers, NO_LEVERS, leverNetUpkeep, mandateShareOf } from './levers';
import type { SectorLevers } from './levers';
import { solveSector } from './solver';
import type { SectorFlow, SolveM5 } from './solver';
import { returnShareOf } from './hiddenFlow';
import { concealOf } from './chair/acting';
import { budgetROf, isWithin, decadeWellbeingOf, clearPOf, isClear, sinkROf, sectorSteady, holdEach } from './steady';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* Whole-state flows (cached per state object)                         */
/* ------------------------------------------------------------------ */

export interface FlowInput {
  extraD: number; spillMul: number; capR: number;
  /* M4 (defaults: 1, NaN, 1, CAP_SQUEEZE_MAX, null): the feeds' factor on c, the resource price the sector does not own
   * (a drawer's owner's, a renewable's reported), its seam multiplier, the cap's squeeze limit, and the levers' aggregate
   * the solve used when a quota bound (its leak and recycle in the cap's place); null = sectorLevers' own. */
  feedMul: number; pr: number; seam: number; squeeze: number; lev: SectorLevers | null;
  /** M4 (finish): the demand feeds into this sector (feedSatOf), or null. */
  feedSat?: Record<string, number> | null;
  /** M5: charges, hidden flow, an applied-basis cap and the levy scale the solve used (absent: none). */
  m5?: SolveM5 | null;
}
export interface Flows {
  sectors: Record<SectorId, SectorFlow>;
  /** Inputs each sector was solved with (re-used by the shadow solve). */
  inputs: Record<SectorId, FlowInput>;
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
  /** Settled sectors: excess and defence (Mandate per second). M4: `due`, a capstoned sector's defence while in arrears
   *  (charged: 0; due: what clearing the arrears needs per second). */
  settled: Record<SectorId, { excess: number; defence: number; due?: number }>;
}

function pendingOf(state: GameState, content: Content): { cause: ReckoningCause; sector?: SectorId } | null {
  const ix = idx(content);
  const ids = ix.ids;
  for (const s of ids) {
    const es = state.sectors[s];
    if (!es?.open || content.sectors[s].resourceKind !== 'stock' || ix.ownerOf.has(s)) continue;
    // M4: an owner's reserve can be run down by its unsettled drawers while it is settled itself
    const live = !es.settled || (ix.drawers.get(s) ?? []).some((d) => state.sectors[d]?.open && !state.sectors[d].settled);
    if (live && es.reserve <= EXHAUSTED_BELOW * es.reserveMax) return { cause: 'exhausted', sector: s };
  }
  for (const s of ids) {
    const es = state.sectors[s];
    const def = content.sectors[s];
    if (es?.open && !es.settled && def.collapseAt > 0 && es.pressure >= def.collapseAt) return { cause: 'collapse', sector: s };
  }
  // M5: two elections lost in a row end the Ministry (ChairDef.opposition.lostInARowEnds)
  const ch = state.chair, cd = content.chair;
  if (ch && cd && ch.lostInARow >= Math.max(1, Math.floor(fin(cd.opposition.lostInARowEnds, 2)))) return { cause: 'defeated' };
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

/** M4: the flows of `state` solved with the feeds of `src` removed (the order book's rAdded; not cached here). */
export function flowsWithoutFeeds(state: GameState, content: Content, src: SectorId): Flows {
  return solveFlows(state, content, null, null, src);
}

/** M4: the stock price of a reserve owner (before any drawer's own resourcePriceMul) and its seam multiplier. */
export function ownerPrice(def: SectorDef, es: SectorState, mods: Mods): { pr: number; seam: number } {
  let pr = def.basePrice;
  if (es.reserveMax > 0) pr = def.basePrice * Math.pow(es.reserveMax / Math.max(es.reserve, 1e-9 * es.reserveMax), def.alpha);
  const n = es.seamsSunk ?? 0;
  const sd = n > 0 && def.seams && def.seams.length ? def.seams[Math.min(n, def.seams.length) - 1] : undefined;
  const seam = sd ? Math.max(0, fin(sd.priceMul, 1)) : 1;
  const m = seam * (mods.resourcePriceMul[def.id] ?? 1);
  return { pr: m !== 1 ? pr * m : pr, seam };
}

/** M4: a capstoned sector's settled values scaled per head (CapstoneRecord), in arrears × (1 + undefended excess). */
export function capstoneScaled(content: Content, state: GameState, s: SectorId, st: SettledState, N: number, ex: number): SettledState {
  const k = Math.min(1, N / Math.max(POP_MIN, st.N0));
  const m = k * (1 + ex);
  const rec = state.meta.world?.capstone?.[s];
  const act = rec ? idx(content).acts.find((a) => a.id === rec.act) : undefined;
  const share = clamp(fin(act?.capstone?.incomeShare ?? CAPSTONE_INCOME_SHARE, CAPSTONE_INCOME_SHARE), 0, 1);
  const appD: Record<string, number> = {};
  for (const id in st.appD) appD[id] = st.appD[id] * m;
  return { ...st, D: st.D * m, R: st.R * m, income: st.income * m * share, appD, P: state.sectors[s]?.pressure ?? st.P };
}

function solveFlows(state: GameState, content: Content, reuse: Flows | null, focus: ReadonlySet<SectorId> | null, skipFeeds?: SectorId): Flows {
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
  // (M4: capstoned sectors are not among the n and pay none)
  let nSettled = 0;
  for (const s of ix.ids) if (state.sectors[s]?.open && state.sectors[s]?.settled && !state.sectors[s].capstoned) nSettled++;
  const hold = nSettled ? holdEach(content, nSettled) : 0;
  const m4 = ix.anyM4;
  for (const s of ix.solveOrder) {
    const es = state.sectors[s];
    if (!es || !es.open) continue;
    const def = content.sectors[s];
    if (es.settled) {
      const st = es.settled;
      const inp: FlowInput = { extraD: extra[s] ?? 0, spillMul: spill[s] ?? 1, capR: Infinity, feedMul: 1, pr: NaN, seam: 1, squeeze: CAP_SQUEEZE_MAX, lev: null };
      const excess = Math.max(0, (N * inp.spillMul) / (Math.max(POP_MIN, st.N0) * (st.spillMul0 > 0 ? st.spillMul0 : 1)) - 1)
        + Math.max(0, inp.extraD - st.extraD0) / Math.max(st.D, 1e-12);
      const free = def.settle?.freeExcess ?? DEFAULT_FREE_EXCESS;
      const up = def.settle ? Math.max(0, fin(def.settle.upkeepPerSpill) * Math.max(0, excess - free)) : 0;
      let f: SectorFlow;
      if (es.capstoned) {
        // M4: the capstone serves per head; in arrears it serves the excess undefended and pays no defence
        const arrears = !!es.arrears;
        f = settledFlow(def, es, capstoneScaled(content, state, s, st, N, arrears ? Math.max(0, excess - free) : 0), N, mods);
        settled[s] = arrears ? { excess: fin(excess), defence: 0, due: fin(up) } : { excess: fin(excess), defence: fin(up) };
      } else {
        f = settledFlow(def, es, st, N, mods);
        settled[s] = { excess: fin(excess), defence: fin(up + hold) };
      }
      sectors[s] = f;
      inputs[s] = inp;
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
    let lev = levs[s] ?? NO_LEVERS;
    let capR = Infinity;
    if (Number.isFinite(lev.capFrac)) {
      const b = budgetROf(es, def, content, state.time);
      if (b !== null) {
        capR = lev.capFrac * b;
        // M4 (the Survey): a cap on a 'full' line prices own R: own R ≤ capR − received (the feeds handed in so far)
        if (m4 && es.budget?.account === 'full' && ix.feedsInto[s]) capR = Math.max(0, capR - receivedSoFar(ix, sectors, state, s));
      }
    }
    // M4: feeds into c, the price of a stock the sector does not own
    const feedMul = m4 && ix.feedsInto[s] ? feedMulOf(ix, sectors, state, s, skipFeeds) : 1;
    const feedSat = m4 && ix.feedsInto[s] ? feedSatOf(ix, sectors, state, s, skipFeeds) : null;
    let pr = NaN, seam = 1;
    const rn = m4 ? renewableOf(def) : undefined;
    if (m4) {
      const o = ix.ownerOf.get(s);
      if (o !== undefined && state.sectors[o]) { const op = ownerPrice(content.sectors[o], state.sectors[o], mods); pr = op.pr; seam = op.seam; }
      else if (rn) pr = renewablePrice(def, rn, es.reserve);
    }
    let squeeze = CAP_SQUEEZE_MAX;
    let levUsed: SectorLevers | null = null;
    // M5: charges, hidden flow, a cap on water applied, the levy's concealment scale (null: none, the M4 solve). A cap's
    // concealment and escape scaling is already in capFrac / capFracA (Core A, sectorLevers).
    let m5: SolveM5 | null = null;
    if (def.hiddenFlow || lev.charge > 0 || lev.chargeA > 0 || lev.chargeC > 0 || lev.capFracA < Infinity || state.chair) {
      const ret = returnShareOf(def, mods);
      let capA = Infinity;
      if (lev.capFracA < Infinity) {
        const b = budgetROf(es, def, content, state.time);
        const r0 = es.budget?.r0 ?? 0;
        if (b !== null && r0 > 0) capA = lev.capFracA * lev.capRefA * b / r0;
      }
      // the applied line binds: its leak and recycle in the cap's place
      if (capA < (ret > 0 ? capR / (1 - ret) : capR)) lev = levUsed = { ...lev, leakAbove: lev.leakAboveA, capRecycle: lev.capRecycleA };
      m5 = { charge: lev.charge, chargeA: lev.chargeA, chargeC: lev.chargeC, chargeRecycle: lev.chargeRecycle, ret, capA,
        levyMul: 1 - concealOf(state, s) };
    }
    const reused = reuse !== null && !focus!.has(s) && reuse.sectors[s] !== undefined;
    let f = reused ? reuse!.sectors[s]
      : solveSector(def, es, N, mods, lev, extra[s] ?? 0, spill[s] ?? 1, capR, undefined, feedMul, pr, seam, squeeze, feedSat, m5);
    if (rn && !reused) {
      const sMul = scarMulOf(rn, state.meta, s);
      const fm = mods.foreignMul[s] ?? 1;
      // M4: the quota: a cap on the true sink line (the last surveyed figure while unsurveyed), the tighter of the two
      if (Number.isFinite(lev.quotaFrac)) {
        const sink = mods.survey.has(s)
          ? depletionSinkR(def, rn, clearPOf(es, def, content), lev.circ, foreignShareOf(rn, es, f.ps, fm), sMul, foreignRoomOf(rn, fm))
          : es.lastSurvey?.sinkR ?? null;
        if (sink !== null && Number.isFinite(sink)) {
          const capQ = lev.quotaFrac * Math.max(0, sink);
          if (capQ < capR) {
            capR = capQ;
            lev = levUsed = { ...lev, leakAbove: lev.quotaLeak, capRecycle: lev.quotaRecycle };
            if (lev.quotaFrac <= 0) squeeze = MORATORIUM_SQUEEZE;
            f = solveSector(def, es, N, mods, lev, extra[s] ?? 0, spill[s] ?? 1, capR, undefined, feedMul, pr, seam, squeeze, feedSat, m5);
          }
        }
      }
      f = withRenewable(def, rn, es, f, lev.circ, sMul, fm);
    }
    sectors[s] = f;
    inputs[s] = { extraD: extra[s] ?? 0, spillMul: spill[s] ?? 1, capR, feedMul, pr, seam, squeeze, lev: levUsed, ...(feedSat ? { feedSat } : {}), ...(m5 ? { m5 } : {}) };
    wellbeing += f.wellbeingShare;
    income += f.income;
    levy += f.dutyRevenue + f.permitRevenue + (f.chargeRevenue ?? 0);
    treasury += f.treasuryLevy;
    if (lev.dutyRecycle === 'commons') commonsLevy += f.dutyRevenue;
    if (lev.capRecycle === 'commons') commonsLevy += f.permitRevenue;
    if (m5 && lev.chargeRecycle === 'commons') commonsLevy += f.chargeRevenue ?? 0;
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

/** M4: the true sink line of a depletion sector now (its foreign share and scar as they stand). */
export function depletionSink(state: GameState, content: Content, s: SectorId, f: SectorFlow, clearP: number | null): number | null {
  const def = content.sectors[s];
  const rn = renewableOf(def);
  if (!rn || !f.ren) return null;
  const lev = sectorLevers(state, content)[s] ?? NO_LEVERS;
  return depletionSinkR(def, rn, clearP, lev.circ, f.ren.share0 ?? f.ren.share, scarMulOf(rn, state.meta, s), f.ren.rho ?? 0);
}

/** M4: a quota at value 0 (a moratorium) holds demand at the price-proof floors: the cap's squeeze limit, nearly all. */
export const MORATORIUM_SQUEEZE = 0.999;

/** M4: R handed into t by the feed sources solved so far (the full account's feed part; a 'full' line's cap). */
function receivedSoFar(ix: ReturnType<typeof idx>, fls: Record<SectorId, SectorFlow>, state: GameState, t: SectorId): number {
  let r = 0;
  const seen: SectorId[] = [];
  for (const e of ix.feedsInto[t] ?? []) {
    if (seen.includes(e.src) || !fls[e.src]) continue;
    seen.push(e.src);
    r += handedByFeeds(ix, fls, state, e.src)[t] ?? 0;
  }
  return r;
}

/** M4: a renewable sector's flow with its regrowth, foreign share and catch, and (depletion) the net depletion rate. */
export function withRenewable(def: SectorDef, rn: RenewableDef, es: SectorState, f: SectorFlow, circ: number, sMul: number, foreignMul: number): SectorFlow {
  const K = sizeOf(def);
  const Q = es.reserve;
  const share0 = foreignShareOf(rn, es, f.ps, foreignMul);
  const G = growthOf(rn, K, Q, sMul);
  // M4 (finish): the foreign fleets also fill the room the home fleet leaves (ForeignDef.room)
  const rho = foreignRoomOf(rn, foreignMul);
  const rForeign = foreignCatch(f.R, share0) + (rho > 0 ? rho * Math.max(0, G - f.R) : 0);
  const share = rho > 0 ? (rForeign + f.R > 0 ? fin(rForeign / (rForeign + f.R)) : 0) : share0;
  const ren = rho > 0 ? { G, share, rForeign, reported: reportedOf(rn, K, Q), share0, rho } : { G, share, rForeign, reported: reportedOf(rn, K, Q) };
  if (def.pressureSource !== 'depletion') return { ...f, ren };
  return { ...f, ren, pressureIn: fin(def.collapseAt / K * (f.R * (1 - circ) + rForeign - G)) };
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
    // M5: the shadow freezes the return share too (SectorState.returnAtBase)
    const m5 = inp.m5 && es.returnAtBase !== undefined && inp.m5.ret !== es.returnAtBase ? { ...inp.m5, ret: es.returnAtBase } : inp.m5 ?? null;
    if (Math.abs(etaBase - f.eta) <= 1e-12 * f.eta && m5 === (inp.m5 ?? null)) r = f.R; // identical solve
    else {
      const def = content.sectors[s];
      const lev = inp.lev ?? sectorLevers(state, content)[s] ?? NO_LEVERS;
      r = solveSector(def, es, Math.max(POP_MIN, fin(state.population, 1)), modsOf(state, content), lev, inp.extraD, inp.spillMul, inp.capR, etaBase, inp.feedMul, inp.pr, inp.seam, inp.squeeze, inp.feedSat ?? null, m5).R;
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
  return def.resourceKind !== 'flow' // M4: a renewable's is the true Q / K (reserveMax = K); a drawer's mirrors its owner's
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
  const withinBudget = !!f && isWithin(es.budget?.account === 'full' ? lineR(state, content, fl, s) : f.R, budgetR); // M4: the line's account
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
    sinkR: !withSink ? null : f.ren && def.pressureSource === 'depletion' ? depletionSink(state, content, s, f, clearP)
      : sinkROf(es, def, content, f.R, f.pressureIn, f.deletionOut, ab, clearP),
    sinkHeld: withinBudget && W >= target && clear && !fl.pending,
  };
}
