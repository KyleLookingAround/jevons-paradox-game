// M4 tests 15–18: the Board's first survey and its reveal; the full account; years left; foresight (a run that does not
// start from a fresh world).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { YEARS_PER_SECOND } from '../types';
import type { GameState, MetaState } from '../types';
import { model } from './index';
import { fullAccount } from './account';
import { computeFlows } from './flows';
import { feedFactor } from './feeds';
import { fixtureM4Acts as CA } from './fixture';
import { modsOf } from './effects';
import { stepStock } from './renewable';
import { C4, D4, forceSettle, openWith, patch, run4 } from './m4.testkit';

const K = 100_000;
const fishAt = (q: number, extra: Partial<GameState> = {}) => patch(openWith(C4, ['fish'], ['fish.market'], undefined, extra), 'fish', { reserve: q * K, pressure: (1 - q) * 100 });
const est = (s: GameState): GameState => ({ ...s, meta: { ...s.meta, features: { ...(s.meta.features ?? {}), estimates: 0 } } });

describe("M4: the Board's first survey", () => {
  test('fires once per save at the first trigger (crises), with the reveal, the flag, the modifier and the follow-up', () => {
    let s = fishAt(0.8);
    s = model.tick(s, C4, 1);
    expect(s.meta.flags['survey:fish']).toBeUndefined();
    s = patch(s, 'fish', { crisesFired: 2 });
    s = model.tick(s, C4, 1);
    expect(s.meta.flags['survey:fish']).toBe(true);
    expect(s.modifiers.some((m) => m.source === 'survey:fish' && m.arm === 0)).toBe(true);
    const ev = s.events.filter((e) => e.kind === 'surveyed');
    expect(ev.map((e) => [e.sector, e.first, e.label])).toEqual([['fish', true, 'reveal']]);
    expect(s.surveyReveal).toMatchObject({ sector: 'fish', variant: 'small', followed: false });
    const r = D4(s).surveyReveal!;
    expect(r.headline).toBe(`Survey confirms the skippers: ${Math.round(s.surveyReveal!.reported * 100)}% against ${Math.round(s.surveyReveal!.true * 100)}%`);
    expect(s.news[0].key).toBe('surveyed');
    expect(model.derive(s, C4).modifiers.find((m) => m.source === 'survey:fish')!.label).toBe("The Board's survey");
    s = model.tick(s, C4, 1);
    expect(s.events.filter((e) => e.kind === 'surveyed').length).toBe(1); // no second 'surveyed'
    expect(s.surveyReveal!.followed).toBe(true);
    expect(s.news[0].text).toBe('Skippers dispute the survey');
    expect(D4(s).sectors.fish!.stock!.surveyed).toBe(true);
    // the modifier lapses after `years`; and never again in this save, even next run
    s = run4(s, 10 / YEARS_PER_SECOND + 2);
    expect(modsOf(s, C4).survey.has('fish')).toBe(false);
    expect(s.events.some((e) => e.kind === 'modifierEnded' && e.id === 'survey:fish')).toBe(true);
    const next = patch(openWith(C4, ['fish'], ['fish.market'], model.reckon(s, C4).meta), 'fish', { crisesFired: 3 });
    expect(model.tick(next, C4, 1).modifiers.some((m) => m.source === 'survey:fish')).toBe(false);
  });
  test('the second trigger (open for afterSeconds); never inside fastForward (it waits for the first live step)', () => {
    let s = patch(fishAt(0.8), 'fish', { openFor: 600 });
    const ff = model.fastForward(s, C4, 30);
    expect(ff.meta.flags['survey:fish']).toBeUndefined();
    s = model.tick(ff, C4, 1);
    expect(s.meta.flags['survey:fish']).toBe(true);
  });
  test("the reveal's variant: small under SURVEY_SMALL_GAP, large over it, failed once crossed", () => {
    const v = (q: number, crossed = false) => model.tick(patch(fishAt(q), 'fish', { crisesFired: 2, crossed }), C4, 1).surveyReveal!.variant;
    expect(v(0.8)).toBe('small');
    expect(v(0.45)).toBe('large');
    expect(v(0.45, true)).toBe('failed');
  });
  test("feature 'estimates' arrives with the survey flag (a live check)", () => {
    let s = patch(fishAt(0.8), 'fish', { crisesFired: 2 });
    s = run4(s, 12);
    expect(s.meta.features?.estimates).toBeDefined();
    expect(model.derive(s, C4).features.estimates).toBe(true);
  });
});

describe('M4: the full account', () => {
  const build = (settleIron = false) => {
    let s = openWith(C4, ['iron', 'fish', 'light'], ['steam.pumping', 'steam.mills', 'iron.rails', 'iron.girders', 'fish.market']);
    s = run4(s, 3);
    if (settleIron) s = forceSettle(s, C4, 'iron');
    return est(s);
  };
  test('Σ fullR = Σ R to 1e-9 with feeds, drawsOn and a settled source; embodied lists what was received', () => {
    for (const settled of [false, true]) {
      const s = build(settled);
      const d = D4(s);
      let a = 0, b = 0;
      for (const id of C4.sectorOrder) { const x = d.sectors[id]; if (x) { a += x.resourceUse; b += x.fullR!; } }
      expect(Math.abs(a - b)).toBeLessThan(1e-9 * Math.max(1, a));
      expect(d.sectors.fish!.embodied!.map((e) => e.from)).toEqual(['steam', 'iron']); // sectorOrder
      expect(d.sectors.steam!.embodied!.map((e) => e.from)).toEqual(['iron']);
      expect(d.sectors.fish!.fullR!).toBeGreaterThan(d.sectors.fish!.resourceUse);
    }
    const off = { ...build(), meta: { ...build().meta, features: {} } };
    expect(D4(off).sectors.steam!.fullR).toBeNull();
    expect(D4(off).sectors.steam!.embodied).toBeNull();
  });
  test("a line drawn while 'estimates' is on is 'full' (r0 = fullR) and its tests read fullR; earlier lines keep 'own'", () => {
    const s = build();
    const acct = fullAccount(s, C4, computeFlows(s, C4));
    const drawn = model.drawBudget(s, C4, 'steam');
    expect(drawn.sectors.steam.budget!.account).toBe('full');
    expect(drawn.sectors.steam.budget!.r0).toBeCloseTo(acct.fullR.steam, 9);
    const own = model.drawBudget({ ...s, meta: { ...s.meta, features: {} } }, C4, 'steam');
    expect(own.sectors.steam.budget!.account).toBeUndefined();
    const R = D4(s).sectors.steam!.resourceUse, F = acct.fullR.steam;
    expect(F).not.toBeCloseTo(R, 3);
    const between = Math.min(R, F) + Math.abs(F - R) / 2;
    const line = (account?: 'full') => patch(s, 'steam', { budget: { r0: between, since: s.time, drawnYear: 1800, w0: 0, p0: 0, pace: 'gentle', ...(account ? { account } : {}) } });
    expect(D4(line('full')).sectors.steam!.withinBudget).toBe(F <= between);
    expect(D4(line()).sectors.steam!.withinBudget).toBe(R <= between);
  });
  test("a cap on a 'full' line prices own R only: own R ≤ capR − received", () => {
    const s = build();
    const acct = fullAccount(s, C4, computeFlows(s, C4));
    const recv = acct.embodied.steam.reduce((x, e) => x + e.R, 0);
    const lined = { ...patch(s, 'steam', { budget: { r0: 1e4, since: s.time, drawnYear: 1800, w0: 0, p0: 0, pace: 'gentle', account: 'full' } }), levers: { ...s.levers, 'steam.cap': { level: 1, ref: 0 } } };
    expect(computeFlows(lined, C4).inputs.steam.capR).toBeCloseTo(1.0 * 1e4 - recv, 6);
  });
});

describe('M4: years left', () => {
  test('flat from secondsLeft; growing = ln(1 + g × flat) / g < flat when the trend is positive, equal when not; null while estimates is off', () => {
    const s = est(openWith(C4, ['iron'], ['steam.pumping', 'steam.mills', 'iron.pots']));
    const g = 0.05;
    const up = patch(s, 'steam', { trendR: g });
    const d = D4(up).sectors.steam!;
    expect(d.yearsLeft!.flat).toBeCloseTo(d.secondsLeft * YEARS_PER_SECOND, 9);
    expect(d.yearsLeft!.growing).toBeCloseTo(Math.log(1 + g * d.yearsLeft!.flat!) / g, 9);
    expect(d.yearsLeft!.growing!).toBeLessThan(d.yearsLeft!.flat!);
    expect(D4(up).sectors.iron!.yearsLeft).toEqual(d.yearsLeft); // a drawer reads its owner's
    const flat = D4(patch(s, 'steam', { trendR: -0.1 })).sectors.steam!.yearsLeft!;
    expect(flat.growing).toBe(flat.flat);
    expect(D4({ ...up, meta: { ...up.meta, features: {} } }).sectors.steam!.yearsLeft!.growing).toBeNull();
    expect(D4(up).sectors.light).toBeUndefined();
  });
});

describe('M4: foresight (no rule assumes a run starts from a fresh world)', () => {
  test('a hand-built inherited run (a capstone, a scar, a non-full reserve, population 5) keeps every M4 rule', () => {
    // a capstone record and a scar, as a later act would inherit them
    const rec = { since: 0, sinceYear: 1880, D: 50, R: 40, ps: 0.5, pPre: 0.4, income: 10, P: 20, eta: 2, defect: 1, N0: 10, spillMul0: 1, extraD0: 0, appD: { 'light.lamps': 50 }, appAdoption: { 'light.lamps': 0.5 } };
    const m0 = model.createState(CA).meta;
    const meta: MetaState = { ...m0, reckonings: 3, features: { estimates: 0 }, world: { capstone: { light: { act: 'actOne', year: 1880, settled: rec } }, scars: { fish: { yearsLeft: 5, since: 0 } } } };
    let s = openWith(CA, ['iron', 'fish'], ['steam.pumping', 'steam.mills', 'iron.rails', 'iron.girders', 'fish.market', 'fish.trawlers'], meta);
    s = { ...s, population: 5 };
    s = patch(s, 'steam', { reserve: 0.6 * s.sectors.steam.reserveMax });
    expect(s.sectors.light.capstoned).toBe(true);
    expect(Math.abs(s.sectors.fish.reserve / K - 0.4)).toBeLessThan(1e-4); // scarred start, not K
    const fl = computeFlows(s, CA);
    // capstone per head at N = 5 against N0 = 10
    expect(fl.sectors.light.D).toBeCloseTo(25, 9);
    expect(fl.sectors.light.income).toBeCloseTo(10 * 0.5 * 0.25, 9);
    // feeds from adoption, not from run time
    const ia = (i: number) => fl.sectors.iron.appD[i] / fl.sectors.iron.appSat[i];
    expect(fl.inputs.steam.feedMul).toBeCloseTo(feedFactor(0.8, ia(0)) * feedFactor(0.9, ia(1)), 12);
    // the shared reserve and the scarred stock step from where they stand
    const s1 = model.tick(s, CA, 1);
    expect(s1.sectors.steam.reserve).toBeCloseTo(s.sectors.steam.reserve - (fl.sectors.steam.R - fl.sectors.steam.reserveGain + fl.sectors.iron.R), 6);
    expect(s1.sectors.fish.reserve).toBeCloseTo(stepStock(CA.sectors.fish.renewable!, K, s.sectors.fish.reserve, fl.sectors.fish.R, 0, fl.sectors.fish.ren!.rForeign, 0.5, 1), 6);
    expect(s1.meta.world!.scars!.fish.yearsLeft).toBeCloseTo(s.meta.world!.scars!.fish.yearsLeft - YEARS_PER_SECOND, 9);
    // the account conserves
    const d = model.derive(s1, CA);
    let a = 0, b = 0;
    for (const id of CA.sectorOrder) { const x = d.sectors[id]; if (x) { a += x.resourceUse; b += x.fullR!; } }
    expect(Math.abs(a - b)).toBeLessThan(1e-9 * a);
    // an hour on, nothing breaks
    const later = run4(s1, 600, CA, 5);
    expect(Number.isFinite(later.capital) && Number.isFinite(later.sectors.fish.reserve)).toBe(true);
  });
  test('an unknown ReckoningCause in a save does not throw', () => {
    const s = model.createState(C4);
    const raw = JSON.parse(model.serialize(s));
    raw.meta.lastRun = { cause: 'generation', seconds: 100, yearReached: 1800, hindsightGained: 3, peakWellbeing: 10, sectors: {} };
    raw.meta.runs = [raw.meta.lastRun];
    const back = model.deserialize(JSON.stringify(raw), C4)!;
    expect(back).not.toBeNull();
    expect(back.meta.lastRun!.cause as string).toBe('generation');
    expect(() => model.derive(back, C4)).not.toThrow();
  });
});
