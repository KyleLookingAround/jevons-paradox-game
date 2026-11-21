// M5 Core A: the rival (RivalDef; RivalState): profile, policy, income, the purchase rule with his purse, response
// prices and choice, the answer line (exit criterion 4: exact), effective level (carve-outs, litigation), E1 and E2 on
// fixtureM5 (design/scratch/m5-core-rival-progress.md).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { YEARS_PER_SECOND } from '../types';
import type { Content, GameState, MetaState } from '../types';
import { fixtureM5Quiet as fixtureM5, fixtureM5NoTailQuiet as fixtureM5NoTail } from './fixture';
import { adv, ministry } from './m5.testkit';
import { leverChairFields, priceResponses, rivalAnswerView, rivalDecide, rivalPolicy, rivalProfile, rivalView } from './chair/rival';
import { effectiveLevel } from './leverLevels';
import { loopholeStep } from './chair/loopholes';
import { setLever } from './policy';
import { computeFlows } from './flows';
import { sectorLevers } from './levers';
import { evalCond, statValue } from './conditions';
import { bestCandidate, flowsWithUpgrade, marketGain } from './candidates';
import { model } from './index';

const C = fixtureM5;
/** setLever, with raisedAt recorded as Core B's setLever does (a test written before it lands stays valid after). */
const raise = (s: GameState, id: string, L: number): GameState => {
  const t = setLever(s, C, id, L);
  if (t === s) return s;
  const cur = t.levers[id];
  return { ...t, levers: { ...t.levers, [id]: { ...cur, raisedAt: t.time, ...(s.levers[id]?.level ? {} : { since: t.time }) } } };
};
const grown = (() => { let g: GameState | null = null; return () => (g ??= adv(ministry(C), C, 120)); })();

describe('M5 rival: profile and policy', () => {
  test('the profile from the first opening (pure), with its sources', () => {
    const meta = {
      firstOpening: { actions: [
        { t: 10, kind: 'upgrade', id: 'motor.carburettor', by: 'player' }, { t: 50, kind: 'found', id: 'motor.lorries', by: 'player' },
        { t: 90, kind: 'upgrade', id: 'motor.massMarket', by: 'player' }, { t: 700, kind: 'upgrade', id: 'motor.overhead', by: 'player' },
      ], firstBudgetAt: 450, seconds: 900 },
      opening: { actions: [], firstBudgetAt: 900, seconds: 900 },
      dispatches: { seen: {}, arms: {}, playerArms: {} },
    } as unknown as MetaState;
    const { profile, sources } = rivalProfile(meta, C);
    // haste: 3 purchases before 600 s → 0.3 a minute, below a = 0.5 → 0
    expect(profile.haste).toBe(0);
    expect(profile.founder).toBeCloseTo(1 / 4, 12);
    expect(profile.volume).toBe(1); // the one fork purchase took the larger-demand arm
    expect(profile.drawn).toBeCloseTo(1 - 450 / 1800, 12);
    expect(profile.pliant).toBe(0.5);
    expect(sources).toEqual({ haste: { n: 3, d: null }, founder: { n: 1, d: 4 }, volume: { n: 1, d: 1 }, drawn: { n: 450, d: 1800 }, pliant: { n: 0, d: 0 } });
  });
  test('no first opening: the default profile', () => {
    const { profile } = rivalProfile({ dispatches: { seen: {}, arms: {}, playerArms: {} } } as unknown as MetaState, C);
    expect(profile).toEqual(C.rival!.defaultProfile);
  });
  test('policy: paybacks lerped by haste and founder; forks by volume', () => {
    const s = ministry(C);
    const p = rivalPolicy(s, C);
    expect(p.paybackMax).toBeCloseTo(240 + (60 - 240) * 0.5, 12);
    expect(p.foundPaybackMax).toBeCloseTo(300 + (90 - 300) * 0.3, 12);
    const mass = C.upgrades!.find((u) => u.id === 'motor.massMarket')!, coach = C.upgrades!.find((u) => u.id === 'motor.coachbuilt')!;
    expect([p.fork(mass), p.fork(coach)]).toEqual([true, false]);
    const low = { ...s, meta: { ...s.meta, office: { profile: { ...C.rival!.defaultProfile, volume: 0.2 } } } } as unknown as GameState;
    const q = rivalPolicy(low, C);
    expect([q.fork(mass), q.fork(coach)]).toEqual([false, true]);
  });
});

describe('M5 rival: income and purchases', () => {
  test('his purse: the opening purse, then (1 − taxShare) × income every step; peakIncome', () => {
    const s0 = ministry(C);
    const inc = computeFlows(s0, C).sectors.motor!.income;
    expect(s0.chair!.rival.capital).toBeCloseTo(60 * inc, 6);
    const s1 = adv(s0, C, 1);
    expect(s1.chair!.rival.capital).toBeCloseTo(60 * inc + 0.7 * inc, 6);
    expect(s1.chair!.rival.peakIncome.motor).toBeCloseTo(inc, 9);
  });
  test('he buys by the Market rule with HIS purse, as rival, at order ticks only; not the player\'s automations', () => {
    const s0 = ministry(C);
    const s = adv(s0, C, 25);
    const bought = s.events.filter((e) => e.kind === 'upgradeBought');
    expect(bought.length).toBeGreaterThan(0);
    expect(bought.every((e) => e.by === 'rival' && Math.abs((e.time * YEARS_PER_SECOND) % 1) < 1e-9)).toBe(true);
    expect(s.run.automated).toBe(0);
    expect(s.orderLog.motor).toBeDefined();
    // the player's capital pays nothing for them (the step's own capital rule aside)
    expect(s.chair!.rival.capital).toBeLessThan(s0.chair!.rival.capital + 25 * 0.7 * computeFlows(s, C).sectors.motor!.income);
  });
  test('E1: with no repeatable card he saturates (no crisis in 30 min); with one, R keeps rising and a crisis comes', () => {
    let a = ministry(fixtureM5NoTail), b = ministry(C);
    let crisisA = 0, crisisB = 0;
    const R: number[] = [];
    for (let m = 1; m <= 30; m++) {
      a = adv(a, fixtureM5NoTail, 60);
      b = adv(b, C, 60, (x) => { if (!crisisB && x.sectors.motor.crisesFired > 0) crisisB = x.time; });
      if (a.sectors.motor.crisesFired > 0 && !crisisA) crisisA = a.time;
      if (m % 10 === 0) R.push(computeFlows(b, C).sectors.motor!.R);
    }
    expect(crisisA).toBe(0);
    expect(R[1]).toBeGreaterThan(R[0]);
    expect(R[2]).toBeGreaterThan(R[1]);
    expect(crisisB / 60).toBeGreaterThan(18);
    expect(crisisB / 60).toBeLessThan(35);
  });
});

describe('M5 rival: responses and the answer line', () => {
  test('exit criterion 4 (exact): the answer line on the step before a raise is what he answers at the next tick', () => {
    let n = 0;
    for (const lever of ['motor.duty', 'motor.cap', 'motor.mileage']) {
      for (const conf of [50, 60, 75]) {
        let s: GameState = { ...grown(), chair: { ...grown().chair!, confidence: conf } };
        for (let L = 1; L <= 3; L++) {
          const line = rivalAnswerView(s, C, lever)!;
          expect(line.level).toBe(L);
          const r = loopholeStep(raise(s, lever, L), C); // what rivalStep does before the tick's decision
          const d = rivalDecide(r, C, 1);
          const a = d.chair!.rival.answers[lever];
          expect(a.kind).toBe(line.chosen);
          expect(a.cost).toBe(line.options.find((o) => o.kind === a.kind)!.cost);
          n++;
          s = adv(d, C, 30);
        }
      }
    }
    expect(n).toBe(27);
  });
  test('E2: across a lever sweep every kind (comply, evade, lobby, litigate) is chosen somewhere', () => {
    const kinds = new Set<string>();
    for (const lever of ['motor.duty', 'motor.cap', 'motor.mileage']) {
      for (const conf of [50, 60, 75]) {
        let s: GameState = { ...grown(), chair: { ...grown().chair!, confidence: conf } };
        for (let L = 1; L <= (lever === 'motor.mileage' ? 4 : 3); L++) {
          s = adv(raise(s, lever, L), C, 20);
          kinds.add(s.chair!.rival.answers[lever].kind);
          s = adv(s, C, 60);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['comply', 'evade', 'litigate', 'lobby']);
  });
  test('prices: ranked, unavailable at Infinity, ties comply first; comply = I(0) − I(L)', () => {
    const s = raise(grown(), 'motor.cap', 2);
    const p = priceResponses(s, C, 'motor.cap');
    for (let i = 1; i < p.options.length; i++) expect(p.options[i].cost >= p.options[i - 1].cost).toBe(true);
    expect(p.options.filter((o) => !o.available).every((o) => o.cost === Infinity)).toBe(true);
    expect(p.options.find((o) => o.kind === 'comply')!.cost).toBeCloseTo(p.comply, 9);
    const at0 = priceResponses(raise(grown(), 'motor.duty', 1), C, 'motor.duty');
    expect(at0.chosen).toBe('comply'); // a duty costs nothing at enactment (it tops up as η rises)
    expect(at0.comply).toBe(0);
  });
  test('the answer line is null outside a Ministry and is cached per bucket', () => {
    const s = grown();
    expect(rivalAnswerView({ ...s, chair: null }, C, 'motor.duty')).toBeNull();
    expect(rivalAnswerView(s, C, 'motor.duty')).toBe(rivalAnswerView(s, C, 'motor.duty'));
  });
  test('litigation: the lever acts at the level he last answered until the delay ends; then at its level', () => {
    let s = raise(raise({ ...grown(), chair: { ...grown().chair!, confidence: 50 } }, 'motor.cap', 1), 'motor.cap', 2);
    s = adv(s, C, 20);
    s = raise(s, 'motor.cap', 3);
    s = adv(s, C, 20);
    const ch = s.chair!;
    expect(ch.rival.answers['motor.cap'].kind).toBe('litigate');
    const lit = ch.litigation['motor.cap'];
    expect(lit.from).toBe(2);
    expect(effectiveLevel(s, 'motor.cap')).toBe(2);
    expect(leverChairFields(s, C, 'motor.cap').litigatedUntil).toBe(lit.until);
    const capFracAt = (x: GameState) => sectorLevers(x, C).motor.capFrac;
    expect(capFracAt(s)).toBeCloseTo(0.8 / (1 - (s.chair!.rival.concealment.motor ?? 0)), 9);
    const after = adv(s, C, Math.ceil(lit.until - s.time) + 1);
    expect(effectiveLevel(after, 'motor.cap')).toBe(3);
    expect(after.chair!.litigation['motor.cap']).toBeUndefined();
  });
  test('lobbying: C falls under the line → a carve-out this Parliament (one level lower); a lever at 0 loses its answer', () => {
    let s = raise(raise({ ...grown(), chair: { ...grown().chair!, confidence: 60 } }, 'motor.cap', 1), 'motor.cap', 2);
    s = adv(s, C, 20);
    expect(s.chair!.rival.answers['motor.cap'].kind).toBe('lobby');
    expect(s.chair!.rival.lobbying['motor.cap']).toBe(true);
    s = { ...s, chair: { ...s.chair!, confidence: 50 } };
    s = adv(s, C, 20);
    expect(s.chair!.carveOuts['motor.cap']).toBe(0);
    expect(s.chair!.rival.lobbying['motor.cap']).toBeUndefined();
    expect(effectiveLevel(s, 'motor.cap')).toBe(1);
    expect(s.events.some((e) => e.kind === 'carveOut' && e.id === 'motor.cap')).toBe(true);
    const nextParl = { ...s, chair: { ...s.chair!, parliament: { ...s.chair!.parliament, index: 1 } } };
    expect(effectiveLevel(nextParl, 'motor.cap')).toBe(2);
    s = adv(setLever(s, C, 'motor.cap', 0), C, 20);
    expect(s.chair!.rival.answers['motor.cap']).toBeUndefined();
  });
  test('a standing answer is re-priced once a decade', () => {
    let s = raise(grown(), 'motor.duty', 2);
    s = adv(s, C, 20);
    const t0 = s.chair!.rival.answers['motor.duty'].t;
    s = adv(s, C, 200);
    expect(s.chair!.rival.answers['motor.duty'].t).toBeGreaterThanOrEqual(t0 + 200 - 1e-9);
  });
});

describe('M5 rival: views and conditions', () => {
  test('RivalView: purse, policy, answers, his next candidate', () => {
    const s = adv(raise(grown(), 'motor.duty', 1), C, 20);
    const v = rivalView(s, C)!;
    expect(v.name).toBe(C.rival!.name);
    expect(v.capital).toBe(s.chair!.rival.capital);
    expect(v.answers.map((a) => a.lever)).toEqual(['motor.duty']);
    expect(v.quietYears).toBe(7);
    expect('motor' in v.next).toBe(true);
  });
  test('stats and conditions read the Ministry', () => {
    const s = grown();
    expect(statValue(s, C, { stat: 'inOffice' })).toBe(1);
    expect(statValue(s, C, { stat: 'rivalCapital' })).toBe(s.chair!.rival.capital);
    expect(statValue(s, C, { stat: 'confidence' })).toBe(55);
    expect(statValue(s, C, { stat: 'yearsSinceInspection', sector: 'motor' })).toBe(1e9);
    expect(evalCond(s, C, { stat: 'concealment', sector: 'motor', op: '<', value: 0.01 })).toBe(true);
    const out = { ...s, chair: null };
    expect(statValue(out, C, { stat: 'concealment', sector: 'motor' })).toBeNull();
    expect(statValue(out, C, { stat: 'inOffice' })).toBe(0);
  });
});

export const _c: Content = C;

describe('M5 rival (follow-up): a reserve card', () => {
  test('a capital card whose only effect is reserveAdd: priced by the dearer oil it spares (rival), still nothing to the Market', () => {
    const RC: Content = { ...C, upgrades: [...C.upgrades!, { id: 'motor.wells', sector: 'motor', name: 'Wells', blurb: '', kind: 'capital', cost: 500, effects: [{ type: 'reserveAdd', sector: 'motor', value: 0.5 }] }] };
    const s0 = ministry(RC);
    const low = { ...s0, time: 30, sectors: { ...s0.sectors, motor: { ...s0.sectors.motor, reserve: 0.3 * s0.sectors.motor.reserveMax } } };
    const only = (u: { id: string }) => u.id === 'motor.wells';
    const RCw: Content = { ...RC, upgrades: RC.upgrades!.filter(only) };
    const pick = (s: GameState, reserve: boolean) => bestCandidate(s, RCw, 'motor', { capital: 1e12, paybackMax: 1e12, foundPaybackMax: 0, fork: null, share: null, reserve });
    expect(pick(low, false).best).toBeNull(); // the Market's rule: no running cost saved
    const r = pick(low, true).best!;
    expect(r.id).toBe('motor.wells');
    expect(Number.isFinite(r.payback)).toBe(true);
    // worth more the emptier the field: at a full reserve it spares nothing
    expect(pick(s0, true).best).toBeNull();
    const lower = { ...low, sectors: { ...low.sectors, motor: { ...low.sectors.motor, reserve: 0.1 * s0.sectors.motor.reserveMax } } };
    expect(pick(lower, true).best!.payback).toBeLessThan(r.payback);
  });
});

describe('M5 rival (follow-up 3): his order book in the upgrade views; rivalBought', () => {
  test('a chair sector\'s cards: byRival, not affordable, his payback (= the candidate rule\'s), the subsidy share', () => {
    const s = { ...grown(), capital: 1e9 };
    const vs = model.upgradeViews(s, C, 'motor');
    const roads = vs.find((v) => v.def.id === 'motor.roads')!;
    expect([roads.byRival, roads.affordable, roads.subsidised]).toEqual([true, false, 0]);
    // the same figure his rule computes for the card alone
    const gain = marketGain(computeFlows(s, C), flowsWithUpgrade(s, C, 'motor.roads', true));
    expect(roads.rivalPayback!).toBeCloseTo(roads.cost / gain, 6);
    expect(model.upgradeViews(s, C, 'motor').find((v) => v.def.id === 'motor.roads')!.rivalPayback).toBe(roads.rivalPayback); // cached
    // outside a Ministry: the M4 view (no rival fields)
    const out = model.upgradeViews({ ...s, chair: null }, C, 'motor').find((v) => v.def.id === 'motor.roads')!;
    expect(out.byRival).toBeUndefined();
  });
  test('a subsidy lever on his card shows its share and lowers his payback', () => {
    const SC: Content = { ...C, levers: [...C.levers!, { id: 'motor.grant', sector: 'motor', kind: 'subsidy', name: 'g', blurb: '', catch: '', targets: ['motor.roads'], levels: [{ mandateCost: 1, mandateUpkeep: 0, value: 0.5, label: '50%' }] }] };
    const s = { ...grown(), capital: 1e9 };
    const base = model.upgradeViews(s, SC, 'motor').find((v) => v.def.id === 'motor.roads')!;
    const sub = { ...s, levers: { ...s.levers, 'motor.grant': { level: 1, ref: 0 } } };
    const v = model.upgradeViews(sub, SC, 'motor').find((x) => x.def.id === 'motor.roads')!;
    expect(v.subsidised).toBe(0.5);
    expect(v.rivalPayback!).toBeCloseTo(base.rivalPayback! * 0.5, 6);
  });
  test('rivalBought: his card levels in the sector this run', () => {
    const s = grown();
    let n = 0;
    for (const u of C.upgrades!) if (u.sector === 'motor') n += s.upgrades[u.id] ?? 0;
    expect(n).toBeGreaterThan(0);
    expect(model.derive(s, C).sectors.motor!.rivalBought).toBe(n);
  });
});
