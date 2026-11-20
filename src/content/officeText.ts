/**
 * M5 (the text lane): the Ministry's words that have no slot in the contract, for the page to import (as it imports
 * boardSurvey.ts and proprietor.ts). Content is data (see README.md): no game rules here, and nothing the core reads.
 * The page fills placeholders itself; each table says which it takes. Money ({cost}, {capital}) is formatted by the page
 * as it formats the purse; {year} is a calendar year; {years} a whole number of model years; {n} a count.
 *
 *   RESPONSE_TEXT   the answer line and Pryce's panel: each kind of answer, its name, how the ranked list says it, and
 *                   Pryce's own one-line answer in his voice (he praises the intention, then prices it).
 *   PRYCE_PANEL     his panel: his articles (four lines), his five readings and where each came from, his order book.
 *   MINISTRY_TEXT   the Ministry's chrome: Confidence, the election sheet, Opposition, inspection and the "as reported"
 *                   gauges, loophole cards, the court notice and the carve-out, the Treasury and compensation, the
 *                   sealed postcard, the Treaty shop, Plenty's two gauges, the hoardings.
 *   FEATURE_TEXT_M5 the seven M5 features' intros and names (the registry copies them into features.ts).
 *   OFFICE_WORDS, PROSE_NAMES, FILE_SUBJECTS  used by words.ts's formatter for the prospectus and the file.
 *
 * Everything here is first-paint (imported by the page's main script); keep it short. Pryce is genial and never a
 * villain; he never lies in a letter or an answer (he conceals in returns, which is a different department).
 */
import type { M5FeatureId, ResponseKind } from '../types';

/* ------------------------------------------------------------------ */
/* The answer line                                                     */
/* ------------------------------------------------------------------ */

/**
 * Each answer Pryce may give a rule. `name`: the glyph's label and the panel's column ("Comply"). `rank`: how the ranked
 * list writes it after "If enacted now:" or "next cheapest:" ({rung} = the open rung's name, lower-cased by the page if
 * it likes; {cost} = its cost a year). `voice`: Pryce's own answer, shown under the line when this is his choice
 * ({lever} the lever's name, {rung}, {cost}). `panel`: his last answer on his panel ({lever}, {year} since).
 */
export const RESPONSE_TEXT: Record<'comply' | 'evade' | 'lobby' | 'litigate' | 'conceal', {
  name: string; rank: string; voice: string; panel: string;
}> = {
  comply: {
    name: 'Comply',
    rank: 'comply ({cost} a year)',
    voice: '“An admirable measure. Pryce Consolidated will comply, and the customer will see it in the price.”',
    panel: '{lever}: complies, since {year}',
  },
  evade: {
    name: 'Evade',
    rank: 'evade through {rung} ({cost} a year)',
    voice: '“A sensible rule, and it does not apply to {rung}. Pryce Consolidated will make more of those.”',
    panel: '{lever}: evades through {rung}, since {year}',
  },
  lobby: {
    name: 'Lobby',
    rank: 'lobby against it ({cost} a year)',
    voice: '“The Ministry means well. The public ought to be told what it costs them, and Pryce Consolidated will tell them.”',
    panel: '{lever}: lobbying, since {year}',
  },
  litigate: {
    name: 'Litigate',
    rank: 'take it to court ({cost} in fees)',
    voice: '“The Ministry is within its rights, and so is the company. The courts will say which, in due course.”',
    panel: '{lever}: before the courts, since {year}',
  },
  conceal: {
    name: 'Under-report',
    rank: 'under-report ({cost} a year, at the expected fine)',
    voice: '“The company’s returns are filed punctually, as the Ministry will have noticed.”',
    panel: 'Returns from {sector}: filed punctually',
  },
};

/** An answer kind the page does not know (M6 adds 'offshore' and 'capture'). */
export const RESPONSE_UNKNOWN = { name: 'Other', rank: 'another course ({cost} a year)', voice: '“Pryce Consolidated is considering its position.”', panel: '{lever}: under consideration' };

/** The answer line's frame. {kind} = a RESPONSE_TEXT rank; {cost} money. */
export const ANSWER_LINE = {
  heading: 'Pryce’s answer',
  ifEnacted: 'If enacted now: Pryce will {kind}',
  nextCheapest: 'next cheapest: {kind}',
  /** Shown for a kind not open to him now (cost Infinity, JSON null): "Evade: no loophole open". */
  unavailable: {
    comply: 'always open',
    evade: 'no loophole open',
    lobby: 'Confidence already below his line',
    litigate: 'not raised lately, or already tried',
    conceal: 'not on this table',
  } as Record<string, string>,
  unavailableOther: 'not open to him',
  /** The lever's current answer, beside the line. */
  inForce: 'In force: {kind}, since {year}',
  /** Outside a Ministry, or for a lever of no chair Industry: nothing is shown. */
  maxed: 'At its highest; his answer to it as it stands',
  /** The list, opened by a tap. */
  listTitle: 'What each answer would cost him, a year',
} as const;

/* ------------------------------------------------------------------ */
/* Pryce's panel                                                       */
/* ------------------------------------------------------------------ */

export const PRYCE_PANEL = {
  title: 'Pryce Consolidated',
  chairman: 'Sir Edmund Pryce, Chairman',
  /** Under the title: the reach-back of the Market. */
  market: 'Buys whatever pays back within {payback} seconds. (Your Market; his purse.)',
  articlesTitle: 'The company’s articles',
  /** The four lines, as published ({payback}, {found} seconds; {years} the quiet period). */
  articles: [
    'He buys whatever pays back soonest, if it pays back within {payback} seconds.',
    'He founds a use when it pays back within {found} seconds.',
    'He answers each rule with the cheapest course on his table, priced a year at a time.',
    'He acts only on what the Ministry can see; his returns slip only where no Inspector has called for {years} years.',
  ],
  readingsTitle: 'What he has learnt from the late proprietor',
  /** The five readings: a name, and where it came from (one line). */
  readings: {
    haste: { name: 'Haste', from: 'Purchases a minute on the late proprietor’s first morning' },
    founder: { name: 'Founding', from: 'How often that morning founded rather than improved' },
    volume: { name: 'Volume', from: 'Which arm of a fork that morning took: the cheap, plentiful one or the other' },
    drawn: { name: 'Expects rules', from: 'How early the late proprietor first drew a line' },
    pliant: { name: 'Expects agreement', from: 'Offers from the Pryce family accepted, of those answered' },
  },
  capital: 'Capital',
  /** His order book, folded to one line per Industry ({n} cards bought; {name} and {payback} seconds of the next). */
  orderBook: 'Pryce has bought {n}; next: {name}, payback {payback} s',
  orderBookNone: 'Pryce has bought {n}; nothing pays back within his {payback} seconds',
  orderBookTitle: 'Pryce’s order book',
  /** A card in his book that a subsidy helps pay for ({pct} the Treasury's share). */
  subsidised: 'The Treasury pays {pct}%',
  /** The heading of his last answers. */
  answersTitle: 'His answers to the Ministry’s rules',
  answersNone: 'No rule in force has yet required an answer.',
} as const;

/* ------------------------------------------------------------------ */
/* The Ministry's chrome                                               */
/* ------------------------------------------------------------------ */

export const MINISTRY_TEXT = {
  /* Confidence and polling */
  confidence: 'Confidence',
  confidenceNote: 'The Ministry is returned at {winAt} or above on polling day.',
  pollingDay: 'Polling day {year}',
  pollingIn: 'Polling in {years} years',
  forecast: 'On present form, {n} on polling day',
  /* The manifesto sheet */
  manifestoTitle: 'The manifesto',
  manifestoKeep: 'Keep {n}. They bind the Ministry for the next Parliament, won or lost.',
  manifestoDefault: 'If the sheet is left, the first {n} go to the printers on polling day.',
  pledgeKept: 'Pledged',
  pledgeLock: 'Pledged: not above this level this Parliament',
  pledgeTreasury: 'The Treasury pays for it: income × {pct}%',
  electionWon: 'Returned with {n}',
  electionLost: 'Defeated with {n}',
  /* Opposition */
  opposition: 'In Opposition',
  oppositionNote: 'No lever can rise in Opposition. Amendments may still be drafted. A second defeat in a row ends the Ministry.',
  campaign: 'Campaign',
  campaignNote: 'Mandate spent on the country: {n} Mandate for each point of Confidence.',
  repealed: 'Repealed by the incoming government',
  /* Inspection and the gauges */
  inspectors: 'Inspectors',
  inspectorReady: 'Ready',
  inspectorResting: 'Resting until {year}',
  inspectHint: 'Send an Inspector: tap an Industry',
  asReported: 'As reported by Pryce Consolidated',
  trueTick: 'true',
  inspectedFound: 'Inspected {year}: true burn {pct}% above the return',
  inspectedClean: 'Inspected {year}: the returns are in order',
  revealUntil: 'True figures shown until {year}',
  lastInspected: 'Last inspected {year}',
  neverInspected: 'Never inspected',
  uncertified: 'uncertified',
  uncertifiedNote: 'Nobody inspected in this decade: it is counted on the return, not on the sky.',
  capstoneHeld: 'Held by Pryce Consolidated under the Settlement Acts',
  capstoneRow: 'Settled {year} · last inspected {inspected}',
  /** In capstoneRow's {inspected} for a works nobody has inspected this Ministry. */
  capstoneNever: 'never',
  standingInspection: 'Standing inspection',
  standingInspectionNote: 'One Industry inspected each decade without being asked.',
  /* Loopholes */
  loophole: 'Loophole',
  loopholeStatus: { open: 'Open', used: 'In use by Pryce', drafting: 'Being drafted shut', closed: 'Closed' } as Record<string, string>,
  amend: 'Amend: {label}',
  amendCost: '{n} Mandate and {years} years of drafting; the loophole stays open meanwhile',
  draftingUntil: 'Drafting until {year}',
  robust: 'Closed while {label}',
  robustNote: 'Cannot be drafted shut; only another rule in force closes it.',
  /* Court, lobbying, carve-outs */
  litigated: 'Before the courts until {year}',
  lobbied: 'Pryce is lobbying against it',
  carvedOut: 'Carve-out won by lobbying: one level lower this Parliament',
  /* The Treasury */
  treasury: 'Treasury',
  treasuryNote: 'A share of Pryce Consolidated’s income, and the levies paid to the Treasury.',
  compensate: 'Compensate',
  compensateNote: 'Pays the displaced; the jobs lost here do not count against the Ministry for {years} years.',
  compensated: 'Compensated until {year}',
  /* The shop, after Take office */
  knowhowHeld: 'Industrial Know-how: held by Pryce Consolidated',
  statecraft: 'Statecraft',
  /* The Attention Age, closed in a Ministry */
  sealedTitle: 'The Attention Age',
  sealedLine: 'In preparation',
  sealedRecord: 'On file: {record}',
  /* The Treaty */
  treatyTitle: 'The Treaty',
  precedent: 'Precedent',
  articles: 'Articles',
  playbookLearnt: 'Pryce Consolidated has learnt: {name}',
  /* Plenty's two gauges */
  waterApplied: 'Water applied',
  waterConsumed: 'Water consumed',
  returnShare: '{pct}% returns to the aquifer',
  writtenOnApplied: 'Written on water applied',
  writtenOnConsumed: 'Written on water consumed',
  regimeElastic: 'Cheaper food clears more land',
  regimeSaturated: 'Cheaper food spares land',
  /* The scene's props (hoardings that go up when he lobbies; the court notice) */
  hoardings: ['Freedom of the Road', 'Keep the Country Moving', 'Pryce: Building the Future', 'Ask Your Member Why', 'Cheap Food Is Good Food'],
  courtNotice: 'Sub judice',
} as const;

/* ------------------------------------------------------------------ */
/* The unfolding: M5's seven features                                  */
/* ------------------------------------------------------------------ */

/** Intros are headlines (house style: sentence case, no full stop, ≤ 70 characters, never "you"); names ≤ 24. */
export const FEATURE_TEXT_M5: Record<M5FeatureId, { intro: string; name: string }> = {
  chair: { intro: 'The Works change hands; the late proprietor changes chairs', name: 'The Ministry' },
  loopholes: { intro: 'The rule holds; the vehicle it covers is redefined', name: 'Loopholes' },
  inspection: { intro: 'Inspectors appointed to read the returns, and then the chimneys', name: 'Inspection' },
  treasury: { intro: 'Treasury opens its books: the more Pryce earns, the more it has', name: 'The Treasury' },
  statecraft: { intro: 'The Civil Service offers its own Know-how, at a price', name: 'Statecraft' },
  charge: { intro: 'A price on the service itself: unpopular today, and for a decade or so', name: 'The charge' },
  treaty: { intro: 'A Treaty may be signed: rules that outlast a Ministry', name: 'The Treaty' },
};

/* ------------------------------------------------------------------ */
/* For the formatter (words.ts): the prospectus and the file           */
/* ------------------------------------------------------------------ */

export const OFFICE_WORDS = {
  /** chair paragraph's {sooner:1} when the late proprietor founded in the first minute. */
  prospectusSoonerFirst: 'first as well, and earlier in it',
  /** the file's {seasons} when only one season is counted. */
  fileOneSeason: 'last season',
  /** the file: an offer accepted in one season and declined in another ({dispatch}). */
  fileBoth: 'Accepted in one season and declined in another: {dispatch}.',
  /** the file when no Pryce letter was ever answered by hand. */
  fileEmpty: 'No correspondence with the family on file. The company has written to ask why.',
} as const;

/**
 * Names as they read in the prospectus's sentence, where the card's own name would not ("Another engine works" is a
 * button; on the first morning it was a second engine house). Ids not listed are lower-cased at the first letter.
 */
export const PROSE_NAMES: Record<string, string> = {
  'steam.anotherEngine': 'a second engine house',
  'steam.lathe': 'a screw-cutting lathe',
  'steam.condenser': 'the separate condenser',
  'steam.coalQuestion': 'a copy of The Coal Question',
  'steam.pirateEngine': 'a pirate engine',
  'steam.deeperShaft': 'a deeper shaft',
  'steam.engineReporter': 'the engine duty reports',
  'steam.bwLicence': 'a Boulton & Watt licence',
  'steam.doubleActing': 'the double-acting engine',
  'steam.cornishEngine': 'the Cornish engine',
  'steam.limitedLiability': 'limited liability',
  'steam.pumping': 'mine pumping',
  'motion.delivery': 'delivery vans',
  'motion.commuting': 'commuter towns',
  'motion.shopping': 'out-of-town shopping',
  'motion.suburbs': 'the suburbs',
  'motion.flights': 'package holidays',
};

/** The file's {dispatch}: each Pryce offer as the file names it (both generations, Act I and the Previews). */
export const FILE_SUBJECTS: Record<string, string> = {
  'd.gen.pryceUnderstanding': 'a gentleman’s understanding in place of a rule',
  'd.steam.pryceNight': 'cheap power to run the mills all night',
  'd.light.flatRate': 'electric light at a flat rate',
  'd.motion.familyVan': 'the family van, to be counted as a van',
  'd.motion.pryceAbroad': 'a grace period for the van, a works abroad being mentioned',
  'd.motion.ringRoadStore': 'a store in a field by the ring road',
  'd.compute.freeAtUse': 'the service, free to the user',
  'd.code.fortySeats': 'forty agents for the price of one clerk',
  'd.iron.pryceJointRailway': 'a joint railway to the coast',
  'd.iron.pryceBelgian': 'ten years without a coke duty, to meet the Belgian price',
  'd.iron.pryceInstitute': 'two more furnaces, with a mechanics’ institute attached',
  'd.iron.pryceLathes': 'fifty machine tools at cost',
  'd.iron.pryceScrap': 'a bounty on every old rail',
  'd.iron.pryceCokeContract': 'ten years of coke at that year’s price',
  'd.iron.pryceSon': 'a place in the office for young Samuel Pryce',
};

/** A ResponseKind's words, with a fallback for a kind the page does not know. */
export function responseText(kind: ResponseKind): { name: string; rank: string; voice: string; panel: string } {
  return (RESPONSE_TEXT as Record<string, typeof RESPONSE_UNKNOWN>)[kind] ?? RESPONSE_UNKNOWN;
}
