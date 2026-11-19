// M3: spot illustrations for the broadsheet: a small picture per headline key, in each Age's drawing style (an
// engraving under `ledger`, a chromolithograph vignette under `gaslight`, an airbrushed cut under `chrome`, a
// wireframe under `terminal`, neon under `cyberpunk`). Twelve drawings cover every HeadlineKey; an unknown key gets
// the plain valley. Built from the same props as the scene, so the paper and the picture are one family.
//
//   spot(key, look)                     → an SVG string that relies on the scene's CSS being on the page
//                                          (injectSceneCss(document), which createScene does);
//   spot(key, look, { standalone: true }) → the same with the styles inlined, for an <img> or a saved still.
// Deterministic: the same key and look give the same picture.
import type { BackdropCtx, Prop } from './layout';
import { P, R, C, L, f, hash } from './svg';
import { propFor } from './registry';
import { styleFor } from './styles/index';
import { bprop, birds } from './layouts/util';
import { scaffold, survey } from './props/common';
import { seamSection } from './props/strata';
import { figureArt } from './props/figures';
import { sceneCss } from './css';

export type SpotKind = 'scaffold' | 'stakes' | 'sunrise' | 'fog' | 'ruin' | 'chimneys' | 'pamphlet' | 'sign' | 'clear' | 'seam' | 'bite' | 'letter';

/** Every HeadlineKey of the contract (M1–M3) → its spot. The coverage test checks this list against types.ts. */
export const SPOT_OF: Record<string, SpotKind> = {
  appFounded: 'scaffold', commonsBuilt: 'scaffold', charter: 'scaffold',
  appAvailable: 'stakes', featureUnlocked: 'stakes',
  sectorOpened: 'sunrise', ageBegins: 'sunrise',
  crisis: 'fog', budgetBroken: 'fog', unsettled: 'fog',
  collapse: 'ruin', exhausted: 'ruin', reckoning: 'ruin',
  backfire: 'chimneys', efficiency: 'chimneys', ambient: 'chimneys',
  reveal: 'pamphlet', history: 'pamphlet', return: 'pamphlet', returnWithdrawn: 'pamphlet',
  leverEnacted: 'sign', leverLapsed: 'sign', budgetDrawn: 'sign',
  steadySector: 'clear', steadyAll: 'clear', clearSkies: 'clear', settled: 'clear', decade: 'clear', ending: 'clear',
  seamSunk: 'seam', biteBack: 'bite', dispatch: 'letter', answered: 'letter',
};

/** Each look's own props for the spots' parts (lookup falls back like the scene's). */
const PARTS: Record<string, { works: string; stack: string; house: string; sign: string; side: string }> = {
  ledger: { works: 'mill', stack: 'chimney', house: 'terrace', sign: 'customs', side: 'headframe' },
  gaslight: { works: 'nightFactory', stack: 'chimney', house: 'terrace', sign: 'permits', side: 'nightFactory' },
  chrome: { works: 'mall', stack: 'chimney', house: 'suburb', sign: 'petrol', side: 'suvs' },
  terminal: { works: 'hall', stack: 'cooling', house: 'office', sign: 'permits', side: 'newHall' },
  cyberpunk: { works: 'ctower', stack: 'chimney', house: 'ctowerWarm', sign: 'permitC', side: 'ctower' },
};

export interface SpotOptions {
  /** Inline the scene's styles (for an <img> or a saved file). Default false. */
  standalone?: boolean;
  /** Output size (default 120 × 80; the drawing is 120 × 80). */
  width?: number;
  height?: number;
}

/** A spot illustration for a headline key in a look (a style id: 'ledger', 'gaslight', 'chrome', 'terminal', 'cyberpunk'). */
export function spot(key: string, look: string, o: SpotOptions = {}): string {
  const st = styleFor(look) && styleFor(look)!.css ? look : 'ledger';
  const kind: SpotKind = SPOT_OF[key] ?? 'clear';
  const pf = `sp${hash(st + ':' + key) % 100000}-`;
  const parts = PARTS[st] ?? PARTS.ledger;
  const c: BackdropCtx = { u: (x) => `url(#${pf}${x})`, hatch: (s, l = 0) => `url(#${pf}${l ? 'x' : 'h'}${s >= 0.85 ? 0 : s >= 0.62 ? 1 : s >= 0.45 ? 2 : 3})`, r: () => 0.5, stage: 1 };
  const pr = (k: string): Prop => propFor(st, st, k);
  const put = (k: string, x: number, y: number, s: number, v = 0.5, extra: Record<string, number> = {}) => bprop(pr(k), x, y, s, v, c, extra);
  const G = 64; // the ground line
  const sky = `<rect width="120" height="80" class="spbg"/>`;
  const hill = P(`M0 ${G - 18}Q20 ${G - 28} 44 ${G - 22}T86 ${G - 24}T120 ${G - 20}V${G}H0Z`, 'tr', 'fill-opacity=".35"') + P(`M0 ${G - 18}Q20 ${G - 28} 44 ${G - 22}T86 ${G - 24}T120 ${G - 20}`, 'k k2');
  const ground = R(0, G, 120, 80 - G, 'gd') + L(0, G, 120, G, 'k K');
  const puffs = (x: number, y: number, dark: boolean) => [0, 1, 2].map((i) => C(x + i * 5, y - i * 6, 2 + i * 1.6, dark ? 'd' : 'smb', `opacity="${(0.8 - i * 0.2).toFixed(2)}"`)).join('');
  let body = '';
  switch (kind) {
    case 'scaffold':
      body = hill + ground + put(parts.house, 22, G, 0.6, 0.3) + put(parts.works, 64, G, 0.75, 0.6) + `<g transform="translate(64 ${G}) scale(.75)">${scaffold(56, 50)}</g>`;
      break;
    case 'stakes':
      body = hill + ground + put(parts.house, 96, G, 0.5, 0.7) + `<g transform="translate(26 ${G - 2})">${survey(56, 10)}</g>` + L(30, G - 2, 30, G - 26, 'k K') + P(`M30 ${G - 26}l12 3l-12 4z`, 'ac');
      break;
    case 'sunrise':
      body = `<g class="sunf"><circle cx="60" cy="${G - 18}" r="14" class="k" style="fill:var(--s-sun)"/></g>` + hill + ground + put(parts.house, 22, G, 0.5, 0.2) + put(parts.house, 98, G, 0.5, 0.8);
      break;
    case 'fog':
      body = hill + ground + put(parts.works, 40, G, 0.7, 0.4) + put(parts.stack, 80, G, 0.8) + puffs(84, G - 50, true) +
        P(`M0 ${G - 30}Q30 ${G - 38} 60 ${G - 30}T120 ${G - 32}V80H0Z`, '', 'style="fill:rgb(var(--s-fog,var(--s-smk)))" opacity=".62"');
      break;
    case 'ruin':
      body = hill + ground + `<g opacity=".55">${put(parts.works, 44, G, 0.7, 0.4)}</g>` + P(`M78 ${G}V${G - 30}l2 -3l1.4 2l1.6 -4V${G}Z`, 'b k') + put('spoil', 100, G, 0.7) + L(0, G - 46, 120, G - 46, 'k k2');
      break;
    case 'chimneys':
      body = hill + ground + put(parts.stack, 30, G, 0.8) + put(parts.stack, 56, G, 0.9) + put(parts.stack, 84, G, 0.75) + put(parts.works, 60, G, 0.6, 0.7) +
        puffs(32, G - 48, false) + puffs(58, G - 56, true) + puffs(86, G - 44, false);
      break;
    case 'pamphlet':
      body = R(0, G, 120, 80 - G, 'gd') + `<g transform="rotate(-6 60 40)">${R(34, 10, 52, 62, 'b k K')}${R(38, 14, 44, 8, 'd')}${P(Array.from({ length: 9 }, (_, i) => `M40 ${28 + i * 4.6}h${i % 3 === 2 ? 26 : 40}`).join(''), 'k k2')}</g>` +
        P('M90 70L104 22l3 1l-12 48z', 'b k') + P('M104 22l6 -12l-2 13z', 'ac k');
      break;
    case 'sign':
      body = hill + ground + put(parts.house, 26, G, 0.55, 0.4) + put(parts.sign, 76, G, 0.9, 0.5);
      break;
    case 'clear':
      body = `<g class="sunf"><circle cx="92" cy="20" r="8" class="k" style="fill:var(--s-sun)"/></g>` + `<g transform="translate(44 22) scale(.8)">${birds({ s: 1, v: 0.5, stage: 1, w: 0, h: 0, r: () => 0.5, u: c.u, hatch: () => '', overlay: false }, { fx: () => {} })}</g>` +
        hill + ground + put(parts.house, 30, G, 0.55, 0.2) + put(parts.house, 52, G, 0.5, 0.6) + put('tree', 84, G, 0.7, 0.4);
      break;
    case 'seam':
      body = hill + put('headframe', 30, G, 0.55) +
        seamSection({ total: 3, shaftX: 30, y0: G, y1: 87, w: 120, rock: c.hatch(0.9), rock2: c.hatch(0.9, 1), glow: c.u('glow') })
          .replace(/class="sm sm(\d)"/g, (_m, i) => `class="sm sm${i}${+i <= 2 ? ' sunk' : ''}${+i < 2 ? ' out' : +i === 2 ? ' work' : ''}"`);
      break;
    case 'bite':
      body = hill + ground + put(parts.sign, 30, G, 0.75, 0.5) + put(parts.side, 82, G, st === 'chrome' ? 0.9 : 0.7, 0.4) + `<g transform="translate(82 ${G}) scale(.6)">${scaffold(50, 40)}</g>`;
      break;
    case 'letter': {
      const fig = figureArt('correspondent', st);
      body = R(0, G, 120, 80 - G, 'gd') + L(0, G, 120, G, 'k K') + `<g transform="rotate(4 70 36)">${R(48, 18, 56, 36, 'b k K')}${P('M48 18l28 20l28 -20', 'k')}${C(76, 40, 4, 'ac k')}</g>` +
        (fig ? `<g transform="translate(26 ${G}) scale(1.6)">${fig.body}</g>` : '');
      break;
    }
  }
  const style = styleFor(st)!;
  const defs = `<defs>${style.defs(pf)}</defs>`;
  const w = o.width ?? 120, h = o.height ?? 80;
  const css = o.standalone ? `<style>${sceneCss().replace(/<\/style/gi, '')}\n.scn-spot *{vector-effect:non-scaling-stroke}</style>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="scn-spot" viewBox="0 0 120 80" width="${f(w)}" height="${f(h)}" role="img" aria-hidden="true">${css}` +
    `<g class="scn" data-look="${st}">${defs}${sky}${body}<rect x=".5" y=".5" width="119" height="79" class="spfr"/></g></svg>`;
}

/** The spot kinds, for a gallery or a test. */
export const SPOT_KINDS: SpotKind[] = ['scaffold', 'stakes', 'sunrise', 'fog', 'ruin', 'chimneys', 'pamphlet', 'sign', 'clear', 'seam', 'bite', 'letter'];
