// Compute: the invisible made visible, as a phosphor wireframe. Stage 0–3 = mainframe room → server racks →
// hyperscale hall → liquid-cooled accelerator pods.
import type { Prop } from '../layout';
import { P, R, C, L, f } from '../svg';

/** An office tower: every lit cell a spreadsheet. */
export const office: Prop = (a) => {
  const w = 16 + a.v * 12, h = 30 + a.v * 36;
  let lit = '', dim = '';
  for (let y = -h + 4; y < -4; y += 5) for (let x = -w / 2 + 2.5; x < w / 2 - 3; x += 4) {
    const d = `M${f(x)} ${f(y)}h2.4v2.6h-2.4z`;
    if (a.r() < 0.4) lit += d; else dim += d;
  }
  return R(-w / 2, -h, w, h, 'b') + P(dim, 'w') + P(lit, 'lit') + L(0, -h, 0, -h - 6, 'k');
};

/** An exchange: low building, mast, blinking light. */
export const exchange: Prop = (a, o) => {
  o.fx('blink', 8, -34, 1, C(0, 0, 1.6, 'lit'));
  return R(-14, -12, 28, 12, 'b') + P('M-10 -8h20M-10 -4h20', 'k k2') + P('M8 -12L8 -34M5 -12L8 -26L11 -12', 'k') + P('M-8 -12Q-8 -20 -2 -20', 'k');
};

/** A network link: a faint arc, with packets running along it. w,h = offset to the other end. */
export const link: Prop = (a, o) => {
  const dx = a.w || 60, dy = a.h || 0;
  const d = `M0 -8Q${f(dx / 2)} ${f(dy / 2 - 28 - Math.abs(dx) * 0.15)} ${f(dx)} ${f(dy - 8)}`;
  o.fx('flow', 0, 0, 1, `<path d="${d}"/>`);
  return P(d, 'k lnk');
};

/** A data hall. The racks inside change with each stage; LEDs blink. */
export const hall: Prop = (a, o) => {
  const st = a.stage, w = 56 + st * 8, h = 14 + st * 2;
  let inner = '';
  if (st === 0) {
    for (let x = -w / 2 + 4; x < w / 2 - 8; x += 9) inner += R(x, -h + 3, 6, h - 5, 'k k2') + C(x + 1.8, -h + 6, 1, 'k') + C(x + 4.2, -h + 6, 1, 'k');
  } else {
    for (let x = -w / 2 + 3; x < w / 2 - 3; x += 4) inner += P(`M${f(x)} ${-h + 3}V-2`, 'k k2');
  }
  let leds = '';
  for (let x = -w / 2 + 4; x < w / 2 - 3; x += 6) leds += R(x, -h + 4 + ((x * 3) % 5), 1.2, 1.2, st >= 3 ? 'cy' : 'lit');
  o.fx('blink', 0, 0, 1, leds);
  return R(-w / 2, -h, w, h, 'b') + inner + (st >= 3 ? R(-w / 2 - 4, -h - 4, w + 8, h + 8, 'gl', `fill="${a.u('cyan')}" opacity=".35"`) : '') +
    P(`M${f(-w / 2 + 6)} ${-h}v-3h6v3M${f(w / 2 - 12)} ${-h}v-3h6v3`, 'k');
};

export const homeScreen: Prop = (a) =>
  R(-6, -7, 12, 7, 'b') + P('M-7 -7L0 -12L7 -7', 'k') + R(-3.5, -5.5, 4, 3, 'cy') + R(-5, -9, 10, 8, 'gl', `fill="${a.u('cyan')}" opacity=".5"`);

/** Cloud storage: a vast windowless shed. */
export const storage: Prop = (a) => {
  const w = 56 + a.v * 26, h = 16;
  let d = '';
  for (let x = -w / 2 + 3; x < w / 2; x += 3) d += `M${f(x)} ${-h + 1}V-1`;
  return R(-w / 2, -h, w, h, 'b') + P(d, 'k k2 dim') + P('M-6 -7q0-4 4-4q1-3 5-2q4 0 4 4q3 0 3 2.5h-16z', 'k');
};

/** A training campus: long halls with roof chillers. */
export const campus: Prop = (a) => {
  const w = 70 + a.v * 30, h = 18;
  let fans = '';
  for (let x = -w / 2 + 5; x < w / 2 - 4; x += 7) fans += C(x, -h - 1.6, 1.6, 'k');
  return R(-w / 2, -h, w, h, 'b') + P(`M${f(-w / 2)} ${-h / 2}H${f(w / 2)}`, 'k k2') + fans + R(-4, -6, 8, 6, 'lit');
};

/** Cooling tower with a vapour plume. */
export const cooling: Prop = (a, o) => {
  o.fx('steam', 1, -32, 1.6);
  return P('M-12 0C-7 -12 -7 -22 -9 -32H9C7 -22 7 -12 12 0Z', 'b') + P('M-8.5 -28H8.5M-7.6 -18H7.6M-9 -8H9', 'k k2');
};

export const substation: Prop = () =>
  P('M-16 0V-8H-6V0M-3 0V-10H7V0M10 0V-8H18V0', 'k') + P('M-14 -8V-14M-8 -8V-14M0 -10V-16M5 -10V-16M12 -8V-13M16 -8V-13', 'k k2') + P('M-18 -14H20', 'k k2');

export const pylon: Prop = () =>
  P('M-6 0L-1.5 -34M6 0L1.5 -34M-10 -26H10M-8 -18H8M-5 0L4 -10M5 0L-4 -10M-4 -10L3 -20M4 -10L-3 -20', 'k') + P('M-10 -26v3M10 -26v3M-8 -18v3M8 -18v3', 'k');

export const solar: Prop = () => {
  let d = '';
  for (let i = 0; i < 4; i++) d += `M${-22 + i * 11} -1l3 -7h9l-3 7z`;
  return P(d, 'b') + P('M-20 -4.5h40', 'k k2');
};

export const TERMINAL: Record<string, Prop> = { office, exchange, link, hall, homeScreen, storage, campus, cooling, substation, pylon, solar };
