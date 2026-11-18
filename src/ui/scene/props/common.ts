// Shared props: drawn with the generic classes every look styles (.b body, .b2 shade side, .rf roof, .k line, .d ink,
// .w window, .lit lit window, .tr foliage, .wa water, .ac accent, .mt metal, .gd ground). A prop draws in local
// coordinates with its origin at the bottom centre (ground contact), y negative upwards.
import type { Prop } from '../layout';
import { P, R, C, E, L, G, f, grid } from '../svg';

/** Hatched shade over a rect (a look may render the pattern as lines, a flat tint or nothing). */
export const shade = (x: number, y: number, w: number, h: number, fill: string) => R(x, y, w, h, 'hz', `fill="${fill}"`);

export const tree: Prop = (a) => {
  const r = 7 + a.v * 4;
  const t = a.v > 0.5;
  return L(0, 0, 0, -r, 'k tk') +
    (t
      ? P(`M${-r} ${-r * 0.9}C${-r} ${-r * 2.3} ${r} ${-r * 2.3} ${r} ${-r * 0.9}C${r * 0.6} ${-r * 0.4} ${-r * 0.6} ${-r * 0.4} ${-r} ${-r * 0.9}Z`, 'tr')
      : C(0, -r * 1.35, r * 0.85, 'tr')) +
    P(`M${f(r * 0.1)} ${f(-r * 0.7)}A${f(r * 0.8)} ${f(r * 0.8)} 0 0 0 ${f(r * 0.8)} ${f(-r * 1.4)}`, 'hz2', `fill="${a.hatch()}"`);
};

export const poplar: Prop = (a) => {
  const h = 22 + a.v * 10;
  return L(0, 0, 0, -4, 'k tk') + P(`M0 ${-h}C5 ${-h * 0.7} 5 -6 0 -3C-5 -6 -5 ${-h * 0.7} 0 ${-h}Z`, 'tr') +
    P(`M0 ${-h}C5 ${-h * 0.7} 5 -6 0 -3Z`, 'hz2', `fill="${a.hatch()}"`);
};

export const hedge: Prop = (a) => {
  const w = a.w || 30;
  let d = `M${-w / 2} 0`;
  for (let x = -w / 2; x < w / 2; x += 5) d += `Q${f(x + 2.5)} ${f(-6 - (a.r() * 2))} ${f(x + 5)} 0`;
  return P(d + 'Z', 'tr');
};

/** A plain works: shed, a stack and smoke. The fallback for any application icon a look does not know. */
export const works: Prop = (a, o) => {
  const w = 34 + a.v * 18, h = 16 + a.v * 6, cx = w / 2 - 6;
  o.fx('smoke', cx + 1, -h - 26, 1);
  return R(-w / 2, -h, w, h, 'b') + shade(w / 2 - 10, -h, 10, h, a.hatch()) +
    P(`M${f(-w / 2 - 2)} ${f(-h)}L${f(-w / 2 + 8)} ${f(-h - 7)}L${f(-w / 2 + 8)} ${f(-h)}L${f(-w / 2 + 18)} ${f(-h - 7)}L${f(-w / 2 + 18)} ${f(-h)}L${f(-w / 2 + 28)} ${f(-h - 7)}L${f(-w / 2 + 28)} ${f(-h)}Z`, 'rf') +
    P(`M${f(cx - 2)} ${f(-h)}L${f(cx - 1)} ${f(-h - 26)}H${f(cx + 3)}L${f(cx + 4)} ${f(-h)}Z`, 'b') +
    grid(-w / 2 + 4, -h + 5, Math.floor((w - 14) / 6), 2, 6, 6, 3, 3);
};

export const cottage: Prop = (a, o) => {
  const w = 12 + a.v * 4, h = 8;
  if (a.v > 0.6) o.fx('smoke', w / 2 - 3, -h - 9, 0.35);
  return R(-w / 2, -h, w, h, 'b') + P(`M${f(-w / 2 - 1.5)} ${f(-h)}L0 ${f(-h - 6)}L${f(w / 2 + 1.5)} ${f(-h)}Z`, 'rf') +
    R(w / 2 - 4, -h - 7, 2, 4, 'b') + R(-1, -4, 2, 4, 'd') + grid(-w / 2 + 2, -h + 2, 1, 1, 0, 0, 2, 2) + grid(w / 2 - 4, -h + 2, 1, 1, 0, 0, 2, 2);
};

/** A row of terraced houses; the overlay pass draws only lit windows, in the same places. */
export const terrace: Prop = (a, o) => {
  const n = 4 + Math.floor(a.v * 3), hw = 8, h = 11, w = n * hw;
  if (a.overlay) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + i * hw;
      if (a.r() < 0.75) d += `M${f(x + 1.5)} ${f(-h + 2)}h2v2.4h-2z`;
      if (a.r() < 0.55) d += `M${f(x + 4.5)} ${f(-h + 2)}h2v2.4h-2z`;
      if (a.r() < 0.6) d += `M${f(x + 4.5)} ${f(-h + 6.5)}h2v2.4h-2z`;
    }
    return d ? P(d, 'lit') : '';
  }
  let body = R(-w / 2, -h, w, h, 'b');
  body += P(`M${f(-w / 2 - 1)} ${f(-h)}L${f(-w / 2 + 3)} ${f(-h - 5)}H${f(w / 2 - 3)}L${f(w / 2 + 1)} ${f(-h)}Z`, 'rf');
  body += shade(-w / 2 - 1, -h - 5, w + 2, 5, a.hatch(1));
  let stacks = '', doors = '', wins = '';
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + i * hw;
    if (i % 2 === 0) stacks += `M${f(x + hw - 1.2)} ${f(-h - 5)}v-3h2.4v3z`;
    doors += `M${f(x + 1.5)} -4.5h2v4.5h-2z`;
    wins += `M${f(x + 1.5)} ${f(-h + 2)}h2v2.4h-2zM${f(x + 4.5)} ${f(-h + 2)}h2v2.4h-2zM${f(x + 4.5)} ${f(-h + 6.5)}h2v2.4h-2z`;
    if (i > 0) body += L(x, -h, x, 0, 'k k2');
  }
  if (a.v > 0.3) o.fx('smoke', -w / 2 + hw - 0.2, -h - 9, 0.3);
  return body + P(stacks, 'b') + P(doors, 'd') + P(wins, 'w');
};

export const chimney: Prop = (a, o) => {
  const h = 34 + a.v * 22;
  o.fx('smoke', 0, -h - 1, 0.9 + a.v * 0.4);
  return P(`M-3.2 0L-2 ${f(-h)}H2L3.2 0Z`, 'b') + R(-2.6, -h - 2, 5.2, 3, 'b') + shade(0.6, -h, 2.2, h, a.hatch());
};

export const church: Prop = (a) =>
  R(-14, -12, 20, 12, 'b') + P('M-15 -12L-4 -19L7 -12Z', 'rf') + R(6, -20, 8, 20, 'b') + P('M5.5 -20L10 -40L14.5 -20Z', 'rf') +
  shade(10, -20, 4, 20, a.hatch()) + P('M-11 -8h2v4h-2zM-6 -8h2v4h-2zM-1 -8h2v4h-2z', 'w') + P('M9 -16h2v4h-2z', 'w');

/** A notice board on two posts: the generic sign that a rule is in force. */
export const notice: Prop = () =>
  L(-7, 0, -7, -14, 'k k2') + L(7, 0, 7, -14, 'k k2') + R(-9, -18, 18, 10, 'b') + P('M-6 -15.5h12M-6 -13h9M-6 -10.5h11', 'k') + C(6, -10.5, 1.4, 'ac');

/** Customs house: a small classical box with a flag (a duty in force). */
export const customs: Prop = (a) =>
  R(-14, -14, 28, 14, 'b') + P('M-16 -14L0 -21L16 -14Z', 'rf') + shade(8, -14, 6, 14, a.hatch()) +
  P('M-10 -11v9M-5 -11v9M0 -11v9M5 -11v9M10 -11v9', 'k') + R(-2, -6, 4, 6, 'd') +
  L(0, -21, 0, -31, 'k') + P('M0 -31h8l-2 2.5l2 2.5h-8z', 'ac');

/** Permit office: a hut with a big board of ruled permits (a cap in force). */
export const permits: Prop = (a) =>
  R(-8, -10, 14, 10, 'b') + P('M-9.5 -10L-1 -15L7.5 -10Z', 'rf') + R(-3, -6, 3, 6, 'd') + shade(2, -10, 4, 10, a.hatch()) +
  L(10, 0, 10, -16, 'k k2') + L(22, 0, 22, -16, 'k k2') + R(8, -22, 16, 11, 'b') +
  P('M10 -19.5h12M10 -17h12M10 -14.5h8', 'k') + P('M19 -16l1.5 1.5l3 -3', 'ak');

/** Allotments: strips of rows, a shed and a gardener (sufficiency). */
export const allotments: Prop = (a) => {
  let d = '';
  for (let i = 0; i < 5; i++) {
    const x = -24 + i * 9;
    d += `M${x} 0l3 -8M${x + 3} 0l3 -8M${x + 6} 0l3 -8`;
  }
  return P('M-26 0L-22 -9H24L28 0Z', 'gd') + P(d, 'k tr2') + R(16, -15, 8, 7, 'b') + P('M15 -15l5 -3l5 3z', 'rf') +
    C(-30, -9, 1.6, 'd') + P('M-30 -7.5v5M-30 -6l-2.5 3M-30 -6l3 -1', 'k');
};

/** Tower windmill (substitution in the old world). Sails turn. */
export const windmill: Prop = (a, o) => {
  const sails = P('M0 0L-1.4 -15L1.4 -15ZM0 0L15 -1.4L15 1.4ZM0 0L1.4 15L-1.4 15ZM0 0L-15 1.4L-15 -1.4Z', 'b') +
    P('M-1 -5h2M-1 -9h2M-1 -13h2M5 -1v2M9 -1v2M13 -1v2M-1 5h2M-1 9h2M-1 13h2M-5 -1v2M-9 -1v2M-13 -1v2', 'k');
  o.fx('spin', 0, -27, 1, sails);
  return P('M-7 0L-4.5 -24H4.5L7 0Z', 'b') + P('M-5.5 -24Q0 -31 5.5 -24Z', 'rf') + shade(1.5, -24, 4, 24, a.hatch()) + R(-1.5, -6, 3, 6, 'd') + R(-1, -16, 2, 3, 'w');
};

/** Water wheel beside a race (substitution). */
export const waterwheel: Prop = (a, o) => {
  const wheel = C(0, 0, 9, 'k') + C(0, 0, 6, 'k') + P('M0 -9V9M-9 0H9M-6.4 -6.4L6.4 6.4M-6.4 6.4L6.4 -6.4', 'k');
  o.fx('spin', -10, -9, 1, wheel);
  return R(-2, -18, 18, 18, 'b') + P('M-3 -18L7 -24L17 -18Z', 'rf') + shade(10, -18, 6, 18, a.hatch()) + R(4, -8, 4, 8, 'd') +
    P('M-24 1Q-14 -2 -2 1', 'wa wak');
};

/** Bottle kiln: things fired again rather than dug again (circularity). */
export const kiln: Prop = (a, o) => {
  o.fx('smoke', 0, -27, 0.5);
  return P('M-9 0C-12 -10 -10 -16 -3 -22L-2 -27H2L3 -22C10 -16 12 -10 9 0Z', 'b') + shade(2, -22, 6, 22, a.hatch()) +
    R(-14, -6, 6, 6, 'b') + R(8, -6, 6, 6, 'b') + R(-1.5, -5, 3, 5, 'd');
};

/** A small park: trees, a bench, a fountain (green spending). */
export const park: Prop = (a, o) =>
  P('M-26 0L-22 -5H22L26 0Z', 'gd') + G(tree({ ...a, v: 0.3 }, o), 'transform="translate(-16 -2) scale(.8)"') +
  G(tree({ ...a, v: 0.8 }, o), 'transform="translate(14 -2) scale(.9)"') + E(0, -2, 6, 1.6, 'wa') + L(0, -2, 0, -6, 'k') + P('M-4 -1h8', 'k');

/** Modern wind turbine (substitution later on). */
export const turbine: Prop = (a, o) => {
  const h = 40 + a.v * 10;
  const blades = P('M0 0L-1.2 -18L0 -19L1.2 -18ZM0 0L16.2 8L16 9.5L14.6 10.2ZM0 0L-15 10.4L-16 9.5L-15.6 8Z', 'b');
  o.fx('spin', 0, -h, 1, blades);
  return P(`M-1.6 0L-0.8 ${f(-h)}H0.8L1.6 0Z`, 'b') + R(-2, -h - 1.5, 5, 3, 'b');
};

export const solar: Prop = (a) => {
  let d = '';
  for (let i = 0; i < 4; i++) d += `M${-20 + i * 11} -2l3 -7h9l-3 7z`;
  return P(d, 'b') + P('M-18 -5.5h40M-14 -9l-4 7M-3 -9l-4 7M8 -9l-4 7M19 -9l-4 7', 'k');
};

/** Builder's scaffold, used for the founding moment (w × h). */
export function scaffold(w: number, h: number): string {
  let d = '';
  const nx = Math.max(2, Math.round(w / 9)), ny = Math.max(2, Math.round(h / 8));
  for (let i = 0; i <= nx; i++) d += `M${f(-w / 2 + (i * w) / nx)} 0V${f(-h)}`;
  for (let j = 1; j <= ny; j++) d += `M${f(-w / 2 - 2)} ${f(-(j * h) / ny)}H${f(w / 2 + 2)}`;
  for (let i = 0; i < nx; i++) d += `M${f(-w / 2 + (i * w) / nx)} 0L${f(-w / 2 + ((i + 1) * w) / nx)} ${f(-h / ny)}`;
  return P(d, 'k scf');
}

/** Surveyor's stakes and string on a flat plot (w × h is the ground patch, origin bottom-left in global units). */
export function survey(w: number, h: number): string {
  const sk = (x: number, y: number) => `M${f(x)} ${f(y)}v-6`;
  const k = h * 0.6;
  const pts: [number, number][] = [[0, 0], [w, 0], [w - k, -h], [k * 0.4, -h]];
  return P(`M0 0H${f(w)}L${f(w - k)} ${f(-h)}H${f(k * 0.4)}Z`, 'svf') +
    P(`M0 -3H${f(w)}L${f(w - k)} ${f(-h - 3)}H${f(k * 0.4)}Z`, 'svs') +
    P(pts.map((p) => sk(p[0], p[1])).join(''), 'svk') +
    P(`M${f(w * 0.5)} ${f(-h * 0.5)}v-13`, 'svk') + P(`M${f(w * 0.5)} ${f(-h * 0.5 - 13)}h7l-2 2.5l2 2.5h-7z`, 'svfl');
}

export const COMMON: Record<string, Prop> = {
  tree, poplar, hedge, works, cottage, terrace, chimney, church, notice, customs, permits, allotments, windmill,
  waterwheel, kiln, park, turbine, solar,
};
