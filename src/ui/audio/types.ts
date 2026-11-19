// Soundscape — public types.
//
// The soundscape is driven by the SAME SceneView as the picture (../scene/types), so sound and picture cannot
// disagree. The mapping from a view to a mix (./mix.ts) is pure and testable; the Web Audio graph (./engine.ts) only
// ramps parameters towards what the mix says and plays the transients the scheduler asks for.
import type { SceneView } from '../scene/types';

export type { SceneView };

/** The interface moments the page may call. Named after the game's moments, one-to-one with the planned contract
 *  event list. */
export type SoundEventKind =
  | 'sell'            // capital from selling service: must survive 8 taps a second
  | 'buy'             // an upgrade bought
  | 'cannotAfford'    // a tap on something out of reach
  | 'found'           // an application founded (a short built-up gesture)
  | 'lever'           // a lever enacted or raised
  | 'fork'            // a run fork chosen
  | 'headline'        // a broadsheet headline arrives
  | 'reveal'          // The Coal Question: the reveal
  | 'backfire'        // rebound first passes 100%: the signature sting
  | 'crisis'          // a crisis fires (the world also plays its own fog from SceneView.crises)
  | 'decade'          // a decade earned (milestone)
  | 'steady'          // Steady State reached
  | 'reckoning'       // a Reckoning (the world winds down from SceneView.reckoning)
  | 'industryOpened'  // a new Industry opened
  | 'ageBegun'        // a new Age begun
  /* --- M3 (additive). Each has a contract-named alias (below) that plays the same sound. --- */
  | 'seam'            // a seam sunk (event 'seamSunk'): a deep blast, the cage bell, a pump stroke; detail.depth 0–1 = lower
  | 'letter'          // a dispatch arrives ('dispatchArrived'): the post in the Age's idiom, then the writer's motif (detail.cast)
  | 'letterOpened'    // the player opens a dispatch: paper (or a key) — very small
  | 'answer'          // a dispatch answered ('dispatchAnswered'): pen, stamp or key; detail.by 'default' plays 'letterExpired'
  | 'letterExpired'   // a dispatch lapsed unanswered: barely there
  | 'bite'            // a lever's side effect first bites ('biteBack'): the lever's own signature, detuned (detail.lever = kind)
  | 'survey'          // the household return published ('returnPublished'): a ledger page and a clock's tick
  | 'proprietor'      // the Proprietor's Day: his watch, heard for the first time (ducks the world, like 'reveal')
  | 'ending'          // the first ending ('ending'): the world resolves and clears; a credits bed holds for about a minute
  | 'ledgerContinues' // "The ledger continues": the credits bed gives way to play, with a pen stroke
  | 'arrived'         // a new system unlocks ('featureUnlocked'): one small "something has arrived" cue per Age
  | 'history'         // a History cleared ('historyCleared'): a line ruled off
  /* contract-named aliases of the above (the page may call either) */
  | 'seamSunk' | 'dispatchArrived' | 'dispatchAnswered' | 'biteBack' | 'returnPublished' | 'featureUnlocked' | 'historyCleared';

/** M3: contract event names accepted as aliases of the sound's own name. */
export const SOUND_EVENT_ALIASES: Readonly<Record<string, SoundEventKind>> = {
  seamSunk: 'seam', dispatchArrived: 'letter', dispatchAnswered: 'answer', biteBack: 'bite', returnPublished: 'survey',
  featureUnlocked: 'arrived', historyCleared: 'history',
};

/** Every kind event() accepts (the sound's own names, then the aliases). Unknown kinds are ignored silently. */
export const SOUND_EVENT_KINDS: readonly SoundEventKind[] = [
  'sell', 'buy', 'cannotAfford', 'found', 'lever', 'fork', 'headline', 'reveal', 'backfire', 'crisis', 'decade',
  'steady', 'reckoning', 'industryOpened', 'ageBegun',
  'seam', 'letter', 'letterOpened', 'answer', 'letterExpired', 'bite', 'survey', 'proprietor', 'ending', 'ledgerContinues',
  'arrived', 'history',
  'seamSunk', 'dispatchArrived', 'dispatchAnswered', 'biteBack', 'returnPublished', 'featureUnlocked', 'historyCleared',
];

export interface SoundEventDetail {
  /** Play in this Industry's idiom instead of the current one (e.g. 'industryOpened' for the new tab). */
  sector?: string;
  /** Page look key, used when the sector has no soundscape of its own. */
  look?: string;
  /** 0–1, scales the sound (e.g. a small sell vs a large one). Default 1. */
  strength?: number;
  /** −1 (left) … 1 (right): where on screen the tap was. Default 0. */
  pan?: number;
  /* --- M3 (optional) --- */
  /** 'letter': the writer, a cast id or figure key ('correspondent', 'whitlow', 'whitlowChair', 'missWhitlow',
   *  'fenwick', 'ashworth', 'pryce', 'minister', …; GameEvent.label of 'dispatchArrived'). Unknown: no motif. */
  cast?: string;
  /** 'answer': who answered (GameEvent.by): 'default' (it lapsed) plays the barely-there 'letterExpired'. */
  by?: string;
  /** 'seam': how deep, 0–1 (seams sunk / total). Deeper is lower and longer. */
  depth?: number;
  /** 'bite': the lever's kind (LeverDef.kind: 'duty', 'cap', …); its own signature is played, detuned. */
  lever?: string;
  /** Marks a first time in the save (GameEvent.first): the moment is played a little fuller. */
  first?: boolean;
}

export interface Volumes {
  /** 0–1 each; perceptual (squared) inside. Defaults: master 0.8, world 0.7, interface 0.7. */
  master: number;
  world: number;
  interface: number;
}

export interface SoundscapeOptions {
  /** Start enabled (e.g. from a saved preference). Default false. Even when true, no AudioContext is created until
   *  the first user gesture: see Soundscape.unlock(). */
  enabled?: boolean;
  volumes?: Partial<Volumes>;
  /** Calmer: fewer and softer transients. true/false forces; undefined/null follows prefers-reduced-motion. */
  calm?: boolean | null;
  /** Testing and offline rendering only: use this context instead of creating one (no gesture rules, no timers,
   *  no visibility handling; call tick() to schedule). */
  context?: BaseAudioContext;
  /** Seed for every variation (default fixed): the same view sequence always sounds the same. */
  seed?: number;
  /** Add an analyser on the output so stats() reports the level (demo/diagnostics; small extra cost). */
  meter?: boolean;
}

export interface SoundscapeStats {
  state: 'off' | 'locked' | 'running' | 'suspended' | 'unavailable';
  /** Transient voices sounding now (world + interface). */
  voices: number;
  /** Continuous sources running now. */
  beds: number;
  /** Soundscape graphs alive (2 during a crossfade). */
  graphs: number;
  sampleRate: number;
  /** ms spent in the last update() and the last scheduler tick (main thread). */
  updateMs: number;
  tickMs: number;
  /** Synthesised buffers cached (samples, all). */
  bufferSamples: number;
  /** Output level, dBFS RMS and peak over the last ~40 ms (only with options.meter). */
  levelDb?: number;
  peakDb?: number;
}

export interface Soundscape {
  /** Feed the same view the scene gets. Cheap at 10 Hz: parameter ramps only, no node churn. A view of another
   *  sector switches Industry (crossfade). Ignored while off. */
  update(view: SceneView): void;
  /** The selected Industry changed (crossfades on the next update; the view decides what it sounds like). */
  setSector(id: string): void;
  /** An interface moment. */
  event(kind: SoundEventKind, detail?: SoundEventDetail): void;
  /** Turn sound on or off. Turning on from a tap handler creates and unlocks the AudioContext then and there; turning
   *  on without a gesture (saved preference) arms a one-time unlock on the next tap anywhere on the page. */
  setEnabled(on: boolean): void;
  setVolume(v: Partial<Volumes>): void;
  /** Calmer mode (null = follow prefers-reduced-motion). */
  setCalm(on: boolean | null): void;
  /** Call from inside a user gesture (pointerup/click/keydown handler) to create or resume the AudioContext. Safe to
   *  call on every tap; does nothing when off or already running. Returns true if audio is (now) running. */
  unlock(): boolean;
  /** Page asks for quiet (e.g. a modal video, the menu); the tab being hidden suspends by itself. */
  suspend(): void;
  resume(): void;
  /** Offline/testing only (with options.context): schedule transients up to now + lookahead. */
  tick(): void;
  stats(): SoundscapeStats;
  destroy(): void;
}

/* ------------------------------------------------------------------ */
/* The mix: what the pure mapping produces from a view                  */
/* ------------------------------------------------------------------ */

export interface LayerMix {
  /** 0–1+ presence (multiplied by the layer's calibrated gain). */
  level: number;
  /** Event-rate / probability multiplier for transient layers (0 = none). */
  density: number;
  /** Playback-rate / frequency multiplier. */
  pitch: number;
  /** Filter frequency multiplier (brightness). */
  tone: number;
  /** Rolling blackouts apply to this layer now. */
  blackout: boolean;
  /** M3: the recipe variant to play when the layer's def says `variantBy` (e.g. a deeper seam's longer winding). */
  variant?: number;
}

export interface Mix {
  def: string;
  /** Shared pulse, beats per minute. */
  tempo: number;
  /** Air low-pass cutoff (Hz): the smog takes the highs. */
  air: number;
  /** 0–1: low-mid thickening (smog). */
  thick: number;
  /** Reverb send multiplier. */
  wet: number;
  /** Overall world gain (the Reckoning winds it down). */
  world: number;
  /** 0–1: pressure past 0.8 (rolling blackouts, emergency tone). */
  stress: number;
  /** A Reckoning holds the world. */
  frozen: boolean;
  layers: Record<string, LayerMix>;
  /** Heritage traces: sector id → level 0–1. */
  traces: Record<string, number>;
  /** Lever kinds in force → level 0–1. */
  levers: Record<string, number>;
  /* --- M3 --- */
  /** Lever kind → how hard it bites back, 0–1 (SceneLever.bite; 0 when absent): its signature sours (detunes). */
  bites: Record<string, number>;
  /** 0–1: the proprietor's watch — mean faint ticks per two seconds (SceneView.watch; 0 when absent or frozen). */
  watch: number;
  /** 0–1: the first ending's credits are holding the world (air cleared, stress gone, world stepped back). */
  ending: number;
  /** Light's day: the hour the sound is at (0–24), or null without a load curve. */
  hour: number | null;
}
