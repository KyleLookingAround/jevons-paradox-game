/**
 * Content helpers: number series (cost ladders, efficiency chains, lever level tables), effect builders, forks, and
 * the shared lever tables (values, labels, the dividend catch) every Industry's levers are built from.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type {
  EffectDef, HeadlineKey, LeverDef, LeverKind, LeverLevelDef, LeverRecycle, SectorDef, SectorId, UpgradeDef,
} from '../types';

/** One Industry's content, as assembled by index.ts (sectorOrder is the order of index.ts's SECTORS list). */
export interface SectorContent {
  def: SectorDef;
  upgrades: UpgradeDef[];
  levers: LeverDef[];
  /** Industry-specific headline variants (Content.sectorHeadlines[id]). */
  headlines?: Partial<Record<HeadlineKey, string[]>>;
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

/** Round to two significant figures (cost ladders read better as 4,500 than 4,537). */
export function sig2(x: number): number {
  if (x <= 0) return 0;
  const p = 10 ** (Math.floor(Math.log10(x)) - 1);
  return Math.round(x / p) * p;
}

/** n costs: first, first×growth, first×growth², … each rounded to two significant figures. */
export function ladder(first: number, growth: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => sig2(first * growth ** i));
}

/** Per-card etaMul values from cumulative efficiency folds (1.5, 2.5, 3.5 → 1.5, 1.667, 1.4). */
function stepsFromFolds(folds: number[]): number[] {
  return folds.map((f, i) => f / (i === 0 ? 1 : folds[i - 1]));
}

/* --- effects --- */
export const eta = (sector: SectorId, value: number): EffectDef => ({ type: 'etaMul', sector, value });
export const capCost = (sector: SectorId, value: number): EffectDef => ({ type: 'capCostMul', sector, value });
export const margin = (sector: SectorId, value: number): EffectDef => ({ type: 'marginAdd', sector, value });
export const reserve = (sector: SectorId, value: number): EffectDef => ({ type: 'reserveAdd', sector, value });
export const absorb = (sector: SectorId, value: number): EffectDef => ({ type: 'absorptionAdd', sector, value });
export const sat = (sector: SectorId, value: number, app?: string): EffectDef =>
  app ? { type: 'satMul', sector, app, value } : { type: 'satMul', sector, value };
export const half = (sector: SectorId, value: number, app?: string): EffectDef =>
  app ? { type: 'halfPriceMul', sector, app, value } : { type: 'halfPriceMul', sector, value };
export const startLever = (lever: string, level: number): EffectDef => ({ type: 'startLever', lever, level });

/**
 * A chain of efficiency cards: each requires the one before; etaMul comes from the cumulative folds; costs come
 * from a ladder. `costs` overrides the ladder where the first step should be cheap.
 */
export function chain(
  sector: SectorId,
  costs: number[],
  cards: { id: string; name: string; blurb: string; fold: number }[],
): UpgradeDef[] {
  const steps = stepsFromFolds(cards.map((c) => c.fold));
  return cards.map((c, i) => ({
    id: c.id,
    sector,
    kind: 'efficiency' as const,
    name: c.name,
    blurb: c.blurb,
    cost: costs[i],
    requires: i === 0 ? undefined : [cards[i - 1].id],
    effects: [eta(sector, Math.round(steps[i] * 10_000) / 10_000)],
  }));
}

/** Two upgrades that exclude each other: a fork. Both list the other, so exclusion is symmetric in the data too. */
export function fork(a: UpgradeDef, b: UpgradeDef): UpgradeDef[] {
  return [
    { ...a, excludes: [...(a.excludes ?? []), b.id] },
    { ...b, excludes: [...(b.excludes ?? []), a.id] },
  ];
}

/* --- levers --- */

/** Default "Tighten" series per lever kind (see LeverDef.repeat). Each lever may override any field. */
const REPEAT: Record<LeverKind, { valueStep: number; costGrowth: number; upkeepGrowth: number; maxSteps: number }> = {
  duty: { valueStep: 0.03, costGrowth: 1.7, upkeepGrowth: 1.35, maxSteps: 3 },
  cap: { valueStep: -0.05, costGrowth: 1.45, upkeepGrowth: 1.3, maxSteps: 10 },
  sufficiency: { valueStep: -0.05, costGrowth: 1.5, upkeepGrowth: 1.3, maxSteps: 6 },
  substitution: { valueStep: 0.05, costGrowth: 1.5, upkeepGrowth: 1.35, maxSteps: 8 },
  circularity: { valueStep: 0.05, costGrowth: 1.5, upkeepGrowth: 1.3, maxSteps: 8 },
  greenSpending: { valueStep: 0.05, costGrowth: 1.6, upkeepGrowth: 1.3, maxSteps: 2 },
  deletion: { valueStep: 0.05, costGrowth: 1.5, upkeepGrowth: 1.35, maxSteps: 8 },
  reviewGate: { valueStep: 0.1, costGrowth: 1.6, upkeepGrowth: 1.35, maxSteps: 5 },
  sharedLibs: { valueStep: 0.05, costGrowth: 1.5, upkeepGrowth: 1.3, maxSteps: 6 },
  /* M3: a measure's level value is how many times its effects apply (1, 2, 3 authored; each Tighten one more). */
  measure: { valueStep: 1, costGrowth: 1.6, upkeepGrowth: 1.35, maxSteps: 3 },
  /* M4: a quota on the surveyed surplus tightens downwards like a cap (range 0–1; a level at 0 is a moratorium). */
  quota: { valueStep: -0.05, costGrowth: 1.45, upkeepGrowth: 1.3, maxSteps: 6 },
  /* M5: a subsidy's level value is the Treasury's share of a card's cost (0–SUBSIDY_MAX 0.9): each Tighten pays a tenth
   * more. Few steps: past about two thirds the Treasury is buying Pryce's machines for him. */
  subsidy: { valueStep: 0.1, costGrowth: 1.5, upkeepGrowth: 1.3, maxSteps: 2 },
  /* M5: a charge's level value is a share of the service price when enacted (range 0–1): each Tighten adds five points.
   * It is fixed when enacted, so later steps are the only way it keeps pace with a cheaper mile. */
  charge: { valueStep: 0.05, costGrowth: 1.6, upkeepGrowth: 1.35, maxSteps: 4 },
};

/** Authored levels cost 1 : 3 : 9 in Mandate and 1 : 2.5 : 6.25 in upkeep, as in v1. */
const LEVEL_COST = [1, 3, 9];
const LEVEL_UPKEEP = [1, 2.5, 6.25];

/** Fill a label template: {pct} = value as a whole percentage, {value} = 2 dp. */
function fill(template: string, value: number): string {
  return template.replace('{pct}', String(Math.round(value * 100))).replace('{value}', value.toFixed(2));
}

interface LeverSpec {
  id: string;
  sector: SectorId;
  kind: LeverKind;
  name: string;
  blurb: string;
  catch: string;
  values: number[];
  value2?: number[];
  /** Mandate for level 1 (later levels scale by LEVEL_COST). */
  cost: number;
  /** Mandate upkeep per second at level 1 (later levels scale by LEVEL_UPKEEP). */
  upkeep: number;
  /** Label template for every level, authored and repeat. */
  label: string;
  /** Labels for specific authored levels that read better in words (index → label). */
  labels?: Record<number, string>;
  repeat?: Partial<LeverDef['repeat'] & object>;
  recycle?: LeverRecycle[];
  /** M2: per-option wording for this lever's recycle choices (LeverDef.recycleBlurb). */
  recycleBlurb?: Partial<Record<LeverRecycle, string>>;
  requires?: string[];
  /** M3: the standing effects of a 'measure' lever (× its level value). */
  effects?: EffectDef[];
  /** M3: a lever that bites back (LeverDef.sideEffects). */
  sideEffects?: LeverDef['sideEffects'];
}

export function lever(s: LeverSpec): LeverDef {
  const levels: LeverLevelDef[] = s.values.map((value, i) => {
    const l: LeverLevelDef = {
      mandateCost: sig2(s.cost * LEVEL_COST[i]),
      mandateUpkeep: Math.round(s.upkeep * LEVEL_UPKEEP[i] * 1000) / 1000,
      value,
      label: s.labels?.[i] ?? fill(s.label, value),
    };
    if (s.value2) l.value2 = s.value2[i];
    return l;
  });
  const def: LeverDef = {
    id: s.id,
    sector: s.sector,
    kind: s.kind,
    name: s.name,
    blurb: s.blurb,
    catch: s.catch,
    levels,
    repeat: { ...REPEAT[s.kind], label: s.label, ...s.repeat },
  };
  // The unfolding (QA): the dividend sentence names the recycling choice, which arrives with 'moreLevers'; until then the
  // catch stops before it (LeverDef.catchAfter).
  if (s.catch.endsWith(' ' + DIVIDEND)) {
    def.catch = s.catch.slice(0, -(DIVIDEND.length + 1));
    def.catchAfter = { moreLevers: DIVIDEND };
  }
  if (s.recycle) def.recycle = s.recycle;
  if (s.recycleBlurb) def.recycleBlurb = s.recycleBlurb;
  if (s.requires) def.requires = s.requires;
  if (s.effects) def.effects = s.effects;
  if (s.sideEffects) def.sideEffects = s.sideEffects;
  return def;
}

/**
 * Duty and cap levers offer every recycle option; treasury first (the v1 behaviour, and never 'commons' first: the
 * Commons are not selectable before they open, from run 3).
 */
export const RECYCLE: LeverRecycle[] = ['treasury', 'dividend', 'commons'];

/* ------------------------------------------------------------------ */
/* STAGES AND DECADE CHOICES (M2)                                      */
/* ------------------------------------------------------------------ */

/**
 * Set UpgradeDef.stage on the named cards (the scene's machine generation, 1–3) and, M3, the display name of the
 * machine that stage shows (UpgradeDef.machine, carried on 'stageReached' events). Unknown ids are an error.
 */
export function withStages(upgrades: UpgradeDef[], stages: Record<string, [stage: number, machine: string]>): UpgradeDef[] {
  for (const id of Object.keys(stages)) {
    if (!upgrades.some((u) => u.id === id)) throw new Error(`withStages: no upgrade ${id}`);
  }
  return upgrades.map((u) => (stages[u.id] ? { ...u, stage: stages[u.id][0], machine: stages[u.id][1] } : u));
}

/* ------------------------------------------------------------------ */
/* M3 MECHANICS: staging                                               */
/* ------------------------------------------------------------------ */

/**
 * M3 STAGING KNOB (for the balance lane). The four mechanic kinds (seams, load, travel, priceSeen) are always in the
 * data, but a few numbers only make sense once the core solves them, and would rebalance the M2 game if the M2 core
 * read them first:
 *   - Light's capCost is divided by its opening load term so that its opening price is as before (LoadDef);
 *   - Motion's roads are finite (congestion) and the motorway card raises the free speed (travelMul speed);
 *   - Compute's advertising card sets the free price (priceSeen) instead of M2's halfPriceMul 1.4.
 * false = the M2 numbers (every M3 field is present but solves as M2: roads effectively infinite, no speed effect, M2's
 * capCost and halfPriceMul). Set true once src/core solves the M3 mechanics, then run the balance pass.
 */
export const MECHANICS_LIVE = true;

/** M3: the load term c_eff / c for a set of profiles weighted by demand (see LoadDef), for compensating capCost. */
export function loadTerm(profiles: number[][], weights: number[], fixedShare: number, floor = 0.05): number {
  const hours = Array.from({ length: 24 }, () => 0);
  profiles.forEach((w, i) => {
    const sum = w.reduce((a, b) => a + b, 0);
    w.forEach((x, h) => { hours[h] += weights[i] * (sum > 0 ? (24 * x) / sum : 1); });
  });
  const mean = hours.reduce((a, b) => a + b, 0) / 24;
  const lf = mean > 0 ? mean / Math.max(...hours) : 1;
  return (1 - fixedShare) + fixedShare / Math.max(floor, lf);
}

/**
 * The global sequence of decade dividend pairs (ids into dividends.ts), in the order they are offered: the first pair
 * teaches the choice (Mandate or capital, both now), later pairs are sharper (standing against now, restraint against
 * its rebound). Option 0 of every pair is the modest one: it is what an unanswered offer resolves to.
 */
export const DECADE_PAIRS: [string, string][] = [
  ['div.voteOfThanks', 'div.shareholders'],
  ['div.standingOrders', 'div.windfall'],
  ['div.holiday', 'div.commonsEndowment'],
  ['div.laterMarriage', 'div.feast'],
  ['div.sinkingFund', 'div.patentOffice'],
  ['div.gardenCity', 'div.buildingBoom'],
  ['div.civicPurse', 'div.remitRates'],
  ['div.quietYears', 'div.jubilee'],
];

/**
 * An Industry's own decade sequence. The contract resolves a sector's decadeChoices INSTEAD of the global list (it
 * cannot add to it), so each Industry interleaves its own pairs with the global sequence: the global teaching pair
 * first, its own first pair second, its second pair fifth, then the rest of the global pairs.
 */
export function decadeSequence(own: [string, string][]): [string, string][] {
  const [a, b] = own;
  const g = DECADE_PAIRS;
  return [g[0], ...(a ? [a] : []), g[1], g[2], ...(b ? [b] : []), ...g.slice(3), ...own.slice(2)];
}

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

export const DUTY_LABEL = 'Hold price at {pct}% of the fall';
export const CAP_LABEL = 'Cap at {pct}% of the budget';
export const CAP_FIRST = { 0: 'Hold to the budget line' };
export const SUFF_LABEL = 'Settle at {pct}% of appetite';
export const CAP_VALUES = [1, 0.95, 0.9];
export const CAP_LEAK = [3, 4, 5];
export const DUTY_VALUES = [0.3, 0.6, 0.9];
export const SUFF_VALUES = [0.85, 0.7, 0.55];
export const SHARE_VALUES = [0.1, 0.2, 0.35];
export const GREEN_VALUES = [0.3, 0.6, 0.9];
/** Every duty and cap catch ends by naming the dividend's rebound (economy-wide, through population). */
export const DIVIDEND = 'Paid out as a dividend instead, the levy is spent, and the population grows on it.';
