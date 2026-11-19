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
  /** M3 (optional): how hard the lever bites back, 0–1 (LeverState.bite), present only while feature 'sideEffects' is
   *  on and the bite is above zero. From 0.5 its side effect is drawn (heavier cars, a new road, another hall). */
  bite?: number;
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
  /** Optional: how built-up each EARLIER Industry is (sector id → 0–1). What it built still stands in this
   *  picture (the same country, later). Absent: earlier Industries are drawn as built. */
  heritage?: Record<string, number>;

  /* --- M2 (all optional: a view without them draws the M1 picture) --- */
  /** Clear skies now (SectorDerived.clear): the weather has gone; the sky takes its "clearing" look. */
  clear?: boolean;
  /** 0–1: clearYears / STEADY_STATE_YEARS. Brings the Steady State look in over the 50 years (replaces steadyProgress). */
  clearProgress?: number;
  /** 0–1: how far pressureFraction is above the clear level (clearP / collapseAt); 0 = at or below it. Haze thins by
   *  band as it falls. Absent: the haze follows pressureFraction (M1). */
  pressureToClear?: number;
  /** The Industry is settled: a calm idle, the style's "held" wash, a small emblem. */
  settled?: boolean;
  /** Calendar year it was settled (for the emblem), or null. */
  settledYear?: number | null;
  /** The founded Commons projects of this Industry (CommonsDef.sector), content order. Unknown icons get a civic hall. */
  commons?: SceneCommons[];
  /** The scene key of a landmark the Charter in force adds to this Industry's picture, or null. */
  landmark?: string | null;
  /** Events of this Industry (and the sector-less ones the scene reacts to) newer than the last ones the host passed
   *  in, ascending seq. The engine reacts to each seq once. Absent: the engine falls back to diffing views. */
  events?: SceneEvent[];

  /* --- M3 (all optional: absent = the M2 picture; each is absent while its feature is off) --- */
  /** Steam's seam ladder (feature 'seams'): ladder seams sunk (0…total), how many there are, and whether the next one
   *  can be reached now (cheap pumping reaches it). The original bed is always drawn above the ladder. */
  seams?: SceneSeams;
  /** Light's daily load (feature 'load'): 24 hourly loads normalised to the peak hour (each 0–1; hour 0 = midnight) and
   *  the load factor (mean / peak, 0–1). */
  load?: SceneLoad;
  /** Motion's travel (feature 'travel'). `speed` 0–1: how freely the traffic moves (v / free speed; 1 = empty roads,
   *  low = queues). `sprawl` 0–1: how far the suburbs have spread, from the lock-in stock (it stays when traffic thins).
   *  `sprawlShare` 0–1: the share of today's travel that is locked in. `freeSpeed` (optional): the free speed index
   *  (1 = the opening roads; above 1 = new roads built). */
  travel?: SceneTravel;
  /** Compute's "free at the point of use" (feature 'freeAtUse'): ids of founded applications whose users see a nil
   *  or flat price (the bill is paid elsewhere). */
  free?: { apps: string[] };
  /** Small figures to show in the picture: cast figure keys (CastDef.figure) of the writer of a pending dispatch
   *  addressed to this Industry (or to none), and 'proprietor' once the Proprietor's Day has happened. Unknown keys
   *  draw nothing. Absent or [] = nobody. */
  figures?: string[];
  /** 0–1: how often the proprietor checks his watch (decisions per hour after the Market against before); 0 or absent =
   *  he does not. */
  watch?: number;
}

export interface SceneCommons { id: string; icon: string; level: number; name: string }

/** M3: SceneView.seams. */
export interface SceneSeams { sunk: number; total: number; next: boolean }
/** M3: SceneView.load. */
export interface SceneLoad { hours: number[]; factor: number }
/** M3: SceneView.travel. */
export interface SceneTravel { speed: number; sprawl: number; sprawlShare: number; freeSpeed?: number }

/** A GameEvent as the scene sees it (plain JSON). M3: `first` and `label` are carried when the contract sets them. */
export interface SceneEvent { seq: number; kind: string; sector?: string; id?: string; n?: number; by?: string; first?: boolean; label?: string }

/** What a host can point at in the picture (SceneHandle.highlight). */
export type SceneTarget = { app: string } | { lever: string } | { commons: string } | null;

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
  /** Drawing detail. 'auto' (default): full, dropping to 'low' for the session if frames run long on screen.
   *  'low': fewer movers and live chimneys, one rain sheet, no signal noise. 'full': never drop. */
  detail?: 'auto' | 'low' | 'full';
  /** M2: the machines of an Industry changed generation (from SceneView.stage; fires once per change, not on a build
   *  or a switch of Industry). */
  onStage?(sectorId: string, stage: number): void;
}

export interface StillOptions {
  /** Output size in CSS pixels (default 600 × 400). The picture fills it (sliced to cover, centred). */
  width?: number;
  height?: number;
  /** 'svg' (default): an SVG string, self-contained (styles inlined, no animation). 'png': a Blob via a canvas. */
  format?: 'svg' | 'png';
  /** Device pixel ratio for 'png' (default 2). */
  scale?: number;
  /** Draw the style's plate (frame, title) (default true). */
  plate?: boolean;
}

export interface ReplayOptions {
  /** Total length in seconds (default 10). */
  seconds?: number;
  /** Called after the last frame. */
  onDone?(): void;
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
  /** Change the drawing detail at runtime (optional; see SceneOptions.detail). */
  setDetail?(d: 'auto' | 'low' | 'full'): void;
  /* --- M2 (optional on the handle so hosts can feature-test) --- */
  /** Point at a place (an application's landmark), a lever's sign of restraint or a Commons building; null clears.
   *  A soft ring and a lift; it stays until cleared or replaced. Returns false if the target is not in the picture. */
  highlight?(target: SceneTarget): boolean;
  /** Play a run back: each view drawn in turn over `seconds`, with no toasts or event moments; resolves at the end.
   *  update() calls are ignored while it plays; cancel with stopReplay(). */
  replay?(views: SceneView[], opts?: ReplayOptions): Promise<void>;
  stopReplay?(): void;
  /** Build another Industry's picture now, off screen (call when idle with sceneViewFrom(…, thatSector)), so switching
   *  to it later re-attaches a kept world instead of building one. Worlds are kept per Industry (at most six). */
  prebuild?(view: SceneView): void;
  /** The current picture as one self-contained SVG string (styles inlined, no animation): for "save picture". */
  toSVG?(opts?: StillOptions): string;
  /** The current one-paragraph text alternative. */
  describe(): string;
  destroy(): void;
}
