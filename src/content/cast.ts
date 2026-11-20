/**
 * M3: the cast (Content.cast): the recurring, fictional people who write to the proprietor. Nobody here is real; real
 * people appear only in card blurbs, and only the dead.
 * Content is data (see README.md): every condition and word here is read by the core and the UI; no game rules.
 *
 * How the cast grows (owner, 19 Nov 2026: "options should be unlocked more slowly"): run 2 brings one correspondent with
 * simple two-armed letters; Mr Whitlow writes once the budget has arrived (run 3); Mr Pryce once Motion has opened
 * (run 3–4); Mrs Fenwick with the Commons (run 4); Mr Ashworth in run 4, once a seam is sunk or Light has grown; the
 * Minister last (run 5). Six people, and the 250 years need successors: the Whitlow chair and Dr Fenwick after 1940
 * and 1950, Ms Ashworth after 1950. Pryce, the correspondent and the Minister never need one: there is always a Mr
 * Pryce, the by-line outlives its writers, and a minister is an office.
 *
 * `voice` is for writers and never shown. Read each letter aloud in its writer's voice before keeping it.
 */
import type { CastDef, Cond } from '../types';
import { all, any, BUDGET, owns, rk, sec, year } from './dispatches/kit';

/*
 * M5 (the text lane): the proprietor's correspondents stop writing once office is taken. They wrote to the proprietor,
 * who has retired to public life; the Ministry's letters come from the M5 cast (castM5), and every non-wager letter of
 * a Ministry waits for a wager answered that Parliament (dispatches/chair.ts), which an older letter in the pool would
 * dilute. Kept as a conjunct, so nothing changes before Take office.
 */
const NOT_IN_OFFICE: Cond = { not: { flag: 'office' } };
/* Miss Whitlow is left as she was (the lint pins her gate): she writes only the pamphlet and its follow-ups. */

export const cast: CastDef[] = [
  {
    id: 'correspondent',
    name: 'Our Correspondent',
    role: 'The Gazette’s own correspondent, in the provinces',
    voice:
      'The paper’s eyes. Reports what was seen today, in short declarative sentences, with one number and one sight ' +
      '(a queue, a chimney, a price chalked on a board). Never argues; puts a plain question to the proprietor in the ' +
      'last line, as a statement: “The editor would be glad of a line by return.” Wants a story, and the proprietor ' +
      'on the record. Slightly amused, never unkind. Two choices, simple ones: this is the voice that teaches the ' +
      'player what a dispatch is. The post changes hands every generation; the by-line never does.',
    figure: 'correspondent',
    when: all(rk(1), NOT_IN_OFFICE),
  },
  {
    id: 'whitlow',
    name: 'Mr Whitlow',
    role: 'Economist; a pupil of Mr Jevons',
    voice:
      'Precise, patient, fond of “it follows that” and of counting things nobody else counts. Quotes his master only ' +
      'in the master’s verified words. Distrusts thrift and sermons equally; wants the arithmetic understood and ' +
      'restraint priced honestly. Usually right about the coal, often wrong about people: he forgets that a measure ' +
      'needs votes. Writes long, cuts himself short. His arc: a pamphlet ignored, then cited, then a chair.',
    figure: 'whitlow',
    when: all(BUDGET, year('<', 1940), NOT_IN_OFFICE),
  },
  {
    id: 'whitlowChair',
    name: 'The Whitlow Professor',
    role: 'Holds the chair of political economy endowed in Mr Whitlow’s name',
    voice:
      'Mr Whitlow’s arithmetic with a statistics department behind it. Cites “the Whitlow tables” a little wearily, ' +
      'because both sides quote them. Elasticities, time series, confidence intervals in plain words. Wants what ' +
      'the founder wanted: the rebound measured before the measure is praised. Dry, generous, occasionally tired.',
    figure: 'whitlow',
    when: all(BUDGET, year('>=', 1940), NOT_IN_OFFICE),
  },
  {
    id: 'fenwick',
    name: 'Mrs Fenwick',
    role: 'Honorary secretary, the Smoke Abatement Society',
    voice:
      'Brisk, practical, minutes and petitions. Reports what her members saw: the washing, the coughs, the lamps lit ' +
      'at noon. Always willing to pay for the slower, cleaner thing, and to make whoever made the smoke pay too. ' +
      'Never moralises; she has a list. Sometimes wrong: her remedies can move the smoke rather than end it (the tall ' +
      'chimney). Ends with the date of the Society’s next meeting.',
    figure: 'fenwick',
    when: all(rk(3), year('<', 1950), NOT_IN_OFFICE),
  },
  {
    id: 'fenwickCouncil',
    name: 'Dr Fenwick',
    role: 'Chair of the Clean Air Council; the Society’s secretary was her grandmother',
    voice:
      'An epidemiologist with her grandmother’s list-making. Measured, specific, a date and a deadline in every ' +
      'letter. Pays for the slower thing and says what it costs. Never shrill; the numbers are the argument.',
    figure: 'fenwick',
    when: all(rk(3), year('>=', 1950), NOT_IN_OFFICE),
  },
  {
    id: 'ashworth',
    name: 'Mr Ashworth',
    role: 'Engineer, of Ashworth & Sons',
    voice:
      'Proud, generous, technical: horsepower, duty, fathoms, candlepower. Believes every trouble has an engineering ' +
      'answer and is half right every time. Writes on the firm’s paper, mentions the works and his sons, offers a ' +
      'better machine at a fair price. Never sees the rebound coming and is honestly surprised by it each time.',
    figure: 'ashworth',
    when: all(rk(3), year('<', 1950), any(sec('seamsSunk', 'steam', '>=', 1), sec('appsFounded', 'light', '>=', 3)), NOT_IN_OFFICE),
  },
  {
    id: 'ashworthLater',
    name: 'Ms Ashworth',
    role: 'Chief engineer; the fifth Ashworth in the trade',
    voice:
      'The family pride in the better machine, with a family memory of what the last one did. Technical and exact; ' +
      'a dry footnote about her great-great-grandfather’s engine. Still offers the better machine.',
    figure: 'ashworth',
    when: all(rk(3), year('>=', 1950), NOT_IN_OFFICE),
  },
  {
    id: 'pryce',
    name: 'Mr Pryce',
    role: 'Of Pryce & Sons, manufacturers',
    voice:
      'Genial, reasonable, plain-spoken, never a villain. Always in favour of the cheaper thing, and of “the customer”, ' +
      'and of his people at the works. Offers a gentleman’s understanding in place of a rule. Sometimes right: cheap ' +
      'things do feed people. There is always a Mr Pryce: the mills, then the motor works, then the servers, each ' +
      'generation with the same handshake. In a later Act he runs the Industries against the player; write him so ' +
      'that this will feel earned, and fair.',
    figure: 'pryce',
    when: all(owns('motion'), NOT_IN_OFFICE),
  },
  {
    id: 'minister',
    name: 'The Minister',
    role: 'Of the Crown, for the time being',
    voice:
      'Courteous, careful, passive voice. Is “listening”; the inquiry will report “in due course”. Wants the Mandate ' +
      'to last until the next election, and asks for something in exchange. Decisive only in a crisis, and then ' +
      'surprisingly so. Never named; ministers change, the office writes.',
    figure: 'minister',
    when: all(rk(4), NOT_IN_OFFICE),
  },
  {
    id: 'missWhitlow',
    name: 'Miss Whitlow',
    role: 'Statistician; Mr Whitlow’s daughter',
    voice:
      'Her father’s arithmetic, turned on the proprietor. Asks the question of the Proprietor’s Day (“Why does the ' +
      'labour-saving machine save no labour?”) and does not answer it. Writes only the pamphlet and its follow-ups.',
    figure: 'whitlow',
    when: { flag: 'proprietor' },
  },
];

/*
 * M4 (the text lane): three more, for Iron and Fishing. A separate export until the Act lane registers Iron and Fishing
 * (their `when`s name both Industries, which the lint resolves only once they are in content): Content.cast becomes
 * [...cast, ...castM4]. Each writes only in the Coal Age's own Act: once the Act I ending is reached ({ ending:
 * 'actOne' }) the Coal Age is settled for good and an ironmaster of 1860 has no business writing to a motor works.
 *
 * The elder Pryce's arrival is why the younger Mr Pryce (above) needs no change: his `when` is owns('motion'), and
 * Motion now opens only after the Act I ending (a Preview), so his letters, Steam's and Light's among them, fall in the
 * Preview, and the elder writes in Iron's run 4 instead. Same family, same handshake, a century earlier.
 */
const BEFORE_ACT_ONE_END: Cond = { not: { ending: 'actOne' } };

export const castM4: CastDef[] = [
  {
    id: 'prycePater',
    name: 'Mr Josiah Pryce',
    role: 'Ironmaster, of the Ravensdale works',
    voice:
      'The founder: the first Pryce, who made the family’s money in pig iron and taught every later Pryce the ' +
      'handshake. Genial, expansive, a self-made man who enjoys saying so; always for the cheaper thing, and right ' +
      'that cheap iron builds the kingdom. Talks tons, furnaces in blast and the price at Wolverhampton. Never a ' +
      'villain; never sees that the coal his furnaces save is burnt in every engine his rails make cheaper. Signs off ' +
      'with an invitation to see the works lit at night. His grandson’s company will buy the Works in a later Act: ' +
      'write him so that the reader likes him.',
    figure: 'pryceElder',
    when: { all: [{ owns: 'iron' }, BEFORE_ACT_ONE_END] },
  },
  {
    id: 'tench',
    name: 'Skipper Ewart Tench',
    role: 'Trawler skipper, of Grimsby',
    voice:
      'Proud, practical, plain. Thirty years at sea and the catch per trip in his head to the stone. Trusts what ' +
      'comes up in the net, distrusts what comes out of a report, and says both outright. Writes short, in the ' +
      'quay’s words (the Dogger, the Silver Pits, prime, offal, a good trip), for his crew before himself. Wrong ' +
      'about the sea for honest reasons: the fleet always finds the fish that are left. Never a figure of fun.',
    figure: 'skipper',
    when: { all: [{ owns: 'fishing' }, BEFORE_ACT_ONE_END] },
  },
  {
    id: 'isbister',
    name: 'Miss Isbister',
    role: 'Naturalist to the Fishery Board',
    voice:
      'Precise, underfunded, right. Counts what is in the sample jar, not what is on the quay, and says what she ' +
      'cannot know as carefully as what she can. Asks for small sums for exact purposes (a vessel for a summer, a ' +
      'second assistant). Never says “I told you so”; prints the table. Dry wit, all in the footnotes. Arrives with ' +
      'Fishing’s first poor season, or with the Board’s first survey.',
    figure: 'naturalist',
    when: {
      all: [
        { any: [{ stat: 'crises', sector: 'fishing', op: '>=', value: 1 }, { flag: 'survey:fishing' }] },
        BEFORE_ACT_ONE_END,
      ],
    },
  },
];

/*
 * M5 (the text lane): the Ministry's correspondents (design/m5-design.md §6.10). Each writes only in a Ministry
 * ({ flag: 'office' }, set by takeOffice for good): Act II's letters are written to the Minister, not the proprietor. A
 * separate export until the registry folds it in: Content.cast becomes [...cast, ...castM4, ...castM5] (Mrs Okonedo's
 * `when` names Plenty; she joins when Plenty is registered, castM5Plenty).
 *
 * Sir Edmund is the third Pryce: Josiah's grandson, the younger Mr Pryce's son. He is the rival (RivalDef.cast); his
 * letters weigh × (1 + pliant) in the draw, so a Ministry the family found agreeable hears from him more often.
 */
const OFFICE: Cond = { flag: 'office' };

export const castM5: CastDef[] = [
  {
    id: 'pryceChair',
    name: 'Sir Edmund Pryce',
    role: 'Chairman, Pryce Consolidated',
    voice:
      'The family handshake with a board behind it. Genial, reasonable, well advised and never a villain: he answers a ' +
      'rule as any sound company would, and says so. Praises the Ministry’s intention in his first sentence and prices ' +
      'it in his second. Always for the cheaper thing, the customer and his people at the works; fond of the phrase ' +
      '“in the national interest”. He never lies in a letter (he conceals in returns, which is a different ' +
      'department), so his offers are exact and their conditions are printed. Signs off “With every good wish for the ' +
      'Ministry”. Mentions his grandfather’s furnaces at Ravensdale once a Ministry, fondly.',
    figure: 'pryceChair',
    when: OFFICE,
  },
  {
    id: 'permanentSecretary',
    name: 'The Permanent Secretary',
    role: 'Head of the Ministry’s civil service',
    voice:
      'Dry, procedural, unhurried and always right about the drafting time. Writes minutes, not letters: numbered ' +
      'points, the precedent, the cost in Mandate and the years it will take. Never offers a view on policy and never ' +
      'needs to. Outlasts every Minister and is gently aware of it. A single dry aside per minute, in the last line.',
    figure: 'permanentSecretary',
    when: OFFICE,
  },
  {
    id: 'chiefInspector',
    name: 'The Chief Inspector',
    role: 'Of the Ministry’s Inspectorate; formerly of the Alkali Inspectorate',
    voice:
      'Laconic. Short sentences, one figure, one place. Thirty years of chimneys and returns; trusts a sample, not a ' +
      'statement. Asks for small, exact things (a second motor car for the district, a laboratory bench). Never ' +
      'accuses: reports that the figures differ, and by how much. Signs with initials only.',
    figure: 'inspector',
    when: { all: [OFFICE, { feature: 'inspection' }] },
  },
  {
    id: 'opposition',
    name: 'The Leader of the Opposition',
    role: 'Across the floor, for the time being',
    voice:
      'Courteous, patient, waiting. Agrees with the Ministry’s aims in public and with the voters’ grievances in ' +
      'private, and offers the occasional bargain across the floor. Never belongs to a party the reader could name; ' +
      'never left or right. Knows that every Ministry ends, and writes as if he will be there when this one does.',
    figure: 'opposition',
    when: { all: [OFFICE, { feature: 'chair' }] },
  },
];

/** M5: Mrs Okonedo, of Plenty (registered once Plenty is: Content.cast += castM5Plenty). */
export const castM5Plenty: CastDef[] = [
  {
    id: 'okonedo',
    name: 'Mrs Okonedo',
    role: 'Secretary, the Fenland Growers’ Association',
    voice:
      'Practical, warm, unsentimental. Farms four hundred acres with her sons and keeps the Association’s books. ' +
      'Knows the water table by the depth of her neighbours’ wells, and distrusts the drip subsidy because she has ' +
      'seen what it did to them: every field watered better, and more fields. Writes in acres, feet and bushels; ' +
      'wants a fair price for the grain and water for the grandchildren, and says both plainly. Never a figure of fun.',
    figure: 'okonedo',
    when: { all: [OFFICE, { owns: 'plenty' }] },
  },
];
