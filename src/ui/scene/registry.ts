// Registries: layouts by sector id, prop libraries by look. Adding an industry = registerLayout(); adding a look's
// props = registerProps(). Lookups never fail: unknown sector → generic layout, unknown prop → generic 'works'.
import type { Layout, Prop } from './layout';
import { COMMON, works } from './props/common';
import { LEDGER } from './props/ledger';
import { GASLIGHT } from './props/gaslight';
import { CHROME } from './props/chrome';
import { TERMINAL } from './props/terminal';
import { AGENTIC } from './props/agentic';
import { steam } from './layouts/steam';
import { light } from './layouts/light';
import { motion } from './layouts/motion';
import { compute } from './layouts/compute';
import { code } from './layouts/code';
import { genericLayout } from './layouts/generic';
import { mix } from './svg';
import { birds } from './layouts/util';

const SHARED: Record<string, Prop> = { ...COMMON, birds };

const LAYOUTS: Record<string, Layout> = { steam, light, motion, compute, code };
const LIBS: Record<string, Record<string, Prop>> = {
  ledger: LEDGER, gaslight: GASLIGHT, chrome: CHROME, terminal: TERMINAL, agentic: AGENTIC,
};

/** Icon aliases: an application icon a look's library lacks is drawn with the nearest prop it has. */
const ALIAS: Record<string, string> = {
  pump: 'engine', mill: 'mill', winder: 'headframe', train: 'train', ship: 'ship', plough: 'ploughField',
  'factory-night': 'nightFactory', house: 'terrace', sign: 'sign', lamp: 'lampPost', tram: 'tram',
  van: 'depot', car: 'car', mall: 'mall', suburb: 'suburb', plane: 'plane',
  sheet: 'office', globe: 'exchange', cloud: 'storage', play: 'hall', brain: 'campus',
  wrench: 'shed', 'phone-app': 'kiosk', scroll: 'temple', chatbot: 'bubbleHouse', robots: 'floor',
};

export function registerLayout(sectorId: string, layout: Layout): void {
  LAYOUTS[sectorId] = layout;
}

export function registerProps(look: string, props: Record<string, Prop>): void {
  LIBS[look] = { ...(LIBS[look] ?? {}), ...props };
}

export function layoutFor(sectorId: string, appCount: number): Layout {
  return LAYOUTS[sectorId] ?? genericLayout(appCount);
}

export function hasLayout(sectorId: string): boolean {
  return Object.prototype.hasOwnProperty.call(LAYOUTS, sectorId);
}

/** Prop lookup: the layout's own look, then the page look, then shared props, then any look (via alias), then 'works'. */
export function propFor(layoutLook: string, pageLook: string, key: string): Prop {
  const own = LIBS[layoutLook], page = LIBS[pageLook];
  const k2 = ALIAS[key];
  return own?.[key] ?? page?.[key] ?? SHARED[key] ?? (k2 ? own?.[k2] ?? page?.[k2] ?? SHARED[k2] : undefined) ??
    findAnywhere(key) ?? (k2 ? findAnywhere(k2) : undefined) ?? works;
}

function findAnywhere(key: string): Prop | undefined {
  for (const lib of Object.values(LIBS)) if (lib[key]) return lib[key];
  return undefined;
}

/** Landscape washes that move with pressure: [foliage/hills, water]. */
export function washFor(look: string, pf: number, clear: number): [string, string] | null {
  const t = Math.max(0, Math.min(1, pf));
  switch (look) {
    case 'ledger': return [mix(mix('#a8bd7c', '#9a8c6c', t), '#9fc07a', clear * 0.7), mix(mix('#a3bcc4', '#8f8a74', t), '#9cc0cc', clear * 0.6)];
    case 'chrome': return [mix('#8fb58f', '#a7a27f', t), mix('#86bccb', '#9a9a86', t)];
    case 'gaslight': return [mix('#14203d', '#221f22', t), mix('#22325c', '#2a2a30', t)];
    default: return null;
  }
}
