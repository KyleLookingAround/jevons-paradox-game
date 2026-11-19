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

  /* ---------------- M3 (design/m3-contract-notes.md §0) ----------------
   * Fitted round the M2 arrivals, which keep priority (FEATURE_IDS order) and their tested times: the Market, Charters,
   * the Commons and Settlement arrive AT a Reckoning, so an M3 arrival must never fall in the last five minutes of the
   * run before (the gap would push them into the next run's opening minutes). Hence the time floors below, and nothing
   * M3 at all in run 3, which is the budget's own unfolding (an arrival every five minutes from 1801 to clear skies).
   * Scripted players (budget play): run 2 the Archive (5 min), more levers (M2, ~10), letters (15); run 4 ambient news
   * (5 min), the seams (10), then the load curve and the travel dial as Light and Motion open; the "free" tag once a
   * business model is chosen in Compute; the bite
   * once a biting lever has bitten; the survey from hour 6; Histories from hour 8. Banked time stays off. */

  /* Run 2, five minutes in (the first check after the Market): notes have been kept since the first minute of play. */
  archive: { when: rk(1), intro: 'The Gazette opens its archive to subscribers', name: 'The Archive' },
  /* Run 2, from minute 15 (after more levers, ~10), the quiet stretch of a levers-only run: introduced by the
   * correspondent's first letter. Not later: a burning run 2 ends by collapse at about 21 minutes, and an arrival in its
   * last five minutes would push the Charters out of run 3 (their offer is drawn only at the Reckoning). */
  dispatches: { when: { all: [rk(1), revealed, { stat: 'time', op: '>=', value: 900 }] }, name: 'Letters' },
  /* Run 4 or later, once pumping is cheap enough to reach the first seam (the condenser's price): the next seam down.
   * Not in run 2 (full) or run 3 (the budget's), and not tied to the reserve running low, which in a burning run comes
   * in its last minutes, where an arrival would push the next Reckoning's arrival out of the run it opens. */
  seams: {
    when: { all: [rk(3), { stat: 'time', op: '>=', value: 300 }, { stat: 'servicePrice', sector: 'steam', op: '<=', value: 0.6 }] },
    intro: 'Colliery agents report good coal below the old workings',
    name: 'The seams',
  },
  /* Run 4, five minutes in (run 2 has the Market, the Archive, more levers and the letters; run 3 is the budget's): the
   * paper simply has more in it. No intro: its first item is the news. */
  ambient: { when: { all: [rk(3), { stat: 'time', op: '>=', value: 300 }] }, name: 'More news' },
  /* Run 4, a few minutes after Light opens (not in run 3: the budget's run). */
  load: {
    when: { all: [rk(3), { stat: 'serviceDelivered', sector: 'light', op: '>=', value: 600 }] },
    intro: 'Evening Lamp notes the works stand idle every afternoon',
    name: 'The load curve',
  },
  /* With Motion, a few minutes in (run 4 at the earliest). */
  travel: {
    when: { all: [rk(3), { stat: 'serviceDelivered', sector: 'motion', op: '>=', value: 2_000 }] },
    intro: 'Motorist survey: faster roads, and the same hour at the wheel',
    name: 'Travel time',
  },
  /* Once a lever's side effect has taken hold anywhere (run 4 or later): introduced by the 'biteBack' headline itself. */
  sideEffects: {
    when: { all: [rk(3), { any: SECTORS.map((sector): Cond => ({ stat: 'bite', sector, op: '>=', value: 0.3 })) }] },
    name: 'Levers that bite back',
  },
  /* With Compute, once a business model is chosen (something is now free, or flat). */
  freeAtUse: {
    when: { all: [rk(3), { any: [{ owns: 'compute.adFunded' }, { owns: 'compute.subscriptions' }] }] },
    intro: 'info: price shown to user: £0.00',
    name: 'Free at the point of use',
  },
  /* About hour 6, once the Civil Service is owned: the Statistics Office's household survey (The Proprietor's Day). */
  survey: {
    when: { all: [{ stat: 'totalHours', op: '>=', value: 6 }, { owns: 'inst.civilService' }] },
    intro: 'Statistics Office proposes a survey of how households spend the day',
    name: 'The household survey',
  },
  /* After the first Steady State, and not before hour 8: other histories of the same century. */
  histories: {
    when: { all: [{ owns: 'steadyState' }, { stat: 'totalHours', op: '>=', value: 8 }] },
    intro: 'Historians invited to run the century again, under other rules',
    name: 'Histories',
  },
  /* Off in M3 (GlobalParams.offline.bankRate 0): an empty `any` never holds. */
  bank: { when: { any: [] }, intro: 'Hours lost to the hold are now kept on deposit', name: 'Banked time' },
};
