// Assembles the page and keeps the layout in step with the state. Holds no game rules.
import type { Ctx, Comp } from './ctx';
import { eraDef, openEras } from './ctx';
import type { EraId } from '../types';
import { h, setText, show, cls } from './dom';
import { buildTopbar, buildTabs } from './bar';
import { buildGauges } from './gauges';
import { buildNews, buildApps, buildDock } from './world';
import { buildUpgrades, buildLevers } from './panels';
import {
  buildSheets, buildToasts, formulaSheet, menuSheet, shopSheet, confirmReckonSheet, pendingSheet, summarySheet, winSheet,
  type MenuHooks, type Sheets,
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
  confirmReckoning(): void;
  /** Call after the whole state was swapped (import, reset): forgets transient memory. */
  reset(): void;
}

const THEME_COLOUR: Record<string, string> = {
  ledger: '#efe6d0', gaslight: '#141d33', chrome: '#ece5d6', terminal: '#070b08', agentic: '#f2f1ed',
};

export function mountUI(root: HTMLElement, ctx: Ctx, hooks: MenuHooks & { reckon(): boolean }): UI {
  const sheets = buildSheets();
  const toasts = buildToasts();

  const topbar = buildTopbar(ctx);
  const tabs = buildTabs(ctx);
  const gauges = buildGauges(ctx);
  const dock = buildDock(ctx);
  const news = buildNews(ctx);
  const apps = buildApps(ctx);
  const ups = buildUpgrades(ctx);
  const levs = buildLevers(ctx);

  const onboard = h('p', { class: 'onboard', hidden: true });
  const hb = h('b', { class: 'num' });
  const reckonBtn = h('button', { class: 'btn', type: 'button', onclick: () => ui.confirmReckoning() }, 'Call a Reckoning');
  const foot = h('footer', { class: 'run-foot' },
    h('p', { class: 'muted' }, 'Hindsight on offer: ', hb), reckonBtn);

  const cockpit = h('div', { class: 'cockpit' }, topbar.el, tabs.el, gauges.el, dock.el);
  const feed = h('main', { class: 'feed', id: 'main' }, onboard, news.el, apps.el, ups.el, levs.el, foot);
  root.replaceChildren(cockpit, feed, sheets.el, toasts.el);

  const comps: Comp[] = [topbar, tabs, gauges, dock, news, apps, ups, levs];

  let theme = '';
  let knownOpen: Set<EraId> | null = null;
  let wasWon = !!ctx.state.flags?.won;
  let onboardState: 'show' | 'fading' | 'gone' | '' = '';

  function reckonNow(): void { if (hooks.reckon()) summarySheet(ctx, sheets, () => { /* the loop resumes once no blocking sheet is open */ }); }

  const ui: UI = {
    sheets,
    toast: (t, a) => toasts.push(t, a),
    openFormula: (k) => formulaSheet(ctx, sheets, k),
    openMenu: () => menuSheet(ctx, sheets, hooks),
    openShop: () => shopSheet(ctx, sheets),
    confirmReckoning: () => confirmReckonSheet(ctx, sheets, reckonNow),
    blocking: () => sheets.blocking(),
    reset() { knownOpen = null; wasWon = !!ctx.state.flags?.won; onboardState = ''; },
    update,
  };

  function update(): void {
    const open = openEras(ctx);
    // Keep the selected tab on an open era.
    if (!open.includes(ctx.era) && open.length) ctx.era = open[0];
    // Era opened: say so once, with a way there.
    if (knownOpen) {
      for (const id of open) if (!knownOpen.has(id)) {
        const def = eraDef(ctx, id);
        if (def) toasts.push(`${def.name}, ${def.years}. ${def.tagline}`, { label: 'Go there', run: () => ctx.selectEra(id) }, 12000);
      }
    }
    knownOpen = new Set(open);

    const def = eraDef(ctx);
    const t = def?.theme ?? 'ledger';
    if (t !== theme) {
      theme = t;
      document.documentElement.setAttribute('data-era', t);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', THEME_COLOUR[t] ?? '#efe6d0');
    }

    for (const c of comps) c.update();

    // Onboarding: one line on a fresh run, gone after the first purchase.
    const fresh = Object.keys(ctx.state.upgrades || {}).length === 0;
    if (onboardState === '') {
      onboardState = fresh && ctx.state.time < 600 ? 'show' : 'gone';
      const again = (ctx.state.meta?.reckonings ?? 0) > 0;
      setText(onboard, again
        ? 'Lancashire, 1780, again. The pit is flooded. You know more this time.'
        : 'Lancashire, 1780. You have one atmospheric engine and a flooded pit.');
      show(onboard, onboardState === 'show');
    } else if (onboardState === 'show' && !fresh) {
      onboardState = 'fading';
      cls(onboard, 'fade', true);
      setTimeout(() => { show(onboard, false); onboardState = 'gone'; }, 1200);
    }

    setText(hb, fmt(Math.floor(ctx.d?.hindsightIfReckonNow ?? 0)));

    // Forced Reckoning: the loop has stopped; show the card.
    if (ctx.d?.pendingReckoning && sheets.kind() !== 'pending' && sheets.kind() !== 'summary' && sheets.kind() !== 'shop') {
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
