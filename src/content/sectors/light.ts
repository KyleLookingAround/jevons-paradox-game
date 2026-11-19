/**
 * Light (on screen an Industry): its SectorDef and applications, upgrades, levers and its own headlines.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { HeadlineKey, LeverDef, SectorDef, UpgradeDef } from '../../types';
import {
  eta, capCost, margin, reserve, sat, half, chain, fork, ladder, lever, withStages, decadeSequence, RECYCLE, DUTY_LABEL, CAP_LABEL, CAP_FIRST,
  SUFF_LABEL, CAP_VALUES, CAP_LEAK, DUTY_VALUES, SUFF_VALUES, SHARE_VALUES, GREEN_VALUES, DIVIDEND,
} from '../helpers';
import type { SectorContent } from '../helpers';

/* ------------------------------------------------------------------ */
/* LIGHT: the Industry                                                 */
/* ------------------------------------------------------------------ */

const sector: SectorDef = {
  id: 'light',
  name: 'Light',
  years: '1870–1950',
  firstYear: 1870,
  tagline: 'The night is abolished by order of the gas company.',
  service: { name: 'Light', unit: 'klm·h' },
  resource: { name: 'Town gas & current', unit: 'therms', unitSingular: 'therm' },
  pressure: { name: 'Fog', crisisName: 'The Pea-Souper' },
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

  wellbeingWeight: 2.5,
  wellbeingScale: 500,

  /*
   * M2: clear skies at the global half of the drawn pressure. Light's fog is Steam's smoke by another route (the gas is
   * cooked from coal), so the sink comes from hydro, lights out and the gasworks' rebuild, not the allowance alone.
   */
  steady: {
    clearBelow: 0.35,
    clearFloor: 0.006,
    decadeChoices: decadeSequence([
      ['div.light.earlyClosing', 'div.light.lateOpening'],
      ['div.light.fogWardens', 'div.light.meterRebate'],
    ]),
  },

  /*
   * M2: Settlement. Standing while settled: the Commons yield a tenth more (a settled gas company lights the library at
   * cost) and most of a point of wellbeing; once a run, a purse of capital. Defence 0.25 Mandate/s per unit of excess:
   * the lit Commons (the library, the clock) add their own demand to a settled Light, so building them costs defence.
   */
  settle: {
    dividend: [{ type: 'commonsYieldMul', value: 1.1 }, { type: 'wellbeingAdd', value: 0.8 }, { type: 'capitalAdd', value: 120 }],
    upkeepPerSpill: 0.25,
    freeExcess: 0.05,
    blurb: 'The Board fixes the lamps at what the town needs and not a candle more. The lamplighter keeps his round.',
  },

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
      halfPrice: 0.8,
      saturation: 300,
      steepness: 2.4,
      visibleBelow: Infinity,
      foundCost: 0,
    },
    {
      id: 'light.nightShifts',
      name: 'Night shifts',
      blurb: 'The machines need not rest once the foreman can see them.',
      icon: 'factory-night',
      halfPrice: 0.45,
      saturation: 1_500,
      steepness: 3,
      visibleBelow: 0.7,
      foundCost: 8_000,
    },
    {
      id: 'light.trams',
      name: 'Electric trams',
      blurb: 'The power station is idle all afternoon. Sell the afternoon to the tramways.',
      icon: 'tram',
      halfPrice: 0.25,
      saturation: 6_000,
      steepness: 3.4,
      visibleBelow: 0.4,
      foundCost: 20_000,
    },
    {
      id: 'light.homes',
      name: 'Lit homes',
      blurb: 'Reading after dark, once a luxury, is now merely a habit.',
      icon: 'house',
      halfPrice: 0.15,
      saturation: 25_000,
      steepness: 3.6,
      visibleBelow: 0.24,
      foundCost: 40_000,
    },
    {
      id: 'light.shopSigns',
      name: 'Shop signs',
      blurb: 'Light that illuminates nothing in particular, all night, on purpose.',
      icon: 'sign',
      halfPrice: 0.08,
      saturation: 100_000,
      steepness: 3.8,
      visibleBelow: 0.13,
      foundCost: 150_000,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* UPGRADES                                                            */
/* ------------------------------------------------------------------ */

/* ---- Light: chain to ×32 ---- */
/* M2 stages (the scene's lamps): the incandescent mantle 1, the carbon filament 2, the fluorescent tube 3. */
const lightUpgrades: UpgradeDef[] = withStages([
  ...chain('light', ladder(2_500, 2.3, 6), [
    {
      id: 'light.batswing', name: 'Batswing burner', fold: 1.6,
      blurb: 'A slit in the jet fans the flame out. Brighter for the same gas.',
    },
    {
      id: 'light.mantle', name: 'Incandescent mantle', fold: 3.2,
      blurb: 'Welsbach’s little sock of thoria, glowing white in the flame. Gas lives to fight the bulb.',
    },
    {
      id: 'light.carbon', name: 'Carbon filament lamp', fold: 5.76,
      blurb: 'Swan and Edison, c. 1880. A thread of charcoal in a vacuum.',
    },
    {
      id: 'light.tungsten', name: 'Tungsten filament', fold: 9.8,
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
      name: 'Rebuild the gasworks',
      blurb: 'Bigger retorts, better holders, a mantle on every lamp-post. The parish lights every street, then the alleys.',
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
    name: 'Penny-slot meter',
    blurb: 'Gas for any household with a penny, and a reliable penny for the company.',
    cost: 15_000, requires: ['light.batswing'], effects: [margin('light', 0.03)],
  },
  {
    id: 'light.phoebus', sector: 'light', kind: 'capital',
    name: 'Lamp makers’ cartel',
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
], { 'light.mantle': 1, 'light.carbon': 2, 'light.fluorescent': 3 });

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

const lightLevers: LeverDef[] = [
  /* ---- Light ---- */
  lever({
    id: 'light.duty', sector: 'light', kind: 'duty',
    name: 'Lighting rate',
    blurb: 'A municipal rate on every therm, raised as the lamps improve.',
    catch: `The streets stay dimmer than they could. The ratepayers notice. ${DIVIDEND}`,
    values: DUTY_VALUES, cost: 160, upkeep: 0.08, label: DUTY_LABEL, recycle: RECYCLE,
    recycleBlurb: { commons: 'Spent on a reading room instead, lit until ten every night, and busier than the public house.' },
  }),
  lever({
    id: 'light.cap', sector: 'light', kind: 'cap',
    name: 'Gas allowance',
    blurb: 'So many therms a year for the whole town, a little fewer each decade, and permits to trade the rest.',
    catch: `Drafted from the gas companies’ own forecasts, it will not bite until it is tightened. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 170, upkeep: 0.08, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
    recycleBlurb: { commons: 'Permit money for the Commons. The new library is lit, the park has lamps, and the lamps want gas.' },
  }),
  lever({
    id: 'light.sufficiency', sector: 'light', kind: 'sufficiency',
    name: 'Lights out',
    blurb: 'Shop signs and empty offices go dark when the pubs do.',
    catch: 'Midnight comes for the night shift too, and for the takings.',
    values: SUFF_VALUES, value2: [0.002, 0.003, 0.004], cost: 130, upkeep: 0.03, label: SUFF_LABEL,
    repeat: { value2Step: 0.0005 },
  }),
  lever({
    id: 'light.greenSpending', sector: 'light', kind: 'greenSpending',
    name: 'Public parks',
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
];

/* ------------------------------------------------------------------ */
/* HEADLINES (Content.sectorHeadlines)                                 */
/* ------------------------------------------------------------------ */

const lightHeadlines: Partial<Record<HeadlineKey, string[]>> = {
  efficiency: [
    'Brighter for the same gas, say makers; gas company unalarmed',
    'New lamp gives four times the light; householders light four rooms',
    'Thriftier burner hailed; gas works orders a second holder',
    'Lamp makers promise a cheaper night; the night lengthens',
    'A brighter bulb for the same current; the meter turns as before',
    'Gas and current each cheaper by the year; the parish buys both',
  ],
  sectorOpened: [
    'Light by the therm: the new industry opens in {year}',
    'Gas laid on: the evening, it seems, is here to stay',
    'Lamplighters wanted. Apply after dark',
  ],
  appAvailable: [
    'Lighting committee considers {app}; the gas company considers it too',
    'Cheap light makes {app} a practical proposition',
    'Ratepayers petition for {app}; the gas company drafts the petition',
    'Engineers survey the borough for {app}',
    'Plans for {app} on view at the town hall, by gaslight',
  ],
  appFounded: [
    'Switched on tonight: {app}; crowds stay out past midnight',
    '{app} switched on; the night retreats another street',
    'The mayor throws the switch on {app}, and is photographed doing it',
    'Gas company dividend up on the strength of {app}',
    '{app} in service; the lamplighters ask a question',
  ],
  backfire: [
    'Lamps need a quarter of the gas; streets lit all night anyway',
    'Every room lit, every night: gas sales at a record',
    'Light four times cheaper; the borough buys ten times as much',
    'Thriftiest lamps in the kingdom, and the largest gas bill',
  ],
  crisis: [
    'Pea-souper: omnibus conductors walk ahead with torches',
    'Gasworks smoke and coal smoke meet in a yellow fog',
    'Fog at noon; the gas lamps light nothing but themselves',
    'Pea-souper No. {n}: theatres empty, infirmaries full',
    'Cabman lost in the fog finds himself two parishes away',
  ],
  collapse: [
    'Fog closes the city; the trams stop, the gas meters do not',
    'City dark at midday, lit at midnight, and no one can breathe',
    'Smoke closes the city; the gas company regrets nothing',
  ],
  exhausted: [
    'Gas holders empty; the street lamps go out one by one',
    'The works run out of coal to cook; the night returns',
    'Last therm sold. Candles, suddenly, a growth industry',
  ],
  leverEnacted: [
    'Corporation adopts the lighting order; the gas company “consults”',
    'Lighting rate set after a late sitting of the council',
    'New rules for the gas companies, drafted with their help',
    'Board of Trade issues an order; the meter men study it',
    'Lighting order in force; shopkeepers draw their blinds in protest',
  ],
  leverLapsed: [
    'Lighting order lapses; the shop signs blaze till dawn',
    'Council drops the rate after a stormy meeting',
    'Allowance quietly withdrawn; the gas company sends a calendar',
  ],
  budgetDrawn: [
    'Gas allowance fixed for the borough: so many therms, and fewer',
    'A ceiling on the city’s light; the gas company calls it “interesting”',
  ],
  decade: [
    'Ten years of light within the allowance; nobody read by candle',
    'Gas budget kept for decade {n}; the streets as bright as ever',
    'Decade {n} on the line; the gas holders stand half full',
  ],
  budgetBroken: [
    'Borough overshoots its gas allowance; a hard winter blamed',
    'Over budget on light; the shop signs stay lit regardless',
  ],
  steadySector: [
    'Fifty years of the same gas, and the city brighter for it',
    'Light holds its line; the Evening Lamp reports little else',
  ],
  reckoning: [
    'An inquiry into the lighting of the city sits through the night',
    'The gas companies’ books opened to the public, briefly',
  ],
  /* M2 */
  clearSkies: [
    'The fog lifts; stars seen over the gasworks',
    'A clear night: lamplighters report they can see one another',
    'Fog season passes without a pea-souper; the Board congratulated',
  ],
  settled: [
    'Light settled: the Board fixes the lamps at what the town needs',
    'Gas company content to stay the size it is; shareholders less so',
    'The lamps burn as before, and no more lamps are built',
  ],
  unsettled: [
    'Lighting settlement ends; every shop window ablaze by Friday',
    'The town outgrows its gas allowance; the holder fills again',
    'Light unsettled; the late shift back by popular demand',
  ],
};

export const light: SectorContent = {
  def: sector, upgrades: lightUpgrades, levers: lightLevers, headlines: lightHeadlines,
};
