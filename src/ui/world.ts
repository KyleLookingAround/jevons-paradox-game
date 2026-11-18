// The world strip: broadsheet, application vignettes under their weather, and the big sell button.
import type { Ctx, Comp } from './ctx';
import { eraDef, ed, clickValue } from './ctx';
import type { ApplicationDef, EraDef, EraId } from '../types';
import { h, svg, setText, setStyle, setAttr, show, cls, syncChildren, reducedMotion } from './dom';
import { fmt, money, fmtPrice, pct, num, clamp, lower } from './fmt';
import { iconMarkup } from './icons';
import { infoBtn } from './gauges';

/* ------------------------------------------------------------------ */
/* Broadsheet                                                          */
/* ------------------------------------------------------------------ */

const MASTHEAD: Record<string, string> = {
  ledger: 'The Colliery Gazette',
  gaslight: 'The Evening Lamp',
  chrome: 'The Motorist',
  terminal: '/var/log/news',
  agentic: 'CHANGELOG.md',
};

export function buildNews(ctx: Ctx): Comp {
  const mast = h('span', { class: 'mast' });
  const yr = h('span', { class: 'news-yr num' });
  const txt = h('span', { class: 'news-txt' });
  const more = h('span', { class: 'news-more', 'aria-hidden': 'true' });
  const head = h('button', { class: 'news-head', type: 'button', 'aria-expanded': 'false', onclick: () => toggle() },
    h('span', { class: 'news-top' }, mast, yr, more), txt);
  const list = h('ol', { class: 'news-list', hidden: true });
  const el = h('section', { class: 'news', 'aria-label': 'Broadsheet' }, head, list);
  let open = false, lastKey = '', listKey = '';

  function toggle(): void {
    open = !open;
    setAttr(head, 'aria-expanded', String(open));
    show(list, open);
    listKey = '';
    update();
  }

  function update(): void {
    const theme = eraDef(ctx)?.theme ?? 'ledger';
    setText(mast, MASTHEAD[theme] ?? 'The Broadsheet');
    const news = Array.isArray(ctx.state.news) ? ctx.state.news : [];
    const top = news[0];
    setText(more, news.length > 1 ? (open ? 'Fold' : `${news.length} items`) : '');
    const k = top ? `${top.time}|${top.text}` : '';
    if (k !== lastKey) {
      const fresh = lastKey !== '' && !!top;
      lastKey = k;
      setText(yr, top ? String(Math.floor(num(top.year, 1780))) : '');
      setText(txt, top ? top.text : 'Nothing in the papers yet. Give it time.');
      if (fresh && !reducedMotion()) {
        txt.classList.remove('fresh'); void txt.offsetWidth; txt.classList.add('fresh');
      }
    }
    if (open && listKey !== k + news.length) {
      listKey = k + news.length;
      const items = news.slice(1, 40).map((n) =>
        h('li', null, h('span', { class: 'num', text: String(Math.floor(num(n.year, 1780))) }), h('span', { text: n.text })));
      list.replaceChildren(...(items.length ? items : [h('li', { class: 'muted', text: 'No back issues.' })]));
    }
  }
  return { el, update };
}

/* ------------------------------------------------------------------ */
/* Applications and weather                                            */
/* ------------------------------------------------------------------ */

type AppStatus = 'unknown' | 'avail' | 'founded';

interface AppCard {
  el: HTMLElement;
  update(def: EraDef, a: ApplicationDef): void;
}

function makeAppCard(ctx: Ctx, era: EraId, a: ApplicationDef): AppCard {
  const pict = h('div', { class: 'app-pict' });
  const name = h('h3', { class: 'app-name' });
  const dem = h('span', { class: 'app-dem num' });
  const ad = h('span', { class: 'app-ad num' });
  const fill = h('span', { class: 'app-fill' });
  const bar = h('div', { class: 'app-bar', 'aria-hidden': 'true' }, fill);
  const blurb = h('p', { class: 'app-blurb' });
  const fFill = h('span', { class: 'btn-fill', 'aria-hidden': 'true' });
  const fLbl = h('span', { class: 'btn-l' });
  const found = h('button', { class: 'btn found', type: 'button', onclick: () => {
    if (!ctx.act('foundApp', (m, s, c) => m.foundApp(s, c, a.id))) nudge(found);
  } }, fFill, fLbl);
  const meta = h('div', { class: 'app-meta' }, dem, ad);
  const el = h('article', { class: 'app', 'data-app': a.id }, pict, h('div', { class: 'app-body' }, name, meta, bar, blurb, found));
  let status: AppStatus | '' = '';
  let acts: Element[] = [];
  let lit = -1;

  function setStatus(st: AppStatus): void {
    status = st;
    el.className = 'app ' + st;
    pict.replaceChildren(svg(iconMarkup(a.icon, st === 'unknown')));
    acts = Array.from(pict.querySelectorAll('.act'));
    lit = -1;
  }

  function update(def: EraDef): void {
    const view = ed(ctx, era)?.apps?.[a.id];
    const st: AppStatus = view?.founded ? 'founded' : view?.available ? 'avail' : 'unknown';
    if (st !== status) setStatus(st);
    const unit = def.service.unit;
    if (st === 'unknown') {
      setText(name, '?');
      setText(blurb, Number.isFinite(a.visibleBelow) ? `Thinkable below £${fmtPrice(a.visibleBelow)}/${unit}` : 'Not yet thinkable');
      show(blurb, true); show(found, false); show(meta, false); show(bar, false);
      setAttr(el, 'aria-label', 'An application not yet thinkable');
      return;
    }
    setText(name, a.name);
    setAttr(el, 'aria-label', null);
    setAttr(el, 'title', a.blurb);
    const adoption = clamp(num(view?.adoption), 0, 1);
    if (st === 'avail') {
      setText(blurb, a.blurb); show(blurb, true); show(meta, false); show(bar, false); show(found, true);
      setText(fLbl, `Found · ${money(a.foundCost)}`);
      const can = !!view?.canFound;
      setAttr(found, 'aria-disabled', can ? null : 'true');
      setStyle(fFill, 'width', can ? '0%' : (clamp(num(ctx.state.capital) / Math.max(1e-9, a.foundCost), 0, 1) * 100).toFixed(1) + '%');
    } else {
      show(blurb, false); show(found, false); show(meta, true); show(bar, true);
      setText(dem, `${fmt(num(view?.demand))} ${unit}/s`);
      setText(ad, pct(adoption, false));
      setStyle(fill, 'width', (adoption * 100).toFixed(1) + '%');
    }
    // Activity marks light up as adoption rises: the vignette fills with smoke, windows and traffic.
    const n = acts.length;
    const want = st === 'founded' ? Math.min(n, Math.round(Math.sqrt(adoption) * n + (adoption > 0.005 ? 0.5 : 0))) : 0;
    if (want !== lit) {
      lit = want;
      acts.forEach((m, i) => m.classList.toggle('on', i < want));
    }
  }
  return { el, update };
}

function nudge(btn: HTMLElement): void {
  if (reducedMotion()) return;
  btn.classList.remove('nope'); void btn.offsetWidth; btn.classList.add('nope');
}

const WEATHER = ['clear', 'light', 'thickening', 'heavy', 'choking'];
const CLUTTER = ['tidy', 'growing', 'sprawling', 'tangled', 'unreadable'];

export function buildApps(ctx: Ctx): Comp {
  const title = h('h2', { class: 'sec-t' });
  const price = h('span', { class: 'price num' });
  const priceRow = h('div', { class: 'price-row' }, price, infoBtn(ctx, 'price', 'the service price'));
  const sky = h('span', { class: 'sky num' });
  const grid = h('div', { class: 'app-grid' });
  const weather = h('div', { class: 'weather', 'aria-hidden': 'true' }, h('i', { class: 'w1' }), h('i', { class: 'w2' }), h('i', { class: 'w3' }));
  const wrap = h('div', { class: 'app-wrap' }, grid, weather);
  const el = h('section', { class: 'apps', 'aria-label': 'Applications' },
    h('header', { class: 'sec-h' }, title, sky), priceRow, wrap);
  const cards = new Map<string, AppCard>();
  let key = '';

  function update(): void {
    const def = eraDef(ctx);
    const e = ed(ctx);
    if (!def) { grid.replaceChildren(); return; }
    const k = def.id + '|' + def.applications.map((a) => a.id).join(',');
    if (k !== key) {
      key = k;
      syncChildren(grid, def.applications.map((a) => {
        const ck = def.id + ':' + a.id;
        let c = cards.get(ck);
        if (!c) { c = makeAppCard(ctx, def.id, a); cards.set(ck, c); }
        return c.el;
      }));
    }
    for (const a of def.applications) cards.get(def.id + ':' + a.id)?.update(def, a);

    setText(title, `Uses of ${lower(def.service.name)}`);
    setText(price, e ? `${def.service.name} sells at £${fmtPrice(e.servicePrice)} per ${def.service.unit}` : '');
    const pf = clamp(num(e?.pressureFraction), 0, 1.2);
    setStyle(wrap, '--p', Math.min(1, pf).toFixed(3));
    const words = def.pressureSource === 'service' ? CLUTTER : WEATHER;
    const w = words[pf < 0.08 ? 0 : pf < 0.3 ? 1 : pf < 0.55 ? 2 : pf < 0.8 ? 3 : 4];
    setText(sky, `${def.pressure.name}: ${w}${pf >= 0.08 ? ` (${pct(pf, false)})` : ''}`);
    cls(sky, 'bad', pf >= 0.55);
    cls(wrap, 'clutter', def.pressureSource === 'service');
  }
  return { el, update };
}

/* ------------------------------------------------------------------ */
/* The big button                                                      */
/* ------------------------------------------------------------------ */

export function buildDock(ctx: Ctx): Comp {
  const lbl = h('span', { class: 'sell-l' });
  const val = h('span', { class: 'sell-v num' });
  const pops = h('span', { class: 'pops', 'aria-hidden': 'true' });
  const pool: HTMLElement[] = [];
  for (let i = 0; i < 5; i++) { const p = h('span', { class: 'pop num' }); pool.push(p); pops.append(p); }
  let pi = 0;
  const btn = h('button', { class: 'sell', type: 'button', onclick: () => {
    const v = clickValue(ctx);
    if (ctx.act('click', (m, s, c) => m.click(s, c)) && !reducedMotion()) {
      const p = pool[pi++ % pool.length];
      p.textContent = '+' + money(v);
      p.style.setProperty('--dx', ((pi * 37) % 60 - 30) + 'px');
      p.classList.remove('go'); void p.offsetWidth; p.classList.add('go');
    }
  } }, h('span', { class: 'sell-txt' }, lbl, val), pops);
  const el = h('div', { class: 'dock' }, btn);

  function update(): void {
    const def = eraDef(ctx);
    const v = clickValue(ctx);
    setText(lbl, `Sell ${lower(def?.service.name ?? 'power')}`);
    setText(val, '+' + money(v));
    cls(el, 'small', num(ctx.d?.incomePerSec) >= 50 * Math.max(1e-9, v));
  }
  return { el, update };
}
