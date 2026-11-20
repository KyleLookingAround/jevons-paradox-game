/**
 * Test-only Content fixture (M2 contract). Self-contained: Steam is exactly the DESIGN.md reference economy; the other
 * sectors are minimal but exercise every mechanic (spill, lock-in, autoEta, flow resource, service pressure, upkeep,
 * drawsOn), and there is at least one lever of every LeverKind. M1 mechanisms covered: three ages (Light with a
 * firstYear and a theme override), unlocks by `when` (labelled), by `after` and by the deprecated price gate, lever
 * `repeat` and `recycle`, locked items with an `unlock`, two fork pairs, a Know-how tree with tiers and a branch, an
 * institution with levels and two seats, demography, steady (decade effects, firstSteadyEffects), levy, an achievement
 * with `when`, and sector headlines. M2 mechanisms covered: three paces, decade choices (two global pairs and a Light
 * override), clear-level overrides on Motion, Code with absorption 0, Steam with `settle`, four dividends, three Commons
 * projects (Light intensity; a time rebound through satMul; a repeatable one with Mandate cost and a one-off), three
 * Charters (with `requires`, with startFounded, with institutionLoan), institutions with orderUnlock (Civil Service;
 * Treasury rules with offlineCapAdd), upgrades with `stage`, `offline` (8 h, hold before a crisis), 'commons' recycle,
 * recycle wording, Know-how tree names, and headlines for the M2 keys. Never imported by the game.
 */
import type { AppState, CharterDef, CommonsDef, Content, DividendDef, HeadlineKey, LeverDef, PaceDef, SectorDef, SectorId, UpgradeDef } from '../types';

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
  settle: { dividend: [{ type: 'wellbeingAdd', value: 1 }, { type: 'mandateAdd', value: 30 }], upkeepPerSpill: 2, freeExcess: 0.05, blurb: 'Steam settles.' },
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
  steady: { decadeChoices: [['div.wellbeing', 'div.efficiency']] },
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
  steady: { clearBelow: 0.4, clearCeiling: 0.2 },
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

/** M2: machine stages of the Steam cards (condenser 1, compound 2, turbine 3). */
const STAGES: Record<string, number> = { 'steam.condenser': 1, 'steam.compound': 2, 'steam.turbine': 3 };
const upgrades: UpgradeDef[] = [
  ...STEAM_EFFICIENCY.map((id, i) => ({
    ...effUp(id, 'steam', STEAM_COSTS[i], STEAM_ETA[i + 1] / STEAM_ETA[i], i ? [STEAM_EFFICIENCY[i - 1]] : undefined),
    ...(STAGES[id] ? { stage: STAGES[id] } : {}),
  })),
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
  lever('steam.duty', 'steam', 'duty', [L(100, 0.05, 0.3), L(300, 0.12, 0.6), L(900, 0.3, 0.9)],
    { recycle: ['treasury', 'dividend', 'commons'], recycleBlurb: { dividend: 'Paid back per head; more people follow.' } }),
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
  'clearSkies', 'settled', 'unsettled', 'commonsBuilt', 'charter',
  'threshold', 'scarHealed', 'surveyed', 'arrears', 'foreignFleets', 'actEnding',
];
const headlines = Object.fromEntries(HEADLINE_KEYS.map((k) => [k, [`${k}: {sector} {age} {app} {resource} {service} {year} #{n}{name}`]])) as Record<HeadlineKey, string[]>;

/** M2: the paces (the first is the default), the dividends, the Commons and the Charters. */
export const PACES: PaceDef[] = [
  { id: 'gentle', name: 'Gentle', declinePerDecade: 0.05, dividendMul: 1 },
  { id: 'firm', name: 'Firm', declinePerDecade: 0.1, dividendMul: 1.5 },
  { id: 'severe', name: 'Severe', declinePerDecade: 0.2, dividendMul: 2.5 },
];
const dividends: DividendDef[] = [
  { id: 'div.mandate', name: 'A grant', blurb: '', effects: [{ type: 'mandateAdd', value: 40 }] },
  { id: 'div.capital', name: 'A bond', blurb: '', effects: [{ type: 'capitalAdd', value: 30 }] },
  { id: 'div.wellbeing', name: 'Public baths', blurb: '', effects: [{ type: 'wellbeingAdd', value: 1 }] },
  { id: 'div.efficiency', name: 'A prize', blurb: '', effects: [{ type: 'etaMul', sector: 'steam', value: 1.1 }, { type: 'mandateAdd', value: 10 }] },
];
const commons: CommonsDef[] = [
  { id: 'commons.library', name: 'The Free Library', blurb: '', icon: 'library', sector: 'light', cost: 1_000,
    wellbeing: { max: 6, perLevel: 2 }, intensity: { sector: 'light', perLevel: 0.5 } },
  { id: 'commons.park', name: 'The People’s Park', blurb: '', icon: 'park', cost: 800, costGrowth: 2, maxLevel: 3,
    wellbeing: { max: 4, perLevel: 1.5 }, effects: [{ type: 'satMul', sector: 'light', app: 'light.lamps', value: 1.2 }] },
  { id: 'commons.baths', name: 'Baths', blurb: '', icon: 'baths', cost: 500, costGrowth: 1.5, maxLevel: 5, mandateCost: 10,
    wellbeing: { max: 10, perLevel: 1 }, effects: [{ type: 'mandateAdd', value: 5 }] },
];
const charters: CharterDef[] = [
  { id: 'ch.coalfield', name: 'The Northern Coalfield', blurb: '', sector: 'steam', requires: { stat: 'reckonings', op: '>=', value: 1 },
    effects: [{ type: 'reserveAdd', sector: 'steam', value: 0.5 }, { type: 'satMul', sector: 'steam', value: 1.1 }, { type: 'mandateAdd', value: 999 }] },
  { id: 'ch.mills', name: 'Mills from the first minute', blurb: '', sector: 'steam', effects: [{ type: 'startFounded', app: 'steam.mills' }, { type: 'startFounded', app: 'light.homes' }] },
  { id: 'ch.loan', name: 'A borrowed office', blurb: '', effects: [{ type: 'institutionLoan', id: 'inst.stats', level: 1 }] },
];
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
    { id: 'inst.civil', name: 'Civil Service', blurb: '', cost: 5, effects: [{ type: 'orderUnlock', order: 'civilService' }] },
    { id: 'inst.treasury', name: 'Treasury rules', blurb: '', cost: 5,
      effects: [{ type: 'orderUnlock', order: 'treasury' }, { type: 'offlineCapAdd', seconds: 3_600 }] },
  ],
  achievements: [
    ...['firstReckoning', 'backfire', 'jevonsWasRight', 'degrowthByAccident', 'steadyState'].map((id) => ({ id, name: id, blurb: '' })),
    { id: 'bigSteam', name: 'Big steam', blurb: '', when: { stat: 'serviceDelivered', sector: 'steam', op: '>=', value: 1_000 } },
    { id: 'neverGranted', name: 'Never', blurb: '' },
  ],
  headlines,
  dividends,
  commons,
  charters,
  knowhowTrees: { engines: { name: 'Engines' }, general: { name: 'General' } },
  recycleText: { treasury: { name: 'Treasury', blurb: 'Revenue for the state.' }, dividend: { name: 'Dividend', blurb: 'Back to households.' } },
  sectorHeadlines: { steam: { crisis: ['Steam crisis {n} in {year}'], decade: [] } },
  global: {
    startCapital: 50, clickSeconds: 1, clickFlat: 2, popGrowth: 0.00002, subsistence: 8, wellbeingTarget: 28,
    mandateRate: 0.05, mandateFloor: 10, crisisMandate: 100, crisisPopLoss: 0.05,
    hindsight: {
      perWellbeingYear: 0.05, intensityExponent: 1, perBudgetDecade: 5, perUnburnt: 20, perFirstBackfire: 5,
      perSectorReached: 5, perSteadySector: 100,
    },
    offlineCapSeconds: 4 * 60 * 60,
    offline: { capSeconds: 8 * 60 * 60, holdBefore: 'crisis' },
    demography: { transitionWellbeing: 40 },
    steady: {
      budgetDeclinePerDecade: 0.05, decadeYears: 10,
      decadeEffects: [{ type: 'mandateAdd', value: 50 }, { type: 'wellbeingAdd', value: 1 }],
      firstSteadyEffects: [{ type: 'slotAdd', value: 1 }],
      paces: PACES,
      decadeChoices: [['div.mandate', 'div.capital'], ['div.wellbeing', 'div.efficiency']],
    },
    levy: { mandateShare: 0.1 },
    startingSlots: 2,
  },
};

export const STEAM_REFERENCE = { eta: STEAM_ETA, R: [202, 257, 321, 348, 355, 324, 269, 205] };

/** Convenience for tests: an AppState that is founded. */
export const FOUNDED: AppState = { available: true, founded: true, satMul: 1, peakD: 0, peakAdoption: 0 };

/* ------------------------------------------------------------------ */
/* M3: fixtureM3 — the M2 fixture plus every M3 mechanism              */
/* ------------------------------------------------------------------ */
/*
 * Kept apart from `fixture` so that the M2 tests stay exactly as they were. Steam stays the DESIGN.md reference economy
 * (its seams change nothing until sunk). Covered: Steam's three seams (one with reachBelow, one with requires); Light
 * with `load` (two profiles; an evening and a night application; fixedShare 0.6); Motion with `travel` (roads small
 * enough to congest; two travel applications with lockIn and lockInDecay); Compute with a share-0 application and a
 * flat-price one; a 'measure' lever with effects and sideEffects with `unless`; a cast of three (one held back by
 * `when`); eight dispatches (two- and three-armed, `once`, `next`, sector, age, a modifier, a cost); five ambient
 * templates; three Histories (`suspend`, `forbidUntil`, rewards of a locked Commons project and a locked Charter); four
 * Archive notes of different subject kinds; the Proprietor's Day card and texts; the ending; M3 headlines.
 * Variants: fixtureM3Bank (bankRate 0.5, bankMax 7200) and fixtureM3Gated (every M3 feature listed in `features`).
 */
const NIGHT = [3, 3, 3, 3, 3, 2, 1, 0.5, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.5, 1, 1, 1.5, 2, 3, 3];
const EVENING = [0.2, 0.1, 0.1, 0.1, 0.1, 0.2, 0.5, 1, 1, 0.8, 0.6, 0.6, 0.6, 0.6, 0.6, 0.8, 1, 2, 4, 5, 5, 4, 2, 0.6];
const m3Steam: SectorDef = {
  ...steam,
  mechanic: { name: 'The seams', rebound: 'Supply-side', blurb: 'Cheap pumping reaches deeper coal.' },
  seams: [
    { id: 'steam.seam.top', name: 'The Top Hard', depth: '100 fathoms', tons: 100_000, cost: 2_000, priceMul: 1.2 },
    { id: 'steam.seam.deep', name: 'The Barnsley Bed', depth: '300 fathoms', tons: 150_000, cost: 5_000, priceMul: 1.5, reachBelow: 0.3 },
    { id: 'steam.seam.deepest', name: 'The Silkstone', tons: 200_000, cost: 10_000, priceMul: 2, requires: { owns: 'steam.condenser' } },
  ],
};
const m3Light: SectorDef = {
  ...light,
  capCost: 0.02, // compensates the idle-plant mark-up so the opening price is near the M2 fixture's
  load: { profiles: { evening: EVENING, night: NIGHT }, defaultProfile: 'evening', fixedShare: 0.6 },
  applications: [
    { ...light.applications[0], profile: 'evening' }, { ...light.applications[1], profile: 'evening' },
    { ...app('light.nightWorks', 0.6, 800, 2, Infinity, 500), profile: 'night' },
  ],
};
const m3Motion: SectorDef = {
  ...motion,
  travel: { roads: 2_000, exponent: 4, hoursScale: 0.001, apps: ['motion.delivery', 'motion.suburbs'] },
  applications: [
    { ...motion.applications[0], lockIn: 0.5, lockInDecay: 0.01 },
    { ...motion.applications[1], lockInDecay: 0.002 },
    app('motion.walking', 2, 100, 1.5),
  ],
};
const m3Compute: SectorDef = {
  ...compute,
  applications: [
    ...compute.applications,
    { ...app('compute.search', 0.5, 5_000, 1.5), priceSeen: { share: 0 } },
    { ...app('compute.cloud', 0.5, 8_000, 1.5), priceSeen: { share: 0, flat: 0.2 } },
  ],
};
const m3Levers: LeverDef[] = [
  ...levers,
  lever('motion.standard', 'motion', 'measure', [L(50, 0.02, 1), L(150, 0.05, 2)], {
    effects: [{ type: 'etaMul', sector: 'motion', value: 1.2 }],
    sideEffects: { effects: [{ type: 'satMul', sector: 'motion', app: 'motion.suburbs', value: 1.3 }], rampYears: 10, unless: { owns: 'motion.fuelDuty' }, blurb: 'Heavier cars fill the forecourt', unlessLabel: 'unless a fuel duty is in force' },
  }),
  lever('motion.fuelDuty', 'motion', 'duty', [L(60, 0.02, 0.3)]),
  lever('motion.roads', 'motion', 'measure', [L(40, 0.01, 1), L(80, 0.02, 2)], { effects: [{ type: 'travelMul', sector: 'motion', roads: 2 }] }),
];
const m3Upgrades: UpgradeDef[] = [
  ...upgrades,
  { id: 'steam.proprietor', sector: 'steam', name: "The Proprietor's Day", blurb: '', kind: 'research', cost: 100,
    when: { returned: 'household' }, effects: [{ type: 'metaFlag', flag: 'proprietor' }] },
  { id: 'steam.strike', sector: 'steam', name: 'Strike', blurb: '', kind: 'research', cost: 100, locked: true, effects: [
    { type: 'populationMul', value: 0.5 }, { type: 'pressureAdd', sector: 'steam', value: 0.5 }, { type: 'capitalAdd', value: -1e9 },
    { type: 'mandateAdd', value: -1e9 }] },
];
const arm = (label: string, extra: Partial<import('../types').DispatchArm> = {}): import('../types').DispatchArm =>
  ({ label, outcome: `${label}, said {cast}.`, price: 'something', ...extra });
const dispatches: import('../types').DispatchDef[] = [
  { id: 'd.coal', cast: 'correspondent', headline: 'A letter from {cast}', body: 'Dear proprietor, coal in {year}.',
    arms: [arm('Ignore'), arm('Subsidise', { effects: [{ type: 'mandateAdd', value: 10 }, { type: 'satMul', sector: 'steam', value: 1.1 }], reply: 'The proprietor subsidises.' })] },
  { id: 'd.three', cast: 'correspondent', headline: 'Three ways', body: '',
    arms: [arm('One', { effects: [{ type: 'mandateAdd', value: 1 }] }), arm('Two', { effects: [{ type: 'mandateAdd', value: 2 }] }), arm('Three', { effects: [{ type: 'mandateAdd', value: 3 }] })] },
  { id: 'd.once', cast: 'whitlow', once: true, headline: 'Only once', body: '', arms: [arm('Fine'), arm('Also fine')] },
  { id: 'd.chain', cast: 'whitlow', headline: 'A chain begins', body: '', arms: [arm('Go on', { next: 'd.chained' }), arm('Stop')] },
  { id: 'd.chained', cast: 'whitlow', headline: 'The chain continues', body: '', when: { answered: 'd.chain', arm: 0 }, arms: [arm('Yes'), arm('No')] },
  { id: 'd.light', cast: 'fenwick', sector: 'light', headline: 'Lamps for {sector}', body: '', arms: [arm('Lamps'), arm('No lamps')] },
  { id: 'd.age', cast: 'correspondent', age: 'acceleration', headline: 'The motor age', body: '', arms: [arm('Roads'), arm('Rails')] },
  { id: 'd.mod', cast: 'correspondent', headline: 'A strike at the pits', body: '', expiryYears: 6,
    arms: [arm('Wait', { modifier: { effects: [{ type: 'resourcePriceMul', sector: 'steam', value: 2 }], years: 5, label: 'Pit strike' } }),
      arm('Settle', { cost: { mandate: 50, capitalSeconds: 10 }, effects: [{ type: 'intensityMul', sector: 'steam', value: 0.9 }] })] },
];
const ambient: import('../types').AmbientDef[] = [
  { id: 'a.coal', sector: 'steam', when: { stat: 'time', op: '>=', value: 0 }, text: ['Coal at {value} tons a second', 'Coal burns: {value}'], stat: { stat: 'resourceUse', sector: 'steam' } },
  { id: 'a.wb', when: { stat: 'time', op: '>=', value: 0 }, text: ['Wellbeing {fold}'], stat: { stat: 'wellbeing' } },
  { id: 'a.pct', when: { stat: 'time', op: '>=', value: 0 }, text: ['Reserve {pct}% left'], stat: { stat: 'reserveFraction', sector: 'steam' } },
  { id: 'a.plain', when: { stat: 'time', op: '>=', value: 0 }, text: ['Nothing to report in {year}'], weight: 2 },
  { id: 'a.never', when: { flag: 'won' }, text: ['Never printed'] },
];
const histories: import('../types').HistoryDef[] = [
  { id: 'h.statistician', name: 'The Statistician', blurb: '', rebound: 'none', effects: [{ type: 'satMul', sector: 'steam', value: 1.1 }],
    suspend: ['knowhow', 'market', 'institutions'], goal: { stat: 'time', op: '>=', value: 30 }, goalLabel: 'Thirty seconds', reward: { achievement: 'statistician', title: 'Statistician' } },
  { id: 'h.laissez', name: 'Laissez-faire', blurb: '', rebound: 'none', effects: [{ type: 'forbid', leverKind: 'duty' }, { type: 'forbid', id: 'steam.lathe' }],
    forbidUntil: { stat: 'crises', sector: 'steam', op: '>=', value: 1 }, goal: { stat: 'crises', sector: 'steam', op: '>=', value: 2 }, goalLabel: 'Two crises', reward: {} },
  { id: 'h.rich', name: 'Coal-rich', blurb: '', rebound: 'resource curse', effects: [{ type: 'reserveAdd', sector: 'steam', value: 1 }],
    goal: { stat: 'time', op: '>=', value: 20 }, goalLabel: 'Twenty seconds', reward: { unlock: ['commons.lido', 'ch.secret'], cosmetic: 'gilt' },
    requires: { stat: 'reckonings', op: '>=', value: 1 } },
];
export const fixtureM3: Content = {
  ...fixture,
  sectors: { ...fixture.sectors, steam: m3Steam, light: m3Light, motion: m3Motion, compute: m3Compute },
  upgrades: m3Upgrades,
  levers: m3Levers,
  commons: [...commons, { id: 'commons.lido', name: 'The Lido', blurb: '', icon: 'lido', cost: 100, locked: true, wellbeing: { max: 2, perLevel: 1 } }],
  charters: [...charters, { id: 'ch.secret', name: 'A secret charter', blurb: '', locked: true, effects: [{ type: 'wellbeingAdd', value: 1 }] }],
  achievements: [...fixture.achievements, { id: 'statistician', name: 'Statistician', blurb: '' }],
  cast: [
    { id: 'correspondent', name: 'Our Correspondent', role: 'The paper' },
    { id: 'whitlow', name: 'Mr Whitlow', role: 'Economist' },
    { id: 'fenwick', name: 'Mrs Fenwick', role: 'Ratepayer', when: { stat: 'reckonings', op: '>=', value: 2 } },
  ],
  dispatches, ambient, histories,
  archive: [
    { id: 'n.condenser', subject: 'steam.condenser', title: 'The separate condenser, 1769', text: 'Watt.', sources: [{ cite: 'Dickinson', grade: 'V' }], date: '1769' },
    { id: 'n.light', subject: 'light', title: 'Gas light', text: 'Murdoch.', sources: [{ cite: 'Hunt', grade: 'S' }] },
    { id: 'n.coalLetter', subject: 'd.coal', title: 'A letter on coal', text: 'Jevons.', sources: [{ cite: 'Jevons', grade: 'V' }] },
    { id: 'n.whitlow', subject: 'whitlow', title: 'Mr Whitlow', text: 'A pupil.', sources: [{ cite: 'Invented', grade: 'S' }] },
  ],
  proprietor: {
    pamphlet: { cast: 'whitlow', headline: 'A question for the proprietor', body: 'How long is your day?' },
    returns: [
      { direction: 'up', headline: 'Workday up {workdayChange}% to {workdayAfter} minutes', body: 'From {workdayBefore}.' },
      { direction: 'down', headline: 'Workday down {workdayChange}%', body: 'Decisions {decisionsAfter} an hour.' },
      { direction: 'flat', headline: 'Workday unchanged at {workdayAfter}', body: '' },
    ],
    withdrawn: 'The Household Survey is discontinued for want of funding',
  },
  ending: {
    credits: { title: 'Steady State', lines: ['The end.'], continueLabel: 'The ledger continues' },
    retrospective: [
      { key: 'sectorOpened:*', headline: '{sector} opens, run {run}, {hours} h' },
      { key: 'reveal', headline: 'The rebound revealed in {year}' },
      { key: 'won', headline: 'A steady state at last, {year}' },
    ],
  },
  headlines: {
    ...headlines,
    seamSunk: ['{name} sunk in {sector}'], biteBack: ['{name} bites back'], dispatch: [], answered: [], ambient: [],
    history: ['{name} written'], return: [], returnWithdrawn: [], ending: ['The ending, {year}'],
  } as Record<HeadlineKey, string[]>,
};
export const fixtureM3Bank: Content = { ...fixtureM3, global: { ...fixtureM3.global, offline: { capSeconds: 3_600, holdBefore: 'crisis', bankRate: 0.5, bankMax: 7_200 } } };
const atRk = (n: number) => ({ stat: 'reckonings' as const, op: '>=' as const, value: n });
export const fixtureM3Gated: Content = {
  ...fixtureM3,
  features: {
    archive: { when: atRk(1), intro: 'The Gazette opens its archive.' }, ambient: { when: atRk(1) }, dispatches: { when: atRk(1) },
    seams: { when: atRk(1) }, load: { when: atRk(1) }, travel: { when: atRk(1) }, sideEffects: { when: atRk(1) },
    freeAtUse: { when: atRk(1) }, survey: { when: atRk(1) }, histories: { when: atRk(1) }, bank: { when: atRk(1) },
  },
};

/* ------------------------------------------------------------------ */
/* M4: fixtureM4 — fixtureM3 plus every M4 mechanism                   */
/* ------------------------------------------------------------------ */
/*
 * Kept apart so the M2 and M3 tests stay as they were. Iron draws on Steam's reserve (resourceStock) with three
 * applications, two of which feed (iron.rails into Steam at 0.8; iron.girders into every other sector at 0.9); Fish is
 * a renewable stock (K 100k) with a ForeignDef, a threshold at 0.3 (its last crisis at 0.7), a scar (× 0.5 for 20 years,
 * start at 0.4 K while scarred), the Board's first survey (2 crises or 600 s), two applications, a quota lever, a
 * measure lever carrying the survey and one carrying the fishery limits (foreignMul), settle.requires on 'surveyed',
 * and drawsOn Steam. Two dispatches with wager arms (one on capital, one on Fish's stockFraction). The survey reveal
 * card. Feature 'estimates' arrives with the survey flag. Variant fixtureM4Acts: Act I (Steam, Iron, Fish; a capstone;
 * endingYears 2) and a Preview Act II (the later ages). Iron and Fish open from the second run (the condenser; 1k
 * hp·years of Steam), after Steam and Iron.
 */
const iron = sector({
  id: 'iron', basePrice: 9, capCost: 0.05, margin: 0.2, resourceStock: 'steam', reserve: 1, pressureIntensity: 0.001,
  settle: { dividend: [], upkeepPerSpill: 1, blurb: 'Iron settles.' },
  unlock: { minReckonings: 1, after: ['steam'], when: { owns: 'steam.condenser', label: 'Own the Separate condenser' } },
  applications: [
    { ...app('iron.rails', 0.8, 200, 2), feeds: [{ sector: 'steam', capCostMul: 0.8 }] },
    { ...app('iron.girders', 0.6, 300, 2, Infinity, 100), feeds: [{ sector: '*', capCostMul: 0.9 }] },
    app('iron.pots', 1.2, 100, 1.5),
  ],
});
const fish = sector({
  id: 'fish', basePrice: 1, capCost: 0.05, alpha: 0.5, resourceKind: 'renewable', reserve: 100_000,
  pressureSource: 'depletion', pressureIntensity: 0, absorption: 0, collapseAt: 100, crisisAt: [0.4, 0.7],
  pressureWellbeingCost: 5, drawsOn: { sector: 'steam', perService: 0.05 },
  renewable: {
    regen: 0.02, threshold: 0.3, collapsed: 0.2, beta: 0.4, scar: { mul: 0.5, years: 20 }, startScarred: 0.4,
    foreign: { share0: 0.1, growth: 1, cap: 0.6, announceAt: 0.15 },
    firstSurvey: { atCrisis: 2, afterSeconds: 600, years: 10 },
  },
  settle: { dividend: [], upkeepPerSpill: 1, requires: { stat: 'surveyed', sector: 'fish', op: '>=', value: 1, label: 'The stock surveyed' } },
  unlock: { minReckonings: 1, after: ['iron'], when: { stat: 'serviceDelivered', sector: 'steam', op: '>=', value: 1_000 } },
  applications: [app('fish.market', 1.5, 300, 1.5), app('fish.trawlers', 0.5, 2_000, 2, Infinity, 200)],
});
const m4Levers: LeverDef[] = [
  ...m3Levers,
  lever('fish.quota', 'fish', 'quota', [L(50, 0.02, 0.9), L(100, 0.04, 0.5)], { repeat: { valueStep: -0.25, costGrowth: 1.5, upkeepGrowth: 1.2 } }),
  lever('fish.board', 'fish', 'measure', [L(30, 0.01, 1)], { effects: [{ type: 'survey', sector: 'fish' }] }),
  lever('fish.limits', 'fish', 'measure', [L(30, 0.01, 1)], { effects: [{ type: 'foreignMul', sector: 'fish', value: 0.5 }] }),
  lever('iron.duty', 'iron', 'duty', [L(50, 0.02, 0.3)]),
];
const wagerDispatches: import('../types').DispatchDef[] = [
  { id: 'd.bet', cast: 'correspondent', headline: 'A wager', body: '', arms: [
    arm('Decline'),
    arm('Bet', { cost: { mandate: 5 }, effects: [{ type: 'mandateAdd', value: 1 }], reply: 'The proprietor bets.', wager: {
      when: { stat: 'capital', op: '>=', value: 1_000 }, hint: 'Pays if the books are fat',
      win: { outcome: 'It pays', effects: [{ type: 'mandateAdd', value: 20 }], reply: 'The bet pays.' },
      lose: { outcome: 'It does not', effects: [{ type: 'mandateAdd', value: 2 }] },
    } }),
  ] },
  { id: 'd.shoals', cast: 'correspondent', sector: 'fish', headline: 'The shoals', body: '', arms: [
    arm('Leave it'),
    arm('Build boats', { wager: {
      when: { stat: 'stockFraction', sector: 'fish', op: '>=', value: 0.5 }, hint: 'Pays if the shoals are as thick as the catch says',
      win: { outcome: 'Full nets', modifier: { effects: [{ type: 'satMul', sector: 'fish', value: 1.2 }], years: 5, label: 'Full nets' } },
      lose: { outcome: 'Empty nets', effects: [{ type: 'etaMul', sector: 'fish', value: 0.9 }] },
    } }),
  ] },
];
export const fixtureM4: Content = {
  ...fixtureM3,
  sectors: { ...fixtureM3.sectors, iron, fish },
  sectorOrder: ['steam', 'iron', 'fish', 'light', 'motion', 'compute', 'code'],
  ages: [
    { ...fixtureM3.ages[0], sectors: ['steam', 'iron', 'fish', 'light'] },
    ...fixtureM3.ages.slice(1),
  ],
  levers: m4Levers,
  dispatches: [...(fixtureM3.dispatches ?? []), ...wagerDispatches],
  features: { estimates: { when: { flag: 'survey:fish' } } },
  surveyReveal: {
    variants: [
      { when: 'small', headline: 'Survey confirms the skippers: {reported}% against {true}%', body: 'Small.' },
      { when: 'large', headline: 'Survey finds {true}% where the skippers report {reported}%', body: 'Large.' },
      { when: 'failed', headline: 'The {sector} banks have failed, {year}', body: 'Failed.' },
    ],
    columns: { reported: "The skippers' report", surveyed: "The Board's survey" }, footer: 'Two notes.', button: 'File the survey',
    followUp: 'Skippers dispute the survey',
  },
};
export const fixtureM4Acts: Content = {
  ...fixtureM4,
  global: { ...fixtureM4.global, endingYears: 2 },
  acts: [
    { id: 'actOne', name: 'Act I', title: 'The Coal Age', ages: ['coal'], ending: { id: 'actOne', sectors: ['steam', 'iron', 'fish'] }, capstone: { incomeShare: 0.25 } },
    { id: 'actTwo', name: 'Act II', title: 'The Great Acceleration', ages: ['acceleration', 'attention'], preview: true },
  ],
};
