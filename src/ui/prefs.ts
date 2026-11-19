// UI preferences: notation, text size, export and storage bookkeeping, dismissed hints, and the affordable-signal memory.
// Kept under their own localStorage key, apart from the game save. Every access is guarded: without storage the defaults
// hold for the session.
import { lsGet, lsSet } from './store';
import { setNotation, type Notation } from './fmt';

export type TextSize = 0 | 1 | 2;
export type Motion = 'system' | 'reduce' | 'full';
/** The picture's drawing detail (passed to the scene): 'auto' drops to low on a slow device. */
export type Detail = 'auto' | 'full' | 'low';
export type PersistResult = 'granted' | 'denied' | 'unsupported' | 'failed';

export interface Prefs {
  notation: Notation;
  textSize: TextSize;
  /** Animation: follow prefers-reduced-motion, or force still / moving. */
  motion: Motion;
  detail: Detail;
  /** Wall-clock ms of the last save export (download or copy); 0 = never. */
  lastExport: number;
  /** Result of navigator.storage.persist(), once asked. */
  persist: PersistResult | null;
  /** The iOS "add to Home Screen" line was dismissed. */
  iosHintDismissed: boolean;
  /** Affordable signal: offers the player passed over, for the run named by `run` (see afford.ts). */
  passed: { run: string; ids: Record<string, string[]> };
}

export const PREFS_KEY = 'rebound.ui.prefs';
export const TEXT_SCALE = [1, 1.15, 1.3] as const;

const DEFAULTS: Prefs = { notation: 'suffix', textSize: 0, motion: 'system', detail: 'auto', lastExport: 0, persist: null, iosHintDismissed: false, passed: { run: '', ids: {} } };

let prefs: Prefs = load();

function load(): Prefs {
  const p: Prefs = { ...DEFAULTS, passed: { run: '', ids: {} } };
  try {
    const raw = lsGet(PREFS_KEY);
    const o = raw ? JSON.parse(raw) : null;
    if (o && typeof o === 'object') {
      if (o.notation === 'suffix' || o.notation === 'sci' || o.notation === 'eng') p.notation = o.notation;
      if (o.textSize === 0 || o.textSize === 1 || o.textSize === 2) p.textSize = o.textSize;
      if (o.motion === 'reduce' || o.motion === 'full') p.motion = o.motion;
      if (o.detail === 'full' || o.detail === 'low') p.detail = o.detail;
      if (typeof o.lastExport === 'number' && Number.isFinite(o.lastExport)) p.lastExport = o.lastExport;
      if (['granted', 'denied', 'unsupported', 'failed'].includes(o.persist)) p.persist = o.persist;
      p.iosHintDismissed = o.iosHintDismissed === true;
      if (o.passed && typeof o.passed.run === 'string' && o.passed.ids && typeof o.passed.ids === 'object') {
        const ids: Record<string, string[]> = {};
        for (const k of Object.keys(o.passed.ids)) if (Array.isArray(o.passed.ids[k])) ids[k] = o.passed.ids[k].filter((x: unknown) => typeof x === 'string').slice(0, 8);
        p.passed = { run: o.passed.run, ids };
      }
    }
  } catch { /* unreadable prefs: defaults */ }
  return p;
}

export function getPrefs(): Readonly<Prefs> { return prefs; }

export function setPrefs(patch: Partial<Prefs>): void {
  prefs = { ...prefs, ...patch };
  try { lsSet(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  applyPrefs();
}

/** Push notation and text size into fmt and onto the root element. */
export function applyPrefs(): void {
  setNotation(prefs.notation);
  const html = document.documentElement;
  const want = prefs.textSize ? String(prefs.textSize) : null;
  if (want == null) html.removeAttribute('data-text');
  else if (html.getAttribute('data-text') !== want) html.setAttribute('data-text', want);
  if (prefs.motion === 'system') html.removeAttribute('data-motion');
  else if (html.getAttribute('data-motion') !== prefs.motion) html.setAttribute('data-motion', prefs.motion);
}
