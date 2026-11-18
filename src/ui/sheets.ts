// Overlays: one sheet at a time (menu, formula, confirmations, Hindsight shop, the Reckoning, the win card, the locked
// industry checklist), plus toasts. Sheet structure is built when it opens; live numbers inside are patched while it
// stays open.
import type { Ctx, FormulaKind } from './ctx';
import { sectorDef, sd, sectorIds, ageOfSector } from './ctx';
import type { HindsightTerms, InstitutionView, KnowhowView, ReckoningCause, SectorId } from '../types';
import { STEADY_STATE_YEARS } from '../types';
import { h, svg, setText, setAttr, setStyle, show, cls, syncChildren } from './dom';
import { fmt, fmtPrice, fold, pct, dur, num, clamp, lower, money } from './fmt';
import { UI_ICONS } from './icons';
import { effectText } from './panels';
import { download, copyText, readFileText } from './store';

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

  function tryClose(): void { if (opts && opts.dismissable !== false) close(); }
  function close(): void {
    current = null; upd = undefined; opts = null;
    show(el, false);
    body.replaceChildren();
    document.documentElement.classList.remove('sheet-open');
    for (const n of Array.from(document.querySelectorAll('#app > .cockpit, #app > .feed'))) n.removeAttribute('inert');
    if (returnFocus instanceof HTMLElement && document.contains(returnFocus) && !returnFocus.closest('[hidden]')) {
      try { returnFocus.focus({ preventScroll: true }); } catch { /* ignore */ }
    }
  }
  function open(kind: string, build: (b: HTMLElement, c: () => void) => Updater, o: OpenOpts): void {
    if (!current) returnFocus = document.activeElement;
    current = kind; opts = o;
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
/* Toasts                                                              */
/* ------------------------------------------------------------------ */
// Toasts sit at the top of the screen, over the top bar, so that they never cover the buttons a thumb is reaching
// for. Short (4.5 s; 9 s with an action), at most two, and paused while hovered or focused.

export function buildToasts(): { el: HTMLElement; push(text: string, action?: { label: string; run: () => void }, ms?: number): void } {
  const el = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
  function push(text: string, action?: { label: string; run: () => void }, ms?: number): void {
    const life = ms ?? (action ? 9000 : 4500);
    const t = h('div', { class: 'toast' }, h('span', { class: 'toast-t', text }));
    let timer = 0;
    const kill = () => { clearTimeout(timer); t.classList.add('out'); setTimeout(() => t.remove(), 300); };
    const arm = (n: number) => { clearTimeout(timer); timer = window.setTimeout(kill, n); };
    if (action) t.append(h('button', { class: 'btn small', type: 'button', onclick: () => { action.run(); kill(); } }, action.label));
    const x = h('button', { class: 'toast-x', type: 'button', 'aria-label': 'Dismiss', onclick: kill });
    x.append(svg(UI_ICONS.close));
    t.append(x);
    t.addEventListener('pointerenter', () => clearTimeout(timer));
    t.addEventListener('pointerleave', () => arm(2500));
    t.addEventListener('focusin', () => clearTimeout(timer));
    t.addEventListener('focusout', () => arm(2500));
    el.append(t);
    while (el.children.length > 2) el.firstElementChild!.remove();
    arm(life);
  }
  return { el, push };
}

/* ------------------------------------------------------------------ */
/* Formula behind a number                                             */
/* ------------------------------------------------------------------ */

export function formulaSheet(ctx: Ctx, sheets: Sheets, kind: FormulaKind): void {
  const label = kind === 'eff' ? 'Efficiency' : kind === 'cons' ? 'Consumption' : kind === 'rebound' ? 'Rebound' : 'Price';
  sheets.open('formula', (b) => {
    const def = sectorDef(ctx);
    const unitS = def?.service.unit ?? '', unitR = (def?.resource.unit ?? '').replace(/s$/, '');
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
    b.append(h('div', { class: 'formula' }, ...lines[kind].map((l) => h('div', { class: 'f-line', text: l }))));
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
    };
    const pick: Record<FormulaKind, string[]> = {
      eff: ['eta', 'fold', 'pr', 'c', 'ps', 'D', 'R'],
      cons: ['D', 'sigma', 'eta', 'R', 'rfold', 'grow', 'shadow'],
      rebound: ['fold', 'R', 'shadow', 'prom', 'rfold', 'grow', 'rb'],
      price: ['pr', 'permit', 'eta', 'c', 'sigma', 'pre', 'permitPart', 'dutyPart', 'ps', 'm', 'D', 'inc', 'levy'],
    };
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
    ['backfire', 'First backfire'], ['sectorsReached', 'Industries reached'], ['steady', 'Steady State'],
  ];
  const cells = rows.map(([k, l]) => ({ k, row: h('div', { class: 'tl-row' }), l, v: h('span', { class: 'tl-v num' }), sub: h('span', { class: 'tl-sub num' }) }));
  for (const c of cells) c.row.append(h('span', { class: 'tl-l' }, c.l, c.sub), c.v);
  const tot = h('span', { class: 'tl-v num' });
  const el = h('div', { class: 'tl', role: 'table', 'aria-label': 'Where the Hindsight comes from' },
    ...cells.map((c) => c.row), h('div', { class: 'tl-row tl-tot' }, h('span', { class: 'tl-l', text: 'Hindsight' }), tot));
  return {
    el,
    update() {
      const t = get();
      show(el, !!t);
      if (!t) return;
      for (const c of cells) {
        const v = num(t[c.k]);
        setText(c.v, v > 0 ? `+${fmt(Math.round(v * 10) / 10)}` : '—');
        cls(c.row, 'zero', !(v > 0));
      }
      const w = cells[0];
      setText(w.sub, ` ${fmt(Math.round(num(t.wellbeingYears)))} wellbeing-years, burning ${fold(Math.max(1, num(t.intensity, 1)))}`);
      setText(tot, fmt(num(t.total)));
    },
  };
}

/* ------------------------------------------------------------------ */
/* Hindsight shop: Know-how trees and the Institution seats            */
/* ------------------------------------------------------------------ */

function treeTitle(ctx: Ctx, tree: string): string {
  const s = ctx.content.sectors?.[tree];
  if (s) return s.name;
  if (tree === 'general') return 'General';
  return tree.charAt(0).toUpperCase() + tree.slice(1);
}

export function buildShop(ctx: Ctx, host: HTMLElement): () => void {
  const bal = h('span', { class: 'num' });
  const ro = h('p', { class: 'shop-ro' }, 'Read-only for now. Hindsight is spent and seats are changed between runs, after a Reckoning.');
  host.append(h('p', { class: 'shop-bal' }, h('span', { class: 'muted', text: 'Hindsight to spend ' }), bal), ro);
  const items: (() => void)[] = [];
  const kh = h('section', { class: 'shop-col kh' }, h('h3', { text: 'Know-how' }), h('p', { class: 'shop-k', text: 'The obvious buy. Runs start faster, and reach the wall sooner.' }));
  const inst = h('section', { class: 'shop-col inst' }, h('h3', { text: 'Institutions' }), h('p', { class: 'shop-k', text: 'The slow buy. Only seated institutions act.' }));

  const khView = (id: string): KnowhowView | undefined => (ctx.khs || []).find((v) => v.def.id === id);
  const inView = (id: string): InstitutionView | undefined => (ctx.insts || []).find((v) => v.def.id === id);
  const khName = (id: string | null) => (id ? ctx.content.knowhow.find((k) => k.id === id)?.name ?? id : '');

  // Trees: rows by tier; nodes sharing a branch sit side by side with "or".
  const defs = ctx.content.knowhow || [];
  const trees: string[] = [];
  for (const k of defs) { const t = k.tree ?? 'general'; if (!trees.includes(t)) trees.push(t); }
  for (const t of trees) {
    const nodes = defs.filter((k) => (k.tree ?? 'general') === t);
    const tiers = [...new Set(nodes.map((k) => k.tier ?? 1))].sort((a, b) => a - b);
    const treeEl = h('div', { class: 'tree' }, h('h4', { class: 'tree-t', text: treeTitle(ctx, t) }));
    for (const tier of tiers) {
      const rowEl = h('div', { class: 'tree-row', 'data-tier': String(tier) });
      const inTier = nodes.filter((k) => (k.tier ?? 1) === tier);
      const done = new Set<string>();
      for (const k of inTier) {
        if (done.has(k.id)) continue;
        const arms = k.branch ? inTier.filter((o) => o.branch === k.branch) : [k];
        arms.forEach((a) => done.add(a.id));
        const group = h('div', { class: arms.length > 1 ? 'kh-fork' : 'kh-single' });
        arms.forEach((a, i) => {
          if (i) group.append(h('span', { class: 'fork-or', 'aria-hidden': 'true', text: 'or' }));
          const lvl = h('span', { class: 'num muted' });
          const note = h('p', { class: 'kh-note' });
          const c = h('span', { class: 'btn-c num' });
          const bl = h('span', { class: 'btn-l', text: 'Learn' });
          const b = h('button', { class: 'btn small', type: 'button', onclick: () => {
            if (khView(a.id)?.canBuy) ctx.act('buyKnowhow', (m, s, ct) => m.buyKnowhow(s, ct, a.id));
          } }, bl, c);
          const eff = (a.effects || []).map((e) => effectText(ctx, e)).filter(Boolean).join(' · ');
          const nameEl = h('h5', { text: a.name });
          const card = h('article', { class: 'kh-node' }, h('header', null, nameEl, lvl), h('p', { class: 'shop-eff', text: eff + (a.maxLevel > 1 ? ', per level' : '') }),
            h('p', { class: 'shop-blurb', text: a.blurb }), note, b);
          group.append(card);
          items.push(() => {
            const v = khView(a.id);
            const level = num(v?.level);
            setText(lvl, `${level}/${a.maxLevel}`);
            const excluded = !!v?.excludedBy;
            const locked = !!v && !v.requirementsMet;
            cls(card, 'owned', level > 0);
            cls(card, 'excluded', excluded);
            cls(card, 'locked', locked && !excluded);
            setText(note, excluded ? `Ruled out by ${khName(v!.excludedBy)}` : locked ? `Opens once a row ${tier - 1} node is learnt` : '');
            show(note, !!note.textContent);
            setText(bl, v?.maxed ? 'Learnt' : 'Learn');
            setText(c, v?.maxed || v?.cost == null ? '' : `${fmt(Math.ceil(v.cost))} H`);
            show(b, !excluded);
            setAttr(b, 'aria-disabled', v?.canBuy ? null : 'true');
          });
        });
        rowEl.append(group);
      }
      treeEl.append(rowEl);
    }
    kh.append(treeEl);
  }

  // Seats: one box per seat; a seated institution fills as many seats as it occupies.
  const seatTxt = h('p', { class: 'seat-txt num' });
  const seats = h('div', { class: 'seats', role: 'list', 'aria-label': 'Institution seats' });
  inst.append(seatTxt, seats);
  let seatKey = '';
  const seatEls = new Map<string, { el: HTMLElement; b: HTMLButtonElement }>();
  const loadout = () => (Array.isArray(ctx.state.meta?.loadout) ? ctx.state.meta.loadout : []);
  const setLoadout = (ids: string[]) => ctx.act('setLoadout', (m, s, ct) => m.setLoadout(s, ct, ids));
  function seatFor(id: string) {
    let x = seatEls.get(id);
    if (!x) {
      const d = ctx.content.institutions.find((i) => i.id === id);
      const b = h('button', { class: 'btn small', type: 'button', onclick: () => { if (ctx.d?.freshRun) setLoadout(loadout().filter((o) => o !== id)); } }, 'Unseat');
      const el = h('div', { class: 'seat full', role: 'listitem' }, h('span', { class: 'seat-n', text: d?.name ?? id }), b);
      x = { el, b };
      seatEls.set(id, x);
    }
    return x;
  }
  items.push(() => {
    const total = num(ctx.d?.slots?.total), used = num(ctx.d?.slots?.used);
    setText(seatTxt, `Seats: ${used} of ${total} in use`);
    const lo = loadout();
    const k = lo.join(',') + '|' + total + '|' + used;
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
    }
    for (const id of lo) setAttr(seatFor(id).b, 'aria-disabled', ctx.d?.freshRun ? null : 'true');
  });

  for (const d of ctx.content.institutions || []) {
    const lvl = h('span', { class: 'num muted' });
    const req = h('p', { class: 'shop-req' });
    const nextEff = h('p', { class: 'shop-eff' });
    const c = h('span', { class: 'btn-c num' });
    const bl = h('span', { class: 'btn-l' });
    const buy = h('button', { class: 'btn small', type: 'button', onclick: () => { if (inView(d.id)?.canBuy) ctx.act('buyInstitution', (m, s, ct) => m.buyInstitution(s, ct, d.id)); } }, bl, c);
    const seat = h('button', { class: 'btn small seat-b', type: 'button', onclick: () => {
      const v = inView(d.id);
      if (!v || !ctx.d?.freshRun) return;
      if (v.seated) setLoadout(loadout().filter((o) => o !== d.id));
      else if (v.canSeat) setLoadout([...loadout(), d.id]);
    } });
    const slots = d.slots ?? 1;
    const card = h('article', { class: 'shop-item' },
      h('header', null, h('h4', { text: d.name }), lvl), h('p', { class: 'shop-blurb', text: d.blurb + (slots > 1 ? ` Takes ${slots} seats.` : '') }),
      nextEff, req, h('div', { class: 'm-row' }, buy, seat));
    inst.append(card);
    items.push(() => {
      const v = inView(d.id);
      const level = num(v?.level), max = num(v?.maxLevel, 1);
      setText(lvl, max > 1 ? `${level}/${max}` : level ? 'Founded' : '');
      const missing = (d.requires || []).filter((r) => !(num(ctx.state.meta?.institutions?.[r]) >= 1));
      setText(req, !v?.requirementsMet && missing.length ? `Needs: ${missing.map((r) => ctx.content.institutions.find((x) => x.id === r)?.name ?? r).join(', ')}` : '');
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
    });
  }
  host.append(h('div', { class: 'shop-cols' }, kh, inst));
  return () => {
    setText(bal, fmt(Math.floor(num(ctx.state.meta?.hindsight))));
    show(ro, !ctx.d?.freshRun);
    cls(host, 'read-only', !ctx.d?.freshRun);
    for (const u of items) u();
  };
}

export function shopSheet(ctx: Ctx, sheets: Sheets, after?: () => void): void {
  sheets.open('shop', (b, close) => {
    const u = buildShop(ctx, b);
    if (after) b.append(h('div', { class: 'sheet-foot sticky-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); after(); } }, 'Begin the next run')));
    return u;
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
  }, { label: `${def?.name ?? 'An industry'}, locked`, cls: 'small-sheet' });
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
      ? `The last of the ${lower(def?.resource.name ?? 'reserve')} was got up in ${yr}, after ${dur(ctx.state.time)} of improvement. Every engine in the country is more efficient than it has ever been.`
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

export function summarySheet(ctx: Ctx, sheets: Sheets, onDone: () => void): void {
  const lr = ctx.state.meta?.lastRun;
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
          h('p', { class: 'paper-stand num', text: `${dur(lr.seconds)} of play · peak wellbeing ${fmt(Math.floor(num(lr.peakWellbeing)))}` }),
          h('div', { class: 'acct' }, ...ids.map((id) => {
            const r = lr.sectors[id], def = sectorDef(ctx, id);
            const res = lower(def?.resource.name ?? 'resource');
            const extra: string[] = [];
            if (r.unburnt != null && Number.isFinite(r.unburnt)) extra.push(`${pct(r.unburnt, false)} left unburnt`);
            if (r.decades != null) extra.push(`${fmt(r.decades)} decade${r.decades === 1 ? '' : 's'} in budget`);
            return h('div', { class: 'acct-era' },
              h('h3', { text: `${def?.name ?? id}` }),
              h('div', { class: 'acct-row eff' }, h('span', { class: 'acct-l', text: 'Efficiency' }),
                h('span', { class: 'acct-bar' }, h('span', { style: `width:${w(r.etaFold)}` })), h('span', { class: 'acct-v num', text: fold(r.etaFold) })),
              h('div', { class: 'acct-row use' }, h('span', { class: 'acct-l', text: `Peak ${res} use` }),
                h('span', { class: 'acct-bar' }, h('span', { style: `width:${w(r.peakRFold)}` })), h('span', { class: 'acct-v num', text: fold(r.peakRFold) })),
              h('p', { class: 'acct-tot num', text: [`${fmt(r.resourceUsed)} ${def?.resource.unit ?? ''} burned in all`, ...extra].join(' · ') }));
          })),
          ...(lr.hindsightTerms ? [h('h3', { class: 'paper-sub', text: 'Where the Hindsight came from' }), tl.el] : []),
          h('p', { class: 'paper-h big' }, h('span', { class: 'muted', text: 'Hindsight gained ' }), h('b', { class: 'num', text: fmt(num(lr.hindsightGained)) }))));
    }
    b.append(h('div', { class: 'sheet-foot' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => { shopSheet(ctx, sheets, onDone); } }, 'Spend Hindsight'),
      h('button', { class: 'btn', type: 'button', onclick: () => { close(); onDone(); } }, 'Begin the next run')));
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
      h('p', { class: 'paper-stand', text: `${STEADY_STATE_YEARS} years of a decent life inside the line, in every industry at once. Nobody is quite sure when it happened. The engines kept improving; the burning stopped following them.` }),
      h('p', { class: 'muted', text: 'The game carries on. So, presumably, does everyone.' })),
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: close }, 'Carry on')));
  }, { label: 'Credits', full: true, cls: 'reckon-sheet' });
}

/** A stored save that the model could not read: offer it for export before the fresh run overwrites the slot. */
export function unreadSaveSheet(sheets: Sheets, raw: string): void {
  sheets.open('unread', (b, close) => {
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

export interface MenuHooks { exportText(): string; importText(t: string): boolean; hardReset(): void; }

export function menuSheet(ctx: Ctx, sheets: Sheets, hooks: MenuHooks): void {
  sheets.open('menu', (b, close) => {
    // Stats
    const stat = (k: string) => { const v = h('dd', { class: 'num' }); return [h('div', null, h('dt', { text: k }), v), v] as const; };
    const [sYear, vYear] = stat('Year'), [sTime, vTime] = stat('This run'), [sPop, vPop] = stat('Population'),
      [sPeak, vPeak] = stat('Peak wellbeing'), [sClicks, vClicks] = stat('Sold by hand');
    const [lRk, vRk] = stat('Reckonings'), [lHe, vHe] = stat('Hindsight earned'), [lHb, vHb] = stat('Hindsight banked'),
      [lTot, vTot] = stat('Time played'), [lFar, vFar] = stat('Industries reached');
    b.append(h('section', { class: 'm-sec' }, h('h3', { text: 'This run' }), h('dl', { class: 'stats' }, sYear, sTime, sPop, sPeak, sClicks)),
      h('section', { class: 'm-sec' }, h('h3', { text: 'All runs' }), h('dl', { class: 'stats' }, lRk, lHe, lHb, lTot, lFar)));

    const shopBtn = h('button', { class: 'btn', type: 'button', onclick: () => shopSheet(ctx, sheets) }, 'Hindsight shop');
    const rkBtn = h('button', { class: 'btn', type: 'button', onclick: () => ctx.confirmReckoning() }, 'Call a Reckoning');
    b.append(h('div', { class: 'm-row' }, shopBtn, rkBtn));

    // Achievements
    const achList = h('ul', { class: 'ach' });
    b.append(h('section', { class: 'm-sec' }, h('h3', { text: 'Achievements' }), achList));
    const achs = ctx.content.achievements || [];
    const achRows = achs.map((a) => {
      const n = h('span', { class: 'ach-n' }), d = h('span', { class: 'ach-d' });
      const li = h('li', null, n, d); achList.append(li);
      return () => {
        const got = !!ctx.state.meta?.achievements?.[a.id];
        cls(li, 'got', got);
        setText(n, got || !a.hidden ? a.name : '???');
        setText(d, got || !a.hidden ? a.blurb : 'Not yet.');
      };
    });

    // How it works
    b.append(h('section', { class: 'm-sec how' }, h('h3', { text: 'How it works' }),
      h('div', { class: 'formula' }, h('div', { class: 'f-line', text: 'R = D(pₛ) ÷ η' }), h('div', { class: 'f-line', text: 'pₛ = pᵣ ÷ η + c (+ any levy)' })),
      h('p', { text: 'R is resource burned, D demand for the service, η efficiency, pₛ the price of the service, pᵣ the price of the resource, c everything else. Each industry runs on its own pair of these; an age is the stretch of the calendar they belong to.' }),
      h('p', { text: 'Draw a budget line for an industry and hold its use under it, with wellbeing at the target: every ten years of that is a decade in the ledger, and fifty is Steady State.' }),
      h('p', { class: 'muted', text: 'W. S. Jevons, 1865: “It is wholly a confusion of ideas to suppose that the economical use of fuel is equivalent to a diminished consumption.”' })));

    // Save
    const status = h('p', { class: 'save-status muted', 'aria-live': 'polite' });
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
    b.append(h('section', { class: 'm-sec save' }, h('h3', { text: 'Save' }),
      h('div', { class: 'm-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => {
          const t = hooks.exportText();
          setText(status, download(`rebound-${Math.floor(num(ctx.d?.year))}.txt`, t) ? 'Save downloaded.' : 'Download blocked; copy the text below instead.');
          ta.value = t;
        } }, 'Download save'),
        fileLbl, file),
      ta,
      h('div', { class: 'm-row' },
        h('button', { class: 'btn small', type: 'button', onclick: async () => {
          if (!ta.value) ta.value = hooks.exportText();
          const ok = await copyText(ta.value);
          if (!ok) { ta.focus(); ta.select(); }
          setText(status, ok ? 'Copied.' : 'Select the text and copy it by hand.');
        } }, 'Copy save text'),
        h('button', { class: 'btn small', type: 'button', onclick: () => {
          const t = ta.value.trim();
          if (!t) { setText(status, 'Paste a save into the box first.'); return; }
          if (hooks.importText(t)) { close(); ctx.toast('Save loaded.'); } else setText(status, 'That is not a save this game can read.');
        } }, 'Load pasted save')),
      status));

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

    return () => {
      const s = ctx.state, m = s.meta;
      setText(vYear, String(Math.floor(num(ctx.d?.year, 1780))));
      setText(vTime, dur(s.time));
      setText(vPop, fmt(s.population));
      setText(vPeak, fmt(Math.floor(num(s.run?.peakWellbeing))));
      setText(vClicks, fmt(num(s.run?.clicks)));
      setText(vRk, fmt(num(m?.reckonings)));
      setText(vHe, fmt(num(m?.hindsightEarned)));
      setText(vHb, fmt(Math.floor(num(m?.hindsight))));
      setText(vTot, dur(num(m?.totalSeconds) + num(s.time)));
      const ids = sectorIds(ctx.content);
      const reached = ids.filter((id) => m?.sectorsOpened?.[id] || s.sectors?.[id]?.open).length;
      setText(vFar, `${reached} of ${ids.length}`);
      show(shopBtn, num(m?.reckonings) >= 1);
      for (const r of achRows) r();
    };
  }, { label: 'Menu', cls: 'menu-sheet' });
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
