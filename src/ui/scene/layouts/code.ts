// Code: a night megacity in rain, the end of the Attention Age.
//   - population: the city's towers;  chat assistants: cold machine light in their windows, a hologram hoarding;
//   - human attention (the scarce resource): the few warm windows with somebody in them, dwindling;
//   - internal tools: lit workshops under the arcades;  throwaway apps: kiosks and blade signs, many already dead;
//   - legacy rewrite: the old concrete tower in scaffolding beside its glass replacement, floor by floor;
//   - agents writing for agents: towers that build themselves, cranes and drones;
//   - maintenance debt: cables, lean-tos, dead neon and pipework growing up from the street into the lower third;
//   - pressure: smog-glow and signal noise;  deletion: demolition that lets sky (and stars) back in;
//   - Steady State: the rain stops, the sky clears to stars, the city is quiet and maintained.
import type { Layout, Slot } from '../layout';
import { scatter, row, weave } from '../layout';
import { P, R, C, L, f, rng, hash } from '../svg';
import { sign, neon, VW, VH } from '../props/cyberpunk';
import { hills, sea, viaductArches } from '../geography';

const STREET = 334;
const AG = [524, 568];
const AGENT_FLOORS: Slot[] = [];
for (let j = 0; j < 17; j++) for (let t = 0; t < AG.length; t++) {
  if (t === 1 && j > 13) continue;
  AGENT_FLOORS.push({ p: 'cfloor', x: AG[t], y: 318 - j * 12, s: 1.05, v: t * 0.6, band: 'mid' });
}
/** Cable bundles across the street, facade to facade, from the old block outwards (x0, y0 → x1, y1). */
const SPANS: [number, number, number, number][] = [
  [172, 250, 262, 280], [58, 246, 112, 262], [232, 284, 300, 304], [264, 290, 376, 300], [376, 300, 466, 290], [-6, 226, 58, 240],
  [466, 290, 524, 296], [112, 218, 172, 246], [524, 270, 606, 282], [300, 304, 376, 312],
];
const GLASS: Slot[] = Array.from({ length: 11 }, (_, j): Slot => ({ p: 'glassFloor', x: 466, y: 318 - j * 12, s: 1, band: 'mid' }));

// The old human city along the street: five buildings, always there, whose upper rooms hold the warm vignettes.
interface Bld { x0: number; x1: number; top: number }
const OLD: Bld[] = [{ x0: -2, x1: 58, top: 205 }, { x0: 58, x1: 112, top: 238 }, { x0: 112, x1: 172, top: 205 }, { x0: 172, x1: 232, top: 238 }, { x0: 232, x1: 264, top: 272 }];
/** Storey windows' bottom y (storey 1 is above the shops). */
const SY = [301, 269, 237];
/** Warm windows, in the order they go dark last-first: index 0 is the last light left on. */
const VIG: Slot[] = [
  { p: 'vignette', x: 142, y: SY[1], v: 0.02 }, { p: 'vignette', x: 29, y: SY[2], v: 0.2 }, { p: 'vignette', x: 202, y: SY[0], v: 0.38 },
  { p: 'vignette', x: 85, y: SY[1], v: 0.55 }, { p: 'vignette', x: 29, y: SY[0], v: 0.7 }, { p: 'vignette', x: 202, y: SY[1], v: 0.88 },
].map((s) => ({ ...s, s: 1, band: 'near' as const }));

function skyline(): { far: string; mid: string; fx: { kind: 'blink'; x: number; y: number; band: 'far'; markup: string }[] } {
  const r = rng(hash('cb-skyline'));
  const fx: { kind: 'blink'; x: number; y: number; band: 'far'; markup: string }[] = [];
  // 1. The arcology: one enormous stepped tower far off, for height.
  let arc = 'M262 256V120H272V70H282V34H300V18H304V34H322V70H332V120H342V256Z', aw = '';
  for (let y = 40; y < 250; y += 7) for (let x = 266; x < 340; x += 6) if (r() < 0.16 && (y > 120 || (x > 272 && x < 332)) && (y > 70 || (x > 282 && x < 322))) aw += `M${x} ${y}h1.6v2h-1.6z`;
  fx.push({ kind: 'blink', x: 302, y: 16, band: 'far', markup: C(0, 0, 1.6, 'redl') }, { kind: 'blink', x: 272, y: 68, band: 'far', markup: C(0, 0, 1.2, 'redl') });
  // 2. The far row: tall, thin, pale with distance.
  let a0 = '', aw0 = '';
  let x = -6;
  while (x < 606) {
    const w = 8 + r() * 16, h = 70 + r() * 130, top = 252 - h;
    if (x < 255 || x > 345) {
      a0 += `M${f(x)} 256V${f(top)}H${f(x + w)}V256Z` + (r() < 0.4 ? `M${f(x + w / 2 - 0.8)} ${f(top)}V${f(top - 8 - r() * 16)}h1.6V${f(top)}Z` : '');
      for (let k = 0; k < h / 16; k++) if (r() < 0.6) aw0 += `M${f(x + 2 + r() * (w - 4))} ${f(top + 4 + r() * (h - 8))}h1.2v1.4h-1.2z`;
      if (r() < 0.08 && fx.length < 6) fx.push({ kind: 'blink', x: x + w / 2, y: top - 2, band: 'far', markup: C(0, 0, 1.1, 'redl') });
    }
    x += w + 1 + r() * 4;
  }
  // 3. The near row of the skyline: darker, broader, more windows.
  let b = '', gap = '', w1 = '', w2 = '', w3 = '';
  x = -6;
  while (x < 606) {
    const w = 12 + r() * 24, h = 40 + r() * 110, top = 258 - h;
    const d = `M${f(x)} 262V${f(top)}H${f(x + w)}V262Z` + (r() < 0.3 ? `M${f(x + w / 2 - 1)} ${f(top)}V${f(top - 8 - r() * 12)}h2V${f(top)}Z` : '');
    if (x > 250 && x < 360) gap += d; else b += d;
    for (let k = 0; k < h / 8; k++) {
      const wx = x + 2 + r() * (w - 4), wy = top + 4 + r() * (h - 8), q = r();
      const sq = `M${f(wx)} ${f(wy)}h1.4v1.6h-1.4z`;
      if (q < 0.5) w1 += sq; else if (q < 0.64) w2 += sq; else if (q < 0.74) w3 += sq;
    }
    x += w + r() * 3;
  }
  // The same country (geography.ts): the hill line still there behind the towers, and the estuary with ships' lights.
  const far = P(hills(70, 262), 'cbhill') + P(sea(70, 262), 'cbsea') + P('M470 196h3M512 199h2M560 194h3M590 201h2', 'nt na', 'opacity=".7"') + P(arc, 'cbarc') + P(aw, 'cbwin0') + `<rect x="0" y="110" width="600" height="150" fill="url(#HZ)"/>` +
    P(a0, 'cbfar0') + P(aw0, 'cbwin0') + `<rect x="0" y="150" width="600" height="112" fill="url(#HZ)"/>` +
    P(b, 'cbfar') + `<g class="delgap">${P(gap, 'cbfar')}</g>` + P(w1, 'cbwin') + P(w2, 'cbwin2') + P(w3, 'cbwin3');
  // 4. The low city between the skyline and the street (mid band, behind the viaduct), hazed at its top.
  let low = '', lw = '';
  let lx = -4;
  while (lx < 606) {
    const w = 14 + r() * 26, h = 40 + r() * 46;
    low += `M${f(lx)} 336V${f(256 - h * 0.25)}H${f(lx + w)}V336Z`;
    for (let k = 0; k < 4; k++) if (r() < 0.6) lw += `M${f(lx + 3 + r() * (w - 6))} ${f(262 + r() * 64)}h1.4v1.6h-1.4z`;
    lx += w + 1;
  }
  const mid = `<rect x="0" y="200" width="600" height="70" fill="url(#HZ)"/>` + P(low, 'cblow') + P(lw, 'cbwin3');
  return { far, mid, fx };
}

function stars(): string {
  const r = rng(hash('cb-stars'));
  let d = '', d2 = '';
  for (let i = 0; i < 70; i++) d += `M${f(r() * 600)} ${f(r() * 170)}h.9v.9h-.9z`;
  for (let i = 0; i < 26; i++) d2 += `M${f(250 + r() * 110)} ${f(60 + r() * 150)}h.9v.9h-.9z`;
  // the city's glow on the cloud base, and two searchlights from the far towers
  return `<rect x="0" y="0" width="600" height="262" fill="url(#CG)" class="nosteady"/>` +
    P('M150 250L96 0H118ZM470 250L520 0H536Z', 'beam nosteady') +
    `<g class="stdy">${P(d, 'star2')}${C(486, 54, 9, 'warm', 'opacity=".85"')}</g><g class="delstars">${P(d2, 'star2')}</g>`;
}

/** The viaduct of the elevated railway, behind the towers and in front of the low city. */
function viaduct(): string {
  // Steam's brick viaduct, its arches now carrying the elevated line.
  return P(viaductArches(-4, 608, 268, 68, 38), 'pier') + R(-4, 262, 608, 6, 'deck') + P('M-4 262H604', 'nt nc', 'opacity=".55"') + P('M-4 268.5H604', 'k');
}

/** Emergency lighting, seen when the city is failing: a composited sprite (its blink never repaints the drawing). */
const EMG = `<g class="emgm">${R(6, 210, 4, 2.4, 'emr') + R(118, 210, 4, 2.4, 'emr') + R(180, 242, 4, 2.4, 'emr') + R(380, 324, 4, 2.4, 'emr') +
  R(520, 324, 4, 2.4, 'emr') + `<ellipse cx="120" cy="352" rx="70" ry="10" class="emp"/><ellipse cx="470" cy="350" rx="80" ry="9" class="emp"/>`}</g>`;

/** The old block: brick-dark buildings with fire escapes, tanks and signs; dark window frames for the vignettes. */
function oldBlock(): string {
  const r = rng(hash('cb-old'));
  let body = '', shade = '', ledge = '', dark = '', cold = '', esc = '', tank = '', frames = '', screens = '';
  const vig = new Set(VIG.map((v) => `${v.x},${v.y}`));
  for (const b of OLD) {
    body += `M${b.x0} ${STREET}V${b.top}H${b.x1}V${STREET}Z`;
    shade += `M${b.x1 - 4} ${b.top}h4V${STREET}h-4Z`;
    ledge += `M${b.x0 - 1} ${b.top}h${b.x1 - b.x0 + 2}v3h${-(b.x1 - b.x0 + 2)}Z`;
    const cx = (b.x0 + b.x1) / 2;
    SY.forEach((y) => {
      if (y - VH < b.top + 4) return;
      if (vig.has(`${cx},${y}`)) {
        frames += `M${cx - VW / 2} ${y - VH}h${VW}v${VH}h${-VW}Z`;
        // When the warm room goes dark, what is left is a cold screen left on in an empty room.
        screens += `M${cx - 6} ${y - 11}h11v7h-11ZM${cx - 1.4} ${y - 4}h2v3h-2Z`;
        return;
      }
      const ww = b.x1 - b.x0 < 40 ? 10 : 13;
      for (const dx of b.x1 - b.x0 < 40 ? [0] : [-12, 12]) {
        const wx = cx + dx - ww / 2;
        dark += `M${f(wx)} ${y - 20}h${ww}v20h${-ww}Z`;
        if (r() < 0.3) cold += `M${f(wx + 1)} ${y - 8}h${ww - 2}v7h${-(ww - 2)}Z`;
      }
    });
    if (b.top < 230) tank += `M${b.x0 + 8} ${b.top}v-8h12v8ZM${b.x0 + 14} ${b.top - 8}v-6`;
  }
  // fire escape down the side of the second building
  for (const y of [269, 237 + 32]) esc += `M60 ${y}h22M60 ${y - 1}l22 -30`;
  esc += 'M60 301h22M60 300l22 -30M60 241V301';
  const signs = // vertical HOTEL OKARI, roof letters, 24H
    `<g transform="rotate(-90 64 262)">${sign(64, 266, 'HOTEL', 11, 'nm')}</g>` + neon('M53 230h8v64h-8z', 'nm') +
    sign(142, 199, 'OKARI', 14, 'nc') + P('M118 201h48M124 201v4M160 201v4', 'k') +
    `<g transform="rotate(-90 236 270)">${sign(236, 273, 'VELLO', 9, 'na')}</g>` + neon('M228 248h8v44h-8z', 'na') +
    sign(248, 266, '24H', 7, 'ng');
  // reflections of those signs on the wet street
  const refl = R(53, 338, 8, 30, 'rfl nm', 'opacity=".22"') + R(54.5, 340, 5, 18, 'rfl nm', 'opacity=".2"') + R(120, 336, 44, 4, 'rfl nc', 'opacity=".14"') +
    R(228, 338, 8, 22, 'rfl na', 'opacity=".2"');
  return P(body, 'oldb') + P(shade, 'oldb2') + P(ledge, 'oldl') + P(dark, 'oldw') + P(cold, 'cold', 'opacity=".55"') +
    P(frames, 'oldw') + P(frames.replace(/h40v24h-40Z/g, 'h40'), 'k') + P(screens, 'coldscr') + P(screens, 'cold', 'opacity=".28"') + P(tank, 'mt') + P(esc, 'k') + signs + refl;
}

function street(): string {
  const r = rng(hash('cb-street'));
  let refl = '';
  const cols = ['nm', 'nc', 'na', 'nv'];
  for (let i = 0; i < 26; i++) {
    const x = r() * 600, w = 2 + r() * 8, c = cols[Math.floor(r() * 4)];
    refl += R(x, STREET + 6 + r() * 10, w, 10 + r() * 22, `rfl ${c}`, `opacity="${(0.05 + r() * 0.1).toFixed(2)}"`);
  }
  // puddles mirroring the sky glow, lamp posts with cyan pools
  let pud = '', lamps = '', pools = '';
  for (let i = 0; i < 7; i++) { const x = 20 + r() * 560, y = 352 + r() * 16; pud += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(10 + r() * 16)}" ry="${f(1.6 + r() * 1.4)}" class="pud"/>`; }
  for (const x of [276, 360, 452, 548]) { lamps += `M${x} ${STREET + 2}V${STREET - 30}h6`; pools += `<ellipse cx="${x + 6}" cy="${STREET + 10}" rx="16" ry="4" class="lpool"/>` + R(x + 4, STREET - 31, 5, 1.6, 'cyl'); }
  return R(0, STREET, 600, 400 - STREET, 'wet') + `<rect x="0" y="${STREET}" width="600" height="40" fill="url(#WG)"/>` + refl + pud;
}

function kerb(): string {
  let lamps = '', pools = '';
  for (const x of [276, 360, 452, 548]) { lamps += `M${x} ${STREET + 2}V${STREET - 30}h6`; pools += `<ellipse cx="${x + 6}" cy="${STREET + 12}" rx="18" ry="4" class="lpool"/>` + R(x + 4, STREET - 31, 5, 1.6, 'cyl'); }
  return L(0, STREET, 600, STREET, 'k') + P(`M0 ${STREET + 14}H600`, 'k', 'opacity=".5"') + P(`M0 ${STREET + 26}H600`, 'nt nc', 'opacity=".12" stroke-dasharray="10 14"') +
    pools + P(lamps, 'k K') + pipework();
}

/** Pipework undergrowth: irregular runs, risers and elbows, scaled up from the street by maintenance debt. */
function pipework(): string {
  const r = rng(hash('cb-pipes'));
  let d = '', hi = '', v = '';
  for (let i = 0; i < 46; i++) {
    const x = r() * 600, y0 = 372, y1 = 300 + r() * 66, x1 = x + (r() - 0.5) * 70;
    d += `M${f(x)} ${y0}V${f(y1 + 4)}Q${f(x)} ${f(y1)} ${f(x + Math.sign(x1 - x) * 4)} ${f(y1)}H${f(x1)}` + (r() < 0.5 ? `V${f(y1 + 10 + r() * 20)}` : '');
    if (r() < 0.4) hi += `M${f(x)} ${f(y1 + 6)}v${f(8 + r() * 10)}`;
    if (r() < 0.3) v += `M${f(x1 - 2)} ${f(y1 - 2)}h4v4h-4z`;
  }
  return `<g class="ly" style="transform-origin:50% 100%">${P(d, 'pipeb')}${P(d, 'pipe')}${P(hi, 'pipeh')}${P(v, 'rustf')}</g>`;
}

export const code: Layout = {
  id: 'code',
  look: 'cyberpunk',
  place: 'a night city of software, in rain',
  caption: 'The stack, by night',
  bands: [258, 326],
  reserveWords: (r) => {
    const n = r <= 0.001 ? 0 : Math.min(VIG.length, Math.round(VIG.length * Math.pow(r, 0.9)));
    return n === 0 ? 'every warm window dark' : n === 1 ? 'one warm window left, somebody still in it' : `${n} warm windows with somebody in them`;
  },
  depth: [150, 0.95, 372, 1.15],

  backdrop(c) {
    const sk = skyline();
    const u = (h: string) => h.replace(/url\(#HZ\)/g, c.u('cbhz')).replace(/url\(#CG\)/g, c.u('cbcg')).replace(/url\(#WG\)/g, c.u('cbwg'));
    return {
      sky: u(stars()),
      far: u(sk.far),
      mid: u(sk.mid + street() + viaduct()),
      near: u(oldBlock() + kerb()),
      cut: R(0, 372, 600, 28, 'wet'),
      fx: [...sk.fx,
        { kind: 'blink', x: 0, y: 0, band: 'near', markup: EMG },
        { kind: 'steam', x: 250, y: 352, size: 1.7, band: 'near' }, { kind: 'steam', x: 418, y: 360, size: 1.9, band: 'near' }, { kind: 'steam', x: 560, y: 350, size: 1.5, band: 'near' }],
    };
  },

  plots: [
    {
      key: 'city', driver: 'population', curve: 0.8,
      slots: [
        { p: 'ctower', x: 200, y: 312, v: 0.31, w: 40 }, { p: 'ctower', x: 340, y: 314, v: 0.72, w: 44 }, { p: 'ctower', x: 120, y: 306, v: 0.12, w: 36 },
        { p: 'ctower', x: 262, y: 300, v: 0.55, w: 30 }, { p: 'ctower', x: 30, y: 314, v: 0.84, w: 50 }, { p: 'ctower', x: 400, y: 300, v: 0.43, w: 30 },
        { p: 'ctower', x: 160, y: 296, v: 0.66, w: 28 }, { p: 'ctower', x: 300, y: 292, v: 0.21, w: 26 }, { p: 'ctower', x: 80, y: 294, v: 0.93, w: 30 },
        { p: 'ctower', x: 604, y: 302, v: 0.05, w: 44 }, { p: 'ctower', x: 230, y: 288, v: 0.49, w: 24 }, { p: 'ctower', x: 368, y: 288, v: 0.37, w: 24 },
        { p: 'ctower', x: 4, y: 290, v: 0.27, w: 30 }, { p: 'ctower', x: 496, y: 290, v: 0.61, w: 28 },
      ].map((s) => ({ ...s, s: 1, h: STREET + 2 - s.y, band: 'mid' as const })),
    },
    // Human attention: six warm rooms in the old block, going dark one by one; the first is the last left on.
    { key: 'attention', driver: 'reserve', fade: true, curve: 0.9, slots: VIG },
    // Life that is always there: the elevated train and people in the rain.
    {
      key: 'life', driver: 'always', slots: [],
      movers: [
        { p: 'elTrain', x0: -70, y0: 262, x1: 680, y1: 262, dur: 16, n: 1, s: 1, band: 'mid', z: 270 },
        { p: 'elTrain', x0: 680, y0: 262, x1: -70, y1: 262, dur: 19, n: 1, s: 0.98, band: 'mid', z: 270 },
        { p: 'walker', x0: -12, y0: 346, x1: 612, y1: 346, dur: 70, n: 3, s: 1.1, band: 'near' },
        { p: 'walker', x0: 612, y0: 352, x1: -12, y1: 352, dur: 62, n: 3, s: 1.2, band: 'near' },
      ],
    },
    {
      key: 'bots', match: ['chatbot'], overlayOf: 'city', overlayProp: 'ctowerCold', curve: 0.8,
      anchor: { p: 'hoarding', x: 340, y: 236, s: 1.05, band: 'near' },
      slots: [],
      hit: [300, 170, 90, 76],
    },
    {
      key: 'tools', match: ['wrench'],
      anchor: { p: 'workshop', x: 70, y: STREET, s: 1.1, v: 0.1, band: 'near' },
      slots: row('workshop', 20, STREET, 236, STREET, 6, 'cb-tools', 0.2, { band: 'near' }).filter((s) => Math.abs(s.x - 70) > 30).slice(0, 4),
      hit: [20, 264, 200, 76],
    },
    {
      key: 'apps', match: ['phone-app'],
      anchor: { p: 'kiosk', x: 268, y: STREET + 2, s: 1.15, v: 0.15, band: 'near' },
      slots: weave(
        scatter('kiosk', [150, STREET - 2, 300, 8], 8, 'cb-kiosks', { from: [268, STREET], gap: [18, 4], band: 'near' }),
        scatter('blade', [262, 214, 130, 80], 10, 'cb-blades', { from: [290, 260], gap: [20, 10], band: 'near' }),
      ),
      hit: [226, 262, 100, 76],
    },
    {
      key: 'legacy', match: ['scroll'],
      anchor: { p: 'oldTower', x: 430, y: 320, s: 1, band: 'mid' },
      slots: weave(GLASS, [{ p: 'scaffoldC', x: 404, y: 320, s: 1, v: 0.9, band: 'mid' }, { p: 'scaffoldC', x: 456, y: 320, s: 1, v: 0.5, band: 'mid' },
        { p: 'scaffoldC', x: 430, y: 320, s: 1, v: 0.2, band: 'mid' }]),
      hit: [396, 160, 86, 160],
    },
    {
      key: 'agents', match: ['robots'],
      anchor: { p: 'cfloor', x: AG[0], y: 318, s: 1.05, v: 0, band: 'mid' },
      slots: [...AGENT_FLOORS.slice(1), { p: 'towerCraneC', x: AG[0], y: 114, s: 1, band: 'mid' }, { p: 'towerCraneC', x: AG[1], y: 150, s: 1, band: 'mid' }],
      movers: [
        { p: 'drone', x0: 610, y0: 200, x1: 470, y1: 170, dur: 9, n: 2, s: 1.1, band: 'mid' },
        { p: 'drone', x0: 470, y0: 250, x1: 610, y1: 230, dur: 8, n: 2, s: 1.1, from: 0.25, band: 'mid' },
        { p: 'drone', x0: 620, y0: 120, x1: -20, y1: 140, dur: 18, n: 3, s: 1, from: 0.5, band: 'far' },
      ],
      hit: [490, 110, 110, 210],
      site: [506, 312, 50, 8],
    },
    {
      // The service network: the tray under the elevated line (always there), and risers down the pillars to the
      // street cabinets as the features multiply; under the street, the ducts with their traffic.
      key: 'ducts', driver: 'light', curve: 0.7,
      anchor: { p: 'tray', x: -4, y: 270, s: 1, w: 612, band: 'mid' },
      slots: ([[300, 0.2], [376, 0.6], [584, 0.4], [262, 0.8], [490, 0.1]] as [number, number][])
        .map(([x, v]): Slot => ({ p: 'riser', x, y: STREET - 0.5, s: 1, h: STREET - 0.5 - 272, v, band: 'mid' })),
    },
    { key: 'underground', driver: 'always', anchor: { p: 'ducts', x: 0, y: 386, s: 1, w: 600, band: 'near' }, slots: [] },
    {
      // Maintenance debt: bundles slung facade to facade across the street (a network, drawn), lean-tos, dead neon
      // and pipework growing up from the pavement.
      key: 'debt', driver: 'pressure', curve: 0.85,
      slots: weave(
        scatter('clutterC', [0, STREET - 1, 600, 6], 22, 'cb-clutter', { gap: [18, 3], band: 'near', k: 1.1 }),
        SPANS.map(([x0, y0, x1, y1], i): Slot => ({ p: 'span', x: x0, y: y0, w: x1 - x0, h: y1 - y0, s: 1, v: ((i * 0.41) % 1), band: 'near' })),
        scatter('clutterC', [0, 304, 600, 18], 12, 'cb-clutter2', { gap: [24, 6], band: 'near' }),
      ),
    },
    {
      key: 'traffic', driver: 'light', slots: [],
      movers: [
        { p: 'skycar', x0: -30, y0: 150, x1: 630, y1: 146, dur: 11, n: 3, s: 1, band: 'far' },
        { p: 'skycar', x0: 630, y0: 176, x1: -30, y1: 180, dur: 13, n: 3, s: 0.9, from: 0.3, band: 'far' },
        { p: 'skycar', x0: -30, y0: 222, x1: 630, y1: 218, dur: 8, n: 2, s: 1.25, from: 0.2, band: 'mid', z: 226 },
      ],
    },
  ],

  spares: [[150, 340, 100, 28], [330, 340, 110, 28], [10, 340, 120, 28]],

  // M3: the cast in the rain between the signs; a lever biting back raises another tower.
  figures: [{ x: 266, y: 372 }, { x: 200, y: 372, flip: true }, { x: 340, y: 373 }, { x: 420, y: 372 }, { x: 510, y: 372, flip: true }, { x: 100, y: 373 }],
  bite: { '*': { p: 'ctower', x: 248, y: 250, s: 0.9, v: 0.4, band: 'mid' } },
  restraint: {
    deletion: { p: 'demolition', x: 300, y: 368, s: 1.15, band: 'near' },
    reviewGate: { p: 'gateC', x: 168, y: 366, s: 1.15, band: 'near' },
    sharedLibs: { p: 'libraryC', x: 380, y: 368, s: 1.05, band: 'near' },
    sufficiency: { p: 'gardenC', x: 460, y: 368, s: 1.1, band: 'near' },
    duty: { p: 'tollC', x: 560, y: 368, s: 1, band: 'near' },
    cap: { p: 'permitC', x: 232, y: 368, s: 1, band: 'near' },
    substitution: { p: 'solarC', x: 120, y: 206, s: 0.9, band: 'far' },
  },
  restraintSpare: [{ p: 'notice', x: 90, y: 368 }, { p: 'notice', x: 520, y: 368 }],
  // The Commons at street level, under the elevated line: bunting strung between the pillars.
  commons: [{ p: '', x: 300, y: 366, band: 'near' }, { p: '', x: 440, y: 366, band: 'near' }],
};
