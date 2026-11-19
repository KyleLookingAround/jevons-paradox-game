// File names, key and tempo tags, loop lengths and size estimates for the DAW export. Pure.
import type { Key } from '../music';
import type { WavFormat } from './wav';
import { wavSize } from './wav';

export const SR = 48000;
export const BEATS_PER_BAR = 4;

const MODE_TAG: Record<string, string> = { dorian: 'dor', mixolydian: 'mix', lydian: 'lyd', aeolian: 'min', ionian: 'maj', phrygian: 'phr', locrian: 'loc' };

/** 'D dorian' → 'Ddor', 'E aeolian' → 'Emin' (aeolian is the natural minor). */
export function keyTag(key: Key): string {
  const tonic = (key.name.split(' ')[0] || 'X').replace('♯', 's').replace('#', 's').replace('♭', 'b');
  return tonic + (MODE_TAG[key.mode] ?? key.mode.slice(0, 3));
}

/** 'D dorian (D E F G A B C)': the key as the README spells it. */
export function keyLong(key: Key): string {
  const names = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const MODES: Record<string, number[]> = { dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], aeolian: [0, 2, 3, 5, 7, 8, 10], ionian: [0, 2, 4, 5, 7, 9, 11] };
  const root = Math.round(12 * Math.log2(key.root / 440) + 69) % 12;
  const m = MODES[key.mode];
  const notes = m ? m.map((s) => names[(root + s) % 12]).join(' ') : '';
  return `${key.name}${key.mode === 'aeolian' ? ' (natural minor)' : ''}${notes ? `: ${notes}` : ''}`;
}

/** 78 → '78bpm', 67.5 → '67.5bpm'. */
export function bpmTag(bpm: number): string {
  const r = Math.round(bpm * 10) / 10;
  return `${Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)}bpm`;
}

export const fmtTag = (fmt: WavFormat) => (fmt === 'pcm24' ? '48k24' : '48k32f');
export const lenTag = (sec: number) => `${Math.round(sec)}s`;

/** A lower-case, ASCII, dash-separated token. */
export function token(s: string): string {
  return s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

export interface NameParts {
  industry: string;
  /** A state ('late', 'controls'), a run ('run-collapse') or a palette for one-shots. */
  state?: string;
  /** What it is: 'loop-seamless', 'stem-engine', 'mix', 'oneshot-reveal' … */
  what: string;
  seconds?: number;
  bars?: number;
  key?: Key;
  bpm?: number;
  fmt: WavFormat;
  /** Extra tokens before the format tag (e.g. 'dry', 'take2'). */
  extra?: string[];
}

/** steam_late_stem-engine_120s_Ddor_72bpm_48k24.wav */
export function fileName(p: NameParts): string {
  const t: string[] = [token(p.industry)];
  if (p.state) t.push(token(p.state));
  t.push(p.what.split('-').map(token).join('-'));
  if (p.bars) t.push(`${p.bars}bars`);
  if (p.seconds != null) t.push(lenTag(p.seconds));
  if (p.key) t.push(keyTag(p.key));
  if (p.bpm) t.push(bpmTag(p.bpm));
  for (const e of p.extra ?? []) t.push(token(e));
  t.push(fmtTag(p.fmt));
  return t.join('_') + '.wav';
}

/** A loop of about `target` seconds that is a whole number of bars at `bpm`: the bars, the exact frame count and the
 *  length in seconds. Never less than one bar. */
export function loopLength(target: number, bpm: number, sr = SR, beatsPerBar = BEATS_PER_BAR): { bars: number; frames: number; seconds: number; barSeconds: number } {
  const barSeconds = (beatsPerBar * 60) / bpm;
  const bars = Math.max(1, Math.round(target / barSeconds));
  const frames = Math.round(bars * barSeconds * sr);
  return { bars, frames, seconds: frames / sr, barSeconds };
}

/** Bytes of a stereo WAV of `seconds` at 48 kHz. */
export const wavBytes = (seconds: number, fmt: WavFormat, channels = 2) => wavSize(Math.round(seconds * SR), channels, fmt);

/** '17.3 MB', '1.2 GB'. */
export function mb(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(bytes >= 1e8 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} kB`;
}

/** '1 min 05 s', '42 s'. */
export function dur(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
}
