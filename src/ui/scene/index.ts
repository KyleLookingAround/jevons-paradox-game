// Public surface of the scene engine. The main UI needs only these.
export { createScene, describeView, renderStill } from './engine';
export { sceneViewFrom, machineStage, sceneEvents, compactView } from './adapter';
export { MomentDesk } from './moments';
export { registerLayout, registerProps, hasLayout } from './registry';
export { SCENE_CSS, injectSceneCss, sceneCss } from './css';
// Additive (art-style layer): register a new Age's drawing style.
export { registerStyle, styleFor } from './styles/index';
export type { ArtStyle, PlateCtx } from './style';
export type { SceneView, SceneApp, SceneLever, SceneOptions, SceneHandle, AppStatus, SceneCommons, SceneEvent, SceneTarget, StillOptions, ReplayOptions } from './types';
export type { Layout, PlotDef, Slot, MoverDef, Prop, PropArgs, PropOut, FxKind, Driver, Band, Backdrop, BackdropCtx } from './layout';
export { scatter, row, weave, depthScale } from './layout';
