// Plenty (M5), in the seed-catalogue style: flat litho fills with the key line a hair off register (`.reg`, drawn
// offset), crop rows as bands. Machines by stage: 0 the horse and plough, 1 the tractor, 2 the centre pivot, 3 drip
// lines. Fields turn from striped strips to pivot circles at stage 2. Drawn about the bottom centre, y up negative.
import type { Prop } from '../layout';
import { P, R, C, E, L, f } from '../svg';

/** The key plate, printed a little to the right and up of the colour (the litho out of register). */
const reg = (d: string) => `<path d="${d}" class="reg" transform="translate(1 -.7)"/>`;
const FIELD = ['sd1', 'sd2', 'sd3', 'sd5', 'sd6'];

/** A field seen from the low hill: a strip of crop rows until the pivots come, then a green circle on a brown square. */
const field: Prop = (a) => {
  const w = a.w || 60, h = a.h || 12, c = FIELD[Math.floor(a.v * FIELD.length) % FIELD.length];
  const box = `M${f(-w / 2)} 0L${f(-w / 2 + 4)} ${f(-h)}H${f(w / 2 + 4)}L${f(w / 2)} 0Z`;
  if (a.stage >= 2 && a.v > 0.25) {
    return P(box, 'sd4') + E(2, -h / 2, w * 0.44, h * 0.46, a.v > 0.6 ? 'sd2' : 'sd5') + L(2, -h / 2, 2 + w * 0.42, -h * 0.6, 'k k2') + reg(box);
  }
  let rows = '';
  for (let y = -2.5; y > -h; y -= 2.6) rows += `M${f(-w / 2 + 1 + (-y / h) * 4)} ${f(y)}H${f(w / 2 - 1 + (-y / h) * 4)}`;
  return P(box, c) + P(rows, 'sdr') + reg(box);
};

/** The machines on the near field, by stage. */
const machine: Prop = (a, o) => {
  switch (a.stage) {
    case 0: // a horse and plough
      return P('M-12 -6Q-12 -10 -7 -10H1Q4 -10 5 -13L7 -14L8 -11L6 -8V-6L5 0H3.6L3.4 -5H-8.4L-9 0H-10.4Z', 'sd4') + L(-12, -8, -20, -3, 'k') +
        P('M-20 -3L-26 0H-17Z', 'mt k') + C(6.8, -12.6, 0.5, 'd');
    case 1: // a tractor with a plough behind
      o.fx('smoke', -1, -16, 0.35);
      return R(-6, -10, 10, 5, 'rf') + R(-2, -15, 5, 5, 'b2') + C(-5, -4, 4, 'tyre') + C(4.5, -2.4, 2.4, 'tyre') + L(-1, -15, -1, -18, 'k K') +
        L(-9, -4, -16, -2, 'k') + P('M-16 -2L-21 0H-13Z', 'mt k');
    case 2: { // the centre pivot: a long truss on wheeled towers, spraying
      let s = '';
      for (let i = 0; i < 4; i++) { const x = -30 + i * 20; s += L(x, 0, x + 3, -10, 'k') + L(x + 6, 0, x + 3, -10, 'k') + C(x + 3, 0, 1.6, 'tyre'); }
      s += P('M-27 -10Q0 -15 33 -10', 'k K', 'fill="none"');
      for (let x = -24; x < 32; x += 7) s += P(`M${x} -11l-2 7h4z`, 'spray');
      return s;
    }
    default: { // drip lines: the rows threaded with pipe, a filter and a control box
      let s = '';
      for (let i = 0; i < 4; i++) s += P(`M-34 ${-i * 2.4}H34`, 'k k2') + P(Array.from({ length: 9 }, (_, j) => `M${-30 + j * 7.5} ${-i * 2.4 - 0.2}v.4`).join(''), 'seep');
      return s + R(30, -10, 7, 10, 'b2 k') + R(31.5, -8, 4, 2, 'lit') + C(26, -4, 3, 'mt k');
    }
  }
};

/** The farmstead: a white house, the red barn, a windpump over the old well, a silo. The place grows out from here. */
const farmstead: Prop = (a, o) => {
  if (a.stage >= 1) o.fx('smoke', -15, -24, 0.35);
  const barn = 'M2 0V-14L11 -20L20 -14V0Z';
  return R(-22, -14, 14, 14, 'b') + P('M-24 -14L-15 -21L-6 -14Z', 'sd4') + R(-19, -10, 3, 3, 'w') + R(-13, -10, 3, 3, 'w') + R(-17, -6, 3, 6, 'd') +
    P(barn, 'rf') + P('M7 0V-9H15V0', 'b2') + reg(barn) + R(22, -26, 6, 26, 'mt k') + P('M22 -26a3 3 0 0 1 6 0Z', 'mt k') +
    L(-30, 0, -30, -26, 'k') + L(-34, 0, -30, -26, 'k') + L(-26, 0, -30, -26, 'k') + P('M-30 -26l-5 -3v6zM-30 -26l5 -3v6z', 'b2 k');
};

/** Fertilised fields' works: the merchant's store, sacks stacked at the door, a hopper. */
const sackStore: Prop = () =>
  R(-18, -14, 30, 14, 'b') + P('M-20 -14L-3 -21L14 -14Z', 'sd4') + R(-6, -9, 7, 9, 'd') + R(14, -20, 7, 20, 'mt k') + P('M14 -20l3.5 -5l3.5 5z', 'mt k') +
  P('M-16 0q2 -4 4 0zM-12 0q2 -4 4 0zM-14 -3.4q2 -4 4 0z', 'b2 k');

/** Meat and dairy: the long byre and two silos, the cattle yard fenced in front. */
const dairy: Prop = () =>
  R(-26, -11, 34, 11, 'rf') + P('M-28 -11L-9 -17L10 -11Z', 'sd4') + R(12, -24, 6, 24, 'b2 k') + R(19, -20, 6, 20, 'b2 k') +
  P('M12 -24a3 3 0 0 1 6 0zM19 -20a3 3 0 0 1 6 0z', 'mt k') + P('M-30 4H8M-30 1H8', 'k k2');
/** A cow, side on (black and white). */
const cow: Prop = (a) => P('M-5 -6H3Q5 -6 5.5 -4.5L7 -5L7.4 -3L6 -2.6V0H5V-2.4H-3.6V0H-4.6V-2.4Q-6 -3 -5 -6Z', a.v > 0.5 ? 'b k' : 'd') +
  (a.v > 0.5 ? E(-1, -4.4, 1.6, 1, 'd') : '');
/** A feedlot: pens of cattle shoulder to shoulder, the feed bunk along the front. */
const feedlot: Prop = (a) => {
  let s = R(-24, -2, 48, 2, 'sd4') + P('M-24 -8H24M-24 -2H24M-12 -8V-2M0 -8V-2M12 -8V-2', 'k k2');
  for (let i = 0; i < 8; i++) s += `<g transform="translate(${-20 + i * 5.6} -2.2) scale(.55)">${cow({ ...a, v: (i * 0.37) % 1 }, { fx: () => {} })}</g>`;
  return s;
};

/** Irrigated orchards: a row of round trees on their own shadows, a drip line beneath. */
const orchardRow: Prop = (a) => {
  let s = P('M-24 0H24', 'k k2');
  for (let i = 0; i < 5; i++) { const x = -20 + i * 10; s += L(x, 0, x, -3, 'k') + C(x, -6, 4 + (i % 2) * 0.6, a.v > 0.5 ? 'tr' : 'sd5'); }
  return s;
};
/** The packing shed for the orchards: a lettered gable, crates on the platform. */
const packShed: Prop = () =>
  R(-20, -13, 40, 13, 'b') + P('M-22 -13L0 -20L22 -13Z', 'rf') + R(-16, -8, 8, 8, 'd') + R(4, -4, 4, 4, 'sd6') + R(9, -4, 4, 4, 'sd6') + R(6.5, -8, 4, 4, 'sd6');

/** Air-freighted produce: a cold store and a windsock by a grass strip. */
const coldStore: Prop = () =>
  R(-16, -10, 26, 10, 'b') + R(-16, -10, 26, 2, 'wa') + L(16, 0, 16, -14, 'k') + P('M16 -14l7 1.4v2.4l-7 1.2z', 'ac') + R(-40, 1, 80, 2, 'gd');

/** Biofuels: the distillery's column and its round tanks. */
const distillery: Prop = (a, o) => {
  o.fx('steam', -8, -34, 0.5);
  return R(-14, -12, 20, 12, 'b') + R(-10, -32, 5, 20, 'mt k') + C(12, -6, 6, 'b2 k') + C(24, -5, 5, 'b2 k') + P('M-14 -12h20', 'k k2');
};

/** Return flow: water soaking back through the soil to the aquifer (a dashed run, falling). */
const seep: Prop = () => P('M0 -10q2 3 0 6q-2 3 0 6', 'seep') + P('M-1.6 0.6L0 3L1.6 0.6', 'seep');
/** Water consumed: vapour rising off the crop, gone from the valley's water for good. */
const vapour: Prop = () => P('M0 0q3 -4 0 -8t0 -8', 'vap') + P('M6 -2q3 -4 0 -8t0 -8', 'vap');
/** Algae on the river at high nitrate (the Green Tide). */
const scum: Prop = (a) => E(0, -1, 10 + a.v * 8, 1.6, 'scum');
/** A licence board: a water meter on a post, the licence pinned beside it. */
const meterBoard: Prop = () => L(0, 0, 0, -14, 'k K') + R(-7, -24, 14, 10, 'b k') + C(0, -19, 3, 'b2 k') + L(0, -19, 2, -21, 'k') + R(5, -12, 6, 8, 'b k');
/** The drip subsidy's board: the Ministry's grant lettered on a white board. */
const grantBoard: Prop = () => L(-8, 0, -8, -12, 'k K') + L(8, 0, 8, -12, 'k K') + R(-12, -22, 24, 10, 'b k') + R(-12, -22, 24, 3, 'wa') + P('M-9 -16h18M-9 -14h12', 'k k2');

export const SEED: Record<string, Prop> = { field, machine, farmstead, sackStore, dairy, cow, feedlot, orchardRow, packShed, coldStore, distillery, seep, vapour, scum, meterBoard, grantBoard };
