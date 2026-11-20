// M3 test 17 of briefs/m3-core.md: save version 4. A hand-written v3 save (mid-run, a won flag, past runs, levers, a
// settled sector) loads with every step 1–7; v1 and v2 chain; a v5 save → null; a v4 round trip is lossless.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, GameState } from '../types';
import { model } from './index';
import { fixtureM3 as M0, fixtureM3Gated } from './fixture';
import { foundAll } from './m1.testkit';
import { dispatchFirstAt, dispatchGap } from './dispatchClock';

const M: Content = { ...M0, sectors: { ...M0.sectors, steam: { ...M0.sectors.steam, pressureIntensity: 0, reserve: 1e9 } } };

/** A v3 save as the M2 build wrote it: today's state with every M3 field taken out. */
function toV3(s: GameState): Record<string, unknown> {
  const r = JSON.parse(model.serialize(s));
  r.version = 3;
  for (const k of ['dispatch', 'modifiers', 'ambientLast', 'orderLog', 'historyLifted']) delete r[k];
  for (const es of Object.values(r.sectors) as Record<string, unknown>[]) {
    delete es.seamsSunk;
    if (es.settled) { const st = es.settled as Record<string, unknown>; delete st.load; delete st.travel; delete st.appPriceSeen; }
  }
  for (const ls of Object.values(r.levers) as Record<string, unknown>[]) { delete ls.bite; delete ls.bitten; }
  delete r.run.dispatchesAnswered; delete r.run.dispatchesDefaulted;
  for (const k of ['dispatches', 'history', 'histories', 'unlocks', 'returns', 'archive', 'flags', 'endings', 'milestones', 'bankedSeconds']) delete r.meta[k];
  delete r.meta.orders.dispatch;
  return r;
}

describe('M3 save version 4', () => {
  test('a v3 save (mid-run, won, past runs, levers, a settled sector) loads with steps 1–7, nothing replayed', () => {
    let s = { ...foundAll(model.createState(M), M, 'steam'), capital: 1e6, mandate: 1e3 };
    s = model.buyUpgrade(model.buyUpgrade(s, M, 'steam.boilers'), M, 'steam.condenser');
    s = { ...s, time: 400, flags: { revealed: true, won: true }, levers: { ...s.levers, 'steam.duty': { level: 1, ref: 0.5 } } };
    s = { ...s, meta: { ...s.meta, reckonings: 3, totalSeconds: 9000, sectorsOpened: { steam: true, light: true }, steadySectors: { steam: true }, backfiredSectors: { steam: true },
      runs: [{ cause: 'chosen', seconds: 100, yearReached: 1800, hindsightGained: 5, peakWellbeing: 10, sectors: {} }] } };
    s = { ...s, sectors: { ...s.sectors, steam: { ...s.sectors.steam, settled: { since: 300, sinceYear: 1800, D: 1, R: 1, ps: 1, pPre: 1, income: 1, P: 0, eta: 1, defect: 1, N0: 1, spillMul0: 1, extraD0: 0, appD: {}, appAdoption: {} } } } };
    const v3 = toV3(s);
    const b = model.deserialize(JSON.stringify(v3), M)!;
    expect(b).not.toBeNull();
    expect(b.version).toBe(5);
    // 1
    expect(b.modifiers).toEqual([]);
    expect(b.ambientLast).toEqual({});
    expect(b.orderLog).toEqual({});
    expect(b.historyLifted).toBe(false);
    expect(b.dispatch).toMatchObject({ pending: [], queue: [], answered: [], offered: [], draws: 0, standing: [] });
    // 7: not at once
    expect(b.dispatch.nextAt).toBeCloseTo(Math.max(dispatchFirstAt(M), 400 + dispatchGap(b.seed, 0, M)), 9);
    expect(b.dispatch.nextAt).toBeGreaterThan(400);
    // 2, 3
    for (const id of M.sectorOrder) expect(b.sectors[id].seamsSunk).toBe(0);
    expect(b.sectors.steam.settled!.load).toBeUndefined();
    expect(b.run.dispatchesAnswered).toBe(0);
    expect(b.run.dispatchesDefaulted).toBe(0);
    expect(b.levers['steam.duty']).toEqual({ level: 1, ref: 0.5 });
    // 4
    expect(b.meta.milestones).toMatchObject({
      'sectorOpened:steam': { run: 0, at: 0, year: 0 }, 'sectorOpened:light': { run: 0, at: 0, year: 0 },
      'steady:steam': { run: 0, at: 0, year: 0 }, 'backfire:steam': { run: 0, at: 0, year: 0 },
    });
    expect(b.meta.dispatches).toEqual({ seen: {}, arms: {}, playerArms: {} });
    expect(b.meta).toMatchObject({ history: null, histories: {}, unlocks: {}, returns: {}, flags: {}, bankedSeconds: 0 });
    expect(b.meta.orders.dispatch).toEqual({ on: false, cast: {} });
    // 5
    expect(b.meta.runs[0].history).toBeUndefined();
    // 6: the won flag gets the ending and the milestone, no event
    expect(b.meta.endings.steadyAll).toMatchObject({ run: 4, runSeconds: 400, totalSeconds: 9000 });
    expect(b.meta.milestones.won).toEqual({ run: 4, at: 9000, year: b.meta.endings.steadyAll.year });
    // 7: archive notes for owned things (the condenser, Light opened), at totalSeconds; nothing replayed
    expect(b.meta.archive).toEqual({ 'n.condenser': 9000, 'n.light': 9000 });
    expect(b.events.map((e) => e.seq)).toEqual(s.events.map((e) => e.seq));
    expect(b.meta.eventSeq).toBe(s.meta.eventSeq);
    // the M3 features are not grandfathered: they arrive by the schedule
    const g = model.deserialize(JSON.stringify({ ...v3, meta: { ...(v3.meta as object), features: { reboundMeter: 1 } } }), fixtureM3Gated)!;
    expect(Object.keys(g.meta.features!)).toEqual(['reboundMeter']);
    const pre = model.deserialize(JSON.stringify({ ...v3, meta: { ...(v3.meta as Record<string, unknown>), features: undefined } }), fixtureM3Gated)!;
    expect(Object.keys(pre.meta.features!).some((k) => ['archive', 'dispatches', 'seams', 'histories'].includes(k))).toBe(false);
  });
  test('v1 and v2 chain to v5; v6 → null', () => {
    const v1 = { time: 5, eras: { steam: { open: true, eta: 1, reserve: 1000, reserveMax: 1000, pressure: 0, apps: {} } }, meta: { furthestEra: 1 } };
    const a = model.deserialize(JSON.stringify(v1), M)!;
    expect(a.version).toBe(5);
    expect(a.dispatch.nextAt).toBeGreaterThan(5);
    expect(a.meta.milestones['sectorOpened:steam']).toBeDefined();
    const s = model.createState(M);
    const v2 = { ...toV3(s), version: 2 };
    expect(model.deserialize(JSON.stringify(v2), M)!.version).toBe(5);
    expect(model.deserialize(JSON.stringify({ ...JSON.parse(model.serialize(s)), version: 6 }), M)).toBeNull();
  });
  test('a v4 round trip with every M3 structure is lossless; unknown ids are dropped', () => {
    let s = { ...foundAll(model.createState(M), M, 'steam'), capital: 1e6, mandate: 1e3, time: 10 };
    s = { ...s, dispatch: { ...s.dispatch, pending: [{ id: 'd.mod', arrivedAt: 0, expiresAt: 999 }, { id: 'd.gone', arrivedAt: 0, expiresAt: 9 }], offered: ['d.mod'], queue: ['d.chained', 'd.gone'] } };
    s = model.answerDispatch(s, M, 0, 'd.mod');
    s = model.fileReturn(s, M, { id: 'household', figures: { activeMinutesBefore: 1, activeMinutesAfter: 1, sessionsBefore: 1, sessionsAfter: 1, looksBefore: 1, looksAfter: 1, decisionsBefore: 1, decisionsAfter: 1, automatedAfter: 1, daysBefore: 1, daysAfter: 1, quietDays: 0 } });
    s = model.sinkSeam(s, M, 'steam');
    s = { ...s, levers: { ...s.levers, 'motion.standard': { level: 1, ref: 0, bite: 0.4, bitten: true } }, ambientLast: { 'a.coal': 5 }, orderLog: { steam: { t: 5, outcome: 'cash' } } };
    s = { ...s, meta: { ...s.meta, history: 'h.rich', histories: { 'h.rich': { runs: 1, cleared: true, best: 20 }, 'h.gone': { runs: 1, cleared: false, best: null } }, unlocks: { 'commons.lido': true, 'cosmetic:gilt': true, 'gone.id': true }, flags: { proprietor: true }, endings: { steadyAll: { run: 1, runSeconds: 2, totalSeconds: 3, year: 1900 } }, bankedSeconds: 12 } };
    const text = model.serialize(s);
    const b = model.deserialize(text, M)!;
    const want = JSON.parse(text);
    want.dispatch.pending = want.dispatch.pending.filter((p: { id: string }) => p.id !== 'd.gone');
    want.dispatch.queue = ['d.chained'];
    delete want.meta.histories['h.gone'];
    delete want.meta.unlocks['gone.id'];
    expect(JSON.parse(model.serialize(b))).toEqual(want);
    const again = model.deserialize(model.serialize(b), M)!;
    expect(JSON.parse(model.serialize(again))).toEqual(want);
    // an invalid return is dropped; an unknown History → null
    const bad = JSON.parse(text);
    bad.meta.returns.household.figures.looksAfter = -5;
    bad.meta.history = 'h.gone';
    const c = model.deserialize(JSON.stringify(bad), M)!;
    expect(c.meta.returns.household).toBeUndefined();
    expect(c.meta.history).toBeNull();
  });
});
