// Registries: layouts by sector id, prop libraries by look. Adding an industry = registerLayout(); adding a look's
// props = registerProps(). Lookups never fail: unknown sector → generic layout, unknown prop → generic 'works'.
import type { Layout, Prop } from './layout';
import { COMMON, works } from './props/common';
import { CIVIC } from './props/civic';
import { steam } from './layouts/steam';
import { light } from './layouts/light';
import { motion } from './layouts/motion';
import { compute } from './layouts/compute';
import { code } from './layouts/code';
import { genericLayout } from './layouts/generic';
import { iron } from './layouts/iron';
import { fishing } from './layouts/fishing';
import { plenty } from './layouts/plenty';
import { birds } from './layouts/util';
import { styleFor, allStyles, addProps } from './styles/index';
import { M3_TERMINAL, M3_CHROME } from './props/m3';
import { M4_SHARED } from './props/m4';
import { PRYCE } from './props/pryce';

addProps('terminal', M3_TERMINAL);
addProps('chrome', M3_CHROME);

const SHARED: Record<string, Prop> = { ...COMMON, ...CIVIC, ...M4_SHARED, ...PRYCE, birds };

const LAYOUTS: Record<string, Layout> = { steam, light, motion, compute, code, iron, fishing, plenty };

/** Icon aliases: an application icon a style's library lacks is drawn with the nearest prop it has. */
const ALIAS: Record<string, string> = {
  pump: 'engine', mill: 'mill', winder: 'headframe', train: 'train', ship: 'ship', plough: 'ploughField',
  'factory-night': 'nightFactory', house: 'terrace', sign: 'sign', lamp: 'lampPost', tram: 'tram',
  van: 'depot', car: 'car', mall: 'mall', suburb: 'suburb', plane: 'plane',
  sheet: 'office', globe: 'exchange', cloud: 'storage', play: 'hall', brain: 'campus',
  wrench: 'workshop', 'phone-app': 'kiosk', scroll: 'oldTower', chatbot: 'hoarding', robots: 'floor',
};

export function registerLayout(sectorId: string, layout: Layout): void {
  LAYOUTS[sectorId] = layout;
}

/** Add props to an art style's library (the style is created as a shell if it does not exist). */
export function registerProps(look: string, props: Record<string, Prop>): void {
  addProps(look, props);
}

export function layoutFor(sectorId: string, appCount: number): Layout {
  return LAYOUTS[sectorId] ?? genericLayout(appCount);
}

export function hasLayout(sectorId: string): boolean {
  return Object.prototype.hasOwnProperty.call(LAYOUTS, sectorId);
}

/** Prop lookup: the layout's style, then the page look's style, then shared props, then aliases, then any style, then 'works'. */
export function propFor(layoutLook: string, pageLook: string, key: string): Prop {
  const own = styleFor(layoutLook)?.props, page = styleFor(pageLook)?.props;
  const k2 = ALIAS[key];
  return own?.[key] ?? page?.[key] ?? SHARED[key] ?? (k2 ? own?.[k2] ?? page?.[k2] ?? SHARED[k2] : undefined) ??
    findAnywhere(key) ?? (k2 ? findAnywhere(k2) : undefined) ?? works;
}

function findAnywhere(key: string): Prop | undefined {
  for (const st of allStyles()) if (st.props[key]) return st.props[key];
  return undefined;
}
