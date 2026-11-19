/**
 * Standing orders (M2): order ticks, availability, the Market, the Civil Service, Treasury rules, setOrders and the
 * OrdersView. runOrders is the one call at the very end of step(): one comparison when there is nothing to do.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND, BUDGET_TOLERANCE } from '../types';
import type { Content, GameState, MarketWhy, OrderId, OrdersPatch, OrdersState, OrdersView, SectorId } from '../types';
import { commonsOpen } from './commons';
import { buyCommonsAs, commonsBuyable } from './commonsActions';
import {
  DEFAULT_ORDER_INTERVAL_YEARS, DEFAULT_MARKET_FROM_RECKONING, DEFAULT_PAYBACK_CHOICES, PAYBACK_MIN, ORDER_SECONDS_MAX,
} from './constants';
import { idx } from './contentIndex';
import { modsOf, etaAt, isForbidden, suspended, leverMulOf } from './effects';
import type { Mods } from './effects';
import { computeFlows, steadyView } from './flows';
import type { Flows } from './flows';
import { leverLevelDef, leverMaxLevel, leverNetUpkeep, leverVisible } from './levers';
import { setLeverAs } from './policy';
import { buyUpgradeAs, foundAppAs, foundCostOf, upgradeCost, upgradeExcludedBy, upgradeMax, upgradeVisible } from './purchases';
import { recordAutomated } from './record';
import { defaultOrders, isFreshRun } from './state';
import { clamp, fin, isObj } from './util';
import { featureOn } from './features';

/* ------------------------------------------------------------------ */
/* Ticks and availability                                              */
/* ------------------------------------------------------------------ */

export function intervalYears(content: Content): number {
  const v = content.global?.orders?.intervalYears;
  return typeof v === 'number' && v > 0 && Number.isFinite(v) ? v : DEFAULT_ORDER_INTERVAL_YEARS;
}
/** Seconds of run time until the next order tick. */
export function nextTickIn(time: number, content: Content): number {
  const iy = intervalYears(content);
  const k = Math.floor((time * YEARS_PER_SECOND) / iy + 1e-9);
  return Math.max(0, fin(((k + 1) * iy) / YEARS_PER_SECOND - time));
}
export function ordersOf(state: GameState, content: Content): OrdersState {
  return state.meta.orders ?? defaultOrders(content);
}
export function marketAvailable(state: GameState, content: Content, mods: Mods): boolean {
  const from = content.global?.orders?.marketFromReckoning ?? DEFAULT_MARKET_FROM_RECKONING;
  return (state.meta.reckonings >= from || mods.orderUnlock.has('market')) && featureOn(content, state.meta, 'market')
    && !suspended(state.meta, content, 'market') && !mods.suspendOrder.has('market');
}
/** M3: the standing dispatch order is available (a standing orderUnlock 'dispatch'). */
export const dispatchOrderAvailable = (mods: Mods): boolean => mods.orderUnlock.has('dispatch') && !mods.suspendOrder.has('dispatch');
/** M2: the Civil Service and the Treasury rules are available (a standing orderUnlock; M3 finish: not suspended). */
const orderOn = (mods: Mods, o: 'civilService' | 'treasury'): boolean => mods.orderUnlock.has(o) && !mods.suspendOrder.has(o);

/* ------------------------------------------------------------------ */
/* The orders                                                          */
/* ------------------------------------------------------------------ */

/**
 * The Market's view of one candidate: whole-state flows with the upgrade raised one level (η recomputed for every open
 * sector) or the application founded. No time passes.
 */
function flowsWithUpgrade(state: GameState, content: Content, id: string): Flows {
  const draft0: GameState = { ...state, upgrades: { ...state.upgrades, [id]: (state.upgrades[id] ?? 0) + 1 } };
  const mods = modsOf(draft0, content);
  const sectors = { ...state.sectors };
  for (const s of idx(content).ids) {
    const es = sectors[s];
    if (es?.open && !es.settled) sectors[s] = { ...es, eta: etaAt(content.sectors[s], mods, es.openFor) };
  }
  return computeFlows({ ...draft0, sectors }, content);
}
function flowsWithApp(state: GameState, content: Content, s: SectorId, appId: string): Flows {
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

type LogEntry = GameState['orderLog'][string];
/** The Market's one action in sector s, or the same state; `log` receives the outcome (GameState.orderLog). */
function marketIn(state: GameState, content: Content, s: SectorId, paybackMax: number, log: (e: LogEntry) => void): GameState {
  const def = content.sectors[s];
  const es = state.sectors[s];
  const f0 = computeFlows(state, content);
  const mods = modsOf(state, content);
  let best: { kind: 'found' | 'upgrade'; id: string; payback: number } | null = null;
  let eligible = 0, affordable = 0, bestAny = Infinity;
  const consider = (kind: 'found' | 'upgrade', id: string, cost: number, f1: Flows) => {
    const gain = marketGain(f0, f1);
    const payback = gain > 0 ? cost / gain : Infinity;
    if (payback < bestAny) bestAny = payback;
    if (payback <= paybackMax && (best === null || payback < best.payback)) best = { kind, id, payback };
  };
  for (const a of def.applications) {
    const st = es.apps[a.id];
    if (!st?.available || st.founded || isForbidden(mods, a.id)) continue;
    eligible++;
    const cost = foundCostOf(a, s, mods);
    if (!(cost <= state.capital)) continue;
    affordable++;
    consider('found', a.id, cost, flowsWithApp(state, content, s, a.id));
  }
  for (const u of content.upgrades ?? []) {
    if (u.sector !== s || (u.kind !== 'efficiency' && u.kind !== 'capital') || (u.excludes && u.excludes.length)) continue;
    const lvl = state.upgrades[u.id] ?? 0;
    if (lvl >= upgradeMax(u) || !upgradeVisible(state, u, mods, content) || upgradeExcludedBy(state, content, u.id)) continue;
    if (isForbidden(mods, u.id)) continue;
    eligible++;
    const cost = upgradeCost(u, lvl, mods);
    if (!(cost <= state.capital)) continue;
    affordable++;
    consider('upgrade', u.id, cost, flowsWithUpgrade(state, content, u.id));
  }
  const t = state.time;
  if (best === null) {
    log(eligible === 0 ? { t, outcome: 'none' } : affordable === 0 ? { t, outcome: 'cash' } : { t, outcome: 'payback', payback: fin(bestAny, Number.MAX_VALUE) });
    return state;
  }
  const b = best as { kind: 'found' | 'upgrade'; id: string };
  log({ t, outcome: 'bought', id: b.id });
  return b.kind === 'found' ? foundAppAs(state, content, b.id, 'market') : buyUpgradeAs(state, content, b.id, 'market');
}

/** The Civil Service in sector s: raise the cheapest listed lever when over the line; lower the costliest per the rule. */
function civilIn(state: GameState, content: Content, s: SectorId, list: string[]): GameState {
  const fl = computeFlows(state, content);
  const f = fl.sectors[s];
  const sv = steadyView(state, content, fl, s);
  if (!f || sv.budgetR === null) return state;
  const mods = modsOf(state, content);
  const ix = idx(content);
  const listed = list.map((id) => ix.levers.get(id)).filter((l) => l !== undefined && l.sector === s && leverVisible(state, content, l, mods));
  if (f.R > sv.budgetR * (1 + BUDGET_TOLERANCE)) {
    let pick: { id: string; level: number; cost: number } | null = null;
    for (const l of listed) {
      const lvl = state.levers[l!.id]?.level ?? 0;
      if (lvl >= leverMaxLevel(l!) || isForbidden(mods, l!.id, l!)) continue;
      const cost = lvl + 1 <= (mods.startLevers[l!.id] ?? 0) ? 0 : (leverLevelDef(l!, lvl + 1)?.mandateCost ?? 0) * leverMulOf(mods, l!).cost;
      if (!(state.mandate >= cost)) continue;
      if (pick === null || cost < pick.cost) pick = { id: l!.id, level: lvl, cost };
    }
    return pick ? setLeverAs(state, content, pick.id, pick.level + 1, 'civilService') : state;
  }
  if (fl.wellbeing < sv.decadeW && f.R <= 0.9 * sv.budgetR) {
    let pick: { id: string; level: number; up: number } | null = null;
    for (const l of listed) {
      const lvl = state.levers[l!.id]?.level ?? 0;
      if (lvl <= 0) continue;
      const up = leverNetUpkeep(l!, lvl, mods.startLevers[l!.id] ?? 0, leverMulOf(mods, l!).upkeep);
      if (pick === null || up > pick.up) pick = { id: l!.id, level: lvl, up };
    }
    return pick ? setLeverAs(state, content, pick.id, pick.level - 1, 'civilService') : state;
  }
  return state;
}

/**
 * The standing orders at the end of a step: `next` itself unless the step is an order tick, not a projection, and some
 * order is active (then Market, Civil Service, Treasury rules, in that order).
 */
export function runOrders(prev: GameState, next: GameState, content: Content, lite: boolean): GameState {
  if (lite) return next;
  const iy = intervalYears(content);
  if (Math.floor((next.time * YEARS_PER_SECOND) / iy + 1e-9) <= Math.floor((prev.time * YEARS_PER_SECOND) / iy + 1e-9)) return next;
  const o = next.meta.orders;
  if (!o || (!o.market.on && !o.civilService.on && !o.treasury.on)) return next;
  if (isFreshRun(next) || computeFlows(next, content).pending) return next;
  const mods = modsOf(next, content);
  const ix = idx(content);
  let s = next;
  let auto = 0;
  let orderLog: GameState['orderLog'] | null = null;
  if (o.market.on && marketAvailable(s, content, mods)) {
    for (const id of ix.ids) {
      const es = s.sectors[id];
      if (!es?.open || es.settled || o.market.sectors[id] === false) continue;
      const t = marketIn(s, content, id, o.market.paybackMax, (e) => { (orderLog ??= { ...(next.orderLog ?? {}) })[id] = e; });
      if (t !== s) { s = t; auto++; }
    }
  }
  if (orderLog) s = { ...s, orderLog };
  if (o.civilService.on && orderOn(mods, 'civilService')) {
    for (const id of ix.ids) {
      const es = s.sectors[id];
      const list = o.civilService.levers[id];
      if (!es?.open || es.settled || !es.budget || !list || !list.length) continue;
      const t = civilIn(s, content, id, list);
      if (t !== s) { s = t; auto++; }
    }
  }
  if (o.treasury.on && orderOn(mods, 'treasury') && commonsOpen(s, content)) {
    const keep = Math.max(0, o.treasury.keepSeconds) * Math.max(0, computeFlows(s, content).income);
    for (const id of o.treasury.projects) {
      const def = ix.commons.get(id);
      if (!def || !commonsBuyable(s, content, def, s.capital - keep)) continue;
      const t = buyCommonsAs(s, content, id, 'treasury');
      if (t !== s) { s = t; auto++; }
      break;
    }
  }
  return auto ? { ...s, run: recordAutomated(s.run, next.time, auto) } : s;
}

/* ------------------------------------------------------------------ */
/* setOrders and the view                                              */
/* ------------------------------------------------------------------ */

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Validate and merge a patch onto `cur` (see OrdersPatch): a new OrdersState. Also used to sanitise a loaded save. */
export function mergeOrders(cur: OrdersState, patch: unknown, content: Content): OrdersState {
  const ix = idx(content);
  const out: OrdersState = {
    market: { ...cur.market, sectors: { ...cur.market.sectors } },
    civilService: { ...cur.civilService, levers: { ...cur.civilService.levers } },
    treasury: { ...cur.treasury, projects: cur.treasury.projects.slice() },
    dispatch: { on: cur.dispatch?.on ?? false, cast: { ...(cur.dispatch?.cast ?? {}) } },
  };
  if (!isObj(patch)) return out;
  const dp = patch.dispatch;
  if (isObj(dp)) {
    if (typeof dp.on === 'boolean') out.dispatch.on = dp.on;
    if (isObj(dp.cast)) for (const [k, v] of Object.entries(dp.cast)) if (ix.cast.has(k) && typeof v === 'boolean') out.dispatch.cast[k] = v;
  }
  const m = patch.market;
  if (isObj(m)) {
    if (typeof m.on === 'boolean') out.market.on = m.on;
    if (typeof m.paybackMax === 'number' && Number.isFinite(m.paybackMax)) out.market.paybackMax = clamp(m.paybackMax, PAYBACK_MIN, ORDER_SECONDS_MAX);
    if (isObj(m.sectors)) for (const [k, v] of Object.entries(m.sectors)) if (ix.pos.has(k) && typeof v === 'boolean') out.market.sectors[k] = v;
  }
  const c = patch.civilService;
  if (isObj(c)) {
    if (typeof c.on === 'boolean') out.civilService.on = c.on;
    if (isObj(c.levers)) {
      for (const [k, v] of Object.entries(c.levers)) {
        if (!ix.pos.has(k) || !Array.isArray(v)) continue;
        out.civilService.levers[k] = v.filter((id, i) => typeof id === 'string' && ix.levers.get(id)?.sector === k && v.indexOf(id) === i);
      }
    }
  }
  const t = patch.treasury;
  if (isObj(t)) {
    if (typeof t.on === 'boolean') out.treasury.on = t.on;
    if (typeof t.keepSeconds === 'number' && Number.isFinite(t.keepSeconds)) out.treasury.keepSeconds = clamp(t.keepSeconds, 0, ORDER_SECONDS_MAX);
    if (Array.isArray(t.projects)) {
      const pr = t.projects as unknown[];
      out.treasury.projects = pr.filter((id, i): id is string => typeof id === 'string' && ix.commons.has(id) && pr.indexOf(id) === i);
    }
  }
  return out;
}

/** ModelApi.setOrders: validated merge; the same reference when nothing changes. (The decision is counted in index.ts.) */
export function setOrders(state: GameState, content: Content, patch: OrdersPatch): GameState {
  if (!isObj(patch)) return state;
  const cur = ordersOf(state, content);
  const out = mergeOrders(cur, patch, content);
  if (sameJson(out, cur)) return state;
  return { ...state, meta: { ...state.meta, orders: out } };
}

export function ordersView(state: GameState, content: Content): OrdersView {
  const o = ordersOf(state, content);
  const mods = modsOf(state, content);
  const sectors: Record<SectorId, boolean> = {};
  for (const s of idx(content).ids) if (state.sectors[s]?.open) sectors[s] = o.market.sectors[s] !== false;
  return {
    market: {
      available: marketAvailable(state, content, mods), on: o.market.on, paybackMax: o.market.paybackMax,
      paybackChoices: (content.global?.orders?.paybackChoices ?? DEFAULT_PAYBACK_CHOICES).slice(), sectors,
    },
    civilService: { available: orderOn(mods, 'civilService'), on: o.civilService.on, levers: { ...o.civilService.levers } },
    treasury: { available: orderOn(mods, 'treasury'), on: o.treasury.on, keepSeconds: o.treasury.keepSeconds, projects: o.treasury.projects.slice() },
    nextTickIn: nextTickIn(state.time, content),
    marketWhy: marketWhyOf(state, content, o, mods),
    dispatch: { available: dispatchOrderAvailable(mods), on: o.dispatch?.on ?? false, cast: { ...(o.dispatch?.cast ?? {}) } },
    kind: { ...ORDER_KIND },
  };
}

/** M3: shift 3's label per order, fixed by the contract (OrdersView.kind). */
const ORDER_KIND: Record<OrderId, 'opening' | 'closing'> = { market: 'opening', civilService: 'closing', treasury: 'closing', dispatch: 'closing' };

/** M3: OrdersView.marketWhy: the static reasons first, else the last order tick's outcome, else 'waiting'. */
export function marketWhyOf(state: GameState, content: Content, o: OrdersState, mods: Mods): Record<SectorId, MarketWhy> {
  const out: Record<SectorId, MarketWhy> = {};
  const avail = marketAvailable(state, content, mods);
  const fresh = isFreshRun(state);
  const pending = !!computeFlows(state, content).pending;
  for (const s of idx(content).ids) {
    const es = state.sectors[s];
    if (!es?.open) continue;
    let w: MarketWhy;
    if (!avail) w = { reason: 'unavailable' };
    else if (!o.market.on) w = { reason: 'off' };
    else if (o.market.sectors[s] === false) w = { reason: 'sectorOff' };
    else if (es.settled) w = { reason: 'settled' };
    else if (fresh) w = { reason: 'fresh' };
    else if (pending) w = { reason: 'pending' };
    else {
      const e = state.orderLog?.[s];
      if (!e) w = { reason: 'waiting' };
      else if (e.outcome === 'bought') w = { reason: 'bought', id: e.id ?? '', at: e.t };
      else if (e.outcome === 'payback') w = { reason: 'payback', payback: e.payback ?? Infinity, at: e.t };
      else w = { reason: e.outcome, at: e.t };
    }
    out[s] = w;
  }
  return out;
}
