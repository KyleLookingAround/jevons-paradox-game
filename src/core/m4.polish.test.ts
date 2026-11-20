// M4 (polish): an Institution level that waits on evidence (InstitutionDef.needs), achievements chained across runs
// ({ owns, earlier }), an achievement's headline, Derived.ending.roomBy, and unburnt coal counted by decades kept
// (GlobalParams.hindsight.unburntDecades). Every field is optional: content without them plays as before.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { AchievementDef, Content, GameState, InstitutionDef } from '../types';
import { model } from './index';
import { evalCond } from './conditions';
import { hindsightTerms } from './hindsight';
import { C4, openWith } from './m4.testkit';

const ROOM: InstitutionDef = {
  id: 'inst.room', name: 'A Commission', blurb: 'Room.', cost: 10, effects: [{ type: 'settleSlotAdd', value: 1 }],
  needs: { owns: 'ach.ev', label: 'The evidence is in' },
  nextLevels: [{ cost: 20, effects: [{ type: 'settleSlotAdd', value: 1 }], needs: { owns: 'ach.ev2', label: 'More evidence' } }],
};
const EV: AchievementDef = { id: 'ach.ev', name: 'Evidence', blurb: 'Rich.', when: { stat: 'capital', op: '>=', value: 5e5 }, headline: 'Evidence found' };
const EV2: AchievementDef = { id: 'ach.ev2', name: 'More', blurb: 'Again.', when: { all: [{ owns: 'ach.ev', earlier: true }, { stat: 'capital', op: '>=', value: 5e5 }] } };
const C: Content = { ...C4, institutions: [...(C4.institutions ?? []), ROOM], achievements: [...(C4.achievements ?? []), EV, EV2], global: { ...C4.global, settleMax: 1 } };

const fresh = (s: GameState): GameState => model.reckon(s, C);
const rich = (s: GameState): GameState => ({ ...s, meta: { ...s.meta, hindsight: 1e4 } });

describe('M4 (polish): an Institution level that waits on evidence', () => {
  test('refused and not buyable while needs fails, with its label; bought once it holds', () => {
    const s = rich(fresh(openWith(C, [])));
    const v = model.institutionViews(s, C).find((x) => x.def.id === 'inst.room')!;
    expect(v.canBuy).toBe(false);
    expect(v.affordable).toBe(true);
    expect(v.needs).toBe('The evidence is in');
    expect(model.buyInstitution(s, C, 'inst.room')).toBe(s);
    expect(model.derive(s, C).ending.roomBy).toEqual({ name: 'A Commission', cost: 10, needs: 'The evidence is in' });
    const t = { ...s, meta: { ...s.meta, achievements: { ...s.meta.achievements, 'ach.ev': true } } };
    const v2 = model.institutionViews(t, C).find((x) => x.def.id === 'inst.room')!;
    expect([v2.canBuy, v2.needs]).toEqual([true, null]);
    const u = model.buyInstitution(t, C, 'inst.room');
    expect(u.meta.institutions['inst.room']).toBe(1);
    // the next level has its own needs
    expect(model.institutionViews(u, C).find((x) => x.def.id === 'inst.room')!.needs).toBe('More evidence');
    expect(model.derive(u, C).ending.roomBy).toEqual({ name: 'A Commission', cost: 20, needs: 'More evidence' });
  });
  test('content without needs: canBuy as before, needs null', () => {
    const s = rich(fresh(openWith(C4, [])));
    for (const v of model.institutionViews(s, C4)) expect(v.needs).toBeNull();
  });
});

describe('M4 (polish): achievements across runs and their headline', () => {
  test('a granted `when` achievement records its run and prints its headline; { owns, earlier } waits for a later run', () => {
    let s = openWith(C, [], [], undefined, { capital: 1e6 });
    s = model.tick(s, C, 1.5);
    expect(s.meta.achievements['ach.ev']).toBe(true);
    expect(s.meta.milestones?.['ach:ach.ev']?.run).toBe(1);
    expect(s.news.some((n) => n.key === 'achievement' && n.text === 'Evidence found')).toBe(true);
    // same run: earned, but not earlier
    expect(evalCond(s, C, { owns: 'ach.ev' })).toBe(true);
    expect(evalCond(s, C, { owns: 'ach.ev', earlier: true })).toBe(false);
    s = model.tick(s, C, 1.5);
    expect(s.meta.achievements['ach.ev2']).toBeUndefined();
    // after a Reckoning it counts as earlier
    let t = fresh(s);
    expect(evalCond(t, C, { owns: 'ach.ev', earlier: true })).toBe(true);
    t = model.tick({ ...t, capital: 1e6 }, C, 1.5);
    expect(t.meta.achievements['ach.ev2']).toBe(true);
    // `earlier` is ignored for ids that are not achievements
    expect(evalCond(t, C, { owns: 'inst.room', earlier: true })).toBe(evalCond(t, C, { owns: 'inst.room' }));
  });
});

describe('M4 (polish): unburnt counted by full decades kept', () => {
  test('absent: as before; with the budget arrived, × min(1, full decades ÷ unburntDecades)', () => {
    const s0 = openWith(C4, []);
    const s: GameState = { ...s0, run: { ...s0.run, yearsAtTarget: 100, budgetDecades: 3, leanDecades: 1 } };
    const base = hindsightTerms(s, C4).unburnt;
    expect(base).toBeGreaterThan(0);
    const C2: Content = { ...C4, global: { ...C4.global, hindsight: { ...C4.global.hindsight, unburntDecades: 4 } } };
    expect(hindsightTerms(s, C2).unburnt).toBeCloseTo(base * 0.5, 9); // 2 full of 4
    const s2: GameState = { ...s, run: { ...s.run, budgetDecades: 10, leanDecades: 0 } };
    expect(hindsightTerms(s2, C2).unburnt).toBeCloseTo(hindsightTerms(s2, C4).unburnt, 9);
  });
});
