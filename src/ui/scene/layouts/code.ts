// Code: a city of software. Workshops of internal tools on the left, a scatter of throwaway apps (some already
// abandoned), the legacy temple being rewritten in scaffolding, towers of agents writing for agents on the right,
// chat bubbles over everything, maintenance debt as clutter on the ground and as strata of old code underneath.
// The sun is attention: it shrinks as the day is spoken for. Deletion visibly clears ground.
import type { Layout, Slot } from '../layout';
import { scatter, weave } from '../layout';
import { P, R, L, f, rng, hash } from '../svg';
import { bprop } from './util';
import { sun } from '../props/agentic';

const GROUND = 322;
const TOWERS = [446, 486, 526, 568];
const FLOORS: Slot[] = [];
for (let j = 0; j < 14; j++) for (let t = 0; t < TOWERS.length; t++) {
  if (j > 6 + t * 2 - (t === 2 ? 3 : 0)) continue;
  FLOORS.push({ p: 'floor', x: TOWERS[t], y: GROUND - j * 12, s: 1, v: ((t * 13) % 10) / 10, band: 'mid' });
}
FLOORS.sort((a, b) => (GROUND - a.y) - (GROUND - b.y));

function strata(): string {
  const r = rng(hash('strata'));
  let d = '';
  for (let y = GROUND + 6; y < 400; y += 3.2) {
    let x = r() * 20;
    while (x < 600) { const len = 6 + r() * 30; d += `M${f(x)} ${f(y)}h${f(len)}`; x += len + 3 + r() * 10; }
  }
  return P(d, 'cl');
}

export const code: Layout = {
  id: 'code',
  look: 'agentic',
  place: 'a city of software',
  bands: [230, 300],
  depth: [150, 0.72, 372, 1.15],

  backdrop(c) {
    const sky = bprop(sun, 82, 70, 1.3, 0, c);
    const far = L(0, 210, 600, 210, 'k k2');
    const mid = R(0, GROUND, 600, 2, 'd');
    const near = R(0, GROUND + 2, 600, 80, 'gd') + strata() +
      `<rect x="0" y="${GROUND + 2}" width="600" height="46" class="debt ly" style="transform-origin:50% 0"/>`;
    return { sky, far, mid, near };
  },

  plots: [
    { key: 'town', driver: 'population', slots: scatter('block', [140, 186, 300, 24], 14, 'code-town', { from: [290, 200], gap: [18, 5], k: 0.8, band: 'far' }) },
    {
      key: 'debt', driver: 'pressure', curve: 0.85,
      slots: weave(
        scatter('clutter', [6, GROUND - 4, 588, 8], 26, 'code-clutter', { gap: [16, 3], band: 'near' }),
        scatter('clutter', [6, 236, 420, 60], 14, 'code-clutter2', { gap: [20, 6], k: 0.9 }),
      ),
    },
    {
      key: 'tools', match: ['wrench'],
      anchor: { p: 'shed', x: 76, y: GROUND, s: 1.15, v: 0.6, band: 'mid' },
      slots: scatter('shed', [8, 244, 190, 58], 7, 'code-sheds', { from: [80, 290], gap: [36, 9] }),
      hit: [20, 250, 120, 72],
    },
    {
      key: 'apps', match: ['phone-app'],
      anchor: { p: 'kiosk', x: 220, y: GROUND, s: 1.2, v: 0.2, band: 'mid' },
      slots: scatter('kiosk', [150, 236, 190, 82], 18, 'code-apps', { from: [220, 300], gap: [12, 6] }),
      hit: [160, 244, 110, 78],
    },
    {
      key: 'legacy', match: ['scroll'],
      anchor: { p: 'temple', x: 350, y: GROUND, s: 1.25, band: 'mid' },
      slots: [
        { p: 'scaffoldBay', x: 330, y: GROUND, s: 1, band: 'mid' }, { p: 'scaffoldBay', x: 370, y: GROUND, s: 1, band: 'mid' },
        { p: 'newTower', x: 398, y: GROUND, s: 1, v: 0.3, band: 'mid' }, { p: 'scaffoldBay', x: 350, y: GROUND, s: 1.1, v: 0.9, band: 'mid' },
        { p: 'newTower', x: 304, y: GROUND, s: 0.9, v: 0.7, band: 'mid' }, { p: 'towerCrane', x: 410, y: GROUND - 60, s: 0.9, band: 'mid' },
      ],
      hit: [300, 260, 110, 62],
    },
    {
      key: 'bots', match: ['chatbot'],
      anchor: { p: 'bubble', x: 230, y: 228, s: 1.1 },
      slots: scatter('bubble', [20, 160, 400, 70], 16, 'code-bubbles', { from: [230, 210], gap: [26, 10], k: 1 }),
      hit: [150, 180, 180, 56],
    },
    {
      key: 'agents', match: ['robots'],
      anchor: { p: 'floor', x: TOWERS[0], y: GROUND, s: 1, v: 0, band: 'mid' },
      slots: FLOORS.slice(1),
      movers: [
        { p: 'agent', x0: 420, y0: 268, x1: 600, y1: 268, dur: 7, n: 2, s: 1.2, band: 'mid' },
        { p: 'agent', x0: 600, y0: 244, x1: 420, y1: 244, dur: 6, n: 2, s: 1.2, from: 0.3, band: 'mid' },
        { p: 'agent', x0: -20, y0: GROUND, x1: 620, y1: GROUND, dur: 16, n: 3, s: 1.3, from: 0.15, band: 'mid' },
        { p: 'agent', x0: 420, y0: 210, x1: 600, y1: 200, dur: 5, n: 2, s: 1.2, from: 0.6, band: 'far' },
      ],
      hit: [424, 170, 172, 152],
      site: [430, 312, 50, 8],
    },
  ],

  spares: [[20, 196, 110, 40], [250, 190, 100, 40], [130, 330, 120, 30]],

  restraint: {
    deletion: { p: 'bulldozer', x: 250, y: 352, s: 1.3, band: 'near' },
    reviewGate: { p: 'gate', x: 140, y: GROUND, s: 1.1, band: 'mid' },
    sharedLibs: { p: 'library', x: 60, y: 356, s: 1.1, band: 'near' },
    sufficiency: { p: 'bench', x: 420, y: 356, s: 1.1, band: 'near' },
    duty: { p: 'customs', x: 520, y: 360, s: 0.9, band: 'near' },
    cap: { p: 'permits', x: 340, y: 360, s: 0.9, band: 'near' },
    substitution: { p: 'solar', x: 560, y: 210, s: 0.8, band: 'far' },
  },
  restraintSpare: [{ p: 'notice', x: 160, y: 360 }, { p: 'notice', x: 470, y: 360 }],
};
