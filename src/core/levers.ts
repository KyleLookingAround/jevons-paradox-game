/**
 * Levers: level resolution (authored and repeat "Tighten" levels), visibility, recycle options, net upkeep, the
 * per-sector aggregate the solver reads, and the levy's Mandate share.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState, LeverDef, LeverRecycle, LeverState } from '../types';
import { FEATURE_IDS } from '../types';
import type { FeatureId } from '../types';
import { DEFAULT_MANDATE_SHARE } from './constants';
import { featureOn } from './features';
import { idx } from './contentIndex';
import { isSeatedOrLoaned } from './effects';
import type { Mods } from './effects';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* Levers: level resolution (repeat) and per-sector aggregation        */
/* ------------------------------------------------------------------ */

export { leverMaxLevel, leverLevelDef } from './leverLevels';
import { leverMaxLevel, leverLevelDef } from './leverLevels';

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


const FEATURE_SET: ReadonlySet<string> = new Set(FEATURE_IDS);

/** Highest level the player may reach now: the authored levels only until 'leverRepeat' is unlocked. */
export function leverReachable(state: GameState, content: Content, def: LeverDef): number {
  const max = leverMaxLevel(def);
  return featureOn(content, state.meta, 'leverRepeat') ? max : Math.min(max, def.levels?.length ?? 0);
}

export function leverVisible(state: GameState, content: Content, def: LeverDef, mods: Mods): boolean {
  const es = state.sectors[def.sector];
  if (!es?.open || es.settled) return false;
  if (def.locked && !mods.unlocked.has(def.id)) return false;
  const inst = (mods.startLevers[def.id] ?? 0) > 0;
  if (!inst && (!state.flags.revealed || !featureOn(content, state.meta, 'levers'))) return false;
  const ix = idx(content);
  return (def.requires ?? []).every((r) =>
    r === 'revealed' ? state.flags.revealed
      : ix.upgrades.has(r) ? (state.upgrades[r] ?? 0) > 0
        : ix.institutions.has(r) ? isSeatedOrLoaned(state.meta, mods, r)
          : FEATURE_SET.has(r) ? featureOn(content, state.meta, r as FeatureId)
            : true);
}
