/**
 * M4: feeds (ApplicationDef.feeds, the order book): the factor a source's founded applications put on a target's c, and
 * how a source's R is handed on to the targets it feeds (the full account's feed part). Layer 4 (below flows.ts, which
 * calls it inside the solve); the order book's views with rAdded live in orderBook.ts.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { GameState, SectorId } from '../types';
import type { ContentIndex } from './contentIndex';
import type { SectorFlow } from './solver';
import { clamp } from './util';

/** Adoption of application i in a solved (or settled) flow: demand / saturation, 0–1. */
export function adoptionIn(f: SectorFlow, i: number): number {
  const sat = f.appSat[i];
  return sat > 0 ? clamp(f.appD[i] / sat, 0, 1) : 0;
}

/** One feed's factor: f = 1 − (1 − capCostMul) × a. */
export const feedFactor = (mul: number, a: number): number => 1 - (1 - mul) * a;

/**
 * The combined factor on target t's c: Π over the feeds into t whose source is open and solved (in `fls`), skipping
 * `skip` (a source whose feeds are removed, for rAdded). 1 without feeds.
 */
export function feedMulOf(ix: ContentIndex, fls: Record<SectorId, SectorFlow>, state: GameState, t: SectorId, skip?: SectorId): number {
  const list = ix.feedsInto[t];
  if (!list) return 1;
  let m = 1;
  for (const e of list) {
    if (e.src === skip || !state.sectors[e.src]?.open) continue;
    const f = fls[e.src];
    if (!f) continue;
    m *= feedFactor(e.mul, adoptionIn(f, e.app));
  }
  return m;
}

/** M4 (finish): one demand feed's saturation factor: g = 1 + (satMul − 1) × a. */
export const feedSatFactor = (sat: number, a: number): number => 1 + (sat - 1) * a;

/**
 * M4 (finish): the demand feeds into target t (ApplicationDef.feeds[].satMul): saturation multipliers keyed by the
 * target's application id, or '*' for every application of t, from the sources open and solved in `fls` (skipping
 * `skip`, as feedMulOf). null when none act (no field, no change).
 */
export function feedSatOf(ix: ContentIndex, fls: Record<SectorId, SectorFlow>, state: GameState, t: SectorId, skip?: SectorId): Record<string, number> | null {
  const list = ix.feedsInto[t];
  if (!list) return null;
  let out: Record<string, number> | null = null;
  for (const e of list) {
    if (e.sat === undefined || e.src === skip || !state.sectors[e.src]?.open) continue;
    const f = fls[e.src];
    if (!f) continue;
    const g = feedSatFactor(e.sat, adoptionIn(f, e.app));
    if (g === 1) continue;
    out ??= {};
    const k = e.tApp ?? '*';
    out[k] = (out[k] ?? 1) * g;
  }
  return out;
}

/** The factor one source puts on one target (its feeding apps multiplied), from solved flows. */
export function feedMulFrom(ix: ContentIndex, fls: Record<SectorId, SectorFlow>, src: SectorId, t: SectorId): number {
  const f = fls[src];
  if (!f) return 1;
  let m = 1;
  for (const e of ix.feedsInto[t] ?? []) if (e.src === src) m *= feedFactor(e.mul, adoptionIn(f, e.app));
  return m;
}

/**
 * The full account's feed part for source s: its R split by demand share over its founded applications (D as the
 * denominator, so extra demand's share stays); an application with feeds hands its whole share to its targets in
 * proportion to (1 − f_t), over targets that are open, solved and unsettled (a settled target is not fed). Returns
 * target → R handed (empty when nothing is handed).
 */
export function handedByFeeds(ix: ContentIndex, fls: Record<SectorId, SectorFlow>, state: GameState, s: SectorId): Record<SectorId, number> {
  const out: Record<SectorId, number> = {};
  const f = fls[s];
  const tg = ix.feedTargets.get(s);
  if (!f || !tg || !(f.D > 0) || !(f.R > 0)) return out;
  const nApps = f.appD.length;
  for (let i = 0; i < nApps; i++) {
    const d = f.appD[i];
    if (!(d > 0)) continue;
    let wsum = 0;
    const ws: [SectorId, number][] = [];
    for (const t of tg) {
      const et = state.sectors[t];
      if (!et?.open || et.settled) continue; // (not "solved": the weights are the source's, so a cap mid-solve sees the same)
      let w = 0;
      for (const e of ix.feedsInto[t] ?? []) if (e.src === s && e.app === i) w += 1 - feedFactor(e.mul, adoptionIn(f, i)) + (e.sat !== undefined ? feedSatFactor(e.sat, adoptionIn(f, i)) - 1 : 0);
      if (w > 0) { ws.push([t, w]); wsum += w; }
    }
    if (!(wsum > 0)) continue;
    const share = f.R * (d / f.D);
    for (const [t, w] of ws) out[t] = (out[t] ?? 0) + share * (w / wsum);
  }
  return out;
}
