// Synthesis jobs: everything the soundscape renders in plain JavaScript (recipes, the looping noise beds, the room's
// impulse), as one pure function of a job description. The same function runs in the synthesis worker (./worker.ts,
// off the main thread) and, where no worker can be made, on the main thread in idle time; the results are identical
// because every job is seeded.
import { render } from './recipes';
import { BUF_SR, rngFrom, hash, pink, white, brown } from './synth';
import type { Key } from './music';

export type Job =
  | { t: 'recipe'; name: string; key: Key; v: number; seed: number }
  | { t: 'noise'; col: 'pink' | 'white' | 'brown'; seed: number }
  | { t: 'impulse'; sr: number; dur: number; seed: number };

export interface JobResult { chans: Float32Array[]; sr: number }

/** The cache id of a job (also its seed's salt for recipes, so the id fixes the sound). */
export function jobId(j: Job): string {
  if (j.t === 'recipe') return `${j.name}|${j.key.root.toFixed(2)}${j.key.mode}|${j.v}|${j.seed}`;
  if (j.t === 'noise') return `noise:${j.col}|${j.seed}`;
  return `impulse:${j.sr}|${j.dur}|${j.seed}`;
}

export function runJob(j: Job): JobResult {
  if (j.t === 'recipe') {
    const id = `${j.name}|${j.key.root.toFixed(2)}${j.key.mode}|${j.v}`;
    return { chans: [render(j.name, { rng: rngFrom(j.seed ^ hash(id)), key: j.key, v: j.v })], sr: BUF_SR };
  }
  if (j.t === 'noise') {
    const n = Math.round(6.7 * BUF_SR), r = rngFrom(j.seed ^ hash(j.col));
    const x = j.col === 'pink' ? pink(n, r) : j.col === 'white' ? white(n, r) : brown(n, r);
    // Crossfade the loop seam.
    const m = Math.round(0.25 * BUF_SR);
    for (let i = 0; i < m; i++) { const a = i / m; x[i] = x[i] * a + x[n - m + i] * (1 - a); }
    return { chans: [x.slice(0, n - m)], sr: BUF_SR };
  }
  // A generated room: a darkening noise tail, decorrelated left and right. Made at half the context rate (a convolver
  // resamples its buffer; the tail is low-passed anyway), which halves the work and the convolution's length.
  const sr = Math.round(j.sr / 2), n = Math.round(j.dur * sr);
  const chans: Float32Array[] = [];
  for (let ch = 0; ch < 2; ch++) {
    const r = rngFrom(j.seed ^ (0x1e + ch)), d = new Float32Array(n);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const a = Math.min(1, t / 0.012) * Math.exp(-t * 3.6);
      const k = Math.min(1, (0.5 * Math.exp(-t * 2.2) + 0.04) * 2);   // the tail darkens (coefficient at half rate)
      lp += ((r() * 2 - 1) - lp) * k;
      d[i] = lp * a;
    }
    chans.push(d);
  }
  return { chans, sr };
}
