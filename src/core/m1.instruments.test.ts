// M1 mechanisms (briefs/m1-core.md, "Required tests"), against src/core/fixture.ts: the shadow instruments,
// projections, demography, conditions, the calendar and headline placeholders.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model, evalCond, statValue, substitute } from './index';
import { fixture as C, STEAM_EFFICIENCY } from './fixture';
import { CALENDAR_LATE_RATE, START_YEAR, YEARS_PER_SECOND } from '../types';
import { CALENDAR_CATCHUP_SECONDS, CALENDAR_LATE_SPAN } from './calendar';
import type { Cond, Content, MetaState, StatKey } from '../types';
import { patchSector, steamAt, run, D, steamD, rich, openAll } from './m1.testkit';

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
      decisions: s.run.decisions, automated: s.run.automated, commonsLevels: 0, sectorsSettled: 0,
      leanDecades: sd.leanDecades, fullDecades: sd.budgetDecades - sd.leanDecades, settled: 0, clear: sd.clear ? 1 : 0,
      clearYears: sd.clearYears,
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

/* ---------------- 13. calendar ---------------- */

describe('calendar (P14)', () => {
  // QA fix B3: the calendar used to jump to Light's firstYear (1810 → 1870) the moment Light opened. It now catches up
  // with Light's clock smoothly over CALENDAR_CATCHUP_SECONDS from the year Light opened in: continuous, never backwards.
  test('the year follows the age, never jumps or runs backwards when a sector opens, and catches up with Light\'s firstYear', () => {
    let s = run(steamAt(2, { capital: 1e6 }), 100);
    expect(D(s).year).toBeCloseTo(1780 + 100 * YEARS_PER_SECOND, 9);
    s = { ...model.buyUpgrade(s, C, 'steam.condenser'), meta: { ...s.meta, reckonings: 1 } };
    s = patchSector(s, 'steam', { serviceDelivered: 1e6 });
    const before = D(s).year;
    let t = model.tick(s, C, 1);
    expect(t.sectors.light.open).toBe(true);
    expect(t.news.find((n) => n.key === 'sectorOpened')!.year).toBe(Math.floor(before));
    // No jump: a second of play moves the calendar by a second's worth, give or take the catch-up's first moment.
    expect(D(t).year).toBeGreaterThanOrEqual(before);
    expect(D(t).year - before).toBeLessThan(0.2);
    // Monotone, and never faster than about a year a second (no step of more than a year between ticks).
    let prev = D(t).year;
    for (let i = 0; i < CALENDAR_CATCHUP_SECONDS; i++) {
      t = model.tick(t, C, 1);
      const y = D(t).year;
      expect(y).toBeGreaterThanOrEqual(prev);
      expect(y - prev).toBeLessThan(1.5);
      prev = y;
    }
    // Caught up: Light's own clock (firstYear + openFor × YEARS_PER_SECOND) from here on.
    expect(D(t).year).toBeCloseTo(1870 + t.sectors.light.openFor * YEARS_PER_SECOND, 6);
    expect(model.yearAt(t, C, t.time)).toBeCloseTo(D(t).year, 9);
  });
  // QA fix B3: past the Age's last year the calendar slows to CALENDAR_LATE_RATE (as before) and then levels off, never
  // more than CALENDAR_LATE_SPAN years past it (the Coal Age once read 2109 after a long absence).
  test('past the age\'s last year the calendar slows to 10% speed and levels off', () => {
    const at = (yrs: number) => D(patchSector(model.createState(C), 'steam', { openFor: (1914 - 1780 + yrs) / YEARS_PER_SECOND })).year;
    expect(at(0)).toBeCloseTo(1914, 6);
    expect((at(2) - at(0)) / 2).toBeCloseTo(CALENDAR_LATE_RATE, 2);
    expect(at(20)).toBeGreaterThan(1915.8);
    expect(at(20)).toBeLessThan(1916);
    for (const yrs of [200, 2000]) { expect(at(yrs)).toBeLessThan(1914 + CALENDAR_LATE_SPAN); expect(at(yrs)).toBeGreaterThan(at(yrs / 10)); }
    expect(at(1e6)).toBeLessThanOrEqual(1914 + CALENDAR_LATE_SPAN);
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
    // M1 balance fix: {age} lower-cases a leading "The" mid-sentence (case-aware substitution; was "The Coal Age").
    expect(found.text).toBe(`appFounded: Steam the Coal Age steam.mills steam resource steam service ${found.year} #`);
  });
});

describe('M1 balance fix 3: case-aware headline placeholders', () => {
  test('common nouns lower-case mid-sentence and stay as authored at the start of a sentence', () => {
    const v = { resource: 'Coal', service: 'Motive power', app: 'Cotton mills', sector: 'Steam', age: 'The Coal Age', year: '1850', n: '2' };
    expect(substitute('Efficiency gains to ease demand for {resource}, experts agree', v)).toBe('Efficiency gains to ease demand for coal, experts agree');
    expect(substitute('{resource} runs dry; price “no longer meaningful”', v)).toBe('Coal runs dry; price “no longer meaningful”');
    expect(substitute('Cheap {service} makes {app} a going concern', v)).toBe('Cheap motive power makes cotton mills a going concern');
    expect(substitute('“{app}” opens. {resource} orders double', v)).toBe('“Cotton mills” opens. Coal orders double');
    expect(substitute('Investors flock to {sector}; nobody mentions {resource}', v)).toBe('Investors flock to Steam; nobody mentions coal');
    expect(substitute('Welcome to {age}. Mind the step', v)).toBe('Welcome to the Coal Age. Mind the step');
    expect(substitute('{age} begins, by most accounts, in {year}', v)).toBe('The Coal Age begins, by most accounts, in 1850');
    expect(substitute('Ledger: {sector} at {n}, {unknown}', v)).toBe('Ledger: Steam at 2, {unknown}');
  });
  test('acronyms and later proper nouns survive', () => {
    expect(substitute('Rush for {resource}', { resource: 'GPU time' })).toBe('Rush for GPU time');
    expect(substitute('Rush for {resource}', { resource: 'Power from Kent' })).toBe('Rush for power from Kent');
  });
  test('real headlines go through it', () => {
    const s = model.foundApp({ ...model.tick(model.buyUpgrade({ ...model.createState(C), capital: 1e6 }, C, 'steam.boilers'), C, 1), capital: 1e6 }, C, 'steam.mills');
    expect(s.news[0].text).not.toMatch(/\{\w+\}/);
  });
});
