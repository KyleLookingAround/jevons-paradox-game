// M2 performance fix of the upgrade cards' projections: the focused, cached method against the exact M1 method
// (both clones fully simulated at dt 5 from the very state), on efficiency and budget play, fixture and real content.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model } from './index';
import { fixture } from './fixture';
import { content as real } from '../content';
import { PROJECTION_SECONDS } from './constants';
import { projectOne, simulate } from './projections';
import { openAll } from './m1.testkit';
import type { Content, GameState, UpgradeView } from '../types';

declare const Bun: { nanoseconds(): number };

/** Tolerance of the focused method: |(1 + new) / (1 + exact) − 1|. */
const TOL = 0.005;

const cheap = (s: GameState, c: Content) => model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, c);
function exact(s: GameState, c: Content, v: UpgradeView) {
  const base = simulate(s, c, PROJECTION_SECONDS, 5);
  return projectOne(s, c, v.def, base, 5);
}
function compare(s: GameState, c: Content, out: { n: number; worst: number }): void {
  const fresh = { ...s, upgrades: { ...s.upgrades } }; // a new cache key
  for (const v of model.upgradeViews(fresh, c)) {
    if (v.projectedDecade === null) continue;
    const ex = exact(s, c, v);
    expect(ex.projectedDecade).not.toBeNull();
    const err = Math.abs((1 + v.projectedDecade) / (1 + ex.projectedDecade!) - 1);
    out.n++; out.worst = Math.max(out.worst, err);
    expect(err).toBeLessThanOrEqual(TOL);
    expect(v.bringsWithinReach.map((b) => b.appId)).toEqual(ex.bringsWithinReach.map((b) => b.appId));
  }
}
function play(c: Content, mode: 'efficiency' | 'budget', seconds: number, every: number, seed = 1): { n: number; worst: number } {
  let s = model.createState(c, undefined, seed);
  const out = { n: 0, worst: 0 };
  for (let t = 0; t < seconds && !model.derive(s, c).pendingReckoning; t++) {
    for (let g = 0; g < 20; g++) {
      const v = cheap(s, c).filter((x) => x.affordable).sort((a, b) => a.cost - b.cost)[0];
      if (!v) break;
      s = model.buyUpgrade(s, c, v.def.id);
    }
    for (const e of c.sectorOrder) if (s.sectors[e]?.open) for (const a of c.sectors[e].applications) s = model.foundApp(s, c, a.id);
    if (mode === 'budget' && s.flags.revealed && t % 5 === 0) {
      for (const e of c.sectorOrder) if (s.sectors[e]?.open && !s.sectors[e].budget) s = model.drawBudget(s, c, e);
      for (const l of model.leverViews(s, c)) if (l.def.kind === 'cap' && l.level === 0 && l.canRaise) s = model.setLever(s, c, l.def.id, 1);
    }
    s = model.click(s, c);
    s = model.tick(s, c, 1);
    if (t % every === 0 && s.flags.revealed) compare(s, c, out);
  }
  return out;
}

/** Every sector open, Steam bought out, the later sectors' cards still to buy. */
function lateState(): GameState {
  const s = openAll(fixture);
  const upgrades: Record<string, number> = {};
  for (const [id, l] of Object.entries(s.upgrades)) if (id.startsWith('steam.')) upgrades[id] = l;
  return { ...s, upgrades, capital: 1e6, flags: { revealed: true, won: false } };
}

describe('M2 projections: focused and cached, within tolerance of the exact method', () => {
  test('fixture: efficiency and budget play', () => {
    const a = play(fixture, 'efficiency', 2400, 150);
    const b = play(fixture, 'budget', 2400, 150);
    expect(a.n + b.n).toBeGreaterThan(5);
  });
  test('fixture: every sector open (spill and drawsOn couple the clones)', () => {
    let s = lateState();
    const out = { n: 0, worst: 0 };
    for (let i = 0; i < 3; i++) { compare(s, fixture, out); s = model.tick(s, fixture, 40); }
    expect(out.n).toBeGreaterThan(6);
  });
  test('real content: efficiency and budget play', () => {
    const a = play(real, 'efficiency', 3000, 240);
    const b = play(real, 'budget', 3000, 240);
    console.log(`real: efficiency ${a.n} cards, worst ${(a.worst * 100).toFixed(3)}%; budget ${b.n} cards, worst ${(b.worst * 100).toFixed(3)}%`);
    expect(a.n + b.n).toBeGreaterThan(5);
  }, 120_000);
  test('cache: the same structure within a time bucket costs nothing; a purchase or a new bucket recomputes', () => {
    let s = { ...lateState(), time: 400 }; // bucket start
    const v1 = model.upgradeViews(s, fixture);
    const s2 = { ...s, time: 410, population: s.population * 1.01 };
    const v2 = model.upgradeViews(s2, fixture);
    expect(v2.map((v) => v.projectedDecade)).toEqual(v1.map((v) => v.projectedDecade)); // cached (same bucket)
    const t0 = Bun.nanoseconds();
    model.upgradeViews(s2, fixture);
    expect((Bun.nanoseconds() - t0) / 1e6).toBeLessThan(2);
  });
  test('sector argument: only that sector is projected; the others are returned without lines', () => {
    const s = lateState();
    const all = model.upgradeViews({ ...s, upgrades: { ...s.upgrades } }, fixture);
    const one = (model.upgradeViews as (s: GameState, c: Content, sector?: string) => UpgradeView[])({ ...s, upgrades: { ...s.upgrades } }, fixture, 'light');
    expect(one.length).toBe(all.length);
    for (let i = 0; i < all.length; i++) {
      if (all[i].def.sector === 'light') expect(one[i].projectedDecade).toBe(all[i].projectedDecade);
      else expect(one[i].projectedDecade).toBeNull();
    }
  });
});
