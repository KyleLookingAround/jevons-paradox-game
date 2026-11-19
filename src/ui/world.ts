// The world strip: broadsheet, the illustrated scene of the selected industry, and the big sell button.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sd, lookFor, openSectors, ageOfSector } from './ctx';
import type { SectorDef, SectorId } from '../types';
import { h, setText, setAttr, show, cls, reducedMotion, motionOverride } from './dom';
import { fmt, money, fmtPrice, pct, num, clamp, lower, perUnit } from './fmt';
import { infoBtn } from './gauges';
import { createScene, sceneViewFrom, type SceneView } from './scene';
import { getPrefs, type Detail } from './prefs';
import { timed } from './prof';

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
  const kicker = h('span', { class: 'news-kick', text: 'A new Age' });
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
    // Each Industry's paper prints its own items and the general ones (NewsItem.sector), so a Steam headline never
    // sits under Code's changelog masthead.
    const news = (Array.isArray(ctx.state.news) ? ctx.state.news : []).filter((n) => n && (!n.sector || n.sector === ctx.sector));
    // The lead slot: a new age keeps the front page for a while (45 s of play) even as other news arrives.
    const now = num(ctx.state.time);
    const age = news.slice(0, 8).find((n) => n && n.key === 'ageBegins' && now - num(n.time) < 45 && num(n.time) <= now);
    const top = age ?? news[0];
    cls(el, 'lead-age', !!age);
    // A crisis takes the lead as a late extra, in the same update as the picture's fog and the gauges' alarm.
    const crisis = !age && !!top && (top.key === 'crisis' || top.key === 'collapse' || top.key === 'exhausted') && now - num(top.time) < 30;
    cls(el, 'lead-crisis', crisis);
    setText(kicker, crisis ? 'Late extra' : 'A new Age');
    setText(more, news.length > 1 ? (open ? 'Fold' : `${news.length} items`) : '');
    const k = top ? `${top.time}|${top.text}` : '';
    if (k !== lastKey) {
      const fresh = lastKey !== '\u0000' && lastKey !== '' && !!top;
      lastKey = k;
      setText(yr, top ? String(Math.floor(num(top.year, 1780))) : '');
      setText(txt, top ? top.text : 'Nothing in the papers yet.');
      if (fresh && !reducedMotion()) {
        txt.classList.remove('fresh'); void txt.offsetWidth; txt.classList.add('fresh');
      }
    }
    if (open && listKey !== ctx.sector + k + news.length) {
      listKey = ctx.sector + k + news.length;
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
  setDetail(d: Detail): void;
  destroy(): void;
}

export function createWorldRenderer(host: HTMLElement, opts: WorldRendererOpts): WorldRenderer {
  const scene = createScene(host, {
    onFound: (id) => { opts.onFound(id); },
    onSelect: (id) => opts.onSelect?.(id),
    card: true,
    money, num: fmt,
    reducedMotion: motionOverride() ?? undefined,
    detail: getPrefs().detail,
  });
  return {
    update: (v) => scene.update(v),
    setSector: (id) => scene.setSector(id),
    select: (id) => scene.select(id),
    setReducedMotion: (on) => scene.setReducedMotion(on),
    setDetail: (d) => scene.setDetail?.(d),
    destroy: () => scene.destroy(),
  };
}

const WEATHER = ['clear', 'light', 'thickening', 'heavy', 'choking'];
const CLUTTER = ['tidy', 'growing', 'sprawling', 'tangled', 'unreadable'];

/** Pressure in words: "Smoke: heavy (62%)". */
function pressureWords(def: SectorDef, pf: number): string {
  const words = def.pressureSource === 'service' ? CLUTTER : WEATHER;
  const w = words[pf < 0.08 ? 0 : pf < 0.3 ? 1 : pf < 0.55 ? 2 : pf < 0.8 ? 3 : 4];
  return `${def.pressure.name}: ${w}${pf >= 0.08 ? ` (${pct(pf, false)})` : ''}`;
}

export interface WorldComp extends Comp {
  /** Scroll target for an application, with the scene's card opened on it. */
  focusApp(appId: string): HTMLElement;
  /** Bring the picture into view (and select a place in it, if given), with a brief mark on the frame. */
  showPlace(appId: string | null): void;
  reset(): void;
}

/** Improvement cards (views of this Industry) that concern a place: they bring it within reach or change its appetite. */
function cardsFor(ctx: Ctx, appId: string): string[] {
  return (ctx.ups || []).filter((v) => v?.def && v.def.sector === ctx.sector && v.visible && !v.maxed && !v.excludedBy && (
    (v.bringsWithinReach || []).some((r) => r.appId === appId)
    || (v.def.effects || []).some((e) => (e as { app?: string }).app === appId))).map((v) => v.def.id);
}

/** A title card over the picture: a new Industry first visited, a new Age begun. Composited fade; gone in ~3 s. */
function titleCard(host: HTMLElement, kicker: string, name: string, sub: string): void {
  host.querySelector('.world-title')?.remove();
  const card = h('div', { class: 'world-title', 'aria-hidden': 'true' },
    h('span', { class: 'wt-k', text: kicker }), h('span', { class: 'wt-n', text: name }), h('span', { class: 'wt-s', text: sub }));
  host.append(card);
  setTimeout(() => card.remove(), reducedMotion() ? 2600 : 3400);
}

export function buildWorld(ctx: Ctx): WorldComp {
  // The picture needs no heading on screen (its caption names the place); the heading stays for screen readers. The
  // weather in words and the service price share one quiet line under it.
  const title = h('h2', { class: 'vh' });
  const price = h('span', { class: 'price num' });
  const sky = h('span', { class: 'sky num' });
  const priceRow = h('div', { class: 'price-row' }, price, infoBtn(ctx, 'price', 'the service price'), sky);
  // A place tapped in the picture brings its cards to hand: a line naming how many improvements concern it.
  const handN = h('span', { class: 'hand-t' });
  const hand = h('button', { class: 'hand linkish', type: 'button', hidden: true, onclick: () => toHand() }, handN);
  const mount = h('div', { class: 'world-mount' });
  const frame = h('div', { class: 'world-frame' }, mount);
  const el = h('section', { class: 'apps', 'aria-label': 'Uses of the service' }, title, frame, priceRow, hand);
  let selected: string | null = null;
  const renderer = createWorldRenderer(mount, {
    onFound: (appId) => ctx.act('foundApp', (m, s, c) => m.foundApp(s, c, appId)),
    onSelect: (appId) => { selected = appId; markHand(); },
  });
  function markHand(): void {
    const ids = selected ? cardsFor(ctx, selected) : [];
    document.querySelectorAll('.up.concerns').forEach((c) => { if (!ids.includes(c.getAttribute('data-up') ?? '')) c.classList.remove('concerns'); });
    for (const id of ids) document.querySelector(`.upgrades .up[data-up="${CSS.escape(id)}"]`)?.classList.add('concerns');
    const name = selected ? sectorDef(ctx)?.applications.find((a) => a.id === selected)?.name : undefined;
    show(hand, ids.length > 0 && !!name);
    if (ids.length && name) setText(handN, `${ids.length === 1 ? 'One improvement concerns' : `${ids.length} improvements concern`} ${name} ↓`);
  }
  function toHand(): void {
    const first = document.querySelector<HTMLElement>('.upgrades .up.concerns');
    if (!first) return;
    scrollToEl(first, 12);
    document.querySelectorAll<HTMLElement>('.upgrades .up.concerns').forEach((c) => { c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1800); });
  }
  // What the picture last showed for this Industry: an evolution of the machines, a crisis or a lever is a moment.
  let seen: { sector: string; stage: number; crises: number; levers: number } | null = null;
  const visited = new Set<SectorId>();
  let ageKey: string | null = null;
  let sector = '';
  let motion = '';
  let detail: Detail = getPrefs().detail;
  // The picture's first build is the heaviest single piece of the first frame: it waits one frame, so the page
  // (header, gauges, the sell button) paints first.
  let armed = false, arming = false;
  // Applications already known to be available (per sector), to say once when a new use comes within reach.
  const known = new Map<SectorId, Set<string>>();
  const toastOf = new Map<string, () => void>();

  function update(): void {
    const def = sectorDef(ctx);
    if (!def) return;
    // Industries already open when the page loads have been seen before: only one opened since is a first visit.
    if (sector === '') for (const id of openSectors(ctx)) visited.add(id);
    if (def.id !== sector) {
      const first = sector !== '' && !visited.has(def.id);
      sector = def.id; renderer.setSector(def.id); selected = null; markHand();
      visited.add(def.id);
      // A first visit to an Industry opened this session is an event: its name over the picture.
      if (first) titleCard(frame, ageOfSector(ctx.content, def.id)?.name ?? 'A new Industry', def.name, `${def.years}. ${def.tagline}`);
    }
    const m = document.documentElement.getAttribute('data-motion') ?? '';
    if (m !== motion) { motion = m; renderer.setReducedMotion(motionOverride()); }
    const dt = getPrefs().detail;
    if (dt !== detail) { detail = dt; renderer.setDetail(dt); }
    if (armed) {
      const view = timed('scene.view', () => sceneViewFrom(ctx.content, ctx.state, ctx.d, def.id));
      timed('scene.update', () => renderer.update(view));
      const lv = (view.levers || []).length;
      if (seen && seen.sector === def.id) {
        if (view.stage > seen.stage) moment('stage', 'The machines are rebuilt', 'See them');
        if (view.crises > seen.crises) moment('crisis');
        else if (lv > seen.levers) moment('lever', 'The lever shows in the world', 'See it');
      }
      seen = { sector: def.id, stage: view.stage, crises: view.crises, levers: lv };
    } else if (!arming) {
      arming = true;
      requestAnimationFrame(() => setTimeout(() => { armed = true; update(); }, 0));
    }
    // A new Age begun (its headline is news) is an event over the picture, as a first visit is.
    const news = Array.isArray(ctx.state.news) ? ctx.state.news : [];
    const ab = news.slice(0, 6).find((n) => n && n.key === 'ageBegins');
    const ak = ab ? `${ab.time}|${ab.text}` : '';
    if (ageKey !== null && ak && ak !== ageKey && num(ctx.state.time) - num(ab!.time) < 10) {
      const age = ab!.sector ? ageOfSector(ctx.content, ab!.sector) : undefined;
      if (age) titleCard(frame, 'A new Age', age.name, age.tagline);
    }
    ageKey = ak;
    const e = sd(ctx);
    setText(title, `Uses of ${lower(def.service.name)}`);
    // The sell button names the service; this line is the price alone, so it fits one line in every look.
    setText(price, e ? `Sells at £${fmtPrice(e.servicePrice)} per ${perUnit(def.service.unit)}` : '');
    setAttr(price, 'title', e ? `${def.service.name} sells at £${fmtPrice(e.servicePrice)} per ${perUnit(def.service.unit)}` : null);
    const pf = clamp(num(e?.pressureFraction), 0, 1.2);
    // The caption under the picture says the weather in words; this line carries the figure.
    setText(sky, `${def.pressure.name} ${pf >= 0.005 ? pct(pf, false) : 'nil'}`);
    setAttr(sky, 'title', pressureWords(def, pf));
    cls(sky, 'bad', pf >= 0.55);

    // A new use comes within reach in any open industry: say so once, with a way there (the player may be scrolled
    // well away from the picture). The first look at an industry only records what is there.
    for (const id of openSectors(ctx)) {
      const sdef = sectorDef(ctx, id), apps = ctx.d?.sectors?.[id]?.apps;
      if (!sdef || !apps) continue;
      const now = new Set(sdef.applications.filter((a) => apps[a.id]?.available && !apps[a.id]?.founded).map((a) => a.id));
      const before = known.get(id);
      if (before && !ctx.d?.pendingReckoning) {
        for (const a of sdef.applications) if (now.has(a.id) && !before.has(a.id)) {
          toastOf.set(`${id}:${a.id}`, ctx.toast(`Within reach: ${a.name}${id !== ctx.sector ? ` (${sdef.name})` : ''}. Founding it costs ${money(num(a.foundCost))}.`,
            { label: 'Show me', run: () => { if (id !== ctx.sector) ctx.selectSector(id); jump(a.id); } }));
        }
      }
      // A note about a use that has since been founded is out of date: take it down.
      for (const a of sdef.applications) if (apps[a.id]?.founded) { const k = `${id}:${a.id}`; const kill = toastOf.get(k); if (kill) { kill(); toastOf.delete(k); } }
      known.set(id, now);
    }
  }

  /**
   * A moment in the picture: a brief mark on its frame, and the page around it answers (app.ts listens for
   * `rebound:moment` to pulse the gauges with a crisis). If the picture is scrolled out of sight, a note offers a way
   * back to it, so the moment is not missed.
   */
  function moment(kind: 'stage' | 'crisis' | 'lever', note?: string, action?: string): void {
    frame.classList.remove('m-stage', 'm-crisis', 'm-lever'); void frame.offsetWidth; frame.classList.add('m-' + kind);
    setTimeout(() => frame.classList.remove('m-' + kind), 2400);
    document.dispatchEvent(new CustomEvent('rebound:moment', { detail: kind }));
    if (note && action && !inView()) ctx.toast(`${note}.`, { label: action, run: () => showPlace(null) });
  }
  function inView(): boolean {
    const r = mount.getBoundingClientRect();
    const top = document.querySelector('.cockpit')?.getBoundingClientRect();
    const beside = !!top && top.right <= r.left + 1;
    const y0 = beside || !top ? 0 : top.bottom;
    return r.bottom > y0 + 60 && r.top < innerHeight - 80;
  }
  function scrollToEl(t: HTMLElement, gap: number): void {
    const cockpit = document.querySelector('.cockpit');
    const cr = cockpit?.getBoundingClientRect();
    const beside = !!cr && cr.right <= t.getBoundingClientRect().left + 1;
    const top = t.getBoundingClientRect().top + window.scrollY - (beside || !cr ? 16 : cr.height + gap);
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
  function focusApp(appId: string): HTMLElement {
    renderer.select(appId);
    return el;
  }
  function showPlace(appId: string | null): void {
    if (appId) renderer.select(appId);
    scrollToEl(el, 8);
    frame.classList.remove('flash'); void frame.offsetWidth; frame.classList.add('flash');
    setTimeout(() => frame.classList.remove('flash'), 1800);
  }
  function jump(appId: string): void { showPlace(appId); }
  return { el, update, focusApp, showPlace, reset() { known.clear(); seen = null; } };
}

/* ------------------------------------------------------------------ */
/* The big button                                                      */
/* ------------------------------------------------------------------ */

/** The sell button's shrink threshold (display only): taps a second a keen player manages, and the share of idle income. */
const FAST_TAPS = 5, SHRINK_SHARE = 0.5;

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
    // Shrink once even fast tapping is a garnish: FAST_TAPS taps a second worth less than SHRINK_SHARE of idle income
    // (5 × clickValue < 0.5 × incomePerSec). With content's click ≈ 1.2 + 0.01 × income this falls around minutes 4–6.
    const ip = num(ctx.d?.incomePerSec);
    cls(el, 'small', ip > 0 && FAST_TAPS * v < SHRINK_SHARE * ip);
  }
  return { el, update };
}
