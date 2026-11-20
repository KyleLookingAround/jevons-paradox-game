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

/* ------------------------------------------------------------------ */
/* M3 (content-archive lane): "Enough", then the M3 systems            */
/* ------------------------------------------------------------------ */

/*
 * "Enough" (design/paradigm-shifts.md, shift 3): a quiet family that rewards sufficiency of play: stopping, leaving a
 * thing alone, not buying the last card. Each pays nothing but its badge (History rules: never power), never punishes,
 * and is listed as hidden until its system has arrived (`feature`). Blurbs are ledger entries, never praise.
 * Not expressible in the contract and so left out: "a run ended by choice" (no stat for how a run ended) and
 * "closing the tab on a good decade" (the core never sees the tab).
 */
const anySteady: Cond = { any: ALL_SECTORS.map(steadyNow) };
const anyFiveDecades: Cond = { any: ALL_SECTORS.map((s): Cond => ({ stat: 'budgetDecades', sector: s, op: '>=', value: 5 })) };
const anyDecade: Cond = { any: ALL_SECTORS.map((s): Cond => ({ stat: 'budgetDecades', sector: s, op: '>=', value: 1 })) };

const m3: AchievementDef[] = [
  {
    id: 'ach.enough.leftAlone', name: 'Left Alone', feature: 'settlement',
    blurb: 'Settled an Industry in a run in which the Market bought nothing at all.',
    when: { all: [{ stat: 'reckonings', op: '>=', value: 1 }, { stat: 'sectorsSettled', op: '>=', value: 1 }, { stat: 'automated', op: '<', value: 1 }] },
  },
  {
    id: 'ach.enough.lightTouch', name: 'A Light Touch', feature: 'budget',
    blurb: 'Kept a decade within the line in a run of fewer than forty decisions.',
    when: { all: [anyDecade, { stat: 'decisions', op: '<', value: 40 }] },
  },
  {
    id: 'ach.enough.shortDay', name: 'A Short Day’s Work', feature: 'budget',
    blurb: 'Five decades within one line, in a run of fewer than two hundred decisions.',
    when: { all: [anyFiveDecades, { stat: 'decisions', op: '<', value: 200 }] },
  },
  {
    id: 'ach.enough.turbineUnbought', name: 'The Turbine Unbought', feature: 'steadyState',
    blurb: 'Steam held at Steady State for fifty years without the steam turbine. Nobody missed it.',
    when: { all: [steadyNow('steam'), { not: { owns: 'steam.turbine' } }] },
  },
  {
    id: 'ach.enough.notedWithThanks', name: 'Noted With Thanks', feature: 'dispatches',
    blurb: 'Steady State in a run in which every letter was left to take its course.',
    when: { all: [{ feature: 'dispatches' }, { stat: 'dispatchesAnswered', op: '<', value: 1 }, anySteady] },
  },
  {
    id: 'ach.enough.forTwo', name: 'Enough for Two', feature: 'steadyState',
    blurb: 'Two Industries at Steady State at once, in a run of fewer than 250 decisions.',
    when: { all: [anyTwoSteady, { stat: 'decisions', op: '<', value: 250 }] },
  },
  {
    id: 'ach.enough.quietDays', name: 'Three Quiet Days', feature: 'survey',
    blurb: 'Three days on the household return with one short visit each, and an Industry at Steady State.',
    when: { all: [{ returned: 'household', figure: 'quietDays', op: '>=', value: 3 }, { stat: 'steadySectors', op: '>=', value: 1 }] },
  },
  {
    id: 'ach.enough.weekOfSundays', name: 'A Week of Sundays', feature: 'survey',
    blurb: 'Seven quiet days on the household return, with every Industry settled.',
    when: { all: [{ returned: 'household', figure: 'quietDays', op: '>=', value: 7 }, { stat: 'sectorsSettled', op: '>=', value: 5 }] },
  },

  /* The M3 systems. */
  {
    id: 'ach.m3.seam', name: 'Deeper Still', feature: 'seams',
    blurb: 'Sank the next seam. More coal in reach, and every reason to burn it.',
    when: { stat: 'seamsSunk', sector: 'steam', op: '>=', value: 1 },
  },
  {
    id: 'ach.m3.loadFactor', name: 'Lit All Night', feature: 'load',
    blurb: 'Light’s plant ran at a load factor above 0.8. Nothing idle, and everything cheaper.',
    when: { stat: 'loadFactor', sector: 'light', op: '>', value: 0.8 },
  },
  {
    id: 'ach.m3.hourHeld', name: 'The Hour Holds', feature: 'travel',
    blurb: 'Motion’s oil use doubled while the hour a day on the road stayed an hour.',
    when: { all: [{ stat: 'rFold', sector: 'motion', op: '>=', value: 2 }, { stat: 'travelHours', sector: 'motion', op: '<=', value: 1.1 }] },
  },
  {
    id: 'ach.m3.pairedFromStart', name: 'Paired From the Start', feature: 'sideEffects',
    blurb: 'Ran the fleet mileage rule with the fuel duty beside it for half an hour, and it never bit.',
    when: {
      all: [
        { owns: 'motion.mileageRule' }, { owns: 'motion.duty' },
        { stat: 'time', op: '>=', value: 1_800 }, { stat: 'bite', sector: 'motion', op: '<=', value: 0.01 },
      ],
    },
  },
  {
    id: 'ach.m3.correspondence', name: 'Correspondence Kept', feature: 'dispatches',
    blurb: 'Answered twenty letters by hand in a single run. The editor is obliged.',
    when: { stat: 'dispatchesAnswered', op: '>=', value: 20 },
  },
  {
    id: 'ach.m3.history', name: 'A History Cleared', feature: 'histories',
    blurb: 'Cleared a History: the same game, with one thing in the past changed.',
    when: { stat: 'historiesCleared', op: '>=', value: 1 },
  },
  {
    id: 'ach.m3.proprietor', name: 'The Proprietor’s Day', feature: 'survey',
    blurb: 'Read the Statistics Office’s return on the proprietor’s own working day.',
    when: { flag: 'proprietor' },
  },
  {
    id: 'ach.m3.firstEnding', name: 'Within the Line', feature: 'steadyState',
    blurb: 'Every Industry settled at its sink line at once, and held there for fifty years. The ledger continued.',
    when: { flag: 'won' },
  },
];
list.push(...m3);

/*
 * M4 (design §12): eight for the Coal Age complete. Each is a thing the Act teaches, stated as a condition the core can
 * check; the numbers are the lesson's own (the threshold is Fishing's θ; "half" is the clear level's neighbourhood).
 */
const FISHING_THRESHOLD = 0.2; // sectors/fishing.ts THRESHOLD (θ): below it the banks have failed
const m4: AchievementDef[] = [
  {
    /* The ending itself. */
    id: 'ach.m4.coalAgeSettled', name: 'The Coal Age, Settled', feature: 'settlement',
    blurb: 'Steam, Light, Iron and Fishing settled at once and held for fifty years. The ledger continues.',
    when: { ending: 'actOne' },
  },
  {
    /* The order book's lesson: the feeds' share of Steam's burn at a third, i.e. Steam burns half as much again as it
     * would without them (rAdded / R = 1/3 ⇔ R = 1.5 × (R − rAdded)). StatKey 'feedShare' (the M4 amendment). */
    id: 'ach.m4.embodied', name: 'Embodied',
    blurb: 'Iron’s order book made Steam’s engines so cheap that Steam burnt half as much coal again. None of it in Iron.',
    when: { stat: 'feedShare', sector: 'steam', op: '>=', value: 1 / 3 },
  },
  {
    /* Huxley's 1883 address: the great sea fisheries inexhaustible. Hidden: the lesson is to be met, not hunted. */
    id: 'ach.m4.huxleyWasWrong', name: 'Huxley Was Wrong', hidden: true,
    blurb: 'Fished the banks below the line from which they recover. The catch per trip said nothing until it was too late.',
    when: { stat: 'stockFraction', sector: 'fishing', op: '<', value: FISHING_THRESHOLD },
  },
  {
    /* A scar healed: after a failure in some run, the stock back above half with no scar left. */
    id: 'ach.m4.gullsCameBack', name: 'The Gulls Came Back',
    blurb: 'Brought the banks back above half their natural size after they had failed. It took longer than the failing did.',
    when: {
      all: [
        { owns: 'ach.m4.huxleyWasWrong' },
        { stat: 'scarYears', sector: 'fishing', op: '<=', value: 0 },
        { stat: 'stockFraction', sector: 'fishing', op: '>=', value: 0.5 },
      ],
    },
  },
  {
    /* The fishery limits, and then the home fleet held to the surveyed surplus (design §5.4: the space fills). */
    id: 'ach.m4.twoHundredMiles', name: 'Two Hundred Miles',
    blurb: 'Shut the foreign fleets out of the banks, and then held the home fleet to the survey’s quota as well.',
    when: {
      all: [
        { owns: 'fishing.limits' },
        { stat: 'foreignShare', sector: 'fishing', op: '<=', value: 0.05 },
        { owns: 'fishing.surveyQuota' },
      ],
    },
  },
  {
    /* Fishing settled (which needs the stock surveyed: settle.requires). */
    id: 'ach.m4.countedEverySpring', name: 'Counted Every Spring', feature: 'settlement',
    blurb: 'Settled Fishing: the banks fished to what they bear, and surveyed every spring to be sure of it.',
    when: { stat: 'settled', sector: 'fishing', op: '>=', value: 1 },
  },
  {
    /* The M4 moment (the Board's first survey). */
    id: 'ach.m4.boardSurvey', name: 'Filed: the Board’s Survey', feature: 'estimates',
    blurb: 'Read the skippers’ report beside the Board’s survey, and filed the survey.',
    when: { flag: 'survey:fishing' },
  },
  {
    /* The Previews: a later Age's Industry opened over the capstone. */
    id: 'ach.m4.ledgerContinues', name: 'The Ledger Continues', feature: 'settlement',
    blurb: 'Opened an Industry of a later Age, in preview, over a settled Coal Age.',
    when: { all: [{ stat: 'capstoned', op: '>=', value: 1 }, { owns: 'motion' }] },
  },
];
list.push(...m4);

/*
 * M4 polish: the spring survey, three times. The Settlement Commission's first sitting (room for a fourth settlement,
 * prestige.ts) waits on the third: a record of the banks kept, surveyed and clear of foreign boats, one run at a time
 * ({ owns, earlier }: each spring after the first must follow one passed in an earlier run). What the player works in
 * hours 8–15, in place of saving Hindsight towards one price. The numbers are Fishing's own: three quarters of K is its
 * clear level (sectors/fishing.ts steady), fifteen decades its settle gate (FISHING_DECADES), a tenth the foreign share
 * the fishery limits push under (they arrive at 15%).
 */
/** The Board raises its standard each spring: the stock it wants to find, and the foreign share it will accept. */
export const SPRING_STEPS = [{ stock: 0.75, foreign: 0.1 }, { stock: 0.8, foreign: 0.07 }, { stock: 0.85, foreign: 0.05 }];
const spring = (i: number): Cond => ({
  all: [
    { stat: 'surveyed', sector: 'fishing', op: '>=', value: 1 },
    { stat: 'budgetDecades', sector: 'fishing', op: '>=', value: 15 },
    { stat: 'stockFraction', sector: 'fishing', op: '>=', value: SPRING_STEPS[i].stock },
    { stat: 'foreignShare', sector: 'fishing', op: '<', value: SPRING_STEPS[i].foreign },
  ],
});
export const SPRINGS = ['ach.m4.springSurvey', 'ach.m4.secondSpring', 'ach.m4.thirdSpring'];
const springs: AchievementDef[] = [
  {
    id: SPRINGS[0], name: 'The Spring Survey', feature: 'estimates',
    blurb: 'Fishing surveyed after fifteen decades within its line, the banks at three quarters of their natural size or more, the foreign boats under a tenth of the catch.',
    when: spring(0),
    headline: 'Spring survey: banks at three quarters, foreign boats under a tenth',
  },
  {
    id: SPRINGS[1], name: 'A Second Spring', feature: 'estimates',
    blurb: 'In a later run, the spring survey passed to a stricter standard: the banks at four fifths, the foreign boats under 7% of the catch.',
    when: { all: [{ owns: SPRINGS[0], earlier: true }, spring(1)] },
    headline: 'Second spring survey: banks at four fifths; the Board is encouraged',
  },
  {
    id: SPRINGS[2], name: 'Three Springs', feature: 'estimates',
    blurb: 'In a third run, the strictest survey yet: the banks at 85%, the foreign boats under a twentieth. The Settlement Commission will hear the case for a fourth settlement.',
    when: { all: [{ owns: SPRINGS[1], earlier: true }, spring(2)] },
    headline: 'Third spring survey passes; the Settlement Commission agrees to sit',
  },
];
list.push(...springs);

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
