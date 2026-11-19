// Light: the same country at dusk becoming a lit town. Night-shift mills on the left, the town climbing the hill,
// a tram street across the middle, a high street of shops in front, a canal on the right, gasholders far off whose
// bells sink as the gas runs down, and stars that go out as the light comes on.
import type { Layout, Slot } from '../layout';
import { scatter, weave, row } from '../layout';
import { P, R, C, L, f, ridge, rng, hash } from '../svg';
import { bprop, waterLines } from './util';
import { gasholder } from '../props/gaslight';
import { poplar, church } from '../props/common';
import { COUNTRY, hills, sea, viaductArches, millShells, built } from '../geography';

/** The streets that climb from the tram street up the hill: the gas mains run under them and the town builds along
 *  them, from the bottom up (bottom x, y → top x, y). */
const STREETS: [number, number, number, number][] = [[128, 292, 66, 214], [300, 292, 326, 210], [474, 292, 540, 214]];
const along = (p: string | string[], side: number, n: number, seed: string, k = 1.15) =>
  STREETS.map(([x0, y0, x1, y1], i) => row(p, x0 + side, y0 - 10, x1 + side * 0.7, y1 + 4, n, `${seed}${i}`, 0, { k }));
const SHOPS = Array.from({ length: 9 }, (_, i) => 26 + i * 38);
const POSTS = Array.from({ length: 13 }, (_, i) => i * 50);

function stars(n: number, seed: string): string {
  const r = rng(hash(seed));
  let s = '';
  for (let i = 0; i < n; i++) s += C(r() * 600, r() * 120, r() < 0.15 ? 1.1 : 0.6, 'star');
  return `<g class="starf">${s}</g>`;
}

function skyline(c: { r: () => number }, y: number): string {
  const r = rng(hash('skyline'));
  let d = '', lit = '';
  let x = 0;
  while (x < 600) {
    const w = 8 + r() * 16, h = 6 + r() * 14;
    d += `M${f(x)} ${y}V${f(y - h)}H${f(x + w)}V${y}Z`;
    if (r() < 0.25) d += `M${f(x + w / 2 - 1.2)} ${f(y - h)}V${f(y - h - 12 - r() * 8)}h2.4V${f(y - h)}Z`;
    for (let k = 0; k < 2; k++) if (r() < 0.5) lit += `M${f(x + 2 + r() * (w - 4))} ${f(y - 2 - r() * (h - 4))}h1.4v1.6h-1.4z`;
    x += w + r() * 3;
  }
  void c;
  return P(d, 'b') + P(lit, 'lit', 'opacity=".7"');
}

export const light: Layout = {
  id: 'light',
  look: 'gaslight',
  place: 'a town at dusk, lighting up',
  caption: 'The town by gaslight',
  bands: [206, 300],
  depth: [130, 0.62, 372, 1.15],

  backdrop(c) {
    const id = c.u('dusk').slice(5, -1);
    const sky =
      `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9845a" stop-opacity="0"/><stop offset=".7" stop-color="#c9845a" stop-opacity=".55"/><stop offset="1" stop-color="#e8a35e" stop-opacity=".75"/></linearGradient></defs>` +

      stars(70, 'stars') + bprop(GAS_MOON, 92, 66, 1.4, 0, c);
    // The same country as Steam (geography.ts): its hill line against the dusk, the estuary catching the last light,
    // the viaduct, and the mill town Steam built, its shells dark now or working a night shift.
    const steamBuilt = built(c.heritage, 'steam');
    const shells = millShells(Math.round(steamBuilt * 5), 198, 0.7);
    let glit = '';
    for (let i = 0; i < 9; i++) glit += `M${470 + ((i * 53) % 120)} ${166 + i * 4.4}h${8 + (i % 3) * 6}`;
    const far =
      P(hills(40, 262), 'sil0') + P(sea(40, 207), 'seaD') + P(glit, 'seaG') +
      skyline(c, 190) +
      (steamBuilt > 0.12 ? P(viaductArches(COUNTRY.viaduct[0], COUNTRY.viaduct[1], 182, 14), 'b') : '') +
      P(shells.body, 'heri') + P(shells.windows, 'heriw') +
      bprop(church, 410, 190, 0.8, 0.5, c) + bprop(poplar, 380, 192, 0.6, 0.3, c) +
      bprop(gasholder, 500, 204, 0.9, 0.3, c) + bprop(gasholder, 548, 205, 0.8, 0.8, c) + bprop(gasholder, 586, 206, 0.6, 0.5, c);
    const mid = P(ridge([[0, 204], [150, 198], [300, 206], [450, 200], [600, 206]], 400), 'b sil1') + P('M0 292H600V300H0Z', 'gd') +
      // The streets up the hill, and the gas mains under them: the lit skeleton the town grows along.
      P(STREETS.map(([x0, y0, x1, y1]) => `M${x0 - 5} ${y0}L${x1 - 2} ${y1}M${x0 + 5} ${y0}L${x1 + 2} ${y1}`).join(''), 'k k2', 'opacity=".5"') +
      P(STREETS.map(([x0, y0, x1, y1]) => `M${x0} ${y0}L${x1} ${y1}`).join('') + 'M0 289H600', 'main');
    let shops = '';
    for (const x of SHOPS) {
      const h = 34 + ((x * 7) % 13);
      const gable = (x / 38) % 2 < 1;
      shops += (gable ? P(`M${x - 19} ${332 - h}L${x} ${320 - h}L${x + 19} ${332 - h}Z`, 'rf') : R(x - 19, 328 - h, 38, 4, 'rf')) +
        R(x + 8, 318 - h, 4, 10, 'b') + R(x - 19, 332 - h, 38, h, 'b') + P(`M${x - 20} ${332 - h}h40`, 'k') +
        P(`M${x - 14} ${336 - h}h4v5h-4zM${x - 2} ${336 - h}h4v5h-4zM${x + 10} ${336 - h}h4v5h-4zM${x - 14} ${346 - h}h4v5h-4zM${x + 10} ${346 - h}h4v5h-4z`, 'w') +
        R(x - 13, 320, 26, 11, 'w');
    }
    const near =
      P('M0 330H360V372H0Z', 'gd gd2') + shops +
      P('M352 318H600V372H352Z', 'wa') + L(352, 318, 600, 318, 'k') + waterLines(360, 324, 240, 44, 26, 'canal', 'k k2') +
      `<g class="refl">${POSTS.filter((x) => x > 360).map((x) => R(x - 1.5, 330, 3, 30, 'lit', 'opacity=".35"')).join('')}</g>`;
    const cut = R(0, 372, 600, 28, 'b pave') + L(0, 372.5, 600, 372.5, 'k') + P('M0 380H600M0 390H600', 'k k2');
    return { sky, far, mid, near, cut };
  },

  plots: [
    {
      // Terraces line the three streets from the tram street up (infill), then spread across the hill (sprawl).
      key: 'town', driver: 'population', curve: 0.7,
      slots: [...weave(...along('terrace', -24, 4, 'lt-l'), ...along('terrace', 24, 4, 'lt-r')),
        ...scatter('terrace', [6, 206, 588, 30], 8, 'light-town', { from: [300, 220], gap: [46, 9], k: 1.05 })],
    },
    { key: 'homes', match: ['house'], overlayOf: 'town', overlayProp: 'terrace', slots: [], hit: [380, 196, 210, 76], site: [440, 252, 70, 8] },
    {
      key: 'night', match: ['factory-night'],
      anchor: { p: 'nightFactory', x: 112, y: 270, s: 1, v: 0.7 },
      slots: scatter('nightFactory', [14, 212, 240, 48], 5, 'light-fac', { from: [112, 250], gap: [56, 10], k: 0.95 }),
      hit: [20, 196, 170, 78],
    },
    {
      key: 'tram', match: ['tram'],
      anchor: { p: 'tramLine', x: -10, y: 292, s: 1, w: 620, band: 'mid' },
      slots: [],
      movers: [
        { p: 'tram', x0: -50, y0: 292, x1: 660, y1: 292, dur: 24, n: 2, s: 0.95, band: 'mid' },
        { p: 'tram', x0: 660, y0: 294, x1: -50, y1: 294, dur: 27, n: 2, s: 0.95, from: 0.3, band: 'mid' },
      ],
      hit: [196, 222, 180, 74],
      site: [270, 288, 60, 6],
    },
    {
      key: 'shops', match: ['sign'],
      anchor: { p: 'sign', x: SHOPS[4], y: 332, s: 1, v: 0.6 },
      slots: SHOPS.filter((_, i) => i !== 4).map((x, i): Slot => ({ p: 'sign', x, y: 332, s: 1, v: ((i * 37) % 10) / 10 }))
        .sort((p, q) => Math.abs(p.x - SHOPS[4]) - Math.abs(q.x - SHOPS[4])),
      hit: [10, 298, 330, 74],
      site: [150, 326, 50, 6],
    },
    {
      key: 'lamps', match: ['lamp'], fade: true,
      anchor: { p: 'lampPosts', x: 0, y: 360, s: 1, w: 600, h: 50, band: 'near' },
      slots: weave(
        POSTS.map((x): Slot => ({ p: 'lampGlow', x, y: 360, s: 1, band: 'near' })).sort((p, q) => Math.abs(p.x - 300) - Math.abs(q.x - 300)),
        Array.from({ length: 15 }, (_, i): Slot => ({ p: 'farLamp', x: 20 + i * 40, y: 292, s: 0.8, band: 'mid' })).sort((p, q) => Math.abs(p.x - 300) - Math.abs(q.x - 300)),
        // The gas mains climbing the streets: lamps light from the tram street upwards.
        ...along('farLamp', 0, 5, 'light-mains', 0.8),
      ),
      hit: [360, 298, 240, 74],
      site: [450, 352, 70, 8],
    },
  ],

  spares: [[260, 210, 100, 40], [360, 214, 110, 40], [180, 300, 120, 30]],

  restraint: {
    duty: { p: 'customs', x: 560, y: 316, s: 0.9 },
    cap: { p: 'permits', x: 470, y: 316, s: 0.9 },
    sufficiency: { p: 'allotments', x: 300, y: 204, s: 0.7, band: 'far' },
    substitution: { p: 'windmill', x: 40, y: 150, s: 0.8, band: 'far' },
    circularity: { p: 'kiln', x: 260, y: 205, s: 0.7, band: 'far' },
    greenSpending: { p: 'park', x: 410, y: 316, s: 0.9 },
  },
  restraintSpare: [{ p: 'notice', x: 520, y: 316 }, { p: 'notice', x: 380, y: 316 }],
  // The Commons on the tram street, where the town meets: the free library and the clock either side of Church Street,
  // allotments on the hill, bunting across the high street; a Charter's gasholder by the canal.
  commons: [{ p: '', x: 212, y: 288, band: 'mid' }, { p: '', x: 392, y: 288, band: 'mid' }, { p: '', x: 236, y: 232 }, { p: '', x: 190, y: 334, band: 'near' }],
  landmark: { p: '', x: 452, y: 286, band: 'mid' },
};

import { moon as GAS_MOON } from '../props/gaslight';
