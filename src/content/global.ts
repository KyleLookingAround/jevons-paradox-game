/**
 * Global parameters: start, click, population and demography, Mandate, crises, Hindsight weights, offline cap,
 * Steady State knobs, levy, seats.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { GlobalParams, PaceDef } from '../types';
import { DECADE_PAIRS } from './helpers';

/* ------------------------------------------------------------------ */
/* PACES (M2)                                                          */
/* ------------------------------------------------------------------ */

/*
 * The pace of a budget line. A steeper line falls faster towards the sink line and pays a larger one-off dividend
 * (dividendMul scales mandateAdd and capitalAdd of the decade's base and of the chosen dividend; standing effects are
 * not scaled). Severe's ×2.5 makes its one-offs worth having, not decisive: a Severe decade is much harder to earn.
 * QA B14: the blurbs do not repeat the decline or the multiplier, which the page prints beside them.
 * The first pace is the default for lines the player did not draw by hand.
 */
export const PACES: PaceDef[] = [
  { id: 'gentle', name: 'Gentle', declinePerDecade: 0.05, dividendMul: 1, blurb: 'A line that falls slowly, and the dividend as it stands.' },
  { id: 'firm', name: 'Firm', declinePerDecade: 0.1, dividendMul: 1.6, blurb: 'A larger dividend, and a line that bites sooner.' },
  { id: 'severe', name: 'Severe', declinePerDecade: 0.2, dividendMul: 2.5, blurb: 'The largest dividend, if the decade is ever earned.' },
];

/* ------------------------------------------------------------------ */
/* GLOBAL                                                              */
/* ------------------------------------------------------------------ */

export const global: GlobalParams = {
  startCapital: 10,
  /* Below 1 so the sell button can fade once income outgrows it (balance finding 7). */
  clickSeconds: 0.01,
  clickFlat: 1.2,
  popGrowth: 0.000025,
  subsistence: 8,
  wellbeingTarget: 34,
  mandateRate: 0.03,
  mandateFloor: 12,
  crisisMandate: 150,
  crisisPopLoss: 0.08,
  /*
   * M2 balance (owner decision D1 and decision (a)): backfire leads 1.3× in run 1 and 1.8× in run 2; restraint leads
   * 1.8–2.9× from run 3. First backfire 20 (not 30: a lump both styles earn, which narrowed the run-1 lead); a FULL
   * decade 3 (not 1.5: pays only at the full target, so from run 3); Industries reached 6 (not 10: a lump per run that
   * favoured the fastest collapse).
   * Unfolding balance (19 Nov 2026): with budgets from run 3, restraint in runs 1–2 is levers only and earns no decade, so
   * it earns almost what burning does; first backfire 30 (not 20) and Industries reached 10 (not 6), two lumps that
   * favour the shorter, harder-burning run, put burning 1.24× ahead in run 2 (run 1: 1.09×, see src/balance.test.ts E7).
   */
  hindsight: {
    perWellbeingYear: 0.03,
    intensityExponent: 0,
    /* M4 balance: 5 (M2/M3: 3). Without Motion, Compute and Code the restraint player's runs 4–5 earned 8.6–8.8 Hindsight
     * a minute against the burner's 6–7.3 (1.2×; M2/M3's margin is 1.5×): Iron opens for burners in run 4 too, with its
     * first-backfire lump, and the doubled coal leaves the burner's short runs as rich as they were long. A full decade
     * is the one thing only restraint earns. */
    perBudgetDecade: 5,
    perUnburnt: 20,
    /* M4 polish: the burner's margin. Steam's doubled coal (760,000 t) made smoke, not coal, end a burning run (16–17
     * minutes from run 3), so each short run banked the coal it never reached (unburnt, ≈ 24) and two Industries
     * reached (20) as lumps: 6–7 Hindsight a minute against restraint's 9.7–11.6 (0.6–0.7; M3 about 0.4). Now coal left
     * counts by full decades kept once the budget has arrived (unburntDecades), the Industries-reached lump is gone, and
     * the first backfire in an Industry, a lesson burning teaches once, pays 40 (was 30) so runs 1–2 pay the burner as
     * much as before (run 2: 5.07 → 5.32 a minute). Measured (design/scratch/m4-polish/p2-v3b): burner 3.1–3.4 a minute
     * from run 3 (0.30–0.35 of restraint; Iron's run 4 5.3, 0.54), drawing at every peak 0.46 of the budget player. */
    perFirstBackfire: 40,
    perSectorReached: 0,
    unburntDecades: 30,
    perSteadySector: 60,
    /* M2: a lean decade (judged against the drawn wellbeing) pays its dividend and no Hindsight (decision (a)). */
    perLeanDecade: 0,
    /* M2: about half of perSteadySector, per Industry settled at the Reckoning (kept: first Settlement at about 5 h). */
    perSettledSector: 30,
  },
  /*
   * M2: a night from the start (8 h), never crossing a crisis unseen; Institutions add offline steps (prestige.ts).
   * Hindsight away at 15% of the rate (offline fix): a held restraint run (run 4) away for 8 h earned +4,300, about six
   * runs' worth, at the full rate; 0.2 still left it at 1.06–1.17× its own run; 0.15 puts the worst case below one
   * run (src/balance.test.ts E9b).
   * M3 balance: 0.08. Budget lines now pause while away (they no longer decline), and with M3's shorter held runs an
   * 8-hour absence at 0.15 earned 1.44× the run it interrupted (933 against 648); 0.08 puts it near 0.8×.
   */
  offline: {
    capSeconds: 8 * 3600, holdBefore: 'crisis', hindsightRate: 0.08,
    /* M3: banked time is OFF (feature 'bank' unreachable in features.ts). Turning it on is these two numbers and the
     * feature's `when` (design/m3-contract-notes.md §8). */
    bankRate: 0, bankMax: 0,
  },
  /* Growth peaks at W ≈ 29.9 and stops at 46; the wellbeing target (34) sits below the transition.
   * M4 balance: 40 (growth peaks at W ≈ 26.5 and stops at 40). The Coal Age alone holds a restraint player's town at
   * W 30–40 in runs 3–4 (M3's Motion, Compute and Code lifted it to 76–140, past the transition): at 46 the town grew
   * eightfold in `mixed`'s run 3 (population 1.0 → 8.5 in two hours), wellbeing fell from 37 to 21 under the held line
   * and the run earned 2 Hindsight a minute, less than burning. At 40: 7.6 a minute, Steady State in run 3, and the Act I
   * ending at 15.4–15.9 h for all three scripted players (design/scratch/m4-balance/v16-*). */
  demography: { transitionWellbeing: 40 },
  steady: {
    budgetDeclinePerDecade: 0.05,
    /* QA (B2): a line never falls below half the use it was drawn at (a line left alone for hours stopped at nothing). */
    budgetFloor: 0.5,
    /* A standing cap draws its line 36 model years (12 minutes) into an industry: across the grown economy. */
    standingDrawYears: 36,
    decadeYears: 10,
    decadeEffects: [
      { type: 'mandateAdd', value: 60 },
      { type: 'capitalAdd', value: 30 },
      /*
       * Standing, once per decade earned this run: restraint's own reward loop against population growth. M2 balance:
       * 0.1, not 0.3: five Industries earn 100–130 decades in a long run, and at 0.3 that alone was +30–40 wellbeing.
       */
      { type: 'wellbeingAdd', value: 0.1 },
    ],
    firstSteadyEffects: [{ type: 'slotAdd', value: 1 }],
    /* M2: a decade is judged against the line's own day: nobody worse off than when it was drawn (less 5%). */
    decadeWellbeing: 'drawn',
    drawnSlack: 0.05,
    /*
     * M2: clear skies at half the pressure the line was drawn under, between 1% and 25% of collapse (the ceiling sits
     * below every first crisis, 0.3–0.4; M2 balance: floor 1%, not 3%, which a line drawn as an Industry opens met at
     * once). Halving the pressure means roughly halving R at fixed absorption: a held cap
     * alone does not get there (Industries override; balance tunes).
     */
    clearBelow: 0.5,
    clearFloor: 0.01,
    clearCeiling: 0.25,
    paces: PACES,
    /* The global sequence; every Industry interleaves its own pairs with it (helpers.ts decadeSequence). */
    decadeChoices: DECADE_PAIRS,
  },
  levy: { mandateShare: 0.003 },
  startingSlots: 2,
  /* M2: the Market from run 2 (on by default; payback within two minutes), an order tick every model year (20 s). */
  orders: { marketFromReckoning: 1, marketPaybackMax: 120, paybackChoices: [30, 120, 600], intervalYears: 1 },
  /* The Commons from run 4 (the unfolding: moved from run 3 so they do not arrive with the budget; features.ts); all levy
   * money routed to them reaches the fund. */
  commons: { fromReckoning: 3, fundShare: 1 },
  /* M2: a free Know-how respec between runs (decision (h)). */
  respecRefund: 1,
  /* The unfolding: five minutes of play at least between two systems arriving (features.ts). */
  featureGapSeconds: 300,
  /*
   * M3: the dispatch scheduler, stated explicitly (the contract's defaults). The first letter of a run at 30 model years
   * (ten minutes in), then one about every eight model years (160 s) after each is answered or expires, ±25% (jitter
   * 0.5); a letter waits twelve model years (four minutes) before its default answers it; one waits at a time.
   */
  dispatch: { firstYears: 30, intervalYears: 8, jitter: 0.5, expiryYears: 12, maxPending: 1 },
  /* M3: at most one ambient headline every four model years (80 s); a template rests thirty years (ten minutes). */
  ambient: { everyYears: 4, cooldownYears: 30 },
  /*
   * M3 (finish): the first ending is every Industry settled at once, held for fifty model years (1000 s, about seventeen
   * minutes of play). Long enough that every settlement must be defended through it (a lapsed defence or an unsettle
   * starts it again), short enough that a player who has settled the fifth does not wait in an empty room. The
   * credits' title, "Fifty Years Within the Line", reads this number.
   */
  endingYears: 50,
  /* M3 finish: three settled Industries at once; the Royal Commission (prestige.ts) makes room for the fourth and fifth. */
  settleMax: 3,
};
