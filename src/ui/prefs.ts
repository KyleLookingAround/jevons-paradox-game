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
  /** Sound (src/ui/audio): off by default; nothing is created until the player turns it on from a tap. */
  sound: boolean;
  volumes: { master: number; world: number; interface: number };
  /** Calmer sound: follow prefers-reduced-motion, or force. */
  calm: 'system' | 'on' | 'off';
  /** The household survey (the local play ledger, playledger.ts) is kept. Closing it deletes it. */
  survey: boolean;
  /** "While you were away" reports already shown (their keys), newest last; a handful only. */
  awaySeen: string[];
  /** Folding sections the player has opened (true) or closed (false), by key: the shop's "Owned" parts, locked rows,
   *  the unseated Institutions; elsewhere the owned levers and the earned achievements. Absent = the section's default. */
  open: Record<string, boolean>;
  /** Features (Derived.features) that arrived in play and whose "New" mark the player has not looked at yet. */
  newMarks: string[];
  /** M3: Archive notes the player has opened (ids); unread = found and not here. The page's own, never in the save. */
  archiveRead: string[];
}

export const PREFS_KEY = 'rebound.ui.prefs';
export const TEXT_SCALE = [1, 1.15, 1.3] as const;

const DEFAULTS: Prefs = {
  notation: 'suffix', textSize: 0, motion: 'system', detail: 'auto', lastExport: 0, persist: null, iosHintDismissed: false, passed: { run: '', ids: {} },
  sound: false, volumes: { master: 0.8, world: 0.7, interface: 0.7 }, calm: 'system', survey: true, awaySeen: [], open: {}, newMarks: [], archiveRead: [],
};

let prefs: Prefs = load();

function load(): Prefs {
  const p: Prefs = { ...DEFAULTS, passed: { run: '', ids: {} }, volumes: { ...DEFAULTS.volumes }, awaySeen: [], open: {}, newMarks: [], archiveRead: [] };
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
      p.sound = o.sound === true;
      if (o.volumes && typeof o.volumes === 'object') {
        for (const k of ['master', 'world', 'interface'] as const) {
          const v = o.volumes[k];
          if (typeof v === 'number' && v >= 0 && v <= 1) p.volumes[k] = v;
        }
      }
      if (o.calm === 'on' || o.calm === 'off') p.calm = o.calm;
      if (o.survey === false) p.survey = false;
      if (Array.isArray(o.awaySeen)) p.awaySeen = o.awaySeen.filter((x: unknown) => typeof x === 'string').slice(-8);
      if (o.open && typeof o.open === 'object') {
        for (const k of Object.keys(o.open).slice(0, 64)) if (typeof o.open[k] === 'boolean') p.open[k] = o.open[k];
      }
      if (Array.isArray(o.archiveRead)) p.archiveRead = o.archiveRead.filter((x: unknown) => typeof x === 'string').slice(-600);
      if (Array.isArray(o.newMarks)) p.newMarks = o.newMarks.filter((x: unknown) => typeof x === 'string').slice(0, 16);
    }
  } catch { /* unreadable prefs: defaults */ }
  return p;
}

export function getPrefs(): Readonly<Prefs> { return prefs; }

/** Whether a folding section is open: the player's last choice, else `dflt`. */
export function isOpen(key: string, dflt = false): boolean {
  const v = prefs.open[key];
  return v === undefined ? dflt : v;
}
/** Remember a folding section's state (kept to the 64 most recent keys). */
export function setOpen(key: string, on: boolean): void {
  if (prefs.open[key] === on) return;
  const open = { ...prefs.open };
  delete open[key];
  open[key] = on;
  const keys = Object.keys(open);
  for (const k of keys.slice(0, Math.max(0, keys.length - 64))) delete open[k];
  setPrefs({ open });
}

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
