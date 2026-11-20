// M4 (finish): the order book widens demand (ApplicationDef.feeds[].satMul), foreign fleets fill the room the home
// fleet leaves (ForeignDef.room), letters stake Hindsight (EffectDef 'hindsightShare'). Against fixtureM4, varied.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content } from '../types';
import { computeFlows } from './flows';
import { model } from './index';
import { depletionSinkR } from './renewable';
import { hindsightTerms, termsSum } from './hindsight';
import { applyM3OneOffs, fireOneOffs } from './effects';
import type { OneOffs } from './effects';
import { C4, D4, openWith, run4 } from './m4.testkit';
const run4Ticks = (s: import('../types').GameState, n: number) => run4(s, n, C4);

/** fixtureM4 with Iron's Rails also widening one of Steam's uses (and every Steam use, a second variant). */
const withSat = (sat: number, app?: string): Content => ({
  ...C4,
  sectors: {
    ...C4.sectors,
    iron: { ...C4.sectors.iron, applications: C4.sectors.iron.applications.map((a) => (a.id === 'iron.rails' ? { ...a, feeds: [{ sector: 'steam', capCostMul: 0.8, satMul: sat, ...(app ? { app } : {}) }] } : a)) },
  },
});

describe('M4 (finish): demand feeds', () => {
  const steamApps = C4.sectors.steam.applications.map((a) => a.id);
  const founded = [...steamApps, 'iron.rails'];
  test('satMul 1 (or absent) changes nothing', () => {
    const a = D4(openWith(C4, ['steam', 'iron'], founded), C4);
    const c1 = withSat(1);
    const b = D4(openWith(c1, ['steam', 'iron'], founded), c1);
    expect(b.sectors.steam!.resourceUse).toBe(a.sectors.steam!.resourceUse);
  });
  test('a demand feed raises the target’s R, more with the source’s use adopted; on one use only when `app` is named', () => {
    const base = D4(openWith(C4, ['steam', 'iron'], founded), C4).sectors.steam!.resourceUse;
    const cAll = withSat(2), cOne = withSat(2, steamApps[steamApps.length - 1]);
    const all = D4(openWith(cAll, ['steam', 'iron'], founded), cAll).sectors.steam!.resourceUse;
    const one = D4(openWith(cOne, ['steam', 'iron'], founded), cOne).sectors.steam!.resourceUse;
    expect(all).toBeGreaterThan(base);
    expect(one).toBeGreaterThan(base);
    expect(one).toBeLessThan(all);
  });
  test('the full account hands the feeding use’s R to the target and conserves totals; nothing acts without the source', () => {
    const c = withSat(2);
    const s = openWith(c, ['steam', 'iron'], founded);
    const fl = computeFlows(s, c);
    expect(fl.sectors.steam.R).toBeGreaterThan(0);
    const solo = openWith(c, ['steam'], steamApps);
    const base = openWith(C4, ['steam'], steamApps);
    expect(D4(solo, c).sectors.steam!.resourceUse).toBe(D4(base, C4).sectors.steam!.resourceUse);
  });
});

/** fixtureM4 with the foreign fleets filling `room` of the surplus the home fleet leaves. */
const withRoom = (room: number): Content => ({
  ...C4,
  sectors: { ...C4.sectors, fish: { ...C4.sectors.fish, renewable: { ...C4.sectors.fish.renewable!, foreign: { ...C4.sectors.fish.renewable!.foreign!, room } } } },
});

describe('M4 (finish): foreign fleets fill the room', () => {
  const open = ['steam', 'iron', 'fish'];
  const founded = ['fish.market'];
  test('room 0 changes nothing', () => {
    const c = withRoom(0);
    const a = computeFlows(openWith(C4, open, founded), C4).sectors.fish.ren!;
    const b = computeFlows(openWith(c, open, founded), c).sectors.fish.ren!;
    expect(b.rForeign).toBe(a.rForeign);
    expect(b.share).toBe(a.share);
  });
  test('on a healthy bank fished lightly, the foreign catch is the price rule’s plus room × (G − home catch); the share rises', () => {
    const c = withRoom(0.5);
    let s = openWith(c, open, founded);
    s = { ...s, sectors: { ...s.sectors, fish: { ...s.sectors.fish, reserve: 50_000 } } }; // half the bank: G at its most
    const a = computeFlows({ ...s, sectors: { ...s.sectors, fish: { ...s.sectors.fish } } }, C4).sectors.fish.ren!;
    const f = computeFlows(s, c).sectors.fish;
    const surplus = Math.max(0, f.ren!.G - f.R);
    expect(surplus).toBeGreaterThan(0);
    expect(f.ren!.rForeign).toBeCloseTo(a.rForeign + 0.5 * surplus, 6);
    expect(f.ren!.share).toBeGreaterThan(a.share);
    expect(f.ren!.share).toBeCloseTo(f.ren!.rForeign / (f.ren!.rForeign + f.R), 9);
  });
  test('the limits (foreignMul) shrink the room too; the sink line holds the clear level with the room taken', () => {
    const c = withRoom(0.5);
    const s = { ...openWith(c, open, founded), mandate: 1e6 };
    const lim = model.setLever(s, c, 'fish.limits', 1);
    const f0 = computeFlows({ ...s, sectors: { ...s.sectors, fish: { ...s.sectors.fish, reserve: 50_000 } } }, c).sectors.fish.ren!;
    const f1 = computeFlows({ ...lim, sectors: { ...lim.sectors, fish: { ...lim.sectors.fish, reserve: 50_000 } } }, c).sectors.fish.ren!;
    expect(f1.rForeign).toBeLessThan(f0.rForeign);
    // sinkR: home R + foreign(price rule) + room (G − R) = G at the clear level
    const rn = c.sectors.fish.renewable!;
    const G = rn.regen * 75_000 * (1 - 0.75); // logistic at Q = 0.75 K (no scar, above θ)
    const s0 = f0.share0 ?? 0;
    const R = depletionSinkR(c.sectors.fish, rn, 25, 0, s0, 1, 0.5)!;
    expect(R + R * s0 / (1 - s0) + 0.5 * (G - R)).toBeCloseTo(G, 6);
  });
});

describe('M4 (finish): letters stake Hindsight (EffectDef hindsightShare)', () => {
  test('no share, no field: the M3 shape; a share multiplies the seven terms and shows as `letters`', () => {
    let s = openWith(C4, ['steam'], C4.sectors.steam.applications.map((a) => a.id));
    s = run4Ticks(s, 120);
    const t0 = hindsightTerms(s, C4);
    expect(t0.letters).toBeUndefined();
    const sum = termsSum(t0);
    const t1 = hindsightTerms({ ...s, run: { ...s.run, letterShare: 0.04 } }, C4);
    expect(t1.letters!).toBeCloseTo(sum * 0.04, 9);
    expect(t1.total).toBe(Math.max(1, Math.round(sum * 1.04)));
    const t2 = hindsightTerms({ ...s, run: { ...s.run, letterShare: -0.04 } }, C4);
    expect(t2.total).toBe(Math.max(1, Math.round(sum * 0.96)));
  });
  test('the one-off accumulates into RunStats.letterShare, and survives a save', () => {
    const acc: OneOffs = { capital: 0, mandate: 0, slots: 0 };
    fireOneOffs([{ type: 'hindsightShare', value: 0.03 }, { type: 'hindsightShare', value: -0.01 }], 1, 0, acc);
    expect(acc.letterShare!).toBeCloseTo(0.02, 12);
    const s = applyM3OneOffs(openWith(C4, ['steam']), C4, acc);
    expect(s.run.letterShare!).toBeCloseTo(0.02, 12);
    const back = model.deserialize(model.serialize(s), C4)!;
    expect(back.run.letterShare!).toBeCloseTo(0.02, 12);
  });
});

describe('M4 (finish): a scarred bank reopens without firing its crises again', () => {
  test('crises already passed at the scarred opening count as fired; an unscarred bank has none', () => {
    const scarred = openWith(C4, ['steam', 'iron', 'fish'], [], { world: { scars: { fish: { yearsLeft: 10, since: 0 } } } } as never);
    // fixture fish: startScarred 0.4 of K (depletion 60%), crises at 0.4 and 0.7 of collapse: the first has happened
    expect(Math.abs(scarred.sectors.fish.reserve / C4.sectors.fish.reserve - 0.4)).toBeLessThan(1e-3); // (one tiny tick of regrowth)
    expect(scarred.sectors.fish.crisesFired).toBe(1);
    const fresh = openWith(C4, ['steam', 'iron', 'fish']);
    expect(fresh.sectors.fish.crisesFired).toBe(0);
  });
});
