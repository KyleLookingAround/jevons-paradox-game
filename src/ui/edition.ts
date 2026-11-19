// The service worker from the page's side (src/sw.js; perf pass 2). Registered only where it can work and help: over
// https or on localhost, never from file:// or in the single-file build (`self.__rbSingle`), and not when the build's
// kill switch is on (no edition written into the page) or the page is opened with `?nosw` (that also removes one).
// A new edition waiting is offered through the note line; "Load it" saves, lets the new worker take over, and reloads.
// Every failure here is silent: the game runs the same without a worker.
interface Rb { __rbEdition?: string; __rbSingle?: number }

export function startEdition(offer: (apply: () => void) => void, beforeReload: () => void): void {
  try {
    const G = self as unknown as Rb;
    const sw = navigator.serviceWorker;
    if (!sw || G.__rbSingle) return;
    const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (location.protocol !== 'https:' && !(local && location.protocol === 'http:')) return;
    const off = !G.__rbEdition || /[?&]nosw\b/.test(location.search);
    if (off) {
      void sw.getRegistrations?.().then((rs) => rs.forEach((r) => { void r.unregister(); })).catch(() => {});
      return;
    }
    let reloading = false;
    const offerWaiting = (reg: ServiceWorkerRegistration) => {
      const w = reg.waiting;
      if (!w || !sw.controller) return; // a first install has nothing to replace
      offer(() => {
        beforeReload();
        sw.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
        w.postMessage('skipWaiting');
      });
    };
    // After the page has settled: registration fetches sw.js and, on a first visit, precaches the shell.
    const go = () => {
      sw.register('sw.js').then((reg) => {
        offerWaiting(reg);
        reg.addEventListener('updatefound', () => {
          const n = reg.installing;
          n?.addEventListener('statechange', () => { if (n.state === 'installed') offerWaiting(reg); });
        });
        // A long session checks for a new edition now and then (the browser also checks on each navigation).
        setInterval(() => { void reg.update().catch(() => {}); }, 60 * 60 * 1000);
      }).catch(() => { /* no worker: the game runs regardless */ });
    };
    if (document.readyState === 'complete') setTimeout(go, 3000);
    else addEventListener('load', () => setTimeout(go, 3000), { once: true });
  } catch { /* ignore */ }
}
