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
  return {
    pace: clamp(fin(view?.pace), 0, 1), pressure, haze, reserve: clamp(fin(view?.reserveFraction, 1), 0, 1),
    pop: clamp(fin(view?.popFraction), 0, 1), stage: clamp(Math.round(fin(view?.stage)), 0, 3) / 3,
    built, empty: 1 - built, steady, clear, decoupling, stress: smooth(0.8, 1.0, pressure),
    apps, levers,
    seamsOn, depth,
    loadOn: hours ? 1 : 0, hourLoad: hours ? loadAt(hours, h) : 1, night: hours ? nightness(h) : 0, day: hours ? 1 - nightness(h) : 0,
    travelOn, congestion: travelOn ? clamp(1 - fin(tv!.speed, 1), 0, 1) : 0, sprawl: travelOn ? clamp(fin(tv!.sprawl), 0, 1) : 0,
    freeOn, freeShare: fTot ? (freeW / fTot) * Math.min(1, built * 1.4) : 0, paidShare: fTot ? (paidW / fTot) * Math.min(1, built * 1.4) : 0,
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

  const levers: Record<string, number> = {};
  for (const k of Object.keys(s.levers)) levers[k] = 1;
  const bites: Record<string, number> = {};
  for (const l of Array.isArray(view?.levers) ? view.levers : []) {
    if (!l || fin(l.level) < 1) continue;
    const b = clamp(fin((l as { bite?: number }).bite), 0, 1);
    if (b > 0) bites[String(l.kind)] = Math.max(bites[String(l.kind)] ?? 0, b);
  }

  const [t0, t1] = def.tempo;
  return {
    def: def.id,
    tempo: (t0 + (t1 - t0) * s.pace) * (frozen ? 0.5 : 1),
    // The smog takes the highs: two and a half octaves off the top at full pressure.
    air: clamp(def.air.bright * Math.pow(2, -2.4 * s.haze), 1100, 12000),
    thick: clamp(s.haze, 0, 1),
    wet: def.air.reverb * (1 + 0.6 * s.haze) * (frozen ? 1.4 : 1),
    world: frozen ? 0.08 : 1 - 0.3 * ending,
    stress: frozen ? 0 : s.stress,
    frozen,
    layers, traces, levers,
    bites,
    watch: frozen ? 0 : clamp(fin(view?.watch), 0, 1),
    ending,
    hour,
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
