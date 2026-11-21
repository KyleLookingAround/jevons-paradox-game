// mixFrom: the pure mapping from a SceneView to what the soundscape should be doing. No Web Audio, no clock, no
// randomness: the same view always gives the same mix, and it is tested under `bun test`. The engine only ramps the
// graph towards it.
import type { SceneView } from '../scene/types';
import type { Mix, LayerMix } from './types';
import type { SoundscapeDef, Drive, Src, LayerDef } from './defs';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const fin = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const smooth = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

/** The numbers every Drive can read, from one view. */
export interface Sources {
  pace: number; pressure: number; haze: number; reserve: number; pop: number; stage: number;
  built: number; empty: number; steady: number; clear: number; decoupling: number; stress: number;
  apps: Record<string, number>;
  levers: Record<string, number>;
  /* --- M3: each 0 (or neutral) when its SceneView field is absent, so a feature that is off is never heard --- */
  /** Steam's seams: 1 when the ladder is shown; depth = seams sunk / total (0–1). */
  seamsOn: number; depth: number;
  /** Light's day: 1 with a load curve; the load at the sound's hour (0–1; 1 = neutral when absent); how much of the
   *  night it is (0 by day, 1 in the small hours; 0 when absent); how much of the day (the reverse; 0 when absent). */
  loadOn: number; hourLoad: number; night: number; day: number;
  /** Motion's travel: 1 when shown; congestion = 1 − speed; sprawl (stays when traffic thins). 0 when absent. */
  travelOn: number; congestion: number; sprawl: number;
  /** Compute's "free at the point of use": 1 when shown; the founded uses' adoption-weighted share that is free and
   *  that is paid at the till (both scaled by how built the place is; 0 when absent). */
  freeOn: number; freeShare: number; paidShare: number;
  /* --- M4: Fishing's stock (0 or neutral when SceneView.stock is absent; see M4View) --- */
  /** 1 when the stock is shown. */
  stockOn: number;
  /** The sea life (gulls, porpoises, shoals), 0–1, from the TRUE stock (`stock.truth`, never `reported`), thinned while
   *  the scar holds. Without `stock` it follows reserveFraction (which the contract keeps true for a renewable). */
  life: number;
  /** The fleet is tied up, 0–1: a moratorium, or the banks failed and the boats stopped (crossed with the pace gone). */
  tied: number;
  /** The fleet at work, 0–1: how built the port is, times (1 − tied). Never reads the stock: it sounds normal until it
   *  ties up. */
  fleet: number;
  /** 1 under a moratorium. */
  moratorium: number;
  /** The foreign share of the catch, 0–1 (their sails, their engines), silent under a moratorium. */
  foreign: number;
  /* --- M5 (0 or neutral when absent; see M5View) --- */
  /** Plenty: the spray, 0–1, from the return share (1 when absent): the pivot's hiss thins to drips as it falls. */
  spray: number;
  /** 1 in office (the Ministry room). */
  office: number;
  /** The props of loophole rungs in use (SceneView.exempt: 'vans', 'fourByFours', 'borehole') → 1. Read as 'exempt:<k>'. */
  exempt: Record<string, number>;
}

/**
 * M4 SceneView fields (scene/types.ts SceneStock, SceneFeed, SceneFedBy), read through this loose optional type so the
 * soundscape stays silent-safe with views from before M4, hand-made views and partial objects.
 */
export interface M4View {
  /** Fishing. The world (and so the sound) reads `truth`; the chart reads `reported` until `surveyed`. */
  stock?: { reported?: number; truth?: number; surveyed?: boolean; foreign?: number; scar?: boolean; crossed?: boolean; moratorium?: boolean } | null;
  /** Iron: the Industries it feeds. */
  feeds?: { to: string; factor: number }[] | null;
  /** A fed Industry: who feeds it, through which application, and how much. Iron's hammer is heard faintly under it. */
  fedBy?: { from: string; app: string; share: number }[] | null;
  capstoned?: { year: number; arrears: boolean } | null;
  preview?: boolean;
}
const m4 = (v: SceneView): M4View => (v ?? {}) as unknown as M4View;

/**
 * M5 SceneView fields (scene/types.ts SceneChair, SceneWater), read through this loose optional type so the sound stays
 * silent-safe with older, hand-made or partial views. Every one is absent outside office or outside Plenty.
 */
export interface M5View {
  /** In a Ministry (Derived.chair non-null), on every Industry's view; `opposition` draws the curtains. */
  chair?: { opposition?: boolean } | null;
  /** Earlier requested shapes, still read (the same meaning): `ministry.inOpposition`, or a top-level `inOpposition`. */
  ministry?: { inOpposition?: boolean } | null;
  inOpposition?: boolean;
  /** Plenty (SectorDerived.water): water applied and consumed, and the share that soaks back to the aquifer. */
  water?: { applied?: number; consumed?: number; returnShare?: number } | null;
  /** Props of the loophole rungs in use in this Industry ('vans', 'fourByFours', 'borehole'). */
  exempt?: string[];
}
const m5 = (v: SceneView): M5View => (v ?? {}) as unknown as M5View;

/** In office (1/0) and in Opposition (1/0), from whichever of the two shapes the view carries. */
export function officeOf(view: SceneView): { room: number; curtains: number } {
  const v = m5(view);
  const ch = v.chair && typeof v.chair === 'object' ? v.chair : null;
  const mi = v.ministry && typeof v.ministry === 'object' ? v.ministry : null;
  const room = ch || mi || typeof v.inOpposition === 'boolean' ? 1 : 0;
  return { room, curtains: room && (ch?.opposition === true || mi?.inOpposition === true || v.inOpposition === true) ? 1 : 0 };
}

function exemptOf(view: SceneView): Record<string, number> {
  const e = m5(view).exempt, out: Record<string, number> = {};
  if (Array.isArray(e)) for (const k of e) if (typeof k === 'string') out[k] = 1;
  return out;
}

/** M5: Plenty's return share mapped to the spray (1 = flood and pivot, half of it soaking back; 0 = drip at the floor).
 *  Absent: 1, so a view without the field hears the pivot as it is drawn. */
export function sprayFrom(r: unknown): number {
  return typeof r === 'number' && Number.isFinite(r) ? clamp((r - 0.1) / 0.32, 0, 1) : 1;
}

/** M5: the window. In office the valley is heard through glass (its air no brighter than this); with the curtains drawn,
 *  through cloth as well. Hz. */
export const WINDOW_AIR = 4200, CURTAIN_AIR = 1150;

/** The sea life from the true stock: silent near the threshold, full from about 70% of the natural size. */
export function lifeFrom(truth: number, scar: boolean): number {
  const t = clamp(fin(truth, 1), 0, 1);
  const x = clamp((t - 0.12) / 0.58, 0, 1);
  return Math.pow(x, 1.3) * (scar ? 0.35 : 1);
}

/** How much of the night it is at hour h (0–24): 1 from midnight to 4.30, dawn to 6.30, 0 by day, dusk from 19 to 22. */
export function nightness(h: number): number {
  const x = ((h % 24) + 24) % 24;
  if (x < 4.5) return 1;
  if (x < 6.5) return 1 - smooth(4.5, 6.5, x);
  if (x < 19) return 0;
  if (x < 22) return smooth(19, 22, x);
  return 1;
}

/** The load at hour h from 24 hourly loads (linear between hours; wraps). */
export function loadAt(hours: readonly number[], h: number): number {
  if (!hours.length) return 1;
  const n = hours.length, x = ((h % n) + n) % n, i = Math.floor(x), f = x - i;
  return clamp(fin(hours[i]) * (1 - f) + fin(hours[(i + 1) % n]) * f, 0, 1);
}

/** The hour the load curve peaks at (the first maximum). */
export function peakHourOf(hours: readonly number[]): number {
  let b = 0;
  for (let i = 1; i < hours.length; i++) if (fin(hours[i]) > fin(hours[b])) b = i;
  return b;
}

export function sourcesFrom(view: SceneView, hour?: number | null): Sources {
  const apps: Record<string, number> = {};
  let tot = 0, n = 0;
  for (const a of Array.isArray(view?.apps) ? view.apps : []) {
    const v = a?.status === 'founded' ? 0.25 + 0.75 * clamp(fin(a.adoption), 0, 1) : 0;
    if (a?.icon) apps[a.icon] = Math.max(apps[a.icon] ?? 0, v);
    if (a?.id) apps[a.id] = v;
    tot += a?.status === 'founded' ? 0.3 + 0.7 * clamp(fin(a.adoption), 0, 1) : 0;
    n++;
  }
  const levers: Record<string, number> = {};
  for (const l of Array.isArray(view?.levers) ? view.levers : []) if (l && fin(l.level) >= 1) levers[String(l.kind)] = 1;
  const pressure = clamp(fin(view?.pressureFraction), 0, 1.2);
  const steady = view?.steady ? 1 : 0;
  const decoupling = view?.decoupling ? 1 : 0;
  // The haze lifts with the decoupling streak; Steady State clears it.
  const clear = Math.max(steady, clamp(fin(view?.steadyProgress), 0, 1) * (decoupling ? 1 : 0.5));
  const haze = clamp(pressure * (1 - 0.6 * clear) * (decoupling ? 0.85 : 1), 0, 1.2);
  const built = n ? tot / n : 0;
  // M3 fields: every one optional and absent while its feature is off.
  const sm = view?.seams;
  const seamsOn = sm && typeof sm === 'object' ? 1 : 0;
  const depth = seamsOn ? clamp(fin(sm!.sunk) / Math.max(1, fin(sm!.total, 1)), 0, 1) : 0;
  const ld = view?.load;
  const hours = ld && Array.isArray(ld.hours) && ld.hours.length ? ld.hours : null;
  const h = hours ? (hour == null || !Number.isFinite(hour) ? peakHourOf(hours) : hour) : 0;
  const tv = view?.travel;
  const travelOn = tv && typeof tv === 'object' ? 1 : 0;
  const fr = view?.free;
  const freeOn = fr && typeof fr === 'object' && Array.isArray(fr.apps) ? 1 : 0;
  let freeW = 0, paidW = 0;
  if (freeOn) {
    const ids = new Set(fr!.apps.map(String));
    for (const a of Array.isArray(view.apps) ? view.apps : []) {
      if (a?.status !== 'founded') continue;
      const w = 0.3 + 0.7 * clamp(fin(a.adoption), 0, 1);
      if (ids.has(a.id) || ids.has(a.icon)) freeW += w; else paidW += w;
    }
  }
  const fTot = freeW + paidW;
  // M4: the stock. The sea life reads the truth; the fleet reads the port, and stops only when it ties up.
  const st = m4(view).stock;
  const stockOn = st && typeof st === 'object' ? 1 : 0;
  const truth = stockOn ? fin(st!.truth, fin(view?.reserveFraction, 1)) : fin(view?.reserveFraction, 1);
  const moratorium = stockOn && st!.moratorium ? 1 : 0;
  const pace0 = clamp(fin(view?.pace), 0, 1);
  const tied = Math.max(moratorium, stockOn && st!.crossed ? 1 - smooth(0.06, 0.25, pace0) : 0);
  return {
    pace: clamp(fin(view?.pace), 0, 1), pressure, haze, reserve: clamp(fin(view?.reserveFraction, 1), 0, 1),
    pop: clamp(fin(view?.popFraction), 0, 1), stage: clamp(Math.round(fin(view?.stage)), 0, 3) / 3,
    built, empty: 1 - built, steady, clear, decoupling, stress: smooth(0.8, 1.0, pressure),
    apps, levers,
    seamsOn, depth,
    loadOn: hours ? 1 : 0, hourLoad: hours ? loadAt(hours, h) : 1, night: hours ? nightness(h) : 0, day: hours ? 1 - nightness(h) : 0,
    travelOn, congestion: travelOn ? clamp(1 - fin(tv!.speed, 1), 0, 1) : 0, sprawl: travelOn ? clamp(fin(tv!.sprawl), 0, 1) : 0,
    freeOn, freeShare: fTot ? (freeW / fTot) * Math.min(1, built * 1.4) : 0, paidShare: fTot ? (paidW / fTot) * Math.min(1, built * 1.4) : 0,
    stockOn, life: lifeFrom(truth, !!(stockOn && st!.scar)), tied, fleet: clamp(built * 1.4 + 0.15 * pace0, 0, 1) * (1 - tied), moratorium,
    foreign: stockOn ? clamp(fin(st!.foreign), 0, 1) * (1 - moratorium) : 0,
    spray: sprayFrom(m5(view).water?.returnShare), office: officeOf(view).room, exempt: exemptOf(view),
  };
}

export function readSrc(s: Sources, src: Src): number {
  if (src.startsWith('inv:')) return 1 - readSrc(s, src.slice(4));
  if (src.startsWith('step')) {
    const c = src.indexOf(':');
    const t = Number(src.slice(4, c));
    // A step 0.04 wide centred just above t, so 'step0.5:reserve' is off at 0.48 and on at 0.52.
    return smooth(t, t + 0.04, readSrc(s, src.slice(c + 1)));
  }
  if (src.startsWith('app:')) return s.apps[src.slice(4)] ?? 0;
  if (src.startsWith('lever:')) return s.levers[src.slice(6)] ?? 0;
  if (src.startsWith('exempt:')) return s.exempt?.[src.slice(7)] ?? 0;
  if (src === 'one') return 1;
  const v = (s as unknown as Record<string, unknown>)[src];
  return typeof v === 'number' ? Math.min(1, v) : 0;
}

export function evalDrive(s: Sources, d: Drive): number {
  let v = 0;
  for (const [src, w] of d.add) v += w * readSrc(s, src);
  v = clamp(v, 0, d.max ?? 1.2);
  for (const [src, depth] of d.mul ?? []) v *= 1 - depth * (1 - readSrc(s, src));
  if (d.pow) v = Math.pow(Math.max(0, v), d.pow);
  return clamp(v, 0, d.max ?? 1.2);
}

export interface MixOptions {
  calm?: boolean;
  /** Light's day: the hour (0–24) the sound's clock stands at. Absent: the peak hour (calm, and stills). */
  hour?: number | null;
  /** 0–1: the first ending's credits holding the world (the engine ramps it in and out). */
  ending?: number;
}

/** The whole mix for a view under a soundscape definition. */
export function mixFrom(view: SceneView, def: SoundscapeDef, opt: MixOptions = {}): Mix {
  const hasLoad = !!(view?.load && Array.isArray(view.load.hours) && view.load.hours.length);
  const hour = hasLoad ? (opt.hour == null || !Number.isFinite(opt.hour) ? peakHourOf(view.load!.hours) : ((opt.hour % 24) + 24) % 24) : null;
  const s = sourcesFrom(view, hour);
  const ending = clamp(fin(opt.ending), 0, 1);
  if (ending > 0) {
    // The first ending: the air clears completely, the strain goes, the quiet comes back while the place still works.
    s.haze *= 1 - ending; s.stress *= 1 - ending; s.clear = Math.max(s.clear, ending); s.steady = Math.max(s.steady, ending);
    s.congestion *= 1 - 0.6 * ending;
  }
  const frozen = !!view?.reckoning;
  const calm = !!opt.calm;
  const stage = Math.round(s.stage * 3);
  const layers: Record<string, LayerMix> = {};
  for (const l of def.layers) layers[l.id] = layerMix(l, s, stage, frozen, calm);

  const traces: Record<string, number> = {};
  const h = view?.heritage;
  if (h && typeof h === 'object') for (const [k, v] of Object.entries(h)) if (k !== view.sectorId && fin(v) > 0) traces[k] = clamp(fin(v), 0, 1) * (1 - 0.5 * s.clear);
  // M4: an Industry fed by another hears it faintly (Iron's hammer under Steam's rails and Light's girders), whatever
  // the order of the tabs (heritage lists only earlier Industries).
  const fb = m4(view).fedBy;
  if (Array.isArray(fb)) for (const f of fb) {
    if (!f || typeof f.from !== 'string' || f.from === view.sectorId) continue;
    const lv = clamp(0.45 + 0.8 * clamp(fin(f.share), 0, 1), 0, 1) * (1 - 0.5 * s.clear);
    traces[f.from] = Math.max(traces[f.from] ?? 0, lv);
  }

  const levers: Record<string, number> = {};
  for (const k of Object.keys(s.levers)) levers[k] = 1;
  const bites: Record<string, number> = {};
  for (const l of Array.isArray(view?.levers) ? view.levers : []) {
    if (!l || fin(l.level) < 1) continue;
    const b = clamp(fin((l as { bite?: number }).bite), 0, 1);
    if (b > 0) bites[String(l.kind)] = Math.max(bites[String(l.kind)] ?? 0, b);
  }

  const [t0, t1] = def.tempo;
  // M5: from the Ministry the valley is heard through the window; in Opposition, through the curtains too.
  const of = officeOf(view);
  const win = of.curtains ? CURTAIN_AIR : of.room ? WINDOW_AIR : 12000;
  return {
    def: def.id,
    tempo: (t0 + (t1 - t0) * s.pace) * (frozen ? 0.5 : 1),
    // The smog takes the highs: two and a half octaves off the top at full pressure.
    air: Math.min(win, clamp(def.air.bright * Math.pow(2, -2.4 * s.haze), 1100, 12000)),
    thick: clamp(s.haze, 0, 1),
    wet: def.air.reverb * (1 + 0.6 * s.haze) * (frozen ? 1.4 : 1),
    world: (frozen ? 0.08 : 1 - 0.3 * ending) * (of.curtains ? 0.6 : of.room ? 0.85 : 1),
    stress: frozen ? 0 : s.stress,
    frozen,
    layers, traces, levers,
    bites,
    watch: frozen ? 0 : clamp(fin(view?.watch), 0, 1),
    ending,
    hour,
    room: of.room, curtains: of.curtains,
  };
}

function layerMix(l: LayerDef, s: Sources, stage: number, frozen: boolean, calm: boolean): LayerMix {
  let level = evalDrive(s, l.level);
  if (l.stages && !l.stages.includes(stage)) level = 0;
  let pitch = 1;
  if (l.pitch) { const [src, a, b] = l.pitch; pitch = a + (b - a) * readSrc(s, src); }
  if (l.mech) pitch *= frozen ? 0.85 : 1 + 0.04 * s.pace;
  let tone = 1;
  if (l.kind === 'bed' && l.tone) { const [src, a, b] = l.tone; tone = a + (b - a) * readSrc(s, src); }
  let density = 0;
  if (l.kind === 'hits') {
    density = l.density ? evalDrive(s, l.density) : level;
    if (level <= 0.001) density = 0;
    // Calmer: fewer of the random events; the pulse (engines, looms) keeps its beat, a little softer.
    if (calm && !l.grid) density *= 0.55;
    if (frozen) density *= 0.1;
    if (calm) level *= 0.8;
  }
  const out: LayerMix = { level, density, pitch, tone, blackout: !!l.blackout && !frozen && s.stress > 0.01 };
  // M5: grid.by slows a pulse in whole doublings (×1, ×2, ×4 …: the nearest power of two), so the stretched pattern
  // still repeats within whole bars (the export's seamless loops; the beat-locked feel).
  if (l.kind === 'hits' && l.grid?.by) { const [src, a, b] = l.grid.by; out.every = Math.pow(2, Math.round(Math.log2(Math.max(1, a + (b - a) * readSrc(s, src))))); }
  if (l.kind === 'hits' && l.variantBy && (l.variants ?? 1) > 1) out.variant = Math.round(clamp(readSrc(s, l.variantBy), 0, 1) * ((l.variants ?? 1) - 1));
  return out;
}

/** Changes between two views that the world plays as moments of its own (the picture plays them too). */
export interface ViewMoments { crisis: boolean; steadyReached: boolean; reckoningBegan: boolean; reckoningEnded: boolean }

export function momentsBetween(prev: SceneView | null, next: SceneView): ViewMoments {
  if (!prev || prev.sectorId !== next.sectorId) return { crisis: false, steadyReached: false, reckoningBegan: false, reckoningEnded: false };
  return {
    crisis: fin(next.crises) > fin(prev.crises),
    steadyReached: !!next.steady && !prev.steady,
    reckoningBegan: !!next.reckoning && !prev.reckoning,
    reckoningEnded: !next.reckoning && !!prev.reckoning,
  };
}
