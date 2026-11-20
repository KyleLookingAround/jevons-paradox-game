// The soundscape engine: Web Audio graph, scheduler and interface sounds. Holds no game rules: it reads the same
// SceneView as the picture, asks mixFrom() what to do, and ramps towards it.
//
// Nothing is created until sound is turned on: no AudioContext, no nodes, no listeners. Every parameter change is a
// ramp (setTargetAtTime, deduplicated so 10 Hz updates do not pile up automation events). Each Industry's graph is
// built once when it is shown and crossfaded; the previous graph is torn down after the fade. Transients are
// synthesised in JS once (./recipes) and each plays as one buffer source + gain (+ panner). Voices are capped.
import type { SceneView } from '../scene/types';
import { SOUND_EVENT_ALIASES, WORLD_EVENT_KINDS, type Soundscape, type SoundscapeOptions, type SoundEventKind, type SoundEventDetail, type Volumes, type SoundscapeStats, type Mix } from './types';
import { SOUNDSCAPES, soundscapeFor, paletteFor, type SoundscapeDef, type LayerDef, type BedDef, type HitsDef } from './defs';
import { mixFrom, momentsBetween } from './mix';
import { hasRecipe, CAST_FAMILY, MOTIFS, MOTIF_AT } from './recipes';
import { rngFrom, hash, type Rng } from './synth';
import { obtain, peek, attach, detach, bankSamples } from './synthq';
import type { Job } from './jobs';
import { freq, ratio, semis, type Key } from './music';

const LOOKAHEAD = 0.4;           // s scheduled ahead of the clock
const TICK_MS = 100;             // scheduler period
const MAX_WORLD_VOICES = 18;
const MAX_UI_VOICES = 6;
const MAX_SELL_VOICES = 3;
const XFADE_TC = 0.7;            // crossfade time constant between Industries (≈ 2.1 s to 95%)
const BUILD_MS = 5;              // live: most graph-building per update (ms); a full place thickens over a few updates
const REV_DUR = 1.7;             // s, the generated room's impulse
const REV_SEGS = 8;              // convolvers it is split over (see buildBuses)
const SYNTH_BUDGET_MS = 6;       // offline only: most JS synthesis per tick (later hits wait for the next tick)

type Ctx = BaseAudioContext;

/** The master limiter's settings (a DynamicsCompressorNode). Exported for the DAW export, which renders past the
 *  limiter (tap.limiter false, so the render repeats exactly) and then applies the same node, so set, as a second
 *  pass over the same signal. */
export const LIMITER = { threshold: -14, knee: 8, ratio: 10, attack: 0.004, release: 0.3 } as const;

interface LayerRt {
  def: LayerDef;
  key: Key;
  input: AudioNode;     // where sources/hits connect
  level: GainNode;
  cut: GainNode;        // rolling blackouts
  send: GainNode;
  filter?: BiquadFilterNode;
  baseF?: number;
  oscs: { node: OscillatorNode; f: number }[];
  noises: AudioBufferSourceNode[];
  lfo?: { osc: OscillatorNode; depth: GainNode; rate: number; beats: boolean; to: 'gain' | 'filter'; amt: number };
  lfoGain?: GainNode;
  // hits
  rng: Rng;
  next: number;         // seconds (rate) or beats (grid); NaN = unset
  step: number;
  density: number;
  pitch: number;
  vary: number;
  traceOf?: string;
  /** M3: a lever's signature souring (0–1) as its side effect bites. */
  sour?: number;
  /** M3: the variant the mix chose (variantBy). */
  variant?: number;
  /** Export: the source id this layer reports to tap.gate / tap.onVoice. */
  src: string;
  /** M4: built while its graph is still fading in: its level starts at the mix's value instead of ramping up from 0
   *  (the graph's own crossfade is the fade; ramping both made a tab switch dip ~2 dB more than the crossfade's own). */
  fresh?: boolean;
}

interface Graph {
  def: SoundscapeDef;
  sector: string;
  out: GainNode;        // crossfade
  world: GainNode;      // reckoning wind-down
  air: BiquadFilterNode;
  thick: BiquadFilterNode;
  fog: BiquadFilterNode;
  send: GainNode;
  layers: LayerRt[];
  byId: Map<string, LayerRt>;
  traces: Map<string, { gain: GainNode; lp: BiquadFilterNode; layers: LayerRt[] }>;
  levers: Map<string, LayerRt>;
  rng: Rng;
  tempo: number;
  tempoTarget: number;
  beat: number;
  beatAt: number;
  mix: Mix | null;
  dieAt: number;        // 0 = alive
  dead?: boolean;       // torn down
  blackoutNext: number;
  /** M3: the proprietor's watch (built when he first checks it). */
  watch?: LayerRt;
  /** M3: when Light's day began for this graph (s, context time), or NaN. */
  dayAt: number;
  /** M4: when the graph was built (the sea life fades in at the ordinary pace when a tab is first shown). */
  bornAt: number;
}

/** The sound's own kinds (aliases resolve to these first). */
type OwnKind = Exclude<SoundEventKind, 'seamSunk' | 'dispatchArrived' | 'dispatchAnswered' | 'biteBack' | 'returnPublished' | 'featureUnlocked' | 'historyCleared' | 'surveyed' | 'thresholdCrossed' | 'surveyReveal'>;
const KIND_GAIN: Record<OwnKind, number> = {
  sell: 0.22, buy: 0.3, cannotAfford: 0.26, found: 0.34, lever: 0.34, fork: 0.3, headline: 0.26, reveal: 0.42, backfire: 0.42,
  crisis: 0.32, decade: 0.3, steady: 0.38, reckoning: 0.4, industryOpened: 0.34, ageBegun: 0.4,
  // M3. The post is deliberately small (it may come every few minutes); the two considered moments are as loud as
  // the reveal; the rest sit with buy and lever.
  seam: 0.36, letter: 0.2, letterOpened: 0.16, answer: 0.28, letterExpired: 0.1, bite: 0.3, survey: 0.3, proprietor: 0.42,
  ending: 0.4, ledgerContinues: 0.26, arrived: 0.26, history: 0.28,
  // M4: the coin sits with buy; the Act's ending with the first ending; the toll with the survey.
  wager: 0.3, actEnding: 0.4, arrears: 0.3,
};
const KIND_VARIANTS: Partial<Record<SoundEventKind, number>> = { sell: 6, buy: 3 };
/** Moments worth playing late (a beat or so) rather than not at all, if their sound is not ready on first use. */
const LATE_OK = new Set<SoundEventKind>(['reveal', 'backfire', 'steady', 'reckoning', 'ageBegun', 'industryOpened', 'crisis', 'decade', 'found', 'fork',
  'seam', 'letter', 'survey', 'proprietor', 'ending', 'arrived', 'history', 'bite', 'wager', 'actEnding', 'arrears']);
const DUCKS: Partial<Record<SoundEventKind, [number, number]>> = { reveal: [0.45, 4.5], backfire: [0.6, 2], steady: [0.6, 3], ageBegun: [0.5, 3.5], reckoning: [0.7, 3],
  seam: [0.75, 2.5], proprietor: [0.4, 4.6], ending: [0.55, 5], survey: [0.8, 2.5], actEnding: [0.5, 7.5], arrears: [0.8, 3] };
const CREDITS_S = 75;            // the first ending's credits bed holds this long by itself before it fades
const ACT_CREDITS_S = 110;       // M4: an Act's credits hold longer, and their bells come less often
const LIFE_RISE_TC = 5;          // M4: the sea life comes back slowly (≈ 15 s to 95%); it goes in ≈ 2 s
const CUT_HOLD_S = 12;           // M4: after 'thresholdCrossed' the sea life stays cut this long, then the mix's own level returns (slowly)
const LIFT_S = 2;                // M4: 'surveyReveal' lifts the sea life this long
const LIFT_GAIN = 1.6;           // … by this much (+4 dB), and calls it a little more often
const DAY_S = 60;                // Light's day: 24 hours in a minute, from dusk, as the picture's clock
const LETTER_SPACING_S = 30;     // letters closer than this are played softer and without the motif (never nagging)

type IdleWin = { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
/** Run f when the main thread is idle (or within 300 ms), so set-up work never lands inside a tap. */
function idle(f: () => void): void {
  const w = globalThis as unknown as IdleWin;
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(f, { timeout: 300 }); else setTimeout(f, 16);
}

export function createSoundscape(opts: SoundscapeOptions & { clock?: () => number } = {}): Soundscape {
  const seed = (opts.seed ?? 0x5eed) >>> 0;
  let enabled = !!opts.enabled || !!opts.context;
  let vol: Volumes = { master: 0.8, world: 0.7, interface: 0.7, ...(opts.volumes ?? {}) };
  let calmOverride: boolean | null = opts.calm ?? null;
  const external = opts.context ?? null;

  let ctx: Ctx | null = null;
  let unavailable = false;
  let master: GainNode | null = null, duck: GainNode | null = null, worldBus: GainNode | null = null, uiBus: GainNode | null = null;
  let revIn: GainNode | null = null, revLp: BiquadFilterNode | null = null;
  let canPan = false;
  let meter: AnalyserNode | null = null, meterBuf: Float32Array<ArrayBuffer> | null = null;
  let graphs: Graph[] = [];
  let view: SceneView | null = null;
  let wantSector: string | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  const reasons = new Set<string>();     // 'page' | 'hidden'
  let armed = false;
  let destroyed = false;
  let worldEnds: number[] = [], uiEnds: number[] = [], sellEnds: number[] = [];
  let sellTimes: number[] = [];
  let sellStreak = 0, lastSell = -1;
  let uiRng = rngFrom(seed ^ 0x51);
  let updateMs = 0, tickMs = 0, synthSpent = 0;
  const last = new Map<AudioParam, number>();
  let mq: MediaQueryList | null = null;
  const warm: [string, Key, number][] = [];   // offline only: recipes to synthesise ahead of need, one per tick
  let attached: BaseAudioContext | null = null;
  let lastLetter = -1e9;
  // The first ending's credits: a held chord that breathes, with a bell now and then, for about a minute.
  let credits: { out: GainNode; oscs: OscillatorNode[]; lfos: OscillatorNode[]; t0: number; stopAt: number; nextBell: number; key: Key; pal: string; rng: Rng; slow: number } | null = null;
  // M4: the world's own moments on the sea life ('thresholdCrossed' cuts it, 'surveyReveal' lifts it), per sector.
  let lifeFx: { sector: string; kind: 'cut' | 'lift'; t0: number } | null = null;
  let endingAmt = 0;            // 0–1, what the mix is told (ramps in with the credits, out after them)
  const sync = !!external;                     // offline/tests: synthesise at once; live: in the worker
  // Export taps (offline only). Without them nothing below creates a node or changes a value.
  const tap = external ? opts.tap ?? null : null;
  const gate = tap?.gate ?? null;
  let uiGate: GainNode | null = null, uiRevGate: GainNode | null = null;
  // Export only: repeatable sums. Chromium adds a junction's inputs in an order that can change from render to render
  // (it follows a hash of node addresses), and float addition is not associative, so a node fed by three or more
  // sounding inputs differs by rounding (up to ~1e-4 after the filters and the limiter) between identical renders.
  // With taps, every junction becomes a ladder of gain nodes with two inputs each (one input, and the next rung), which
  // commute exactly: the same sum, in a fixed order. A voice's rung is reused once the voice has ended (a finished
  // source sends exact zeros, which change no sum), so a ladder is as long as the most voices sounding at once.
  // Without taps, inlet() returns the node itself and the graph is the game's.
  const spent: [number, () => void][] = [];   // export: finished voices to disconnect at the next tick after they end
  const ladders = new WeakMap<AudioNode, { node: GainNode; until: number }[]>();
  function inlet(dest: AudioNode, from = -Infinity, until = Infinity): AudioNode {
    if (!tap || !ctx) return dest;
    let rungs = ladders.get(dest);
    if (!rungs) { rungs = []; ladders.set(dest, rungs); }
    for (const r of rungs) if (r.until <= from) { r.until = until; return r.node; }
    const n = ctx.createGain();
    n.connect(rungs.length ? rungs[rungs.length - 1].node : dest);
    rungs.push({ node: n, until });
    return n;
  }
  /** Export: a gate (gain = tap.gate(source)) in front of dest, or dest itself when nothing is gated. */
  function gateTo(source: string, dest: AudioNode): AudioNode {
    if (!tap || !ctx) return dest;
    const d = inlet(dest);
    if (!gate) return d;
    const g = ctx.createGain(); g.gain.value = gate(source); g.connect(d);
    return g;
  }
  const uiOut = (): AudioNode => uiGate ?? uiBus!;
  const uiRev = (): AudioNode | null => uiRevGate ?? revIn;

  const now = (): number => (opts.clock ? opts.clock() : ctx ? ctx.currentTime : 0);
  const perf = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const calm = (): boolean => {
    if (calmOverride != null) return calmOverride;
    try { mq = mq ?? (typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null); return !!mq?.matches; } catch { return false; }
  };

  /* ---------------- parameters: always ramps ---------------- */

  function ramp(p: AudioParam, v: number, tc: number, at?: number): void {
    if (!Number.isFinite(v)) return;
    const prev = last.get(p);
    if (prev !== undefined && Math.abs(v - prev) <= 1e-4 * Math.max(1e-3, Math.abs(prev))) return;
    last.set(p, v);
    const t = at ?? now();
    try { p.cancelScheduledValues(t); p.setTargetAtTime(v, t, tc); } catch { /* closed context */ }
  }

  /* ---------------- context ---------------- */

  function ensureContext(): boolean {
    if (ctx) return true;
    if (unavailable || destroyed) return false;
    try {
      if (external) ctx = external;
      else {
        const w = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
        const AC = w.AudioContext ?? w.webkitAudioContext;
        if (!AC) { unavailable = true; return false; }
        try { ctx = new AC({ latencyHint: 'interactive' }); } catch { ctx = new AC(); }
        // Mix with other audio (a podcast) and respect the ringer switch, where Safari offers the choice.
        try { const n = navigator as Navigator & { audioSession?: { type: string } }; if (n.audioSession) n.audioSession.type = 'ambient'; } catch { /* ignore */ }
        const live = ctx as AudioContext;
        live.onstatechange = () => onState();
      }
      attach(ctx); attached = ctx;
      buildBuses();
      return true;
    } catch {
      unavailable = true; ctx = null; return false;
    }
  }

  function buildBuses(): void {
    const c = ctx!;
    canPan = typeof (c as AudioContext).createStereoPanner === 'function';
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = LIMITER.threshold; lim.knee.value = LIMITER.knee; lim.ratio.value = LIMITER.ratio; lim.attack.value = LIMITER.attack; lim.release.value = LIMITER.release;
    master = c.createGain(); master.gain.value = 0;
    duck = c.createGain(); duck.gain.value = 1;
    worldBus = c.createGain(); worldBus.gain.value = vol.world ** 2;
    uiBus = c.createGain(); uiBus.gain.value = vol.interface ** 2;
    worldBus.connect(duck); duck.connect(master); uiBus.connect(master);
    if (tap?.limiter === false) master.connect(c.destination); else { master.connect(lim); lim.connect(c.destination); }
    if (opts.meter) { meter = c.createAnalyser(); meter.fftSize = 2048; meterBuf = new Float32Array(meter.fftSize); lim.connect(meter); }
    // One shared room: a generated impulse (darkening noise tail), returned through a low-pass that follows the air.
    revIn = c.createGain(); revIn.gain.value = 1;
    revLp = c.createBiquadFilter(); revLp.type = 'lowpass'; revLp.frequency.value = 5000;
    const revOut = c.createGain(); revOut.gain.value = tap?.dry ? 0 : 0.5;
    revLp.connect(revOut); revOut.connect(inlet(worldBus));
    if (gate) { uiGate = gateTo('ui', uiBus) as GainNode; uiRevGate = gateTo('ui', revIn) as GainNode; }
    // The impulse is synthesised off the main thread, then split over REV_SEGS convolvers, each delayed by its offset:
    // the same room, but each buffer is short enough that setting it (which a browser prepares on the main thread)
    // stays well under a long task. Live, one segment is set per idle callback; the room is dry for the moment it takes.
    const segs: { conv: ConvolverNode; at: number }[] = [];
    const rin = revIn, rlp = revLp;
    // Export only: the segments are summed in pairs (a tree of two-input junctions). Chromium sums a junction's inputs
    // in an order that can change from render to render, and float addition is not associative, so eight segments into
    // one node differ by ~1e-9 between identical renders; two inputs commute exactly, so the tree is repeatable.
    let tree: AudioNode[] | null = null;
    if (tap) { const mk = (d: AudioNode) => { const n = c.createGain(); n.connect(d); return n; }; const top = mk(rlp); const h = [mk(top), mk(top)]; tree = [mk(h[0]), mk(h[0]), mk(h[1]), mk(h[1])]; }
    const seg = (k: number) => {
      if (segs[k]) return segs[k];
      const conv = c.createConvolver(); conv.normalize = false;
      const dl = c.createDelay(2); dl.delayTime.value = (k * REV_DUR) / REV_SEGS;
      rin.connect(conv); conv.connect(dl); dl.connect(tree ? tree[(k * tree.length / REV_SEGS) | 0] : rlp);
      return (segs[k] = { conv, at: k });
    };
    const fill = (b: AudioBuffer) => {
      const n = b.length, per = Math.ceil(n / REV_SEGS);
      const one = (k: number) => {
        if (ctx !== c || destroyed) return;
        const len = Math.min(per, n - k * per);
        if (len <= 0) return;
        try {
          const sb = c.createBuffer(b.numberOfChannels, len, b.sampleRate);
          for (let ch = 0; ch < b.numberOfChannels; ch++) sb.getChannelData(ch).set(b.getChannelData(ch).subarray(k * per, k * per + len));
          seg(k).conv.buffer = sb;
        } catch { /* ignore */ }
      };
      if (sync) for (let k = 0; k < REV_SEGS; k++) one(k);
      else { let k = 0; const next = () => { one(k++); if (k < REV_SEGS) idle(next); }; idle(next); }
    };
    const ask = () => {
      if (ctx !== c || destroyed) return;
      const ib = obtain({ t: 'impulse', sr: c.sampleRate, dur: REV_DUR, seed }, { sync, pin: true, ctx: c, cb: (b) => { if (b) fill(b); } });
      if (ib) fill(ib);
    };
    // Live, even asking (which starts the worker the first time) waits until the tap is over.
    if (sync) ask(); else idle(ask);
    ramp(master.gain, vol.master ** 2, 0.15);
  }

  const running = (): boolean => !!ctx && (external ? true : (ctx as AudioContext).state === 'running');
  const wanted = (): boolean => enabled && !destroyed && reasons.size === 0;

  function onState(): void {
    if (!ctx || external) return;
    const st = (ctx as AudioContext).state as string;
    if (st === 'running') {
      disarm();
      if (!wanted()) { void (ctx as AudioContext).suspend().catch(() => {}); return; }
      startTimer();
      applySoon();
    } else {
      stopTimer();
      // Interrupted (a call, Siri, another app) or suspended by the system: resume on the next tap.
      if (wanted() && st !== 'closed') arm();
    }
  }

  function startTimer(): void {
    if (timer || external) return;
    timer = setInterval(() => tick(), TICK_MS);
  }
  function stopTimer(): void { if (timer) { clearInterval(timer); timer = null; } }

  function unlock(): boolean {
    if (!enabled || destroyed) return false;
    if (!ensureContext()) return false;
    if (external) return true;
    const a = ctx as AudioContext;
    if (wanted() && a.state !== 'running') {
      try { void a.resume().catch(() => {}); } catch { /* ignore */ }
      // Legacy iOS unlock: start a one-sample silent buffer inside the gesture.
      try { const s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, a.sampleRate); s.connect(a.destination); s.start(0); s.onended = () => s.disconnect(); } catch { /* ignore */ }
    }
    return a.state === 'running';
  }

  const gestureHandler = () => { if (unlock()) disarm(); };
  function arm(): void {
    if (armed || external || typeof document === 'undefined') return;
    armed = true;
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) document.addEventListener(ev, gestureHandler, { capture: true, passive: true });
  }
  function disarm(): void {
    if (!armed || typeof document === 'undefined') return;
    armed = false;
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) document.removeEventListener(ev, gestureHandler, { capture: true });
  }

  const onVisibility = () => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') hold('hidden'); else release('hidden');
  };
  const onPageHide = () => hold('hidden');
  const onPageShow = () => { if (document.visibilityState !== 'hidden') release('hidden'); };
  let listening = false;
  function listen(on: boolean): void {
    if (external || typeof document === 'undefined' || listening === on) return;
    listening = on;
    const f = on ? 'addEventListener' : 'removeEventListener';
    document[f]('visibilitychange', onVisibility);
    window[f]('pagehide', onPageHide);
    window[f]('pageshow', onPageShow);
  }

  function hold(r: string): void {
    reasons.add(r);
    stopTimer();
    if (ctx && !external && (ctx as AudioContext).state === 'running') {
      if (master) ramp(master.gain, 0, 0.03);
      const a = ctx as AudioContext;
      setTimeout(() => { if (!wanted() && a.state === 'running') void a.suspend().catch(() => {}); }, 120);
    }
  }
  function release(r: string): void {
    reasons.delete(r);
    if (!wanted() || !ctx || external) return;
    if (master) { last.delete(master.gain); ramp(master.gain, vol.master ** 2, 0.15); }
    const a = ctx as AudioContext;
    if (a.state !== 'running') { try { void a.resume().then(() => { if (a.state !== 'running') arm(); }).catch(() => arm()); } catch { arm(); } }
    // Rhythm clocks re-anchor at the next tick (anything scheduled in the past is skipped, not crammed in).
    for (const g of graphs) { g.beatAt = now(); for (const l of allLayers(g)) l.next = NaN; }
  }

  /* ---------------- buffers ---------------- */

  /** A looping noise bed's buffer, or null while the worker makes it (cb runs when it is ready). */
  function noise(col: 'pink' | 'white' | 'brown', cb?: (b: AudioBuffer | null) => void): AudioBuffer | null {
    return obtain({ t: 'noise', col, seed }, { sync, pin: true, ctx, cb });
  }

  /** A synthesised recipe, cached; null when it is not ready yet (live: queued in the worker; offline: this tick's
   *  synthesis budget is spent), and the hit is skipped. */
  function recipe(name: string, key: Key, v: number, force = false, cb?: (b: AudioBuffer | null) => void): AudioBuffer | null {
    const job: Job = { t: 'recipe', name, key, v, seed };
    if (sync) {
      if (!force && !tap && synthSpent > SYNTH_BUDGET_MS) return peek(job);
      const t0 = perf();
      const b = obtain(job, { sync: true, ctx });
      synthSpent += perf() - t0;
      return b;
    }
    return obtain(job, { ctx, cb });
  }

  /* ---------------- graphs ---------------- */

  function buildGraph(sector: string): Graph {
    const c = ctx!;
    const def = soundscapeFor(sector);
    const out = c.createGain(); out.gain.value = 0;
    const world = c.createGain(); world.gain.value = 1;
    const air = c.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = def.air.bright; air.Q.value = 0.5;
    const thick = c.createBiquadFilter(); thick.type = 'peaking'; thick.frequency.value = 230; thick.Q.value = 0.8; thick.gain.value = 0;
    const fog = c.createBiquadFilter(); fog.type = 'lowpass'; fog.frequency.value = 16000; fog.Q.value = 0.5;
    // Nothing useful below 60 Hz on a phone, and rumble under a podcast is mud.
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 60; hp.Q.value = 0.6;
    const send = c.createGain(); send.gain.value = def.air.reverb;
    air.connect(hp); hp.connect(thick); thick.connect(fog); fog.connect(world); world.connect(out); out.connect(inlet(worldBus!));
    send.connect(inlet(revIn!));
    const g: Graph = {
      def, sector, out, world, air, thick, fog, send, layers: [], byId: new Map(), traces: new Map(), levers: new Map(),
      rng: rngFrom(seed ^ hash(sector)), tempo: def.tempo[0], tempoTarget: def.tempo[0], beat: 0, beatAt: now(), mix: null, dieAt: 0, blackoutNext: 0, dayAt: NaN,
      bornAt: now(),
    };
    // Layers are built lazily, the first time the mix gives them a level (see apply): an empty valley costs a few nodes,
    // and a busy one thickens as it fills.
    queueWarm(def, sector);
    return g;
  }

  function buildLayer(g: Graph, l: LayerDef, key: Key, dest: AudioNode, sendDest: AudioNode, salt: string): LayerRt {
    const c = ctx!;
    const level = c.createGain(); level.gain.value = 0;
    const cut = c.createGain(); cut.gain.value = 1;
    const send = c.createGain(); send.gain.value = l.send ?? 0.25;
    let head: AudioNode = level;
    if (l.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = l.lp; f.Q.value = 0.6; f.connect(level); head = f; }
    level.connect(cut);
    const src = salt.startsWith('trace:') ? `${salt}:${l.id}` : l.id;
    const out = gateTo(src, dest);
    if (l.kind === 'bed' && l.pan && canPan) { const p = (c as AudioContext).createStereoPanner(); p.pan.value = l.pan; cut.connect(p); p.connect(out); p.connect(send); }
    else { cut.connect(out); cut.connect(send); }
    send.connect(gateTo(src, sendDest));
    const rt: LayerRt = { def: l, key, input: head, level, cut, send, oscs: [], noises: [], rng: rngFrom(seed ^ hash(salt + ':' + l.id)), next: NaN, step: 0, density: 0, pitch: 1, vary: 0, src };
    if (l.kind === 'bed') buildBed(g, rt, l, key);
    return rt;
  }

  function buildBed(g: Graph, rt: LayerRt, l: BedDef, key: Key): void {
    const c = ctx!;
    let into: AudioNode = rt.input;
    if (l.lfo?.to === 'gain') {
      const lg = c.createGain(); lg.gain.value = 1 - l.lfo.depth / 2; lg.connect(into); into = lg; rt.lfoGain = lg;
    }
    if (l.filter) {
      const f = c.createBiquadFilter(); f.type = l.filter[0]; f.frequency.value = l.filter[1]; f.Q.value = l.filter[2] ?? 0.7;
      f.connect(into); into = f; rt.filter = f; rt.baseF = l.filter[1];
    }
    const t = now();
    if (l.src === 'tones') {
      for (const [d, oct, wave, gn, det] of l.tones ?? []) addOsc(freq(key, d, oct), wave, gn, det ?? 0);
      for (const [hz, wave, gn] of l.hz ?? []) addOsc(hz, wave, gn, 0);
    } else {
      const dest = into;
      const startNoise = (b: AudioBuffer, late: boolean) => {
        if (g.dead || ctx !== c) return;
        const chans = l.stereo ? [-0.7, 0.7] : [0];
        const st = now();
        chans.forEach((p, i) => {
          const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.playbackRate.value = rt.pitch || 1;
          let n: AudioNode = s;
          if (l.stereo && canPan) { const pn = (c as AudioContext).createStereoPanner(); pn.pan.value = p; s.connect(pn); n = pn; }
          if (late) {
            // Arriving into a bed that may already be up: fade in rather than step in (no click).
            const fg = c.createGain(); fg.gain.value = 0; fg.gain.setTargetAtTime(1, st, 0.25); n.connect(fg); n = fg;
          }
          n.connect(inlet(dest));
          s.start(st, (rt.rng() * 0.4 + i * 0.5) * b.duration);
          rt.noises.push(s);
        });
      };
      const b = noise(l.src, (nb) => { if (nb) startNoise(nb, true); });
      if (b) startNoise(b, false);
    }
    if (l.lfo) {
      const o = c.createOscillator(); o.type = 'sine';
      const rate = l.lfo.beats ? (l.lfo.rate * g.tempo) / 60 : l.lfo.rate;
      o.frequency.value = rate;
      const dg = c.createGain();
      const amt = l.lfo.to === 'gain' ? l.lfo.depth / 2 : l.lfo.depth * (rt.baseF ?? 500);
      dg.gain.value = amt;
      o.connect(dg);
      dg.connect(l.lfo.to === 'gain' ? rt.lfoGain!.gain : rt.filter!.frequency);
      o.start(t + rt.rng() * 0.1);
      rt.lfo = { osc: o, depth: dg, rate: l.lfo.rate, beats: !!l.lfo.beats, to: l.lfo.to, amt };
    }
    function addOsc(f: number, wave: OscillatorType, gn: number, det: number): void {
      const o = c.createOscillator(); o.type = wave; o.frequency.value = f; o.detune.value = det;
      const og = c.createGain(); og.gain.value = gn;
      o.connect(og); og.connect(inlet(into));
      o.start(t);
      rt.oscs.push({ node: o, f });
    }
  }

  function allLayers(g: Graph): LayerRt[] {
    const a = g.layers.slice();
    for (const tr of g.traces.values()) a.push(...tr.layers);
    for (const l of g.levers.values()) a.push(l);
    if (g.watch) a.push(g.watch);
    return a;
  }

  function killGraph(g: Graph, fast: boolean): void {
    g.dead = true;
    const t = now();
    if (fast) { try { g.out.gain.cancelScheduledValues(t); g.out.gain.setTargetAtTime(0, t, 0.015); } catch { /* ignore */ } }
    const stopAt = t + (fast ? 0.1 : 0.02);
    for (const l of allLayers(g)) {
      for (const o of l.oscs) { try { o.node.stop(stopAt); } catch { /* ignore */ } }
      for (const s of l.noises) { try { s.stop(stopAt); } catch { /* ignore */ } }
      if (l.lfo) try { l.lfo.osc.stop(stopAt); } catch { /* ignore */ }
    }
    const disc = () => { try { g.out.disconnect(); g.send.disconnect(); } catch { /* ignore */ } for (const l of allLayers(g)) { last.delete(l.level.gain); last.delete(l.cut.gain); } last.delete(g.out.gain); };
    if (external) disc(); else setTimeout(disc, fast ? 200 : 60);
  }

  function current(): Graph | null { return graphs.length ? graphs[graphs.length - 1] : null; }

  function showSector(sector: string): Graph {
    const cur = current();
    if (cur && cur.sector === sector && !cur.dieAt) return cur;
    const t = now();
    // Fade out whatever is playing.
    for (const g of graphs) if (!g.dieAt) { g.dieAt = t + XFADE_TC * 6; last.delete(g.out.gain); ramp(g.out.gain, 0, XFADE_TC * 1.2); }
    // Revive a fading graph of this sector, else build.
    let g = graphs.find((x) => x.sector === sector);
    if (g) { graphs = graphs.filter((x) => x !== g); g.dieAt = 0; }
    else {
      g = buildGraph(sector);
      while (graphs.length >= 2) { const old = graphs.shift()!; killGraph(old, true); }
    }
    graphs.push(g);
    last.delete(g.out.gain);
    ramp(g.out.gain, 1, XFADE_TC * 0.6);
    return g;
  }

  /* ---------------- applying a view ---------------- */

  let applyQueued = false;
  /** Apply the last view soon, outside the current task (live), so turning sound on inside a tap builds nothing but the
   *  context and the buses; the world's graph is built at the next idle moment or the next update(). */
  function applySoon(): void {
    if (sync) { if (view) apply(view); return; }
    if (applyQueued) return;
    applyQueued = true;
    idle(() => { applyQueued = false; if (view && ctx && running() && wanted()) apply(view); });
  }

  function apply(v: SceneView): void {
    if (!ctx || !wanted()) return;
    const t0 = perf();
    const sector = wantSector ?? v.sectorId;
    const prev = view;
    view = v;
    if (v.sectorId !== sector) { updateMs = perf() - t0; return; }   // stale view of the old tab
    const g = showSector(sector);
    // Light's day: the sound keeps its own 24-hour minute from dusk, as the picture's clock does (calm: the peak hour).
    let hour: number | null = null;
    if (v.load && Array.isArray(v.load.hours) && v.load.hours.length) {
      if (!Number.isFinite(g.dayAt)) g.dayAt = now();
      hour = calm() ? null : (18 + ((now() - g.dayAt) / DAY_S) * 24) % 24;
    } else g.dayAt = NaN;
    endingAmt = credits ? Math.min(1, endingAmt + 0.08) : Math.max(0, endingAmt - 0.02);
    const m = mixFrom(v, g.def, { calm: calm(), hour, ending: endingAmt });
    g.mix = m;
    g.tempoTarget = m.tempo;
    ramp(g.air.frequency, m.air, 1.2);
    ramp(g.thick.gain, m.thick * 4.5, 1.2);
    ramp(g.send.gain, m.wet, 1);
    ramp(g.world.gain, m.world, m.frozen ? 1.6 : 0.8);
    if (revLp) ramp(revLp.frequency, Math.min(6000, m.air), 1.2);
    for (const l of g.def.layers) {
      const lm = m.layers[l.id];
      let rt = g.byId.get(l.id);
      if (!rt) {
        if (!lm || lm.level <= 0.001) continue;
        // Live: at most BUILD_MS of graph-building per update; the rest of the place arrives on the next ones.
        if (!sync && perf() - t0 > BUILD_MS) continue;
        rt = buildLayer(g, l, g.def.key, g.air, g.send, g.sector);
        if (now() - g.bornAt < 1.5 && graphs.length > 1) rt.fresh = true;
        g.layers.push(rt); g.byId.set(l.id, rt);
      }
      if (l.life && lm) applyLife(g, rt, lm);
      else applyLayer(g, rt, lm);
    }
    applyTraces(g, m);
    applyLevers(g, m);
    applyWatch(g, m);
    // Moments the world plays by itself (the picture plays them too).
    const mo = momentsBetween(prev, v);
    if (mo.crisis) worldCrisis(g);
    if (mo.steadyReached) birdsReturn(g);
    updateMs = perf() - t0;
  }

  /** M4: the sea life. Honest and slow: it comes back over ~15 s and goes in ~2; the world's moments cut or lift it. */
  function applyLife(g: Graph, rt: LayerRt, lm: Mix['layers'][string]): void {
    const t = now();
    let scale = 1, dens = 1;
    const fx = lifeFx && lifeFx.sector === g.sector ? lifeFx : null;
    if (fx) {
      const age = t - fx.t0;
      if (fx.kind === 'cut') { if (age < CUT_HOLD_S) { scale = 0; dens = 0; } else lifeFx = null; }
      else if (age < LIFT_S) { scale = LIFT_GAIN; dens = 1.5; } else lifeFx = null;
    }
    const target = lm.level * rt.def.gain * scale;
    const prev = last.get(rt.level.gain) ?? 0;
    const tc = target > prev * 1.05 + 1e-5 && t - g.bornAt > 3 && !(fx && fx.kind === 'lift') ? LIFE_RISE_TC : fx?.kind === 'lift' ? 0.25 : 0.6;
    applyLayer(g, rt, { ...lm, density: lm.density * dens }, scale, tc);
  }

  function applyLayer(g: Graph, rt: LayerRt, lm: Mix['layers'][string] | undefined, scale = 1, tc = 0.6): void {
    if (!lm) return;
    const l = rt.def;
    rt.variant = lm.variant;
    if (rt.fresh) {
      rt.fresh = false;
      const v0 = lm.level * l.gain * scale;
      try { rt.level.gain.setValueAtTime(v0, now()); } catch { /* ignore */ }
      last.set(rt.level.gain, v0);
    }
    ramp(rt.level.gain, lm.level * l.gain * scale, tc);
    rt.density = lm.density;
    rt.pitch = lm.pitch;
    if (l.kind === 'bed') {
      for (const o of rt.oscs) ramp(o.node.frequency, o.f * lm.pitch, 1.5);
      for (const s of rt.noises) ramp(s.playbackRate, lm.pitch, 1.5);
      if (rt.filter && rt.baseF) {
        const f = Math.min(9000, rt.baseF * lm.tone);
        ramp(rt.filter.frequency, f, 1.2);
        if (rt.lfo?.to === 'filter') ramp(rt.lfo.depth.gain, (l.lfo?.depth ?? 0) * f, 1.2);
      }
      if (rt.lfo?.beats) ramp(rt.lfo.osc.frequency, (rt.lfo.rate * g.tempoTarget) / 60, 2);
    }
    if (!lm.blackout) ramp(rt.cut.gain, 1, 0.05);
  }

  function applyTraces(g: Graph, m: Mix): void {
    for (const [sid, h] of Object.entries(m.traces)) {
      const def = SOUNDSCAPES[sid];
      if (!def || sid === g.sector || !def.trace.length) continue;
      let tr = g.traces.get(sid);
      if (!tr) {
        const c = ctx!;
        const gain = c.createGain(); gain.gain.value = 0;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5;
        gain.connect(lp); lp.connect(inlet(g.air));
        const layers = def.trace.map((id) => def.layers.find((x) => x.id === id)).filter((x): x is LayerDef => !!x)
          .map((l) => { const rt = buildLayer(g, l, def.key, gain, g.send, `trace:${sid}`); rt.traceOf = sid; return rt; });
        tr = { gain, lp, layers };
        g.traces.set(sid, tr);
      }
      ramp(tr.gain.gain, h * 0.7 * m.world * (def.traceGain ?? 1), 1.5);
      for (const rt of tr.layers) applyLayer(g, rt, { level: 1, density: rt.def.kind === 'hits' ? 0.6 * (m.frozen ? 0.1 : 1) : 0, pitch: m.frozen ? 0.85 : 1, tone: 1, blackout: false });
    }
    for (const [sid, tr] of g.traces) if (!(sid in m.traces)) ramp(tr.gain.gain, 0, 1.5);
  }

  function applyLevers(g: Graph, m: Mix): void {
    for (const kind of Object.keys(m.levers)) {
      let rt = g.levers.get(kind);
      if (!rt) {
        const name = g.def.levers?.[kind] ?? (hasRecipe(`lv.${kind}`) ? `lv.${kind}` : 'lv.generic');
        const def: HitsDef = { id: `lever:${kind}`, kind: 'hits', recipe: name, rate: 1 / 22, minGap: 10, pan: [-0.6, 0.6], gain: 0.07, level: { add: [['one', 1]] }, send: 0.4, lp: 3500 };
        rt = buildLayer(g, def, g.def.key, g.air, g.send, `lever:${kind}`);
        g.levers.set(kind, rt);
      }
      const bite = m.bites[kind] ?? 0;
      // A lever that bites back sours: its signature drops a little flat and, past half, a second voice beats against it.
      applyLayer(g, rt, { level: 1, density: (calm() ? 0.5 : 1) * (m.frozen ? 0 : 1), pitch: 1 - 0.05 * bite, tone: 1, blackout: false });
      rt.sour = bite;
    }
    for (const [kind, rt] of g.levers) if (!(kind in m.levers)) { ramp(rt.level.gain, 0, 0.8); rt.density = 0; }
  }

  /** The proprietor's watch, after the Proprietor's Day: a faint tick now and then, at most one every two seconds. */
  function applyWatch(g: Graph, m: Mix): void {
    if (m.watch <= 0) { if (g.watch) { g.watch.density = 0; } return; }
    if (!g.watch) {
      const def: HitsDef = { id: 'watch', kind: 'hits', recipe: 'watchTick', variants: 2, rate: 0.5, minGap: 2, pan: [0.15, 0.3], gain: 0.07, level: { add: [['one', 1]] }, send: 0.05, lp: 4000 };
      g.watch = buildLayer(g, def, g.def.key, g.air, g.send, 'watch');
    }
    applyLayer(g, g.watch, { level: 1, density: m.watch * (calm() ? 0.6 : 1), pitch: 1, tone: 1, blackout: false });
  }

  function worldCrisis(g: Graph): void {
    const t = now() + 0.05;
    try {
      const f = g.fog.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(16000, t);
      f.exponentialRampToValueAtTime(700, t + 2.2);
      f.setValueAtTime(700, t + 6);
      f.exponentialRampToValueAtTime(16000, t + 12);
    } catch { /* ignore */ }
    const swell = recipe(g.def.crisis.swell ?? 'fogSwell', g.def.key, 0, true);
    if (swell && playBuf(swell, gateTo('crisis', g.out), t, 0.22 * (calm() ? 0.7 : 1), 0, null, gateTo('crisis', g.send), 0.5, worldEnds, MAX_WORLD_VOICES + 2)) tap?.onVoice?.({ source: 'crisis', at: t, dur: swell.duration, grid: false });
    const bell = recipe(g.def.crisis.recipe, g.def.key, 0, true);
    if (bell && playBuf(bell, gateTo('crisis', g.out), t + 0.6, g.def.crisis.gain * (calm() ? 0.7 : 1), 0, null, gateTo('crisis', g.send), 0.6, worldEnds, MAX_WORLD_VOICES + 2)) tap?.onVoice?.({ source: 'crisis', at: t + 0.6, dur: bell.duration, grid: false });
  }

  function birdsReturn(g: Graph): void {
    // The quiet's own voice: birds; Code's owl; M4: Iron's nightjar, Fishing's gulls (only hit layers: Iron's 'night' is a bed).
    const voice = (r: string) => g.layers.find((l) => l.def.kind === 'hits' && (l.def as HitsDef).recipe === r);
    const rt = voice('bird') ?? voice('owl') ?? voice('nightjar') ?? voice('gull');
    if (!rt) return;
    for (let i = 0; i < 3; i++) playHit(g, rt, now() + 0.8 + i * 0.9 + rt.rng() * 0.4, 1.4);
  }

  /* ---------------- scheduling ---------------- */

  function tick(): void {
    if (!ctx || !wanted() || !running()) return;
    const t0 = perf();
    synthSpent = 0;
    const t = now();
    const horizon = t + LOOKAHEAD;
    for (const g of graphs.slice()) {
      if (g.dieAt && t > g.dieAt) { killGraph(g, false); graphs = graphs.filter((x) => x !== g); continue; }
      // Beat clock: tempo glides towards its target, the beat advances with it.
      const dt = Math.max(0, t - g.beatAt);
      g.tempo += (g.tempoTarget - g.tempo) * (1 - Math.exp(-dt / 2));
      g.beat += (dt * g.tempo) / 60;
      g.beatAt = t;
      tap?.onTick?.({ t, beat: g.beat, tempo: g.tempo, sector: g.sector });
      if (!g.mix) continue;
      for (const rt of allLayers(g)) if (rt.def.kind === 'hits') schedule(g, rt, t, horizon);
      if (g.mix.stress > 0.01 && !g.dieAt) blackouts(g, t);
    }
    if (credits) creditsTick(t, horizon);
    if (spent.length) { for (let i = spent.length - 1; i >= 0; i--) if (spent[i][0] <= t) { spent[i][1](); spent.splice(i, 1); } }
    // Offline: prewarm at most one recipe per tick, and only if nothing was synthesised for a hit this tick. (Live, the
    // whole list went to the worker when the graph was built.)
    if (sync && synthSpent === 0 && warm.length) { const [n, k, v] = warm.shift()!; recipe(n, k, v, true); }
    tickMs = perf() - t0;
  }

  function queueWarm(def: SoundscapeDef, sector: string): void {
    warm.length = 0;
    const pal = paletteFor(sector, view?.look);
    // Interface sounds first (a reveal must not stall on first use), the commonest first; then the world's.
    for (const k of ['sell', 'buy', 'cannotAfford', 'found', 'headline', 'lever', 'decade', 'fork', 'crisis', 'backfire', 'reveal', 'steady', 'reckoning', 'industryOpened', 'ageBegun'] as SoundEventKind[])
      for (let v = 0; v < (KIND_VARIANTS[k] ?? 1); v++) warm.push([`ui:${pal}:${k}`, def.key, v]);
    for (const l of def.layers) if (l.kind === 'hits') for (let v = 0; v < (l.variants ?? 1); v++) warm.push([l.recipe, def.key, v]);
    warm.push([def.crisis.recipe, def.key, 0], [def.crisis.swell ?? 'fogSwell', def.key, 0]);
    if (!sync) { for (const [n, k, v] of warm) recipe(n, k, v); warm.length = 0; }
  }

  function schedule(g: Graph, rt: LayerRt, t: number, horizon: number): void {
    const l = rt.def as HitsDef;
    if (rt.density <= 0.001) { rt.next = NaN; return; }
    const spb = 60 / g.tempo;
    if (l.grid) {
      const every = l.grid.every;
      if (!Number.isFinite(rt.next) || rt.next < g.beat - 1) rt.next = Math.ceil(g.beat / every + 1e-6) * every;
      let guard = 0;
      while (guard++ < 64) {
        const at = t + (rt.next - g.beat) * spb;
        if (at > horizon) break;
        const pat = l.grid.pattern ?? [1];
        const p = Math.min(1, pat[rt.step % pat.length] * rt.density);
        if (at >= t - 0.01 && rt.rng() < p) playHit(g, rt, Math.max(t, at + (l.grid.jitter ?? 0) * (rt.rng() * 2 - 1)));
        rt.step++;
        rt.next += every;
      }
    } else {
      const rate = (l.rate ?? 0.1) * rt.density;
      const gap = () => Math.max(l.minGap ?? 0.2, -Math.log(1 - rt.rng() * 0.999) / rate);
      if (!Number.isFinite(rt.next) || rt.next < t - 1) rt.next = t + gap() * (0.3 + 0.7 * rt.rng());
      let guard = 0;
      while (rt.next <= horizon && guard++ < 16) {
        if (rt.next >= t - 0.01) playHit(g, rt, Math.max(t, rt.next));
        rt.next += gap();
      }
    }
  }

  function playHit(g: Graph, rt: LayerRt, at: number, boost = 1): void {
    const l = rt.def as HitsDef;
    const v = l.variantBy && rt.variant != null ? rt.variant : l.variants ? (rt.vary = (rt.vary + 1 + Math.floor(rt.rng() * (l.variants - 1))) % l.variants) : 0;
    const b = recipe(l.recipe, rt.key, v);
    if (!b) return;
    let rate = rt.pitch;
    if (l.notes?.length) rate *= ratio(rt.key, l.notes[Math.floor(rt.rng() * l.notes.length)]);
    else rate *= 1 + (rt.rng() - 0.5) * 0.03;
    const vel = (0.72 + 0.28 * rt.rng()) * boost;
    const [p0, p1] = l.pan ?? [0, 0];
    const pan = p0 + (p1 - p0) * rt.rng();
    const sweep = l.sweep ? (rt.rng() < 0.5 ? -1 : 1) : 0;
    const ok = playBuf(b, rt.input, at, vel, pan, sweep ? sweep : null, null, 0, worldEnds, MAX_WORLD_VOICES, rate);
    if (ok) tap?.onVoice?.({ source: rt.src, at, dur: b.duration / rate, grid: !!l.grid });
    if ((rt.sour ?? 0) > 0.3) playBuf(b, rt.input, at + 0.018, vel * 0.7 * (rt.sour ?? 0), -pan, null, null, 0, worldEnds, MAX_WORLD_VOICES, rate * (1 + 0.035 * (rt.sour ?? 0)));
  }

  function blackouts(g: Graph, t: number): void {
    if (!g.blackoutNext) g.blackoutNext = t + 2 + g.rng() * 4;
    if (t < g.blackoutNext) return;
    const s = g.mix!.stress;
    const cand = g.layers.filter((l) => l.def.blackout && (g.mix!.layers[l.def.id]?.level ?? 0) > 0.01);
    const n = Math.max(1, Math.round(cand.length * (0.4 + 0.6 * s * g.rng())));
    const dur = 0.4 + g.rng() * (1 + 2.5 * s);
    const at = t + 0.05;
    for (const rt of cand.slice().sort(() => g.rng() - 0.5).slice(0, n)) {
      const p = rt.cut.gain;
      try {
        p.cancelScheduledValues(at);
        p.setValueAtTime(1, at);
        p.linearRampToValueAtTime(0, at + 0.03);
        p.setValueAtTime(0, at + dur);
        p.linearRampToValueAtTime(1, at + dur + 0.08);
      } catch { /* ignore */ }
      last.delete(p);
    }
    g.blackoutNext = t + dur + (3 + 10 * g.rng()) * (1.4 - s) * (calm() ? 2 : 1);
  }

  /** Play one buffer: source → gain → (pan) → dest. `ends` tracks voices for the cap. */
  function playBuf(b: AudioBuffer, dest: AudioNode, at: number, gain: number, pan: number, sweep: number | null, sendTo: AudioNode | null, sendAmt: number,
    ends: number[], cap: number, rate = 1): boolean {
    const c = ctx!;
    const t = now();
    for (let i = ends.length - 1; i >= 0; i--) if (ends[i] <= t) ends.splice(i, 1);
    if (ends.length >= cap) return false;
    try {
      const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
      const gn = c.createGain(); gn.gain.value = gain;
      s.connect(gn);
      let tail: AudioNode = gn;
      const dur = b.duration / rate;
      if (canPan && (pan || sweep)) {
        const p = (c as AudioContext).createStereoPanner();
        if (sweep) { p.pan.setValueAtTime(-0.85 * sweep, at); p.pan.linearRampToValueAtTime(0.85 * sweep, at + dur); }
        else p.pan.value = Math.max(-1, Math.min(1, pan));
        gn.connect(p); tail = p;
      }
      const until = at + dur + 0.05;
      tail.connect(inlet(dest, at, until));
      let sg: GainNode | null = null;
      if (sendTo && sendAmt > 0) { sg = c.createGain(); sg.gain.value = sendAmt; tail.connect(sg); sg.connect(inlet(sendTo, at, until)); }
      s.start(at);
      const off = () => { try { s.disconnect(); gn.disconnect(); tail.disconnect(); sg?.disconnect(); } catch { /* ignore */ } };
      // Export: the voice is let go at a scheduler tick after it ends (a fixed point in the render), not when the
      // 'ended' event happens to reach this thread, so the graph changes at the same moment in every render.
      if (tap) spent.push([until, off]); else s.onended = off;
      ends.push(at + dur);
      return true;
    } catch { return false; }
  }

  /* ---------------- interface sounds ---------------- */

  function uiEvent(asked: SoundEventKind, d: SoundEventDetail = {}): void {
    if (!ctx || !wanted() || !running() || !uiBus) return;
    // M4: the world's own moments (no interface sound): the sea life cut, or lifted for the Board's Survey.
    if (asked === 'surveyed' && d.label !== 'reveal') return;
    const wk = SOUND_EVENT_ALIASES[asked] ?? asked;
    if ((WORLD_EVENT_KINDS as readonly string[]).includes(wk)) { worldEvent(wk as SoundEventKind, d); return; }
    let kind = wk as OwnKind;
    if (!Object.prototype.hasOwnProperty.call(KIND_GAIN, kind)) return;   // unknown kinds: silence
    if (kind === 'answer' && d.by === 'default') kind = 'letterExpired';
    // M4: a wager's answer carries label 'won' | 'lost': the coin on the counter instead of the pen and stamp.
    if (kind === 'answer' && (d.label === 'won' || d.label === 'lost')) kind = 'wager';
    const sector = d.sector ?? current()?.sector ?? view?.sectorId ?? '';
    const pal = paletteFor(sector, d.look ?? view?.look);
    const key = soundscapeFor(sector).key;
    const t = now();
    const strength = Math.max(0.2, Math.min(1, d.strength ?? 1));
    let gain = KIND_GAIN[kind] * strength * (calm() ? 0.75 : 1) * (d.first ? 1.1 : 1);
    let name = `ui:${pal}:${kind}`;
    let after: (() => void) | null = null;
    if (kind === 'letter') {
      // Never nagging: a letter soon after another is softer and comes without its writer's motif.
      const close = t - lastLetter < LETTER_SPACING_S;
      lastLetter = t;
      if (close) gain *= 0.6;
      const fam = d.cast ? CAST_FAMILY[d.cast] ?? (d.cast in MOTIFS ? d.cast : null) : null;
      if (fam && !close) after = () => { const mb = recipe(`ui:${pal}:motif.${fam}`, key, 0, true); if (mb) playBuf(mb, uiOut(), now() + 0.01 + MOTIF_AT[pal as keyof typeof MOTIF_AT], gain * 0.8, 0, null, uiRev(), 0.3, uiEnds, MAX_UI_VOICES + 1); };
    }
    if (kind === 'seam') {
      const dep = Math.max(0, Math.min(1, d.depth ?? 0));
      name = 'seamSink';
      seamV = Math.round(dep * 3);
    }
    if (kind === 'bite' && d.lever) {
      // The lever's own small signature, twice, flat and beating: the thing you did, gone sour.
      const lv = soundscapeFor(sector).levers?.[d.lever] ?? (hasRecipe(`lv.${d.lever}`) ? `lv.${d.lever}` : null);
      if (lv) {
        const lb = recipe(lv, key, 0, true, (nb) => { if (nb && ctx && running()) sourPair(nb, now() + 0.01, gain); });
        if (lb) sourPair(lb, t + 0.005, gain);
        duckFor(kind, t);
        return;
      }
    }
    if (kind === 'ending') startCredits(pal, key);
    if (kind === 'actEnding') startCredits(pal, key, ACT_CREDITS_S, 1.5);
    if (kind === 'ledgerContinues') stopCredits(3);
    let rate = 1;
    const nv = KIND_VARIANTS[kind] ?? 1;
    let v = nv > 1 ? Math.floor(uiRng() * nv) : 0;
    if (kind === 'sell') {
      // 8 taps a second must not machine-gun: drop taps closer than 45 ms, soften as the rate climbs, vary the
      // variant and climb a little scale on a streak (resets after a pause), and never more than 3 at once.
      if (lastSell >= 0 && t - lastSell < 0.045) return;
      sellStreak = lastSell >= 0 && t - lastSell < 0.5 ? sellStreak + 1 : 0;
      lastSell = t;
      sellTimes = sellTimes.filter((x) => x > t - 1); sellTimes.push(t);
      const r = sellTimes.length;
      if (r > 3) gain *= Math.pow(3 / r, 0.7);
      v = (sellStreak + Math.floor(uiRng() * 2)) % nv;
      rate = Math.pow(2, semis(key, sellStreak % 5) / 24) * (1 + (uiRng() - 0.5) * 0.04);
      for (let i = sellEnds.length - 1; i >= 0; i--) if (sellEnds[i] <= t) sellEnds.splice(i, 1);
      if (sellEnds.length >= MAX_SELL_VOICES) return;
    }
    if (tap?.variant != null && nv > 1) v = Math.abs(Math.round(tap.variant)) % nv;
    const pan = Math.max(-0.6, Math.min(0.6, d.pan ?? 0));
    const go = (b: AudioBuffer, at: number) => {
      const ok = playBuf(b, uiOut(), at, gain, pan, null, kind === 'sell' || kind === 'cannotAfford' ? null : uiRev(), 0.25, uiEnds, MAX_UI_VOICES, rate);
      if (ok && kind === 'sell') sellEnds.push(at + b.duration / rate);
      const dk = DUCKS[kind];
      if (ok && dk && duck) {
        const p = duck.gain;
        try { p.cancelScheduledValues(at); p.setTargetAtTime(dk[0], at, 0.08); p.setTargetAtTime(1, at + dk[1], 0.8); } catch { /* ignore */ }
      }
    };
    const c0 = ctx;
    // Not synthesised yet (the first moments after sound is turned on): play it when it is ready if that is soon, or at
    // any delay for the rare moments that must not be lost; a tap's sound that would arrive late is dropped.
    if (kind === 'seam') v = seamV;
    if (kind === 'wager') v = (d.outcome ?? (d.label === 'lost' ? 'lost' : 'won')) === 'lost' ? 1 : 0;
    const b = recipe(name, key, v, true, (nb) => {
      if (!nb || ctx !== c0 || !wanted() || !running()) return;
      const late = now() - t;
      if (late < 0.3 || LATE_OK.has(kind)) { go(nb, now() + 0.01); after?.(); }
    });
    if (b) { go(b, t + 0.005); after?.(); }
  }
  let seamV = 0;

  /** M4: 'thresholdCrossed' (the sea life cuts out over two seconds, no sting) and 'surveyReveal' (it comes up a few dB
   *  for two seconds under the card, no sting). Acts on the sector named, else the one showing; the current view is
   *  re-applied at once so the change starts now, not at the next update. */
  function worldEvent(kind: SoundEventKind, d: SoundEventDetail): void {
    const sector = d.sector ?? current()?.sector ?? view?.sectorId ?? '';
    lifeFx = { sector, kind: kind === 'thresholdCrossed' ? 'cut' : 'lift', t0: now() };
    const g = current();
    if (!view || !g || g.sector !== sector) return;
    apply(view);
    // The lift is heard, not only set: the sea life that is there (and only that) calls once or twice now. A sea near
    // its threshold has almost nothing to lift, and the moment is then nearly silent: the honest world.
    if (lifeFx.kind === 'lift' && g.mix && !g.mix.frozen) for (const rt of g.layers) {
      if (!rt.def.life || rt.def.kind !== 'hits' || (g.mix.layers[rt.def.id]?.level ?? 0) < 0.02) continue;
      const n = rt.def.id === 'gulls' ? 2 : 1;
      for (let i = 0; i < n; i++) playHit(g, rt, now() + 0.25 + i * 0.7 + rt.rng() * 0.3, 1.1);
    }
  }

  function duckFor(kind: SoundEventKind, at: number): void {
    const dk = DUCKS[kind];
    if (!dk || !duck) return;
    const p = duck.gain;
    try { p.cancelScheduledValues(at); p.setTargetAtTime(dk[0], at, 0.08); p.setTargetAtTime(1, at + dk[1], 0.8); } catch { /* ignore */ }
  }

  function sourPair(b: AudioBuffer, at: number, gain: number): void {
    playBuf(b, uiOut(), at, gain * 0.9, -0.2, null, uiRev(), 0.3, uiEnds, MAX_UI_VOICES, 0.945);
    playBuf(b, uiOut(), at + 0.022, gain * 0.7, 0.2, null, uiRev(), 0.3, uiEnds, MAX_UI_VOICES, 0.97);
  }

  /* ---------------- the first ending's credits ---------------- */

  function startCredits(pal: string, key: Key, hold = CREDITS_S, slow = 1): void {
    if (!ctx || !worldBus) return;
    stopCredits(1.5);
    const c = ctx, t = now();
    const out = c.createGain(); out.gain.value = 0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.5;
    lp.connect(out); out.connect(gateTo('credits', worldBus));
    const send = c.createGain(); send.gain.value = 0.35; out.connect(send); if (revIn) send.connect(gateTo('credits', revIn));
    const oscs: OscillatorNode[] = [], lfos: OscillatorNode[] = [];
    const rng = rngFrom(seed ^ 0xe7d);
    // The held chord: tonic, fifth and octave low, the ninth above; each voice breathes on its own slow cycle, so the
    // whole never repeats exactly and never swells much (a narrow loudness range is the point).
    const voices: [number, number, OscillatorType, number][] = [[0, 1, 'sine', 0.5], [4, 1, 'sine', 0.32], [0, 2, 'triangle', 0.16], [1, 2, 'sine', 0.12], [2, 2, 'sine', 0.1]];
    voices.forEach(([d, oct, wave, gn], i) => {
      const o = c.createOscillator(); o.type = wave; o.frequency.value = freq(key, d, oct); o.detune.value = (rng() - 0.5) * 6;
      const vg = c.createGain(); vg.gain.value = gn;
      const l = c.createOscillator(); l.frequency.value = 0.045 + 0.02 * i + 0.01 * rng();
      const ld = c.createGain(); ld.gain.value = gn * 0.28;
      l.connect(ld); ld.connect(vg.gain);
      o.connect(vg); vg.connect(inlet(lp));
      o.start(t); l.start(t + rng() * 2);
      oscs.push(o); lfos.push(l);
    });
    out.gain.setTargetAtTime(0.11, t, 1.6);
    credits = { out, oscs, lfos, t0: t, stopAt: t + hold, nextBell: t + 6 * slow, key, pal, rng, slow };
  }

  function creditsTick(t: number, horizon: number): void {
    const cr = credits!;
    if (t >= cr.stopAt) { stopCredits(6); return; }
    while (cr.nextBell <= horizon) {
      const degs = [0, 2, 4, 7, 9, 4];
      const d = degs[Math.floor(cr.rng() * degs.length)];
      const b = recipe(`ui:${cr.pal}:decade`, cr.key, 0, true);
      if (b && cr.nextBell >= t - 0.01) playBuf(b, cr.out, Math.max(t, cr.nextBell), 0.5 + 0.2 * cr.rng(), (cr.rng() - 0.5) * 0.8, null, null, 0, worldEnds, MAX_WORLD_VOICES, ratio(cr.key, d) * 0.5);
      cr.nextBell += (7 + 5 * cr.rng()) * cr.slow;
    }
  }

  function stopCredits(fade: number): void {
    const cr = credits;
    if (!cr) return;
    credits = null;
    const t = now();
    try { cr.out.gain.cancelScheduledValues(t); cr.out.gain.setTargetAtTime(0, t, fade / 4); } catch { /* ignore */ }
    for (const o of [...cr.oscs, ...cr.lfos]) { try { o.stop(t + fade * 1.5); } catch { /* ignore */ } }
    const d = () => { try { cr.out.disconnect(); } catch { /* ignore */ } };
    if (external) { /* offline: leave it connected; the render ends */ } else setTimeout(d, fade * 1500 + 100);
  }

  /* ---------------- public ---------------- */

  const api: Soundscape = {
    update(v) {
      if (destroyed || !v) return;
      if (wantSector && v.sectorId === wantSector) wantSector = null;
      if (!enabled) { view = v; return; }
      if (!ctx || !running() || !wanted()) { view = v; return; }
      apply(v);
    },
    setSector(id) {
      if (destroyed) return;
      wantSector = id;
      if (view && view.sectorId === id && ctx && running()) { wantSector = null; apply(view); }
    },
    event(kind, detail) { try { uiEvent(kind, detail); } catch { /* never throw into the page */ } },
    setEnabled(on) {
      if (destroyed) return;
      enabled = !!on;
      if (enabled) {
        listen(true);
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') reasons.add('hidden');
        if (!unlock()) arm();
        if (ctx && master) { last.delete(master.gain); ramp(master.gain, vol.master ** 2, 0.15); }
        if (running()) { startTimer(); applySoon(); }
      } else {
        disarm(); listen(false); stopTimer();
        if (ctx && master) ramp(master.gain, 0, 0.05);
        if (ctx && !external) { const a = ctx as AudioContext; setTimeout(() => { if (!enabled && a.state === 'running') void a.suspend().catch(() => {}); }, 300); }
      }
    },
    setVolume(p) {
      vol = { ...vol, ...Object.fromEntries(Object.entries(p).filter(([, x]) => typeof x === 'number' && Number.isFinite(x)).map(([k, x]) => [k, Math.max(0, Math.min(1, x as number))])) };
      if (!ctx) return;
      if (master && wanted()) ramp(master.gain, vol.master ** 2, 0.08);
      if (worldBus) ramp(worldBus.gain, vol.world ** 2, 0.08);
      if (uiBus) ramp(uiBus.gain, vol.interface ** 2, 0.08);
    },
    setCalm(on) { calmOverride = on; if (view && ctx && running()) apply(view); },
    unlock() { try { return unlock(); } catch { return false; } },
    suspend() { hold('page'); },
    resume() { release('page'); if (wanted() && !running()) arm(); },
    tick() { try { tick(); } catch { /* ignore */ } },
    stats(): SoundscapeStats {
      const t = now();
      const live = (a: number[]) => a.filter((x) => x > t).length;
      let beds = 0;
      for (const g of graphs) for (const l of allLayers(g)) beds += l.oscs.length + l.noises.length;
      const state: SoundscapeStats['state'] = unavailable ? 'unavailable' : !enabled ? 'off' : !ctx ? 'locked'
        : running() ? (reasons.size ? 'suspended' : 'running') : reasons.size ? 'suspended' : 'locked';
      let levelDb: number | undefined, peakDb: number | undefined;
      if (meter && meterBuf) {
        meter.getFloatTimeDomainData(meterBuf);
        let s2 = 0, pk = 0;
        for (let i = 0; i < meterBuf.length; i++) { const x = meterBuf[i]; s2 += x * x; pk = Math.max(pk, Math.abs(x)); }
        levelDb = 20 * Math.log10(Math.sqrt(s2 / meterBuf.length) + 1e-9); peakDb = 20 * Math.log10(pk + 1e-9);
      }
      return { state, voices: live(worldEnds) + live(uiEnds), beds, graphs: graphs.length, sampleRate: ctx?.sampleRate ?? 0, updateMs, tickMs, bufferSamples: bankSamples(), levelDb, peakDb };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopTimer(); disarm(); listen(false);
      for (const g of graphs) killGraph(g, true);
      graphs = [];
      stopCredits(0.1);
      last.clear(); warm.length = 0;
      if (attached) { detach(attached); attached = null; }
      if (ctx && !external) { const a = ctx as AudioContext; a.onstatechange = null; setTimeout(() => { void a.close().catch(() => {}); }, 400); }
      ctx = null;
    },
  };
  if (external) { ensureContext(); }
  else if (enabled) { listen(true); arm(); }
  return api;
}
