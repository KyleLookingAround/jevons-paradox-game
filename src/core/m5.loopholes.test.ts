// M5 Core A: loophole ladders (LoopholeDef; ChairState.loopholes): the first rung opens, evade uses it (the exempt app,
// the escape, the rung's effects), amendment (drafting, held in Opposition, the next rung, the answer falls due),
// closedBy (the robust rung; a used rung reopens), the conditions, and E5 (exit criterion 13 on the fixture).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { YEARS_PER_SECOND } from '../types';
import type { Content, GameState } from '../types';
import { fixtureM5Quiet as fixtureM5 } from './fixture';
import { adv, ministry } from './m5.testkit';
import { amend, evadeRung, loopholeStep, loopholeViews, robustReopen } from './chair/loopholes';
import { leverEscape } from './chair/acting';
import { setLever } from './policy';
import { computeFlows } from './flows';
import { modsOf } from './effects';
import { sectorLevers } from './levers';
import { evalCond, statValue } from './conditions';

const C = fixtureM5;
const LT = 'motor.mileage.lightTrucks', FP = 'motor.mileage.footprint';
const base = (() => { let g: GameState | null = null; return () => (g ??= adv(ministry(C), C, 120)); })();
const raise = (s: GameState, id: string, L: number): GameState => {
  const t = setLever(s, C, id, L);
  return t === s ? s : { ...t, levers: { ...t.levers, [id]: { ...t.levers[id], raisedAt: t.time } } };
};
const evaded = (): GameState => adv(raise(base(), 'motor.mileage', 1), C, 20);

describe('M5 loopholes: rungs', () => {
  test('the first rung opens when a laddered lever first acts; not before; not while the feature is off', () => {
    expect(loopholeStep(base(), C)).toBe(base());
    const s = loopholeStep(raise(base(), 'motor.mileage', 1), C);
    expect(s.chair!.loopholes[LT]).toEqual({ status: 'open', since: s.time });
    expect(s.chair!.loopholes[FP]).toBeUndefined();
    expect(s.events[s.events.length - 1]).toMatchObject({ kind: 'loopholeOpened', id: LT });
    const off: Content = { ...C, features: { loopholes: { when: { flag: 'never' } } } };
    const r = raise(base(), 'motor.mileage', 1);
    expect(loopholeStep(r, off)).toBe(r);
  });
  test('evade: the rung used, the exempt app founded by the rival, the escape and the rung effects act', () => {
    const s = evaded();
    expect(s.chair!.rival.answers['motor.mileage'].kind).toBe('evade');
    expect(s.chair!.loopholes[LT].status).toBe('used');
    expect(s.sectors.motor.apps['motor.vans'].founded).toBe(true);
    expect(s.events.some((e) => e.kind === 'appFounded' && e.id === 'motor.vans' && e.by === 'rival')).toBe(true);
    expect(leverEscape(s, C, 'motor.mileage')).toBeCloseTo(0.6, 12);
    const m = modsOf(s, C);
    // the measure acts at value 1 × (1 − 0.6); the rung's satMul on the vans × the effective level (1)
    expect(m.marginAdd.motor).toBeCloseTo(-0.02 * 0.4, 12);
    expect(m.satMulApp['motor.vans']).toBeCloseTo(1.15, 12);
    expect(statValue(s, C, { stat: 'loopholesUsed', sector: 'motor' })).toBe(1);
    expect(evalCond(s, C, { loophole: LT })).toBe(true);
    expect(evalCond(s, C, { loophole: LT, status: 'open' })).toBe(false);
    expect(evalCond(s, C, { owns: LT })).toBe(true);
  });
  test('amend: Mandate, drafting (acts as before), held in Opposition, then closed; the next rung opens; re-answered', () => {
    let s = evaded();
    const m0 = s.mandate;
    s = amend(s, C, LT);
    expect(s.mandate).toBe(m0 - 60);
    const st = s.chair!.loopholes[LT];
    expect([st.status, st.before, st.draftUntil]).toEqual(['drafting', 'used', s.time + 5 / YEARS_PER_SECOND]);
    expect(leverEscape(s, C, 'motor.mileage')).toBeCloseTo(0.6, 12);
    expect(amend(s, C, LT)).toBe(s);
    const v = loopholeViews(s, C, 'motor.mileage')[0];
    expect([v.status, v.draftTotal, v.canAmend]).toEqual(['drafting', 100, false]);
    // in Opposition the amendment is held at draftUntil
    const opp = { ...s, chair: { ...s.chair!, inOpposition: true } };
    const held = adv(opp, C, 110);
    expect(held.chair!.loopholes[LT].status).toBe('drafting');
    const back = adv({ ...held, chair: { ...held.chair!, inOpposition: false } }, C, 1);
    expect(back.chair!.loopholes[LT].status).toBe('closed');
    // closes on time in office; the footprint rung opens; the lever's answer falls due and he answers it
    const done = adv(s, C, 101);
    expect(done.chair!.loopholes[LT].status).toBe('closed');
    expect(done.chair!.loopholes[FP].status === 'open' || done.chair!.loopholes[FP].status === 'used').toBe(true);
    expect(done.events.some((e) => e.kind === 'loopholeClosed' && e.id === LT)).toBe(true);
    expect(leverEscape(done, C, 'motor.mileage')).toBeLessThan(0.6);
  });
  test('closedBy: the footprint rung is shut to him while the duty is in force; a used rung reopens at a tick', () => {
    let s = adv(amend(evaded(), C, LT), C, 101);
    s = adv(s, C, 20);
    expect(s.chair!.loopholes[FP].status).toBe('used');
    expect(amend(s, C, FP)).toBe(s); // closedBy without amend: only pairing closes it
    s = raise(s, 'motor.duty', 1);
    const r = robustReopen(s, C);
    expect(r.chair!.loopholes[FP].status).toBe('open');
    expect(r.chair!.due?.['motor.mileage']).toBe(true);
    expect(evadeRung(r, C, 'motor.mileage')).toBeNull();
    const v = loopholeViews(r, C, 'motor.mileage').find((x) => x.id === FP)!;
    expect([v.robust, v.robustLabel, v.canAmend, v.amendCost]).toEqual([true, 'A fuel duty in force', false, null]);
    const t = adv(s, C, 20);
    expect(t.chair!.loopholes[FP].status).toBe('open');
    expect(t.chair!.rival.answers['motor.mileage'].kind).not.toBe('evade');
  });
  test('escape on a cap and a duty (folded into the solver\'s aggregate)', () => {
    const LC: Content = {
      ...C,
      levers: C.levers!.map((l) => (l.id === 'motor.cap' ? { ...l, ladder: ['motor.cap.wells'] } : l.id === 'motor.duty' ? { ...l, ladder: ['motor.duty.rebate'] } : l)),
      loopholes: [...C.loopholes!, { id: 'motor.cap.wells', lever: 'motor.cap', name: 'w', blurb: '', escape: 0.5, premium: 0 },
        { id: 'motor.duty.rebate', lever: 'motor.duty', name: 'r', blurb: '', escape: 0.25, premium: 0 }],
    };
    let s = setLever(setLever(base(), LC, 'motor.cap', 1), LC, 'motor.duty', 1);
    s = { ...s, chair: { ...s.chair!, loopholes: { 'motor.cap.wells': { status: 'used', since: 0 }, 'motor.duty.rebate': { status: 'used', since: 0 } } } };
    const lev = sectorLevers(s, LC).motor;
    expect(lev.capFrac).toBeCloseTo(1 / 0.5, 12);
    expect(lev.dutyS).toBeCloseTo(0.3 * 0.75, 12);
  });
});

describe('M5 loopholes: E5 (exit criterion 13 on the fixture)', () => {
  const R30 = (mileage: number, duty: number, doAmend: boolean): number => {
    let s = base();
    for (let l = 1; l <= mileage; l++) s = raise(s, 'motor.mileage', l);
    for (let l = 1; l <= duty; l++) s = raise(s, 'motor.duty', l);
    const end = s.time + 30 / YEARS_PER_SECOND;
    while (s.time < end) {
      if (doAmend) for (const id in s.chair!.loopholes) { const t = amend(s, C, id); if (t !== s) s = t; }
      const nx = adv(s, C, 1);
      if (nx.time === s.time) break;
      s = nx;
    }
    return computeFlows(s, C).sectors.motor!.R;
  };
  test('the standard alone does not cut R (≥ 0.95×); amended and paired with the duty it does (≤ 0.9×)', () => {
    const b = R30(0, 0, false);
    expect(R30(2, 0, false) / b).toBeGreaterThanOrEqual(0.95);
    expect(R30(2, 1, true) / b).toBeLessThanOrEqual(0.9);
    // the duty alone leaves rung 1 open: without the amendment the pairing does not reach it (recorded finding)
    expect(R30(2, 1, false) / b).toBeGreaterThan(0.9);
  });
});
