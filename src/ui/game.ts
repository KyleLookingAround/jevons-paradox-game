// Rebound: the game loop, persistence and the wiring between the model and the UI.
// Wall-clock time lives only here; the model only ever sees dt.
import type { Content, Derived, GameState, InstitutionView, KnowhowView, LeverView, ModelApi, SectorId, UpgradeView } from '../types';
import { MAX_TICK_SECONDS } from '../types';
import { makeMockModel, mockContent, parseMockHash } from './devmock';
import type { Ctx } from './ctx';
import { sectorIds } from './ctx';
import { mountUI, type UI } from './app';
import { showFatal, hideFatal } from './sheets';
import { lsGet, lsSet, lsDel, download } from './store';
import { dur, money } from './fmt';

const SAVE_KEY = 'rebound.save.v1';          // kept from v1: deserialize migrates
const AT_KEY = 'rebound.save.v1.at';
const UNREAD_KEY = 'rebound.save.unreadable'; // a save deserialize refused, kept for export
const MOCK_KEY = 'rebound.mock.save';         // #mock:persist only
const TAB_KEY = 'rebound.ui.sector';
const STEP = 0.1;             // fixed 10 Hz simulation step
const MAX_CATCHUP = 5;        // seconds of ticks per frame; longer gaps go through fastForward
const VIEWS_EVERY = 1000;     // ms between view refreshes (upgrade views run projections)
const SAVE_EVERY = 10000;     // ms between autosaves

export interface GameOpts { realModel?: ModelApi; realContent?: Content }

function contentIsM1(c: Content | undefined): boolean {
  return !!(c && c.sectors && Array.isArray(c.sectorOrder) && c.sectorOrder.length && Array.isArray(c.ages));
}

function boot(o: GameOpts): void {
  const mockOpts = parseMockHash(location.hash);
  const mock = !!mockOpts || !o.realModel || !contentIsM1(o.realContent);
  const model: ModelApi = mock ? makeMockModel(mockOpts ?? {}) : o.realModel!;
  const content: Content = mock ? mockContent : o.realContent!;
  const persist = !mock || !!mockOpts?.persist;
  const saveKey = mock ? MOCK_KEY : SAVE_KEY, atKey = saveKey + '.at';

  let halted = false;
  let lastCall = 'start-up';

  /** Run a model call; on exception, stop the loop and show the error panel. */
  function guard<T>(name: string, f: () => T): T | undefined {
    lastCall = name;
    try { return f(); }
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

  let d: Derived = guard('derive', () => model.derive(state!, content)) ?? emptyDerived();
  let ups: UpgradeView[] = [];
  let levs: LeverView[] = [];
  let khs: KnowhowView[] = [];
  let insts: InstitutionView[] = [];

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
    sector: initial,
    act(name, f) {
      if (halted) return false;
      const before = state!;
      const next = guard(name, () => f(model, before, content));
      if (!next || next === before) return false;
      state = next;
      refresh(true);
      return true;
    },
    replace,
    selectSector(id) {
      if (!state!.sectors?.[id]?.open) return;
      ctx.sector = id;
      lsSet(TAB_KEY, id);
      ui.update();
    },
    openFormula: (k) => ui.openFormula(k),
    openMenu: () => ui.openMenu(),
    openShop: () => ui.openShop(),
    openLocked: (id) => ui.openLocked(id),
    confirmReckoning: () => ui.confirmReckoning(),
    toast: (t, a) => ui.toast(t, a),
    save,
  };

  function refresh(views: boolean): void {
    const nd = guard('derive', () => model.derive(state!, content));
    if (nd) d = nd;
    if (views) refreshViews();
    if (!halted) ui.update();
  }
  let lastViews = 0;
  function refreshViews(): void {
    lastViews = performance.now();
    const u = guard('upgradeViews', () => model.upgradeViews(state!, content));
    if (u) ups = u;
    const l = guard('leverViews', () => model.leverViews(state!, content));
    if (l) levs = l;
    // The shop views are cheap and only read while a sheet shows them, but keep them current with everything else.
    const k = guard('knowhowViews', () => model.knowhowViews(state!, content));
    if (k) khs = k;
    const i = guard('institutionViews', () => model.institutionViews(state!, content));
    if (i) insts = i;
  }

  function replace(s: GameState): void {
    state = s;
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
      lsDel(saveKey); lsDel(atKey);
      const s = guard('createState', () => model.createState(content));
      if (s) replace(s);
    },
    reckon() {
      const ok = ctx.act('reckon', (m, s, c) => m.reckon(s, c));
      if (ok) { ui.reset(); save(); }
      return ok;
    },
    resume() { last = performance.now(); acc = 0; save(); },
  });

  /* ---------- time away ---------- */
  function catchUp(seconds: number, note: boolean): void {
    if (seconds <= 1 || d.pendingReckoning) return;
    const before = state!;
    const s = guard('fastForward', () => model.fastForward(before, content, seconds));
    if (!s) return;
    state = s;
    refresh(true);
    if (note && seconds > 60) {
      const gained = (s.capital ?? 0) - (before.capital ?? 0);
      const capped = Math.min(seconds, content.global?.offlineCapSeconds ?? seconds);
      ui.toast(`While you were away (${dur(seconds)}${capped < seconds ? `; ${dur(capped)} counted` : ''}): ${gained >= 0 ? '+\u2060' : ''}${money(gained)}.`);
    }
  }

  refreshViews();
  ui.update();
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
      if (n > 0) refresh(now - lastViews >= VIEWS_EVERY);
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
  (window as unknown as { rebound: unknown }).rebound = { ctx, get state() { return state; }, get d() { return d; }, model, content, save };
}

function emptyDerived(): Derived {
  const t = { wellbeingYears: 0, intensity: 1, wellbeing: 0, budget: 0, unburnt: 0, backfire: 0, sectorsReached: 0, steady: 0, total: 0 };
  return {
    year: 1780, age: null, wellbeing: 0, incomePerSec: 0, clickValue: 0, mandatePerSec: 0, populationGrowthPerSec: 0, pendingReckoning: null,
    hindsightIfReckonNow: 0, hindsightTerms: t, sectors: {}, nextSectors: [], freshRun: false, slots: { total: 0, used: 0 },
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
