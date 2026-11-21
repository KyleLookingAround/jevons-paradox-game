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
  /** M5 (only in a Ministry; absent = false): the rival is lobbying against it now (RivalState.lobbying): a hoarding
   *  goes up by its sign. */
  lobbied?: boolean;
  /** M5: a raise of it is held up in court now (ChairState.litigation, until > time): a court notice on its sign. */
  litigated?: boolean;
  /** M5: a carve-out won by lobbying acts this Parliament (ChairState.carveOuts = parliament index). */
  carvedOut?: boolean;
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

  /* --- M4 (all optional: absent = the M3 picture; nothing new is drawn before its Industry or system) --- */
  /** On a feed SOURCE (Iron): the order book, per Industry it feeds now (SectorDerived.feeds): the target's id and the
   *  product of this Industry's feed factors into it (≤ 1; 0.85 = its machines 15% cheaper). Drawn as lettered wagons
   *  leaving the goods yard. */
  feeds?: SceneFeed[];
  /** On a FED Industry: each founded application of another Industry that feeds this one, and how far it is adopted
   *  (`share` 0–1). What it draws: Steam's second track and new engine house (Rails), iron hulls in the harbour (Ship
   *  plate), Light's steel gasholder frame (Girders), Fishing's iron trawlers (Ship plate) and cannery (Tinplate). */
  fedBy?: SceneFedBy[];
  /** Fishing's stock (SectorDerived.stock, 'renewable' only). THE RULE: the chart's stipple reads `reported` until
   *  `surveyed`, then `truth`; the living world (gulls, porpoises, surface shoals, boats out) always reads `truth`. */
  stock?: SceneStock;
  /** A capstoned Industry (opened settled at run start by the Act's ending): the year of that ending and whether it is
   *  in arrears now (the held wash withdraws and the smoke, or the empty water, returns). Drawn as an engraved cartouche
   *  "Settled {year}". */
  capstoned?: { year: number | null; arrears: boolean };
  /** The Industry plays as a Preview (SectorDerived.preview): a small "Preview" mark in the picture's corner. */
  preview?: boolean;

  /* --- M5 (all optional: absent = the M4 picture; nothing is drawn outside a Ministry) --- */
  /** In a Ministry (Derived.chair non-null): the picture is seen through the Ministry window (the frame).
   *  `opposition`: the government is in Opposition (ChairView.inOpposition): the curtains are half drawn. */
  chair?: SceneChair;
  /** The Industry is run by the rival (SectorDerived.rival: a chair Industry, or a capstoned one, in a Ministry). No
   *  survey stakes; the card offers no founding; a capstoned one carries Pryce's bunting. */
  rival?: boolean;
  /** Scene props of this Industry's loophole rungs now in use (LoopholeDef.prop of rungs with status 'used', or
   *  'drafting' after use; feature 'loopholes'): 'vans', 'fourByFours', 'borehole'. Unknown keys draw nothing. */
  exempt?: string[];
  /** Plenty's hidden flow (SectorDerived.water): water applied and consumed per second (acre-feet, rounded to three
   *  figures) and the return share r (0–1: the share of what is applied that soaks back). consumed = applied × (1 − r). */
  water?: SceneWater;
  /** The Industry is sealed while office is taken (Derived.office.sealed): its postcard is the sealed one. */
  sealed?: boolean;
}

/** M5: SceneView.chair. */
export interface SceneChair { opposition: boolean }
/** M5: SceneView.water. */
export interface SceneWater { applied: number; consumed: number; returnShare: number }

/** M4: SceneView.feeds. */
export interface SceneFeed { to: string; factor: number }
/** M4: SceneView.fedBy. */
export interface SceneFedBy { from: string; app: string; share: number }
/** M4: SceneView.stock (all fractions 0–1). */
export interface SceneStock {
  /** Catch per trip, (Q/K)^β: what the fleet reports. */
  reported: number;
  /** The true Q/K (SectorDerived.stock.world): for the world only, never a gauge. */
  truth: number;
  /** A survey is in force: the chart shows the truth; the survey vessel is at sea. */
  surveyed: boolean;
  /** The foreign fleets' share of the catch (0 without foreign fleets): pennant sails on the banks. */
  foreign: number;
  /** A scar lasts on the banks (meta.world.scars): blank grey water lettered "No fish found". */
  scar: boolean;
  /** The stock crossed below its threshold this run. */
  crossed: boolean;
  /** The quota is at its moratorium (its level's value is 0): the fleet is tied up in harbour. */
  moratorium: boolean;
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
  /** M3: a view with a pending Reckoning is drawn as the frozen scene: colour drained and the end named across it, as
   *  the live picture shows it (default false: the picture at rest, in colour). */
  frozen?: boolean;
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
  /** M5: Take office's thaw: the window frame enters and the picture goes from grey to colour in four steps, 350 ms
   *  apart (skipped under reduced motion). The scene also plays it on the page's document event `rebound:office` with
   *  detail 'thaw', so a host need not call it. */
  thaw?(): void;
  /** The current one-paragraph text alternative. */
  describe(): string;
  destroy(): void;
}
