// Pinned top bar (year and age, capital, mandate, wellbeing, menu) and the industry tabs.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sectorWarning, openSectors, sectorIndex, roman, ageDef, lookFor, leversVisible } from './ctx';
import type { SectorId } from '../types';
import { h, svg, setText, setStyle, setFill, show, cls, setAttr, syncChildren } from './dom';
import { fmt, money, num, clamp } from './fmt';
import { UI_ICONS } from './icons';

export function buildTopbar(ctx: Ctx): Comp {
  const year = h('span', { class: 'tb-v num' });
  const ageThe = h('span', { class: 'age-the' });
  const ageName = h('span', { class: 'age-n' });
  const ageLbl = h('span', { class: 'tb-l tb-age' }, ageThe, ageName);
  const cap = h('span', { class: 'tb-v num' });
  const inc = h('span', { class: 'tb-s num' });
  const man = h('span', { class: 'tb-v num' });
  const manRate = h('span', { class: 'tb-s num' });
  const wb = h('span', { class: 'tb-v num' });
  const wbFill = h('span', { class: 'wb-fill fillx' });
  const wbBar = h('span', { class: 'wb-bar', 'aria-hidden': 'true' }, wbFill, h('span', { class: 'wb-tgt' }));
  // Label over value; a rate gets a small line of its own under the value, so nothing is cut off on a 360 px phone
  // or in the narrow desk column.
  const cell = (cl: string, label: string | HTMLElement, rate: HTMLElement | null, ...kids: Node[]) =>
    h('div', { class: 'tb-cell ' + cl },
      h('span', { class: 'tb-lrow' }, typeof label === 'string' ? h('span', { class: 'tb-l', text: label }) : label),
      h('span', { class: 'tb-row' }, ...kids), rate ? h('span', { class: 'tb-rrow' }, rate) : null);
  const cYear = cell('tb-year', ageLbl, null, year);
  const cCap = cell('tb-cap', 'Capital', inc, cap);
  const cMan = cell('tb-man', 'Mandate', manRate, man);
  const cWb = cell('tb-wb', 'Wellbeing', null, wb, wbBar);
  const menu = h('button', { class: 'tb-menu', type: 'button', 'aria-label': 'Menu', onclick: () => ctx.openMenu() });
  menu.append(svg(UI_ICONS.menu));
  const el = h('div', { class: 'topbar' }, cYear, cCap, cMan, cWb, menu);

  function update(): void {
    const d = ctx.d, s = ctx.state, g = ctx.content.global;
    const y = String(Math.floor(num(d?.year, 1780)));
    setText(year, y);
    const age = ageDef(ctx.content, d?.age);
    const nm = age?.name ?? 'Year';
    const m = /^(The )(.*)$/.exec(nm);
    setText(ageThe, m ? m[1] : '');
    setText(ageName, m ? m[2] : nm);
    setAttr(cYear, 'title', age ? `${y} · ${age.name}` : null);
    setAttr(cYear, 'aria-label', age ? `${y}, ${age.name}` : `Year ${y}`);
    setText(cap, money(s.capital));
    const ip = num(d?.incomePerSec);
    setText(inc, `+${money(ip)}/s`);
    // Mandate is spent only on levers: it appears with the first visible lever, not with the first point earned.
    const showMan = leversVisible(ctx);
    show(cMan, showMan);
    if (showMan) {
      setText(man, fmt(Math.floor(num(s.mandate))));
      const mr = num(d?.mandatePerSec);
      setText(manRate, `${mr >= 0 ? '+' : '−'}${fmt(Math.abs(mr))}/s`);
      cls(cMan, 'draining', mr < 0);
    }
    const w = num(d?.wellbeing), tgt = num(g?.wellbeingTarget, 1) || 1;
    // A tick when the target is met, so the state never rests on the bar's colour alone (the bar hides on phones).
    setText(wb, `${Math.floor(w)}/${fmt(tgt)}${w >= tgt ? ' ✓' : ''}`);
    setAttr(cWb, 'aria-label', `Wellbeing ${Math.floor(w)} of a target of ${fmt(tgt)}${w >= tgt ? ', met' : ''}`);
    const scale = Math.max(tgt * 1.5, w);
    setFill(wbFill, w / scale, 100);
    setStyle(wbBar, '--tgt', (clamp(tgt / scale, 0, 1) * 100).toFixed(1) + '%');
    cls(cWb, 'met', w >= tgt);
  }
  return { el, update };
}

export function buildTabs(ctx: Ctx): Comp {
  const el = h('nav', { class: 'tabs', 'aria-label': 'Industries' });
  const btns = new Map<SectorId, HTMLButtonElement>();
  const locks = new Map<SectorId, { b: HTMLButtonElement; name: HTMLElement; sub: HTMLElement }>();
  let key = '';
  let shown = '';

  function tabFor(id: SectorId): HTMLButtonElement {
    let b = btns.get(id);
    if (!b) {
      const def = sectorDef(ctx, id);
      b = h('button', { class: 'tab', type: 'button', 'data-look': lookFor(ctx.content, id), onclick: () => ctx.selectSector(id) },
        h('span', { class: 'tab-num', text: roman(sectorIndex(ctx.content, id)) }),
        h('span', { class: 'tab-txt' }, h('span', { class: 'tab-name', text: def?.name ?? id })),
        h('span', { class: 'tab-dot', 'aria-hidden': 'true', text: '!' }),
        h('span', { class: 'tab-buy', 'aria-hidden': 'true' }));
      btns.set(id, b);
    }
    return b;
  }
  function lockFor(id: SectorId) {
    let l = locks.get(id);
    if (!l) {
      const name = h('span', { class: 'tab-name' });
      const sub = h('span', { class: 'tab-sub num' });
      const b = h('button', { class: 'tab locked', type: 'button', 'aria-haspopup': 'dialog', onclick: () => ctx.openLocked(id) },
        svg(UI_ICONS.lock), h('span', { class: 'tab-txt' }, name, sub));
      l = { b, name, sub };
      locks.set(id, l);
    }
    return l;
  }

  function update(): void {
    const ids = openSectors(ctx);
    const next = Array.isArray(ctx.d?.nextSectors) ? ctx.d.nextSectors : [];
    const k = ids.join(',') + '|' + next.map((n) => n.id).join(',');
    if (k !== key) {
      key = k;
      syncChildren(el, [...ids.map(tabFor), ...next.map((n) => lockFor(n.id).b)]);
    }
    for (const id of ids) {
      const b = tabFor(id);
      const sel = id === ctx.sector;
      cls(b, 'sel', sel);
      setAttr(b, 'aria-current', sel ? 'page' : null);
      const warn = sectorWarning(ctx, id);
      cls(b, 'warn', warn);
      // Something worth buying there (the affordable signal's no-nag rule applies); the open tab has the chip instead.
      const buy = !sel && (ctx.afford?.bySector.get(id) ?? 0) > 0;
      cls(b, 'can-buy', buy);
      const nm = sectorDef(ctx, id)?.name ?? id;
      setAttr(b, 'aria-label', `${nm}${warn ? ', under strain' : ''}${buy ? ', something affordable' : ''}`);
    }
    // Keep the selected tab in view when the row scrolls sideways (many industries on a phone).
    // Read layout in the next frame, not here: right after a change of look this read would force the whole page's
    // restyle and layout inside the update (measured at 55–140 ms at 4× CPU throttle).
    if (shown !== ctx.sector) {
      shown = ctx.sector;
      requestAnimationFrame(() => {
        const b = btns.get(ctx.sector);
        if (b && el.scrollWidth > el.clientWidth) {
          const left = b.offsetLeft - el.offsetLeft - 16;
          if (left < el.scrollLeft || left + b.offsetWidth + 32 > el.scrollLeft + el.clientWidth) el.scrollLeft = Math.max(0, left);
        }
      });
    }
    for (const n of next) {
      const l = lockFor(n.id);
      const def = sectorDef(ctx, n.id);
      setText(l.name, def?.name ?? n.id);
      const list = Array.isArray(n.checklist) ? n.checklist : [];
      const met = list.filter((c) => c.met).length;
      const parts: string[] = [];
      if (n.ready) parts.push('opening');
      else {
        if (list.length) parts.push(`${met} of ${list.length}`);
        const need = num(n.reckoningsNeeded) - num(n.reckoningsHave);
        if (need > 0) parts.push(`${need} more Reckoning${need === 1 ? '' : 's'}`);
      }
      setText(l.sub, parts.join(' · '));
      cls(l.b, 'ready', !!n.ready);
      setAttr(l.b, 'aria-label', `${def?.name ?? n.id}, a locked Industry: ${parts.join(', ') || 'conditions'}. Show what it needs.`);
    }
  }
  return { el, update };
}
