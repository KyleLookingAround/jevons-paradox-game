// M4 scene lane: the adapter's new fields (absent without the M4 core), the honest-sea rule, the new moments, the two
// new layouts against the content's icons, a DOM-free node bound, postcards and spots.
// @ts-ignore bun:test types are not in the project tsconfig (types: [])
import { describe, expect, test } from 'bun:test';
import { sceneViewFrom, compactView } from './adapter';
import { MomentDesk } from './moments';
import { layoutFor, hasLayout, propFor } from './registry';
import { depthScale } from './layout';
import { postcard, postcardKey } from './postcard';
import { spot, SPOT_OF } from './spots';
import { figureArt } from './props/figures';
import { hash, rng } from './svg';
import type { Content, GameState, Derived } from '../../types';
import type { SceneView } from './types';
import { iron as ironContent } from '../../content/sectors/iron';
import { fishing as fishingContent } from '../../content/sectors/fishing';

const content = {
  sectors: {
    steam: { id: 'steam', name: 'Steam', applications: [{ id: 'steam.rail', icon: 'train', foundCost: 0 }], resourceKind: 'stock' },
    iron: {
      id: 'iron', name: 'Iron & Steel', resourceKind: 'stock', resourceStock: 'steam',
      applications: [
        { id: 'iron.wire', icon: 'wire', foundCost: 0 },
        { id: 'iron.rails', icon: 'rails', foundCost: 1, feeds: [{ sector: 'steam', capCostMul: 0.85 }] },
        { id: 'iron.machineTools', icon: 'lathe', foundCost: 1, feeds: [{ sector: '*', capCostMul: 0.92 }] },
      ],
    },
    fishing: { id: 'fishing', name: 'Fishing', resourceKind: 'renewable', applications: [{ id: 'fishing.freshFish', icon: 'fishTrain', foundCost: 0 }] },
  },
  sectorOrder: ['steam', 'iron', 'fishing'],
  ages: [{ id: 'coal', sectors: ['steam', 'iron', 'fishing'], theme: 'ledger' }],
  upgrades: [],
  levers: [{ id: 'fishing.surveyQuota', sector: 'fishing', kind: 'quota', name: 'Quota', levels: [{ value: 0.9 }, { value: 0.6 }, { value: 0 }] }],
} as unknown as Content;

const state = (x: Record<string, unknown> = {}) => ({
  capital: 0, population: 1, upgrades: {}, levers: {}, run: { steadySectors: {} },
  sectors: {
    steam: { open: true, apps: { 'steam.rail': { founded: true } } },
    iron: { open: true, apps: { 'iron.wire': { founded: true }, 'iron.rails': { founded: true }, 'iron.machineTools': { founded: false } } },
    fishing: { open: true, apps: {} },
  },
  ...x,
}) as unknown as GameState;

describe('M4 adapter fields', () => {
  test('absent without the M4 core: an M3 host draws the M3 picture', () => {
    const plain = { sectors: { steam: content.sectors.steam }, sectorOrder: ['steam'], ages: [], upgrades: [], levers: [] } as unknown as Content;
    const v = sceneViewFrom(plain, state(), { sectors: { steam: { reserveFraction: 0.5 } } } as unknown as Derived, 'steam');
    for (const k of ['feeds', 'fedBy', 'stock', 'capstoned', 'preview'] as const) expect(v[k]).toBeUndefined();
  });
  test('fedBy: founded feeding applications of another Industry, by the content (or the core when it reports)', () => {
    const d = { sectors: { iron: { apps: { 'iron.rails': { founded: true, adoption: 0.6 } } } } } as unknown as Derived;
    const v = sceneViewFrom(content, state(), d, 'steam');
    expect(v.fedBy).toEqual([{ from: 'iron', app: 'iron.rails', share: 0.6 }]);
    // The core's AppDerived.feeds is authoritative: a feeding app whose feeds do not name this Industry feeds nothing here.
    const d2 = { sectors: { iron: { apps: { 'iron.rails': { founded: true, adoption: 0.6, feeds: { light: 0.9 } } } } } } as unknown as Derived;
    expect(sceneViewFrom(content, state(), d2, 'steam').fedBy).toBeUndefined();
    // Iron itself is not fed by its own applications.
    expect(sceneViewFrom(content, state(), d, 'iron').fedBy).toBeUndefined();
  });
  test('feeds (the order book) on Iron; Iron shows the seams of the reserve it draws on', () => {
    const d = { sectors: { iron: { feeds: [{ to: 'steam', factor: 0.873, rAdded: 3, lineShare: null }] }, steam: { seams: { sunk: 1, total: 3, ladder: [{}, { reachable: true }, {}] } } } } as unknown as Derived;
    const v = sceneViewFrom(content, state(), d, 'iron');
    expect(v.feeds).toEqual([{ to: 'steam', factor: 0.87 }]);
    expect(v.seams).toEqual({ sunk: 1, total: 3, next: true });
  });
  test('the stock: the world reads the truth (stock.world), the chart the report; a quota at nought is a moratorium', () => {
    const d = { sectors: { fishing: { stock: { reported: 0.7, true: null, surveyed: false, regen: null, foreign: { share: 0.31, R: 2 }, scar: null, crossed: false, reportedPressureFraction: 0.3, world: 0.304 } } } } as unknown as Derived;
    const v = sceneViewFrom(content, state({ levers: { 'fishing.surveyQuota': { level: 3 } } }), d, 'fishing');
    expect(v.stock).toEqual({ reported: 0.7, truth: 0.3, surveyed: false, foreign: 0.31, scar: false, crossed: false, moratorium: true });
    const v2 = sceneViewFrom(content, state({ levers: { 'fishing.surveyQuota': { level: 2 } } }), d, 'fishing');
    expect(v2.stock!.moratorium).toBe(false);
    // Recorded views keep the stock (it is part of the picture).
    expect(compactView(v).stock).toEqual(v.stock);
  });
  test('capstoned and preview', () => {
    const d = { sectors: { steam: { capstoned: true, arrears: true, settled: true, preview: true } } } as unknown as Derived;
    const v = sceneViewFrom(content, state({ meta: { world: { capstone: { steam: { act: 'actOne', year: 1911.6 } } } } }), d, 'steam');
    expect(v.capstoned).toEqual({ year: 1911, arrears: true });
    expect(v.preview).toBe(true);
  });
});

const view = (x: Partial<SceneView> = {}): SceneView => ({
  sectorId: 'fishing', sectorName: 'Fishing', look: 'ledger', serviceName: 's', serviceUnit: 'u', resourceName: 'r', pressureName: 'p',
  crisisName: 'A Poor Season', resourceKind: 'stock', apps: [], stage: 0, etaFold: 1, rFold: 1, pace: 0, reserveFraction: 1, pressureFraction: 0,
  nextCrisisFraction: null, population: 1, popFraction: 0, crises: 0, levers: [], decoupling: false, steadyProgress: 0, steady: false, reckoning: null, year: null, ...x,
});
const stock = (x = {}) => ({ reported: 0.8, truth: 0.4, surveyed: false, foreign: 0.2, scar: false, crossed: false, moratorium: false, ...x });

describe('M4 moments', () => {
  test('from events: the Board\'s survey (label reveal) drains the chart; threshold, scar healed, capstoned, arrears', () => {
    const d = new MomentDesk();
    d.take(view({ events: [] }), 0);
    const m = d.take(view({ stock: stock({ surveyed: true }), events: [{ seq: 1, kind: 'surveyed', sector: 'fishing', first: true, label: 'reveal' },
      { seq: 2, kind: 'thresholdCrossed', sector: 'fishing' }, { seq: 3, kind: 'scarHealed', sector: 'fishing' }, { seq: 4, kind: 'capstoned', sector: 'fishing', id: 'actOne' },
      { seq: 5, kind: 'arrears', sector: 'fishing' }] }), 10);
    expect(m.map((x) => x.kind)).toEqual(['surveyed', 'threshold', 'scarHealed', 'capstoned', 'arrears']);
    expect(m[0].text).toBe('reveal');
    // A later survey (a lever, a letter) puts the vessel out without the reveal.
    expect(d.take(view({ events: [{ seq: 6, kind: 'surveyed', sector: 'fishing' }] }), 20)[0].text).toBeUndefined();
  });
  test('without events, by comparing views', () => {
    const d = new MomentDesk();
    d.take(view({ stock: stock({ scar: true }) }), 0);
    const m = d.take(view({ stock: stock({ surveyed: true, crossed: true }), capstoned: { year: 1911, arrears: true } }), 10);
    expect(m.map((x) => x.kind).sort()).toEqual(['arrears', 'capstoned', 'scarHealed', 'surveyed', 'threshold']);
  });
});

describe('M4 layouts', () => {
  test('Iron and Fishing have their own plates in their styles, and a place for every application the content writes', () => {
    for (const [id, look, c] of [['iron', 'foundry', ironContent], ['fishing', 'harbour', fishingContent]] as const) {
      expect(hasLayout(id)).toBe(true);
      const l = layoutFor(id, 6);
      expect(l.look).toBe(look);
      const apps = (c as unknown as { def: { applications: { id: string; icon: string }[] } }).def.applications;
      expect(apps.length).toBeGreaterThan(4);
      for (const a of apps) expect(l.plots.some((p) => (p.driver ?? 'app') === 'app' && (p.match ?? []).includes(a.icon))).toBe(true);
    }
  });
  test('each is at most 1,900 SVG elements at its busiest (DOM-free upper bound: every slot of every plot drawn)', () => {
    for (const id of ['iron', 'fishing', 'steam']) {
      const l = layoutFor(id, 6);
      let n = 0;
      const count = (s: string) => (s.match(/<(path|rect|circle|ellipse|g|text|line|polygon|use)\b/g) ?? []).length;
      for (const stage of [0, 3]) {
        const c = { u: (x: string) => `url(#t${x})`, hatch: () => 'url(#th0)', r: rng(1), stage, seams: 4 };
        const bd = l.backdrop(c);
        let m = count((bd.sky ?? '') + (bd.far ?? '') + (bd.mid ?? '') + (bd.near ?? '') + (bd.cut ?? ''));
        for (const p of l.plots) {
          for (const sl of [...(p.anchor ? [p.anchor, p.anchor] : []), ...p.slots]) {
            const s = sl.s ?? depthScale(l, sl.y);
            const out = propFor(l.look, 'ledger', sl.p)({ s, v: sl.v ?? 0.5, stage, w: sl.w ?? 0, h: sl.h ?? 0, r: rng(hash(sl.p)), u: c.u, hatch: () => '', overlay: false }, { fx: () => {} });
            m += count(out) + 2;
          }
        }
        n = Math.max(n, m);
      }
      if (id !== 'steam') expect(n).toBeLessThanOrEqual(1900);
    }
  });
  test('the new cast have figures in every style', () => {
    for (const k of ['pryceElder', 'skipper', 'naturalist']) for (const look of ['foundry', 'harbour', 'ledger', 'chrome', 'cyberpunk']) expect(figureArt(k, look)).not.toBeNull();
  });
});

describe('M4 postcards and spots', () => {
  test('a postcard is a small static SVG with the tab\'s marks', () => {
    const base = view({ sectorId: 'iron', apps: [{ id: 'iron.rails', name: 'Rails', icon: 'rails', blurb: '', status: 'founded', adoption: 0.5, demand: 1, foundCost: 0, canFound: false, affordFraction: 1, visibleBelow: null }] });
    const plain = postcard(base);
    expect(plain.startsWith('<svg')).toBe(true);
    expect(plain).toContain('data-look="foundry"');
    expect(plain).not.toContain('<style');
    const marked = postcard({ ...base, settled: true, capstoned: { year: 1911, arrears: false }, preview: true }, { standalone: true });
    expect(marked).toContain('Settled 1911');
    expect(marked).toContain('<style');
    expect(marked.length).toBeLessThan(60_000);
    expect(postcard({ ...base, pressureFraction: 0.9 })).toContain('var(--bad');
    expect(postcardKey(base)).not.toBe(postcardKey({ ...base, preview: true }));
    expect(postcardKey(base)).toBe(postcardKey({ ...base, pressureFraction: 0.01 }));
  });
  test('the six new headline keys have spots', () => {
    for (const k of ['threshold', 'scarHealed', 'surveyed', 'arrears', 'foreignFleets', 'actEnding']) {
      expect(SPOT_OF[k]).toBeDefined();
      expect(spot(k, 'ledger')).toContain('<svg');
    }
  });
});
