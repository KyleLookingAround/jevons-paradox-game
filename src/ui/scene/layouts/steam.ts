// Steam: a coal valley in Lancashire-ish country, drawn as an engraving. Pits and beam engines on the left hillside,
// mills and a mill town up the valley, a viaduct across it, a harbour opening to the sea on the right, steam ploughs
// in the foreground fields, and under it all a cut-away of the seam being emptied.
import type { Layout, Slot } from '../layout';
import { scatter, row, weave } from '../layout';
import { P, R, L, f, ridge } from '../svg';
import { bprop, ribbon, waterLines, tufts, engravedSun, birds } from './util';
import { tree, poplar, church, cottage, hedge } from '../props/common';
import { field } from '../props/ledger';

const SHAFT_X = 70;
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
    const farRidge = ridge([[0, 108], [70, 92], [150, 104], [230, 88], [320, 100], [390, 94], [430, 108], [452, 121]], 230);
    const midRidge = ridge([[0, 138], [60, 128], [130, 142], [200, 132], [270, 146], [340, 140], [400, 152], [440, 162], [462, 180]], 260);
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
      bprop(tree, 28, 246, 0.72, 0.3, c) + bprop(tree, 226, 232, 0.68, 0.6, c) + bprop(tree, 444, 262, 0.8, 0.1, c);
    const near =
      P(fore, 'gd') + P(fore, 'tr', 'fill-opacity=".55"') + P(fore.replace(/L[\d.]+ 372Z$/, ''), 'k k2') +
      FIELDS.map((s) => bprop(field, s.x, s.y, 1, 0.5, c, { w: s.w })).join('') +
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
      key: 'town', driver: 'population',
      slots: weave(
        scatter('terrace', [150, 178, 290, 62], 18, 'steam-town', { from: [262, 200], gap: [36, 9] }),
        scatter(['cottage'], [8, 240, 100, 18], 2, 'steam-town2', { from: [100, 246], gap: [30, 8] }),
      ),
    },
    {
      key: 'pump', match: ['pump'],
      anchor: { p: 'engine', x: SHAFT_X, y: 284, s: 1.1 },
      slots: scatter('engine', [0, 172, 210, 40], 3, 'steam-pumps', { from: [110, 190], gap: [64, 14], k: 0.9 }),
      hit: [20, 196, 100, 92],
    },
    {
      key: 'winder', match: ['winder'],
      anchor: { p: 'headframe', x: 162, y: 290, s: 1.05 },
      slots: scatter('headframe', [0, 196, 230, 70], 5, 'steam-winders', { from: [160, 250], gap: [48, 14], k: 0.95 }),
      hit: [128, 230, 70, 64],
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
      anchor: { p: 'mill', x: 312, y: 302, v: 0.75, s: 1.05 },
      slots: weave(
        scatter('mill', [222, 186, 215, 92], 8, 'steam-mills', { from: [312, 260], gap: [52, 12], k: 0.95 }),
        scatter('chimney', [214, 184, 232, 80], 6, 'steam-stacks', { from: [300, 240], gap: [18, 8] }),
      ),
      hit: [250, 222, 124, 84],
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
      hit: [60, 150, 210, 46],
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
      hit: [20, 312, 200, 56],
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
  steadyMovers: [{ p: 'birds', x0: -40, y0: 70, x1: 640, y1: 56, dur: 40, n: 2, s: 1, band: 'far' }],
};

void birds; void f;
