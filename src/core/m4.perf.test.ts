// M4 test 14: purity, determinism and speed with every M4 kind in use (fixtureM4Acts), and the M4 step cost against
// M3's (reported in µs; the brief's targets: a step with the four Act I Industries open ≤ 1.3 × M3's with five; an
// 8-hour fastForward with the capstone and three Previews under 3 s).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, GameState } from '../types';
import { model } from './index';
import { fixtureM3, fixtureM4Acts as CA } from './fixture';
import { badNumbers } from './m1.testkit';
import { forceSettle, openWith, patch, run4 } from './m4.testkit';

/** A scripted economy: greedy cards and uses, every line, levers raised, letters answered (wagers included), seams. */
function play(c: Content, s0: GameState, seconds: number, chunk = 60): GameState {
  let s = s0;
  for (let t = 0; t < seconds; t += chunk) {
    for (const v of model.upgradeViews(s, c)) if (v.visible && v.affordable && !v.excludedBy) s = model.buyUpgrade(s, c, v.def.id);
    for (const e of c.sectorOrder) if (s.sectors[e]?.open) for (const a of c.sectors[e].applications) s = model.foundApp(s, c, a.id);
    for (const e of c.sectorOrder) if (s.sectors[e]?.open && !s.sectors[e].budget) s = model.drawBudget(s, c, e);
    for (const lv of model.leverViews(s, c)) if (lv.visible && lv.canRaise && lv.level < 1) s = model.setLever(s, c, lv.def.id, 1);
    for (const p of s.dispatch.pending) s = model.answerDispatch(s, c, (t / chunk) % 2 ? 1 : 0, p.id);
    for (const e of c.sectorOrder) s = model.sinkSeam(s, c, e);
    if (model.derive(s, c).pendingReckoning) s = model.reckon(s, c);
    s = model.fastForward(s, c, chunk);
    s = model.tick(s, c, 1);
  }
  return s;
}
const start = (): GameState => {
  let s = openWith(CA, ['iron', 'fish', 'light'], ['steam.pumping', 'steam.mills', 'iron.rails', 'iron.girders', 'fish.market', 'fish.trawlers']);
  s = { ...s, dispatch: { ...s.dispatch, pending: [{ id: 'd.shoals', arrivedAt: 0, expiresAt: 50 }, { id: 'd.bet', arrivedAt: 0, expiresAt: 50 }], offered: ['d.shoals', 'd.bet'] } };
  return s;
};
function deepFreeze<T>(x: T): T {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x as object)) deepFreeze(v); }
  return x;
}

describe('M4: purity, determinism, speed', () => {
  test('three hours with every M4 kind in use: no NaN; identical actions give deep-equal states; inputs never mutated', () => {
    const a = play(CA, start(), 3 * 3600, 120);
    const b = play(CA, start(), 3 * 3600, 120);
    expect(badNumbers(a)).toEqual([]);
    expect(badNumbers(model.derive(a, CA))).toEqual([]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const frozen = deepFreeze(JSON.parse(JSON.stringify(a)) as GameState);
    expect(() => { model.derive(frozen, CA); model.tick(frozen, CA, 1); model.fastForward(frozen, CA, 30); model.reckon(frozen, CA); }).not.toThrow();
  });
  test('the step: Act I (four Industries, every M4 kind) against M3 with five (µs, reported); an 8-hour fastForward under 3 s', () => {
    // M3: the five fixture Industries open, uses founded, lines and levers
    const m3open = (): GameState => {
      let s = openWith(fixtureM3, ['light', 'motion', 'compute', 'code'], fixtureM3.sectorOrder.flatMap((e) => fixtureM3.sectors[e].applications.map((a) => a.id)));
      for (const e of fixtureM3.sectorOrder) s = model.drawBudget(s, fixtureM3, e);
      return run4(s, 5, fixtureM3);
    };
    let m4 = start();
    for (const e of ['steam', 'iron', 'fish', 'light']) m4 = model.drawBudget(m4, CA, e);
    m4 = { ...m4, levers: { ...m4.levers, 'fish.board': { level: 1, ref: 0 }, 'fish.quota': { level: 1, ref: 0 } }, meta: { ...m4.meta, features: { estimates: 0 } } };
    m4 = run4(m4, 5, CA);
    const per = (c: Content, s0: GameState) => {
      const xs: GameState[] = [];
      let s = s0;
      for (let i = 0; i < 300; i++) { s = model.tick(s, c, 0.1); xs.push(s); }
      const t0 = performance.now();
      for (const x of xs) model.tick({ ...x }, c, 0.1);
      return (performance.now() - t0) * 1000 / xs.length;
    };
    per(fixtureM3, m3open()); per(CA, m4); // warm
    const u3 = per(fixtureM3, m3open()), u4 = per(CA, m4);
    console.log(`  step: M3 fixture, five open ${u3.toFixed(1)} µs; Act I fixture, four open with every M4 kind ${u4.toFixed(1)} µs (${(u4 / u3).toFixed(2)}×)`);
    expect(u4).toBeLessThan(3 * u3 + 50); // the 1.3× target is reported; this guards a gross regression on a noisy box
    // eight hours away with the capstone and three Previews open
    let w = start();
    for (const id of ['steam', 'iron', 'fish']) w = forceSettle(w, CA, id);
    for (let i = 0; i < 45 && !w.flags.won; i++) w = model.tick(w, CA, 1);
    expect(w.flags.won).toBe(true);
    let r = model.reckon(w, CA);
    // (the Previews' pressure off, so the eight hours are not cut short by a fixture collapse)
    const calm = Object.fromEntries(['motion', 'compute', 'code', 'light'].map((id) => [id, { ...CA.sectors[id], pressureIntensity: 0, reserve: CA.sectors[id].reserve * 1e3 }]));
    const away: Content = { ...CA, sectors: { ...CA.sectors, ...calm }, global: { ...CA.global, offline: { capSeconds: 8 * 3600, holdBefore: null } } };
    r = openWith(away, ['motion', 'compute', 'code', 'light'], ['motion.delivery', 'compute.sheets', 'code.tools'], r.meta);
    expect(r.sectors.steam.capstoned && r.sectors.motion.open && r.sectors.code.open).toBe(true);
    const t0 = performance.now();
    const ff = model.fastForward(r, away, 8 * 3600);
    const ms = performance.now() - t0;
    console.log(`  fastForward 8 h (capstone + three Previews): ${ms.toFixed(0)} ms, simulated ${ff.lastOffline!.simulated} s`);
    expect(ff.lastOffline!.simulated).toBe(8 * 3600);
    expect(ms).toBeLessThan(3000);
    expect(badNumbers(model.derive(ff, away))).toEqual([]);
    void patch;
  });
});
