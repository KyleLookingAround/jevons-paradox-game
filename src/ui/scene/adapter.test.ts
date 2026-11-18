// @ts-ignore bun:test types are not in the project tsconfig (types: [])
import { describe, expect, test } from 'bun:test';
import { sceneViewFrom, machineStage } from './adapter';
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
});
