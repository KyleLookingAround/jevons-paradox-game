// Small deterministic helpers for building SVG markup strings. No randomness at render time: every "random" choice is
// seeded from ids, so a player's town is the same from minute to minute and between reloads.

/** FNV-1a 32-bit hash of a string. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG: returns a function giving floats in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round for markup (keeps strings short). */
export const f = (v: number): string => {
  const r = Math.round(v * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
};

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const P = (d: string, cls = '', extra = ''): string => `<path d="${d}"${cls ? ` class="${cls}"` : ''}${extra ? ' ' + extra : ''}/>`;
export const R = (x: number, y: number, w: number, h: number, cls = '', extra = ''): string =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${cls ? ` class="${cls}"` : ''}${extra ? ' ' + extra : ''}/>`;
export const C = (cx: number, cy: number, r: number, cls = '', extra = ''): string =>
  `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"${cls ? ` class="${cls}"` : ''}${extra ? ' ' + extra : ''}/>`;
export const E = (cx: number, cy: number, rx: number, ry: number, cls = '', extra = ''): string =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"${cls ? ` class="${cls}"` : ''}${extra ? ' ' + extra : ''}/>`;
export const L = (x1: number, y1: number, x2: number, y2: number, cls = 'k'): string =>
  `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" class="${cls}"/>`;
export const G = (inner: string, attrs = ''): string => `<g${attrs ? ' ' + attrs : ''}>${inner}</g>`;
export const T = (x: number, y: number, inner: string, s = 1): string =>
  `<g transform="translate(${f(x)} ${f(y)})${s !== 1 ? ` scale(${Math.round(s * 1000) / 1000})` : ''}">${inner}</g>`;

/** A grid of small rectangles (windows). */
export function grid(x: number, y: number, cols: number, rows: number, dx: number, dy: number, w: number, h: number, cls = 'w'): string {
  let d = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) d += `M${f(x + c * dx)} ${f(y + r * dy)}h${f(w)}v${f(h)}h${f(-w)}z`;
  return d ? P(d, cls) : '';
}

/** A polyline through points as a path "d". */
export function poly(pts: [number, number][], close = false): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + (close ? 'Z' : '');
}

/** A smooth closed ridge silhouette: points along the top, closed down to `bottom`. */
export function ridge(pts: [number, number][], bottom: number): string {
  if (pts.length < 2) return '';
  let d = `M${f(pts[0][0])} ${f(bottom)}L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += `C${f(mx)} ${f(y0)} ${f(mx)} ${f(y1)} ${f(x1)} ${f(y1)}`;
  }
  return d + `L${f(pts[pts.length - 1][0])} ${f(bottom)}Z`;
}

/** Interpolate two #rrggbb colours. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(lerp(ch(pa, s), ch(pb, s), clamp(t, 0, 1)));
  return '#' + hex(m(16)) + hex(m(8)) + hex(m(0));
}
const hex = (v: number) => (v < 16 ? '0' : '') + v.toString(16);

/** Escape text for attributes and text nodes. */
export function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
