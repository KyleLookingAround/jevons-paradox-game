// Rebound: the game loop, persistence and the wiring between the model and the UI.
// Wall-clock time lives only here; the model only ever sees dt.
import type { Content, Derived, EraId, GameState, LeverView, ModelApi, UpgradeView } from './types';
import { model as realModel } from './model';
import { content as realContent } from './content';
import { makeMockModel, mockContent, parseMockHash } from './ui/devmock';
import type { Ctx } from './ui/ctx';
import { eraIds } from './ui/ctx';
import { mountUI, type UI } from './ui/app';
import { showFatal, hideFatal } from './ui/sheets';
import { lsGet, lsSet, lsDel, download } from './ui/store';
import { dur, money } from './ui/fmt';

const SAVE_KEY = 'rebound.save.v1';
const AT_KEY = 'rebound.save.v1.at';
const TAB_KEY = 'rebound.ui.era';
const STEP = 0.1;             // fixed 10 Hz simulation step
const MAX_CATCHUP = 5;        // seconds of ticks per frame; longer gaps go through fastForward
const VIEWS_EVERY = 1000;     // ms between upgradeViews / leverViews refreshes
const SAVE_EVERY = 10000;     // ms between autosaves

function boot(): void {
  const mockOpts = parseMockHash(location.hash);
  const contentOk = !!(realContent && (realContent as Partial<Content>).eras);
  const mock = !!mockOpts || !contentOk;
  const model: ModelApi = mock ? makeMockModel(mockOpts ?? {}) : realModel;
  const content: Content = mock ? mockContent : realContent;
  const persist = !mock;

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
  if (persist) {
    const txt = lsGet(SAVE_KEY);
    if (txt) {
      const s = guard('deserialize', () => model.deserialize(txt, content));
      if (s) {
        state = s;
        const at = Number(lsGet(AT_KEY));
        if (Number.isFinite(at) && at > 0) away = Math.max(0, (Date.now() - at) / 1000);
      }
    }
  }
  if (!state) state = guard('createState', () => model.createState(content));
  if (!state) return; // fatal panel already up

  let d: Derived = guard('derive', () => model.derive(state!, content)) ?? emptyDerived();
  let ups: UpgradeView[] = [];
  let levs: LeverView[] = [];

  const storedTab = lsGet(TAB_KEY) as EraId | null;
  const firstOpen = eraIds(content).find((id) => state!.eras?.[id]?.open) ?? 'steam';
  const initialEra: EraId = mockOpts?.era && state.eras?.[mockOpts.era]?.open ? mockOpts.era
    : storedTab && state.eras?.[storedTab]?.open ? storedTab : firstOpen;

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
    era: initialEra,
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
    selectEra(id) {
      if (!state!.eras?.[id]?.open) return;
      ctx.era = id;
      lsSet(TAB_KEY, id);
      ui.update();
    },
    openFormula: (k) => ui.openFormula(k),
    openMenu: () => ui.openMenu(),
    openShop: () => ui.openShop(),
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
    if (txt != null) { lsSet(SAVE_KEY, txt); lsSet(AT_KEY, String(Date.now())); }
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
      lsDel(SAVE_KEY); lsDel(AT_KEY);
      const s = guard('createState', () => model.createState(content));
      if (s) replace(s);
    },
    reckon() { return ctx.act('reckon', (m, s, c) => m.reckon(s, c)) && (ui.reset(), save(), true); },
  });

  /* ---------- time away ---------- */
  function catchUp(seconds: number): void {
    if (seconds <= 1 || d.pendingReckoning) return;
    const before = state!;
    const s = guard('fastForward', () => model.fastForward(before, content, seconds));
    if (!s) return;
    state = s;
    refresh(true);
    if (seconds > 60) {
      const gained = (s.capital ?? 0) - (before.capital ?? 0);
      ui.toast(`While you were away (${dur(seconds)}): ${gained >= 0 ? '+' : ''}${money(gained)}.`);
    }
  }

  refreshViews();
  ui.update();
  if (away > 0) catchUp(away);

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
      if (d.pendingReckoning || ui.blocking()) { acc = 0; return; }
      if (el > MAX_CATCHUP) { catchUp(el); el = 0; acc = 0; return; }
      acc += el;
      let n = 0;
      while (acc >= STEP && !halted) {
        const s = guard('tick', () => model.tick(state!, content, STEP));
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

  // Handy in the console while the model is young.
  (window as unknown as { rebound: unknown }).rebound = { ctx, get state() { return state; }, model, content };
}

function emptyDerived(): Derived {
  return { year: 1780, wellbeing: 0, incomePerSec: 0, mandatePerSec: 0, populationGrowthPerSec: 0, pendingReckoning: null, hindsightIfReckonNow: 0, eras: {}, nextEra: null };
}

function start(): void {
  try { boot(); }
  catch (err) {
    try { console.error('[rebound] start-up failed', err); } catch { /* ignore */ }
    showFatal('start-up', err, [{ label: 'Reload', run: () => location.reload() }, {
      label: 'Erase save and reload', run: () => { lsDel(SAVE_KEY); lsDel(AT_KEY); location.reload(); },
    }]);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
