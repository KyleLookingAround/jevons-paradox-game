// The scene engine: builds a layered SVG landscape from a Layout + prop libraries, then patches it in place.
//
// Layers, back to front:  sky (gradients) · sky svg · far static · far fx · mist · smog · mid static · mid fx · smog ·
//   near static (+ cut-away) · near fx · smog · crisis fog · places (buttons) · banner.
// Static layers repaint only when something appears; moving things live in fx layers (CSS transform/opacity).
import type { SceneView, SceneOptions, SceneHandle, SceneApp } from './types';
import type { Layout, PlotDef, Slot, Band, FxKind, PropArgs, PropOut, Prop, MoverDef } from './layout';
import { depthScale } from './layout';
import { injectSceneCss } from './css';
import { hash, rng, f, clamp, esc, mix } from './svg';
import { layoutFor, propFor } from './registry';
import { styleFor } from './styles/index';
import type { ArtStyle } from './style';
import { scaffold, survey } from './props/common';

const NS = 'http://www.w3.org/2000/svg';
const VB = '0 0 600 400';
const W = 600, H = 400;
const BANDS: Band[] = ['far', 'mid', 'near'];
const MAX_LIVE_SMOKE = 10, MAX_LIVE_SMOKE_LOW = 4;
let instances = 0;

interface FxSpec { kind: FxKind; x: number; y: number; size: number; markup?: string }
interface Item { y: number; ord: number; band: Band; html: string; fx: string[] }

interface PlotRt {
  def: PlotDef;
  idx: number;
  app: SceneApp | null;
  /** keys of slot elements in appear order */
  keys: string[];
  anchorKey: string | null;
  movers: Element[];
  moverDefs: { el: Element; dur: number; phase: number }[];
  overlayBase: PlotRt | null;
  overlayOrder: number[];
  count: number;
  mcount: number;
  status: string;
  btn: HTMLButtonElement | null;
  ghost: Element | null;
  svy: Element | null;
  scaf: Element | null;
}

const num0 = (v: number): string => {
  if (!Number.isFinite(v)) return '0';
  const a = Math.abs(v);
  if (a < 1000) return a < 10 ? (Math.round(v * 10) / 10).toString() : Math.round(v).toString();
  const u = ['k', 'M', 'B', 'T'];
  let i = -1, x = a;
  while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; }
  return (v < 0 ? '−' : '') + (x < 100 ? x.toFixed(x < 10 ? 2 : 1) : x.toFixed(0)) + u[i];
};

function hatchLevel(s: number): number {
  // on-screen spacing ≈ constant: denser pattern for near (large) props, sparser for far (small) ones
  return s >= 0.85 ? 0 : s >= 0.62 ? 1 : s >= 0.45 ? 2 : 3;
}

function svgEl(cls: string): SVGSVGElement {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', VB);
  el.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  el.setAttribute('class', cls);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('focusable', 'false');
  return el;
}

function div(cls: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

function bandOf(l: Layout, y: number): Band {
  const [a, b] = l.bands ?? [245, 312];
  return y < a ? 'far' : y < b ? 'mid' : 'near';
}

export function createScene(host: HTMLElement, opts: SceneOptions = {}): SceneHandle {
  injectSceneCss(host.ownerDocument ?? document);
  const id = `scn${++instances}-`;
  const money = opts.money ?? ((v: number) => '£' + num0(v));
  const numf = opts.num ?? num0;

  /* ---------------- DOM skeleton (built once) ---------------- */
  const root = div('scn');
  root.setAttribute('role', 'group');
  const stage = div('scn-stage');
  const world = div('scn-world');
  const defs = svgEl('scn-defs');
  const sky0 = div('scn-sky'), sky1 = div('scn-sky smog'), sky2 = div('scn-sky fresh');
  const glow = div('scn-glow');
  const skySvg = svgEl('scn-l');
  // Each depth band is a wrapper holding alternating static and fx SVGs: static₀ · fx₀ · static₁ · fx₁ … The bands are
  // split at the depth of each mover track, so a train passes behind the buildings nearer than its line and in front
  // of those further away, while static layers still never repaint for motion.
  const bw: Record<Band, HTMLDivElement> = { far: div('scn-bw bw-far'), mid: div('scn-bw bw-mid'), near: div('scn-bw bw-near') };
  let st: Record<Band, SVGSVGElement[]> = { far: [], mid: [], near: [] };
  let fx: Record<Band, HTMLDivElement[]> = { far: [], mid: [], near: [] };
  const mist1 = div('scn-hz mist'), mist2 = div('scn-hz mist m2');
  const hz1 = div('scn-hz smog h1'), hz2 = div('scn-hz smog h2'), hz3 = div('scn-hz smog h3');
  const fog = div('scn-fog');
  const noiseSvg = svgEl('scn-l scn-noise');
  const extraLayer = div('scn-extra');
  const plateSvg = svgEl('scn-l scn-plate');
  world.append(defs, sky0, sky1, sky2, glow, skySvg, bw.far, mist1, hz1, bw.mid, mist2, hz2, bw.near, hz3, extraLayer, noiseSvg, fog, plateSvg);
  const places = div('scn-places');
  const banner = div('scn-banner');
  banner.setAttribute('aria-hidden', 'true');
  const toast = div('scn-toast');
  toast.setAttribute('aria-hidden', 'true');
  stage.append(world, places, banner, toast);
  const summary = document.createElement('p');
  summary.className = 'vh-scn';
  summary.id = id + 'sum';
  root.setAttribute('aria-describedby', summary.id);

  // card
  const card = div('scn-card');
  const cap = div('scn-cap');
  const sel = div('scn-sel');
  sel.hidden = true;
  const selN = document.createElement('span'); selN.className = 'scn-sel-n';
  const selX = document.createElement('button'); selX.type = 'button'; selX.className = 'scn-sel-x'; selX.setAttribute('aria-label', 'Close'); selX.textContent = '×';
  const selM = div('scn-sel-m');
  const selB = document.createElement('p'); selB.className = 'scn-sel-b'; selB.style.margin = '0';
  const found = document.createElement('button'); found.type = 'button'; found.className = 'scn-found';
  const foundFill = document.createElement('i'); foundFill.className = 'scn-ff';
  const foundL = document.createElement('span'), foundR = document.createElement('span');
  found.append(foundFill, foundL, foundR);
  sel.append(selN, selX, selM, selB, found);
  card.append(cap, sel);
  card.setAttribute('aria-live', 'polite');
  const legend = document.createElement('p');
  legend.className = 'scn-legend';
  legend.hidden = true;
  root.append(stage, legend);
  if (opts.card !== false) root.append(card);
  root.append(summary);
  host.appendChild(root);

  /* ---------------- state ---------------- */
  let builtKey = '';
  let layout: Layout | null = null;
  let plots: PlotRt[] = [];
  let elsByKey = new Map<string, Element[]>();
  let smokeEls: { el: Element; key: string; size: number }[] = [];
  let restraintEls = new Map<string, Element[]>();
  let lastView: SceneView | null = null;
  let selected: string | null = null;
  let prevStatus = new Map<string, string>();
  let prevStage = -1, prevSector = '', prevCrises = -1, prevSteady = false, prevPace = -1;
  let rmOverride: boolean | null = typeof opts.reducedMotion === 'boolean' ? opts.reducedMotion : null;
  let visible = true;
  let captionUntil = 0, captionText = '';
  let crisisTimer = 0;
  let summaryText = '';
  let destroyed = false;
  let steadyMoverEls: Element[] = [];
  let style: ArtStyle | undefined;
  // Detail: 'full', 'low' (fewer movers and live chimneys, no second rain sheet or signal noise), or 'auto' (full,
  // dropping to low for the rest of the session if frames run long while the scene is on screen).
  let detailOpt: 'auto' | 'low' | 'full' = opts.detail ?? 'auto';
  let lowDetail = detailOpt === 'low';
  let lastSig = '', captionDirty = false, moversDirty = true, prevSteadyOn: boolean | null = null;
  let moverAnims: Animation[] = [];
  const animOf = new WeakMap<Element, Animation>();
  let planeK = 0;

  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const rm = () => (rmOverride ?? !!mq?.matches);
  function setLow(on: boolean): void {
    lowDetail = on;
    root.classList.toggle('lowd', on);
    assignSmoke();
    syncPlay();
  }
  /** Auto detail: watch frames for a few seconds after a build; if a quarter run long (> 24 ms), go low for good. */
  let watchId = 0;
  function watchFrames(): void {
    if (detailOpt !== 'auto' || lowDetail || typeof requestAnimationFrame !== 'function' || typeof performance === 'undefined') return;
    const my = ++watchId;
    let n = 0, slow = 0, last = 0;
    const tick = (t: number) => {
      if (destroyed || my !== watchId || lowDetail) return;
      if (rm() || root.classList.contains('paused') || root.classList.contains('halt')) { last = 0; requestAnimationFrame(tick); return; }
      if (last) { n++; if (t - last > 24) slow++; }
      last = t;
      if (n >= 150) { if (slow / n > 0.25) setLow(true); return; }
      requestAnimationFrame(tick);
    };
    window.setTimeout(() => requestAnimationFrame(tick), 1500);
  }
  function applyMotion(): void {
    root.classList.toggle('rm', rm());
    root.classList.toggle('live', !rm());
    syncPlay();
  }
  const onMq = () => applyMotion();
  mq?.addEventListener?.('change', onMq);
  applyMotion();

  const onVis = () => {
    root.classList.toggle('paused', document.hidden || !visible);
    syncPlay();
  };
  document.addEventListener('visibilitychange', onVis);
  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver((es) => {
      for (const e of es) visible = e.isIntersecting;
      onVis();
    });
    io.observe(stage);
  }
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver((es) => {
      for (const e of es) { root.classList.toggle('wide', e.contentRect.width >= 640); sizePlane(e.contentRect.width); }
    });
    ro.observe(stage);
  }

  /* ---------------- events ---------------- */
  places.addEventListener('click', (ev) => {
    const b = (ev.target as Element)?.closest?.('.scn-place') as HTMLElement | null;
    if (!b) return;
    const app = b.dataset.app ?? null;
    select(selected === app ? null : app, true);
  });
  selX.addEventListener('click', () => select(null, true));
  found.addEventListener('click', () => {
    if (!selected || found.getAttribute('aria-disabled') === 'true') return;
    try { opts.onFound?.(selected); } catch (e) { console.warn('scene onFound', e); }
  });
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && selected) select(null, true); };
  root.addEventListener('keydown', onKey);

  function select(appId: string | null, fromUser = false): void {
    selected = appId;
    for (const p of plots) p.btn?.classList.toggle('sel', !!p.app && p.app.id === appId);
    if (lastView) renderCard(lastView);
    if (fromUser) { try { opts.onSelect?.(appId); } catch (e) { console.warn('scene onSelect', e); } }
  }

  /* ---------------- build ---------------- */
  function propArgs(sl: Slot, s: number, stageN: number, seed: number, overlay: boolean): PropArgs {
    const r = rng(seed);
    const lvl = hatchLevel(s);
    return {
      s, v: sl.v ?? r(), stage: stageN, w: sl.w ?? 0, h: sl.h ?? 0, r, overlay,
      u: (x: string) => `url(#${id}${x})`,
      hatch: (level = 0) => `url(#${id}${level ? 'x' : 'h'}${lvl})`,
    };
  }

  function renderSlot(l: Layout, look: string, sl: Slot, key: string, cls: string, stageN: number, seedStr: string, overlay = false, propKey?: string): Item {
    const s = sl.s ?? depthScale(l, sl.y) * (sl.k ?? 1);
    const band = sl.band ?? bandOf(l, sl.y);
    const seed = hash(seedStr);
    const fxs: FxSpec[] = [];
    const out: PropOut = { fx: (kind, x, y, size = 1, markup) => fxs.push({ kind, x, y, size, markup }) };
    const prop: Prop = propFor(l.look, look, propKey ?? sl.p);
    let inner = '';
    try { inner = prop(propArgs(sl, s, stageN, seed, overlay), out); } catch (e) { console.warn('scene prop', sl.p, e); }
    const sx = sl.flip ? -s : s;
    const html = `<g class="${cls}" data-k="${key}" transform="translate(${f(sl.x)} ${f(sl.y)}) scale(${Math.round(sx * 1000) / 1000} ${Math.round(s * 1000) / 1000})"><g class="gr">${inner}</g></g>`;
    const fxHtml = cls.includes('ghost') ? [] : fxs.map((e) => fxMarkup(e, sl.x + e.x * sx, sl.y + e.y * s, s, key));
    return { y: sl.y, ord: 0, band, html, fx: fxHtml };
  }

  // Moving things are HTML sprites in a 600×400 px plane scaled to the stage, animated by transform and opacity
  // only, so the compositor runs them without restyling or repainting the drawing (an animation inside an SVG
  // repaints that SVG every frame). Each sprite holds a tiny overflow-visible SVG drawn about its own origin.
  function fxMarkup(e: FxSpec, gx: number, gy: number, s: number, key: string): string {
    const k = Math.round(e.size * s * 1000) / 1000;
    const pos = `left:${f(gx)}px;top:${f(gy)}px`;
    if (e.kind === 'smoke' || e.kind === 'steam') {
      return `<div class="fx smk${e.kind === 'steam' ? ' wht' : ''}" data-k="${key}" data-sz="${k}" style="${pos};transform:scale(${k || 0.01})"><i></i><i></i><i></i></div>`;
    }
    const sc = Math.round(s * 1000) / 1000;
    return `<div class="fx ${e.kind}" data-k="${key}" style="${pos};transform:scale(${sc})"><b>${spr(e.markup ?? '')}</b></div>`;
  }

  function moverMarkup(l: Layout, look: string, m: MoverDef, i: number, key: string, stageN: number, seedStr: string): { html: string; band: Band; dur: number; phase: number; z: number } {
    const s = m.s ?? depthScale(l, m.y0);
    const flip = m.x1 < m.x0;
    const seed = hash(seedStr);
    const fxs: FxSpec[] = [];
    const prop = propFor(l.look, look, m.p);
    let inner = '';
    try { inner = prop(propArgs({ p: m.p, x: 0, y: 0, w: m.w }, s, stageN, seed, false), { fx: (kind, x, y, size = 1, markup) => fxs.push({ kind, x, y, size, markup }) }); } catch (e) { console.warn('scene mover', m.p, e); }
    const r = rng(seed);
    const phase = (i + 0.15 + r() * 0.5) / m.n;
    const sx = f(m.x0 + (m.x1 - m.x0) * phase), sy = f(m.y0 + (m.y1 - m.y0) * phase);
    const band = m.band ?? bandOf(l, m.y0);
    // Placed at its resting point (what reduced motion shows); the animation runs from one end of the track to the other.
    const html = `<div class="fx mv" data-k="${key}" data-tr="${f(m.x0 - +sx)},${f(m.y0 - +sy)},${f(m.x1 - +sx)},${f(m.y1 - +sy)}" style="left:${sx}px;top:${sy}px">` +
      spr(`<g transform="scale(${flip ? -s : s} ${s})">${inner}</g>`) + `</div>`;
    return { html, band, dur: m.dur, phase, z: moverZ(m) };
  }

  function build(v: SceneView): void {
    const l = layoutFor(v.sectorId, v.apps.length);
    layout = l;
    // The art style belongs to the layout (its Age); a generic layout follows the page look.
    const pick = (k: string) => { const st = styleFor(k); return st && st.css ? st : undefined; };
    style = (l.look !== 'generic' ? pick(l.look) : undefined) ?? pick(v.look) ?? pick('generic');
    const look = style?.id ?? 'generic';
    root.dataset.look = look;
    root.dataset.layout = l.id;
    root.classList.remove('live');
    defs.innerHTML = `<defs>${style ? style.defs(id) : ''}</defs>`;
    const pctx = { caption: l.caption ?? '', name: v.sectorName, u: (x: string) => `url(#${id}${x})` };
    let plate = '', leg = '';
    try { plate = style?.plate?.(pctx) ?? ''; leg = style?.legend?.(pctx) ?? ''; } catch (e) { console.warn('scene plate', e); }
    plateSvg.innerHTML = plate;
    legend.textContent = leg; legend.hidden = !leg;
    extraLayer.innerHTML = style?.layers ?? '';
    noiseSvg.innerHTML = style?.noise ?? '';
    const items: Item[] = [];
    const fxBand: Record<Band, { z: number; html: string }[]> = { far: [], mid: [], near: [] };
    const stageN = clamp(Math.round(v.stage), 0, 3);
    const bctx = {
      u: (x: string) => `url(#${id}${x})`,
      hatch: (s: number, level: 0 | 1 = 0) => `url(#${id}${level ? 'x' : 'h'}${hatchLevel(s)})`,
      r: rng(hash(l.id)),
      stage: stageN,
      heritage: v.heritage,
    };
    let bd: ReturnType<Layout['backdrop']> = {};
    try { bd = l.backdrop(bctx); } catch (e) { console.warn('scene backdrop', e); }
    for (const e of bd.fx ?? []) fxBand[e.band].push({ z: -1e6, html: fxMarkup({ kind: e.kind, x: 0, y: 0, size: e.size ?? 1, markup: e.markup }, e.x, e.y, 1, 'bd') });

    // Assign apps to plots: by icon, then id; unknown icons get a spare rectangle with a generic works.
    const appPlots = l.plots.filter((p) => (p.driver ?? 'app') === 'app');
    const used = new Set<PlotDef>();
    const assigned: { def: PlotDef; app: SceneApp }[] = [];
    let spareI = 0;
    for (const a of v.apps) {
      const p = appPlots.find((q) => !used.has(q) && (q.match ?? []).some((m) => m === a.icon || m === a.id));
      if (p) { used.add(p); assigned.push({ def: p, app: a }); continue; }
      const rect = l.spares[spareI++];
      if (!rect) continue; // no room: the app simply has no place in this picture
      assigned.push({ def: sparePlot(l, rect, a), app: a });
    }
    const others = l.plots.filter((p) => (p.driver ?? 'app') !== 'app');

    plots = [];
    const all: { def: PlotDef; app: SceneApp | null }[] = [...others.filter((p) => !p.overlayOf).map((d) => ({ def: d, app: null })), ...assigned,
      ...others.filter((p) => !!p.overlayOf).map((d) => ({ def: d, app: null }))];
    let uid = 0;
    for (const { def, app } of all) {
      const idx = plots.length;
      const rt: PlotRt = { def, idx, app, keys: [], anchorKey: null, movers: [], moverDefs: [], overlayBase: null, overlayOrder: [], count: -1, mcount: -1, status: '', btn: null, ghost: null, svy: null, scaf: null };
      const seedBase = `${l.id}:${def.key}`;
      // Landmark (and, for applications, its ghost, scaffold and survey stakes).
      if (def.anchor) {
        const key = `${idx}:a`;
        const it = renderSlot(l, look, def.anchor, key, 'sl0 anc', stageN, `${seedBase}:a`);
        // Ground it: a contact shadow / trodden yard under the landmark, sized from its site, inside its own group.
        if ((def.driver ?? 'app') === 'app' && !def.anchor.w) {
          const sc0 = def.anchor.s ?? depthScale(l, def.anchor.y);
          const site0 = def.site ?? siteFromHit(def);
          const rx = Math.min(site0 ? site0[2] : 40, 64) / sc0 / 2;
          it.html = it.html.replace('<g class="gr">', `<g class="gr"><ellipse class="cs" cx="0" cy="0.5" rx="${f(rx)}" ry="${f(Math.max(2, rx * 0.16))}"/>`);
        }
        it.ord = uid++;
        baseOrd.set(key, it.ord);
        items.push(it);
        rt.anchorKey = key;
        if ((def.driver ?? 'app') === 'app') {
          const g = renderSlot(l, look, def.anchor, `${idx}:g`, 'ghost', stageN, `${seedBase}:a`);
          g.ord = uid++;
          items.push(g);
          const sc = def.anchor.s ?? depthScale(l, def.anchor.y);
          const site = def.site ?? siteFromHit(def);
          const bw = Math.min(site ? site[2] : 50, 70) / sc;
          items.push({ y: def.anchor.y + 0.01, ord: uid++, band: def.anchor.band ?? bandOf(l, def.anchor.y), html: `<g class="scaf" data-k="${idx}:f" transform="translate(${f(def.anchor.x)} ${f(def.anchor.y)}) scale(${Math.round(sc * 1000) / 1000})">${scaffold(bw, 46)}</g>`, fx: [] });
        }
      }
      if ((def.driver ?? 'app') === 'app') {
        const site = def.site ?? siteFromHit(def);
        if (site) items.push({ y: site[1] + site[3], ord: uid++, band: bandOf(l, site[1] + site[3]), html: `<g class="svy" data-k="${idx}:s" transform="translate(${f(site[0])} ${f(site[1] + site[3])})">${survey(site[2], site[3])}</g>`, fx: [] });
      }
      if (def.overlayOf) {
        // Overlay: this plot's prop drawn over another plot's slots (same places, same seeds), e.g. lit windows.
        const base = plots.find((p) => p.def.key === def.overlayOf) ?? null;
        rt.overlayBase = base;
        if (base) {
          base.def.slots.forEach((sl, i) => {
            const key = `${idx}:${i}`;
            const it = renderSlot(l, look, sl, key, 'sl0 ov', stageN, `${l.id}:${base.def.key}:${i}:ov:${def.key}`, true, def.overlayProp ?? sl.p);
            it.ord = (baseOrd.get(`${base.idx}:${i}`) ?? uid++) + 0.5;
            items.push(it);
            rt.keys.push(key);
          });
          const r = rng(hash(seedBase + ':order'));
          rt.overlayOrder = base.def.slots.map((_, i) => i).sort(() => r() - 0.5);
        }
      } else {
        def.slots.forEach((sl, i) => {
          const key = `${idx}:${i}`;
          const it = renderSlot(l, look, sl, key, def.fade ? 'sl0 fd' : 'sl0', stageN, `${seedBase}:${i}`);
          it.ord = uid++;
          baseOrd.set(key, it.ord);
          items.push(it);
          rt.keys.push(key);
        });
      }
      (def.movers ?? []).forEach((m, mi) => {
        for (let i = 0; i < m.n; i++) {
          const key = `${idx}:m${mi}.${i}`;
          const mm = moverMarkup(l, look, m, i, key, stageN, `${seedBase}:m${mi}:${i}`);
          fxBand[mm.band].push({ z: mm.z, html: mm.html });
          rt.moverDefs.push({ el: null as unknown as Element, dur: mm.dur, phase: mm.phase });
          (rt as PlotRt & { mkeys?: string[] }).mkeys = [...((rt as PlotRt & { mkeys?: string[] }).mkeys ?? []), key];
        }
      });
      plots.push(rt);
    }
    baseOrd.clear();

    // Signs of restraint, one per lever kind (plus spare notice boards for unknown kinds in force).
    const rkinds = Object.keys(l.restraint);
    const extra = v.levers.map((x) => x.kind).filter((k) => !l.restraint[k]);
    const spareR = l.restraintSpare ?? [];
    [...rkinds, ...extra].forEach((k, i) => {
      const sl = l.restraint[k] ?? (spareR[(i - rkinds.length) % Math.max(1, spareR.length)] ? { ...spareR[(i - rkinds.length) % spareR.length], p: 'notice' } : null);
      if (!sl) return;
      const it = renderSlot(l, look, sl, `r:${k}`, 'rst', stageN, `${l.id}:r:${k}`);
      it.ord = uid++;
      items.push(it);
    });

    // Steady-state movers (birds), built hidden.
    (l.steadyMovers ?? []).forEach((m, mi) => {
      for (let i = 0; i < m.n; i++) {
        const mm = moverMarkup(l, look, m, i, `st:${mi}.${i}`, stageN, `${l.id}:st:${mi}:${i}`);
        fxBand[mm.band].push({ z: mm.z, html: mm.html.replace('class="fx mv"', 'class="fx mv stdy"') });
      }
    });

    // Paint: per band, backdrop first, then items by depth (y), then the cut-away.
    for (const b of BANDS) {
      const its = items.filter((x) => x.band === b).sort((p, q) => p.y - q.y || p.ord - q.ord);
      // Split depths: one per distinct mover track in this band (clustered, at most four).
      const zs = [...new Set(fxBand[b].filter((e) => e.z > -1e5).map((e) => Math.round(e.z)))].sort((p, q) => p - q);
      const splits: number[] = [];
      for (const z of zs) if (!splits.length || z - splits[splits.length - 1] > 6) splits.push(z); else splits[splits.length - 1] = z;
      while (splits.length > 4) splits.splice(1, 1);
      const layerOf = (y: number) => { let i = 0; while (i < splits.length && y > splits[i]) i++; return i; };
      const n = splits.length + 1;
      const sh: string[] = Array(n).fill(''), fh: string[] = Array(n).fill('');
      sh[0] = bd[b] ?? '';
      for (const it of its) { const k = layerOf(it.y); sh[k] += it.html; fh[k] += it.fx.join(''); }
      if (b === 'near') sh[n - 1] += bd.cut ?? '';
      // A mover at depth z draws after every item at y ≤ z: in fx layer i where splits[i] ≥ z.
      for (const e of fxBand[b]) { const k = e.z <= -1e5 ? 0 : Math.min(n - 1, layerOf(e.z)); fh[k] = e.html + fh[k]; }
      st[b] = []; fx[b] = [];
      const kids: Element[] = [];
      for (let i = 0; i < n; i++) {
        const s = svgEl(`scn-l band-${b}`), x = div(`scn-fxl fx-${b}`);
        s.innerHTML = sh[i]; x.innerHTML = fh[i];
        st[b].push(s); fx[b].push(x);
        kids.push(s);
        if (fh[i]) kids.push(x);
      }
      bw[b].replaceChildren(...kids);
    }
    skySvg.innerHTML = bd.sky ?? '';

    // Index elements by key.
    elsByKey = new Map();
    for (const svg of [...st.far, ...st.mid, ...st.near, ...fx.far, ...fx.mid, ...fx.near]) {
      svg.querySelectorAll('[data-k]').forEach((el) => {
        const k = (el as Element).getAttribute('data-k') as string;
        const arr = elsByKey.get(k);
        if (arr) arr.push(el); else elsByKey.set(k, [el]);
      });
    }
    // Backdrop emitters (far aircraft lights, vents) are always on.
    for (const b of BANDS) for (const lay of fx[b]) lay.querySelectorAll('[data-k="bd"]').forEach((el) => el.classList.add('on'));
    smokeEls = [];
    for (const b of BANDS) for (const lay of fx[b]) lay.querySelectorAll('.smk').forEach((el) => smokeEls.push({ el, key: el.getAttribute('data-k') ?? '', size: parseFloat(el.getAttribute('data-sz') ?? '1') }));
    smokeEls.sort((p, q) => q.size - p.size);
    restraintEls = new Map();
    elsByKey.forEach((els, k) => { if (k.startsWith('r:')) restraintEls.set(k.slice(2), els); });
    steadyMoverEls = Array.from(root.querySelectorAll('.mv.stdy'));
    prevSteadyOn = null; moversDirty = true;
    moverAnims.forEach((a) => a.cancel());
    moverAnims = [];
    for (const p of plots) {
      const mk = (p as PlotRt & { mkeys?: string[] }).mkeys ?? [];
      p.movers = mk.map((k) => (elsByKey.get(k) ?? [])[0]).filter(Boolean);
      p.moverDefs.forEach((m, i) => (m.el = p.movers[i]));
      p.ghost = (elsByKey.get(`${p.idx}:g`) ?? [])[0] ?? null;
      p.svy = (elsByKey.get(`${p.idx}:s`) ?? [])[0] ?? null;
      p.scaf = (elsByKey.get(`${p.idx}:f`) ?? [])[0] ?? null;
    }
    prevPace = -1;
    sizePlane();
    for (const p of plots) p.moverDefs.forEach((m) => { if (m.el) animateMover(m.el as HTMLElement, m.dur, m.phase); });
    // Steady-state movers (birds) have no plot: give them a crossing of their own.
    steadyMoverEls.forEach((el, i) => animateMover(el as HTMLElement, 40 + i * 7, (i * 0.37) % 1));
    syncPlay();
    root.classList.toggle('lowd', lowDetail);
    watchFrames();

    // Places (buttons) for applications.
    places.replaceChildren();
    for (const p of plots) {
      if (!p.app || !p.def.hit) continue;
      const [x, y, w, h] = p.def.hit;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'scn-place';
      b.dataset.app = p.app.id;
      b.style.left = (x / W * 100).toFixed(2) + '%';
      b.style.top = (y / H * 100).toFixed(2) + '%';
      b.style.width = (w / W * 100).toFixed(2) + '%';
      b.style.height = (h / H * 100).toFixed(2) + '%';
      const pin = document.createElement('span');
      pin.className = 'scn-pin';
      pin.setAttribute('aria-hidden', 'true');
      pin.textContent = '+';
      b.append(pin);
      places.append(b);
      p.btn = b;
      if (selected === p.app.id) b.classList.add('sel');
    }
    root.setAttribute('aria-label', `${v.sectorName}: ${l.place}`);
    // Suppress grow animations for things already there on (re)build; re-enable next frame.
    const enable = () => { if (!destroyed) applyMotion(); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(enable)); else enable();
  }
  const baseOrd = new Map<string, number>();

  /** One crossing per mover, as a Web Animation with concrete keyframes (composited; no var() in keyframes). */
  function animateMover(el: HTMLElement, durS: number, phase: number): void {
    const tr = (el.getAttribute('data-tr') ?? '0,0,0,0').split(',').map(Number);
    if (typeof el.animate !== 'function') return;
    try {
      const a = el.animate([{ transform: `translate(${tr[0]}px,${tr[1]}px)` }, { transform: `translate(${tr[2]}px,${tr[3]}px)` }],
        { duration: durS * 1000, iterations: Infinity, easing: 'linear' });
      a.currentTime = phase * durS * 1000;
      a.pause();
      moverAnims.push(a);
      animOf.set(el, a);
    } catch { /* no Web Animations: movers stay at their resting points */ }
  }
  /** Run, pause or drop the mover animations to match reduced motion, visibility and a Reckoning. */
  function syncPlay(): void {
    const still = rm(), stop = root.classList.contains('paused') || root.classList.contains('halt');
    const steady = root.classList.contains('steady'), low = root.classList.contains('lowd');
    for (const a of moverAnims) {
      try {
        // A hidden mover's animation would still tick on the main thread every frame (it cannot be composited
        // without a box): only shown movers run.
        const el = (a.effect as KeyframeEffect | null)?.target as Element | null;
        const shown = !!el && el.classList.contains('on') && (!el.classList.contains('stdy') || steady) && !(low && el.classList.contains('thin'));
        if (still) { if (a.playState !== 'idle') a.cancel(); }
        else if (stop || !shown) { if (a.playState === 'idle') a.play(); if (a.playState !== 'paused') a.pause(); }
        else if (a.playState !== 'running') a.play();
      } catch { /* ignore */ }
    }
  }
  /** The sprite plane is 600×400 px scaled to the stage (one write on build and on resize). */
  function sizePlane(w?: number): void {
    const k = (w ?? stage.clientWidth) / W;
    if (!k || Math.abs(k - planeK) < 0.001) return;
    planeK = k;
    root.style.setProperty('--k', k.toFixed(4));
  }

  function siteFromHit(def: PlotDef): [number, number, number, number] | null {
    if (!def.anchor) return null;
    const a = def.anchor;
    const w = Math.min(70, def.hit ? def.hit[2] * 0.7 : 50);
    return [a.x - w / 2, a.y - 10, w, 10];
  }

  /* ---------------- patch ---------------- */
  function setOn(key: string, on: boolean, extraCls?: string): void {
    const els = elsByKey.get(key);
    if (!els) return;
    for (const el of els) {
      el.classList.toggle('on', on);
      if (extraCls) el.classList.toggle(extraCls, on);
    }
  }

  function density(p: PlotRt, v: SceneView, lightMean: number): number {
    switch (p.def.driver ?? 'app') {
      case 'app': return p.app && p.app.status === 'founded' ? p.app.adoption : 0;
      case 'population': return 0.1 + 0.9 * v.popFraction;
      case 'pressure': return clamp(v.pressureFraction, 0, 1);
      case 'depletion': return 1 - v.reserveFraction;
      case 'reserve': return v.reserveFraction;
      case 'light': return lightMean;
      case 'always': return 1;
      default: return 0;
    }
  }

  function patch(v: SceneView): void {
    const l = layout;
    if (!l) return;
    const founded = v.apps.filter((a) => a.status === 'founded');
    const lightMean = founded.length ? founded.reduce((s, a) => s + a.adoption, 0) / Math.max(founded.length, v.apps.length * 0.6) : 0;
    const pf = clamp(v.pressureFraction, 0, 1.2);
    const clear = v.steady ? 1 : v.decoupling ? 0.6 * v.steadyProgress : 0;
    const pfv = Math.min(1, pf) * (1 - 0.85 * clear);
    const q = (x: number) => (Math.round(x * 50) / 50).toFixed(2);
    // Fast-moving values go straight onto the few elements that use them (a custom property on the root would
    // restyle every node of the scene); slow ones are coarsely quantised before they touch the root.
    const q20 = (x: number) => (Math.round(x * 20) / 20).toFixed(2);
    setOp(sky1, q(pfv)); const hzk = style?.weather?.hz ?? [0.85, 0.55, 0.32];
    setOp(hz1, q(Math.min(1, pfv * hzk[0]))); setOp(hz2, q(Math.min(1, pfv * hzk[1]))); setOp(hz3, q(Math.min(1, pfv * hzk[2])));
    setOp(noiseSvg as unknown as HTMLElement, q(Math.min(1, Math.min(1, pf) * (style?.weather?.noise ?? 0))));
    setOp(glow, q(clamp(lightMean, 0, 1)));
    setVarOn(skySvg, '--pf2', q20(pfv));
    setVarOn(skySvg, '--light', q20(clamp(lightMean, 0, 1)));
    const smk = (Math.round((0.22 + 0.3 * Math.min(1, pf) + 0.12 * v.pace) * 10) / 10).toFixed(1);
    for (const b of BANDS) setVarOn(bw[b], '--smk-a', smk);
    const rs = { setProperty: setVar };
    setVarOn(bw.near, '--pfc', q20(Math.min(1, pf)));
    rs.setProperty('--res', q(clamp(v.reserveFraction, 0.02, 1)));
    rs.setProperty('--dep', q(1 - clamp(v.reserveFraction, 0, 1)));
    setVarOn(bw.near, '--light', q20(clamp(lightMean, 0, 1)));
    const wash = style?.wash?.(Math.round(pfv * 10) / 10, Math.round(clear * 5) / 5) ?? null;
    if (wash) { rs.setProperty('--s-wash', wash[0]); rs.setProperty('--s-water', wash[1]); }
    const lamp = LAMP[clamp(Math.round(v.stage), 0, 3)];
    rs.setProperty('--s-lamp', lamp[0]); rs.setProperty('--s-lamprgb', lamp[1]);
    const pace = v.pace < 0.3 ? 0 : v.pace < 0.7 ? 1 : 2;
    if (pace !== prevPace) { root.classList.remove('pace0', 'pace1', 'pace2'); root.classList.add('pace' + pace); }
    root.classList.toggle('steady', !!v.steady);
    root.classList.toggle('decoupling', !!v.decoupling);
    if (root.classList.contains('halt') !== !!v.reckoning) { root.classList.toggle('halt', !!v.reckoning); syncPlay(); }
    // A city under strain (pressure near collapse, not yet clearing): styles may stage blackouts, failing signs.
    root.classList.toggle('stress', pf >= 0.8 && !v.steady && clear < 0.3);

    const now = Date.now(); // UI-side timers only (the scene holds no game rules)
    // Crisis moment.
    if (prevCrises >= 0 && prevSector === v.sectorId && v.crises > prevCrises) {
      root.classList.remove('crisis'); void root.offsetWidth; root.classList.add('crisis');
      clearTimeout(crisisTimer);
      crisisTimer = window.setTimeout(() => root.classList.remove('crisis'), 7200);
      flash(v.crisisName, 7000);
    }
    if (!prevSteady && v.steady && prevSector === v.sectorId) flash('The sky clears.', 6000);

    // Refresh each plot's application from this view (plots are built once; the data moves every tick).
    const byId = new Map(v.apps.map((a) => [a.id, a]));
    for (const p of plots) if (p.app) p.app = byId.get(p.app.id) ?? p.app;
    // Founding moments are played only when one or two places change at once (not on a jump or a load).
    let changes = 0;
    for (const p of plots) if (p.app && p.status && p.status !== p.app.status && p.app.status === 'founded') changes++;
    const allowBuild = changes > 0 && changes <= 2;
    // Plots.
    const durK = [1.3, 1, 0.7][pace];
    for (const p of plots) {
      const d = density(p, v, lightMean);
      const st = p.app ? p.app.status : 'always';
      if (p.app) {
        const prev = prevStatus.get(p.app.id);
        if (p.status !== st) {
          p.status = st;
          setOn(`${p.idx}:a`, st === 'founded');
          if (p.ghost) { p.ghost.classList.toggle('on', st !== 'founded'); p.ghost.classList.toggle('avail', st === 'available'); }
          p.svy?.classList.toggle('on', st === 'available');
          if (st === 'founded' && prev && prev !== 'founded' && allowBuild && !rm()) {
            // Founding: scaffold goes up and the landmark rises.
            (elsByKey.get(`${p.idx}:a`) ?? []).forEach((el) => { el.classList.remove('build'); void (el as SVGGElement).getBBox; el.classList.add('build'); });
            if (p.scaf) { p.scaf.classList.remove('on'); void (p.scaf as SVGGElement).getBBox; p.scaf.classList.add('on'); }
            window.setTimeout(() => { p.scaf?.classList.remove('on'); (elsByKey.get(`${p.idx}:a`) ?? []).forEach((el) => el.classList.remove('build')); }, 2700);
            showToast(`${p.app.name} founded`);
          }
        }
        prevStatus.set(p.app.id, st);
        if (p.btn) {
          p.btn.classList.toggle('avail', st === 'available');
          const lbl = placeLabel(p.app, v);
          if (p.btn.getAttribute('aria-label') !== lbl) p.btn.setAttribute('aria-label', lbl);
        }
      } else if (p.anchorKey && p.count < 0) setOn(p.anchorKey, true);

      const n = p.keys.length;
      const curve = p.def.curve ?? 0.6;
      let c = d <= 0.001 ? 0 : Math.min(n, Math.round(n * Math.pow(d, curve)));
      if (p.overlayBase) {
        const baseCount = p.overlayBase.count < 0 ? 0 : p.overlayBase.count;
        const ovKey = c * 1000 + baseCount;
        if (ovKey !== p.count) {
          p.count = ovKey;
          const lit = new Set(p.overlayOrder.slice(0, c));
          p.keys.forEach((k, i) => setOn(k, lit.has(i) && i < baseCount));
        }
      } else if (c !== p.count) {
        const prevC = Math.max(0, p.count);
        p.count = c;
        p.keys.forEach((k, i) => setOn(k, i < c));
        smokeDirty = true;
        void prevC;
      }
      // Movers: more trains, more often.
      const m = p.movers.length;
      if (m) {
        const mc = d <= 0.001 ? 0 : Math.max(1, Math.min(m, Math.ceil(m * Math.pow(d, 0.8))));
        const want = (p.app ? st === 'founded' : true) ? mc : 0;
        if (want !== p.mcount) {
          p.mcount = want;
          // In low detail every second mover beyond the first is dropped (by class, so no rebuild is needed).
          p.movers.forEach((el, i) => { el.classList.toggle('on', i < want); el.classList.toggle('thin', i > 0 && i % 2 === 1); });
          moversDirty = true;
        }
        if (pace !== prevPace) {
          for (const md of p.moverDefs) {
            const a = md.el ? animOf.get(md.el) : undefined;
            if (!a) continue;
            try {
              const t = Number(a.currentTime ?? 0), d0 = Number(a.effect?.getTiming().duration ?? 1) || 1;
              const d1 = md.dur * durK * 1000;
              a.effect?.updateTiming({ duration: d1 });
              a.currentTime = (t % d0) / d0 * d1;
            } catch { /* ignore */ }
          }
        }
      }
    }
    prevPace = pace;
    if (smokeDirty) { smokeDirty = false; assignSmoke(); }

    // Restraint.
    const inForce = new Set(v.levers.map((x) => x.kind));
    const lvKey = [...inForce].sort().join(',');
    if (lvKey !== leverKey) {
      for (const c of Array.from(root.classList)) if (c.startsWith('lv-')) root.classList.remove(c);
      for (const k of inForce) if (/^[\w-]+$/.test(k)) root.classList.add('lv-' + k);
      leverKey = lvKey;
    }
    restraintEls.forEach((els, k) => els.forEach((el) => el.classList.toggle('on', inForce.has(k))));
    if (prevSteadyOn !== !!v.steady) { prevSteadyOn = !!v.steady; steadyMoverEls.forEach((el) => el.classList.toggle('on', !!v.steady)); moversDirty = true; }
    if (moversDirty) { moversDirty = false; syncPlay(); }

    // Reckoning: the world stops.
    if (v.reckoning) {
      const cause = v.reckoning.cause;
      const t = cause === 'exhausted' ? `${v.resourceName}: spent.` : cause === 'collapse' ? `${v.pressureName}: past bearing.` : 'The books are closed.';
      setBanner(v.reckoning.here || cause === 'chosen' ? t : 'Elsewhere, a Reckoning.');
    } else if (captionUntil > now) {
      setBanner(captionText);
    } else setBanner('');

    prevStage = v.stage; prevSector = v.sectorId; prevCrises = v.crises; prevSteady = v.steady;
    renderCard(v);
    const s = describeView(v);
    if (s !== summaryText) { summaryText = s; summary.textContent = s; }
  }
  let smokeDirty = true;
  let leverKey = '\u0000';
  const varCache = new Map<string, string>();
  const elCache = new WeakMap<Element, Record<string, string>>();
  function setVarOn(el: HTMLElement | SVGElement, k: string, val: string): void {
    let c = elCache.get(el);
    if (!c) { c = {}; elCache.set(el, c); }
    if (c[k] === val) return;
    c[k] = val;
    el.style.setProperty(k, val);
  }
  function setOp(el: HTMLElement, val: string): void { setVarOn(el, 'opacity', val); }
  function setVar(k: string, val: string): void {
    if (varCache.get(k) === val) return;
    varCache.set(k, val);
    root.style.setProperty(k, val);
  }

  function assignSmoke(): void {
    let live = 0;
    for (const s of smokeEls) {
      const on = s.key === 'bd' ? true : (elsByKey.get(s.key)?.[0]?.classList.contains('on') ?? false);
      if (s.key === 'bd') s.el.classList.add('on');
      const isLive = on && live < (lowDetail ? MAX_LIVE_SMOKE_LOW : MAX_LIVE_SMOKE);
      if (isLive) live++;
      s.el.classList.toggle('live', isLive);
    }
  }

  let bannerText = '';
  function setBanner(t: string): void {
    if (t === bannerText) return;
    bannerText = t;
    if (t) { banner.innerHTML = `<span>${esc(t)}</span>`; banner.classList.add('on'); } else banner.classList.remove('on');
  }
  let toastTimer = 0;
  function showToast(t: string): void {
    toast.textContent = t;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('on'), 2800);
  }
  let flashTimer = 0;
  function flash(t: string, ms: number): void {
    captionText = t;
    captionUntil = Date.now() + ms;
    clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => { if (lastView && !destroyed) { captionDirty = true; patch(lastView); } }, ms + 50);
  }

  function placeLabel(a: SceneApp, v: SceneView): string {
    if (a.status === 'founded') return `${a.name}, ${busyWord(a.adoption)}: ${Math.round(a.adoption * 100)}% adopted, ${numf(a.demand)} ${v.serviceUnit} a second`;
    if (a.status === 'available') return `${a.name}: staked out. Found for ${money(a.foundCost)}${a.canFound ? '' : ', not yet affordable'}`;
    return 'An empty plot, not yet thinkable';
  }

  function renderCard(v: SceneView): void {
    if (opts.card === false) return;
    const a = selected ? v.apps.find((x) => x.id === selected) : undefined;
    if (!a) {
      if (!sel.hidden) sel.hidden = true;
      if (cap.hidden) cap.hidden = false;
      const t = caption(v);
      if (cap.textContent !== t) cap.textContent = t;
      return;
    }
    sel.hidden = false; cap.hidden = true;
    selN.textContent = a.status === 'hidden' ? 'An empty plot' : a.name;
    if (a.status === 'founded') {
      selM.innerHTML = `<span>${esc(numf(a.demand))} ${esc(v.serviceUnit)}/s</span><span class="scn-bar" aria-hidden="true"><i style="width:${(a.adoption * 100).toFixed(1)}%"></i></span><span>${Math.round(a.adoption * 100)}% adopted</span>`;
      selB.textContent = a.blurb; found.hidden = true;
    } else if (a.status === 'available') {
      selM.textContent = 'Surveyed and staked out.';
      selB.textContent = a.blurb;
      found.hidden = false;
      foundL.textContent = 'Found';
      foundR.textContent = money(a.foundCost);
      found.setAttribute('aria-disabled', a.canFound ? 'false' : 'true');
      found.setAttribute('aria-label', `Found ${a.name} for ${money(a.foundCost)}`);
      foundFill.style.width = a.canFound ? '0%' : (a.affordFraction * 100).toFixed(1) + '%';
    } else {
      selM.textContent = a.visibleBelow != null ? `Not yet thinkable: wants ${v.serviceName.toLowerCase()} below £${fmtPrice(a.visibleBelow)}/${v.serviceUnit}.` : 'Not yet thinkable.';
      selB.textContent = ''; found.hidden = true;
    }
  }

  function setSector(sid: string): void {
    if (lastView && lastView.sectorId === sid) return;
    selected = null;
    builtKey = '';
    prevCrises = -1;
  }

  function update(v: SceneView): void {
    if (destroyed || !v || typeof v !== 'object') return;
    try {
      const view = normalise(v);
      const key = [view.sectorId, view.look, clamp(Math.round(view.stage), 0, 3), view.apps.map((a) => a.id + '/' + a.icon).join(','),
        view.levers.map((x) => x.kind).filter((k) => !layout?.restraint[k]).sort().join(','),
        Object.entries(view.heritage ?? {}).map(([k, x]) => k + Math.round(x * 3)).join(',')].join('|');
      if (key !== builtKey || !layout) {
        const stageChanged = builtKey !== '' && prevSector === view.sectorId && prevStage !== view.stage;
        if (prevSector !== view.sectorId) { selected = null; prevCrises = -1; prevSteady = view.steady; }
        builtKey = key;
        lastSig = '';
        build(view);
        if (stageChanged && !rm()) {
          // The machines evolve: founded landmarks re-draw themselves.
          window.setTimeout(() => plots.forEach((p) => (elsByKey.get(`${p.idx}:a`) ?? []).forEach((el) => {
            el.classList.add('evolve');
            window.setTimeout(() => el.classList.remove('evolve'), 1500);
          })), 40);
        }
      }
      // Skip the patch when nothing has moved past what the picture or card can show.
      const sig = viewSig(view);
      if (sig === lastSig && lastView && key === builtKey && !captionDirty) { lastView = view; return; }
      lastSig = sig; captionDirty = false;
      lastView = view;
      patch(view);
    } catch (e) {
      console.warn('scene update failed', e);
    }
  }

  function destroy(): void {
    destroyed = true;
    io?.disconnect(); ro?.disconnect();
    moverAnims.forEach((a) => a.cancel());
    document.removeEventListener('visibilitychange', onVis);
    mq?.removeEventListener?.('change', onMq);
    clearTimeout(crisisTimer); clearTimeout(flashTimer); clearTimeout(toastTimer);
    root.remove();
  }

  return {
    update,
    setSector,
    select: (a) => select(a, false),
    setReducedMotion: (on) => { rmOverride = on; applyMotion(); },
    setDetail: (d) => { detailOpt = d; if (d === 'auto') { setLow(false); watchFrames(); } else setLow(d === 'low'); },
    describe: () => summaryText,
    destroy,
  };
}

/** A sprite's drawing: an overflow-visible SVG drawn about the sprite's origin. */
function spr(inner: string): string {
  return `<svg class="spr" width="1" height="1" overflow="visible" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/** Depth at which a mover is drawn among the static scenery: its own z, else the nearer end of its track. */
function moverZ(m: MoverDef): number { return m.z ?? Math.max(m.y0, m.y1); }

const LAMP: [string, string][] = [
  ['#e9a24a', '233,162,74'],   // tallow and oil: dim orange
  ['#f6c65b', '246,198,91'],   // gas flame
  ['#fae6a8', '250,230,168'],  // mantle: whiter
  ['#fff1cf', '255,241,207'],  // filament: warm white (the poster never prints it blue)
];

function fmtPrice(p: number): string {
  if (!Number.isFinite(p)) return '—';
  return p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(2) : p.toPrecision(2);
}

/** Generic works in a spare rectangle for an application icon the layout does not know. */
function sparePlot(l: Layout, rect: [number, number, number, number], a: SceneApp): PlotDef {
  const [x, y, w, h] = rect;
  const r = rng(hash(l.id + ':spare:' + a.id));
  const slots: Slot[] = [];
  for (let i = 0; i < 7; i++) slots.push({ p: a.icon || 'works', x: x + 8 + r() * (w - 16), y: y + h * 0.35 + r() * h * 0.6, v: r() });
  slots.sort((p, q) => Math.abs(p.x - (x + w / 2)) - Math.abs(q.x - (x + w / 2)));
  return {
    key: 'spare:' + a.id, match: [a.icon], anchor: { p: a.icon || 'works', x: x + w / 2, y: y + h, v: 0.5 }, slots,
    hit: [x, y + h - Math.max(74, h * 1.4), Math.max(74, w), Math.max(74, h * 1.4)],
  };
}

/** A coarse signature of everything the scene shows: equal signatures draw the same picture and card. */
function viewSig(v: SceneView): string {
  const q = (x: number, n: number) => Math.round(x * n);
  const sig2 = (x: number) => (x ? Number(x.toPrecision(2)) : 0);
  let s = `${v.sectorId}|${v.look}|${v.stage}|${q(v.pace, 20)}|${q(v.reserveFraction, 50)}|${q(v.pressureFraction, 50)}|${q(v.popFraction, 50)}|${v.crises}|` +
    `${v.decoupling ? 1 : 0}${v.steady ? 1 : 0}|${q(v.steadyProgress, 50)}|${v.reckoning ? v.reckoning.cause + v.reckoning.here : ''}|`;
  for (const a of v.apps) s += `${a.id}:${a.status[0]}${q(a.adoption, 100)}:${sig2(a.demand)}:${a.canFound ? 1 : 0}${q(a.affordFraction, 100)};`;
  for (const l of v.levers) s += `${l.kind}${l.level},`;
  return s;
}

function normalise(v: SceneView): SceneView {
  const n = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  return {
    ...v,
    sectorId: String(v.sectorId ?? 'unknown'),
    sectorName: String(v.sectorName ?? v.sectorId ?? ''),
    look: String(v.look ?? 'ledger'),
    serviceName: String(v.serviceName ?? 'Service'), serviceUnit: String(v.serviceUnit ?? ''),
    resourceName: String(v.resourceName ?? 'Resource'), pressureName: String(v.pressureName ?? 'Pressure'),
    crisisName: String(v.crisisName ?? 'A crisis'),
    apps: Array.isArray(v.apps) ? v.apps.filter((a) => a && typeof a.id === 'string').map((a) => ({
      ...a, name: String(a.name ?? a.id), icon: String(a.icon ?? ''), blurb: String(a.blurb ?? ''),
      status: a.status === 'founded' || a.status === 'available' ? a.status : 'hidden',
      adoption: clamp(n(a.adoption), 0, 1), demand: n(a.demand), foundCost: n(a.foundCost), canFound: !!a.canFound,
      affordFraction: clamp(n(a.affordFraction), 0, 1), visibleBelow: a.visibleBelow == null ? null : n(a.visibleBelow),
    })) : [],
    stage: clamp(n(v.stage), 0, 3), etaFold: n(v.etaFold, 1), rFold: n(v.rFold, 1), pace: clamp(n(v.pace), 0, 1),
    reserveFraction: clamp(n(v.reserveFraction, 1), 0, 1), pressureFraction: clamp(n(v.pressureFraction), 0, 1.5),
    population: n(v.population, 1), popFraction: clamp(n(v.popFraction), 0, 1), crises: n(v.crises),
    levers: Array.isArray(v.levers) ? v.levers.filter((x) => x && typeof x.kind === 'string') : [],
    decoupling: !!v.decoupling, steadyProgress: clamp(n(v.steadyProgress), 0, 1), steady: !!v.steady,
    heritage: v.heritage && typeof v.heritage === 'object' ? v.heritage : undefined,
    reckoning: v.reckoning && typeof v.reckoning === 'object' ? { cause: String(v.reckoning.cause ?? 'chosen'), here: v.reckoning.here !== false } : null,
  };
}

const WEATHER = ['clear', 'hazy', 'thickening', 'heavy', 'choking'];
function weatherWord(pf: number): string {
  return WEATHER[pf < 0.08 ? 0 : pf < 0.3 ? 1 : pf < 0.55 ? 2 : pf < 0.8 ? 3 : 4];
}
function reserveWord(r: number, flow: boolean): string {
  if (flow) return r > 0.6 ? 'plenty to spare' : r > 0.3 ? 'stretched' : r > 0.1 ? 'nearly all spoken for' : 'exhausted';
  return r > 0.85 ? 'barely touched' : r > 0.6 ? 'three-quarters left' : r > 0.4 ? 'half gone' : r > 0.2 ? 'running low' : r > 0.05 ? 'nearly spent' : 'spent';
}

function caption(v: SceneView): string {
  const founded = v.apps.filter((a) => a.status === 'founded').length;
  const avail = v.apps.some((a) => a.status === 'available');
  const parts = [`${v.pressureName}: ${weatherWord(v.pressureFraction)}`, `${v.resourceName.toLowerCase()} ${reserveWord(v.reserveFraction, v.resourceKind === 'flow')}`];
  if (v.steady) parts.push('steady state');
  else if (v.decoupling) parts.push('holding the line');
  let s = parts.join(' · ') + '.';
  if (avail) s += ' A site is staked out: tap it.';
  else if (founded === 0) s += ' Empty country.';
  return s;
}

const busyWord = (x: number) => (x > 0.75 ? 'everywhere' : x > 0.4 ? 'spreading' : x > 0.1 ? 'a few' : 'just begun');

/** The scene in words, as a screen-reader user would want it: the place, what stands in it, the weather, the stakes. */
export function describeView(v: SceneView): string {
  const f = v.apps.filter((a) => a.status === 'founded');
  const av = v.apps.filter((a) => a.status === 'available');
  const lay = layoutFor(v.sectorId, v.apps.length), place = lay.place;
  let s = `${v.sectorName}: ${place}. `;
  s += f.length ? f.map((a) => `${a.name} ${busyWord(a.adoption)}`).join('; ') + '. ' : 'Nothing built yet. ';
  if (av.length) s += `Ready to found: ${av.map((a) => a.name).join(', ')}. `;
  s += `${v.pressureName} ${weatherWord(v.pressureFraction)}; ${v.resourceName.toLowerCase()} ${reserveWord(v.reserveFraction, v.resourceKind === 'flow')}`;
  const rw = lay.reserveWords?.(v.reserveFraction);
  s += rw ? `: ${rw}. ` : '. ';
  if (v.levers.length) s += `In force: ${v.levers.map((x) => x.name).join(', ')}. `;
  if (v.reckoning) s += 'Everything has stopped: a Reckoning is due.';
  else if (v.steady) s += 'The sky has cleared: steady state.';
  else if (v.decoupling) s += `Holding within budget, ${Math.round(v.steadyProgress * 100)}% of the way to steady state.`;
  else if (v.pressureFraction >= 0.8) s += 'Close to breaking.';
  return s.trim();
}

void mix;
