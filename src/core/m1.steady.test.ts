// M1 mechanisms (briefs/m1-core.md, "Required tests"), against src/core/fixture.ts: budget lines, Steady State
// and the win, lever repeat, levy and recycling, long play.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model } from './index';
import { fixture as C } from './fixture';
import { STEADY_STATE_YEARS, YEARS_PER_SECOND } from '../types';
import type { Content, GameState, MetaState } from '../types';
import { patchSector, steamAt, run, D, steamD, rich, greedy, CALM, decoupling, count, badNumbers } from './m1.testkit';

/* ---------------- 3. budget ---------------- */

describe('budget lines (P2)', () => {
  test('drawBudget before the reveal is refused; after, it draws at the current R', () => {
    const s = run(steamAt(1), 2);
    expect(model.drawBudget(s, C, 'steam')).toBe(s);
    const rs = rich(s);
    expect(model.drawBudget(rs, C, 'light')).toBe(rs); // closed sector
    const r = model.drawBudget(rich(s), C, 'steam');
    expect(r.sectors.steam.budget).toEqual({ r0: steamD(s).resourceUse, since: s.time, drawnYear: Math.floor(D(s).year), w0: D(s).wellbeing, p0: s.sectors.steam.pressure, pace: 'gentle' });
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
    // M2 CHANGE: a sector's declinePerDecade only shapes the implicit pace, so the fixture's global paces are removed here
    const C2: Content = {
      ...C, global: { ...C.global, steady: { ...C.global.steady!, paces: undefined } },
      sectors: { ...C.sectors, steam: { ...C.sectors.steam, steady: { declinePerDecade: 0.2 } } },
    };
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
    const broken = model.tick(patchSector(t2, 'steam', { budget: { r0: 1e-9, since: t2.time, drawnYear: 1900, w0: 1e3, p0: 0, pace: "gentle" } }), CALM, 1);
    expect(broken.sectors.steam.steadyYears).toBe(0);
    expect(count(broken, 'budgetBroken')).toBe(1);
    expect(broken.sectors.steam.decadesWithin.length).toBe(1);
  });
  test('50 years gives per-sector Steady State; the headline fires once per run even after a break and re-earn', () => {
    let s = patchSector(decoupling(), 'steam', { steadyYears: STEADY_STATE_YEARS - 0.01, clearYears: STEADY_STATE_YEARS - 0.01 });
    s = model.tick(s, CALM, 1);
    expect(s.run.steadySectors.steam).toBe(true);
    expect(s.meta.steadySectors.steam).toBe(true);
    expect(s.meta.achievements.steadyState).toBe(true);
    expect(count(s, 'steadySector')).toBe(1);
    const budget = s.sectors.steam.budget;
    s = model.tick(patchSector(s, 'steam', { budget: { r0: 1e-9, since: s.time, drawnYear: 1900, w0: 1e3, p0: 0, pace: "gentle" } }), CALM, 1);
    expect(s.sectors.steam.steadyYears).toBe(0);
    s = patchSector(s, 'steam', { budget: { ...budget!, since: s.time }, steadyYears: STEADY_STATE_YEARS - 0.01, clearYears: STEADY_STATE_YEARS - 0.01 });
    s = model.tick(s, CALM, 1);
    expect(s.sectors.steam.steadyYears).toBeGreaterThanOrEqual(STEADY_STATE_YEARS);
    expect(count(s, 'steadySector')).toBe(1);
  });
  test('firstSteadyEffects adds a slot only the first time ever', () => {
    let s = patchSector(decoupling(), 'steam', { steadyYears: STEADY_STATE_YEARS - 0.01, clearYears: STEADY_STATE_YEARS - 0.01 });
    expect(s.meta.slots).toBe(2);
    s = model.tick(s, CALM, 1);
    expect(s.meta.slots).toBe(3);
    const next = model.reckon(s, CALM);
    expect(next.meta.slots).toBe(3);
    let again = run({ ...steamAt(7, {}, CALM), meta: next.meta, population: 5, flags: { revealed: true, won: false } }, 2, CALM);
    again = patchSector(again, 'steam', { budget: { r0: 1e9, since: again.time, drawnYear: 1800, w0: 1e3, p0: 0, pace: "gentle" }, steadyYears: STEADY_STATE_YEARS - 0.01, clearYears: STEADY_STATE_YEARS - 0.01 });
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
    expect(model.leverViews(b, C).find((l) => l.def.id === 'steam.duty')!.recycleOptions).toEqual(['treasury', 'dividend', 'commons']);
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

/* ---------------- 16. M1 balance fixes ---------------- */

describe('M1 balance fix 1: the budget line holds once Steady State is earned', () => {
  const withSteady = (c: Content, patch: Partial<NonNullable<Content['global']['steady']>>): Content =>
    ({ ...c, global: { ...c.global, steady: { ...c.global.steady!, ...patch } } });
  /** CALM with a reserve that lasts for centuries. */
  const DEEP: Content = { ...CALM, sectors: { ...CALM.sectors, steam: { ...CALM.sectors.steam, reserve: 1e12 } } };
  test('the line declines until the streak crosses 50 years, then holds level for the rest of the run', () => {
    let s = patchSector(decoupling(DEEP), 'steam', { steadyYears: STEADY_STATE_YEARS - 5, clearYears: STEADY_STATE_YEARS - 5 });
    const b0 = s.sectors.steam.budget!;
    s = run(s, 99, DEEP);
    expect(s.sectors.steam.budget!.heldAt).toBeUndefined();
    s = run(s, 3, DEEP);
    const heldAt = s.sectors.steam.budget!.heldAt!;
    expect(heldAt).toBeGreaterThan(b0.since);
    const heldLevel = b0.r0 * Math.pow(0.95, ((heldAt - b0.since) * YEARS_PER_SECOND) / 10);
    expect(heldLevel).toBeLessThan(b0.r0);
    expect(steamD(s, DEEP).budgetR!).toBeCloseTo(heldLevel, 9);
    const much = run(s, 2000, DEEP); // 100 more model years
    expect(much.time).toBe(s.time + 2000);
    expect(steamD(much, DEEP).budgetR!).toBeCloseTo(heldLevel, 9);
    expect(much.sectors.steam.steadyYears).toBeGreaterThan(STEADY_STATE_YEARS + 100);
  });
  test('a held line survives a broken streak; a redraw starts a new, declining line', () => {
    let s = patchSector(decoupling(), 'steam', { steadyYears: STEADY_STATE_YEARS - 0.01, clearYears: STEADY_STATE_YEARS - 0.01 });
    s = model.tick(s, CALM, 1);
    const held = s.sectors.steam.budget!;
    expect(held.heldAt).toBeDefined();
    const C2: Content = { ...CALM, global: { ...CALM.global, wellbeingTarget: 1000 } };
    const broken = run(s, 400, C2);
    expect(broken.sectors.steam.steadyYears).toBe(0);
    expect(steamD(broken, C2).budgetR!).toBeCloseTo(steamD(s, C2).budgetR!, 9);
    const redrawn = model.drawBudget(broken, C2, 'steam');
    expect(redrawn.sectors.steam.budget!.heldAt).toBeUndefined();
    const r0 = redrawn.sectors.steam.budget!.r0;
    const later = run(redrawn, 100, C2);
    expect(steamD(later, C2).budgetR!).toBeCloseTo(r0 * Math.pow(0.95, ((later.time - redrawn.time) * YEARS_PER_SECOND) / 10), 9);
    expect(later.time).toBeGreaterThan(redrawn.time);
  });
  test('budgetFloor stops the decline at a fraction of r0 (global, with a sector override)', () => {
    const s = model.drawBudget(rich(run(steamAt(1), 2)), C, 'steam');
    const r0 = s.sectors.steam.budget!.r0;
    const later = run(s, 4000); // 20 decades: 0.95^20 ≈ 0.36
    expect(steamD(later).budgetR!).toBeCloseTo(r0 * Math.pow(0.95, 20), 6);
    const F = withSteady(C, { budgetFloor: 0.6 });
    expect(steamD(later, F).budgetR!).toBeCloseTo(r0 * 0.6, 9);
    expect(steamD(run(s, 200), F).budgetR!).toBeCloseTo(r0 * 0.95, 9); // above the floor: unchanged
    const F2: Content = { ...F, sectors: { ...F.sectors, steam: { ...F.sectors.steam, steady: { budgetFloor: 0.5 } } } };
    expect(steamD(later, F2).budgetR!).toBeCloseTo(r0 * 0.5, 9);
  });
  test('a heldAt in a save round-trips', () => {
    let s = patchSector(decoupling(), 'steam', { steadyYears: STEADY_STATE_YEARS - 0.01, clearYears: STEADY_STATE_YEARS - 0.01 });
    s = model.tick(s, CALM, 1);
    const back = model.deserialize(model.serialize(s), CALM)!;
    expect(back.sectors.steam.budget).toEqual(s.sectors.steam.budget);
  });
});

describe('M1 balance fix 2: a standing cap draws its line across a grown economy', () => {
  const meta = (): MetaState => ({ ...model.createState(C).meta, institutions: { 'inst.capStanding': 1 }, loadout: ['inst.capStanding'] });
  const LATE: Content = { ...C, global: { ...C.global, steady: { ...C.global.steady!, standingDrawYears: 20 } } };
  test('with standingDrawYears the cap waits that many model years, then draws at the R of that moment', () => {
    let s = model.createState(LATE, meta());
    expect(s.levers['steam.cap'].level).toBe(1);
    s = run(s, 400, LATE); // 20 years open; the next step draws
    expect(s.sectors.steam.budget).toBeNull();
    expect(steamD(s, LATE).permitPrice).toBe(0); // no line, no cap
    const rNow = steamD(s, LATE).resourceUse;
    s = run(s, 1, LATE);
    expect(s.sectors.steam.budget).not.toBeNull();
    expect(s.sectors.steam.budget!.r0).toBeCloseTo(rNow, 6);
    expect(count(s, 'budgetDrawn')).toBe(1);
  });
  test('a sector override of standingDrawYears wins over the global one', () => {
    const O: Content = { ...LATE, sectors: { ...LATE.sectors, steam: { ...LATE.sectors.steam, steady: { standingDrawYears: 0 } } } };
    expect(model.tick(model.createState(O, meta()), O, 1).sectors.steam.budget).not.toBeNull();
  });
  test('before that, Tightening the standing cap (or drawing explicitly) draws the line at once', () => {
    let s = rich(run(model.createState(LATE, meta()), 10, LATE));
    expect(s.sectors.steam.budget).toBeNull();
    const t = model.setLever(s, LATE, 'steam.cap', 2);
    expect(t.sectors.steam.budget!.r0).toBeCloseTo(steamD(s, LATE).resourceUse, 9);
    const u = model.drawBudget(s, LATE, 'steam');
    expect(u.sectors.steam.budget!.r0).toBeCloseTo(steamD(s, LATE).resourceUse, 9);
  });
  test('any lever raise draws a missing budget (not only from level 0); an existing budget is never redrawn by a lever', () => {
    let s = rich(run(steamAt(1), 2));
    s = { ...s, levers: { ...s.levers, 'steam.circularity': { level: 1, ref: 0 } } };
    expect(s.sectors.steam.budget).toBeNull();
    const a = model.setLever(s, C, 'steam.circularity', 2);
    expect(a.sectors.steam.budget!.r0).toBeCloseTo(steamD(s).resourceUse, 12);
    const b = model.setLever(run(a, 10), C, 'steam.circularity', 3);
    expect(b.sectors.steam.budget).toEqual(a.sectors.steam.budget);
  });
});
