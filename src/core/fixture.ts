/**
 * Test-only Content fixture (M1 contract). Self-contained: Steam is exactly the DESIGN.md reference economy; the other
 * sectors are minimal but exercise every mechanic (spill, lock-in, autoEta, flow resource, service pressure, upkeep,
 * drawsOn), and there is at least one lever of every LeverKind. M1 mechanisms covered: three ages (Light with a
 * firstYear and a theme override), unlocks by `when` (labelled), by `after` and by the deprecated price gate, lever
 * `repeat` and `recycle`, locked items with an `unlock`, two fork pairs, a Know-how tree with tiers and a branch, an
 * institution with levels and two seats, demography, steady (decade effects, firstSteadyEffects), levy, an achievement
 * with `when`, and sector headlines. Never imported by the game.
 */
import type { AppState, Content, HeadlineKey, LeverDef, SectorDef, SectorId, UpgradeDef } from '../types';

const sector = (o: Partial<SectorDef> & Pick<SectorDef, 'id' | 'applications'>): SectorDef => ({
  name: o.id[0].toUpperCase() + o.id.slice(1), years: '', tagline: '', service: { name: `${o.id} service`, unit: 'u' },
  resource: { name: `${o.id} resource`, unit: 'u' }, pressure: { name: 'Smog', crisisName: 'Crisis' },
  basePrice: 1, capCost: 0.04, margin: 0.2, baseEta: 1, autoEtaRate: 0, resourceKind: 'stock',
  reserve: 1_000_000, alpha: 0.6, pressureSource: 'resource', pressureIntensity: 0.0001, absorption: 0.01,
  collapseAt: 100, crisisAt: [0.4, 0.7], pressureWellbeingCost: 10, pressureUpkeep: 0, wellbeingWeight: 5,
  wellbeingScale: 100, ...o,
});

const app = (id: string, halfPrice: number, saturation: number, steepness: number, visibleBelow = Infinity, foundCost = 0) =>
  ({ id, name: id, blurb: '', icon: 'x', halfPrice, saturation, steepness, visibleBelow, foundCost });

/** Steam per DESIGN.md: p0 1, c 0.04, m 0.2, alpha 0.6, the four reference applications. */
const steam = sector({
  id: 'steam', accent: 'brass', basePrice: 1, capCost: 0.04, margin: 0.2, alpha: 0.6, reserve: 300_000,
  pressureIntensity: 0.002, absorption: 0.01, collapseAt: 100, crisisAt: [0.4, 0.7], pressureWellbeingCost: 15,
  wellbeingWeight: 12, wellbeingScale: 50,
  applications: [
    { ...app('steam.pumping', 1.5, 40, 1.5), reserveGainPerService: 0.1 },
    app('steam.mills', 0.6, 300, 2.0, 0.8, 500),
    app('steam.railways', 0.3, 1200, 2.2, 0.5, 5_000),
    app('steam.steamships', 0.15, 3000, 2.4, 0.3, 12_000),
  ],
});

/** Opens on milestones restraint does not block (labelled `when`), after one Reckoning; own clock from 1870. */
const light = sector({
  id: 'light', firstYear: 1870, theme: 'gaslight', capCost: 0.05, reserve: 5_000_000, spill: { to: 'steam', rate: 0.4 },
  unlock: {
    minReckonings: 1,
    when: {
      all: [
        { owns: 'steam.condenser', label: 'Own the Separate condenser' },
        { stat: 'serviceDelivered', sector: 'steam', op: '>=', value: 2_000, label: 'Deliver 2k hp·years of power' },
      ],
    },
  },
  applications: [app('light.lamps', 1.2, 300, 1.5), app('light.homes', 0.25, 3000, 2.2, 0.4, 1_000)],
});

/** The deprecated price gate (no `when`). */
const motion = sector({
  id: 'motion', firstYear: 1950, reserve: 10_000_000, spill: { to: 'light', rate: 0.3 },
  unlock: { prevServicePriceBelow: 0.12, minReckonings: 2 },
  applications: [app('motion.delivery', 1.4, 2000, 1.5), { ...app('motion.suburbs', 0.3, 20_000, 2.2, 0.45, 2_000), lockIn: 0.8 }],
});

/** `after` names its predecessor explicitly; an unlabelled `when` exercises the fallback labels. */
const compute = sector({
  id: 'compute', capCost: 0.02, autoEtaRate: 0.005, reserve: 50_000_000, spill: { to: 'motion', rate: 0.4 },
  unlock: { minReckonings: 3, after: ['motion'], when: { owns: 'motion.injection' } },
  applications: [app('compute.sheets', 0.6, 40_000, 1.5)],
});

/** Flow resource (attention), pressure from service, maintenance upkeep, draws on Compute; own clock from 2025. */
const code = sector({
  id: 'code', firstYear: 2025, theme: 'agentic', capCost: 0.02, resourceKind: 'flow', reserve: 1_000, alpha: 0.5,
  pressureSource: 'service', pressureIntensity: 0.001, absorption: 0, collapseAt: 1_000, crisisAt: [0.3, 0.6],
  pressureUpkeep: 0.5, wellbeingWeight: 4, wellbeingScale: 1_000, drawsOn: { sector: 'compute', perService: 0.5 },
  unlock: { minReckonings: 4, when: { all: [{ stat: 'appsFounded', sector: 'compute', op: '>=', value: 1 }, { flag: 'revealed' }] } },
  applications: [app('code.tools', 1.5, 20_000, 1.5), app('code.agents', 0.05, 1_000_000, 3, 0.1, 10_000)],
});

const effUp = (id: string, s: SectorId, cost: number, m: number, requires?: string[]): UpgradeDef =>
  ({ id, sector: s, name: id, blurb: '', kind: 'efficiency', cost, effects: [{ type: 'etaMul', sector: s, value: m }], ...(requires ? { requires } : {}) });

/** η steps 1 → 1.5 → 2.5 → 3.5 → 5 → 8 → 12 → 18. */
const STEAM_ETA = [1, 1.5, 2.5, 3.5, 5, 8, 12, 18];
const STEAM_COSTS = [400, 3_000, 6_500, 10_000, 15_000, 22_000, 32_000];
export const STEAM_EFFICIENCY = ['boilers', 'condenser', 'doubleActing', 'highPressure', 'compound', 'triple', 'turbine']
  .map((n) => `steam.${n}`);
/** The Steam fork pairs: [a, b] exclude each other. */
export const STEAM_FORKS: [string, string][] = [['steam.premium', 'steam.pirate'], ['steam.parliamentary', 'steam.firstClass']];

const upgrades: UpgradeDef[] = [
  ...STEAM_EFFICIENCY.map((id, i) => effUp(id, 'steam', STEAM_COSTS[i], STEAM_ETA[i + 1] / STEAM_ETA[i], i ? [STEAM_EFFICIENCY[i - 1]] : undefined)),
  { id: 'steam.lathe', sector: 'steam', name: 'Lathe', blurb: '', kind: 'capital', cost: 2_000, requires: ['steam.boilers'],
    effects: [{ type: 'capCostMul', sector: 'steam', value: 0.8 }] },
  { id: 'steam.deeperShaft', sector: 'steam', name: 'Shaft', blurb: '', kind: 'prospect', cost: 4_000, repeatable: true,
    costGrowth: 2, maxLevel: 3, effects: [{ type: 'reserveAdd', sector: 'steam', value: 0.25 }] },
  { id: 'steam.coalQuestion', sector: 'steam', name: 'The Coal Question', blurb: '', kind: 'research', cost: 4_000,
    requires: ['steam.condenser'], effects: [{ type: 'reveal' }] },
  // fork 1: Boulton & Watt's premium (η up, a royalty) against pirate engines (cheaper, smaller η gain)
  { id: 'steam.premium', sector: 'steam', name: 'Pay the premium', blurb: '', kind: 'efficiency', cost: 1_500,
    requires: ['steam.boilers'], excludes: ['steam.pirate'],
    effects: [{ type: 'etaMul', sector: 'steam', value: 1.2 }, { type: 'marginAdd', sector: 'steam', value: -0.02 }] },
  { id: 'steam.pirate', sector: 'steam', name: 'Pirate engines', blurb: '', kind: 'efficiency', cost: 1_200,
    requires: ['steam.boilers'], excludes: ['steam.premium'],
    effects: [{ type: 'etaMul', sector: 'steam', value: 1.1 }, { type: 'capCostMul', sector: 'steam', value: 0.9 }] },
  // fork 2: parliamentary trains (more railway demand, lower margin) against first class only
  { id: 'steam.parliamentary', sector: 'steam', name: 'Parliamentary trains', blurb: '', kind: 'capital', cost: 2_500,
    requires: ['steam.condenser'], excludes: ['steam.firstClass'],
    effects: [{ type: 'halfPriceMul', sector: 'steam', app: 'steam.railways', value: 1.3 }, { type: 'marginAdd', sector: 'steam', value: -0.01 }] },
  { id: 'steam.firstClass', sector: 'steam', name: 'First class only', blurb: '', kind: 'capital', cost: 2_500,
    requires: ['steam.condenser'], excludes: ['steam.parliamentary'],
    effects: [{ type: 'satMul', sector: 'steam', app: 'steam.railways', value: 0.8 }, { type: 'marginAdd', sector: 'steam', value: 0.02 }] },
  // unlocks a locked upgrade and a locked lever; pays one-offs
  { id: 'steam.institute', sector: 'steam', name: 'Mechanics Institute', blurb: '', kind: 'research', cost: 3_000,
    requires: ['steam.condenser'],
    effects: [{ type: 'unlock', id: 'steam.superheat' }, { type: 'unlock', id: 'steam.carbonTax' }, { type: 'mandateAdd', value: 25 }, { type: 'capitalAdd', value: 10 }] },
  { id: 'steam.superheat', sector: 'steam', name: 'Superheating', blurb: '', kind: 'capital', cost: 2_000, locked: true,
    effects: [{ type: 'capCostMul', sector: 'steam', value: 0.9 }] },
  effUp('light.mantle', 'light', 5_000, 4), effUp('light.tungsten', 'light', 20_000, 4, ['light.mantle']),
  effUp('motion.injection', 'motion', 20_000, 5), effUp('motion.hybrid', 'motion', 80_000, 5, ['motion.injection']),
  effUp('compute.gpu', 'compute', 100_000, 5), effUp('compute.asic', 'compute', 400_000, 5, ['compute.gpu']),
  effUp('code.agent', 'code', 100_000, 5), effUp('code.fleet', 'code', 500_000, 5, ['code.agent']),
  { id: 'code.capacity', sector: 'code', name: 'Hire', blurb: '', kind: 'prospect', cost: 50_000,
    effects: [{ type: 'reserveAdd', sector: 'code', value: 0.5 }] },
];

const L = (mandateCost: number, mandateUpkeep: number, value: number, value2?: number) =>
  ({ mandateCost, mandateUpkeep, value, ...(value2 !== undefined ? { value2 } : {}), label: `${value}` });
const lever = (id: string, s: SectorId, kind: LeverDef['kind'], levels: ReturnType<typeof L>[], extra: Partial<LeverDef> = {}): LeverDef =>
  ({ id, sector: s, kind, name: id, blurb: '', catch: 'a catch', levels, ...extra });

const levers: LeverDef[] = [
  lever('steam.duty', 'steam', 'duty', [L(100, 0.05, 0.3), L(300, 0.12, 0.6), L(900, 0.3, 0.9)], { recycle: ['treasury', 'dividend'] }),
  // cap as a fraction of the budget line; Tighten twice more (0.2, 0.1; 0.0 is out of the cap's range)
  lever('steam.cap', 'steam', 'cap', [L(120, 0.06, 1.0, 3), L(360, 0.15, 0.8, 3), L(1_000, 5, 0.3, 1)],
    { repeat: { valueStep: -0.1, costGrowth: 1.5, upkeepGrowth: 1.2, label: 'Cap at {pct}% of budget' } }),
  // sufficiency repeat bounded by maxSteps (0.4, 0.3, 0.2)
  lever('steam.sufficiency', 'steam', 'sufficiency', [L(80, 0.02, 0.8, 0.01), L(240, 0.05, 0.5, 0.02)],
    { repeat: { valueStep: -0.1, value2Step: 0.005, costGrowth: 2, upkeepGrowth: 1.5, maxSteps: 3 } }),
  lever('steam.substitution', 'steam', 'substitution', [L(110, 0.05, 0.2, 100), L(330, 0.12, 0.5, 1_000_000)]),
  lever('steam.circularity', 'steam', 'circularity', [L(90, 0.02, 0.2), L(270, 0.05, 0.5)]),
  lever('steam.carbonTax', 'steam', 'duty', [L(150, 0.05, 0.5)], { locked: true }),
  lever('light.greenSpending', 'light', 'greenSpending', [L(140, 0.03, 0.5), L(420, 0.08, 1)]),
  lever('code.deletion', 'code', 'deletion', [L(600, 0.3, 0.1, 0.01), L(1_800, 0.75, 0.3, 0.01)]),
  lever('code.reviewGate', 'code', 'reviewGate', [L(500, 0.12, 0.5), L(1_500, 0.3, 1)]),
  lever('code.sharedLibs', 'code', 'sharedLibs', [L(450, 0.1, 0.5)], { requires: ['inst.stats'] }),
];

export const HEADLINE_KEYS: HeadlineKey[] = [
  'appFounded', 'appAvailable', 'sectorOpened', 'crisis', 'collapse', 'exhausted', 'backfire', 'reveal', 'leverEnacted',
  'leverLapsed', 'steadySector', 'steadyAll', 'reckoning', 'efficiency', 'ageBegins', 'budgetDrawn', 'decade', 'budgetBroken',
];
const headlines = Object.fromEntries(HEADLINE_KEYS.map((k) => [k, [`${k}: {sector} {age} {app} {resource} {service} {year} #{n}`]])) as Record<HeadlineKey, string[]>;
headlines.leverLapsed = []; // exercises the plain fallback

export const fixture: Content = {
  sectors: { steam, light, motion, compute, code },
  sectorOrder: ['steam', 'light', 'motion', 'compute', 'code'],
  ages: [
    { id: 'coal', name: 'The Coal Age', tagline: '', yearSpan: [1780, 1914], theme: 'ledger', sectors: ['steam', 'light'] },
    { id: 'acceleration', name: 'The Great Acceleration', tagline: '', yearSpan: [1909, 2010], theme: 'chrome', sectors: ['motion'] },
    { id: 'attention', name: 'The Attention Age', tagline: '', yearSpan: [2000, 2100], theme: 'terminal', sectors: ['compute', 'code'] },
  ],
  upgrades,
  levers,
  knowhow: [
    // tree 'engines': tier 1, then a tier-2 fork (branch 'school')
    { id: 'kh.engines', name: 'Engines', blurb: '', cost: 2, costGrowth: 1.5, maxLevel: 5, tree: 'engines', tier: 1,
      effects: [{ type: 'etaMul', sector: 'steam', value: 1.15 }, { type: 'satMul', sector: 'steam', value: 1.05 }] },
    { id: 'kh.cornish', name: 'Cornish school', blurb: '', cost: 4, costGrowth: 2, maxLevel: 2, tree: 'engines', tier: 2, branch: 'school',
      effects: [{ type: 'etaMul', sector: 'steam', value: 1.2 }, { type: 'halfPriceMul', sector: 'steam', value: 1.1 }] },
    { id: 'kh.manchester', name: 'Manchester school', blurb: '', cost: 4, costGrowth: 2, maxLevel: 2, tree: 'engines', tier: 2, branch: 'school',
      effects: [{ type: 'capCostMul', sector: 'steam', value: 0.85 }] },
    { id: 'kh.seed', name: 'Seed', blurb: '', cost: 1, costGrowth: 1.5, maxLevel: 5, effects: [{ type: 'startCapitalMul', value: 2 }] },
    { id: 'kh.patents', name: 'Patents', blurb: '', cost: 3, costGrowth: 2, maxLevel: 3, effects: [{ type: 'costMul', value: 0.9 }] },
    { id: 'kh.chair', name: 'A chair in political economy', blurb: '', cost: 4, costGrowth: 1, maxLevel: 1,
      effects: [{ type: 'slotAdd', value: 1 }, { type: 'mandateAdd', value: 10 }] },
  ],
  institutions: [
    { id: 'inst.stats', name: 'Statistics Office', blurb: '', cost: 3, effects: [{ type: 'reveal' }] },
    { id: 'inst.duty', name: 'Standing duty', blurb: '', cost: 5, requires: ['inst.stats'], effects: [{ type: 'startLever', lever: 'steam.duty', level: 1 }] },
    { id: 'inst.cleanAir', name: 'Clean air', blurb: '', cost: 4, slots: 2,
      effects: [{ type: 'absorptionAdd', sector: 'steam', value: 0.005 }, { type: 'mandateRateMul', value: 1.5 }, { type: 'mandateAdd', value: 999 }],
      nextLevels: [
        { cost: 6, effects: [{ type: 'absorptionAdd', sector: 'steam', value: 0.005 }], label: 'Cleaner still' },
        { cost: 9, effects: [{ type: 'wellbeingAdd', value: 2 }, { type: 'popGrowthMul', value: 0.5 }], label: 'Parks' },
      ] },
    { id: 'inst.capStanding', name: 'Standing cap', blurb: '', cost: 6, effects: [{ type: 'startLever', lever: 'steam.cap', level: 1 }] },
  ],
  achievements: [
    ...['firstReckoning', 'backfire', 'jevonsWasRight', 'degrowthByAccident', 'steadyState'].map((id) => ({ id, name: id, blurb: '' })),
    { id: 'bigSteam', name: 'Big steam', blurb: '', when: { stat: 'serviceDelivered', sector: 'steam', op: '>=', value: 1_000 } },
    { id: 'neverGranted', name: 'Never', blurb: '' },
  ],
  headlines,
  sectorHeadlines: { steam: { crisis: ['Steam crisis {n} in {year}'], decade: [] } },
  global: {
    startCapital: 50, clickSeconds: 1, clickFlat: 2, popGrowth: 0.00002, subsistence: 8, wellbeingTarget: 28,
    mandateRate: 0.05, mandateFloor: 10, crisisMandate: 100, crisisPopLoss: 0.05,
    hindsight: {
      perWellbeingYear: 0.05, intensityExponent: 1, perBudgetDecade: 5, perUnburnt: 20, perFirstBackfire: 5,
      perSectorReached: 5, perSteadySector: 100,
    },
    offlineCapSeconds: 4 * 60 * 60,
    demography: { transitionWellbeing: 40 },
    steady: {
      budgetDeclinePerDecade: 0.05, decadeYears: 10,
      decadeEffects: [{ type: 'mandateAdd', value: 50 }, { type: 'wellbeingAdd', value: 1 }],
      firstSteadyEffects: [{ type: 'slotAdd', value: 1 }],
    },
    levy: { mandateShare: 0.1 },
    startingSlots: 2,
  },
};

export const STEAM_REFERENCE = { eta: STEAM_ETA, R: [202, 257, 321, 348, 355, 324, 269, 205] };

/** Convenience for tests: an AppState that is founded. */
export const FOUNDED: AppState = { available: true, founded: true, satMul: 1, peakD: 0 };
