// Fishing (M4): the harbour at dawn, an engraving in the ledger family, with an Admiralty chart where the other
// plates have their cut-away. The same country: Steam's hill line falling to the coast, the viaduct and the mill
// stacks far off under it, the estuary opening into the bay. The quay with its market hall, smokehouses and the fish
// train; the piers and the lighthouse; the fleet in the inner harbour or out on the banks.
//
// THE RULE (the honest sea): the chart's stipple ('chart' driver) reads the fleet's catch per trip until the stock is
// surveyed, then the truth; the living sea ('world': gulls, porpoises, shoals breaking the surface) and the boats out
// ('boats') always read the true stock. The world thins while the gauge is still green.
import type { Layout, Slot } from '../layout';
import { row, scatter, weave } from '../layout';
import { P, R, L, f } from '../svg';
import { bprop, waterLines, engravedSun, ribbon } from './util';
import { church, poplar, tree } from '../props/common';
import { rails } from '../props/ledger';
import { COUNTRY, hills, viaductArches, millShells, built } from '../geography';

/** The chart: the paper under the harbour (the cut-away's height and half again). */
const CY = 358;
/** The banks on the chart: [cx, cy, rx, ry] (the shoals lie on them, densest at the heart). */
const BANKS: [number, number, number, number][] = [[300, 380, 92, 12], [480, 376, 62, 10], [130, 384, 48, 9]];

function bankShapes(): string {
  let s = '';
  for (const [cx, cy, rx, ry] of BANKS) {
    s += P(`M${cx - rx} ${cy}Q${cx - rx * 0.8} ${cy - ry * 1.3} ${cx} ${cy - ry}Q${cx + rx * 0.9} ${cy - ry * 1.2} ${cx + rx} ${cy - 1}Q${cx + rx * 0.7} ${cy + ry * 1.2} ${cx} ${cy + ry}Q${cx - rx * 0.9} ${cy + ry} ${cx - rx} ${cy}Z`, 'chb');
    s += P(`M${cx - rx * 0.55} ${cy}Q${cx} ${cy - ry * 0.7} ${cx + rx * 0.6} ${cy - 1}Q${cx} ${cy + ry * 0.6} ${cx - rx * 0.55} ${cy}Z`, 'chc');
  }
  return s;
}
/** The chart paper: border with degree ticks, the coast at its left edge with the harbour, the banks and their contours,
 *  a few soundings (shown only where they are legible: the wide picture), the title and a compass rose. */
function chart(): string {
  let ticks = '';
  for (let x = 20; x < 600; x += 20) ticks += `M${x} ${CY}v${x % 100 ? 2 : 3.6}M${x} 400v-${x % 100 ? 2 : 3.6}`;
  const snd: [number, number, string][] = [[60, 372, '9'], [96, 394, '14'], [190, 368, '22'], [252, 393, '18'], [372, 368, '31'], [410, 394, '27'], [548, 392, '38'], [580, 368, '44']];
  return R(0, CY, 600, 42, 'chp') + P(ticks, 'k k2') +
    P(`M0 ${CY + 2}Q18 ${CY + 8} 12 ${CY + 18}Q4 ${CY + 28} 16 400H0Z`, 'gd') + P(`M12 ${CY + 17}l7 -2l1 3l-7 2z`, 'k') +
    P(`M0 ${CY + 1}Q24 ${CY + 10} 30 ${CY + 22}Q34 ${CY + 32} 40 400`, 'chc') + bankShapes() +
    snd.map(([x, y, t]) => `<text x="${x}" y="${y}" class="snd">${t}</text>`).join('') +
    `<text x="36" y="${CY + 10}" class="cht">The Banks, from the Admiralty survey</text>` +
    `<g transform="translate(572 ${CY + 20})">${P('M0 -11L2 -2L11 0L2 2L0 11L-2 2L-11 0L-2 -2Z', 'b k')}${P('M0 -11L2 -2L0 0ZM11 0L2 2L0 0ZM0 11L-2 2L0 0ZM-11 0L-2 -2L0 0Z', 'd')}</g>`;
}

export const fishing: Layout = {
  id: 'fishing',
  look: 'harbour',
  place: 'a fishing harbour at dawn, with a chart of the banks',
  caption: 'The harbour at dawn, and the banks',
  bands: [190, 282],
  depth: [118, 0.42, 358, 1.1],
  chart: [20, CY + 4, 560, 36],
  surveyRun: [504, 318, 660, 214],
  card: [100, 150, 400, 250],

  backdrop(c) {
    const sky = engravedSun(540, 112, 13) +
      `<g class="nosteady">${P('M120 46c6-8 17-8 21-2c5-5 15-3 16 4c6 0 8 7 3 9H118c-6-2-5-10 2-11z', 'k k2', 'style="fill:var(--s-paper);fill-opacity:.6"')}</g>`;
    // The country (geography.ts): Steam's hill line to the coast, the viaduct and the mill stacks far off under it.
    const steam = built(c.heritage, 'steam');
    const shells = millShells(Math.max(2, Math.round(steam * 5)), 168, 0.42);
    const far =
      `<rect x="0" y="0" width="600" height="60" fill="${c.u('stip1')}" opacity=".4"/>` +
      P(hills(0, 200), 'tr', 'fill-opacity=".32"') + P(hills(0, 200).replace(/L[\d.]+ 200Z$/, ''), 'k k2') +
      P('M0 150C80 142 170 152 250 150S380 160 452 176L470 190H0Z', 'gd') + P('M0 150C80 142 170 152 250 150S380 160 452 176', 'k k2') +
      P(viaductArches(COUNTRY.viaduct[0], 330, 160, 8, 9), 'b') + L(COUNTRY.viaduct[0], 159.6, 330, 159.6, 'k') +
      P(shells.body, 'b') + bprop(church, COUNTRY.church, 150, 0.36, 0.5, c) + bprop(poplar, 180, 152, 0.34, 0.3, c) +
      // The sea: the horizon at Steam's, the bay opening below it across the whole picture.
      P(`M${COUNTRY.coastX} 120H600V190H300C360 182 420 170 ${COUNTRY.coastX} 120Z`, 'wa') + L(COUNTRY.coastX, 120.5, 600, 120.5, 'k') +
      waterLines(452, 124, 148, 60, 30, 'fs-sea') + P('M470 118l60 3l-60 2z', 'lit', 'opacity=".5"');
    const mid =
      R(0, 182, 600, 110, 'wa') + waterLines(0, 190, 600, 90, 50, 'fs-bay') + L(0, 182, 600, 182, 'k k2') +
      // The headland on the left with the fisher town climbing it; the north pier and the lighthouse on the right.
      P('M0 186C40 182 110 186 170 200S220 240 210 282H0Z', 'gd') + P('M0 186C40 182 110 186 170 200S220 240 210 282', 'k') +
      P('M0 186C40 182 110 186 170 200S220 240 210 282H0Z', 'tr', 'fill-opacity=".35"') + bprop(tree, 20, 196, 0.6, 0.4, c) + bprop(tree, 150, 204, 0.62, 0.7, c) +
      P('M380 262Q470 252 548 246L556 252Q470 262 384 270Z', 'b') + P('M384 268Q470 260 552 250', 'k k2') +
      R(546, 222, 9, 26, 'b') + P('M545 222L550.5 214L556 222Z', 'rf') + R(547.5, 216, 6, 4, 'lit') + L(540, 248, 562, 248, 'k K');
    const near =
      // The inner harbour and the quay: wall, setts, the quay railway to the valley.
      R(0, 282, 600, 76, 'wa') + waterLines(340, 290, 260, 64, 34, 'fs-inner') +
      P('M0 286H300Q340 288 370 300L380 358H0Z', 'gd') + P('M0 286H300Q340 288 370 300L380 358', 'k K') + P('M300 286Q340 288 370 300L380 358', 'hz', `fill="${c.hatch(1)}" opacity=".4"`) +
      bprop(rails, -10, 344, 1, 0.5, c, { w: 386 }) + P('M0 352H376', 'k k2') +
      // The south pier closing the inner harbour.
      P('M376 352Q470 344 590 336L600 340V346Q480 352 380 358Z', 'b') + P('M380 356Q480 350 600 342', 'k k2') +
      chart();
    return { sky, far, mid, near };
  },

  plots: [
    {
      // The fisher town on the headland, and terraces above the quay.
      key: 'town', driver: 'population', curve: 0.75,
      slots: weave(
        row('cottage', 30, 214, 110, 210, 4, 'fs-t1', 0.5, { k: 0.9 }),
        row('terrace', 60, 238, 170, 244, 3, 'fs-t2', 0.2, { k: 0.9 }),
        row('cottage', 10, 196, 80, 192, 3, 'fs-t3', 0, { k: 0.85 }),
        row('terrace', 120, 262, 200, 270, 2, 'fs-t4', 0.5, { k: 0.95 }),
        row('cottage', 120, 196, 160, 202, 2, 'fs-t5', 0, { k: 0.85 }),
      ),
    },
    /* --- The living sea: always the true stock --- */
    {
      key: 'gulls', driver: 'world', curve: 1.2,
      slots: [[470, 296], [420, 286], [520, 300], [300, 266], [560, 236], [360, 250], [250, 176], [480, 214], [600 - 40, 290], [400, 230]]
        .map(([x, y], i): Slot => ({ p: i % 3 ? 'gull' : 'gulls', x, y: y - 26, s: i % 3 ? 1.1 : 0.9, v: (i * 0.37) % 1, band: y < 282 ? 'mid' : 'near' })),
      movers: [{ p: 'gulls', x0: 280, y0: 200, x1: 660, y1: 180, dur: 30, n: 2, s: 1.2, band: 'mid', z: 300 }],
    },
    {
      key: 'porpoises', driver: 'world', curve: 2.6,
      slots: [{ p: 'porpoise', x: 330, y: 214, s: 0.7 }, { p: 'porpoise', x: 430, y: 226, s: 0.75 }, { p: 'porpoise', x: 262, y: 236, s: 0.8 }],
    },
    {
      key: 'shoalsUp', driver: 'world', curve: 1.7,
      slots: [{ p: 'shoalBreak', x: 500, y: 196, s: 0.6 }, { p: 'shoalBreak', x: 560, y: 206, s: 0.62 }, { p: 'shoalBreak', x: 430, y: 188, s: 0.55 }, { p: 'shoalBreak', x: 380, y: 204, s: 0.6 }, { p: 'shoalBreak', x: 590, y: 186, s: 0.55 }],
    },
    {
      // Boats out: working on the horizon and putting out from the harbour mouth (the fleet's activity × the true stock).
      key: 'fleetOut', driver: 'boats', curve: 0.8,
      slots: ([[480, 132], [520, 137], [566, 131], [592, 139], [500, 144], [546, 146]] as [number, number][]).map(([x, y], i): Slot => ({ p: 'smack', x, y, s: 0.3, v: (i * 0.29) % 1, band: 'far' })),
      movers: [{ p: 'smack', x0: 520, y0: 252, x1: 660, y1: 188, dur: 40, n: 3, s: 0.62, band: 'mid', z: 250 }],
    },
    {
      // The fleet tied up in the inner harbour (a moratorium, or a failed bank).
      key: 'tied', driver: 'tied', curve: 1,
      slots: [{ p: 'tiedFleet', x: 450, y: 334 }, { p: 'tiedFleet', x: 530, y: 330, k: 0.95 }, { p: 'tiedFleet', x: 412, y: 322, k: 0.9 }],
    },
    {
      // Iron's ship plate: iron-hulled steam trawlers at the quay (SceneView.fedBy).
      key: 'ironHulls', driver: 'fed', match: ['iron.shipPlate'], curve: 0.8,
      slots: [{ p: 'ironTrawler', x: 470, y: 316 }, { p: 'ironTrawler', x: 548, y: 312, k: 0.95 }],
    },
    {
      // Iron's tinplate: a cannery on the quay.
      key: 'cannery', driver: 'fed', match: ['iron.tinplate'], curve: 1,
      slots: [{ p: 'cannery', x: 300, y: 304, k: 0.9 }],
    },
    {
      key: 'survey', driver: 'surveyed', curve: 1,
      slots: [{ p: 'surveyBoat', x: 506, y: 226, s: 0.62, band: 'mid' }, { p: 'surveyTrack', x: 300, y: 388, s: 1, w: 160, band: 'near' }],
    },
    /* --- The chart: its stipple reads catch per trip until surveyed, then the truth --- */
    {
      key: 'shoals', driver: 'chart', curve: 1,
      slots: weave(
        scatter('chartShoal', [BANKS[0][0] - 80, BANKS[0][1] - 8, 160, 14], 10, 'fs-b0', { from: [BANKS[0][0], BANKS[0][1]], gap: [18, 3], band: 'near' }),
        scatter('chartShoal', [BANKS[1][0] - 52, BANKS[1][1] - 7, 104, 12], 7, 'fs-b1', { from: [BANKS[1][0], BANKS[1][1]], gap: [18, 3], band: 'near' }),
        scatter('chartShoal', [BANKS[2][0] - 40, BANKS[2][1] - 6, 80, 10], 5, 'fs-b2', { from: [BANKS[2][0], BANKS[2][1]], gap: [18, 3], band: 'near' }),
      ).map((sl) => ({ ...sl, s: 1 })),
    },
    {
      key: 'foreign', driver: 'foreign', curve: 1,
      slots: ([[350, 378], [250, 384], [520, 372], [440, 382], [212, 374], [326, 392], [560, 380], [470, 368]] as [number, number][])
        .map(([x, y], i): Slot => ({ p: 'foreignSail', x, y, s: 1.45, v: (i * 0.41) % 1, band: 'near' })),
    },
    {
      key: 'homeOnChart', driver: 'boats', curve: 0.8,
      slots: ([[300, 382], [470, 376], [140, 386], [320, 376], [282, 388], [496, 380]] as [number, number][]).map(([x, y]): Slot => ({ p: 'homeGlyph', x, y, s: 1, band: 'near' })),
    },
    {
      key: 'scar', driver: 'scar', curve: 1,
      slots: [{ p: 'scarPatch', x: 300, y: 392, s: 1, w: 170, band: 'near' }],
    },
    /* --- The applications --- */
    {
      key: 'market', match: ['fishTrain', 'fishing.freshFish'],
      anchor: { p: 'marketHall', x: 250, y: 328 },
      slots: [{ p: 'smack', x: 410, y: 346, v: 0.3 }, { p: 'smack', x: 520, y: 340, v: 0.6 }, { p: 'smack', x: 462, y: 348, v: 0.1 }, { p: 'smack', x: 570, y: 334, v: 0.9 }],
      movers: [{ p: 'fishTrain', x0: 400, y0: 344, x1: -120, y1: 344, dur: 18, n: 2, s: 1, band: 'near' }],
      hit: [190, 276, 130, 72],
    },
    {
      key: 'fry', match: ['fryer', 'fishing.friedFish'],
      anchor: { p: 'fryShop', x: 96, y: 252, band: 'mid' },
      slots: [{ p: 'fryShop', x: 150, y: 258, k: 0.9 }, { p: 'fryShop', x: 46, y: 230, k: 0.85 }, { p: 'fryShop', x: 178, y: 278, k: 0.95 }],
      hit: [50, 204, 110, 56],
    },
    {
      key: 'smoke', match: ['smokehouse', 'fishing.saltSmoked'],
      anchor: { p: 'smokehouse', x: 128, y: 328 },
      slots: [{ p: 'smokehouse', x: 150, y: 322, v: 0.6 }, { p: 'smokehouse', x: 106, y: 316, v: 0.3 }, { p: 'smokehouse', x: 172, y: 316, v: 0.9 }, { p: 'smokehouse', x: 84, y: 324, v: 0.5 }],
      hit: [70, 270, 116, 64],
    },
    {
      key: 'meal', match: ['sack', 'fishing.fishMeal'],
      anchor: { p: 'mealWorks', x: 36, y: 318 },
      slots: [],
      hit: [0, 266, 66, 58],
    },
    {
      key: 'oil', match: ['bottle', 'fishing.codLiverOil'],
      anchor: { p: 'oilWorks', x: 346, y: 300, k: 0.9 },
      slots: [],
      hit: [318, 254, 64, 52],
    },
    {
      key: 'cold', match: ['carton', 'fishing.fishFingers'],
      anchor: { p: 'coldStore', x: 206, y: 300, k: 0.85 },
      slots: [],
      hit: [178, 256, 56, 46],
    },
  ],

  spares: [[220, 300, 60, 30], [10, 300, 50, 30]],

  restraint: {
    measure: { p: 'customs', x: 30, y: 354, s: 0.95 },
    cap: { p: 'permits', x: 236, y: 355, s: 1 },
    quota: { p: 'notice', x: 300, y: 355, s: 1 },
    sufficiency: { p: 'notice', x: 190, y: 228, s: 0.85, band: 'mid' },
  },
  restraintSpare: [{ p: 'notice', x: 340, y: 354 }, { p: 'notice', x: 64, y: 354 }],
  commons: [
    { p: '', x: 70, y: 226, k: 0.9 }, { p: '', x: 140, y: 244, k: 0.9 }, { p: '', x: 30, y: 250, k: 0.9 },
    { p: '', x: 196, y: 300 }, { p: '', x: 110, y: 278 }, { p: '', x: 280, y: 300 },
  ],
  landmark: { p: '', x: 40, y: 270 },
  steadyMovers: [{ p: 'gulls', x0: -40, y0: 80, x1: 640, y1: 70, dur: 36, n: 1, s: 1.3, band: 'far' }],
  figures: [{ x: 176, y: 352 }, { x: 146, y: 353, flip: true }, { x: 206, y: 352 }, { x: 112, y: 353 }, { x: 268, y: 352, flip: true }, { x: 80, y: 353 }],
  bite: { '*': { p: 'smack', x: 584, y: 326 } },
  reserveWords: (r) => (r > 0.7 ? 'gulls thick over the fleet' : r > 0.4 ? 'fewer gulls than there were' : r > 0.15 ? 'the gulls gone quiet, no shoals breaking the surface' : 'an empty sea'),
};

void f; void ribbon;
