// The page's handle on the lazily loaded scene engine (lazy/scene.ts, loaded by chunks.ts). The pure adapter is
// imported directly from ./scene/adapter; only drawing needs the engine.
import { chunkNow, loadChunk } from './chunks';
import type { SceneRt } from './lazy/scene';

export type { SceneRt };
export const sceneNow = (): SceneRt | null => chunkNow<SceneRt>('scene');
export const loadScene = (): Promise<SceneRt> => loadChunk<SceneRt>('scene');

function need(): SceneRt {
  const m = sceneNow();
  if (!m) throw new Error('the scene engine has not arrived');
  return m;
}
/** Throws until the engine has arrived (callers already guard createScene with try/catch and a plain fallback). */
export const createScene: SceneRt['createScene'] = (host, opts) => need().createScene(host, opts);
export const spot: SceneRt['spot'] = (...a) => need().spot(...a);
/** Waits for the engine. */
export const renderStill: SceneRt['renderStill'] = async (view, o) => (await loadScene()).renderStill(view, o);
