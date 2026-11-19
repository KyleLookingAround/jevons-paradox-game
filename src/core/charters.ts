/**
 * Charters (M2): mix32, the deterministic offer of two (drawn by reckon() on the new run and kept by every between-runs
 * rebuild), and chooseCharter. A Charter's effects act through Mods (effects.ts) and createState (state.ts).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState } from '../types';
import { calendarYear } from './calendar';
import { evalCond } from './conditions';
import { idx } from './contentIndex';
import { emit } from './events';
import { headline, withNews } from './headlines';
import { isFreshRun, withMeta } from './state';

/** The contract's mixer (GameState.charterOffer). */
export function mix32(x: number): number {
  x = x >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45D9F3B) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45D9F3B) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** The offer for a fresh run (before any Charter), excluding `previous` when that leaves at least two. */
export function drawOffer(state: GameState, content: Content, previous: string | undefined): string[] {
  let E = (content.charters ?? []).filter((c) => !c.requires || evalCond(state, content, c.requires)).map((c) => c.id);
  if (previous !== undefined && E.includes(previous) && E.length - 1 >= 2) E = E.filter((id) => id !== previous);
  const n = E.length;
  if (n <= 2) return E;
  const seed = state.seed >>> 0;
  const i = mix32(seed) % n;
  const j = (i + 1 + (mix32((seed ^ 0x9E3779B9) >>> 0) % (n - 1))) % n;
  return [E[Math.min(i, j)], E[Math.max(i, j)]];
}

export function chooseCharter(state: GameState, content: Content, id: string | null): GameState {
  if (!isFreshRun(state)) return state;
  if (id !== null && (!(state.charterOffer ?? []).includes(id) || !idx(content).charters.has(id))) return state;
  if ((state.meta.charter ?? null) === id) return state;
  const s = withMeta(state, content, { ...state.meta, charter: id });
  if (id === null) return s;
  const def = idx(content).charters.get(id)!;
  const year = calendarYear(s, content);
  const out = { ...s, news: withNews(s.news, [headline(s, content, 'charter', 0, { year, name: def.name }, def.sector)]) };
  return emit(out, [{ kind: 'charterChosen', id }], 0, year);
}
