/**
 * Global parameters: start, click, population and demography, Mandate, crises, Hindsight weights, offline cap,
 * Steady State knobs, levy, seats.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { GlobalParams } from '../types';

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
  /* Placeholder weights: the balance lane tunes these to owner decision D1. */
  hindsight: {
    perWellbeingYear: 0.03,
    intensityExponent: 0,
    perBudgetDecade: 1.5,
    perUnburnt: 20,
    perFirstBackfire: 30,
    perSectorReached: 10,
    perSteadySector: 60,
  },
  offlineCapSeconds: 4 * 60 * 60,
  /* Growth peaks at W ≈ 29.9 and stops at 46; the wellbeing target (34) sits below the transition. */
  demography: { transitionWellbeing: 46 },
  steady: {
    budgetDeclinePerDecade: 0.05,
    /* A standing cap draws its line 36 model years (12 minutes) into an industry: across the grown economy. */
    standingDrawYears: 36,
    decadeYears: 10,
    decadeEffects: [
      { type: 'mandateAdd', value: 60 },
      { type: 'capitalAdd', value: 30 },
      /* Standing, once per decade earned this run: restraint's own reward loop against population growth. */
      { type: 'wellbeingAdd', value: 0.3 },
    ],
    firstSteadyEffects: [{ type: 'slotAdd', value: 1 }],
  },
  levy: { mandateShare: 0.003 },
  startingSlots: 2,
};
