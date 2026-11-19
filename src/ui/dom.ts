// Tiny DOM helpers. Structure is built once; updates patch in place.
type Child = Node | string | number | null | undefined | false;
type AttrVal = string | number | boolean | null | undefined | ((e: Event) => void);

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, AttrVal> | null,
  ...kids: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v as EventListener);
      else if (k === 'class') el.className = String(v);
      else if (k === 'text') el.textContent = String(v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of kids) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

/** Parse trusted, static SVG markup (our own strings only). */
export function svg(markup: string): SVGSVGElement {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as SVGSVGElement;
}

export const SVGNS = 'http://www.w3.org/2000/svg';
export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs?: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  return el;
}

export function setText(el: Element | null | undefined, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}
export function setAttr(el: Element | null | undefined, k: string, v: string | null): void {
  if (!el) return;
  if (v == null) { if (el.hasAttribute(k)) el.removeAttribute(k); }
  else if (el.getAttribute(k) !== v) el.setAttribute(k, v);
}
/** Last value written per element and property (reading the CSSOM back each time cost more than the write saved). An
 *  element's style written outside setStyle for the same property would be missed: write such properties only here. */
const styleMemo = new WeakMap<Element, Record<string, string>>();
export function setStyle(el: HTMLElement | SVGElement | null | undefined, k: string, v: string): void {
  if (!el) return;
  let m = styleMemo.get(el);
  if (!m) { m = {}; styleMemo.set(el, m); }
  if (m[k] === v) return;
  m[k] = v;
  el.style.setProperty(k, v);
}
/**
 * A bar's fill as a fraction, drawn with transform (composited; no layout) and quantised to `steps` so that a value
 * creeping every tick does not restyle every tick. The element must span its track (CSS class `fillx`).
 */
export function setFill(el: HTMLElement | null | undefined, frac: number, steps = 200): void {
  const f = Number.isFinite(frac) ? Math.min(1, Math.max(0, frac)) : 0;
  const q = Math.round(f * steps) / steps;
  snapSmall(el, q);
  setStyle(el, 'transform', `scaleX(${q.toFixed(3)})`);
}
/**
 * Eased only for a jump (perf pass 2). A bar or needle that creeps every tick restarted its CSS transition every tick,
 * so one was always running, and a running transition asks for a main-thread frame every vsync (which also restyles
 * every animated element of the picture). A move of under SNAP of its range now lands at once (class `tsnap`:
 * transition none); a jump (a purchase, a new Industry) still glides. `t` is the value as a fraction of its range.
 */
const SNAP = 0.04;
const lastT = new WeakMap<Element, number>();
export function snapSmall(el: Element | null | undefined, t: number): void {
  if (!el) return;
  const was = lastT.get(el);
  lastT.set(el, t);
  if (was === undefined || was === t) return;
  cls(el, 'tsnap', Math.abs(t - was) < SNAP);
}
export function show(el: HTMLElement | SVGElement | null | undefined, on: boolean): void {
  if (!el) return;
  if (el instanceof HTMLElement) { if (el.hidden === on) el.hidden = !on; }
  else el.style.display = on ? '' : 'none';
}
export function cls(el: Element | null | undefined, c: string, on: boolean): void {
  if (el && el.classList.contains(c) !== on) el.classList.toggle(c, on);
}
export function disable(btn: HTMLButtonElement, off: boolean): void {
  if (btn.disabled !== off) btn.disabled = off;
}

/** Reorder `parent`'s children to exactly `nodes`, moving only when needed (keeps nodes alive). */
export function syncChildren(parent: Element, nodes: Node[]): void {
  let i = 0;
  for (const n of nodes) {
    const cur = parent.childNodes[i];
    if (cur !== n) parent.insertBefore(n, cur ?? null);
    i++;
  }
  while (parent.childNodes.length > nodes.length) parent.lastChild!.remove();
}

/** The player's motion setting (html[data-motion]): true = still, false = moving, null = follow the system. */
export function motionOverride(): boolean | null {
  const m = document.documentElement.getAttribute('data-motion');
  return m === 'reduce' ? true : m === 'full' ? false : null;
}
let rmq: MediaQueryList | null | undefined;
export const reducedMotion = (): boolean => {
  const o = motionOverride();
  if (o != null) return o;
  // One MediaQueryList for the page (it is live), not a new one per call: this is asked many times per update.
  if (rmq === undefined) { try { rmq = matchMedia('(prefers-reduced-motion: reduce)'); } catch { rmq = null; } }
  return !!rmq?.matches;
};

/**
 * Restart a one-shot CSS animation carried by class `c` without forcing a synchronous layout (no offsetWidth read in
 * the handler): the class comes off now and back on in the next frame, and off again after `ms`.
 */
export function replay(el: Element | null | undefined, c: string, ms: number): void {
  if (!el) return;
  el.classList.remove(c);
  requestAnimationFrame(() => {
    el.classList.add(c);
    const t = (el as unknown as { __rp?: Record<string, number> });
    const map = t.__rp ?? (t.__rp = {});
    clearTimeout(map[c]);
    map[c] = window.setTimeout(() => el.classList.remove(c), ms);
  });
}

/**
 * Whether an element is on screen or near it (one shared IntersectionObserver; perf pass 2). Panels far down the feed
 * patch themselves only while near the screen (app.ts); `onShow` runs when one comes back into range. Without
 * IntersectionObserver everything counts as on screen.
 */
const nearScreen = new WeakMap<Element, boolean>();
const showHooks = new WeakMap<Element, () => void>();
let nearIO: IntersectionObserver | null = null;
export function watchNear(el: Element, onShow: () => void): void {
  if (typeof IntersectionObserver !== 'function') return;
  nearIO ??= new IntersectionObserver((es) => {
    for (const e of es) {
      const was = nearScreen.get(e.target);
      nearScreen.set(e.target, e.isIntersecting);
      if (e.isIntersecting && was === false) showHooks.get(e.target)?.();
    }
  }, { rootMargin: '300px 0px' });
  showHooks.set(el, onShow);
  nearIO.observe(el);
}
/** True until the observer has said otherwise (so the first paint draws everything once). */
export function isNear(el: Element): boolean { return nearScreen.get(el) !== false; }
