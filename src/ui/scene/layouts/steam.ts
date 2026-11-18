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
  { p: 'furrows', x: 46, y: 346, w: 64 }, { p: 'furrows', x: 205, y: 344, w: 60 }, { p: 'furrows', x: 300, y: 352, w: 56 },
  { p: 'furrows', x: 150, y: 366, w: 70 }, { p: 'furrows', x: 380, y: 364, w: 52 },
];

export const steam: Layout = {
  id: 'steam',
  look: 'ledger',
  place: 'a coal valley running down to the sea',
  bands: [246, 316],
  depth: [190, 0.42, 372, 1],

  backdrop(c) {
    const farRidge = ridge([[0, 170], [60, 152], [130, 163], [200, 147], [280, 160], [350, 150], [410, 168], [450, 190], [470, 201]], 270);
    const midRidge = ridge([[0, 199], [50, 189], [120, 201], [190, 191], [250, 205], [310, 199], [370, 211], [420, 216], [452, 238], [466, 256]], 300);
    const valley = ridge([[0, 236], [90, 232], [180, 240], [290, 236], [380, 244], [440, 254], [468, 272], [478, 334]], 400);
    const fore = ridge([[0, 322], [120, 326], [260, 331], [380, 335], [445, 340]], 372);
    const sky =
      engravedSun(512, 62, 15) +
      `<g class="nosteady">` +
      P('M60 70c6-9 18-9 22-2c5-6 16-4 17 4c7 0 9 8 3 10H58c-6-2-5-11 2-12z', 'k k2', 'fill="var(--s-paper)" fill-opacity=".6"') +
      P('M300 46c5-7 15-7 18-1c4-5 13-3 14 3c6 0 7 7 2 8H298c-5-2-4-9 2-10z', 'k k2', 'fill="var(--s-paper)" fill-opacity=".6"') + '</g>';
    const far =
      P(farRidge, 'tr', 'fill-opacity=".38"') + P(farRidge, 'hz', `fill="${c.hatch(0.3)}" opacity=".35"`) + P(farRidge.replace(/L\d+(\.\d+)? 270Z$/, ''), 'k k2') +
      R(430, 199.5, 170, 75, 'wa') + L(430, 199.5, 600, 199.5, 'k') + waterLines(440, 203, 160, 60, 40, 'sea') +
      P(midRidge, 'tr', 'fill-opacity=".6"') + P(midRidge, 'hz', `fill="${c.hatch(0.35)}" opacity=".45"`) +
      P('M0 214Q60 206 120 214M150 210Q200 202 250 214M280 214Q330 208 380 220', 'k k2') +
      bprop(church, 214, 197, 0.42, 0.5, c) + bprop(poplar, 168, 194, 0.42, 0.3, c) + bprop(poplar, 176, 195, 0.4, 0.8, c) +
      bprop(cottage, 120, 201, 0.4, 0.2, c) + bprop(cottage, 300, 200, 0.4, 0.7, c) + bprop(tree, 330, 203, 0.4, 0.4, c) + bprop(tree, 360, 208, 0.42, 0.9, c);
    const mid =
      P(valley, 'gd') + P(valley, 'tr', 'fill-opacity=".42"') + P('M0 236C90 232 180 240 290 236S440 254 468 272L478 334', 'k k2') +
      P('M455 262L600 258V340H470Z', 'gd') + P('M455 262L600 258V340H470Z', 'tr', 'fill-opacity=".3"') +
      ribbon([[150, 237], [205, 248], [255, 262], [300, 280], [350, 300], [410, 322], [456, 340]], 2, 16, 'wa') +
      waterLines(260, 268, 170, 60, 14, 'river', 'k k2') +
      bprop(hedge, 120, 262, 0.55, 0.5, c, { w: 60 }) + bprop(hedge, 230, 300, 0.7, 0.5, c, { w: 50 }) +
      bprop(tree, 30, 300, 0.62, 0.3, c) + bprop(tree, 222, 280, 0.6, 0.6, c) + bprop(tree, 440, 300, 0.66, 0.1, c);
    const near =
      P(fore, 'gd') + P(fore, 'tr', 'fill-opacity=".5"') + P('M0 322C120 326 260 331 380 335L445 340', 'k k2') +
      FIELDS.map((s) => bprop(field, s.x, s.y, 1, 0.5, c, { w: s.w })).join('') +
      P('M434 340Q470 334 600 337V372H426Z', 'wa') + P('M434 340Q470 334 600 337', 'k') + waterLines(440, 343, 160, 27, 26, 'basin') +
      tufts(0, 330, 440, 40, 70, 'grass') +
      bprop(tree, 12, 372, 1.45, 0.75, c) + bprop(tree, 420, 372, 1.1, 0.2, c);
    // The cut-away: strata and the seam, emptied outward from the shaft as the reserve falls.
    const ox = (SHAFT_X / 600 * 100).toFixed(2) + '%';
    const cut =
      R(0, 372, 600, 28, 'gd') + R(0, 372, 600, 28, 'hz', `fill="${c.hatch(0.9)}" opacity=".5"`) +
      L(0, 372, 600, 372, 'k K') + P('M0 379Q150 377 300 380T600 379M0 395Q200 393 400 396T600 395', 'k k2') +
      R(0, 384, 600, 8, 'd') +
      `<rect x="0" y="384.6" width="600" height="6.8" class="dx" style="transform-origin:${ox} 50%;fill:var(--s-paper)"/>` +
      `<rect x="0" y="384.6" width="600" height="6.8" class="dx" style="transform-origin:${ox} 50%" fill="${c.hatch(1, 1)}" opacity=".35"/>` +
      R(SHAFT_X - 1.6, 372, 3.2, 20, 'b') + L(SHAFT_X, 372, SHAFT_X, 392, 'k') + R(148, 372, 2.6, 20, 'b');
    return { sky, far, mid, near, cut };
  },

  plots: [
    {
      key: 'town', driver: 'population',
      slots: weave(
        scatter('terrace', [150, 238, 300, 52], 22, 'steam-town', { from: [250, 262], gap: [30, 7] }),
        scatter(['cottage', 'terrace'], [10, 300, 120, 12], 4, 'steam-town2', { from: [100, 306], gap: [24, 6] }),
      ),
    },
    {
      key: 'pump', match: ['pump'],
      anchor: { p: 'engine', x: SHAFT_X, y: 302, s: 1 },
      slots: scatter('engine', [8, 238, 190, 44], 5, 'steam-pumps', { from: [100, 270], gap: [40, 8], k: 0.95 }),
      hit: [22, 226, 96, 80],
    },
    {
      key: 'winder', match: ['winder'],
      anchor: { p: 'headframe', x: 150, y: 306, s: 0.95 },
      slots: scatter('headframe', [6, 240, 205, 52], 8, 'steam-winders', { from: [150, 290], gap: [26, 7], k: 0.95 }),
      hit: [120, 252, 62, 56],
    },
    {
      key: 'spoil', driver: 'depletion', curve: 0.9,
      slots: [
        { p: 'spoil', x: 196, y: 316, v: 0.4 }, { p: 'spoil', x: 112, y: 286, v: 0.6 }, { p: 'spoil', x: 30, y: 262, v: 0.3 },
        { p: 'spoil', x: 186, y: 262, v: 0.7 }, { p: 'spoil', x: 228, y: 318, v: 0.95 }, { p: 'spoil', x: 80, y: 250, v: 0.8 },
        { p: 'spoil', x: 130, y: 248, v: 0.5 }, { p: 'spoil', x: 4, y: 290, v: 1 },
      ],
    },
    {
      key: 'mills', match: ['mill'],
      anchor: { p: 'mill', x: 312, y: 322, v: 0.75 },
      slots: weave(
        scatter('mill', [225, 246, 210, 60], 9, 'steam-mills', { from: [312, 300], gap: [46, 8], k: 0.95 }),
        scatter('chimney', [215, 244, 230, 50], 7, 'steam-stacks', { from: [300, 290], gap: [16, 6] }),
      ),
      hit: [258, 262, 112, 64],
    },
    {
      key: 'rail', match: ['train'],
      anchor: { p: 'viaduct', x: 24, y: 247, s: 0.7, w: 400 / 0.7, band: 'far' },
      slots: [
        { p: 'rails', x: -10, y: 297, s: 1, w: 620, band: 'mid' },
        { p: 'station', x: 238, y: 296, s: 0.85, band: 'mid' }, { p: 'signal', x: 120, y: 296, s: 0.85, band: 'mid' },
        { p: 'goodsShed', x: 410, y: 296, s: 0.8, band: 'mid' }, { p: 'signal', x: 372, y: 296, s: 0.85, band: 'mid' },
        { p: 'station', x: 40, y: 246, s: 0.55, band: 'far' },
      ],
      movers: [
        { p: 'train', x0: -70, y0: 225.3, x1: 470, y1: 225.3, dur: 26, n: 3, s: 0.5, band: 'far' },
        { p: 'train', x0: 680, y0: 296.6, x1: -90, y1: 296.6, dur: 19, n: 2, s: 0.82, from: 0.2, band: 'mid' },
      ],
      hit: [40, 196, 230, 36],
      site: [100, 236, 120, 8],
    },
    {
      key: 'harbour', match: ['ship'],
      anchor: { p: 'quay', x: 446, y: 336, s: 1, w: 160, band: 'near' },
      slots: weave(
        row('warehouse', 495, 334, 590, 334, 4, 'steam-wh', 0.2, { band: 'near' }),
        row('ship', 470, 362, 585, 362, 4, 'steam-moored', 0.3, { band: 'near' }),
        row('crane', 478, 334, 575, 334, 3, 'steam-cranes', 0.5, { band: 'near' }),
        scatter('warehouse', [470, 262, 120, 30], 4, 'steam-wh2', { k: 0.9 }),
      ),
      movers: [
        { p: 'ship', x0: 430, y0: 232, x1: 650, y1: 226, dur: 46, n: 3, s: 0.42, band: 'far' },
      ],
      hit: [440, 252, 160, 118],
      site: [470, 322, 100, 12],
    },
    {
      key: 'plough', match: ['plough'],
      anchor: { p: 'ploughField', x: 110, y: 360, s: 1, w: 66 },
      slots: FIELDS.map((s) => ({ ...s, s: 1 })),
      hit: [20, 326, 200, 46],
      site: [80, 350, 60, 12],
    },
  ],

  spares: [[330, 324, 90, 34], [236, 200, 90, 30], [470, 266, 110, 40]],

  restraint: {
    duty: { p: 'customs', x: 466, y: 333, s: 0.85, band: 'near' },
    cap: { p: 'permits', x: 205, y: 322, s: 0.9 },
    sufficiency: { p: 'allotments', x: 300, y: 366, s: 1 },
    substitution: { p: 'windmill', x: 36, y: 214, s: 0.8, band: 'far' },
    circularity: { p: 'kiln', x: 252, y: 336, s: 0.9 },
    greenSpending: { p: 'park', x: 386, y: 366, s: 1 },
  },
  restraintSpare: [{ p: 'notice', x: 418, y: 344 }, { p: 'notice', x: 190, y: 366 }],
  steadyMovers: [{ p: 'birds', x0: -40, y0: 96, x1: 640, y1: 80, dur: 40, n: 2, s: 1, band: 'far' }],
};

void birds; void f;
