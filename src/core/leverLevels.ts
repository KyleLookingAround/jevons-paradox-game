/**
 * Lever level resolution (layer 0): authored and repeat "Tighten" levels, each kind's value range. Split from levers.ts
 * in M3 so that effects.ts (a 'measure' lever's value) can read it without a cycle.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { LeverDef, LeverKind, LeverLevelDef } from '../types';
import { fin } from './util';

/** Value range of each lever kind (used to bound `repeat`). */
const KIND_RANGE: Record<LeverKind, [number, number]> = {
  duty: [0, 0.999], cap: [0.05, Infinity], sufficiency: [0.05, 1], substitution: [0, 1], greenSpending: [0, 1],
  reviewGate: [0, 1], circularity: [0, 0.95], sharedLibs: [0, 0.95], deletion: [0, 0.9], measure: [0, Infinity],
  quota: [0, 1],
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

