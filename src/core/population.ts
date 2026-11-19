/**
 * Population growth: wellbeing above subsistence, the decline below it, and the demographic transition.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content } from '../types';
import { NEGATIVE_GROWTH_STRENGTH } from './constants';
import type { Mods } from './effects';
import { fin } from './util';

export function popGrowthRate(W: number, content: Content, mods: Mods): number {
  const g = content.global;
  const x = W - g.subsistence;
  let growth = g.popGrowth * mods.popGrowthMul * x;
  if (x < 0) return growth * NEGATIVE_GROWTH_STRENGTH;
  const Wt = g.demography?.transitionWellbeing;
  if (Wt !== undefined && Wt > g.subsistence) growth *= Math.max(0, 1 - (x / (Wt - g.subsistence)) ** 2);
  return fin(growth);
}
