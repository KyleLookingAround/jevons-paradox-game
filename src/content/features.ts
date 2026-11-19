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
/* M3 note: 'freeAtUse' reads the advertising and subscription cards, 'survey' the Civil Service, 'histories' the
 * Steady State achievement: plain ids, resolved by the lint. */
/** A line has paid a decade, and the economy has reached the wellbeing target on it (or held it five decades). */
/** M3: the mid-run window, minutes 20 to 24 of a run: shorter than the five-minute gap, so one arrival at most per run. */
const MID: Cond[] = [{ stat: 'time', op: '>=', value: 1200 }, { stat: 'time', op: '<', value: 1440 }];
/** M3: only the unlock check in reckon() sees a run this young (the step's checks read the state at 5 s and later). */
const AT_RECKONING: Cond[] = [{ stat: 'time', op: '<', value: 2 }];
/** M3: the household survey is not due (it has arrived, or waits on hour 6 or the Civil Service): the quiet Reckoning
 *  arrivals (the Archive, the free price) give way to it, so the Proprietor's Day stays near hour 6–7. */
const SURVEY_NOT_DUE: Cond = { any: [{ stat: 'totalHours', op: '<', value: 6 }, { not: { owns: 'inst.civilService' } }, { feature: 'survey' }] };
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
  /* The Reckoning after the first Steady State (from run 5): the next Steady State can be kept as it is. M3 balance:
   * at the Reckoning only (AT_RECKONING): a Steady State earned early in a run no longer brings Settlement mid-run. */
  settlement: { when: { all: [{ owns: 'steadyState' }, rk(4), ...AT_RECKONING] }, intro: 'A settled industry proposed: burn at the sink line, and no more', name: 'Settlement' },

  /* ---------------- M3 (design/m3-contract-notes.md §0; the schedule and its reasons: design/unlock-schedule.md) ----
   * Owner's direction (19 Nov 2026): "options should be unlocked more slowly". From run 4 on, at most two arrivals a run:
   * one AT the Reckoning that begins it and one mid-run, never within five minutes of each other.
   *   - Mid-run arrivals (the four mechanics' widgets and the bite) share one window, minutes 20 to 24 of a run
   *     (MID below). The window is shorter than the five-minute gap, so at most one of them can arrive in any run; each
   *     also needs the one before it (a chain) and a run floor, so they come one run apart, in order: the seams (run 4,
   *     or the run after the first Steady State), the load curve, the travel dial, and later the bite (once a lever has
   *     bitten). Twenty minutes in, the run's own Industries are open and known.
   *   - Reckoning arrivals (AT_RECKONING: run time under two seconds, which only the check in reckon() sees): the
   *     Commons (run 4) and Settlement (M2), then the Archive, the free price (once a business model has been bought,
   *     after the travel dial), the household survey (hour 6 or later) and Histories (hour 8 or later), one per
   *     Reckoning, in FEATURE_IDS order.
   * Nothing M3 arrives in run 3 (the budget's own unfolding). Banked time stays off. */

  /* Run 2, five minutes in (the first check after the Market): the paper simply has more in it. No intro: its first
   * item is the news. Not a system (it asks nothing), but it still takes an arrival's slot under the five-minute gap. */
  ambient: { when: rk(1), name: 'More news' },
  /* Run 2, from minute 15 (after more levers, ~10), the quiet stretch of a levers-only run: introduced by the
   * correspondent's first letter. Not later: a burning run 2 ends by collapse at about 21 minutes, and an arrival in its
   * last five minutes would push the Charters out of run 3 (their offer is drawn only at the Reckoning). */
  dispatches: { when: { all: [rk(1), revealed, { stat: 'time', op: '>=', value: 900 }] }, name: 'Letters' },
  /* Mid-run, once a first Steady State has been held (the achievement, 50 model years after the feature arrives, so
   * almost always an earlier run: run 4 for the budget player), once pumping is cheap enough to reach the first seam
   * (the condenser's price): the next seam down. */
  seams: {
    when: { all: [rk(3), { owns: 'steadyState' }, ...MID, { stat: 'servicePrice', sector: 'steam', op: '<=', value: 0.6 }] },
    intro: 'Colliery agents report good coal below the old workings',
    name: 'The seams',
  },
  /* At the Reckoning, from run 6, once Settlement (or the run after the seams) has had its turn: a quiet arrival (it asks
   * nothing). Notes have been kept since the first minute of play, so nothing is lost by waiting. Gives way to the
   * survey when that is due at the same Reckoning. */
  archive: {
    when: { all: [rk(5), ...AT_RECKONING, SURVEY_NOT_DUE] },
    intro: 'The Gazette opens its archive to subscribers',
    name: 'The Archive',
  },
  /* Mid-run, the run after the seams (run 5 for the budget player): Light has been open three runs. */
  load: {
    when: { all: [rk(4), { feature: 'seams' }, ...MID, { stat: 'serviceDelivered', sector: 'light', op: '>=', value: 600 }] },
    intro: 'Evening Lamp notes the works stand idle every afternoon',
    name: 'The load curve',
  },
  /* Mid-run, the run after the load curve (run 6): Motion has been open three runs. */
  travel: {
    when: { all: [rk(5), { feature: 'load' }, ...MID, { stat: 'serviceDelivered', sector: 'motion', op: '>=', value: 2_000 }] },
    intro: 'Motorist survey: faster roads, and the same hour at the wheel',
    name: 'Travel time',
  },
  /* At a Reckoning after the travel dial (run 7 or later), once a business model has ever been bought in Compute
   * (its Archive note is kept from the first purchase): something can now be free, or flat. The tag shows as soon as
   * the card is bought again in the run. (Not mid-run: the card is often bought late in a run, after the window.)
   * Gives way to the survey when that is due at the same Reckoning. */
  freeAtUse: {
    when: { all: [rk(6), { feature: 'travel' }, ...AT_RECKONING, { any: [{ owns: 'arc.compute.adFunded' }, { owns: 'arc.compute.subscriptions' }] }, SURVEY_NOT_DUE] },
    intro: 'info: price shown to user: £0.00',
    name: 'Free at the point of use',
  },
  /* Mid-run, in the window, a run after the free price at the earliest, once a lever's side effect has taken hold
   * anywhere: introduced by the 'biteBack' headline itself (a player who never lets a lever bite never needs it).
   * (The free price arrives at a Reckoning, so the two may share a run, five minutes and more apart.) */
  sideEffects: {
    when: { all: [rk(7), { feature: 'freeAtUse' }, ...MID, { any: SECTORS.map((sector): Cond => ({ stat: 'bite', sector, op: '>=', value: 0.3 })) }] },
    name: 'Levers that bite back',
  },
  /* At a Reckoning from hour 6, once the Civil Service is owned: the Statistics Office's household survey (The
   * Proprietor's Day). */
  survey: {
    when: { all: [rk(5), ...AT_RECKONING, { stat: 'totalHours', op: '>=', value: 6 }, { owns: 'inst.civilService' }] },
    intro: 'Statistics Office proposes a survey of how households spend the day',
    name: 'The household survey',
  },
  /* At a Reckoning after the first Steady State, and not before hour 8: other histories of the same century (one line
   * on the Reckoning screen). */
  histories: {
    when: { all: [rk(6), ...AT_RECKONING, { owns: 'steadyState' }, { stat: 'totalHours', op: '>=', value: 8 }] },
    intro: 'Historians invited to run the century again, under other rules',
    name: 'Histories',
  },
  /* Off in M3 (GlobalParams.offline.bankRate 0): an empty `any` never holds. */
  bank: { when: { any: [] }, intro: 'Hours lost to the hold are now kept on deposit', name: 'Banked time' },
};
