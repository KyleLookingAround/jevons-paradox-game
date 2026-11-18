/**
 * REBOUND — content: every number and every word the simulation and UI read.
 * Owned by the content workstream. See DESIGN.md and src/types.ts for what each field does.
 */
import type {
  Content,
  EraDef,
  UpgradeDef,
  LeverDef,
  KnowhowDef,
  InstitutionDef,
  AchievementDef,
  HeadlineKey,
  GlobalParams,
} from './types';

/* ------------------------------------------------------------------ */
/* ERAS                                                                */
/* ------------------------------------------------------------------ */

const steam: EraDef = {
  id: 'steam',
  index: 1,
  name: 'Steam',
  years: '1780–1870',
  tagline: 'One engine, one flooded pit, and a great deal of coal nobody is counting.',
  service: { name: 'Motive power', unit: 'hp' },
  resource: { name: 'Coal', unit: 'tons' },
  pressure: { name: 'Smog', crisisName: 'The Black Fog' },
  theme: 'ledger',

  basePrice: 1,
  capCost: 0.04,
  margin: 0.2,
  baseEta: 1,
  autoEtaRate: 0,

  resourceKind: 'stock',
  reserve: 340_000,
  alpha: 0.6,

  pressureSource: 'resource',
  pressureIntensity: 0.0021,
  absorption: 0.008,
  collapseAt: 100,
  crisisAt: [0.35, 0.65, 0.85],
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
      halfPrice: 1.5,
      saturation: 40,
      steepness: 1.5,
      visibleBelow: Infinity,
      foundCost: 0,
      reserveGainPerService: 0.75,
    },
    {
      id: 'steam.mills',
      name: 'Cotton mills',
      blurb: 'No longer tied to a riverbank. Now they can be anywhere there is coal.',
      icon: 'mill',
      halfPrice: 0.6,
      saturation: 300,
      steepness: 2.0,
      visibleBelow: 0.8,
      foundCost: 500,
    },
    {
      id: 'steam.railways',
      name: 'Railways',
      blurb: 'Coal hauling coal to the people who burn coal, at a mile a minute.',
      icon: 'train',
      halfPrice: 0.3,
      saturation: 1200,
      steepness: 2.2,
      visibleBelow: 0.5,
      foundCost: 5_000,
    },
    {
      id: 'steam.steamships',
      name: 'Steamships',
      blurb: 'The trade winds are now optional. The coaling stations are not.',
      icon: 'ship',
      halfPrice: 0.15,
      saturation: 3000,
      steepness: 2.4,
      visibleBelow: 0.3,
      foundCost: 12_000,
    },
  ],
};

const light: EraDef = {
  id: 'light',
  index: 2,
  name: 'Light',
  years: '1870–1950',
  tagline: 'The night is abolished by order of the gas company.',
  service: { name: 'Light', unit: 'klm·h' },
  resource: { name: 'Town gas & current', unit: 'therms' },
  pressure: { name: 'Coal smoke', crisisName: 'The Pea-Souper' },
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
  unlock: { prevServicePriceBelow: 0.25, minReckonings: 1 },

  applications: [
    {
      id: 'light.streetLamps',
      name: 'Street lamps',
      blurb: 'A lamplighter, a ladder and a parish that has decided to be modern.',
      icon: 'lamp',
      halfPrice: 1.2,
      saturation: 300,
      steepness: 1.5,
      visibleBelow: Infinity,
      foundCost: 0,
    },
    {
      id: 'light.nightShifts',
      name: 'Night shifts',
      blurb: 'The machines need not rest once the foreman can see them.',
      icon: 'factory-night',
      halfPrice: 0.5,
      saturation: 3000,
      steepness: 2.0,
      visibleBelow: 0.75,
      foundCost: 8_000,
    },
    {
      id: 'light.homes',
      name: 'Lit homes',
      blurb: 'Reading after dark, once a luxury, is now a reasonable expectation.',
      icon: 'house',
      halfPrice: 0.25,
      saturation: 15_000,
      steepness: 2.2,
      visibleBelow: 0.4,
      foundCost: 40_000,
    },
    {
      id: 'light.shopSigns',
      name: 'Shop signs',
      blurb: 'Light that illuminates nothing in particular, all night, on purpose.',
      icon: 'sign',
      halfPrice: 0.1,
      saturation: 40_000,
      steepness: 2.4,
      visibleBelow: 0.18,
      foundCost: 150_000,
    },
  ],
};

const motion: EraDef = {
  id: 'motion',
  index: 3,
  name: 'Motion',
  years: '1950–2000',
  tagline: 'Distance has been repealed. Please mind the bypass.',
  service: { name: 'Vehicle-miles', unit: 'veh·mi' },
  resource: { name: 'Oil', unit: 'barrels' },
  pressure: { name: 'Exhaust', crisisName: 'The Summer Smog' },
  theme: 'chrome',

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
  unlock: { prevServicePriceBelow: 0.13, minReckonings: 2 },

  applications: [
    {
      id: 'motion.delivery',
      name: 'Delivery vans',
      blurb: 'The milk, the post and the laundry, all arriving by internal combustion.',
      icon: 'van',
      halfPrice: 1.4,
      saturation: 2000,
      steepness: 1.5,
      visibleBelow: Infinity,
      foundCost: 0,
    },
    {
      id: 'motion.commuting',
      name: 'Commuting',
      blurb: 'Faster cars mean the same hour in traffic, from twice as far away.',
      icon: 'car',
      halfPrice: 0.6,
      saturation: 15_000,
      steepness: 2.0,
      visibleBelow: 0.75,
      foundCost: 30_000,
      lockIn: 0.75,
    },
    {
      id: 'motion.suburbs',
      name: 'Suburbs',
      blurb: 'Built for the car, and quite impossible without one. That was the point.',
      icon: 'suburb',
      halfPrice: 0.3,
      saturation: 60_000,
      steepness: 2.2,
      visibleBelow: 0.45,
      foundCost: 200_000,
      lockIn: 0.85,
    },
    {
      id: 'motion.flights',
      name: 'Package holidays',
      blurb: 'A fortnight on the Costa, for less than a week in Skegness.',
      icon: 'plane',
      halfPrice: 0.12,
      saturation: 150_000,
      steepness: 2.5,
      visibleBelow: 0.3,
      foundCost: 900_000,
    },
  ],
};

const compute: EraDef = {
  id: 'compute',
  index: 4,
  name: 'Compute',
  years: '2000–2025',
  tagline: 'The cost of a calculation halves while you read this sentence.',
  service: { name: 'Computation', unit: 'PFLOP' },
  resource: { name: 'Power, water & chips', unit: 'GWh' },
  pressure: { name: 'Carbon', crisisName: 'The Heat Dome' },
  theme: 'terminal',

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
  unlock: { prevServicePriceBelow: 0.32, minReckonings: 3 },

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

const code: EraDef = {
  id: 'code',
  index: 5,
  name: 'Code',
  years: '2025–',
  tagline: 'Software is now free to write. Reading it remains a personal matter.',
  service: { name: 'Working features', unit: 'features' },
  resource: { name: 'Human attention', unit: 'hours' },
  pressure: { name: 'Code stock', crisisName: 'The Great Outage' },
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

  drawsOn: { era: 'compute', perService: 0.5 },
  unlock: { prevServicePriceBelow: 0.015, minReckonings: 4 },

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
      steepness: 2.0,
      visibleBelow: 0.3,
      foundCost: 30_000_000,
    },
    {
      id: 'code.agentsForAgents',
      name: 'Agents writing for agents',
      blurb: 'Software commissioned by software, reviewed by software, for software.',
      icon: 'robots',
      halfPrice: 0.03,
      saturation: 100_000_000,
      steepness: 3.0,
      visibleBelow: 0.08,
      foundCost: 300_000_000,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* UPGRADES                                                            */
/* ------------------------------------------------------------------ */

const eff = (era: EraDef['id'], value: number) => [{ type: 'etaMul' as const, era, value }];

const upgrades: UpgradeDef[] = [
  /* ---- Steam: efficiency chain, cumulative η 1.5, 2.5, 3.5, 5, 8, 12, 18 ---- */
  {
    id: 'steam.boilers', era: 'steam', kind: 'efficiency',
    name: 'Better boilers',
    blurb: 'Lag the pipes, mend the leaks, stop heating the engine house.',
    cost: 400, effects: eff('steam', 1.5),
  },
  {
    id: 'steam.condenser', era: 'steam', kind: 'efficiency',
    name: 'Separate condenser',
    blurb: 'Watt, 1769. Stop cooling the cylinder every stroke.',
    cost: 3_000, requires: ['steam.boilers'], effects: eff('steam', 2.5 / 1.5),
  },
  {
    id: 'steam.doubleActing', era: 'steam', kind: 'efficiency',
    name: 'Double-acting engine',
    blurb: 'Watt again: push on the way down as well as the way up.',
    cost: 6_500, requires: ['steam.condenser'], effects: eff('steam', 3.5 / 2.5),
  },
  {
    id: 'steam.highPressure', era: 'steam', kind: 'efficiency',
    name: 'High-pressure steam',
    blurb: 'Trevithick, c. 1800. Smaller, stronger, occasionally explosive.',
    cost: 10_000, requires: ['steam.doubleActing'], effects: eff('steam', 5 / 3.5),
  },
  {
    id: 'steam.compound', era: 'steam', kind: 'efficiency',
    name: 'Compound engine',
    blurb: 'Use the steam twice before letting it go.',
    cost: 15_000, requires: ['steam.highPressure'], effects: eff('steam', 8 / 5),
  },
  {
    id: 'steam.tripleExpansion', era: 'steam', kind: 'efficiency',
    name: 'Triple expansion',
    blurb: 'Use it three times. The steamship lines are delighted.',
    cost: 22_000, requires: ['steam.compound'], effects: eff('steam', 12 / 8),
  },
  {
    id: 'steam.turbine', era: 'steam', kind: 'efficiency',
    name: 'Steam turbine',
    blurb: 'Parsons, 1884. No pistons at all; just a very fast windmill of steam.',
    cost: 32_000, requires: ['steam.tripleExpansion'], effects: eff('steam', 18 / 12),
  },
  /* ---- Steam: capital, prospect, research ---- */
  {
    id: 'steam.lathe', era: 'steam', kind: 'capital',
    name: 'Screw-cutting lathe',
    blurb: 'Maudslay, c. 1800. Parts that fit first time make engines cheap.',
    cost: 2_000, requires: ['steam.boilers'], effects: [{ type: 'capCostMul', era: 'steam', value: 0.8 }],
  },
  {
    id: 'steam.limitedLiability', era: 'steam', kind: 'capital',
    name: 'Limited liability',
    blurb: 'Limited Liability Act, 1855. Other people’s money, without the debtors’ prison.',
    cost: 18_000, requires: ['steam.highPressure'], effects: [{ type: 'marginAdd', era: 'steam', value: 0.03 }],
  },
  {
    id: 'steam.deeperShaft', era: 'steam', kind: 'prospect',
    name: 'Sink a deeper shaft',
    blurb: 'There is always more coal, a little further down, a little dearer.',
    cost: 4_000, repeatable: true, costGrowth: 2.2, maxLevel: 6,
    effects: [{ type: 'reserveAdd', era: 'steam', value: 0.25 }],
  },
  {
    id: 'steam.coalQuestion', era: 'steam', kind: 'research',
    name: 'The Coal Question',
    blurb: 'W. S. Jevons, 1865. “It is wholly a confusion of ideas to suppose that the economical use of fuel is equivalent to a diminished consumption.”',
    cost: 4_000, requires: ['steam.condenser'], effects: [{ type: 'reveal' }],
  },

  /* ---- Light: cumulative η 1.6, 3.2, 5.76, 9.8, 14.7, 32.3 ---- */
  {
    id: 'light.batswing', era: 'light', kind: 'efficiency',
    name: 'Batswing burner',
    blurb: 'A slit in the jet fans the flame out. Brighter for the same gas.',
    cost: 5_000, effects: eff('light', 1.6),
  },
  {
    id: 'light.mantle', era: 'light', kind: 'efficiency',
    name: 'Incandescent gas mantle',
    blurb: 'Welsbach’s little sock of rare earths, glowing white in the flame.',
    cost: 20_000, requires: ['light.batswing'], effects: eff('light', 2),
  },
  {
    id: 'light.carbon', era: 'light', kind: 'efficiency',
    name: 'Carbon filament lamp',
    blurb: 'Swan and Edison, c. 1880. A thread of charcoal in a vacuum.',
    cost: 50_000, requires: ['light.mantle'], effects: eff('light', 1.8),
  },
  {
    id: 'light.tungsten', era: 'light', kind: 'efficiency',
    name: 'Drawn tungsten filament',
    blurb: 'A metal that would rather not melt, persuaded into wire.',
    cost: 100_000, requires: ['light.carbon'], effects: eff('light', 1.7),
  },
  {
    id: 'light.gasFilled', era: 'light', kind: 'efficiency',
    name: 'Gas-filled lamp',
    blurb: 'Langmuir, 1913. A whiff of inert gas lets the filament run hotter.',
    cost: 180_000, requires: ['light.tungsten'], effects: eff('light', 1.5),
  },
  {
    id: 'light.fluorescent', era: 'light', kind: 'efficiency',
    name: 'Fluorescent tube',
    blurb: 'Mercury vapour and phosphor. Four times the light, one office hum.',
    cost: 320_000, requires: ['light.gasFilled'], effects: eff('light', 2.2),
  },
  {
    id: 'light.grid', era: 'light', kind: 'capital',
    name: 'The National Grid',
    blurb: 'Central Electricity Board, 1926. One network, fewer, larger stations.',
    cost: 80_000, requires: ['light.carbon'], effects: [{ type: 'capCostMul', era: 'light', value: 0.75 }],
  },
  {
    id: 'light.slotMeter', era: 'light', kind: 'capital',
    name: 'Penny-in-the-slot meter',
    blurb: 'Gas for any household with a penny, and a reliable penny for the company.',
    cost: 15_000, requires: ['light.batswing'], effects: [{ type: 'marginAdd', era: 'light', value: 0.03 }],
  },
  {
    id: 'light.kentCoalfield', era: 'light', kind: 'prospect',
    name: 'Open a new coalfield',
    blurb: 'Under the hop gardens of Kent, of all places. More gas for the works.',
    cost: 30_000, repeatable: true, costGrowth: 2.2, maxLevel: 6,
    effects: [{ type: 'reserveAdd', era: 'light', value: 0.25 }],
  },

  /* ---- Motion: cumulative η 1.3, 1.95, 2.73, 4.1, 8.2 ---- */
  {
    id: 'motion.radial', era: 'motion', kind: 'efficiency',
    name: 'Radial tyres',
    blurb: 'Michelin, 1946. Less rolling resistance, longer life, further trips.',
    cost: 25_000, effects: eff('motion', 1.3),
  },
  {
    id: 'motion.injection', era: 'motion', kind: 'efficiency',
    name: 'Fuel injection',
    blurb: 'Retire the carburettor. Meter the petrol to the drop.',
    cost: 120_000, requires: ['motion.radial'], effects: eff('motion', 1.5),
  },
  {
    id: 'motion.leanBurn', era: 'motion', kind: 'efficiency',
    name: 'Lean-burn engine',
    blurb: 'More air, less fuel, and a catalytic argument about nitrogen oxides.',
    cost: 300_000, requires: ['motion.injection'], effects: eff('motion', 1.4),
  },
  {
    id: 'motion.aero', era: 'motion', kind: 'efficiency',
    name: 'Wind-tunnel bodywork',
    blurb: 'Smooth the brick into a jellybean. Every saloon now looks the same.',
    cost: 650_000, requires: ['motion.leanBurn'], effects: eff('motion', 1.5),
  },
  {
    id: 'motion.hybrid', era: 'motion', kind: 'efficiency',
    name: 'Hybrid drive',
    blurb: 'Catch the braking energy in a battery. Double the miles per gallon.',
    cost: 1_300_000, requires: ['motion.aero'], effects: eff('motion', 2),
  },
  {
    id: 'motion.motorways', era: 'motion', kind: 'capital',
    name: 'Motorway programme',
    blurb: 'The M1, 1959. No junctions, no lights, no reason to stay at home.',
    cost: 250_000, requires: ['motion.injection'], effects: [{ type: 'capCostMul', era: 'motion', value: 0.8 }],
  },
  {
    id: 'motion.hirePurchase', era: 'motion', kind: 'capital',
    name: 'Hire purchase',
    blurb: 'A car on the never-never. The never arrives monthly.',
    cost: 80_000, requires: ['motion.radial'], effects: [{ type: 'marginAdd', era: 'motion', value: 0.03 }],
  },
  {
    id: 'motion.northSea', era: 'motion', kind: 'prospect',
    name: 'North Sea licence',
    blurb: 'Drill where the weather is worst and the oil is dearest. It is still oil.',
    cost: 250_000, repeatable: true, costGrowth: 2.2, maxLevel: 6,
    effects: [{ type: 'reserveAdd', era: 'motion', value: 0.25 }],
  },

  /* ---- Compute: bought η 1.5, 2.4, 4.32, 10.8, 21.6 (on top of the automatic halving) ---- */
  {
    id: 'compute.multicore', era: 'compute', kind: 'efficiency',
    name: 'Multi-core chips',
    blurb: 'The clock speed hit a wall, so put several processors behind it.',
    cost: 150_000, effects: eff('compute', 1.5),
  },
  {
    id: 'compute.virtualisation', era: 'compute', kind: 'efficiency',
    name: 'Virtualisation',
    blurb: 'Ten idle servers become one busy one. Nine new projects fill the gap.',
    cost: 1_200_000, requires: ['compute.multicore'], effects: eff('compute', 1.6),
  },
  {
    id: 'compute.hyperscale', era: 'compute', kind: 'efficiency',
    name: 'Hyperscale data centres',
    blurb: 'A warehouse of computers beside a river and a cheap substation.',
    cost: 4_000_000, requires: ['compute.virtualisation'], effects: eff('compute', 1.8),
  },
  {
    id: 'compute.gpu', era: 'compute', kind: 'efficiency',
    name: 'GPU acceleration',
    blurb: 'Chips built for drawing dragons turn out to be good at sums.',
    cost: 12_000_000, requires: ['compute.hyperscale'], effects: eff('compute', 2.5),
  },
  {
    id: 'compute.accelerators', era: 'compute', kind: 'efficiency',
    name: 'Custom AI accelerators',
    blurb: 'Silicon that does one thing, matrix multiplication, unimaginably often.',
    cost: 35_000_000, requires: ['compute.gpu'], effects: eff('compute', 2),
  },
  {
    id: 'compute.commodity', era: 'compute', kind: 'capital',
    name: 'Commodity servers',
    blurb: 'Buy cheap boxes by the thousand and expect them to fail.',
    cost: 800_000, requires: ['compute.multicore'], effects: [{ type: 'capCostMul', era: 'compute', value: 0.7 }],
  },
  {
    id: 'compute.adFunded', era: 'compute', kind: 'capital',
    name: 'Advertising model',
    blurb: 'Free at the point of use. The user is the point of use.',
    cost: 3_000_000, requires: ['compute.virtualisation'], effects: [{ type: 'marginAdd', era: 'compute', value: 0.03 }],
  },
  {
    id: 'compute.newFab', era: 'compute', kind: 'prospect',
    name: 'Build another fab',
    blurb: 'Twenty billion, a desert, and most of a river’s worth of ultrapure water.',
    cost: 2_000_000, repeatable: true, costGrowth: 2.2, maxLevel: 6,
    effects: [{ type: 'reserveAdd', era: 'compute', value: 0.25 }],
  },

  /* ---- Code: cumulative η 3, 12, 60, 480 ---- */
  {
    id: 'code.autocomplete', era: 'code', kind: 'efficiency',
    name: 'Autocomplete',
    blurb: 'It finishes your lines. Then your functions. Then your sentences.',
    cost: 1_500_000, effects: eff('code', 3),
  },
  {
    id: 'code.chat', era: 'code', kind: 'efficiency',
    name: 'Chat assistant',
    blurb: 'Describe the program; argue with it until it exists.',
    cost: 12_000_000, requires: ['code.autocomplete'], effects: eff('code', 4),
  },
  {
    id: 'code.agent', era: 'code', kind: 'efficiency',
    name: 'Coding agent',
    blurb: 'Give it the ticket and go to lunch. Come back to a pull request.',
    cost: 80_000_000, requires: ['code.chat'], effects: eff('code', 5),
  },
  {
    id: 'code.fleets', era: 'code', kind: 'efficiency',
    name: 'Agent fleets',
    blurb: 'A hundred agents, one backlog, no lunch. You are now the reviewer.',
    cost: 500_000_000, requires: ['code.agent'], effects: eff('code', 8),
  },
  {
    id: 'code.openSource', era: 'code', kind: 'capital',
    name: 'Open source everything',
    blurb: 'Every wheel already invented, free, and maintained by one person in Nebraska.',
    cost: 6_000_000, requires: ['code.autocomplete'], effects: [{ type: 'capCostMul', era: 'code', value: 0.6 }],
  },
  {
    id: 'code.perSeat', era: 'code', kind: 'capital',
    name: 'Per-seat pricing',
    blurb: 'Charge for every agent as if it were an employee. It is cheaper than one.',
    cost: 40_000_000, requires: ['code.chat'], effects: [{ type: 'marginAdd', era: 'code', value: 0.03 }],
  },
];

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

const duty = (s: number[]) => s.map((v) => `Hold price at ${Math.round(v * 100)}% of the fall`);
const capL = (s: number[]) => s.map((v) => `Cap at ${Math.round(v * 100)}% of today`);
const suff = (s: number[]) => s.map((v) => `Settle at ${Math.round(v * 100)}% of appetite`);
const share = (prefix: string, s: number[], suffix = '') =>
  s.map((v) => `${prefix} ${Math.round(v * 100)}%${suffix}`);

const levers: LeverDef[] = [
  /* ---- Steam ---- */
  {
    id: 'steam.duty', era: 'steam', kind: 'duty',
    name: 'Fuel duty escalator',
    blurb: 'Tax coal by the ton, rising as the engines improve, so power stays dear.',
    catch: 'Cheaper engines no longer mean cheaper power. Nor more income.',
    levels: [
      { mandateCost: 100, mandateUpkeep: 0.05, value: 0.3, label: duty([0.3])[0] },
      { mandateCost: 300, mandateUpkeep: 0.12, value: 0.6, label: duty([0.6])[0] },
      { mandateCost: 900, mandateUpkeep: 0.3, value: 0.9, label: duty([0.9])[0] },
    ],
  },
  {
    id: 'steam.cap', era: 'steam', kind: 'cap',
    name: 'Smoke abatement cap',
    blurb: 'A ceiling on coal burned in the borough. Permits for whatever is under it.',
    catch: 'Set it far below demand and the furnaces move just outside the borough.',
    levels: [
      { mandateCost: 120, mandateUpkeep: 0.06, value: 0.9, value2: 3, label: capL([0.9])[0] },
      { mandateCost: 360, mandateUpkeep: 0.15, value: 0.75, value2: 4, label: capL([0.75])[0] },
      { mandateCost: 1_000, mandateUpkeep: 0.35, value: 0.6, value2: 5, label: capL([0.6])[0] },
    ],
  },
  {
    id: 'steam.sufficiency', era: 'steam', kind: 'sufficiency',
    name: 'Temperance of consumption',
    blurb: 'Sermons, societies and pamphlets in favour of wanting a little less.',
    catch: 'Slow to take. Appetite, once lowered, buys less of everything you sell.',
    levels: [
      { mandateCost: 80, mandateUpkeep: 0.02, value: 0.85, value2: 0.002, label: suff([0.85])[0] },
      { mandateCost: 240, mandateUpkeep: 0.05, value: 0.7, value2: 0.003, label: suff([0.7])[0] },
      { mandateCost: 720, mandateUpkeep: 0.1, value: 0.55, value2: 0.004, label: suff([0.55])[0] },
    ],
  },
  {
    id: 'steam.circularity', era: 'steam', kind: 'circularity',
    name: 'Coke & slack recovery',
    blurb: 'Burn the dust and the cinders the pit used to tip on the spoil heap.',
    catch: 'Every ton saved is a ton the next engine will happily burn.',
    levels: [
      { mandateCost: 90, mandateUpkeep: 0.02, value: 0.1, label: share('Recover', [0.1], ' of the burn')[0] },
      { mandateCost: 270, mandateUpkeep: 0.05, value: 0.2, label: share('Recover', [0.2], ' of the burn')[0] },
      { mandateCost: 800, mandateUpkeep: 0.1, value: 0.35, label: share('Recover', [0.35], ' of the burn')[0] },
    ],
  },
  {
    id: 'steam.substitution', era: 'steam', kind: 'substitution',
    name: 'Water wheels & wind',
    blurb: 'Keep the old mills turning on the river and the breeze.',
    catch: 'Dearer per horsepower, and the river only flows so fast.',
    levels: [
      { mandateCost: 110, mandateUpkeep: 0.05, value: 0.1, value2: 100, label: share('Supply', [0.1], ' by river')[0] },
      { mandateCost: 330, mandateUpkeep: 0.12, value: 0.2, value2: 300, label: share('Supply', [0.2], ' by river')[0] },
      { mandateCost: 950, mandateUpkeep: 0.3, value: 0.35, value2: 800, label: share('Supply', [0.35], ' by river')[0] },
    ],
  },

  /* ---- Light ---- */
  {
    id: 'light.duty', era: 'light', kind: 'duty',
    name: 'Gas & lighting rate',
    blurb: 'A municipal rate on every therm, rising with the lamps’ efficiency.',
    catch: 'The streets stay dimmer than they could. The ratepayers notice.',
    levels: [
      { mandateCost: 160, mandateUpkeep: 0.08, value: 0.3, label: duty([0.3])[0] },
      { mandateCost: 480, mandateUpkeep: 0.2, value: 0.6, label: duty([0.6])[0] },
      { mandateCost: 1_450, mandateUpkeep: 0.5, value: 0.9, label: duty([0.9])[0] },
    ],
  },
  {
    id: 'light.sufficiency', era: 'light', kind: 'sufficiency',
    name: 'Lights out at midnight',
    blurb: 'Shop signs and empty offices go dark when the pubs do.',
    catch: 'Midnight comes for the night shift too, eventually.',
    levels: [
      { mandateCost: 130, mandateUpkeep: 0.03, value: 0.85, value2: 0.002, label: suff([0.85])[0] },
      { mandateCost: 390, mandateUpkeep: 0.08, value: 0.7, value2: 0.003, label: suff([0.7])[0] },
      { mandateCost: 1_150, mandateUpkeep: 0.16, value: 0.55, value2: 0.004, label: suff([0.55])[0] },
    ],
  },
  {
    id: 'light.greenSpending', era: 'light', kind: 'greenSpending',
    name: 'Public libraries & parks',
    blurb: 'Give the money saved on lighting somewhere to go that is not a furnace.',
    catch: 'Only blunts the spill into older trades; it does nothing for the lamps.',
    levels: [
      { mandateCost: 140, mandateUpkeep: 0.03, value: 0.3, label: share('Absorb', [0.3], ' of the savings')[0] },
      { mandateCost: 420, mandateUpkeep: 0.08, value: 0.6, label: share('Absorb', [0.6], ' of the savings')[0] },
      { mandateCost: 1_250, mandateUpkeep: 0.16, value: 0.9, label: share('Absorb', [0.9], ' of the savings')[0] },
    ],
  },
  {
    id: 'light.substitution', era: 'light', kind: 'substitution',
    name: 'Hydro schemes',
    blurb: 'Dam a Highland glen and send the current south.',
    catch: 'There are only so many glens, and each one costs a fortune.',
    levels: [
      { mandateCost: 180, mandateUpkeep: 0.08, value: 0.1, value2: 1_000, label: share('Supply', [0.1], ' by hydro')[0] },
      { mandateCost: 540, mandateUpkeep: 0.2, value: 0.2, value2: 3_000, label: share('Supply', [0.2], ' by hydro')[0] },
      { mandateCost: 1_600, mandateUpkeep: 0.5, value: 0.35, value2: 8_000, label: share('Supply', [0.35], ' by hydro')[0] },
    ],
  },

  /* ---- Motion ---- */
  {
    id: 'motion.duty', era: 'motion', kind: 'duty',
    name: 'Fuel duty escalator',
    blurb: 'Petrol duty that rises faster than engines improve. Briefly popular with nobody.',
    catch: 'Every efficient engine still costs as much to run. Hauliers blockade the refineries.',
    levels: [
      { mandateCost: 250, mandateUpkeep: 0.12, value: 0.3, label: duty([0.3])[0] },
      { mandateCost: 750, mandateUpkeep: 0.3, value: 0.6, label: duty([0.6])[0] },
      { mandateCost: 2_250, mandateUpkeep: 0.75, value: 0.9, label: duty([0.9])[0] },
    ],
  },
  {
    id: 'motion.cap', era: 'motion', kind: 'cap',
    name: 'Oil import quota',
    blurb: 'So many barrels a year and not one more. Trade the permits if you must.',
    catch: 'Squeeze too hard and the barrels arrive by other routes.',
    levels: [
      { mandateCost: 280, mandateUpkeep: 0.14, value: 0.9, value2: 3, label: capL([0.9])[0] },
      { mandateCost: 840, mandateUpkeep: 0.35, value: 0.75, value2: 4, label: capL([0.75])[0] },
      { mandateCost: 2_500, mandateUpkeep: 0.85, value: 0.6, value2: 5, label: capL([0.6])[0] },
    ],
  },
  {
    id: 'motion.sufficiency', era: 'motion', kind: 'sufficiency',
    name: 'The 15-minute town',
    blurb: 'School, shop and surgery within a walk. The car stays on the drive.',
    catch: 'The suburbs were built for the car. They will not walk anywhere quickly.',
    levels: [
      { mandateCost: 200, mandateUpkeep: 0.05, value: 0.85, value2: 0.0015, label: suff([0.85])[0] },
      { mandateCost: 600, mandateUpkeep: 0.12, value: 0.7, value2: 0.0025, label: suff([0.7])[0] },
      { mandateCost: 1_800, mandateUpkeep: 0.25, value: 0.55, value2: 0.0035, label: suff([0.55])[0] },
    ],
  },
  {
    id: 'motion.substitution', era: 'motion', kind: 'substitution',
    name: 'Electrified rail & trams',
    blurb: 'Put the wires back up. Some of the old tram lines are still under the tarmac.',
    catch: 'Dearer to build per mile, and it only goes where the rails go.',
    levels: [
      { mandateCost: 270, mandateUpkeep: 0.12, value: 0.1, value2: 8_000, label: share('Carry', [0.1], ' by rail')[0] },
      { mandateCost: 810, mandateUpkeep: 0.3, value: 0.2, value2: 25_000, label: share('Carry', [0.2], ' by rail')[0] },
      { mandateCost: 2_400, mandateUpkeep: 0.75, value: 0.35, value2: 70_000, label: share('Carry', [0.35], ' by rail')[0] },
    ],
  },
  {
    id: 'motion.greenSpending', era: 'motion', kind: 'greenSpending',
    name: 'Insulation grants',
    blurb: 'Steer the money saved on petrol into loft lagging instead of more lamps.',
    catch: 'Cuts the spill into the lit world; the motorways are untouched.',
    levels: [
      { mandateCost: 220, mandateUpkeep: 0.05, value: 0.3, label: share('Absorb', [0.3], ' of the savings')[0] },
      { mandateCost: 660, mandateUpkeep: 0.12, value: 0.6, label: share('Absorb', [0.6], ' of the savings')[0] },
      { mandateCost: 2_000, mandateUpkeep: 0.25, value: 0.9, label: share('Absorb', [0.9], ' of the savings')[0] },
    ],
  },

  /* ---- Compute ---- */
  {
    id: 'compute.cap', era: 'compute', kind: 'cap',
    name: 'Grid allocation',
    blurb: 'Data centres get the connection they are given, not the one they ask for.',
    catch: 'Too tight and the server farms reappear in a friendlier jurisdiction.',
    levels: [
      { mandateCost: 400, mandateUpkeep: 0.2, value: 0.9, value2: 3, label: capL([0.9])[0] },
      { mandateCost: 1_200, mandateUpkeep: 0.5, value: 0.75, value2: 4, label: capL([0.75])[0] },
      { mandateCost: 3_600, mandateUpkeep: 1.2, value: 0.6, value2: 5, label: capL([0.6])[0] },
    ],
  },
  {
    id: 'compute.sufficiency', era: 'compute', kind: 'sufficiency',
    name: 'Digital sobriety',
    blurb: 'Autoplay off, resolution down, the old phone kept another year.',
    catch: 'Asks people to want less of something that gets cheaper every minute.',
    levels: [
      { mandateCost: 320, mandateUpkeep: 0.08, value: 0.85, value2: 0.002, label: suff([0.85])[0] },
      { mandateCost: 960, mandateUpkeep: 0.2, value: 0.7, value2: 0.003, label: suff([0.7])[0] },
      { mandateCost: 2_900, mandateUpkeep: 0.4, value: 0.55, value2: 0.004, label: suff([0.55])[0] },
    ],
  },
  {
    id: 'compute.circularity', era: 'compute', kind: 'circularity',
    name: 'Chip recovery',
    blurb: 'Strip the gold, the gallium and the cobalt back out of last year’s servers.',
    catch: 'Recovered silicon goes straight into next year’s, larger, servers.',
    levels: [
      { mandateCost: 350, mandateUpkeep: 0.08, value: 0.1, label: share('Recover', [0.1], ' of the hardware')[0] },
      { mandateCost: 1_050, mandateUpkeep: 0.2, value: 0.2, label: share('Recover', [0.2], ' of the hardware')[0] },
      { mandateCost: 3_150, mandateUpkeep: 0.4, value: 0.35, label: share('Recover', [0.35], ' of the hardware')[0] },
    ],
  },
  {
    id: 'compute.substitution', era: 'compute', kind: 'substitution',
    name: 'Solar & storage',
    blurb: 'Panels on every warehouse roof, batteries in the car park.',
    catch: 'Capped by how much sun falls on the roof, which does not double every two years.',
    levels: [
      { mandateCost: 420, mandateUpkeep: 0.2, value: 0.1, value2: 100_000, label: share('Run', [0.1], ' on sunshine')[0] },
      { mandateCost: 1_260, mandateUpkeep: 0.5, value: 0.2, value2: 400_000, label: share('Run', [0.2], ' on sunshine')[0] },
      { mandateCost: 3_800, mandateUpkeep: 1.2, value: 0.35, value2: 1_500_000, label: share('Run', [0.35], ' on sunshine')[0] },
    ],
  },
  {
    id: 'compute.duty', era: 'compute', kind: 'duty',
    name: 'Carbon price',
    blurb: 'A price per ton on the power behind every calculation.',
    catch: 'The calculations get cheaper faster than any minister dares raise it.',
    levels: [
      { mandateCost: 380, mandateUpkeep: 0.2, value: 0.3, label: duty([0.3])[0] },
      { mandateCost: 1_140, mandateUpkeep: 0.5, value: 0.6, label: duty([0.6])[0] },
      { mandateCost: 3_400, mandateUpkeep: 1.2, value: 0.9, label: duty([0.9])[0] },
    ],
  },

  /* ---- Code ---- */
  {
    id: 'code.deletion', era: 'code', kind: 'deletion',
    name: 'Deletion sprints',
    blurb: 'A fortnight in which the only acceptable pull request removes something.',
    catch: 'Spends attention you could be shipping with. Nobody gets promoted for it.',
    levels: [
      { mandateCost: 600, mandateUpkeep: 0.3, value: 0.05, value2: 0.001, label: share('Spend', [0.05], ' of attention deleting')[0] },
      { mandateCost: 1_800, mandateUpkeep: 0.75, value: 0.1, value2: 0.0012, label: share('Spend', [0.1], ' of attention deleting')[0] },
      { mandateCost: 5_400, mandateUpkeep: 1.8, value: 0.2, value2: 0.0015, label: share('Spend', [0.2], ' of attention deleting')[0] },
    ],
  },
  {
    id: 'code.reviewGate', era: 'code', kind: 'reviewGate',
    name: 'Review gates',
    blurb: 'Nothing ships until a person has read it. All of it.',
    catch: 'Shipping slows to the speed of reading. Which was rather the point.',
    levels: [
      { mandateCost: 500, mandateUpkeep: 0.12, value: 0.2, label: share('Review', [0.2], ' of changes')[0] },
      { mandateCost: 1_500, mandateUpkeep: 0.3, value: 0.35, label: share('Review', [0.35], ' of changes')[0] },
      { mandateCost: 4_500, mandateUpkeep: 0.6, value: 0.5, label: share('Review', [0.5], ' of changes')[0] },
    ],
  },
  {
    id: 'code.sharedLibs', era: 'code', kind: 'sharedLibs',
    name: 'Shared libraries',
    blurb: 'One date picker for the whole company, instead of one per agent.',
    catch: 'Someone has to own the date picker. It will be you.',
    levels: [
      { mandateCost: 450, mandateUpkeep: 0.1, value: 0.25, label: share('Reuse', [0.25], ' of new code')[0] },
      { mandateCost: 1_350, mandateUpkeep: 0.25, value: 0.45, label: share('Reuse', [0.45], ' of new code')[0] },
      { mandateCost: 4_000, mandateUpkeep: 0.5, value: 0.65, label: share('Reuse', [0.65], ' of new code')[0] },
    ],
  },
  {
    id: 'code.sufficiency', era: 'code', kind: 'sufficiency',
    name: 'Don’t build it',
    blurb: 'Before writing the app, ask whether a spreadsheet, or nothing, would do.',
    catch: 'The agents are idle and faintly reproachful. The backlog is shorter.',
    levels: [
      { mandateCost: 400, mandateUpkeep: 0.1, value: 0.85, value2: 0.003, label: suff([0.85])[0] },
      { mandateCost: 1_200, mandateUpkeep: 0.25, value: 0.7, value2: 0.004, label: suff([0.7])[0] },
      { mandateCost: 3_600, mandateUpkeep: 0.5, value: 0.55, value2: 0.005, label: suff([0.55])[0] },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* KNOW-HOW (tempting) and INSTITUTIONS (slow)                         */
/* ------------------------------------------------------------------ */

const knowhow: KnowhowDef[] = [
  {
    id: 'kh.apprenticeships', name: 'Apprenticeships',
    blurb: 'Every engine wright trains two more. The pits empty all the sooner.',
    cost: 10, costGrowth: 1.6, maxLevel: 10,
    effects: [{ type: 'etaMul', era: 'steam', value: 1.15 }],
  },
  {
    id: 'kh.royalInstitution', name: 'Evening lectures in electricity',
    blurb: 'Packed halls, sparks on demand. The lamps get brighter, quicker.',
    cost: 25, costGrowth: 1.7, maxLevel: 8,
    effects: [{ type: 'etaMul', era: 'light', value: 1.15 }],
  },
  {
    id: 'kh.motorSchool', name: 'Automotive engineering school',
    blurb: 'Graduates who can find another mile in any gallon. They will drive it, too.',
    cost: 60, costGrowth: 1.7, maxLevel: 8,
    effects: [{ type: 'etaMul', era: 'motion', value: 1.15 }],
  },
  {
    id: 'kh.csDepartment', name: 'Computer science department',
    blurb: 'A new building, a new chip, a new reason for a bigger data centre.',
    cost: 120, costGrowth: 1.8, maxLevel: 8,
    effects: [{ type: 'etaMul', era: 'compute', value: 1.2 }],
  },
  {
    id: 'kh.bootcamps', name: 'Prompt bootcamps',
    blurb: 'Twelve weeks to ten-times productivity, and ten times as much to maintain.',
    cost: 250, costGrowth: 1.8, maxLevel: 8,
    effects: [{ type: 'etaMul', era: 'code', value: 1.2 }],
  },
  {
    id: 'kh.patentPool', name: 'Patent pool',
    blurb: 'Everyone licenses everyone. Improvements arrive cheap, and early.',
    cost: 15, costGrowth: 1.8, maxLevel: 8,
    effects: [{ type: 'costMul', value: 0.9 }],
  },
  {
    id: 'kh.seedCapital', name: 'Seed capital',
    blurb: 'Start each run with a heavier purse. Get to the bottom of the pit faster.',
    cost: 8, costGrowth: 1.5, maxLevel: 10,
    effects: [{ type: 'startCapitalMul', value: 2 }],
  },
  {
    id: 'kh.machineShop', name: 'Machine-shop lore',
    blurb: 'Tricks of the trade, written down at last. Engines cost less to build, and so there are more.',
    cost: 20, costGrowth: 1.7, maxLevel: 6,
    effects: [{ type: 'capCostMul', era: 'steam', value: 0.9 }],
  },
];

const institutions: InstitutionDef[] = [
  {
    id: 'inst.statisticsOffice', name: 'Statistics Office',
    blurb: 'Clerks who add up the whole country’s coal, not just the engine’s. The rebound is visible from minute one.',
    cost: 25, effects: [{ type: 'reveal' }],
  },
  {
    id: 'inst.standingDuty', name: 'Standing fuel duty',
    blurb: 'The escalator is law before the first engine is built.',
    cost: 60, requires: ['inst.statisticsOffice'],
    effects: [{ type: 'startLever', lever: 'steam.duty', level: 1 }],
  },
  {
    id: 'inst.royalCommission', name: 'Royal Commission on Coal',
    blurb: 'Reports, at length, that the slack heaps are coal too. Recovery from the start.',
    cost: 70, requires: ['inst.statisticsOffice'],
    effects: [{ type: 'startLever', lever: 'steam.circularity', level: 1 }],
  },
  {
    id: 'inst.cleanAirAct', name: 'Clean Air Act',
    blurb: 'Smokeless zones and taller chimneys. The air clears a little faster in every run.',
    cost: 90,
    effects: [
      { type: 'absorptionAdd', era: 'steam', value: 0.003 },
      { type: 'absorptionAdd', era: 'light', value: 0.003 },
    ],
  },
  {
    id: 'inst.broadcaster', name: 'A public broadcaster',
    blurb: 'Shared facts, nightly. Arguments for restraint find an audience.',
    cost: 100, effects: [{ type: 'mandateRateMul', value: 1.25 }],
  },
  {
    id: 'inst.parksTrust', name: 'Municipal improvement trust',
    blurb: 'Libraries, baths and parks are funded before the lamps are lit.',
    cost: 120, requires: ['inst.broadcaster'],
    effects: [{ type: 'startLever', lever: 'light.greenSpending', level: 1 }],
  },
  {
    id: 'inst.greenBelt', name: 'Green belt',
    blurb: 'A ring of fields the suburbs may not cross. Towns stay walkable.',
    cost: 150,
    effects: [{ type: 'startLever', lever: 'motion.sufficiency', level: 1 }],
  },
  {
    id: 'inst.climateCommittee', name: 'Independent climate committee',
    blurb: 'Carbon budgets set years ahead, out of reach of the next election.',
    cost: 220, requires: ['inst.standingDuty'],
    effects: [{ type: 'startLever', lever: 'motion.duty', level: 1 }],
  },
  {
    id: 'inst.gridCode', name: 'Grid connection code',
    blurb: 'Data centres queue for power like everybody else.',
    cost: 300, requires: ['inst.climateCommittee'],
    effects: [{ type: 'startLever', lever: 'compute.cap', level: 1 }],
  },
  {
    id: 'inst.engineeringGuild', name: 'Engineering guild',
    blurb: 'A profession with standards: nothing ships that no one has read.',
    cost: 400, requires: ['inst.gridCode'],
    effects: [{ type: 'startLever', lever: 'code.reviewGate', level: 1 }],
  },
];

/* ------------------------------------------------------------------ */
/* ACHIEVEMENTS                                                        */
/* ------------------------------------------------------------------ */

const achievements: AchievementDef[] = [
  {
    id: 'firstReckoning', name: 'The First Reckoning',
    blurb: 'Ended a run and looked back at the ledger.',
  },
  {
    id: 'backfire', name: 'Backfire',
    blurb: 'Watched an era’s savings be eaten entirely, and then some.',
  },
  {
    id: 'jevonsWasRight', name: 'Jevons Was Right',
    blurb: 'Completed an era’s efficiency tree while its resource use grew many-fold.',
  },
  {
    id: 'degrowthByAccident', name: 'Degrowth by Accident', hidden: true,
    blurb: 'Resource use fell, because there was hardly anyone left to use it.',
  },
  {
    id: 'steadyState', name: 'Steady State',
    blurb: 'Held wellbeing up while resource use fell, for fifty years.',
  },
];

/* ------------------------------------------------------------------ */
/* HEADLINES                                                           */
/* ------------------------------------------------------------------ */

const headlines: Record<HeadlineKey, string[]> = {
  efficiency: [
    'Engines thriftier than ever; collieries report record sales',
    'New {service} saves a third of the {resource}, say makers',
    'Inventor hailed: “the {resource} problem is solved”',
    'Efficiency gains to ease demand on {resource}, experts agree',
    'Cheaper {service} for all; {resource} merchants order more stock',
  ],
  appAvailable: [
    '{app} now within reach of the ordinary purse',
    'Prospectus issued for {app}; subscribers queue',
    'Cheap {service} makes {app} a going concern',
    'Speculators eye {app} as costs tumble',
  ],
  appFounded: [
    'First {app} opens to crowds and a brass band',
    '{app} founded; “a new age”, says the chairman',
    '{app} draws investors; {resource} orders double',
    'Ribbon cut on {app}. Nobody asks what it will burn',
  ],
  eraOpened: [
    'The age of {era} begins, by all accounts',
    '{service} arrives. The old trades look on, unbothered',
    'Correspondent sees “the dawn of {era}”',
    'Parliament welcomes {era}; {resource} demand “manageable”',
  ],
  crisis: [
    'Fog so thick the cattle choke at market',
    'Doctors report a run on the infirmaries; {resource} blamed',
    'Emergency session called as the air turns yellow',
    'Public meeting demands action; minister “listening”',
    'Mortality figures for the week “regrettable”',
  ],
  collapse: [
    'The city stops. The air will not allow it to go on',
    'Collapse: commerce suspended until further notice',
    'Too thick to breathe, too late to argue',
    '{era} grinds to a halt beneath its own exhaust',
  ],
  exhausted: [
    'The last seam is worked out. The engines fall silent',
    '{resource} runs dry; price “no longer meaningful”',
    'Final consignment of {resource} sold at auction',
    'Reserves exhausted, decades ahead of the forecast',
  ],
  backfire: [
    'Thriftier machines, yet {resource} burned climbs to a record',
    'Economist puzzled: savings “appear to have been spent”',
    '{resource} use up again, despite the improvements',
    'Every saving promised, none delivered, figures show',
    'The more we save, the more we burn: a correspondent writes',
  ],
  reveal: [
    'Professor’s pamphlet causes a stir: thrift breeds appetite',
    '“Economy of fuel is not economy of fuel”, writes Jevons',
    'The Coal Question: dismissed in the clubs, read in the Treasury',
    'Statistician adds up the whole country, alarms everyone',
  ],
  leverEnacted: [
    'Bill passes after a long night in the House',
    'New measure welcomed by some, denounced by more',
    'Government acts; industry warns of “ruin”',
    'Reform enacted. Leader writers divide along the usual lines',
  ],
  leverLapsed: [
    'Measure quietly allowed to lapse',
    'Reform repealed amid cheers from the trade benches',
    'Public patience runs out; the policy goes with it',
    'Ministers drop scheme “for now”',
  ],
  steadyEra: [
    '{era} settles: use falls, and nobody goes without',
    'A curious thing: {resource} down, and everyone content',
    'Statisticians confirm a decade of falling {resource}',
    'Economy of {era} declared “steady”, to general surprise',
  ],
  steadyAll: [
    'Every gauge falling, every household fed. A first',
    'Steady State: the world grows better without growing',
    'Historians may call it the end of the rebound',
    'Nothing much happens, for fifty years, on purpose',
  ],
  reckoning: [
    'An inquiry sits. The ledgers are read from the start',
    'A reckoning: what was saved, and what was spent',
    'Commission reports; recommends, as ever, doing better',
    'Lessons learned, the minutes say, and filed',
  ],
};

/* ------------------------------------------------------------------ */
/* GLOBAL                                                              */
/* ------------------------------------------------------------------ */

const global: GlobalParams = {
  startCapital: 50,
  clickSeconds: 1,
  clickFlat: 2,
  popGrowth: 0.000025,
  subsistence: 8,
  wellbeingTarget: 28,
  mandateRate: 0.03,
  mandateFloor: 12,
  crisisMandate: 150,
  crisisPopLoss: 0.08,
  hindsight: { perPeakWellbeing: 1, perDecoupledYear: 2, perEraReached: 5, perSteadyEra: 150 },
  offlineCapSeconds: 4 * 60 * 60,
};

export const content: Content = {
  eras: { steam, light, motion, compute, code },
  upgrades,
  levers,
  knowhow,
  institutions,
  achievements,
  headlines,
  global,
};
