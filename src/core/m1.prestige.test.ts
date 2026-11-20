// M1 mechanisms (briefs/m1-core.md, "Required tests"), against src/core/fixture.ts: Hindsight, Institutions
// and the loadout, Know-how trees, forks and locks, persistence v2 and the v1 migration.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model } from './index';
import { fixture as C } from './fixture';
import { YEARS_PER_SECOND } from '../types';
import type { Content, GameState, MetaState } from '../types';
import { SECTORS, patchSector, steamAt, run, D, steamD, rich, greedy, openAll, badNumbers } from './m1.testkit';

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
    expect(b.version).toBe(6); // M5: v1 chains through v2, v3, v4 and v5 to v6
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
    expect(b.sectors.steam.budget).toEqual({ r0: 150, since: b.time, drawnYear: Math.floor(D(b).year), w0: D(b).wellbeing, p0: b.sectors.steam.pressure, pace: 'gentle' });
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
  test('a save from the future is refused; a v5 round-trip is exact', () => {
    const s = run(greedy({ ...steamAt(2), capital: 1e5 }, C), 60);
    expect(model.deserialize(JSON.stringify({ ...JSON.parse(model.serialize(s)), version: 7 }), C)).toBeNull();
    const back = model.deserialize(model.serialize(s), C)!;
    expect(JSON.parse(model.serialize(back))).toEqual(JSON.parse(model.serialize(s)));
  });
});
