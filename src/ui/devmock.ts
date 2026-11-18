// Development stand-in for the real model + content. Used only with #mock or when content.eras is missing.
// Crude, but follows the same formulas so the UI moves plausibly.
import type {
  Content, ModelApi, GameState, EraId, EraDef, EraState, Derived, EraDerived, UpgradeView, LeverView, MetaState, HeadlineKey, NewsItem,
} from '../types';
import { ERA_ORDER, START_YEAR, YEARS_PER_SECOND } from '../types';

const app = (id: string, name: string, icon: string, halfPrice: number, saturation: number, steepness: number, visibleBelow: number, foundCost: number, blurb: string) =>
  ({ id, name, icon, halfPrice, saturation, steepness, visibleBelow, foundCost, blurb });

const steam: EraDef = {
  id: 'steam', index: 1, name: 'Steam', years: '1780–1870', tagline: 'Coal, iron, and a great deal of water to be got out of holes.',
  service: { name: 'Motive power', unit: 'hp' }, resource: { name: 'Coal', unit: 'tons' }, pressure: { name: 'Smog', crisisName: 'The Great Smog' },
  theme: 'ledger', basePrice: 1, capCost: 0.04, margin: 0.2, baseEta: 1, autoEtaRate: 0, resourceKind: 'stock', reserve: 400000, alpha: 0.6,
  pressureSource: 'resource', pressureIntensity: 0.02, absorption: 0.002, collapseAt: 3000, crisisAt: [0.35, 0.65, 0.85], pressureWellbeingCost: 20,
  pressureUpkeep: 0, wellbeingWeight: 10, wellbeingScale: 10,
  applications: [
    { ...app('steam.pump', 'Mine pumping', 'pump', 1.5, 40, 1.5, Infinity, 0, 'Keep the pit dry; reach the deeper seams.'), reserveGainPerService: 0.05 },
    app('steam.mills', 'Cotton mills', 'mill', 0.6, 300, 2, 0.8, 150, 'Spindles by the thousand.'),
    app('steam.rail', 'Railways', 'train', 0.3, 1200, 2.2, 0.5, 4000, 'Distance, abolished at a penny a mile.'),
    app('steam.ships', 'Steamships', 'ship', 0.15, 3000, 2.4, 0.3, 40000, 'The Atlantic, on a timetable.'),
    app('steam.weird', 'Unknown icon test', 'zeppelin', 0.05, 100, 2, 0.1, 1e6, 'Fallback pictogram.'),
  ],
};
const light: EraDef = {
  ...steam, id: 'light', index: 2, name: 'Light', years: '1870–1950', tagline: 'Night, abolished.', theme: 'gaslight',
  service: { name: 'Lumens', unit: 'klm' }, resource: { name: 'Town gas', unit: 'therms' }, pressure: { name: 'Soot', crisisName: 'The Black Fog' },
  basePrice: 2, capCost: 0.1, reserve: 900000, spill: { to: 'steam', rate: 0.4 }, unlock: { prevServicePriceBelow: 0.5, minReckonings: 0 },
  applications: [
    app('light.street', 'Street lamps', 'lamp', 3, 50, 1.6, Infinity, 0, 'The parish lights the lane.'),
    app('light.night', 'Night shifts', 'factory-night', 1.2, 400, 2, 1.8, 2000, 'The mill never sleeps now.'),
    app('light.homes', 'Homes', 'house', 0.6, 1500, 2.2, 1, 20000, 'A mantle in every parlour.'),
    app('light.signs', 'Shop signs', 'sign', 0.3, 3000, 2.4, 0.5, 2e5, 'OPEN, spelled in fire.'),
  ],
};

const E = (era: EraId, value: number) => [{ type: 'etaMul' as const, era, value }];
export const mockContent: Content = {
  eras: { steam, light } as Record<EraId, EraDef>,
  upgrades: [
    { id: 'steam.boilers', era: 'steam', name: 'Better boilers', blurb: 'Rivets, mostly.', kind: 'efficiency', cost: 30, effects: E('steam', 1.5) },
    { id: 'steam.condenser', era: 'steam', name: 'Separate condenser', blurb: 'Watt, 1769. Stop cooling the cylinder.', kind: 'efficiency', cost: 400, requires: ['steam.boilers'], effects: E('steam', 1.667) },
    { id: 'steam.double', era: 'steam', name: 'Double-acting engine', blurb: 'Push on the way back, too.', kind: 'efficiency', cost: 3000, requires: ['steam.condenser'], effects: E('steam', 1.4) },
    { id: 'steam.hp', era: 'steam', name: 'High-pressure steam', blurb: 'Trevithick. Stand well back.', kind: 'efficiency', cost: 20000, requires: ['steam.double'], effects: E('steam', 1.4286) },
    { id: 'steam.coalQuestion', era: 'steam', name: 'The Coal Question', blurb: 'W. S. Jevons, 1865. An inquiry concerning the progress of the nation.', kind: 'research', cost: 600, requires: ['steam.condenser'], effects: [{ type: 'reveal' }] },
    { id: 'steam.foundry', era: 'steam', name: 'Ironworks', blurb: 'Cheaper engines, cheaper power.', kind: 'capital', cost: 250, effects: [{ type: 'capCostMul', era: 'steam', value: 0.7 }] },
    { id: 'steam.shaft', era: 'steam', name: 'Sink a deeper shaft', blurb: 'There is always more, further down.', kind: 'prospect', cost: 200, repeatable: true, costGrowth: 2.2, maxLevel: 6, effects: [{ type: 'reserveAdd', era: 'steam', value: 0.25 }] },
    { id: 'light.mantle', era: 'light', name: 'Gas mantle', blurb: 'Welsbach, 1885.', kind: 'efficiency', cost: 5000, effects: E('light', 3) },
  ],
  levers: [
    { id: 'steam.duty', era: 'steam', kind: 'duty', name: 'Fuel duty escalator', blurb: 'A penny on the ton, rising.', catch: 'Your customers notice, and so does your income.',
      levels: [{ mandateCost: 60, mandateUpkeep: 0.1, value: 0.3, label: 'Hold price at 30% of the fall' }, { mandateCost: 180, mandateUpkeep: 0.2, value: 0.6, label: 'Hold price at 60% of the fall' }, { mandateCost: 540, mandateUpkeep: 0.4, value: 0.9, label: 'Hold price at 90% of the fall' }] },
    { id: 'steam.cap', era: 'steam', kind: 'cap', name: 'Smoke abatement cap', blurb: 'So much and no more.', catch: 'Permits are dear, and smoke finds the gaps.',
      levels: [{ mandateCost: 100, mandateUpkeep: 0.2, value: 0.9, label: 'Cap at 90% of today' }, { mandateCost: 300, mandateUpkeep: 0.3, value: 0.8, label: 'Cap at 80% of today' }, { mandateCost: 900, mandateUpkeep: 0.5, value: 0.6, label: 'Cap at 60% of today' }] },
  ],
  knowhow: [
    { id: 'kh.apprentice', name: 'Apprenticeships', blurb: 'Better engines from minute one. Funny how the coal goes quicker.', cost: 5, costGrowth: 1.6, maxLevel: 10, effects: E('steam', 1.15) },
    { id: 'kh.seed', name: 'Seed capital', blurb: 'Start richer. Arrive at the wall sooner.', cost: 8, costGrowth: 2, maxLevel: 5, effects: [{ type: 'startCapitalMul', value: 2 }] },
  ],
  institutions: [
    { id: 'in.stats', name: 'Statistics Office', blurb: 'Someone, at last, is counting. Reveals the rebound from minute one.', cost: 25, effects: [{ type: 'reveal' }] },
    { id: 'in.duty', name: 'Standing fuel duty', blurb: 'The escalator, already escalating.', cost: 60, requires: ['in.stats'], effects: [{ type: 'startLever', lever: 'steam.duty', level: 1 }] },
  ],
  achievements: [
    { id: 'firstReckoning', name: 'First Reckoning', blurb: 'Close the books once.' },
    { id: 'backfire', name: 'Backfire', blurb: 'Rebound past 100%.' },
    { id: 'jevonsWasRight', name: 'Jevons Was Right', blurb: 'Max an efficiency tree while use grows many-fold.' },
    { id: 'degrowthByAccident', name: 'Degrowth by accident', blurb: 'Decoupled, technically.', hidden: true },
    { id: 'steadyState', name: 'Steady State', blurb: 'Fifty years of falling use and a decent life.' },
  ],
  headlines: {
    appFounded: ['{app} founded; investors delighted'], appAvailable: ['Cheap {service} makes {app} thinkable'], eraOpened: ['A new age: {era}'],
    crisis: ['Smog chokes the town; Parliament stirs'], collapse: ['The air gives out'], exhausted: ['Last seam worked out'],
    backfire: ['Engines thriftier than ever; collieries report record sales'], reveal: ['Professor asks why coal use rises as engines improve'],
    leverEnacted: ['Act passed'], leverLapsed: ['Act lapses for want of support'], steadyEra: ['{era} holds steady'], steadyAll: ['Steady state'],
    reckoning: ['The books are closed'], efficiency: ['Engines thriftier than ever; collieries report record sales', 'New engine burns half the coal, says inventor'],
  } as Record<HeadlineKey, string[]>,
  global: {
    startCapital: 10, clickSeconds: 1, clickFlat: 2, popGrowth: 0.0004, subsistence: 8, wellbeingTarget: 28, mandateRate: 0.03, mandateFloor: 12,
    crisisMandate: 150, crisisPopLoss: 0.08, hindsight: { perPeakWellbeing: 1, perDecoupledYear: 2, perEraReached: 10, perSteadyEra: 150 }, offlineCapSeconds: 14400,
  },
};

/* ---------------- crude sim ---------------- */
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x, (_k, v) => (v === Infinity ? 1e308 : v)));
const eraIds = (c: Content): EraId[] => ERA_ORDER.filter((id) => c.eras && c.eras[id]);

function etaOf(s: GameState, c: Content, id: EraId): number {
  let eta = c.eras[id].baseEta;
  for (const u of c.upgrades) if (u.era === id && s.upgrades[u.id]) for (const e of u.effects) if (e.type === 'etaMul') eta *= Math.pow(e.value, s.upgrades[u.id]);
  for (const k of c.knowhow) for (const e of k.effects) if (e.type === 'etaMul' && e.era === id) eta *= Math.pow(e.value, s.meta.knowhow[k.id] || 0);
  return eta;
}
function capOf(s: GameState, c: Content, id: EraId): number {
  let cc = c.eras[id].capCost;
  for (const u of c.upgrades) if (u.era === id && s.upgrades[u.id]) for (const e of u.effects) if (e.type === 'capCostMul') cc *= e.value;
  return cc;
}
function calc(s: GameState, c: Content, id: EraId) {
  const def = c.eras[id], es = s.eras[id];
  const eta = etaOf(s, c, id);
  const pr = def.basePrice * Math.pow(es.reserveMax / Math.max(1, es.reserve), def.alpha);
  let ps = pr / eta + capOf(s, c, id);
  const duty = s.levers[def.id + '.duty'];
  const dutyDef = c.levers.find((l) => l.id === def.id + '.duty');
  if (duty && duty.level > 0 && dutyDef) ps = ps + dutyDef.levels[duty.level - 1].value * Math.max(0, duty.ref - ps);
  const apps: Record<string, { d: number; ad: number }> = {};
  let D = 0;
  for (const a of def.applications) {
    const st = es.apps[a.id];
    const sat = s.population * a.saturation * (st?.satMul ?? 1);
    const d = st?.founded ? sat / (1 + Math.pow(ps / a.halfPrice, a.steepness)) : 0;
    apps[a.id] = { d, ad: sat > 0 ? d / sat : 0 };
    D += d;
  }
  const R = D / eta;
  return { eta, pr, ps, D, R, apps, income: def.margin * ps * D };
}
function wellbeing(s: GameState, c: Content): number {
  let w = 0;
  for (const id of eraIds(c)) {
    if (!s.eras[id].open) continue;
    const def = c.eras[id], k = calc(s, c, id);
    w += def.wellbeingWeight * Math.log(1 + k.D / (s.population * def.wellbeingScale));
    w -= def.pressureWellbeingCost * Math.min(1, s.eras[id].pressure / def.collapseAt);
  }
  return Math.max(0, w);
}
function news(s: GameState, c: Content, key: HeadlineKey, vars: Record<string, string> = {}, era?: EraId) {
  const list = c.headlines[key] || ['News'];
  let text = list[Math.floor(s.time * 7) % list.length];
  for (const k in vars) text = text.split('{' + k + '}').join(vars[k]);
  const item: NewsItem = { time: s.time, year: Math.floor(START_YEAR + s.time * YEARS_PER_SECOND), key, text, era };
  s.news = [item, ...s.news].slice(0, 40);
}
function pending(s: GameState, c: Content): Derived['pendingReckoning'] {
  if ((s as unknown as { _forcePending?: boolean })._forcePending) return { cause: 'collapse', era: 'steam' };
  for (const id of eraIds(c)) {
    const es = s.eras[id], def = c.eras[id];
    if (!es.open) continue;
    if (def.resourceKind === 'stock' && es.reserve <= 0) return { cause: 'exhausted', era: id };
    if (es.pressure >= def.collapseAt) return { cause: 'collapse', era: id };
  }
  return null;
}

function step(s: GameState, c: Content, dt: number): void {
  s.time += dt;
  let income = 0;
  for (const id of eraIds(c)) {
    const es = s.eras[id], def = c.eras[id];
    if (!es.open) {
      const prev = ERA_ORDER[ERA_ORDER.indexOf(id) - 1];
      if (prev && s.eras[prev]?.open && def.unlock && calc(s, c, prev).ps < def.unlock.prevServicePriceBelow && s.meta.reckonings >= def.unlock.minReckonings) {
        es.open = true; const k = calc(s, c, id); es.baseR = k.R || 1; es.baseD = k.D || 1; es.basePs = k.ps; news(s, c, 'eraOpened', { era: def.name }, id);
      }
      continue;
    }
    es.openFor += dt;
    const k = calc(s, c, id);
    es.eta = k.eta;
    for (const a of def.applications) {
      const st = es.apps[a.id];
      if (!st.available && k.ps <= a.visibleBelow) { st.available = true; if (a.foundCost === 0) st.founded = true; else news(s, c, 'appAvailable', { app: a.name, service: def.service.name.toLowerCase() }, id); }
      st.peakD = Math.max(st.peakD, k.apps[a.id].d);
      if (a.reserveGainPerService && def.resourceKind === 'stock') { es.reserve += k.apps[a.id].d * a.reserveGainPerService * dt; es.reserveMax += k.apps[a.id].d * a.reserveGainPerService * dt; }
    }
    if (es.baseR <= 0) { es.baseR = k.R || 1; es.baseD = k.D || 1; }
    es.reserve = Math.max(0, es.reserve - k.R * dt);
    es.pressure = Math.max(0, es.pressure + k.R * def.pressureIntensity * dt - es.pressure * def.absorption * dt);
    while (es.crisesFired < def.crisisAt.length && es.pressure >= def.crisisAt[es.crisesFired] * def.collapseAt) {
      es.crisesFired++; s.mandate += c.global.crisisMandate; news(s, c, 'crisis', {}, id);
    }
    const prevSmooth = es.smoothR || k.R;
    es.smoothR = prevSmooth + (k.R - prevSmooth) * Math.min(1, dt / 20);
    es.trendR = prevSmooth > 0 ? ((es.smoothR - prevSmooth) / prevSmooth) / (dt * YEARS_PER_SECOND) : 0;
    es.peakR = Math.max(es.peakR, k.R);
    if (!es.backfired && es.eta > def.baseEta && k.R > es.baseR) { es.backfired = true; news(s, c, 'backfire', {}, id); }
    s.run.resourceUsed[id] = (s.run.resourceUsed[id] || 0) + k.R * dt;
    income += k.income;
  }
  s.capital += income * dt;
  const w = wellbeing(s, c);
  s.run.peakWellbeing = Math.max(s.run.peakWellbeing, w);
  let upkeep = 0;
  for (const l of c.levers) { const ls = s.levers[l.id]; if (ls && ls.level > 0) upkeep += l.levels[ls.level - 1].mandateUpkeep; }
  if (s.flags.revealed || s.mandate > 0) s.mandate = Math.max(0, s.mandate + (Math.max(0, w - c.global.mandateFloor) * c.global.mandateRate - upkeep) * dt);
  s.population += Math.max(0, w - c.global.subsistence) * c.global.popGrowth * dt;
  s.peakPopulation = Math.max(s.peakPopulation, s.population);
  const lastT = s.history.length ? s.history[s.history.length - 1].time : -99;
  if (s.time - lastT >= 5) {
    const eras: GameState['history'][number]['eras'] = {};
    for (const id of eraIds(c)) if (s.eras[id].open) { const k = calc(s, c, id); eras[id] = [k.eta / c.eras[id].baseEta, k.R / (s.eras[id].baseR || 1)]; }
    s.history.push({ time: s.time, eras, wellbeing: w });
    if (s.history.length > 240) s.history = s.history.filter((_, i) => i % 2 === 0 || i > 120);
  }
}

export interface MockOpts { reveal?: boolean; rich?: boolean; pending?: boolean; won?: boolean; light?: boolean; }

export function makeMockModel(opts: MockOpts = {}): ModelApi {
  const freshMeta = (): MetaState => ({ hindsight: 0, hindsightEarned: 0, reckonings: 0, knowhow: {}, institutions: {}, achievements: {}, steadyEras: {}, furthestEra: 1, totalSeconds: 0 });
  const api: ModelApi = {
    createState(c, meta, seed) {
      const eras = {} as Record<EraId, EraState>;
      for (const id of ERA_ORDER) {
        const def = c.eras[id];
        const apps: EraState['apps'] = {};
        if (def) for (const a of def.applications) apps[a.id] = { available: a.visibleBelow === Infinity, founded: a.visibleBelow === Infinity && a.foundCost === 0, satMul: 1, peakD: 0 };
        eras[id] = { open: id === 'steam', openFor: 0, eta: def?.baseEta ?? 1, reserve: def?.reserve ?? 0, reserveMax: def?.reserve ?? 0, pressure: 0, crisesFired: 0, apps, baseR: 0, baseD: 0, basePs: 0, smoothR: 0, trendR: 0, peakR: 0, steadyYears: 0, backfired: false };
      }
      const m = meta ? clone(meta) : freshMeta();
      const s: GameState = {
        version: 1, seed: seed ?? 1, time: 0, capital: c.global.startCapital, mandate: 0, population: 1, peakPopulation: 1, upgrades: {}, levers: {}, eras,
        flags: { revealed: !!m.institutions['in.stats'], won: false }, steadyYearsAll: 0, news: [], history: [], run: { peakWellbeing: 0, decoupledYears: 0, resourceUsed: {}, clicks: 0 }, meta: m,
      };
      for (const l of c.levers) s.levers[l.id] = { level: 0, ref: 0 };
      if (!meta && opts.rich) {
        s.capital = 2e5; s.upgrades = { 'steam.boilers': 1, 'steam.condenser': 1 }; s.eras.steam.apps['steam.mills'] = { available: true, founded: true, satMul: 1, peakD: 0 };
        if (opts.reveal) { s.upgrades['steam.coalQuestion'] = 1; s.flags.revealed = true; s.mandate = 220; }
        for (let i = 0; i < 300; i++) step(s, c, 1);
        s.eras.steam.pressure = s.eras.steam.pressure + c.eras.steam.collapseAt * 0.45;
        if (opts.light && s.eras.light) { s.eras.light.open = true; s.eras.light.baseR = 50; s.eras.light.baseD = 50; for (let i = 0; i < 30; i++) step(s, c, 1); }
        s.meta.lastRun = { cause: 'exhausted', causeEra: 'steam', seconds: 2100, yearReached: 1885, hindsightGained: 42, peakWellbeing: 36, eras: { steam: { etaFold: 12, peakRFold: 2.1, resourceUsed: 5.2e5 }, light: { etaFold: 3, peakRFold: 4.4, resourceUsed: 8e4 } } };
        s.meta.hindsight = 42; s.meta.reckonings = 1; s.meta.achievements = { firstReckoning: true, backfire: true };
      } else if (!meta && opts.reveal) { s.flags.revealed = true; }
      if (opts.pending && !meta) (s as unknown as { _forcePending: boolean })._forcePending = true;
      if (opts.won && !meta) (s as unknown as { _winAt: number })._winAt = s.time + 3;
      return s;
    },
    tick(s0, c, dt) {
      if (pending(s0, c)) return s0;
      const s = clone(s0);
      step(s, c, dt);
      const w = s as unknown as { _winAt?: number };
      if (w._winAt && s.time >= w._winAt) { s.flags.won = true; delete w._winAt; }
      return s;
    },
    fastForward(s0, c, seconds) {
      const s = clone(s0);
      const total = Math.min(seconds, c.global.offlineCapSeconds);
      for (let t = 0; t < total; t += 5) { if (pending(s, c)) break; step(s, c, Math.min(5, total - t)); }
      return s;
    },
    derive(s, c) {
      const eras: Derived['eras'] = {};
      let income = 0;
      for (const id of eraIds(c)) {
        const es = s.eras[id], def = c.eras[id];
        if (!es.open) continue;
        const k = calc(s, c, id);
        const etaFold = k.eta / def.baseEta, baseR = es.baseR || k.R || 1;
        const promisedR = baseR / etaFold;
        const rebound = etaFold > 1.0001 ? (k.R - promisedR) / (baseR - promisedR) : null;
        const apps: EraDerived['apps'] = {};
        for (const a of def.applications) {
          const st = es.apps[a.id];
          apps[a.id] = { available: st.available, founded: st.founded, demand: k.apps[a.id].d, adoption: k.apps[a.id].ad, canFound: st.available && !st.founded && s.capital >= a.foundCost };
        }
        eras[id] = {
          eta: k.eta, etaFold, resourcePrice: k.pr, servicePrice: k.ps, demand: k.D, resourceUse: k.R, rFold: k.R / baseR, promisedR, rebound, income: k.income,
          reserveFraction: es.reserveMax > 0 ? es.reserve / es.reserveMax : 1, secondsLeft: k.R > 0 ? es.reserve / k.R : Infinity, pressureFraction: es.pressure / def.collapseAt,
          trendR: es.trendR, decoupling: es.trendR < 0 && wellbeing(s, c) >= c.global.wellbeingTarget, steadyYears: es.steadyYears, wellbeingShare: 0, apps,
        };
        income += k.income;
      }
      let nextEra: Derived['nextEra'] = null;
      for (const id of eraIds(c)) {
        if (s.eras[id].open) continue;
        const def = c.eras[id], prev = ERA_ORDER[ERA_ORDER.indexOf(id) - 1];
        nextEra = { id, priceNow: prev && eras[prev] ? eras[prev]!.servicePrice : NaN, priceNeeded: def.unlock?.prevServicePriceBelow ?? 0, reckoningsNeeded: def.unlock?.minReckonings ?? 0, reckoningsHave: s.meta.reckonings };
        break;
      }
      const w = wellbeing(s, c);
      return {
        year: START_YEAR + s.time * YEARS_PER_SECOND, wellbeing: w, incomePerSec: income,
        mandatePerSec: s.flags.revealed ? Math.max(0, w - c.global.mandateFloor) * c.global.mandateRate : 0, populationGrowthPerSec: 0,
        pendingReckoning: pending(s, c), hindsightIfReckonNow: api.hindsightOnReckon(s, c), eras, nextEra,
      };
    },
    click(s0, c) {
      const s = clone(s0);
      const inc = api.derive(s0, c).incomePerSec;
      s.capital += c.global.clickFlat + c.global.clickSeconds * inc; s.run.clicks++;
      return s;
    },
    buyUpgrade(s0, c, id) {
      const v = api.upgradeViews(s0, c).find((u) => u.def.id === id);
      if (!v || !v.visible || !v.affordable || v.maxed) return s0;
      const s = clone(s0);
      s.capital -= v.cost; s.upgrades[id] = (s.upgrades[id] || 0) + 1;
      for (const e of v.def.effects) {
        if (e.type === 'reveal') { s.flags.revealed = true; news(s, c, 'reveal'); }
        if (e.type === 'reserveAdd') { const es = s.eras[e.era]; es.reserve += e.value * c.eras[e.era].reserve; es.reserveMax += e.value * c.eras[e.era].reserve; }
      }
      if (v.def.kind === 'efficiency') news(s, c, 'efficiency', {}, v.def.era);
      return s;
    },
    foundApp(s0, c, appId) {
      for (const id of eraIds(c)) {
        const a = c.eras[id].applications.find((x) => x.id === appId);
        const st = a && s0.eras[id].apps[appId];
        if (a && st && st.available && !st.founded && s0.capital >= a.foundCost) {
          const s = clone(s0); s.capital -= a.foundCost; s.eras[id].apps[appId].founded = true; news(s, c, 'appFounded', { app: a.name }, id); return s;
        }
      }
      return s0;
    },
    setLever(s0, c, id, level) {
      const def = c.levers.find((l) => l.id === id), cur = s0.levers[id]?.level ?? 0;
      if (!def || level < 0 || level > def.levels.length || level === cur) return s0;
      const s = clone(s0);
      if (level > cur) {
        const cost = def.levels[level - 1].mandateCost;
        if (level !== cur + 1 || s.mandate < cost) return s0;
        s.mandate -= cost;
        if (cur === 0) s.levers[id] = { level, ref: calc(s, c, def.era).ps };
        news(s, c, 'leverEnacted', {}, def.era);
      }
      s.levers[id] = { ...(s.levers[id] || { ref: 0 }), level };
      return s;
    },
    reckon(s0, c) {
      const p = pending(s0, c);
      const h = api.hindsightOnReckon(s0, c);
      const meta = clone(s0.meta);
      meta.hindsight += h; meta.hindsightEarned += h; meta.reckonings++; meta.achievements.firstReckoning = true; meta.totalSeconds += s0.time;
      const eras: NonNullable<MetaState['lastRun']>['eras'] = {};
      for (const id of eraIds(c)) if (s0.eras[id].open) eras[id] = { etaFold: etaOf(s0, c, id) / c.eras[id].baseEta, peakRFold: s0.eras[id].peakR / (s0.eras[id].baseR || 1), resourceUsed: s0.run.resourceUsed[id] || 0 };
      meta.lastRun = { cause: p?.cause ?? 'chosen', causeEra: p?.era, seconds: s0.time, yearReached: Math.floor(START_YEAR + s0.time * YEARS_PER_SECOND), hindsightGained: h, peakWellbeing: s0.run.peakWellbeing, eras };
      return api.createState(c, meta, s0.seed + 1);
    },
    buyKnowhow(s0, c, id) {
      const k = c.knowhow.find((x) => x.id === id); const lvl = s0.meta.knowhow[id] || 0;
      if (!k || lvl >= k.maxLevel) return s0;
      const cost = k.cost * Math.pow(k.costGrowth, lvl);
      if (s0.meta.hindsight < cost) return s0;
      const s = clone(s0); s.meta.hindsight -= cost; s.meta.knowhow[id] = lvl + 1; return s;
    },
    buyInstitution(s0, c, id) {
      const k = c.institutions.find((x) => x.id === id);
      if (!k || s0.meta.institutions[id] || s0.meta.hindsight < k.cost || (k.requires || []).some((r) => !s0.meta.institutions[r])) return s0;
      const s = clone(s0); s.meta.hindsight -= k.cost; s.meta.institutions[id] = true;
      if (k.effects.some((e) => e.type === 'reveal')) s.flags.revealed = true;
      return s;
    },
    upgradeViews(s, c) {
      return c.upgrades.map((u): UpgradeView => {
        const level = s.upgrades[u.id] || 0;
        const cost = u.cost * Math.pow(u.costGrowth || 1, level);
        const maxed = u.repeatable ? level >= (u.maxLevel ?? Infinity) : level >= 1;
        const visible = !!s.eras[u.era]?.open && (u.requires || []).every((r) => s.upgrades[r]);
        let promised: number | null = null, projected: number | null = null;
        if (u.kind === 'efficiency') {
          promised = 1 / u.effects.reduce((m, e) => (e.type === 'etaMul' ? m * e.value : m), 1) - 1;
          if (s.flags.revealed && visible && !maxed) {
            const before = calc(s, c, u.era).R; const t = clone(s); t.upgrades[u.id] = level + 1; const after = calc(t, c, u.era).R;
            projected = before > 0 ? after / before - 1 : null;
          }
        }
        return { def: u, level, cost, visible, affordable: s.capital >= cost, maxed, promisedChange: promised, projectedChange: projected };
      });
    },
    leverViews(s, c) {
      return c.levers.map((l): LeverView => {
        const level = s.levers[l.id]?.level ?? 0;
        const next = l.levels[level];
        return { def: l, level, visible: s.flags.revealed && !!s.eras[l.era]?.open, nextCost: next ? next.mandateCost : null, canRaise: !!next && s.mandate >= next.mandateCost, upkeep: level > 0 ? l.levels[level - 1].mandateUpkeep : 0 };
      });
    },
    hindsightOnReckon(s, c) {
      const g = c.global.hindsight;
      return Math.floor(s.run.peakWellbeing * g.perPeakWellbeing + s.run.decoupledYears * g.perDecoupledYear);
    },
    serialize(s) { return JSON.stringify(s, (_k, v) => (v === Infinity ? 1e308 : v)); },
    deserialize(text, c) {
      try { const s = JSON.parse(text) as GameState; if (!s || typeof s !== 'object' || !s.eras || !s.meta) return null; void c; return s; } catch { return null; }
    },
  };
  return api;
}
