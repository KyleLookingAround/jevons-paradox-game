// The time-lapse: the player's own valley from the start of the run to its end in about ten seconds, beside the same
// seconds of the efficiency and consumption figures, shown in the run summary at each Reckoning.
//
// THE RECORD (UI-side, never in the save, no rules). A compact, bounded ring of scene views per open Industry, sampled
// as the run goes, under its own localStorage key `rebound.ui.lapse`:
//   { v: 1, run: "<seed>:<reckonings>", every: <run seconds between samples>, frames: { <sector>: Frame[] } }
// A Frame holds only the moving numbers of a SceneView (run time, year, stage, pace, reserve, pressure, population,
// crises, the streak, η and R folds, each application's status and adoption, the levers in force): about 100–150 bytes
// as JSON. At most FRAMES_MAX frames per Industry: when the ring fills, every other frame is dropped and the interval
// doubles, so the record always spans the whole run. Five Industries: at most about 5 × 96 × 150 B ≈ 70 KB. The rest of
// a view (names, icons, the look) is rebuilt from content when the replay plays. Wrapped in try/catch throughout: the
// game runs without it, and without it the summary simply has no replay.
import type { Ctx } from './ctx';
import { sectorDef, openSectors } from './ctx';
import type { SceneView } from './scene';
import { createScene, sceneViewFrom, renderStill } from './scene';
import { lsGet, lsSet } from './store';
import { h, setText, show, reducedMotion } from './dom';
import { fold, num, clamp, lower, fmt } from './fmt';

const KEY = 'rebound.ui.lapse';
const FRAMES_MAX = 96;
const FIRST_EVERY = 5;
const REPLAY_MS = 10000;

interface Frame {
  t: number; y: number; s: number; p: number; r: number; pf: number; pop: number; po: number; c: number; d: 0 | 1; sp: number; st: 0 | 1;
  ef: number; rf: number;
  /** Per application, in content order: status (0 hidden, 1 available, 2 founded) and adoption × 1000. */
  a: number[]; ad: number[];
  /** Levers in force: [kind, level]. */
  lv: [string, number][];
}
interface Store { v: 1; run: string; every: number; frames: Record<string, Frame[]> }

export interface Lapse { sector: string; frames: Frame[]; endCause: string | null; startYear: number; endYear: number }

const r3 = (x: number) => Math.round(num(x) * 1000) / 1000;
const runKey = (ctx: Ctx) => `${ctx.state.seed ?? 0}:${ctx.state.meta?.reckonings ?? 0}`;

function compact(v: SceneView, t: number): Frame {
  return {
    t: Math.round(t), y: Math.floor(num(v.year)), s: num(v.stage), p: r3(v.pace), r: r3(v.reserveFraction), pf: r3(v.pressureFraction), pop: r3(v.popFraction),
    po: r3(v.population), c: num(v.crises), d: v.decoupling ? 1 : 0, sp: r3(v.steadyProgress), st: v.steady ? 1 : 0, ef: r3(v.etaFold), rf: r3(v.rFold),
    a: (v.apps || []).map((x) => (x.status === 'founded' ? 2 : x.status === 'available' ? 1 : 0)),
    ad: (v.apps || []).map((x) => Math.round(clamp(num(x.adoption), 0, 1) * 1000)),
    lv: (v.levers || []).map((l) => [String(l.kind), num(l.level)] as [string, number]),
  };
}

/** A full SceneView from a frame, over a template view of the same Industry (names, icons, look). */
export function expand(tpl: SceneView, f: Frame, reckoning: SceneView['reckoning'] = null): SceneView {
  // Sites that were only staked out are drawn as empty ground: the replay is a picture, not a place to tap.
  return {
    ...tpl,
    apps: (tpl.apps || []).map((a, i) => ({ ...a, status: f.a[i] === 2 ? 'founded' : 'hidden', adoption: num(f.ad[i]) / 1000, canFound: false })),
    stage: f.s, etaFold: f.ef, rFold: f.rf, pace: f.p, reserveFraction: f.r, pressureFraction: f.pf, popFraction: f.pop, population: f.po,
    crises: f.c, decoupling: !!f.d, steadyProgress: f.sp, steady: !!f.st, year: f.y, reckoning,
    levers: f.lv.map(([kind, level], i) => ({ id: `${kind}.${i}`, kind, level, name: kind })),
  };
}

export interface Recorder {
  /** Called on every page update: samples when enough run time has passed. Cheap otherwise (one comparison). */
  tick(): void;
  /** At a Reckoning, before the run is replaced: the record of the run that ends, with its last frame. */
  finish(cause: SceneView['reckoning']): Lapse | null;
  /** After a load, import or new run. */
  reset(): void;
  save(): void;
}

export function createRecorder(ctx: Ctx, preferred: () => string): Recorder {
  let st: Store = load();
  let lastT = -Infinity;
  let dirty = false;

  function load(): Store {
    try {
      const o = JSON.parse(lsGet(KEY) || 'null');
      if (o && o.v === 1 && typeof o.run === 'string' && o.frames && typeof o.frames === 'object' && num(o.every) > 0) return o as Store;
    } catch { /* unreadable: start empty */ }
    return { v: 1, run: '', every: FIRST_EVERY, frames: {} };
  }
  function ensureRun(): void {
    const k = runKey(ctx);
    if (st.run !== k) { st = { v: 1, run: k, every: FIRST_EVERY, frames: {} }; lastT = -Infinity; dirty = true; }
    else if (lastT === -Infinity) {
      for (const fs of Object.values(st.frames)) if (fs.length) lastT = Math.max(lastT, fs[fs.length - 1].t);
    }
  }
  function sample(force = false): void {
    const t = num(ctx.state.time);
    if (!force && t - lastT < st.every) return;
    lastT = t;
    for (const id of openSectors(ctx)) {
      let v: SceneView;
      try { v = sceneViewFrom(ctx.content, ctx.state, ctx.d, id); } catch { continue; }
      const list = st.frames[id] ?? (st.frames[id] = []);
      if (list.length && list[list.length - 1].t === Math.round(t)) list[list.length - 1] = compact(v, t);
      else list.push(compact(v, t));
    }
    // Thin: when any ring is full, keep every other frame (the first and last always) and sample half as often.
    if (Object.values(st.frames).some((fs) => fs.length > FRAMES_MAX)) {
      for (const id of Object.keys(st.frames)) {
        const fs = st.frames[id];
        st.frames[id] = fs.filter((_, i) => i % 2 === 0 || i === fs.length - 1);
      }
      st.every *= 2;
    }
    dirty = true;
  }
  return {
    tick() {
      if (ctx.d?.pendingReckoning || ctx.d?.freshRun) { if (ctx.d?.freshRun) ensureRun(); return; }
      ensureRun();
      sample();
    },
    finish(cause) {
      try {
        ensureRun();
        sample(true);
        const pref = preferred();
        const ids = Object.keys(st.frames).filter((id) => (st.frames[id]?.length ?? 0) >= 2);
        const id = ids.includes(pref) ? pref : ids.sort((a, b) => st.frames[b].length - st.frames[a].length)[0];
        if (!id) return null;
        const frames = st.frames[id].slice();
        return { sector: id, frames, endCause: cause?.cause ?? null, startYear: frames[0].y, endYear: frames[frames.length - 1].y };
      } catch { return null; }
    },
    reset() { st = load(); lastT = -Infinity; ensureRun(); },
    save() {
      if (!dirty) return;
      dirty = false;
      try { lsSet(KEY, JSON.stringify(st)); } catch { /* storage full or blocked: the replay is a nicety */ }
    },
  };
}

/* ------------------------------------------------------------------ */
/* The replay, in the run summary                                      */
/* ------------------------------------------------------------------ */


function sparkPath(vals: number[], upto: number, lo: number, hi: number, w: number, hgt: number): string {
  if (vals.length < 2) return '';
  const n = vals.length - 1;
  const span = Math.max(1e-6, Math.log(hi) - Math.log(lo));
  const pts: string[] = [];
  for (let i = 0; i <= Math.min(upto, n); i++) {
    const x = (i / n) * w;
    const y = hgt - 2 - ((Math.log(Math.max(vals[i], 1e-9)) - Math.log(lo)) / span) * (hgt - 4);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

export function lapseBlock(ctx: Ctx, lapse: Lapse | null, title: string): HTMLElement {
  const el = h('section', { class: 'lapse', 'aria-label': 'The run, from start to end' });
  if (!lapse || lapse.frames.length < 2) {
    el.append(h('p', { class: 'muted small', text: 'No picture was kept of this run on this device.' }));
    return el;
  }
  const def = sectorDef(ctx, lapse.sector);
  const fr = lapse.frames;
  let tpl: SceneView;
  try { tpl = sceneViewFrom(ctx.content, ctx.state, ctx.d, lapse.sector); } catch { el.append(h('p', { class: 'muted small', text: 'The picture could not be rebuilt.' })); return el; }
  const views = fr.map((f, i) => expand(tpl, f, i === fr.length - 1 && lapse.endCause ? { cause: lapse.endCause, here: true } : null));
  const reduced = reducedMotion();

  const yearEl = h('span', { class: 'lp-year num' });
  const effV = h('b', { class: 'num' }), useV = h('b', { class: 'num' });
  const W = 300, HG = 60;
  const effs = fr.map((f) => Math.max(1e-6, f.ef)), uses = fr.map((f) => Math.max(1e-6, f.rf));
  const lo = Math.min(1, ...effs, ...uses) * 0.9, hi = Math.max(1, ...effs, ...uses) * 1.1;
  const chart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chart.setAttribute('viewBox', `0 0 ${W} ${HG}`);
  chart.setAttribute('preserveAspectRatio', 'none');
  chart.setAttribute('class', 'lp-chart');
  chart.setAttribute('aria-hidden', 'true');
  chart.innerHTML = `<line class="lp-base" x1="0" x2="${W}" y1="0" y2="0"/><polyline class="lp-eff" points=""/><polyline class="lp-use" points=""/>`;
  const baseY = HG - 2 - ((Math.log(1) - Math.log(lo)) / Math.max(1e-6, Math.log(hi) - Math.log(lo))) * (HG - 4);
  chart.querySelector('.lp-base')!.setAttribute('y1', baseY.toFixed(1));
  chart.querySelector('.lp-base')!.setAttribute('y2', baseY.toFixed(1));
  const resName = lower(def?.resource.name ?? 'resource');
  const figs = h('div', { class: 'lp-figs' },
    h('span', { class: 'lp-k lp-k-eff' }, 'Efficiency ', effV), h('span', { class: 'lp-k lp-k-use' }, `${def?.resource.name ?? 'Use'} `, useV), yearEl);

  const stageHost = h('div', { class: 'lp-stage' });
  const pair = h('div', { class: 'lp-pair', hidden: true });
  const replayBtn = h('button', { class: 'btn small', type: 'button', onclick: () => play() }, 'Replay');
  const pairBtn = h('button', { class: 'btn small', type: 'button', onclick: () => togglePair() }, 'Before and after');
  const saveBtn = h('button', { class: 'btn small', type: 'button', onclick: () => void savePicture(false) }, 'Save picture');
  const savePairBtn = h('button', { class: 'btn small', type: 'button', onclick: () => void savePicture(true) }, 'Save before and after');
  const shareBtn = h('button', { class: 'btn small', type: 'button', hidden: true, onclick: () => void share() }, 'Share');
  const status = h('span', { class: 'muted small lp-status', 'aria-live': 'polite' });
  el.append(h('h3', { class: 'paper-sub', text: `${def?.name ?? 'The valley'}, ${lapse.startYear} to ${lapse.endYear}` }), stageHost, pair, figs, chart,
    h('div', { class: 'm-row lp-btns' }, replayBtn, pairBtn, saveBtn, savePairBtn, shareBtn, status));
  try { if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') show(shareBtn, true); } catch { /* none */ }

  let scene: ReturnType<typeof createScene> | null = null;
  let raf = 0, idx = -1;
  const sceneOpts = { card: false, reducedMotion: true, detail: 'low' as const };
  function ensureScene(): ReturnType<typeof createScene> | null {
    if (!scene) {
      try { scene = createScene(stageHost, sceneOpts); scene.setSector(lapse!.sector); } catch { scene = null; }
    }
    return scene;
  }
  function show_(i: number): void { showFigs(i, true); }
  function showFigs(i: number, picture: boolean): void {
    if (i === idx) return;
    idx = i;
    if (picture) { try { ensureScene()?.update(views[i]); } catch { /* a scene error must not take the summary down */ } }
    setText(yearEl, String(fr[i].y));
    setText(effV, fold(fr[i].ef));
    setText(useV, fold(fr[i].rf));
    chart.querySelector('.lp-eff')!.setAttribute('points', sparkPath(effs, i, lo, hi, W, HG));
    chart.querySelector('.lp-use')!.setAttribute('points', sparkPath(uses, i, lo, hi, W, HG));
  }
  function stop(): void { if (raf) cancelAnimationFrame(raf); raf = 0; try { scene?.stopReplay?.(); } catch { /* ignore */ } }
  function alive(): boolean {
    if (el.isConnected) return true;
    stop();
    try { scene?.destroy(); } catch { /* ignore */ }
    scene = null;
    return false;
  }
  function play(): void {
    show(pair, false); show(stageHost, true);
    stop();
    if (reduced) { show_(views.length - 1); return; }
    const sc = ensureScene();
    // The scene's own replay draws the picture (no moments, no toasts, update() held off); the figures and the lines
    // follow the same ten seconds, evenly, beside it. Without the hook, the page steps the views itself.
    const own = !sc?.replay;
    if (!own) { idx = -1; show_(0); try { sc!.stopReplay?.(); void sc!.replay!(views, { seconds: REPLAY_MS / 1000 }); } catch { /* fall back below */ } }
    const t0 = performance.now();
    const step = (now: number) => {
      if (!alive()) return;
      const p = clamp((now - t0) / REPLAY_MS, 0, 1);
      showFigs(Math.round(p * (views.length - 1)), own);
      if (p < 1) raf = requestAnimationFrame(step); else raf = 0;
    };
    raf = requestAnimationFrame(step);
  }
  let pairScenes: ReturnType<typeof createScene>[] = [];
  function togglePair(): void {
    const on = pair.hidden === true;
    show(pair, on); show(stageHost, !on);
    setText(pairBtn, on ? 'The replay' : 'Before and after');
    if (on && !pairScenes.length) {
      const a = h('figure', { class: 'lp-fig' }), b = h('figure', { class: 'lp-fig' });
      const ah = h('div', { class: 'lp-mini' }), bh = h('div', { class: 'lp-mini' });
      a.append(ah, h('figcaption', { class: 'num', text: `${fr[0].y}: efficiency ${fold(fr[0].ef)}, ${resName} ${fold(fr[0].rf)}` }));
      b.append(bh, h('figcaption', { class: 'num', text: `${fr[fr.length - 1].y}: efficiency ${fold(fr[fr.length - 1].ef)}, ${resName} ${fold(fr[fr.length - 1].rf)}` }));
      pair.append(a, b);
      try {
        const s0 = createScene(ah, sceneOpts), s1 = createScene(bh, sceneOpts);
        s0.setSector(lapse!.sector); s1.setSector(lapse!.sector);
        s0.update(views[0]); s1.update(views[views.length - 1]);
        pairScenes = [s0, s1];
        const watch = () => { if (!el.isConnected) { for (const s of pairScenes) { try { s.destroy(); } catch { /* ignore */ } } pairScenes = []; } else setTimeout(watch, 1000); };
        setTimeout(watch, 1000);
      } catch { /* no pictures: the captions stand */ }
    }
    if (on) stop();
  }

  /* --- Save picture: a 1080 × 1350 card, drawn on a canvas, downloaded or shared. Nothing is uploaded. --- */
  async function cardCanvas(pairMode: boolean): Promise<HTMLCanvasElement> {
    const cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1350;
    const g = cv.getContext('2d')!;
    const css = getComputedStyle(document.documentElement);
    const tok = (k: string, f: string) => css.getPropertyValue(k).trim() || f;
    const bg = tok('--bg-solid', '#efe6d0'), ink = tok('--ink', '#2a1f15'), muted = tok('--muted', '#6b5a48'), bad = tok('--bad', '#a3231a'), acc = tok('--accent', '#24473a');
    const display = tok('--display', 'Georgia, serif'), body = tok('--body', 'Georgia, serif');
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = ink;
    g.font = `700 30px ${body}`; g.textBaseline = 'top';
    g.fillText('REBOUND', 60, 50);
    g.font = `400 28px ${body}`; g.fillStyle = muted;
    const sub = `${def?.name ?? ''}, ${lapse!.startYear}–${lapse!.endYear}`;
    g.fillText(sub, 1020 - g.measureText(sub).width, 52);
    g.fillStyle = ink; g.fillRect(60, 96, 960, 2);
    g.font = `700 54px ${display}`;
    wrap(g, title, 60, 120, 960, 62, 2);
    // The picture(s): the scene's renderStill (PNG; the SVG drawn as an image if the PNG is refused).
    const top = 220;
    const draw = async (v: SceneView, x: number, w: number): Promise<number> => {
      let img: CanvasImageSource | null = null;
      img = await stillImage(v, w, Math.round(w * 2 / 3));
      const hgt = Math.round(w * 2 / 3);
      if (img) g.drawImage(img, x, top, w, hgt);
      else { g.strokeStyle = muted; g.lineWidth = 2; g.strokeRect(x, top, w, hgt); }
      return hgt;
    };
    let y = top;
    const first = fr[0], last = fr[fr.length - 1];
    g.textBaseline = 'top';
    if (pairMode) {
      const hgt = await draw(views[0], 60, 470); await draw(views[views.length - 1], 550, 470);
      y += hgt + 14;
      g.font = `400 26px ${body}`; g.fillStyle = muted;
      g.fillText(`${first.y}: efficiency ${fold(first.ef)}, ${resName} ${fold(first.rf)}`, 60, y);
      g.fillText(`${last.y}: efficiency ${fold(last.ef)}, ${resName} ${fold(last.rf)}`, 550, y);
      y += 64;
    } else {
      y += await draw(views[views.length - 1], 60, 960) + 30;
    }
    // The two figures, and the two lines under them.
    g.font = `400 32px ${body}`; g.fillStyle = acc;
    g.fillText(`Efficiency ${fold(first.ef)} → ${fold(last.ef)}`, 60, y);
    g.fillStyle = bad;
    g.fillText(`${def?.resource.name ?? 'Use'} ${fold(first.rf)} → ${fold(last.rf)}`, 560, y);
    const cy = y + 60, chh = Math.max(180, 1240 - cy);
    const span = Math.max(1e-6, Math.log(hi) - Math.log(lo));
    const line = (vals: number[], col: string, wid: number) => {
      g.strokeStyle = col; g.lineWidth = wid; g.lineJoin = 'round'; g.beginPath();
      vals.forEach((v, i) => {
        const x = 60 + (i / (vals.length - 1)) * 960;
        const yy = cy + chh - ((Math.log(Math.max(v, 1e-9)) - Math.log(lo)) / span) * chh;
        if (i) g.lineTo(x, yy); else g.moveTo(x, yy);
      });
      g.stroke();
    };
    g.strokeStyle = muted; g.lineWidth = 1.5; g.setLineDash([4, 8]);
    const by = cy + chh - ((0 - Math.log(lo)) / span) * chh;
    g.beginPath(); g.moveTo(60, by); g.lineTo(1020, by); g.stroke(); g.setLineDash([]);
    g.fillStyle = muted; g.font = `400 22px ${body}`; g.fillText('×1, the start', 66, by + 6);
    line(effs, acc, 4); line(uses, bad, 6);
    g.fillStyle = muted; g.font = `400 24px ${body}`;
    g.fillText(`Run ${fmt(num(ctx.state.meta?.reckonings))} · ${lapse!.startYear} to ${lapse!.endYear} · ${fmt(lapse!.endYear - lapse!.startYear)} years`, 60, 1290);
    return cv;
  }
  async function blobOf(pairMode: boolean): Promise<Blob | null> {
    const cv = await cardCanvas(pairMode);
    return new Promise((ok) => { try { cv.toBlob((b) => ok(b), 'image/png'); } catch { ok(null); } });
  }
  async function savePicture(pairMode: boolean): Promise<void> {
    setText(status, 'Drawing…');
    try {
      const b = await blobOf(pairMode);
      if (!b) { await saveSvg(); return; }
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url; a.download = `rebound-${lapse!.sector}-${lapse!.endYear}${pairMode ? '-before-after' : ''}.png`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setText(status, 'Saved.');
    } catch { await saveSvg(); }
  }
  /** Where a PNG cannot be made (Safari may refuse to rasterise), the final picture as an SVG file instead. */
  async function saveSvg(): Promise<void> {
    try {
      const svg = await renderStill(views[views.length - 1], { width: 1200, height: 800, format: 'svg' });
      const blob = typeof svg === 'string' ? new Blob([svg], { type: 'image/svg+xml' }) : svg;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `rebound-${lapse!.sector}-${lapse!.endYear}.svg`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setText(status, 'Saved as a drawing (SVG): this browser would not make a PNG.');
    } catch { setText(status, 'This browser would not save the picture.'); }
  }
  async function share(): Promise<void> {
    try {
      const b = await blobOf(true);
      if (!b) return;
      const file = new File([b], `rebound-${lapse!.endYear}.png`, { type: 'image/png' });
      const data = { files: [file], title: 'Rebound', text: title };
      if (navigator.canShare?.(data)) await navigator.share(data);
      else setText(status, 'Sharing pictures is not offered here; save it instead.');
    } catch { /* the player cancelled, or sharing failed: nothing to say */ }
  }

  // Start once the sheet has painted (the replay never delays the summary's first frame).
  requestAnimationFrame(() => setTimeout(() => { if (!alive()) return; if (reduced) togglePair(); else play(); }, 350));
  return el;
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, lh: number, max: number): void {
  const words = text.split(/\s+/);
  let line = '', n = 0;
  for (const wd of words) {
    const t = line ? line + ' ' + wd : wd;
    if (g.measureText(t).width > w && line) { g.fillText(line, x, y + n * lh); n++; line = wd; if (n >= max) return; }
    else line = t;
  }
  if (line && n < max) g.fillText(line, x, y + n * lh);
}
function blobImage(b: Blob): Promise<HTMLImageElement> {
  return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(b); });
}

/** A still of a view as an image for the card: renderStill's PNG, or its SVG drawn as an image; null if neither works. */
async function stillImage(v: SceneView, w: number, hgt: number): Promise<CanvasImageSource | null> {
  try {
    const png = await renderStill(v, { width: w, height: hgt, format: 'png', scale: 2 });
    if (png instanceof Blob) return await blobImage(png);
  } catch { /* try the SVG */ }
  try {
    const svg = await renderStill(v, { width: w, height: hgt, format: 'svg' });
    if (typeof svg === 'string') {
      const img = new Image();
      await new Promise<void>((ok, no) => { img.onload = () => ok(); img.onerror = () => no(new Error('svg')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
      return img;
    }
  } catch { /* nothing */ }
  return null;
}
