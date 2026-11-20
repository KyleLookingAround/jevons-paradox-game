// The content's late text (docs/adr/ADR-2026-11-20-late-content-text.md; src/content/textsplit.ts).
//
// The first-paint script carries the content without most of its prose; the lazy part `text` (a plain array of
// strings) puts it back, in place, into the one `content` object the page and the core share. A save on file waits for
// it before the game starts (game.ts: the shell has painted; the service worker has it precached); a fresh game starts
// at once and asks for it right after the first paint (its first screen, the first Industry, is whole in the main
// script). Until it arrives, a late string is '' (a headline variant holds its array's first variant), and the page
// shows a plain fallback. In the mock entry and the tests the content is whole: there is no part to load, and the text
// counts as here.
import type { Content } from '../types';
import { applyLateText } from '../content/textsplit';
import { chunkKnown, loadChunk } from './chunks';

let ready = false;
let gen = 0;
let pending: Promise<boolean> | null = null;
const after: Array<() => void> = [];

/** True once the late text is in the content (or there is none to load). */
export function textReady(): boolean {
  if (!ready && !chunkKnown('text')) ready = true;
  return ready;
}

/** Bumped when the text arrives: parts of the page that build words once (a letter) key on it to build again. */
export function textGen(): number { return gen; }

/** Run `f` when the text arrives (at once if it is here). */
export function onText(f: () => void): void { if (textReady()) f(); else after.push(f); }

/** Load the late text and put it into `content` (once; concurrent callers share it). Resolves false if it could not
 *  be loaded or did not fit (the page carries on with its fallbacks; a later call tries again). */
export function ensureText(content: Content): Promise<boolean> {
  if (textReady()) return Promise.resolve(true);
  if (pending) return pending;
  pending = loadChunk<unknown>('text').then((strings) => {
    if (!applyLateText(content, strings)) { try { console.warn('[rebound] the late text did not fit this edition'); } catch { /* ignore */ } return false; }
    ready = true; gen++;
    for (const f of after.splice(0)) { try { f(); } catch (e) { try { console.error(e); } catch { /* ignore */ } } }
    return true;
  }, () => false).finally(() => { if (!ready) pending = null; });
  return pending;
}

/** What a late paragraph (a letter's body) shows until its words arrive. */
export const TEXT_WAIT = 'The rest of this is still in the post.';
