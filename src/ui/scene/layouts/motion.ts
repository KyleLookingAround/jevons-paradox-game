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

/** The road network the place grows along: the spine from the old town down to the arterial and on to the motorway
 *  junction, avenues out into the fields for the suburbs, the airport road, the mall's slip road. [x0, y0, x1, y1]. */
const SPINE: [number, number, number, number][] = [[284, 186, 300, 258], [300, 266, 330, 330]];
const AVENUES: [number, number, number, number][] = [[340, 258, 304, 212], [392, 258, 452, 212], [512, 258, 586, 222], [304, 212, 420, 204]];
const AIRPORT_RD: [number, number, number, number] = [470, 258, 470, 200];
const MALL_RD: [number, number, number, number] = [334, 326, 452, 316];
const seg = ([x0, y0, x1, y1]: [number, number, number, number], band: 'far' | 'mid' | 'near'): Slot => ({ p: 'road', x: x0, y: y0, w: x1 - x0, h: y1 - y0, s: 1, band });
/** Closes of houses both sides of an avenue, from the arterial outwards. */
const closes = (n: number) => AVENUES.flatMap(([x0, y0, x1, y1], i) => [-1, 1].map((sd) => {
  const ox = sd * (i === 3 ? 0 : 30), oy = i === 3 ? sd * 9 : 0;
  return Array.from({ length: n }, (_, k): Slot => {
    const t = (k + 0.6) / n;
    return { p: 'suburb', x: x0 + (x1 - x0) * t + ox, y: y0 + (y1 - y0) * t + oy - 2, k: 1.1, v: ((i * 7 + k * 3 + (sd > 0 ? 1 : 0)) % 10) / 10 };
  });
}));

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
      // The spine road exists from the start: the old town's road down to the arterial.
      key: 'spine', driver: 'always', slots: [seg(SPINE[0], 'mid')],
    },
    {
      // Suburbs: the avenues are laid first, then closes of houses fill both sides from the arterial outwards, then
      // the crescent along the top, then the sprawl beyond. Commuters drive down the avenues to the arterial.
      key: 'suburbs', match: ['suburb'],
      anchor: { p: 'suburb', x: 318, y: 240, k: 1.1 },
      slots: [...AVENUES.map((a) => seg(a, 'mid')), ...weave(...closes(3)),
        ...scatter('suburb', [236, 270, 364, 24], 6, 'motion-suburbs', { from: [400, 280], gap: [66, 10], k: 1.15 })],
      movers: [
        { p: 'car', x0: 452, y0: 212, x1: 392, y1: 258, dur: 9, n: 2, s: 0.85, band: 'mid', z: 258 },
        { p: 'car', x0: 304, y0: 212, x1: 340, y1: 258, dur: 8, n: 2, s: 0.85, band: 'mid', z: 258 },
        { p: 'car', x0: 586, y0: 222, x1: 512, y1: 258, dur: 10, n: 1, s: 0.85, band: 'mid', z: 258 },
      ],
      hit: [220, 200, 200, 76],
      site: [280, 220, 50, 8],
    },
    {
      key: 'mall', match: ['mall'],
      anchor: { p: 'mall', x: 506, y: 322, s: 1.3, band: 'near' },
      slots: [seg(SPINE[1], 'near'), seg(MALL_RD, 'near'), ...([[400, 312], [400, 322], [346, 322], [346, 312], [584, 322], [400, 302], [346, 302], [292, 322], [292, 312]] as [number, number][])
        .map(([x, y], i): Slot => ({ p: 'carpark', x, y, s: 1.2, v: (i * 0.29) % 1, band: 'near' }))],
      // Shoppers come off the motorway junction, up the slip road to the car park.
      movers: [{ p: 'car', x0: 300, y0: 336, x1: 452, y1: 318, dur: 9, n: 2, s: 1, band: 'near', z: 330 }],
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
        [seg(AIRPORT_RD, 'mid'), { p: 'slab', x: 458, y: 194, s: 0.6, v: 0.1, band: 'far' }, { p: 'airport', x: 400, y: 182, s: 0.6, w: 280, band: 'far' }],
        ([[300, 120, 160], [180, 96, 220], [420, 70, 200], [60, 132, 180], [240, 58, 240], [520, 110, 120], [120, 84, 200], [360, 40, 230]] as [number, number, number][])
          .map(([x, y, w]): Slot => ({ p: 'contrail', x, y, w, s: 1, band: 'far' })),
      ),
      movers: [{ p: 'plane', x0: 470, y0: 186, x1: 720, y1: 90, dur: 13, n: 3, s: 1, band: 'far' },
        { p: 'car', x0: 470, y0: 258, x1: 470, y1: 202, dur: 7, n: 2, s: 0.75, band: 'mid', z: 230 }],
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
  // The Commons by the arterial road: the corporation bus garage near the depots, the lido and cricket field on the
  // edge of the suburbs, bunting at the junction.
  commons: [{ p: '', x: 150, y: 296, band: 'mid' }, { p: '', x: 230, y: 298, band: 'mid' }, { p: '', x: 566, y: 300, band: 'near' }],
  steadyMovers: [{ p: 'birds', x0: -40, y0: 80, x1: 640, y1: 60, dur: 38, n: 2, s: 1, band: 'far' }],
};
