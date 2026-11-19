/**
 * Achievements: the five the core grants by its own rules, then those with conditions (Cond), in display order.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { FeatureId, AchievementDef, Cond, SectorId } from '../types';

/* ------------------------------------------------------------------ */
/* ACHIEVEMENTS: 5 built in + 20 with conditions (M1) + 18 (M2)       */
/* ------------------------------------------------------------------ */

const SECTOR_NAMES: Record<string, string> = {
  steam: 'Steam', light: 'Light', motion: 'Motion', compute: 'Compute', code: 'Code',
};

/** Open-ness test: a sector stat is false while the sector is closed, so "anything delivered" means "open". */
const isOpen = (sector: SectorId): Cond => ({ stat: 'serviceDelivered', sector, op: '>', value: 0 });

const backfireIn = (sector: SectorId, blurb: string): AchievementDef => ({
  id: `ach.backfire.${sector}`, name: `Backfire in ${SECTOR_NAMES[sector]}`, blurb,
  when: { stat: 'rebound', sector, op: '>', value: 1 },
});

const decadeIn = (sector: SectorId, name: string, blurb: string): AchievementDef => ({
  id: `ach.decade.${sector}`, name, blurb,
  when: { stat: 'budgetDecades', sector, op: '>=', value: 1 },
});

const clearIn = (sector: SectorId, name: string, blurb: string): AchievementDef => ({
  id: `ach.clear.${sector}`, name, blurb,
  when: { stat: 'clear', sector, op: '>=', value: 1 },
});

/** Steady State this run: the Steady streak (clearYears) has served fifty years (it holds while settled). */
const steadyNow = (sector: SectorId): Cond => ({ stat: 'clearYears', sector, op: '>=', value: 50 });
const ALL_SECTORS: SectorId[] = ['steam', 'light', 'motion', 'compute', 'code'];
/** Steady State in any two Industries at once. */
const anyTwoSteady: Cond = {
  any: ALL_SECTORS.flatMap((a, i) => ALL_SECTORS.slice(i + 1).map((b): Cond => ({ all: [steadyNow(a), steadyNow(b)] }))),
};

const list: AchievementDef[] = [
  /* Built in (granted by the core's own rules). */
  { id: 'firstReckoning', name: 'The First Reckoning', blurb: 'Ended a run and looked back at the ledger.' },
  { id: 'backfire', name: 'Backfire', blurb: 'Watched an industry’s savings be eaten entirely, and then some.' },
  {
    id: 'jevonsWasRight', name: 'Jevons Was Right',
    blurb: 'Bought every efficiency card of an industry while its consumption grew tenfold.',
  },
  {
    id: 'degrowthByAccident', name: 'Degrowth by Accident', hidden: true,
    blurb: 'Consumption fell, because there was hardly anyone left to consume.',
  },
  { id: 'steadyState', name: 'Steady State', blurb: 'Held an industry inside its budget, with wellbeing up, for fifty years.' },

  /* Backfire, industry by industry. */
  backfireIn('light', 'Lamps many times thriftier, and more gas burned than ever.'),
  backfireIn('motion', 'Twice the miles to the gallon, and more gallons.'),
  backfireIn('compute', 'Each sum cheaper by the hour; the power bill dearer by the day.'),
  backfireIn('code', 'Every feature cheaper to write, and less attention left than before.'),

  /* First decade within budget, industry by industry. */
  decadeIn('steam', 'A Decade on the Line', 'Ten years of Steam inside its coal budget, with nobody going without.'),
  decadeIn('light', 'A Decade by Lamplight', 'Ten years of Light inside its budget.'),
  decadeIn('motion', 'A Decade in the Slow Lane', 'Ten years of Motion inside its oil budget.'),
  decadeIn('compute', 'A Decade Without Upgrading', 'Ten years of Compute inside its budget.'),
  decadeIn('code', 'A Decade of Reading', 'Ten years of Code inside its attention budget.'),

  /* Unlocked frugally. */
  {
    id: 'ach.frugal.light', name: 'Lit on a Shoestring',
    blurb: 'Opened Light without Steam’s coal use ever trebling.',
    when: { all: [isOpen('light'), { stat: 'peakRFold', sector: 'steam', op: '<', value: 3 }] },
  },
  {
    id: 'ach.frugal.motion', name: 'Motoring Modestly',
    blurb: 'Opened Motion without Light’s gas use ever trebling.',
    when: { all: [isOpen('motion'), { stat: 'peakRFold', sector: 'light', op: '<', value: 3 }] },
  },
  {
    id: 'ach.frugal.compute', name: 'Computing Carefully',
    blurb: 'Opened Compute without Motion’s oil use ever trebling.',
    when: { all: [isOpen('compute'), { stat: 'peakRFold', sector: 'motion', op: '<', value: 3 }] },
  },

  /* The long view. */
  {
    id: 'ach.century.steam', name: 'A Century Within Budget',
    blurb: 'Ten unbroken decades of Steam inside its budget in a single run.',
    when: { stat: 'budgetDecades', sector: 'steam', op: '>=', value: 10 },
  },
  {
    id: 'ach.unburnt', name: 'Left in the Ground',
    blurb: 'Forty minutes into a run, with three quarters of the coal still unmined.',
    when: { all: [{ stat: 'time', op: '>=', value: 2_400 }, { stat: 'reserveFraction', sector: 'steam', op: '>', value: 0.75 }] },
  },
  {
    id: 'ach.fullHouse', name: 'All Industries Open',
    blurb: 'Steam, Light, Motion, Compute and Code, all running at once.',
    when: isOpen('code'),
  },
  {
    id: 'ach.coalQuestion', name: 'Required Reading',
    blurb: 'Bought The Coal Question, and read it.',
    when: { owns: 'steam.coalQuestion' },
  },
  {
    id: 'ach.tenReckonings', name: 'Ten Inquiries',
    blurb: 'Ten Reckonings. The commission has its own building now.',
    when: { stat: 'reckonings', op: '>=', value: 10 },
  },

  /* Hidden. */
  {
    id: 'ach.handCranked', name: 'Hand-Cranked', hidden: true,
    blurb: 'Sold power by hand two thousand times in one run.',
    when: { stat: 'clicks', op: '>=', value: 2_000 },
  },
  {
    id: 'ach.peaSouperSeason', name: 'Black Fog Season', hidden: true,
    blurb: 'Every black fog Steam can have, in a single run.',
    when: { stat: 'crises', sector: 'steam', op: '>=', value: 3 },
  },
  {
    id: 'ach.lastLump', name: 'The Last Lump', hidden: true,
    blurb: 'Burned Steam down to its final hundredth of the coal.',
    when: { stat: 'reserveFraction', sector: 'steam', op: '<', value: 0.01 },
  },
  {
    id: 'ach.jevonsWasWrong', name: 'Jevons Was Wrong, Once', hidden: true,
    blurb: 'Steam engines ten times thriftier, and not a ton more coal burned than at the start.',
    when: {
      all: [
        { stat: 'etaFold', sector: 'steam', op: '>=', value: 10 },
        { stat: 'rFold', sector: 'steam', op: '<=', value: 1 },
      ],
    },
  },

  /* ---- M2: decades, clear skies, Settlement, the Commons, the orders, Charters ---- */
  {
    id: 'ach.leanDecade', name: 'A Lean Decade',
    blurb: 'Held a line for ten years with nobody worse off than on the day it was drawn.',
    when: { stat: 'leanDecades', op: '>=', value: 1 },
  },
  {
    id: 'ach.fullDecade', name: 'A Full Decade',
    blurb: 'Ten years inside a budget line with wellbeing at the target throughout.',
    when: { stat: 'fullDecades', op: '>=', value: 1 },
  },
  clearIn('steam', 'Clear Skies over the Valley', 'Steam’s smoke down to half what it was when the line was drawn, and falling.'),
  clearIn('light', 'The Fog Lifts', 'Light’s fog thinned to what the air can carry off, with the lamps still lit.'),
  clearIn('motion', 'The Ring Road Breathes', 'Motion’s exhaust down to the sink line, and the motorways still open.'),
  clearIn('compute', 'A Cooler Summer', 'Compute’s carbon brought down to what the sinks can take, while the chips kept doubling.'),
  clearIn('code', 'Deleted Down', 'Code’s stock deleted below its clear level, faster than anything shipped. Nothing else does it.'),
  {
    id: 'ach.twoSteady', name: 'Two Industries Steady',
    blurb: 'Steady State in two Industries at once, in a single run.',
    when: anyTwoSteady,
  },
  {
    id: 'ach.firstSettled', name: 'Settled',
    blurb: 'Froze an Industry at a rate the sky can take, and agreed to defend it.',
    when: { stat: 'sectorsSettled', op: '>=', value: 1 },
  },
  {
    id: 'ach.threeSettled', name: 'Three Settled at Once',
    blurb: 'Three Industries settled at the same time, each defended against the other two.',
    when: { stat: 'sectorsSettled', op: '>=', value: 3 },
  },
  {
    id: 'ach.tenCommons', name: 'A Town to Be Proud Of',
    blurb: 'Ten levels of Commons in one run: baths, books, parks and plots, each lit or heated by something.',
    when: { stat: 'commonsLevels', op: '>=', value: 10 },
  },
  {
    id: 'ach.commonsEach', name: 'Something for Everyone',
    blurb: 'A Commons project under Steam and another under Light, in the same run.',
    when: {
      all: [
        { any: [{ owns: 'commons.baths' }, { owns: 'commons.park' }, { owns: 'commons.institute' }], label: 'A Commons project under Steam' },
        { any: [{ owns: 'commons.library' }, { owns: 'commons.clock' }, { owns: 'commons.allotments' }], label: 'A Commons project under Light' },
      ],
    },
  },
  {
    id: 'ach.marketIdle', name: 'Nothing Bought for You',
    blurb: 'Half an hour of a later run with the Market making no purchase at all. Every card was a decision.',
    when: {
      all: [
        { stat: 'reckonings', op: '>=', value: 1 },
        { stat: 'time', op: '>=', value: 1_800 },
        { stat: 'automated', op: '<=', value: 0 },
      ],
    },
  },
  {
    id: 'ach.fiveHundred', name: 'Five Hundred Decisions',
    blurb: 'Five hundred things decided by hand in a single run. The clerks have started a second ledger.',
    when: { stat: 'decisions', op: '>=', value: 500 },
  },
  {
    id: 'ach.enough', name: 'Enough', hidden: true,
    blurb: 'Steady State in an Industry with fewer than a hundred decisions made all run.',
    when: { all: [{ stat: 'decisions', op: '<', value: 100 }, { any: ALL_SECTORS.map(steadyNow) }] },
  },
  {
    id: 'ach.charter.cotton', name: 'Looms Before Engines',
    blurb: 'Under the Cotton Towns charter, watched Steam’s savings be eaten entirely by the mills that were waiting.',
    when: { all: [{ owns: 'charter.cottonTowns' }, { stat: 'rebound', sector: 'steam', op: '>', value: 1 }] },
  },
  {
    id: 'ach.charter.coalfield', name: 'Deep and Unburnt',
    blurb: 'Under the Northern Coalfield charter, forty minutes in with three quarters of the coal still in the ground.',
    when: {
      all: [
        { owns: 'charter.northernCoalfield' },
        { stat: 'time', op: '>=', value: 2_400 },
        { stat: 'reserveFraction', sector: 'steam', op: '>', value: 0.75 },
      ],
    },
  },
  {
    id: 'ach.charter.garden', name: 'The Garden Kept',
    blurb: 'Under the Garden Parish charter, brought Steam to clear skies.',
    when: { all: [{ owns: 'charter.gardenParish' }, { stat: 'clear', sector: 'steam', op: '>=', value: 1 }] },
  },
];

/**
 * The unfolding (QA): an achievement that names a system the player has not met is listed as hidden until that system
 * arrives (AchievementDef.feature; display only). Matched by id prefix.
 */
const FEATURE_OF: [string, FeatureId][] = [
  ['steadyState', 'steadyState'], ['ach.twoSteady', 'steadyState'], ['ach.enough', 'steadyState'],
  ['ach.decade.', 'budget'], ['ach.century.', 'budget'],
  ['ach.leanDecade', 'clearSkies'], ['ach.fullDecade', 'clearSkies'], ['ach.clear.', 'clearSkies'],
  ['ach.firstSettled', 'settlement'], ['ach.threeSettled', 'settlement'],
  ['ach.tenCommons', 'commons'], ['ach.commonsEach', 'commons'],
  ['ach.marketIdle', 'market'], ['ach.charter.', 'charters'],
];
export const achievements: AchievementDef[] = list.map((a) => {
  const f = FEATURE_OF.find(([k]) => a.id === k || (k.endsWith('.') && a.id.startsWith(k)));
  return f ? { ...a, feature: f[1] } : a;
});
