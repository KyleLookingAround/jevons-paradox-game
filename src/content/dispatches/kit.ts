/**
 * The dispatch writer's kit: conditions that stage the unfolding, and short effect builders. Shared by every module in
 * dispatches/ (and by cast.ts); imports nothing but the contract.
 * Content is data (see ../README.md): every number and word here is read by the core and the UI; no game rules.
 *
 * Magnitudes (the balance lane audits them; see dispatches.test.ts for the bounds): one-offs of 10–60 s of income or
 * 20–150 Mandate; timed modifiers of 5–15 model years (100–300 s); multipliers 0.85–1.2; standing effects small, since
 * they stand for the rest of the run. A decade within budget pays 60 Mandate and 30 s of income: an arm is worth
 * about half a decade, never two.
 */
import type { Cond, DispatchArm, EffectDef, SectorId } from '../../types';

/* ------------------------------------------------------------------ */
/* CONDITIONS: the unfolding                                           */
/* ------------------------------------------------------------------ */

export const rk = (n: number): Cond => ({ stat: 'reckonings', op: '>=', value: n });
export const year = (op: '<' | '>=', value: number): Cond => ({ stat: 'year', op, value });
export const sec = (stat: 'rFold' | 'etaFold' | 'pressureFraction' | 'reserveFraction' | 'rebound' | 'appsFounded' | 'crises' | 'serviceDelivered' | 'seamsSunk' | 'budgetDecades' | 'bite' | 'clear' | 'steadyYears' | 'withinBudget' | 'sprawl' | 'loadFactor',
  sector: SectorId, op: '<' | '<=' | '>' | '>=', value: number): Cond => ({ stat, sector, op, value });
export const owns = (id: string): Cond => ({ owns: id });
export const all = (...c: Cond[]): Cond => ({ all: c });
export const any = (...c: Cond[]): Cond => ({ any: c });
export const not = (c: Cond): Cond => ({ not: c });
export const answered = (id: string, arm?: number): Cond => (arm === undefined ? { answered: id } : { answered: id, arm });

/** The correspondent's first letter, which introduces dispatches; every other correspondent letter waits for it. */
export const FIRST_LETTER = 'd.gen.firstLetter';
export const AFTER_FIRST: Cond = answered(FIRST_LETTER);

/** Run 3 on: the budget has arrived (feature 'budget' needs two Reckonings, the reveal and 1801), or a line or a cap is
 *  plainly in use. A letter that names the line, a decade or the cap carries this. */
export const BUDGET: Cond = all(rk(2), any(rk(3), owns('steam.cap'), owns('light.cap'), sec('budgetDecades', 'steam', '>=', 1)));
/** Run 3 on: Charters (feature 'charters' at the second Reckoning). */
export const CHARTERS: Cond = rk(2);
/** Run 4 on: the Commons (feature 'commons' at the third Reckoning). */
export const COMMONS: Cond = rk(3);
/** The first Steady State ever (the built-in achievement), after which Steady State is a thing the player has met. */
export const STEADY: Cond = owns('steadyState');
/** Settlement (feature 'settlement': the Reckoning after the first Steady State). */
export const SETTLEMENT: Cond = all(STEADY, rk(4));
/** A seam sunk this run: the seam ladder has been met (feature 'seams'). */
export const SEAMS: Cond = sec('seamsSunk', 'steam', '>=', 1);
/** A lever has begun to bite back (feature 'sideEffects' arrives at the third Reckoning). */
export const BITING = (sector: SectorId): Cond => all(rk(3), sec('bite', sector, '>=', 0.3));

/* ------------------------------------------------------------------ */
/* EFFECTS                                                             */
/* ------------------------------------------------------------------ */

export const cash = (seconds: number): EffectDef => ({ type: 'capitalAdd', value: seconds });
export const mandate = (value: number): EffectDef => ({ type: 'mandateAdd', value });
export const smoke = (sector: SectorId, value: number): EffectDef => ({ type: 'pressureAdd', sector, value });
export const people = (value: number): EffectDef => ({ type: 'populationMul', value });
export const wellbeing = (value: number): EffectDef => ({ type: 'wellbeingAdd', value });
export const growth = (value: number): EffectDef => ({ type: 'popGrowthMul', value });
export const mrate = (value: number): EffectDef => ({ type: 'mandateRateMul', value });
export const income = (value: number, sector?: SectorId): EffectDef => (sector ? { type: 'incomeMul', sector, value } : { type: 'incomeMul', value });
export const price = (sector: SectorId, value: number): EffectDef => ({ type: 'resourcePriceMul', sector, value });
export const intensity = (sector: SectorId, value: number): EffectDef => ({ type: 'intensityMul', sector, value });
export const sat = (sector: SectorId, value: number, app?: string): EffectDef => (app ? { type: 'satMul', sector, app, value } : { type: 'satMul', sector, value });
export const half = (sector: SectorId, value: number, app?: string): EffectDef => (app ? { type: 'halfPriceMul', sector, app, value } : { type: 'halfPriceMul', sector, value });
export const eta = (sector: SectorId, value: number): EffectDef => ({ type: 'etaMul', sector, value });
export const capCost = (sector: SectorId, value: number): EffectDef => ({ type: 'capCostMul', sector, value });
export const absorb = (sector: SectorId, value: number): EffectDef => ({ type: 'absorptionAdd', sector, value });
export const margin = (sector: SectorId, value: number): EffectDef => ({ type: 'marginAdd', sector, value });
export const cheaper = (id: string, value: number): EffectDef => ({ type: 'costMulOf', id, value });
export const forbid = (id: string): EffectDef => ({ type: 'forbid', id });
export const forbidKind = (leverKind: 'duty' | 'cap' | 'sufficiency' | 'substitution' | 'circularity' | 'greenSpending', sector?: SectorId): EffectDef =>
  (sector ? { type: 'forbid', leverKind, sector } : { type: 'forbid', leverKind });
export const commonsYield = (value: number): EffectDef => ({ type: 'commonsYieldMul', value });

/** A timed modifier of `years` model years. */
export const timed = (years: number, ...effects: EffectDef[]): NonNullable<DispatchArm['modifier']> => ({ years, effects });
