/**
 * Motion (on screen an Industry): its SectorDef and applications, upgrades, levers and its own headlines.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { HeadlineKey, LeverDef, SectorDef, UpgradeDef } from '../../types';
import {
  eta, capCost, margin, reserve, sat, half, chain, fork, ladder, lever, RECYCLE, DUTY_LABEL, CAP_LABEL, CAP_FIRST,
  SUFF_LABEL, CAP_VALUES, CAP_LEAK, DUTY_VALUES, SUFF_VALUES, SHARE_VALUES, GREEN_VALUES, DIVIDEND,
} from '../helpers';
import type { SectorContent } from '../helpers';

/* ------------------------------------------------------------------ */
/* MOTION: the Industry                                                */
/* ------------------------------------------------------------------ */

const sector: SectorDef = {
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
        /* M1 balance: no new age opens into a choking one (Motion would otherwise die with Steam within minutes). */
        { stat: 'pressureFraction', sector: 'steam', op: '<', value: 0.5, label: 'Steam’s smog under half of collapse' },
        { stat: 'serviceDelivered', sector: 'light', op: '>=', value: 2_000, label: '2,000 klm·h·years of light delivered' },
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

/* ------------------------------------------------------------------ */
/* UPGRADES                                                            */
/* ------------------------------------------------------------------ */

/* ---- Motion: chain to ×8.2 ---- */
const motionUpgrades: UpgradeDef[] = [
  ...chain('motion', ladder(12_000, 2.4, 5), [
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

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

const motionLevers: LeverDef[] = [
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
];

/* ------------------------------------------------------------------ */
/* HEADLINES (Content.sectorHeadlines)                                 */
/* ------------------------------------------------------------------ */

const motionHeadlines: Partial<Record<HeadlineKey, string[]>> = {
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
};

export const motion: SectorContent = {
  def: sector, upgrades: motionUpgrades, levers: motionLevers, headlines: motionHeadlines,
};
