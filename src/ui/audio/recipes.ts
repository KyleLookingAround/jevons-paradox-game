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

export const UI_KINDS = ['sell', 'buy', 'cannotAfford', 'found', 'lever', 'fork', 'headline', 'reveal', 'backfire', 'crisis', 'decade', 'steady', 'reckoning', 'industryOpened', 'ageBegun',
  'seam', 'letter', 'letterOpened', 'answer', 'letterExpired', 'bite', 'survey', 'proprietor', 'ending', 'ledgerContinues', 'arrived', 'history',
  'wager', 'actEnding', 'arrears',
  'officeTaken', 'electionCalled', 'electionWon', 'electionLost', 'inspected', 'concealmentFound', 'lobbied', 'litigated',
  'loopholeUsed', 'loopholeClosed', 'treaty'] as const;

/* ------------------------------------------------------------------ */
/* M3: the post, the pen, the watch                                    */
/* ------------------------------------------------------------------ */

/** The cast's motifs: a few scale degrees each, in the Age's key, on the palette's instrument, played after the post
 *  so a regular correspondent is known by ear. Later generations keep the family's (the figure key); Miss Whitlow has
 *  her father's turned round. [degrees, step seconds]. Distinct by interval content (a test checks). */
export const MOTIFS: Record<string, [number[], number]> = {
  correspondent: [[4, 4, 0], 0.15],      // the by-line: a repeated note, then down a fifth ("by return")
  whitlow: [[0, 1, 2, 3], 0.12],         // counting, step by step
  missWhitlow: [[3, 2, 1, 0], 0.12],     // her father's arithmetic, turned on the proprietor
  fenwick: [[0, 2, 0, 2], 0.1],          // brisk thirds: a list
  ashworth: [[0, 4, 7], 0.14],           // proud: up a fifth, up to the octave
  pryce: [[0, 5, 4], 0.17],              // genial: up a sixth and settle ("now then")
  minister: [[0, -2, -2], 0.26],         // slow, down a third and stays there ("in due course")
};
/** Cast id → the family whose motif it plays (unknown ids: none). */
export const CAST_FAMILY: Record<string, string> = {
  correspondent: 'correspondent', whitlow: 'whitlow', whitlowChair: 'whitlow', missWhitlow: 'missWhitlow',
  fenwick: 'fenwick', fenwickCouncil: 'fenwick', ashworth: 'ashworth', ashworthLater: 'ashworth', pryce: 'pryce', minister: 'minister',
};

function motif(p: Palette, rng: Rng, key: Key, fam: string): Float32Array {
  const m = MOTIFS[fam];
  if (!m) return buf(0.05);
  const [degs, step] = m;
  const x = buf(step * degs.length + 0.8);
  degs.forEach((d, i) => add(x, note(p, rng, freq(key, d, 2), i === degs.length - 1 ? 0.7 : 0.4), sec(step * i), i === degs.length - 1 ? 0.75 : 0.6));
  return svf(x, 'lp', 3200, 0.7);
}

/** A pen stroke on paper: a grainy scratch whose pitch follows the nib. */
function penStroke(rng: Rng, dur: number): Float32Array {
  const n = sec(dur);
  const x = svf(white(n, rng), 'bp', (i) => 1700 + 700 * Math.sin((i / n) * Math.PI * 2.3 + rng() * 0.01), 3);
  for (let i = 0; i < n; i++) { const t = i / n; x[i] *= (0.55 + 0.45 * Math.sin(i / 37)) * Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.7; }
  return svf(x, 'lp', 3800, 0.7);
}

/** Paper handled: a soft bandpassed rustle that rises. */
function paper(rng: Rng, dur: number, f0 = 900, f1 = 2400): Float32Array {
  const n = sec(dur);
  const x = svf(pink(n, rng), 'bp', (i) => f0 + (f1 - f0) * (i / n), 0.9);
  for (let i = 0; i < n; i++) x[i] *= (0.5 + 0.5 * Math.abs(Math.sin(i / 230 + rng() * 0.2))) * Math.sin((Math.PI * i) / n);
  return x;
}

/** The post arriving, in each Age's idiom: a knock and the letter-box; a telegraph sounder; a teleprinter; a mail
 *  chime; a soft notification. Small and short by design (a letter arrives every few minutes at most). */
function post(p: Palette, rng: Rng, key: Key): Float32Array {
  switch (p) {
    case 'ledger': { // two knocks on a door, then the letter-box flap and the letter on the mat
      const x = buf(1.2);
      add(x, svf(knock(rng, 190, 0.12), 'lp', 1200, 0.7), 0, 0.8);
      add(x, svf(knock(rng, 182, 0.12), 'lp', 1200, 0.7), sec(0.19), 0.7);
      add(x, knock(rng, 880, 0.05, true), sec(0.62), 0.35);
      add(x, knock(rng, 640, 0.04, true), sec(0.66), 0.25);
      add(x, paper(rng, 0.28, 1500, 900), sec(0.68), 0.35);
      return x;
    }
    case 'gaslight': { // the telegraph sounder: ·−· (down-clack, up-clack)
      const x = buf(1.1);
      let t = 0.02;
      for (const len of [0.07, 0.2, 0.07]) {
        add(x, knock(rng, 1250 + 60 * rng(), 0.03, true), sec(t), 0.6);
        add(x, knock(rng, 900 + 40 * rng(), 0.025, true), sec(t + len), 0.4);
        t += len + 0.11;
      }
      return svf(x, 'lp', 3500, 0.7);
    }
    case 'chrome': { // the teleprinter: a short chatter, the carriage, a small bell
      const x = buf(1.2);
      let t = 0.02;
      for (let i = 0; i < 12; i++) { add(x, knock(rng, 1100 + 400 * rng(), 0.018, true), sec(t), 0.35 + 0.15 * rng()); t += 0.038 + 0.02 * rng(); }
      add(x, thump(rng, 140, 0.12, 0.4), sec(t + 0.04), 0.4);
      add(x, note('chrome', rng, freq(key, 4, 3), 0.5), sec(t + 0.12), 0.3);
      return svf(x, 'lp', 3500, 0.7);
    }
    case 'terminal': { // a mail chime: two soft blips, down a fourth
      const x = buf(0.6);
      add(x, note('terminal', rng, freq(key, 7, 2), 0.12), 0, 0.6);
      add(x, note('terminal', rng, freq(key, 4, 2), 0.16), sec(0.13), 0.55);
      return x;
    }
    case 'neon': { // a soft notification: two glass notes, up
      const x = buf(1.0);
      add(x, note('neon', rng, freq(key, 4, 2), 0.5), 0, 0.5);
      add(x, note('neon', rng, freq(key, 7, 2), 0.7), sec(0.11), 0.45);
      return svf(x, 'lp', 3500, 0.7);
    }
  }
}

/** Seconds after the post's start at which the writer's motif comes in. */
export const MOTIF_AT: Record<Palette, number> = { ledger: 1.05, gaslight: 0.95, chrome: 0.95, terminal: 0.45, neon: 0.5 };

/** One watch tick (v 0) or tock (v 1): a small, close metal tick. */
function watchTick(rng: Rng, v: number): Float32Array {
  const f = v % 2 ? 1900 : 2350;
  const x = modal(sec(0.05), f, [[1, 1, 0.014], [1.62, 0.45, 0.009], [2.4, 0.15, 0.005]], SR, rng);
  return add(x, noiseBurst(rng, 'bp', 2600, 1.4, 0.0004, 0.004), 0, 0.25);
}

/** M4: a coin put down on a wooden counter: a short spin (rising rattle), two small bounces, a settle. */
function coin(rng: Rng): Float32Array {
  const x = buf(0.5);
  const ring = (f: number, d: number) => modal(sec(d + 0.02), f, [[1, 1, d], [1.52, 0.5, d * 0.7], [2.18, 0.25, d * 0.4]], SR, rng);
  add(x, knock(rng, 520, 0.05), 0, 0.35);                 // the wood
  add(x, ring(2350 + 80 * rng(), 0.22), 0, 0.5);
  let t = 0.09, g = 0.4;
  for (let k = 0; k < 7; k++) { add(x, ring(2350 + 60 * rng(), 0.05), sec(t), g); t += 0.045 * Math.pow(0.82, k); g *= 0.8; }
  return svf(x, 'lp', 4200, 0.7);
}

/* ------------------------------------------------------------------ */
/* M5: the Ministry (physical sounds, the same in every palette)       */
/* ------------------------------------------------------------------ */

/** A crowd: `nv` voices of bandpassed noise, each shaped by its own syllable envelope (random targets every 0.1–0.3 s),
 *  formants between f0 and f1. Low and close: a murmur; high and loud: a cheer. */
function crowd(rng: Rng, dur: number, nv: number, f0: number, f1: number): Float32Array {
  const n = sec(dur), x = new Float32Array(n);
  for (let k = 0; k < nv; k++) {
    const v = svf(pink(n, rng), 'bp', f0 + (f1 - f0) * rng(), 2.2);
    let a = 0, b = rng(), j = 0, len = 1;
    for (let i = 0; i < n; i++) {
      if (--len <= 0) { a = b; b = rng() < 0.3 ? 0 : rng(); len = sec(0.1 + 0.2 * rng()); j = len; }
      x[i] += v[i] * (b + (a - b) * (len / j));
    }
  }
  return x;
}

/** A footstep on boards: the heel's knock and the toe's after it. */
function step(rng: Rng): Float32Array {
  const x = buf(0.16);
  add(x, thump(rng, 95, 0.09, 0.9), 0, 0.7);
  add(x, noiseBurst(rng, 'lp', 900, 0.8, 0.001, 0.04), sec(0.055), 0.3);
  return x;
}

/** A rubber stamp brought down on paper over a desk; `heavy` lower and fuller. */
function stamp(rng: Rng, heavy = 1): Float32Array {
  const x = buf(0.45);
  add(x, thump(rng, 130 / heavy, 0.22 * heavy, 0.9), 0, 0.8);
  add(x, knock(rng, 520 / heavy, 0.07), 0, 0.4);
  add(x, noiseBurst(rng, 'lp', 1700, 0.7, 0.001, 0.05), 0, 0.35);
  return x;
}

/** A child's two-note street cry ("Ex-tra!"), a minor third down, through a formant pair; `f` the first note. */
function cry(rng: Rng, f: number): Float32Array {
  const n = sec(1.05);
  const x = osc(n, (i) => { const t = i / SR; return (t < 0.3 ? f : f * 0.84 * (1 - 0.06 * Math.max(0, t - 0.5))) * (1 + 0.012 * Math.sin(t * 34)); }, 'saw', rng());
  const a = svf(Float32Array.from(x), 'bp', (i) => (i < sec(0.3) ? 520 : 820), 4), b = svf(x, 'bp', (i) => (i < sec(0.3) ? 1900 : 1250), 5);
  add(a, b, 0, 0.6);
  return svf(envPts(a, [[0, 0], [0.03, 1], [0.24, 0.8], [0.3, 0.2], [0.34, 1], [0.8, 0.7], [1.05, 0]]), 'lp', 2600, 0.7);
}

/** One wooden strike with a short room (the gavel, a door). */
const strike = (rng: Rng, f: number, d: number) => add(add(knock(rng, f, d), thump(rng, f * 0.4, d * 1.6, 0.5), 0, 0.6), noiseBurst(rng, 'lp', 2400, 0.8, 0.0005, 0.015), 0, 0.3);

function ui(p: Palette, kind: string, c: RecipeCtx): Float32Array {
  const { rng, key, v } = c;
  if (kind.startsWith('motif.')) return motif(p, rng, key, kind.slice(6));
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
    /* --- M3 --- */
    case 'seam': return W.seamSink(c);
    case 'letter': return post(p, rng, key);
    case 'letterOpened': {
      if (p === 'terminal') return svf(gesture('terminal', rng, 1), 'lp', 2000, 0.7);
      if (p === 'neon') return svf(gesture('neon', rng, 0), 'lp', 2400, 0.7);
      const x = buf(0.6);
      add(x, paper(rng, 0.22, 700, 1600), 0, 0.6);
      add(x, paper(rng, 0.3, 1100, 2300), sec(0.18), 0.5);
      return x;
    }
    case 'answer': { // a decision made: pen and stamp, a key, a press
      const x = buf(1.3);
      if (p === 'ledger' || p === 'gaslight') { add(x, penStroke(rng, 0.38), 0, 0.6); add(x, commit(p, rng), sec(0.42), 0.8); }
      else add(x, commit(p, rng), 0, 0.9);
      add(x, note(p, rng, freq(key, 0, 2), 0.6), sec(p === 'ledger' || p === 'gaslight' ? 0.5 : 0.1), 0.35);
      return x;
    }
    case 'letterExpired': // put away unanswered: a drawer's soft slide, nothing more
      return svf(paper(rng, 0.45, 500, 800), 'lp', 1000, 0.7);
    case 'bite': { // the lever's own voice gone sour (used when the page names no lever)
      const x = buf(1.4);
      const f = freq(key, 4, 2);
      add(x, note(p, rng, f, 1.1), 0, 0.5);
      add(x, note(p, rng, f * 1.035, 1.1), sec(0.012), 0.45);
      add(x, note(p, rng, freq(key, 3, 2) * 0.985, 0.9), sec(0.3), 0.4);
      return svf(x, 'lp', 3000, 0.7);
    }
    case 'survey': { // the household return published: a ledger page, a clock's tick, one note
      const x = buf(3.2);
      add(x, paper(rng, 0.6, 900, 2600), 0, 0.55);
      for (let i = 0; i < 4; i++) add(x, svf(knock(rng, i % 2 ? 1500 : 1800, 0.03), 'lp', 3000, 0.7), sec(0.75 + 0.5 * i), 0.4);
      add(x, note(p, rng, freq(key, 0, 2), 1.2), sec(2.75), 0.3);
      return x;
    }
    case 'proprietor': { // the Proprietor's Day: the lid of his watch, its hurry, a considered chord, the lid shut
      const x = buf(5.2);
      add(x, knock(rng, 2100, 0.03, true), 0, 0.5);
      add(x, knock(rng, 1350, 0.03, true), sec(0.02), 0.35);
      for (let t = 0.18, k = 0; t < 3.85; t += 0.2, k++) add(x, watchTick(rng, k), sec(t), 0.28 + 0.04 * (k % 2));
      add(x, chord(rng, key, [0, 2, 4], 3.6, 1, 1.0, 0.25), sec(0.7), 0.3);
      add(x, note(p, rng, freq(key, 4, 2), 1.2), sec(1.2), 0.35);
      add(x, note(p, rng, freq(key, 2, 2), 1.6), sec(2.1), 0.3);
      add(x, knock(rng, 1700, 0.04, true), sec(3.95), 0.55);
      add(x, knock(rng, 1100, 0.05, true), sec(3.97), 0.4);
      return svf(x, 'lp', 4500, 0.6);
    }
    case 'ending': { // the first ending: a bell, the chord opening slowly, the palette's voice, and a bird
      const x = buf(8);
      add(x, bell(rng, freq(key, 0, 1), 6, 0.7), 0, 0.45);
      add(x, chord(rng, key, [0, 4, 7], 7.6, 1, 2.4, 0.25), sec(0.3), 0.32);
      add(x, arp(p, rng, key, [0, 2, 4, 7, 9], 0.45, 1.2, 2, 2.2), sec(1.2), 0.32);
      add(x, birdPhrase(rng, 1), sec(4.6), 0.18);
      return svf(x, 'lp', 4500, 0.6);
    }
    case 'ledgerContinues': {
      const x = buf(1.4);
      if (p === 'ledger' || p === 'gaslight') add(x, penStroke(rng, 0.32), 0, 0.5);
      else add(x, gesture(p, rng, 2), 0, 0.5);
      add(x, note(p, rng, freq(key, 0, 2), 1.0), sec(0.3), 0.4);
      return x;
    }
    case 'arrived': { // something has arrived: the palette's gesture, then up a fourth to the octave
      const x = buf(1.3);
      add(x, gesture(p, rng, 1), 0, 0.35);
      add(x, note(p, rng, freq(key, 4, 2), 0.6), sec(0.06), 0.5);
      add(x, note(p, rng, freq(key, 7, 2), 0.9), sec(0.2), 0.5);
      return x;
    }
    case 'history': { // a line ruled off, then a small cadence
      const x = buf(2.0);
      add(x, penStroke(rng, 0.5), 0, 0.5);
      add(x, arp(p, rng, key, [0, 4, 7], 0.16, 0.7, 2, 1.4), sec(0.45), 0.5);
      return x;
    }
    /* --- M4 --- */
    case 'wager': { // a coin on the counter (a spin, two bounces, settling), then one note: won on the fifth, lost a fifth below
      const x = buf(1.6);
      add(x, coin(rng), 0, 0.7);
      const won = v % 2 === 0;
      add(x, note(p, rng, freq(key, won ? 4 : 0, 2), won ? 0.8 : 0.9), sec(0.42), won ? 0.5 : 0.42);
      return svf(x, 'lp', 4200, 0.7);
    }
    case 'actEnding': { // an Act's ending: the first ending's shape, slower and lower, the chord held longer
      const x = buf(11.5);
      add(x, bell(rng, freq(key, 0, 1), 8, 0.6), 0, 0.45);
      add(x, bell(rng, freq(key, 4, 1), 6, 0.5), sec(2.4), 0.22);
      add(x, chord(rng, key, [0, 4, 7], 10.8, 1, 3.6, 0.22), sec(0.4), 0.32);
      add(x, arp(p, rng, key, [0, 2, 4, 7, 9, 11], 0.7, 1.4, 2, 2.4), sec(2.0), 0.3);
      add(x, birdPhrase(rng, 1), sec(8.2), 0.16);
      return svf(x, 'lp', 4000, 0.6);
    }
    case 'arrears': { // a muffled toll: a low bell struck twice, behind a wall
      const x = buf(5.2);
      add(x, bell(rng, freq(key, 0, 1), 3.4, 0.5), 0, 0.6);
      add(x, bell(rng, freq(key, 0, 1), 3.0, 0.5), sec(1.9), 0.48);
      add(x, thump(rng, 70, 0.6, 0.2), 0, 0.3);
      return svf(x, 'lp', 900, 0.7);
    }
    /* --- M5: the Ministry --- */
    case 'officeTaken': { // the paper boy's cry in the street below, twice (the second further off), then the room's clock
      const x = buf(3.6);
      add(x, cry(rng, 440 + 30 * rng()), 0, 0.7);
      add(x, svf(cry(rng, 430), 'lp', 1400, 0.7), sec(1.45), 0.4);
      add(x, svf(crowd(rng, 2.6, 4, 300, 700), 'lp', 900, 0.7), 0, 0.06);
      add(x, watchTick(rng, 0), sec(2.9), 0.25);
      add(x, watchTick(rng, 1), sec(3.35), 0.2);
      return svf(x, 'lp', 3000, 0.7);
    }
    case 'electionCalled': // a murmur rises and settles
      return envPts(crowd(rng, 3.4, 7, 260, 820), [[0, 0], [1.2, 1], [2.4, 0.7], [3.4, 0]]);
    case 'electionWon': case 'electionLost': { // the count bell, then a cheer (won) or a door closing on the room (lost)
      const won = kind === 'electionWon', x = buf(won ? 4.4 : 3.6);
      add(x, bell(rng, freq(key, won ? 4 : 0, 2), 2.2, 0.8), 0, 0.5);
      if (won) {
        add(x, envPts(crowd(rng, 3.2, 9, 700, 2300), [[0, 0], [0.5, 1], [1.6, 0.8], [3.2, 0]]), sec(1.0), 0.8);
        for (let t = 1.2; t < 3.9; t += 0.025 + 0.08 * rng()) add(x, noiseBurst(rng, 'bp', 1100 + 900 * rng(), 1.2, 0.001, 0.025), sec(t), 0.25 * (1 - (t - 1.2) / 3));
      } else {
        add(x, envPts(crowd(rng, 1.6, 5, 280, 700), [[0, 0], [0.3, 1], [1.6, 0]]), sec(0.9), 0.5);
        add(x, strike(rng, 210, 0.2), sec(2.4), 0.8);
        add(x, knock(rng, 1500, 0.05, true), sec(2.45), 0.25);
      }
      return svf(x, 'lp', 3600, 0.7);
    }
    case 'inspected': { // the Inspector's footsteps, coming closer, then a stamp
      const x = buf(2.7);
      for (let i = 0; i < 4; i++) add(x, step(rng), sec(0.47 * i + 0.02 * rng()), 0.35 + 0.15 * i);
      add(x, stamp(rng), sec(2.15), 0.9);
      return x;
    }
    case 'concealmentFound': return stamp(rng, 1.35);   // the second stamp, heavier
    case 'lobbied': { // a hoarding pasted up: three wet strokes of the brush, the sheet slapped flat
      const x = buf(2.2);
      for (let i = 0; i < 3; i++) add(x, paper(rng, 0.42, 500, 1300), sec(0.5 * i), 0.7);
      add(x, noiseBurst(rng, 'lp', 1100, 0.7, 0.002, 0.08, 0.15, 'p'), sec(1.65), 0.6);
      return svf(x, 'lp', 3200, 0.7);
    }
    case 'litigated': return strike(rng, 380, 0.18);   // one gavel
    case 'loopholeUsed': { // a side door: the latch, a creak, the latch
      const x = buf(1.5);
      add(x, knock(rng, 1350, 0.04, true), 0, 0.4);
      for (let t = 0.12; t < 0.9; t += 0.006 + 0.012 * rng()) add(x, knock(rng, 600 + 260 * Math.sin(t * 5), 0.02), sec(t), 0.18);
      add(x, knock(rng, 1250, 0.05, true), sec(1.15), 0.5);
      return svf(x, 'lp', 3000, 0.7);
    }
    case 'loopholeClosed': { // a quill, then the blotter rocked over it
      const x = buf(1.9);
      add(x, penStroke(rng, 0.7), 0, 0.6);
      add(x, noiseBurst(rng, 'lp', 520, 0.7, 0.12, 0.3, 0.45, 'b'), sec(0.85), 0.8);
      add(x, noiseBurst(rng, 'lp', 520, 0.7, 0.12, 0.3, 0.45, 'b'), sec(1.3), 0.6);
      return x;
    }
    case 'treaty': { // a signature, the seal pressed, then a slow cadence in the palette over a held chord
      const x = buf(6.4);
      add(x, penStroke(rng, 1.0), 0, 0.55);
      add(x, stamp(rng, 1.2), sec(1.15), 0.7);
      add(x, chord(rng, key, [0, 4, 7], 4.8, 1, 1.2, 0.25), sec(1.4), 0.3);
      add(x, arp(p, rng, key, [4, 2, 0, 7], 0.42, 1.0, 2, 2.2), sec(1.5), 0.42);
      return svf(x, 'lp', 4000, 0.7);
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
  winder: ({ rng, key, v }) => { // pithead bell, then the drum runs up, holds and runs down (deeper seams: a longer run)
    const run = 7.5 + 1.8 * v;
    const x = buf(2 + run);
    add(x, bell(rng, freq(key, 0, 3), 1.0, 1.2), 0, 0.35);
    add(x, bell(rng, freq(key, 0, 3), 1.0, 1.2), sec(0.45), 0.3);
    const n = sec(run);
    const sp = (i: number) => { const t = i / SR; return Math.min(1, t / 2.2) * Math.min(1, Math.max(0, (run - 0.2 - t) / 2.2)); };
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
  carHorn: ({ rng, key, v }) => { // a horn in a jam: one toot, two, or a long one; two notes a third apart
    const x = buf(1.2);
    const toots = v % 3 === 0 ? [[0, 0.22]] : v % 3 === 1 ? [[0, 0.12], [0.2, 0.14]] : [[0, 0.55]];
    for (const [t, d] of toots) {
      const y = new Float32Array(sec(d));
      for (const dg of [2, 4]) add(y, osc(y.length, freq(key, dg, 2), 'saw', rng()), 0, 0.5);
      svf(y, 'lp', 1600, 0.8);
      envPts(y, [[0, 0], [0.012, 1], [d - 0.03, 0.9], [d, 0]]);
      add(x, y, sec(t), 0.7);
    }
    return x;
  },

  // Compute
  tick: ({ rng, v }) => add(modal(sec(0.03), 1500 + 260 * v, [[1, 1, 0.018], [1.6, 0.5, 0.01], [2.3, 0.25, 0.006]], SR, rng), noiseBurst(rng, 'bp', 2000, 1.5, 0.0005, 0.004), 0, 0.2),
  beep: ({ rng, key, v }) => { const x = buf(0.3); add(x, note('terminal', rng, freq(key, 0, 3), 0.1), 0, 1); if (v % 2) add(x, note('terminal', rng, freq(key, 4, 3), 0.1), sec(0.11), 0.8); return x; },
  throb: ({ rng, key }) => { const x = osc(sec(0.6), freq(key, 0, 1), 'sine'); add(x, osc(sec(0.6), freq(key, 0, 2), 'sine'), 0, 0.6); envAD(x, 0.04, 0.5); return add(x, noiseBurst(rng, 'lp', 220, 0.7, 0.03, 0.3, 0.5, 'b'), 0, 0.3); },
  alarm: ({ rng, key }) => { const x = buf(2.2); for (let i = 0; i < 9; i++) if (i % 3 !== 2) add(x, note('terminal', rng, freq(key, 7, 2), 0.14), sec(0.22 * i), 0.6); return x; },
  whoosh: ({ rng }) => noiseBurst(rng, 'bp', (i) => 400 + 1000 * (i / sec(2)), 1.2, 0.8, 1.2, 2.2, 'p'),
  // M3: the till that rings for what is still paid for, and the one that does not
  till: ({ rng, key, v }) => {
    const x = buf(1.0);
    add(x, knock(rng, 950 + 80 * v, 0.03, true), 0, 0.5);
    add(x, svf(bell(rng, freq(key, 4, 3), 0.8, 0.6), 'lp', 4000, 0.7), sec(0.05), 0.4);
    add(x, noiseBurst(rng, 'lp', 900, 0.7, 0.02, 0.18, 0.25, 'p'), sec(0.12), 0.35);
    add(x, thump(rng, 130, 0.12, 0.5), sec(0.33), 0.35);
    return x;
  },
  tillKey: ({ rng, v }) => { // the same key and drawer, and where the bell would be, nothing: a spring's small twang
    const x = buf(0.8);
    add(x, knock(rng, 950 + 80 * v, 0.03, true), 0, 0.5);
    const sp = osc(sec(0.16), (i) => 620 * (1 + 0.05 * Math.sin(i / 40)), 'sine', rng());
    envAD(sp, 0.002, 0.14);
    add(x, sp, sec(0.06), 0.12);
    add(x, noiseBurst(rng, 'lp', 900, 0.7, 0.02, 0.18, 0.25, 'p'), sec(0.12), 0.35);
    add(x, thump(rng, 130, 0.12, 0.5), sec(0.33), 0.35);
    return x;
  },
  watchTick: ({ rng, v }) => watchTick(rng, v),
  seamSink: ({ rng, key, v }) => { // a seam sunk: the blast underground, the cage bell, a pump stroke rising (deeper: lower)
    const x = buf(4.6);
    const f = 50 - 4 * v;
    add(x, thump(rng, f, 1.8, 0.2), 0, 0.55);
    // The blast heard through rock: a muffled crack in the low mids (what a phone speaker can carry), then the rumble.
    add(x, noiseBurst(rng, 'bp', 420 - 40 * v, 0.9, 0.003, 0.35, 0.5, 'p'), 0, 0.55);
    add(x, knock(rng, 230 - 15 * v, 0.25), sec(0.01), 0.35);
    const rum = svf(brown(sec(2.6), rng), 'bp', 300 - 30 * v, 0.6);
    envPts(rum, [[0, 0], [0.04, 1], [0.6, 0.6], [2.6, 0]]);
    add(x, rum, sec(0.02), 0.6);
    add(x, svf(bell(rng, freq(key, 0, 3), 0.9, 1.0), 'lp', 3000, 0.7), sec(1.5), 0.22);
    add(x, svf(bell(rng, freq(key, 0, 3), 0.9, 1.0), 'lp', 3000, 0.7), sec(1.85), 0.18);
    const st = svf(brown(sec(1.8), rng), 'bp', (i) => (110 - 8 * v) + (300 - 20 * v) * (i / sec(1.8)), 1.4);
    envPts(st, [[0, 0], [1.0, 1], [1.5, 0.8], [1.8, 0]]);
    add(x, st, sec(2.3), 0.6);
    for (let k = 0; k < 4; k++) add(x, knock(rng, 560 + 40 * k, 0.05, true), sec(2.45 + 0.28 * k), 0.12);
    return svf(x, 'hp', 70, 0.7);
  },
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

  /* --- M4 Iron & Steel --- */
  dropHammer: ({ rng, key, v }) => { // the blow: a deep thud, the anvil's ring in key, the scale flying
    const x = buf(1.3);
    add(x, thump(rng, 66 + 4 * v, 0.55, 0.7), 0, 0.85);
    add(x, svf(knock(rng, 180 + 15 * v, 0.2), 'lp', 900, 0.7), sec(0.004), 0.5);
    add(x, modal(sec(1.1), freq(key, 0, 3), [[1, 1, 0.9], [2.76, 0.35, 0.45], [5.4, 0.1, 0.2]], SR, rng), sec(0.006), 0.18);
    add(x, noiseBurst(rng, 'bp', 1800, 0.9, 0.001, 0.05), 0, 0.25);
    return svf(x, 'lp', 3600, 0.7);
  },
  furnaceTap: ({ rng }) => { // tapping the furnace: a rising hiss as the iron runs, a shower of sparks, then the runner
    const d = 7, n = sec(d);
    const x = new Float32Array(n);
    const hiss = svf(white(n, rng), 'bp', (i) => 600 + 1700 * Math.min(1, i / sec(3.2)), 0.8);
    envPts(hiss, [[0, 0], [3.0, 1], [5.0, 0.8], [d, 0]]);
    add(x, hiss, 0, 0.45);
    const roar = svf(brown(n, rng), 'bp', 240, 0.7);
    envPts(roar, [[0, 0], [1.5, 0.6], [4, 1], [d, 0]]);
    add(x, roar, 0, 0.6);
    // The sparks: a granular shower, densest just after the hiss tops out, each grain a tiny metal ping.
    for (let k = 0; k < 140; k++) {
      const t = 2.0 + Math.pow(rng(), 1.6) * 4.2;
      const g = gauss(t, 3.2, 1.0) * (0.25 + 0.5 * rng());
      const f = 1900 + 2200 * rng();
      add(x, modal(sec(0.03), f, [[1, 1, 0.012], [1.7, 0.4, 0.006]], SR, rng), sec(t), g * 0.5);
    }
    return svf(x, 'lp', 4600, 0.7);
  },
  rollingMill: ({ rng, key, v }) => { // a bar through the rolls: the rumble, a pitched squeal in key, the clank at each end
    const d = 6, n = sec(d);
    const x = svf(brown(n, rng), 'bp', 190, 0.7);
    for (let i = 0; i < n; i++) x[i] *= 0.7 * gauss(i / SR, 3, 1.4);
    const f0 = freq(key, [4, 2, 7][v % 3], 4);
    const sq = osc(n, (i) => { const t = i / SR; return f0 * (0.97 + 0.04 * Math.min(1, t / 3) - 0.03 * Math.max(0, t - 4)) * (1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t)); }, 'tri', rng());
    svf(sq, 'bp', f0, 2.5);
    envPts(sq, [[0, 0], [1.2, 0], [1.9, 1], [4.3, 0.8], [5.2, 0], [d, 0]]);
    add(x, sq, 0, 0.18);
    add(x, svf(knock(rng, 260, 0.18, true), 'lp', 1800, 0.7), sec(1.1), 0.5);
    add(x, svf(knock(rng, 240, 0.2, true), 'lp', 1800, 0.7), sec(5.0), 0.45);
    return x;
  },
  rivets: ({ rng, v }) => { // a riveter's train of blows (ticking metal), one or two runs
    const x = buf(2.6);
    const runs = 1 + (v % 2);
    let t = 0.02;
    for (let r = 0; r < runs; r++) {
      const n = 9 + Math.floor(rng() * 8), gap = 0.06 + 0.015 * rng(), f = 1500 + 350 * rng();
      for (let k = 0; k < n; k++) add(x, knock(rng, f * (1 + 0.02 * (rng() - 0.5)), 0.025, true), sec(t + k * gap), 0.5 * (0.7 + 0.3 * rng()) * (k === n - 1 ? 1.3 : 1));
      t += n * gap + 0.45 + 0.3 * rng();
    }
    return svf(x, 'lp', 3600, 0.7);
  },
  canClatter: ({ rng }) => { // tin cans down a chute: light metal knocks tumbling, slowing
    const x = buf(1.4);
    let t = 0.01;
    for (let k = 0; k < 10; k++) { add(x, modal(sec(0.12), 1100 + 900 * rng(), [[1, 1, 0.08], [2.3, 0.5, 0.05], [3.9, 0.2, 0.03]], SR, rng), sec(t), 0.5 * (0.6 + 0.4 * rng())); t += 0.05 + 0.06 * rng() + 0.012 * k; }
    return svf(x, 'lp', 3800, 0.7);
  },
  nightjar: ({ rng, v }) => { // the nightjar's churr: a long dry trill on two pitches, rising and falling
    const d = 3.2 + 0.8 * (v % 2), n = sec(d);
    const f = (i: number) => { const t = i / SR; return (t % 1.6 < 1.0 ? 1350 : 1150) * (1 + 0.01 * Math.sin(t * 3)); };
    const x = osc(n, f, 'sine', rng());
    for (let i = 0; i < n; i++) x[i] *= Math.pow(Math.max(0, Math.sin((2 * Math.PI * 28 * i) / SR)), 2);
    envPts(x, [[0, 0], [0.3, 1], [d - 0.4, 0.9], [d, 0]]);
    return svf(x, 'lp', 2800, 0.7);
  },
  ironAlarm: ({ rng, key }) => { // the works bell rung fast, in key: The Orange Night
    const x = buf(4);
    for (let i = 0; i < 10; i++) add(x, bell(rng, freq(key, 0, 3), 0.7, 1.0), sec(0.26 * i + 0.01 * rng()), 0.42 * (i < 8 ? 1 : 0.7));
    return svf(x, 'lp', 3800, 0.7);
  },
  roarSwell: ({ rng }) => { // the furnaces' roar rising over the town
    const n = sec(8);
    const x = svf(brown(n, rng), 'bp', (i) => 160 + 160 * Math.min(1, i / sec(3)), 0.7);
    add(x, svf(pink(n, rng), 'bp', 600, 0.8), 0, 0.12);
    return envPts(x, [[0, 0], [2.6, 1], [5, 0.85], [8, 0]]);
  },

  /* --- M4 Fishing --- */
  bellBuoy: ({ rng, key, v }) => { // a bell buoy on the swell: two or three strokes, unevenly, as the buoy rolls
    const x = buf(5.5);
    const strokes = 2 + (v % 2);
    let t = 0;
    for (let k = 0; k < strokes; k++) { add(x, bell(rng, freq(key, v === 2 ? 4 : 0, 2), 3.2, 0.9), sec(t), 0.5 * (0.7 + 0.3 * rng())); t += 0.55 + 0.6 * rng(); }
    return svf(x, 'lp', 3400, 0.7);
  },
  gull: ({ rng, v }) => { // a herring gull: a long call, or the laughing run
    const x = buf(2.4);
    const call = (f: number, d: number, g: number, at: number) => {
      const n = sec(d);
      const y = osc(n, (i) => { const t = i / n; return f * (1.25 - 0.45 * t + 0.08 * Math.sin(t * 9)); }, 'saw', rng());
      svf(y, 'bp', f * 1.2, 2.2);
      add(y, osc(n, (i) => f * (1.25 - 0.45 * (i / n)), 'sine', rng()), 0, 0.3);
      envPts(y, [[0, 0], [d * 0.12, 1], [d * 0.6, 0.7], [d, 0]]);
      add(x, y, sec(at), g);
    };
    const base = 1250 + 400 * rng();
    if (v % 3 === 0) call(base, 0.55, 0.8, 0);                                           // the long call
    else if (v % 3 === 1) { for (let k = 0; k < 5; k++) call(base * (1 - 0.03 * k), 0.16, 0.7 - 0.08 * k, 0.21 * k); } // the laugh
    else { call(base * 1.1, 0.22, 0.7, 0); call(base, 0.3, 0.6, 0.35); }                // two notes
    return svf(x, 'lp', 4200, 0.7);
  },
  porpoise: ({ rng }) => { // a porpoise surfacing: a sharp breath out, a quick breath in
    const x = buf(1.0);
    add(x, noiseBurst(rng, 'bp', 1100, 0.9, 0.006, 0.16, 0.25, 'p'), 0, 0.8);
    add(x, noiseBurst(rng, 'lp', 420, 0.7, 0.01, 0.12, 0.2, 'b'), 0, 0.35);
    add(x, noiseBurst(rng, 'bp', 1500, 1.2, 0.05, 0.1, 0.2, 'p'), sec(0.28), 0.3);
    return x;
  },
  shoalSplash: ({ rng }) => { // a shoal breaking the surface: a scatter of small splashes
    const x = buf(1.4);
    for (let k = 0; k < 14; k++) add(x, noiseBurst(rng, 'bp', 1400 + 1800 * rng(), 1.4, 0.002, 0.04 + 0.04 * rng()), sec(Math.pow(rng(), 1.4) * 1.0), 0.4 * (0.5 + 0.5 * rng()));
    return svf(x, 'lp', 4200, 0.7);
  },
  trawler: ({ rng, v }) => { // a steam trawler's engine across the water: a soft low chuff
    const x = buf(0.6);
    add(x, noiseBurst(rng, 'bp', 520 + 50 * v, 1.0, 0.01, 0.22, 0.32, 'p'), 0, 0.6);
    add(x, thump(rng, 92 + 6 * v, 0.2, 0.2), 0, 0.5);
    return svf(x, 'lp', 1300, 0.7);
  },
  winch: ({ rng, v }) => { // a steam capstan hauling the trawl: the pawl's ratchet quickening, a hiss of steam
    const d = 3.4, x = buf(d);
    let t = 0.05, gap = 0.16;
    while (t < 2.6) { add(x, knock(rng, 880 + 60 * v + 40 * rng(), 0.03, true), sec(t), 0.4); t += gap; gap = Math.max(0.07, gap * 0.94); }
    const st = noiseBurst(rng, 'bp', 1300, 0.9, 0.3, 1.6, 2.4, 'p');
    add(x, st, sec(0.3), 0.3);
    add(x, svf(brown(sec(2.6), rng), 'bp', 200, 0.8), sec(0.05), 0.25);
    return envPts(svf(x, 'lp', 3200, 0.7), [[0, 0], [0.04, 1], [d - 0.3, 1], [d, 0]]);
  },
  marketBell: ({ rng, key, v }) => { // the fish market's handbell: a run of quick strokes before the auction
    const x = buf(2.6);
    for (let k = 0; k < 7; k++) add(x, modal(sec(0.7), freq(key, v % 2 ? 4 : 0, 3), [[1, 1, 0.6], [2.0, 0.35, 0.35], [2.76, 0.25, 0.25], [5.4, 0.08, 0.12]], SR, rng), sec(0.17 * k + 0.02 * rng()), 0.45 * (k % 2 ? 0.75 : 1));
    return svf(x, 'lp', 3600, 0.7);
  },
  halyard: ({ rng, v }) => { // a halyard slapping a mast in the harbour, a block knocking
    const x = buf(1.3);
    const n = 1 + (v % 3);
    for (let k = 0; k < n; k++) {
      const t = k * (0.22 + 0.1 * rng());
      add(x, knock(rng, 640 + 120 * rng(), 0.06), sec(t), 0.5);
      add(x, knock(rng, 1700 + 300 * rng(), 0.04, true), sec(t + 0.004), 0.22);
    }
    return svf(x, 'lp', 3600, 0.7);
  },

  // M5 Plenty: a team at the plough (hooves in a walk on soft earth, the harness jingling) and the pump's stroke.
  plough: ({ rng, v }) => {
    const x = buf(2.6);
    for (let i = 0; i < 6; i++) {
      const t = 0.05 + i * 0.36 + 0.03 * rng();
      add(x, svf(thump(rng, 110 + 25 * rng(), 0.09, 1), 'lp', 900, 0.7), sec(t), 0.5 + 0.2 * ((i + v) % 2));
    }
    for (let t = 0.1; t < 2.2; t += 0.12 + 0.25 * rng()) add(x, modal(sec(0.12), 2300 + 900 * rng(), [[1, 1, 0.08], [1.48, 0.5, 0.05]], SR, rng), sec(t), 0.08);
    return x;
  },
  pumpThud: ({ rng, v }) => { // v 0: the down-stroke (a deep thud and the valve's clank); v 1: the lift (the water's gulp)
    const x = buf(1.2);
    if (v % 2 === 0) {
      add(x, thump(rng, 62, 0.5, 0.7), 0, 0.9);
      add(x, knock(rng, 310, 0.12, true), sec(0.02), 0.25);
    } else {
      add(x, thump(rng, 78, 0.25, 0.3), 0, 0.5);
      add(x, noiseBurst(rng, 'bp', (i) => 420 + 260 * Math.sin(i / 260), 2.5, 0.05, 0.4, 0.6, 'p'), sec(0.06), 0.7);
    }
    return svf(x, 'lp', 2200, 0.7);
  },

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
  if (name.startsWith('ui:')) { const [, p, kind] = name.split(':'); return (PALETTES as readonly string[]).includes(p) && ((UI_KINDS as readonly string[]).includes(kind) || (kind.startsWith('motif.') && kind.slice(6) in MOTIFS)); }
  return name in W;
}

export const WORLD_RECIPES: readonly string[] = /* @__PURE__ */ Object.keys(W);
