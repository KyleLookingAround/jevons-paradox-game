/**
 * Achievements: the five the core grants by its own rules, then those with conditions (Cond), in display order.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { AchievementDef, Cond, SectorId } from '../types';

/* ------------------------------------------------------------------ */
/* ACHIEVEMENTS: 5 built in + 20 with conditions                       */
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

export const achievements: AchievementDef[] = [
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
  decadeIn('motion', 'A Decade at Fifty', 'Ten years of Motion inside its oil budget.'),
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
    blurb: 'Every smog crisis Steam can have, in a single run.',
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
];
