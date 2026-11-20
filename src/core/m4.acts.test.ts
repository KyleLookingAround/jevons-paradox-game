// M4 tests 8–10: Acts and the ending, the capstone, arrears (fixtureM4Acts: Act I over Steam, Iron and Fish with a
// capstone and endingYears 2 = 40 s; Act II a Preview over the later ages).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { ARREARS_COLLAPSE_HOLD, YEARS_PER_SECOND } from '../types';
import type { Content, GameState, MetaState } from '../types';
import { model } from './index';
import { currentAct } from './acts';
import { computeFlows } from './flows';
import { hindsightTerms } from './hindsight';
import { fixtureM4Acts as CA } from './fixture';
import { forceSettle, openWith, patch, run4 } from './m4.testkit';

const ACT1 = ['steam', 'iron', 'fish'];
function allSettled(c: Content = CA): GameState {
  let s = openWith(c, ['iron', 'fish', 'light'], ['steam.pumping', 'steam.mills', 'iron.rails', 'iron.pots', 'fish.market']);
  s = run4(s, 2, c);
  for (const id of ACT1) s = forceSettle(s, c, id);
  return s;
}
function won(): GameState {
  let s = allSettled();
  for (let i = 0; i < 41 && !s.flags.won; i++) s = model.tick(s, CA, 1);
  return s;
}

describe('M4: Acts and the ending', () => {
  test('the current act is the first whose ending is not reached; an act with no ending stays current', () => {
    const m = model.createState(CA).meta;
    expect(currentAct(CA, m)?.id).toBe('actOne');
    const m2: MetaState = { ...m, endings: { actOne: { run: 1, runSeconds: 1, totalSeconds: 1, year: 1900 } } };
    expect(currentAct(CA, m2)?.id).toBe('actTwo');
    expect(model.derive(model.createState(CA), CA).ending.act).toEqual({ id: 'actOne', name: 'Act I', title: 'The Coal Age' });
    expect(model.derive(model.createState(CA), CA).ending.total).toBe(3);
  });
  test('the streak counts only with every ending sector open and settled; any other step resets it', () => {
    const s = allSettled();
    const s1 = model.tick(s, CA, 1);
    expect(s1.steadyYearsAll).toBeCloseTo(YEARS_PER_SECOND, 12);
    const loose = patch(s1, 'fish', { settled: null });
    expect(model.tick(loose, CA, 1).steadyYearsAll).toBe(0);
    // light is not in Act I's set: settling it or not changes nothing
    expect(model.derive(s1, CA).ending.settled).toBe(3);
  });
  test('at endingYears: flags.won, the record, the milestone, won then ending, steadyAll then actEnding, the capstone', () => {
    const s = won();
    expect(s.flags.won).toBe(true);
    expect(s.meta.endings.actOne).toBeDefined();
    expect(s.meta.endings.steadyAll).toBeUndefined();
    expect(s.meta.milestones['ending:actOne']).toBeDefined();
    const ev = s.events.filter((e) => e.kind === 'won' || e.kind === 'ending');
    expect(ev.map((e) => [e.kind, e.id])).toEqual([['won', undefined], ['ending', 'actOne']]);
    const keys = s.news.map((n) => n.key);
    expect(keys.indexOf('actEnding')).toBeLessThan(keys.indexOf('steadyAll')); // newest first
    expect(Object.keys(s.meta.world!.capstone!).sort()).toEqual(['fish', 'iron', 'steam']);
    expect(s.meta.world!.capstone!.steam.act).toBe('actOne');
    const d = model.derive(s, CA).ending;
    expect(d.reached).toBe(true);
    expect(d.act!.id).toBe('actOne');
    expect(d.progress).toBe(1);
    // no second ending this run
    const later = run4(s, 60, CA);
    expect(later.events.filter((e) => e.kind === 'ending').length).toBe(1);
  });
  test('previews: SectorDerived.preview for the Preview act\'s sectors only', () => {
    const s = openWith(CA, ['motion']);
    expect(model.derive(s, CA).sectors.motion!.preview).toBe(true);
    expect(model.derive(s, CA).sectors.steam!.preview).toBe(false);
  });
});

describe('M4: the capstone', () => {
  const after = model.reckon(won(), CA);
  test('reckon builds the capstoned sectors settled, with one capstoned event each after reckoning, and the milestone', () => {
    for (const id of ACT1) {
      expect(after.sectors[id].open).toBe(true);
      expect(after.sectors[id].capstoned).toBe(true);
      expect(after.sectors[id].settled!.since).toBe(0);
      expect(after.sectors[id].settledBefore).toBe(true);
    }
    expect(after.events.map((e) => e.kind).slice(0, 4)).toEqual(['reckoning', 'capstoned', 'capstoned', 'capstoned']);
    expect(after.events.filter((e) => e.kind === 'capstoned').map((e) => [e.sector, e.id])).toEqual([['steam', 'actOne'], ['iron', 'actOne'], ['fish', 'actOne']]);
    expect(after.meta.milestones.capstone).toBeDefined();
    expect(model.derive(after, CA).sectors.steam!.capstoned).toBe(true);
    expect(currentAct(CA, after.meta)?.id).toBe('actTwo');
  });
  test('per-head scaling: k = min(1, N/N0) on D, R and income (× incomeShare); above N0 the excess rule', () => {
    const rec = after.meta.world!.capstone!.steam.settled;
    const meta: MetaState = { ...after.meta, world: { capstone: { ...after.meta.world!.capstone!, steam: { ...after.meta.world!.capstone!.steam, settled: { ...rec, N0: 4 } } } } };
    const s = { ...model.createState(CA, meta), population: 1 };
    const f = computeFlows(s, CA).sectors.steam;
    expect(f.D).toBeCloseTo(rec.D / 4, 9);
    expect(f.R).toBeCloseTo(rec.R / 4, 9);
    expect(f.income).toBeCloseTo(rec.income / 4 * 0.25, 9);
    const big = { ...s, population: 8 };
    const fb = computeFlows(big, CA);
    expect(fb.sectors.steam.D).toBeCloseTo(rec.D, 9);
    expect(fb.settled.steam.excess).toBeCloseTo(1, 9);
    expect(fb.settled.steam.defence).toBeCloseTo(2 * (1 - 0.05), 9);
  });
  test('not in room, no hold; unsettle refused; levers hidden; Hindsight exclusions; createState(content, meta)', () => {
    const roomy: Content = { ...CA, global: { ...CA.global, settleMax: 1 } };
    expect(model.derive(after, roomy).ending.room).toBe(1);
    expect(model.unsettle(after, CA, 'steam')).toBe(after);
    expect(model.leverViews(after, CA).find((l) => l.def.id === 'steam.duty')!.visible).toBe(false);
    expect(model.setLever(after, CA, 'steam.duty', 1)).toBe(after);
    const t = hindsightTerms({ ...after, sectors: { ...after.sectors } }, CA);
    expect(t.sectorsReached).toBe(0); // three capstoned only: none counted
    const H: Content = { ...CA, acts: CA.acts!.map((a) => (a.capstone ? { ...a, capstone: { ...a.capstone, hindsight: true } } : a)) };
    expect(hindsightTerms(after, H).sectorsReached).toBe(CA.global.hindsight.perSectorReached * 2);
    const fresh = model.createState(CA, after.meta);
    expect(fresh.sectors.fish.capstoned).toBe(true);
    expect(fresh.events.length).toBe(0);
    expect(model.derive(fresh, CA).ending.next).toBeNull();
  });
});

describe('M4: arrears', () => {
  const after = model.reckon(won(), CA);
  // a world grown past the capstone's N0, so Steam's excess needs defending, and no Mandate to defend it with
  const short = (s: GameState): GameState => ({ ...s, population: 20 * s.sectors.steam.settled!.N0, mandate: 0 });
  test('a capstoned sector goes into arrears instead of unsettling, only once the levers have lapsed', () => {
    let s = short(after);
    s = openWith(CA, [], [], s.meta, {}).meta === s.meta ? s : s; // (keep the reckoned state)
    s = { ...s, levers: { ...s.levers, 'light.greenSpending': { level: 1, ref: 0 } }, sectors: { ...s.sectors, light: { ...s.sectors.light } } };
    const fl = computeFlows(s, CA);
    expect(fl.settled.steam.defence).toBeGreaterThan(0);
    const s1 = model.tick(s, CA, 1);
    expect(s1.sectors.steam.arrears).toBe(true);
    expect(s1.sectors.steam.settled).not.toBeNull();
    expect(s1.events.some((e) => e.kind === 'arrears' && e.sector === 'steam')).toBe(true);
    expect(s1.events.some((e) => e.kind === 'unsettled')).toBe(false);
    expect(s1.news.some((n) => n.key === 'arrears')).toBe(true);
    expect(model.derive(s1, CA).sectors.steam!.arrears).toBe(true);
  });
  test('in arrears: R × (1 + excess − freeExcess), pressure stepped, held below the collapse, no defence charged', () => {
    const s1 = model.tick(short(after), CA, 1);
    const fl = computeFlows(s1, CA);
    const rec = s1.sectors.steam.settled!;
    const ex = fl.settled.steam.excess;
    expect(fl.sectors.steam.R).toBeCloseTo(rec.R * (1 + ex - 0.05), 9);
    expect(fl.settled.steam.defence).toBe(0);
    expect(fl.settled.steam.due).toBeGreaterThan(0);
    const P0 = s1.sectors.steam.pressure;
    const s2 = model.tick(s1, CA, 1);
    expect(s2.sectors.steam.pressure).toBeGreaterThan(P0);
    const hot = model.tick(patch(s1, 'steam', { pressure: 99.9 }), CA, 1);
    expect(hot.sectors.steam.pressure).toBeLessThanOrEqual(ARREARS_COLLAPSE_HOLD * 100 + 1e-9);
    expect(model.derive(hot, CA).pendingReckoning).toBeNull();
  });
  test('cleared when Mandate covers the defence for the step (paid); offline holds one step before arrears', () => {
    const s1 = model.tick(short(after), CA, 1);
    const due = computeFlows(s1, CA).settled.steam.due!;
    const rich = { ...s1, mandate: 1e6 };
    const s2 = model.tick(rich, CA, 1);
    expect(s2.sectors.steam.arrears).toBe(false);
    expect(s2.events.some((e) => e.kind === 'arrearsCleared' && e.sector === 'steam')).toBe(true);
    expect(s2.mandate).toBeLessThan(1e6 + 1e3);
    expect(due).toBeGreaterThan(0);
    const ff = model.fastForward(short(after), CA, 600);
    expect(ff.lastOffline!.heldBy).toBe('arrears');
    expect(ff.lastOffline!.heldSector).toBe('steam');
    expect(ff.sectors.steam.arrears).toBeFalsy();
  });
});
