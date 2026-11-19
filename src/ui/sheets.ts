// Overlays: one sheet at a time (menu, formula, confirmations, Hindsight shop, the Reckoning, the win card, the locked
// industry checklist). Transient notes are notes.ts. Sheet structure is built when it opens; live numbers inside are patched while it
// stays open.
import type { Ctx, FormulaKind } from './ctx';
import { sectorDef, sd, sectorIds, ageOfSector, ageDef, reckoningOffered } from './ctx';
import type { EffectDef, FeatureId, HindsightTerms, InstitutionView, KnowhowView, ReckoningCause, SectorId } from '../types';
import { STEADY_STATE_YEARS, FEATURE_IDS } from '../types';
import { h, svg, setText, setAttr, setStyle, show, cls, syncChildren } from './dom';
import { fmt, fmtPrice, fold, pct, dur, num, clamp, lower, money, unitOne } from './fmt';
import { UI_ICONS } from './icons';
import { effectText } from './panels';
import { download, copyText, readFileText, isPersisted, iosInBrowser, storageWorks } from './store';
import { getPrefs, setPrefs, isOpen, setOpen, type TextSize, type Motion, type Detail } from './prefs';
import { lapseBlock, type Lapse } from './timelapse';
import { setSound, setVolumes, setCalm, prefetchSound } from './sound';
import type { Notation } from './fmt';
import { historyPicker } from './history';
import { archiveSheet, archiveUnread } from './archive';
import { surveyFiler } from './survey';
import { surveyDisclosure } from '../content/proprietor';

type Updater = (() => void) | void;
interface OpenOpts { label: string; full?: boolean; blocking?: boolean; dismissable?: boolean; cls?: string }

export interface Sheets {
  el: HTMLElement;
  open(kind: string, build: (body: HTMLElement, close: () => void) => Updater, opts: OpenOpts): void;
  close(): void;
  update(): void;
  kind(): string | null;
  blocking(): boolean;
}

export function buildSheets(): Sheets {
  const title = h('h2', { class: 'sheet-t', id: 'sheet-title' });
  const closeBtn = h('button', { class: 'sheet-x', type: 'button', 'aria-label': 'Close', onclick: () => tryClose() });
  closeBtn.append(svg(UI_ICONS.close));
  const body = h('div', { class: 'sheet-b' });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title', tabindex: '-1' },
    h('header', { class: 'sheet-h' }, title, closeBtn), body);
  const scrim = h('div', { class: 'scrim', onclick: () => tryClose() });
  const el = h('div', { class: 'layer', hidden: true }, scrim, sheet);
  let current: string | null = null, upd: Updater = undefined, opts: OpenOpts | null = null;
  let returnFocus: Element | null = null;
  // The browser's back button closes a sheet rather than leaving the game (QA B23): opening a sheet adds one history
  // entry (same address) unless one is already there. A sheet closed from the page leaves its entry in place for the
  // next sheet (taking it off with history.back() races the next pushState and can leave the page); a back press with
  // no sheet open just spends it.
  let pushed = false;
  function pushEntry(): void {
    if (pushed) return;
    try { history.pushState({ rebound: 'sheet' }, ''); pushed = true; } catch { /* no history: back leaves, as before */ }
  }
  window.addEventListener('popstate', () => {
    if (!pushed) return;
    pushed = false;
    if (!current) return;
    // A sheet that must be answered (the Reckoning, between runs) stays: put the entry back.
    if (opts && opts.dismissable === false) { pushEntry(); return; }
    close();
  });

  function tryClose(): void { if (opts && opts.dismissable !== false) close(); }
  function close(): void {
    current = null; upd = undefined; opts = null;
    show(el, false);
    body.replaceChildren();
    setText(title, '');
    document.documentElement.classList.remove('sheet-open');
    for (const n of Array.from(document.querySelectorAll('#app > .cockpit, #app > .feed'))) n.removeAttribute('inert');
    if (returnFocus instanceof HTMLElement && document.contains(returnFocus) && !returnFocus.closest('[hidden]')) {
      try { returnFocus.focus({ preventScroll: true }); } catch { /* ignore */ }
    }
  }
  function open(kind: string, build: (b: HTMLElement, c: () => void) => Updater, o: OpenOpts): void {
    if (!current) returnFocus = document.activeElement;
    current = kind; opts = o;
    pushEntry();
    body.replaceChildren();
    setText(title, o.label);
    sheet.className = 'sheet' + (o.full ? ' full' : '') + (o.cls ? ' ' + o.cls : '');
    show(closeBtn, o.dismissable !== false);
    upd = build(body, close);
    show(el, true);
    document.documentElement.classList.add('sheet-open');
    // Keep keyboard and screen-reader focus inside the sheet.
    for (const n of Array.from(document.querySelectorAll('#app > .cockpit, #app > .feed'))) n.setAttribute('inert', '');
    sheet.scrollTop = 0;
    if (upd) upd();
    const f = sheet.querySelector<HTMLElement>('.sheet-b button:not([disabled]):not([aria-disabled="true"]), .sheet-b a, .sheet-x:not([hidden])');
    try { (f ?? sheet).focus({ preventScroll: true }); } catch { /* ignore */ }
  }
  document.addEventListener('keydown', (e) => {
    if (!current) return;
    if (e.key === 'Escape') { tryClose(); return; }
    if (e.key !== 'Tab') return;
    const items = Array.from(sheet.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, label[for], [tabindex]:not([tabindex="-1"])'))
      .filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });
  return {
    el, open, close,
    update: () => { if (upd) upd(); },
    kind: () => current,
    blocking: () => !!opts?.blocking,
  };
}

/* ------------------------------------------------------------------ */
/* Formula behind a number                                             */
/* ------------------------------------------------------------------ */

export function formulaSheet(ctx: Ctx, sheets: Sheets, kind: FormulaKind): void {
  const label = kind === 'eff' ? 'Efficiency' : kind === 'cons' ? 'Consumption' : kind === 'rebound' ? 'Rebound' : 'Price';
  sheets.open('formula', (b) => {
    const def = sectorDef(ctx);
    const unitS = unitOne(def?.service), unitR = unitOne(def?.resource);
    const unitRs = def?.resource.unit ?? '';
    const lines: Record<FormulaKind, string[]> = {
      eff: ['η = service ÷ resource', 'fold = η ÷ η at the start'],
      cons: ['R = D × (1 − σ) ÷ η', 'Dᵢ = N·Sᵢ ÷ (1 + (pₛ ÷ pᵢ)^kᵢ)', 'R ÷ R₀ = growth × R ÷ R shadow'],
      rebound: ['R promised = R shadow ÷ (η ÷ η₀)', 'rebound = (R − R promised) ÷ (R shadow − R promised)', 'R ÷ R₀ = growth × R ÷ R shadow'],
      price: ['p before levies = (1 − σ)(pᵣ ÷ η + c) + σ · 1.5c', 'pₛ = p before levies + permit part + duty part', 'income = m × p before levies × D'],
    };
    const notes: Record<FormulaKind, string> = {
      eff: 'Each improvement multiplies η. The card promises resource falls by the same factor.',
      cons: 'Demand is a sum of uses, each a logistic curve in the service price. The shadow is the same economy with efficiency frozen at the start.',
      rebound: 'The shadow is this economy with no efficiency gains: same uses, same people, same scarcity. Rebound is the share of the promised saving that extra use of the same things took back. Over 100%: backfire. Growth is what new uses, more people and scarcity did on their own.',
      price: 'A thriftier engine makes the service cheaper. Cheaper service sells more of it. Levies go to the Treasury or back to households, never to you.',
    };
    // Before the reveal the shadow (and so rebound and growth) would answer the question the run is asking: the
    // rebound sheet says only that something is unaccounted for, and the consumption sheet leaves the shadow out.
    const revealed = !!ctx.state.flags?.revealed;
    if (!revealed && kind === 'rebound') {
      b.append(h('p', { class: 'f-note', text: 'The engineers promised a saving; the coal merchants report otherwise. Nobody has yet put a figure on the difference.' }));
      return;
    }
    if (!revealed && kind === 'cons') {
      lines.cons = lines.cons.slice(0, 2);
      notes.cons = 'Demand is a sum of uses, each a logistic curve in the service price.';
    }
    type Row = [string, (e: NonNullable<ReturnType<typeof sd>>) => string];
    const R: Record<string, Row> = {
      eta: ['η', (e) => `${fmtPrice(e.eta)} ${unitS}/${unitR}`],
      fold: ['η ÷ η₀', (e) => fold(e.etaFold)],
      pr: ['pᵣ (scarcity)', (e) => `£${fmtPrice(e.resourcePriceBase)}/${unitR}`],
      permit: ['permit', (e) => `£${fmtPrice(e.permitPrice)}/${unitR}`],
      c: ['c', (e) => `£${fmtPrice(e.capCost)}/${unitS}`],
      sigma: ['σ substituted', (e) => pct(e.substitutedShare, false)],
      pre: ['p before levies', (e) => `£${fmtPrice(e.preLevyPrice)}/${unitS}`],
      permitPart: ['permit part', (e) => `£${fmtPrice(e.permitPart)}/${unitS}`],
      dutyPart: ['duty part', (e) => `£${fmtPrice(e.dutyPart)}/${unitS}`],
      ps: ['pₛ', (e) => `£${fmtPrice(e.servicePrice)}/${unitS}`],
      m: ['m (your cut)', (e) => pct(e.margin, false)],
      inc: ['income', (e) => `${money(e.income)}/s`],
      levy: ['levies', (e) => `${money(e.levyRevenue)}/s`],
      D: ['D', (e) => `${fmt(e.demand)} ${unitS}/s`],
      R: ['R', (e) => `${fmt(e.resourceUse)} ${unitRs}/s`],
      shadow: ['R shadow', (e) => `${fmt(e.shadowR)} ${unitRs}/s`],
      prom: ['R promised', (e) => `${fmt(e.promisedR)} ${unitRs}/s`],
      rfold: ['R ÷ R₀', (e) => fold(e.rFold)],
      grow: ['growth', (e) => fold(e.frontierFold)],
      rb: ['rebound', (e) => (ctx.state.flags?.revealed ? (e.rebound != null ? pct(e.rebound, false) : '—') : '?')],
      // M3: the mechanics' terms, only where the core reports them (their features on).
      cBase: ['c, plant at full use', (e) => (e.load ? `£${fmtPrice(e.load.capCostBase)}/${unitS}` : '—')],
      cEff: ['c with idle plant', (e) => (e.load ? `£${fmtPrice(e.load.capCostEff)}/${unitS} (load factor ${pct(e.load.factor, false)})` : '—')],
      seam: ['seams', (e) => (e.seams ? `pᵣ ×${e.seams.priceMul.toFixed(2)} (${e.seams.sunk} sunk)` : '—')],
    };
    const pick: Record<FormulaKind, string[]> = {
      eff: ['eta', 'fold', 'pr', 'c', 'ps', 'D', 'R'],
      cons: ['D', 'sigma', 'eta', 'R', 'rfold', 'grow', 'shadow'],
      rebound: ['fold', 'R', 'shadow', 'prom', 'rfold', 'grow', 'rb'],
      price: ['pr', 'permit', 'eta', 'c', 'sigma', 'pre', 'permitPart', 'dutyPart', 'ps', 'm', 'D', 'inc', 'levy'],
    };
    if (!revealed) pick.cons = pick.cons.filter((k) => k !== 'grow' && k !== 'shadow');
    // The unfolding: levies and permits are named once the player has met them (levers; the budget's caps).
    const f = ctx.d?.features;
    if (kind === 'price' && !f?.levers) {
      lines.price = [lines.price[0].replace('p before levies', 'pₛ'), 'income = m × pₛ × D'];
      pick.price = ['pr', 'eta', 'c', 'ps', 'm', 'D', 'inc'];
      notes.price = 'A thriftier engine makes the service cheaper. Cheaper service sells more of it.';
    } else if (kind === 'price' && !f?.budget) {
      lines.price[1] = 'pₛ = p before levies + duty part';
      pick.price = pick.price.filter((k) => k !== 'permit' && k !== 'permitPart');
    }
    if (!f?.moreLevers && kind === 'cons') pick.cons = pick.cons.filter((k) => k !== 'sigma');
    const e0 = sd(ctx);
    if (kind === 'price' && e0?.load) { pick.price.splice(pick.price.indexOf('c') + 1, 0, 'cBase', 'cEff'); lines.price.push('c with idle plant = c × ((1 − k) + k ÷ load factor)'); }
    if (kind === 'price' && e0?.seams) { pick.price.splice(1, 0, 'seam'); }
    b.append(h('div', { class: 'formula' }, ...lines[kind].map((l) => h('div', { class: 'f-line', text: l }))));
    const rows = pick[kind].map((k) => { const v = h('dd', { class: 'num' }); return { v, row: R[k] }; });
    const dl = h('dl', { class: 'f-vals' });
    for (const r of rows) dl.append(h('div', null, h('dt', { text: r.row[0] }), r.v));
    b.append(dl, h('p', { class: 'f-note', text: notes[kind] }));
    return () => {
      const e = sd(ctx);
      if (!e) return;
      for (const r of rows) setText(r.v, r.row[1](e));
    };
  }, { label: `${label}: the working`, cls: 'small-sheet' });
}

/* ------------------------------------------------------------------ */
/* Hindsight terms (Reckoning card, confirm, summary)                  */
/* ------------------------------------------------------------------ */

function termsLedger(ctx: Ctx, get: () => HindsightTerms | null | undefined): { el: HTMLElement; update(): void } {
  const stock = sectorIds(ctx.content).map((id) => sectorDef(ctx, id)).filter((d) => d && d.resourceKind === 'stock');
  const unburntName = stock.length === 1 ? `${stock[0]!.resource.name} left unburnt` : 'Left unburnt';
  const rows: [keyof HindsightTerms, string][] = [
    ['wellbeing', 'Wellbeing per ton'], ['budget', 'Decades in budget'], ['unburnt', unburntName],
    ['backfire', 'First backfire'], ['sectorsReached', 'Industries reached'], ['steady', 'Steady State'], ['settled', 'Industries settled'],
  ];
  const cells = rows.map(([k, l]) => ({ k, row: h('div', { class: 'tl-row' }), l, v: h('span', { class: 'tl-v num' }), sub: h('span', { class: 'tl-sub num' }) }));
  // A term the player has not met yet is not shown (the unfolding: Derived.features).
  const needs: Partial<Record<keyof HindsightTerms, FeatureId>> = { budget: 'budget', steady: 'steadyState', settled: 'settlement' };
  for (const c of cells) c.row.append(h('span', { class: 'tl-l' }, c.l, c.sub), c.v);
  const tot = h('span', { class: 'tl-v num' });
  // Shown only after time away: Hindsight is entered at a reduced rate in the proprietor's absence (HindsightTerms.withheld).
  const awayV = h('span', { class: 'tl-v num' });
  const awayRow = h('div', { class: 'tl-row' }, h('span', { class: 'tl-l', text: 'Kept back while away' }), awayV);
  const el = h('div', { class: 'tl', role: 'table', 'aria-label': 'Where the Hindsight comes from' },
    ...cells.map((c) => c.row), awayRow, h('div', { class: 'tl-row tl-tot' }, h('span', { class: 'tl-l', text: 'Hindsight' }), tot));
  return {
    el,
    update() {
      const t = get();
      show(el, !!t);
      if (!t) return;
      for (const c of cells) {
        const v = num(t[c.k]);
        const f = needs[c.k];
        show(c.row, !f || !!ctx.d?.features?.[f] || v > 0);
        setText(c.v, v > 0 ? `+${fmt(Math.round(v * 10) / 10)}` : '—');
        cls(c.row, 'zero', !(v > 0));
      }
      const w = cells[0];
      setText(w.sub, ` ${fmt(Math.round(num(t.wellbeingYears)))} wellbeing-years, burning ${fold(Math.max(1, num(t.intensity, 1)))}`);
      const kept = num(t.withheld);
      show(awayRow, kept > 0);
      if (kept > 0) setText(awayV, `\u2212${fmt(Math.round(kept * 10) / 10)}`);
      setText(tot, fmt(num(t.total)));
    },
  };
}

/* ------------------------------------------------------------------ */
/* Hindsight shop: Know-how trees and the Institution seats            */
/* ------------------------------------------------------------------ */

function treeTitle(ctx: Ctx, tree: string): string {
  const named = ctx.content.knowhowTrees?.[tree]?.name;
  if (named) return named;
  const s = ctx.content.sectors?.[tree];
  if (s) return s.name;
  if (tree === 'general') return 'General';
  return tree.charAt(0).toUpperCase() + tree.slice(1);
}

/**
 * A folding section remembered in the UI preferences (prefs.open[key]): a native <details>, so it opens from the
 * keyboard and is announced as such. The summary's text is set by the caller.
 */
export function foldSection(key: string, cls0: string, dflt = false): { el: HTMLDetailsElement; sum: HTMLElement; body: HTMLElement } {
  const sum = h('summary', { class: 'fold-s' });
  const body = h('div', { class: 'fold-b' });
  const el = h('details', { class: 'fold ' + cls0 }, sum, body) as HTMLDetailsElement;
  el.open = isOpen(key, dflt);
  el.addEventListener('toggle', () => setOpen(key, el.open));
  return { el, sum, body };
}

/**
 * The Hindsight shop. Laid out for the least scrolling (owner's direction, 19 Nov 2026):
 *   - the seats first: what is seated, each with Unseat, and the owned Institutions not seated one tap away;
 *   - Know-how: trees whose rows still hold something to learn, nodes the player can afford first within each row, a
 *     row that is not open yet folded to one dim line, an arm ruled out by a fork shrunk to its name; then "Owned" at
 *     the end, folded, with every node learnt to its last level (a fork: the arm taken, and the one it ruled out);
 *   - Institutions: those that can be bought now first, then those that can be bought later, those that need another
 *     Institution first folded to one line, and "Owned" (every level founded) folded at the end, with Seat and Unseat.
 * Structure is built once per opening; a purchase or a seat moves cards between places (syncChildren on a layout key)
 * and every number is patched in place.
 */
export function buildShop(ctx: Ctx, host: HTMLElement, lead?: HTMLElement): () => void {
  const bal = h('span', { class: 'num' });
  const ro = h('p', { class: 'shop-ro' }, 'Read-only for now. Hindsight is spent and seats are changed between runs, after a Reckoning.');
  host.append(h('p', { class: 'shop-bal' }, h('span', { class: 'muted', text: 'Hindsight to spend ' }), bal), ro);
  if (lead) host.append(lead);
  const items: (() => void)[] = [];
  const kh = h('section', { class: 'shop-col kh' }, h('h3', { text: 'Know-how' }), h('p', { class: 'shop-k', text: 'The obvious buy. Runs start faster, and reach the wall sooner.' }));
  // Respec (Derived.respec): "Unlearn" per tree and for all, between runs only, each behind a confirm with the refund.
  const unlearn = (tree: string | undefined, label: string): { el: HTMLElement; update(): void } => {
    const q = h('p');
    const box = h('div', { class: 'confirm-box', hidden: true }, q, h('div', { class: 'm-row' },
      h('button', { class: 'btn danger', type: 'button', onclick: () => { show(box, false); show(ask, true); ctx.act('respecKnowhow', (m, s, ct) => m.respecKnowhow(s, ct, tree)); } }, 'Unlearn it'),
      h('button', { class: 'btn', type: 'button', onclick: () => { show(box, false); show(ask, true); ask.focus(); } }, 'Keep it')));
    const ask = h('button', { class: 'btn small linkish unlearn', type: 'button', onclick: () => { show(ask, false); show(box, true); (box.querySelector('button') as HTMLButtonElement | null)?.focus(); } }, label);
    const el = h('div', { class: 'unlearn-w' }, ask, box);
    return {
      el,
      update() {
        const r = ctx.d?.respec;
        const amt = tree == null ? num(r?.refund) : num(r?.refundByTree?.[tree]);
        const ok = !!r?.allowed && amt > 0;
        show(el, ok);
        if (!ok) { show(box, false); show(ask, true); return; }
        setText(q, `${tree == null ? 'Unlearn all Know-how' : `Unlearn ${treeTitle(ctx, tree)}`}? ${fmt(Math.floor(amt))} Hindsight comes back to spend again. What a level gave once (a seat) is not given twice.`);
      },
    };
  };
  const inst = h('section', { class: 'shop-col inst' }, h('h3', { text: 'Institutions' }), h('p', { class: 'shop-k', text: 'The slow buy. Only seated Institutions act.' }));

  const khView = (id: string): KnowhowView | undefined => (ctx.khs || []).find((v) => v.def.id === id);
  const inView = (id: string): InstitutionView | undefined => (ctx.insts || []).find((v) => v.def.id === id);
  const khName = (id: string | null) => (id ? ctx.content.knowhow.find((k) => k.id === id)?.name ?? id : '');
  const instName = (id: string) => ctx.content.institutions.find((x) => x.id === id)?.name ?? id;
  // What the player has met (QA B30, the unfolding): Know-how and Institutions for Industries never opened, or for
  // systems not yet arrived, are not listed. Display only: read from the effects and Derived.features.
  const seenSector = (id: string) => !!ctx.state.meta?.sectorsOpened?.[id] || !!ctx.state.sectors?.[id]?.open;
  const leverDef = (id: string) => ctx.content.levers?.find((l) => l.id === id);
  const effMet = (effects: EffectDef[] | undefined): boolean => (effects || []).every((e) => {
    const sec = (e as { sector?: string }).sector;
    if (sec && !seenSector(sec)) return false;
    const f = ctx.d?.features;
    if (e.type === 'startLever') {
      const l = leverDef(e.lever);
      if (l && !seenSector(l.sector)) return false;
      if (l?.requires?.some((r) => (FEATURE_IDS as readonly string[]).includes(r) && !f?.[r as FeatureId])) return false;
    }
    if (e.type === 'orderUnlock') return e.order === 'treasury' ? !!f?.commons : e.order === 'civilService' ? !!f?.budget : !!f?.market;
    if (e.type === 'commonsYieldMul') return !!f?.commons;
    return true;
  });

  /* ---------------- Know-how ---------------- */
  interface Arm { id: string; card: HTMLElement; row: HTMLElement }
  interface Group { arms: Arm[]; el: HTMLElement }
  interface Tier { tier: number; groups: Group[]; rowEl: HTMLElement; line: ReturnType<typeof foldSection> }
  interface Tree { id: string; el: HTMLElement; tiers: Tier[]; ownHead: HTMLElement }
  const defs = ctx.content.knowhow || [];
  const treeIds: string[] = [];
  for (const k of defs) { const t = k.tree ?? 'general'; if (!treeIds.includes(t)) treeIds.push(t); }
  const treeList = h('div', { class: 'trees' });
  const khOwn = foldSection('shop.khOwned', 'own kh-own');
  const allU = unlearn(undefined, 'Unlearn everything');
  items.push(() => allU.update());
  const trees: Tree[] = [];
  for (const t of treeIds) {
    const nodes = defs.filter((k) => (k.tree ?? 'general') === t);
    const tierNums = [...new Set(nodes.map((k) => k.tier ?? 1))].sort((a, b) => a - b);
    const tu = unlearn(t, 'Unlearn');
    const tu2 = unlearn(t, `Unlearn ${treeTitle(ctx, t)}`);
    items.push(() => { tu.update(); tu2.update(); });
    const treeEl = h('div', { class: 'tree' }, h('div', { class: 'tree-h' }, h('h4', { class: 'tree-t', text: treeTitle(ctx, t) }), tu.el));
    const ownHead = h('div', { class: 'own-h' }, h('span', { class: 'own-ht', text: treeTitle(ctx, t) }), tu2.el);
    const tiers: Tier[] = [];
    for (const tier of tierNums) {
      const rowEl = h('div', { class: 'tree-row', 'data-tier': String(tier) });
      const line = foldSection(`shop.tier.${t}.${tier}`, 'tier-line');
      const inTier = nodes.filter((k) => (k.tier ?? 1) === tier);
      const done = new Set<string>();
      const groups: Group[] = [];
      for (const k of inTier) {
        if (done.has(k.id)) continue;
        const armDefs = k.branch ? inTier.filter((o) => o.branch === k.branch) : [k];
        armDefs.forEach((a) => done.add(a.id));
        const group = h('div', { class: armDefs.length > 1 ? 'kh-fork' : 'kh-single' });
        const arms: Arm[] = [];
        armDefs.forEach((a, i) => {
          if (i) group.append(h('span', { class: 'fork-or', 'aria-hidden': 'true', text: 'or' }));
          const lvl = h('span', { class: 'num muted' });
          const note = h('p', { class: 'kh-note' });
          const c = h('span', { class: 'btn-c num' });
          const bl = h('span', { class: 'btn-l', text: 'Learn' });
          const b = h('button', { class: 'btn small', type: 'button', onclick: () => {
            if (khView(a.id)?.canBuy) ctx.act('buyKnowhow', (m, s, ct) => m.buyKnowhow(s, ct, a.id));
          } }, bl, c);
          const eff = (a.effects || []).map((e) => effectText(ctx, e)).filter(Boolean).join(' · ');
          const card = h('article', { class: 'kh-node' }, h('header', null, h('h5', { text: a.name }), lvl),
            h('p', { class: 'shop-eff', text: eff + (a.maxLevel > 1 ? ', per level' : '') }), h('p', { class: 'shop-blurb', text: a.blurb }), note, b);
          group.append(card);
          // The compact row in "Owned": name, level, and the arm it ruled out.
          const rLvl = h('span', { class: 'num muted' });
          const rNot = h('span', { class: 'own-not' });
          const row = h('li', { class: 'own-row' }, h('span', { class: 'own-n' }, h('span', { text: a.name }), rNot), rLvl);
          arms.push({ id: a.id, card, row });
          items.push(() => {
            const v = khView(a.id);
            const level = num(v?.level);
            setText(lvl, `${level}/${a.maxLevel}`);
            setText(rLvl, `${level}/${a.maxLevel}`);
            const excluded = !!v?.excludedBy;
            const locked = !!v && !v.requirementsMet;
            cls(card, 'owned', level > 0);
            cls(card, 'excluded', excluded);
            cls(card, 'compact', excluded);
            cls(card, 'locked', locked && !excluded);
            cls(card, 'afford', !!v?.affordable && !locked && !excluded);
            setText(note, excluded ? `Ruled out by ${khName(v!.excludedBy)}` : locked ? `Opens once a row ${tier - 1} node is learnt` : '');
            show(note, !!note.textContent);
            setText(bl, v?.maxed ? 'Learnt' : 'Learn');
            setText(c, v?.maxed || v?.cost == null ? '' : `${fmt(Math.ceil(v.cost))} H`);
            show(b, !excluded);
            setAttr(b, 'aria-disabled', v?.canBuy ? null : 'true');
            const others = armDefs.filter((o) => o.id !== a.id).map((o) => o.name);
            setText(rNot, others.length ? ` · not ${others.map((n) => lower(n)).join(' or ')}` : '');
          });
        });
        groups.push({ arms, el: group });
      }
      tiers.push({ tier, groups, rowEl, line });
    }
    trees.push({ id: t, el: treeEl, tiers, ownHead });
  }
  kh.append(treeList, khOwn.el);
  let khKey = '';
  items.push(() => {
    const v = (id: string) => khView(id);
    const groupDone = (g: Group) => g.arms.some((a) => v(a.id)?.maxed) && g.arms.every((a) => v(a.id)?.maxed || !!v(a.id)?.excludedBy);
    const groupOpen = (g: Group) => g.arms.some((a) => v(a.id)?.requirementsMet);
    const groupAfford = (g: Group) => g.arms.some((a) => { const x = v(a.id); return !!x && x.affordable && x.requirementsMet && !x.excludedBy && !x.maxed; });
    // Layout: per tree, per row, which groups are shown (affordable first), which rows fold, which nodes are owned.
    const met = (g: Group) => g.arms.some((a) => effMet(defs.find((k) => k.id === a.id)?.effects) || num(v(a.id)?.level) > 0);
    const plan = trees.map((tr) => {
      const tiers = tr.tiers.map((ti) => {
        const live = ti.groups.filter((g) => !groupDone(g) && met(g));
        const open = live.length > 0 && groupOpen(live[0]);
        const sorted = open ? [...live.filter(groupAfford), ...live.filter((g) => !groupAfford(g))] : live;
        return { ti, live: sorted, open };
      });
      const owned = tr.tiers.flatMap((ti) => ti.groups.filter(groupDone));
      const afford = tiers.some((x) => x.open && x.live.some(groupAfford));
      return { tr, tiers, owned, afford, any: tiers.some((x) => x.live.length > 0) };
    });
    const order = [...plan.filter((p) => p.afford), ...plan.filter((p) => !p.afford)];
    const key = order.map((p) => p.tr.id + ':' + p.tiers.map((x) => `${x.open ? 'o' : 'l'}${x.live.map((g) => g.arms[0].id).join('+')}`).join('/') + '|' + p.owned.map((g) => g.arms[0].id).join('+')).join(';');
    let nOwned = 0;
    for (const p of plan) for (const g of p.owned) nOwned += g.arms.filter((a) => v(a.id)?.maxed).length;
    if (key !== khKey) {
      khKey = key;
      syncChildren(treeList, order.filter((p) => p.any).map((p) => {
        const kids: HTMLElement[] = [p.tr.el.firstElementChild as HTMLElement];
        for (const x of p.tiers) {
          if (!x.live.length) continue;
          syncChildren(x.ti.rowEl, x.live.map((g) => g.el));
          if (x.open) kids.push(x.ti.rowEl);
          else {
            // A row not open yet: one dim line; open it to read what is in it.
            const n = x.live.reduce((a, g) => a + g.arms.length, 0);
            setText(x.ti.line.sum, `Row ${x.ti.tier}: ${n} to learn, once a row ${x.ti.tier - 1} node is learnt`);
            syncChildren(x.ti.line.body, [x.ti.rowEl]);
            kids.push(x.ti.line.el);
          }
        }
        syncChildren(p.tr.el, kids);
        return p.tr.el;
      }));
      const ownKids: HTMLElement[] = [];
      for (const p of plan) {
        if (!p.owned.length) continue;
        ownKids.push(p.tr.ownHead);
        ownKids.push(h('ul', { class: 'own-list' }, ...p.owned.map((g) => g.arms.find((a) => v(a.id)?.maxed)!.row)));
      }
      ownKids.push(allU.el);
      syncChildren(khOwn.body, ownKids);
    }
    setText(khOwn.sum, `Owned, ${nOwned}`);
    show(khOwn.el, nOwned > 0);
    // "Unlearn everything" sits in Owned while anything is learnt to the full; at the top of the trees otherwise.
    if (nOwned === 0 && allU.el.parentElement !== kh) kh.insertBefore(allU.el, treeList);
  });

  /* ---------------- Seats ---------------- */
  // One box per seat; a seated institution fills as many seats as it occupies. The owned Institutions not seated are
  // one tap away underneath, each with Seat.
  const seatTxt = h('p', { class: 'seat-txt num' });
  const seats = h('div', { class: 'seats', role: 'list', 'aria-label': 'Institution seats' });
  const pick = foldSection('shop.seatPick', 'seat-more');
  const pickList = h('ul', { class: 'own-list seat-pick' });
  pick.body.append(pickList);
  const seatBox = h('section', { class: 'shop-seats' }, h('h3', { class: 'seats-t', text: 'Seats' }), seatTxt, seats, pick.el);
  let seatKey = '';
  const seatEls = new Map<string, { el: HTMLElement; b: HTMLButtonElement }>();
  const loadout = () => (Array.isArray(ctx.state.meta?.loadout) ? ctx.state.meta.loadout : []);
  const setLoadout = (ids: string[]) => ctx.act('setLoadout', (m, s, ct) => m.setLoadout(s, ct, ids));
  const toggleSeat = (id: string) => {
    const v = inView(id);
    if (!v || !ctx.d?.freshRun) return;
    if (v.seated) setLoadout(loadout().filter((o) => o !== id));
    else if (v.canSeat) setLoadout([...loadout(), id]);
  };
  function seatFor(id: string) {
    let x = seatEls.get(id);
    if (!x) {
      const b = h('button', { class: 'btn small', type: 'button', onclick: () => { if (ctx.d?.freshRun) setLoadout(loadout().filter((o) => o !== id)); } }, 'Unseat');
      const el = h('div', { class: 'seat full', role: 'listitem' }, h('span', { class: 'seat-n', text: instName(id) }), b);
      x = { el, b };
      seatEls.set(id, x);
    }
    return x;
  }
  /** A compact Institution row (name, level, Seat or Unseat), used under the seats and in "Owned". */
  const instRows = new Map<string, { row: HTMLElement; row2: HTMLElement; up(): void }>();
  function instRow(id: string) {
    let x = instRows.get(id);
    if (!x) {
      const d = ctx.content.institutions.find((i) => i.id === id);
      const mk = () => {
        const lv = h('span', { class: 'num muted' });
        const b = h('button', { class: 'btn small seat-b', type: 'button', onclick: () => toggleSeat(id) });
        const row = h('li', { class: 'own-row' }, h('span', { class: 'own-n' }, h('span', { class: 'own-nm', text: d?.name ?? id })), lv, b);
        return { row, up: () => {
          const v = inView(id);
          const max = num(v?.maxLevel, 1), level = num(v?.level);
          setText(lv, max > 1 ? `${level}/${max}` : '');
          setText(b, v?.seated ? 'Unseat' : 'Seat');
          setAttr(b, 'aria-disabled', (v?.seated ? !!ctx.d?.freshRun : !!v?.canSeat) ? null : 'true');
          setAttr(b, 'title', !v?.seated && ctx.d?.freshRun && !v?.canSeat ? 'No free seat' : null);
          cls(row, 'seated', !!v?.seated);
        } };
      };
      const a = mk(), c = mk();
      x = { row: a.row, row2: c.row, up: () => { a.up(); c.up(); } };
      instRows.set(id, x);
      items.push(x.up);
    }
    return x;
  }
  items.push(() => {
    const total = num(ctx.d?.slots?.total), used = num(ctx.d?.slots?.used);
    setText(seatTxt, `${used} of ${total} in use`);
    const lo = loadout();
    const spare = (ctx.insts || []).filter((v) => v.level > 0 && !v.seated).map((v) => v.def.id);
    const k = lo.join(',') + '|' + total + '|' + used + '|' + spare.join(',');
    if (k !== seatKey) {
      seatKey = k;
      const nodes: HTMLElement[] = [];
      for (const id of lo) {
        const x = seatFor(id);
        x.el.style.setProperty('--span', String(Math.max(1, num(inView(id)?.slots, 1))));
        nodes.push(x.el);
      }
      for (let i = used; i < total; i++) nodes.push(h('div', { class: 'seat empty', role: 'listitem', text: 'Empty seat' }));
      syncChildren(seats, nodes);
      syncChildren(pickList, spare.map((id) => instRow(id).row));
      setText(pick.sum, `Owned, not seated: ${spare.length}`);
    }
    show(pick.el, spare.length > 0);
    show(seatBox, total > 0 || lo.length > 0);
    for (const id of lo) setAttr(seatFor(id).b, 'aria-disabled', ctx.d?.freshRun ? null : 'true');
  });

  /* ---------------- Institutions ---------------- */
  const instList = h('div', { class: 'inst-list' });
  const instLocked = foldSection('shop.instLocked', 'tier-line inst-locked');
  const instOwn = foldSection('shop.instOwned', 'own inst-own');
  const instOwnList = h('ul', { class: 'own-list' });
  instOwn.body.append(instOwnList);
  inst.append(instList, instLocked.el, instOwn.el);
  const cards = new Map<string, HTMLElement>();
  for (const d of ctx.content.institutions || []) {
    const lvl = h('span', { class: 'num muted' });
    const req = h('p', { class: 'shop-req' });
    const nextEff = h('p', { class: 'shop-eff' });
    const c = h('span', { class: 'btn-c num' });
    const bl = h('span', { class: 'btn-l' });
    const buy = h('button', { class: 'btn small', type: 'button', onclick: () => { if (inView(d.id)?.canBuy) ctx.act('buyInstitution', (m, s, ct) => m.buyInstitution(s, ct, d.id)); } }, bl, c);
    const seat = h('button', { class: 'btn small seat-b', type: 'button', onclick: () => toggleSeat(d.id) });
    const slots = d.slots ?? 1;
    const card = h('article', { class: 'shop-item' },
      h('header', null, h('h4', { text: d.name }), lvl), h('p', { class: 'shop-blurb', text: d.blurb + (slots > 1 ? ` Takes ${slots} seats.` : '') }),
      nextEff, req, h('div', { class: 'm-row' }, buy, seat));
    cards.set(d.id, card);
    items.push(() => {
      const v = inView(d.id);
      const level = num(v?.level), max = num(v?.maxLevel, 1);
      setText(lvl, max > 1 ? `${level}/${max}` : level ? 'Founded' : '');
      const missing = (d.requires || []).filter((r) => !(num(ctx.state.meta?.institutions?.[r]) >= 1));
      setText(req, !v?.requirementsMet && missing.length ? `Needs: ${missing.map(instName).join(', ')}` : '');
      show(req, !!req.textContent);
      const nl = level === 0 ? { effects: d.effects, label: undefined as string | undefined } : d.nextLevels?.[level - 1];
      const effTxt = nl ? (nl.label ?? nl.effects.map((e) => effectText(ctx, e)).filter(Boolean).join(' · ')) : '';
      setText(nextEff, level >= max ? (d.nextLevels?.length ? 'Every level founded.' : d.effects.map((e) => effectText(ctx, e)).filter(Boolean).join(' · ')) : (level ? `Level ${level + 1}: ` : '') + effTxt);
      setText(bl, level >= max ? (max > 1 ? 'All levels' : 'Founded') : level === 0 ? 'Found' : `Level ${level + 1}`);
      setText(c, v?.nextCost != null ? `${fmt(Math.ceil(v.nextCost))} H` : '');
      setAttr(buy, 'aria-disabled', v?.canBuy ? null : 'true');
      show(buy, level < max);
      show(seat, level > 0);
      setText(seat, v?.seated ? 'Unseat' : 'Seat');
      setAttr(seat, 'aria-disabled', (v?.seated ? !!ctx.d?.freshRun : !!v?.canSeat) ? null : 'true');
      setAttr(seat, 'title', !v?.seated && level > 0 && ctx.d?.freshRun && !v?.canSeat ? 'No free seat' : null);
      cls(card, 'owned', level > 0);
      cls(card, 'seated', !!v?.seated);
      cls(card, 'compact', !v?.requirementsMet && level === 0);
      cls(card, 'afford', !!v?.affordable && !!v?.requirementsMet && level < max);
      // Out of reach for now: the name, the next level's effect and the price; the blurb waits until it is affordable.
      cls(card, 'later', !!v?.requirementsMet && !v?.affordable && level < max);
    });
  }
  let instKey = '';
  items.push(() => {
    const vs = (ctx.content.institutions || []).map((d) => ({ d, v: inView(d.id) }))
      .filter((x) => num(x.v?.level) > 0 || effMet([...(x.d.effects || []), ...(x.d.nextLevels?.[0]?.effects || [])]));
    const owned = vs.filter((x) => x.v && x.v.level >= x.v.maxLevel);
    const live = vs.filter((x) => !(x.v && x.v.level >= x.v.maxLevel));
    const open = live.filter((x) => x.v?.requirementsMet);
    const shut = live.filter((x) => !x.v?.requirementsMet);
    const sorted = [...open.filter((x) => x.v?.affordable), ...open.filter((x) => !x.v?.affordable)];
    const key = sorted.map((x) => x.d.id).join(',') + '|' + shut.map((x) => x.d.id).join(',') + '|' + owned.map((x) => x.d.id).join(',');
    if (key !== instKey) {
      instKey = key;
      syncChildren(instList, sorted.map((x) => cards.get(x.d.id)!));
      syncChildren(instLocked.body, shut.map((x) => cards.get(x.d.id)!));
      syncChildren(instOwnList, owned.map((x) => instRow(x.d.id).row2));
      setText(instLocked.sum, `Needs another Institution first: ${shut.length}`);
      setText(instOwn.sum, `Owned, ${owned.length}`);
    }
    show(instLocked.el, shut.length > 0);
    show(instOwn.el, owned.length > 0);
  });

  host.append(seatBox, h('div', { class: 'shop-cols' }, kh, inst));
  return () => {
    setText(bal, fmt(Math.floor(num(ctx.state.meta?.hindsight))));
    show(ro, !ctx.d?.freshRun);
    cls(host, 'read-only', !ctx.d?.freshRun);
    for (const u of items) u();
  };
}

export function shopSheet(ctx: Ctx, sheets: Sheets, after?: () => void, summary?: () => void): void {
  sheets.open('shop', (b, close) => {
    // Between runs, the last run's summary (its replay and picture) stays one tap away (QA B36).
    if (after && summary) b.append(h('p', { class: 'shop-back' }, h('button', { class: 'linkish', type: 'button', onclick: summary }, '← The last run’s summary, its replay and picture')));
    // Between runs the Charter (a choice for the run about to begin) leads, above the seats and the shop.
    const ch = after ? charterChoice(ctx) : null;
    const hs = after ? historyPicker(ctx) : null;
    const lead = ch && hs ? h('div', { class: 'between-lead' }, ch.el, hs.el) : ch?.el;
    const u = buildShop(ctx, b, lead);
    if (after) b.append(h('div', { class: 'sheet-foot sticky-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); after(); } }, 'Begin the next run')));
    return () => { u(); ch?.update(); hs?.update(); };
  }, { label: 'Hindsight', cls: 'shop-sheet' + (after ? ' full-ish' : ''), blocking: !!after, dismissable: !after });
}

/* ------------------------------------------------------------------ */
/* The locked industry                                                 */
/* ------------------------------------------------------------------ */

export function lockedSheet(ctx: Ctx, sheets: Sheets, id: SectorId): void {
  const def = sectorDef(ctx, id);
  sheets.open('locked', (b) => {
    const age = ageOfSector(ctx.content, id);
    b.append(h('p', { class: 'lk-tag' }, h('b', { text: `${def?.name ?? id}, ${def?.years ?? ''}. ` }), def?.tagline ?? ''));
    if (age) b.append(h('p', { class: 'muted small', text: `Part of ${age.name}.` }));
    const list = h('ul', { class: 'check' });
    const rk = h('p', { class: 'check-rk num' });
    const ready = h('p', { class: 'check-ready', text: 'Everything is in place: it opens in a moment.' });
    b.append(h('h3', { class: 'check-h', text: 'Opens when' }), list, rk, ready);
    let key = '';
    let rows: { li: HTMLElement; fill: HTMLElement; pc: HTMLElement }[] = [];
    return () => {
      const n = (ctx.d?.nextSectors || []).find((x) => x.id === id);
      const checks = n?.checklist ?? [];
      const k = checks.map((c) => c.label).join('|');
      if (k !== key) {
        key = k;
        rows = checks.map((c) => {
          const fill = h('span', {});
          const pc = h('span', { class: 'num check-pc' });
          const li = h('li', null, h('span', { class: 'check-box', 'aria-hidden': 'true' }), h('span', { class: 'check-l', text: c.label }), pc, h('span', { class: 'check-bar', 'aria-hidden': 'true' }, fill));
          return { li, fill, pc };
        });
        list.replaceChildren(...rows.map((r) => r.li));
        if (!checks.length) list.replaceChildren(h('li', { class: 'muted', text: n ? 'Nothing but time.' : 'It is already open, or not next in line.' }));
      }
      checks.forEach((c, i) => {
        const r = rows[i]; if (!r) return;
        cls(r.li, 'met', c.met);
        const p = c.progress;
        const showBar = !c.met && p != null && p > 0 && p < 1;
        show(r.fill.parentElement as HTMLElement, showBar);
        setStyle(r.fill, 'width', (clamp(num(p), 0, 1) * 100).toFixed(1) + '%');
        setText(r.pc, showBar ? pct(num(p), false) : '');
        setAttr(r.li, 'aria-label', `${c.label}: ${c.met ? 'done' : showBar ? pct(num(p), false) + ' of the way' : 'not yet'}`);
      });
      const need = num(n?.reckoningsNeeded), have = num(n?.reckoningsHave);
      setText(rk, `Reckonings: ${Math.min(have, need)} of ${need}`);
      show(rk, need > 0);
      cls(rk, 'met', have >= need);
      show(ready, !!n?.ready);
    };
  }, { label: `${def?.name ?? 'An Industry'}, locked`, cls: 'small-sheet' });
}

/* ------------------------------------------------------------------ */
/* The Reckoning                                                       */
/* ------------------------------------------------------------------ */

const CAUSE: Record<string, { exhausted: string; collapse: string }> = {
  steam: { exhausted: 'The seams are spent', collapse: 'The air gives out' },
  light: { exhausted: 'The gasworks go dark', collapse: 'A fog that will not lift' },
  motion: { exhausted: 'The pumps run dry', collapse: 'The sky is full' },
  compute: { exhausted: 'The grid says no', collapse: 'The heat has nowhere to go' },
  code: { exhausted: 'Nobody has the attention left', collapse: 'Nobody can read it any more' },
};

function causeHeadline(ctx: Ctx, cause: ReckoningCause, sector?: SectorId): string {
  if (cause === 'chosen') return 'The books are closed';
  const def = sector ? sectorDef(ctx, sector) : undefined;
  const c = sector ? CAUSE[sector] : undefined;
  if (c) return c[cause];
  return cause === 'exhausted' ? `No ${lower(def?.resource.name ?? 'fuel')} left` : `${def?.pressure.name ?? 'Pressure'} past bearing`;
}

export function pendingSheet(ctx: Ctx, sheets: Sheets, onFaced: () => void): void {
  const p = ctx.d?.pendingReckoning;
  if (!p) return;
  const def = p.sector ? sectorDef(ctx, p.sector) : undefined;
  sheets.open('pending', (b) => {
    const yr = Math.floor(num(ctx.d?.year, 1780));
    const stand = p.cause === 'exhausted'
      ? `The last of the ${lower(def?.resource.name ?? 'reserve')} went in ${yr}, after ${dur(ctx.state.time)} of improvement. Everything that used it is more efficient than it has ever been.`
      : `${def?.pressure.crisisName ?? 'The crisis'}, and this time it does not lift. ${yr}, after ${dur(ctx.state.time)} of improvement.`;
    const tl = termsLedger(ctx, () => ctx.d?.hindsightTerms);
    b.append(
      h('div', { class: 'paper' },
        h('div', { class: 'paper-mast' }, h('span', { text: 'Special edition' }), h('span', { class: 'num', text: String(yr) })),
        h('h1', { class: 'paper-head', text: causeHeadline(ctx, p.cause, p.sector) }),
        h('p', { class: 'paper-stand', text: stand }),
        h('h3', { class: 'paper-sub', text: 'What the books will show' }), tl.el),
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary big', type: 'button', onclick: onFaced }, 'Face the Reckoning')));
    return () => tl.update();
  }, { label: 'The Reckoning', full: true, blocking: true, dismissable: false, cls: 'reckon-sheet pending-sheet' });
}

/** The Charter choice between runs: two cards from Derived.charterOffer and "none" as a quiet third. */
export function charterChoice(ctx: Ctx): { el: HTMLElement; update(): void } {
  const list = h('div', { class: 'ch-list', role: 'radiogroup', 'aria-label': 'A Charter for the next run' });
  const el = h('section', { class: 'charters', hidden: true },
    h('h3', { class: 'paper-sub', text: 'A Charter for the next run' }),
    h('p', { class: 'muted small', text: 'One starting situation, mild and in force all run. Or none.' }), list);
  let key = '';
  const btns: { id: string | null; b: HTMLButtonElement }[] = [];
  function update(): void {
    const offer = (ctx.d?.charterOffer || []).filter((id) => (ctx.content.charters || []).some((c) => c.id === id));
    show(el, offer.length > 0 && !!ctx.d?.freshRun);
    const k = offer.join(',');
    if (k !== key) {
      key = k;
      btns.length = 0;
      const mk = (id: string | null) => {
        const c = id ? ctx.content.charters?.find((x) => x.id === id) : undefined;
        const sec = c?.sector ? sectorDef(ctx, c.sector)?.name : undefined;
        const fx = (c?.effects || []).map((e) => effectText(ctx, e)).filter(Boolean).join(' · ');
        const b = h('button', { class: id ? 'ch-card' : 'ch-none', type: 'button', role: 'radio', 'aria-checked': 'false',
          onclick: () => ctx.act('chooseCharter', (m, s, ct) => m.chooseCharter(s, ct, id)) },
          id ? h('span', { class: 'ch-k', text: sec ?? 'For the whole run' }) : null,
          h('span', { class: 'ch-n', text: c?.name ?? 'No Charter' }),
          c?.blurb ? h('span', { class: 'ch-b', text: c.blurb }) : null,
          fx ? h('span', { class: 'ch-fx num', text: fx }) : null);
        btns.push({ id, b });
        return b;
      };
      list.replaceChildren(...offer.map(mk), mk(null));
    }
    const cur = ctx.d?.charter ?? null;
    for (const { id, b } of btns) { const on = id === cur; setAttr(b, 'aria-checked', String(on)); cls(b, 'on', on); }
  }
  return { el, update };
}

export function summarySheet(ctx: Ctx, sheets: Sheets, onDone: () => void, exportText?: () => string, lapse?: Lapse | null, toShop?: () => void): void {
  const lr = ctx.state.meta?.lastRun;
  const ch = charterChoice(ctx);
  const hs = historyPicker(ctx);
  sheets.open('summary', (b, close) => {
    if (!lr) { b.append(h('p', { text: 'The books are closed.' })); }
    else {
      const ids = sectorIds(ctx.content).filter((id) => lr.sectors?.[id]);
      let mx = 2;
      for (const id of ids) { const r = lr.sectors[id]; mx = Math.max(mx, num(r.etaFold, 1), num(r.peakRFold, 1)); }
      const w = (x: number) => (clamp((Math.log2(Math.max(1, num(x, 1))) + 0.35) / (Math.log2(mx) + 0.35), 0.03, 1) * 100).toFixed(1) + '%';
      const tl = termsLedger(ctx, () => lr.hindsightTerms);
      tl.update();
      b.append(
        h('div', { class: 'paper' },
          h('div', { class: 'paper-mast' }, h('span', { text: 'The year’s accounts' }), h('span', { class: 'num', text: String(Math.floor(num(lr.yearReached, 1780))) })),
          h('h1', { class: 'paper-head', text: causeHeadline(ctx, lr.cause, lr.causeSector) }),
          h('p', { class: 'paper-stand num', text: `${dur(lr.seconds)} of play · peak wellbeing ${fmt(Math.floor(num(lr.peakWellbeing)))}${lr.charter ? ` · under ${ctx.content.charters?.find((c) => c.id === lr.charter)?.name ?? 'a Charter'}` : ''}` }),
          lapseBlock(ctx, lapse ?? null, causeHeadline(ctx, lr.cause, lr.causeSector)),
          h('div', { class: 'acct' }, ...ids.map((id) => {
            const r = lr.sectors[id], def = sectorDef(ctx, id);
            const res = lower(def?.resource.name ?? 'resource');
            const extra: string[] = [];
            if (r.unburnt != null && Number.isFinite(r.unburnt)) extra.push(`${pct(r.unburnt, false)} left unburnt`);
            if (r.decades != null && (num(r.decades) > 0 || ctx.d?.features?.budget)) {
              // Lean decades pay no Hindsight unless content says so (QA B28: "14 decades" beside "Decades in budget —").
              const lean = num(r.leanDecades), pays = num(ctx.content.global?.hindsight?.perLeanDecade) > 0;
              const all = lean > 0 && lean === num(r.decades);
              extra.push(`${fmt(r.decades)} decade${r.decades === 1 ? '' : 's'} in budget${lean > 0 && ctx.d?.features?.clearSkies ? `, ${all ? 'all' : fmt(lean)} lean${pays ? '' : ': lean decades pay no Hindsight'}` : ''}`);
            }
            return h('div', { class: 'acct-era' },
              h('h3', { text: `${def?.name ?? id}` }),
              h('div', { class: 'acct-row eff' }, h('span', { class: 'acct-l', text: 'Efficiency' }),
                h('span', { class: 'acct-bar' }, h('span', { style: `width:${w(r.etaFold)}` })), h('span', { class: 'acct-v num', text: fold(r.etaFold) })),
              h('div', { class: 'acct-row use' }, h('span', { class: 'acct-l', text: `Peak ${res} use` }),
                h('span', { class: 'acct-bar' }, h('span', { style: `width:${w(r.peakRFold)}` })), h('span', { class: 'acct-v num', text: fold(r.peakRFold) })),
              h('p', { class: 'acct-tot num', text: [`${fmt(r.resourceUsed)} ${def?.resource.unit ?? ''} used in all`, ...extra].join(' · ') }));
          })),
          ...(lr.hindsightTerms ? [h('h3', { class: 'paper-sub', text: 'Where the Hindsight came from' }), tl.el] : []),
          h('p', { class: 'paper-h big' }, h('span', { class: 'muted', text: 'Hindsight gained ' }), h('b', { class: 'num', text: fmt(num(lr.hindsightGained)) }))));
    }
    b.append(ch.el, hs.el);
    b.append(h('div', { class: 'sheet-foot' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => { toShop?.(); shopSheet(ctx, sheets, onDone, () => summarySheet(ctx, sheets, onDone, exportText, lapse, toShop)); } }, 'Spend Hindsight'),
      h('button', { class: 'btn', type: 'button', onclick: () => { close(); onDone(); } }, 'Begin the next run')));
    // A one-tap copy of the save at the moment it is worth most. Quiet: a text button, never a prompt.
    const dlNote = h('span', { class: 'muted small', 'aria-live': 'polite' });
    if (exportText) b.append(h('p', { class: 'sum-dl' }, h('button', { class: 'linkish', type: 'button', onclick: () => {
      const ok = download(`rebound-reckoning-${num(ctx.state.meta?.reckonings)}.txt`, exportText());
      if (ok) setPrefs({ lastExport: Date.now() });
      setText(dlNote, ok ? ' Downloaded.' : ' Download blocked; the menu has the save as text.');
    } }, 'Download a copy of the save'), dlNote));
    return () => { ch.update(); hs.update(); };
  }, { label: 'Run summary', full: true, blocking: true, dismissable: false, cls: 'reckon-sheet' });
}

export function confirmReckonSheet(ctx: Ctx, sheets: Sheets, onYes: () => void): void {
  sheets.open('confirm', (b, close) => {
    const first = sectorIds(ctx.content)[0];
    const y = first ? ageOfSector(ctx.content, first)?.yearSpan?.[0] ?? 1780 : 1780;
    const tl = termsLedger(ctx, () => ctx.d?.hindsightTerms);
    b.append(h('p', { class: 'confirm-q', text: `Close the books on this run and start again from ${y}?` }), tl.el,
      h('p', { class: 'muted small', text: 'Know-how, Institutions and seats are kept. Capital, improvements and levers are not.' }),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); onYes(); } }, 'Close the books'),
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Not yet')));
    return () => tl.update();
  }, { label: 'Call a Reckoning', cls: 'small-sheet' });
}

export function winSheet(ctx: Ctx, sheets: Sheets): void {
  sheets.open('win', (b, close) => {
    b.append(h('div', { class: 'paper' },
      h('div', { class: 'paper-mast' }, h('span', { text: 'Late final' }), h('span', { class: 'num', text: String(Math.floor(num(ctx.d?.year))) })),
      h('h1', { class: 'paper-head', text: 'Steady State' }),
      h('p', { class: 'paper-stand', text: `${Math.round(num(ctx.d?.ending?.yearsNeeded, STEADY_STATE_YEARS))} years with every Industry settled at its sink line, all at once. Nobody is quite sure when it happened. The engines kept improving; the burning stopped following them.` }),
      h('p', { class: 'muted', text: 'The game carries on. So, presumably, does everyone.' })),
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: close }, 'Carry on')));
  }, { label: 'Credits', full: true, cls: 'reckon-sheet' });
}

/** A stored save that the model could not read: offer it for export before the fresh run overwrites the slot. */
export function unreadSaveSheet(sheets: Sheets, raw: string, backup?: { info: BackupInfo; restore(): boolean }): void {
  sheets.open('unread', (b, close) => {
    if (backup) {
      b.append(h('div', { class: 'confirm-box ok-box' },
        h('p', { text: `A backup from Reckoning ${backup.info.reckonings} (the run had reached ${backup.info.year}) is still here.` }),
        h('div', { class: 'm-row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); backup.restore(); } }, 'Restore the backup'))));
    }
    const status = h('p', { class: 'save-status muted', 'aria-live': 'polite' });
    const ta = h('textarea', { class: 'save-ta', rows: 4, spellcheck: 'false', readonly: true, 'aria-label': 'The unreadable save' }) as HTMLTextAreaElement;
    ta.value = raw;
    b.append(h('p', { text: 'The save in this browser could not be read, so a fresh run has begun. The old text is kept here (and in this browser) in case it can be rescued.' }),
      h('div', { class: 'm-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => setText(status, download('rebound-unreadable-save.txt', raw) ? 'Downloaded.' : 'Download blocked; copy the text instead.') }, 'Download the old save'),
        h('button', { class: 'btn', type: 'button', onclick: async () => { const ok = await copyText(raw); if (!ok) { ta.focus(); ta.select(); } setText(status, ok ? 'Copied.' : 'Select the text and copy it by hand.'); } }, 'Copy it')),
      ta, status,
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: close }, 'Carry on with a fresh run')));
  }, { label: 'The save could not be read', cls: 'small-sheet', dismissable: true });
}

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

export interface BackupInfo { at: number; reckonings: number; year: number }
export interface MenuHooks {
  /** The household survey (the local play ledger): close deletes it and stops; open starts it again, empty. */
  survey: { close(): void; open(): void };
  /** M3: the first ending's credits again. */
  credits?(): void;
  exportText(): string;
  importText(t: string): boolean;
  hardReset(): void;
  /** The rolling backup taken at the last Reckoning, if any. */
  backup(): BackupInfo | null;
  restoreBackup(): boolean;
}

/** The keyboard cheat-sheet (keys.ts implements them). */
export const SHORTCUTS: [string, string][] = [
  ['S', 'Sell'],
  ['B', 'Buy the first affordable improvement in this Industry'],
  ['A', 'Show the first thing affordable'],
  ['1 – 9', 'Switch Industry'],
  ['[  ]', 'Previous or next Industry'],
  ['M', 'Open the menu'],
  ['R', 'Call a Reckoning, once one is on offer'],
  ['Esc', 'Close a sheet'],
  ['?', 'This list'],
];

function daysAgo(ms: number): string {
  const d = Math.floor(Math.max(0, Date.now() - ms) / 86400000);
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

/** A radio group drawn as a segmented control. */
function segmented<T extends string | number>(label: string, opts: [T, string, string?][], get: () => T, set: (v: T) => void): { el: HTMLElement; update(): void } {
  const id = 'seg-' + label.toLowerCase().replace(/\W+/g, '-');
  const btns = opts.map(([v, txt, aria]) => {
    const b = h('button', { class: 'seg-b', type: 'button', role: 'radio', 'aria-checked': 'false', 'aria-label': aria ?? null, onclick: () => { set(v); update(); } }, txt);
    return { v, b };
  });
  const el = h('div', { class: 'setting' }, h('span', { class: 'setting-k', id, text: label }),
    h('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': id }, ...btns.map((x) => x.b)));
  function update(): void { const cur = get(); for (const x of btns) { setAttr(x.b, 'aria-checked', String(x.v === cur)); cls(x.b, 'on', x.v === cur); } }
  update();
  return { el, update };
}

export function menuSheet(ctx: Ctx, sheets: Sheets, hooks: MenuHooks, focus?: 'keys'): void {
  prefetchSound();
  sheets.open('menu', (b, close) => {
    const statsBtn = h('button', { class: 'btn', type: 'button', onclick: () => statsSheet(ctx, sheets) }, 'Statistics');
    const shopBtn = h('button', { class: 'btn', type: 'button', onclick: () => shopSheet(ctx, sheets) }, 'Hindsight shop');
    const rkBtn = h('button', { class: 'btn', type: 'button', onclick: () => ctx.confirmReckoning() }, 'Call a Reckoning');
    // M3: the Archive (once it has arrived), with its unread count; the first ending's credits once reached.
    const un = archiveUnread(ctx);
    const arcBtn = ctx.d?.features?.archive ? h('button', { class: 'btn', type: 'button', onclick: () => archiveSheet(ctx, sheets) }, 'The Archive', un ? h('span', { class: 'arc-n num', text: ` · ${fmt(un)} unread` }) : null) : null;
    const endBtn = ctx.d?.ending?.reached && hooks.credits ? h('button', { class: 'btn', type: 'button', onclick: () => hooks.credits?.() }, ctx.content.ending?.credits.title ?? 'The credits') : null;
    b.append(h('div', { class: 'm-row' }, statsBtn, shopBtn, arcBtn, rkBtn, endBtn));

    // Settings: notation and text size (kept with the UI preferences, not the save).
    const nota = segmented<Notation>('Numbers', [['suffix', '12.3M', 'Suffixes, 12.3M'], ['sci', '1.23e7', 'Scientific, 1.23e7'], ['eng', '12.3e6', 'Engineering, 12.3e6']],
      () => getPrefs().notation, (v) => { setPrefs({ notation: v }); ctx.refreshAll(); });
    const size = segmented<TextSize>('Text size', [[0, 'Aa', 'Standard text'], [1, 'Aa+', 'Larger text, 115%'], [2, 'Aa++', 'Largest text, 130%']],
      () => getPrefs().textSize, (v) => { setPrefs({ textSize: v }); ctx.refreshAll(); });
    const motion = segmented<Motion>('Motion', [['system', 'System', 'Follow the system setting'], ['reduce', 'Still', 'Still: no animation'], ['full', 'Moving', 'Moving: animate']],
      () => getPrefs().motion, (v) => { setPrefs({ motion: v }); ctx.refreshAll(); });
    const detail = segmented<Detail>('Picture detail', [['auto', 'Auto', 'Auto: less detail if the picture runs slowly'], ['full', 'Full', 'Full detail'], ['low', 'Low', 'Low detail: fewer moving things, kinder to the battery']],
      () => getPrefs().detail, (v) => { setPrefs({ detail: v }); ctx.refreshAll(); });
    // Sound: off until turned on here (the tap creates and unlocks the audio); three volumes and a calmer mode.
    const sndTog = h('button', { class: 'tog', type: 'button', role: 'switch', 'aria-checked': 'false', onclick: () => { setSound(!getPrefs().sound); paintSound(); } },
      h('span', { class: 'tog-k', 'aria-hidden': 'true' }), h('span', { class: 'tog-l', text: 'Sound' }));
    const slider = (k: 'master' | 'world' | 'interface', label: string) => {
      const inp = h('input', { type: 'range', min: '0', max: '100', step: '5', class: 'vol', 'aria-label': `${label} volume` }) as HTMLInputElement;
      inp.value = String(Math.round(getPrefs().volumes[k] * 100));
      inp.addEventListener('input', () => setVolumes({ [k]: Number(inp.value) / 100 }));
      return h('label', { class: 'vol-row' }, h('span', { text: label }), inp);
    };
    const calm = segmented<'system' | 'on' | 'off'>('Calmer sound', [['system', 'System', 'Follow the system’s reduced-motion setting'], ['on', 'Calmer', 'Fewer, softer sounds'], ['off', 'Full', 'Every sound']],
      () => getPrefs().calm, (v) => setCalm(v));
    const sndMore = h('div', { class: 'snd-more' }, slider('master', 'Master'), slider('world', 'The world'), slider('interface', 'Buttons'), calm.el);
    const sndNote = h('p', { class: 'muted small', text: 'Each Industry has a soundscape of its own. Off by default; nothing plays until it is turned on.' });
    const paintSound = () => { const on = getPrefs().sound; setAttr(sndTog, 'aria-checked', String(on)); cls(sndTog, 'on', on); show(sndMore, on); };
    paintSound();
    // The household survey (playledger.ts), disclosed from the first launch, with one switch that closes and deletes it.
    const svTog = h('button', { class: 'tog', type: 'button', role: 'switch', 'aria-checked': 'false', onclick: () => {
      if (getPrefs().survey) hooks.survey.close(); else hooks.survey.open();
      paintSurvey();
    } }, h('span', { class: 'tog-k', 'aria-hidden': 'true' }), h('span', { class: 'tog-l', text: surveyDisclosure.title }));
    const svTxt = h('p', { class: 'small' });
    const paintSurvey = () => {
      const on = getPrefs().survey;
      setAttr(svTog, 'aria-checked', String(on)); cls(svTog, 'on', on);
      setAttr(svTog, 'aria-label', on ? surveyDisclosure.closeLabel : surveyDisclosure.openLabel);
      setText(svTxt, on
        ? `${surveyDisclosure.body}${ctx.state.meta?.returns?.household ? ' Closing it also withdraws the return on file, so the save holds no figures.' : ''}`
        : `${surveyDisclosure.title} is closed: nothing is being kept. Switching it on starts an empty one.`);
    };
    paintSurvey();
    b.append(h('section', { class: 'm-sec settings' }, h('h3', { text: 'Settings' }), nota.el, size.el, motion.el, detail.el,
      h('div', { class: 'setting snd' }, sndTog, sndNote, sndMore),
      h('div', { class: 'setting survey' }, svTog, svTxt)));

    // Achievements
    // Those still to earn first; the ones earned fold away at the end ("Earned, n"), as owned things do in the shop.
    const achList = h('ul', { class: 'ach' });
    const achGot = foldSection('menu.achEarned', 'own ach-own');
    const achGotList = h('ul', { class: 'ach' });
    achGot.body.append(achGotList);
    const achs = ctx.content.achievements || [];
    const achCount = h('span', { class: 'num muted' });
    b.append(h('section', { class: 'm-sec' }, h('h3', null, 'Achievements ', achCount), achList, achGot.el));
    const achLis: HTMLElement[] = [];
    let achKey = '';
    const achRows = achs.map((a) => {
      const n = h('span', { class: 'ach-n' }), d = h('span', { class: 'ach-d' });
      const li = h('li', null, n, d); achLis.push(li);
      return () => {
        const got = !!ctx.state.meta?.achievements?.[a.id];
        cls(li, 'got', got);
        // One that names a system not met yet is hidden until it arrives (AchievementDef.feature: the unfolding).
        const veiled = !got && (a.hidden || (!!a.feature && !ctx.d?.features?.[a.feature]));
        setText(n, veiled ? '???' : a.name);
        setText(d, veiled ? 'Not yet.' : a.blurb);
      };
    });
    achRows.push(() => {
      const got = achs.map((a) => !!ctx.state.meta?.achievements?.[a.id]);
      const k = got.map((g) => (g ? 1 : 0)).join('');
      if (k === achKey) return;
      achKey = k;
      syncChildren(achList, achLis.filter((_, i) => !got[i]));
      syncChildren(achGotList, achLis.filter((_, i) => got[i]));
      setText(achGot.sum, `Earned, ${got.filter(Boolean).length}`);
      show(achGot.el, got.some(Boolean));
    });

    // How it works. The budget and Jevons' sentence wait for the reveal: before it, they would answer the question the
    // run is asking.
    const howBudget = h('p', { text: 'Draw a budget line for an Industry and hold its use under it, with wellbeing at the target: every ten years of that is a decade in the ledger, and fifty is Steady State.' });
    const howQuote = h('p', { class: 'muted', text: 'W. S. Jevons, 1865: “It is wholly a confusion of ideas to suppose that the economical use of fuel is equivalent to a diminished consumption.”' });
    b.append(h('section', { class: 'm-sec how' }, h('h3', { text: 'How it works' }),
      h('div', { class: 'formula' }, h('div', { class: 'f-line', text: 'R = D(pₛ) ÷ η' }), h('div', { class: 'f-line', text: 'pₛ = pᵣ ÷ η + c (+ any levy)' })),
      h('p', { text: 'R is resource burned, D demand for the service, η efficiency, pₛ the price of the service, pᵣ the price of the resource, c the cost of everything else (capital, labour). Each Industry has its own service, resource and prices; an Age is the stretch of the calendar it belongs to.' }),
      howBudget, howQuote));

    // Save
    const status = h('p', { class: 'save-status muted', 'aria-live': 'polite' });
    const exported = () => setPrefs({ lastExport: Date.now() });
    const ta = h('textarea', { class: 'save-ta', rows: 4, spellcheck: 'false', 'aria-label': 'Save text', placeholder: 'Paste a save here to load it.' }) as HTMLTextAreaElement;
    const file = h('input', { type: 'file', accept: '.txt,.json,text/plain', class: 'vh', id: 'save-file' }) as HTMLInputElement;
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      try { const t = await readFileText(f); if (hooks.importText(t)) { close(); ctx.toast('Save loaded.'); } else setText(status, 'That file is not a save this game can read.'); }
      catch { setText(status, 'Could not read that file.'); }
      file.value = '';
    });
    const fileLbl = h('label', { class: 'btn', for: 'save-file', tabindex: '0', role: 'button' }, 'Load from file');
    fileLbl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
    const remind = h('p', { class: 'save-note' });
    const storeLine = h('p', { class: 'save-note muted' });
    // The browser's answer on persistence, asked after the first purchase (game.ts) and read again here.
    // Storage blocked (a private window, a setting): nothing is kept, and the player must hear it here (QA B21).
    const blocked = !ctx.mock && !storageWorks();
    if (blocked) { setText(storeLine, 'Storage is blocked in this browser, so nothing is being kept: closing the page ends the game. Copy or download the save below to carry on later.'); storeLine.className = 'save-note remind'; }
    else void isPersisted().then((p) => {
      const asked = getPrefs().persist;
      setText(storeLine, p === true ? 'Storage: this browser has agreed to keep the save (persistent storage).'
        : p === false ? (asked === 'denied' ? 'Storage: asked to keep the save for good; the browser has not agreed yet. It may, once the game is used more. Exports are the safeguard meanwhile.'
          : 'Storage: the browser may clear the save if space runs short. Exports are the safeguard.')
          : 'Storage: this browser does not say whether it will keep the save.');
    });
    const ios = h('div', { class: 'save-ios', hidden: !iosInBrowser() || getPrefs().iosHintDismissed },
      h('p', { text: 'On iPhone and iPad, Safari can clear a site’s save after a week without a visit. Added to the Home Screen (Share, then Add to Home Screen), Rebound keeps it.' }),
      h('button', { class: 'toast-x', type: 'button', 'aria-label': 'Dismiss this note', onclick: () => { setPrefs({ iosHintDismissed: true }); show(ios, false); } }, svg(UI_ICONS.close)));

    // The rolling backup, taken at each Reckoning.
    const bkLine = h('p', { class: 'save-note' });
    const bkAsk = h('button', { class: 'btn small', type: 'button', onclick: () => { show(bkAsk, false); show(bkBox, true); (bkBox.querySelector('button') as HTMLButtonElement | null)?.focus(); } }, 'Restore the backup');
    const bkQ = h('p');
    const bkBox = h('div', { class: 'confirm-box', hidden: true }, bkQ,
      h('div', { class: 'm-row' },
        h('button', { class: 'btn danger', type: 'button', onclick: () => {
          // Close the menu first: a restored fresh run opens the Hindsight shop, which must not be closed with it.
          close();
          if (hooks.restoreBackup()) ctx.toast('Backup restored.');
          else ctx.toast('The backup could not be read.');
        } }, 'Restore it'),
        h('button', { class: 'btn', type: 'button', onclick: () => { show(bkBox, false); show(bkAsk, true); bkAsk.focus(); } }, 'Keep this run')));
    const bk = hooks.backup();
    if (bk) {
      setText(bkLine, `Backup: taken at Reckoning ${bk.reckonings} (the run had reached ${bk.year}), ${daysAgo(bk.at)}.`);
      setText(bkQ, `Go back to the start of the run that followed Reckoning ${bk.reckonings}? Everything since, this run included, is replaced.`);
    } else { setText(bkLine, 'Backup: one is kept automatically at each Reckoning.'); show(bkAsk, false); }

    b.append(h('section', { class: 'm-sec save' }, h('h3', { text: 'Save' }),
      remind,
      h('div', { class: 'm-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => {
          const t = hooks.exportText();
          const ok = download(`rebound-${Math.floor(num(ctx.d?.year))}.txt`, t);
          if (ok) exported();
          setText(status, ok ? 'Save downloaded.' : 'Download blocked; copy the text below instead.');
          ta.value = t;
        } }, 'Download save'),
        fileLbl, file),
      ta,
      h('div', { class: 'm-row' },
        h('button', { class: 'btn small', type: 'button', onclick: async () => {
          if (!ta.value) ta.value = hooks.exportText();
          const ok = await copyText(ta.value);
          if (ok) exported();
          if (!ok) { ta.focus(); ta.select(); }
          setText(status, ok ? 'Copied.' : 'Select the text and copy it by hand.');
        } }, 'Copy save text'),
        h('button', { class: 'btn small', type: 'button', onclick: () => {
          const t = ta.value.trim();
          if (!t) { setText(status, 'Paste a save into the box first.'); return; }
          if (hooks.importText(t)) { close(); ctx.toast('Save loaded.'); } else setText(status, 'That is not a save this game can read.');
        } }, 'Load pasted save')),
      status, h('div', { class: 'm-row bk-row' }, bkLine, bkAsk), bkBox, storeLine, ios));

    // Keyboard shortcuts: open by default where there is a keyboard and a mouse.
    let fine = false;
    try { fine = matchMedia('(hover: hover) and (pointer: fine)').matches; } catch { /* ignore */ }
    const keys = h('details', { class: 'm-sec keys', open: fine || focus === 'keys' },
      h('summary', null, h('h3', { text: 'Keyboard shortcuts' })),
      h('dl', { class: 'keys-dl' }, ...SHORTCUTS.map(([k, v]) => h('div', null, h('dt', null, ...k.split(/\s+/).filter(Boolean).map((x) => h('kbd', { text: x }))), h('dd', { text: v })))),
      h('p', { class: 'muted small', text: 'They wait while you type in a box.' }));
    b.append(keys);

    // Hard reset with in-page confirmation
    const resetRow = h('div', { class: 'm-row' });
    const ask = h('button', { class: 'btn danger', type: 'button', onclick: () => { show(ask, false); show(confirmBox, true); } }, 'Erase everything');
    const confirmBox = h('div', { class: 'confirm-box', hidden: true },
      h('p', { text: 'Erase this run, every Reckoning, all Hindsight and every achievement? There is no undo.' }),
      h('div', { class: 'm-row' },
        h('button', { class: 'btn danger', type: 'button', onclick: () => { hooks.hardReset(); close(); } }, 'Erase'),
        h('button', { class: 'btn', type: 'button', onclick: () => { show(confirmBox, false); show(ask, true); } }, 'Keep it')));
    resetRow.append(ask);
    b.append(h('section', { class: 'm-sec' }, h('h3', { text: 'Start over' }), resetRow, confirmBox));
    if (ctx.mock) b.append(h('p', { class: 'muted small', text: 'Running on the development stand-in model (#mock). Nothing is saved unless the address says persist.' }));
    if (focus === 'keys') requestAnimationFrame(() => { try { keys.scrollIntoView({ block: 'start' }); } catch { /* ignore */ } });

    return () => {
      const s = ctx.state, m = s.meta;
      const revealed = !!s.flags?.revealed;
      // The budget is explained once it has arrived (the unfolding), Steady State once that has.
      const f = ctx.d?.features;
      show(howBudget, revealed && !!f?.budget);
      setText(howBudget, f?.steadyState
        ? 'Draw a budget line for an Industry and hold its use under it, with wellbeing at the target: every ten years of that is a decade in the ledger, and fifty under a clear sky is Steady State.'
        : 'Draw a budget line for an Industry and hold its use under it: every ten years of that is a decade in the ledger.');
      show(howQuote, revealed);
      show(shopBtn, num(m?.reckonings) >= 1);
      show(rkBtn, reckoningOffered(ctx) && !ctx.d?.pendingReckoning);
      for (const r of achRows) r();
      setText(achCount, `${achs.filter((a) => m?.achievements?.[a.id]).length} of ${achs.length}`);
      // The export reminder: plain until there is something worth losing (half an hour of play), gentle after.
      const last = getPrefs().lastExport;
      const played = num(m?.totalSeconds) + num(s.time);
      const stale = !last || Date.now() - last > 7 * 86400000;
      setText(remind, last ? `Last exported ${daysAgo(last)}.${stale ? ' A fresh copy outside this browser is the only sure backup.' : ''}`
        : played > 1800 ? 'Never exported. A copy kept outside this browser is the only sure backup.' : 'Not exported yet.');
      cls(remind, 'remind', stale && played > 1800);
      cls(remind, 'muted', !(stale && played > 1800));
    };
  }, { label: 'Menu', cls: 'menu-sheet' });
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

export function statsSheet(ctx: Ctx, sheets: Sheets): void {
  sheets.open('stats', (b) => {
    const ups: (() => void)[] = [];
    type Get = () => string | null;
    /** A dl of label → value rows; a row whose getter returns null is hidden. */
    const block = (title: string, rows: [string, Get][], when?: () => boolean, into: (() => void)[] = ups) => {
      const dl = h('dl', { class: 'stats' });
      const sec = h('section', { class: 'm-sec' }, h('h3', { text: title }), dl);
      const cells = rows.map(([k, g]) => { const v = h('dd', { class: 'num' }); const row = h('div', null, h('dt', { text: k }), v); dl.append(row); return { row, v, g }; });
      into.push(() => {
        const on = when ? when() : true;
        show(sec, on);
        if (!on) return;
        for (const c of cells) { const t = c.g(); show(c.row, t != null); if (t != null) setText(c.v, t); }
      });
      return sec;
    };
    const s = () => ctx.state, d = () => ctx.d, m = () => ctx.state.meta;
    const ids = () => sectorIds(ctx.content);
    const open = () => ids().filter((id) => s().sectors?.[id]?.open);
    const revealed = () => !!s().flags?.revealed;
    const ran = () => num(m()?.reckonings) >= 1;
    const sum = (o: Record<string, number> | undefined) => Object.values(o || {}).reduce((a, x) => a + num(x), 0);

    b.append(block('This run', [
      ['Played', () => dur(s().time)],
      ['Year', () => { const a = ageDef(ctx.content, d()?.age); return `${Math.floor(num(d()?.year, 1780))}${a ? ` · ${a.name}` : ''}`; }],
      ['Capital', () => money(s().capital)],
      ['Income', () => `${money(d()?.incomePerSec)}/s`],
      ['Population', () => (ctx.d?.features?.population ? `×${fmt(s().population)} (peak ×${fmt(s().peakPopulation)})` : null)],
      ['Wellbeing', () => `${fmt(Math.floor(num(d()?.wellbeing)))} (peak ${fmt(Math.floor(num(s().run?.peakWellbeing)))})`],
      ['Wellbeing-years', () => fmt(Math.round(num(s().run?.wellbeingYears)))],
      ['Years at the target', () => fmt(Math.floor(num(s().run?.yearsAtTarget)))],
      ['Sold by hand', () => fmt(num(s().run?.clicks))],
      ['Improvements bought', () => fmt(sum(s().upgrades))],
      ['Uses founded', () => fmt(open().reduce((a, id) => a + Object.values(s().sectors[id]?.apps || {}).filter((x) => x?.founded).length, 0))],
      ['Decades within budget', () => (revealed() && ctx.d?.features?.budget ? fmt(num(s().run?.budgetDecades)) : null)],
      ['Years decoupled', () => (revealed() && ctx.d?.features?.budget ? fmt(Math.floor(num(s().run?.decoupledYears))) : null)],
      ['Hindsight on offer', () => (reckoningOffered(ctx) ? fmt(Math.floor(num(d()?.hindsightIfReckonNow))) : null)],
      ['Letters answered', () => (ctx.d?.features?.dispatches ? `${fmt(num(s().run?.dispatchesAnswered))}${num(s().run?.dispatchesDefaulted) ? `, ${fmt(num(s().run?.dispatchesDefaulted))} left to lapse` : ''}` : null)],
      ['History in force', () => { const id = d()?.history?.id; const x = id ? ctx.content.histories?.find((hh) => hh.id === id) : undefined; return x ? `${x.name}${d().history.cleared ? ', cleared' : `: ${x.goalLabel}`}` : null; }],
    ]));
    // M3: the household return, filed from here as from the feed (feature 'survey').
    const filer = surveyFiler(ctx);
    const svSec = h('section', { class: 'm-sec sv-sec' }, h('h3', { text: surveyDisclosure.title }), filer.el);
    b.append(svSec);
    ups.push(() => { show(svSec, !!ctx.d?.features?.survey); if (ctx.d?.features?.survey) filer.update(); });

    // One block per open industry.
    const perHost = h('div', { class: 'stats-per' });
    b.append(perHost);
    let perKey = '';
    let perUps: (() => void)[] = [];
    ups.push(() => {
      const list = open();
      const k = list.join(',');
      if (k === perKey) return;
      perKey = k;
      perHost.replaceChildren();
      const local: (() => void)[] = [];
      for (const id of list) {
        const def = sectorDef(ctx, id);
        const unit = def?.resource.unit ?? '';
        const res = lower(def?.resource.name ?? 'resource');
        const st = () => s().sectors?.[id];
        const e = () => sd(ctx, id);
        const sec = block(def?.name ?? id, [
          ['Efficiency', () => fold(e()?.etaFold)],
          [`${def?.resource.name ?? 'Resource'} use`, () => `${fold(e()?.rFold)} · ${fmt(num(e()?.resourceUse))} ${unit}/s`],
          ['Peak use', () => { const x = st(); return x && x.baseR > 0 ? fold(x.peakR / x.baseR) : null; }],
          [`${def?.resource.name ?? 'Resource'} burned`, () => `${fmt(num(s().run?.resourceUsed?.[id]))} ${unit}`],
          [def?.resourceKind === 'flow' ? 'Capacity spare' : 'Left in the ground', () => pct(num(e()?.reserveFraction), false)],
          ['Crises', () => fmt(num(st()?.crisesFired))],
          ['Backfired', () => (revealed() ? (st()?.backfired ? `yes, ${res} rose with thrift` : 'not yet') : null)],
          ['Decades in the ledger', () => (revealed() && ctx.d?.features?.budget ? fmt((st()?.decadesWithin || []).length) : null)],
          ['Seams sunk', () => { const v = e()?.seams; return v ? `${fmt(v.sunk)} of ${fmt(v.total)}` : null; }],
          ['Load factor', () => (e()?.load ? pct(num(e()!.load!.factor), false) : null)],
          ['At the wheel', () => { const t = e()?.travel; if (!t) return null; const mm = Math.round(num(t.hoursPerHead) * 60); return `${Math.floor(mm / 60)} h ${String(mm % 60).padStart(2, '0')} min a day`; }],
          ['Paid elsewhere', () => (e()?.free ? `${money(num(e()!.free!.bill))}/s` : null)],
          ['Open for', () => dur(num(st()?.openFor))],
        ], undefined, local);
        perHost.append(sec);
      }
      perUps = local;
    });

    b.append(block('All runs', [
      ['Time played', () => dur(num(m()?.totalSeconds) + num(s().time))],
      ['Reckonings', () => (ran() ? fmt(num(m()?.reckonings)) : null)],
      ['Hindsight earned', () => (ran() ? fmt(num(m()?.hindsightEarned)) : null)],
      ['Hindsight banked', () => (ran() ? fmt(Math.floor(num(m()?.hindsight))) : null)],
      ['Industries reached', () => `${ids().filter((id) => m()?.sectorsOpened?.[id] || s().sectors?.[id]?.open).length} of ${ids().length}`],
      ['Industries that backfired', () => (revealed() || ran() ? fmt(Object.keys(m()?.backfiredSectors || {}).length) : null)],
      ['Industries at Steady State', () => ((ran() || revealed()) && ctx.d?.features?.steadyState ? fmt(Object.keys(m()?.steadySectors || {}).length) : null)],
      ['Know-how learnt', () => (ran() ? `${Object.values(m()?.knowhow || {}).filter((x) => num(x) > 0).length} of ${(ctx.content.knowhow || []).length}` : null)],
      ['Institutions founded', () => (ran() ? `${Object.values(m()?.institutions || {}).filter((x) => num(x) > 0).length} of ${(ctx.content.institutions || []).length}` : null)],
      ['Seats in use', () => (ran() ? `${num(d()?.slots?.used)} of ${num(d()?.slots?.total)}` : null)],
      ['Achievements', () => { const a = ctx.content.achievements || []; return `${a.filter((x) => m()?.achievements?.[x.id]).length} of ${a.length}`; }],
      ['Archive notes found', () => (ctx.d?.features?.archive ? `${fmt(num(d()?.archive?.unlocked))} of ${fmt(num(d()?.archive?.total))}` : null)],
      ['Histories cleared', () => (ctx.d?.features?.histories ? `${Object.values(m()?.histories || {}).filter((x) => x?.cleared).length} of ${(ctx.content.histories || []).length}` : null)],
      ['First ending', () => { const r = d()?.ending?.record; return r ? `run ${fmt(r.run)}, ${(num(r.totalSeconds) / 3600).toFixed(1)} hours in, ${Math.floor(num(r.year))}` : null; }],
    ]));

    b.append(block('The last run', [
      ['How it ended', () => { const lr = m()?.lastRun; return lr ? causeHeadline(ctx, lr.cause, lr.causeSector) : null; }],
      ['Length', () => (m()?.lastRun ? dur(m()!.lastRun!.seconds) : null)],
      ['Year reached', () => (m()?.lastRun ? String(Math.floor(num(m()!.lastRun!.yearReached))) : null)],
      ['Peak wellbeing', () => (m()?.lastRun ? fmt(Math.floor(num(m()!.lastRun!.peakWellbeing))) : null)],
      ['Hindsight gained', () => (m()?.lastRun ? fmt(num(m()!.lastRun!.hindsightGained)) : null)],
    ], () => !!m()?.lastRun));

    // Run history (meta.runs), newest first; each opens to its Industries.
    const runsHost = h('div', { class: 'runs' });
    const runsSec = h('section', { class: 'm-sec' }, h('h3', { text: 'Past runs' }), runsHost);
    b.append(runsSec);
    let runsKey = '';
    ups.push(() => {
      const runs = Array.isArray(m()?.runs) ? m()!.runs : [];
      show(runsSec, runs.length > 0);
      const k = runs.length + ':' + (runs[runs.length - 1]?.totalSecondsAtEnd ?? 0);
      if (k === runsKey) return;
      runsKey = k;
      runsHost.replaceChildren(...runs.map((r, i) => ({ r, i })).reverse().map(({ r, i }) => {
        const n = num(r.index, i + 1);
        const secs = Object.keys(r.sectors || {}).filter((id) => sectorDef(ctx, id));
        const dec = secs.reduce((a, id) => a + num(r.sectors[id].decades), 0);
        const lean = secs.reduce((a, id) => a + num(r.sectors[id].leanDecades), 0);
        const settled = secs.filter((id) => r.sectors[id].settled).length;
        const ch = r.charter ? ctx.content.charters?.find((c) => c.id === r.charter)?.name : undefined;
        const bits = [
          ch ? `under ${ch}` : null,
          r.history ? `History: ${ctx.content.histories?.find((x) => x.id === r.history)?.name ?? r.history}${r.historyCleared ? ', cleared' : ''}` : null,
          dec ? `${fmt(dec)} decade${dec === 1 ? '' : 's'}${lean && ctx.d?.features?.clearSkies ? ` (${fmt(lean)} lean, ${fmt(dec - lean)} full)` : ''}` : ctx.d?.features?.budget ? 'no decades' : null,
          settled ? `${fmt(settled)} settled` : null,
          r.decisions != null ? `${fmt(num(r.decisions))} decisions${num(r.automated) ? `, ${fmt(num(r.automated))} by standing orders` : ''}` : null,
        ].filter(Boolean).join(' · ');
        const rows = secs.map((id) => {
          const x = r.sectors[id], def = sectorDef(ctx, id);
          const parts = [`efficiency ${fold(x.etaFold)}`, `peak ${lower(def?.resource.name ?? 'use')} ${fold(x.peakRFold)}`];
          if (x.unburnt != null) parts.push(`${pct(x.unburnt, false)} unburnt`);
          if (x.peakPressure != null) parts.push(`peak ${lower(def?.pressure.name ?? 'pressure')} ${pct(x.peakPressure, false)}`);
          if (x.steady) parts.push('Steady State');
          if (x.settled) parts.push('settled');
          return h('li', null, h('b', { text: def?.name ?? id }), ` ${parts.join(' · ')}`);
        });
        return h('details', { class: 'run-row' },
          h('summary', null,
            h('span', { class: 'run-n num', text: `Run ${n}` }),
            h('span', { class: 'run-c', text: causeHeadline(ctx, r.cause, r.causeSector) }),
            h('span', { class: 'run-f num', text: `${dur(r.seconds)} · ${Math.floor(num(r.yearReached))} · +${fmt(num(r.hindsightGained))} H` }),
            h('span', { class: 'run-b muted', text: bits })),
          h('ul', { class: 'run-secs' }, ...rows));
      }));
    });

    return () => { for (const u of ups) u(); for (const u of perUps) u(); };
  }, { label: 'Statistics', cls: 'stats-sheet' });
}

/* ------------------------------------------------------------------ */
/* A fork: one arm rules out the others                                */
/* ------------------------------------------------------------------ */

export function forkSheet(ctx: Ctx, sheets: Sheets, id: string, onYes: () => void): void {
  const ups = ctx.content.upgrades || [];
  const def = ups.find((u) => u.id === id);
  if (!def) { onYes(); return; }
  // Name the other arms (both directions of `excludes`, as content lists them); the model decides what is excluded.
  const owned = ctx.state.upgrades || {};
  const others = ups.filter((u) => u.id !== id && !(num(owned[u.id]) > 0) && ((def.excludes || []).includes(u.id) || (u.excludes || []).includes(id)));
  const names = others.map((u) => u.name);
  const list = names.length <= 1 ? (names[0] ?? 'the other choice') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  sheets.open('fork', (b, close) => {
    const cost = ctx.ups.find((v) => v.def.id === id)?.cost;
    b.append(h('p', { class: 'confirm-q' }, 'Take ', h('b', { text: def.name }), '?'),
      h('p', { text: `It rules out ${list} for the rest of this run.` }),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); onYes(); } }, h('span', { text: 'Take it' }), cost != null ? h('span', { class: 'num', text: ` · ${money(cost)}` }) : null),
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Not yet')));
  }, { label: 'A choice', cls: 'small-sheet' });
}

/* ------------------------------------------------------------------ */
/* The Settle ceremony                                                 */
/* ------------------------------------------------------------------ */

export function settleSheet(ctx: Ctx, sheets: Sheets, id: SectorId, onYes: () => void): void {
  const def = sectorDef(ctx, id);
  if (!def) return;
  sheets.open('settle', (b, close) => {
    const yr = Math.floor(num(ctx.d?.year, 1780));
    const div = (def.settle?.dividend || []).map((e) => effectText(ctx, e)).filter(Boolean);
    b.append(h('div', { class: 'paper ceremony' },
      h('div', { class: 'paper-mast' }, h('span', { text: 'By order' }), h('span', { class: 'num', text: String(yr) })),
      h('h1', { class: 'paper-head', text: `${def.name} settles` }),
      def.settle?.blurb ? h('p', { class: 'paper-stand', text: def.settle.blurb }) : null,
      div.length ? h('p', { class: 'cer-div' }, h('span', { class: 'muted', text: 'The settlement pays: ' }), div.join(' · ')) : null,
      h('p', { class: 'cer-terms', text: 'Its levers are retired. The Industry is held as it stands, and Mandate defends it when the world grows into it.' })),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); onYes(); } }, `Settle ${def.name}`),
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Not yet')));
  }, { label: 'Settlement', cls: 'small-sheet settle-sheet' });
}

/* ------------------------------------------------------------------ */
/* Fatal panel (a model exception must not leave a dead page)          */
/* ------------------------------------------------------------------ */

export function showFatal(where: string, err: unknown, actions: { label: string; run: () => void }[]): void {
  let el = document.getElementById('fatal');
  if (!el) { el = document.createElement('div'); el.id = 'fatal'; document.body.append(el); }
  const e = err as { message?: string; stack?: string } | null;
  const msg = (e && e.message) || String(err);
  el.replaceChildren(h('div', { class: 'fatal-card', role: 'alertdialog', 'aria-labelledby': 'fatal-t' },
    h('h2', { id: 'fatal-t', text: 'The presses have stopped' }),
    h('p', null, 'Something in the simulation failed during ', h('code', { text: where }), '.'),
    h('pre', { class: 'fatal-pre', text: `${msg}\n\n${(e && e.stack) || ''}`.trim() }),
    h('div', { class: 'm-row' }, ...actions.map((a) => h('button', { class: 'btn', type: 'button', onclick: a.run }, a.label)))));
  el.hidden = false;
}
export function hideFatal(): void {
  const el = document.getElementById('fatal');
  if (el) el.hidden = true;
}
