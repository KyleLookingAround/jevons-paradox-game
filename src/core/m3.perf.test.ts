// M3 test 18 of briefs/m3-core.md: purity, determinism, no NaN with every kind in use, speed. Precise µs-per-tick
// figures against the M2 core are measured by design/scratch/m3core/ab.ts; the bounds here are loose enough not to flake.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, GameState } from '../types';
import { model } from './index';
import { fixture as C2raw, fixtureM3 as M0 } from './fixture';
import { badNumbers, openAll } from './m1.testkit';

const calm = (c: Content): Content => ({ ...c, sectors: Object.fromEntries(Object.entries(c.sectors).map(([k, d]) => [k, { ...d, reserve: d.resourceKind === 'stock' ? d.reserve * 1e3 : d.reserve, pressureIntensity: d.pressureIntensity * 0.01 }])) });
const M = calm(M0);
const C2 = calm(C2raw);

/** Every Industry open (reckonings 9), greedy with money no object, the Market on; seams sunk, a measure raised, dispatches
 *  answered (arm by the time), a return filed. */
function play(seconds: number, c: Content = M): GameState {
  let s: GameState = openAll(c, 120);
  s = { ...model.setOrders(s, c, { market: { on: true } }), capital: 1e12, mandate: 1e6 };
  s = model.fileReturn(s, c, { id: 'household', figures: { activeMinutesBefore: 60, activeMinutesAfter: 60, sessionsBefore: 2, sessionsAfter: 2, looksBefore: 3, looksAfter: 3, decisionsBefore: 9, decisionsAfter: 9, automatedAfter: 9, daysBefore: 1, daysAfter: 1, quietDays: 0 } });
  for (let t = 0; t < seconds; t++) {
    if (t % 10 === 0) {
      for (const v of model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, c)) if (v.visible && v.affordable && v.def.id !== 'steam.strike') s = model.buyUpgrade(s, c, v.def.id);
      for (const e of c.sectorOrder) if (s.sectors[e]?.open) for (const a of c.sectors[e].applications) s = model.foundApp(s, c, a.id);
      s = model.sinkSeam(s, c, 'steam');
      s = model.setLever(s, c, 'motion.standard', 2);
      if (s.dispatch.pending.length) s = model.answerDispatch(s, c, t % 2);
      s = { ...s, capital: Math.max(s.capital, 1e9) };
    }
    if (model.derive(s, c).pendingReckoning) s = model.reckon(s, c);
    s = model.tick(s, c, 1);
  }
  return s;
}

describe('M3 purity, determinism, speed', () => {
  test('no NaN after 3 hours with every kind in use; identical action sequences give deep-equal states', () => {
    const a = play(3 * 3600);
    expect(badNumbers(a)).toEqual([]);
    const d = model.derive(a, M);
    expect(badNumbers(d)).toEqual([]);
    expect(d.sectors.light?.load).not.toBeNull();
    expect(d.sectors.motion?.travel).not.toBeNull();
    expect(a.sectors.steam.seamsSunk).toBeGreaterThan(0);
    expect(a.run.dispatchesAnswered + a.meta.dispatches.arms['d.coal']?.length).toBeGreaterThan(0);
    const b = play(1200), b2 = play(1200);
    expect(model.serialize(b)).toBe(model.serialize(b2));
  }, 120_000);
  test('pure: no input is mutated by tick, fastForward, derive or the actions', () => {
    const s = play(300);
    const before = model.serialize(s);
    model.tick(s, M, 1); model.fastForward(s, M, 60); model.derive(s, M); model.upgradeViews(s, M); model.leverViews(s, M);
    model.sinkSeam(s, M, 'steam'); model.answerDispatch(s, M, 0); model.historyViews(s, M); model.archiveViews(s, M); model.retrospective(s, M);
    model.withdrawReturn(s, M, 'household'); model.reckon(s, M);
    expect(model.serialize(s)).toBe(before);
  });
  test('an 8-hour fastForward with five Industries and the Market on takes under 3 s', () => {
    const s = play(120);
    const big = { ...M, global: { ...M.global, offline: { capSeconds: 8 * 3600, holdBefore: null } } } as Content;
    const t0 = performance.now();
    const f = model.fastForward(s, big, 8 * 3600);
    const ms = performance.now() - t0;
    expect(f.lastOffline!.simulated).toBeGreaterThan(0);
    expect(ms).toBeLessThan(3000);
  });
  // M3 finish: robust on a loaded machine. Each sample times the two fixtures back to back (interleaved, best of three
  // batches each), so a burst of load hits both sides of one ratio; the bound is on the MEDIAN of nine such ratios. Idle
  // it measures about ×2; the bound stays 3×, so a real regression in the M3 solve (load's bisection path, travel's
  // inner fixed point) still fails it.
  test('a step with the load and travel sectors open costs at most ~2× the M2 step (median of 9 interleaved ratios < 3×)', () => {
    const s3 = play(200);
    const s2 = model.setOrders(openAll(C2, 120), C2, { market: { on: true } });
    const batch = (s: GameState, c: Content) => {
      let best = Infinity;
      for (let r = 0; r < 3; r++) {
        const t0 = performance.now();
        let t = s;
        for (let i = 0; i < 60; i++) { const u = model.tick(t, c, 1); t = u === t ? s : u; }
        best = Math.min(best, (performance.now() - t0) / 60);
      }
      return best;
    };
    expect(model.derive(s2, C2).pendingReckoning).toBeNull();
    expect(model.derive(s3, M).pendingReckoning).toBeNull();
    expect(C2.sectorOrder.every((e) => s2.sectors[e].open && s3.sectors[e].open)).toBe(true);
    batch(s2, C2); batch(s3, M); // warm both paths
    const ratios: number[] = [];
    let a = Infinity, b = Infinity;
    for (let k = 0; k < 9; k++) {
      const x = batch(s2, C2), y = batch(s3, M);
      a = Math.min(a, x); b = Math.min(b, y);
      ratios.push(y / x);
    }
    ratios.sort((p, q) => p - q);
    const med = ratios[4];
    console.log(`µs per 1 s tick, five Industries open: M2 fixture ${(a * 1000).toFixed(1)}, fixtureM3 (load, travel, priceSeen, a measure, bites) ${(b * 1000).toFixed(1)} (median ratio ×${med.toFixed(2)}, range ×${ratios[0].toFixed(2)}–×${ratios[8].toFixed(2)})`);
    expect(med).toBeLessThan(3);
  });
});
