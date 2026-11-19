// Loops, bar lines, seams, trimming and levels for the DAW export. Pure: arrays in, arrays out (tested under bun).

export interface Voice { source: string; at: number; dur: number; grid: boolean }
export interface Tick { t: number; beat: number; tempo: number }

/** Shortest voice (s) that counts as an event: a train, a bell, a horn, a winding run. Shorter random hits (birds,
 *  drips, ticks) are texture: a crossfade passes over them without anyone hearing half of one. */
export const EVENT_MIN_S = 1.0;
/** A voice's room tail, counted as part of it when judging a seam (s). */
export const EVENT_TAIL_S = 0.3;

/** Bar lines (s) between `from` and `to`, from the engine's beat clock: beat counts that are multiples of `per`. */
export function barLines(ticks: readonly Tick[], from: number, to: number, per = 4): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < ticks.length; i++) {
    const a = ticks[i], b = ticks[i + 1];
    if (b.t < from || a.t > to) continue;
    for (let n = Math.floor(a.beat / per) + 1; n * per <= b.beat; n++) {
      const at = a.t + ((n * per - a.beat) * 60) / b.tempo;
      if (at >= from && at <= to && (!out.length || at - out[out.length - 1] > 1e-6)) out.push(at);
    }
  }
  return out;
}

/** The events (non-grid voices at least EVENT_MIN_S long) that would be heard in part across a loop of `len` seconds
 *  starting at `start` with a crossfade of `xf` seconds: anything sounding in [start, start + xf] (cut in at the head)
 *  or in [start + len, start + len + xf] (faded out across the wrap). */
export function seamCrossers(voices: readonly Voice[], start: number, len: number, xf: number, gated?: (source: string) => boolean): Voice[] {
  const hit = (v: Voice, a: number, b: number) => v.at < b && v.at + v.dur + EVENT_TAIL_S > a;
  return voices.filter((v) => !v.grid && v.dur >= EVENT_MIN_S && (!gated || gated(v.source)) && (hit(v, start, start + xf) || hit(v, start + len, start + len + xf)));
}

/** Choose the loop's start among bar lines: the first with no event across the seam, else the one with the fewest. */
export function pickStart(bars: readonly number[], voices: readonly Voice[], len: number, xf: number, gated?: (source: string) => boolean): { start: number; crossers: Voice[] } {
  let best: { start: number; crossers: Voice[] } | null = null;
  for (const b of bars) {
    const c = seamCrossers(voices, b, len, xf, gated);
    if (!c.length) return { start: b, crossers: [] };
    if (!best || c.length < best.crossers.length) best = { start: b, crossers: c };
  }
  return best ?? { start: bars[0] ?? 0, crossers: [] };
}

/** A loop of `len` frames from `start`: the first `xf` frames crossfade (equal power) from the material just after the
 *  loop's end into the head, so the last frame runs straight on into the first. Needs start + len + xf frames. */
export function crossfadeLoop(ch: Float32Array, start: number, len: number, xf: number): Float32Array {
  if (start + len + xf > ch.length) throw new Error('not enough material for the crossfade');
  const out = ch.slice(start, start + len);
  for (let i = 0; i < xf; i++) {
    const x = i / xf;
    out[i] = ch[start + i] * Math.sin((Math.PI / 2) * x) + ch[start + len + i] * Math.cos((Math.PI / 2) * x);
  }
  return out;
}

/** Trim a one-shot to its natural length: from the first frame above `onDb`, to the last above `offDb` plus `tail`
 *  seconds, with a short raised-cosine fade at the end. Returns null if nothing is above `onDb`. */
export function trimOneShot(chans: readonly Float32Array[], sr: number, onDb = -96, offDb = -84, tail = 0.08, fade = 0.02): Float32Array[] | null {
  const on = Math.pow(10, onDb / 20), off = Math.pow(10, offDb / 20);
  const n = chans[0].length;
  let a = -1, b = -1;
  for (let i = 0; i < n && a < 0; i++) for (const c of chans) if (Math.abs(c[i]) > on) { a = i; break; }
  if (a < 0) return null;
  for (let i = n - 1; i >= a && b < 0; i--) for (const c of chans) if (Math.abs(c[i]) > off) { b = i; break; }
  if (b < 0) b = a;
  const end = Math.min(n, b + Math.round(tail * sr));
  const f = Math.min(Math.round(fade * sr), end - a);
  return chans.map((c) => {
    const o = c.slice(a, end);
    for (let i = 0; i < f; i++) o[o.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / f);
    return o;
  });
}

/** Peak (linear) over all channels. */
export function peakOf(chans: readonly Float32Array[]): number {
  let p = 0;
  for (const c of chans) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > p) p = a; }
  return p;
}

/** RMS (linear) over all channels. */
export function rmsOf(chans: readonly Float32Array[]): number {
  let s = 0, n = 0;
  for (const c of chans) { for (let i = 0; i < c.length; i++) s += c[i] * c[i]; n += c.length; }
  return n ? Math.sqrt(s / n) : 0;
}

export const dbfs = (x: number) => (x > 1e-12 ? 20 * Math.log10(x) : -240);

/** Scale in place so the peak is at `db` dBFS (no-op on silence). Returns the gain applied. */
export function normalise(chans: Float32Array[], db = -1): number {
  const p = peakOf(chans);
  if (p < 1e-9) return 1;
  const g = Math.pow(10, db / 20) / p;
  for (const c of chans) for (let i = 0; i < c.length; i++) c[i] *= g;
  return g;
}
