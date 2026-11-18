// Steam: engraved Victorian props. Stage 0–3 = Newcomen → Watt → Cornish high-pressure → turbine hall.
import type { Prop, PropArgs } from '../layout';
import { P, R, C, L, f, grid } from '../svg';
import { shade } from './common';

const spokes = (r: number, n: number) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI;
    d += `M${f(Math.cos(t) * r)} ${f(Math.sin(t) * r)}L${f(-Math.cos(t) * r)} ${f(-Math.sin(t) * r)}`;
  }
  return d;
};
const wheel = (r: number, n = 6) => C(0, 0, r, 'k K') + C(0, 0, r * 0.18, 'd') + P(spokes(r * 0.95, Math.max(2, Math.round(n / 2))), 'k');

/** The pumping engine: the landmark of the valley. Its beam nods; it changes as efficiency is bought. */
export const engine: Prop = (a, o) => {
  const st = a.stage;
  if (st >= 3) {
    // Turbine hall: a brick power house with tall arched lights and two stacks.
    o.fx('smoke', 31, -94, 1.3); o.fx('smoke', 40, -90, 1.2);
    let wins = '';
    for (let i = 0; i < 6; i++) { const x = -32 + i * 9.5; wins += `M${f(x)} -6V-24A3 3 0 0 1 ${f(x + 6)} -24V-6Z`; }
    return P('M28 0L29.5 -93H33.5L35 0Z', 'b') + P('M37 0L38.5 -89H42.5L44 0Z', 'b') + R(28.8, -95, 5.4, 3, 'd') + R(37.8, -91, 5.4, 3, 'd') +
      shade(32, -93, 2.4, 93, a.hatch()) + shade(41, -89, 2.4, 89, a.hatch()) +
      R(-36, -34, 62, 34, 'b') + P('M-38 -34L-5 -45L28 -34Z', 'rf') + shade(-38, -45, 66, 11, a.hatch(1)) + R(-15, -50, 20, 5, 'b') +
      P(wins, 'w') + shade(18, -34, 8, 34, a.hatch()) + P('M-36 -27H26', 'k k2');
  }
  if (st === 2) {
    // Cornish engine house: tall, narrow, round-arched, the bob out of the front wall.
    const bob = R(-7, -2, 28, 4, 'b') + P('M21 -2.5A3.5 3.5 0 0 1 21 4.5', 'k') + L(22, 3, 22, 48, 'k K');
    o.fx('rock', 11, -50, 1, bob);
    o.fx('smoke', -13.5, -82, 1.1);
    return P('M-17 0L-15.5 -79H-11.5L-10 0Z', 'b') + R(-16, -82, 5, 3, 'd') + shade(-13.5, -79, 2, 79, a.hatch()) +
      R(-42, -16, 26, 16, 'b') + P('M-43 -16L-29 -23L-15 -16Z', 'rf') + grid(-38, -11, 4, 1, 5.5, 0, 2.5, 3.5) +
      R(-11, -56, 22, 56, 'b') + P('M-13 -56L0 -64L13 -56Z', 'rf') + shade(5, -56, 6, 56, a.hatch()) +
      P('M-4 -18V-33A4 4 0 0 1 4 -33V-18Z', 'w') + P('M-3 -46h2.5v5h-2.5zM1 -46h2.5v5h-2.5z', 'w') + P('M-3 0V-8A3 3 0 0 1 3 -8V0Z', 'd') +
      P('M29 0L31 -10M37 0L35 -10M30 -6h6', 'k') + P('M37 -1Q45 -3 56 0', 'wa wak');
  }
  if (st === 1) {
    // Watt: a bigger house, the separate condenser cistern and a flywheel for rotary work.
    const beam = R(-22, -1.8, 46, 3.6, 'b') + P('M24 -2.2A4.5 4.5 0 0 1 24 6.8', 'k') + L(26, 4, 26, 49, 'k K') + L(-20, 2, -20, 12, 'k');
    o.fx('rock', 8, -49, 1, beam);
    o.fx('spin', -27, -15, 1, wheel(13, 8));
    o.fx('smoke', 16.5, -72, 1);
    return P('M13 0L14.5 -70H18.5L20 0Z', 'b') + R(13.8, -72, 5.4, 3, 'd') + shade(16.5, -70, 2, 70, a.hatch()) +
      R(-16, -46, 28, 46, 'b') + P('M-18 -46L-2 -55L14 -46Z', 'rf') + shade(5, -46, 7, 46, a.hatch()) +
      grid(-12, -38, 3, 2, 6, 11, 3, 6) + P('M-5 0V-9A3 3 0 0 1 1 -9V0Z', 'd') +
      R(-36, -7, 12, 7, 'b') + shade(-30, -7, 6, 7, a.hatch()) +
      P('M31 0L34 -11M41 0L38 -11M33 -7h6', 'k') + P('M42 -1Q50 -3 60 0', 'wa wak');
  }
  // Newcomen's atmospheric engine: the beam over a flooded shaft.
  const beam = R(-20, -1.6, 44, 3.2, 'b') + P('M24 -2A4 4 0 0 1 24 6', 'k') + L(26, 3, 26, 47, 'k K') + L(-18, 2, -18, 11, 'k');
  o.fx('rock', 6, -47, 1, beam);
  o.fx('smoke', 14, -66, 0.9);
  return P('M11 0L12 -64H16L17 0Z', 'b') + R(11.4, -66, 5.2, 3, 'd') + shade(14, -64, 2, 64, a.hatch()) +
    R(-30, -14, 16, 14, 'b') + P('M-31 -14L-14 -21V-14Z', 'rf') +
    R(-14, -44, 24, 44, 'b') + P('M-16 -44L-2 -53L12 -44Z', 'rf') + shade(4, -44, 6, 44, a.hatch()) +
    grid(-10, -36, 2, 2, 8, 12, 3.5, 5.5) + P('M-6 0V-8A3 3 0 0 1 0 -8V0Z', 'd') +
    P('M29 0L32 -11M39 0L36 -11M31 -7h6', 'k') + P('M40 -1Q48 -3 58 0', 'wa wak');
};

/** Winding gear: headframe, wheel, engine shed, tubs. Timber, then steel lattice from stage 2. */
export const headframe: Prop = (a, o) => {
  const st = a.stage;
  const steel = st >= 2;
  const top = steel ? -40 : -32;
  o.fx('spin', 0, top - 1, 1, wheel(steel ? 7 : 6, 6));
  o.fx('smoke', -15, -32, 0.7);
  const frame = steel
    ? P('M-9 0L-3 -40M9 0L3 -40M-7.5 -8H7.5M-6 -18H6M-4.5 -28H4.5M-7.5 -8L6 -18M-6 -18L4.5 -28M-4.5 -28L3 -38M3 -40L20 0', 'k K')
    : P('M-8 0L-2 -32M8 0L2 -32M2 -32L16 0M-6 -10H6M-4 -21H4', 'k K');
  return R(-27, -10, 14, 10, 'b') + P('M-28 -10L-20 -15L-12 -10Z', 'rf') + shade(-17, -10, 4, 10, a.hatch()) +
    P('M-16.5 -10L-15.8 -31H-14.2L-13.5 -10Z', 'b') + L(-5, top - 1, -14, -7, 'k k2') + frame +
    R(7, -4, 6, 3.5, 'd') + R(14, -4, 6, 3.5, 'd') + L(4, 0, 30, 0, 'k');
};

/** Spoil heap: grows as the seams are emptied. */
export const spoil: Prop = (a) => {
  const w = 14 + a.v * 14, h = 9 + a.v * 9;
  return P(`M${f(-w)} 0Q${f(-w * 0.3)} ${f(-h * 1.1)} 0 ${f(-h)}Q${f(w * 0.45)} ${f(-h * 1.05)} ${f(w)} 0Z`, 'sp') +
    P(`M0 ${f(-h)}Q${f(w * 0.45)} ${f(-h * 1.05)} ${f(w)} 0H${f(w * 0.15)}Z`, 'hz', `fill="${a.hatch(1)}"`) +
    L(-w - 6, 0, -1.5, -h + 0.5, 'k') + R(-w * 0.45, -h * 0.55 - 2, 3, 2, 'd');
};

/** Cotton mill with its own stack. */
export const mill: Prop = (a, o) => {
  const w = 44 + a.v * 30, st = 3 + Math.floor(a.v * 2.9), h = st * 7 + 2;
  const cx = w / 2 + 9, ch = h + 26 + a.v * 10;
  o.fx('smoke', cx, -ch - 1, 1 + a.v * 0.3);
  const cols = Math.floor((w - 8) / 5);
  return P(`M${f(cx - 3.4)} 0L${f(cx - 2)} ${f(-ch)}H${f(cx + 2)}L${f(cx + 3.4)} 0Z`, 'b') + R(cx - 2.7, -ch - 2.5, 5.4, 3, 'd') +
    shade(cx + 0.5, -ch, 2.5, ch, a.hatch()) +
    R(-w / 2, -h, w, h, 'b') +
    P(`M${f(-w / 2 - 1)} ${f(-h)}L${f(-w / 2 + 3)} ${f(-h - 4)}H${f(w / 2 - 3)}L${f(w / 2 + 1)} ${f(-h)}Z`, 'rf') +
    shade(-w / 2 - 1, -h - 4, w + 2, 4, a.hatch(1)) + shade(w / 2 - 6, -h, 6, h, a.hatch()) +
    grid(-w / 2 + 4, -h + 3, cols, st, 5, 7, 2.6, 3.6) +
    R(-w / 2 - 7, -h - 8, 7, h + 8, 'b') + P(`M${f(-w / 2 - 8)} ${f(-h - 8)}L${f(-w / 2 - 3.5)} ${f(-h - 14)}L${f(w / -2 + 1)} ${f(-h - 8)}Z`, 'rf') +
    shade(-w / 2 - 3, -h - 8, 3, h + 8, a.hatch()) + R(w / 2, -h * 0.55, 7, h * 0.55, 'b');
};

/** Railway viaduct; origin at its LEFT foot, w = length. */
export const viaduct: Prop = (a) => {
  const w = a.w || 300, n = Math.max(3, Math.round(w / 17)), bw = w / n;
  let d = '', u = '';
  for (let i = 0; i < n; i++) {
    const x0 = i * bw, x1 = x0 + bw, r = (bw - 6) / 2;
    d += `M${f(x0)} 0V-26H${f(x1)}V0H${f(x1 - 3)}V-12A${f(r)} ${f(r)} 0 0 0 ${f(x0 + 3)} -12V0Z`;
    u += `M${f(x1 - 3)} -12A${f(r)} ${f(r)} 0 0 0 ${f(x0 + 3)} -12V-14.5A${f(r)} ${f(r)} 0 0 1 ${f(x1 - 3)} -14.5Z`;
  }
  // Engraved dark: the whole body takes a hatch so it holds its shape through the smog.
  return P(d, 'b') + P(d, 'hz', `fill="${a.hatch(0)}"`) + P(u, 'hz', `fill="${a.hatch(1)}"`) + P(u, 'hz', `fill="${a.hatch(1)}"`) + R(0, -30, w, 4, 'b') + L(0, -31, w, -31, 'k K') +
    P(`M0 -26H${f(w)}`, 'k k2');
};

/** A train. Stage picks the locomotive; v > .55 makes it a coal train. Faces right, rails at y = 0. */
export const train: Prop = (a) => {
  const st = a.stage, coal = a.v > 0.55;
  let loco = '', chx = 20, back = -4, cars = 3, cw = 15;
  if (st <= 0) {
    loco = R(2, -10, 17, 6, 'b') + R(-3, -13, 6, 11, 'b') + R(17, -25, 2.6, 15, 'b') + R(16.4, -26, 3.8, 1.6, 'd') +
      C(13, -4.6, 4.6, 'k K') + P(spokes(4.3, 4), 'k') + C(3, -2.6, 2.6, 'k') + L(6, -9, 12, -5) +
      R(-15, -8, 11, 6, 'b') + C(-12, -2, 2, 'k') + C(-7, -2, 2, 'k');
    chx = 18; back = -16; cars = 2; cw = 13;
  } else if (st === 1) {
    loco = R(0, -11, 20, 7, 'b') + C(10, -11.6, 1.8, 'b') + R(16.5, -19, 2.6, 8, 'b') + R(16, -20, 3.6, 1.5, 'd') +
      C(3, -2.6, 2.6, 'k') + C(10, -4.2, 4.2, 'k K') + C(17, -2.6, 2.6, 'k') + R(-13, -9, 11, 7, 'b') + C(-10, -2, 2, 'k') + C(-5, -2, 2, 'k');
    chx = 18; back = -15;
  } else if (st === 2) {
    loco = R(2, -12, 21, 8, 'b') + R(22, -12, 4, 8, 'd') + R(22.6, -17, 2.6, 5, 'b') + C(13, -12.6, 2, 'b') +
      R(-5, -17, 8, 15, 'b') + P('M-6 -17h10', 'k K') + C(25, -2, 2, 'k') + C(20, -2, 2, 'k') + C(12, -3.6, 3.6, 'k K') + C(4, -3.6, 3.6, 'k K') +
      R(-19, -10, 13, 8, 'b') + C(-16, -2, 2, 'k') + C(-9, -2, 2, 'k');
    chx = 24; back = -21; cw = 18;
  } else {
    loco = P('M-2 -14H24Q31 -14 31 -7V-3H-2Z', 'b') + R(17, -16.5, 3, 2.5, 'd') + R(-11, -18, 9, 16, 'b') + P('M-12 -18H-1', 'k K') +
      C(27, -2, 2, 'k') + C(18, -3.5, 3.5, 'k K') + C(10, -3.5, 3.5, 'k K') + C(2, -3.5, 3.5, 'k K') + L(-2, -8, 30, -8, 'k k2') +
      R(-25, -11, 13, 9, 'b') + C(-22, -2, 2, 'k') + C(-15, -2, 2, 'k');
    chx = 18.5; back = -27; cars = 4; cw = 20;
  }
  let rest = '';
  for (let i = 0; i < cars; i++) {
    const x1 = back - 2 - i * (cw + 2), x0 = x1 - cw;
    if (coal) {
      rest += R(x0, -7, cw, 5, 'b') + P(`M${f(x0 + 0.5)} -7Q${f(x0 + cw / 2)} -11 ${f(x1 - 0.5)} -7Z`, 'd') + C(x0 + 2.5, -1.6, 1.6, 'k') + C(x1 - 2.5, -1.6, 1.6, 'k');
    } else if (st <= 0) {
      rest += P(`M${f(x0)} -4H${f(x1)}V-9Q${f(x0 + cw / 2)} -12 ${f(x0)} -9Z`, 'b') + P(`M${f(x0 + 3)} -8h2.5v2.5h-2.5zM${f(x1 - 5.5)} -8h2.5v2.5h-2.5z`, 'w') + C(x0 + 3, -2, 2, 'k') + C(x1 - 3, -2, 2, 'k');
    } else {
      rest += R(x0, -11, cw, 8, 'b') + P(`M${f(x0 - 0.5)} -11Q${f(x0 + cw / 2)} -13.5 ${f(x1 + 0.5)} -11Z`, 'rf') +
        grid(x0 + 2, -9, Math.floor((cw - 3) / 3.5), 1, 3.5, 0, 2, 2.6) + C(x0 + 3, -1.8, 1.8, 'k') + C(x1 - 3, -1.8, 1.8, 'k');
    }
  }
  const plume = P(`M${f(chx)} ${f(-21)}C${f(chx - 8)} -30 ${f(chx - 16)} -24 ${f(chx - 26)} -30C${f(chx - 36)} -35 ${f(chx - 50)} -28 ${f(chx - 64)} -33`, 'plm');
  return plume + rest + loco;
};

/** Station with a canopy. */
export const station: Prop = (a) =>
  R(-16, -10, 22, 10, 'b') + P('M-18 -10L-5 -16L8 -10Z', 'rf') + grid(-13, -7, 4, 1, 4.5, 0, 2.5, 4) +
  P('M6 -11H24V-9H6Z', 'b') + P('M9 -9V0M15 -9V0M21 -9V0', 'k') + shade(1, -10, 5, 10, a.hatch());

export const signal: Prop = () => L(0, 0, 0, -18, 'k K') + P('M0 -17L7 -15V-13.5L0 -15.5Z', 'ac') + C(0, -18.5, 1, 'd');

export const goodsShed: Prop = (a) =>
  R(-18, -12, 36, 12, 'b') + P('M-19 -12Q0 -19 19 -12Z', 'rf') + R(-6, -9, 12, 9, 'd') + shade(10, -12, 8, 12, a.hatch());

/** Harbour quay: a stone wall at the water's edge with bollards; origin left, w = length. */
export const quay: Prop = (a) => {
  const w = a.w || 120;
  let j = '', b = '';
  for (let x = 6; x < w; x += 7) j += `M${f(x)} 1V8`;
  for (let x = 10; x < w; x += 22) b += `M${f(x)} 0v-2.4h2v2.4z`;
  return R(0, 0, w, 8, 'b') + P(j + `M0 4.5H${f(w)}`, 'k k2') + shade(0, 4.5, w, 3.5, a.hatch()) + P(b, 'd') + L(0, 0, w, 0, 'k K');
};

export const warehouse: Prop = (a) => {
  const w = 22 + a.v * 10, h = 26 + a.v * 12;
  return R(-w / 2, -h, w, h, 'b') + P(`M${f(-w / 2 - 1)} ${f(-h)}L0 ${f(-h - 7)}L${f(w / 2 + 1)} ${f(-h)}Z`, 'rf') +
    shade(w / 2 - 5, -h, 5, h, a.hatch()) + grid(-w / 2 + 3, -h + 4, 2, Math.floor((h - 6) / 7), w - 9, 7, 2.6, 3.5) +
    grid(-2, -h + 3, 1, Math.floor((h - 4) / 7), 0, 7, 4, 5, 'd') + P(`M0 ${f(-h - 7)}V${f(-h - 9)}H5V${f(-h - 2)}`, 'k');
};

export const crane: Prop = (a) =>
  a.stage >= 2
    ? R(-6, -12, 12, 9, 'b') + P('M-8 -3H8L6 0H-6Z', 'd') + L(3, -12, 30, -36, 'k K') + L(-2, -12, 30, -36, 'k') + L(30, -36, 30, -16, 'k') +
      R(28.5, -16, 3, 2.5, 'd') + R(-3.5, -16, 2, 4, 'b')
    : R(-1.6, -22, 3.2, 22, 'b') + L(0, -20, 20, -30, 'k K') + L(0, -22, 20, -30, 'k') + L(20, -30, 20, -12, 'k') + R(18.5, -12, 3, 3, 'd') +
      P('M-6 0L0 -8L6 0', 'k');

/** A ship. Stage: paddle steamer under sail → bigger paddler → screw steamer → liner. Faces right, waterline y = 0. */
export const ship: Prop = (a) => {
  const st = a.stage;
  const plume = (x: number, y: number, k = 1) => P(`M${f(x)} ${f(y)}C${f(x - 8 * k)} ${f(y - 8 * k)} ${f(x - 18 * k)} ${f(y - 2 * k)} ${f(x - 30 * k)} ${f(y - 8 * k)}C${f(x - 42 * k)} ${f(y - 13 * k)} ${f(x - 55 * k)} ${f(y - 6 * k)} ${f(x - 70 * k)} ${f(y - 10 * k)}`, 'plm');
  if (st >= 3) {
    let fun = '';
    for (let i = 0; i < 4; i++) fun += R(-15 + i * 9, -29, 4.4, 11, 'b') + R(-15 + i * 9, -29, 4.4, 3, 'ac');
    return plume(-12, -30, 1.2) + P('M-42 -7H42Q40 -1 35 2H-37Z', 'b') + P('M-42 -3H41', 'k') + shade(-40, -3, 78, 4, a.hatch(1)) +
      R(-32, -13, 62, 6, 'b') + R(-25, -18, 48, 5, 'b') + fun + P(`M-30 -10.5h56`, 'k k2') + L(-36, -7, -36, -24, 'k') + L(34, -7, 34, -24, 'k');
  }
  if (st === 2) {
    return plume(4, -21) + P('M-30 -5H29L25 2H-27Z', 'b') + shade(-28, -2, 54, 3, a.hatch(1)) + R(-9, -10, 19, 5, 'b') +
      R(2, -21, 4.4, 11, 'b') + R(2, -21, 4.4, 2.6, 'ac') + L(-18, -5, -18, -27) + L(17, -5, 17, -25) + P('M-18 -27L-29 -5M-18 -27L17 -25L28 -5', 'k k2');
  }
  const k = st === 1 ? 1.2 : 1;
  const tf = (x: number, y: number) => `${f(x * k)} ${f(y * k)}`;
  return plume(1.5 * k, -19 * k, k) +
    P(`M${tf(-22, -4)}H${f(20 * k)}L${tf(16, 2)}H${f(-19 * k)}Z`, 'b') + shade(-20 * k, -1 * k, 37 * k, 3 * k, a.hatch(1)) +
    P(`M${tf(-4, -4)}A${f(5 * k)} ${f(5 * k)} 0 0 1 ${tf(6, -4)}Z`, 'b') + R(0, -19 * k, 3 * k, 15 * k, 'b') + R(0, -19 * k, 3 * k, 2, 'd') +
    L(-12 * k, -4 * k, -12 * k, -30 * k) + L(11 * k, -4 * k, 11 * k, -26 * k) +
    P(`M${tf(-17, -28)}h${f(10 * k)}l${f(1 * k)} ${f(7 * k)}h${f(-12 * k)}zM${tf(-17.5, -19)}h${f(11 * k)}l${f(1 * k)} ${f(7 * k)}h${f(-13 * k)}z` +
      `M${tf(7, -24)}h${f(8 * k)}l${f(1 * k)} ${f(6 * k)}h${f(-10 * k)}zM${tf(6.5, -16)}h${f(9.5 * k)}l${f(1 * k)} ${f(6 * k)}h${f(-11.5 * k)}z`, 'sl');
};

/** A field ploughed in furrows; the anchor version has an engine at each headland and the cable between. */
function fieldBase(a: PropArgs, furrows: boolean): string {
  const w = a.w || 56, h = 13;
  let d = '';
  if (furrows) for (let x = -w / 2 + 4; x < w / 2 - 3; x += 3.6) d += `M${f(x)} -0.5L${f(x + 4.6)} ${-h + 0.5}`;
  const shape = `M${f(-w / 2)} 0Q0 1.5 ${f(w / 2)} 0L${f(w / 2 - 1)} ${-h}Q${f(5)} ${-h - 1.2} ${f(-w / 2 + 11)} ${-h}Z`;
  return P(shape, furrows ? 'fld fld2' : 'fld') + (d ? P(d, 'k fur') : '');
}
const traction = (x: number, flip: boolean) => {
  const s = flip ? -1 : 1;
  return `<g transform="translate(${x} 0) scale(${s} 1)">` + R(-6, -8, 10, 5, 'b') + R(3, -15, 1.8, 7, 'b') + C(-4, -3.2, 3.2, 'k K') + C(3, -2, 2, 'k') + P('M-8 -12H2', 'k') + L(-7, -12, -7, -8, 'k') + '</g>';
};
export const ploughField: Prop = (a, o) => {
  const w = a.w || 56;
  o.fx('smoke', -w / 2 - 2, -16, 0.45); o.fx('smoke', w / 2 + 7, -29, 0.4);
  return fieldBase(a, true) + traction(-w / 2 - 6, false) + `<g transform="translate(${f(w / 2 + 9)} -13)">${traction(0, true)}</g>` +
    P(`M${f(-w / 2 - 4)} -6L${f(w / 2 + 6)} -18`, 'k k2');
};
export const furrows: Prop = (a) => fieldBase(a, true);
export const field: Prop = (a) => fieldBase(a, false);

/** Rails with sleepers; origin left, w = length. */
export const rails: Prop = (a) => {
  const w = a.w || 200;
  let d = '';
  for (let x = 2; x < w; x += 4) d += `M${f(x)} 1.2V-0.6`;
  return P(d, 'k k2') + L(0, -0.4, w, -0.4, 'k K') + L(0, 1, w, 1, 'k');
};

export const LEDGER: Record<string, Prop> = {
  rails, engine, headframe, spoil, mill, viaduct, train, station, signal, goodsShed, quay, warehouse, crane, ship,
  ploughField, furrows, field,
};
