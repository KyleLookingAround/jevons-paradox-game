// Motion: roads spreading from a town. A depot and its vans on the arterial road, suburbs unrolling over the fields,
// a mall and its car park, an airport whose planes climb away, nodding donkeys on the oilfield, and in front a
// motorway whose lanes widen with commuting and then fill again. Under it, the oil reservoir shrinking.
import type { Layout, Slot } from '../layout';
import { scatter, weave } from '../layout';
import { P, R, L, ridge, rng, hash, f } from '../svg';
import { bprop } from './util';
import { derrick, tanks, tree, cloudPuff } from '../props/chrome';
import { gasholder } from '../props/gaslight';
import { COUNTRY, hills, sea, viaductArches, millShells, built } from '../geography';

function fields(): string {
  const r = rng(hash('motion-fields'));
  const cls = ['fd1', 'fd2', 'fd3'];
  let s = '';
  for (let row = 0; row < 5; row++) {
    const y0 = 206 + row * 20, y1 = y0 + 20;
    let x = 230 + row * -6;
    while (x < 600) {
      const w = 40 + r() * 40;
      s += P(`M${f(x)} ${y1}L${f(x + 3)} ${y0}H${f(x + w + 3)}L${f(x + w)} ${y1}Z`, cls[Math.floor(r() * 3)]);
      x += w;
    }
  }
  return s;
}

const LANE_FWD = (y: number, n: number, from: number, dur: number) => ({ p: 'car', x0: -40, y0: y, x1: 640, y1: y, dur, n, s: 1, from, band: 'near' as const });
const LANE_BACK = (y: number, n: number, from: number, dur: number) => ({ p: 'car', x0: 640, y0: y, x1: -40, y1: y, dur, n, s: 1, from, band: 'near' as const });

export const motion: Layout = {
  id: 'motion',
  look: 'chrome',
  place: 'a market town and its roads',
  caption: 'The open road',
  bands: [200, 300],
  depth: [120, 0.66, 372, 1.25],

  backdrop(c) {
    const sky = `<g class="sunf"><circle cx="492" cy="96" r="70" fill="${c.u('sunhalo')}"/>${P('M492 96m-24 0a24 24 0 1 0 48 0a24 24 0 1 0 -48 0', 'sun')}</g>`;
    const far =
      // The same country (geography.ts): the hill line, the estuary under the sun, and what the Coal and Light ages
      // left: the viaduct, disused now, the mill chimneys, the gasholders by the shore.
      P(hills(30, 260), 'hill1', `style="fill:${c.u('hillg1')}"`) + P(sea(30, 190), 'seaM') + P('M470 158h40M500 166h60M478 174h30M540 180h40', 'seaL') +
      (built(c.heritage, 'steam') > 0.12 ? P(viaductArches(COUNTRY.viaduct[0], COUNTRY.viaduct[1], 168, 12), 'heri') : '') +
      P(millShells(Math.round(built(c.heritage, 'steam') * 4), 184, 0.6).body, 'heri') +
      (built(c.heritage, 'light') > 0.12 ? bprop(gasholder, 520, 186, 0.7, 0.3, c) + bprop(gasholder, 556, 187, 0.6, 0.7, c) : '') +
      P(ridge([[0, 170], [120, 160], [260, 172], [400, 162], [600, 174]], 260), 'hill2', `style="fill:${c.u('hillg2')}"`) +
      bprop(derrick, 34, 186, 0.75, 0.2, c) + bprop(derrick, 86, 190, 0.7, 0.5, c) + bprop(derrick, 140, 188, 0.65, 0.8, c) +
      bprop(tanks, 178, 192, 0.8, 0.5, c) + bprop(tree, 230, 184, 0.7, 0.3, c) + bprop(tree, 244, 186, 0.6, 0.8, c);
    const mid =
      P('M0 186Q300 178 600 188V400H0Z', 'gd', `style="fill:${c.u('groundg')}"`) + fields() +
      R(-10, 258, 620, 8, 'road') + P('M-10 262H610', 'dash') +
      bprop(tree, 20, 300, 0.9, 0.4, c) + bprop(tree, 236, 290, 0.9, 0.7, c) + bprop(tree, 252, 292, 0.8, 0.2, c);
    const near = R(-10, 300, 620, 40, 'gd', `style="fill:${c.u('nearg')}"`) + R(-10, 326, 620, 3, 'verge');
    const cut =
      R(0, 372, 600, 28, 'stra1') + P('M0 380Q150 378 300 381T600 380', 'k k2') + R(0, 386, 600, 14, 'stra2') +
      `<path d="M20 394Q120 380 250 394Z" class="oil rx" style="transform-origin:28% 50%"/>` + P('M20 394Q120 380 250 394', 'k k2') +
      L(34, 372, 34, 388, 'k') + L(86, 372, 86, 386, 'k') + L(140, 372, 140, 388, 'k');
    const r = rng(hash('clouds'));
    const fx = [0, 1, 2].map((i) => ({ kind: 'drift' as const, x: 80 + i * 180 + r() * 40, y: 40 + r() * 40, band: 'far' as const, markup: bprop(cloudPuff, 0, 0, 1, r(), c) }));
    return { sky, far, mid, near, cut, fx };
  },

  plots: [
    { key: 'town', driver: 'population', slots: scatter('slab', [180, 150, 200, 36], 14, 'motion-town', { from: [280, 176], gap: [20, 6], k: 1.15 }) },
    {
      key: 'delivery', match: ['van'],
      anchor: { p: 'depot', x: 110, y: 254, s: 1, v: 0.6 },
      slots: [...scatter('depot', [6, 204, 210, 40], 4, 'motion-depots', { from: [110, 230], gap: [64, 10], k: 0.95 }),
        { p: 'lorry', x: 180, y: 254, s: 0.9 }, { p: 'lorry', x: 40, y: 256, s: 0.9 }],
      movers: [
        { p: 'van', x0: -40, y0: 260.5, x1: 640, y1: 260.5, dur: 20, n: 3, s: 0.85, band: 'mid' },
        { p: 'van', x0: 640, y0: 265.5, x1: -40, y1: 265.5, dur: 23, n: 2, s: 0.85, from: 0.3, band: 'mid' },
      ],
      hit: [20, 190, 180, 74],
    },
    {
      key: 'suburbs', match: ['suburb'],
      anchor: { p: 'suburb', x: 300, y: 228, k: 1.15 },
      slots: scatter('suburb', [236, 204, 364, 88], 20, 'motion-suburbs', { from: [300, 226], gap: [66, 12], k: 1.15 }),
      hit: [220, 200, 200, 76],
      site: [280, 220, 50, 8],
    },
    {
      key: 'mall', match: ['mall'],
      anchor: { p: 'mall', x: 506, y: 322, s: 1.3, band: 'near' },
      slots: ([[400, 312], [400, 322], [346, 322], [346, 312], [584, 322], [400, 302], [346, 302], [292, 322], [292, 312]] as [number, number][])
        .map(([x, y], i): Slot => ({ p: 'carpark', x, y, s: 1.2, v: (i * 0.29) % 1, band: 'near' })),
      hit: [430, 252, 170, 74],
    },
    {
      key: 'commute', match: ['car'],
      anchor: { p: 'motorway', x: -10, y: 352, s: 1, w: 620, band: 'near' },
      slots: [{ p: 'lanes', x: -10, y: 337, s: 1, w: 620, band: 'near' }, { p: 'lanes', x: -10, y: 367, s: 1, w: 620, band: 'near' }],
      movers: [
        LANE_FWD(351, 3, 0, 9), LANE_BACK(358, 3, 0.1, 10),
        LANE_FWD(336, 3, 0.4, 8.5), LANE_BACK(343, 3, 0.45, 9.5),
        LANE_FWD(366, 2, 0.75, 8), LANE_BACK(373, 2, 0.8, 9),
      ],
      hit: [0, 326, 600, 74],
      site: [150, 348, 80, 8],
    },
    {
      key: 'flights', match: ['plane'],
      anchor: { p: 'airport', x: 370, y: 196, s: 1, w: 230, band: 'far' },
      // Contrails accumulate over the optimistic sky as flying spreads.
      slots: weave(
        [{ p: 'slab', x: 458, y: 194, s: 0.6, v: 0.1, band: 'far' }, { p: 'airport', x: 400, y: 182, s: 0.6, w: 280, band: 'far' }],
        ([[300, 120, 160], [180, 96, 220], [420, 70, 200], [60, 132, 180], [240, 58, 240], [520, 110, 120], [120, 84, 200], [360, 40, 230]] as [number, number, number][])
          .map(([x, y, w]): Slot => ({ p: 'contrail', x, y, w, s: 1, band: 'far' })),
      ),
      movers: [{ p: 'plane', x0: 470, y0: 186, x1: 720, y1: 90, dur: 13, n: 3, s: 1, band: 'far' }],
      hit: [420, 120, 180, 74],
      site: [440, 186, 80, 6],
    },
  ],

  spares: [[10, 270, 120, 26], [140, 270, 90, 26], [250, 140, 120, 30]],

  restraint: {
    duty: { p: 'petrol', x: 60, y: 324, s: 1.1, band: 'near' },
    cap: { p: 'gantry', x: 300, y: 372, s: 1, band: 'near' },
    sufficiency: { p: 'cycle', x: 200, y: 324, s: 1, band: 'near' },
    substitution: { p: 'turbines', x: 160, y: 156, s: 0.9, band: 'far' },
    circularity: { p: 'scrapyard', x: 250, y: 323, s: 1, band: 'near' },
    greenSpending: { p: 'park', x: 140, y: 324, s: 0.9, band: 'near' },
  },
  restraintSpare: [{ p: 'notice', x: 240, y: 324 }, { p: 'notice', x: 20, y: 324 }],
  steadyMovers: [{ p: 'birds', x0: -40, y0: 80, x1: 640, y1: 60, dur: 38, n: 2, s: 1, band: 'far' }],
};
