/**
 * Motion (on screen an Industry): its SectorDef and applications, upgrades, levers and its own headlines.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { HeadlineKey, LeverDef, SectorDef, UpgradeDef } from '../../types';
import {
  eta, capCost, margin, reserve, sat, half, chain, fork, ladder, lever, withStages, decadeSequence, RECYCLE, DUTY_LABEL, CAP_LABEL, CAP_FIRST,
  SUFF_LABEL, CAP_VALUES, CAP_LEAK, DUTY_VALUES, SUFF_VALUES, SHARE_VALUES, GREEN_VALUES, DIVIDEND,
} from '../helpers';
import type { SectorContent } from '../helpers';
import { MECHANICS_LIVE } from '../helpers';

/*
 * M3: travel time, congestion and sprawl (TravelDef). Balance knobs:
 *   ROADS     service per second at which traffic halves the speed. Commuting and the first out-of-town shopping bring
 *             Motion's travel demand to roughly 12,000 about 15 minutes in; at 20,000 the speed index is then about 0.9
 *             (congestion starts to bite), and by the suburbs it holds travel demand near the roads' capacity, which the
 *             motorway, the relief roads and the road-building programme raise. With MECHANICS_LIVE false: effectively
 *             infinite (v = 1, the M2 solve).
 *   DECAY     sprawl fades: a lock-in peak halves in about an hour of play (ln 2 / 3,600 s). Off (M2) until live.
 */
const ROADS = MECHANICS_LIVE ? 20_000 : 1e15;
const DECAY = MECHANICS_LIVE ? Math.LN2 / 3600 : undefined;
const roads = (value: number) => ({ type: 'travelMul' as const, sector: 'motion', roads: value });

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
  resource: { name: 'Oil', unit: 'barrels', unitSingular: 'barrel' },
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

  /*
   * M2: clear skies at 0.4 of the drawn pressure (M2 balance, as Steam and Light). Motion's lock-in holds demand at a share of its peak, so
   * a line drawn after the suburbs are built is hard to halve: rail and walking distance, before the motorway, reach it.
   */
  steady: {
    clearBelow: 0.4,
    decadeChoices: decadeSequence([
      ['div.motion.carFreeSundays', 'div.motion.roadFund'],
      ['div.motion.treePlanting', 'div.motion.motorShow'],
    ]),
  },

  /*
   * M2: Settlement. Standing while settled: quieter streets (wellbeing) and an easier Mandate; once a run, a purse of
   * Mandate. Defence 0.3 Mandate/s per unit of excess: the suburbs keep filling, and a settled Motion feels every new
   * household.
   */
  settle: {
    dividend: [{ type: 'wellbeingAdd', value: 1.2 }, { type: 'mandateRateMul', value: 1.05 }, { type: 'mandateAdd', value: 250 }],
    upkeepPerSpill: 0.3,
    freeExcess: 0.05,
    blurb: 'The ring road is finished and stays finished. The Motorist runs a feature on the scenic route.',
  },

  spill: { to: 'light', rate: 0.3 },
  /* M4: re-gated as a Preview. Its opening conditions must hold in a capstoned run, where Light is settled and owns no
   * cards this run: five minutes of run time, and (M1 balance) no new age opening into a choking one. `after` Light
   * (not Fishing, sectorOrder's predecessor): an older save that opened Motion keeps it before Fishing exists. */
  unlock: {
    minReckonings: 2,
    after: ['light'],
    when: {
      all: [
        {
          /* M4: a Preview (Act II/III): after the Act I ending, from the next run (one built with the capstone), or in any
           * save that has opened Motion before (meta.sectorsOpened), which keeps it in every run (design/m4-design.md §7.4). */
          any: [{ all: [{ ending: 'actOne' }, { stat: 'capstoned', op: '>=', value: 1 }] }, { owns: 'motion' }],
          label: 'The Coal Age settled',
        },
        { stat: 'time', op: '>=', value: 300, label: 'Five minutes into the run' },
        { stat: 'pressureFraction', sector: 'steam', op: '<', value: 0.5, label: 'Steam’s smoke under half of collapse' },
      ],
    },
  },

  travel: {
    roads: ROADS,
    exponent: 4,
    /* About one hour a day at the wheel at the start: Motion's opening demand per head is near 800 vehicle-miles. */
    hoursScale: 0.00125,
    /* The vans make their rounds whatever the traffic; the commute, the shopping trip and the suburb are the travel. */
    apps: ['motion.commuting', 'motion.shopping', 'motion.suburbs'],
  },
  mechanic: {
    name: 'The travel-time budget',
    rebound: 'Induced demand and lock-in',
    blurb: 'Faster roads buy distance, not time: the hour a day stays, and the miles grow. Sprawl outlasts the traffic.',
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
      name: 'Commuter towns',
      blurb: 'Faster cars mean the same hour in traffic, from twice as far away.',
      icon: 'car',
      halfPrice: 0.4,
      saturation: 15_000,
      steepness: 2.3,
      visibleBelow: 0.75,
      foundCost: 30_000,
      lockIn: 0.75,
      ...(DECAY ? { lockInDecay: DECAY } : {}),
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
      ...(DECAY ? { lockInDecay: DECAY } : {}),
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
      ...(DECAY ? { lockInDecay: DECAY } : {}),
    },
    {
      id: 'motion.flights',
      name: 'Package holidays',
      blurb: 'A fortnight on the Costa for the price of a week in Skegness, says the brochure.',
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
/* M2 stages (the scene's cars): fuel injection 1, wind-tunnel bodywork 2, the hybrid 3. */
const motionUpgrades: UpgradeDef[] = withStages([
  ...chain('motion', ladder(12_000, 2.4, 5), [
    {
      id: 'motion.radial', name: 'Radial tyres', fold: 1.3,
      blurb: 'Michelin, 1946. Less rolling resistance, a longer life, and longer trips.',
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
      /* M3 (live): more road, for a season. */
      effects: [capCost('motion', 0.85), sat('motion', 1.3, 'motion.commuting'), ...(MECHANICS_LIVE ? [roads(1.4)] : [])],
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
    blurb: 'The M1, 1959. No crossroads, no traffic lights, no speed limit, and no reason to stay at home.',
    cost: 250_000, requires: ['motion.injection'],
    /* M3 (live): faster (no limit) and wider: the speed buys distance, and the lanes fill. */
    effects: [capCost('motion', 0.8), ...(MECHANICS_LIVE ? [{ type: 'travelMul' as const, sector: 'motion', speed: 1.25, roads: 1.5 }] : [])],
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
], { 'motion.injection': [1, 'Fuel-injected saloon'], 'motion.aero': [2, 'Wind-tunnel saloon'], 'motion.hybrid': [3, 'Hybrid car'] });

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
    recycleBlurb: { commons: 'Spent on the Commons instead: a bus pass, a shorter week, and a fortnight in the sun with the time.' },
  }),
  lever({
    id: 'motion.cap', sector: 'motion', kind: 'cap',
    requires: ['budget'],
    name: 'Oil import quota',
    blurb: 'So many barrels a year, fewer each decade, and not one more. The permits change hands in the City.',
    catch: `Squeeze too hard and the barrels arrive by other routes. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 280, upkeep: 0.14, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
    recycleBlurb: { commons: 'Quota money for the Commons. The buses run on oil too, only rather less of it per head.' },
  }),
  lever({
    id: 'motion.sufficiency', sector: 'motion', kind: 'sufficiency',
    name: 'Walking distance',
    blurb: 'School, shop and surgery within a walk. The car stays on the drive.',
    catch: 'The suburbs were built for the car. They will not walk anywhere quickly.',
    values: SUFF_VALUES, value2: [0.0015, 0.0025, 0.0035], cost: 200, upkeep: 0.05, label: SUFF_LABEL,
    repeat: { value2Step: 0.0005 },
  }),
  lever({
    id: 'motion.substitution', sector: 'motion', kind: 'substitution',
    requires: ['moreLevers'],
    name: 'Electrified rail & trams',
    blurb: 'Put the wires back up. Some of the old tram lines are still under the tarmac.',
    catch: 'Dearer to build per mile, and it only goes where the rails go.',
    values: SHARE_VALUES, value2: [8_000, 25_000, 70_000], cost: 270, upkeep: 0.12, label: 'Carry {pct}% by rail',
    repeat: { value2Step: 25_000 },
  }),
  lever({
    id: 'motion.greenSpending', sector: 'motion', kind: 'greenSpending',
    requires: ['moreLevers'],
    name: 'Insulation grants',
    blurb: 'Steer the money saved on petrol into loft lagging instead of more lamps.',
    catch: 'Blunts the spill into Light, and only that; the motorways carry on as before.',
    values: GREEN_VALUES, cost: 220, upkeep: 0.05, label: 'Absorb {pct}% of the savings',
  }),
  /*
   * M3: the lever that bites back (CAFE, 1975, and its light-truck boundary: design/research/restraint.md 5.1). A
   * standard on miles per gallon (etaMul per step); the heavier vehicles fall outside it and the cheaper miles move the
   * family further out (satMul on the suburbs, halfPriceMul on the commute, × bite × level), unless the fuel duty
   * escalator holds the price of a mile (Knittel, 2011). Arrives with the travel dial (run 4).
   */
  lever({
    id: 'motion.mileageRule', sector: 'motion', kind: 'measure',
    requires: ['travel'],
    name: 'Fleet mileage rule',
    blurb: 'Every maker’s cars must average so many miles to the gallon. Vans and four-by-fours are counted separately.',
    catch: 'Each mile gets cheaper, so there are more of them, and the heavy vehicles sit outside the rule.',
    values: [1, 2, 3], cost: 220, upkeep: 0.05, label: 'Standard, step {n}',
    labels: { 0: 'A first standard', 1: 'A stricter standard', 2: 'The strictest yet' },
    effects: [eta('motion', 1.1)],
    sideEffects: {
      effects: [sat('motion', 1.12, 'motion.suburbs'), half('motion', 1.08, 'motion.commuting')],
      rampYears: 30, decayYears: 40, // a fleet is not replaced overnight, nor scrapped
      unless: { owns: 'motion.duty' },
      blurb: 'Heavier vehicles fill the forecourt, and the commute grows longer.',
      unlessLabel: 'unless the fuel duty escalator is in force',
    },
  }),
  /*
   * M3: road building to relieve congestion (SACTRA, 1994; Duranton & Turner, 2011). A measure on the roads (travelMul
   * roads per step). It needs no side effect: the travel solve refills new road by itself, and the sprawl that follows
   * stays (lock-in). Arrives with the travel dial.
   */
  lever({
    id: 'motion.roadProgramme', sector: 'motion', kind: 'measure',
    requires: ['travel'],
    name: 'Road-building programme',
    blurb: 'Widen the trunk roads, bypass the towns and ring the cities. The jam clears for a season.',
    catch: 'New lanes fill from further away, and the houses built beside them stay.',
    values: [1, 2, 3], cost: 180, upkeep: 0.04, label: 'Programme, phase {n}',
    labels: { 0: 'A first programme', 1: 'A second programme', 2: 'A third programme' },
    effects: [roads(1.3)],
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
    'Road test: forty to the gallon, and nowhere it will not go',
    'Thriftier engine launched; the brochure suggests a touring holiday',
    'Economy run won at a record; the winner drives home the long way',
  ],
  sectorOpened: [
    'Distance repealed; the bypass opens in {year}',
    'The motor age arrives; the high street heads for the ring road',
    'A car for every family “within a generation”, says minister',
  ],
  appAvailable: [
    'Planning application lodged for {app}; the bypass is the draw',
    'Cheap motoring puts {app} on the map',
    'Developers circle the ring road with plans for {app}',
    'Survey finds strong demand for {app}, and stronger for parking',
    '{app} “the future”, says a man with a scale model of it',
  ],
  appFounded: [
    'Opened by a minister in a new saloon: {app}',
    'Planners approve {app}; nobody asks the buses',
    'Queues on the ring road for {app}; the car park full by ten',
    'Ribbon cut on {app}; the ring road gains a lane',
    '{app} a hit; new signs go up on the bypass',
  ],
  backfire: [
    'Cars twice as thrifty; the nation drives three times as far',
    'Petrol per mile down, petrol per family up, figures show',
    'Most economical cars ever built; the longest jams ever recorded',
    'Record fuel economy, record petrol sales; forecourts baffled',
  ],
  crisis: [
    'Summer smog: asthma wards full, motorways fuller',
    'Haze over the ring road; health warning for the elderly',
    'Smog alert No. {n}: please leave the car, say the adverts',
    'Traffic fumes trap a heatwave over the city',
    'Children kept indoors as the smog settles on the bypass',
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
    'Petrol rationed, then gone; the bicycle shops sell out',
  ],
  leverEnacted: [
    'Transport bill through the Commons; motoring correspondents in black',
    'Minister of Transport announces measures; the motor show goes on',
    'Measure passes; hauliers threaten a go-slow',
    'Budget day: the Chancellor turns to motoring, and the House groans',
    'New rules from Monday; the motoring lobby “considers its options”',
  ],
  leverLapsed: [
    'Measure dropped after a summer of headlines',
    'U-turn on the motorist; the minister “has listened”',
    'Scheme scrapped; the motoring lobby claims a scalp',
  ],
  budgetDrawn: [
    'Oil budget drawn; motorists told the line “will not bite”',
    'An oil budget, smaller each decade; the motor lobby “studies it”',
  ],
  decade: [
    'Decade {n} inside the oil budget; the bypass a little quieter',
    'Ten years on the line; the car stays on the drive more often',
  ],
  budgetBroken: [
    'Oil budget breached; a bank-holiday weekend blamed',
    'Over the line: the new motorway “was always going to be busy”',
  ],
  steadySector: [
    'Fifty years on the oil budget; the high street has its shops back',
    'Motion holds its line; the traffic reports run short of material',
  ],
  ageBegins: [
    'Petrol rationing ends; {age} begins on the forecourt',
    'Postwar boom under way; the economists run out of graph paper',
  ],
  reckoning: [
    'Public inquiry into the motorway age opens in a draughty hall',
    'The Motorist reviews the century: “mixed, but fast”',
  ],
  /* M2 */
  clearSkies: [
    'A summer without a smog warning; this paper runs a scenic route',
    'Clear air over the ring road; joggers return to the verges',
    'Exhaust down to the sink line; the Minister is listening, to birds',
  ],
  settled: [
    'Motion settled: no new roads, and the old ones mended',
    'Traffic to stay as it is, by agreement; the motor show is muted',
    'The bypass is finished; nobody is building the next one',
  ],
  /* M3 */
  biteBack: [
    'Thriftier cars, heavier cars; the forecourt fills with four-by-fours',
    'Mileage standard met; the family moves ten miles further out',
    'Vans not cars, rules the ministry; the family buys a van',
  ],
  unsettled: [
    'Road settlement lapses; the new estate gets its relief road',
    'Motion unsettled; traffic returns to fill the space, as it does',
    'The suburbs have outgrown the settlement; the motorway widens',
  ],
};

export const motion: SectorContent = {
  def: sector, upgrades: motionUpgrades, levers: motionLevers, headlines: motionHeadlines,
};
