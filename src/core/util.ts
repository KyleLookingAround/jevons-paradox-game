/**
 * Small numeric helpers shared by every core module.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export const fin = (x: number, fallback = 0): number => (Number.isFinite(x) ? x : fallback);
export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
export const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** The contract's mixer (GameState.charterOffer; M3: the dispatch draw, its gaps and ambient news). */
export function mix32(x: number): number {
  x = x >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45D9F3B) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45D9F3B) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
