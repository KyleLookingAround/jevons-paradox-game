// Rebound's service worker (perf pass 2; docs/adr/ADR-2026-11-19-split-build-lazy-parts-service-worker.md).
// build.ts copies this to dist/sw.js, filling in the edition and the file lists. Hand-written and small on purpose: a
// broken service worker is worse than none.
//
//   - The shell (the page, its main script, stylesheet, manifest, icons) is cached under this edition's name at
//     install; the lazy parts (scene, sound, Archive text) are cached the first time the page fetches them. Every one
//     of those names carries a content hash, so a cached file is never stale: it is that edition's file.
//   - Navigations are served from this edition's cache (instant, and the game reloads with no connection); anything
//     not cached goes to the network. Other origins (the web fonts) are not touched.
//   - A new edition installs alongside and WAITS: the page offers it with a quiet note ("Load it" saves and reloads)
//     and never reloads under the player. Left alone, it takes over the next time every tab of the game is closed.
//   - Old editions' caches are deleted when a new edition activates. The save lives in localStorage and is never touched.
//   - Kill switch: build with `REBOUND_SW=off bun run build.ts` and deploy. The sw.js it emits deletes every cache of the
//     game, unregisters itself and reloads nothing; the page then neither registers nor uses one. (Browsers fetch sw.js
//     afresh at least every 24 hours, so this reaches everyone.) For one browser: open the game with `?nosw`.
const EDITION = '__EDITION__';
const SHELL = __SHELL__;
const LAZY = __LAZY__;
const KILL = __KILL__;
const CACHE = 'rebound-' + EDITION;
const PREFIX = 'rebound-';

self.addEventListener('install', (e) => {
  if (KILL) { self.skipWaiting(); return; }
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  // No skipWaiting here: the first install has no page to wait for (it activates at once); a later one waits for the
  // player (message 'skipWaiting' from the page's "Load it").
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && (KILL || k !== CACHE)).map((k) => caches.delete(k)));
    if (KILL) { await self.registration.unregister(); return; }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'edition' && e.source) e.source.postMessage({ edition: EDITION });
});

self.addEventListener('fetch', (e) => {
  if (KILL) return;
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  const rel = url.pathname.slice(scope.pathname.length);
  if (req.mode === 'navigate') {
    // Only the game's own page (not other pages served beside it, such as /audio-demo/).
    if (rel !== '' && rel !== 'index.html') return;
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = (await c.match('./')) || (await c.match('index.html'));
      if (hit) return hit;
      return fetch(req);
    })());
    return;
  }
  if (!SHELL.includes(rel) && !LAZY.includes(rel)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(rel);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && LAZY.includes(rel)) c.put(rel, res.clone()).catch(() => {});
    return res;
  })());
});
