/**
 * Levers: level resolution (authored and repeat "Tighten" levels), visibility, recycle options, net upkeep, the
 * per-sector aggregate the solver reads, and the levy's Mandate share.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState, LeverDef, LeverKind, LeverLevelDef, LeverRecycle, LeverState } from '../types';
import { DEFAULT_MANDATE_SHARE } from './constants';
import { idx } from './contentIndex';
import { isSeated } from './effects';
import type { Mods } from './effects';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* Levers: level resolution (repeat) and per-sector aggregation        */
/* ------------------------------------------------------------------ */

/** Value range of each lever kind (used to bound `repeat`). */
const KIND_RANGE: Record<LeverKind, [number, number]> = {
  duty: [0, 0.999], cap: [0.05, Infinity], sufficiency: [0.05, 1], substitution: [0, 1], greenSpending: [0, 1],
  reviewGate: [0, 1], circularity: [0, 0.95], sharedLibs: [0, 0.95], deletion: [0, 0.9],
};

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

export const recycleOptions = (def: LeverDef): LeverRecycle[] =>
  def.kind === 'duty' || def.kind === 'cap' ? (def.recycle && def.recycle.length ? def.recycle : ['treasury']) : [];
export const recycleOf = (def: LeverDef, ls: LeverState | undefined): LeverRecycle | null => {
  const opts = recycleOptions(def);
  if (!opts.length) return null;
  return ls?.recycle && opts.includes(ls.recycle) ? ls.recycle : opts[0];
};

export interface SectorLevers {
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
export const NO_LEVERS = noLevers();

const leverCache = new WeakMap<object, { content: Content; bySector: Record<string, SectorLevers> }>();
export function sectorLevers(state: GameState, content: Content): Record<string, SectorLevers> {
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

export function leverNetUpkeep(def: LeverDef, level: number, instLevel: number): number {
  if (level <= 0) return 0;
  const full = leverLevelDef(def, level)?.mandateUpkeep ?? 0;
  const free = instLevel > 0 ? leverLevelDef(def, Math.min(instLevel, level))?.mandateUpkeep ?? 0 : 0;
  return Math.max(0, fin(full - free));
}

export const mandateShareOf = (content: Content): number => fin(content.global?.levy?.mandateShare ?? DEFAULT_MANDATE_SHARE);


export function leverVisible(state: GameState, content: Content, def: LeverDef, mods: Mods): boolean {
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
