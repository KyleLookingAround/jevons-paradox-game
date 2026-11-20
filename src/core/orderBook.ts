/**
 * M4: the order book's views (SectorDerived.feeds on a feed source, AppDerived.feeds): the factor a source puts on each
 * target's c and what its feeds add to the target's R (rAdded: target R now − target R with this source's feeds removed,
 * same state, no time), computed at most once per PROJECTION_BUCKET of run time per (upgrades, levers) as M3's temptation
 * views are. The arithmetic of a feed is feeds.ts.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState, SectorDerived, SectorId } from '../types';
import { PROJECTION_BUCKET } from './constants';
import { idx } from './contentIndex';
import { adoptionIn, feedFactor, feedMulFrom } from './feeds';
import { computeFlows, flowsWithoutFeeds } from './flows';
import { budgetROf } from './steady';
import { fin } from './util';

const cache = new WeakMap<object, WeakMap<object, Map<string, Record<SectorId, number>>>>();

/** True when sector s has a founded application with feeds this run (or a settled one with a frozen adoption). */
function feeding(state: GameState, content: Content, s: SectorId): boolean {
  const es = state.sectors[s];
  if (!es?.open) return false;
  return content.sectors[s].applications.some((a) => (a.feeds?.length ?? 0) > 0 && (es.settled ? (es.settled.appAdoption[a.id] ?? 0) > 0 : !!es.apps[a.id]?.founded));
}

/** rAdded per target for source s (exact for the state that fills the bucket's cache entry). */
export function rAddedOf(state: GameState, content: Content, s: SectorId): Record<SectorId, number> {
  let byLev = cache.get(state.upgrades);
  if (!byLev) { byLev = new WeakMap(); cache.set(state.upgrades, byLev); }
  let m = byLev.get(state.levers);
  if (!m) { m = new Map(); byLev.set(state.levers, m); }
  const es = state.sectors[s];
  const founded = content.sectors[s].applications.map((a) => (es?.apps[a.id]?.founded ? 1 : 0)).join('');
  const k = `${s}|${Math.floor(state.time / PROJECTION_BUCKET)}|${state.meta.reckonings}|${founded}|${es?.settled ? 'S' : ''}`;
  const hit = m.get(k);
  if (hit) return hit;
  const fl = computeFlows(state, content);
  const without = flowsWithoutFeeds(state, content, s);
  const out: Record<SectorId, number> = {};
  for (const t of idx(content).feedTargets.get(s) ?? []) {
    const a = fl.sectors[t], b = without.sectors[t];
    if (a && b && !state.sectors[t]?.settled) out[t] = fin(a.R - b.R);
  }
  if (m.size > 400) m.clear();
  m.set(k, out);
  return out;
}

/** SectorDerived.feeds (null when the sector has no founded application with feeds). */
export function feedsView(state: GameState, content: Content, s: SectorId): NonNullable<SectorDerived['feeds']> | null {
  const ix = idx(content);
  const tg = ix.feedTargets.get(s);
  if (!tg || !feeding(state, content, s)) return null;
  const fl = computeFlows(state, content);
  let added: Record<SectorId, number> | null = null;
  const out: NonNullable<SectorDerived['feeds']> = [];
  for (const t of tg) {
    const et = state.sectors[t];
    if (!et?.open || et.settled || !fl.sectors[t]) continue;
    const factor = feedMulFrom(ix, fl.sectors, s, t);
    added ??= rAddedOf(state, content, s);
    const rAdded = added[t] ?? null;
    const b = budgetROf(et, content.sectors[t], content, state.time);
    out.push({ to: t, factor, rAdded, lineShare: rAdded !== null && b !== null && b > 0 ? fin(rAdded / b) : null });
  }
  return out;
}

/** AppDerived.feeds: target → f for application i of sector s (1 while unfounded), null without feeds. */
export function appFeedsView(state: GameState, content: Content, s: SectorId, i: number): Record<SectorId, number> | null {
  const a = content.sectors[s].applications[i];
  if (!a?.feeds?.length) return null;
  const ix = idx(content);
  const fl = computeFlows(state, content);
  const f = fl.sectors[s];
  const out: Record<SectorId, number> = {};
  for (const t of ix.feedTargets.get(s) ?? []) {
    if (!state.sectors[t]?.open) continue;
    let m = 1;
    let any = false;
    for (const e of ix.feedsInto[t] ?? []) if (e.src === s && e.app === i) { any = true; m *= f ? feedFactor(e.mul, adoptionIn(f, i)) : 1; }
    if (any) out[t] = m;
  }
  return out;
}
