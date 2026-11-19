// M3: the seam ladder in the cut-away under the ground (Steam's seams; Iron shares the same cut-away in M4). A
// reusable drawing: the strata under a pit, each seam a band of coal, deeper ones darker and thinner, the shaft going
// down through the rock to every seam sunk, a lit gallery along the seam being worked, the worked-out ones hollow,
// and the next seam's shaft dotted while it is within reach. The engine toggles the classes per seam (`sm:<i>` keys:
// sunk, work, out, next) from SceneView.seams; nothing here moves.
import { P, R, C, L, f } from '../svg';

export interface SeamSectionOpts {
  /** Number of LADDER seams (the original bed is drawn above them as seam 0). */
  total: number;
  /** Shaft x (the pumping engine's pit). */
  shaftX: number;
  /** Top (the ground line) and bottom of the cut-away. */
  y0: number; y1: number;
  /** Width of the picture (default 600). */
  w?: number;
  /** Hatch fill for the rock (a `url(#…)`), and a denser one for the deepest strata. */
  rock: string; rock2: string;
  /** The style's glow gradient (a `url(#…)`), for the gallery lamps. */
  glow: string;
}

/** Where seam i (0 = the bed) lies: [top y, thickness]. Deeper seams sit closer together and are thinner. */
export function seamRows(total: number, y0: number, y1: number): [number, number][] {
  const n = Math.max(1, total + 1);
  const top = y0 + 2.5, bot = y1 - 1.5;
  // Gaps shrink with depth (a section is drawn with the upper measures opened out).
  const wts = Array.from({ length: n }, (_, i) => 1.25 - (0.5 * i) / Math.max(1, n - 1));
  const sum = wts.reduce((a, b) => a + b, 0);
  const rows: [number, number][] = [];
  let y = top;
  for (let i = 0; i < n; i++) {
    const pitch = ((bot - top) * wts[i]) / sum;
    const h = Math.max(1.6, pitch * 0.68);
    rows.push([y + (pitch - h) * 0.35, h]);
    y += pitch;
  }
  return rows;
}

export function seamSection(o: SeamSectionOpts): string {
  const w = o.w ?? 600;
  // The strata stop short of the plate's inner rule (y1 − 7 in Steam's plate); the rock runs on below.
  const rows = seamRows(o.total, o.y0, o.y1 - 7);
  const n = rows.length;
  // The rock: ground colour, hatched, the deeper half cross-hatched; bedding lines between the seams.
  let s = R(0, o.y0, w, o.y1 - o.y0, 'gd') + R(0, o.y0, w, o.y1 - o.y0, 'hz', `fill="${o.rock}" opacity=".45"`);
  const mid = rows[Math.floor(n / 2)];
  s += R(0, mid[0], w, o.y1 - mid[0], 'hz', `fill="${o.rock2}" opacity=".3"`);
  s += L(0, o.y0, w, o.y0, 'k K');
  let bed = '';
  rows.forEach(([y, h], i) => {
    if (i === 0) return;
    const yy = y - 1.1;
    bed += `M0 ${f(yy)}Q${f(w * 0.25)} ${f(yy - 0.6)} ${f(w * 0.5)} ${f(yy + 0.3)}T${f(w)} ${f(yy)}`;
    void h;
  });
  s += P(bed, 'k k2');
  let prevBot = o.y0;
  rows.forEach(([y, h], i) => {
    const depth = n > 1 ? i / (n - 1) : 0;
    // The coal band, darker with depth.
    let g = R(0, y, w, h, 'd cb', `opacity="${(0.72 + 0.28 * depth).toFixed(2)}"`);
    // Worked out / being worked: the seam hollows from the shaft (paper, with a few pit props standing in it).
    // The workings reach from a little behind the shaft to under the mills, never the whole valley.
    const wx0 = Math.max(0, o.shaftX - 60), wx1 = Math.min(w, o.shaftX + 250);
    const wox = (((o.shaftX - wx0) / (wx1 - wx0)) * 100).toFixed(2) + '%';
    g += `<rect x="${f(wx0)}" y="${f(y + 0.25)}" width="${f(wx1 - wx0)}" height="${f(Math.max(0.6, h - 0.5))}" class="sx" style="transform-origin:${wox} 50%;fill:var(--s-paper)"/>`;
    let props = '';
    for (let k = -3; k <= 12; k++) if (k) props += `M${f(o.shaftX + k * 14)} ${f(y + 0.3)}v${f(Math.max(0.6, h - 0.6))}`;
    g += P(props, 'k k2 pp');
    // The shaft from the seam above (or the ground) down to this one; and the dotted shaft of the next seam.
    g += R(o.shaftX - 1.5, prevBot, 3, y + h - prevBot, 'b shf') + P(`M${f(o.shaftX - 1.5)} ${f(prevBot)}V${f(y + h)}M${f(o.shaftX + 1.5)} ${f(prevBot)}V${f(y + h)}`, 'k shf');
    g += P(`M${f(o.shaftX)} ${f(prevBot)}V${f(y + h)}`, 'k K nxs', 'stroke-dasharray="1.6 1.8"') + C(o.shaftX, y + h / 2, 1.6, 'k nxs', 'style="fill:var(--s-sv)"');
    // The gallery being worked: lamps along the seam either side of the shaft (a glow and a lit point each).
    let lamps = '';
    for (let k = -4; k <= 4; k++) if (k) { const x = o.shaftX + k * 9 + (k > 0 ? 3 : -3); lamps += C(x, y + h / 2, Math.max(1.2, h * 0.75), 'gal gl', `fill="${o.glow}"`) + C(x, y + h / 2, 0.55, 'gal lit'); }
    g += lamps;
    s += `<g class="sm sm${i}" data-k="sm:${i}">${g}</g>`;
    prevBot = y + h;
  });
  return s;
}
