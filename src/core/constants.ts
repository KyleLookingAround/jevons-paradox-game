/**
 * Constants chosen by the model (the contract's own constants live in ../types). All public: index.ts
 * re-exports them.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND, PROJECTION_YEARS } from '../types';

/* ------------------------------------------------------------------ */
/* Constants chosen by the model                                       */
/* ------------------------------------------------------------------ */

/** Default share of treasury-routed levy revenue that becomes Mandate (GlobalParams.levy absent). */
export const DEFAULT_MANDATE_SHARE = 0.1;
/** Default budget decline per decade and decade length (GlobalParams.steady absent). */
export const DEFAULT_BUDGET_DECLINE = 0.05;
export const DEFAULT_DECADE_YEARS = 10;
/** Substituted (renewable) service costs this multiple of capCost per unit, and no resource. */
export const SUBSTITUTION_CAPCOST_MUL = 1.5;
/** A hard cap leaks by up to this share once the permit price is far above the resource price. */
export const CAP_LEAK_MAX = 0.25;
/** A cap squeezes out at most this share of the demand that is not a floor (lock-in, drawsOn). */
export const CAP_SQUEEZE_MAX = 0.95;
/** Flow sectors: price saturates here; service above this utilisation is rationed (never reaches 1). */
export const FLOW_MAX_UTILISATION = 0.98;
/** Flow sectors: effective capacity never falls below this share of nominal capacity. */
export const FLOW_MIN_CAPACITY_SHARE = 0.05;
/** Flow sectors (Code): utilisation above this starts shipping unreviewed work (defect penalty). */
export const DEFECT_UTILISATION_START = 0.8;
/** Wellbeing share lost at full unreviewed share. */
export const DEFECT_PENALTY = 0.5;
/** Time constant (s) of the smoothed resource-use average (cosmetic trend arrow). */
export const TREND_TAU = 60;
/** Rate per second at which sufficiency-lowered saturation recovers once the lever is relaxed. */
export const SUFFICIENCY_RECOVERY_RATE = 0.01;
/** Population shrinks at this fraction of the growth rate when wellbeing is below subsistence. */
export const NEGATIVE_GROWTH_STRENGTH = 0.25;
export const POP_MIN = 0.01;
/** Rebound is reported only once etaFold exceeds this. */
export const REBOUND_MIN_FOLD = 1.001;
export const HISTORY_EVERY = 5;
export const HISTORY_MAX = 240;
export const NEWS_MAX = 40;
export const FAST_FORWARD_STEP = 5;
/** Projection horizon (s) and step (s): PROJECTION_YEARS model years at dt = 5. */
export const PROJECTION_SECONDS = PROJECTION_YEARS / YEARS_PER_SECOND;
export const PROJECTION_DT = 5;
