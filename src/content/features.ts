/**
 * The unfolding (Content.features): when each system arrives, and the one line that introduces it. The schedule and its
 * reasons: design/unlock-schedule.md. Spacing (GlobalParams.featureGapSeconds, five minutes of play) keeps any two
 * arrivals apart; the conditions tie each one to something the player has just seen or done.
 * Content is data (see README.md): every condition and word here is read by the core and the UI; no game rules.
 * Intros are headlines (house style: sentence case, no full stop, 70 characters at most, never "you").
 */
import type { Cond, FeatureDef, FeatureId } from '../types';

const rk = (n: number, label?: string): Cond => ({ stat: 'reckonings', op: '>=', value: n, ...(label ? { label } : {}) });
const steamDecades = (n: number): Cond => ({ stat: 'budgetDecades', sector: 'steam', op: '>=', value: n });
const revealed: Cond = { flag: 'revealed' };
const SECTORS = ['steam', 'light', 'motion', 'compute', 'code'];
/** A line has paid a decade, and the economy has reached the wellbeing target on it (or held it five decades). */
const skiesDue: Cond = { all: [steamDecades(1), { any: [{ stat: 'wellbeing', op: '>=', value: 34 }, steamDecades(5)] }] };

export const features: Partial<Record<FeatureId, FeatureDef>> = {
  /* Run 1. The reveal brings only the meter and the cards' red line (its own card and headline introduce it). */
  reboundMeter: { when: revealed, name: 'The rebound' },
  /* Run 1, about five minutes after the reveal: the smoke is near a fifth of the way to collapse, and climbing. */
  levers: {
    when: { all: [revealed, { any: [{ stat: 'pressureFraction', sector: 'steam', op: '>=', value: 0.18 }, { stat: 'crises', sector: 'steam', op: '>=', value: 1 }] }] },
    intro: 'Smoke noticed in Parliament; a coal duty is proposed',
    name: 'Counter-levers',
  },
  /* Run 1, the first crisis (it takes people), or the town grown by a third. */
  population: {
    when: { any: [{ stat: 'crises', sector: 'steam', op: '>=', value: 1 }, { stat: 'population', op: '>=', value: 1.3 }] },
    intro: 'Parish registers record more mouths; the vicar orders more pews',
    name: 'People',
  },
  /* The first Reckoning: the Market buys run 2's routine opening cards itself from the first minute (QA B7: run 2 must
   * not open as run 1 did), so the player's first decisions are foundings and choices. */
  market: {
    when: rk(1),
    intro: 'Engine makers now call unasked; routine orders place themselves',
    name: 'The Market',
  },
  /* Run 2, once a lever is in force again: the fuller lever (more of them, and where a levy's money goes). */
  moreLevers: {
    when: { all: [rk(1), { any: [{ owns: 'steam.duty' }, { owns: 'steam.sufficiency' }] }] },
    intro: 'Parliament, having tried one measure, will hear of others',
    name: 'More levers',
  },
  /* The second Reckoning: a choice of starting situation for run 3. */
  charters: { when: rk(2), intro: 'Two charters on the table; a select committee sits', name: 'Charters' },
  /* Run 3, 1801 (the first census), after the reveal: a line to keep under, and each decade kept pays. */
  budget: {
    when: { all: [rk(2), revealed, { stat: 'year', op: '>=', value: 1801 }] },
    intro: 'First census taken; the Treasury asks how much coal is enough',
    name: 'The budget',
  },
  /* Once a cap is in force and its line has paid a decade: it can be tightened past its last step. */
  leverRepeat: { when: { all: [rk(2), { owns: 'steam.cap' }, steamDecades(1)] }, intro: 'Committee finds the cap can be tightened further, by statute', name: 'Tighten' },
  /* After two decades on a line: a choice of reward for each. */
  dividendChoice: { when: steamDecades(2), intro: 'Another decade within the line; the Treasury offers a choice', name: 'Decade dividends' },
  /* After three decades on a line: how steeply a line falls. */
  budgetPace: { when: steamDecades(3), intro: 'Members divide on how steeply the line should fall', name: 'The pace' },
  /* A decade paid and the wellbeing target reached: the clear level and the sink line (and lean against full). */
  clearSkies: { when: skiesDue, intro: 'Inspectors measure how much smoke the sky can carry off', name: 'Clear skies' },
  /* The first clear sky in any Industry: fifty years of it is Steady State. */
  steadyState: {
    when: { all: [skiesDue, { any: SECTORS.map((sector): Cond => ({ stat: 'clear', sector, op: '>=', value: 1 })) }] },
    intro: 'First clear sky in living memory; the clubs ask how long it lasts',
    name: 'Steady State',
  },
  /* The third Reckoning: run 4 (moved from run 3, so it does not arrive with the budget). */
  commons: { when: rk(3), intro: 'Ratepayers petition for baths and libraries out of the levies', name: 'The Commons' },
  /* The Reckoning after the first Steady State (from run 5): the next Steady State can be kept as it is. */
  settlement: { when: { all: [{ owns: 'steadyState' }, rk(4)] }, intro: 'A settled industry proposed: burn at the sink line, and no more', name: 'Settlement' },
};
