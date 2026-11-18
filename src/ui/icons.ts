// Inline SVG line-art vignettes keyed by ApplicationDef.icon. viewBox 64×48, ground at y=44.
// Elements with class "act" are activity marks (smoke, lit windows, packets…) revealed as adoption rises.
const P = (d: string, extra = '') => `<path d="${d}"${extra}/>`;
const puff = (x: number, y: number, r = 2.2) => `<circle class="act puff" cx="${x}" cy="${y}" r="${r}"/>`;
const win = (x: number, y: number, w = 3, hh = 3) => `<rect class="act lit" x="${x}" y="${y}" width="${w}" height="${hh}"/>`;
const dot = (x: number, y: number, r = 1.3) => `<circle class="act lit" cx="${x}" cy="${y}" r="${r}"/>`;
const dash = (x1: number, y1: number, x2: number, y2: number) => `<line class="act trail" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;

const ICONS: Record<string, string> = {
  pump:
    // engine house, chimney, rocking beam, pump rod into a flooded shaft
    P('M4 44H60') + P('M8 44V22H24V44') + P('M7 22L16 15L25 22') + P('M27 44V8H31V44') +
    P('M12 13L50 9') + P('M22 12L19 22M22 12L25 22') + P('M48 9.3V40') + P('M44 44V36H52V44', ' class="ink2"') +
    P('M44.5 41C46 40 47 42 48 41S50 40 51.5 41', ' class="water"') + win(11, 30, 3, 5) + win(18, 30, 3, 5) +
    puff(30, 5) + puff(35, 3, 2.6) + puff(41, 2.5, 3) + `<circle class="act lit" cx="48" cy="37" r="1"/>`,
  mill:
    // long mill with a sawtooth roof and many windows
    P('M2 44H62') + P('M4 44V22L12 16V22L20 16V22L28 16V22L36 16V22H44V44Z') + P('M48 44V6H53V44') + P('M46 6H55') +
    win(7, 26) + win(13, 26) + win(19, 26) + win(25, 26) + win(31, 26) + win(37, 26) +
    win(7, 34) + win(13, 34) + win(19, 34) + win(25, 34) + win(31, 34) + win(37, 34) +
    puff(52, 3) + puff(57, 2, 2.6),
  train:
    P('M2 44H62') + P('M2 41H62', ' class="ink2"') + P('M10 36V24H34V36Z') + P('M34 36V18H44V36') + P('M32 18H46') +
    P('M14 24V16H19V24') + P('M12.5 16H20.5') + P('M8 36H46L48 32') + '<circle cx="16" cy="38" r="3"/><circle cx="26" cy="38" r="3"/><circle cx="39" cy="38" r="3.5"/>' +
    win(37, 21, 4, 4) + puff(17, 12) + puff(12, 9, 2.6) + puff(6, 7, 3) + dash(50, 30, 60, 30) + dash(52, 25, 60, 25),
  ship:
    P('M2 44C6 42 10 46 14 44S22 42 26 44S34 46 38 44S46 42 50 44S58 46 62 44', ' class="water"') +
    P('M8 34H56L50 42H14Z') + P('M16 34V28H46V34') + P('M22 28V18H27V28') + P('M32 28V18H37V28') + P('M50 34V12M44 16L50 12L56 16', ' class="ink2"') +
    win(19, 30, 2.5, 2.5) + win(24, 30, 2.5, 2.5) + win(29, 30, 2.5, 2.5) + win(34, 30, 2.5, 2.5) + win(39, 30, 2.5, 2.5) +
    puff(25, 14) + puff(35, 13) + puff(30, 9, 2.8),
  lamp:
    P('M4 44H60') + P('M32 44V18') + P('M28 44H36') + P('M26 18H38L36 10H28Z') + P('M30 10L32 7L34 10') + P('M32 22H40V20', ' class="ink2"') +
    `<circle class="act glow" cx="32" cy="14" r="4"/>` + dash(22, 14, 18, 13) + dash(42, 14, 46, 13) + dash(24, 8, 21, 5) + dash(40, 8, 43, 5) + dash(32, 4, 32, 1),
  'factory-night':
    P('M2 44H62') + P('M6 44V28L16 22V28L26 22V28L36 22V44Z') + P('M40 44V14H46V44') + P('M36 44H58V32H46', ' class="ink2"') +
    P('M54 6A6 6 0 1 0 58 16A5 5 0 1 1 54 6Z', ' class="ink2"') +
    win(9, 32) + win(15, 32) + win(21, 32) + win(27, 32) + win(9, 38) + win(21, 38) + win(49, 36) + win(54, 36) + puff(44, 10),
  house:
    P('M2 44H62') + P('M14 44V24L32 10L50 24V44') + P('M10 26L32 8L54 26') + P('M28 44V34H36V44') + P('M42 16V10H46V19', ' class="ink2"') +
    win(18, 27, 6, 5) + win(40, 27, 6, 5) + win(18, 36, 6, 5) + win(40, 36, 6, 5) + win(30, 20, 4, 4) + puff(44, 6, 1.8),
  sign:
    P('M4 44H60') + P('M10 44V10M54 44V10', ' class="ink2"') + P('M8 12H56V34H8Z') + P('M14 18H50V28H14Z', ' class="ink2"') +
    dot(12, 15) + dot(20, 15) + dot(28, 15) + dot(36, 15) + dot(44, 15) + dot(52, 15) + dot(12, 31) + dot(52, 31) +
    `<path class="act glow" d="M18 25V21L22 25V21M26 21H30M26 23H29M26 25H30M33 21H37M35 21V25M40 21L44 25M44 21L40 25" stroke-width="1.2"/>`,
  van:
    P('M2 44H62') + P('M10 38V18H40V38') + P('M40 24H50L56 31V38H40') + P('M43 26H49L53 31H43Z', ' class="ink2"') + P('M8 38H58') +
    '<circle cx="18" cy="40" r="3.5"/><circle cx="48" cy="40" r="3.5"/>' + P('M15 24H33M15 29H28', ' class="ink2"') +
    dash(2, 22, 8, 22) + dash(0, 28, 7, 28) + dash(3, 34, 8, 34) + puff(5, 39, 1.6),
  car:
    P('M2 44H62') + P('M8 38V32L14 30L22 22H42L50 30L58 32V38Z') + P('M24 24H31V30H18Z M34 24H40L46 30H34Z', ' class="ink2"') +
    '<circle cx="18" cy="39" r="4"/><circle cx="48" cy="39" r="4"/>' + puff(5, 36, 1.8) + puff(2.5, 32, 2.2) + dash(0, 26, 8, 26) + dash(2, 22, 12, 22) + win(55, 33, 2.5, 2),
  suburb:
    P('M2 44H62') + P('M4 44V30L12 23L20 30V44') + P('M24 44V30L32 23L40 30V44') + P('M44 44V30L52 23L60 30V44') +
    P('M2 40H62', ' class="ink2"') + win(7, 32, 3, 3) + win(14, 32, 3, 3) + win(27, 32, 3, 3) + win(34, 32, 3, 3) + win(47, 32, 3, 3) + win(54, 32, 3, 3) +
    P('M10 10C14 6 18 14 22 10', ' class="ink2"') + `<rect class="act lit" x="30" y="36" width="4" height="4"/>`,
  plane:
    P('M2 44H62', ' class="ink2"') + P('M10 26L52 22C58 22 60 25 54 27L14 30Z') + P('M30 24L22 12H27L40 23') + P('M30 29L24 38H29L39 28') +
    P('M12 26L8 18H12L18 25') + dash(2, 30, 8, 29) + dash(0, 34, 6, 33) + dash(4, 26, 1, 26) + win(42, 24, 2, 2) + win(46, 24, 2, 2),
  sheet:
    P('M8 6H56V42H8Z') + P('M8 14H56M8 22H56M8 30H56M20 6V42M32 6V42M44 6V42', ' class="ink2"') +
    `<rect class="act lit" x="21" y="15" width="10" height="6"/><rect class="act lit" x="33" y="23" width="10" height="6"/><rect class="act lit" x="45" y="31" width="10" height="6"/>` +
    `<rect class="act lit" x="21" y="31" width="10" height="6"/><rect class="act lit" x="33" y="15" width="10" height="6"/><rect class="act lit" x="45" y="15" width="10" height="6"/>`,
  globe:
    '<circle cx="32" cy="24" r="17"/>' + P('M15 24H49M18 15H46M18 33H46', ' class="ink2"') + '<ellipse class="ink2" cx="32" cy="24" rx="7" ry="17"/>' +
    P('M32 7V41', ' class="ink2"') + dot(22, 15, 1.6) + dot(42, 18, 1.6) + dot(28, 31, 1.6) + dot(45, 30, 1.6) + dot(36, 11, 1.6) + dash(22, 15, 42, 18) + dash(28, 31, 45, 30),
  play:
    P('M6 8H58V38H6Z') + P('M26 44H38M32 38V44') + P('M27 15L39 23L27 31Z') +
    `<rect class="act lit" x="46" y="30" width="2" height="4"/><rect class="act lit" x="49.5" y="27" width="2" height="7"/><rect class="act lit" x="53" y="24" width="2" height="10"/>` +
    `<rect class="act lit" x="10" y="33" width="10" height="2"/><rect class="act lit" x="10" y="33" width="20" height="2"/>`,
  brain:
    P('M32 10C28 4 18 6 18 13C11 13 10 22 14 25C10 30 15 38 22 36C24 41 32 41 32 36Z') +
    P('M32 10C36 4 46 6 46 13C53 13 54 22 50 25C54 30 49 38 42 36C40 41 32 41 32 36') + P('M32 10V36', ' class="ink2"') +
    P('M22 18C25 18 26 21 24 23M42 18C39 18 38 21 40 23M20 29C23 28 25 30 25 32M44 29C41 28 39 30 39 32', ' class="ink2"') +
    dot(24, 23) + dot(40, 23) + dot(25, 32) + dot(39, 32) + dot(28, 15) + dot(36, 15) + dash(24, 23, 28, 15) + dash(40, 23, 36, 15),
  wrench:
    P('M14 38L36 16C34 10 38 4 45 5L40 11L42 15L46 17L52 12C53 19 47 23 41 21L19 43C16 46 11 41 14 38Z') +
    P('M10 8L14 12M8 14H12M16 4V8', ' class="ink2"') + dash(50, 30, 56, 30) + dash(53, 27, 53, 33) + dash(44, 38, 48, 38) + dash(46, 36, 46, 40) + dot(56, 40, 1.2),
  'phone-app':
    P('M22 4H42Q45 4 45 7V41Q45 44 42 44H22Q19 44 19 41V7Q19 4 22 4Z') + P('M29 40H35', ' class="ink2"') +
    `<rect class="act lit" x="23" y="9" width="5" height="5"/><rect class="act lit" x="29.5" y="9" width="5" height="5"/><rect class="act lit" x="36" y="9" width="5" height="5"/>` +
    `<rect class="act lit" x="23" y="16" width="5" height="5"/><rect class="act lit" x="29.5" y="16" width="5" height="5"/><rect class="act lit" x="36" y="16" width="5" height="5"/>` +
    `<rect class="act lit" x="23" y="23" width="5" height="5"/><rect class="act lit" x="29.5" y="23" width="5" height="5"/>`,
  scroll:
    P('M14 8H48V38') + P('M14 8C10 8 10 14 14 14H18V8') + P('M48 38C52 38 52 44 48 44H18C14 44 14 38 18 38H48', '') + P('M18 14V38', ' class="ink2"') +
    `<line class="act trail" x1="22" y1="16" x2="42" y2="16"/><line class="act trail" x1="22" y1="20" x2="38" y2="20"/><line class="act trail" x1="26" y1="24" x2="44" y2="24"/>` +
    `<line class="act trail" x1="26" y1="28" x2="40" y2="28"/><line class="act trail" x1="22" y1="32" x2="34" y2="32"/>`,
  robots:
    P('M2 44H62') + P('M8 22H24V36H8Z') + P('M10 36V44M22 36V44M16 22V17', ' class="ink2"') + '<circle cx="16" cy="15" r="2"/>' +
    P('M40 18H56V34H40Z') + P('M42 34V44M54 34V44M48 18V13', ' class="ink2"') + '<circle cx="48" cy="11" r="2"/>' +
    win(11, 26, 3, 3) + win(18, 26, 3, 3) + win(43, 22, 3, 3) + win(50, 22, 3, 3) + dash(26, 28, 38, 26) + dash(26, 32, 38, 30) + dash(28, 20, 34, 15),
};

const FALLBACK = P('M4 44H60') + P('M16 44V20H48V44') + P('M24 20V14H40V20', ' class="ink2"') + '<circle cx="32" cy="32" r="6"/>' +
  P('M32 23V26M32 38V41M23 32H26M38 32H41', ' class="ink2"') + win(20, 24, 3, 3) + win(41, 24, 3, 3) + puff(36, 10);

const UNKNOWN = '<rect x="12" y="6" width="40" height="36" rx="3" stroke-dasharray="3 3" class="ink2"/>' +
  '<path d="M27 18C27 13 37 13 37 18C37 22 32 22 32 27"/><circle cx="32" cy="33" r="1.2"/>';

export function iconMarkup(key: string | undefined | null, unknown = false): string {
  const body = unknown ? UNKNOWN : (key && Object.prototype.hasOwnProperty.call(ICONS, key) ? ICONS[key] : FALLBACK);
  return `<svg class="pict" viewBox="0 0 64 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

export const ICON_KEYS = Object.keys(ICONS);

export const UI_ICONS = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7H20M4 12H20M4 17H14"/></svg>',
  info: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6.3"/><path d="M8 7V11.5" stroke-linecap="round"/><circle cx="8" cy="4.8" r=".6" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6L18 18M18 6L6 18"/></svg>',
  arrow: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8H13M9 4L13 8L9 12"/></svg>',
  lock: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5A2.5 2.5 0 0 1 10.5 5V7"/></svg>',
};
