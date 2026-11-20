// M4: Iron's order book, a small ledger under its picture (SectorDerived.feeds): per fed Industry, its name, the feed
// factor on its machines, and under a drawn line what the feed adds to that line now. A row selects that Industry's
// tab. On a fed Industry (Steam, Light, Fishing) the same figure, from its side (SectorDerived.fed), is one line.
// Built once per Industry; rows are rebuilt only when the set of fed Industries changes; figures are patched in place.
// Holds no rules: every figure is read from the views.
import type { Ctx } from './ctx';
import { sectorDef, sd } from './ctx';
import type { SectorDerived, SectorId } from '../types';
import { h, setText, show, cls, syncChildren, setAttr } from './dom';
import { fmt, pct, num, lower } from './fmt';

/** "× 0.88" */
export const factorText = (f: number): string => `× ${num(f, 1).toFixed(2)}`;

/** Whether the order book belongs on this Industry's page: it has feeds known to the page (founded or not). */
export function hasOrderBook(e: SectorDerived | undefined): boolean {
  if (!e) return false;
  if (e.feeds) return true;
  for (const k in e.apps) if (e.apps[k]?.feeds) return true;
  return false;
}

export interface OrderBookPart { el: HTMLElement; update(e: SectorDerived): void }

export function orderBookPart(ctx: Ctx): OrderBookPart {
  const head = h('div', { class: 'ob-head', 'aria-hidden': 'true' },
    h('span', { text: 'Fed Industry' }), h('span', { text: 'Machines' }), h('span', { text: 'Adds' }));
  const list = h('ol', { class: 'ob-list', 'aria-label': 'The order book' });
  const none = h('p', { class: 'ob-none muted', text: 'No order yet: none of the uses founded feeds another Industry.' });
  const el = h('div', { class: 'orderbook' }, head, list, none);
  const rows = new Map<SectorId, { li: HTMLElement; f: HTMLElement; a: HTMLElement; btn: HTMLButtonElement }>();
  let key = '';

  function rowFor(id: SectorId) {
    let r = rows.get(id);
    if (!r) {
      const nm = sectorDef(ctx, id)?.name ?? id;
      const f = h('span', { class: 'ob-f num' });
      const a = h('span', { class: 'ob-a num' });
      const btn = h('button', { class: 'ob-row', type: 'button', onclick: () => ctx.selectSector(id) },
        h('span', { class: 'ob-n' }, nm, h('span', { class: 'ob-go', 'aria-hidden': 'true', text: ' →' })), f, a);
      const li = h('li', null, btn);
      r = { li, f, a, btn };
      rows.set(id, r);
    }
    return r;
  }

  return {
    el,
    update(e) {
      const feeds = Array.isArray(e.feeds) ? e.feeds : [];
      const k = feeds.map((x) => x.to).join(',');
      if (k !== key) { key = k; syncChildren(list, feeds.map((x) => rowFor(x.to).li)); }
      show(head, feeds.length > 0);
      show(none, feeds.length === 0);
      for (const x of feeds) {
        const r = rowFor(x.to);
        const tdef = sectorDef(ctx, x.to);
        setText(r.f, factorText(x.factor));
        // Under a drawn line: its share of the line; otherwise the coal it adds, per second.
        const unit = tdef?.resource.unit ?? '';
        const t = x.lineShare != null && Number.isFinite(x.lineShare) ? `+${pct(x.lineShare, false)} of its line`
          : x.rAdded != null && Number.isFinite(x.rAdded) ? `+${fmt(Math.max(0, x.rAdded))} ${unit}/s` : '—';
        setText(r.a, t);
        cls(r.a, 'worse', (x.lineShare ?? 0) > 0.005);
        setAttr(r.btn, 'aria-label', `${tdef?.name ?? x.to}: machines ${factorText(x.factor)}; ${t.replace('+', 'adds ')}. Show ${tdef?.name ?? x.to}.`);
      }
    },
  };
}

/** One line on a fed Industry: what every source's feeds do to it now (SectorDerived.fed), or '' when nothing feeds it. */
export function fedLine(ctx: Ctx, id: SectorId = ctx.sector): string {
  const e = sd(ctx, id), def = sectorDef(ctx, id);
  const f = e?.fed;
  if (!f || !def) return '';
  const res = lower(def.resource.name);
  const share = f.share != null && Number.isFinite(f.share) ? `; the feeds add ${pct(f.share, false)} to its ${res}` : '';
  return `Fed by the order book: its machines ${factorText(f.factor)}${share}.`;
}
