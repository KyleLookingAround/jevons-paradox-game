// Code: a night megacity in rain. Neon is drawn as a bright tube over a wide faint halo (no blur filters); glass and
// holograms are flat translucent panels with scanlines; wet streets carry faint reflections drawn below each prop.
// Stage 0–3 changes the agents' drones (single light → quad → cargo → swarm).
import type { Prop } from '../layout';
import { P, R, C, L, f, rng, hash } from '../svg';

export type Neon = 'nm' | 'nc' | 'na' | 'nr' | 'ng' | 'nv';
const NEONS: Neon[] = ['nm', 'nc', 'na', 'nv'];

/** A neon tube: halo + tube. */
export const neon = (d: string, c: Neon | 'dead') => P(d, `nh ${c}`) + P(d, `nt ${c}`);
/** Neon lettering (invented words only). */
export const sign = (x: number, y: number, word: string, size: number, c: Neon | 'dead', anchor = 'middle') =>
  `<text x="${f(x)}" y="${f(y)}" font-size="${f(size)}" text-anchor="${anchor}" class="sgh ${c}">${word}</text>` +
  `<text x="${f(x)}" y="${f(y)}" font-size="${f(size)}" text-anchor="${anchor}" class="sg ${c}">${word}</text>`;
/** Reflection on the wet street below a prop (y > 0). */
const reflect = (x: number, w: number, c: Neon, h = 18) =>
  R(x, 1, w, h * 0.35, `rfl ${c}`, 'opacity=".22"') + R(x + w * 0.15, 1 + h * 0.35, w * 0.7, h * 0.35, `rfl ${c}`, 'opacity=".12"') +
  R(x + w * 0.3, 1 + h * 0.7, w * 0.4, h * 0.3, `rfl ${c}`, 'opacity=".06"');

/* ------------------------------------------------------------------ */
/* Towers: one geometry, three passes (base, cold machine light, warm human light)                           */
/* ------------------------------------------------------------------ */
interface Geo { w: number; h: number; wins: [number, number][]; crown: number; strip: Neon | null; ant: boolean }
function towerGeo(v: number, wParam: number): Geo {
  const r = rng(hash('tower' + v.toFixed(4)));
  const w = wParam || 26 + v * 24, h = 130 + r() * 150, crown = r() < 0.5 ? 0 : 8 + r() * 14;
  const wins: [number, number][] = [];
  for (let y = -h + 8; y < -6; y += 5) for (let x = -w / 2 + 3; x < w / 2 - 3; x += 4) wins.push([x, y]);
  return { w, h, wins, crown, strip: r() < 0.55 ? NEONS[Math.floor(r() * 4)] : null, ant: r() < 0.6 };
}

export const ctower: Prop = (a, o) => {
  const g = towerGeo(a.v, a.w);
  let d = '';
  for (const [x, y] of g.wins) d += `M${f(x)} ${f(y)}h2v2.6h-2z`;
  let s = R(-g.w / 2, -g.h, g.w, g.h, 'b') + P(d, 'w') + R(g.w / 2 - 5, -g.h, 5, g.h, 'b2');
  if (g.crown) s += R(-g.w / 2 + 4, -g.h - g.crown, g.w - 8, g.crown, 'b') + L(-g.w / 2 + 4, -g.h, g.w / 2 - 4, -g.h, 'k');
  const top = -g.h - g.crown;
  if (g.ant) { s += L(0, top, 0, top - 16, 'k'); o.fx('blink', 0, top - 16, 1, C(0, 0, 1.3, 'redl')); }
  if (g.strip) s += neon(`M${f(-g.w / 2 + 0.8)} ${f(-g.h + 6)}V-10`, g.strip);
  // Rim light from the neon below, and roof plant (tanks, a billboard frame) on some.
  s += P(`M${f(g.w / 2 - 0.4)} ${f(-g.h)}V0`, 'rim');
  if (!g.crown && a.v > 0.5) s += R(-g.w / 4, -g.h - 6, 7, 6, 'mt') + R(2, -g.h - 4, 5, 4, 'mt');
  // Its reflection on the wet street below (a.h = distance down to the kerb): the strip broken into ripples.
  if (a.h > 0 && g.strip) {
    let d = '';
    for (let k = 0; k < 9; k++) { const y = a.h + 2 + k * 3.6 + (k % 2) * 0.8, w = 1.4 + k * 0.5; d += `M${f(-g.w / 2 + 0.8 - w / 2)} ${f(y)}h${f(w)}`; }
    s += P(d, `rp ${g.strip}`);
  }
  if (a.h > 0) s += R(-g.w / 2 + 2, a.h + 1, g.w - 4, 16, 'rfb');
  return s;
};

/** Machine light: most windows lit cold blue-violet (chat assistants in every window). */
export const ctowerCold: Prop = (a) => {
  const g = towerGeo(a.v, a.w);
  let d = '';
  for (const [x, y] of g.wins) if (a.r() < 0.62) d += `M${f(x)} ${f(y)}h2v2.6h-2z`;
  return d ? P(d, 'cold') : '';
};

/** Human light: a few warm windows, each with somebody in it. */
export const ctowerWarm: Prop = (a) => {
  const g = towerGeo(a.v, a.w);
  let s = '';
  const n = 2 + Math.floor(a.r() * 3);
  for (let i = 0; i < n; i++) {
    const [x, y] = g.wins[Math.floor(a.r() * g.wins.length)] ?? [0, -20];
    s += R(x - 1, y - 1, 4, 4.6, 'warm') + P(`M${f(x + 1)} ${f(y + 3.6)}v-1.2a.9 .9 0 1 1 0.01 0z`, 'who') + R(x - 0.6, y + 2.4, 3.2, 1.2, 'who');
  }
  return s;
};

/* ------------------------------------------------------------------ */
/* Street level                                                        */
/* ------------------------------------------------------------------ */
const WORDS_TOOLS = ['FIX', 'TOOLS', 'REPAIR', 'PARTS', 'MAKE', 'BUILD'];
const WORDS_APPS = ['APP', 'NEW', 'GET', 'LIVE', 'PING', 'TRY', 'NOW', 'FREE'];

/** Internal tools: a lit workshop under the arcades, shutter half up, its sign in neon. */
export const workshop: Prop = (a) => {
  const w = 30 + a.v * 12, h = 17, c = NEONS[Math.floor(a.v * 7) % 4];
  let shutter = '';
  for (let y = -h + 1; y < -h + 6; y += 1.4) shutter += `M${f(-w / 2 + 2)} ${f(y)}H${f(w / 2 - 2)}`;
  return R(-w / 2 - 2, -h - 12, w + 4, 12, 'b') + R(-w / 2, -h, w, h, 'b2') + R(-w / 2 + 2, -h + 6, w - 4, h - 6, 'shop') +
    P(shutter, 'k') + P(`M${f(-w / 2 + 5)} -4h${f(w * 0.4)}M${f(-w / 2 + 7)} -4v-4M${f(w * 0.1)} -4v-3`, 'who wk') +
    C(w / 2 - 7, -9, 1.6, 'who') + R(w / 2 - 8.4, -7.4, 2.8, 4, 'who') +
    sign(0, -h - 3.4, WORDS_TOOLS[Math.floor(a.v * 6) % 6], 7.5, c) + reflect(-w / 2 + 2, w - 4, 'nc', 16);
};

/** Throwaway apps: a kiosk and its blade sign; a third of them already dead, some flickering. */
export const kiosk: Prop = (a, o) => {
  const dead = a.v > 0.64, flick = !dead && a.v < 0.28;
  const c: Neon = NEONS[Math.floor(a.v * 11) % 4];
  const word = WORDS_APPS[Math.floor(a.v * 17) % WORDS_APPS.length];
  const blade = R(-4, -40, 8, 22, 'b') + `<g transform="rotate(-90 0 -29)">${sign(0, -26.6, word, 6.5, dead ? 'dead' : c)}</g>`;
  const booth = R(-6, -14, 12, 14, 'b') + R(-4.5, -12, 9, 7, dead ? 'scr0' : 'scr');
  if (flick) o.fx('blink', 0, -29, 1, `<g class="flk">${neon('M-3 -10H3M-3 10H3', c)}</g>`);
  return L(0, -18, 0, -14, 'k') + blade + booth + (dead ? '' : reflect(-5, 10, c, 14));
};

/** A blade sign hung on a facade (more throwaway apps, higher up). */
export const blade: Prop = (a, o) => {
  const dead = a.v > 0.6;
  const c: Neon = NEONS[Math.floor(a.v * 13) % 4];
  const word = WORDS_APPS[Math.floor(a.v * 23) % WORDS_APPS.length];
  if (!dead && a.v < 0.2) o.fx('blink', 0, -14, 1, C(0, 0, 2, 'nh ' + c));
  return L(-6, -26, 0, -26, 'k') + R(-3.5, -28, 7, 24, 'b') + `<g transform="rotate(-90 0 -16)">${sign(0, -13.8, word, 6, dead ? 'dead' : c)}</g>`;
};

/* ------------------------------------------------------------------ */
/* Legacy rewrite: the old tower in scaffolding, its glass replacement */
/* ------------------------------------------------------------------ */
export const oldTower: Prop = (a) => {
  const w = 46, h = 150;
  let bands = '', wins = '';
  for (let y = -h + 10; y < -8; y += 9) { bands += `M${-w / 2} ${y}H${w / 2}`; for (let x = -w / 2 + 4; x < w / 2 - 4; x += 7) if ((x * 7 + y) % 5 !== 0) wins += `M${x} ${y + 3}h3v2.4h-3z`; }
  return R(-w / 2, -h, w, h, 'conc') + P(bands, 'k') + P(wins, 'w') + R(-w / 2 - 3, -h - 6, w + 6, 6, 'conc') +
    sign(0, -h - 10, 'CORE·SYS', 8, 'dead') + R(-6, -14, 12, 14, 'b2');
};

export const scaffoldC: Prop = (a, o) => {
  const h = 60 + a.v * 70, w = 14;
  let d = '';
  for (let y = 0; y > -h; y -= 8) d += `M${-w / 2} ${f(y)}H${w / 2}M${-w / 2} ${f(y)}L${w / 2} ${f(y - 8)}`;
  o.fx('blink', w / 2, -h * 0.6, 1, C(0, 0, 1.6, 'na-dot'));
  return P(`M${-w / 2} 0V${f(-h)}M${w / 2} 0V${f(-h)}` + d, 'scaf2');
};

/** One floor of the glass replacement. */
export const glassFloor: Prop = (a) => {
  const w = 36;
  return R(-w / 2, -12, w, 12, 'glassc') + P(`M${-w / 2} -6H${w / 2}M${-w / 2 + 9} -12V0M0 -12V0M${w / 2 - 9} -12V0`, 'glk');
};

/* ------------------------------------------------------------------ */
/* Agents writing for agents: towers that build themselves             */
/* ------------------------------------------------------------------ */
export const cfloor: Prop = (a) => {
  const w = 32;
  const c: Neon = a.v < 0.5 ? 'nc' : 'nm';
  return R(-w / 2, -12, w, 12, 'b') + R(-w / 2 + 2, -8, w - 4, 3, 'cold', 'opacity=".85"') + neon(`M${-w / 2} -12H${w / 2}`, c);
};

export const towerCraneC: Prop = (a, o) => {
  o.fx('blink', 22, -30, 1, C(0, 0, 1.5, 'redl'));
  return P('M0 0V-30M-3 0V-30M-3 -6L0 -12M0 -12L-3 -18M-3 -18L0 -24M-3 -30H24M-1.5 -36L24 -30M-1.5 -36L-12 -30H-3', 'scaf2') + L(16, -30, 16, -18, 'scaf2') + R(14, -18, 4, 3, 'na-dot');
};

/** A drone. Stage 0 single light → 1 quad → 2 cargo → 3 swarm. */
export const drone: Prop = (a) => {
  const one = (x: number, y: number, k = 1) =>
    P(`M${f(x - 5 * k)} ${f(y)}H${f(x + 5 * k)}`, 'k dr') + R(x - 2 * k, y, 4 * k, 2 * k, 'b') + C(x, y + 2.6 * k, 0.9 * k, a.v < 0.5 ? 'redl' : 'cyl');
  switch (a.stage) {
    case 0: return one(0, -6);
    case 1: return one(0, -6, 1.2) + P('M-6 -7.4h3M3 -7.4h3', 'k dr');
    case 2: return one(0, -8, 1.4) + R(-3, -3.4, 6, 3.4, 'conc');
    default: return one(-7, -6, 0.9) + one(0, -9, 0.9) + one(7, -5, 0.9);
  }
};

/** Chat assistants: a holographic hoarding with a speech bubble. */
export const hoarding: Prop = (a) => {
  const w = 58, h = 30;
  let scan = '';
  for (let y = -h + 2; y < -1; y += 2.4) scan += `M${-w / 2} ${f(y)}H${w / 2}`;
  return R(-w / 2, -h, w, h, 'holo') + P(scan, 'holos') + neon(`M${-w / 2} ${-h}H${w / 2}V0H${-w / 2}Z`, 'nc') +
    P('M-18 -22h22a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h-12l-5 4v-4h-5a4 4 0 0 1 -4 -4v-6a4 4 0 0 1 4 -4z', 'nt nm') +
    C(-12, -15, 1.3, 'nmf') + C(-7, -15, 1.3, 'nmf') + C(-2, -15, 1.3, 'nmf') + sign(17, -12, 'ASK', 8, 'nc');
};

export const skycar: Prop = (a) =>
  P('M-8 -2Q-6 -6 0 -6Q6 -6 8 -2Z', 'b') + R(-9, -2, 18, 2.4, 'b2') + P('M-9 -0.8h-14', 'trailr') + C(8.4, -0.8, 0.9, 'cyl') + C(-8.6, -0.8, 0.9, 'redl');

/* ------------------------------------------------------------------ */
/* Maintenance debt                                                    */
/* ------------------------------------------------------------------ */
export const clutterC: Prop = (a) => {
  const k = Math.floor(a.v * 6);
  switch (k) {
    case 0: return R(-9, -9, 18, 9, 'b2') + P('M-11 -9L0 -13L11 -9', 'k') + R(-3, -6, 4, 4, 'warm', 'opacity=".55"'); // lean-to shack
    case 1: return P('M-6 0V-16M-2 0V-12M2 0V-18M6 0V-10M-8 -6H8M-6 -12H4', 'pipe') + C(2, -14, 1.2, 'rust'); // pipework
    case 2: return R(-7, -7, 14, 7, 'mt') + R(-6, -14, 12, 7, 'mt') + C(-3, -10.5, 2.2, 'k') + C(3, -3.5, 2.2, 'k'); // AC units
    case 3: return neon('M-8 -10h5v5h-5zM0 -10l4 5M6 -10v5', 'dead'); // dead neon
    case 4: return R(-4, -10, 8, 10, 'mt') + P('M-4 -8C-12 -12 -8 -2 -16 -4M4 -6C12 -10 10 0 18 -2M0 -10C-2 -18 6 -18 4 -24', 'cab'); // junction box
    default: return P('M-10 0Q-6 -12 0 -6T10 -8', 'cab') + P('M-10 -2Q-2 -16 4 -4T12 -4', 'cab'); // tangle
  }
};

/** Cables slung across the street between facades. */
export const cables: Prop = (a) => {
  const w = a.w || 60;
  let d = '';
  for (let i = 0; i < 3 + Math.floor(a.v * 3); i++) { const sag = 6 + i * 3 + a.v * 6; d += `M${f(-w / 2)} ${-i * 1.5}Q0 ${f(sag)} ${f(w / 2)} ${f(-i * 2)}`; }
  return P(d, 'cab');
};

/* ------------------------------------------------------------------ */
/* Signs of restraint                                                  */
/* ------------------------------------------------------------------ */
export const demolition: Prop = () =>
  P('M-30 0V-46M-34 0V-46M-34 -10L-30 -16M-30 -16L-34 -22M-34 -22L-30 -28M-34 -34L-30 -40M-34 -46H8M-32 -52L8 -46', 'scaf2') +
  L(4, -46, 4, -22, 'k') + C(4, -18, 4, 'mt') + R(-14, -2, 40, 2, 'clearc') + P('M-12 -1h4M-2 -1h4M8 -1h4M18 -1h4', 'clearl') + sign(10, -8, 'CLEARED', 5.5, 'ng');

export const gateC: Prop = () => neon('M-12 0V-20Q0 -28 12 -20V0', 'ng') + sign(0, -10, 'OK', 7, 'ng') + R(-14, -1, 28, 1.5, 'mt');

export const libraryC: Prop = () => {
  let books = '';
  for (let x = -14; x < 14; x += 2.4) books += `M${f(x)} -3v-${f(5 + ((x * 13) % 4))}`;
  return R(-18, -20, 36, 20, 'b') + R(-16, -15, 32, 13, 'warm', 'opacity=".5"') + P(books, 'k') + sign(0, -23, 'LIB', 6.5, 'na');
};

export const gardenC: Prop = () =>
  R(-20, -2, 40, 2, 'gdc') + L(8, -2, 8, -12, 'k') + C(8, -17, 7, 'treec') + C(2, -14, 4.5, 'treec') + P('M-14 -6H-2M-13 -6V-2M-3 -6V-2M-14 -9H-2', 'k') + C(-8, -12, 9, 'pool2');

export const tollC: Prop = () => P('M-26 0V-24M26 0V-24', 'k K') + R(-27, -28, 54, 4, 'mt') + R(-10, -36, 20, 8, 'b') + sign(0, -30, 'TOLL', 6.5, 'na');

export const permitC: Prop = () => L(0, 0, 0, -12, 'k') + R(-12, -28, 24, 16, 'holo') + neon('M-12 -28h24v16h-24z', 'nc') + P('M-9 -24h18M-9 -20h18M-9 -16h11', 'nt nc') + sign(0, -31, 'PERMIT', 5, 'nc');

export const solarC: Prop = () => {
  let d = '';
  for (let i = 0; i < 4; i++) d += `M${-20 + i * 11} -1l3 -7h9l-3 7z`;
  return P(d, 'solc') + P('M-18 -4.5h40', 'nt nc');
};

/* ------------------------------------------------------------------ */
/* Human attention: the few lit windows with somebody in them          */
/* ------------------------------------------------------------------ */
/** Window size for the vignettes (viewBox units); the dark frames in the backdrop use the same. */
export const VW = 40, VH = 24;
const SIL = 'sil';

/** One warm window, drawn at its bottom centre: an interior lamp-lit in amber with a person in it. v picks who. */
export const vignette: Prop = (a) => {
  const w = VW, h = VH, x0 = -w / 2, k = Math.floor(a.v * 6) % 6;
  // spill of warm light down the facade and a halo, then the room
  let s = P(`M${f(x0 + 2)} 1L${f(x0 - 6)} 22H${f(w / 2 + 6)}L${f(w / 2 - 2)} 1Z`, 'vspill') + R(x0 - 3, -h - 3, w + 6, h + 6, 'vhalo') +
    R(x0, -h, w, h, '', `fill="${a.u('vwarm')}"`);
  const body = (x: number, y: number) => C(x, y - 9.5, 2.6, SIL) + P(`M${f(x - 4)} ${f(y)}Q${f(x - 4.5)} ${f(y - 7)} ${f(x)} ${f(y - 7)}Q${f(x + 4.5)} ${f(y - 7)} ${f(x + 4)} ${f(y)}Z`, SIL);
  switch (k) {
    case 0: // at a desk under an anglepoise, the cat on the sill
      s += P(`M${f(x0 + 13)} -10l3 -7l5 3`, 'vk') + P(`M${f(x0 + 19)} -15l5 2l-3 4z`, SIL) + P(`M${f(x0 + 21)} -12L${f(x0 + 14)} -5H${f(x0 + 30)}Z`, 'vcone') +
        body(4, -5) + P(`M${f(x0 + 8)} -5H${f(w / 2 - 4)}V-3.6H${f(x0 + 8)}Z`, SIL) + R(x0 + 10, -9, 7, 4, 'vscr') +
        // the cat, outside on the sill
        P(`M${f(w / 2 - 9)} 0c0 -3 1 -5.5 3 -6l.4 -2.4 1.4 1.6 1.4 -1.6 .4 2.4c2 .5 2.6 3 2.6 6zM${f(w / 2 - 2)} 0q3 0 3 -3`, SIL);
      break;
    case 1: // reading in an armchair, a plant on the sill
      s += P(`M${f(x0 + 6)} 0V-9q0 -3 3 -3h3v-3q0 -2 2 -2h6q2 0 2 2v6h2q2 0 2 2V0Z`, SIL) + C(x0 + 15, -18, 2.6, SIL) + P(`M${f(x0 + 18)} -13l5 -2v4z`, 'vbook') +
        R(w / 2 - 12, -h + 2, 1, 6, SIL) + C(w / 2 - 11.5, -h + 9, 3, 'vlamp') +
        P(`M${f(w / 2 - 6)} 0v-3M${f(w / 2 - 6)} -3q-4 -3 -5 -8M${f(w / 2 - 6)} -3q3 -4 6 -7M${f(w / 2 - 6)} -4q0 -5 2 -9`, 'vleaf') + R(w / 2 - 8.5, -3, 5, 3, SIL);
      break;
    case 2: // two at a kitchen table under a hanging lamp
      s += L(0, -h, 0, -h + 6, 'vk') + P('M-4 -18h8l-2 -2.6h-4z', SIL) + C(0, -16.6, 3.4, 'vlamp') +
        body(-10, -4) + body(10, -4) + R(-7, -5, 14, 1.6, SIL) + P('M-2 -5v-3h3v3', SIL);
      break;
    case 3: // somebody playing the guitar on the end of a bed
      s += R(x0 + 3, -4, w - 6, 4, SIL) + body(-2, -4) + P('M-8 -6a3.4 3 0 1 1 6 1l9 -6 1 1.4 -9 6a3.4 3 0 1 1 -7 -2.4z', 'vgtr') +
        P(`M${f(w / 2 - 7)} ${f(-h + 4)}h4v6h-4z`, 'vpic');
      break;
    case 4: // looking out, a hand on the glass, the curtain drawn back
      s += P(`M${f(x0)} ${f(-h)}h7q-3 10 2 ${f(h)}h-9z`, 'vcur') + body(4, 0) + P('M7.5 -10l4 -6 1 .6 -3.6 6z', SIL) + C(12.2, -16.4, 1.6, SIL);
      break;
    default: // a child drawing at the table, a parent leaning over
      s += R(x0 + 6, -6, w - 12, 1.6, SIL) + C(-6, -10, 2.2, SIL) + P('M-10 -4q0 -5 4 -5t4 5z', SIL) +
        C(6, -16, 2.6, SIL) + P('M2 -4q-1 -9 4 -10q5 0 6 4l-6 2z', SIL) + R(-3, -7, 5, 1.2, 'vpaper');
  }
  // window bars and sill over the room
  return s + P(`M${f(x0)} ${f(-h * 0.42)}H${f(w / 2)}M0 ${f(-h)}V0`, 'vbar') + R(x0 - 2, 0, w + 4, 2, 'vsill');
};

/** Somebody walking in the rain under an umbrella (a mover on the pavement). */
export const walker: Prop = (a) => {
  const c: Neon = NEONS[Math.floor(a.v * 9) % 4];
  const leg = a.v < 0.5 ? 'M-1.5 0l1.5 -6l1.6 6' : 'M-2 0l2 -6l1 6';
  return P(leg, 'wlk') + R(-2, -12, 4, 7, 'wlb') + C(0, -13.6, 1.6, 'wlb') + L(0, -12, 0, -18, 'wlk') +
    P('M-8 -17.5Q0 -25 8 -17.5Z', `umb ${c}`) + P('M-8 -17.5Q0 -25 8 -17.5', `nt ${c}`, 'stroke-width=".9"') +
    R(-2, 1, 4, 5, `rfl ${c}`, 'opacity=".25"');
};

/** The elevated train: a long lit carriage set (a mover on the viaduct). */
export const elTrain: Prop = (a) => {
  let wins = '';
  for (let x = -40; x < 38; x += 5.4) wins += `M${f(x)} -7.6h3.4v3h-3.4z`;
  const warm = a.v < 0.5;
  return P('M-46 -1V-8Q-46 -11 -42 -11H40Q46 -11 48 -5L49 -1Z', 'trn') + P(wins, warm ? 'warm' : 'cold') +
    P('M-46 -2.2H49', 'nt nc') + C(47, -5, 1, 'cyl') + R(-30, -1, 4, 1.4, 'mt') + R(20, -1, 4, 1.4, 'mt');
};

export const CYBERPUNK: Record<string, Prop> = {
  vignette, walker, elTrain,
  ctower, ctowerCold, ctowerWarm, workshop, kiosk, blade, oldTower, scaffoldC, glassFloor, cfloor, towerCraneC, drone, hoarding,
  skycar, clutterC, cables, demolition, gateC, libraryC, gardenC, tollC, permitC, solarC,
  // aliases so icon lookups land here
  floor: cfloor, bubbleHouse: hoarding, shed: workshop,
};
