// M2 mechanism tests (6–8 of briefs/m2-core.md): the Commons, the Market, the Civil Service and Treasury rules.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, GameState, MetaState } from '../types';
import { model } from './index';
import { fixture as C } from './fixture';
import { D, patchSector, run, steamAt, steamD, openAll, decoupling, CALM } from './m1.testkit';
import { freshMeta } from './state';

const ev = (s: GameState, kind: string) => s.events.filter((e) => e.kind === kind);
const metaWith = (patch: Partial<MetaState>): MetaState => ({ ...freshMeta(C), ...patch });

/* ---------------- 6. the Commons ---------------- */

describe('M2 the Commons', () => {
  const opened = (): GameState => {
    const s = openAll();
    return { ...s, meta: { ...s.meta, reckonings: 2 }, capital: 1e6, mandate: 1e3 };
  };
  test('closed before fromReckoning; wellbeing max × (1 − exp(−L·perLevel/max)), never above max', () => {
    const closed = { ...openAll(), capital: 1e6, mandate: 1e3, meta: { ...openAll().meta, reckonings: 1 } };
    expect(model.commonsViews(closed, C).every((v) => !v.visible && !v.canBuy)).toBe(true);
    expect(model.buyCommons(closed, C, 'commons.baths')).toBe(closed);
    let s = opened();
    const w0 = D(s).wellbeing;
    s = model.buyCommons(s, C, 'commons.library');
    expect(D(s).commons.wellbeing).toBeCloseTo(6 * (1 - Math.exp(-2 / 6)), 9);
    expect(D(s).wellbeing).toBeGreaterThan(w0);
    for (let i = 0; i < 5; i++) s = model.buyCommons(s, C, 'commons.baths');
    const v = model.commonsViews(s, C).find((x) => x.def.id === 'commons.baths')!;
    expect(v.level).toBe(5);
    expect(v.maxed).toBe(true);
    expect(v.cost).toBeNull();
    expect(v.wellbeing).toBeCloseTo(10 * (1 - Math.exp(-0.5)), 9);
    expect(v.wellbeing).toBeLessThan(10);
    expect(model.buyCommons(s, C, 'commons.baths')).toBe(s);
    expect(ev(s, 'commonsBuilt').pop()).toMatchObject({ id: 'commons.baths', n: 5, by: 'player' });
    expect(s.news[0].text).toContain('Baths');
  });
  test('intensity adds price-proof demand and R in its sector; the satMul time rebound raises that app', () => {
    const s = opened();
    const a = D(s).sectors.light!;
    const t = model.buyCommons(s, C, 'commons.library');
    const b = D(t).sectors.light!;
    expect(b.demand - a.demand).toBeCloseTo(0.5 * s.population, 6);
    expect(b.resourceUse).toBeGreaterThan(a.resourceUse);
    expect(model.commonsViews(t, C).find((x) => x.def.id === 'commons.library')!.intensityNow).toBeCloseTo(0.5 * s.population, 9);
    const p = model.buyCommons(s, C, 'commons.park');
    expect(D(p).sectors.light!.apps['light.lamps'].demand).toBeGreaterThan(a.apps['light.lamps'].demand);
  });
  test('the fund pays first; commons recycling is refused before the Commons open, then fills the fund', () => {
    let s = { ...opened(), capital: 1000, commons: { levels: {}, fund: 300 } };
    s = model.buyCommons(s, C, 'commons.baths'); // 500: 300 from the fund, 200 from capital; Mandate 10; one-off +5
    expect(s.commons.fund).toBe(0);
    expect(s.capital).toBeCloseTo(800, 9);
    expect(s.mandate).toBeCloseTo(1e3 - 10 + 5, 9);
    // recycle
    const early = { ...run(steamAt(3, { flags: { revealed: true, won: false } }), 2), mandate: 1e3 };
    const d0 = model.setLever(early, C, 'steam.duty', 1);
    const duty = { ...d0, levers: { ...d0.levers, 'steam.duty': { ...d0.levers['steam.duty'], ref: 10 * d0.levers['steam.duty'].ref } } };
    expect(model.setLeverRecycle(duty, C, 'steam.duty', 'commons')).toBe(duty);
    expect(model.leverViews(duty, C).find((l) => l.def.id === 'steam.duty')!.recycleChoices.find((c) => c.option === 'commons')!.available).toBe(false);
    const open = { ...duty, meta: { ...duty.meta, reckonings: 2 } };
    const rc = model.setLeverRecycle(open, C, 'steam.duty', 'commons');
    expect(rc.levers['steam.duty'].recycle).toBe('commons');
    expect(model.setLeverRecycle(rc, C, 'steam.duty', 'commons')).toBe(rc); // already in force
    const levy = D(rc).sectors.steam!.levyRevenue;
    expect(levy).toBeGreaterThan(0);
    const t = model.tick(rc, C, 1);
    expect(t.commons.fund).toBeCloseTo(levy, 6);
    // a Reckoning wipes the levels and the fund
    const built = model.buyCommons(opened(), C, 'commons.library');
    const next = model.reckon(built, C);
    expect(next.commons).toEqual({ levels: {}, fund: 0 });
  });
});

/* ---------------- 7. the Market ---------------- */

describe('M2 the Market', () => {
  /** In the fixture, Steam's early demand is price-inelastic, so efficiency lowers income and a payback rule never buys
   *  it. Here every Steam efficiency card also raises the margin, so the Market has paybacks to rank. */
  const MKT: Content = {
    ...C, upgrades: C.upgrades.map((u) => (u.sector === 'steam' && u.kind === 'efficiency' && !u.excludes
      ? { ...u, effects: [...u.effects, { type: 'marginAdd' as const, sector: 'steam', value: 0.05 }] } : u)),
  };
  /** Run 2, the player has bought Better boilers (the mills are within reach): the Market has something to do. */
  const run2 = (capital = 2e4, extra: Partial<MetaState> = {}): GameState => {
    const s = model.createState(MKT, metaWith({ reckonings: 1, ...extra }), 3);
    const b = model.tick(model.buyUpgrade({ ...s, capital: 1e3 }, MKT, 'steam.boilers'), MKT, 0.5);
    return { ...b, capital };
  };
  const wide = (s: GameState) => model.setOrders(s, MKT, { market: { paybackMax: 86400 } });
  test('inert in run 1; in run 2 it buys at order ticks only, one action per sector, shortest payback first', () => {
    const r1 = { ...model.createState(C), capital: 2e4 };
    const one = run(model.setOrders(r1, MKT, { market: { paybackMax: 86400 } }), 25, MKT);
    expect(one.run.automated).toBe(0);
    let s = wide(run2());
    expect(D(s, MKT).orders.market.available).toBe(true);
    expect(D(s, MKT).orders.nextTickIn).toBeCloseTo(19.5, 9);
    // between ticks nothing
    const t1 = run(s, 19, MKT);
    expect(t1.time).toBeCloseTo(19.5, 9);
    expect(t1.run.automated).toBe(0);
    // the expected first buy: shortest payback among affordable eligible candidates
    const income0 = D(t1, MKT).incomePerSec;
    let best = { id: '', pb: Infinity };
    for (const a of MKT.sectors.steam.applications) {
      const n = model.foundApp(t1, MKT, a.id);
      if (n === t1) continue;
      const g = D(n, MKT).incomePerSec - income0;
      if (g > 0 && a.foundCost / g < best.pb) best = { id: a.id, pb: a.foundCost / g };
    }
    for (const u of model.upgradeViews({ ...t1, flags: { ...t1.flags, revealed: false } }, MKT)) {
      if (!u.affordable || (u.def.kind !== 'efficiency' && u.def.kind !== 'capital') || u.def.excludes?.length) continue;
      const g = D(model.buyUpgrade(t1, MKT, u.def.id), MKT).incomePerSec - income0;
      if (g > 0 && u.cost / g < best.pb) best = { id: u.def.id, pb: u.cost / g };
    }
    s = model.tick(t1, MKT, 1);
    expect(s.run.automated).toBe(1);
    expect(s.run.decisions).toBe(t1.run.decisions);
    expect(s.run.opening.at(-1)).toMatchObject({ id: best.id, by: 'market' });
    expect(s.events.some((e) => (e.kind === 'upgradeBought' || e.kind === 'appFounded') && e.id === best.id && e.by === 'market')).toBe(true);
    expect(s.run.automatedByDecade).toEqual([1]);
    expect(best.id).not.toBe('');
  });
  test('never a fork arm, research or prospect; never a settled or switched-off sector', () => {
    let s = wide(run2(1e7));
    s = run(s, 400, MKT);
    const bought = s.run.opening.filter((a) => a.by === 'market').map((a) => a.id);
    expect(bought.length).toBeGreaterThan(3);
    const kinds = bought.map((id) => MKT.upgrades.find((u) => u.id === id)?.kind ?? 'found');
    expect(kinds.every((k) => k === 'efficiency' || k === 'capital' || k === 'found')).toBe(true);
    expect(bought.some((id) => MKT.upgrades.find((u) => u.id === id)?.excludes)).toBe(false);
    const off = run(model.setOrders(wide(run2(1e7)), MKT, { market: { sectors: { steam: false } } }), 100, MKT);
    expect(off.run.automated).toBe(0);
    expect(D(off, MKT).orders.market.sectors).toEqual({ steam: false });
  });
  test('tick (1 s) and fastForward (5 s) over the same ten minutes buy the same ids; projections ignore the Market', () => {
    const s = wide(run2(5e3));
    // no hold here (the fixture holds before a crisis, which would stop the catch-up early)
    const NOHOLD: Content = { ...MKT, global: { ...MKT.global, offline: { capSeconds: 28800, holdBefore: null } } };
    const a = run(s, 600, NOHOLD);
    const b = model.fastForward(s, NOHOLD, 600);
    expect(b.time).toBeCloseTo(a.time, 9);
    const ids = (x: GameState) => x.run.opening.filter((o) => o.by === 'market').map((o) => o.id).sort();
    const A = ids(a), B = ids(b);
    const diff = A.filter((x) => !B.includes(x)).length + B.filter((x) => !A.includes(x)).length;
    expect(A.length).toBeGreaterThan(2);
    expect(diff).toBeLessThanOrEqual(1);
    expect(b.lastOffline!.marketBuys).toBe(B.length);
    // projections: identical with the Market on and off
    const rv = { ...a, flags: { ...a.flags, revealed: true } };
    const on = model.upgradeViews({ ...rv, upgrades: { ...rv.upgrades } }, MKT).map((v) => v.projectedDecade);
    const offS = model.setOrders(rv, MKT, { market: { on: false } });
    const offV = model.upgradeViews({ ...offS, upgrades: { ...offS.upgrades } }, MKT).map((v) => v.projectedDecade);
    expect(on).toEqual(offV);
  });
  test('setOrders validates, merges and counts as a decision only after the run has started', () => {
    const s = model.createState(MKT, metaWith({ reckonings: 1 }), 3);
    expect(model.setOrders(s, MKT, { market: { paybackMax: 120 } })).toBe(s); // no change
    const f = model.setOrders(s, MKT, { market: { paybackMax: 1e9, sectors: { steam: false, nowhere: true } } });
    expect(f.meta.orders.market.paybackMax).toBe(86400);
    expect(f.meta.orders.market.sectors).toEqual({ steam: false });
    expect(f.run.decisions).toBe(0); // fresh run
    const live = run(s, 1, MKT);
    const g = model.setOrders(live, MKT, { civilService: { levers: { steam: ['steam.cap', 'light.greenSpending', 'steam.cap'] } }, treasury: { projects: ['commons.baths', 'nope'], keepSeconds: -5 } });
    expect(g.meta.orders.civilService.levers).toEqual({ steam: ['steam.cap'] });
    expect(g.meta.orders.treasury).toMatchObject({ projects: ['commons.baths'], keepSeconds: 0 });
    expect(g.run.decisions).toBe(live.run.decisions + 1);
    // orders survive a Reckoning
    expect(model.reckon(g, MKT).meta.orders).toEqual(g.meta.orders);
  });
});

/* ---------------- 8. the Civil Service and Treasury rules ---------------- */

describe('M2 Civil Service and Treasury rules', () => {
  test('unavailable without orderUnlock; raises the cheapest listed lever when over the line, lowers per the rule', () => {
    const base = { ...run(steamAt(5, { flags: { revealed: true, won: false } }), 2), mandate: 1e4 };
    const R = steamD(base).resourceUse;
    const over = (s: GameState) => patchSector(s, 'steam', { budget: { r0: R * 0.5, since: s.time, drawnYear: 1800, w0: 1e3, p0: 0, pace: 'gentle' } });
    const orders = { civilService: { on: true, levers: { steam: ['steam.cap', 'steam.sufficiency'] } } };
    const plain = model.setOrders(over(base), C, orders);
    expect(D(plain).orders.civilService.available).toBe(false);
    expect(run(plain, 20).run.automated).toBe(0);
    const meta = { ...base.meta, institutions: { 'inst.civil': 1 }, loadout: ['inst.civil'] };
    const s = model.setOrders(over({ ...base, meta }), C, orders);
    expect(D(s).orders.civilService.available).toBe(true);
    const t = run(s, 20);
    expect(t.levers['steam.sufficiency'].level).toBe(1); // 80 < 120
    expect(t.levers['steam.cap']?.level ?? 0).toBe(0);
    expect(t.run.automated).toBe(1);
    expect(ev(t, 'leverEnacted').pop()).toMatchObject({ id: 'steam.sufficiency', by: 'civilService' });
    // lowering: W below the decade threshold and R ≤ 0.9 budgetR: the costliest listed lever comes down one level
    const W = D(base).wellbeing;
    const HI: Content = { ...C, global: { ...C.global, wellbeingTarget: W + 5, demography: { transitionWellbeing: W + 20 } } };
    let low = patchSector({ ...base, meta }, 'steam', { budget: { r0: R * 5, since: base.time, drawnYear: 1800, w0: 1e3, p0: 0, pace: 'gentle' } });
    low = { ...low, levers: { ...low.levers, 'steam.cap': { level: 1, ref: 0 }, 'steam.sufficiency': { level: 1, ref: 0 } } };
    low = model.setOrders(low, HI, orders);
    const l2 = run(low, 20, HI);
    expect(l2.levers['steam.cap'].level).toBe(0);
    expect(l2.levers['steam.sufficiency'].level).toBe(1);
  });
  test('Treasury rules keep keepSeconds of income and buy in priority order (Commons open)', () => {
    let s = openAll();
    const meta = { ...s.meta, reckonings: 2, institutions: { 'inst.treasury': 1 }, loadout: ['inst.treasury'] };
    s = { ...s, meta, mandate: 1e3 };
    s = model.setOrders(s, C, { treasury: { on: true, projects: ['commons.baths', 'commons.library'], keepSeconds: 60 } });
    const inc = D(s).incomePerSec;
    const poor = { ...s, capital: 0 };
    expect(run(poor, 20).commons.levels['commons.baths']).toBeUndefined();
    const rich = { ...s, capital: 60 * inc + 600 };
    const t = run(rich, 20);
    expect(t.commons.levels['commons.baths']).toBe(1);
    expect(t.run.automated).toBe(1);
    expect(ev(t, 'commonsBuilt').pop()).toMatchObject({ id: 'commons.baths', by: 'treasury' });
    expect(D(t).offlineCapSeconds).toBe(8 * 3600 + 3600); // offlineCapAdd
    void decoupling; void CALM;
  });
});
