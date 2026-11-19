/**
 * REBOUND — simulation core. Pure TypeScript: no DOM, no clock, no randomness.
 * Implements ModelApi from ../types (M1 contract). Never mutates the state passed in.
 *
 * The registry: assembles `model` from the modules in this folder and is the only public entry point. Module map and
 * dependency direction: README.md.
 */
import type { ModelApi } from '../types';
import { derive } from './derive';
import { hindsightOnReckon } from './hindsight';
import { drawBudget, leverViews, setLever, setLeverRecycle } from './policy';
import { buyInstitution, buyKnowhow, institutionViews, knowhowViews, reckon, setLoadout } from './prestige';
import { upgradeViews } from './projections';
import { buyUpgrade, click, foundApp } from './purchases';
import { deserialize, serialize } from './serialise';
import { createState } from './state';
import { fastForward, tick } from './step';

export {
  DEFAULT_MANDATE_SHARE, DEFAULT_BUDGET_DECLINE, DEFAULT_DECADE_YEARS, SUBSTITUTION_CAPCOST_MUL, CAP_LEAK_MAX,
  CAP_SQUEEZE_MAX, FLOW_MAX_UTILISATION, FLOW_MIN_CAPACITY_SHARE, DEFECT_UTILISATION_START, DEFECT_PENALTY, TREND_TAU,
  SUFFICIENCY_RECOVERY_RATE, NEGATIVE_GROWTH_STRENGTH, POP_MIN, REBOUND_MIN_FOLD, HISTORY_EVERY, HISTORY_MAX, NEWS_MAX,
  FAST_FORWARD_STEP, PROJECTION_SECONDS, PROJECTION_DT,
} from './constants';
export { leverMaxLevel, leverLevelDef } from './levers';
export { substitute } from './headlines';
export { statValue, evalCond } from './conditions';

export const model: ModelApi = {
  createState, tick, fastForward, derive, click, buyUpgrade, foundApp, setLever, setLeverRecycle, drawBudget, reckon,
  buyKnowhow, buyInstitution, setLoadout, upgradeViews, leverViews, knowhowViews, institutionViews, hindsightOnReckon,
  serialize, deserialize,
};
