// The world strip: broadsheet, the illustrated scene of the selected industry, and the big sell button.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sd, lookFor, openSectors } from './ctx';
import type { SectorDef, SectorId } from '../types';
import { h, setText, setAttr, show, cls, reducedMotion, motionOverride } from './dom';
import { fmt, money, fmtPrice, pct, num, clamp, lower } from './fmt';
import { infoBtn } from './gauges';
import { createScene, sceneViewFrom, type SceneView } from './scene';

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
/* The world: one illustrated scene per page (src/ui/scene/)           */
/* ------------------------------------------------------------------ */
// THE SEAM. `createWorldRenderer(host, opts)` returns { update(view), setSector(id), select(appId), destroy() }; the
// view is the scene's SceneView, built by its pure adapter `sceneViewFrom` (the only code that reads the contract for
// the picture). The scene's own card under the picture is the selection panel (Found lives there); this file keeps
// the frame around it: the title, the weather in words and the service price.

export interface WorldRendererOpts {
  /** The player asked to found an application. Returns true if the model accepted it. */
  onFound(appId: string): boolean;
  onSelect?(appId: string | null): void;
}
export interface WorldRenderer {
  update(view: SceneView): void;
  setSector(id: SectorId): void;
  select(appId: string | null): void;
  setReducedMotion(on: boolean | null): void;
  destroy(): void;
}

export function createWorldRenderer(host: HTMLElement, opts: WorldRendererOpts): WorldRenderer {
  const scene = createScene(host, {
    onFound: (id) => { opts.onFound(id); },
    onSelect: (id) => opts.onSelect?.(id),
    card: true,
    money, num: fmt,
    reducedMotion: motionOverride() ?? undefined,
  });
  return {
    update: (v) => scene.update(v),
    setSector: (id) => scene.setSector(id),
    select: (id) => scene.select(id),
    setReducedMotion: (on) => scene.setReducedMotion(on),
    destroy: () => scene.destroy(),
  };
}

const WEATHER = ['clear', 'light', 'thickening', 'heavy', 'choking'];
const CLUTTER = ['tidy', 'growing', 'sprawling', 'tangled', 'unreadable'];

/** Pressure in words: "Smog: heavy (62%)". */
function pressureWords(def: SectorDef, pf: number): string {
  const words = def.pressureSource === 'service' ? CLUTTER : WEATHER;
  const w = words[pf < 0.08 ? 0 : pf < 0.3 ? 1 : pf < 0.55 ? 2 : pf < 0.8 ? 3 : 4];
  return `${def.pressure.name}: ${w}${pf >= 0.08 ? ` (${pct(pf, false)})` : ''}`;
}

export interface WorldComp extends Comp {
  /** Scroll target for an application, with the scene's card opened on it. */
  focusApp(appId: string): HTMLElement;
}

export function buildWorld(ctx: Ctx): WorldComp {
  // The picture needs no heading on screen (its caption names the place); the heading stays for screen readers. The
  // weather in words and the service price share one quiet line under it.
  const title = h('h2', { class: 'vh' });
  const price = h('span', { class: 'price num' });
  const sky = h('span', { class: 'sky num' });
  const priceRow = h('div', { class: 'price-row' }, price, infoBtn(ctx, 'price', 'the service price'), sky);
  const mount = h('div', { class: 'world-mount' });
  const el = h('section', { class: 'apps', 'aria-label': 'Uses of the service' }, title, mount, priceRow);
  const renderer = createWorldRenderer(mount, {
    onFound: (appId) => ctx.act('foundApp', (m, s, c) => m.foundApp(s, c, appId)),
  });
  let sector = '';
  let motion = '';
  // Applications already known to be available (per sector), to say once when a new use becomes thinkable.
  const known = new Map<SectorId, Set<string>>();

  function update(): void {
    const def = sectorDef(ctx);
    if (!def) return;
    if (def.id !== sector) { sector = def.id; renderer.setSector(def.id); }
    const m = document.documentElement.getAttribute('data-motion') ?? '';
    if (m !== motion) { motion = m; renderer.setReducedMotion(motionOverride()); }
    renderer.update(sceneViewFrom(ctx.content, ctx.state, ctx.d, def.id));
    const e = sd(ctx);
    setText(title, `Uses of ${lower(def.service.name)}`);
    setText(price, e ? `${def.service.name} sells at £${fmtPrice(e.servicePrice)} per ${def.service.unit}` : '');
    const pf = clamp(num(e?.pressureFraction), 0, 1.2);
    // The caption under the picture says the weather in words; this line carries the figure.
    setText(sky, `${def.pressure.name} ${pf >= 0.005 ? pct(pf, false) : 'nil'}`);
    setAttr(sky, 'title', pressureWords(def, pf));
    cls(sky, 'bad', pf >= 0.55);

    // A new use becomes thinkable in any open industry: say so once, with a way there (the player may be scrolled
    // well away from the picture). The first look at an industry only records what is there.
    for (const id of openSectors(ctx)) {
      const sdef = sectorDef(ctx, id), apps = ctx.d?.sectors?.[id]?.apps;
      if (!sdef || !apps) continue;
      const now = new Set(sdef.applications.filter((a) => apps[a.id]?.available && !apps[a.id]?.founded).map((a) => a.id));
      const before = known.get(id);
      if (before && !ctx.d?.pendingReckoning) {
        for (const a of sdef.applications) if (now.has(a.id) && !before.has(a.id)) {
          ctx.toast(`A new use is thinkable: ${a.name}${id !== ctx.sector ? ` (${sdef.name})` : ''}. Founding it costs ${money(num(a.foundCost))}.`,
            { label: 'Show me', run: () => { if (id !== ctx.sector) ctx.selectSector(id); jump(a.id); } });
        }
      }
      known.set(id, now);
    }
  }

  function focusApp(appId: string): HTMLElement {
    renderer.select(appId);
    return el;
  }
  function jump(appId: string): void {
    focusApp(appId);
    const cockpit = document.querySelector('.cockpit');
    const cr = cockpit?.getBoundingClientRect();
    const beside = !!cr && cr.right <= el.getBoundingClientRect().left + 1;
    const top = el.getBoundingClientRect().top + window.scrollY - (beside || !cr ? 16 : cr.height + 8);
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
  return { el, update, focusApp, reset() { known.clear(); } } as WorldComp & { reset(): void };
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
    // Shrink once a tap is worth less than half a second of income (Derived.clickValue < 0.5 × incomePerSec): tapping
    // has become a garnish. Click value is clickFlat + clickSeconds × income, so with clickSeconds ≥ 0.5 in content this
    // never fires; whether a click should fade is the balance lane's call (e.g. a falling clickSeconds), not the UI's.
    const ip = num(ctx.d?.incomePerSec);
    cls(el, 'small', ip > 0 && v < 0.5 * ip);
  }
  return { el, update };
}
