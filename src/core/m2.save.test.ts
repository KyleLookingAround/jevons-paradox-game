// M2 tests 15–16 of briefs/m2-core.md: the v2 → v3 migration, the v3 round trip, purity, determinism, no NaN.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { STEADY_STATE_YEARS } from '../types';
import type { Content, GameState } from '../types';
import { model } from './index';
import { fixture as C } from './fixture';
import { drawOffer } from './charters';
import { defaultOrders } from './state';
import { CALM, D, badNumbers, decoupling, greedy, patchSector, rich, run, steamAt, steamD } from './m1.testkit';

/** A v3 state written back in the v2 shape: every field M2 added removed, version 2. */
function toV2(s: GameState): Record<string, unknown> {
  const r = JSON.parse(JSON.stringify(s));
  r.version = 2;
  for (const k of ['pendingDividends', 'commons', 'events', 'lastOffline', 'charterOffer']) delete r[k];
  for (const es of Object.values(r.sectors) as Record<string, any>[]) {
    for (const k of ['clearYears', 'settled', 'settledBefore', 'dividends', 'decadesLean', 'windowLean', 'peakPressure']) delete es[k];
    for (const a of Object.values(es.apps) as Record<string, unknown>[]) delete a.peakAdoption;
    if (es.budget) for (const k of ['w0', 'p0', 'pace', 'clearAt']) delete es.budget[k];
  }
  for (const k of ['leanDecades', 'decisions', 'decisionsByDecade', 'automated', 'automatedByDecade', 'opening', 'firstBudgetAt']) delete r.run[k];
  for (const k of ['charter', 'orders', 'runs', 'opening', 'firstOpening', 'eventSeq', 'knowhowPeak', 'peakPopulationEver']) delete r.meta[k];
  if (r.meta.lastRun) for (const k of ['index', 'totalSecondsAtEnd', 'charter', 'decisions', 'automated', 'decisionsByDecade', 'automatedByDecade', 'commonsLevels', 'peakPopulation']) delete r.meta.lastRun[k];
  return r;
}

describe('M2 save version 3', () => {
  test('a v2 save (a budget, a lastRun, institutions, mid-run) loads with every rule of steps 1–7', () => {
    let s = { ...model.createState(C), capital: 1e5 };
    for (let i = 0; i < 20; i++) s = model.tick(greedy(s, C), C, 1);
    let r = model.reckon(s, C); // a lastRun
    r = model.buyInstitution({ ...r, meta: { ...r.meta, hindsight: 50 } }, C, 'inst.stats');
    r = model.setLoadout(r, C, ['inst.stats']);
    r = model.buyKnowhow({ ...r, meta: { ...r.meta, hindsight: 50 } }, C, 'kh.engines');
    r = { ...r, capital: 1e5 };
    for (let i = 0; i < 30; i++) r = model.tick(greedy(r, C), C, 1);
    r = model.drawBudget(rich(r), C, 'steam', 'severe');
    r = run(r, 210); // a decade or not, and some pressure
    r = { ...r, peakPopulation: 3.5 };
    const raw = toV2(r);
    const b = model.deserialize(JSON.stringify(raw), C)!;
    expect(b).not.toBeNull();
    expect(b.version).toBe(4);
    // 1
    expect(b.pendingDividends).toEqual([]);
    expect(b.commons).toEqual({ levels: {}, fund: 0 });
    expect(b.events).toEqual([]);
    expect(b.lastOffline).toBeNull();
    expect(b.charterOffer).toEqual([]); // mid-run
    // 2
    const es = b.sectors.steam;
    expect(es.clearYears).toBe(0);
    expect(es.settled).toBeNull();
    expect(es.settledBefore).toBe(false);
    expect(es.dividends).toEqual([]);
    expect(es.decadesLean).toEqual(r.sectors.steam.decadesWithin.map(() => false));
    expect(es.windowLean).toBe(false);
    expect(es.peakPressure).toBe(r.sectors.steam.pressure);
    expect(Object.values(es.apps).every((a) => a.peakAdoption === 0)).toBe(true);
    expect(b.sectors.light.clearYears).toBe(0); // closed sectors too
    // 3 and 7
    expect(es.budget!.pace).toBe('gentle'); // the first pace, whatever the v2 line was
    expect(es.budget!.w0).toBeCloseTo(D(b).wellbeing, 9);
    expect(es.budget!.p0).toBe(es.pressure);
    expect(es.budget!.clearAt).toBeUndefined();
    expect(es.budget!.r0).toBe(r.sectors.steam.budget!.r0);
    // 4
    expect(b.run).toMatchObject({ leanDecades: 0, decisions: 0, decisionsByDecade: [], automated: 0, automatedByDecade: [], opening: [], firstBudgetAt: null });
    // 5
    expect(b.meta.charter).toBeNull();
    expect(b.meta.orders).toEqual(defaultOrders(C));
    expect(b.meta.runs.length).toBe(1);
    expect(b.meta.runs[0]).toEqual(b.meta.lastRun!);
    expect(b.meta.lastRun!.index).toBeUndefined();
    expect(b.meta.opening).toBeUndefined();
    expect(b.meta.eventSeq).toBe(0);
    expect(b.meta.knowhowPeak).toEqual(r.meta.knowhow);
    expect(b.meta.peakPopulationEver).toBe(3.5);
    expect(b.meta.institutions).toEqual({ 'inst.stats': 1 });
    expect(b.meta.loadout).toEqual(['inst.stats']);
    expect(badNumbers(D(b))).toEqual([]);
    expect(badNumbers(run(b, 30))).toEqual([]);
  });
  test('step 6: a v2 save between runs gets the offer reckon() would draw', () => {
    const r = model.reckon(run({ ...model.createState(C), capital: 1e4 }, 10), C);
    const raw = toV2(r);
    const b = model.deserialize(JSON.stringify(raw), C)!;
    expect(D(b).freshRun).toBe(true);
    expect(b.charterOffer).toEqual(drawOffer(b, C, undefined));
    expect(b.charterOffer.length).toBe(2);
    // a brand-new v2 game (no Reckoning): no offer
    const n = model.deserialize(JSON.stringify(toV2(model.createState(C))), C)!;
    expect(n.charterOffer).toEqual([]);
  });
  test('a v4 save → null; a v3 round trip with every M2 structure is lossless; unknown ids are dropped', () => {
    let s = decoupling();
    s = patchSector(s, 'steam', { budget: { r0: 10 * steamD(s, CALM).resourceUse, since: s.time, drawnYear: 1800, w0: 1e3, p0: 0, pace: 'firm' }, steadyYears: 9.99 });
    s = model.tick(s, CALM, 1); // a pending dividend
    s = patchSector(s, 'steam', { clearYears: STEADY_STATE_YEARS });
    s = model.settle({ ...s, mandate: 1e3 }, CALM, 'steam');
    s = { ...s, meta: { ...s.meta, reckonings: 2 }, commons: { levels: { 'commons.baths': 2 }, fund: 12 } };
    s = model.setOrders(s, CALM, { market: { sectors: { light: false } }, treasury: { on: true, projects: ['commons.baths'] } });
    s = run(s, 5, CALM);
    expect(s.pendingDividends.length).toBe(1);
    expect(s.sectors.steam.settled).not.toBeNull();
    const text = model.serialize(s);
    const back = model.deserialize(text, CALM)!;
    expect(JSON.parse(model.serialize(back))).toEqual(JSON.parse(text));
    expect(model.deserialize(JSON.stringify({ ...JSON.parse(text), version: 5 }), CALM)).toBeNull();
    // unknown ids
    const raw = JSON.parse(text);
    raw.commons.levels.nope = 3;
    raw.pendingDividends.push({ sector: 'steam', decade: 9, options: ['div.mandate', 'nope'], mul: 1 });
    raw.meta.charter = 'nope';
    raw.events.push({ seq: 1, kind: 'decade', time: 0, year: 1 }); // out of order
    raw.sectors.steam.dividends = ['nope', 'div.capital'];
    const c = model.deserialize(JSON.stringify(raw), CALM)!;
    expect(c.commons.levels).toEqual({ 'commons.baths': 2 });
    expect(c.pendingDividends.length).toBe(1);
    expect(c.meta.charter).toBeNull();
    expect(c.events).toEqual(s.events);
    expect(c.sectors.steam.dividends).toEqual(['div.capital']);
  });
});

/* ---------------- 16. purity, determinism, no NaN ---------------- */

type Strat = (s: GameState, c: Content) => GameState;
const efficiency: Strat = (s, c) => greedy(s, c);
const budget: Strat = (s, c) => {
  s = greedy(s, c);
  if (!s.flags.revealed || Math.floor(s.time) % 5) return s;
  for (const e of c.sectorOrder) if (s.sectors[e]?.open && !s.sectors[e].budget) s = model.drawBudget(s, c, e, 'firm');
  for (const l of model.leverViews(s, c)) if (l.def.kind === 'cap' && l.canRaise && l.level < 2) s = model.setLever(s, c, l.def.id, l.level + 1);
  for (const p of s.pendingDividends.slice()) s = model.chooseDecadeDividend(s, c, p.sector, 1);
  for (const v of model.commonsViews(s, c)) if (v.canBuy) s = model.buyCommons(s, c, v.def.id);
  for (const e of c.sectorOrder) if (D(s, c).sectors[e]?.canSettle) s = model.settle(s, c, e);
  return s;
};
const market: Strat = (s, c) => {
  if (s.meta.reckonings === 0) return greedy(s, c);
  for (const e of c.sectorOrder) if (s.sectors[e]?.open) for (const a of c.sectors[e].applications) s = model.foundApp(s, c, a.id);
  return s;
};
function play(strat: Strat, seconds: number, c: Content = C): { s: GameState; bad: string[] } {
  let s = { ...model.createState(c, undefined, 5), capital: 1e3 };
  const bad: string[] = [];
  for (let t = 0; t < seconds; t++) {
    if (D(s, c).pendingReckoning || s.time > 3000) s = model.reckon(s, c);
    s = model.tick(model.click(strat(s, c), c), c, 1);
    if (t % 600 === 0) bad.push(...badNumbers(s), ...badNumbers(D(s, c)));
  }
  bad.push(...badNumbers(s), ...badNumbers(D(s, c)));
  return { s, bad };
}
function deepFreeze<T>(x: T): T {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) deepFreeze(v); }
  return x;
}

describe('M2 purity, determinism, no NaN', () => {
  test('3 hours of efficiency, budget and market play at dt = 1: no NaN or Infinity', () => {
    for (const st of [efficiency, budget, market]) {
      const { s, bad } = play(st, 3 * 3600);
      expect(bad).toEqual([]);
      expect(s.meta.totalSeconds).toBeCloseTo(3 * 3600, 6);
    }
  }, 300_000);
  test('identical action sequences give identical states, events included; inputs are never mutated', () => {
    const a = play(budget, 1500).s, b = play(budget, 1500).s;
    expect(a).toEqual(b);
    expect(a.events.length).toBeGreaterThan(0);
    // frozen input: every M2 action and the step run without touching it
    let s = decoupling();
    s = patchSector(s, 'steam', { budget: { r0: 10 * steamD(s, CALM).resourceUse, since: s.time, drawnYear: 1800, w0: 1e3, p0: 0, pace: 'gentle' }, steadyYears: 9.99, clearYears: STEADY_STATE_YEARS - 0.01 });
    s = { ...s, meta: { ...s.meta, reckonings: 2 }, mandate: 1e3, capital: 1e6 };
    const f = deepFreeze(JSON.parse(JSON.stringify(s)) as GameState);
    const t = model.tick(f, CALM, 1);
    model.chooseDecadeDividend(t, CALM, 'steam', 0);
    model.settle(deepFreeze(t), CALM, 'steam');
    model.buyCommons(f, CALM, 'commons.baths');
    model.setOrders(f, CALM, { market: { on: false } });
    model.fastForward(f, CALM, 600);
    model.drawBudget(f, CALM, 'steam', 'severe');
    model.upgradeViews(f, CALM);
    model.derive(f, CALM);
    expect(JSON.parse(JSON.stringify(f))).toEqual(JSON.parse(JSON.stringify(s)));
    void steamAt;
  }, 120_000);
});
