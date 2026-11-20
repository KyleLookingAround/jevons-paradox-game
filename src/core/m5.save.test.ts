// M5 (Core B): save version 6 (types.ts SAVE_VERSION, v5 → v6): round trip, refusal of v7, the M4 fixtures, the
// invitation on migration, validation of the M5 fields.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
// @ts-ignore — node types are not installed
import { readdirSync, readFileSync } from 'node:fs';
import { SAVE_VERSION } from '../types';
import type { Content, GameState } from '../types';
import { model } from './index';
import { freshMeta } from './state';
import { content as REAL } from '../content';
import { fixtureM4Acts, M5_CHAIR, M5_RIVAL, fixtureM5 } from './fixture';
import { fixtureM5B, officeMeta } from './fixture.m5b';

const C = fixtureM5B;
const ministry = (): GameState => {
  const s = model.createState(C, officeMeta(C, { ...freshMeta(C), articles: { 'art.ratchet': true }, playbooks: ['pb.selfReport'], precedent: 2, precedentEarned: 5, treaties: 1, pledgesKept: { 'p.roads': true }, institutions: {} }), 7);
  return { ...s, mandate: 5000, flags: { ...s.flags, revealed: true } };
};
const run = (s: GameState, n: number): GameState => { let x = s; for (let i = 0; i < n; i++) x = model.tick(x, C, 1); return x; };

describe('M5: save version 6', () => {
  test('SAVE_VERSION is 6; a v7 save is refused', () => {
    expect(SAVE_VERSION).toBe(6);
    const s = ministry();
    expect(model.deserialize(JSON.stringify({ ...JSON.parse(model.serialize(s)), version: 7 }), C)).toBeNull();
  });
  test('a v6 round trip of a Ministry mid-Parliament (offer, pledges, levers, answers, Articles, office) is lossless', () => {
    let s = model.setLever(ministry(), C, 'motor.charge', 1);
    s = run(s, 260);
    s = { ...s, meta: { ...s.meta, institutions: { 'x.unknown': 2 } } };
    const text = model.serialize(s);
    const back = model.deserialize(text, C)!;
    expect(back).not.toBeNull();
    const again = JSON.parse(model.serialize(back));
    const want = JSON.parse(text);
    delete want.meta.institutions['x.unknown'];
    expect(again).toEqual(want);
    expect(back.chair!.parliament.index).toBe(1);
    expect(back.levers['motor.charge'].since).toBe(s.levers['motor.charge'].since);
  });
  test('validation: a broken chair is rebuilt fresh; unknown ids dropped; an Institution at level 0 is kept', () => {
    const s = ministry();
    const raw = JSON.parse(model.serialize(s));
    raw.meta.institutions = { 'inst.none': 0 };
    raw.meta.articles = { 'art.ratchet': true, 'art.nope': true };
    raw.meta.playbooks = ['pb.selfReport', 'pb.nope'];
    raw.chair = { confidence: 'x' };
    const back = model.deserialize(JSON.stringify(raw), C)!;
    expect(back.meta.articles).toEqual({ 'art.ratchet': true });
    expect(back.meta.playbooks).toEqual(['pb.selfReport']);
    expect(back.chair!.confidence).toBe(C.chair!.confidence.start);
    const raw2 = JSON.parse(model.serialize(s));
    raw2.chair.confidence = 500;
    raw2.chair.pledges = ['p.roads', 'p.gone'];
    raw2.chair.rival.answers = { 'motor.duty': { kind: 'lobby', level: 1, t: 3, cost: 4, comply: 5 }, 'gone.lever': { kind: 'comply', level: 1, t: 0, cost: 0 } };
    const b2 = model.deserialize(JSON.stringify(raw2), C)!;
    expect(b2.chair!.confidence).toBe(100);
    expect(b2.chair!.pledges).toEqual(['p.roads']);
    expect(Object.keys(b2.chair!.rival.answers)).toEqual(['motor.duty']);
    // Institutions at level 0 survive (fixture with an Institution)
    const ci: Content = { ...C, institutions: [{ id: 'inst.b', name: 'B', blurb: '', cost: 3, effects: [] } as never] };
    const si = { ...model.createState(ci), meta: { ...model.createState(ci).meta, institutions: { 'inst.b': 0 } } };
    expect(model.deserialize(model.serialize(si), ci)!.meta.institutions).toEqual({ 'inst.b': 0 });
  });
  test('criterion 23: every fixtures/m4 and fixtures/m3 save loads with office not taken, and plays on', () => {
    for (const dir of ['fixtures/m4', 'fixtures/m3']) {
      for (const f of readdirSync(dir) as string[]) {
        const s = model.deserialize(readFileSync(`${dir}/${f}`, 'utf8'), REAL)!;
        expect(s).not.toBeNull();
        expect(s.version).toBe(6);
        expect(s.meta.office).toBeUndefined();
        expect(s.chair ?? null).toBeNull();
        const t = model.tick(s, REAL, 2);
        expect(t.time >= s.time).toBe(true);
      }
    }
  });
  test('v5 → v6 step 6: a fresh run after an Act I ending run with Motion is offered office', () => {
    const CA: Content = { ...fixtureM4Acts, office: { ...fixtureM5.office!, when: { ending: 'actOne' } }, chair: M5_CHAIR, rival: M5_RIVAL };
    const s0 = model.createState(CA);
    const meta = { ...s0.meta, reckonings: 2, endings: { actOne: { year: 1900, run: 2, runSeconds: 100, totalSeconds: 200 } } as never,
      lastRun: { cause: 'chosen', seconds: 10, yearReached: 1900, hindsightGained: 1, peakWellbeing: 1, sectors: { motion: { etaFold: 1, peakRFold: 1, resourceUsed: 5, decades: 0 } } } as never };
    const raw = { ...JSON.parse(model.serialize({ ...s0, meta })), version: 5 };
    delete raw.officeOffer; delete raw.chair;
    const back = model.deserialize(JSON.stringify(raw), CA)!;
    expect(back.officeOffer).toBe(true);
    const noMotion = { ...raw, meta: { ...raw.meta, lastRun: { ...raw.meta.lastRun, sectors: {} } } };
    expect(model.deserialize(JSON.stringify(noMotion), CA)!.officeOffer).toBeUndefined();
    // and Take office works on the migrated save
    expect(model.takeOffice(back, CA).meta.office).toBeTruthy();
  });
});
