// M2 mechanism tests (1–5 of briefs/m2-core.md): decades against the drawn day, clear skies and the sink line, paces,
// decade dividends, settlement. Fixture only.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { STEADY_STATE_YEARS, PENDING_DIVIDENDS_MAX } from '../types';
import type { BudgetState, Content, GameState } from '../types';
import { model } from './index';
import { fixture as C } from './fixture';
import { CALM, D, decoupling, patchSector, rich, run, steamD, steamAt, count, openAll } from './m1.testkit';

const budget = (s: GameState, r0: number, w0: number, extra: Partial<BudgetState> = {}): BudgetState =>
  ({ r0, since: s.time, drawnYear: 1800, w0, p0: 0, pace: 'gentle', ...extra });
const withTarget = (c: Content, target: number): Content =>
  ({ ...c, global: { ...c.global, wellbeingTarget: target, demography: { transitionWellbeing: target + 20 } } });
const ev = (s: GameState, kind: string) => s.events.filter((e) => e.kind === kind);
/** CALM with a reserve that lasts (the decoupling state otherwise exhausts Steam in about five minutes). */
const LONG: Content = { ...CALM, sectors: { ...CALM.sectors, steam: { ...CALM.sectors.steam, reserve: 1e10 } } };

/* ---------------- 1. decades against the drawn day ---------------- */

describe('M2 decades against the drawn day', () => {
  test('a line drawn below the target earns lean decades while W ≥ 0.95 w0; with decadeWellbeing target it does not', () => {
    const s0 = decoupling(LONG);
    const W = D(s0, LONG).wellbeing;
    const HI = withTarget(LONG, W + 6); // W is now below the target
    let s = patchSector(s0, 'steam', { budget: budget(s0, 10 * steamD(s0, LONG).resourceUse, W) });
    const sd = D(s, HI).sectors.steam!;
    expect(sd.decadeWellbeing).toBeCloseTo(W * 0.95, 9);
    expect(sd.decoupling).toBe(true);
    s = run(s, 200, HI);
    expect(s.sectors.steam.decadesWithin.length).toBe(1);
    expect(s.sectors.steam.decadesLean).toEqual([true]);
    expect(s.run.leanDecades).toBe(1);
    expect(ev(s, 'decade')[0]).toMatchObject({ sector: 'steam', n: 1, id: 'lean' });
    // Hindsight: a lean decade pays perLeanDecade (0 by default), a full one perBudgetDecade
    expect(D(s, HI).hindsightTerms.budget).toBe(0);
    const PAY: Content = { ...HI, global: { ...HI.global, hindsight: { ...HI.global.hindsight, perLeanDecade: 2 } } };
    expect(D(s, PAY).hindsightTerms.budget).toBe(2);
    // 'target': the same line earns nothing
    const TGT: Content = { ...HI, global: { ...HI.global, steady: { ...HI.global.steady!, decadeWellbeing: 'target' } } };
    const t = run(patchSector(s0, 'steam', { budget: budget(s0, 10 * steamD(s0, LONG).resourceUse, W) }), 200, TGT);
    expect(D(t, TGT).sectors.steam!.decoupling).toBe(false);
    expect(t.sectors.steam.decadesWithin.length).toBe(0);
  });
  test('a full decade at the target pays perBudgetDecade; one dip below the target makes the window lean', () => {
    const s0 = decoupling(LONG);
    const W = D(s0, LONG).wellbeing;
    const line = budget(s0, 10 * steamD(s0, LONG).resourceUse, W);
    const full = run(patchSector(s0, 'steam', { budget: line }), 200, LONG);
    expect(full.sectors.steam.decadesLean).toEqual([false]);
    expect(D(full, LONG).hindsightTerms.budget).toBe(C.global.hindsight.perBudgetDecade);
    // one step judged against a higher target (W below it, but above 0.95 w0), then back at the normal target
    let s = model.tick(patchSector(s0, 'steam', { budget: line }), withTarget(LONG, W + 1), 1);
    expect(s.sectors.steam.windowLean).toBe(true);
    s = run(s, 199, LONG);
    expect(s.sectors.steam.decadesLean).toEqual([true]);
    expect(s.sectors.steam.windowLean).toBe(false);
  });
});

/* ---------------- 2. clear skies and the sink line ---------------- */

describe('M2 clear skies and the sink line', () => {
  test('clearP is clamped by the floor and the ceiling', () => {
    const s0 = run(steamAt(3, { flags: { revealed: true, won: false } }), 2);
    const at = (p0: number) => D(patchSector(s0, 'steam', { budget: budget(s0, 1e6, 30, { p0 }) })).sectors.steam!.clearP;
    expect(at(10)).toBeCloseTo(5, 12);   // 0.5 × p0
    expect(at(2)).toBeCloseTo(3, 12);    // floor 0.03 × collapseAt 100
    expect(at(80)).toBeCloseTo(25, 12);  // ceiling 0.25 × collapseAt
    // Motion overrides clearBelow 0.4 and clearCeiling 0.2 (collapseAt 100)
    const o = openAll();
    const m = (p0: number) => D(patchSector(o, 'motion', { budget: budget(o, 1e9, 30, { p0 }) })).sectors.motion!.clearP;
    expect(m(10)).toBeCloseTo(4, 12);
    expect(m(90)).toBeCloseTo(20, 12);
    expect(D(s0).sectors.steam!.clearP).toBeNull();
  });
  test('clear is false while pressure rises, even below clearP; sinkR is the R whose equilibrium is clearP', () => {
    const s0 = run(steamAt(3, { flags: { revealed: true, won: false } }), 2);
    const s = patchSector(s0, 'steam', { budget: budget(s0, 1e6, 30, { p0: 40 }), pressure: 0 });
    const sd = D(s).sectors.steam!;
    expect(sd.clearP).toBeCloseTo(20, 12);
    expect(sd.clear).toBe(false); // P = 0 < clearP but rising
    expect(sd.sinkR).not.toBeNull();
    // integrate the step's pressure update at constant R = sinkR: it converges to clearP (within 1%)
    const def = C.sectors.steam;
    const pin = def.pressureIntensity * sd.sinkR!;
    let P = 0;
    for (let i = 0; i < 5000; i++) P = P * Math.exp(-def.absorption) + pin;
    expect(Math.abs(P / sd.clearP! - 1)).toBeLessThan(0.01);
    // at its own equilibrium below clearP the sector is clear
    const LOW: Content = { ...C, sectors: { ...C.sectors, steam: { ...def, pressureIntensity: 0.0001 } } };
    const eqP = 0.0001 * sd.resourceUse / def.absorption;
    const s2 = patchSector(s, 'steam', { budget: budget(s0, 1e6, 30, { p0: 2.2 * eqP }), pressure: eqP });
    expect(D(s2, LOW).sectors.steam!.clearP).toBeGreaterThan(eqP);
    expect(D(s2, LOW).sectors.steam!.clear).toBe(true);
  });
  test('Code: sinkR is null (absorption 0); deletion can make it clear', () => {
    let s = openAll();
    s = patchSector(s, 'code', { budget: budget(s, 1e9, 30, { p0: 0 }), pressure: 5 });
    let cd = D(s).sectors.code!;
    expect(cd.sinkR).toBeNull();
    expect(cd.clear).toBe(false);
    // shut most demand down and delete hard: out-flow exceeds in-flow
    const apps = { ...s.sectors.code.apps };
    for (const k of Object.keys(apps)) apps[k] = { ...apps[k], founded: false };
    s = patchSector(s, 'code', { apps });
    s = { ...s, levers: { ...s.levers, 'code.deletion': { level: 2, ref: 0 } } };
    cd = D(s).sectors.code!;
    expect(cd.clear).toBe(true);
    expect(cd.sinkR).toBeNull();
  });
  test('Steady State needs 50 years of sinkHeld; a held line without clear skies never gets it', () => {
    let s = decoupling(LONG); // no pressure in Steam, so clear from the start
    expect(steamD(s, LONG).sinkHeld).toBe(true);
    s = run(s, 980, LONG);
    expect(s.run.steadySectors.steam).toBeUndefined();
    s = run(s, 40, LONG);
    expect(s.run.steadySectors.steam).toBe(true);
    expect(ev(s, 'steadyState').length).toBe(1);
    // the same line in smoky Steam: decades yes, Steady State no
    const SMOKY: Content = { ...C, sectors: { ...C.sectors, steam: { ...C.sectors.steam, reserve: 1e10 } } };
    const smoky = { ...decoupling(LONG), mandate: 1e6 };
    const t = run(smoky, 1100, SMOKY);
    expect(t.sectors.steam.steadyYears + t.sectors.steam.decadesWithin.length).toBeGreaterThan(0);
    expect(t.run.steadySectors.steam).toBeUndefined();
    expect(t.sectors.steam.clearYears).toBe(0);
  });
  test('clearSkies fires once per line; a redraw resets clearYears and starts a new line', () => {
    let s = run(decoupling(), 20, CALM);
    expect(count(s, 'clearSkies')).toBe(1);
    expect(ev(s, 'clearSkies').length).toBe(1);
    expect(s.sectors.steam.budget!.clearAt).toBeDefined();
    expect(s.sectors.steam.clearYears).toBeGreaterThan(0);
    s = run(s, 20, CALM);
    expect(count(s, 'clearSkies')).toBe(1);
    s = model.drawBudget(rich(s), CALM, 'steam');
    expect(s.sectors.steam.clearYears).toBe(0);
    expect(s.sectors.steam.budget!.clearAt).toBeUndefined();
    s = run(s, 2, CALM);
    expect(count(s, 'clearSkies')).toBe(2);
  });
});

/* ---------------- 3. paces ---------------- */

describe('M2 paces', () => {
  test('severe declines at its own rate; an unknown pace is refused', () => {
    const s = rich(run(steamAt(3), 2));
    expect(model.drawBudget(s, C, 'steam', 'nope')).toBe(s);
    const sev = model.drawBudget(s, C, 'steam', 'severe');
    expect(sev.sectors.steam.budget!.pace).toBe('severe');
    expect(D(sev).sectors.steam!.pace).toBe('severe');
    const r0 = sev.sectors.steam.budget!.r0;
    const later = { ...sev, time: sev.time + 200 };
    expect(D(later).sectors.steam!.budgetR!).toBeCloseTo(r0 * 0.8, 9);
    expect(ev(sev, 'budgetDrawn').pop()).toMatchObject({ sector: 'steam', id: 'severe', by: 'player' });
  });
  test('dividendMul scales the decade one-offs and the chosen dividend, not standing effects', () => {
    const s0 = decoupling();
    const R = steamD(s0, CALM).resourceUse;
    const at = (pace: string) => {
      const s = patchSector({ ...s0, mandate: 0 }, 'steam', { budget: budget(s0, 10 * R, 1e3, { pace }), steadyYears: 9.99 });
      const t = model.tick(s, CALM, 1);
      return { t, dm: t.mandate - D(s, CALM).mandatePerSec, dw: D(t, CALM).wellbeing - D(s, CALM).wellbeing };
    };
    const g = at('gentle'), v = at('severe');
    expect(g.dm).toBeCloseTo(50, 3);
    expect(v.dm).toBeCloseTo(125, 3);
    expect(v.dw).toBeCloseTo(g.dw, 6); // the standing wellbeingAdd is not scaled
    expect(v.t.pendingDividends[0]).toMatchObject({ sector: 'steam', decade: 1, options: ['div.mandate', 'div.capital'], mul: 2.5 });
    const chosen = model.chooseDecadeDividend(v.t, CALM, 'steam', 0);
    expect(chosen.mandate - v.t.mandate).toBeCloseTo(100, 9);
  });
  test('lines a lever raise or a standing cap draws take the first pace', () => {
    const s = rich(run(steamAt(3), 2));
    const l = model.setLever(s, C, 'steam.duty', 1);
    expect(l.sectors.steam.budget!.pace).toBe('gentle');
    expect(l.run.firstBudgetAt).toBe(s.time);
    const meta = { ...model.createState(C).meta, institutions: { 'inst.capStanding': 1 }, loadout: ['inst.capStanding'] };
    let c = { ...steamAt(3, { meta }), levers: { ...model.createState(C, meta).levers } };
    c = run(c, 3);
    expect(c.sectors.steam.budget!.pace).toBe('gentle');
    expect(c.sectors.steam.budget!.w0).toBeGreaterThan(0);
    expect(c.run.firstBudgetAt).toBeNull();
    expect(ev(c, 'budgetDrawn')[0]).toMatchObject({ by: 'default' });
  });
});

/* ---------------- 4. dividends ---------------- */

describe('M2 decade dividends', () => {
  const decadeAt = (s: GameState, n: number, sector = 'steam', c: Content = CALM): GameState =>
    model.tick(patchSector(s, sector, { steadyYears: n * 10 - 0.01 }), c, 1);
  const lined = (): GameState => {
    const s0 = decoupling();
    return patchSector(s0, 'steam', { budget: budget(s0, 10 * steamD(s0, CALM).resourceUse, 1e3) });
  };
  test('pairs come in order (n − 1) mod length; a sector override wins', () => {
    let s = lined();
    s = decadeAt(s, 1); s = decadeAt(s, 2); s = decadeAt(s, 3);
    expect(s.pendingDividends.map((p) => p.options)).toEqual([['div.mandate', 'div.capital'], ['div.wellbeing', 'div.efficiency'], ['div.mandate', 'div.capital']]);
    expect(s.pendingDividends.map((p) => p.decade)).toEqual([1, 2, 3]);
    // Light's override
    const LCALM: Content = { ...CALM, sectors: { ...CALM.sectors, light: { ...CALM.sectors.light, pressureIntensity: 0 } } };
    let o = openAll(LCALM);
    o = patchSector(o, 'light', { budget: budget(o, 1e9, 1e3) });
    o = { ...o, pendingDividends: [] };
    o = decadeAt(o, 1, 'light', LCALM);
    expect(o.pendingDividends.find((p) => p.sector === 'light')?.options).toEqual(['div.wellbeing', 'div.efficiency']);
  });
  test('choose resolves the oldest offer of that sector; standing effects count once per choice', () => {
    let s = lined();
    s = decadeAt(s, 1); s = decadeAt(s, 2); s = decadeAt(s, 3); s = decadeAt(s, 4);
    expect(model.chooseDecadeDividend(s, CALM, 'light', 0)).toBe(s);
    expect(model.chooseDecadeDividend(s, CALM, 'steam', 2)).toBe(s);
    const w0 = D(s, CALM).wellbeing;
    let t = model.chooseDecadeDividend(s, CALM, 'steam', 1); // decade 1: div.capital
    expect(t.sectors.steam.dividends).toEqual(['div.capital']);
    expect(t.pendingDividends.map((p) => p.decade)).toEqual([2, 3, 4]);
    expect(ev(t, 'dividendChosen').pop()).toMatchObject({ sector: 'steam', id: 'div.capital', n: 1, by: 'player' });
    t = model.chooseDecadeDividend(t, CALM, 'steam', 0); // decade 2: div.wellbeing
    expect(D(t, CALM).wellbeing).toBeCloseTo(w0 + 1, 6);
    t = model.chooseDecadeDividend(t, CALM, 'steam', 1); // decade 3: div.capital
    t = model.chooseDecadeDividend(t, CALM, 'steam', 0); // decade 4: div.wellbeing again
    expect(D(t, CALM).wellbeing).toBeCloseTo(w0 + 2, 6);
    expect(t.run.decisions).toBe(s.run.decisions + 4);
  });
  test('overflow resolves the oldest as option 0 by default; a Reckoning discards the offers', () => {
    let s = lined();
    for (let n = 1; n <= PENDING_DIVIDENDS_MAX; n++) s = decadeAt(s, n);
    expect(s.pendingDividends.length).toBe(PENDING_DIVIDENDS_MAX);
    const m = s.mandate;
    s = decadeAt(s, PENDING_DIVIDENDS_MAX + 1);
    expect(s.pendingDividends.length).toBe(PENDING_DIVIDENDS_MAX);
    expect(s.pendingDividends[0].decade).toBe(2);
    expect(s.sectors.steam.dividends).toEqual(['div.mandate']);
    expect(ev(s, 'dividendChosen').pop()).toMatchObject({ id: 'div.mandate', n: 1, by: 'default' });
    expect(s.mandate - m).toBeGreaterThan(40 + 50 - 1);
    expect(model.reckon(s, CALM).pendingDividends).toEqual([]);
  });
});

/* ---------------- 5. settlement ---------------- */

describe('M2 settlement', () => {
  const steady = (c: Content = CALM): GameState => {
    let s = decoupling(c);
    s = patchSector(s, 'steam', { budget: budget(s, 10 * steamD(s, c).resourceUse, 1e3), clearYears: STEADY_STATE_YEARS - 0.01, steadyYears: STEADY_STATE_YEARS - 0.01 });
    s = model.tick(s, c, 1);
    expect(s.run.steadySectors.steam).toBe(true);
    return { ...s, mandate: 1000 };
  };
  test('refused before Steady State, without settle, when not clear', () => {
    const early = decoupling();
    expect(steamD(early, CALM).canSettle).toBe(false);
    expect(model.settle(early, CALM, 'steam')).toBe(early);
    const s = steady();
    expect(steamD(s, CALM).canSettle).toBe(true);
    const NOSETTLE: Content = { ...CALM, sectors: { ...CALM.sectors, steam: { ...CALM.sectors.steam, settle: undefined } } };
    expect(model.settle(s, NOSETTLE, 'steam')).toBe(s);
    // not clear: pressure above clearP
    const murky = patchSector(s, 'steam', { pressure: 50 });
    expect(steamD(murky, CALM).clear).toBe(false);
    expect(model.settle(murky, CALM, 'steam')).toBe(murky);
  });
  test('levers go to 0, their upkeep stops; the frozen flows hold for an hour; one-offs once per run', () => {
    let s = steady();
    s = { ...s, levers: { ...s.levers, 'steam.sufficiency': { level: 1, ref: 0 } } };
    const before = D(s, CALM);
    const set = model.settle(s, CALM, 'steam');
    expect(set.levers['steam.sufficiency'].level).toBe(0);
    expect(set.sectors.steam.settled).not.toBeNull();
    expect(set.mandate - s.mandate).toBeCloseTo(30, 9); // settle.dividend one-off
    expect(D(set, CALM).wellbeing).toBeCloseTo(before.wellbeing + 1, 6); // standing wellbeingAdd 1
    expect(ev(set, 'settled').pop()).toMatchObject({ sector: 'steam', by: 'player' });
    const sd = steamD(set, CALM);
    expect(sd.settled).toBe(true);
    expect(sd.clear).toBe(true);
    expect(sd.sinkHeld).toBe(false);
    expect(sd.sinkR).toBeNull();
    expect(model.leverViews(set, CALM).filter((l) => l.def.sector === 'steam').every((l) => !l.visible)).toBe(true);
    expect(model.upgradeViews(set, CALM).filter((u) => u.def.sector === 'steam').every((u) => !u.visible)).toBe(true);
    const later = run({ ...set, mandate: 1e6 }, 3600, CALM);
    const a = later.sectors.steam, b = set.sectors.steam;
    expect(a.settled).toEqual(b.settled);
    expect(steamD(later, CALM).resourceUse).toBe(sd.resourceUse);
    expect(steamD(later, CALM).demand).toBe(sd.demand);
    expect(a.pressure).toBe(b.pressure);
    expect(a.reserve).toBe(b.reserve);
    expect(a.clearYears).toBe(b.clearYears);
    expect(later.run.resourceUsed.steam).toBeGreaterThan(set.run.resourceUsed.steam);
    // unsettle: streaks reset, heldAt kept; settle again: no second one-off
    const un = model.unsettle(set, CALM, 'steam');
    expect(un.sectors.steam.settled).toBeNull();
    expect(un.sectors.steam.clearYears).toBe(0);
    expect(un.sectors.steam.steadyYears).toBe(0);
    expect(un.sectors.steam.budget!.heldAt).toBe(set.sectors.steam.budget!.heldAt);
    expect(ev(un, 'unsettled').pop()).toMatchObject({ by: 'player' });
    const again = patchSector(un, 'steam', { clearYears: STEADY_STATE_YEARS });
    const re = model.settle(again, CALM, 'steam');
    expect(re.sectors.steam.settled).not.toBeNull();
    expect(re.mandate).toBeCloseTo(again.mandate, 9);
  });
  test('population growth raises the excess and the defence; Mandate exhaustion drops levers first, then unsettles', () => {
    const set = model.settle(steady(), CALM, 'steam');
    expect(steamD(set, CALM).settleExcess).toBe(0);
    const grown = { ...set, population: set.population * 2 };
    const sd = steamD(grown, CALM);
    expect(sd.settleExcess).toBeCloseTo(1, 9);
    expect(sd.settleDefence).toBeCloseTo(2 * (1 - 0.05), 9);
    // a large defence and a small lever elsewhere, no Mandate left: the lever lapses first, then Steam unsettles
    const HEAVY: Content = { ...CALM, sectors: { ...CALM.sectors, steam: { ...CALM.sectors.steam, settle: { ...CALM.sectors.steam.settle!, upkeepPerSpill: 1e4 } } } };
    let o: GameState = { ...grown, mandate: 0, levers: { ...grown.levers, 'code.reviewGate': { level: 1, ref: 0 } } };
    o = model.tick(o, HEAVY, 1);
    expect(o.levers['code.reviewGate'].level).toBe(0);
    expect(o.sectors.steam.settled).toBeNull();
    expect(ev(o, 'unsettled').pop()).toMatchObject({ sector: 'steam', by: 'default' });
    // a defence Mandate can carry: nothing unsettles
    const light: GameState = { ...set, population: set.population * 1.2, mandate: 0 };
    expect(steamD(light, CALM).settleDefence).toBeLessThan(D(light, CALM).mandatePerSec + steamD(light, CALM).settleDefence);
    expect(model.tick(light, CALM, 1).sectors.steam.settled).not.toBeNull();
  });
  test('a settled sector never crises or collapses; perSettledSector pays', () => {
    const set = model.settle(steady(), CALM, 'steam');
    const hot = patchSector(set, 'steam', { pressure: 500 });
    expect(D(hot, CALM).pendingReckoning).toBeNull();
    const t = model.tick(hot, CALM, 1);
    expect(t.time).toBe(hot.time + 1);
    expect(t.sectors.steam.crisesFired).toBe(hot.sectors.steam.crisesFired);
    const PAY: Content = { ...CALM, global: { ...CALM.global, hindsight: { ...CALM.global.hindsight, perSettledSector: 10 } } };
    expect(D(set, PAY).hindsightTerms.settled).toBe(10);
    expect(D(set, CALM).hindsightTerms.settled).toBe(0);
  });
});
