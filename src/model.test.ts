import { describe, expect, test } from 'bun:test';
import { model } from './model';
import { fixture, FOUNDED, STEAM_EFFICIENCY, STEAM_REFERENCE } from './fixture';
import { content as realContent } from './content';
import { ERA_ORDER } from './types';
import type { Content, EraId, GameState, MetaState } from './types';

const C = fixture;

/* ---------------- helpers ---------------- */

function patchEra(s: GameState, e: EraId, patch: Partial<GameState['eras'][EraId]>): GameState {
  return { ...s, eras: { ...s.eras, [e]: { ...s.eras[e], ...patch } } };
}
function foundAll(s: GameState, content: Content, e: EraId): GameState {
  const apps = { ...s.eras[e].apps };
  for (const a of content.eras[e].applications) apps[a.id] = { ...FOUNDED, peakD: apps[a.id]?.peakD ?? 0 };
  return patchEra(s, e, { apps });
}
/** Steam with all four applications founded and the first `k` efficiency upgrades owned (η consistent). */
function steamAt(k: number, extra: Partial<GameState> = {}): GameState {
  let s = model.createState(C);
  const upgrades: Record<string, number> = {};
  for (let i = 0; i < k; i++) upgrades[STEAM_EFFICIENCY[i]] = 1;
  s = { ...s, upgrades, ...extra };
  s = foundAll(s, C, 'steam');
  return patchEra(s, 'steam', { eta: STEAM_REFERENCE.eta[k] });
}
const R = (s: GameState, e: EraId = 'steam', c: Content = C) => model.derive(s, c).eras[e]!.resourceUse;
const run = (s: GameState, secs: number, dt = 1, c: Content = C) => {
  for (let t = 0; t < secs; t += dt) s = model.tick(s, c, dt);
  return s;
};
function greedy(s: GameState, c: Content): GameState {
  for (const v of model.upgradeViews(s, c)) if (v.visible && v.affordable) s = model.buyUpgrade(s, c, v.def.id);
  for (const e of ERA_ORDER) {
    const es = s.eras[e];
    if (!es?.open) continue;
    for (const a of c.eras[e].applications) s = model.foundApp(s, c, a.id);
  }
  return s;
}
/** All five eras open, every app founded, every efficiency upgrade bought. */
function openAll(c: Content = C): GameState {
  const meta: MetaState = { ...model.createState(c).meta, reckonings: 9 };
  let s = { ...model.createState(c, meta), capital: 1e15 };
  for (let i = 0; i < 40 && !ERA_ORDER.every((e) => s.eras[e].open); i++) s = greedy(model.tick(greedy(s, c), c, 1), c);
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
    if (Number.isNaN(x) || (!Number.isFinite(x) && !infOk) || (x < 0 && !/trendR$|rebound$|mandatePerSec$|populationGrowthPerSec$|wellbeingShare$|projectedChange$|promisedChange$/.test(path))) out.push(`${path}=${x}`);
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
    expect(s.eras.steam.eta).toBeCloseTo(18, 6);
  });
  test('fresh run: Era 1 open, pumping founded, rest closed; rebound null', () => {
    const s = model.createState(C);
    expect(s.eras.steam.open).toBe(true);
    expect(s.eras.steam.apps['steam.pumping'].founded).toBe(true);
    expect(s.eras.steam.apps['steam.mills'].available).toBe(false);
    expect(s.eras.light.open).toBe(false);
    const d = model.derive(s, C);
    expect(d.eras.steam!.rebound).toBeNull();
    expect(s.eras.steam.baseR).toBeGreaterThan(0);
    expect(d.eras.light).toBeUndefined();
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
    model.upgradeViews(s, C);
    model.leverViews(s, C);
    model.hindsightOnReckon(s, C);
    const next = model.reckon(s, C);
    model.buyKnowhow(next, C, 'kh.seed');
    model.buyInstitution(next, C, 'inst.stats');
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
  test('promisedChange is the engineer\'s promise; projectedChange null before the reveal, positive after', () => {
    const s = steamAt(2, { capital: 1e6 });
    const v = model.upgradeViews(s, C).find((u) => u.def.id === 'steam.doubleActing')!;
    expect(v.visible).toBe(true);
    expect(v.promisedChange!).toBeCloseTo(2.5 / 3.5 - 1, 6);
    expect(v.projectedChange).toBeNull();
    const r = model.buyUpgrade(s, C, 'steam.coalQuestion');
    expect(r.flags.revealed).toBe(true);
    expect(r.news[0].key).toBe('reveal');
    const v2 = model.upgradeViews(r, C).find((u) => u.def.id === 'steam.doubleActing')!;
    expect(v2.projectedChange!).toBeGreaterThan(0.03);
    // a hidden card has no projection
    expect(model.upgradeViews(r, C).find((u) => u.def.id === 'steam.turbine')!.projectedChange).toBeNull();
  });
  test('saturated demand: late efficiency finally saves resource', () => {
    expect(R(steamAt(7))).toBeLessThan(R(steamAt(6)));
  });
  test('rebound meter: backfire flagged once R exceeds the baseline', () => {
    let s = steamAt(0, { capital: 1e6 });
    s = run(s, 2);
    s = model.buyUpgrade(s, C, 'steam.boilers');
    s = run(s, 2);
    const d = model.derive(s, C).eras.steam!;
    expect(d.rebound!).toBeGreaterThan(1);
    expect(s.eras.steam.backfired).toBe(true);
    expect(s.meta.achievements.backfire).toBe(true);
    expect(s.news.some((n) => n.key === 'backfire')).toBe(true);
  });
  test('repeatable costs grow; costMul applies; maxLevel holds', () => {
    let s = { ...model.createState(C), capital: 1e6 };
    const cost = (st: GameState) => model.upgradeViews(st, C).find((u) => u.def.id === 'steam.deeperShaft')!;
    expect(cost(s).cost).toBe(4000);
    const q0 = s.eras.steam.reserveMax;
    s = model.buyUpgrade(s, C, 'steam.deeperShaft');
    expect(cost(s).cost).toBe(8000);
    expect(s.eras.steam.reserveMax).toBeCloseTo(q0 + 0.25 * 300_000, 6);
    s = model.buyUpgrade(model.buyUpgrade(s, C, 'steam.deeperShaft'), C, 'steam.deeperShaft');
    expect(cost(s).maxed).toBe(true);
    expect(model.buyUpgrade(s, C, 'steam.deeperShaft')).toBe(s);
    const kh = { ...s.meta, knowhow: { 'kh.patents': 2 } };
    expect(model.upgradeViews(model.createState(C, kh), C).find((u) => u.def.id === 'steam.boilers')!.cost).toBeCloseTo(400 * 0.81, 6);
  });
  test('frontier: an application becomes available when p_s falls below visibleBelow, then can be founded', () => {
    let s = { ...model.createState(C), capital: 1e6 };
    s = model.tick(model.buyUpgrade(s, C, 'steam.boilers'), C, 1);
    expect(s.eras.steam.apps['steam.mills'].available).toBe(true);
    expect(s.news.some((n) => n.key === 'appAvailable')).toBe(true);
    expect(model.derive(s, C).eras.steam!.apps['steam.mills'].demand).toBe(0);
    expect(model.derive(s, C).eras.steam!.apps['steam.mills'].canFound).toBe(true);
    const f = model.foundApp(s, C, 'steam.mills');
    expect(f.capital).toBe(s.capital - 500);
    expect(model.derive(f, C).eras.steam!.apps['steam.mills'].demand).toBeGreaterThan(0);
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
    let s = steamAt(3, { capital: 1234 });
    s = patchEra(s, 'steam', { reserve: s.eras.steam.reserveMax * 0.004 });
    let n = 0;
    while (!model.derive(s, C).pendingReckoning && n++ < 5000) s = model.tick(s, C, 1);
    const d = model.derive(s, C);
    expect(d.pendingReckoning).toEqual({ cause: 'exhausted', era: 'steam' });
    expect(model.tick(s, C, 1)).toBe(s);
    expect(model.fastForward(s, C, 100)).toBe(s);
    expect(model.click(s, C)).toBe(s);
    expect(d.hindsightIfReckonNow).toBeGreaterThan(0);
    const r = model.reckon(s, C);
    expect(r.meta.reckonings).toBe(1);
    expect(r.meta.hindsight).toBe(d.hindsightIfReckonNow);
    expect(r.meta.achievements.firstReckoning).toBe(true);
    expect(r.meta.lastRun!.cause).toBe('exhausted');
    expect(r.meta.lastRun!.causeEra).toBe('steam');
    expect(r.meta.lastRun!.eras.steam!.etaFold).toBeCloseTo(3.5, 6);
    expect(r.time).toBe(0);
    expect(r.capital).toBe(C.global.startCapital);
    expect(r.upgrades).toEqual({});
    expect(r.news[0].key).toBe('reckoning');
    expect(model.derive(r, C).pendingReckoning).toBeNull();
  });
  test('pressure collapse → pending collapse; crises grant mandate and cost population', () => {
    let s = steamAt(4);
    s = patchEra(s, 'steam', { pressure: 39.9 });
    const m0 = s.mandate, n0 = s.population;
    s = model.tick(s, C, 1);
    expect(s.eras.steam.crisesFired).toBe(1);
    expect(s.mandate).toBeGreaterThanOrEqual(m0 + 100);
    expect(s.population).toBeLessThan(n0);
    s = patchEra(s, 'steam', { pressure: 100 });
    expect(model.derive(s, C).pendingReckoning).toEqual({ cause: 'collapse', era: 'steam' });
    expect(model.reckon(s, C).meta.lastRun!.cause).toBe('collapse');
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
    expect(r.flags.revealed).toBe(true);
    r = model.buyInstitution(r, C, 'inst.duty');
    expect(r.levers['steam.duty'].level).toBe(1);
    const next = model.reckon(r, C);
    expect(next.flags.revealed).toBe(true);
    expect(next.levers['steam.duty'].level).toBe(1);
    expect(next.eras.steam.eta).toBeCloseTo(1.15, 9);
    // knowhow-boosted runs start at etaFold 1 (the baseline is this run's start)
    expect(model.derive(next, C).eras.steam!.etaFold).toBeCloseTo(1, 9);
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
    // levers of closed eras stay hidden
    expect(model.leverViews(rich(s), C).find((l) => l.def.id === 'code.deletion')!.visible).toBe(false);
  });

  test('duty holds p_s up as η rises and cuts R; revenue is not income but trickles to Mandate', () => {
    const s0 = rich(steamAt(1));
    const s1 = model.setLever(s0, C, 'steam.duty', 2);
    expect(s1.mandate).toBe(s0.mandate - 400);
    expect(s1.levers['steam.duty'].ref).toBeCloseTo(model.derive(s0, C).eras.steam!.servicePrice, 9);
    const up = (s: GameState) => model.tick(model.buyUpgrade(model.buyUpgrade(s, C, 'steam.condenser'), C, 'steam.doubleActing'), C, 0.1);
    const a = model.derive(up(s0), C), b = model.derive(up(s1), C);
    expect(b.eras.steam!.servicePrice).toBeGreaterThan(a.eras.steam!.servicePrice);
    expect(b.eras.steam!.resourceUse).toBeLessThan(a.eras.steam!.resourceUse);
    expect(b.incomePerSec).toBeLessThan(a.incomePerSec);
    expect(b.mandatePerSec).toBeGreaterThan(a.mandatePerSec - 0.12 - 1e-9);
    // lowering is free and immediate
    const low = model.setLever(s1, C, 'steam.duty', 0);
    expect(low.levers['steam.duty'].level).toBe(0);
    expect(low.mandate).toBe(s1.mandate);
  });

  test('cap holds R at the cap with a permit price, and leaks when squeezed hard', () => {
    const s0 = rich(steamAt(2));
    const r0 = R(s0);
    const s1 = model.setLever(s0, C, 'steam.cap', 1);
    const up = (s: GameState) => model.tick(model.buyUpgrade(s, C, 'steam.doubleActing'), C, 0.1);
    const a = model.derive(up(s0), C).eras.steam!, b = model.derive(up(s1), C).eras.steam!;
    expect(a.resourceUse).toBeGreaterThan(0.9 * r0);
    expect(b.resourceUse).toBeLessThanOrEqual(0.9 * r0 * 1.001);
    expect(b.resourceUse).toBeGreaterThan(0.9 * r0 * 0.99);
    expect(b.resourcePrice).toBeGreaterThan(a.resourcePrice);
    // a very tight cap leaks: R above the nominal cap, but still below uncapped
    const s3 = model.setLever(s0, C, 'steam.cap', 3);
    const c = model.derive(up(s3), C).eras.steam!;
    expect(c.resourceUse).toBeGreaterThan(0.3 * r0 * 1.01);
    expect(c.resourceUse).toBeLessThanOrEqual(0.3 * r0 * 1.25 + 1e-6);
  });

  test('sufficiency lowers saturation over time and so demand', () => {
    const s0 = rich(steamAt(3));
    const s1 = model.setLever(s0, C, 'steam.sufficiency', 2);
    const a = run(s0, 200), b = run(s1, 200);
    expect(b.eras.steam.apps['steam.mills'].satMul).toBeLessThan(0.6);
    expect(R(b)).toBeLessThan(R(a) * 0.75);
  });

  test('substitution supplies a share without resource, and respects its flow cap', () => {
    const s0 = rich(steamAt(3));
    const r0 = R(s0), d0 = model.derive(s0, C).eras.steam!.demand;
    const s2 = model.setLever(s0, C, 'steam.substitution', 2);
    const b = model.derive(s2, C).eras.steam!;
    expect(b.resourceUse).toBeLessThan(r0);
    expect(b.resourceUse * 3.5 / b.demand).toBeCloseTo(0.5, 3);
    // substituted service costs 1.5 × c and no coal, so here it is cheaper than coal-fired power: p_s falls, D rises
    expect(b.demand).toBeGreaterThan(d0);
    const s1 = model.setLever(s0, C, 'steam.substitution', 1);
    const c = model.derive(s1, C).eras.steam!; // value2 100 units/s binds before the 20% share
    expect(c.demand - c.resourceUse * 3.5).toBeCloseTo(100, 1);
    expect(d0).toBeGreaterThan(0);
  });

  test('circularity returns a share of the burn to the reserve', () => {
    const s0 = rich(steamAt(3));
    const s1 = model.setLever(s0, C, 'steam.circularity', 2);
    const a = run(s0, 100), b = run(s1, 100);
    const used = (s: GameState) => s0.eras.steam.reserve - s.eras.steam.reserve;
    expect(used(b)).toBeLessThan(used(a) * 0.6);
  });

  test('greenSpending cuts the indirect spill from Light into Steam', () => {
    let s = rich(openAll());
    const dSteam = (st: GameState) => model.derive(st, C).eras.steam!.demand;
    const withSpill = dSteam(s);
    const g = model.setLever(s, C, 'light.greenSpending', 2);
    expect(g.levers['light.greenSpending'].level).toBe(2);
    expect(dSteam(g)).toBeLessThan(withSpill);
    // and with no spill at all (light closed) steam demand is lower still, or equal to green-at-100%
    s = patchEra(s, 'light', { open: false });
    expect(dSteam(s)).toBeCloseTo(dSteam(g), 6);
  });

  test('Era 5 levers: deletion shrinks the code stock, sharedLibs slows it, reviewGate trades D for wellbeing', () => {
    let s = rich(openAll());
    s = patchEra(s, 'code', { pressure: 300 });
    const P = (st: GameState) => st.eras.code.pressure;
    const base = run(s, 20);
    const del = run(model.setLever(s, C, 'code.deletion', 2), 20);
    const libs = run(model.setLever(s, C, 'code.sharedLibs', 1), 20);
    expect(P(del)).toBeLessThan(P(base));
    expect(P(libs)).toBeLessThan(P(base));
    const growth = (st: GameState) => P(st) - 300;
    expect(Math.abs(growth(libs) / (growth(base) * 0.5) - 1)).toBeLessThan(0.03);
    const d0 = model.derive(s, C).eras.code!;
    expect(d0.reserveFraction).toBeLessThan(0.2); // utilisation above 0.8 → defects
    const rg = model.derive(model.setLever(s, C, 'code.reviewGate', 2), C).eras.code!;
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
  test('mandate accrues from wellbeing above the floor', () => {
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
    expect(model.derive(back, C).eras.steam!.resourceUse).toBeCloseTo(R(s), 9);
  });
  test('tolerates a save missing an era, an app, a lever and fields; keeps unknown upgrades harmless', () => {
    const s = run(steamAt(2), 30);
    const raw = JSON.parse(model.serialize(s));
    delete raw.eras.code;
    delete raw.eras.steam.apps['steam.mills'];
    delete raw.eras.steam.peakR;
    delete raw.levers['steam.cap'];
    delete raw.run;
    delete raw.meta.steadyEras;
    raw.upgrades['ghost.upgrade'] = 1;
    const back = model.deserialize(JSON.stringify(raw), C)!;
    expect(back).not.toBeNull();
    expect(back.eras.code.open).toBe(false);
    expect(back.eras.steam.apps['steam.mills'].founded).toBe(false);
    expect(back.levers['steam.cap'].level).toBe(0);
    expect(back.run.clicks).toBe(0);
    expect(badNumbers(model.derive(back, C))).toEqual([]);
    expect(badNumbers(run(back, 30))).toEqual([]);
  });
  test('garbage → null', () => {
    for (const t of ['', 'nope', '{}', '[]', 'null', '{"time":"x","eras":{}}', '{"time":1}']) expect(model.deserialize(t, C)).toBeNull();
  });
});

/* ---------------- 9. robustness ---------------- */

describe('robustness', () => {
  for (const [name, c] of [['fixture', C], ['real content', realContent]] as const) {
    test(`no NaN/Infinity after 3 hours of greedy play at dt=1 (${name})`, () => {
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
    test(`no NaN/Infinity after 5 minutes at dt=0.1 (${name})`, () => {
      let s = { ...model.createState(c), capital: 1e5 };
      for (let i = 0; i < 3000; i++) {
        s = model.tick(s, c, 0.1);
        if (i % 50 === 0) s = greedy(s, c);
      }
      expect(badNumbers(s)).toEqual([]);
      expect(badNumbers(model.derive(s, c))).toEqual([]);
    });
  }
  test('all eras open and finite with every lever at max (fixture)', () => {
    let s = { ...openAll(), mandate: 1e9, flags: { revealed: true, won: false } };
    for (const l of C.levers) s = model.setLever(s, C, l.id, l.levels.length);
    for (const l of C.levers) expect(s.levers[l.id].level).toBe(l.levels.length);
    s = run(s, 600, 1);
    expect(badNumbers(s)).toEqual([]);
    expect(badNumbers(model.derive(s, C))).toEqual([]);
  });
  test('large dt is sub-stepped; fastForward caps and stops', () => {
    const s = steamAt(2);
    const a = model.tick(s, C, 10);
    expect(a.time).toBeCloseTo(10, 9);
    const f = model.fastForward(s, C, 1e9);
    expect(f.time).toBeLessThanOrEqual(C.global.offlineCapSeconds + 1e-6);
    expect(badNumbers(f)).toEqual([]);
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

/* ---------------- 10. flow era & cross-era links ---------------- */

describe('Era 5 and cross-era links', () => {
  test('eras open in order once price and reckonings allow', () => {
    const s = openAll();
    for (const e of ERA_ORDER) expect(s.eras[e].open).toBe(true);
    expect(s.meta.furthestEra).toBe(5);
    expect(s.news.some((n) => n.key === 'eraOpened')).toBe(true);
    // no reckonings, no new era, however cheap the service
    let t = { ...model.createState(C), capital: 1e12 };
    for (let i = 0; i < 10; i++) t = greedy(model.tick(t, C, 1), C);
    expect(t.eras.light.open).toBe(false);
    expect(model.derive(t, C).nextEra).toMatchObject({ id: 'light', reckoningsNeeded: 1, reckoningsHave: 0 });
  });
  test('flow era: demand self-limits, utilisation < 1, pressure upkeep shrinks capacity', () => {
    const s = openAll();
    const d = model.derive(s, C).eras.code!;
    expect(d.demand).toBeGreaterThan(0);
    expect(d.reserveFraction).toBeGreaterThan(0); // 1 - utilisation
    expect(d.resourceUse).toBeLessThan(1500); // capacity 1000 × 1.5 (capacity upgrade)
    expect(d.resourcePrice).toBeGreaterThan(1);
    const hiP = patchEra(s, 'code', { pressure: 2000 });
    const e = model.derive(hiP, C).eras.code!;
    expect(e.resourceUse).toBeLessThan(d.resourceUse * 0.7);
    expect(e.demand).toBeLessThan(d.demand);
    expect(e.reserveFraction).toBeGreaterThan(0);
    // stays finite and below capacity when fed far more demand than it can serve
    const flood = patchEra(s, 'code', { eta: 1e6 });
    const f = model.derive(flood, C).eras.code!;
    expect(f.reserveFraction).toBeGreaterThan(0);
    expect(badNumbers(f)).toEqual([]);
  });
  test('code pressure comes from service and never decays on its own', () => {
    let s = openAll();
    const p0 = s.eras.code.pressure;
    s = run(s, 50);
    expect(s.eras.code.pressure).toBeGreaterThan(p0);
  });
  test('drawsOn adds Code demand to Compute', () => {
    const s = openAll();
    const withCode = model.derive(s, C).eras.compute!.demand;
    const closed = patchEra(s, 'code', { open: false });
    expect(model.derive(closed, C).eras.compute!.demand).toBeLessThan(withCode);
  });
  test('Compute efficiency rises on its own', () => {
    const s = openAll();
    const later = run(s, 100);
    expect(later.eras.compute.eta / s.eras.compute.eta).toBeCloseTo(Math.exp(0.005 * 100), 3);
  });
  test('lock-in: suburbs demand never falls below 80% of its peak', () => {
    let s = openAll();
    s = run(s, 10);
    const peak = s.eras.motion.apps['motion.suburbs'].peakD;
    expect(peak).toBeGreaterThan(0);
    const dear = patchEra(s, 'motion', { eta: 0.01 });
    expect(model.derive(dear, C).eras.motion!.apps['motion.suburbs'].demand).toBeGreaterThanOrEqual(0.8 * peak - 1e-9);
  });
  test('pumping adds to both reserve and reserveMax', () => {
    const s = model.createState(C);
    const pump = model.derive(s, C).eras.steam!.apps['steam.pumping'].demand;
    const t = model.tick(s, C, 1);
    expect(t.eras.steam.reserveMax - s.eras.steam.reserveMax).toBeCloseTo(0.1 * pump, 6);
  });
});

/* ---------------- trend, steady state ---------------- */

describe('trend and decoupling', () => {
  test('falling R with high wellbeing counts as decoupling and accrues years', () => {
    // all steam apps, η 18 (saturated), heavy sufficiency pushing R down, wellbeing kept high
    let s = { ...steamAt(7), mandate: 1e6, flags: { revealed: true, won: false }, population: 5 };
    s = run(s, 150);
    s = model.setLever(s, C, 'steam.sufficiency', 2);
    s = run(s, 60);
    const d = model.derive(s, C);
    expect(d.eras.steam!.trendR).toBeLessThan(0);
    if (d.wellbeing >= C.global.wellbeingTarget) {
      expect(d.eras.steam!.decoupling).toBe(true);
      expect(s.run.decoupledYears).toBeGreaterThan(0);
    }
  });
});
