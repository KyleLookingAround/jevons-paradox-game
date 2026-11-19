/**
 * Histories (M3): named counterfactual runs, chosen between runs once the feature 'histories' has arrived (after the
 * first Steady State, not before hour 8; features.ts). Each isolates one rebound and sets a goal; one is in force at a
 * time; it composes with the Charter unless it suspends it. THE HISTORY RULES are in src/types.ts (HistoryDef) and the
 * mechanical ones are linted (content.test.ts): rewards are options only (a locked Commons project or Charter, a title,
 * a cosmetic scene key), never power, never quality of life or automation; each is cleared by the balancer's generic
 * `budget` strategy within twice the median clearing time (the balance lane checks).
 * Goals: most ask for Steady State in Steam, which the budget player reaches in 85–95 minutes of a run from run 4;
 * the others ask for a comparable stretch of decades (a decade is 200 s). Numbers to check in the balance pass are
 * marked "balance:".
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { Cond, EffectDef, HistoryDef, LeverKind } from '../types';
import { eta, reserve, startLever } from './helpers';

const steadySteam: Cond = { stat: 'steadyYears', sector: 'steam', op: '>=', value: 50, label: 'Steady State in Steam' };
const forbid = (id: string): EffectDef => ({ type: 'forbid', id });
/** Every lever kind there is, for Laissez-faire (forbid with no sector: every Industry). */
const LEVER_KINDS: LeverKind[] = [
  'duty', 'cap', 'sufficiency', 'substitution', 'circularity', 'greenSpending', 'deletion', 'reviewGate', 'sharedLibs', 'measure',
];

export const histories: HistoryDef[] = [
  {
    id: 'history.coalRich', name: 'Coal-rich',
    blurb: 'Three times the coal under the valley, and cheap to raise. The engines never want for fuel, and nor does the fog.',
    rebound: 'The resource curse',
    /* Balance: ×3 the opening reserve and coal at 70% of the price; the smoke, not the coal, is the limit. */
    effects: [reserve('steam', 2), { type: 'resourcePriceMul', sector: 'steam', value: 0.7 }],
    goal: steadySteam,
    goalLabel: 'Steady State in Steam within the run',
    reward: { unlock: ['commons.welfareHall'], title: 'Coal owner', cosmetic: 'pithead.brassBand' },
  },
  {
    id: 'history.noWatt', name: 'No Watt',
    blurb: 'The condenser is never patented. Newcomen’s engines pump the pits and nothing more, and the valley stays as it was.',
    rebound: 'The counterfactual: thrift was the boom',
    /* No condenser means no Coal Question, so the run starts revealed; Light cannot open (it needs the condenser). */
    effects: [forbid('steam.condenser'), { type: 'reveal' }],
    goal: { stat: 'budgetDecades', sector: 'steam', op: '>=', value: 6, label: 'Six decades within budget in Steam' },
    goalLabel: 'Six decades within budget in Steam, without the condenser',
    reward: { title: 'Newcomen’s heir', cosmetic: 'engine.atmospheric' },
  },
  {
    id: 'history.statistician', name: 'The Statistician',
    blurb: 'The whole country’s coal is counted from the first engine, and nobody remembers anything from before.',
    rebound: 'Seeing the rebound is not stopping it',
    effects: [{ type: 'reveal' }],
    suspend: ['knowhow'],
    goal: steadySteam,
    goalLabel: 'Steady State in Steam, with no Know-how',
    reward: { title: 'Statistician', cosmetic: 'office.ledgers' },
  },
  {
    id: 'history.laissezFaire', name: 'Laissez-faire',
    blurb: 'Parliament will pass no measure on coal until the fog has twice closed the town. Then it will hear of anything.',
    rebound: 'Restraint deferred: the window opens late',
    effects: LEVER_KINDS.map((leverKind): EffectDef => ({ type: 'forbid', leverKind })),
    forbidUntil: { stat: 'crises', sector: 'steam', op: '>=', value: 2, label: 'The second Black Fog' },
    goal: steadySteam,
    goalLabel: 'Steady State in Steam, with no levers until the second Black Fog',
    reward: { title: 'Late reformer', cosmetic: 'parliament.petition' },
  },
  {
    id: 'history.islandNation', name: 'Island nation',
    blurb: 'No new coalfields, no North Sea, no new fabs, and nothing deeper than the old workings. What is under the island is all there is.',
    rebound: 'Supply-side, removed',
    effects: [
      forbid('steam.deeperShaft'), forbid('light.kentCoalfield'), forbid('motion.northSea'), forbid('compute.newFab'),
      forbid('steam.seam.fiveQuarter'), forbid('steam.seam.main'),
      forbid('steam.seam.lowMain'), forbid('steam.seam.hutton'), forbid('steam.seam.busty'), forbid('steam.seam.brockwell'),
    ],
    goal: steadySteam,
    goalLabel: 'Steady State in Steam before the coal runs out',
    reward: { unlock: ['charter.deepPits'], title: 'Islander', cosmetic: 'coast.lighthouse' },
  },
  {
    id: 'history.austerity', name: 'Austerity',
    blurb: 'Every measure costs twice the political capital it did. The cheap levers, used well, are all there is.',
    rebound: 'Restraint on a shoestring',
    /* Balance: half the Mandate rate; thirty full decades is about what the budget player earns in a run 4. */
    effects: [{ type: 'mandateRateMul', value: 0.5 }],
    goal: { stat: 'fullDecades', op: '>=', value: 30, label: 'Thirty full decades within budget' },
    goalLabel: 'Thirty full decades within budget in one run',
    reward: { unlock: ['commons.cycleTracks'], title: 'Chancellor', cosmetic: 'treasury.redBox' },
  },
  {
    id: 'history.mooreForever', name: 'Moore forever',
    blurb: 'The chips get four times better before the first data centre is built, and keep getting better on their own.',
    rebound: 'The frontier at full speed',
    effects: [eta('compute', 4)],
    requires: { owns: 'compute', label: 'Compute opened' },
    goal: { stat: 'budgetDecades', sector: 'compute', op: '>=', value: 5, label: 'Five decades within budget in Compute' },
    goalLabel: 'Five decades within budget in Compute',
    reward: { title: 'Chip maker', cosmetic: 'campus.coolingTowers' },
  },
  {
    id: 'history.feeAndDividend', name: 'Fee and dividend',
    blurb: 'A duty on coal and gas from the first year, every penny paid back to the households. The town is content, and grows.',
    rebound: 'Economy-wide: the dividend is spent',
    /* The recycling choice cannot be forced by an effect: the duties start in force, the dividend is wellbeing, and its
     * rebound is the larger town (popGrowthMul). */
    effects: [startLever('steam.duty', 2), startLever('light.duty', 1), { type: 'wellbeingAdd', value: 1.5 }, { type: 'popGrowthMul', value: 1.2 }],
    goal: steadySteam,
    goalLabel: 'Steady State in Steam, with the town still growing',
    reward: { unlock: ['charter.dividendTown'], title: 'Trustee', cosmetic: 'post.dividendCheque' },
  },
  {
    id: 'history.smokeBlind', name: 'Smoke-blind',
    blurb: 'A wetter, stiller valley: the same coal makes two fifths more smoke, and the wind carries less of it away.',
    rebound: 'The sky’s limit is lower',
    /* Nothing is hidden (the UI needs its gauges): only the rule is harsher. */
    effects: [{ type: 'intensityMul', sector: 'steam', value: 1.4 }, { type: 'intensityMul', sector: 'light', value: 1.4 }],
    goal: { stat: 'clearYears', sector: 'steam', op: '>=', value: 30, label: 'Thirty years of clear skies in Steam' },
    goalLabel: 'Thirty years of clear skies in Steam',
    reward: { title: 'Smoke inspector', cosmetic: 'sky.weathervane' },
  },
  {
    id: 'history.gasAgainstElectric', name: 'Gas against electric',
    blurb: 'The central power station is never built. Gas holds the town with the mantle, and the gas company fights for every street.',
    rebound: 'The incumbent fights back',
    effects: [forbid('light.powerStation')],
    requires: { owns: 'light', label: 'Light opened' },
    goal: { stat: 'budgetDecades', sector: 'light', op: '>=', value: 5, label: 'Five decades within budget in Light' },
    goalLabel: 'Five decades within budget in Light, on gas alone',
    reward: { title: 'Gas engineer', cosmetic: 'street.gasholder' },
  },
];
