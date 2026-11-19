/**
 * Recording (M2): decisions and automated actions per model decade, the run's opening, the first budget drawn by the
 * player, and the wrapper that counts a player action as one decision when it changes the state.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND, DECISION_DECADES_MAX, OPENING_MAX } from '../types';
import type { Actor, Content, GameState, OpeningAction, RunStats } from '../types';

/** Model decade index of run time t (the last index absorbs everything past DECISION_DECADES_MAX − 1). */
export const decadeIndex = (t: number): number =>
  Math.min(DECISION_DECADES_MAX - 1, Math.max(0, Math.floor((Number.isFinite(t) ? t : 0) * YEARS_PER_SECOND / 10 + 1e-9)));

function bump(series: number[] | undefined, k: number, n: number): number[] {
  const out = (series ?? []).slice(0, DECISION_DECADES_MAX);
  while (out.length <= k) out.push(0);
  out[k] += n;
  return out;
}
export function recordDecision(run: RunStats, time: number): RunStats {
  return { ...run, decisions: (run.decisions ?? 0) + 1, decisionsByDecade: bump(run.decisionsByDecade, decadeIndex(time), 1) };
}
export function recordAutomated(run: RunStats, time: number, n = 1): RunStats {
  if (n <= 0) return run;
  return { ...run, automated: (run.automated ?? 0) + n, automatedByDecade: bump(run.automatedByDecade, decadeIndex(time), n) };
}
export function recordOpening(run: RunStats, t: number, kind: OpeningAction['kind'], id: string, by: Actor): RunStats {
  const op = run.opening ?? [];
  if (op.length >= OPENING_MAX) return run;
  return { ...run, opening: [...op, { t, kind, id, by }] };
}

/**
 * Wraps an in-run player action: a call that returns a new state counts one decision in the model decade of the
 * state's time. `counts(prev, next)` may veto (setOrders while fresh).
 */
export function asDecision<A extends unknown[]>(
  fn: (state: GameState, content: Content, ...args: A) => GameState,
  counts?: (prev: GameState, next: GameState, content: Content) => boolean,
): (state: GameState, content: Content, ...args: A) => GameState {
  return (state, content, ...args) => {
    const next = fn(state, content, ...args);
    if (next === state || (counts && !counts(state, next, content))) return next;
    return { ...next, run: recordDecision(next.run, state.time) };
  };
}
