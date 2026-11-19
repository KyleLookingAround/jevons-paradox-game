// The decade dividend card. A card in the feed, never a modal: play goes on while it waits. It shows the OLDEST waiting
// offer (GameState.pendingDividends[0]), its two dividends with their one-off amounts × the offer's pace multiplier, and
// how many more wait. Choosing calls chooseDecadeDividend(sector, 0 | 1). The overflow rule is the model's; the card
// only says it.
import type { Ctx, Comp } from './ctx';
import { sectorDef } from './ctx';
import type { DividendDef, EffectDef, PendingDividend } from '../types';
import { PENDING_DIVIDENDS_MAX } from '../types';
import { h, setText, show, cls } from './dom';
import { fmt, num } from './fmt';
import { effectText, stamp } from './panels';

/** One effect of a dividend in words, with one-off amounts scaled by the offer's multiplier (the contract's rule for
 *  what `mul` scales: mandateAdd and capitalAdd). */
function divEffect(ctx: Ctx, e: EffectDef, mul: number): string {
  if (e.type === 'mandateAdd') return `+${fmt(Math.round(e.value * mul))} Mandate`;
  if (e.type === 'capitalAdd') return `${fmt(Math.round(e.value * mul))} seconds of income at once`;
  return effectText(ctx, e);
}

export function buildDividends(ctx: Ctx): Comp {
  const kicker = h('span', { class: 'dv-k' });
  const count = h('span', { class: 'dv-n num', hidden: true });
  const title = h('h2', { class: 'dv-t' });
  const opts = h('div', { class: 'dv-opts', role: 'group' });
  const note = h('p', { class: 'dv-note muted' });
  const el = h('section', { class: 'divs', 'aria-label': 'A decade dividend', hidden: true },
    h('header', { class: 'dv-h' }, kicker, count), title, opts, note);
  let key = '';

  function card(p: PendingDividend, i: 0 | 1, d: DividendDef | undefined): HTMLElement {
    const fx = (d?.effects || []).map((e) => divEffect(ctx, e, num(p.mul, 1))).filter(Boolean).join(' · ');
    const b = h('button', { class: 'dv-opt', type: 'button', onclick: () => {
      const r = b.getBoundingClientRect();
      if (ctx.act('chooseDecadeDividend', (m, s, c) => m.chooseDecadeDividend(s, c, p.sector, i))) stamp(b, r);
    } },
      h('span', { class: 'dv-on', text: d?.name ?? p.options[i] }),
      fx ? h('span', { class: 'dv-fx num', text: fx }) : null,
      d?.blurb ? h('span', { class: 'dv-ob', text: d.blurb }) : null);
    return b;
  }

  function update(): void {
    const list = Array.isArray(ctx.state.pendingDividends) ? ctx.state.pendingDividends : [];
    const p = list[0];
    show(el, !!p && !ctx.d?.pendingReckoning);
    if (!p) { key = ''; return; }
    const k = `${p.sector}:${p.decade}:${p.options.join('|')}:${p.mul}`;
    if (k !== key) {
      key = k;
      const def = sectorDef(ctx, p.sector);
      const d0 = ctx.content.dividends?.find((x) => x.id === p.options[0]);
      const d1 = ctx.content.dividends?.find((x) => x.id === p.options[1]);
      setText(kicker, `${def?.name ?? 'An Industry'} · decade ${fmt(num(p.decade))}`);
      setText(title, 'A dividend for the decade: take one');
      opts.replaceChildren(card(p, 0, d0), h('span', { class: 'fork-or', 'aria-hidden': 'true', text: 'or' }), card(p, 1, d1));
      cls(el, 'here', p.sector === ctx.sector);
    }
    const more = list.length - 1;
    show(count, more > 0);
    setText(count, `${more} more waiting`);
    setText(note, num(p.mul, 1) !== 1
      ? `Amounts include the line’s pace (×${fmt(num(p.mul, 1))}). Offers wait; past ${PENDING_DIVIDENDS_MAX}, the oldest is taken as its first option.`
      : `Offers wait as long as the run lasts; past ${PENDING_DIVIDENDS_MAX}, the oldest is taken as its first option.`);
  }
  return { el, update };
}
