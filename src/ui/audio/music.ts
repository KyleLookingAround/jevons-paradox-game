// Keys and tempi. Each Age sits in a mode whose note set differs from its neighbour's by at most one note, walking
// round the circle of fifths as the calendar advances, so switching Industry tabs is a modulation, not a jolt:
//
//   Steam   D dorian      (the white notes)          pastoral, a little sombre: drones on D and A
//   Light   G mixolydian  (the white notes)          the same set, warmer: dusk, a bandstand
//   Iron    A aeolian     (the white notes)          M4: the foundry at night, minor and heavy
//   Fishing C ionian      (the white notes)          M4: the open, bright sea of 1883
//   Motion  C lydian      (+F♯)                      bright, open-road optimism with a raised fourth
//   Plenty  G ionian      (+F♯)                      M5: the same set as Motion, plain major: fields and larks
//   Compute E aeolian     (+F♯)                      the same set as Motion, minor: cool phosphor
//   Code    B aeolian     (+F♯ +C♯)                  night, rain, one sharp further
//   generic D dorian
//
// Pitches are given as scale degrees (0 = tonic, 7 = the octave) and resolved here.

export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
} as const;

export type ModeName = keyof typeof MODES;

export interface Key {
  /** Tonic frequency in the second octave (D2 = 73.42 Hz). */
  root: number;
  mode: ModeName;
  name: string;
}

export const A4 = 440;
export const midiHz = (m: number) => A4 * Math.pow(2, (m - 69) / 12);

export const KEYS: Record<string, Key> = {
  steam: { root: midiHz(38), mode: 'dorian', name: 'D dorian' },
  light: { root: midiHz(43), mode: 'mixolydian', name: 'G mixolydian' },
  iron: { root: midiHz(33), mode: 'aeolian', name: 'A aeolian' },
  fishing: { root: midiHz(36), mode: 'ionian', name: 'C ionian' },
  motion: { root: midiHz(36), mode: 'lydian', name: 'C lydian' },
  plenty: { root: midiHz(43), mode: 'ionian', name: 'G ionian' },
  compute: { root: midiHz(40), mode: 'aeolian', name: 'E aeolian' },
  code: { root: midiHz(35), mode: 'aeolian', name: 'B aeolian' },
  generic: { root: midiHz(38), mode: 'dorian', name: 'D dorian' },
};

/** Semitones above the tonic of scale degree d (any integer; 7 = octave). */
export function semis(key: Key, d: number): number {
  const m = MODES[key.mode];
  const o = Math.floor(d / 7);
  return m[((d % 7) + 7) % 7] + 12 * o;
}

/** Frequency of degree d in octave `oct` above the root's octave (oct 0 = second octave). */
export function freq(key: Key, d: number, oct = 0): number {
  return key.root * Math.pow(2, oct + semis(key, d) / 12);
}

/** Playback-rate ratio that moves a buffer baked on the tonic to degree d. */
export function ratio(key: Key, d: number): number {
  return Math.pow(2, semis(key, d) / 12);
}
