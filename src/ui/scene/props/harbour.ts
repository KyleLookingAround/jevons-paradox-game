// Fishing (M4): the harbour engraving's props and the Admiralty chart's marks. Boats by stage: sailing smacks →
// steam drifters → steam trawlers → bigger trawlers. Everything faces right, waterline (or quay) at y = 0.
import type { Prop } from '../layout';
import { P, R, C, L, f, grid } from '../svg';
import { shade } from './common';

/** A fishing boat by machine stage. v > .6: a lugger's brown sails even later (the inshore boats stay sail). */
export const smack: Prop = (a, o) => {
  const st = a.v > 0.8 ? 0 : a.stage;
  if (st === 0) {
    return P('M-16 -4H15Q13 0 9 1H-12Z', 'b') + shade(-14, -2, 26, 3, a.hatch(1)) + L(-2, -4, -2, -30, 'k') + L(8, -4, 8, -22, 'k') +
      P('M-2 -29L-13 -6H-2ZM-1.6 -28L7 -8H-1.6Z', 'sl') + P('M8 -21L15 -6H8Z', 'sl');
  }
  o.fx('smoke', st >= 2 ? 1 : 2, st >= 2 ? -19 : -16, 0.5);
  if (st === 1) {
    return P('M-17 -4H16Q14 0 10 1H-13Z', 'b') + shade(-15, -2, 28, 3, a.hatch(1)) + R(0, -15, 3, 11, 'b') + R(0, -15, 3, 2, 'd') + R(-6, -8, 6, 4, 'b') +
      L(-11, -4, -11, -24, 'k') + L(10, -4, 10, -20, 'k') + P('M-11 -23L-16 -6H-11Z', 'sl');
  }
  const k = st === 3 ? 1.2 : 1;
  return `<g transform="scale(${k})">` + P('M-20 -4H14L19 -9L18 -4Q16 0 11 1H-16Z', 'b') + shade(-18, -2, 32, 3, a.hatch(1)) + R(-6, -10, 9, 6, 'b') + R(-1, -19, 3.2, 9, 'b') + R(-1, -19, 3.2, 2, 'd') +
    L(-13, -4, -13, -24, 'k') + L(12, -6, 12, -20, 'k') + P('M-17 -4L-19 -12M13 -6L17 -12', 'k') + '</g>';
};

/** An iron-hulled steam trawler (Ship plate from Iron): a dark riveted hull, the gallows for the otter boards. */
export const ironTrawler: Prop = (a, o) => {
  o.fx('smoke', 1, -21, 0.55);
  return P('M-22 -5H15L21 -11L20 -5Q18 0 12 1H-18Z', 'd') + P('M-19 -3H16', 'k k2', 'style="stroke:#e8dcc0;stroke-dasharray:.6 2.2"') +
    R(-7, -11, 10, 6, 'b') + R(-1, -21, 3.4, 10, 'b') + R(-1, -21, 3.4, 2, 'ac') + L(-14, -5, -14, -26, 'k') + L(13, -7, 13, -22, 'k') + P('M-19 -5L-21 -13H-17M14 -7L18 -14', 'k K');
};

/** The fleet tied up: hulls rafted together, bare masts, no smoke (a moratorium or a failed bank). */
export const tiedFleet: Prop = (a) => {
  let s = '';
  for (let i = 0; i < 4; i++) { const x = -24 + i * 15, y = (i % 2) * 2; s += P(`M${x - 8} ${y - 4}H${x + 8}Q${x + 7} ${y} ${x + 4} ${y + 1}H${x - 6}Z`, 'b') + L(x - 1, y - 4, x - 1, y - 24 + (i % 2) * 3, 'k'); }
  return s + P('M-32 -2Q-20 2 -8 -1T20 -1T36 -2', 'k k2') + shade(-32, -2, 66, 3, a.hatch(1));
};

/** The Board's survey vessel: a small steamer with a sampling net streaming astern. */
export const surveyBoat: Prop = (a, o) => {
  o.fx('smoke', 2, -15, 0.45);
  return P('M-14 -4H13Q11 0 8 1H-11Z', 'b') + shade(-12, -2, 23, 3, a.hatch(1)) + R(-4, -9, 9, 5, 'b') + R(1, -15, 2.6, 6, 'b') + R(1, -15, 2.6, 1.6, 'ac') +
    P('M-12 -4L-14 -14L-10 -4', 'k K') + P('M-14 -13Q-22 -6 -26 2', 'k') + P('M-27 1l-4 3l1 3l5 -2z', 'b2') + P('M-30 4l3 1M-29 6l3 -1', 'k k2');
};

/** Gulls: a loose flock of engraved strokes (v changes the flock). */
export const gulls: Prop = (a) => {
  let d = '';
  const n = 4 + Math.floor(a.v * 4);
  for (let i = 0; i < n; i++) {
    const x = (i * 11) % 40 - 20 + a.r() * 4, y = -((i * 7) % 13) - a.r() * 4, w = 2.4 + a.r() * 1.6;
    d += `M${f(x - w)} ${f(y - 0.6)}Q${f(x - w / 2)} ${f(y - 2.2)} ${f(x)} ${f(y)}Q${f(x + w / 2)} ${f(y - 2.2)} ${f(x + w)} ${f(y - 0.6)}`;
  }
  return P(d, 'k');
};
export const gull: Prop = (a) => {
  const w = 3 + a.v * 1.5;
  return P(`M${f(-w)} -0.6Q${f(-w / 2)} -2.4 0 0Q${f(w / 2)} -2.4 ${f(w)} -0.6`, 'k');
};
/** Porpoises rolling in the bay. */
export const porpoise: Prop = () => P('M-9 0Q-6 -4 -2 0M-1.6 0l-1 -2.6l2 1.6M4 1Q7 -3 10 1', 'k K') + P('M-12 1h6M3 2h9', 'k k2');
/** A shoal breaking the surface: a patch of broken water with birds diving into it. */
export const shoalBreak: Prop = () =>
  P('M-12 0q2 -1.4 4 0t4 0t4 0t4 0t4 0M-8 2q2 -1.2 4 0t4 0t4 0', 'k k2') + P('M-6 -3l1 2M0 -4l.6 2.4M5 -3l-.6 2', 'k') +
  P('M-3 -12q1.4 -1.6 2.6 0q1.4 -1.6 2.6 0M6 -9q1.2 -1.4 2.4 0q1.2 -1.4 2.4 0', 'k');

/** The fish market hall: a long iron-and-glass roof on columns, the quay's heart (Fresh fish by rail). */
export const marketHall: Prop = (a) => {
  let cols = '';
  for (let x = -40; x <= 40; x += 8) cols += `M${x} 0V-12`;
  return R(-44, -12, 88, 3, 'b') + P('M-46 -15L-34 -26H34L46 -15Z', 'rf') + P('M-30 -24H30M-38 -18H38', 'k k2') + P(cols, 'k K') +
    shade(30, -26, 16, 11, a.hatch(1)) + P('M-40 -2h10v-3h-10zM-24 -2h9v-3h-9zM12 -2h10v-3h-10z', 'b2') + R(-4, -32, 8, 6, 'b') + P('M-5 -32L0 -36L5 -32', 'rf');
};

/** The fish train: a tank engine and white-painted fish vans, leaving the quay for the cities. Faces right. */
export const fishTrain: Prop = (a) => {
  let s = '';
  for (let i = 0; i < 4; i++) { const x0 = -64 + i * 15; s += R(x0, -9, 13, 7, 'b') + P(`M${x0 - 0.5} -9Q${x0 + 6.5} -11.5 ${x0 + 13.5} -9`, 'rf') + C(x0 + 3, -1.4, 1.4, 'd') + C(x0 + 10, -1.4, 1.4, 'd'); }
  s += a.stage >= 2 ? R(0, -11, 18, 9, 'b') + R(12, -15, 6, 4, 'b') + R(3, -15, 2.4, 4, 'b') : R(0, -9, 16, 7, 'b') + R(10, -14, 6, 5, 'b') + R(2, -15, 2.2, 6, 'b');
  return s + C(4, -1.8, 1.8, 'd') + C(12, -1.8, 1.8, 'd') + P('M3 -16C-4 -22 -14 -18 -24 -23C-34 -27 -46 -21 -58 -25', 'plm');
};

/** Smokehouses: tall narrow sheds with louvred roof vents (the kipper trade). */
export const smokehouse: Prop = (a, o) => {
  o.fx('smoke', 0, -34, 0.6);
  const h = 22 + a.v * 6;
  return R(-7, -h, 14, h, 'b') + P(`M-8.5 ${-h}L0 ${-h - 7}L8.5 ${-h}Z`, 'rf') + R(-3, -h - 11, 6, 5, 'b') + P(`M-3 ${-h - 9.5}h6M-3 ${-h - 8}h6`, 'k k2') +
    shade(2, -h, 5, h, a.hatch()) + P(`M-4 ${-h + 4}h3v4h-3zM-4 ${-h + 11}h3v4h-3z`, 'w') + R(-2.5, -6, 5, 6, 'd');
};

/** A fried fish shop: a shop front with its fascia on the end of a terrace, its fryer's chimney going. */
export const fryShop: Prop = (a, o) => {
  o.fx('smoke', 9, -30, 0.5);
  return R(-12, -20, 24, 20, 'b') + P('M-13.5 -20L-4 -26H14L13.5 -20Z', 'rf') + R(8, -30, 3, 6, 'b') + R(-11, -12, 22, 3, 'ac') +
    P('M-9 -7h7v7h-7zM3 -7h6v7h-6z', 'lit') + grid(-9, -18, 3, 1, 7, 0, 3.4, 4) + shade(8, -20, 4, 20, a.hatch());
};

/** The fish-meal works: a shed with a tall stack and sacks at the door. */
export const mealWorks: Prop = (a, o) => {
  o.fx('smoke', 12, -40, 0.8);
  return P('M10 0L11 -38H14L15 0Z', 'b') + R(-16, -16, 26, 16, 'b') + P('M-18 -16L-3 -22L12 -16Z', 'rf') + shade(4, -16, 6, 16, a.hatch()) +
    R(-6, -8, 6, 8, 'd') + P('M-22 0q0 -5 3 -5q3 0 3 5zM-27 0q0 -4 2.6 -4q2.6 0 2.6 4z', 'b2');
};

/** The cod liver oil works: a boiling house with vats in the yard and casks stacked. */
export const oilWorks: Prop = (a, o) => {
  o.fx('steam', -2, -26, 0.6);
  return R(-14, -18, 22, 18, 'b') + P('M-16 -18L-3 -25L10 -18Z', 'rf') + R(-4, -26, 3, 6, 'b') + shade(3, -18, 5, 18, a.hatch()) +
    P('M12 0V-8H24V0ZM14 -8V-10H22V-8', 'b2') + P('M12 -4H24', 'k k2') + C(-20, -2.4, 2.4, 'b2') + C(-25, -2.4, 2.4, 'b2') + C(-22.5, -6.6, 2.4, 'b2');
};

/** A cold store (Act II's fish fingers): a plain block with a loading bay. */
export const coldStore: Prop = (a) =>
  R(-16, -24, 32, 24, 'b') + R(-16, -26, 32, 2, 'd') + shade(10, -24, 6, 24, a.hatch()) + R(-12, -8, 10, 8, 'd') + grid(2, -20, 2, 2, 4, 6, 2.4, 3);

/** The cannery (Tinplate from Iron): a long shed lettered along the roof, crates of tins at the door. */
export const cannery: Prop = (a) =>
  R(-26, -14, 52, 14, 'b') + P('M-28 -14L-20 -21H20L28 -14Z', 'rf') + shade(18, -14, 8, 14, a.hatch()) + grid(-22, -10, 6, 1, 6.4, 0, 3, 4) +
  P('M28 0h6v-4h-6zM29 -4h4v-3h-4z', 'b2');

/* --- The Admiralty chart's marks (drawn on the chart paper in the near band) --- */

/** A patch of shoal stipple: dots as round-capped zero-length strokes (one path), denser at the heart. */
export const chartShoal: Prop = (a) => {
  let d = '';
  const n = 9 + Math.floor(a.v * 5);
  for (let i = 0; i < n; i++) { const t = a.r() * Math.PI * 2, r = Math.sqrt(a.r()) * 7; d += `M${f(Math.cos(t) * r * 1.6)} ${f(-3 + Math.sin(t) * r * 0.5)}h.01`; }
  return P(d, 'k', 'style="stroke-width:1.5px"');
};
/** A foreign fleet's sail on the chart: a hull glyph with a pennant in one of three colours (no real flag). */
export const foreignSail: Prop = (a) =>
  P('M-4 0H4L3 1.4H-3Z', 'chs') + L(0, 0, 0, -7, 'k') + P('M0 -7l4.5 1.4L0 -4.2Z', a.v < 0.34 ? 'fp1' : a.v < 0.67 ? 'fp2' : 'fp3');
/** The home fleet on the chart: a small dark glyph where the boats are working. */
export const homeGlyph: Prop = () => P('M-3.4 0H3.4L2.4 1.2H-2.4Z', 'chs') + L(0, 0, 0, -4.6, 'k');
/** A scar: blank grey water over the bank, lettered in the chart's italic. */
export const scarPatch: Prop = (a) => {
  const w = a.w || 120;
  return P(`M${f(-w / 2)} -2Q${f(-w / 2.4)} -15 ${f(-w / 6)} -16Q${f(w / 4)} -18 ${f(w / 2)} -8Q${f(w / 2.2)} 2 0 1Q${f(-w / 2.6)} 3 ${f(-w / 2)} -2Z`, 'scr') +
    `<text x="0" y="-5" text-anchor="middle" class="cht">No fish found</text>`;
};
/** The survey's track over the banks: a grid of dotted lines, the Board's vessel at its end. */
export const surveyTrack: Prop = (a) => {
  const w = a.w || 200;
  let d = '';
  for (let x = 0; x <= w; x += w / 6) d += `M${f(-w / 2 + x)} -14V0`;
  return P(d + `M${f(-w / 2)} -14H${f(w / 2)}M${f(-w / 2)} 0H${f(w / 2)}`, 'svt') + P(`M${f(w / 2 + 2)} -1H${f(w / 2 + 9)}L${f(w / 2 + 8)} 1H${f(w / 2 + 3)}Z`, 'chs') + L(w / 2 + 5.5, -1, w / 2 + 5.5, -6, 'k');
};

export const HARBOUR: Record<string, Prop> = {
  smack, ironTrawler, tiedFleet, surveyBoat, gulls, gull, porpoise, shoalBreak, marketHall, fishTrain, smokehouse, fryShop, mealWorks,
  oilWorks, coldStore, cannery, chartShoal, foreignSail, homeGlyph, scarPatch, surveyTrack,
};
