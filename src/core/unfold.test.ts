// The unfolding (FeatureDef): gates, the unlock check and its spacing, Reckoning unlocks, grandfathering, and the cap's
// redraw over an outgrown line. Against the test fixture with features added (the fixture itself has none).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model } from './index';
import { fixture } from './fixture';
import type { Content, GameState } from '../types';

const F: Content = {
  ...fixture,
  global: { ...fixture.global, featureGapSeconds: 60 },
  levers: fixture.levers.map((l) => (l.id === 'steam.cap' ? { ...l, requires: ['budget'] } : l)),
  features: {
    reboundMeter: { when: { flag: 'revealed' } },
    levers: { when: { flag: 'revealed' }, intro: 'Levers proposed' },
    budget: { when: { stat: 'time', op: '>=', value: 30 }, intro: 'A budget' },
    budgetPace: { when: { stat: 'reckonings', op: '>=', value: 1 } },
    market: { when: { stat: 'reckonings', op: '>=', value: 1 }, intro: 'The Market' },
  },
};
const revealed = (s: GameState): GameState => ({ ...s, flags: { ...s.flags, revealed: true }, capital: 1e6, mandate: 1e4 });
const tickN = (s: GameState, n: number, c: Content = F) => { for (let i = 0; i < n; i++) s = model.tick(s, c, 1); return s; };

describe('the unfolding', () => {
  test('content without features: every feature reads unlocked and nothing is gated', () => {
    const d = model.derive(model.createState(fixture), fixture);
    expect(Object.values(d.features).every(Boolean)).toBe(true);
  });
  test('a gated action is refused (same reference) and a gated lever hidden until its feature arrives', () => {
    let s = tickN(revealed(model.createState(F)), 2);
    expect(model.drawBudget(s, F, 'steam')).toBe(s);
    expect(model.leverViews(s, F).find((l) => l.def.id === 'steam.cap')!.visible).toBe(false);
    // Tighten past the authored levels waits for leverRepeat (not in F: always on), recycle for moreLevers (always on)
    expect(model.derive(s, F).features.budget).toBe(false);
    s = tickN(s, 200);
    expect(model.derive(s, F).features.budget).toBe(true);
    expect(model.drawBudget(s, F, 'steam')).not.toBe(s);
  });
  test('one at a time: the gap holds the next back; an intro is a headline and an event', () => {
    const s = tickN(revealed(model.createState(F)), 200);
    const f = s.meta.features!;
    const times = Object.values(f).sort((a, b) => a! - b!) as number[];
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(60);
    expect(s.news.some((n) => n.key === 'featureUnlocked' && n.text === 'Levers proposed')).toBe(true);
    expect(s.events.filter((e) => e.kind === 'featureUnlocked').map((e) => e.id)).toContain('budget');
  });
  test('the first pace only until budgetPace; a Reckoning unlocks what waits on it; features outlive the run', () => {
    let s = tickN(revealed(model.createState(F)), 200);
    expect(model.drawBudget(s, F, 'steam', 'firm')).toBe(s);
    s = model.reckon(s, F);
    expect(s.meta.features?.budget).toBeDefined();
    expect(Object.keys(s.meta.features ?? {}).filter((k) => k === 'budgetPace' || k === 'market').length).toBe(1);
  });
  test('M5 follow-up 2: a Reckoning\'s arrival is not held back by a mid-run arrival inside the gap (one per check)', () => {
    let s = tickN(revealed(model.createState(F)), 100);
    const n0 = Object.keys(s.meta.features ?? {}).length;
    for (let i = 0; i < 200 && Object.keys(s.meta.features ?? {}).length === n0; i++) s = tickN(s, 1);
    const last = Math.max(...(Object.values(s.meta.features ?? {}) as number[]));
    expect(s.meta.totalSeconds - last).toBeLessThan(60); // the run ends inside the gap after its last arrival
    s = model.reckon(s, F);
    const now = Object.keys(s.meta.features ?? {});
    expect(now.filter((k) => k === 'budgetPace' || k === 'market').length).toBe(1);
    expect(s.meta.features![now.find((k) => k === 'budgetPace' || k === 'market') as 'market']).toBe(s.meta.totalSeconds);
  });
  test('nothing unlocks inside fastForward; it arrives once ticking resumes', () => {
    const s0 = revealed(model.createState(F));
    const f = model.fastForward(s0, F, 600);
    expect(Object.keys(f.meta.features ?? {}).length).toBe(0);
    expect(Object.keys(tickN(f, 6).meta.features ?? {}).length).toBe(1);
  });
  test('grandfathering: a save from before the unfolding keeps what the old build showed it', () => {
    const s = tickN(revealed(model.createState(F)), 5);
    const raw = JSON.parse(model.serialize(s));
    delete raw.meta.features;
    const back = model.deserialize(JSON.stringify(raw), F)!;
    expect(model.derive(back, F).features.budget).toBe(true);
    expect(model.derive(back, F).features.market).toBe(false);
  });
  test('a cap enacted over a line the economy has outgrown redraws the line at today\'s use', () => {
    let s = tickN(revealed(model.createState(fixture)), 5, fixture);
    s = model.drawBudget(s, fixture, 'steam');
    s = { ...s, sectors: { ...s.sectors, steam: { ...s.sectors.steam, budget: { ...s.sectors.steam.budget!, r0: s.sectors.steam.budget!.r0 / 3 } } } };
    const R = model.derive(s, fixture).sectors.steam!.resourceUse;
    const t = model.setLever(s, fixture, 'steam.cap', 1);
    expect(t.sectors.steam.budget!.r0).toBeCloseTo(R, 6);
  });
});
