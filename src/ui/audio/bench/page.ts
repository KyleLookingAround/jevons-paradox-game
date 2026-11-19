// Measurement harness (headless Chromium): renders soundscape states offline with OfflineAudioContext through the
// real engine, analyses the result, and draws spectrograms. Driven by ./run.mjs. Not part of the game bundle.
import { createSoundscape } from '../engine';
import { SOUNDSCAPES, registerSoundscape, type SoundscapeDef, type LayerDef } from '../defs';
import { demoView, runView, viewOf, preset, type PresetName } from '../views';
import type { SceneView } from '../../scene/types';
import type { SoundEventKind } from '../types';

const SR = 48000;

export interface Case {
  name: string;
  dur: number;
  /** View at time t (s). */
  view: (t: number) => SceneView | null;
  /** Interface events: [time, kind, sector?]. */
  events?: [number, SoundEventKind, string?][];
  calm?: boolean;
  analyseFrom?: number;
}

interface Rendered { l: Float32Array; r: Float32Array; ms: number }

async function renderCase(c: Case): Promise<Rendered> {
  const ctx = new OfflineAudioContext(2, Math.round(c.dur * SR), SR);
  const ss = createSoundscape({ context: ctx, calm: c.calm ?? false, clock: () => ctx.currentTime });
  // Every action is attached to a render quantum; one suspend per quantum, all scheduled before rendering.
  const acts = new Map<number, (() => void)[]>();
  const put = (t: number, f: () => void) => { const q = Math.round((t * SR) / 128); const a = acts.get(q); if (a) a.push(f); else acts.set(q, [f]); };
  for (let k = 0; k * 0.1 < c.dur - 0.05; k++) {
    const t = k * 0.1;
    put(t, () => { const v = c.view(t); if (v) ss.update(v); });
  }
  for (const [et, kind, sector] of c.events ?? []) put(et, () => ss.event(kind, sector ? { sector } : undefined));
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
  clickMaxDb: number; clicks: number; // HF transient detector: 5 ms windows above 15 kHz vs the median
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
  const clicks = wins.filter((w) => w > Math.max(med * 30, 1e-4)).length;
  const windowsDb: number[] = [];
  for (let o = s0; o + SR <= l.length; o += SR) { let e = 0; for (let i = 0; i < SR; i++) e += l[o + i] * l[o + i] + r[o + i] * r[o + i]; windowsDb.push(Math.round(db(Math.sqrt(e / (2 * SR))) * 10) / 10); }
  let silent = 0, tot = 0;
  for (let o = s0; o + SR / 10 <= l.length; o += SR / 10) { let e = 0; for (let i = 0; i < SR / 10; i++) e += l[o + i] * l[o + i]; tot++; if (db(Math.sqrt(e / (SR / 10))) < -70) silent++; }
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    peakDb: r1(db(pk)), rmsDb: r1(db(rms)), crestDb: r1(db(pk) - db(rms)), dc: Math.round((sum / (2 * n)) * 1e5) / 1e5, clipped,
    centroidHz: Math.round(ec / et), bands: { sub200: r1((100 * b0) / et) / 100, low: r1((100 * b1) / et) / 100, mid: r1((100 * b2) / et) / 100, high6k: r1((1000 * b3) / et) / 1000 },
    clickMaxDb: r1(db(maxw) - db(med)), clicks, windowsDb, silentShare: tot ? Math.round((100 * silent) / tot) / 100 : 0,
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

const api = {
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

(window as unknown as { bench: typeof api }).bench = api;
document.title = 'audio bench ready';
