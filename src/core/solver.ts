/**
 * The sector solver: the price/demand fixed point of one sector (stock or flow resource, duty, cap with leak and
 * squeeze limit, substitution, rationing, review gate), with no state of its own beyond scratch outputs.
 * Hot path: called for every open sector on every step, and again for the shadow.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { SectorDef, SectorState } from '../types';
import {
  SUBSTITUTION_CAPCOST_MUL, CAP_LEAK_MAX, CAP_SQUEEZE_MAX, FLOW_MAX_UTILISATION, FLOW_MIN_CAPACITY_SHARE,
  DEFECT_UTILISATION_START, DEFECT_PENALTY, POP_MIN,
} from './constants';
import { flowCapacity } from './effects';
import type { Mods } from './effects';
import type { SectorLevers } from './levers';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* The sector solver: price/demand fixed point                         */
/* ------------------------------------------------------------------ */

const BISECT_ITERS = 44;

export interface SectorFlow {
  eta: number; etaFold: number;
  c: number; m: number;
  prBase: number; permit: number; pr: number;
  pPre: number; permitPart: number; dutyPart: number; ps: number;
  D: number; R: number; sigma: number;
  income: number; dutyRevenue: number; permitRevenue: number; treasuryLevy: number;
  /** M2: levy revenue routed to 'commons'. */
  commonsLevy: number;
  capacity: number; usable: number; util: number; unrev: number;
  appD: number[]; appSat: number[];
  reserveGain: number; pressureIn: number; deletionOut: number;
  wellbeingShare: number;
}

// scratch outputs for supply()
let sSigma = 0, sR = 0, sPrBase = 0, sPre = 0, sPermitPart = 0, sDutyPart = 0, sCust = 0;

export function solveSector(
  def: SectorDef, es: SectorState, N: number, mods: Mods, lev: SectorLevers, extraD: number, spillMul: number,
  capR: number, etaOverride?: number,
): SectorFlow {
  const sid = def.id;
  const eta = Math.max(1e-12, fin(etaOverride ?? es.eta, def.baseEta || 1));
  const c = Math.max(0, def.capCost * (mods.capMul[sid] ?? 1));
  const m = Math.max(0, def.margin + (mods.marginAdd[sid] ?? 0));
  const isFlow = def.resourceKind === 'flow';
  const apps = def.applications;
  const n = apps.length;
  const S = new Array<number>(n), P = new Array<number>(n), K = new Array<number>(n), F = new Array<number>(n);
  const active: number[] = [];
  const satSector = mods.satMulSector[sid] ?? 1, halfSector = mods.halfMulSector[sid] ?? 1;
  for (let i = 0; i < n; i++) {
    const a = apps[i];
    const st = es.apps[a.id];
    S[i] = 0; P[i] = 1; K[i] = 1; F[i] = 0;
    if (!st || !st.founded) continue;
    S[i] = Math.max(0, fin(N * a.saturation * fin(st.satMul, 1) * satSector * (mods.satMulApp[a.id] ?? 1) * spillMul));
    const hp = a.halfPrice * halfSector * (mods.halfMulApp[a.id] ?? 1);
    P[i] = hp > 0 ? hp : 1e-12;
    K[i] = a.steepness > 0 ? a.steepness : 1;
    F[i] = Math.max(0, (a.lockIn ?? 0) * fin(st.peakD));
    active.push(i);
  }
  const demand = (p: number): number => {
    let d = extraD;
    for (let j = 0; j < active.length; j++) {
      const i = active[j];
      const x = S[i] / (1 + Math.pow(p / P[i], K[i]));
      d += x > F[i] ? x : F[i];
    }
    return d;
  };

  // resource side
  let pr0 = def.basePrice;
  let capacity = 0, usable = Infinity;
  if (isFlow) {
    capacity = flowCapacity(def, mods);
    const eff = Math.max(FLOW_MIN_CAPACITY_SHARE * capacity, capacity - fin(es.pressure) * def.pressureUpkeep);
    usable = Math.max(1e-12, eff * (1 - lev.delShare));
  } else if (es.reserveMax > 0) {
    const q = Math.max(es.reserve, 1e-9 * es.reserveMax);
    pr0 = def.basePrice * Math.pow(es.reserveMax / q, def.alpha);
  }
  const subC = SUBSTITUTION_CAPCOST_MUL * c;
  const dutyOn = lev.dutyS > 0 && lev.dutyRef > 0;
  const sigmaOf = (D: number): number =>
    lev.subShare <= 0 ? 0 : D > 0 ? Math.min(lev.subShare, lev.subCap / D) : lev.subShare;
  const prOf = (R: number): number =>
    isFlow ? def.basePrice * Math.pow(1 / (1 - Math.min(FLOW_MAX_UTILISATION, R / usable)), def.alpha) : pr0;
  const supply = (D: number, permit: number): void => {
    sSigma = sigmaOf(D);
    sR = ((1 - sSigma) * D) / eta;
    sPrBase = prOf(sR);
    sPre = (1 - sSigma) * (sPrBase / eta + c) + sSigma * subC;
    sPermitPart = ((1 - sSigma) * permit) / eta;
    const before = sPre + sPermitPart;
    sDutyPart = dutyOn ? lev.dutyS * Math.max(0, lev.dutyRef - before) : 0;
    sCust = before + sDutyPart;
  };

  // unconstrained equilibrium: closed form for a stock sector without substitution (p_s does not depend on D)
  let p: number;
  if (!isFlow && lev.subShare <= 0) {
    supply(0, 0);
    p = sCust;
  } else {
    const prMax = isFlow ? def.basePrice * Math.pow(1 / (1 - FLOW_MAX_UTILISATION), def.alpha) : pr0;
    let hi = Math.max(prMax / eta + c, subC, dutyOn ? lev.dutyRef : 0) * 1.0001 + 1e-12;
    let lo = hi * 1e-12;
    for (let it = 0; it < BISECT_ITERS; it++) {
      const mid = Math.sqrt(lo * hi);
      supply(demand(mid), 0);
      if (sCust > mid) lo = mid; else hi = mid;
    }
    p = Math.sqrt(lo * hi);
  }
  let D = demand(p);
  supply(D, 0);
  let sigma = sSigma, R = sR, prBase = sPrBase, pPre = sPre, permitPart = sPermitPart, dutyPart = sDutyPart, ps = sCust;
  let permit = 0;

  // hard cap (with leak). Floors (lock-in, drawsOn) are demand no price removes: the cap binds only down to
  // rFloor + (1 − CAP_SQUEEZE_MAX) of the squeezable use (see LeverKind 'cap').
  if (Number.isFinite(capR)) {
    let dInf = extraD;
    for (const i of active) dInf += F[i];
    const rFloor = ((1 - sigmaOf(dInf)) * dInf) / eta;
    const rFree = R;
    const capTarget = (capEff: number): number => Math.max(capEff, rFloor + (1 - CAP_SQUEEZE_MAX) * Math.max(0, rFree - rFloor));
    if (R > capTarget(capR)) {
      const rAt = (pp: number): number => {
        const d = demand(pp);
        return ((1 - sigmaOf(d)) * d) / eta;
      };
      const solveCap = (capWanted: number): { p: number; permit: number; prBase: number } => {
        const capEff = capTarget(capWanted);
        let lo = p, hi = p * 2 + 1e-12;
        for (let k = 0; k < 80 && rAt(hi) > capEff; k++) { lo = hi; hi *= 2; }
        for (let it = 0; it < BISECT_ITERS; it++) {
          const mid = Math.sqrt(lo * hi);
          if (rAt(mid) > capEff) lo = mid; else hi = mid;
        }
        const pc = hi;
        const d = demand(pc);
        const sg = sigmaOf(d);
        const r = ((1 - sg) * d) / eta;
        const pb = prOf(r);
        let pre = pc;
        if (dutyOn && pc < lev.dutyRef) pre = (pc - lev.dutyS * lev.dutyRef) / (1 - lev.dutyS);
        const pConv = sg < 1 ? (pre - sg * subC) / (1 - sg) : pre;
        return { p: pc, permit: Math.max(0, (pConv - c) * eta - pb), prBase: pb };
      };
      const leakOf = (s: { permit: number; prBase: number }): number =>
        Number.isFinite(lev.leakAbove) && s.prBase > 0
          ? CAP_LEAK_MAX * clamp(s.permit / (lev.leakAbove * s.prBase) - 1, 0, 1)
          : 0;
      let sol = solveCap(capR);
      const f0 = leakOf(sol);
      if (f0 > 0) {
        let lo = 0, hi = f0;
        for (let it = 0; it < 14; it++) {
          const mid = (lo + hi) / 2;
          const s = R > capTarget(capR * (1 + mid)) ? solveCap(capR * (1 + mid)) : { p, permit: 0, prBase };
          if (leakOf(s) > mid) lo = mid; else hi = mid;
        }
        const capEff = capR * (1 + hi);
        sol = R > capTarget(capEff) ? solveCap(capEff) : { p, permit: 0, prBase };
      }
      if (sol.permit > 0) {
        p = sol.p;
        D = demand(p);
        supply(D, sol.permit);
        sigma = sSigma; R = sR; prBase = sPrBase; pPre = sPre; permitPart = sPermitPart; dutyPart = sDutyPart; ps = sCust;
        permit = sol.permit;
      }
    }
  }

  // flow rationing
  const demandAtP = D;
  if (isFlow && R > FLOW_MAX_UTILISATION * usable) {
    R = FLOW_MAX_UTILISATION * usable;
    D = sigma < 1 ? (R * eta) / (1 - sigma) : D;
  }
  const unrevAt = (u: number): number =>
    clamp((u - DEFECT_UTILISATION_START) / (FLOW_MAX_UTILISATION - DEFECT_UTILISATION_START), 0, 1);
  let util = isFlow ? R / usable : 0;
  let unrev = isFlow ? unrevAt(util) : 0;
  if (isFlow && lev.review > 0 && unrev > 0) {
    // Solve u = u0 · (1 − review · unrev(u)) (left side rises, right side falls: one root).
    const u0 = util;
    let lo = 0, hi = u0;
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) / 2;
      if (mid < u0 * (1 - lev.review * unrevAt(mid))) lo = mid; else hi = mid;
    }
    util = hi;
    unrev = unrevAt(util);
    const keep = u0 > 0 ? util / u0 : 1;
    D *= keep; R *= keep;
  }

  // per-app split
  const appD = new Array<number>(n).fill(0);
  const appSat = S.slice();
  for (const i of active) {
    const x = S[i] / (1 + Math.pow(p / P[i], K[i]));
    appD[i] = x > F[i] ? x : F[i];
  }
  const scale = demandAtP > 0 ? D / demandAtP : 0;
  let reserveGain = 0;
  for (let i = 0; i < n; i++) {
    appD[i] = fin(appD[i] * scale);
    reserveGain += (apps[i].reserveGainPerService ?? 0) * appD[i];
  }

  const income = m * pPre * D;
  const dutyRevenue = Math.max(0, dutyPart) * D;
  const permitRevenue = Math.max(0, permit) * R;
  let treasury = 0, dividend = 0, commons = 0;
  if (lev.dutyRecycle === 'treasury') treasury += dutyRevenue; else if (lev.dutyRecycle === 'dividend') dividend += dutyRevenue;
  else if (lev.dutyRecycle === 'commons') commons += dutyRevenue;
  if (lev.capRecycle === 'treasury') treasury += permitRevenue; else if (lev.capRecycle === 'dividend') dividend += permitRevenue;
  else if (lev.capRecycle === 'commons') commons += permitRevenue;
  const dDiv = ps > 0 ? dividend / ps : 0;
  const intensity = def.pressureIntensity * (1 - lev.libs);
  const pressureIn = (def.pressureSource === 'service' ? D * (1 - sigma) : R) * intensity;
  const deletionOut = isFlow && lev.delShare > 0
    ? lev.delShare * Math.max(FLOW_MIN_CAPACITY_SHARE * capacity, capacity - fin(es.pressure) * def.pressureUpkeep) * lev.delRate
    : 0;
  const nPos = Math.max(POP_MIN, N);
  let wb = def.wellbeingWeight * Math.log(1 + (D + fin(dDiv)) / (nPos * (def.wellbeingScale > 0 ? def.wellbeingScale : 1)));
  if (isFlow) wb *= 1 - DEFECT_PENALTY * unrev * (1 - lev.review);
  const pf = def.collapseAt > 0 ? clamp(fin(es.pressure) / def.collapseAt, 0, 1) : 0;
  wb -= def.pressureWellbeingCost * pf;

  const etaBase = fin(es.etaAtBase) > 0 ? es.etaAtBase : (es.baseR > 0 && es.baseD > 0 ? es.baseD / es.baseR : def.baseEta || 1);
  return {
    eta, etaFold: fin(eta / etaBase, 1), c, m,
    prBase: fin(prBase), permit: fin(permit), pr: fin(prBase + permit),
    pPre: fin(pPre), permitPart: fin(permitPart), dutyPart: fin(dutyPart), ps: fin(pPre) + fin(permitPart) + fin(dutyPart),
    D: fin(D), R: fin(R), sigma,
    income: fin(income), dutyRevenue: fin(dutyRevenue), permitRevenue: fin(permitRevenue), treasuryLevy: fin(treasury), commonsLevy: fin(commons),
    capacity, usable: fin(usable), util: fin(util), unrev,
    appD, appSat, reserveGain: fin(reserveGain), pressureIn: fin(pressureIn), deletionOut: fin(deletionOut),
    wellbeingShare: fin(wb),
  };
}
