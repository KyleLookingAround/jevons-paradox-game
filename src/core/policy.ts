/**
 * Policy actions in a run: raising and lowering levers, choosing where a levy goes, drawing budget lines; and the
 * lever views.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Actor, Content, GameState, LeverRecycle, LeverView, NewsItem, SectorId, SectorState } from '../types';
import { calendarYear } from './calendar';
import { commonsOpen } from './commons';
import { idx } from './contentIndex';
import { modsOf, isForbidden, refreshEta, leverMulOf } from './effects';
import { evalCond } from './conditions';
import { emit } from './events';
import type { EvDraft } from './events';
import { computeFlows } from './flows';
import { headline, newsWith } from './headlines';
import { leverLevelDef, leverNetUpkeep, leverReachable, leverVisible, recycleOptions, recycleOf } from './levers';
import { featureOn } from './features';
import { budgetROf, isWithin, newBudget, pacesOf } from './steady';
import { fin } from './util';
import { drawLine, lineR } from './account';

/** Largest number of lever levels one setLever call may climb (guards unbounded repeat). */
const MAX_LEVEL_JUMP = 10_000;

/** Draw (or redraw) a line at R now; a redraw resets both streaks and the window. */
function drawBudgetAt(state: GameState, content: Content, s: SectorId, R: number, W: number, items: NewsItem[], ev: EvDraft[], by: Actor, pace?: string): Record<SectorId, SectorState> {
  const es = state.sectors[s];
  const year = calendarYear(state, content);
  // M4 (the Survey): on the account of the moment ('full' while 'estimates' is on)
  const budget = idx(content).anyM4 ? drawLine(state, content, computeFlows(state, content), s, R, state.time, year, W, es.pressure, pace) : newBudget(content, s, R, state.time, year, W, es.pressure, pace);
  items.push(headline(state, content, 'budgetDrawn', state.time, { year }, s));
  ev.push({ kind: 'budgetDrawn', sector: s, id: budget.pace, by });
  const redraw = !!es.budget;
  return {
    ...state.sectors,
    [s]: { ...es, budget, steadyYears: redraw ? 0 : es.steadyYears, clearYears: redraw ? 0 : es.clearYears, windowLean: redraw ? false : es.windowLean },
  };
}

export function setLever(state: GameState, content: Content, leverId: string, level: number): GameState {
  return setLeverAs(state, content, leverId, level, 'player');
}
/** setLever by any actor ('player' or 'civilService'); only the player's line sets run.firstBudgetAt. */
export function setLeverAs(state: GameState, content: Content, leverId: string, level: number, by: Actor): GameState {
  const def = idx(content).levers.get(leverId);
  if (!def || !Number.isFinite(level)) return state;
  const target = Math.round(level);
  if (target < 0 || target > leverReachable(state, content, def)) return state;
  const mods = modsOf(state, content);
  if (!leverVisible(state, content, def, mods)) return state;
  const cur = state.levers[leverId] ?? { level: 0, ref: 0 };
  if (target === cur.level) return state;
  const fl = computeFlows(state, content);
  if (fl.pending) return state;
  if (target < cur.level) {
    const low = { ...state, levers: { ...state.levers, [leverId]: { ...cur, level: target, ref: target > 0 ? cur.ref : 0 } } };
    return def.kind === 'measure' ? refreshEta(low, content) : low;
  }
  if (target - cur.level > MAX_LEVEL_JUMP || isForbidden(mods, def.id, def)) return state;
  const inst = mods.startLevers[leverId] ?? 0;
  let cost = 0;
  const lm = leverMulOf(mods, def).cost;
  for (let l = cur.level + 1; l <= target; l++) if (l > inst) cost += (leverLevelDef(def, l)?.mandateCost ?? 0) * lm;
  if (!(state.mandate >= cost)) return state;
  const f = fl.sectors[def.sector];
  let ref = cur.ref;
  if (cur.level === 0 || !(ref > 0)) ref = def.kind === 'duty' && f && f.D > 0 ? f.pPre + f.permitPart : 0;
  const items: NewsItem[] = [];
  const ev: EvDraft[] = [];
  let sectors = state.sectors;
  let run = state.run;
  const es0 = state.sectors[def.sector];
  if (!es0?.budget && f && f.R > 0 && featureOn(content, state.meta, 'budget')) {
    sectors = drawBudgetAt(state, content, def.sector, f.R, fl.wellbeing, items, ev, by);
    if (by === 'player' && run.firstBudgetAt === null) run = { ...run, firstBudgetAt: state.time };
  } else if (def.kind === 'cap' && cur.level === 0 && es0?.budget && f && f.R > 0) {
    // QA (B17): a cap enacted over a line the economy has outgrown would cut use to the old line at a stroke; it redraws
    // the line at today's use instead, at its own pace (the streak is already broken while over the line)
    const bR = budgetROf(es0, content.sectors[def.sector], content, state.time);
    if (bR !== null && !isWithin(lineR(state, content, fl, def.sector), bR)) sectors = drawBudgetAt(state, content, def.sector, f.R, fl.wellbeing, items, ev, by, es0.budget.pace);
  }
  const year = calendarYear(state, content);
  items.push(headline(state, content, 'leverEnacted', state.time, { year }, def.sector));
  ev.push({ kind: 'leverEnacted', sector: def.sector, id: leverId, n: target, by });
  const raised = emit({
    ...state, mandate: state.mandate - cost, sectors, run,
    levers: { ...state.levers, [leverId]: { ...cur, level: target, ref: fin(ref) } },
    ...newsWith(state, content, items),
  }, ev, state.time, year);
  return def.kind === 'measure' ? refreshEta(raised, content) : raised;
}

export function setLeverRecycle(state: GameState, content: Content, leverId: string, option: LeverRecycle): GameState {
  const def = idx(content).levers.get(leverId);
  if (!def || !recycleOptions(def).includes(option) || !featureOn(content, state.meta, 'moreLevers')) return state;
  if (option === 'commons' && !commonsOpen(state, content)) return state;
  const cur = state.levers[leverId] ?? { level: 0, ref: 0 };
  if (recycleOf(def, cur) === option || computeFlows(state, content).pending) return state;
  return { ...state, levers: { ...state.levers, [leverId]: { ...cur, recycle: option } } };
}

export function drawBudget(state: GameState, content: Content, sector: SectorId, pace?: string): GameState {
  const es = state.sectors[sector];
  if (!state.flags.revealed || !es?.open || es.settled || !featureOn(content, state.meta, 'budget')) return state;
  const paces = pacesOf(content, sector);
  if (pace !== undefined && !paces.some((p) => p.id === pace)) return state;
  if (pace !== undefined && pace !== paces[0]?.id && !featureOn(content, state.meta, 'budgetPace')) return state;
  const fl = computeFlows(state, content);
  const f = fl.sectors[sector];
  if (fl.pending || !f || !(f.R > 0)) return state;
  const items: NewsItem[] = [];
  const ev: EvDraft[] = [];
  const sectors = drawBudgetAt(state, content, sector, f.R, fl.wellbeing, items, ev, 'player', pace);
  const run = state.run.firstBudgetAt === null ? { ...state.run, firstBudgetAt: state.time } : state.run;
  return emit({ ...state, sectors, run, ...newsWith(state, content, items) }, ev, state.time, calendarYear(state, content));
}

const cap1 = (x: string): string => x.charAt(0).toUpperCase() + x.slice(1);

export function leverViews(state: GameState, content: Content): LeverView[] {
  const mods = modsOf(state, content);
  const open = commonsOpen(state, content);
  const fuller = featureOn(content, state.meta, 'moreLevers');
  return (content.levers ?? []).map((def) => {
    const ls = state.levers[def.id];
    const level = ls?.level ?? 0;
    const inst = mods.startLevers[def.id] ?? 0;
    const visible = leverVisible(state, content, def, mods);
    const maxLevel = leverReachable(state, content, def);
    const next = level < maxLevel ? leverLevelDef(def, level + 1) : null;
    const lm = leverMulOf(mods, def);
    const nextCost = next ? (level + 1 <= inst ? 0 : next.mandateCost * lm.cost) : null;
    const forbidden = isForbidden(mods, def.id, def);
    const se = def.sideEffects;
    let bite: LeverView['bite'] = null;
    if (se && featureOn(content, state.meta, 'sideEffects')) {
      const unlessMet = !!se.unless && evalCond(state, content, se.unless);
      bite = { value: ls?.bite ?? 0, growing: level >= 1 && !unlessMet, unlessMet, blurb: se.blurb, unlessLabel: se.unlessLabel ?? '' };
    }
    const opts0 = recycleOptions(def);
    const opts = fuller ? opts0 : opts0.slice(0, 1);
    return {
      def, level, maxLevel, current: leverLevelDef(def, level), next, visible, nextCost,
      canRaise: visible && nextCost !== null && state.mandate >= nextCost && !forbidden,
      upkeep: leverNetUpkeep(def, level, inst, lm.upkeep),
      recycleOptions: opts, recycle: recycleOf(def, ls),
      recycleChoices: opts.map((option) => ({
        option,
        name: content.recycleText?.[option]?.name ?? cap1(option),
        blurb: def.recycleBlurb?.[option] ?? content.recycleText?.[option]?.blurb ?? '',
        available: option !== 'commons' || open,
      })),
      bite, forbidden,
    };
  });
}
