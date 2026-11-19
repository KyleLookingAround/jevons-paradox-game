/**
 * The unfolding (see FeatureDef in src/types.ts): whether a feature is unlocked, the Derived view of them all, and
 * the unlock check that tick() and reckon() run (one feature at a time, spaced by GlobalParams.featureGapSeconds).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 * `featureOn` is layer 0 (it reads only content and meta); `unlockFeatures` evaluates conditions and lives with them
 * in layer 7, in unfold.ts.
 */
import { FEATURE_IDS } from '../types';
import type { Content, FeatureId, GameState, MetaState } from '../types';

/** True when `id` is unlocked for this meta: always for a feature content does not define (content without features
 *  plays as before). O(1); called on hot paths. */
export function featureOn(content: Content, meta: MetaState, id: FeatureId): boolean {
  const f = content.features;
  if (!f || !f[id]) return true;
  return meta.features?.[id] !== undefined;
}

const viewCache = new WeakMap<object, { content: Content; view: Record<FeatureId, boolean> }>();
const EMPTY = {};
/** Derived.features: every FeatureId → unlocked. Cached per meta.features object. */
export function featuresView(state: GameState, content: Content): Record<FeatureId, boolean> {
  const key = state.meta.features ?? EMPTY;
  const hit = viewCache.get(key);
  if (hit && hit.content === content) return hit.view;
  const view = {} as Record<FeatureId, boolean>;
  for (const id of FEATURE_IDS) view[id] = featureOn(content, state.meta, id);
  viewCache.set(key, { content, view });
  return view;
}

/** True when some feature in content is still locked (the unlock check's fast exit). */
export function anyLocked(content: Content, meta: MetaState): boolean {
  const f = content.features;
  if (!f) return false;
  for (const id of FEATURE_IDS) if (f[id] && meta.features?.[id] === undefined) return true;
  return false;
}

/**
 * Grandfathering for a save made before the unfolding (no meta.features): every feature whose old gate holds for the
 * save (see SAVE_VERSION). Stamped with the save's meta.totalSeconds.
 */
export function grandfathered(content: Content, meta: MetaState, revealed: boolean): Partial<Record<FeatureId, number>> {
  const out: Partial<Record<FeatureId, number>> = {};
  const f = content.features;
  if (!f) return out;
  const t = meta.totalSeconds ?? 0;
  const rk = meta.reckonings ?? 0;
  const inRun: FeatureId[] = ['reboundMeter', 'levers', 'moreLevers', 'budget', 'leverRepeat', 'dividendChoice', 'budgetPace', 'clearSkies', 'steadyState', 'settlement'];
  const grant = (id: FeatureId) => { if (f[id]) out[id] = t; };
  grant('population');
  if (revealed || rk >= 1) inRun.forEach(grant);
  if (rk >= 1) { grant('market'); grant('charters'); }
  if (rk >= 2) grant('commons');
  return out;
}
