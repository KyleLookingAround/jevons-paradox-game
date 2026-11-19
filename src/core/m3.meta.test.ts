// M3 mechanism tests 11–16 of briefs/m3-core.md: Histories, returns and the Proprietor's Day, the Archive, milestones and
// the ending, orders (marketWhy, forbidden cards, a suspended Market), events (first, label, the M3 order), banked time.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { RETURN_FIGURE_MAX } from '../types';
import type { Content, GameState, HouseholdFigures, MetaState, UpgradeDef } from '../types';
import { model } from './index';
import { fixtureM3 as M0, fixtureM3Bank, fixtureM3Gated } from './fixture';
import { decoupling, foundAll, patchSector, run, steamAt } from './m1.testkit';
import { freshMeta } from './state';

const M: Content = { ...M0, sectors: { ...M0.sectors, steam: { ...M0.sectors.steam, pressureIntensity: 0, reserve: 1e9 } } };
const ev = (s: GameState, kind: string) => s.events.filter((e) => e.kind === kind);
const metaWith = (c: Content, p: Partial<MetaState>): MetaState => ({ ...freshMeta(c), ...p });
const fresh = (c: Content, p: Partial<MetaState> = {}) => model.createState(c, metaWith(c, p), 3);

/* ---------------- 11. Histories ---------------- */

describe('M3 Histories', () => {
  test('chosen only while fresh and offered; switching back and forth counts one run; historyChosen', () => {
    let s = fresh(M);
    expect(model.chooseHistory(s, M, 'h.rich')).toBe(s); // requires a Reckoning
    expect(model.chooseHistory(s, M, null)).toBe(s); // already none
    s = model.chooseHistory(s, M, 'h.statistician');
    expect(s.meta.history).toBe('h.statistician');
    expect(ev(s, 'historyChosen').at(-1)!.id).toBe('h.statistician');
    s = model.chooseHistory(s, M, 'h.laissez');
    s = model.chooseHistory(s, M, 'h.statistician');
    expect(s.meta.histories['h.statistician'].runs).toBe(1);
    expect(s.meta.histories['h.laissez'].runs).toBe(0);
    expect(s.run.decisions).toBe(0);
    const ticked = model.tick(s, M, 1);
    expect(model.chooseHistory(ticked, M, 'h.laissez')).toBe(ticked);
    const v = model.historyViews(s, M);
    expect(v.find((x) => x.def.id === 'h.statistician')).toMatchObject({ inForce: true, canChoose: false, runs: 1 });
    expect(v.find((x) => x.def.id === 'h.rich')).toMatchObject({ offered: false, canChoose: false });
    const g = fresh(fixtureM3Gated);
    expect(model.chooseHistory(g, fixtureM3Gated, 'h.statistician')).toBe(g);
  });
  test("composes with the Charter; `suspend` removes Know-how, the seated Institutions and the Market", () => {
    const c: Content = { ...M, charters: M.charters!.map((x) => ({ ...x, requires: undefined })) };
    let s = fresh(c, { reckonings: 2, knowhow: { 'kh.engines': 2 }, institutions: { 'inst.stats': 1 }, loadout: ['inst.stats'] });
    const eta0 = s.sectors.steam.eta;
    expect(s.flags.revealed).toBe(true);
    s = { ...s, charterOffer: ['ch.mills', 'ch.loan'] };
    s = model.chooseCharter(s, c, 'ch.mills');
    s = model.chooseHistory(s, c, 'h.statistician');
    expect(s.sectors.steam.apps['steam.mills'].founded).toBe(true); // the Charter still applies
    expect(s.sectors.steam.eta).toBeCloseTo(eta0 / (1.15 * 1.15), 12); // no Know-how
    expect(s.flags.revealed).toBe(false); // the Statistics Office is not seated this run
    expect(model.derive(s, c).orders.market.available).toBe(false);
    expect(model.derive(model.tick(s, c, 1), c).orders.marketWhy.steam).toEqual({ reason: 'unavailable' });
  });
  test('forbidUntil lifts the History\'s forbids', () => {
    let s = model.chooseHistory(fresh(M), M, 'h.laissez');
    s = { ...foundAll(s, M, 'steam'), capital: 1e6, mandate: 1e3, flags: { ...s.flags, revealed: true }, upgrades: { 'steam.boilers': 1 } };
    expect(model.setLever(s, M, 'steam.duty', 1)).toBe(s);
    expect(model.buyUpgrade(s, M, 'steam.lathe')).toBe(s);
    s = model.tick(patchSector(s, 'steam', { crisesFired: 1 }), M, 1);
    expect(s.historyLifted).toBe(true);
    expect(model.derive(s, M).history.lifted).toBe(true);
    expect(model.setLever(s, M, 'steam.duty', 1).levers['steam.duty'].level).toBe(1);
    expect(model.buyUpgrade(s, M, 'steam.lathe').upgrades['steam.lathe']).toBe(1);
  });
  test('the goal clears once, best time, rewards into meta.unlocks; the locked project and Charter appear afterwards', () => {
    let s = model.chooseHistory(fresh(M, { reckonings: 2 }), M, 'h.rich');
    expect(model.commonsViews(s, M).find((v) => v.def.id === 'commons.lido')!.visible).toBe(false);
    s = { ...s, capital: 1e6 };
    s = run(s, 40, M);
    expect(s.meta.histories['h.rich']).toEqual({ runs: 1, cleared: true, best: 20 });
    expect(s.meta.unlocks).toMatchObject({ 'commons.lido': true, 'ch.secret': true, 'cosmetic:gilt': true });
    expect(ev(s, 'historyCleared')).toHaveLength(1);
    expect(ev(s, 'historyCleared')[0].first).toBe(true);
    expect(s.news.filter((n) => n.key === 'history')).toHaveLength(1);
    expect(s.meta.milestones.history).toBeDefined();
    expect(model.derive(s, M).history).toEqual({ id: 'h.rich', cleared: true, lifted: false });
    expect(model.commonsViews(s, M).find((v) => v.def.id === 'commons.lido')!.visible).toBe(true);
    expect(s.charterOffer.includes('ch.secret')).toBe(false); // only in later offers
    // a later run with it: cleared again (not first), best kept as the fastest
    let r = model.reckon(s, M);
    expect(r.meta.history).toBeNull();
    expect(r.meta.lastRun).toMatchObject({ history: 'h.rich', historyCleared: true });
    r = model.chooseHistory(r, M, 'h.rich');
    r = run(r, 30, M);
    expect(ev(r, 'historyCleared').at(-1)!.first).toBeUndefined();
    expect(r.meta.histories['h.rich']).toMatchObject({ runs: 2, best: 20 });
  });
  test('the reward rules hold in the fixture: options only, no automation, no power', () => {
    const allowed = new Set([...M.commons!.filter((c) => c.locked).map((c) => c.id), ...M.charters!.filter((c) => c.locked).map((c) => c.id)]);
    for (const h of M.histories!) for (const u of h.reward.unlock ?? []) expect(allowed.has(u)).toBe(true);
  });
});

/* ---------------- 12. returns and the Proprietor's Day ---------------- */

const FIG: HouseholdFigures = {
  activeMinutesBefore: 600, activeMinutesAfter: 300, sessionsBefore: 20, sessionsAfter: 10, looksBefore: 40, looksAfter: 30,
  decisionsBefore: 300, decisionsAfter: 60, automatedAfter: 900, daysBefore: 10, daysAfter: 10, quietDays: 3,
};
const ret = (f: Partial<Record<keyof HouseholdFigures, unknown>> = {}, id = 'household') => ({ id, figures: { ...FIG, ...f } as Record<string, number> });

describe("M3 returns and the Proprietor's Day", () => {
  test('every validation rule refuses the whole return; floors; extra keys dropped; one filing per run', () => {
    const s = fresh(M);
    const missing: Record<string, number> = { ...FIG };
    delete missing.quietDays;
    for (const bad of [
      { id: 'household', figures: missing }, ret({ looksAfter: -1 }), ret({ looksAfter: NaN }), ret({ looksAfter: Infinity }),
      ret({ looksAfter: RETURN_FIGURE_MAX + 1 }), ret({ sessionsBefore: 41 }), ret({ daysAfter: 11 }), ret({ quietDays: 21 }),
      ret({}, 'other'), ret({ activeMinutesBefore: '600' }), null, { id: 'household' }, { id: 'household', figures: [] },
    ]) expect(model.fileReturn(s, M, bad as never)).toBe(s);
    const f = model.fileReturn(s, M, ret({ activeMinutesBefore: 600.9, extra: 5 } as never));
    expect(f.meta.returns.household).toEqual({ figures: { ...FIG }, run: 0, at: 0, published: false, template: null });
    expect(ev(f, 'returnFiled')).toHaveLength(1);
    expect(f.run.decisions).toBe(0);
    expect(model.fileReturn(f, M, ret())).toBe(f); // identical refiling
    expect(model.fileReturn(f, M, ret({ quietDays: 1 }))).toBe(f); // a second filing in the run, different figures
    expect(model.fileReturn(fresh(fixtureM3Gated), fixtureM3Gated, ret())).toEqual(fresh(fixtureM3Gated));
  });
  test('the card (UpgradeDef.when on `returned`) sets the flag and publishes: direction from workdayChange, a down template', () => {
    let s = { ...fresh(M), capital: 1e6 };
    expect(model.upgradeViews(s, M).find((v) => v.def.id === 'steam.proprietor')!.visible).toBe(false);
    s = model.fileReturn(s, M, ret());
    expect(model.upgradeViews(s, M).find((v) => v.def.id === 'steam.proprietor')!.visible).toBe(true);
    s = model.buyUpgrade(s, M, 'steam.proprietor');
    expect(s.meta.flags.proprietor).toBe(true);
    const r = s.meta.returns.household;
    expect(r.published).toBe(true);
    const sv = model.derive(s, M).survey!;
    expect(sv.workdayBefore).toBe(60);
    expect(sv.workdayAfter).toBe(30);
    expect(sv.workdayChange).toBeCloseTo(-0.5, 12);
    expect(sv.direction).toBe('down');
    expect(sv.text!.headline).toBe('Workday down 50%');
    expect(sv.text!.body).toBe('Decisions 12 an hour.');
    expect(sv.automatedPerHour).toBe(180);
    expect(s.news.find((n) => n.key === 'return')!.text).toBe('Workday down 50%');
    expect(ev(s, 'returnPublished').at(-1)!.n).toBe(-50);
    expect(s.meta.milestones.proprietor).toBeDefined();
    expect(model.derive(s, M).orders.kind).toEqual({ market: 'opening', civilService: 'closing', treasury: 'closing', dispatch: 'closing' });
  });
  test('at most one publication per run: a filing in a run that has published waits for the next reckon()', () => {
    let s = { ...fresh(M), capital: 1e6 };
    s = model.fileReturn(s, M, ret()); // run 0, unpublished (no flag yet)
    s = model.reckon(model.tick(s, M, 1), M);
    expect(s.meta.returns.household.published).toBe(false); // no flag: nothing is published at reckon
    s = { ...s, capital: 1e6 };
    s = model.buyUpgrade(s, M, 'steam.proprietor'); // run 1: the card publishes run 0's return
    expect(s.meta.returns.household.published).toBe(true);
    s = model.fileReturn(s, M, ret({ activeMinutesAfter: 900 })); // run 1's filing: waits
    expect(s.meta.returns.household).toMatchObject({ run: 1, published: false });
    expect(model.derive(s, M).survey!.direction).toBe('up');
    s = model.reckon(model.tick(s, M, 1), M);
    expect(s.meta.returns.household.published).toBe(true);
    expect(s.news.some((n) => n.key === 'return' && n.text.startsWith('Workday up 50% to 90 minutes'))).toBe(true);
  });
  test('withdrawReturn deletes the figures and prints the line; the survey becomes null; zero denominators are null', () => {
    let s = model.fileReturn(fresh(M), M, ret({ daysBefore: 0, sessionsBefore: 0, looksBefore: 0, activeMinutesBefore: 0, decisionsBefore: 0, quietDays: 0 }));
    const sv = model.derive(s, M).survey!;
    expect(sv.workdayBefore).toBeNull();
    expect(sv.decisionsPerHourBefore).toBeNull();
    expect(sv.workdayChange).toBeNull();
    expect(sv.direction).toBe('flat');
    expect(sv.minutesPerSessionBefore).toBeNull();
    expect(model.withdrawReturn(s, M, 'nope')).toBe(s);
    s = patchSector(s, 'steam', { pressure: 1e9 }); // also while a Reckoning is pending
    const w = model.withdrawReturn(s, M, 'household');
    expect(w.meta.returns.household).toBeUndefined();
    expect(w.news[0]).toMatchObject({ key: 'returnWithdrawn', text: 'The Household Survey is discontinued for want of funding' });
    expect(ev(w, 'returnWithdrawn')).toHaveLength(1);
    expect(model.derive(w, M).survey).toBeNull();
  });
});

/* ---------------- 13. Archive, milestones, the ending ---------------- */

describe('M3 Archive, milestones and the first ending', () => {
  test('each subject rule unlocks its note, also with the viewer off; at the end of an action and in the step', () => {
    for (const c of [M, fixtureM3Gated]) {
      let s = { ...foundAll(fresh(c), c, 'steam'), capital: 1e6, time: 599.5 };
      s = model.buyUpgrade(model.buyUpgrade(s, c, 'steam.boilers'), c, 'steam.condenser');
      expect(s.meta.archive['n.condenser']).toBeDefined();
      expect(ev(s, 'archiveUnlocked').at(-1)).toMatchObject({ id: 'n.condenser', label: 'steam.condenser' });
      s = { ...s, meta: { ...s.meta, reckonings: 1, dispatches: { seen: { 'd.three': 1, 'd.once': 1, 'd.mod': 1, 'd.chain': 1 }, arms: {}, playerArms: {} } } };
      s = run(s, 2, c);
      if (c === M) {
        expect(s.dispatch.pending[0].id).toBe('d.coal');
        expect(s.meta.archive['n.coalLetter']).toBeDefined();
        expect(s.meta.archive['n.whitlow']).toBeDefined(); // a whitlow dispatch was offered (seen) before
      }
    }
    const v = model.archiveViews(fresh(M), M);
    expect(v[0]).toMatchObject({ id: 'n.condenser', unlocked: false, text: '', subjectName: 'steam.condenser', date: '1769' });
    expect(model.derive(fresh(M), M).archive).toEqual({ unlocked: 0, total: 4 });
  });
  test('the first win writes meta.endings.steadyAll, emits ending after won once ever, and the run continues', () => {
    const solo: Content = { ...M, sectors: { steam: M.sectors.steam }, sectorOrder: ['steam'], ages: [M.ages[0]], dispatches: [], ambient: [] };
    let s = decoupling(solo);
    s = { ...s, steadyYearsAll: 49.99, sectors: { ...s.sectors, steam: { ...s.sectors.steam, budget: { ...s.sectors.steam.budget!, p0: 100 } } } };
    s = model.tick(s, solo, 1);
    expect(s.flags.won).toBe(true);
    const kinds = s.events.map((e) => e.kind);
    expect(kinds.indexOf('ending')).toBe(kinds.indexOf('won') + 1);
    expect(s.meta.endings.steadyAll).toMatchObject({ run: 1, runSeconds: s.time });
    expect(s.meta.milestones.won).toBeDefined();
    expect(model.derive(s, solo).ending).toMatchObject({ reached: true, allOpen: true });
    const t = model.tick(s, solo, 1);
    expect(t.time).toBe(s.time + 1); // the ledger continues
    // a later win in a later run: 'won' again, no second 'ending'
    let r = decoupling(solo);
    r = { ...r, meta: s.meta, steadyYearsAll: 49.99, sectors: { ...r.sectors, steam: { ...r.sectors.steam, budget: { ...r.sectors.steam.budget!, p0: 100 } } } };
    r = model.tick(r, solo, 1);
    expect(ev(r, 'won').length).toBeGreaterThan(0);
    expect(r.events.filter((e) => e.kind === 'ending' && e.seq > s.meta.eventSeq)).toHaveLength(0);
  });
  test('milestones are written once; the retrospective orders by time and matches prefix templates', () => {
    let s = openAllM();
    expect(s.meta.milestones['sectorOpened:light']).toBeDefined();
    const once = s.meta.milestones['sectorOpened:light'];
    s = run(s, 5, M);
    expect(s.meta.milestones['sectorOpened:light']).toEqual(once);
    const meta = { ...s.meta, milestones: { won: { run: 3, at: 7200, year: 1900 }, 'sectorOpened:light': { run: 1, at: 1800, year: 1850 }, reveal: { run: 1, at: 900, year: 1820 }, 'clearSkies:steam': { run: 2, at: 3000, year: 1860 } } };
    const items = model.retrospective({ ...s, meta }, M);
    expect(items.map((i) => i.key)).toEqual(['reveal', 'sectorOpened:light', 'won']);
    expect(items[1]).toMatchObject({ sector: 'light', headline: 'Light opens, run 1, 0.5 h' });
    expect(items[2].headline).toBe('A steady state at last, 1900');
  });
});
function openAllM(): GameState {
  const m0 = model.createState(M).meta;
  let s = { ...model.createState(M, { ...m0, reckonings: 9, orders: { ...m0.orders, market: { ...m0.orders.market, on: false } } }), capital: 1e15 };
  for (let i = 0; i < 60 && !M.sectorOrder.every((e) => s.sectors[e].open); i++) {
    for (const v of model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, M)) if (v.visible && v.affordable && v.def.id !== 'steam.strike') s = model.buyUpgrade(s, M, v.def.id);
    s = model.tick(s, M, 1);
  }
  return s;
}

/* ---------------- 14. orders ---------------- */

describe('M3 orders', () => {
  test('marketWhy: each static reason and each logged outcome', () => {
    const why = (s: GameState, c: Content = M) => model.derive(s, c).orders.marketWhy.steam;
    expect(why(fresh(M))).toEqual({ reason: 'unavailable' });
    const r1 = fresh(M, { reckonings: 1 });
    expect(why(r1)).toEqual({ reason: 'fresh' });
    expect(why(model.setOrders(r1, M, { market: { on: false } }))).toEqual({ reason: 'off' });
    expect(why(model.setOrders(r1, M, { market: { sectors: { steam: false } } }))).toEqual({ reason: 'sectorOff' });
    const live = { ...model.tick(r1, M, 1), capital: 0 };
    expect(why(live)).toEqual({ reason: 'waiting' });
    expect(why(patchSector(live, 'steam', { pressure: 1e9 }))).toEqual({ reason: 'pending' });
    expect(why(patchSector(live, 'steam', { settled: { since: 0, sinceYear: 0, D: 1, R: 1, ps: 1, pPre: 1, income: 0, P: 0, eta: 1, defect: 1, N0: 1, spillMul0: 1, extraD0: 0, appD: {}, appAdoption: {} } }))).toEqual({ reason: 'settled' });
    const cash = run(live, 20, M);
    expect(why(cash)).toMatchObject({ reason: 'cash' });
    const bought = run({ ...live, capital: 1e6 }, 20, M);
    expect(why(bought)).toMatchObject({ reason: 'bought' });
    const slow = run(model.setOrders({ ...live, capital: 1e6 }, M, { market: { paybackMax: 1 } }), 20, M);
    expect(why(slow)).toMatchObject({ reason: 'payback' });
    expect((why(slow) as { payback: number }).payback).toBeGreaterThan(1);
    const none = run({ ...live, capital: 1e12, upgrades: Object.fromEntries(M.upgrades.filter((u) => u.sector === 'steam' && !u.excludes).map((u) => [u.id, u.repeatable ? u.maxLevel ?? 9 : 1])) }, 20, M);
    expect(why(none)).toMatchObject({ reason: 'none' });
  });
  test('the Market never buys a forbidden card', () => {
    const c: Content = { ...M, upgrades: [...M.upgrades, { id: 'x.noBoilers', sector: 'steam', name: 'x', blurb: '', kind: 'research', cost: 1, effects: [{ type: 'forbid', id: 'steam.boilers' }] } as UpgradeDef] };
    let s = { ...model.tick(fresh(c, { reckonings: 1 }), c, 1), capital: 1e6 };
    s = model.buyUpgrade(s, c, 'x.noBoilers');
    s = run(s, 40, c);
    expect(s.upgrades['steam.boilers']).toBeUndefined();
  });
});

/* ---------------- 15. events ---------------- */

describe('M3 events', () => {
  test('first on backfire and sectorOpened; label on stageReached', () => {
    let s = steamAt(0, { capital: 1e6 }, M);
    s = run(s, 2, M);
    s = model.buyUpgrade(s, M, 'steam.boilers');
    s = run(s, 2, M);
    expect(ev(s, 'backfire')[0].first).toBe(true);
    s = model.buyUpgrade(s, M, 'steam.condenser');
    expect(ev(s, 'stageReached').at(-1)).toMatchObject({ n: 1, label: 'steam.condenser' });
    const o = openAllM();
    expect(ev(o, 'sectorOpened').find((e) => e.sector === 'light')!.first).toBe(true);
  });
  test('the M3 order within a step: modifierEnded, default dispatchAnswered, dispatchArrived', () => {
    let s = { ...foundAll(fresh(M), M, 'steam'), time: 700, capital: 1e6 };
    s = { ...s, modifiers: [{ source: 'd.mod', arm: 0, since: 0, until: 700.5 }], dispatch: { ...s.dispatch, nextAt: 0, pending: [{ id: 'd.three', arrivedAt: 0, expiresAt: 700.5 }], offered: ['d.three'] } };
    s = model.tick(s, M, 1);
    const kinds = s.events.map((e) => e.kind).filter((k) => k === 'modifierEnded' || k === 'dispatchAnswered' || k === 'dispatchArrived');
    expect(kinds).toEqual(['modifierEnded', 'dispatchAnswered', 'dispatchArrived']);
    expect(new Set(s.events.slice(-3).map((e) => e.time))).toEqual(new Set([701]));
  });
});

/* ---------------- 16. banked time ---------------- */

describe('M3 banked time', () => {
  const B: Content = { ...fixtureM3Bank, sectors: M.sectors };
  test('banked = bankRate × forfeited, capped; nothing when pending or the rate is 0', () => {
    const s = { ...foundAll(fresh(B), B, 'steam'), time: 10 };
    const f = model.fastForward(s, B, 8 * 3600);
    expect(f.lastOffline!.heldBy).toBe('cap');
    expect(f.lastOffline!.simulated).toBeCloseTo(3600, 6);
    expect(f.lastOffline!.banked).toBe(7200);
    expect(f.meta.bankedSeconds).toBe(7200);
    const g = model.fastForward(s, B, 5000);
    expect(g.lastOffline!.banked).toBeCloseTo(0.5 * 1400, 6);
    const pend = patchSector(s, 'steam', { pressure: 1e9 });
    expect(model.fastForward(pend, B, 8 * 3600).meta.bankedSeconds).toBe(0);
    expect(model.fastForward({ ...foundAll(fresh(M), M, 'steam'), time: 10 }, M, 8 * 3600).meta.bankedSeconds).toBe(0);
    expect(model.derive(f, B).bank).toEqual({ seconds: 7200, max: 7200, usable: true });
  });
  test('useBank simulates min(seconds, bank) with the away rules and no cap, subtracts it, emits bankUsed', () => {
    const s = { ...foundAll(fresh(B), B, 'steam'), time: 10, meta: { ...fresh(B).meta, bankedSeconds: 5000 } };
    const u = model.useBank(s, B, 4000);
    expect(u.time).toBeCloseTo(4010, 6); // beyond the 3600 s cap
    expect(u.meta.bankedSeconds).toBeCloseTo(1000, 6);
    expect(ev(u, 'bankUsed').at(-1)!.n).toBeCloseTo(4000, 6);
    expect(u.lastOffline).toBe(s.lastOffline);
    expect(u.dispatch.draws).toBe(0); // no draws (nextAt 600 passed while banked)
    const v = model.useBank(s, B, 1e9);
    expect(v.meta.bankedSeconds).toBe(0);
    expect(model.useBank(s, B, 0)).toBe(s);
    expect(model.useBank(patchSector(s, 'steam', { pressure: 1e9 }), B, 10)).toEqual(patchSector(s, 'steam', { pressure: 1e9 }));
    const g: Content = { ...B, features: { bank: { when: { stat: 'reckonings', op: '>=', value: 5 } } } };
    expect(model.useBank(s, g, 10)).toBe(s);
  });
});
