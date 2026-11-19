/**
 * The dispatch writer's kit: conditions that stage the unfolding, and short effect builders. Shared by every module in
 * dispatches/ (and by cast.ts); imports nothing but the contract.
 * Content is data (see ../README.md): every number and word here is read by the core and the UI; no game rules.
 *
 * Magnitudes (the balance lane audits them; see dispatches.test.ts for the bounds): one-offs of 10–60 s of income or
 * 20–150 Mandate; timed modifiers of 5–15 model years (100–300 s); multipliers 0.85–1.2; standing effects small, since
 * they stand for the rest of the run. A decade within budget pays 60 Mandate and 30 s of income: an arm is worth
 * about half a decade, never two.
 * M3 balance pass: every demand multiplier above 1 on an arm was halved towards 1 (1.12 → 1.06; random answers cost a
 * cap-holding player 12% of Hindsight per minute against letting every letter expire), Mandate costs were cut by two
 * fifths (Mandate buys a restraint player's levers), and answers that forbid raising a duty last ten years, not fifteen;
 * the answers that suit a held line (less smoke per ton: intensity; wellbeing) were strengthened by half, so reading the
 * letter for the situation pays.
 */
import type { Cond, DispatchArm, EffectDef, FeatureId, SectorId } from '../../types';

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

/*
 * The unfolding, as the contract's own condition ({ feature }: true once that feature has arrived for good; M3). A
 * letter that names a gated system carries the feature that brings it (the content lint checks the words). Switched
 * from stand-ins (reckonings and cards) by the content-mechanics lane once the condition existed.
 */
export const feature = (id: FeatureId): Cond => ({ feature: id });
/** The budget has arrived (run 3). A letter that names the line, a decade or the cap carries this. */
export const BUDGET: Cond = feature('budget');
/** Charters have arrived (the second Reckoning). */
export const CHARTERS: Cond = feature('charters');
/** The Commons have arrived (the third Reckoning). */
export const COMMONS: Cond = feature('commons');
/** Steady State has arrived (with the first clear sky): the fifty-year streak is a thing the player has met. */
export const STEADY: Cond = feature('steadyState');
/** Settlement has arrived (the Reckoning after the first Steady State). */
export const SETTLEMENT: Cond = feature('settlement');
/** The seam ladder has arrived (feature 'seams'). */
export const SEAMS: Cond = feature('seams');
/** A lever in this Industry has begun to bite back, and the bite has been met (feature 'sideEffects'). */
export const BITING = (sector: SectorId): Cond => all(feature('sideEffects'), sec('bite', sector, '>=', 0.3));

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
