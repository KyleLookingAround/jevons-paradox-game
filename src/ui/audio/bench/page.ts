// Measurement harness (headless Chromium): renders soundscape states offline with OfflineAudioContext through the
// real engine, analyses the result, and draws spectrograms. Driven by ./run.mjs. Not part of the game bundle.
import { createSoundscape } from '../engine';
import { SOUNDSCAPES, registerSoundscape, type SoundscapeDef, type LayerDef } from '../defs';
import { demoView, runView, viewOf, preset, stockOf, type PresetName, type DemoStock } from '../views';
import type { SceneView } from '../../scene/types';
import type { SoundEventKind, SoundEventDetail, SoundscapeTap } from '../types';

const SR = 48000;

export interface Case {
  name: string;
  dur: number;
  /** View at time t (s). */
  view: (t: number) => SceneView | null;
  /** Interface events: [time, kind, sector?]. */
  events?: [number, SoundEventKind, string?, SoundEventDetail?][];
  /** Extra actions at times: [t, f(soundscape)]. */
  acts?: [number, (ss: ReturnType<typeof createSoundscape>) => void][];
  calm?: boolean;
  analyseFrom?: number;
  /** Export taps (dry, limiter, gates). */
  tap?: SoundscapeTap;
}

interface Rendered { l: Float32Array; r: Float32Array; ms: number }

async function renderCase(c: Case): Promise<Rendered> {
  const ctx = new OfflineAudioContext(2, Math.round(c.dur * SR), SR);
  const ss = createSoundscape({ context: ctx, calm: c.calm ?? false, clock: () => ctx.currentTime, ...(c.tap ? { tap: c.tap } : {}) });
  // Every action is attached to a render quantum; one suspend per quantum, all scheduled before rendering.
  const acts = new Map<number, (() => void)[]>();
  const put = (t: number, f: () => void) => { const q = Math.round((t * SR) / 128); const a = acts.get(q); if (a) a.push(f); else acts.set(q, [f]); };
  for (let k = 0; k * 0.1 < c.dur - 0.05; k++) {
    const t = k * 0.1;
    put(t, () => { const v = c.view(t); if (v) ss.update(v); });
  }
  for (const [et, kind, sector, det] of c.events ?? []) put(et, () => ss.event(kind, { ...(sector ? { sector } : {}), ...(det ?? {}) }));
  for (const [at, f] of c.acts ?? []) put(at, () => f(ss));
  for (let k = 0; k * 0.1 < c.dur - 0.05; k++) put(k * 0.1, () => ss.tick());
  for (const [q, fs] of acts) {
    if (q === 0) continue;
    void ctx.suspend((q * 128) / SR).then(() => { for (const f of fs) f(); void ctx.resume(); });
  }
  for (const f of acts.get(0) ?? []) f();
  const t0 = performance.now();
  const buf = await ctx.startRendering();
  const ms = performance.now() - t0;
  ss.destroy();
  return { l: buf.getChannelData(0), r: buf.getChannelData(1), ms };
}

/* ---------------- analysis ---------------- */

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar; im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar; im[i + k] += ai;
        const c2 = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = c2;
      }
    }
  }
}

const db = (x: number) => (x > 1e-12 ? 20 * Math.log10(x) : -240);

export interface Analysis {
  peakDb: number; rmsDb: number; crestDb: number; dc: number; clipped: number;
  centroidHz: number; bands: { sub200: number; low: number; mid: number; high6k: number }; // share of energy (0–1)
  clickMaxDb: number; clickAt: number; clicks: number; // HF transient detector: 5 ms windows above 15 kHz vs the median
  windowsDb: number[]; // RMS per 1 s window
  silentShare: number; // share of 100 ms windows below −70 dBFS
}

function analyse(l: Float32Array, r: Float32Array, from = 0): Analysis {
  const s0 = Math.round(from * SR);
  const n = l.length - s0;
  let pk = 0, ss = 0, sum = 0, clipped = 0;
  for (let i = s0; i < l.length; i++) {
    const a = Math.abs(l[i]), b = Math.abs(r[i]);
    pk = Math.max(pk, a, b); ss += l[i] * l[i] + r[i] * r[i]; sum += l[i] + r[i];
    if (a >= 0.999 || b >= 0.999) clipped++;
  }
  const rms = Math.sqrt(ss / (2 * n));
  // Spectrum: averaged 8192-point FFT frames of the mid channel.
  const N = 8192, mags = new Float64Array(N / 2);
  let frames = 0;
  for (let o = s0; o + N <= l.length; o += N) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = 0.5 * (l[o + i] + r[o + i]) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let k = 0; k < N / 2; k++) mags[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
  }
  let et = 0, ec = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0;
  for (let k = 1; k < N / 2; k++) {
    const f = (k * SR) / N, e = mags[k];
    et += e; ec += e * f;
    if (f < 200) b0 += e; else if (f < 2000) b1 += e; else if (f < 6000) b2 += e; else b3 += e;
  }
  et = et || 1;
  // Click detector: energy above ~15 kHz (a simple 4× cascaded one-pole high-pass) per 5 ms window.
  const hp = new Float32Array(n);
  let x1 = 0, y = [0, 0, 0, 0];
  const a = Math.exp((-2 * Math.PI * 15000) / SR);
  for (let i = 0; i < n; i++) {
    let v = 0.5 * (l[s0 + i] + r[s0 + i]);
    for (let s = 0; s < 4; s++) { const nv = a * (y[s] + v - (s === 0 ? x1 : 0)); if (s === 0) x1 = v; y[s] = nv; v = nv; }
    hp[i] = v;
  }
  const W = Math.round(0.005 * SR), wins: number[] = [];
  for (let o = 0; o + W <= n; o += W) { let e = 0; for (let i = 0; i < W; i++) e += hp[o + i] * hp[o + i]; wins.push(Math.sqrt(e / W)); }
  const sorted = wins.slice().sort((p, q) => p - q);
  const med = sorted[Math.floor(sorted.length / 2)] || 1e-9;
  const maxw = sorted[sorted.length - 1] || 0;
  const clickAt = Math.round((from + (wins.indexOf(maxw) * W) / SR) * 100) / 100;
  const clicks = wins.filter((w) => w > Math.max(med * 30, 1e-4)).length;
  const windowsDb: number[] = [];
  for (let o = s0; o + SR <= l.length; o += SR) { let e = 0; for (let i = 0; i < SR; i++) e += l[o + i] * l[o + i] + r[o + i] * r[o + i]; windowsDb.push(Math.round(db(Math.sqrt(e / (2 * SR))) * 10) / 10); }
  let silent = 0, tot = 0;
  for (let o = s0; o + SR / 10 <= l.length; o += SR / 10) { let e = 0; for (let i = 0; i < SR / 10; i++) e += l[o + i] * l[o + i]; tot++; if (db(Math.sqrt(e / (SR / 10))) < -70) silent++; }
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    peakDb: r1(db(pk)), rmsDb: r1(db(rms)), crestDb: r1(db(pk) - db(rms)), dc: Math.round((sum / (2 * n)) * 1e5) / 1e5, clipped,
    centroidHz: Math.round(ec / et), bands: { sub200: r1((100 * b0) / et) / 100, low: r1((100 * b1) / et) / 100, mid: r1((100 * b2) / et) / 100, high6k: r1((1000 * b3) / et) / 1000 },
    clickMaxDb: r1(db(maxw) - db(med)), clickAt, clicks, windowsDb, silentShare: tot ? Math.round((100 * silent) / tot) / 100 : 0,
  };
}

/* ---------------- spectrogram ---------------- */

function spectrogram(l: Float32Array, r: Float32Array, title: string, marks: [number, string][] = []): string {
  const W = 1000, H = 300, top = 22, N = 2048;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H + top + 16;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
  const img = g.createImageData(W, H);
  const len = l.length, fmin = 30, fmax = 16000;
  for (let x = 0; x < W; x++) {
    const o = Math.min(len - N, Math.floor((x / W) * (len - N)));
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = 0.5 * (l[o + i] + r[o + i]) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let yy = 0; yy < H; yy++) {
      const f = fmin * Math.pow(fmax / fmin, 1 - yy / H);
      const k = Math.max(1, Math.round((f * N) / SR));
      const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / (N / 4);
      const d = Math.max(0, Math.min(1, (db(m) + 125) / 85));
      const p = (yy * W + x) * 4;
      // magma-ish
      img.data[p] = Math.round(255 * Math.min(1, d * 1.6));
      img.data[p + 1] = Math.round(255 * Math.max(0, d * 1.4 - 0.45));
      img.data[p + 2] = Math.round(255 * (d < 0.5 ? d * 1.2 : Math.max(0, 1.2 - d)));
      img.data[p + 3] = 255;
    }
  }
  g.putImageData(img, 0, top);
  g.fillStyle = '#ddd'; g.font = '12px monospace';
  g.fillText(title, 6, 15);
  for (const f of [100, 200, 1000, 2000, 6000, 10000]) {
    const yy = top + H * (1 - Math.log(f / fmin) / Math.log(fmax / fmin));
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, yy, 8, 1);
    g.fillText(f >= 1000 ? `${f / 1000}k` : String(f), 10, yy + 4);
  }
  const dur = len / SR;
  for (const [t, label] of marks) { const x = (t / dur) * W; g.fillStyle = 'rgba(120,200,255,0.6)'; g.fillRect(x, top, 1, H); g.fillStyle = '#9cf'; g.fillText(label, x + 3, top + H + 13); }
  // Level trace (RMS per column) in green
  g.strokeStyle = '#6f6'; g.beginPath();
  for (let x = 0; x < W; x++) {
    const o = Math.floor((x / W) * len), w = Math.floor(len / W);
    let e = 0; for (let i = 0; i < w; i++) e += l[o + i] * l[o + i];
    const yy = top + H * (1 - Math.max(0, Math.min(1, (db(Math.sqrt(e / w)) + 70) / 70)));
    if (x) g.lineTo(x, yy); else g.moveTo(x, yy);
  }
  g.stroke();
  return cv.toDataURL('image/png');
}

/* ---------------- cases ---------------- */

const hold = (v: SceneView) => () => v;

function soloDef(sector: string, layer: LayerDef): SoundscapeDef {
  const d = SOUNDSCAPES[sector];
  const l = { ...layer, stages: undefined, level: { add: [['one', 1]] as [string, number][] } } as LayerDef;
  if (l.kind === 'hits') (l as { density?: unknown }).density = { add: [['one', 1]] };
  return { ...d, layers: [l], trace: [] };
}

/** FNV-1a over the float bytes of both channels: identical renders give identical hashes. */
function hashOf(l: Float32Array, r: Float32Array): string {
  let h = 0x811c9dc5;
  for (const ch of [l, r]) {
    const u = new Uint8Array(ch.buffer, ch.byteOffset, ch.byteLength);
    for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 0x01000193); }
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const api = {
  /** Export work: the exact render of a held preset (twice: the first warms the synthesis bank, so the second does
   *  not depend on how long synthesis took), hashed. Used to prove the live mix is unchanged by additive options. */
  async hash(sector: string, p: PresetName, dur = 14, events: [number, SoundEventKind][] = [], tap?: SoundscapeTap) {
    const c: Case = { name: `${sector}-${p}`, dur, tap, view: p ? hold(demoView(sector, p)) : () => null, events: events.map(([t, k]) => [t, k, sector] as [number, SoundEventKind, string]) };
    await renderCase(c);
    const out = await renderCase(c);
    const a = analyse(out.l, out.r, 0);
    return { hash: hashOf(out.l, out.r), rmsDb: a.rmsDb, peakDb: a.peakDb, l: out.l, r: out.r };
  },
  async preset(sector: string, p: PresetName, dur = 14, calm = false, img = false) {
    const c: Case = { name: `${sector}-${p}`, dur, view: hold(demoView(sector, p)), calm };
    const out = await renderCase(c);
    return { a: analyse(out.l, out.r, 3), ms: out.ms, png: img ? spectrogram(out.l, out.r, `${sector} · ${p}`) : null };
  },
  async run(sector: string, ending: 'collapse' | 'steady', dur = 60) {
    const c: Case = { name: `${sector}-run-${ending}`, dur, view: (t) => runView(sector, t / dur, ending) };
    const out = await renderCase(c);
    const marks: [number, string][] = ending === 'collapse' ? [[0.62 * 0.9 * dur, 'crisis'], [0.8 * 0.9 * dur, 'crisis'], [0.93 * dur, 'Reckoning']] : [[0.55 * dur, 'levers'], [0.64 * dur, 'decoupling'], [0.91 * dur, 'Steady State']];
    return { a: analyse(out.l, out.r, 2), ms: out.ms, png: spectrogram(out.l, out.r, `${sector} · a whole run to ${ending} in ${dur} s`, marks) };
  },
  async solo(sector: string, layerId: string, dur = 20) {
    const orig = SOUNDSCAPES[sector];
    const layer = orig.layers.find((l) => l.id === layerId)!;
    registerSoundscape(sector, soloDef(sector, layer));
    try {
      const out = await renderCase({ name: 'solo', dur, view: hold(demoView(sector, 'late')) });
      return { a: analyse(out.l, out.r, 3) };
    } finally { registerSoundscape(sector, orig); }
  },
  layers(sector: string) { return SOUNDSCAPES[sector].layers.map((l) => l.id); },
  async switchTabs(a: string, b: string) {
    const va = demoView(a, 'mid'), vb = demoView(b, 'mid');
    const out = await renderCase({ name: 'switch', dur: 16, view: (t) => (t < 5 ? va : t < 10 ? vb : va) });
    return { a: analyse(out.l, out.r, 3), png: spectrogram(out.l, out.r, `tab switch ${a} → ${b} (5 s) → ${a} (10 s)`, [[5, b], [10, a]]) };
  },
  async sells(sector: string, rate = 8, withWorld = true, dur = 5) {
    const ev: [number, SoundEventKind, string][] = [];
    for (let t = 1; t < dur - 0.5; t += 1 / rate) ev.push([t, 'sell', sector]);
    const v = demoView(sector, 'mid');
    const out = await renderCase({ name: 'sells', dur, view: withWorld ? hold(v) : () => null, events: ev });
    return { a: analyse(out.l, out.r, 0.9), png: spectrogram(out.l, out.r, `${sector} · sell ×${rate}/s ${withWorld ? 'over the world' : 'alone'}`) };
  },
  async uiEvent(sector: string, kind: SoundEventKind) {
    const out = await renderCase({ name: 'ui', dur: 6, view: () => null, events: [[0.2, kind, sector]] });
    return { a: analyse(out.l, out.r, 0), png: null as string | null };
  },
  async uiStrip(sector: string, kinds: SoundEventKind[]) {
    const ev: [number, SoundEventKind, string][] = [];
    let t = 0.2; const marks: [number, string][] = [];
    for (const k of kinds) { ev.push([t, k, sector]); marks.push([t, k]); t += k === 'reveal' || k === 'ageBegun' || k === 'reckoning' || k === 'steady' ? 5 : k === 'backfire' || k === 'crisis' || k === 'industryOpened' || k === 'found' ? 2.6 : 1.3; }
    const out = await renderCase({ name: 'uistrip', dur: t + 1, view: () => null, events: ev });
    return { png: spectrogram(out.l, out.r, `${sector} · interface sounds`, marks) };
  },
  async crisisMoment(sector: string) {
    const v = demoView(sector, 'late');
    const out = await renderCase({ name: 'crisis', dur: 16, view: (t) => (t < 4 ? v : { ...v, crises: v.crises + 1 }) });
    return { a: analyse(out.l, out.r, 3), png: spectrogram(out.l, out.r, `${sector} · the world's crisis at 4 s`, [[4, 'crisis']]) };
  },
  async heritage() {
    const v = viewOf('motion', { ...preset('motion', 'mid'), heritage: { steam: 1, light: 0.8 } });
    const w = demoView('motion', 'mid');
    const a = await renderCase({ name: 'h', dur: 12, view: hold(v) });
    const b = await renderCase({ name: 'h0', dur: 12, view: hold(w) });
    return { with: analyse(a.l, a.r, 3), without: analyse(b.l, b.r, 3) };
  },
  async levers(sector: string) {
    const v = viewOf(sector, { ...preset(sector, 'mid'), levers: ['duty', 'cap', 'sufficiency', 'substitution', 'circularity', 'greenSpending', 'deletion', 'reviewGate', 'sharedLibs'] });
    const out = await renderCase({ name: 'lv', dur: 60, view: hold(v) });
    return { a: analyse(out.l, out.r, 3) };
  },
  async perf(sector: string, n = 600) {
    // Main-thread cost of mixFrom + ramps (update) and the scheduler tick, on an offline context of 60 s.
    const ctx = new OfflineAudioContext(2, SR * 60, SR);
    let t = 0;
    const ss = createSoundscape({ context: ctx, clock: () => t });
    const ups: number[] = [], ticks: number[] = [];
    for (let i = 0; i < n; i++) {
      t = i * 0.1;
      const v = runView(sector, i / n, 'collapse');
      const a = performance.now(); ss.update(v); ups.push(performance.now() - a);
      const b = performance.now(); ss.tick(); ticks.push(performance.now() - b);
    }
    const st = ss.stats();
    ss.destroy();
    const q = (x: number[], p: number) => { const s = x.slice().sort((a, b) => a - b); return Math.round(s[Math.floor(p * (s.length - 1))] * 1000) / 1000; };
    return { updateMedian: q(ups, 0.5), updateP95: q(ups, 0.95), updateMax: q(ups, 1), tickMedian: q(ticks, 0.5), tickP95: q(ticks, 0.95), tickMax: q(ticks, 1), bufferSamples: st.bufferSamples, beds: st.beds };
  },
};

/* ---------------- M3 ---------------- */

const LIGHT_DAY = [0.2, 0.15, 0.12, 0.12, 0.15, 0.25, 0.45, 0.7, 0.8, 0.75, 0.7, 0.7, 0.72, 0.7, 0.68, 0.7, 0.8, 0.95, 1, 0.9, 0.7, 0.5, 0.35, 0.25];
/** The day curve rotated so that the engine's clock (which starts at 18:00) stands at `hour` when the render begins. */
const dayAt = (hours: number[], hour: number) => Array.from({ length: 24 }, (_, h) => hours[(((h - 18 + hour) % 24) + 24) % 24]);

const m3api = {
  LIGHT_DAY,
  /** A held state with M3 fields merged into a preset; `spec` true saves a spectrogram. */
  async state(sector: string, p: PresetName, extra: Partial<SceneView>, name: string, dur = 14, img = true, bites?: Record<string, number>) {
    const base = { ...demoView(sector, p), ...extra } as SceneView;
    if (bites) base.levers = base.levers.map((l) => ({ ...l, bite: bites[l.kind] ?? 0 }));
    const out = await renderCase({ name, dur, view: hold(base) });
    return { a: analyse(out.l, out.r, 3), png: img ? spectrogram(out.l, out.r, name) : null };
  },
  /** Light's day held at an hour (8 s, the clock moves ~3 h in that time; the rotated curve starts at `hour`). */
  async lightHour(hour: number, hours = LIGHT_DAY, dur = 8) {
    const v = { ...demoView('light', 'late'), load: { hours: dayAt(hours, hour), factor: 0.55 } } as SceneView;
    const out = await renderCase({ name: 'h', dur, view: hold(v) });
    return { a: analyse(out.l, out.r, 2) };
  },
  async lightDay(dur = 60) {
    const v = { ...demoView('light', 'late'), load: { hours: LIGHT_DAY, factor: 0.55 } } as SceneView;
    const out = await renderCase({ name: 'day', dur, view: hold(v) });
    const marks: [number, string][] = [[0, '18h'], [15, '0h'], [30, '6h'], [45, '12h']];
    return { a: analyse(out.l, out.r, 1), png: spectrogram(out.l, out.r, 'light · a day in a minute from dusk (late town, load curve with an evening peak)', marks) };
  },
  /** One interface moment alone, with detail. */
  async event(sector: string, kind: SoundEventKind, det: SoundEventDetail = {}, dur = 9) {
    const out = await renderCase({ name: 'ev', dur, view: () => null, events: [[0.2, kind, sector, det]] });
    return { a: analyse(out.l, out.r, 0) };
  },
  /** Moments over a bed: each at its time over the held `p` state; analysis of the bed alone and with. */
  async overBed(sector: string, p: PresetName, evs: [number, SoundEventKind, SoundEventDetail?][], dur: number, name: string, extra: Partial<SceneView> = {}) {
    const v = { ...demoView(sector, p), ...extra } as SceneView;
    const out = await renderCase({ name, dur, view: hold(v), events: evs.map(([t, k, d]) => [t, k, sector, d] as [number, SoundEventKind, string, SoundEventDetail | undefined]) });
    return { a: analyse(out.l, out.r, 2), png: spectrogram(out.l, out.r, name, evs.map(([t, k]) => [t, k] as [number, string])) };
  },
  /** The first ending over a held state: the credits bed for `dur` s, analysed from 10 s on (after the sting). */
  async ending(sector: string, p: PresetName, dur = 72, stopAt = 0) {
    const v = demoView(sector, p);
    const evs: [number, SoundEventKind, string][] = [[2, 'ending', sector]];
    if (stopAt) evs.push([stopAt, 'ledgerContinues', sector]);
    const out = await renderCase({ name: 'end', dur, view: hold(v), events: evs });
    return { a: analyse(out.l, out.r, 12), whole: analyse(out.l, out.r, 0), png: spectrogram(out.l, out.r, `${sector} · the first ending at 2 s (${p} world under the credits)${stopAt ? ', the ledger continues at ' + stopAt + ' s' : ''}`, evs.map(([t, k]) => [t, k] as [number, string])) };
  },
  /** What a change adds: renders the same held state with and without `extra`; returns the level of the difference
   *  (the added sound alone, since every source is seeded the same) and its spectrum. */
  async diff(sector: string, p: PresetName, extra: Partial<SceneView>, dur = 30, bites?: Record<string, number>) {
    const mk = (e: Partial<SceneView>) => { const v = { ...demoView(sector, p), ...e } as SceneView; if (bites && e === extra) v.levers = v.levers.map((l) => ({ ...l, bite: bites[l.kind] ?? 0 })); return v; };
    const base = extra.levers ? { levers: extra.levers } : {};
    const a = await renderCase({ name: 'a', dur, view: hold(mk(base)) });
    const b = await renderCase({ name: 'b', dur, view: hold(mk(extra)) });
    const l = new Float32Array(a.l.length), r = new Float32Array(a.l.length);
    for (let i = 0; i < l.length; i++) { l[i] = b.l[i] - a.l[i]; r[i] = b.r[i] - a.r[i]; }
    return { added: analyse(l, r, 3), base: analyse(a.l, a.r, 3) };
  },
  /** Sound turned off (the page: setEnabled(false), destroy) mid-scene: is the tail click-free? */
  async offMidway(sector: string) {
    const v = demoView(sector, 'late');
    const out = await renderCase({ name: 'off', dur: 8, view: (t) => (t < 5 ? v : null), acts: [[5, (ss) => { ss.setEnabled(false); ss.destroy(); }]] });
    return { a: analyse(out.l, out.r, 4), tail: analyse(out.l, out.r, 5.6) };
  },
};

/* ---------------- M4 ---------------- */

const fishView = (p: PresetName, st: DemoStock, extra: Partial<SceneView> = {}) => ({ ...demoView('fishing', p), ...extra, stock: stockOf(st) }) as unknown as SceneView;

const m4api = {
  /** A held Fishing state with a given stock. */
  async fish(p: PresetName, st: DemoStock, name: string, dur = 20, extra: Partial<SceneView> = {}) {
    const out = await renderCase({ name, dur, view: hold(fishView(p, st, extra)) });
    return { a: analyse(out.l, out.r, 3), png: spectrogram(out.l, out.r, name) };
  },
  /** The lying gauge, heard: the true stock falls 0.9 → 0.15 over `dur` while catch per trip (the gauge) stays high;
   *  the fleet keeps working. Then at 0.85·dur the threshold is crossed (the world's cut). */
  async decline(dur = 90) {
    const v = (t: number) => { const u = t / dur, truth = 0.9 - 0.8 * Math.min(1, u / 0.85); return fishView('late', { truth, reported: Math.pow(Math.max(truth, 0.3), 0.3), foreign: 0.3, crossed: u > 0.85, scar: u > 0.85 }); };
    const out = await renderCase({ name: 'decline', dur, view: v, events: [[0.85 * dur, 'thresholdCrossed', 'fishing']] });
    return { a: analyse(out.l, out.r, 2), png: spectrogram(out.l, out.r, `fishing · the true stock 0.9 → 0.1 over ${Math.round(0.85 * dur)} s, catch per trip still high; threshold crossed at ${Math.round(0.85 * dur)} s`, [[0.85 * dur, 'thresholdCrossed']]) };
  },
  /** The sea life alone (only the life layers), a held truth: its level, for the "gulls go quiet" check. */
  async lifeOnly(truth: number, scar = false, dur = 30) {
    const orig = SOUNDSCAPES.fishing;
    registerSoundscape('fishing', { ...orig, layers: orig.layers.filter((l) => l.life), trace: [] });
    try {
      const out = await renderCase({ name: 'life', dur, view: hold(fishView('late', { truth, scar })) });
      return { a: analyse(out.l, out.r, 3) };
    } finally { registerSoundscape('fishing', orig); }
  },
  /** The Board's Survey: the reveal at `at` over a held, thinned sea (truth 0.35). Life-only render too. */
  async reveal(at = 6, dur = 16, lifeOnly = false) {
    const orig = SOUNDSCAPES.fishing;
    if (lifeOnly) registerSoundscape('fishing', { ...orig, layers: orig.layers.filter((l) => l.life), trace: [] });
    try {
      const out = await renderCase({ name: 'reveal', dur, view: hold(fishView('late', { truth: 0.45 })), events: [[at, 'surveyed', 'fishing', { label: 'reveal' }]] });
      return { a: analyse(out.l, out.r, 1), png: spectrogram(out.l, out.r, `fishing · the Board's Survey at ${at} s (sea life lifted for 2 s; no sting)${lifeOnly ? ', sea life only' : ''}`, [[at, 'surveyReveal']]) };
    } finally { if (lifeOnly) registerSoundscape('fishing', orig); }
  },
  /** Healing: the scar lifts at `at` (truth 0.5): the sea life should come back over ~15 s, not at once. Life only. */
  async heal(at = 5, dur = 30) {
    const orig = SOUNDSCAPES.fishing;
    registerSoundscape('fishing', { ...orig, layers: orig.layers.filter((l) => l.life), trace: [] });
    try {
      const out = await renderCase({ name: 'heal', dur, view: (t) => fishView('late', { truth: 0.6, scar: t < at }) });
      return { a: analyse(out.l, out.r, 1), png: spectrogram(out.l, out.r, `fishing · sea life only: the scar heals at ${at} s (truth 0.6)`, [[at, 'scarHealed']]) };
    } finally { registerSoundscape('fishing', orig); }
  },
  /** Interface sound with detail, alone. */
  async event(sector: string, kind: SoundEventKind, det: SoundEventDetail = {}, dur = 9) {
    const out = await renderCase({ name: 'ev', dur, view: () => null, events: [[0.2, kind, sector, det]] });
    return { a: analyse(out.l, out.r, 0) };
  },
  /** A state with extra fields merged (fedBy, heritage, stock). */
  async state(sector: string, p: PresetName, extra: Record<string, unknown>, name: string, dur = 20) {
    const out = await renderCase({ name, dur, view: hold({ ...demoView(sector, p), ...extra } as unknown as SceneView) });
    return { a: analyse(out.l, out.r, 3), png: spectrogram(out.l, out.r, name) };
  },
  async diff(sector: string, p: PresetName, extra: Record<string, unknown>, dur = 30) {
    const a = await renderCase({ name: 'a', dur, view: hold(demoView(sector, p)) });
    const b = await renderCase({ name: 'b', dur, view: hold({ ...demoView(sector, p), ...extra } as unknown as SceneView) });
    const l = new Float32Array(a.l.length), r = new Float32Array(a.l.length);
    for (let i = 0; i < l.length; i++) { l[i] = b.l[i] - a.l[i]; r[i] = b.r[i] - a.r[i]; }
    return { added: analyse(l, r, 3), base: analyse(a.l, a.r, 3) };
  },
  /** A tab switch at 6 s: the crossfade dip. Each 1 s window through the fade is compared with the quieter of (the
   *  outgoing Industry held, same moment) and (the incoming Industry's ordinary quiet: the 20th-percentile 1 s window of
   *  its settled stretch, 11–16 s), so a slow swell or a beat between hammer blows is not counted as a dip. */
  async switchDip(a: string, b: string, p: PresetName = 'mid') {
    const va = demoView(a, p), vb = demoView(b, p);
    const out = await renderCase({ name: 'sw', dur: 16, view: (t) => (t < 6 ? va : vb) });
    const held = await renderCase({ name: 'held', dur: 16, view: hold(va) });
    const w = (x: Rendered, from: number, to: number) => { let e = 0, n = 0; for (let i = Math.round(from * SR); i < Math.round(to * SR); i++) { e += x.l[i] ** 2 + x.r[i] ** 2; n += 2; } return 10 * Math.log10(e / n + 1e-20); };
    const before = w(out, 3, 6), after = w(out, 11, 16);
    const bw: number[] = []; for (let t = 11; t + 1 <= 16; t += 0.25) bw.push(w(out, t, t + 1));
    bw.sort((x, y) => x - y);
    const bq = bw[Math.floor(0.2 * (bw.length - 1))];
    let lo = 0;
    for (let t = 5.5; t < 10.5; t += 0.25) lo = Math.min(lo, w(out, t, t + 1) - Math.min(w(held, t, t + 1), bq));
    return { before: Math.round(before * 10) / 10, after: Math.round(after * 10) / 10, dipDb: Math.round(lo * 10) / 10, a: analyse(out.l, out.r, 3), png: spectrogram(out.l, out.r, `tab switch ${a} → ${b} at 6 s`, [[6, b]]) };
  },
};

(window as unknown as { bench: typeof api; m3: typeof m3api }).bench = api;
(window as unknown as { m4: typeof m4api }).m4 = m4api;
(window as unknown as { m3: typeof m3api }).m3 = m3api;
document.title = 'audio bench ready';
