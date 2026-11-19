// M3 mechanism tests 8–10 of briefs/m3-core.md: dispatches (the scheduler, answers, defaults, the standing order),
// timed modifiers, ambient news. Against fixtureM3.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { MODIFIERS_MAX, YEARS_PER_SECOND } from '../types';
import type { Content, GameState, UpgradeDef } from '../types';
import { model } from './index';
import { fixtureM3 as M0, fixtureM3Gated } from './fixture';
import { foundAll, run } from './m1.testkit';
import { dispatchFirstAt, dispatchGap } from './dispatchClock';
import { addModifier } from './modifiers';
import { fmtValue } from './ambient';
import { simulate } from './projections';
import { mix32 } from './util';

/** fixtureM3 without pressure in Steam and with a deep reserve: long calm runs. */
const M: Content = { ...M0, sectors: { ...M0.sectors, steam: { ...M0.sectors.steam, pressureIntensity: 0, reserve: 1e9 } } };
const ev = (s: GameState, kind: string) => s.events.filter((e) => e.kind === kind);
const at = (t: number, c: Content = M, seed = 7): GameState => {
  const s = foundAll(model.createState(c, undefined, seed), c, 'steam');
  return { ...s, time: t, capital: 1e6, mandate: 1e3 };
};
const ELIGIBLE0 = ['d.coal', 'd.three', 'd.once', 'd.chain', 'd.mod'];
const pickOf = (seed: number, draws: number, ids: string[]) => {
  const u = mix32((seed ^ Math.imul(draws + 1, 0x9E3779B1)) >>> 0) / 4294967296;
  return ids[Math.min(ids.length - 1, Math.floor(u * ids.length))];
};

describe('M3 dispatches: the scheduler', () => {
  test('the first draw at firstYears; the pick by weight from the seed; draws, offered, seen, news, event', () => {
    expect(dispatchFirstAt(M)).toBe(30 / YEARS_PER_SECOND);
    let s = at(598.5);
    s = model.tick(s, M, 1);
    expect(s.dispatch.pending.length).toBe(0);
    s = model.tick(s, M, 1);
    expect(s.dispatch.pending.length).toBe(1);
    const p = s.dispatch.pending[0];
    expect(p.id).toBe(pickOf(7, 0, ELIGIBLE0));
    expect(p.arrivedAt).toBe(600.5);
    expect(p.expiresAt).toBeCloseTo(600.5 + (M.dispatches!.find((d) => d.id === p.id)!.expiryYears ?? 12) / YEARS_PER_SECOND, 9);
    expect(s.dispatch.draws).toBe(1);
    expect(s.dispatch.offered).toEqual([p.id]);
    expect(s.meta.dispatches.seen[p.id]).toBe(1);
    expect(ev(s, 'dispatchArrived').at(-1)).toMatchObject({ id: p.id, label: M.dispatches!.find((d) => d.id === p.id)!.cast, time: 600.5 });
    expect(s.news[0].key).toBe('dispatch');
    expect(s.dispatch.nextAt).toBe(600); // a draw does not advance nextAt
    const d = model.derive(s, M).dispatch;
    expect(d.pending[0].id).toBe(p.id);
    expect(d.nextIn).toBeNull(); // full
  });
  test('the gap with jitter, pinned for three seeds; a resolution sets nextAt = max(nextAt, t + gap(draws))', () => {
    for (const seed of [1, 2, 3]) {
      for (const k of [0, 1, 5]) {
        const u = mix32((seed ^ Math.imul(k + 1, 0x85EBCA6B)) >>> 0) / 4294967296;
        expect(dispatchGap(seed, k, M)).toBeCloseTo((8 / YEARS_PER_SECOND) * (1 - 0.25 + 0.5 * u), 9);
      }
    }
    expect([1, 2, 3].map((x) => Math.round(dispatchGap(x, 0, M) * 1000) / 1000)).toEqual([1, 2, 3].map((x) => Math.round(dispatchGap(x, 0, M) * 1000) / 1000));
    let s = model.tick(at(599.5), M, 1);
    s = model.answerDispatch(s, M, 1);
    expect(s.dispatch.nextAt).toBeCloseTo(600.5 + dispatchGap(7, 1, M), 9);
  });
  test('least seen first across runs (no repeats until the pool is exhausted); `once`; no repeat within a run', () => {
    let s = at(599.5);
    const seen: Record<string, number> = { 'd.coal': 2, 'd.three': 1, 'd.chain': 2, 'd.mod': 2, 'd.once': 1 };
    s = { ...s, meta: { ...s.meta, dispatches: { seen, arms: {}, playerArms: {} } } };
    s = model.tick(s, M, 1);
    expect(s.dispatch.pending[0].id).toBe('d.three'); // d.once is seen: `once` leaves it out
    s = model.answerDispatch(s, M, 0);
    s = { ...s, dispatch: { ...s.dispatch, nextAt: s.time } };
    s = model.tick(s, M, 1);
    expect(s.dispatch.pending[0].id).not.toBe('d.three'); // offered this run already
    expect(['d.coal', 'd.chain', 'd.mod']).toContain(s.dispatch.pending[0].id);
  });
  test('a queued follow-up comes first; sector, age and cast `when` pools', () => {
    let s = at(10);
    s = { ...s, dispatch: { ...s.dispatch, nextAt: 10, pending: [{ id: 'd.chain', arrivedAt: 0, expiresAt: 999 }], offered: ['d.chain'] } };
    s = model.answerDispatch(s, M, 0);
    expect(s.dispatch.queue).toEqual(['d.chained']);
    s = { ...s, dispatch: { ...s.dispatch, nextAt: s.time } };
    s = model.tick(s, M, 1);
    expect(s.dispatch.pending[0].id).toBe('d.chained');
    expect(s.dispatch.queue).toEqual([]);
    // pools: d.light needs Light open and Mrs Fenwick (reckonings ≥ 2); d.age needs the Great Acceleration
    const ids = (x: GameState) => (M.dispatches ?? []).filter((d) => {
      const t = { ...x, dispatch: { ...x.dispatch, nextAt: x.time, offered: (M.dispatches ?? []).map((y) => y.id).filter((y) => y !== d.id) } };
      return model.tick(t, M, 1).dispatch.pending.some((p) => p.id === d.id);
    }).map((d) => d.id);
    const base = at(10);
    expect(ids(base)).not.toContain('d.light');
    const lightOpen = { ...base, sectors: { ...base.sectors, light: { ...base.sectors.light, open: true, reserve: 1e6, reserveMax: 1e6 } } };
    expect(ids(lightOpen)).not.toContain('d.light'); // Mrs Fenwick waits for the second Reckoning
    expect(ids({ ...lightOpen, meta: { ...lightOpen.meta, reckonings: 2 } })).toContain('d.light');
    expect(ids(base)).not.toContain('d.age');
    const motionOpen = { ...base, sectors: { ...base.sectors, motion: { ...base.sectors.motion, open: true, reserve: 1e6, reserveMax: 1e6 } } };
    expect(ids(motionOpen)).toContain('d.age');
  });
  test('expiry to the default arm by default, paying what there is; maxPending; nothing drawn while the feature is off', () => {
    const c: Content = { ...M, dispatches: M.dispatches!.map((d) => (d.id === 'd.mod' ? { ...d, defaultArm: 1 } : d)) };
    let s = { ...at(100, c), mandate: 20, capital: 5 };
    s = { ...s, dispatch: { ...s.dispatch, nextAt: 1e9, pending: [{ id: 'd.mod', arrivedAt: 0, expiresAt: 100.5 }], offered: ['d.mod'] } };
    s = model.tick(s, c, 1);
    expect(s.dispatch.pending).toEqual([]);
    expect(s.dispatch.answered.at(-1)).toMatchObject({ id: 'd.mod', arm: 1, by: 'default' });
    expect(s.mandate).toBeLessThan(1); // 20 − 50 floors at 0 (plus a second of Mandate)
    expect(s.run.dispatchesDefaulted).toBe(1);
    expect(s.run.decisions).toBe(0);
    expect(s.meta.dispatches.arms['d.mod']).toEqual([0, 1]);
    expect(s.meta.dispatches.playerArms['d.mod']).toBeUndefined();
    expect(ev(s, 'dispatchAnswered').at(-1)).toMatchObject({ by: 'default', n: 1 });
    // maxPending (1): a full list skips the draw
    let f = at(599.5);
    f = { ...f, dispatch: { ...f.dispatch, pending: [{ id: 'd.coal', arrivedAt: 0, expiresAt: 1e9 }], offered: ['d.coal'] } };
    expect(model.tick(f, M, 1).dispatch.draws).toBe(0);
    // the feature listed and not yet on: no draw, answer refused, the view empty
    const g = at(599.5, fixtureM3Gated);
    const g1 = model.tick(g, fixtureM3Gated, 1);
    expect(g1.dispatch.draws).toBe(0);
    expect(model.derive(g1, fixtureM3Gated).dispatch).toEqual({ pending: [], nextIn: null });
  });
  test('no draw inside fastForward: an 8-hour catch-up defaults the pending dispatch and draws none', () => {
    let s = at(1000);
    s = { ...s, dispatch: { ...s.dispatch, nextAt: 1000, pending: [{ id: 'd.coal', arrivedAt: 990, expiresAt: 1100 }], offered: ['d.coal'] } };
    const f = model.fastForward(s, M, 8 * 3600);
    expect(f.dispatch.pending).toEqual([]);
    expect(f.dispatch.draws).toBe(0);
    expect(f.lastOffline!.dispatchesDefaulted).toBe(1);
    expect(f.lastOffline!.simulated).toBeGreaterThan(200);
    // the first live step after draws
    expect(model.tick(f, M, 1).dispatch.draws).toBe(1);
  });
  test('tick and fastForward over the same 10 minutes with no draw due resolve the same defaults', () => {
    let s = at(1000);
    s = { ...s, dispatch: { ...s.dispatch, nextAt: 1e9, pending: [{ id: 'd.three', arrivedAt: 990, expiresAt: 1100 }], offered: ['d.three'] } };
    const a = run(s, 600, M), b = model.fastForward(s, M, 600);
    const strip = (x: GameState) => x.dispatch.answered.map((e) => [e.id, e.arm, e.by]);
    expect(strip(a)).toEqual(strip(b));
    expect(a.meta.dispatches.arms).toEqual(b.meta.dispatches.arms);
  });
  test('an answer: costs, one-offs, standing effects for the run, a decision, meta arms and playerArms, reply, milestone', () => {
    let s = at(10);
    s = { ...s, dispatch: { ...s.dispatch, pending: [{ id: 'd.coal', arrivedAt: 0, expiresAt: 999 }], offered: ['d.coal'] } };
    const m0 = s.mandate;
    const sat0 = model.derive(s, M).sectors.steam!.apps['steam.mills'].demand;
    expect(model.answerDispatch(s, M, 5)).toBe(s);
    expect(model.answerDispatch(s, M, 1, 'd.nope')).toBe(s);
    s = model.answerDispatch(s, M, 1);
    expect(s.mandate).toBeCloseTo(m0 + 10, 9);
    expect(s.dispatch.standing).toEqual([['d.coal', 1]]);
    expect(s.run.decisions).toBe(1);
    expect(s.run.dispatchesAnswered).toBe(1);
    expect(s.meta.dispatches.arms['d.coal']).toEqual([0, 1]);
    expect(s.meta.dispatches.playerArms['d.coal']).toEqual([0, 1]);
    expect(s.news[0]).toMatchObject({ key: 'answered', text: 'The proprietor subsidises.' });
    expect(s.meta.milestones.dispatch).toBeDefined();
    expect(model.derive(s, M).sectors.steam!.apps['steam.mills'].demand).toBeCloseTo(sat0 * 1.1, 6);
    // a cost refused when unaffordable
    let t = { ...at(10), mandate: 10 };
    t = { ...t, dispatch: { ...t.dispatch, pending: [{ id: 'd.mod', arrivedAt: 0, expiresAt: 999 }], offered: ['d.mod'] } };
    expect(model.answerDispatch(t, M, 1)).toBe(t);
    expect(model.derive(t, M).dispatch.pending[0].arms[1].affordable).toBe(false);
  });
  test('the standing dispatch order answers at once by dispatch and counts automated; a Reckoning clears pending, queue and modifiers', () => {
    const c: Content = { ...M, upgrades: [...M.upgrades, { id: 'x.order', sector: 'steam', name: 'x', blurb: '', kind: 'research', cost: 1, effects: [{ type: 'orderUnlock', order: 'dispatch' }] } as UpgradeDef] };
    let s = model.buyUpgrade(at(599.5, c), c, 'x.order');
    s = model.setOrders(s, c, { dispatch: { on: true, cast: { correspondent: true, whitlow: true, nobody: true } } });
    expect(s.meta.orders.dispatch.cast).toEqual({ correspondent: true, whitlow: true });
    expect(model.derive(s, c).orders.dispatch).toMatchObject({ available: true, on: true });
    const a0 = s.run.automated;
    s = model.tick(s, c, 1);
    expect(s.dispatch.pending).toEqual([]);
    expect(s.dispatch.answered[0].by).toBe('dispatch');
    expect(s.run.automated).toBe(a0 + 1);
    expect(s.run.dispatchesDefaulted).toBe(1);
    let r = { ...s, dispatch: { ...s.dispatch, pending: [{ id: 'd.three', arrivedAt: 0, expiresAt: 1e9 }], queue: ['d.chained'] }, modifiers: [{ source: 'd.mod', arm: 0, since: 0, until: 1e9 }] };
    r = model.reckon(r, c);
    expect(r.dispatch.pending).toEqual([]);
    expect(r.dispatch.queue).toEqual([]);
    expect(r.modifiers).toEqual([]);
  });
});

describe('M3 timed modifiers', () => {
  test('applied until `until`, removed with modifierEnded; the same source refreshes; different sources stack; MODIFIERS_MAX', () => {
    let s = at(10);
    s = { ...s, dispatch: { ...s.dispatch, pending: [{ id: 'd.mod', arrivedAt: 0, expiresAt: 999 }], offered: ['d.mod'] } };
    const p0 = model.derive(s, M).sectors.steam!.resourcePriceBase;
    s = model.answerDispatch(s, M, 0);
    expect(s.modifiers).toEqual([{ source: 'd.mod', arm: 0, since: 10, until: 10 + 5 / YEARS_PER_SECOND }]);
    expect(model.derive(s, M).sectors.steam!.resourcePriceBase).toBeCloseTo(2 * p0, 6);
    expect(model.derive(s, M).modifiers[0]).toMatchObject({ label: 'Pit strike', remaining: 100 });
    s = run(s, 99, M);
    expect(s.modifiers.length).toBe(1);
    s = model.tick(s, M, 1);
    expect(s.modifiers.length).toBe(0);
    expect(ev(s, 'modifierEnded').at(-1)).toMatchObject({ id: 'd.mod', n: 0 });
    // stacking
    const m = (source: string, arm: number, until: number) => ({ source, arm, since: 0, until });
    let l = addModifier([], m('a', 0, 10));
    l = addModifier(l, m('a', 0, 5));
    expect(l).toEqual([m('a', 0, 10)]);
    l = addModifier(l, m('a', 0, 20));
    expect(l).toEqual([m('a', 0, 20)]);
    l = addModifier(l, m('b', 0, 15));
    expect(l.length).toBe(2);
    for (let i = 0; i < MODIFIERS_MAX + 3; i++) l = addModifier(l, m(`x${i}`, 0, 100 + i));
    expect(l.length).toBe(MODIFIERS_MAX);
    expect(l.some((x) => x.source === 'b')).toBe(false); // ended soonest: dropped first
  });
});

describe('M3 ambient news', () => {
  const amb = (s: GameState) => s.news.filter((n) => n.key === 'ambient');
  test('at most one per tick, least recently printed first, cooldown; numbers formatted', () => {
    let s = at(1);
    s = run(s, 80, M); // one tick (4 model years)
    expect(amb(s).length).toBe(1);
    s = run(s, 80 * 4, M);
    expect(amb(s).length).toBe(4); // the fifth tick finds all four in cooldown (30 years = 600 s)
    const ids = Object.keys(s.ambientLast);
    expect(ids.sort()).toEqual(['a.coal', 'a.pct', 'a.plain', 'a.wb']); // each once before any repeats; a.never never
    const first = Object.entries(s.ambientLast).sort((a, b) => a[1] - b[1])[0][0];
    s = run(s, 320, M); // the tick at 720 s: the first print (80 s) is out of its 600 s cooldown
    expect(amb(s).length).toBe(5);
    expect(s.news.find((n) => n.key === 'ambient')!.time).toBe(s.ambientLast[first]); // the least recently printed again
    expect(fmtValue(1234.5)).toBe('1,230');
    expect(fmtValue(12.345)).toBe('12.3');
    expect(fmtValue(0.012345)).toBe('0.0123');
    expect(fmtValue(1234567)).toBe('1,230,000');
    const pct = amb(s).find((n) => n.text.startsWith('Reserve'))!;
    expect(pct.text).toMatch(/^Reserve \d+% left$/);
    const plain = amb(s).find((n) => n.text.startsWith('Nothing'))!;
    expect(plain.text).toMatch(/^Nothing to report in \d{4}$/);
  });
  test('none away, none in projections, none while the feature is off', () => {
    const s = at(1);
    expect(amb(model.fastForward(s, M, 600)).length).toBe(0);
    expect(amb(simulate(s, M, 600, 5)).length).toBe(0);
    const g = at(1, fixtureM3Gated);
    expect(amb(run(g, 200, fixtureM3Gated)).length).toBe(0);
  });
});
