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
import { anyLocked } from './features';
import { fin } from './util';

/** The feature due now for `state` (conditions read `state`), or null. */
export function dueFeature(state: GameState, content: Content): FeatureId | null {
  const meta = state.meta;
  if (!anyLocked(content, meta)) return null;
  const f = content.features!;
  const got = meta.features ?? {};
  const gap = fin(content.global?.featureGapSeconds ?? 0);
  if (gap > 0) {
    let last = -Infinity;
    for (const k in got) { const v = got[k as FeatureId]; if (typeof v === 'number' && v > last) last = v; }
    if (meta.totalSeconds - last < gap) return null;
  }
  for (const id of FEATURE_IDS) {
    const d = f[id];
    if (!d || got[id] !== undefined) continue;
    if (evalCond(state, content, d.when)) return id;
  }
  return null;
}

/** The meta with `id` unlocked now, and the news item and event that mark it (time/year as the caller's moment). */
export function unlockFeature(meta: MetaState, content: Content, id: FeatureId, time: number, year: number, items: NewsItem[], ev: EvDraft[]): MetaState {
  const intro = content.features?.[id]?.intro;
  if (intro) items.push({ time, year: Math.floor(year), key: 'featureUnlocked', text: intro });
  ev.push({ kind: 'featureUnlocked', id });
  return { ...meta, features: { ...(meta.features ?? {}), [id]: meta.totalSeconds } };
}
