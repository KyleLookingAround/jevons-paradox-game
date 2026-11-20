/**
 * Standing effects folded into modifiers (Mods: upgrades, know-how, seated institutions, decade rewards), efficiency and
 * flow capacity from them, and the one-off effects fired at the moment they are granted.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { CONFIDENCE_MAX } from '../types';
import type { Content, EffectDef, GameState, InstitutionDef, LeverKind, MetaState, OrderId, SectorDef } from '../types';
import { POP_MIN } from './constants';
import { leverLevelDef } from './leverLevels';
import { chairIdx } from './chair/chairIndex';
import { effKey, effectiveOf, rungActsUsed, leverEscape } from './chair/acting';
import { idx } from './contentIndex';
import { decadeEffectsOf } from './steady';
import { fin } from './util';

/** autoEta exponent cap (keeps η finite in very long runs). */
const AUTO_ETA_EXP_MAX = 300;

const ONE_OFF = new Set(['mandateAdd', 'capitalAdd', 'slotAdd', 'populationMul', 'pressureAdd', 'metaFlag', /* M4 (finish) */ 'hindsightShare',
  /* M5 */ 'confidenceAdd']);

/* ------------------------------------------------------------------ */
/* Modifiers (standing effects)                                        */
/* ------------------------------------------------------------------ */

export interface Mods {
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
  /* M2 */
  offlineCapAdd: number;
  orderUnlock: Set<OrderId>;
  commonsYieldMul: number;
  /** Applications founded at run start (or when their sector opens) by a standing startFounded effect. */
  startFounded: Set<string>;
  /** Institution id → level loaned by an institutionLoan in force (the higher of loan and seat applies). */
  loans: Record<string, number>;
  /* M3 */
  resourcePriceMul: Record<string, number>;
  intensityMul: Record<string, number>;
  /** incomeMul per sector, and the product of the sector-less ones (every sector). */
  incomeMul: Record<string, number>;
  incomeMulAll: number;
  /** costMulOf by id (an upgrade, application, Commons project, seam, or a sector id). */
  costMulOf: Record<string, number>;
  /** forbid effects in force. */
  forbids: { id?: string; leverKind?: LeverKind; sector?: string }[];
  travelSpeed: Record<string, number>;
  travelRoads: Record<string, number>;
  /** priceSeen effects: the lowest share (then the lowest flat) per app and per sector. */
  priceSeenApp: Record<string, { share: number; flat: number }>;
  priceSeenSector: Record<string, { share: number; flat: number }>;
  /** Any priceSeen effect in force (a fast exit for the solver). */
  anyPriceSeen: boolean;
  /** Content has measure or side-effect levers (the overlay has something to look at). */
  runVarying: boolean;
  /* M3 finish */
  /** leverCostMul effects in force (matched per lever by leverMulOf). */
  leverCost: { lever?: string; leverKind?: LeverKind; sector?: string; cost: number; upkeep: number }[];
  /** Standing orders suspended while in force (suspendOrder). */
  suspendOrder: Set<OrderId>;
  /** leakMul and spillMul per sector. */
  leakMul: Record<string, number>;
  spillMul: Record<string, number>;
  /** settleSlotAdd: extra Industries that may be settled at once. */
  settleSlots: number;
  /* M4 */
  /** Sectors with a 'survey' effect in force. */
  survey: Set<string>;
  /** foreignMul per sector (multiplicative). */
  foreignMul: Record<string, number>;
  /* M5 (each inert outside a Ministry by its readers) */
  returnShareMul: Record<string, number>;
  inspectorAdd: number;
  amendYearsMul: number;
  pledgeOfferAdd: number;
  litigateYearsMul: number;
  fineMul: number;
  popularityYearsMul: number;
  compensationMul: number;
  quietYearsAdd: number;
  termYearsAdd: number;
  ratchet: boolean;
  /** Sectors with a 'certify' effect in force. */
  certify: Set<string>;
  /** rivalCostMul per ResponseKind (multiplicative). */
  rivalCostMul: Record<string, number>;
}

function emptyMods(): Mods {
  return {
    etaMul: {}, capMul: {}, marginAdd: {}, reserveAdd: {}, absorptionAdd: {}, satMulSector: {}, satMulApp: {},
    halfMulSector: {}, halfMulApp: {}, reveal: false, startCapitalMul: 1, mandateRateMul: 1, costMul: 1,
    popGrowthMul: 1, wellbeingAdd: 0, startLevers: {}, unlocked: new Set(),
    offlineCapAdd: 0, orderUnlock: new Set(), commonsYieldMul: 1, startFounded: new Set(), loans: {},
    resourcePriceMul: {}, intensityMul: {}, incomeMul: {}, incomeMulAll: 1, costMulOf: {}, forbids: [], travelSpeed: {},
    travelRoads: {}, priceSeenApp: {}, priceSeenSector: {}, anyPriceSeen: false, runVarying: false,
    leverCost: [], suspendOrder: new Set(), leakMul: {}, spillMul: {}, settleSlots: 0,
    survey: new Set(), foreignMul: {},
    returnShareMul: {}, inspectorAdd: 0, amendYearsMul: 1, pledgeOfferAdd: 0, litigateYearsMul: 1, fineMul: 1,
    popularityYearsMul: 1, compensationMul: 1, quietYearsAdd: 0, termYearsAdd: 0, ratchet: false, certify: new Set(),
    rivalCostMul: {},
  };
}
/** A shallow copy deep enough for an overlay (every record and set copied). */
function cloneMods(b: Mods): Mods {
  return {
    ...b, etaMul: { ...b.etaMul }, capMul: { ...b.capMul }, marginAdd: { ...b.marginAdd }, reserveAdd: { ...b.reserveAdd },
    absorptionAdd: { ...b.absorptionAdd }, satMulSector: { ...b.satMulSector }, satMulApp: { ...b.satMulApp },
    halfMulSector: { ...b.halfMulSector }, halfMulApp: { ...b.halfMulApp }, startLevers: { ...b.startLevers },
    unlocked: new Set(b.unlocked), orderUnlock: new Set(b.orderUnlock), startFounded: new Set(b.startFounded), loans: { ...b.loans },
    resourcePriceMul: { ...b.resourcePriceMul }, intensityMul: { ...b.intensityMul }, incomeMul: { ...b.incomeMul },
    costMulOf: { ...b.costMulOf }, forbids: b.forbids.slice(), travelSpeed: { ...b.travelSpeed }, travelRoads: { ...b.travelRoads },
    priceSeenApp: { ...b.priceSeenApp }, priceSeenSector: { ...b.priceSeenSector },
    leverCost: b.leverCost.slice(), suspendOrder: new Set(b.suspendOrder), leakMul: { ...b.leakMul }, spillMul: { ...b.spillMul },
    survey: new Set(b.survey), foreignMul: { ...b.foreignMul },
    returnShareMul: { ...b.returnShareMul }, certify: new Set(b.certify), rivalCostMul: { ...b.rivalCostMul },
  };
}
const seenBetter = (a: { share: number; flat: number } | undefined, share: number, flat: number): boolean =>
  !a || share < a.share || (share === a.share && flat < a.flat);

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
    case 'startFounded': m.startFounded.add(ef.app); break;
    case 'institutionLoan': m.loans[ef.id] = Math.max(m.loans[ef.id] ?? 0, Math.floor(fin(ef.level))); break;
    case 'offlineCapAdd': m.offlineCapAdd += fin(ef.seconds) * times; break;
    case 'orderUnlock': m.orderUnlock.add(ef.order); break;
    case 'commonsYieldMul': m.commonsYieldMul *= Math.pow(ef.value, times); break;
    /* M3 */
    case 'resourcePriceMul': mul(m.resourcePriceMul, ef.sector, ef.value, times); break;
    case 'intensityMul': mul(m.intensityMul, ef.sector, ef.value, times); break;
    case 'incomeMul': if (ef.sector !== undefined) mul(m.incomeMul, ef.sector, ef.value, times); else m.incomeMulAll *= Math.pow(ef.value, times); break;
    case 'costMulOf': mul(m.costMulOf, ef.id, ef.value, times); break;
    case 'forbid': m.forbids.push({ ...(ef.id !== undefined ? { id: ef.id } : {}), ...(ef.leverKind ? { leverKind: ef.leverKind } : {}), ...(ef.sector !== undefined ? { sector: ef.sector } : {}) }); break;
    case 'travelMul':
      if (ef.speed !== undefined) mul(m.travelSpeed, ef.sector, ef.speed, times);
      if (ef.roads !== undefined) mul(m.travelRoads, ef.sector, ef.roads, times);
      break;
    case 'priceSeen': {
      const share = Math.max(0, fin(ef.share)), flat = Math.max(0, fin(ef.flat ?? 0));
      m.anyPriceSeen = true;
      if (ef.app !== undefined) { if (seenBetter(m.priceSeenApp[ef.app], share, flat)) m.priceSeenApp[ef.app] = { share, flat }; }
      else if (seenBetter(m.priceSeenSector[ef.sector], share, flat)) m.priceSeenSector[ef.sector] = { share, flat };
      break;
    }
    /* M3 finish */
    case 'leverCostMul': {
      const c = Math.pow(Math.max(0, fin(ef.cost ?? 1, 1)), times), u = Math.pow(Math.max(0, fin(ef.upkeep ?? 1, 1)), times);
      m.leverCost.push({ ...(ef.lever !== undefined ? { lever: ef.lever } : {}), ...(ef.leverKind ? { leverKind: ef.leverKind } : {}), ...(ef.sector !== undefined ? { sector: ef.sector } : {}), cost: c, upkeep: u });
      break;
    }
    case 'suspendOrder': m.suspendOrder.add(ef.order); break;
    case 'leakMul': mul(m.leakMul, ef.sector, Math.max(0, fin(ef.value, 1)), times); break;
    case 'spillMul': mul(m.spillMul, ef.sector, Math.max(0, fin(ef.value, 1)), times); break;
    case 'settleSlotAdd': m.settleSlots += Math.max(0, fin(ef.value)) * times; break;
    /* M4 */
    case 'survey': if (typeof ef.sector === 'string') m.survey.add(ef.sector); break;
    case 'foreignMul': mul(m.foreignMul, ef.sector, Math.max(0, fin(ef.value, 1)), times); break;
    /* M5 */
    case 'returnShareMul': mul(m.returnShareMul, ef.sector, Math.max(0, fin(ef.value, 1)), times); break;
    case 'inspectorAdd': m.inspectorAdd += fin(ef.value) * times; break;
    case 'amendYearsMul': m.amendYearsMul *= Math.pow(Math.max(0, fin(ef.value, 1)), times); break;
    case 'pledgeOfferAdd': m.pledgeOfferAdd += fin(ef.value) * times; break;
    case 'litigateYearsMul': m.litigateYearsMul *= Math.pow(Math.max(0, fin(ef.value, 1)), times); break;
    case 'fineMul': m.fineMul *= Math.pow(Math.max(0, fin(ef.value, 1)), times); break;
    case 'popularityYearsMul': m.popularityYearsMul *= Math.pow(Math.max(0, fin(ef.value, 1)), times); break;
    case 'compensationMul': m.compensationMul *= Math.pow(Math.max(0, fin(ef.value, 1)), times); break;
    case 'quietYearsAdd': m.quietYearsAdd += fin(ef.value) * times; break;
    case 'termYearsAdd': m.termYearsAdd += fin(ef.value) * times; break;
    case 'ratchet': m.ratchet = true; break;
    case 'certify': if (typeof ef.sector === 'string') m.certify.add(ef.sector); break;
    case 'rivalCostMul': if (typeof ef.response === 'string') mul(m.rivalCostMul, ef.response, Math.max(0, fin(ef.value, 1)), times); break;
    default: break;
  }
}

/** M3 finish: the product of the leverCostMul effects in force that match this lever (cost and upkeep multipliers). */
export function leverMulOf(m: Mods, def: { id: string; kind: LeverKind; sector: string }): { cost: number; upkeep: number } {
  if (!m.leverCost.length) return ONE_MUL;
  let cost = 1, upkeep = 1;
  for (const e of m.leverCost) {
    if (e.lever !== undefined && e.lever !== def.id) continue;
    if (e.leverKind !== undefined && e.leverKind !== def.kind) continue;
    if (e.sector !== undefined && e.sector !== def.sector) continue;
    cost *= e.cost; upkeep *= e.upkeep;
  }
  return { cost, upkeep };
}
const ONE_MUL = { cost: 1, upkeep: 1 } as const;

/** Effects of the owned levels of an institution (level 1 = def.effects, then nextLevels). */
function institutionEffects(def: InstitutionDef, level: number): EffectDef[] {
  const out: EffectDef[] = level >= 1 ? [...def.effects] : [];
  for (let l = 2; l <= level; l++) out.push(...(def.nextLevels?.[l - 2]?.effects ?? []));
  return out;
}
export const institutionMax = (def: InstitutionDef): number => 1 + (def.nextLevels?.length ?? 0);
export const isSeated = (meta: MetaState, id: string): boolean =>
  (meta.institutions?.[id] ?? 0) >= 1 && (meta.loadout ?? []).includes(id);

/** M2: run-state sources of standing effects beyond upgrades (see modsOf). */
export interface ModSources {
  /** sector → decades earned this run. */
  decades: Record<string, number>;
  /** Dividend ids chosen this run (each entry once). */
  dividends: string[];
  /** Commons project id → level. */
  commons: Record<string, number>;
  /** Sectors settled now (their settle.dividend is in force). */
  settled: string[];
  /** M3: the History's forbid effects have lifted this run (GameState.historyLifted). */
  lifted?: boolean;
}
export const NO_SOURCES: ModSources = { decades: {}, dividends: [], commons: {}, settled: [] };

/** M3: what the History in force suspends this run (HistoryDef.suspend). */
export function suspended(meta: MetaState, content: Content, what: 'knowhow' | 'institutions' | 'charter' | 'market'): boolean {
  const h = meta.history;
  if (h === null || h === undefined) return false;
  return (idx(content).histories.get(h)?.suspend ?? []).includes(what);
}

const modsCache = new WeakMap<object, { kh: object; inst: object; loadout: object; charter: string | null; history: string | null; key: string; content: Content; mods: Mods;
  /* M5 */ art: object | undefined; pb: object | undefined }>();
/**
 * Standing effects of: upgrades owned (× level), know-how (× level), the Charter in force (once), decades (× earned),
 * dividends chosen (once each), Commons projects (× level), settled sectors' settle.dividend (once), and the seated
 * institutions, each at the higher of its seated level and any institutionLoan level (loans named by institutions
 * themselves are ignored). `key` must change whenever `src` does.
 */
export function computeMods(upgrades: Record<string, number>, meta: MetaState, content: Content, src: ModSources, key: string): Mods {
  const charter = meta.charter ?? null;
  const history = meta.history ?? null;
  const hit = modsCache.get(upgrades);
  if (hit && hit.kh === meta.knowhow && hit.inst === meta.institutions && hit.loadout === meta.loadout && hit.key === key
    && hit.charter === charter && hit.history === history && hit.content === content
    && hit.art === meta.articles && hit.pb === meta.playbooks) return hit.mods;
  const ix = idx(content);
  const m = emptyMods();
  const hdef = history !== null ? ix.histories.get(history) : undefined;
  const susp = hdef?.suspend ?? [];
  for (const id in upgrades) {
    const u = ix.upgrades.get(id);
    const lvl = upgrades[id] ?? 0;
    if (u && lvl > 0) for (const ef of u.effects) applyEffect(m, ef, lvl);
  }
  if (!susp.includes('knowhow')) for (const id in meta.knowhow ?? {}) {
    const k = ix.knowhow.get(id);
    const lvl = meta.knowhow[id] ?? 0;
    if (k && lvl > 0) for (const ef of k.effects) applyEffect(m, ef, lvl);
  }
  if (charter !== null && !susp.includes('charter')) {
    const c = ix.charters.get(charter);
    if (c) for (const ef of c.effects) applyEffect(m, ef, 1);
  }
  // M3: the History in force, like a second Charter; its forbids lift once forbidUntil has held (GameState.historyLifted)
  if (hdef) for (const ef of hdef.effects) if (!(ef.type === 'forbid' && src.lifted)) applyEffect(m, ef, 1);
  for (const s in src.decades) {
    const n = src.decades[s];
    if (n > 0) for (const ef of decadeEffectsOf(content, s)) applyEffect(m, ef, n);
  }
  for (const id of src.dividends) {
    const d = ix.dividends.get(id);
    if (d) for (const ef of d.effects) applyEffect(m, ef, 1);
  }
  for (const id in src.commons) {
    const c = ix.commons.get(id);
    const lvl = src.commons[id] ?? 0;
    if (c && lvl > 0) for (const ef of c.effects ?? []) applyEffect(m, ef, lvl);
  }
  for (const s of src.settled) for (const ef of content.sectors[s]?.settle?.dividend ?? []) applyEffect(m, ef, 1);
  // institutions: seated level, raised to any loan in force (loans gathered above; an institution's own loans ignored)
  const loans = { ...m.loans };
  const levels = new Map<string, number>();
  if (!susp.includes('institutions')) for (const id of meta.loadout ?? []) {
    const i = ix.institutions.get(id);
    if (i) levels.set(id, Math.min(meta.institutions?.[id] ?? 0, institutionMax(i)));
  }
  for (const id in loans) {
    const i = ix.institutions.get(id);
    if (i) levels.set(id, Math.max(levels.get(id) ?? 0, Math.min(loans[id], institutionMax(i))));
  }
  for (const i of content.institutions ?? []) {
    const lvl = levels.get(i.id) ?? 0;
    if (lvl > 0) for (const ef of institutionEffects(i, lvl)) if (ef.type !== 'institutionLoan') applyEffect(m, ef, 1);
  }
  m.loans = loans;
  // M5: the Articles bought and the playbooks the rival has learnt stand for good (once each)
  if (meta.articles || meta.playbooks?.length) {
    const cx = chairIdx(content);
    for (const id in meta.articles ?? {}) if (meta.articles![id] === true) for (const ef of cx.articles.get(id)?.effects ?? []) applyEffect(m, ef, 1);
    for (const id of meta.playbooks ?? []) for (const ef of cx.playbooks.get(id)?.effects ?? []) applyEffect(m, ef, 1);
  }
  m.runVarying = ix.measureLevers.length > 0 || ix.sideLevers.length > 0;
  modsCache.set(upgrades, { kh: meta.knowhow, inst: meta.institutions, loadout: meta.loadout, charter, history, key, content, mods: m,
    art: meta.articles, pb: meta.playbooks });
  return m;
}

/** Mods of a state. No per-state cache (a WeakMap entry per transient state costs more than the key below). */
export function modsOf(s: GameState, c: Content): Mods {
  let key = '';
  let src: ModSources | null = null;
  for (const id of idx(c).ids) {
    const es = s.sectors[id];
    if (!es) continue;
    const n = es.decadesWithin?.length ?? 0;
    const dv = es.dividends;
    const st = es.settled && es.open;
    if (n === 0 && !(dv && dv.length) && !st) continue;
    src ??= { decades: {}, dividends: [], commons: {}, settled: [] };
    if (n > 0) { src.decades[id] = n; key += `${id}:${n},`; }
    if (dv && dv.length) { for (const d of dv) src.dividends.push(d); key += `${id}v${dv.join('+')},`; }
    if (st) { src.settled.push(id); key += `${id}S,`; }
  }
  const lv = s.commons?.levels;
  if (lv) {
    for (const k in lv) {
      if (!(lv[k] > 0)) continue;
      src ??= { decades: {}, dividends: [], commons: {}, settled: [] };
      src.commons[k] = lv[k]; key += `c${k}:${lv[k]},`;
    }
  }
  if (s.historyLifted) { src ??= { decades: {}, dividends: [], commons: {}, settled: [] }; src.lifted = true; key += 'L'; }
  const base = computeMods(s.upgrades, s.meta, c, src ?? NO_SOURCES, key);
  return overlayMods(s, c, base);
}

/* M3: the run-varying sources (measure levers × value, side effects × bite × level, timed modifiers, dispatch standing
 * effects) layered over the cached base. Nothing to layer (the common case): the base itself, at the cost of a few
 * length checks. Cached per (levers, modifiers, standing) identity. */
const overlayCache = new WeakMap<object, { base: Mods; mods: object; standing: object; content: Content; out: Mods;
  /* M5: the chair's parts the overlay reads (by identity: the rival's capital moving every step must not invalidate it) */
  pl: object | null; lh: object | null; off: object | undefined; ek: string }>();
const EMPTY_LIST: never[] = [];
function overlayMods(s: GameState, c: Content, base: Mods): Mods {
  const modifiers = s.modifiers ?? EMPTY_LIST;
  const standing = s.dispatch?.standing ?? EMPTY_LIST;
  const ch = s.chair ?? null;
  if (!base.runVarying && !modifiers.length && !standing.length && !ch) return base;
  const ix = idx(c);
  const pl = ch ? ch.pledges : null, lh = ch ? ch.loopholes : null, off = ch ? s.meta.office : undefined;
  const ek = ch ? effKey(s) : '';
  const hit = overlayCache.get(s.levers);
  if (hit && hit.base === base && hit.mods === modifiers && hit.standing === standing && hit.content === c
    && hit.pl === pl && hit.lh === lh && hit.off === off && hit.ek === ek) return hit.out;
  let m: Mods | null = null;
  const get = (): Mods => (m ??= cloneMods(base));
  for (const def of ix.measureLevers) {
    const ls = s.levers[def.id];
    if (!ls || !(ls.level >= 1)) continue;
    // M5: the effective level, and the grip that escapes through a used rung
    const L = ch ? effectiveOf(ch, def.id, ls.level, s.time) : ls.level;
    if (!(L >= 1)) continue;
    let v = fin(leverLevelDef(def, L)?.value ?? 0);
    if (ch) v *= 1 - leverEscape(s, c, def.id);
    if (v > 0) for (const ef of def.effects!) applyEffect(get(), ef, v);
  }
  for (const def of ix.sideLevers) {
    const ls = s.levers[def.id];
    const L = ch && ls ? effectiveOf(ch, def.id, ls.level, s.time) : (ls?.level ?? 0);
    const t = fin(ls?.bite ?? 0) * L;
    if (t > 0) for (const ef of def.sideEffects!.effects) applyEffect(get(), ef, t);
  }
  if (ch) overlayChair(s, c, ch, get);
  for (const md of modifiers) {
    const effs = modifierEffects(ix, md);
    if (effs) for (const ef of effs) applyEffect(get(), ef, 1);
  }
  for (const [id, arm] of standing) {
    const a = ix.dispatches.get(id)?.arms[arm];
    if (!a) continue;
    for (const ef of a.effects ?? []) if (!ONE_OFF.has(ef.type)) applyEffect(get(), ef, 1);
    // M4: a wager arm's branch standing effects, resolved from the run's answer (AnsweredDispatch.won)
    if (a.wager) {
      const ans = (s.dispatch?.answered ?? []).find((x) => x.id === id && x.arm === arm && x.won !== undefined);
      const br = ans ? (ans.won ? a.wager.win : a.wager.lose) : undefined;
      for (const ef of br?.effects ?? []) if (!ONE_OFF.has(ef.type)) applyEffect(get(), ef, 1);
    }
  }
  const out = m ?? base;
  overlayCache.set(s.levers, { base, mods: modifiers, standing, content: c, out, pl, lh, off, ek });
  return out;
}

/** M5: a Ministry's standing sources: pledges in force, used rungs' effects (× effective level), the Know-how transfer. */
function overlayChair(s: GameState, c: Content, ch: NonNullable<GameState['chair']>, get: () => Mods): void {
  const cx = chairIdx(c);
  for (const id of ch.pledges) for (const ef of cx.pledges.get(id)?.effects ?? []) if (!ONE_OFF.has(ef.type)) applyEffect(get(), ef, 1);
  for (const [lever, rungs] of cx.ladders) {
    let L = -1;
    for (const r of rungs) {
      if (!r.effects?.length || !rungActsUsed(ch.loopholes[r.id])) continue;
      if (L < 0) L = effectiveOf(ch, lever, s.levers[lever]?.level ?? 0, s.time);
      if (L > 0) for (const ef of r.effects) if (!ONE_OFF.has(ef.type)) applyEffect(get(), ef, L);
    }
  }
  const kt = c.rival?.knowhowTransfer;
  const ho = s.meta.office?.handedOver;
  if (kt && ho && cx.chairSectors.length) {
    let n = 0;
    for (const id in ho) n += Math.max(0, fin(ho[id]));
    const f = Math.min(fin(kt.cap, 1), 1 + fin(kt.k) * n);
    if (f !== 1 && f > 0) for (const sec of cx.chairSectors) mul(get().etaMul, sec, f, 1);
  }
}

/** M4: the effects of a timed modifier: a dispatch arm's own modifier, a wager branch's (`branch`), or the Board's first
 *  survey (source 'survey:<s>', resolved by the core). undefined when the source no longer resolves. */
export function modifierEffects(ix: ReturnType<typeof idx>, md: { source: string; arm: number; branch?: 'win' | 'lose' }): EffectDef[] | undefined {
  if (md.source.startsWith('survey:')) {
    const s = md.source.slice(7);
    return ix.renewable.includes(s) ? [{ type: 'survey', sector: s }] : undefined;
  }
  const a = ix.dispatches.get(md.source)?.arms[md.arm];
  if (md.branch) return a?.wager?.[md.branch]?.modifier?.effects;
  return a?.modifier?.effects;
}

/* ------------------------------------------------------------------ */
/* M3: forbid and costMulOf                                            */
/* ------------------------------------------------------------------ */

/** A forbid effect names this thing (an upgrade, application, seam, Commons project or lever by id; or, for a lever,
 *  its kind, in `sector` if the effect gives one). */
export function isForbidden(mods: Mods, id: string, lever?: { kind: LeverKind; sector: string }): boolean {
  const fs = mods.forbids;
  if (!fs.length) return false;
  for (const f of fs) {
    if (f.id !== undefined && f.id === id) return true;
    if (lever && f.id === undefined && f.leverKind === lever.kind && (f.sector === undefined || f.sector === lever.sector)) return true;
  }
  return false;
}
/** costMulOf for a thing and its sector (multiplied together; 1 when none). */
export function costMulOfId(mods: Mods, id: string, sector?: string): number {
  const r = mods.costMulOf;
  return (r[id] ?? 1) * (sector !== undefined ? r[sector] ?? 1 : 1);
}
/** Institution seated, or loaned by an institutionLoan in force (LeverDef.requires). */
export const isSeatedOrLoaned = (meta: MetaState, mods: Mods, id: string): boolean => isSeated(meta, id) || (mods.loans[id] ?? 0) >= 1;
/** M4: a 'depletion' sector absorbs nothing (its P is derived from the stock; its net rate is carried in pressureIn). */
export const absorptionOf = (def: SectorDef, mods: Mods): number =>
  def.pressureSource === 'depletion' ? 0 : Math.max(0, def.absorption + (mods.absorptionAdd[def.id] ?? 0));

function staticEta(def: SectorDef, mods: Mods): number {
  return def.baseEta * (mods.etaMul[def.id] ?? 1);
}
export function etaAt(def: SectorDef, mods: Mods, openFor: number): number {
  const auto = def.autoEtaRate > 0 ? Math.exp(Math.min(AUTO_ETA_EXP_MAX, def.autoEtaRate * openFor)) : 1;
  return staticEta(def, mods) * auto;
}
export function flowCapacity(def: SectorDef, mods: Mods): number {
  return Math.max(0, def.reserve * (1 + (mods.reserveAdd[def.id] ?? 0)));
}

/* ------------------------------------------------------------------ */
/* One-off effects                                                     */
/* ------------------------------------------------------------------ */

/** One-offs gathered by fireOneOffs. M3 adds (optional, absent = none): a population factor, pressure additions per
 *  sector (× collapseAt) and permanent flags. applyM3OneOffs applies those three. */
export interface OneOffs { capital: number; mandate: number; slots: number; pop?: number; pressure?: Record<string, number>; flags?: string[]; /** M4 (finish) */ letterShare?: number;
  /** M5: 'confidenceAdd' (applied by applyM3OneOffs to ChairState.confidence; inert outside office). */ confidence?: number }
/** Fire the one-off effects of a list (`times` times); capitalAdd is measured in seconds of `income`. */
export function fireOneOffs(effects: EffectDef[], times: number, income: number, acc: OneOffs): void {
  for (const ef of effects) {
    if (!ONE_OFF.has(ef.type)) continue;
    if (ef.type === 'metaFlag') { if (times > 0 && typeof ef.flag === 'string') (acc.flags ??= []).push(ef.flag); continue; }
    if (ef.type === 'pressureAdd') {
      const p = (acc.pressure ??= {});
      p[ef.sector] = (p[ef.sector] ?? 0) + fin(ef.value) * times;
      continue;
    }
    if (ef.type === 'populationMul') { acc.pop = (acc.pop ?? 1) * Math.pow(Math.max(0, fin(ef.value, 1)), times); continue; }
    if (ef.type === 'hindsightShare') { acc.letterShare = (acc.letterShare ?? 0) + fin(ef.value) * times; continue; } // M4 (finish)
    if (ef.type === 'confidenceAdd') { acc.confidence = (acc.confidence ?? 0) + fin(ef.value) * times; continue; } // M5
    const v = fin((ef as { value: number }).value) * times;
    if (ef.type === 'capitalAdd') acc.capital += v * Math.max(0, income);
    else if (ef.type === 'mandateAdd') acc.mandate += v;
    else if (ef.type === 'slotAdd') acc.slots += v;
  }
}
/** M3: apply the M3 one-offs of `one` (population × pop, pressure += value × collapseAt on open unsettled sectors
 *  flooring at 0, meta.flags). The same reference when there are none. */
export function applyM3OneOffs(state: GameState, content: Content, one: OneOffs): GameState {
  if (one.pop === undefined && one.pressure === undefined && one.flags === undefined && !one.letterShare && !one.confidence) return state;
  let s = state;
  // M5: a letter's Confidence one-off (clamped; inert outside office)
  if (one.confidence && s.chair) {
    const confidence = Math.min(CONFIDENCE_MAX, Math.max(0, fin(s.chair.confidence + one.confidence)));
    if (confidence !== s.chair.confidence) s = { ...s, chair: { ...s.chair, confidence } };
  }
  // M4 (finish): a letter's stake in the run's Hindsight (EffectDef 'hindsightShare')
  if (one.letterShare) s = { ...s, run: { ...s.run, letterShare: fin((s.run.letterShare ?? 0) + one.letterShare) } };
  if (one.pop !== undefined && one.pop !== 1) {
    const population = Math.max(POP_MIN, fin(s.population * one.pop, POP_MIN));
    s = { ...s, population, peakPopulation: Math.max(s.peakPopulation, population) };
  }
  if (one.pressure) {
    let sectors: GameState['sectors'] | null = null;
    for (const id in one.pressure) {
      const es = s.sectors[id];
      const def = content.sectors[id];
      if (!es?.open || es.settled || !def) continue;
      sectors ??= { ...s.sectors };
      const P = Math.max(0, fin(es.pressure + one.pressure[id] * def.collapseAt));
      sectors[id] = { ...es, pressure: P, peakPressure: Math.max(es.peakPressure ?? 0, P) };
    }
    if (sectors) s = { ...s, sectors };
  }
  if (one.flags && one.flags.length) {
    const fl = s.meta.flags ?? {};
    if (one.flags.some((f) => fl[f] !== true)) {
      const flags = { ...fl };
      for (const f of one.flags) flags[f] = true;
      s = { ...s, meta: { ...s.meta, flags } };
    }
  }
  return s;
}

/** M3: η of every open, unsettled sector recomputed from the state's Mods now (a measure raised, a dispatch answered:
 *  an etaMul from a run-varying source takes effect at once, as an upgrade's does). The same state when nothing moves. */
export function refreshEta(state: GameState, content: Content): GameState {
  const mods = modsOf(state, content);
  let sectors: GameState['sectors'] | null = null;
  for (const id of idx(content).ids) {
    const es = state.sectors[id];
    if (!es?.open || es.settled) continue;
    const eta = etaAt(content.sectors[id], mods, es.openFor);
    if (eta === es.eta) continue;
    sectors ??= { ...state.sectors };
    sectors[id] = { ...es, eta };
  }
  return sectors ? { ...state, sectors } : state;
}
