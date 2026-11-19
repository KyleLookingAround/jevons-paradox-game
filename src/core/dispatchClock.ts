/**
 * M3: the dispatch scheduler's configuration and clock (layer 0): GlobalParams.dispatch with its defaults,
 * dispatchFirstAt and dispatchGap (see GameState.dispatch). The scheduler itself is dispatch.ts.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND } from '../types';
import type { Content } from '../types';
import { DEFAULT_DISPATCH } from './constants';
import { clamp, fin, mix32 } from './util';

export interface DispatchCfg { firstYears: number; intervalYears: number; jitter: number; expiryYears: number; maxPending: number }
const cfgCache = new WeakMap<Content, DispatchCfg>();
export function dispatchCfg(content: Content): DispatchCfg {
  const hit = cfgCache.get(content);
  if (hit) return hit;
  const d = content.global?.dispatch ?? {};
  const pos = (x: number | undefined, def: number) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : def);
  const cfg: DispatchCfg = {
    firstYears: pos(d.firstYears, DEFAULT_DISPATCH.firstYears),
    intervalYears: pos(d.intervalYears, DEFAULT_DISPATCH.intervalYears),
    jitter: clamp(fin(d.jitter ?? DEFAULT_DISPATCH.jitter, DEFAULT_DISPATCH.jitter), 0, 1),
    expiryYears: pos(d.expiryYears, DEFAULT_DISPATCH.expiryYears),
    maxPending: clamp(Math.floor(fin(d.maxPending ?? DEFAULT_DISPATCH.maxPending, 1)), 1, 3),
  };
  cfgCache.set(content, cfg);
  return cfg;
}
/** Run time (s) of a run's first draw. */
export const dispatchFirstAt = (content: Content): number => dispatchCfg(content).firstYears / YEARS_PER_SECOND;
/** The k-th gap (s): intervalYears / YPS × (1 − jitter/2 + jitter × u_k), u_k = mix32(seed ^ imul(k + 1, 0x85EBCA6B)) / 2^32. */
export function dispatchGap(seed: number, k: number, content: Content): number {
  const c = dispatchCfg(content);
  const u = mix32((seed ^ Math.imul(k + 1, 0x85EBCA6B)) >>> 0) / 4294967296;
  return (c.intervalYears / YEARS_PER_SECOND) * (1 - c.jitter / 2 + c.jitter * u);
}
