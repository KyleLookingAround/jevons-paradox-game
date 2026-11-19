// Loading the parts of the page that the first paint does not need (perf pass 2; docs/adr/ADR-2026-11-19-*.md).
//
// The build (build.ts) emits each lazy part as a classic script that registers its module on `self.__rb[name]` when it
// runs, and writes the content-hashed file names into the page as `self.__rbChunks = { name: url }` before the main
// script. Classic scripts rather than ES modules: they load from file:// (the tools and a downloaded copy), on GitHub
// Pages and on old Safari alike, with no CORS rules. A part already registered (the single-file build inlines them all;
// the mock entry imports them) resolves at once. A failed load is retried with a back-off; after the last try the
// promise rejects and the caller shows its plain fallback (the game never depends on a chunk to keep running), and the
// next call tries again.
export type ChunkName = 'scene' | 'audio' | 'archiveText';

interface RbGlobal { __rb?: Record<string, unknown>; __rbChunks?: Record<string, string>; __rbOn?: (name: string) => void }
const G = (typeof self !== 'undefined' ? self : globalThis) as unknown as RbGlobal;
G.__rb = G.__rb || {};

const pending = new Map<string, Promise<unknown>>();
const waiters = new Map<string, Array<() => void>>();
G.__rbOn = (name: string) => { const w = waiters.get(name); waiters.delete(name); w?.forEach((f) => f()); };

/** The module if it has already arrived, else null (never starts a load). */
export function chunkNow<T>(name: ChunkName): T | null {
  return (G.__rb?.[name] as T | undefined) ?? null;
}

/** Whether this page can load the part at all (a URL for it, or it is already here). */
export function chunkKnown(name: ChunkName): boolean {
  return !!G.__rb?.[name] || !!G.__rbChunks?.[name];
}

const TRIES = 3;
const TIMEOUT_MS = 20000;

function inject(url: string, name: string): Promise<void> {
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    let done = false;
    const end = (e?: unknown) => { if (done) return; done = true; clearTimeout(t); s.onload = s.onerror = null; if (G.__rb?.[name]) ok(); else { s.remove(); fail(e ?? new Error(`chunk ${name} did not register`)); } };
    const t = setTimeout(() => end(new Error(`chunk ${name} timed out`)), TIMEOUT_MS);
    // It registers when it runs (before onload fires); __rbOn also settles a script that was inlined or preloaded.
    (waiters.get(name) ?? waiters.set(name, []).get(name)!).push(() => end());
    s.onload = () => end();
    s.onerror = () => end(new Error(`chunk ${name} failed to load`));
    if (url.startsWith('#')) {
      // The single-file build carries each part as inert text in <script type="text/plain" id=…>: run it now.
      const src = document.getElementById(url.slice(1))?.textContent;
      if (!src) { end(new Error(`chunk ${name} is not in this page`)); return; }
      s.textContent = src;
      document.head.appendChild(s); // runs synchronously, registering the part (→ end)
      end();
      return;
    }
    s.async = true;
    s.src = url;
    document.head.appendChild(s);
  });
}

/** Load a part (once; concurrent callers share the load). Rejects after TRIES failed attempts; a later call retries. */
export function loadChunk<T>(name: ChunkName): Promise<T> {
  const have = chunkNow<T>(name);
  if (have) return Promise.resolve(have);
  const p0 = pending.get(name);
  if (p0) return p0 as Promise<T>;
  const url = G.__rbChunks?.[name];
  if (!url || typeof document === 'undefined') return Promise.reject(new Error(`no chunk ${name}`));
  const p = (async () => {
    let err: unknown;
    for (let i = 0; i < TRIES; i++) {
      if (i) await new Promise((r) => setTimeout(r, 600 * 2 ** i)); // 1.2 s, 2.4 s
      try {
        // A retry asks past any cached failure.
        await inject(i && !url.startsWith('#') ? url + (url.includes('?') ? '&' : '?') + 'r=' + i : url, name);
        return chunkNow<T>(name)!;
      } catch (e) { err = e; }
    }
    throw err;
  })();
  pending.set(name, p);
  p.catch(() => pending.delete(name));
  return p;
}

/** Ask for a part early, when the main thread is idle (a hint; errors are ignored here and surface at the real use). */
export function prefetchChunk(name: ChunkName, timeout = 2000): void {
  if (chunkNow(name) || pending.has(name) || !chunkKnown(name)) return;
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const go = () => { loadChunk(name).catch(() => { /* surfaced at use */ }); };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(go, { timeout }); else setTimeout(go, 200);
}
