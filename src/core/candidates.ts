/**
 * M5 (Core A): the candidate rule shared by the Market (orders.ts) and the rival (chair/rival.ts): whole-state flows with
 * a card raised or an application founded, marketGain, and bestCandidate. Split out of orders.ts without changing the
 * Market's behaviour (M4's golden runs are byte-identical).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState, SectorId, UpgradeDef } from '../types';
import { idx } from './contentIndex';
import { modsOf, etaAt, isForbidden } from './effects';
import { computeFlows } from './flows';
import type { Flows } from './flows';
import { foundCostOf, upgradeCost, upgradeExcludedBy, upgradeMax, upgradeVisible } from './purchases';
import { fin } from './util';

/**
 * The Market's view of one candidate: whole-state flows with the upgrade raised one level (η recomputed for every open
 * sector) or the application founded. No time passes.
 */
export function flowsWithUpgrade(state: GameState, content: Content, id: string, reserve = false): Flows {
  const draft0: GameState = { ...state, upgrades: { ...state.upgrades, [id]: (state.upgrades[id] ?? 0) + 1 } };
  const mods = modsOf(draft0, content);
  const sectors = { ...state.sectors };
  for (const s of idx(content).ids) {
    const es = sectors[s];
    if (es?.open && !es.settled) sectors[s] = { ...es, eta: etaAt(content.sectors[s], mods, es.openFor) };
  }
  // M5 (follow-up), the rival only: a stock reserveAdd acts at the purchase (applyUpgrade), so the draft adds it here and
  // its value is the dearer resource it spares (p_r falls with reserve / reserveMax). The Market's view is unchanged.
  if (reserve) {
    for (const ef of idx(content).upgrades.get(id)?.effects ?? []) {
      if (ef.type !== 'reserveAdd') continue;
      const sd = content.sectors[ef.sector], es = sectors[ef.sector];
      if (!sd || !es?.open || es.settled || sd.resourceKind !== 'stock') continue;
      const a = ef.value * sd.reserve;
      sectors[ef.sector] = { ...es, reserve: es.reserve + a, reserveMax: es.reserveMax + a };
    }
  }
  return computeFlows({ ...draft0, sectors }, content);
}
export function flowsWithApp(state: GameState, content: Content, s: SectorId, appId: string): Flows {
  const es = state.sectors[s];
  const draft: GameState = { ...state, sectors: { ...state.sectors, [s]: { ...es, apps: { ...es.apps, [appId]: { ...es.apps[appId], founded: true } } } } };
  return computeFlows(draft, content);
}

/**
 * What a candidate pays per second, as the Market sees it (see OrdersState): the running cost it saves at today's
 * output, Σ over solved sectors of D_now × max(0, p_pre now − p_pre after) (coal no longer bought, cheaper engines),
 * plus any rise in whole-state income, max(0, income after − income now). The first term is how an engine was sold
 * ("a third of the coal it saves"); the second is how an application is. Neither ever counts a loss.
 */
export function marketGain(f0: Flows, f1: Flows): number {
  let saved = 0;
  for (const s in f0.sectors) {
    const a = f0.sectors[s], b = f1.sectors[s];
    if (!a || !b || f0.settled[s] !== undefined) continue;
    saved += Math.max(0, a.D) * Math.max(0, a.pPre - b.pPre);
  }
  return fin(saved) + Math.max(0, fin(f1.income - f0.income));
}

export type LogEntry = GameState['orderLog'][string];

/**
 * M5 (Core A): the candidate rule shared by the Market and the rival (OrdersState; RivalDef "THE YEARLY DECISION"): every
 * available, unfounded application and every visible 'efficiency' or 'capital' card of sector s is priced by
 * marketGain on whole-state flows; the cheapest payback within the limit wins. `capital` is the purse that must cover the
 * cost; foundings are judged against `foundPaybackMax`, cards against `paybackMax`; `fork` decides whether a fork arm
 * (a card with `excludes`) may be considered (the Market: never); `share` is the part of a card's or application's cost
 * the buyer pays (a subsidy: 1 − value; affordability and payback both use it). The Market's call is the M4 rule exactly.
 */
export interface CandidateRule {
  capital: number;
  paybackMax: number;
  foundPaybackMax: number;
  fork: ((u: UpgradeDef) => boolean) | null;
  share: ((id: string) => number) | null;
  /** M5 (follow-up): value a card's stock reserveAdd (the rival; the Market: false/absent, as M4). */
  reserve?: boolean;
}
export interface Candidate { kind: 'found' | 'upgrade'; id: string; payback: number; cost: number }
export function bestCandidate(state: GameState, content: Content, s: SectorId, rule: CandidateRule): { best: Candidate | null; log: LogEntry } {
  const def = content.sectors[s];
  const es = state.sectors[s];
  const f0 = computeFlows(state, content);
  const mods = modsOf(state, content);
  let best: Candidate | null = null;
  let eligible = 0, affordable = 0, bestAny = Infinity;
  const consider = (kind: 'found' | 'upgrade', id: string, cost: number, f1: Flows, max: number) => {
    const gain = marketGain(f0, f1);
    const payback = gain > 0 ? cost / gain : Infinity;
    if (payback < bestAny) bestAny = payback;
    if (payback <= max && (best === null || payback < best.payback)) best = { kind, id, payback, cost };
  };
  for (const a of def.applications) {
    const st = es.apps[a.id];
    if (!st?.available || st.founded || isForbidden(mods, a.id)) continue;
    eligible++;
    const cost = foundCostOf(a, s, mods) * (rule.share ? rule.share(a.id) : 1);
    if (!(cost <= rule.capital)) continue;
    affordable++;
    consider('found', a.id, cost, flowsWithApp(state, content, s, a.id), rule.foundPaybackMax);
  }
  for (const u of content.upgrades ?? []) {
    if (u.sector !== s || (u.kind !== 'efficiency' && u.kind !== 'capital')) continue;
    if (u.excludes && u.excludes.length && !(rule.fork && rule.fork(u))) continue;
    const lvl = state.upgrades[u.id] ?? 0;
    if (lvl >= upgradeMax(u) || !upgradeVisible(state, u, mods, content) || upgradeExcludedBy(state, content, u.id)) continue;
    if (isForbidden(mods, u.id)) continue;
    eligible++;
    const cost = upgradeCost(u, lvl, mods) * (rule.share ? rule.share(u.id) : 1);
    if (!(cost <= rule.capital)) continue;
    affordable++;
    consider('upgrade', u.id, cost, flowsWithUpgrade(state, content, u.id, rule.reserve === true), rule.paybackMax);
  }
  const t = state.time;
  if (best === null) {
    return { best: null, log: eligible === 0 ? { t, outcome: 'none' } : affordable === 0 ? { t, outcome: 'cash' } : { t, outcome: 'payback', payback: fin(bestAny, Number.MAX_VALUE) } };
  }
  return { best, log: { t, outcome: 'bought', id: (best as Candidate).id } };
}

