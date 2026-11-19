// M3 props: what the new mechanics add to each Industry's picture, in its Age's idiom.
//   Compute: the price plate struck through ("free at the point of use") and the hoarding where the bill is paid.
//   Motion: the queue on the motorway (congestion) and the heavy cars on the forecourt (a fuel-economy standard biting
//   back), the new carriageway (roads built).
//   Every Age: the side effect of a lever biting back where it is not more specific (another pit, another works).
import type { Prop } from '../layout';
import { P, R, C, L, f } from '../svg';

/* ---------------- Compute (terminal) ---------------- */

/** A price plate on a hall, struck through: the user sees £0.00 (the bill goes elsewhere). */
const priceTag: Prop = () =>
  R(-15, -10, 30, 10, 'ptg') + `<text x="0" y="-2.6" text-anchor="middle" class="tlab ptt">£0.00</text>` + P('M-16 -1L16 -9.5', 'ptx');

/** The hoarding where the bill for "free" is paid: an advertising board on the floor, its screen flickering with
 *  adverts, the cables from the free halls coming in at its foot. */
const adBoard: Prop = (a, o) => {
  o.fx('blink', 0, -30, 1, R(-14, -36, 28, 3, 'ptg'));
  return L(-10, 0, -10, -16, 'k') + L(10, 0, 10, -16, 'k') + R(-20, -40, 40, 24, 'k adb') + P('M-20 -34H20M-20 -22H20', 'k k2') +
    `<text x="0" y="-26" text-anchor="middle" class="tlab">ADS</text>` + `<text x="0" y="-4" text-anchor="middle" class="tlab ptt">BILL ←</text>`;
};

/** Another hall going up (a lever biting back: the saving spent on more). */
const newHall: Prop = () =>
  R(-22, -18, 44, 18, 'k') + P('M-22 -18l6 -4h44l-6 4M28 -22V-4l-6 4', 'k iso') + P('M-18 -12h36M-18 -6h36', 'k k2', 'stroke-dasharray="2 2"') +
  `<text x="0" y="-26" text-anchor="middle" class="tlab">NEW HALL</text>`;

/* ---------------- Motion (chrome) ---------------- */

/** A standing queue: cars nose to tail, drawn as one path per colour (a queue is many cars and few nodes). Static, so
 *  it costs nothing to keep. w = lane length, v = seed. */
const jam: Prop = (a) => {
  const n = Math.max(2, Math.round((a.w || 60) / 19));
  const body = ['', ''], glass: string[] = [], tyres: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = i * 19 + ((i * 7) % 3);
    body[(i + Math.round(a.v * 3)) % 2] += `M${f(x - 8.5)} -2.5V-5.8L${f(x - 1)} -9.4H${f(x + 4)}L${f(x + 8.8)} -5.4V-2.5Z`;
    glass.push(`M${f(x - 0.4)} -8.6H${f(x + 3.6)}L${f(x + 6.6)} -5.8H${f(x - 3.6)}Z`);
    tyres.push(`M${f(x - 6.7)} -1.7a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0M${f(x + 3.9)} -1.7a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0`);
  }
  return P(body[0], 'c1') + P(body[1], 'c3') + P(glass.join(''), 'glass') + P(tyres.join(''), 'tyre');
};

/** Heavier cars: a forecourt of big estates and four-by-fours (the fuel-economy standard biting back). */
const suvs: Prop = (a) => {
  let s = R(-30, -1, 62, 3, 'verge');
  for (let i = 0; i < 3; i++) {
    const x = -20 + i * 21, c = ['c1', 'c2', 'c3'][i];
    s += `<g transform="translate(${x} 0) scale(1.35)">` + P('M-8.5 -2.5V-8.6Q-8.5 -10 -7 -10.2L-4 -10.6L-2.6 -13.4H5.4L7.6 -10.4L9 -10V-2.5Z', c) +
      P('M-1.8 -12.6H1.6V-10.6H-3ZM2.4 -12.6H5L6.4 -10.6H2.4Z', 'glass') + C(-5, -2, 2.3, 'tyre') + C(5.4, -2, 2.3, 'tyre') + R(-9, -14.4, 18, 0.9, 'k') + '</g>';
  }
  return s + P('M-30 -26h18v8h-18z', 'sgn') + `<text x="-21" y="-20" text-anchor="middle" class="sgt">4×4</text>` + L(-21, -18, -21, 0, 'k');
};

/** A new carriageway beside the motorway (roads built: the speed bought, for a while). */
const carriageway: Prop = (a) => {
  const w = a.w || 620;
  return R(0, -7, w, 7, 'road') + P(`M0 -3.5H${f(w)}`, 'dash') + P(`M0 -7H${f(w)}M0 0H${f(w)}`, 'k k2');
};

/** The same queue for the new road (it fills again). */
export const M3_TERMINAL: Record<string, Prop> = { priceTag, adBoard, newHall };
export const M3_CHROME: Record<string, Prop> = { jam, suvs, carriageway };
