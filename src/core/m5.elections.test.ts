// M5 (Core B): Confidence, the Parliament clock, pledges, Opposition, the 'defeated' end, popularity, the election hold.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { YEARS_PER_SECOND } from '../types';
import type { Content, GameState } from '../types';
import { model } from './index';
import { computeFlows } from './flows';
import { freshMeta } from './state';
import { fixtureM5B, officeMeta } from './fixture.m5b';
import { confidenceParts, drawOffer, popularityTerm, stepElections } from './chair/elections';
import { modsOf } from './effects';

const C = fixtureM5B;
function ministry(c: Content = C, seed = 7): GameState {
  const s = model.createState(c, officeMeta(c, freshMeta(c)), seed);
  return { ...s, mandate: 10_000, flags: { ...s.flags, revealed: true } };
}
const run = (s: GameState, secs: number, c: Content = C): GameState => { let x = s; for (let i = 0; i < secs; i++) x = model.tick(x, c, 1); return x; };

describe('M5 Chair: the Ministry is built', () => {
  test('createState with meta.office builds a fresh chair (first poll at firstTermYears) and the rival purse', () => {
    const s = ministry();
    expect(s.chair!.confidence).toBe(C.chair!.confidence.start);
    expect(s.chair!.parliament).toEqual({ index: 0, start: 0, pollAt: 10 / YEARS_PER_SECOND, offer: null, chosen: null });
    expect(s.chair!.rival.capital).toBeGreaterThan(0);
    expect(model.createState(C).chair).toBeUndefined(); // outside office: no Ministry
  });
});

describe('M5 Chair: Confidence', () => {
  test('the yearly update is exact: C ← C + r (C* − C), at each model-year boundary only', () => {
    let s = run(ministry(), 25); // past the first boundary at 20 s
    const fl = computeFlows(s, C);
    const target = confidenceParts(s, C, fl).target;
    const c0 = s.chair!.confidence;
    const mid = model.tick(s, C, 1);
    expect(mid.chair!.confidence).toBe(c0); // no boundary
    s = { ...s, time: 39.5 };
    const r = stepElections(s, { ...s, time: 40.5 }, C, computeFlows(s, C), 1950, false, false);
    expect(r.state.chair!.confidence).toBeCloseTo(c0 + 0.15 * (confidenceParts(s, C, computeFlows(s, C)).target - c0), 9);
    void target;
  });
  test('a crisis takes `crisis` off C at once', () => {
    const s = ministry();
    const next = { ...s, time: 0.5, events: [...(s.events ?? []), { seq: (s.meta.eventSeq ?? 0) + 1, kind: 'crisis' as const, time: 0.5, year: 1950, sector: 'motor', n: 1 }] };
    const r = stepElections(s, next, C, computeFlows(s, C), 1950, false, false);
    expect(r.state.chair!.confidence).toBeCloseTo(s.chair!.confidence + C.chair!.confidence.crisis, 9);
  });
  test('criterion 16 (E7): a charge popularity term is −3 per level on enactment and +1 after its years, exact', () => {
    let s = model.setLever(ministry(), C, 'motor.charge', 1);
    const def = C.levers!.find((l) => l.id === 'motor.charge')!;
    expect(popularityTerm(s, C, def)).toBe(-3);
    s = { ...s, time: s.time + 5 / YEARS_PER_SECOND };
    expect(popularityTerm(s, C, def)).toBeCloseTo(-1, 9);
    s = { ...s, time: s.time + 5 / YEARS_PER_SECOND };
    expect(popularityTerm(s, C, def)).toBeCloseTo(1, 9);
    s = { ...s, time: s.time + 50 / YEARS_PER_SECOND };
    expect(popularityTerm(s, C, def)).toBeCloseTo(1, 9);
    expect(popularityTerm(model.createState(C), C, def)).toBeNull(); // inert outside office
  });
});

describe('M5 Chair: the pledge offer and polling day', () => {
  test('the offer is drawn noticeYears before polling on a live step, in content order, deterministically, `when` respected', () => {
    let s = ministry();
    s = run(s, 139);
    expect(s.chair!.parliament.offer).toBeNull();
    s = run(s, 2);
    const offer = s.chair!.parliament.offer!;
    expect(offer.length).toBe(3);
    expect(offer).not.toContain('p.water');
    const order = C.pledges!.map((p) => p.id);
    expect(offer.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(offer);
    expect(drawOffer(s, C, 0, modsOf(s, C))).toEqual(offer);
    expect((s.events ?? []).some((e) => e.kind === 'electionCalled')).toBe(true);
    // Whips (pledgeOfferAdd 1): four offered
    const w = model.createState(C, officeMeta(C, { ...freshMeta(C), knowhow: { 'kh.whips': 1 } }), 7);
    expect(drawOffer(w, C, 0, modsOf(w, C)).length).toBe(4);
  });
  test('no offer is drawn inside fastForward (it waits for a live step)', () => {
    const s = run(ministry(), 100);
    const away = model.fastForward(s, C, 60);
    expect(away.chair!.parliament.offer).toBeNull();
  });
  test('choosePledges: exactly `keep` ids of the offer, content order; polling puts them in force and records them', () => {
    let s = run(ministry(), 141);
    const offer = s.chair!.parliament.offer!;
    expect(model.choosePledges(s, C, [offer[0]])).toBe(s);
    expect(model.choosePledges(s, C, [offer[0], 'nope'])).toBe(s);
    s = model.choosePledges(s, C, [offer[2], offer[1]]);
    expect(s.chair!.parliament.chosen).toEqual([offer[1], offer[2]]);
    expect(s.run.decisions).toBeGreaterThan(0);
    const m0 = s.mandate;
    s = run(s, 60);
    expect(s.chair!.parliament.index).toBe(1);
    expect(s.chair!.pledges).toEqual([offer[1], offer[2]]);
    for (const id of s.chair!.pledges) expect(s.meta.pledgesKept![id]).toBe(true);
    const won = (s.events ?? []).find((e) => e.kind === 'electionWon');
    if (won) { expect(s.chair!.electionsWon).toBe(1); expect(s.mandate).toBeGreaterThan(m0); }
    expect(s.chair!.parliament.pollAt).toBeCloseTo(200 + 15 / YEARS_PER_SECOND, 6);
  });
  test('a lost election: Opposition, the costliest lever repealed one level, raises refused; two lost → defeated', () => {
    let s = ministry();
    s = model.setLever(s, C, 'motor.duty', 2);
    s = model.setLever(s, C, 'motor.cap', 1);
    s = { ...s, chair: { ...s.chair!, confidence: 5, rival: { ...s.chair!.rival, answers: { 'motor.duty': { kind: 'comply', level: 2, t: 0, cost: 50, comply: 50 }, 'motor.cap': { kind: 'comply', level: 1, t: 0, cost: 10, comply: 10 } } } } };
    s = { ...s, time: 199.5 };
    const t = model.tick(s, C, 1);
    const ch = t.chair!;
    expect(ch.inOpposition).toBe(true);
    expect(ch.lostInARow).toBe(1);
    expect(t.levers['motor.duty'].level).toBe(1);
    expect(ch.repealed).toEqual([{ lever: 'motor.duty', parliament: 0 }]);
    expect((t.events ?? []).some((e) => e.kind === 'leverRepealed' && e.by === 'opposition')).toBe(true);
    expect(model.setLever(t, C, 'motor.cap', 2)).toBe(t); // no raise in Opposition
    expect(model.setLever(t, C, 'motor.cap', 0)).not.toBe(t); // lowering allowed
    // campaign only in Opposition
    expect(model.campaign(s, C, 10)).toBe(s);
    const camp = model.campaign(t, C, 100);
    expect(camp.chair!.confidence).toBeCloseTo(ch.confidence + 100 * C.chair!.confidence.campaignPerMandate, 9);
    // second loss → the Reckoning 'defeated'
    let u: GameState = { ...t, chair: { ...t.chair!, confidence: 0 }, time: t.chair!.parliament.pollAt - 0.5 };
    u = model.tick(u, C, 1);
    expect(model.derive(u, C).pendingReckoning?.cause).toBe('defeated');
    expect((u.events ?? []).some((e) => e.kind === 'ministryDefeated')).toBe(true);
    const r = model.reckon(u, C);
    expect(r.meta.lastRun!.cause).toBe('defeated');
    expect(r.meta.lastRun!.ministry!.lost).toBe(2);
    expect(r.meta.office!.ministries).toBe(2);
    expect(r.chair!.lostInARow).toBe(0); // a fresh Ministry
  });
  test('the Ratchet Clause (an Article) stops the repeal', () => {
    let s = model.createState(C, officeMeta(C, { ...freshMeta(C), articles: { 'art.ratchet': true } }), 7);
    s = { ...s, mandate: 10_000, flags: { ...s.flags, revealed: true } };
    s = model.setLever(s, C, 'motor.duty', 2);
    s = { ...s, chair: { ...s.chair!, confidence: 5 }, time: 199.5 };
    const t = model.tick(s, C, 1);
    expect(t.chair!.inOpposition).toBe(true);
    expect(t.levers['motor.duty'].level).toBe(2);
  });
  test('a pledge binds: setLever refuses a raise above its max (LeverView.bound names it)', () => {
    let s = ministry();
    s = { ...s, chair: { ...s.chair!, pledges: ['p.noDuty', 'p.noCharge'] } };
    expect(model.setLever(s, C, 'motor.duty', 1)).toBe(s);
    expect(model.setLever(s, C, 'plenty.charge', 1)).toBe(s);
    const v = model.leverViews(s, C).find((x) => x.def.id === 'motor.duty')!;
    expect(v.bound).toBe('No new taxes on motoring');
    expect(v.canRaise).toBe(false);
    expect(model.setLever(s, C, 'motor.cap', 1)).not.toBe(s);
  });
  test('fastForward holds one step before a polling day it would lose (heldBy election)', () => {
    let s = run(ministry(), 150);
    s = { ...s, chair: { ...s.chair!, confidence: 0 } };
    const r = model.fastForward(s, C, 3_600);
    expect(r.lastOffline!.heldBy).toBe('election');
    expect(r.chair!.parliament.index).toBe(0);
    expect(r.time).toBeLessThan(200);
  });
});

describe('M5 Chair: Hindsight in office', () => {
  test('the overlay and the parliaments term (perParliamentWon × electionsWon)', () => {
    const s = ministry();
    const t = { ...s, chair: { ...s.chair!, electionsWon: 3 } };
    expect(model.derive(t, C).hindsightTerms.parliaments).toBe(6);
    expect(model.derive(model.createState(C), C).hindsightTerms.parliaments).toBeUndefined();
  });
});
