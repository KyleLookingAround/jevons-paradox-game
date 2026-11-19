// Rebound: the game loop, persistence and the wiring between the model and the UI.
// Wall-clock time lives only here; the model only ever sees dt.
import type { CommonsView, Content, Derived, GameState, InstitutionView, KnowhowView, LeverView, ModelApi, SectorId, UpgradeView } from '../types';
import { MAX_TICK_SECONDS } from '../types';
import type * as Devmock from './devmock';
import type { Ctx } from './ctx';
import { sectorIds } from './ctx';
import { mountUI, type UI } from './app';
import { showFatal, hideFatal } from './sheets';
import { lsGet, lsSet, lsDel, download, requestPersist } from './store';
import { dur, money } from './fmt';
import { applyPrefs, getPrefs, setPrefs } from './prefs';
import { installManifest } from './install';
import { installKeys } from './keys';
import type { BackupInfo } from './sheets';
import { prof, timed } from './prof';
import { createEventFeed } from './events';

const SAVE_KEY = 'rebound.save.v1';          // kept from v1: deserialize migrates
const AT_KEY = 'rebound.save.v1.at';
const UNREAD_KEY = 'rebound.save.unreadable'; // a save deserialize refused, kept for export
const MOCK_KEY = 'rebound.mock.save';         // #mock:persist only
const TAB_KEY = 'rebound.ui.sector';
const STEP = 0.1;             // fixed 10 Hz simulation step
const MAX_CATCHUP = 5;        // seconds of ticks per frame; longer gaps go through fastForward
const VIEWS_EVERY = 1000;     // ms between view refreshes at least (upgrade views run projections)
const VIEWS_MAX_EVERY = 4000; // ... and at most
const VIEWS_SHARE = 0.05;     // the share of the main thread the periodic view refresh may take (cost / interval)
const SAVE_EVERY = 10000;     // ms between autosaves

export interface GameOpts {
  realModel?: ModelApi;
  realContent?: Content;
  /**
   * The development stand-in (src/ui/devmock.ts), passed only by the mock entry (src/ui/mock-main.ts, used by
   * tools/shot.mjs). The production bundle does not contain it (43 KB minified): there `#mock` is ignored.
   */
  devmock?: typeof Devmock;
}

function contentIsM1(c: Content | undefined): boolean {
  return !!(c && c.sectors && Array.isArray(c.sectorOrder) && c.sectorOrder.length && Array.isArray(c.ages));
}

/**
 * Ask for the three families at once (not when layout first needs them) and mark the page when they are in, or after
 * FONT_WAIT ms at most: the scene's SVG lettering (plate captions, signs) waits for that mark rather than flashing in a
 * fallback face. Offline, the requests fail fast and the fallbacks are used.
 */
const FONT_WAIT = 800;
function loadFonts(): void {
  const done = () => document.documentElement.classList.add('fonts-in');
  try {
    const f = document.fonts;
    if (!f || typeof f.load !== 'function') { done(); return; }
    const specs = ['700 16px Fraunces', 'italic 400 16px Fraunces', '400 16px Fraunces', '700 16px Archivo', '400 16px Archivo', '400 16px "IBM Plex Mono"', '600 16px "IBM Plex Mono"'];
    Promise.race([Promise.allSettled(specs.map((x) => f.load(x))), new Promise((r) => setTimeout(r, FONT_WAIT))]).then(done, done);
  } catch { done(); }
}

const mark = (n: string) => { try { performance.mark(n); } catch { /* ignore */ } };

function boot(o: GameOpts): void {
  mark('rebound-boot');
  loadFonts();
  const dm = o.devmock;
  const mockOpts = dm ? dm.parseMockHash(location.hash) : null;
  const mock = !!dm && (!!mockOpts || !o.realModel || !contentIsM1(o.realContent));
  if (!mock && (!o.realModel || !contentIsM1(o.realContent))) throw new Error('The model or content is missing or not in the M1 shape.');
  const model: ModelApi = mock ? dm!.makeMockModel(mockOpts ?? {}) : o.realModel!;
  const content: Content = mock ? dm!.mockContent : o.realContent!;
  const persist = !mock || !!mockOpts?.persist;
  const saveKey = mock ? MOCK_KEY : SAVE_KEY, atKey = saveKey + '.at';
  // The rolling backup: one slot, rewritten at each Reckoning with the fresh run that follows it.
  const backupKey = saveKey + '.backup';
  applyPrefs();

  let halted = false;
  let lastCall = 'start-up';

  /** Run a model call; on exception, stop the loop and show the error panel. */
  function guard<T>(name: string, f: () => T): T | undefined {
    lastCall = name;
    try { return timed('model.' + name, f); }
    catch (err) { fail(name, err); return undefined; }
  }

  function fail(name: string, err: unknown): void {
    halted = true;
    try { console.error(`[rebound] model.${name} threw`, err); } catch { /* ignore */ }
    showFatal(`model.${name}`, err, [
      { label: 'Try to carry on', run: () => { hideFatal(); halted = false; last = performance.now(); acc = 0; } },
      { label: 'Download save', run: () => { try { download('rebound-rescue.txt', model.serialize(state!)); } catch { download('rebound-rescue.txt', JSON.stringify(state)); } } },
      { label: 'Start a fresh run', run: () => {
        const s = guard('createState', () => model.createState(content, state?.meta));
        if (s) { hideFatal(); halted = false; replace(s); }
      } },
    ]);
  }

  /* ---------- load ---------- */
  let state: GameState | undefined;
  let away = 0;
  let unread: string | null = null;
  if (persist) {
    const txt = lsGet(saveKey);
    if (txt) {
      const s = guard('deserialize', () => model.deserialize(txt, content));
      if (s) {
        state = s;
        const at = Number(lsGet(atKey));
        if (Number.isFinite(at) && at > 0) away = Math.max(0, (Date.now() - at) / 1000);
      } else if (!halted) {
        // Not a usable save: keep the raw text aside before a fresh run overwrites the slot.
        unread = txt;
        lsSet(UNREAD_KEY, txt);
      }
    }
  }
  if (!state) state = guard('createState', () => model.createState(content));
  if (!state) return; // fatal panel already up

  mark('rebound-state');
  // Events already in the save are history: the page reacts only to what happens from here on.
  const feed = createEventFeed();
  feed.resetTo(state);
  let d: Derived = guard('derive', () => model.derive(state!, content)) ?? emptyDerived();
  let ups: UpgradeView[] = [];
  let levs: LeverView[] = [];
  let khs: KnowhowView[] = [];
  let insts: InstitutionView[] = [];
  let cms: CommonsView[] = [];

  const storedTab = lsGet(TAB_KEY);
  const firstOpen = sectorIds(content).find((id) => state!.sectors?.[id]?.open) ?? sectorIds(content)[0] ?? '';
  const initial: SectorId = mockOpts?.sector && state.sectors?.[mockOpts.sector]?.open ? mockOpts.sector
    : storedTab && state.sectors?.[storedTab]?.open ? storedTab : firstOpen;

  let ui: UI;

  const ctx: Ctx = {
    model, content, mock,
    get state() { return state!; },
    set state(s: GameState) { state = s; },
    get d() { return d; },
    set d(v: Derived) { d = v; },
    get ups() { return ups; },
    set ups(v: UpgradeView[]) { ups = v; },
    get levs() { return levs; },
    set levs(v: LeverView[]) { levs = v; },
    get khs() { return khs; },
    set khs(v: KnowhowView[]) { khs = v; },
    get insts() { return insts; },
    set insts(v: InstitutionView[]) { insts = v; },
    get cms() { return cms; },
    set cms(v: CommonsView[]) { cms = v; },
    sector: initial,
    act(name, f) {
      if (halted) return false;
      const before = state!;
      const next = guard(name, () => f(model, before, content));
      if (!next || next === before) return false;
      state = next;
      const bought = ui.afterAct(before, next);
      if (bought.length) askPersist();
      // The tap paints first: derive and patch now; the views (projections, the slow part) follow in their own task
      // after the frame. A sale changes only capital: its views wait for the next periodic refresh.
      refresh(false);
      if (name !== 'click') viewsAfterPaint();
      return true;
    },
    replace,
    selectSector(id) {
      if (!state!.sectors?.[id]?.open) return;
      const apply = () => { ctx.sector = id; lsSet(TAB_KEY, id); timed('ui.update', () => ui.update()); };
      // Another Industry is another look, picture and set of panels: one composed transition, not a flash of restyle.
      if (id !== ctx.sector) ui.composeSwitch(ctx.sector, id, apply);
      else apply();
    },
    openFormula: (k) => ui.openFormula(k),
    openMenu: () => ui.openMenu(),
    openShop: () => ui.openShop(),
    openLocked: (id) => ui.openLocked(id),
    confirmReckoning: () => ui.confirmReckoning(),
    toast: (t, a) => ui.toast(t, a),
    save,
    get afford() { return ui ? ui.afford : { items: [], bySector: new Map() }; },
    jumpToAffordable: () => ui.jumpToAffordable(),
    showPlace: (id) => ui.showPlace(id),
    confirmFork: (id, onYes) => ui.confirmFork(id, onYes),
    refreshAll: () => refresh(true),
  };

  // Storage persistence is asked for once a session, after a purchase (so the browser sees an engaged player).
  let persistAsked = false;
  function askPersist(): void {
    if (persistAsked || !persist) return;
    persistAsked = true;
    void requestPersist().then((r) => { if (getPrefs().persist !== r) setPrefs({ persist: r }); });
  }

  function refresh(views: boolean): void {
    const nd = guard('derive', () => model.derive(state!, content));
    if (nd) d = nd;
    if (views) refreshViews();
    if (halted) return;
    const ev = feed.take(state!);
    if (ev.length) timed('ui.events', () => ui.onEvents(ev));
    timed('ui.update', () => ui.update());
  }
  let lastViews = 0, viewsEvery = VIEWS_EVERY, viewsPending = false;
  /** Refresh the views in a task of their own after the next frame (coalesced), then patch the page again. */
  function viewsAfterPaint(): void {
    if (viewsPending) return;
    viewsPending = true;
    requestAnimationFrame(() => setTimeout(() => {
      viewsPending = false;
      if (halted || !state) return;
      refreshViews();
      if (!halted) timed('ui.update', () => ui.update());
    }, 0));
  }
  function refreshViews(): void {
    const t0 = performance.now();
    lastViews = t0;
    const u = guard('upgradeViews', () => model.upgradeViews(state!, content));
    if (u) ups = u;
    const l = guard('leverViews', () => model.leverViews(state!, content));
    if (l) levs = l;
    // The shop views are cheap and only read while a sheet shows them, but keep them current with everything else.
    const k = guard('knowhowViews', () => model.knowhowViews(state!, content));
    if (k) khs = k;
    const i = guard('institutionViews', () => model.institutionViews(state!, content));
    if (i) insts = i;
    // The Commons views only matter once the Commons are open; until then they are not asked for.
    if (d.commons?.available && typeof model.commonsViews === 'function') {
      const cv = guard('commonsViews', () => model.commonsViews(state!, content));
      if (cv) cms = cv;
    } else cms = [];
    // The periodic refresh backs off when the views are slow (late game, slow phone), to keep within VIEWS_SHARE.
    const cost = performance.now() - t0;
    viewsEvery = Math.min(VIEWS_MAX_EVERY, Math.max(VIEWS_EVERY, cost / VIEWS_SHARE));
  }

  function replace(s: GameState): void {
    state = s;
    feed.resetTo(s);
    ui.reset();
    refresh(true);
    save();
  }

  function save(): void {
    if (!persist || !state) return;
    const txt = guard('serialize', () => model.serialize(state!));
    if (txt != null) { lsSet(saveKey, txt); lsSet(atKey, String(Date.now())); }
  }

  ui = mountUI(document.getElementById('app')!, ctx, {
    exportText: () => guard('serialize', () => model.serialize(state!)) ?? '',
    importText(t: string) {
      const s = guard('deserialize', () => model.deserialize(t.trim(), content));
      if (!s) return false;
      replace(s);
      return true;
    },
    hardReset() {
      lsDel(saveKey); lsDel(atKey); lsDel(backupKey);
      const s = guard('createState', () => model.createState(content));
      if (s) replace(s);
    },
    reckon() {
      const ok = ctx.act('reckon', (m, s, c) => m.reckon(s, c));
      if (ok) { ui.reset(); save(); writeBackup(); }
      return ok;
    },
    backup: readBackup,
    restoreBackup() {
      const b = readBackupRaw();
      if (!b) return false;
      const s = guard('deserialize', () => model.deserialize(b.text, content));
      if (!s) return false;
      replace(s);
      // The backup is the start of a run: if it is still fresh, Hindsight can be spent before the clock starts.
      if (d.freshRun) ui.openShopBetweenRuns();
      return true;
    },
    resume() { last = performance.now(); acc = 0; save(); },
  });

  function writeBackup(): void {
    if (!persist) return;
    const text = guard('serialize', () => model.serialize(state!));
    if (text == null) return;
    const info = { at: Date.now(), reckonings: state!.meta?.reckonings ?? 0, year: state!.meta?.lastRun?.yearReached ?? 0, text };
    lsSet(backupKey, JSON.stringify(info));
  }
  function readBackupRaw(): (BackupInfo & { text: string }) | null {
    try {
      const o = JSON.parse(lsGet(backupKey) || 'null');
      if (o && typeof o.text === 'string' && o.text) return { at: Number(o.at) || 0, reckonings: Number(o.reckonings) || 0, year: Math.floor(Number(o.year) || 0), text: o.text };
    } catch { /* unreadable: no backup */ }
    return null;
  }
  function readBackup(): BackupInfo | null {
    const b = readBackupRaw();
    return b ? { at: b.at, reckonings: b.reckonings, year: b.year } : null;
  }

  mark('rebound-mounted');
  installKeys(ctx, ui);
  void installManifest();

  /* ---------- time away ---------- */
  function catchUp(seconds: number, note: boolean): void {
    if (seconds <= 1 || d.pendingReckoning) return;
    const before = state!;
    const s = guard('fastForward', () => model.fastForward(before, content, seconds));
    if (!s) return;
    state = s;
    // The catch-up's events are summarised by the ledger (lastOffline), not played one by one.
    feed.skip(s);
    refresh(false);
    viewsAfterPaint();
    if (s.lastOffline) { ui.awayCheck(); return; }
    if (note && seconds > 60) {
      const gained = (s.capital ?? 0) - (before.capital ?? 0);
      const capped = Math.min(seconds, d.offlineCapSeconds || content.global?.offline?.capSeconds || content.global?.offlineCapSeconds || seconds);
      ui.toast(`While you were away (${dur(seconds)}${capped < seconds ? `; ${dur(capped)} counted` : ''}): ${gained >= 0 ? '+\u2060' : ''}${money(gained)}.`);
    }
  }

  // First paint without the views (they run projections; slow on a late save): they follow in their own task.
  ui.update();
  mark('rebound-ready');
  viewsAfterPaint();
  if (unread != null) ui.unreadSave(unread);
  // A save made between runs (the shop was open) stays fresh: no catch-up until the next run begins.
  if (away > 0 && !d.freshRun) catchUp(away, true);

  /* ---------- the loop ---------- */
  let last = performance.now();
  let acc = 0;
  let lastSave = last;
  function frame(now: number): void {
    requestAnimationFrame(frame);
    let el = (now - last) / 1000;
    last = now;
    if (halted) return;
    if (!(el >= 0)) el = 0;
    try {
      // Stop while a Reckoning is pending and while the post-Reckoning screens are up (the run must stay fresh).
      if (d.pendingReckoning || ui.blocking()) { acc = 0; return; }
      if (el > MAX_CATCHUP) { catchUp(el, el > 60); el = 0; acc = 0; return; }
      acc += el;
      let n = 0;
      while (acc >= STEP && !halted) {
        const s = guard('tick', () => model.tick(state!, content, Math.min(STEP, MAX_TICK_SECONDS)));
        if (!s) return;
        state = s;
        acc -= STEP;
        n++;
      }
      if (n > 0) {
        refresh(false);
        if (now - lastViews >= viewsEvery) viewsAfterPaint();
      }
      if (now - lastSave >= SAVE_EVERY) { lastSave = now; save(); }
    } catch (err) {
      fail(lastCall, err);
    }
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);
  window.addEventListener('hashchange', () => location.reload());

  // Handy in the console (and for tools/shot.mjs).
  (window as unknown as { rebound: unknown }).rebound = { ctx, get state() { return state; }, get d() { return d; }, model, content, save, prof };
}

function emptyDerived(): Derived {
  const t = { wellbeingYears: 0, intensity: 1, wellbeing: 0, budget: 0, unburnt: 0, backfire: 0, sectorsReached: 0, steady: 0, settled: 0, total: 0 };
  return {
    year: 1780, age: null, wellbeing: 0, incomePerSec: 0, clickValue: 0, mandatePerSec: 0, populationGrowthPerSec: 0, pendingReckoning: null,
    hindsightIfReckonNow: 0, hindsightTerms: t, sectors: {}, nextSectors: [], freshRun: false, slots: { total: 0, used: 0 },
    populationRef: 1, offlineCapSeconds: 0, charterOffer: [], charter: null, commons: { available: false, fund: 0, wellbeing: 0 },
    orders: {
      market: { available: false, on: false, paybackMax: 120, paybackChoices: [], sectors: {} },
      civilService: { available: false, on: false, levers: {} }, treasury: { available: false, on: false, keepSeconds: 0, projects: [] }, nextTickIn: 0,
    },
    respec: { allowed: false, refund: 0, refundByTree: {} },
  };
}

export function startGame(o: GameOpts): void {
  const start = () => {
    try { boot(o); }
    catch (err) {
      try { console.error('[rebound] start-up failed', err); } catch { /* ignore */ }
      showFatal('start-up', err, [{ label: 'Reload', run: () => location.reload() }, {
        label: 'Erase save and reload', run: () => { lsDel(SAVE_KEY); lsDel(AT_KEY); location.reload(); },
      }]);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
