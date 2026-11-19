// M2 mechanism tests (10 of briefs/m2-core.md): offline catch-up with holds, the cap and the report.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { STEADY_STATE_YEARS } from '../types';
import type { Content, GameState } from '../types';
import { model } from './index';
import { fixture as C } from './fixture';
import { step } from './step';
import { CALM, D, decoupling, greedy, patchSector, run, steamAt, steamD } from './m1.testkit';

const LONG: Content = { ...CALM, sectors: { ...CALM.sectors, steam: { ...CALM.sectors.steam, reserve: 1e10 } } };
const hold = (c: Content, h: 'crisis' | 'collapse' | null): Content => ({ ...c, global: { ...c.global, offline: { capSeconds: 28800, holdBefore: h } } });
/** Deep seams, so smog (not exhaustion) is what ends the backfire player's run. */
const DEEP: Content = { ...C, sectors: { ...C.sectors, steam: { ...C.sectors.steam, reserve: 1e8 } } };
/** The backfire player's Steam a few minutes in: pressure climbing towards the first crisis. */
function efficiency(): GameState {
  let s = { ...model.createState(DEEP), capital: 2e4 };
  for (let i = 0; i < 30; i++) s = model.tick(greedy(s, DEEP), DEEP, 1);
  expect(s.sectors.steam.crisesFired).toBe(0);
  return s;
}

describe('M2 offline', () => {
  test("'crisis' stops one step before the first crisis; a second call simulates 0", () => {
    const s = efficiency();
    const f = model.fastForward(s, DEEP, 8 * 3600);
    const r = f.lastOffline!;
    expect(f.sectors.steam.crisesFired).toBe(0);
    expect(r.heldBy).toBe('crisis');
    expect(r.heldSector).toBe('steam');
    expect(r.simulated).toBeLessThan(8 * 3600);
    expect(r.simulated).toBeCloseTo(f.time - s.time, 6);
    expect(r.crises).toBe(0);
    expect(step(f, DEEP, 5).sectors.steam.crisesFired).toBe(1); // the held step
    const g = model.fastForward(f, DEEP, 3600);
    expect(g.lastOffline!.simulated).toBe(0);
    expect(g.lastOffline!.heldBy).toBe('crisis');
    expect(g.time).toBe(f.time);
    // tick and actions leave the report alone
    expect(model.tick(f, DEEP, 1).lastOffline).toEqual(r);
  });
  test("'collapse' passes crises but never returns a pending Reckoning; null reproduces M1", () => {
    const s = efficiency();
    const COL = hold(DEEP, 'collapse');
    const f = model.fastForward(s, COL, 8 * 3600);
    expect(D(f, COL).pendingReckoning).toBeNull();
    expect(f.sectors.steam.crisesFired).toBeGreaterThan(0);
    expect([null, 'collapse', 'exhausted']).toContain(f.lastOffline!.heldBy);
    expect(f.lastOffline!.crises).toBe(f.sectors.steam.crisesFired);
    const NUL = hold(DEEP, null);
    const n = model.fastForward(s, NUL, 8 * 3600);
    let m = s;
    for (let i = 0; i < 8 * 3600 / 5; i++) { const t = step(m, NUL, 5); if (t === m) break; m = t; }
    expect(n.time).toBe(m.time);
    expect(n.capital).toBe(m.capital);
    // null holds nothing: from a state at the brink, the run ends offline as in M1
    const brink = patchSector(s, 'steam', { reserve: s.sectors.steam.reserveMax * 0.002 + 50 });
    expect(D(model.fastForward(brink, NUL, 600), NUL).pendingReckoning).not.toBeNull();
    expect(D(model.fastForward(brink, COL, 600), COL).pendingReckoning).toBeNull();
    // seconds ≤ 0 or NaN: the same reference
    expect(model.fastForward(s, DEEP, 0)).toBe(s);
    expect(model.fastForward(s, DEEP, NaN)).toBe(s);
  });
  test('the cap, offlineCapAdd and the deprecated offlineCapSeconds', () => {
    const s = decoupling(LONG);
    const f = model.fastForward(s, LONG, 1e9);
    expect(f.lastOffline!.heldBy).toBe('cap');
    expect(f.lastOffline!.simulated).toBeCloseTo(28800, 6);
    const meta = { ...s.meta, institutions: { 'inst.treasury': 1 }, loadout: ['inst.treasury'] };
    expect(D({ ...s, meta }, LONG).offlineCapSeconds).toBe(32400);
    expect(model.fastForward({ ...s, meta }, LONG, 1e9).lastOffline!.simulated).toBeCloseTo(32400, 6);
    const OLD: Content = { ...LONG, global: { ...LONG.global, offline: undefined, offlineCapSeconds: 600 } };
    expect(D(s, OLD).offlineCapSeconds).toBe(600);
    expect(model.fastForward(s, OLD, 1e9).lastOffline!.simulated).toBeCloseTo(600, 6);
  });
  test('lines: held, broken, drawn and settled', () => {
    // held: a calm, generous line
    const s = decoupling(LONG);
    const line = { r0: 10 * steamD(s, LONG).resourceUse, since: s.time, drawnYear: 1800, w0: 1e3, p0: 0, pace: 'gentle' };
    const held = patchSector(s, 'steam', { budget: line });
    expect(model.fastForward(held, LONG, 600).lastOffline!.lines).toEqual({ steam: 'held' });
    // broken: a line R cannot meet
    const broken = patchSector(s, 'steam', { budget: { ...line, r0: 1e-6 } });
    expect(model.fastForward(broken, LONG, 600).lastOffline!.lines).toEqual({ steam: 'broken' });
    // drawn: a standing cap draws its line during the catch-up
    const meta = { ...s.meta, institutions: { 'inst.capStanding': 1 }, loadout: ['inst.capStanding'] };
    const st = { ...run(steamAt(3, { meta }), 1, LONG), levers: { ...s.levers, 'steam.cap': { level: 1, ref: 0 } } };
    const nobudget = patchSector(st, 'steam', { budget: null });
    expect(model.fastForward(nobudget, LONG, 60).lastOffline!.lines.steam).toBe('drawn');
    // settled
    let ss = patchSector(held, 'steam', { clearYears: STEADY_STATE_YEARS - 0.01, steadyYears: STEADY_STATE_YEARS - 0.01 });
    ss = model.tick(ss, LONG, 1);
    ss = model.settle({ ...ss, mandate: 1e6 }, LONG, 'steam');
    expect(ss.sectors.steam.settled).not.toBeNull();
    const fr = model.fastForward(ss, LONG, 600).lastOffline!;
    expect(fr.lines).toEqual({ steam: 'settled' });
    expect(fr.toSeq).toBeGreaterThanOrEqual(fr.fromSeq);
  });
  // QA fix B6: a line held on leaving came back broken because it kept declining while nobody could tighten or add a
  // lever (a leaky cap, a locked-in floor, wellbeing under the drawn level). The line does not decline while away.
  test('a line does not decline while away: one held exactly at its level on leaving is held on return', () => {
    const s = decoupling(LONG);
    const R = steamD(s, LONG).resourceUse;
    // A Firm line drawn 20 model years ago, so R sits just under it now: online it would fall below R in a few years.
    const firm = { r0: R / 0.81 * 0.999, since: s.time - 400, drawnYear: 1800, w0: 0, p0: 0, pace: 'firm' };
    const at = patchSector(s, 'steam', { budget: firm, steadyYears: 1 });
    const lineNow = steamD(at, LONG).budgetR!;
    expect(R).toBeLessThanOrEqual(lineNow * 1.005);
    const f = model.fastForward(at, LONG, 600);
    expect(f.lastOffline!.lines).toEqual({ steam: 'held' });
    expect(steamD(f, LONG).budgetR!).toBeCloseTo(lineNow, 6);
    expect(f.sectors.steam.budget!.since).toBeCloseTo(firm.since + 600, 6);
    expect(f.sectors.steam.budget!.r0).toBe(firm.r0);
    expect(f.sectors.steam.steadyYears).toBeGreaterThan(at.sectors.steam.steadyYears);
    // Online, the same ten minutes take the line 27 per cent lower and the streak breaks.
    let k = at;
    for (let i = 0; i < 600; i++) k = model.tick(k, LONG, 1);
    expect(steamD(k, LONG).budgetR!).toBeLessThan(lineNow * 0.8);
    expect(k.sectors.steam.steadyYears).toBe(0);
    // The decline picks up where it stood once play resumes.
    let g = f;
    for (let i = 0; i < 200; i++) g = model.tick(g, LONG, 1);
    expect(steamD(g, LONG).budgetR!).toBeCloseTo(lineNow * 0.9, 3);
    // A held line (Steady State) and a settled one are left alone.
    const heldAt = patchSector(at, 'steam', { budget: { ...firm, heldAt: s.time - 100 } });
    expect(model.fastForward(heldAt, LONG, 600).sectors.steam.budget!.since).toBe(firm.since);
  });
  test('a pending Reckoning: nothing simulated, heldBy pending', () => {
    let s = efficiency();
    s = patchSector(s, 'steam', { pressure: 200 });
    const f = model.fastForward(s, DEEP, 100);
    expect(f.time).toBe(s.time);
    expect(f.lastOffline!.heldBy).toBe('pending');
  });
});

// The offline fix: Hindsight away at offline.hindsightRate; no dividend overflow inside fastForward (types.ts
// GlobalParams.offline.hindsightRate, RunStats.hindsightWithheld, GameState.pendingDividends).
const rate = (c: Content, r: number | undefined): Content => ({ ...c, global: { ...c.global, offline: { ...c.global.offline!, hindsightRate: r } } });
const raw = (s: GameState, c: Content) => { const t = D(s, c).hindsightTerms; return t.wellbeing + t.budget + t.unburnt + t.backfire + t.sectorsReached + t.steady + t.settled; };
const strip = (s: GameState) => ({ ...s, lastOffline: null, run: { ...s.run, hindsightWithheld: undefined } });

describe('M2 offline: Hindsight at a reduced rate, no overflow while away', () => {
  const FULL = rate(LONG, undefined), FIFTH = rate(LONG, 0.2);
  test('the rate withholds (1 − rate) of the change in the terms and changes nothing else', () => {
    const s = decoupling(LONG);
    const a = model.fastForward(s, FULL, 2 * 3600), b = model.fastForward(s, FIFTH, 2 * 3600);
    // the default (absent) is the full rate and writes nothing new into the run
    expect(a.run.hindsightWithheld).toBeUndefined();
    expect(D(a, FULL).hindsightTerms.withheld).toBeUndefined();
    expect(a.lastOffline!.hindsightRate).toBe(1);
    // the same simulation: capital, decades, streaks, wellbeing-years, events
    expect(strip(b)).toEqual(strip(a));
    expect(b.run.budgetDecades).toBeGreaterThan(s.run.budgetDecades);
    const gain = raw(a, FULL) - raw(s, FULL);
    expect(gain).toBeGreaterThan(50);
    expect(b.run.hindsightWithheld!).toBeCloseTo(0.8 * gain, 6);
    expect(D(b, FIFTH).hindsightTerms.withheld!).toBeCloseTo(0.8 * gain, 6);
    // the report: Hindsight earned while away at the rate
    expect(b.lastOffline!.hindsightRate).toBe(0.2);
    expect(a.lastOffline!.hindsight).toBe(D(a, FULL).hindsightIfReckonNow - D(s, FULL).hindsightIfReckonNow);
    expect(b.lastOffline!.hindsight).toBe(D(b, FIFTH).hindsightIfReckonNow - D(s, FIFTH).hindsightIfReckonNow);
    expect(Math.abs(b.lastOffline!.hindsight! - 0.2 * a.lastOffline!.hindsight!)).toBeLessThanOrEqual(1);
    // the Reckoning pays what derive promised, and the next run starts with nothing withheld
    const r = model.reckon(b, FIFTH);
    expect(r.meta.hindsight - b.meta.hindsight).toBe(D(b, FIFTH).hindsightIfReckonNow);
    expect(r.run.hindsightWithheld).toBeUndefined();
    // rate 0: away earns no Hindsight at all
    const z = model.fastForward(s, rate(LONG, 0), 2 * 3600);
    expect(z.lastOffline!.hindsight).toBe(0);
  });
  test('one 8-hour call and eight 1-hour calls give the same state and withhold the same', () => {
    const s = decoupling(LONG);
    const one = model.fastForward(s, FIFTH, 8 * 3600);
    let eight = s;
    for (let i = 0; i < 8; i++) eight = model.fastForward(eight, FIFTH, 3600);
    expect(strip(eight)).toEqual(strip(one));
    expect(eight.run.hindsightWithheld!).toBeCloseTo(one.run.hindsightWithheld!, 6);
    expect(D(eight, FIFTH).hindsightIfReckonNow).toBe(D(one, FIFTH).hindsightIfReckonNow);
  });
  test('the bound: an absence earns at most the rate × what the untouched board earns online', () => {
    const s = decoupling(LONG);
    const away = model.fastForward(s, FIFTH, 3600);
    const online = run(s, 3600, FIFTH, 5);
    const gainOnline = D(online, FIFTH).hindsightIfReckonNow - D(s, FIFTH).hindsightIfReckonNow;
    expect(gainOnline).toBeGreaterThan(20);
    expect(away.lastOffline!.hindsight!).toBeLessThanOrEqual(Math.ceil(0.2 * gainOnline) + 1);
    // tick() never withholds
    expect(online.run.hindsightWithheld).toBeUndefined();
  });
  test('away, a full dividend list forgoes new offers instead of resolving the oldest; tick still overflows', () => {
    const s = decoupling(LONG);
    const f = model.fastForward(s, FIFTH, 3600);
    const r = f.lastOffline!;
    expect(f.pendingDividends.length).toBe(8);
    expect(r.dividends).toBe(8);
    expect(r.dividendsForgone!).toBeGreaterThan(0);
    expect(r.dividends + r.dividendsForgone!).toBe(r.decades);
    expect(f.sectors.steam.dividends).toEqual([]);
    expect(f.events.some((e) => e.kind === 'dividendChosen')).toBe(false);
    // the same hour online resolves the overflow as option 0 (M2's rule, unchanged)
    const t = run(s, 3600, FIFTH, 5);
    expect(t.pendingDividends.length).toBe(8);
    expect(t.sectors.steam.dividends.length).toBe(r.dividendsForgone!);
  });
  test('save: hindsightWithheld round-trips when finite and is dropped otherwise', () => {
    const b = model.fastForward(decoupling(LONG), FIFTH, 3600);
    const back = model.deserialize(model.serialize(b), FIFTH)!;
    expect(back.run.hindsightWithheld!).toBeCloseTo(b.run.hindsightWithheld!, 9);
    expect(D(back, FIFTH).hindsightIfReckonNow).toBe(D(b, FIFTH).hindsightIfReckonNow);
    const j = JSON.parse(model.serialize(b));
    j.run.hindsightWithheld = 'lots';
    expect(model.deserialize(JSON.stringify(j), FIFTH)!.run.hindsightWithheld).toBeUndefined();
    delete j.run.hindsightWithheld;
    expect(model.deserialize(JSON.stringify(j), FIFTH)!.run.hindsightWithheld).toBeUndefined();
  });
});
