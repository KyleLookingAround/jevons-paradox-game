// M5 follow-up 2 (Core A): DispatchDef.recur 'parliament': a letter recurs once per Parliament in a Ministry.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, DispatchDef, GameState } from '../types';
import { fixtureM5Quiet } from './fixture';
import { ministry } from './m5.testkit';
import { eligible } from './dispatch';

const D = (recur?: 'parliament'): DispatchDef => ({ id: 'd.w', cast: 'nobody', headline: 'h', body: 'b', arms: [{ label: 'a' }, { label: 'b' }], ...(recur ? { recur } : {}) } as DispatchDef);
const C: Content = { ...fixtureM5Quiet, dispatches: [D('parliament')] };
const at = (s: GameState, start: number, answeredAt: number | null, pending = false): GameState => ({
  ...s, time: 1000,
  chair: { ...s.chair!, parliament: { ...s.chair!.parliament, index: 2, start } },
  dispatch: { ...s.dispatch, offered: ['d.w'], pending: pending ? [{ id: 'd.w', arrivedAt: 990, expiresAt: 1100 }] : [],
    answered: answeredAt === null ? [] : [{ id: 'd.w', arm: 0, t: answeredAt, by: 'default' }] },
});

describe('M5 follow-up: DispatchDef.recur', () => {
  const s = ministry(C);
  test('without recur: never twice in a run', () => {
    expect(eligible(at(s, 900, 500), C, D())).toBe(false);
  });
  test('recur parliament: eligible again in a later Parliament; not twice in one; not while pending', () => {
    expect(eligible(at(s, 900, 500), C, D('parliament'))).toBe(true);
    expect(eligible(at(s, 900, 950), C, D('parliament'))).toBe(false);
    expect(eligible(at(s, 900, null, true), C, D('parliament'))).toBe(false);
  });
  test('outside a Ministry, recur changes nothing', () => {
    expect(eligible({ ...at(s, 900, 500), chair: null }, C, D('parliament'))).toBe(false);
  });
});
