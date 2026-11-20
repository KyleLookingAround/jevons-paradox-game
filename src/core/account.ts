/**
 * M4 (The Survey): the full account (SectorDerived.fullR / embodied; BudgetState.account 'full'): the resource used on
 * each sector's behalf, wherever it was burnt. One deterministic pass per flows object (cached): feeds hand a source's R
 * on to the sectors it feeds (feeds.ts), drawsOn hands the drawn share of the target's R to the drawer; an R handed on is
 * not handed on again (handed amounts are shares of each sector's OWN R), so Σ fullR = Σ R over open sectors. Foreign
 * catch is nobody's (it is not in R). A settled sector's frozen R takes part with its frozen adoption and draws.
 * Gated by feature 'estimates' (accountOn): only content that defines it has the full account (see the progress note:
 * content without M4 fields, whose 'estimates' is undefined and so "always on", keeps the M3 chimney account).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { BudgetState, Content, GameState, MetaState, SectorId } from '../types';
import { newBudget } from './steady';
import { idx } from './contentIndex';
import { featureOn } from './features';
import { handedByFeeds } from './feeds';
import type { SectorFlow } from './solver';

/** Feature 'estimates' is defined by content and unlocked (the full account and the growing years left are shown). */
export function accountOn(content: Content, meta: MetaState): boolean {
  return !!content.features?.estimates && featureOn(content, meta, 'estimates');
}

export interface Account { fullR: Record<SectorId, number>; embodied: Record<SectorId, { from: SectorId; R: number }[]>; handedOn: Record<SectorId, number> }
const cache = new WeakMap<object, Account>();

/** The full account of the flows of `state` (any flows object with `sectors`; cached per that object). */
export function fullAccount(state: GameState, content: Content, fl: { sectors: Record<SectorId, SectorFlow> }): Account {
  const hit = cache.get(fl);
  if (hit) return hit;
  const ix = idx(content);
  const fls = fl.sectors;
  const fullR: Record<SectorId, number> = {};
  const handedOn: Record<SectorId, number> = {};
  const recv: Record<SectorId, Record<SectorId, number>> = {};
  const give = (from: SectorId, to: SectorId, r: number) => {
    if (!(r > 0)) return;
    handedOn[from] = (handedOn[from] ?? 0) + r;
    (recv[to] ??= {})[from] = (recv[to]?.[from] ?? 0) + r;
  };
  for (const s of ix.ids) {
    if (!state.sectors[s]?.open || !fls[s]) continue;
    // feeds: the source's applications hand their share on
    if (ix.feedTargets.has(s)) {
      const h = handedByFeeds(ix, fls, state, s);
      for (const t in h) give(s, t, h[t]);
    }
    // drawsOn: the drawn service's share of the target's R goes to the drawer
    const dO = content.sectors[s].drawsOn;
    const t = dO?.sector;
    if (dO && t && state.sectors[t]?.open && fls[t] && fls[t].D > 0) {
      const drawn = Math.max(0, dO.perService * fls[s].D);
      give(t, s, Math.min(1, drawn / fls[t].D) * fls[t].R);
    }
  }
  const embodied: Account['embodied'] = {};
  for (const s of ix.ids) {
    if (!state.sectors[s]?.open || !fls[s]) continue;
    let r = 0;
    const list: { from: SectorId; R: number }[] = [];
    for (const from of ix.ids) { const x = recv[s]?.[from]; if (x !== undefined && x > 0) { list.push({ from, R: x }); r += x; } }
    fullR[s] = fls[s].R - (handedOn[s] ?? 0) + r;
    embodied[s] = list;
  }
  const out = { fullR, embodied, handedOn };
  cache.set(fl, out);
  return out;
}

/** The R a line's tests compare with budgetR: fullR on a 'full' line, else R. */
export function lineR(state: GameState, content: Content, fl: { sectors: Record<SectorId, SectorFlow> }, s: SectorId): number {
  const f = fl.sectors[s];
  if (!f) return 0;
  return state.sectors[s]?.budget?.account === 'full' ? fullAccount(state, content, fl).fullR[s] ?? f.R : f.R;
}

/** A new line for sector s drawn now on the account of the moment (feature 'estimates': 'full', r0 = fullR; else 'own'). */
export function drawLine(state: GameState, content: Content, fl: { sectors: Record<SectorId, SectorFlow> }, s: SectorId, R: number, time: number, year: number, W: number, P: number, pace?: string): BudgetState {
  const full = accountOn(content, state.meta);
  const r0 = full ? fullAccount(state, content, fl).fullR[s] ?? R : R;
  return full && r0 > 0 ? newBudget(content, s, r0, time, year, W, P, pace, 'full') : newBudget(content, s, R, time, year, W, P, pace);
}
