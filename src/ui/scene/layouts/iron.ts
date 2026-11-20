// Iron & Steel (M4): Ravensdale by night, a foundry lithograph. The same country as Steam's plate seen from the works
// across the valley: the hill line and the viaduct far off (the mill town's stacks under it), the blast furnaces in a
// row with their glow plates, the rolling mills, the goods yard whose lettered wagons leave the frame for the
// Industries Iron feeds (the order book), the canal in front, slag heaps tipped on the ground over Steam's coal (the
// cut-away is Steam's seam section, hollowed by both draws).
import type { Layout, Slot } from '../layout';
import { row, scatter, weave } from '../layout';
import { P, R, C, L, f, rng, hash } from '../svg';
import { bprop, tufts, birds } from './util';
import { church, poplar } from '../props/common';
import { rails } from '../props/ledger';
import { blastFurnace, converter, hearthShop, canal } from '../props/foundry';
import { COUNTRY, hills, hills2, viaductArches, millShells, built } from '../geography';
import { seamSection } from '../props/strata';

/** The furnace row (x at the foot; y the casting floor). */
const FURNACES = [70, 120, 170, 220];
const FY = 262, FS = 0.82;

function stars(n: number, seed: string): string {
  const r = rng(hash(seed));
  let d = '';
  for (let i = 0; i < n; i++) { const x = r() * 600, y = 14 + r() * 80, k = r() < 0.2 ? 0.9 : 0.5; d += `M${f(x - k)} ${f(y)}h${f(2 * k)}M${f(x)} ${f(y - k)}v${f(2 * k)}`; }
  return P(d, 'str', 'style="stroke:#efe2c4;stroke-width:.6px"');
}

export const iron: Layout = {
  id: 'iron',
  look: 'foundry',
  place: 'an ironworks by night across the valley from the pits',
  caption: 'Ravensdale, by night',
  bands: [205, 282],
  depth: [110, 0.4, 372, 1.15],
  crisisNames: ['The Orange Night', 'The Slag Slide'],
  card: [30, 120, 448, 280],

  backdrop(c) {
    const valley = 'M0 214C80 206 160 214 240 210S400 220 452 226L600 228V400H0Z';
    const fore = 'M0 288C120 284 260 290 380 286S540 290 600 288V372H0Z';
    const sky = stars(46, 'iron-stars') +
      // A crescent moon over the hill, engraved.
      `<g class="sunf">${P('M86 40A13 13 0 1 0 100 58A10 10 0 1 1 86 40Z', 'k', 'style="fill:var(--s-sun);fill-opacity:.85"')}</g>`;
    // The far country: Steam's hill line and its viaduct, the mill town's stacks lit under it, the sea beyond the coast.
    const steam = built(c.heritage, 'steam');
    const shells = millShells(Math.max(2, Math.round(steam * 6)), 204, 0.55);
    const far =
      `<rect x="0" y="0" width="600" height="70" fill="${c.u('stip1')}" opacity=".55"/><rect x="0" y="70" width="600" height="50" fill="${c.u('stip2')}" opacity=".3"/>` +
      P(hills(8, 240), 'hl1') +
      P(`M${COUNTRY.coastX} 128H600V214H470C462 190 458 156 ${COUNTRY.coastX} 128Z`, 'wa') + P('M470 140h30M520 150h44M486 168h22M540 178h30', 'k wl') +
      P(hills2(18, 250), 'hl2') +
      bprop(church, COUNTRY.church, 166, 0.44, 0.5, c) + bprop(poplar, 168, 160, 0.4, 0.3, c) +
      P(shells.body, 'b') + P(shells.windows, 'lit', 'opacity=".75"') +
      P(viaductArches(COUNTRY.viaduct[0], COUNTRY.viaduct[1], 192, 16, 14), 'b') + P(viaductArches(COUNTRY.viaduct[0], COUNTRY.viaduct[1], 192, 16, 14), 'hz', `fill="${c.hatch(0.4, 1)}" opacity=".6"`) +
      L(COUNTRY.viaduct[0], 191.5, COUNTRY.viaduct[1], 191.5, 'k K');
    // The works: furnaces in a row on the casting floor, the casting houses in front; the converter shed (stage 2) and
    // the open-hearth shop (stage 3) behind.
    let works = '';
    if (c.stage >= 3) works += bprop(hearthShop, 300, 250, 0.7, 0.5, c);
    for (const x of FURNACES) works += bprop(blastFurnace, x, FY, FS, 0.5, c);
    if (c.stage >= 2) works += bprop(converter, 268, 272, 0.86, 0.5, c);
    works += R(44, 262, 200, 12, 'b') + P('M42 262L52 256H236L246 262Z', 'rf') + P('M60 274V267H72V274ZM110 274V267H122V274ZM160 274V267H172V274ZM210 274V267H222V274Z', 'og');
    const mid =
      P(valley, 'gd') + P(valley.replace(/L600 228V400H0Z$/, ''), 'k k2') + works +
      bprop(rails, 0, 281, 1, 0.5, c, { w: 600 });
    const near =
      P(fore, 'gd') + P(fore.replace(/V372H0Z$/, ''), 'k k2') +
      // The goods yard: two sidings running out of the frame to the right.
      bprop(rails, 0, 298, 1, 0.5, c, { w: 600 }) + bprop(rails, 0, 306, 1, 0.5, c, { w: 600 }) +
      // The canal (to the wharf at the right), its towpath, the ground over the cut.
      bprop(canal, 0, 356, 1, 0.5, c, { w: 440 }) + P('M440 356h10v8h-10', 'k K') + R(450, 356, 6, 8, 'b') +
      tufts(0, 344, 440, 10, 26, 'iron-tufts') + L(0, 372, 600, 372, 'k K') +
      // Pig iron stacked by the sidings, two gas lamps at the yard gate, the works wall in the foreground corner.
      P('M128 318h22v-3h-22zM131 315h16v-3h-16zM478 320h20v-3h-20zM481 317h14v-3h-14z', 'b') +
      [112, 300].map((x) => L(x, 318, x, 300, 'k K') + C(x, 299, 2.4, 'og2') + C(x, 299, 7, 'og', 'style="opacity:.25"')).join('') +
      P('M0 352H34V340H40V372H0Z', 'b') + P('M0 346H34M0 358H40M10 340V352M22 346V358', 'k k2');
    // The cut-away: Steam's seam section (its shaft at the same x), shared and hollowed by both draws; without the seam
    // ladder, Steam's single bed with its worked-out hollow.
    const SX = COUNTRY.pitX;
    const ox = (SX / 600 * 100).toFixed(2) + '%';
    const cut = c.seams ? seamSection({ total: c.seams, shaftX: SX, y0: 372, y1: 400, rock: c.hatch(0.9), rock2: c.hatch(0.9, 1), glow: c.u('glow') }) :
      R(0, 372, 600, 28, 'gd') + R(0, 372, 600, 28, 'hz', `fill="${c.hatch(0.9)}" opacity=".5"`) + P('M0 379Q150 377 300 380T600 379M0 395Q200 393 400 396T600 395', 'k k2') +
      R(0, 384, 600, 8, 'd') +
      `<rect x="0" y="384.6" width="600" height="6.8" class="dx" style="transform-origin:${ox} 50%;fill:var(--s-paper)"/>` +
      R(SX - 1.6, 372, 3.2, 20, 'b') + L(SX, 372, SX, 392, 'k');
    return { sky, far, mid, near, cut };
  },

  plots: [
    {
      // Back-to-backs under the viaduct and up the far slope, from the works gate outwards.
      key: 'town', driver: 'population', curve: 0.75,
      slots: weave(
        row('terrace', 300, 232, 430, 236, 4, 'iron-t1', 0.2, { k: 0.9 }),
        row('terrace', 250, 246, 330, 248, 2, 'iron-t2', 0, { k: 0.95 }),
        row('cottage', 10, 236, 50, 238, 2, 'iron-t3', 1, { k: 0.9 }),
        row('terrace', 340, 220, 440, 224, 3, 'iron-t4', 0.5, { k: 0.85 }),
        row('terrace', 470, 250, 560, 252, 2, 'iron-t5', 0, { k: 0.95 }),
      ),
    },
    {
      // The glow plates of the furnaces in blast: more furnaces blow in as the works fill.
      key: 'blast', driver: 'light', curve: 0.5,
      slots: [120, 170, 70, 220].map((x): Slot => ({ p: 'blastGlow', x, y: FY, s: FS, band: 'mid' })),
    },
    {
      key: 'smog', driver: 'pressure', curve: 1,
      slots: ([[150, 200, 170], [90, 196, 150], [230, 206, 160], [330, 214, 150], [40, 190, 140], [400, 190, 170], [200, 170, 200]] as [number, number, number][])
        .map(([x, y, w]): Slot => ({ p: 'smogPlume', x, y, w, s: 1, band: 'far' })),
    },
    {
      // Slag tipped on the ground over the coal, growing as the reserve both Industries draw on goes.
      key: 'slag', driver: 'depletion', curve: 0.9,
      slots: [
        { p: 'slagHeap', x: 560, y: 371, v: 0.7 }, { p: 'slagHeap', x: 500, y: 371, v: 0.4 }, { p: 'slagHeap', x: 596, y: 368, v: 0.9 },
        { p: 'slagHeap', x: 470, y: 368, v: 0.2 }, { p: 'slagHeap', x: 30, y: 230, v: 0.6, band: 'mid' }, { p: 'slagHeap', x: 270, y: 248, v: 0.5, band: 'mid' },
      ],
    },
    {
      // The Slag Slide (the second crisis): a heap slumps across the ground and stays slumped for the run.
      key: 'slide', driver: 'crises', curve: 1,
      slots: [{ p: 'none', x: 520, y: 371 }, { p: 'slagSlump', x: 528, y: 371.5 }],
    },
    {
      key: 'wire', match: ['wire', 'iron.wire'],
      anchor: { p: 'wireMill', x: 70, y: 342 },
      slots: scatter('coil', [16, 330, 110, 14], 3, 'iron-coils', { gap: [16, 4] }),
      movers: [{ p: 'wagWire', x0: -110, y0: 306, x1: 720, y1: 306, dur: 30, n: 1, s: 0.95, band: 'near' }],
      hit: [14, 290, 106, 58],
    },
    {
      key: 'rails', match: ['rails', 'iron.rails'],
      anchor: { p: 'railMill', x: 350, y: 272 },
      slots: [{ p: 'railStack', x: 408, y: 276 }, { p: 'railStack', x: 300, y: 278 }, { p: 'railStack', x: 420, y: 280 }],
      movers: [{ p: 'wagRails', x0: -110, y0: 298, x1: 720, y1: 298, dur: 22, n: 2, s: 0.95, band: 'near' }],
      hit: [300, 222, 110, 58],
    },
    {
      key: 'plate', match: ['plate', 'iron.shipPlate'],
      anchor: { p: 'plateMill', x: 470, y: 270 },
      slots: [{ p: 'plateStack', x: 512, y: 276 }, { p: 'plateStack', x: 440, y: 278 }],
      movers: [{ p: 'wagPlate', x0: -110, y0: 306, x1: 720, y1: 306, dur: 26, n: 2, s: 0.95, band: 'near', from: 0.1 }],
      hit: [424, 214, 96, 62],
    },
    {
      key: 'girder', match: ['girder', 'iron.girders'],
      anchor: { p: 'girderYard', x: 205, y: 342 },
      slots: [{ p: 'girderYard', x: 268, y: 344, k: 0.85 }],
      movers: [{ p: 'wagGirder', x0: -110, y0: 298, x1: 720, y1: 298, dur: 24, n: 1, s: 0.95, band: 'near' }],
      hit: [160, 294, 110, 56],
    },
    {
      key: 'cans', match: ['cans', 'iron.tinplate'],
      anchor: { p: 'tinWorks', x: 370, y: 342 },
      slots: [{ p: 'tinWorks', x: 426, y: 344, k: 0.8 }],
      movers: [{ p: 'wagTin', x0: -110, y0: 306, x1: 720, y1: 306, dur: 28, n: 1, s: 0.95, band: 'near' }],
      hit: [324, 294, 110, 56],
    },
    {
      key: 'lathe', match: ['lathe', 'iron.machineTools'],
      anchor: { p: 'machineShop', x: 556, y: 264, k: 0.9 },
      slots: [{ p: 'machineShop', x: 566, y: 238, k: 0.75 }],
      movers: [{ p: 'wagTools', x0: -110, y0: 298, x1: 720, y1: 298, dur: 25, n: 1, s: 0.95, band: 'near', from: 0.2 }],
      hit: [516, 214, 84, 58],
    },
  ],

  spares: [[250, 300, 60, 40], [470, 300, 80, 40]],

  restraint: {
    duty: { p: 'customs', x: 98, y: 297, s: 0.9 },
    cap: { p: 'permits', x: 452, y: 298, s: 0.95 },
    sufficiency: { p: 'allotments', x: 40, y: 260, s: 0.8, band: 'mid' },
    substitution: { p: 'notice', x: 258, y: 298, s: 1 },
    circularity: { p: 'kiln', x: 600 - 30, y: 300, s: 0.9 },
    greenSpending: { p: 'park', x: 22, y: 300, s: 0.95 },
  },
  restraintSpare: [{ p: 'notice', x: 300, y: 300 }, { p: 'notice', x: 140, y: 300 }],
  commons: [
    { p: '', x: 276, y: 240, k: 0.9 }, { p: '', x: 452, y: 240, k: 0.9 }, { p: '', x: 380, y: 250, k: 0.9 },
    { p: '', x: 200, y: 246, k: 0.9 }, { p: '', x: 120, y: 300 }, { p: '', x: 500, y: 300 },
  ],
  landmark: { p: '', x: 240, y: 300 },
  steadyMovers: [{ p: 'birds', x0: -40, y0: 80, x1: 640, y1: 66, dur: 44, n: 1, s: 1, band: 'far' }],
  figures: [{ x: 150, y: 353 }, { x: 116, y: 354, flip: true }, { x: 250, y: 353 }, { x: 300, y: 354, flip: true }, { x: 410, y: 353 }, { x: 60, y: 354 }],
  bite: { '*': { p: 'blastFurnace', x: 262, y: FY, s: FS, band: 'mid' } },
  reserveWords: (r) => (r > 0.7 ? 'the coal under the valley barely touched by two draws' : r > 0.35 ? 'the seam hollowing from both ends' : 'the coal nearly worked out, slag where the fields were'),
};

void birds;
