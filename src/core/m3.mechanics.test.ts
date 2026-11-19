// M3 mechanism tests 2–7 of briefs/m3-core.md: seams, load, travel, priceSeen, measures and side effects, the ten new
// effects. Against fixtureM3 (src/core/fixture.ts) and small single-sector variants of it.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { LOAD_HOURS, YEARS_PER_SECOND } from '../types';
import type { Content, EffectDef, GameState, SectorDef, UpgradeDef } from '../types';
import { model } from './index';
import { fixtureM3 as M, fixtureM3Gated } from './fixture';
import { patchSector, run, foundAll } from './m1.testkit';
import { computeFlows, instruments } from './flows';

const ev = (s: GameState, kind: string) => s.events.filter((e) => e.kind === kind);
const D = (s: GameState, c: Content = M) => model.derive(s, c);
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-300, Math.abs(b));
/** A content with an extra research card carrying `effects` (bought for 1). */
const withCard = (c: Content, id: string, effects: EffectDef[], sector = 'steam'): Content =>
  ({ ...c, upgrades: [...c.upgrades, { id, sector, name: id, blurb: '', kind: 'research', cost: 1, effects } as UpgradeDef] });
/** A one-sector content: `def` opens at the start, alone. */
const solo = (def: SectorDef, extra: Partial<Content> = {}): Content => {
  const d = { ...def, unlock: undefined, spill: undefined, drawsOn: undefined };
  return {
    ...M, sectors: { [d.id]: d }, sectorOrder: [d.id], ages: [{ id: 'x', name: 'X', tagline: '', yearSpan: [1800, 2000], theme: 'ledger', sectors: [d.id] }],
    upgrades: M.upgrades.filter((u) => u.sector === d.id), levers: M.levers.filter((l) => l.sector === d.id), dispatches: [], ambient: [], histories: [],
    charters: [], commons: [], ...extra,
  };
};
const rich = (s: GameState): GameState => ({ ...s, capital: 1e9, mandate: 1e6, flags: { ...s.flags, revealed: true } });

/* ---------------- 2. seams ---------------- */

describe('M3 seams', () => {
  const S0 = () => rich(foundAll(model.createState(M), M, 'steam'));
  test('the deepest seam sunk multiplies p_r', () => {
    const s = S0();
    const a = D(s).sectors.steam!.resourcePriceBase;
    expect(rel(D(patchSector(s, 'steam', { seamsSunk: 1 })).sectors.steam!.resourcePriceBase, a * 1.2)).toBeLessThan(1e-12);
    expect(rel(D(patchSector(s, 'steam', { seamsSunk: 2 })).sectors.steam!.resourcePriceBase, a * 1.5)).toBeLessThan(1e-12);
  });
  test('sinking adds tons to reserve and reserveMax, charges cost × costMul × costMulOf; a decision; the event carries label and n', () => {
    const c = withCard(M, 'steam.discount', [{ type: 'costMulOf', id: 'steam.seam.top', value: 0.5 }, { type: 'costMul', value: 0.8 }]);
    let s = model.buyUpgrade(S0(), c, 'steam.discount');
    const before = s;
    s = model.sinkSeam(s, c, 'steam');
    expect(s).not.toBe(before);
    expect(s.sectors.steam.seamsSunk).toBe(1);
    expect(s.sectors.steam.reserve - before.sectors.steam.reserve).toBeCloseTo(100_000, 6);
    expect(s.sectors.steam.reserveMax - before.sectors.steam.reserveMax).toBeCloseTo(100_000, 6);
    expect(before.capital - s.capital).toBeCloseTo(2_000 * 0.8 * 0.5, 9);
    expect(s.run.decisions).toBe(before.run.decisions + 1);
    const e = ev(s, 'seamSunk').at(-1)!;
    expect(e).toMatchObject({ sector: 'steam', id: 'steam.seam.top', n: 1, label: 'The Top Hard', by: 'player' });
    expect(s.meta.milestones['seam:steam']).toBeDefined();
    expect(s.news[0].key).toBe('seamSunk');
    const v = D(s, c).sectors.steam!.seams!;
    expect(v.sunk).toBe(1);
    expect(v.priceMul).toBe(1.2);
    expect(v.ladder[0].sunk).toBe(true);
  });
  test('refused: unreachable, requires unmet, forbidden, unaffordable, feature off, settled, flow sector, pending', () => {
    // deep seam: reachBelow 0.3, while p_s at the start is well above
    const s1 = patchSector(S0(), 'steam', { seamsSunk: 1 });
    expect(D(s1).sectors.steam!.servicePrice).toBeGreaterThan(0.3);
    expect(model.sinkSeam(s1, M, 'steam')).toBe(s1);
    expect(D(s1).sectors.steam!.seams!.ladder[1]).toMatchObject({ reachable: false, canSink: false });
    // requires (the deepest seam needs the condenser)
    const s2 = patchSector(S0(), 'steam', { seamsSunk: 2 });
    expect(model.sinkSeam(s2, M, 'steam')).toBe(s2);
    const s2b = { ...s2, upgrades: { ...s2.upgrades, 'steam.boilers': 1, 'steam.condenser': 1 } };
    expect(model.sinkSeam(s2b, M, 'steam').sectors.steam.seamsSunk).toBe(3);
    // past the last seam
    const s3 = patchSector(S0(), 'steam', { seamsSunk: 3 });
    expect(model.sinkSeam(s3, M, 'steam')).toBe(s3);
    // forbidden
    const cf = withCard(M, 'steam.noSeam', [{ type: 'forbid', id: 'steam.seam.top' }]);
    const sf = model.buyUpgrade(S0(), cf, 'steam.noSeam');
    expect(model.sinkSeam(sf, cf, 'steam')).toBe(sf);
    expect(D(sf, cf).sectors.steam!.seams!.ladder[0].forbidden).toBe(true);
    // unaffordable
    const poor = { ...S0(), capital: 10 };
    expect(model.sinkSeam(poor, M, 'steam')).toBe(poor);
    // feature off (listed, not unlocked)
    const g = rich(model.createState(fixtureM3Gated));
    expect(model.sinkSeam(g, fixtureM3Gated, 'steam')).toBe(g);
    expect(D(g, fixtureM3Gated).sectors.steam!.seams).toBeNull();
    // settled
    const st = S0();
    const settledS = patchSector(st, 'steam', { settled: { since: 0, sinceYear: 1780, D: 1, R: 1, ps: 1, pPre: 1, income: 0, P: 0, eta: 1, defect: 1, N0: 1, spillMul0: 1, extraD0: 0, appD: {}, appAdoption: {} } });
    expect(model.sinkSeam(settledS, M, 'steam')).toBe(settledS);
    // a flow sector has no seams
    expect(model.sinkSeam(S0(), M, 'code')).toEqual(S0());
    // pending Reckoning
    const pend = patchSector(S0(), 'steam', { pressure: 1e9 });
    expect(model.sinkSeam(pend, M, 'steam')).toBe(pend);
  });
});

/* ---------------- 3. load ---------------- */

const shape = (w: number[]) => { const s = w.reduce((a, b) => a + b, 0); return w.map((x) => (LOAD_HOURS * x) / s); };
const LIGHT = M.sectors.light;
const loadSolo = solo(LIGHT);

describe('M3 load', () => {
  const start = (c: Content = loadSolo) => foundAll(model.createState(c), c, 'light');
  test('LF = mean / peak of the hourly sum; c_eff = c × ((1 − k) + k / max(floor, LF)); capCost reports c_eff', () => {
    const s = start();
    const d = D(s, loadSolo).sectors.light!;
    const load = d.load!;
    const ev0 = shape(LIGHT.load!.profiles.evening), ni = shape(LIGHT.load!.profiles.night);
    const H = new Array(LOAD_HOURS).fill(0);
    for (const a of LIGHT.applications) {
      const sh = a.profile === 'night' ? ni : ev0;
      for (let h = 0; h < LOAD_HOURS; h++) H[h] += d.apps[a.id].demand * sh[h];
    }
    const mean = H.reduce((a, b) => a + b, 0) / LOAD_HOURS, peak = Math.max(...H);
    expect(rel(load.factor, mean / peak)).toBeLessThan(1e-12);
    for (let h = 0; h < LOAD_HOURS; h++) expect(rel(load.hours[h], H[h])).toBeLessThan(1e-12);
    expect(rel(load.capCostEff, load.capCostBase * (0.4 + 0.6 / Math.max(0.05, load.factor)))).toBeLessThan(1e-12);
    expect(d.capCost).toBe(load.capCostEff);
    expect(load.capCostBase).toBe(LIGHT.capCost);
  });
  test('a flat profile set gives LF 1 and c_eff = c', () => {
    const flat = solo({ ...LIGHT, load: { ...LIGHT.load!, profiles: { evening: new Array(24).fill(1), night: new Array(24).fill(2) } } });
    const d = D(start(flat), flat).sectors.light!;
    expect(d.load!.factor).toBeCloseTo(1, 12);
    expect(rel(d.capCost, LIGHT.capCost)).toBeLessThan(1e-12);
  });
  test('adding a night application raises LF and lowers p_s', () => {
    const s0 = model.createState(loadSolo);
    const without = { ...s0, sectors: { ...s0.sectors, light: { ...s0.sectors.light, apps: { ...s0.sectors.light.apps, 'light.homes': { available: true, founded: true, satMul: 1, peakD: 0, peakAdoption: 0 } } } } };
    const withN = { ...without, sectors: { ...without.sectors, light: { ...without.sectors.light, apps: { ...without.sectors.light.apps, 'light.nightWorks': { available: true, founded: true, satMul: 1, peakD: 0, peakAdoption: 0 } } } } };
    const a = D(without, loadSolo).sectors.light!, b = D(withN, loadSolo).sectors.light!;
    expect(b.load!.factor).toBeGreaterThan(a.load!.factor);
    expect(b.servicePrice).toBeLessThan(a.servicePrice);
  });
  test('the bisection matches a brute-force price scan to 1e−6 relative', () => {
    const s = start();
    const d = D(s, loadSolo).sectors.light!;
    const eta = d.eta, pr = d.resourcePriceBase, c = LIGHT.capCost, N = s.population;
    const ev0 = shape(LIGHT.load!.profiles.evening), ni = shape(LIGHT.load!.profiles.night);
    const cEff = (p: number) => {
      const H = new Array(LOAD_HOURS).fill(0);
      for (const a of LIGHT.applications) {
        const x = (N * a.saturation) / (1 + Math.pow(p / a.halfPrice, a.steepness));
        const sh = a.profile === 'night' ? ni : ev0;
        for (let h = 0; h < LOAD_HOURS; h++) H[h] += x * sh[h];
      }
      const mean = H.reduce((u, v) => u + v, 0) / LOAD_HOURS, peak = Math.max(...H);
      return c * (0.4 + 0.6 / Math.max(0.05, mean / peak));
    };
    const g = (p: number) => pr / eta + cEff(p) - p;
    let lo = 1e-6, hi = 10;
    for (let level = 0; level < 12; level++) {
      const n = 200;
      let found = false;
      for (let i = 0; i < n; i++) {
        const a = lo + ((hi - lo) * i) / n, b = lo + ((hi - lo) * (i + 1)) / n;
        if (g(a) >= 0 && g(b) < 0) { lo = a; hi = b; found = true; break; }
      }
      expect(found).toBe(true);
    }
    expect(rel(d.servicePrice, (lo + hi) / 2)).toBeLessThan(1e-6);
  });
  test('the shadow solves its own mix: shadowR is the R of the same state with η frozen', () => {
    let s = start();
    s = model.tick(s, loadSolo, 1);
    s = { ...s, sectors: { ...s.sectors, light: { ...s.sectors.light, eta: s.sectors.light.eta * 4 } } };
    const fl = computeFlows(s, loadSolo);
    const sh = instruments(s, loadSolo, fl, 'light').shadowR;
    const frozen = { ...s, sectors: { ...s.sectors, light: { ...s.sectors.light, eta: s.sectors.light.etaAtBase } } };
    expect(rel(sh, computeFlows(frozen, loadSolo).sectors.light.R)).toBeLessThan(1e-12);
    expect(D(s, loadSolo).sectors.light!.rebound).not.toBeNull();
  });
  test('feature load gates only the widget: the arithmetic acts while it is off', () => {
    const cg = solo(LIGHT, { features: fixtureM3Gated.features });
    const a = D(start(cg), cg).sectors.light!, b = D(start(), loadSolo).sectors.light!;
    expect(a.load).toBeNull();
    expect(a.servicePrice).toBe(b.servicePrice);
  });
});

/* ---------------- 4. travel ---------------- */

const MOTION = M.sectors.motion;
const travelSolo = solo(MOTION);
const tStart = (c: Content = travelSolo) => foundAll(model.createState(c), c, 'motion');

describe('M3 travel', () => {
  test('v(D) and the fixed point in D (residual < 1e−9 relative)', () => {
    const s = tStart();
    const d = D(s, travelSolo).sectors.motion!;
    const t = d.travel!;
    const K = MOTION.travel!.roads, b = 4;
    const v = 1 / (1 + Math.pow(d.demand / K, b));
    expect(rel(t.speed, v)).toBeLessThan(1e-9);
    expect(rel(t.congestion, Math.pow(d.demand / K, b))).toBeLessThan(1e-9);
    let rhs = 0;
    for (const a of MOTION.applications) {
      const travel = a.id !== 'motion.walking';
      const S = s.population * a.saturation * (travel ? v : 1);
      const x = S / (1 + Math.pow(d.servicePrice / a.halfPrice, a.steepness));
      rhs += Math.max(x, (a.lockIn ?? 0) * s.sectors.motion.apps[a.id].peakD);
    }
    expect(rel(rhs, d.demand)).toBeLessThan(1e-9);
    expect(rel(t.hoursPerHead, 0.001 * (d.demand / s.population) / t.speed)).toBeLessThan(1e-12);
  });
  test('doubling roads raises D and v returns toward its former level (induced demand)', () => {
    let s = rich(tStart());
    const d1 = D(s, travelSolo).sectors.motion!;
    s = model.setLever(s, travelSolo, 'motion.roads', 1);
    const d2 = D(s, travelSolo).sectors.motion!;
    expect(d2.travel!.roads).toBeCloseTo(2 * d1.travel!.roads, 9);
    expect(d2.demand).toBeGreaterThan(d1.demand);
    expect(d2.travel!.speed).toBeGreaterThan(d1.travel!.speed);
    expect(d2.travel!.speed).toBeLessThan(1 / (1 + Math.pow(d1.demand / d2.travel!.roads, 4)));
  });
  test('at saturation, raising speed raises D roughly in proportion while hoursPerHead moves less than 10%', () => {
    const sat = solo({ ...MOTION, basePrice: 0.001, capCost: 0.0001, travel: { ...MOTION.travel!, roads: 1e9 },
      applications: MOTION.applications.filter((a) => a.id !== 'motion.walking').map((a) => ({ ...a, lockIn: 0 })) });
    const fast = withCard(sat, 'motion.fast', [{ type: 'travelMul', sector: 'motion', speed: 1.5 }], 'motion');
    let s = rich(tStart(fast));
    const a = D(s, fast).sectors.motion!;
    s = model.buyUpgrade(s, fast, 'motion.fast');
    const b = D(s, fast).sectors.motion!;
    expect(b.travel!.freeSpeed).toBe(1.5);
    expect(rel(b.demand / a.demand, 1.5)).toBeLessThan(0.1);
    expect(rel(b.travel!.hoursPerHead, a.travel!.hoursPerHead)).toBeLessThan(0.1);
  });
  test('lockInDecay makes peakD fall at the stated rate while demand is below it; sprawl = Σ lockIn × peakD', () => {
    let s = tStart();
    s = model.tick(s, travelSolo, 1);
    const d0 = D(s, travelSolo).sectors.motion!.apps['motion.delivery'].demand;
    s = patchSector(s, 'motion', { apps: { ...s.sectors.motion.apps, 'motion.delivery': { ...s.sectors.motion.apps['motion.delivery'], peakD: 100 * d0 } } });
    const t = run(s, 10, travelSolo);
    expect(rel(t.sectors.motion.apps['motion.delivery'].peakD, 100 * d0 * Math.exp(-0.01 * 10))).toBeLessThan(1e-9);
    const v = D(t, travelSolo).sectors.motion!.travel!;
    const want = 0.5 * t.sectors.motion.apps['motion.delivery'].peakD + 0.8 * t.sectors.motion.apps['motion.suburbs'].peakD;
    expect(rel(v.sprawl, want)).toBeLessThan(1e-12);
  });
  test('very large roads reproduce the M2 flows to 1e−9', () => {
    const big = solo({ ...MOTION, travel: { ...MOTION.travel!, roads: 1e15 } });
    const none = solo({ ...MOTION, travel: undefined });
    const a = D(tStart(big), big).sectors.motion!, b = D(tStart(none), none).sectors.motion!;
    for (const k of ['resourceUse', 'demand', 'servicePrice'] as const) expect(rel(a[k], b[k])).toBeLessThan(1e-9);
  });
});

/* ---------------- 5. priceSeen ---------------- */

const COMPUTE = M.sectors.compute;
const seenSolo = solo(COMPUTE);
const cStart = (c: Content = seenSolo) => foundAll(model.createState(c), c, 'compute');

describe('M3 priceSeen', () => {
  test('share 0 makes the demand independent of p_s; a flat price is respected; income and R still at p_s; free.bill', () => {
    const dear = solo({ ...COMPUTE, basePrice: COMPUTE.basePrice * 3 });
    const a = D(cStart(), seenSolo).sectors.compute!, b = D(cStart(dear), dear).sectors.compute!;
    expect(b.servicePrice).toBeGreaterThan(a.servicePrice);
    expect(rel(b.apps['compute.search'].demand, a.apps['compute.search'].demand)).toBeLessThan(1e-12);
    expect(b.apps['compute.sheets'].demand).toBeLessThan(a.apps['compute.sheets'].demand);
    expect(a.apps['compute.search'].priceSeen).toBe(0);
    expect(a.apps['compute.cloud'].priceSeen).toBeCloseTo(0.2, 12);
    expect(a.apps['compute.sheets'].priceSeen).toBe(a.servicePrice);
    const cloud = COMPUTE.applications.find((x) => x.id === 'compute.cloud')!;
    expect(rel(a.apps['compute.cloud'].demand, cloud.saturation / (1 + Math.pow(0.2 / cloud.halfPrice, cloud.steepness)))).toBeLessThan(1e-12);
    expect(rel(a.income, a.margin * a.preLevyPrice * a.demand)).toBeLessThan(1e-12);
    expect(rel(a.resourceUse, a.demand / a.eta)).toBeLessThan(1e-12);
    const bill = (a.servicePrice - 0) * a.apps['compute.search'].demand + Math.max(0, a.servicePrice - 0.2) * a.apps['compute.cloud'].demand;
    expect(a.free).not.toBeNull();
    expect(rel(a.free!.bill, bill)).toBeLessThan(1e-12);
  });
  test('the lowest-share priceSeen effect wins over the definition (app and sector effects)', () => {
    const c = withCard(seenSolo, 'compute.tariff', [
      { type: 'priceSeen', sector: 'compute', app: 'compute.sheets', share: 0.5 },
      { type: 'priceSeen', sector: 'compute', share: 0.3, flat: 0.01 },
      { type: 'priceSeen', sector: 'compute', share: 0.3, flat: 0.001 },
    ], 'compute');
    const s = model.buyUpgrade(rich(cStart(c)), c, 'compute.tariff');
    const d = D(s, c).sectors.compute!;
    expect(rel(d.apps['compute.sheets'].priceSeen, 0.3 * d.servicePrice + 0.001)).toBeLessThan(1e-12);
    expect(rel(d.apps['compute.search'].priceSeen, 0.3 * d.servicePrice + 0.001)).toBeLessThan(1e-12);
  });
  test('a cap over only share-0 demand stops at the squeeze limit without looping', () => {
    const onlyFree = solo({ ...COMPUTE, applications: COMPUTE.applications.filter((a) => a.priceSeen) },
      { levers: [{ id: 'compute.cap', sector: 'compute', kind: 'cap', name: 'cap', blurb: '', catch: 'c', levels: [{ mandateCost: 0, mandateUpkeep: 0, value: 0.1, label: '' }] }] });
    let s = rich(cStart(onlyFree));
    s = model.setLever(s, onlyFree, 'compute.cap', 1);
    const t0 = performance.now();
    const d = D(s, onlyFree).sectors.compute!;
    expect(performance.now() - t0).toBeLessThan(200);
    expect(d.permitPrice).toBe(0);
    expect(Number.isFinite(d.resourceUse)).toBe(true);
  });
});

/* ---------------- 6. measures and side effects ---------------- */

describe('M3 measures and side effects', () => {
  const mStart = () => rich(tStart());
  test("a 'measure' lever's effects apply with times = the level's value", () => {
    let s = mStart();
    const e0 = D(s, travelSolo).sectors.motion!.eta;
    s = model.setLever(s, travelSolo, 'motion.standard', 2);
    expect(rel(D(s, travelSolo).sectors.motion!.eta, e0 * 1.2 * 1.2)).toBeLessThan(1e-12);
    expect(D(s, travelSolo).mandatePerSec).toBeLessThan(D(mStart(), travelSolo).mandatePerSec); // its upkeep counts
  });
  test('bite ramps with rampYears, times = bite × level, decays when `unless` holds or the lever is lowered', () => {
    let s = model.setLever(mStart(), travelSolo, 'motion.standard', 2);
    const sat0 = computeFlows(s, travelSolo).sectors.motion.appSat[1] / s.population;
    s = run(s, 20, travelSolo); // one model year
    const bite = s.levers['motion.standard'].bite!;
    expect(rel(bite, 1 - Math.exp(-1 / 10))).toBeLessThan(1e-9);
    const fl = computeFlows(s, travelSolo).sectors.motion;
    // suburbs' saturation × 1.3^(bite × 2) (travel scales both by the same v(D) only if D equal: compare S/v)
    const sNow = fl.appSat[1] / fl.travel!.v / s.population, sThen = sat0 / computeFlows(model.setLever(mStart(), travelSolo, 'motion.standard', 2), travelSolo).sectors.motion.travel!.v;
    expect(rel(sNow / sThen, Math.pow(1.3, bite * 2))).toBeLessThan(1e-6);
    const views = model.leverViews(s, travelSolo).find((v) => v.def.id === 'motion.standard')!;
    expect(views.bite).toMatchObject({ growing: true, unlessMet: false, blurb: 'Heavier cars fill the forecourt' });
    // paired: a fuel duty in force → decays at decayYears (default rampYears)
    const p = model.setLever(s, travelSolo, 'motion.fuelDuty', 1);
    const p2 = run(p, 20, travelSolo);
    expect(rel(p2.levers['motion.standard'].bite!, bite * Math.exp(-1 / 10))).toBeLessThan(1e-9);
    // lowered → decays too
    const l = run(model.setLever(s, travelSolo, 'motion.standard', 0), 20, travelSolo);
    expect(rel(l.levers['motion.standard'].bite!, bite * Math.exp(-1 / 10))).toBeLessThan(1e-9);
  });
  test("'biteBack' fires once per run when the bite first reaches 0.5", () => {
    let s = model.setLever(mStart(), travelSolo, 'motion.standard', 1);
    s = run(s, 200, travelSolo); // ten model years: bite 1 − e^−1 ≈ 0.63
    expect(s.levers['motion.standard'].bitten).toBe(true);
    expect(ev(s, 'biteBack').length).toBe(1);
    expect(s.news.filter((n) => n.key === 'biteBack').length).toBe(1);
    s = run(model.setLever(s, travelSolo, 'motion.standard', 0), 400, travelSolo);
    s = run(model.setLever(s, travelSolo, 'motion.standard', 1), 400, travelSolo);
    expect(ev(s, 'biteBack').length).toBe(1);
    // a Reckoning resets it
    const r = model.reckon(s, travelSolo);
    expect(r.levers['motion.standard'].bite).toBeUndefined();
  });
  test("feature 'sideEffects' gates the headline, the event and the view, not the bite", () => {
    const cg = solo(MOTION, { features: fixtureM3Gated.features });
    let s = model.setLever(rich(tStart(cg)), cg, 'motion.standard', 1);
    s = run(s, 200, cg);
    expect(s.levers['motion.standard'].bite!).toBeGreaterThan(0.5);
    expect(ev(s, 'biteBack').length).toBe(0);
    expect(model.leverViews(s, cg).find((v) => v.def.id === 'motion.standard')!.bite).toBeNull();
  });
});

/* ---------------- 7. the ten new effects ---------------- */

describe('M3 new effects', () => {
  const base = () => rich(foundAll(model.createState(M), M, 'steam'));
  const buy = (effects: EffectDef[], sector = 'steam') => {
    const c = withCard(M, 'x.card', effects, sector);
    return { c, a: base(), b: model.buyUpgrade(base(), c, 'x.card') };
  };
  test('resourcePriceMul, intensityMul, incomeMul (sector and global) as standing effects', () => {
    const { c, a, b } = buy([{ type: 'resourcePriceMul', sector: 'steam', value: 2 }, { type: 'intensityMul', sector: 'steam', value: 0.5 },
      { type: 'incomeMul', sector: 'steam', value: 1.5 }, { type: 'incomeMul', value: 2 }]);
    const x = D(a, c).sectors.steam!, y = D(b, c).sectors.steam!;
    expect(rel(y.resourcePriceBase, 2 * x.resourcePriceBase)).toBeLessThan(1e-12);
    expect(rel(y.margin, x.margin * 3)).toBeLessThan(1e-12);
    const fx = computeFlows(a, c).sectors.steam, fy = computeFlows(b, c).sectors.steam;
    expect(rel(fy.pressureIn / fy.R, 0.5 * fx.pressureIn / fx.R)).toBeLessThan(1e-12);
  });
  test('costMulOf on an upgrade, an application, a Commons project and a sector; multiplies with costMul', () => {
    const { c, b } = buy([{ type: 'costMulOf', id: 'steam.lathe', value: 0.5 }, { type: 'costMulOf', id: 'steam.mills', value: 0.25 },
      { type: 'costMulOf', id: 'light', value: 0.1 }, { type: 'costMulOf', id: 'commons.baths', value: 0.5 }]);
    const v = model.upgradeViews(b, c);
    expect(v.find((x) => x.def.id === 'steam.lathe')!.cost).toBeCloseTo(1_000, 9);
    expect(v.find((x) => x.def.id === 'light.mantle')!.cost).toBeCloseTo(500, 9);
    const s0 = model.createState(c);
    const unfounded = model.buyUpgrade(rich({ ...s0, sectors: { ...s0.sectors, steam: { ...s0.sectors.steam, apps: { ...s0.sectors.steam.apps, 'steam.mills': { ...s0.sectors.steam.apps['steam.mills'], available: true } } } } }), c, 'x.card');
    expect(D(unfounded, c).sectors.steam!.apps['steam.mills'].foundCost).toBeCloseTo(125, 9);
    const before = unfounded.capital;
    expect(before - model.foundApp(unfounded, c, 'steam.mills').capital).toBeCloseTo(125, 9);
    const op = { ...b, meta: { ...b.meta, reckonings: 5 } };
    expect(model.commonsViews(op, c).find((x) => x.def.id === 'commons.baths')!.cost).toBeCloseTo(250, 9);
  });
  test('forbid: an upgrade, an application, a lever kind (in a sector); lowering stays allowed; the views say so', () => {
    const { c, b } = buy([{ type: 'forbid', id: 'steam.lathe' }, { type: 'forbid', leverKind: 'duty', sector: 'steam' }, { type: 'forbid', id: 'steam.mills' }]);
    const s = { ...b, upgrades: { ...b.upgrades, 'steam.boilers': 1 } };
    expect(model.buyUpgrade(s, c, 'steam.lathe')).toBe(s);
    const lv = model.upgradeViews(s, c).find((x) => x.def.id === 'steam.lathe')!;
    expect(lv).toMatchObject({ forbidden: true, affordable: false, visible: true });
    expect(model.setLever(s, c, 'steam.duty', 1)).toBe(s);
    expect(model.setLever(s, c, 'steam.circularity', 1)).not.toBe(s);
    expect(model.leverViews(s, c).find((x) => x.def.id === 'steam.duty')).toMatchObject({ forbidden: true, canRaise: false });
    const held = { ...s, levers: { ...s.levers, 'steam.duty': { level: 2, ref: 1 } } };
    expect(model.setLever(held, c, 'steam.duty', 1).levers['steam.duty'].level).toBe(1);
    const avail = patchSector(s, 'steam', { apps: { ...s.sectors.steam.apps, 'steam.mills': { available: true, founded: false, satMul: 1, peakD: 0, peakAdoption: 0 } } });
    expect(model.foundApp(avail, c, 'steam.mills')).toBe(avail);
    expect(D(avail, c).sectors.steam!.apps['steam.mills']).toMatchObject({ forbidden: true, canFound: false });
  });
  test('travelMul and priceSeen as standing effects (see the travel and priceSeen tests); unknown effect types are ignored', () => {
    const c = withCard(M, 'x.weird', [{ type: 'noSuchEffect', value: 3 } as unknown as EffectDef]);
    const a = base(), b = model.buyUpgrade(a, c, 'x.weird');
    expect(D(b, c).sectors.steam!.servicePrice).toBe(D(a, c).sectors.steam!.servicePrice);
  });
  test('one-offs: populationMul, pressureAdd (a crisis fires on the next step), metaFlag; negative capitalAdd and mandateAdd floor at 0', () => {
    let s = base();
    const p0 = s.population;
    s = model.buyUpgrade(s, M, 'steam.strike');
    expect(s.population).toBeCloseTo(p0 * 0.5, 12);
    expect(s.capital).toBe(0);
    expect(s.mandate).toBe(0);
    expect(s.sectors.steam.pressure).toBeCloseTo(50, 9);
    expect(s.sectors.steam.crisesFired).toBe(0);
    s = model.tick(s, M, 1);
    expect(s.sectors.steam.crisesFired).toBe(1);
    expect(ev(s, 'crisis').length).toBe(1);
    const cf = withCard(M, 'x.flag', [{ type: 'metaFlag', flag: 'proprietor' }, { type: 'pressureAdd', sector: 'steam', value: -10 }]);
    const f = model.buyUpgrade(base(), cf, 'x.flag');
    expect(f.meta.flags.proprietor).toBe(true);
    expect(f.sectors.steam.pressure).toBe(0);
    expect(model.derive(f, cf).sectors.steam).toBeDefined();
    void YEARS_PER_SECOND;
  });
});
