// M5 (Core B): hidden flow (applied vs consumed water), the subsidy's rebound (E6, criterion 15), caps on each gauge,
// the charge (fixed when enacted; revenue; recycle), the shadow freezing r, the regime label.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, GameState } from '../types';
import { model } from './index';
import { computeFlows, instruments } from './flows';
import { freshMeta } from './state';
import { fixtureM5B, fixturePlenty, officeMeta } from './fixture.m5b';

const P = fixturePlenty;
function ministry(c: Content = P): GameState {
  const s = model.createState(c, officeMeta(c, freshMeta(c)), 7);
  return { ...s, mandate: 10_000, flags: { ...s.flags, revealed: true } };
}
const run = (s: GameState, secs: number, c: Content = P): GameState => { let x = s; for (let i = 0; i < secs; i++) x = model.tick(x, c, 1); return x; };
const water = (s: GameState, c: Content = P) => model.derive(s, c).sectors.plenty.water!;

describe('M5 hidden flow', () => {
  test('consumed = applied × (1 − r); the price follows applied; drip lowers r; r floored and clamped', () => {
    const s = ministry();
    const w = water(s);
    expect(w.returnShare).toBe(0.5);
    expect(w.consumed).toBeCloseTo(w.applied * 0.5, 9);
    expect(model.derive(s, P).sectors.plenty.resourceUse).toBe(w.consumed); // R is the consumed figure
    const d = { ...s, upgrades: { 'plenty.pivot': 1, 'plenty.drip': 1 } };
    expect(water(d).returnShare).toBeCloseTo(0.5 * 0.45, 12);
    const deep = { ...s, upgrades: { 'plenty.pivot': 1, 'plenty.drip': 1 } } as GameState;
    const c2: Content = { ...P, upgrades: P.upgrades!.map((u) => u.id === 'plenty.drip' ? { ...u, effects: [{ type: 'returnShareMul', sector: 'plenty', value: 0.01 }] } : u) };
    expect(water(deep, c2).returnShare).toBe(0.05); // the floor
    // a sector without hiddenFlow: no water view, R as M4
    expect(model.derive(ministry(fixtureM5B), fixtureM5B).sectors.motor.water).toBeNull();
  });
  test('criterion 15 / E6: the drip subsidy at level 2 cuts applied ≥ 10% and raises consumed ≥ 10% within 30 model years', () => {
    const off = run(ministry(), 600);
    let on = model.setLever(ministry(), P, 'plenty.subsidy', 2);
    on = run(on, 600);
    expect(off.upgrades['plenty.drip'] ?? 0).toBe(0);
    expect(on.upgrades['plenty.drip']).toBe(1);
    const a = water(off), b = water(on);
    expect(b.applied / a.applied).toBeLessThanOrEqual(0.9);
    expect(b.consumed / a.consumed).toBeGreaterThanOrEqual(1.1);
  });
  test('the subsidy charges the Treasury its share of the rival purchase', () => {
    let s = model.setLever(ministry(), P, 'plenty.subsidy', 2);
    s = { ...s, capital: 1e5, chair: { ...s.chair!, confidence: 90 } }; // the first poll is won (a lost one repeals the only lever)
    let drop = 0;
    for (let i = 0; i < 400 && !(s.upgrades['plenty.drip'] > 0); i++) {
      const n = model.tick(s, P, 1);
      if (n.upgrades['plenty.drip'] > 0) drop = s.capital + model.derive(s, P).incomePerSec - n.capital;
      s = n;
    }
    expect(drop).toBeCloseTo(0.6 * 20_000, -1); // the Treasury paid 60% of the card
    expect(s.upgrades['plenty.drip']).toBe(1);
    const ev = s.events!.find((e) => e.kind === 'upgradeBought' && e.id === 'plenty.drip')!;
    expect(ev.by).toBe('rival');
  });
  test('a licence on APPLIED water holds applied while consumed rises as r falls; a cap on CONSUMED holds consumed', () => {
    let s = run(ministry(), 30);
    s = model.setLever(s, P, 'plenty.licence', 1);
    s = run(s, 10);
    const before = water(s);
    const drip = { ...s, upgrades: { ...s.upgrades, 'plenty.pivot': 1, 'plenty.drip': 1 } };
    const d2 = run(drip, 2);
    const after = water(d2);
    expect(after.applied).toBeLessThanOrEqual(before.applied * 1.02);
    expect(after.consumed).toBeGreaterThan(before.consumed * 1.15);
    let c = run(ministry(), 30);
    c = model.setLever(c, P, 'plenty.consumptionCap', 1);
    c = run(c, 10);
    const cb = water(c);
    const cd = run({ ...c, upgrades: { ...c.upgrades, 'plenty.pivot': 1, 'plenty.drip': 1 } }, 2);
    expect(water(cd).consumed).toBeLessThanOrEqual(cb.consumed * 1.02);
  });
  test('the shadow freezes the return share at its baseline (returnAtBase)', () => {
    const s = run(ministry(), 5);
    expect(s.sectors.plenty.returnAtBase).toBe(0.5);
    const d = { ...s, upgrades: { 'plenty.pivot': 1, 'plenty.drip': 1 } };
    const ins = instruments(d, P, computeFlows(d, P), 'plenty');
    const f = computeFlows(d, P).sectors.plenty;
    // the shadow (η and r at base) burns the applied water at r = 0.5; the true burn is at r = 0.225
    expect(ins.shadowR).toBeLessThan(f.R);
  });
});

describe('M5 the charge', () => {
  const M = fixtureM5B;
  test('chargePart = value × ref (ref = p_s at enactment), fixed as η rises; revenue = part × D, × levyShare to the Treasury', () => {
    let s = run(ministry(M), 20, M);
    const ps0 = computeFlows(s, M).sectors.motor.ps;
    s = model.setLever(s, M, 'motor.charge', 1);
    expect(s.levers['motor.charge'].ref).toBeCloseTo(ps0, 9);
    const f = computeFlows(s, M).sectors.motor;
    expect(f.chargePart).toBeCloseTo(0.1 * ps0, 9);
    expect(f.chargeRevenue).toBeCloseTo(f.chargePart! * f.D, 6);
    expect(f.ps).toBeCloseTo(f.pPre + f.permitPart + f.dutyPart + f.chargePart!, 9);
    const eta = { ...s, upgrades: { ...s.upgrades, 'motor.carburettor': 1 } };
    expect(computeFlows(model.tick(eta, M, 1), M).sectors.motor.chargePart).toBeCloseTo(0.1 * ps0, 9);
    expect(model.derive(s, M).sectors.motor.chargePart).toBeCloseTo(0.1 * ps0, 9);
    // treasury recycle: the levy routed 'treasury' carries it
    expect(computeFlows(s, M).treasuryLevy).toBeGreaterThanOrEqual(f.chargeRevenue! - 1e-9);
    const div = model.setLeverRecycle(s, M, 'motor.charge', 'dividend');
    expect(computeFlows(div, M).treasuryLevy).toBeCloseTo(computeFlows(s, M).treasuryLevy - f.chargeRevenue!, 6);
  });
  test('a water charge on CONSUMED water: per unit consumed, ref = the resource price', () => {
    let s = run(ministry(fixtureM5B), 10, fixtureM5B);
    const pr = computeFlows(s, fixtureM5B).sectors.plenty.prBase;
    s = model.setLever(s, fixtureM5B, 'plenty.charge', 1);
    expect(s.levers['plenty.charge'].ref).toBeCloseTo(pr, 9);
    const f = computeFlows(s, fixtureM5B).sectors.plenty;
    expect(f.chargePart! * f.D).toBeCloseTo(0.2 * pr * f.R, 6); // revenue = value × ref × consumed water
  });
  test('the regime label: elastic above the half price, saturated below', () => {
    const d = model.derive(ministry(), P).sectors.plenty;
    expect(d.apps['plenty.grain'].regime).toBe('saturated');
    expect(d.apps['plenty.orchards'].regime).toBe('elastic');
  });
});
