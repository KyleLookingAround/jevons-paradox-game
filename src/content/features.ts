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
/* M4: the Coal Age's four, then the Previews (sectorOrder). */
const SECTORS = ['steam', 'light', 'iron', 'fishing', 'motion', 'compute', 'code'];
/* M3 note: 'survey' reads the Civil Service, 'histories' the Steady State achievement: plain ids, resolved by the lint. */

/**
 * M4: nothing of Act I arrives after the Act I ending (design §9). Every Act I feature carries this at the top of its
 * `all` (the lint checks it); the Previews' widgets (travel, the free price) do not. A feature already unlocked stays
 * unlocked, so this only stops a late arrival.
 */
const BEFORE_ACT_I_ENDS: Cond = { not: { ending: 'actOne' } };
/** An Act I feature: its conditions, and not after the ending. */
const actOne = (...cs: Cond[]): Cond => ({ all: [...cs.flatMap((c) => ('all' in c && !c.label ? c.all : [c])), BEFORE_ACT_I_ENDS] });

/**
 * M4: an Industry opening is an arrival (design §9: "never two arrivals within five minutes"). The Industries that open
 * mid-run: a mid-run feature waits until five minutes after the latest of them opened this run (StatKey openFor; a
 * closed Industry's openFor reads FALSE, so it never blocks; one open from the run's start, or capstoned, has
 * openFor = run time, past the window's start). Run floors (below) keep an Industry's first run free of mid-run
 * features; this keeps a late opening and a feature apart in any run.
 */
const MID_OPENERS = ['light', 'iron', 'fishing', 'motion', 'compute', 'code'];
export const OPENING_GAP_SECONDS = 300;
const CLEAR_OF_OPENINGS: Cond = {
  not: { any: MID_OPENERS.map((sector): Cond => ({ stat: 'openFor', sector, op: '<', value: OPENING_GAP_SECONDS })) },
};
/** M3: the mid-run window, shorter than the five-minute gap, so one arrival at most per run. M3 had minutes 20 to 24;
 *  M4 moves it to minutes 25 to 29 and keeps it clear of an Industry's opening: Fishing reopens at minute 20 or later in
 *  every run from run 7 (its unlock's floor), and a window at 20 to 24 would be shut by that reopening in most runs. */
export const MID_WINDOW: [number, number] = [1500, 1740];
const MID: Cond[] = [{ stat: 'time', op: '>=', value: MID_WINDOW[0] }, { stat: 'time', op: '<', value: MID_WINDOW[1] }, CLEAR_OF_OPENINGS];
/** M3: only the unlock check in reckon() sees a run this young (the step's checks read the state at 5 s and later). */
const AT_RECKONING: Cond[] = [{ stat: 'time', op: '<', value: 2 }];
const skiesDue: Cond = { all: [steamDecades(1), { any: [{ stat: 'wellbeing', op: '>=', value: 34 }, steamDecades(5)] }] };

export const features: Partial<Record<FeatureId, FeatureDef>> = {
  /* Run 1. The reveal brings only the meter and the cards' red line (its own card and headline introduce it). */
  reboundMeter: { when: actOne(revealed), name: 'The rebound' },
  /* Run 1, about five minutes after the reveal: the smoke is near a fifth of the way to collapse, and climbing. */
  levers: {
    when: actOne(revealed, { any: [{ stat: 'pressureFraction', sector: 'steam', op: '>=', value: 0.18 }, { stat: 'crises', sector: 'steam', op: '>=', value: 1 }] }),
    intro: 'Smoke noticed in Parliament; a coal duty is proposed',
    name: 'Counter-levers',
  },
  /* Run 1, the first crisis (it takes people), or the town grown by a third. */
  population: {
    when: actOne({ any: [{ stat: 'crises', sector: 'steam', op: '>=', value: 1 }, { stat: 'population', op: '>=', value: 1.3 }] }),
    intro: 'Parish registers record more mouths; the vicar orders more pews',
    name: 'People',
  },
  /* The first Reckoning: the Market buys run 2's routine opening cards itself from the first minute (QA B7: run 2 must
   * not open as run 1 did), so the player's first decisions are foundings and choices. */
  market: {
    when: actOne(rk(1)),
    intro: 'Engine makers now call unasked; routine orders place themselves',
    name: 'The Market',
  },
  /* Run 2, once a lever is in force again: the fuller lever (more of them, and where a levy's money goes). */
  moreLevers: {
    when: actOne(rk(1), { any: [{ owns: 'steam.duty' }, { owns: 'steam.sufficiency' }] }),
    intro: 'Parliament, having tried one measure, will hear of others',
    name: 'More levers',
  },
  /* The second Reckoning: a choice of starting situation for run 3. */
  charters: { when: actOne(rk(2)), intro: 'Two charters on the table; a select committee sits', name: 'Charters' },
  /* Run 3, 1801 (the first census), after the reveal: a line to keep under, and each decade kept pays. */
  budget: {
    when: actOne(rk(2), revealed, { stat: 'year', op: '>=', value: 1801 }),
    intro: 'First census taken; the Treasury asks how much coal is enough',
    name: 'The budget',
  },
  /* Once a cap is in force and its line has paid a decade: it can be tightened past its last step. */
  leverRepeat: { when: actOne(rk(2), { owns: 'steam.cap' }, steamDecades(1)), intro: 'Committee finds the cap can be tightened further, by statute', name: 'Tighten' },
  /* After two decades on a line: a choice of reward for each. */
  dividendChoice: { when: actOne(steamDecades(2)), intro: 'Another decade within the line; the Treasury offers a choice', name: 'Decade dividends' },
  /* After three decades on a line: how steeply a line falls. */
  budgetPace: { when: actOne(steamDecades(3)), intro: 'Members divide on how steeply the line should fall', name: 'The pace' },
  /* A decade paid and the wellbeing target reached: the clear level and the sink line (and lean against full). */
  clearSkies: { when: actOne(skiesDue), intro: 'Inspectors measure how much smoke the sky can carry off', name: 'Clear skies' },
  /* The first clear sky in any Industry: fifty years of it is Steady State. */
  steadyState: {
    when: actOne(skiesDue, { any: SECTORS.map((sector): Cond => ({ stat: 'clear', sector, op: '>=', value: 1 })) }),
    intro: 'First clear sky in living memory; the clubs ask how long it lasts',
    name: 'Steady State',
  },
  /* The third Reckoning: run 4 (moved from run 3, so it does not arrive with the budget). M4: Iron & Steel opens mid-run
   * in the same run (its own unlock has a ten-minute floor, so the two are apart). */
  commons: { when: actOne(rk(3)), intro: 'Ratepayers petition for baths and libraries out of the levies', name: 'The Commons' },
  /* The Reckoning after the first Steady State (from run 5): the next Steady State can be kept as it is. M3 balance:
   * at the Reckoning only (AT_RECKONING): a Steady State earned early in a run no longer brings Settlement mid-run. */
  settlement: { when: actOne({ owns: 'steadyState' }, rk(4), ...AT_RECKONING), intro: 'A settled industry proposed: burn at the sink line, and no more', name: 'Settlement' },

  /* ---------------- M3, re-timed for M4 (design/m4-design.md §9; M3's reasons: design/unlock-schedule.md) ----------
   * Owner's direction (19 Nov 2026): "options should be unlocked more slowly". From run 4 on, at most two arrivals a run:
   * one AT the Reckoning that begins it and one mid-run, never within five minutes of each other. M4: an Industry
   * opening IS the run's mid-run arrival (Iron in run 4, Fishing in run 6, the Previews after the Act I ending).
   *   - Mid-run arrivals share one window, minutes 25 to 29 of a run (MID), clear of any Industry's opening by five
   *     minutes; each also needs the one before it (a chain) and a run floor, so they come one run apart, in the runs no
   *     Industry first opens in: the seams (run 5), the load curve (run 7), the Archive (run 8), the bite (run 9).
   *   - Reckoning arrivals (AT_RECKONING): the Commons (run 4), Settlement (run 5), the household survey (run 7) and
   *     Histories (run 8); run 6 has none (Fishing and the Board's Survey are its two things).
   *   - The Previews' widgets arrive at the Reckoning after their Industry first opened (travel, the free price); each
   *     next Preview waits for the widget before it, so one Preview opens a run.
   * Nothing M3 arrives in run 3 (the budget's own unfolding). Banked time stays off. */

  /* Run 2, five minutes in (the first check after the Market): the paper simply has more in it. No intro: its first
   * item is the news. Not a system (it asks nothing), but it still takes an arrival's slot under the five-minute gap. */
  ambient: { when: actOne(rk(1)), name: 'More news' },
  /* Run 2, from minute 15 (after more levers, ~10), the quiet stretch of a levers-only run: introduced by the
   * correspondent's first letter. Not later: a burning run 2 ends by collapse at about 21 minutes, and an arrival in its
   * last five minutes would push the Charters out of run 3 (their offer is drawn only at the Reckoning). */
  dispatches: { when: actOne(rk(1), revealed, { stat: 'time', op: '>=', value: 900 }), name: 'Letters' },
  /* Mid-run in run 5 (M4: was run 4, which Iron now takes), once a first Steady State has been held and pumping is
   * cheap enough to reach the first seam (the condenser's price): the next seam down. */
  seams: {
    when: actOne(rk(4), { owns: 'steadyState' }, ...MID, { stat: 'servicePrice', sector: 'steam', op: '<=', value: 0.6 }),
    intro: 'Colliery agents report good coal below the old workings',
    name: 'The seams',
  },
  /* Mid-run in run 8 (M4: after the load curve; the travel dial is a Preview's now): a quiet arrival (it asks nothing).
   * Notes have been kept since the first minute of play, so nothing is lost by waiting. */
  archive: {
    when: actOne(rk(7), { feature: 'load' }, ...MID),
    intro: 'The Gazette opens its archive to subscribers',
    name: 'The Archive',
  },
  /* Mid-run in run 7 (M4: run 6 is Fishing's), the run after the seams at the earliest: Light has been open five runs. */
  load: {
    when: actOne(rk(6), { feature: 'seams' }, ...MID, { stat: 'serviceDelivered', sector: 'light', op: '>=', value: 600 }),
    intro: 'Evening Lamp notes the works stand idle every afternoon',
    name: 'The load curve',
  },
  /* M4 PREVIEW: at the Reckoning after Motion first opened (a Preview after the Act I ending, or in an older save that
   * opened it under M3): its widget comes with its second run, and Compute waits for it (one Preview a run). */
  travel: {
    when: { all: [rk(2), ...AT_RECKONING, { owns: 'motion' }] },
    intro: 'Motorist survey: faster roads, and the same hour at the wheel',
    name: 'Travel time',
  },
  /* M4 PREVIEW: at the Reckoning after Compute first opened: the tag shows as soon as a business model is bought in the
   * run. Code waits for it. (M3 also waited for a business model ever bought; dropped so that Code's wait has an end.) */
  freeAtUse: {
    when: { all: [rk(3), ...AT_RECKONING, { owns: 'compute' }] },
    intro: 'info: price shown to user: £0.00',
    name: 'Free at the point of use',
  },
  /* Mid-run in run 9, a run after the Archive at the earliest, once a lever's side effect has taken hold anywhere:
   * introduced by the 'biteBack' headline itself (a player who never lets a lever bite never needs it). */
  sideEffects: {
    when: actOne(rk(8), { feature: 'archive' }, ...MID, { any: SECTORS.map((sector): Cond => ({ stat: 'bite', sector, op: '>=', value: 0.3 })) }),
    name: 'Levers that bite back',
  },
  /* At a Reckoning from hour 6, once the Civil Service is owned: the Statistics Office's household survey (The
   * Proprietor's Day). M4: run 7 at the earliest (design §2A.4: a run after the Board's Survey; the two reveals are kin). */
  survey: {
    when: actOne(rk(6), ...AT_RECKONING, { stat: 'totalHours', op: '>=', value: 6 }, { owns: 'inst.civilService' }),
    intro: 'Statistics Office proposes a survey of how households spend the day',
    name: 'The household survey',
  },
  /* M4 (The Survey): the full account and the growing-rate years left, with the Board's first survey of the banks
   * (RenewableDef.firstSurvey sets the flag; a save that has surveyed gets it at once). No intro: the reveal card and its
   * follow-up headline introduce it (design §2A.2). */
  estimates: { when: actOne({ flag: 'survey:fishing' }), name: 'The full account' },
  /* At a Reckoning after the first Steady State, and not before hour 8: other histories of the same century (one line
   * on the Reckoning screen). M4: run 8 at the earliest. */
  histories: {
    when: actOne(rk(7), ...AT_RECKONING, { owns: 'steadyState' }, { stat: 'totalHours', op: '>=', value: 8 }),
    intro: 'Historians invited to run the century again, under other rules',
    name: 'Histories',
  },
  /* Off (GlobalParams.offline.bankRate 0; owner's decision for M4): an empty `any` never holds. */
  bank: { when: { any: [] }, intro: 'Hours lost to the hold are now kept on deposit', name: 'Banked time' },
};
