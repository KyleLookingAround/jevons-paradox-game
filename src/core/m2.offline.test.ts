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
  test('a pending Reckoning: nothing simulated, heldBy pending', () => {
    let s = efficiency();
    s = patchSector(s, 'steam', { pressure: 200 });
    const f = model.fastForward(s, DEEP, 100);
    expect(f.time).toBe(s.time);
    expect(f.lastOffline!.heldBy).toBe('pending');
  });
});
