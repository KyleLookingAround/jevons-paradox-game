// Code: a city of software in crisp diagram style. Stage 0–3 = autocomplete caret → chat assistant → coding agent →
// agent fleets (the little moving things change shape).
import type { Prop } from '../layout';
import { P, R, C, L, f } from '../svg';

const codeLines = (x: number, y: number, w: number, rows: number, r: () => number, diff = true) => {
  let d = '', g = '', rd = '';
  for (let i = 0; i < rows; i++) {
    const ind = (Math.floor(r() * 3)) * 2, len = Math.max(3, (w - ind - 2) * (0.35 + r() * 0.6));
    d += `M${f(x + 1.5 + ind)} ${f(y + 2.5 + i * 2.6)}h${f(len)}`;
    if (diff && r() < 0.18) (r() < 0.6 ? (g += `M${f(x + 0.6)} ${f(y + 1.4 + i * 2.6)}h0.9v2.2h-0.9z`) : (rd += `M${f(x + 0.6)} ${f(y + 1.4 + i * 2.6)}h0.9v2.2h-0.9z`));
  }
  return P(d, 'cl') + (g ? P(g, 'dg') : '') + (rd ? P(rd, 'dr') : '');
};

/** A floor of a tower of code. */
export const floor: Prop = (a) => {
  const w = 22 + a.v * 10, h = 12;
  return R(-w / 2, -h, w, h, 'b') + codeLines(-w / 2, -h, w, 4, a.r);
};

export const shed: Prop = (a) => {
  const w = 26 + a.v * 10, h = 12;
  return R(-w / 2, -h, w, h, 'b') + R(-w / 2, -h - 2, w, 2, 'rf') + R(-3, -7, 6, 7, 'b2') + C(w / 2 - 6, -h + 5, 2.6, 'k') + C(w / 2 - 6, -h + 5, 0.8, 'd') +
    codeLines(-w / 2, -h, 10, 3, a.r, false);
};

/** A throwaway app: a tile on a stem. Some are already abandoned. */
export const kiosk: Prop = (a) => {
  const dead = a.v > 0.62;
  const cols = ['ac', 'dgf', 'b2', 'blu'];
  let apps = '';
  for (let i = 0; i < 4; i++) apps += R(-3.4 + (i % 2) * 3.8, -17 + Math.floor(i / 2) * 3.8, 2.8, 2.8, dead ? 'b2' : cols[(i + Math.floor(a.v * 9)) % 4]);
  const body = R(-5, -20, 10, 14, dead ? 'aband' : 'b', 'rx="1.6"') + apps + L(0, -6, 0, 0, 'k');
  return dead ? `<g transform="rotate(${f(6 + a.v * 10)})">${body}</g>` : body;
};

/** The legacy system: a temple of old code, still load-bearing. */
export const temple: Prop = (a) => {
  let cols = '';
  for (let x = -16; x <= 16; x += 6.4) cols += R(x - 1.2, -18, 2.4, 15, 'b2');
  return R(-22, -3, 44, 3, 'b') + R(-20, -5, 40, 2, 'b') + cols + R(-21, -21, 42, 3, 'b') + P('M-22 -21L0 -30L22 -21Z', 'b') +
    codeLines(-8, -28, 16, 1, a.r, false);
};

export const scaffoldBay: Prop = (a) => {
  const h = 22 + a.v * 18;
  let d = '';
  for (let y = 0; y > -h; y -= 7) d += `M-7 ${f(y)}H7M-7 ${f(y)}L7 ${f(y - 7)}`;
  return P(`M-7 0V${f(-h)}M7 0V${f(-h)}` + d, 'k scf2') + R(3, -h + 2, 4, 3, 'ac');
};

export const newTower: Prop = (a) => {
  const w = 18 + a.v * 8, h = 40 + a.v * 26;
  return R(-w / 2, -h, w, h, 'b') + codeLines(-w / 2, -h, w, Math.floor((h - 4) / 2.6), a.r) + L(-w / 2, -h, w / 2, -h, 'k K');
};

/** A chatbot: a speech bubble hovering over the town, dots typing. */
export const bubble: Prop = (a, o) => {
  const w = 16 + a.v * 8;
  o.fx('blink', 0, -8, 1, C(-3, 0, 0.9, 'd') + C(0, 0, 0.9, 'd') + C(3, 0, 0.9, 'd'));
  return R(-w / 2, -14, w, 11, 'b', 'rx="3.5"') + P('M-3 -3.2L-5 2L1 -3.2Z', 'b') + P('M-2.6 -3.6H0.6', 'bub');
};

/** Agents: the small moving things. Caret → chat bubble → robot → swarm. */
export const agent: Prop = (a) => {
  switch (a.stage) {
    case 0: return R(-0.8, -7, 1.6, 7, 'ac');
    case 1: return R(-4, -7, 8, 5.5, 'ac', 'rx="2"') + P('M-2 -1.6L-3 1L0 -1.6Z', 'ac');
    case 2: return R(-3.5, -8, 7, 6, 'ac', 'rx="1"') + C(-1.4, -5, 0.8, 'eye') + C(1.4, -5, 0.8, 'eye') + L(-2, -2, -2, 0, 'k') + L(2, -2, 2, 0, 'k');
    default: return C(-4, -3, 1.6, 'ac') + C(0, -5, 1.6, 'ac') + C(4, -3, 1.6, 'ac') + C(-1, -1, 1.6, 'ac') + C(3, 0, 1.2, 'ac');
  }
};

/** Maintenance debt: crates, cable tangles, dead scaffolds, sticky notes. */
export const clutter: Prop = (a) => {
  const k = Math.floor(a.v * 5);
  switch (k) {
    case 0: return R(-6, -5, 6, 5, 'b2') + R(0, -5, 6, 5, 'b2') + R(-3, -10, 6, 5, 'b2');
    case 1: return P('M-8 0C-6 -6 -2 2 0 -4S6 -2 4 -6S-2 -8 -4 -3S6 0 8 -1', 'k tangle');
    case 2: return P('M-5 0V-14M5 0V-10M-5 -7H5M-5 -14L5 -10', 'k dead');
    case 3: return R(-6, -4, 12, 4, 'b2') + R(-4, -8, 9, 4, 'b2') + R(-2, -11, 5, 3, 'b2');
    default: return R(-4, -6, 5, 5, 'note') + R(0, -4, 5, 5, 'note') + R(-2, -10, 5, 5, 'note');
  }
};

export const bulldozer: Prop = () =>
  R(-10, -8, 14, 6, 'ac') + R(-6, -13, 7, 5, 'b') + P('M4 -2L11 -2L13 -10H9', 'k K') + R(-11, -3, 16, 3, 'd', 'rx="1.5"') +
  P('M14 0H40', 'clear') + P('M18 -1h3M26 -1h3M34 -1h3', 'dg');

export const gate: Prop = () =>
  P('M-10 0V-16M10 0V-16', 'k K') + R(-10, -12, 20, 3, 'ac') + C(0, -21, 4, 'b') + P('M-2 -21l1.5 1.5l3 -3', 'okk');

export const library: Prop = (a) =>
  R(-16, -16, 32, 16, 'b') + P('M-18 -16L0 -22L18 -16Z', 'b') +
  P('M-12 -12v8M-10 -12v8M-8 -11v7M-5 -12v8M-3 -12v8M3 -12v8M5 -11v7M8 -12v8M10 -12v8M12 -12v8', 'k') + codeLines(-6, -21, 12, 0, a.r, false);

export const bench: Prop = () => P('M-8 -4H8M-7 -4V0M7 -4V0M-8 -7H8', 'k') + L(14, 0, 14, -8, 'k') + C(14, -13, 6, 'tr');

export const block: Prop = (a) => {
  const w = 10 + a.v * 12, h = 14 + a.v * 26;
  return R(-w / 2, -h, w, h, 'b far');
};

export const towerCrane: Prop = () =>
  P('M0 0V-44M-3 0V-44M-3 -6L0 -12M0 -12L-3 -18M-3 -18L0 -24M0 -24L-3 -30M-3 -30L0 -36M0 -36L-3 -42', 'k') +
  P('M-14 -44H24M-1.5 -50L-14 -44M-1.5 -50L24 -44', 'k') + L(16, -44, 16, -30, 'k') + R(14.5, -30, 3, 2.5, 'ac');

export const sun: Prop = () => `<g class="rsun">${C(0, 0, 16, 'asun')}${C(0, 0, 22, 'k k2')}</g>`;

export const AGENTIC: Record<string, Prop> = {
  floor, shed, kiosk, temple, scaffoldBay, newTower, bubble, bubbleHouse: bubble, agent, clutter, bulldozer, gate, library, bench, block, towerCrane, sun,
};
