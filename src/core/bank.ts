/**
 * M3: banked time (GlobalParams.offline.bankRate, default OFF): Derived.bank. Banking itself happens after fastForward
 * and useBank spends it (both in offline.ts, which owns the catch-up loop they share).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState } from '../types';
import { featureOn } from './features';
import { computeFlows } from './flows';
import { fin, clamp } from './util';

/** Derived.bank: seconds banked, the cap, and whether useBank would run now. */
export function bankView(state: GameState, content: Content): { seconds: number; max: number; usable: boolean } {
  const o = content.global?.offline;
  const max = Math.max(0, fin(o?.bankMax ?? 0));
  const rate = clamp(fin(o?.bankRate ?? 0), 0, 1);
  const seconds = Math.max(0, state.meta.bankedSeconds ?? 0);
  const on = featureOn(content, state.meta, 'bank') && rate > 0 && max > 0;
  return { seconds, max, usable: on && seconds > 0 && !computeFlows(state, content).pending };
}
