// Backdrop helpers shared by layouts.
import type { BackdropCtx, Prop, PropArgs } from '../layout';
import { f, rng, hash, P } from '../svg';

/** Draw a prop inside a backdrop (scenery that never changes): emitters are dropped. */
export function bprop(prop: Prop, x: number, y: number, s: number, v: number, c: BackdropCtx, extra: Partial<PropArgs> = {}, flip = false): string {
  const a: PropArgs = {
    s, v, stage: c.stage, w: 0, h: 0, r: rng(hash(`${x},${y}`)), overlay: false,
    u: c.u, hatch: (l = 0) => c.hatch(s, l), ...extra,
  };
  let inner = '';
  try { inner = prop(a, { fx: () => {} }); } catch { inner = ''; }
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${flip ? -s : s} ${s})">${inner}</g>`;
}

/** A tapering ribbon (a river) along a polyline. */
export function ribbon(pts: [number, number][], w0: number, w1: number, cls: string): string {
  const n = pts.length;
  const L: string[] = [], Rr: string[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(n - 1, i + 1)];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    const nx = -dy / len * w, ny = dx / len * w * 0.45; // flattened by perspective
    L.push(`${f(x + nx)} ${f(y + ny)}`);
    Rr.push(`${f(x - nx)} ${f(y - ny)}`);
  }
  return P(`M${L.join('L')}L${Rr.reverse().join('L')}Z`, cls);
}

/** Short horizontal strokes on water. */
export function waterLines(x: number, y: number, w: number, h: number, n: number, seed: string, cls = 'k k2 wl'): string {
  const r = rng(hash(seed));
  let d = '';
  for (let i = 0; i < n; i++) {
    const yy = y + r() * h, xx = x + r() * w, ll = 4 + r() * 12 * (0.4 + (yy - y) / h);
    d += `M${f(xx)} ${f(yy)}h${f(ll)}`;
  }
  return P(d, cls);
}

/** Grass tufts along the ground. */
export function tufts(x: number, y: number, w: number, h: number, n: number, seed: string): string {
  const r = rng(hash(seed));
  let d = '';
  for (let i = 0; i < n; i++) {
    const xx = x + r() * w, yy = y + r() * h, k = 0.6 + (yy - y) / h;
    d += `M${f(xx)} ${f(yy)}l${f(-1.2 * k)} ${f(-3 * k)}M${f(xx)} ${f(yy)}l${f(0.3 * k)} ${f(-3.6 * k)}M${f(xx)} ${f(yy)}l${f(1.6 * k)} ${f(-2.6 * k)}`;
  }
  return P(d, 'k k2');
}

/** Engraved sun with rays. */
export function engravedSun(x: number, y: number, r: number): string {
  let d = '';
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2, r0 = r + 3, r1 = r + (i % 2 ? 7 : 12);
    d += `M${f(x + Math.cos(t) * r0)} ${f(y + Math.sin(t) * r0)}L${f(x + Math.cos(t) * r1)} ${f(y + Math.sin(t) * r1)}`;
  }
  return `<g class="sunf"><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="fill:var(--s-sun);fill-opacity:.55" class="k"/>${P(d, 'k k2')}</g>`;
}

/** A flock of birds (Steady State) as one mover prop. */
export const birds: Prop = (a) => {
  let d = '';
  const r = a.r;
  for (let i = 0; i < 5; i++) {
    const x = i * 7 - 14 + r() * 3, y = -Math.abs(i - 2) * 3 - r() * 2;
    d += `M${f(x - 3)} ${f(y - 1)}Q${f(x - 1.5)} ${f(y - 2.5)} ${f(x)} ${f(y)}Q${f(x + 1.5)} ${f(y - 2.5)} ${f(x + 3)} ${f(y - 1)}`;
  }
  return P(d, 'k');
};
