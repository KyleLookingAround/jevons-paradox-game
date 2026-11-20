// Public surface of the scene engine. The main UI needs only these.
export { createScene, describeView, renderStill } from './engine';
export { sceneViewFrom, machineStage, sceneEvents, compactView, viewFromSummary } from './adapter';
export type { RunSummaryLike } from './adapter';
// M3: spot illustrations per headline key, and the figure keys the scene can draw.
export { spot, SPOT_OF, SPOT_KINDS } from './spots';
export type { SpotKind, SpotOptions } from './spots';
export { FIGURE_KEYS } from './props/figures';
export { MomentDesk } from './moments';
// M4: postcards for the Industry tabs.
export { postcard, postcardKey } from './postcard';
export type { PostcardOptions } from './postcard';
export { registerLayout, registerProps, hasLayout } from './registry';
export { SCENE_CSS, injectSceneCss, sceneCss } from './css';
// Additive (art-style layer): register a new Age's drawing style.
export { registerStyle, styleFor } from './styles/index';
export type { ArtStyle, PlateCtx } from './style';
export type { SceneView, SceneApp, SceneLever, SceneOptions, SceneHandle, AppStatus, SceneCommons, SceneEvent, SceneTarget, StillOptions, ReplayOptions, SceneSeams, SceneLoad, SceneTravel, SceneFeed, SceneFedBy, SceneStock } from './types';
export type { Layout, PlotDef, Slot, MoverDef, Prop, PropArgs, PropOut, FxKind, Driver, Band, Backdrop, BackdropCtx } from './layout';
export { scatter, row, weave, depthScale } from './layout';
