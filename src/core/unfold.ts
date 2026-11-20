/**
 * The unfolding's unlock check (see FeatureDef in src/types.ts): at most one feature per check, the first in FEATURE_IDS
 * order whose `when` holds, once GlobalParams.featureGapSeconds of play have passed since the last one. Run by tick()
 * once a real second (never inside fastForward) and by reckon() on the new run.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { FEATURE_IDS } from '../types';
import type { Content, FeatureId, GameState, MetaState, NewsItem } from '../types';
import { evalCond } from './conditions';
import type { EvDraft } from './events';
import { fin } from './util';

/** Seconds of run time between unlock checks in the step (see FeatureDef). */
export const FEATURE_CHECK_EVERY = 5;

const lockedCache = new WeakMap<object, { content: Content; locked: FeatureId[]; last: number }>();
const NONE = {};
/** The features still locked, in FEATURE_IDS order, and when the last one unlocked; cached per meta.features object. */
function lockedOf(meta: MetaState, content: Content): { locked: FeatureId[]; last: number } {
  const key = meta.features ?? NONE;
  const hit = lockedCache.get(key);
  if (hit && hit.content === content) return hit;
  const got = meta.features ?? {};
  const f = content.features ?? {};
  let last = -Infinity;
  for (const k in got) { const v = got[k as FeatureId]; if (typeof v === 'number' && v > last) last = v; }
  const out = { content, locked: FEATURE_IDS.filter((id) => !!f[id] && got[id] === undefined), last };
  lockedCache.set(key, out);
  return out;
}

/** The feature due now for `state` (conditions read `state`), or null. Cheap when nothing is locked or the gap since
 *  the last arrival has not passed. */
export function dueFeature(state: GameState, content: Content, atReckoning = false): FeatureId | null {
  if (!content.features) return null;
  const meta = state.meta;
  const { locked, last } = lockedOf(meta, content);
  if (!locked.length) return null;
  // M5 (follow-up 2): the gap keeps two arrivals off one screen within a run; a Reckoning is another screen, so its
  // check is not held back by an arrival late in the run just ended (still one feature per check)
  const gap = fin(content.global?.featureGapSeconds ?? 0);
  if (!atReckoning && gap > 0 && meta.totalSeconds - last < gap) return null;
  const f = content.features;
  for (const id of locked) if (evalCond(state, content, f[id]!.when)) return id;
  return null;
}

/** The meta with `id` unlocked now, and the news item and event that mark it (time/year as the caller's moment). */
export function unlockFeature(meta: MetaState, content: Content, id: FeatureId, time: number, year: number, items: NewsItem[], ev: EvDraft[]): MetaState {
  const intro = content.features?.[id]?.intro;
  if (intro) items.push({ time, year: Math.floor(year), key: 'featureUnlocked', text: intro });
  ev.push({ kind: 'featureUnlocked', id });
  return { ...meta, features: { ...(meta.features ?? {}), [id]: meta.totalSeconds } };
}
