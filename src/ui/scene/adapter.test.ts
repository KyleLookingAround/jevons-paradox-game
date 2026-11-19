// @ts-ignore bun:test types are not in the project tsconfig (types: [])
import { describe, expect, test } from 'bun:test';
import { sceneViewFrom, machineStage, sceneEvents, compactView, viewFromSummary } from './adapter';
import type { Content, GameState, Derived } from '../../types';

const content = {
  sectors: {
    steam: {
      id: 'steam', name: 'Steam', service: { name: 'Motive power', unit: 'hp' }, resource: { name: 'Coal', unit: 't' },
      pressure: { name: 'Smog', crisisName: 'The Black Fog' }, resourceKind: 'stock', autoEtaRate: 0,
      applications: [
        { id: 'steam.pumping', name: 'Mine pumping', blurb: 'b', icon: 'pump', visibleBelow: Infinity, foundCost: 0 },
        { id: 'steam.mills', name: 'Cotton mills', blurb: 'b', icon: 'mill', visibleBelow: 0.6, foundCost: 60 },
      ],
    },
  },
  sectorOrder: ['steam'],
  ages: [{ id: 'coal', name: 'The Coal Age', tagline: '', yearSpan: [1780, 1914], theme: 'ledger', sectors: ['steam'] }],
  upgrades: [
    { id: 'u1', sector: 'steam', kind: 'efficiency' }, { id: 'u2', sector: 'steam', kind: 'efficiency' },
    { id: 'u3', sector: 'steam', kind: 'capital' },
  ],
  levers: [{ id: 'steam.duty', sector: 'steam', kind: 'duty', name: 'Fuel duty', levels: [] }],
} as unknown as Content;

describe('sceneViewFrom', () => {
  test('is total: garbage in, a valid view out', () => {
    for (const c of [{}, null, undefined, { sectors: {} }] as unknown as Content[]) {
      const v = sceneViewFrom(c, {} as GameState, null, 'nope');
      expect(v.apps).toEqual([]);
      expect(v.reserveFraction).toBe(1);
      expect(v.stage).toBe(0);
      expect(Number.isFinite(v.pace)).toBe(true);
    }
  });

  test('maps the contract', () => {
    const state = {
      capital: 30, population: 4, upgrades: { u1: 1 }, levers: { 'steam.duty': { level: 2, ref: 0 } },
      sectors: { steam: { crisesFired: 1, apps: {} } }, run: { steadySectors: {} },
    } as unknown as GameState;
    const derived = {
      year: 1801.6, pendingReckoning: null,
      sectors: { steam: {
        etaFold: 2.5, rFold: 4, reserveFraction: 0.7, pressureFraction: 0.3, nextCrisisFraction: 0.65, decoupling: false, steadyYears: 0,
        apps: { 'steam.pumping': { available: true, founded: true, adoption: 0.8, demand: 12, canFound: false },
          'steam.mills': { available: true, founded: false, adoption: 0, demand: 0, canFound: false } },
      } },
    } as unknown as Derived;
    const v = sceneViewFrom(content, state, derived, 'steam');
    expect(v.look).toBe('ledger');
    expect(v.apps.map((a) => a.status)).toEqual(['founded', 'available']);
    expect(v.apps[1].affordFraction).toBeCloseTo(0.5);
    expect(v.apps[0].visibleBelow).toBeNull();
    expect(v.stage).toBe(2); // 1 of 2 efficiency upgrades owned
    expect(v.pace).toBeCloseTo(0.5);
    expect(v.levers).toEqual([{ id: 'steam.duty', kind: 'duty', level: 2, name: 'Fuel duty' }]);
    expect(v.crises).toBe(1);
    expect(v.year).toBe(1801);
  });

  test('machine stage', () => {
    expect(machineStage(0, 7, 1, false)).toBe(0);
    expect(machineStage(2, 7, 1, false)).toBe(1);
    expect(machineStage(4, 7, 1, false)).toBe(2);
    expect(machineStage(7, 7, 1, false)).toBe(3);
    expect(machineStage(0, 5, 70, true)).toBe(3);
  });

  describe('M2 fields', () => {
    const c2 = {
      ...(content as object),
      sectors: { steam: { ...(content as any).sectors.steam, collapseAt: 100 }, light: { id: 'light', name: 'Light', applications: [] } },
      commons: [
        { id: 'baths', name: 'Public baths', icon: 'baths', sector: 'steam' },
        { id: 'lib', name: 'Free library', icon: 'library', sector: 'light' },
        { id: 'park', name: 'The park', icon: 'park', sector: 'steam' },
        { id: 'hols', name: 'Bank holidays', icon: 'holiday' },
      ],
      charters: [{ id: 'north', name: 'North', sector: 'steam', landmark: 'pithead-baths', effects: [] }],
    } as unknown as Content;
    const st = (x: object = {}) => ({ capital: 0, population: 50, upgrades: {}, levers: {}, sectors: { steam: { apps: {}, crisesFired: 0 } }, run: { steadySectors: {} }, ...x }) as unknown as GameState;
    const dv = (sd: object = {}, x: object = {}) => ({ year: 1820, pendingReckoning: null, populationRef: 200, sectors: { steam: { pressureFraction: 0.5, apps: {}, ...sd } }, ...x }) as unknown as Derived;

    test('stage: the contract wins, clamped; null falls back to the share owned', () => {
      expect(sceneViewFrom(c2, st({ upgrades: { u1: 1 } }), dv({ stage: 7 }), 'steam').stage).toBe(3);
      expect(sceneViewFrom(c2, st({ upgrades: { u1: 1 } }), dv({ stage: 0 }), 'steam').stage).toBe(0);
      expect(sceneViewFrom(c2, st({ upgrades: { u1: 1 } }), dv({ stage: null }), 'steam').stage).toBe(2);
    });

    test('popFraction against populationRef', () => {
      expect(sceneViewFrom(c2, st({ population: 200 }), dv(), 'steam').popFraction).toBeCloseTo(1);
      const half = sceneViewFrom(c2, st({ population: 100 }), dv(), 'steam').popFraction;
      expect(half).toBeGreaterThan(0.5); expect(half).toBeLessThan(1);
      expect(sceneViewFrom(c2, st({ population: 400 }), dv(), 'steam').popFraction).toBe(1);
      // No reference (an M1 Derived): the M1 log curve.
      expect(sceneViewFrom(c2, st({ population: 12 }), dv({}, { populationRef: undefined }), 'steam').popFraction).toBeCloseTo(1);
    });

    test('clear skies, clear progress, pressure to clear, settled', () => {
      const v = sceneViewFrom(c2, st({ sectors: { steam: { apps: {}, settled: { sinceYear: 1841.7 } } } }), dv({ clear: true, clearP: 20, clearYears: 25, settled: true, pressureFraction: 0.6 }), 'steam');
      expect(v.clear).toBe(true);
      expect(v.clearProgress).toBeCloseTo(25 / 50);
      expect(v.pressureToClear).toBeCloseTo((0.6 - 0.2) / 0.8);
      expect(v.settled).toBe(true);
      expect(v.settledYear).toBe(1841);
      expect(sceneViewFrom(c2, st(), dv({ clearP: 20, pressureFraction: 0.1 }), 'steam').pressureToClear).toBe(0);
      expect(sceneViewFrom(c2, st(), dv({ clearP: null, pressureFraction: 0.4 }), 'steam').pressureToClear).toBeCloseTo(0.4);
    });

    test('commons filtered by sector and level (general ones in every picture); the charter landmark', () => {
      const v = sceneViewFrom(c2, st({ commons: { levels: { baths: 2, lib: 1, park: 0, hols: 1 }, fund: 0 }, meta: { charter: 'north' } }), dv(), 'steam');
      expect(v.commons).toEqual([{ id: 'baths', icon: 'baths', level: 2, name: 'Public baths' }, { id: 'hols', icon: 'holiday', level: 1, name: 'Bank holidays' }]);
      expect(v.landmark).toBe('pithead-baths');
      const l = sceneViewFrom(c2, st({ commons: { levels: { baths: 2, lib: 1 }, fund: 0 }, meta: { charter: 'north' } }), dv(), 'light');
      expect(l.commons?.map((x) => x.id)).toEqual(['lib']);
      expect(l.landmark).toBeNull();
    });

    test('events filtered by sector, sector-less ones kept when they matter, in seq order', () => {
      const evs = [
        { seq: 9, kind: 'crisis', sector: 'steam', n: 1, time: 0, year: 0 },
        { seq: 7, kind: 'appFounded', sector: 'steam', id: 'steam.mills', by: 'market', time: 0, year: 0 },
        { seq: 8, kind: 'crisis', sector: 'light', n: 1, time: 0, year: 0 },
        { seq: 10, kind: 'reckoning', id: 'collapse', time: 0, year: 0 },
        { seq: 11, kind: 'charterChosen', id: 'north', time: 0, year: 0 },
      ] as any;
      const v = sceneViewFrom(c2, st(), dv(), 'steam', evs);
      expect(v.events?.map((e) => e.seq)).toEqual([7, 9, 10, 11]);
      expect(v.events?.[0]).toEqual({ seq: 7, kind: 'appFounded', sector: 'steam', id: 'steam.mills', by: 'market' });
      expect(sceneEvents(null, 'steam')).toEqual([]);
      expect(sceneViewFrom(c2, st(), dv(), 'steam').events).toEqual([]);
    });

    test('an M1 state and Derived give the M1 picture', () => {
      const v = sceneViewFrom(content, { capital: 0, population: 4, upgrades: {}, levers: {}, sectors: { steam: { apps: {} } }, run: { steadySectors: {} } } as unknown as GameState,
        { year: 1800, pendingReckoning: null, sectors: { steam: { pressureFraction: 0.3, apps: {} } } } as unknown as Derived, 'steam');
      expect(v.clear).toBe(false);
      expect(v.settled).toBe(false);
      expect(v.commons).toEqual([]);
      expect(v.landmark).toBeNull();
      expect(v.pressureToClear).toBeCloseTo(0.3);
      expect(v.popFraction).toBeCloseTo(Math.log(4) / Math.log(12));
    });
  });
});

// Coverage: every Commons icon and Charter landmark the content writes has a drawing of its own (no generic fallback).
import { propFor } from './registry';
import { works } from './props/common';
import { COMMONS_ICONS, LANDMARKS } from './props/civic';
import { content as realContent } from '../../content/index';
describe('civic coverage', () => {
  const looks = ['ledger', 'gaslight', 'chrome', 'terminal', 'cyberpunk'];
  test('content keys are all known to the scene', () => {
    const c = realContent as unknown as { commons?: { icon: string }[]; charters?: { landmark?: string }[] };
    for (const x of c.commons ?? []) expect(COMMONS_ICONS).toContain(x.icon);
    for (const x of c.charters ?? []) if (x.landmark) expect(LANDMARKS).toContain(x.landmark);
  });
  test('each has its own prop in every style', () => {
    for (const look of looks) {
      for (const i of COMMONS_ICONS) expect(propFor(look, look, 'commons:' + i)).not.toBe(works);
      for (const k of LANDMARKS) expect(propFor(look, look, 'landmark:' + k)).not.toBe(works);
    }
  });
});

describe('compactView', () => {
  test('keeps the picture, drops the card; small enough to record per Reckoning', () => {
    const v = sceneViewFrom(realContent, { capital: 1e6, population: 40, upgrades: {}, levers: {}, sectors: {}, run: { steadySectors: {} } } as unknown as GameState,
      null, 'steam', [{ seq: 1, kind: 'crisis', sector: 'steam', time: 0, year: 0 }] as never);
    const c = compactView(v);
    expect(c.apps.length).toBe(v.apps.length);
    expect(c.events).toBeUndefined();
    expect(c.apps.every((a) => a.blurb === '')).toBe(true);
    const n = JSON.stringify(c).length;
    expect(n).toBeLessThan(2500);
    console.log('compact SceneView bytes (steam):', n, 'full:', JSON.stringify(v).length);
  });
});

describe('M3 fields', () => {
  const st = (extra: Record<string, unknown> = {}) => ({
    capital: 0, population: 4, upgrades: {}, levers: { 'steam.duty': { level: 1, ref: 0, bite: 0.6 } }, sectors: { steam: { apps: {} } }, run: { steadySectors: {} },
    meta: { flags: {} }, flags: {}, ...extra,
  }) as unknown as GameState;
  const sd = (extra: Record<string, unknown> = {}) => ({
    etaFold: 1, rFold: 1, reserveFraction: 0.5, pressureFraction: 0.2, servicePrice: 1,
    apps: { 'steam.pumping': { founded: true, available: true, adoption: 0.5, demand: 10, priceSeen: 0 }, 'steam.mills': { founded: true, available: true, adoption: 0.5, demand: 10, priceSeen: 1 } },
    seams: { sunk: 1, total: 3, priceMul: 1.4, ladder: [{ sunk: true, reachable: false }, { sunk: false, reachable: true }, { sunk: false, reachable: false }] },
    load: { factor: 0.5, hours: [1, 1, 2, 4, ...Array(20).fill(2)], peak: 4 },
    travel: { speed: 0.5, freeSpeed: 2, sprawl: 3, sprawlShare: 0.3 },
    free: { bill: 3, freeShare: 0.5 },
    ...extra,
  });
  const der = (features: Record<string, boolean> | undefined, extra: Record<string, unknown> = {}) => ({
    year: 1800, pendingReckoning: null, sectors: { steam: sd() }, features,
    dispatch: { pending: [{ def: { sector: 'steam' }, cast: { figure: 'correspondent' } }, { def: { sector: 'light' }, cast: { figure: 'fenwick' } }], nextIn: null },
    survey: { decisionsPerHourBefore: 10, decisionsPerHourAfter: 30 }, ending: { reached: false },
    ...extra,
  }) as unknown as Derived;
  const off = { seams: false, load: false, travel: false, freeAtUse: false, dispatches: false, sideEffects: false, survey: false };

  test('each field appears with its feature', () => {
    const v = sceneViewFrom(content, st({ meta: { flags: { proprietor: true } } }), der(undefined), 'steam');
    expect(v.seams).toEqual({ sunk: 1, total: 3, next: true });
    expect(v.load!.hours.length).toBe(24);
    expect(Math.max(...v.load!.hours)).toBe(1);
    expect(v.load!.factor).toBe(0.5);
    expect(v.travel!.speed).toBe(0.25);
    expect(v.travel!.freeSpeed).toBe(2);
    expect(v.travel!.sprawl).toBeGreaterThanOrEqual(0);
    expect(v.free).toEqual({ apps: ['steam.pumping'] });
    expect(v.figures).toEqual(['correspondent', 'proprietor']);
    expect(v.watch).toBe(0.75);
    expect(v.levers[0].bite).toBe(0.6);
  });

  test('nothing of a gated system shows before it unlocks', () => {
    const v = sceneViewFrom(content, st(), der(off), 'steam');
    for (const k of ['seams', 'load', 'travel', 'free', 'figures', 'watch'] as const) expect(v[k]).toBeUndefined();
    expect(v.levers[0].bite).toBeUndefined();
  });

  test('null views (an M2 core) give the M2 view', () => {
    const d = der(undefined, { sectors: { steam: sd({ seams: null, load: null, travel: null, free: null }) }, dispatch: { pending: [], nextIn: null }, survey: null });
    const v = sceneViewFrom(content, st(), d, 'steam');
    for (const k of ['seams', 'load', 'travel', 'free', 'figures', 'watch'] as const) expect(v[k]).toBeUndefined();
  });

  test('the ending puts the whole cast in the street', () => {
    const c = { ...content, cast: [{ id: 'a', figure: 'whitlow' }, { id: 'b', figure: 'fenwick' }, { id: 'c' }] } as unknown as Content;
    const v = sceneViewFrom(c, st({ flags: { won: true } }), der(undefined, { ending: { reached: true } }), 'steam');
    expect(v.figures).toEqual(['correspondent', 'whitlow', 'fenwick']);
  });

  test('events carry first and label; ending is global', () => {
    const e = sceneEvents([{ seq: 1, kind: 'seamSunk', sector: 'steam', id: 's1', n: 1, label: 'The Barnsley Bed' }, { seq: 2, kind: 'ending', id: 'steadyAll' }, { seq: 3, kind: 'backfire', sector: 'steam', first: true }] as never, 'steam');
    expect(e.map((x) => x.kind)).toEqual(['seamSunk', 'ending', 'backfire']);
    expect(e[0].label).toBe('The Barnsley Bed');
    expect(e[2].first).toBe(true);
  });

  test('viewFromSummary rebuilds the end and the first morning', () => {
    const base = sceneViewFrom(content, st(), der(undefined), 'steam');
    const end = viewFromSummary(base, { cause: 'exhausted', sectors: { steam: { peakAdoption: { 'steam.mills': 0.9 }, peakPressure: 0.8, stage: 3, unburnt: 0.04, seams: 2 } } });
    expect(end.apps.find((a) => a.id === 'steam.mills')!.adoption).toBe(0.9);
    expect(end.apps.find((a) => a.id === 'steam.pumping')!.status).not.toBe('founded');
    expect(end.stage).toBe(3);
    expect(end.reckoning).toEqual({ cause: 'exhausted', here: true });
    expect(end.seams!.sunk).toBe(2);
    const start = viewFromSummary(base, null, true);
    expect(start.apps.filter((a) => a.status === 'founded').length).toBe(1);
    expect(start.reckoning).toBeNull();
    expect(start.seams!.sunk).toBe(0);
  });
});

import { readFileSync } from 'node:fs';
import { SPOT_OF, spot } from './spots';
import { FIGURE_KEYS } from './props/figures';
describe('M3 coverage of content keys', () => {
  test('a spot for every HeadlineKey in the contract', () => {
    const src = readFileSync(new URL('../../types.ts', import.meta.url), 'utf8');
    const m = /export type HeadlineKey =([\s\S]*?)\n\n/.exec(src);
    expect(m).not.toBeNull();
    const keys = [...m![1].replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/'(\w+)'/g)].map((x) => x[1]);
    expect(keys.length).toBeGreaterThan(30);
    for (const k of keys) expect(Object.keys(SPOT_OF)).toContain(k);
    for (const look of ['ledger', 'gaslight', 'chrome', 'terminal', 'cyberpunk']) {
      const s = spot('seamSunk', look);
      expect(s.startsWith('<svg')).toBe(true);
      expect(s).toContain(`data-look="${look}"`);
    }
  });
  test('every cast figure key the content writes has a figure', () => {
    const c = realContent as unknown as { cast?: { id: string; figure?: string }[] };
    for (const x of c.cast ?? []) if (x.figure) expect(FIGURE_KEYS).toContain(x.figure);
  });
});
