/**
 * The Commons, actions and panel (M2): buyCommons (fund first, then capital) and commonsViews. The arithmetic is in
 * commons.ts.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Actor, CommonsDef, CommonsView, Content, GameState } from '../types';
import { calendarYear } from './calendar';
import { commonsMax, commonsOpen, projectIntensity, projectWellbeing } from './commons';
import { evalCond } from './conditions';
import { idx } from './contentIndex';
import { modsOf, fireOneOffs } from './effects';
import type { OneOffs } from './effects';
import { emit } from './events';
import { computeFlows } from './flows';
import { headline, withNews } from './headlines';
import { fin } from './util';

export const commonsCost = (def: CommonsDef, L: number): number => fin(def.cost * Math.pow(def.costGrowth ?? 1, L));

export function commonsVisible(state: GameState, content: Content, def: CommonsDef): boolean {
  if (!commonsOpen(state, content)) return false;
  if (def.sector !== undefined && !state.sectors[def.sector]?.open) return false;
  return !def.requires || evalCond(state, content, def.requires);
}

/** buyCommons would accept with `capital` available (the fund is always available). */
export function commonsBuyable(state: GameState, content: Content, def: CommonsDef, capital: number): boolean {
  const L = state.commons?.levels?.[def.id] ?? 0;
  if (L >= commonsMax(def) || !commonsVisible(state, content, def)) return false;
  if (computeFlows(state, content).pending) return false;
  return (state.commons?.fund ?? 0) + capital >= commonsCost(def, L) && state.mandate >= (def.mandateCost ?? 0);
}

export function buyCommons(state: GameState, content: Content, id: string): GameState {
  return buyCommonsAs(state, content, id, 'player');
}
export function buyCommonsAs(state: GameState, content: Content, id: string, by: Actor): GameState {
  const def = idx(content).commons.get(id);
  if (!def || !commonsBuyable(state, content, def, state.capital)) return state;
  const L = state.commons.levels[id] ?? 0;
  const cost = commonsCost(def, L);
  const fromFund = Math.min(state.commons.fund, cost);
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  fireOneOffs(def.effects ?? [], 1, computeFlows(state, content).income, one);
  const year = calendarYear(state, content);
  const out: GameState = {
    ...state,
    capital: fin(state.capital - (cost - fromFund) + one.capital),
    mandate: fin(state.mandate - (def.mandateCost ?? 0) + one.mandate),
    commons: { levels: { ...state.commons.levels, [id]: L + 1 }, fund: fin(state.commons.fund - fromFund) },
    news: withNews(state.news, [headline(state, content, 'commonsBuilt', state.time, { year, name: def.name }, def.sector)]),
  };
  return emit(out, [{ kind: 'commonsBuilt', id, n: L + 1, ...(def.sector ? { sector: def.sector } : {}), by }], state.time, year);
}

export function commonsViews(state: GameState, content: Content): CommonsView[] {
  const mods = modsOf(state, content);
  const pending = !!computeFlows(state, content).pending;
  const fund = state.commons?.fund ?? 0;
  return (content.commons ?? []).map((def) => {
    const level = state.commons?.levels?.[def.id] ?? 0;
    const maxLevel = commonsMax(def);
    const maxed = level >= maxLevel;
    const cost = maxed ? null : commonsCost(def, level);
    const mandateCost = maxed ? null : def.mandateCost ?? 0;
    const visible = commonsVisible(state, content, def);
    const affordable = !maxed && fund + state.capital >= (cost as number) && state.mandate >= (mandateCost as number);
    const wellbeing = projectWellbeing(def, level, mods.commonsYieldMul);
    return {
      def, level, maxLevel, cost, mandateCost, visible, maxed, affordable,
      canBuy: visible && !maxed && affordable && !pending,
      wellbeing,
      nextWellbeing: maxed ? 0 : fin(projectWellbeing(def, level + 1, mods.commonsYieldMul) - wellbeing),
      intensityNow: projectIntensity(state, def, level, Math.max(0.01, state.population)),
    };
  });
}
