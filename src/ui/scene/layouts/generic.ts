// The fallback: an unnamed country for an industry nobody has drawn yet. Every application gets a spare plot (its icon
// is looked up in every prop library, else a generic works), houses follow population, and the weather still works.
import type { Layout } from '../layout';
import { scatter } from '../layout';
import { P, R, L, ridge } from '../svg';
import { bprop, tufts } from './util';
import { tree, poplar } from '../props/common';

const cache = new Map<number, Layout>();

export function genericLayout(nApps: number): Layout {
  const n = Math.max(1, Math.min(12, Math.floor(nApps) || 1));
  const hit = cache.get(n);
  if (hit) return hit;
  const spares: [number, number, number, number][] = [];
  const top = Math.ceil(n / 2), bot = n - top;
  for (let i = 0; i < top; i++) { const w = 560 / top; spares.push([20 + i * w, 258, w - 10, 40]); }
  for (let i = 0; i < bot; i++) { const w = 560 / Math.max(1, bot); spares.push([20 + i * w, 320, w - 10, 42]); }
  const l: Layout = {
    id: 'generic',
    look: 'generic',
    place: 'open country',
    bands: [250, 314],
    backdrop(c) {
      const far = ridge([[0, 196], [90, 180], [200, 192], [320, 176], [450, 190], [600, 182]], 300);
      const mid = ridge([[0, 232], [120, 226], [260, 236], [400, 228], [600, 238]], 400);
      return {
        far: P(far, 'tr', 'fill-opacity=".35"') + P(far, 'hz', `fill="${c.hatch(0.4)}" opacity=".3"`) +
          bprop(poplar, 120, 190, 0.4, 0.3, c) + bprop(tree, 470, 192, 0.42, 0.6, c),
        mid: P(mid, 'gd') + P(mid, 'tr', 'fill-opacity=".35"') + L(0, 232, 600, 236, 'k k2'),
        near: tufts(0, 320, 600, 50, 50, 'gen') + bprop(tree, 14, 372, 1.3, 0.7, c),
        cut: R(0, 372, 600, 28, 'gd') + L(0, 372, 600, 372, 'k K') + R(0, 384, 600, 7, 'd') +
          `<rect x="0" y="384.6" width="600" height="5.8" class="dx" style="transform-origin:50% 50%;fill:var(--s-paper)"/>`,
      };
    },
    plots: [
      { key: 'town', driver: 'population', slots: scatter(['cottage', 'terrace'], [40, 222, 520, 26], 18, 'gen-town', { gap: [26, 6] }) },
    ],
    spares,
    restraint: {
      duty: { p: 'customs', x: 560, y: 368, s: 0.8 },
      cap: { p: 'permits', x: 40, y: 368, s: 0.8 },
      sufficiency: { p: 'allotments', x: 470, y: 230, s: 0.6 },
      substitution: { p: 'windmill', x: 560, y: 226, s: 0.6 },
      circularity: { p: 'kiln', x: 520, y: 368, s: 0.8 },
      greenSpending: { p: 'park', x: 300, y: 370, s: 0.8 },
    },
    restraintSpare: [{ p: 'notice', x: 90, y: 368 }, { p: 'notice', x: 140, y: 368 }, { p: 'notice', x: 240, y: 368 }],
  };
  cache.set(n, l);
  return l;
}
