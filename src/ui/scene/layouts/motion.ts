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
 *  junction, estate roads east from the spine into the fields, the airport road, the mall's slip road. [x0, y0, x1, y1]. */
const SPINE: [number, number, number, number][] = [[284, 186, 300, 258], [300, 266, 330, 330]];
const ESTATE: [number, number, number, number][] = [[298, 235, 604, 235], [294, 215, 604, 215]];
const MALL_RD: [number, number, number, number] = [334, 326, 452, 316];
const seg = ([x0, y0, x1, y1]: [number, number, number, number], band: 'far' | 'mid' | 'near'): Slot => ({ p: 'road', x: x0, y: y0, w: x1 - x0, h: y1 - y0, s: 1, band });
const sAt = (y: number) => 0.66 + 0.59 * (y - 120) / 252;
/** Cul-de-sacs on the fields, row by row (front edge y), each parcel turned from crop to lawn. */
const ROW = (y: number, xs: number[], seed: number): Slot[] => xs.map((x, i) => ({ p: 'close', x, y, s: sAt(y) * 1.02, w: 60, v: ((seed + i * 0.37) % 1) }));
const R1 = ROW(255, [398, 462, 526, 590], 0.1), R2 = ROW(233, [330, 392, 454, 516, 578], 0.5), R3 = ROW(213, [326, 386, 446, 506, 566], 0.8);
const R4 = ROW(294, [250, 380, 444], 0.3);

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
      // Suburbs, the story of this Industry: estate roads east from the spine, then cul-de-sacs field by field (each
      // parcel turns from crop to lawn behind a hedge), the shopping parade and a filling station on the arterial, a
      // school with its playing field, and the sprawl south of the road. Once built it stays.
      key: 'suburbs', match: ['suburb'], sprawl: true,
      anchor: R1[0],
      slots: [seg(ESTATE[0], 'mid'), { p: 'parade', x: 346, y: 256, s: sAt(256) * 1.05, v: 0.2 }, ...weave(R1.slice(1), R2.slice(0, 2)),
        { p: 'station', x: 262, y: 257, s: sAt(257) * 1.1 }, seg(ESTATE[1], 'mid'), ...weave(R2.slice(2), R3.slice(0, 3)),
        { p: 'school', x: 552, y: 294, s: sAt(294) * 1.1 }, ...weave(R3.slice(3), R4)],
      movers: [
        { p: 'car', x0: 300, y0: 236, x1: 640, y1: 236, dur: 16, n: 2, s: 0.8, band: 'mid', z: 236 },
        { p: 'car', x0: 640, y0: 216.5, x1: 296, y1: 216.5, dur: 18, n: 1, s: 0.75, from: 0.5, band: 'mid', z: 216 },
        { p: 'car', x0: 286, y0: 192, x1: 300, y1: 258, dur: 8, n: 2, s: 0.85, band: 'mid', z: 258 },
      ],
      hit: [300, 194, 300, 66],
      site: [370, 246, 60, 8],
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
      slots: [{ p: 'msign', x: 96, y: 327, s: 1, band: 'near' }, { p: 'lanes', x: -10, y: 337, s: 1, w: 620, band: 'near' }, { p: 'lanes', x: -10, y: 367, s: 1, w: 620, band: 'near' }],
      movers: [
        LANE_FWD(351, 3, 0, 9), LANE_BACK(358, 3, 0.1, 10),
        LANE_FWD(336, 3, 0.4, 8.5), LANE_BACK(343, 3, 0.45, 9.5),
        LANE_FWD(366, 2, 0.75, 8), LANE_BACK(373, 2, 0.8, 9),
      ],
      hit: [0, 326, 600, 74],
      site: [150, 348, 80, 8],
    },
    // M3: congestion as a standing queue on the motorway, from the junction outwards (1 − travel speed); and roads
    // built (the free speed up) as a new carriageway on the verge, which the queue reaches again.
    { key: 'roads', driver: 'roads', curve: 1, slots: [{ p: 'carriageway', x: -10, y: 331, s: 1, w: 620, band: 'near' }] },
    {
      key: 'jam', driver: 'congestion', curve: 1.1,
      slots: [[240, 351], [300, 358], [0, 351], [420, 358], [240, 343], [-240, 351], [540, 358], [0, 343], [300, 336], [240, 330]]
        .map(([x, y], i): Slot => ({ p: 'jam', x, y, s: 1, w: 240, v: (i * 0.31) % 1, band: 'near' })),
    },
    {
      key: 'flights', match: ['plane'],
      anchor: { p: 'airport', x: 362, y: 191, s: 1.25, w: 190, band: 'mid' },
      // Contrails accumulate over the optimistic sky as flying spreads.
      slots: weave(
        [{ p: 'jet', x: 520, y: 189.5, s: 1.1, band: 'mid' }, { p: 'jet', x: 556, y: 190, s: 1.1, band: 'mid' }, { p: 'jet', x: 588, y: 190.5, s: 1.1, band: 'mid' }],
        ([[300, 120, 160], [180, 96, 220], [420, 70, 200], [60, 132, 180], [240, 58, 240], [520, 110, 120], [120, 84, 200], [360, 40, 230]] as [number, number, number][])
          .map(([x, y, w]): Slot => ({ p: 'contrail', x, y, w, s: 1, band: 'far' })),
      ),
      movers: [{ p: 'plane', x0: 400, y0: 186, x1: 700, y1: 74, dur: 13, n: 3, s: 1.15, band: 'mid', z: 188 }],
      hit: [380, 112, 220, 84],
      site: [420, 182, 90, 6],
    },
    /* M5: Motion as Pryce runs it. The dated uses (motorway haulage, the school run, next-day delivery) and the loophole
       rungs' exempt vehicles (light trucks; the footprint rule's four-by-fours): each only in a Ministry, so none has a
       ghost before it is founded. */
    {
      key: 'haulage', match: ['motion.haulage'], noGhost: true, curve: 0.8,
      anchor: { p: 'distShed', x: 66, y: 297, s: 0.95, band: 'mid', v: 0.4 },
      slots: [{ p: 'distShed', x: 150, y: 299, s: 0.9, band: 'mid', v: 0.8 }],
      movers: [{ p: 'artic', x0: -60, y0: 366, x1: 680, y1: 366, dur: 13, n: 2, s: 1, band: 'near' }, { p: 'artic', x0: 680, y0: 373, x1: -60, y1: 373, dur: 14, n: 2, s: 1, from: 0.3, band: 'near' }],
      hit: [20, 272, 170, 30],
    },
    {
      key: 'nextDay', match: ['motion.nextDay'], noGhost: true,
      anchor: { p: 'fulfil', x: 214, y: 284, s: 0.9, band: 'mid' },
      slots: [],
      movers: [{ p: 'pickup', x0: -40, y0: 260.5, x1: 640, y1: 260.5, dur: 15, n: 3, s: 0.85, band: 'mid' }],
      hit: [170, 262, 90, 26],
    },
    {
      key: 'schoolRun', match: ['motion.schoolRun'], noGhost: true,
      anchor: { p: 'schoolGate', x: 560, y: 300, s: 0.85, band: 'mid', v: 0.3 },
      slots: [],
      movers: [{ p: 'suv', x0: 640, y0: 236, x1: 300, y1: 236, dur: 14, n: 2, s: 0.75, band: 'mid', z: 236 }],
      hit: [524, 282, 72, 22],
    },
    {
      // The first rung: vans and pick-ups counted as trucks, on every lane and on the drives.
      key: 'lightTrucks', match: ['motion.lightTrucks'], noGhost: true, curve: 0.7,
      slots: ([[410, 252], [470, 254], [342, 231], [520, 252]] as [number, number][]).map(([x, y], i): Slot => ({ p: 'pickup', x, y, s: sAt(y) * 0.9, v: (i * 0.31) % 1, flip: i % 2 === 1 })),
      movers: [LANE_FWD(336, 0, 0, 8.5), LANE_BACK(343, 0, 0, 9.5)].map((m, i) => ({ ...m, p: 'pickup', n: 2, from: 0.1 + i * 0.2 })),
    },
    {
      // The footprint rule: the larger the vehicle, the easier its target. Four-by-fours on the drives and the motorway.
      key: 'fourByFours', match: ['motion.fourByFours'], noGhost: true, curve: 0.7,
      slots: ([[440, 232], [506, 233], [370, 212], [560, 231]] as [number, number][]).map(([x, y], i): Slot => ({ p: 'suv', x, y, s: sAt(y) * 0.9, v: (i * 0.37) % 1, flip: i % 2 === 0 })),
      movers: [LANE_FWD(351, 0, 0, 9), LANE_BACK(358, 0, 0, 10)].map((m, i) => ({ ...m, p: 'suv', n: 2, from: 0.15 + i * 0.2 })),
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
    // M5: the congestion charge's gantry over the motorway.
    charge: { p: 'ccgantry', x: 470, y: 371, s: 1.5, band: 'near' },
  },
  restraintSpare: [{ p: 'notice', x: 240, y: 324 }, { p: 'notice', x: 20, y: 324 }],
  // The Commons by the arterial road: the corporation bus garage near the depots, the lido and cricket field on the
  // edge of the suburbs, bunting at the junction.
  commons: [{ p: '', x: 150, y: 296, band: 'mid' }, { p: '', x: 230, y: 298, band: 'mid' }, { p: '', x: 566, y: 300, band: 'near' }],
  steadyMovers: [{ p: 'birds', x0: -40, y0: 80, x1: 640, y1: 60, dur: 38, n: 2, s: 1, band: 'far' }],
  // M3: the cast on the verge by the motorway sign; the fuel-economy standard's heavier cars on the depot forecourt.
  figures: [{ x: 150, y: 329, s: 0.9 }, { x: 124, y: 329, s: 0.9, flip: true }, { x: 178, y: 329, s: 0.9 }, { x: 206, y: 329, s: 0.9 }, { x: 98, y: 329, s: 0.9, flip: true }, { x: 234, y: 329, s: 0.9 }],
  bite: { measure: { p: 'suvs', x: 180, y: 298, s: 0.9, band: 'mid' }, '*': { p: 'suvs', x: 180, y: 298, s: 0.9, band: 'mid' } },
};
