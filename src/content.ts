/**
 * REBOUND — content: every number and every word the simulation and UI read (M1 contract).
 * Owned by the content workstream. See src/types.ts for what each field does, design/m1-contract-notes.md for the
 * Sector/Age words. In code the unit is a `sector`; on screen it is an "Industry", and the period is an "Age".
 *
 * Numbers are generated where they form a series (cost ladders, lever level tables, know-how costs) by the helpers
 * just below, so balance can retune a sector with a handful of knobs.
 */
import type {
  Content,
  AgeDef,
  SectorDef,
  SectorId,
  ApplicationDef,
  EffectDef,
  UpgradeDef,
  LeverDef,
  LeverKind,
  LeverLevelDef,
  LeverRecycle,
  KnowhowDef,
  InstitutionDef,
  InstitutionLevelDef,
  AchievementDef,
  HeadlineKey,
  GlobalParams,
  Cond,
} from './types';

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

/** Round to two significant figures (cost ladders read better as 4,500 than 4,537). */
export function sig2(x: number): number {
  if (x <= 0) return 0;
  const p = 10 ** (Math.floor(Math.log10(x)) - 1);
  return Math.round(x / p) * p;
}

/** n costs: first, first×growth, first×growth², … each rounded to two significant figures. */
export function ladder(first: number, growth: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => sig2(first * growth ** i));
}

/** Per-card etaMul values from cumulative efficiency folds (1.5, 2.5, 3.5 → 1.5, 1.667, 1.4). */
function stepsFromFolds(folds: number[]): number[] {
  return folds.map((f, i) => f / (i === 0 ? 1 : folds[i - 1]));
}

/* --- effects --- */
const eta = (sector: SectorId, value: number): EffectDef => ({ type: 'etaMul', sector, value });
const capCost = (sector: SectorId, value: number): EffectDef => ({ type: 'capCostMul', sector, value });
const margin = (sector: SectorId, value: number): EffectDef => ({ type: 'marginAdd', sector, value });
const reserve = (sector: SectorId, value: number): EffectDef => ({ type: 'reserveAdd', sector, value });
const absorb = (sector: SectorId, value: number): EffectDef => ({ type: 'absorptionAdd', sector, value });
const sat = (sector: SectorId, value: number, app?: string): EffectDef =>
  app ? { type: 'satMul', sector, app, value } : { type: 'satMul', sector, value };
const half = (sector: SectorId, value: number, app?: string): EffectDef =>
  app ? { type: 'halfPriceMul', sector, app, value } : { type: 'halfPriceMul', sector, value };
const startLever = (lever: string, level: number): EffectDef => ({ type: 'startLever', lever, level });

/**
 * A chain of efficiency cards: each requires the one before; etaMul comes from the cumulative folds; costs come
 * from a ladder. `costs` overrides the ladder where the first step should be cheap.
 */
function chain(
  sector: SectorId,
  costs: number[],
  cards: { id: string; name: string; blurb: string; fold: number }[],
): UpgradeDef[] {
  const steps = stepsFromFolds(cards.map((c) => c.fold));
  return cards.map((c, i) => ({
    id: c.id,
    sector,
    kind: 'efficiency' as const,
    name: c.name,
    blurb: c.blurb,
    cost: costs[i],
    requires: i === 0 ? undefined : [cards[i - 1].id],
    effects: [eta(sector, Math.round(steps[i] * 10_000) / 10_000)],
  }));
}

/** Two upgrades that exclude each other: a fork. Both list the other, so exclusion is symmetric in the data too. */
function fork(a: UpgradeDef, b: UpgradeDef): UpgradeDef[] {
  return [
    { ...a, excludes: [...(a.excludes ?? []), b.id] },
    { ...b, excludes: [...(b.excludes ?? []), a.id] },
  ];
}

/* --- levers --- */

/** Default "Tighten" series per lever kind (see LeverDef.repeat). Each lever may override any field. */
const REPEAT: Record<LeverKind, { valueStep: number; costGrowth: number; upkeepGrowth: number; maxSteps: number }> = {
  duty: { valueStep: 0.03, costGrowth: 1.7, upkeepGrowth: 1.35, maxSteps: 3 },
  cap: { valueStep: -0.05, costGrowth: 1.45, upkeepGrowth: 1.3, maxSteps: 10 },
  sufficiency: { valueStep: -0.05, costGrowth: 1.5, upkeepGrowth: 1.3, maxSteps: 6 },
  substitution: { valueStep: 0.05, costGrowth: 1.5, upkeepGrowth: 1.35, maxSteps: 8 },
  circularity: { valueStep: 0.05, costGrowth: 1.5, upkeepGrowth: 1.3, maxSteps: 8 },
  greenSpending: { valueStep: 0.05, costGrowth: 1.6, upkeepGrowth: 1.3, maxSteps: 2 },
  deletion: { valueStep: 0.05, costGrowth: 1.5, upkeepGrowth: 1.35, maxSteps: 8 },
  reviewGate: { valueStep: 0.1, costGrowth: 1.6, upkeepGrowth: 1.35, maxSteps: 5 },
  sharedLibs: { valueStep: 0.05, costGrowth: 1.5, upkeepGrowth: 1.3, maxSteps: 6 },
};

/** Authored levels cost 1 : 3 : 9 in Mandate and 1 : 2.5 : 6.25 in upkeep, as in v1. */
const LEVEL_COST = [1, 3, 9];
const LEVEL_UPKEEP = [1, 2.5, 6.25];

/** Fill a label template: {pct} = value as a whole percentage, {value} = 2 dp. */
function fill(template: string, value: number): string {
  return template.replace('{pct}', String(Math.round(value * 100))).replace('{value}', value.toFixed(2));
}

interface LeverSpec {
  id: string;
  sector: SectorId;
  kind: LeverKind;
  name: string;
  blurb: string;
  catch: string;
  values: number[];
  value2?: number[];
  /** Mandate for level 1 (later levels scale by LEVEL_COST). */
  cost: number;
  /** Mandate upkeep per second at level 1 (later levels scale by LEVEL_UPKEEP). */
  upkeep: number;
  /** Label template for every level, authored and repeat. */
  label: string;
  /** Labels for specific authored levels that read better in words (index → label). */
  labels?: Record<number, string>;
  repeat?: Partial<LeverDef['repeat'] & object>;
  recycle?: LeverRecycle[];
  requires?: string[];
}

function lever(s: LeverSpec): LeverDef {
  const levels: LeverLevelDef[] = s.values.map((value, i) => {
    const l: LeverLevelDef = {
      mandateCost: sig2(s.cost * LEVEL_COST[i]),
      mandateUpkeep: Math.round(s.upkeep * LEVEL_UPKEEP[i] * 1000) / 1000,
      value,
      label: s.labels?.[i] ?? fill(s.label, value),
    };
    if (s.value2) l.value2 = s.value2[i];
    return l;
  });
  const def: LeverDef = {
    id: s.id,
    sector: s.sector,
    kind: s.kind,
    name: s.name,
    blurb: s.blurb,
    catch: s.catch,
    levels,
    repeat: { ...REPEAT[s.kind], label: s.label, ...s.repeat },
  };
  if (s.recycle) def.recycle = s.recycle;
  if (s.requires) def.requires = s.requires;
  return def;
}

/** Duty and cap levers offer both recycle options; treasury first (the v1 behaviour). */
const RECYCLE: LeverRecycle[] = ['treasury', 'dividend'];

/* ------------------------------------------------------------------ */
/* AGES                                                                */
/* ------------------------------------------------------------------ */

const ages: AgeDef[] = [
  {
    id: 'coal',
    name: 'The Coal Age',
    tagline: 'Everything runs on coal, including the arguments about coal.',
    yearSpan: [1780, 1914],
    theme: 'ledger',
    sectors: ['steam', 'light'],
  },
  {
    id: 'acceleration',
    name: 'The Great Acceleration',
    tagline: 'Every line on every chart turns upward at once. Nobody planned it.',
    yearSpan: [1909, 2010],
    theme: 'chrome',
    sectors: ['motion'],
  },
  {
    id: 'attention',
    name: 'The Attention Age',
    tagline: 'The machines are tireless. What runs short is anyone to read what they make.',
    yearSpan: [2000, 2100],
    theme: 'terminal',
    sectors: ['compute', 'code'],
  },
];

/* ------------------------------------------------------------------ */
/* SECTORS (on screen: Industries)                                     */
/* ------------------------------------------------------------------ */

/*
 * Steam's later applications are steeper and cheaper-to-half than v1 (balance finding 2): the uses founded by
 * mid-run stay price-elastic, so the direct rebound shows on the shadow meter. Pumping's reserve gain is 0.15
 * (finding 1): gain × η × pumping's share of demand stays under 1 everywhere: alone, after Better boilers, with every
 * Steam know-how node maxed (η ≈ 1.5 × 3.5): 0.78; late, η ≈ 27 × 3.5 and a share under 2%: about 0.25.
 * The content lint checks both ends.
 */
const steam: SectorDef = {
  id: 'steam',
  name: 'Steam',
  years: '1780–1870',
  firstYear: 1780,
  tagline: 'One engine, one flooded pit, and a great deal of coal nobody is counting.',
  service: { name: 'Motive power', unit: 'hp' },
  resource: { name: 'Coal', unit: 'tons' },
  pressure: { name: 'Smog', crisisName: 'The Black Fog' },
  accent: 'iron',

  basePrice: 1,
  capCost: 0.04,
  margin: 0.2,
  baseEta: 1,
  autoEtaRate: 0,

  resourceKind: 'stock',
  reserve: 280_000,
  alpha: 0.6,

  pressureSource: 'resource',
  pressureIntensity: 0.005,
  absorption: 0.008,
  collapseAt: 100,
  crisisAt: [0.6, 0.8, 0.92],
  pressureWellbeingCost: 15,
  pressureUpkeep: 0,

  wellbeingWeight: 12,
  wellbeingScale: 50,

  applications: [
    {
      id: 'steam.pumping',
      name: 'Mine pumping',
      blurb: 'Keeps the pit dry. Dry pits go deeper. Deeper pits need more pumping.',
      icon: 'pump',
      halfPrice: 0.6,
      saturation: 100,
      steepness: 1.8,
      visibleBelow: Infinity,
      foundCost: 0,
      reserveGainPerService: 0.15,
    },
    {
      id: 'steam.mills',
      name: 'Cotton mills',
      blurb: 'No longer tied to a riverbank. Now they can be anywhere there is coal.',
      icon: 'mill',
      halfPrice: 0.6,
      saturation: 200,
      steepness: 2,
      visibleBelow: 0.8,
      foundCost: 1_200,
    },
    {
      id: 'steam.winding',
      name: 'Winding engines',
      blurb: 'Haul the coal up as fast as the pumps let the men dig it. Faster, ideally.',
      icon: 'winder',
      halfPrice: 0.4,
      saturation: 150,
      steepness: 2.1,
      visibleBelow: 0.55,
      foundCost: 1_500,
    },
    {
      id: 'steam.railways',
      name: 'Railways',
      blurb: 'Coal hauling coal to the people who burn coal, at a mile a minute.',
      icon: 'train',
      halfPrice: 0.22,
      saturation: 1_200,
      steepness: 2.3,
      visibleBelow: 0.42,
      foundCost: 5_000,
    },
    {
      id: 'steam.steamships',
      name: 'Steamships',
      blurb: 'The trade winds are now optional. The coal bunkers are not.',
      icon: 'ship',
      halfPrice: 0.11,
      saturation: 3_000,
      steepness: 2.5,
      visibleBelow: 0.22,
      foundCost: 12_000,
    },
    {
      id: 'steam.ploughing',
      name: 'Steam ploughing',
      blurb: 'An engine at each headland and a plough hauled between them on a wire rope.',
      icon: 'plough',
      halfPrice: 0.06,
      saturation: 4_000,
      steepness: 2.7,
      visibleBelow: 0.13,
      foundCost: 30_000,
    },
  ],
};

const light: SectorDef = {
  id: 'light',
  name: 'Light',
  years: '1870–1950',
  firstYear: 1870,
  tagline: 'The night is abolished by order of the gas company.',
  service: { name: 'Light', unit: 'klm·h' },
  resource: { name: 'Town gas & current', unit: 'therms' },
  pressure: { name: 'Coal smoke', crisisName: 'The Pea-Souper' },
  accent: 'gas',
  theme: 'gaslight',

  basePrice: 1,
  capCost: 0.05,
  margin: 0.2,
  baseEta: 1,
  autoEtaRate: 0,

  resourceKind: 'stock',
  reserve: 7_000_000,
  alpha: 0.6,

  pressureSource: 'resource',
  pressureIntensity: 0.00018,
  absorption: 0.008,
  collapseAt: 100,
  crisisAt: [0.35, 0.65, 0.85],
  pressureWellbeingCost: 12,
  pressureUpkeep: 0,

  wellbeingWeight: 5.5,
  wellbeingScale: 500,

  spill: { to: 'steam', rate: 0.4 },
  unlock: {
    minReckonings: 1,
    when: {
      all: [
        { owns: 'steam.condenser', label: 'Own the Separate condenser' },
        { stat: 'serviceDelivered', sector: 'steam', op: '>=', value: 10_000, label: '10,000 hp·years of power delivered' },
      ],
    },
  },

  applications: [
    {
      id: 'light.streetLamps',
      name: 'Street lamps',
      blurb: 'A lamplighter, a ladder and a parish that has decided to be modern.',
      icon: 'lamp',
      halfPrice: 0.7,
      saturation: 300,
      steepness: 1.8,
      visibleBelow: Infinity,
      foundCost: 0,
    },
    {
      id: 'light.nightShifts',
      name: 'Night shifts',
      blurb: 'The machines need not rest once the foreman can see them.',
      icon: 'factory-night',
      halfPrice: 0.35,
      saturation: 3_000,
      steepness: 2.3,
      visibleBelow: 0.75,
      foundCost: 8_000,
    },
    {
      id: 'light.trams',
      name: 'Electric trams',
      blurb: 'The power station is idle all afternoon. Sell the afternoon to the tramways.',
      icon: 'tram',
      halfPrice: 0.25,
      saturation: 6_000,
      steepness: 2.4,
      visibleBelow: 0.55,
      foundCost: 20_000,
    },
    {
      id: 'light.homes',
      name: 'Lit homes',
      blurb: 'Reading after dark, once a luxury, is now a reasonable expectation.',
      icon: 'house',
      halfPrice: 0.17,
      saturation: 15_000,
      steepness: 2.5,
      visibleBelow: 0.4,
      foundCost: 40_000,
    },
    {
      id: 'light.shopSigns',
      name: 'Shop signs',
      blurb: 'Light that illuminates nothing in particular, all night, on purpose.',
      icon: 'sign',
      halfPrice: 0.07,
      saturation: 40_000,
      steepness: 2.7,
      visibleBelow: 0.18,
      foundCost: 150_000,
    },
  ],
};

const motion: SectorDef = {
  id: 'motion',
  name: 'Motion',
  years: '1950–2000',
  firstYear: 1950,
  tagline: 'Distance has been repealed. Please mind the bypass.',
  service: { name: 'Vehicle-miles', unit: 'veh·mi' },
  resource: { name: 'Oil', unit: 'barrels' },
  pressure: { name: 'Exhaust', crisisName: 'The Summer Smog' },
  accent: 'chrome',

  basePrice: 1,
  capCost: 0.05,
  margin: 0.2,
  baseEta: 1,
  autoEtaRate: 0,

  resourceKind: 'stock',
  reserve: 25_000_000,
  alpha: 0.6,

  pressureSource: 'resource',
  pressureIntensity: 0.000036,
  absorption: 0.006,
  collapseAt: 100,
  crisisAt: [0.35, 0.65, 0.85],
  pressureWellbeingCost: 12,
  pressureUpkeep: 0,

  wellbeingWeight: 6.5,
  wellbeingScale: 1000,

  spill: { to: 'light', rate: 0.3 },
  unlock: {
    minReckonings: 2,
    when: {
      all: [
        { owns: 'light.mantle', label: 'Own the Incandescent gas mantle' },
        { stat: 'appsFounded', sector: 'light', op: '>=', value: 3, label: '3 Light applications founded' },
        { stat: 'serviceDelivered', sector: 'light', op: '>=', value: 100_000, label: '100,000 klm·h·years of light delivered' },
      ],
    },
  },

  applications: [
    {
      id: 'motion.delivery',
      name: 'Delivery vans',
      blurb: 'The milk, the post and the laundry, all arriving by internal combustion.',
      icon: 'van',
      halfPrice: 0.9,
      saturation: 2_000,
      steepness: 1.8,
      visibleBelow: Infinity,
      foundCost: 0,
    },
    {
      id: 'motion.commuting',
      name: 'Commuting',
      blurb: 'Faster cars mean the same hour in traffic, from twice as far away.',
      icon: 'car',
      halfPrice: 0.4,
      saturation: 15_000,
      steepness: 2.3,
      visibleBelow: 0.75,
      foundCost: 30_000,
      lockIn: 0.75,
    },
    {
      id: 'motion.shopping',
      name: 'Out-of-town shopping',
      blurb: 'The high street, rebuilt in a field by the ring road with free parking for all.',
      icon: 'mall',
      halfPrice: 0.28,
      saturation: 30_000,
      steepness: 2.4,
      visibleBelow: 0.55,
      foundCost: 80_000,
      lockIn: 0.6,
    },
    {
      id: 'motion.suburbs',
      name: 'Suburbs',
      blurb: 'Built for the car, and quite impossible without one. That was the point.',
      icon: 'suburb',
      halfPrice: 0.2,
      saturation: 60_000,
      steepness: 2.5,
      visibleBelow: 0.45,
      foundCost: 200_000,
      lockIn: 0.85,
    },
    {
      id: 'motion.flights',
      name: 'Package holidays',
      blurb: 'A fortnight on the Costa, for less than a week in Skegness.',
      icon: 'plane',
      halfPrice: 0.08,
      saturation: 150_000,
      steepness: 2.8,
      visibleBelow: 0.3,
      foundCost: 900_000,
    },
  ],
};

const compute: SectorDef = {
  id: 'compute',
  name: 'Compute',
  years: '2000–2025',
  firstYear: 2000,
  tagline: 'The cost of a calculation halves while you read this sentence.',
  service: { name: 'Computation', unit: 'PFLOP' },
  resource: { name: 'Power, water & chips', unit: 'GWh' },
  pressure: { name: 'Carbon', crisisName: 'The Heat Dome' },
  accent: 'phosphor',

  basePrice: 1,
  capCost: 0.02,
  margin: 0.15,
  baseEta: 1,
  autoEtaRate: 0.0046,

  resourceKind: 'stock',
  reserve: 60_000_000,
  alpha: 0.6,

  pressureSource: 'resource',
  pressureIntensity: 0.0000025,
  absorption: 0.005,
  collapseAt: 100,
  crisisAt: [0.35, 0.65, 0.85],
  pressureWellbeingCost: 12,
  pressureUpkeep: 0,

  wellbeingWeight: 4.5,
  wellbeingScale: 150_000,

  spill: { to: 'motion', rate: 0.4 },
  unlock: {
    minReckonings: 3,
    when: {
      all: [
        { owns: 'motion.injection', label: 'Own Fuel injection' },
        { stat: 'appsFounded', sector: 'motion', op: '>=', value: 2, label: '2 Motion applications founded' },
        { stat: 'serviceDelivered', sector: 'motion', op: '>=', value: 150_000, label: '150,000 veh·mi·years driven' },
      ],
    },
  },

  applications: [
    {
      id: 'compute.spreadsheets',
      name: 'Spreadsheets',
      blurb: 'The ledger, automated. Now everybody can have forty versions of it.',
      icon: 'sheet',
      halfPrice: 0.6,
      saturation: 40_000,
      steepness: 1.5,
      visibleBelow: Infinity,
      foundCost: 0,
    },
    {
      id: 'compute.web',
      name: 'The web',
      blurb: 'Every shop, library and argument, open all hours.',
      icon: 'globe',
      halfPrice: 0.25,
      saturation: 200_000,
      steepness: 2.2,
      visibleBelow: 0.45,
      foundCost: 250_000,
    },
    {
      id: 'compute.cloudStorage',
      name: 'Cloud storage',
      blurb: 'Why delete anything? Every photograph, twice, in a warehouse beside a river.',
      icon: 'cloud',
      halfPrice: 0.12,
      saturation: 600_000,
      steepness: 2.5,
      visibleBelow: 0.25,
      foundCost: 900_000,
    },
    {
      id: 'compute.streaming',
      name: 'Streaming',
      blurb: 'The same film, sent again, to each of you, separately, forever.',
      icon: 'play',
      halfPrice: 0.06,
      saturation: 1_500_000,
      steepness: 2.8,
      visibleBelow: 0.12,
      foundCost: 2_500_000,
    },
    {
      id: 'compute.training',
      name: 'Model training',
      blurb: 'Read everything ever written, then do it again, but bigger.',
      icon: 'brain',
      halfPrice: 0.02,
      saturation: 12_000_000,
      steepness: 3.2,
      visibleBelow: 0.045,
      foundCost: 25_000_000,
    },
  ],
};

const code: SectorDef = {
  id: 'code',
  name: 'Code',
  years: '2025–',
  firstYear: 2025,
  tagline: 'Software is now free to write. Reading it remains a personal matter.',
  service: { name: 'Working features', unit: 'features' },
  resource: { name: 'Human attention', unit: 'hours' },
  pressure: { name: 'Code stock', crisisName: 'The Great Outage' },
  accent: 'diff',
  theme: 'agentic',

  basePrice: 1,
  capCost: 0.02,
  margin: 0.2,
  baseEta: 1,
  autoEtaRate: 0,

  resourceKind: 'flow',
  /** Attention capacity per second at population 1. */
  reserve: 50_000,
  alpha: 0.5,

  pressureSource: 'service',
  pressureIntensity: 0.000001,
  absorption: 0,
  collapseAt: 1000,
  crisisAt: [0.3, 0.6, 0.85],
  pressureWellbeingCost: 15,
  /** At P = 500 half the attention goes on keeping what exists alive. */
  pressureUpkeep: 50,

  wellbeingWeight: 4,
  wellbeingScale: 100_000,

  drawsOn: { sector: 'compute', perService: 0.5 },
  /*
   * v1 gated Code on compute price < 0.015, which no greedy play reached (critique). The milestones below come within
   * about ten minutes of Compute opening, so four Reckonings are the real gate: about hour 4 of competent play.
   */
  unlock: {
    minReckonings: 4,
    when: {
      all: [
        { owns: 'compute.multicore', label: 'Own Multi-core chips' },
        { stat: 'appsFounded', sector: 'compute', op: '>=', value: 2, label: '2 Compute applications founded' },
        { stat: 'serviceDelivered', sector: 'compute', op: '>=', value: 600_000, label: '600,000 PFLOP·years computed' },
      ],
    },
  },

  applications: [
    {
      id: 'code.internalTools',
      name: 'Internal tools',
      blurb: 'The spreadsheet that ran payroll, rewritten as an app that runs payroll.',
      icon: 'wrench',
      halfPrice: 1.5,
      saturation: 60_000,
      steepness: 1.5,
      visibleBelow: Infinity,
      foundCost: 0,
    },
    {
      id: 'code.personalApps',
      name: 'Throwaway personal apps',
      blurb: 'A bespoke app to split one restaurant bill. Kept in production indefinitely.',
      icon: 'phone-app',
      halfPrice: 0.5,
      saturation: 600_000,
      steepness: 2.2,
      visibleBelow: 0.7,
      foundCost: 3_000_000,
    },
    {
      id: 'code.rewrites',
      name: 'Legacy rewrites',
      blurb: 'Thirty years of COBOL, rewritten over a weekend. The bugs, faithfully.',
      icon: 'scroll',
      halfPrice: 0.2,
      saturation: 3_000_000,
      steepness: 2,
      visibleBelow: 0.3,
      foundCost: 30_000_000,
    },
    {
      id: 'code.chatbots',
      name: 'Chatbots on everything',
      blurb: 'The toaster now has opinions, a privacy policy and a release schedule.',
      icon: 'chatbot',
      halfPrice: 0.09,
      saturation: 20_000_000,
      steepness: 2.6,
      visibleBelow: 0.14,
      foundCost: 100_000_000,
    },
    {
      id: 'code.agentsForAgents',
      name: 'Agents writing for agents',
      blurb: 'Software commissioned by software, reviewed by software, for software.',
      icon: 'robots',
      halfPrice: 0.03,
      saturation: 100_000_000,
      steepness: 3,
      visibleBelow: 0.08,
      foundCost: 300_000_000,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* UPGRADES                                                            */
/* ------------------------------------------------------------------ */

/* ---- Steam: chain to ×13; forks add up to ×2 more (max ≈ ×27, min ≈ ×19) ---- */
const steamUpgrades: UpgradeDef[] = [
  ...chain('steam', [600, ...ladder(4_000, 1.5, 6)], [
    {
      id: 'steam.boilers', name: 'Better boilers', fold: 1.5,
      blurb: 'After Smeaton: lag the pipes, mend the leaks, stop heating the engine house.',
    },
    {
      id: 'steam.condenser', name: 'Separate condenser', fold: 2.5,
      blurb: 'Watt, 1769. Stop cooling the cylinder every stroke.',
    },
    {
      id: 'steam.doubleActing', name: 'Double-acting engine', fold: 3.5,
      blurb: 'Watt again: push on the way down as well as the way up.',
    },
    {
      id: 'steam.highPressure', name: 'High-pressure steam', fold: 5,
      blurb: 'Trevithick, c. 1800. Smaller, stronger, occasionally explosive.',
    },
    {
      id: 'steam.compound', name: 'Compound engine', fold: 7,
      blurb: 'Use the steam twice before letting it go.',
    },
    {
      id: 'steam.tripleExpansion', name: 'Triple expansion', fold: 9.5,
      blurb: 'Use it three times. The shipping lines are delighted, and order more ships.',
    },
    {
      id: 'steam.turbine', name: 'Steam turbine', fold: 13,
      blurb: 'Parsons, 1884. No pistons at all; just a very fast windmill of steam.',
    },
  ]),
  {
    id: 'steam.engineReporter', sector: 'steam', kind: 'efficiency',
    name: 'Engine duty reports',
    blurb: 'A monthly league table of every engine’s duty. Efficiency becomes a sport; total coal is not scored.',
    cost: 5_000, requires: ['steam.condenser'], effects: [eta('steam', 1.1)],
  },

  /* Fork 1: the genuine article on royalty, or a pirate copy. */
  ...fork(
    {
      id: 'steam.bwLicence', sector: 'steam', kind: 'efficiency',
      name: 'Boulton & Watt licence',
      blurb: 'The genuine engine, for a third of the value of the coal it saves. A bigger saving, and a bigger appetite.',
      cost: 4_500, requires: ['steam.condenser'],
      effects: [eta('steam', 1.25), margin('steam', -0.04)],
    },
    {
      id: 'steam.pirateEngine', sector: 'steam', kind: 'capital',
      name: 'Pirate engine',
      blurb: 'Nearly a Watt, from Bull or Hornblower, without the invoice. Cheaper engines, so many more engines.',
      cost: 3_500, requires: ['steam.condenser'],
      effects: [eta('steam', 1.1), capCost('steam', 0.8)],
    },
  ),

  /* Fork 2: the Railway Bill. */
  ...fork(
    {
      id: 'steam.parliamentaryTrains', sector: 'steam', kind: 'capital',
      name: 'Parliamentary trains',
      blurb: 'Railway Regulation Act, 1844: a train each way daily at a penny a mile. Third class fills every carriage.',
      cost: 8_000, requires: ['steam.doubleActing'],
      effects: [sat('steam', 1.5, 'steam.railways'), margin('steam', -0.02)],
    },
    {
      id: 'steam.firstClass', sector: 'steam', kind: 'capital',
      name: 'First-class lines',
      blurb: 'Upholstered carriages for those who can pay. Fewer passengers, fatter fares, and the fares build the next line.',
      cost: 8_000, requires: ['steam.doubleActing'],
      effects: [sat('steam', 0.8, 'steam.railways'), margin('steam', 0.03)],
    },
  ),

  /* Fork 3: whose engine — the deep mine's or the mill's. */
  ...fork(
    {
      id: 'steam.cornishEngine', sector: 'steam', kind: 'efficiency',
      name: 'Cornish engine',
      blurb: 'Expansive working, lagged, tuned and reported on monthly. The mines go deeper to make use of it.',
      cost: 13_000, requires: ['steam.highPressure'],
      effects: [eta('steam', 1.3), sat('steam', 1.5, 'steam.pumping')],
    },
    {
      id: 'steam.corliss', sector: 'steam', kind: 'efficiency',
      name: 'Corliss valve gear',
      blurb: 'Corliss, 1849: the valve shuts the moment the work is done. Cheaper mill power, and so more mills.',
      cost: 13_000, requires: ['steam.highPressure'],
      effects: [eta('steam', 1.2), sat('steam', 1.25, 'steam.mills')],
    },
  ),

  /* Fork 4: the long route east. */
  ...fork(
    {
      id: 'steam.suez', sector: 'steam', kind: 'capital',
      name: 'Suez Canal shares',
      blurb: 'Suez, 1869: Bombay four thousand miles nearer, by steam only. A shorter voyage, so many more voyages.',
      cost: 20_000, requires: ['steam.compound'],
      effects: [sat('steam', 1.6, 'steam.steamships')],
    },
    {
      id: 'steam.auxiliarySail', sector: 'steam', kind: 'efficiency',
      name: 'Auxiliary sail',
      blurb: 'Keep the masts: steam in the calms, canvas in the trades. Less coal a voyage, so cheaper freight, so more of it.',
      cost: 20_000, requires: ['steam.compound'],
      effects: [eta('steam', 1.15), sat('steam', 0.85, 'steam.steamships')],
    },
  ),

  {
    id: 'steam.lathe', sector: 'steam', kind: 'capital',
    name: 'Screw-cutting lathe',
    blurb: 'Maudslay’s lathe. Parts that fit first time make engines cheap, and cheap engines common.',
    cost: 2_000, requires: ['steam.boilers'], effects: [capCost('steam', 0.8)],
  },
  {
    id: 'steam.limitedLiability', sector: 'steam', kind: 'capital',
    name: 'Limited liability',
    blurb: 'Limited Liability Act, 1855. Other people’s money, without the debtors’ prison.',
    cost: 15_000, requires: ['steam.highPressure'], effects: [margin('steam', 0.03)],
  },
  {
    id: 'steam.deeperShaft', sector: 'steam', kind: 'prospect',
    name: 'Sink a deeper shaft',
    blurb: 'There is always more coal, a little further down, a little dearer.',
    cost: 5_000, repeatable: true, costGrowth: 2.2, maxLevel: 6,
    effects: [reserve('steam', 0.25)],
  },
  {
    id: 'steam.coalQuestion', sector: 'steam', kind: 'research',
    name: 'The Coal Question',
    blurb: 'W. S. Jevons, 1865. “It is wholly a confusion of ideas to suppose that the economical use of fuel is equivalent to a diminished consumption. The very contrary is the truth.”',
    cost: 4_000, requires: ['steam.condenser'], effects: [{ type: 'reveal' }],
  },
];

/* ---- Light: chain to ×32 ---- */
const lightUpgrades: UpgradeDef[] = [
  ...chain('light', ladder(5_000, 2.3, 6), [
    {
      id: 'light.batswing', name: 'Batswing burner', fold: 1.6,
      blurb: 'A slit in the jet fans the flame out. Brighter for the same gas.',
    },
    {
      id: 'light.mantle', name: 'Incandescent gas mantle', fold: 3.2,
      blurb: 'Welsbach’s little sock of rare earths, glowing white in the flame. Gas lives to fight the bulb.',
    },
    {
      id: 'light.carbon', name: 'Carbon filament lamp', fold: 5.76,
      blurb: 'Swan and Edison, c. 1880. A thread of charcoal in a vacuum.',
    },
    {
      id: 'light.tungsten', name: 'Drawn tungsten filament', fold: 9.8,
      blurb: 'A metal that would rather not melt, persuaded into wire.',
    },
    {
      id: 'light.gasFilled', name: 'Gas-filled lamp', fold: 14.7,
      blurb: 'Langmuir, 1913. A whiff of inert gas lets the filament run hotter.',
    },
    {
      id: 'light.fluorescent', name: 'Fluorescent tube', fold: 32.3,
      blurb: 'Mercury vapour and phosphor. Several times the light, and one office hum.',
    },
  ]),

  /* Fork 1: gas or current. */
  ...fork(
    {
      id: 'light.gasWorks', sector: 'light', kind: 'efficiency',
      name: 'Modernise the gas works',
      blurb: 'Bigger retorts, better holders, a mantle on every lamp-post. Gas stays cheap, so the parish lights every street.',
      cost: 30_000, requires: ['light.mantle'],
      effects: [eta('light', 1.25), sat('light', 1.4, 'light.streetLamps')],
    },
    {
      id: 'light.powerStation', sector: 'light', kind: 'capital',
      name: 'Central power station',
      blurb: 'One great station instead of a gas works in every town. Cheaper current, wired into every home that will take it.',
      cost: 30_000, requires: ['light.mantle'],
      effects: [capCost('light', 0.8), half('light', 1.25, 'light.homes')],
    },
  ),

  /* Fork 2: how to sell it. */
  ...fork(
    {
      id: 'light.offPeak', sector: 'light', kind: 'capital',
      name: 'Off-peak tariff',
      blurb: 'After Insull at Chicago Edison: sell the trough cheap and the plant earns all night. Then the night wants lighting.',
      cost: 60_000, requires: ['light.carbon'],
      effects: [capCost('light', 0.85), sat('light', 1.4, 'light.nightShifts'), sat('light', 1.3, 'light.trams')],
    },
    {
      id: 'light.flatRate', sector: 'light', kind: 'capital',
      name: 'Flat rate',
      blurb: 'The same price at every hour. Simple, fair, and the plant idles until dusk. The profit builds another plant.',
      cost: 60_000, requires: ['light.carbon'],
      effects: [margin('light', 0.03), sat('light', 0.85, 'light.nightShifts')],
    },
  ),

  {
    id: 'light.grid', sector: 'light', kind: 'capital',
    name: 'The National Grid',
    blurb: 'Central Electricity Board, 1926. One network, fewer, larger stations, and nowhere left unconnected.',
    cost: 80_000, requires: ['light.carbon'], effects: [capCost('light', 0.75)],
  },
  {
    id: 'light.slotMeter', sector: 'light', kind: 'capital',
    name: 'Penny-in-the-slot meter',
    blurb: 'Gas for any household with a penny, and a reliable penny for the company.',
    cost: 15_000, requires: ['light.batswing'], effects: [margin('light', 0.03)],
  },
  {
    id: 'light.phoebus', sector: 'light', kind: 'capital',
    name: 'Lamp makers’ agreement',
    blurb: 'Geneva, 1924: the makers agree a lamp should last a thousand hours and no longer. Sales are excellent.',
    cost: 120_000, requires: ['light.tungsten'], effects: [margin('light', 0.04), capCost('light', 1.1)],
  },
  {
    id: 'light.kentCoalfield', sector: 'light', kind: 'prospect',
    name: 'Open a new coalfield',
    blurb: 'Under the hop gardens of Kent, of all places. More coal to cook into gas.',
    cost: 30_000, repeatable: true, costGrowth: 2.2, maxLevel: 6,
    effects: [reserve('light', 0.25)],
  },
];

/* ---- Motion: chain to ×8.2 ---- */
const motionUpgrades: UpgradeDef[] = [
  ...chain('motion', ladder(25_000, 2.7, 5), [
    {
      id: 'motion.radial', name: 'Radial tyres', fold: 1.3,
      blurb: 'Michelin, 1946. Less rolling resistance, longer life, further trips.',
    },
    {
      id: 'motion.injection', name: 'Fuel injection', fold: 1.95,
      blurb: 'Retire the carburettor. Meter the petrol to the drop.',
    },
    {
      id: 'motion.leanBurn', name: 'Lean-burn engine', fold: 2.73,
      blurb: 'More air, less fuel, and a lengthy argument about nitrogen oxides.',
    },
    {
      id: 'motion.aero', name: 'Wind-tunnel bodywork', fold: 4.1,
      blurb: 'Smooth the brick into a jellybean. Every saloon now looks the same.',
    },
    {
      id: 'motion.hybrid', name: 'Hybrid drive', fold: 8.2,
      blurb: 'Catch the braking energy in a battery. Double the miles per gallon.',
    },
  ]),

  /* Fork 1: what the engineers' gains are spent on. */
  ...fork(
    {
      id: 'motion.economyStandard', sector: 'motion', kind: 'efficiency',
      name: 'Fleet economy standard',
      blurb: 'Cars must do so many miles to the gallon. Vans, it turns out, are not cars, and the family buys a van.',
      cost: 150_000, requires: ['motion.injection'],
      effects: [eta('motion', 1.3), sat('motion', 1.2, 'motion.suburbs')],
    },
    {
      id: 'motion.horsepower', sector: 'motion', kind: 'capital',
      name: 'The horsepower race',
      blurb: 'Spend the engineers’ gains on weight and power, not on miles per gallon. Customers prefer it, and drive further.',
      cost: 150_000, requires: ['motion.injection'],
      effects: [margin('motion', 0.04), half('motion', 1.2, 'motion.commuting')],
    },
  ),

  /* Fork 2: the jam. */
  ...fork(
    {
      id: 'motion.reliefRoads', sector: 'motion', kind: 'capital',
      name: 'Relief roads',
      blurb: 'Widen the road and the jam clears for a season. Then it fills again, from further away.',
      cost: 400_000, requires: ['motion.leanBurn'],
      effects: [capCost('motion', 0.85), sat('motion', 1.3, 'motion.commuting')],
    },
    {
      id: 'motion.roadPricing', sector: 'motion', kind: 'capital',
      name: 'Road pricing',
      blurb: 'Charge for the road at the busy hour. The jam thins; the space it frees fills with other traffic.',
      cost: 400_000, requires: ['motion.leanBurn'],
      effects: [margin('motion', 0.02), half('motion', 0.85, 'motion.commuting')],
    },
  ),

  {
    id: 'motion.motorways', sector: 'motion', kind: 'capital',
    name: 'Motorway programme',
    blurb: 'The M1, 1959. No junctions, no lights, no reason to stay at home.',
    cost: 250_000, requires: ['motion.injection'], effects: [capCost('motion', 0.8)],
  },
  {
    id: 'motion.hirePurchase', sector: 'motion', kind: 'capital',
    name: 'Hire purchase',
    blurb: 'A car on the never-never. The never arrives monthly.',
    cost: 80_000, requires: ['motion.radial'], effects: [margin('motion', 0.03)],
  },
  {
    id: 'motion.northSea', sector: 'motion', kind: 'prospect',
    name: 'North Sea licence',
    blurb: 'Drill where the weather is worst and the oil is dearest. It is still oil.',
    cost: 250_000, repeatable: true, costGrowth: 2.2, maxLevel: 6,
    effects: [reserve('motion', 0.25)],
  },
];

/* ---- Compute: bought ×21.6 on top of the automatic halving ---- */
const computeUpgrades: UpgradeDef[] = [
  ...chain('compute', ladder(150_000, 3.9, 5), [
    {
      id: 'compute.multicore', name: 'Multi-core chips', fold: 1.5,
      blurb: 'The clock speed hit a wall, so put several processors behind it.',
    },
    {
      id: 'compute.virtualisation', name: 'Virtualisation', fold: 2.4,
      blurb: 'Ten idle servers become one busy one. Nine new projects fill the gap.',
    },
    {
      id: 'compute.hyperscale', name: 'Hyperscale data centres', fold: 4.32,
      blurb: 'A warehouse of computers beside a river and a cheap substation.',
    },
    {
      id: 'compute.gpu', name: 'GPU acceleration', fold: 10.8,
      blurb: 'Chips built for drawing dragons turn out to be good at sums.',
    },
    {
      id: 'compute.accelerators', name: 'Custom AI accelerators', fold: 21.6,
      blurb: 'Silicon that does one thing, matrix multiplication, unimaginably often.',
    },
  ]),

  /* Fork 1: who pays. */
  ...fork(
    {
      id: 'compute.adFunded', sector: 'compute', kind: 'capital',
      name: 'Advertising model',
      blurb: 'Free at the point of use. The user is the point of use, and uses it all day.',
      cost: 3_000_000, requires: ['compute.virtualisation'],
      effects: [half('compute', 1.4), margin('compute', 0.02)],
    },
    {
      id: 'compute.subscriptions', sector: 'compute', kind: 'capital',
      name: 'Subscriptions',
      blurb: 'A fair price, monthly, for ever. Fewer users, steadier profits, and the profits buy servers.',
      cost: 3_000_000, requires: ['compute.virtualisation'],
      effects: [margin('compute', 0.05), sat('compute', 0.9)],
    },
  ),

  /* Fork 2: what to do with the heat. */
  ...fork(
    {
      id: 'compute.pueCertificate', sector: 'compute', kind: 'efficiency',
      name: 'Efficient data-centre certificate',
      blurb: 'Every watt audited, the cooling cut to the bone. The certificate is framed in the lobby of the next campus.',
      cost: 8_000_000, requires: ['compute.hyperscale'],
      effects: [eta('compute', 1.25), sat('compute', 1.3, 'compute.training')],
    },
    {
      id: 'compute.wasteHeat', sector: 'compute', kind: 'capital',
      name: 'Waste heat to the town',
      blurb: 'Pipe the warm water into the district heating. It pays, so they build another data centre to pay twice.',
      cost: 8_000_000, requires: ['compute.hyperscale'],
      effects: [absorb('compute', 0.002), margin('compute', 0.02)],
    },
  ),

  {
    id: 'compute.commodity', sector: 'compute', kind: 'capital',
    name: 'Commodity servers',
    blurb: 'Buy cheap boxes by the thousand and expect them to fail.',
    cost: 800_000, requires: ['compute.multicore'], effects: [capCost('compute', 0.7)],
  },
  {
    id: 'compute.newFab', sector: 'compute', kind: 'prospect',
    name: 'Build another fab',
    blurb: 'Twenty billion, a desert, and most of a river’s worth of ultrapure water.',
    cost: 2_000_000, repeatable: true, costGrowth: 2.2, maxLevel: 6,
    effects: [reserve('compute', 0.25)],
  },
];

/* ---- Code: chain to ×480 ---- */
const codeUpgrades: UpgradeDef[] = [
  ...chain('code', ladder(1_500_000, 7, 4), [
    {
      id: 'code.autocomplete', name: 'Autocomplete', fold: 3,
      blurb: 'It finishes your lines. Then your functions. Then your sentences.',
    },
    {
      id: 'code.chat', name: 'Chat assistant', fold: 12,
      blurb: 'Describe the feature; argue with it until it exists.',
    },
    {
      id: 'code.agent', name: 'Coding agent', fold: 60,
      blurb: 'Give it the ticket and go to lunch. Come back to a pull request.',
    },
    {
      id: 'code.fleets', name: 'Agent fleets', fold: 480,
      blurb: 'A hundred agents, one backlog, no lunch. You are now the reviewer.',
    },
  ]),

  /* Fork 1: who reads it. */
  ...fork(
    {
      id: 'code.agentReviewers', sector: 'code', kind: 'efficiency',
      name: 'Agent reviewers',
      blurb: 'Machines review what machines wrote. Review gets cheap, so everything gets shipped.',
      cost: 20_000_000, requires: ['code.chat'],
      effects: [eta('code', 1.5), sat('code', 1.3)],
    },
    {
      id: 'code.seniorReview', sector: 'code', kind: 'capital',
      name: 'Senior review',
      blurb: 'Someone who remembers why it was written that way. Slower, and some of the code even gets smaller.',
      cost: 20_000_000, requires: ['code.chat'],
      effects: [eta('code', 1.1), absorb('code', 0.0005)],
    },
  ),

  /* Fork 2: how to charge. */
  ...fork(
    {
      id: 'code.perSeat', sector: 'code', kind: 'capital',
      name: 'Per-seat pricing',
      blurb: 'Charge for every agent as if it were an employee. It is cheaper than one, so hire forty.',
      cost: 40_000_000, requires: ['code.agent'],
      effects: [margin('code', 0.03)],
    },
    {
      id: 'code.perToken', sector: 'code', kind: 'capital',
      name: 'Pay as you go',
      blurb: 'A fraction of a penny a request. Nobody counts fractions of a penny, so nobody stops.',
      cost: 40_000_000, requires: ['code.agent'],
      effects: [half('code', 1.3), margin('code', 0.01)],
    },
  ),

  {
    id: 'code.openSource', sector: 'code', kind: 'capital',
    name: 'Open source everything',
    blurb: 'Every wheel already invented, free, and maintained by one person in Nebraska.',
    cost: 6_000_000, requires: ['code.autocomplete'], effects: [capCost('code', 0.6)],
  },
];

const upgrades: UpgradeDef[] = [
  ...steamUpgrades,
  ...lightUpgrades,
  ...motionUpgrades,
  ...computeUpgrades,
  ...codeUpgrades,
];

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

const DUTY_LABEL = 'Hold price at {pct}% of the fall';
const CAP_LABEL = 'Cap at {pct}% of the budget';
const CAP_FIRST = { 0: 'Hold to the budget line' };
const SUFF_LABEL = 'Settle at {pct}% of appetite';
const CAP_VALUES = [1, 0.95, 0.9];
const CAP_LEAK = [3, 4, 5];
const DUTY_VALUES = [0.3, 0.6, 0.9];
const SUFF_VALUES = [0.85, 0.7, 0.55];
const SHARE_VALUES = [0.1, 0.2, 0.35];
const GREEN_VALUES = [0.3, 0.6, 0.9];
/** Every duty and cap catch ends by naming the dividend's rebound (economy-wide, through population). */
const DIVIDEND = 'Paid back as a dividend, the levy is spent, and the population grows.';

const levers: LeverDef[] = [
  /* ---- Steam ---- */
  lever({
    id: 'steam.duty', sector: 'steam', kind: 'duty',
    name: 'Fuel duty escalator',
    blurb: 'Tax coal by the ton, rising as the engines improve, so power stays dear.',
    catch: `Cheaper engines no longer mean cheaper power. Nor more income. ${DIVIDEND}`,
    values: DUTY_VALUES, cost: 100, upkeep: 0.05, label: DUTY_LABEL, recycle: RECYCLE,
  }),
  lever({
    id: 'steam.cap', sector: 'steam', kind: 'cap',
    name: 'Smoke abatement cap',
    blurb: 'A ceiling on coal burned in the borough, falling with the budget line. Permits for whatever is under it.',
    catch: `Set it far below demand and the furnaces move just outside the borough. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 120, upkeep: 0.06, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
  }),
  lever({
    id: 'steam.sufficiency', sector: 'steam', kind: 'sufficiency',
    name: 'Temperance of consumption',
    blurb: 'Sermons, societies and pamphlets in favour of wanting a little less.',
    catch: 'Slow to take. Appetite, once lowered, buys less of everything you sell.',
    values: SUFF_VALUES, value2: [0.002, 0.003, 0.004], cost: 80, upkeep: 0.02, label: SUFF_LABEL,
    repeat: { value2Step: 0.0005 },
  }),
  lever({
    id: 'steam.circularity', sector: 'steam', kind: 'circularity',
    name: 'Coke & slack recovery',
    blurb: 'Burn the dust and the cinders the pit used to tip on the spoil heap.',
    catch: 'Every ton saved is a ton the next engine will happily burn.',
    values: SHARE_VALUES, cost: 90, upkeep: 0.02, label: 'Recover {pct}% of the burn',
  }),
  lever({
    id: 'steam.substitution', sector: 'steam', kind: 'substitution',
    name: 'Water wheels & wind',
    blurb: 'Keep the old mills turning on the river and the breeze.',
    catch: 'Dearer per horsepower, and the river only flows so fast.',
    values: SHARE_VALUES, value2: [100, 300, 800], cost: 110, upkeep: 0.05, label: 'Supply {pct}% by river',
    repeat: { value2Step: 300 },
  }),

  /* ---- Light ---- */
  lever({
    id: 'light.duty', sector: 'light', kind: 'duty',
    name: 'Gas & lighting rate',
    blurb: 'A municipal rate on every therm, rising with the lamps’ efficiency.',
    catch: `The streets stay dimmer than they could. The ratepayers notice. ${DIVIDEND}`,
    values: DUTY_VALUES, cost: 160, upkeep: 0.08, label: DUTY_LABEL, recycle: RECYCLE,
  }),
  lever({
    id: 'light.cap', sector: 'light', kind: 'cap',
    name: 'Gas works allowance',
    blurb: 'So many therms a year for the whole town, a little fewer each decade, and permits to trade the rest.',
    catch: `The allowance was drafted from the gas companies’ own forecasts. Tighten it before it bites. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 170, upkeep: 0.08, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
  }),
  lever({
    id: 'light.sufficiency', sector: 'light', kind: 'sufficiency',
    name: 'Lights out at midnight',
    blurb: 'Shop signs and empty offices go dark when the pubs do.',
    catch: 'Midnight comes for the night shift too, eventually.',
    values: SUFF_VALUES, value2: [0.002, 0.003, 0.004], cost: 130, upkeep: 0.03, label: SUFF_LABEL,
    repeat: { value2Step: 0.0005 },
  }),
  lever({
    id: 'light.greenSpending', sector: 'light', kind: 'greenSpending',
    name: 'Public libraries & parks',
    blurb: 'Give the money saved on lighting somewhere to go that is not a furnace.',
    catch: 'Only blunts the spill into older trades; it does nothing for the lamps.',
    values: GREEN_VALUES, cost: 140, upkeep: 0.03, label: 'Absorb {pct}% of the savings',
  }),
  lever({
    id: 'light.substitution', sector: 'light', kind: 'substitution',
    name: 'Hydro schemes',
    blurb: 'Dam a Highland glen and send the current south.',
    catch: 'There are only so many glens, and each one costs a fortune.',
    values: SHARE_VALUES, value2: [1_000, 3_000, 8_000], cost: 180, upkeep: 0.08, label: 'Supply {pct}% by hydro',
    repeat: { value2Step: 3_000 },
  }),

  /* ---- Motion ---- */
  lever({
    id: 'motion.duty', sector: 'motion', kind: 'duty',
    name: 'Fuel duty escalator',
    blurb: 'Petrol duty that rises faster than engines improve. Briefly popular with nobody.',
    catch: `Every efficient engine still costs as much to run. Hauliers blockade the refineries. ${DIVIDEND}`,
    values: DUTY_VALUES, cost: 250, upkeep: 0.12, label: DUTY_LABEL, recycle: RECYCLE,
  }),
  lever({
    id: 'motion.cap', sector: 'motion', kind: 'cap',
    name: 'Oil import quota',
    blurb: 'So many barrels a year, fewer each decade, and not one more. Trade the permits if you must.',
    catch: `Squeeze too hard and the barrels arrive by other routes. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 280, upkeep: 0.14, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
  }),
  lever({
    id: 'motion.sufficiency', sector: 'motion', kind: 'sufficiency',
    name: 'The 15-minute town',
    blurb: 'School, shop and surgery within a walk. The car stays on the drive.',
    catch: 'The suburbs were built for the car. They will not walk anywhere quickly.',
    values: SUFF_VALUES, value2: [0.0015, 0.0025, 0.0035], cost: 200, upkeep: 0.05, label: SUFF_LABEL,
    repeat: { value2Step: 0.0005 },
  }),
  lever({
    id: 'motion.substitution', sector: 'motion', kind: 'substitution',
    name: 'Electrified rail & trams',
    blurb: 'Put the wires back up. Some of the old tram lines are still under the tarmac.',
    catch: 'Dearer to build per mile, and it only goes where the rails go.',
    values: SHARE_VALUES, value2: [8_000, 25_000, 70_000], cost: 270, upkeep: 0.12, label: 'Carry {pct}% by rail',
    repeat: { value2Step: 25_000 },
  }),
  lever({
    id: 'motion.greenSpending', sector: 'motion', kind: 'greenSpending',
    name: 'Insulation grants',
    blurb: 'Steer the money saved on petrol into loft lagging instead of more lamps.',
    catch: 'Cuts the spill into the lit world; the motorways are untouched.',
    values: GREEN_VALUES, cost: 220, upkeep: 0.05, label: 'Absorb {pct}% of the savings',
  }),

  /* ---- Compute ---- */
  lever({
    id: 'compute.cap', sector: 'compute', kind: 'cap',
    name: 'Grid allocation',
    blurb: 'Data centres get the connection they are given, not the one they ask for, and a little less each decade.',
    catch: `Too tight and the server farms reappear in a friendlier jurisdiction. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 400, upkeep: 0.2, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
  }),
  lever({
    id: 'compute.sufficiency', sector: 'compute', kind: 'sufficiency',
    name: 'Digital sobriety',
    blurb: 'Autoplay off, resolution down, the old phone kept another year.',
    catch: 'Asks people to want less of something that gets cheaper every minute.',
    values: SUFF_VALUES, value2: [0.002, 0.003, 0.004], cost: 320, upkeep: 0.08, label: SUFF_LABEL,
    repeat: { value2Step: 0.0005 },
  }),
  lever({
    id: 'compute.circularity', sector: 'compute', kind: 'circularity',
    name: 'Chip recovery',
    blurb: 'Strip the gold, the gallium and the cobalt back out of last year’s servers.',
    catch: 'Recovered silicon goes straight into next year’s, larger, servers.',
    values: SHARE_VALUES, cost: 350, upkeep: 0.08, label: 'Recover {pct}% of the hardware',
  }),
  lever({
    id: 'compute.substitution', sector: 'compute', kind: 'substitution',
    name: 'Solar & storage',
    blurb: 'Panels on every warehouse roof, batteries in the car park.',
    catch: 'Capped by how much sun falls on the roof, which does not double every two years.',
    values: SHARE_VALUES, value2: [100_000, 400_000, 1_500_000], cost: 420, upkeep: 0.2, label: 'Run {pct}% on sunshine',
    repeat: { value2Step: 500_000 },
  }),
  lever({
    id: 'compute.duty', sector: 'compute', kind: 'duty',
    name: 'Carbon price',
    blurb: 'A price per ton on the power behind every calculation.',
    catch: `The calculations get cheaper faster than any minister dares raise it. ${DIVIDEND}`,
    values: DUTY_VALUES, cost: 380, upkeep: 0.2, label: DUTY_LABEL, recycle: RECYCLE,
  }),

  /* ---- Code ---- */
  lever({
    id: 'code.deletion', sector: 'code', kind: 'deletion',
    name: 'Deletion sprints',
    blurb: 'A fortnight in which the only acceptable pull request removes something.',
    catch: 'Spends attention you could be shipping with. Nobody gets promoted for it.',
    values: [0.05, 0.1, 0.2], value2: [0.001, 0.0012, 0.0015], cost: 600, upkeep: 0.3,
    label: 'Spend {pct}% of attention deleting', repeat: { value2Step: 0.0002 },
  }),
  lever({
    id: 'code.reviewGate', sector: 'code', kind: 'reviewGate',
    name: 'Review gates',
    blurb: 'Nothing ships until a person has read it. All of it.',
    catch: 'Shipping slows to the speed of reading. Which was rather the point.',
    values: [0.2, 0.35, 0.5], cost: 500, upkeep: 0.12, label: 'Review {pct}% of changes',
  }),
  lever({
    id: 'code.sharedLibs', sector: 'code', kind: 'sharedLibs',
    name: 'Shared libraries',
    blurb: 'One date picker for the whole company, instead of one per agent.',
    catch: 'Someone has to own the date picker. It will be you.',
    values: [0.25, 0.45, 0.65], cost: 450, upkeep: 0.1, label: 'Reuse {pct}% of new code',
  }),
  lever({
    id: 'code.sufficiency', sector: 'code', kind: 'sufficiency',
    name: 'Don’t build it',
    blurb: 'Before writing the app, ask whether a spreadsheet, or nothing, would do.',
    catch: 'The agents are idle and faintly reproachful. The backlog is shorter.',
    values: SUFF_VALUES, value2: [0.003, 0.004, 0.005], cost: 400, upkeep: 0.1, label: SUFF_LABEL,
    repeat: { value2Step: 0.0005 },
  }),
  lever({
    id: 'code.usageCap', sector: 'code', kind: 'cap',
    name: 'Usage caps',
    blurb: 'So many hours of human attention a week for the agents’ output, and no more. Rate limits for the reviewers.',
    catch: `Every rival is lifting its limits. Customers notice whose are lower. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 550, upkeep: 0.25, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
  }),
];

/* ------------------------------------------------------------------ */
/* KNOW-HOW (tempting): two trees                                      */
/* ------------------------------------------------------------------ */

/*
 * Steam tree: the Cornish school (η) against the Manchester school (cheaper engines) is the first fork. Every
 * efficiency node carries a satMul or halfPriceMul > 1: runs start faster and hit the wall sooner, and the node
 * says so in numbers. General tree: the later industries' schools plus the meta choices (purse or patents, Mandate
 * or smaller families, a seat at the table or a heavier purse).
 */
const knowhow: KnowhowDef[] = [
  /* ---- Steam tree ---- */
  {
    id: 'kh.cornishSchool', name: 'The Cornish school', tree: 'steam', tier: 1, branch: 'steam-1',
    blurb: 'Engineers who can wring another million of duty from any engine. The pits go deeper, sooner.',
    cost: 12, costGrowth: 1.6, maxLevel: 5,
    effects: [eta('steam', 1.1), sat('steam', 1.05)],
  },
  {
    id: 'kh.manchesterSchool', name: 'The Manchester school', tree: 'steam', tier: 1, branch: 'steam-1',
    blurb: 'Engines by the gross, cheap and good enough. There are soon a great many of them.',
    cost: 12, costGrowth: 1.6, maxLevel: 5,
    effects: [capCost('steam', 0.9), half('steam', 1.04)],
  },
  {
    id: 'kh.apprenticeships', name: 'Apprenticeships', tree: 'steam', tier: 1,
    blurb: 'Every engine wright trains two more. The pits empty all the sooner.',
    cost: 10, costGrowth: 1.6, maxLevel: 5,
    effects: [eta('steam', 1.08), sat('steam', 1.03)],
  },
  {
    id: 'kh.deepMining', name: 'Deep-mining surveys', tree: 'steam', tier: 2, branch: 'steam-2',
    blurb: 'Maps of the concealed coalfields. More coal at the start of every run, and every reason to burn it.',
    cost: 40, costGrowth: 1.7, maxLevel: 5,
    effects: [reserve('steam', 0.12)],
  },
  {
    id: 'kh.smokeInspectors', name: 'Smoke inspectors', tree: 'steam', tier: 2, branch: 'steam-2',
    blurb: 'Men with notebooks who stand downwind of chimneys. The air clears a little faster.',
    cost: 40, costGrowth: 1.7, maxLevel: 5,
    effects: [absorb('steam', 0.001)],
  },
  {
    id: 'kh.machineShop', name: 'Machine-shop lore', tree: 'steam', tier: 2,
    blurb: 'Tricks of the trade, written down at last. Engines cost less to build, and so there are more.',
    cost: 20, costGrowth: 1.7, maxLevel: 6,
    effects: [capCost('steam', 0.92), half('steam', 1.03)],
  },
  {
    id: 'kh.dutyLeague', name: 'The duty league', tree: 'steam', tier: 3, branch: 'steam-3',
    blurb: 'Published league tables, monthly prizes, envy as a method. Each run reaches the bottom of the pit faster.',
    cost: 150, costGrowth: 1.8, maxLevel: 4,
    effects: [eta('steam', 1.1), sat('steam', 1.06)],
  },
  {
    id: 'kh.friendlySociety', name: 'Miners’ friendly societies', tree: 'steam', tier: 3, branch: 'steam-3',
    blurb: 'A penny a week against injury and old age. Nothing burns faster; people simply live a little better.',
    cost: 150, costGrowth: 1.8, maxLevel: 4,
    effects: [{ type: 'wellbeingAdd', value: 1 }],
  },

  /* ---- General tree ---- */
  {
    id: 'kh.seedCapital', name: 'Seed capital', tree: 'general', tier: 1, branch: 'general-1',
    blurb: 'Start each run with a heavier purse. Get to the bottom of the pit faster.',
    cost: 8, costGrowth: 1.5, maxLevel: 8,
    effects: [{ type: 'startCapitalMul', value: 1.8 }],
  },
  {
    id: 'kh.patentPool', name: 'Patent pool', tree: 'general', tier: 1, branch: 'general-1',
    blurb: 'Everyone licenses everyone. Improvements arrive cheap, and early.',
    cost: 15, costGrowth: 1.8, maxLevel: 8,
    effects: [{ type: 'costMul', value: 0.92 }],
  },
  {
    id: 'kh.royalInstitution', name: 'Evening lectures in electricity', tree: 'general', tier: 2,
    blurb: 'Packed halls, sparks on demand. The lamps get brighter, quicker, and stay on later.',
    cost: 25, costGrowth: 1.7, maxLevel: 8,
    effects: [eta('light', 1.12), sat('light', 1.04)],
  },
  {
    id: 'kh.motorSchool', name: 'Automotive engineering school', tree: 'general', tier: 2,
    blurb: 'Graduates who can find another mile in any gallon. They will drive it, too.',
    cost: 60, costGrowth: 1.7, maxLevel: 8,
    effects: [eta('motion', 1.12), half('motion', 1.04)],
  },
  {
    id: 'kh.pamphleteers', name: 'Pamphleteers', tree: 'general', tier: 2, branch: 'general-2',
    blurb: 'Cheap print and strong opinions. The public mood moves quicker, in both directions.',
    cost: 45, costGrowth: 1.7, maxLevel: 5,
    effects: [{ type: 'mandateRateMul', value: 1.1 }],
  },
  {
    id: 'kh.schooling', name: 'Elementary schooling', tree: 'general', tier: 2, branch: 'general-2',
    blurb: 'Children at school are not down the pit. Families grow smaller, and ask for more.',
    cost: 45, costGrowth: 1.7, maxLevel: 5,
    effects: [{ type: 'popGrowthMul', value: 0.92 }],
  },
  {
    id: 'kh.csDepartment', name: 'Computer science department', tree: 'general', tier: 3,
    blurb: 'A new building, a new chip, a new reason for a bigger data centre.',
    cost: 120, costGrowth: 1.8, maxLevel: 8,
    effects: [eta('compute', 1.15), sat('compute', 1.05)],
  },
  {
    id: 'kh.bootcamps', name: 'Prompt bootcamps', tree: 'general', tier: 3,
    blurb: 'Twelve weeks to ten-times productivity, and ten times as much to maintain.',
    cost: 250, costGrowth: 1.8, maxLevel: 8,
    effects: [eta('code', 1.15), sat('code', 1.05)],
  },
  {
    id: 'kh.civilService', name: 'Civil service examinations', tree: 'general', tier: 3, branch: 'general-3',
    blurb: 'Appointment on merit, not on patronage. One more institution can be seated at the table, for good.',
    cost: 400, costGrowth: 1, maxLevel: 1,
    effects: [{ type: 'slotAdd', value: 1 }],
  },
  {
    id: 'kh.ventureCapital', name: 'Venture capital', tree: 'general', tier: 3, branch: 'general-3',
    blurb: 'Money that wants a hundredfold back by Thursday. Every run starts richer and spends faster.',
    cost: 400, costGrowth: 1, maxLevel: 1,
    effects: [{ type: 'startCapitalMul', value: 3 }, { type: 'costMul', value: 0.85 }],
  },
];

/* ------------------------------------------------------------------ */
/* INSTITUTIONS (slow): 14, with levels and seats                      */
/* ------------------------------------------------------------------ */

/** Levels 2 and 3 cost 2.5× and 6× level 1 by default. */
function levels(cost: number, defs: { effects: EffectDef[]; label: string }[], growth = [2.5, 6]): InstitutionLevelDef[] {
  return defs.map((d, i) => ({ cost: sig2(cost * growth[i]), effects: d.effects, label: d.label }));
}

/** An institution that starts one lever, at a level that rises with its own. */
function leverInstitution(
  s: Omit<InstitutionDef, 'effects' | 'nextLevels'> & { lever: string; maxLevel: number; leverName: string },
): InstitutionDef {
  const { lever: lv, maxLevel, leverName, ...rest } = s;
  const next: { effects: EffectDef[]; label: string }[] = [];
  for (let level = 2; level <= maxLevel; level++) {
    next.push({ effects: [startLever(lv, level)], label: `${leverName} starts at level ${level}` });
  }
  return { ...rest, effects: [startLever(lv, 1)], nextLevels: levels(s.cost, next) };
}

const institutions: InstitutionDef[] = [
  {
    id: 'inst.statisticsOffice', name: 'Statistics Office',
    blurb: 'Clerks who add up the whole country’s coal, not just the engine’s. The rebound is visible from minute one.',
    cost: 15, effects: [{ type: 'reveal' }],
    nextLevels: levels(15, [
      { effects: [{ type: 'mandateRateMul', value: 1.1 }], label: 'Monthly returns: Mandate accrues 10% faster' },
    ], [4]),
  },
  leverInstitution({
    id: 'inst.alkaliInspectorate', name: 'Alkali Inspectorate',
    blurb: 'Alkali Act, 1863: the first inspectors of what chimneys put in the air. The smoke cap is law from the start.',
    cost: 40, lever: 'steam.cap', leverName: 'Smoke abatement cap', maxLevel: 3,
  }),
  leverInstitution({
    id: 'inst.standingDuty', name: 'Standing fuel duty',
    blurb: 'The escalator is law before the first engine is built.',
    cost: 45, requires: ['inst.statisticsOffice'], lever: 'steam.duty', leverName: 'Fuel duty escalator', maxLevel: 3,
  }),
  leverInstitution({
    id: 'inst.royalCommission', name: 'Royal Commission on Coal',
    blurb: 'Sits for five years and reports, at length, that there is plenty. Meanwhile, the slack heaps are burned too.',
    cost: 45, requires: ['inst.statisticsOffice'], lever: 'steam.circularity', leverName: 'Coke & slack recovery', maxLevel: 3,
  }),
  leverInstitution({
    id: 'inst.temperance', name: 'Temperance societies',
    blurb: 'Tea, hymns and a pledge to want less. Appetite is already modest when the first engine is lit.',
    cost: 40, lever: 'steam.sufficiency', leverName: 'Temperance of consumption', maxLevel: 3,
  }),
  {
    id: 'inst.cleanAirAct', name: 'Clean Air Act',
    blurb: 'Smokeless zones and grants for new grates. The air clears a little faster in every run.',
    cost: 80,
    effects: [absorb('steam', 0.003), absorb('light', 0.003)],
    nextLevels: levels(80, [
      { effects: [absorb('motion', 0.003)], label: 'Extended to exhaust: Motion’s air clears faster too' },
      { effects: [absorb('compute', 0.002), absorb('steam', 0.002)], label: 'Carbon added to the schedule; Steam tightened again' },
    ]),
  },
  {
    id: 'inst.broadcaster', name: 'A public broadcaster',
    blurb: 'Shared facts, nightly. Arguments for restraint find an audience.',
    cost: 90, effects: [{ type: 'mandateRateMul', value: 1.25 }],
    nextLevels: levels(90, [
      { effects: [{ type: 'mandateRateMul', value: 1.15 }], label: 'A second channel: Mandate accrues faster again' },
    ]),
  },
  {
    id: 'inst.sovereignFund', name: 'Sovereign wealth fund',
    blurb: 'Bank the windfall and spend only the interest. The spending rule is the real institution.',
    cost: 120, effects: [{ type: 'wellbeingAdd', value: 1.5 }],
    nextLevels: levels(120, [
      { effects: [{ type: 'wellbeingAdd', value: 1.5 }], label: 'The fund compounds: wellbeing +1.5 more' },
      { effects: [{ type: 'wellbeingAdd', value: 2 }, { type: 'startCapitalMul', value: 1.5 }], label: 'A dividend at the start of every run' },
    ]),
  },
  leverInstitution({
    id: 'inst.parksTrust', name: 'Municipal improvement trust',
    blurb: 'Libraries, baths and parks are funded before the lamps are lit.',
    cost: 110, requires: ['inst.broadcaster'], lever: 'light.greenSpending', leverName: 'Public libraries & parks', maxLevel: 3,
  }),
  {
    id: 'inst.revenueDecoupling', name: 'Revenue decoupling',
    blurb: 'Pay the gas company for light delivered, not for therms sold. It stops building load.',
    cost: 130, effects: [startLever('light.sufficiency', 1)],
    nextLevels: levels(130, [
      { effects: [startLever('light.cap', 1)], label: 'The gas works allowance is law from the start' },
      { effects: [startLever('light.sufficiency', 2), startLever('light.cap', 2)], label: 'Both start a level higher' },
    ]),
  },
  leverInstitution({
    id: 'inst.greenBelt', name: 'Green belt',
    blurb: 'A ring of fields the suburbs may not cross. Towns stay walkable.',
    cost: 150, lever: 'motion.sufficiency', leverName: 'The 15-minute town', maxLevel: 3,
  }),
  {
    id: 'inst.climateCommittee', name: 'Independent climate committee',
    blurb: 'Carbon budgets set years ahead, out of reach of the next election. Every cap is law from the start. Takes two seats.',
    cost: 300, requires: ['inst.alkaliInspectorate', 'inst.standingDuty'], slots: 2,
    effects: [startLever('steam.cap', 1), startLever('light.cap', 1), startLever('motion.cap', 1), startLever('compute.cap', 1)],
    nextLevels: levels(300, [
      {
        effects: [startLever('steam.cap', 2), startLever('light.cap', 2), startLever('motion.cap', 2), startLever('compute.cap', 2)],
        label: 'Every cap starts at level 2',
      },
      {
        effects: [startLever('steam.cap', 3), startLever('light.cap', 3), startLever('motion.cap', 3), startLever('compute.cap', 3)],
        label: 'Every cap starts at level 3',
      },
    ]),
  },
  leverInstitution({
    id: 'inst.gridCode', name: 'Grid connection code',
    blurb: 'Data centres queue for power like everybody else.',
    cost: 260, requires: ['inst.cleanAirAct'], lever: 'compute.cap', leverName: 'Grid allocation', maxLevel: 3,
  }),
  {
    id: 'inst.engineeringGuild', name: 'Engineering guild',
    blurb: 'A profession with standards: nothing ships that no one has read.',
    cost: 350, requires: ['inst.gridCode'], effects: [startLever('code.reviewGate', 1)],
    nextLevels: levels(350, [
      { effects: [startLever('code.deletion', 1)], label: 'Deletion sprints are in the guild’s rules too' },
      { effects: [startLever('code.reviewGate', 2), startLever('code.sharedLibs', 1)], label: 'Stricter review; one shared library for all' },
    ]),
  },
];

/* ------------------------------------------------------------------ */
/* ACHIEVEMENTS: 5 built in + 20 with conditions                       */
/* ------------------------------------------------------------------ */

const SECTOR_NAMES: Record<string, string> = {
  steam: 'Steam', light: 'Light', motion: 'Motion', compute: 'Compute', code: 'Code',
};

/** Open-ness test: a sector stat is false while the sector is closed, so "anything delivered" means "open". */
const isOpen = (sector: SectorId): Cond => ({ stat: 'serviceDelivered', sector, op: '>', value: 0 });

const backfireIn = (sector: SectorId, blurb: string): AchievementDef => ({
  id: `ach.backfire.${sector}`, name: `Backfire in ${SECTOR_NAMES[sector]}`, blurb,
  when: { stat: 'rebound', sector, op: '>', value: 1 },
});

const decadeIn = (sector: SectorId, name: string, blurb: string): AchievementDef => ({
  id: `ach.decade.${sector}`, name, blurb,
  when: { stat: 'budgetDecades', sector, op: '>=', value: 1 },
});

const achievements: AchievementDef[] = [
  /* Built in (granted by the core's own rules). */
  { id: 'firstReckoning', name: 'The First Reckoning', blurb: 'Ended a run and looked back at the ledger.' },
  { id: 'backfire', name: 'Backfire', blurb: 'Watched an industry’s savings be eaten entirely, and then some.' },
  {
    id: 'jevonsWasRight', name: 'Jevons Was Right',
    blurb: 'Bought every efficiency card of an industry while its consumption grew tenfold.',
  },
  {
    id: 'degrowthByAccident', name: 'Degrowth by Accident', hidden: true,
    blurb: 'Consumption fell, because there was hardly anyone left to consume.',
  },
  { id: 'steadyState', name: 'Steady State', blurb: 'Held an industry inside its budget, with wellbeing up, for fifty years.' },

  /* Backfire, industry by industry. */
  backfireIn('light', 'Lamps many times thriftier, and more gas burned than ever.'),
  backfireIn('motion', 'Twice the miles to the gallon, and more gallons.'),
  backfireIn('compute', 'Each sum cheaper by the hour; the power bill dearer by the day.'),
  backfireIn('code', 'Every feature cheaper to write, and less attention left than before.'),

  /* First decade within budget, industry by industry. */
  decadeIn('steam', 'A Decade on the Line', 'Ten years of Steam inside its coal budget, with nobody going without.'),
  decadeIn('light', 'A Decade by Lamplight', 'Ten years of Light inside its budget.'),
  decadeIn('motion', 'A Decade at Fifty', 'Ten years of Motion inside its oil budget.'),
  decadeIn('compute', 'A Decade Without Upgrading', 'Ten years of Compute inside its budget.'),
  decadeIn('code', 'A Decade of Reading', 'Ten years of Code inside its attention budget.'),

  /* Unlocked frugally. */
  {
    id: 'ach.frugal.light', name: 'Lit on a Shoestring',
    blurb: 'Opened Light without Steam’s coal use ever trebling.',
    when: { all: [isOpen('light'), { stat: 'peakRFold', sector: 'steam', op: '<', value: 3 }] },
  },
  {
    id: 'ach.frugal.motion', name: 'Motoring Modestly',
    blurb: 'Opened Motion without Light’s gas use ever trebling.',
    when: { all: [isOpen('motion'), { stat: 'peakRFold', sector: 'light', op: '<', value: 3 }] },
  },
  {
    id: 'ach.frugal.compute', name: 'Computing Carefully',
    blurb: 'Opened Compute without Motion’s oil use ever trebling.',
    when: { all: [isOpen('compute'), { stat: 'peakRFold', sector: 'motion', op: '<', value: 3 }] },
  },

  /* The long view. */
  {
    id: 'ach.century.steam', name: 'A Century Within Budget',
    blurb: 'Ten unbroken decades of Steam inside its budget in a single run.',
    when: { stat: 'budgetDecades', sector: 'steam', op: '>=', value: 10 },
  },
  {
    id: 'ach.unburnt', name: 'Left in the Ground',
    blurb: 'Forty minutes into a run, with three quarters of the coal still unmined.',
    when: { all: [{ stat: 'time', op: '>=', value: 2_400 }, { stat: 'reserveFraction', sector: 'steam', op: '>', value: 0.75 }] },
  },
  {
    id: 'ach.fullHouse', name: 'All Industries Open',
    blurb: 'Steam, Light, Motion, Compute and Code, all running at once.',
    when: isOpen('code'),
  },
  {
    id: 'ach.coalQuestion', name: 'Required Reading',
    blurb: 'Bought The Coal Question, and read it.',
    when: { owns: 'steam.coalQuestion' },
  },
  {
    id: 'ach.tenReckonings', name: 'Ten Inquiries',
    blurb: 'Ten Reckonings. The commission has its own building now.',
    when: { stat: 'reckonings', op: '>=', value: 10 },
  },

  /* Hidden. */
  {
    id: 'ach.handCranked', name: 'Hand-Cranked', hidden: true,
    blurb: 'Sold power by hand two thousand times in one run.',
    when: { stat: 'clicks', op: '>=', value: 2_000 },
  },
  {
    id: 'ach.peaSouperSeason', name: 'Black Fog Season', hidden: true,
    blurb: 'Every smog crisis Steam can have, in a single run.',
    when: { stat: 'crises', sector: 'steam', op: '>=', value: 3 },
  },
  {
    id: 'ach.lastLump', name: 'The Last Lump', hidden: true,
    blurb: 'Burned Steam down to its final hundredth of the coal.',
    when: { stat: 'reserveFraction', sector: 'steam', op: '<', value: 0.01 },
  },
  {
    id: 'ach.jevonsWasWrong', name: 'Jevons Was Wrong, Once', hidden: true,
    blurb: 'Steam engines ten times thriftier, and not a ton more coal burned than at the start.',
    when: {
      all: [
        { stat: 'etaFold', sector: 'steam', op: '>=', value: 10 },
        { stat: 'rFold', sector: 'steam', op: '<=', value: 1 },
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/* HEADLINES                                                           */
/* ------------------------------------------------------------------ */

/*
 * The fallback set is written to fit any industry and age. Lines that only make sense in one industry (fog, gridlock,
 * heat domes, outages) live in sectorHeadlines. Placeholders: {sector} {age} {app} {resource} {service} {year} {n}.
 */
const headlines: Record<HeadlineKey, string[]> = {
  efficiency: [
    'New {service} saves a third of the {resource}, say makers',
    'Inventor hailed: “the {resource} problem is solved”',
    'Efficiency gains to ease demand for {resource}, experts agree',
    'Cheaper {service}; {resource} merchants order more stock',
    'Thriftier machines promise “a lasting fall” in {resource} use',
    'Makers boast record economy; buyers ask how much more they can buy',
  ],
  appAvailable: [
    '{app} now within reach of the ordinary purse',
    'Prospectus issued for {app}; subscribers queue',
    'Cheap {service} makes {app} a going concern',
    'Speculators eye {app} as costs tumble',
    '{app}, once a rich man’s fancy, now merely expensive',
    '{app} promoters find {service} cheap at last',
  ],
  appFounded: [
    'First {app} opens to crowds and a brass band',
    '{app} founded; “a new age”, says the chairman',
    '{app} draws investors; {resource} orders double',
    'Ribbon cut on {app}. Nobody asks what it will burn',
    '{app} declared “indispensable” within the week',
    '{app} opens; demand for {resource} “healthy”',
  ],
  sectorOpened: [
    '{sector} arrives. The old trades look on, unbothered',
    'Correspondent sees “the dawn of {sector}”',
    'Parliament welcomes {sector}; {resource} demand “manageable”',
    'The {sector} industry opens for business, {year}',
    'Investors flock to {sector}; nobody mentions {resource}',
  ],
  crisis: [
    'Doctors report a run on the hospitals; {resource} blamed',
    'Emergency No. {n} declared; minister “listening”',
    'Public meeting demands action; minister “listening”',
    '{sector} in crisis; officials blame “exceptional conditions”',
    'Inquiry into {resource} to report “in due course”',
  ],
  collapse: [
    'Collapse: commerce suspended until further notice',
    '{sector} grinds to a halt beneath its own waste',
    'Too late to argue: {sector} stops',
    'The machinery stops. The inquiry begins',
  ],
  exhausted: [
    '{resource} runs dry; price “no longer meaningful”',
    'Final consignment of {resource} sold at auction',
    'Reserves exhausted, decades ahead of the forecast',
    'Last of the {resource} gone; experts had said “centuries”',
  ],
  backfire: [
    'Thriftier machines, yet {resource} burned climbs to a record',
    'Economist puzzled: savings “appear to have been spent”',
    '{resource} use up again, despite the improvements',
    'Every saving promised, none delivered, figures show',
    'The more we save, the more we burn, a correspondent writes',
    'Half the {resource} per unit; more units than anyone imagined',
  ],
  reveal: [
    'Young economist’s book causes a stir: thrift breeds appetite',
    '“The very contrary is the truth”, writes Mr Jevons',
    'The Coal Question: dismissed in the clubs, read in the Treasury',
    'Statistician adds up the whole country, alarms everyone',
    'Fuel economy “a confusion of ideas”, says young economist',
  ],
  leverEnacted: [
    'Bill passes after a long night in the House',
    'New measure welcomed by some, denounced by more',
    'Government acts; industry warns of “ruin”',
    'Reform enacted. Leader writers divide along the usual lines',
    'Measure passes by eleven votes; both sides claim victory',
    'Minister says the new rules will “bite gently”',
  ],
  leverLapsed: [
    'Measure quietly allowed to lapse',
    'Reform repealed amid cheers from the trade benches',
    'Public patience runs out; the policy goes with it',
    'Ministers drop scheme “for now”',
    'Funds exhausted, the measure lapses at midnight',
  ],
  steadySector: [
    '{sector} settles: use falls, and nobody goes without',
    'A curious thing: {resource} down, and everyone content',
    'Fifty years inside the line: {sector} declared “steady”',
    'Economy of {sector} steady, to general surprise',
    'Half a century of {sector} within budget; no one quite noticed',
  ],
  steadyAll: [
    'Every gauge within its line, every household fed. A first',
    'Steady State: the world grows better without growing',
    'Historians may call it the end of the rebound',
    'Nothing much happens, for fifty years, on purpose',
  ],
  reckoning: [
    'An inquiry sits. The ledgers are read from the start',
    'A reckoning: what was saved, and what was spent',
    'Commission reports; recommends, as ever, doing better',
    'Lessons learned, the minutes say, and filed',
    'Inquiry finds everyone acted rationally, which was the trouble',
  ],
  ageBegins: [
    '{age} begins, by most accounts, in {year}',
    'Historians to date {age} from this week, probably',
    'Correspondent declares {age} begun; editor sceptical',
    'Welcome to {age}. Mind the step',
    '{age}: the old appetites, with new machines',
  ],
  budgetDrawn: [
    'Government draws a line under {resource} use, in ink',
    'A budget for {resource}: so much this decade, less the next',
    'Treasury publishes a {resource} budget; few read the footnotes',
    'Line drawn under {sector}: it is to fall, gently, for ever',
    '{resource} budget set at today’s level, and lower thereafter',
  ],
  decade: [
    'Decade {n} within budget; officials “cautiously pleased”',
    'Ten more years inside the line: {sector}, decade {n}',
    '{resource} budget kept for decade {n}; nobody went without',
    'Another decade, another ledger balanced: {sector} at {n}',
    'Decade {n} of restraint passes without incident, or headlines',
  ],
  budgetBroken: [
    '{sector} breaks its budget; the streak ends',
    'The line is crossed: {resource} use above budget again',
    'Restraint ends in {year}; the ledger is reopened',
    'Budget breached. Ministers blame the weather',
    '“Temporary” overshoot of the {resource} budget, says minister',
  ],
};

const sectorHeadlines: Record<SectorId, Partial<Record<HeadlineKey, string[]>>> = {
  steam: {
    efficiency: [
      'Engines thriftier than ever; collieries report record sales',
      'Duty of engines up again; coal owners delighted',
      'Mill owners hail the thrifty engine and order three more',
      'New engine saves a third of the coal; pits sink new shafts',
      'Coal per horsepower at a record low; coal per year at a record high',
    ],
    sectorOpened: [
      'Power by the ton: a new trade in motive force',
      'Engine house raised over a flooded pit; the pit is pleased',
      'Fire engine draws crowds; owner sells power by the hour',
    ],
    appFounded: [
      '{app} raised beside the pithead; coal owners toast the engine',
      'Shareholders in {app} promised a dividend “and smoke”',
    ],
    backfire: [
      'Engines use half the coal; the nation burns twice as much',
      'Thrift in the engine house, extravagance at the pithead',
    ],
    crisis: [
      'Fog so thick the cattle choke at market',
      'Black fog: lamps lit at noon, and nobody can see them',
      'Doctors report a run on the infirmaries; coal smoke blamed',
      'Black fog No. {n}: the shops shut, the chimneys do not',
      'Smoke so dense the river cannot be found, says waterman',
    ],
    collapse: [
      'The city stops. The air will not allow it to go on',
      'Too thick to breathe, too late to argue',
      'Mills silent beneath their own smoke; owners “perplexed”',
      'Commerce suspended in the fog; Parliament adjourns, coughing',
    ],
    exhausted: [
      'The last seam is worked out. The engines fall silent',
      'Pumps stop; the deep workings flood for good',
      'Coal question answered: there is none left',
      'Last ton raised; the pit ponies are led up into daylight',
    ],
    decade: [
      'Coal held to budget for decade {n}; mills still turning',
      'Collieries report a dull decade, to the Treasury’s delight',
    ],
  },
  light: {
    efficiency: [
      'Brighter for the same gas, say makers; gas company unalarmed',
      'New lamp gives four times the light; householders light four rooms',
      'Thriftier burner hailed; gas works orders a second holder',
      'Lamp makers promise a cheaper night; the night lengthens',
    ],
    sectorOpened: [
      'Light by the therm: the new industry opens in {year}',
      'Gas laid on: the evening, it seems, is here to stay',
      'Lamplighters wanted. Apply after dark',
    ],
    appFounded: [
      '{app} lit for the first time; crowds stay out past midnight',
      '{app} switched on; the night retreats another street',
    ],
    backfire: [
      'Lamps need a quarter of the gas; streets lit all night anyway',
      'Every room lit, every night: gas sales at a record',
    ],
    crisis: [
      'Pea-souper: omnibus conductors walk ahead with torches',
      'Gasworks smoke and coal smoke meet in a yellow fog',
      'Lamps lit at noon, to no visible effect',
      'Pea-souper No. {n}: theatres empty, infirmaries full',
    ],
    collapse: [
      'The lamps burn on in a fog nobody can see them through',
      'City dark at midday, lit at midnight, and no one can breathe',
      'Smoke closes the city; the gas company regrets nothing',
    ],
    exhausted: [
      'Gas holders empty; the street lamps go out one by one',
      'The works run out of coal to cook; the night returns',
      'Last therm sold. Candles, suddenly, a growth industry',
    ],
  },
  motion: {
    efficiency: [
      'More miles to the gallon; drivers find more miles to do',
      'Motor show: thriftier saloons, longer commutes',
      'Fuel economy up; garages report a record summer',
      'Miles per gallon at a record; so are the miles',
    ],
    sectorOpened: [
      'Distance repealed; the bypass opens in {year}',
      'The motor age arrives; the high street heads for the ring road',
      'Car ownership “a reasonable expectation”, says minister',
    ],
    appFounded: [
      '{app} opens; the car park is full by ten',
      'Planners approve {app}; nobody asks the buses',
    ],
    backfire: [
      'Cars twice as thrifty; the nation drives three times as far',
      'Petrol per mile down, petrol per family up, figures show',
    ],
    crisis: [
      'Summer smog: asthma wards full, motorways fuller',
      'Haze over the ring road; health warning for the elderly',
      'Smog alert No. {n}: please leave the car, say the adverts',
      'Traffic fumes trap a heatwave over the city',
    ],
    collapse: [
      'Gridlock total: the city parks itself and gives up',
      'Smog closes the motorway; motorists sit in it anyway',
      'Exhaust and heat bring the conurbation to a standstill',
    ],
    exhausted: [
      'The pumps run dry; the forecourts close',
      'Oil runs out; the bypass is very quiet',
      'Last barrel sold; motoring correspondents in mourning',
    ],
    budgetDrawn: [
      'Oil budget drawn; motorists told the line “will not bite”',
    ],
  },
  compute: {
    efficiency: [
      'Chips twice as thrifty; data centres twice as many',
      'New processor halves the power per sum; the sums treble',
      'Efficiency breakthrough wipes billions off chip makers, briefly',
      'Cost of a calculation falls again; nobody checks the bill',
    ],
    sectorOpened: [
      'Computing opens for business; the bill arrives later',
      'A sum that took a clerk a week now takes a millisecond',
      'The cost of a calculation halves; the calculations multiply',
    ],
    appFounded: [
      '{app} launches; servers ordered by the warehouse',
      '{app} “free for ever”, say founders; investors nod',
    ],
    backfire: [
      'Power per query down a hundredfold; queries up a thousandfold',
      'Data centres more efficient than ever, and twice as hungry',
    ],
    crisis: [
      'Heat dome: grid operators beg data centres to throttle',
      'Record heat; server farms run their chillers flat out',
      'Data centre water use questioned as reservoirs drop',
      'Heat alert No. {n}: cooling fans heard from the motorway',
    ],
    collapse: [
      'Heat dome over the server farms; the grid gives way',
      'The cloud comes down to earth: outages everywhere',
      'Grid fails in the heat; everything everywhere is offline',
    ],
    exhausted: [
      'No more power, water or chips; the queue for silicon closes',
      'Last substation allocated; new data centres told to wait',
      'Chip supply exhausted; old servers stripped for parts',
    ],
  },
  code: {
    efficiency: [
      'Code written ten times faster; read exactly as slowly',
      'Productivity “transformed”; the backlog somehow longer',
      'New tool writes the feature; the old team maintains it',
      'Developers feel faster, measure slower, ship more anyway',
    ],
    sectorOpened: [
      'Software now free to write; reading it a personal matter',
      'Code for anyone: the backlog opens to the public',
      'Every idea now has an app; most of them are still running',
    ],
    appFounded: [
      '{app} ships Friday; the pager rota is drawn up Monday',
      '{app} goes live; nobody recalls commissioning it',
    ],
    backfire: [
      'Features ten times cheaper; attention spent on them up twelvefold',
      'Agents save a million hours; reviewers lose two million',
    ],
    crisis: [
      'Outage traced to a library nobody knew they used',
      'Half the internet down; cause “a small configuration change”',
      'Maintainers drown in machine-written bug reports',
      'Outage No. {n}: the status page is also down',
    ],
    collapse: [
      'The Great Outage: every system down, nobody knows why',
      'Code stock buckles under its own weight; nothing ships',
      'Nothing works, and there is far too much of it',
    ],
    exhausted: [
      'Attention runs out: not one more pull request can be read',
      'No one left to review anything; merges halt',
      'The last reviewer resigns; the queue reaches the horizon',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* GLOBAL                                                              */
/* ------------------------------------------------------------------ */

const global: GlobalParams = {
  startCapital: 50,
  /* Below 1 so the sell button can fade once income outgrows it (balance finding 7). */
  clickSeconds: 0.5,
  clickFlat: 3,
  popGrowth: 0.000025,
  subsistence: 8,
  wellbeingTarget: 28,
  mandateRate: 0.03,
  mandateFloor: 12,
  crisisMandate: 150,
  crisisPopLoss: 0.08,
  /* Placeholder weights: the balance lane tunes these to owner decision D1. */
  hindsight: {
    perWellbeingYear: 0.06,
    intensityExponent: 0.5,
    perBudgetDecade: 4,
    perUnburnt: 30,
    perFirstBackfire: 15,
    perSectorReached: 6,
    perSteadySector: 120,
  },
  offlineCapSeconds: 4 * 60 * 60,
  /* Growth peaks at W ≈ 26.5 and stops at 40; the wellbeing target (28) sits below the transition. */
  demography: { transitionWellbeing: 40 },
  steady: {
    budgetDeclinePerDecade: 0.05,
    decadeYears: 10,
    decadeEffects: [
      { type: 'mandateAdd', value: 60 },
      { type: 'capitalAdd', value: 30 },
    ],
    firstSteadyEffects: [{ type: 'slotAdd', value: 1 }],
  },
  levy: { mandateShare: 0.1 },
  startingSlots: 2,
};

export const content: Content = {
  sectors: { steam, light, motion, compute, code },
  sectorOrder: ['steam', 'light', 'motion', 'compute', 'code'],
  ages,
  upgrades,
  levers,
  knowhow,
  institutions,
  achievements,
  headlines,
  sectorHeadlines,
  global,
};
