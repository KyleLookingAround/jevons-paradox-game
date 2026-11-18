/**
 * REBOUND — simulation core. Pure TypeScript: no DOM, no clock, no randomness.
 * Implements ModelApi from ./types (M1 contract). Never mutates the state passed in.
 */
import {
  YEARS_PER_SECOND, STEADY_STATE_YEARS, START_YEAR, SAVE_VERSION, CALENDAR_LATE_RATE, EXHAUSTED_BELOW,
  BUDGET_TOLERANCE, PROJECTION_YEARS, MAX_TICK_SECONDS,
} from './types';
import type {
  AchievementDef, AgeDef, AppDerived, AppState, BudgetState, Cond, CondCheck, Content, Derived, EffectDef, GameState,
  HeadlineKey, HindsightTerms, HistorySample, InstitutionDef, InstitutionView, KnowhowDef, KnowhowView, LeverDef,
  LeverKind, LeverLevelDef, LeverRecycle, LeverState, LeverView, MetaState, ModelApi, NewsItem, ReckoningCause,
  RunStats, RunSummary, SectorDef, SectorDerived, SectorId, SectorState, StatKey, UpgradeDef, UpgradeView,
} from './types';

/* ------------------------------------------------------------------ */
/* Constants chosen by the model                                       */
/* ------------------------------------------------------------------ */

/** Default share of treasury-routed levy revenue that becomes Mandate (GlobalParams.levy absent). */
export const DEFAULT_MANDATE_SHARE = 0.1;
/** Default budget decline per decade and decade length (GlobalParams.steady absent). */
export const DEFAULT_BUDGET_DECLINE = 0.05;
export const DEFAULT_DECADE_YEARS = 10;
/** Substituted (renewable) service costs this multiple of capCost per unit, and no resource. */
export const SUBSTITUTION_CAPCOST_MUL = 1.5;
/** A hard cap leaks by up to this share once the permit price is far above the resource price. */
export const CAP_LEAK_MAX = 0.25;
/** A cap squeezes out at most this share of the demand that is not a floor (lock-in, drawsOn). */
export const CAP_SQUEEZE_MAX = 0.95;
/** Flow sectors: price saturates here; service above this utilisation is rationed (never reaches 1). */
export const FLOW_MAX_UTILISATION = 0.98;
/** Flow sectors: effective capacity never falls below this share of nominal capacity. */
export const FLOW_MIN_CAPACITY_SHARE = 0.05;
/** Flow sectors (Code): utilisation above this starts shipping unreviewed work (defect penalty). */
export const DEFECT_UTILISATION_START = 0.8;
/** Wellbeing share lost at full unreviewed share. */
export const DEFECT_PENALTY = 0.5;
/** Time constant (s) of the smoothed resource-use average (cosmetic trend arrow). */
export const TREND_TAU = 60;
/** Rate per second at which sufficiency-lowered saturation recovers once the lever is relaxed. */
export const SUFFICIENCY_RECOVERY_RATE = 0.01;
/** Population shrinks at this fraction of the growth rate when wellbeing is below subsistence. */
export const NEGATIVE_GROWTH_STRENGTH = 0.25;
export const POP_MIN = 0.01;
/** Rebound is reported only once etaFold exceeds this. */
export const REBOUND_MIN_FOLD = 1.001;
export const HISTORY_EVERY = 5;
export const HISTORY_MAX = 240;
export const NEWS_MAX = 40;
export const FAST_FORWARD_STEP = 5;
/** Projection horizon (s) and step (s): PROJECTION_YEARS model years at dt = 5. */
export const PROJECTION_SECONDS = PROJECTION_YEARS / YEARS_PER_SECOND;
export const PROJECTION_DT = 5;
/** autoEta exponent cap (keeps η finite in very long runs). */
const AUTO_ETA_EXP_MAX = 300;
const BISECT_ITERS = 44;
/** Largest number of lever levels one setLever call may climb (guards unbounded repeat). */
const MAX_LEVEL_JUMP = 10_000;

/** Value range of each lever kind (used to bound `repeat`). */
const KIND_RANGE: Record<LeverKind, [number, number]> = {
  duty: [0, 0.999], cap: [0.05, Infinity], sufficiency: [0.05, 1], substitution: [0, 1], greenSpending: [0, 1],
  reviewGate: [0, 1], circularity: [0, 0.95], sharedLibs: [0, 0.95], deletion: [0, 0.9],
};
const ONE_OFF = new Set(['mandateAdd', 'capitalAdd', 'slotAdd']);

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const fin = (x: number, fallback = 0): number => (Number.isFinite(x) ? x : fallback);
const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function freshMeta(content: Content): MetaState {
  return {
    hindsight: 0, hindsightEarned: 0, reckonings: 0, knowhow: {}, institutions: {}, achievements: {},
    steadySectors: {}, sectorsOpened: {}, totalSeconds: 0,
    slots: content.global?.startingSlots ?? 2, loadout: [], backfiredSectors: {},
  };
}

function freshRunStats(): RunStats {
  return {
    peakWellbeing: 0, decoupledYears: 0, resourceUsed: {}, clicks: 0, steadySectors: {},
    wellbeingYears: 0, yearsAtTarget: 0, budgetDecades: 0, firstBackfires: {},
  };
}

/* ------------------------------------------------------------------ */
/* Content index (cached per content object)                           */
/* ------------------------------------------------------------------ */

interface ContentIndex {
  /** sectorOrder, restricted to ids present in content.sectors. */
  ids: SectorId[];
  pos: Map<SectorId, number>;
  /** Order in which sectors are solved: a sector before the sectors it spills into or draws on. */
  solveOrder: SectorId[];
  ageOf: Map<SectorId, AgeDef>;
  upgrades: Map<string, UpgradeDef>;
  levers: Map<string, LeverDef>;
  knowhow: Map<string, KnowhowDef>;
  institutions: Map<string, InstitutionDef>;
  achievements: Map<string, AchievementDef>;
  apps: Map<string, { sector: SectorId; idx: number }>;
  efficiencyBySector: Record<string, UpgradeDef[]>;
  leversBySector: Record<string, LeverDef[]>;
  /** Symmetric fork adjacency: id → ids it excludes or is excluded by. */
  conflicts: Map<string, string[]>;
  names: Map<string, string>;
}
const indexCache = new WeakMap<Content, ContentIndex>();
function idx(content: Content): ContentIndex {
  let ix = indexCache.get(content);
  if (ix) return ix;
  const sectors = content.sectors ?? {};
  const ids = (content.sectorOrder ?? []).filter((s, i, a) => !!sectors[s] && a.indexOf(s) === i);
  ix = {
    ids, pos: new Map(ids.map((s, i) => [s, i])), solveOrder: [], ageOf: new Map(), upgrades: new Map(),
    levers: new Map(), knowhow: new Map(), institutions: new Map(), achievements: new Map(), apps: new Map(),
    efficiencyBySector: {}, leversBySector: {}, conflicts: new Map(), names: new Map(),
  };
  for (const a of content.ages ?? []) for (const s of a.sectors ?? []) if (!ix.ageOf.has(s)) ix.ageOf.set(s, a);
  const conflict = (a: string, b: string) => {
    if (a === b) return;
    const l = ix!.conflicts.get(a) ?? [];
    if (!l.includes(b)) l.push(b);
    ix!.conflicts.set(a, l);
  };
  for (const u of content.upgrades ?? []) {
    ix.upgrades.set(u.id, u);
    ix.names.set(u.id, u.name);
    if (u.kind === 'efficiency') (ix.efficiencyBySector[u.sector] ??= []).push(u);
    for (const x of u.excludes ?? []) { conflict(u.id, x); conflict(x, u.id); }
  }
  for (const l of content.levers ?? []) {
    ix.levers.set(l.id, l);
    ix.names.set(l.id, l.name);
    (ix.leversBySector[l.sector] ??= []).push(l);
  }
  for (const k of content.knowhow ?? []) { ix.knowhow.set(k.id, k); ix.names.set(k.id, k.name); }
  for (const i of content.institutions ?? []) { ix.institutions.set(i.id, i); ix.names.set(i.id, i.name); }
  for (const a of content.achievements ?? []) { ix.achievements.set(a.id, a); ix.names.set(a.id, a.name); }
  for (const s of ids) {
    sectors[s].applications.forEach((a, i) => { ix!.apps.set(a.id, { sector: s, idx: i }); ix!.names.set(a.id, a.name); });
    ix.names.set(s, sectors[s].name);
  }
  // Solve order (Kahn): a source of spill / drawsOn is solved before its target; ties go to the later sector in
  // sectorOrder, which for v1-shaped content (spill and drawsOn point backwards) is simply the reverse order.
  const targets = (s: SectorId): SectorId[] => {
    const d = sectors[s];
    const t: SectorId[] = [];
    if (d.spill && ix!.pos.has(d.spill.to) && d.spill.to !== s) t.push(d.spill.to);
    if (d.drawsOn && ix!.pos.has(d.drawsOn.sector) && d.drawsOn.sector !== s) t.push(d.drawsOn.sector);
    return t;
  };
  const indeg = new Map(ids.map((s) => [s, 0]));
  for (const s of ids) for (const t of targets(s)) indeg.set(t, (indeg.get(t) ?? 0) + 1);
  const left = new Set(ids);
  while (left.size) {
    let pick: SectorId | null = null;
    for (let k = ids.length - 1; k >= 0; k--) if (left.has(ids[k]) && indeg.get(ids[k]) === 0) { pick = ids[k]; break; }
    if (pick === null) for (let k = ids.length - 1; k >= 0; k--) if (left.has(ids[k])) { pick = ids[k]; break; } // cycle
    left.delete(pick!);
    ix.solveOrder.push(pick!);
    for (const t of targets(pick!)) indeg.set(t, (indeg.get(t) ?? 1) - 1);
  }
  indexCache.set(content, ix);
  return ix;
}

function steadyCfg(content: Content): { decline: number; decadeYears: number; decadeEffects: EffectDef[]; first: EffectDef[] } {
  const st = content.global?.steady;
  const dy = st?.decadeYears;
  return {
    decline: fin(st?.budgetDeclinePerDecade ?? DEFAULT_BUDGET_DECLINE, DEFAULT_BUDGET_DECLINE),
    decadeYears: dy !== undefined && dy > 0 ? dy : DEFAULT_DECADE_YEARS,
    decadeEffects: st?.decadeEffects ?? [],
    first: st?.firstSteadyEffects ?? [],
  };
}
const decadeEffectsOf = (content: Content, s: SectorId): EffectDef[] =>
  content.sectors[s]?.steady?.decadeEffects ?? steadyCfg(content).decadeEffects;
const mandateShareOf = (content: Content): number => fin(content.global?.levy?.mandateShare ?? DEFAULT_MANDATE_SHARE);

/* ------------------------------------------------------------------ */
/* Modifiers (standing effects)                                        */
/* ------------------------------------------------------------------ */

interface Mods {
  etaMul: Record<string, number>;
  capMul: Record<string, number>;
  marginAdd: Record<string, number>;
  reserveAdd: Record<string, number>;
  absorptionAdd: Record<string, number>;
  satMulSector: Record<string, number>;
  satMulApp: Record<string, number>;
  halfMulSector: Record<string, number>;
  halfMulApp: Record<string, number>;
  reveal: boolean;
  startCapitalMul: number;
  mandateRateMul: number;
  costMul: number;
  popGrowthMul: number;
  wellbeingAdd: number;
  startLevers: Record<string, number>;
  unlocked: Set<string>;
}

function emptyMods(): Mods {
  return {
    etaMul: {}, capMul: {}, marginAdd: {}, reserveAdd: {}, absorptionAdd: {}, satMulSector: {}, satMulApp: {},
    halfMulSector: {}, halfMulApp: {}, reveal: false, startCapitalMul: 1, mandateRateMul: 1, costMul: 1,
    popGrowthMul: 1, wellbeingAdd: 0, startLevers: {}, unlocked: new Set(),
  };
}

const mul = (r: Record<string, number>, k: string, v: number, times: number) => { r[k] = (r[k] ?? 1) * Math.pow(v, times); };
const add = (r: Record<string, number>, k: string, v: number, times: number) => { r[k] = (r[k] ?? 0) + v * times; };

/** Standing effects only; one-off effects are fired by the code that grants them. Unknown types are ignored. */
function applyEffect(m: Mods, ef: EffectDef, times: number): void {
  if (times <= 0 || !ef) return;
  switch (ef.type) {
    case 'etaMul': mul(m.etaMul, ef.sector, ef.value, times); break;
    case 'capCostMul': mul(m.capMul, ef.sector, ef.value, times); break;
    case 'marginAdd': add(m.marginAdd, ef.sector, ef.value, times); break;
    case 'reserveAdd': add(m.reserveAdd, ef.sector, ef.value, times); break;
    case 'absorptionAdd': add(m.absorptionAdd, ef.sector, ef.value, times); break;
    case 'reveal': m.reveal = true; break;
    case 'startCapitalMul': m.startCapitalMul *= Math.pow(ef.value, times); break;
    case 'mandateRateMul': m.mandateRateMul *= Math.pow(ef.value, times); break;
    case 'costMul': m.costMul *= Math.pow(ef.value, times); break;
    case 'startLever': m.startLevers[ef.lever] = Math.max(m.startLevers[ef.lever] ?? 0, ef.level); break;
    case 'satMul': if (ef.app) mul(m.satMulApp, ef.app, ef.value, times); else mul(m.satMulSector, ef.sector, ef.value, times); break;
    case 'halfPriceMul': if (ef.app) mul(m.halfMulApp, ef.app, ef.value, times); else mul(m.halfMulSector, ef.sector, ef.value, times); break;
    case 'popGrowthMul': m.popGrowthMul *= Math.pow(ef.value, times); break;
    case 'wellbeingAdd': m.wellbeingAdd += ef.value * times; break;
    case 'unlock': m.unlocked.add(ef.id); break;
    default: break;
  }
}

/** Effects of the owned levels of an institution (level 1 = def.effects, then nextLevels). */
function institutionEffects(def: InstitutionDef, level: number): EffectDef[] {
  const out: EffectDef[] = level >= 1 ? [...def.effects] : [];
  for (let l = 2; l <= level; l++) out.push(...(def.nextLevels?.[l - 2]?.effects ?? []));
  return out;
}
const institutionMax = (def: InstitutionDef): number => 1 + (def.nextLevels?.length ?? 0);
const isSeated = (meta: MetaState, id: string): boolean =>
  (meta.institutions?.[id] ?? 0) >= 1 && (meta.loadout ?? []).includes(id);

const modsCache = new WeakMap<object, { kh: object; inst: object; loadout: object; dkey: string; content: Content; mods: Mods }>();
function computeMods(upgrades: Record<string, number>, meta: MetaState, content: Content, decades: Record<string, number>, dkey: string): Mods {
  const hit = modsCache.get(upgrades);
  if (hit && hit.kh === meta.knowhow && hit.inst === meta.institutions && hit.loadout === meta.loadout && hit.dkey === dkey
    && hit.content === content) return hit.mods;
  const ix = idx(content);
  const m = emptyMods();
  for (const id in upgrades) {
    const u = ix.upgrades.get(id);
    const lvl = upgrades[id] ?? 0;
    if (u && lvl > 0) for (const ef of u.effects) applyEffect(m, ef, lvl);
  }
  for (const id in meta.knowhow ?? {}) {
    const k = ix.knowhow.get(id);
    const lvl = meta.knowhow[id] ?? 0;
    if (k && lvl > 0) for (const ef of k.effects) applyEffect(m, ef, lvl);
  }
  for (const id of meta.loadout ?? []) {
    const i = ix.institutions.get(id);
    const lvl = Math.min(meta.institutions?.[id] ?? 0, i ? institutionMax(i) : 0);
    if (i && lvl > 0) for (const ef of institutionEffects(i, lvl)) applyEffect(m, ef, 1);
  }
  for (const s in decades) {
    const n = decades[s];
    if (n > 0) for (const ef of decadeEffectsOf(content, s)) applyEffect(m, ef, n);
  }
  modsCache.set(upgrades, { kh: meta.knowhow, inst: meta.institutions, loadout: meta.loadout, dkey, content, mods: m });
  return m;
}
function modsOf(s: GameState, c: Content): Mods {
  const decades: Record<string, number> = {};
  let dkey = '';
  for (const id of idx(c).ids) {
    const n = s.sectors[id]?.decadesWithin?.length ?? 0;
    if (n > 0) { decades[id] = n; dkey += `${id}:${n},`; }
  }
  return computeMods(s.upgrades, s.meta, c, decades, dkey);
}

function staticEta(def: SectorDef, mods: Mods): number {
  return def.baseEta * (mods.etaMul[def.id] ?? 1);
}
function etaAt(def: SectorDef, mods: Mods, openFor: number): number {
  const auto = def.autoEtaRate > 0 ? Math.exp(Math.min(AUTO_ETA_EXP_MAX, def.autoEtaRate * openFor)) : 1;
  return staticEta(def, mods) * auto;
}
function flowCapacity(def: SectorDef, mods: Mods): number {
  return Math.max(0, def.reserve * (1 + (mods.reserveAdd[def.id] ?? 0)));
}

/* ------------------------------------------------------------------ */
/* Levers: level resolution (repeat) and per-sector aggregation        */
/* ------------------------------------------------------------------ */

const leverMaxCache = new WeakMap<LeverDef, number>();
/** Highest reachable level: authored levels plus repeat steps while the value stays in the kind's range. */
export function leverMaxLevel(def: LeverDef): number {
  const hit = leverMaxCache.get(def);
  if (hit !== undefined) return hit;
  const L = def.levels?.length ?? 0;
  let max = L;
  const r = def.repeat;
  if (r && L > 0) {
    const last = def.levels[L - 1];
    const [lo, hi] = KIND_RANGE[def.kind] ?? [-Infinity, Infinity];
    const step = fin(r.valueStep);
    let k: number;
    if (step > 0) k = hi === Infinity ? Infinity : Math.floor((hi - last.value) / step + 1e-9);
    else if (step < 0) k = lo === -Infinity ? Infinity : Math.floor((last.value - lo) / -step + 1e-9);
    else k = Infinity;
    if (r.maxSteps !== undefined && r.maxSteps >= 0) k = Math.min(k, Math.floor(r.maxSteps));
    max = L + Math.max(0, k);
  }
  leverMaxCache.set(def, max);
  return max;
}

/** Resolved definition of a level (synthesised for repeat levels); null at 0 or beyond maxLevel. */
export function leverLevelDef(def: LeverDef, level: number): LeverLevelDef | null {
  const L = def.levels?.length ?? 0;
  if (!(level >= 1) || level > leverMaxLevel(def)) return null;
  if (level <= L) return def.levels[level - 1];
  const r = def.repeat!;
  const last = def.levels[L - 1];
  const k = level - L;
  const value = last.value + k * r.valueStep;
  const out: LeverLevelDef = {
    mandateCost: last.mandateCost * Math.pow(r.costGrowth, k),
    mandateUpkeep: last.mandateUpkeep * Math.pow(r.upkeepGrowth, k),
    value,
    label: r.label !== undefined
      ? r.label.replace(/\{pct\}/g, String(Math.round(value * 100))).replace(/\{value\}/g, value.toFixed(2)).replace(/\{n\}/g, String(level))
      : `${last.label} +${k}`,
  };
  if (last.value2 !== undefined) out.value2 = last.value2 + (r.value2Step !== undefined ? k * r.value2Step : 0);
  return out;
}

const recycleOptions = (def: LeverDef): LeverRecycle[] =>
  def.kind === 'duty' || def.kind === 'cap' ? (def.recycle && def.recycle.length ? def.recycle : ['treasury']) : [];
const recycleOf = (def: LeverDef, ls: LeverState | undefined): LeverRecycle | null => {
  const opts = recycleOptions(def);
  if (!opts.length) return null;
  return ls?.recycle && opts.includes(ls.recycle) ? ls.recycle : opts[0];
};

interface SectorLevers {
  dutyS: number; dutyRef: number; dutyRecycle: LeverRecycle | null;
  capFrac: number; leakAbove: number; capRecycle: LeverRecycle | null;
  sufTarget: number; sufRate: number;
  subShare: number; subCap: number;
  circ: number; green: number;
  delShare: number; delRate: number;
  review: number; libs: number;
}
function noLevers(): SectorLevers {
  return {
    dutyS: 0, dutyRef: 0, dutyRecycle: null, capFrac: Infinity, leakAbove: Infinity, capRecycle: null, sufTarget: 1,
    sufRate: 0, subShare: 0, subCap: 0, circ: 0, green: 0, delShare: 0, delRate: 0, review: 0, libs: 0,
  };
}
const NO_LEVERS = noLevers();

const leverCache = new WeakMap<object, { content: Content; bySector: Record<string, SectorLevers> }>();
function sectorLevers(state: GameState, content: Content): Record<string, SectorLevers> {
  const hit = leverCache.get(state.levers);
  if (hit && hit.content === content) return hit.bySector;
  const bySector: Record<string, SectorLevers> = {};
  for (const def of content.levers ?? []) {
    const ls = state.levers[def.id];
    const L = ls ? leverLevelDef(def, ls.level) : null;
    if (!ls || !L) continue;
    const v = fin(L.value), v2 = L.value2;
    const a = (bySector[def.sector] ??= noLevers());
    switch (def.kind) {
      case 'duty':
        if (ls.ref > 0 && v > a.dutyS) { a.dutyS = clamp(v, 0, 0.999); a.dutyRef = ls.ref; a.dutyRecycle = recycleOf(def, ls); }
        break;
      case 'cap': {
        const f = Math.max(0, v);
        if (f < a.capFrac) { a.capFrac = f; a.leakAbove = v2 !== undefined && v2 > 0 ? v2 : Infinity; a.capRecycle = recycleOf(def, ls); }
        break;
      }
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
      default: break;
    }
  }
  leverCache.set(state.levers, { content, bySector });
  return bySector;
}

function leverNetUpkeep(def: LeverDef, level: number, instLevel: number): number {
  if (level <= 0) return 0;
  const full = leverLevelDef(def, level)?.mandateUpkeep ?? 0;
  const free = instLevel > 0 ? leverLevelDef(def, Math.min(instLevel, level))?.mandateUpkeep ?? 0 : 0;
  return Math.max(0, fin(full - free));
}

/* ------------------------------------------------------------------ */
/* Budget line                                                         */
/* ------------------------------------------------------------------ */

/** M1 balance: the line declines until held (Steady State reached on it), never below floor × r0. */
function budgetROf(es: SectorState | undefined, def: SectorDef, content: Content, time: number): number | null {
  const b = es?.budget;
  if (!b) return null;
  const d = def.steady?.declinePerDecade ?? steadyCfg(content).decline;
  const floor = clamp(fin(def.steady?.budgetFloor ?? content.global?.steady?.budgetFloor ?? 0), 0, 1);
  const until = b.heldAt !== undefined && Number.isFinite(b.heldAt) ? Math.min(time, b.heldAt) : time;
  return fin(Math.max(floor * b.r0, b.r0 * Math.pow(Math.max(0, 1 - d), ((until - b.since) * YEARS_PER_SECOND) / 10)));
}
const standingDrawYearsOf = (def: SectorDef, content: Content): number =>
  Math.max(0, fin(def.steady?.standingDrawYears ?? content.global?.steady?.standingDrawYears ?? 0));
const isWithin = (R: number, budgetR: number | null): boolean => budgetR !== null && R <= budgetR * (1 + BUDGET_TOLERANCE);

/* ------------------------------------------------------------------ */
/* The sector solver: price/demand fixed point                         */
/* ------------------------------------------------------------------ */

interface SectorFlow {
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
}

// scratch outputs for supply()
let sSigma = 0, sR = 0, sPrBase = 0, sPre = 0, sPermitPart = 0, sDutyPart = 0, sCust = 0;

function solveSector(
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
  let treasury = 0, dividend = 0;
  if (lev.dutyRecycle === 'treasury') treasury += dutyRevenue; else if (lev.dutyRecycle === 'dividend') dividend += dutyRevenue;
  if (lev.capRecycle === 'treasury') treasury += permitRevenue; else if (lev.capRecycle === 'dividend') dividend += permitRevenue;
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
    income: fin(income), dutyRevenue: fin(dutyRevenue), permitRevenue: fin(permitRevenue), treasuryLevy: fin(treasury),
    capacity, usable: fin(usable), util: fin(util), unrev,
    appD, appSat, reserveGain: fin(reserveGain), pressureIn: fin(pressureIn), deletionOut: fin(deletionOut),
    wellbeingShare: fin(wb),
  };
}

/* ------------------------------------------------------------------ */
/* Whole-state flows (cached per state object)                         */
/* ------------------------------------------------------------------ */

interface Flows {
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
}

function pendingOf(state: GameState, content: Content): { cause: ReckoningCause; sector?: SectorId } | null {
  const ids = idx(content).ids;
  for (const s of ids) {
    const es = state.sectors[s];
    if (es?.open && content.sectors[s].resourceKind === 'stock' && es.reserve <= EXHAUSTED_BELOW * es.reserveMax) return { cause: 'exhausted', sector: s };
  }
  for (const s of ids) {
    const es = state.sectors[s];
    const def = content.sectors[s];
    if (es?.open && def.collapseAt > 0 && es.pressure >= def.collapseAt) return { cause: 'collapse', sector: s };
  }
  return null;
}

const flowsCache = new WeakMap<GameState, { content: Content; flows: Flows }>();
function computeFlows(state: GameState, content: Content): Flows {
  const hit = flowsCache.get(state);
  if (hit && hit.content === content) return hit.flows;
  const ix = idx(content);
  const mods = modsOf(state, content);
  const levs = sectorLevers(state, content);
  const N = Math.max(POP_MIN, fin(state.population, 1));
  const spill: Record<string, number> = {};
  const extra: Record<string, number> = {};
  const sectors: Record<SectorId, SectorFlow> = {};
  const inputs: Flows['inputs'] = {};
  let wellbeing = 0, income = 0, levy = 0, treasury = 0;
  for (const s of ix.solveOrder) {
    const es = state.sectors[s];
    if (!es || !es.open) continue;
    const def = content.sectors[s];
    const lev = levs[s] ?? NO_LEVERS;
    let capR = Infinity;
    if (Number.isFinite(lev.capFrac)) {
      const b = budgetROf(es, def, content, state.time);
      if (b !== null) capR = lev.capFrac * b;
    }
    const inp = { extraD: extra[s] ?? 0, spillMul: spill[s] ?? 1, capR };
    const f = solveSector(def, es, N, mods, lev, inp.extraD, inp.spillMul, capR);
    sectors[s] = f;
    inputs[s] = inp;
    wellbeing += f.wellbeingShare;
    income += f.income;
    levy += f.dutyRevenue + f.permitRevenue;
    treasury += f.treasuryLevy;
    if (def.spill && state.sectors[def.spill.to]?.open && es.basePs > 0) {
      const a = def.spill.rate * (1 - lev.green) * Math.max(0, 1 - f.ps / es.basePs);
      spill[def.spill.to] = (spill[def.spill.to] ?? 1) * (1 + Math.max(0, a));
    }
    if (def.drawsOn && state.sectors[def.drawsOn.sector]?.open) {
      extra[def.drawsOn.sector] = (extra[def.drawsOn.sector] ?? 0) + Math.max(0, def.drawsOn.perService * f.D);
    }
  }
  wellbeing = Math.max(0, fin(wellbeing + mods.wellbeingAdd));
  const g = content.global;
  const mandateGain = g.mandateRate * Math.max(0, wellbeing - g.mandateFloor) * mods.mandateRateMul + mandateShareOf(content) * treasury;
  let upkeep = 0;
  for (const def of content.levers ?? []) {
    const ls = state.levers[def.id];
    if (ls && ls.level > 0) upkeep += leverNetUpkeep(def, ls.level, mods.startLevers[def.id] ?? 0);
  }
  const flows: Flows = {
    sectors, inputs, wellbeing, income: fin(income), levyRevenue: fin(levy), treasuryLevy: fin(treasury),
    mandateGain: fin(mandateGain), upkeep: fin(upkeep), pending: pendingOf(state, content),
  };
  flowsCache.set(state, { content, flows });
  return flows;
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
function instruments(state: GameState, content: Content, fl: Flows, s: SectorId): Instruments {
  const es = state.sectors[s];
  const f = fl.sectors[s];
  if (!es || !f || !(es.baseR > 0)) return { shadowR: 0, promisedR: 0, rebound: null, frontierFold: 1 };
  const sh = shadowR(state, content, fl, s);
  const promised = f.etaFold > 0 ? sh / f.etaFold : 0;
  const rebound = f.etaFold > REBOUND_MIN_FOLD && sh > 0 && sh - promised > 1e-9 * sh
    ? fin((f.R - promised) / (sh - promised)) : null;
  return { shadowR: sh, promisedR: fin(promised), rebound, frontierFold: fin(sh / es.baseR, 1) };
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

function calendarYear(state: { time: number; sectors: Record<SectorId, SectorState> }, content: Content): number {
  let best = -Infinity;
  for (const age of content.ages ?? []) {
    let T = -1, sMax = -Infinity;
    for (const s of age.sectors ?? []) {
      const es = state.sectors[s];
      const def = content.sectors?.[s];
      if (!es?.open || !def) continue;
      T = Math.max(T, es.openFor);
      sMax = Math.max(sMax, (def.firstYear ?? age.yearSpan[0]) + es.openFor * YEARS_PER_SECOND);
    }
    if (T < 0) continue;
    let y = Math.max(age.yearSpan[0] + T * YEARS_PER_SECOND, sMax);
    if (y > age.yearSpan[1]) y = age.yearSpan[1] + (y - age.yearSpan[1]) * CALENDAR_LATE_RATE;
    if (y > best) best = y;
  }
  return Number.isFinite(best) ? best : START_YEAR + state.time * YEARS_PER_SECOND;
}

function currentAge(state: GameState, content: Content): AgeDef | null {
  const ages = content.ages ?? [];
  for (let i = ages.length - 1; i >= 0; i--) if ((ages[i].sectors ?? []).some((s) => state.sectors[s]?.open)) return ages[i];
  return null;
}

/* ------------------------------------------------------------------ */
/* Headlines                                                           */
/* ------------------------------------------------------------------ */

const FALLBACK: Record<HeadlineKey, string> = {
  appFounded: '{app} founded', appAvailable: '{app} now within reach', sectorOpened: 'A new industry: {sector}',
  crisis: 'Crisis in {sector}', collapse: '{sector} collapses', exhausted: '{resource} exhausted',
  backfire: 'Efficiency backfires in {sector}', reveal: 'The rebound revealed', leverEnacted: 'New measure enacted',
  leverLapsed: 'Measure lapses for want of mandate', steadySector: '{sector} reaches a steady state',
  steadyAll: 'A steady state, at last', reckoning: 'The Reckoning', efficiency: 'Engines thriftier than ever',
  ageBegins: '{age} begins', budgetDrawn: 'A budget for {resource}', decade: 'A decade within budget for {sector}',
  budgetBroken: '{sector} breaks its budget',
};

/** Common-noun placeholders: lower-cased mid-sentence (see Content.headlines). */
const COMMON_NOUNS = new Set(['app', 'resource', 'service']);
/** True when `before` ends where a sentence starts: nothing yet, or . ! ? and a space (opening quotes allowed). */
const atSentenceStart = (before: string): boolean => /(^|[.!?]\s+)[\s“‘"'(]*$/.test(before);
/** Lower-case the first letter of a common noun, unless it opens with an acronym ("AI models", "GPU time"). */
function lowerFirst(name: string): string {
  if (name.length < 2 || /^\p{Lu}[\p{Lu}\d]/u.test(name)) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}
/** Placeholder substitution, case-aware (M1 balance fix): "demand for coal", "Coal runs dry", "welcome to the Coal Age". */
export function substitute(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string, offset: number) => {
    const v = values[key];
    if (v === undefined) return whole;
    if (atSentenceStart(text.slice(0, offset))) return v;
    if (COMMON_NOUNS.has(key)) return lowerFirst(v);
    if (key === 'age') return v.replace(/^The\b/, 'the');
    return v;
  });
}

interface HeadlineCtx { year: number; app?: string; n?: number }
function headline(state: GameState, content: Content, key: HeadlineKey, time: number, ctx: HeadlineCtx, sector?: SectorId): NewsItem {
  const own = sector ? content.sectorHeadlines?.[sector]?.[key] : undefined;
  const variants = own && own.length ? own : content.headlines?.[key];
  const n = (state.seed >>> 0) + Math.floor(time * 7) + state.news.length + key.length;
  let text = variants && variants.length ? variants[n % variants.length] : FALLBACK[key] ?? key;
  const def = sector ? content.sectors[sector] : undefined;
  const age = sector ? idx(content).ageOf.get(sector) ?? currentAge(state, content) : currentAge(state, content);
  const year = Math.floor(ctx.year);
  text = substitute(text, {
    sector: def?.name ?? '', era: def?.name ?? '', age: age?.name ?? '', app: ctx.app ?? '',
    resource: def?.resource.name ?? '', service: def?.service.name ?? '', year: String(year),
    n: ctx.n !== undefined ? String(ctx.n) : '',
  });
  const item: NewsItem = { time, year, key, text };
  if (sector) item.sector = sector;
  return item;
}

function withNews(news: NewsItem[], items: NewsItem[]): NewsItem[] {
  if (!items.length) return news;
  const out = items.slice().reverse().concat(news);
  return out.length > NEWS_MAX ? out.slice(0, NEWS_MAX) : out;
}

/* ------------------------------------------------------------------ */
/* Conditions                                                          */
/* ------------------------------------------------------------------ */

function reserveFractionOf(def: SectorDef, es: SectorState, f: SectorFlow): number {
  return def.resourceKind === 'stock'
    ? (es.reserveMax > 0 ? clamp(es.reserve / es.reserveMax, 0, 1) : 0)
    : clamp(1 - f.util, 0, 1);
}

/** The value a stat leaf reads (null when the scope is closed, absent or the value is null). */
export function statValue(state: GameState, content: Content, cond: { stat: StatKey; sector?: SectorId; app?: string }): number | null {
  const fl = computeFlows(state, content);
  switch (cond.stat) {
    case 'time': return state.time;
    case 'year': return calendarYear(state, content);
    case 'wellbeing': return fl.wellbeing;
    case 'population': return state.population;
    case 'capital': return state.capital;
    case 'mandate': return state.mandate;
    case 'reckonings': return state.meta.reckonings;
    case 'steadyYearsAll': return state.steadyYearsAll;
    case 'clicks': return state.run.clicks;
    case 'adoption': case 'appDemand': {
      const loc = cond.app ? idx(content).apps.get(cond.app) : undefined;
      const f = loc ? fl.sectors[loc.sector] : undefined;
      if (!loc || !f || !state.sectors[loc.sector]?.open) return null;
      const d = f.appD[loc.idx] ?? 0, sat = f.appSat[loc.idx] ?? 0;
      return cond.stat === 'appDemand' ? d : sat > 0 ? clamp(d / sat, 0, 1) : 0;
    }
    default: break;
  }
  const s = cond.sector;
  const def = s ? content.sectors?.[s] : undefined;
  const es = s ? state.sectors[s] : undefined;
  const f = s ? fl.sectors[s] : undefined;
  if (!s || !def || !es?.open || !f) return null;
  switch (cond.stat) {
    case 'etaFold': return f.etaFold;
    case 'rFold': return es.baseR > 0 ? f.R / es.baseR : 1;
    case 'frontierFold': return instruments(state, content, fl, s).frontierFold;
    case 'peakRFold': return es.baseR > 0 ? es.peakR / es.baseR : 1;
    case 'rebound': return instruments(state, content, fl, s).rebound;
    case 'resourceUse': return f.R;
    case 'demand': return f.D;
    case 'servicePrice': return f.ps;
    case 'serviceDelivered': return es.serviceDelivered;
    case 'reserveFraction': return reserveFractionOf(def, es, f);
    case 'pressureFraction': return def.collapseAt > 0 ? Math.max(0, es.pressure / def.collapseAt) : 0;
    case 'crises': return es.crisesFired;
    case 'steadyYears': return es.steadyYears;
    case 'budgetDecades': return es.decadesWithin.length;
    case 'withinBudget': return isWithin(f.R, budgetROf(es, def, content, state.time)) ? 1 : 0;
    case 'appsFounded': return def.applications.filter((a) => es.apps[a.id]?.founded).length;
    default: return null;
  }
}

function ownsId(state: GameState, content: Content, id: string): boolean {
  const ix = idx(content);
  if (ix.upgrades.has(id)) return (state.upgrades[id] ?? 0) >= 1;
  const loc = ix.apps.get(id);
  if (loc) return !!state.sectors[loc.sector]?.apps[id]?.founded;
  if (ix.levers.has(id)) return (state.levers[id]?.level ?? 0) >= 1;
  if (ix.institutions.has(id)) return (state.meta.institutions[id] ?? 0) >= 1;
  if (ix.knowhow.has(id)) return (state.meta.knowhow[id] ?? 0) >= 1;
  if (ix.achievements.has(id)) return state.meta.achievements[id] === true;
  return false;
}

function cmp(v: number, op: string, x: number): boolean {
  switch (op) {
    case '<': return v < x;
    case '<=': return v <= x;
    case '>': return v > x;
    case '>=': return v >= x;
    default: return false;
  }
}

/** Evaluate a Cond against a state (pure; the same flows as derive). Unknown stats and leaf shapes are false. */
export function evalCond(state: GameState, content: Content, cond: Cond): boolean {
  if (!isObj(cond)) return false;
  const c = cond as Record<string, unknown>;
  if ('stat' in c) {
    const v = statValue(state, content, cond as { stat: StatKey; sector?: SectorId; app?: string });
    return v !== null && typeof c.value === 'number' && cmp(v, c.op as string, c.value);
  }
  if ('owns' in c) return typeof c.owns === 'string' && ownsId(state, content, c.owns);
  if ('flag' in c) return (state.flags as unknown as Record<string, unknown>)[c.flag as string] === true;
  if ('all' in c) return Array.isArray(c.all) && (c.all as Cond[]).every((x) => evalCond(state, content, x));
  if ('any' in c) return Array.isArray(c.any) && (c.any as Cond[]).some((x) => evalCond(state, content, x));
  if ('not' in c) return isObj(c.not) && !evalCond(state, content, c.not as Cond);
  return false;
}

const STAT_WORDS: Record<StatKey, string> = {
  time: 'time played (s)', year: 'year', wellbeing: 'wellbeing', population: 'population', capital: 'capital',
  mandate: 'Mandate', reckonings: 'Reckonings', steadyYearsAll: 'years of steady state', clicks: 'clicks',
  etaFold: 'efficiency gain', rFold: 'resource use fold', frontierFold: 'frontier growth', peakRFold: 'peak resource use fold',
  rebound: 'rebound', resourceUse: 'resource use', demand: 'demand', servicePrice: 'service price',
  serviceDelivered: 'service delivered', reserveFraction: 'reserve left', pressureFraction: 'pressure',
  crises: 'crises', steadyYears: 'years within budget', budgetDecades: 'decades within budget',
  withinBudget: 'within budget', appsFounded: 'applications founded', adoption: 'adoption', appDemand: 'demand',
};
const OP_SYM: Record<string, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' };
function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return String(x);
  const a = Math.abs(x);
  const trim = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : String(Math.round(v * 10) / 10));
  if (a >= 1e9) return `${trim(x / 1e9)}G`;
  if (a >= 1e6) return `${trim(x / 1e6)}M`;
  if (a >= 1e3) return `${trim(x / 1e3)}k`;
  return String(Math.round(x * 1000) / 1000);
}

function condLabel(content: Content, cond: Cond): string {
  if (cond.label) return cond.label;
  const ix = idx(content);
  const c = cond as Record<string, unknown>;
  if ('stat' in c) {
    const stat = c.stat as StatKey;
    const scope = typeof c.app === 'string' ? ix.names.get(c.app) ?? c.app
      : typeof c.sector === 'string' ? ix.names.get(c.sector) ?? c.sector : '';
    return `${scope ? `${scope} ` : ''}${STAT_WORDS[stat] ?? String(stat)} ${OP_SYM[c.op as string] ?? c.op} ${fmtNum(c.value as number)}`;
  }
  if ('owns' in c) return `Own ${ix.names.get(c.owns as string) ?? c.owns}`;
  if ('flag' in c) return c.flag === 'revealed' ? 'The rebound revealed' : c.flag === 'won' ? 'Steady State won' : `${c.flag}`;
  if ('all' in c) return 'All of these';
  if ('any' in c) return 'Any of these';
  if ('not' in c && isObj(c.not)) return `Not: ${condLabel(content, c.not as Cond)}`;
  return 'Unknown condition';
}

function condCheck(state: GameState, content: Content, cond: Cond): CondCheck {
  const met = evalCond(state, content, cond);
  let progress: number | null;
  const c = cond as Record<string, unknown>;
  if ('stat' in c) {
    const v = statValue(state, content, cond as { stat: StatKey; sector?: SectorId; app?: string });
    const x = c.value as number;
    if (met) progress = 1;
    else if (v === null || !Number.isFinite(v)) progress = 0;
    else if (c.op === '>' || c.op === '>=') progress = x > 0 ? clamp(v / x, 0, 1) : 0;
    else progress = v > 0 ? clamp(x / v, 0, 1) : 0;
  } else if ('all' in c || 'any' in c || 'not' in c) progress = null;
  else progress = met ? 1 : 0;
  return { label: condLabel(content, cond), met, progress };
}

/* ------------------------------------------------------------------ */
/* Unlocks                                                             */
/* ------------------------------------------------------------------ */

function afterOf(content: Content, s: SectorId): SectorId[] {
  const ix = idx(content);
  const k = ix.pos.get(s) ?? 0;
  return content.sectors[s].unlock?.after ?? (k > 0 ? [ix.ids[k - 1]] : []);
}

/** Legacy price gate on the default predecessor. */
function legacyGate(state: GameState, content: Content, s: SectorId): { met: boolean; now: number; need: number; pred: SectorId } | null {
  const u = content.sectors[s].unlock;
  if (!u || u.when || u.prevServicePriceBelow === undefined) return null;
  const ix = idx(content);
  const pred = ix.ids[(ix.pos.get(s) ?? 0) - 1];
  const f = pred ? computeFlows(state, content).sectors[pred] : undefined;
  const now = f ? f.ps : Infinity;
  return { met: !!f && now < u.prevServicePriceBelow, now, need: u.prevServicePriceBelow, pred };
}

function canOpen(state: GameState, content: Content, s: SectorId): boolean {
  const ix = idx(content);
  if ((ix.pos.get(s) ?? 0) === 0) return true;
  if (!afterOf(content, s).every((a) => !!state.sectors[a]?.open)) return false;
  const u = content.sectors[s].unlock;
  if (!u) return true;
  if (state.meta.reckonings < (u.minReckonings ?? 0)) return false;
  if (u.when) return evalCond(state, content, u.when);
  const lg = legacyGate(state, content, s);
  return lg ? lg.met : true;
}

/* ------------------------------------------------------------------ */
/* State construction                                                  */
/* ------------------------------------------------------------------ */

function freshSector(def: SectorDef, mods: Mods, open: boolean): SectorState {
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

function snapshotBase(es: SectorState, f: SectorFlow): SectorState {
  if (es.baseR > 0 || !(f.D > 0) || !(f.R > 0)) return es;
  return { ...es, baseR: f.R, baseD: f.D, basePs: f.ps, etaAtBase: f.eta, smoothR: f.R, peakR: Math.max(es.peakR, f.R) };
}

function historySample(state: GameState, content: Content, flows: Flows): HistorySample {
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

/* ------------------------------------------------------------------ */
/* One-off effects                                                     */
/* ------------------------------------------------------------------ */

interface OneOffs { capital: number; mandate: number; slots: number }
/** Fire the one-off effects of a list (`times` times); capitalAdd is measured in seconds of `income`. */
function fireOneOffs(effects: EffectDef[], times: number, income: number, acc: OneOffs): void {
  for (const ef of effects) {
    if (!ONE_OFF.has(ef.type)) continue;
    const v = fin((ef as { value: number }).value) * times;
    if (ef.type === 'capitalAdd') acc.capital += v * Math.max(0, income);
    else if (ef.type === 'mandateAdd') acc.mandate += v;
    else if (ef.type === 'slotAdd') acc.slots += v;
  }
}

/* ------------------------------------------------------------------ */
/* Tick                                                                */
/* ------------------------------------------------------------------ */

function popGrowthRate(W: number, content: Content, mods: Mods): number {
  const g = content.global;
  const x = W - g.subsistence;
  let growth = g.popGrowth * mods.popGrowthMul * x;
  if (x < 0) return growth * NEGATIVE_GROWTH_STRENGTH;
  const Wt = g.demography?.transitionWellbeing;
  if (Wt !== undefined && Wt > g.subsistence) growth *= Math.max(0, 1 - (x / (Wt - g.subsistence)) ** 2);
  return fin(growth);
}

function upgradeExcludedBy(state: GameState, content: Content, id: string): string | null {
  for (const o of idx(content).conflicts.get(id) ?? []) if ((state.upgrades[o] ?? 0) >= 1) return o;
  return null;
}

function jevonsSet(state: GameState, content: Content, s: SectorId, mods: Mods): UpgradeDef[] {
  return (idx(content).efficiencyBySector[s] ?? []).filter((u) =>
    (!u.locked || mods.unlocked.has(u.id)) && ((state.upgrades[u.id] ?? 0) >= 1 || !upgradeExcludedBy(state, content, u.id)));
}

function step(state: GameState, content: Content, dt: number, lite = false): GameState {
  if (!(dt > 0)) return state;
  const fl = computeFlows(state, content);
  if (fl.pending) return state;
  const g = content.global;
  const ix = idx(content);
  const mods = modsOf(state, content);
  const levs = sectorLevers(state, content);
  const sc = steadyCfg(content);
  const time = state.time + dt;
  const dy = dt * YEARS_PER_SECOND;
  const W = fl.wellbeing;
  const year = calendarYear(state, content);
  const hc: HeadlineCtx = { year };
  const secondTick = !lite && (dt >= 1 || Math.floor(time) !== Math.floor(state.time));
  const items: NewsItem[] = [];
  let ach = state.meta.achievements;
  const grant = (id: string) => { if (!ach[id]) ach = { ...ach, [id]: true }; };
  let runSteady = state.run.steadySectors;
  let metaSteady = state.meta.steadySectors;
  let backfiredSectors = state.meta.backfiredSectors;
  let firstBackfires = state.run.firstBackfires;
  let budgetDecades = state.run.budgetDecades;
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  const reserveAdds: { sector: SectorId; value: number }[] = [];
  let revealNow = false;
  const resourceUsed = { ...state.run.resourceUsed };
  let crisisCount = 0;
  let anyDecoupling = false;
  let allDecoupling = true;
  let levers = state.levers;
  const sectors = { ...state.sectors };
  const tmp = { ...state, time };

  for (const s of ix.ids) {
    const es0 = state.sectors[s];
    const f = fl.sectors[s];
    if (!es0?.open || !f) continue;
    const def = content.sectors[s];
    const lev = levs[s] ?? NO_LEVERS;
    let es: SectorState = { ...es0 };
    es.openFor = es0.openFor + dt;
    es.eta = etaAt(def, mods, es.openFor);

    // applications
    const apps: Record<string, AppState> = { ...es0.apps };
    def.applications.forEach((a, i) => {
      const st = apps[a.id] ?? { available: false, founded: false, satMul: 1, peakD: 0 };
      const d = f.appD[i];
      let changed = !apps[a.id];
      const ns = { ...st };
      if (d > ns.peakD) { ns.peakD = d; changed = true; }
      const target = lev.sufTarget;
      if (ns.satMul > target + 1e-12) {
        ns.satMul = Math.max(target, ns.satMul - (ns.satMul - target) * (1 - Math.exp(-lev.sufRate * dt)));
        changed = true;
      } else if (ns.satMul < target - 1e-12) {
        ns.satMul = Math.min(target, ns.satMul + (target - ns.satMul) * (1 - Math.exp(-SUFFICIENCY_RECOVERY_RATE * dt)));
        changed = true;
      }
      if (!ns.available && f.ps <= a.visibleBelow) {
        ns.available = true; changed = true;
        if (a.foundCost <= 0) {
          ns.founded = true;
          items.push(headline(tmp, content, 'appFounded', time, { ...hc, app: a.name }, s));
        } else items.push(headline(tmp, content, 'appAvailable', time, { ...hc, app: a.name }, s));
      }
      if (changed) apps[a.id] = ns;
    });
    es.apps = apps;

    // resource
    if (def.resourceKind === 'stock') {
      es.reserve = Math.max(0, es0.reserve - f.R * (1 - lev.circ) * dt + f.reserveGain * dt);
      es.reserveMax = es0.reserveMax + f.reserveGain * dt;
      if (es.reserve <= EXHAUSTED_BELOW * es.reserveMax) items.push(headline(tmp, content, 'exhausted', time, hc, s));
    } else {
      es.reserve = es.reserveMax = f.capacity;
    }
    resourceUsed[s] = (resourceUsed[s] ?? 0) + f.R * dt;
    es.serviceDelivered = (es0.serviceDelivered ?? 0) + f.D * dy;

    // pressure
    const absorption = Math.max(0, def.absorption + (mods.absorptionAdd[s] ?? 0));
    es.pressure = Math.max(0, fin(es0.pressure * Math.exp(-absorption * dt) + (f.pressureIn - f.deletionOut) * dt));
    while (es.crisesFired < def.crisisAt.length && def.collapseAt > 0 && es.pressure >= def.crisisAt[es.crisesFired] * def.collapseAt) {
      es.crisesFired++;
      crisisCount++;
      items.push(headline(tmp, content, 'crisis', time, { ...hc, n: es.crisesFired }, s));
    }
    if (def.collapseAt > 0 && es.pressure >= def.collapseAt) items.push(headline(tmp, content, 'collapse', time, hc, s));

    // baseline, trend, peaks
    if (es.baseR <= 0) {
      es = snapshotBase(es, f);
      es.trendR = 0;
    } else {
      const old = es0.smoothR > 0 ? es0.smoothR : f.R;
      const sm = old + (f.R - old) * (1 - Math.exp(-dt / TREND_TAU));
      es.smoothR = fin(sm);
      es.trendR = old > 0 ? fin((sm - old) / old / dy) : 0;
    }
    es.peakR = Math.max(es.peakR, f.R);

    // backfire (direct rebound against the shadow), checked about once a real second
    if (secondTick && !es0.backfired && es0.baseR > 0) {
      const rb = instruments(state, content, fl, s).rebound;
      if (rb !== null && rb > 1) {
        es.backfired = true;
        items.push(headline(tmp, content, 'backfire', time, hc, s));
        grant('backfire');
        if (!backfiredSectors[s]) {
          backfiredSectors = { ...backfiredSectors, [s]: true };
          firstBackfires = { ...firstBackfires, [s]: true };
        }
      }
    }
    // Jevons was right
    if (es.baseR > 0 && es.peakR / es.baseR >= 10 && !ach.jevonsWasRight) {
      const effs = jevonsSet(state, content, s, mods);
      if (effs.length && effs.every((u) => (state.upgrades[u.id] ?? 0) > 0)) grant('jevonsWasRight');
    }

    // budget auto-draw for an active cap
    if (Number.isFinite(lev.capFrac) && !es0.budget && f.D > 0 && f.R > 0
      && es0.openFor * YEARS_PER_SECOND >= standingDrawYearsOf(def, content) - 1e-9) {
      es.budget = { r0: f.R, since: state.time, drawnYear: Math.floor(year) };
      items.push(headline(tmp, content, 'budgetDrawn', time, hc, s));
    }

    // decoupling streak, decades, Steady State
    const decoupling = isWithin(f.R, budgetROf(es0, def, content, state.time)) && W >= g.wellbeingTarget;
    if (decoupling) {
      anyDecoupling = true;
      const before = es0.steadyYears;
      const after = before + dy;
      es.steadyYears = after;
      const DY = sc.decadeYears;
      const crossed = Math.floor(after / DY + 1e-9) - Math.floor(before / DY + 1e-9);
      if (crossed > 0) {
        const effs = decadeEffectsOf(content, s);
        for (let k = 0; k < crossed; k++) {
          es.decadesWithin = [...es.decadesWithin, Math.floor(year)];
          budgetDecades++;
          fireOneOffs(effs, 1, fl.income, one);
          for (const ef of effs) {
            if (ef.type === 'reserveAdd') reserveAdds.push({ sector: ef.sector, value: ef.value });
            else if (ef.type === 'reveal') revealNow = true;
          }
          items.push(headline(tmp, content, 'decade', time, { ...hc, n: es.decadesWithin.length }, s));
        }
      }
      if (before < STEADY_STATE_YEARS && after >= STEADY_STATE_YEARS) {
        // M1 balance: Steady State earned on this line holds it level from now on.
        if (es.budget && es.budget.heldAt === undefined) es.budget = { ...es.budget, heldAt: state.time };
        if (!runSteady[s]) {
          runSteady = { ...runSteady, [s]: true };
          grant('steadyState');
          items.push(headline(tmp, content, 'steadySector', time, hc, s));
        }
        if (!metaSteady[s]) {
          metaSteady = { ...metaSteady, [s]: true };
          fireOneOffs(sc.first, 1, fl.income, one);
        }
      }
    } else {
      if (es0.steadyYears >= sc.decadeYears - 1e-9) items.push(headline(tmp, content, 'budgetBroken', time, hc, s));
      es.steadyYears = 0;
      allDecoupling = false;
    }
    // degrowth by accident
    if (state.population < 0.6 * state.peakPopulation && es.trendR < 0 && W < g.wellbeingTarget) grant('degrowthByAccident');
    // duty ref snapshots (standing levers, or enacted before demand existed)
    if (f.D > 0) {
      for (const ld of ix.leversBySector[s] ?? []) {
        if (ld.kind !== 'duty') continue;
        const ls = levers[ld.id];
        if (ls && ls.level > 0 && !(ls.ref > 0)) {
          const ref = f.pPre + f.permitPart;
          if (ref > 0) {
            if (levers === state.levers) levers = { ...levers };
            levers[ld.id] = { ...ls, ref };
          }
        }
      }
    }
    sectors[s] = es;
  }
  // decade rewards of reserveAdd act like a purchase
  for (const ra of reserveAdds) {
    const d = content.sectors[ra.sector];
    const es = sectors[ra.sector];
    if (d && es?.open && d.resourceKind === 'stock') {
      const a = ra.value * d.reserve;
      sectors[ra.sector] = { ...es, reserve: es.reserve + a, reserveMax: es.reserveMax + a };
    }
  }

  // population
  const growth = popGrowthRate(W, content, mods);
  let population = state.population * Math.exp(clamp(growth * dt, -50, 50));
  if (crisisCount) population *= Math.pow(1 - g.crisisPopLoss, crisisCount);
  population = Math.max(POP_MIN, fin(population, POP_MIN));

  // mandate & lapse
  let mandate = state.mandate + (fl.mandateGain - fl.upkeep) * dt + crisisCount * g.crisisMandate + one.mandate;
  if (mandate <= 0) {
    mandate = 0;
    // Drop the costliest-upkeep lever one level, repeatedly, until upkeep is covered (independent of tick length).
    let upkeep = fl.upkeep;
    for (let guard = 0; upkeep > fl.mandateGain + 1e-12 && guard < 1000; guard++) {
      let worst: LeverDef | null = null, worstUp = 0;
      for (const ld of content.levers ?? []) {
        const ls = levers[ld.id];
        if (!ls || ls.level <= 0) continue;
        const up = leverNetUpkeep(ld, ls.level, mods.startLevers[ld.id] ?? 0);
        if (up > worstUp) { worstUp = up; worst = ld; }
      }
      if (!worst) break;
      const ls = levers[worst.id];
      if (levers === state.levers) levers = { ...levers };
      const lvl = ls.level - 1;
      levers[worst.id] = { ...ls, level: lvl, ref: lvl > 0 ? ls.ref : 0 };
      upkeep += leverNetUpkeep(worst, lvl, mods.startLevers[worst.id] ?? 0) - worstUp;
      items.push(headline(tmp, content, 'leverLapsed', time, hc, worst.sector));
    }
  }
  mandate = fin(mandate);

  // sector openings (conditions read the state at the start of the step, as Derived.nextSectors does)
  const opened: SectorId[] = [];
  let sectorsOpened = state.meta.sectorsOpened;
  for (let k = 1; k < ix.ids.length; k++) {
    const s = ix.ids[k];
    if (state.sectors[s]?.open || !canOpen(state, content, s)) continue;
    const def = content.sectors[s];
    sectors[s] = freshSector(def, mods, true);
    const age = ix.ageOf.get(s);
    const ageNew = !!age && !(age.sectors ?? []).some((o) => state.sectors[o]?.open || opened.includes(o));
    opened.push(s);
    if (!sectorsOpened[s]) sectorsOpened = { ...sectorsOpened, [s]: true };
    items.push(headline(tmp, content, 'sectorOpened', time, hc, s));
    if (ageNew) items.push(headline(tmp, content, 'ageBegins', time, hc, s));
  }

  // Steady State across the board
  const allOpen = ix.ids.every((s) => sectors[s]?.open);
  let steadyYearsAll = state.steadyYearsAll;
  let flags = state.flags;
  if (revealNow && !flags.revealed) flags = { ...flags, revealed: true };
  if (allDecoupling && anyDecoupling && opened.length === 0) {
    steadyYearsAll += dy;
    if (allOpen && steadyYearsAll >= STEADY_STATE_YEARS && !flags.won) {
      flags = { ...flags, won: true };
      items.push(headline(tmp, content, 'steadyAll', time, hc));
    }
  } else steadyYearsAll = 0;

  // achievements with `when` (about once a real second)
  if (secondTick) {
    for (const a of content.achievements ?? []) if (a.when && !ach[a.id] && evalCond(state, content, a.when)) grant(a.id);
  }

  const run: RunStats = {
    ...state.run,
    peakWellbeing: Math.max(state.run.peakWellbeing, W),
    decoupledYears: state.run.decoupledYears + (anyDecoupling ? dy : 0),
    resourceUsed,
    steadySectors: runSteady,
    wellbeingYears: (state.run.wellbeingYears ?? 0) + Math.max(0, W - g.subsistence) * dy,
    yearsAtTarget: (state.run.yearsAtTarget ?? 0) + (W >= g.wellbeingTarget ? dy : 0),
    budgetDecades,
    firstBackfires,
  };
  const meta: MetaState = {
    ...state.meta,
    totalSeconds: state.meta.totalSeconds + dt,
    sectorsOpened,
    achievements: ach,
    steadySectors: metaSteady,
    backfiredSectors,
    slots: state.meta.slots + one.slots,
  };

  let next: GameState = {
    ...state, time, capital: fin(state.capital + fl.income * dt + one.capital), mandate, population,
    peakPopulation: Math.max(state.peakPopulation, population), sectors, levers, flags, steadyYearsAll, run, meta,
    news: withNews(state.news, items),
  };
  // A newly opened sector records its baseline now, before the player can buy anything for it.
  if (opened.length) {
    const fo = computeFlows(next, content);
    const s2 = { ...next.sectors };
    for (const s of opened) {
      const f = fo.sectors[s];
      if (f) s2[s] = snapshotBase(s2[s], f);
    }
    next = { ...next, sectors: s2 };
  }
  if (!lite && Math.floor(time / HISTORY_EVERY) > Math.floor(state.time / HISTORY_EVERY)) {
    next = { ...next, history: pushHistory(state.history, historySample(next, content, computeFlows(next, content))) };
  }
  return next;
}

function tick(state: GameState, content: Content, dt: number): GameState {
  if (!(dt > 0) || Number.isNaN(dt)) return state;
  const total = Math.min(dt, MAX_TICK_SECONDS);
  const n = Math.ceil(total);
  const h = total / n;
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
/* Hindsight                                                           */
/* ------------------------------------------------------------------ */

function hindsightTerms(state: GameState, content: Content): HindsightTerms {
  const h = content.global.hindsight;
  const ids = idx(content).ids;
  const run = state.run;
  let burn = 0, open = 0, openTime = 0, unburnt = 0;
  for (const s of ids) {
    const es = state.sectors[s];
    if (!es?.open) continue;
    open++;
    if (es.baseR > 0 && es.openFor > 0) { burn += (run.resourceUsed[s] ?? 0) / es.baseR; openTime += es.openFor; }
    if (content.sectors[s].resourceKind === 'stock' && es.reserveMax > 0) unburnt += clamp(es.reserve / es.reserveMax, 0, 1);
  }
  const intensity = openTime > 0 ? fin(burn / openTime, 1) : 1;
  const wy = fin(run.wellbeingYears ?? 0);
  const count = (r: Record<string, boolean> | undefined) => Object.values(r ?? {}).filter((x) => x === true).length;
  const terms = {
    wellbeing: fin(h.perWellbeingYear * wy / Math.pow(Math.max(1, intensity), h.intensityExponent)),
    budget: fin(h.perBudgetDecade * (run.budgetDecades ?? 0)),
    unburnt: fin(h.perUnburnt * unburnt * Math.min(1, (run.yearsAtTarget ?? 0) / STEADY_STATE_YEARS)),
    backfire: fin(h.perFirstBackfire * count(run.firstBackfires)),
    sectorsReached: fin(h.perSectorReached * Math.max(0, open - 1)),
    steady: fin(h.perSteadySector * count(run.steadySectors)),
  };
  const sum = terms.wellbeing + terms.budget + terms.unburnt + terms.backfire + terms.sectorsReached + terms.steady;
  return { wellbeingYears: wy, intensity, ...terms, total: Math.max(1, Math.round(fin(sum))) };
}

function hindsightOnReckon(state: GameState, content: Content): number {
  return hindsightTerms(state, content).total;
}

/* ------------------------------------------------------------------ */
/* Derive                                                              */
/* ------------------------------------------------------------------ */

const isFreshRun = (state: GameState): boolean =>
  state.time === 0 && !Object.values(state.upgrades).some((l) => (l ?? 0) > 0);

function slotsUsed(meta: MetaState, content: Content): number {
  const ix = idx(content);
  let used = 0;
  for (const id of meta.loadout ?? []) {
    const d = ix.institutions.get(id);
    if (d && (meta.institutions[id] ?? 0) >= 1) used += d.slots ?? 1;
  }
  return used;
}

function nextSectorsOf(state: GameState, content: Content): Derived['nextSectors'] {
  const ix = idx(content);
  const out: Derived['nextSectors'] = [];
  for (let k = 1; k < ix.ids.length; k++) {
    const s = ix.ids[k];
    if (state.sectors[s]?.open) continue;
    if (!afterOf(content, s).every((a) => !!state.sectors[a]?.open)) continue;
    const u = content.sectors[s].unlock;
    const need = u?.minReckonings ?? 0;
    let checklist: CondCheck[] = [];
    if (u?.when) {
      const w = u.when as Record<string, unknown>;
      checklist = 'all' in w && Array.isArray(w.all) ? (w.all as Cond[]).map((c) => condCheck(state, content, c)) : [condCheck(state, content, u.when)];
    } else {
      const lg = legacyGate(state, content, s);
      if (lg) {
        checklist = [{
          label: `${content.sectors[lg.pred]?.name ?? lg.pred} service price < ${fmtNum(lg.need)}`, met: lg.met,
          progress: lg.met ? 1 : lg.now > 0 && Number.isFinite(lg.now) ? clamp(lg.need / lg.now, 0, 1) : 0,
        }];
      }
    }
    out.push({ id: s, reckoningsNeeded: need, reckoningsHave: state.meta.reckonings, checklist, ready: canOpen(state, content, s) });
  }
  return out;
}

function derive(state: GameState, content: Content): Derived {
  const fl = computeFlows(state, content);
  const g = content.global;
  const ix = idx(content);
  const levs = sectorLevers(state, content);
  const mods = modsOf(state, content);
  const sectors: Record<SectorId, SectorDerived> = {};
  for (const s of ix.ids) {
    const f = fl.sectors[s];
    const es = state.sectors[s];
    if (!f || !es) continue;
    const def = content.sectors[s];
    const lev = levs[s] ?? NO_LEVERS;
    const ins = instruments(state, content, fl, s);
    const apps: Record<string, AppDerived> = {};
    def.applications.forEach((a, i) => {
      const st = es.apps[a.id];
      const sat = f.appSat[i];
      apps[a.id] = {
        available: !!st?.available, founded: !!st?.founded, demand: f.appD[i],
        adoption: sat > 0 ? clamp(f.appD[i] / sat, 0, 1) : 0,
        canFound: !!st?.available && !st.founded && state.capital >= a.foundCost && !fl.pending,
      };
    });
    let secondsLeft = Infinity;
    if (def.resourceKind === 'stock') {
      const drain = f.R * (1 - lev.circ) - f.reserveGain;
      if (drain > 0) secondsLeft = Math.max(0, es.reserve - EXHAUSTED_BELOW * es.reserveMax) / drain;
    }
    const budgetR = budgetROf(es, def, content, state.time);
    const withinBudget = isWithin(f.R, budgetR);
    sectors[s] = {
      eta: f.eta, etaFold: f.etaFold, resourcePrice: f.pr, resourcePriceBase: f.prBase, permitPrice: f.permit,
      capCost: f.c, margin: f.m, substitutedShare: f.sigma, preLevyPrice: f.pPre, permitPart: f.permitPart,
      dutyPart: f.dutyPart, servicePrice: f.ps, demand: f.D, resourceUse: f.R,
      rFold: es.baseR > 0 ? fin(f.R / es.baseR, 1) : 1,
      shadowR: ins.shadowR, promisedR: ins.promisedR, rebound: ins.rebound, frontierFold: ins.frontierFold,
      income: f.income, levyRevenue: f.dutyRevenue + f.permitRevenue,
      reserveFraction: reserveFractionOf(def, es, f), secondsLeft,
      pressureFraction: def.collapseAt > 0 ? Math.max(0, es.pressure / def.collapseAt) : 0,
      nextCrisisFraction: es.crisesFired < def.crisisAt.length ? def.crisisAt[es.crisesFired] : null,
      trendR: es.trendR, budgetR, withinBudget,
      decoupling: withinBudget && fl.wellbeing >= g.wellbeingTarget && !fl.pending,
      steadyYears: es.steadyYears, budgetDecades: es.decadesWithin.length, wellbeingShare: f.wellbeingShare, apps,
    };
  }
  const terms = hindsightTerms(state, content);
  return {
    year: calendarYear(state, content),
    age: currentAge(state, content)?.id ?? null,
    wellbeing: fl.wellbeing,
    incomePerSec: fl.income,
    clickValue: fl.pending ? 0 : fin(g.clickFlat + g.clickSeconds * fl.income),
    mandatePerSec: fl.mandateGain - fl.upkeep,
    populationGrowthPerSec: popGrowthRate(fl.wellbeing, content, mods) * state.population,
    pendingReckoning: fl.pending,
    hindsightIfReckonNow: terms.total,
    hindsightTerms: terms,
    sectors,
    nextSectors: nextSectorsOf(state, content),
    freshRun: isFreshRun(state),
    slots: { total: state.meta.slots, used: slotsUsed(state.meta, content) },
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
function upgradeVisible(state: GameState, def: UpgradeDef, mods: Mods): boolean {
  return !!state.sectors[def.sector]?.open && (def.requires ?? []).every((r) => (state.upgrades[r] ?? 0) > 0)
    && (!def.locked || mods.unlocked.has(def.id));
}

/** Applies an upgrade (one level) without charging for it. One-off effects fire. */
function applyUpgrade(state: GameState, content: Content, def: UpgradeDef, time: number): GameState {
  const level = state.upgrades[def.id] ?? 0;
  const upgrades = { ...state.upgrades, [def.id]: level + 1 };
  const draft = { ...state, upgrades };
  const mods = modsOf(draft, content);
  const items: NewsItem[] = [];
  const sectors = { ...state.sectors };
  let flags = state.flags;
  const year = calendarYear(state, content);
  for (const s of idx(content).ids) {
    const es = sectors[s];
    if (es?.open) sectors[s] = { ...es, eta: etaAt(content.sectors[s], mods, es.openFor) };
  }
  for (const ef of def.effects) {
    if (ef.type === 'reserveAdd') {
      const sd = content.sectors[ef.sector];
      const es = sectors[ef.sector];
      if (sd && es?.open && sd.resourceKind === 'stock') {
        const a = ef.value * sd.reserve;
        sectors[ef.sector] = { ...es, reserve: es.reserve + a, reserveMax: es.reserveMax + a };
      } else if (sd && es?.open) {
        const cap = flowCapacity(sd, mods);
        sectors[ef.sector] = { ...es, reserve: cap, reserveMax: cap };
      }
    } else if (ef.type === 'reveal' && !flags.revealed) {
      flags = { ...flags, revealed: true };
      items.push(headline(state, content, 'reveal', time, { year }, def.sector));
    }
  }
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  fireOneOffs(def.effects, 1, computeFlows(state, content).income, one);
  if (def.kind === 'efficiency') items.push(headline(state, content, 'efficiency', time, { year }, def.sector));
  return {
    ...state, upgrades, sectors, flags, news: withNews(state.news, items),
    capital: state.capital + one.capital, mandate: state.mandate + one.mandate,
    meta: one.slots ? { ...state.meta, slots: state.meta.slots + one.slots } : state.meta,
  };
}

function buyUpgrade(state: GameState, content: Content, upgradeId: string): GameState {
  const def = idx(content).upgrades.get(upgradeId);
  if (!def || computeFlows(state, content).pending) return state;
  const level = state.upgrades[def.id] ?? 0;
  const mods = modsOf(state, content);
  if (level >= upgradeMax(def) || !upgradeVisible(state, def, mods) || upgradeExcludedBy(state, content, def.id)) return state;
  const cost = upgradeCost(def, level, mods);
  if (!(state.capital >= cost)) return state;
  const s = applyUpgrade(state, content, def, state.time);
  return { ...s, capital: s.capital - cost };
}

function foundApp(state: GameState, content: Content, appId: string): GameState {
  const loc = idx(content).apps.get(appId);
  if (!loc) return state;
  const es = state.sectors[loc.sector];
  const def = content.sectors[loc.sector].applications[loc.idx];
  const st = es?.apps[appId];
  if (!es?.open || !st || !st.available || st.founded || !(state.capital >= def.foundCost)) return state;
  if (computeFlows(state, content).pending) return state;
  const sectors = { ...state.sectors, [loc.sector]: { ...es, apps: { ...es.apps, [appId]: { ...st, founded: true } } } };
  return {
    ...state, capital: state.capital - def.foundCost, sectors,
    news: withNews(state.news, [headline(state, content, 'appFounded', state.time, { year: calendarYear(state, content), app: def.name }, loc.sector)]),
  };
}

function leverVisible(state: GameState, content: Content, def: LeverDef, mods: Mods): boolean {
  if (!state.sectors[def.sector]?.open) return false;
  if (def.locked && !mods.unlocked.has(def.id)) return false;
  const inst = (mods.startLevers[def.id] ?? 0) > 0;
  if (!state.flags.revealed && !inst) return false;
  const ix = idx(content);
  return (def.requires ?? []).every((r) =>
    r === 'revealed' ? state.flags.revealed
      : ix.upgrades.has(r) ? (state.upgrades[r] ?? 0) > 0
        : ix.institutions.has(r) ? isSeated(state.meta, r)
          : true);
}

function drawBudgetAt(state: GameState, content: Content, s: SectorId, R: number, items: NewsItem[]): Record<SectorId, SectorState> {
  const es = state.sectors[s];
  const year = calendarYear(state, content);
  const budget: BudgetState = { r0: R, since: state.time, drawnYear: Math.floor(year) };
  items.push(headline(state, content, 'budgetDrawn', state.time, { year }, s));
  return { ...state.sectors, [s]: { ...es, budget, steadyYears: es.budget ? 0 : es.steadyYears } };
}

function setLever(state: GameState, content: Content, leverId: string, level: number): GameState {
  const def = idx(content).levers.get(leverId);
  if (!def || !Number.isFinite(level)) return state;
  const target = Math.round(level);
  if (target < 0 || target > leverMaxLevel(def)) return state;
  const mods = modsOf(state, content);
  if (!leverVisible(state, content, def, mods)) return state;
  const cur = state.levers[leverId] ?? { level: 0, ref: 0 };
  if (target === cur.level) return state;
  const fl = computeFlows(state, content);
  if (fl.pending) return state;
  if (target < cur.level) {
    return { ...state, levers: { ...state.levers, [leverId]: { ...cur, level: target, ref: target > 0 ? cur.ref : 0 } } };
  }
  if (target - cur.level > MAX_LEVEL_JUMP) return state;
  const inst = mods.startLevers[leverId] ?? 0;
  let cost = 0;
  for (let l = cur.level + 1; l <= target; l++) if (l > inst) cost += leverLevelDef(def, l)?.mandateCost ?? 0;
  if (!(state.mandate >= cost)) return state;
  const f = fl.sectors[def.sector];
  let ref = cur.ref;
  if (cur.level === 0 || !(ref > 0)) ref = def.kind === 'duty' && f && f.D > 0 ? f.pPre + f.permitPart : 0;
  const items: NewsItem[] = [];
  let sectors = state.sectors;
  if (!state.sectors[def.sector]?.budget && f && f.R > 0) sectors = drawBudgetAt(state, content, def.sector, f.R, items);
  items.push(headline(state, content, 'leverEnacted', state.time, { year: calendarYear(state, content) }, def.sector));
  return {
    ...state, mandate: state.mandate - cost, sectors,
    levers: { ...state.levers, [leverId]: { ...cur, level: target, ref: fin(ref) } },
    news: withNews(state.news, items),
  };
}

function setLeverRecycle(state: GameState, content: Content, leverId: string, option: LeverRecycle): GameState {
  const def = idx(content).levers.get(leverId);
  if (!def || !recycleOptions(def).includes(option)) return state;
  const cur = state.levers[leverId] ?? { level: 0, ref: 0 };
  if (recycleOf(def, cur) === option && cur.recycle === option) return state;
  return { ...state, levers: { ...state.levers, [leverId]: { ...cur, recycle: option } } };
}

function drawBudget(state: GameState, content: Content, sector: SectorId): GameState {
  if (!state.flags.revealed || !state.sectors[sector]?.open) return state;
  const fl = computeFlows(state, content);
  const f = fl.sectors[sector];
  if (fl.pending || !f || !(f.R > 0)) return state;
  const items: NewsItem[] = [];
  const sectors = drawBudgetAt(state, content, sector, f.R, items);
  return { ...state, sectors, news: withNews(state.news, items) };
}

function reckon(state: GameState, content: Content): GameState {
  const fl = computeFlows(state, content);
  const cause = fl.pending?.cause ?? 'chosen';
  const terms = hindsightTerms(state, content);
  const hs = terms.total;
  const summary: RunSummary['sectors'] = {};
  for (const s of idx(content).ids) {
    const es = state.sectors[s];
    const f = fl.sectors[s];
    if (!es?.open || !f) continue;
    summary[s] = {
      etaFold: f.etaFold, peakRFold: es.baseR > 0 ? es.peakR / es.baseR : 1, resourceUsed: state.run.resourceUsed[s] ?? 0,
      decades: es.decadesWithin.length,
    };
    if (content.sectors[s].resourceKind === 'stock') summary[s].unburnt = es.reserveMax > 0 ? clamp(es.reserve / es.reserveMax, 0, 1) : 0;
  }
  const meta: MetaState = {
    ...state.meta,
    hindsight: state.meta.hindsight + hs,
    hindsightEarned: state.meta.hindsightEarned + hs,
    reckonings: state.meta.reckonings + 1,
    achievements: { ...state.meta.achievements, firstReckoning: true },
    lastRun: {
      cause, seconds: state.time, yearReached: Math.floor(calendarYear(state, content)), hindsightGained: hs,
      peakWellbeing: state.run.peakWellbeing, sectors: summary, hindsightTerms: terms,
      ...(fl.pending?.sector ? { causeSector: fl.pending.sector } : {}),
    },
  };
  const nextSeed = (Math.imul(state.seed >>> 0, 1103515245) + 12345) >>> 0;
  const s = createState(content, meta, nextSeed);
  return { ...s, news: withNews(s.news, [headline(s, content, 'reckoning', 0, { year: calendarYear(s, content) }, fl.pending?.sector)]) };
}

/**
 * Hindsight is spent only while the run is untouched (Derived.freshRun). Start-of-run effects live in state, so the
 * run is rebuilt from the new meta, keeping its news, Mandate, clicks and any capital clicked in the meantime.
 */
function withMeta(state: GameState, content: Content, meta: MetaState): GameState {
  const before = createState(content, state.meta, state.seed);
  const fresh = createState(content, meta, state.seed);
  return {
    ...fresh, capital: fresh.capital + Math.max(0, state.capital - before.capital), mandate: state.mandate,
    run: { ...fresh.run, clicks: state.run.clicks }, news: state.news,
  };
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

function buyKnowhow(state: GameState, content: Content, id: string): GameState {
  const def = idx(content).knowhow.get(id);
  if (!def || !isFreshRun(state)) return state;
  const lvl = state.meta.knowhow[id] ?? 0;
  if (lvl >= def.maxLevel) return state;
  const gate = knowhowGate(state.meta, content, def);
  if (!gate.req || gate.excludedBy) return state;
  const cost = knowhowCost(def, lvl);
  if (!(state.meta.hindsight >= cost)) return state;
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  fireOneOffs(def.effects, 1, computeFlows(state, content).income, one);
  const s = withMeta(state, content, {
    ...state.meta, hindsight: state.meta.hindsight - cost, knowhow: { ...state.meta.knowhow, [id]: lvl + 1 },
    slots: state.meta.slots + one.slots,
  });
  if (!one.capital && !one.mandate) return s;
  const inc = computeFlows(s, content).income;
  const one2: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  fireOneOffs(def.effects, 1, inc, one2);
  return { ...s, capital: s.capital + one2.capital, mandate: s.mandate + one2.mandate };
}

const institutionCost = (def: InstitutionDef, level: number): number | null =>
  level >= institutionMax(def) ? null : level === 0 ? def.cost : def.nextLevels![level - 1].cost;

function buyInstitution(state: GameState, content: Content, id: string): GameState {
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

function setLoadout(state: GameState, content: Content, ids: string[]): GameState {
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

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */

function simulate(state: GameState, content: Content, seconds: number, dt: number): GameState {
  let s = state;
  const n = Math.ceil(seconds / dt - 1e-9);
  for (let i = 0; i < n; i++) {
    const t = step(s, content, dt, true);
    if (t === s) break;
    s = t;
  }
  return s;
}

interface Projection { projectedDecade: number | null; bringsWithinReach: { appId: string; projectedChange: number }[] }
const projCache = new WeakMap<object, { t: number; meta: object; levers: object; sig: string; content: Content; res: Map<string, Projection>; base: GameState | null }>();

function foundedSig(state: GameState, content: Content): string {
  let sig = '';
  for (const s of idx(content).ids) {
    const es = state.sectors[s];
    if (!es?.open) continue;
    sig += s;
    for (const a of content.sectors[s].applications) sig += es.apps[a.id]?.founded ? '1' : es.apps[a.id]?.available ? 'a' : '0';
  }
  return sig;
}

function projectionFor(state: GameState, content: Content, def: UpgradeDef): Projection {
  const t = Math.round(state.time);
  const sig = foundedSig(state, content);
  let entry = projCache.get(state.upgrades);
  if (!entry || entry.t !== t || entry.meta !== state.meta || entry.levers !== state.levers || entry.sig !== sig || entry.content !== content) {
    entry = { t, meta: state.meta, levers: state.levers, sig, content, res: new Map(), base: null };
    projCache.set(state.upgrades, entry);
  }
  const hit = entry.res.get(def.id);
  if (hit) return hit;
  entry.base ??= simulate(state, content, PROJECTION_SECONDS, PROJECTION_DT);
  const without = entry.base;
  const withIt = simulate(applyUpgrade(state, content, def, state.time), content, PROJECTION_SECONDS, PROJECTION_DT);
  const fw = computeFlows(withIt, content);
  const rWithout = computeFlows(without, content).sectors[def.sector]?.R ?? 0;
  const rWith = fw.sectors[def.sector]?.R ?? 0;
  const projectedDecade = rWithout > 0 ? fin(rWith / rWithout - 1) : null;
  const bring: Projection['bringsWithinReach'] = [];
  if (projectedDecade !== null) {
    const sd = content.sectors[def.sector];
    const esNow = state.sectors[def.sector];
    const esW = withIt.sectors[def.sector];
    const esO = without.sectors[def.sector];
    const cands = sd.applications
      .filter((a) => !esNow?.apps[a.id]?.available && esW?.apps[a.id]?.available && !esO?.apps[a.id]?.available)
      .sort((a, b) => b.visibleBelow - a.visibleBelow);
    for (const a of cands) {
      const founded: GameState = {
        ...withIt,
        sectors: { ...withIt.sectors, [def.sector]: { ...esW, apps: { ...esW.apps, [a.id]: { ...esW.apps[a.id], available: true, founded: true } } } },
      };
      const r1 = computeFlows(founded, content).sectors[def.sector]?.R ?? 0;
      bring.push({ appId: a.id, projectedChange: rWith > 0 ? fin(r1 / rWith - 1) : 0 });
    }
  }
  const out: Projection = { projectedDecade, bringsWithinReach: bring };
  entry.res.set(def.id, out);
  return out;
}

function upgradeViews(state: GameState, content: Content): UpgradeView[] {
  const mods = modsOf(state, content);
  const out: UpgradeView[] = [];
  for (const def of content.upgrades ?? []) {
    const level = state.upgrades[def.id] ?? 0;
    const maxed = level >= upgradeMax(def);
    const cost = upgradeCost(def, level, mods);
    const visible = upgradeVisible(state, def, mods);
    const excludedBy = level >= 1 ? null : upgradeExcludedBy(state, content, def.id);
    let promisedChange: number | null = null;
    if (def.kind === 'efficiency') {
      let m = 1;
      for (const ef of def.effects) if (ef.type === 'etaMul') m *= ef.value;
      promisedChange = 1 / m - 1;
    }
    let proj: Projection = { projectedDecade: null, bringsWithinReach: [] };
    if ((def.kind === 'efficiency' || def.kind === 'capital') && state.flags.revealed && visible && !maxed && !excludedBy) {
      proj = projectionFor(state, content, def);
    }
    out.push({
      def, level, cost, visible, affordable: visible && !maxed && !excludedBy && state.capital >= cost, maxed, excludedBy,
      promisedChange, projectedDecade: proj.projectedDecade, bringsWithinReach: proj.bringsWithinReach,
    });
  }
  return out;
}

function leverViews(state: GameState, content: Content): LeverView[] {
  const mods = modsOf(state, content);
  return (content.levers ?? []).map((def) => {
    const ls = state.levers[def.id];
    const level = ls?.level ?? 0;
    const inst = mods.startLevers[def.id] ?? 0;
    const visible = leverVisible(state, content, def, mods);
    const maxLevel = leverMaxLevel(def);
    const next = level < maxLevel ? leverLevelDef(def, level + 1) : null;
    const nextCost = next ? (level + 1 <= inst ? 0 : next.mandateCost) : null;
    return {
      def, level, maxLevel, current: leverLevelDef(def, level), next, visible, nextCost,
      canRaise: visible && nextCost !== null && state.mandate >= nextCost,
      upkeep: leverNetUpkeep(def, level, inst),
      recycleOptions: recycleOptions(def), recycle: recycleOf(def, ls),
    };
  });
}

function knowhowViews(state: GameState, content: Content): KnowhowView[] {
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

function institutionViews(state: GameState, content: Content): InstitutionView[] {
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
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

function serialize(state: GameState): string {
  return JSON.stringify(state);
}

function merge(fresh: unknown, saved: unknown): unknown {
  if (saved === undefined) return fresh;
  if (fresh === undefined || fresh === null) return saved; // e.g. an id in a map, or budget: null
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

/** Map-valued fields whose keys a fresh state does not list: merge() cannot type-check their values, so do it here. */
function levelMap(x: unknown, maxOf: (id: string) => number | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 1) continue;
    const max = maxOf(k);
    out[k] = Math.floor(max === undefined ? v : Math.min(v, max));
  }
  return out;
}
function trueMap(x: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (isObj(x)) for (const [k, v] of Object.entries(x)) if (v === true) out[k] = true;
  return out;
}
function amountMap(x: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (isObj(x)) for (const [k, v] of Object.entries(x)) if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v;
  return out;
}
const numOr = (x: unknown, d: number): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);

/** v1 → v2 (types.ts SAVE_VERSION). Works on a JSON copy; returns the v2-shaped raw object. */
function migrateV1(raw: Record<string, unknown>, content: Content): Record<string, unknown> {
  const ix = idx(content);
  const r: Record<string, unknown> = JSON.parse(JSON.stringify(raw));
  const sectors = isObj(r.eras) ? r.eras : {};
  delete r.eras;
  r.sectors = sectors;
  if (Array.isArray(r.history)) {
    r.history = r.history.map((h) => {
      if (!isObj(h)) return h;
      const { eras, ...rest } = h;
      return { ...rest, sectors: isObj(eras) ? eras : {} };
    });
  }
  if (Array.isArray(r.news)) {
    r.news = r.news.map((n) => {
      if (!isObj(n)) return n;
      const { era, ...rest } = n;
      return typeof era === 'string' ? { ...rest, sector: era } : rest;
    });
  }
  const meta: Record<string, unknown> = isObj(r.meta) ? r.meta : {};
  r.meta = meta;
  if (isObj(meta.lastRun)) {
    const { eras, causeEra, ...rest } = meta.lastRun;
    meta.lastRun = { ...rest, sectors: isObj(eras) ? eras : {}, ...(typeof causeEra === 'string' ? { causeSector: causeEra } : {}) };
  }
  meta.steadySectors = trueMap(meta.steadyEras);
  delete meta.steadyEras;
  const furthest = Math.max(1, Math.floor(numOr(meta.furthestEra, 1)));
  meta.sectorsOpened = Object.fromEntries(ix.ids.slice(0, furthest).map((s) => [s, true]));
  delete meta.furthestEra;
  const owned: Record<string, number> = {};
  if (isObj(meta.institutions)) for (const [k, v] of Object.entries(meta.institutions)) if (v === true || (typeof v === 'number' && v >= 1)) owned[k] = 1;
  meta.institutions = owned;
  // types.ts says max(startingSlots, number owned); with multi-seat institutions that would unseat one of them, so the
  // seats cover the owned institutions' slots (identical when every institution takes one seat).
  meta.slots = Math.max(content.global?.startingSlots ?? 2,
    Object.keys(owned).reduce((a, id) => a + (ix.institutions.has(id) ? ix.institutions.get(id)!.slots ?? 1 : 1), 0));
  meta.loadout = (content.institutions ?? []).filter((i) => owned[i.id]).map((i) => i.id);
  const backfired: Record<string, boolean> = {};
  for (const [s, es] of Object.entries(sectors)) if (isObj(es) && es.backfired === true) backfired[s] = true;
  meta.backfiredSectors = backfired;
  const run: Record<string, unknown> = isObj(r.run) ? r.run : {};
  r.run = run;
  run.steadySectors = trueMap(run.steadyEras);
  delete run.steadyEras;
  run.decoupledYears = 0;
  run.wellbeingYears = 0;
  run.yearsAtTarget = 0;
  run.budgetDecades = 0;
  run.firstBackfires = {};
  r.steadyYearsAll = 0;
  const levers = isObj(r.levers) ? r.levers : {};
  const time = numOr(r.time, 0);
  for (const [s, es] of Object.entries(sectors)) {
    if (!isObj(es)) continue;
    const def = content.sectors?.[s];
    const baseR = numOr(es.baseR, 0), baseD = numOr(es.baseD, 0);
    es.etaAtBase = numOr(es.etaAtBase, 0) > 0 ? es.etaAtBase : baseR > 0 && baseD > 0 ? baseD / baseR : def?.baseEta ?? 1;
    es.serviceDelivered = 0;
    es.decadesWithin = [];
    es.steadyYears = 0;
    es.budget = null;
    if (es.open === true) {
      let ref = 0;
      for (const l of ix.leversBySector[s] ?? []) {
        const ls = levers[l.id];
        if (l.kind === 'cap' && isObj(ls) && numOr(ls.level, 0) > 0 && numOr(ls.ref, 0) > 0) ref = Math.max(ref, ls.ref as number);
      }
      if (ref > 0) es.budget = { r0: ref, since: time, drawnYear: -1 }; // year filled in once the state is built
    }
  }
  for (const [id, ls] of Object.entries(levers)) {
    const def = ix.levers.get(id);
    if (isObj(ls) && def && typeof ls.level === 'number') ls.level = clamp(Math.floor(ls.level), 0, leverMaxLevel(def));
    if (isObj(ls)) delete ls.recycle;
  }
  r.version = SAVE_VERSION;
  return r;
}

function validBudget(x: unknown): BudgetState | null {
  if (!isObj(x)) return null;
  const r0 = numOr(x.r0, NaN), since = numOr(x.since, NaN), drawnYear = numOr(x.drawnYear, NaN);
  if (!(r0 > 0) || !Number.isFinite(since) || !Number.isFinite(drawnYear)) return null;
  const heldAt = numOr(x.heldAt, NaN);
  return Number.isFinite(heldAt) ? { r0, since, drawnYear, heldAt } : { r0, since, drawnYear };
}

function deserialize(text: string, content: Content): GameState | null {
  let raw0: unknown;
  try { raw0 = JSON.parse(text); } catch { return null; }
  if (!isObj(raw0) || typeof raw0.time !== 'number' || !Number.isFinite(raw0.time)) return null;
  const version = raw0.version === undefined ? 1 : raw0.version;
  if (typeof version !== 'number' || !Number.isFinite(version) || version > SAVE_VERSION) return null;
  let raw: Record<string, unknown>;
  try {
    if (version < 2) {
      if (!isObj(raw0.eras)) return null;
      raw = migrateV1(raw0, content);
    } else {
      if (!isObj(raw0.sectors)) return null;
      raw = raw0;
    }
  } catch { return null; }
  try {
    const ix = idx(content);
    const savedMeta = isObj(raw.meta) ? raw.meta : {};
    const merged0 = merge(freshMeta(content), savedMeta) as MetaState;
    const institutions = levelMap(merged0.institutions, (id) => { const d = ix.institutions.get(id); return d ? institutionMax(d) : undefined; });
    // loadout: owned, known, distinct, within the seats
    const loadout: string[] = [];
    let used = 0;
    const slots = Math.max(0, Math.floor(numOr(merged0.slots, content.global?.startingSlots ?? 2)));
    for (const id of Array.isArray(merged0.loadout) ? merged0.loadout : []) {
      const d = typeof id === 'string' ? ix.institutions.get(id) : undefined;
      if (!d || !institutions[id] || loadout.includes(id) || used + (d.slots ?? 1) > slots) continue;
      loadout.push(id);
      used += d.slots ?? 1;
    }
    const meta: MetaState = {
      ...merged0,
      knowhow: levelMap(merged0.knowhow, (id) => ix.knowhow.get(id)?.maxLevel),
      institutions,
      achievements: trueMap(merged0.achievements),
      steadySectors: trueMap(merged0.steadySectors),
      sectorsOpened: trueMap(merged0.sectorsOpened),
      backfiredSectors: trueMap(merged0.backfiredSectors),
      slots,
      loadout,
    };
    const fresh = createState(content, meta, typeof raw.seed === 'number' ? raw.seed : 1);
    const merged = merge(fresh, { ...raw, meta: undefined }) as GameState;
    // only sectors known to content; sanitise budgets and decades
    const sectors: Record<SectorId, SectorState> = {};
    for (const s of ix.ids) {
      const es = merged.sectors[s];
      sectors[s] = {
        ...es,
        budget: validBudget(es.budget),
        decadesWithin: Array.isArray(es.decadesWithin) ? es.decadesWithin.filter((y) => typeof y === 'number' && Number.isFinite(y)) : [],
      };
    }
    const levers: Record<string, LeverState> = {};
    for (const [id, ls] of Object.entries(isObj(merged.levers) ? merged.levers : {})) {
      if (!isObj(ls) || typeof ls.level !== 'number' || typeof ls.ref !== 'number') continue;
      const def = ix.levers.get(id);
      const level = clamp(Math.floor(fin(ls.level)), 0, def ? leverMaxLevel(def) : Infinity);
      const out: LeverState = { level, ref: level > 0 ? Math.max(0, fin(ls.ref)) : 0 };
      if (def && typeof ls.recycle === 'string' && recycleOptions(def).includes(ls.recycle as LeverRecycle)) out.recycle = ls.recycle as LeverRecycle;
      levers[id] = out;
    }
    const run = merged.run;
    let s: GameState = {
      ...merged, version: SAVE_VERSION, sectors, levers, meta,
      upgrades: levelMap(merged.upgrades, (id) => { const u = ix.upgrades.get(id); return u ? upgradeMax(u) : undefined; }),
      run: {
        ...run, resourceUsed: amountMap(run.resourceUsed), steadySectors: trueMap(run.steadySectors),
        firstBackfires: trueMap(run.firstBackfires),
      },
      news: Array.isArray(merged.news)
        ? merged.news.filter((n) => isObj(n) && typeof n.text === 'string' && typeof n.time === 'number')
          .map((n) => (typeof n.year === 'number' ? n : { ...n, year: Math.floor(START_YEAR + n.time * YEARS_PER_SECOND) }))
          .slice(0, NEWS_MAX)
        : [],
      history: Array.isArray(merged.history)
        ? merged.history.filter((h) => isObj(h) && Number.isFinite(h.time) && isObj(h.sectors)).slice(-HISTORY_MAX)
        : [],
    };
    // migrated budgets get the calendar year of the save
    if (version < 2) {
      const y = Math.floor(calendarYear(s, content));
      const s2 = { ...s.sectors };
      let changed = false;
      for (const id of ix.ids) {
        const b = s2[id].budget;
        if (b && b.drawnYear < 0) { s2[id] = { ...s2[id], budget: { ...b, drawnYear: y } }; changed = true; }
      }
      if (changed) s = { ...s, sectors: s2 };
    }
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
  createState, tick, fastForward, derive, click, buyUpgrade, foundApp, setLever, setLeverRecycle, drawBudget, reckon,
  buyKnowhow, buyInstitution, setLoadout, upgradeViews, leverViews, knowhowViews, institutionViews, hindsightOnReckon,
  serialize, deserialize,
};
