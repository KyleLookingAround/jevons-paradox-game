/**
 * The Commons, arithmetic (M2): whether they are open, a project's wellbeing and intensity, the parameters. The actions
 * and the panel (buyCommons, commonsViews) are in commonsActions.ts, which sits above flows.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { CommonsDef, Content, GameState, SectorId } from '../types';
import { DEFAULT_COMMONS_FROM_RECKONING, DEFAULT_COMMONS_FUND_SHARE } from './constants';
import { fin, clamp } from './util';

export function commonsCfg(content: Content): { from: number; fundShare: number } {
  const c = content.global?.commons;
  return {
    from: fin(c?.fromReckoning ?? DEFAULT_COMMONS_FROM_RECKONING, DEFAULT_COMMONS_FROM_RECKONING),
    fundShare: clamp(fin(c?.fundShare ?? DEFAULT_COMMONS_FUND_SHARE, DEFAULT_COMMONS_FUND_SHARE), 0, 1),
  };
}
export const commonsOpen = (state: GameState, content: Content): boolean => state.meta.reckonings >= commonsCfg(content).from;
export const commonsMax = (def: CommonsDef): number => Math.max(1, Math.floor(fin(def.maxLevel ?? 1, 1)));

/** max × (1 − exp(−L × perLevel / max)) × yieldMul: the first level gives about perLevel, never above max. */
export function projectWellbeing(def: CommonsDef, L: number, yieldMul: number): number {
  const max = fin(def.wellbeing?.max), per = fin(def.wellbeing?.perLevel);
  if (!(L > 0) || !(max > 0)) return 0;
  return fin(max * (1 - Math.exp(-L * per / max)) * yieldMul);
}

/** Σ over built projects of their wellbeing. */
export function commonsWellbeing(state: GameState, content: Content, yieldMul: number): number {
  const lv = state.commons?.levels;
  if (!lv) return 0;
  let w = 0;
  for (const def of content.commons ?? []) {
    const L = lv[def.id] ?? 0;
    if (L > 0) w += projectWellbeing(def, L, yieldMul);
  }
  return w;
}

/** Price-proof service demand a project adds to its intensity sector now (0 if none, unbuilt or that sector closed). */
export function projectIntensity(state: GameState, def: CommonsDef, L: number, N: number): number {
  const it = def.intensity;
  if (!it || !(L > 0) || !state.sectors[it.sector]?.open) return 0;
  return Math.max(0, fin(L * it.perLevel * N));
}

/** Adds every project's intensity into `extra` (sector → extra price-proof demand). */
export function addCommonsIntensity(state: GameState, content: Content, N: number, extra: Record<SectorId, number>): void {
  const lv = state.commons?.levels;
  if (!lv) return;
  for (const def of content.commons ?? []) {
    const L = lv[def.id] ?? 0;
    if (L > 0 && def.intensity) {
      const x = projectIntensity(state, def, L, N);
      if (x > 0) extra[def.intensity.sector] = (extra[def.intensity.sector] ?? 0) + x;
    }
  }
}
