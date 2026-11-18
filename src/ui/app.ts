// Assembles the page and keeps the layout in step with the state. Holds no game rules.
import type { Ctx, Comp } from './ctx';
import { sectorDef, openSectors, lookFor, accentFor, ageOfSector, sectorIds } from './ctx';
import type { SectorId } from '../types';
import { h, setText, show, cls, setAttr } from './dom';
import { buildTopbar, buildTabs } from './bar';
import { buildGauges } from './gauges';
import { buildNews, buildWorld, buildDock } from './world';
import { buildUpgrades, buildLevers, buildBudget } from './panels';
import {
  buildSheets, buildToasts, formulaSheet, menuSheet, shopSheet, confirmReckonSheet, pendingSheet, summarySheet, winSheet, lockedSheet,
  unreadSaveSheet, type MenuHooks, type Sheets,
} from './sheets';
import { fmt } from './fmt';

export interface UI {
  update(): void;
  blocking(): boolean;
  sheets: Sheets;
  toast(text: string, action?: { label: string; run: () => void }): void;
  openFormula: Ctx['openFormula'];
  openMenu(): void;
  openShop(): void;
  openLocked(id: SectorId): void;
  confirmReckoning(): void;
  unreadSave(raw: string): void;
  /** Call after the whole state was swapped (import, reset, new run): forgets transient memory. */
  reset(): void;
}

const THEME_COLOUR: Record<string, string> = {
  ledger: '#efe6d0', gaslight: '#141d33', chrome: '#ece5d6', terminal: '#070b08', agentic: '#f2f1ed',
};

export interface AppHooks extends MenuHooks {
  /** End the run (model.reckon). True if accepted. */
  reckon(): boolean;
  /** The post-Reckoning screens are closed and the next run begins: restart the clock. */
  resume(): void;
}

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

  const onboard = h('p', { class: 'onboard', hidden: true });
  const hb = h('b', { class: 'num' });
  const reckonBtn = h('button', { class: 'btn', type: 'button', onclick: () => ui.confirmReckoning() }, 'Call a Reckoning');
  const foot = h('footer', { class: 'run-foot' },
    h('p', { class: 'muted' }, 'Hindsight on offer: ', hb), reckonBtn);

  const cockpit = h('div', { class: 'cockpit' }, topbar.el, tabs.el, gauges.el, dock.el);
  // Improvements sit above the world so that a phone shows the first purchase above the fold.
  const feed = h('main', { class: 'feed', id: 'main', tabindex: '-1' }, onboard, news.el, ups.el, world.el, budget.el, levs.el, foot);
  root.replaceChildren(cockpit, feed, sheets.el, toasts.el);

  const comps: Comp[] = [topbar, tabs, gauges, dock, news, world, ups, budget, levs];

  let look = '', accent: string | null | undefined;
  let knownOpen: Set<SectorId> | null = null;
  let wasWon = !!ctx.state.flags?.won;
  let onboardState: 'show' | 'fading' | 'gone' | '' = '';

  function reckonNow(): void { if (hooks.reckon()) summarySheet(ctx, sheets, () => hooks.resume()); }

  const ui: UI = {
    sheets,
    toast: (t, a) => toasts.push(t, a),
    openFormula: (k) => formulaSheet(ctx, sheets, k),
    openMenu: () => menuSheet(ctx, sheets, hooks),
    openShop: () => shopSheet(ctx, sheets),
    openLocked: (id) => lockedSheet(ctx, sheets, id),
    confirmReckoning: () => confirmReckonSheet(ctx, sheets, reckonNow),
    unreadSave: (raw) => unreadSaveSheet(sheets, raw),
    blocking: () => sheets.blocking(),
    reset() { knownOpen = null; wasWon = !!ctx.state.flags?.won; onboardState = ''; },
    update,
  };

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

    for (const c of comps) c.update();

    // Onboarding: one line on a fresh run, gone after the first purchase.
    const fresh = Object.keys(ctx.state.upgrades || {}).length === 0;
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

    // Forced Reckoning: the loop has stopped; show the card.
    const k = sheets.kind();
    if (ctx.d?.pendingReckoning && k !== 'pending' && k !== 'summary' && k !== 'shop') {
      pendingSheet(ctx, sheets, () => reckonNow());
    }
    // Win: first time only.
    const won = !!ctx.state.flags?.won;
    if (won && !wasWon) winSheet(ctx, sheets);
    wasWon = won;

    sheets.update();
  }

  return ui;
}
