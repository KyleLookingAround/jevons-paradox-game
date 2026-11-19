// One writer per save (QA B20). Two tabs on one save would each autosave their own copy and silently undo each other's
// play. So one tab holds the pen: a lease in storage (`<save key>.writer` = { id, at }), renewed every few seconds while
// that tab is running and visible, released when it closes. A tab that opens while another holds a fresh lease stops its
// clock, saves nothing, and says so, with "Play here instead": that asks the holder to save and hand over (through a
// BroadcastChannel, or the storage event where there is none), then reloads from the save the holder has just written,
// so nothing is lost and no time away is counted twice. A holder that does not answer (closed, frozen in the background)
// is overruled after a moment; when it wakes it finds the lease gone and stops without saving. Without storage there is
// nothing shared to protect, and every guard here simply says "writer". Display and persistence only: no game rules.
import { lsGet, lsSet, lsDel } from './store';
import { h, show } from './dom';

/** A lease older than this is a tab that has gone (closed, or frozen in the background, where its clock stops too). */
const FRESH_MS = 20000;
/** How often the holder renews the lease while it runs. */
export const BEAT_MS = 5000;
/** How long "Play here instead" waits for the holder to save and hand over before overruling it. */
const HANDOVER_MS = 1500;
const ID_KEY = 'rebound.tab.id';

interface Lease { id: string; at: number }
type Msg = { t: 'ask'; from: string } | { t: 'yield'; from: string; to: string };

export interface TabGuard {
  /** This tab may write the save. Re-reads the lease (cheap) and stops the tab if another has taken it. */
  check(): boolean;
  /** Renew the lease (from the running loop; no-op unless this tab holds it). */
  beat(): void;
  /** The page is going away: give the lease up so a reload or the next tab can take it at once. */
  release(): void;
  /** The page came back from the back-forward cache: take the lease again if it is free, else stop. */
  resume(): void;
}

export interface TabHooks {
  /** Save now (before handing over). */
  saveNow(): void;
  /** This tab has stopped being the writer (show the notice; the loop stops). */
  paused(): void;
}

function newId(): string {
  try { return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ?? String(Math.random()).slice(2); } catch { return String(Math.random()).slice(2); }
}
/** The same tab keeps its id across its own reloads (a takeover reloads), never across a duplicated tab. */
function tabId(): string {
  let reload = false;
  try { reload = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload'; } catch { /* old browser */ }
  try {
    const old = sessionStorage.getItem(ID_KEY);
    if (old && reload) return old;
    const id = newId();
    sessionStorage.setItem(ID_KEY, id);
    return id;
  } catch { return newId(); }
}

export function createTabGuard(saveKey: string, hooks: TabHooks): TabGuard & { writer: boolean } {
  const leaseKey = saveKey + '.writer', askKey = saveKey + '.ask';
  const id = tabId();
  const read = (): Lease | null => {
    try { const o = JSON.parse(lsGet(leaseKey) || 'null'); return o && typeof o.id === 'string' && Number.isFinite(o.at) ? o : null; } catch { return null; }
  };
  const write = (l: Lease): boolean => lsSet(leaseKey, JSON.stringify(l));
  const fresh = (l: Lease | null) => !!l && Date.now() - l.at < FRESH_MS;

  // Storage that cannot be written: nothing is shared, so there is nothing to guard.
  const storage = lsSet(saveKey + '.probe', '1');
  lsDel(saveKey + '.probe');
  let writer = true, stopped = false;
  let bc: BroadcastChannel | null = null;
  try { if (storage && typeof BroadcastChannel === 'function') bc = new BroadcastChannel('rebound:' + saveKey); } catch { bc = null; }
  const send = (m: Msg) => {
    try { if (bc) { bc.postMessage(m); return; } } catch { /* fall back to storage */ }
    if (m.t === 'ask') lsSet(askKey, JSON.stringify({ from: m.from, at: Date.now() }));
  };

  function stop(): void {
    if (stopped) return;
    writer = false; stopped = true;
    try { hooks.paused(); } catch { /* ignore */ }
    showNotice();
  }
  function acquire(): void {
    const l = read();
    if (!storage || !l || l.id === id || !fresh(l)) { writer = true; stopped = false; if (storage) write({ id, at: Date.now() }); }
    else stop();
  }
  /** Another tab asks for the pen: save, hand the lease over, stop. */
  function yieldTo(to: string): void {
    if (!writer || to === id) return;
    try { hooks.saveNow(); } catch { /* the last autosave stands */ }
    write({ id: to, at: Date.now() });
    try { bc?.postMessage({ t: 'yield', from: id, to } satisfies Msg); } catch { /* the storage event carries it */ }
    stop();
  }
  const guard = {
    get writer() { return writer; },
    check(): boolean {
      if (!storage) return true;
      if (!writer) return false;
      const l = read();
      if (l && l.id !== id && fresh(l)) { stop(); return false; }
      return true;
    },
    beat(): void { if (storage && guard.check()) write({ id, at: Date.now() }); },
    release(): void { if (storage && writer) { const l = read(); if (!l || l.id === id) write({ id, at: 0 }); } },
    resume(): void { if (storage) acquire(); },
  };

  /* --- the notice in a stopped tab --- */
  let notice: HTMLElement | null = null;
  function showNotice(): void {
    if (!notice) {
      const status = h('p', { class: 'muted small', 'aria-live': 'polite' });
      const take = h('button', { class: 'btn primary big', type: 'button', onclick: () => takeOver(status, take) }, 'Play here instead');
      notice = h('div', { class: 'elsewhere', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'elsewhere-t' },
        h('div', { class: 'elsewhere-card' },
          h('h2', { id: 'elsewhere-t', text: 'Open in another tab' }),
          h('p', { text: 'Only one tab can keep the books. This game is being played in another tab, so this one has stopped its clock and keeps nothing.' }),
          take, status,
          h('p', { class: 'muted small', text: 'The other tab stops in its turn, keeping everything it has done.' })));
      document.body.append(notice);
    }
    show(notice, true);
    document.documentElement.classList.add('sheet-open');
    document.getElementById('app')?.setAttribute('inert', '');
    try { (notice.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true }); } catch { /* ignore */ }
  }
  function takeOver(status: HTMLElement, btn: HTMLElement): void {
    btn.setAttribute('aria-disabled', 'true');
    status.textContent = 'Asking the other tab to put its books away…';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // Overrule a holder that did not answer; then start again from the save it last wrote.
      const l = read();
      if (!l || l.id !== id) write({ id, at: Date.now() });
      location.reload();
    };
    const onLease = (e: StorageEvent) => { if (e.key === leaseKey && read()?.id === id) finish(); };
    window.addEventListener('storage', onLease);
    bc?.addEventListener('message', (e: MessageEvent<Msg>) => { if (e.data?.t === 'yield' && e.data.to === id) finish(); });
    send({ t: 'ask', from: id });
    setTimeout(finish, HANDOVER_MS);
  }

  if (storage) {
    acquire();
    bc?.addEventListener('message', (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m?.t === 'ask') yieldTo(m.from);
      else if (m?.t === 'yield') guard.check();
    });
    window.addEventListener('storage', (e) => {
      if (e.key === askKey && e.newValue) { try { const o = JSON.parse(e.newValue); if (o?.from) yieldTo(o.from); } catch { /* ignore */ } }
      else if (e.key === leaseKey) guard.check();
    });
  }

  return guard;
}
