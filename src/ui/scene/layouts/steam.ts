// Steam: a coal valley in Lancashire-ish country, drawn as an engraving. Pits and beam engines on the left hillside,
// mills and a mill town up the valley, a viaduct across it, a harbour opening to the sea on the right, steam ploughs
// in the foreground fields, and under it all a cut-away of the seam being emptied.
import type { Layout, Slot } from '../layout';
import { scatter, row, weave } from '../layout';
import { P, R, L, f, ridge } from '../svg';
import { bprop, ribbon, waterLines, tufts, engravedSun, birds } from './util';
import { tree, poplar, church, cottage, hedge } from '../props/common';
import { field, ford as LEDGER_FORD } from '../props/ledger';
import { hills, hills2 } from '../geography';

const SHAFT_X = 70;

/** A hedgerow along a field boundary: a bumpy engraved band, its bumps scaled with depth (s). */
function hedgerow(pts: [number, number][], s: number): string {
  let top = '', bot = '';
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (4.5 * s)));
    for (let k = 0; k < n; k++) {
      const t = (k + 1) / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const px = x0 + (x1 - x0) * (k / n), py = y0 + (y1 - y0) * (k / n);
      top += `Q${f((px + x) / 2)} ${f((py + y) / 2 - 3.6 * s - ((k * 7) % 3) * 0.5 * s)} ${f(x)} ${f(y - 0.8 * s)}`;
    }
  }
  for (let i = pts.length - 1; i >= 0; i--) bot += `L${f(pts[i][0])} ${f(pts[i][1] + 0.8 * s)}`;
  return P(`M${f(pts[0][0])} ${f(pts[0][1] - 0.8 * s)}${top}${bot}Z`, 'tr hdgr');
}
/** The old lane from the near fields down to the ford and up into the town (near and mid parts). */
const LANE_NEAR: [number, number][] = [[188, 374], [206, 350], [238, 326], [276, 300], [300, 280], [310, 266]];
const LANE_MID: [number, number][] = [[310, 266], [320, 254], [326, 246], [330, 238], [318, 226], [300, 214]];
const FIELDS: Slot[] = [
  { p: 'furrows', x: 48, y: 332, w: 66 }, { p: 'furrows', x: 205, y: 330, w: 60 }, { p: 'furrows', x: 302, y: 340, w: 58 },
  { p: 'furrows', x: 150, y: 360, w: 72 }, { p: 'furrows', x: 384, y: 356, w: 52 },
];

export const steam: Layout = {
  id: 'steam',
  look: 'ledger',
  place: 'a coal valley running down to the sea',
  caption: 'The coal valley, looking towards the sea',
  bands: [200, 264],
  depth: [110, 0.4, 372, 1.15],

  backdrop(c) {
    // The country itself (geography.ts): every later Industry is drawn on this hill line, coast and town site.
    const farRidge = hills(0, 230);
    const midRidge = hills2(0, 260);
    const valley = ridge([[0, 168], [100, 164], [200, 174], [300, 170], [400, 182], [450, 196], [470, 214], [478, 300]], 400);
    const fore = ridge([[0, 300], [120, 304], [260, 310], [380, 316], [446, 320]], 372);
    const sky =
      // Stipple sky, denser towards the top, as the engraver would lay it.
      engravedSun(512, 48, 14) +
      `<g class="nosteady">` +
      P('M60 50c6-9 18-9 22-2c5-6 16-4 17 4c7 0 9 8 3 10H58c-6-2-5-11 2-12z', 'k k2', 'style="fill:var(--s-paper);fill-opacity:.6"') +
      P('M300 30c5-7 15-7 18-1c4-5 13-3 14 3c6 0 7 7 2 8H298c-5-2-4-9 2-10z', 'k k2', 'style="fill:var(--s-paper);fill-opacity:.6"') + '</g>';
    const far =
      // Stipple sky (in a static layer, so it never repaints with the weather), denser towards the top.
      `<rect x="0" y="0" width="600" height="60" fill="${c.u('stip1')}" opacity=".5"/><rect x="0" y="60" width="600" height="50" fill="${c.u('stip2')}" opacity=".35"/>` +
      P(farRidge, 'tr', 'fill-opacity=".34"') + P(farRidge.replace(/L[\d.]+ 230Z$/, ''), 'k k2') +
      P('M448 121L600 120V222H470C462 190 458 150 448 121Z', 'wa') + L(448, 120.5, 600, 120.5, 'k') + waterLines(458, 124, 142, 74, 34, 'sea') +
      P(midRidge, 'tr', 'fill-opacity=".55"') + P(midRidge, 'hz', `fill="${c.hatch(0.4)}" opacity=".3"`) + P(midRidge.replace(/L[\d.]+ 260Z$/, ''), 'k k2') +
      P('M0 152Q60 144 120 152M150 148Q200 140 250 154M280 156Q330 150 380 164', 'k k2') +
      bprop(church, 214, 140, 0.48, 0.5, c) + bprop(poplar, 168, 136, 0.46, 0.3, c) + bprop(poplar, 177, 137, 0.44, 0.8, c) +
      bprop(cottage, 120, 144, 0.44, 0.2, c) + bprop(cottage, 300, 146, 0.44, 0.7, c) + bprop(tree, 336, 147, 0.46, 0.4, c) + bprop(tree, 366, 154, 0.48, 0.9, c);
    const mid =
      P(valley, 'gd') + P(valley, 'tr', 'fill-opacity=".45"') + P(ridge([[0, 168], [100, 164], [200, 174], [300, 170], [400, 182], [452, 197]], 400).replace(/L[\d.]+ 400Z$/, ''), 'k k2') +
      P('M455 200C480 196 500 206 530 200S580 194 600 198V320H468Z', 'gd') + P('M455 200C480 196 500 206 530 200S580 194 600 198V320H468Z', 'tr', 'fill-opacity=".3"') + P('M455 200C480 196 500 206 530 200S580 194 600 198', 'k k2') +
      ribbon([[168, 171], [215, 188], [262, 214], [310, 240], [362, 264], [410, 286], [454, 306]], 2, 18, 'wa') +
      waterLines(270, 222, 170, 70, 14, 'river', 'k k2') +
      bprop(hedge, 120, 210, 0.6, 0.5, c, { w: 70 }) + bprop(hedge, 236, 250, 0.75, 0.5, c, { w: 56 }) +
      bprop(tree, 28, 246, 0.72, 0.3, c) + bprop(tree, 226, 232, 0.68, 0.6, c) + bprop(tree, 444, 262, 0.8, 0.1, c) +
      // The old country: hedgerows on the slope, the lane down to the ford.
      hedgerow([[20, 230], [90, 236], [160, 242], [206, 240]], 0.62) + hedgerow([[340, 222], [384, 230], [430, 240]], 0.6) +
      hedgerow([[60, 252], [140, 256]], 0.72) + ribbon(LANE_MID, 5, 7, 'lane') + bprop(LEDGER_FORD, 326, 247, 0.8, 0.5, c);
    const near =
      P(fore, 'gd') + P(fore, 'tr', 'fill-opacity=".55"') + P(fore.replace(/L[\d.]+ 372Z$/, ''), 'k k2') +
      ribbon(LANE_NEAR, 9, 6, 'lane') +
      FIELDS.map((s) => bprop(field, s.x, s.y, 1, 0.5, c, { w: s.w })).join('') +
      hedgerow([[0, 318], [90, 320], [170, 322], [196, 324]], 0.95) + hedgerow([[252, 328], [330, 334], [420, 338]], 1) +
      hedgerow([[118, 324], [112, 346], [104, 372]], 1.05) + hedgerow([[262, 334], [258, 372]], 1.05) +
      bprop(tree, 92, 322, 1.05, 0.6, c) + bprop(tree, 330, 336, 1.1, 0.35, c) +
      P('M436 322Q470 314 600 317V372H426Z', 'wa') + P('M436 322Q470 314 600 317', 'k') + waterLines(442, 325, 158, 44, 30, 'basin') +
      tufts(0, 310, 436, 60, 60, 'grass') +
      bprop(tree, 12, 372, 1.6, 0.75, c) + bprop(tree, 418, 372, 1.2, 0.2, c);
    const ox = (SHAFT_X / 600 * 100).toFixed(2) + '%';
    const cut =
      R(0, 372, 600, 28, 'gd') + R(0, 372, 600, 28, 'hz', `fill="${c.hatch(0.9)}" opacity=".45"`) +
      L(0, 372, 600, 372, 'k K') + P('M0 379Q150 377 300 380T600 379M0 395Q200 393 400 396T600 395', 'k k2') +
      R(0, 384, 600, 8, 'd') +
      `<rect x="0" y="384.6" width="600" height="6.8" class="dx" style="transform-origin:${ox} 50%;fill:var(--s-paper)"/>` +
      `<rect x="0" y="384.6" width="600" height="6.8" class="dx" style="transform-origin:${ox} 50%" fill="${c.hatch(1, 1)}" opacity=".35"/>` +
      R(SHAFT_X - 1.6, 372, 3.2, 20, 'b') + L(SHAFT_X, 372, SHAFT_X, 392, 'k') + R(158, 372, 2.6, 20, 'b');
    return { sky, far, mid, near, cut };
  },

  plots: [
    {
      // The town grows in districts, each from its own heart and along its own route, infill before sprawl: the pit
      // village on the hillside by the shaft, the mill town's streets up the valley, the railway quarter facing the
      // line, and the sailors' houses above the harbour. Same order every time.
      key: 'town', driver: 'population', curve: 0.75,
      slots: weave(
        row('terrace', 236, 214, 330, 210, 3, 'steam-mt1', 0.5),                            // mill town: High Street
        row('cottage', 104, 312, 150, 314, 3, 'steam-pv1', 0, { k: 0.95 }),                 // pit village: Engine Row, by the wagonway
        row('terrace', 250, 260, 330, 262, 2, 'steam-rq1', 0.2, { k: 0.95 }),               // railway quarter: Station Road
        row('terrace', 340, 206, 430, 214, 3, 'steam-mt2', 0, { k: 0.95 }),                 // mill town: Mill Lane
        row('cottage', 486, 232, 586, 238, 4, 'steam-pt1', 0, { k: 0.95 }),                  // port: Quay Terrace
        row('terrace', 6, 300, 40, 302, 2, 'steam-pv2', 1, { k: 0.95 }),                     // pit village: Top Row
        row('cottage', 14, 244, 120, 240, 4, 'steam-pv3', 0.7, { k: 0.9 }),                // the old hamlet on the hill
        row('terrace', 150, 258, 222, 258, 2, 'steam-rq2', 1, { k: 0.95 }),                 // railway quarter
        row('terrace', 240, 196, 330, 192, 3, 'steam-mt3', 0.5, { k: 0.9 }),                // mill town: back streets
        row('cottage', 130, 190, 200, 186, 3, 'steam-sp1', 1, { k: 0.9 }),                  // sprawl up the far slope
        row('terrace', 350, 190, 430, 196, 2, 'steam-mt4', 0, { k: 0.85 }),
      ),
    },
    {
      // The valley before the pits, and what the industry displaces: sheep on the slopes and the near fields, ricks,
      // a cart in the ford, the corn mill's waterwheel, a windmill on the far hill. They fade as the coal goes (the
      // ones nearest the pits and mills first), so what is lost is seen going.
      key: 'country', driver: 'reserve', fade: true, curve: 2.2,
      slots: [
        { p: 'windmill', x: 262, y: 147, s: 0.5, band: 'far' },
        { p: 'sheep', x: 64, y: 238, k: 0.85, v: 0.8 }, { p: 'haystack', x: 404, y: 334, k: 0.9 },
        { p: 'sheep', x: 156, y: 228, k: 0.85, v: 0.3 }, { p: 'sheep', x: 352, y: 326, v: 0.6 },
        { p: 'cart', x: 330, y: 250, s: 0.72, band: 'mid' }, { p: 'waterwheel', x: 244, y: 205, s: 0.6, band: 'far' },
        { p: 'haystack', x: 94, y: 308, k: 0.9 }, { p: 'sheep', x: 222, y: 352, v: 0.95 }, { p: 'sheep', x: 40, y: 312, v: 0.1 },
      ],
    },
    {
      key: 'pump', match: ['pump'],
      anchor: { p: 'engine', x: SHAFT_X, y: 284, k: 0.92 },
      slots: scatter('engine', [0, 172, 210, 40], 3, 'steam-pumps', { from: [110, 190], gap: [64, 14], k: 0.9 }),
      hit: [24, 200, 96, 90],
    },
    {
      key: 'winder', match: ['winder'],
      anchor: { p: 'headframe', x: 162, y: 290 },
      // The wagonway carries the coal the winders raise: pit head → mills → quay, the tubs running full one way.
      slots: [{ p: 'wagonway', x: 168, y: 292, s: 1, w: 128, h: 10, band: 'near' }, { p: 'wagonway', x: 330, y: 304, s: 1, w: 120, h: 14, band: 'near' },
        ...scatter('headframe', [0, 196, 230, 70], 5, 'steam-winders', { from: [160, 250], gap: [48, 14], k: 0.95 })],
      movers: [
        { p: 'tubs', x0: 168, y0: 292, x1: 296, y1: 302, dur: 14, n: 2, s: 1, band: 'near' },
        { p: 'tubs', x0: 330, y0: 304, x1: 450, y1: 318, dur: 13, n: 2, s: 1, from: 0.3, band: 'near' },
      ],
      hit: [124, 222, 76, 76],
    },
    {
      // The smoke of the valley, engraved: plumes from the mill town and the pits, all on one wind, thickening with
      // pressure.
      key: 'smog', driver: 'pressure', curve: 1,
      slots: ([[318, 214, 150], [260, 232, 120], [384, 200, 160], [120, 206, 130], [190, 188, 170], [300, 176, 200], [40, 190, 150], [420, 168, 170]] as [number, number, number][])
        .map(([x, y, w]): Slot => ({ p: 'smogPlume', x, y, w, s: 1, band: 'far' })),
    },
    {
      key: 'spoil', driver: 'depletion', curve: 0.9,
      slots: [
        { p: 'spoil', x: 204, y: 298, v: 0.4 }, { p: 'spoil', x: 116, y: 262, v: 0.6 }, { p: 'spoil', x: 30, y: 226, v: 0.3 },
        { p: 'spoil', x: 196, y: 236, v: 0.7 }, { p: 'spoil', x: 236, y: 300, v: 0.95 }, { p: 'spoil', x: 82, y: 214, v: 0.8 },
        { p: 'spoil', x: 134, y: 204, v: 0.5 }, { p: 'spoil', x: 6, y: 268, v: 1 },
      ],
    },
    {
      key: 'mills', match: ['mill'],
      anchor: { p: 'mill', x: 312, y: 302, v: 0.75 },
      slots: weave(
        scatter('mill', [222, 186, 215, 92], 8, 'steam-mills', { from: [312, 260], gap: [52, 12], k: 0.95 }),
        scatter('chimney', [214, 184, 232, 80], 6, 'steam-stacks', { from: [300, 240], gap: [18, 8] }),
      ),
      hit: [244, 220, 130, 86],
    },
    {
      key: 'rail', match: ['train'],
      anchor: { p: 'viaduct', x: 56, y: 200, s: 0.85, w: 384 / 0.85, band: 'far' },
      slots: [
        { p: 'rails', x: -10, y: 262, s: 1, w: 620, band: 'mid' },
        { p: 'station', x: 240, y: 262, s: 0.95, band: 'mid' }, { p: 'signal', x: 120, y: 262, s: 0.95, band: 'mid' },
        { p: 'goodsShed', x: 412, y: 262, s: 0.9, band: 'mid' }, { p: 'signal', x: 376, y: 262, s: 0.95, band: 'mid' },
        { p: 'station', x: 70, y: 199, s: 0.6, band: 'far' },
      ],
      movers: [
        { p: 'train', x0: -70, y0: 174.5, x1: 480, y1: 174.5, dur: 26, n: 3, s: 0.56, band: 'far' },
        { p: 'train', x0: 690, y0: 261.6, x1: -100, y1: 261.6, dur: 18, n: 2, s: 0.92, from: 0.2, band: 'mid' },
      ],
      hit: [40, 124, 200, 76],
      site: [110, 190, 120, 9],
    },
    {
      key: 'harbour', match: ['ship'],
      anchor: { p: 'quay', x: 446, y: 320, s: 1, w: 160, band: 'near' },
      slots: weave(
        row('warehouse', 496, 318, 592, 318, 4, 'steam-wh', 0.2, { band: 'near', k: 1.05 }),
        row('ship', 472, 350, 586, 350, 4, 'steam-moored', 0.3, { band: 'near' }),
        row('crane', 478, 318, 576, 318, 3, 'steam-cranes', 0.5, { band: 'near' }),
        scatter('warehouse', [470, 204, 120, 44], 4, 'steam-wh2', { k: 0.9 }),
      ),
      movers: [
        { p: 'ship', x0: 430, y0: 156, x1: 660, y1: 150, dur: 46, n: 3, s: 0.44, band: 'far' },
      ],
      hit: [440, 196, 160, 174],
      site: [470, 306, 100, 12],
    },
    {
      key: 'plough', match: ['plough'],
      anchor: { p: 'ploughField', x: 112, y: 346, s: 1.05, w: 66 },
      slots: FIELDS.map((s) => ({ ...s, s: 1 })),
      hit: [20, 300, 200, 74],
      site: [82, 334, 60, 12],
    },
  ],

  spares: [[330, 306, 90, 40], [236, 140, 90, 30], [470, 210, 110, 46]],

  restraint: {
    duty: { p: 'customs', x: 466, y: 317, s: 0.9, band: 'near' },
    cap: { p: 'permits', x: 206, y: 300, s: 1 },
    sufficiency: { p: 'allotments', x: 302, y: 368, s: 1.05 },
    substitution: { p: 'windmill', x: 36, y: 142, s: 0.9, band: 'far' },
    circularity: { p: 'kiln', x: 254, y: 316, s: 1 },
    greenSpending: { p: 'park', x: 388, y: 370, s: 1.05 },
  },
  restraintSpare: [{ p: 'notice', x: 418, y: 330 }, { p: 'notice', x: 192, y: 368 }],
  // The Commons, where the town is: baths by the river below the mills, the institute by the station, the people's
  // park laid out on the near fields, bunting across Station Road; a Charter's landmark on the open slope by the line.
  commons: [
    { p: '', x: 276, y: 254, k: 0.95 }, { p: '', x: 232, y: 352, k: 0.95 }, { p: '', x: 196, y: 262, k: 0.95 },
    { p: '', x: 300, y: 270, band: 'mid' }, { p: '', x: 120, y: 330 }, { p: '', x: 410, y: 300 },
  ],
  landmark: { p: '', x: 392, y: 252, k: 0.9 },
  steadyMovers: [{ p: 'birds', x0: -40, y0: 70, x1: 640, y1: 56, dur: 40, n: 2, s: 1, band: 'far' }],
};

void birds; void f;
