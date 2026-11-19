/**
 * Steam (on screen an Industry): its SectorDef and applications, upgrades, levers and its own headlines.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { HeadlineKey, LeverDef, SectorDef, UpgradeDef } from '../../types';
import {
  eta, capCost, margin, reserve, absorb, sat, chain, fork, lever, withStages, decadeSequence, RECYCLE, DUTY_LABEL, CAP_LABEL, CAP_FIRST, SUFF_LABEL,
  CAP_VALUES, CAP_LEAK, DUTY_VALUES, SUFF_VALUES, SHARE_VALUES, DIVIDEND,
} from '../helpers';
import type { SectorContent } from '../helpers';
import { proprietorCard } from '../proprietor';

/* ------------------------------------------------------------------ */
/* STEAM: the Industry                                                 */
/* ------------------------------------------------------------------ */

/*
 * Steam's later applications are steeper and cheaper-to-half than v1 (balance finding 2): the uses founded by
 * mid-run stay price-elastic, so the direct rebound shows on the shadow meter. Pumping's reserve gain is 0.15
 * (finding 1): gain × η × pumping's share of demand stays under 1 everywhere: alone, after Better boilers, with every
 * Steam know-how node maxed (η ≈ 1.5 × 3.5): 0.78; late, η ≈ 27 × 3.5 and a share under 2%: about 0.25.
 * The content lint checks both ends.
 */
const sector: SectorDef = {
  id: 'steam',
  name: 'Steam',
  years: '1780–1870',
  firstYear: 1780,
  tagline: 'One engine, one flooded pit, and a great deal of coal nobody is counting.',
  service: { name: 'Motive power', unit: 'hp' },
  resource: { name: 'Coal', unit: 'tons', unitSingular: 'ton' },
  pressure: { name: 'Smoke', crisisName: 'The Black Fog' },
  accent: 'iron',

  basePrice: 1,
  capCost: 0.04,
  margin: 0.2,
  baseEta: 1,
  autoEtaRate: 0,

  resourceKind: 'stock',
  reserve: 380_000,
  alpha: 0.25,

  pressureSource: 'resource',
  pressureIntensity: 0.0010,
  absorption: 0.008,
  collapseAt: 100,
  crisisAt: [0.4, 0.7, 0.88],
  /* M2 balance: 22, not 40. The boom's smoke costs wellbeing, but not so much that burning pays no better than
   * restraint in run 1 (backfire's lead was 1.04×; owner decision D1 wants at least 1.2×). */
  pressureWellbeingCost: 22,
  pressureUpkeep: 0,

  wellbeingWeight: 12,
  wellbeingScale: 70,

  /*
   * M2: clear skies at 0.3 of the drawn pressure (between 1% and 25% of collapse; M2 balance: 0.3, not the global 0.5,
   * which gave the first Steady State at 2.6 h against 3–4). A Gentle line drawn at 12 minutes takes about 75 minutes to
   * get there; slack recovery stretches the coal but not the air, so it is water wheels, temperance and the absorption
   * Institutions that reach the sink sooner.
   */
  steady: {
    clearBelow: 0.3,
    decadeChoices: decadeSequence([
      ['div.steam.pitheadBaths', 'div.steam.dividendInCoal'],
      ['div.steam.smokeFund', 'div.steam.engineBounty'],
      ['div.steam.sabbath', 'div.steam.cheapTickets'],
    ]),
  },

  /*
   * M2: Settlement. Standing while settled: Mandate a tenth easier and a point of wellbeing; once a run on the first
   * settlement, a purse of Mandate for the next Industry. Defence: 0.2 Mandate/s per unit of excess (a 30% larger
   * town than on the day settled costs 0.05/s, against a restraint player's 0.3–0.5/s).
   */
  settle: {
    dividend: [{ type: 'mandateRateMul', value: 1.1 }, { type: 'wellbeingAdd', value: 1 }, { type: 'mandateAdd', value: 300 }],
    upkeepPerSpill: 0.2,
    freeExcess: 0.05,
    blurb: 'The engines turn at a rate the sky can take. The Gazette now prints the tonnage once a year, on page six.',
  },

  /*
   * M3: the seams (SeamDef). Below the workings the run starts on (`reserve`, 380,000 tons, unchanged from M2, so a run
   * that sinks nothing ends as before: the efficiency player's run 1 still exhausts at about 39 minutes) lie six seams of
   * the Durham sequence, top to bottom, together six times the opening reserve. Each is dearer to raise (priceMul: the
   * deepest seam sunk prices all the coal) and reachable only once pumping is cheap enough (reachBelow, a service
   * price): the condenser brings the first two within reach, the Cornish engine the Hutton. Sinking is the player's
   * decision (the Market never sinks), gated by the feature 'seams' (features.ts: run 4 or later, once the first seam
   * is within reach). Sinking postpones exhaustion and enlarges the burn: the supply-side rebound.
   * Depths: the shaft of Murton Colliery, Co. Durham (sunk 1838–43), won the Five-Quarter at 178 fathoms, the Main coal
   * at 204, the Low Main at 226 and the Hutton at 246 (Durham Mining Museum via co-curate.ncl.ac.uk, checked 19 Nov
   * 2026). The Busty and Brockwell lie below the Hutton (Durham Coalfield stratigraphy); their depths are not printed.
   * Balance knobs: tons (how long each seam postpones exhaustion), cost (capital), priceMul (how much dearer the whole
   * reserve becomes), reachBelow (which engine reaches it). Under the M2 core seams do nothing.
   */
  seams: [
    {
      id: 'steam.seam.fiveQuarter', name: 'Five-Quarter seam', depth: '178 fathoms',
      blurb: 'The first seam below the old workings. Wet, and near enough for the pumps to keep dry.',
      tons: 120_000, cost: 2_000, priceMul: 1.1, reachBelow: 0.6, // the condenser reaches it
    },
    {
      id: 'steam.seam.main', name: 'Main coal', depth: '204 fathoms',
      blurb: 'Another 26 fathoms of shaft, and every one of them to be kept dry.',
      tons: 180_000, cost: 5_000, priceMul: 1.2, reachBelow: 0.45, // the double-acting engine
    },
    {
      id: 'steam.seam.lowMain', name: 'Low Main seam', depth: '226 fathoms',
      blurb: 'Deep enough that the pumps never stop, day or night.',
      tons: 260_000, cost: 12_000, priceMul: 1.35, reachBelow: 0.3, // high-pressure steam
    },
    {
      id: 'steam.seam.hutton', name: 'Hutton seam', depth: '246 fathoms',
      blurb: 'Down where only the best pumping engine keeps the water out.',
      tons: 380_000, cost: 30_000, priceMul: 1.55, reachBelow: 0.2, // the Cornish engine (or the compound)
    },
    {
      id: 'steam.seam.busty', name: 'Busty seam',
      blurb: 'Below the Hutton, and below what most owners will pay to reach.',
      tons: 550_000, cost: 70_000, priceMul: 1.8, reachBelow: 0.13, // triple expansion
    },
    {
      id: 'steam.seam.brockwell', name: 'Brockwell seam',
      blurb: 'The lowest workable coal in the field. Beneath it, nothing anyone would pay to raise.',
      tons: 800_000, cost: 160_000, priceMul: 2.1, reachBelow: 0.085, // the turbine age
    },
  ],
  mechanic: {
    name: 'The seams',
    rebound: 'Supply-side',
    blurb: 'Cheap pumping reaches deeper coal. Each seam sunk postpones the end, and enlarges the burn.',
  },

  applications: [
    {
      id: 'steam.pumping',
      name: 'Mine pumping',
      blurb: 'Keeps the pit dry. Dry pits go deeper. Deeper pits need more pumping.',
      icon: 'pump',
      halfPrice: 0.8,
      saturation: 50,
      steepness: 2.4,
      visibleBelow: Infinity,
      foundCost: 0,
      reserveGainPerService: 0.15,
    },
    {
      id: 'steam.mills',
      name: 'Cotton mills',
      blurb: 'No longer tied to a riverbank. They can go anywhere there is coal, and do.',
      icon: 'mill',
      halfPrice: 0.5,
      saturation: 220,
      steepness: 3,
      visibleBelow: 0.8,
      foundCost: 250,
    },
    {
      id: 'steam.winding',
      name: 'Winding engines',
      blurb: 'Haul the coal up as fast as the pumps let the men dig it. Faster, ideally.',
      icon: 'winder',
      halfPrice: 0.3,
      saturation: 700,
      steepness: 3.4,
      visibleBelow: 0.5,
      foundCost: 380,
    },
    {
      id: 'steam.railways',
      name: 'Railways',
      blurb: 'Coal, hauling coal, to the people who burn coal.',
      icon: 'train',
      halfPrice: 0.15,
      saturation: 3_000,
      steepness: 4,
      visibleBelow: 0.32,
      foundCost: 1_500,
    },
    {
      id: 'steam.steamships',
      name: 'Steamships',
      blurb: 'The trade winds are now optional. The coal bunkers are not.',
      icon: 'ship',
      halfPrice: 0.095,
      saturation: 12_000,
      steepness: 3.8,
      visibleBelow: 0.15,
      foundCost: 8_000,
    },
    {
      id: 'steam.ploughing',
      name: 'Steam ploughing',
      blurb: 'An engine at each headland and a plough hauled between them on a wire rope. The horses look on.',
      icon: 'plough',
      halfPrice: 0.052,
      saturation: 40_000,
      steepness: 4,
      visibleBelow: 0.09,
      foundCost: 30_000,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* UPGRADES                                                            */
/* ------------------------------------------------------------------ */

/* ---- Steam: chain to ×13; forks add up to ×2 more (max ≈ ×27, min ≈ ×19) ---- */
/* M2 stages (the scene's machines): Watt's condenser 1, high-pressure steam 2, the turbine hall 3. */
/* QA balance: the condenser £800 (not £1,000): a person reached it at 7:50 against a 4–6 minute target. */
const steamUpgrades: UpgradeDef[] = withStages([
  ...chain('steam', [180, 800, 2_200, 4_400, 14_000, 28_000, 56_000], [
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
    blurb: 'A monthly league table of every engine’s duty. Thrift becomes a sport; total coal is not scored.',
    cost: 1_700, requires: ['steam.condenser'], effects: [eta('steam', 1.1)],
  },

  /* Fork 1: the genuine article on royalty, or a pirate copy. */
  ...fork(
    {
      id: 'steam.bwLicence', sector: 'steam', kind: 'efficiency',
      name: 'Boulton & Watt licence',
      blurb: 'The genuine article, for a third of the value of the coal it saves. Soho takes its cut of every ton you do not burn.',
      cost: 1_600, requires: ['steam.condenser'],
      effects: [eta('steam', 1.25), margin('steam', -0.04)],
    },
    {
      id: 'steam.pirateEngine', sector: 'steam', kind: 'capital',
      name: 'Pirate engine',
      blurb: 'Nearly a Watt, from Bull or Hornblower, and no royalty to pay. Every pit in the county can afford one now.',
      cost: 1_000, requires: ['steam.condenser'],
      effects: [eta('steam', 1.1), capCost('steam', 0.8)],
    },
  ),

  /* Fork 2: the Railway Bill. */
  ...fork(
    {
      id: 'steam.parliamentaryTrains', sector: 'steam', kind: 'capital',
      name: 'Parliamentary trains',
      blurb: 'Railway Regulation Act, 1844: one train each way daily at a penny a mile. Third class fills every carriage.',
      cost: 3_000, requires: ['steam.doubleActing'],
      effects: [sat('steam', 1.5, 'steam.railways'), margin('steam', -0.02)],
    },
    {
      id: 'steam.firstClass', sector: 'steam', kind: 'capital',
      name: 'First-class lines',
      blurb: 'Upholstered carriages for those who can pay. Fewer passengers, fatter fares, and the fares build the next line.',
      cost: 3_000, requires: ['steam.doubleActing'],
      effects: [sat('steam', 0.8, 'steam.railways'), margin('steam', 0.03)],
    },
  ),

  /* Fork 3: whose engine — the deep mine's or the mill's. */
  ...fork(
    {
      id: 'steam.cornishEngine', sector: 'steam', kind: 'efficiency',
      name: 'Cornish engine',
      blurb: 'Expansive working, lagged, tuned and reported on monthly. The mines go deeper to make use of it.',
      cost: 6_500, requires: ['steam.highPressure'],
      effects: [eta('steam', 1.3), sat('steam', 1.5, 'steam.pumping')],
    },
    {
      id: 'steam.corliss', sector: 'steam', kind: 'efficiency',
      name: 'Corliss valve gear',
      blurb: 'Corliss, 1849: the valve shuts the moment the work is done. Mill owners order the larger size.',
      cost: 6_500, requires: ['steam.highPressure'],
      effects: [eta('steam', 1.25), sat('steam', 1.25, 'steam.mills')],
    },
  ),

  /* Fork 4: the long route east. */
  ...fork(
    {
      id: 'steam.suez', sector: 'steam', kind: 'capital',
      name: 'Suez Canal shares',
      blurb: 'Suez, 1869: Bombay some four thousand miles nearer, and no use to a sailing ship. The sailings multiply.',
      cost: 16_000, requires: ['steam.compound'],
      effects: [sat('steam', 1.3, 'steam.steamships')],
    },
    {
      id: 'steam.auxiliarySail', sector: 'steam', kind: 'efficiency',
      name: 'Auxiliary sail',
      blurb: 'Keep the masts: steam in the calms, canvas in the trades. Freight rates fall, and freight rises to meet them.',
      cost: 16_000, requires: ['steam.compound'],
      effects: [eta('steam', 1.15), sat('steam', 1.1, 'steam.steamships')],
    },
  ),

  /*
   * Fork 5 (M2): locked; only a Charter (charter.smokeInquiry) unlocks it. Burn the smoke, or blow the fire harder.
   * Neither is bought by the Market (it never buys a card with `excludes`).
   */
  ...fork(
    {
      id: 'steam.smokeFurnace', sector: 'steam', kind: 'efficiency', locked: true,
      name: 'Smoke-consuming furnace',
      blurb: 'A second draught of air over the fire, so the furnace burns its own smoke. A little thriftier, and the washing stays white.',
      cost: 4_500, requires: ['steam.doubleActing'],
      effects: [eta('steam', 1.05), absorb('steam', 0.0015)],
    },
    {
      id: 'steam.forcedDraught', sector: 'steam', kind: 'efficiency', locked: true,
      name: 'Forced draught',
      blurb: 'A fan under the grate and the fire roars. More steam from every boiler, and the boiler makers take orders for larger ones.',
      cost: 4_500, requires: ['steam.doubleActing'],
      effects: [eta('steam', 1.15), sat('steam', 1.05)],
    },
  ),

  {
    /* The growth card (genre audit rec. 2): cheap, repeatable, and itself a rebound: cheaper engines, more engines. */
    id: 'steam.anotherEngine', sector: 'steam', kind: 'capital',
    name: 'Another engine works',
    blurb: 'Another engine at another pit, each a little cheaper to build than the last. There is always room for one more.',
    cost: 200, repeatable: true, costGrowth: 1.3, maxLevel: 25, effects: [capCost('steam', 0.97)],
  },
  {
    id: 'steam.lathe', sector: 'steam', kind: 'capital',
    name: 'Screw-cutting lathe',
    blurb: 'Maudslay’s lathe. Parts that fit first time make engines cheap, and cheap engines common.',
    cost: 500, requires: ['steam.boilers'], effects: [capCost('steam', 0.8)],
  },
  {
    id: 'steam.limitedLiability', sector: 'steam', kind: 'capital',
    name: 'Limited liability',
    blurb: 'Limited Liability Act, 1855. Other people’s money, without the debtors’ prison.',
    cost: 7_500, requires: ['steam.highPressure'], effects: [margin('steam', 0.03)],
  },
  {
    id: 'steam.deeperShaft', sector: 'steam', kind: 'prospect',
    name: 'Sink a deeper shaft',
    blurb: 'There is always more coal, a little further down, a little dearer.',
    cost: 1_500, repeatable: true, costGrowth: 2.2, maxLevel: 6,
    effects: [reserve('steam', 0.25)],
  },
  {
    id: 'steam.coalQuestion', sector: 'steam', kind: 'research',
    name: 'The Coal Question',
    blurb: 'Mr Jevons, 1865: an inquiry into the probable exhaustion of our coal-mines. Chapter VII asks whether thriftier engines will save them.',
    cost: 1_600, requires: ['steam.condenser'], effects: [{ type: 'reveal' }],
  },
  /*
   * M3: The Proprietor's Day (shift 3, the second reveal). Visible once the household survey has arrived (feature
   * 'survey', about hour 6) and three sessions are on file on each side of the Market's arrival, until it has been
   * bought once in the save (the permanent 'proprietor' flag): it publishes the return. Text verbatim from
   * proprietor.ts (the archive lane). About £40,000 of Steam money at hour 7 (design/paradigm-shifts.md).
   */
  {
    id: 'steam.proprietorsDay', sector: 'steam', kind: 'research',
    name: proprietorCard.name,
    blurb: proprietorCard.blurb,
    cost: 40_000,
    when: {
      all: [
        { feature: 'survey' },
        { returned: 'household', figure: 'sessionsBefore', op: '>=', value: 3 },
        { returned: 'household', figure: 'sessionsAfter', op: '>=', value: 3 },
        { not: { flag: 'proprietor' } },
      ],
    },
    effects: [{ type: 'metaFlag', flag: 'proprietor' }],
  },
], { 'steam.condenser': [1, 'Watt engine'], 'steam.highPressure': [2, 'Cornish engine'], 'steam.turbine': [3, 'Turbine hall'] });

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

const steamLevers: LeverDef[] = [
  /* ---- Steam ---- */
  lever({
    id: 'steam.duty', sector: 'steam', kind: 'duty',
    name: 'Coal duty',
    blurb: 'A duty on every ton, raised as the engines improve, so that power stays dear. London has taxed coal for centuries.',
    catch: `Cheaper engines no longer mean cheaper power. Nor more income. ${DIVIDEND}`,
    values: DUTY_VALUES, cost: 100, upkeep: 0.05, label: DUTY_LABEL, recycle: RECYCLE,
    recycleBlurb: { commons: 'Spent on baths and libraries instead, heated and lit by coal, and full every evening.' },
  }),
  lever({
    id: 'steam.cap', sector: 'steam', kind: 'cap',
    requires: ['budget'],
    name: 'Smoke abatement',
    blurb: 'A ceiling on coal burned in the borough, falling with the budget line. Permits for whatever is under it.',
    catch: `Set it far below demand and the furnaces move just outside the borough. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 120, upkeep: 0.06, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
    recycleBlurb: { commons: 'Permit money for the town’s Commons. The new park raises the rents round it, as parks do.' },
  }),
  lever({
    id: 'steam.sufficiency', sector: 'steam', kind: 'sufficiency',
    name: 'Temperance pledge',
    blurb: 'Sermons, societies and pamphlets in favour of wanting a little less.',
    catch: 'Slow to take. Appetite, once lowered, buys less of everything you sell.',
    values: SUFF_VALUES, value2: [0.002, 0.003, 0.004], cost: 80, upkeep: 0.02, label: SUFF_LABEL,
    repeat: { value2Step: 0.0005 },
  }),
  lever({
    id: 'steam.circularity', sector: 'steam', kind: 'circularity',
    requires: ['moreLevers'],
    name: 'Slack recovery',
    blurb: 'Burn the dust and the cinders the pit used to tip on the spoil heap.',
    catch: 'It stretches the coal, not the air: every ton recovered is burned in its turn, smoke and all.',
    values: SHARE_VALUES, cost: 90, upkeep: 0.02, label: 'Recover {pct}% of the burn',
  }),
  lever({
    id: 'steam.substitution', sector: 'steam', kind: 'substitution',
    requires: ['moreLevers'],
    name: 'Water wheels & wind',
    blurb: 'Keep the old mills turning on the river and the breeze.',
    catch: 'Dearer per horsepower, and the river only flows so fast.',
    values: SHARE_VALUES, value2: [100, 300, 800], cost: 110, upkeep: 0.05, label: 'Supply {pct}% by river',
    repeat: { value2Step: 300 },
  }),
  /*
   * M3: the lever that bites back. A cheaper, gentler duty that taxes the hearth and exempts "productive use"; the
   * exempt trades grow on untaxed coal (satMul on the mills, the winding engines and the railways, × bite × level),
   * unless the smoke abatement cap holds the total. Arrives with the budget (run 3), so the cap it pairs with is on the
   * page with it; the 'sideEffects' feature (run 4 or later) adds the "bites back" line.
   */
  lever({
    id: 'steam.exemptDuty', sector: 'steam', kind: 'duty',
    requires: ['budget'],
    name: 'Duty with exemptions',
    blurb: 'A duty on household coal only. Coal for mills, mines and railways goes free, as productive use.',
    catch: `The exempt trades grow on untaxed coal, and grow faster the higher the duty. ${DIVIDEND}`,
    values: [0.2, 0.4, 0.6], cost: 60, upkeep: 0.03, label: DUTY_LABEL, recycle: RECYCLE,
    recycleBlurb: { commons: 'Spent on the Commons, which are heated with coal from the exempt pits.' },
    sideEffects: {
      effects: [sat('steam', 1.12, 'steam.mills'), sat('steam', 1.1, 'steam.winding'), sat('steam', 1.1, 'steam.railways')],
      rampYears: 20, decayYears: 30, // about seven minutes to most of its strength; ten to fade
      unless: { owns: 'steam.cap' },
      blurb: 'Exempt mills and railways grow on untaxed coal.',
      unlessLabel: 'unless the smoke abatement cap holds the total',
    },
  }),
];

/* ------------------------------------------------------------------ */
/* HEADLINES (Content.sectorHeadlines)                                 */
/* ------------------------------------------------------------------ */

const steamHeadlines: Partial<Record<HeadlineKey, string[]>> = {
  efficiency: [
    'Engines thriftier than ever; collieries report record sales',
    'Duty of engines up again; coal owners delighted',
    'Mill owners hail the thrifty engine and order three more',
    'New engine saves a third of the coal; pits sink new shafts',
    'Coal per horsepower at a record low; coal per year at a record high',
    'A new champion of the duty tables; the runner-up orders two',
    'Thrifty engine shown at the Exchange; buyers stand three deep',
    'Coal saved by the new engine “enough to fire another”, says agent',
  ],
  sectorOpened: [
    'Power by the ton: a new trade in motive force',
    'Engine house raised over a flooded pit; the pit is pleased',
    'Fire engine draws crowds; owner sells power by the hour',
  ],
  appAvailable: [
    'Prospectus issued for {app}; the coffee houses fill',
    'Cheap power brings {app} within reach of the provinces',
    'Talk on the Exchange is of {app}, and little else',
    'Subscription opened for {app}; the list closes by noon',
    'Speculators eye {app}; the engine makers eye the speculators',
    '{app} “a sound investment”, say the men who sell engines',
  ],
  appFounded: [
    'Coal owners raise a glass to {app}',
    'Shareholders in {app} promised a dividend “and smoke”',
    'First returns from {app}: excellent, and sooty',
    '{app} opened with a sermon on progress and a cold collation',
    'Colliery agents take a second office on the strength of {app}',
    'Orders for coal double; {app} getting up steam',
  ],
  /* On buying The Coal Question: Jevons's verified words (design/research/energy.md 1.6; Econlib text, ch. VII). */
  reveal: [
    '“The very contrary is the truth”: Mr Jevons on thrifty engines',
    'Economy of fuel “a confusion of ideas”, writes Mr Jevons',
    'Jevons: “the whole history of the steam-engine is one of economy”',
    'Mr Jevons on the economy of fuel; the clubs are not amused',
  ],
  backfire: [
    'Engines use half the coal; the nation burns twice as much',
    'Thrift in the engine house, extravagance at the pithead',
    'Collieries report a record year, thanks to the thrifty engine',
    'Coal saved at every engine; more coal sold than ever',
  ],
  crisis: [
    'Fog so thick the cattle choke at market',
    'Black fog: lamps lit at noon, and nobody can see them',
    'Infirmaries full; physicians blame the smoke, owners the weather',
    'Black fog No. {n}: the shops shut, the chimneys do not',
    'Smoke so dense the river cannot be found, says waterman',
    'Washing hung out white, taken in grey; laundresses give up',
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
    'Notice in the merchants’ window: no coal, at any price',
  ],
  leverEnacted: [
    'Coal bill passes the Commons; the Lords sigh and agree',
    'New coal measure; owners threaten to take their engines abroad',
    'Act of Parliament to take effect from Lady Day',
    'The borough adopts the measure; the mill owners adopt a grievance',
    'Measure carried; the coal owners’ dinner is cancelled',
    'Petitions for and against arrive by the same post',
  ],
  leverLapsed: [
    'Coal measure lapses; the owners’ dinner is back on',
    'Act repealed after a petition of forty thousand names',
    'Inspectors withdrawn; the chimneys resume their old habits',
    'The Commons lets the measure die at the end of the session',
  ],
  budgetDrawn: [
    'A coal budget for the valley: so many tons, and fewer each decade',
    'Treasury draws a line under coal; owners call it “arithmetic”',
    'Tonnage fixed by the Treasury; smoke inspectors sharpen pencils',
  ],
  decade: [
    'Coal held to budget for decade {n}; mills still turning',
    'Collieries report a dull decade, to the Treasury’s delight',
    'Decade {n} inside the coal budget; the smoke thins, a little',
    'Ten years on the line, and nobody in the valley went without',
  ],
  budgetBroken: [
    'Coal budget broken; owners blame a cold winter',
    'The line is crossed; a decade’s thrift goes up the chimney',
    'More coal burned than allowed; the Treasury “disappointed”',
  ],
  steadySector: [
    'Fifty years on the line: Steam steadies, and the valley breathes',
    'The engines turn, the coal lasts, and the smoke has thinned',
    'Half a century of steady coal; the Gazette runs short of news',
  ],
  reckoning: [
    'Commission on the coal trade sits; the minutes run to volumes',
    'The valley’s accounts read aloud, from the first engine on',
    'Inquiry into coal finds that everyone was thrifty',
  ],
  /* M2 */
  clearSkies: [
    'Blue sky over the valley; colliers stop on the way home to look',
    'Washing hung out white, taken in white; laundresses astonished',
    'The smoke thins to what the wind can carry; the hills reappear',
  ],
  settled: [
    'Steam settled: so many tons a year, and not a ton more',
    'Coal trade agrees to stay the size it is; the Exchange is very quiet',
    'Engines held at a rate the sky can take; engine makers sulk',
  ],
  /* M3 */
  seamSunk: [
    '{name} won at last; the sinkers are given a dinner',
    '{name} reached; the pumps work twice as hard and the coal is dearer',
    '{name} opened; the valley’s coal “good for another generation”',
    'Colliery Gazette: {name} reached, and the reserve is restored',
  ],
  biteBack: [
    'Exempt mills multiply; the hearth pays the duty, the mill does not',
    'Productive use found to include almost everything; mills order engines',
    'Untaxed coal for the trades; the trades grow to burn it',
  ],
  unsettled: [
    'Coal settlement lapses; every pit in the valley lights up again',
    'The town has outgrown its coal agreement; the agreement goes',
    'Steam unsettled; owners order three more engines by return',
  ],
};

export const steam: SectorContent = {
  def: sector, upgrades: steamUpgrades, levers: steamLevers, headlines: steamHeadlines,
};
