// The world strip: broadsheet, application vignettes under their weather, and the big sell button.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sd, lookFor } from './ctx';
import type { ApplicationDef, AppDerived, SectorDef, SectorId } from '../types';
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
  const kicker = h('span', { class: 'news-kick', text: 'A new age' });
  const head = h('button', { class: 'news-head', type: 'button', 'aria-expanded': 'false', onclick: () => toggle() },
    h('span', { class: 'news-top' }, mast, yr, more), kicker, txt);
  const list = h('ol', { class: 'news-list', hidden: true });
  const el = h('section', { class: 'news', 'aria-label': 'Broadsheet' }, head, list);
  let open = false, lastKey = '\u0000', listKey = '';

  function toggle(): void {
    open = !open;
    setAttr(head, 'aria-expanded', String(open));
    show(list, open);
    listKey = '';
    update();
  }

  function update(): void {
    const theme = lookFor(ctx.content, ctx.sector);
    setText(mast, MASTHEAD[theme] ?? 'The Broadsheet');
    const news = Array.isArray(ctx.state.news) ? ctx.state.news : [];
    // The lead slot: a new age keeps the front page for a while (45 s of play) even as other news arrives.
    const now = num(ctx.state.time);
    const age = news.slice(0, 8).find((n) => n && n.key === 'ageBegins' && now - num(n.time) < 45 && num(n.time) <= now);
    const top = age ?? news[0];
    cls(el, 'lead-age', !!age);
    setText(more, news.length > 1 ? (open ? 'Fold' : `${news.length} items`) : '');
    const k = top ? `${top.time}|${top.text}` : '';
    if (k !== lastKey) {
      const fresh = lastKey !== '\u0000' && lastKey !== '' && !!top;
      lastKey = k;
      setText(yr, top ? String(Math.floor(num(top.year, 1780))) : '');
      setText(txt, top ? top.text : 'Nothing in the papers yet. Give it time.');
      if (fresh && !reducedMotion()) {
        txt.classList.remove('fresh'); void txt.offsetWidth; txt.classList.add('fresh');
      }
    }
    if (open && listKey !== k + news.length) {
      listKey = k + news.length;
      const items = news.filter((n) => n !== top).slice(0, 39).map((n) =>
        h('li', null, h('span', { class: 'num', text: String(Math.floor(num(n.year, 1780))) }), h('span', { text: n.text })));
      list.replaceChildren(...(items.length ? items : [h('li', { class: 'muted', text: 'No back issues.' })]));
    }
  }
  return { el, update };
}

/* ------------------------------------------------------------------ */
/* The world: applications under their weather                          */
/* ------------------------------------------------------------------ */
// THE SEAM. Everything the applications area shows comes from one plain view built by `worldView()`, and is drawn by
// one renderer created with `createWorldRenderer(host, opts)`, which returns { update(view), setSector(id), destroy() }.
// Today the renderer is the vignette grid below; the illustrated scene (src/ui/scene/) is meant to replace it by
// swapping that one call. Application detail (name, demand, adoption, Found) is a per-app record in the view, so it
// can move into a selection panel without new data.

export type AppStatus = 'unknown' | 'avail' | 'founded';
export interface WorldApp {
  def: ApplicationDef;
  status: AppStatus;
  demand: number;
  adoption: number;
  canFound: boolean;
  foundCost: number;
}
export interface WorldView {
  sector: SectorId;
  def: SectorDef;
  apps: WorldApp[];
  capital: number;
  pressureFraction: number;
  /** Pressure in words: "Smog: heavy (62%)". */
  pressureWords: string;
  pressureSource: SectorDef['pressureSource'];
}
export interface WorldRendererOpts {
  /** The player asked to found an application. Returns true if the model accepted it. */
  onFound(appId: string): boolean;
  onSelect?(appId: string): void;
}
export interface WorldRenderer { update(view: WorldView): void; setSector(id: SectorId): void; destroy(): void; }

const WEATHER = ['clear', 'light', 'thickening', 'heavy', 'choking'];
const CLUTTER = ['tidy', 'growing', 'sprawling', 'tangled', 'unreadable'];

export function worldView(ctx: Ctx): WorldView | null {
  const def = sectorDef(ctx);
  if (!def) return null;
  const e = sd(ctx);
  const apps = (def.applications || []).map((a): WorldApp => {
    const v: AppDerived | undefined = e?.apps?.[a.id];
    return {
      def: a, status: v?.founded ? 'founded' : v?.available ? 'avail' : 'unknown',
      demand: num(v?.demand), adoption: clamp(num(v?.adoption), 0, 1), canFound: !!v?.canFound, foundCost: num(a.foundCost),
    };
  });
  const pf = clamp(num(e?.pressureFraction), 0, 1.2);
  const words = def.pressureSource === 'service' ? CLUTTER : WEATHER;
  const w = words[pf < 0.08 ? 0 : pf < 0.3 ? 1 : pf < 0.55 ? 2 : pf < 0.8 ? 3 : 4];
  return {
    sector: def.id, def, apps, capital: num(ctx.state.capital), pressureFraction: pf, pressureSource: def.pressureSource,
    pressureWords: `${def.pressure.name}: ${w}${pf >= 0.08 ? ` (${pct(pf, false)})` : ''}`,
  };
}

interface AppCard { el: HTMLElement; update(a: WorldApp, unit: string, capital: number): void; }

function makeAppCard(a: ApplicationDef, opts: WorldRendererOpts): AppCard {
  const pict = h('div', { class: 'app-pict' });
  const name = h('h3', { class: 'app-name' });
  const dem = h('span', { class: 'app-dem num' });
  const ad = h('span', { class: 'app-ad num' });
  const fill = h('span', { class: 'app-fill' });
  const bar = h('div', { class: 'app-bar', 'aria-hidden': 'true' }, fill);
  const blurb = h('p', { class: 'app-blurb' });
  const fFill = h('span', { class: 'btn-fill', 'aria-hidden': 'true' });
  const fLbl = h('span', { class: 'btn-l' });
  const found = h('button', { class: 'btn found', type: 'button', onclick: () => { if (!opts.onFound(a.id)) nudge(found); } }, fFill, fLbl);
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

  function update(w: WorldApp, unit: string, capital: number): void {
    const st = w.status;
    if (st !== status) setStatus(st);
    if (st === 'unknown') {
      setText(name, '');
      setText(blurb, Number.isFinite(a.visibleBelow) ? `Thinkable below £${fmtPrice(a.visibleBelow)}/${unit}` : 'Not yet thinkable');
      show(blurb, true); show(found, false); show(meta, false); show(bar, false); show(name, false);
      setAttr(el, 'aria-label', 'A use not yet thinkable');
      return;
    }
    setText(name, a.name); show(name, true);
    setAttr(el, 'aria-label', null);
    setAttr(el, 'title', a.blurb);
    if (st === 'avail') {
      setText(blurb, a.blurb); show(blurb, true); show(meta, false); show(bar, false); show(found, true);
      setText(fLbl, `Found · ${money(w.foundCost)}`);
      setAttr(found, 'aria-disabled', w.canFound ? null : 'true');
      setStyle(fFill, 'width', w.canFound ? '0%' : (clamp(capital / Math.max(1e-9, w.foundCost), 0, 1) * 100).toFixed(1) + '%');
    } else {
      show(blurb, false); show(found, false); show(meta, true); show(bar, true);
      setText(dem, `${fmt(w.demand)} ${unit}/s`);
      setText(ad, pct(w.adoption, false));
      setStyle(fill, 'width', (w.adoption * 100).toFixed(1) + '%');
    }
    // Activity marks light up as adoption rises: the vignette fills with smoke, windows and traffic.
    const n = acts.length;
    const want = st === 'founded' ? Math.min(n, Math.round(Math.sqrt(w.adoption) * n + (w.adoption > 0.005 ? 0.5 : 0))) : 0;
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

/** The vignette grid: today's renderer behind the seam. */
export function createWorldRenderer(host: HTMLElement, opts: WorldRendererOpts): WorldRenderer {
  const grid = h('div', { class: 'app-grid' });
  const weather = h('div', { class: 'weather', 'aria-hidden': 'true' }, h('i', { class: 'w1' }), h('i', { class: 'w2' }), h('i', { class: 'w3' }));
  const wrap = h('div', { class: 'app-wrap' }, grid, weather);
  host.replaceChildren(wrap);
  const cards = new Map<string, AppCard>();
  let key = '';
  return {
    setSector() { key = ''; },
    update(v) {
      const k = v.sector + '|' + v.apps.map((a) => a.def.id).join(',');
      if (k !== key) {
        key = k;
        syncChildren(grid, v.apps.map((a) => {
          const ck = v.sector + ':' + a.def.id;
          let c = cards.get(ck);
          if (!c) { c = makeAppCard(a.def, opts); cards.set(ck, c); }
          return c.el;
        }));
      }
      for (const a of v.apps) cards.get(v.sector + ':' + a.def.id)?.update(a, v.def.service.unit, v.capital);
      setStyle(wrap, '--p', Math.min(1, v.pressureFraction).toFixed(3));
      cls(wrap, 'clutter', v.pressureSource === 'service');
    },
    destroy() { host.replaceChildren(); cards.clear(); },
  };
}

export function buildWorld(ctx: Ctx): Comp {
  const title = h('h2', { class: 'sec-t' });
  const price = h('span', { class: 'price num' });
  const priceRow = h('div', { class: 'price-row' }, price, infoBtn(ctx, 'price', 'the service price'));
  const sky = h('span', { class: 'sky num' });
  const mount = h('div', { class: 'world-mount' });
  const el = h('section', { class: 'apps', 'aria-label': 'Uses of the service' }, h('header', { class: 'sec-h' }, title, sky), priceRow, mount);
  const renderer = createWorldRenderer(mount, {
    onFound: (appId) => ctx.act('foundApp', (m, s, c) => m.foundApp(s, c, appId)),
  });
  let sector = '';

  function update(): void {
    const v = worldView(ctx);
    if (!v) return;
    if (v.sector !== sector) { sector = v.sector; renderer.setSector(v.sector); }
    renderer.update(v);
    const e = sd(ctx);
    setText(title, `Uses of ${lower(v.def.service.name)}`);
    setText(price, e ? `${v.def.service.name} sells at £${fmtPrice(e.servicePrice)} per ${v.def.service.unit}` : '');
    setText(sky, v.pressureWords);
    cls(sky, 'bad', v.pressureFraction >= 0.55);
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
    const v = num(ctx.d?.clickValue);
    if (ctx.act('click', (m, s, c) => m.click(s, c)) && !reducedMotion()) {
      const p = pool[pi++ % pool.length];
      p.textContent = '+' + money(v);
      p.style.setProperty('--dx', ((pi * 37) % 60 - 30) + 'px');
      p.classList.remove('go'); void p.offsetWidth; p.classList.add('go');
    }
  } }, h('span', { class: 'sell-txt' }, lbl, val), pops);
  const el = h('div', { class: 'dock' }, btn);

  function update(): void {
    const def = sectorDef(ctx);
    const v = num(ctx.d?.clickValue);
    setText(lbl, `Sell ${lower(def?.service.name ?? 'power')}`);
    setText(val, '+' + money(v));
    // Shrink once a tap is worth less than 1.2 seconds of income (Derived.clickValue < 1.2 × incomePerSec): the flat
    // part of a click no longer matters and tapping has become a garnish. With clickSeconds = 1 and clickFlat = 2 this
    // fires at about £10/s of income; with clickSeconds ≥ 1.2 it never fires. The ratio is the balance lane's to tune.
    const ip = num(ctx.d?.incomePerSec);
    cls(el, 'small', ip > 0 && v < 1.2 * ip);
  }
  return { el, update };
}
