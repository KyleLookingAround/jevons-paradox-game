/**
 * Iron & Steel (on screen an Industry; M4): its SectorDef and applications (with the order book's feeds), upgrades,
 * levers, its own headlines (the iron market report) and its decade dividends.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 *
 * Design: design/m4-design.md §4 (identity, the order book, the kit, example text) and §6; contract: src/types.ts
 * (`M4:` hunks: SectorDef.resourceStock, ApplicationDef.feeds). Iron opens in run 4 and teaches the EMBODIED rebound:
 * each use of cheap iron makes another Industry's machines cheaper, so the coal is burnt where the machines are.
 * Every number below is a first guess for the balance lane; the comment beside it says what it is meant to do.
 *
 * Facts (sources in design/scratch/m4-iron-progress.md): Neilson's hot blast, patent 1828, 8.06 → 5.16 long tons of
 * coal per ton of iron, 58 licensees by 1840; raw coal for coke and the blackband ironstone (Wikipedia, Hot blast, from
 * Belford); Cowper's stove, patented 1857 (Wikipedia, Cowper stove); Bessemer's 1856 paper title [S, energy.md §2.1];
 * Siemens's regenerative furnace (1850s), applied to steel by Martin in 1865 (Wikipedia, Open-hearth furnace);
 * Gilchrist and Thomas, patented 1877, dolomite lining, the most abundant (phosphoric) ore (Wikipedia, Gilchrist–Thomas
 * process); acid Bessemer on low-phosphorus Spanish haematite (Britannica, Bessemer steel; Houpt on Bilbao); Huntsman,
 * 1740, Handsworth near Sheffield (Wikipedia, Crucible steel); Nasmyth 1839 and Bourdon at Le Creusot 1840 (Wikipedia,
 * Steam hammer); Jevons on Scottish iron and on the coke tax [V, energy.md §1.2, §1.5]; Zink & Geyer 2017 (design's
 * source list).
 */
import type { DividendDef, HeadlineKey, LeverDef, SectorDef, UpgradeDef } from '../../types';
import {
  eta, capCost, margin, absorb, sat, half, chain, fork, ladder, lever, withStages, decadeSequence, RECYCLE, DUTY_LABEL,
  CAP_LABEL, CAP_FIRST, SUFF_LABEL, CAP_VALUES, CAP_LEAK, DUTY_VALUES, SUFF_VALUES, SHARE_VALUES, DIVIDEND,
} from '../helpers';
import type { SectorContent } from '../helpers';

/* ------------------------------------------------------------------ */
/* IRON: the order book (the feeds' full-adoption multipliers)         */
/* ------------------------------------------------------------------ */

/*
 * f = 1 − (1 − m) × adoption on the fed Industry's capital cost (ApplicationDef.feeds). The design's intents (§4.2).
 * BALANCE, FIRST: Steam's c is 0.04 (and the lathe, the pirate engine and "Another engine works" take it lower) against
 * p_r / η ≈ 0.15–0.25 when Iron opens, so RAIL_STEAM at 0.85 moves Steam's price only about 3%. Exit criterion 5 (Steam's
 * R ≥ 1.15× with feeds than with --ignore=feeds, thirty minutes after Iron opens) will probably need these lower, or the
 * feed to act on more of Steam's price than c. Measure before tuning.
 */
const RAIL_STEAM = 0.85;      // rails: the railway's largest capital item
const PLATE_STEAM = 0.92;     // iron hulls for the steamships
const PLATE_FISHING = 0.85;   // iron hulls for the steam trawlers (Fishing, from run 6)
const GIRDER_LIGHT = 0.88;    // gasholders, power stations, tram depots
const TOOLS_ALL = 0.92;       // the lathe makes every machine cheaper: every OTHER open Industry ('*')
const TIN_FISHING = 0.9;      // canned fish keeps: the catch has a market inland

/* ------------------------------------------------------------------ */
/* IRON: the Industry                                                  */
/* ------------------------------------------------------------------ */

const sector: SectorDef = {
  id: 'iron',
  name: 'Iron & Steel',
  years: '1828–1914',
  firstYear: 1828, // Neilson's hot blast patent; the Industry's own clock
  tagline: 'Coal goes in at the top, iron comes out at the bottom, and the order book is never full.',
  /* "Sell Iron & steel" is 17 characters: the sell button's limit is 18 (content lint). */
  service: { name: 'Iron & steel', unit: 'tons', unitSingular: 'ton' },
  resource: { name: 'Coke', unit: 'tons', unitSingular: 'ton' },
  /* The contract has one crisisName per Industry: the first crisis's. The Slag Slide (0.7) is named in the crisis
   * headlines only (contract gap, reported). */
  pressure: { name: 'Slag & smoke', crisisName: 'The Orange Night' },
  accent: 'foundry', // the UI's token set for the foundry lithograph (unknown keys mean no accent until the UI adds it)

  /* Ignored with resourceStock (the owner's p_r is used): kept at Steam's values so the def reads sensibly. */
  basePrice: 1,
  /* c: iron is capital-heavy (furnaces, stoves, mills); a little above Steam's 0.04 and Light's 0.05. With p_r ≈ 1.2 at
   * opening (Steam's coal part-worked), Iron's opening price is about 1.26; after Hot blast about 0.81, which brings
   * Rails within reach (visibleBelow 0.85). */
  capCost: 0.06,
  /* m: the temptation is income (design: ≥ 15% more income across Iron and the fed Industries when the order book is
   * engaged). Steam's 0.2 to start; the forks move it. */
  margin: 0.2,
  baseEta: 1,
  autoEtaRate: 0,

  /*
   * M4: the shared reserve. Iron's coke comes out of Steam's coal (one reserve, one seam ladder, one exhaustion; the
   * seams stay Steam's). Iron's own reserve, alpha and seams are ignored by the contract; `reserve` and `alpha` mirror
   * Steam's so nothing reads oddly. Iron's R is on Iron's own budget line.
   */
  resourceKind: 'stock',
  resourceStock: 'steam',
  reserve: 760_000, // ignored (Steam's reserve is used)
  alpha: 0.25,      // ignored (Steam's p_r is used)

  pressureSource: 'resource',
  /* Slag and smoke per ton of coke: higher than Steam's 0.001 because Iron burns less coal than Steam (the target
   * share is about a third of the reserve's draw: "Coal: Steam 71%, Iron 29%"), and its sky should still reach the
   * Orange Night in a boom run. Balance knob. */
  pressureIntensity: 0.0018,
  /* Slag tips do not blow away: slower than Steam's 0.008, so a cleared sky takes longer and the sink line sits lower. */
  absorption: 0.006,
  collapseAt: 100,
  crisisAt: [0.4, 0.7], // The Orange Night, The Slag Slide (design §4.3)
  pressureWellbeingCost: 14, // between Light's 12 and Steam's 22: the works are at the edge of town
  pressureUpkeep: 0,

  /* Wellbeing from iron: modest (households buy little of it directly; its use is in other Industries' machines).
   * M4 balance: 6 at scale 50 (was 4 at 300, which with a restrained D/N of about 27 gave 0.35 points against its slag's
   * 3–5: Iron cost wellbeing in every run). Now about 2.6 points at a restrained opening, 6–9 later; still below its
   * smoke's cost unless its line is held. Without Motion, Compute and Code the Coal Age must carry the wellbeing target. */
  wellbeingWeight: 6,
  wellbeingScale: 50,

  /*
   * M2: clear skies at 0.4 of the drawn pressure (Steam 0.5, Light 0.3, Motion 0.4). The slag tips' slow absorption
   * makes it hard under a line alone: the smoke inspector, the slag fund and the scrap bounty with the duty reach it.
   */
  steady: {
    /* M4 balance: 0.5 (was 0.4): the slag tips' slow absorption held a restrained Iron at 2–9× its clear level for whole
     * runs; with Iron in the Act I ending's set the order book's restraint must be able to clear in a run. */
    clearBelow: 0.5,
    /* M4 balance: floor 3% of collapse (the global 1%): a line drawn as Iron opens has almost no slag under it, and at 1%
     * clear skies asked for a third of Iron's opening output (the human-like player draws three minutes in). */
    clearFloor: 0.03,
    decadeChoices: decadeSequence([
      ['div.iron.bankedFurnaces', 'div.iron.railRebate'],
      ['div.iron.slagFund', 'div.iron.blowingIn'],
    ]),
  },

  /*
   * M2: Settlement (design §4.3: Commons yield and a little wellbeing). Settling freezes the feeds at their settled
   * values (contract). Standing: the Commons a twentieth more, half a point of wellbeing; once a run, a purse of
   * capital. Defence 0.25 Mandate/s per unit of excess (as Light): a growing town wants more rails.
   */
  settle: {
    dividend: [{ type: 'commonsYieldMul', value: 1.05 }, { type: 'wellbeingAdd', value: 0.6 }, { type: 'capitalAdd', value: 150 }],
    upkeepPerSpill: 0.25,
    freeExcess: 0.05,
    blurb: 'Ravensdale banks its furnaces to the order book and no further. The night sky over Dudley is the colour of night.',
  },

  /*
   * Run 4 (three Reckonings), 10–20 minutes in, never a price gate (design §4.1). High-pressure steam, whose machine is
   * the Cornish engine, rather than the Cornish engine card itself: that card is a fork arm, and gating on it would
   * shut Iron for every player who took Corliss valve gear. The ten-minute floor keeps the opening five minutes or more
   * from the Commons, which arrive at run 4's Reckoning (design §9). Note for balance: a restraint player who never
   * founds Railways never opens Iron; measure `budget`.
   */
  unlock: {
    minReckonings: 3,
    when: {
      all: [
        { owns: 'steam.highPressure', label: 'Own High-pressure steam' },
        { owns: 'steam.railways', label: 'Railways founded' },
        { stat: 'time', op: '>=', value: 600, label: 'Ten minutes into the run' },
      ],
    },
  },

  mechanic: {
    name: 'The order book',
    rebound: 'Embodied',
    blurb: 'Each use of iron makes another Industry’s machines cheaper to build. The coal is burnt where the machines are.',
    /* M4 amendment (wired by the Act lane): the order book's lines are shown once Jevons's chapter on iron is read. */
    feedsKnownWhen: { owns: 'iron.economyOfFuel', label: 'Read Of the Economy of Fuel' },
  },

  /*
   * Six uses in price order (halfPrice / visibleBelow on Steam's ladder shape, scaled to Iron's opening price of about
   * 1.26). Saturations aim Iron's draw at about a third of the shared reserve's (see pressureIntensity). The first use
   * is free and has no feed, so a player can refuse every feeding use (the `--ignore=feeds` strategy, exit criterion 5).
   * Blurbs are written to stay true on both accounts (before the Board's Survey the coke is Iron's; after it, on the
   * full account, it is the fed Industry's): they say what the iron is for, not whose line it lands on.
   */
  applications: [
    {
      /* The design's "Barbed wire" (feeds nothing in Act I; feeds Plenty in Act II), as plain fencing wire: the barbed
       * kind is an 1870s patent and this use is open from 1828. */
      id: 'iron.wire',
      name: 'Fencing wire',
      blurb: 'Drawn wire by the mile for the farmer’s fence. In time somebody will think to put barbs on it.',
      icon: 'wire',
      halfPrice: 0.9,
      saturation: 80,
      steepness: 2.4,
      visibleBelow: Infinity,
      foundCost: 0,
    },
    {
      id: 'iron.rails',
      name: 'Rails',
      blurb: 'Wrought-iron rail by the mile, for every line the promoters can float.',
      icon: 'rails',
      halfPrice: 0.5,
      saturation: 500,
      steepness: 3,
      visibleBelow: 0.85, // after Hot blast (design: "Hot blast is its first card"; Rails the first feed)
      foundCost: 3_000,
      feeds: [{ sector: 'steam', capCostMul: RAIL_STEAM }],
    },
    {
      id: 'iron.shipPlate',
      name: 'Ship plate',
      blurb: 'Riveted plate for iron hulls: first the steamers, then the trawlers.',
      icon: 'plate',
      halfPrice: 0.3,
      saturation: 1_500,
      steepness: 3.4,
      visibleBelow: 0.5,
      foundCost: 12_000,
      feeds: [{ sector: 'steam', capCostMul: PLATE_STEAM }, { sector: 'fishing', capCostMul: PLATE_FISHING }],
    },
    {
      id: 'iron.girders',
      name: 'Bridges & girders',
      blurb: 'Girders for viaducts, gasholders and the station roofs.',
      icon: 'girder',
      halfPrice: 0.18,
      saturation: 4_000,
      steepness: 3.6,
      visibleBelow: 0.3,
      foundCost: 40_000,
      feeds: [{ sector: 'light', capCostMul: GIRDER_LIGHT }],
    },
    {
      id: 'iron.tinplate',
      name: 'Tinplate & cans',
      blurb: 'Tinned sheet for the canneries. Fish caught on Monday is sold inland in March.',
      icon: 'cans',
      halfPrice: 0.11,
      saturation: 9_000,
      steepness: 3.8,
      visibleBelow: 0.18,
      foundCost: 100_000,
      feeds: [{ sector: 'fishing', capCostMul: TIN_FISHING }],
    },
    {
      /* Last and dearest: the one feed that reaches every other open Industry. */
      id: 'iron.machineTools',
      name: 'Machine tools',
      blurb: 'Planers, shapers and the slide rest. Every engine in the kingdom is cheaper to make.',
      icon: 'lathe',
      halfPrice: 0.065,
      saturation: 20_000,
      steepness: 4,
      visibleBelow: 0.11,
      foundCost: 250_000,
      feeds: [{ sector: '*', capCostMul: TOOLS_ALL }],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* UPGRADES                                                            */
/* ------------------------------------------------------------------ */

/*
 * The chain: coal per ton of iron, to ×11 (forks and off-chain cards add up to ×1.2 more: about ×13–14, near Steam's
 * ×13 chain). Folds: Hot blast 1.6 (8.06 → 5.16 tons, [S]); raw coal 2.7 (the fragmentary 8.2 → 3.0 table, [S, caution];
 * Jevons's "less than one-third" [V] by 1863); then the converter, the regenerative furnace and size.
 * Costs: Hot blast at £4,000 so it is bought within a minute or two of Iron opening (run 4, about hour 3, when Steam's
 * cards cost £15,000–£56,000); ×2.3 a step as Light's chain.
 * Stages (the scene, design §11.1): cold-blast furnace 0 → hot-blast stoves 1 → converter shed 2 → open-hearth shop 3.
 */
const ironUpgrades: UpgradeDef[] = withStages([
  ...chain('iron', ladder(4_000, 2.3, 6), [
    {
      id: 'iron.hotBlast', name: 'Hot blast', fold: 1.6,
      blurb: 'Neilson, 1828: heat the air before it goes into the furnace. Fifty-eight ironmasters hold licences by 1840.',
    },
    {
      id: 'iron.rawCoal', name: 'Raw coal in the furnace', fold: 2.7,
      blurb: 'With the blast hot, the Scottish masters charge raw coal and skip the coke ovens. The blackband ironstone pays at last.',
    },
    {
      id: 'iron.cowper', name: 'Cowper stoves', fold: 3.6,
      blurb: 'Cowper, 1857: brick stoves heated by the furnace’s own hot gas, then turned about to heat the blast.',
    },
    {
      id: 'iron.bessemer', name: 'Bessemer converter', fold: 5.5,
      blurb: 'Bessemer, 1856: “The Manufacture of Malleable Iron and Steel without Fuel”. Air blown through molten pig.',
    },
    {
      id: 'iron.siemens', name: 'Siemens open hearth', fold: 8,
      blurb: 'Siemens’s regenerative furnace, put to steel by Martin in 1865. The exhaust heats the brick that heats the next charge.',
    },
    {
      id: 'iron.largerFurnaces', name: 'Larger furnaces', fold: 11,
      blurb: 'Taller stacks, wider hearths, more tons a week from every furnace. The yard is extended twice.',
    },
  ]),
  {
    /* Off the chain: a modest saving that waits for the stoves (the oven gas fires them). */
    id: 'iron.byProductOvens', sector: 'iron', kind: 'efficiency',
    name: 'By-product coke ovens',
    blurb: 'Catch the tar, the ammonia and the gas the old ovens burnt off, and fire the works with the gas. Chemists move in.',
    cost: 30_000, requires: ['iron.cowper'], effects: [eta('iron', 1.12)],
  },

  /*
   * Fork 1 (design §4.3): quality or tonnage, as the converter arrives. Sheffield: margin up, saturation down (fewer,
   * dearer, longer-lived tons; the contract has no lifetime, so "longer life" is the lower saturation). Bessemer
   * tonnage: cheap and everywhere (capCost down, saturation up): the burning player's arm. Neither is bought by the
   * Market (it never buys a card with `excludes`). Within ±10% Hindsight per minute of each other (exit criterion 15).
   */
  ...fork(
    {
      id: 'iron.crucible', sector: 'iron', kind: 'capital',
      name: 'Sheffield crucible steel',
      blurb: 'Huntsman’s method, since 1740: small pots and slow melts, steel for tools and springs. Fewer tons, dearer, and they last.',
      cost: 50_000, requires: ['iron.bessemer'],
      effects: [margin('iron', 0.04), sat('iron', 0.85)],
    },
    {
      id: 'iron.tonnage', sector: 'iron', kind: 'capital',
      name: 'Bessemer tonnage',
      blurb: 'Run the converters day and night and price the rails to sell. Steel for every line, hull and bridge that will take it.',
      cost: 50_000, requires: ['iron.bessemer'],
      effects: [capCost('iron', 0.85), sat('iron', 1.25)],
    },
  ),

  /*
   * Fork 2: which ore. Basic lining is the eighth efficiency card (a little less coke per ton, cheaper ore, more of it:
   * the commonest ore will do). Acid lining keeps the dear ore and the margin. Both after the converter.
   */
  ...fork(
    {
      id: 'iron.acidLining', sector: 'iron', kind: 'capital',
      name: 'Acid lining',
      blurb: 'Keep the sand lining and buy phosphorus-free haematite from Bilbao. Dear ore, sound steel, and the margin to match.',
      cost: 80_000, requires: ['iron.bessemer'],
      effects: [margin('iron', 0.03), capCost('iron', 1.05)],
    },
    {
      id: 'iron.basicLining', sector: 'iron', kind: 'efficiency',
      name: 'Basic lining',
      blurb: 'Thomas and his cousin Gilchrist, 1877: a dolomite lining draws out the phosphorus. The commonest ore in Europe will do.',
      cost: 80_000, requires: ['iron.bessemer'],
      effects: [eta('iron', 1.1), capCost('iron', 0.9), sat('iron', 1.1)],
    },
  ),

  {
    /* The growth card, as Steam's "Another engine works": cheap, repeatable, and itself a rebound. */
    id: 'iron.anotherFurnace', sector: 'iron', kind: 'capital',
    name: 'Blow in another furnace',
    blurb: 'One more furnace in blast, each a little cheaper to build than the last. The market report counts them weekly.',
    cost: 1_500, repeatable: true, costGrowth: 1.25, maxLevel: 30, effects: [capCost('iron', 0.97)],
  },
  {
    id: 'iron.rollingMill', sector: 'iron', kind: 'capital',
    name: 'Rolling mill',
    blurb: 'After Cort: grooved rolls press bar and rail from the puddled bloom, where the forge hammer used to beat it out.',
    cost: 8_000, requires: ['iron.hotBlast'], effects: [capCost('iron', 0.85)],
  },
  {
    /* Heavy forgings: cheaper iron, and more of it for the shipyards (the plate use grows). */
    id: 'iron.steamHammer', sector: 'iron', kind: 'capital',
    name: 'Steam hammer',
    blurb: 'Nasmyth’s design of 1839, Bourdon’s at Le Creusot the year after. Forgings of any size the shipyards care to order.',
    cost: 30_000, requires: ['iron.rollingMill'], effects: [capCost('iron', 0.9), sat('iron', 1.1, 'iron.shipPlate')],
  },
  {
    /*
     * Research (design §4.3): The Coal Question, chapter VII, on iron. It is meant to add the order book's projection
     * lines to the use cards, as Steam's card turns on the projections. CONTRACT GAP: no effect does that per Industry
     * (`reveal` is global and Steam's card set it in run 1), so it carries `reveal` (a harmless no-op by run 4) until
     * the core or UI reads "owns iron.economyOfFuel" for the feed lines, or the contract adds an effect. Name: the
     * chapter's own title ("Of the Economy of Fuel"), as the style guide quotes it.
     */
    id: 'iron.economyOfFuel', sector: 'iron', kind: 'research',
    name: 'Of the Economy of Fuel',
    blurb: 'Mr Jevons on Scottish iron: coal per ton cut to under a third, and the trade’s whole consumption up tenfold.',
    cost: 12_000, requires: ['iron.hotBlast'], effects: [{ type: 'reveal' }],
  },
], {
  'iron.hotBlast': [1, 'Hot-blast stoves'],
  'iron.bessemer': [2, 'Converter shed'],
  'iron.siemens': [3, 'Open-hearth shop'],
});

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

/*
 * Costs a little above Light's and below Motion's (Iron opens at about hour 3, between them in the game's Mandate
 * economy). Repeat tables from helpers.ts (REPEAT by kind).
 */
const ironLevers: LeverDef[] = [
  lever({
    id: 'iron.cokeDuty', sector: 'iron', kind: 'duty',
    name: 'Coke duty',
    /* Jevons [V, energy.md §1.5]: the quotation in the blurb, attributed (catch lines do not quote people). */
    blurb: 'A duty on furnace coke. “A small tax on the ton of coal would be a heavy tax on the ton of iron”, wrote Mr Jevons.',
    catch: `Iron stays dear, and so do the rails and plate made of it. The ironmasters agree, loudly. ${DIVIDEND}`,
    values: DUTY_VALUES, cost: 200, upkeep: 0.1, label: DUTY_LABEL, recycle: RECYCLE,
    recycleBlurb: { commons: 'Spent on a mechanics’ institute, built of iron girders and heated by the works.' },
  }),
  lever({
    id: 'iron.licences', sector: 'iron', kind: 'cap',
    requires: ['budget'],
    name: 'Furnace licences',
    blurb: 'A licence for every furnace in blast, issued against the budget line and fewer each decade.',
    catch: `Refused a licence, a furnace is blown in across the county boundary instead. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 210, upkeep: 0.1, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
    recycleBlurb: { commons: 'Licence money for the Commons. The new bandstand is cast iron, and so is the park railing.' },
  }),
  lever({
    id: 'iron.buildToLast', sector: 'iron', kind: 'sufficiency',
    name: 'Build to last',
    blurb: 'The Sheffield standard as policy: rails, plate and girders made to outlast the men who order them.',
    catch: 'Fewer orders for the works, and longer between them. The income follows the orders.',
    values: SUFF_VALUES, value2: [0.002, 0.003, 0.004], cost: 160, upkeep: 0.04, label: SUFF_LABEL,
    repeat: { value2Step: 0.0005 },
  }),
  /*
   * The lever that bites back (design §4.3; Zink & Geyer, "Circular Economy Rebound", J. Industrial Ecology 21(3),
   * 2017: recycling that lowers the material's price can raise total production). Scrap returns a share of the coke
   * to Steam's reserve (circularity on a drawer: the owner is drained by R × (1 − share)); its side effect is cheaper
   * iron and more of it, satMul 1.12 on every Iron use × bite × level, unless the coke duty holds the price. At level 1
   * and full bite demand is 12% above bite 0 (exit criterion 7: ≥ 10%). Ramp about seven minutes, as Steam's.
   */
  lever({
    id: 'iron.scrapBounty', sector: 'iron', kind: 'circularity',
    name: 'Scrap bounty',
    blurb: 'A bounty on old rails, boilers and hulls brought back to the furnace, so the coke goes further.',
    catch: 'Scrap is cheaper than pig: without a duty on coke the price of iron falls, and the works sell more.',
    values: SHARE_VALUES, cost: 150, upkeep: 0.04, label: 'Remelt {pct}% as scrap',
    sideEffects: {
      effects: [sat('iron', 1.12)],
      rampYears: 20, decayYears: 30,
      unless: { owns: 'iron.cokeDuty' },
      blurb: 'Cheap scrap makes cheap iron, and the works sell more of it.',
      unlessLabel: 'unless the coke duty is in force',
    },
  }),
  /*
   * Substitution at a premium (1.5 × c per ton): a share of the iron made without coke and without smoke, up to a flow
   * cap. A modest lever, the restraint player's first (design); the Inspector of Furnaces Institution (Act lane) starts
   * it at level 1. Flow caps sized against Iron's opening demand (about 200 tons per head).
   */
  lever({
    id: 'iron.smokeInspector', sector: 'iron', kind: 'substitution',
    name: 'Smoke inspector',
    blurb: 'An inspector at every works, insisting on the clean old ways where they still pay: charcoal, scrap and water.',
    catch: 'Dearer by the ton, and there is only so much charcoal in the kingdom.',
    values: SHARE_VALUES, value2: [300, 900, 2_500], cost: 140, upkeep: 0.05, label: 'Smelt {pct}% clean',
    repeat: { value2Step: 800 },
  }),
];

/* ------------------------------------------------------------------ */
/* HEADLINES (Content.sectorHeadlines): the iron market report         */
/* ------------------------------------------------------------------ */

const ironHeadlines: Partial<Record<HeadlineKey, string[]>> = {
  efficiency: [
    'Hot blast saves a third of the coke; ironmasters blow in three more',
    'Coke per ton at a record low; coke per year at a record high',
    'Pig iron firm at Wolverhampton; three furnaces blown in',
    'Thriftier furnace shown at the works; visiting masters order four',
    'Less coke to the ton, and the order book longer than ever',
    'Ironmasters report a saving on fuel, and spend it on furnaces',
    'Bar iron easier at Dudley; the cheaper ton finds new buyers',
  ],
  sectorOpened: [
    'Iron by the ton: a market report opens with prices current',
    'Furnace blown in at Ravensdale; the night sky turns orange',
    'Ironworks opened by the canal; the first cast drawn by lamplight',
  ],
  appAvailable: [
    'Iron cheap enough for {app}; engineers sharpen their pencils',
    'Market report: inquiries for {app} brisk',
    'Ironmasters quote a price for {app}; buyers ask for it in writing',
    'Talk at the iron exchange is of {app}, and of little else',
    'Prospectus for {app} printed on the strength of cheap pig',
  ],
  appFounded: [
    'First orders for {app}; the works lit all night',
    'Ravensdale works lit all night; Dudley complains of the glare',
    '{app} in hand; the order book runs to a second volume',
    'Shareholders told {app} will “pay for the furnace twice over”',
    'Market report: {app} takes all the bar iron offered',
  ],
  backfire: [
    'Coke per ton down by half; the kingdom smelts twice the iron',
    'Thriftiest furnaces in the world, and more of them every year',
    'Less coal to the ton of iron; more coal to the iron trade',
  ],
  crisis: [
    'The Orange Night: the sky over the works glows until morning',
    'Orange Night No. {n}: Dudley reads its newspaper at midnight',
    'The Slag Slide: a tip gives way across the canal towpath',
    'Smoke and glare over the furnaces; the infirmary fills',
    'Slag heap slips into the cut; barges held at the lock',
  ],
  collapse: [
    'The furnaces stop; the valley cannot breathe beside them',
    'Works damped down in their own smoke; the market report is blank',
    'Slag over the canal, smoke over the town; the furnaces go out',
  ],
  exhausted: [
    'No coke at any price; the furnaces are blown out one by one',
    'The coal is gone, and the iron trade with it',
    'Market report: pig iron unquoted, for want of coke',
  ],
  leverEnacted: [
    'Iron measure carried; ironmasters warn of ruin, then of Belgium',
    'Inspectors to visit every works; the ironmasters lay on lunch',
    'Furnace order passes; the market report notes it on page two',
    'The House acts on iron; the ironmasters act aggrieved',
    'Order in Council for the ironworks; Ravensdale takes counsel',
  ],
  leverLapsed: [
    'Iron measure lapses; three furnaces blown in by Monday',
    'Inspectors recalled from the works; the glare returns',
    'The House lets the furnace order die; pig iron eases a shilling',
  ],
  steadySector: [
    'Fifty years at the same make of iron; the market report runs short',
    'Iron & Steel holds steady: furnaces in blast counted, not added',
  ],
  budgetDrawn: [
    'A coke budget for the ironworks: so many tons, and fewer',
    'Treasury rations the furnaces; ironmasters call it “a novelty”',
  ],
  decade: [
    'Iron held to its coke budget for decade {n}; the rails still laid',
    'Decade {n} on the line; the furnaces in blast unchanged',
  ],
  budgetBroken: [
    'Coke budget broken; ironmasters blame a rush of orders',
    'Over the line on coke; the order book wins the argument',
  ],
  reckoning: [
    'An inquiry into the iron trade sits; the evidence weighs a ton',
    'The ironworks’ ledgers read aloud, from the first furnace on',
  ],
  /* M2 */
  clearSkies: [
    'Night falls dark over Dudley; residents step out to look',
    'Slag tips grassed over; the glare gone from the night sky',
    'Stars seen over the furnaces; the night watchman is uneasy',
  ],
  settled: [
    'Iron & Steel settled: the furnaces banked to the order book',
    'Ironmasters agree to stay the size they are; Belgium unmoved',
    'No furnace blown in this year, by agreement; the yard is quiet',
  ],
  /* M3 */
  biteBack: [
    'Scrap bounty cheapens iron; the works sell more of it',
    'Old rails melted down, new rails laid twice as far',
    'Market report: scrap plentiful, pig easier, orders up',
  ],
  unsettled: [
    'Iron settlement lapses; furnaces blown in up and down the valley',
    'The town outgrows its iron agreement; three furnaces lit by Friday',
    'Iron & Steel unsettled; the order book reopens by return',
  ],
};

/* ------------------------------------------------------------------ */
/* DECADE DIVIDENDS (Iron's own pairs; option 0 the modest one)        */
/* ------------------------------------------------------------------ */

/*
 * Offered only in Iron's steady.decadeChoices (above). To be registered with the other dividends by the Act lane
 * (design/scratch/m4-registry-iron.md). Magnitudes as Light's pairs: a 4–5% shift on one use or the Industry.
 */
export const ironDividends: DividendDef[] = [
  {
    id: 'div.iron.bankedFurnaces', name: 'Banked furnaces',
    blurb: 'A furnace banked every Sunday, by agreement. The night shift sees its families, and the works makes a little less.',
    effects: [sat('iron', 0.96)],
  },
  {
    id: 'div.iron.railRebate', name: 'A rebate on rails',
    blurb: 'The decade’s savings returned as cheaper rails. Another branch line is promoted by the spring.',
    effects: [half('iron', 1.05, 'iron.rails')],
  },
  {
    id: 'div.iron.slagFund', name: 'A slag fund',
    blurb: 'The tips levelled and planted and the canal dredged. The dust settles sooner over the town.',
    effects: [absorb('iron', 0.0006)],
  },
  {
    id: 'div.iron.blowingIn', name: 'A furnace blown in',
    blurb: 'The savings spent on one more furnace in blast. Cheaper iron, for anyone who cares to order it.',
    effects: [capCost('iron', 0.95)],
  },
];

export const iron: SectorContent = {
  def: sector, upgrades: ironUpgrades, levers: ironLevers, headlines: ironHeadlines,
};
