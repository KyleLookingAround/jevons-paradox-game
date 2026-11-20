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
import { unlockNotes } from './archive';
import { answerDispatch } from './dispatch';
import { retrospective } from './ending';
import { emit } from './events';
import { calendarYear } from './calendar';
import { chooseHistory, historyViews } from './history';
import { fastForward as ff, useBank } from './offline';
import { fileReturn, publishOnFlag, withdrawReturn } from './returns';
import { sinkSeam } from './seams';
import { archiveViews } from './archive';
import type { EvDraft } from './events';
import { buyArticle, takeOffice, treaty } from './chair/office';
import { campaign, choosePledges } from './chair/elections';
import { compensate } from './chair/treasury';
import { inspect } from './chair/inspect';
import { amend } from './chair/loopholes';

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

/**
 * M3: what runs at the end of every action that changed the state: Archive notes whose subject rule now holds
 * ('archiveUnlocked'), and the Proprietor's Day the moment its meta flag is first set (a card bought).
 */
function after<A extends unknown[]>(fn: (state: GameState, content: Content, ...args: A) => GameState): (state: GameState, content: Content, ...args: A) => GameState {
  return (state, content, ...args) => {
    let next = fn(state, content, ...args);
    if (next === state) return next;
    next = publishOnFlag(state, next, content);
    if (content.archive?.length) {
      const ev: EvDraft[] = [];
      const meta = unlockNotes(next, content, next.meta, ev);
      if (meta !== next.meta) next = emit({ ...next, meta }, ev, next.time, calendarYear(next, content));
    }
    return next;
  };
}
void fastForward;

export const model: CoreModel = {
  createState, tick, fastForward: ff, derive, click,
  buyUpgrade: after(asDecision(buyUpgrade)),
  foundApp: after(asDecision(foundApp)),
  setLever: after(asDecision(setLever)),
  setLeverRecycle: after(asDecision(setLeverRecycle)),
  drawBudget: after(asDecision(drawBudget)),
  chooseDecadeDividend: after(asDecision(chooseDecadeDividend)),
  settle: after(asDecision(settle)),
  unsettle: after(asDecision(unsettle)),
  buyCommons: after(asDecision(buyCommons)),
  setOrders: asDecision(setOrders, (prev) => !isFreshRun(prev)),
  reckon: after(reckon), buyKnowhow: after(buyKnowhow), buyInstitution: after(buyInstitution), setLoadout: after(setLoadout),
  chooseCharter: after(chooseCharter), respecKnowhow: after(respecKnowhow),
  upgradeViews, leverViews, knowhowViews, institutionViews, commonsViews, yearAt, hindsightOnReckon,
  serialize, deserialize,
  /* M3 */
  sinkSeam: after(asDecision(sinkSeam)),
  answerDispatch: after(asDecision(answerDispatch)),
  chooseHistory: after(chooseHistory),
  fileReturn: after(fileReturn),
  withdrawReturn,
  useBank: after(useBank),
  historyViews, archiveViews, retrospective,
  /* M5 (in-run actions are decisions; takeOffice, treaty and buyArticle are between runs and are not) */
  takeOffice: after(takeOffice),
  inspect: after(asDecision(inspect)),
  amend: after(asDecision(amend)),
  choosePledges: after(asDecision(choosePledges)),
  campaign: after(asDecision(campaign)),
  compensate: after(asDecision(compensate)),
  treaty: after(treaty),
  buyArticle: after(buyArticle),
};
