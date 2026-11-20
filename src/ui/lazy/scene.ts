// Lazy part 'scene' (see ../chunks.ts): the scene engine, its CSS, every art style, layout and prop library. The pure
// adapter (sceneViewFrom and friends) is not here: the page imports it directly (../scene/adapter).
import { createScene, renderStill, describeView } from '../scene/engine';
import { spot } from '../scene/spots';
import { postcard } from '../scene/postcard';

/* M4: postcard (the Industry tabs' static crops; bar.ts). */
export const sceneRt = { createScene, renderStill, describeView, spot, postcard };
export type SceneRt = typeof sceneRt;

const G = self as unknown as { __rb?: Record<string, unknown>; __rbOn?: (n: string) => void };
(G.__rb = G.__rb || {}).scene = sceneRt;
G.__rbOn?.('scene');
