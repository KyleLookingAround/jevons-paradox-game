// M2 mechanism tests (13–14 of briefs/m2-core.md): events and the new views.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { EVENTS_MAX, STEADY_STATE_YEARS, YEARS_PER_SECOND } from '../types';
import type { Content, GameState, MetaState } from '../types';
import { model } from './index';
import { fixture as C } from './fixture';
import { freshMeta } from './state';
import { CALM, D, decoupling, greedy, openAll, patchSector, rich, run, steamAt, steamD } from './m1.testkit';

const kinds = (s: GameState) => new Set(s.events.map((e) => e.kind));
const increasing = (s: GameState) => s.events.every((e, i, a) => i === 0 || e.seq > a[i - 1].seq) && (s.events.at(-1)?.seq ?? 0) <= s.meta.eventSeq;

describe('M2 events', () => {
  test('seq strictly increases across a Reckoning and every rebuild; the list keeps EVENTS_MAX', () => {
    let s = { ...model.createState(C), capital: 1e5 };
    for (let i = 0; i < 20; i++) s = model.tick(greedy(s, C), C, 1);
    const seq0 = s.meta.eventSeq;
    expect(seq0).toBeGreaterThan(3);
    expect(increasing(s)).toBe(true);
    let r = model.reckon(s, C);
    expect(r.events.length).toBe(1);
    expect(r.events[0]).toMatchObject({ kind: 'reckoning', id: 'chosen', seq: seq0 + 1 });
    r = model.buyKnowhow({ ...r, meta: { ...r.meta, hindsight: 100 } }, C, 'kh.seed');
    r = model.chooseCharter(r, C, r.charterOffer[0]);
    expect(r.events.map((e) => e.seq)).toEqual([seq0 + 1, seq0 + 2]);
    r = run(r, 5);
    expect(increasing(r)).toBe(true);
    // the trim
    let t = rich(run(steamAt(1), 2));
    for (let i = 0; i < 60; i++) { t = model.setLever(t, C, 'steam.circularity', 1); t = model.setLever(t, C, 'steam.circularity', 0); }
    expect(t.events.length).toBe(EVENTS_MAX);
    expect(t.events.at(-1)!.seq).toBe(t.meta.eventSeq);
    expect(increasing(t)).toBe(true);
  });
  test('each required kind fires in a constructed case', () => {
    // appFounded, stageReached, upgradeBought (player), leverEnacted, crisis
    let s = { ...model.createState(C), capital: 1e5 };
    s = model.buyUpgrade(s, C, 'steam.boilers');
    s = model.tick(s, C, 1);
    s = model.foundApp(s, C, 'steam.mills');
    s = model.buyUpgrade(s, C, 'steam.condenser');
    expect(s.events.find((e) => e.kind === 'stageReached')).toMatchObject({ sector: 'steam', n: 1, id: 'steam.condenser' });
    expect(s.events.find((e) => e.kind === 'appFounded' && e.id === 'steam.mills')).toMatchObject({ by: 'player' });
    s = model.setLever(rich(s), C, 'steam.duty', 1);
    expect(s.events.find((e) => e.kind === 'leverEnacted')).toMatchObject({ id: 'steam.duty', n: 1, by: 'player' });
    expect(s.events.find((e) => e.kind === 'budgetDrawn')).toMatchObject({ by: 'player' });
    const c = model.tick(patchSector(s, 'steam', { pressure: 41 }), C, 1);
    expect(c.events.find((e) => e.kind === 'crisis')).toMatchObject({ sector: 'steam', n: 1 });
    // decade, clearSkies, steadyState, settled
    let d = decoupling();
    d = patchSector(d, 'steam', { steadyYears: 9.99 });
    d = model.tick(d, CALM, 1);
    expect(kinds(d).has('decade')).toBe(true);
    expect(kinds(d).has('clearSkies')).toBe(true);
    d = patchSector(d, 'steam', { clearYears: STEADY_STATE_YEARS - 0.01 });
    d = model.tick(d, CALM, 1);
    expect(kinds(d).has('steadyState')).toBe(true);
    d = model.settle({ ...d, mandate: 100 }, CALM, 'steam');
    expect(d.events.at(-1)).toMatchObject({ kind: 'settled', sector: 'steam', by: 'player' });
    // sectorOpened, ageBegins
    const o = openAll();
    expect(o.events.some((e) => e.kind === 'sectorOpened' && e.sector === 'light') || o.meta.eventSeq > 0).toBe(true);
    let m = { ...model.createState(C, { ...freshMeta(C), reckonings: 9 }), capital: 1e15 };
    const seen = new Set<string>();
    for (let i = 0; i < 400 && !m.sectors.code.open; i++) {
      m = model.tick(greedy(m, C), C, 1);
      for (const e of m.events) seen.add(`${e.kind}:${e.sector ?? ''}:${e.id ?? ''}`);
    }
    expect(seen.has('sectorOpened:light:')).toBe(true);
    expect(seen.has('ageBegins:motion:acceleration')).toBe(true);
    expect(seen.has('ageBegins:light:coal')).toBe(false);
  });
  test('upgradeBought by market', () => {
    const MKT: Content = {
      ...C, upgrades: C.upgrades.map((u) => (u.sector === 'steam' && u.kind === 'efficiency' && !u.excludes
        ? { ...u, effects: [...u.effects, { type: 'marginAdd' as const, sector: 'steam', value: 0.05 }] } : u)),
    };
    let s = model.createState(MKT, { ...freshMeta(MKT), reckonings: 1 } as MetaState, 3);
    s = model.tick(model.buyUpgrade({ ...s, capital: 1e3 }, MKT, 'steam.boilers'), MKT, 0.5);
    s = model.setOrders({ ...s, capital: 1e7 }, MKT, { market: { paybackMax: 86400 } });
    s = run(s, 100, MKT);
    expect(s.events.some((e) => e.kind === 'upgradeBought' && e.by === 'market')).toBe(true);
  });
  test('serialize → deserialize keeps eventSeq and the list (nothing replays)', () => {
    let s = { ...model.createState(C), capital: 1e5 };
    for (let i = 0; i < 10; i++) s = model.tick(greedy(s, C), C, 1);
    const b = model.deserialize(model.serialize(s), C)!;
    expect(b.meta.eventSeq).toBe(s.meta.eventSeq);
    expect(b.events).toEqual(s.events);
    const lastSeen = b.meta.eventSeq;
    const n = model.tick(b, C, 1);
    expect(n.events.filter((e) => e.seq > lastSeen).every((e) => e.time > b.time)).toBe(true);
  });
});

describe('M2 views', () => {
  test('yearAt: now = Derived.year; before a sector opened it is ignored; standingDrawIn; stage; populationRef', () => {
    let m = { ...model.createState(C, { ...freshMeta(C), reckonings: 9 }), capital: 1e15 };
    let lightAt = -1;
    for (let i = 0; i < 400 && lightAt < 0; i++) { m = model.tick(greedy(m, C), C, 1); if (m.sectors.light.open) lightAt = m.time - m.sectors.light.openFor; }
    m = run(m, 10);
    expect(model.yearAt(m, C, m.time)).toBeCloseTo(D(m).year, 9);
    expect(model.yearAt(m, C, lightAt - 1)).toBeCloseTo(1780 + (lightAt - 1) * YEARS_PER_SECOND, 9);
    expect(model.yearAt(m, C, -5)).toBeCloseTo(1780, 9);
    expect(D(m).sectors.light!.stage).toBeNull();
    expect(D(m).populationRef).toBeGreaterThanOrEqual(m.population);
    const s0 = model.createState(C);
    expect(D(s0).sectors.steam!.stage).toBe(0);
    // standingDrawIn
    const DRAW: Content = { ...C, global: { ...C.global, steady: { ...C.global.steady!, standingDrawYears: 2 } } };
    const meta = { ...freshMeta(DRAW), institutions: { 'inst.capStanding': 1 }, loadout: ['inst.capStanding'] };
    let s = model.createState(DRAW, meta);
    expect(D(s, DRAW).sectors.steam!.standingDrawIn).toBeCloseTo(2, 9);
    s = run(s, 20, DRAW);
    expect(D(s, DRAW).sectors.steam!.standingDrawIn).toBeCloseTo(1, 9);
    s = run(s, 22, DRAW);
    expect(s.sectors.steam.budget).not.toBeNull();
    expect(D(s, DRAW).sectors.steam!.standingDrawIn).toBeNull();
    expect(D(model.createState(C)).sectors.steam!.standingDrawIn).toBeNull();
  });
  test('recycleChoices: wording resolved with its fallbacks and availability', () => {
    const s = rich(run(steamAt(1), 2));
    const v = model.leverViews(s, C).find((l) => l.def.id === 'steam.duty')!;
    expect(v.recycleChoices).toEqual([
      { option: 'treasury', name: 'Treasury', blurb: 'Revenue for the state.', available: true },
      { option: 'dividend', name: 'Dividend', blurb: 'Paid back per head; more people follow.', available: true },
      { option: 'commons', name: 'Commons', blurb: '', available: false },
    ]);
    expect(model.leverViews(s, C).find((l) => l.def.id === 'steam.sufficiency')!.recycleChoices).toEqual([]);
    void steamD;
  });
});
