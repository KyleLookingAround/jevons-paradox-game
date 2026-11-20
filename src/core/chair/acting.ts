/**
 * M5 (Core A): how a lever acts in a Ministry (layer 0, so effects.ts and levers.ts can read it): the effective level
 * (carve-outs and litigation; RivalState doc), the escape of its used loophole rungs (LoopholeDef), and the rival's
 * concealed share of a sector (ChairState, the inspection rules). Outside a Ministry every function returns the M4
 * value (the level; escape 0; concealment 0) at the cost of one null check.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { LOOPHOLE_ESCAPE_MAX } from '../../types';
import type { ChairState, Content, GameState, LoopholeDef, LoopholeState, SectorId } from '../../types';
import { chairIdx } from './chairIndex';

const lvl = (state: GameState, id: string): number => state.levers[id]?.level ?? 0;

/**
 * The effective level of lever `id` (RivalState doc): litigated → `from` until `until`; else level − 1 under a carve-out
 * won this Parliament; floored at 0. Outside a Ministry: the level.
 */
export function effectiveLevel(state: GameState, id: string): number {
  const level = lvl(state, id);
  const ch = state.chair;
  if (!ch) return level;
  return effectiveOf(ch, id, level, state.time);
}
export function effectiveOf(ch: ChairState, id: string, level: number, time: number): number {
  const lit = ch.litigation[id];
  if (lit && time < lit.until) return Math.max(0, Math.min(level, lit.from));
  if (ch.carveOuts[id] === ch.parliament.index) return Math.max(0, level - 1);
  return level;
}

/** A key that changes whenever some lever's effective level differs from its level ('' when none does). */
export function effKey(state: GameState): string {
  const ch = state.chair;
  if (!ch) return '';
  let k = '';
  for (const id in ch.litigation) if (state.time < ch.litigation[id].until) k += `${id}=${ch.litigation[id].from};`;
  for (const id in ch.carveOuts) if (ch.carveOuts[id] === ch.parliament.index) k += `${id}-;`;
  return k;
}

/** The rung acts as used: 'used', or 'drafting' after use (LoopholeState.before). */
export const rungActsUsed = (st: LoopholeState | undefined): boolean =>
  !!st && (st.status === 'used' || (st.status === 'drafting' && st.before === 'used'));

/** Rungs of lever `id` acting as used now (ladder order). [] outside a Ministry. */
export function usedRungs(state: GameState, content: Content, id: string): LoopholeDef[] {
  const ch = state.chair;
  if (!ch) return [];
  const rungs = chairIdx(content).ladders.get(id);
  if (!rungs) return [];
  let out: LoopholeDef[] | null = null;
  for (const r of rungs) if (rungActsUsed(ch.loopholes[r.id])) (out ??= []).push(r);
  return out ?? [];
}

/** The share of lever `id`'s grip that escapes through its used rungs: 1 − Π (1 − escape), each clamped. */
export function leverEscape(state: GameState, content: Content, id: string): number {
  const ch = state.chair;
  if (!ch) return 0;
  const rungs = chairIdx(content).ladders.get(id);
  if (!rungs) return 0;
  let keep = 1;
  for (const r of rungs) {
    if (!rungActsUsed(ch.loopholes[r.id])) continue;
    const e = Number.isFinite(r.escape) ? Math.min(LOOPHOLE_ESCAPE_MAX, Math.max(0, r.escape)) : 0;
    keep *= 1 - e;
  }
  return 1 - keep;
}

/** The rival's TRUE concealed share of sector s (0 outside a Ministry). */
export function concealOf(state: GameState, s: SectorId): number {
  const c = state.chair?.rival.concealment[s];
  return typeof c === 'number' && c > 0 ? Math.min(0.99, c) : 0;
}
