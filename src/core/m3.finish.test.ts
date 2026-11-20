// M3 (finish): the small core fixes the lanes reported, each with its test. (a) headline variants come round in turn
// within a run (GameState.headlineUse); (b) "the History was cleared this run" and "a return was published this run"
// are run flags (RunStats.historyCleared / returnPublished), no longer read from the last 40 news items.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, EffectDef, GameState, HouseholdFigures, MetaState, NewsItem } from '../types';
import { model } from './index';
import { fixture as F, fixtureM3 as M0 } from './fixture';
import { headline, newsWith } from './headlines';
import { publish } from './returns';
import { temptingApp } from './temptation';
import { freshMeta } from './state';
import { openAll, run, settledNow } from './m1.testkit';

const M: Content = { ...M0, sectors: { ...M0.sectors, steam: { ...M0.sectors.steam, pressureIntensity: 0, reserve: 1e9 } } };
const fresh = (c: Content, p: Partial<MetaState> = {}) => model.createState(c, { ...freshMeta(c), ...p }, 3);
const filler = (s: GameState, n: number): GameState => {
  const items: NewsItem[] = Array.from({ length: n }, (_, i) => ({ time: s.time, year: 1800, key: 'efficiency', text: `filler ${i}` }));
  return { ...s, news: [...items.reverse(), ...s.news].slice(0, 40) };
};

describe('M3 finish (a): headline variants, least recently used within a run', () => {
  const C3: Content = { ...M, headlines: { ...M.headlines, crisis: ['Fog over {sector}', 'Smoke in {sector}', 'Choking {sector}'] }, sectorHeadlines: {} };
  const print = (s: GameState): { s: GameState; text: string } => {
    const it = headline(s, C3, 'crisis', s.time, { year: 1850 }, 'steam');
    return { s: { ...s, ...newsWith(s, C3, [it]) }, text: it.text };
  };
  test('every variant once before any repeats, even with the news list cycled in between; deterministic', () => {
    let s = fresh(C3);
    const texts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const p = print(s);
      texts.push(p.text);
      s = filler(p.s, 45); // more than NEWS_MAX items between two crises: the news list alone could not remember
    }
    expect(new Set(texts.slice(0, 3)).size).toBe(3);
    expect(texts.slice(3)).toEqual(texts.slice(0, 3));
    expect(s.headlineUse?.crisis).toBe(6);
    // the same state prints the same headline (no clock, no randomness)
    const again = fresh(C3);
    expect(print(again).text).toBe(texts[0]);
  });
  test('an Industry\'s own variants rotate in their own slot; a Reckoning starts the rotation afresh; a save keeps it', () => {
    const own: Content = { ...C3, sectorHeadlines: { steam: { crisis: ['Steam A', 'Steam B'] } } };
    let s = fresh(own);
    const a = headline(s, own, 'crisis', 0, { year: 1850 }, 'steam');
    s = { ...s, ...newsWith(s, own, [a]) };
    const b = headline(s, own, 'crisis', 0, { year: 1850 }, 'steam');
    expect([a.text, b.text].sort()).toEqual(['Steam A', 'Steam B']);
    expect(s.headlineUse).toEqual({ 'crisis:steam': 1 });
    const back = model.deserialize(model.serialize(s), own)!;
    expect(back.headlineUse).toEqual({ 'crisis:steam': 1 });
    const next = model.reckon(model.tick({ ...s, flags: { ...s.flags, revealed: true } }, own, 1), own);
    expect(next.headlineUse?.['crisis:steam']).toBeUndefined();
  });
});

describe('M3 finish (b): run flags for a History cleared and a return published', () => {
  const FIG: HouseholdFigures = {
    activeMinutesBefore: 60, activeMinutesAfter: 30, sessionsBefore: 4, sessionsAfter: 4, looksBefore: 10, looksAfter: 10,
    decisionsBefore: 50, decisionsAfter: 20, automatedAfter: 300, daysBefore: 3, daysAfter: 3, quietDays: 0,
  };
  test('a History clears once a run however many headlines follow; the flag is the record', () => {
    let s = model.chooseHistory(fresh(M, { reckonings: 2 }), M, 'h.rich');
    s = run({ ...s, capital: 1e6 }, 25, M);
    expect(s.run.historyCleared).toBe(true);
    expect(model.derive(s, M).history.cleared).toBe(true);
    // the news list cycled: no second clearing, and the view still says cleared
    s = filler(s, 45);
    expect(s.news.some((n) => n.key === 'history')).toBe(false);
    const t = run(s, 5, M);
    expect(t.events.filter((e) => e.kind === 'historyCleared')).toHaveLength(1);
    expect(model.derive(t, M).history.cleared).toBe(true);
    // a Reckoning: the next run starts uncleared
    expect(model.reckon(t, M).run.historyCleared).toBeUndefined();
  });
  test('one publication a run, even after the news list has cycled', () => {
    let s = { ...fresh(M), capital: 1e6 };
    s = model.fileReturn(s, M, { id: 'household', figures: { ...FIG } as unknown as Record<string, number> });
    s = model.buyUpgrade(s, M, 'steam.proprietor');
    expect(s.run.returnPublished).toBe(true);
    // a second return filed in the same run (as if another one were unpublished) is not printed this run
    const meta = { ...s.meta, returns: { household: { ...s.meta.returns.household, published: false } } };
    const t = filler({ ...s, meta }, 45);
    expect(t.news.some((n) => n.key === 'return')).toBe(false);
    expect(publish(t, M, t.time)).toBe(t); // the run flag holds it to the next Reckoning
    expect(publish({ ...t, run: { ...t.run, returnPublished: undefined } }, M, t.time).meta.returns.household.published).toBe(true);
  });
  test('migration: a save without the flags reads them from its news, as before', () => {
    const s = fresh(M);
    const raw = JSON.parse(model.serialize(s));
    raw.news = [{ time: 1, year: 1800, key: 'history', text: 'A history written' }, { time: 1, year: 1800, key: 'return', text: 'Workday down' }];
    delete raw.run.historyCleared; delete raw.run.returnPublished;
    const back = model.deserialize(JSON.stringify(raw), M)!;
    expect(back.run.historyCleared).toBe(true);
    expect(back.run.returnPublished).toBe(true);
    const plain = model.deserialize(model.serialize(s), M)!;
    expect(plain.run.historyCleared).toBeUndefined();
  });
});

describe('M3 finish (d): three effect kinds the letter-writer asked for', () => {
  // a standing effect from an owned card (any standing source behaves alike: a dispatch arm, a modifier, a Charter)
  const withFx = (c: Content, effects: EffectDef[]): Content => ({ ...c, upgrades: [...c.upgrades, { ...c.upgrades[0], id: 'x.fx', name: 'Test', effects, excludes: undefined }] });
  const own = (s: GameState): GameState => ({ ...s, upgrades: { ...s.upgrades, 'x.fx': 1 } });
  const base = (): GameState => ({ ...openAll(F, 40), mandate: 1e4, flags: { revealed: true, won: false } });

  test('leverCostMul: a lever (or a kind) cheaper to raise and to keep, everywhere the cost is read', () => {
    const c = withFx(F, [{ type: 'leverCostMul', lever: 'steam.duty', cost: 0.5, upkeep: 0.5 }]);
    const s0 = base();
    const v0 = model.leverViews(s0, F).find((l) => l.def.id === 'steam.duty')!;
    const s1 = own(s0);
    const v1 = model.leverViews(s1, c).find((l) => l.def.id === 'steam.duty')!;
    expect(v1.nextCost).toBeCloseTo(v0.nextCost! * 0.5, 9);
    const a = model.setLever(s0, F, 'steam.duty', 1), b = model.setLever(s1, c, 'steam.duty', 1);
    expect(s1.mandate - b.mandate).toBeCloseTo((s0.mandate - a.mandate) * 0.5, 9);
    const ua = model.leverViews(a, F).find((l) => l.def.id === 'steam.duty')!.upkeep, ub = model.leverViews(b, c).find((l) => l.def.id === 'steam.duty')!.upkeep;
    expect(ub).toBeCloseTo(ua * 0.5, 9);
    expect(model.derive(b, c).mandatePerSec - model.derive(a, F).mandatePerSec).toBeCloseTo(ua - ub, 6);
    // by kind and sector: another lever of the kind is matched, one of another kind is not
    const k = withFx(F, [{ type: 'leverCostMul', leverKind: 'cap', cost: 2 }]);
    const cap0 = model.leverViews(s0, F).find((l) => l.def.id === 'steam.cap')!, cap1 = model.leverViews(own(s0), k).find((l) => l.def.id === 'steam.cap')!;
    if (cap0.nextCost !== null) expect(cap1.nextCost).toBeCloseTo(cap0.nextCost * 2, 9);
    expect(model.leverViews(own(s0), k).find((l) => l.def.id === 'steam.duty')!.nextCost).toBe(v0.nextCost);
  });

  test('suspendOrder: the Market places nothing while it is in force, and reads unavailable', () => {
    const c = withFx(F, [{ type: 'suspendOrder', order: 'market' }]);
    let s = { ...base(), capital: 1e12, meta: { ...base().meta, orders: { ...base().meta.orders, market: { ...base().meta.orders.market, on: true } } } };
    expect(model.derive(s, F).orders.market.available).toBe(true);
    s = own(s);
    expect(model.derive(s, c).orders.market.available).toBe(false);
    const t = run(s, 60, c);
    expect(t.events.filter((e) => e.by === 'market').length).toBe(0);
    expect(Object.values(model.derive(t, c).orders.marketWhy).every((w) => w.reason === 'unavailable' || w.reason === 'settled')).toBe(true);
    // without the effect the same state does buy
    const u = run({ ...s, upgrades: { ...s.upgrades, 'x.fx': 0 } }, 60, c);
    expect(u.events.filter((e) => e.by === 'market').length).toBeGreaterThan(0);
  });

  test('spillMul: the demand a sector spills into the next scales with it (0 removes it)', () => {
    const s = own(base());
    const D = (fx: EffectDef[]) => model.derive(s, withFx(F, fx)).sectors.steam!.demand;
    const d1 = D([]), d0 = D([{ type: 'spillMul', sector: 'light', value: 0 }]), d2 = D([{ type: 'spillMul', sector: 'light', value: 2 }]);
    expect(d0).toBeLessThan(d1);
    expect(d2).toBeGreaterThan(d1);
  });

  test('leakMul: a leaking cap leaks more, or less', () => {
    let s = own(base());
    s = model.drawBudget(s, F, 'steam');
    s = { ...s, levers: { ...s.levers, 'steam.cap': { level: 3, ref: 0 } } };
    const R = (fx: EffectDef[]) => model.derive(s, withFx(F, fx)).sectors.steam!.resourceUse;
    const r1 = R([]), r2 = R([{ type: 'leakMul', sector: 'steam', value: 2 }]), r0 = R([{ type: 'leakMul', sector: 'steam', value: 0 }]);
    expect(r2).toBeGreaterThan(r1);
    expect(r0).toBeLessThan(r1);
  });
});

describe('M3 finish: the temptation shown where the player decides (wantedChange)', () => {
  test('a night use, a sprawl use, the next seam and a business model each report what they add to the line', () => {
    let s = { ...openAll(M0, 60), mandate: 1e4, flags: { revealed: true, won: false } };
    const c = M0;
    // nothing is shown before a line is drawn
    const tempting = (sec: string) => c.sectors[sec].applications.find((a) => temptingApp(c.sectors[sec], a))!;
    const night = tempting('light'), sprawl = tempting('motion');
    s = { ...s, sectors: { ...s.sectors,
      light: { ...s.sectors.light, apps: { ...s.sectors.light.apps, [night.id]: { ...s.sectors.light.apps[night.id], available: true, founded: false } } },
      motion: { ...s.sectors.motion, apps: { ...s.sectors.motion.apps, [sprawl.id]: { ...s.sectors.motion.apps[sprawl.id], available: true, founded: false } } } } };
    expect(model.derive(s, c).sectors.light!.apps[night.id].wantedChange).toBeNull();
    for (const e of ['steam', 'light', 'motion', 'compute']) s = model.drawBudget(s, c, e);
    const d = model.derive(s, c);
    expect(d.sectors.light!.apps[night.id].wantedChange!).toBeGreaterThan(0);
    expect(d.sectors.motion!.apps[sprawl.id].wantedChange!).toBeGreaterThan(0);
    // a seam can cut today's burn (dearer coal from deeper down) while it lengthens the run: a figure either way
    expect(Number.isFinite(d.sectors.steam!.seams!.wantedChange!)).toBe(true);
    // a founded or ordinary use reports nothing
    const plainApp = c.sectors.light.applications.find((a) => !temptingApp(c.sectors.light, a))!;
    expect(d.sectors.light!.apps[plainApp.id].wantedChange ?? null).toBeNull();
    // the business-model card (a priceSeen effect), if one is visible and unbought
    const card = model.upgradeViews(s, c).find((v) => v.visible && !v.maxed && v.def.effects.some((e) => e.type === 'priceSeen') && !(s.upgrades[v.def.id] > 0));
    if (card) expect(card.wantedChange!).toBeGreaterThanOrEqual(0);
    // deterministic and cached within the bucket: the same state, the same figure
    expect(model.derive(s, c).sectors.light!.apps[night.id].wantedChange).toBe(d.sectors.light!.apps[night.id].wantedChange);
  });
});

describe('M3 finish: holding settlements together costs Mandate (GlobalParams.settleHold); the ending checklist', () => {
  test('each settled Industry pays holdUpkeep + holdStep × (n − 1); the view says what one more would cost', () => {
    const H: Content = { ...F, global: { ...F.global, settleHold: { holdUpkeep: 1, holdStep: 0.5 } } };
    let s = { ...openAll(H, 40), mandate: 1e4, flags: { revealed: true, won: false } };
    const before = model.derive(s, H).mandatePerSec;
    s = settledNow(settledNow(s, H, 'steam'), H, 'light');
    const d = model.derive(s, H);
    expect(d.ending.settled).toBe(2);
    expect(d.ending.hold).toBeCloseTo(3, 9); // 2 × (1 + 0.5)
    expect(d.ending.nextHold).toBeCloseTo(6, 9); // 3 × (1 + 1)
    expect(d.sectors.steam!.settleDefence).toBeGreaterThanOrEqual(1.5 - 1e-9);
    // the settled Industries' lever upkeep is gone and the hold is paid instead: compare with no hold cost
    expect(model.derive(s, F).mandatePerSec - d.mandatePerSec).toBeCloseTo(3, 6);
    void before;
    // the next Industry in order not settled, and what it waits on
    expect(d.ending.next?.sector).toBe('motion');
    expect(['line', 'clear', 'years', 'ready', 'feature']).toContain(d.ending.next!.need);
    const none = model.derive(s, { ...H, global: { ...H.global, settleHold: undefined } }).ending;
    expect(none.hold).toBe(0);
  });
});
