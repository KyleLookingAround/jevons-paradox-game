/**
 * The Commons (M2): where restraint's money goes. Projects bought with capital (and the fund that 'commons' recycling
 * fills), some with Mandate too; open from the third run (global.commons.fromReckoning). Levels last for the run.
 * Each is a thing a town would be proud of, and each rebounds a little, which its blurb says: it is heated or lit
 * (intensity: price-proof demand in an Industry), its leisure is spent on something (a satMul > 1 on a leisure use), or
 * it brings more people (popGrowthMul). The economy-wide rebound (more wellbeing, more people) needs no field.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 *
 * Sources: the dates and the people in these blurbs were checked by the content lane against primary or scholarly
 * sources (Hansard and the statute book for the Acts; Historic England's Register for Birkenhead Park; see the M2
 * content report). Nothing here is from memory.
 */
import type { CommonsDef } from '../types';
import { capCost, sat } from './helpers';

/* Names carry no article: headlines place {name} after a colon or at the start ("Free library: opened by the mayor"). */

/* ------------------------------------------------------------------ */
/* NUMBERS                                                             */
/* ------------------------------------------------------------------ */

/*
 * Wellbeing: max × (1 − exp(−L × perLevel / max)). One-off projects set perLevel at about twice max, so their one level
 * gives most of the max (1 − e⁻² ≈ 0.86); repeatable ones set it lower so the levels matter. All ten maxima together:
 * 11.4 points against a target of 34 (the rule: under 12). A project is worth 0.4–1.5 points.
 * Intensity: L × perLevel × N service units per second of demand no price removes, in the named Industry (only while
 * it is open). Aimed at one to three per cent of that Industry's demand at full levels, mid-run; measured (M2 balance):
 * the first guesses for Light, Motion and Compute were ten to thirty times too large or small (the library alone more
 * than doubled a young Light), and are now 2–4% of a restraint run's demand there, Steam's 3–6%.
 * Costs: Coal Age projects at £15k–£75k (M2 balance: three times the first guess; a restraint player in run 3 earns
 * £300–400 a second and kept £50k–£90k idle, so a project now comes every few minutes rather than all at once); later
 * projects at the price of their Industry's middle cards. Mandate where the project is a political act, not just a
 * building.
 */

export const commons: CommonsDef[] = [
  /* ---- The Coal Age: Steam ---- */
  {
    id: 'commons.baths', name: 'Baths and wash-houses', icon: 'baths', sector: 'steam',
    blurb: 'The Act of 1846 lets a borough build them out of the rates. Hot water for the whole street, heated by the ton.',
    cost: 24_000, mandateCost: 60,
    wellbeing: { max: 1.5, perLevel: 3 },
    /* Unfolding balance: 80 (not 50), so the Commons add at least 2% to Steam's demand at the restraint player's run-4
     * end state (budgets from run 3 leave a larger Steam economy there). */
    intensity: { sector: 'steam', perLevel: 80 },
  },
  {
    id: 'commons.park', name: 'People’s park', icon: 'park', sector: 'steam',
    blurb: 'Birkenhead, 1847: Paxton’s park, paid for by the villas sold round its edge. The villas fetch more every year, and fill.',
    cost: 45_000, mandateCost: 80,
    wellbeing: { max: 1.2, perLevel: 2.4 },
    /* The rents round it: a slightly larger town (the economy-wide rebound, made visible). */
    effects: [{ type: 'popGrowthMul', value: 1.02 }],
  },
  {
    id: 'commons.institute', name: 'Mechanics’ institute', icon: 'institute', sector: 'steam',
    blurb: 'Dr Birkbeck’s London institution, 1823: evening lectures for working men. The lectures are on the steam engine, and the students improve one.',
    cost: 36_000,
    wellbeing: { max: 1, perLevel: 2 },
    /* Lit by gas once Light is open; and what is taught is engines. */
    intensity: { sector: 'light', perLevel: 7 } /* unfolding balance: Light's projects up a fifth, ≥ 2% of its demand */,
    effects: [{ type: 'etaMul', sector: 'steam', value: 1.03 }],
    requires: { owns: 'steam.condenser', label: 'Own the Separate condenser' },
  },

  /* ---- The Coal Age: Light ---- */
  {
    id: 'commons.library', name: 'Free library', icon: 'library', sector: 'light',
    blurb: 'Mr Ewart’s Act, 1850: the rate may build the room but not buy the books. Readers stay until the gas is turned down, later every year.',
    cost: 60_000, mandateCost: 100,
    wellbeing: { max: 1.5, perLevel: 3 },
    intensity: { sector: 'light', perLevel: 18 },
  },
  {
    id: 'commons.clock', name: 'Town clock', icon: 'clock', sector: 'light',
    blurb: 'Four faces, gas-lit from behind, on the corporation’s new tower. Everyone knows the hour now, the foreman included.',
    cost: 27_000,
    wellbeing: { max: 0.8, perLevel: 1.6 },
    intensity: { sector: 'light', perLevel: 10 },
    /* Time discipline: the night shift starts on the stroke. */
    effects: [sat('light', 1.03, 'light.nightShifts')],
  },
  {
    /* Repeatable: one more field a level. Listed under Light (the Act is 1908); the sheds' stoves burn Steam's coal. */
    id: 'commons.allotments', name: 'Allotments', icon: 'allotments', sector: 'light',
    blurb: 'Plots for anyone who asks: the Act of 1908 obliges the council to find the land. Every shed has a stove by the second winter.',
    cost: 15_000, costGrowth: 1.6, maxLevel: 5, mandateCost: 20,
    wellbeing: { max: 1.2, perLevel: 0.4 },
    intensity: { sector: 'steam', perLevel: 4 },
    requires: { stat: 'population', op: '>=', value: 1.5, label: 'A town half as large again as at the start' },
  },

  /* ---- Later ---- */
  {
    id: 'commons.buses', name: 'Municipal buses', icon: 'buses', sector: 'motion',
    blurb: 'Corporation buses on every route, fares held down by the rates. They run on oil, rather less of it per head, and the commute grows longer.',
    cost: 400_000, mandateCost: 150,
    wellbeing: { max: 1.2, perLevel: 2.4 },
    intensity: { sector: 'motion', perLevel: 80 },
    effects: [sat('motion', 1.02, 'motion.commuting')],
  },
  {
    /* Repeatable: an hour off the week a level. The time rebound in its plainest form: package holidays. */
    id: 'commons.shortWeek', name: 'Shorter working week', icon: 'shortweek', sector: 'motion',
    blurb: 'Keynes, 1930, expected his grandchildren to work 15 hours a week. Each hour given back is an hour spent, mostly on the road to the coast.',
    cost: 1_500_000, costGrowth: 2.2, maxLevel: 3, mandateCost: 300,
    wellbeing: { max: 1.5, perLevel: 0.6 },
    effects: [sat('motion', 1.05, 'motion.flights')],
  },
  {
    id: 'commons.repair', name: 'Repair cafés', icon: 'repair', sector: 'compute',
    blurb: 'Amsterdam, 2009: volunteers, soldering irons and a table of broken things. A mended laptop is a cheap laptop, and the town buys another.',
    cost: 3_000_000,
    wellbeing: { max: 0.5, perLevel: 1 },
    /* Unfolding balance: 30,000 (not 50,000): under 15% of Compute's demand in the restraint player's run 4. */
    intensity: { sector: 'compute', perLevel: 30_000 },
    effects: [capCost('compute', 0.98)],
  },

  /* ---- General (no Industry; listed apart, drawn in no scene) ---- */
  {
    id: 'commons.bankHolidays', name: 'Bank holidays', icon: 'holiday',
    blurb: 'Sir John Lubbock’s Act, 1871: four days on which the banks shut, and so does everyone else. The excursion trains are full by eight.',
    cost: 75_000, mandateCost: 120,
    wellbeing: { max: 1, perLevel: 2 },
    effects: [sat('steam', 1.04, 'steam.railways')],
    requires: { owns: 'steam.railways', label: 'Railways founded' },
  },

  /* ---- M3: locked projects, History rewards (histories.ts) ----
   * Hidden until a History unlocks them (CommonsDef.locked; meta.unlocks). Each also `requires` its History cleared,
   * which says the same thing to a core that predates `locked` (an unknown `owns` id is false), so the M2 game never
   * offers them. Options, not power: small wellbeing (0.25 each, which keeps all twelve maxima under 12) and their
   * own rebound. Append only. */
  {
    id: 'commons.welfareHall', name: 'Miners’ welfare hall', icon: 'welfarehall', sector: 'steam', locked: true,
    blurb: 'Mining Industry Act, 1920: a penny on every ton raised, for halls, libraries and bands. The more coal, the finer the hall.',
    cost: 40_000, mandateCost: 60,
    wellbeing: { max: 0.25, perLevel: 0.5 },
    /* Heated and lit, and a penny a ton is a reason to raise the tons. */
    intensity: { sector: 'steam', perLevel: 40 },
    requires: { owns: 'history.coalRich', label: 'Cleared Coal-rich' },
  },
  {
    id: 'commons.cycleTracks', name: 'Cycle tracks', icon: 'cycletracks', sector: 'motion', locked: true,
    blurb: 'A kerbed lane for bicycles beside every arterial road. The road space they free fills with other traffic, as road space does.',
    cost: 600_000, mandateCost: 120,
    wellbeing: { max: 0.25, perLevel: 0.5 },
    effects: [sat('motion', 1.02, 'motion.commuting')],
    requires: { owns: 'history.austerity', label: 'Cleared Austerity' },
  },
];
