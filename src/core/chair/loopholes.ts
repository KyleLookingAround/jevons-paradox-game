/**
 * M5 (Core A): loophole ladders (LoopholeDef; ChairState.loopholes): a laddered lever's first rung opens when it first
 * acts in a Ministry; the rival's evasion uses the first open rung (its exempt application founded free); amendment
 * drafts a rung closed (held in Opposition); a closed rung opens the next; a used rung whose closedBy holds returns to
 * 'open' at an order tick. Each status change marks the lever's answer due (ChairState.due). The escape and the rung
 * effects act through chair/acting.ts (levers.ts and the effects overlay). Layer 6.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND } from '../../types';
import type { ChairState, Content, GameState, LoopholeDef, LoopholeState, LoopholeView, NewsItem } from '../../types';
import { calendarYear } from '../calendar';
import { evalCond, condCheck } from '../conditions';
import { modsOf } from '../effects';
import { emit } from '../events';
import type { EvDraft } from '../events';
import { featureOn } from '../features';
import { computeFlows } from '../flows';
import { headline, newsWith } from '../headlines';
import { fin } from '../util';
import { chairIdx } from './chairIndex';

/** Loophole rules run: a Ministry with feature 'loopholes' on. */
export const loopholesOn = (state: GameState, content: Content): boolean =>
  !!state.chair && featureOn(content, state.meta, 'loopholes');

const rungWhen = (state: GameState, content: Content, r: LoopholeDef): boolean => !r.when || evalCond(state, content, r.when);
/** closedBy holds now (the rung is shut to the rival). */
export const rungRobust = (state: GameState, content: Content, r: LoopholeDef): boolean => !!r.closedBy && evalCond(state, content, r.closedBy);

/** The rung the rival would evade through for lever `id` now: the first 'open' rung whose closedBy fails; null if none. */
export function evadeRung(state: GameState, content: Content, id: string): LoopholeDef | null {
  const ch = state.chair;
  if (!ch || !loopholesOn(state, content)) return null;
  for (const r of chairIdx(content).ladders.get(id) ?? []) {
    if (ch.loopholes[r.id]?.status === 'open' && !rungRobust(state, content, r)) return r;
  }
  return null;
}

/** The chair with lever `id`'s first rung opened if the lever acts (level ≥ 1) and none of its rungs has a state yet. */
function openFirst(state: GameState, content: Content, ch: ChairState, id: string, time: number, ev: EvDraft[], arrivedOnly = false): ChairState {
  const rungs = chairIdx(content).ladders.get(id);
  const level = state.levers[id]?.level ?? 0;
  if (!rungs || !(level >= 1)) return ch;
  if (rungs.some((r) => ch.loopholes[r.id] !== undefined)) return ch;
  // M5 (follow-up): a lever the rival has already answered at this level was raised before feature 'loopholes' arrived;
  // its first rung waits for the next order tick (openArrived), so it appears with the feature's arrival, and is answered
  const before = ch.rival.answers[id]?.level === level;
  if (before !== arrivedOnly) return ch;
  const r = rungs.find((x) => rungWhen(state, content, x));
  if (!r) return ch;
  ev.push({ kind: 'loopholeOpened', sector: content.levers?.find((l) => l.id === id)?.sector, id: r.id });
  return { ...ch, loopholes: { ...ch.loopholes, [r.id]: { status: 'open', since: time } } };
}

/** ModelApi helper: open lever `id`'s first rung now (setLever may call it on a raise from 0; loopholeStep does anyway). */
export function openLadder(state: GameState, content: Content, id: string): GameState {
  const ch = state.chair;
  if (!ch || !loopholesOn(state, content)) return state;
  const ev: EvDraft[] = [];
  const ch2 = openFirst(state, content, ch, id, state.time, ev);
  if (ch2 === ch) return state;
  return withNews({ ...state, chair: ch2 }, content, ev, state.time);
}

function withNews(state: GameState, content: Content, ev: EvDraft[], time: number): GameState {
  if (!ev.length) return state;
  const year = calendarYear(state, content);
  const items: NewsItem[] = [];
  for (const e of ev) {
    if (e.kind === 'loopholeOpened' || e.kind === 'loopholeUsed' || e.kind === 'loopholeClosed') {
      const r = chairIdx(content).loopholes.get(e.id ?? '');
      items.push(headline(state, content, e.kind, time, { year, name: r?.name ?? '' }, e.sector));
    }
  }
  const s = items.length ? { ...state, ...newsWith(state, content, items) } : state;
  return emit(s, ev, time, year);
}

/**
 * Every step (live, away and in projections alike; cheap with no ladders): a laddered lever acting with no rung state
 * opens its first rung; a drafting rung whose draftUntil has come closes (held while in Opposition), the next rung whose
 * `when` holds opens, and the lever's answer falls due.
 */
export function loopholeStep(next: GameState, content: Content): GameState {
  const ch0 = next.chair;
  if (!ch0) return next;
  const cx = chairIdx(content);
  if (!cx.ladders.size || !loopholesOn(next, content)) return next;
  const time = next.time;
  const ev: EvDraft[] = [];
  let ch = ch0;
  for (const [id, rungs] of cx.ladders) {
    ch = openFirst(next, content, ch, id, time, ev);
    for (let i = 0; i < rungs.length; i++) {
      const st = ch.loopholes[rungs[i].id];
      if (st?.status !== 'drafting' || !(typeof st.draftUntil === 'number' && time >= st.draftUntil) || ch.inOpposition) continue;
      const loopholes: Record<string, LoopholeState> = { ...ch.loopholes, [rungs[i].id]: { status: 'closed', since: time } };
      const sector = content.levers?.find((l) => l.id === id)?.sector;
      ev.push({ kind: 'loopholeClosed', sector, id: rungs[i].id });
      for (let j = i + 1; j < rungs.length; j++) {
        if (loopholes[rungs[j].id] !== undefined || !rungWhen(next, content, rungs[j])) continue;
        loopholes[rungs[j].id] = { status: 'open', since: time };
        ev.push({ kind: 'loopholeOpened', sector, id: rungs[j].id });
        break;
      }
      ch = { ...ch, loopholes, due: { ...(ch.due ?? {}), [id]: true } };
    }
  }
  return ch === ch0 ? next : withNews({ ...next, chair: ch }, content, ev, time);
}

/**
 * M5 (follow-up) at an order tick, before the answers: every laddered lever raised BEFORE feature 'loopholes' arrived
 * (answered at its current level, no rung state yet) opens its first rung now and its answer falls due. Rungs never open
 * or act while the feature is off.
 */
export function openArrived(state: GameState, content: Content): GameState {
  const ch0 = state.chair;
  if (!ch0 || !loopholesOn(state, content)) return state;
  const ev: EvDraft[] = [];
  let ch = ch0;
  for (const id of chairIdx(content).ladders.keys()) {
    const c2 = openFirst(state, content, ch, id, state.time, ev, true);
    if (c2 !== ch) ch = { ...c2, due: { ...(c2.due ?? {}), [id]: true } };
  }
  return ch === ch0 ? state : withNews({ ...state, chair: ch }, content, ev, state.time);
}

/** At an order tick: a 'used' rung whose closedBy now holds returns to 'open' (escape and effects stop) and its lever's
 *  answer falls due. */
export function robustReopen(state: GameState, content: Content): GameState {
  const ch0 = state.chair;
  if (!ch0 || !loopholesOn(state, content)) return state;
  let ch = ch0;
  for (const [id, rungs] of chairIdx(content).ladders) {
    for (const r of rungs) {
      if (ch.loopholes[r.id]?.status !== 'used' || !rungRobust(state, content, r)) continue;
      ch = { ...ch, loopholes: { ...ch.loopholes, [r.id]: { status: 'open', since: state.time } }, due: { ...(ch.due ?? {}), [id]: true } };
    }
  }
  return ch === ch0 ? state : { ...state, chair: ch };
}

/** Evade: rung `r` → 'used'; its exempt application founded free by the rival. Events into `ev`. */
export function useRung(state: GameState, content: Content, r: LoopholeDef, ev: EvDraft[]): GameState {
  const ch = state.chair!;
  const lever = content.levers?.find((l) => l.id === r.lever);
  let s: GameState = { ...state, chair: { ...ch, loopholes: { ...ch.loopholes, [r.id]: { status: 'used', since: state.time } } } };
  ev.push({ kind: 'loopholeUsed', sector: lever?.sector, id: r.id, by: 'rival' });
  if (r.app) {
    for (const sid in s.sectors) {
      const es = s.sectors[sid];
      const st = es?.apps?.[r.app];
      if (!st || st.founded) continue;
      s = { ...s, sectors: { ...s.sectors, [sid]: { ...es, apps: { ...es.apps, [r.app]: { ...st, available: true, founded: true } } } } };
      ev.push({ kind: 'appFounded', sector: sid, id: r.app, by: 'rival' });
      break;
    }
  }
  return s;
}

/** Whether rung `r` can be amended at all, and its cost, drafting years now and label. */
export function amendTerms(state: GameState, content: Content, r: LoopholeDef): { cost: number; years: number; label: string } | null {
  if (!r.amend && r.closedBy) return null;
  const d = content.chair?.amend;
  const cost = Math.max(0, fin(r.amend?.mandateCost ?? d?.mandateCost ?? 0));
  const years = Math.max(0, fin(r.amend?.years ?? d?.years ?? 0)) * fin(modsOf(state, content).amendYearsMul, 1);
  return { cost, years, label: r.amend?.label ?? r.name };
}

/** ModelApi.amend (a decision; allowed in Opposition). The same reference when refused. */
export function amend(state: GameState, content: Content, id: string): GameState {
  const ch = state.chair;
  const r = chairIdx(content).loopholes.get(id);
  if (!ch || !r || !loopholesOn(state, content) || computeFlows(state, content).pending) return state;
  const st = ch.loopholes[id];
  if (!st || (st.status !== 'open' && st.status !== 'used')) return state;
  const t = amendTerms(state, content, r);
  if (!t || !(state.mandate >= t.cost)) return state;
  const ls: LoopholeState = { status: 'drafting', since: state.time, draftUntil: state.time + t.years / YEARS_PER_SECOND, before: st.status };
  return { ...state, mandate: fin(state.mandate - t.cost), chair: { ...ch, loopholes: { ...ch.loopholes, [id]: ls } } };
}

/** LoopholeView for every rung of lever `leverId` (or of every lever) with a state this Ministry, ladder order. */
export function loopholeViews(state: GameState, content: Content, leverId?: string): LoopholeView[] {
  const ch = state.chair;
  if (!ch || !loopholesOn(state, content)) return [];
  const out: LoopholeView[] = [];
  const cx = chairIdx(content);
  const ladders = leverId !== undefined ? [[leverId, cx.ladders.get(leverId) ?? []] as const] : [...cx.ladders];
  const pending = !!computeFlows(state, content).pending;
  for (const [, rungs] of ladders) {
    for (const r of rungs) {
      const st = ch.loopholes[r.id];
      if (!st) continue;
      const t = amendTerms(state, content, r);
      const drafting = st.status === 'drafting' && typeof st.draftUntil === 'number';
      out.push({
        id: r.id, lever: r.lever, status: st.status, name: r.name, blurb: r.blurb,
        canAmend: !!t && !pending && (st.status === 'open' || st.status === 'used') && state.mandate >= t.cost,
        amendCost: t ? t.cost : null, amendLabel: t ? t.label : null, amendYears: t ? t.years : null,
        draftLeft: drafting ? Math.max(0, st.draftUntil! - state.time) : null,
        draftTotal: drafting ? Math.max(0, st.draftUntil! - st.since) : null,
        robustLabel: r.closedBy ? condCheck(state, content, r.closedBy).label : null,
        robust: rungRobust(state, content, r), prop: r.prop ?? null,
      });
    }
  }
  return out;
}
