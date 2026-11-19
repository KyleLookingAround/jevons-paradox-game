// Soundscape definitions: one per Industry, as data (the sound equivalent of a scene Layout). The engine knows how to
// play a 'bed' (a continuous source through a filter) and 'hits' (transients from the recipe library, on the shared
// beat grid or at a seeded random rate); the definition says which layers exist, what they are made of, and which
// SceneView numbers drive them. Add an Industry by adding a def here (or registerSoundscape() from outside).
import { KEYS, type Key } from './music';
import type { Palette } from './recipes';

/** A source of a 0–1 number read from the view (see mix.ts for the exact meaning of each):
 *  'one' · 'pace' · 'pressure' · 'haze' · 'reserve' · 'pop' · 'stage' · 'built' · 'empty' · 'steady' · 'clear' ·
 *  'decoupling' · 'stress' · 'app:<icon or id>' · 'lever:<kind>' — prefixed 'inv:' for 1 − x, or
 *  'step<t>:<src>' for a soft step from 0 to 1 as <src> passes t (e.g. 'step0.5:reserve'). */
export type Src = string;

/** level = clamp(Σ weight × src) then × Π (1 − depth × (1 − src)) for each `mul` term; optional exponent. */
export interface Drive { add: [Src, number][]; mul?: [Src, number][]; pow?: number; max?: number }

interface LayerBase {
  id: string;
  /** Calibrated gain at level 1 (linear). */
  gain: number;
  level: Drive;
  /** Only sounds at these machine stages (crossfades as the stage changes). */
  stages?: number[];
  /** Cut out by rolling blackouts when stress > 0. */
  blackout?: boolean;
  /** Mechanical: speeds up with pace, winds down at a Reckoning. */
  mech?: boolean;
  /** Reverb send (0–1). Default 0.25. */
  send?: number;
  /** Distance: a fixed low-pass on the layer (Hz). */
  lp?: number;
  /** Playback-rate / frequency multiplier from a source: [src, at 0, at 1]. */
  pitch?: [Src, number, number];
}

export interface BedDef extends LayerBase {
  kind: 'bed';
  src: 'pink' | 'white' | 'brown' | 'tones';
  /** Scale degree, octave above the key's second octave, waveform, gain, detune (cents). */
  tones?: [number, number, OscillatorType, number, number?][];
  /** Absolute frequencies (mains hum): [Hz, waveform, gain]. */
  hz?: [number, OscillatorType, number][];
  filter?: [BiquadFilterType, number, number?];
  /** Filter frequency multiplier from a source: [src, at 0, at 1]. */
  tone?: [Src, number, number];
  /** Slow modulation: rate in Hz, or in beats when `beats` (locks to the pulse). */
  lfo?: { rate: number; beats?: boolean; depth: number; to: 'gain' | 'filter' };
  /** Two decorrelated sources spread left and right. */
  stereo?: boolean;
  pan?: number;
}

export interface HitsDef extends LayerBase {
  kind: 'hits';
  recipe: string;
  /** Number of seeded variants of the recipe (default 1). */
  variants?: number;
  /** On the pulse: one step every `every` beats; pattern = probability per step (cycled), × density. */
  grid?: { every: number; pattern?: number[]; jitter?: number };
  /** Off the pulse: mean events per second at density 1 (seeded exponential gaps). */
  rate?: number;
  /** Shortest gap between two hits of this layer (s). */
  minGap?: number;
  /** Scale degrees to choose from (the recipe is baked on the tonic). */
  notes?: number[];
  /** Pan range [lo, hi]. */
  pan?: [number, number];
  /** A pass-by: the pan travels from one side to the other over the sound's length. */
  sweep?: boolean;
  /** Density from its own drive (default: the level's drive). */
  density?: Drive;
}

export type LayerDef = BedDef | HitsDef;

export interface SoundscapeDef {
  id: string;
  key: Key;
  /** Beats per minute at pace 0 and pace 1: every rhythmic layer shares this pulse. */
  tempo: [number, number];
  /** Air: clean low-pass cutoff (Hz) and the base reverb send. */
  air: { bright: number; reverb: number };
  palette: Palette;
  layers: LayerDef[];
  /** The world's own crisis moment (played when SceneView.crises rises): a recipe over a low fog swell. */
  crisis: { recipe: string; gain: number };
  /** Layer ids that still sound, faint and distant, under later Industries (heritage). */
  trace: string[];
  /** Lever kind → recipe for its small signature (default 'lv.<kind>', else 'lv.generic'). */
  levers?: Record<string, string>;
}

const one = (w = 1): [Src, number] => ['one', w];

/* ------------------------------------------------------------------ */
/* Steam: a valley, one beam engine, then the mills                    */
/* ------------------------------------------------------------------ */
const steam: SoundscapeDef = {
  id: 'steam', key: KEYS.steam, tempo: [54, 84], air: { bright: 8000, reverb: 0.35 }, palette: 'ledger',
  layers: [
    { id: 'wind', kind: 'bed', src: 'pink', filter: ['bandpass', 520, 0.7], lfo: { rate: 0.07, depth: 0.5, to: 'filter' }, stereo: true,
      gain: 0.16, level: { add: [one(0.55), ['empty', 0.45]], mul: [['inv:pop', 0.3]] }, send: 0.1 },
    { id: 'birds', kind: 'hits', recipe: 'bird', variants: 6, rate: 0.55, minGap: 0.6, pan: [-0.8, 0.8],
      gain: 0.05, level: { add: [['empty', 0.6], one(0.25), ['steady', 0.7]], mul: [['inv:haze', 1], ['inv:pace', 0.4]], max: 1 }, send: 0.35 },
    // One engine voice per machine stage (Newcomen → Watt → high-pressure → turbine), from the first pump.
    { id: 'eng0', kind: 'hits', recipe: 'newcomen', grid: { every: 4 }, stages: [0], mech: true, pan: [-0.25, -0.15], lp: 3000,
      gain: 0.5, level: { add: [['app:pump', 1]] }, density: { add: [one(1)] }, send: 0.3 },
    { id: 'eng1', kind: 'hits', recipe: 'watt', grid: { every: 2 }, stages: [1], mech: true, pan: [-0.25, -0.15],
      gain: 0.45, level: { add: [['app:pump', 0.6], ['built', 0.6]] }, density: { add: [one(1)] }, send: 0.3 },
    { id: 'eng2', kind: 'hits', recipe: 'chuff', variants: 3, grid: { every: 0.5, pattern: [1, 0.7] }, stages: [2], mech: true, pan: [-0.3, -0.1],
      gain: 0.28, level: { add: [['app:pump', 0.5], ['built', 0.7]] }, density: { add: [one(1)] }, send: 0.25 },
    { id: 'eng3', kind: 'bed', src: 'tones', tones: [[0, 3, 'triangle', 0.5], [4, 3, 'sine', 0.3, 4], [0, 1, 'sine', 0.6]], filter: ['lowpass', 1800, 0.7],
      stages: [3], mech: true, pan: -0.2, gain: 0.05, level: { add: [['app:pump', 0.4], ['built', 0.8]] }, pitch: ['pace', 1, 1.06] },
    // The mills: a rhythmic bed of looms on the pulse over a rumble.
    { id: 'millRumble', kind: 'bed', src: 'brown', filter: ['lowpass', 240, 0.7], lfo: { rate: 1, beats: true, depth: 0.35, to: 'gain' }, mech: true, pan: 0.1,
      gain: 0.22, level: { add: [['app:mill', 1]] } },
    { id: 'looms', kind: 'hits', recipe: 'loom', variants: 4, grid: { every: 0.5, pattern: [1, 0.35, 0.8, 0.5], jitter: 0.012 }, mech: true, pan: [0, 0.35], lp: 2400,
      gain: 0.12, level: { add: [['app:mill', 1]] }, density: { add: [['app:mill', 1.1]] }, send: 0.25 },
    { id: 'winder', kind: 'hits', recipe: 'winder', rate: 1 / 28, minGap: 12, pan: [-0.5, -0.35], mech: true,
      gain: 0.14, level: { add: [['app:winder', 1]] } },
    { id: 'train', kind: 'hits', recipe: 'trainPass', rate: 1 / 25, minGap: 14, sweep: true, mech: true,
      gain: 0.3, level: { add: [['app:train', 1]] }, density: { add: [['app:train', 1.2], one(0.2)], mul: [['app:train', 1]] }, send: 0.3 },
    { id: 'horn', kind: 'hits', recipe: 'shipHorn', rate: 1 / 45, minGap: 25, pan: [0.55, 0.75], lp: 1500,
      gain: 0.16, level: { add: [['app:ship', 1]] }, send: 0.6 },
    { id: 'plough', kind: 'hits', recipe: 'chuffFar', variants: 2, grid: { every: 1, pattern: [0.8, 0.3, 0.6, 0] }, pan: [-0.8, -0.6], mech: true, lp: 1200,
      gain: 0.1, level: { add: [['app:plough', 1]] }, send: 0.4 },
    { id: 'town', kind: 'bed', src: 'brown', filter: ['bandpass', 380, 0.8], pan: 0.2, stereo: true,
      gain: 0.12, level: { add: [['pop', 0.8], ['built', 0.3]] } },
    { id: 'church', kind: 'hits', recipe: 'churchBell', rate: 1 / 70, minGap: 40, notes: [0, 4], pan: [0.3, 0.4], lp: 2500,
      gain: 0.08, level: { add: [['pop', 1]] }, send: 0.6 },
  ],
  crisis: { recipe: 'churchBell', gain: 0.25 },
  trace: ['millRumble', 'looms'],
};

/* ------------------------------------------------------------------ */
/* Light: dusk in the gaslit town                                      */
/* ------------------------------------------------------------------ */
const light: SoundscapeDef = {
  id: 'light', key: KEYS.light, tempo: [60, 90], air: { bright: 7000, reverb: 0.3 }, palette: 'gaslight',
  layers: [
    { id: 'dusk', kind: 'bed', src: 'pink', filter: ['bandpass', 420, 0.6], lfo: { rate: 0.05, depth: 0.4, to: 'filter' }, stereo: true,
      gain: 0.11, level: { add: [one(0.6), ['empty', 0.4]] }, send: 0.1 },
    { id: 'evening', kind: 'hits', recipe: 'bird', variants: 6, rate: 0.25, minGap: 1.2, pan: [-0.8, 0.8],
      gain: 0.04, level: { add: [['empty', 0.8], ['steady', 0.7]], mul: [['inv:haze', 1]], max: 1 }, send: 0.4 },
    { id: 'gas', kind: 'bed', src: 'pink', filter: ['bandpass', 2600, 0.9], stereo: true,
      gain: 0.035, level: { add: [['app:lamp', 0.8], ['app:house', 0.3]] } },
    { id: 'lamps', kind: 'hits', recipe: 'lampPop', rate: 0.22, minGap: 0.5, notes: [0, 2, 4, 7, 9], pan: [-0.7, 0.7],
      gain: 0.07, level: { add: [['app:lamp', 1]] }, density: { add: [['app:lamp', 0.8], ['app:house', 0.4]] }, send: 0.35 },
    { id: 'nightHum', kind: 'bed', src: 'tones', tones: [[0, 0, 'sawtooth', 0.4], [4, 0, 'sawtooth', 0.25, 5], [0, 1, 'sine', 0.4]], filter: ['lowpass', 420, 0.7],
      pan: -0.3, mech: true, gain: 0.04, level: { add: [['app:factory-night', 1]] } },
    { id: 'nightMill', kind: 'hits', recipe: 'loom', variants: 4, grid: { every: 0.5, pattern: [1, 0.3, 0.7, 0.3] }, mech: true, pan: [-0.45, -0.25], lp: 1100,
      gain: 0.1, level: { add: [['app:factory-night', 1]] } },
    { id: 'tram', kind: 'hits', recipe: 'tramPass', rate: 1 / 20, minGap: 9, sweep: true, mech: true,
      gain: 0.22, level: { add: [['app:tram', 1]] }, density: { add: [['app:tram', 1], one(0.25)], mul: [['app:tram', 1]] }, send: 0.3 },
    { id: 'piano', kind: 'hits', recipe: 'piano', variants: 6, rate: 1 / 30, minGap: 12, pan: [0.2, 0.5], lp: 2200,
      gain: 0.07, level: { add: [['app:house', 1]], mul: [['inv:pace', 0.5]] }, send: 0.4 },
    { id: 'signs', kind: 'bed', src: 'tones', hz: [[100, 'sawtooth', 0.5], [200, 'sine', 0.3]], filter: ['bandpass', 800, 1.2], pan: 0.35,
      gain: 0.025, level: { add: [['app:sign', 1]] }, blackout: true },
    { id: 'cabs', kind: 'hits', recipe: 'cabPass', rate: 1 / 16, minGap: 6, sweep: true,
      gain: 0.12, level: { add: [['pop', 0.7], ['built', 0.3]] }, send: 0.3 },
    { id: 'town', kind: 'bed', src: 'brown', filter: ['bandpass', 400, 0.8], stereo: true,
      gain: 0.11, level: { add: [['pop', 0.7], ['built', 0.4]] } },
  ],
  crisis: { recipe: 'fogHorn', gain: 0.28 },
  trace: ['gas', 'tram'],
};

/* ------------------------------------------------------------------ */
/* Motion: the open road, then the wash                                 */
/* ------------------------------------------------------------------ */
const motion: SoundscapeDef = {
  id: 'motion', key: KEYS.motion, tempo: [72, 110], air: { bright: 9000, reverb: 0.22 }, palette: 'chrome',
  layers: [
    { id: 'breeze', kind: 'bed', src: 'pink', filter: ['bandpass', 600, 0.6], lfo: { rate: 0.06, depth: 0.4, to: 'filter' }, stereo: true,
      gain: 0.1, level: { add: [one(0.5), ['empty', 0.5]], mul: [['inv:built', 0.6]] } },
    { id: 'birds', kind: 'hits', recipe: 'bird', variants: 6, rate: 0.3, minGap: 1, pan: [-0.8, 0.8],
      gain: 0.04, level: { add: [['empty', 0.6], one(0.15), ['steady', 0.6]], mul: [['inv:haze', 1]], max: 1 }, send: 0.3 },
    { id: 'wash', kind: 'bed', src: 'pink', filter: ['lowpass', 700, 0.6], tone: ['pace', 0.8, 2.6], stereo: true,
      gain: 0.16, level: { add: [['app:car', 0.8], ['app:van', 0.3], ['app:mall', 0.2], ['pop', 0.2]], pow: 0.8 } },
    { id: 'cars', kind: 'hits', recipe: 'carPass', variants: 5, rate: 0.18, minGap: 0.9, sweep: true, mech: true,
      gain: 0.17, level: { add: [['app:car', 1], ['app:suburb', 0.2]] }, density: { add: [['app:car', 1.4], ['pace', 0.4]], mul: [['app:car', 1]] } },
    { id: 'vans', kind: 'hits', recipe: 'vanPass', variants: 3, rate: 0.07, minGap: 2.5, sweep: true, mech: true,
      gain: 0.18, level: { add: [['app:van', 1]] } },
    { id: 'jet', kind: 'hits', recipe: 'jet', rate: 1 / 40, minGap: 20, pan: [-0.3, 0.3],
      gain: 0.13, level: { add: [['app:plane', 1]] }, send: 0.3 },
    { id: 'mall', kind: 'hits', recipe: 'chime', rate: 1 / 50, minGap: 25, pan: [0.4, 0.6], lp: 3500,
      gain: 0.07, level: { add: [['app:mall', 1]] }, send: 0.5 },
    { id: 'doors', kind: 'hits', recipe: 'doorThunk', rate: 1 / 8, minGap: 2, pan: [0.3, 0.7], lp: 1500,
      gain: 0.07, level: { add: [['app:mall', 1]] } },
    { id: 'mower', kind: 'hits', recipe: 'mower', rate: 1 / 35, minGap: 15, pan: [-0.7, -0.4], lp: 1400,
      gain: 0.06, level: { add: [['app:suburb', 1]], mul: [['inv:pace', 0.4]] } },
    { id: 'radio', kind: 'hits', recipe: 'radio', variants: 6, rate: 1 / 30, minGap: 12, pan: [-0.5, 0.5],
      gain: 0.035, level: { add: [['app:suburb', 1]] }, send: 0.25 },
    { id: 'hum', kind: 'bed', src: 'tones', tones: [[0, 0, 'sine', 0.6], [4, 0, 'sine', 0.3]], filter: ['lowpass', 300, 0.7],
      gain: 0.03, level: { add: [['built', 0.6], ['pace', 0.4]] }, pitch: ['pace', 1, 1.03] },
  ],
  crisis: { recipe: 'siren2', gain: 0.18 },
  trace: ['wash'],
};

/* ------------------------------------------------------------------ */
/* Compute: data halls in the country                                   */
/* ------------------------------------------------------------------ */
const compute: SoundscapeDef = {
  id: 'compute', key: KEYS.compute, tempo: [80, 120], air: { bright: 8000, reverb: 0.25 }, palette: 'terminal',
  layers: [
    { id: 'air', kind: 'bed', src: 'pink', filter: ['bandpass', 500, 0.6], lfo: { rate: 0.05, depth: 0.4, to: 'filter' }, stereo: true,
      gain: 0.09, level: { add: [one(0.5), ['empty', 0.5]] } },
    { id: 'birds', kind: 'hits', recipe: 'bird', variants: 6, rate: 0.2, minGap: 1.5, pan: [-0.8, 0.8],
      gain: 0.035, level: { add: [['empty', 0.5], ['steady', 0.8]], mul: [['inv:haze', 1]], max: 1 }, send: 0.3 },
    { id: 'fans', kind: 'bed', src: 'tones', tones: [[0, 1, 'triangle', 0.5], [0, 1, 'triangle', 0.45, 7], [4, 1, 'sine', 0.25, -5]], filter: ['lowpass', 900, 0.7],
      mech: true, pitch: ['pace', 1, 1.08], gain: 0.05, level: { add: [['built', 1]] }, blackout: true },
    { id: 'fanNoise', kind: 'bed', src: 'pink', filter: ['bandpass', 260, 1.4], stereo: true, tone: ['pace', 1, 1.6],
      gain: 0.12, level: { add: [['built', 0.9], ['pace', 0.2]] }, blackout: true },
    { id: 'cooling', kind: 'bed', src: 'brown', filter: ['lowpass', 500, 0.7], lfo: { rate: 0.13, depth: 0.4, to: 'gain' }, pan: 0.4,
      gain: 0.12, level: { add: [['app:cloud', 0.8], ['app:brain', 0.5]] } },
    { id: 'ticks', kind: 'hits', recipe: 'tick', variants: 5, grid: { every: 0.25, pattern: [0.9, 0.3, 0.6, 0.3, 0.8, 0.2, 0.5, 0.4], jitter: 0.004 }, notes: [0, 2, 4, 7], pan: [-0.6, 0.6], lp: 4500,
      gain: 0.05, level: { add: [['app:globe', 0.6], ['built', 0.5]] }, density: { add: [['app:globe', 0.6], ['app:play', 0.3], ['app:cloud', 0.3]] }, blackout: true, send: 0.15 },
    { id: 'mains', kind: 'bed', src: 'tones', hz: [[50, 'sine', 0.5], [100, 'sine', 0.6], [150, 'sine', 0.3], [200, 'sine', 0.12]], mech: false,
      pitch: ['haze', 1, 0.985], gain: 0.05, level: { add: [['built', 0.7], ['pace', 0.3]] } },
    { id: 'beeps', kind: 'hits', recipe: 'beep', variants: 2, rate: 0.12, minGap: 1.2, notes: [0, 2, 4, 7, 9], pan: [-0.5, 0.5],
      gain: 0.04, level: { add: [['app:sheet', 1]] }, blackout: true, send: 0.3 },
    { id: 'stream', kind: 'hits', recipe: 'whoosh', rate: 1 / 12, minGap: 5, pan: [-0.6, 0.6],
      gain: 0.06, level: { add: [['app:play', 1]] }, send: 0.4 },
    { id: 'train', kind: 'hits', recipe: 'throb', grid: { every: 1, pattern: [1, 0.6, 0.9, 0.6] }, mech: true, pan: [0.1, 0.2],
      gain: 0.1, level: { add: [['app:brain', 1]] }, blackout: true },
  ],
  crisis: { recipe: 'alarm', gain: 0.16 },
  trace: ['fans', 'fanNoise'],
};

/* ------------------------------------------------------------------ */
/* Code: the night city in rain                                         */
/* ------------------------------------------------------------------ */
const code: SoundscapeDef = {
  id: 'code', key: KEYS.code, tempo: [70, 100], air: { bright: 7500, reverb: 0.35 }, palette: 'neon',
  layers: [
    { id: 'rain', kind: 'bed', src: 'pink', filter: ['bandpass', 1500, 0.35], stereo: true,
      gain: 0.12, level: { add: [one(0.8), ['pop', 0.2]], mul: [['inv:steady', 0.92]] } },
    { id: 'drips', kind: 'hits', recipe: 'drip', variants: 5, rate: 1.2, minGap: 0.08, pan: [-0.9, 0.9],
      gain: 0.04, level: { add: [one(1)], mul: [['inv:steady', 0.9]] }, send: 0.4 },
    { id: 'pad', kind: 'bed', src: 'tones', tones: [[0, 1, 'sawtooth', 0.35, -6], [0, 1, 'sawtooth', 0.35, 6], [4, 1, 'sawtooth', 0.25, 3], [2, 2, 'sine', 0.3], [6, 1, 'sine', 0.2]],
      filter: ['lowpass', 520, 0.6], lfo: { rate: 0.035, depth: 0.35, to: 'filter' }, tone: ['clear', 1, 1.8],
      gain: 0.045, level: { add: [one(0.7), ['built', 0.3]] }, blackout: true, send: 0.5 },
    { id: 'neon', kind: 'bed', src: 'tones', hz: [[120, 'sawtooth', 0.5], [240, 'sine', 0.25]], filter: ['bandpass', 900, 1.5], pan: 0.3,
      gain: 0.02, level: { add: [['built', 0.6], ['pop', 0.4]] }, blackout: true },
    { id: 'flicker', kind: 'hits', recipe: 'neonTick', variants: 3, rate: 0.5, minGap: 0.1, pan: [-0.5, 0.6],
      gain: 0.04, level: { add: [['built', 0.6], ['pop', 0.3]] }, density: { add: [['haze', 1], one(0.15)], mul: [['inv:steady', 1]] }, blackout: true },
    { id: 'traffic', kind: 'bed', src: 'brown', filter: ['lowpass', 300, 0.7], stereo: true,
      gain: 0.12, level: { add: [['pop', 0.6], ['built', 0.4]] } },
    { id: 'elevated', kind: 'hits', recipe: 'elevated', rate: 1 / 30, minGap: 12, sweep: true, mech: true,
      gain: 0.2, level: { add: [['built', 0.6], ['pop', 0.4]] }, send: 0.35 },
    { id: 'drones', kind: 'hits', recipe: 'dronePass', variants: 3, rate: 1 / 10, minGap: 3, sweep: true,
      gain: 0.07, level: { add: [['app:chatbot', 0.6], ['app:robots', 0.8], ['app:phone-app', 0.3]] }, blackout: true },
    // The warm rooms of the old block, in the order they go dark (the first is the last left on).
    { id: 'room0', kind: 'hits', recipe: 'typing', rate: 1 / 14, minGap: 5, pan: [-0.15, -0.05], lp: 3500,
      gain: 0.05, level: { add: [['step0.02:reserve', 1]] }, send: 0.2 },
    { id: 'room1', kind: 'hits', recipe: 'pageTurn', rate: 1 / 16, minGap: 6, pan: [0.1, 0.2], lp: 3500,
      gain: 0.05, level: { add: [['step0.17:reserve', 1]] }, send: 0.2 },
    { id: 'room2', kind: 'hits', recipe: 'cupClink', rate: 1 / 18, minGap: 6, pan: [-0.35, -0.25], lp: 4000,
      gain: 0.035, level: { add: [['step0.33:reserve', 1]] }, send: 0.25 },
    { id: 'room3', kind: 'hits', recipe: 'guitar', variants: 4, rate: 1 / 20, minGap: 8, pan: [0.3, 0.4], lp: 3000,
      gain: 0.06, level: { add: [['step0.5:reserve', 1]] }, send: 0.3 },
    { id: 'room4', kind: 'hits', recipe: 'kettle', rate: 1 / 40, minGap: 20, pan: [-0.5, -0.4], lp: 2500,
      gain: 0.04, level: { add: [['step0.67:reserve', 1]] }, send: 0.2 },
    { id: 'room5', kind: 'hits', recipe: 'pencil', rate: 1 / 16, minGap: 6, pan: [0.45, 0.55], lp: 3500,
      gain: 0.03, level: { add: [['step0.83:reserve', 1]] }, send: 0.2 },
    { id: 'emergency', kind: 'bed', src: 'tones', tones: [[0, 3, 'triangle', 0.5], [2, 3, 'triangle', 0.5]], filter: ['lowpass', 1500, 0.7],
      lfo: { rate: 0.5, beats: true, depth: 0.9, to: 'gain' }, pan: 0.15, gain: 0.03, level: { add: [['stress', 1]] } },
    { id: 'night', kind: 'hits', recipe: 'owl', rate: 1 / 25, minGap: 12, pan: [-0.6, -0.3], lp: 1500,
      gain: 0.06, level: { add: [['steady', 1]] }, send: 0.5 },
  ],
  crisis: { recipe: 'outage', gain: 0.22 },
  trace: ['neon', 'rain'],
};

/* ------------------------------------------------------------------ */
/* Generic: any Industry without its own                               */
/* ------------------------------------------------------------------ */
const generic: SoundscapeDef = {
  id: 'generic', key: KEYS.generic, tempo: [60, 96], air: { bright: 8000, reverb: 0.3 }, palette: 'ledger',
  layers: [
    { id: 'wind', kind: 'bed', src: 'pink', filter: ['bandpass', 500, 0.7], lfo: { rate: 0.06, depth: 0.4, to: 'filter' }, stereo: true,
      gain: 0.13, level: { add: [one(0.6), ['empty', 0.4]] } },
    { id: 'birds', kind: 'hits', recipe: 'bird', variants: 6, rate: 0.35, minGap: 0.8, pan: [-0.8, 0.8],
      gain: 0.045, level: { add: [['empty', 0.6], one(0.2), ['steady', 0.7]], mul: [['inv:haze', 1]], max: 1 }, send: 0.35 },
    { id: 'drone', kind: 'bed', src: 'tones', tones: [[0, 1, 'triangle', 0.5], [4, 1, 'sine', 0.35]], filter: ['lowpass', 700, 0.7],
      mech: true, pitch: ['pace', 1, 1.04], gain: 0.035, level: { add: [['built', 1]] } },
    { id: 'works', kind: 'bed', src: 'brown', filter: ['lowpass', 260, 0.7], lfo: { rate: 1, beats: true, depth: 0.3, to: 'gain' }, mech: true,
      gain: 0.18, level: { add: [['built', 1]] } },
    { id: 'knocks', kind: 'hits', recipe: 'loom', variants: 4, grid: { every: 0.5, pattern: [1, 0.3, 0.6, 0.3] }, mech: true, pan: [-0.3, 0.3], lp: 2000,
      gain: 0.09, level: { add: [['built', 1]] } },
    { id: 'town', kind: 'bed', src: 'brown', filter: ['bandpass', 380, 0.8], stereo: true,
      gain: 0.11, level: { add: [['pop', 1]] } },
  ],
  crisis: { recipe: 'churchBell', gain: 0.22 },
  trace: ['works'],
};

export const SOUNDSCAPES: Record<string, SoundscapeDef> = { steam, light, motion, compute, code, generic };

/** Register (or replace) the soundscape for a sector id. */
export function registerSoundscape(sectorId: string, def: SoundscapeDef): void { SOUNDSCAPES[sectorId] = def; }

/** Page looks → interface palette, for sectors without a soundscape of their own. */
const LOOK_PALETTE: Record<string, Palette> = { ledger: 'ledger', gaslight: 'gaslight', chrome: 'chrome', terminal: 'terminal', agentic: 'neon', cyberpunk: 'neon' };

export function soundscapeFor(sectorId: string): SoundscapeDef {
  return SOUNDSCAPES[sectorId] ?? SOUNDSCAPES.generic;
}

export function paletteFor(sectorId: string | undefined, look?: string): Palette {
  if (sectorId && SOUNDSCAPES[sectorId]) return SOUNDSCAPES[sectorId].palette;
  return (look && LOOK_PALETTE[look]) || 'ledger';
}
