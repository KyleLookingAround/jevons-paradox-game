// Lazy part 'scene' (see ../chunks.ts): the scene engine, its CSS, every art style, layout and prop library. The pure
// adapter (sceneViewFrom and friends) is not here: the page imports it directly (../scene/adapter).
import { createScene, renderStill, describeView } from '../scene/engine';
import { spot } from '../scene/spots';

export const sceneRt = { createScene, renderStill, describeView, spot };
export type SceneRt = typeof sceneRt;

const G = self as unknown as { __rb?: Record<string, unknown>; __rbOn?: (n: string) => void };
(G.__rb = G.__rb || {}).scene = sceneRt;
G.__rbOn?.('scene');
