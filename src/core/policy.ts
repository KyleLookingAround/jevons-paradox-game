/**
 * Policy actions in a run: raising and lowering levers, choosing where a levy goes, drawing budget lines; and the
 * lever views.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { BudgetState, Content, GameState, LeverRecycle, LeverView, NewsItem, SectorId, SectorState } from '../types';
import { calendarYear } from './calendar';
import { idx } from './contentIndex';
import { modsOf } from './effects';
import { computeFlows } from './flows';
import { headline, withNews } from './headlines';
import { leverMaxLevel, leverLevelDef, leverNetUpkeep, leverVisible, recycleOptions, recycleOf } from './levers';
import { fin } from './util';

/** Largest number of lever levels one setLever call may climb (guards unbounded repeat). */
const MAX_LEVEL_JUMP = 10_000;

function drawBudgetAt(state: GameState, content: Content, s: SectorId, R: number, items: NewsItem[]): Record<SectorId, SectorState> {
  const es = state.sectors[s];
  const year = calendarYear(state, content);
  const budget: BudgetState = { r0: R, since: state.time, drawnYear: Math.floor(year) };
  items.push(headline(state, content, 'budgetDrawn', state.time, { year }, s));
  return { ...state.sectors, [s]: { ...es, budget, steadyYears: es.budget ? 0 : es.steadyYears } };
}

export function setLever(state: GameState, content: Content, leverId: string, level: number): GameState {
  const def = idx(content).levers.get(leverId);
  if (!def || !Number.isFinite(level)) return state;
  const target = Math.round(level);
  if (target < 0 || target > leverMaxLevel(def)) return state;
  const mods = modsOf(state, content);
  if (!leverVisible(state, content, def, mods)) return state;
  const cur = state.levers[leverId] ?? { level: 0, ref: 0 };
  if (target === cur.level) return state;
  const fl = computeFlows(state, content);
  if (fl.pending) return state;
  if (target < cur.level) {
    return { ...state, levers: { ...state.levers, [leverId]: { ...cur, level: target, ref: target > 0 ? cur.ref : 0 } } };
  }
  if (target - cur.level > MAX_LEVEL_JUMP) return state;
  const inst = mods.startLevers[leverId] ?? 0;
  let cost = 0;
  for (let l = cur.level + 1; l <= target; l++) if (l > inst) cost += leverLevelDef(def, l)?.mandateCost ?? 0;
  if (!(state.mandate >= cost)) return state;
  const f = fl.sectors[def.sector];
  let ref = cur.ref;
  if (cur.level === 0 || !(ref > 0)) ref = def.kind === 'duty' && f && f.D > 0 ? f.pPre + f.permitPart : 0;
  const items: NewsItem[] = [];
  let sectors = state.sectors;
  if (!state.sectors[def.sector]?.budget && f && f.R > 0) sectors = drawBudgetAt(state, content, def.sector, f.R, items);
  items.push(headline(state, content, 'leverEnacted', state.time, { year: calendarYear(state, content) }, def.sector));
  return {
    ...state, mandate: state.mandate - cost, sectors,
    levers: { ...state.levers, [leverId]: { ...cur, level: target, ref: fin(ref) } },
    news: withNews(state.news, items),
  };
}

export function setLeverRecycle(state: GameState, content: Content, leverId: string, option: LeverRecycle): GameState {
  const def = idx(content).levers.get(leverId);
  if (!def || !recycleOptions(def).includes(option)) return state;
  const cur = state.levers[leverId] ?? { level: 0, ref: 0 };
  if (recycleOf(def, cur) === option && cur.recycle === option) return state;
  return { ...state, levers: { ...state.levers, [leverId]: { ...cur, recycle: option } } };
}

export function drawBudget(state: GameState, content: Content, sector: SectorId): GameState {
  if (!state.flags.revealed || !state.sectors[sector]?.open) return state;
  const fl = computeFlows(state, content);
  const f = fl.sectors[sector];
  if (fl.pending || !f || !(f.R > 0)) return state;
  const items: NewsItem[] = [];
  const sectors = drawBudgetAt(state, content, sector, f.R, items);
  return { ...state, sectors, news: withNews(state.news, items) };
}

export function leverViews(state: GameState, content: Content): LeverView[] {
  const mods = modsOf(state, content);
  return (content.levers ?? []).map((def) => {
    const ls = state.levers[def.id];
    const level = ls?.level ?? 0;
    const inst = mods.startLevers[def.id] ?? 0;
    const visible = leverVisible(state, content, def, mods);
    const maxLevel = leverMaxLevel(def);
    const next = level < maxLevel ? leverLevelDef(def, level + 1) : null;
    const nextCost = next ? (level + 1 <= inst ? 0 : next.mandateCost) : null;
    return {
      def, level, maxLevel, current: leverLevelDef(def, level), next, visible, nextCost,
      canRaise: visible && nextCost !== null && state.mandate >= nextCost,
      upkeep: leverNetUpkeep(def, level, inst),
      recycleOptions: recycleOptions(def), recycle: recycleOf(def, ls),
    };
  });
}
