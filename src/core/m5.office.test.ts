// M5 (Core B): the invitation, Take office (the first Treaty reset), the prospectus and the file, refusals in a Ministry,
// the Treasury, compensation, the Treaty, Articles, closedInOffice.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import type { Content, GameState, MetaState } from '../types';
import { model } from './index';
import { computeFlows } from './flows';
import { freshMeta } from './state';
import { fixtureM5B, officeMeta } from './fixture.m5b';
import { fileOf, prospectusOf } from './chair/office';
import { treasuryOf } from './chair/treasury';

const C: Content = { ...fixtureM5B, office: { ...fixtureM5B.office!, when: { stat: 'time', op: '>=', value: 30 } },
  institutions: [{ id: 'inst.board', name: 'Board', blurb: '', cost: 5, effects: [], when: { stat: 'time', op: '>=', value: 1e9 } } as never] };

function beforeOffice(meta: Partial<MetaState> = {}): GameState {
  const m: MetaState = {
    ...freshMeta(C), hindsight: 40, reckonings: 3, knowhow: { 'kh.engines': 3, 'kh.whips': 1 }, institutions: { 'inst.board': 1 },
    loadout: ['inst.board'],
    firstOpening: { actions: [
      { t: 18, kind: 'upgrade', id: 'motor.carburettor', by: 'player' }, { t: 37, kind: 'upgrade', id: 'motor.roads', by: 'player' },
      { t: 60, kind: 'upgrade', id: 'motor.roads', by: 'player' }, { t: 83, kind: 'upgrade', id: 'motor.roads', by: 'player' },
      { t: 90, kind: 'found', id: 'motor.lorries', by: 'player' }], firstBudgetAt: 900, seconds: 1200 },
    ...meta,
  };
  return { ...model.createState(C, m, 3), officeOffer: true };
}

describe('M5 office: the invitation', () => {
  test('reckon sets officeOffer when OfficeDef.when held on the run ended; between-runs rebuilds keep it', () => {
    let s = model.createState(C);
    s = model.tick(s, C, 40);
    const r = model.reckon(s, C);
    expect(r.officeOffer).toBe(true);
    expect(model.derive(r, C).office!.offered).toBe(true);
    const short = model.reckon(model.tick(model.createState(C), C, 10), C);
    expect(short.officeOffer).toBeUndefined();
    const k = model.buyKnowhow({ ...r, meta: { ...r.meta, hindsight: 100 } }, C, 'kh.whips');
    expect(k.officeOffer).toBe(true);
  });
});

describe('M5 office: Take office', () => {
  test('refused without the offer, after time has passed, or with office taken', () => {
    const s = beforeOffice();
    expect(model.takeOffice({ ...s, officeOffer: false }, C)).toEqual({ ...s, officeOffer: false });
    const ticked = model.tick(s, C, 1);
    expect(model.takeOffice(ticked, C)).toBe(ticked);
  });
  test('the reset (D2), the transfer, the prospectus and file, the Ministry built, the news and event', () => {
    const s0 = beforeOffice();
    const s = model.takeOffice(s0, C);
    const o = s.meta.office!;
    expect(s.meta.hindsight).toBe(0);
    expect(s.meta.institutions).toEqual({ 'inst.board': 0 });
    expect(s.meta.loadout).toEqual([]);
    expect(s.meta.knowhow).toEqual({ 'kh.whips': 1 }); // the industrial tree passes to the rival
    expect(o.handedOver).toEqual({ 'kh.engines': 3 });
    expect(s.meta.knowhowPeak?.['kh.engines'] ?? 3).toBe(3);
    expect(s.meta.flags.office).toBe(true);
    expect(o.ministries).toBe(1);
    expect(o.run).toBe(3);
    expect(s.officeOffer).toBe(false);
    expect(s.chair).toBeTruthy();
    expect(o.prospectus).toEqual(prospectusOf(s0.meta, C));
    expect(o.prospectus.first.map((i) => [i.id, i.t, i.count, i.every])).toEqual([
      ['motor.carburettor', 18, 1, null], ['motor.roads', 37, 3, 23], ['motor.lorries', 90, 1, null]]);
    expect(o.file).toEqual(fileOf(s0.meta, C, o.profile.pliant));
    expect(s.events!.some((e) => e.kind === 'officeTaken')).toBe(true);
    const keys = s.news.map((n) => n.key);
    expect(keys.indexOf('acquisition')).toBeGreaterThanOrEqual(0);
    expect(keys.indexOf('officeTaken')).toBeGreaterThanOrEqual(0);
    // an unlocked Institution at level 0 is bought back at its level-1 cost, past its `when`
    const back = model.buyInstitution({ ...s, meta: { ...s.meta, hindsight: 10 } }, C, 'inst.board');
    expect(back.meta.institutions['inst.board']).toBe(1);
    expect(model.institutionViews(s, C)[0].unlocked).toBe(true);
    // the industrial tree is held: not bought in office
    expect(model.buyKnowhow({ ...s, meta: { ...s.meta, hindsight: 100 } }, C, 'kh.engines').meta.knowhow['kh.engines']).toBeUndefined();
    expect(model.knowhowViews(s, C).find((v) => v.def.id === 'kh.engines')!.held).toBe(true);
  });
  test('a meta without a first opening: the prospectus defaults', () => {
    const s = model.takeOffice({ ...model.createState(C, { ...freshMeta(C), reckonings: 1 }), officeOffer: true }, C);
    expect(s.meta.office!.prospectus.defaulted).toBe(true);
  });
});

describe('M5 office: refusals in a Ministry; the Treasury', () => {
  const m = (): GameState => { const s = model.createState(C, officeMeta(C, freshMeta(C)), 7); return { ...s, mandate: 1000, capital: 1e6, flags: { ...s.flags, revealed: true } }; };
  test('the player never buys or founds in a chair sector; no click', () => {
    const s = m();
    expect(model.buyUpgrade(s, C, 'motor.carburettor')).toBe(s);
    expect(model.foundApp(s, C, 'motor.lorries')).toBe(s);
    expect(model.click(s, C)).toBe(s);
    expect(model.derive(s, C).clickValue).toBe(0);
    expect(model.derive(s, C).sectors.motor.apps['motor.lorries'].canFound).toBe(false);
  });
  test('the Treasury takes taxShare of the rival income (+ levyShare of treasury levies); Derived.incomePerSec reports it', () => {
    const s = model.tick(m(), C, 5);
    const fl = computeFlows(s, C);
    const t = treasuryOf(s, C, fl);
    expect(t.taxPerSec).toBeCloseTo(C.chair!.treasury.taxShare * fl.income, 6);
    expect(model.derive(s, C).incomePerSec).toBeCloseTo(t.perSec, 9);
    const n = model.tick(s, C, 1);
    expect(n.capital - s.capital).toBeCloseTo(t.perSec, 3);
  });
  test('a pledge with treasuryShare takes its part of Treasury income', () => {
    const s = model.tick(m(), C, 5);
    const a = treasuryOf(s, C, computeFlows(s, C)).perSec;
    const b = treasuryOf({ ...s, chair: { ...s.chair!, pledges: ['p.rail'] } }, C, computeFlows(s, C)).perSec;
    expect(b).toBeCloseTo(a * 0.9, 9);
  });
  test('compensate: costYears of the income lost, holds the jobs term for `years`', () => {
    let s = model.tick(m(), C, 5);
    const inc = computeFlows(s, C).sectors.motor.income;
    s = { ...s, chair: { ...s.chair!, rival: { ...s.chair!.rival, peakIncome: { ...s.chair!.rival.peakIncome, motor: inc * 2 } } } };
    const c0 = s.capital;
    const t = model.compensate(s, C, 'motor');
    expect(t).not.toBe(s);
    expect(c0 - t.capital).toBeCloseTo(C.chair!.compensation.costYears / 0.05 * inc, 3);
    expect(t.chair!.compensated.motor).toBeCloseTo(s.time + C.chair!.compensation.years / 0.05, 9);
    expect(model.compensate(t, C, 'motor')).toBe(t);
  });
});

describe('M5 office: the Treaty and Articles', () => {
  test('treaty pays Precedent over office.record, resets, teaches the playbook; buyArticle', () => {
    let s = model.createState(C, officeMeta(C, { ...freshMeta(C), hindsight: 30, knowhow: { 'kh.whips': 1, 'kh.engines': 2 }, institutions: { 'inst.board': 2 } }), 7);
    s = { ...s, meta: { ...s.meta, office: { ...s.meta.office!, record: { certifiedDecades: 4, settledFromChair: 1, parliamentsWon: 3, wellbeingYears: 1000 } } } };
    const d = model.derive(s, C).treaty!;
    expect(d.available).toBe(true);
    expect(d.precedentIfNow).toBe(Math.round(4 * 0.5 + 3 + 3 + 1)); // 9
    const t = model.treaty(s, C);
    expect(t.meta.precedent).toBe(9);
    expect(t.meta.treaties).toBe(1);
    expect(t.meta.playbooks).toEqual(['pb.selfReport']);
    expect(t.meta.hindsight).toBe(0);
    expect(t.meta.knowhow).toEqual({ 'kh.engines': 2 }); // Statecraft respec'd; the rival's tree untouched
    expect(t.meta.institutions).toEqual({ 'inst.board': 0 });
    expect(t.meta.office!.record).toEqual({ certifiedDecades: 0, settledFromChair: 0, parliamentsWon: 0, wellbeingYears: 0 });
    expect(t.events!.map((e) => e.kind)).toContain('playbookLearnt');
    const a = model.buyArticle(t, C, 'art.terms');
    expect(a.meta.articles).toEqual({ 'art.terms': true });
    expect(a.meta.precedent).toBe(4);
    expect(model.buyArticle(a, C, 'art.terms')).toBe(a);
    expect(model.treaty(model.tick(s, C, 1), C)).toEqual(model.tick(s, C, 1)); // not fresh
  });
  test('reckon in office: ministries + 1, the record grows, RunSummary.ministry', () => {
    let s = model.createState(C, officeMeta(C, freshMeta(C)), 7);
    s = model.tick(s, C, 30);
    s = { ...s, chair: { ...s.chair!, electionsWon: 2 } };
    const r = model.reckon(s, C);
    expect(r.meta.office!.ministries).toBe(2);
    expect(r.meta.office!.record.parliamentsWon).toBe(2);
    expect(r.meta.lastRun!.ministry!.electionsWon).toBe(2);
    expect(r.meta.lastRun!.sectors.motor.rival).toBe(true);
    expect(r.chair!.electionsWon).toBe(0);
  });
});

describe('M5 office: closedInOffice and previews', () => {
  test('a sector of a closedInOffice act never opens in a Ministry; before office a chair act is a Preview', () => {
    const c2: Content = { ...C, acts: [{ ...C.acts![0], ages: ['acceleration'] }, { id: 'actThree', name: 'III', title: 'Attention', ages: ['attention'], preview: true, closedInOffice: true }],
      ages: [...C.ages, { id: 'attention', name: 'Attention', tagline: '', yearSpan: [1990, 2030], theme: 'chrome', sectors: ['code'] }],
      sectors: { ...C.sectors, code: { ...C.sectors.motor, id: 'code', name: 'Code', applications: [{ ...C.sectors.motor.applications[0], id: 'code.app' }] } },
      sectorOrder: [...C.sectorOrder, 'code'] };
    const out = model.createState(c2);
    expect(model.derive(out, c2).sectors.motor.preview).toBe(true);
    const inOffice = model.tick(model.createState(c2, officeMeta(c2, freshMeta(c2))), c2, 5);
    expect(inOffice.sectors.code.open).toBe(false);
    expect(model.derive(inOffice, c2).sectors.motor.preview).toBe(false);
    const free = model.tick(out, c2, 5);
    expect(free.sectors.code.open).toBe(true);
  });
});

describe('M5 office (follow-up): the prospectus pace', () => {
  test('"and another every …" is the mean interval of that card\'s purchases up to the last quoted item\'s time', () => {
    const A = (t: number, id: string, kind: 'upgrade' | 'found' = 'upgrade') => ({ t, kind, id, by: 'player' as const });
    const meta = { ...freshMeta(C), firstOpening: { actions: [
      A(18, 'motor.carburettor'), A(37, 'motor.roads'), A(58, 'motor.roads'), A(70, 'motor.overhead'), A(81, 'motor.roads'),
      A(90, 'motor.lorries', 'found'), A(120, 'motor.injection5'), A(200, 'motor.turbo'), A(400, 'motor.roads'), A(600, 'motor.roads'),
    ], firstBudgetAt: null, seconds: 700 } } as MetaState;
    const p = prospectusOf(meta, C);
    expect(p.first.map((i) => i.id)).toEqual(['motor.carburettor', 'motor.roads', 'motor.overhead', 'motor.lorries', 'motor.injection5']);
    const roads = p.first[1];
    expect([roads.count, roads.every]).toEqual([5, 22]); // (81 − 37) / 2, not (600 − 37) / 4 ≈ 141
  });
});
