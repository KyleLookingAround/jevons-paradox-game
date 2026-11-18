// Overlays: one sheet at a time (menu, formula, confirmations, Hindsight shop, the Reckoning, the win card),
// plus toasts. Sheet structure is built when it opens; live numbers inside are patched while it stays open.
import type { Ctx, FormulaKind } from './ctx';
import { eraDef, ed, eraIds } from './ctx';
import type { EraId, ReckoningCause } from '../types';
import { STEADY_STATE_YEARS } from '../types';
import { h, svg, setText, setAttr, show, cls } from './dom';
import { fmt, fmtPrice, fold, pct, dur, num, clamp, lower } from './fmt';
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
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' },
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
    if (returnFocus instanceof HTMLElement && document.contains(returnFocus)) { try { returnFocus.focus({ preventScroll: true }); } catch { /* ignore */ } }
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
    body.scrollTop = 0;
    const f = sheet.querySelector<HTMLElement>('.sheet-b button:not([disabled]), .sheet-b a, .sheet-x');
    try { (f ?? sheet).focus({ preventScroll: true }); } catch { /* ignore */ }
    if (upd) upd();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) tryClose(); });
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

export function buildToasts(): { el: HTMLElement; push(text: string, action?: { label: string; run: () => void }, ms?: number): void } {
  const el = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
  function push(text: string, action?: { label: string; run: () => void }, ms = 7000): void {
    const t = h('div', { class: 'toast' }, h('span', { class: 'toast-t', text }));
    const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
    if (action) t.append(h('button', { class: 'btn small', type: 'button', onclick: () => { action.run(); kill(); } }, action.label));
    const x = h('button', { class: 'toast-x', type: 'button', 'aria-label': 'Dismiss', onclick: kill });
    x.append(svg(UI_ICONS.close));
    t.append(x);
    el.append(t);
    while (el.children.length > 3) el.firstElementChild!.remove();
    setTimeout(kill, ms);
  }
  return { el, push };
}

/* ------------------------------------------------------------------ */
/* Formula behind a number                                             */
/* ------------------------------------------------------------------ */

export function formulaSheet(ctx: Ctx, sheets: Sheets, kind: FormulaKind): void {
  const label = kind === 'eff' ? 'Efficiency' : kind === 'cons' ? 'Consumption' : kind === 'rebound' ? 'Rebound' : 'Price';
  sheets.open('formula', (b) => {
    const def = eraDef(ctx);
    const unitS = def?.service.unit ?? '', unitR = def?.resource.unit ?? '';
    const lines: Record<FormulaKind, string[]> = {
      eff: ['η = service ÷ resource', 'fold = η ÷ η₀'],
      cons: ['R = D ÷ η', 'Dᵢ = N·Sᵢ ÷ (1 + (pₛ ÷ pᵢ)^kᵢ)'],
      rebound: ['R₀ ÷ (η ÷ η₀) = R promised', 'rebound = (R − R promised) ÷ (R₀ − R promised)'],
      price: ['pₛ = pᵣ ÷ η + c', 'income = m · pₛ · D'],
    };
    const notes: Record<FormulaKind, string> = {
      eff: 'Each improvement multiplies η. The card promises resource falls by the same factor.',
      cons: 'Demand is a sum of applications, each a logistic curve in the service price.',
      rebound: 'The share of the promised saving that extra demand took back. Over 100%: backfire.',
      price: 'A thriftier engine makes the service cheaper. Cheaper service sells more of it.',
    };
    b.append(h('div', { class: 'formula' }, ...lines[kind].map((l) => h('div', { class: 'f-line', text: l }))));
    const rows: [string, HTMLElement][] = [];
    const row = (k: string) => { const v = h('dd', { class: 'num' }); rows.push([k, v]); return v; };
    const vEta = row('η'), vFold = row('η ÷ η₀'), vPr = row('pᵣ'), vC = row('c (incl. any duty)'), vPs = row('pₛ'), vD = row('D'), vR = row('R'), vR0 = row('R₀'), vRp = row('R promised'), vRb = row('rebound');
    const dl = h('dl', { class: 'f-vals' });
    for (const [k, v] of rows) dl.append(h('div', null, h('dt', { text: k }), v));
    b.append(dl, h('p', { class: 'f-note', text: notes[kind] }));
    return () => {
      const e = ed(ctx);
      if (!e) return;
      const eta = num(e.eta), pr = num(e.resourcePrice), ps = num(e.servicePrice);
      const r0 = num(e.rFold) > 0 ? num(e.resourceUse) / num(e.rFold) : NaN;
      setText(vEta, `${fmtPrice(eta)} ${unitS}/${unitR.replace(/s$/, '')}`);
      setText(vFold, fold(e.etaFold));
      setText(vPr, `£${fmtPrice(pr)}/${unitR.replace(/s$/, '')}`);
      setText(vC, `£${fmtPrice(eta > 0 ? ps - pr / eta : NaN)}/${unitS}`);
      setText(vPs, `£${fmtPrice(ps)}/${unitS}`);
      setText(vD, `${fmt(e.demand)} ${unitS}/s`);
      setText(vR, `${fmt(e.resourceUse)} ${unitR}/s`);
      setText(vR0, `${fmt(r0)} ${unitR}/s`);
      setText(vRp, `${fmt(e.promisedR)} ${unitR}/s`);
      setText(vRb, ctx.state.flags?.revealed ? (e.rebound != null ? pct(e.rebound, false) : '—') : '?');
    };
  }, { label: `${label}: the working`, cls: 'small-sheet' });
}

/* ------------------------------------------------------------------ */
/* Hindsight shop                                                      */
/* ------------------------------------------------------------------ */

export function buildShop(ctx: Ctx, host: HTMLElement): () => void {
  const bal = h('span', { class: 'num' });
  host.append(h('p', { class: 'shop-bal' }, h('span', { class: 'muted', text: 'Hindsight to spend ' }), bal));
  const items: (() => void)[] = [];
  const kh = h('section', { class: 'shop-col kh' }, h('h3', { text: 'Know-how' }), h('p', { class: 'shop-k', text: 'The obvious buy.' }));
  const inst = h('section', { class: 'shop-col inst' }, h('h3', { text: 'Institutions' }), h('p', { class: 'shop-k', text: 'The slow buy.' }));
  for (const k of ctx.content.knowhow || []) {
    const lvl = h('span', { class: 'num muted' });
    const c = h('span', { class: 'btn-c num' });
    const b = h('button', { class: 'btn', type: 'button', onclick: () => ctx.act('buyKnowhow', (m, s, ct) => m.buyKnowhow(s, ct, k.id)) },
      h('span', { class: 'btn-l', text: 'Learn' }), c);
    const card = h('article', { class: 'shop-item' }, h('header', null, h('h4', { text: k.name }), lvl), h('p', { class: 'shop-blurb', text: k.blurb }),
      h('p', { class: 'shop-eff', text: (k.effects || []).map((e) => effectText(ctx, e)).filter(Boolean).join(' · ') + ' per level' }), b);
    kh.append(card);
    items.push(() => {
      const have = num(ctx.state.meta?.knowhow?.[k.id]);
      const maxed = have >= num(k.maxLevel, 1);
      const cost = num(k.cost) * Math.pow(num(k.costGrowth, 1), have);
      setText(lvl, `${have}/${k.maxLevel}`);
      setText(c, maxed ? 'Learnt' : `${fmt(cost)} H`);
      b.disabled = maxed;
      setAttr(b, 'aria-disabled', !maxed && num(ctx.state.meta?.hindsight) < cost ? 'true' : null);
      cls(card, 'owned', have > 0);
    });
  }
  for (const k of ctx.content.institutions || []) {
    const req = h('p', { class: 'shop-req' });
    const c = h('span', { class: 'btn-c num' });
    const b = h('button', { class: 'btn', type: 'button', onclick: () => ctx.act('buyInstitution', (m, s, ct) => m.buyInstitution(s, ct, k.id)) },
      h('span', { class: 'btn-l', text: 'Found' }), c);
    const card = h('article', { class: 'shop-item' }, h('header', null, h('h4', { text: k.name })), h('p', { class: 'shop-blurb', text: k.blurb }),
      h('p', { class: 'shop-eff', text: (k.effects || []).map((e) => effectText(ctx, e)).filter(Boolean).join(' · ') }), req, b);
    inst.append(card);
    items.push(() => {
      const meta = ctx.state.meta;
      const have = !!meta?.institutions?.[k.id];
      const missing = (k.requires || []).filter((r) => !meta?.institutions?.[r]);
      const names = missing.map((r) => ctx.content.institutions.find((x) => x.id === r)?.name ?? r);
      setText(req, missing.length ? `Needs: ${names.join(', ')}` : '');
      show(req, missing.length > 0 && !have);
      setText(c, have ? 'Established' : `${fmt(k.cost)} H`);
      b.disabled = have;
      setAttr(b, 'aria-disabled', !have && (missing.length > 0 || num(meta?.hindsight) < k.cost) ? 'true' : null);
      cls(card, 'owned', have);
    });
  }
  host.append(h('div', { class: 'shop-cols' }, kh, inst));
  return () => {
    setText(bal, fmt(Math.floor(num(ctx.state.meta?.hindsight))));
    for (const u of items) u();
  };
}

export function shopSheet(ctx: Ctx, sheets: Sheets, after?: () => void): void {
  sheets.open('shop', (b, close) => {
    const u = buildShop(ctx, b);
    if (after) b.append(h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); after(); } }, 'Begin the next run')));
    return u;
  }, { label: 'Hindsight', cls: 'shop-sheet', blocking: !!after, dismissable: !after });
}

/* ------------------------------------------------------------------ */
/* The Reckoning                                                       */
/* ------------------------------------------------------------------ */

const CAUSE: Partial<Record<EraId, { exhausted: string; collapse: string }>> = {
  steam: { exhausted: 'The seams are spent', collapse: 'The air gives out' },
  light: { exhausted: 'The gasworks go dark', collapse: 'A fog that will not lift' },
  motion: { exhausted: 'The pumps run dry', collapse: 'The sky is full' },
  compute: { exhausted: 'The grid says no', collapse: 'The heat has nowhere to go' },
  code: { exhausted: 'Nobody has the attention left', collapse: 'Nobody can read it any more' },
};

function causeHeadline(ctx: Ctx, cause: ReckoningCause, era?: EraId): string {
  if (cause === 'chosen') return 'The books are closed';
  const def = era ? eraDef(ctx, era) : undefined;
  const c = era ? CAUSE[era] : undefined;
  if (c) return c[cause];
  return cause === 'exhausted' ? `No ${lower(def?.resource.name ?? 'fuel')} left` : `${def?.pressure.name ?? 'Pressure'} past bearing`;
}

export function pendingSheet(ctx: Ctx, sheets: Sheets, onFaced: () => void): void {
  const p = ctx.d?.pendingReckoning;
  if (!p) return;
  const def = p.era ? eraDef(ctx, p.era) : undefined;
  sheets.open('pending', (b) => {
    const yr = Math.floor(num(ctx.d?.year, 1780));
    const stand = p.cause === 'exhausted'
      ? `The last of the ${lower(def?.resource.name ?? 'reserve')} was got up in ${yr}, after ${dur(ctx.state.time)} of improvement. Every engine in the country is more efficient than it has ever been.`
      : `${def?.pressure.crisisName ?? 'The crisis'}, and this time it does not lift. ${yr}, after ${dur(ctx.state.time)} of improvement.`;
    b.append(
      h('div', { class: 'paper' },
        h('div', { class: 'paper-mast' }, h('span', { text: 'Special edition' }), h('span', { class: 'num', text: String(yr) })),
        h('h1', { class: 'paper-head', text: causeHeadline(ctx, p.cause, p.era) }),
        h('p', { class: 'paper-stand', text: stand }),
        h('p', { class: 'paper-h' }, h('span', { class: 'muted', text: 'Hindsight to be had: ' }), h('b', { class: 'num', text: fmt(num(ctx.d?.hindsightIfReckonNow)) }))),
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary big', type: 'button', onclick: onFaced }, 'Face the Reckoning')));
  }, { label: 'The Reckoning', full: true, blocking: true, dismissable: false, cls: 'reckon-sheet' });
}

export function summarySheet(ctx: Ctx, sheets: Sheets, onDone: () => void): void {
  const lr = ctx.state.meta?.lastRun;
  sheets.open('summary', (b, close) => {
    if (!lr) { b.append(h('p', { text: 'The books are closed.' })); }
    else {
      const eras = eraIds(ctx.content).filter((id) => lr.eras?.[id]);
      let mx = 2;
      for (const id of eras) { const r = lr.eras[id]!; mx = Math.max(mx, num(r.etaFold, 1), num(r.peakRFold, 1)); }
      const w = (x: number) => (clamp((Math.log2(Math.max(1, num(x, 1))) + 0.35) / (Math.log2(mx) + 0.35), 0.03, 1) * 100).toFixed(1) + '%';
      b.append(
        h('div', { class: 'paper' },
          h('div', { class: 'paper-mast' }, h('span', { text: 'The year’s accounts' }), h('span', { class: 'num', text: String(Math.floor(num(lr.yearReached, 1780))) })),
          h('h1', { class: 'paper-head', text: causeHeadline(ctx, lr.cause, lr.causeEra) }),
          h('p', { class: 'paper-stand num', text: `${dur(lr.seconds)} of play · peak wellbeing ${fmt(Math.floor(num(lr.peakWellbeing)))}` }),
          h('div', { class: 'acct' }, ...eras.map((id) => {
            const r = lr.eras[id]!, def = eraDef(ctx, id);
            return h('div', { class: 'acct-era', 'data-theme': def?.theme ?? '' },
              h('h3', { text: `${def?.name ?? id}` }),
              h('div', { class: 'acct-row eff' }, h('span', { class: 'acct-l', text: 'Efficiency' }),
                h('span', { class: 'acct-bar' }, h('span', { style: `width:${w(r.etaFold)}` })), h('span', { class: 'acct-v num', text: fold(r.etaFold) })),
              h('div', { class: 'acct-row use' }, h('span', { class: 'acct-l', text: `Peak ${lower(def?.resource.name ?? 'resource')} use` }),
                h('span', { class: 'acct-bar' }, h('span', { style: `width:${w(r.peakRFold)}` })), h('span', { class: 'acct-v num', text: fold(r.peakRFold) })),
              h('p', { class: 'acct-tot num', text: `${fmt(r.resourceUsed)} ${def?.resource.unit ?? ''} burned in all` }));
          })),
          h('p', { class: 'paper-h big' }, h('span', { class: 'muted', text: 'Hindsight gained ' }), h('b', { class: 'num', text: fmt(num(lr.hindsightGained)) }))));
    }
    b.append(h('div', { class: 'sheet-foot' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => { shopSheet(ctx, sheets, onDone); } }, 'Spend Hindsight'),
      h('button', { class: 'btn', type: 'button', onclick: () => { close(); onDone(); } }, 'Begin again')));
  }, { label: 'Run summary', full: true, blocking: true, dismissable: false, cls: 'reckon-sheet' });
}

export function confirmReckonSheet(ctx: Ctx, sheets: Sheets, onYes: () => void): void {
  sheets.open('confirm', (b, close) => {
    const hv = h('b', { class: 'num' });
    b.append(h('p', { class: 'confirm-q', text: 'Close the books on this run and start again from 1780?' }),
      h('p', null, h('span', { class: 'muted', text: 'Hindsight you would take: ' }), hv),
      h('p', { class: 'muted small', text: 'Know-how and Institutions are kept. Capital, improvements and levers are not.' }),
      h('div', { class: 'sheet-foot' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); onYes(); } }, 'Close the books'),
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Not yet')));
    return () => setText(hv, fmt(num(ctx.d?.hindsightIfReckonNow)));
  }, { label: 'Call a Reckoning', cls: 'small-sheet' });
}

export function winSheet(ctx: Ctx, sheets: Sheets): void {
  sheets.open('win', (b, close) => {
    b.append(h('div', { class: 'paper' },
      h('div', { class: 'paper-mast' }, h('span', { text: 'Late final' }), h('span', { class: 'num', text: String(Math.floor(num(ctx.d?.year))) })),
      h('h1', { class: 'paper-head', text: 'Steady State' }),
      h('p', { class: 'paper-stand', text: `${STEADY_STATE_YEARS} years of a decent life on falling use, in every age at once. Nobody is quite sure when it happened. The engines kept improving; the burning stopped following them.` }),
      h('p', { class: 'muted', text: 'The game carries on. So, presumably, does everyone.' })),
      h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: close }, 'Carry on')));
  }, { label: 'Credits', full: true, cls: 'reckon-sheet' });
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
      [lTot, vTot] = stat('Time played'), [lFar, vFar] = stat('Furthest era');
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
      h('div', { class: 'formula' }, h('div', { class: 'f-line', text: 'R = D(pₛ) ÷ η' }), h('div', { class: 'f-line', text: 'pₛ = pᵣ ÷ η + c' })),
      h('p', { text: 'R is resource burned, D demand for the service, η efficiency, pₛ the price of the service, pᵣ the price of the resource, c everything else.' }),
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
    b.append(h('section', { class: 'm-sec save' }, h('h3', { text: 'Save' }),
      h('div', { class: 'm-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => {
          const t = hooks.exportText();
          setText(status, download(`rebound-${Math.floor(num(ctx.d?.year))}.txt`, t) ? 'Save downloaded.' : 'Download blocked; copy the text below instead.');
          ta.value = t;
        } }, 'Download save'),
        h('label', { class: 'btn', for: 'save-file' }, 'Load from file'), file),
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
    if (ctx.mock) b.append(h('p', { class: 'muted small', text: 'Running on the development stand-in model (#mock). Nothing is saved.' }));

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
      const far = eraIds(ctx.content).find((id) => ctx.content.eras[id].index === num(m?.furthestEra, 1));
      setText(vFar, far ? ctx.content.eras[far].name : '—');
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
