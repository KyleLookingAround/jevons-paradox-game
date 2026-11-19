// Assembles the page and keeps the layout in step with the state. Holds no game rules.
import type { Ctx, Comp } from './ctx';
import { sectorDef, openSectors, lookFor, accentFor, ageOfSector, sectorIds, reckoningOffered } from './ctx';
import type { GameState, SectorId } from '../types';
import { h, setText, show, cls, setAttr } from './dom';
import { buildTopbar, buildTabs } from './bar';
import { buildGauges } from './gauges';
import { buildNews, buildWorld, buildDock } from './world';
import { buildUpgrades, buildLevers, buildBudget } from './panels';
import {
  buildSheets, buildToasts, formulaSheet, menuSheet, shopSheet, confirmReckonSheet, pendingSheet, summarySheet, winSheet, lockedSheet,
  unreadSaveSheet, forkSheet, type MenuHooks, type Sheets,
} from './sheets';
import { fmt } from './fmt';
import { createAfford, type AffordState } from './afford';
import { reducedMotion } from './dom';
import { timed } from './prof';

export interface UI {
  update(): void;
  blocking(): boolean;
  sheets: Sheets;
  toast(text: string, action?: { label: string; run: () => void }): () => void;
  openFormula: Ctx['openFormula'];
  openMenu(focus?: 'keys'): void;
  openShop(): void;
  /** Between runs (a restored backup): the shop, with "Begin the next run". */
  openShopBetweenRuns(): void;
  openLocked(id: SectorId): void;
  confirmReckoning(): void;
  unreadSave(raw: string): void;
  /** Call after the whole state was swapped (import, reset, new run): forgets transient memory. */
  reset(): void;
  /** After every accepted action: returns the purchase keys it made (see afford.ts). */
  afterAct(before: GameState, after: GameState): string[];
  afford: AffordState;
  jumpToAffordable(): void;
  showPlace(appId: string | null): void;
  confirmFork(id: string, onYes: () => void): void;
  /** Run `apply` (which switches the selected Industry) inside one composed page transition where the browser can. */
  composeSwitch(from: SectorId, to: SectorId, apply: () => void): void;
}

const THEME_COLOUR: Record<string, string> = {
  ledger: '#efe6d0', gaslight: '#1c1630', chrome: '#ece5d6', terminal: '#070b08', agentic: '#0b0a14',
};

export interface AppHooks extends MenuHooks {
  /** End the run (model.reckon). True if accepted. */
  reckon(): boolean;
  /** The post-Reckoning screens are closed and the next run begins: restart the clock. */
  resume(): void;
}

/** Minimum gap between two headlines read out by a screen reader. */
const ANNOUNCE_EVERY = 12000;

export function mountUI(root: HTMLElement, ctx: Ctx, hooks: AppHooks): UI {
  const sheets = buildSheets();
  const toasts = buildToasts();

  const topbar = buildTopbar(ctx);
  const tabs = buildTabs(ctx);
  const gauges = buildGauges(ctx);
  const dock = buildDock(ctx);
  const news = buildNews(ctx);
  const world = buildWorld(ctx);
  const ups = buildUpgrades(ctx);
  const budget = buildBudget(ctx);
  const levs = buildLevers(ctx);

  const afford = createAfford(ctx);
  // The affordable chip, by the sell button (thumb's reach, first screen); tapping it jumps to the first offer.
  const chipN = h('span', { class: 'chip-n num' });
  const chipL = h('span', { class: 'chip-l' });
  const chip = h('button', { class: 'afford-chip', type: 'button', hidden: true, onclick: () => ui.jumpToAffordable() }, chipN, chipL);
  dock.el.append(chip);
  // Screen readers hear the latest headline, politely and at most every ANNOUNCE_EVERY ms (the visible strip is not live).
  const live = h('p', { class: 'vh', 'aria-live': 'polite', 'aria-atomic': 'true' });
  let liveKey = '', liveAt = 0, liveTimer = 0;

  const onboard = h('p', { class: 'onboard', hidden: true });
  const hb = h('b', { class: 'num' });
  const reckonBtn = h('button', { class: 'btn', type: 'button', onclick: () => ui.confirmReckoning() }, 'Call a Reckoning');
  const foot = h('footer', { class: 'run-foot' },
    h('p', { class: 'muted' }, 'Hindsight on offer: ', hb), reckonBtn);

  const cockpit = h('div', { class: 'cockpit' }, topbar.el, tabs.el, gauges.el, dock.el);
  // Improvements sit above the world so that a phone shows the first purchase above the fold.
  // The scene leads the feed: on a phone it shares the first screen with the gauges, the headline and the start of the
  // improvements (the affordable chip by the sell button covers the rest).
  const feed = h('main', { class: 'feed', id: 'main', tabindex: '-1' }, onboard, world.el, news.el, ups.el, budget.el, levs.el, foot);
  root.replaceChildren(cockpit, feed, sheets.el, toasts.el, live);

  // A crisis is one event: the picture's fog (the scene), the headline (the broadsheet) and the gauges arrive together.
  document.addEventListener('rebound:moment', (e) => {
    const kind = (e as CustomEvent<string>).detail;
    if (kind !== 'crisis') return;
    cockpit.classList.remove('m-crisis'); void cockpit.offsetWidth; cockpit.classList.add('m-crisis');
    setTimeout(() => cockpit.classList.remove('m-crisis'), 2400);
  });

  const comps: [string, Comp][] = [['topbar', topbar], ['tabs', tabs], ['gauges', gauges], ['dock', dock], ['news', news], ['world', world], ['ups', ups], ['budget', budget], ['levs', levs]];

  let look = '', accent: string | null | undefined;
  let knownOpen: Set<SectorId> | null = null;
  let knownSteady: Set<SectorId> | null = null;
  let wasWon = !!ctx.state.flags?.won;
  let onboardState: 'show' | 'fading' | 'gone' | '' = '';

  function reckonNow(): void { if (hooks.reckon()) summarySheet(ctx, sheets, () => hooks.resume(), hooks.exportText); }

  function jumpToAffordable(): void {
    const it = afford.state.items[0];
    if (!it) return;
    if (it.sector !== ctx.sector) ctx.selectSector(it.sector);
    const el = it.kind === 'up'
      ? document.querySelector<HTMLElement>(`.upgrades .up[data-up="${CSS.escape(it.id)}"]`) ?? ups.el
      : world.focusApp(it.id);
    if (!el) return;
    // Clear the pinned header on a phone; on the two-column desk layout the header sits beside the feed.
    const cr = cockpit.getBoundingClientRect(), fr = feed.getBoundingClientRect();
    const beside = cr.right <= fr.left + 1;
    const top = el.getBoundingClientRect().top + window.scrollY - (beside ? 16 : cr.height + 12);
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
    // One brief mark on the card (not a loop), and keyboard focus on its button.
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1800);
    const btn = el.querySelector<HTMLButtonElement>('.buy, .scn-found:not([hidden])');
    try { btn?.focus({ preventScroll: true }); } catch { /* ignore */ }
  }

  const ui: UI = {
    sheets,
    toast: (t, a) => toasts.push(t, a),
    openFormula: (k) => formulaSheet(ctx, sheets, k),
    openMenu: (focus) => menuSheet(ctx, sheets, hooks, focus),
    openShop: () => shopSheet(ctx, sheets),
    openShopBetweenRuns: () => shopSheet(ctx, sheets, () => hooks.resume()),
    openLocked: (id) => lockedSheet(ctx, sheets, id),
    confirmReckoning: () => confirmReckonSheet(ctx, sheets, reckonNow),
    unreadSave: (raw) => {
      const info = hooks.backup();
      unreadSaveSheet(sheets, raw, info ? { info, restore: () => hooks.restoreBackup() } : undefined);
    },
    blocking: () => sheets.blocking(),
    reset() { world.reset(); knownOpen = null; knownSteady = null; wasWon = !!ctx.state.flags?.won; onboardState = ''; liveKey = ''; },
    afterAct: (before, after) => afford.afterAct(before, after),
    afford: afford.state,
    jumpToAffordable,
    showPlace: (id) => world.showPlace(id),
    confirmFork: (id, onYes) => forkSheet(ctx, sheets, id, onYes),
    composeSwitch,
    update,
  };

  // View Transitions (Chrome 111+, Safari 18+): the old screen is held as a picture while the new look, picture and
  // panels are built underneath, then the two cross-fade (the picture slides a little, in the direction of travel).
  // Elsewhere, under reduced motion, or with a sheet up, the switch is immediate.
  function composeSwitch(from: SectorId, to: SectorId, apply: () => void): void {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (typeof doc.startViewTransition !== 'function' || reducedMotion() || sheets.blocking() || document.hidden) { apply(); return; }
    const ids = sectorIds(ctx.content);
    document.documentElement.setAttribute('data-dir', ids.indexOf(to) >= ids.indexOf(from) ? 'next' : 'prev');
    try { doc.startViewTransition(apply); } catch { apply(); }
  }

  function update(): void {
    const open = openSectors(ctx);
    // Keep the selected tab on an open industry.
    if (!open.includes(ctx.sector) && open.length) ctx.sector = open[0];
    // An industry opened: say so once, with a way there.
    if (knownOpen) {
      for (const id of open) if (!knownOpen.has(id)) {
        const def = sectorDef(ctx, id);
        if (def) toasts.push(`${def.name}, ${def.years}. ${def.tagline}`, { label: 'Go there', run: () => ctx.selectSector(id) }, 10000);
      }
    }
    knownOpen = new Set(open);
    // Steady State in an industry: the scene clears its sky; the page says so too, once, with the line now held.
    const ss = ctx.state.run?.steadySectors || {};
    if (knownSteady) for (const id of Object.keys(ss)) if (ss[id] && !knownSteady.has(id)) {
      const def = sectorDef(ctx, id);
      toasts.push(`Steady State in ${def?.name ?? 'an Industry'}: fifty years of a decent life inside the line. The line holds level from here.`,
        id !== ctx.sector ? { label: 'Go there', run: () => ctx.selectSector(id) } : undefined, 12000);
    }
    knownSteady = new Set(Object.keys(ss).filter((k) => ss[k]));

    const lk = lookFor(ctx.content, ctx.sector);
    const ac = accentFor(ctx.content, ctx.sector);
    const html = document.documentElement;
    if (lk !== look) {
      look = lk;
      html.setAttribute('data-look', lk);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', THEME_COLOUR[lk] ?? '#efe6d0');
    }
    if (ac !== accent) { accent = ac; setAttr(html, 'data-accent', ac); }

    timed('ui.afford', () => afford.update());
    for (const [n, c] of comps) timed('ui.' + n, () => c.update());

    // The chip: how many offers are news (afford.ts holds the no-nag rule), and where the first one is.
    const items = afford.state.items;
    show(chip, items.length > 0 && !sheets.blocking());
    if (items.length) {
      const first = items[0];
      const elsewhere = first.sector !== ctx.sector;
      const where = elsewhere ? sectorDef(ctx, first.sector)?.name ?? '' : '';
      setText(chipN, String(items.length));
      setText(chipL, elsewhere ? `affordable · ${where} →` : 'affordable ↓');
      chip.setAttribute('aria-label', `${items.length} affordable. Show the first${elsewhere ? `, in ${where}` : ''}.`);
    }

    // Onboarding: one line on a fresh run, gone after the first purchase, and never after a long time away (the
    // catch-up runs after the first update, so the run's clock is checked on every update, not only the first).
    const fresh = Object.keys(ctx.state.upgrades || {}).length === 0;
    if (onboardState === 'show' && ctx.state.time >= 600) { onboardState = 'gone'; show(onboard, false); }
    if (onboardState === '') {
      onboardState = fresh && ctx.state.time < 600 ? 'show' : 'gone';
      const again = (ctx.state.meta?.reckonings ?? 0) > 0;
      const first = sectorIds(ctx.content)[0];
      const y = ageOfSector(ctx.content, first)?.yearSpan?.[0] ?? 1780;
      setText(onboard, again
        ? `Lancashire, ${y}, again. The pit is flooded. You know more this time.`
        : `Lancashire, ${y}. You have one atmospheric engine and a flooded pit.`);
      show(onboard, onboardState === 'show');
    } else if (onboardState === 'show' && !fresh) {
      onboardState = 'fading';
      cls(onboard, 'fade', true);
      setTimeout(() => { show(onboard, false); onboardState = 'gone'; }, 1200);
    }

    setText(hb, fmt(Math.floor(ctx.d?.hindsightIfReckonNow ?? 0)));
    // Offered once the run has had its reveal (or after a first Reckoning); a forced Reckoning needs no button.
    show(foot, reckoningOffered(ctx) && !ctx.d?.pendingReckoning);

    // The polite live region: the newest headline, rate-limited. The first headline on load is not read out.
    const top = Array.isArray(ctx.state.news) ? ctx.state.news[0] : undefined;
    const nk = top ? `${top.time}|${top.text}` : '';
    if (liveKey === '') liveKey = nk || '\u0000';
    else if (nk && nk !== liveKey && !liveTimer) {
      const say = () => {
        liveTimer = 0;
        const t = Array.isArray(ctx.state.news) ? ctx.state.news[0] : undefined;
        if (!t) return;
        liveKey = `${t.time}|${t.text}`; liveAt = Date.now();
        live.textContent = `${t.text} (${Math.floor(t.year)})`;
      };
      const wait = liveAt + ANNOUNCE_EVERY - Date.now();
      if (wait <= 0) say(); else liveTimer = window.setTimeout(say, wait);
    }

    // Forced Reckoning: the loop has stopped; show the card.
    const k = sheets.kind();
    if (ctx.d?.pendingReckoning && k !== 'pending' && k !== 'summary' && k !== 'shop') {
      pendingSheet(ctx, sheets, () => reckonNow());
    }
    // Win: first time only.
    const won = !!ctx.state.flags?.won;
    if (won && !wasWon) winSheet(ctx, sheets);
    wasWon = won;

    timed('ui.sheets', () => sheets.update());
  }

  return ui;
}
