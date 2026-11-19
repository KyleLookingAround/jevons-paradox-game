/**
 * M3: milestones (MetaState.milestones): the first time ever of each thing the retrospective tells, written once at the
 * moment it happens (never overwritten; at most MILESTONES_MAX keys). Layer 1: it reads only the state it is given.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { MILESTONES_MAX } from '../types';
import type { GameState, MetaState } from '../types';

/** The meta with milestone `key` written (run = reckonings + 1, at = totalSeconds, year), unless already there or full.
 *  The same reference when nothing changes. */
export function milestone(meta: MetaState, key: string, _state: Pick<GameState, 'time'> | null, year: number): MetaState {
  const ms = meta.milestones ?? {};
  if (ms[key] !== undefined) return meta;
  let n = 0;
  for (const _ in ms) if (++n >= MILESTONES_MAX) return meta;
  return { ...meta, milestones: { ...ms, [key]: { run: (meta.reckonings ?? 0) + 1, at: meta.totalSeconds ?? 0, year: Math.floor(year) } } };
}
/** Several at once (in order). */
export function milestones(meta: MetaState, keys: string[], year: number): MetaState {
  let m = meta;
  for (const k of keys) m = milestone(m, k, null, year);
  return m;
}
