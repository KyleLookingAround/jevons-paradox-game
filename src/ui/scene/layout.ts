// The authoring model. A scene = a Layout (data: where things go) + props (functions: what a thing looks like).
// See README.md in this folder for how to add an industry.
import { rng, hash, clamp, lerp } from './svg';

/** Things that move. Every one of these is a CSS animation in an "fx" layer, capped and pausable. */
export type FxKind =
  | 'smoke'   // chimney puffs drifting downwind (size = scale)
  | 'steam'   // white vapour (cooling towers, ships)
  | 'spin'    // markup rotates about its own (0,0): winding wheels, flywheels, windmill sails
  | 'rock'    // markup rocks ±a few degrees about its (0,0): beam engines, nodding donkeys
  | 'blink'   // markup blinks: LEDs, aircraft lights, typing dots
  | 'flow'    // markup is a path whose dashes run along it: packets on a cable
  | 'drift';  // markup drifts slowly to and fro: clouds

export interface PropArgs {
  /** Slot scale (perspective). Props use it to pick a hatch density that reads the same at every depth. */
  s: number;
  /** 0–1 variant, seeded from the slot. */
  v: number;
  /** Machine generation 0–3. */
  stage: number;
  /** Free width/size parameter from the slot (0 if none). */
  w: number;
  /** Free height parameter (0 if none). */
  h: number;
  /** Seeded generator for this slot. */
  r: () => number;
  /** `url(#…)` for a def of this scene instance. */
  u(id: string): string;
  /** Hatch pattern for this scale: `level` 0 = light, 1 = cross-hatch. */
  hatch(level?: 0 | 1): string;
  /** Overlay pass (e.g. lit windows drawn over a house of another plot). */
  overlay: boolean;
}

export interface PropOut {
  fx(kind: FxKind, x: number, y: number, size?: number, markup?: string): void;
}

export type Prop = (a: PropArgs, out: PropOut) => string;

export interface Slot {
  /** Prop key in the look's library (falls back to the generic library, then to 'works'). */
  p: string;
  x: number;
  y: number;
  /** Scale; default from the layout's depth curve at y. */
  s?: number;
  /** Multiplier on the depth-curve scale (ignored when s is given). */
  k?: number;
  /** 0–1 variant; default seeded. */
  v?: number;
  flip?: boolean;
  w?: number;
  h?: number;
  /** Draw in this band regardless of y. */
  band?: Band;
}

export interface MoverDef {
  p: string;
  x0: number; y0: number; x1: number; y1: number;
  /** Seconds per crossing at normal pace. */
  dur: number;
  /** How many of these at full adoption. */
  n: number;
  s?: number;
  /** Adoption at which the first one appears (default 0). */
  from?: number;
  band?: Band;
  w?: number;
  /** Depth (a y in viewBox units) at which it is drawn among the scenery: things nearer than this hide it. Default:
   *  the nearer end of its track. */
  z?: number;
}

/**
 * What drives a plot's density:
 *   'app'        an application (matched by icon/id): ghost → surveyed → founded, density = adoption;
 *   'population' houses, density = popFraction;
 *   'pressure'   clutter / sprawl, density = pressureFraction;
 *   'depletion'  spoil heaps and the like, density = 1 − reserveFraction;
 *   'reserve'    what is left, density = reserveFraction (Code: the few warm windows with a person in them);
 *   'light'      mean adoption of founded applications (Light's sky glow, lamps of any kind);
 *   'always'     scenery that is always there.
 */
export type Driver = 'app' | 'population' | 'pressure' | 'depletion' | 'reserve' | 'light' | 'always'
  /* M3 */
  | 'congestion'  // 1 − SceneView.travel.speed (queues on the road); 0 without travel
  | 'roads'       // new roads built: (travel.freeSpeed − 1) / 1.5; 0 without travel
  /* M4 */
  | 'fed'         // what another Industry's feeding application built here: the fedBy share of the apps in `match`
  | 'chart'       // the chart's stipple: stock.reported until stock.surveyed, then stock.truth (reserve without stock)
  | 'world'       // the living sea (gulls, porpoises, surface shoals): stock.truth, always (reserve without stock)
  | 'boats'       // boats out: the fleet's activity (mean adoption) scaled by the true stock; 0 while tied up
  | 'tied'        // the fleet tied up in harbour: 1 at a moratorium or a failed bank (crossed and the stock low)
  | 'foreign'     // foreign sails: stock.foreign / 0.6
  | 'surveyed'    // the survey vessel and its track: 1 while stock.surveyed
  | 'scar'        // blank grey water on the chart: 1 while a scar lasts
  | 'crises'      // crisis marks that stay for the run: slot i shows once crises > i (density crises / slots)
  /* M5 */
  | 'exempt'      // the exempt thing of a loophole in use: 1 while any key in `match` is in SceneView.exempt
  | 'returnFlow'   // Plenty's water soaking back: returnShare / 0.5 (1 without water)
  | 'consumedFlow'; // Plenty's water used up (vapour off the crop): 0.3 at r = 0.5 rising to 1 at r ≤ 0.08 (0.3 without water)

export interface PlotDef {
  key: string;
  /** Application icon keys or ids this plot serves (driver 'app'). */
  match?: string[];
  driver?: Driver;
  /** The first thing built (an app's landmark). Drawn once founded; its ghost hints at it before. */
  anchor?: Slot;
  /** Further props in the order they appear as density rises. */
  slots: Slot[];
  /** Use another plot's slot positions (same seeds) with this plot's prop: lit windows over houses. */
  overlayOf?: string;
  /** Prop for overlay slots. */
  overlayProp?: string;
  movers?: MoverDef[];
  /** Tap target [x, y, w, h] in viewBox units (driver 'app' only). */
  hit?: [number, number, number, number];
  /** Survey stakes [x, y, w, h] (default: a band at the bottom of hit). */
  site?: [number, number, number, number];
  /** Density curve exponent: count = n × density^curve (default 0.6, so early growth shows). */
  curve?: number;
  /** Slots stay in the picture when off and fade (a light going out) instead of vanishing. */
  fade?: boolean;
  /** M3: lit by the hour of Light's day (SceneView.load): the density is scaled by the load at the clock's hour. */
  byHour?: boolean;
  /** M3: sprawl that stays: with SceneView.travel the density is at least travel.sprawl (it does not fall with use). */
  sprawl?: boolean;
  /** M5: no ghost while not founded (a use only Pryce's Ministry brings: nothing hints at it before). */
  noGhost?: boolean;
}

export type Band = 'far' | 'mid' | 'near';

export interface BackdropCtx {
  u(id: string): string;
  hatch(s: number, level?: 0 | 1): string;
  r: () => number;
  stage: number;
  /** How built-up each earlier Industry is (0–1), from SceneView.heritage; see geography.ts `built()`. */
  heritage?: Record<string, number>;
  /** M3: the length of the seam ladder when SceneView.seams is present (draw the strata; the engine toggles them by
   *  the `sm:<i>` keys of props/strata.ts), else absent. */
  seams?: number;
}

export interface Backdrop {
  sky?: string;
  far?: string;
  mid?: string;
  near?: string;
  /** Ground cut-away strip under the scene (reserve seams, oil, code strata). */
  cut?: string;
  /** Emitters for backdrop scenery (e.g. far chimneys), global coordinates. */
  fx?: { kind: FxKind; x: number; y: number; size?: number; markup?: string; band: Band }[];
}

export interface Layout {
  id: string;
  /** Art style id (see style.ts / styles/): the drawing idiom of this place's Age. 'generic' follows the page look. */
  look: string;
  /** A caption the style may letter on or under the picture (plate legend, poster title). */
  caption?: string;
  /** One line describing the place, for the text alternative ("a coal valley"). */
  place: string;
  backdrop(c: BackdropCtx): Backdrop;
  plots: PlotDef[];
  /** Rectangles for applications whose icon no plot matches: a generic works grows there. */
  spares: [number, number, number, number][];
  /** Lever kind → where its sign of restraint stands. '*' = positions for unknown kinds. */
  restraint: Record<string, Slot>;
  restraintSpare?: Slot[];
  /** y at which far ends and mid begins, and mid ends and near begins. */
  bands?: [number, number];
  /** Depth curve: scale at the horizon and at the front. */
  depth?: [number, number, number, number]; // [yFar, sFar, yNear, sNear]
  /** Optional: what the reserve looks like here, for the text alternative ("one warm window left"). */
  reserveWords?(reserveFraction: number): string;
  /** M2: civic sites for the Commons, in the order projects take them (default: every third house of the town). */
  commons?: Slot[];
  /** M2: where a Charter's landmark stands (default: the last civic site). */
  landmark?: Slot;
  /** Birds / clear-sky movers for Steady State (optional). */
  steadyMovers?: MoverDef[];
  /* --- M3 (all optional) --- */
  /** Where Light's day clock (the load medallion) hangs: [x, y, radius] in viewBox units. */
  dial?: [number, number, number];
  /** Where the cast stand (foreground figures, in order of arrival): x, y (feet), scale (default 1; a figure is about
   *  30 units tall at 1). */
  figures?: { x: number; y: number; s?: number; flip?: boolean }[];
  /** Free at the point of use: where the bill is paid (a hoarding the free halls are cabled to). The price plates
   *  stand by each application's landmark. */
  bill?: Slot;
  /** Levers that bite back: lever kind → where its side effect appears ('*' = any other kind); the slot's prop is
   *  drawn (hidden until the bite reaches 0.5). */
  bite?: Record<string, Slot>;
  /* --- M4 (all optional) --- */
  /** Crisis names by crisis number (1-based; index 0 = the first crisis) when an Industry's crises differ (Iron: The
   *  Orange Night, then The Slag Slide); default: SceneView.crisisName for every crisis. */
  crisisNames?: string[];
  /** The chart (Fishing): where its shoals lie, for the survey's drain [x, y, w, h] (the plot keyed 'shoals' is the
   *  stipple). */
  chart?: [number, number, number, number];
  /** Where the survey vessel puts out from and to (the 'surveyed' moment): [x0, y0, x1, y1]. */
  surveyRun?: [number, number, number, number];
  /** Postcard crop [x, y, w, h] of the 600 × 400 picture (default: the middle 3:2 of the land). */
  card?: [number, number, number, number];
}

/* ------------------------------------------------------------------ */
/* Authoring helpers: generate slot lists deterministically             */
/* ------------------------------------------------------------------ */

export function depthScale(l: Pick<Layout, 'depth'>, y: number): number {
  const [y0, s0, y1, s1] = l.depth ?? [190, 0.42, 372, 1];
  return lerp(s0, s1, clamp((y - y0) / (y1 - y0), 0, 1));
}

export interface ScatterOpts {
  /** Order by distance from this point (the place grows outward from its heart). Default: rect centre. */
  from?: [number, number];
  /** Minimum spacing in x and y (default 14, 6). */
  gap?: [number, number];
  /** Scale multiplier on top of the depth curve. */
  k?: number;
  flip?: boolean | 'random';
  w?: [number, number];
  band?: Band;
}

/** n props scattered in a rectangle with rejection spacing, ordered from the heart outward. */
export function scatter(p: string | string[], rect: [number, number, number, number], n: number, seed: string, o: ScatterOpts = {}): Slot[] {
  const r = rng(hash(seed));
  const [x, y, w, h] = rect;
  const [gx, gy] = o.gap ?? [14, 6];
  const pts: Slot[] = [];
  let tries = 0;
  while (pts.length < n && tries < n * 60) {
    tries++;
    const px = x + r() * w, py = y + r() * h;
    if (pts.some((q) => Math.abs(q.x - px) < gx * (0.5 + (py - y) / Math.max(1, h)) && Math.abs(q.y - py) < gy)) continue;
    const key = Array.isArray(p) ? p[Math.floor(r() * p.length)] : p;
    const sl: Slot = { p: key, x: px, y: py, v: r() };
    if (o.k) sl.k = o.k;
    if (o.flip === 'random') sl.flip = r() < 0.5; else if (o.flip) sl.flip = true;
    if (o.w) sl.w = lerp(o.w[0], o.w[1], r());
    if (o.band) sl.band = o.band;
    pts.push(sl);
  }
  const [fx, fy] = o.from ?? [x + w / 2, y + h / 2];
  pts.sort((a, b) => Math.hypot(a.x - fx, (a.y - fy) * 2) - Math.hypot(b.x - fx, (b.y - fy) * 2));
  return pts;
}

/** n props along a line from (x0, y0) to (x1, y1), evenly spaced with a little jitter, ordered from `from` (0–1). */
export function row(p: string | string[], x0: number, y0: number, x1: number, y1: number, n: number, seed: string, from = 0.5, o: ScatterOpts = {}): Slot[] {
  const r = rng(hash(seed));
  const out: (Slot & { t: number })[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const j = (r() - 0.5) * 0.3 / Math.max(1, n);
    const key = Array.isArray(p) ? p[i % p.length] : p;
    const sl: Slot & { t: number } = { p: key, x: lerp(x0, x1, t + j), y: lerp(y0, y1, t + j), v: r(), t };
    if (o.k) sl.k = o.k;
    if (o.flip === 'random') sl.flip = r() < 0.5; else if (o.flip) sl.flip = true;
    if (o.w) sl.w = lerp(o.w[0], o.w[1], r());
    if (o.band) sl.band = o.band;
    out.push(sl);
  }
  out.sort((a, b) => Math.abs(a.t - from) - Math.abs(b.t - from));
  return out.map(({ t: _t, ...s }) => s);
}

/** Interleave several slot lists (so two streets fill together rather than one after the other). */
export function weave(...lists: Slot[][]): Slot[] {
  const out: Slot[] = [];
  const m = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < m; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}
