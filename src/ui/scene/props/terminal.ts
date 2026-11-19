// Compute: the invisible made visible, as a phosphor wireframe. Stage 0–3 = mainframe room → server racks →
// hyperscale hall → liquid-cooled accelerator pods.
import type { Prop } from '../layout';
import { P, R, C, L, f } from '../svg';

/** Isometric hint: the right-hand face of a box, receding up and to the right. */
const iso = (x: number, y: number, w: number, h: number, dx = 5, dy = 3.5) =>
  P(`M${f(x + w)} ${f(y + h)}l${dx} ${-dy}V${f(y - dy)}l${-dx} ${dy}M${f(x)} ${f(y)}l${dx} ${-dy}H${f(x + w + dx)}`, 'k iso');
/** Text-mode label above a landmark: [ NAME ]. */
const label = (y: number, t: string) => `<text x="0" y="${f(y)}" text-anchor="middle" class="tlab">[ ${t} ]</text>`;
/** Wrap a prop with a text-mode label (used for landmarks). */
const tagged = (p: Prop, t: string, dy: number): Prop => (a, o) => p(a, o) + label(dy, t);

/** An office tower: every lit cell a spreadsheet. */
export const office: Prop = (a) => {
  const w = 16 + a.v * 12, h = 30 + a.v * 36;
  let lit = '', dim = '';
  for (let y = -h + 4; y < -4; y += 5) for (let x = -w / 2 + 2.5; x < w / 2 - 3; x += 4) {
    const d = `M${f(x)} ${f(y)}h2.4v2.6h-2.4z`;
    if (a.r() < 0.4) lit += d; else dim += d;
  }
  return iso(-w / 2, -h, w, h) + R(-w / 2, -h, w, h, 'b') + P(dim, 'w') + P(lit, 'lit') + L(0, -h, 0, -h - 6, 'k');
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

/** A power feed drawn as a CAD trace: from a substation down, across and up into a hall, w,h = offset to the hall;
 *  current runs along it as packets do along a link. */
export const cable: Prop = (a, o) => {
  const dx = a.w || 60, dy = a.h || 0, mid = Math.max(dy, 0) + 6;
  const d = `M0 0V${f(mid)}H${f(dx)}V${f(dy)}`;
  o.fx('flow', 0, 0, 1, `<path d="${d}"/>`);
  return P(d, 'k feed') + P(`M-1.4 -1.4h2.8v2.8h-2.8zM${f(dx - 1.4)} ${f(dy - 1.4)}h2.8v2.8h-2.8z`, 'k');
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
  return iso(-w / 2, -h, w, h, 8, 5) + R(-w / 2, -h, w, h, 'b') + P(d, 'k k2 dim') + P('M-6 -7q0-4 4-4q1-3 5-2q4 0 4 4q3 0 3 2.5h-16z', 'k');
};

/** A training campus: long halls with roof chillers. */
export const campus: Prop = (a) => {
  const w = 70 + a.v * 30, h = 18;
  let fans = '';
  for (let x = -w / 2 + 5; x < w / 2 - 4; x += 7) fans += C(x, -h - 1.6, 1.6, 'k');
  return iso(-w / 2, -h, w, h, 10, 6) + R(-w / 2, -h, w, h, 'b') + P(`M${f(-w / 2)} ${-h / 2}H${f(w / 2)}`, 'k k2') + fans + R(-4, -6, 8, 6, 'lit');
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


/** A pylon that carries its conductors to the next one: w,h = offset (local units) from this top to the next top. */
export const pylonW: Prop = (a) => {
  const dx = a.w, dy = a.h;
  const sag = Math.max(4, Math.abs(dx) * 0.08);
  const wire = dx || dy ? P(`M-10 -23Q${f(dx / 2 - 10)} ${f(dy / 2 - 23 + sag)} ${f(dx - 10)} ${f(dy - 23)}M10 -23Q${f(dx / 2 + 10)} ${f(dy / 2 - 23 + sag)} ${f(dx + 10)} ${f(dy - 23)}M-8 -15Q${f(dx / 2 - 8)} ${f(dy / 2 - 15 + sag)} ${f(dx - 8)} ${f(dy - 15)}M8 -15Q${f(dx / 2 + 8)} ${f(dy / 2 - 15 + sag)} ${f(dx + 8)} ${f(dy - 15)}`, 'k wire') : '';
  return wire + pylon(a, { fx: () => {} });
};

/** Vapour off the cooling towers, drawn as the display drew it: outlined billows rising and leaning downwind.
 *  w = height of the plume (local units). Static (the towers' own steam puffs move). */
export const plume: Prop = (a) => {
  const h = a.w || 90;
  let d = '';
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), r = 6 + t * 13 + a.r() * 3;
    const x = t * t * h * 0.55 + (a.r() - 0.5) * 4, y = -t * h;
    d += `M${f(x - r)} ${f(y)}a${f(r)} ${f(r * 0.8)} 0 1 1 ${f(r * 2)} 0a${f(r)} ${f(r * 0.8)} 0 1 1 ${f(-r * 2)} 0`;
  }
  return P(d, 'k vap');
};

/** A fibre route on the floor: a luminous trace (a polyline, `pts` in local units via w/h as the end offset, bent at
 *  a right angle like a cable trench), with traffic running along it. */
export const fibre: Prop = (a, o) => {
  const dx = a.w || 60, dy = a.h || 0;
  const d = a.v > 0.5 ? `M0 0H${f(dx * 0.55)}L${f(dx)} ${f(dy)}` : `M0 0L${f(dx * 0.45)} ${f(dy)}H${f(dx)}`;
  o.fx('flow', 0, 0, 1, `<path class="fib" d="${d}"/>`);
  return P(d, 'fbg') + P(d, 'fbl');
};

/** A big hyperbolic cooling tower (the training campus), banded like a contour drawing. */
export const tower: Prop = (a, o) => {
  o.fx('steam', 2, -50, 2.2);
  let bands = '';
  for (let k = 1; k < 6; k++) {
    const y = -k * 8, t = k / 6, hw = 16 - Math.sin(t * Math.PI * 0.85) * 5.5 - t * 1.5;
    bands += `M${f(-hw)} ${f(y)}H${f(hw)}`;
  }
  return P('M-16 0C-10 -16 -10 -32 -12 -48H12C10 -32 10 -16 16 0Z', 'b') + P(bands, 'k k2') + P('M-12 -48H12', 'k K') +
    P('M-4 0V-6H4V0', 'k k2');
};

/** A data hall seen end-on down the avenue: a long shed with its gable to us and the side receding (flip for the
 *  other side). LEDs along the side. */
export const aisle: Prop = (a, o) => {
  const w = 30 + a.v * 10, h = 14, dep = 15 + a.v * 6, rise = dep * Math.abs(a.h || 0.42), q = 0.72;
  const bx = w / 2 + dep, by = -rise;
  let leds = '', ribs = '';
  for (let k = 1; k < 8; k++) {
    const t = k / 8, x = w / 2 + dep * t, y0 = by * t, hh = h * (1 - (1 - q) * t);
    if (k < 7) leds += R(x + 1, y0 - hh * 0.62, 1.1, 1.1, a.stage >= 3 ? 'cy' : 'lit');
    ribs += `M${f(x)} ${f(y0)}V${f(y0 - hh)}`;
  }
  o.fx('blink', 0, 0, 1, leds);
  const ridge = `M0 ${-h - 5}L${f(bx - (w * q) / 2)} ${f(by - (h + 5) * q)}L${f(bx)} ${f(by - h * q)}`;
  // h < 0: the side recedes to the left (a hall right of the vanishing point); mirrored inside, so a label is not.
  const m = a.h < 0 ? '<g transform="scale(-1 1)">' : '<g>';
  return m + P(`M${f(w / 2)} 0L${f(bx)} ${f(by)}V${f(by - h * q)}L${f(w / 2)} ${-h}Z`, 'b') + P(ribs, 'k k2 dim') + P(ridge, 'b') +
    R(-w / 2, -h, w, h, 'b') + P(`M${f(-w / 2)} ${-h}L0 ${-h - 5}L${f(w / 2)} ${-h}Z`, 'b') +
    R(-5, -9, 10, 9, 'k k2') + P(`M${f(-w / 2 + 3)} ${-h + 4}h6M${f(w / 2 - 9)} ${-h + 4}h6`, 'k k2') + '</g>';
};

export const TERMINAL: Record<string, Prop> = {
  office, exchange, link, cable, hall, homeScreen, storage, campus, cooling, substation, pylon, solar, pylonW, plume, fibre, tower, aisle,
  aisleL: tagged(aisle, 'COLD STORE', -30),
  officeL: tagged(office, 'SHEETS.01', -78), exchangeL: tagged(exchange, 'EXCH-A', -40), storageL: tagged(storage, 'COLD STORE', -26),
  hallL: tagged(hall, 'STREAM-HALL', -26), campusL: tagged(campus, 'TRAIN/CLUSTER', -27),
};
