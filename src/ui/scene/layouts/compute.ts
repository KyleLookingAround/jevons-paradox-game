// Compute: where the computing lives, drawn as a vector display. The same valley (geography.ts) as a survey contour,
// Steam's mills relabelled as data halls, a reservoir behind its dam on the west hill whose water is drawn down, the
// grid marching in on pylons from the horizon to the substation and on to the halls, an avenue of cold-store halls
// stepping back towards the vanishing point, a training campus with a rank of cooling towers and their plumes on the
// east, office towers full of spreadsheets on the west, exchanges strung with packet arcs in the middle, fibre routes
// glowing across the floor with traffic on them, and the homes with their screens in front. As pressure rises a heat
// dome is drawn over the campus in isotherms.
import type { Layout, Slot } from '../layout';
import { scatter, weave } from '../layout';
import { P, R, L, f, rng, hash } from '../svg';
import { bprop } from './util';
import { pylon } from '../props/terminal';
import { COUNTRY, hillCrest, millShells, viaductArches, built } from '../geography';

const VP: [number, number] = [300, 150];
/** Where the mills' label sits (over the mill town). */
const COUNTRY_MILL_LABEL = 262;
/** The substation where the grid comes in, in front of the old mills. */
const SUB: [number, number] = [250, 197];
const NODES: [number, number][] = [[292, 262], [236, 242], [352, 238], [204, 270], [266, 220], [328, 216], [372, 266]];
const LINKS: Slot[] = NODES.slice(1).map(([x, y], i) => {
  const [fx, fy] = i % 3 === 2 ? NODES[i] : NODES[0];
  return { p: 'link', x: fx, y: fy, w: x - fx, h: y - fy, s: 1, band: 'mid' as const };
});

/** Pylons marching in along a ray from the vanishing point through the substation, nearest the substation first. */
const MARCH: Slot[] = (() => {
  const ys = [212, 236, 270, 318];
  const k = (SUB[0] - VP[0]) / (SUB[1] - VP[1]);
  const pts = ys.map((y) => ({ x: VP[0] + (y - VP[1]) * k, y, s: ((y - VP[1]) / 50) * 0.72 }));
  const out: Slot[] = [];
  let prev = { x: SUB[0] + 6, y: SUB[1] - 4, s: 0.55 };
  for (const q of pts) {
    // Each pylon carries its conductors back to the previous one (local units of this pylon).
    out.push({ p: 'pylonW', x: q.x, y: q.y, s: q.s, w: (prev.x - q.x) / q.s, h: (prev.y - q.y - 23 * (prev.s - q.s)) / q.s, band: q.y > 300 ? 'near' : 'mid' });
    prev = q;
  }
  return out;
})();

/** The cold-store avenue: halls along a ray from the vanishing point, the nearest first, stepping back. */
const AVENUE: Slot[] = [1, 0.76, 0.58, 0.44, 0.33, 0.25].map((d, i) => ({
  p: 'aisle', x: VP[0] + 152 * d, y: VP[1] + 148 * d, s: 1.12 * d, h: -1.05, v: (i * 0.37) % 1,
  band: VP[1] + 148 * d > 204 ? 'mid' as const : 'far' as const,
}));

/** The campus's cooling towers (on the skyline) and their plumes, tower then plume. */
const TOWERS: [number, number, number][] = [[512, 214, 1.7], [556, 210, 1.55], [470, 218, 1.45], [594, 212, 1.4], [436, 220, 1.2]];
const COOL: Slot[] = TOWERS.flatMap(([x, y, s], i): Slot[] => [
  { p: 'tower', x, y, s, band: 'far' },
  { p: 'plume', x: x + 2 * s, y: y - 48 * s, s, w: 70 + i * 6, v: (i * 0.29) % 1, band: 'far' },
]);

/** Fibre routes on the floor (luminous, with traffic), each from a hall towards what it serves. */
const ROUTES: [number, number, number, number, number][] = [
  [292, 266, -190, 2, 0.7], [300, 334, -232, 18, 0.2], [300, 334, 250, 20, 0.2], [292, 266, 8, 64, 0.2],
  [540, 270, -110, 26, 0.7], [422, 302, -104, -8, 0.2], [330, 220, 92, 14, 0.7],
];

function floor(): string {
  let d = '';
  for (let i = -12; i <= 12; i++) d += `M300 150L${f(300 + i * 60)} 400`;
  for (let k = 0; k < 9; k++) { const y = 150 + Math.pow(k / 8, 1.8) * 250; d += `M0 ${f(y)}H600`; }
  return P(d, 'grid');
}

/** The heat dome: isotherms over the campus, each appearing at a higher pressure (opacity from --pf2 in the sky). */
function isotherms(): string {
  let out = '';
  const cx = 470, cy = 151;
  [[54, 0.1, '+1.0'], [86, 0.3, '+1.5'], [122, 0.48, '+2.0'], [162, 0.64, '+3.0'], [206, 0.8, '+4.0']].forEach(([r, t, lab]) => {
    const rr = r as number, ry = rr * 0.62;
    const d = `M${f(cx - rr * 1.5)} ${cy}A${f(rr * 1.5)} ${f(ry)} 0 0 1 ${f(cx + rr * 1.5)} ${cy}`;
    out += `<g class="isot" style="opacity:calc((var(--pf2,0) - ${t}) * 4)">${P(d, 'ist')}` +
      `<text x="${f(cx - rr * 0.55)}" y="${f(cy - ry * 0.93)}" class="tlab ist2">${lab}&#176;</text></g>`;
  });
  return out;
}

export const compute: Layout = {
  id: 'compute',
  look: 'terminal',
  place: 'where the computing lives',
  caption: 'grid.map --live',
  bands: [204, 300],
  depth: [150, 0.7, 372, 1.25],

  backdrop(c) {
    const r = rng(hash('cstars'));
    let st = '';
    for (let i = 0; i < 46; i++) st += `M${f(r() * 600)} ${f(r() * 130)}h.8`;
    const sky = `<g class="starf">${P(st, 'k k2 dim')}</g>` + isotherms() + P('M0 150H600', 'hzn');
    // The national grid along the hills, small with distance.
    let wires = '';
    const px = [24, 112, 330, 418, 520];
    const top = 168 - 26 * 0.55;
    for (let i = 0; i < px.length - 1; i++) {
      if (px[i + 1] - px[i] > 150) continue;
      wires += `M${px[i] - 5.5} ${f(top)}Q${(px[i] + px[i + 1]) / 2} ${f(top + 5)} ${px[i + 1] - 5.5} ${f(top)}M${px[i] + 5.5} ${f(top)}Q${(px[i] + px[i + 1]) / 2} ${f(top + 5)} ${px[i + 1] + 5.5} ${f(top)}`;
    }
    wires += `M117.5 ${f(top)}Q190 ${f(top + 12)} ${SUB[0] - 6} ${SUB[1] - 16}`;
    // The same country, as a survey contour: the hill line (geography.ts) falling to the estuary.
    const hillsC = P(hillCrest(30), 'k cont') + P(hillCrest(36), 'k k2 cont') + P(hillCrest(43), 'k k2 dim') +
      P('M452 151H600M462 155H600M478 160H600M500 166H600', 'k k2 wl dim');
    // Steam's mill shells, still standing, now data halls: LED rows where the looms were, and a label.
    const steamBuilt = built(c.heritage, 'steam');
    const n = Math.round(steamBuilt * 5);
    const shells = millShells(n, 198, 0.74);
    let leds = '';
    shells.stacks.forEach(([x], i) => { leds += `M${f(x - 18)} ${f(196 - 4 - (i % 2))}h${f(10 + (i % 3) * 3)}`; });
    const mills = shells.body ? P(shells.body, 'b mill') + P(shells.windows, 'cy dimc') + P(leds, 'k lnk2') +
      `<text x="${f(COUNTRY_MILL_LABEL)}" y="171" class="tlab">[ MILL.1851 &gt; HALL-07 ]</text>` : '';
    // The reservoir behind its dam on the west hill: contour rings show on the banks as the water is drawn down.
    const basin = 'M24 192L40 164Q92 156 150 162L170 192Z';
    let rings = '';
    for (let k = 1; k <= 4; k++) { const y = 164 + k * 5.6, i0 = 40 - k * 3.4, i1 = 150 + k * 3.6; rings += `M${f(i0)} ${f(y)}Q${f((i0 + i1) / 2)} ${f(y - 3 + k * 0.4)} ${f(i1)} ${f(y)}`; }
    const reservoir = P(basin, 'b') + P(rings, 'rng') +
      `<g class="ry">${P('M27 190L42 165Q92 158 149 163L167 190Z', 'resw')}${P('M50 172H140M44 178H150M38 184H158', 'k k2 wl')}</g>` +
      P('M20 192H174L170 200H24Z', 'b') + P('M40 192V200M62 192V200M84 192V200M106 192V200M128 192V200M150 192V200', 'k k2') +
      P('M160 186V200M157 189h3M157 193h3M157 197h3', 'k k2') + `<text x="96" y="155" text-anchor="middle" class="tlab">[ RESERVOIR ]</text>`;
    // Steam's viaduct across the valley, surveyed as a wireframe, now carrying the fibre trunk on its deck.
    const via = built(c.heritage, 'steam') > 0.12 ? P(viaductArches(COUNTRY.viaduct[0], COUNTRY.viaduct[1], 176, 11, 16), 'k k2 cont') +
      P(`M${COUNTRY.viaduct[0]} 176H${COUNTRY.viaduct[1]}`, 'fbl') + `<text x="${COUNTRY.viaduct[1] - 4}" y="172" text-anchor="end" class="tlab dimc">VIADUCT 1848 / FIBRE</text>` : '';
    const far = hillsC + via + floor() + mills + `<g transform="translate(0 -8)">${reservoir}</g>` + px.map((x) => bprop(pylon, x, 168, 0.55, 0.5, c)).join('') + P(wires, 'k k2 wire');
    const near = R(0, 300, 600, 72, 'gd', 'opacity=".55"');
    const cut = R(0, 372, 600, 28, 'b') + L(0, 372, 600, 372, 'k') + P('M0 380H600M0 386H600M0 392H600', 'k k2 dim') +
      P('M0 375H600', 'k lnk') +
      // The aquifer under the floor, drawn down from the east as the halls drink it: a water band that shortens.
      `<g class="rx">${P('M4 377H596V387H4Z', 'resw')}${P('M14 381h22M60 383h30M120 380h18M180 383h26M250 381h20M320 383h28M390 380h20M460 383h24M530 381h22', 'k k2 wl')}</g>` +
      `<text x="572" y="396" text-anchor="end" class="tlab dimc">AQUIFER</text>`;
    return { sky, far, near, cut };
  },

  plots: [
    {
      // Power: the substation in front of the old mills; feeds run from it to every hall as the place fills.
      key: 'feeds', driver: 'light', curve: 0.8,
      anchor: { p: 'substation', x: SUB[0], y: SUB[1], s: 0.9, band: 'far' },
      slots: ([[292, 262], [80, 268], [540, 270], [422, 296], [300, 330], [370, 268]] as [number, number][])
        .map(([x, y]): Slot => ({ p: 'cable', x: SUB[0], y: SUB[1], w: x - SUB[0], h: y - SUB[1] - 4, s: 1, band: y > 300 ? 'near' : y > 204 ? 'mid' : 'far' })),
    },
    // The grid marches in: pylons striding towards us from the substation as demand grows.
    { key: 'grid', driver: 'light', curve: 0.5, slots: MARCH },
    // Fibre: luminous routes across the floor with traffic, as the place lights up.
    {
      key: 'fibre', driver: 'light', curve: 0.7,
      slots: ROUTES.map(([x, y, w, h, v]): Slot => ({ p: 'fibre', x, y, w, h, v, s: 1, band: y > 300 ? 'near' : y > 204 ? 'mid' : 'far' })),
    },
    { key: 'town', driver: 'population', slots: scatter('office', [160, 160, 120, 18], 8, 'compute-town', { from: [220, 172], gap: [18, 5], k: 0.62 }) },
    {
      key: 'sheets', match: ['sheet'],
      anchor: { p: 'officeL', x: 86, y: 290, s: 1.15, v: 0.7 },
      slots: scatter('office', [6, 238, 160, 56], 8, 'compute-offices', { from: [86, 262], gap: [26, 10] }),
      hit: [24, 196, 130, 98],
    },
    {
      key: 'web', match: ['globe'],
      anchor: { p: 'exchangeL', x: NODES[0][0], y: NODES[0][1], s: 1 },
      slots: weave(NODES.slice(1).map(([x, y]): Slot => ({ p: 'exchange', x, y, k: 0.9 })), LINKS),
      hit: [196, 200, 170, 72],
    },
    {
      key: 'cloud', match: ['cloud'],
      anchor: { ...AVENUE[0], p: 'aisleL', s: 1.18 },
      slots: AVENUE.slice(1),
      hit: [380, 196, 110, 106],
    },
    {
      key: 'stream', match: ['play'],
      anchor: { p: 'hallL', x: 300, y: 340, s: 1.1, band: 'near' },
      slots: weave(
        scatter('homeScreen', [10, 318, 580, 46], 16, 'compute-homes', { from: [300, 340], gap: [30, 8], k: 1.4 }),
        [{ p: 'hall', x: 168, y: 316, s: 0.95 }, { p: 'hall', x: 474, y: 330, s: 0.95, band: 'near' }],
      ),
      hit: [190, 300, 220, 74],
    },
    {
      key: 'train', match: ['brain'],
      anchor: { p: 'campusL', x: 536, y: 268, s: 1.35, v: 0.8 },
      slots: weave(COOL, [{ p: 'substation', x: 470, y: 280, s: 0.9 }, { p: 'substation', x: 594, y: 290, s: 0.9 }]),
      hit: [450, 140, 150, 140],
      site: [500, 258, 70, 8],
    },
  ],

  spares: [[180, 280, 100, 20], [20, 150, 110, 30], [330, 160, 60, 24]],

  restraint: {
    duty: { p: 'customs', x: 560, y: 368, s: 0.9, band: 'near' },
    cap: { p: 'permits', x: 40, y: 368, s: 0.9, band: 'near' },
    sufficiency: { p: 'allotments', x: 120, y: 368, s: 0.9, band: 'near' },
    substitution: { p: 'solar', x: 196, y: 202, s: 1, band: 'far' },
    circularity: { p: 'kiln', x: 490, y: 368, s: 0.8, band: 'near' },
    greenSpending: { p: 'park', x: 420, y: 368, s: 0.9, band: 'near' },
  },
  restraintSpare: [{ p: 'notice', x: 220, y: 368 }, { p: 'notice', x: 380, y: 368 }],
  // M3: free at the point of use: the free halls cabled to an advertising hoarding on the floor, where the bill is
  // paid; the cast between the signs at the front; a lever biting back puts up another hall.
  bill: { p: 'adBoard', x: 214, y: 330, s: 1, band: 'near' },
  figures: [{ x: 160, y: 372 }, { x: 262, y: 372, flip: true }, { x: 336, y: 373 }, { x: 456, y: 372 }, { x: 590, y: 372, flip: true }, { x: 524, y: 372 }],
  bite: { '*': { p: 'newHall', x: 452, y: 318, s: 1, band: 'near' } },
  // The Commons among the glowing homes: a repair café on the near street, bunting over it.
  commons: [{ p: '', x: 252, y: 366, band: 'near' }, { p: '', x: 344, y: 368, band: 'near' }],
};
