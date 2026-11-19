// The recipe library: every transient in the soundscape and every interface sound, synthesised from ./synth in plain
// JavaScript, once, on first use (then cached per context). A recipe is pure: (rng, key, variant) → samples at
// BUF_SR, starting and ending at zero, peak ≤ 0.9. Tonal recipes are baked on the key's tonic (or a stated degree)
// and moved to other degrees by playback rate.
import {
  BUF_SR as SR, type Rng, buf, white, pink, brown, svf, osc, envAD, envPts, fade, norm, add, mul, soft, modal, pluck, dcBlock,
} from './synth';
import { type Key, freq } from './music';

export interface RecipeCtx { rng: Rng; key: Key; v: number }
export type Recipe = (c: RecipeCtx) => Float32Array;

const sec = (n: number) => Math.round(n * SR);
const gauss = (t: number, c: number, s: number) => Math.exp(-0.5 * ((t - c) / s) ** 2);
const pick = <T,>(r: Rng, a: readonly T[]): T => a[Math.floor(r() * a.length) % a.length];

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function chirp(rng: Rng, f0: number, f1: number, dur: number, curve = 1): Float32Array {
  const n = sec(dur);
  const x = osc(n, (i) => { const t = i / n; return f0 + (f1 - f0) * Math.pow(t, curve); }, 'sine', rng());
  return envPts(x, [[0, 0], [dur * 0.15, 1], [dur * 0.6, 0.7], [dur, 0]]);
}

/** A low thump with a pitch drop and a muffled noise knock. */
function thump(rng: Rng, f: number, dur: number, knock = 0.4): Float32Array {
  const n = sec(dur);
  const x = osc(n, (i) => f * (1 + 0.6 * Math.exp(-i / (SR * 0.03))), 'sine');
  envAD(x, 0.004, dur);
  const k = svf(white(sec(0.06), rng), 'lp', 380, 0.8);
  envAD(k, 0.001, 0.05);
  return add(x, k, 0, knock);
}

function noiseBurst(rng: Rng, mode: 'lp' | 'bp' | 'hp', f: number | ((i: number) => number), q: number, a: number, d: number, len?: number, col: 'w' | 'p' | 'b' = 'w'): Float32Array {
  const n = sec(len ?? a + d + 0.02);
  const src = col === 'w' ? white(n, rng) : col === 'p' ? pink(n, rng) : brown(n, rng);
  return envAD(svf(src, mode, f, q), a, d);
}

/** A struck bell (minor-third bell partials). */
function bell(rng: Rng, f: number, dur: number, bright = 1): Float32Array {
  return modal(sec(dur), f, [
    [0.5, 0.35, dur], [1, 0.6, dur * 0.8], [1.19, 0.35 * bright, dur * 0.55], [1.5, 0.25 * bright, dur * 0.45],
    [2, 0.3 * bright, dur * 0.35], [2.5, 0.1 * bright, dur * 0.2], [3, 0.08 * bright, dur * 0.15],
  ], SR, rng);
}

/** Small metal or wood knock. */
const knock = (rng: Rng, f: number, d: number, metal = false) =>
  modal(sec(d + 0.02), f, metal ? [[1, 1, d], [2.76, 0.5, d * 0.6], [5.4, 0.25, d * 0.4]] : [[1, 1, d], [2.3, 0.4, d * 0.5], [4.1, 0.15, d * 0.3]], SR, rng);

/** Panning is done at play time; doppler is baked: pitch factor across a pass-by centred at c seconds. */
const doppler = (t: number, c: number, w: number, depth: number) => 1 + depth * -Math.tanh((t - c) / w);

/* ------------------------------------------------------------------ */
/* Interface palettes: one instrument and one gesture noise per Age    */
/* ------------------------------------------------------------------ */

export type Palette = 'ledger' | 'gaslight' | 'chrome' | 'terminal' | 'neon';
export const PALETTES: readonly Palette[] = ['ledger', 'gaslight', 'chrome', 'terminal', 'neon'];

/** One note in the palette's instrument. */
function note(p: Palette, rng: Rng, f: number, dur: number): Float32Array {
  const n = sec(dur);
  switch (p) {
    case 'ledger': // a small brass handbell, engraved and a little dull
      return svf(modal(n, f, [[1, 1, dur], [2.0, 0.35, dur * 0.6], [2.76, 0.3, dur * 0.4], [5.4, 0.12, dur * 0.25]], SR, rng), 'lp', 3500, 0.7);
    case 'gaslight': // celesta / music box
      return modal(n, f, [[1, 1, dur], [3, 0.25, dur * 0.35], [6.2, 0.06, dur * 0.15]], SR, rng);
    case 'chrome': { // vibraphone with a slow tremolo
      const x = modal(n, f, [[1, 1, dur], [3.95, 0.22, dur * 0.3], [9.87, 0.04, dur * 0.12]], SR, rng);
      for (let i = 0; i < n; i++) x[i] *= 0.82 + 0.18 * Math.cos((2 * Math.PI * 5.2 * i) / SR);
      return x;
    }
    case 'terminal': { // a soft square blip
      const x = svf(osc(n, f, 'square'), 'lp', Math.min(2600, f * 3), 0.6);
      return envAD(x, 0.002, Math.min(dur, 0.18));
    }
    case 'neon': { // glassy FM bell
      const x = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / SR, idx = 2.2 * Math.exp(-t * 6);
        x[i] = Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 3.5 * t));
      }
      return envAD(x, 0.003, dur);
    }
  }
}

/** The palette's tap gesture (what a sell sounds like before any note). */
function gesture(p: Palette, rng: Rng, v: number): Float32Array {
  switch (p) {
    case 'ledger': { // pen nib: a short scratch with grain
      const d = 0.05 + 0.03 * rng();
      const x = noiseBurst(rng, 'bp', (i) => 2000 + 900 * Math.sin(i / 90 + v), 2.5, 0.004, d);
      for (let i = 0; i < x.length; i++) x[i] *= 0.6 + 0.4 * Math.sin(i / (7 + v));
      return add(x, knock(rng, 1400 + 200 * v, 0.02), 0, 0.3);
    }
    case 'gaslight': // a press: type key clack
      return add(knock(rng, 820 + 60 * v, 0.05, true), noiseBurst(rng, 'bp', 2200, 1.2, 0.001, 0.02), 0, 0.5);
    case 'chrome': { // relay: two clicks a few ms apart
      const x = knock(rng, 650 + 40 * v, 0.03, true);
      return add(x, knock(rng, 1100 + 50 * v, 0.025, true), sec(0.007 + 0.002 * rng()), 0.6);
    }
    case 'terminal': // a short blip
      return envAD(svf(osc(sec(0.05), 1200 + 120 * v, 'square'), 'lp', 2400, 0.7), 0.001, 0.035);
    case 'neon': // a soft glass tap
      return modal(sec(0.15), 1700 + 140 * v, [[1, 1, 0.12], [2.7, 0.3, 0.06], [3.9, 0.08, 0.03]], SR, rng);
  }
}

/** Palette's percussive "commit" sound (stamp, press, chunk, enter, glass set down). */
function commit(p: Palette, rng: Rng): Float32Array {
  switch (p) {
    case 'ledger': return add(thump(rng, 120, 0.25, 0.8), noiseBurst(rng, 'lp', 1500, 0.7, 0.001, 0.06), 0, 0.5);
    case 'gaslight': return add(thump(rng, 160, 0.2, 0.5), knock(rng, 700, 0.08, true), sec(0.01), 0.5);
    case 'chrome': return add(knock(rng, 300, 0.12, true), knock(rng, 900, 0.05, true), sec(0.012), 0.5);
    case 'terminal': return add(gesture('terminal', rng, 0), gesture('terminal', rng, 3), sec(0.06), 0.8);
    case 'neon': return add(gesture('neon', rng, 1), thump(rng, 110, 0.18, 0.1), 0, 0.6);
  }
}

/** Arpeggio of degrees in the palette instrument. */
function arp(p: Palette, rng: Rng, key: Key, degs: number[], step: number, dur: number, oct = 2, tail = 1.2): Float32Array {
  const x = buf(step * degs.length + tail * dur);
  degs.forEach((d, i) => add(x, note(p, rng, freq(key, d, oct), i === degs.length - 1 ? dur * tail : dur), sec(step * i), 0.8 + 0.2 * (i / degs.length)));
  return x;
}

/** Sustained chord (organ / pad) with a slow attack, as sines and soft partials. */
function chord(rng: Rng, key: Key, degs: number[], dur: number, oct = 1, att = 0.6, bright = 0.3): Float32Array {
  const n = sec(dur);
  const x = new Float32Array(n);
  for (const d of degs) {
    const f = freq(key, d, oct);
    add(x, osc(n, f * (1 + (rng() - 0.5) * 0.002), 'sine', rng()), 0, 1);
    add(x, osc(n, f * 2, 'sine', rng()), 0, bright * 0.4);
    add(x, osc(n, f * 3, 'sine', rng()), 0, bright * 0.15);
  }
  return envPts(x, [[0, 0], [att, 1], [dur * 0.6, 0.8], [dur, 0]]);
}

export const UI_KINDS = ['sell', 'buy', 'cannotAfford', 'found', 'lever', 'fork', 'headline', 'reveal', 'backfire', 'crisis', 'decade', 'steady', 'reckoning', 'industryOpened', 'ageBegun'] as const;

function ui(p: Palette, kind: string, c: RecipeCtx): Float32Array {
  const { rng, key, v } = c;
  switch (kind) {
    case 'sell': return gesture(p, rng, v);
    case 'buy': {
      const x = buf(0.9);
      add(x, commit(p, rng), 0, 1);
      add(x, note(p, rng, freq(key, [4, 2, 7][v % 3], 2), 0.6), sec(0.05), 0.55);
      return x;
    }
    case 'cannotAfford': {
      const x = buf(0.45);
      if (p === 'chrome') add(x, envAD(svf(osc(sec(0.2), freq(key, 0, 1), 'saw'), 'lp', 600, 0.8), 0.005, 0.18), 0, 0.6);
      add(x, envAD(note(p, rng, freq(key, 2, 1), 0.3), 0.002, 0.15), 0, 0.6);
      add(x, envAD(note(p, rng, freq(key, 0, 1), 0.3), 0.002, 0.2), sec(0.11), 0.6);
      return svf(x, 'lp', 1800, 0.7);
    }
    case 'found': {
      const x = buf(1.8);
      for (let i = 0; i < 4; i++) add(x, gesture(p, rng, i), sec(0.07 * i), 0.5 + 0.1 * i);
      add(x, arp(p, rng, key, [0, 2, 4, 7], 0.09, 0.7), sec(0.25), 0.8);
      return x;
    }
    case 'lever': {
      const x = buf(1.3);
      add(x, commit(p, rng), 0, 1);
      add(x, note(p, rng, freq(key, 4, 1), 0.5), sec(0.12), 0.5);
      add(x, note(p, rng, freq(key, 0, 2), 0.9), sec(0.32), 0.6);
      return x;
    }
    case 'fork': {
      const x = buf(1.6);
      add(x, note(p, rng, freq(key, 0, 1), 1.4), 0, 0.6);
      add(x, note(p, rng, freq(key, 4, 1), 1.3), sec(0.04), 0.5);
      add(x, chord(rng, key, [0, 4], 1.5, 1, 0.3, 0.2), 0, 0.25);
      return x;
    }
    case 'headline': {
      const x = buf(1.0);
      if (p === 'ledger' || p === 'gaslight') add(x, noiseBurst(rng, 'bp', (i) => 900 + 2200 * (i / sec(0.35)), 0.9, 0.08, 0.25, 0.4, 'p'), 0, 0.5);
      else for (let i = 0; i < 5; i++) add(x, gesture(p, rng, i), sec(0.045 * i + 0.01 * rng()), 0.45);
      add(x, note(p, rng, freq(key, 7, 2), 0.5), sec(0.28), 0.5);
      add(x, note(p, rng, freq(key, 7, 2), 0.6), sec(0.42), 0.4);
      return x;
    }
    case 'reveal': { // a struck low bell and an opening chord: a moment
      const x = buf(5.5);
      add(x, bell(rng, freq(key, 0, 2), 5), 0, 0.6);
      add(x, chord(rng, key, [0, 4, 7, 9], 5.2, 1, 1.4, 0.35), sec(0.2), 0.35);
      add(x, arp(p, rng, key, [4, 7, 9, 11], 0.35, 1.2, 2, 2), sec(1.6), 0.3);
      return svf(x, 'lp', 5000, 0.6);
    }
    case 'backfire': { // up, overshoot, boing, deflate: the rebound is the joke
      const n = sec(2.4);
      const x = new Float32Array(n);
      const f0 = freq(key, 0, 2), f5 = freq(key, 4, 2);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        let f: number, a: number;
        if (t < 0.45) { const u = t / 0.45; f = f0 * Math.pow(2, 1.15 * u * u); a = 0.3 + 0.7 * u; } // slide-whistle up past the octave
        else if (t < 1.35) { const u = t - 0.45; f = f0 * 2 * (1 + 0.22 * Math.exp(-u * 3.2) * Math.sin(2 * Math.PI * 7.5 * u)); a = Math.exp(-u * 0.8); } // boing
        else { const u = (t - 1.35) / 1.05; f = f0 * 2 * Math.pow(f5 / (f0 * 2), u) * (1 + 0.02 * Math.sin(2 * Math.PI * 6 * u)) * (1 - 0.35 * u * u); a = 0.5 * (1 - u) ** 1.5; } // deflate
        ph += f / SR;
        x[i] = a * (Math.sin(2 * Math.PI * ph) + 0.18 * Math.sin(4 * Math.PI * ph));
      }
      fade(x, 4, 40);
      add(x, note(p, rng, freq(key, 7, 2), 0.6), sec(0.44), 0.35);
      add(x, thump(rng, 90, 0.3, 0.3), sec(0.45), 0.4);
      return x;
    }
    case 'crisis': {
      const x = buf(2.2);
      if (p === 'ledger') { add(x, bell(rng, freq(key, 0, 1), 2), 0, 0.7); add(x, bell(rng, freq(key, 0, 1), 1.4), sec(0.9), 0.5); }
      else if (p === 'gaslight') for (let i = 0; i < 6; i++) add(x, bell(rng, freq(key, 4, 2), 0.5, 1.2), sec(0.17 * i), 0.4);
      else if (p === 'chrome') { const s = siren(rng, key, 1.8, 0.8); add(x, s, 0, 0.6); }
      else if (p === 'terminal') for (let i = 0; i < 6; i++) add(x, note('terminal', rng, freq(key, i % 2 ? 4 : 7, 2), 0.15), sec(0.2 * i), 0.5);
      else add(x, envAD(svf(osc(sec(1.6), (i) => freq(key, 7, 2) * Math.pow(0.5, i / sec(1.6)), 'saw'), 'lp', 1600, 0.8), 0.01, 1.4), 0, 0.5);
      return x;
    }
    case 'decade': return arp(p, rng, key, [0, 2, 4], 0.08, 0.5, 2);
    case 'steady': { // a warm resolution, and the quiet's voice at the end
      const x = buf(3.6);
      add(x, chord(rng, key, [0, 4, 7, 9], 3.2, 1, 0.8, 0.25), 0, 0.3);
      add(x, arp(p, rng, key, [2, 4, 7], 0.18, 0.9, 2, 1.6), sec(0.3), 0.45);
      add(x, birdPhrase(rng, 1), sec(2.1), 0.25);
      return x;
    }
    case 'reckoning': {
      const x = buf(4);
      [4, 2, 0].forEach((d, i) => add(x, note(p, rng, freq(key, d, 1), 1.6), sec(0.7 * i), 0.55 - 0.1 * i));
      add(x, thump(rng, 60, 1.2, 0.3), sec(1.4), 0.5);
      return svf(x, 'lp', 1400, 0.7);
    }
    case 'industryOpened': {
      const x = buf(2);
      add(x, commit(p, rng), 0, 0.6);
      add(x, arp(p, rng, key, [0, 4, 7, 11], 0.12, 0.8, 1), sec(0.08), 0.7);
      return x;
    }
    case 'ageBegun': {
      const x = buf(4.2);
      add(x, chord(rng, key, [3, 5, 7], 1.8, 1, 0.5, 0.3), 0, 0.3);
      add(x, chord(rng, key, [0, 4, 7, 9], 2.6, 1, 0.5, 0.3), sec(1.5), 0.32);
      add(x, arp(p, rng, key, [0, 4, 7, 9, 11], 0.15, 1, 2, 1.8), sec(1.5), 0.4);
      return x;
    }
  }
  return gesture(p, rng, 0);
}

function siren(rng: Rng, key: Key, dur: number, fall = 0): Float32Array {
  const n = sec(dur);
  const hi = freq(key, 7, 2), lo = freq(key, 4, 2);
  const x = osc(n, (i) => { const t = i / SR; return (Math.floor(t / 0.45) % 2 ? lo : hi) * (1 - fall * 0.06 * (t / dur)); }, 'tri', rng());
  svf(x, 'lp', 2400, 0.7);
  return envPts(x, [[0, 0], [0.15, 1], [dur - 0.4, 0.9], [dur, 0]]);
}

/* ------------------------------------------------------------------ */
/* World transients                                                    */
/* ------------------------------------------------------------------ */

function birdPhrase(rng: Rng, v: number): Float32Array {
  const x = buf(2.2);
  const base = 2200 + 1600 * rng();
  switch (v % 6) {
    case 0: { const n = 6 + Math.floor(rng() * 6); for (let i = 0; i < n; i++) add(x, chirp(rng, base * 1.1, base * 0.9, 0.035), sec(0.055 * i), 0.8); break; } // trill
    case 1: { // blackbird-ish: slower notes in a warble
      let t = 0;
      for (let i = 0; i < 4 + Math.floor(rng() * 3); i++) { const f = 1300 + 900 * rng(); add(x, chirp(rng, f, f * (0.9 + 0.3 * rng()), 0.12 + 0.1 * rng(), 0.6), sec(t), 0.9); t += 0.16 + 0.12 * rng(); }
      break;
    }
    case 2: for (let i = 0; i < 4; i++) add(x, chirp(rng, i % 2 ? base : base * 1.25, i % 2 ? base * 0.95 : base * 1.2, 0.09), sec(0.28 * i), 0.8); break; // chiff-chaff
    case 3: { const n = 10; for (let i = 0; i < n; i++) { const f = base * 1.4 * (1 - i / (n * 1.6)); add(x, chirp(rng, f, f * 0.85, 0.04), sec(0.045 * i), 0.7); } break; } // cascade
    case 4: add(x, chirp(rng, base * 1.2, base * 0.7, 0.07, 0.5), 0, 0.9); add(x, chirp(rng, base * 1.2, base * 0.7, 0.07, 0.5), sec(0.5), 0.6); break; // chip
    default: { const n = sec(0.6); const y = osc(n, (i) => base * (1 + 0.12 * Math.sin(i / 60)), 'sine', rng()); envPts(y, [[0, 0], [0.1, 1], [0.5, 0.6], [0.6, 0]]); add(x, y, 0, 0.7); } // warble
  }
  return x;
}

/** Real lengths are trimmed by trim() below so silent tails cost nothing. */
const W: Record<string, Recipe> = {
  bird: ({ rng, v }) => birdPhrase(rng, v),

  // Steam's engines, one per machine stage
  newcomen: ({ rng }) => { // a slow thump, then the wheeze of the cylinder filling
    const x = buf(3.4);
    add(x, thump(rng, 82, 0.7, 0.6), 0, 0.7);
    add(x, knock(rng, 240, 0.3), sec(0.03), 0.7);
    add(x, knock(rng, 410, 0.15), sec(0.035), 0.3);
    const wz = noiseBurst(rng, 'bp', (i) => 380 + 450 * Math.sin(Math.PI * Math.min(1, i / sec(1.3))), 1.6, 0.4, 1.0, 1.6, 'p');
    add(x, wz, sec(1.0), 0.5);
    add(x, knock(rng, 140, 0.3), sec(2.6), 0.2);
    return x;
  },
  watt: ({ rng }) => {
    const x = buf(1.3);
    add(x, thump(rng, 98, 0.4, 0.5), 0, 0.6);
    add(x, knock(rng, 300, 0.12), sec(0.01), 0.6);
    add(x, knock(rng, 1150, 0.05, true), sec(0.22), 0.12);
    add(x, noiseBurst(rng, 'bp', 1300, 1.1, 0.02, 0.35, 0.5, 'p'), sec(0.3), 0.35);
    return x;
  },
  chuff: ({ rng, v }) => add(noiseBurst(rng, 'bp', 800 + 120 * v, 1.0, 0.006, 0.2, 0.3, 'p'), thump(rng, 120, 0.15, 0.2), 0, 0.3),
  chuffFar: ({ rng, v }) => svf(add(noiseBurst(rng, 'bp', 650 + 80 * v, 1.0, 0.01, 0.25, 0.35, 'p'), thump(rng, 130, 0.15, 0.2), 0, 0.25), 'lp', 1100, 0.7),
  loom: ({ rng, v }) => add(knock(rng, 520 + 90 * v, 0.06), noiseBurst(rng, 'lp', 2600, 0.7, 0.001, 0.015), 0, 0.25),
  winder: ({ rng, key }) => { // pithead bell, then the drum runs up, holds and runs down
    const x = buf(9.5);
    add(x, bell(rng, freq(key, 0, 3), 1.0, 1.2), 0, 0.35);
    add(x, bell(rng, freq(key, 0, 3), 1.0, 1.2), sec(0.45), 0.3);
    const n = sec(7.5);
    const sp = (i: number) => { const t = i / SR; return Math.min(1, t / 2.2) * Math.min(1, Math.max(0, (7.3 - t) / 2.2)); };
    const drum = osc(n, (i) => freq(key, 0, 0) * (0.7 + 0.6 * sp(i)), 'saw');
    svf(drum, 'lp', 520, 0.8);
    for (let i = 0; i < n; i++) drum[i] *= sp(i);
    const rope = svf(pink(n, rng), 'bp', (i) => 300 + 500 * sp(i), 4);
    for (let i = 0; i < n; i++) rope[i] *= sp(i) * 0.6;
    add(x, drum, sec(1.6), 0.5);
    add(x, rope, sec(1.6), 0.4);
    return x;
  },
  trainPass: ({ rng, key }) => { // rumble, chuffs, bogie clacks, a whistle in key
    const d = 10, n = sec(d);
    const x = svf(brown(n, rng), 'bp', 300, 0.6);
    for (let i = 0; i < n; i++) x[i] *= 0.7 * gauss(i / SR, 5, 2.0);
    for (let t = 1; t < 9; t += 0.27) add(x, chuffAt(rng, t), sec(t), 0.5 * gauss(t, 5, 2.0));
    for (let t = 3.2; t < 7; t += 0.62) { add(x, knock(rng, 320, 0.05, true), sec(t), 0.3 * gauss(t, 5, 1.2)); add(x, knock(rng, 300, 0.05, true), sec(t + 0.09), 0.25 * gauss(t, 5, 1.2)); }
    const wn = sec(1.4);
    const wh = new Float32Array(wn);
    for (const dgr of [4, 6]) add(wh, osc(wn, (i) => freq(key, dgr, 3) * doppler(3.2 + i / SR, 5, 1.2, 0.025), 'saw', rng()), 0, 0.5);
    svf(wh, 'lp', 2400, 0.7);
    envPts(wh, [[0, 0], [0.1, 1], [1.1, 0.9], [1.4, 0]]);
    add(x, wh, sec(3.2), 0.18);
    return x;
  },
  shipHorn: ({ rng, key }) => {
    const n = sec(4.2);
    const x = new Float32Array(n);
    for (const [dgr, g] of [[0, 1], [4, 0.7]] as [number, number][]) add(x, osc(n, (i) => freq(key, dgr, 1) * (1 + 0.004 * Math.sin(i / 2000)), 'saw', rng()), 0, g);
    add(x, osc(n, freq(key, 0, 0), 'sine'), 0, 0.2);
    svf(x, 'lp', 700, 0.8);
    return envPts(x, [[0, 0], [0.35, 1], [3.0, 0.9], [4.2, 0]]);
  },
  churchBell: ({ rng, key }) => bell(rng, freq(key, 0, 2), 4.5, 0.8),
  fogSwell: ({ rng }) => { const n = sec(8); const x = svf(brown(n, rng), 'lp', 260, 0.7); return envPts(x, [[0, 0], [2.5, 1], [5, 0.8], [8, 0]]); },

  // Light
  lampPop: ({ rng, key }) => {
    const x = buf(0.7);
    add(x, noiseBurst(rng, 'bp', 1500, 1, 0.001, 0.02), 0, 0.5);
    add(x, modal(sec(0.6), freq(key, 0, 3), [[1, 1, 0.5], [2.32, 0.3, 0.25], [4.25, 0.12, 0.1]], SR, rng), sec(0.008), 0.6);
    return x;
  },
  tramPass: ({ rng, key }) => {
    const d = 7, n = sec(d);
    const x = svf(brown(n, rng), 'bp', 380, 0.6);
    for (let i = 0; i < n; i++) x[i] *= 0.6 * gauss(i / SR, 3.6, 1.5);
    const motor = osc(n, (i) => 95 * doppler(i / SR, 3.6, 1, 0.04) * (0.8 + 0.2 * Math.min(1, i / sec(2))), 'saw');
    svf(motor, 'lp', 700, 0.8);
    for (let i = 0; i < n; i++) motor[i] *= gauss(i / SR, 3.6, 1.4);
    add(x, motor, 0, 0.3);
    add(x, bell(rng, freq(key, 4, 3), 0.7, 1.3), sec(1.0), 0.3);
    add(x, bell(rng, freq(key, 4, 3), 0.7, 1.3), sec(1.25), 0.25);
    for (let t = 2.6; t < 4.4; t += 0.08 + rng() * 0.25) add(x, noiseBurst(rng, 'bp', 2400, 2, 0.001, 0.012), sec(t), 0.15);
    return x;
  },
  piano: ({ rng, key, v }) => { // a parlour piano through a window: a few notes in key
    const x = buf(3.5);
    const degs = [0, 2, 4, 5, 7, 9];
    let t = 0;
    for (let i = 0; i < 3 + (v % 3); i++) {
      const f = freq(key, pick(rng, degs), 2);
      add(x, svf(pluck(sec(1.8), f, 1.6, 0.35, rng), 'lp', 1800, 0.6), sec(t), 0.6);
      t += 0.3 + 0.2 * Math.floor(rng() * 3) * 0.5;
    }
    return x;
  },
  cabPass: ({ rng }) => { // hooves and iron tyres
    const d = 6, n = sec(d);
    const x = svf(brown(n, rng), 'bp', 420, 0.6);
    for (let i = 0; i < n; i++) x[i] *= 0.35 * gauss(i / SR, 3, 1.3);
    for (let t = 0.4; t < 5.6; t += 0.36) {
      const g = gauss(t, 3, 1.3);
      add(x, knock(rng, 480 + 60 * rng(), 0.05), sec(t), 0.45 * g);
      add(x, knock(rng, 700 + 80 * rng(), 0.04), sec(t + 0.11), 0.3 * g);
    }
    return x;
  },
  fogHorn: ({ rng, key }) => {
    const n = sec(4);
    const x = osc(n, (i) => { const t = i / SR; return freq(key, 0, 0) * (t > 2.8 ? 1 - 0.18 * (t - 2.8) : 1); }, 'saw', rng());
    add(x, osc(n, freq(key, 0, 1), 'saw', rng()), 0, 0.4);
    svf(x, 'lp', 420, 0.9);
    return envPts(x, [[0, 0], [0.3, 1], [2.8, 0.9], [4, 0]]);
  },
  fireBell: ({ rng, key }) => { const x = buf(3.4); for (let i = 0; i < 9; i++) add(x, bell(rng, freq(key, 4, 2), 0.6, 1.1), sec(0.3 * i), 0.4); return x; },

  // Motion
  carPass: ({ rng, v }) => {
    const d = 4.5, n = sec(d), c = 2.2;
    const f0 = 70 + 12 * v + 10 * rng();
    const eng = svf(osc(n, (i) => f0 * doppler(i / SR, c, 0.45, 0.07), 'saw', rng()), 'lp', (i) => 600 + 900 * gauss(i / SR, c, 0.6), 0.7);
    const tyre = svf(pink(n, rng), 'bp', (i) => 600 + 900 * gauss(i / SR, c, 0.5), 0.6);
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const g = gauss(i / SR, c, 0.75); x[i] = (eng[i] * 0.4 + tyre[i] * 0.8) * g; }
    return x;
  },
  vanPass: ({ rng, v }) => {
    const d = 5.5, n = sec(d), c = 2.7;
    const f0 = 48 + 6 * v;
    const eng = svf(osc(n, (i) => f0 * doppler(i / SR, c, 0.6, 0.06), 'square', rng()), 'lp', 500, 0.8);
    for (let i = 0; i < n; i++) eng[i] *= 0.7 + 0.3 * Math.sin((2 * Math.PI * f0 * 0.5 * i) / SR);
    const tyre = svf(pink(n, rng), 'bp', 500, 0.6);
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const g = gauss(i / SR, c, 0.95); x[i] = (eng[i] * 0.45 + tyre[i] * 0.7) * g; }
    return x;
  },
  jet: ({ rng }) => {
    const d = 14, n = sec(d);
    const x = svf(pink(n, rng), 'lp', (i) => { const t = i / SR; return 300 + 1400 * gauss(t, 5, 2.5); }, 0.8);
    const wh = osc(n, (i) => 1100 * doppler(i / SR, 5, 2, 0.05), 'sine');
    for (let i = 0; i < n; i++) { const t = i / SR; const e = Math.min(1, t / 3) * Math.exp(-Math.max(0, t - 5) / 3.5); x[i] = x[i] * e + wh[i] * 0.04 * gauss(t, 5, 1.8); }
    return x;
  },
  chime: ({ rng, key }) => arp('chrome', rng, key, [4, 2, 0], 0.35, 0.9, 2, 1.6),
  doorThunk: ({ rng }) => add(thump(rng, 110, 0.25, 0.6), noiseBurst(rng, 'lp', 900, 0.7, 0.001, 0.05), 0, 0.4),
  mower: ({ rng }) => {
    const d = 9, n = sec(d);
    const x = svf(osc(n, (i) => 52 * (1 + 0.04 * Math.sin(i / 9000) + 0.02 * Math.sin(i / 2300)), 'saw', rng()), 'bp', 700, 0.9);
    for (let i = 0; i < n; i++) x[i] *= 0.75 + 0.25 * Math.sin((2 * Math.PI * 26 * i) / SR);
    return envPts(x, [[0, 0], [2, 1], [7, 1], [9, 0]]);
  },
  radio: ({ rng, key }) => { // a tinny tune on a transistor radio, over a garden fence
    const x = buf(4.2);
    let t = 0.1;
    let d = pick(rng, [0, 2, 4]);
    while (t < 3.6) {
      const len = pick(rng, [0.2, 0.2, 0.4]);
      const y = osc(sec(len), freq(key, d, 2), 'square', rng());
      envAD(y, 0.005, len);
      add(x, y, sec(t), 0.5);
      t += len; d = Math.max(-2, Math.min(9, d + pick(rng, [-2, -1, 1, 1, 2])));
    }
    add(x, white(x.length, rng), 0, 0.05);
    svf(x, 'bp', 1300, 0.9);
    return envPts(x, [[0, 0], [0.3, 1], [3.8, 1], [4.2, 0]]);
  },
  siren2: ({ rng, key }) => siren(rng, key, 4.5, 1),

  // Compute
  tick: ({ rng, v }) => add(modal(sec(0.03), 1500 + 260 * v, [[1, 1, 0.018], [1.6, 0.5, 0.01], [2.3, 0.25, 0.006]], SR, rng), noiseBurst(rng, 'bp', 2000, 1.5, 0.0005, 0.004), 0, 0.2),
  beep: ({ rng, key, v }) => { const x = buf(0.3); add(x, note('terminal', rng, freq(key, 0, 3), 0.1), 0, 1); if (v % 2) add(x, note('terminal', rng, freq(key, 4, 3), 0.1), sec(0.11), 0.8); return x; },
  throb: ({ rng, key }) => { const x = osc(sec(0.6), freq(key, 0, 1), 'sine'); add(x, osc(sec(0.6), freq(key, 0, 2), 'sine'), 0, 0.6); envAD(x, 0.04, 0.5); return add(x, noiseBurst(rng, 'lp', 220, 0.7, 0.03, 0.3, 0.5, 'b'), 0, 0.3); },
  alarm: ({ rng, key }) => { const x = buf(2.2); for (let i = 0; i < 9; i++) if (i % 3 !== 2) add(x, note('terminal', rng, freq(key, 7, 2), 0.14), sec(0.22 * i), 0.6); return x; },
  whoosh: ({ rng }) => noiseBurst(rng, 'bp', (i) => 400 + 1000 * (i / sec(2)), 1.2, 0.8, 1.2, 2.2, 'p'),
  cricket: ({ rng }) => { const x = buf(1.2); for (let k = 0; k < 3; k++) { const y = osc(sec(0.18), 3500 + 200 * rng(), 'sine'); for (let i = 0; i < y.length; i++) y[i] *= Math.max(0, Math.sin((2 * Math.PI * 30 * i) / SR)); envAD(y, 0.01, 0.17); add(x, y, sec(0.35 * k), 0.6); } return x; },

  // Code
  drip: ({ rng, v }) => { const f = 1100 + 260 * v + 200 * rng(); const n = sec(0.12); const x = osc(n, (i) => f * (1 + Math.min(1, i / sec(0.012))), 'sine', 0); return envAD(x, 0.001, 0.07); },
  elevated: ({ rng }) => {
    const d = 9, n = sec(d);
    const x = svf(brown(n, rng), 'bp', 280, 0.6);
    for (let i = 0; i < n; i++) x[i] *= 0.8 * gauss(i / SR, 4.5, 1.8);
    for (let t = 2; t < 7; t += 0.5) { add(x, knock(rng, 260, 0.06, true), sec(t), 0.3 * gauss(t, 4.5, 1.2)); add(x, knock(rng, 240, 0.06, true), sec(t + 0.1), 0.25 * gauss(t, 4.5, 1.2)); }
    const sq = osc(n, 1750, 'sine');
    for (let i = 0; i < n; i++) sq[i] *= 0.02 * gauss(i / SR, 5.2, 0.6);
    return add(x, sq, 0, 1);
  },
  dronePass: ({ rng, v }) => {
    const d = 6, n = sec(d), c = 3;
    const x = new Float32Array(n);
    for (let k = 0; k < 4; k++) add(x, osc(n, (i) => (165 + 7 * k + 10 * v) * doppler(i / SR, c, 0.9, 0.04), 'saw', rng()), 0, 0.25);
    svf(x, 'bp', 900, 0.7);
    for (let i = 0; i < n; i++) x[i] *= gauss(i / SR, c, 1.1) * (0.8 + 0.2 * Math.sin(i / 300));
    return x;
  },
  neonTick: ({ rng, v }) => { const x = svf(osc(sec(0.05), 120 + 0 * v, 'saw'), 'bp', 900 + 200 * v, 1.2); envAD(x, 0.001, 0.04); return add(x, noiseBurst(rng, 'bp', 1800, 1, 0.0005, 0.006), 0, 0.3); },
  outage: ({ rng }) => { const x = envAD(svf(osc(sec(3), (i) => 600 * Math.pow(0.12, i / sec(3)), 'saw', rng()), 'lp', 1400, 0.8), 0.01, 2.6); return add(x, thump(rng, 55, 1.0, 0.4), sec(0.3), 0.6); },
  owl: ({ rng }) => { const x = buf(2.4); const h = (d: number) => envPts(osc(sec(d), (i) => 390 * (1 + 0.05 * Math.sin(Math.PI * i / sec(d))), 'sine', rng()), [[0, 0], [0.05, 1], [d * 0.7, 0.8], [d, 0]]); add(x, h(0.5), 0, 0.8); add(x, h(0.25), sec(0.9), 0.6); add(x, h(0.6), sec(1.3), 0.7); return svf(x, 'lp', 1200, 0.7); },
  // The warm rooms of the old block (Code): the last lamps on
  typing: ({ rng }) => { const x = buf(1.6); for (let t = 0.02; t < 1.4; t += 0.08 + 0.14 * rng()) add(x, knock(rng, 1100 + 500 * rng(), 0.02), sec(t), 0.3 + 0.3 * rng()); return x; },
  pageTurn: ({ rng }) => { const n = sec(0.7); const x = svf(pink(n, rng), 'bp', (i) => 900 + 2200 * (i / n), 0.8); for (let i = 0; i < n; i++) x[i] *= (0.6 + 0.4 * Math.sin(i / 40)) * Math.sin((Math.PI * i) / n); return x; },
  cupClink: ({ rng }) => { const x = buf(1.2); const cl = () => modal(sec(0.6), 2100 + 300 * rng(), [[1, 1, 0.4], [2.6, 0.4, 0.2], [4.2, 0.15, 0.1]], SR, rng); add(x, cl(), 0, 0.6); add(x, cl(), sec(0.22 + 0.1 * rng()), 0.4); return x; },
  guitar: ({ rng, key, v }) => { const x = buf(3.4); const degs = [[0, 4, 7], [5, 9, 12], [3, 7, 10], [4, 7, 11]][v % 4]; degs.forEach((d, i) => add(x, svf(pluck(sec(3), freq(key, d, 1), 2.6, 0.5, rng), 'lp', 2600, 0.6), sec(0.05 * i), 0.5)); return x; },
  kettle: ({ rng }) => { const n = sec(5.5); const x = svf(brown(n, rng), 'bp', (i) => 200 + 300 * (i / n), 1.2); envPts(x, [[0, 0], [4.8, 1], [5.0, 0.2], [5.5, 0]]); return add(x, knock(rng, 1300, 0.03), sec(5.0), 0.4); },
  pencil: ({ rng }) => { const n = sec(1.8); const x = svf(white(n, rng), 'bp', 2300, 2); for (let i = 0; i < n; i++) x[i] *= Math.max(0, Math.sin(i / (sec(0.17)) * Math.PI)) ** 2 * 0.5; return x; },

  // Lever signatures (small, occasional)
  'lv.duty': ({ rng, key }) => { const x = buf(1.4); add(x, bell(rng, freq(key, 4, 3), 0.6, 1.2), 0, 0.5); add(x, bell(rng, freq(key, 4, 3), 0.6, 1.2), sec(0.3), 0.4); return x; },
  'lv.cap': ({ rng }) => { const x = buf(0.8); for (let i = 0; i < 5; i++) add(x, knock(rng, 1300, 0.02, true), sec(0.07 * i), 0.5); return x; },
  'lv.sufficiency': ({ rng }) => { const x = buf(2.4); add(x, noiseBurst(rng, 'lp', 700, 0.7, 0.005, 0.12), 0, 0.6); add(x, noiseBurst(rng, 'lp', 700, 0.7, 0.005, 0.12), sec(0.7), 0.5); add(x, birdPhrase(rng, 1), sec(1.1), 0.3); return x; },
  'lv.substitution': ({ rng }) => { const n = sec(4); const x = svf(pink(n, rng), 'bp', 500, 0.9); for (let i = 0; i < n; i++) x[i] *= 0.5 + 0.5 * Math.sin((2 * Math.PI * 0.9 * i) / SR); return envPts(x, [[0, 0], [1, 1], [3, 1], [4, 0]]); },
  'lv.circularity': ({ rng }) => { const x = buf(1.2); for (let i = 0; i < 3; i++) add(x, modal(sec(0.5), 1800 + 400 * rng(), [[1, 1, 0.3], [2.4, 0.4, 0.15]], SR, rng), sec(0.18 * i + 0.05 * rng()), 0.4); return x; },
  'lv.greenSpending': ({ rng }) => { const n = sec(3); const x = svf(pink(n, rng), 'bp', 1400, 0.8); mul(x, 0.25); for (let t = 0.1; t < 2.8; t += 0.1 + 0.2 * rng()) add(x, W.drip({ rng, key: { root: 1, mode: 'aeolian', name: '' }, v: Math.floor(rng() * 4) }), sec(t), 0.2); return envPts(x, [[0, 0], [0.5, 1], [2.5, 1], [3, 0]]); },
  'lv.deletion': ({ rng }) => noiseBurst(rng, 'bp', (i) => 2000 - 1500 * (i / sec(1.2)), 0.8, 0.1, 1.0, 1.2, 'p'),
  'lv.reviewGate': ({ rng }) => commit('ledger', rng),
  'lv.sharedLibs': ({ rng }) => W.pageTurn({ rng, key: { root: 1, mode: 'aeolian', name: '' }, v: 0 }),
  'lv.generic': ({ rng, key }) => bell(rng, freq(key, 4, 3), 0.8, 1),
};

function chuffAt(rng: Rng, _t: number): Float32Array { return noiseBurst(rng, 'bp', 750, 1.0, 0.006, 0.15, 0.22, 'p'); }

/* ------------------------------------------------------------------ */
/* Registry                                                             */
/* ------------------------------------------------------------------ */

/** Trailing near-silence trimmed (a 10 s pass-by need not cost 10 s of voice when it is quiet after 8). */
function trim(x: Float32Array): Float32Array {
  let end = x.length;
  const th = 1e-4;
  while (end > 1 && Math.abs(x[end - 1]) < th) end--;
  return end < x.length - sec(0.05) ? x.slice(0, Math.min(x.length, end + sec(0.02))) : x;
}

/** Render a recipe by name ('bird', 'ui:ledger:sell', …). Unknown names render a soft generic knock. */
export function render(name: string, c: RecipeCtx): Float32Array {
  let x: Float32Array;
  if (name.startsWith('ui:')) {
    const [, p, kind] = name.split(':');
    x = ui((PALETTES as readonly string[]).includes(p) ? (p as Palette) : 'ledger', kind, c);
  } else {
    const r = W[name];
    x = r ? r(c) : knock(c.rng, 600, 0.08);
  }
  dcBlock(x);
  soft(norm(x, 0.85), 1.1);
  return fade(trim(x));
}

export function hasRecipe(name: string): boolean {
  if (name.startsWith('ui:')) { const [, p, kind] = name.split(':'); return (PALETTES as readonly string[]).includes(p) && (UI_KINDS as readonly string[]).includes(kind); }
  return name in W;
}

export const WORLD_RECIPES: readonly string[] = Object.keys(W);
