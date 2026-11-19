/**
 * M3: Histories (HistoryDef): named counterfactual runs chosen between runs like a Charter (chooseHistory), with a goal.
 * The History's effects and `suspend` act through Mods (effects.ts); here: the choice, forbidUntil and the goal check
 * the step runs, the rewards, and the picker (historyViews).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState, HistoryDef, HistoryView, MetaState, NewsItem } from '../types';
import { calendarYear } from './calendar';
import { evalCond } from './conditions';
import { idx } from './contentIndex';
import { emit } from './events';
import type { EvDraft } from './events';
import { featureOn } from './features';
import { headline } from './headlines';
import { milestone } from './milestones';
import { isFreshRun, withMeta } from './state';

/** Offered in the picker: feature 'histories' on and `requires` holds (against this state, the fresh run). */
export function historyOffered(state: GameState, content: Content, def: HistoryDef): boolean {
  return featureOn(content, state.meta, 'histories') && (!def.requires || evalCond(state, content, def.requires));
}

/** The History in force was cleared in this run (no run-scoped field exists: read this run's news and events). */
export function clearedThisRun(state: GameState): boolean {
  if (state.news.some((n) => n.key === 'history')) return true;
  const ev = state.events ?? [];
  for (let i = ev.length - 1; i >= 0; i--) {
    if (ev[i].kind === 'historyCleared') return true;
    if (ev[i].kind === 'reckoning') return false;
  }
  return false;
}

export function chooseHistory(state: GameState, content: Content, id: string | null): GameState {
  if (!isFreshRun(state) || !featureOn(content, state.meta, 'histories')) return state;
  const cur = state.meta.history ?? null;
  if (cur === id) return state;
  const ix = idx(content);
  if (id !== null) {
    const def = ix.histories.get(id);
    if (!def || !historyOffered(state, content, def)) return state;
  }
  const hs = { ...(state.meta.histories ?? {}) };
  if (cur !== null && hs[cur]) hs[cur] = { ...hs[cur], runs: Math.max(0, hs[cur].runs - 1) };
  if (id !== null) { const h = hs[id] ?? { runs: 0, cleared: false, best: null }; hs[id] = { ...h, runs: h.runs + 1 }; }
  const s = withMeta(state, content, { ...state.meta, history: id, histories: hs });
  if (id === null) return s;
  return emit(s, [{ kind: 'historyChosen', id }], 0, calendarYear(s, content));
}

/** The step's History rules on `next` (conditions read `prev`, the state at the start of the step): forbidUntil each
 *  step; the goal about once a real second (`secondTick`), once a run. News and events go to `items` / `ev`. */
export function stepHistory(prev: GameState, next: GameState, content: Content, secondTick: boolean, year: number, items: NewsItem[], ev: EvDraft[]): GameState {
  const id = prev.meta.history;
  if (id === null || id === undefined) return next;
  const def = idx(content).histories.get(id);
  if (!def) return next;
  let s = next;
  if (!prev.historyLifted && def.forbidUntil && evalCond(prev, content, def.forbidUntil)) s = { ...s, historyLifted: true };
  if (secondTick && !clearedThisRun(prev) && evalCond(prev, content, def.goal)) {
    const h = s.meta.histories?.[id] ?? { runs: 0, cleared: false, best: null };
    const first = !h.cleared;
    const unlocks = { ...(s.meta.unlocks ?? {}) };
    for (const u of def.reward?.unlock ?? []) unlocks[u] = true;
    if (def.reward?.cosmetic) unlocks[`cosmetic:${def.reward.cosmetic}`] = true;
    if (def.reward?.title) unlocks[`title:${def.reward.title}`] = true;
    let meta: MetaState = {
      ...s.meta, unlocks,
      histories: { ...(s.meta.histories ?? {}), [id]: { runs: h.runs, cleared: true, best: h.best === null ? s.time : Math.min(h.best, s.time) } },
    };
    if (def.reward?.achievement && !meta.achievements[def.reward.achievement]) meta = { ...meta, achievements: { ...meta.achievements, [def.reward.achievement]: true } };
    meta = milestone(meta, 'history', null, year);
    s = { ...s, meta };
    items.push(headline(prev, content, 'history', s.time, { year, name: def.name }));
    ev.push({ kind: 'historyCleared', id, ...(first ? { first: true } : {}) });
  }
  return s;
}

export function historyViews(state: GameState, content: Content): HistoryView[] {
  const fresh = isFreshRun(state);
  const cur = state.meta.history ?? null;
  return (content.histories ?? []).map((def) => {
    const offered = historyOffered(state, content, def);
    const h = state.meta.histories?.[def.id];
    const inForce = cur === def.id;
    return { def, offered, inForce, runs: h?.runs ?? 0, cleared: h?.cleared ?? false, best: h?.best ?? null, canChoose: offered && fresh && !inForce };
  });
}
