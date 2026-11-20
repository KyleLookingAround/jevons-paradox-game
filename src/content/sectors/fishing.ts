/**
 * Fishing (on screen an Industry; M4): its SectorDef and applications, upgrades, levers and its own headlines.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 *
 * The Coal Age's fourth Industry and Act I's finale (design/m4-design.md §5, §2A, §6; contract notes §5–7, §15).
 * Its mechanic is the banks: a renewable stock (RenewableDef) that regrows for ever until it crosses a threshold, after
 * which a scar holds its regrowth down across Reckonings; a gauge that lies (catch per trip, (Q/K)^β, hyperstability);
 * foreign fleets that copy the home fleet's cheapness; and a survey that shows the truth, which settling requires.
 *
 * Every number below is a first setting for the balance lane, with what it is meant to do beside it. The ones to tune
 * first are REGEN and K (when the unrestrained first Fishing run crosses the threshold) and SCAR_YEARS (how long the
 * scar holds, which sets how much of the Act I ending's time Fishing carries). They were set with a toy model of
 * Fishing alone (design/scratch/m4-fishing-progress.md, "Calibration"), not with the core, which was being written at
 * the same time.
 */
import type { Cond, HeadlineKey, LeverDef, LeverLevelDef, SectorDef, UpgradeDef } from '../../types';
import {
  eta, capCost, sat, half, chain, fork, ladder, lever, sig2, withStages, decadeSequence, RECYCLE, CAP_LABEL, CAP_VALUES, CAP_LEAK,
  SUFF_VALUES, DIVIDEND,
} from '../helpers';
import type { SectorContent } from '../helpers';

/* ------------------------------------------------------------------ */
/* FISHING: the numbers' intent (balance knobs)                        */
/* ------------------------------------------------------------------ */

/**
 * K, the banks' natural size in tons (SectorDef.reserve). With REGEN it sets the most the banks can bear,
 * MSY = REGEN × K / 4. M4 balance: 60,000 (MSY 45 tons a second at REGEN 0.003). The Fishing lane's toy model gave
 * 1,200,000 (MSY 1,500), but in the real game Fishing opens at about 80 tons a second and the burning player reaches only
 * about 350 thirty minutes later, so at 1.2 M nobody's stock ever fell below 70% and the lesson never landed (107,000 at
 * REGEN 0.003, MSY 80, was tried: still no poor season within the half hour). At 60,000 the opening catch is above MSY:
 * the burning player reaches a poor season about nine minutes after opening and crosses θ about fifteen minutes in; the
 * budget player, whose line is drawn at today's landings, reaches the poor season too, and with it the Board's free
 * survey (catch per trip 0.81 against a true 0.50), and saves the banks if it reads the card.
 */
const K = 60_000;
/**
 * r, regrowth per second (RenewableDef.regen). M4 balance: 0.003/s = 0.06 per model year (the Fishing lane's 0.005
 * with K = 1.2 M). 1/r ≈ 5.5 minutes: the stock follows the catch with a lag of several minutes, so a fleet fishing at
 * 1.2 × MSY from a full bank takes about ten minutes to reach a poor season, a slope the player could see if anything
 * on the page measured it. Recovery from θ to the clear level (three quarters of K), unscarred and unfished, about
 * fourteen minutes; under the scar (× SCAR_MUL) about ninety.
 */
const REGEN = 0.003;
/** θ, the threshold as a share of K: below it regrowth collapses (design: about 0.2). The 1 − θ crisis is The Banks Fail. */
const THRESHOLD = 0.2;
/** Regrowth below θ as a share of the logistic (depensation: the remnant cannot find itself; design about 0.1). */
const COLLAPSED = 0.1;
/**
 * β of catch per trip, (Q/K)^β (Harley, Myers & Dunn 2001: β < 1, hyperstability). At 0.3 a true 30% reads 70%
 * (criterion: ≥ 65%), a true 10% reads 50%, and the free first survey's gap at a typical 20–30% stock is 0.4–0.5.
 */
const BETA = 0.3;
/** The scar's regrowth multiplier while it lasts (design about 0.15): the banks hardly regrow, whatever the quota. */
const SCAR_MUL = 0.15;
/**
 * The scar's length in model years of play with Fishing open and unsettled (20 model years a minute). The design's
 * "about 150" (50 minutes) heals inside the run that crossed, if that run goes on: Fishing opens at about minute 20 of
 * run 6, crosses at about minute 50, and `mixed` plays run 6 for about 150 minutes, leaving 90–100 minutes of open
 * play, which a 50-minute scar outlasts by nothing. Criterion 10 (the scar persists across a Reckoning and holds the
 * next run's stock at minute 20 ≤ 0.4 K) needs about 110–120 minutes after the crossing: 360 years (two hours).
 * Balance: if runs are called soon after the crossing, 150–200 is enough; this is the Act I ending's main Fishing knob.
 */
/* M4 (finish): 180 (one hour of open play; was 360). With the scarred bank reopening each run at θ, two hours of scar
 * carried a crossing through three runs at 1.7 Hindsight a minute (the empty sea's wellbeing cost pushed the town into
 * its fastest growth and wellbeing fell to 14): a lesson, then a sentence. */
const SCAR_YEARS = 180;
/** The share of K a scarred run starts (or opens) with: θ, so the next run begins on the edge (design). */
/* M4 (finish): a quarter of K, a little above θ, so that a scarred bank fished within the survey quota can be held off the
 * threshold while it heals (at θ exactly any catch put it below, where regrowth collapses). */
const START_SCARRED = 0.25;
/**
 * Foreign fleets (ForeignDef). share = min(cap, share0 × (basePs / p_s)^growth × Π foreignMul). share0 10% at opening
 * (design). growth 1.4: the share passes 15% (announceAt; the sails appear and the limits lever is meant to) when Fishing's
 * price has fallen by a quarter, about 5 minutes into ordinary play (toy: 0.16 at minute 5), and reaches about 45% at a
 * late unrestrained price (cap 0.6: above the design's "50–60% late", below the Grand Banks' 80% in 1968, which Act I
 * stays under).
 */
/* M4 (finish): room 0.5: the foreign boats also take half the surplus the home fleet leaves on the banks (G − home
 * catch, ForeignDef.room). Before, a home line held the price up and the foreign share FELL (0.16 → 0.05 under a quota),
 * so the fishery limits (which wait for 15%) almost never appeared; now restraint on a healthy bank draws the foreigners
 * in, which is the commons problem, and the reason the limits exist. */
/** M4 (finish): the decades within its line Fishing must hold in a run before it can be settled (SettleDef.requires). */
const FISHING_DECADES = 15;
const FOREIGN = { share0: 0.1, growth: 1.4, cap: 0.6, announceAt: 0.15, room: 0.5 };
/**
 * The Board's first survey (RenewableDef.firstSurvey, The Survey's moment): free, ten model years (30 seconds of play:
 * long enough to read the card and see the sink line, short enough that "No survey since {year}" follows within the
 * minute), at the first poor season or 30 minutes after Fishing opens, whichever comes first.
 */
const FIRST_SURVEY = { atCrisis: 1, afterSeconds: 1_800, years: 10, label: 'The Board’s survey' };
/**
 * Depletion P = (1 − Q/K) × collapseAt (derived; never collapses the run). Crises at 0.5 (A Poor Season: half the
 * stock gone) and 0.8 = 1 − θ (The Banks Fail: the lint and the contract want the last crisis at the threshold).
 * collapseAt 100, as Steam's, so a fraction reads the same on both gauges.
 */
const COLLAPSE_AT = 100;
const CRISIS_AT = [0.5, 1 - THRESHOLD];
/**
 * Wellbeing lost at P = collapseAt (scaled by P / collapseAt = 1 − Q/K). Steam's smoke costs 22 at collapse; the empty
 * sea costs a little less (18) because it never ends the run and, under a scar, it is held near 0.8–1.0 for two hours
 * of play across runs, where Steam's smoke never sits past 0.88 for long. At a failed bank: about −15 points.
 */
/* M4 (finish): 10 (was 18): a failed bank costs about eight points; at 18 it pushed a restrained town below the target
 * and into its fastest growth (design/scratch/m4-balance-progress.md, finishing). */
const WELLBEING_COST = 10;
/**
 * Prices. p_s = p_r / η + c. basePrice 1 at a full bank, capCost 1: half the opening price is fishing power (boats,
 * crews, coal), so the capital cards (cheaper catching) carry the main rebound, as the design asks. alpha 0.5 on catch
 * per trip: at a true 30% (reported 70%) p_r is 1.2×, so the fishing price stays ≤ 1.5× its opening value (criterion
 * 11) and the price does not warn; at the floor it is 7×, and the fleet ties up.
 */
const BASE_PRICE = 1;
const CAP_COST = 1;
const ALPHA = 0.5;

/**
 * The visibility of the fishery limits (design §5.7: the lever arrives when the foreign share passes 15%). Wired as the
 * lever's `when` (LeverDef.when, the M4 amendment; the Act lane).
 */
export const FISHERY_LIMITS_WHEN: Cond = { stat: 'foreignShare', sector: 'fishing', op: '>=', value: 0.15, label: 'Foreign boats take 15% of the catch' };

/* ------------------------------------------------------------------ */
/* FISHING: the Industry                                               */
/* ------------------------------------------------------------------ */

const sector: SectorDef = {
  id: 'fishing',
  name: 'Fishing',
  years: '1880–1914',
  firstYear: 1880,
  tagline: 'The sea is wide, the fish are many, and the trawler is new.',
  service: { name: 'Fish landed', unit: 'tons', unitSingular: 'ton' },
  resource: { name: 'Fish on the banks', unit: 'tons', unitSingular: 'ton' },
  pressure: { name: 'Empty banks', crisisName: 'A Poor Season' },
  accent: 'sea',

  basePrice: BASE_PRICE,
  capCost: CAP_COST,
  margin: 0.2,
  baseEta: 1,
  autoEtaRate: 0,

  resourceKind: 'renewable',
  reserve: K,
  alpha: ALPHA,

  pressureSource: 'depletion',
  pressureIntensity: 0, // ignored for depletion (P is derived from the stock)
  absorption: 0, // ignored for depletion
  collapseAt: COLLAPSE_AT,
  crisisAt: CRISIS_AT,
  pressureWellbeingCost: WELLBEING_COST,
  pressureUpkeep: 0,

  /* A cheap supper is a modest share of wellbeing: at population 2 and an unrestrained late catch (D ≈ 7,000) about
   * 10 points, near Light's; at opening less than one. */
  wellbeingWeight: 4,
  wellbeingScale: 300,

  /* §6: a cheap supper leaves money for the gas (small, beside Light's 0.4 into Steam). Trawlers and fish trains burn
   * Steam's coal: each ton landed draws 0.05 hp of Steam's power, a price-proof floor (about 350 hp late in a boom run,
   * a few per cent of Steam's demand then; it is what the full account hands from Steam to Fishing). */
  spill: { to: 'light', rate: 0.1 },
  drawsOn: { sector: 'steam', perService: 0.05 },

  /*
   * Decade dividends: Fishing's own two pairs, interleaved with the global sequence (decadeSequence). The four dividends
   * are defined in design/scratch/m4-registry-fishing.md for the Act lane to add to dividends.ts (not this lane's
   * file); option 0 of each pair is the modest one. Clear skies use the global rule: depletion halved from the day the
   * line was drawn and not rising, i.e. the stock has regrown (contract: SectorDef.pressureSource 'depletion').
   */
  steady: {
    /* M4 balance: clear at a stock of three quarters of K or more, whatever the day the line was drawn (floor =
     * ceiling = 25% of collapse). With the global 1% floor a line drawn on a nearly full bank asked for a stock of 99%
     * (a catch of almost nothing) before it counted clear; drawn after a poor season, the ceiling (25%) already held. */
    clearFloor: 0.25,
    clearCeiling: 0.25,
    decadeChoices: decadeSequence([
      ['div.fishing.closedMonth', 'div.fishing.newSlip'],
      ['div.fishing.boardGrant', 'div.fishing.pennySupper'],
    ]),
  },

  /*
   * Opens in run 6 (≥ 5 Reckonings) with Settlement arrived, once Steam has the trawlers' engines and the fish train's
   * lines (High-pressure steam owned, Railways founded), at the run's mid-run window (minute 20; design §9: an Industry opening is
   * the run's mid-run arrival). `after` defaults to the Industry before it in sectorOrder (Iron). Never a price gate.
   * The Act lane may tighten the window with its features rule (e.g. "no other arrival within five minutes").
   */
  unlock: {
    minReckonings: 5,
    when: {
      all: [
        { feature: 'settlement', label: 'Settlement has come to the House' },
        /* M4 balance: high-pressure steam (the engine a steam trawler needs), not Steamships founded: a restraint player
         * under a held line seldom founds Steamships, so Fishing opened only in some runs (the Act lane's measurement);
         * the compound engine was tried and held the opening to minute 40 or so for the restraint players. */
        { owns: 'steam.highPressure', label: 'Own High-pressure steam' },
        { owns: 'steam.railways', label: 'Found Railways in Steam' },
        { stat: 'time', op: '>=', value: 1_200, label: 'Twenty minutes into the run' },
      ],
    },
  },

  /*
   * Settlement: only while surveyed (settle.requires; the Act I ending needs it, so the truth costs a seat, a lever or a
   * letter in every run). Standing while settled: a point and a half of wellbeing (the ports in work every season) and
   * Mandate a little easier (a settlement the House can explain). Defence as Steam's.
   */
  settle: {
    dividend: [{ type: 'wellbeingAdd', value: 1.5 }, { type: 'mandateRateMul', value: 1.05 }],
    upkeepPerSpill: 0.2,
    freeExcess: 0.05,
    blurb: 'The Board sets the catch at what the banks will bear. Skipper Tench complains, and goes out on Monday.',
    /* M4 (finish): and the catch held within its line for fifteen decades this run (150 model years, fifty minutes of
     * play, through the foreign boats' return and the limits' bite): the bank is the Act's last settlement and its gate,
     * paced by holding it, not by a clock (FISHING_DECADES). */
    requires: {
      all: [
        { stat: 'surveyed', sector: 'fishing', op: '>=', value: 1, label: 'The stock surveyed' },
        { stat: 'budgetDecades', sector: 'fishing', op: '>=', value: FISHING_DECADES, label: 'Fifteen decades within its line this run' },
      ],
    },
  },

  renewable: {
    regen: REGEN,
    threshold: THRESHOLD,
    collapsed: COLLAPSED,
    beta: BETA,
    scar: { mul: SCAR_MUL, years: SCAR_YEARS },
    startScarred: START_SCARRED,
    foreign: FOREIGN,
    firstSurvey: FIRST_SURVEY,
  },

  mechanic: {
    name: 'The banks',
    rebound: 'Hysteresis',
    blurb: 'The banks renew for ever until they cross a line, and then they do not. The fleet’s catch per trip is the only gauge.',
  },

  /*
   * Saturations are for population 1 (× N). Each later use is cheaper to half and larger, as in every Industry; the
   * opening price is 2. Fish fingers belong to Act II's revival: ApplicationDef has no `locked` (a contract gap), so
   * the use is put out of reach instead: visible only at a price of 0.12, which Act I cannot reach (its floor with
   * every card is about 0.45). Its founding cost is a placeholder.
   */
  applications: [
    {
      id: 'fishing.freshFish',
      name: 'Fresh fish by rail',
      blurb: 'Packed in ice at the quay, in a city market by morning.',
      icon: 'fishTrain',
      halfPrice: 1.8,
      saturation: 150,
      steepness: 2.2,
      visibleBelow: Infinity,
      foundCost: 0,
    },
    {
      /* Date left out: London and Lancashire each claim the first shop, in the 1860s, and neither claim is settled. */
      id: 'fishing.friedFish',
      name: 'Fried fish shops',
      blurb: 'A supper bought hot, wrapped, and eaten walking home. London and Lancashire each claim the first shop.',
      icon: 'fryer',
      halfPrice: 1.2,
      saturation: 600,
      steepness: 2.8,
      visibleBelow: 1.7,
      foundCost: 25_000,
    },
    {
      id: 'fishing.saltSmoked',
      name: 'Salt and smoked trade',
      blurb: 'Kippers, salt cod and red herring: fish that keeps for the inland towns and the ships.',
      icon: 'smokehouse',
      halfPrice: 0.8,
      saturation: 1_500,
      steepness: 3,
      visibleBelow: 1.3,
      foundCost: 60_000,
    },
    {
      /* Feeds nothing in Act I (Plenty later). */
      id: 'fishing.fishMeal',
      name: 'Fish meal for the fields',
      blurb: 'Whatever the market will not take, dried, ground and sold by the sack to farmers.',
      icon: 'sack',
      halfPrice: 0.5,
      saturation: 4_000,
      steepness: 3.2,
      visibleBelow: 0.95,
      foundCost: 150_000,
    },
    {
      id: 'fishing.codLiverOil',
      name: 'Cod liver oil',
      blurb: 'A spoonful a day for every child in the kingdom, and the livers of a great many cod.',
      icon: 'bottle',
      halfPrice: 0.35,
      saturation: 8_000,
      steepness: 3.2,
      visibleBelow: 0.7,
      foundCost: 400_000,
    },
    {
      id: 'fishing.fishFingers',
      name: 'Fish fingers',
      blurb: 'Cod in neat oblongs, breaded and frozen, for a household that has never seen the sea.',
      icon: 'carton',
      halfPrice: 0.15,
      saturation: 30_000,
      steepness: 3.4,
      visibleBelow: 0.12, // out of Act I's reach (see above); the Act II revival lowers the price or a `locked` replaces this
      foundCost: 1_500_000,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* UPGRADES                                                            */
/* ------------------------------------------------------------------ */

/*
 * Efficiency here is fish landed per fish killed: less spoilage and discard (η). Five cards to ×3.2, a ladder from
 * £12,000 (beside Motion's £12,000 in a run where Steam's cards cost £10,000–15,000 at minute 20). Stages are the
 * harbour's: the fish quay and its train 1, the smokehouses 2, the meal works 3.
 * Facts: ice from Norway (checked: natural ice was shipped from Norway to British ports from the 1820s and the fisheries
 * drove the trade; Blain, "Melting markets: the rise and decline of the Anglo-Norwegian ice trade, 1850–1920", LSE
 * working paper, 2006); the other efficiency cards are undated.
 */
const chainCards = chain('fishing', ladder(12_000, 2.3, 5), [
  {
    id: 'fishing.ice', name: 'Ice from Norway', fold: 1.3,
    blurb: 'Block ice cut from Norwegian lakes, shipped across the North Sea and crushed into the holds. Less of the catch rots.',
  },
  {
    id: 'fishing.fishTrain', name: 'The fish train', fold: 1.7,
    blurb: 'A train from the quay to the city markets every night. Fish landed at dusk is on a slab by morning.',
  },
  {
    id: 'fishing.smokehouses', name: 'Smokehouses', fold: 2.2,
    blurb: 'Rows of tall sheds on the harbour road. What would have spoiled by Friday sells in a month.',
  },
  {
    id: 'fishing.mealWorks', name: 'Fish-meal works', fold: 2.7,
    blurb: 'Heads, guts and the unsold catch go to the meal works. Nothing landed is thrown away.',
  },
  {
    id: 'fishing.gutting', name: 'Gutting at sea', fold: 3.2,
    blurb: 'Gutted and iced on deck, not on the quay. The catch keeps longer, so the boats stay out longer.',
  },
]);

const fishingUpgrades: UpgradeDef[] = withStages([
  ...chainCards,

  /*
   * Capital: fishing power (c). The main rebound: each card makes catching cheaper and fish cheaper, and the foreign
   * share follows the price. Facts: steam trawlers, the 1880s (research/sectors.md §3, [S15]); the otter trawl, the
   * 1890s (1911 Britannica, "Trawling"; Kenchington, The Northern Mariner, 2018: the usual credit to Scott of Granton
   * is disputed, so no inventor is named); steam drifters, the 1890s (Lowestoft's first, Consolation, 1897: Fishing
   * News); the steam capstan undated.
   */
  {
    id: 'fishing.steamTrawlers', sector: 'fishing', kind: 'capital',
    name: 'Steam trawlers',
    blurb: 'The 1880s: a trawler that tows against the wind and the tide, and is home before the catch can spoil.',
    cost: 15_000, effects: [capCost('fishing', 0.7)], // c × 0.7: the largest single fall in the cost of catching
  },
  {
    id: 'fishing.otterTrawl', sector: 'fishing', kind: 'capital',
    name: 'Otter trawl',
    blurb: 'The 1890s: boards that spread the net by the water’s own pressure. A wider mouth, and no beam to break.',
    cost: 40_000, requires: ['fishing.steamTrawlers'],
    effects: [capCost('fishing', 0.8), sat('fishing', 1.1)], // c × 0.8 and a tenth more taken of every use
  },
  {
    id: 'fishing.steamDrifters', sector: 'fishing', kind: 'capital',
    name: 'Steam drifters',
    blurb: 'The herring fleet under steam from the 1890s. Out on any wind, back the same night with a full hold.',
    cost: 90_000, requires: ['fishing.steamTrawlers'],
    effects: [capCost('fishing', 0.85), sat('fishing', 1.15, 'fishing.saltSmoked')], // the herring goes to the curers
  },
  {
    id: 'fishing.capstan', sector: 'fishing', kind: 'capital',
    name: 'Steam capstan',
    blurb: 'The net hauled by steam, not by the crew’s backs. Bigger nets, and more hauls in a day.',
    cost: 200_000, requires: ['fishing.otterTrawl'],
    effects: [capCost('fishing', 0.9)],
  },
  {
    /* The growth card (as Steam's engine works): cheap, repeatable, and itself a rebound: cheaper boats, more boats. */
    id: 'fishing.anotherTrawler', sector: 'fishing', kind: 'capital',
    name: 'Another trawler',
    blurb: 'Another hull off the slip, each a little cheaper than the last. The owners have never seen a better season.',
    cost: 8_000, repeatable: true, costGrowth: 1.25, maxLevel: 30, effects: [capCost('fishing', 0.97)],
  },

  /* Fork 1: what goes over the side. Long-lines take the fish asked for and pay for it in labour; the trawl takes
   * everything and lands it cheap. */
  ...fork(
    {
      id: 'fishing.longLiners', sector: 'fishing', kind: 'efficiency',
      name: 'Long-liners',
      blurb: 'Miles of baited hooks, set and hauled by hand. The fish asked for, and dear: little goes back dead over the side.',
      cost: 30_000, requires: ['fishing.steamTrawlers'],
      effects: [eta('fishing', 1.2), capCost('fishing', 1.1)], // fewer killed per ton landed; dearer to catch
    },
    {
      id: 'fishing.beamOtter', sector: 'fishing', kind: 'capital',
      name: 'Beam and otter trawl',
      blurb: 'Drag the bottom and take what comes up. Everything in the net, landed cheap, and a market found for it all.',
      cost: 30_000, requires: ['fishing.steamTrawlers'],
      effects: [capCost('fishing', 0.85), sat('fishing', 1.1)],
    },
  ),

  /* Fork 2: which port. Grimsby's fresh trade by rail, or Hull's distant water with bigger boats. */
  ...fork(
    {
      id: 'fishing.grimsby', sector: 'fishing', kind: 'capital',
      name: 'Grimsby',
      blurb: 'The fresh trade: short trips, the fish train at the dock gates, and a supper on every table by Thursday.',
      cost: 70_000, requires: ['fishing.fishTrain'],
      effects: [half('fishing', 1.3, 'fishing.freshFish'), half('fishing', 1.3, 'fishing.friedFish')],
    },
    {
      id: 'fishing.hull', sector: 'fishing', kind: 'capital',
      name: 'Hull',
      blurb: 'Distant water: bigger boats, longer trips, grounds no smack ever reached. More fish, from further away.',
      cost: 70_000, requires: ['fishing.fishTrain'],
      effects: [capCost('fishing', 0.85), sat('fishing', 1.1)],
    },
  ),

  /*
   * Prospect: the Fisheries Exhibition (London, 1883). Huxley's inaugural address, wording checked against the Clark
   * University text (design §16): "in relation to our present modes of fishing" and "inexhaustible". The card name is
   * cut to fit 24 characters; the year is in the blurb. Effect: the exhibition sells fish (fresh fish halfPrice × 1.3).
   */
  {
    id: 'fishing.exhibition', sector: 'fishing', kind: 'prospect',
    name: 'The Fisheries Exhibition',
    blurb: 'Professor Huxley, 1883: the cod, herring and mackerel fisheries, ‘in relation to our present modes of fishing’, are ‘inexhaustible’.',
    cost: 20_000, effects: [half('fishing', 1.3, 'fishing.freshFish')],
  },

  /*
   * Research: Garstang (1900), "The Impoverishment of the Sea: a critical summary of the experimental and statistical
   * evidence bearing upon the alleged depletion of the trawling grounds", J. Mar. Biol. Assoc. 6(1): 1–69 (design §16).
   * Visible after the run's first poor season, or once the Board's first survey has been made in the save (the feature
   * 'estimates' arrives with it), so that a later run need not wait for another bad season. Unlocks survey cruises.
   * The title (29 characters) does not fit the card's name; it is in the blurb.
   */
  {
    id: 'fishing.garstang', sector: 'fishing', kind: 'research',
    name: 'Garstang’s inquiry',
    blurb: 'Garstang, 1900: The Impoverishment of the Sea, a summary of the evidence on the alleged depletion of the trawling grounds.',
    /* M4 polish: 25,000 (was 60,000): within reach in the run Fishing opens, where the first spring survey needs it */
    cost: 25_000,
    when: {
      any: [
        { stat: 'crises', sector: 'fishing', op: '>=', value: 1 },
        { feature: 'estimates' },
      ],
    },
    effects: [{ type: 'unlock', id: 'fishing.surveyCruises' }],
  },
], {
  'fishing.fishTrain': [1, 'Fish quay and train'],
  'fishing.smokehouses': [2, 'Smokehouses'],
  'fishing.mealWorks': [3, 'Fish-meal works'],
});

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

/* Levers with more than the helpers' three authored levels. Default ratios are the helpers' (Mandate × 3 a level,
 * upkeep × 2.5); the five-level quota and the four widths take gentler ones (× 2 and × 1.6), so that the moratorium is
 * paid for in suppers and idle ports rather than in an impossible Mandate bill. */
function levels(values: number[], cost: number, upkeep: number, labels: string[], costStep = 3, upkeepStep = 2.5): LeverLevelDef[] {
  return values.map((value, i) => ({
    mandateCost: sig2(cost * costStep ** i),
    mandateUpkeep: Math.round(upkeep * upkeepStep ** i * 1000) / 1000,
    value,
    label: labels[i],
  }));
}

/* Mandate costs sit beside Motion's (180–280) and above Steam's (80–120): run 6's Mandate income is larger. */
const fishingLevers: LeverDef[] = [
  /*
   * Fishery limits: the rebounding lever (design §5.4). A measure: each level multiplies the foreign share by 0.55
   * (0.55, 0.30, 0.17, 0.09 of it at the four widths). Its side effect: the home fleet grows into the space (satMul
   * 1.12 on every home use, × bite × level: +40% at "Fifty miles" at full bite), unless the survey quota is in force.
   * rampYears 15: at Fifty miles the home catch is up by about a third within 30 model years (criterion 12: ≥ 25%,
   * with total catch down ≤ 15%). The widths are a ladder, not dated (they are later than the Coal Age; only the first
   * is of the period: the North Sea Fisheries Convention, The Hague, 6 May 1882, gave each signatory's fishermen three
   * miles of their own coast, checked against the 1911 Britannica and Hansard, 14 March 1923). Visibility: meant to
   * wait for a 15% foreign share (FISHERY_LIMITS_WHEN), which the contract cannot express; until it can, the lever is
   * visible when Fishing opens. (M4 amendment: wired as LeverDef.when.) No Tighten past two hundred miles (maxSteps 0).
   */
  {
    id: 'fishing.limits', sector: 'fishing', kind: 'measure',
    name: 'Fishery limits',
    blurb: 'Waters closed to foreign boats, wider at each level. The Hague, 1882, gave each nation three miles of its own coast.',
    catch: 'Foreign boats leave the banks. Your own fleet will want the room, unless the Board sets the catch.',
    levels: levels([1, 2, 3, 4], 250, 0.08, ['Close the bays', 'Twelve miles', 'Fifty miles', 'Two hundred miles'], 2, 1.6),
    repeat: { valueStep: 1, costGrowth: 1.6, upkeepGrowth: 1.35, maxSteps: 0, label: 'Limits, step {n}' },
    /* M4 polish: or once the first spring survey has passed (achievements.ts SPRINGS): the later springs ask for fewer
     * foreign boats than the 15% at which the limits are otherwise offered. */
    when: { any: [FISHERY_LIMITS_WHEN, { owns: 'ach.m4.springSurvey' }], label: FISHERY_LIMITS_WHEN.label },
    effects: [{ type: 'foreignMul', sector: 'fishing', value: 0.55 }],
    sideEffects: {
      effects: [sat('fishing', 1.12)],
      rampYears: 15, decayYears: 30, // five minutes to most of its strength; ten to fade
      unless: { owns: 'fishing.surveyQuota' },
      blurb: 'The home fleet grows into the waters the foreign boats have left.',
      unlessLabel: 'unless the survey quota is in force',
    },
  },
  /*
   * Quota (from landings): an ordinary cap on the home line (design §5.5). Drawn at today's catch, it holds the catch
   * where it is, which may be more than the banks can bear: over-allocation, with no new rule.
   */
  lever({
    id: 'fishing.landingsQuota', sector: 'fishing', kind: 'cap',
    requires: ['budget'],
    name: 'Quota (from landings)',
    blurb: 'A ceiling on the tons landed, set from the landings books and falling with the budget line.',
    catch: `It holds the catch where the landings say. Whether the banks can bear it, the books do not say. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 260, upkeep: 0.12, label: CAP_LABEL, labels: { 0: 'Hold to the landings' },
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
    recycleBlurb: { commons: 'Quota money for the Commons. The seamen’s reading room is lit by gas.' },
  }),
  /*
   * Quota (from the survey): the M4 'quota' kind, capR = value × sinkR (the catch that holds the stock at its clear
   * level). Visible only while surveyed (the core's rule); held while unsurveyed, it acts on the Board's last figure.
   * The last authored level, 0, is the moratorium (D held at the price-proof floors). Its people are named by place.
   * No recycle field: the lint allows one only on duty and cap (the contract gives a quota a cap's levy; the Act lane
   * decides whether the lint and this lever should offer the choice). No Tighten below nought (maxSteps 0).
   */
  {
    id: 'fishing.surveyQuota', sector: 'fishing', kind: 'quota',
    requires: ['budget'],
    name: 'Quota (from the survey)',
    blurb: 'The catch set below what the banks regrow, by the Board’s own figure. Nought is a moratorium.',
    catch: 'Less fish, dearer suppers, idle crews. At nought Grimsby’s fleet is laid up, and its men with it.',
    levels: levels([0.9, 0.75, 0.6, 0.4, 0], 300, 0.1,
      ['90% of the surplus', '75% of the surplus', '60% of the surplus', '40% of the surplus', 'Moratorium'], 2, 1.6),
    repeat: { valueStep: -0.05, costGrowth: 1.45, upkeepGrowth: 1.3, maxSteps: 0, label: '{pct}% of the surplus' },
  },
  /* Closed season: sufficiency (the spawning months closed; appetite for fish lowered with the season). */
  lever({
    id: 'fishing.closedSeason', sector: 'fishing', kind: 'sufficiency',
    name: 'Closed season',
    blurb: 'No trawling in the spawning months. The markets learn to do without fish for part of the year.',
    catch: 'Slow to take, and the crews are idle while it holds. The skippers say so.',
    values: SUFF_VALUES, value2: [0.002, 0.003, 0.004], cost: 200, upkeep: 0.05, label: 'Fish {pct}% of the year',
    repeat: { value2Step: 0.0005 },
  }),
  /* Mesh size: a measure. η × 1.06 a level (the young fish go through and are not killed for nothing) and every use
   * × 0.96 (a little less landed). */
  lever({
    id: 'fishing.mesh', sector: 'fishing', kind: 'measure',
    requires: ['moreLevers'],
    name: 'Mesh size',
    blurb: 'A legal gauge for the net. The young fish go through and grow.',
    catch: 'A little less in every haul, and the inspectors must be paid to measure the nets.',
    values: [1, 2, 3], cost: 180, upkeep: 0.04, label: 'Mesh, gauge {n}',
    effects: [eta('fishing', 1.06), sat('fishing', 0.96)],
    repeat: { maxSteps: 2 },
  }),
  /*
   * Survey cruises: a measure with the survey effect (surveyed while held). Locked; unlocked by Garstang's inquiry.
   * Upkeep 0.3 Mandate/s (the truth's standing cost: about a sixth of a restraint player's Mandate income at run 6;
   * balance), one level only (several surveys in force are one).
   */
  {
    id: 'fishing.surveyCruises', sector: 'fishing', kind: 'measure',
    locked: true,
    name: 'Survey cruises',
    blurb: 'A Board vessel and two naturalists, trawling the banks on a grid every spring, as the skippers do not.',
    catch: 'The Board’s vessel again, for as long as the House will pay for her.',
    levels: levels([1], 300, 0.3, ['Keep the vessel at sea']),
    repeat: { valueStep: 1, costGrowth: 1.6, upkeepGrowth: 1.35, maxSteps: 0, label: 'Cruise {n}' },
    effects: [{ type: 'survey', sector: 'fishing' }],
  },
];

/* ------------------------------------------------------------------ */
/* HEADLINES (Content.sectorHeadlines): harbour notes and landings     */
/* ------------------------------------------------------------------ */

/*
 * Fishing's own paper: the harbour notes and the landings (design §5.1). People are named by place, never scored; no
 * deaths, no joke at the ports' expense (D4). Lines from the design used here: §5.7's opening, foreign-fleet and
 * banks-fail lines, and §5.8's catch-per-trip, fried-fish, Billingsgate and third-season lines. The Board's Survey
 * card and its follow-up headline are the text lane's (Content.surveyReveal).
 */
const fishingHeadlines: Partial<Record<HeadlineKey, string[]>> = {
  efficiency: [
    'Catch per trip holds steady; owners order three more trawlers',
    'Less of the catch spoiled than ever; more of it landed than ever',
    'Fish keeps a week longer; the fleet stays out a week longer',
    'Not a head wasted at the meal works; the fleet doubles to supply it',
    'Landings at Grimsby a record; prime cod firm, haddock plentiful',
    'Harbour notes: more fish from every ton caught, more tons caught',
    'Ice merchants report a brisk season; the trawler yards a brisker one',
  ],
  sectorOpened: [
    'Steam trawlers land record catches; fish trains run through the night',
    'First steam trawler in from the Dogger; the quay turns out to see',
    'Harbour notes: a fleet that sails against the wind, and fish by rail',
  ],
  appAvailable: [
    'Talk on the fish quay is of {app}; the owners listen',
    'Cheap fish brings {app} within reach of the inland towns',
    'Merchants at Billingsgate ask about {app}',
    'A prospectus for {app}; the trawler owners subscribe first',
  ],
  appFounded: [
    'Fish trains run on time for {app}; the owners order more boats',
    'Landings committed to {app} for the season; prices firm',
    'Harbour notes: the first catch sold to {app}',
    '{app} opened at the dock gates; the curers take on hands',
    'Fried fish a penny; the shops cannot fry fast enough',
  ],
  crisis: [
    'Poor season No. {n}: the boats come home light',
    'Landings down at every port; owners blame the weather',
    'Skippers find the shoals further out each week; catch per trip holds',
    'Harbour notes: a thin season, and small fish in the nets',
    'Prices firm on short landings; the fleet goes further for less',
    'Fewer gulls over the fleet this spring, say the older hands',
  ],
  collapse: [
    'The banks yield nothing; the fleet is tied up at every quay',
    'No fish to be had at any price; the fish trains stand empty',
    'Billingsgate shuts its doors for want of anything to sell',
  ],
  exhausted: [
    'Not a shoal on the Dogger; the Board will report in due course',
    'The grounds fished out; the harbour falls quiet',
    'Last trawler in with an empty hold; the ice melts on the quay',
  ],
  backfire: [
    'Every trawler lands more for less; the fleet has never been larger',
    'Fish cheaper than bread; the nation eats twice as much of it',
    'Billingsgate glutted; prime cod sold for manure',
  ],
  leverEnacted: [
    'Fisheries bill passes; owners threaten to sail under another flag',
    'New rule for the banks; skippers say it was written ashore',
    'The Board’s order to take effect from the spring',
    'Measure carried; the owners’ association holds an angry dinner',
  ],
  leverLapsed: [
    'Fisheries order lapses; the fleet sails the same evening',
    'Rule for the banks repealed; the skippers stand drinks',
  ],
  steadySector: [
    'Fifty years of fair seasons; the banks bear what is taken',
    'The catch steady, the shoals steady; the harbour notes are short',
  ],
  budgetDrawn: [
    'A budget for the catch: so many tons, and fewer each decade',
    'Treasury draws a line under the landings; owners call it guesswork',
  ],
  decade: [
    'Landings held to budget for decade {n}; suppers still fried',
    'A decade inside the catch budget; the fleet grumbles, and fishes',
  ],
  budgetBroken: [
    'Catch budget broken; owners blame a run of fine weather',
    'More fish landed than allowed; the Treasury disappointed',
  ],
  reckoning: [
    'Commission on the sea fisheries sits; the minutes run to volumes',
    'The ports’ accounts read aloud, from the first steam trawler on',
  ],
  clearSkies: [
    'Shoals breaking the surface off the Dogger; the gulls are back',
    'Porpoises in the bay again; the older hands say it is a good sign',
    'Young fish thick in the samples; the Board allows itself a smile',
  ],
  settled: [
    'Fishing settled: the catch set at what the banks will bear',
    'The Board counts the banks every spring and sets the catch to suit',
    'Trawler owners agree to a fleet of fixed size; the yards are quiet',
  ],
  unsettled: [
    'Fisheries settlement lapses; every boat in the harbour puts out',
    'The ports have outgrown their agreement; the agreement goes',
    'Fishing unsettled; owners order three more trawlers by return',
  ],
  biteBack: [
    'Foreign boats gone from the banks; home trawlers fill their places',
    'The limits work; the home fleet doubles to fish inside them',
    'Fewer foreign sails, more home ones; the catch is the same or more',
  ],
  /* M4 keys */
  threshold: [
    'The Dogger fleet tied up; surveys find no sign of the shoals',
    'The banks fail; skippers report the sea empty between the marks',
    'Catch per trip still good, say skippers; the Board asks to count',
  ],
  scarHealed: [
    'Young fish found on the banks again; the Board is cautious',
    'The shoals return to the Dogger after long absence',
    'Gulls back over the fleet; the harbour notes print a full page',
  ],
  surveyed: [
    'The Board’s vessel puts out with its nets and its naturalists',
    'Board’s figures published; the skippers read them in the bar',
    'A survey of the banks, on a grid; the owners decline to comment',
  ],
  foreignFleets: [
    'Foreign trawlers on the Dogger; owners ask the Admiralty to look',
    'Strange pennants on the banks; the home fleet is not consulted',
    'Foreign boats land their catch at their own ports; ours is no less',
  ],
};

/*
 * Offered to the text lane (needs no new key; an ambient line for a scarred run): "No sign of the shoals for a third
 * season; the Board will report".
 */
export const fishing: SectorContent = {
  def: sector, upgrades: fishingUpgrades, levers: fishingLevers, headlines: fishingHeadlines,
};
