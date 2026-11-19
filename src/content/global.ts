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
 * The first pace is the default for lines the player did not draw by hand.
 */
export const PACES: PaceDef[] = [
  { id: 'gentle', name: 'Gentle', declinePerDecade: 0.05, dividendMul: 1, blurb: 'Five per cent a decade. The dividend as it stands.' },
  { id: 'firm', name: 'Firm', declinePerDecade: 0.1, dividendMul: 1.6, blurb: '10 per cent a decade. A larger dividend, and a line that bites sooner.' },
  { id: 'severe', name: 'Severe', declinePerDecade: 0.2, dividendMul: 2.5, blurb: 'A fifth a decade. The dividend more than doubles, if the decade is ever earned.' },
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
    perBudgetDecade: 3,
    perUnburnt: 20,
    perFirstBackfire: 30,
    perSectorReached: 10,
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
   */
  offline: { capSeconds: 8 * 3600, holdBefore: 'crisis', hindsightRate: 0.15 },
  /* Growth peaks at W ≈ 29.9 and stops at 46; the wellbeing target (34) sits below the transition. */
  demography: { transitionWellbeing: 46 },
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
};
