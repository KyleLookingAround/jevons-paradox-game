/**
 * Budget lines and the Steady State parameters: the declining line, its floor and hold, the standing-cap draw delay, the
 * decade length and decade rewards. The streak, decade and Steady State rules themselves run inside step.ts.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND, BUDGET_TOLERANCE } from '../types';
import type { Content, EffectDef, SectorDef, SectorId, SectorState } from '../types';
import { DEFAULT_BUDGET_DECLINE, DEFAULT_DECADE_YEARS } from './constants';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* Budget line                                                         */
/* ------------------------------------------------------------------ */

export function steadyCfg(content: Content): { decline: number; decadeYears: number; decadeEffects: EffectDef[]; first: EffectDef[] } {
  const st = content.global?.steady;
  const dy = st?.decadeYears;
  return {
    decline: fin(st?.budgetDeclinePerDecade ?? DEFAULT_BUDGET_DECLINE, DEFAULT_BUDGET_DECLINE),
    decadeYears: dy !== undefined && dy > 0 ? dy : DEFAULT_DECADE_YEARS,
    decadeEffects: st?.decadeEffects ?? [],
    first: st?.firstSteadyEffects ?? [],
  };
}
export const decadeEffectsOf = (content: Content, s: SectorId): EffectDef[] =>
  content.sectors[s]?.steady?.decadeEffects ?? steadyCfg(content).decadeEffects;

/** M1 balance: the line declines until held (Steady State reached on it), never below floor × r0. */
export function budgetROf(es: SectorState | undefined, def: SectorDef, content: Content, time: number): number | null {
  const b = es?.budget;
  if (!b) return null;
  const d = def.steady?.declinePerDecade ?? steadyCfg(content).decline;
  const floor = clamp(fin(def.steady?.budgetFloor ?? content.global?.steady?.budgetFloor ?? 0), 0, 1);
  const until = b.heldAt !== undefined && Number.isFinite(b.heldAt) ? Math.min(time, b.heldAt) : time;
  return fin(Math.max(floor * b.r0, b.r0 * Math.pow(Math.max(0, 1 - d), ((until - b.since) * YEARS_PER_SECOND) / 10)));
}
export const standingDrawYearsOf = (def: SectorDef, content: Content): number =>
  Math.max(0, fin(def.steady?.standingDrawYears ?? content.global?.steady?.standingDrawYears ?? 0));
export const isWithin = (R: number, budgetR: number | null): boolean => budgetR !== null && R <= budgetR * (1 + BUDGET_TOLERANCE);
