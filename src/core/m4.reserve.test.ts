// M4 tests 2 and 3: the shared reserve (Iron draws Steam's coal) and feeds (the order book).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content } from '../types';
import { model } from './index';
import { idx } from './contentIndex';
import { computeFlows, flowsWithoutFeeds } from './flows';
import { feedFactor } from './feeds';
import { rAddedOf } from './orderBook';
import { C4, D4, openWith, patch, run4 } from './m4.testkit';

const STEAM = ['steam.pumping', 'steam.mills'];

describe('M4: the shared reserve (SectorDef.resourceStock)', () => {
  const s0 = openWith(C4, ['iron'], [...STEAM, 'iron.pots']);
  test("the owner's reserve is drained by R_owner + R_drawer; the drawer's gauges mirror it", () => {
    const d = D4(s0);
    const f = computeFlows(s0, C4).sectors;
    const s1 = model.tick(s0, C4, 1);
    const want = s0.sectors.steam.reserve - (f.steam.R - f.steam.reserveGain + f.iron.R);
    expect(s1.sectors.steam.reserve).toBeCloseTo(want, 6);
    expect(s1.sectors.iron.reserve).toBe(s1.sectors.steam.reserve);
    expect(s1.sectors.iron.reserveMax).toBe(s1.sectors.steam.reserveMax);
    expect(d.sectors.iron!.reserveFraction).toBe(d.sectors.steam!.reserveFraction);
    expect(d.sectors.iron!.secondsLeft).toBe(d.sectors.steam!.secondsLeft);
    expect(d.sectors.steam!.drawnBy).toEqual({ steam: f.steam.R, iron: f.iron.R });
    expect(d.sectors.iron!.drawnBy).toBeNull();
    expect(d.sectors.light).toBeUndefined(); // closed sectors are not in Derived.sectors
  });
  test("the drawer's p_r is the owner's (times its own resourcePriceMul)", () => {
    const d = D4(s0);
    expect(d.sectors.iron!.resourcePriceBase).toBeCloseTo(d.sectors.steam!.resourcePriceBase, 12);
    const C2: Content = { ...C4, upgrades: [...(C4.upgrades ?? []), { id: 'iron.coke', sector: 'iron', name: 'Coke', blurb: '', kind: 'capital', cost: 1, effects: [{ type: 'resourcePriceMul', sector: 'iron', value: 2 }] }] };
    const s2 = { ...s0, upgrades: { ...s0.upgrades, 'iron.coke': 1 } };
    expect(D4(s2, C2).sectors.iron!.resourcePriceBase).toBeCloseTo(2 * D4(s2, C2).sectors.steam!.resourcePriceBase, 12);
  });
  test('seams sunk by the owner raise both prices alike', () => {
    let s = { ...s0, capital: 1e9 };
    const before = D4(s);
    s = model.sinkSeam(s, C4, 'steam');
    expect(s.sectors.steam.seamsSunk).toBe(1);
    const after = D4(s);
    const rs = after.sectors.steam!.resourcePriceBase / before.sectors.steam!.resourcePriceBase;
    const ri = after.sectors.iron!.resourcePriceBase / before.sectors.iron!.resourcePriceBase;
    expect(ri).toBeCloseTo(rs, 12);
    expect(after.sectors.iron!.seams).toBeNull();
  });
  test('exhaustion is the owner\'s; a settled drawer drains nothing', () => {
    const thr = 2e-3 * s0.sectors.steam.reserveMax;
    const low = patch(s0, 'steam', { reserve: thr * 1.0001 });
    const f0 = computeFlows(low, C4).sectors;
    let s = patch(s0, 'steam', { reserve: thr + 0.5 * (f0.steam.R - f0.steam.reserveGain + f0.iron.R) });
    s = model.tick(s, C4, 1);
    expect(D4(s).pendingReckoning).toEqual({ cause: 'exhausted', sector: 'steam' });
    expect(s.events.filter((e) => e.kind === 'exhausted').map((e) => e.sector)).toEqual(['steam']);
    const fl = computeFlows(s0, C4);
    const st = { since: 0, sinceYear: 1800, D: fl.sectors.iron.D, R: fl.sectors.iron.R, ps: fl.sectors.iron.ps, pPre: fl.sectors.iron.pPre, income: 0, P: 0, eta: 1, defect: 1, N0: 1, spillMul0: 1, extraD0: 0, appD: {}, appAdoption: {} };
    const settled = patch(s0, 'iron', { settled: st });
    const f = computeFlows(settled, C4).sectors;
    const s1 = model.tick(settled, C4, 1);
    expect(s1.sectors.steam.reserve).toBeCloseTo(settled.sectors.steam.reserve - (f.steam.R - f.steam.reserveGain), 6);
  });
});

describe('M4: feeds (ApplicationDef.feeds)', () => {
  test('the factor f = 1 − (1 − m) × a at adoption 0, 0.5 and 1', () => {
    expect(feedFactor(0.8, 0)).toBe(1);
    expect(feedFactor(0.8, 0.5)).toBeCloseTo(0.9, 15);
    expect(feedFactor(0.8, 1)).toBeCloseTo(0.8, 15);
  });
  test('the solve order puts the source before every target; a cycle is refused by the index', () => {
    const ix = idx(C4);
    const pos = (x: string) => ix.solveOrder.indexOf(x);
    for (const t of ['steam', 'fish', 'light', 'motion', 'compute', 'code']) expect(pos('iron')).toBeLessThan(pos(t));
    expect(ix.refusedFeeds).toEqual([]);
    const steamFeedsIron: Content = { ...C4, sectors: { ...C4.sectors, steam: { ...C4.sectors.steam, applications: C4.sectors.steam.applications.map((a, i) => (i === 0 ? { ...a, feeds: [{ sector: 'iron', capCostMul: 0.5 }] } : a)) } } };
    const ix2 = idx(steamFeedsIron);
    expect(ix2.refusedFeeds).toEqual([{ app: 'iron.rails', sector: 'steam' }]); // the edge that would close the cycle
    expect(ix2.solveOrder.length).toBe(C4.sectorOrder.length);
    expect(ix2.feedsInto.iron?.length).toBe(1);
    expect(ix2.solveOrder.indexOf('steam')).toBeLessThan(ix2.solveOrder.indexOf('iron'));
  });
  test("two feeds into one sector multiply; '*' leaves the source alone; the factor uses the same solve's adoption", () => {
    const s = run4(openWith(C4, ['iron', 'light'], [...STEAM, 'iron.rails', 'iron.girders']), 3);
    const fl = computeFlows(s, C4);
    const ad = (i: number) => fl.sectors.iron.appD[i] / fl.sectors.iron.appSat[i];
    const want = feedFactor(0.8, ad(0)) * feedFactor(0.9, ad(1));
    const d = D4(s);
    expect(d.sectors.steam!.capCost).toBeCloseTo(C4.sectors.steam.capCost * want, 12);
    expect(computeFlows(s, C4).inputs.light.feedMul).toBeCloseTo(feedFactor(0.9, ad(1)), 12);
    expect(computeFlows(s, C4).inputs.iron.feedMul).toBe(1);
    expect(d.sectors.iron!.capCost).toBeCloseTo(C4.sectors.iron.capCost, 12);
    expect(d.sectors.iron!.apps['iron.rails'].feeds).toEqual({ steam: feedFactor(0.8, ad(0)) });
    expect(Object.keys(d.sectors.iron!.apps['iron.girders'].feeds!).sort()).toEqual(['light', 'steam']);
    expect(d.sectors.iron!.apps['iron.pots'].feeds).toBeNull();
    const book = d.sectors.iron!.feeds!;
    expect(book.map((x) => x.to)).toEqual(['steam', 'light']);
    expect(book[0].factor).toBeCloseTo(want, 12);
  });
  test('rAdded equals a brute-force removal solve (feeds stripped from content) to 1e-9; ≥ 0', () => {
    const s = run4(openWith(C4, ['iron', 'light'], [...STEAM, 'iron.rails', 'iron.girders']), 3);
    const stripped: Content = { ...C4, sectors: { ...C4.sectors, iron: { ...C4.sectors.iron, applications: C4.sectors.iron.applications.map(({ feeds: _f, ...a }) => a) } } };
    const brute = computeFlows(s, stripped);
    const now = computeFlows(s, C4);
    const added = rAddedOf(s, C4, 'iron');
    expect(Math.abs(added.steam - (now.sectors.steam.R - brute.sectors.steam.R))).toBeLessThan(1e-9);
    expect(Math.abs(added.light - (now.sectors.light.R - brute.sectors.light.R))).toBeLessThan(1e-9);
    expect(added.steam).toBeGreaterThan(0);
    expect(flowsWithoutFeeds(s, C4, 'iron').sectors.steam.R).toBeCloseTo(brute.sectors.steam.R, 9);
    const book = D4(s).sectors.iron!.feeds!;
    expect(book[0].rAdded).toBe(added.steam);
    expect(book[0].lineShare).toBeNull();
  });
  test("the target's rebound meter is its own: a feed is not efficiency (it shows in frontierFold)", () => {
    const s = run4(openWith(C4, ['iron'], [...STEAM, 'iron.rails']), 3);
    const st = D4(s).sectors.steam!;
    expect(st.etaFold).toBe(1);
    expect(st.rebound).toBeNull();
    expect(st.shadowR).toBeCloseTo(st.resourceUse, 12);
  });
  test('a settled source feeds its settled adoption; a settled target is not fed', () => {
    const s = run4(openWith(C4, ['iron'], [...STEAM, 'iron.rails']), 3);
    const fl = computeFlows(s, C4);
    const st = { since: 0, sinceYear: 1800, D: fl.sectors.iron.D, R: fl.sectors.iron.R, ps: fl.sectors.iron.ps, pPre: fl.sectors.iron.pPre, income: 0, P: 0, eta: 1, defect: 1, N0: 1, spillMul0: 1, extraD0: 0, appD: { 'iron.rails': 10 }, appAdoption: { 'iron.rails': 0.5 } };
    const sIron = patch(s, 'iron', { settled: st });
    expect(D4(sIron).sectors.steam!.capCost).toBeCloseTo(C4.sectors.steam.capCost * feedFactor(0.8, 0.5), 12);
    const stS = { ...st, appD: {}, appAdoption: {} };
    const sSteam = patch(s, 'steam', { settled: stS });
    expect(D4(sSteam).sectors.steam!.capCost).toBeCloseTo(C4.sectors.steam.capCost, 12);
    expect(D4(sSteam).sectors.iron!.feeds).toEqual([]);
  });
});
