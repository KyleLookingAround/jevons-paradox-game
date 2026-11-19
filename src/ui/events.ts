// The one consumer of GameState.events. It keeps `lastSeen` and hands the page only what is new, so nothing already in
// a save is replayed: lastSeen is set to meta.eventSeq on load, on import and on a new game (resetTo), and after a
// catch-up (skip), whose events the "While you were away" ledger summarises instead of animating one by one.
import type { GameEvent, GameState } from '../types';

export interface EventFeed {
  /** Forget everything up to the save's own counter (load, import, new game). */
  resetTo(state: GameState): void;
  /** Mark everything so far as seen without showing it (after fastForward). */
  skip(state: GameState): void;
  /** The events newer than the last call, oldest first; advances lastSeen. */
  take(state: GameState): GameEvent[];
  lastSeen(): number;
}

export function createEventFeed(): EventFeed {
  let seen = 0;
  const top = (s: GameState) => (typeof s?.meta?.eventSeq === 'number' && Number.isFinite(s.meta.eventSeq) ? s.meta.eventSeq : 0);
  return {
    resetTo(s) { seen = top(s); },
    skip(s) { seen = Math.max(seen, top(s)); },
    take(s) {
      const list = Array.isArray(s?.events) ? s.events : [];
      if (!list.length || list[list.length - 1].seq <= seen) {
        // A counter that went backwards (a restored backup, an older save) starts the feed again from there.
        if (top(s) < seen) seen = top(s);
        return [];
      }
      const out = list.filter((e) => e && typeof e.seq === 'number' && e.seq > seen);
      seen = Math.max(seen, top(s), out.length ? out[out.length - 1].seq : 0);
      return out;
    },
    lastSeen: () => seen,
  };
}
