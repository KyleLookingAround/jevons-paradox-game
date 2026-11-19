// Offline rendering for the DAW export, through the real engine (createSoundscape with an OfflineAudioContext), driven
// as the measurement bench drives it: the view and the scheduler tick every 0.1 s at exact render quanta (each a
// suspend of the offline context), so the same settings always give the same audio. Browser only.
//
// The engine is asked for its export taps (SoundscapeOptions.tap): gates for stems, a dry room, a log of voices and of
// its beat clock, and the master limiter bypassed. The limiter is then applied as a second pass (the same
// DynamicsCompressorNode, set as the engine sets it, over the same signal), because Chromium's in-graph limiter did not
// repeat exactly from render to render while a lone one does.
import { createSoundscape, LIMITER } from '../engine';
import { obtain, attach, detach, unpin } from '../synthq';
import type { Job } from '../jobs';
import { SOUNDSCAPES, soundscapeFor, paletteFor, type HitsDef } from '../defs';
import { UI_KINDS, MOTIFS, hasRecipe } from '../recipes';
import { mixFrom } from '../mix';
import type { SceneView } from '../../scene/types';
import type { SoundEventKind, SoundEventDetail, SoundscapeTap } from '../types';
import { SR, loopLength } from './naming';
import { barLines, pickStart, crossfadeLoop, type Voice, type Tick } from './loop';

export class Cancelled extends Error { constructor() { super('cancelled'); } }

export interface Pass {
  sector: string;
  /** Seconds to render. */
  dur: number;
  view: (t: number) => SceneView | null;
  /** Interface moments: [time s, kind, detail]. */
  events?: [number, SoundEventKind, SoundEventDetail?][];
  /** Which sources sound (default: all). Gating changes nothing else in the render. */
  gate?: (source: string) => boolean;
  dry?: boolean;
  variant?: number;
  seed?: number;
  /** Apply the game's master limiter (as heard). Stems are rendered without it, so that they sum. */
  limiter: boolean;
  signal?: AbortSignal;
  /** 0–1 as the render proceeds. */
  onProgress?: (f: number) => void;
}

export interface Rendered { chans: Float32Array[]; voices: Voice[]; ticks: Tick[]; ms: number }

const STEP = 0.1;   // s: the page drives update() and the scheduler at 10 Hz, as the game does

const yieldNow = () => new Promise<void>((r) => setTimeout(r, 0));

/** One offline render. */
export async function render(p: Pass): Promise<Rendered> {
  if (p.signal?.aborted) throw new Cancelled();
  const frames = Math.max(128, Math.round(p.dur * SR));
  const ctx = new OfflineAudioContext(2, frames, SR);
  const voices: Voice[] = [], ticks: Tick[] = [];
  const tap: SoundscapeTap = {
    limiter: false, dry: !!p.dry, variant: p.variant,
    onVoice: (v) => voices.push(v),
    onTick: (v) => { ticks.push({ t: v.t, beat: v.beat, tempo: v.tempo }); },   // one Industry per render: one graph
  };
  if (p.gate) { const g = p.gate; tap.gate = (s) => (g(s) ? 1 : 0); }
  const ss = createSoundscape({ context: ctx, calm: false, clock: () => ctx.currentTime, tap, ...(p.seed != null ? { seed: p.seed } : {}) });
  const acts = new Map<number, (() => void)[]>();
  const put = (t: number, f: () => void) => { const q = Math.round((t * SR) / 128); const a = acts.get(q); if (a) a.push(f); else acts.set(q, [f]); };
  const steps = Math.ceil((p.dur - 0.05) / STEP);
  for (let k = 0; k < steps; k++) { const t = k * STEP; put(t, () => { const v = p.view(t); if (v) ss.update(v); }); }
  for (const [et, kind, det] of p.events ?? []) put(et, () => ss.event(kind, { sector: p.sector, ...(det ?? {}) }));
  for (let k = 0; k < steps; k++) put(k * STEP, () => ss.tick());
  let abort: (() => void) | null = null;
  const aborted = new Promise<never>((_, rej) => { abort = () => rej(new Cancelled()); });
  const onAbort = () => abort?.();
  p.signal?.addEventListener('abort', onAbort);
  for (const [q, fs] of acts) {
    if (q === 0) continue;
    const at = (q * 128) / SR;
    if (q * 128 >= frames) continue;
    void ctx.suspend(at).then(() => {
      if (p.signal?.aborted) return;          // left suspended: the render is abandoned
      for (const f of fs) f();
      p.onProgress?.(at / p.dur);
      void ctx.resume();
    }).catch(() => {});
  }
  for (const f of acts.get(0) ?? []) f();
  const t0 = performance.now();
  try {
    const buf = await Promise.race([ctx.startRendering(), aborted]);
    const ms = performance.now() - t0;
    let chans: Float32Array[] = [buf.getChannelData(0), buf.getChannelData(1)];
    if (p.limiter) chans = await limit(chans);
    return { chans, voices, ticks, ms };
  } finally {
    p.signal?.removeEventListener('abort', onAbort);
    try { ss.destroy(); } catch { /* ignore */ }
  }
}

/** The game's master limiter over a rendered signal (the second pass). */
export async function limit(chans: Float32Array[]): Promise<Float32Array[]> {
  const n = chans[0].length;
  const ctx = new OfflineAudioContext(chans.length, n, SR);
  const b = ctx.createBuffer(chans.length, n, SR);
  chans.forEach((c, i) => b.copyToChannel(c as Float32Array<ArrayBuffer>, i));
  const src = ctx.createBufferSource(); src.buffer = b;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = LIMITER.threshold; lim.knee.value = LIMITER.knee; lim.ratio.value = LIMITER.ratio; lim.attack.value = LIMITER.attack; lim.release.value = LIMITER.release;
  src.connect(lim); lim.connect(ctx.destination); src.start(0);
  const out = await ctx.startRendering();
  return chans.map((_, i) => out.getChannelData(i));
}

/* ---------------- synthesis ahead of rendering ---------------- */

const LEVER_KINDS = ['duty', 'cap', 'sufficiency', 'substitution', 'circularity', 'greenSpending', 'deletion', 'reviewGate', 'sharedLibs'];
const VARIANTS: Record<string, number> = { sell: 6, buy: 3 };

/** Every buffer an Industry's world and interface can ask for (recipes, noise beds, the room). */
export function jobsFor(sector: string, look?: string, seed = 0x5eed): Job[] {
  const def = soundscapeFor(sector), key = def.key, pal = paletteFor(sector, look);
  const out: Job[] = [];
  const r = (name: string, v = 0) => out.push({ t: 'recipe', name, key, v, seed });
  for (const l of def.layers) if (l.kind === 'hits') for (let v = 0; v < (l.variants ?? 1); v++) r(l.recipe, v);
  for (const d of Object.values(SOUNDSCAPES)) if (d.id !== def.id) for (const id of d.trace) {
    const l = d.layers.find((x) => x.id === id);
    if (l && l.kind === 'hits') for (let v = 0; v < ((l as HitsDef).variants ?? 1); v++) out.push({ t: 'recipe', name: (l as HitsDef).recipe, key: d.key, v, seed });
  }
  r(def.crisis.recipe); r('fogSwell'); r('watchTick', 0); r('watchTick', 1);
  for (const k of LEVER_KINDS) r(def.levers?.[k] ?? (hasRecipe(`lv.${k}`) ? `lv.${k}` : 'lv.generic'));
  for (const k of UI_KINDS) {
    if (k === 'seam') { for (let v = 0; v < 4; v++) r('seamSink', v); continue; }
    for (let v = 0; v < (VARIANTS[k] ?? 1); v++) r(`ui:${pal}:${k}`, v);
  }
  for (const fam of Object.keys(MOTIFS)) r(`ui:${pal}:motif.${fam}`);
  for (const col of ['pink', 'white', 'brown'] as const) out.push({ t: 'noise', col, seed });
  out.push({ t: 'impulse', sr: SR, dur: 1.7, seed });
  return out;
}

let held = 0;
/** Keep the synthesis bank alive for the export (it is released two minutes after the last soundscape goes). */
export function holdBank(on: boolean): void {
  if (on) { if (held++ === 0) attach(null); }
  else if (held > 0 && --held === 0) detach(null);
}

/** Synthesise ahead (in the synthesis worker where there is one) and pin, so renders find everything ready and the
 *  page never waits on synthesis inside a render step. */
export async function prewarm(jobs: Job[], signal?: AbortSignal, onProgress?: (done: number, of: number) => void): Promise<() => void> {
  let done = 0;
  await Promise.all(jobs.map((j) => new Promise<void>((res) => {
    const fin = () => { done++; onProgress?.(done, jobs.length); res(); };
    const b = obtain(j, { pin: true, cb: () => fin() });
    if (b) fin();
  })));
  if (signal?.aborted) throw new Cancelled();
  await yieldNow();
  return () => unpin(jobs);
}

/* ---------------- passages: a held state, cut to a loop ---------------- */

export type Content = 'all' | 'noevents' | 'beds';
export const PREROLL_S = 12;   // the world settles: layers ramp in, the tempo glides to its target, the room fills
export const SEARCH_S = 40;    // bar lines tried as the loop's start, looking for a seam no event crosses
export const XFADE_S = 2;      // crossfade from just past the loop's end into its head

export interface Passage {
  sector: string;
  view: SceneView;
  bpm: number;
  /** 'seamless': whole bars, crossfaded, no event across the seam; 'crossfaded': whole bars and crossfaded but an event
   *  crosses the seam (or the state itself moves); 'excerpt': a straight cut of the length asked for. */
  mode: 'seamless' | 'crossfaded' | 'excerpt';
  bars: number;
  /** Frames: where the loop starts in the render, its length, the crossfade. */
  start: number; len: number; xf: number;
  /** Seconds to render to have all of it. */
  dur: number;
  crossers: string[];
  reason: string;
  content: Content;
}

/** The source filter for a loop's content. */
export function contentGate(sector: string, content: Content): ((src: string) => boolean) | undefined {
  if (content === 'all') return undefined;
  const kindOf = (src: string): string | null => {
    let def = soundscapeFor(sector), id = src;
    if (src.startsWith('trace:')) { const [, s, l] = src.split(':'); def = SOUNDSCAPES[s] ?? def; id = l; }
    const l = def.layers.find((x) => x.id === id);
    if (!l) return null;
    return l.kind === 'bed' ? 'bed' : (l as HitsDef).grid ? 'grid' : 'event';
  };
  return (src) => { const k = kindOf(src); return k === 'bed' || (content === 'noevents' && k === 'grid'); };
}

/** The tempo the world settles at in a held view (bpm). */
export function tempoOf(sector: string, view: SceneView): number {
  return mixFrom(view, soundscapeFor(sector), { calm: false, ending: 0 }).tempo;
}

/** Lay out a passage before rendering: its length in bars (or seconds) and how long to render. */
export function layOut(sector: string, view: SceneView, target: number, seamless: boolean, content: Content): Passage {
  const bpm = tempoOf(sector, view);
  if (!seamless) {
    const len = Math.round(target * SR);
    return { sector, view, bpm, mode: 'excerpt', bars: 0, start: Math.round(PREROLL_S * SR), len, xf: 0, dur: PREROLL_S + target + 0.1, crossers: [], reason: 'a straight excerpt, not made to loop', content };
  }
  const L = loopLength(target, bpm);
  return { sector, view, bpm, mode: 'seamless', bars: L.bars, start: 0, len: L.frames, xf: Math.round(XFADE_S * SR), dur: PREROLL_S + SEARCH_S + L.seconds + XFADE_S + 0.2, crossers: [], reason: '', content };
}

/** Choose where the loop starts from the first render of a passage (the voices and the beat clock it logged). */
export function settle(p: Passage, r: Rendered): Passage {
  if (p.mode === 'excerpt') return p;
  const bars = barLines(r.ticks, PREROLL_S, PREROLL_S + SEARCH_S);
  const gate = contentGate(p.sector, p.content);
  const pick = pickStart(bars, r.voices, p.len / SR, p.xf / SR, gate);
  const crossers = [...new Set(pick.crossers.map((v) => v.source))];
  const moving = !!p.view.load;
  const start = Math.round(pick.start * SR);
  if (!bars.length) return { ...p, start: Math.round(PREROLL_S * SR), mode: 'crossfaded', crossers, reason: 'no beat clock to align to' };
  if (moving) return { ...p, start, mode: 'crossfaded', crossers, reason: "Light's day moves through the loop (the hour at the end is not the hour at the start)" };
  if (crossers.length) return { ...p, start, mode: 'crossfaded', crossers, reason: `an event crosses the seam (${crossers.join(', ')}): whole bars and crossfaded, but not seamless` };
  return { ...p, start, mode: 'seamless', crossers: [], reason: `whole bars at ${Math.round(p.bpm * 10) / 10} bpm, ${XFADE_S} s equal-power crossfade, no event across the seam` };
}

/** Seconds to render once the start is chosen (later passes of the same passage stop there: a render's opening is
 *  the same whatever its length). */
export const needed = (p: Passage) => (p.start + p.len + p.xf) / SR + 0.1;

/** Cut a render to the passage (crossfaded when it is a loop). */
export function cut(p: Passage, chans: Float32Array[]): Float32Array[] {
  if (p.mode === 'excerpt') return chans.map((c) => c.slice(p.start, p.start + p.len));
  return chans.map((c) => crossfadeLoop(c, p.start, p.len, p.xf));
}
