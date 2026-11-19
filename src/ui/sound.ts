// The page's side of the soundscape (src/ui/audio, used as it ships). Off by default: no soundscape object exists, and
// so no AudioContext and no listener, until the player turns sound on from a tap in the settings. With sound saved as on,
// the soundscape is made at start-up with `enabled`, which arms a one-time unlock on the next tap (no context before it).
// Everything is a no-op while off. Fed the same SceneView as the picture (world.ts), so sound and picture agree.
import { createSoundscape, type Soundscape, type SoundEventKind, type SoundEventDetail } from './audio';
import type { SceneView } from './scene';
import { getPrefs, setPrefs } from './prefs';

let sc: Soundscape | null = null;
let sector: string | null = null;

const calmArg = (): boolean | null => { const c = getPrefs().calm; return c === 'on' ? true : c === 'off' ? false : null; };

function make(enabled: boolean): Soundscape | null {
  try {
    const p = getPrefs();
    sc = createSoundscape({ enabled, volumes: p.volumes, calm: calmArg() });
    if (sector) sc.setSector(sector);
  } catch { sc = null; }
  return sc;
}

/** At start-up: only if the player turned sound on in an earlier visit. */
export function initSound(): void {
  if (getPrefs().sound) make(true);
}

/** From the settings toggle's click handler (a user gesture): creates and unlocks the context inside the tap. */
export function setSound(on: boolean): void {
  setPrefs({ sound: on });
  if (on) { if (!sc) make(true); try { sc?.setEnabled(true); } catch { /* ignore */ } }
  // Off tears it down (QA B26): the AudioContext is closed, not merely suspended; turning on again makes a new one.
  else { try { sc?.setEnabled(false); sc?.destroy(); } catch { /* ignore */ } sc = null; }
}
export function soundOn(): boolean { return getPrefs().sound && !!sc; }
export function setVolumes(v: Partial<{ master: number; world: number; interface: number }>): void {
  setPrefs({ volumes: { ...getPrefs().volumes, ...v } });
  try { sc?.setVolume(v); } catch { /* ignore */ }
}
export function setCalm(c: 'system' | 'on' | 'off'): void {
  setPrefs({ calm: c });
  try { sc?.setCalm(calmArg()); } catch { /* ignore */ }
}
export function soundUpdate(view: SceneView): void { if (sc && getPrefs().sound) { try { sc.update(view); } catch { /* ignore */ } } }
export function soundSector(id: string): void { sector = id; try { sc?.setSector(id); } catch { /* ignore */ } }
export function sound(kind: SoundEventKind, detail?: SoundEventDetail): void {
  if (!sc || !getPrefs().sound) return;
  try { sc.event(kind, detail); } catch { /* ignore */ }
}
/** Cheap and idempotent: recover after an iOS interruption on the next tap. */
export function soundUnlock(): void { if (sc && getPrefs().sound) { try { sc.unlock(); } catch { /* ignore */ } } }
export function soundQuiet(on: boolean): void { try { if (on) sc?.suspend(); else sc?.resume(); } catch { /* ignore */ } }
export function soundState(): string { try { return sc ? sc.stats().state : 'off'; } catch { return 'unavailable'; } }
/** Pan from a tap's x position (−1 left … 1 right). */
export function panOf(e: Event | undefined): number {
  const x = (e as MouseEvent | undefined)?.clientX;
  return typeof x === 'number' && innerWidth > 0 ? Math.max(-1, Math.min(1, (x / innerWidth) * 2 - 1)) : 0;
}
