/**
 * M5 (Core A): the rival (RivalDef; RivalState). His profile from the player's opening (pure, once, at takeOffice), the
 * policy it sets, his income and opening purse, THE YEARLY DECISION at each order tick (purchase by the Market's candidate
 * rule with his purse; answers to the levers by the cheapest priced response; the concealment ramp), the response
 * prices, the answer line (LeverView.rivalAnswer, cached per lever per PROJECTION_BUCKET) and his panel (RivalView).
 * rivalStep is the ONE call the step makes (before the player's standing orders). Layer 7 (reads treasury.ts,
 * loopholes.ts, inspect.ts).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { CONFIDENCE_MAX, YEARS_PER_SECOND } from '../../types';
import type {
  ChairState, Content, GameState, LeverDef, LeverState, LeverView, MetaState, NewsItem, ResponseDef, ResponseKind, RivalDef, RivalProfile,
  RivalState, RivalView, SectorId, UpgradeDef,
} from '../../types';
import { calendarYear } from '../calendar';
import { bestCandidate } from '../candidates';
import { PROJECTION_BUCKET } from '../constants';
import { idx } from '../contentIndex';
import { modsOf, refreshEta } from '../effects';
import { emit } from '../events';
import type { EvDraft } from '../events';
import { featureOn } from '../features';
import { computeFlows } from '../flows';
import { headline, newsWith } from '../headlines';
import { leverReachable } from '../levers';
import { buyUpgradeAs, foundAppAs } from '../purchases';
import { isFreshRun } from '../state';
import { clamp, fin } from '../util';
import { chairIdx } from './chairIndex';
import { effectiveOf } from './acting';
import { concealTick, quietYearsOf, standingInspection } from './inspect';
import { evadeRung, loopholeStep, loopholeViews, openArrived, robustReopen, useRung } from './loopholes';
import { rivalIncomeOf, subsidyShareOf, subsidySplit } from './treasury';

/* ------------------------------------------------------------------ */
/* Profile and policy                                                  */
/* ------------------------------------------------------------------ */

const lerp = (a: number, b: number, t: number): number => a + (b - a) * clamp(fin(t), 0, 1);
const KEYS: (keyof RivalProfile)[] = ['haste', 'founder', 'volume', 'drawn', 'pliant'];

/** The profile in force: MetaState.office.profile, else RivalDef.defaultProfile. */
export function profileOf(state: GameState, content: Content): RivalProfile {
  return state.meta.office?.profile ?? content.rival!.defaultProfile;
}

/** The demand effect of a card on its own sector: Π of its satMul and halfPriceMul values there (1 if none). */
function demandEffect(u: UpgradeDef): number {
  let x = 1;
  for (const e of u.effects) if ((e.type === 'satMul' || e.type === 'halfPriceMul') && e.sector === u.sector) x *= fin(e.value, 1);
  return x;
}
const largerArm = new WeakMap<Content, Map<string, boolean>>();
/** Whether card u is its fork's larger-demand arm (ties: content order, the first arm is the larger). */
function isLargerArm(content: Content, u: UpgradeDef): boolean {
  let m = largerArm.get(content);
  if (!m) { m = new Map(); largerArm.set(content, m); }
  const hit = m.get(u.id);
  if (hit !== undefined) return hit;
  const ix = idx(content);
  const group = [u.id, ...(ix.conflicts.get(u.id) ?? [])];
  let best: UpgradeDef | null = null;
  for (const v of content.upgrades ?? []) {
    if (!group.includes(v.id)) continue;
    if (best === null || demandEffect(v) > demandEffect(best)) best = v;
  }
  const out = best?.id === u.id;
  m.set(u.id, out);
  return out;
}

export interface RivalPolicy { paybackMax: number; foundPaybackMax: number; fork: (u: UpgradeDef) => boolean; quietYears: number }
/** The policy from the profile (RivalDef "THE POLICY"). */
export function rivalPolicy(state: GameState, content: Content): RivalPolicy {
  const rv = content.rival!;
  const p = profileOf(state, content);
  const volume = clamp(fin(p.volume, 0.5), 0, 1);
  return {
    paybackMax: lerp(rv.policy.paybackSlow, rv.policy.paybackFast, p.haste),
    foundPaybackMax: lerp(rv.policy.foundSlow, rv.policy.foundFast, p.founder),
    fork: (u) => isLargerArm(content, u) === (volume >= 0.5),
    quietYears: quietYearsOf(state, content),
  };
}
/** carveOutAt' of a lobby row: lobby.carveOutAt + drawn × policy.drawnLobby. */
export function carveOutLine(state: GameState, content: Content, row: ResponseDef): number {
  const rv = content.rival!;
  return fin(row.lobby?.carveOutAt ?? Infinity, Infinity) + clamp(fin(profileOf(state, content).drawn), 0, 1) * fin(rv.policy.drawnLobby);
}

/**
 * The profile distilled from meta (RivalDef.profileFrom), with its sources (MetaState.office.sources). Pure.
 * drawn: the earliest firstBudgetAt of the openings meta keeps (firstOpening and opening: RunSummary carries none).
 */
export function rivalProfile(meta: MetaState, content: Content): { profile: RivalProfile; sources: Record<keyof RivalProfile, { n: number; d: number | null }> } {
  const rv = content.rival!;
  const op = meta.firstOpening;
  const def = rv.defaultProfile;
  const [a, b] = rv.profileFrom.hasteAtPerMinute;
  const acts = op?.actions ?? [];
  const early = acts.filter((x) => x.t < 600).length;
  const founds = acts.filter((x) => x.kind === 'found').length;
  const ix = idx(content);
  let forks = 0, larger = 0;
  for (const x of acts) {
    const u = x.kind === 'upgrade' ? ix.upgrades.get(x.id) : undefined;
    if (!u?.excludes?.length) continue;
    forks++;
    if (isLargerArm(content, u)) larger++;
  }
  const budgets = [meta.firstOpening?.firstBudgetAt, meta.opening?.firstBudgetAt].filter((t): t is number => typeof t === 'number' && t >= 0);
  const firstLine = budgets.length ? Math.min(...budgets) : -1;
  // pliant: the player's answers to the counted casts' dispatches, by arm stance
  let answers = 0, accepts = 0;
  const casts = new Set(rv.profileFrom.casts ?? []);
  for (const d of content.dispatches ?? []) {
    if (!casts.has(d.cast)) continue;
    const counts = meta.dispatches?.playerArms?.[d.id];
    if (!counts) continue;
    counts.forEach((n, i) => {
      if (!(n > 0)) return;
      answers += n;
      if (d.arms[i]?.stance === 'accept') accepts += n;
    });
  }
  const drawnBy = Math.max(1e-9, fin(rv.profileFrom.drawnBySeconds, 1));
  const profile: RivalProfile = op ? {
    haste: b > a ? clamp((early / 10 - a) / (b - a), 0, 1) : def.haste,
    founder: acts.length ? founds / acts.length : 0.5,
    volume: forks ? larger / forks : 0.5,
    drawn: firstLine >= 0 ? 1 - Math.min(1, firstLine / drawnBy) : 0,
    pliant: answers ? accepts / answers : 0.5,
  } : { ...def, drawn: firstLine >= 0 ? 1 - Math.min(1, firstLine / drawnBy) : def.drawn, pliant: answers ? accepts / answers : def.pliant };
  for (const k of KEYS) profile[k] = clamp(fin(profile[k], def[k]), 0, 1);
  return {
    profile,
    sources: {
      haste: { n: early, d: null }, founder: { n: founds, d: acts.length }, volume: { n: larger, d: forks },
      drawn: { n: firstLine, d: drawnBy }, pliant: { n: accepts, d: answers },
    },
  };
}

/** A fresh RivalState (capital 0, maps empty): inherit.ts adds the opening purse (openingPurse). */
export function freshRivalState(): RivalState {
  return { capital: 0, peakIncome: {}, concealment: {}, answers: {}, lobbying: {} };
}
/** The opening purse for chair sectors `sectors` open in `state`: Σ startCapitalSeconds × their income per second now. */
export function openingPurse(state: GameState, content: Content, sectors?: SectorId[]): number {
  const rv = content.rival;
  if (!rv) return 0;
  const fl = computeFlows(state, content);
  let x = 0;
  for (const s of sectors ?? chairIdx(content).chairSectors) if (state.sectors[s]?.open) x += Math.max(0, fl.sectors[s]?.income ?? 0);
  return fin(Math.max(0, fin(rv.startCapitalSeconds)) * x);
}
/** The rival's income per second, total and by sector (before tax). */
export function rivalIncomePerSec(state: GameState, content: Content): { total: number; bySector: Record<SectorId, number> } {
  return rivalIncomeOf(state, content, computeFlows(state, content));
}

/* ------------------------------------------------------------------ */
/* Response prices                                                     */
/* ------------------------------------------------------------------ */

/** The ref a raise from 0 would snapshot (policy.ts's rule: duty p_pre + permit part; charge p_s, or the resource price
 *  with a basis on a hiddenFlow sector; an applied cap or quota R_applied). */
function enactRef(state: GameState, content: Content, def: LeverDef): number {
  const f = computeFlows(state, content).sectors[def.sector];
  if (!f || !(f.D > 0)) return 0;
  const hf = !!content.sectors[def.sector]?.hiddenFlow;
  if (def.kind === 'duty') return f.pPre + f.permitPart;
  if (def.kind === 'charge') return hf && def.basis ? f.prBase : f.ps;
  if ((def.kind === 'cap' || def.kind === 'quota') && hf && def.basis === 'applied') return f.rApplied ?? f.R;
  return 0;
}

/**
 * The state with lever `def` at level L as ENACTED (comply's pricing): its carve-out, litigation and used rungs stripped
 * (he would be complying), η refreshed. The same state when nothing differs.
 */
function draftAt(state: GameState, content: Content, def: LeverDef, L: number): GameState {
  const ch = state.chair!;
  const cur = state.levers[def.id] ?? { level: 0, ref: 0 };
  const rungs = chairIdx(content).ladders.get(def.id) ?? [];
  const usedHere = rungs.some((r) => { const st = ch.loopholes[r.id]; return !!st && (st.status === 'used' || (st.status === 'drafting' && st.before === 'used')); });
  const strip = ch.litigation[def.id] !== undefined || ch.carveOuts[def.id] !== undefined || usedHere;
  if (L === cur.level && !strip) return state;
  let ref = cur.ref;
  if (L > 0 && !(ref > 0)) ref = enactRef(state, content, def);
  let draft: GameState = { ...state, levers: { ...state.levers, [def.id]: { ...cur, level: L, ref: L > 0 ? ref : 0 } } };
  if (strip) {
    const litigation = { ...ch.litigation }; delete litigation[def.id];
    const carveOuts = { ...ch.carveOuts }; delete carveOuts[def.id];
    const loopholes = { ...ch.loopholes };
    for (const r of rungs) {
      const st = loopholes[r.id];
      if (st && (st.status === 'used' || (st.status === 'drafting' && st.before === 'used'))) loopholes[r.id] = { status: 'open', since: st.since };
    }
    draft = { ...draft, chair: { ...ch, litigation, carveOuts, loopholes } };
  }
  return refreshEta(draft, content);
}

/** I: a model year of sector s's income to the rival in `state`. */
const incomeYear = (state: GameState, content: Content, s: SectorId): number =>
  Math.max(0, fin(computeFlows(state, content).sectors[s]?.income ?? 0)) / YEARS_PER_SECOND;

const TIE: Record<string, number> = { comply: 0, evade: 1, lobby: 2, litigate: 3 };
export interface PricedResponses {
  level: number;
  options: { kind: ResponseKind; cost: number; available: boolean }[];
  chosen: ResponseKind;
  /** The comply cost (recorded with the answer: the repeal rule reads it). */
  comply: number;
  /** The rung evade would use (null if evade is unavailable). */
  rung: string | null;
}

/**
 * Every row of the rival's table priced for lever `id` at its CURRENT level on `state` (ResponseDef): the answer the
 * yearly decision gives, and (on the enacted draft) the answer line. Ranked by cost; ties comply, evade, lobby, litigate,
 * then table order; unavailable rows cost Infinity. 'conceal' rows are never candidates.
 */
export function priceResponses(state: GameState, content: Content, id: string): PricedResponses {
  const ch = state.chair!;
  const rv = content.rival!;
  const def = idx(content).levers.get(id)!;
  const s = def.sector;
  const L = state.levers[id]?.level ?? 0;
  const mods = modsOf(state, content);
  const I = incomeYear(state, content, s);
  const I0 = incomeYear(draftAt(state, content, def, 0), content, s);
  const IL = incomeYear(draftAt(state, content, def, L), content, s);
  const comply = Math.max(0, fin(I0 - IL));
  const rung = evadeRung(state, content, id);
  const rows: { kind: ResponseKind; cost: number; available: boolean; ord: number }[] = [];
  rv.responses.forEach((row, i) => {
    if (row.kind === 'conceal') return;
    const featOk = !row.feature || featureOn(content, state.meta, row.feature);
    let cost = Infinity;
    let ok = false;
    switch (row.kind) {
      case 'comply': ok = true; cost = comply; break;
      case 'evade':
        if (featOk && rung) { ok = true; cost = Math.max(0, fin(rung.premium)) * I; }
        break;
      case 'lobby': {
        if (!featOk || !row.lobby) break;
        const line = carveOutLine(state, content, row);
        if (ch.confidence > line && ch.carveOuts[id] !== ch.parliament.index) { ok = true; cost = Math.max(0, fin(row.lobby.costPerPoint)) * Math.max(0, ch.confidence - line) * I / 100; }
        break;
      }
      case 'litigate': {
        if (!featOk || !row.litigate) break;
        const raised = state.levers[id]?.raisedAt;
        if (typeof raised === 'number' && (state.time - raised) * YEARS_PER_SECOND <= fin(row.litigate.windowYears) + 1e-9 && ch.litigatedAt?.[id] !== L) {
          ok = true; cost = Math.max(0, fin(row.litigate.feeYears)) * I;
        }
        break;
      }
      default: break; // unknown kinds: unavailable until a core function prices them (M6)
    }
    if (ok) cost = fin(cost * Math.max(0, fin(row.costScale ?? 1, 1)) * fin(mods.rivalCostMul[row.kind] ?? 1, 1));
    rows.push({ kind: row.kind, cost: ok ? cost : Infinity, available: ok, ord: TIE[row.kind] ?? 4 + i });
  });
  rows.sort((x, y) => (x.cost === y.cost ? x.ord - y.ord : x.cost < y.cost ? -1 : 1));
  const pick = rows.find((r) => r.available);
  return {
    level: L, options: rows.map(({ kind, cost, available }) => ({ kind, cost, available })), chosen: pick?.kind ?? 'comply',
    comply, rung: pick?.kind === 'evade' && rung ? rung.id : null,
  };
}

/* ------------------------------------------------------------------ */
/* The yearly decision                                                 */
/* ------------------------------------------------------------------ */

const yearsOf = (t: number, content: Content): number => {
  const iy = content.global?.orders?.intervalYears;
  const y = typeof iy === 'number' && iy > 0 && Number.isFinite(iy) ? iy : 1;
  return Math.floor((t * YEARS_PER_SECOND) / y + 1e-9);
};
const intervalOf = (content: Content): number => {
  const iy = content.global?.orders?.intervalYears;
  return typeof iy === 'number' && iy > 0 && Number.isFinite(iy) ? iy : 1;
};

/** Housekeeping at a tick: expired litigation dropped; lobbying that has pushed C under the line wins a carve-out. */
function housekeeping(state: GameState, content: Content, ev: EvDraft[]): GameState {
  const ch0 = state.chair!;
  let ch = ch0;
  for (const id in ch.litigation) {
    if (state.time < ch.litigation[id].until) continue;
    const litigation = { ...ch.litigation }; delete litigation[id];
    ch = { ...ch, litigation };
  }
  const row = chairIdx(content).responses.get('lobby');
  if (row) {
    const line = carveOutLine(state, content, row);
    for (const id in ch.rival.lobbying) {
      if (!ch.rival.lobbying[id] || !(ch.confidence < line)) continue;
      const lobbying = { ...ch.rival.lobbying }; delete lobbying[id];
      ch = { ...ch, carveOuts: { ...ch.carveOuts, [id]: ch.parliament.index }, rival: { ...ch.rival, lobbying } };
      ev.push({ kind: 'carveOut', sector: idx(content).levers.get(id)?.sector, id, by: 'rival' });
    }
  }
  return ch === ch0 ? state : { ...state, chair: ch };
}

/** Step 1: at most one purchase or founding per open, unsettled chair sector (sectorOrder), with his purse. */
function purchases(state: GameState, content: Content, pol: RivalPolicy): GameState {
  let out = state;
  for (const s of chairIdx(content).chairSectors) {
    const es = out.sectors[s];
    if (!es?.open || es.settled) continue;
    const purse = out.chair!.rival.capital;
    const share = (id: string): number => 1 - subsidyShareOf(out, content, id);
    const { best, log } = bestCandidate(out, content, s, { capital: purse, paybackMax: pol.paybackMax, foundPaybackMax: pol.foundPaybackMax, fork: pol.fork, share, reserve: true });
    out = { ...out, orderLog: { ...(out.orderLog ?? {}), [s]: log } };
    if (!best) continue;
    const full = best.cost / Math.max(1e-12, share(best.id));
    const split = subsidySplit(out, content, best.id, full);
    if (!(split.rivalPays <= purse + 1e-9)) continue;
    const draft: GameState = { ...out, capital: full };
    const bought = best.kind === 'found' ? foundAppAs(draft, content, best.id, 'rival') : buyUpgradeAs(draft, content, best.id, 'rival');
    if (bought === draft) continue;
    out = {
      ...bought, capital: fin(out.capital - split.treasuryPays),
      chair: { ...bought.chair!, rival: { ...bought.chair!.rival, capital: fin(purse - split.rivalPays) } },
    };
  }
  return out;
}

/** Whether lever `id`'s answer is due on `state` (RivalDef step 2). */
function answerDue(state: GameState, content: Content, id: string): boolean {
  const ch = state.chair!;
  const L = state.levers[id]?.level ?? 0;
  if (!(L >= 1)) return false;
  const a = ch.rival.answers[id];
  const decade = fin(content.global?.steady?.decadeYears ?? 10, 10);
  return !a || a.level !== L || (state.time - a.t) * YEARS_PER_SECOND >= decade - 1e-9 || ch.due?.[id] === true;
}

/** Apply a chosen answer's effect to `state` (RivalDef step 2; ResponseDef). */
function applyAnswer(state: GameState, content: Content, id: string, p: PricedResponses, ev: EvDraft[]): GameState {
  let s = state;
  const def = idx(content).levers.get(id)!;
  const kind = p.chosen;
  if (kind === 'evade' && p.rung) {
    const r = chairIdx(content).loopholes.get(p.rung);
    if (r) s = useRung(s, content, r, ev);
  }
  let ch = s.chair!;
  if (kind === 'lobby') ch = { ...ch, rival: { ...ch.rival, lobbying: { ...ch.rival.lobbying, [id]: true } } };
  else if (ch.rival.lobbying[id]) { const lobbying = { ...ch.rival.lobbying }; delete lobbying[id]; ch = { ...ch, rival: { ...ch.rival, lobbying } }; }
  if (kind === 'litigate') {
    const row = chairIdx(content).responses.get('litigate')!;
    const years = Math.max(0, fin(row.litigate!.delayYears)) * fin(modsOf(s, content).litigateYearsMul, 1);
    ch = {
      ...ch, litigation: { ...ch.litigation, [id]: { from: ch.rival.answers[id]?.level ?? 0, until: s.time + years / YEARS_PER_SECOND } },
      litigatedAt: { ...(ch.litigatedAt ?? {}), [id]: p.level },
    };
    ev.push({ kind: 'litigated', sector: def.sector, id, by: 'rival' });
  }
  const cost = p.options.find((o) => o.kind === kind)?.cost ?? 0;
  const prev = ch.rival.answers[id];
  const due = ch.due && ch.due[id] ? (() => { const d = { ...ch.due! }; delete d[id]; return d; })() : ch.due;
  ch = { ...ch, due, rival: { ...ch.rival, answers: { ...ch.rival.answers, [id]: { kind, level: p.level, t: s.time, cost: fin(cost, 0), comply: p.comply } } } };
  if (prev?.kind !== kind) ev.push({ kind: 'rivalAnswered', sector: def.sector, id, label: kind, by: 'rival' });
  return { ...s, chair: ch };
}

/** Step 2: answers to every due lever of an open, unsettled chair sector (content order), priced on `at`. */
function answers(at: GameState, state: GameState, content: Content, ev: EvDraft[]): GameState {
  let s = state;
  const cx = chairIdx(content);
  for (const def of content.levers ?? []) {
    if (!cx.chairSet.has(def.sector)) continue;
    const es = s.sectors[def.sector];
    if (!es?.open || es.settled) continue;
    const L = s.levers[def.id]?.level ?? 0;
    const ch = s.chair!;
    if (!(L >= 1)) {
      if (ch.rival.answers[def.id] || ch.rival.lobbying[def.id] || ch.litigation[def.id]) {
        const a = { ...ch.rival.answers }; delete a[def.id];
        const lb = { ...ch.rival.lobbying }; delete lb[def.id];
        const lt = { ...ch.litigation }; delete lt[def.id];
        s = { ...s, chair: { ...ch, litigation: lt, rival: { ...ch.rival, answers: a, lobbying: lb } } };
      }
      continue;
    }
    if (!answerDue(s, content, def.id)) continue;
    // priced on the state at the start of the tick (before this tick's purchases)
    s = applyAnswer(s, content, def.id, priceResponses(at, content, def.id), ev);
  }
  return s;
}

/** The decision itself on `state` (an order tick): exported for tests (the answer line's exactness). */
export function rivalDecide(state: GameState, content: Content, years: number): GameState {
  if (!state.chair || !content.rival) return state;
  const ev: EvDraft[] = [];
  let s = housekeeping(state, content, ev);
  s = openArrived(s, content); // M5 (follow-up): rungs of levers raised before 'loopholes' arrived
  s = robustReopen(s, content);
  const at = s;
  s = purchases(s, content, rivalPolicy(s, content));
  s = answers(at, s, content, ev);
  s = concealTick(s, content, years);
  return ev.length ? newsFor(s, content, ev) : s;
}

function newsFor(state: GameState, content: Content, ev: EvDraft[]): GameState {
  const year = calendarYear(state, content);
  const items: NewsItem[] = [];
  const ix = idx(content);
  for (const e of ev) {
    if (e.kind === 'carveOut' || e.kind === 'litigated' || e.kind === 'rivalAnswered') {
      items.push(headline(state, content, e.kind, state.time, { year, name: ix.levers.get(e.id ?? '')?.name ?? '' }, e.sector));
    } else if (e.kind === 'loopholeUsed') {
      items.push(headline(state, content, 'loopholeUsed', state.time, { year, name: chairIdx(content).loopholes.get(e.id ?? '')?.name ?? '' }, e.sector));
    }
  }
  return emit(items.length ? { ...state, ...newsWith(state, content, items) } : state, ev, state.time, year);
}

/**
 * THE ONE STEP CALL (Core B wires it in step.ts after stepM4 and before runOrders): in a Ministry, every step, the
 * rival's income ((1 − taxShare) × Σ rival income × dt from prev's flows), peakIncome, the opening purse when a chair
 * sector opens; the loophole every-step rules; at an order tick (never fresh, pending or in a projection) the yearly
 * decision; Standing inspection at a model-decade boundary. The same `next` outside a Ministry.
 */
export function rivalStep(prev: GameState, next: GameState, content: Content, dt: number, lite = false): GameState {
  const ch0 = next.chair;
  if (!ch0 || !content.rival || !content.chair) return next;
  const fl = computeFlows(prev, content);
  let out = next;
  if (!fl.pending && dt > 0) {
    const rv = rivalIncomeOf(prev, content, fl);
    const tax = clamp(fin(content.chair.treasury.taxShare), 0, 1);
    let peak = ch0.rival.peakIncome;
    for (const s in rv.bySector) if (rv.bySector[s] > (peak[s] ?? 0)) { if (peak === ch0.rival.peakIncome) peak = { ...peak }; peak[s] = rv.bySector[s]; }
    let capital = ch0.rival.capital + (1 - tax) * rv.total * dt;
    const opened = chairIdx(content).chairSectors.filter((s) => next.sectors[s]?.open && !prev.sectors[s]?.open);
    if (opened.length) capital += openingPurse(next, content, opened);
    out = { ...next, chair: { ...ch0, rival: { ...ch0.rival, capital: fin(capital), peakIncome: peak } } };
  }
  out = loopholeStep(out, content);
  if (lite) return out;
  if (yearsOf(out.time, content) > yearsOf(prev.time, content) && !isFreshRun(out) && !computeFlows(out, content).pending) {
    out = rivalDecide(out, content, intervalOf(content));
  }
  return standingInspection(prev, out, content);
}

/* ------------------------------------------------------------------ */
/* The answer line and the views                                       */
/* ------------------------------------------------------------------ */

/** The state as it would be with lever `id` enacted at `level` now (setLever's bookkeeping; the ladder's first rung
 *  opened as loopholeStep would before the next tick). */
function enacted(state: GameState, content: Content, def: LeverDef, level: number): GameState {
  const cur: LeverState = state.levers[def.id] ?? { level: 0, ref: 0 };
  if (level === cur.level) return state;
  let ref = cur.ref;
  if (cur.level === 0 || !(ref > 0)) ref = enactRef(state, content, def);
  const ls: LeverState = { ...cur, level, ref: fin(ref), raisedAt: state.time };
  if (cur.level === 0) ls.since = state.time;
  const draft = refreshEta({ ...state, levers: { ...state.levers, [def.id]: ls } }, content);
  // what the next tick does before it answers: the first rung opened, robust rungs reopened, carve-outs and expiries
  return housekeeping(robustReopen(openArrived(loopholeStep(draft, content), content), content), content, []);
}

const answerCache = new WeakMap<object, WeakMap<object, Map<string, LeverView['rivalAnswer']>>>();
/**
 * LeverView.rivalAnswer: the table priced for the lever at its NEXT level (its current level if maxed) on the state as
 * it would be with that level enacted now, ranked; `chosen` is what the rival would answer at the next order tick if
 * nothing else changed (exit criterion 4). Null unless a Ministry, feature 'chair' on, and a lever of an open chair
 * sector. Cached per lever per PROJECTION_BUCKET while nothing structural changes.
 */
export function rivalAnswerView(state: GameState, content: Content, id: string): LeverView['rivalAnswer'] {
  const ch = state.chair;
  const def = idx(content).levers.get(id);
  if (!ch || !def || !content.rival || !chairIdx(content).chairSet.has(def.sector) || !featureOn(content, state.meta, 'chair')) return null;
  const es = state.sectors[def.sector];
  if (!es?.open || es.settled || computeFlows(state, content).pending) return null;
  const L = state.levers[id]?.level ?? 0;
  const level = Math.min(L + 1, Math.max(L, leverReachable(state, content, def)));
  let byLev = answerCache.get(state.upgrades);
  if (!byLev) { byLev = new WeakMap(); answerCache.set(state.upgrades, byLev); }
  let m = byLev.get(state.levers);
  if (!m) { m = new Map(); byLev.set(state.levers, m); }
  const rungs = (chairIdx(content).ladders.get(id) ?? []).map((r) => ch.loopholes[r.id]?.status ?? '-').join(',');
  const k = `${id}|${level}|${Math.floor(state.time / PROJECTION_BUCKET)}|${ch.parliament.index}|${Math.round(ch.confidence * 100)}|${rungs}|${ch.litigatedAt?.[id] ?? ''}|${ch.carveOuts[id] ?? ''}|${state.meta.reckonings}`;
  const hit = m.get(k);
  if (hit !== undefined) return hit;
  const p = priceResponses(enacted(state, content, def, level), content, id);
  const out = { level, options: p.options, chosen: p.chosen };
  if (m.size > 400) m.clear();
  m.set(k, out);
  return out;
}

/** LeverView's M5 fields that are Core A's: rivalAnswer, answered, effectiveLevel, litigatedUntil, carvedOut, lobbied,
 *  ladder. (bound, boundMax and popularity are Core B's.) */
export function leverChairFields(state: GameState, content: Content, id: string): Pick<LeverView,
  'rivalAnswer' | 'answered' | 'effectiveLevel' | 'litigatedUntil' | 'carvedOut' | 'lobbied' | 'ladder'> {
  const ch = state.chair;
  const level = state.levers[id]?.level ?? 0;
  if (!ch) return { rivalAnswer: null, answered: null, effectiveLevel: level, litigatedUntil: null, carvedOut: false, lobbied: false, ladder: [] };
  const a = ch.rival.answers[id];
  const lit = ch.litigation[id];
  return {
    rivalAnswer: rivalAnswerView(state, content, id),
    answered: a ? { kind: a.kind, cost: a.cost, since: a.t } : null,
    effectiveLevel: effectiveOf(ch, id, level, state.time),
    litigatedUntil: lit && state.time < lit.until ? lit.until : null,
    carvedOut: ch.carveOuts[id] === ch.parliament.index,
    lobbied: ch.rival.lobbying[id] === true,
    ladder: loopholeViews(state, content, id),
  };
}

/** ChairView.rival. */
export function rivalView(state: GameState, content: Content): RivalView | null {
  const ch: ChairState | null | undefined = state.chair;
  const rv: RivalDef | undefined = content.rival;
  if (!ch || !rv) return null;
  const pol = rivalPolicy(state, content);
  const tax = clamp(fin(content.chair?.treasury.taxShare ?? 0), 0, 1);
  const inc = rivalIncomePerSec(state, content).total;
  const next: Record<SectorId, { id: string; payback: number } | null> = {};
  for (const s of chairIdx(content).chairSectors) {
    const es = state.sectors[s];
    if (!es?.open || es.settled) continue;
    const share = (id: string): number => 1 - subsidyShareOf(state, content, id);
    const { best } = bestCandidate(state, content, s, { capital: ch.rival.capital, paybackMax: pol.paybackMax, foundPaybackMax: pol.foundPaybackMax, fork: pol.fork, share, reserve: true });
    next[s] = best ? { id: best.id, payback: best.payback } : null;
  }
  const answersOut: RivalView['answers'] = [];
  for (const def of content.levers ?? []) {
    const a = ch.rival.answers[def.id];
    if (a) answersOut.push({ lever: def.id, kind: a.kind, cost: a.cost, since: a.t });
  }
  const off = state.meta.office;
  return {
    name: rv.name, capital: ch.rival.capital, incomePerSec: fin((1 - tax) * inc),
    profile: profileOf(state, content),
    sources: off?.sources ?? rivalProfile(state.meta, content).sources,
    paybackMax: pol.paybackMax, foundPaybackMax: pol.foundPaybackMax, quietYears: pol.quietYears,
    next, answers: answersOut, playbooks: (state.meta.playbooks ?? []).slice(),
  };
}

/** Confidence clamp helper shared with tests. */
export const clampConfidence = (c: number): number => clamp(fin(c), 0, CONFIDENCE_MAX);
