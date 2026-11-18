// Pinned top bar (year, capital, mandate, wellbeing, menu) and the era tabs.
import type { Ctx, Comp } from './ctx';
import { eraDef, eraWarning, ed, openEras } from './ctx';
import type { EraId } from '../types';
import { h, svg, setText, setStyle, show, cls, setAttr, syncChildren } from './dom';
import { fmt, money, fmtPrice, num, clamp } from './fmt';
import { UI_ICONS } from './icons';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

export function buildTopbar(ctx: Ctx): Comp {
  const year = h('span', { class: 'tb-v num' });
  const cap = h('span', { class: 'tb-v num' });
  const inc = h('span', { class: 'tb-s num' });
  const man = h('span', { class: 'tb-v num' });
  const manRate = h('span', { class: 'tb-s num' });
  const wb = h('span', { class: 'tb-v num' });
  const wbFill = h('span', { class: 'wb-fill' });
  const wbBar = h('span', { class: 'wb-bar', 'aria-hidden': 'true' }, wbFill, h('span', { class: 'wb-tgt' }));
  const cell = (cl: string, label: string, ...kids: Node[]) =>
    h('div', { class: 'tb-cell ' + cl }, h('span', { class: 'tb-l', text: label }), h('span', { class: 'tb-row' }, ...kids));
  const cYear = cell('tb-year', 'Year', year);
  const cCap = cell('tb-cap', 'Capital', cap, inc);
  const cMan = cell('tb-man', 'Mandate', man, manRate);
  const cWb = cell('tb-wb', 'Wellbeing', wb, wbBar);
  const menu = h('button', { class: 'tb-menu', type: 'button', 'aria-label': 'Menu', onclick: () => ctx.openMenu() });
  menu.append(svg(UI_ICONS.menu));
  const el = h('div', { class: 'topbar' }, cYear, cCap, cMan, cWb, menu);

  function update(): void {
    const d = ctx.d, s = ctx.state, g = ctx.content.global;
    setText(year, String(Math.floor(num(d?.year, 1780))));
    setText(cap, money(s.capital));
    const ip = num(d?.incomePerSec);
    setText(inc, `+${money(ip)}/s`);
    const showMan = !!s.flags?.revealed || num(s.mandate) > 0;
    show(cMan, showMan);
    if (showMan) {
      setText(man, fmt(Math.floor(num(s.mandate))));
      const mr = num(d?.mandatePerSec);
      setText(manRate, `${mr >= 0 ? '+' : '−'}${fmt(Math.abs(mr))}/s`);
      cls(cMan, 'draining', mr < 0);
    }
    const w = num(d?.wellbeing), tgt = num(g?.wellbeingTarget, 1) || 1;
    setText(wb, `${Math.floor(w)}/${fmt(tgt)}`);
    const scale = Math.max(tgt * 1.5, w);
    setStyle(wbFill, 'width', (clamp(w / scale, 0, 1) * 100).toFixed(1) + '%');
    setStyle(wbBar, '--tgt', (clamp(tgt / scale, 0, 1) * 100).toFixed(1) + '%');
    cls(cWb, 'met', w >= tgt);
  }
  return { el, update };
}

export function buildTabs(ctx: Ctx): Comp {
  const el = h('nav', { class: 'tabs', 'aria-label': 'Eras' });
  const btns = new Map<EraId, HTMLButtonElement>();
  const lockName = h('span', { class: 'tab-name' });
  const lockSub = h('span', { class: 'tab-sub num' });
  const locked = h('button', { class: 'tab locked', type: 'button', onclick: () => explainLocked() },
    svg(UI_ICONS.lock), h('span', { class: 'tab-txt' }, lockName, lockSub));
  let key = '';

  function explainLocked(): void {
    const n = ctx.d?.nextEra;
    if (!n) return;
    const def = eraDef(ctx, n.id), prevId = ctx.content.eras ? (Object.values(ctx.content.eras).find((e) => e.index === (def?.index ?? 0) - 1)?.id) : undefined;
    const prev = prevId ? eraDef(ctx, prevId) : undefined;
    const svc = prev ? prev.service.name.toLowerCase() : 'the previous service';
    const unit = prev ? prev.service.unit : '';
    const rk = n.reckoningsNeeded > 0 ? ` and ${n.reckoningsNeeded} Reckoning${n.reckoningsNeeded === 1 ? '' : 's'} behind you (you have ${n.reckoningsHave})` : '';
    ctx.toast(`${def?.name ?? 'The next era'} opens when ${svc} sells below ${money(n.priceNeeded).replace(/^£/, '£')}${unit ? '/' + unit : ''}${rk}.`);
  }

  function tabFor(id: EraId): HTMLButtonElement {
    let b = btns.get(id);
    if (!b) {
      const def = eraDef(ctx, id);
      b = h('button', { class: 'tab', type: 'button', 'data-theme': def?.theme ?? '', onclick: () => ctx.selectEra(id) },
        h('span', { class: 'tab-num', text: ROMAN[def?.index ?? 0] ?? '' }),
        h('span', { class: 'tab-txt' }, h('span', { class: 'tab-name', text: def?.name ?? id })),
        h('span', { class: 'tab-dot', 'aria-hidden': 'true' }));
      btns.set(id, b);
    }
    return b;
  }

  function update(): void {
    const ids = openEras(ctx);
    const n = ctx.d?.nextEra ?? null;
    const k = ids.join(',') + '|' + (n ? n.id : '');
    if (k !== key) {
      key = k;
      const nodes: Node[] = ids.map(tabFor);
      if (n) nodes.push(locked);
      syncChildren(el, nodes);
    }
    for (const id of ids) {
      const b = tabFor(id);
      const sel = id === ctx.era;
      cls(b, 'sel', sel);
      setAttr(b, 'aria-current', sel ? 'page' : null);
      cls(b, 'warn', eraWarning(ctx, id));
    }
    if (n) {
      const def = eraDef(ctx, n.id);
      setText(lockName, def?.name ?? n.id);
      const parts: string[] = [];
      const pn = num(n.priceNow, NaN);
      parts.push(Number.isFinite(pn) ? `£${fmtPrice(pn)} → £${fmtPrice(n.priceNeeded)}` : `at £${fmtPrice(n.priceNeeded)}`);
      const need = num(n.reckoningsNeeded) - num(n.reckoningsHave);
      if (need > 0) parts.push(`${need} more Reckoning${need === 1 ? '' : 's'}`);
      setText(lockSub, parts.join(' · '));
      setAttr(locked, 'aria-label', `${def?.name ?? n.id}, locked: ${parts.join(', ')}`);
    }
    void ed;
  }
  return { el, update };
}
