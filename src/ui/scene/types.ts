// Scene engine — public data types.
//
// A SceneView is a plain, serialisable snapshot of what the landscape should show. It is built from the contract
// (Content + GameState + Derived) by sceneViewFrom() in ./adapter.ts and holds no game rules: every field is either
// read straight from the contract or is a cosmetic mapping of it (a 0–1 fraction, a visual stage).

export type AppStatus = 'hidden' | 'available' | 'founded';

export interface SceneApp {
  id: string;
  name: string;
  /** ApplicationDef.icon: picks the place in the layout. Unknown keys get a spare plot and a generic works. */
  icon: string;
  blurb: string;
  status: AppStatus;
  /** 0–1 (AppDerived.adoption). Drives density: more buildings, more trains, more lit windows. */
  adoption: number;
  /** AppDerived.demand, service per second (shown in the card only). */
  demand: number;
  foundCost: number;
  canFound: boolean;
  /** capital / foundCost, 0–1, for the card's progress fill. */
  affordFraction: number;
  /** ApplicationDef.visibleBelow (the service price it becomes thinkable at), null if always visible. */
  visibleBelow: number | null;
}

export interface SceneLever {
  id: string;
  /** LeverKind ('duty', 'cap', 'sufficiency', 'substitution', …). Unknown kinds get a generic notice board. */
  kind: string;
  level: number;
  name: string;
}

export interface SceneView {
  sectorId: string;
  sectorName: string;
  /** Page look key ('ledger', 'gaslight', 'chrome', 'terminal', 'agentic'); unknown → generic styling. */
  look: string;
  serviceName: string;
  serviceUnit: string;
  resourceName: string;
  pressureName: string;
  crisisName: string;
  resourceKind: 'stock' | 'flow';
  /** Content order. */
  apps: SceneApp[];
  /** Machine generation, 0–3 (Newcomen → Watt → high-pressure → turbine hall, and the equivalents elsewhere). */
  stage: number;
  etaFold: number;
  rFold: number;
  /** 0–1: how hard the place is running (from rFold). Smoke, traffic speed. */
  pace: number;
  /** 0–1: reserve / reserveMax ('stock') or 1 − utilisation ('flow'). */
  reserveFraction: number;
  /** P / collapseAt, 0–1+ : weather and light, never a bar. */
  pressureFraction: number;
  nextCrisisFraction: number | null;
  population: number;
  /** 0–1 cosmetic mapping of population (houses). */
  popFraction: number;
  /** Crises fired so far in this sector (an increase plays the crisis moment). */
  crises: number;
  /** Levers of this sector in force (level ≥ 1). */
  levers: SceneLever[];
  decoupling: boolean;
  /** 0–1 progress of the decoupling streak towards Steady State. */
  steadyProgress: number;
  /** This sector reached Steady State this run. */
  steady: boolean;
  /** A pending Reckoning stops the world. `here` = it was caused by this sector. */
  reckoning: { cause: string; here: boolean } | null;
  year: number | null;
}

export interface SceneOptions {
  /** A place was tapped (or cleared with null). The scene changes no game state. */
  onSelect?(appId: string | null): void;
  /** The card's "Found" button. The host calls model.foundApp. */
  onFound?(appId: string): void;
  /** Force reduced motion on/off; default follows prefers-reduced-motion. */
  reducedMotion?: boolean;
  /** Render the scene's own caption/card under the picture. Default true. */
  card?: boolean;
  /** Money formatter for the card (default "£1.2k"). */
  money?(n: number): string;
  /** Number formatter for the card (default 1.23k style). */
  num?(n: number): string;
}

export interface SceneHandle {
  /** Patch in place; cheap to call 10×/s. Rebuilds only when sector, layout, look, stage or the app list changes. */
  update(view: SceneView): void;
  /** Tell the scene the selected sector changed (clears the selection; next update rebuilds). */
  setSector(id: string): void;
  /** Select a place programmatically (null clears). */
  select(appId: string | null): void;
  /** Override reduced motion at runtime (null = follow the media query). */
  setReducedMotion(on: boolean | null): void;
  /** The current one-paragraph text alternative. */
  describe(): string;
  destroy(): void;
}
