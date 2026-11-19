// The Commons: where restraint's money goes, and itself a rebound. Shown only while Derived.commons.available. Projects
// are grouped by Industry (CommonsDef.sector; general ones apart), this Industry's first. Every figure comes from
// commonsViews and derive(); the panel holds no rule. Views are fetched with the other views (game.ts refreshViews).
import type { Ctx, Comp } from './ctx';
import { sectorDef, sectorIds } from './ctx';
import type { CommonsView } from '../types';
import { h, setText, setAttr, setFill, show, cls, syncChildren, reducedMotion } from './dom';
import { fmt, money, num, lower } from './fmt';
import { effectText, stamp } from './panels';
import { sound } from './sound';

interface Card { el: HTMLElement; update(v: CommonsView): void }

function makeCard(ctx: Ctx, v0: CommonsView): Card {
  const def = v0.def;
  const lvl = h('span', { class: 'up-lvl num' });
  const wb = h('p', { class: 'cm-wb num' });
  const inten = h('p', { class: 'cm-in num' });
  const fx = (def.effects || []).map((e) => effectText(ctx, e)).filter(Boolean).join(' · ');
  const cost = h('span', { class: 'btn-c num' });
  const fill = h('span', { class: 'btn-fill fillx', 'aria-hidden': 'true' });
  const how = h('p', { class: 'cm-how muted num' });
  let cur: CommonsView = v0;
  const buy = h('button', { class: 'btn buy', type: 'button', onclick: () => {
    const r = el.getBoundingClientRect();
    if (ctx.act('buyCommons', (m, s, c) => m.buyCommons(s, c, def.id))) stamp(el, r, cur.level + 1 < cur.maxLevel);
    else { sound('cannotAfford'); if (!reducedMotion()) { buy.classList.remove('nope'); void buy.offsetWidth; buy.classList.add('nope'); } }
  } }, fill, h('span', { class: 'btn-l', text: 'Build' }), cost);
  const el = h('article', { class: 'up cm' },
    h('header', { class: 'up-h' }, h('h3', { class: 'up-name', text: def.name }), lvl),
    h('p', { class: 'up-blurb', text: def.blurb }), wb, inten, fx ? h('p', { class: 'up-eff', text: fx }) : null, how, buy);
  el.setAttribute('data-cm', def.id);

  function update(v: CommonsView): void {
    cur = v;
    setText(lvl, v.maxLevel > 1 ? `${v.level}/${v.maxLevel}` : v.level ? 'Built' : '');
    setText(wb, v.maxed ? `Wellbeing +${fmt(v.wellbeing)}` : v.level === 0 ? `Wellbeing +${fmt(v.nextWellbeing)} when built` : `Wellbeing +${fmt(v.wellbeing)} now, +${fmt(v.wellbeing + v.nextWellbeing)} with the next`);
    const isec = def.intensity ? sectorDef(ctx, def.intensity.sector) : undefined;
    setText(inten, isec ? (v.intensityNow > 0 ? `Draws ${fmt(v.intensityNow)} ${isec.service.unit}/s of ${lower(isec.service.name)} from ${isec.name}`
      : `Each level will draw ${fmt(def.intensity!.perLevel)} ${isec.service.unit}/s a head from ${isec.name}`) : '');
    show(inten, !!isec);
    show(buy, !v.maxed);
    if (!v.maxed && v.cost != null) {
      const fund = num(ctx.d?.commons?.fund);
      const fromFund = Math.min(fund, v.cost);
      setText(cost, money(v.cost) + (num(v.mandateCost) > 0 ? ` · ${fmt(num(v.mandateCost))} Mandate` : ''));
      setText(how, fromFund >= v.cost ? 'All from the Commons fund.' : fromFund > 0 ? `${money(fromFund)} from the fund, ${money(v.cost - fromFund)} from capital.` : 'From capital: the fund is empty.');
      setAttr(buy, 'aria-disabled', v.canBuy ? null : 'true');
      setFill(fill, v.canBuy ? 0 : (fund + num(ctx.state.capital)) / Math.max(1e-9, v.cost), 100);
    }
    show(how, !v.maxed);
    cls(el, 'afford', v.canBuy);
    cls(el, 'maxed', v.maxed);
  }
  update(v0);
  return { el, update };
}

export function buildCommons(ctx: Ctx): Comp {
  const fund = h('span', { class: 'num' });
  const wbAll = h('p', { class: 'cm-all muted num' });
  const list = h('div', { class: 'cm-list' });
  const el = h('section', { class: 'commons', 'aria-label': 'The Commons', hidden: true },
    h('header', { class: 'sec-h' }, h('h2', { class: 'sec-t', text: 'The Commons' }), h('span', { class: 'sky num' }, 'Fund ', fund)), wbAll, list);
  const cards = new Map<string, Card>();
  const groups = new Map<string, HTMLElement>();
  let key = '';

  function group(id: string): HTMLElement {
    let g = groups.get(id);
    if (!g) {
      const name = id === '' ? 'For everyone' : sectorDef(ctx, id)?.name ?? id;
      g = h('div', { class: 'cm-g' }, h('h3', { class: 'cm-gt', text: name }));
      groups.set(id, g);
    }
    return g;
  }

  function update(): void {
    const on = !!ctx.d?.commons?.available;
    show(el, on);
    if (!on) return;
    const views = (ctx.cms || []).filter((v) => v?.def && v.visible);
    setText(fund, money(num(ctx.d?.commons?.fund)));
    setText(wbAll, `The Commons add ${fmt(num(ctx.d?.commons?.wellbeing))} wellbeing now. Revenue sent to the Commons builds them first.`);
    const order = sectorIds(ctx.content);
    const gid = (v: CommonsView) => v.def.sector ?? '';
    const ids = [...new Set(views.map(gid))].sort((a, b) => (a === ctx.sector ? -2 : a === '' ? 1e6 : order.indexOf(a)) - (b === ctx.sector ? -2 : b === '' ? 1e6 : order.indexOf(b)));
    const k = ids.join(',') + '|' + views.map((v) => v.def.id).join(',');
    if (k !== key) {
      key = k;
      syncChildren(list, ids.map((id) => {
        const g = group(id);
        const kids: Node[] = [g.firstChild!];
        for (const v of views.filter((x) => gid(x) === id)) {
          let c = cards.get(v.def.id);
          if (!c) { c = makeCard(ctx, v); cards.set(v.def.id, c); }
          kids.push(c.el);
        }
        syncChildren(g, kids);
        return g;
      }));
      if (!views.length) list.replaceChildren(h('p', { class: 'empty', text: 'No projects open yet.' }));
    }
    for (const v of views) cards.get(v.def.id)?.update(v);
  }
  return { el, update };
}
