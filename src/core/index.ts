/**
 * REBOUND — simulation core. Pure TypeScript: no DOM, no clock, no randomness.
 * Implements ModelApi from ../types (M2 contract). Never mutates the state passed in.
 *
 * The registry: assembles `model` from the modules in this folder and is the only public entry point. Module map and
 * dependency direction: README.md. Every in-run player action is wrapped by asDecision (record.ts): a call that
 * changes the state counts one decision.
 */
import type { Content, GameState, ModelApi, SectorId, UpgradeView } from '../types';
import { yearAt } from './calendar';
import { chooseCharter } from './charters';
import { buyCommons, commonsViews } from './commonsActions';
import { derive } from './derive';
import { chooseDecadeDividend } from './dividends';
import { hindsightOnReckon } from './hindsight';
import { fastForward } from './offline';
import { setOrders } from './orders';
import { drawBudget, leverViews, setLever, setLeverRecycle } from './policy';
import { buyInstitution, buyKnowhow, institutionViews, knowhowViews, reckon, respecKnowhow, setLoadout } from './prestige';
import { upgradeViews } from './projections';
import { buyUpgrade, click, foundApp } from './purchases';
import { asDecision } from './record';
import { deserialize, serialize } from './serialise';
import { settle, unsettle } from './settlement';
import { createState, isFreshRun } from './state';
import { tick } from './step';

export {
  DEFAULT_MANDATE_SHARE, DEFAULT_BUDGET_DECLINE, DEFAULT_DECADE_YEARS, SUBSTITUTION_CAPCOST_MUL, CAP_LEAK_MAX,
  CAP_SQUEEZE_MAX, FLOW_MAX_UTILISATION, FLOW_MIN_CAPACITY_SHARE, DEFECT_UTILISATION_START, DEFECT_PENALTY, TREND_TAU,
  SUFFICIENCY_RECOVERY_RATE, NEGATIVE_GROWTH_STRENGTH, POP_MIN, REBOUND_MIN_FOLD, HISTORY_EVERY, HISTORY_MAX, NEWS_MAX,
  FAST_FORWARD_STEP, PROJECTION_SECONDS, PROJECTION_DT, PROJECTION_BUCKET,
} from './constants';
export { leverMaxLevel, leverLevelDef } from './levers';
export { substitute } from './headlines';
export { statValue, evalCond } from './conditions';
export { mix32 } from './charters';

/**
 * ModelApi plus the core's one extension: upgradeViews takes an optional sector, and then projects only that sector's
 * cards (see projections.ts). Assignable to ModelApi.
 */
export interface CoreModel extends ModelApi {
  upgradeViews(state: GameState, content: Content, sector?: SectorId): UpgradeView[];
}

export const model: CoreModel = {
  createState, tick, fastForward, derive, click,
  buyUpgrade: asDecision(buyUpgrade),
  foundApp: asDecision(foundApp),
  setLever: asDecision(setLever),
  setLeverRecycle: asDecision(setLeverRecycle),
  drawBudget: asDecision(drawBudget),
  chooseDecadeDividend: asDecision(chooseDecadeDividend),
  settle: asDecision(settle),
  unsettle: asDecision(unsettle),
  buyCommons: asDecision(buyCommons),
  setOrders: asDecision(setOrders, (prev) => !isFreshRun(prev)),
  reckon, buyKnowhow, buyInstitution, setLoadout, chooseCharter, respecKnowhow,
  upgradeViews, leverViews, knowhowViews, institutionViews, commonsViews, yearAt, hindsightOnReckon,
  serialize, deserialize,
};
