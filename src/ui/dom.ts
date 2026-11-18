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
export function setStyle(el: HTMLElement | SVGElement | null | undefined, k: string, v: string): void {
  if (el && el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v);
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

export const reducedMotion = (): boolean => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};
