// Public surface of the scene engine. The main UI needs only these.
export { createScene, describeView } from './engine';
export { sceneViewFrom, machineStage } from './adapter';
export { registerLayout, registerProps, hasLayout } from './registry';
export { SCENE_CSS, injectSceneCss } from './css';
export type { SceneView, SceneApp, SceneLever, SceneOptions, SceneHandle, AppStatus } from './types';
export type { Layout, PlotDef, Slot, MoverDef, Prop, PropArgs, PropOut, FxKind, Driver, Band, Backdrop, BackdropCtx } from './layout';
export { scatter, row, weave, depthScale } from './layout';
