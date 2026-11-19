/**
 * Standing effects folded into modifiers (Mods: upgrades, know-how, seated institutions, decade rewards), efficiency and
 * flow capacity from them, and the one-off effects fired at the moment they are granted.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, EffectDef, GameState, InstitutionDef, MetaState, SectorDef } from '../types';
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
export const institutionMax = (def: InstitutionDef): number => 1 + (def.nextLevels?.length ?? 0);
export const isSeated = (meta: MetaState, id: string): boolean =>
  (meta.institutions?.[id] ?? 0) >= 1 && (meta.loadout ?? []).includes(id);

const modsCache = new WeakMap<object, { kh: object; inst: object; loadout: object; dkey: string; content: Content; mods: Mods }>();
export function computeMods(upgrades: Record<string, number>, meta: MetaState, content: Content, decades: Record<string, number>, dkey: string): Mods {
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
export function modsOf(s: GameState, c: Content): Mods {
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
