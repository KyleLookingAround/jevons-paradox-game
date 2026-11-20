// M5 Core A: inspection and concealment (ChairState, the inspection rules): Inspectors and their rest, the ramp, the
// quiet period (exit criterion 6: exact), inspect() and its fine, the reported figure, the cap enforced on it, levy
// scaling, certified decades, Standing inspection, and E3 (exit criterion 14 on the fixture).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { YEARS_PER_SECOND } from '../types';
import type { Content, GameState } from '../types';
import { fixtureM5, fixtureM4Acts, M5_CHAIR, M5_RIVAL } from './fixture';
import { forceSettle, openWith, run4 } from './m4.testkit';
import { model } from './index';
import { freshChairForTest } from './m5.testkit';
import { adv, ministry } from './m5.testkit';
import { canInspect, capTargetScale, certifyDecade, concealTick, inspect, inspectorsView, levyScale, quietYearsOf, reportedR, sectorInspectFields } from './chair/inspect';
import { drawBudget, setLever } from './policy';
import { computeFlows } from './flows';
import { sectorLevers } from './levers';
import { mandateShareOf } from './levers';

const C = fixtureM5;
const capped = (): GameState => setLever(adv(ministry(C), C, 60), C, 'motor.cap', 1);
const withC2 = (s: GameState, k: string, c: number): GameState => ({ ...s, chair: { ...s.chair!, rival: { ...s.chair!.rival, concealment: { [k]: c } } } });
const withC = (s: GameState, c: number): GameState => ({ ...s, chair: { ...s.chair!, rival: { ...s.chair!.rival, concealment: { motor: c } } } });

describe('M5 inspection: Inspectors', () => {
  test('inspect sends the soonest-ready Inspector, who rests cooldownYears; refused with none ready', () => {
    let s = capped();
    expect(inspectorsView(s, C)).toEqual({ ready: 2, total: 2, nextReadyIn: null, readyIn: [0, 0] });
    s = inspect(s, C, 'motor');
    s = inspect(s, C, 'motor');
    const v = inspectorsView(s, C);
    expect(v.ready).toBe(0);
    expect(v.readyIn).toEqual([100, 100]);
    expect(canInspect(s, C, 'motor')).toBe(false);
    expect(inspect(s, C, 'motor')).toBe(s);
    expect(s.chair!.inspections).toBe(2);
  });
  test('refused outside a Ministry, on an unknown sector, and while the feature is off', () => {
    const s = capped();
    expect(inspect({ ...s, chair: null }, C, 'motor').chair).toBeNull();
    expect(inspect(s, C, 'nowhere')).toBe(s);
    const off: Content = { ...C, features: { inspection: { when: { flag: 'never' } } } };
    expect(inspect(s, off, 'motor')).toBe(s);
  });
});

describe('M5 inspection: concealment', () => {
  test('the ramp: nothing inside the quiet period; then concealPerYear a year up to concealMax; only with a levy or cap', () => {
    const s = capped();
    const q = quietYearsOf(s, C);
    expect(q).toBe(7);
    const inQuiet = { ...s, time: (q - 1) / YEARS_PER_SECOND };
    expect(concealTick(inQuiet, C, 1).chair!.rival.concealment.motor ?? 0).toBe(0);
    const after = { ...s, time: q / YEARS_PER_SECOND };
    expect(concealTick(after, C, 1).chair!.rival.concealment.motor).toBeCloseTo(0.02, 12);
    expect(concealTick(withC(after, 0.195), C, 1).chair!.rival.concealment.motor).toBeCloseTo(0.2, 12);
    const noLevy = setLever(after, C, 'motor.cap', 0);
    expect(concealTick(noLevy, C, 1)).toBe(noLevy);
  });
  test('no ramp when fineMul × coverage ≥ 1; a certify effect holds it at 0', () => {
    const s = { ...capped(), time: 200 };
    const strict: Content = { ...C, chair: { ...C.chair!, inspection: { ...C.chair!.inspection, fineMul: 1 } } };
    expect(concealTick(s, strict, 1)).toBe(s);
    const cert: Content = { ...C, upgrades: [...C.upgrades!, { id: 'motor.board', sector: 'motor', name: 'b', blurb: '', kind: 'research', cost: 1, effects: [{ type: 'certify', sector: 'motor' }] }] };
    const sc = withC({ ...s, upgrades: { ...s.upgrades, 'motor.board': 1 } }, 0.1);
    expect(concealTick(sc, cert, 1).chair!.rival.concealment.motor).toBe(0);
  });
  test('exit criterion 6 (exact): concealment is never above 0 inside the quiet period after an inspection', () => {
    let s = capped();
    const q = quietYearsOf(s, C);
    let checked = 0;
    for (let i = 0; i < 1600; i++) {
      // inspect irregularly: sometimes late (finds concealment), sometimes early
      if (i % 270 === 0 || i % 410 === 0) s = inspect(s, C, 'motor');
      s = adv(s, C, 1);
      const t = s.chair!.inspected.motor;
      if (t !== undefined && (s.time - t) * YEARS_PER_SECOND < q - 1e-9) { expect(s.chair!.rival.concealment.motor ?? 0).toBe(0); checked++; }
    }
    expect(checked).toBeGreaterThan(500);
    expect(s.chair!.findings ?? 0).toBeGreaterThan(0);
  });
  test('what it does: the reported figure, levy revenue scaled, the cap enforced on the reported figure', () => {
    const s = withC(capped(), 0.2);
    const R = computeFlows(s, C).sectors.motor!.R;
    expect(reportedR(s, C, 'motor', R)).toBeCloseTo(R * 0.8, 9);
    expect(levyScale(s, C, 'motor')).toBeCloseTo(0.8, 12);
    expect(sectorLevers(s, C).motor.capFrac).toBeCloseTo(1 / 0.8, 12);
    expect(capTargetScale(s, C, 'motor')).toBeCloseTo(1 / 0.8, 12);
    const f = sectorInspectFields(s, C, 'motor', R);
    expect(f.reportedR).toBeCloseTo(R * 0.8, 9);
    expect(f.rival).toBe(true);
    expect(f.inspectedAt).toBeNull();
  });
  test('inspect finds it: the fine, Confidence, found, the reset, events and headline', () => {
    const s0 = withC({ ...setLever(capped(), C, 'motor.duty', 1), time: 400 }, 0.1);
    const fl = computeFlows(s0, C).sectors.motor!;
    const L = (fl.dutyPart + fl.permitPart + (fl.chargePart ?? 0)) * fl.D * mandateShareOf(C);
    const s = inspect(s0, C, 'motor');
    expect(s.mandate - s0.mandate).toBeCloseTo(0.5 * 0.1 * L * 7 / YEARS_PER_SECOND, 6);
    expect(s.chair!.confidence).toBe(57);
    expect(s.chair!.found.motor).toEqual({ share: 0.1, t: 400 });
    expect(s.chair!.rival.concealment.motor).toBe(0);
    expect(s.chair!.findings).toBe(1);
    expect(s.events.slice(-2).map((e) => [e.kind, e.n])).toEqual([['inspected', 10], ['concealmentFound', 10]]);
    expect(s.news[0].key).toBe('concealmentFound');
    const clean = inspect(withC(s0, 0), C, 'motor');
    expect(clean.events[clean.events.length - 1].n).toBe(0);
    expect(clean.news[0].key).toBe('inspectedClean');
    expect(sectorInspectFields(s, C, 'motor', 1).inspectedUntil).toBe(400 + 10 / YEARS_PER_SECOND);
  });
  test('certified decades: an inspection inside the decade\'s window', () => {
    const s = inspect({ ...capped(), time: 300 }, C, 'motor');
    expect(certifyDecade(s, C, 'motor', 400)).toBe(true);
    expect(certifyDecade(s, C, 'motor', 300 + 10 / YEARS_PER_SECOND + 1)).toBe(false);
    expect(certifyDecade({ ...s, chair: null }, C, 'motor', 400)).toBe(false);
  });
  test('Standing inspection: at each model-decade boundary, by the inspectorate (automated, not a decision)', () => {
    const SC: Content = { ...C, knowhow: [{ id: 'kh.si', name: 'Standing inspection', blurb: '', cost: 1, costGrowth: 1, maxLevel: 1, effects: [{ type: 'orderUnlock', order: 'inspection' }] }] };
    let s = ministry(SC, { knowhow: { 'kh.si': 1 } });
    s = { ...s, meta: { ...s.meta, orders: { ...s.meta.orders, inspection: { on: true, sector: 'motor' } } } };
    s = adv(s, SC, 410);
    const ins = s.events.filter((e) => e.kind === 'inspected');
    expect(ins.map((e) => [e.time, e.by])).toEqual([[200, 'inspectorate'], [400, 'inspectorate']]);
    expect(s.run.automated).toBe(2);
  });
});

describe('M5 inspection: the capstone under the rival', () => {
  test('concealment on a capstoned sector steps the excess into its pressure (held below collapse); none without it', () => {
    const CA: Content = { ...fixtureM4Acts, chair: M5_CHAIR, rival: M5_RIVAL };
    let w = openWith(CA, ['iron', 'fish', 'light'], ['steam.pumping', 'steam.mills', 'iron.rails', 'iron.pots', 'fish.market']);
    w = run4(w, 2, CA);
    for (const id of ['steam', 'iron', 'fish']) w = forceSettle(w, CA, id);
    for (let i = 0; i < 41 && !w.flags.won; i++) w = model.tick(w, CA, 1);
    let s = model.reckon(w, CA);
    expect(s.sectors.steam.capstoned).toBe(true);
    s = { ...s, time: 1, chair: s.chair ?? freshChairForTest(CA) };
    const P0 = s.sectors.steam.settled!.P;
    const clean = adv(s, CA, 60);
    expect(clean.sectors.steam.pressure).toBeCloseTo(P0, 9);
    const hid = adv(withC2(s, 'steam', 0.2), CA, 60);
    expect(hid.sectors.steam.pressure).toBeGreaterThan(P0);
    expect(hid.sectors.steam.pressure).toBeLessThan(CA.sectors.steam.collapseAt);
    expect(hid.sectors.steam.arrears ?? false).toBe(false);
  });
});

describe('M5 inspection: E3 (exit criterion 14 on the fixture)', () => {
  test('a capped steward that never inspects loses its true decades; inspecting on cooldown keeps them', () => {
    const runFor = (insp: boolean) => {
      let s = drawBudget(adv(ministry(C), C, 60), C, 'motor');
      s = setLever(s, C, 'motor.cap', 1);
      let gap = 0;
      const end = s.time + 60 / YEARS_PER_SECOND;
      while (s.time < end) {
        if (insp && canInspect(s, C, 'motor')) s = inspect(s, C, 'motor');
        s = adv(s, C, 1);
        gap = Math.max(gap, s.chair!.rival.concealment.motor ?? 0);
      }
      return { decades: s.sectors.motor.decadesWithin.length, gap };
    };
    const never = runFor(false), steward = runFor(true);
    expect(steward.decades).toBeGreaterThanOrEqual(4);
    expect(never.decades).toBeLessThanOrEqual(0.7 * steward.decades);
    expect(never.gap).toBeGreaterThanOrEqual(0.1);
    expect(steward.gap).toBe(0);
  });
});
