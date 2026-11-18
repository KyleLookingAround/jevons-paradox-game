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

const STREET = 334;
const AG = [524, 568];
const AGENT_FLOORS: Slot[] = [];
for (let j = 0; j < 17; j++) for (let t = 0; t < AG.length; t++) {
  if (t === 1 && j > 13) continue;
  AGENT_FLOORS.push({ p: 'cfloor', x: AG[t], y: 318 - j * 12, s: 1.05, v: t * 0.6, band: 'mid' });
}
const GLASS: Slot[] = Array.from({ length: 11 }, (_, j): Slot => ({ p: 'glassFloor', x: 466, y: 318 - j * 12, s: 1, band: 'mid' }));

function skyline(): { html: string; fx: { kind: 'blink'; x: number; y: number; band: 'far'; markup: string }[] } {
  const r = rng(hash('cb-skyline'));
  let a = '', b = '', gap = '', w1 = '', w2 = '', w3 = '';
  const fx: { kind: 'blink'; x: number; y: number; band: 'far'; markup: string }[] = [];
  let x = -6;
  while (x < 606) {
    const w = 10 + r() * 22, h = 50 + r() * 150, top = 256 - h;
    const d = `M${f(x)} 256V${f(top)}H${f(x + w)}V256Z` + (r() < 0.3 ? `M${f(x + w / 2 - 1)} ${f(top)}V${f(top - 10 - r() * 14)}h2V${f(top)}Z` : '');
    if (x > 250 && x < 360) gap += d; else if (r() < 0.5) a += d; else b += d;
    for (let k = 0; k < h / 9; k++) {
      const wx = x + 2 + r() * (w - 4), wy = top + 4 + r() * (h - 8), q = r();
      const sq = `M${f(wx)} ${f(wy)}h1.4v1.6h-1.4z`;
      if (q < 0.55) w1 += sq; else if (q < 0.7) w2 += sq; else if (q < 0.8) w3 += sq;
    }
    if (r() < 0.12 && fx.length < 5) fx.push({ kind: 'blink', x: x + w / 2, y: top - 2, band: 'far', markup: C(0, 0, 1.2, 'redl') });
    x += w + r() * 2;
  }
  // The low city between the skyline and the street, so sparse stages never show bare sky down to the pavement.
  let low = '', lw = '';
  let lx = -4;
  while (lx < 606) {
    const w = 14 + r() * 26, h = 40 + r() * 46;
    low += `M${f(lx)} 336V${f(254 - h * 0.25)}H${f(lx + w)}V336Z`;
    for (let k = 0; k < 3; k++) if (r() < 0.6) lw += `M${f(lx + 3 + r() * (w - 6))} ${f(270 + r() * 56)}h1.4v1.6h-1.4z`;
    lx += w + 1;
  }
  const html = P(b, 'cbfar2') + P(a, 'cbfar') + P(low, 'cblow') + P(lw, 'cbwin3') + `<g class="delgap">${P(gap, 'cbfar')}</g>` + P(w1, 'cbwin') + P(w2, 'cbwin2') + P(w3, 'cbwin3');
  return { html, fx };
}

function stars(): string {
  const r = rng(hash('cb-stars'));
  let d = '', d2 = '';
  for (let i = 0; i < 70; i++) d += `M${f(r() * 600)} ${f(r() * 170)}h.9v.9h-.9z`;
  for (let i = 0; i < 26; i++) d2 += `M${f(250 + r() * 110)} ${f(60 + r() * 150)}h.9v.9h-.9z`;
  return `<g class="stdy">${P(d, 'star2')}${C(486, 54, 9, 'warm', 'opacity=".85"')}</g><g class="delstars">${P(d2, 'star2')}</g>`;
}

function street(): string {
  const r = rng(hash('cb-street'));
  let refl = '';
  const cols = ['nm', 'nc', 'na', 'nv'];
  for (let i = 0; i < 22; i++) {
    const x = r() * 600, w = 2 + r() * 8, c = cols[Math.floor(r() * 4)];
    refl += R(x, STREET + 4 + r() * 6, w, 10 + r() * 20, `rfl ${c}`, `opacity="${(0.05 + r() * 0.1).toFixed(2)}"`);
  }
  return R(0, STREET, 600, 400 - STREET, 'wet') + L(0, STREET, 600, STREET, 'k') + refl +
    P(`M0 ${STREET + 22}H600`, 'nt nc', 'opacity=".12" stroke-dasharray="10 14"') +
    pipework();
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
  depth: [150, 0.95, 372, 1.15],

  backdrop(c) {
    const sk = skyline();
    const pipesUrl = c.u('pipes');
    return {
      sky: stars(),
      far: sk.html,
      near: street().replace('url(#PIPES)', pipesUrl),
      cut: R(0, 372, 600, 28, 'wet') + P('M0 380H600M0 388H600M0 394H600', 'pipe', 'opacity=".55"') + P('M0 384H600', 'nt nc', 'opacity=".25"'),
      fx: sk.fx,
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
      ].map((s) => ({ ...s, s: 1, band: 'mid' as const })),
    },
    { key: 'attention', driver: 'reserve', overlayOf: 'city', overlayProp: 'ctowerWarm', curve: 1, slots: [] },
    {
      key: 'bots', match: ['chatbot'], overlayOf: 'city', overlayProp: 'ctowerCold', curve: 0.8,
      anchor: { p: 'hoarding', x: 340, y: 236, s: 1.05, band: 'near' },
      slots: [],
      hit: [296, 196, 92, 50],
    },
    {
      key: 'tools', match: ['wrench'],
      anchor: { p: 'workshop', x: 70, y: STREET, s: 1.1, v: 0.1, band: 'near' },
      slots: row('workshop', 20, STREET, 236, STREET, 6, 'cb-tools', 0.2, { band: 'near' }).filter((s) => Math.abs(s.x - 70) > 30).slice(0, 4),
      hit: [24, 296, 130, 46],
    },
    {
      key: 'apps', match: ['phone-app'],
      anchor: { p: 'kiosk', x: 268, y: STREET + 2, s: 1.15, v: 0.15, band: 'near' },
      slots: weave(
        scatter('kiosk', [150, STREET - 2, 300, 8], 8, 'cb-kiosks', { from: [268, STREET], gap: [18, 4], band: 'near' }),
        scatter('blade', [90, 200, 300, 90], 12, 'cb-blades', { from: [270, 260], gap: [22, 10], band: 'near' }),
      ),
      hit: [226, 290, 90, 50],
    },
    {
      key: 'legacy', match: ['scroll'],
      anchor: { p: 'oldTower', x: 430, y: 320, s: 1, band: 'mid' },
      slots: weave(GLASS, [{ p: 'scaffoldC', x: 404, y: 320, s: 1, v: 0.9, band: 'mid' }, { p: 'scaffoldC', x: 456, y: 320, s: 1, v: 0.5, band: 'mid' },
        { p: 'scaffoldC', x: 430, y: 320, s: 1, v: 0.2, band: 'mid' }]),
      hit: [400, 160, 82, 160],
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
      hit: [500, 110, 100, 210],
      site: [506, 312, 50, 8],
    },
    {
      key: 'debt', driver: 'pressure', curve: 0.85,
      slots: weave(
        scatter('clutterC', [0, STREET - 1, 600, 6], 22, 'cb-clutter', { gap: [18, 3], band: 'near', k: 1.1 }),
        scatter('cables', [10, 230, 580, 70], 9, 'cb-cables', { gap: [50, 10], w: [40, 90], band: 'near' }),
        scatter('clutterC', [0, 304, 600, 18], 12, 'cb-clutter2', { gap: [24, 6], band: 'near' }),
      ),
    },
    {
      key: 'traffic', driver: 'light', slots: [],
      movers: [
        { p: 'skycar', x0: -30, y0: 150, x1: 630, y1: 146, dur: 11, n: 3, s: 1, band: 'far' },
        { p: 'skycar', x0: 630, y0: 176, x1: -30, y1: 180, dur: 13, n: 3, s: 0.9, from: 0.3, band: 'far' },
      ],
    },
  ],

  spares: [[150, 340, 100, 28], [330, 340, 110, 28], [10, 340, 120, 28]],

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
};
