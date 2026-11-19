/**
 * Standing effects folded into modifiers (Mods: upgrades, know-how, seated institutions, decade rewards), efficiency and
 * flow capacity from them, and the one-off effects fired at the moment they are granted.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, EffectDef, GameState, InstitutionDef, MetaState, OrderId, SectorDef } from '../types';
import { idx } from './contentIndex';
import { decadeEffectsOf } from './steady';
import { fin } from './util';

/** autoEta exponent cap (keeps η finite in very long runs). */
const AUTO_ETA_EXP_MAX = 300;

const ONE_OFF = new Set(['mandateAdd', 'capitalAdd', 'slotAdd']);

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
}

function emptyMods(): Mods {
  return {
    etaMul: {}, capMul: {}, marginAdd: {}, reserveAdd: {}, absorptionAdd: {}, satMulSector: {}, satMulApp: {},
    halfMulSector: {}, halfMulApp: {}, reveal: false, startCapitalMul: 1, mandateRateMul: 1, costMul: 1,
    popGrowthMul: 1, wellbeingAdd: 0, startLevers: {}, unlocked: new Set(),
    offlineCapAdd: 0, orderUnlock: new Set(), commonsYieldMul: 1, startFounded: new Set(), loans: {},
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
    case 'startFounded': m.startFounded.add(ef.app); break;
    case 'institutionLoan': m.loans[ef.id] = Math.max(m.loans[ef.id] ?? 0, Math.floor(fin(ef.level))); break;
    case 'offlineCapAdd': m.offlineCapAdd += fin(ef.seconds) * times; break;
    case 'orderUnlock': m.orderUnlock.add(ef.order); break;
    case 'commonsYieldMul': m.commonsYieldMul *= Math.pow(ef.value, times); break;
    default: break;
  }
}

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
}
export const NO_SOURCES: ModSources = { decades: {}, dividends: [], commons: {}, settled: [] };

const modsCache = new WeakMap<object, { kh: object; inst: object; loadout: object; charter: string | null; key: string; content: Content; mods: Mods }>();
/**
 * Standing effects of: upgrades owned (× level), know-how (× level), the Charter in force (once), decades (× earned),
 * dividends chosen (once each), Commons projects (× level), settled sectors' settle.dividend (once), and the seated
 * institutions, each at the higher of its seated level and any institutionLoan level (loans named by institutions
 * themselves are ignored). `key` must change whenever `src` does.
 */
export function computeMods(upgrades: Record<string, number>, meta: MetaState, content: Content, src: ModSources, key: string): Mods {
  const charter = meta.charter ?? null;
  const hit = modsCache.get(upgrades);
  if (hit && hit.kh === meta.knowhow && hit.inst === meta.institutions && hit.loadout === meta.loadout && hit.key === key
    && hit.charter === charter && hit.content === content) return hit.mods;
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
  if (charter !== null) {
    const c = ix.charters.get(charter);
    if (c) for (const ef of c.effects) applyEffect(m, ef, 1);
  }
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
  for (const id of meta.loadout ?? []) {
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
  modsCache.set(upgrades, { kh: meta.knowhow, inst: meta.institutions, loadout: meta.loadout, charter, key, content, mods: m });
  return m;
}

const stateMods = new WeakMap<GameState, { content: Content; mods: Mods }>();
export function modsOf(s: GameState, c: Content): Mods {
  const hit = stateMods.get(s);
  if (hit && hit.content === c) return hit.mods;
  const src: ModSources = { decades: {}, dividends: [], commons: {}, settled: [] };
  let key = '';
  for (const id of idx(c).ids) {
    const es = s.sectors[id];
    if (!es) continue;
    const n = es.decadesWithin?.length ?? 0;
    if (n > 0) { src.decades[id] = n; key += `${id}:${n},`; }
    const dv = es.dividends;
    if (dv && dv.length) { for (const d of dv) src.dividends.push(d); key += `${id}v${dv.join('+')},`; }
    if (es.settled && es.open) { src.settled.push(id); key += `${id}S,`; }
  }
  const lv = s.commons?.levels;
  if (lv) for (const k in lv) if (lv[k] > 0) { src.commons[k] = lv[k]; key += `c${k}:${lv[k]},`; }
  const mods = computeMods(s.upgrades, s.meta, c, src, key);
  stateMods.set(s, { content: c, mods });
  return mods;
}
/** Institution seated, or loaned by an institutionLoan in force (LeverDef.requires). */
export const isSeatedOrLoaned = (meta: MetaState, mods: Mods, id: string): boolean => isSeated(meta, id) || (mods.loans[id] ?? 0) >= 1;
export const absorptionOf = (def: SectorDef, mods: Mods): number => Math.max(0, def.absorption + (mods.absorptionAdd[def.id] ?? 0));

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

export interface OneOffs { capital: number; mandate: number; slots: number }
/** Fire the one-off effects of a list (`times` times); capitalAdd is measured in seconds of `income`. */
export function fireOneOffs(effects: EffectDef[], times: number, income: number, acc: OneOffs): void {
  for (const ef of effects) {
    if (!ONE_OFF.has(ef.type)) continue;
    const v = fin((ef as { value: number }).value) * times;
    if (ef.type === 'capitalAdd') acc.capital += v * Math.max(0, income);
    else if (ef.type === 'mandateAdd') acc.mandate += v;
    else if (ef.type === 'slotAdd') acc.slots += v;
  }
}
