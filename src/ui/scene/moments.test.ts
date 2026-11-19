// @ts-ignore bun:test types are not in the project tsconfig (types: [])
import { describe, expect, test } from 'bun:test';
import { MomentDesk } from './moments';
import type { SceneView } from './types';

const view = (sectorId: string, x: Partial<SceneView> = {}): SceneView => ({
  sectorId, sectorName: sectorId, look: 'ledger', serviceName: 's', serviceUnit: 'u', resourceName: 'r', pressureName: 'p',
  crisisName: sectorId === 'steam' ? 'The Black Fog' : 'The Pea-Souper', resourceKind: 'stock', apps: [], stage: 0, etaFold: 1, rFold: 1,
  pace: 0, reserveFraction: 1, pressureFraction: 0, nextCrisisFraction: null, population: 1, popFraction: 0, crises: 0, levers: [],
  decoupling: false, steadyProgress: 0, steady: false, reckoning: null, year: null, ...x,
});

describe('MomentDesk', () => {
  test('crisis state is per Industry: the fog and its name clear on a switch (the "Black Fog stays" bug)', () => {
    const d = new MomentDesk();
    d.take(view('steam', { events: [] }), 0);
    const m = d.take(view('steam', { events: [{ seq: 4, kind: 'crisis', sector: 'steam', n: 1 }] }), 1000);
    expect(m.map((x) => x.kind)).toEqual(['crisis']);
    expect(d.captionNow(1500)).toBe('The Black Fog');
    expect(d.crisisActive(1500)).toBe(true);
    d.setSector('light');
    expect(d.captionNow(1600)).toBeNull();
    expect(d.crisisActive(1600)).toBe(false);
    // Light's own view brings nothing back, and returning to Steam does not replay the old crisis.
    expect(d.take(view('light', { events: [] }), 1700)).toEqual([]);
    expect(d.captionNow(1700)).toBeNull();
    expect(d.take(view('steam', { crises: 1, events: [{ seq: 4, kind: 'crisis', sector: 'steam', n: 1 }] }), 1800)).toEqual([]);
    expect(d.captionNow(1800)).toBeNull();
  });

  test('a view of another Industry also switches (hosts that forget setSector)', () => {
    const d = new MomentDesk();
    d.take(view('steam', { events: [{ seq: 1, kind: 'crisis', sector: 'steam' }] }), 0);
    expect(d.captionNow(10)).toBe('The Black Fog');
    d.take(view('light', { events: [] }), 20);
    expect(d.captionNow(30)).toBeNull();
    expect(d.crisisActive(30)).toBe(false);
  });

  test('each event plays once; other sectors\' events are ignored; seqs are global', () => {
    const d = new MomentDesk();
    const evs = [
      { seq: 10, kind: 'appFounded', sector: 'steam', id: 'a', by: 'market' },
      { seq: 11, kind: 'upgradeBought', sector: 'steam', id: 'u', by: 'market' },
      { seq: 12, kind: 'upgradeBought', sector: 'steam', id: 'v', by: 'player' },
      { seq: 13, kind: 'stageReached', sector: 'steam', n: 2 },
      { seq: 14, kind: 'crisis', sector: 'light' },
      { seq: 15, kind: 'backfire', sector: 'steam' },
      { seq: 16, kind: 'decade', sector: 'steam', n: 1, id: 'full' },
      { seq: 17, kind: 'leverEnacted', sector: 'steam', id: 'steam.duty', n: 1 },
      { seq: 18, kind: 'settled', sector: 'steam' },
      { seq: 19, kind: 'commonsBuilt', sector: 'steam', id: 'baths', n: 1 },
      { seq: 20, kind: 'ageBegins', sector: 'steam', id: 'coal' },
    ];
    const m = d.take(view('steam', { events: evs, settledYear: 1841 }), 0);
    expect(m.map((x) => x.kind)).toEqual(['found', 'scaffold', 'stage', 'backfire', 'decade', 'lever', 'settled', 'commons', 'opened']);
    expect(m[0].by).toBe('market');
    expect(d.captionNow(10)).toBe('Settled, 1841.');
    expect(d.take(view('steam', { events: evs }), 100)).toEqual([]);
    expect(d.maxSeq).toBe(20);
  });

  test('quiet (replay, still): remembers, plays nothing', () => {
    const d = new MomentDesk();
    expect(d.take(view('steam', { events: [{ seq: 3, kind: 'crisis', sector: 'steam' }] }), 0, true)).toEqual([]);
    expect(d.captionNow(1)).toBeNull();
    expect(d.take(view('steam', { events: [{ seq: 3, kind: 'crisis', sector: 'steam' }] }), 2)).toEqual([]);
  });

  test('without events (demo, M1 host): falls back to comparing views of the same Industry', () => {
    const d = new MomentDesk();
    const apps = (s: 'hidden' | 'available' | 'founded') => [{ id: 'm', name: 'Mills', icon: 'mill', blurb: '', status: s, adoption: 0, demand: 0, foundCost: 0, canFound: false, affordFraction: 0, visibleBelow: null }];
    expect(d.take(view('steam', { apps: apps('available') }), 0)).toEqual([]);
    expect(d.take(view('steam', { apps: apps('founded'), crises: 1 }), 10).map((x) => x.kind).sort()).toEqual(['crisis', 'found']);
    // First sight of another Industry plays nothing, even with crises already fired.
    expect(d.take(view('light', { crises: 3 }), 20)).toEqual([]);
  });
});
