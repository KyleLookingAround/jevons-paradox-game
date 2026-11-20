// M4 tests 11–13: wager arms, the new conditions, save version 5.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, GameState, StatKey } from '../types';
import { model } from './index';
import { evalCond, statValue } from './conditions';
import { fixtureM3, fixtureM4Acts as CA } from './fixture';
import { C4, forceSettle, openWith, patch, run4 } from './m4.testkit';

const K = 100_000;
const pend = (s: GameState, id: string): GameState => ({ ...s, dispatch: { ...s.dispatch, pending: [{ id, arrivedAt: s.time, expiresAt: s.time + 100 }], offered: [id] } });

describe('M4: wager arms', () => {
  test('wins when the condition holds at the answer: cost, the arm\'s own effects and reply, then the branch\'s', () => {
    const s = { ...pend(openWith(C4, []), 'd.bet'), capital: 5_000, mandate: 50 };
    const a = model.answerDispatch(s, C4, 1, 'd.bet');
    expect(a.mandate).toBeCloseTo(50 - 5 + 1 + 20, 9);
    const ans = a.dispatch.answered[a.dispatch.answered.length - 1];
    expect(ans).toMatchObject({ id: 'd.bet', arm: 1, by: 'player', won: true });
    const ev = a.events[a.events.length - 1];
    expect([ev.kind, ev.n, ev.label]).toEqual(['dispatchAnswered', 1, 'won']);
    expect(a.news.slice(0, 2).map((n) => n.text)).toEqual(['The bet pays.', 'The proprietor bets.']);
  });
  test('loses otherwise; the condition is judged after the cost is paid', () => {
    const s = { ...pend(openWith(C4, []), 'd.bet'), capital: 100, mandate: 50 };
    const a = model.answerDispatch(s, C4, 1, 'd.bet');
    expect(a.mandate).toBeCloseTo(50 - 5 + 1 + 2, 9);
    expect(a.dispatch.answered[a.dispatch.answered.length - 1].won).toBe(false);
    expect(a.events[a.events.length - 1].label).toBe('lost');
    const onMandate: Content = { ...C4, dispatches: C4.dispatches!.map((d) => (d.id === 'd.bet' ? { ...d, arms: d.arms.map((x, i) => (i === 1 ? { ...x, wager: { ...x.wager!, when: { stat: 'mandate' as StatKey, op: '>=' as const, value: 10 } } } : x)) } : d)) };
    const t = { ...pend(openWith(onMandate, []), 'd.bet'), mandate: 12 };
    expect(model.answerDispatch(t, onMandate, 1, 'd.bet').dispatch.answered.slice(-1)[0].won).toBe(false); // 12 − 5 < 10
  });
  test("a branch's standing effects stand (resolved from won); its modifier carries the branch", () => {
    const base = openWith(C4, ['fish'], ['fish.market']);
    const lose = model.answerDispatch(pend(patch(base, 'fish', { reserve: 0.3 * K }), 'd.shoals'), C4, 1, 'd.shoals');
    expect(lose.dispatch.answered.slice(-1)[0].won).toBe(false);
    expect(lose.dispatch.standing).toContainEqual(['d.shoals', 1]);
    expect(lose.sectors.fish.eta).toBeCloseTo(0.9 * base.sectors.fish.eta, 12);
    const win = model.answerDispatch(pend(patch(base, 'fish', { reserve: 0.8 * K }), 'd.shoals'), C4, 1, 'd.shoals');
    expect(win.dispatch.answered.slice(-1)[0].won).toBe(true);
    expect(win.modifiers.find((m) => m.source === 'd.shoals')).toMatchObject({ arm: 1, branch: 'win' });
    expect(model.derive(win, C4).modifiers.find((m) => m.source === 'd.shoals')!.label).toBe('Full nets');
    expect(win.sectors.fish.eta).toBeCloseTo(base.sectors.fish.eta, 12);
  });
  test('the view shows the hint and both outcomes for a wager arm only; an expiry never wagers', () => {
    const s = pend(openWith(C4, []), 'd.bet');
    const v = model.derive(s, C4).dispatch.pending[0].arms;
    expect(v[0].wager).toBeNull();
    expect(v[1].wager).toEqual({ hint: 'Pays if the books are fat', win: 'It pays', lose: 'It does not' });
    const late = { ...s, dispatch: { ...s.dispatch, pending: [{ id: 'd.bet', arrivedAt: 0, expiresAt: s.time + 0.5 }] } };
    const e = model.tick(late, C4, 1);
    const ans = e.dispatch.answered.slice(-1)[0];
    expect(ans).toMatchObject({ id: 'd.bet', arm: 0, by: 'default' });
    expect(ans.won).toBeUndefined();
    // even content that broke the lint (a wager as the default arm) does not wager on a default
    const bad: Content = { ...C4, dispatches: C4.dispatches!.map((d) => (d.id === 'd.bet' ? { ...d, defaultArm: 1 } : d)) };
    const b = model.tick({ ...late }, bad, 1);
    expect(b.dispatch.answered.slice(-1)[0]).toMatchObject({ arm: 1, by: 'default' });
    expect(b.dispatch.answered.slice(-1)[0].won).toBeUndefined();
  });
});

describe('M4: conditions', () => {
  test('each new StatKey reads its value, FALSE on the wrong kind of sector; { ending }', () => {
    let s = openWith(C4, ['iron', 'fish'], ['steam.pumping', 'steam.mills', 'iron.rails', 'fish.market']);
    s = run4(patch(s, 'fish', { reserve: 0.5 * K }), 2);
    const v = (stat: StatKey, sector?: string) => statValue(s, C4, { stat, sector });
    expect(v('openFor', 'fish')).toBe(s.sectors.fish.openFor);
    expect(v('stockFraction', 'fish')).toBeCloseTo(s.sectors.fish.reserve / K, 12);
    expect(v('reportedStock', 'fish')).toBeCloseTo(Math.pow(s.sectors.fish.reserve / K, 0.4), 12);
    expect(v('foreignShare', 'fish')).toBeCloseTo(model.derive(s, C4).sectors.fish!.stock!.foreign!.share, 12);
    expect(v('scarYears', 'fish')).toBe(0);
    expect(v('surveyed', 'fish')).toBe(0);
    expect(v('surveyed', 'steam')).toBe(0);
    expect(v('arrears', 'steam')).toBe(0);
    expect(v('feedFactor', 'steam')).toBeLessThan(1);
    expect(v('feedFactor', 'fish')).toBe(1); // girders not founded: no feed into Fish
    expect(v('capstoned')).toBe(0);
    for (const k of ['stockFraction', 'reportedStock', 'foreignShare', 'scarYears'] as StatKey[]) {
      expect(evalCond(s, C4, { stat: k, sector: 'steam', op: '>=', value: -1 })).toBe(false);
    }
    expect(evalCond(s, C4, { stat: 'budgetHeadroom', sector: 'steam', op: '>=', value: -1e9 })).toBe(false); // no line
    const lined = model.drawBudget(s, C4, 'steam');
    expect(statValue(lined, C4, { stat: 'budgetHeadroom', sector: 'steam' })).toBeCloseTo(0, 9);
    expect(evalCond(s, C4, { stat: 'openFor', sector: 'light', op: '>=', value: 0 })).toBe(false); // closed
    expect(evalCond(s, C4, { ending: 'actOne' })).toBe(false);
    const done = { ...s, meta: { ...s.meta, endings: { actOne: { run: 1, runSeconds: 1, totalSeconds: 1, year: 1900 } } } };
    expect(evalCond(done, CA, { ending: 'actOne' })).toBe(true);
    const lv = { ...s, levers: { ...s.levers, 'fish.board': { level: 1, ref: 0 } } };
    expect(statValue(lv, C4, { stat: 'surveyed', sector: 'fish' })).toBe(1);
  });
});

describe('M4: save version 5', () => {
  /** A v4 save as the M3 core wrote it (fixtureM3 economy: no Iron or Fish, no M4 fields). */
  function v4(won: boolean): string {
    let s = openWith(fixtureM3, ['light'], ['steam.pumping', 'steam.mills']);
    s = run4(s, 5, fixtureM3);
    s = { ...s, flags: { ...s.flags, won }, steadyYearsAll: won ? 60 : 3, meta: { ...s.meta, endings: won ? { steadyAll: { run: 1, runSeconds: 5, totalSeconds: 5, year: 1790 } } : {}, sectorsOpened: { ...s.meta.sectorsOpened, motion: true } } };
    const raw = JSON.parse(model.serialize(s));
    raw.version = 4;
    delete raw.meta.world;
    return JSON.stringify(raw);
  }
  test('a v4 save before the M3 ending: Iron and Fish closed, world empty, nothing replayed', () => {
    const text = v4(false);
    const b = model.deserialize(text, CA)!;
    expect(b.version).toBe(6);
    expect(b.sectors.iron.open).toBe(false);
    expect(b.sectors.fish.open).toBe(false);
    expect(b.meta.world).toEqual({ capstone: {}, scars: {} });
    expect(b.steadyYearsAll).toBe(3);
    expect(b.meta.eventSeq).toBe(JSON.parse(text).meta.eventSeq);
    expect(b.events.length).toBe(JSON.parse(text).events.length);
    expect(evalCond(b, CA, { owns: 'motion' })).toBe(true); // a Preview opened before stays openable
  });
  test('a v4 save after the M3 ending, won mid-run: steadyAll kept, flags.won kept, steadyYearsAll 0', () => {
    const b = model.deserialize(v4(true), CA)!;
    expect(b.meta.endings.steadyAll).toEqual({ run: 1, runSeconds: 5, totalSeconds: 5, year: 1790 });
    expect(b.meta.endings.actOne).toBeUndefined();
    expect(b.flags.won).toBe(true);
    expect(b.steadyYearsAll).toBe(0);
    expect(model.derive(b, CA).ending.reached).toBe(false); // Act I's ending is not the M3 one
  });
  test('v1–v3 chain to v6; v7 → null; a v5 → v6 round trip with every M4 structure is lossless; invalid entries dropped', () => {
    const v1 = { time: 5, eras: { steam: { open: true, eta: 1, reserve: 1000, reserveMax: 1000, pressure: 0, apps: {} } }, meta: { furthestEra: 1 } };
    expect(model.deserialize(JSON.stringify(v1), CA)!.version).toBe(6);
    const v3 = JSON.parse(v4(false)); v3.version = 3;
    expect(model.deserialize(JSON.stringify(v3), CA)!.version).toBe(6);
    expect(model.deserialize(JSON.stringify({ ...JSON.parse(v4(false)), version: 7 }), CA)).toBeNull();
    // a v5 state with capstones, scars, survey, reveal, wagers, a full line
    let s = openWith(CA, ['iron', 'fish'], ['steam.pumping', 'iron.rails', 'fish.market']);
    s = run4(s, 6, CA);
    s = forceSettle(s, CA, 'iron');
    s = { ...s, meta: { ...s.meta, features: { estimates: 0 }, world: { capstone: { iron: { act: 'actOne', year: 1850, settled: s.sectors.iron.settled! } }, scars: { fish: { yearsLeft: 3, since: 1 } } } } };
    s = patch(s, 'fish', { crisesFired: 2 });
    s = model.tick(s, CA, 1);
    s = model.drawBudget(s, CA, 'steam');
    s = model.answerDispatch({ ...pend(s, 'd.shoals'), capital: 1e6 }, CA, 1, 'd.shoals');
    s = { ...s, dispatch: { ...s.dispatch, answered: s.dispatch.answered } };
    expect(s.sectors.steam.budget!.account).toBe('full');
    expect(s.surveyReveal).toBeTruthy();
    expect(s.sectors.fish.lastSurvey).toBeTruthy();
    const text = model.serialize(s);
    const back = model.deserialize(text, CA)!;
    expect(JSON.parse(model.serialize(back))).toEqual(JSON.parse(text));
    // invalid M4 entries are dropped
    const raw = JSON.parse(text);
    raw.meta.world.capstone.ghost = { act: 'actOne', year: 1, settled: raw.meta.world.capstone.iron.settled };
    raw.meta.world.capstone.steam = { act: 'nope', year: 1, settled: raw.meta.world.capstone.iron.settled };
    raw.meta.world.scars.steam = { yearsLeft: 4, since: 0 };
    raw.meta.world.scars.fish.yearsLeft = -1;
    raw.modifiers.push({ source: 'survey:steam', arm: 0, since: 0, until: 1e9 }, { source: 'd.shoals', arm: 1, since: 0, until: 1e9, branch: 'lose' });
    raw.sectors.fish.minStock = 'x';
    const b2 = model.deserialize(JSON.stringify(raw), CA)!;
    expect(Object.keys(b2.meta.world!.capstone!)).toEqual(['iron']);
    expect(b2.meta.world!.scars).toEqual({});
    expect(b2.modifiers.some((m) => m.source === 'survey:steam')).toBe(false);
    expect(b2.modifiers.some((m) => m.source === 'd.shoals' && m.branch === 'lose')).toBe(false);
    expect(b2.sectors.fish.minStock).toBeUndefined();
  });
});
