/**
 * The sector solver: the price/demand fixed point of one sector (stock or flow resource, duty, cap with leak and
 * squeeze limit, substitution, rationing, review gate), with no state of its own beyond scratch outputs.
 * Hot path: called for every open sector on every step, and again for the shadow.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { LOAD_HOURS } from '../types';
import type { SectorDef, SectorState } from '../types';
import {
  SUBSTITUTION_CAPCOST_MUL, CAP_LEAK_MAX, CAP_SQUEEZE_MAX, FLOW_MAX_UTILISATION, FLOW_MIN_CAPACITY_SHARE,
  DEFECT_UTILISATION_START, DEFECT_PENALTY, POP_MIN, DEFAULT_LOAD_FLOOR, DEFAULT_TRAVEL_EXPONENT, TRAVEL_ITERS,
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
  capacity: number; usable: number; util: number; unrev: number;
  appD: number[]; appSat: number[];
  reserveGain: number; pressureIn: number; deletionOut: number;
  wellbeingShare: number;
  /* M3 (null where the sector lacks the kind) */
  /** The load curve at the solved price (LoadDef); `c` above is then c_eff. */
  load: { factor: number; hours: number[]; peak: number; cBase: number; cEff: number } | null;
  /** Travel at the solved price (TravelDef): v(D), free speed s, K, (D/K)^b. */
  travel: { v: number; s: number; K: number; congestion: number } | null;
  /** Seen price per application (index as appD) when any application's differs from p_s; else null. */
  appSeen: number[] | null;
  /** The seam price multiplier in force (1 without seams sunk). */
  seamMul: number;
}

/* ---- M3: per-sector mechanic data (cached per SectorDef) ---- */
interface Mech {
  /** Per application: its load shape (mean 1), or null without `load`. */
  shapes: Float64Array[] | null;
  shapeDefault: Float64Array | null;
  /** Per application: 1 if a travel application (TravelDef.apps; default every application). */
  isTravel: Uint8Array | null;
  /** Any application with ApplicationDef.priceSeen. */
  seenDef: boolean;
}
const mechCache = new WeakMap<SectorDef, Mech>();
function shapeOf(w: number[] | undefined): Float64Array {
  const out = new Float64Array(LOAD_HOURS);
  let sum = 0;
  for (let h = 0; h < LOAD_HOURS; h++) { const x = w && Number.isFinite(w[h]) && w[h] > 0 ? w[h] : 0; out[h] = x; sum += x; }
  if (!(sum > 0)) { out.fill(1); return out; }
  for (let h = 0; h < LOAD_HOURS; h++) out[h] = (LOAD_HOURS * out[h]) / sum;
  return out;
}
export function mechOf(def: SectorDef): Mech {
  let m = mechCache.get(def);
  if (m) return m;
  const apps = def.applications;
  let shapes: Float64Array[] | null = null, shapeDefault: Float64Array | null = null;
  if (def.load) {
    const prof = def.load.profiles ?? {};
    const byName: Record<string, Float64Array> = {};
    const get = (k: string) => (byName[k] ??= shapeOf(prof[k]));
    const dk = prof[def.load.defaultProfile] ? def.load.defaultProfile : '';
    shapeDefault = dk ? get(dk) : shapeOf(undefined);
    shapes = apps.map((a) => (a.profile && prof[a.profile] ? get(a.profile) : shapeDefault!));
  }
  let isTravel: Uint8Array | null = null;
  if (def.travel) {
    const list = def.travel.apps;
    isTravel = new Uint8Array(apps.map((a) => (!list || list.includes(a.id) ? 1 : 0)));
  }
  m = { shapes, shapeDefault, isTravel, seenDef: apps.some((a) => !!a.priceSeen) };
  mechCache.set(def, m);
  return m;
}
const H = new Float64Array(LOAD_HOURS);
/** The load factor and the hourly sum for per-app demands x (active indices) and extra demand: fills H, returns LF. */
function loadFactor(mech: Mech, x: number[], active: number[], extraD: number): { lf: number; mean: number; peak: number } {
  const sh = mech.shapes!, sd = mech.shapeDefault!;
  for (let h = 0; h < LOAD_HOURS; h++) H[h] = extraD * sd[h];
  for (let j = 0; j < active.length; j++) {
    const i = active[j];
    const xi = x[i], si = sh[i];
    if (xi > 0) for (let h = 0; h < LOAD_HOURS; h++) H[h] += xi * si[h];
  }
  let sum = 0, peak = 0;
  for (let h = 0; h < LOAD_HOURS; h++) { sum += H[h]; if (H[h] > peak) peak = H[h]; }
  const mean = sum / LOAD_HOURS;
  return { lf: mean > 0 && peak > 0 ? mean / peak : 1, mean, peak };
}

// scratch outputs for supply(); cC = the capital cost per unit in force (c, or M3's c_eff at the last mix tried)
let sSigma = 0, sR = 0, sPrBase = 0, sPre = 0, sPermitPart = 0, sDutyPart = 0, sCust = 0, cC = 0;

export function solveSector(
  def: SectorDef, es: SectorState, N: number, mods: Mods, lev: SectorLevers, extraD: number, spillMul: number,
  capR: number, etaOverride?: number,
): SectorFlow {
  const sid = def.id;
  const eta = Math.max(1e-12, fin(etaOverride ?? es.eta, def.baseEta || 1));
  const c = Math.max(0, def.capCost * (mods.capMul[sid] ?? 1));
  const im = mods.incomeMulAll * (mods.incomeMul[sid] ?? 1);
  const m0 = Math.max(0, def.margin + (mods.marginAdd[sid] ?? 0));
  const m = im === 1 ? m0 : Math.max(0, m0 * im);
  cC = c;
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
  const demandPlain = (p: number): number => {
    let d = extraD;
    for (let j = 0; j < active.length; j++) {
      const i = active[j];
      const x = S[i] / (1 + Math.pow(p / P[i], K[i]));
      d += x > F[i] ? x : F[i];
    }
    return d;
  };

  /* ---- M3 mechanics: priceSeen (1), travel (2), load (3); see the contract's "M3 MECHANICS" ---- */
  const mech = mechOf(def);
  let SH: number[] | null = null, FLt: number[] | null = null;
  const seenEff = mods.priceSeenSector[sid];
  let anySeenEffect = seenEff !== undefined;
  if (!anySeenEffect) for (const k in mods.priceSeenApp) { anySeenEffect = true; break; }
  if (mech.seenDef || anySeenEffect) {
    for (const i of active) {
      const a = apps[i];
      const ea = mods.priceSeenApp[a.id];
      let e: { share: number; flat: number } | undefined = ea;
      if (seenEff && (!e || seenEff.share < e.share || (seenEff.share === e.share && seenEff.flat < e.flat))) e = seenEff;
      const share = e ? e.share : a.priceSeen ? Math.max(0, fin(a.priceSeen.share, 1)) : 1;
      const flat = e ? e.flat : a.priceSeen ? Math.max(0, fin(a.priceSeen.flat ?? 0)) : 0;
      if (share === 1 && flat === 0) continue;
      SH ??= new Array<number>(n).fill(1); FLt ??= new Array<number>(n).fill(0);
      SH[i] = share; FLt[i] = flat;
    }
  }
  const trav = def.travel && mech.isTravel ? def.travel : null;
  const tK = trav ? Math.max(1e-12, fin(trav.roads * (mods.travelRoads[sid] ?? 1), 1e-12)) : 0;
  const tS = trav ? Math.max(0, fin(mods.travelSpeed[sid] ?? 1, 1)) : 0;
  const tB = trav ? (trav.exponent !== undefined && trav.exponent > 0 ? trav.exponent : DEFAULT_TRAVEL_EXPONENT) : 0;
  const ld = def.load && mech.shapes ? def.load : null;
  const lK = ld ? clamp(fin(ld.fixedShare), 0, 1) : 0;
  const lFloor = ld ? Math.max(1e-6, fin(ld.floor ?? DEFAULT_LOAD_FLOOR, DEFAULT_LOAD_FLOOR)) : 1;
  const mechOn = SH !== null || trav !== null || ld !== null;
  const AX = mechOn ? new Array<number>(n).fill(0) : null; // per-app demand at the last price tried
  const X0 = trav ? new Array<number>(n).fill(0) : null;
  let lastV = tS, lastLF = 1;
  const speedAt = (D: number): number => tS / (1 + Math.pow(D / tK, tB));
  const demandM = (p: number): number => {
    const ax = AX!;
    let d = extraD;
    if (trav) {
      const x0 = X0!, tr = mech.isTravel!;
      let lo = extraD, hi = extraD, fixed = extraD;
      for (const i of active) {
        const pa = SH ? SH[i] * p + FLt![i] : p;
        x0[i] = S[i] / (1 + Math.pow(pa / P[i], K[i]));
        lo += F[i];
        if (tr[i]) hi += Math.max(F[i], S[i] * Math.max(1, tS));
        else { const x = x0[i] > F[i] ? x0[i] : F[i]; hi += x; fixed += x; }
      }
      const rhs = (D: number): number => {
        const v = speedAt(D);
        let r = fixed;
        for (const i of active) if (tr[i]) { const x = x0[i] * v; r += x > F[i] ? x : F[i]; }
        return r;
      };
      for (let it = 0; it < TRAVEL_ITERS; it++) {
        const mid = (lo + hi) / 2;
        if (rhs(mid) > mid) lo = mid; else hi = mid;
      }
      const Dst = (lo + hi) / 2;
      lastV = speedAt(Dst);
      for (const i of active) {
        const x = tr[i] ? x0[i] * lastV : x0[i];
        ax[i] = x > F[i] ? x : F[i];
        d += ax[i];
      }
    } else {
      for (const i of active) {
        const pa = SH ? SH[i] * p + FLt![i] : p;
        const x = S[i] / (1 + Math.pow(pa / P[i], K[i]));
        ax[i] = x > F[i] ? x : F[i];
        d += ax[i];
      }
    }
    if (ld) {
      lastLF = loadFactor(mech, ax, active, extraD).lf;
      cC = c * ((1 - lK) + lK / Math.max(lFloor, lastLF));
    }
    return d;
  };
  const demand = mechOn ? demandM : demandPlain;

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
  // M3: the deepest seam's multiplier (stock) and resourcePriceMul effects (both 1 by default)
  const nSeams = isFlow ? 0 : es.seamsSunk ?? 0;
  const seamDef = nSeams > 0 && def.seams && def.seams.length ? def.seams[Math.min(nSeams, def.seams.length) - 1] : undefined;
  const seamMul = seamDef ? Math.max(0, fin(seamDef.priceMul, 1)) : 1;
  const rpm = mods.resourcePriceMul[sid] ?? 1;
  const prMul = seamMul * rpm;
  if (!isFlow && prMul !== 1) pr0 *= prMul;
  const dutyOn = lev.dutyS > 0 && lev.dutyRef > 0;
  const flowMul = isFlow ? rpm : 1;
  const sigmaOf = (D: number): number =>
    lev.subShare <= 0 ? 0 : D > 0 ? Math.min(lev.subShare, lev.subCap / D) : lev.subShare;
  const prOf = (R: number): number =>
    isFlow ? (flowMul === 1 ? def.basePrice : def.basePrice * flowMul) * Math.pow(1 / (1 - Math.min(FLOW_MAX_UTILISATION, R / usable)), def.alpha) : pr0;
  const supply = (D: number, permit: number): void => {
    sSigma = sigmaOf(D);
    sR = ((1 - sSigma) * D) / eta;
    sPrBase = prOf(sR);
    sPre = (1 - sSigma) * (sPrBase / eta + cC) + sSigma * (SUBSTITUTION_CAPCOST_MUL * cC);
    sPermitPart = ((1 - sSigma) * permit) / eta;
    const before = sPre + sPermitPart;
    sDutyPart = dutyOn ? lev.dutyS * Math.max(0, lev.dutyRef - before) : 0;
    sCust = before + sDutyPart;
  };

  // unconstrained equilibrium: closed form for a stock sector without substitution (p_s does not depend on D)
  let p: number;
  if (!isFlow && lev.subShare <= 0 && !ld) {
    supply(0, 0);
    p = sCust;
  } else {
    const prMax = isFlow ? (flowMul === 1 ? def.basePrice : def.basePrice * flowMul) * Math.pow(1 / (1 - FLOW_MAX_UTILISATION), def.alpha) : pr0;
    const cMax = ld ? c * ((1 - lK) + lK / lFloor) : c;
    let hi = Math.max(prMax / eta + cMax, SUBSTITUTION_CAPCOST_MUL * cMax, dutyOn ? lev.dutyRef : 0) * 1.0001 + 1e-12;
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
    for (const i of active) {
      // M3: an application whose seen price ignores p_s (share 0) is price-proof: a floor at its flat price
      if (SH && SH[i] === 0) { const x = S[i] * (trav && mech.isTravel![i] ? Math.max(1, tS) : 1) / (1 + Math.pow(FLt![i] / P[i], K[i])); dInf += x > F[i] ? x : F[i]; }
      else dInf += F[i];
    }
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
        const pConv = sg < 1 ? (pre - sg * (SUBSTITUTION_CAPCOST_MUL * cC)) / (1 - sg) : pre;
        return { p: pc, permit: Math.max(0, (pConv - cC) * eta - pb), prBase: pb };
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
  let loadOut: SectorFlow['load'] = null;
  let travelOut: SectorFlow['travel'] = null;
  if (mechOn) {
    demandM(p); // the mix, speed and c_eff at the solved price
    for (const i of active) appD[i] = AX![i];
    if (trav) {
      const tr = mech.isTravel!;
      for (const i of active) if (tr[i]) appSat[i] = S[i] * lastV;
      const Dt = demandAtP;
      travelOut = { v: fin(lastV), s: tS, K: tK, congestion: fin(Math.pow(Dt / tK, tB)) };
    }
    if (ld) {
      const r = loadFactor(mech, AX!, active, extraD);
      loadOut = { factor: fin(r.lf, 1), hours: Array.from(H, (x) => fin(x)), peak: fin(r.peak), cBase: c, cEff: cC };
    }
  } else {
    for (const i of active) {
      const x = S[i] / (1 + Math.pow(p / P[i], K[i]));
      appD[i] = x > F[i] ? x : F[i];
    }
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
  let treasury = 0, dividend = 0;
  if (lev.dutyRecycle === 'treasury') treasury += dutyRevenue; else if (lev.dutyRecycle === 'dividend') dividend += dutyRevenue;
  if (lev.capRecycle === 'treasury') treasury += permitRevenue; else if (lev.capRecycle === 'dividend') dividend += permitRevenue;
  const dDiv = ps > 0 ? dividend / ps : 0;
  const imul = mods.intensityMul[sid] ?? 1;
  const intensity = imul === 1 ? def.pressureIntensity * (1 - lev.libs) : def.pressureIntensity * (1 - lev.libs) * imul;
  let appSeen: number[] | null = null;
  if (SH) { appSeen = new Array<number>(n); for (let i = 0; i < n; i++) appSeen[i] = fin(SH[i] * ps + FLt![i]); }
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
    eta, etaFold: fin(eta / etaBase, 1), c: cC, m,
    prBase: fin(prBase), permit: fin(permit), pr: fin(prBase + permit),
    pPre: fin(pPre), permitPart: fin(permitPart), dutyPart: fin(dutyPart), ps: fin(pPre) + fin(permitPart) + fin(dutyPart),
    D: fin(D), R: fin(R), sigma,
    income: fin(income), dutyRevenue: fin(dutyRevenue), permitRevenue: fin(permitRevenue), treasuryLevy: fin(treasury),
    capacity, usable: fin(usable), util: fin(util), unrev,
    appD, appSat, reserveGain: fin(reserveGain), pressureIn: fin(pressureIn), deletionOut: fin(deletionOut),
    wellbeingShare: fin(wb),
    load: loadOut, travel: travelOut, appSeen, seamMul,
  };
}
