/**
 * M3: the cast's dispatches (DispatchDef): the scheduler (expiry, then a draw; see GameState.dispatch), answering
 * (ModelApi.answerDispatch), default resolution (expiry, the standing dispatch order), and Derived.dispatch.
 * The step calls stepDispatch once (step.ts); no draw inside fastForward or useBank, none in projections.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { ANSWERED_MAX, YEARS_PER_SECOND } from '../types';
import type { Actor, AnsweredDispatch, CastDef, Content, DispatchDef, DispatchesView, GameState, NewsItem, PendingDispatchView, WagerBranch } from '../types';
import { calendarYear, currentAge } from './calendar';
import { evalCond } from './conditions';
import { DISPATCH_QUEUE_MAX } from './constants';
import { idx } from './contentIndex';
import { dispatchCfg, dispatchGap } from './dispatchClock';
import { applyM3OneOffs, fireOneOffs, modsOf, refreshEta } from './effects';
import type { OneOffs } from './effects';
import { pushEvents } from './events';
import type { EvDraft } from './events';
import { featureOn } from './features';
import { computeFlows } from './flows';
import { fillText, textItem, withNews } from './headlines';
import { milestone } from './milestones';
import { addModifier } from './modifiers';
import { recordAutomated } from './record';
import { fin, mix32 } from './util';

const ONE_OFF_TYPES = new Set(['mandateAdd', 'capitalAdd', 'slotAdd', 'populationMul', 'pressureAdd', 'metaFlag', /* M4 (finish) */ 'hindsightShare']);

/** The dispatch may be drawn now (DispatchDef: feature, cast `when`, sector open, age, `when`, not offered this run, `once`). */
export function eligible(state: GameState, content: Content, d: DispatchDef): boolean {
  if (state.dispatch.offered.includes(d.id)) return false;
  if (d.once && (state.meta.dispatches?.seen?.[d.id] ?? 0) > 0) return false;
  if (d.sector !== undefined && !state.sectors[d.sector]?.open) return false;
  if (d.age !== undefined && currentAge(state, content)?.id !== d.age) return false;
  const cast = idx(content).cast.get(d.cast);
  if (cast?.when && !evalCond(state, content, cast.when)) return false;
  return !d.when || evalCond(state, content, d.when);
}
const expiryOf = (d: DispatchDef, content: Content): number =>
  (d.expiryYears !== undefined && d.expiryYears >= 0 ? d.expiryYears : dispatchCfg(content).expiryYears) / YEARS_PER_SECOND;
const defaultArmOf = (d: DispatchDef): number => {
  const a = d.defaultArm ?? 0;
  return a >= 0 && a < d.arms.length ? a : 0;
};
/** Hard costs of an arm now: Mandate, and capital = capitalSeconds × income (≥ 0). */
function armCost(d: DispatchDef, arm: number, income: number): { capital: number; mandate: number } {
  const c = d.arms[arm]?.cost;
  return { capital: Math.max(0, fin((c?.capitalSeconds ?? 0) * income)), mandate: Math.max(0, fin(c?.mandate ?? 0)) };
}

function bumpArm(rec: Record<string, number[]> | undefined, id: string, arm: number): Record<string, number[]> {
  const cur = (rec?.[id] ?? []).slice();
  while (cur.length <= arm) cur.push(0);
  cur[arm] += 1;
  return { ...(rec ?? {}), [id]: cur };
}

/**
 * Resolve pending[index] with `arm`, by `by` at run time `time` (answerDispatch's effect, in its order). Costs: the
 * player's must be affordable (checked by the caller); a default pays what there is. Events and news are appended to
 * `ev` / `items`; the caller emits them. No validation beyond the index.
 */
function resolve(state: GameState, content: Content, index: number, arm: number, by: Actor, time: number, year: number, items: NewsItem[], ev: EvDraft[]): GameState {
  const p = state.dispatch.pending[index];
  const d = p ? idx(content).dispatches.get(p.id) : undefined;
  if (!p) return state;
  const pending = state.dispatch.pending.filter((_, i) => i !== index);
  if (!d || !d.arms[arm]) return { ...state, dispatch: { ...state.dispatch, pending } };
  const a = d.arms[arm];
  const income = computeFlows(state, content).income;
  const cost = armCost(d, arm, income);
  let capital = Math.max(0, state.capital - cost.capital);
  let mandate = Math.max(0, state.mandate - cost.mandate);
  // M4: a wager is judged on the true state after the cost, before any effect (a player's answer only: defaults never wager)
  const won = a.wager && by === 'player' ? evalCond({ ...state, capital, mandate }, content, a.wager.when) : undefined;
  const br = won === undefined ? undefined : won ? a.wager!.win : a.wager!.lose;
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  const effects = a.effects ?? [];
  fireOneOffs(effects, 1, income, one);
  if (br) fireOneOffs(br.effects ?? [], 1, income, one);
  capital = Math.max(0, fin(capital + one.capital));
  mandate = Math.max(0, fin(mandate + one.mandate));
  // reserveAdd acts at once, like a purchase (stock: reserve and reserveMax; flow: capacity, recomputed while in force)
  let sectors = state.sectors;
  const reserveNow = (effs: typeof effects) => {
    for (const ef of effs) {
      if (ef.type !== 'reserveAdd') continue;
      const sd = content.sectors[ef.sector];
      const es = sectors[ef.sector];
      if (!sd || !es?.open || es.settled || sd.resourceKind !== 'stock') continue;
      const add = fin(ef.value * sd.reserve);
      if (sectors === state.sectors) sectors = { ...sectors };
      sectors[ef.sector] = { ...es, reserve: Math.max(0, es.reserve + add), reserveMax: Math.max(0, es.reserveMax + add) };
    }
  };
  reserveNow(effects);
  if (a.modifier) reserveNow(a.modifier.effects);
  if (br) { reserveNow(br.effects ?? []); if (br.modifier) reserveNow(br.modifier.effects); }
  const hasStanding = effects.some((ef) => !ONE_OFF_TYPES.has(ef.type)) || !!br && (br.effects ?? []).some((ef) => !ONE_OFF_TYPES.has(ef.type));
  const ds = state.dispatch;
  const queue = a.next ? [...ds.queue, a.next].slice(-DISPATCH_QUEUE_MAX) : ds.queue;
  const answered: AnsweredDispatch[] = [...ds.answered, won === undefined ? { id: d.id, arm, t: time, by } : { id: d.id, arm, t: time, by, won }];
  const gapAt = time + dispatchGap(state.seed, ds.draws, content);
  let s: GameState = {
    ...state, capital, mandate, sectors,
    dispatch: {
      ...ds, pending, queue, answered: answered.length > ANSWERED_MAX ? answered.slice(answered.length - ANSWERED_MAX) : answered,
      standing: hasStanding ? [...ds.standing, [d.id, arm]] : ds.standing, nextAt: Math.max(ds.nextAt, gapAt),
    },
    modifiers: withBranchModifier(a.modifier ? addModifier(state.modifiers ?? [], { source: d.id, arm, since: time, until: time + Math.max(0, fin(a.modifier.years)) / YEARS_PER_SECOND }) : state.modifiers, d.id, arm, br, won, time),
    run: by === 'player'
      ? { ...state.run, dispatchesAnswered: (state.run.dispatchesAnswered ?? 0) + 1 }
      : { ...state.run, dispatchesDefaulted: (state.run.dispatchesDefaulted ?? 0) + 1 },
  };
  const md = state.meta.dispatches ?? { seen: {}, arms: {}, playerArms: {} };
  let meta = {
    ...s.meta,
    slots: s.meta.slots + one.slots,
    dispatches: { ...md, arms: bumpArm(md.arms, d.id, arm), playerArms: by === 'player' ? bumpArm(md.playerArms, d.id, arm) : md.playerArms },
  };
  meta = milestone(meta, 'dispatch', null, year);
  s = { ...s, meta };
  s = applyM3OneOffs(s, content, one);
  if (hasStanding || a.modifier || br?.modifier) s = refreshEta(s, content);
  if (a.reply) items.push(textItem('answered', fillText(s, content, a.reply, { year, cast: idx(content).cast.get(d.cast)?.name }, d.sector), time, year, d.sector));
  if (br?.reply) items.push(textItem('answered', fillText(s, content, br.reply, { year, cast: idx(content).cast.get(d.cast)?.name }, d.sector), time, year, d.sector));
  ev.push({ kind: 'dispatchAnswered', id: d.id, n: arm, by, ...(d.sector !== undefined ? { sector: d.sector } : {}), ...(won !== undefined ? { label: won ? 'won' : 'lost' } : {}) });
  return s;
}

/** M4: the modifiers with a wager branch's modifier added (source = the dispatch, arm, branch). */
function withBranchModifier(list: GameState['modifiers'], id: string, arm: number, br: WagerBranch | undefined, won: boolean | undefined, time: number): GameState['modifiers'] {
  if (!br?.modifier || won === undefined) return list;
  return addModifier(list ?? [], { source: id, arm, since: time, until: time + Math.max(0, fin(br.modifier.years)) / YEARS_PER_SECOND, branch: won ? 'win' : 'lose' });
}

/** Emit gathered news and events at (time, year). */
function flush(state: GameState, items: NewsItem[], ev: EvDraft[], time: number, year: number): GameState {
  let s = state;
  if (items.length) s = { ...s, news: withNews(s.news, items) };
  if (ev.length) {
    const r = pushEvents(s.events ?? [], s.meta.eventSeq ?? 0, ev, time, year);
    s = { ...s, events: r.events, meta: { ...s.meta, eventSeq: r.seq } };
  }
  return s;
}

/** ModelApi.answerDispatch (the decision is counted in index.ts). */
export function answerDispatch(state: GameState, content: Content, arm: number, id?: string): GameState {
  if (!featureOn(content, state.meta, 'dispatches') || !Number.isInteger(arm)) return state;
  const list = state.dispatch?.pending ?? [];
  const index = id === undefined ? (list.length ? 0 : -1) : list.findIndex((p) => p.id === id);
  if (index < 0) return state;
  const d = idx(content).dispatches.get(list[index].id);
  if (!d || arm < 0 || arm >= d.arms.length) return state;
  const fl = computeFlows(state, content);
  if (fl.pending) return state;
  const cost = armCost(d, arm, fl.income);
  if (!(state.mandate >= cost.mandate) || !(state.capital >= cost.capital)) return state;
  const year = calendarYear(state, content);
  const items: NewsItem[] = [];
  const ev: EvDraft[] = [];
  const s = resolve(state, content, index, arm, 'player', state.time, year, items, ev);
  return flush(s, items, ev, state.time, year);
}

/** The draw's pick among candidates (GameState.dispatch, steps 2–3). */
function pick(state: GameState, content: Content, cands: DispatchDef[]): DispatchDef {
  for (const q of state.dispatch.queue) { const c = cands.find((d) => d.id === q); if (c) return c; }
  const seen = state.meta.dispatches?.seen ?? {};
  let least = Infinity;
  for (const d of cands) least = Math.min(least, seen[d.id] ?? 0);
  const fresh = cands.filter((d) => (seen[d.id] ?? 0) === least);
  const w = (d: DispatchDef) => (d.weight !== undefined && d.weight > 0 && Number.isFinite(d.weight) ? d.weight : d.weight === 0 ? 0 : 1);
  let total = 0;
  for (const d of fresh) total += w(d);
  if (!(total > 0)) return fresh[0];
  const u = mix32((state.seed ^ Math.imul(state.dispatch.draws + 1, 0x9E3779B1)) >>> 0) / 4294967296;
  let run = 0;
  for (const d of fresh) { run += w(d) / total; if (run > u) return d; }
  return fresh[fresh.length - 1];
}

/**
 * The scheduler's part of a step from `prev` to `next` (end time next.time; events at `year`, the step's): expiry, then
 * a draw unless `away` (fastForward, useBank) or `lite` (projections). Never while a Reckoning is pending.
 */
export function stepDispatch(next: GameState, content: Content, year: number, away: boolean, lite: boolean): GameState {
  if (lite || !content.dispatches?.length && !(next.dispatch?.pending?.length)) return next;
  const ds = next.dispatch;
  const end = next.time;
  const expiring = ds.pending.some((p) => p.expiresAt <= end);
  const cfg = dispatchCfg(content);
  const drawDue = !away && end >= ds.nextAt && ds.pending.length < cfg.maxPending && featureOn(content, next.meta, 'dispatches');
  if (!expiring && !drawDue) return next;
  if (computeFlows(next, content).pending) return next;
  const items: NewsItem[] = [];
  const ev: EvDraft[] = [];
  let s = next;
  // expiry first, oldest first
  for (let i = 0; i < s.dispatch.pending.length;) {
    const p = s.dispatch.pending[i];
    if (p.expiresAt > end) { i++; continue; }
    const d = idx(content).dispatches.get(p.id);
    s = resolve(s, content, i, d ? defaultArmOf(d) : 0, 'default', end, year, items, ev);
  }
  // then a draw
  if (!away && end >= s.dispatch.nextAt && s.dispatch.pending.length < cfg.maxPending && featureOn(content, s.meta, 'dispatches')) {
    const cands = (content.dispatches ?? []).filter((d) => eligible(s, content, d));
    if (!cands.length) {
      s = { ...s, dispatch: { ...s.dispatch, nextAt: s.dispatch.nextAt + dispatchGap(s.seed, s.dispatch.draws, content) } };
    } else {
      const d = pick(s, content, cands);
      const ix = idx(content);
      const cast: CastDef | undefined = ix.cast.get(d.cast);
      const qi = s.dispatch.queue.indexOf(d.id);
      const md = s.meta.dispatches ?? { seen: {}, arms: {}, playerArms: {} };
      s = {
        ...s,
        dispatch: {
          ...s.dispatch, draws: s.dispatch.draws + 1, queue: qi >= 0 ? s.dispatch.queue.filter((_, i) => i !== qi) : s.dispatch.queue,
          pending: [...s.dispatch.pending, { id: d.id, arrivedAt: end, expiresAt: end + expiryOf(d, content) }],
          offered: [...s.dispatch.offered, d.id],
        },
        meta: { ...s.meta, dispatches: { ...md, seen: { ...md.seen, [d.id]: (md.seen[d.id] ?? 0) + 1 } } },
      };
      items.push(textItem('dispatch', fillText(s, content, d.headline, { year, cast: cast?.name }, d.sector), end, year, d.sector));
      ev.push({ kind: 'dispatchArrived', id: d.id, label: d.cast, ...(d.sector !== undefined ? { sector: d.sector } : {}) });
      // the standing dispatch order answers at once with the default arm
      const o = s.meta.orders?.dispatch;
      if (o?.on && o.cast[d.cast] === true && modsOf(s, content).orderUnlock.has('dispatch')) {
        s = resolve(s, content, s.dispatch.pending.length - 1, defaultArmOf(d), 'dispatch', end, year, items, ev);
        s = { ...s, run: recordAutomated(s.run, end) };
      }
    }
  }
  return flush(s, items, ev, end, year);
}

/** Derived.dispatch (empty and nextIn null while feature 'dispatches' is off). */
export function dispatchesView(state: GameState, content: Content): DispatchesView {
  if (!featureOn(content, state.meta, 'dispatches')) return { pending: [], nextIn: null };
  const ix = idx(content);
  const fl = computeFlows(state, content);
  const year = calendarYear(state, content);
  const pending: PendingDispatchView[] = [];
  for (const p of state.dispatch?.pending ?? []) {
    const d = ix.dispatches.get(p.id);
    if (!d) continue;
    const cast = ix.cast.get(d.cast) ?? null;
    const ctx = { year, cast: cast?.name };
    pending.push({
      id: d.id, def: d, cast, headline: fillText(state, content, d.headline, ctx, d.sector), body: fillText(state, content, d.body, ctx, d.sector),
      expiresIn: Math.max(0, fin(p.expiresAt - state.time)), defaultArm: defaultArmOf(d),
      arms: d.arms.map((a, i) => {
        const c = armCost(d, i, fl.income);
        return {
          label: a.label, outcome: fillText(state, content, a.outcome, ctx, d.sector), price: a.price, capital: c.capital, mandate: c.mandate,
          affordable: !fl.pending && state.mandate >= c.mandate && state.capital >= c.capital,
          effects: (a.effects ?? []).slice(), modifier: a.modifier ? { ...a.modifier, effects: a.modifier.effects.slice() } : null,
          // M4: a wager's hint and both outcomes (never which way it would go)
          wager: a.wager ? { hint: fillText(state, content, a.wager.hint, ctx, d.sector), win: fillText(state, content, a.wager.win.outcome, ctx, d.sector), lose: fillText(state, content, a.wager.lose.outcome, ctx, d.sector) } : null,
        };
      }),
    });
  }
  const full = (state.dispatch?.pending.length ?? 0) >= dispatchCfg(content).maxPending;
  const paused = full || state.time === 0 && !Object.values(state.upgrades).some((l) => (l ?? 0) > 0) || !!fl.pending;
  return { pending, nextIn: paused ? null : Math.max(0, fin((state.dispatch?.nextAt ?? 0) - state.time)) };
}

