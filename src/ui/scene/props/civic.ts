// Civic props: the Commons (where restraint's money goes) and the Charters' landmarks. Drawn with the shared classes
// (.b .b2 .rf .k .d .w .lit .tr .wa .gd .ac .mt), so each art style renders them in its own idiom: hatched in the
// engraving, keylined silhouettes with lit windows in the chromolithograph, flat colour in the travel poster,
// wireframe on the vector display, neon-edged in the night city. Origin bottom centre, y up is negative; the scale
// ladder is about 2.5 units to the metre at s = 1 (a cottage is 15 units to the ridge).
//
// `a.w` carries the Commons level (1–3): each level adds a visible detail (a second wing, a bandstand, more lamps).
import type { Prop } from '../layout';
import { P, R, C, E, L, G, f, grid } from '../svg';
import { shade, tree } from './common';

const lvl = (a: { w: number }) => Math.max(1, Math.min(3, Math.round(a.w || 1)));
/** A run of round-headed windows (path), n across, from x, sill at y, w wide, h tall, step dx. */
const arches = (x: number, y: number, n: number, dx: number, w: number, h: number) => {
  let d = '';
  for (let i = 0; i < n; i++) { const x0 = x + i * dx; d += `M${f(x0)} ${f(y)}V${f(y - h + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x0 + w)} ${f(y - h + w / 2)}V${f(y)}Z`; }
  return d;
};
const pediment = (x0: number, x1: number, y: number, h: number) => P(`M${f(x0 - 1)} ${f(y)}L${f((x0 + x1) / 2)} ${f(y - h)}L${f(x1 + 1)} ${f(y)}Z`, 'rf');
const columns = (x0: number, x1: number, y0: number, y1: number, n: number) => {
  let d = '';
  for (let i = 0; i < n; i++) { const x = x0 + ((x1 - x0) * i) / Math.max(1, n - 1); d += `M${f(x - 0.8)} ${f(y0)}V${f(y1)}h1.6V${f(y0)}z`; }
  return P(d, 'b');
};
/** Small lamp standards with lit heads (gaslight makes them glow). */
const lamps = (xs: number[], h = 9) => P(xs.map((x) => `M${f(x)} 0V${f(-h)}`).join(''), 'k') + P(xs.map((x) => `M${f(x - 1.1)} ${f(-h - 2.2)}h2.2v2.2h-2.2z`).join(''), 'lit');
const railing = (x0: number, x1: number, y = 0, h = 3) => {
  let d = `M${f(x0)} ${f(y - h)}H${f(x1)}`;
  for (let x = x0; x <= x1; x += 2.2) d += `M${f(x)} ${f(y)}v${f(-h - 0.6)}`;
  return P(d, 'k k2');
};

/* ------------------------------------------------------------------ */
/* The Commons                                                         */
/* ------------------------------------------------------------------ */

/** Public baths and wash-house (1846): a long classical block, BATHS over the door, the boiler stack behind;
 *  level 2 a second (women's) wing, level 3 a drying green with lines of washing. */
export const baths: Prop = (a, o) => {
  const L2 = lvl(a);
  o.fx('steam', 22, -48, 0.7);
  let s = P('M20 0L21 -46H24L25 0Z', 'b') + R(20.4, -48, 4.2, 2.4, 'd') + shade(22.5, -46, 1.6, 46, a.hatch());
  s += R(-26, -20, 46, 20, 'b') + P('M-28 -20H22L20 -23H-26Z', 'rf') + shade(12, -20, 8, 20, a.hatch());
  s += P(arches(-23, -3, 7, 6.2, 3.2, 12), 'w') + R(-5, -17, 10, 3, 'ac') + pediment(-8, 8, -20, 6);
  s += P('M-2 0V-6A2 2 0 0 1 2 -6V0Z', 'd');
  if (L2 >= 2) s += R(-44, -14, 18, 14, 'b') + P('M-45 -14H-26V-16H-43Z', 'rf') + P(arches(-42, -3, 3, 5.4, 3, 8), 'w') + shade(-32, -14, 6, 14, a.hatch());
  if (L2 >= 3) {
    s += P('M26 0V-9M46 0V-9M26 -8L46 -7M26 -5L46 -4', 'k k2');
    s += P('M28 -8v3h2.6v-3zM32 -7.8v2.6h2v-2.6zM37 -7.6v3.4h2.4v-3.4zM41 -7.4v2.2h2.8v-2.2zM29 -5v2.4h2v-2.4zM35 -4.6v2h3v-2z', 'ac');
  }
  return s;
};

/** People's park, Birkenhead fashion: railings and a gate lodge, a serpentine lake and path, specimen trees; level 2
 *  villas round its edge, level 3 a bandstand. */
export const parkC: Prop = (a, o) => {
  const L2 = lvl(a);
  let s = P('M-44 0L-38 -10H38L44 0Z', 'gd') + P('M-44 0L-38 -10H38L44 0Z', 'tr', 'fill-opacity=".45"');
  s += P('M-30 -3C-18 -9 -6 -2 4 -6S24 -9 32 -4C22 -2 10 -3 2 -1S-20 -1 -30 -3Z', 'wa') + P('M-38 -2C-24 -6 -12 -7 0 -8S22 -9 36 -8', 'k k2', 'stroke-dasharray="1.5 1.5"');
  s += G(tree({ ...a, v: 0.2 }, o), 'transform="translate(-26 -6) scale(.7)"') + G(tree({ ...a, v: 0.9 }, o), 'transform="translate(20 -7) scale(.75)"') +
    G(tree({ ...a, v: 0.6 }, o), 'transform="translate(-6 -9) scale(.55)"') + G(tree({ ...a, v: 0.4 }, o), 'transform="translate(34 -3) scale(.65)"');
  s += railing(-44, -14) + railing(-6, 44);
  // Gate lodge: a little Italianate box by the gates.
  s += R(-14, -9, 8, 9, 'b') + P('M-15 -9L-10 -12.5L-5 -9Z', 'rf') + R(-11.5, -4, 3, 4, 'd') + P('M-6 0V-6M-14 0V-6', 'k K');
  if (L2 >= 2) {
    for (const [x, y, k] of [[-36, -10, 0.7], [28, -10, 0.75], [4, -10.5, 0.6]] as [number, number, number][]) {
      s += G(R(-6, -9, 12, 9, 'b') + P('M-7 -9L0 -13L7 -9Z', 'rf') + grid(-4, -7, 3, 2, 3, 4, 1.6, 2.2) + shade(3, -9, 3, 9, a.hatch()), `transform="translate(${x} ${y}) scale(${k})"`);
    }
  }
  if (L2 >= 3) s += G(P('M-5 0V-6M5 0V-6M-3 0V-6M3 0V-6', 'k') + P('M-7 -6L0 -10L7 -6Z', 'rf') + E(0, 0, 6, 1.2, 'b'), 'transform="translate(10 -4)"') + lamps([-20, 0, 24], 6);
  return s;
};

/** Mechanics' institute: a sober classical hall with a portico and a lantern; level 2 a lecture-theatre wing,
 *  level 3 lamps at the steps (evening classes). */
export const institute: Prop = (a) => {
  const L2 = lvl(a);
  let s = R(-18, -24, 36, 24, 'b') + shade(10, -24, 8, 24, a.hatch()) + P('M-19 -24H19V-26H-19Z', 'rf');
  s += pediment(-10, 10, -26, 6) + columns(-9, 9, 0, -20, 4) + R(-11, -21, 22, 1.6, 'b');
  s += grid(-16, -20, 2, 2, 3.4, 9, 2, 5) + grid(11, -20, 2, 2, 3.4, 9, 2, 5);
  s += R(-2, -36, 4, 4, 'b') + P('M-3 -36L0 -39L3 -36Z', 'rf') + R(-1, -35, 2, 2, 'lit');
  s += P('M-12 0h24v1.5h-24z', 'b');
  if (L2 >= 2) s += R(18, -16, 18, 16, 'b') + P('M17 -16L27 -21L37 -16Z', 'rf') + P(arches(20, -3, 3, 5, 3, 9), 'w') + shade(30, -16, 6, 16, a.hatch());
  if (L2 >= 3) s += lamps([-13, 13], 8);
  return s;
};

/** Free library (Ewart's Act, 1850): a gabled reading room with tall lit windows and a turret; level 2 a lending
 *  wing, level 3 the reading room lit all evening and lamps at the door. */
export const library: Prop = (a) => {
  const L2 = lvl(a);
  let s = R(-20, -22, 40, 22, 'b') + P('M-22 -22L0 -34L22 -22Z', 'rf') + shade(12, -22, 8, 22, a.hatch());
  s += P(arches(-17, -4, 5, 7, 4, 14), L2 >= 3 ? 'lit' : 'w') + C(0, -27, 2.6, 'lit');
  s += R(-26, -40, 7, 40, 'b') + P('M-27 -40L-22.5 -48L-18 -40Z', 'rf') + R(-24, -34, 3, 5, 'w') + shade(-21, -40, 2, 40, a.hatch());
  s += R(-3, -8, 6, 8, 'd') + R(-6, -10, 12, 1.6, 'ac');
  if (L2 >= 2) s += R(20, -15, 16, 15, 'b') + P('M19 -15L28 -20L37 -15Z', 'rf') + grid(22, -12, 3, 2, 4.4, 5.5, 2.4, 3.4, 'lit') + shade(31, -15, 5, 15, a.hatch());
  if (L2 >= 3) s += lamps([-9, 9], 8);
  return s;
};

/** The town clock: a tall clock tower over the market, its dials lit; level 2 a market hall at its foot, level 3 a
 *  ring of lamps. */
export const clockC: Prop = (a) => {
  const L2 = lvl(a);
  let s = R(-5, -56, 10, 56, 'b') + shade(2, -56, 3, 56, a.hatch()) + R(-6.5, -60, 13, 4, 'b') + P('M-6.5 -60L0 -74L6.5 -60Z', 'rf') + L(0, -74, 0, -78, 'k');
  s += C(0, -51, 3.6, 'lit') + C(0, -51, 3.6, 'k') + P('M0 -51V-53.6M0 -51l1.8 1', 'k K');
  s += P(arches(-2, -20, 1, 0, 4, 10), 'w') + P(arches(-2, -34, 1, 0, 4, 8), 'w') + R(-2, -6, 4, 6, 'd');
  if (L2 >= 2) s += R(-26, -12, 18, 12, 'b') + R(8, -12, 18, 12, 'b') + P('M-27 -12H-8V-14H-27ZM8 -12H27V-14H8Z', 'rf') +
    P(arches(-24, -2, 3, 5.6, 3.6, 8) + arches(10, -2, 3, 5.6, 3.6, 8), 'd');
  if (L2 >= 3) s += lamps([-30, -12, 12, 30], 8);
  return s;
};

/** Allotments (the Commons' own, bigger than a lever's patch): fenced strips, sheds, bean poles, a water butt;
 *  levels add strips and a second shed. */
export const allotmentsC: Prop = (a) => {
  const L2 = lvl(a), n = 3 + L2 * 2;
  const w = n * 9;
  let s = P(`M${f(-w / 2 - 3)} 0L${f(-w / 2 + 1)} -10H${f(w / 2 - 1)}L${f(w / 2 + 3)} 0Z`, 'gd');
  let rows = '';
  for (let i = 0; i < n; i++) { const x = -w / 2 + i * 9; rows += `M${f(x + 1)} 0l2.6 -9M${f(x + 4)} 0l2.6 -9M${f(x + 7)} 0l2.6 -9`; }
  s += P(rows, 'k tr2') + P(`M${f(-w / 2 - 3)} 0H${f(w / 2 + 3)}`, 'k');
  s += R(w / 2 - 8, -15, 8, 7, 'b') + P(`M${f(w / 2 - 9)} -15l5 -3l5 3z`, 'rf') + R(w / 2 - 6, -12, 2, 4, 'd');
  s += P(`M${f(-w / 2 + 4)} -10l-1 -9M${f(-w / 2 + 7)} -10l1 -9M${f(-w / 2 + 2.5)} -18.5l6 0`, 'k') + P(`M${f(-w / 2 + 4)} -16c1 -1 2 -1 3 0`, 'k tr2');
  s += E(-w / 2 + 12, -10, 1.6, 0.6, 'b') + R(-w / 2 + 10.4, -14, 3.2, 4, 'b');
  if (L2 >= 3) s += R(-6, -16, 7, 6, 'b') + P('M-7 -16l4.5 -2.6l4.5 2.6z', 'rf');
  return s;
};

/** Municipal buses: a corporation bus garage with its arched doors and two double-deckers on the forecourt, a
 *  shelter at the kerb; level 2 a third bus, level 3 a second garage bay. */
export const buses: Prop = (a) => {
  const L2 = lvl(a);
  const bus = (x: number) => G(P('M0 0V-10.5Q0 -11.5 1 -11.5H23Q24.5 -11.5 24.5 -10V0Z', 'ac') + P('M1 -6H24M1 -5.4H24', 'k k2') +
    grid(2, -10.5, 6, 1, 3.6, 0, 2.6, 2.6) + grid(4, -4.8, 5, 1, 3.6, 0, 2.6, 2.4) + C(5, 0, 1.6, 'd') + C(19.5, 0, 1.6, 'd'), `transform="translate(${x} 0)"`);
  let s = R(-34, -20, 44, 20, 'b') + P('M-35 -20Q-12 -27 11 -20Z', 'rf') + shade(2, -20, 8, 20, a.hatch());
  s += P(arches(-31, 0, 3, 13, 10, 15), 'd') + R(-20, -19, 18, 3, 'w');
  if (L2 >= 3) s += R(10, -16, 18, 16, 'b') + P('M9 -16Q19 -21 29 -16Z', 'rf') + P(arches(12, 0, 1, 0, 12, 13), 'd');
  s += bus(12) + bus(-40);
  if (L2 >= 2) s += bus(38);
  s += P('M66 0V-9M74 0V-9', 'k') + P('M64 -9H76V-10.5H64Z', 'rf') + P('M70 -9V-3', 'k k2');
  return s;
};

/** The shorter working week: Saturday afternoon. A lido with a diving stage and bathers, a cricket field with its
 *  pavilion; level 2 deck chairs and a café, level 3 a second pool. */
export const shortweek: Prop = (a) => {
  const L2 = lvl(a);
  let s = P('M-46 0L-40 -12H40L46 0Z', 'gd') + P('M-46 0L-40 -12H40L46 0Z', 'tr', 'fill-opacity=".5"');
  s += P('M-36 -2L-32 -9H2L4 -2Z', 'b') + P('M-34 -3L-31 -8H0L1.5 -3Z', 'wa') + P('M-26 -5.5h8M-14 -6h6M-22 -4h10', 'k k2');
  s += P('M-38 -2V-14M-34 -2V-14M-39 -14H-28', 'k') + P('M-30 -14l2 3', 'k');
  s += C(-20, -6, 0.8, 'd') + C(-12, -7, 0.8, 'd') + C(-6, -5, 0.8, 'd');
  // Cricket: the square, two sets of stumps, a pavilion with a flag.
  s += E(24, -6, 12, 2.6, 'tr', 'fill-opacity=".6"') + P('M18 -6v-2M30 -6v-2', 'k') + C(24, -7, 0.7, 'd');
  s += R(34, -10, 10, 8, 'b') + P('M33 -10L39 -13.5L45 -10Z', 'rf') + R(36, -6, 6, 1, 'ac') + P('M39 -13.5V-19', 'k') + P('M39 -19h4l-1 1.2l1 1.2h-4z', 'ac');
  if (L2 >= 2) s += P('M6 -2l2 -3h3l-1 3zM10 -2.5l2 -3h3l-1 3z', 'ac') + R(-44, -9, 6, 6, 'b') + P('M-45 -9h8l-1 -2h-6z', 'ac');
  if (L2 >= 3) s += P('M-30 -9L-27 -12H-6L-5 -9Z', 'wa');
  return s;
};

/** Repair cafés: a shopfront with REPAIR lettered over it and a workbench in the window (a soldering lamp, a
 *  radio opened up), a bicycle at the kerb; level 2 a second unit, level 3 a queue at the door. */
export const repair: Prop = (a) => {
  const L2 = lvl(a);
  const unit = (x: number) => G(R(-11, -20, 22, 20, 'b') + R(-11, -20, 22, 4, 'ac') + P('M-8 -17.5h2v1.4h-2zM-4 -17.5h2v1.4h-2zM0 -17.5h2v1.4h-2zM4 -17.5h2v1.4h-2z', 'd') +
    R(-9, -13, 12, 9, 'lit') + R(5, -13, 4, 13, 'd') + P('M-8 -6h10M-6 -6v-3h3v3M0 -6l1.6 -4', 'k') + C(1.6, -10.4, 0.8, 'lit') + shade(6, -20, 5, 20, a.hatch()), `transform="translate(${x} 0)"`);
  let s = unit(0);
  if (L2 >= 2) s += unit(23);
  s += C(-17, -2.2, 2.2, 'k') + C(-11, -2.2, 2.2, 'k') + P('M-17 -2.2l3 -3.6h3l-3 3.6M-14 -5.8l-0.6 -1.4', 'k');
  if (L2 >= 3) s += P('M14 0v-6M16.5 0v-6.5M19 0v-5.6', 'k K') + C(14, -7, 1, 'd') + C(16.5, -7.5, 1, 'd') + C(19, -6.6, 1, 'd');
  return s;
};

/** Bank holidays (a general project): bunting across the street and a fair's striped tent. */
export const holiday: Prop = (a) => {
  let flags = '';
  for (let i = 0; i < 11; i++) { const x = -27 + i * 5.4, y = -22 + Math.sin((i / 10) * Math.PI) * 4.5; flags += `M${f(x)} ${f(y)}l2.6 0l-1.3 3z`; }
  return P('M-30 0V-24M30 0V-24', 'k K') + P('M-30 -22Q0 -13 30 -22', 'k k2') + P(flags, 'ac') +
    P('M-12 0L-12 -8L-4 -15L4 -8L4 0Z', 'b') + P('M-12 -8L-4 -15L4 -8Z', 'ac') + P('M-8 0V-8M0 0V-8', 'k k2') + P('M-4 -15V-19', 'k') + P('M-4 -19h3l-1 1l1 1h-3z', 'ac');
};

/** A civic hall: the fallback for a Commons icon no library knows. */
export const civic: Prop = (a) =>
  R(-18, -18, 36, 18, 'b') + pediment(-19, 19, -18, 7) + columns(-12, 12, 0, -16, 4) + R(-14, -17, 28, 1.4, 'b') + shade(12, -18, 6, 18, a.hatch()) + R(-2, -7, 4, 7, 'd');

/* ------------------------------------------------------------------ */
/* The Charters' landmarks                                             */
/* ------------------------------------------------------------------ */

/** The Northern Coalfield: a deep shaft with a tall twin-wheel headgear and a big winding-engine house. */
export const deepShaft: Prop = (a, o) => {
  o.fx('spin', -3, -64, 1, C(0, 0, 7.5, 'k K') + P('M0 -7.5V7.5M-7.5 0H7.5M-5.3 -5.3L5.3 5.3M-5.3 5.3L5.3 -5.3', 'k'));
  o.fx('spin', 7, -64, 1, C(0, 0, 7.5, 'k K') + P('M0 -7.5V7.5M-7.5 0H7.5M-5.3 -5.3L5.3 5.3M-5.3 5.3L5.3 -5.3', 'k'));
  o.fx('smoke', -36, -62, 1);
  return P('M-12 0L-5 -64M14 0L9 -64M-5 -64H9M-10 -12H12.5M-8.5 -26H11.5M-7 -40H10.5M-6 -52H10M-10 -12L11.5 -26M-8.5 -26L10.5 -40M-7 -40L10 -52M9 -64L34 0', 'k K') +
    R(-46, -26, 26, 26, 'b') + P('M-48 -26L-33 -34L-18 -26Z', 'rf') + shade(-26, -26, 6, 26, a.hatch()) + P(arches(-43, -6, 3, 7, 4, 12), 'w') +
    P('M-38 0L-37 -60H-34L-33 0Z', 'b') + R(-38.4, -62, 5.8, 2.6, 'd') + L(-3, -64, -20, -22, 'k k2') + L(7, -64, -20, -18, 'k k2') +
    P('M16 0l2 -4h8l2 4z', 'sp');
};

/** The Cotton Towns: a great six-storey spinning mill with an Italianate stack and an engine house. */
export const millTown: Prop = (a, o) => {
  o.fx('smoke', 52, -112, 1.4);
  const w = 96, h = 46;
  return P('M47 0L48.5 -104H55.5L57 0Z', 'b') + P('M46 -104h11v-4h-11z', 'b') + P('M47.5 -108l4 -4l4 4z', 'rf') + shade(52.5, -104, 3, 104, a.hatch()) +
    R(-w / 2, -h, w, h, 'b') + P(`M${-w / 2 - 1} ${-h}L${-w / 2 + 3} ${-h - 4}H${w / 2 - 3}L${w / 2 + 1} ${-h}Z`, 'rf') + shade(w / 2 - 10, -h, 10, h, a.hatch()) +
    grid(-w / 2 + 3, -h + 3, 18, 6, 5, 7.2, 2.6, 4) + R(-w / 2 - 9, -h - 12, 9, h + 12, 'b') + P(`M${-w / 2 - 10} ${-h - 12}L${-w / 2 - 4.5} ${-h - 19}L${-w / 2 + 1} ${-h - 12}Z`, 'rf') +
    shade(-w / 2 - 4, -h - 12, 4, h + 12, a.hatch()) + R(w / 2, -22, 12, 22, 'b') + P(`M${w / 2 - 1} -22L${w / 2 + 6} -27L${w / 2 + 13} -22Z`, 'rf') + P(arches(w / 2 + 3, -3, 2, 4.5, 2.6, 12), 'w');
};

/** A Temperance Town: a Nonconformist chapel, classical front, a date stone and railings. */
export const chapel: Prop = (a) =>
  R(-15, -24, 30, 24, 'b') + pediment(-15, 15, -24, 8) + shade(8, -24, 7, 24, a.hatch()) + C(0, -27.5, 2.2, 'w') +
  P(arches(-12, -12, 2, 20, 4, 9) + arches(-12, -2, 1, 0, 4, 7) + arches(8, -2, 1, 0, 4, 7), 'w') + P('M-3 0V-9A3 3 0 0 1 3 -9V0Z', 'd') +
  R(-5, -19, 10, 3, 'ac') + railing(-20, -15) + railing(15, 20);

/** The Garden Parish: an orchard behind a brick wall, rows of trees in blossom, a packing shed. */
export const orchard: Prop = (a) => {
  let t = '';
  const r = a.r;
  for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) {
    const x = -36 + i * 11 + row * 4, y = -4 - row * 4, k = 0.8 - row * 0.12;
    t += `<g transform="translate(${f(x)} ${f(y)}) scale(${f(k)})">` + L(0, 0, 0, -5, 'k tk') + C(0, -8, 4.4 + r() * 0.8, 'tr') + C(-1.5 + r() * 3, -9.5, 0.8, 'ac') + `</g>`;
  }
  return P('M-44 0L-40 -16H40L44 0Z', 'gd') + t + P('M-44 0H44V-3H-44Z', 'b') + P('M-44 -1.5H44', 'k k2') + R(32, -12, 10, 9, 'b') + P('M31 -12L37 -15.5L43 -12Z', 'rf');
};

/** Railway Mania: a second, taller viaduct striding across the near valley with a train on it. */
export const viaductL: Prop = (a) => {
  const w = 150, n = 8, bw = w / n;
  let d = '', u = '';
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + i * bw, x1 = x0 + bw, r = (bw - 5) / 2, hh = 30 + Math.sin((i / (n - 1)) * Math.PI) * 10;
    d += `M${f(x0)} 0V${f(-hh - 8)}H${f(x1)}V0H${f(x1 - 2.5)}V${f(-hh + r)}A${f(r)} ${f(r)} 0 0 0 ${f(x0 + 2.5)} ${f(-hh + r)}V0Z`;
    u += `M${f(x0 + 2.5)} ${f(-hh + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x1 - 2.5)} ${f(-hh + r)}`;
  }
  return P(d, 'b') + P(d, 'hz', `fill="${a.hatch()}"`) + P(u, 'k') + R(-w / 2 - 2, -50, w + 4, 3, 'b') + L(-w / 2 - 2, -50.5, w / 2 + 2, -50.5, 'k K') +
    G(R(0, -9, 14, 7, 'b') + R(11, -14, 2, 5, 'b') + C(4, -2, 2, 'k') + C(10, -2, 2, 'k') + R(-14, -8, 12, 6, 'b') + R(-28, -8, 12, 6, 'b'), 'transform="translate(10 -50)"');
};

/** The Gaslit Borough: a great column-guided gasholder, its lattice standards and the bell riding high. */
export const gasholderL: Prop = (a) => {
  let cols = '';
  for (let i = 0; i < 8; i++) { const x = -26 + i * 7.43; cols += `M${f(x)} 0V-46`; }
  return E(0, -2, 26, 3, 'b') + P('M-24 -2V-30Q0 -36 24 -30V-2Z', 'b') + shade(10, -32, 14, 30, a.hatch()) + P('M-24 -16Q0 -21 24 -16M-24 -26Q0 -31 24 -26', 'k k2') +
    P(cols, 'k K') + P('M-26 -46H26M-26 -31H26M-26 -16H26', 'k') + P('M-26 -46L-18.6 -31M-18.6 -46L-11 -31M-11 -46L-3.7 -31M3.7 -46L11 -31M11 -46L18.6 -31M18.6 -46L26 -31', 'k k2') +
    lamps([-30, 30], 10);
};

/** Commons props by icon (looked up as 'commons:<icon>'), and landmarks (as 'landmark:<key>'). */
export const CIVIC: Record<string, Prop> = {
  'commons:baths': baths, 'commons:park': parkC, 'commons:institute': institute, 'commons:library': library,
  'commons:clock': clockC, 'commons:allotments': allotmentsC, 'commons:buses': buses, 'commons:shortweek': shortweek,
  'commons:repair': repair, 'commons:holiday': holiday, civic,
  'landmark:deepShaft': deepShaft, 'landmark:millTown': millTown, 'landmark:chapel': chapel, 'landmark:orchard': orchard,
  'landmark:viaduct': viaductL, 'landmark:gasholder': gasholderL,
};
/** The keys the content writes today (the coverage test checks every one has its own drawing). */
export const COMMONS_ICONS = ['baths', 'park', 'institute', 'library', 'clock', 'allotments', 'buses', 'shortweek', 'repair', 'holiday'];
export const LANDMARKS = ['deepShaft', 'millTown', 'chapel', 'orchard', 'viaduct', 'gasholder'];
