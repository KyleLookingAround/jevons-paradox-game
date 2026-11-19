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

/** A stretch of road from the origin to (w, h): tarmac, white edges, a centre dash; width tapers with distance. */
export const road: Prop = (a) => {
  const dx = a.w || 60, dy = a.h || 0, len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 3.4, ny = (dx / len) * 1.6 + 0.01;
  const d = `M${f(nx)} ${f(ny)}L${f(dx + nx * 0.8)} ${f(dy + ny * 0.8)}L${f(dx - nx * 0.8)} ${f(dy - ny * 0.8)}L${f(-nx)} ${f(-ny)}Z`;
  return P(d, 'road') + P(`M0 0L${f(dx)} ${f(dy)}`, 'dash');
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


/** Path data by class, so a whole estate is a dozen elements rather than hundreds. */
type Acc = Record<string, string>;
const add = (acc: Acc, cls: string, d: string) => { acc[cls] = (acc[cls] ?? '') + d; };
const rect = (x: number, y: number, w: number, h: number) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`;

/** One house of the estate: semi or bungalow with a front garden, a garage with a car on the drive. v picks it. */
function house(acc: Acc, x: number, y: number, v: number, k: number, roofI: number): void {
  const roofs = ['rf', 'r2', 'r3', 'r4'];
  const w = 8 * k, h = (v > 0.5 ? 6.5 : 5) * k, rh = (v > 0.5 ? 4.2 : 3.2) * k;
  add(acc, 'lawn', rect(x - w / 2 - 2 * k, y - 0.6 * k, w + 6.5 * k, 2.4 * k));
  add(acc, 'hdg', `M${f(x - w / 2 - 2 * k)} ${f(y + 1.8 * k)}h${f(w + 6.5 * k)}`);
  add(acc, 'b', rect(x - w / 2, y - h, w, h));
  add(acc, roofs[roofI % 4], `M${f(x - w / 2 - 0.8 * k)} ${f(y - h)}L${f(x)} ${f(y - h - rh)}L${f(x + w / 2 + 0.8 * k)} ${f(y - h)}Z`);
  add(acc, 'w', rect(x - w / 2 + 1.2 * k, y - h + 1.4 * k, 1.8 * k, 1.6 * k) + rect(x + 1 * k, y - h + 1.4 * k, 1.8 * k, 1.6 * k));
  add(acc, 'door2', rect(x - 0.6 * k, y - 2.6 * k, 1.4 * k, 2.6 * k));
  // Garage to the right, a car on the drive in front of it.
  add(acc, 'b2', rect(x + w / 2, y - 3.6 * k, 4.2 * k, 3.6 * k));
  add(acc, 'door', rect(x + w / 2 + 0.6 * k, y - 2.8 * k, 3 * k, 2.8 * k));
  if (v * 7 % 1 > 0.3) add(acc, 'c' + Math.floor(v * 37 % 5), rect(x + w / 2 + 0.4 * k, y + 0.2 * k, 3.4 * k, 1.5 * k));
}
const flush = (acc: Acc, order: string[]) => order.filter((c) => acc[c]).map((c) => P(acc[c], c)).join('');
const HOUSE_ORDER = ['lawn', 'hdg', 'b', 'b2', 'rf', 'r2', 'r3', 'r4', 'w', 'door2', 'door', 'c0', 'c1', 'c2', 'c3', 'c4'];

/** A cul-de-sac on what was a field: the parcel turned to lawn behind a hedge, a stub road and a turning circle,
 *  houses round it. w = parcel width (local). */
export const close: Prop = (a) => {
  const w = a.w || 64, d = 20, hw = w / 2;
  let s = P(`M${f(-hw)} 0L${f(-hw + 3)} ${-d}H${f(hw - 3)}L${f(hw)} 0Z`, 'lawn2') + P(`M${f(-hw)} 0L${f(-hw + 3)} ${-d}H${f(hw - 3)}L${f(hw)} 0`, 'hdg');
  s += P(`M-1.6 0L-1.2 ${-d * 0.55}H1.2L1.6 0Z`, 'road') + E(0, -d * 0.62, 5.4, 2.2, 'road');
  const n = Math.max(4, Math.round(w / 13));
  const back: Acc = {}, front: Acc = {};
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = -hw + 6 + t * (w - 12), v = (a.v * 13 + i * 0.37) % 1;
    if (Math.abs(x) < 6) continue;
    house(back, x * 0.92, -d + 6, v, 0.85, i + Math.floor(a.v * 4));
    if (i % 2 === 0 || n < 5) house(front, x, -3, (v + 0.5) % 1, 1, i + 2);
  }
  // A tree or two in the gardens.
  return s + flush(back, HOUSE_ORDER) + C(-hw + 5, -d + 4, 2.6, 'tr') + flush(front, HOUSE_ORDER) + C(hw - 4, -5, 2.8, 'tr');
};

/** A shopping parade: flats over shops with awnings and lettered fascias, a pillar box. */
export const parade: Prop = (a) => {
  const names = ['GROCER', 'CHEMIST', 'WIMPY', 'TV & RADIO', 'BAKER'];
  const n = 4, sw = 17, w = n * sw;
  let s = R(-w / 2, -22, w, 22, 'b') + R(-w / 2, -22, w, 2.5, 'rf') + grid(-w / 2 + 2.5, -19, n * 2, 1, sw / 2, 0, 4, 3.5);
  const aw = ['aw1', 'aw2', 'aw3', 'aw1'];
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + i * sw;
    s += R(x + 0.8, -11.5, sw - 1.6, 3.2, 'fascia') + `<text x="${f(x + sw / 2)}" y="-9" text-anchor="middle" class="fasc">${names[(i + Math.floor(a.v * 5)) % 5]}</text>` +
      P(`M${f(x + 0.6)} -8.3H${f(x + sw - 0.6)}L${f(x + sw + 0.6)} -5.6H${f(x - 0.6)}Z`, aw[i]) + R(x + 2, -5.6, sw - 4, 5.6, 'glass');
  }
  return s + R(w / 2 + 2, -4.5, 1.6, 4.5, 'c0', 'rx=".6"');
};

/** A new school: flat-roofed classrooms with long windows, a clock, a playing field with goalposts. */
export const school: Prop = () =>
  R(-34, -1, 32, 4, 'lawn') + P('M-32 1.5V-3M-32 -3h4M-6 1.5V-3M-6 -3h-4', 'k k2') +
  R(0, -12, 34, 12, 'b') + R(0, -12, 34, 2, 'rf') + grid(2, -8.4, 6, 1, 5.3, 0, 4.4, 3.6, 'glass') + R(12, -18, 9, 6, 'b') +
  C(16.5, -15, 1.8, 'b2') + L(16.5, -15, 16.5, -16.3, 'k') + R(15, -4.6, 4, 4.6, 'door2');

/** A filling station on the arterial: a canopy on stalks, pumps, a lit brand sign on a pole. */
export const station: Prop = () =>
  R(-18, -13, 30, 2.6, 'ac') + R(-18, -10.4, 30, 1, 'r3') + L(-14, -10, -14, 0, 'k K') + L(8, -10, 8, 0, 'k K') +
  R(-8, -6, 2.4, 6, 'c1') + R(0, -6, 2.4, 6, 'c1') + R(14, -9, 12, 9, 'b') + R(14, -9, 12, 1.6, 'rf') + R(16, -6.5, 8, 3, 'glass') +
  L(30, 0, 30, -22, 'k K') + C(30, -26, 5, 'c2') + `<text x="30" y="-24.6" text-anchor="middle" class="fasc fb">PETROL</text>`;

/** A blue motorway direction sign on two legs at the verge. */
export const msign: Prop = () =>
  P('M-14 0V-20M14 0V-20', 'k K') + R(-20, -34, 40, 15, 'msn') + `<text x="0" y="-28.2" text-anchor="middle" class="msnt">THE SOUTH</text>` +
  `<text x="0" y="-22" text-anchor="middle" class="msnt">AIRPORT &#9992;</text>`;

/** A jet parked on the apron. */
export const jet: Prop = () =>
  P('M-16 -2Q-16 -4 -13 -4H11Q15 -4 16 -2Q15 -0.6 11 -0.6H-13Q-16 -0.6 -16 -2Z', 'b') + P('M-3 -2.4L-8 3H-5L4 -2.4Z', 'b2') +
  P('M-15 -3.4L-17 -9H-14L-11 -3.6Z', 'rf') + R(-10, -3.2, 18, 0.8, 'vs');

export const CHROME: Record<string, Prop> = {
  contrail, road, car, van, lorry, depot, lanes, motorway, suburb, slab, mall, carpark, airport, plane, derrick, tanks, petrol, gantry, cycle,
  scrapyard, tree, turbines, cloudPuff, close, parade, school, station, msign, jet,
};
