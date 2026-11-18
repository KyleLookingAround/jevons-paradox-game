// M1 mechanisms (briefs/m1-core.md, "Required tests"), against src/fixture.ts.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model, evalCond, statValue } from './model';
import { fixture as C, FOUNDED, STEAM_EFFICIENCY, STEAM_REFERENCE } from './fixture';
import { CALENDAR_LATE_RATE, START_YEAR, STEADY_STATE_YEARS, YEARS_PER_SECOND } from './types';
import type { Cond, Content, GameState, MetaState, SectorId, SectorState, StatKey } from './types';

/* ---------------- helpers ---------------- */

const SECTORS = C.sectorOrder;
function patchSector(s: GameState, e: SectorId, patch: Partial<SectorState>): GameState {
  return { ...s, sectors: { ...s.sectors, [e]: { ...s.sectors[e], ...patch } } };
}
function foundAll(s: GameState, c: Content, e: SectorId): GameState {
  const apps = { ...s.sectors[e].apps };
  for (const a of c.sectors[e].applications) apps[a.id] = { ...FOUNDED, peakD: apps[a.id]?.peakD ?? 0 };
  return patchSector(s, e, { apps });
}
function steamAt(k: number, extra: Partial<GameState> = {}, c: Content = C): GameState {
  let s = model.createState(c);
  const upgrades: Record<string, number> = {};
  for (let i = 0; i < k; i++) upgrades[STEAM_EFFICIENCY[i]] = 1;
  s = { ...s, upgrades, ...extra };
  s = foundAll(s, c, 'steam');
  return patchSector(s, 'steam', { eta: STEAM_REFERENCE.eta[k], baseR: 0, baseD: 0, basePs: 0, smoothR: 0, peakR: 0, etaAtBase: 0 });
}
const run = (s: GameState, secs: number, c: Content = C, dt = 1) => {
  for (let t = 0; t < secs - 1e-9; t += dt) s = model.tick(s, c, dt);
  return s;
};
const D = (s: GameState, c: Content = C) => model.derive(s, c);
const steamD = (s: GameState, c: Content = C) => D(s, c).sectors.steam!;
const rich = (s: GameState): GameState => ({ ...s, mandate: 1e6, capital: 1e9, flags: { ...s.flags, revealed: true } });
function greedy(s: GameState, c: Content): GameState {
  for (const v of model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, c)) if (v.visible && v.affordable) s = model.buyUpgrade(s, c, v.def.id);
  for (const e of c.sectorOrder) if (s.sectors[e]?.open) for (const a of c.sectors[e].applications) s = model.foundApp(s, c, a.id);
  return s;
}
function openAll(c: Content = C, maxSeconds = 60): GameState {
  const meta: MetaState = { ...model.createState(c).meta, reckonings: 9 };
  let s = { ...model.createState(c, meta), capital: 1e15 };
  for (let i = 0; i < maxSeconds && !c.sectorOrder.every((e) => s.sectors[e].open); i++) s = greedy(model.tick(greedy(s, c), c, 1), c);
  return s;
}
/** No pressure in Steam: a long, calm economy to hold a line in. */
const CALM: Content = { ...C, sectors: { ...C.sectors, steam: { ...C.sectors.steam, pressureIntensity: 0 } } };
/** Steam saturated (η 18, population 5), wellbeing above target, within a generous budget: decoupling. */
function decoupling(c: Content = CALM): GameState {
  let s = run({ ...steamAt(7, {}, c), population: 5, flags: { revealed: true, won: false } }, 2, c);
  s = patchSector(s, 'steam', { budget: { r0: 10 * steamD(s, c).resourceUse, since: s.time, drawnYear: 1800 } });
  expect(steamD(s, c).decoupling).toBe(true);
  return s;
}
const count = (s: GameState, key: string) => s.news.filter((n) => n.key === key).length;
function badNumbers(x: unknown, path = '', out: string[] = []): string[] {
  if (typeof x === 'number') {
    if (Number.isNaN(x) || (!Number.isFinite(x) && !/secondsLeft$|visibleBelow$|maxLevel$/.test(path))) out.push(`${path}=${x}`);
  } else if (x && typeof x === 'object') {
    if ('def' in (x as object)) x = { ...(x as object), def: undefined };
    for (const [k, v] of Object.entries(x as object)) badNumbers(v, `${path}.${k}`, out);
  }
  return out;
}

/* ---------------- 1. shadow ---------------- */

describe('shadow instruments (P1)', () => {
  test('no efficiency bought: rebound null and shadowR = R', () => {
    const s = model.createState(C);
    const d = steamD(s);
    expect(d.rebound).toBeNull();
    expect(d.shadowR).toBeCloseTo(d.resourceUse, 12);
    expect(d.frontierFold).toBeCloseTo(1, 12);
    expect(d.promisedR).toBeCloseTo(d.resourceUse, 12);
  });
  test('a second application moves the frontier, not the rebound', () => {
    let s = { ...model.createState(C), capital: 1e6 };
    s = patchSector(s, 'steam', { apps: { ...s.sectors.steam.apps, 'steam.mills': { ...s.sectors.steam.apps['steam.mills'], available: true } } });
    s = model.foundApp(s, C, 'steam.mills');
    const d = steamD(s);
    expect(d.frontierFold).toBeGreaterThan(1);
    expect(d.rebound).toBeNull();
    expect(d.shadowR).toBeCloseTo(d.resourceUse, 9);
  });
  test('the v1 bug (a meter at 552% from mills alone) is impossible: boilers + mills reads direct rebound only', () => {
    let s = { ...model.createState(C), capital: 1e6 };
    s = run(model.buyUpgrade(s, C, 'steam.boilers'), 1);
    s = run(model.foundApp(s, C, 'steam.mills'), 1);
    const d = steamD(s);
    expect(d.rFold).toBeGreaterThan(3); // mills quadrupled the burn …
    expect(d.frontierFold).toBeGreaterThan(3); // … and the frontier owns that
    expect(d.rebound!).toBeGreaterThan(0.8);
    expect(d.rebound!).toBeLessThan(1.5); // v1's definition read ~1000% here
  });
  test('rFold = frontierFold × R / shadowR after an efficiency purchase', () => {
    let s = run(steamAt(1, { capital: 1e6 }), 2);
    s = run(model.buyUpgrade(s, C, 'steam.condenser'), 30);
    const d = steamD(s);
    expect(d.rebound).not.toBeNull();
    expect(d.rFold).toBeCloseTo(d.frontierFold * d.resourceUse / d.shadowR, 9);
    expect(d.promisedR).toBeCloseTo(d.shadowR / d.etaFold, 9);
  });
  test('under a binding cap the meter reads ≈ 100%', () => {
    let s = rich(run(steamAt(2), 2));
    s = model.setLever(s, C, 'steam.cap', 2); // 0.8 of the budget drawn now
    s = run(model.buyUpgrade(s, C, 'steam.doubleActing'), 1);
    const d = steamD(s);
    expect(d.permitPrice).toBeGreaterThan(0);
    expect(d.rebound!).toBeCloseTo(1, 2);
  });
  test('the service price identity holds to 1e-9 with duty, cap and substitution on', () => {
    let s = rich(run(steamAt(3), 2));
    for (const [id, l] of [['steam.cap', 3], ['steam.substitution', 1]] as const) s = model.setLever(s, C, id, l);
    s = run(model.buyUpgrade(s, C, 'steam.highPressure'), 1);
    // a duty whose reference sits a little above the capped price, so both levies bind
    const pc = steamD(s).servicePrice;
    s = model.setLever(s, C, 'steam.duty', 2);
    s = { ...s, levers: { ...s.levers, 'steam.duty': { ...s.levers['steam.duty'], ref: 1.2 * pc } } };
    const d = steamD(s);
    expect(d.dutyPart).toBeGreaterThan(0);
    expect(d.permitPart).toBeGreaterThan(0);
    expect(d.substitutedShare).toBeGreaterThan(0);
    expect(Math.abs(d.servicePrice - (d.preLevyPrice + d.permitPart + d.dutyPart))).toBeLessThan(1e-9);
    expect(d.preLevyPrice).toBeCloseTo((1 - d.substitutedShare) * (d.resourcePriceBase / d.eta + d.capCost) + d.substitutedShare * 1.5 * d.capCost, 9);
    expect(d.permitPart).toBeCloseTo((1 - d.substitutedShare) * d.permitPrice / d.eta, 9);
    expect(d.resourcePrice).toBeCloseTo(d.resourcePriceBase + d.permitPrice, 9);
  });
  test('nextCrisisFraction, clickValue, age and year are derived', () => {
    const s = model.createState(C);
    const d = D(s);
    expect(d.sectors.steam!.nextCrisisFraction).toBe(0.4);
    expect(steamD(patchSector(s, 'steam', { crisesFired: 2 })).nextCrisisFraction).toBeNull();
    expect(d.clickValue).toBeCloseTo(C.global.clickFlat + C.global.clickSeconds * d.incomePerSec, 12);
    expect(D(patchSector(s, 'steam', { reserve: 0 })).clickValue).toBe(0);
    expect(d.age).toBe('coal');
    expect(d.year).toBe(1780);
  });
});

/* ---------------- 2. projections ---------------- */

describe('projections (P1)', () => {
  test('projectedDecade is null before the reveal and set after it for visible efficiency and capital cards', () => {
    const s = run(steamAt(2, { capital: 1e6 }), 2);
    for (const v of model.upgradeViews(s, C)) expect(v.projectedDecade).toBeNull();
    const r = rich(s);
    for (const v of model.upgradeViews(r, C)) {
      const want = (v.def.kind === 'efficiency' || v.def.kind === 'capital') && v.visible && !v.maxed && !v.excludedBy;
      expect(v.projectedDecade !== null).toBe(want);
      if (!want) expect(v.bringsWithinReach).toEqual([]);
    }
    expect(model.upgradeViews(r, C).find((v) => v.def.id === 'steam.lathe')!.projectedDecade).not.toBeNull();
  });
  test('Better boilers brings Mills within reach when only pumping is founded', () => {
    const s = { ...model.createState(C), flags: { revealed: true, won: false } };
    const v = model.upgradeViews(s, C).find((u) => u.def.id === 'steam.boilers')!;
    // pumping alone is inelastic, so the decade line reads a saving; the within-reach line carries the rebound
    expect(v.projectedDecade!).toBeLessThan(0);
    const mills = v.bringsWithinReach.find((b) => b.appId === 'steam.mills');
    expect(mills).toBeDefined();
    expect(mills!.projectedChange).toBeGreaterThan(0.5);
  });
  test('no application already available is ever listed; lists are ordered by visibleBelow', () => {
    let s = rich(model.createState(C));
    for (let i = 0; i < 6; i++) {
      for (const v of model.upgradeViews(s, C)) {
        for (const b of v.bringsWithinReach) expect(s.sectors.steam.apps[b.appId].available).toBe(false);
        const vb = v.bringsWithinReach.map((b) => C.sectors.steam.applications.find((a) => a.id === b.appId)!.visibleBelow);
        expect([...vb].sort((a, b) => b - a)).toEqual(vb);
      }
      s = run(model.buyUpgrade(s, C, STEAM_EFFICIENCY[i]), 1);
    }
  });
  test('projections are cached per second and cost a few ms for the visible cards', () => {
    const s = rich(run(steamAt(2), 2));
    const t0 = performance.now();
    const a = model.upgradeViews(s, C);
    const t1 = performance.now();
    const b = model.upgradeViews({ ...s, capital: s.capital + 1 }, C);
    const t2 = performance.now();
    expect(b.map((v) => v.projectedDecade)).toEqual(a.map((v) => v.projectedDecade));
    expect(t2 - t1).toBeLessThan(Math.max(2, (t1 - t0) / 4));
    expect(t1 - t0).toBeLessThan(200);
  });
});

/* ---------------- 3. budget ---------------- */

describe('budget lines (P2)', () => {
  test('drawBudget before the reveal is refused; after, it draws at the current R', () => {
    const s = run(steamAt(1), 2);
    expect(model.drawBudget(s, C, 'steam')).toBe(s);
    const rs = rich(s);
    expect(model.drawBudget(rs, C, 'light')).toBe(rs); // closed sector
    const r = model.drawBudget(rich(s), C, 'steam');
    expect(r.sectors.steam.budget).toEqual({ r0: steamD(s).resourceUse, since: s.time, drawnYear: Math.floor(D(s).year) });
    expect(r.news[0].key).toBe('budgetDrawn');
  });
  test('the first lever raise draws a budget; a later raise does not redraw', () => {
    const s = rich(run(steamAt(1), 2));
    const a = model.setLever(s, C, 'steam.circularity', 1);
    expect(a.sectors.steam.budget!.r0).toBeCloseTo(steamD(s).resourceUse, 12);
    const b = model.setLever(run(a, 10), C, 'steam.duty', 1);
    expect(b.sectors.steam.budget).toEqual(a.sectors.steam.budget);
  });
  test('redraw resets the streak and keeps the decades', () => {
    let s = decoupling();
    s = patchSector(s, 'steam', { steadyYears: 15, decadesWithin: [1850] });
    const r = model.drawBudget(s, CALM, 'steam');
    expect(r.sectors.steam.steadyYears).toBe(0);
    expect(r.sectors.steam.decadesWithin).toEqual([1850]);
    expect(r.sectors.steam.budget!.r0).toBeCloseTo(steamD(s, CALM).resourceUse, 12);
  });
  test('budgetR declines by (1 − d) per 10 model years', () => {
    const s = model.drawBudget(rich(run(steamAt(1), 2)), C, 'steam');
    const r0 = s.sectors.steam.budget!.r0;
    expect(steamD(s).budgetR).toBeCloseTo(r0, 12);
    const later = run(s, 200);
    expect(steamD(later).budgetR!).toBeCloseTo(r0 * 0.95, 9);
    // a sector override of the decline
    const C2: Content = { ...C, sectors: { ...C.sectors, steam: { ...C.sectors.steam, steady: { declinePerDecade: 0.2 } } } };
    expect(steamD(later, C2).budgetR!).toBeCloseTo(r0 * 0.8, 9);
  });
  test('a cap at 1.0 keeps withinBudget true (tolerance), and follows the line down', () => {
    let s = rich(run(steamAt(2), 2));
    s = model.setLever(s, C, 'steam.cap', 1);
    s = run(model.buyUpgrade(s, C, 'steam.doubleActing'), 1); // efficiency would push R above the line
    expect(steamD(s).permitPrice).toBeGreaterThan(0);
    expect(steamD(s).withinBudget).toBe(true);
    s = run(s, 400);
    const d = steamD(s);
    expect(d.withinBudget).toBe(true);
    expect(d.resourceUse).toBeLessThan(s.sectors.steam.budget!.r0 * 0.95);
  });
  test('an institution\'s standing cap draws a budget on the first step with demand', () => {
    const meta: MetaState = { ...model.createState(C).meta, institutions: { 'inst.capStanding': 1 }, loadout: ['inst.capStanding'] };
    const s = model.createState(C, meta);
    expect(s.levers['steam.cap'].level).toBe(1);
    expect(s.sectors.steam.budget).toBeNull();
    const t = model.tick(s, C, 1);
    expect(t.sectors.steam.budget!.r0).toBeCloseTo(steamD(s).resourceUse, 12);
    expect(count(t, 'budgetDrawn')).toBe(1);
  });
  test('decoupling needs wellbeing ≥ target', () => {
    const s = decoupling();
    const C2: Content = { ...CALM, global: { ...CALM.global, wellbeingTarget: 1000 } };
    const d = steamD(s, C2);
    expect(d.withinBudget).toBe(true);
    expect(d.decoupling).toBe(false);
    expect(model.tick(s, C2, 1).sectors.steam.steadyYears).toBe(0);
  });
  test('a decade fires its effects and headline once', () => {
    let s = patchSector(decoupling(), 'steam', { steadyYears: 9.99 });
    const d0 = D(s, CALM);
    const t = model.tick(s, CALM, 1);
    expect(t.sectors.steam.decadesWithin).toEqual([Math.floor(d0.year)]);
    expect(t.run.budgetDecades).toBe(1);
    expect(t.mandate - s.mandate).toBeCloseTo(d0.mandatePerSec + 50, 6); // decadeEffects: mandateAdd 50
    expect(count(t, 'decade')).toBe(1);
    expect(t.news.find((n) => n.key === 'decade')!.text).toContain('#1');
    expect(D(t, CALM).wellbeing).toBeGreaterThan(D(s, CALM).wellbeing + 0.5); // standing wellbeingAdd 1
    expect(steamD(t, CALM).budgetDecades).toBe(1);
    const t2 = run(t, 5, CALM);
    expect(t2.sectors.steam.decadesWithin.length).toBe(1);
    expect(count(t2, 'decade')).toBe(1);
    // breaking a streak holding a decade says so
    const broken = model.tick(patchSector(t2, 'steam', { budget: { r0: 1e-9, since: t2.time, drawnYear: 1900 } }), CALM, 1);
    expect(broken.sectors.steam.steadyYears).toBe(0);
    expect(count(broken, 'budgetBroken')).toBe(1);
    expect(broken.sectors.steam.decadesWithin.length).toBe(1);
  });
  test('50 years gives per-sector Steady State; the headline fires once per run even after a break and re-earn', () => {
    let s = patchSector(decoupling(), 'steam', { steadyYears: STEADY_STATE_YEARS - 0.01 });
    s = model.tick(s, CALM, 1);
    expect(s.run.steadySectors.steam).toBe(true);
    expect(s.meta.steadySectors.steam).toBe(true);
    expect(s.meta.achievements.steadyState).toBe(true);
    expect(count(s, 'steadySector')).toBe(1);
    const budget = s.sectors.steam.budget;
    s = model.tick(patchSector(s, 'steam', { budget: { r0: 1e-9, since: s.time, drawnYear: 1900 } }), CALM, 1);
    expect(s.sectors.steam.steadyYears).toBe(0);
    s = patchSector(s, 'steam', { budget: { ...budget!, since: s.time }, steadyYears: STEADY_STATE_YEARS - 0.01 });
    s = model.tick(s, CALM, 1);
    expect(s.sectors.steam.steadyYears).toBeGreaterThanOrEqual(STEADY_STATE_YEARS);
    expect(count(s, 'steadySector')).toBe(1);
  });
  test('firstSteadyEffects adds a slot only the first time ever', () => {
    let s = patchSector(decoupling(), 'steam', { steadyYears: STEADY_STATE_YEARS - 0.01 });
    expect(s.meta.slots).toBe(2);
    s = model.tick(s, CALM, 1);
    expect(s.meta.slots).toBe(3);
    const next = model.reckon(s, CALM);
    expect(next.meta.slots).toBe(3);
    let again = run({ ...steamAt(7, {}, CALM), meta: next.meta, population: 5, flags: { revealed: true, won: false } }, 2, CALM);
    again = patchSector(again, 'steam', { budget: { r0: 1e9, since: again.time, drawnYear: 1800 }, steadyYears: STEADY_STATE_YEARS - 0.01 });
    again = model.tick(again, CALM, 1);
    expect(again.run.steadySectors.steam).toBe(true);
    expect(again.meta.slots).toBe(3);
  });
});

/* ---------------- 4. the win ---------------- */

describe('the win', () => {
  test('needs every sector in sectorOrder open plus 50 years; opening a sector resets steadyYearsAll', () => {
    let s = { ...decoupling(), steadyYearsAll: STEADY_STATE_YEARS - 0.01 };
    s = model.tick(s, CALM, 1);
    expect(s.steadyYearsAll).toBeGreaterThanOrEqual(STEADY_STATE_YEARS);
    expect(s.flags.won).toBe(false);
    // make Light openable: one Reckoning, the condenser owned, enough service delivered
    s = { ...s, meta: { ...s.meta, reckonings: 1 } };
    s = patchSector(s, 'steam', { serviceDelivered: 1e6 });
    expect(D(s, CALM).nextSectors[0]).toMatchObject({ id: 'light', ready: true });
    s = model.tick(s, CALM, 1);
    expect(s.sectors.light.open).toBe(true);
    expect(s.steadyYearsAll).toBe(0);
    expect(s.flags.won).toBe(false);
  });
});

/* ---------------- 5. demography ---------------- */

describe('demography', () => {
  // Wellbeing set exactly by a know-how node (W = level): no service term, no pressure cost.
  const base: Content = {
    ...C,
    sectors: { ...C.sectors, steam: { ...C.sectors.steam, wellbeingWeight: 0, pressureWellbeingCost: 0 } },
    knowhow: [...C.knowhow, { id: 'kh.w', name: 'W', blurb: '', cost: 1, costGrowth: 1, maxLevel: 1000, effects: [{ type: 'wellbeingAdd', value: 0.5 }] }],
  };
  const g = (c: Content, W: number) => {
    const s = model.createState(c, { ...model.createState(c).meta, knowhow: { 'kh.w': Math.round(W * 2) } });
    expect(D(s, c).wellbeing).toBeCloseTo(W, 9);
    return D(s, c).populationGrowthPerSec / s.population;
  };
  test('growth follows the hump, peaks at s + (W_t − s)/√3 and is zero at W ≥ W_t', () => {
    const { popGrowth, subsistence: sub } = base.global;
    const Wt = base.global.demography!.transitionWellbeing;
    for (const W of [10, 20, 26.5, 30, 39.5]) {
      const x = W - sub;
      expect(g(base, W)).toBeCloseTo(popGrowth * x * Math.max(0, 1 - (x / (Wt - sub)) ** 2), 15);
    }
    expect(g(base, Wt)).toBe(0);
    expect(g(base, Wt + 5)).toBe(0);
    const peak = sub + (Wt - sub) / Math.sqrt(3);
    const half = (x: number) => Math.round(x * 2) / 2;
    expect(g(base, half(peak))).toBeGreaterThan(g(base, half(peak - 3)));
    expect(g(base, half(peak))).toBeGreaterThan(g(base, half(peak + 3)));
    expect(g(base, 4)).toBeCloseTo(popGrowth * (4 - sub) * 0.25, 15); // decline at a quarter strength
  });
  test('without demography, v1 linear growth', () => {
    const v1: Content = { ...base, global: { ...base.global, demography: undefined } };
    for (const W of [10, 30, 60]) expect(g(v1, W)).toBeCloseTo(v1.global.popGrowth * (W - v1.global.subsistence), 15);
  });
  test('popGrowthMul (seated institution level) scales growth', () => {
    const meta: MetaState = { ...model.createState(base).meta, knowhow: { 'kh.w': 40 }, institutions: { 'inst.cleanAir': 3 }, loadout: ['inst.cleanAir'] };
    const s = model.createState(base, meta);
    const x = D(s, base).wellbeing - 8;
    expect(D(s, base).wellbeing).toBeCloseTo(22, 9); // 20 + parks' wellbeingAdd 2
    expect(D(s, base).populationGrowthPerSec).toBeCloseTo(0.5 * base.global.popGrowth * x * (1 - (x / 32) ** 2), 15);
  });
});

/* ---------------- 6. lever repeat ---------------- */

describe('lever repeat (P2)', () => {
  const view = (s: GameState, id: string) => model.leverViews(s, C).find((l) => l.def.id === id)!;
  test('synthesised levels follow the formula and stop at the kind\'s range', () => {
    const s = rich(run(steamAt(1), 2));
    const cap = view(s, 'steam.cap');
    expect(cap.maxLevel).toBe(5); // 1.0, 0.8, 0.3, then 0.2, 0.1 (0.0 is below the cap's 0.05)
    let t = model.setLever(s, C, 'steam.cap', 4);
    expect(t.mandate).toBeCloseTo(s.mandate - (120 + 360 + 1000 + 1500), 9);
    const v4 = view(t, 'steam.cap');
    expect(v4.current).toMatchObject({ mandateCost: 1500, mandateUpkeep: 6, value2: 1, label: 'Cap at 20% of budget' });
    expect(v4.current!.value).toBeCloseTo(0.2, 12);
    expect(v4.current!.mandateUpkeep).toBeCloseTo(5 * 1.2, 12);
    expect(v4.next!.value).toBeCloseTo(0.1, 12);
    expect(v4.next!.mandateCost).toBeCloseTo(2250, 9);
    expect(v4.next!.value2).toBe(1);
    expect(v4.upkeep).toBeCloseTo(6, 9);
    t = model.setLever(t, C, 'steam.cap', 5);
    expect(view(t, 'steam.cap').next).toBeNull();
    expect(view(t, 'steam.cap').nextCost).toBeNull();
    expect(model.setLever(t, C, 'steam.cap', 6)).toBe(t);
    // maxSteps bounds sufficiency; value2Step and the default label
    const suf = view(s, 'steam.sufficiency');
    expect(suf.maxLevel).toBe(5);
    const u = model.setLever(s, C, 'steam.sufficiency', 3);
    const v = view(u, 'steam.sufficiency');
    expect(v.current!.value).toBeCloseTo(0.4, 12);
    expect(v.current!.value2).toBeCloseTo(0.025, 12);
    expect(v.current!.label).toBe('0.5 +1');
    expect(v.current!.mandateCost).toBeCloseTo(480, 9);
    // a lever without repeat
    expect(view(s, 'steam.duty').maxLevel).toBe(3);
    expect(model.setLever(s, C, 'steam.duty', 4)).toBe(s);
  });
  test('a repeat level takes effect in the solver (cap at 20% of the line)', () => {
    let s = rich(run(steamAt(3), 2));
    s = model.setLever(s, C, 'steam.cap', 4);
    const d = steamD(s);
    expect(d.resourceUse).toBeLessThan(s.sectors.steam.budget!.r0 * 0.2 * 1.26);
    expect(d.resourceUse).toBeGreaterThan(s.sectors.steam.budget!.r0 * 0.2 * 0.99);
  });
});

/* ---------------- 7. levy ---------------- */

describe('levy and recycling', () => {
  const levied = (recycle?: 'treasury' | 'dividend') => {
    let s = rich(run(steamAt(1), 2));
    s = model.setLever(s, C, 'steam.duty', 2);
    if (recycle) s = model.setLeverRecycle(s, C, 'steam.duty', recycle);
    return run(model.buyUpgrade(model.buyUpgrade(s, C, 'steam.condenser'), C, 'steam.doubleActing'), 1);
  };
  test('income excludes the permit and duty parts', () => {
    let s = model.setLever(levied(), C, 'steam.cap', 3);
    const pc = steamD({ ...s, levers: { ...s.levers, 'steam.duty': { level: 0, ref: 0 } } }).servicePrice;
    s = { ...s, levers: { ...s.levers, 'steam.duty': { ...s.levers['steam.duty'], ref: 1.2 * pc } } };
    const d = steamD(s);
    expect(d.dutyPart).toBeGreaterThan(0);
    expect(d.permitPart).toBeGreaterThan(0);
    expect(d.income).toBeCloseTo(d.margin * d.preLevyPrice * d.demand, 9);
    expect(d.levyRevenue).toBeCloseTo(d.dutyPart * d.demand + d.permitPrice * d.resourceUse, 9);
  });
  test('treasury gives mandateShare × levy to Mandate', () => {
    const s = levied();
    const d = D(s);
    const g = C.global;
    const upkeep = model.leverViews(s, C).reduce((a, l) => a + l.upkeep, 0);
    expect(d.mandatePerSec).toBeCloseTo(g.mandateRate * Math.max(0, d.wellbeing - g.mandateFloor) + 0.1 * d.sectors.steam!.levyRevenue - upkeep, 9);
    expect(model.leverViews(s, C).find((l) => l.def.id === 'steam.duty')!.recycle).toBe('treasury');
  });
  test('dividend gives no Mandate and more wellbeing than treasury at the same levy', () => {
    const a = levied('treasury'), b = model.setLeverRecycle(a, C, 'steam.duty', 'dividend');
    expect(b.levers['steam.duty'].recycle).toBe('dividend');
    const da = D(a), db = D(b);
    expect(db.sectors.steam!.levyRevenue).toBeCloseTo(da.sectors.steam!.levyRevenue, 9);
    // no levy share; only the (higher) wellbeing term moves Mandate
    expect(db.mandatePerSec).toBeCloseTo(da.mandatePerSec - 0.1 * da.sectors.steam!.levyRevenue + C.global.mandateRate * (db.wellbeing - da.wellbeing), 9);
    expect(db.wellbeing).toBeGreaterThan(da.wellbeing);
    expect(model.leverViews(b, C).find((l) => l.def.id === 'steam.duty')!.recycleOptions).toEqual(['treasury', 'dividend']);
  });
  test('setLeverRecycle refuses options the lever does not offer', () => {
    const s = rich(run(steamAt(1), 2));
    expect(model.setLeverRecycle(s, C, 'steam.cap', 'dividend')).toBe(s);
    expect(model.setLeverRecycle(s, C, 'steam.circularity', 'treasury')).toBe(s);
    expect(model.setLeverRecycle(s, C, 'nope', 'treasury')).toBe(s);
    const v = model.leverViews(s, C);
    expect(v.find((l) => l.def.id === 'steam.cap')!.recycleOptions).toEqual(['treasury']);
    expect(v.find((l) => l.def.id === 'steam.circularity')!.recycleOptions).toEqual([]);
    expect(v.find((l) => l.def.id === 'steam.circularity')!.recycle).toBeNull();
  });
});

/* ---------------- 8. conditions and unlocks ---------------- */

describe('conditions (P3)', () => {
  const ALL: StatKey[] = ['time', 'year', 'wellbeing', 'population', 'capital', 'mandate', 'reckonings', 'steadyYearsAll', 'clicks',
    'etaFold', 'rFold', 'frontierFold', 'peakRFold', 'rebound', 'resourceUse', 'demand', 'servicePrice', 'serviceDelivered',
    'reserveFraction', 'pressureFraction', 'crises', 'steadyYears', 'budgetDecades', 'withinBudget', 'appsFounded', 'adoption', 'appDemand'];
  test('every StatKey reads the value derive reports', () => {
    let s = run(openAll(), 3);
    s = model.drawBudget(s, C, 'steam');
    s = model.click(s, C);
    const d = D(s);
    const sd = d.sectors.steam!;
    const want: Record<StatKey, number | null> = {
      time: s.time, year: d.year, wellbeing: d.wellbeing, population: s.population, capital: s.capital, mandate: s.mandate,
      reckonings: 9, steadyYearsAll: s.steadyYearsAll, clicks: 1, etaFold: sd.etaFold, rFold: sd.rFold,
      frontierFold: sd.frontierFold, peakRFold: s.sectors.steam.peakR / s.sectors.steam.baseR, rebound: sd.rebound,
      resourceUse: sd.resourceUse, demand: sd.demand, servicePrice: sd.servicePrice, serviceDelivered: s.sectors.steam.serviceDelivered,
      reserveFraction: sd.reserveFraction, pressureFraction: sd.pressureFraction, crises: s.sectors.steam.crisesFired,
      steadyYears: sd.steadyYears, budgetDecades: sd.budgetDecades, withinBudget: sd.withinBudget ? 1 : 0, appsFounded: 4,
      adoption: sd.apps['steam.mills'].adoption, appDemand: sd.apps['steam.mills'].demand,
    };
    for (const stat of ALL) {
      const leaf = { stat, sector: 'steam', app: 'steam.mills' };
      expect([stat, statValue(s, C, leaf)]).toEqual([stat, want[stat]]);
      expect(evalCond(s, C, { ...leaf, op: '>=', value: -1e300 })).toBe(true);
      expect(evalCond(s, C, { ...leaf, op: '<', value: -1e300 })).toBe(false);
    }
    expect(sd.rebound).not.toBeNull();
  });
  test('scope rules: closed or absent sector, missing scope, null value → false', () => {
    const s = model.createState(C);
    expect(evalCond(s, C, { stat: 'demand', sector: 'light', op: '>=', value: -1 })).toBe(false);
    expect(evalCond(s, C, { stat: 'demand', sector: 'nope', op: '>=', value: -1 })).toBe(false);
    expect(evalCond(s, C, { stat: 'demand', op: '>=', value: -1 })).toBe(false);
    expect(evalCond(s, C, { stat: 'adoption', app: 'light.lamps', op: '>=', value: -1 })).toBe(false);
    expect(evalCond(s, C, { stat: 'rebound', sector: 'steam', op: '<', value: 1e9 })).toBe(false); // null rebound
    expect(evalCond(s, C, { stat: 'nonsense' as StatKey, op: '>=', value: -1 })).toBe(false);
    expect(evalCond(s, C, { stat: 'time', op: '>=', value: 0 })).toBe(true); // global: sector ignored
  });
  test('owns for each kind, flags, combinators, unknown leaves', () => {
    let s = run(steamAt(2, { capital: 1e9, mandate: 1e6, flags: { revealed: true, won: false } }), 2);
    s = model.setLever(s, C, 'steam.duty', 1);
    s = { ...s, meta: { ...s.meta, institutions: { 'inst.stats': 1 }, knowhow: { 'kh.seed': 1 }, achievements: { backfire: true } } };
    for (const id of ['steam.boilers', 'steam.mills', 'steam.duty', 'inst.stats', 'kh.seed', 'backfire']) expect(evalCond(s, C, { owns: id })).toBe(true);
    for (const id of ['steam.turbine', 'light.lamps', 'steam.cap', 'inst.duty', 'kh.patents', 'steadyState', 'ghost']) expect(evalCond(s, C, { owns: id })).toBe(false);
    expect(evalCond(s, C, { flag: 'revealed' })).toBe(true);
    expect(evalCond(s, C, { flag: 'won' })).toBe(false);
    expect(evalCond(s, C, { flag: 'nope' })).toBe(false);
    expect(evalCond(s, C, { all: [] })).toBe(true);
    expect(evalCond(s, C, { any: [] })).toBe(false);
    expect(evalCond(s, C, { not: { flag: 'won' } })).toBe(true);
    expect(evalCond(s, C, { all: [{ flag: 'revealed' }, { any: [{ owns: 'ghost' }, { owns: 'steam.boilers' }] }] })).toBe(true);
    expect(evalCond(s, C, { weird: 1 } as unknown as Cond)).toBe(false);
  });
  test('unlock with `when` (labelled checklist with progress values)', () => {
    let s = run(steamAt(1, { capital: 1e6 }), 2);
    s = { ...s, meta: { ...s.meta, reckonings: 1 } };
    let ns = D(s).nextSectors;
    expect(ns.map((n) => n.id)).toEqual(['light']);
    expect(ns[0].checklist[0]).toEqual({ label: 'Own the Separate condenser', met: false, progress: 0 });
    expect(ns[0].checklist[1].label).toBe('Deliver 2k hp·years of power');
    expect(ns[0].checklist[1].progress).toBeCloseTo(s.sectors.steam.serviceDelivered / 2000, 12);
    expect(ns[0].ready).toBe(false);
    s = model.buyUpgrade(s, C, 'steam.condenser');
    s = patchSector(s, 'steam', { serviceDelivered: 1999 });
    expect(D(s).nextSectors[0].checklist.map((c) => c.met)).toEqual([true, false]);
    expect(model.tick(s, C, 0.1).sectors.light.open).toBe(false);
    s = patchSector(s, 'steam', { serviceDelivered: 2000 });
    ns = D(s).nextSectors;
    expect(ns[0].ready).toBe(true);
    expect(ns[0].checklist.every((c) => c.met && c.progress === 1)).toBe(true);
    const t = model.tick(s, C, 0.1);
    expect(t.sectors.light.open).toBe(true);
    expect(t.meta.sectorsOpened.light).toBe(true);
    expect(t.news.some((n) => n.key === 'sectorOpened' && n.sector === 'light')).toBe(true);
    expect(t.news.some((n) => n.key === 'ageBegins')).toBe(false); // the Coal Age was already open
    // reckonings gate, reported separately
    const noReck = { ...s, meta: { ...s.meta, reckonings: 0 } };
    expect(D(noReck).nextSectors[0]).toMatchObject({ ready: false, reckoningsNeeded: 1, reckoningsHave: 0 });
    expect(model.tick(noReck, C, 0.1).sectors.light.open).toBe(false);
  });
  test('the deprecated price gate, `after`, ageBegins and fallback labels', () => {
    let s = openAll();
    // close motion, compute and code again; light open with an expensive service
    for (const e of ['motion', 'compute', 'code']) s = patchSector(s, e, { open: false });
    s = { ...s, meta: { ...s.meta, reckonings: 2 } };
    s = patchSector(s, 'light', { eta: 0.5 });
    let ns = D(s).nextSectors;
    expect(ns.map((n) => n.id)).toEqual(['motion']); // compute's `after` (motion) is closed
    expect(ns[0].checklist).toHaveLength(1);
    expect(ns[0].checklist[0].label).toBe('Light service price < 0.12');
    expect(ns[0].checklist[0].met).toBe(false);
    expect(ns[0].checklist[0].progress!).toBeGreaterThan(0);
    expect(ns[0].checklist[0].progress!).toBeLessThan(1);
    expect(model.tick(s, C, 0.1).sectors.motion.open).toBe(false);
    s = patchSector(s, 'light', { eta: 1e3 });
    expect(D(s).nextSectors[0].ready).toBe(true);
    const t = model.tick(s, C, 0.1);
    expect(t.sectors.motion.open).toBe(true);
    expect(t.news.some((n) => n.key === 'ageBegins' && n.sector === 'motion')).toBe(true);
    expect(D(t).age).toBe('acceleration');
    // compute's unlabelled `when` and code's unlabelled `all` get plain labels
    const cs = D({ ...t, upgrades: {}, meta: { ...t.meta, reckonings: 9 } }).nextSectors;
    expect(cs.map((n) => n.id)).toEqual(['compute']);
    expect(cs[0].checklist).toEqual([{ label: 'Own motion.injection', met: false, progress: 0 }]);
    const code = D({ ...patchSector(openAll(), 'code', { open: false }) }).nextSectors.find((n) => n.id === 'code')!;
    expect(code.checklist.map((c) => c.label)).toEqual(['Compute applications founded ≥ 1', 'The rebound revealed']);
  });
  test('achievements with `when` are granted; others without `when` are not', () => {
    let s = run(steamAt(3), 2);
    s = patchSector(s, 'steam', { serviceDelivered: 999 });
    s = model.tick(model.tick(s, C, 1), C, 1); // checked against the state at the start of a step
    expect(s.meta.achievements.bigSteam).toBe(true);
    expect(s.meta.achievements.neverGranted).toBeUndefined();
  });
});

/* ---------------- 9. Hindsight ---------------- */

describe('Hindsight (P4)', () => {
  const h = C.global.hindsight;
  test('each term in isolation', () => {
    const s0 = run(steamAt(3), 10);
    const blank = { ...s0.run, wellbeingYears: 0, yearsAtTarget: 0, budgetDecades: 0, firstBackfires: {}, steadySectors: {} };
    const T = (run: Partial<GameState['run']>) => D({ ...s0, run: { ...blank, ...run } }).hindsightTerms;
    const base = T({});
    expect(base.wellbeing).toBe(0);
    expect(base.unburnt).toBe(0);
    expect(base.budget + base.backfire + base.steady + base.sectorsReached).toBe(0);
    const es = s0.sectors.steam;
    const intensity = (s0.run.resourceUsed.steam ?? 0) / es.baseR / es.openFor;
    expect(base.intensity).toBeCloseTo(intensity, 12);
    expect(T({ wellbeingYears: 100 }).wellbeing).toBeCloseTo(h.perWellbeingYear * 100 / Math.max(1, intensity) ** h.intensityExponent, 12);
    expect(T({ budgetDecades: 3 }).budget).toBe(h.perBudgetDecade * 3);
    expect(T({ yearsAtTarget: 25 }).unburnt).toBeCloseTo(h.perUnburnt * (es.reserve / es.reserveMax) * 0.5, 12);
    expect(T({ yearsAtTarget: 500 }).unburnt).toBeCloseTo(h.perUnburnt * (es.reserve / es.reserveMax), 12);
    expect(T({ firstBackfires: { steam: true } }).backfire).toBe(h.perFirstBackfire);
    expect(T({ steadySectors: { steam: true } }).steady).toBe(h.perSteadySector);
    expect(T({ steadySectors: { steam: true } }).total).toBe(h.perSteadySector);
    const all = openAll();
    expect(D(all).hindsightTerms.sectorsReached).toBe(h.perSectorReached * (SECTORS.length - 1));
  });
  test('idle play earns no unburnt term; a Reckoning at t = 1 s earns 1', () => {
    const idle = run(model.createState(C), 600);
    expect(idle.run.yearsAtTarget).toBe(0);
    expect(D(idle).hindsightTerms.unburnt).toBe(0);
    const one = model.tick(model.createState(C), C, 1);
    expect(model.hindsightOnReckon(one, C)).toBe(1);
  });
  test('run stats: wellbeingYears and yearsAtTarget integrate in model years', () => {
    const s = run(steamAt(7, { population: 5 }), 3);
    const W = D(s).wellbeing;
    const t = model.tick(s, C, 1);
    expect(t.run.wellbeingYears - s.run.wellbeingYears).toBeCloseTo((W - C.global.subsistence) * YEARS_PER_SECOND, 9);
    expect(t.run.yearsAtTarget - s.run.yearsAtTarget).toBeCloseTo(W >= C.global.wellbeingTarget ? YEARS_PER_SECOND : 0, 9);
  });
  test('firstBackfires only counts sectors new to meta.backfiredSectors; lastRun carries the terms', () => {
    const play = (meta?: MetaState) => {
      let s = run({ ...steamAt(0, { capital: 1e6 }), ...(meta ? { meta } : {}) }, 2);
      return run(model.buyUpgrade(s, C, 'steam.boilers'), 3);
    };
    const a = play();
    expect(a.sectors.steam.backfired).toBe(true);
    expect(a.run.firstBackfires).toEqual({ steam: true });
    expect(a.meta.backfiredSectors).toEqual({ steam: true });
    expect(D(a).hindsightTerms.backfire).toBe(h.perFirstBackfire);
    const r = model.reckon(a, C);
    expect(r.meta.lastRun!.hindsightTerms!.total).toBe(r.meta.lastRun!.hindsightGained);
    expect(r.meta.lastRun!.hindsightTerms!.backfire).toBe(h.perFirstBackfire);
    expect(r.meta.lastRun!.sectors.steam!.unburnt!).toBeGreaterThan(0.9);
    expect(r.meta.lastRun!.sectors.steam!.decades).toBe(0);
    const b = play(r.meta);
    expect(b.sectors.steam.backfired).toBe(true);
    expect(b.run.firstBackfires).toEqual({});
    expect(D(b).hindsightTerms.backfire).toBe(0);
  });
});

/* ---------------- 10. loadout ---------------- */

describe('institutions and the loadout (P4)', () => {
  const owning = (inst: Record<string, number>, hindsight = 100) => {
    const r = model.reckon(model.createState(C), C);
    return { ...r, meta: { ...r.meta, hindsight, institutions: inst } };
  };
  test('setLoadout: only in a fresh run; refuses over-slot, unowned and duplicate ids', () => {
    const s = owning({ 'inst.stats': 1, 'inst.cleanAir': 1, 'inst.duty': 1 });
    expect(D(s).freshRun).toBe(true);
    expect(model.setLoadout(s, C, ['inst.cleanAir', 'inst.stats'])).toBe(s); // 2 + 1 seats > 2
    expect(model.setLoadout(s, C, ['inst.capStanding'])).toBe(s); // not owned
    expect(model.setLoadout(s, C, ['ghost'])).toBe(s);
    expect(model.setLoadout(s, C, ['inst.stats', 'inst.stats'])).toBe(s);
    const a = model.setLoadout(s, C, ['inst.cleanAir']);
    expect(a.meta.loadout).toEqual(['inst.cleanAir']);
    expect(D(a).slots).toEqual({ total: 2, used: 2 });
    const views = model.institutionViews(a, C);
    expect(views.find((v) => v.def.id === 'inst.cleanAir')).toMatchObject({ seated: true, slots: 2, level: 1, maxLevel: 3, nextCost: 6 });
    expect(views.find((v) => v.def.id === 'inst.stats')).toMatchObject({ seated: false, canSeat: false });
    const ticked = model.tick(s, C, 1);
    expect(D(ticked).freshRun).toBe(false);
    expect(model.setLoadout(ticked, C, ['inst.stats'])).toBe(ticked);
    expect(model.institutionViews(ticked, C).every((v) => !v.canBuy && !v.canSeat)).toBe(true);
  });
  test('unseated institutions do nothing; seated ones apply every owned level; one-offs on institutions are ignored', () => {
    const s = owning({ 'inst.stats': 1, 'inst.cleanAir': 3 });
    expect(s.flags.revealed).toBe(false);
    const a = model.setLoadout(s, C, ['inst.cleanAir']);
    expect(a.mandate).toBe(s.mandate); // mandateAdd 999 on the institution is ignored
    const C0: Content = { ...C, sectors: { ...C.sectors, steam: { ...C.sectors.steam, pressureIntensity: 0 } } };
    const p = model.tick(patchSector(a, 'steam', { pressure: 50 }), C0, 1);
    expect(p.sectors.steam.pressure).toBeCloseTo(50 * Math.exp(-0.02), 9); // 0.01 + 0.005 × 2 levels
    const b = model.setLoadout(s, C, ['inst.stats']);
    expect(b.flags.revealed).toBe(true);
    expect(D(b).wellbeing).toBeLessThan(D(a).wellbeing); // parks (level 3) only while seated
  });
  test('shop purchases are refused mid-run and rebuild the run when fresh', () => {
    const s = owning({});
    const k = model.buyKnowhow(s, C, 'kh.seed');
    expect(k.capital).toBeCloseTo(2 * C.global.startCapital, 9);
    const i = model.buyInstitution(k, C, 'inst.cleanAir');
    expect(i.meta.institutions['inst.cleanAir']).toBe(1);
    expect(i.meta.loadout).toEqual([]); // buying does not seat
    const i2 = model.buyInstitution(i, C, 'inst.cleanAir');
    expect(i2.meta.institutions['inst.cleanAir']).toBe(2);
    expect(i2.meta.hindsight).toBeCloseTo(100 - 1 - 4 - 6, 9);
    expect(model.buyInstitution(s, C, 'inst.duty')).toBe(s); // requires inst.stats
    const mid = model.tick(i2, C, 1);
    expect(model.buyKnowhow(mid, C, 'kh.seed')).toBe(mid);
    expect(model.buyInstitution(mid, C, 'inst.stats')).toBe(mid);
    const bought = { ...model.buyUpgrade({ ...i2, capital: 1e6 }, C, 'steam.boilers') };
    expect(D(bought).freshRun).toBe(false);
    expect(model.buyKnowhow(bought, C, 'kh.seed')).toBe(bought);
  });
  test('a fresh meta has startingSlots seats and an empty loadout', () => {
    const s = model.createState(C);
    expect(s.meta.slots).toBe(2);
    expect(s.meta.loadout).toEqual([]);
    expect(model.createState({ ...C, global: { ...C.global, startingSlots: 5 } }).meta.slots).toBe(5);
  });
});

/* ---------------- 11. Know-how ---------------- */

describe('Know-how trees (P4)', () => {
  const fresh = (hindsight = 100) => {
    const r = model.reckon(model.createState(C), C);
    return { ...r, meta: { ...r.meta, hindsight } };
  };
  const kv = (s: GameState, id: string) => model.knowhowViews(s, C).find((k) => k.def.id === id)!;
  test('tier gate', () => {
    let s = fresh();
    expect(kv(s, 'kh.cornish')).toMatchObject({ requirementsMet: false, canBuy: false });
    expect(model.buyKnowhow(s, C, 'kh.cornish')).toBe(s);
    s = model.buyKnowhow(s, C, 'kh.engines');
    expect(kv(s, 'kh.cornish')).toMatchObject({ requirementsMet: true, canBuy: true, cost: 4 });
  });
  test('branch exclusion is permanent', () => {
    let s = model.buyKnowhow(model.buyKnowhow(fresh(), C, 'kh.engines'), C, 'kh.cornish');
    expect(kv(s, 'kh.manchester')).toMatchObject({ excludedBy: 'kh.cornish', requirementsMet: true, canBuy: false });
    expect(model.buyKnowhow(s, C, 'kh.manchester')).toBe(s);
    expect(kv(s, 'kh.cornish').excludedBy).toBeNull();
    s = model.buyKnowhow(s, C, 'kh.cornish'); // its own second level is fine
    expect(s.meta.knowhow['kh.cornish']).toBe(2);
    const next = model.reckon(s, C);
    expect(kv(next, 'kh.manchester').excludedBy).toBe('kh.cornish');
  });
  test('one-off slotAdd (and mandateAdd) fire on purchase', () => {
    const s = fresh();
    const t = model.buyKnowhow(s, C, 'kh.chair');
    expect(t.meta.slots).toBe(3);
    expect(t.mandate).toBe(s.mandate + 10);
    expect(kv(t, 'kh.chair')).toMatchObject({ maxed: true, cost: null, affordable: false, canBuy: false });
    expect(model.reckon(t, C).meta.slots).toBe(3); // not re-applied by createState
  });
  test('efficiency nodes carry their rebound side-effect (satMul, halfPriceMul)', () => {
    const s = model.buyKnowhow(model.buyKnowhow(fresh(), C, 'kh.engines'), C, 'kh.cornish');
    expect(steamD(s).etaFold).toBeCloseTo(1, 12);
    expect(s.sectors.steam.eta).toBeCloseTo(1.15 * 1.2, 12);
    expect(steamD(s).apps['steam.pumping'].demand).toBeGreaterThan(steamD(fresh()).apps['steam.pumping'].demand * 1.1);
  });
});

/* ---------------- 12. forks and locks ---------------- */

describe('forks and locks (P7)', () => {
  test('excluded both ways, visible but not affordable', () => {
    const s = run(steamAt(1, { capital: 1e6 }), 1);
    const a = model.buyUpgrade(s, C, 'steam.premium');
    const v = model.upgradeViews(a, C).find((u) => u.def.id === 'steam.pirate')!;
    expect(v).toMatchObject({ visible: true, affordable: false, excludedBy: 'steam.premium' });
    expect(model.buyUpgrade(a, C, 'steam.pirate')).toBe(a);
    expect(model.upgradeViews(a, C).find((u) => u.def.id === 'steam.premium')!.excludedBy).toBeNull();
    const b = model.buyUpgrade(s, C, 'steam.pirate');
    expect(model.upgradeViews(b, C).find((u) => u.def.id === 'steam.premium')!.excludedBy).toBe('steam.pirate');
    expect(model.buyUpgrade(b, C, 'steam.premium')).toBe(b);
    // projections skip excluded cards
    expect(model.upgradeViews(rich(b), C).find((u) => u.def.id === 'steam.premium')!.projectedDecade).toBeNull();
  });
  test('"Jevons Was Right" ignores excluded arms', () => {
    let s = run(steamAt(7, { capital: 1e9 }), 2);
    s = model.buyUpgrade(s, C, 'steam.premium');
    s = patchSector(s, 'steam', { peakR: s.sectors.steam.baseR * 11 });
    expect(model.tick(s, C, 1).meta.achievements.jevonsWasRight).toBe(true);
    // with neither arm owned, the set is incomplete
    const t = patchSector(run(steamAt(7, { capital: 1e9 }), 2), 'steam', { peakR: 1e9 });
    expect(model.tick(t, C, 1).meta.achievements.jevonsWasRight).toBeUndefined();
  });
  test('locked upgrades and levers appear only once unlocked; one-offs pay at purchase', () => {
    let s = rich(run(steamAt(2), 1));
    expect(model.upgradeViews(s, C).find((u) => u.def.id === 'steam.superheat')!.visible).toBe(false);
    expect(model.buyUpgrade(s, C, 'steam.superheat')).toBe(s);
    expect(model.leverViews(s, C).find((l) => l.def.id === 'steam.carbonTax')!.visible).toBe(false);
    expect(model.setLever(s, C, 'steam.carbonTax', 1)).toBe(s);
    const income = D(s).incomePerSec;
    const t = model.buyUpgrade(s, C, 'steam.institute');
    expect(t.mandate).toBeCloseTo(s.mandate + 25, 9);
    expect(t.capital).toBeCloseTo(s.capital - 3000 + 10 * income, 6);
    expect(model.upgradeViews(t, C).find((u) => u.def.id === 'steam.superheat')!.visible).toBe(true);
    expect(model.leverViews(t, C).find((l) => l.def.id === 'steam.carbonTax')!.visible).toBe(true);
    expect(model.setLever(t, C, 'steam.carbonTax', 1).levers['steam.carbonTax'].level).toBe(1);
  });
  test('halfPriceMul and satMul effects move demand of one application', () => {
    const s = run(steamAt(2, { capital: 1e9 }), 1);
    const base = steamD(s).apps['steam.railways'].demand;
    expect(steamD(model.buyUpgrade(s, C, 'steam.parliamentary')).apps['steam.railways'].demand).toBeGreaterThan(base);
    expect(steamD(model.buyUpgrade(s, C, 'steam.firstClass')).apps['steam.railways'].demand).toBeCloseTo(base * 0.8, 6);
  });
});

/* ---------------- 13. calendar ---------------- */

describe('calendar (P14)', () => {
  test('the year follows the age, is monotone across a sector opening, and Light opens at ≥ its firstYear', () => {
    let s = run(steamAt(2, { capital: 1e6 }), 100);
    expect(D(s).year).toBeCloseTo(1780 + 100 * YEARS_PER_SECOND, 9);
    s = { ...model.buyUpgrade(s, C, 'steam.condenser'), meta: { ...s.meta, reckonings: 1 } };
    s = patchSector(s, 'steam', { serviceDelivered: 1e6 });
    const before = D(s).year;
    const t = model.tick(s, C, 1);
    expect(t.sectors.light.open).toBe(true);
    expect(D(t).year).toBeGreaterThanOrEqual(before);
    expect(D(t).year).toBeGreaterThanOrEqual(1870);
    expect(Math.floor(D(run(t, 20)).year)).toBe(1871);
    expect(t.news.find((n) => n.key === 'sectorOpened')!.year).toBe(Math.floor(before));
  });
  test('past the age\'s last year the calendar runs at 10% speed', () => {
    const s = patchSector(model.createState(C), 'steam', { openFor: (1914 - 1780 + 20) / YEARS_PER_SECOND });
    expect(D(s).year).toBeCloseTo(1914 + 20 * CALENDAR_LATE_RATE, 9);
  });
  test('without ages, the v1 clock; headlines carry the calendar year and placeholders', () => {
    const bare: Content = { ...C, ages: [] };
    const s = run(model.createState(bare), 60, bare);
    expect(D(s, bare).year).toBeCloseTo(START_YEAR + 60 * YEARS_PER_SECOND, 9);
    expect(D(s, bare).age).toBeNull();
    const c = model.tick(patchSector(run(steamAt(3), 2), 'steam', { pressure: 39.99 }), C, 1);
    const crisis = c.news.find((n) => n.key === 'crisis')!;
    expect(crisis.text).toBe(`Steam crisis 1 in ${crisis.year}`); // sectorHeadlines win over headlines
    const found = c.news.find((n) => n.key === 'appFounded') ?? model.foundApp({ ...model.tick(model.buyUpgrade({ ...model.createState(C), capital: 1e6 }, C, 'steam.boilers'), C, 1), capital: 1e6 }, C, 'steam.mills').news[0];
    expect(found.text).toBe(`appFounded: Steam The Coal Age steam.mills steam resource steam service ${found.year} #`);
  });
});

/* ---------------- 14. migration ---------------- */

describe('persistence v2 and migration from v1', () => {
  /** A hand-written v1 save: Steam open with a cap at L1 (ref 150), Light open, two institutions owned. */
  function v1Save(): Record<string, unknown> {
    const s = run(steamAt(2, { capital: 1e5 }), 30);
    const steam: Record<string, unknown> = { ...s.sectors.steam, steadyYears: 12 };
    for (const k of ['budget', 'serviceDelivered', 'decadesWithin']) delete steam[k];
    steam.backfired = true;
    const light: Record<string, unknown> = { ...model.createState(C).sectors.light, open: true, openFor: 10 };
    delete light.etaAtBase;
    for (const k of ['budget', 'serviceDelivered', 'decadesWithin']) delete light[k];
    return {
      version: 1, seed: 7, time: s.time, capital: 1234, mandate: 55, population: 1.1, peakPopulation: 1.2,
      upgrades: { 'steam.boilers': 1, 'steam.condenser': 1 },
      levers: { 'steam.cap': { level: 1, ref: 150 }, 'steam.sufficiency': { level: 9, ref: 0 } },
      eras: { steam, light, ghost: { open: true } },
      flags: { revealed: true, won: false }, steadyYearsAll: 7,
      news: [{ time: 3, year: 1780, key: 'eraOpened', text: 'x', era: 'steam' }],
      history: [{ time: 0, eras: { steam: [1, 1] }, wellbeing: 5 }],
      run: { peakWellbeing: 20, decoupledYears: 4, resourceUsed: { steam: 1000 }, clicks: 3, steadyEras: { steam: true } },
      meta: {
        hindsight: 9, hindsightEarned: 20, reckonings: 2, knowhow: { 'kh.seed': 1 },
        institutions: { 'inst.stats': true, 'inst.cleanAir': true, 'inst.duty': true }, achievements: { backfire: true },
        steadyEras: { steam: true }, furthestEra: 2, totalSeconds: 999,
        lastRun: { cause: 'exhausted', causeEra: 'steam', seconds: 100, yearReached: 1785, hindsightGained: 4, peakWellbeing: 10, eras: { steam: { etaFold: 2, peakRFold: 3, resourceUsed: 9 } } },
      },
    };
  }
  test('a hand-written v1 save loads and migrates', () => {
    const b = model.deserialize(JSON.stringify(v1Save()), C)!;
    expect(b).not.toBeNull();
    expect(b.version).toBe(2);
    expect(Object.keys(b.sectors).sort()).toEqual([...SECTORS].sort());
    expect(b.sectors.light.open).toBe(true);
    expect(b.sectors.motion.open).toBe(false);
    expect((b as unknown as Record<string, unknown>).eras).toBeUndefined();
    expect(b.history[0].sectors).toEqual({ steam: [1, 1] });
    expect(b.news[0].sector).toBe('steam');
    expect(b.meta.lastRun!.sectors.steam!.etaFold).toBe(2);
    expect(b.meta.lastRun!.causeSector).toBe('steam');
    expect(b.meta.lastRun!.hindsightTerms).toBeUndefined();
    expect(b.meta.steadySectors).toEqual({ steam: true });
    expect(b.run.steadySectors).toEqual({ steam: true });
    expect(b.meta.sectorsOpened).toEqual({ steam: true, light: true });
    expect(b.meta.institutions).toEqual({ 'inst.stats': 1, 'inst.cleanAir': 1, 'inst.duty': 1 });
    // grandfathered: every owned institution stays seated, in content order; seats cover their slots (cleanAir takes 2)
    expect(b.meta.slots).toBe(4);
    expect(b.meta.loadout).toEqual(['inst.stats', 'inst.duty', 'inst.cleanAir']);
    expect(b.meta.backfiredSectors).toEqual({ steam: true });
    expect(b.sectors.steam.budget).toEqual({ r0: 150, since: b.time, drawnYear: Math.floor(D(b).year) });
    expect(b.sectors.light.budget).toBeNull();
    expect(b.sectors.light.etaAtBase).toBe(C.sectors.light.baseEta);
    expect(b.sectors.steam.etaAtBase).toBeGreaterThan(0);
    expect(b.sectors.steam.steadyYears).toBe(0);
    expect(b.sectors.steam.serviceDelivered).toBe(0);
    expect(b.sectors.steam.decadesWithin).toEqual([]);
    expect(b.steadyYearsAll).toBe(0);
    expect(b.run).toMatchObject({ decoupledYears: 0, wellbeingYears: 0, yearsAtTarget: 0, budgetDecades: 0, firstBackfires: {} });
    expect(b.levers['steam.sufficiency'].level).toBe(5);
    expect(b.levers['steam.cap'].recycle).toBeUndefined();
    expect(badNumbers(D(b))).toEqual([]);
    expect(badNumbers(run(b, 30))).toEqual([]);
  });
  test('v1 grandfathering with seats to spare seats everything owned', () => {
    const raw = v1Save();
    (raw.meta as Record<string, unknown>).institutions = { 'inst.stats': true, 'inst.duty': true };
    const b = model.deserialize(JSON.stringify(raw), C)!;
    expect(b.meta.slots).toBe(2);
    expect(b.meta.loadout).toEqual(['inst.stats', 'inst.duty']);
    expect(b.levers['steam.duty'].level).toBe(1); // absent from the save: rebuilt from a fresh state, where the seated standing duty applies
  });
  test('a save from the future is refused; a v2 round-trip is exact', () => {
    const s = run(greedy({ ...steamAt(2), capital: 1e5 }, C), 60);
    expect(model.deserialize(JSON.stringify({ ...JSON.parse(model.serialize(s)), version: 3 }), C)).toBeNull();
    const back = model.deserialize(model.serialize(s), C)!;
    expect(JSON.parse(model.serialize(back))).toEqual(JSON.parse(model.serialize(s)));
  });
});

/* ---------------- 15. purity, determinism, no NaN ---------------- */

describe('long play', () => {
  /** A compact `budget` player: efficiency until the reveal, then a budget, a cap at the line and sufficiency. */
  function budgetPlay(s: GameState, c: Content): GameState {
    s = greedy(s, c);
    if (s.flags.revealed) {
      for (const e of c.sectorOrder) if (s.sectors[e]?.open && !s.sectors[e].budget) s = model.drawBudget(s, c, e);
      for (const id of ['steam.cap', 'steam.sufficiency']) if ((s.levers[id]?.level ?? 0) < 1) s = model.setLever(s, c, id, 1);
    }
    return s;
  }
  function leverPlay(s: GameState, c: Content): GameState {
    s = greedy(s, c);
    for (const lv of model.leverViews(s, c)) if (lv.canRaise) s = model.setLever(s, c, lv.def.id, lv.level + 1);
    return s;
  }
  for (const [name, play] of [['efficiency', greedy], ['budget', budgetPlay], ['levers', leverPlay]] as const) {
    test(`no NaN or Infinity after 3 h of ${name} play at dt = 1, deterministic`, () => {
      const go = () => {
        let s = model.createState(C, undefined, 3);
        for (let t = 0; t < 3 * 3600; t++) {
          s = model.tick(s, C, 1);
          if (t % 5 === 0) s = play(s, C);
          if (D(s).pendingReckoning) s = model.reckon(s, C);
          if (t % 900 === 0) expect(badNumbers(s)).toEqual([]);
        }
        return s;
      };
      const s = go();
      expect(badNumbers(s)).toEqual([]);
      expect(badNumbers(D(s))).toEqual([]);
      expect(badNumbers(model.upgradeViews(s, C))).toEqual([]);
      expect(badNumbers(model.leverViews(s, C))).toEqual([]);
      expect(model.serialize(go())).toBe(model.serialize(s));
    }, 120_000);
  }
});
