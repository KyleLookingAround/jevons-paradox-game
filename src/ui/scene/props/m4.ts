// M4: what Iron's order book builds in the other Industries' pictures (SceneView.fedBy, a 'fed' plot in each layout):
// Steam's second track and new engine shed (Rails), iron-hulled steamers in its harbour (Ship plate), Light's great
// steel-framed gasholder (Girders). Drawn with the shared classes, so each takes its picture's style.
import type { Prop } from '../layout';
import { P, R, L, f, grid } from '../svg';
import { shade } from './common';

/** A locomotive shed for the new traffic: a long brick shed, smoke vents along the ridge, the roads running in. */
export const engineShed: Prop = (a, o) => {
  o.fx('smoke', -10, -24, 0.6); o.fx('smoke', 8, -24, 0.6);
  let v = '';
  for (let x = -18; x <= 18; x += 9) v += R(x - 1.6, -24, 3.2, 4, 'd');
  return R(-24, -16, 48, 16, 'b') + P('M-26 -16L-20 -21H20L26 -16Z', 'rf') + v + shade(14, -16, 10, 16, a.hatch()) +
    P('M-20 0V-10A4 4 0 0 1 -12 -10V0ZM-6 0V-10A4 4 0 0 1 2 -10V0ZM8 0V-10A4 4 0 0 1 16 -10V0Z', 'd') + P('M-30 0H30', 'k K');
};

/** An iron-hulled screw steamer at her moorings: a long dark hull, a tall funnel with the line's band, two masts. */
export const ironShip: Prop = (a) =>
  P('M-38 -6H36Q38 -2 32 2H-34Z', 'd') + P('M-35 -3H34', 'k k2', 'style="stroke:var(--s-paper);stroke-dasharray:.6 2.4"') +
  R(-14, -12, 30, 6, 'b') + R(-2, -26, 5, 14, 'b') + R(-2, -22, 5, 3, 'ac') + L(-26, -6, -26, -32, 'k') + L(24, -6, 24, -30, 'k') +
  P('M-26 -31L-36 -6M-26 -31L24 -29L34 -6', 'k k2') + shade(-36, -2, 70, 3, a.hatch(1));

/** The great gasholder on a steel lattice guide frame (Bridges & girders): two tiers of girders round a tall bell. */
export const steelHolder: Prop = (a) => {
  const w = 46, h = 44;
  let lat = '';
  for (let i = 0; i <= 6; i++) { const x = -w / 2 + (i * w) / 6; lat += `M${f(x)} 0V${-h - 6}`; if (i < 6) lat += `M${f(x)} ${-h / 2}L${f(x + w / 6)} ${-h - 6}M${f(x)} 0L${f(x + w / 6)} ${-h / 2}`; }
  return P(`M${f(-w / 2 + 2)} 0V${-h + 8}Q0 ${-h - 2} ${f(w / 2 - 2)} ${-h + 8}V0Z`, 'b2') + P(`M${f(-w / 2 + 2)} ${-h / 2}H${f(w / 2 - 2)}`, 'k k2') +
    P(lat + `M${f(-w / 2)} ${-h - 6}H${f(w / 2)}M${f(-w / 2)} ${-h / 2}H${f(w / 2)}`, 'k') + grid(-w / 2 + 3, -4, 1, 1, 0, 0, 3, 4, 'd');
};

export const M4_SHARED: Record<string, Prop> = { engineShed, ironShip, steelHolder };
