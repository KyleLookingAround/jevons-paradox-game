// Plenty (M5): the farmland below the valley, seen from a low hill, 1909-2000, in the seed-catalogue style. The same
// country: the far hill line and the estuary under the sun are the valley's (geography.ts), the river that runs out to
// them crosses the fields, and the old viaduct stands faint on the horizon. The farmstead is the landmark the place
// grows out from; the fields turn from striped strips to pivot circles; the machines go horse, tractor, pivot, drip.
// Under it all, the cut-away: roots in the topsoil, the aquifer below with its water table (the reserve) falling, the
// water pumped up the well, the return flow soaking back down (thinning as the return share falls) and the water
// consumed rising off the crop as vapour (thickening): applied and consumed part company in plain sight.
import type { Layout, Slot } from '../layout';
import { scatter } from '../layout';
import { P, R, L } from '../svg';
import { ribbon } from './util';
import { COUNTRY, hills, hillCrest, sea, viaductArches, built } from '../geography';

const DY = 52; // the far features sit lower than in Steam's projection: we look up the valley from the farmland
const sAt = (y: number) => 0.6 + 0.6 * (y - 180) / 160;

/** Fields in perspective rows (front edge y), each `n` wide across [x0, x1], in an order growing out from `fromX`. */
function fields(y: number, x0: number, x1: number, n: number, fromX: number, seed: number): Slot[] {
  const w = (x1 - x0) / n, s = sAt(y);
  const out = Array.from({ length: n }, (_, i): Slot => ({ p: 'field', x: x0 + w * (i + 0.5), y, s, w: (w - 3) / s, h: (12 + (y - 236) * 0.3) / s, v: ((seed + i * 0.43) % 1) }));
  return out.sort((a, b) => Math.abs(a.x - fromX) - Math.abs(b.x - fromX));
}

export const plenty: Layout = {
  id: 'plenty',
  look: 'seed',
  place: 'the farmland below the valley',
  caption: 'Plenty',
  bands: [236, 300],
  depth: [180, 0.6, 340, 1.2],
  card: [40, 150, 416, 260],

  backdrop(c) {
    const sky = `<g class="sunf"><circle cx="500" cy="96" r="22" class="sun"/></g>`;
    const river = ribbon([[0, 232], [90, 226], [190, 230], [300, 216], [390, 204], [452, 194], [470, 190]], 10, 4, 'riv');
    const far =
      P(hills(DY, 260), 'hill1') + `<path d="${hillCrest(DY)}" class="reg" transform="translate(1 -.7)"/>` + P(sea(DY, 196), 'riv') +
      (built(c.heritage, 'steam') > 0.12 ? P(viaductArches(COUNTRY.viaduct[0], COUNTRY.viaduct[1], 170, 8), 'heri') : '') +
      P('M0 182Q300 174 600 184V260H0Z', 'gd') +
      // The far patchwork, printed in bands.
      P('M0 196H140L150 186H0ZM160 186H300L292 196H150ZM310 185H440L436 194H302Z', 'sd1') + P('M0 206H120L130 196H0ZM146 196H290L282 206H136ZM300 196H430L426 205H292Z', 'sd5') +
      P('M0 216H160L166 206H0ZM180 206H420L416 214H176Z', 'sd3') + river + P('M0 232Q200 226 300 216T470 190', 'reg', 'transform="translate(1 -.7)"');
    const mid = P('M0 236H600V300H0Z', 'gd') + P('M0 299H600', 'k k2');
    // The near field in decorative bands of crop, and the farm road.
    let bandsN = '';
    for (let i = 0; i < 6; i++) bandsN += P(`M-10 ${316 + i * 4}H610V${319.4 + i * 4}H-10Z`, i % 2 ? 'sd2' : 'sd5');
    const near = R(-10, 300, 620, 40, 'gd') + bandsN + P('M-10 306H610V313H-10Z', 'sd3') + P('M0 306H600M0 313H600', 'k k2') +
      // The well: the pump house by the farm road, its pipe down into the aquifer.
      R(196, 320, 10, 12, 'b2 k') + P('M194 320l7 -5l7 5z', 'rf');
    let roots = '';
    for (let x = 14; x < 600; x += 22) roots += `M${x} 340v6l-3 4M${x} 344l3 4`;
    const cut =
      R(0, 340, 600, 12, 'soil') + P(roots, 'root') + R(0, 352, 600, 10, 'soil2') + R(0, 362, 600, 38, 'aq0') +
      // The aquifer: its water stands to the water table, which falls with what is left (scaleY from the bottom).
      `<rect x="0" y="364" width="600" height="36" class="aq ry" fill="${c.u('sdAq')}"/>` +
      R(199, 332, 4, 64, 'mt k') + P('M201 392V346', 'seep') + P('M197 350l4 -5l4 5', 'seep') + L(0, 340, 600, 340, 'k K') +
      `<text x="8" y="383" class="sd-l">The water table</text><text x="214" y="372" class="sd-l">Pumped and applied</text>`;
    // The cut-away goes in the near band's backdrop (not `cut`, which is drawn over everything): the return flow's
    // runs and the wells are items drawn over it.
    return { sky, far, mid, near: near + cut };
  },

  plots: [
    { key: 'cottages', driver: 'population', slots: scatter('cottage', [20, 300, 170, 14], 10, 'plenty-cottages', { from: [100, 310], gap: [14, 5], k: 1 }) },
    {
      // Bread grain: the farmstead and the wheat fields growing out from it; the machine on the near field.
      key: 'bread', match: ['wheat'],
      anchor: { p: 'farmstead', x: 96, y: 330, s: 1.2, band: 'near' },
      slots: [{ p: 'machine', x: 290, y: 334, s: 1.15, band: 'near' }, ...fields(258, 0, 300, 5, 80, 0.1), ...fields(280, 0, 320, 5, 80, 0.6), ...fields(298, 120, 340, 3, 160, 0.3)],
      hit: [40, 292, 120, 46],
      site: [60, 326, 70, 8],
    },
    {
      // Fertilised fields: the merchant's store, and beet and potatoes over the land east of the farm road.
      key: 'fertilised', match: ['sack'],
      anchor: { p: 'sackStore', x: 236, y: 252, s: 0.95, band: 'mid' },
      slots: [...fields(244, 300, 600, 5, 320, 0.8), ...fields(268, 320, 600, 4, 340, 0.2)],
      hit: [200, 228, 90, 30],
    },
    {
      key: 'meat', match: ['cow'],
      anchor: { p: 'dairy', x: 430, y: 330, s: 1.15, band: 'near' },
      slots: [{ p: 'feedlot', x: 520, y: 326, s: 1.1, band: 'near' }, ...scatter('cow', [340, 302, 240, 22], 8, 'plenty-cows', { from: [430, 314], gap: [16, 5], flip: 'random', k: 1.4, band: 'near' }), { p: 'feedlot', x: 350, y: 326, s: 1.1, band: 'near' }],
      hit: [380, 296, 120, 40],
      site: [400, 326, 60, 8],
    },
    {
      key: 'orchards', match: ['orchard'],
      anchor: { p: 'packShed', x: 548, y: 228, s: 0.9, band: 'far' },
      slots: [490, 528, 566].flatMap((x, i) => [{ p: 'orchardRow', x, y: 214 + (i % 2) * 2, s: 0.75, band: 'far' as const, v: 0.3 }, { p: 'orchardRow', x: x - 30, y: 222 + (i % 2) * 2, s: 0.8, band: 'far' as const, v: 0.7 }]),
      hit: [470, 196, 130, 40],
    },
    {
      key: 'airFreight', match: ['plane'],
      anchor: { p: 'coldStore', x: 330, y: 200, s: 0.75, band: 'far' },
      slots: [],
      movers: [{ p: 'plane', x0: 320, y0: 198, x1: 660, y1: 80, dur: 14, n: 2, s: 0.9, band: 'far', z: 199 }],
      hit: [296, 182, 70, 22],
    },
    {
      key: 'biofuels', match: ['pump'],
      anchor: { p: 'distillery', x: 556, y: 300, s: 1, band: 'mid' },
      slots: [{ p: 'tanks', x: 596, y: 298, s: 0.8, band: 'mid' }],
      movers: [{ p: 'lorry', x0: 640, y0: 311, x1: -40, y1: 311, dur: 16, n: 2, s: 0.8, band: 'near', z: 311 }],
      hit: [520, 266, 80, 36],
    },
    // M5: the unlicensed wells while Pryce uses that rung: boreholes nobody meters, each with its pump-jack.
    { key: 'boreholes', driver: 'exempt', match: ['borehole'], curve: 1, slots: [{ p: 'borehole', x: 160, y: 306, s: 1.1, band: 'near' }, { p: 'borehole', x: 330, y: 304, s: 1.05, band: 'near', v: 0.7 }, { p: 'borehole', x: 470, y: 298, s: 1, band: 'mid', v: 0.3 }] },
    // The hidden flow: water soaking back to the aquifer (thinning as the return share falls) and water consumed
    // rising off the crop (thickening as it rises).
    { key: 'seep', driver: 'returnFlow', curve: 1, slots: [60, 120, 250, 310, 370, 430, 490, 550].map((x): Slot => ({ p: 'seep', x, y: 362, s: 1.2, band: 'near' })) },
    { key: 'vapour', driver: 'consumedFlow', curve: 1, slots: ([[120, 252], [250, 246], [360, 240], [60, 276], [180, 274], [460, 238], [300, 270], [540, 250]] as [number, number][]).map(([x, y]): Slot => ({ p: 'vapour', x, y: y - 6, s: sAt(y), band: 'mid' })) },
    // Nitrate: the river greening (the wash) and algae spreading over it.
    { key: 'scum', driver: 'pressure', curve: 1.4, slots: ([[60, 229], [180, 229], [300, 217], [120, 228], [390, 205], [240, 224]] as [number, number][]).map(([x, y], i): Slot => ({ p: 'scum', x, y: y + 1, s: 0.8, v: (i * 0.29) % 1, band: 'far' })) },
  ],

  spares: [[180, 316, 80, 20], [10, 236, 100, 18]],

  restraint: {
    cap: { p: 'meterBoard', x: 30, y: 338, s: 1.1, band: 'near' },
    subsidy: { p: 'grantBoard', x: 170, y: 338, s: 1.1, band: 'near' },
    sufficiency: { p: 'allotments', x: 240, y: 338, s: 0.9, band: 'near' },
    substitution: { p: 'windmill', x: 470, y: 230, s: 0.7, band: 'far' },
    charge: { p: 'meterBoard', x: 570, y: 338, s: 1.1, band: 'near', v: 0.8 },
    duty: { p: 'notice', x: 360, y: 338, s: 1, band: 'near' },
  },
  restraintSpare: [{ p: 'notice', x: 330, y: 338 }, { p: 'notice', x: 260, y: 338 }],
  commons: [{ p: '', x: 30, y: 296, band: 'mid' }, { p: '', x: 160, y: 296, band: 'mid' }],
  steadyMovers: [{ p: 'birds', x0: -40, y0: 80, x1: 640, y1: 60, dur: 38, n: 2, s: 1, band: 'far' }],
  figures: [{ x: 140, y: 338, s: 0.9 }, { x: 116, y: 338, s: 0.9, flip: true }, { x: 214, y: 338, s: 0.9 }, { x: 236, y: 338, s: 0.9 }],
  reserveWords: (r) => (r > 0.8 ? 'the water table high' : r > 0.5 ? 'the water table falling' : r > 0.2 ? 'the wells deepened' : 'the aquifer nearly dry'),
};

