/**
 * REBOUND — simulation core. Pure TypeScript: no DOM, no clock, no randomness.
 * Implements ModelApi from ./types. Never mutates the state passed in.
 */
import { ERA_ORDER, YEARS_PER_SECOND, STEADY_STATE_YEARS, START_YEAR, SAVE_VERSION } from './types';
import type {
  AppDerived, AppState, Content, Derived, EffectDef, EraDef, EraDerived, EraId, EraState, GameState,
  HeadlineKey, HistorySample, LeverDef, LeverState, LeverView, MetaState, ModelApi, NewsItem, ReckoningCause,
  RunStats, UpgradeDef, UpgradeView,
} from './types';

/* ------------------------------------------------------------------ */
/* Constants chosen by the model                                       */
/* ------------------------------------------------------------------ */

/** Share of duty (tax) revenue that trickles into Mandate. Tax is never player income. */
export const DUTY_MANDATE_SHARE = 0.1;
/** Substituted (renewable) service costs this multiple of capCost per unit, and no resource. */
export const SUBSTITUTION_CAPCOST_MUL = 1.5;
/** A hard cap leaks by up to this share once the permit price is far above the resource price. */
export const CAP_LEAK_MAX = 0.25;
/** Flow eras: price saturates here; service above this utilisation is rationed (never reaches 1). */
export const FLOW_MAX_UTILISATION = 0.98;
/** Flow eras: effective capacity never falls below this share of nominal capacity. */
export const FLOW_MIN_CAPACITY_SHARE = 0.05;
/** Flow eras (Era 5): utilisation above this starts shipping unreviewed work (defect penalty). */
export const DEFECT_UTILISATION_START = 0.8;
/** Wellbeing share lost at full unreviewed share. */
export const DEFECT_PENALTY = 0.5;
/** Time constant (s) of the smoothed resource-use average. */
export const TREND_TAU = 60;
/** trendR (fraction per in-game year) below which an era counts as decoupling. */
export const DECOUPLING_TREND = -0.001;
/** Seconds an era must have been open before it can decouple. */
export const DECOUPLING_MIN_OPEN = 120;
/** Rate per second at which sufficiency-lowered saturation recovers once the lever is relaxed. */
export const SUFFICIENCY_RECOVERY_RATE = 0.01;
/** Population shrinks at this fraction of the growth rate when wellbeing is below subsistence. */
export const NEGATIVE_GROWTH_STRENGTH = 0.25;
export const POP_MIN = 0.01;
/** A stock reserve counts as exhausted at or below this fraction of reserveMax (depletion pricing makes
 *  the last fraction of a percent asymptotic, so "0" would never quite arrive). */
export const EXHAUSTED_BELOW = 0.002;
export const HISTORY_EVERY = 5;
export const HISTORY_MAX = 240;
export const NEWS_MAX = 40;
export const FAST_FORWARD_STEP = 5;
export const PROJECTION_SECONDS = 120;
export const PROJECTION_DT = 2;
/** autoEta exponent cap (keeps η finite in very long runs). */
const AUTO_ETA_EXP_MAX = 300;
const BISECT_ITERS = 44;

/* ------------------------------------------------------------------ */
/* Internal extensions of the state (stored as extra JSON fields)      */
/* ------------------------------------------------------------------ */

/** η at the moment baseR/baseD were recorded (so knowhow-boosted runs start at etaFold 1). */
type EraStateX = EraState & { etaAtBase?: number };
/** Eras that reached Steady State during this run (for the Hindsight formula). */
type RunStatsX = RunStats & { steadyEras?: Partial<Record<EraId, boolean>> };

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const fin = (x: number, fallback = 0): number => (Number.isFinite(x) ? x : fallback);
const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

function eraIds(content: Content): EraId[] {
  return ERA_ORDER.filter((e) => !!content.eras && !!content.eras[e]);
}

function freshMeta(): MetaState {
  return {
    hindsight: 0, hindsightEarned: 0, reckonings: 0, knowhow: {}, institutions: {}, achievements: {},
    steadyEras: {}, furthestEra: 1, totalSeconds: 0,
  };
}

function freshRun(): RunStatsX {
  return { peakWellbeing: 0, decoupledYears: 0, resourceUsed: {}, clicks: 0, steadyEras: {} };
}

/* ------------------------------------------------------------------ */
/* Modifiers from upgrades, know-how and institutions                  */
/* ------------------------------------------------------------------ */

interface Mods {
  etaMul: Record<string, number>;
  capMul: Record<string, number>;
  marginAdd: Record<string, number>;
  reserveAdd: Record<string, number>;
  absorptionAdd: Record<string, number>;
  reveal: boolean;
  startCapitalMul: number;
  mandateRateMul: number;
  costMul: number;
  startLevers: Record<string, number>;
}

function emptyMods(): Mods {
  const one: Record<string, number> = {}, zero: Record<string, number> = {};
  return {
    etaMul: { ...one }, capMul: { ...one }, marginAdd: { ...zero }, reserveAdd: { ...zero }, absorptionAdd: { ...zero },
    reveal: false, startCapitalMul: 1, mandateRateMul: 1, costMul: 1, startLevers: {},
  };
}

function applyEffect(m: Mods, ef: EffectDef, times: number): void {
  if (times <= 0) return;
  switch (ef.type) {
    case 'etaMul': m.etaMul[ef.era] = (m.etaMul[ef.era] ?? 1) * Math.pow(ef.value, times); break;
    case 'capCostMul': m.capMul[ef.era] = (m.capMul[ef.era] ?? 1) * Math.pow(ef.value, times); break;
    case 'marginAdd': m.marginAdd[ef.era] = (m.marginAdd[ef.era] ?? 0) + ef.value * times; break;
    case 'reserveAdd': m.reserveAdd[ef.era] = (m.reserveAdd[ef.era] ?? 0) + ef.value * times; break;
    case 'absorptionAdd': m.absorptionAdd[ef.era] = (m.absorptionAdd[ef.era] ?? 0) + ef.value * times; break;
    case 'reveal': m.reveal = true; break;
    case 'startCapitalMul': m.startCapitalMul *= Math.pow(ef.value, times); break;
    case 'mandateRateMul': m.mandateRateMul *= Math.pow(ef.value, times); break;
    case 'costMul': m.costMul *= Math.pow(ef.value, times); break;
    case 'startLever': m.startLevers[ef.lever] = Math.max(m.startLevers[ef.lever] ?? 0, ef.level); break;
  }
}

interface ContentIndex {
  upgrades: Map<string, UpgradeDef>;
  levers: Map<string, LeverDef>;
  apps: Map<string, { era: EraId; idx: number }>;
  efficiencyByEra: Record<string, string[]>;
  knowhow: Map<string, Content['knowhow'][number]>;
  institutions: Map<string, Content['institutions'][number]>;
}
const indexCache = new WeakMap<Content, ContentIndex>();
function idx(content: Content): ContentIndex {
  let ix = indexCache.get(content);
  if (ix) return ix;
  ix = { upgrades: new Map(), levers: new Map(), apps: new Map(), efficiencyByEra: {}, knowhow: new Map(), institutions: new Map() };
  for (const u of content.upgrades ?? []) {
    ix.upgrades.set(u.id, u);
    if (u.kind === 'efficiency') (ix.efficiencyByEra[u.era] ??= []).push(u.id);
  }
  for (const l of content.levers ?? []) ix.levers.set(l.id, l);
  for (const k of content.knowhow ?? []) ix.knowhow.set(k.id, k);
  for (const i of content.institutions ?? []) ix.institutions.set(i.id, i);
  for (const e of eraIds(content)) content.eras[e].applications.forEach((a, i) => ix!.apps.set(a.id, { era: e, idx: i }));
  indexCache.set(content, ix);
  return ix;
}

const modsCache = new WeakMap<object, { kh: object; inst: object; content: Content; mods: Mods }>();
function computeMods(upgrades: Record<string, number>, meta: MetaState, content: Content): Mods {
  const hit = modsCache.get(upgrades);
  if (hit && hit.kh === meta.knowhow && hit.inst === meta.institutions && hit.content === content) return hit.mods;
  const ix = idx(content);
  const m = emptyMods();
  for (const id in upgrades) {
    const u = ix.upgrades.get(id);
    const lvl = upgrades[id] ?? 0;
    if (!u || lvl <= 0) continue;
    for (const ef of u.effects) applyEffect(m, ef, lvl);
  }
  for (const id in meta.knowhow ?? {}) {
    const k = ix.knowhow.get(id);
    const lvl = meta.knowhow[id] ?? 0;
    if (!k || lvl <= 0) continue;
    for (const ef of k.effects) applyEffect(m, ef, lvl);
  }
  for (const id in meta.institutions ?? {}) {
    const i = ix.institutions.get(id);
    if (!i || !meta.institutions[id]) continue;
    for (const ef of i.effects) applyEffect(m, ef, 1);
  }
  modsCache.set(upgrades, { kh: meta.knowhow, inst: meta.institutions, content, mods: m });
  return m;
}
const modsOf = (s: GameState, c: Content): Mods => computeMods(s.upgrades, s.meta, c);

function staticEta(def: EraDef, mods: Mods): number {
  return def.baseEta * (mods.etaMul[def.id] ?? 1);
}
function etaAt(def: EraDef, mods: Mods, openFor: number): number {
  const auto = def.autoEtaRate > 0 ? Math.exp(Math.min(AUTO_ETA_EXP_MAX, def.autoEtaRate * openFor)) : 1;
  return staticEta(def, mods) * auto;
}
function flowCapacity(def: EraDef, mods: Mods): number {
  return Math.max(0, def.reserve * (1 + (mods.reserveAdd[def.id] ?? 0)));
}

/* ------------------------------------------------------------------ */
/* Levers aggregated per era                                           */
/* ------------------------------------------------------------------ */

interface EraLevers {
  dutyS: number; dutyRef: number;
  capR: number; leakAbove: number;
  sufTarget: number; sufRate: number;
  subShare: number; subCap: number;
  circ: number; green: number;
  delShare: number; delRate: number;
  review: number; libs: number;
}
function noLevers(): EraLevers {
  return {
    dutyS: 0, dutyRef: 0, capR: Infinity, leakAbove: Infinity, sufTarget: 1, sufRate: 0, subShare: 0, subCap: 0,
    circ: 0, green: 0, delShare: 0, delRate: 0, review: 0, libs: 0,
  };
}
const NO_LEVERS = noLevers();

const leverCache = new WeakMap<object, { content: Content; byEra: Record<string, EraLevers> }>();
function eraLevers(state: GameState, content: Content): Record<string, EraLevers> {
  const hit = leverCache.get(state.levers);
  if (hit && hit.content === content) return hit.byEra;
  const byEra: Record<string, EraLevers> = {};
  for (const def of content.levers ?? []) {
    const ls = state.levers[def.id];
    const lvl = ls ? Math.min(ls.level, def.levels.length) : 0;
    if (lvl <= 0) continue;
    const L = def.levels[lvl - 1];
    const v = fin(L.value), v2 = L.value2;
    const a = (byEra[def.era] ??= noLevers());
    switch (def.kind) {
      case 'duty':
        if (ls.ref > 0 && v > a.dutyS) { a.dutyS = clamp(v, 0, 0.999); a.dutyRef = ls.ref; }
        break;
      case 'cap':
        if (ls.ref > 0) {
          const capR = Math.max(0, v) * ls.ref;
          if (capR < a.capR) { a.capR = capR; a.leakAbove = v2 !== undefined && v2 > 0 ? v2 : Infinity; }
        }
        break;
      case 'sufficiency':
        a.sufTarget = Math.min(a.sufTarget, clamp(v, 0, 1));
        a.sufRate = Math.max(a.sufRate, v2 ?? 0.01);
        break;
      case 'substitution':
        a.subShare = clamp(a.subShare + v, 0, 1);
        a.subCap += Math.max(0, v2 ?? Infinity);
        break;
      case 'circularity': a.circ = clamp(a.circ + v, 0, 0.95); break;
      case 'greenSpending': a.green = clamp(a.green + v, 0, 1); break;
      case 'deletion':
        a.delShare = clamp(a.delShare + v, 0, 0.9);
        a.delRate = Math.max(a.delRate, v2 ?? 1);
        break;
      case 'reviewGate': a.review = clamp(Math.max(a.review, v), 0, 1); break;
      case 'sharedLibs': a.libs = clamp(a.libs + v, 0, 0.95); break;
    }
  }
  leverCache.set(state.levers, { content, byEra });
  return byEra;
}

function leverNetUpkeep(def: LeverDef, level: number, instLevel: number): number {
  if (level <= 0) return 0;
  const lv = Math.min(level, def.levels.length);
  const full = def.levels[lv - 1]?.mandateUpkeep ?? 0;
  const free = instLevel > 0 ? def.levels[Math.min(instLevel, lv) - 1]?.mandateUpkeep ?? 0 : 0;
  return Math.max(0, full - free);
}

/* ------------------------------------------------------------------ */
/* The era solver: price/demand fixed point                            */
/* ------------------------------------------------------------------ */

interface EraFlow {
  eta: number; etaFold: number;
  prBase: number; permit: number; pr: number;
  pPre: number; ps: number;
  D: number; R: number; sigma: number;
  income: number; dutyRevenue: number;
  capacity: number; usable: number; util: number; unrev: number;
  appD: number[]; appSat: number[];
  reserveGain: number; pressureIn: number; deletionOut: number;
  wellbeingShare: number;
}

// scratch outputs for supply()
let sSigma = 0, sR = 0, sPrBase = 0, sPre = 0, sCust = 0;

function solveEra(
  def: EraDef, es: EraStateX, N: number, mods: Mods, lev: EraLevers, extraD: number, spillMul: number,
): EraFlow {
  const e = def.id;
  const eta = Math.max(1e-12, fin(es.eta, def.baseEta || 1));
  const c = Math.max(0, def.capCost * (mods.capMul[e] ?? 1));
  const m = Math.max(0, def.margin + (mods.marginAdd[e] ?? 0));
  const isFlow = def.resourceKind === 'flow';
  const apps = def.applications;
  const n = apps.length;
  const S = new Array<number>(n), P = new Array<number>(n), K = new Array<number>(n), F = new Array<number>(n);
  const active: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = apps[i];
    const st = es.apps[a.id];
    S[i] = 0; P[i] = 1; K[i] = 1; F[i] = 0;
    if (!st || !st.founded) continue;
    S[i] = Math.max(0, N * a.saturation * fin(st.satMul, 1) * spillMul);
    P[i] = a.halfPrice > 0 ? a.halfPrice : 1e-12;
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
    const pConv = (sPrBase + permit) / eta + c;
    sPre = (1 - sSigma) * pConv + sSigma * subC;
    sCust = dutyOn ? sPre + lev.dutyS * Math.max(0, lev.dutyRef - sPre) : sPre;
  };

  // unconstrained equilibrium
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
  let sigma = sSigma, R = sR, prBase = sPrBase, pPre = sPre, ps = sCust, permit = 0;

  // hard cap (with leak)
  if (Number.isFinite(lev.capR) && R > lev.capR) {
    const rAt = (pp: number): number => {
      const d = demand(pp);
      return ((1 - sigmaOf(d)) * d) / eta;
    };
    const solveCap = (capEff: number): { p: number; permit: number; prBase: number } => {
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
    let sol = solveCap(lev.capR);
    const f0 = leakOf(sol);
    if (f0 > 0) {
      let lo = 0, hi = f0;
      for (let it = 0; it < 14; it++) {
        const mid = (lo + hi) / 2;
        const s = R > lev.capR * (1 + mid) ? solveCap(lev.capR * (1 + mid)) : { p, permit: 0, prBase };
        if (leakOf(s) > mid) lo = mid; else hi = mid;
      }
      const capEff = lev.capR * (1 + hi);
      sol = R > capEff ? solveCap(capEff) : { p, permit: 0, prBase };
    }
    if (sol.permit > 0) {
      p = sol.p;
      D = demand(p);
      supply(D, sol.permit);
      sigma = sSigma; R = sR; prBase = sPrBase; pPre = sPre; ps = sCust; permit = sol.permit;
    }
  }

  // flow rationing
  const demandAtP = D;
  if (isFlow && R > FLOW_MAX_UTILISATION * usable) {
    R = FLOW_MAX_UTILISATION * usable;
    D = sigma < 1 ? (R * eta) / (1 - sigma) : D;
  }
  const util = isFlow ? R / usable : 0;
  const unrev = isFlow ? clamp((util - DEFECT_UTILISATION_START) / (FLOW_MAX_UTILISATION - DEFECT_UTILISATION_START), 0, 1) : 0;
  const cut = lev.review * unrev;
  if (cut > 0) { D *= 1 - cut; R *= 1 - cut; }

  // per-app split
  const appD = new Array<number>(n).fill(0);
  const appSat = S.slice();
  let appSum = 0;
  for (const i of active) {
    const x = S[i] / (1 + Math.pow(p / P[i], K[i]));
    appD[i] = x > F[i] ? x : F[i];
    appSum += appD[i];
  }
  const scale = demandAtP > 0 ? D / demandAtP : 0;
  let reserveGain = 0;
  for (let i = 0; i < n; i++) {
    appD[i] = fin(appD[i] * scale);
    reserveGain += (apps[i].reserveGainPerService ?? 0) * appD[i];
  }
  void appSum;

  const income = m * pPre * D;
  const dutyRevenue = Math.max(0, ps - pPre) * D;
  const intensity = def.pressureIntensity * (1 - lev.libs);
  const pressureIn = (def.pressureSource === 'service' ? D * (1 - sigma) : R) * intensity;
  const deletionOut = isFlow && lev.delShare > 0
    ? lev.delShare * Math.max(FLOW_MIN_CAPACITY_SHARE * capacity, capacity - fin(es.pressure) * def.pressureUpkeep) * lev.delRate
    : 0;
  const nPos = Math.max(POP_MIN, N);
  let wb = def.wellbeingWeight * Math.log(1 + D / (nPos * (def.wellbeingScale > 0 ? def.wellbeingScale : 1)));
  if (isFlow) wb *= 1 - DEFECT_PENALTY * unrev * (1 - lev.review);
  const pf = def.collapseAt > 0 ? clamp(fin(es.pressure) / def.collapseAt, 0, 1) : 0;
  wb -= def.pressureWellbeingCost * pf;

  const etaBase = fin(es.etaAtBase ?? 0) > 0 ? es.etaAtBase! : (es.baseR > 0 && es.baseD > 0 ? es.baseD / es.baseR : def.baseEta || 1);
  return {
    eta, etaFold: fin(eta / etaBase, 1),
    prBase: fin(prBase), permit: fin(permit), pr: fin(prBase + permit),
    pPre: fin(pPre), ps: fin(ps), D: fin(D), R: fin(R), sigma,
    income: fin(income), dutyRevenue: fin(dutyRevenue),
    capacity, usable: fin(usable), util: fin(util), unrev,
    appD, appSat, reserveGain: fin(reserveGain), pressureIn: fin(pressureIn), deletionOut: fin(deletionOut),
    wellbeingShare: fin(wb),
  };
}

/* ------------------------------------------------------------------ */
/* Whole-state flows (cached per state object)                         */
/* ------------------------------------------------------------------ */

interface Flows {
  eras: Partial<Record<EraId, EraFlow>>;
  wellbeing: number;
  income: number;
  dutyRevenue: number;
  mandateGain: number;
  upkeep: number;
  pending: { cause: ReckoningCause; era?: EraId } | null;
}

function pendingOf(state: GameState, content: Content): { cause: ReckoningCause; era?: EraId } | null {
  for (const e of eraIds(content)) {
    const es = state.eras[e];
    if (!es || !es.open) continue;
    const def = content.eras[e];
    if (def.resourceKind === 'stock' && es.reserve <= EXHAUSTED_BELOW * es.reserveMax) return { cause: 'exhausted', era: e };
  }
  for (const e of eraIds(content)) {
    const es = state.eras[e];
    if (!es || !es.open) continue;
    const def = content.eras[e];
    if (def.collapseAt > 0 && es.pressure >= def.collapseAt) return { cause: 'collapse', era: e };
  }
  return null;
}

const flowsCache = new WeakMap<GameState, { content: Content; flows: Flows }>();
function computeFlows(state: GameState, content: Content): Flows {
  const hit = flowsCache.get(state);
  if (hit && hit.content === content) return hit.flows;
  const mods = modsOf(state, content);
  const levs = eraLevers(state, content);
  const ids = eraIds(content);
  const N = Math.max(POP_MIN, fin(state.population, 1));
  const spill: Record<string, number> = {};
  const extra: Record<string, number> = {};
  const eras: Partial<Record<EraId, EraFlow>> = {};
  let wellbeing = 0, income = 0, dutyRevenue = 0;
  for (let k = ids.length - 1; k >= 0; k--) {
    const e = ids[k];
    const es = state.eras[e] as EraStateX;
    if (!es || !es.open) continue;
    const def = content.eras[e];
    const lev = levs[e] ?? NO_LEVERS;
    const f = solveEra(def, es, N, mods, lev, extra[e] ?? 0, spill[e] ?? 1);
    eras[e] = f;
    wellbeing += f.wellbeingShare;
    income += f.income;
    dutyRevenue += f.dutyRevenue;
    if (def.spill && state.eras[def.spill.to]?.open && es.basePs > 0) {
      const add = def.spill.rate * (1 - lev.green) * Math.max(0, 1 - f.ps / es.basePs);
      spill[def.spill.to] = (spill[def.spill.to] ?? 1) * (1 + Math.max(0, add));
    }
    if (def.drawsOn && state.eras[def.drawsOn.era]?.open) {
      extra[def.drawsOn.era] = (extra[def.drawsOn.era] ?? 0) + Math.max(0, def.drawsOn.perService * f.D);
    }
  }
  wellbeing = Math.max(0, fin(wellbeing));
  const g = content.global;
  const mandateGain = g.mandateRate * Math.max(0, wellbeing - g.mandateFloor) * mods.mandateRateMul + DUTY_MANDATE_SHARE * dutyRevenue;
  let upkeep = 0;
  for (const def of content.levers ?? []) {
    const ls = state.levers[def.id];
    if (ls && ls.level > 0) upkeep += leverNetUpkeep(def, ls.level, mods.startLevers[def.id] ?? 0);
  }
  const flows: Flows = {
    eras, wellbeing, income: fin(income), dutyRevenue: fin(dutyRevenue), mandateGain: fin(mandateGain), upkeep: fin(upkeep),
    pending: pendingOf(state, content),
  };
  flowsCache.set(state, { content, flows });
  return flows;
}

/* ------------------------------------------------------------------ */
/* Headlines                                                           */
/* ------------------------------------------------------------------ */

const FALLBACK: Record<HeadlineKey, string> = {
  appFounded: '{app} founded', appAvailable: '{app} now within reach', eraOpened: 'A new age: {era}',
  crisis: 'Crisis in {era}', collapse: '{era} collapses', exhausted: '{resource} exhausted', backfire: 'Efficiency backfires in {era}',
  reveal: 'The rebound revealed', leverEnacted: 'New measure enacted', leverLapsed: 'Measure lapses for want of mandate',
  steadyEra: '{era} reaches a steady state', steadyAll: 'A steady state, at last', reckoning: 'The Reckoning',
  efficiency: 'Engines thriftier than ever',
};

function headline(
  state: GameState, content: Content, key: HeadlineKey, time: number, era?: EraId, appName?: string,
): NewsItem {
  const variants = content.headlines?.[key];
  const n = (state.seed >>> 0) + Math.floor(time * 7) + state.news.length + key.length;
  let text = variants && variants.length ? variants[n % variants.length] : FALLBACK[key] ?? key;
  const def = era ? content.eras[era] : undefined;
  text = text
    .replace(/\{era\}/g, def?.name ?? '')
    .replace(/\{app\}/g, appName ?? '')
    .replace(/\{resource\}/g, def?.resource.name ?? '')
    .replace(/\{service\}/g, def?.service.name ?? '');
  const item: NewsItem = { time, year: Math.floor(START_YEAR + time * YEARS_PER_SECOND), key, text };
  if (era) item.era = era;
  return item;
}

function withNews(news: NewsItem[], items: NewsItem[]): NewsItem[] {
  if (!items.length) return news;
  const out = items.slice().reverse().concat(news);
  return out.length > NEWS_MAX ? out.slice(0, NEWS_MAX) : out;
}

/* ------------------------------------------------------------------ */
/* State construction                                                  */
/* ------------------------------------------------------------------ */

function freshEra(def: EraDef, mods: Mods, open: boolean): EraStateX {
  const apps: Record<string, AppState> = {};
  for (const a of def.applications) {
    const avail = open && a.visibleBelow === Infinity;
    apps[a.id] = { available: avail, founded: avail && a.foundCost <= 0, satMul: 1, peakD: 0 };
  }
  const q = def.resourceKind === 'flow' ? flowCapacity(def, mods) : Math.max(0, def.reserve * (1 + (mods.reserveAdd[def.id] ?? 0)));
  return {
    open, openFor: 0, eta: open ? etaAt(def, mods, 0) : def.baseEta, reserve: open ? q : 0, reserveMax: open ? q : 0,
    pressure: 0, crisesFired: 0, apps, baseR: 0, baseD: 0, basePs: 0, smoothR: 0, trendR: 0, peakR: 0, steadyYears: 0,
    backfired: false, etaAtBase: 0,
  };
}

function snapshotBase(es: EraStateX, f: EraFlow): EraStateX {
  if (es.baseR > 0 || !(f.D > 0) || !(f.R > 0)) return es;
  return { ...es, baseR: f.R, baseD: f.D, basePs: f.ps, etaAtBase: f.eta, smoothR: f.R, peakR: Math.max(es.peakR, f.R) };
}

function historySample(state: GameState, flows: Flows): HistorySample {
  const eras: HistorySample['eras'] = {};
  for (const e of ERA_ORDER) {
    const f = flows.eras[e];
    const es = state.eras[e];
    if (!f || !es) continue;
    eras[e] = [fin(f.etaFold, 1), es.baseR > 0 ? fin(f.R / es.baseR, 1) : 1];
  }
  return { time: state.time, eras, wellbeing: flows.wellbeing };
}

function pushHistory(history: HistorySample[], s: HistorySample): HistorySample[] {
  let h = history.concat([s]);
  if (h.length > HISTORY_MAX) {
    const half = Math.floor(h.length / 2);
    const older = h.slice(0, half).filter((_, i) => i % 2 === 0);
    h = older.concat(h.slice(half));
  }
  return h;
}

function createState(content: Content, meta?: MetaState, seed?: number): GameState {
  const m: MetaState = meta ? { ...freshMeta(), ...meta } : freshMeta();
  const upgrades: Record<string, number> = {};
  const mods = computeMods(upgrades, m, content);
  const ids = eraIds(content);
  const eras = {} as Record<EraId, EraState>;
  for (const e of ERA_ORDER) {
    const def = content.eras?.[e];
    if (!def) continue;
    eras[e] = freshEra(def, mods, e === ids[0]);
  }
  const levers: Record<string, LeverState> = {};
  for (const l of content.levers ?? []) levers[l.id] = { level: Math.min(mods.startLevers[l.id] ?? 0, l.levels.length), ref: 0 };
  const g = content.global;
  let s: GameState = {
    version: SAVE_VERSION, seed: (seed ?? 1) >>> 0, time: 0,
    capital: fin(g.startCapital * mods.startCapitalMul), mandate: 0, population: 1, peakPopulation: 1,
    upgrades, levers, eras, flags: { revealed: mods.reveal, won: false }, steadyYearsAll: 0,
    news: [], history: [], run: freshRun(), meta: m,
  };
  // initial availability check and baseline
  const flows = computeFlows(s, content);
  const newEras = { ...s.eras };
  for (const e of ids) {
    const f = flows.eras[e];
    if (!f) continue;
    let es = newEras[e] as EraStateX;
    const apps = { ...es.apps };
    for (const a of content.eras[e].applications) {
      if (!apps[a.id].available && f.ps <= a.visibleBelow) apps[a.id] = { ...apps[a.id], available: true, founded: a.foundCost <= 0 };
    }
    es = { ...es, apps };
    newEras[e] = snapshotBase(es, f);
  }
  s = { ...s, eras: newEras };
  s = { ...s, history: [historySample(s, computeFlows(s, content))] };
  return s;
}

/* ------------------------------------------------------------------ */
/* Tick                                                                */
/* ------------------------------------------------------------------ */

function grant(ach: Record<string, boolean>, id: string, out: { ach: Record<string, boolean> | null }): void {
  const cur = out.ach ?? ach;
  if (cur[id]) return;
  out.ach = { ...cur, [id]: true };
}

function step(state: GameState, content: Content, dt: number): GameState {
  if (!(dt > 0)) return state;
  const fl = computeFlows(state, content);
  if (fl.pending) return state;
  const g = content.global;
  const mods = modsOf(state, content);
  const levs = eraLevers(state, content);
  const ix = idx(content);
  const ids = eraIds(content);
  const time = state.time + dt;
  const W = fl.wellbeing;
  const items: NewsItem[] = [];
  const achOut: { ach: Record<string, boolean> | null } = { ach: null };
  const runX = state.run as RunStatsX;
  let steadyEras = state.meta.steadyEras;
  let runSteady = runX.steadyEras ?? {};
  const resourceUsed = { ...state.run.resourceUsed };
  let crisisCount = 0;
  let anyDecoupling = false;
  let allDecoupling = true;
  let levers = state.levers;
  const eras = { ...state.eras };
  const tmp = { ...state, time };

  for (const e of ids) {
    const es0 = state.eras[e] as EraStateX;
    if (!es0 || !es0.open) continue;
    const f = fl.eras[e];
    if (!f) continue;
    const def = content.eras[e];
    const lev = levs[e] ?? NO_LEVERS;
    let es: EraStateX = { ...es0 };
    es.openFor = es0.openFor + dt;
    es.eta = etaAt(def, mods, es.openFor);

    // applications
    const apps: Record<string, AppState> = { ...es0.apps };
    def.applications.forEach((a, i) => {
      let st = apps[a.id] ?? { available: false, founded: false, satMul: 1, peakD: 0 };
      const d = f.appD[i];
      let changed = false;
      const ns = { ...st };
      if (d > ns.peakD) { ns.peakD = d; changed = true; }
      const target = lev.sufTarget;
      if (ns.satMul > target + 1e-12) {
        ns.satMul = Math.max(target, ns.satMul - (ns.satMul - target) * Math.min(1, lev.sufRate * dt));
        changed = true;
      } else if (ns.satMul < target - 1e-12) {
        ns.satMul = Math.min(target, ns.satMul + (target - ns.satMul) * Math.min(1, SUFFICIENCY_RECOVERY_RATE * dt));
        changed = true;
      }
      if (!ns.available && f.ps <= a.visibleBelow) {
        ns.available = true; changed = true;
        if (a.foundCost <= 0) {
          ns.founded = true;
          items.push(headline(tmp, content, 'appFounded', time, e, a.name));
        } else items.push(headline(tmp, content, 'appAvailable', time, e, a.name));
      }
      if (changed || !apps[a.id]) { st = ns; apps[a.id] = st; }
    });
    es.apps = apps;

    // resource
    if (def.resourceKind === 'stock') {
      es.reserve = Math.max(0, es0.reserve - f.R * (1 - lev.circ) * dt + f.reserveGain * dt);
      es.reserveMax = es0.reserveMax + f.reserveGain * dt;
      if (es.reserve <= EXHAUSTED_BELOW * es.reserveMax) items.push(headline(tmp, content, 'exhausted', time, e));
    } else {
      es.reserve = es.reserveMax = f.capacity;
    }
    resourceUsed[e] = (resourceUsed[e] ?? 0) + f.R * dt;

    // pressure
    const absorption = Math.max(0, def.absorption + (mods.absorptionAdd[e] ?? 0));
    es.pressure = Math.max(0, fin(es0.pressure * Math.exp(-absorption * dt) + (f.pressureIn - f.deletionOut) * dt));
    while (es.crisesFired < def.crisisAt.length && def.collapseAt > 0 && es.pressure >= def.crisisAt[es.crisesFired] * def.collapseAt) {
      es.crisesFired++;
      crisisCount++;
      items.push(headline(tmp, content, 'crisis', time, e));
    }
    if (def.collapseAt > 0 && es.pressure >= def.collapseAt) items.push(headline(tmp, content, 'collapse', time, e));

    // baseline, trend, peaks
    if (es.baseR <= 0) {
      es = snapshotBase(es, f);
      es.trendR = 0;
    } else {
      const old = es0.smoothR > 0 ? es0.smoothR : f.R;
      const sm = old + (f.R - old) * (1 - Math.exp(-dt / TREND_TAU));
      es.smoothR = fin(sm);
      es.trendR = old > 0 ? fin((sm - old) / old / (dt * YEARS_PER_SECOND)) : 0;
    }
    es.peakR = Math.max(es.peakR, f.R);

    // backfire
    if (es.baseR > 0 && f.etaFold > 1.001 && !es.backfired) {
      const promised = es.baseR / f.etaFold;
      const rebound = (f.R - promised) / (es.baseR - promised);
      if (rebound > 1) {
        es.backfired = true;
        items.push(headline(tmp, content, 'backfire', time, e));
        grant(state.meta.achievements, 'backfire', achOut);
      }
    }
    // Jevons was right
    if (es.baseR > 0 && es.peakR / es.baseR >= 10) {
      const effs = ix.efficiencyByEra[e] ?? [];
      if (effs.length && effs.every((id) => (state.upgrades[id] ?? 0) > 0)) grant(state.meta.achievements, 'jevonsWasRight', achOut);
    }
    // decoupling
    const decoupling = es.trendR < DECOUPLING_TREND && W >= g.wellbeingTarget && es.openFor >= DECOUPLING_MIN_OPEN;
    if (decoupling) {
      anyDecoupling = true;
      const before = es.steadyYears;
      es.steadyYears = before + dt * YEARS_PER_SECOND;
      if (before < STEADY_STATE_YEARS && es.steadyYears >= STEADY_STATE_YEARS) {
        steadyEras = { ...steadyEras, [e]: true };
        runSteady = { ...runSteady, [e]: true };
        grant(state.meta.achievements, 'steadyState', achOut);
        items.push(headline(tmp, content, 'steadyEra', time, e));
      }
    } else {
      es.steadyYears = 0;
      allDecoupling = false;
    }
    // degrowth by accident
    if (state.population < 0.6 * state.peakPopulation && es.trendR < 0 && W < g.wellbeingTarget) {
      grant(state.meta.achievements, 'degrowthByAccident', achOut);
    }
    // lever ref snapshots (startLever institutions, or enacted before demand existed)
    if (f.D > 0) {
      for (const ld of content.levers ?? []) {
        if (ld.era !== e || (ld.kind !== 'duty' && ld.kind !== 'cap')) continue;
        const ls = levers[ld.id];
        if (ls && ls.level > 0 && !(ls.ref > 0)) {
          const ref = ld.kind === 'duty' ? f.pPre : f.R;
          if (ref > 0) {
            if (levers === state.levers) levers = { ...levers };
            levers[ld.id] = { level: ls.level, ref };
          }
        }
      }
    }
    eras[e] = es;
  }

  // population
  let growth = g.popGrowth * (W - g.subsistence);
  if (growth < 0) growth *= NEGATIVE_GROWTH_STRENGTH;
  let population = state.population * Math.exp(clamp(growth * dt, -50, 50));
  if (crisisCount) population *= Math.pow(1 - g.crisisPopLoss, crisisCount);
  population = Math.max(POP_MIN, fin(population, POP_MIN));

  // mandate & lapse
  let mandate = state.mandate + (fl.mandateGain - fl.upkeep) * dt + crisisCount * g.crisisMandate;
  if (mandate <= 0) {
    mandate = 0;
    if (fl.upkeep > fl.mandateGain) {
      let worst: LeverDef | null = null, worstUp = 0;
      for (const ld of content.levers ?? []) {
        const ls = levers[ld.id];
        if (!ls || ls.level <= 0) continue;
        const up = leverNetUpkeep(ld, ls.level, mods.startLevers[ld.id] ?? 0);
        if (up > worstUp) { worstUp = up; worst = ld; }
      }
      if (worst) {
        const ls = levers[worst.id];
        if (levers === state.levers) levers = { ...levers };
        const lvl = ls.level - 1;
        levers[worst.id] = { level: lvl, ref: lvl > 0 ? ls.ref : 0 };
        items.push(headline(tmp, content, 'leverLapsed', time, worst.era));
      }
    }
  }
  mandate = fin(mandate);

  // era openings
  let furthest = state.meta.furthestEra;
  for (let k = 1; k < ids.length; k++) {
    const e = ids[k];
    if (eras[e]?.open) continue;
    const prev = ids[k - 1];
    if (!eras[prev]?.open) break;
    const def = content.eras[e];
    const need = def.unlock ?? { prevServicePriceBelow: Infinity, minReckonings: 0 };
    const pf = fl.eras[prev];
    if (pf && pf.ps < need.prevServicePriceBelow && state.meta.reckonings >= need.minReckonings) {
      eras[e] = freshEra(def, mods, true);
      furthest = Math.max(furthest, def.index);
      items.push(headline(tmp, content, 'eraOpened', time, e));
    }
    break;
  }

  // steady state across all five
  const allOpen = ERA_ORDER.every((e) => eras[e]?.open);
  let steadyYearsAll = state.steadyYearsAll;
  let flags = state.flags;
  if (allOpen && allDecoupling && anyDecoupling) {
    const before = steadyYearsAll;
    steadyYearsAll += dt * YEARS_PER_SECOND;
    if (before < STEADY_STATE_YEARS && steadyYearsAll >= STEADY_STATE_YEARS && !flags.won) {
      flags = { ...flags, won: true };
      items.push(headline(tmp, content, 'steadyAll', time));
    }
  } else steadyYearsAll = 0;

  const run: RunStatsX = {
    ...state.run,
    peakWellbeing: Math.max(state.run.peakWellbeing, W),
    decoupledYears: state.run.decoupledYears + (anyDecoupling ? dt * YEARS_PER_SECOND : 0),
    resourceUsed,
    steadyEras: runSteady,
  };
  const meta: MetaState = {
    ...state.meta,
    totalSeconds: state.meta.totalSeconds + dt,
    furthestEra: furthest,
    achievements: achOut.ach ?? state.meta.achievements,
    steadyEras,
  };

  let next: GameState = {
    ...state, time, capital: fin(state.capital + fl.income * dt), mandate, population,
    peakPopulation: Math.max(state.peakPopulation, population), eras, levers, flags, steadyYearsAll, run, meta,
    news: withNews(state.news, items),
  };
  if (Math.floor(time / HISTORY_EVERY) > Math.floor(state.time / HISTORY_EVERY)) {
    next = { ...next, history: pushHistory(state.history, historySample(next, computeFlows(next, content))) };
  }
  return next;
}

function tick(state: GameState, content: Content, dt: number): GameState {
  if (!(dt > 0) || !Number.isFinite(dt)) return state;
  const n = Math.ceil(dt);
  const h = dt / n;
  let s = state;
  for (let i = 0; i < n; i++) {
    const t = step(s, content, h);
    if (t === s) break;
    s = t;
  }
  return s;
}

function fastForward(state: GameState, content: Content, seconds: number): GameState {
  const total = Math.min(Math.max(0, fin(seconds)), content.global.offlineCapSeconds ?? 14400);
  if (!(total > 0)) return state;
  const n = Math.ceil(total / FAST_FORWARD_STEP);
  const h = total / n;
  let s = state;
  for (let i = 0; i < n; i++) {
    const t = step(s, content, h);
    if (t === s) break;
    s = t;
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Derive                                                              */
/* ------------------------------------------------------------------ */

function derive(state: GameState, content: Content): Derived {
  const fl = computeFlows(state, content);
  const g = content.global;
  const levs = eraLevers(state, content);
  const ids = eraIds(content);
  const eras: Partial<Record<EraId, EraDerived>> = {};
  for (const e of ids) {
    const f = fl.eras[e];
    const es = state.eras[e] as EraStateX;
    if (!f || !es) continue;
    const def = content.eras[e];
    const lev = levs[e] ?? NO_LEVERS;
    const promisedR = es.baseR > 0 ? es.baseR / f.etaFold : 0;
    const rebound = es.baseR > 0 && f.etaFold > 1.001 && es.baseR - promisedR > 0
      ? fin((f.R - promisedR) / (es.baseR - promisedR)) : null;
    const apps: Record<string, AppDerived> = {};
    def.applications.forEach((a, i) => {
      const st = es.apps[a.id];
      const sat = f.appSat[i];
      apps[a.id] = {
        available: !!st?.available, founded: !!st?.founded, demand: f.appD[i],
        adoption: sat > 0 ? clamp(f.appD[i] / sat, 0, 1) : 0,
        canFound: !!st?.available && !st.founded && state.capital >= a.foundCost,
      };
    });
    let secondsLeft = Infinity;
    if (def.resourceKind === 'stock') {
      const drain = f.R * (1 - lev.circ) - f.reserveGain;
      if (drain > 0) secondsLeft = Math.max(0, es.reserve - EXHAUSTED_BELOW * es.reserveMax) / drain;
    }
    eras[e] = {
      eta: f.eta, etaFold: f.etaFold, resourcePrice: f.pr, servicePrice: f.ps, demand: f.D, resourceUse: f.R,
      rFold: es.baseR > 0 ? f.R / es.baseR : 1, promisedR, rebound, income: f.income,
      reserveFraction: def.resourceKind === 'stock' ? (es.reserveMax > 0 ? clamp(es.reserve / es.reserveMax, 0, 1) : 0) : clamp(1 - f.util, 0, 1),
      secondsLeft, pressureFraction: def.collapseAt > 0 ? Math.max(0, es.pressure / def.collapseAt) : 0,
      trendR: es.trendR,
      decoupling: es.trendR < DECOUPLING_TREND && fl.wellbeing >= g.wellbeingTarget && es.openFor >= DECOUPLING_MIN_OPEN,
      steadyYears: es.steadyYears, wellbeingShare: f.wellbeingShare, apps,
    };
  }
  let growth = g.popGrowth * (fl.wellbeing - g.subsistence);
  if (growth < 0) growth *= NEGATIVE_GROWTH_STRENGTH;
  let nextEra: Derived['nextEra'] = null;
  for (let k = 1; k < ids.length; k++) {
    const e = ids[k];
    if (state.eras[e]?.open) continue;
    const need = content.eras[e].unlock ?? { prevServicePriceBelow: Infinity, minReckonings: 0 };
    nextEra = {
      id: e, priceNow: fl.eras[ids[k - 1]]?.ps ?? Infinity, priceNeeded: need.prevServicePriceBelow,
      reckoningsNeeded: need.minReckonings, reckoningsHave: state.meta.reckonings,
    };
    break;
  }
  return {
    year: START_YEAR + state.time * YEARS_PER_SECOND,
    wellbeing: fl.wellbeing,
    incomePerSec: fl.income,
    mandatePerSec: fl.mandateGain - fl.upkeep,
    populationGrowthPerSec: growth * state.population,
    pendingReckoning: fl.pending,
    hindsightIfReckonNow: hindsightOnReckon(state, content),
    eras,
    nextEra,
  };
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function click(state: GameState, content: Content): GameState {
  const fl = computeFlows(state, content);
  if (fl.pending) return state;
  const g = content.global;
  return {
    ...state, capital: fin(state.capital + g.clickFlat + g.clickSeconds * fl.income),
    run: { ...state.run, clicks: state.run.clicks + 1 },
  };
}

function upgradeCost(def: UpgradeDef, level: number, mods: Mods): number {
  const growth = def.repeatable ? Math.pow(def.costGrowth ?? 1, level) : 1;
  return def.cost * mods.costMul * growth;
}
function upgradeMax(def: UpgradeDef): number {
  return def.repeatable ? def.maxLevel ?? Infinity : 1;
}
function upgradeVisible(state: GameState, def: UpgradeDef): boolean {
  return !!state.eras[def.era]?.open && (def.requires ?? []).every((r) => (state.upgrades[r] ?? 0) > 0);
}

/** Applies an upgrade (one level) without charging for it. */
function applyUpgrade(state: GameState, content: Content, def: UpgradeDef, time: number): GameState {
  const level = state.upgrades[def.id] ?? 0;
  const upgrades = { ...state.upgrades, [def.id]: level + 1 };
  const mods = computeMods(upgrades, state.meta, content);
  const items: NewsItem[] = [];
  const eras = { ...state.eras };
  let flags = state.flags;
  // η of every open era (cheap and covers cross-era effects)
  for (const e of eraIds(content)) {
    const es = eras[e];
    if (es?.open) eras[e] = { ...es, eta: etaAt(content.eras[e], mods, es.openFor) };
  }
  for (const ef of def.effects) {
    if (ef.type === 'reserveAdd') {
      const edef = content.eras[ef.era];
      const es = eras[ef.era];
      if (edef && es?.open && edef.resourceKind === 'stock') {
        const add = ef.value * edef.reserve;
        eras[ef.era] = { ...es, reserve: es.reserve + add, reserveMax: es.reserveMax + add };
      } else if (edef && es?.open) {
        const cap = flowCapacity(edef, mods);
        eras[ef.era] = { ...es, reserve: cap, reserveMax: cap };
      }
    } else if (ef.type === 'reveal' && !flags.revealed) {
      flags = { ...flags, revealed: true };
      items.push(headline(state, content, 'reveal', time, def.era));
    }
  }
  if (def.kind === 'efficiency') items.push(headline(state, content, 'efficiency', time, def.era));
  return { ...state, upgrades, eras, flags, news: withNews(state.news, items) };
}

function buyUpgrade(state: GameState, content: Content, upgradeId: string): GameState {
  const def = idx(content).upgrades.get(upgradeId);
  if (!def || computeFlows(state, content).pending) return state;
  const level = state.upgrades[def.id] ?? 0;
  if (level >= upgradeMax(def) || !upgradeVisible(state, def)) return state;
  const cost = upgradeCost(def, level, modsOf(state, content));
  if (!(state.capital >= cost)) return state;
  const s = applyUpgrade(state, content, def, state.time);
  return { ...s, capital: state.capital - cost };
}

function foundApp(state: GameState, content: Content, appId: string): GameState {
  const loc = idx(content).apps.get(appId);
  if (!loc) return state;
  const es = state.eras[loc.era];
  const def = content.eras[loc.era].applications[loc.idx];
  const st = es?.apps[appId];
  if (!es?.open || !st || !st.available || st.founded || !(state.capital >= def.foundCost)) return state;
  if (computeFlows(state, content).pending) return state;
  const eras = { ...state.eras, [loc.era]: { ...es, apps: { ...es.apps, [appId]: { ...st, founded: true } } } };
  return {
    ...state, capital: state.capital - def.foundCost, eras,
    news: withNews(state.news, [headline(state, content, 'appFounded', state.time, loc.era, def.name)]),
  };
}

function leverVisible(state: GameState, content: Content, def: LeverDef, mods: Mods): boolean {
  if (!state.eras[def.era]?.open) return false;
  const inst = (mods.startLevers[def.id] ?? 0) > 0;
  if (!state.flags.revealed && !inst) return false;
  const ix = idx(content);
  return (def.requires ?? []).every((r) =>
    r === 'revealed' ? state.flags.revealed
      : ix.upgrades.has(r) ? (state.upgrades[r] ?? 0) > 0
        : ix.institutions.has(r) ? !!state.meta.institutions[r]
          : true);
}

function setLever(state: GameState, content: Content, leverId: string, level: number): GameState {
  const def = idx(content).levers.get(leverId);
  if (!def || !Number.isFinite(level)) return state;
  const mods = modsOf(state, content);
  if (!leverVisible(state, content, def, mods)) return state;
  const target = clamp(Math.round(level), 0, def.levels.length);
  const cur = state.levers[leverId] ?? { level: 0, ref: 0 };
  if (target === cur.level) return state;
  const fl = computeFlows(state, content);
  if (fl.pending) return state;
  if (target < cur.level) {
    return { ...state, levers: { ...state.levers, [leverId]: { level: target, ref: target > 0 ? cur.ref : 0 } } };
  }
  const inst = mods.startLevers[leverId] ?? 0;
  let cost = 0;
  for (let l = cur.level + 1; l <= target; l++) if (l > inst) cost += def.levels[l - 1].mandateCost;
  if (!(state.mandate >= cost)) return state;
  let ref = cur.ref;
  if (cur.level === 0 || !(ref > 0)) {
    const f = fl.eras[def.era];
    ref = f && f.D > 0 ? (def.kind === 'duty' ? f.pPre : def.kind === 'cap' ? f.R : 1) : 0;
  }
  return {
    ...state, mandate: state.mandate - cost,
    levers: { ...state.levers, [leverId]: { level: target, ref: fin(ref) } },
    news: withNews(state.news, [headline(state, content, 'leverEnacted', state.time, def.era)]),
  };
}

function hindsightOnReckon(state: GameState, content: Content): number {
  const h = content.global.hindsight;
  const open = eraIds(content).filter((e) => state.eras[e]?.open).length;
  const steady = Object.values((state.run as RunStatsX).steadyEras ?? {}).filter(Boolean).length;
  const raw = h.perPeakWellbeing * state.run.peakWellbeing + h.perDecoupledYear * state.run.decoupledYears
    + h.perEraReached * Math.max(0, open - 1) + h.perSteadyEra * steady;
  return Math.max(1, Math.round(fin(raw)));
}

function reckon(state: GameState, content: Content): GameState {
  const fl = computeFlows(state, content);
  const cause = fl.pending?.cause ?? 'chosen';
  const hs = hindsightOnReckon(state, content);
  const summaryEras: NonNullable<MetaState['lastRun']>['eras'] = {};
  for (const e of eraIds(content)) {
    const es = state.eras[e];
    const f = fl.eras[e];
    if (!es?.open || !f) continue;
    summaryEras[e] = {
      etaFold: f.etaFold, peakRFold: es.baseR > 0 ? es.peakR / es.baseR : 1, resourceUsed: state.run.resourceUsed[e] ?? 0,
    };
  }
  const meta: MetaState = {
    ...state.meta,
    hindsight: state.meta.hindsight + hs,
    hindsightEarned: state.meta.hindsightEarned + hs,
    reckonings: state.meta.reckonings + 1,
    achievements: { ...state.meta.achievements, firstReckoning: true },
    lastRun: {
      cause, seconds: state.time, yearReached: Math.floor(START_YEAR + state.time * YEARS_PER_SECOND), hindsightGained: hs,
      peakWellbeing: state.run.peakWellbeing, eras: summaryEras,
      ...(fl.pending?.era ? { causeEra: fl.pending.era } : {}),
    },
  };
  const nextSeed = (Math.imul(state.seed >>> 0, 1103515245) + 12345) >>> 0;
  const s = createState(content, meta, nextSeed);
  return { ...s, news: withNews(s.news, [headline(s, content, 'reckoning', 0, fl.pending?.era)]) };
}

function buyKnowhow(state: GameState, content: Content, id: string): GameState {
  const def = idx(content).knowhow.get(id);
  if (!def) return state;
  const lvl = state.meta.knowhow[id] ?? 0;
  if (lvl >= def.maxLevel) return state;
  const cost = def.cost * Math.pow(def.costGrowth, lvl);
  if (!(state.meta.hindsight >= cost)) return state;
  return {
    ...state,
    meta: { ...state.meta, hindsight: state.meta.hindsight - cost, knowhow: { ...state.meta.knowhow, [id]: lvl + 1 } },
  };
}

function buyInstitution(state: GameState, content: Content, id: string): GameState {
  const def = idx(content).institutions.get(id);
  if (!def || state.meta.institutions[id]) return state;
  if (!(def.requires ?? []).every((r) => state.meta.institutions[r])) return state;
  if (!(state.meta.hindsight >= def.cost)) return state;
  let s: GameState = {
    ...state,
    meta: { ...state.meta, hindsight: state.meta.hindsight - def.cost, institutions: { ...state.meta.institutions, [id]: true } },
  };
  // mid-run effects that live in state rather than in recomputed modifiers
  for (const ef of def.effects) {
    if (ef.type === 'reveal' && !s.flags.revealed) s = { ...s, flags: { ...s.flags, revealed: true } };
    if (ef.type === 'startLever') {
      const ld = idx(content).levers.get(ef.lever);
      const cur = s.levers[ef.lever];
      if (ld && (!cur || cur.level < ef.level)) {
        s = { ...s, levers: { ...s.levers, [ef.lever]: { level: Math.min(ef.level, ld.levels.length), ref: cur?.ref ?? 0 } } };
      }
    }
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */

function simulate(state: GameState, content: Content, seconds: number, dt: number): GameState {
  let s = state;
  const n = Math.ceil(seconds / dt);
  for (let i = 0; i < n; i++) {
    const t = step(s, content, dt);
    if (t === s) break;
    s = t;
  }
  return s;
}

function upgradeViews(state: GameState, content: Content): UpgradeView[] {
  const mods = modsOf(state, content);
  let baseline: GameState | null = null;
  const out: UpgradeView[] = [];
  for (const def of content.upgrades ?? []) {
    const level = state.upgrades[def.id] ?? 0;
    const maxed = level >= upgradeMax(def);
    const cost = upgradeCost(def, level, mods);
    const visible = upgradeVisible(state, def);
    let promisedChange: number | null = null;
    let projectedChange: number | null = null;
    if (def.kind === 'efficiency') {
      let mul = 1;
      for (const ef of def.effects) if (ef.type === 'etaMul') mul *= ef.value;
      promisedChange = 1 / mul - 1;
      if (state.flags.revealed && visible && !maxed) {
        baseline ??= simulate(state, content, PROJECTION_SECONDS, PROJECTION_DT);
        const withIt = simulate(applyUpgrade(state, content, def, state.time), content, PROJECTION_SECONDS, PROJECTION_DT);
        const rWithout = computeFlows(baseline, content).eras[def.era]?.R ?? 0;
        const rWith = computeFlows(withIt, content).eras[def.era]?.R ?? 0;
        projectedChange = rWithout > 0 ? fin(rWith / rWithout - 1) : null;
      }
    }
    out.push({
      def, level, cost, visible, affordable: !maxed && state.capital >= cost, maxed, promisedChange, projectedChange,
    });
  }
  return out;
}

function leverViews(state: GameState, content: Content): LeverView[] {
  const mods = modsOf(state, content);
  return (content.levers ?? []).map((def) => {
    const level = state.levers[def.id]?.level ?? 0;
    const inst = mods.startLevers[def.id] ?? 0;
    const visible = leverVisible(state, content, def, mods);
    const nextCost = level < def.levels.length ? (level + 1 <= inst ? 0 : def.levels[level].mandateCost) : null;
    return {
      def, level, visible, nextCost,
      canRaise: visible && nextCost !== null && state.mandate >= nextCost,
      upkeep: leverNetUpkeep(def, level, inst),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

function serialize(state: GameState): string {
  return JSON.stringify(state);
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function merge(fresh: unknown, saved: unknown): unknown {
  if (saved === undefined) return fresh;
  if (fresh === undefined) {
    // field unknown to a fresh state (e.g. an upgrade id in a map): keep plain JSON values
    return saved;
  }
  if (typeof fresh === 'number') return typeof saved === 'number' && Number.isFinite(saved) ? saved : fresh;
  if (typeof fresh === 'boolean') return typeof saved === 'boolean' ? saved : fresh;
  if (typeof fresh === 'string') return typeof saved === 'string' ? saved : fresh;
  if (Array.isArray(fresh)) return Array.isArray(saved) ? saved : fresh;
  if (isObj(fresh)) {
    if (!isObj(saved)) return fresh;
    const out: Record<string, unknown> = { ...fresh };
    for (const k of Object.keys(saved)) out[k] = merge(fresh[k], saved[k]);
    return out;
  }
  return saved;
}

function deserialize(text: string, content: Content): GameState | null {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!isObj(raw) || typeof raw.time !== 'number' || !Number.isFinite(raw.time) || !isObj(raw.eras)) return null;
  try {
    const savedMeta = isObj(raw.meta) ? raw.meta : {};
    const meta = merge(freshMeta(), savedMeta) as MetaState;
    const fresh = createState(content, meta, typeof raw.seed === 'number' ? raw.seed : 1);
    // closed eras in the fresh state must not override an era the save has open, and vice versa
    const merged = merge(fresh, raw) as GameState;
    // only eras known to content
    const eras = {} as Record<EraId, EraState>;
    for (const e of ERA_ORDER) if (fresh.eras[e]) eras[e] = merged.eras[e];
    const s: GameState = {
      ...merged, version: SAVE_VERSION, eras,
      news: Array.isArray(merged.news) ? merged.news.slice(0, NEWS_MAX) : [],
      history: Array.isArray(merged.history) ? merged.history : [],
    };
    // sanity: must be computable
    const d = computeFlows(s, content);
    if (!Number.isFinite(d.wellbeing) || !Number.isFinite(s.capital)) return null;
    return s;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */

export const model: ModelApi = {
  createState, tick, fastForward, derive, click, buyUpgrade, foundApp, setLever, reckon, buyKnowhow, buyInstitution,
  upgradeViews, leverViews, hindsightOnReckon, serialize, deserialize,
};
