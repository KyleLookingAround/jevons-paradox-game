// What an export contains: the tasks (each renders one or more files), their file names and folders, size and time
// estimates, and the README that goes in the ZIP. Browser-side only through render.ts; this module builds the lists.
import type { SceneView } from '../../scene/types';
import type { SoundEventKind, SoundEventDetail } from '../types';
import { soundscapeFor, SOUNDSCAPES } from '../defs';
import { MOTIFS } from '../recipes';
import { mixFrom } from '../mix';
import { LIMITER } from '../engine';
import { DEMO_INDUSTRIES, PRESET_NAMES, preset, viewOf, runParams, runView, type PresetName } from '../views';
import { fileName, keyLong, keyTag, bpmTag, wavBytes, SR, BEATS_PER_BAR, loopLength } from './naming';
import type { WavFormat } from './wav';
import { stemGroups, type StemGroup } from './groups';
import { render, layOut, settle, cut, needed, contentGate, PREROLL_S, SEARCH_S, XFADE_S, type Content, type Passage, type Rendered } from './render';
import { trimOneShot, normalise, peakOf, rmsOf, type Voice } from './loop';

export const ROOT = 'rebound-audio';
export const EXPORT_INDUSTRIES = ['steam', 'light', 'motion', 'compute', 'code'];
export const AGES: [string, string[]][] = [['The Coal Age', ['steam', 'light']], ['The Great Acceleration', ['motion']], ['The Attention Age', ['compute', 'code']]];
export const STATE_NAMES = [...PRESET_NAMES, 'clearing'] as const;
export type StateName = (typeof STATE_NAMES)[number];
export const LENGTHS = [15, 30, 60, 120, 240];
export const RUN_LENGTHS = [60, 180, 300];

export interface Settings {
  fmt: WavFormat;
  /** Loop and stem length asked for (s); a seamless loop rounds it to whole bars. */
  loopSec: number;
  seamless: boolean;
  content: Content;
  /** Add a dry set of stems (the room's return muted). */
  dry: boolean;
  /** One-shots normalised to −1 dBFS (off: the engine's levels). */
  normalise: boolean;
  runSec: number;
  /** 1 = the game's own seed; others are other, equally repeatable, takes. */
  take: number;
}

export const DEFAULTS: Settings = { fmt: 'pcm24', loopSec: 60, seamless: true, content: 'all', dry: true, normalise: false, runSec: 60, take: 1 };

export const seedOf = (take: number) => (take <= 1 ? 0x5eed : (0x5eed ^ Math.imul(take, 0x9e3779b1)) >>> 0);

/** A state to export: an Industry and a view held still. */
export interface Source { sector: string; state: string; view: SceneView }

const EARLIER = ['steam', 'light', 'motion', 'compute'];
/** The demo's heritage for an Industry (earlier ones at 0.8), as its Industry menu sets it. */
export function heritageFor(sector: string): Record<string, number> | undefined {
  if (sector === 'steam') return undefined;
  const i = EARLIER.indexOf(sector);
  return Object.fromEntries(EARLIER.slice(0, i === -1 ? 4 : i).map((s) => [s, 0.8]));
}
/** A named state of an Industry as the demo plays it ('clearing': on the way to Steady State, levers in, haze lifting). */
export function stateView(sector: string, state: StateName): SceneView {
  const p = state === 'clearing' ? runParams(sector, 0.8, 'steady') : preset(sector, state as PresetName);
  const h = heritageFor(sector);
  return viewOf(sector, h ? { ...p, heritage: h } : p);
}

/* ---------------- files and tasks ---------------- */

export interface OutFile { path: string; chans: Float32Array[]; kind: 'loop' | 'stem' | 'oneshot' | 'run'; note: string; sector: string }
export interface TaskCtx { settings: Settings; signal?: AbortSignal; progress: (f: number) => void; info: (s: string) => void }
export interface Task {
  label: string;
  sector: string;
  /** Rough seconds of audio this task renders (for the time estimate) and bytes it writes (for the size estimate). */
  renderSec: number;
  bytes: number;
  files: number;
  run: (c: TaskCtx) => AsyncGenerator<OutFile>;
}

/** What the README says, gathered as files are made. */
export interface Ledger {
  passages: { sector: string; state: string; folder: string; p: Passage }[];
  files: { path: string; seconds: number; peakDb: number; rmsDb: number; note: string; sector: string; kind: string }[];
  silent: string[];
}

const def = (s: string) => soundscapeFor(s);
const dir = (sector: string, sub: string) => `${ROOT}/${sector}/${sub}`;
const takeTag = (s: Settings) => (s.take > 1 ? [`take${s.take}`] : []);
const contentTag = (c: Content) => (c === 'all' ? '' : c === 'beds' ? '-beds' : '-pulse');

function loopWhat(p: Passage): string {
  return (p.mode === 'excerpt' ? 'excerpt' : p.mode === 'seamless' ? 'loop-seamless' : 'loop-xfade') + contentTag(p.content);
}

/** A loop (or excerpt) of a held state, as heard (through the game's limiter). */
export function loopTask(src: Source, s: Settings, ledger: Ledger): Task {
  const p0 = layOut(src.sector, src.view, s.loopSec, s.seamless, s.content);
  return {
    label: `${src.sector} · ${src.state} · loop`, sector: src.sector, renderSec: p0.dur, bytes: wavBytes(p0.len / SR, s.fmt), files: 1,
    async *run(c) {
      const r = await render({ sector: src.sector, dur: p0.dur, view: () => src.view, gate: contentGate(src.sector, s.content), limiter: true, seed: seedOf(s.take), signal: c.signal, onProgress: c.progress });
      const p = settle(p0, r);
      ledger.passages.push({ sector: src.sector, state: src.state, folder: 'loops', p });
      const chans = cut(p, r.chans);
      yield {
        path: `${dir(src.sector, 'loops')}/${fileName({ industry: src.sector, state: src.state, what: loopWhat(p), bars: p.bars || undefined, seconds: p.len / SR, key: def(src.sector).key, bpm: p.bpm, fmt: s.fmt, extra: takeTag(s) })}`,
        chans, kind: 'loop', sector: src.sector, note: `${p.mode}: ${p.reason}`,
      };
    },
  };
}

/** Which stems can sound in a held view (silent ones are not rendered; a rendered one that comes out silent is
 *  dropped too and listed in the README). */
function soundingGroups(sector: string, view: SceneView, voices: Voice[]): StemGroup[] {
  const m = mixFrom(view, def(sector), { calm: false, ending: 0 });
  const heard = new Set(voices.map((v) => v.source));
  return stemGroups(sector).filter((g) => {
    if (g.id === 'other') return false;
    if (g.id === 'crisis') return heard.has('crisis');
    if (g.id === 'levers') return Object.keys(m.levers).length > 0;
    if (g.id === 'heritage') return Object.entries(m.traces).some(([sid, h]) => h > 0 && sid !== def(sector).id && (SOUNDSCAPES[sid]?.trace.length ?? 0) > 0);
    if (g.id === 'watch') return m.watch > 0;
    return g.layers.some((id) => (m.layers[id]?.level ?? 0) > 0.001 || heard.has(id));
  });
}

/** A stem whose peak stays under −96 dBFS is left out as silent (its share of the sum is below the 24-bit floor)… */
const SILENT = Math.pow(10, -96 / 20);
/** …or whose RMS stays under −100 dBFS (a reverb tail of something before the passage). */
const SILENT_RMS = Math.pow(10, -100 / 20);

const inGroup = (sector: string, g: StemGroup) => {
  const pats = g.layers;
  return (src: string) => pats.some((p) => p === src || (p.endsWith('*') && src.startsWith(p.slice(0, -1))));
};

/** Stems of the same passage, the full mix they sum to (both before the limiter), and optionally a dry set. */
export function stemsTask(src: Source, s: Settings, ledger: Ledger): Task {
  const p0 = layOut(src.sector, src.view, s.loopSec, s.seamless, 'all');
  const groups = stemGroups(src.sector).filter((g) => g.id !== 'other');
  // The estimate counts the stems the state's mix gives a level (a stem that stays silent is left out).
  const per = (1 + soundingGroups(src.sector, src.view, []).length) * (s.dry ? 2 : 1);
  return {
    label: `${src.sector} · ${src.state} · stems`, sector: src.sector, renderSec: p0.dur + (p0.dur - SEARCH_S / 2) * (per - 1), bytes: wavBytes(p0.len / SR, s.fmt) * per, files: per,   // at most: silent stems are skipped
    async *run(c) {
      const seed = seedOf(s.take);
      let p = p0;
      let gs: StemGroup[] = [];
      const name = (what: string, extra: string[]) => fileName({ industry: src.sector, state: src.state, what, bars: p.bars || undefined, seconds: p.len / SR, key: def(src.sector).key, bpm: p.bpm, fmt: s.fmt, extra: [...extra, ...takeTag(s)] });
      for (const dry of s.dry ? [false, true] : [false]) {
        const folder = dir(src.sector, `stems/${src.state}_${Math.round(p0.len / SR)}s${dry ? '/dry' : ''}`);
        const extra = dry ? ['dry'] : [];
        const passes = 1 + (gs.length || groups.length);
        let k = 0;
        const prog = (f: number) => c.progress((k + f) / passes);
        c.info(`${dry ? 'dry ' : ''}full mix`);
        const full: Rendered = await render({ sector: src.sector, dur: dry ? needed(p) : p0.dur, view: () => src.view, dry, limiter: false, seed, signal: c.signal, onProgress: prog });
        if (!dry) {
          p = settle(p0, full);
          gs = soundingGroups(src.sector, src.view, full.voices);
          ledger.passages.push({ sector: src.sector, state: src.state, folder: folder.slice(ROOT.length + 1), p });
        }
        yield { path: `${folder}/${name(`${p.mode === 'excerpt' ? 'excerpt' : 'loop'}-mix`, extra)}`, chans: cut(p, full.chans), kind: 'stem', sector: src.sector, note: `full mix (before the limiter), ${dry ? 'dry' : 'with the room'}; the stems in this folder sum to it` };
        k++;
        for (const g of gs) {
          c.info(`${dry ? 'dry ' : ''}stem: ${g.label}`);
          const r = await render({ sector: src.sector, dur: needed(p), view: () => src.view, gate: inGroup(src.sector, g), dry, limiter: false, seed, signal: c.signal, onProgress: prog });
          k++;
          const chans = cut(p, r.chans);
          const path = `${folder}/${name(`stem-${g.id}`, extra)}`;
          if (peakOf(chans) < SILENT || rmsOf(chans) < SILENT_RMS) { ledger.silent.push(path); continue; }   // e.g. a horn that did not sound in this passage
          yield { path, chans, kind: 'stem', sector: src.sector, note: `${g.label}: ${g.about}` };
        }
      }
    },
  };
}

/* ---------------- one-shots ---------------- */

const LEVER_KINDS = ['duty', 'cap', 'sufficiency', 'substitution', 'circularity', 'greenSpending', 'deletion', 'reviewGate', 'sharedLibs'];

export const ONESHOT_ABOUT: Record<string, string> = {
  sell: 'capital from selling service: the tap that must survive eight a second (one per variant)',
  'sell-streak': 'sell at eight taps a second for two seconds, as the engine plays a streak (climbing a little scale, thinned)',
  buy: 'an upgrade bought (one per variant)', cannotAfford: 'a tap on something out of reach', found: 'an application founded: a short built-up gesture',
  lever: 'a lever enacted or raised', fork: 'a run fork chosen', headline: 'a broadsheet headline arrives', reveal: "The Coal Question: the reveal (ducks the world in the game)",
  backfire: 'rebound first passes 100%: the signature sting', crisis: 'a crisis fires (the interface sound; the world plays its own, see world-crisis)', decade: 'a decade earned',
  steady: 'Steady State reached', reckoning: 'a Reckoning (the world winds down)', industryOpened: 'a new Industry opened', ageBegun: 'a new Age begun',
  seam: 'a seam sunk: a muffled blast underground, the cage bell twice, a pump stroke rising, a chain (depth 0–3: deeper is lower)',
  letter: 'a dispatch arrives: the post in the Age\'s idiom, without a writer\'s motif', 'letter-motif': "a dispatch arrives, then its writer's motif in the Age's key",
  letterOpened: 'the player opens a dispatch (very small)', answer: 'a dispatch answered: pen, stamp or key, and one soft note', letterExpired: 'a dispatch lapsed unanswered (barely there)',
  bite: "a lever's side effect first bites back, without a lever named: a sour two-note", 'bite-lever': "a lever's side effect first bites back: that lever's own signature, twice, flat and beating",
  survey: 'the household return published: a ledger page, a clock ticking, one note', proprietor: "the Proprietor's Day: his watch, heard for the first time (the lid, a hurried tick, a chord left open)",
  ending: 'the first ending: a bell, a slow chord, the arpeggio, a bird (the sting alone; the bed that follows it is ending-credits)',
  'ending-credits': "the first ending's credits bed alone: a held chord that breathes, a bell every 7–12 s, for 75 s, then a 6 s fade",
  ledgerContinues: '"The ledger continues": a pen stroke (a key in later Ages) and one note', arrived: 'a new system unlocks: one small "something has arrived" cue per Age',
  history: 'a History cleared: a line ruled off, a small cadence', 'world-crisis': "the world's own crisis moment (a low fog swell and the Age's alarm), alone",
};

export interface Shot { what: string; about: string; dur: number; events: [number, SoundEventKind, SoundEventDetail?][]; variant?: number; gate?: (s: string) => boolean; view?: (t: number) => SceneView | null; trim?: boolean }

/** One-shots are fired this long into their render: the engine's master fades in over its first ~0.5 s (as it does when
 *  sound is turned on), and a moment fired at 0 would be heard through that fade. The trim then removes the lead-in. */
const ONSET_S = 1;

export function oneShotList(sector: string): Shot[] {
  return shotsAt0(sector).map((x) => ({ ...x, dur: x.dur + ONSET_S, events: x.events.map(([t, k, d]) => [t + ONSET_S, k, d] as [number, SoundEventKind, SoundEventDetail?]), view: x.view ? (t: number) => x.view!(t - ONSET_S) : undefined }));
}

function shotsAt0(sector: string): Shot[] {
  const L: Shot[] = [];
  const one = (k: SoundEventKind, dur = 8, det?: SoundEventDetail, what: string = k, about = ONESHOT_ABOUT[k] ?? k) => L.push({ what, about, dur, events: [[0, k, det]] });
  for (let v = 0; v < 6; v++) L.push({ what: `sell-v${v + 1}`, about: ONESHOT_ABOUT.sell, dur: 3, events: [[0, 'sell']], variant: v });
  L.push({ what: 'sell-streak', about: ONESHOT_ABOUT['sell-streak'], dur: 5, events: Array.from({ length: 16 }, (_, i) => [i * 0.125, 'sell', { pan: (i % 5) / 5 - 0.4 }] as [number, SoundEventKind, SoundEventDetail]) });
  for (let v = 0; v < 3; v++) L.push({ what: `buy-v${v + 1}`, about: ONESHOT_ABOUT.buy, dur: 4, events: [[0, 'buy']], variant: v });
  for (const k of ['cannotAfford', 'found', 'lever', 'fork', 'headline'] as SoundEventKind[]) one(k);
  for (const k of ['reveal', 'backfire', 'crisis', 'decade', 'steady', 'reckoning', 'industryOpened', 'ageBegun'] as SoundEventKind[]) one(k, 11);
  for (let d = 0; d < 4; d++) one('seam', 10, { depth: d / 3 }, `seam-depth${d}`);
  one('letter', 6);
  for (const fam of Object.keys(MOTIFS)) one('letter', 6, { cast: fam }, `letter-${fam}`, `${ONESHOT_ABOUT['letter-motif']} (${fam})`);
  one('letterOpened', 4); one('answer', 6, { by: 'player' }); one('letterExpired', 4);
  one('bite', 6);
  for (const lv of LEVER_KINDS) one('bite', 7, { lever: lv }, `bite-${lv}`, `${ONESHOT_ABOUT['bite-lever']} (${lv})`);
  one('survey', 8); one('proprietor', 11);
  L.push({ what: 'ending', about: ONESHOT_ABOUT.ending, dur: 14, events: [[0, 'ending']], gate: (s) => s !== 'credits' });
  L.push({ what: 'ending-credits', about: ONESHOT_ABOUT['ending-credits'], dur: 86, events: [[0, 'ending']], gate: (s) => s === 'credits' });
  one('ledgerContinues', 6); one('arrived', 6); one('history', 6);
  const base = stateView(sector, 'late');
  L.push({ what: 'world-crisis', about: ONESHOT_ABOUT['world-crisis'], dur: 18, events: [], view: (t) => (t < 1 ? base : { ...base, crises: base.crises + 1 }), gate: (s) => s === 'crisis' });
  return L;
}

/** Every interface and event sound of an Industry's Age, each trimmed to its natural length. */
export function oneShotsTask(sector: string, s: Settings, ledger: Ledger, only?: Shot[]): Task {
  const list = only ?? oneShotList(sector);
  const renderSec = list.reduce((a, x) => a + x.dur, 0);
  return {
    label: `${sector} · one-shots`, sector, renderSec, bytes: wavBytes(list.reduce((a, x) => a + (x.what === 'ending-credits' ? 82 : x.what === 'world-crisis' ? 14 : Math.min(x.dur, 4)), 0), s.fmt), files: list.length,
    async *run(c) {
      let k = 0;
      for (const sh of list) {
        c.info(`one-shot: ${sh.what}`);
        const r = await render({ sector, dur: sh.dur, view: sh.view ?? (() => null), events: sh.events, variant: sh.variant, gate: sh.gate, limiter: true, seed: seedOf(s.take), signal: c.signal, onProgress: (f) => c.progress((k + f) / list.length) });
        k++;
        const t = trimOneShot(r.chans, SR);
        const path = `${dir(sector, 'oneshots')}/${fileName({ industry: sector, what: `oneshot-${sh.what}`, key: def(sector).key, fmt: s.fmt, extra: [...(s.normalise ? ['norm'] : []), ...takeTag(s)] })}`;
        if (!t) { ledger.silent.push(path); continue; }
        if (s.normalise) normalise(t, -1);
        yield { path, chans: t, kind: 'oneshot', sector, note: sh.about };
      }
    },
  };
}

/* ---------------- runs ---------------- */

const RUN_TAIL_S = 4;

/** The demo's auto-play run (empty valley to collapse, or to Steady State) as one file. The interface's crisis sound
 *  plays as each crisis fires, as in the demo. */
export function runTask(sector: string, ending: 'collapse' | 'steady', s: Settings): Task {
  const T = s.runSec;
  const events: [number, SoundEventKind][] = [];
  let prev = 0;
  for (let k = 0; k * 0.1 <= T; k++) { const c = runParams(sector, Math.min(1, (k * 0.1) / T), ending).crises; if (c > prev) events.push([k * 0.1, 'crisis']); prev = c; }
  const d = def(sector);
  return {
    label: `${sector} · run to ${ending}`, sector, renderSec: T + RUN_TAIL_S, bytes: wavBytes(T + RUN_TAIL_S, s.fmt), files: 1,
    async *run(c) {
      const r = await render({ sector, dur: T + RUN_TAIL_S, view: (t) => runView(sector, Math.min(1, t / T), ending), events, limiter: true, seed: seedOf(s.take), signal: c.signal, onProgress: c.progress });
      yield {
        path: `${dir(sector, 'runs')}/${fileName({ industry: sector, state: `run-${ending}`, what: T === 60 ? 'demo' : 'slow', seconds: T + RUN_TAIL_S, key: d.key, fmt: s.fmt, extra: [`${d.tempo[0]}-${d.tempo[1]}bpm`, ...takeTag(s)] })}`,
        chans: r.chans, kind: 'run', sector,
        note: ending === 'collapse' ? `a whole run in ${T} s: empty valley, founding and adoption, machines evolving, pace and pressure rising, crises, a Reckoning at ${Math.round(0.93 * T)} s; ${RUN_TAIL_S} s held after` : `a whole run in ${T} s that turns at ${Math.round(0.55 * T)} s: levers, decoupling, the haze lifting, Steady State at about ${Math.round(0.91 * T)} s; ${RUN_TAIL_S} s held after`,
      };
    },
  };
}

/* ---------------- the export kinds ---------------- */

export type Kind = 'loop' | 'stems' | 'oneshots' | 'runs' | 'industry' | 'everything';

/** The tasks for an export. `src` is the state on the demo's controls (or a named one); "Everything" uses it for its
 *  own Industry and `fallback` (a named state) for the others. */
export function tasksFor(kind: Kind, src: Source, s: Settings, ledger: Ledger, fallback: StateName = 'late'): Task[] {
  const industry = (sector: string, own: Source | null): Task[] => {
    const t: Task[] = [];
    for (const st of STATE_NAMES) t.push(loopTask(own && own.state === st ? own : { sector, state: st, view: stateView(sector, st) }, s, ledger));
    if (own && !(STATE_NAMES as readonly string[]).includes(own.state)) t.push(loopTask(own, s, ledger));
    t.push(stemsTask(own ?? { sector, state: fallback, view: stateView(sector, fallback) }, s, ledger));
    t.push(oneShotsTask(sector, s, ledger));
    t.push(runTask(sector, 'collapse', s), runTask(sector, 'steady', s));
    return t;
  };
  switch (kind) {
    case 'loop': return [loopTask(src, s, ledger)];
    case 'stems': return [stemsTask(src, s, ledger)];
    case 'oneshots': return [oneShotsTask(src.sector, s, ledger)];
    case 'runs': return [runTask(src.sector, 'collapse', s), runTask(src.sector, 'steady', s)];
    case 'industry': return industry(src.sector, src);
    case 'everything': return EXPORT_INDUSTRIES.flatMap((x) => industry(x, x === src.sector ? src : null));
  }
}

export const newLedger = (): Ledger => ({ passages: [], files: [], silent: [] });

/* ---------------- README ---------------- */

const r1 = (x: number) => Math.round(x * 10) / 10;

export function readme(kind: Kind, s: Settings, ledger: Ledger, started: string): string {
  const L: string[] = [];
  const p = (x = '') => L.push(x);
  const wrap = (x: string, ind = '') => { const out: string[] = []; let line = ind; for (const w of x.split(' ')) { if (line.length + w.length > 100 && line.trim()) { out.push(line.trimEnd()); line = ind; } line += w + ' '; } if (line.trim()) out.push(line.trimEnd()); L.push(...out); };
  const sectors = [...new Set(ledger.files.map((f) => f.sector))];
  p('REBOUND: GENERATED SOUND, EXPORTED FOR A DAW');
  p('=============================================');
  p();
  wrap('Everything in this archive was synthesised in a web browser by the sound engine of the game Rebound (Web Audio oscillators, filtered noise and short synthesised buffers; nothing recorded). There are no third-party samples. Use is by permission of the game\'s owner.');
  p();
  wrap(`Export: ${kind}. ${ledger.files.length} files. Format: 48 kHz, stereo, ${s.fmt === 'pcm24' ? '24-bit PCM' : '32-bit float'} WAV (WAVE_FORMAT_EXTENSIBLE${s.fmt === 'f32' ? ', IEEE float subformat, with a fact chunk' : ', PCM subformat'}; no dither). Take ${s.take}${s.take === 1 ? " (the game's own seed)" : ''}: the same settings and take give the same audio, sample for sample. ${started}`);
  p();
  p('FOLDERS AND NAMES');
  p('-----------------');
  wrap('rebound-audio/<industry>/loops (held states as heard), stems/<state>_<length>/ (stems, their full mix, and dry/ if asked), oneshots/ (interface and event sounds), runs/ (whole runs as the demo plays them).', '  ');
  wrap('Names read: industry_state_what_bars_length_key_tempo_format. Key: Ddor = D dorian, Gmix = G mixolydian, Clyd = C lydian, Emin/Bmin = E/B aeolian (natural minor). 48k24 = 48 kHz 24-bit, 48k32f = 48 kHz 32-bit float. "loop-seamless" loops cleanly; "loop-xfade" is whole bars and crossfaded but something crosses the seam (see LOOPS); "excerpt" is a straight cut. "-beds" holds only continuous layers; "-pulse" continuous layers and the rhythm on the beat, no events.', '  ');
  p();
  p('LEVELS');
  p('------');
  wrap(`No file is normalised${s.normalise ? ' except the one-shots, each to a peak of -1 dBFS (their names carry "norm")' : ''}: everything keeps the engine's own levels at the game's default volumes (master 0.8, world 0.7, interface 0.7), so loops, stems and one-shots relate as they do in the game.`, '  ');
  wrap(`loops/, runs/ and oneshots/ pass through the game's master limiter, as heard in the game: a Web Audio compressor (threshold ${LIMITER.threshold} dBFS, knee ${LIMITER.knee} dB, ratio ${LIMITER.ratio}:1, attack ${LIMITER.attack * 1000} ms, release ${LIMITER.release * 1000} ms). Web Audio's compressor also applies make-up gain, about +6 dB here, and delays its output by about 6 ms.`, '  ');
  wrap('stems/ are taken before the limiter, so that they sum exactly to the full mix beside them (a limiter is not linear). So the stems and their mix sit about 6 dB under the loop of the same state, with the peaks the limiter would have held: put a limiter (or +6 dB and a compressor) on your bus to match the game. Each stem carries its own share of the room (reverb), so the wet stems sum to the wet mix; dry/ has the room\'s return muted throughout, for your own space. The room is subtle: its return is about 30 dB under the direct sound.', '  ');
  p();
  p('KEYS, TEMPO AND STEMS, BY AGE');
  p('-----------------------------');
  for (const [age, ids] of AGES) {
    const here = ids.filter((x) => sectors.includes(x));
    if (!here.length) continue;
    p(`${age}`);
    for (const id of here) {
      const d = def(id);
      const name = DEMO_INDUSTRIES.find((x) => x.id === id)?.name ?? id;
      p(`  ${name}: ${keyLong(d.key)} (${keyTag(d.key)}). Tempo ${d.tempo[0]}-${d.tempo[1]} bpm.`);
      wrap(`Every rhythmic layer reads one beat clock, whose tempo follows the game's pace linearly: ${d.tempo[0]} bpm at pace 0, ${d.tempo[1]} at pace 1, halved in a Reckoning. In a held state the tempo glides to its value within a few seconds; exports start after ${PREROLL_S} s, by then within a fraction of a per cent. The tempo used is in each file name; a bar is ${BEATS_PER_BAR} beats of that clock.`, '    ');
      p('    Stems:');
      for (const g of stemGroups(id)) if (g.id !== 'other') wrap(`stem-${g.id} (${g.label}): ${g.about}${g.layers.some((x) => !x.includes('*') && x !== 'crisis' && x !== 'watch') ? ` [layers: ${g.layers.join(', ')}]` : ''}.`, '      ');
    }
    p();
  }
  if (ledger.passages.length) {
    p('LOOPS AND PASSAGES');
    p('------------------');
    wrap(`A seamless loop is a whole number of ${BEATS_PER_BAR}-beat bars at the state's tempo, starting on a bar line of the engine's beat clock; its first ${XFADE_S} s are an equal-power crossfade from what followed its end, so the last sample runs straight on into the first. It is called seamless only if no event (a train, a bell, a horn, a winding run: any voice of a second or more off the beat) sounds across the seam; the start is searched over ${SEARCH_S} s of bar lines for one. Short random sounds (birds, drips) may pass under the crossfade.`, '  ');
    for (const x of ledger.passages) wrap(`${x.sector} · ${x.state} (${x.folder}): ${x.p.mode}${x.p.bars ? `, ${x.p.bars} bars` : ''}, ${r1(x.p.len / SR)} s at ${r1(x.p.bpm)} bpm; ${x.p.reason}.`, '  ');
    p();
  }
  if (ledger.files.some((f) => f.kind === 'oneshot')) {
    p('ONE-SHOTS');
    p('---------');
    wrap('Each is the sound alone (no world under it), from its first audible sample to where it has died away below -84 dBFS, plus 80 ms and a 20 ms fade. The interface sounds of each Age share an instrument and a gesture (Steam a brass handbell and a pen nib; Light a celesta and a telegraph; Motion a vibraphone and a teleprinter; Compute phosphor beeps and a mail chime; Code a soft notification and keys), in the Age\'s key.', '  ');
    const seen = new Set<string>();
    for (const f of ledger.files) if (f.kind === 'oneshot') {
      const k = f.path.split('_oneshot-')[1]?.split('_')[0] ?? '';
      if (seen.has(k) || seen.has(f.note)) continue; seen.add(k); seen.add(f.note);
      wrap(`${k.replace(/-v\d+$/, '-v1…')}: ${f.note}.`, '  ');
    }
    p();
  }
  p('FILES');
  p('-----');
  p('  length   peak dBFS  RMS dBFS  file');
  for (const f of ledger.files) p(`  ${f.seconds.toFixed(2).padStart(7)}  ${f.peakDb.toFixed(1).padStart(8)}  ${f.rmsDb.toFixed(1).padStart(8)}  ${f.path.slice(ROOT.length + 1)}`);
  if (ledger.silent.length) { p(); p('Silent in this state, so not included:'); for (const x of ledger.silent) p(`  ${x.slice(ROOT.length + 1)}`); }
  p();
  wrap('Made by the game\'s sound engine; nobody has yet judged these by ear in a DAW. If something sounds wrong, the settings above reproduce it exactly.');
  return L.join('\n') + '\n';
}

/** Loop length in bars and seconds for the controls (shown before exporting). */
export function describeLoop(src: Source, s: Settings): string {
  const bpm = mixFrom(src.view, def(src.sector), { calm: false, ending: 0 }).tempo;
  if (!s.seamless) return `${s.loopSec} s straight excerpt at ${bpmTag(bpm)}`;
  const l = loopLength(s.loopSec, bpm);
  return `${l.bars} bars = ${l.seconds.toFixed(2)} s at ${bpmTag(bpm)}`;
}
