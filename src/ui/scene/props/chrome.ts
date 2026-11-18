// Motion: flat mid-century poster props. Stage 0–3 = carburettor fifties → seventies box → eighties wedge → hybrid.
import type { Prop } from '../layout';
import { P, R, C, E, L, f, grid } from '../svg';

const carCls = (v: number) => 'c' + Math.floor(v * 5 % 5);

/** A car; faces right, road at y = 0. */
export const car: Prop = (a) => {
  const c = carCls(a.v);
  const wh = (x: number, r = 1.7) => C(x, -1.7, r, 'tyre');
  switch (a.stage) {
    case 0: return P('M-8 -2.5Q-8 -6 -4 -6.5Q-2 -10 2 -10Q6 -10 7.5 -6Q9 -5.5 9 -2.5Z', c) + P('M-2.6 -6.6Q-1.2 -9 1.8 -9Q4.6 -9 5.6 -6.6Z', 'glass') + wh(-4.5) + wh(5.5) + P('M-3 -9.2Q0 -10.6 3 -9.6', 'gloss');
    case 1: return P('M-8.5 -2.5V-6.2L-4.5 -6.6L-2.6 -9.6H4.6L6.8 -6.4L9 -6V-2.5Z', c) + P('M-1.8 -8.8H1.2V-6.6H-3.4ZM2 -8.8H4.2L5.6 -6.6H2Z', 'glass') + wh(-5) + wh(5.6);
    case 2: return P('M-8.5 -2.5V-5.8L-1 -9.4H4L8.8 -5.4V-2.5Z', c) + P('M-0.4 -8.6H3.6L6.6 -5.8H-3.6Z', 'glass') + wh(-5) + wh(5.6);
    default: return P('M-8 -2.5V-5.4Q-6 -6 -2.5 -9.6H3Q6.5 -9.4 8.6 -5.2V-2.5Z', c) + P('M-1.6 -8.8H2.8Q5 -8.6 6.4 -5.8H-4.2Z', 'glass') + wh(-5) + wh(5.4) + C(0, -4.2, 0.9, 'volt');
  }
};

/** A delivery van. */
export const van: Prop = (a) => {
  const wh = (x: number) => C(x, -2, 2, 'tyre');
  if (a.stage <= 0) return P('M-10 -2.5V-12Q-10 -14 -7 -14H5Q8 -14 9 -10L11 -7V-2.5Z', 'vn') + P('M6 -12.5L8.6 -8.4H5.4V-12.5Z', 'glass') + R(-8, -10, 10, 3, 'vs') + wh(-6) + wh(6);
  const long = a.stage >= 2;
  const x0 = long ? -14 : -11;
  return R(x0, -15, 19 - x0 - 5 + (long ? 0 : 0), 12.5, 'vn') + P('M5 -12H9L11.5 -7V-2.5H5Z', 'vn') + P('M6 -11H8.6L10.4 -7.4H6Z', 'glass') +
    R(x0 + 2, -11, 12, 3, a.stage >= 3 ? 'volts' : 'vs') + wh(x0 + 4) + wh(7.5);
};

export const lorry: Prop = () =>
  R(-20, -16, 26, 13.5, 'vn') + R(-18, -12, 22, 3, 'vs') + P('M7 -12H12L15 -7V-2.5H7Z', 'vn') + P('M8 -11H11.4L13.4 -7.4H8Z', 'glass') +
  C(-16, -2, 2, 'tyre') + C(-11, -2, 2, 'tyre') + C(11, -2, 2, 'tyre');

/** Distribution depot: a long shed, roller doors, vans at the bays. */
export const depot: Prop = (a) => {
  const w = 54 + a.v * 20, h = 18;
  let doors = '';
  const n = Math.floor((w - 10) / 12);
  for (let i = 0; i < n; i++) doors += R(-w / 2 + 5 + i * 12, -9, 8, 9, 'door');
  return R(-w / 2, -h, w, h, 'b') + P(`M${f(-w / 2 - 1)} ${-h}Q0 ${-h - 7} ${f(w / 2 + 1)} ${-h}Z`, 'rf') + R(-w / 2, -h + 2, w, 3, 'ac') + doors +
    `<g transform="translate(${f(-w / 2 + 9)} 4) scale(.8)">${van({ ...a, v: 0.2 }, { fx: () => {} })}</g>`;
};

/** Motorway: a pair of lanes with a dashed centre; origin left, w = length; centred on y = 0. */
export const lanes: Prop = (a) => {
  const w = a.w || 620;
  return R(0, -7.5, w, 15, 'road') + P(`M0 -7H${f(w)}M0 7H${f(w)}`, 'edge') + P(`M0 0H${f(w)}`, 'dash');
};
export const motorway: Prop = (a, o) => R(0, -10, a.w || 620, 3, 'verge') + lanes(a, o);

/** A cul-de-sac block: four bungalows on lawns, one car each driveway. */
export const suburb: Prop = (a) => {
  let s = R(-24, -2, 48, 4, 'lawn');
  const roofs = ['rf', 'r2', 'r3', 'rf'];
  for (let i = 0; i < 4; i++) {
    const x = -21 + i * 12;
    s += R(x, -7, 9, 6, 'b') + P(`M${x - 1} -7L${x + 4.5} -11L${x + 10} -7Z`, roofs[(i + Math.floor(a.v * 4)) % 4]) + R(x + 1.5, -5, 2, 2, 'w') + R(x + 5.5, -4, 2, 3, 'w');
  }
  return s;
};

/** A modern slab block (the town grows upward). */
export const slab: Prop = (a) => {
  const w = 12 + a.v * 10, h = 20 + a.v * 34;
  return R(-w / 2, -h, w, h, 'b') + R(-w / 2, -h, w, 3, 'rf') + grid(-w / 2 + 2, -h + 5, Math.floor((w - 3) / 3.4), Math.floor((h - 7) / 4.4), 3.4, 4.4, 2, 2.4) +
    R(-w / 2, -h, w * 0.6, h, 'gl', `style="fill:${a.u('airb')}"`);
};

/** A contrail across the sky, origin left, w = length; soft core and wide haze. */
export const contrail: Prop = (a) => {
  const w = a.w || 160, d = `M0 0Q${f(w * 0.5)} ${f(-w * 0.08)} ${f(w)} ${f(-w * 0.2)}`;
  return P(d, 'trail3') + P(d, 'trail2');
};

/** Out-of-town shopping: a big box and a sign on a pylon. */
export const mall: Prop = (a) => {
  const w = 74, h = 16;
  return R(-w / 2, -h, w, h, 'b') + R(-w / 2, -h, w, 4, 'r2') + R(-12, -10, 24, 10, 'glass') + P('M-12 -5H12', 'k k2') +
    L(w / 2 + 6, 0, w / 2 + 6, -30, 'k K') + R(w / 2, -40, 12, 11, 'ac') + C(w / 2 + 6, -34.5, 3, 'b') + shade(a.v);
};
const shade = (_v: number) => '';

/** A row of parked cars on tarmac. */
export const carpark: Prop = (a) => {
  let s = R(-22, -3, 44, 5, 'road') + P('M-22 2H22', 'edge');
  for (let i = 0; i < 5; i++) {
    const v = (a.v * 7 + i * 0.37) % 1;
    s += `<g transform="translate(${-18 + i * 9} 0) scale(.62)">${car({ ...a, v }, { fx: () => {} })}</g>`;
  }
  return s;
};

/** Airport: runway, terminal, tower. Origin left, w = length. */
export const airport: Prop = (a) => {
  const w = a.w || 220;
  let d = '';
  for (let x = 8; x < w - 8; x += 14) d += `M${f(x)} 0h7`;
  return R(0, -3, w, 6, 'road') + P(d, 'dash') + R(20, -14, 50, 9, 'b') + R(20, -14, 50, 2.5, 'rf') + R(26, -11, 38, 3, 'glass') +
    R(82, -26, 4, 21, 'b') + P('M78 -26H90L88 -31H80Z', 'glass') + L(84, -31, 84, -35, 'k');
};

/** An airliner, climbing to the right with its contrail. Stage: propliner → jet → jumbo → twin. */
export const plane: Prop = (a) => {
  const trail = P('M-14 0L-90 22', 'trail');
  const st = a.stage;
  const len = st === 2 ? 22 : st === 0 ? 15 : 18;
  const body = P(`M${-len} -1Q${-len} -3 ${-len + 3} -3H${len - 4}Q${len} -3 ${len + 1} 0Q${len} 1.6 ${len - 4} 1.6H${-len + 3}Z`, 'b') +
    (st === 2 ? P(`M${len - 9} -3Q${len - 6} -6 ${len - 2} -3Z`, 'b') : '') +
    P(`M-2 -1L-8 7H-4L5 -1Z`, 'b') + P(`M${-len + 1} -2L${-len - 2} -9H${-len + 3}L${-len + 6} -2Z`, 'rf') +
    (st === 0 ? C(-3, 4, 1.2, 'd') + C(-6, 6, 1.2, 'd') : R(-6, 2, 4, 1.8, 'd'));
  return trail + `<g transform="rotate(-16)">${body}</g>`;
};

/** Nodding donkey: the beam rocks (slower as the field empties is left to the CSS pace). */
export const derrick: Prop = (a, o) => {
  const beam = P('M-12 -1.5H10L13 -4V4L10 1.5H-12Z', 'd') + L(12, 3, 12, 14, 'k');
  o.fx('rock', 0, -14, 1, beam);
  return P('M-4 0L0 -14L4 0', 'k K') + R(-14, -4, 8, 4, 'mt') + L(-10, -4, -12, -12.5, 'k') + R(-15, -1, 34, 1.5, 'mt') + L(12, 0, 12, -1, 'k');
};

/** Oil tanks whose level shows the reserve. */
export const tanks: Prop = () =>
  `<g class="ry">${R(-16, -12, 13, 12, 'oil')}${R(2, -10, 11, 10, 'oil')}</g>` + P('M-16 -12h13v12h-13zM2 -10h11v10h-11z', 'k') + E(-9.5, -12, 6.5, 1.6, 'b') + E(7.5, -10, 5.5, 1.4, 'b');

/** Petrol station with a price board (a fuel duty in force). */
export const petrol: Prop = () =>
  R(-20, -14, 40, 2.5, 'ac') + L(-16, -12, -16, 0, 'k K') + L(16, -12, 16, 0, 'k K') + R(-7, -7, 3, 7, 'b') + R(4, -7, 3, 7, 'b') +
  L(26, 0, 26, -20, 'k') + R(21, -28, 10, 9, 'b') + P('M23 -25.5h6M23 -22.5h4', 'k') + C(28.5, -22.5, 0.9, 'd');

/** A charging gantry over the road (a cap in force). */
export const gantry: Prop = () =>
  P('M-30 0V-30M30 0V-30', 'k K') + R(-31, -33, 62, 4, 'mt') + R(-12, -40, 24, 7, 'ac') + P('M-8 -36.5h16', 'k') + C(-20, -28, 1.6, 'd') + C(20, -28, 1.6, 'd');

/** A cycle lane with riders (sufficiency). */
export const cycle: Prop = () => {
  const bike = (x: number) => C(x - 3, -2, 2, 'k') + C(x + 3, -2, 2, 'k') + P(`M${x - 3} -2L${x} -5L${x + 3} -2M${x} -5V-9`, 'k') + C(x, -10.5, 1.4, 'ac');
  return R(-26, -1, 52, 2.4, 'cyc') + bike(-12) + bike(8);
};

export const scrapyard: Prop = () =>
  P('M-22 0Q-16 -12 -6 -10Q0 -16 8 -9Q16 -12 22 0Z', 'mt') + P('M-14 -6h6v3h-6zM2 -8h7v3h-7zM-4 -3h6v3h-6z', 'c1') + L(18, 0, 26, -22, 'k K') + L(26, -22, 26, -10, 'k');

export const tree: Prop = (a) => L(0, 0, 0, -6, 'k') + C(0, -10, 5 + a.v * 2.5, 'tr');

export const turbines: Prop = (a, o) => {
  let s = '';
  [[0, 1], [-16, 0.8], [15, 0.9]].forEach(([x, k], i) => {
    const h = 34 * k;
    o.fx('spin', x, -h, k, P('M0 0L-1 -15L0 -16L1 -15ZM0 0L13.5 7L13.3 8.3L12.2 8.6ZM0 0L-12.5 8.6L-13.3 8.3L-13 7Z', 'b'));
    s += P(`M${x - 1.2 * k} 0L${x - 0.6 * k} ${-h}H${x + 0.6 * k}L${x + 1.2 * k} 0Z`, 'b');
    void i;
  });
  return s;
};

export const cloudPuff: Prop = (a) => {
  const w = 26 + a.v * 26;
  return R(-w / 2, -8, w, 8, 'cloud', 'rx="4"') + R(-w / 4, -13, w / 2.2, 9, 'cloud', 'rx="4.5"');
};

export const CHROME: Record<string, Prop> = {
  contrail, car, van, lorry, depot, lanes, motorway, suburb, slab, mall, carpark, airport, plane, derrick, tanks, petrol, gantry, cycle,
  scrapyard, tree, turbines, cloudPuff,
};
