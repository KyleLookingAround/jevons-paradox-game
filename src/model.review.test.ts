// Independent review of src/model.ts against src/types.ts and briefs/model.md.
// Each `defect:` test failed before the fix in model.ts; `verify:` tests cover paths the original suite left untested.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model } from './model';
import { fixture as C, FOUNDED, STEAM_EFFICIENCY } from './fixture';
import { STEADY_STATE_YEARS } from './types';
import type { Content, SectorId, GameState, MetaState } from './types';

const SECTORS = C.sectorOrder;

function patchSector(s: GameState, e: SectorId, patch: Partial<GameState['sectors'][SectorId]>): GameState {
  return { ...s, sectors: { ...s.sectors, [e]: { ...s.sectors[e], ...patch } } };
}
function foundAll(s: GameState, c: Content, e: SectorId): GameState {
  const apps = { ...s.sectors[e].apps };
  for (const a of c.sectors[e].applications) apps[a.id] = { ...FOUNDED, peakD: apps[a.id]?.peakD ?? 0 };
  return patchSector(s, e, { apps });
}
const run = (s: GameState, c: Content, secs: number, dt = 1) => {
  for (let t = 0; t < secs - 1e-9; t += dt) s = model.tick(s, c, dt);
  return s;
};
function greedy(s: GameState, c: Content): GameState {
  for (const v of model.upgradeViews(s, c)) if (v.visible && v.affordable) s = model.buyUpgrade(s, c, v.def.id);
  for (const e of SECTORS) if (s.sectors[e]?.open) for (const a of c.sectors[e].applications) s = model.foundApp(s, c, a.id);
  return s;
}
function openAll(c: Content = C, maxSeconds = 40): GameState {
  const meta: MetaState = { ...model.createState(c).meta, reckonings: 9 };
  let s = { ...model.createState(c, meta), capital: 1e15 };
  for (let i = 0; i < maxSeconds && !SECTORS.every((e) => s.sectors[e].open); i++) s = greedy(model.tick(greedy(s, c), c, 1), c);
  return s;
}
const finiteNonNeg = (x: number) => Number.isFinite(x) && x >= 0;

/* ------------------------------------------------------------------ */

describe('review: hard cap', () => {
  // Every Steam application locked in at 90% of its peak: demand cannot fall below 0.9 × peak at any price.
  const LOCKED: Content = {
    ...C, sectors: { ...C.sectors, steam: { ...C.sectors.steam, applications: C.sectors.steam.applications.map((a) => ({ ...a, lockIn: 0.9 })) } },
  };
  const lockedEconomy = () => {
    let s = foundAll(model.createState(LOCKED), LOCKED, 'steam');
    s = { ...s, capital: 1e6, mandate: 1e6, flags: { revealed: true, won: false } };
    return run(s, LOCKED, 20);
  };

  test('defect: a cap below locked-in demand must not send the permit price (and income) to infinity', () => {
    const s = lockedEconomy();
    const before = model.derive(s, LOCKED);
    const capped = model.derive(model.setLever(s, LOCKED, 'steam.cap', 3), LOCKED);
    const e = capped.sectors.steam!;
    // Before the fix: p_s ≈ 2.5e24, income ≈ 9e25 £/s.
    expect(e.servicePrice).toBeLessThan(before.sectors.steam!.servicePrice * 20);
    expect(capped.incomePerSec).toBeLessThan(before.incomePerSec * 20);
    // R cannot go below the locked-in floor, whatever the permit costs
    expect(e.resourceUse).toBeGreaterThanOrEqual(0.9 * before.sectors.steam!.resourceUse * 0.99);
    expect(e.resourceUse).toBeLessThanOrEqual(before.sectors.steam!.resourceUse);
  });

  test('verify: an attainable cap still binds exactly (with duty and substitution on as well)', () => {
    let s = foundAll(model.createState(C), C, 'steam');
    s = { ...s, upgrades: { [STEAM_EFFICIENCY[0]]: 1, [STEAM_EFFICIENCY[1]]: 1 }, mandate: 1e6, flags: { revealed: true, won: false } };
    s = run(s, C, 5);
    const r0 = model.derive(s, C).sectors.steam!.resourceUse;
    s = model.setLever(s, C, 'steam.cap', 2); // 0.8 × the budget line, drawn at r0 by this raise
    s = model.setLever(s, C, 'steam.duty', 1);
    s = model.setLever(s, C, 'steam.substitution', 1);
    const e = model.derive(s, C).sectors.steam!;
    expect(e.resourceUse).toBeLessThanOrEqual(0.8 * r0 * 1.001);
    expect(finiteNonNeg(e.servicePrice) && finiteNonNeg(e.resourcePrice)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

describe('review: damaged saves', () => {
  test('defect: non-numeric / negative / out-of-range levels and stats in a save are sanitised', () => {
    let s = run(foundAll({ ...model.createState(C), capital: 1e5 }, C, 'steam'), C, 20);
    s = { ...s, meta: { ...s.meta, knowhow: { 'kh.engines': 1 } } };
    const raw = JSON.parse(model.serialize(s));
    raw.upgrades['steam.boilers'] = 'x';
    raw.upgrades['steam.condenser'] = -2;
    raw.upgrades['steam.deeperShaft'] = 99; // maxLevel 3
    raw.run.resourceUsed.steam = 'abc';
    raw.meta.knowhow['kh.engines'] = 'lots';
    raw.meta.knowhow['kh.seed'] = 1e9; // maxLevel 5
    raw.meta.institutions['inst.stats'] = 'yes';
    raw.meta.institutions['inst.cleanAir'] = 99; // max level 3
    raw.meta.loadout = ['inst.cleanAir', 'inst.cleanAir', 'ghost', 'inst.stats'];
    raw.sectors.steam.budget = { r0: 'x' };
    raw.sectors.steam.decadesWithin = [1800, 'y'];
    raw.levers['steam.cap'] = { level: 99, ref: 0, recycle: 'dividend' }; // max 5; caps offer treasury only
    raw.meta.achievements.backfire = 1;
    raw.levers['steam.duty'] = 5;
    const b = model.deserialize(JSON.stringify(raw), C)!;
    expect(b).not.toBeNull();
    expect(b.upgrades['steam.boilers']).toBeUndefined();
    expect(b.upgrades['steam.condenser']).toBeUndefined();
    expect(b.upgrades['steam.deeperShaft']).toBe(3);
    expect(b.meta.knowhow['kh.engines']).toBeUndefined();
    expect(b.meta.knowhow['kh.seed']).toBe(5);
    expect(b.meta.institutions['inst.stats']).toBeUndefined();
    expect(b.meta.institutions['inst.cleanAir']).toBe(3);
    expect(b.meta.loadout).toEqual(['inst.cleanAir']);
    expect(b.sectors.steam.budget).toBeNull();
    expect(b.sectors.steam.decadesWithin).toEqual([1800]);
    expect(b.levers['steam.cap']).toEqual({ level: 5, ref: 0 });
    expect(b.levers['steam.duty']).toEqual({ level: 0, ref: 0 });
    const t = model.tick(b, C, 1);
    expect(Number.isFinite(t.sectors.steam.eta)).toBe(true);
    expect(typeof t.run.resourceUsed.steam).toBe('number');
    expect(Number.isFinite(t.run.resourceUsed.steam!)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

describe('review: dt-scaling', () => {
  test('defect: sufficiency drift is exact in dt (exp), so offline 5 s steps match 0.1 s play', () => {
    let s = foundAll(model.createState(C), C, 'steam');
    s = { ...s, mandate: 1e6, flags: { revealed: true, won: false } };
    s = model.setLever(s, C, 'steam.sufficiency', 2); // target 0.5, rate 0.02/s
    const a = model.fastForward(s, C, 100); // 20 steps of 5 s
    const b = run(s, C, 100, 0.1);
    const exact = 0.5 + 0.5 * Math.exp(-0.02 * 100);
    expect(a.sectors.steam.apps['steam.mills'].satMul).toBeCloseTo(exact, 6);
    expect(b.sectors.steam.apps['steam.mills'].satMul).toBeCloseTo(exact, 6);
  });
});

/* ------------------------------------------------------------------ */

describe('review: Steady State across all sectors (end to end)', () => {
  /** M1: every open sector within a generous budget line, wellbeing high. */
  function decouplingEverywhere(c: Content = C): GameState {
    let s = openAll(c);
    for (const e of SECTORS) expect(s.sectors[e].open).toBe(true);
    for (const e of SECTORS) s = patchSector(s, e, { openFor: 500, pressure: 0 });
    const d = model.derive(s, c);
    for (const e of SECTORS) s = patchSector(s, e, { budget: { r0: 3 * d.sectors[e]!.resourceUse + 1, since: s.time, drawnYear: 1900 } });
    expect(d.wellbeing).toBeGreaterThanOrEqual(c.global.wellbeingTarget);
    return s;
  }

  test('verify: steadyYearsAll accrues while every era decouples, and 50 years sets flags.won with a steadyAll headline', () => {
    let s = decouplingEverywhere();
    const t1 = model.tick(s, C, 1);
    expect(t1.steadyYearsAll).toBeCloseTo(0.05, 9);
    s = { ...s, steadyYearsAll: STEADY_STATE_YEARS - 0.01 };
    const t = model.tick(s, C, 1);
    expect(t.flags.won).toBe(true);
    expect(t.news.some((n) => n.key === 'steadyAll')).toBe(true);
    // won is sticky and does not re-announce
    const t2 = model.tick(t, C, 1);
    expect(t2.flags.won).toBe(true);
    expect(t2.news.filter((n) => n.key === 'steadyAll').length).toBe(1);
    // and one sector failing the test resets the all-sector counter
    const broken = patchSector(t2, 'light', { budget: { r0: 1e-6, since: t2.time, drawnYear: 1900 } });
    expect(model.tick(broken, C, 1).steadyYearsAll).toBe(0);
  });

  test('defect (contract): steadyYearsAll counts years in which every OPEN sector decouples (types.ts), won still needs all of sectorOrder', () => {
    // Only Steam open, decoupling: types.ts says the counter accrues; the win still needs every sector.
    const C2: Content = { ...C, sectors: { ...C.sectors, steam: { ...C.sectors.steam, pressureIntensity: 0 } } };
    let s = foundAll(model.createState(C2), C2, 'steam');
    s = { ...s, population: 5, upgrades: Object.fromEntries(STEAM_EFFICIENCY.map((id) => [id, 1])) };
    s = run(s, C2, 2);
    s = patchSector(s, 'steam', { budget: { r0: 3 * model.derive(s, C2).sectors.steam!.resourceUse, since: s.time, drawnYear: 1800 } });
    expect(model.derive(s, C2).sectors.steam!.decoupling).toBe(true);
    const t = model.tick({ ...s, steadyYearsAll: STEADY_STATE_YEARS - 0.01 }, C2, 1);
    expect(t.steadyYearsAll).toBeGreaterThan(STEADY_STATE_YEARS - 0.01);
    expect(t.flags.won).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

describe('review: Reckoning arithmetic and createState with meta', () => {
  test('verify (M1 formula): hindsight = max(1, round(wellbeing/intensity + decades + unburnt + first backfires + sectors + steady))', () => {
    let s = openAll();
    const open = SECTORS.filter((e) => s.sectors[e].open).length;
    s = {
      ...s, run: {
        ...s.run, wellbeingYears: 300, yearsAtTarget: 25, budgetDecades: 3, steadySectors: { steam: true, light: false },
        firstBackfires: { steam: true, motion: true },
      },
    };
    const h = C.global.hindsight;
    let burn = 0, openFor = 0, unburnt = 0;
    for (const e of SECTORS) {
      const es = s.sectors[e];
      if (es.baseR > 0 && es.openFor > 0) { burn += (s.run.resourceUsed[e] ?? 0) / es.baseR; openFor += es.openFor; }
      if (C.sectors[e].resourceKind === 'stock') unburnt += es.reserve / es.reserveMax;
    }
    const intensity = burn / openFor;
    const expected = Math.round(h.perWellbeingYear * 300 / Math.max(1, intensity) ** h.intensityExponent + h.perBudgetDecade * 3
      + h.perUnburnt * unburnt * 0.5 + h.perFirstBackfire * 2 + h.perSectorReached * (open - 1) + h.perSteadySector * 1);
    const terms = model.derive(s, C).hindsightTerms;
    expect(terms.intensity).toBeCloseTo(intensity, 9);
    expect(terms.total).toBe(expected);
    expect(model.hindsightOnReckon(s, C)).toBe(expected);
    const r = model.reckon(s, C);
    expect(r.meta.hindsight).toBe(s.meta.hindsight + expected);
    expect(r.meta.hindsightEarned).toBe(s.meta.hindsightEarned + expected);
    expect(r.meta.lastRun!.hindsightGained).toBe(expected);
    expect(model.hindsightOnReckon(model.createState(C), C)).toBe(1);
    expect(r.meta.lastRun!.hindsightTerms).toEqual(terms);
  });

  test('verify: createState applies knowhow and institutions (capital, cost, η baseline, reveal, standing lever, absorption)', () => {
    const meta: MetaState = {
      ...model.createState(C).meta, knowhow: { 'kh.seed': 2, 'kh.patents': 1, 'kh.engines': 2 },
      institutions: { 'inst.stats': 1, 'inst.duty': 1, 'inst.cleanAir': 1 }, slots: 4,
      loadout: ['inst.stats', 'inst.duty', 'inst.cleanAir'],
    };
    const s = model.createState(C, meta);
    expect(s.capital).toBeCloseTo(50 * 4, 9);
    expect(s.sectors.steam.eta).toBeCloseTo(1.15 ** 2, 9);
    expect(model.derive(s, C).sectors.steam!.etaFold).toBeCloseTo(1, 9);
    expect(model.upgradeViews(s, C).find((u) => u.def.id === 'steam.boilers')!.cost).toBeCloseTo(360, 9);
    expect(s.flags.revealed).toBe(true);
    expect(s.levers['steam.duty'].level).toBe(1);
    // absorption 0.01 + 0.005: pressure decays at 1.5% a second with no source
    const C0: Content = { ...C, sectors: { ...C.sectors, steam: { ...C.sectors.steam, pressureIntensity: 0 } } };
    const p = model.tick(patchSector(model.createState(C0, meta), 'steam', { pressure: 50 }), C0, 1);
    expect(p.sectors.steam.pressure).toBeCloseTo(50 * Math.exp(-0.015), 9);
  });
});

/* ------------------------------------------------------------------ */

describe('review: solver at extreme values', () => {
  test('verify: finite, non-negative, flow utilisation < 1, caps respected, across η / N / pressure extremes', () => {
    const base = { ...openAll(), mandate: 1e12, flags: { revealed: true, won: false } };
    const leverSets: Record<string, number>[] = [
      {},
      Object.fromEntries(C.levers.map((l) => [l.id, l.levels.length])),
      { 'steam.cap': 3, 'steam.substitution': 2, 'steam.duty': 3 },
    ];
    for (const eta of [1e-3, 1, 1e6, 1e100]) {
      for (const N of [0.01, 1, 1e6]) {
        for (const pressure of [0, 1e9]) {
          for (const ls of leverSets) {
            let s: GameState = { ...base, population: N };
            for (const [id, lv] of Object.entries(ls)) s = model.setLever(s, C, id, lv);
            for (const e of SECTORS) s = patchSector(s, e, { eta, pressure: e === 'code' ? pressure : 0 });
            const d = model.derive(s, C);
            for (const e of SECTORS) {
              const x = d.sectors[e]!;
              for (const v of [x.demand, x.resourceUse, x.servicePrice, x.resourcePrice, x.income]) expect(finiteNonNeg(v)).toBe(true);
            }
            expect(d.sectors.code!.reserveFraction).toBeGreaterThan(0);
            expect(Number.isFinite(d.incomePerSec) && Number.isFinite(d.wellbeing)).toBe(true);
          }
        }
      }
    }
  });
});
