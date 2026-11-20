/**
 * Compute (on screen an Industry): its SectorDef and applications, upgrades, levers and its own headlines.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { HeadlineKey, LeverDef, SectorDef, UpgradeDef } from '../../types';
import {
  eta, capCost, margin, reserve, absorb, sat, half, chain, fork, ladder, lever, withStages, decadeSequence, RECYCLE, DUTY_LABEL, CAP_LABEL,
  CAP_FIRST, SUFF_LABEL, CAP_VALUES, CAP_LEAK, DUTY_VALUES, SUFF_VALUES, SHARE_VALUES, DIVIDEND,
} from '../helpers';
import type { SectorContent } from '../helpers';
import { MECHANICS_LIVE } from '../helpers';

/** M3: a seen price for one Compute use (ApplicationDef.priceSeen as an effect: the card's business model sets it). */
const seen = (app: string, share: number, flat = 0) => ({ type: 'priceSeen' as const, sector: 'compute', app, share, flat });

/* ------------------------------------------------------------------ */
/* COMPUTE: the Industry                                               */
/* ------------------------------------------------------------------ */

const sector: SectorDef = {
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
  autoEtaRate: 0.002,

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

  /*
   * M2: Compute is the one Industry whose paces differ. Its η rises on its own (autoEtaRate), so demand climbs into any
   * line drawn across it whatever the player buys: every pace here is harder to hold than it reads. The lines fall a
   * little less and pay a little more. Clear skies at 0.6 of the drawn pressure, not 0.5: carbon's absorption (0.005)
   * is the slowest of the five, and halving it would ask for a line held for longer than the Industry has been open.
   */
  steady: {
    clearBelow: 0.6,
    paces: [
      { id: 'gentle', name: 'Gentle', declinePerDecade: 0.04, dividendMul: 1.2, blurb: 'Four per cent a decade, against chips that double on their own. A little extra for holding it.' },
      { id: 'firm', name: 'Firm', declinePerDecade: 0.08, dividendMul: 1.8, blurb: 'Eight per cent a decade. The racks keep getting faster; the dividend keeps pace.' },
      { id: 'severe', name: 'Severe', declinePerDecade: 0.15, dividendMul: 2.8, blurb: '15 per cent a decade, against the chip makers. Handsomely paid, and rarely earned.' },
    ],
    decadeChoices: decadeSequence([
      ['div.compute.sobrietyWeek', 'div.compute.freeTier'],
      ['div.compute.peatBogs', 'div.compute.chipSubsidy'],
    ]),
  },

  /*
   * M2: Settlement. Standing while settled: an easier Mandate and a little wellbeing (the grid operator stops sending
   * warnings); once a run, a purse of capital. Defence 0.3 Mandate/s per unit of excess: Code draws on a settled
   * Compute, so every feature shipped after the settlement adds to its excess.
   */
  settle: {
    dividend: [{ type: 'mandateRateMul', value: 1.08 }, { type: 'wellbeingAdd', value: 0.6 }, { type: 'capitalAdd', value: 150 }],
    upkeepPerSpill: 0.3,
    freeExcess: 0.05,
    blurb: 'info: capacity frozen at current allocation. The chillers hum at the same pitch all year.',
  },

  spill: { to: 'motion', rate: 0.4 },
  /* M4: re-gated as a Preview: Motion's first Steady State or its 10,000 vehicle-mile-years this run, in a run after
   * Motion first opened (the travel dial arrives at that Reckoning: one Preview a run). */
  unlock: {
    minReckonings: 3,
    when: {
      all: [
        {
          /* M4: a Preview (Act II/III): after the Act I ending, from the next run (one built with the capstone), or in any
           * save that has opened Compute before (meta.sectorsOpened), which keeps it in every run (design/m4-design.md §7.4). */
          any: [{ all: [{ ending: 'actOne' }, { stat: 'capstoned', op: '>=', value: 1 }] }, { owns: 'compute' }],
          label: 'The Coal Age settled',
        },
        { feature: 'travel', label: 'Travel time measured' },
        {
          any: [
            { stat: 'clearYears', sector: 'motion', op: '>=', value: 50 },
            { stat: 'serviceDelivered', sector: 'motion', op: '>=', value: 10_000 },
          ],
          label: 'Motion steady, or 10,000 veh·mi·years driven',
        },
      ],
    },
  },

  /*
   * M3: free at the point of use (ApplicationDef.priceSeen, set by the business-model fork below). Under the
   * advertising model the web and streaming show a price of nothing: their demand ignores the service price and sits
   * near saturation, so no efficiency can move it, and only sufficiency (Digital sobriety) does. Under subscriptions
   * streaming and storage show a flat monthly price instead: fewer users, and no fall in the price they see either.
   */
  mechanic: {
    name: 'Free at the point of use',
    rebound: 'The frontier at its limit',
    blurb: 'A price shown as nothing cannot be lowered. The free uses fill to saturation, whatever the chips do.',
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
      blurb: 'Why delete anything? Every photograph, twice, on somebody else’s computer.',
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
      blurb: 'The same film, sent again, to each of you, separately, for ever.',
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

/* ------------------------------------------------------------------ */
/* UPGRADES                                                            */
/* ------------------------------------------------------------------ */

/* ---- Compute: bought ×21.6 on top of the automatic halving ---- */
/* M2 stages (the scene's data halls): virtualisation 1, the hyperscale hall 2, GPU racks 3. */
const computeUpgrades: UpgradeDef[] = withStages([
  ...chain('compute', ladder(80_000, 3, 5), [
    {
      id: 'compute.multicore', name: 'Multi-core chips', fold: 1.5,
      blurb: 'The clock speed hit a wall, so put several processors on the chip.',
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
      /* M3 (live): the web and streaming are free at the point of use (M2: adoption at 1.4× the price, every use). */
      effects: MECHANICS_LIVE
        ? [seen('compute.web', 0), seen('compute.streaming', 0), margin('compute', 0.04)]
        : [half('compute', 1.4), margin('compute', 0.02)],
    },
    {
      id: 'compute.subscriptions', sector: 'compute', kind: 'capital',
      name: 'Subscriptions',
      blurb: 'A fair price, monthly, for ever. Fewer users, steadier profits, and the profits buy servers.',
      cost: 3_000_000, requires: ['compute.virtualisation'],
      /* M3 (live): a flat monthly price on streaming and storage, seen whatever the chips cost (M2: saturation 0.9). */
      effects: MECHANICS_LIVE
        ? [margin('compute', 0.05), seen('compute.streaming', 0, 0.05), seen('compute.cloudStorage', 0, 0.09)]
        : [margin('compute', 0.05), sat('compute', 0.9)],
    },
  ),

  /* Fork 2: what to do with the heat. */
  ...fork(
    {
      id: 'compute.pueCertificate', sector: 'compute', kind: 'efficiency',
      name: 'Power-use certificate',
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
], { 'compute.virtualisation': [1, 'Virtualised racks'], 'compute.hyperscale': [2, 'Hyperscale hall'], 'compute.gpu': [3, 'GPU racks'] });

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

const computeLevers: LeverDef[] = [
  /* ---- Compute ---- */
  lever({
    id: 'compute.cap', sector: 'compute', kind: 'cap',
    requires: ['budget'],
    name: 'Grid allocation',
    blurb: 'Data centres get the connection they are given, not the one they ask for, and a little less each decade.',
    catch: `Too tight and the server farms reappear in a friendlier jurisdiction. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 400, upkeep: 0.2, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
    recycleBlurb: { commons: 'Allocation money for the Commons. The library’s new terminals are, of course, plugged in.' },
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
    requires: ['moreLevers'],
    name: 'Chip recovery',
    blurb: 'Strip the gold, the gallium and the cobalt back out of last year’s servers.',
    catch: 'Slow and costly. It stretches the supply of chips and does nothing for the power bill.',
    values: SHARE_VALUES, cost: 350, upkeep: 0.08, label: 'Recover {pct}% of the hardware',
  }),
  lever({
    id: 'compute.substitution', sector: 'compute', kind: 'substitution',
    requires: ['moreLevers'],
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
    recycleBlurb: { commons: 'Spent on the Commons: a repair café, a library with free terminals, and a great deal of streaming.' },
  }),
  /*
   * M3: the lever that bites back. A compulsory standard for data halls (etaMul per step: cooling and power audited);
   * the cheaper computation is spent on the build-out (satMul on model training, × bite × level), unless the grid
   * allocation holds the total.
   */
  lever({
    id: 'compute.hallStandard', sector: 'compute', kind: 'measure',
    name: 'Data-hall standard',
    blurb: 'Every new hall must meet a published standard for power and cooling. The certificate goes on the gate.',
    catch: 'Cheaper sums are bought in bulk: the certified halls fill with training runs.',
    values: [1, 2, 3], cost: 340, upkeep: 0.08, label: 'Standard, revision {n}',
    labels: { 0: 'A first standard', 1: 'Revised standard', 2: 'Best in class only' },
    effects: [eta('compute', 1.12)],
    sideEffects: {
      effects: [sat('compute', 1.15, 'compute.training')],
      rampYears: 25, decayYears: 30,
      unless: { owns: 'compute.cap' },
      blurb: 'The certified halls fill with training runs.',
      unlessLabel: 'unless the grid allocation holds the total',
    },
  }),
  /*
   * M3: the green paradox (Sinn, 2008). An announced phase-out of coal-fired power cleans the grid by a date (intensityMul
   * per step), and tells every generator to sell all it can before then: power gets cheaper meanwhile (resourcePriceMul
   * below 1, × bite × level), unless the grid allocation caps what is drawn.
   */
  lever({
    id: 'compute.phaseOut', sector: 'compute', kind: 'measure',
    name: 'Coal power phase-out',
    blurb: 'The last coal stations close on a date fixed years ahead. The date is announced today.',
    catch: 'Announced years ahead, it tells every generator to sell all it can before the date.',
    values: [1, 2, 3], cost: 300, upkeep: 0.07, label: 'Phase-out, stage {n}',
    labels: { 0: 'A date announced', 1: 'An earlier date', 2: 'The earliest date' },
    effects: [{ type: 'intensityMul', sector: 'compute', value: 0.9 }],
    sideEffects: {
      effects: [{ type: 'resourcePriceMul', sector: 'compute', value: 0.9 }],
      rampYears: 15, decayYears: 30, // the rush starts at the announcement
      unless: { owns: 'compute.cap' },
      blurb: 'Power stations run flat out before the date; power is cheap meanwhile.',
      unlessLabel: 'unless the grid allocation caps the draw',
    },
  }),
];

/* ------------------------------------------------------------------ */
/* HEADLINES (Content.sectorHeadlines)                                 */
/* ------------------------------------------------------------------ */

const computeHeadlines: Partial<Record<HeadlineKey, string[]>> = {
  /* Compute's broadsheet is a system log (/var/log/news): level, colon, a terse message, the turn after a semicolon. */
  efficiency: [
    'info: chips twice as thrifty; data centres twice as many',
    'info: power per sum halved; sums trebled',
    'info: new processor shipped; old racks refilled within the week',
    'info: cost per calculation down again; total bill not queried',
    'notice: efficiency breakthrough; chip makers’ shares fall, briefly',
    'info: watts per query at a record low; queries at a record high',
  ],
  sectorOpened: [
    'info: {sector} online; the bill will follow',
    'info: a clerk’s week of sums now takes a millisecond',
    'info: cost of a calculation halved; calculations multiplied',
  ],
  appAvailable: [
    'info: {app} now viable at current prices',
    'notice: {app} affordable for the first time; capacity requested',
    'info: demand forecast for {app} revised upward, again',
    'info: pilot of {app} approved; scale-up “not anticipated”',
  ],
  appFounded: [
    'info: {app} deployed; racks ordered by the warehouse',
    'info: {app} live; “free for ever”, say the founders',
    'info: {app} in production; capacity plan doubled',
    'info: {app} launched; usage past forecast by lunch',
  ],
  backfire: [
    'warn: power per query down a hundredfold; queries up a thousandfold',
    'warn: data centres more efficient than ever, and twice as hungry',
    'warn: efficiency target met; consumption target missed',
  ],
  crisis: [
    'warn: heat dome; grid operator asks data centres to throttle',
    'warn: record heat; chillers at full load for a third day',
    'warn: reservoirs low; data-centre water use queried',
    'error: heat alert No. {n}; cooling fans audible from the motorway',
    'warn: brownout risk; non-essential computing asked to wait',
  ],
  collapse: [
    'fatal: heat dome over the server farms; grid down',
    'fatal: the cloud comes down to earth; outages everywhere',
    'fatal: grid fails in the heat; everything everywhere offline',
  ],
  exhausted: [
    'error: no power, water or chips left to allocate; queue closed',
    'error: last substation allocated; new data centres told to wait',
    'error: chip supply exhausted; old servers stripped for parts',
  ],
  leverEnacted: [
    'info: new policy applied to all regions',
    'notice: regulation in force; compliance team hired, then a second',
    'info: rule change merged; the industry files a comment',
    'notice: measure enacted; providers announce a new pricing tier',
  ],
  leverLapsed: [
    'warn: policy expired; nobody renewed it',
    'info: regulation rolled back after “stakeholder feedback”',
    'warn: measure lapsed; usage resumes its previous trend',
  ],
  budgetDrawn: [
    'notice: power budget set; it declines each decade',
    'notice: hard limit configured on {resource}',
  ],
  decade: [
    'info: decade {n} within the power budget; uptime unaffected',
    'info: ten years under the line; the servers did not notice',
  ],
  budgetBroken: [
    'warn: power budget exceeded; streak reset',
    'error: budget overrun; cause “an unexpectedly popular feature”',
  ],
  steadySector: [
    'info: {sector} steady for fifty years; no incidents to report',
    'info: power flat for half a century, service up; log otherwise quiet',
  ],
  ageBegins: [
    'info: {age} begins; the scarce resource is now attention',
    'notice: {age} started in {year}; nobody had time to read this',
  ],
  reckoning: [
    'info: post-incident review opened; scope “everything”',
    'info: root cause analysis complete; root cause: demand',
  ],
  /* M2 */
  clearSkies: [
    'info: carbon below clear threshold; heat dome risk nominal',
    'info: grid carbon falling for the first time on record',
    'info: sinks absorbing at rate; chiller load normal',
  ],
  settled: [
    'info: capacity frozen at allocation; autoscaling disabled',
    'info: Compute settled; no new halls scheduled',
    'notice: data centre build programme suspended indefinitely',
  ],
  /* M3 */
  biteBack: [
    'warn: certified halls at capacity; training queue doubled',
    'warn: power cheap before the phase-out date; demand up accordingly',
    'info: efficiency standard met in every hall; halls ordered: more',
  ],
  unsettled: [
    'warn: allocation lapsed; autoscaling re-enabled',
    'warn: Compute unsettled; backlog draining into new racks',
    'error: settlement defence unpaid; capacity limits removed',
  ],
};

export const compute: SectorContent = {
  def: sector, upgrades: computeUpgrades, levers: computeLevers, headlines: computeHeadlines,
};
