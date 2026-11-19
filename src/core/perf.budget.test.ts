// Per-call cost budgets of the calls the page makes every update (perf pass 2; docs/adr/ADR-2026-11-19-*.md), on a
// late-game state built here the way tools/perf.mjs builds its "late" state: all five Industries open, improvements
// bought and uses founded in each, budgets drawn, levers raised. Medians over many calls, with budgets several times
// the measured cost (CI machines vary), so a real regression fails and noise does not. The browser's own budgets
// (frames, taps, nodes) are in `node tools/perf.mjs --check`.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, GameState } from '../types';
import { model } from './index';
import { content } from '../content';

const C = content as Content;

/** The late state (perf.mjs makeStates, late): deterministic for a given content. */
function lateState(): GameState {
  let s = model.createState(C);
  s = { ...s, meta: { ...s.meta, features: Object.fromEntries(Object.keys(C.features || {}).map((k) => [k, 0])) } } as GameState;
  const sectors = { ...s.sectors };
  for (const id of C.sectorOrder) {
    if (sectors[id].open) continue;
    const def = C.sectors[id];
    const apps: GameState['sectors'][string]['apps'] = {};
    for (const a of def.applications) { const av = a.visibleBelow === Infinity; apps[a.id] = { available: av, founded: av && a.foundCost <= 0, satMul: 1, peakD: 0, peakAdoption: 0 }; }
    sectors[id] = { ...sectors[id], open: true, reserve: def.reserve, reserveMax: def.reserve, apps };
  }
  s = { ...s, sectors, flags: { ...s.flags } };
  const safe = (x: GameState) => !model.derive(model.fastForward(x, C, 180), C).pendingReckoning;
  const kept = [s];
  for (let round = 0; round < 40; round++) {
    s = { ...s, capital: s.capital + 1e4 * Math.pow(1.8, round), mandate: (s.mandate || 0) + 50 };
    const vs = model.upgradeViews(s, C).filter((v) => v.visible && !v.maxed && v.affordable && !v.excludedBy).sort((a, b) => a.cost - b.cost);
    for (const v of vs.slice(0, 4)) { const n = model.buyUpgrade(s, C, v.def.id); if (n !== s) s = n; }
    const d = model.derive(s, C);
    for (const id of C.sectorOrder) for (const a of C.sectors[id].applications) if (d.sectors[id]?.apps[a.id]?.canFound) s = model.foundApp(s, C, a.id);
    const prev = s;
    s = model.fastForward(s, C, 10);
    if (model.derive(s, C).pendingReckoning) { s = prev; break; }
    kept.push(s);
  }
  while (kept.length > 1 && !safe(s)) s = kept.pop()!;
  for (const id of C.sectorOrder) { const n = model.drawBudget(s, C, id); if (n) s = n; }
  for (const v of model.leverViews(s, C).filter((x) => x.visible && x.canRaise).slice(0, 4)) { const n = model.setLever(s, C, v.def.id, 1); if (n) s = n; }
  return s;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
/** Median µs per call of f over fresh states (no identity cache can help: each call sees a new state). */
function cost(states: GameState[], f: (s: GameState) => unknown, reps = 3): number {
  const per: number[] = [];
  for (let r = 0; r < reps; r++) for (const s of states) { const t0 = performance.now(); f(s); per.push((performance.now() - t0) * 1000); }
  return median(per);
}

// µs, median per call in Bun. Measured when set (19 Nov 2026, a shared 4-core container): tick ≈ 16, tick + derive ≈ 140,
// derive (cold) ≈ 70, upgradeViews ≈ 25, leverViews ≈ 40, serialize ≈ 170 (the page's own late state, from a real
// session, costs more: about 2–3×). Budgets are ten or more times that.
const BUDGET = { tick: 400, tickDerive: 1500, derive: 2500, upgradeViews: 12000, leverViews: 3000, serialize: 6000 };

describe('per-call cost budgets (late game, five Industries)', () => {
  const s0 = lateState();
  test('the late state is mid-run with every Industry open', () => {
    expect(C.sectorOrder.every((id) => s0.sectors[id]?.open)).toBe(true);
    expect(model.derive(s0, C).pendingReckoning).toBeNull();
  });
  // A run of states a tenth of a second apart, as the loop makes them.
  const states: GameState[] = [];
  let s = s0;
  for (let i = 0; i < 120; i++) { s = model.tick(s, C, 0.1); states.push(s); }
  test(`tick ≤ ${BUDGET.tick} µs`, () => {
    const us = cost(states, (x) => model.tick(x, C, 0.1));
    console.log(`  tick ${us.toFixed(0)} µs`);
    expect(us).toBeLessThan(BUDGET.tick);
  });
  test(`tick then derive (one loop update) ≤ ${BUDGET.tickDerive} µs`, () => {
    const us = cost(states, (x) => model.derive(model.tick(x, C, 0.1), C));
    console.log(`  tick + derive ${us.toFixed(0)} µs`);
    expect(us).toBeLessThan(BUDGET.tickDerive);
  });
  test(`derive of a state not yet solved ≤ ${BUDGET.derive} µs`, () => {
    const cold = states.map((x) => ({ ...x }));
    const us = cost(cold, (x) => model.derive(x, C), 1);
    console.log(`  derive (cold) ${us.toFixed(0)} µs`);
    expect(us).toBeLessThan(BUDGET.derive);
  });
  test(`upgradeViews (the Industry on screen) ≤ ${BUDGET.upgradeViews} µs; leverViews ≤ ${BUDGET.leverViews} µs; serialize ≤ ${BUDGET.serialize} µs`, () => {
    const few = states.slice(0, 20).map((x) => ({ ...x }));
    const up = cost(few, (x) => model.upgradeViews(x, C, C.sectorOrder[C.sectorOrder.length - 1]), 1);
    const lv = cost(few.map((x) => ({ ...x })), (x) => model.leverViews(x, C), 1);
    const se = cost(few, (x) => model.serialize(x), 1);
    console.log(`  upgradeViews ${up.toFixed(0)} µs, leverViews ${lv.toFixed(0)} µs, serialize ${se.toFixed(0)} µs`);
    expect(up).toBeLessThan(BUDGET.upgradeViews);
    expect(lv).toBeLessThan(BUDGET.leverViews);
    expect(se).toBeLessThan(BUDGET.serialize);
  });
});
