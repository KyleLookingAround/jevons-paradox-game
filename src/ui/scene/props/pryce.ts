// M5: Pryce in the landscape. Props shared by every style (each tints them through its own tokens: the `.pry` navy and
// `.pry2` gold of Pryce Consolidated are mixed with the style's ink and accent in css.ts): a hoarding per lever he
// lobbies against, a court notice pinned on a litigated lever's sign, his bunting on a capstoned Industry's works, the
// congestion-charge gantry, an unmetered borehole with a pump-jack (Plenty's unlicensed wells), and the exempt vehicles
// and dated uses of Motion as he runs it (light trucks, four-by-fours, motorway haulage, the school run, next-day
// delivery). Drawn about the bottom centre, y up negative, with the shared classes.
import type { Prop } from '../layout';
import { P, R, C, L, f } from '../svg';

/** What his hoardings say, by the kind of lever they stand against. */
export const SLOGANS: Record<string, [string, string]> = {
  measure: ['FREEDOM OF', 'THE ROAD'],
  duty: ['A FAIR PRICE', 'AT THE PUMP'],
  cap: ['PROSPERITY,', 'NOT PERMITS'],
  charge: ['THE ROADS ARE', 'PAID FOR'],
  sufficiency: ['LET PEOPLE', 'CHOOSE'],
  substitution: ['DON’T GAMBLE', 'ON WINDMILLS'],
  '*': ['JOBS FIRST', 'JOBS LAST'],
};

/** A hoarding on two posts: the slogan in two lines and the firm's name in a band. */
function hoardingOf(lines: [string, string]): Prop {
  return () =>
    L(-17, 0, -17, -14, 'k K') + L(17, 0, 17, -14, 'k K') +
    R(-24, -36, 48, 22, 'b') + R(-24, -36, 48, 22, 'k', 'fill="none"') + R(-24, -18.5, 48, 4.5, 'pry') +
    `<text x="0" y="-29" class="prt">${lines[0]}</text><text x="0" y="-22" class="prt">${lines[1]}</text>` +
    `<text x="0" y="-15.3" class="prt prb">PRYCE CONSOLIDATED</text>`;
}

/** The court notice: a paper pinned askew, ruled lines, a red seal. */
const courtNotice: Prop = () =>
  `<g transform="rotate(-8)">` + R(-6, -15, 12, 15, 'b k') + P('M-4 -12h8M-4 -9.5h8M-4 -7h6M-4 -4.5h7', 'k k2') + C(3, -2.6, 1.8, 'prs') + `</g>`;

/** Pryce's bunting: a sagging line of navy and gold pennants across `w`. */
const bunting: Prop = (a) => {
  const w = a.w || 80, sag = 7;
  const y = (t: number) => sag * 4 * t * (1 - t);
  let flags = '';
  const n = Math.max(4, Math.floor(w / 9));
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.2) / n, t1 = (i + 0.8) / n, tm = (i + 0.5) / n;
    const x0 = -w / 2 + t0 * w, x1 = -w / 2 + t1 * w, xm = -w / 2 + tm * w;
    flags += P(`M${f(x0)} ${f(y(t0))}L${f(x1)} ${f(y(t1))}L${f(xm)} ${f(y(tm) + 6)}Z`, i % 2 ? 'pry2' : 'pry');
  }
  return P(`M${f(-w / 2)} 0Q0 ${f(sag * 2)} ${f(w / 2)} 0`, 'k k2', 'fill="none"') + flags;
};

/** The congestion-charge gantry: a portal over the road, the white C in a red ring each side, cameras on the beam. */
const ccgantry: Prop = () =>
  L(-34, 0, -34, -26, 'k K') + L(34, 0, 34, -26, 'k K') + R(-36, -29, 72, 4, 'mt k') +
  C(-18, -20, 4.2, 'prs') + C(-18, -20, 2.6, 'b') + C(18, -20, 4.2, 'prs') + C(18, -20, 2.6, 'b') +
  `<text x="-18" y="-18.6" class="prt prc">C</text><text x="18" y="-18.6" class="prt prc">C</text>` +
  R(-4, -25, 3, 3, 'd') + R(3, -25, 3, 3, 'd');

/** An unmetered borehole: a casing, a pump-jack nodding over it (the rock fx), a puddle where it spills. */
const borehole: Prop = (a, o) => {
  o.fx('rock', -2, -11, 1, P('M-12 0L10 -2L11 1L-11 3Z', 'd') + P('M8 -4Q13 -3 12 3L9 4Z', 'd') + L(-11, 2, -11, 10, 'k'));
  return P('M-6 0L-2 -11L2 -11L6 0Z', 'b2 k') + R(-1, -12, 2, 12, 'mt k') + R(-12, -3, 6, 3, 'b k') + R(7, -2, 5, 2, 'mt k') +
    `<ellipse cx="4" cy="1" rx="9" ry="1.6" class="wa"/>` + (a.v > 0.5 ? R(-14, -9, 4, 9, 'b2 k') : '');
};

/** A light truck: a pick-up (counted as a truck, against the easier target). Faces right, road at y = 0. */
const pickup: Prop = (a) => {
  const c = ['c1', 'c3', 'c0', 'c2'][Math.floor(a.v * 4) % 4];
  return P('M-10 -2.5V-7H-1V-11.4H5.4L8.4 -7.4L10 -7V-2.5Z', c) + P('M0 -10.6H4.8L7 -7.6H0Z', 'glass') + R(-9.6, -8, 8.4, 1, 'k') +
    C(-6, -2, 2, 'tyre') + C(6, -2, 2, 'tyre');
};

/** A family four-by-four: tall, square, a spare wheel on the back. Faces right. */
const suv: Prop = (a) => {
  const c = ['c1', 'c2', 'c3', 'c0'][Math.floor(a.v * 4) % 4];
  return P('M-9.5 -2.5V-10.6Q-9.5 -12 -8 -12.2L-4 -12.6L-2.6 -15.4H5.6L8 -12.2L10 -11.8V-2.5Z', c) +
    P('M-1.8 -14.6H1.8V-12.6H-3ZM2.6 -14.6H5.2L6.6 -12.6H2.6Z', 'glass') + C(-10.6, -7.4, 2.2, 'tyre') +
    C(-5.4, -2.2, 2.4, 'tyre') + C(5.8, -2.2, 2.4, 'tyre') + R(-9, -16.4, 17, 0.9, 'k');
};

/** An articulated lorry: a tractor unit and a long box trailer. Faces right. */
const artic: Prop = (a) =>
  R(-34, -17, 36, 14.5, 'vn') + R(-32, -13, 32, 3.4, a.v > 0.5 ? 'pry' : 'vs') + P('M4 -14H10L13 -8.6V-2.5H4Z', 'vn') + P('M5 -13H9.4L11.6 -8.6H5Z', 'glass') +
  C(-30, -2, 2, 'tyre') + C(-25, -2, 2, 'tyre') + C(-4, -2, 2, 'tyre') + C(9.5, -2, 2, 'tyre');

/** Motorway haulage: a distribution shed by the junction, the trailers backed on to its bays. */
const distShed: Prop = (a) => {
  const w = 70 + a.v * 14, h = 16;
  let bays = '';
  for (let x = -w / 2 + 6; x < w / 2 - 10; x += 11) bays += R(x, -8, 7, 8, 'door');
  return R(-w / 2, -h, w, h, 'b') + R(-w / 2, -h, w, 2.4, 'rf') + R(-w / 2, -h + 3, w, 2.4, 'ac') + bays +
    `<g transform="translate(${f(-w / 2 + 2)} 6) scale(.6)">${artic(a, { fx: () => {} })}</g>`;
};

/** Next-day delivery: the fulfilment centre, a vast windowless box lettered along its flank, vans at the doors. */
const fulfil: Prop = (a) => {
  const w = 92, h = 22;
  let doors = '';
  for (let x = -w / 2 + 4; x < w / 2 - 6; x += 8) doors += R(x, -6, 5, 6, 'door');
  return R(-w / 2, -h, w, h, 'b') + R(-w / 2, -h, w, 3, 'pry') + `<text x="0" y="-10" class="prt prf">NEXT DAY</text>` + doors +
    `<g transform="translate(${f(w / 2 - 12)} 4) scale(.7)">${pickup({ ...a, v: 0.1 }, { fx: () => {} })}</g>`;
};

/** The school run: a line of cars nose to tail along the school railings at half past eight. */
const schoolGate: Prop = (a) => {
  let d = 'M-34 -5H34M-34 -1H34';
  for (let x = -32; x <= 32; x += 3) d += `M${x} 0V-6`;
  let s = P(d, 'k k2');
  for (let i = 0; i < 4; i++) s += `<g transform="translate(${-24 + i * 16} 4) scale(.85)">${(i % 2 ? suv : pickup)({ ...a, v: (a.v + i * 0.27) % 1 }, { fx: () => {} })}</g>`;
  return s;
};

export const PRYCE: Record<string, Prop> = {
  courtNotice, bunting, ccgantry, borehole, pickup, suv, artic, distShed, fulfil, schoolGate,
  ...Object.fromEntries(Object.entries(SLOGANS).map(([k, v]) => ['hoarding.' + k, hoardingOf(v)])),
};

/** The hoarding's prop key for a lever kind. */
export const hoardingKey = (kind: string): string => 'hoarding.' + (SLOGANS[kind] ? kind : '*');

/** The CSS for Pryce's props: his navy and gold, mixed with each style's ink and accent so a hoarding in the engraving
 *  is sepia and one in the night city glows. */
export const PRYCE_CSS = `
.scn .pry{fill:color-mix(in srgb,#22406a 72%,var(--s-ink));stroke:none}
.scn .pry2{fill:color-mix(in srgb,#d9a92b 72%,var(--s-ac2,var(--s-ac)))}
.scn .prs{fill:#b8322a;stroke:none}
.scn .prt{font:800 5.2px/1 var(--f-grot,Helvetica,Arial,sans-serif);fill:var(--s-ink);text-anchor:middle;letter-spacing:.02em}
.scn .prt.prb{font-size:2.9px;fill:var(--s-b,#fff);letter-spacing:.08em}
.scn .prt.prc{font-size:4.4px;fill:#b8322a}
.scn .prt.prf{font-size:6px;fill:var(--s-b2,#ccc);letter-spacing:.1em}
.scn[data-look=ledger] .pry,.scn[data-look=harbour] .pry,.scn[data-look=foundry] .pry{fill:color-mix(in srgb,#22406a 35%,var(--s-ink))}
.scn[data-look=terminal] .pry,.scn[data-look=terminal] .pry2{fill:none;stroke:var(--s-ink)}
.scn .stmp b{width:auto;height:auto;transform:translate(-50%,-50%) rotate(-12deg);font:800 13px/1 var(--f-grot,Helvetica,Arial,sans-serif);color:#b8322a;
  border:2px solid #b8322a;padding:2px 6px;letter-spacing:.12em;text-transform:uppercase;background:rgba(255,255,255,.55);white-space:nowrap}
`;
