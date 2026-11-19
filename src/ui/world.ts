// The world strip: broadsheet, the illustrated scene of the selected industry, and the big sell button.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sd, lookFor, openSectors, ageOfSector } from './ctx';
import type { GameEvent, SectorDef, SectorId } from '../types';
import { h, setText, setAttr, show, cls, reducedMotion, motionOverride, replay } from './dom';
import { fmt, money, fmtPrice, pct, num, clamp, lower, unitOne } from './fmt';
import { infoBtn } from './gauges';
import { createScene, sceneViewFrom, type SceneView, type SceneTarget } from './scene';
import { getPrefs, type Detail } from './prefs';
import { timed } from './prof';
import { soundUpdate, soundSector, sound, soundUnlock, panOf } from './sound';

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

export function buildNews(ctx: Ctx): Comp & { backfire(): void } {
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
  let backfireUntil = -1;

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
    // The first backfire takes the lead as its own late extra (see app.ts backfireBeat).
    const bf = !age && !crisis && now <= backfireUntil && !!top && top.key === 'backfire';
    cls(el, 'lead-crisis', crisis || bf);
    setText(kicker, crisis ? 'Late extra' : bf ? 'Backfire' : 'A new Age');
    setText(more, news.length > 1 ? (open ? 'Fold' : `${news.length} items`) : '');
    const k = top ? `${top.time}|${top.text}` : '';
    if (k !== lastKey) {
      const fresh = lastKey !== '\u0000' && lastKey !== '' && !!top;
      lastKey = k;
      setText(yr, top ? String(Math.floor(num(top.year, 1780))) : '');
      setText(txt, top ? top.text : 'Nothing in the papers yet.');
      if (fresh && !reducedMotion()) replay(txt, 'fresh', 1200);
      if (fresh) sound('headline', { sector: top?.sector });
    }
    if (open && listKey !== ctx.sector + k + news.length) {
      listKey = ctx.sector + k + news.length;
      const items = news.filter((n) => n !== top).slice(0, 39).map((n) =>
        h('li', null, h('span', { class: 'num', text: String(Math.floor(num(n.year, 1780))) }), h('span', { text: n.text })));
      list.replaceChildren(...(items.length ? items : [h('li', { class: 'muted', text: 'No back issues.' })]));
    }
  }
  function backfire(): void { backfireUntil = num(ctx.state.time) + 30; update(); }
  return { el, update, backfire };
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
  /** The machines of an Industry changed generation (the scene's own cue; never on a build or a switch). */
  onStage?(sectorId: string, stage: number): void;
}
export interface WorldRenderer {
  update(view: SceneView): void;
  /** Draw the eye to a place or a lever in the picture, if the scene offers it (a requested hook; optional). */
  highlight(what: SceneTarget): boolean;
  /** Build another Industry's world off screen when idle (the scene keeps one per Industry). */
  prebuild(view: SceneView): void;
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
    onStage: (id, n) => opts.onStage?.(id, n),
  });
  return {
    update: (v) => scene.update(v),
    highlight: (w) => { try { return !!scene.highlight?.(w); } catch { return false; } },
    prebuild: (v) => { try { scene.prebuild?.(v); } catch { /* optional */ } },
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

/** Something to show in the picture: a place (an application id), a lever's sign (its kind), a Commons building. */
export type PlaceTarget = string | null | { lever: string } | { commons: string };

export interface WorldComp extends Comp {
  /** New events for the scene (passed with the next view) and for the moments on the frame. */
  queueEvents(ev: GameEvent[]): void;
  /** The first-backfire beat on the picture. */
  backfire(): void;
  /** Scroll target for an application, with the scene's card opened on it. */
  focusApp(appId: string): HTMLElement;
  /** Bring the picture into view (and select a place in it, if given), with a brief mark on the frame. */
  showPlace(target: PlaceTarget): void;
  reset(): void;
  /** The last view given to the scene (the time-lapse samples it). */
  lastView(): SceneView | null;
}

/** Improvement cards (views of this Industry) that concern a place: they bring it within reach or change its appetite. */
function cardsFor(ctx: Ctx, appId: string): string[] {
  return (ctx.ups || []).filter((v) => v?.def && v.def.sector === ctx.sector && v.visible && !v.maxed && !v.excludedBy && (
    (v.bringsWithinReach || []).some((r) => r.appId === appId)
    || (v.def.effects || []).some((e) => (e as { app?: string }).app === appId))).map((v) => v.def.id);
}

/** A title card over the picture: a new Industry first visited, a new Age begun. Composited fade; gone in ~3 s. */
/** sceneViewFrom with the M2 fifth argument: the events newer than those passed last. */
const viewFrom = (c: Ctx['content'], st: Ctx['state'], d: Ctx['d'], id: string, ev?: GameEvent[]): SceneView => sceneViewFrom(c, st, d, id, ev);

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
    // The picture draws the new machines itself; the page only offers a way back to it if it is scrolled away.
    onStage: (id) => { if (id === ctx.sector) moment('stage', 'The machines are rebuilt', 'See them'); },
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
  // Events not yet handed to the scene (cleared each time a view is built), and the moments they make on the frame.
  let sceneEvents: GameEvent[] = [];
  let lastView: SceneView | null = null;
  let deferred: SceneView | null = null, deferTimer = 0;
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
      sector = def.id; renderer.setSector(def.id); soundSector(def.id); selected = null; markHand();
      prebuilt.add(def.id);
      visited.add(def.id);
      // A first visit to an Industry opened this session is an event: its name over the picture.
      if (first) titleCard(frame, ageOfSector(ctx.content, def.id)?.name ?? 'A new Industry', def.name, `${def.years}. ${def.tagline}`);
    }
    const m = document.documentElement.getAttribute('data-motion') ?? '';
    if (m !== motion) { motion = m; renderer.setReducedMotion(motionOverride()); }
    const dt = getPrefs().detail;
    if (dt !== detail) { detail = dt; renderer.setDetail(dt); }
    if (armed) {
      const evs = sceneEvents;
      sceneEvents = [];
      const view = timed('scene.view', () => viewFrom(ctx.content, ctx.state, ctx.d, def.id, evs));
      // A new machine stage rebuilds the picture (the heaviest single thing the scene does, 75–150 ms at 4× CPU): it
      // waits for the frame after the tap, so the purchase itself paints first (the stamp, the needles, the figures).
      const rebuild = !!lastView && lastView.sectorId === view.sectorId && lastView.stage !== view.stage;
      lastView = view;
      if (rebuild || deferred) {
        deferred = view;
        if (!deferTimer) deferTimer = requestAnimationFrame(() => setTimeout(() => {
          deferTimer = 0;
          const v = deferred; deferred = null;
          if (v) timed('scene.update', () => renderer.update(v));
        }, 0));
      } else timed('scene.update', () => renderer.update(view));
      soundUpdate(view);
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
    setText(price, e ? `Sells at £${fmtPrice(e.servicePrice)} per ${unitOne(def.service)}` : '');
    setAttr(price, 'title', e ? `${def.service.name} sells at £${fmtPrice(e.servicePrice)} per ${unitOne(def.service)}` : null);
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
  // The scene draws each moment in the picture (events, moments.ts); the page adds only its own part of the beat (the
  // gauges, through `rebound:moment`) and, when the picture is scrolled away, a note with a way back to it.
  function moment(kind: 'stage' | 'crisis' | 'lever' | 'found' | 'backfire', note?: string, action?: string, target: PlaceTarget = null): void {
    document.dispatchEvent(new CustomEvent('rebound:moment', { detail: kind }));
    if (note && action && !inView()) ctx.toast(`${note}.`, { label: action, run: () => showPlace(target) });
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
  function showPlace(t: PlaceTarget): void {
    if (typeof t === 'string') { renderer.select(t); renderer.highlight({ app: t }); }
    else if (t) renderer.highlight(t);
    scrollToEl(el, 8);
    frame.classList.remove('flash'); void frame.offsetWidth; frame.classList.add('flash');
    setTimeout(() => frame.classList.remove('flash'), 1800);
  }
  function jump(appId: string): void { showPlace(appId); }
  function queueEvents(ev: GameEvent[]): void {
    sceneEvents = sceneEvents.concat(ev).slice(-50);
    for (const e of ev) {
      if (e.sector !== ctx.sector) continue;
      if (e.kind === 'crisis') moment('crisis');
      else if (e.kind === 'leverEnacted' && e.by === 'player' && e.n === 1) {
        const kind = ctx.content.levers?.find((l) => l.id === e.id)?.kind;
        moment('lever', 'The lever shows in the world', 'See it', kind ? { lever: kind } : null);
      } else if (e.kind === 'appFounded' && e.by === 'player' && e.id) {
        const a = sectorDef(ctx)?.applications.find((x) => x.id === e.id);
        moment('found', a ? `${a.name} founded` : undefined, 'See it', e.id);
      }
    }
  }
  // Idle prebuild: each other open Industry's world is built once, off screen, one per idle slice, so a first visit
  // re-attaches a kept world instead of building one (100 ms+ at 4× CPU). Never during input.
  const prebuilt = new Set<SectorId>();
  let idleQueued = false;
  function queuePrebuild(): void {
    if (idleQueued) return;
    const next = openSectors(ctx).find((id) => id !== ctx.sector && !prebuilt.has(id));
    if (!next) return;
    idleQueued = true;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const run = () => {
      idleQueued = false;
      if (document.hidden || ctx.d?.pendingReckoning || !ctx.state.sectors?.[next]?.open) return;
      prebuilt.add(next);
      try { timed('scene.prebuild', () => renderer.prebuild(sceneViewFrom(ctx.content, ctx.state, ctx.d, next))); } catch { /* optional */ }
    };
    if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 1500);
  }
  return {
    el, update: () => { update(); if (armed) queuePrebuild(); }, focusApp, showPlace, queueEvents,
    backfire: () => moment('backfire'),
    reset() { known.clear(); sceneEvents = []; prebuilt.clear(); },
    lastView: () => lastView,
  };
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
  const btn = h('button', { class: 'sell', type: 'button', onclick: (ev: Event) => {
    const v = num(ctx.d?.clickValue);
    soundUnlock();
    const ok = ctx.act('click', (m, s, c) => m.click(s, c));
    if (ok) sound('sell', { pan: panOf(ev), sector: ctx.sector });
    if (ok && !reducedMotion()) {
      const p = pool[pi++ % pool.length];
      p.textContent = '+' + money(v);
      p.style.setProperty('--dx', ((pi * 37) % 60 - 30) + 'px');
      replay(p, 'go', 1000);
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
