// M2 mechanism tests (9, 11, 12 of briefs/m2-core.md): Charters, the Know-how respec, recording.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { OPENING_MAX, RUN_HISTORY_MAX, YEARS_PER_SECOND } from '../types';
import type { Content, GameState, MetaState } from '../types';
import { model, mix32 } from './index';
import { fixture as C } from './fixture';
import { drawOffer } from './charters';
import { freshMeta } from './state';
import { D, openAll, rich, run, steamAt } from './m1.testkit';

const metaWith = (patch: Partial<MetaState>): MetaState => ({ ...freshMeta(C), ...patch });

/* ---------------- 9. Charters ---------------- */

describe('M2 Charters', () => {
  test('mix32 and the offers are pinned for three seeds', () => {
    expect(mix32(1)).toBe(824515495);
    expect(mix32(2)).toBe(1722258072);
    const offer = (seed: number) => drawOffer(model.createState(C, metaWith({ reckonings: 1 }), seed), C, undefined);
    expect(offer(1)).toEqual(['ch.coalfield', 'ch.mills']);
    expect(offer(2)).toEqual(['ch.coalfield', 'ch.loan']);
    expect(offer(4)).toEqual(['ch.mills', 'ch.loan']);
    // reckon draws it on the new run (with the new seed) and run 1 has none
    expect(model.createState(C).charterOffer).toEqual([]);
    const r = model.reckon(model.createState(C, undefined, 3), C);
    expect(r.charterOffer).toEqual(drawOffer(model.createState(C, r.meta, r.seed), C, undefined));
    expect(r.charterOffer).toEqual(['ch.mills', 'ch.loan']);
    expect(D(r).charterOffer).toEqual(r.charterOffer);
    // every Charter is offered at least once across ten seeds
    const seen = new Set<string>();
    for (let seed = 1; seed <= 10; seed++) for (const id of offer(seed)) seen.add(id);
    expect([...seen].sort()).toEqual(['ch.coalfield', 'ch.loan', 'ch.mills']);
  });
  test('the previous Charter is excluded when that leaves two; requires is respected', () => {
    const s = model.createState(C, metaWith({ reckonings: 1 }), 1);
    expect(drawOffer(s, C, 'ch.mills')).toEqual(['ch.coalfield', 'ch.loan']);
    const REQ: Content = { ...C, charters: C.charters!.map((c) => (c.id === 'ch.coalfield' ? { ...c, requires: { stat: 'reckonings' as const, op: '>=' as const, value: 99 } } : c)) };
    expect(drawOffer(s, REQ, undefined)).toEqual(['ch.mills', 'ch.loan']);
    expect(drawOffer(s, REQ, 'ch.mills')).toEqual(['ch.mills', 'ch.loan']); // excluding it would leave one
  });
  test('chooseCharter only while fresh; rebuilds and keeps the offer; one-offs ignored; null removes it', () => {
    const r = model.reckon(model.createState(C, undefined, 1), C); // offer [coalfield, mills]
    expect(r.charterOffer).toEqual(['ch.coalfield', 'ch.mills']);
    expect(model.chooseCharter(r, C, 'ch.loan')).toBe(r); // not offered
    const c = model.chooseCharter(r, C, 'ch.coalfield');
    expect(c.meta.charter).toBe('ch.coalfield');
    expect(c.charterOffer).toEqual(r.charterOffer);
    expect(c.sectors.steam.reserveMax).toBeCloseTo(r.sectors.steam.reserveMax * 1.5, 6); // start-of-run reserveAdd
    expect(c.mandate).toBe(r.mandate); // the mandateAdd one-off is ignored
    expect(c.news[0].key).toBe('charter');
    expect(c.events.at(-1)).toMatchObject({ kind: 'charterChosen', id: 'ch.coalfield' });
    expect(D(c).charter).toBe('ch.coalfield');
    expect(model.chooseCharter(c, C, 'ch.coalfield')).toBe(c);
    const k = model.buyKnowhow({ ...c, meta: { ...c.meta, hindsight: 100 } }, C, 'kh.seed');
    expect(k.charterOffer).toEqual(r.charterOffer);
    expect(k.meta.charter).toBe('ch.coalfield');
    const none = model.chooseCharter(c, C, null);
    expect(none.meta.charter).toBeNull();
    const started = run(c, 1);
    expect(model.chooseCharter(started, C, 'ch.mills')).toBe(started);
    expect(D(started).charterOffer).toEqual([]);
    // the Reckoning records it and resets it
    const next = model.reckon(started, C);
    expect(next.meta.charter).toBeNull();
    expect(next.meta.lastRun!.charter).toBe('ch.coalfield');
    expect(next.meta.opening!.charter).toBe('ch.coalfield');
  });
  test('startFounded founds at run start and when a later sector opens; institutionLoan applies and satisfies requires', () => {
    const r = model.reckon(model.createState(C, undefined, 1), C);
    const m = model.chooseCharter(r, C, 'ch.mills');
    expect(m.sectors.steam.apps['steam.mills']).toMatchObject({ available: true, founded: true });
    let o = { ...m, meta: { ...m.meta, reckonings: 9 }, capital: 1e15 };
    for (let i = 0; i < 600 && !o.sectors.light.open; i++) {
      for (const v of model.upgradeViews({ ...o, flags: { ...o.flags, revealed: false } }, C)) if (v.visible && v.affordable) o = model.buyUpgrade(o, C, v.def.id);
      o = model.tick(o, C, 1);
    }
    expect(o.sectors.light.open).toBe(true);
    expect(o.sectors.light.apps['light.homes']).toMatchObject({ available: true, founded: true });
    expect(o.events.some((e) => e.kind === 'appFounded' && e.id === 'light.homes' && e.by === 'default')).toBe(true);
    // the loan: inst.stats at level 1 (reveal), counts as seated for code.sharedLibs, not as owned
    const loanMeta = metaWith({ reckonings: 9, charter: 'ch.loan' });
    const l = model.createState(C, loanMeta);
    expect(l.flags.revealed).toBe(true);
    const all = openAll();
    const withLoan = { ...all, meta: { ...all.meta, charter: 'ch.loan' } };
    const without = { ...all, meta: { ...all.meta, charter: null } };
    const vis = (s: GameState) => model.leverViews(s, C).find((x) => x.def.id === 'code.sharedLibs')!.visible;
    expect(vis(withLoan)).toBe(true);
    expect(vis(without)).toBe(false);
    expect(model.institutionViews(withLoan, C).find((i) => i.def.id === 'inst.stats')!.level).toBe(0);
  });
});

/* ---------------- 11. the respec ---------------- */

describe('M2 Know-how respec', () => {
  test('only while fresh; refund = price list × respecRefund; branch exclusions lift; per tree', () => {
    let s = { ...model.createState(C), meta: { ...model.createState(C).meta, hindsight: 1000 } };
    s = model.buyKnowhow(s, C, 'kh.engines');
    s = model.buyKnowhow(s, C, 'kh.engines');
    s = model.buyKnowhow(s, C, 'kh.cornish');
    s = model.buyKnowhow(s, C, 'kh.seed');
    expect(model.knowhowViews(s, C).find((k) => k.def.id === 'kh.manchester')!.excludedBy).toBe('kh.cornish');
    const engines = 2 + 2 * 1.5 + 4, general = 1;
    expect(D(s).respec).toEqual({ allowed: true, refund: engines + general, refundByTree: { engines, general } });
    expect(model.respecKnowhow(run(s, 1), C)).toEqual(run(s, 1)); // not fresh
    const t = model.respecKnowhow(s, C, 'engines');
    expect(t.meta.hindsight).toBeCloseTo(s.meta.hindsight + engines, 9);
    expect(t.meta.knowhow).toEqual({ 'kh.seed': 1 });
    expect(model.knowhowViews(t, C).find((k) => k.def.id === 'kh.manchester')!.excludedBy).toBeNull();
    expect(model.respecKnowhow(t, C, 'engines')).toBe(t); // nothing left in scope
    const HALF: Content = { ...C, global: { ...C.global, respecRefund: 0.5 } };
    expect(model.respecKnowhow(s, HALF).meta.hindsight).toBeCloseTo(s.meta.hindsight + 0.5 * (engines + general), 9);
    expect(t.run.decisions).toBe(0);
  });
  test('a one-off slotAdd node bought, respecced and re-bought adds one slot in all', () => {
    let s = { ...model.createState(C), meta: { ...model.createState(C).meta, hindsight: 100 } };
    s = model.buyKnowhow(s, C, 'kh.chair');
    expect(s.meta.slots).toBe(3);
    expect(s.meta.knowhowPeak['kh.chair']).toBe(1);
    s = model.respecKnowhow(s, C);
    expect(s.meta.slots).toBe(3);
    s = model.buyKnowhow(s, C, 'kh.chair');
    expect(s.meta.slots).toBe(3);
    expect(s.mandate).toBe(10); // its mandateAdd fired once, not again
  });
});

/* ---------------- 12. recording ---------------- */

describe('M2 recording', () => {
  test('each listed action counts one decision in its model decade; refused actions and clicks count none', () => {
    let s = rich(run(steamAt(1), 2));
    const apps = { ...s.sectors.steam.apps, 'steam.railways': { ...s.sectors.steam.apps['steam.railways'], founded: false } };
    s = { ...s, sectors: { ...s.sectors, steam: { ...s.sectors.steam, apps } }, run: { ...s.run, decisions: 0, decisionsByDecade: [] } };
    s = model.click(s, C);
    expect(s.run.decisions).toBe(0);
    const refused = model.buyUpgrade(s, C, 'steam.turbine');
    expect(refused).toBe(s);
    s = model.buyUpgrade(s, C, 'steam.condenser');
    s = model.foundApp(s, C, 'steam.railways');
    s = model.drawBudget(s, C, 'steam', 'firm');
    s = model.setLever(s, C, 'steam.duty', 1);
    s = model.setLeverRecycle(s, C, 'steam.duty', 'dividend');
    expect(s.run.decisions).toBe(5);
    expect(s.run.decisionsByDecade).toEqual([5]);
    const later = { ...s, time: 10 / YEARS_PER_SECOND * 3 + 1 }; // model decade 3
    const t = model.setLever(later, C, 'steam.duty', 0);
    expect(t.run.decisionsByDecade).toEqual([5, 0, 0, 1]);
    expect(t.run.decisions).toBe(6);
    expect(s.run.opening.map((o) => [o.kind, o.id, o.by])).toEqual(expect.arrayContaining([['upgrade', 'steam.condenser', 'player'], ['found', 'steam.railways', 'player']]));
    expect(s.run.firstBudgetAt).toBe(s.time);
  });
  test('opening caps at OPENING_MAX; reckon writes the opening, firstOpening once, runs (trimmed) and the summary', () => {
    let s = { ...model.createState(C), capital: 1e12 };
    const op = Array.from({ length: OPENING_MAX + 5 }, (_, i) => ({ t: i, kind: 'upgrade' as const, id: `x${i}`, by: 'player' as const }));
    s = { ...s, run: { ...s.run, opening: op.slice(0, OPENING_MAX) } };
    s = model.buyUpgrade(s, C, 'steam.boilers');
    expect(s.run.opening.length).toBe(OPENING_MAX);
    s = run(greedyish(s), 60);
    const r1 = model.reckon(s, C);
    expect(r1.meta.opening!.actions.length).toBe(OPENING_MAX);
    expect(r1.meta.firstOpening).toEqual(r1.meta.opening);
    expect(r1.meta.runs.length).toBe(1);
    expect(r1.meta.lastRun).toEqual(r1.meta.runs[0]);
    const sum = r1.meta.lastRun!;
    expect(sum.index).toBe(1);
    expect(sum.decisions).toBe(s.run.decisions);
    expect(sum.peakPopulation).toBe(s.peakPopulation);
    expect(sum.sectors.steam!.stage).toBeGreaterThanOrEqual(1);
    expect(sum.sectors.steam!.peakPressure).toBeCloseTo(s.sectors.steam.peakPressure / 100, 9);
    expect(sum.sectors.steam!.peakAdoption!['steam.pumping']).toBeGreaterThan(0);
    expect(sum.sectors.steam!.steady).toBe(false);
    let r = r1;
    for (let i = 0; i < RUN_HISTORY_MAX; i++) r = model.reckon(run(r, 1), C);
    expect(r.meta.runs.length).toBe(RUN_HISTORY_MAX);
    expect(r.meta.runs[RUN_HISTORY_MAX - 1].index).toBe(RUN_HISTORY_MAX + 1);
    expect(r.meta.firstOpening).toEqual(r1.meta.firstOpening);
    expect(r.meta.opening!.actions.length).toBeLessThan(OPENING_MAX);
  });
  test('firstBudgetAt ignores a standing cap line', () => {
    const meta = metaWith({ institutions: { 'inst.capStanding': 1 }, loadout: ['inst.capStanding'] });
    let s = run({ ...model.createState(C, meta), capital: 1e5 }, 5);
    expect(s.sectors.steam.budget).not.toBeNull();
    expect(s.run.firstBudgetAt).toBeNull();
    s = model.drawBudget(rich(s), C, 'steam');
    expect(s.run.firstBudgetAt).toBe(s.time);
  });
});

function greedyish(s: GameState): GameState {
  for (const v of model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, C)) if (v.visible && v.affordable) s = model.buyUpgrade(s, C, v.def.id);
  return s;
}
