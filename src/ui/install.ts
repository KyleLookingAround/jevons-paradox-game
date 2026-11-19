// Home Screen install: the icon's drawing. Since perf pass 2 the manifest and icons are files: build.ts writes
// dist/manifest.webmanifest, and tools/icons.mjs renders this drawing to public/icons/ (icon.svg, icon-192.png,
// icon-512.png, apple-touch-icon.png), which index.html links. Nothing here runs in the page any more.

const BG = '#efe6d0', INK = '#2a1f15', RED = '#a3231a', RULE = 'rgba(62,92,140,.28)';

/** The icon: a ledger-paper dial whose needle has swung into the red. Drawn inside the maskable safe zone. */
export function iconSvg(): string {
  const cx = 256, cy = 318, r = 150;
  const at = (t: number, rr = r) => { const th = Math.PI * (1 - t); return [cx + rr * Math.cos(th), cy - rr * Math.sin(th)].map((v) => v.toFixed(1)).join(' '); };
  const arc = (t0: number, t1: number, rr = r) => `M${at(t0, rr)}A${rr} ${rr} 0 0 1 ${at(t1, rr)}`;
  const rules = [150, 206, 262, 374, 430].map((y) => `<line x1="0" x2="512" y1="${y}" y2="${y}" stroke="${RULE}" stroke-width="4"/>`).join('');
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => `<path d="M${at(t, r - 24)}L${at(t, r - (t === 0.4 ? 58 : 42))}" stroke="${INK}" stroke-width="${t === 0.4 ? 10 : 6}" stroke-linecap="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">`
    + `<rect width="512" height="512" fill="${BG}"/>${rules}`
    + `<line x1="0" x2="512" y1="396" y2="396" stroke="${INK}" stroke-width="5"/><line x1="0" x2="512" y1="408" y2="408" stroke="${INK}" stroke-width="5"/>`
    + `<path d="${arc(0, 1)}" fill="none" stroke="${INK}" stroke-opacity=".14" stroke-width="30"/>`
    + `<path d="${arc(0.4, 1)}" fill="none" stroke="${RED}" stroke-opacity=".25" stroke-width="30"/>`
    + `<path d="${arc(0, 0.82)}" fill="none" stroke="${RED}" stroke-width="30"/>${ticks}`
    + `<path d="M${at(0.82, -18)}L${at(0.82, r - 14)}" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>`
    + `<circle cx="${cx}" cy="${cy}" r="24" fill="${INK}"/></svg>`;
}
