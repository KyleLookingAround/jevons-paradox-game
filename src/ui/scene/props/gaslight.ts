// Light: the town at dusk, in silhouette, with every light source drawn as glow. Stage 0–3 = oil and tallow → gas
// flame → incandescent mantle → filament and tube (the lamp colour itself is a CSS token set by stage).
import type { Prop } from '../layout';
import { P, R, C, E, L, f } from '../svg';

/** A mill working a night shift: window grid lit, stack glowing from below. */
export const nightFactory: Prop = (a, o) => {
  const w = 50 + a.v * 34, st = 3 + Math.floor(a.v * 1.9), h = st * 8 + 3;
  const cx = w / 2 + 8, ch = h + 30;
  o.fx('smoke', cx, -ch - 1, 1.1);
  let lit = '', dark = '';
  const cols = Math.floor((w - 8) / 6);
  for (let r = 0; r < st; r++) for (let c = 0; c < cols; c++) {
    const d = `M${f(-w / 2 + 4 + c * 6)} ${f(-h + 4 + r * 8)}h3.4v4.4h-3.4z`;
    if (a.r() < 0.82) lit += d; else dark += d;
  }
  return P(`M${f(cx - 3.4)} 0L${f(cx - 2)} ${f(-ch)}H${f(cx + 2)}L${f(cx + 3.4)} 0Z`, 'b') +
    E(cx, -ch + 2, 9, 5, 'gl', `fill="${a.u('ht3')}"`) +
    R(-w / 2 - 5, -h - 6, w + 10, h + 10, 'gl', `fill="${a.u('ht3')}" opacity=".7"`) +
    R(-w / 2, -h, w, h, 'b') + P(`M${f(-w / 2)} ${f(-h)}` + Array.from({ length: Math.ceil(w / 10) }, (_, i) => `L${f(-w / 2 + i * 10 + 10)} ${f(-h - 6)}V${f(-h)}`).join('') + 'Z', 'rf') +
    (dark ? P(dark, 'w') : '') + (lit ? P(lit, 'lit') : '');
};

/** Dark lamp posts in a row (the street, waiting); origin left, w = length, every `h` units. */
export const lampPosts: Prop = (a) => {
  const w = a.w || 500, gap = a.h || 46;
  let d = '', lan = '';
  for (let x = 0; x <= w; x += gap) {
    d += `M${f(x)} 0V-24M${f(x - 2.5)} 0h5`;
    lan += `M${f(x - 2.4)} -24L${f(x - 3.2)} -30H${f(x + 3.2)}L${f(x + 2.4)} -24ZM${f(x - 1)} -30l1 -2l1 2z`;
  }
  return P(d, 'k post') + P(lan, 'b');
};

/** The light of one lamp (sits on a post of lampPosts). Bigger and whiter with each stage. */
/** Halftone glow: three printed screens, dense to sparse. */
export const halftone = (a: { u(id: string): string }, x: number, y: number, r: number) =>
  C(x, y, r, 'gl', `fill="${a.u('ht3')}"`) + C(x, y, r * 0.64, 'gl', `fill="${a.u('ht2')}"`) + C(x, y, r * 0.36, 'gl', `fill="${a.u('ht1')}"`);
export const lampGlow: Prop = (a) => {
  const r = 9 + a.stage * 3.5;
  return E(0, 0, 14 + a.stage * 4, 3.2, 'gl', `fill="${a.u('ht3')}"`) + E(0, 0, 7 + a.stage * 2, 1.8, 'gl', `fill="${a.u('ht1')}"`) + halftone(a, 0, -27, r) +
    P('M-2.2 -24.6L-2.9 -29.4H2.9L2.2 -24.6Z', 'lit');
};

/** A far street lamp: a speck of light. */
export const farLamp: Prop = (a) => halftone(a, 0, -10, 5 + a.stage) + C(0, -10, 1.1, 'lit');

/** Tram poles and the overhead wire; origin left, w = length. */
export const tramLine: Prop = (a) => {
  const w = a.w || 600;
  let d = '';
  for (let x = 10; x < w; x += 60) d += `M${f(x)} 0V-30M${f(x)} -27h8`;
  return P(d, 'k post') + P(`M0 -26.5H${f(w)}`, 'k k2') + P(`M0 0.6H${f(w)}M0 2H${f(w)}`, 'k k2');
};

/** An electric tram, single-deck at first, double-deck later; windows lit; a spark at the trolley. */
export const tram: Prop = (a, o) => {
  const dbl = a.stage >= 2;
  const h = dbl ? 20 : 12, w = 34;
  o.fx('blink', 6, -26.5, 1, C(0, 0, 2.2, 'lit') + C(0, 0, 5, 'gl', `fill="${a.u('glow')}"`));
  let win = '';
  for (let i = 0; i < 6; i++) win += `M${f(-w / 2 + 3 + i * 5)} ${-h + 3}h3.4v4h-3.4z`;
  if (dbl) for (let i = 0; i < 6; i++) win += `M${f(-w / 2 + 3 + i * 5)} ${-h + 11}h3.4v4h-3.4z`;
  return R(-w / 2 - 4, -h - 6, w + 8, h + 10, 'gl', `fill="${a.u('ht3')}" opacity=".8"`) +
    R(-w / 2, -h, w, h - 2, 'b') + R(-w / 2 - 1, -h - 1.5, w + 2, 2, 'rf') + P(win, 'lit') +
    C(-w / 2 + 6, -1.5, 2, 'd') + C(w / 2 - 6, -1.5, 2, 'd') + L(-4, -h - 1, 6, -26.5, 'k');
};

/** A shop sign over a lit shop window: bracket lantern → lettered fascia → electric sign with bulbs. */
export const sign: Prop = (a) => {
  const shop = R(-13, -12, 26, 11, 'lit', 'opacity=".8"') + P('M-13 -12h26M0 -12v11', 'k k2') + E(0, 2, 18, 4, 'gl', `fill="${a.u('ht3')}"`);
  const word = FASCIA[Math.floor(a.v * 97) % FASCIA.length];
  const fs = (w: number, max: number) => f(Math.min(max, w / (word.length * 0.62)));
  const kind = a.stage >= 2 ? (a.v < 0.5 ? 2 : 3) : a.v < 0.5 ? 0 : 1;
  if (kind === 0) {
    return shop + L(9, -22, 18, -22, 'k') + halftone(a, 18, -18, 7) + R(15.5, -21, 5, 6, 'lit') + R(-14, -20, 24, 7, 'b') +
      `<text x="-2" y="-14.6" font-size="${fs(22, 5.6)}" text-anchor="middle" class="fascia" style="fill:#f2b544">${word}</text>`;
  }
  if (kind === 1) {
    return shop + R(-15, -21, 30, 7.5, 'lit') + `<text x="0" y="-15.3" font-size="${fs(28, 6.2)}" text-anchor="middle" class="fascia">${word}</text>`;
  }
  if (kind === 2) {
    let bulbs = '';
    for (let y = -40; y < -18; y += 3.5) bulbs += C(11, y, 0.9, 'lit');
    return shop + halftone(a, 11, -30, 12) + R(8, -42, 6, 26, 'b') + bulbs + R(-15, -21, 22, 7.5, 'lit') +
      `<text x="-4" y="-15.3" font-size="${fs(20, 6)}" text-anchor="middle" class="fascia">${word}</text>`;
  }
  return shop + R(-14, -26, 28, 9, 'neon') + P('M-10 -21.5h5l2 -2l2 4l2 -2h9', 'k neonk') + C(0, -22, 16, 'gl', 'fill="rgba(232,102,74,.18)"');
};

/** Gasholder: a guide frame and a bell that rises and sinks with the gas in store (CSS var --res). */
export const gasholder: Prop = (a) => {
  const w = 34 + a.v * 10, h = 30;
  let cols = '';
  for (let i = 0; i <= 4; i++) cols += `M${f(-w / 2 + (i * w) / 4)} 0V${-h - 4}`;
  return `<g class="ry">` + P(`M${f(-w / 2 + 1)} 0V${-h + 4}Q0 ${-h - 4} ${f(w / 2 - 1)} ${-h + 4}V0Z`, 'b2') + P(`M${f(-w / 2 + 1)} ${-h / 2}H${f(w / 2 - 1)}`, 'k k2') + '</g>' +
    P(cols + `M${f(-w / 2)} ${-h - 4}H${f(w / 2)}M${f(-w / 2)} ${-h / 2}H${f(w / 2)}`, 'k post');
};

const FASCIA = ['TEAS', 'HATS', 'ALES', 'DRAPER', 'CHEMIST', 'OYSTERS', 'TOBACCO', 'BOOKS', 'LAMPS', 'BAKER', 'GLOVES'];

export const moon: Prop = () => P('M0 -10A10 10 0 1 0 7 7A8 8 0 1 1 0 -10Z', 'moon');

export const GASLIGHT: Record<string, Prop> = { nightFactory, lampPosts, lampGlow, farLamp, tramLine, tram, sign, gasholder, moon };
