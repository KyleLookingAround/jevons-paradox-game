// M4 tests 4–7: the renewable stock, foreign fleets, the quota and settle.requires (fixtureM4's Fish: K 100k, regen
// 0.02/s, threshold 0.3, collapsed 0.2, beta 0.4, scar × 0.5 for 20 years, start 0.4 K while scarred).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { STEADY_STATE_YEARS, YEARS_PER_SECOND } from '../types';
import type { Content, GameState } from '../types';
import { model } from './index';
import { computeFlows } from './flows';
import { depletionSinkR, foreignShareOf, growthOf, stepStock } from './renewable';
import { C4, D4, openWith, patch, run4 } from './m4.testkit';

const K = 100_000;
const RN = C4.sectors.fish.renewable!;
const fishAt = (q: number, founded: string[] = ['fish.market'], extra: Partial<GameState> = {}) => patch(openWith(C4, ['fish'], founded, undefined, extra), 'fish', { reserve: q * K, pressure: (1 - q) * 100 });
const noCatch = (s: GameState) => patch(s, 'fish', { apps: Object.fromEntries(Object.entries(s.sectors.fish.apps).map(([k, a]) => [k, { ...a, founded: false }])) });
const withLine = (s: GameState, p0 = 100) => patch(s, 'fish', { budget: { r0: 1e6, since: s.time, drawnYear: 1800, w0: 0, p0, pace: 'gentle' } });
const surveyed = (s: GameState): GameState => ({ ...s, levers: { ...s.levers, 'fish.board': { level: 1, ref: 0 } } });

describe('M4: the renewable stock', () => {
  test('G at K/2 is r·K/4; below θ regrowth × collapsed; the scar multiplies', () => {
    expect(growthOf(RN, K, K / 2, 1)).toBeCloseTo(0.02 * K / 4, 9);
    expect(growthOf(RN, K, 0.2 * K, 1)).toBeCloseTo(0.02 * 0.2 * K * 0.8 * 0.2, 9);
    expect(growthOf(RN, K, K / 2, 0.5)).toBeCloseTo(0.02 * K / 8, 9);
  });
  test('logistic recovery from 0.5 K with no catch matches the closed form to 1e-6 over 200 s (the game step)', () => {
    let s = noCatch(fishAt(0.5));
    s = patch(s, 'fish', { reserve: 0.5 * K });
    for (let i = 0; i < 200; i++) s = model.tick(s, C4, 1);
    const exact = K / (1 + Math.exp(-0.02 * 200));
    expect(Math.abs(s.sectors.fish.reserve - exact) / exact).toBeLessThan(1e-6);
    expect(Math.abs(stepStock(RN, K, 0.5 * K, 0, 0, 0, 1, 1) - K / (1 + Math.exp(-0.02)))).toBeLessThan(1e-6 * K);
  });
  test('reported = (Q/K)^β and p_r follows it; P is derived; crises at their fractions; never a forced Reckoning', () => {
    const s = fishAt(0.5);
    const d = D4(s).sectors.fish!;
    expect(d.stock!.reported).toBeCloseTo(Math.pow(0.5, 0.4), 12);
    expect(d.resourcePriceBase).toBeCloseTo(1 * Math.pow(Math.pow(0.5, 0.4), -0.5), 9);
    expect(d.reserveFraction).toBeCloseTo(0.5, 12);
    expect(d.secondsLeft).toBe(Infinity);
    const s1 = model.tick(s, C4, 1);
    expect(s1.sectors.fish.pressure).toBeCloseTo((1 - s1.sectors.fish.reserve / K) * 100, 9);
    expect(s1.sectors.fish.crisesFired).toBe(1); // P ≈ 50 ≥ 0.4 × 100
    expect(s1.events.filter((e) => e.kind === 'crisis' && e.sector === 'fish').length).toBe(1);
    const floor = model.tick(patch(s, 'fish', { reserve: 1e-9 }), C4, 1);
    expect(floor.sectors.fish.reserve).toBeGreaterThanOrEqual(1e-6 * K * (1 - 1e-12));
    expect(D4(floor).pendingReckoning).toBeNull();
    expect(floor.sectors.fish.pressure).toBeLessThan(100);
  });
  test('the crossing fires once per run, with its event, after the crisis, and writes the scar', () => {
    let s = fishAt(0.305, ['fish.market', 'fish.trawlers'], { population: 50 });
    s = patch(s, 'fish', { crisesFired: 1 });
    s = model.tick(s, C4, 1);
    for (let i = 0; i < 20 && !s.sectors.fish.crossed; i++) s = model.tick(s, C4, 1);
    expect(s.sectors.fish.crossed).toBe(true);
    const kinds = s.events.filter((e) => e.sector === 'fish' && (e.kind === 'crisis' || e.kind === 'thresholdCrossed')).map((e) => e.kind);
    expect(kinds).toEqual(['crisis', 'thresholdCrossed']);
    expect(s.meta.world?.scars?.fish?.yearsLeft).toBeCloseTo(20, 9);
    expect(s.news.some((n) => n.key === 'threshold')).toBe(true);
    // up again and down again: no second crossing this run
    s = model.tick(patch(s, 'fish', { reserve: 0.5 * K }), C4, 1);
    s = model.tick(patch(s, 'fish', { reserve: 0.29 * K }), C4, 1);
    expect(s.events.filter((e) => e.kind === 'thresholdCrossed').length).toBe(1);
    expect(D4(s).sectors.fish!.stock!.crossed).toBe(true);
    expect(D4(s).sectors.fish!.stock!.scar).toEqual({ yearsLeft: s.meta.world!.scars!.fish.yearsLeft });
  });
  test('the scar ticks with open time in tick and fastForward alike, not while settled or closed; it heals with an event', () => {
    const scarred = (s: GameState, y: number): GameState => ({ ...s, meta: { ...s.meta, world: { scars: { fish: { yearsLeft: y, since: 0 } } } } });
    let s: GameState = scarred(fishAt(0.8), 10);
    s = run4(s, 20);
    expect(s.meta.world!.scars!.fish.yearsLeft).toBeCloseTo(10 - 20 * YEARS_PER_SECOND, 9);
    s = model.fastForward(s, C4, 100);
    expect(s.lastOffline!.simulated).toBe(100);
    expect(s.meta.world!.scars!.fish.yearsLeft).toBeCloseTo(10 - 120 * YEARS_PER_SECOND, 9);
    const st = { since: 0, sinceYear: 1800, D: 1, R: 1, ps: 1, pPre: 1, income: 0, P: 20, eta: 1, defect: 1, N0: 1, spillMul0: 1, extraD0: 0, appD: {}, appAdoption: {} };
    const settled = run4(patch(s, 'fish', { settled: st }), 10);
    expect(settled.meta.world!.scars!.fish.yearsLeft).toBeCloseTo(10 - 120 * YEARS_PER_SECOND, 9);
    expect(settled.sectors.fish.reserve).toBe(s.sectors.fish.reserve); // a settled stock is frozen
    const closed = run4(scarred(model.createState(C4), 3), 10);
    expect(closed.meta.world!.scars!.fish.yearsLeft).toBe(3);
    const healing = model.tick(scarred(fishAt(0.8), 0.01), C4, 1);
    expect(healing.meta.world!.scars!.fish).toBeUndefined();
    expect(healing.events.some((e) => e.kind === 'scarHealed' && e.sector === 'fish')).toBe(true);
  });
  test('a Reckoning does not shorten the scar; the next run starts at startScarred × K while scarred', () => {
    let s: GameState = fishAt(0.8);
    s = { ...s, meta: { ...s.meta, world: { scars: { fish: { yearsLeft: 7, since: 0 } } } } };
    s = model.reckon(s, C4);
    expect(s.meta.world!.scars!.fish.yearsLeft).toBe(7);
    const next = openWith(C4, ['fish'], [], s.meta);
    expect(next.sectors.fish.reserve).toBeGreaterThan(0.39 * K);
    expect(next.sectors.fish.reserve).toBeLessThan(0.41 * K);
    expect(next.sectors.fish.reserveMax).toBe(K);
    expect(openWith(C4, ['fish']).sectors.fish.reserve).toBeGreaterThan(0.99 * K);
  });
  test('sinkR = G(Q_clear) / ((1 − circ) + share / (1 − share)); sinkR and clearP null while unsurveyed, true while surveyed', () => {
    const s = withLine(fishAt(0.8));
    const d = D4(s).sectors.fish!;
    expect(d.sinkR).toBeNull();
    expect(d.clearP).toBeNull();
    expect(d.pressureFraction).toBeCloseTo(0.2, 9);
    expect(d.stock!.true).toBeNull();
    expect(d.stock!.regen).toBeNull();
    expect(d.stock!.world).toBeCloseTo(0.8, 12);
    expect(d.stock!.reportedPressureFraction).toBeCloseTo(1 - Math.pow(0.8, 0.4), 12);
    const sv = surveyed(s);
    const e = D4(sv).sectors.fish!;
    expect(e.stock!.surveyed).toBe(true);
    expect(e.stock!.true).toBeCloseTo(0.8, 12);
    const clearP = 25; // clamp(0.5 × p0 100, 0.03 × 100, 0.25 × 100)
    expect(e.clearP).toBe(clearP);
    const share = e.stock!.foreign!.share;
    const Qc = K * (1 - clearP / 100);
    expect(e.sinkR!).toBeCloseTo(growthOf(RN, K, Qc, 1) / (1 + share / (1 - share)), 9);
    expect(e.sinkR!).toBeCloseTo(depletionSinkR(C4.sectors.fish, RN, clearP, 0, share, 1)!, 12);
  });
});

describe('M4: foreign fleets', () => {
  test('share = clamp(share0 × (basePs/p_s)^growth × Π foreignMul, 0, cap); R_foreign = R × share/(1 − share); it drains Q, not the line', () => {
    const s = fishAt(0.8);
    const fl = computeFlows(s, C4).sectors.fish;
    const es = s.sectors.fish;
    const want = Math.min(0.6, 0.1 * (es.basePs / fl.ps));
    expect(fl.ren!.share).toBeCloseTo(want, 12);
    expect(fl.ren!.rForeign).toBeCloseTo(fl.R * want / (1 - want), 9);
    expect(foreignShareOf(RN, { ...es, basePs: 100 * fl.ps }, fl.ps, 1)).toBe(0.6);
    const lim = { ...s, levers: { ...s.levers, 'fish.limits': { level: 1, ref: 0 } } };
    expect(computeFlows(lim, C4).sectors.fish.ren!.share).toBeCloseTo(want * 0.5, 12);
    const s1 = model.tick(s, C4, 1);
    expect(s1.sectors.fish.reserve).toBeCloseTo(stepStock(RN, K, 0.8 * K, fl.R, 0, fl.ren!.rForeign, 1, 1), 6);
    expect(D4(s).sectors.fish!.resourceUse).toBe(fl.R); // the home catch only
  });
  test("a settled sector has none; 'foreignFleets' is printed once a run when the share passes announceAt", () => {
    const st = { since: 0, sinceYear: 1800, D: 1, R: 1, ps: 1, pPre: 1, income: 0, P: 20, eta: 1, defect: 1, N0: 1, spillMul0: 1, extraD0: 0, appD: {}, appAdoption: {} };
    expect(D4(patch(fishAt(0.8), 'fish', { settled: st })).sectors.fish!.stock!.foreign).toBeNull();
    let s = fishAt(0.8);
    s = patch(s, 'fish', { basePs: 3 * computeFlows(s, C4).sectors.fish.ps });
    s = run4(s, 3);
    expect(s.news.filter((n) => n.key === 'foreignFleets').length).toBe(1);
    expect(s.sectors.fish.foreignAnnounced).toBe(true);
  });
});

describe("M4: the 'quota' lever and settle.requires", () => {
  const capC: Content = { ...C4, levers: [...(C4.levers ?? []), { id: 'fish.cap', sector: 'fish', kind: 'cap', name: 'cap', blurb: '', catch: 'c', levels: [{ mandateCost: 1, mandateUpkeep: 0, value: 0.5, label: '' }] }] };
  test('capR = value × sinkR (the sink at the unquota’d price); hidden while unsurveyed', () => {
    const s0 = surveyed(withLine(fishAt(0.8, ['fish.market', 'fish.trawlers'])));
    const sink0 = D4(s0).sectors.fish!.sinkR!;
    const s = { ...s0, levers: { ...s0.levers, 'fish.quota': { level: 1, ref: 0 } } };
    const fl = computeFlows(s, C4);
    expect(fl.inputs.fish.capR).toBeCloseTo(0.9 * sink0, 9);
    expect(fl.sectors.fish.R).toBeLessThan(computeFlows(s0, C4).sectors.fish.R);
    const v = (x: GameState) => model.leverViews(x, C4).find((l) => l.def.id === 'fish.quota')!.visible;
    expect(v(s)).toBe(true);
    expect(v(withLine(fishAt(0.8)))).toBe(false);
  });
  test('a held quota acts on the last surveyed sinkR once the survey lapses', () => {
    let s: GameState = surveyed(withLine(fishAt(0.8, ['fish.market', 'fish.trawlers'])));
    s = { ...s, levers: { ...s.levers, 'fish.quota': { level: 1, ref: 0 } } };
    s = model.tick(s, C4, 1);
    const last = s.sectors.fish.lastSurvey!;
    expect(last.sinkR).not.toBeNull();
    expect(s.events.some((e) => e.kind === 'surveyed' && e.sector === 'fish')).toBe(true);
    const lapsed = { ...s, levers: { ...s.levers, 'fish.board': { level: 0, ref: 0 } } };
    expect(D4(lapsed).sectors.fish!.stock!.surveyed).toBe(false);
    expect(computeFlows(lapsed, C4).inputs.fish.capR).toBeCloseTo(0.9 * last.sinkR!, 9);
  });
  test('value 0 (a moratorium) holds demand at the floors; the tightest of cap and quota applies', () => {
    const s0 = surveyed(withLine(fishAt(0.8, ['fish.market', 'fish.trawlers'])));
    const free = computeFlows(s0, C4).sectors.fish.R;
    const mor = { ...s0, levers: { ...s0.levers, 'fish.quota': { level: 4, ref: 0 } } };
    expect(computeFlows(mor, C4).inputs.fish.capR).toBe(0);
    expect(computeFlows(mor, C4).sectors.fish.R).toBeLessThan(0.002 * free);
    const both = { ...s0, levers: { ...s0.levers, 'fish.quota': { level: 1, ref: 0 }, 'fish.cap': { level: 1, ref: 0 } } };
    const capR = 0.5 * 1e6;
    const quotaR = computeFlows({ ...s0, levers: { ...s0.levers, 'fish.quota': { level: 1, ref: 0 } } }, capC).inputs.fish.capR;
    expect(computeFlows(both, capC).inputs.fish.capR).toBeCloseTo(Math.min(capR, quotaR), 9);
  });
  test('settle.requires: canSettle false and settle refused while it fails; settleBlocked; next.need "requires"', () => {
    const calm: Content = { ...C4, global: { ...C4.global, wellbeingTarget: 0 } };
    let s = openWith(calm, ['fish'], ['fish.market']);
    s = patch(s, 'fish', { reserve: 0.8 * K, clearYears: STEADY_STATE_YEARS + 1, budget: { r0: 1e6, since: s.time, drawnYear: 1800, w0: 0, p0: 100, pace: 'gentle' } });
    const d = model.derive(s, calm).sectors.fish!;
    expect(d.sinkHeld).toBe(true);
    expect(d.canSettle).toBe(false);
    expect(d.settleBlocked).toBe('The stock surveyed');
    expect(model.settle(s, calm, 'fish')).toBe(s);
    expect(model.derive(s, calm).sectors.steam!.settleBlocked).toBeNull();
    const sv = surveyed(s);
    expect(model.derive(sv, calm).sectors.fish!.canSettle).toBe(true);
    expect(model.derive(sv, calm).sectors.fish!.settleBlocked).toBeNull();
    const settled = model.settle(sv, calm, 'fish');
    expect(settled.sectors.fish.settled).not.toBeNull();
    expect(model.derive({ ...settled, levers: { ...settled.levers, 'fish.board': { level: 0, ref: 0 } } }, calm).sectors.fish!.settled).toBe(true);
    // Derived.ending.next: Steam first in sectorOrder; with Steam settled by hand, Fish waits on 'requires'
    const st = { since: 0, sinceYear: 1800, D: 1, R: 1, ps: 1, pPre: 1, income: 0, P: 0, eta: 1, defect: 1, N0: 1, spillMul0: 1, extraD0: 0, appD: {}, appAdoption: {} };
    const actsC: Content = { ...calm, acts: [{ id: 'a', name: 'A', title: 'T', ages: ['coal'], ending: { id: 'a', sectors: ['steam', 'fish'] } }] };
    const e = model.derive(patch(s, 'steam', { settled: st }), actsC).ending;
    expect(e.next).toEqual({ sector: 'fish', need: 'requires', years: STEADY_STATE_YEARS + 1 });
  });
});
