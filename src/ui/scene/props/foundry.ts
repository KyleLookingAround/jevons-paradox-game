// Iron & Steel (M4): the foundry lithograph's props. Night drawing: solid dark bodies, lit windows and flat orange
// glow plates (`.og`, printed a hair out of register by the style). Stage 0–3 = cold-blast stone furnaces → hot blast
// with Cowper stoves → the Bessemer converter's blow → the open-hearth shop.
import type { Prop } from '../layout';
import { P, R, C, L, f, grid } from '../svg';
import { shade } from './common';

/** A blast furnace: a stone stack with its charging bridge and lift; from stage 1 Cowper stoves beside it; from stage 2
 *  an iron-cased shell. Dark (the glow plate is a separate slot, 'blastGlow', shown while the furnace is in blast). */
export const blastFurnace: Prop = (a) => {
  const st = a.stage;
  let s = '';
  if (st >= 1) for (let i = 0; i < (st >= 2 ? 3 : 2); i++) { const x = 20 + i * 10; s += P(`M${x} 0V-44A4.5 4.5 0 0 1 ${x + 9} -44V0Z`, 'b') + shade(x + 6, -44, 3, 44, a.hatch()) + L(x + 4.5, -48.5, x + 4.5, -52, 'k'); }
  const body = st >= 2 ? P('M-13 0L-12 -50H12L13 0Z', 'b') + P('M-12 -38H12M-12 -26H12M-12.6 -14H12.6', 'k k2') : P('M-15 0L-10 -50H10L15 0Z', 'b') + P('M-14 -12H14M-12.6 -24H12.6M-11.4 -36H11.4', 'k k2');
  // Charging bridge from the lift tower (left), the bell at the throat, the downcomer to the stoves.
  s += body + shade(4, -50, 8, 50, a.hatch(1)) + R(-12, -54, 24, 4, 'd') + R(-36, -60, 7, 60, 'b') + P('M-36 -60L-32.5 -66L-29 -60', 'rf') +
    P('M-29 -55H-12M-29 -52H-12', 'k K') + P('M8 -54V-62H18V-44', 'k K') + R(-6, -6, 12, 6, 'd');
  return s;
};

/** The glow of a furnace in blast: a flat orange plate at the throat and over the casting floor, a flame at the top
 *  (a two-step blink, composited) and the furnace's smoke. Drawn at the furnace's foot. */
export const blastGlow: Prop = (a, o) => {
  o.fx('blink', 0, -56, 1, P('M-6 0Q-4 -9 0 -14Q3 -8 6 0Z', 'flm'));
  o.fx('smoke', 2, -66, 1.3);
  // The flare: a flat plate of light fanning up from the throat into the smoke, its hot core a second, paler plate.
  return P('M-10 -54L-24 -96Q0 -104 24 -96L10 -54Z', 'og', 'style="opacity:.42"') + P('M-6 -54L-10 -78Q0 -82 10 -78L6 -54Z', 'og2', 'style="opacity:.7"') +
    P('M-30 2Q-18 -9 0 -8Q18 -9 34 2Z', 'og') + R(-5, -6, 10, 6, 'og2');
};

/** Stage 2: the converter shed and its blow, a flat flame cone over the roof (a blink, composited). */
export const converter: Prop = (a, o) => {
  o.fx('blink', 4, -40, 1.2, P('M-7 0L0 -30L7 0Z', 'flm') + P('M-3 0L0 -16L3 0Z', 'og2'));
  return R(-26, -26, 52, 26, 'b') + P('M-28 -26L0 -38L28 -26Z', 'rf') + shade(14, -26, 12, 26, a.hatch()) +
    R(-4, -40, 16, 10, 'b') + P('M-18 0V-10H-10V0ZM-4 0V-10H4V0Z', 'lit') + P('M-22 -6H22', 'k k2');
};

/** Stage 3: the open-hearth shop, a long shed with a row of stacks and its furnace doors lit along the front. */
export const hearthShop: Prop = (a, o) => {
  let st = '';
  for (let i = 0; i < 4; i++) { const x = -30 + i * 20; st += P(`M${x - 2} -24L${x - 1.4} -58H${x + 1.4}L${x + 2} -24Z`, 'b'); if (i % 2 === 0) o.fx('smoke', x, -60, 0.9); }
  return st + R(-40, -24, 80, 24, 'b') + P('M-42 -24L-34 -32H34L42 -24Z', 'rf') + shade(26, -24, 14, 24, a.hatch()) +
    grid(-34, -12, 6, 1, 11, 0, 6, 6, 'lit') + grid(-34, -12, 6, 1, 11, 0, 6, 6, 'og');
};

/** The wire mill: a low drawing shed and coils of wire on the ground. */
export const wireMill: Prop = (a, o) => {
  o.fx('smoke', 14, -34, 0.7);
  return R(-22, -16, 40, 16, 'b') + P('M-24 -16L-2 -24L20 -16Z', 'rf') + shade(10, -16, 8, 16, a.hatch()) + P('M12 0L13 -32H16L17 0Z', 'b') +
    grid(-18, -11, 4, 1, 6, 0, 3, 4, 'lit') + coils(-30, 0) + coils(26, 0);
};
function coils(x: number, y: number): string {
  return C(x, y - 3, 3, 'k K') + C(x, y - 3, 1.6, 'k') + C(x + 5, y - 2.6, 2.6, 'k K') + C(x + 5, y - 2.6, 1.2, 'k');
}
export const coil: Prop = () => coils(-2.5, 0);

/** The rail mill: a long rolling-mill shed with roof vents, glow at the rolls, rails stacked by the door. */
export const railMill: Prop = (a, o) => {
  o.fx('smoke', 26, -46, 1);
  let v = '';
  for (let i = 0; i < 5; i++) v += R(-30 + i * 13, -27, 6, 3, 'd');
  return P('M24 0L25 -44H28L29 0Z', 'b') + R(-36, -22, 72, 22, 'b') + P('M-38 -22L-30 -28H30L38 -22Z', 'rf') + v + shade(24, -22, 12, 22, a.hatch()) +
    P('M-30 0V-12H-20V0Z', 'og') + grid(-14, -16, 6, 1, 6, 0, 3, 5, 'lit') + rails(42, 0) + rails(42, -3);
};
function rails(x: number, y: number): string { return P(`M${x} ${y}h22M${x} ${y - 1.4}h22`, 'k K'); }
export const railStack: Prop = () => rails(-11, 0) + rails(-11, -3) + rails(-9, -6);

/** The plate mill: a tall shed, a plate glowing on the bogie at the door, plates stacked. */
export const plateMill: Prop = (a, o) => {
  o.fx('smoke', -24, -50, 1);
  return P('M-26 0L-25 -48H-22L-21 0Z', 'b') + R(-20, -30, 48, 30, 'b') + P('M-22 -30L4 -40L30 -30Z', 'rf') + shade(16, -30, 12, 30, a.hatch()) +
    grid(-15, -24, 5, 2, 7, 9, 3, 5, 'lit') + R(-6, -10, 14, 10, 'd') + P('M-4 -1h12l-1 -3h-10z', 'og2') + plates(36, 0);
};
function plates(x: number, y: number): string { return P(`M${x} ${y}h16v-2h-16zM${x + 1} ${y - 2}h14v-2h-14zM${x + 2} ${y - 4}h12v-2h-12z`, 'b'); }
export const plateStack: Prop = () => plates(-8, 0);

/** The girder yard: a lattice girder on trestles and a gantry over it. */
export const girderYard: Prop = (a) => {
  let w = '';
  for (let x = -30; x < 30; x += 6) w += `M${x} -10L${x + 6} -16M${x + 6} -10L${x} -16`;
  return P('M-32 -10H30M-32 -16H30', 'k K') + P(w, 'k') + P('M-28 0L-26 -10M-20 0L-22 -10M22 0L20 -10M28 0L26 -10', 'k') +
    P('M-38 0V-34H38V0M-38 -30H38', 'k K') + R(-6, -34, 12, 5, 'b') + L(0, -29, 0, -17, 'k');
};

/** The tinplate works: a tinning house with short stacks and boxes of plate at the door. */
export const tinWorks: Prop = (a, o) => {
  o.fx('smoke', -14, -36, 0.7); o.fx('smoke', 0, -36, 0.7);
  return P('M-16 -18L-15 -34H-13L-12 -18ZM-2 -18L-1 -34H1L2 -18Z', 'b') + R(-24, -18, 46, 18, 'b') + P('M-26 -18L-24 -22H20L22 -18Z', 'rf') +
    shade(12, -18, 10, 18, a.hatch()) + grid(-20, -13, 5, 1, 7, 0, 4, 5, 'lit') + P('M26 0h7v-5h-7zM27 -5h5v-4h-5zM34 0h6v-5h-6z', 'b2');
};

/** The machine shop: a sawtooth roof, a long row of lit windows (night shift at the lathes). */
export const machineShop: Prop = (a) => {
  let saw = 'M-36 -18';
  for (let i = 0; i < 6; i++) saw += `L${-36 + i * 12} -26V-18L${-24 + i * 12} -18`;
  return R(-36, -18, 72, 18, 'b') + P(saw + 'Z', 'rf') + P(saw.replace(/^M-36 -18/, 'M-36 -18'), 'k') + shade(24, -18, 12, 18, a.hatch()) + grid(-32, -13, 9, 1, 7.4, 0, 4.4, 6, 'lit');
};

/** A slag heap: dark, terraced, a lit trickle of molten slag tipped down one face. */
export const slagHeap: Prop = (a) => {
  const w = 16 + a.v * 18, h = 10 + a.v * 12;
  return P(`M${f(-w)} 0Q${f(-w * 0.4)} ${f(-h)} ${f(-w * 0.1)} ${f(-h)}H${f(w * 0.25)}Q${f(w * 0.55)} ${f(-h * 0.9)} ${f(w)} 0Z`, 'sp') +
    P(`M${f(-w * 0.6)} ${f(-h * 0.45)}H${f(w * 0.65)}`, 'k k2') + P(`M${f(w * 0.25)} ${f(-h)}Q${f(w * 0.5)} ${f(-h * 0.5)} ${f(w * 0.62)} 0`, 'ogk') +
    P(`M${f(-w * 0.1)} ${f(-h)}h${f(w * 0.35)}`, 'k K');
};
/** The Slag Slide: a heap slumped across the ground (no figures). */
export const slagSlump: Prop = () =>
  P('M-46 0Q-30 -6 -14 -9Q0 -14 10 -8Q26 -4 48 0Z', 'sp') + P('M-30 -4l4 -3l3 3M2 -10l5 2l-2 4M20 -3l3 -2l2 2', 'k') + P('M-46 0Q-20 -3 0 -2', 'ogk');
export const none: Prop = () => '';

/** A rake of goods wagons with a lettered van: the order book leaving the frame. Faces right, rails at y = 0. */
function wagons(text: string, load: 'rail' | 'plate' | 'girder' | 'box' | 'coil'): Prop {
  return () => {
    let s = '';
    for (let i = 0; i < 3; i++) {
      const x0 = -76 + i * 15;
      s += R(x0, -6, 13, 4.5, 'b') + C(x0 + 3, -1.2, 1.3, 'd') + C(x0 + 10, -1.2, 1.3, 'd');
      s += load === 'rail' ? P(`M${x0 + 0.5} -7h12M${x0 + 0.5} -8.2h12`, 'k') : load === 'plate' ? R(x0 + 1, -8, 11, 2, 'b2') : load === 'girder' ? P(`M${x0} -8h13M${x0} -11h13M${x0} -8l3 -3l3 3l3 -3l3 3`, 'k') :
        load === 'coil' ? C(x0 + 4, -8, 2, 'k K') + C(x0 + 9, -8, 2, 'k K') : R(x0 + 1.5, -9, 4, 3, 'b2') + R(x0 + 7, -9, 4, 3, 'b2');
    }
    // The van, lettered with where it goes.
    s += R(-30, -12, 58, 10.5, 'wgb') + `<text x="-1" y="-4.5" text-anchor="middle" class="wg">${text}</text>` + C(-25, -1.2, 1.4, 'd') + C(23, -1.2, 1.4, 'd');
    // A tank engine at the head.
    s += R(28, -10, 14, 8, 'b') + R(28, -14, 6, 4, 'b') + R(38, -15, 2, 5, 'b') + C(32, -1.6, 1.8, 'd') + C(38, -1.6, 1.8, 'd');
    return s;
  };
}

/** The canal's narrowboat (a mover), with a coke barge in tow. Faces right, waterline at y = 0. */
export const narrowboat: Prop = () =>
  P('M-40 -3H-8L-6 0H-40Z', 'b') + P('M-38 -3Q-24 -7 -10 -3', 'd') + P('M-4 -3H30Q34 -3 36 0H-4Z', 'b') + R(4, -7, 16, 4, 'b2') + R(10, -6, 3, 2, 'lit') + L(-6, -2, -4, -2, 'k');

/** The canal: a dark ribbon with orange reflections (origin left, w = length). */
export const canal: Prop = (a) => {
  const w = a.w || 600;
  let d = '';
  for (let x = 8; x < w; x += 23) d += `M${x} ${2 + (x % 3)}h${6 + (x % 7)}`;
  return R(0, 0, w, 8, 'wa') + L(0, 0, w, 0, 'k K') + P(d, 'ogk', 'opacity=".5"') + L(0, 8, w, 8, 'k');
};

export const FOUNDRY: Record<string, Prop> = {
  blastFurnace, blastGlow, converter, hearthShop, wireMill, coil, railMill, railStack, plateMill, plateStack, girderYard, tinWorks, machineShop,
  slagHeap, slagSlump, none, narrowboat, canal,
  wagRails: wagons('RAILS → STEAM', 'rail'), wagPlate: wagons('PLATE → HARBOUR', 'plate'), wagGirder: wagons('GIRDERS → LIGHT', 'girder'),
  wagTin: wagons('TIN → FISHING', 'box'), wagTools: wagons('TOOLS → ALL', 'box'), wagWire: wagons('FENCING WIRE', 'coil'),
};
