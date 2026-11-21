/**
 * Plenty (on screen an Industry; M5): its SectorDef and applications, upgrades, levers, loophole rungs, pledges and its
 * own headlines. Content is data (see README.md): every number and word here is read by the core and the UI; no rules.
 *
 * Food, groundwater and nitrogen, 1909–2000: the first Industry the player never runs (design/m5-design.md §§6.6, 6.7,
 * 7.3; contract notes §§5–7). It opens in Ministry 3, mid-run, under Pryce. Its mechanic is the hidden flow: part of
 * every acre-foot pumped on to a field soaks back to the aquifer (the return share). The farmer pays for water APPLIED
 * (pumping); the aquifer loses water CONSUMED, applied × (1 − return share). The irrigation cards raise crop per drop and
 * lower the return share, so applied falls and consumed rises, and the Ministry's drip subsidy brings them forward: the
 * government's own rebound (Grafton et al. 2018, Science 361: 748–750; Pfeiffer & Lin 2014, JEEM 67(2): 189–208).
 *
 * Every number is a first setting for the balance lane, with what it is meant to do beside it. Measurements are in
 * design/scratch/m5-plenty-progress.md (scratch content: design/scratch/m5-plenty/). Tune first: SUBSIDY (the level-2
 * value that makes Pryce buy drip), DRIP_COST and DRIP_RETURN (criterion 15), N_INTENSITY (the first Green Tide under
 * abstain) and RESERVE (how long the aquifer lasts).
 *
 * Exports beyond the SectorContent (the registry lane adds them; design/scratch/m5-registry-plenty.md):
 * PLENTY_LOOPHOLES (Content.loopholes) and PLENTY_PLEDGES (Content.pledges).
 */
import type { Cond, DividendDef, HeadlineKey, LeverDef, LeverLevelDef, LoopholeDef, PledgeDef, SectorDef, UpgradeDef } from '../../types';
import { eta, capCost, sat, half, absorb, fork, sig2, withStages, decadeSequence, RECYCLE, CAP_LABEL, CAP_VALUES, DIVIDEND, DUTY_VALUES, DUTY_LABEL, SUFF_VALUES, SUFF_LABEL, SHARE_VALUES } from '../helpers';
import type { SectorContent } from '../helpers';

/* ------------------------------------------------------------------ */
/* PLENTY: the numbers' intent (balance knobs)                         */
/* ------------------------------------------------------------------ */

/** The return share before any irrigation card: half of what is pumped soaks back (flood and furrow; design §7.3). */
const RETURN_SHARE = 0.5;
/** The return share never falls below this, whatever the cards: some water always soaks back. */
const RETURN_FLOOR = 0.08;
/** Each irrigation card's returnShareMul (multiplicative): pivot, dropped nozzles, drip, precision. 0.5 → 0.425 → 0.34
 *  → 0.136 → 0.122. Drip is the big step: it keeps two fifths of what soaked back (Grafton 2018: "reducing return
 *  flows"). With the main crop saturated, drip's ×1.4 crop per drop cuts water applied and its return share raises
 *  water consumed (criterion 15; the findings: in the elastic regime applied barely falls). */
const PIVOT_RETURN = 0.85;
const NOZZLE_RETURN = 0.8;
const DRIP_RETURN = 0.4;
const PRECISION_RETURN = 0.9;
/** Drip's cost: no Pryce buys it unsubsidised (payback about 280 s ten minutes after Plenty opens, against limits of
 *  100 to 200 s: chair.ts RivalDef.policy) and every one takes it within a model year or two of the subsidy at level 2
 *  (he pays 35%: about 98 s). M5 balance (the owner's item 4): 350,000, was 400,000, at which the hastiest Pryce took
 *  only the nozzles at level 2 (drip 111 s against his 100 s; design/scratch/m5-balance/plenty-*.txt). */
const DRIP_COST = 350_000;
/** The subsidy's levels: the Treasury's share of the targets' cost. Level 1 (45%) brings dropped nozzles inside the
 *  default Pryce's limit (payback 207 s → 114 s); level 2 (65%) brings drip too. Measured 600 s after enactment, against
 *  no subsidy: level 1 applied −5%, consumed +10%; level 2 applied −13%, consumed +30%. */
const SUBSIDY = [0.45, 0.65];
/** The aquifer (acre-feet; SectorDef.reserve) and the pumping-cost exponent (p_r = p0 × (Q0 / Q)^alpha): the water
 *  table falls, the lift lengthens, pumping costs more. Unopposed, 17% of it is gone 73 minutes after Plenty opens; with
 *  the subsidy faster. Exhaustion ends the run, so it must not come inside a Ministry an abstainer can survive. */
const RESERVE = 60_000_000;
const ALPHA = 0.5;
/** Nitrate per calorie (pressureSource 'service') and its washing out per second: the first Green Tide 12–30 minutes after
 *  Plenty opens under abstain (measured 14.7); unopposed it plateaus at about 53 (no second crisis, no collapse), so the
 *  later crises are the subsidy's and the dated uses'. The slow washing out (1/0.0015 s, about 11 minutes) is what puts
 *  the first crisis a quarter of an hour after the growth. */
const N_INTENSITY = 0.0000075;
const N_ABSORPTION = 0.0015;
/** Air freight and biofuels are dated on Plenty's own clock, not the run's (the run's calendar is past 2010 by the time
 *  Plenty opens in mid-Ministry): 1909 + openFor × 0.05 years. Air freight from the late 1960s, biofuels from 2000. */
const AIR_FREIGHT_AT = (1968 - 1909) / 0.05; // 1,180 s after opening
const BIOFUELS_AT = (2000 - 1909) / 0.05;     // 1,820 s after opening

/* ------------------------------------------------------------------ */
/* PLENTY: the Industry                                                */
/* ------------------------------------------------------------------ */

const sector: SectorDef = {
  id: 'plenty',
  name: 'Plenty',
  years: '1909–2000',
  firstYear: 1909,
  tagline: 'Bread is cheap, the wells are deep, and every year they are a little deeper.',
  service: { name: 'Calories', unit: 'kcal' },
  resource: { name: 'Groundwater', unit: 'acre-feet', unitSingular: 'acre-foot' },
  pressure: { name: 'Nitrate', crisisName: 'The Green Tide' },
  accent: 'seed',

  /* Prices. p_s = p_r / η + c. Water is about three fifths of the opening price (p_r 1 against c 0.65), so crop per drop
   * moves the price of food a great deal (the farmer's cost follows water applied: design §7.3). */
  basePrice: 1,
  capCost: 0.65,
  margin: 0.2,
  baseEta: 1,
  autoEtaRate: 0,

  resourceKind: 'stock',
  reserve: RESERVE,
  alpha: ALPHA,

  /* Nitrate follows output (the fertiliser goes on with the crop), not the water (the contract offers no pressure fed by
   * applied water; SectorDef.hiddenFlow). The water's cost is the aquifer itself: its price and its life. */
  pressureSource: 'service',
  pressureIntensity: N_INTENSITY,
  absorption: N_ABSORPTION,
  collapseAt: 100,
  crisisAt: [0.4, 0.7, 0.9],
  pressureWellbeingCost: 10,
  pressureUpkeep: 0,

  /* Food is a large share of wellbeing, and saturates: the first loaf matters more than the fourth. */
  wellbeingWeight: 7,
  wellbeingScale: 6_400,

  hiddenFlow: { returnShare: RETURN_SHARE, floor: RETURN_FLOOR },

  /*
   * Clear water: nitrate at or below 35% of collapse (floor = ceiling, as Fishing's override), below the first Green Tide
   * at 40%, whatever the day the line was drawn. Nitrate follows calories, and bread is saturated: the global rule (a
   * share of the nitrate on the day the line was drawn, usually near nothing at Plenty's opening) asked for a country
   * that had stopped eating. Measured: a steward holding the water line with the fertiliser duty sits at about 34;
   * abstaining plateaus at about 53.
   */
  steady: {
    clearBelow: 0.4,
    /* The water line falls no lower than 80% of the day it was drawn (global 50%): bread is saturated and food is
     * inelastic, so a line at half the drawn use held a cap at its full leak for ever and no decade counted. The aquifer
     * needs the use held, and the return share defended, more than it needs the harvest halved. */
    budgetFloor: 0.8,
    clearFloor: 0.35,
    clearCeiling: 0.35,
    /* Plenty's own two pairs (PLENTY_DIVIDENDS, below; the registry adds them to dividends.ts), option 0 the modest one. */
    decadeChoices: decadeSequence([
      ['div.plenty.fallowYear', 'div.plenty.newBorehole'],
      ['div.plenty.waterBailiff', 'div.plenty.harvestFestival'],
    ]),
  },

  /*
   * Settlement from the Chair: a cap on water consumed held with the nitrate clear. Standing while settled: a point of
   * wellbeing (the wells hold) and Mandate a little easier. Defence as Motion's.
   */
  settle: {
    dividend: [{ type: 'wellbeingAdd', value: 1 }, { type: 'mandateRateMul', value: 1.05 }],
    upkeepPerSpill: 0.3,
    freeExcess: 0.05,
    blurb: 'The Board counts what the fields use up, not what the pumps lift. Mrs Okonedo reads the figures, and nods.',
    /* settled on the right gauge: the cap on water consumed in force when the settlement is made (design §6.2). M5
     * balance: and the charge on water consumed (design §4: "holding Plenty's consumption with the charge on the right
     * gauge"; the charge's Ministry, 5): with the cap alone the human-like bot settled Plenty fifty minutes after it
     * opened in Ministry 3 and the Treaty came at hour 22.8 (design/scratch/m5-balance/c3-humanGov.txt). */
    requires: { all: [{ owns: 'plenty.consumptionCap' }, { owns: 'plenty.chargeConsumed' }], label: 'A cap and a charge on water consumed in force' },
  },

  /*
   * Opens only in a Ministry (office taken), from the third (design §8: Ministry 3's mid-run arrival), 25 minutes into
   * the run (the mid-run window; Motion opens a minute in, so nothing else opens within five minutes of it). From the
   * fourth Ministry on, five minutes in: it has been met, and the Reckoning's own arrival is five minutes away. The
   * Treasury (Ministry 2) comes first: the subsidy is paid from it.
   */
  unlock: {
    /* office is taken after the Act I ending (nine or more Reckonings); 3 keeps the M3 rule that a lever that bites back
     * never meets a runs-1–2 player */
    minReckonings: 3,
    after: ['motion'],
    when: {
      all: [
        { flag: 'office', label: 'Office taken' },
        { stat: 'ministries', op: '>=', value: 3, label: 'The third Ministry' },
        {
          any: [
            { stat: 'time', op: '>=', value: 1_500 },
            { all: [{ stat: 'ministries', op: '>=', value: 4 }, { stat: 'time', op: '>=', value: 300 }] },
          ],
          label: 'Twenty-five minutes into the Ministry',
        },
      ],
    },
  },

  mechanic: {
    name: 'The hidden flow',
    rebound: 'Hidden flow',
    blurb: 'Water applied is what the farmer pays for. Water consumed is what the aquifer loses. They are not the same.',
  },

  /*
   * Saturations are for population 1 (× N). Regimes (AppDerived.regime: elastic while p_s is above the half price):
   * bread is saturated from the start (cheaper bread is not eaten twice), so crop per drop spares water there; fertilised
   * fields and meat are elastic at the opening price (about 1.65) and turn saturated as the price falls through 1.4 and
   * 0.95 during a Ministry, so the player sees a use cross over; the late uses stay elastic.
   */
  applications: [
    {
      id: 'plenty.bread', name: 'Bread grain', icon: 'wheat',
      blurb: 'Wheat for the loaf. Everyone eats some, and nobody eats four times as much because it is cheap.',
      halfPrice: 3, saturation: 3_200, steepness: 2.5, visibleBelow: Infinity, foundCost: 0,
    },
    {
      id: 'plenty.fertilised', name: 'Fertilised fields', icon: 'sack',
      blurb: 'Sugar beet, potatoes and oilseed on land that would not have grown them without the sack.',
      halfPrice: 1.4, saturation: 3_000, steepness: 2.4, visibleBelow: Infinity, foundCost: 30_000,
    },
    {
      id: 'plenty.meat', name: 'Meat & dairy', icon: 'cow',
      blurb: 'Grain through a cow. A great many calories go in for every one that comes out.',
      halfPrice: 1.2, saturation: 6_000, steepness: 2.2, visibleBelow: 1.6, foundCost: 80_000,
    },
    {
      id: 'plenty.orchards', name: 'Irrigated orchards', icon: 'orchard',
      blurb: 'Almonds, citrus and grapes on land that was scrub: thirsty trees, planted where the water was cheap.',
      halfPrice: 0.7, saturation: 4_000, steepness: 2.6, visibleBelow: 1.3, foundCost: 160_000,
    },
    {
      id: 'plenty.airFreight', name: 'Air-freighted produce', icon: 'plane',
      blurb: 'Green beans in January, flown in overnight. The winter has been abolished, at a price.',
      /* Registry lane (core follow-up: ApplicationDef.when is now enforced): the intended price gate 0.95 restored; 0.6 was a
       * stand-in that kept the use shut while `when` was ignored. */
      halfPrice: 0.6, saturation: 6_000, steepness: 2.8, visibleBelow: 0.95, foundCost: 40_000,
      when: { stat: 'openFor', sector: 'plenty', op: '>=', value: AIR_FREIGHT_AT, label: 'The late 1960s on the farms' },
    },
    {
      id: 'plenty.biofuels', name: 'Biofuels', icon: 'pump',
      blurb: 'Grain distilled into motor spirit. The field now feeds the car as well as the table.',
      /* Registry lane: the intended gate 0.85 restored (0.5 was the stand-in; see air freight). */
      halfPrice: 0.5, saturation: 14_000, steepness: 3, visibleBelow: 0.85, foundCost: 80_000,
      when: { stat: 'openFor', sector: 'plenty', op: '>=', value: BIOFUELS_AT, label: 'The year 2000 on the farms' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* UPGRADES (Pryce's order book: the player never buys one)            */
/* ------------------------------------------------------------------ */

const ret = (value: number) => ({ type: 'returnShareMul' as const, sector: 'plenty', value });

/*
 * Efficiency is calories per acre-foot applied (η). Eight cards, ×3.6 in all, a chain in the design's order with dropped
 * nozzles between the pivot and drip. Four are irrigation cards: they lower the return share as well (the hidden flow).
 * Dwarf wheat raises crop per drop with no effect on the return share: on saturated bread it spares water honestly.
 * Dates checked: Haber–Bosch, the Oppau plant 1913 (design/research/sectors.md §1.1); the centre pivot, Zybach's
 * patent US 2,604,359, granted 22 July 1952 (National Inventors Hall of Fame); hybrid maize in the Corn Belt in the
 * 1930s; semi-dwarf wheat from Mexico (Borlaug, from 1944) to the 1960s (sectors.md §1.1); drip, Blass's emitters sold in
 * the early 1960s (no single year printed); precision farming, satellite positioning on the combine in the 1990s.
 * Costs are set on Pryce's payback (cost ÷ the running cost saved, limit 150 s at the default profile): the opening cards
 * pay back inside a minute or two and go in the first seven minutes; dwarf wheat and the pumps just inside; nozzles
 * and drip outside it unless subsidised; precision far outside (a late card for a later balance pass).
 */
/* Two lines from the tractor: the seed (hybrid maize, dwarf wheat) and the water (pivot, then nozzles or drip, each needing
 * only the pivot, so a subsidy can bring drip forward without waiting on the seed); precision farming needs both. */
const REQUIRES: Record<string, string[] | undefined> = {
  'plenty.tractors': ['plenty.haberBosch'], 'plenty.hybridMaize': ['plenty.tractors'], 'plenty.centrePivot': ['plenty.tractors'],
  'plenty.dwarfWheat': ['plenty.hybridMaize'], 'plenty.droppedNozzles': ['plenty.centrePivot'], 'plenty.drip': ['plenty.centrePivot'],
  'plenty.precision': ['plenty.drip', 'plenty.dwarfWheat'],
};
const chainCards: UpgradeDef[] = [
  {
    id: 'plenty.haberBosch', name: 'Haber–Bosch nitrogen', cost: 40_000, effects: [eta('plenty', 1.3)],
    blurb: 'Oppau, 1913: ammonia from the air. The fields no longer wait for guano ships or for clover.',
  },
  {
    id: 'plenty.tractors', name: 'Tractors', cost: 70_000, effects: [eta('plenty', 1.15)],
    blurb: 'The horses go, and the acres that fed them grow food. One man ploughs what a team did.',
  },
  {
    id: 'plenty.hybridMaize', name: 'Hybrid seed', cost: 100_000, effects: [eta('plenty', 1.2)],
    blurb: 'The 1930s: hybrid seed bought new each spring from the merchant, and a fuller cob on every stalk.',
  },
  {
    id: 'plenty.centrePivot', name: 'Centre pivot', cost: 90_000, effects: [eta('plenty', 1.25), ret(PIVOT_RETURN)],
    blurb: 'Patented 1952: a sprinkler arm that walks round a well. The dry upland turns green in circles.',
  },
  {
    id: 'plenty.dwarfWheat', name: 'Dwarf wheat', cost: 130_000, effects: [eta('plenty', 1.2)],
    blurb: 'Short, stiff straw that holds a heavy ear without falling over. More grain from every watering.',
  },
  {
    id: 'plenty.droppedNozzles', name: 'Dropped nozzles', cost: 110_000, effects: [eta('plenty', 1.1), ret(NOZZLE_RETURN)],
    blurb: 'The sprinklers hung low over the crop, so less is lost to the wind. Less soaks back, too.',
  },
  {
    id: 'plenty.drip', name: 'Drip irrigation', cost: DRIP_COST, effects: [eta('plenty', 1.4), ret(DRIP_RETURN)],
    blurb: 'A tube, a hole and a drop at the root of every plant. Nothing runs off, and nothing soaks back.',
  },
  {
    id: 'plenty.precision', name: 'Precision farming', cost: 500_000, effects: [eta('plenty', 1.1), ret(PRECISION_RETURN)],
    blurb: 'The 1990s: a satellite tells the combine where the yield is, field by field, yard by yard.',
  },
].map((c) => ({ ...c, sector: 'plenty', kind: 'efficiency' as const, requires: REQUIRES[c.id] }));

const plentyUpgrades: UpgradeDef[] = withStages([
  ...chainCards,

  /* Capital: the cost of farming (c). Combines and electric pumps cheapen every calorie. */
  {
    id: 'plenty.combine', sector: 'plenty', kind: 'capital', name: 'Combine harvesters',
    blurb: 'Reaping, threshing and winnowing in one machine. The harvest takes a week, not a month.',
    cost: 80_000, requires: ['plenty.tractors'], effects: [capCost('plenty', 0.8)], // c × 0.8
  },
  {
    id: 'plenty.electricPumps', sector: 'plenty', kind: 'capital', name: 'Electric pumps',
    blurb: 'The farms put on the grid, and a pump in every borehole that runs all night for pennies.',
    cost: 130_000, requires: ['plenty.centrePivot'], effects: [capCost('plenty', 0.85), sat('plenty', 1.1, 'plenty.orchards')],
  },
  {
    /*
     * The growth tail (design/m5-core-findings.md: Pryce needs a repeatable demand card in each chair Industry, or he
     * saturates and causes no crisis). Demand × 1.15 a level on the grain and the herd, cost × 1.7 a level (the
     * findings' 1.15/1.7 pairing gave a crisis at 25 minutes on the fixture; × 1.3 against 1.25 collapsed it).
     */
    id: 'plenty.exportContract', sector: 'plenty', kind: 'capital', name: 'Another export contract',
    blurb: 'Grain sold abroad on a long contract. The farms are paid to grow more than the country eats.',
    cost: 15_000, repeatable: true, costGrowth: 1.45, maxLevel: 12,
    effects: [sat('plenty', 1.1, 'plenty.bread'), sat('plenty', 1.1, 'plenty.meat'), sat('plenty', 1.1, 'plenty.fertilised')],
  },

  /* Fork 1: the herd. Feedlots (the larger demand: Pryce takes it when his volume reading is 0.5 or more) or mixed
   * farming (dung back on the land: crop per drop up a little, the herd a little smaller). */
  ...fork(
    {
      id: 'plenty.feedlots', sector: 'plenty', kind: 'capital', name: 'Feedlots',
      blurb: 'Ten thousand cattle in a yard, fed grain by the lorryload. Beef is cheap and the yard smells.',
      cost: 140_000, requires: ['plenty.hybridMaize'],
      effects: [sat('plenty', 1.35, 'plenty.meat'), half('plenty', 1.1, 'plenty.meat')],
    },
    {
      id: 'plenty.mixedFarming', sector: 'plenty', kind: 'efficiency', name: 'Mixed farming',
      blurb: 'Cattle on the stubble, dung on the fields, a rotation with clover. Slower, and it keeps the soil.',
      cost: 140_000, requires: ['plenty.hybridMaize'],
      effects: [eta('plenty', 1.1), sat('plenty', 0.95, 'plenty.meat')],
    },
  ),

  /* Fork 2: what is planted. Alfalfa for the dairies (thirsty, and the larger demand: Pfeiffer & Lin's Kansas farmers
   * moved to thirstier crops) or sorghum (drought-hardy: more crop per drop). */
  ...fork(
    {
      id: 'plenty.alfalfa', sector: 'plenty', kind: 'capital', name: 'Alfalfa for the dairies',
      blurb: 'A thirsty hay that sells well. Where the pivot turns, the alfalfa follows.',
      cost: 220_000, requires: ['plenty.centrePivot'],
      effects: [sat('plenty', 1.25, 'plenty.meat'), sat('plenty', 1.15, 'plenty.orchards')],
    },
    {
      id: 'plenty.sorghum', sector: 'plenty', kind: 'efficiency', name: 'Sorghum',
      blurb: 'A grain from dry country that will grow on half the watering. The cattle eat it, without complaint.',
      cost: 220_000, requires: ['plenty.centrePivot'],
      effects: [eta('plenty', 1.12)],
    },
  ),
], {
  'plenty.tractors': [1, 'Tractor and plough'],
  'plenty.centrePivot': [2, 'The centre pivot'],
  'plenty.drip': [3, 'Drip lines'],
});

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

/** Authored levels with Mandate × costStep and upkeep × upkeepStep a level (fishing.ts's helper). */
function levels(values: number[], cost: number, upkeep: number, labels: string[], costStep = 3, upkeepStep = 2.5): LeverLevelDef[] {
  return values.map((value, i) => ({
    mandateCost: sig2(cost * costStep ** i),
    mandateUpkeep: Math.round(upkeep * upkeepStep ** i * 1000) / 1000,
    value,
    label: labels[i],
  }));
}
/* Food is inelastic (bread is saturated), so a cap's permit price climbs high before demand gives: at the helpers'
 * CAP_LEAK (3–5 × the water price) a Plenty cap leaked its full 25% and never held a line. Leak from 6, 8, 10 ×. */
const PLENTY_LEAK = [6, 8, 10];
const capLevels = (cost: number, upkeep: number, first: string): LeverLevelDef[] =>
  levels(CAP_VALUES, cost, upkeep, [first, 'Cap at 95% of the budget', 'Cap at 90% of the budget']).map((l, i) => ({ ...l, value2: PLENTY_LEAK[i] }));

/** The Water Resources Board: the Institution whose accounts can measure water consumed (prestige lane: inst.waterBoard). */
const WATER_BOARD = 'inst.waterBoard';

/* Mandate costs beside Motion's (180–280). */
const plentyLevers: LeverDef[] = [
  /*
   * The abstraction licence: a cap on water APPLIED (basis 'applied': the meter is on the pump). It holds the pumping;
   * consumed water can still rise as the return share falls (criterion 15). Its ladder: unlicensed wells (amendable),
   * then the robust rung, closed only by a cap on water consumed.
   */
  {
    id: 'plenty.licence', sector: 'plenty', kind: 'cap', basis: 'applied',
    requires: ['budget'],
    name: 'Abstraction licence',
    blurb: 'A licence for every pump, and a ceiling on the acre-feet it may lift, falling with the line.',
    catch: 'It counts what the pumps lift. What the fields use up, it does not count.',
    catchAfter: { moreLevers: DIVIDEND, chair: 'Pryce Consolidated will meter the pumps it reports.' },
    levels: capLevels(220, 0.1, 'Hold the pumps to the line'),
    repeat: { valueStep: -0.05, costGrowth: 1.45, upkeepGrowth: 1.3, maxSteps: 10, label: CAP_LABEL },
    recycle: RECYCLE,
    ladder: ['plenty.licence.unlicensedWells', 'plenty.licence.rightGauge'],
  },
  /*
   * The consumption cap: a cap on water CONSUMED (the default basis, R). Needs the Water Resources Board's accounts.
   * It holds both gauges: every acre-foot the return share no longer gives back counts against it.
   */
  {
    id: 'plenty.consumptionCap', sector: 'plenty', kind: 'cap', basis: 'consumed',
    requires: ['budget', WATER_BOARD],
    name: 'Consumption cap',
    blurb: 'A ceiling on the water the fields use up, from the Board’s accounts of what never comes back.',
    catch: 'Dear to measure, unpopular to enforce, and the only figure the aquifer reads.',
    catchAfter: { moreLevers: DIVIDEND, chair: 'Pryce Consolidated will account for the fields it reports.' },
    levels: capLevels(280, 0.14, 'Hold the use to the line'),
    repeat: { valueStep: -0.05, costGrowth: 1.45, upkeepGrowth: 1.3, maxSteps: 10, label: CAP_LABEL },
    recycle: RECYCLE,
  },
  /*
   * The drip subsidy (M5 kind 'subsidy'): the Treasury pays SUBSIDY of dropped nozzles and drip when Pryce buys them,
   * so he buys them sooner (criterion 15). It bites back twice: by construction (the hidden flow) and through its side
   * effect, the thirstier crops the watered fields are turned to (Pfeiffer & Lin 2014), unless a cap on water consumed
   * is in force: × 1.12 a level on the orchards and × 1.08 on the herd at full bite, ramping over 10 model years.
   */
  {
    id: 'plenty.dripSubsidy', sector: 'plenty', kind: 'subsidy', targets: ['plenty.droppedNozzles', 'plenty.drip'],
    name: 'Drip subsidy',
    blurb: 'The Treasury pays part of every efficient sprinkler and drip line. Water applied falls at once.',
    catch: 'Every field uses less water. There are more fields.',
    levels: levels(SUBSIDY, 120, 0.03, ['Pay 45% of the kit', 'Pay 65% of the kit']),
    repeat: { valueStep: 0.1, costGrowth: 1.6, upkeepGrowth: 1.35, maxSteps: 2, label: 'Pay {pct}% of the kit' },
    sideEffects: {
      effects: [sat('plenty', 1.12, 'plenty.orchards'), sat('plenty', 1.08, 'plenty.meat')],
      rampYears: 10, decayYears: 20,
      /* the crops follow the kit: nothing to bite with until Pryce has bought a subsidised card */
      unless: { any: [{ owns: 'plenty.consumptionCap' }, { not: { any: [{ owns: 'plenty.droppedNozzles' }, { owns: 'plenty.drip' }] } }] },
      blurb: 'Thirstier crops go in where the drip lines run.',
      unlessLabel: 'unless a cap on water consumed is in force',
    },
  },
  /* Diet: sufficiency (appetite for the herd's calories eased, slowly). */
  {
    id: 'plenty.diet', sector: 'plenty', kind: 'sufficiency',
    name: 'The national diet',
    blurb: 'Posters, school dinners and a ministry leaflet: more bread and greens, less of the Sunday joint.',
    catch: 'Slow, and the farmers’ unions call it interference. The butchers say so too.',
    levels: levels(SUFF_VALUES, 200, 0.05, SUFF_VALUES.map((v) => `Settle at ${Math.round(v * 100)}% of appetite`)).map((l, i) => ({ ...l, value2: [0.0015, 0.0025, 0.0035][i] })),
    repeat: { valueStep: -0.05, costGrowth: 1.5, upkeepGrowth: 1.3, maxSteps: 6, label: SUFF_LABEL },
  },
  /* Dryland farming: substitution (a share of the calories from rain-fed fields: no groundwater; dearer, capped). */
  {
    id: 'plenty.dryland', sector: 'plenty', kind: 'substitution',
    name: 'Dryland farming',
    blurb: 'Rain-fed wheat, fallow to hold the moisture, and no pump at all. A smaller harvest, every year.',
    catch: 'Dearer bread, and in a dry decade very little of it.',
    levels: levels(SHARE_VALUES, 240, 0.1, SHARE_VALUES.map((v) => `Grow ${Math.round(v * 100)}% on rain`)).map((l, i) => ({ ...l, value2: [1_500, 4_000, 9_000][i] })),
    repeat: { valueStep: 0.05, costGrowth: 1.5, upkeepGrowth: 1.35, maxSteps: 8, label: 'Grow {pct}% on rain' },
  },
  /*
   * The water charge, two levers (the M5 kind 'charge' takes its basis per lever, not per level, so the choice of gauge is
   * a choice of lever; design §6.7): at the pump (cheap to meter, popular sooner) or on water consumed (the Board's
   * accounts). Neither changes what Pryce buys (his payback reads the price
   * before the charge), so under the subsidy a charge prices the rebound and does not stop it; the caps hold a gauge.
   * Popularity (LeverDef.popularity, per level): −3 on the day, +5 after ten model years (findings: `after` must exceed
   * perPriceShare × the charge's share of the price, about +5 a level, for the term to turn with Treasury recycling).
   */
  {
    id: 'plenty.chargeApplied', sector: 'plenty', kind: 'charge', basis: 'applied', requires: ['charge'],
    name: 'Charge at the pump',
    blurb: 'A rate on every acre-foot lifted, read off the meter. Fixed when enacted.',
    catch: 'Cheap to collect. It asks the farmer to apply less, not to use up less.',
    levels: levels([0.2, 0.4, 0.7], 200, 0.06, ['A fifth of the water’s price', 'Two fifths of its price', 'Seven tenths of its price']),
    repeat: { valueStep: 0.15, costGrowth: 1.6, upkeepGrowth: 1.35, maxSteps: 2, label: 'Charge at {pct}% of its price' },
    recycle: RECYCLE,
    catchAfter: { chair: 'Pryce Consolidated will pay it on the acre-feet it reports.' },
    popularity: { start: -3, after: 5, years: 10 },
  },
  {
    id: 'plenty.chargeConsumed', sector: 'plenty', kind: 'charge', basis: 'consumed', requires: ['charge', WATER_BOARD],
    name: 'Charge on water used up',
    blurb: 'A rate on the water that never comes back, from the Board’s accounts. Fixed when enacted.',
    catch: 'Dear to measure, and the farmers dispute every figure. It charges the aquifer’s loss.',
    levels: levels([0.3, 0.6, 1], 260, 0.08, ['Three tenths of its price', 'Six tenths of its price', 'The whole of its price']),
    repeat: { valueStep: 0.2, costGrowth: 1.6, upkeepGrowth: 1.35, maxSteps: 2, label: 'Charge at {pct}% of its price' },
    recycle: RECYCLE,
    catchAfter: { chair: 'Pryce Consolidated will pay it on the losses it reports.' },
    popularity: { start: -4, after: 5, years: 10 },
  },
  /* The fertiliser duty: a duty (the price held up as crop per drop rises; fewer calories, less nitrate). */
  {
    id: 'plenty.fertiliserDuty', sector: 'plenty', kind: 'duty',
    name: 'Fertiliser duty',
    blurb: 'A duty on every sack of nitrogen, rising as the sack does more. Bread costs what it did.',
    catch: 'Dearer bread, and the farmers march on the capital with their tractors.',
    catchAfter: { moreLevers: DIVIDEND, chair: 'Pryce Consolidated will pay it on the sacks it reports.' },
    levels: levels(DUTY_VALUES, 240, 0.11, DUTY_VALUES.map((v) => DUTY_LABEL.replace('{pct}', String(Math.round(v * 100))))),
    repeat: { valueStep: 0.03, costGrowth: 1.7, upkeepGrowth: 1.35, maxSteps: 3, label: DUTY_LABEL },
    recycle: RECYCLE,
  },
];

/* ------------------------------------------------------------------ */
/* LOOPHOLES (Content.loopholes): the abstraction licence's ladder      */
/* ------------------------------------------------------------------ */

/** A cap on water consumed in force closes the licence's last rung (design §6.2: robust only on the right gauge). */
const CONSUMED_CAP_IN_FORCE: Cond = { owns: 'plenty.consumptionCap', label: 'A cap on water consumed in force' };

export const PLENTY_LOOPHOLES: LoopholeDef[] = [
  /*
   * Unlicensed wells: pumping moves to boreholes nobody meters. Escape 0.35 (the licence's ceiling ÷ 0.65 while used);
   * premium 0.04 of a model year's income (cheap: a borehole is cheap). Amend: "Meter every well", five model years.
   */
  {
    id: 'plenty.licence.unlicensedWells', lever: 'plenty.licence',
    name: 'Unlicensed wells', blurb: 'Pumping moves to boreholes nobody meters',
    escape: 0.35, premium: 0.04, prop: 'borehole',
    amend: { mandateCost: 180, years: 5, label: 'Meter every well' },
  },
  /*
   * The right gauge: with every well metered, the licence still counts what is lifted, not what is used up. Pryce turns
   * the farms to the thirstiest kit and crops the licence allows: no escape on the applied figure (the licence holds
   * it), but the return share × 0.8 a level while used (times = the licence's level), so consumed water rises under a held licence. Not amendable;
   * closed only by a cap on water consumed in force (LoopholeDef.closedBy).
   */
  {
    id: 'plenty.licence.rightGauge', lever: 'plenty.licence',
    name: 'Water that never comes back', blurb: 'The licence counts what is lifted, not what is used up',
    /* premium 0.005 of a model year's income: cheaper than complying with a licence that binds (measured: at 0.02 he
     * complied and the rung was never used), so the robust rung is taken until the consumption cap closes it */
    escape: 0, premium: 0.005,
    effects: [ret(0.8)],
    closedBy: CONSUMED_CAP_IN_FORCE,
  },
];

/* ------------------------------------------------------------------ */
/* PLEDGES (Content.pledges): offered only while Plenty is open         */
/* ------------------------------------------------------------------ */

const PLENTY_OPEN: Cond = { stat: 'openFor', sector: 'plenty', op: '>', value: 0, label: 'Plenty open' };

/* Mildest first (the sheet resolves to the first two if ignored). Confidence beside Motion's pledges (2–4). */
export const PLENTY_PLEDGES: PledgeDef[] = [
  {
    /* binds nothing; the Treasury pays 5% of its income towards the promise while in force */
    id: 'plenty.pledge.dripForAll', name: 'Drip for every farm', confidence: 2, treasuryShare: 0.05, when: PLENTY_OPEN,
    blurb: 'Grants for the new irrigation kit, in every county that asks.',
  },
  {
    id: 'plenty.pledge.cheapBread', name: 'Cheap bread for every table', confidence: 3, when: PLENTY_OPEN,
    blurb: 'No new duty on the farmer’s fertiliser this Parliament.',
    binds: { lever: 'plenty.fertiliserDuty', max: 0 },
  },
  {
    id: 'plenty.pledge.waterForFarms', name: 'Water for the farms', confidence: 3, when: PLENTY_OPEN,
    blurb: 'No new limit on what a farmer may pump this Parliament.',
    binds: { lever: 'plenty.licence', max: 0 },
  },
  {
    id: 'plenty.pledge.noWaterRate', name: 'No rate on the farmer’s water', confidence: 4, when: PLENTY_OPEN,
    blurb: 'Water from the farmer’s own well stays free of charge this Parliament.',
    binds: { leverKind: 'charge', sector: 'plenty', max: 0 },
  },
];

/* ------------------------------------------------------------------ */
/* DECADE DIVIDENDS (Content.dividends; the registry appends them)      */
/* ------------------------------------------------------------------ */

/* Option 0 of each pair is the modest one (the default an unanswered offer resolves to); option 1 is the rebound arm. */
export const PLENTY_DIVIDENDS: DividendDef[] = [
  {
    id: 'div.plenty.fallowYear', name: 'A fallow year',
    blurb: 'The decade’s thrift rests a field in seven. A little less grown; the soil and the wells are glad of it.',
    effects: [sat('plenty', 0.96)], // a small standing cut in appetite (the diet's gentle cousin)
  },
  {
    id: 'div.plenty.newBorehole', name: 'A new borehole',
    blurb: 'A deeper bore on every holding, paid for out of the decade. Water is cheaper to lift, so more is lifted.',
    effects: [capCost('plenty', 0.95)], // the rebound arm: cheaper farming
  },
  {
    id: 'div.plenty.waterBailiff', name: 'A water bailiff',
    blurb: 'A man with a notebook who walks the ditches, clears the drains and reads the meters. Mrs Okonedo gives him tea.',
    effects: [absorb('plenty', 0.0002)], // the ditches cleared: nitrate washes out a little faster (absorption 0.0015 → 0.0017)
  },
  {
    id: 'div.plenty.harvestFestival', name: 'A harvest festival',
    blurb: 'Loaves in the church and a show at the county ground. The prize marrow is enormous; so is next year’s order.',
    effects: [half('plenty', 1.05, 'plenty.orchards')], // the rebound arm: produce for show, and for sale
  },
];

/* ------------------------------------------------------------------ */
/* HEADLINES (Content.sectorHeadlines.plenty): the farming page        */
/* ------------------------------------------------------------------ */

/* Working lines (the text lane may revise and extend them in place). No famine is a resource or a joke (D4). */
const plentyHeadlines: Partial<Record<HeadlineKey, string[]>> = {
  efficiency: [
    'Drip irrigation saves water on every acre; acres up',
    'More bread from every acre-foot; more acre-feet pumped than ever',
    'Yields a record at the county show; the boreholes go deeper',
    'Crop per drop doubles; the farms double with it',
    'Pivots turn on the upland; the water table turns down',
    'Water applied falls a tenth; water used up rises a fifth',
    'Farm notes: the new sprinklers lose nothing to the wind',
  ],
  sectorOpened: [
    'Pryce buys the farms; bread to be cheaper, says Sir Edmund',
    'The Ministry takes an interest in groundwater; the farmers take none',
    'Farm notes: a new well on every holding, and a deeper one next year',
  ],
  appAvailable: [
    'Cheap grain brings {app} within reach; the land agents call',
    'Farm notes: talk at the market is of {app}',
    'Pryce’s land men survey the county for {app}',
    'A prospectus for {app}; the borehole drillers subscribe first',
  ],
  appFounded: [
    'First acres planted to {app}; the pump runs through the night',
    '{app} opened up by Pryce; the well-borers have a full book',
    'Farm notes: the first harvest of {app} sold before it is in',
    'New land under {app}; the water table not consulted',
    'Bread a penny cheaper; the bakers cannot bake fast enough',
  ],
  crisis: [
    'Green tide No. {n}: the river runs the colour of pea soup',
    'Nitrate in the village tap; the Board advises patience',
    'Fish die in the estuary; Pryce blames the weather',
    'Farm notes: the ditches thick with weed, and the bathers stay away',
    'Bloom off the coast for a third week; the oyster beds closed',
  ],
  collapse: [
    'The rivers choked from source to sea; the Board closes the beaches',
    'Not a tap in the county fit to drink; bottled water by the lorryload',
    'The green tide reaches the sea wall; the resort hotels close early',
  ],
  exhausted: [
    'The last boreholes run dry; the pivots stand still in the dust',
    'The aquifer gives out; the farms go back to waiting for rain',
    'No water at any depth; the drillers pack up their rigs',
  ],
  backfire: [
    'Every field uses less water; there are more fields',
    'Water saved on every acre; the aquifer falls faster than ever',
    'Bread never cheaper; the wells never deeper',
  ],
  leverEnacted: [
    'Water bill passes; Pryce says the farms will manage, somehow',
    'New rule for the wells; the farmers say it was written in town',
    'The Ministry’s order on groundwater to take effect at harvest',
    'Measure carried; the growers’ association holds an angry supper',
  ],
  leverLapsed: [
    'Water order lapses; the pumps run the same evening',
    'Rule on the wells repealed; the borehole drillers stand drinks',
  ],
  steadySector: [
    'Fifty years and the water table has not moved; the Board is pleased',
    'The wells hold, the rivers run clear; the farm notes are short',
  ],
  budgetDrawn: [
    'A line under the aquifer: so many acre-feet, fewer each decade',
    'Water budget drawn; Pryce calls it guesswork in a good suit',
  ],
  decade: [
    'Groundwater held to budget for decade {n}; bread still cheap',
    'A decade inside the water budget; the pivots turn, more slowly',
  ],
  budgetBroken: [
    'Water budget broken; Pryce blames a dry summer',
    'More water used up than allowed; the Board will write a letter',
  ],
  reckoning: [
    'Commission on groundwater sits; the minutes run to volumes',
    'The farms’ accounts read aloud, from the first borehole on',
  ],
  biteBack: [
    'Drip lines on every holding; orchards where the wheat was',
    'Subsidised kit waters thirstier crops; the Treasury is proud of it',
    'Less water applied on the subsidised farms; the aquifer falls faster',
  ],
  clearSkies: [
    'The river runs clear past the farms; the anglers are back',
    'Nitrate in the tap below the limit; the Board takes the credit',
    'No bloom in the estuary this summer; the oyster beds reopen',
  ],
  settled: [
    'Plenty settled: the fields held to the water they use up',
    'The Board counts what never comes back, and sets the pumps to suit',
    'Water table level for a decade; the drillers find other work',
  ],
  unsettled: [
    'Water settlement lapses; every borehole in the county is deepened',
    'The farms have outgrown their agreement; the agreement goes',
    'Plenty unsettled; Pryce orders a new pivot for every quarter',
  ],
};

export const plenty: SectorContent = {
  def: sector, upgrades: plentyUpgrades, levers: plentyLevers, headlines: plentyHeadlines,
};
