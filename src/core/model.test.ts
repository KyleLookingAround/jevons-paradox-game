// bun-types are not installed and tsconfig has "types": [], so the test runner's own module has no declarations.
// @ts-ignore
import { describe, expect, test } from 'bun:test';
import { model } from './index';
import { fixture, FOUNDED, STEAM_EFFICIENCY, STEAM_REFERENCE } from './fixture';
import { content as realContent } from '../content';
import type { Content, SectorId, GameState, MetaState } from '../types';

const C = fixture;
const SECTORS = C.sectorOrder;
/** Real content is exercised only once the content lane has brought it to the M1 shape. */
const REAL_OK = Array.isArray((realContent as Partial<Content> | undefined)?.sectorOrder) && !!realContent.sectors;
const SKIP_REAL = !REAL_OK;
const orderOf = (c: Content) => c.sectorOrder;

/* ---------------- helpers ---------------- */

function patchSector(s: GameState, e: SectorId, patch: Partial<GameState['sectors'][SectorId]>): GameState {
  return { ...s, sectors: { ...s.sectors, [e]: { ...s.sectors[e], ...patch } } };
}
function foundAll(s: GameState, content: Content, e: SectorId): GameState {
  const apps = { ...s.sectors[e].apps };
  for (const a of content.sectors[e].applications) apps[a.id] = { ...FOUNDED, peakD: apps[a.id]?.peakD ?? 0 };
  return patchSector(s, e, { apps });
}
/** Steam with all four applications founded and the first `k` efficiency upgrades owned (η consistent). */
function steamAt(k: number, extra: Partial<GameState> = {}): GameState {
  let s = model.createState(C);
  const upgrades: Record<string, number> = {};
  for (let i = 0; i < k; i++) upgrades[STEAM_EFFICIENCY[i]] = 1;
  s = { ...s, upgrades, ...extra };
  s = foundAll(s, C, 'steam');
  // re-baseline on the next tick, as if this economy had been there from the start
  return patchSector(s, 'steam', { eta: STEAM_REFERENCE.eta[k], baseR: 0, baseD: 0, basePs: 0, smoothR: 0, peakR: 0, etaAtBase: 0 } as never);
}
const R = (s: GameState, e: SectorId = 'steam', c: Content = C) => model.derive(s, c).sectors[e]!.resourceUse;
const run = (s: GameState, secs: number, dt = 1, c: Content = C) => {
  for (let t = 0; t < secs; t += dt) s = model.tick(s, c, dt);
  return s;
};
function greedy(s: GameState, c: Content): GameState {
  // cost and visibility do not depend on the reveal; skipping it skips the (cached, but per-second) projections
  for (const v of model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, c)) if (v.visible && v.affordable) s = model.buyUpgrade(s, c, v.def.id);
  for (const e of orderOf(c)) {
    const es = s.sectors[e];
    if (!es?.open) continue;
    for (const a of c.sectors[e].applications) s = model.foundApp(s, c, a.id);
  }
  return s;
}
/** Every sector open, every app founded, every efficiency upgrade bought. */
function openAll(c: Content = C, maxSeconds = 40): GameState {
  // the Market off (M2 balance: with this much capital it buys a card at every order tick, noise for these tests)
  const m0 = model.createState(c).meta;
  // M4: every act's ending reached (the Previews wait on it), without a capstone
  const endings = Object.fromEntries((c.acts ?? []).filter((x) => x.ending).map((x) => [x.ending!.id, { run: 1, runSeconds: 1, totalSeconds: 1, year: 1900 }]));
  const features = Object.fromEntries(Object.keys(c.features ?? {}).map((k) => [k, 0])); // and every feature arrived
  const meta: MetaState = { ...m0, reckonings: 9, endings: { ...m0.endings, ...endings }, features: { ...m0.features, ...features }, orders: { ...m0.orders, market: { ...m0.orders.market, on: false } } };
  let s = { ...model.createState(c, meta), capital: 1e15 };
  for (let i = 0; i < maxSeconds && !orderOf(c).every((e) => s.sectors[e].open); i++) s = greedy(model.tick(greedy(s, c), c, 1), c);
  return s;
}
function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}
/** Every number reachable from x is finite, except where Infinity is meaningful by contract. */
function badNumbers(x: unknown, path = '', out: string[] = []): string[] {
  if (typeof x === 'number') {
    const infOk = /secondsLeft$|visibleBelow$|priceNeeded$|priceNow$/.test(path);
    if (Number.isNaN(x) || (!Number.isFinite(x) && !infOk) || (x < 0 && !/trendR$|rebound$|mandatePerSec$|populationGrowthPerSec$|wellbeingShare$|projectedDecade$|promisedChange$|wantedChange$/.test(path))) out.push(`${path}=${x}`);
  } else if (x && typeof x === 'object') {
    if ('def' in (x as object)) x = { ...(x as object), def: undefined };
    for (const [k, v] of Object.entries(x as object)) badNumbers(v, `${path}.${k}`, out);
  }
  return out;
}

/* ---------------- 1. reference economy ---------------- */

describe('Era 1 reference numbers', () => {
  test('R at each η step matches DESIGN.md (±2%)', () => {
    STEAM_REFERENCE.eta.forEach((eta, k) => {
      const r = R(steamAt(k));
      expect(Math.abs(r / STEAM_REFERENCE.R[k] - 1)).toBeLessThan(0.02);
    });
  });
  test('η from bought upgrades equals the reference step after a tick', () => {
    const s = model.tick(steamAt(7), C, 0.1);
    expect(s.sectors.steam.eta).toBeCloseTo(18, 6);
  });
  test('fresh run: Era 1 open, pumping founded, rest closed; rebound null', () => {
    const s = model.createState(C);
    expect(s.sectors.steam.open).toBe(true);
    expect(s.sectors.steam.apps['steam.pumping'].founded).toBe(true);
    expect(s.sectors.steam.apps['steam.mills'].available).toBe(false);
    expect(s.sectors.light.open).toBe(false);
    const d = model.derive(s, C);
    expect(d.sectors.steam!.rebound).toBeNull();
    expect(s.sectors.steam.baseR).toBeGreaterThan(0);
    expect(d.sectors.light).toBeUndefined();
  });
});

/* ---------------- 2/3. purity & determinism ---------------- */

describe('purity and determinism', () => {
  test('no API function mutates its input', () => {
    let s = steamAt(2, { capital: 1e6, mandate: 1e4, flags: { revealed: true, won: false } });
    s = run(s, 30);
    deepFreeze(s);
    const snap = JSON.stringify(s);
    model.tick(s, C, 1);
    model.tick(s, C, 7.5);
    model.fastForward(s, C, 600);
    model.derive(s, C);
    model.click(s, C);
    model.buyUpgrade(s, C, 'steam.doubleActing');
    model.buyUpgrade(s, C, 'steam.coalQuestion');
    model.foundApp(s, C, 'steam.mills');
    model.setLever(s, C, 'steam.duty', 2);
    model.setLever(s, C, 'steam.cap', 1);
    model.setLeverRecycle(s, C, 'steam.duty', 'dividend');
    model.drawBudget(s, C, 'steam');
    model.upgradeViews(s, C);
    model.leverViews(s, C);
    model.knowhowViews(s, C);
    model.institutionViews(s, C);
    model.hindsightOnReckon(s, C);
    const next = deepFreeze(model.reckon(s, C));
    const nextSnap = JSON.stringify(next);
    const rich = deepFreeze({ ...next, meta: { ...next.meta, hindsight: 100, institutions: { 'inst.stats': 1 } } });
    model.buyKnowhow(next, C, 'kh.seed');
    model.buyInstitution(next, C, 'inst.stats');
    model.buyKnowhow(rich, C, 'kh.chair');
    model.setLoadout(rich, C, ['inst.stats']);
    model.knowhowViews(rich, C);
    model.institutionViews(rich, C);
    expect(JSON.stringify(next)).toBe(nextSnap);
    model.deserialize(model.serialize(s), C);
    expect(JSON.stringify(s)).toBe(snap);
  });
  test('same inputs, same outputs', () => {
    const play = () => {
      let s = model.createState(C, undefined, 42);
      for (let t = 0; t < 900; t++) {
        s = model.tick(s, C, 1);
        if (t % 3 === 0) s = model.click(s, C);
        s = greedy(s, C);
      }
      return model.serialize(s);
    };
    expect(play()).toBe(play());
  });
  test('rejected actions return the same reference', () => {
    const s = model.createState(C);
    expect(model.buyUpgrade(s, C, 'steam.turbine')).toBe(s); // prerequisites
    expect(model.buyUpgrade(s, C, 'steam.boilers')).toBe(s); // too dear
    expect(model.buyUpgrade(s, C, 'nope')).toBe(s);
    expect(model.foundApp(s, C, 'steam.mills')).toBe(s); // not available
    expect(model.foundApp(s, C, 'nope')).toBe(s);
    expect(model.setLever(s, C, 'steam.duty', 1)).toBe(s); // not revealed
    expect(model.setLever(s, C, 'nope', 1)).toBe(s);
    expect(model.buyKnowhow(s, C, 'kh.seed')).toBe(s); // no hindsight
    expect(model.buyInstitution(s, C, 'inst.duty')).toBe(s);
    expect(model.tick(s, C, 0)).toBe(s);
    expect(model.tick(s, C, NaN)).toBe(s);
  });
});

/* ---------------- 4. the paradox ---------------- */

describe('efficiency upgrades', () => {
  test('buying efficiency while demand is elastic raises R', () => {
    const s = steamAt(1, { capital: 1e6 });
    const before = R(s);
    const after = model.tick(model.buyUpgrade(s, C, 'steam.condenser'), C, 0.1);
    expect(after.upgrades['steam.condenser']).toBe(1);
    expect(R(after)).toBeGreaterThan(before * 1.15);
  });
  test('promisedChange is the engineer\'s promise; projectedDecade null before the reveal, positive after', () => {
    const s = steamAt(2, { capital: 1e6 });
    const v = model.upgradeViews(s, C).find((u) => u.def.id === 'steam.doubleActing')!;
    expect(v.visible).toBe(true);
    expect(v.promisedChange!).toBeCloseTo(2.5 / 3.5 - 1, 6);
    expect(v.projectedDecade).toBeNull();
    const r = model.buyUpgrade(s, C, 'steam.coalQuestion');
    expect(r.flags.revealed).toBe(true);
    expect(r.news[0].key).toBe('reveal');
    const v2 = model.upgradeViews(r, C).find((u) => u.def.id === 'steam.doubleActing')!;
    expect(v2.projectedDecade!).toBeGreaterThan(0.03);
    // a hidden card has no projection
    expect(model.upgradeViews(r, C).find((u) => u.def.id === 'steam.turbine')!.projectedDecade).toBeNull();
  });
  test('saturated demand: late efficiency finally saves resource', () => {
    expect(R(steamAt(7))).toBeLessThan(R(steamAt(6)));
  });
  test('rebound meter: backfire flagged once R exceeds the baseline', () => {
    let s = steamAt(0, { capital: 1e6 });
    s = run(s, 2);
    s = model.buyUpgrade(s, C, 'steam.boilers');
    s = run(s, 2);
    const d = model.derive(s, C).sectors.steam!;
    expect(d.rebound!).toBeGreaterThan(1);
    expect(s.sectors.steam.backfired).toBe(true);
    expect(s.meta.achievements.backfire).toBe(true);
    expect(s.news.some((n) => n.key === 'backfire')).toBe(true);
  });
  test('repeatable costs grow; costMul applies; maxLevel holds', () => {
    let s = { ...model.createState(C), capital: 1e6 };
    const cost = (st: GameState) => model.upgradeViews(st, C).find((u) => u.def.id === 'steam.deeperShaft')!;
    expect(cost(s).cost).toBe(4000);
    const q0 = s.sectors.steam.reserveMax;
    s = model.buyUpgrade(s, C, 'steam.deeperShaft');
    expect(cost(s).cost).toBe(8000);
    expect(s.sectors.steam.reserveMax).toBeCloseTo(q0 + 0.25 * 300_000, 6);
    s = model.buyUpgrade(model.buyUpgrade(s, C, 'steam.deeperShaft'), C, 'steam.deeperShaft');
    expect(cost(s).maxed).toBe(true);
    expect(model.buyUpgrade(s, C, 'steam.deeperShaft')).toBe(s);
    const kh = { ...s.meta, knowhow: { 'kh.patents': 2 } };
    expect(model.upgradeViews(model.createState(C, kh), C).find((u) => u.def.id === 'steam.boilers')!.cost).toBeCloseTo(400 * 0.81, 6);
  });
  test('frontier: an application becomes available when p_s falls below visibleBelow, then can be founded', () => {
    let s = { ...model.createState(C), capital: 1e6 };
    s = model.tick(model.buyUpgrade(s, C, 'steam.boilers'), C, 1);
    expect(s.sectors.steam.apps['steam.mills'].available).toBe(true);
    expect(s.news.some((n) => n.key === 'appAvailable')).toBe(true);
    expect(model.derive(s, C).sectors.steam!.apps['steam.mills'].demand).toBe(0);
    expect(model.derive(s, C).sectors.steam!.apps['steam.mills'].canFound).toBe(true);
    const f = model.foundApp(s, C, 'steam.mills');
    expect(f.capital).toBe(s.capital - 500);
    expect(model.derive(f, C).sectors.steam!.apps['steam.mills'].demand).toBeGreaterThan(0);
  });
  test('click pays clickFlat + clickSeconds × income', () => {
    const s = model.createState(C);
    const inc = model.derive(s, C).incomePerSec;
    const c = model.click(s, C);
    expect(c.capital).toBeCloseTo(s.capital + 2 + inc, 9);
    expect(c.run.clicks).toBe(1);
  });
});

/* ---------------- 5. Reckoning ---------------- */

describe('Reckoning', () => {
  test('exhaustion → pending, tick is a no-op, reckon gives a fresh run', () => {
    let s = run(steamAt(0, { capital: 1e6 }), 1);
    for (const u of STEAM_EFFICIENCY.slice(0, 3)) s = model.buyUpgrade(s, C, u);
    s = { ...s, capital: 1234 };
    s = patchSector(s, 'steam', { reserve: s.sectors.steam.reserveMax * 0.004 });
    let n = 0;
    while (!model.derive(s, C).pendingReckoning && n++ < 5000) s = model.tick(s, C, 1);
    const d = model.derive(s, C);
    expect(d.pendingReckoning).toEqual({ cause: 'exhausted', sector: 'steam' });
    expect(model.tick(s, C, 1)).toBe(s);
    // M2: fastForward from a pending state simulates nothing and says so
    const ff = model.fastForward(s, C, 100);
    expect(ff.time).toBe(s.time);
    expect(ff.lastOffline?.heldBy).toBe('pending');
    expect(model.click(s, C)).toBe(s);
    expect(d.hindsightIfReckonNow).toBeGreaterThan(0);
    const r = model.reckon(s, C);
    expect(r.meta.reckonings).toBe(1);
    expect(r.meta.hindsight).toBe(d.hindsightIfReckonNow);
    expect(r.meta.achievements.firstReckoning).toBe(true);
    expect(r.meta.lastRun!.cause).toBe('exhausted');
    expect(r.meta.lastRun!.causeSector).toBe('steam');
    expect(r.meta.lastRun!.sectors.steam!.etaFold).toBeCloseTo(3.5, 6);
    expect(r.meta.lastRun!.hindsightTerms!.total).toBe(r.meta.lastRun!.hindsightGained);
    expect(r.time).toBe(0);
    expect(r.capital).toBe(C.global.startCapital);
    expect(r.upgrades).toEqual({});
    expect(r.news[0].key).toBe('reckoning');
    expect(model.derive(r, C).pendingReckoning).toBeNull();
  });
  test('pressure collapse → pending collapse; crises grant mandate and cost population', () => {
    let s = steamAt(4);
    s = patchSector(s, 'steam', { pressure: 39.9 });
    const m0 = s.mandate, n0 = s.population;
    s = model.tick(s, C, 1);
    expect(s.sectors.steam.crisesFired).toBe(1);
    expect(s.mandate).toBeGreaterThanOrEqual(m0 + 100);
    expect(s.population).toBeLessThan(n0);
    s = patchSector(s, 'steam', { pressure: 100 });
    expect(model.derive(s, C).pendingReckoning).toEqual({ cause: 'collapse', sector: 'steam' });
    expect(model.reckon(s, C).meta.lastRun!.cause).toBe('collapse');
  });
  test('Hindsight spent on the Reckoning screen applies to the run it was spent on', () => {
    let r = model.reckon(run(steamAt(2), 30), C);
    r = { ...model.click(r, C), meta: { ...r.meta, hindsight: 100 } };
    const cap0 = r.capital;
    r = model.buyKnowhow(r, C, 'kh.seed');
    expect(r.capital).toBeCloseTo(cap0 + C.global.startCapital, 9); // start capital doubled, the click kept
    r = model.buyKnowhow(r, C, 'kh.engines');
    expect(r.sectors.steam.eta).toBeCloseTo(1.15, 9);
    expect(model.derive(r, C).sectors.steam!.etaFold).toBeCloseTo(1, 9);
    expect(r.news[0].key).toBe('reckoning');
    r = model.buyInstitution(model.buyInstitution(r, C, 'inst.stats'), C, 'inst.duty');
    expect(r.flags.revealed).toBe(false); // M1: owned, not seated
    r = model.setLoadout(r, C, ['inst.stats', 'inst.duty']);
    expect(r.flags.revealed).toBe(true);
    expect(r.levers['steam.duty'].level).toBe(1);
    expect(r.meta.hindsight).toBeCloseTo(100 - 1 - 2 - 3 - 5, 9);
    // M1 CHANGE: mid-run, Hindsight cannot be spent at all
    const midState = { ...model.tick(r, C, 1), meta: { ...r.meta, hindsight: 100 } };
    expect(model.buyKnowhow(midState, C, 'kh.seed')).toBe(midState);
  });
  test('chosen reckoning, knowhow and institutions carry over', () => {
    const s = run(steamAt(2), 60);
    let r = model.reckon(s, C);
    expect(r.meta.lastRun!.cause).toBe('chosen');
    r = { ...r, meta: { ...r.meta, hindsight: 100 } };
    r = model.buyKnowhow(r, C, 'kh.engines');
    expect(r.meta.knowhow['kh.engines']).toBe(1);
    expect(r.meta.hindsight).toBe(98);
    r = model.buyInstitution(r, C, 'inst.stats');
    r = model.buyInstitution(r, C, 'inst.duty');
    r = model.setLoadout(r, C, ['inst.stats', 'inst.duty']);
    expect(r.flags.revealed).toBe(true);
    expect(r.levers['steam.duty'].level).toBe(1);
    const next = model.reckon(r, C);
    expect(next.flags.revealed).toBe(true);
    expect(next.levers['steam.duty'].level).toBe(1);
    expect(next.sectors.steam.eta).toBeCloseTo(1.15, 9);
    // knowhow-boosted runs start at etaFold 1 (the baseline is this run's start)
    expect(model.derive(next, C).sectors.steam!.etaFold).toBeCloseTo(1, 9);
    // standing lever has a reference and no upkeep
    const t = model.tick(next, C, 1);
    expect(t.levers['steam.duty'].ref).toBeGreaterThan(0);
    expect(model.leverViews(t, C).find((l) => l.def.id === 'steam.duty')!.upkeep).toBe(0);
  });
});

/* ---------------- 6. levers ---------------- */

describe('levers', () => {
  const rich = (s: GameState): GameState => ({ ...s, mandate: 1e6, capital: 1e9, flags: { ...s.flags, revealed: true } });

  test('levers are hidden until the reveal', () => {
    const s = steamAt(1, { mandate: 1e6 });
    expect(model.leverViews(s, C).every((l) => !l.visible)).toBe(true);
    expect(model.leverViews(rich(s), C).find((l) => l.def.id === 'steam.duty')!.visible).toBe(true);
    // levers of closed sectors stay hidden
    expect(model.leverViews(rich(s), C).find((l) => l.def.id === 'code.deletion')!.visible).toBe(false);
  });

  test('duty holds p_s up as η rises and cuts R; revenue is not income but trickles to Mandate', () => {
    const s0 = rich(steamAt(1));
    const s1 = model.setLever(s0, C, 'steam.duty', 2);
    expect(s1.mandate).toBe(s0.mandate - 400);
    expect(s1.levers['steam.duty'].ref).toBeCloseTo(model.derive(s0, C).sectors.steam!.servicePrice, 9);
    const up = (s: GameState) => model.tick(model.buyUpgrade(model.buyUpgrade(s, C, 'steam.condenser'), C, 'steam.doubleActing'), C, 0.1);
    const a = model.derive(up(s0), C), b = model.derive(up(s1), C);
    expect(b.sectors.steam!.servicePrice).toBeGreaterThan(a.sectors.steam!.servicePrice);
    expect(b.sectors.steam!.resourceUse).toBeLessThan(a.sectors.steam!.resourceUse);
    expect(b.incomePerSec).toBeLessThan(a.incomePerSec);
    expect(b.mandatePerSec).toBeGreaterThan(a.mandatePerSec - 0.12 - 1e-9);
    // lowering is free and immediate
    const low = model.setLever(s1, C, 'steam.duty', 0);
    expect(low.levers['steam.duty'].level).toBe(0);
    expect(low.mandate).toBe(s1.mandate);
  });

  test('cap holds R at the cap (M1: a fraction of the budget line) with a permit price, and leaks when squeezed hard', () => {
    const s0 = rich(run(steamAt(2), 1));
    const r0 = R(s0);
    const s1 = model.setLever(s0, C, 'steam.cap', 2); // 0.8 × budget, budget drawn at r0 by the raise
    expect(s1.sectors.steam.budget!.r0).toBeCloseTo(r0, 9);
    const up = (s: GameState) => model.tick(model.buyUpgrade(s, C, 'steam.doubleActing'), C, 0.1);
    const a = model.derive(up(s0), C).sectors.steam!, b = model.derive(up(s1), C).sectors.steam!;
    expect(a.resourceUse).toBeGreaterThan(0.8 * r0);
    expect(b.resourceUse).toBeLessThanOrEqual(0.8 * r0 * 1.001);
    expect(b.resourceUse).toBeGreaterThan(0.8 * r0 * 0.99);
    expect(b.resourcePrice).toBeGreaterThan(a.resourcePrice);
    expect(b.permitPrice).toBeGreaterThan(0);
    // permit revenue is levy, never income
    expect(b.income).toBeCloseTo(b.margin * b.preLevyPrice * b.demand, 9);
    expect(b.levyRevenue).toBeCloseTo(b.permitPrice * b.resourceUse, 9);
    // a very tight cap leaks: R above the nominal cap, but still below uncapped
    const s3 = model.setLever(s0, C, 'steam.cap', 3);
    const c = model.derive(up(s3), C).sectors.steam!;
    expect(c.resourceUse).toBeGreaterThan(0.3 * r0 * 1.01);
    expect(c.resourceUse).toBeLessThanOrEqual(0.3 * r0 * 1.25 + 1e-6);
  });

  test('sufficiency lowers saturation over time and so demand', () => {
    const s0 = rich(steamAt(3));
    const s1 = model.setLever(s0, C, 'steam.sufficiency', 2);
    const a = run(s0, 200), b = run(s1, 200);
    expect(b.sectors.steam.apps['steam.mills'].satMul).toBeLessThan(0.6);
    expect(R(b)).toBeLessThan(R(a) * 0.75);
  });

  test('substitution supplies a share without resource, and respects its flow cap', () => {
    const s0 = rich(steamAt(3));
    const r0 = R(s0), d0 = model.derive(s0, C).sectors.steam!.demand;
    const s2 = model.setLever(s0, C, 'steam.substitution', 2);
    const b = model.derive(s2, C).sectors.steam!;
    expect(b.resourceUse).toBeLessThan(r0);
    expect(b.resourceUse * 3.5 / b.demand).toBeCloseTo(0.5, 3);
    // substituted service costs 1.5 × c and no coal, so here it is cheaper than coal-fired power: p_s falls, D rises
    expect(b.demand).toBeGreaterThan(d0);
    const s1 = model.setLever(s0, C, 'steam.substitution', 1);
    const c = model.derive(s1, C).sectors.steam!; // value2 100 units/s binds before the 20% share
    expect(c.demand - c.resourceUse * 3.5).toBeCloseTo(100, 1);
    expect(d0).toBeGreaterThan(0);
  });

  test('circularity returns a share of the burn to the reserve', () => {
    const s0 = rich(steamAt(3));
    const s1 = model.setLever(s0, C, 'steam.circularity', 2);
    const a = run(s0, 100), b = run(s1, 100);
    const used = (s: GameState) => s0.sectors.steam.reserve - s.sectors.steam.reserve;
    expect(used(b)).toBeLessThan(used(a) * 0.6);
  });

  test('greenSpending cuts the indirect spill from Light into Steam', () => {
    let s = rich(openAll());
    const dSteam = (st: GameState) => model.derive(st, C).sectors.steam!.demand;
    const withSpill = dSteam(s);
    const g = model.setLever(s, C, 'light.greenSpending', 2);
    expect(g.levers['light.greenSpending'].level).toBe(2);
    expect(dSteam(g)).toBeLessThan(withSpill);
    // and with no spill at all (light closed) steam demand is lower still, or equal to green-at-100%
    s = patchSector(s, 'light', { open: false });
    expect(dSteam(s)).toBeCloseTo(dSteam(g), 6);
  });

  test('Code levers: deletion shrinks the code stock, sharedLibs slows it, reviewGate trades D for wellbeing', () => {
    let s = rich(openAll());
    // sharedLibs requires the Statistics Office SEATED (M1)
    expect(model.setLever(s, C, 'code.sharedLibs', 1)).toBe(s);
    s = { ...s, meta: { ...s.meta, institutions: { 'inst.stats': 1 }, loadout: ['inst.stats'] } };
    s = patchSector(s, 'code', { pressure: 300 });
    const P = (st: GameState) => st.sectors.code.pressure;
    const base = run(s, 20);
    const del = run(model.setLever(s, C, 'code.deletion', 2), 20);
    const libs = run(model.setLever(s, C, 'code.sharedLibs', 1), 20);
    expect(P(del)).toBeLessThan(P(base));
    expect(P(libs)).toBeLessThan(P(base));
    const growth = (st: GameState) => P(st) - 300;
    expect(Math.abs(growth(libs) / (growth(base) * 0.5) - 1)).toBeLessThan(0.03);
    const d0 = model.derive(s, C).sectors.code!;
    expect(d0.reserveFraction).toBeLessThan(0.2); // utilisation above 0.8 → defects
    const rg = model.derive(model.setLever(s, C, 'code.reviewGate', 2), C).sectors.code!;
    expect(rg.demand).toBeLessThan(d0.demand);
    expect(rg.wellbeingShare + 15 * 0.3).toBeGreaterThan(d0.wellbeingShare + 15 * 0.3);
  });

  test('raising costs the sum of the levels skipped; cannot raise without Mandate', () => {
    const s0 = { ...rich(steamAt(1)), mandate: 350 };
    expect(model.setLever(s0, C, 'steam.duty', 2)).toBe(s0);
    const s1 = model.setLever(s0, C, 'steam.duty', 1);
    expect(s1.mandate).toBe(250);
    expect(s1.news[0].key).toBe('leverEnacted');
  });
});

/* ---------------- 7. mandate ---------------- */

describe('mandate', () => {
  // M1: cap permit revenue is levy routed to the treasury, which pays Mandate. These two tests are about lapsing, so
  // they switch the levy's Mandate share off (otherwise the tight cap funds its own upkeep).
  const C = { ...fixture, global: { ...fixture.global, levy: { mandateShare: 0 } } };
  test('at zero with upkeep due, the costliest lever drops one level', () => {
    let s = { ...steamAt(1), flags: { revealed: true, won: false }, mandate: 2000 };
    s = model.setLever(s, C, 'steam.cap', 3);
    s = model.setLever(s, C, 'steam.duty', 1);
    s = { ...s, mandate: 0.5 };
    s = model.tick(s, C, 1);
    expect(s.mandate).toBe(0);
    expect(s.levers['steam.cap'].level).toBe(2);
    expect(s.levers['steam.duty'].level).toBe(1);
    expect(s.news[0].key).toBe('leverLapsed');
    expect(s.news[0].text).toBe('Measure lapses for want of mandate'); // fallback (no variants)
  });
  test('lapsing is independent of tick length: drops levels until upkeep is covered', () => {
    let s = { ...steamAt(1), flags: { revealed: true, won: false }, mandate: 1e5 };
    for (const id of ['steam.cap', 'steam.duty', 'steam.circularity']) s = model.setLever(s, C, id, 2);
    s = model.setLever(s, C, 'steam.cap', 3);
    s = { ...s, mandate: 0 };
    const lv = (st: GameState) => C.levers.map((l) => st.levers[l.id].level).join(',');
    const a = model.tick(s, C, 1);
    let b = s;
    for (let i = 0; i < 10; i++) b = model.tick(b, C, 0.1);
    expect(lv(a)).toBe(lv(b));
    expect(model.derive(a, C).mandatePerSec).toBeGreaterThanOrEqual(0);
    expect(a.news.filter((n) => n.key === 'leverLapsed').length).toBeGreaterThanOrEqual(1);
  });
  test('mandate accrues from wellbeing above the floor', () => {
    const C = fixture;
    const s = steamAt(4);
    const d = model.derive(s, C);
    expect(d.wellbeing).toBeGreaterThan(C.global.mandateFloor);
    expect(d.mandatePerSec).toBeCloseTo(0.05 * (d.wellbeing - 10), 9);
    expect(model.tick(s, C, 1).mandate).toBeCloseTo(d.mandatePerSec, 9);
  });
});

/* ---------------- 8. persistence ---------------- */

describe('persistence', () => {
  test('serialize/deserialize round-trip', () => {
    const s = run(greedy({ ...steamAt(2), capital: 1e5 }, C), 120);
    const back = model.deserialize(model.serialize(s), C)!;
    expect(back).not.toBeNull();
    expect(JSON.parse(model.serialize(back))).toEqual(JSON.parse(model.serialize(s)));
    expect(model.derive(back, C).sectors.steam!.resourceUse).toBeCloseTo(R(s), 9);
  });
  test('tolerates a save missing an era, an app, a lever and fields; keeps unknown upgrades harmless', () => {
    const s = run(steamAt(2), 30);
    const raw = JSON.parse(model.serialize(s));
    delete raw.sectors.code;
    delete raw.sectors.steam.apps['steam.mills'];
    delete raw.sectors.steam.peakR;
    delete raw.levers['steam.cap'];
    delete raw.run;
    delete raw.meta.steadySectors;
    raw.upgrades['ghost.upgrade'] = 1;
    const back = model.deserialize(JSON.stringify(raw), C)!;
    expect(back).not.toBeNull();
    expect(back.sectors.code.open).toBe(false);
    expect(back.sectors.steam.apps['steam.mills'].founded).toBe(false);
    expect(back.levers['steam.cap'].level).toBe(0);
    expect(back.run.clicks).toBe(0);
    expect(badNumbers(model.derive(back, C))).toEqual([]);
    expect(badNumbers(run(back, 30))).toEqual([]);
  });
  test('garbage → null', () => {
    for (const t of ['', 'nope', '{}', '[]', 'null', '{"time":"x","eras":{}}', '{"time":1}', '{"time":1,"version":2}', '{"time":1,"version":6,"sectors":{}}']) expect(model.deserialize(t, C)).toBeNull();
  });
});

/* ---------------- 9. robustness ---------------- */

describe('robustness', () => {
  for (const [name, c] of [['fixture', C], ['real content', realContent]] as const) {
    const t = name === 'real content' && SKIP_REAL ? test.skip : test;
    t(`no NaN/Infinity after 3 hours of greedy play at dt=1 (${name})`, () => {
      let s = { ...model.createState(c), capital: 50 };
      let reckonings = 0;
      for (let t = 0; t < 3 * 3600; t++) {
        s = model.tick(s, c, 1);
        if (t % 5 === 0) s = greedy(s, c);
        if (t % 60 === 0) {
          s = { ...s, flags: { ...s.flags, revealed: true } };
          for (const lv of model.leverViews(s, c)) if (lv.canRaise && lv.level < 1) s = model.setLever(s, c, lv.def.id, 1);
        }
        if (model.derive(s, c).pendingReckoning) { s = model.reckon(s, c); reckonings++; }
        if (t % 600 === 0) expect(badNumbers(s)).toEqual([]);
      }
      expect(badNumbers(s)).toEqual([]);
      expect(badNumbers(model.derive(s, c))).toEqual([]);
      expect(badNumbers(model.upgradeViews(s, c))).toEqual([]);
      expect(s.history.length).toBeLessThanOrEqual(240);
      expect(s.news.length).toBeLessThanOrEqual(40);
    }, 60_000);
    t(`no NaN/Infinity after 5 minutes at dt=0.1 (${name})`, () => {
      let s = { ...model.createState(c), capital: 1e5 };
      for (let i = 0; i < 3000; i++) {
        s = model.tick(s, c, 0.1);
        if (i % 50 === 0) s = greedy(s, c);
      }
      expect(badNumbers(s)).toEqual([]);
      expect(badNumbers(model.derive(s, c))).toEqual([]);
    });
  }
  test('all sectors open and finite with every lever at max (fixture)', () => {
    let s = { ...openAll(), mandate: 1e9, flags: { revealed: true, won: false } };
    s = { ...s, upgrades: { ...s.upgrades, 'steam.institute': 1 }, meta: { ...s.meta, institutions: { 'inst.stats': 1 }, loadout: ['inst.stats'] } };
    const max = (id: string) => model.leverViews(s, C).find((l) => l.def.id === id)!.maxLevel;
    for (const l of C.levers) s = model.setLever(s, C, l.id, max(l.id));
    for (const l of C.levers) expect(s.levers[l.id].level).toBe(max(l.id));
    s = run(s, 600, 1);
    expect(badNumbers(s)).toEqual([]);
    expect(badNumbers(model.derive(s, C))).toEqual([]);
  });
  (SKIP_REAL ? test.skip : test)('dt = 1 (balancer) and dt = 0.1 (browser) give the same game', () => {
    const play = (dt: number) => {
      let s = model.createState(realContent);
      const buys: [number, string][] = [[60, 'steam.boilers'], [200, 'steam.mills'], [400, 'steam.condenser'], [900, 'steam.railways'], [1100, 'steam.doubleActing']];
      let i = 0;
      for (let k = 0; k < Math.round(1500 / dt); k++) {
        while (i < buys.length && s.time >= buys[i][0] - 1e-9) {
          const id = buys[i++][1];
          s = { ...s, capital: s.capital + 1e5 };
          s = id.endsWith('mills') || id.endsWith('railways') ? model.foundApp(s, realContent, id) : model.buyUpgrade(s, realContent, id);
        }
        s = model.tick(s, realContent, dt);
      }
      return s;
    };
    const a = play(1), b = play(0.1);
    const close = (x: number, y: number) => expect(Math.abs(x / y - 1)).toBeLessThan(0.01);
    close(a.capital, b.capital);
    close(a.sectors.steam.reserve, b.sectors.steam.reserve);
    close(a.sectors.steam.pressure, b.sectors.steam.pressure);
    close(a.population, b.population);
    // Mandate integrates W − mandateFloor: when W sits just above the floor its relative error is amplified, so it
    // gets a looser bound (wellbeing itself must agree to 1%).
    expect(Math.abs(a.mandate / b.mandate - 1)).toBeLessThan(0.05);
    close(model.derive(a, realContent).wellbeing, model.derive(b, realContent).wellbeing);
    close(R(a, 'steam', realContent), R(b, 'steam', realContent));
  });
  (SKIP_REAL ? test.skip : test)('real content: every sector open, every lever at max, 10 minutes, stays finite', () => {
    // keep it alive: no collapse, reserves topped up
    const ORDER = realContent.sectorOrder;
    const C3: Content = { ...realContent, sectors: Object.fromEntries(ORDER.map((e) => [e, { ...realContent.sectors[e], collapseAt: 1e12, reserve: realContent.sectors[e].reserve * (realContent.sectors[e].resourceKind === 'stock' ? 1e3 : 1) }])) };
    let s = openAll(C3, 3000);
    for (const e of ORDER) expect(s.sectors[e].open).toBe(true);
    s = { ...s, mandate: 1e9, flags: { revealed: true, won: false } };
    for (const e of ORDER) s = patchSector(s, e, { pressure: 0, reserve: s.sectors[e].reserveMax });
    for (const l of C3.levers) s = model.setLever(s, C3, l.id, Math.min(l.levels.length + 2, model.leverViews(s, C3).find((v) => v.def.id === l.id)!.maxLevel));
    for (let i = 0; i < 600; i++) s = model.tick(s, C3, 1);
    expect(badNumbers(s)).toEqual([]);
    const d = model.derive(s, C3);
    expect(badNumbers(d)).toEqual([]);
    for (const e of ORDER) if (C3.sectors[e].resourceKind === 'flow') expect(d.sectors[e]!.reserveFraction).toBeGreaterThan(0);
    expect(badNumbers(model.upgradeViews(s, C3))).toEqual([]);
  });
  test('large dt is sub-stepped; fastForward caps and stops', () => {
    const s = steamAt(2);
    const a = model.tick(s, C, 10);
    expect(a.time).toBeCloseTo(10, 9);
    const f = model.fastForward(s, C, 1e9);
    expect(f.time).toBeLessThanOrEqual((C.global.offlineCapSeconds ?? 14400) + 1e-6);
    expect(badNumbers(f)).toEqual([]);
  });
  test('large dt: tick advances at most MAX_TICK_SECONDS and returns promptly', () => {
    const s = steamAt(2);
    const t0 = performance.now();
    const a = model.tick(s, C, 1e9);
    expect(performance.now() - t0).toBeLessThan(500);
    expect(a.time).toBeCloseTo(60, 9);
    expect(model.tick(s, C, Infinity).time).toBeCloseTo(60, 9);
  });
  test('tolerates content with no levers, knowhow or institutions', () => {
    const bare: Content = { ...C, levers: [], knowhow: [], institutions: [] };
    let s = run(model.createState(bare), 120, 1, bare);
    expect(badNumbers(model.derive(s, bare))).toEqual([]);
    expect(model.leverViews(s, bare)).toEqual([]);
    s = model.reckon(s, bare);
    expect(s.meta.reckonings).toBe(1);
  });
  test('history is sampled every 5 s and thinned past 240 samples', () => {
    const s = run(model.createState(C), 2000, 1);
    expect(s.history.length).toBeLessThanOrEqual(240);
    expect(s.history.length).toBeGreaterThan(120);
    expect(s.history[s.history.length - 1].time).toBeGreaterThan(1990);
    for (let i = 1; i < s.history.length; i++) expect(s.history[i].time).toBeGreaterThan(s.history[i - 1].time);
  });
});

/* ---------------- 10. flow sector & cross-sector links ---------------- */

describe('Code and cross-sector links', () => {
  test('sectors open in order once milestones and reckonings allow', () => {
    const s = openAll();
    for (const e of SECTORS) expect(s.sectors[e].open).toBe(true);
    for (const e of SECTORS) expect(s.meta.sectorsOpened[e]).toBe(true);
    expect(s.news.some((n) => n.key === 'sectorOpened')).toBe(true);
    // no reckonings, no new sector, however cheap the service
    let t = { ...model.createState(C), capital: 1e12 };
    for (let i = 0; i < 60; i++) t = greedy(model.tick(t, C, 1), C);
    expect(t.sectors.light.open).toBe(false);
    expect(model.derive(t, C).nextSectors).toMatchObject([{ id: 'light', reckoningsNeeded: 1, reckoningsHave: 0, ready: false }]);
    expect(model.derive(t, C).nextSectors[0].checklist.every((c) => c.met)).toBe(true);
  });
  test('flow sector: demand self-limits, utilisation < 1, pressure upkeep shrinks capacity', () => {
    const s = openAll();
    const d = model.derive(s, C).sectors.code!;
    expect(d.demand).toBeGreaterThan(0);
    expect(d.reserveFraction).toBeGreaterThan(0); // 1 - utilisation
    expect(d.resourceUse).toBeLessThan(1500); // capacity 1000 × 1.5 (capacity upgrade)
    expect(d.resourcePrice).toBeGreaterThan(1);
    const hiP = patchSector(s, 'code', { pressure: 2000 });
    const e = model.derive(hiP, C).sectors.code!;
    expect(e.resourceUse).toBeLessThan(d.resourceUse * 0.7);
    expect(e.demand).toBeLessThan(d.demand);
    expect(e.reserveFraction).toBeGreaterThan(0);
    // stays finite and below capacity when fed far more demand than it can serve
    const flood = patchSector(s, 'code', { eta: 1e6 });
    const f = model.derive(flood, C).sectors.code!;
    expect(f.reserveFraction).toBeGreaterThan(0);
    expect(badNumbers(f)).toEqual([]);
  });
  test('code pressure comes from service and never decays on its own', () => {
    let s = openAll();
    const p0 = s.sectors.code.pressure;
    s = run(s, 50);
    expect(s.sectors.code.pressure).toBeGreaterThan(p0);
  });
  test('drawsOn adds Code demand to Compute', () => {
    const s = openAll();
    const withCode = model.derive(s, C).sectors.compute!.demand;
    const closed = patchSector(s, 'code', { open: false });
    expect(model.derive(closed, C).sectors.compute!.demand).toBeLessThan(withCode);
  });
  test('Compute efficiency rises on its own', () => {
    const s = openAll();
    const later = run(s, 100);
    expect(later.sectors.compute.eta / s.sectors.compute.eta).toBeCloseTo(Math.exp(0.005 * 100), 3);
  });
  test('lock-in: suburbs demand never falls below 80% of its peak', () => {
    let s = openAll();
    s = run(s, 10);
    const peak = s.sectors.motion.apps['motion.suburbs'].peakD;
    expect(peak).toBeGreaterThan(0);
    const dear = patchSector(s, 'motion', { eta: 0.01 });
    expect(model.derive(dear, C).sectors.motion!.apps['motion.suburbs'].demand).toBeGreaterThanOrEqual(0.8 * peak - 1e-9);
  });
  test('pumping adds to both reserve and reserveMax', () => {
    const s = model.createState(C);
    const pump = model.derive(s, C).sectors.steam!.apps['steam.pumping'].demand;
    const t = model.tick(s, C, 1);
    expect(t.sectors.steam.reserveMax - s.sectors.steam.reserveMax).toBeCloseTo(0.1 * pump, 6);
  });
});

/* ---------------- decoupling (M1: budget line) ---------------- */

describe('decoupling', () => {
  test('M1 CHANGE: falling R alone is not decoupling; R held within a drawn budget with wellbeing at target is', () => {
    // all steam apps, η 18 (saturated), heavy sufficiency pushing R down, wellbeing kept high
    const C2: Content = { ...C, sectors: { ...C.sectors, steam: { ...C.sectors.steam, pressureIntensity: 0 } } };
    const go = (st: GameState, n: number) => { for (let i = 0; i < n; i++) st = model.tick(st, C2, 1); return st; };
    let s = { ...steamAt(7), mandate: 1e6, flags: { revealed: true, won: false }, population: 5 };
    s = go(s, 200);
    // raising a lever draws the budget
    expect(model.setLever(s, C2, 'steam.sufficiency', 2).sectors.steam.budget).not.toBeNull();
    // the cosmetic trend falls, but with no budget nothing counts (efficiency-only play never decouples)
    s = { ...s, levers: { ...s.levers, 'steam.sufficiency': { level: 2, ref: 0 } } };
    s = go(s, 150);
    let d = model.derive(s, C2);
    expect(d.sectors.steam!.trendR).toBeLessThan(-0.001);
    expect(d.sectors.steam!.budgetR).toBeNull();
    expect(d.sectors.steam!.decoupling).toBe(false);
    expect(s.run.decoupledYears).toBe(0);
    s = model.drawBudget(s, C2, 'steam');
    s = go(s, 20);
    d = model.derive(s, C2);
    expect(d.wellbeing).toBeGreaterThanOrEqual(C.global.wellbeingTarget);
    expect(d.sectors.steam!.withinBudget).toBe(true);
    expect(d.sectors.steam!.decoupling).toBe(true);
    expect(s.run.decoupledYears).toBeGreaterThan(0);
    expect(s.sectors.steam.steadyYears).toBeCloseTo(1, 6);
    // fifty years of it: per-sector Steady State
    const near = patchSector(s, 'steam', { steadyYears: 49.99, clearYears: 49.99 }); // M2: the Steady streak is clearYears
    const t = model.tick(near, C2, 1);
    expect(t.meta.steadySectors.steam).toBe(true);
    expect(t.run.steadySectors.steam).toBe(true);
    expect(t.meta.achievements.steadyState).toBe(true);
    expect(t.news.some((n) => n.key === 'steadySector')).toBe(true);
    expect(model.hindsightOnReckon(t, C2)).toBeGreaterThanOrEqual(100);
  });
});
