/**
 * M5, "The Other Chair": the Ministry's numbers (Content.office, Content.chair, Content.rival), the pledges that are not
 * an Industry's own, the Treaty's Articles and Pryce's playbooks. Design: design/m5-design.md §§3, 5, 6, 8, 9; contract:
 * src/types.ts (`M5:` hunks: OfficeDef, ChairDef, PledgeDef, RivalDef, ArticleDef, PlaybookDef); the core experiments'
 * findings: design/m5-core-findings.md (they override the design where they differ).
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 *
 * Every number is a first guess for the balance lane, commented with what it is for and what would move it. The texts of
 * Take office are the text lane's (src/content/office.ts); the Industries' own pledges and loopholes are their modules'.
 */
import type { ArticleDef, ChairDef, Cond, OfficeDef, OfficeText, PlaybookDef, PledgeDef, RivalDef } from '../types';

/* ------------------------------------------------------------------ */
/* OFFICE: the invitation                                              */
/* ------------------------------------------------------------------ */

/**
 * The invitation (design §3.1): the first Reckoning after the Act I ending at which Motion has been open five minutes in
 * the run just ended, so the player has run Motion with their own hands once. A player who Reckons sooner meets it a run
 * later; "Not yet" loses nothing (owner Q2).
 */
export const OFFICE_WHEN: Cond = {
  all: [
    { ending: 'actOne', label: 'The Coal Age settled for good' },
    { stat: 'openFor', sector: 'motion', op: '>=', value: 300, label: 'Motion run for five minutes' },
  ],
};

/** Prospectus items quoted (repeats of one card fold into one): E9 read the first opening in four lines at 5. */
export const PROSPECTUS_ITEMS_M5 = 5;

/** The office's numbers with the text lane's words (office.ts: officeText). */
export function officeDef(text: OfficeText): OfficeDef {
  return { when: OFFICE_WHEN, text, prospectusItems: PROSPECTUS_ITEMS_M5 };
}

/* ------------------------------------------------------------------ */
/* THE CHAIR                                                           */
/* ------------------------------------------------------------------ */

/**
 * The Statecraft node whose purchase shows the Confidence target and forecast (ChairDef.showTarget; prestige.ts).
 */
export const POLLING_NODE = 'kh.sc.polling';

export const chair: ChairDef = {
  /* M5 balance (the owner's item 2): a Ministry opens with Mandate for its first rule. Income in Ministry 1 is about 1.7
   * a second against first-level lever costs of 200 to 280, so without a grant the first rule waited 130 to 170 s; 200
   * puts walking distance (200) in reach at once and every first level (220 to 280) within the first half minute. */
  startMandate: 200,
  confidence: {
    /* The design's figures (§3.1, §6.4): a new Ministry starts a little above the line, so the caretaker Parliament's
     * first poll is winnable by doing nothing and lost by doing everything at once. */
    start: 55,
    winAt: 50,
    /* Share of the gap to the target closed each model year. 0.15: a Parliament of 15 years closes 91% of a step in the
     * target, the first of 10 years 80%, so the mood a player makes is the mood at the next poll. Higher makes polls a
     * snapshot of the last few years; lower makes the start figure decide the first poll. */
    relaxPerYear: 0.15,
    /* C* with nothing happening, before wellbeing and pledges. Measured on real content (design/scratch/m5-prestige):
     * a Ministry's town, with the Coal Age capstoned and Motion open, sits at wellbeing 60–75, 26–41 points over the
     * target (34), so the wellbeing term is always positive; base 40 puts an untroubled Ministry with two pledges in
     * force at about 53–56, a few points over winAt. */
    base: 38,
    /* Per point of wellbeing above the target. 0.25: the 60–75 band reads +7 to +10, and the smog (which costs
     * wellbeing) costs Confidence through it. At 0.5 (the fixture's) every Ministry polled 70–80 and nobody lost. */
    perWellbeing: 0.25,
    /* Per unit of the household price that is levy (a levy recycled as a dividend counts −0.5 of its part, so it adds:
     * the contract). A duty that is a fifth of the price, paid to the Treasury, costs 8 points: the hawk who legislates
     * everything at once loses on this term (measured: defeated in Ministry 2; at −25 nobody lost). Findings: the
     * charge's `after` must exceed this × its share of the price to turn positive: Motion's congestion charge has after
     * +5 at a tenth of the price, so this stays above −50 (the Motion lane's note). */
    perPriceShare: -40,
    /* Per unit of jobs lost (Pryce's income under his peak this Ministry, uncompensated). A rule that takes a third of
     * his income costs 8 points until compensated. Raise it and compensation becomes mandatory; lower it and closures
     * are free. */
    perJobShare: -25,
    /* Per Commons level built this run: the Treasury's way of buying the mood. */
    perCommonsLevel: 1,
    /* Taken off C each model year per lever Pryce lobbies against (a positive magnitude: the contract's sign). One a
     * year carries a lever's carve-out within a Parliament from a few points above the line. */
    lobbyPerYear: 1,
    /* An inspection that finds concealment: a good headline. 1: with five rival Industries the steward finds something
     * on most rounds (34 of 38 in a measured Ministry 2), and at 3 the findings alone held Confidence over 80. */
    fineFound: 1,
    /* Any crisis in an open Industry (capstone arrears included). The Ministry's town sits at wellbeing 60–75 whatever
     * the smog does, so the crisis is how the unopposed Pryce costs the abstainer a poll: −20 relaxes back in about
     * five model years, so a crisis in the last minute or two before polling day loses it (at −8 the abstainer won
     * every poll through Motion's first crisis). */
    crisis: -20,
    /* Campaign (Opposition): findings: 0.05 took C to 100 in one press; 0.002 turns a typical 2,000 Mandate into 4
     * points. */
    campaignPerMandate: 0.002,
  },
  /* The design's terms (§6.4): first poll at ten model years (3.3 minutes), then every fifteen (5 minutes); the sheet
   * three model years before polling day, three offered, two kept. winMandate: a win pays about one lever level's
   * Mandate (a duty's first level costs 40-ish in the Act II kit). */
  elections: { firstTermYears: 10, termYears: 15, noticeYears: 3, offer: 3, keep: 2, winMandate: 60 },
  /* A lost election repeals one level (of the lever that costs Pryce most); two lost in a row end the Ministry. */
  opposition: { repealPerParliament: 1, lostInARowEnds: 2 },
  inspection: {
    /* Two Inspectors (the Alkali Inspectorate, the Inspectorate node and the Independent Inspectorate add more). With
     * five rival Industries in a Ministry (Motion and the capstoned Coal Age's four) and a five-year rest, each is
     * visited every 12.5 model years on cooldown against a quiet period of 6: findings land (findings: with two
     * Industries they never did). */
    inspectors: 2,
    cooldownYears: 5,
    /* The true burn stays shown for ten model years after an inspection (a decade's certificate). */
    revealYears: 10,
    /* Pryce's quiet period (± his `drawn` reading × quietSpread; the Statistics Act adds 4; Self-reporting takes 2). */
    quietYears: 6,
    /* Concealment ramps 2 points of the true burn a model year to a fifth: 10 years unvisited is the whole of it. */
    concealPerYear: 0.02,
    concealMax: 0.2,
    /* Fine (and the expected fine he weighs) × this. 0.5: he conceals where the expected fine is under the levy he
     * avoids; Heavier fines (×2) makes concealment stop paying in a levied Industry. */
    fineMul: 0.5,
  },
  /* The Treasury: a third of Pryce's income, and almost none of the levies (findings: at levyShare 0.1 the steward's
   * permit revenue outweighed the tax and abstaining stopped being the richer chair; ≤ 0.02 keeps criterion 8). */
  treasury: { taxShare: 0.3, levyShare: 0.02 },
  /* Compensation: five model years of the income Pryce lost; holds the jobs term off for ten. */
  compensation: { costYears: 5, years: 10 },
  /* Default amendment (a rung without its own `amend`): Mandate and five model years of drafting (design §6.2). */
  amend: { mandateCost: 80, years: 5 },
  /**
   * Hindsight in a Ministry (design §9.2; findings: the abstainer poor in Hindsight, target ≤ 0.4× the steward). Decades
   * kept are worth six times Act I's (perBudgetDecade 5 → 30): the term only restraint earns; wellbeing-years two fifths
   * (0.03 → 0.012) and divided by the burn (intensity exponent 0 → 1), so the abstainer's high wellbeing is divided by
   * Pryce's high intensity; a small term for Parliaments won (the abstainer wins most of them: findings put
   * perParliamentWon 2 at 0.50× the steward against 0.4, 0 at 0.46×). Measured on real content, 40-minute Ministries
   * (design/scratch/m5-prestige/q6-*.txt): abstain 60–62 a Ministry; the steward bot 124–232 and the human-like bot
   * 124–255 (abstain 0.27–0.50×; the bots keep one to four decades a Ministry). Statecraft is priced against the
   * steward's figure (prestige.ts SC_MINISTRY). Move perBudgetDecade first.
   */
  hindsight: { perWellbeingYear: 0.012, perBudgetDecade: 30, intensityExponent: 1, perParliamentWon: 1 },
  /**
   * The Treaty (design §6.9): offered between Ministries once an Industry has been settled from the Chair. Precedent
   * over the Ministries since the last Treaty (MetaState.office.record). Measured per 40-minute Ministry on real content:
   * about 8 Parliaments won, 7,000 wellbeing-years, 0–4 certified decades. Weighted so that five Ministries and one
   * settlement pay about 15 (certified decades 0.5 each, the largest share for the steward who inspects; a settlement 3;
   * a Parliament won 0.1; ten thousand wellbeing-years 1): three of the four Articles (18 in all), the fourth at the next
   * Treaty. Raise perCertifiedDecade before the others: it is the term only inspection earns.
   */
  treaty: {
    when: { stat: 'settledFromChair', op: '>=', value: 1, label: 'An Industry settled from the Chair' },
    perCertifiedDecade: 0.5,
    perSettledFromChair: 3,
    perParliamentWon: 0.1,
    perWellbeingYear: 0.0001,
  },
  /* The Confidence target and forecast are shown once Polling is bought (Statecraft). */
  showTarget: { owns: POLLING_NODE, label: 'Polling' },
};

/* ------------------------------------------------------------------ */
/* THE RIVAL: Pryce Consolidated                                       */
/* ------------------------------------------------------------------ */

export const rival: RivalDef = {
  id: 'pryce',
  name: 'Pryce Consolidated',
  cast: 'pryceChair',
  /**
   * The profile for a save without a first opening (design §5.2: the balancer's `efficiency` opening). That opening buys
   * about a card a minute in its first ten (haste about 0.4 on [0.5, 2]), founds rarely (a quarter of its actions), takes
   * the larger-demand arm of a fork (volume 0.6), never draws a line (drawn 0) and answers no letters (pliant 0.5).
   */
  defaultProfile: { haste: 0.4, founder: 0.25, volume: 0.6, drawn: 0, pliant: 0.5 },
  responses: [
    { kind: 'comply' },
    { kind: 'evade', feature: 'loopholes' },
    /* Lobbying: £3 a Confidence point above the carve-out line, × a model year of the Industry's income / 100. At five
     * points above the line that is 15% of a year's income, inside the comply costs (0–90%: findings, E2). The line
     * (52 + drawn × 10) sits just above winAt: he lobbies a popular Ministry down to the edge of losing. */
    { kind: 'lobby', lobby: { costPerPoint: 3, carveOutAt: 52 } },
    /* Litigation (design: window 5, delay 3). The fee in model years of the Industry's income: the Motion lane measured
     * Motion's comply costs at 0–24% of a year, so at 0.3 he never litigated there; 0.1 sits inside that range (findings
     * E2), so a fresh raise that costs him more than a tenth of a year goes to court. */
    { kind: 'litigate', litigate: { windowYears: 5, delayYears: 3, feeYears: 0.1 } },
    { kind: 'conceal', feature: 'inspection' },
  ],
  policy: {
    /* Payback limit: patient 240 s to hasty 60 s (design §5.2). Founding limit (lerp(foundSlow, foundFast, founder)):
     * M5 balance: 200 s for a player who rarely founded to 300 s for one who founded most (design §5.2: "a founder's
     * Pryce founds sooner", i.e. takes a longer payback on a new use). It was 300 to 90, the wrong way round, and the
     * 90 s end founded none of Motion's dated uses: under abstain the seven grid profiles with founder ≥ 0.54 had no
     * crisis in 60 minutes (design/scratch/m5-balance/g0-abstain.txt); founder 0.48 (a 199 s limit) had one at 21. */
    paybackSlow: 240, paybackFast: 60, foundSlow: 200, foundFast: 300,
    /* A player who drew lines early taught him to expect rules: his carve-out line up to 10 points higher. */
    drawnLobby: 10,
    /* Quiet period ± 2 model years by `drawn` (design §6.3: 4–8). */
    quietSpread: 4,
  },
  /* Haste over 0.5–2 purchases a minute; a line drawn inside 30 minutes reads as drawn; both generations of Pryce letters
   * (Josiah, Act I Iron; his son, the Motion Preview) count for `pliant`. */
  profileFrom: { hasteAtPerMinute: [0.5, 2], drawnBySeconds: 1_800, casts: ['pryce', 'prycePater'] },
  /* "Pryce has read your notebooks": η × min(1.25, 1 + 0.01 × Σ levels). E8: no collapse before the first poll at any
   * head start tried. */
  knowhowTransfer: { k: 0.01, cap: 1.25 },
  /* His purse when a chair Industry opens: a minute of its income (the Market's opening reach, roughly). */
  startCapitalSeconds: 60,
};

/* ------------------------------------------------------------------ */
/* PLEDGES that are not an Industry's own (design §13: 2 general)      */
/* ------------------------------------------------------------------ */

/**
 * The general pledges. Each with a `when` (lint). Motion's six and Plenty's four are in their modules. Content order is
 * the draw's order; the mildest comes first (an ignored sheet keeps the first two drawn).
 */
export const generalPledges: PledgeDef[] = [
  {
    /* Cheap Confidence paid by the Treasury: a tenth of its income for a Parliament. */
    id: 'pledge.homes', name: 'Homes fit for heroes',
    blurb: 'A house-building programme, paid for out of the Treasury’s takings.',
    confidence: 3, atPoll: 4, treasuryShare: 0.1,
    when: { feature: 'chair', label: 'In office' },
  },
  {
    /* The temptation against inspection: four points for one Inspector fewer for a Parliament. Offered once there are
     * Inspectors to give up. */
    id: 'pledge.lighterTouch', name: 'A lighter touch for business',
    blurb: 'Fewer inspectors calling on firms that have done nothing wrong.',
    confidence: 4, effects: [{ type: 'inspectorAdd', value: -1 }],
    when: { feature: 'inspection', label: 'Inspection in force' },
  },
];

/* ------------------------------------------------------------------ */
/* THE TREATY: Articles (the player's) and playbooks (Pryce's)          */
/* ------------------------------------------------------------------ */

/**
 * Four Articles (design §6.9), bought with Precedent, kept for good. Prices (18 in all): a first Treaty pays about 15
 * (ChairDef.treaty), so three of the four; the fourth at the second Treaty. The cheapest is the gentlest (longer
 * Parliaments), the dearest the one that changes Opposition (the Ratchet Clause).
 */
export const articles: ArticleDef[] = [
  {
    id: 'art.inspectorate', name: 'An Independent Inspectorate',
    blurb: 'An Inspector more in every Ministry, answerable to the Treaty rather than the Minister.',
    cost: 4, effects: [{ type: 'inspectorAdd', value: 1 }],
  },
  {
    id: 'art.ratchet', name: 'The Ratchet Clause',
    blurb: 'No incoming government may repeal a rule in force. Losing an election costs the pledge, not the lever.',
    cost: 6, effects: [{ type: 'ratchet' }],
  },
  {
    id: 'art.statistics', name: 'The Statistics Act',
    blurb: 'Returns are audited by statute. Pryce waits four years longer before his figures start to drift.',
    cost: 5, effects: [{ type: 'quietYearsAdd', value: 4 }],
  },
  {
    id: 'art.fixedTerms', name: 'Fixed-term Parliaments',
    blurb: 'Twenty years between elections instead of fifteen: longer to keep a promise, and longer to pay for one.',
    cost: 3, effects: [{ type: 'termYearsAdd', value: 5 }],
  },
];

/** Two playbooks (design §6.9): Pryce learns one at each Treaty after Take office. */
export const playbooks: PlaybookDef[] = [
  {
    id: 'pb.selfReporting', name: 'Self-reporting', treaty: 1,
    blurb: 'Pryce Consolidated volunteers its own returns. The figures begin to drift two years sooner.',
    effects: [{ type: 'quietYearsAdd', value: -2 }],
  },
  {
    id: 'pb.friendsInThePress', name: 'Friends in the Press', treaty: 2,
    blurb: 'Leader writers who lunch with the Chairman. Lobbying costs him a third less.',
    effects: [{ type: 'rivalCostMul', response: 'lobby', value: 2 / 3 }],
  },
];
