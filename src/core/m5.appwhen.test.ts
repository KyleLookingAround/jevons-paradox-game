// M5 follow-up (Core A): ApplicationDef.when — dated and gated uses: unavailable (refused to the player, the Market and
// the rival) while it fails, with its label; a founded use frozen (AppState.frozenSat) while it fails; a free use founded
// only once it holds; the loophole's exempt use still founded by evade.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, GameState } from '../types';
import { fixtureM5Quiet } from './fixture';
import { adv, ministry } from './m5.testkit';
import { model } from './index';
import { createState } from './state';
import { bestCandidate } from './candidates';
import { computeFlows } from './flows';

const app = (id: string, halfPrice: number, saturation: number, foundCost: number, when: Content['sectors'][string]['applications'][number]['when']) =>
  ({ id, name: id, blurb: '', icon: 'x', halfPrice, saturation, steepness: 1.6, visibleBelow: Infinity, foundCost, when });
const motor = fixtureM5Quiet.sectors.motor;
const W: Content = {
  ...fixtureM5Quiet,
  sectors: { motor: { ...motor, applications: [...motor.applications,
    app('motor.school', 0.9, 300, 200, { stat: 'year', op: '>=', value: 1955, label: 'From 1955' }),
    app('motor.taxis', 1.0, 200, 0, { stat: 'year', op: '>=', value: 1953 }),
    app('motor.trams', 1.5, 200, 0, { stat: 'time', op: '<', value: 100 }),
  ] } },
};
const ix = (id: string) => W.sectors.motor.applications.findIndex((a) => a.id === id);

describe('M5 follow-up: ApplicationDef.when', () => {
  test('at the start: a dated use is unavailable (label shown), a free one is not founded early; one whose when holds is', () => {
    const s = createState(W);
    const a = s.sectors.motor.apps;
    expect([a['motor.school'].available, a['motor.taxis'].available, a['motor.taxis'].founded]).toEqual([false, false, false]);
    expect([a['motor.trams'].available, a['motor.trams'].founded]).toEqual([true, true]);
    expect(a['motor.vans'].available).toBe(false); // the exempt use: { loophole, status: 'used' } fails
    const d = model.derive(s, W).sectors.motor!.apps;
    expect([d['motor.school'].frozen, d['motor.school'].waiting, d['motor.school'].canFound]).toEqual([true, 'From 1955', false]);
    expect([d['motor.trams'].frozen, d['motor.trams'].waiting]).toEqual([false, null]);
  });
  test('refused to the player and to the candidate rule (Market and rival) before its year; offered after', () => {
    const s0 = { ...createState(W), capital: 1e6, time: 1 };
    expect(model.foundApp(s0, W, 'motor.school')).toBe(s0);
    const rule = { capital: 1e9, paybackMax: 1e12, foundPaybackMax: 1e12, fork: null, share: null };
    const only: Content = { ...W, upgrades: [] };
    expect(bestCandidate(s0, only, 'motor', rule).best?.id).not.toBe('motor.school');
    let s = adv(ministry(W), W, 110);
    expect(s.sectors.motor.apps['motor.taxis'].founded).toBe(true); // free, founded once 1953 came
    expect(s.sectors.motor.apps['motor.school'].available || s.sectors.motor.apps['motor.school'].founded).toBe(true);
    s = { ...s, chair: null, capital: 1e6 };
    if (!s.sectors.motor.apps['motor.school'].founded) expect(model.foundApp(s, W, 'motor.school').sectors.motor.apps['motor.school'].founded).toBe(true);
  });
  test('a founded use whose when stops holding keeps its adoption but cannot grow (frozenSat), and thaws if it holds again', () => {
    let s = adv(ministry(W), W, 99);
    const satBefore = computeFlows(s, W).sectors.motor!.appSat[ix('motor.trams')];
    s = adv(s, W, 3);
    const fz = s.sectors.motor.apps['motor.trams'].frozenSat;
    expect(fz).toBeDefined();
    expect(fz!).toBeCloseTo(satBefore, 1);
    s = adv(s, W, 600); // population grows; the cap holds
    const f = computeFlows(s, W).sectors.motor!;
    expect(f.appSat[ix('motor.trams')]).toBeLessThanOrEqual(fz! + 1e-9);
    expect(f.appD[ix('motor.trams')]).toBeGreaterThan(0);
    expect(model.derive(s, W).sectors.motor!.apps['motor.trams'].frozen).toBe(true);
    const thaw: Content = { ...W, sectors: { motor: { ...W.sectors.motor, applications: W.sectors.motor.applications.map((a) => (a.id === 'motor.trams' ? { ...a, when: { stat: 'time' as const, op: '>=' as const, value: 0 } } : a)) } } };
    const t = adv(s, thaw, 1);
    expect(t.sectors.motor.apps['motor.trams'].frozenSat).toBeUndefined();
  });
  test('the exempt use is still founded by evade, and is then available', () => {
    let s: GameState = adv(ministry(W), W, 120);
    s = model.setLever(s, W, 'motor.mileage', 1);
    s = adv(s, W, 20);
    expect(s.chair!.loopholes['motor.mileage.lightTrucks'].status).toBe('used');
    expect(s.sectors.motor.apps['motor.vans'].founded).toBe(true);
    expect(s.sectors.motor.apps['motor.vans'].frozenSat).toBeUndefined();
  });
});
