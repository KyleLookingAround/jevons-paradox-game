// Compute: the infrastructure behind the screen, drawn as a vector display. Office towers full of spreadsheets on
// the left, exchanges strung together with arcs of packets in the middle, cloud sheds on the right, a training
// campus with cooling towers on the far right, a reservoir behind a dam whose water drops, glowing homes in front.
import type { Layout, Slot } from '../layout';
import { scatter, weave } from '../layout';
import { P, R, L, f, rng, hash } from '../svg';
import { bprop } from './util';
import { pylon } from '../props/terminal';
import { hillCrest, millShells, built } from '../geography';

/** The substation where the grid comes in, by the dam. */
const SUB: [number, number] = [176, 200];
const NODES: [number, number][] = [[300, 262], [236, 236], [366, 230], [196, 258], [414, 254], [272, 214], [338, 210], [440, 222]];
const LINKS: Slot[] = NODES.slice(1).map(([x, y], i) => {
  const [fx, fy] = i % 3 === 2 ? NODES[i] : NODES[0];
  return { p: 'link', x: fx, y: fy, w: x - fx, h: y - fy, s: 1, band: 'mid' as const };
});

function floor(): string {
  let d = '';
  for (let i = -12; i <= 12; i++) d += `M300 150L${f(300 + i * 60)} 400`;
  for (let k = 0; k < 9; k++) { const y = 150 + Math.pow(k / 8, 1.8) * 250; d += `M0 ${f(y)}H600`; }
  return P(d, 'grid');
}

export const compute: Layout = {
  id: 'compute',
  look: 'terminal',
  place: 'the machinery behind the screen',
  caption: 'grid.map --live',
  bands: [204, 300],
  depth: [150, 0.7, 372, 1.25],

  backdrop(c) {
    const r = rng(hash('cstars'));
    let st = '';
    for (let i = 0; i < 40; i++) st += `M${f(r() * 600)} ${f(r() * 130)}h.8`;
    const sky = P(st, 'k k2 dim') + P('M0 150H600', 'hzn');
    let wires = '';
    const px = [20, 110, 200, 290, 380, 470, 560];
    for (let i = 0; i < px.length - 1; i++) wires += `M${px[i] - 7} 147Q${(px[i] + px[i + 1]) / 2} 156 ${px[i + 1] - 7} 147M${px[i] + 7} 147Q${(px[i] + px[i + 1]) / 2} 156 ${px[i + 1] + 7} 147`;
    // The same country, as a survey contour: the hill line (geography.ts) falling to the estuary, and the mill shells
    // Steam built, now data halls.
    const steamBuilt = built(c.heritage, 'steam');
    const shells = millShells(Math.round(steamBuilt * 4), 196, 0.5);
    const far = P(hillCrest(30), 'k cont') + P(hillCrest(36), 'k k2 cont') + P(hillCrest(43), 'k k2 dim') +
      P('M452 151H600M466 156H600M486 162H600', 'k k2 dim') +
      (shells.body ? P(shells.body, 'b dim') + `<text x="218" y="194" text-anchor="end" class="thud dimt">[ MILL.1851 &gt; DC ]</text>` : '') +
      floor() + px.map((x) => bprop(pylon, x, 174, 0.8, 0.5, c)).join('') + P(wires, 'k k2') +
      P('M14 192L30 164H150L160 192Z', 'b') + `<g class="ry">${R(32, 166, 116, 24, 'wa')}${P('M36 172H144M36 178H144M36 184H144', 'k k2 wl')}</g>` + P('M150 164L160 192', 'k');
    const near = R(0, 300, 600, 72, 'gd', 'opacity=".55"');
    const cut = R(0, 372, 600, 28, 'b') + L(0, 372, 600, 372, 'k') + P('M0 380H600M0 386H600M0 392H600', 'k k2 dim') +
      P('M0 383H600', 'k lnk');
    return { sky, far, near, cut };
  },

  plots: [
    {
      // Power: the grid comes over the hill on the pylons to the substation by the dam, and feeds run from it to
      // every hall as the place fills (a trace per hall, current flowing along it).
      key: 'feeds', driver: 'light', curve: 0.8,
      anchor: { p: 'substation', x: SUB[0], y: SUB[1], s: 0.9, band: 'far' },
      slots: ([[300, 262], [92, 262], [486, 280], [512, 206], [300, 330], [196, 258], [414, 254]] as [number, number][])
        .map(([x, y]): Slot => ({ p: 'cable', x: SUB[0], y: SUB[1], w: x - SUB[0], h: y - SUB[1] - 4, s: 1, band: y > 300 ? 'near' : y > 204 ? 'mid' : 'far' })),
    },
    { key: 'town', driver: 'population', slots: scatter('office', [150, 156, 300, 22], 14, 'compute-town', { from: [300, 170], gap: [18, 5], k: 0.7 }) },
    {
      key: 'sheets', match: ['sheet'],
      anchor: { p: 'officeL', x: 92, y: 290, s: 1.15, v: 0.7 },
      slots: scatter('office', [8, 206, 196, 86], 8, 'compute-offices', { from: [92, 260], gap: [26, 10] }),
      hit: [30, 196, 130, 98],
    },
    {
      key: 'web', match: ['globe'],
      anchor: { p: 'exchangeL', x: NODES[0][0], y: NODES[0][1], s: 1 },
      slots: weave(NODES.slice(1).map(([x, y]): Slot => ({ p: 'exchange', x, y, k: 0.9 })), LINKS),
      hit: [190, 192, 200, 76],
    },
    {
      key: 'cloud', match: ['cloud'],
      anchor: { p: 'storageL', x: 486, y: 292, s: 1.1, v: 0.6 },
      slots: scatter('storage', [410, 224, 186, 64], 5, 'compute-sheds', { from: [486, 270], gap: [70, 14] }),
      hit: [420, 236, 170, 74],
    },
    {
      key: 'stream', match: ['play'],
      anchor: { p: 'hallL', x: 300, y: 340, s: 1.1, band: 'near' },
      slots: weave(
        scatter('homeScreen', [10, 318, 580, 46], 16, 'compute-homes', { from: [300, 340], gap: [30, 8], k: 1.4 }),
        [{ p: 'hall', x: 170, y: 314, s: 0.95 }, { p: 'hall', x: 430, y: 316, s: 0.95 }],
      ),
      hit: [190, 300, 220, 74],
    },
    {
      key: 'train', match: ['brain'],
      anchor: { p: 'campusL', x: 512, y: 210, s: 1.45, band: 'far' },
      slots: weave(
        scatter('campus', [420, 168, 180, 36], 4, 'compute-campus', { from: [520, 196], gap: [90, 8], k: 1.6 }),
        scatter(['cooling', 'cooling', 'substation'], [396, 160, 204, 44], 9, 'compute-cool', { from: [540, 196], gap: [30, 6], k: 1.8 }),
      ),
      hit: [410, 136, 190, 76],
      site: [490, 194, 60, 6],
    },
  ],

  spares: [[180, 270, 110, 26], [20, 150, 110, 30], [300, 150, 100, 30]],

  restraint: {
    duty: { p: 'customs', x: 560, y: 368, s: 0.9, band: 'near' },
    cap: { p: 'permits', x: 40, y: 368, s: 0.9, band: 'near' },
    sufficiency: { p: 'allotments', x: 120, y: 368, s: 0.9, band: 'near' },
    substitution: { p: 'solar', x: 190, y: 200, s: 1, band: 'far' },
    circularity: { p: 'kiln', x: 490, y: 368, s: 0.8, band: 'near' },
    greenSpending: { p: 'park', x: 420, y: 368, s: 0.9, band: 'near' },
  },
  restraintSpare: [{ p: 'notice', x: 220, y: 368 }, { p: 'notice', x: 380, y: 368 }],
  // The Commons among the glowing homes: a repair café on the near street, bunting over it.
  commons: [{ p: '', x: 252, y: 366, band: 'near' }, { p: '', x: 344, y: 368, band: 'near' }],
};
