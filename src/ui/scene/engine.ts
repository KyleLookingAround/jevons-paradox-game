// The scene engine: builds a layered SVG landscape from a Layout + prop libraries, then patches it in place.
//
// Layers, back to front:  sky (gradients) · sky svg · far static · far fx · mist · smog · mid static · mid fx · smog ·
//   near static (+ cut-away) · near fx · smog · held wash · flash · crisis fog · places (buttons) · banner.
// Static layers repaint only when something appears; moving things live in fx layers (CSS transform/opacity).
//
// One world per Industry: each build is kept (with its own layers and animations) and swapped back in when the
// player returns to that tab, so a switch costs a re-attach, not a rebuild. A host can prebuild other Industries
// when idle (`prebuild`).
import type { SceneView, SceneOptions, SceneHandle, SceneApp, SceneTarget, StillOptions, ReplayOptions } from './types';
import type { Layout, PlotDef, Slot, Band, FxKind, PropArgs, PropOut, Prop, MoverDef } from './layout';
import { depthScale } from './layout';
import { injectSceneCss, sceneCss } from './css';
import { hash, rng, f, clamp, esc, P, C } from './svg';
import { layoutFor, propFor } from './registry';
import { styleFor } from './styles/index';
import type { ArtStyle } from './style';
import { scaffold, survey } from './props/common';
import { MomentDesk, type Moment } from './moments';
import { figureArt } from './props/figures';

const NS = 'http://www.w3.org/2000/svg';
const VB = '0 0 600 400';
const W = 600, H = 400;
const BANDS: Band[] = ['far', 'mid', 'near'];
const MAX_LIVE_SMOKE = 10, MAX_LIVE_SMOKE_LOW = 4;
// M4: seven Industries in Act I and its Previews: keep a world for each, so a tab switch is always a re-attach.
const MAX_CACHED = 7, MAX_SCAFFOLDS = 3;
let instances = 0;

interface FxSpec { kind: FxKind; x: number; y: number; size: number; markup?: string }
interface Item { y: number; ord: number; band: Band; html: string; fx: string[] }

interface PlotRt {
  def: PlotDef;
  idx: number;
  app: SceneApp | null;
  /** keys of slot elements in appear order */
  keys: string[];
  mkeys: string[];
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

/** The layers of one world (one Industry's picture). */
interface WorldEls {
  world: HTMLDivElement; defs: SVGSVGElement; sky0: HTMLDivElement; sky1: HTMLDivElement; sky2: HTMLDivElement; glow: HTMLDivElement;
  skySvg: SVGSVGElement; bw: Record<Band, HTMLDivElement>; mist1: HTMLDivElement; mist2: HTMLDivElement;
  hz1: HTMLDivElement; hz2: HTMLDivElement; hz3: HTMLDivElement; held: HTMLDivElement; flash: HTMLDivElement; fog: HTMLDivElement;
  noiseSvg: SVGSVGElement; extraLayer: HTMLDivElement; plateSvg: SVGSVGElement; places: HTMLDivElement;
  /** M3: sprites over the drawing (Light's day clock, the cast in the foreground), rebuilt only when they change. */
  m3: HTMLDivElement;
}

/** One built picture, kept per Industry. */
interface Built {
  key: string; sectorId: string; el: WorldEls; layout: Layout; style: ArtStyle | undefined; look: string; legend: string; place: string;
  plots: PlotRt[]; elsByKey: Map<string, Element[]>; smokeEls: { el: Element; key: string; size: number }[];
  restraintEls: Map<string, Element[]>; commonsEls: Map<string, Element[]>; steadyMoverEls: Element[]; moverAnims: Animation[];
  /** Restraint/commons slot positions (for highlight rings). */
  spots: Map<string, [number, number, number, number]>;
  prevPace: number; leverKey: string; smokeDirty: boolean; prevSteadyOn: boolean | null; moversDirty: boolean; lastSig: string;
  stageN: number; used: number; vars: Map<string, string>; scafs: number;
  /** The few drawings that follow what is left of the reserve (`--res`, `--dep`): the values are set on them, not on the
   *  world, since a custom property changed on the world restyles (and repaints) every node of it (perf pass 2). */
  resEls: Element[]; resK: string;
  /** The sprite layers (smoke reads `--smk-a` there, not on the bands, whose drawings would all restyle with it). */
  fxLayers: HTMLDivElement[];
  /** M3: last applied state of the mechanics' drawings (so a patch touches the DOM only on change). */
  /** Last shown values of hysteresis-stepped inputs (see hyst). */
  hy: Map<string, number>;
  m3: {
    seams: string; free: string; bites: string; slow: number; overlay: string;
    /** Light's clock: the hand's animation (its time is the hour), the scale on lit things at that hour, the hour shown. */
    hand: Animation | null; hourK: number; hour: number;
  };
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

function makeWorld(): WorldEls {
  const world = div('scn-world');
  const defs = svgEl('scn-defs');
  const sky0 = div('scn-sky'), sky1 = div('scn-sky smog'), sky2 = div('scn-sky fresh');
  const glow = div('scn-glow');
  const skySvg = svgEl('scn-l');
  // Each depth band is a wrapper holding alternating static and fx SVGs: static₀ · fx₀ · static₁ · fx₁ … The bands are
  // split at the depth of each mover track, so a train passes behind the buildings nearer than its line and in front
  // of those further away, while static layers still never repaint for motion.
  const bw: Record<Band, HTMLDivElement> = { far: div('scn-bw bw-far'), mid: div('scn-bw bw-mid'), near: div('scn-bw bw-near') };
  const mist1 = div('scn-hz mist'), mist2 = div('scn-hz mist m2');
  const hz1 = div('scn-hz smog h1'), hz2 = div('scn-hz smog h2'), hz3 = div('scn-hz smog h3');
  const held = div('scn-held'), flash = div('scn-flash');
  const fog = div('scn-fog');
  const noiseSvg = svgEl('scn-l scn-noise');
  const extraLayer = div('scn-extra');
  const plateSvg = svgEl('scn-l scn-plate');
  const m3 = div('scn-fxl scn-m3');
  world.append(defs, sky0, sky1, sky2, glow, skySvg, bw.far, mist1, hz1, bw.mid, mist2, hz2, bw.near, hz3, held, m3, extraLayer, noiseSvg, flash, fog, plateSvg);
  const places = div('scn-places');
  return { world, defs, sky0, sky1, sky2, glow, skySvg, bw, mist1, mist2, hz1, hz2, hz3, held, flash, fog, noiseSvg, extraLayer, plateSvg, places, m3 };
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
  const banner = div('scn-banner');
  banner.setAttribute('aria-hidden', 'true');
  const toast = div('scn-toast');
  toast.setAttribute('aria-hidden', 'true');
  const emblem = div('scn-emb');
  emblem.setAttribute('aria-hidden', 'true');
  const ring = div('scn-hl');
  ring.setAttribute('aria-hidden', 'true');
  // M4: the Preview corner mark (an Industry of a Preview Act).
  const prevMark = div('scn-prev');
  prevMark.setAttribute('aria-hidden', 'true');
  prevMark.textContent = 'Preview';
  stage.append(banner, toast, emblem, prevMark, ring);
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
  let B: Built | null = null;
  const cache = new Map<string, Built>();
  let lastView: SceneView | null = null;
  let selected: string | null = null;
  let rmOverride: boolean | null = typeof opts.reducedMotion === 'boolean' ? opts.reducedMotion : null;
  let visible = true;
  let summaryText = '';
  let destroyed = false;
  const desk = new MomentDesk();
  let lastStageSeen = new Map<string, number>();
  // Detail: 'full', 'low' (fewer movers and live chimneys, no second rain sheet or signal noise), or 'auto' (full,
  // dropping to low for the rest of the session if frames run long while the scene is on screen).
  let detailOpt: 'auto' | 'low' | 'full' = opts.detail ?? 'auto';
  let lowDetail = detailOpt === 'low';
  let captionDirty = false;
  const animOf = new WeakMap<Element, Animation>();
  let planeK = 0;
  let target: SceneTarget = null;
  let replaying = 0;
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number): number => {
    const t = window.setTimeout(() => { timers.delete(t); if (!destroyed) fn(); }, ms);
    timers.add(t);
    return t;
  };

  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const rm = () => (rmOverride ?? !!mq?.matches);
  function setLow(on: boolean): void {
    lowDetail = on;
    root.classList.toggle('lowd', on);
    assignSmoke();
    syncPlay();
  }
  /** Auto detail: watch the main thread for a few seconds after a build, passively (long-animation-frame or long
   *  task entries; a rAF loop would itself keep the page restyling every frame). If more than a quarter of the time
   *  is lost to long frames while the scene is on screen and moving, go low for the rest of the session. */
  let watchId = 0;
  function watchFrames(): void {
    if (detailOpt !== 'auto' || lowDetail || typeof PerformanceObserver !== 'function') return;
    const types: readonly string[] = (PerformanceObserver as unknown as { supportedEntryTypes?: string[] }).supportedEntryTypes ?? [];
    const type = types.includes('long-animation-frame') ? 'long-animation-frame' : types.includes('longtask') ? 'longtask' : '';
    if (!type) return;
    const my = ++watchId;
    later(() => {
      if (destroyed || my !== watchId || lowDetail) return;
      let lost = 0;
      const t0 = performance.now();
      let po: PerformanceObserver | null = null;
      try {
        po = new PerformanceObserver((l) => {
          if (rm() || root.classList.contains('paused') || root.classList.contains('halt')) return;
          for (const e of l.getEntries()) lost += Math.max(0, e.duration - 16.7);
        });
        po.observe({ type, buffered: false } as PerformanceObserverInit);
      } catch { return; }
      later(() => {
        po?.disconnect();
        const span = performance.now() - t0;
        if (my === watchId && !lowDetail && span > 0 && lost / span > 0.25) setLow(true);
      }, 4000);
    }, 1500);
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
    syncShed();
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
  stage.addEventListener('click', (ev) => {
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
    if (B) for (const p of B.plots) p.btn?.classList.toggle('sel', !!p.app && p.app.id === appId);
    if (lastView) renderCard(lastView);
    if (fromUser) { try { opts.onSelect?.(appId); } catch (e) { console.warn('scene onSelect', e); } }
  }

  /* ---------------- build ---------------- */
  function propArgs(sl: Slot, s: number, stageN: number, seed: number, overlay: boolean): PropArgs {
    const r = rng(seed);
    const lvl = hatchLevel(s);
    return {
      s, v: sl.v ?? r(), stage: stageN, w: sl.w ?? 0, h: sl.h ?? 0, r, overlay,
      u: (x: string) => `url(#${pid}${x})`,
      hatch: (level = 0) => `url(#${pid}${level ? 'x' : 'h'}${lvl})`,
    };
  }
  /** Def-id prefix of the world being built: unique per build, since kept worlds share the document. */
  let pid = id;
  let builds = 0;

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
    if (e.kind === 'flow') {
      // Packets along a cable: three copies of the dashed path, a third of a dash apart, shown in turn by opacity
      // (composited), rather than animating stroke-dashoffset (which restyles and repaints every frame).
      const m = e.markup ?? '';
      return `<div class="fx flow" data-k="${key}" style="${pos};transform:scale(${sc})">` +
        [0, 1, 2].map((i) => `<b class="f${i}">${spr(m.replace('<path ', `<path style="stroke-dashoffset:${-i * 5.33}" `))}</b>`).join('') + `</div>`;
    }
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

  function siteFromHit(def: PlotDef): [number, number, number, number] | null {
    if (!def.anchor) return null;
    const a = def.anchor;
    const w = Math.min(70, def.hit ? def.hit[2] * 0.7 : 50);
    return [a.x - w / 2, a.y - 10, w, 10];
  }

  function buildKey(view: SceneView): string {
    const l = layoutFor(view.sectorId, view.apps.length);
    return [view.sectorId, view.look, clamp(Math.round(view.stage), 0, 3), view.apps.map((a) => a.id + '/' + a.icon).join(','),
      view.levers.map((x) => x.kind).filter((k) => !l.restraint[k]).sort().join(','),
      Object.entries(view.heritage ?? {}).map(([k, x]) => k + Math.round(x * 3)).join(','),
      (view.commons ?? []).map((c) => `${c.id}/${c.icon}/${Math.min(3, c.level)}`).join(','), view.landmark ?? '', m3Key(view)].join('|');
  }

  function build(v: SceneView, key: string): Built {
    const l = layoutFor(v.sectorId, v.apps.length);
    // The art style belongs to the layout (its Age); a generic layout follows the page look.
    const pick = (k: string) => { const st = styleFor(k); return st && st.css ? st : undefined; };
    const style = (l.look !== 'generic' ? pick(l.look) : undefined) ?? pick(v.look) ?? pick('generic');
    const look = style?.id ?? 'generic';
    const el = makeWorld();
    pid = `${id}${++builds}-`;
    el.defs.innerHTML = `<defs>${style ? style.defs(pid) : ''}</defs>`;
    const pctx = { caption: l.caption ?? '', name: v.sectorName, u: (x: string) => `url(#${pid}${x})` };
    let plate = '', leg = '';
    try { plate = style?.plate?.(pctx) ?? ''; leg = style?.legend?.(pctx) ?? ''; } catch (e) { console.warn('scene plate', e); }
    el.plateSvg.innerHTML = plate;
    el.extraLayer.innerHTML = style?.layers ?? '';
    el.noiseSvg.innerHTML = style?.noise ?? '';
    const items: Item[] = [];
    const fxBand: Record<Band, { z: number; html: string }[]> = { far: [], mid: [], near: [] };
    const stageN = clamp(Math.round(v.stage), 0, 3);
    const bctx = {
      u: (x: string) => `url(#${pid}${x})`,
      hatch: (s: number, level: 0 | 1 = 0) => `url(#${pid}${level ? 'x' : 'h'}${hatchLevel(s)})`,
      r: rng(hash(l.id)),
      stage: stageN,
      heritage: v.heritage,
      seams: v.seams && v.seams.total > 0 ? Math.min(8, Math.floor(v.seams.total)) : undefined,
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

    const plots: PlotRt[] = [];
    const baseOrd = new Map<string, number>();
    const all: { def: PlotDef; app: SceneApp | null }[] = [...others.filter((p) => !p.overlayOf).map((d) => ({ def: d, app: null })), ...assigned,
      ...others.filter((p) => !!p.overlayOf).map((d) => ({ def: d, app: null }))];
    let uid = 0;
    for (const { def, app } of all) {
      const idx = plots.length;
      const rt: PlotRt = { def, idx, app, keys: [], mkeys: [], anchorKey: null, movers: [], moverDefs: [], overlayBase: null, overlayOrder: [], count: -1, mcount: -1, status: '', btn: null, ghost: null, svy: null, scaf: null };
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
          items.push({ y: def.anchor.y + 0.01, ord: uid++, band: def.anchor.band ?? bandOf(l, def.anchor.y), html: `<g class="scaf" data-k="${idx}:f" transform="translate(${f(def.anchor.x)} ${f(def.anchor.y)}) scale(${Math.round(sc * 1000) / 1000})"><g class="sgr">${scaffold(bw, 46)}</g></g>`, fx: [] });
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
            const it = renderSlot(l, look, sl, key, def.byHour ? 'sl0 ov nr' : 'sl0 ov', stageN, `${l.id}:${base.def.key}:${i}:ov:${def.key}`, true, def.overlayProp ?? sl.p);
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
          const it = renderSlot(l, look, sl, key, (def.fade ? 'sl0 fd' : 'sl0') + (def.byHour ? ' nr' : ''), stageN, `${seedBase}:${i}`);
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
          rt.mkeys.push(key);
        }
      });
      plots.push(rt);
    }

    // Signs of restraint, one per lever kind (plus spare notice boards for unknown kinds in force).
    const spots = new Map<string, [number, number, number, number]>();
    const spotOf = (sl: Slot): [number, number, number, number] => {
      const s = sl.s ?? depthScale(l, sl.y) * (sl.k ?? 1);
      return [sl.x - 26 * s, sl.y - 40 * s, 52 * s, 46 * s];
    };
    const rkinds = Object.keys(l.restraint);
    const extra = v.levers.map((x) => x.kind).filter((k) => !l.restraint[k]);
    const spareR = l.restraintSpare ?? [];
    [...rkinds, ...extra].forEach((k, i) => {
      const sl = l.restraint[k] ?? (spareR[(i - rkinds.length) % Math.max(1, spareR.length)] ? { ...spareR[(i - rkinds.length) % spareR.length], p: 'notice' } : null);
      if (!sl) return;
      const it = renderSlot(l, look, sl, `r:${k}`, 'rst', stageN, `${l.id}:r:${k}`);
      it.ord = uid++;
      items.push(it);
      spots.set('lever:' + k, spotOf(sl));
    });

    // The Commons: the founded projects of this Industry, each on a civic site of the town (Layout.commons, else
    // sites taken from the town's own house plots), drawn by icon (unknown icons: a civic hall). Levels add detail.
    const csites = commonsSites(l);
    (v.commons ?? []).forEach((c, i) => {
      const site = csites[i % Math.max(1, csites.length)];
      if (!site) return;
      const sl: Slot = { ...site, p: 'commons:' + c.icon, w: Math.min(3, c.level), v: (hash(c.id) % 1000) / 1000 };
      const it = renderSlot(l, look, sl, `c:${c.id}`, 'cmn', stageN, `${l.id}:c:${c.id}`, false, commonsProp(l.look, look, c.icon));
      it.ord = uid++;
      items.push(it);
      spots.set('commons:' + c.id, spotOf(sl));
    });
    // The Charter's landmark, if it names this Industry.
    if (v.landmark) {
      const site = l.landmark ?? csites[csites.length - 1];
      if (site) {
        const it = renderSlot(l, look, { ...site, p: v.landmark }, 'lm', 'cmn', stageN, `${l.id}:lm:${v.landmark}`, false, landmarkProp(l.look, look, v.landmark));
        it.ord = uid++;
        items.push(it);
      }
    }

    // M3: price plates by each application's landmark and their cables to where the bill is paid (Compute's "free"),
    // and the side effects of levers that bite back. All built hidden; patch() shows them.
    if (l.bill) {
      const bsl = l.bill;
      const bit = renderSlot(l, look, bsl, 'bill', 'm3t', stageN, `${l.id}:bill`);
      bit.ord = uid++; items.push(bit);
      for (const p of plots) {
        if (!p.app || !p.def.anchor) continue;
        const a = p.def.anchor;
        const sc = a.s ?? depthScale(l, a.y) * (a.k ?? 1);
        const tag = renderSlot(l, look, { p: 'priceTag', x: a.x + 14 * sc, y: a.y - 4 * sc, s: Math.max(1.5, sc * 1.4), band: a.band }, `pt:${p.idx}`, 'm3t', stageN, `${l.id}:pt:${p.idx}`);
        tag.ord = uid++; tag.y += 0.02; items.push(tag);
        // The cable: from the plate along the floor to the hoarding, packets running towards the bill.
        const x0 = a.x + 14 * sc, y0 = a.y - 2, x1 = bsl.x, y1 = bsl.y - 2;
        const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 10;
        const d = `M${f(x0)} ${f(y0)}Q${f(mx)} ${f(my)} ${f(x1)} ${f(y1)}`;
        const band = bandOf(l, Math.max(y0, y1));
        items.push({ y: Math.max(y0, y1) + 0.03, ord: uid++, band, html: `<g class="m3t bcab" data-k="pc:${p.idx}"><path d="${d}" class="cab"/></g>`, fx: [] });
        fxBand[band].push({ z: -1e6, html: fxMarkup({ kind: 'flow', x: 0, y: 0, size: 1, markup: `<path d="${d}"/>` }, 0, 0, 1, `pc:${p.idx}`) });
      }
    }
    for (const [k, bsl] of Object.entries(l.bite ?? {})) {
      const it = renderSlot(l, look, bsl, `b:${k}`, 'm3t bite', stageN, `${l.id}:b:${k}`);
      it.ord = uid++; items.push(it);
      spots.set('bite:' + k, spotOf(bsl));
    }

    // Steady-state movers (birds), built hidden.
    (l.steadyMovers ?? []).forEach((m, mi) => {
      for (let i = 0; i < m.n; i++) {
        const mm = moverMarkup(l, look, m, i, `st:${mi}.${i}`, stageN, `${l.id}:st:${mi}:${i}`);
        fxBand[mm.band].push({ z: mm.z, html: mm.html.replace('class="fx mv"', 'class="fx mv stdy"') });
      }
    });

    // Paint: per band, backdrop first, then items by depth (y), then the cut-away.
    const st: Record<Band, SVGSVGElement[]> = { far: [], mid: [], near: [] };
    const fxl: Record<Band, HTMLDivElement[]> = { far: [], mid: [], near: [] };
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
      const kids: Element[] = [];
      for (let i = 0; i < n; i++) {
        const s = svgEl(`scn-l band-${b}`), x = div(`scn-fxl fx-${b}`);
        s.innerHTML = sh[i]; x.innerHTML = fh[i];
        st[b].push(s); fxl[b].push(x);
        kids.push(s);
        if (fh[i]) kids.push(x);
      }
      el.bw[b].replaceChildren(...kids);
    }
    el.skySvg.innerHTML = bd.sky ?? '';

    // Index elements by key.
    const elsByKey = new Map<string, Element[]>();
    for (const svg of [...st.far, ...st.mid, ...st.near, ...fxl.far, ...fxl.mid, ...fxl.near]) {
      svg.querySelectorAll('[data-k]').forEach((e) => {
        const k = (e as Element).getAttribute('data-k') as string;
        const arr = elsByKey.get(k);
        if (arr) arr.push(e); else elsByKey.set(k, [e]);
      });
    }
    // Backdrop emitters (far aircraft lights, vents) are always on.
    for (const b of BANDS) for (const lay of fxl[b]) lay.querySelectorAll('[data-k="bd"]').forEach((e) => e.classList.add('on'));
    const smokeEls: Built['smokeEls'] = [];
    for (const b of BANDS) for (const lay of fxl[b]) lay.querySelectorAll('.smk').forEach((e) => smokeEls.push({ el: e, key: e.getAttribute('data-k') ?? '', size: parseFloat(e.getAttribute('data-sz') ?? '1') }));
    smokeEls.sort((p, q) => q.size - p.size);
    const restraintEls = new Map<string, Element[]>(), commonsEls = new Map<string, Element[]>();
    elsByKey.forEach((els, k) => {
      if (k.startsWith('r:')) restraintEls.set(k.slice(2), els);
      else if (k.startsWith('c:')) { commonsEls.set(k.slice(2), els); els.forEach((e) => e.classList.add('on')); }
      else if (k === 'lm') els.forEach((e) => e.classList.add('on'));
    });
    const nb: Built = {
      key, sectorId: v.sectorId, el, layout: l, style, look, legend: leg, place: l.place, plots, elsByKey, smokeEls, restraintEls, commonsEls,
      steadyMoverEls: Array.from(el.world.querySelectorAll('.mv.stdy')), moverAnims: [], spots,
      resEls: Array.from(el.world.querySelectorAll('.rx,.ry,.dx,.rsun,.sx')), resK: '', fxLayers: [...fxl.far, ...fxl.mid, ...fxl.near],
      prevPace: -1, leverKey: '\u0000', smokeDirty: true, prevSteadyOn: null, moversDirty: true, lastSig: '', stageN, used: 0, vars: new Map(), scafs: 0,
      hy: new Map(),
      m3: { seams: '', free: '', bites: '', slow: -1, overlay: '', hand: null, hourK: 1, hour: -1 },
    };
    for (const p of plots) {
      p.movers = p.mkeys.map((k) => (elsByKey.get(k) ?? [])[0]).filter(Boolean);
      p.moverDefs.forEach((m, i) => (m.el = p.movers[i]));
      p.ghost = (elsByKey.get(`${p.idx}:g`) ?? [])[0] ?? null;
      p.svy = (elsByKey.get(`${p.idx}:s`) ?? [])[0] ?? null;
      p.scaf = (elsByKey.get(`${p.idx}:f`) ?? [])[0] ?? null;
    }
    for (const p of plots) p.moverDefs.forEach((m) => { if (m.el) animateMover(nb, m.el as HTMLElement, m.dur, m.phase); });
    // Steady-state movers (birds) have no plot: give them a crossing of their own.
    nb.steadyMoverEls.forEach((e, i) => animateMover(nb, e as HTMLElement, 40 + i * 7, (i * 0.37) % 1));

    // Places (buttons) for applications.
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
      el.places.append(b);
      p.btn = b;
      spots.set('app:' + p.app.id, p.def.hit);
    }
    return nb;
  }

  /** Show a built world (a fresh build or one kept from an earlier visit). */
  function attach(nb: Built, v: SceneView): void {
    if (B && B !== nb) for (const a of B.moverAnims) { try { if (a.playState === 'running') a.pause(); } catch { /* ignore */ } }
    const switching = !B || B.sectorId !== nb.sectorId;
    B = nb;
    nb.used = ++useClock;
    root.classList.remove('live');
    root.dataset.look = nb.look;
    root.dataset.layout = nb.layout.id;
    // Only the active world is in the document. Kept worlds wait detached (M4 perf pass: seven kept worlds in the
    // document were ~10,000 undisplayed nodes the page's DOM and style bookkeeping carried for nothing); putting one back
    // costs what showing an undisplayed one did (its styles are computed either way), so a revisit stays a re-attach.
    if (nb.el.world.parentNode !== stage) stage.insertBefore(nb.el.world, banner);
    if (nb.el.places.parentNode !== stage) stage.insertBefore(nb.el.places, banner);
    for (const w of Array.from(stage.children)) {
      if (!w.classList.contains('scn-world') && !w.classList.contains('scn-places')) continue;
      const act = w === nb.el.world || w === nb.el.places;
      if (w.classList.contains('act') !== act) w.classList.toggle('act', act);
      if (!act) w.remove();
    }
    legend.textContent = nb.legend; legend.hidden = !nb.legend;
    // Root-level state is re-applied by the next patch.
    nb.prevPace = -1; nb.leverKey = '\u0000'; nb.lastSig = ''; nb.prevSteadyOn = null; nb.moversDirty = true;
    root.classList.remove('pace0', 'pace1', 'pace2');
    for (const c of Array.from(root.classList)) if (c.startsWith('lv-')) root.classList.remove(c);
    if (switching) { clearMoments(); setTarget(null); }
    for (const p of nb.plots) p.btn?.classList.toggle('sel', !!p.app && p.app.id === selected);
    root.setAttribute('aria-label', `${v.sectorName}: ${nb.place}`);
    root.classList.toggle('lowd', lowDetail);
    if (!planeK) sizePlane();
    syncPlay();
    watchFrames();
    // Suppress grow animations for things already there on (re)build; re-enable next frame.
    const enable = () => { if (!destroyed) applyMotion(); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(enable)); else enable();
  }
  let useClock = 0;

  function discard(b: Built): void {
    for (const a of b.moverAnims) { try { a.cancel(); } catch { /* ignore */ } }
    b.moverAnims = [];
    if (b !== B) { b.el.world.remove(); b.el.places.remove(); }
  }
  function remember(b: Built): void {
    const old = cache.get(b.sectorId);
    if (old && old !== b) discard(old);
    cache.set(b.sectorId, b);
    if (cache.size > MAX_CACHED) {
      let lru: Built | null = null;
      cache.forEach((x) => { if (x !== B && (!lru || x.used < lru.used)) lru = x; });
      if (lru) { discard(lru); cache.delete((lru as Built).sectorId); }
    }
  }

  /** One crossing per mover, as a Web Animation with concrete keyframes (composited; no var() in keyframes). */
  function animateMover(b: Built, el: HTMLElement, durS: number, phase: number): void {
    const tr = (el.getAttribute('data-tr') ?? '0,0,0,0').split(',').map(Number);
    if (typeof el.animate !== 'function') return;
    try {
      const a = el.animate([{ transform: `translate(${tr[0]}px,${tr[1]}px)` }, { transform: `translate(${tr[2]}px,${tr[3]}px)` }],
        { duration: durS * 1000, iterations: Infinity, easing: 'linear' });
      a.currentTime = phase * durS * 1000;
      a.pause();
      b.moverAnims.push(a);
      animOf.set(el, a);
    } catch { /* no Web Animations: movers stay at their resting points */ }
  }
  /** Run, pause or drop the mover animations to match reduced motion, visibility and a Reckoning. Animations are
   *  started a frame after their sprite is shown: one started on a box with no layout yet runs on the main thread
   *  (restyling the page every frame) instead of the compositor. */
  let playQ: Animation[] = [];
  let playRaf = 0;
  function syncPlay(): void {
    if (!B) return;
    const still = rm(), stop = root.classList.contains('paused') || root.classList.contains('halt');
    const steady = root.classList.contains('steady'), low = root.classList.contains('lowd');
    for (const a of B.moverAnims) {
      try {
        // A hidden mover's animation would still tick on the main thread every frame (it cannot be composited
        // without a box): only shown movers run.
        const el = (a.effect as KeyframeEffect | null)?.target as Element | null;
        const shown = !!el && el.classList.contains('on') && (!el.classList.contains('stdy') || steady) && !(low && el.classList.contains('thin'));
        if (still) { if (a.playState !== 'idle') a.cancel(); }
        else if (stop || !shown) { if (a.playState === 'idle') a.play(); if (a.playState !== 'paused') a.pause(); playQ = playQ.filter((x) => x !== a); }
        else if (a.playState !== 'running' && !playQ.includes(a)) { if (a.playState === 'idle') { a.play(); a.pause(); } playQ.push(a); }
      } catch { /* ignore */ }
    }
    if (playQ.length && !playRaf && typeof requestAnimationFrame === 'function') {
      playRaf = requestAnimationFrame(() => requestAnimationFrame(() => {
        playRaf = 0;
        const q = playQ; playQ = [];
        const cur = B;
        for (const a of q) { try { if (cur && cur.moverAnims.includes(a) && a.playState !== 'running') a.play(); } catch { /* ignore */ } }
      }));
    } else if (playQ.length && typeof requestAnimationFrame !== 'function') { const q = playQ; playQ = []; q.forEach((a) => { try { a.play(); } catch { /* ignore */ } }); }
  }
  /** The sprite plane is 600×400 px scaled to the stage (one write on build and on resize). */
  function sizePlane(w?: number): void {
    const k = (w ?? stage.clientWidth) / W;
    if (!k || Math.abs(k - planeK) < 0.001) return;
    planeK = k;
    root.style.setProperty('--k', k.toFixed(4));
  }

  /* ---------------- patch ---------------- */
  function setOn(key: string, on: boolean, extraCls?: string): void {
    const els = B?.elsByKey.get(key);
    if (!els) return;
    for (const el of els) {
      el.classList.toggle('on', on);
      if (extraCls) el.classList.toggle(extraCls, on);
    }
  }

  function density(p: PlotRt, v: SceneView, lightMean: number): number {
    const d = density0(p, v, lightMean);
    // M3: sprawl that stays (Motion) and lit by the hour (Light).
    const d1 = p.def.sprawl && v.travel && (!p.app || p.app.status === 'founded') ? Math.max(d, v.travel.sprawl) : d;
    return p.def.byHour && v.load && B ? d1 * B.m3.hourK : d1;
  }
  function density0(p: PlotRt, v: SceneView, lightMean: number): number {
    switch (p.def.driver ?? 'app') {
      case 'congestion': return v.travel ? 1 - v.travel.speed : 0;
      case 'roads': return v.travel ? clamp(((v.travel.freeSpeed ?? 1) - 1) / 1.5, 0, 1) : 0;
      case 'app': return p.app && p.app.status === 'founded' ? p.app.adoption : 0;
      case 'population': return 0.1 + 0.9 * v.popFraction;
      case 'pressure': return clamp(v.pressureFraction, 0, 1);
      case 'depletion': return 1 - v.reserveFraction;
      case 'reserve': return v.reserveFraction;
      case 'light': return lightMean;
      case 'always': return 1;
      /* M4 */
      case 'fed': { let x = 0; for (const fb of v.fedBy ?? []) if ((p.def.match ?? []).includes(fb.app)) x = Math.max(x, fb.share); return x; }
      case 'chart': return v.stock ? (v.stock.surveyed ? v.stock.truth : v.stock.reported) : v.reserveFraction;
      case 'world': return v.stock ? v.stock.truth : v.reserveFraction;
      case 'boats': return tiedUp(v) ? 0 : lightMean > 0 ? Math.max(0.2, Math.min(1, lightMean * 1.6)) * (0.15 + 0.85 * (v.stock ? v.stock.truth : 1)) : 0;
      case 'tied': return tiedUp(v) ? 1 : 0;
      case 'foreign': return v.stock ? clamp(v.stock.foreign / 0.6, 0, 1) : 0;
      case 'surveyed': return v.stock?.surveyed ? 1 : 0;
      case 'scar': return v.stock?.scar ? 1 : 0;
      case 'crises': return p.keys.length ? clamp(v.crises / p.keys.length, 0, 1) : 0;
      default: return 0;
    }
  }

  /** Show the first n × density^curve of a plot's slots (an overlay: over its base plot's shown slots). */
  function setCount(b: Built, p: PlotRt, d: number): void {
    const n = p.keys.length;
    const curve = p.def.curve ?? 0.6;
    // With hysteresis: a count moves only when the input is three quarters of a slot past the shown count, so an
    // input hovering at a boundary does not toggle (and repaint) a slot at every update.
    const raw = d <= 0.001 ? 0 : Math.min(n, n * Math.pow(d, curve));
    const shown = p.overlayBase ? Math.floor(p.count / 1000) : p.count;
    const c = raw === 0 ? 0 : shown >= 0 && Math.abs(raw - shown) < 0.75 && shown > 0 ? shown : Math.min(n, Math.round(raw));
    if (p.overlayBase) {
      const baseCount = p.overlayBase.count < 0 ? 0 : p.overlayBase.count;
      const ovKey = c * 1000 + baseCount;
      if (ovKey !== p.count) {
        p.count = ovKey;
        const lit = new Set(p.overlayOrder.slice(0, c));
        p.keys.forEach((k, i) => setOn(k, lit.has(i) && i < baseCount));
      }
    } else if (c !== p.count) {
      p.count = c;
      p.keys.forEach((k, i) => setOn(k, i < c));
      b.smokeDirty = true;
    }
  }

  function patch(v: SceneView, quiet: boolean): void {
    const b = B;
    if (!b) return;
    const el = b.el;
    const style = b.style;
    const founded = v.apps.filter((a) => a.status === 'founded');
    const lightMean = lightMeanOf(v);
    const pf = clamp(v.pressureFraction, 0, 1.2);
    // How far towards the Steady State look: M2 clear skies bring it in over the 50 years; M1 views use the streak.
    const clear = v.steady ? 1 : v.clear ? 0.45 + 0.55 * clamp(v.clearProgress ?? 0, 0, 1) : v.decoupling ? 0.6 * v.steadyProgress : 0;
    // M4: a capstoned Industry in arrears loses its held look (the wash withdraws, the smoke returns).
    const held = !!v.settled && !v.capstoned?.arrears;
    const pfv = Math.min(1, pf) * (1 - 0.85 * clear);
    // Haze by band: below the sink line it thins near first, far last (pressureToClear when the host gives it).
    const hb = typeof v.pressureToClear === 'number' ? Math.min(Math.min(1, pf), 0.15 + 0.85 * v.pressureToClear) * (1 - 0.85 * clear) : pfv;
    const q = (x: number) => (Math.round(x * 50) / 50).toFixed(2);
    // Fast-moving values go straight onto the few elements that use them (a custom property on the root would
    // restyle every node of the scene); slow ones are coarsely quantised before they touch the world.
    const q20 = (x: number) => (Math.round(x * 20) / 20).toFixed(2);
    // The weather layers follow pressure in steps of .04 with hysteresis: each step starts an opacity transition, and
    // a pressure hovering at a boundary must not keep them transitioning (Code repainted every frame so).
    const qh = (k: string, x: number) => hyst(b, k, x, 0.04).toFixed(2);
    setOp(el.sky1, qh('sky1', pfv)); const hzk = style?.weather?.hz ?? [0.85, 0.55, 0.32];
    setOp(el.hz1, qh('hz1', Math.min(1, Math.pow(hb, 0.8) * hzk[0]))); setOp(el.hz2, qh('hz2', Math.min(1, hb * hzk[1]))); setOp(el.hz3, qh('hz3', Math.min(1, Math.pow(hb, 1.35) * hzk[2])));
    setOp(el.sky2, q(clear));
    setOp(el.held, held ? '1' : '0');
    setOp(el.noiseSvg as unknown as HTMLElement, qh('noise', held ? 0 : Math.min(1, Math.min(1, pf) * (style?.weather?.noise ?? 0) * (1 - clear))));
    setOp(el.glow, q(clamp(lightMean, 0, 1)));
    setVarOn(el.skySvg, '--pf2', hyst(b, '--pf2', pfv, 0.05).toFixed(2));
    setVarOn(el.skySvg, '--light', q20(clamp(lightMean, 0, 1)));
    setVarOn(el.skySvg, '--clr', q20(clear));
    const smk = (Math.round((0.22 + 0.3 * Math.min(1, pf) + 0.12 * v.pace) * (held ? 0.5 : 1) * 10) / 10).toFixed(1);
    for (const lay of b.fxLayers) setVarOn(lay, '--smk-a', smk);
    // Pressure-driven growth inside the drawing (Code's pipework) repaints its band: step it in tenths, with
    // hysteresis, so a pressure hovering at a boundary does not repaint the band at every update.
    setVarOn(el.bw.near, '--pfc', hyst(b, '--pfc', Math.min(1, pf), 0.1).toFixed(2));
    // What is left of the reserve: on the few drawings that show it (Built.resEls). A step of a fiftieth lands at once (no
    // transition: an SVG transition repaints its band every frame for its 1.5 s); a jump (a new seam) still glides.
    const res = q(clamp(v.reserveFraction, 0.02, 1)), dep = q(1 - clamp(v.reserveFraction, 0, 1));
    if (res + dep !== b.resK) {
      const was = b.resK ? parseFloat(b.resK) : NaN;
      b.resK = res + dep;
      const snap = !(Math.abs(parseFloat(res) - was) >= 0.1); // the first setting (was NaN) lands at once too
      for (const e of b.resEls) {
        const st = (e as SVGElement).style;
        st.setProperty('--res', res); st.setProperty('--dep', dep);
        e.classList.toggle('tsnap', snap);
      }
    }
    setVarOn(el.bw.near, '--light', q20(clamp(lightMean, 0, 1)));
    const wash = style?.wash?.(Math.round(pfv * 10) / 10, Math.round(clear * 5) / 5) ?? null;
    if (wash) { setVar(b, '--s-wash', wash[0]); setVar(b, '--s-water', wash[1]); }
    const lamp = LAMP[clamp(Math.round(v.stage), 0, 3)];
    setVar(b, '--s-lamp', lamp[0]); setVar(b, '--s-lamprgb', lamp[1]);
    const pace = held ? 0 : v.pace < 0.3 ? 0 : v.pace < 0.7 ? 1 : 2;
    if (pace !== b.prevPace) { root.classList.remove('pace0', 'pace1', 'pace2'); root.classList.add('pace' + pace); }
    root.classList.toggle('steady', !!v.steady);
    root.classList.toggle('decoupling', !!v.decoupling);
    root.classList.toggle('clear', !!v.clear && !v.steady);
    if (root.classList.contains('settled') !== held) { root.classList.toggle('settled', held); }
    if (root.classList.contains('halt') !== !!v.reckoning) { root.classList.toggle('halt', !!v.reckoning); syncPlay(); }
    // A city under strain (pressure near collapse, not yet clearing): styles may stage blackouts, failing signs.
    root.classList.toggle('stress', pf >= 0.8 && !v.steady && clear < 0.3 && !held);
    syncShed();
    // M4: a capstone's emblem is an engraved cartouche with the year of the Act's ending (withdrawn in arrears).
    const capY = v.capstoned ? v.capstoned.year : null;
    const embText = held ? (v.capstoned ? (capY ? `Settled ${capY}` : 'Settled') : v.settledYear ? `Settled ${v.settledYear}` : 'Settled') : '';
    if (emblem.textContent !== embText) { emblem.textContent = embText; emblem.classList.toggle('on', !!embText); }
    if (emblem.classList.contains('cart') !== !!v.capstoned) emblem.classList.toggle('cart', !!v.capstoned);
    if (prevMark.classList.contains('on') !== !!v.preview) prevMark.classList.toggle('on', !!v.preview);
    if (root.classList.contains('arrears') !== !!v.capstoned?.arrears) root.classList.toggle('arrears', !!v.capstoned?.arrears);

    // Refresh each plot's application from this view (plots are built once; the data moves every tick).
    const byId = new Map(v.apps.map((a) => [a.id, a]));
    for (const p of b.plots) if (p.app) p.app = byId.get(p.app.id) ?? p.app;
    // Plots.
    // M3: congestion slows the traffic (Motion's travel speed, three steps).
    const slow = v.travel ? (v.travel.speed < 0.35 ? 2 : v.travel.speed < 0.65 ? 1 : 0) : 0;
    const retime = pace !== b.prevPace || slow !== b.m3.slow;
    const durK = [1.3, 1, 0.7][pace] * (held ? 1.8 : 1) * [1, 1.6, 2.6][slow];
    for (const p of b.plots) {
      const d = density(p, v, lightMean);
      const st = p.app ? p.app.status : 'always';
      if (p.app) {
        if (p.status !== st) {
          p.status = st;
          setOn(`${p.idx}:a`, st === 'founded');
          if (p.ghost) { p.ghost.classList.toggle('on', st !== 'founded'); p.ghost.classList.toggle('avail', st === 'available'); }
          p.svy?.classList.toggle('on', st === 'available');
        }
        if (p.btn) {
          p.btn.classList.toggle('avail', st === 'available');
          const lbl = placeLabel(p.app, v);
          if (p.btn.getAttribute('aria-label') !== lbl) p.btn.setAttribute('aria-label', lbl);
        }
      } else if (p.anchorKey && p.count < 0) setOn(p.anchorKey, true);

      setCount(b, p, d);
      // Movers: more trains, more often.
      const m = p.movers.length;
      if (m) {
        const mc = d <= 0.001 ? 0 : Math.max(1, Math.min(m, Math.ceil(m * Math.pow(d, 0.8))));
        const want = (p.app ? st === 'founded' : true) ? mc : 0;
        if (want !== p.mcount) {
          p.mcount = want;
          // In low detail every second mover beyond the first is dropped (by class, so no rebuild is needed).
          p.movers.forEach((e, i) => { e.classList.toggle('on', i < want); e.classList.toggle('thin', i > 0 && i % 2 === 1); });
          b.moversDirty = true;
        }
        if (retime) {
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
    b.prevPace = pace; b.m3.slow = slow;
    if (b.smokeDirty) { b.smokeDirty = false; assignSmoke(); }

    // Restraint.
    const inForce = new Set(v.levers.map((x) => x.kind));
    const lvKey = [...inForce].sort().join(',');
    if (lvKey !== b.leverKey) {
      for (const c of Array.from(root.classList)) if (c.startsWith('lv-')) root.classList.remove(c);
      for (const k of inForce) if (/^[\w-]+$/.test(k)) root.classList.add('lv-' + k);
      b.leverKey = lvKey;
      b.restraintEls.forEach((els, k) => els.forEach((e) => e.classList.toggle('on', inForce.has(k))));
    }
    if (b.prevSteadyOn !== !!v.steady) { b.prevSteadyOn = !!v.steady; b.steadyMoverEls.forEach((e) => e.classList.toggle('on', !!v.steady)); b.moversDirty = true; }
    if (b.moversDirty) { b.moversDirty = false; syncPlay(); }

    // M3: the seam ladder in the cut-away (worked out above, being worked, the next within reach).
    const sm = v.seams;
    const smKey = sm ? `${sm.sunk}/${sm.next ? 1 : 0}` : '';
    if (sm && smKey !== b.m3.seams) {
      b.m3.seams = smKey;
      for (let i = 0; i <= sm.total; i++) for (const e of b.elsByKey.get(`sm:${i}`) ?? []) {
        e.classList.toggle('sunk', i <= sm.sunk); e.classList.toggle('work', i === sm.sunk);
        e.classList.toggle('out', i < sm.sunk); e.classList.toggle('next', i === sm.sunk + 1 && sm.next);
      }
    }
    // M3: free at the point of use: a struck-through price plate on each free hall, cabled to where the bill is paid.
    const freeKey = v.free ? v.free.apps.join(',') : '';
    if (freeKey !== b.m3.free) {
      b.m3.free = freeKey;
      const fr = new Set(v.free?.apps ?? []);
      let any = false;
      for (const p of b.plots) {
        if (!p.app) continue;
        const on = fr.has(p.app.id) && p.app.status === 'founded';
        any = any || on;
        setOn(`pt:${p.idx}`, on); setOn(`pc:${p.idx}`, on);
      }
      setOn('bill', any);
    }
    // M3: levers that bite back: the side effect stands once the bite reaches half strength.
    const bit = v.levers.filter((x) => (x.bite ?? 0) >= 0.5).map((x) => x.kind);
    const biteKey = bit.sort().join(',');
    if (biteKey !== b.m3.bites) {
      b.m3.bites = biteKey;
      const kinds = Object.keys(b.layout.bite ?? {});
      const shown = new Set(bit.map((k) => (kinds.includes(k) ? k : '*')));
      for (const k of kinds) setOn(`b:${k}`, shown.has(k));
    }
    // M3: the sprites over the drawing (Light's day clock, the cast).
    patchOverlay(b, v);
    tickClock();

    // Moments (from the event list, or by comparison for hosts without one).
    const now = Date.now(); // UI-side timers only (the scene holds no game rules)
    const moments = desk.take(v, now, quiet);
    // M4: an Industry whose crises have their own names (Iron: The Orange Night, then The Slag Slide).
    const cn = b.layout.crisisNames;
    if (cn) for (const m of moments) if (m.kind === 'crisis' && m.n && cn[m.n - 1] && desk.caption) desk.caption.text = cn[m.n - 1];
    for (const m of moments) play(m, v);
    // onStage: once per change of an Industry's machines (never on the first sight of an Industry).
    const seen = lastStageSeen.get(v.sectorId);
    const sN = clamp(Math.round(v.stage), 0, 3);
    if (seen !== undefined && seen !== sN && !quiet) { try { opts.onStage?.(v.sectorId, sN); } catch (e) { console.warn('scene onStage', e); } }
    lastStageSeen.set(v.sectorId, sN);
    root.classList.toggle('crisis', desk.crisisActive(now));

    // Reckoning: the world stops.
    if (v.reckoning) {
      const cause = v.reckoning.cause;
      const t = cause === 'exhausted' ? `${v.resourceName}: spent.` : cause === 'collapse' ? `${v.pressureName}: past bearing.` : 'The books are closed.';
      setBanner(v.reckoning.here || cause === 'chosen' ? t : 'Elsewhere, a Reckoning.');
    } else setBanner(desk.captionNow(now) ?? '');

    renderCard(v);
    const s = describeView(v);
    if (s !== summaryText) { summaryText = s; summary.textContent = s; }
  }

  /** Play one moment. Nothing loops; reduced motion gets the static version (or nothing). */
  function play(m: Moment, v: SceneView): void {
    const b = B;
    if (!b) return;
    const still = rm();
    const plotOf = (appId?: string) => b.plots.find((p) => p.app && p.app.id === appId) ?? null;
    const anchorsOf = (p: PlotRt | null) => (p ? b.elsByKey.get(`${p.idx}:a`) ?? [] : []);
    const pulse = (els: Element[], cls: string, ms: number) => {
      if (still) return;
      els.forEach((e) => { e.classList.remove(cls); void (e as SVGGElement).getBBox; e.classList.add(cls); });
      later(() => els.forEach((e) => e.classList.remove(cls)), ms);
    };
    const flashCls = (cls: string, ms: number) => {
      if (still) return;
      const fl = b.el.flash;
      fl.className = 'scn-flash'; void fl.offsetWidth; fl.classList.add('on', cls);
      later(() => { if (fl.classList.contains(cls)) fl.className = 'scn-flash'; }, ms);
    };
    switch (m.kind) {
      case 'crisis':
        if (!still) { root.classList.remove('crisis'); void root.offsetWidth; }
        root.classList.add('crisis');
        clearTimeout(crisisTimer);
        crisisTimer = later(() => { captionDirty = true; if (lastView) update(lastView); }, 7300);
        break;
      case 'found': {
        const p = plotOf(m.app);
        if (!p) break;
        const market = m.by === 'market';
        if (!still) {
          pulse(anchorsOf(p), 'build', 2700);
          if (p.scaf) { p.scaf.classList.remove('on', 'mkt'); void (p.scaf as SVGGElement).getBBox; p.scaf.classList.add('on'); if (market) p.scaf.classList.add('mkt'); later(() => p.scaf?.classList.remove('on', 'mkt'), market ? 3800 : 2700); }
        }
        if (!market && p.app) showToast(`${p.app.name} founded`);
        break;
      }
      case 'scaffold': {
        if (b.scafs >= MAX_SCAFFOLDS) break;
        // A building, not a long work (a viaduct, a road): the founded landmarks, nearest first; spread by the id.
        const cands = b.plots.filter((p) => p.app && p.app.status === 'founded' && p.scaf && !p.def.anchor?.w)
          .sort((p, q) => (q.def.anchor?.y ?? 0) - (p.def.anchor?.y ?? 0)).slice(0, 3);
        if (!cands.length) break;
        const p = cands[hash(m.id ?? '') % cands.length];
        if (!p.scaf || p.scaf.classList.contains('on')) break;
        b.scafs++;
        p.scaf.classList.add('on', 'mkt');
        later(() => { p.scaf?.classList.remove('on', 'mkt'); b.scafs--; }, still ? 4000 : 3800);
        break;
      }
      case 'stage':
        // The machines evolve: the old landmarks (kept from the last build) sink away as the new ones rise.
        if (!still) {
          b.el.world.querySelectorAll('.outgoing').forEach((e) => later(() => e.remove(), 1700));
          b.plots.forEach((p) => { if (p.app?.status === 'founded') pulse(anchorsOf(p), 'evolve', 1900); });
          flashCls('fl-stage', 1600);
        }
        if (m.n != null) showToast(stageWords(b.look, m.n));
        break;
      case 'lever': {
        const kind = v.levers.find((x) => x.id === m.id)?.kind ?? (m.id ?? '').split('.').pop() ?? '';
        pulse(b.restraintEls.get(kind) ?? [], 'raise', 1800);
        break;
      }
      case 'decade': flashCls('fl-decade', 2600); break;
      case 'clear': flashCls('fl-clear', 3200); if (!still) showToast('Clear skies'); break;
      case 'steady': flashCls('fl-clear', 3200); break;
      case 'settled': flashCls('fl-settle', 3000); break;
      case 'opened':
        if (!still) { b.el.world.classList.remove('opening'); void b.el.world.offsetWidth; b.el.world.classList.add('opening'); later(() => b.el.world.classList.remove('opening'), 2600); }
        break;
      case 'backfire':
        // The signature moment, picture side: the valley brightens for a breath (the saving) and then burns harder
        // (the rebound): every founded landmark gives a kick, the stacks puff black, a dark wave rolls outward.
        if (!still) {
          root.classList.remove('backfire'); void root.offsetWidth; root.classList.add('backfire');
          later(() => root.classList.remove('backfire'), 5200);
          b.plots.forEach((p) => { if (p.app?.status === 'founded') pulse(anchorsOf(p), 'kick', 1400); });
          flashCls('fl-backfire', 5000);
        }
        break;
      case 'commons': pulse(b.commonsEls.get(m.id ?? '') ?? [], 'build', 2700); break;
      case 'seamSunk': {
        // The new seam's shaft sinks from the one above, steam puffs at the pit head, the gallery lights.
        const i = m.n ?? v.seams?.sunk ?? 0;
        pulse(b.elsByKey.get(`sm:${i}`) ?? [], 'sinking', 2000);
        const head = b.layout.plots.find((p) => (p.match ?? []).includes('pump'))?.anchor;
        if (head && !still) momentSprite(b, `<div class="fx on puff" style="left:${f(head.x)}px;top:${f(head.y - 40)}px"><i></i><i></i><i></i></div>`, 2600);
        showToast(m.text ? `${m.text}: sunk` : 'A new seam sunk');
        break;
      }
      case 'biteBack': {
        const kind = v.levers.find((x) => x.id === m.id)?.kind ?? '';
        const kinds = Object.keys(b.layout.bite ?? {});
        pulse(b.elsByKey.get(`b:${kinds.includes(kind) ? kind : '*'}`) ?? [], 'raise', 1800);
        break;
      }
      case 'surveyed': case 'threshold': case 'scarHealed': playSea(b, m, v, still); break;
      case 'capstoned':
        if (!still) { emblem.classList.remove('stamp'); void emblem.offsetWidth; emblem.classList.add('stamp'); later(() => emblem.classList.remove('stamp'), 1600); }
        break;
      case 'arrears': flashCls('fl-backfire', 5000); showToast('In arrears'); break;
      case 'ending': {
        // The sky clears completely (the fresh sky, held for a while) and a paper boy runs along the front with it.
        flashCls('fl-clear', 3200);
        b.el.sky2.classList.add('ending'); later(() => b.el.sky2.classList.remove('ending'), 9000);
        const art = figureArt('paperboy', b.look);
        if (art) {
          const y = (b.layout.figures?.[0]?.y ?? 368);
          const sc = 1.45;
          const html = `<div class="fx on fig fg-paperboy" style="left:${still ? 300 : -30}px;top:${f(y)}px">${spr(`<g transform="scale(${sc})">${art.body}</g>`)}</div>`;
          const el = momentSprite(b, html, 9000);
          if (el && !still && typeof el.animate === 'function') { try { el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(660px)' }], { duration: 8500, easing: 'linear', fill: 'forwards' }); } catch { /* ignore */ } }
        }
        break;
      }
    }
  }
  /** M4: play the sea's moments (the survey vessel putting out, the chart draining, the gulls returning). */
  function playSea(b: Built, m: Moment, v: SceneView, still: boolean): void {
    const l = b.layout;
    const anim = (el: HTMLElement | null, kf: Keyframe[], o: KeyframeAnimationOptions) => { if (el && !still && typeof el.animate === 'function') { try { el.animate(kf, o); } catch { /* ignore */ } } };
    if (m.kind === 'surveyed') {
      const run = l.surveyRun;
      const art = run ? propFor(l.look, b.look, 'surveyBoat') : null;
      if (run && art && !still) {
        const s = depthScale(l, run[1]);
        let inner = '';
        try { inner = art({ s, v: 0.5, stage: b.stageN, w: 0, h: 0, r: rng(1), u: (x) => `url(#${pid}${x})`, hatch: (lv = 0) => `url(#${pid}${lv ? 'x' : 'h'}${hatchLevel(s)})`, overlay: false }, { fx: () => {} }); } catch { inner = ''; }
        const el = momentSprite(b, `<div class="fx on mv" style="left:${f(run[0])}px;top:${f(run[1])}px">${spr(`<g transform="scale(${s})">${inner}</g>`)}</div>`, 6200);
        anim(el, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${f(run[2] - run[0])}px,${f(run[3] - run[1])}px)`, opacity: 1 }], { duration: 6000, easing: 'ease-in-out', fill: 'forwards' });
      }
      if (m.text === 'reveal' && v.stock) drainChart(b, v, still);
      showToast('The Board’s vessel puts out');
    } else if (m.kind === 'threshold') {
      const c = l.chart;
      if (c && !still) {
        const el = momentSprite(b, `<div class="fx on veil" style="left:${f(c[0])}px;top:${f(c[1])}px;width:${f(c[2])}px;height:${f(c[3])}px"><i style="width:${f(c[2] * 0.5)}px"></i></div>`, 4200);
        anim(el?.firstElementChild as HTMLElement | null, [{ transform: `translateX(${f(-c[2] * 0.5)}px)` }, { transform: `translateX(${f(c[2])}px)` }], { duration: 4000, easing: 'ease-in', fill: 'forwards' });
      }
    } else if (m.kind === 'scarHealed') {
      const g = propFor(l.look, b.look, 'gulls');
      if (!still) {
        let inner = '';
        try { inner = g({ s: 1, v: 0.5, stage: b.stageN, w: 0, h: 0, r: rng(7), u: (x) => `url(#${pid}${x})`, hatch: () => '', overlay: false }, { fx: () => {} }); } catch { inner = ''; }
        const el = momentSprite(b, `<div class="fx on mv" style="left:640px;top:150px">${spr(`<g transform="scale(1.4)">${inner}</g>`)}</div>`, 7200);
        anim(el, [{ transform: 'translate(0,0)' }, { transform: 'translate(-300px,60px)' }], { duration: 7000, easing: 'ease-out', fill: 'forwards' });
      }
      showToast('The gulls are back');
    }
  }
  /** The Board's survey, on the chart: the stipple the fleet's figure showed and the truth does not fades out, left to
   *  right, once. Copies of the vanished shoals as sprites (opacity only, composited); the drawing already shows the
   *  truth underneath. Reduced motion: the still of the after (nothing to play). */
  function drainChart(b: Built, v: SceneView, still: boolean): void {
    const p = b.plots.find((q) => q.def.key === 'shoals');
    const c = b.layout.chart;
    if (!p || !c || still || !v.stock) return;
    const n = p.keys.length, curve = p.def.curve ?? 0.6;
    const from = Math.min(n, Math.round(n * Math.pow(v.stock.reported, curve)));
    const to = Math.max(0, p.count);
    if (from <= to) return;
    let html = '';
    const xs: number[] = [];
    for (let i = to; i < from; i++) {
      const e = b.elsByKey.get(p.keys[i])?.[0];
      if (!e) continue;
      const tr = /translate\(([-\d.]+)/.exec(e.getAttribute('transform') ?? '');
      xs.push(tr ? +tr[1] : c[0]);
      html += `<div class="fx on drn">${spr(e.outerHTML.replace(/class="[^"]*"/, '').replace(/data-k="[^"]*"/, ''))}</div>`;
    }
    const box = momentSprite(b, `<div class="fx on" style="left:0;top:0">${html}</div>`, 4200);
    if (!box) return;
    Array.from(box.children).forEach((el, i) => {
      const d = 400 + ((xs[i] - c[0]) / Math.max(1, c[2])) * 2400;
      try { (el as HTMLElement).animate([{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 900, delay: d, easing: 'ease-in', fill: 'both' }); } catch { (el as HTMLElement).style.opacity = '0'; }
    });
  }
  /** A sprite that plays once over the drawing and is removed (a puff of steam, the paper boy). */
  function momentSprite(b: Built, html: string, ms: number): HTMLElement | null {
    const t = document.createElement('div');
    t.innerHTML = html;
    const el = t.firstElementChild as HTMLElement | null;
    if (!el) return null;
    b.el.m3.appendChild(el);
    later(() => el.remove(), ms);
    return el;
  }
  let crisisTimer = 0;
  function clearMoments(): void {
    root.classList.remove('crisis', 'backfire');
    clearTimeout(crisisTimer);
    toast.classList.remove('on');
    setBanner('');
  }

  function setVarOn(el: HTMLElement | SVGElement, k: string, val: string): void {
    let c = elCache.get(el);
    if (!c) { c = {}; elCache.set(el, c); }
    if (c[k] === val) return;
    c[k] = val;
    el.style.setProperty(k, val);
  }
  const elCache = new WeakMap<Element, Record<string, string>>();
  function setOp(el: HTMLElement, val: string): void { setVarOn(el, 'opacity', val); }
  /** A value quantised to `step` that moves only when the input has moved a whole step away from the shown one. */
  function hyst(b: Built, k: string, x: number, step: number): number {
    const last = b.hy.get(k);
    if (last !== undefined && Math.abs(x - last) < step) return last;
    const v = Math.round(x / step) * step;
    b.hy.set(k, v);
    return v;
  }
  function setVar(b: Built, k: string, val: string): void {
    if (b.vars.get(k) === val) return;
    b.vars.set(k, val);
    b.el.world.style.setProperty(k, val);
  }

  function assignSmoke(): void {
    if (!B) return;
    let live = 0;
    for (const s of B.smokeEls) {
      const on = s.key === 'bd' ? true : (B.elsByKey.get(s.key)?.[0]?.classList.contains('on') ?? false);
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
    toastTimer = later(() => toast.classList.remove('on'), 2800);
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
    desk.setSector(sid);
    clearMoments();
    setTarget(null);
  }

  /* ---------------- highlight ---------------- */
  function setTarget(t: SceneTarget): boolean {
    target = t;
    if (!t || !B) { ring.classList.remove('on'); return false; }
    const k = 'app' in t ? 'app:' + t.app : 'lever' in t ? 'lever:' + t.lever : 'commons:' + t.commons;
    const r = B.spots.get(k);
    const shown = !!r && ('lever' in t ? !!B.restraintEls.get(t.lever)?.some((e) => e.classList.contains('on')) || true : true);
    if (!r || !shown) { ring.classList.remove('on'); return false; }
    const [x, y, w, h] = r;
    ring.style.left = (x / W * 100).toFixed(2) + '%';
    ring.style.top = (y / H * 100).toFixed(2) + '%';
    ring.style.width = (w / W * 100).toFixed(2) + '%';
    ring.style.height = (h / H * 100).toFixed(2) + '%';
    ring.classList.remove('on'); void ring.offsetWidth; ring.classList.add('on');
    return true;
  }

  /** Under strain a style may stage load-shedding in turn (Code's towers): a phase class stepped on the mid band every
   *  four seconds, only while stressed, moving and on screen. A class step restyles one band once; an animation inside
   *  the drawing would repaint it every frame. */
  let shedT = 0, shedN = 0;
  function syncShed(): void {
    const want = !!B && root.classList.contains('stress') && !rm() && !root.classList.contains('paused') && !root.classList.contains('halt');
    if (want && !shedT) {
      shedT = window.setInterval(() => {
        if (destroyed || !B) { clearInterval(shedT); shedT = 0; return; }
        const m = B.el.bw.mid;
        m.classList.remove('ph0', 'ph1', 'ph2');
        m.classList.add('ph' + (shedN = (shedN + 1) % 3));
      }, 4000);
    } else if (!want && shedT) { clearInterval(shedT); shedT = 0; }
  }

  /* ---------------- M3 overlay: Light's day clock, the cast ---------------- */
  let clockT = 0;
  const DAY_MS = 60000;
  /** Rebuild the sprites over the drawing when what they show changes (a letter arrives, the day's shape moves). */
  function patchOverlay(b: Built, v: SceneView): void {
    const l = b.layout;
    const dial = v.load && l.dial ? l.dial : null;
    const spots = l.figures ?? [];
    const figs = (v.figures ?? []).filter((k) => !!figureArt(k, b.look)).slice(0, spots.length);
    const watch = v.watch ?? 0;
    const key = `${dial ? v.load!.hours.map((h) => Math.round(h * 10)).join('.') : ''}|${figs.join(',')}|${Math.round(watch * 10)}`;
    if (key === b.m3.overlay) return;
    b.m3.overlay = key;
    if (b.m3.hand) { try { b.m3.hand.cancel(); } catch { /* ignore */ } b.moverAnims = b.moverAnims.filter((a) => a !== b.m3.hand); b.m3.hand = null; }
    let html = '';
    const peak = dial ? peakHour(v.load!.hours) : 0;
    if (dial) html += dialMarkup(dial, v.load!.hours, peak);
    figs.forEach((k, i) => {
      const at = spots[i], art = figureArt(k, b.look)!;
      const sc = (at.s ?? 1) * 1.45, sx = at.flip ? -sc : sc; // a little larger than life, so a person reads on a phone
      let arm = '';
      if (art.arm) {
        // The watch: a lift of the arm every few seconds, more often the more the Market decides for him.
        const per = (14 - 10 * clamp(watch, 0, 1)).toFixed(1);
        arm = `<b class="warm" style="left:${f(art.arm.x * sx)}px;top:${f(art.arm.y * sc)}px;animation-duration:${per}s">${spr(`<g transform="scale(${sx} ${sc})">${art.arm.svg}</g>`)}</b>`;
      }
      html += `<div class="fx on fig fg-${k}" style="left:${f(at.x)}px;top:${f(at.y)}px">${spr(`<g transform="scale(${sx} ${sc})">${art.body}</g>`)}${arm}</div>`;
    });
    b.el.m3.innerHTML = html;
    b.m3.hourK = 1; b.m3.hour = -1;
    const hand = b.el.m3.querySelector('.dhand') as HTMLElement | null;
    if (dial && hand) {
      hand.style.transform = `rotate(${peak * 15}deg)`; // reduced motion and stills: the peak hour
      if (typeof hand.animate === 'function') {
        try {
          const a = hand.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: DAY_MS, iterations: Infinity, easing: 'linear' });
          a.currentTime = (18 / 24) * DAY_MS; // the day starts at dusk, with the lamps
          a.pause();
          b.moverAnims.push(a); animOf.set(hand, a); b.m3.hand = a;
        } catch { /* no Web Animations: the clock stands at the peak */ }
      }
    }
    syncPlay();
    tickClock();
  }
  /** Light's clock: every 2.5 s, light the town for the hour the hand shows (the hand itself is composited). */
  function tickClock(): void {
    const b = B, v = lastView;
    const live = !!b && !!v && !!v.load && !!b.layout.dial && v.sectorId === b.sectorId;
    if (!live) { if (clockT) { clearInterval(clockT); clockT = 0; } return; }
    let h = peakHour(v!.load!.hours);
    const a = b!.m3.hand;
    if (a && !rm() && a.playState !== 'idle') h = Math.floor(((Number(a.currentTime ?? 0) % DAY_MS) / DAY_MS) * 24) % 24;
    if (h !== b!.m3.hour) {
      b!.m3.hour = h;
      b!.m3.hourK = 0.12 + 0.88 * clamp(v!.load!.hours[h] ?? 1, 0, 1);
      const lm = lightMeanOf(v!);
      for (const p of b!.plots) if (p.def.byHour) setCount(b!, p, density(p, v!, lm));
    }
    if (!clockT && !rm()) clockT = window.setInterval(() => { if (destroyed) { clearInterval(clockT); return; } tickClock(); }, 2500);
    if (clockT && rm()) { clearInterval(clockT); clockT = 0; }
  }

  /* ---------------- update ---------------- */
  function draw(v: SceneView, quiet: boolean): void {
    const view = normalise(v);
    const key = buildKey(view);
    if (!B || B.sectorId !== view.sectorId || B.key !== key) {
      const kept = cache.get(view.sectorId);
      if (kept && kept.key === key) attach(kept, view);
      else {
        const old = B && B.sectorId === view.sectorId ? B : kept ?? null;
        const nb = build(view, key);
        // The machines changed generation: keep the old landmarks for a moment so they can sink away.
        if (old && old.stageN !== nb.stageN && !quiet && !rm()) carryOutgoing(old, nb);
        attach(nb, view);
        remember(nb);
      }
      if (target) setTarget(target);
    }
    // Skip the patch when nothing has moved past what the picture or card can show.
    const sig = viewSig(view);
    const b = B!;
    if (sig === b.lastSig && lastView && !captionDirty && !(view.events && view.events.length)) { lastView = view; return; }
    b.lastSig = sig; captionDirty = false;
    lastView = view;
    patch(view, quiet);
  }

  function carryOutgoing(old: Built, nb: Built): void {
    for (const p of nb.plots) {
      if (!p.app || p.app.status !== 'founded') continue;
      const op = old.plots.find((q) => q.def.key === p.def.key);
      const oa = op ? old.elsByKey.get(`${op.idx}:a`)?.[0] : undefined;
      const na = nb.elsByKey.get(`${p.idx}:a`)?.[0];
      if (!oa || !na || !oa.classList.contains('on')) continue;
      const c = oa.cloneNode(true) as Element;
      c.removeAttribute('data-k');
      c.setAttribute('class', 'outgoing');
      na.parentNode?.insertBefore(c, na);
    }
  }

  function update(v: SceneView): void {
    if (destroyed || !v || typeof v !== 'object' || replaying) return;
    try { draw(v, false); } catch (e) { console.warn('scene update failed', e); }
  }

  /** Build an Industry's world now, off screen, so a later switch to it is a re-attach. */
  function prebuild(v: SceneView): void {
    if (destroyed || !v || typeof v !== 'object') return;
    try {
      const view = normalise(v);
      if (B && B.sectorId === view.sectorId) return;
      const key = buildKey(view);
      const kept = cache.get(view.sectorId);
      if (kept && kept.key === key) return;
      const nb = build(view, key);
      nb.used = 0;
      remember(nb);
    } catch (e) { console.warn('scene prebuild failed', e); }
  }

  function replay(views: SceneView[], o: ReplayOptions = {}): Promise<void> {
    stopReplay();
    const list = (Array.isArray(views) ? views : []).filter((x) => x && typeof x === 'object');
    if (!list.length) return Promise.resolve();
    const total = Math.max(1, (o.seconds ?? 10) * 1000);
    const dt = Math.max(40, total / list.length);
    const back = lastView;
    let i = 0;
    clearMoments();
    return new Promise((done) => {
      const finish = () => {
        replaying = 0; replayDone = null;
        if (back && !destroyed) { try { draw({ ...back, events: undefined }, true); } catch { /* ignore */ } }
        try { o.onDone?.(); } catch { /* ignore */ }
        done();
      };
      replayDone = finish;
      const step = () => {
        if (destroyed) { finish(); return; }
        try { draw({ ...list[i], events: undefined }, true); } catch (e) { console.warn('scene replay', e); }
        i++;
        if (i >= list.length) { replaying = 0; later(finish, 600); return; }
        replaying = window.setTimeout(step, dt);
      };
      replaying = -1;
      step();
    });
  }
  let replayDone: (() => void) | null = null;
  function stopReplay(): void {
    if (!replaying) return;
    if (replaying > 0) clearTimeout(replaying);
    replaying = 0;
    replayDone?.();
  }

  function toSVG(o: StillOptions = {}): string {
    if (!B) return '';
    return serialise(root, B.el, B.look, o);
  }

  function destroy(): void {
    destroyed = true;
    stopReplay();
    io?.disconnect(); ro?.disconnect();
    cache.forEach(discard); cache.clear();
    if (B) discard(B);
    if (playRaf) cancelAnimationFrame(playRaf);
    if (clockT) clearInterval(clockT);
    if (shedT) clearInterval(shedT);
    document.removeEventListener('visibilitychange', onVis);
    mq?.removeEventListener?.('change', onMq);
    timers.forEach((t) => clearTimeout(t)); timers.clear();
    root.remove();
  }

  const handle: SceneHandle & { prebuild(v: SceneView): void; toSVG(o?: StillOptions): string } = {
    update,
    setSector,
    select: (a) => select(a, false),
    setReducedMotion: (on) => { rmOverride = on; applyMotion(); },
    setDetail: (d) => { detailOpt = d; if (d === 'auto') { setLow(false); watchFrames(); } else setLow(d === 'low'); },
    highlight: (t) => setTarget(t ?? null),
    replay,
    stopReplay,
    prebuild,
    toSVG,
    describe: () => summaryText,
    destroy,
  };
  return handle;
}

/**
 * Render a SceneView as a still picture (no animation, deterministic) for an image: the time-lapse of a valley, a
 * saved picture. Builds a hidden scene, draws the view at rest, and serialises it into one self-contained SVG
 * (styles inlined); `format: 'png'` rasterises that through a canvas. Needs a DOM (a browser page).
 */
export async function renderStill(view: SceneView, o: StillOptions = {}): Promise<string | Blob> {
  const w = Math.max(1, Math.round(o.width ?? 600)), h = Math.max(1, Math.round(o.height ?? 400));
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-${w + 4000}px;top:0;width:${w}px;pointer-events:none;contain:strict;height:${h + 200}px`;
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  const sc = createScene(host, { reducedMotion: true, card: false, detail: 'full' }) as SceneHandle & { toSVG(o?: StillOptions): string };
  try {
    sc.update({ ...view, events: undefined });
    const svg = sc.toSVG({ ...o, width: w, height: h });
    if ((o.format ?? 'svg') === 'svg') return svg;
    return await rasterise(svg, w, h, o.scale ?? 2);
  } finally {
    sc.destroy();
    host.remove();
  }
}

async function rasterise(svg: string, w: number, h: number, k: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('scene: still did not load')); img.src = url; });
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const cx = cv.getContext('2d');
    if (!cx) throw new Error('scene: no canvas');
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    return await new Promise<Blob>((ok, bad) => cv.toBlob((b) => (b ? ok(b) : bad(new Error('scene: toBlob failed'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A CSS linear-gradient(…) (as computed) → SVG stops; anything else → a flat colour. */
function gradStops(bg: string): string {
  const stops: string[] = [];
  const re = /(rgba?\([^)]*\))(?:\s+([\d.]+)%)?/g;
  let m: RegExpExecArray | null;
  const found: [string, number | null][] = [];
  while ((m = re.exec(bg))) found.push([m[1], m[2] != null ? +m[2] : null]);
  if (!found.length) return '';
  found.forEach(([c, p], i) => {
    const off = p != null ? p / 100 : found.length === 1 ? 0 : i / (found.length - 1);
    const mm = /rgba?\(([^)]*)\)/.exec(c);
    const parts = (mm ? mm[1] : '0,0,0').split(/[\s,/]+/).filter(Boolean).map(Number);
    const a = parts.length > 3 ? parts[3] : 1;
    stops.push(`<stop offset="${off.toFixed(3)}" stop-color="rgb(${parts[0] | 0},${parts[1] | 0},${parts[2] | 0})" stop-opacity="${a}"/>`);
  });
  return stops.join('');
}

/** The picture as one self-contained SVG: CSS backgrounds become gradients, sprites become groups at rest. */
function serialise(root: HTMLElement, el: WorldEls, look: string, o: StillOptions): string {
  const w = Math.round(o.width ?? 600), h = Math.round(o.height ?? 400);
  let gid = 0;
  const grads: string[] = [];
  const layerRect = (d: HTMLElement): string => {
    const cs = getComputedStyle(d);
    if (cs.display === 'none') return '';
    const op = parseFloat(d.style.opacity || cs.opacity || '1');
    if (!(op > 0.004)) return '';
    const bg = cs.backgroundImage;
    const stops = bg && bg !== 'none' ? gradStops(bg) : '';
    if (!stops) {
      const c = cs.backgroundColor;
      if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return '';
      return `<rect width="600" height="400" fill="${c}" opacity="${op}"/>`;
    }
    const gi = `g${++gid}`;
    const radial = /^radial/.test(bg);
    grads.push(radial ? `<radialGradient id="${gi}" cx=".5" cy=".58" r=".6">${stops}</radialGradient>` : `<linearGradient id="${gi}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`);
    return `<rect width="600" height="400" fill="url(#${gi})" opacity="${op}"/>`;
  };
  const sprite = (d: HTMLElement): string => {
    if (!d.classList.contains('on')) return '';
    const left = parseFloat(d.style.left) || 0, top = parseFloat(d.style.top) || 0;
    const sm = /scale\(([-\d.]+)/.exec(d.style.transform || '');
    const k = sm ? +sm[1] : 1;
    if (d.classList.contains('smk')) {
      const col = getComputedStyle(d.querySelector('i') ?? d).backgroundColor || 'rgba(80,80,80,.35)';
      return `<g transform="translate(${f(left)} ${f(top)}) scale(${k})" fill="${col}"><circle cx="2" cy="-5" r="2.1"/><circle cx="9" cy="-15" r="3.6" opacity=".75"/><circle cx="18" cy="-24" r="5.2" opacity=".45"/></g>`;
    }
    const svgs = d.querySelectorAll('svg.spr');
    if (!svgs.length) return '';
    const inner = d.classList.contains('flow') ? svgs[0].innerHTML : Array.from(svgs).map((s) => s.innerHTML).join('');
    return `<g class="fx-st ${d.className.replace(/\b(on|live|thin)\b/g, '')}" transform="translate(${f(left)} ${f(top)}) scale(${d.classList.contains('mv') ? 1 : k})">${inner}</g>`;
  };
  let body = '';
  body += layerRect(el.sky0) + layerRect(el.sky1) + layerRect(el.sky2);
  body += el.skySvg.innerHTML;
  const band = (b: Band) => {
    let s = '';
    for (const c of Array.from(el.bw[b].children)) {
      if (c instanceof SVGSVGElement) s += `<g class="${c.getAttribute('class') ?? ''}">${c.innerHTML}</g>`;
      else s += Array.from(c.children).map((x) => sprite(x as HTMLElement)).join('');
    }
    return s;
  };
  body += band('far') + layerRect(el.mist1) + layerRect(el.hz1) + band('mid') + layerRect(el.mist2) + layerRect(el.hz2) + band('near') + layerRect(el.hz3) + layerRect(el.held);
  // M3: the Reckoning as the frozen scene: the colour drained (as .halt does live) and the banner lettered across it.
  const frozen = !!o.frozen && root.classList.contains('halt');
  if (frozen) {
    grads.push(`<filter id="frz"><feColorMatrix type="saturate" values=".25"/><feComponentTransfer><feFuncR type="linear" slope=".92" intercept=".03"/><feFuncG type="linear" slope=".92" intercept=".03"/><feFuncB type="linear" slope=".92" intercept=".03"/></feComponentTransfer></filter>`);
    body = `<g filter="url(#frz)">${body}</g>`;
  }
  if (o.plate !== false) body += el.plateSvg.innerHTML;
  const bt = frozen ? (root.querySelector('.scn-banner span')?.textContent ?? '') : '';
  if (bt) {
    const w2 = Math.min(560, 60 + bt.length * 13);
    body += `<g transform="translate(300 152)"><rect x="${-w2 / 2}" y="-22" width="${w2}" height="40" style="fill:rgb(var(--s-fog,var(--s-smk)));fill-opacity:.88"/>` +
      `<path d="M${-w2 / 2} -22H${w2 / 2}M${-w2 / 2} 18H${w2 / 2}" style="stroke:var(--s-btxt,var(--s-paper))" stroke-width="1"/>` +
      `<text x="0" y="6" text-anchor="middle" style="fill:var(--s-btxt,var(--s-paper));font:700 22px Georgia,serif">${esc(bt)}</text></g>`;
  }
  const cls = Array.from(root.classList).filter((c) => !/^(live|paused|halt|crisis|backfire)$/.test(c)).concat('rm', 'still').join(' ');
  const vars = (root.style.cssText + ';' + el.world.style.cssText).replace(/"/g, "'");
  const css = sceneCss().replace(/<\/style/gi, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">` +
    `<style>${css}\n.still *{vector-effect:non-scaling-stroke}</style>` +
    `<g class="${cls}" data-look="${look}" style="${vars}">${el.defs.innerHTML}<defs>${grads.join('')}</defs>${body}</g></svg>`;
}

/** A sprite's drawing: an overflow-visible SVG drawn about the sprite's origin. */
function spr(inner: string): string {
  return `<svg class="spr" width="1" height="1" overflow="visible" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/** Mean adoption of founded applications (Light's sky glow, lamps of any kind). */
function lightMeanOf(v: SceneView): number {
  const founded = v.apps.filter((a) => a.status === 'founded');
  return founded.length ? founded.reduce((s, a) => s + a.adoption, 0) / Math.max(founded.length, v.apps.length * 0.6) : 0;
}
function peakHour(hours: number[]): number {
  let k = 0;
  hours.forEach((h, i) => { if (h > hours[k]) k = i; });
  return k;
}
/** Light's day clock: a poster roundel with the day's load drawn round a 24-hour dial (a bar per hour, the night
 *  half shaded) and a hand that walks the day. Hour 0 (midnight) at the top. */
function dialMarkup([x, y, r]: [number, number, number], hours: number[], peak: number): string {
  let bars = '', night = '';
  for (let h = 0; h < 24; h++) {
    const t = ((h + 0.5) / 24) * Math.PI * 2 - Math.PI / 2;
    const r0 = r * 0.36, r1 = r * (0.4 + 0.5 * clamp(hours[h] ?? 0, 0, 1));
    const c = Math.cos(t), sn = Math.sin(t);
    bars += `M${f(c * r0)} ${f(sn * r0)}L${f(c * r1)} ${f(sn * r1)}`;
  }
  // The night: 20:00 to 06:00, as a darker sector.
  const a0 = (20 / 24) * Math.PI * 2 - Math.PI / 2, a1 = (6 / 24) * Math.PI * 2 - Math.PI / 2, rr = r * 0.94;
  night = `M0 0L${f(Math.cos(a0) * rr)} ${f(Math.sin(a0) * rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(Math.cos(a1) * rr)} ${f(Math.sin(a1) * rr)}Z`;
  let ticks = '';
  for (let h = 0; h < 24; h += 6) { const t = (h / 24) * Math.PI * 2 - Math.PI / 2; ticks += `M${f(Math.cos(t) * r * 0.94)} ${f(Math.sin(t) * r * 0.94)}L${f(Math.cos(t) * r * 1.06)} ${f(Math.sin(t) * r * 1.06)}`; }
  const face = C(0, 0, r * 1.12, 'dlr') + C(0, 0, r, 'b k K') + P(night, 'dln') + P(bars, 'dlb') + P(ticks, 'k K') + C(0, 0, r * 0.3, 'b k');
  const hand = P(`M0 ${f(r * 0.12)}L0 ${f(-r * 0.9)}`, 'k K dlh') + C(0, -r * 0.9, r * 0.07, 'd') + C(0, 0, r * 0.08, 'd');
  void peak;
  return `<div class="fx on dial" style="left:${f(x)}px;top:${f(y)}px">${spr(face)}<b class="dhand on">${spr(hand)}</b></div>`;
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
    `${v.decoupling ? 1 : 0}${v.steady ? 1 : 0}|${q(v.steadyProgress, 50)}|${v.reckoning ? v.reckoning.cause + v.reckoning.here : ''}|` +
    `${v.clear ? 1 : 0}${v.settled ? 1 : 0}${v.settledYear ?? ''}|${q(v.clearProgress ?? 0, 50)}|${q(v.pressureToClear ?? -1, 50)}|`;
  for (const a of v.apps) s += `${a.id}:${a.status[0]}${q(a.adoption, 100)}:${sig2(a.demand)}:${a.canFound ? 1 : 0}${q(a.affordFraction, 100)};`;
  for (const l of v.levers) s += `${l.kind}${l.level}${l.bite != null && l.bite >= 0.5 ? 'b' : ''},`;
  // M3: what the mechanics draw.
  if (v.seams) s += `|sm${v.seams.sunk}/${v.seams.total}${v.seams.next ? 'n' : ''}`;
  if (v.load) s += `|ld${v.load.hours.map((h) => q(h, 10)).join('')}`;
  if (v.travel) s += `|tv${q(v.travel.speed, 20)}/${q(v.travel.sprawl, 50)}/${q(v.travel.freeSpeed ?? 1, 10)}`;
  if (v.free) s += `|fr${v.free.apps.join(',')}`;
  if (v.figures) s += `|fg${v.figures.join(',')}`;
  if (v.watch != null) s += `|w${q(v.watch, 10)}`;
  // M4
  if (v.fedBy) s += `|fb${v.fedBy.map((x) => x.app + q(x.share, 20)).join(',')}`;
  if (v.feeds) s += `|fd${v.feeds.map((x) => x.to + q(x.factor, 50)).join(',')}`;
  const sk = v.stock;
  if (sk) s += `|st${q(sk.reported, 50)}/${q(sk.truth, 50)}/${q(sk.foreign, 50)}${sk.surveyed ? 's' : ''}${sk.scar ? 'x' : ''}${sk.crossed ? 'c' : ''}${sk.moratorium ? 'm' : ''}`;
  if (v.capstoned) s += `|cp${v.capstoned.year ?? ''}${v.capstoned.arrears ? 'a' : ''}`;
  if (v.preview) s += '|pv';
  return s;
}

/** The part of the build key the M3 fields decide (only what changes the static drawing: the seam ladder's length). */
function m3Key(v: SceneView): string {
  return v.seams && v.seams.total > 0 ? 'sm' + Math.min(8, Math.floor(v.seams.total)) : '';
}

/** M3 fields, cleaned (each stays absent when absent or malformed). */
function normaliseM3(v: SceneView): Partial<SceneView> {
  const n = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  const o: Partial<SceneView> = { seams: undefined, load: undefined, travel: undefined, free: undefined, figures: undefined, watch: undefined };
  const sm = v.seams;
  if (sm && typeof sm === 'object' && n(sm.total) >= 1) { const t = Math.min(8, Math.floor(n(sm.total))); o.seams = { total: t, sunk: clamp(Math.floor(n(sm.sunk)), 0, t), next: !!sm.next }; }
  const ld = v.load;
  if (ld && typeof ld === 'object' && Array.isArray(ld.hours) && ld.hours.length) {
    const hs = Array.from({ length: 24 }, (_, i) => clamp(n(ld.hours[Math.floor((i * ld.hours.length) / 24)]), 0, 1));
    o.load = { hours: hs, factor: clamp(n(ld.factor, 1), 0, 1) };
  }
  const tv = v.travel;
  if (tv && typeof tv === 'object') o.travel = { speed: clamp(n(tv.speed, 1), 0, 1), sprawl: clamp(n(tv.sprawl), 0, 1), sprawlShare: clamp(n(tv.sprawlShare), 0, 1), freeSpeed: Math.max(0, n(tv.freeSpeed, 1)) };
  if (v.free && typeof v.free === 'object' && Array.isArray(v.free.apps)) o.free = { apps: v.free.apps.filter((x) => typeof x === 'string') };
  if (Array.isArray(v.figures)) o.figures = v.figures.filter((x) => typeof x === 'string' && /^[\w-]{1,40}$/.test(x)).slice(0, 8);
  if (typeof v.watch === 'number' && Number.isFinite(v.watch)) o.watch = clamp(v.watch, 0, 1);
  return o;
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
    levers: Array.isArray(v.levers) ? v.levers.filter((x) => x && typeof x.kind === 'string').map((x) => (typeof x.bite === 'number' && Number.isFinite(x.bite) ? { ...x, bite: clamp(x.bite, 0, 1) } : x)) : [],
    decoupling: !!v.decoupling, steadyProgress: clamp(n(v.steadyProgress), 0, 1), steady: !!v.steady,
    heritage: v.heritage && typeof v.heritage === 'object' ? v.heritage : undefined,
    reckoning: v.reckoning && typeof v.reckoning === 'object' ? { cause: String(v.reckoning.cause ?? 'chosen'), here: v.reckoning.here !== false } : null,
    clear: !!v.clear, clearProgress: clamp(n(v.clearProgress), 0, 1),
    pressureToClear: typeof v.pressureToClear === 'number' && Number.isFinite(v.pressureToClear) ? clamp(v.pressureToClear, 0, 1) : undefined,
    settled: !!v.settled, settledYear: v.settledYear == null ? null : n(v.settledYear),
    commons: Array.isArray(v.commons) ? v.commons.filter((c) => c && typeof c.id === 'string' && n(c.level) >= 1).map((c) => ({ id: c.id, icon: String(c.icon ?? ''), level: Math.floor(n(c.level)), name: String(c.name ?? c.id) })) : [],
    landmark: typeof v.landmark === 'string' && v.landmark ? v.landmark : null,
    events: Array.isArray(v.events) ? v.events.filter((e) => e && Number.isFinite(e.seq)) : undefined,
    ...normaliseM3(v),
    ...normaliseM4(v),
  };
}

/** M4 fields, cleaned (each stays absent when absent or malformed). */
function normaliseM4(v: SceneView): Partial<SceneView> {
  const n = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  const o: Partial<SceneView> = { feeds: undefined, fedBy: undefined, stock: undefined, capstoned: undefined, preview: undefined };
  if (Array.isArray(v.feeds)) o.feeds = v.feeds.filter((x) => x && typeof x.to === 'string').map((x) => ({ to: x.to, factor: clamp(n(x.factor, 1), 0, 1) }));
  if (Array.isArray(v.fedBy)) o.fedBy = v.fedBy.filter((x) => x && typeof x.app === 'string').map((x) => ({ from: String(x.from ?? ''), app: x.app, share: clamp(n(x.share), 0, 1) }));
  const st = v.stock;
  if (st && typeof st === 'object') {
    o.stock = { reported: clamp(n(st.reported, 1), 0, 1), truth: clamp(n(st.truth, n(st.reported, 1)), 0, 1), surveyed: !!st.surveyed, foreign: clamp(n(st.foreign), 0, 1),
      scar: !!st.scar, crossed: !!st.crossed, moratorium: !!st.moratorium };
  }
  if (v.capstoned && typeof v.capstoned === 'object') o.capstoned = { year: v.capstoned.year == null ? null : Math.floor(n(v.capstoned.year)), arrears: !!v.capstoned.arrears };
  if (v.preview === true) o.preview = true;
  return o;
}

/** M4: the fleet is tied up in harbour: a moratorium, or a failed bank (the stock crossed its threshold and is low). */
function tiedUp(v: SceneView): boolean {
  const s = v.stock;
  return !!s && (s.moratorium || s.truth < 0.1 || (s.crossed && s.truth < 0.25));
}

/** Where the Commons stand: the layout's civic sites, else sites taken from its town plot (every few houses). */
function commonsSites(l: Layout): Slot[] {
  if (l.commons?.length) return l.commons;
  const town = l.plots.find((p) => p.driver === 'population' && !p.overlayOf);
  if (!town) return l.spares.map(([x, y, w, h]) => ({ p: '', x: x + w / 2, y: y + h }));
  return town.slots.filter((_, i) => i % 3 === 1).slice(0, 8).map((s) => ({ p: '', x: s.x + 6, y: s.y + 0.5, band: s.band }));
}
/** Prop key for a Commons icon: the style's own drawing, a shared one, else a civic hall. */
function commonsProp(layoutLook: string, look: string, icon: string): string {
  return propFor(layoutLook, look, 'commons:' + icon) !== works0 ? 'commons:' + icon : 'civic';
}
function landmarkProp(layoutLook: string, look: string, key: string): string {
  return propFor(layoutLook, look, 'landmark:' + key) !== works0 ? 'landmark:' + key : propFor(layoutLook, look, key) !== works0 ? key : 'civic';
}
const works0 = propFor('generic', 'generic', '\u0000none');

/** What the new machine is, in the idiom of the Age (a toast when the machines change). */
function stageWords(look: string, n: number): string {
  const W: Record<string, string[]> = {
    ledger: ['Atmospheric engines', 'The separate condenser', 'High-pressure steam', 'The turbine hall'],
    gaslight: ['Open gas flames', 'The incandescent mantle', 'The carbon filament', 'The fluorescent tube'],
    chrome: ['The carburettor', 'Fuel injection', 'Wind-tunnel bodywork', 'The hybrid'],
    terminal: ['One machine, one job', 'Virtualisation', 'Hyperscale', 'The GPU cluster'],
    cyberpunk: ['Autocomplete', 'The chat assistant', 'The coding agent', 'Agent fleets'],
  };
  const list = W[look] ?? ['', 'New machines', 'Newer machines', 'The newest machines'];
  return list[clamp(Math.round(n), 0, 3)] || 'New machines';
}

const WEATHER = ['clear', 'hazy', 'thickening', 'heavy', 'choking'];
function weatherOf(v: SceneView): string {
  return v.clear || v.settled || v.steady ? 'clear' : weatherWord(v.stock && !v.stock.surveyed ? 1 - v.stock.reported : v.pressureFraction);
}
/** The reserve as words may speak of it: an unsurveyed stock only as the fleet reports it. */
function shownReserve(v: SceneView): number {
  return v.stock && !v.stock.surveyed ? v.stock.reported : v.reserveFraction;
}
function weatherWord(pf: number): string {
  return WEATHER[pf < 0.08 ? 0 : pf < 0.3 ? 1 : pf < 0.55 ? 2 : pf < 0.8 ? 3 : 4];
}
function reserveWord(r: number, flow: boolean): string {
  if (flow) return r > 0.6 ? 'plenty to spare' : r > 0.3 ? 'stretched' : r > 0.1 ? 'nearly all spoken for' : 'exhausted';
  return r > 0.85 ? 'barely touched' : r > 0.6 ? 'three-quarters left' : r > 0.4 ? 'half gone' : r > 0.2 ? 'running low' : r > 0.05 ? 'nearly spent' : 'spent';
}

/** How the scene words a settlement. A capstoned Industry was settled for good at its Act's ending: its one year is
 *  the ending's (CapstoneRecord.year), the cartouche's and the group heading's; SettledState.sinceYear is only the
 *  run's start for it (the core rewrites it each run), so it is never shown. Otherwise, the year it was settled. */
export function settledWords(v: SceneView): string {
  if (v.capstoned) return v.capstoned.year ? `settled ${v.capstoned.year}` : 'settled';
  return v.settledYear ? `settled since ${v.settledYear}` : 'settled';
}

function caption(v: SceneView): string {
  const founded = v.apps.filter((a) => a.status === 'founded').length;
  const avail = v.apps.some((a) => a.status === 'available');
  // M4: an unsurveyed stock is spoken of as the fleet reports it (catch per trip), never as the truth.
  const parts = [`${v.pressureName}: ${weatherOf(v)}`, `${v.resourceName.toLowerCase()} ${reserveWord(shownReserve(v), v.resourceKind === 'flow')}`];
  if (v.settled) parts.push(settledWords(v));
  else if (v.steady) parts.push('steady state');
  else if (v.clear) parts.push('clear skies');
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
  s += `${v.pressureName} ${weatherOf(v)}; ${v.resourceName.toLowerCase()} ${reserveWord(shownReserve(v), v.resourceKind === 'flow')}${v.stock && !v.stock.surveyed ? ' by the skippers’ report' : ''}`;
  const rw = lay.reserveWords?.(v.reserveFraction);
  s += rw ? `: ${rw}. ` : '. ';
  if (v.levers.length) s += `In force: ${v.levers.map((x) => x.name).join(', ')}. `;
  if (v.commons?.length) s += `Built for everyone: ${v.commons.map((c) => c.name).join(', ')}. `;
  if (v.reckoning) s += 'Everything has stopped: a Reckoning is due.';
  else if (v.settled) { const w = settledWords(v); s += `${w.charAt(0).toUpperCase()}${w.slice(1)}: the place runs quietly within what the sky can take.`; }
  else if (v.steady) s += 'The sky has cleared: steady state.';
  else if (v.clear) s += `Clear skies, ${Math.round((v.clearProgress ?? 0) * 100)}% of the way to steady state.`;
  else if (v.decoupling) s += `Holding within budget, ${Math.round(v.steadyProgress * 100)}% of the way to steady state.`;
  else if (v.pressureFraction >= 0.8) s += 'Close to breaking.';
  return s.trim();
}

