// M5: the Treaty in the shop, between runs (Derived.treaty): Precedent, the Treaty itself when it can be signed, and the
// Articles bought with Precedent (kept for good). Shown only once office is taken and feature 'treaty' is on.
import type { Ctx } from './ctx';
import { h, setText, show, setAttr, cls } from './dom';
import { fmt, num } from './fmt';
import { MINISTRY_TEXT as MT } from '../content/officeText';

export function treatyBox(ctx: Ctx): { el: HTMLElement; update(): void } {
  const prec = h('b', { class: 'num' });
  const signL = h('span', { class: 'btn-l' });
  const sign = h('button', { class: 'btn primary', type: 'button', onclick: () => ctx.act('treaty', (m, s, c) => m.treaty(s, c)) }, signL);
  const list = h('div', { class: 'art-list' });
  const el = h('section', { class: 'treaty-box', 'aria-label': 'The Treaty', hidden: true },
    h('h3', { text: `${MT.treatyTitle} · ${MT.articles}` }), h('p', null, h('span', { class: 'muted', text: `${MT.precedent} ` }), prec), sign, list);
  const rows = new Map<string, { b: HTMLButtonElement; row: HTMLElement }>();
  let key = '';
  function update(): void {
    const t = ctx.d?.treaty;
    show(el, !!t);
    if (!t) return;
    setText(prec, fmt(Math.floor(num(t.precedent))));
    show(sign, t.available);
    setText(signL, `Sign ${MT.treatyTitle.replace(/^The/, "the")}: +${fmt(Math.floor(num(t.precedentIfNow)))} ${MT.precedent}`);
    const k = t.articles.map((a) => a.def.id).join(',');
    if (k !== key) {
      key = k; rows.clear();
      list.replaceChildren(...t.articles.map((a) => {
        const b = h('button', { class: 'btn small', type: 'button', onclick: () => ctx.act('buyArticle', (m, s, c) => m.buyArticle(s, c, a.def.id)) }, `${fmt(a.def.cost)} ${MT.precedent}`);
        const row = h('div', { class: 'art' }, h('span', null, h('b', { text: a.def.name }), a.def.blurb ? h('span', { class: 'muted', text: ` ${a.def.blurb}` }) : null), b);
        rows.set(a.def.id, { b, row });
        return row;
      }));
    }
    for (const a of t.articles) {
      const r = rows.get(a.def.id); if (!r) continue;
      show(r.row, a.offered || a.bought);
      setText(r.b, a.bought ? '✓' : `${fmt(a.def.cost)} ${MT.precedent}`);
      setAttr(r.b, 'aria-disabled', a.canBuy ? null : 'true');
      cls(r.row, 'bought', a.bought);
    }
  }
  return { el, update };
}
