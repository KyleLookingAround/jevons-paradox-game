/**
 * Test-only Content fixture. Self-contained: Era 1 is exactly the DESIGN.md reference economy; the other eras are
 * minimal but exercise every mechanic (spill, lock-in, autoEta, flow resource, service pressure, upkeep, drawsOn),
 * and there is at least one lever of every LeverKind. Never imported by the game.
 */
import type { AppState, Content, EraDef, EraId, HeadlineKey, UpgradeDef } from './types';

const era = (o: Partial<EraDef> & Pick<EraDef, 'id' | 'index' | 'applications'>): EraDef => ({
  name: o.id, years: '', tagline: '', service: { name: `${o.id} service`, unit: 'u' },
  resource: { name: `${o.id} resource`, unit: 'u' }, pressure: { name: 'Smog', crisisName: 'Crisis' },
  theme: 'ledger', basePrice: 1, capCost: 0.04, margin: 0.2, baseEta: 1, autoEtaRate: 0, resourceKind: 'stock',
  reserve: 1_000_000, alpha: 0.6, pressureSource: 'resource', pressureIntensity: 0.0001, absorption: 0.01,
  collapseAt: 100, crisisAt: [0.4, 0.7], pressureWellbeingCost: 10, pressureUpkeep: 0, wellbeingWeight: 5,
  wellbeingScale: 100, ...o,
});

const app = (id: string, halfPrice: number, saturation: number, steepness: number, visibleBelow = Infinity, foundCost = 0) =>
  ({ id, name: id, blurb: '', icon: 'x', halfPrice, saturation, steepness, visibleBelow, foundCost });

/** Era 1 per DESIGN.md: p0 1, c 0.04, m 0.2, alpha 0.6, the four reference applications. */
const steam = era({
  id: 'steam', index: 1, basePrice: 1, capCost: 0.04, margin: 0.2, alpha: 0.6, reserve: 300_000,
  pressureIntensity: 0.002, absorption: 0.01, collapseAt: 100, crisisAt: [0.4, 0.7], pressureWellbeingCost: 15,
  wellbeingWeight: 12, wellbeingScale: 50,
  applications: [
    { ...app('steam.pumping', 1.5, 40, 1.5), reserveGainPerService: 0.1 },
    app('steam.mills', 0.6, 300, 2.0, 0.8, 500),
    app('steam.railways', 0.3, 1200, 2.2, 0.5, 5_000),
    app('steam.steamships', 0.15, 3000, 2.4, 0.3, 12_000),
  ],
});

const light = era({
  id: 'light', index: 2, capCost: 0.05, reserve: 5_000_000, spill: { to: 'steam', rate: 0.4 },
  unlock: { prevServicePriceBelow: 0.1, minReckonings: 1 },
  applications: [app('light.lamps', 1.2, 300, 1.5), app('light.homes', 0.25, 3000, 2.2, 0.4, 1_000)],
});

const motion = era({
  id: 'motion', index: 3, reserve: 10_000_000, spill: { to: 'light', rate: 0.3 },
  unlock: { prevServicePriceBelow: 0.12, minReckonings: 2 },
  applications: [app('motion.delivery', 1.4, 2000, 1.5), { ...app('motion.suburbs', 0.3, 20_000, 2.2, 0.45, 2_000), lockIn: 0.8 }],
});

const compute = era({
  id: 'compute', index: 4, capCost: 0.02, autoEtaRate: 0.005, reserve: 50_000_000, spill: { to: 'motion', rate: 0.4 },
  unlock: { prevServicePriceBelow: 0.1, minReckonings: 3 },
  applications: [app('compute.sheets', 0.6, 40_000, 1.5)],
});

/** Era 5: flow resource (attention), pressure from service, maintenance upkeep, draws on Compute. */
const code = era({
  id: 'code', index: 5, capCost: 0.02, resourceKind: 'flow', reserve: 1_000, alpha: 0.5, pressureSource: 'service',
  pressureIntensity: 0.001, absorption: 0, collapseAt: 1_000, crisisAt: [0.3, 0.6], pressureUpkeep: 0.5,
  wellbeingWeight: 4, wellbeingScale: 1_000, drawsOn: { era: 'compute', perService: 0.5 },
  unlock: { prevServicePriceBelow: 0.08, minReckonings: 4 },
  applications: [app('code.tools', 1.5, 20_000, 1.5), app('code.agents', 0.05, 1_000_000, 3, 0.1, 10_000)],
});

const effUp = (id: string, e: EraId, cost: number, mul: number, requires?: string[]): UpgradeDef =>
  ({ id, era: e, name: id, blurb: '', kind: 'efficiency', cost, effects: [{ type: 'etaMul', era: e, value: mul }], ...(requires ? { requires } : {}) });

/** η steps 1 → 1.5 → 2.5 → 3.5 → 5 → 8 → 12 → 18. */
const STEAM_ETA = [1, 1.5, 2.5, 3.5, 5, 8, 12, 18];
const STEAM_COSTS = [400, 3_000, 6_500, 10_000, 15_000, 22_000, 32_000];
export const STEAM_EFFICIENCY = ['boilers', 'condenser', 'doubleActing', 'highPressure', 'compound', 'triple', 'turbine']
  .map((n) => `steam.${n}`);

const upgrades: UpgradeDef[] = [
  ...STEAM_EFFICIENCY.map((id, i) => effUp(id, 'steam', STEAM_COSTS[i], STEAM_ETA[i + 1] / STEAM_ETA[i], i ? [STEAM_EFFICIENCY[i - 1]] : undefined)),
  { id: 'steam.lathe', era: 'steam', name: 'Lathe', blurb: '', kind: 'capital', cost: 2_000, requires: ['steam.boilers'],
    effects: [{ type: 'capCostMul', era: 'steam', value: 0.8 }] },
  { id: 'steam.deeperShaft', era: 'steam', name: 'Shaft', blurb: '', kind: 'prospect', cost: 4_000, repeatable: true,
    costGrowth: 2, maxLevel: 3, effects: [{ type: 'reserveAdd', era: 'steam', value: 0.25 }] },
  { id: 'steam.coalQuestion', era: 'steam', name: 'The Coal Question', blurb: '', kind: 'research', cost: 4_000,
    requires: ['steam.condenser'], effects: [{ type: 'reveal' }] },
  effUp('light.mantle', 'light', 5_000, 4), effUp('light.tungsten', 'light', 20_000, 4, ['light.mantle']),
  effUp('motion.injection', 'motion', 20_000, 5), effUp('motion.hybrid', 'motion', 80_000, 5, ['motion.injection']),
  effUp('compute.gpu', 'compute', 100_000, 5), effUp('compute.asic', 'compute', 400_000, 5, ['compute.gpu']),
  effUp('code.agent', 'code', 100_000, 5), effUp('code.fleet', 'code', 500_000, 5, ['code.agent']),
  { id: 'code.capacity', era: 'code', name: 'Hire', blurb: '', kind: 'prospect', cost: 50_000,
    effects: [{ type: 'reserveAdd', era: 'code', value: 0.5 }] },
];

const L = (mandateCost: number, mandateUpkeep: number, value: number, value2?: number) =>
  ({ mandateCost, mandateUpkeep, value, ...(value2 !== undefined ? { value2 } : {}), label: `${value}` });
const lever = (id: string, e: EraId, kind: Content['levers'][number]['kind'], levels: ReturnType<typeof L>[]) =>
  ({ id, era: e, kind, name: id, blurb: '', catch: '', levels });

const levers: Content['levers'] = [
  lever('steam.duty', 'steam', 'duty', [L(100, 0.05, 0.3), L(300, 0.12, 0.6), L(900, 0.3, 0.9)]),
  lever('steam.cap', 'steam', 'cap', [L(120, 0.06, 0.9, 3), L(360, 0.15, 0.6, 3), L(1_000, 5, 0.3, 1)]),
  lever('steam.sufficiency', 'steam', 'sufficiency', [L(80, 0.02, 0.8, 0.01), L(240, 0.05, 0.5, 0.02)]),
  lever('steam.substitution', 'steam', 'substitution', [L(110, 0.05, 0.2, 100), L(330, 0.12, 0.5, 1_000_000)]),
  lever('steam.circularity', 'steam', 'circularity', [L(90, 0.02, 0.2), L(270, 0.05, 0.5)]),
  lever('light.greenSpending', 'light', 'greenSpending', [L(140, 0.03, 0.5), L(420, 0.08, 1)]),
  lever('code.deletion', 'code', 'deletion', [L(600, 0.3, 0.1, 0.01), L(1_800, 0.75, 0.3, 0.01)]),
  lever('code.reviewGate', 'code', 'reviewGate', [L(500, 0.12, 0.5), L(1_500, 0.3, 1)]),
  lever('code.sharedLibs', 'code', 'sharedLibs', [L(450, 0.1, 0.5)]),
];

const headlineKeys: HeadlineKey[] = [
  'appFounded', 'appAvailable', 'eraOpened', 'crisis', 'collapse', 'exhausted', 'backfire', 'reveal', 'leverEnacted',
  'leverLapsed', 'steadyEra', 'steadyAll', 'reckoning', 'efficiency',
];
const headlines = Object.fromEntries(headlineKeys.map((k) => [k, [`${k}: {era} {app} {resource} {service}`]])) as Record<HeadlineKey, string[]>;
headlines.leverLapsed = []; // exercises the plain fallback

export const fixture: Content = {
  eras: { steam, light, motion, compute, code },
  upgrades,
  levers,
  knowhow: [
    { id: 'kh.engines', name: 'Engines', blurb: '', cost: 2, costGrowth: 1.5, maxLevel: 5, effects: [{ type: 'etaMul', era: 'steam', value: 1.15 }] },
    { id: 'kh.seed', name: 'Seed', blurb: '', cost: 1, costGrowth: 1.5, maxLevel: 5, effects: [{ type: 'startCapitalMul', value: 2 }] },
    { id: 'kh.patents', name: 'Patents', blurb: '', cost: 3, costGrowth: 2, maxLevel: 3, effects: [{ type: 'costMul', value: 0.9 }] },
  ],
  institutions: [
    { id: 'inst.stats', name: 'Statistics Office', blurb: '', cost: 3, effects: [{ type: 'reveal' }] },
    { id: 'inst.duty', name: 'Standing duty', blurb: '', cost: 5, requires: ['inst.stats'], effects: [{ type: 'startLever', lever: 'steam.duty', level: 1 }] },
    { id: 'inst.cleanAir', name: 'Clean air', blurb: '', cost: 4, effects: [{ type: 'absorptionAdd', era: 'steam', value: 0.005 }, { type: 'mandateRateMul', value: 1.5 }] },
  ],
  achievements: ['firstReckoning', 'backfire', 'jevonsWasRight', 'degrowthByAccident', 'steadyState'].map((id) => ({ id, name: id, blurb: '' })),
  headlines,
  global: {
    startCapital: 50, clickSeconds: 1, clickFlat: 2, popGrowth: 0.00002, subsistence: 8, wellbeingTarget: 28,
    mandateRate: 0.05, mandateFloor: 10, crisisMandate: 100, crisisPopLoss: 0.05,
    hindsight: { perPeakWellbeing: 1, perDecoupledYear: 2, perEraReached: 5, perSteadyEra: 100 },
    offlineCapSeconds: 4 * 60 * 60,
  },
};

export const STEAM_REFERENCE = { eta: STEAM_ETA, R: [202, 257, 321, 348, 355, 324, 269, 205] };

/** Convenience for tests: an AppState that is founded. */
export const FOUNDED: AppState = { available: true, founded: true, satMul: 1, peakD: 0 };
