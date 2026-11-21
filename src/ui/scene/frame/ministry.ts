// M5: the Ministry window. Every Act II picture (and a capstone's) is seen from the Ministry once office is taken: the
// frame is HTML over the stage, outside the scene's SVG bands, so it costs the bands no repaint. Airbrushed glazing bars
// in the Great Acceleration's palette at the top corners, a painted sill edge along the bottom (the page's sill bar sits
// under the picture), and curtains half drawn in Opposition. Nothing in it animates but a one-off transform on the
// wrapper as it enters, and the thaw (four filter steps on the active world, on timers) at Take office.

/** The frame's markup (one per scene instance; shown by the root classes `ministry` and `opposition`). */
export function frameMarkup(p: string): string {
  // The glazing: a corner piece per top corner (a stile, a rail and a quadrant), airbrushed by a gradient.
  const corner = (flip: boolean) => `<g${flip ? ' transform="translate(600 0) scale(-1 1)"' : ''}>` +
    `<path d="M0 0H150V7H22Q12 7 11 18V118H0Z" fill="url(#${p}frmG)"/>` +
    `<path d="M11 118V18Q12 7 22 7H150" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1"/>` +
    `<path d="M0 0H150V3H0Z" fill="rgba(0,0,0,.18)"/></g>`;
  // A curtain: a fall of cloth with three folds, gathered at the top, hanging to the sill.
  const curtain = (flip: boolean) => `<g class="frm-c"${flip ? ' transform="translate(600 0) scale(-1 1)"' : ''}>` +
    `<path d="M0 0H58Q50 140 64 400H0Z" fill="url(#${p}frmC)"/>` +
    `<path d="M16 6Q13 200 20 400M32 6Q29 200 40 400M46 6Q42 200 54 400" fill="none" stroke="rgba(0,0,0,.16)" stroke-width="4"/>` +
    `<path d="M58 0Q50 140 64 400" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/></g>`;
  return `<svg class="frm-s" viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true">` +
    `<defs><linearGradient id="${p}frmG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9eef0"/><stop offset=".45" stop-color="#9fb1b4"/><stop offset="1" stop-color="#5d7175"/></linearGradient>` +
    `<linearGradient id="${p}frmC" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e2a2a"/><stop offset=".55" stop-color="#9c4038"/><stop offset="1" stop-color="#7a3030"/></linearGradient>` +
    `<linearGradient id="${p}frmS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d2c0"/><stop offset="1" stop-color="#8f8670"/></linearGradient></defs>` +
    corner(false) + corner(true) +
    `<path d="M0 393H600V400H0Z" fill="url(#${p}frmS)"/><path d="M0 393H600" stroke="rgba(255,255,255,.75)" stroke-width="1" fill="none"/>` +
    curtain(false) + curtain(true) + `</svg>`;
}

/** The frame's CSS (part of the scene's base sheet). */
export const FRAME_CSS = `
.scn-frm{position:absolute;inset:0;pointer-events:none;display:none;transform-origin:50% 40%}
.scn.ministry .scn-frm{display:block}
.scn-frm .frm-s{position:absolute;inset:0;width:100%;height:100%}
.scn-frm .frm-c{display:none}
.scn.opposition .scn-frm .frm-c{display:inline}
.scn-frm.enter{transform:scale(1.08);opacity:0}
.scn-frm.in{transition:transform 1.2s ease-out,opacity .6s ease-out}
.scn.ministry .scn-stage{border-color:#5d7175}
`;

/** The thaw's grey levels, one per step (350 ms apart on timers; the last clears the filter). */
export const THAW_STEPS = [1, 0.66, 0.33, 0];
export const THAW_MS = 350;
