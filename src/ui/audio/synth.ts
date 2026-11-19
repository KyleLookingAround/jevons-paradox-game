// Pure DSP for synthesising one-shot buffers in plain JavaScript (no Web Audio): deterministic given a seed, testable
// under `bun test`, and cheap on the audio thread afterwards (a transient is then one buffer source and one gain).
// Buffers are made at BUF_SR (24 kHz): the context resamples on playback, and nothing in this soundscape wants
// energy above 12 kHz anyway (no harsh highs by construction).

export const BUF_SR = 24000;

export type Rng = () => number;

/** mulberry32: small, fast, good enough for musical variation. */
export function rngFrom(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string, for seeding per name. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export const buf = (sec: number, sr = BUF_SR): Float32Array => new Float32Array(Math.max(1, Math.round(sec * sr)));
const TAU = Math.PI * 2;

/* ---------------- noise ---------------- */

export function white(n: number, rng: Rng): Float32Array {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = rng() * 2 - 1;
  return x;
}

/** Pink-ish noise (Paul Kellet's economy filter), roughly ±1. */
export function pink(n: number, rng: Rng): Float32Array {
  const x = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    x[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
  return x;
}

/** Brown noise (leaky integrator), roughly ±1. */
export function brown(n: number, rng: Rng): Float32Array {
  const x = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) { y = (y + 0.02 * (rng() * 2 - 1)) * 0.998; x[i] = y * 3.5; }
  return x;
}

/* ---------------- filters ---------------- */

export type FMode = 'lp' | 'bp' | 'hp';

/** Topology-preserving state-variable filter (Zavalishin), in place. `f` may be a function of the sample index
 *  (coefficients are refreshed every 16 samples). Bandpass output is normalised to unity peak gain. */
export function svf(x: Float32Array, mode: FMode, f: number | ((i: number) => number), q = 0.707, sr = BUF_SR): Float32Array {
  let ic1 = 0, ic2 = 0, g = 0, k = 1 / q, a1 = 0, a2 = 0, a3 = 0;
  const set = (fc: number) => {
    const c = Math.min(Math.max(fc, 10), sr * 0.45);
    g = Math.tan((Math.PI * c) / sr);
    a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2;
  };
  const fn = typeof f === 'function' ? f : null;
  set(fn ? fn(0) : (f as number));
  for (let i = 0; i < x.length; i++) {
    if (fn && (i & 15) === 0) set(fn(i));
    const v0 = x[i];
    const v3 = v0 - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    x[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 * k : v0 - k * v1 - v2;
  }
  return x;
}

/** One-pole DC blocker, in place. */
export function dcBlock(x: Float32Array): Float32Array {
  let px = 0, py = 0;
  for (let i = 0; i < x.length; i++) { const y = x[i] - px + 0.995 * py; px = x[i]; py = y; x[i] = y; }
  return x;
}

/* ---------------- oscillators ---------------- */

export type Wave = 'sine' | 'tri' | 'saw' | 'square';

function blep(t: number, dt: number): number {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

/** A band-limited oscillator; `f` (Hz) may be a function of the sample index. */
export function osc(n: number, f: number | ((i: number) => number), wave: Wave = 'sine', phase = 0, sr = BUF_SR): Float32Array {
  const x = new Float32Array(n);
  let p = phase;
  let tri = 0;
  const fn = typeof f === 'function' ? f : null;
  for (let i = 0; i < n; i++) {
    const fr = fn ? fn(i) : (f as number);
    const dt = Math.min(fr / sr, 0.49);
    let v: number;
    if (wave === 'sine') v = Math.sin(TAU * p);
    else if (wave === 'saw') v = 2 * p - 1 - blep(p, dt);
    else {
      let sq = p < 0.5 ? 1 : -1;
      sq += blep(p, dt);
      sq -= blep((p + 0.5) % 1, dt);
      if (wave === 'square') v = sq;
      else { tri = dt * sq * 4 + (1 - dt * 0.5) * tri; v = tri; }
    }
    x[i] = v;
    p += dt; if (p >= 1) p -= 1;
  }
  return x;
}

/* ---------------- envelopes and utilities ---------------- */

/** Multiply by an attack (linear, seconds) and an exponential decay reaching −60 dB at `d` seconds after the peak. */
export function envAD(x: Float32Array, a: number, d: number, sr = BUF_SR, at = 0): Float32Array {
  const na = Math.max(1, Math.round(a * sr)), s0 = Math.round(at * sr);
  const k = Math.log(1000) / Math.max(1e-3, d * sr);
  for (let i = 0; i < x.length; i++) {
    const j = i - s0;
    if (j < 0) { x[i] = 0; continue; }
    x[i] *= j < na ? j / na : Math.exp(-(j - na) * k);
  }
  return x;
}

/** Multiply by a piecewise-linear envelope given as [seconds, value] points (held after the last point). */
export function envPts(x: Float32Array, pts: [number, number][], sr = BUF_SR): Float32Array {
  let k = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / sr;
    while (k < pts.length - 1 && t > pts[k + 1][0]) k++;
    const [t0, v0] = pts[k];
    const [t1, v1] = pts[Math.min(k + 1, pts.length - 1)];
    const v = t <= t0 ? (k === 0 ? v0 : v0) : t1 > t0 ? v0 + ((v1 - v0) * (t - t0)) / (t1 - t0) : v1;
    x[i] *= t >= pts[pts.length - 1][0] ? pts[pts.length - 1][1] : v;
  }
  return x;
}

/** Fade the edges so every buffer starts and ends at exactly zero (no click on start or stop). */
export function fade(x: Float32Array, inMs = 1.5, outMs = 12, sr = BUF_SR): Float32Array {
  const ni = Math.min(x.length >> 1, Math.round((inMs / 1000) * sr));
  const no = Math.min(x.length >> 1, Math.round((outMs / 1000) * sr));
  for (let i = 0; i < ni; i++) x[i] *= i / ni;
  for (let i = 0; i < no; i++) x[x.length - 1 - i] *= i / no;
  x[0] = 0; x[x.length - 1] = 0;
  return x;
}

export function peak(x: Float32Array): number {
  let m = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; }
  return m;
}

export function rms(x: Float32Array): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, x.length));
}

/** Scale to a target peak. */
export function norm(x: Float32Array, target = 0.8): Float32Array {
  const p = peak(x);
  if (p > 1e-9) { const g = target / p; for (let i = 0; i < x.length; i++) x[i] *= g; }
  return x;
}

/** dst[at + i] += src[i] × g (clipped to dst). */
export function add(dst: Float32Array, src: Float32Array, at = 0, g = 1): Float32Array {
  const s0 = Math.round(at);
  for (let i = Math.max(0, -s0); i < src.length && s0 + i < dst.length; i++) dst[s0 + i] += src[i] * g;
  return dst;
}

export function mul(x: Float32Array, g: number): Float32Array {
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

/** Gentle tanh saturation (keeps peaks below 1). */
export function soft(x: Float32Array, drive = 1.5): Float32Array {
  const n = Math.tanh(drive);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / n;
  return x;
}

/** Sum of exponentially decaying sines (modal synthesis): bells, metal, wood, glass. Partials: [ratio, amp, decay s]. */
export function modal(n: number, f0: number, partials: [number, number, number][], sr = BUF_SR, rng?: Rng): Float32Array {
  const x = new Float32Array(n);
  for (const [ratio, amp, dec] of partials) {
    const f = f0 * ratio;
    if (f >= sr * 0.45) continue;
    const w = (TAU * f) / sr;
    const k = Math.exp(-Math.log(1000) / Math.max(1e-3, dec * sr));
    // Rotating phasor: cheap, stable.
    const ph = rng ? rng() * TAU : 0;
    let c = Math.cos(ph), s = Math.sin(ph), e = amp;
    const cw = Math.cos(w), sw = Math.sin(w);
    for (let i = 0; i < n; i++) {
      x[i] += s * e;
      const c2 = c * cw - s * sw;
      s = s * cw + c * sw; c = c2;
      e *= k;
      if (e < 1e-5) break;
    }
  }
  return x;
}

/** Karplus–Strong plucked string. `bright` 0–1 (excitation colour), `sustain` seconds to −60 dB. */
export function pluck(n: number, f: number, sustain: number, bright: number, rng: Rng, sr = BUF_SR): Float32Array {
  const x = new Float32Array(n);
  const L = Math.max(2, Math.round(sr / f));
  const line = new Float32Array(L);
  let lp = 0;
  for (let i = 0; i < L; i++) { const w = rng() * 2 - 1; lp += (w - lp) * (0.2 + 0.8 * bright); line[i] = lp; }
  // Per-period loss so the note falls 60 dB in `sustain` seconds.
  const fb = Math.pow(0.001, L / Math.max(1, sustain * sr));
  let idx = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const cur = line[idx];
    const avg = 0.5 * (cur + prev) * fb;
    prev = cur;
    line[idx] = avg;
    x[i] = cur;
    idx = (idx + 1) % L;
  }
  return dcBlock(x);
}

/** A seeded index permutation, for round-robin variation that never repeats a pattern recognisably. */
export function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
