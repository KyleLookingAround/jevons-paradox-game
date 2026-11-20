/**
 * Motion (on screen an Industry): its SectorDef and applications, upgrades, levers and its own headlines.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { HeadlineKey, LeverDef, LoopholeDef, PledgeDef, SectorDef, UpgradeDef } from '../../types';
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
    /* M5: two paths. Before office (the Preview, unchanged from M4) or in a Ministry (Pryce's from its first minute:
     * design/m5-design.md §4, Ministry 1). The office path drops Steam's smoke: the Coal Age is capstoned by then. */
    when: {
      any: [
        {
          all: [
            {
              /* M4: a Preview (Act II/III): after the Act I ending, from the next run (not in the run that reached it: flags.won
               * holds for the rest of that run), or in any
               * save that has opened Motion before (meta.sectorsOpened), which keeps it in every run (design/m4-design.md §7.4). */
              any: [{ all: [{ ending: 'actOne' }, { not: { flag: 'won' } }] }, { owns: 'motion' }],
              label: 'The Coal Age settled',
            },
            { stat: 'time', op: '>=', value: 300, label: 'Five minutes into the run' },
            { stat: 'pressureFraction', sector: 'steam', op: '<', value: 0.5, label: 'Steam’s smoke under half of collapse' },
          ],
        },
        {
          all: [
            { flag: 'office', label: 'Office taken' },
            /* MINISTRY_OPEN_AT: Motion opens a minute into every Ministry (the Ministry's first beat is Take office's cards). */
            { stat: 'time', op: '>=', value: 60, label: 'A minute into the Ministry' },
          ],
        },
      ],
    },
  },

  travel: {
    roads: ROADS,
    exponent: 4,
    /* About one hour a day at the wheel at the start: Motion's opening demand per head is near 800 vehicle-miles. */
    hoursScale: 0.00125,
    /* The vans make their rounds whatever the traffic; the commute, the shopping trip and the suburb are the travel. */
    /* M5: the school run is not a travel use (the bell sets the trip, not the traffic, as the vans' rounds); the
     * four-by-four is a family car and queues with the rest. */
    apps: ['motion.commuting', 'motion.shopping', 'motion.suburbs', 'motion.fourByFours'],
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
    /*
     * M5: the growth tail's calendar-dated uses and the loophole ladder's exempt vehicles. Every one is gated to a
     * Ministry ({ flag: 'office' } in ApplicationDef.when), so the Preview (before office) keeps M4's five uses.
     * The calendar in a Ministry runs about three years a minute from 1956 at minute 3 to 2010 at minute 21, then slows.
     * Measured (abstain, default profile, head start 1.25; design/scratch/m5-motion-progress.md): the first wave
     * (commute, lorries, school run, the model years) lifts the burn to about 0.25 of collapse by minute 17; Pryce's
     * efficient engines cut it; next-day delivery (2005) lifts it again, and The Summer Smog comes at about minute 23
     * (11 rival profiles: 20.6–23.3 for six, 13.7 and 17.2 for two that found everything at once, none for three).
     *   motion.haulage     not travel (lorries do not trade their hours against the traffic, as the vans do not).
     *   motion.schoolRun   not travel either: the bell sets the trip, not the traffic.
     *   motion.nextDay     the second wave, after the efficient engines; the knob that sets the first crisis's minute.
     *   motion.lightTrucks the first rung's exempt vehicle (a van counted as a truck): founded free by Pryce when he first
     *                      evades; it stops growing when the rung closes (ApplicationDef.when).
     *   motion.fourByFours the second rung's: the larger family vehicle the footprint rule favours (a travel use).
     */
    {
      id: 'motion.haulage',
      name: 'Motorway haulage',
      blurb: 'Freight leaves the railway for the lorry, and the depot moves to the junction.',
      icon: 'van',
      halfPrice: 0.45, // HAULAGE_HALF: well adopted at Pryce's price (about 0.3 by then)
      saturation: 9_000, // HAULAGE_SAT
      steepness: 2.2,
      visibleBelow: Infinity,
      foundCost: 60_000, // HAULAGE_FOUND: founded about minute 8 (inside his founding payback once the commute is built)
      when: {
        all: [
          { flag: 'office', label: 'Under the Chair' },
          { stat: 'year', op: '>=', value: 1965, label: 'From 1965' }, // about minute 6
        ],
      },
    },
    {
      id: 'motion.schoolRun',
      name: 'The school run',
      blurb: 'Half a mile each way, twice a day, in a car built for the Alps.',
      icon: 'car',
      halfPrice: 0.35, // SCHOOL_HALF
      saturation: 10_000, // SCHOOL_SAT
      steepness: 2.3,
      visibleBelow: Infinity,
      foundCost: 45_000, // SCHOOL_FOUND: founded about minute 10–11
      lockIn: 0.7, // the catchment is drawn for the car once it is drawn
      ...(DECAY ? { lockInDecay: DECAY } : {}),
      when: {
        all: [
          { flag: 'office', label: 'Under the Chair' },
          { stat: 'year', op: '>=', value: 1975, label: 'From 1975' }, // about minute 9
        ],
      },
    },
    {
      id: 'motion.nextDay',
      name: 'Next-day delivery',
      blurb: 'Ordered at midnight, on the doorstep by noon, and the van back on the road by one.',
      icon: 'van',
      halfPrice: 0.4, // NEXTDAY_HALF
      saturation: 20_000, // NEXTDAY_SAT: with its year, the first crisis's knob (peak about 0.36 of collapse; 22,000: 0.37; 25,000: 0.42)
      steepness: 2.2,
      visibleBelow: Infinity,
      foundCost: 60_000, // NEXTDAY_FOUND: founded the minute it is available (about minute 18)
      when: {
        all: [
          { flag: 'office', label: 'Under the Chair' },
          { stat: 'year', op: '>=', value: 2005, label: 'From 2005' }, // about minute 19.4 (2000: crisis 20.8 for the default Pryce)
        ],
      },
    },
    {
      id: 'motion.lightTrucks',
      name: 'Light trucks',
      blurb: 'A van with seats in the back, counted as a truck and built like one.',
      icon: 'van',
      halfPrice: 0.5, // LT_HALF
      saturation: 3_000, // LT_SAT: grows with the rung's effect (satMul × the rule's level) while used
      steepness: 1.8,
      visibleBelow: -1, // never offered: only Evade founds it (loopholes.ts sets it available and founded)
      foundCost: 1e12, // only Evade founds it (free, by Pryce)
      when: { loophole: 'motion.mileage.lightTrucks', status: 'used' },
    },
    {
      id: 'motion.fourByFours',
      name: 'Family four-by-fours',
      blurb: 'The bigger the car, the easier its target. The cars get bigger.',
      icon: 'car',
      halfPrice: 0.45, // FXF_HALF
      saturation: 6_000, // FXF_SAT
      steepness: 2,
      visibleBelow: -1, // never offered: only Evade founds it (loopholes.ts sets it available and founded)
      foundCost: 1e12, // only Evade founds it
      when: { loophole: 'motion.mileage.footprint', status: 'used' },
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
  /*
   * M5: the growth tail (design/m5-design.md §1; core findings: one repeatable demand card at satMul ×1.15 and cost ×1.7
   * a level gave a first crisis at 24.8 min on the fixture). Both only under the Chair (`when` office): the Preview is
   * unchanged. Pryce buys them by the Market's payback rule, so each is priced to pay back ABOVE his limit at the
   * opening (no early explosion) and inside it once the commute and the shops are founded.
   *   TAIL_MODEL_*  New model year: every use ×1.1 a level (all of Motion's applications); cost ×1.5 a level.
   *   TAIL_TERMS_*  Easier terms (hire purchase made repeatable): adopted at prices ×1.08 higher a level; cost ×1.6.
   */
  {
    id: 'motion.modelYear', sector: 'motion', kind: 'capital',
    name: 'New model year',
    blurb: 'Fins this year, a longer bonnet next. Last year’s car is suddenly last year’s.',
    cost: 15_000, repeatable: true, costGrowth: 1.5, maxLevel: 14, // TAIL_MODEL_COST, _GROWTH, _MAX (default Pryce: 2 levels; a patient one 4)
    when: { flag: 'office' },
    effects: [sat('motion', 1.1)], // TAIL_MODEL_SAT (1.3 growth against 1.1 runs away: crisis at minute 11, dry at 69)
  },
  {
    id: 'motion.easyTerms', sector: 'motion', kind: 'capital',
    name: 'Easier terms',
    blurb: 'Nothing down and five years to pay. A second car on the same terms.',
    /* Hire purchase made repeatable: not behind the M4 card (Pryce never buys that: payback about 500 s). Measured: the
     * default Pryce does not buy it either (it lifts demand only where uses are not yet saturated); a hasty one may. */
    cost: 30_000, repeatable: true, costGrowth: 1.6, maxLevel: 10, // TAIL_TERMS_COST, _GROWTH, _MAX
    when: { flag: 'office' },
    effects: [half('motion', 1.08)], // TAIL_TERMS_HALF
  },
  {
    id: 'motion.northSea', sector: 'motion', kind: 'prospect',
    name: 'North Sea licence',
    blurb: 'Drill where the weather is worst and the oil is dearest. It is still oil.',
    cost: 250_000, repeatable: true, costGrowth: 2.2, maxLevel: 6,
    /* M5: not in a Ministry. Pryce never buys a prospect (the Market's rule) and a reserve card is worth nothing to his
     * payback rule (reserveAdd is not a running cost), so under the Chair the oil is the 25 million barrels. */
    when: { not: { flag: 'office' } },
    effects: [reserve('motion', 0.25)],
  },
], { 'motion.injection': [1, 'Fuel-injected saloon'], 'motion.aero': [2, 'Wind-tunnel saloon'], 'motion.hybrid': [3, 'Hybrid car'] });

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

/* M5: a lever's catch gains a clause once the Chair arrives (LeverDef.catchAfter, after the dividend clause). */
const afterChair = (l: LeverDef, chair: string): LeverDef => ({ ...l, catchAfter: { ...(l.catchAfter ?? {}), chair } });
/* M5: the lever's loophole ladder (LeverDef.ladder; only in a Ministry with 'loopholes' on). */
const withLadder = (l: LeverDef, ladder: string[]): LeverDef => ({ ...l, ladder });

const motionLevers: LeverDef[] = [
  /* ---- Motion ---- */
  {
  ...afterChair(lever({
    id: 'motion.duty', sector: 'motion', kind: 'duty',
    name: 'Fuel duty escalator',
    blurb: 'Petrol duty that rises faster than engines improve. Briefly popular with nobody.',
    catch: `Every efficient engine still costs as much to run. Hauliers blockade the refineries. ${DIVIDEND}`,
    values: DUTY_VALUES, cost: 250, upkeep: 0.12, label: DUTY_LABEL, recycle: RECYCLE,
    recycleBlurb: { commons: 'Spent on the Commons instead: a bus pass, a shorter week, and a fortnight in the sun with the time.' },
  }), 'Pryce Consolidated will pay it on the barrels it reports.'),
    /* M5 (registry lane, for the coordinator's order of discovery): the duty is the expensive lever on the day. Per
     * level, −6 in Confidence's target when enacted, +0.5 after thirty model years (ten minutes, two Parliaments) (a fuel duty is resented, then
     * forgotten), on top of the price share every levy costs. A steward who reaches for it first pays at the polls;
     * one who meets the light trucks under a standard first finds the duty closes the ladder. */
    popularity: { start: -6, after: 0.5, years: 30 },
  },
  afterChair(lever({
    id: 'motion.cap', sector: 'motion', kind: 'cap',
    requires: ['budget'],
    name: 'Oil import quota',
    blurb: 'So many barrels a year, fewer each decade, and not one more. The permits change hands in the City.',
    catch: `Squeeze too hard and the barrels arrive by other routes. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 280, upkeep: 0.14, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
    recycleBlurb: { commons: 'Quota money for the Commons. The buses run on oil too, only rather less of it per head.' },
  }), 'Pryce Consolidated holds it on the barrels it reports.'),
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
  /* M5: in a Ministry the rule has a ladder of three rungs (motionLoopholes below); every rung is closed by the fuel duty
   * escalator in force (core findings: the price of a mile reaches every category). */
  withLadder(lever({
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
  }), ['motion.mileage.lightTrucks', 'motion.mileage.footprint', 'motion.mileage.cheaperMile']),
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
  /*
   * M5: the congestion charge (LeverKind 'charge': a price on the service, fixed when enacted; arrives with the 'charge'
   * feature, Ministry 4). It reaches every category, vans and four-by-fours included, so it holds whatever rung is open.
   * Popularity (Stockholm, design/research/restraint.md §7.2: about 36% for before the trial, a majority after, over 70%
   * by 2013): CHARGE_POP start −3 a level on the day, +1 after CHARGE_POP_YEARS of being held.
   * Side effect (London, §7.1: road space handed to buses and works, congestion back near its old level within a few
   * years while volumes stayed lower): CHARGE_SLACK roads ×0.85 a level, ramping over ten model years, unless walking
   * distance is in force (the space goes to pavements that are walked on, not to another queue).
   * Values: CHARGE_VALUES, the charge as a share of the price of a mile on the day (0.1, 0.2, 0.3; each Tighten +0.05).
   */
  {
    ...afterChair(lever({
      id: 'motion.charge', sector: 'motion', kind: 'charge',
      requires: ['charge', 'travel'], // 'travel': it acts on the roads (and the M3 lint's rule for levers that bite back)
      name: 'Congestion charge',
      blurb: 'A fee to drive into town at the busy hour, paid at the gantry by every vehicle alike.',
      catch: `The traffic thins and the road space goes to buses and works; the queues return, shorter on volume. ${DIVIDEND}`,
      values: [0.1, 0.2, 0.3], cost: 240, upkeep: 0.06, label: 'Charge {pct}% of a mile', // CHARGE_VALUES, Mandate 240
      labels: { 0: 'A charge for the centre', 1: 'A wider zone', 2: 'A charge at every ring road' },
      recycle: RECYCLE,
      recycleBlurb: { commons: 'Charge money for the Commons: the buses that took the road space, and a bench at every stop.' },
      sideEffects: {
        effects: [roads(0.85)], // CHARGE_SLACK
        rampYears: 10, decayYears: 10,
        unless: { owns: 'motion.sufficiency' },
        blurb: 'The freed road goes to buses and street works, and the queue comes back.',
        unlessLabel: 'unless walking distance is in force',
      },
    }), 'Pryce Consolidated pays it on the miles it reports.'),
    /* CHARGE_POP: the term in Confidence's target per level, on top of the price share every levy costs. `after` must
     * exceed ChairDef perPriceShare × the charge's share of the price (core findings: about +5 a level on the fixture's
     * −40 × 0.1) or the charge never turns popular: net about −7 a level on the day, about +1 ten years on. */
    popularity: { start: -3, after: 5, years: 10 }, // CHARGE_POP (start, after), CHARGE_POP_YEARS
  },
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

/* ------------------------------------------------------------------ */
/* M5: LOOPHOLES AND PLEDGES (Content.loopholes, Content.pledges;      */
/* wired by the registry: design/scratch/m5-registry-motion.md)        */
/* ------------------------------------------------------------------ */

/*
 * The mileage rule's ladder (design/m5-design.md §6.2; design/research/restraint.md §5.1). Every rung is closed by the
 * fuel duty escalator in force (core findings, decided): with the duty the price of a mile reaches every category and
 * evasion stops paying; a used rung whose duty arrives returns to 'open' and its exempt vehicle stops growing.
 *   escape    share of the rule's grip (its etaMul) lost while the rung is used.
 *   premium   Evade costs premium × a model year of Motion's income: must sit below the comply cost of a binding rule.
 *   effects   the exempt vehicle grows: satMul on it per level of the rule while used.
 *   amend     Mandate and drafting years (the vans keep coming meanwhile); the button's label.
 * Facts: light trucks got a separate, lower standard in 1975 and were defined up to 8,500 lb GVW from 1980 (restraint.md
 * §5.1 [R17]). The footprint rule: NHTSA's April 2006 rule (71 FR 17566) set light-truck targets by footprint (wheelbase
 * × track), larger vehicles getting lower targets, compulsory from model year 2011; the March 2009 rule (74 FR 14196)
 * set footprint-based targets for model year 2011 cars and light trucks (checked 20 Nov 2026; see the lane report). The
 * cards name no country and no year; "Count every vehicle under 8,500 lb" quotes the 1980 boundary.
 */
export const motionLoopholes: LoopholeDef[] = [
  {
    id: 'motion.mileage.lightTrucks', lever: 'motion.mileageRule',
    name: 'Light trucks',
    blurb: 'Vans and four-by-fours are counted separately, against an easier target.',
    app: 'motion.lightTrucks',
    escape: 0.6, // LT_ESCAPE: most of the rule's grip lost while the vans sell
    premium: 0.025, // LT_PREMIUM: a van earns a little less than a saloon (0.04 lost to comply at level 1 early on: comply ran 4–5% of a year's income)
    effects: [sat('motion', 1.25, 'motion.lightTrucks')], // LT_GROWTH a level of the rule
    amend: { mandateCost: 150, years: 5, label: 'Count every vehicle under 8,500 lb' }, // LT_AMEND
    closedBy: { owns: 'motion.duty', label: 'Closed while the fuel duty escalator is in force' },
    prop: 'vans',
  },
  {
    id: 'motion.mileage.footprint', lever: 'motion.mileageRule',
    name: 'The footprint rule',
    blurb: 'Each vehicle’s target is set by its size; the larger the car, the easier the target.',
    app: 'motion.fourByFours',
    escape: 0.5, // FP_ESCAPE
    premium: 0.02, // FP_PREMIUM
    effects: [sat('motion', 1.25, 'motion.fourByFours'), sat('motion', 1.05, 'motion.suburbs')], // FP_GROWTH
    amend: { mandateCost: 220, years: 6, label: 'A single target, whatever the size' }, // FP_AMEND
    closedBy: { owns: 'motion.duty', label: 'Closed while the fuel duty escalator is in force' },
    prop: 'fourByFours',
  },
  {
    /* The robust rung: no amendment can close it; only the duty, which keeps the price of a mile where it was. */
    id: 'motion.mileage.cheaperMile', lever: 'motion.mileageRule',
    name: 'The cheaper mile',
    blurb: 'Every class meets its target, and each mile costs less to drive.',
    escape: 0.35, // CM_ESCAPE
    premium: 0.015, // CM_PREMIUM
    effects: [sat('motion', 1.08, 'motion.suburbs'), half('motion', 1.05, 'motion.commuting')], // CM_GROWTH
    closedBy: { owns: 'motion.duty', label: 'Robust only with the fuel duty escalator in force' },
  },
];

/*
 * Six pledges for the manifesto sheet (design/m5-design.md §6.4). Content order is the default: the mildest first (an
 * ignored sheet keeps the first two offered). PLEDGE_CONF: Confidence added to the target while in force (and once at
 * the poll). Binds hold for the whole Parliament after the poll.
 */
const motionOpen: PledgeDef['when'] = { stat: 'openFor', sector: 'motion', op: '>=', value: 0 };
export const motionPledges: PledgeDef[] = [
  {
    id: 'pledge.motion.roads', name: 'Roads for the regions',
    blurb: 'A bypass for every market town that has asked for one.',
    confidence: 2, // binds nothing, costs the sky: more road, more traffic
    effects: [roads(1.15)], // ROADS_PLEDGE: road capacity ×1.15 while in force (the travel solve fills it)
    when: motionOpen,
  },
  {
    id: 'pledge.motion.railway', name: 'A railway for every town',
    blurb: 'The branch lines reopened, the timetable doubled, the fares held.',
    confidence: 3,
    /* Gap: no effect raises a substitution lever's flow; the railway is a cheaper commute by other means (fewer
     * commuters take the car at a given price) and a Treasury bill. RAIL_PLEDGE_HALF, RAIL_PLEDGE_TREASURY. */
    effects: [half('motion', 0.9, 'motion.commuting'), half('motion', 0.95, 'motion.schoolRun')],
    treasuryShare: 0.08,
    when: motionOpen,
  },
  {
    id: 'pledge.motion.noCharge', name: 'No charge to drive into town',
    blurb: 'The roads were paid for once already.',
    confidence: 3,
    binds: { leverKind: 'charge', sector: 'motion', max: 0 },
    when: { all: [{ feature: 'charge' }, motionOpen] },
  },
  {
    id: 'pledge.motion.oneStandard', name: 'One standard, and no stricter',
    blurb: 'The motor trade is entitled to know where it stands.',
    confidence: 3,
    binds: { lever: 'motion.mileageRule', max: 1 },
    when: { all: [{ feature: 'loopholes' }, motionOpen] },
  },
  {
    id: 'pledge.motion.noRationing', name: 'No rationing at the pump',
    blurb: 'Fill her up, and never mind the coupons.',
    confidence: 3,
    binds: { lever: 'motion.cap', max: 0 },
    when: motionOpen,
  },
  {
    id: 'pledge.motion.noNewTaxes', name: 'No new taxes on motoring',
    blurb: 'Not a penny more on a gallon of petrol, this Parliament or the next.',
    confidence: 4, atPoll: 5, // the most popular promise, and the costliest: it holds the duty that closes the ladder
    binds: { lever: 'motion.duty', max: 0 },
    when: motionOpen,
  },
];

export const motion: SectorContent = {
  def: sector, upgrades: motionUpgrades, levers: motionLevers, headlines: motionHeadlines,
};
