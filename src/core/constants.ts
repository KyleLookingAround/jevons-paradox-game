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
/** Projection horizon (s) and step (s): PROJECTION_YEARS model years at dt = 10 (M2 performance fix; M1 used 5). */
export const PROJECTION_SECONDS = PROJECTION_YEARS / YEARS_PER_SECOND;
export const PROJECTION_DT = 5;
/** M2: the projection cache's time bucket (s): a card's lines are recomputed at most once per bucket while nothing
 *  structural changes. */
export const PROJECTION_BUCKET = 20;

/* --- M2 defaults (the contract's documented defaults, named once) --- */
/** SteadyParams.drawnSlack, clearBelow, clearFloor, clearCeiling defaults. */
export const DEFAULT_DRAWN_SLACK = 0.05;
export const DEFAULT_CLEAR_BELOW = 0.5;
export const DEFAULT_CLEAR_FLOOR = 0.03;
export const DEFAULT_CLEAR_CEILING = 0.25;
/** SectorDef.settle.freeExcess default. */
export const DEFAULT_FREE_EXCESS = 0.05;
/** Offline cap when neither GlobalParams.offline nor offlineCapSeconds is given (4 h). */
export const DEFAULT_OFFLINE_CAP = 14400;
/** GlobalParams.orders defaults. */
export const DEFAULT_MARKET_FROM_RECKONING = 1;
export const DEFAULT_MARKET_PAYBACK = 120;
export const DEFAULT_PAYBACK_CHOICES = [30, 120, 600];
export const DEFAULT_ORDER_INTERVAL_YEARS = 1;
/** setOrders clamps paybackMax and keepSeconds to these ranges (s). */
export const PAYBACK_MIN = 1;
export const ORDER_SECONDS_MAX = 86400;
/** Default Treasury rules reserve, seconds of income. */
export const DEFAULT_KEEP_SECONDS = 60;
/** GlobalParams.commons defaults. */
export const DEFAULT_COMMONS_FROM_RECKONING = 2;
export const DEFAULT_COMMONS_FUND_SHARE = 1;

/* --- M3 defaults (the contract's documented defaults, named once) --- */
/** GlobalParams.dispatch defaults. */
export const DEFAULT_DISPATCH = { firstYears: 30, intervalYears: 8, jitter: 0.5, expiryYears: 12, maxPending: 1 } as const;
/** GameState.dispatch.queue keeps at most this many follow-ups (older dropped). */
export const DISPATCH_QUEUE_MAX = 8;
/** GlobalParams.ambient defaults. */
export const DEFAULT_AMBIENT = { everyYears: 4, cooldownYears: 30 } as const;
/** LoadDef.floor default; TravelDef.exponent default; inner travel bisection iterations. */
export const DEFAULT_LOAD_FLOOR = 0.05;
export const DEFAULT_TRAVEL_EXPONENT = 4;
export const TRAVEL_ITERS = 40;
/** A side effect's bite at which 'biteBack' fires (once per lever per run). */
export const BITE_BACK_AT = 0.5;
/** Survey direction band (SurveyView.direction). */
export const SURVEY_FLAT_BAND = 0.05;
