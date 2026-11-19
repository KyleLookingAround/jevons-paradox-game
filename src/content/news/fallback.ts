/**
 * The fallback headlines (Content.headlines), for any Industry and Age. Industry-specific lines live in
 * sectors/<id>.ts.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { HeadlineKey } from '../../types';

/* ------------------------------------------------------------------ */
/* HEADLINES                                                           */
/* ------------------------------------------------------------------ */

/*
 * The fallback set is written to fit any industry and age. Lines that only make sense in one industry (fog, gridlock,
 * heat domes, outages) live in sectorHeadlines. Placeholders: {sector} {age} {app} {resource} {service} {year} {n}.
 */
export const headlines: Record<HeadlineKey, string[]> = {
  efficiency: [
    'Makers promise “a lasting fall” in the use of {resource}',
    'Inventor hailed: “the {resource} problem is solved”',
    'Experts agree the improvement will ease demand for {resource}',
    'Record economy claimed; buyers ask how much more they can buy',
    'Thriftier machines unveiled; the order books fill by lunchtime',
    'A third less {resource} per unit, say makers; the units sell well',
    'Improvement adopted across the trade within the month',
    'Engineers save a fifth; the trade press calls it a turning point',
  ],
  appAvailable: [
    'Now within reach of the ordinary purse: {app}',
    'Prospectus issued for {app}; subscribers queue',
    'Speculators eye {app} as costs tumble',
    'Once a rich man’s fancy, {app} now merely expensive',
    'Promoters of {app} find the sums add up at last',
    'Survey stakes go in for {app}; the parish objects, mildly',
    '{app} “a going concern”, say the people selling it',
  ],
  appFounded: [
    'Opened to crowds and a brass band: {app}',
    '{app} founded; “a new age”, says the chairman',
    'Investors pile into {app}; orders for {resource} double',
    'Ribbon cut on {app}. Nobody asks what it will burn',
    '{app} declared “indispensable” within the week',
    '{app} oversubscribed; demand for {resource} “healthy”',
    'First dividend from {app}; the second is already spent',
  ],
  sectorOpened: [
    '{sector} arrives. The old trades look on, unbothered',
    'Correspondent sees “the dawn of {sector}”',
    'Parliament welcomes {sector}; demand for {resource} “manageable”',
    'A new industry, {sector}, opens for business in {year}',
    'Investors flock to {sector}; nobody mentions {resource}',
    '{sector} opens; the prospectus runs to forty pages',
  ],
  crisis: [
    'Doctors report a run on the hospitals; the trade “saddened”',
    'Emergency No. {n} declared; minister “listening”',
    'Public meeting demands action; council forms a committee',
    'Crisis in {sector}; officials blame “exceptional conditions”',
    'Inquiry into {resource} to report “in due course”',
    'Second emergency this decade “a coincidence”, says the trade',
  ],
  collapse: [
    'Collapse: commerce suspended until further notice',
    '{sector} grinds to a halt beneath its own waste',
    '{sector} stops; for once, so do the arguments',
    'The machinery stops. The inquiry begins',
    'Nothing moves in {sector}; the ledgers record a total loss',
  ],
  exhausted: [
    'The last of the {resource} is gone; the price “no longer meaningful”',
    'Final consignment of {resource} sold at auction',
    'Reserves exhausted, decades ahead of the forecast',
    'Nothing left to burn; experts had said “centuries”',
    'Stocks of {resource} nil; the trade asks for patience',
  ],
  backfire: [
    'Thriftier machines, yet the use of {resource} climbs to a record',
    'Economist puzzled: savings “appear to have been spent”',
    'Use of {resource} up again, despite the improvements',
    'Every saving promised, none delivered, figures show',
    'Half the {resource} per unit; more units than anyone imagined',
    'Ministry statistician “double-checked the figures, twice”',
  ],
  reveal: [
    'Young economist’s book causes a stir: thrift breeds appetite',
    'Book on the coal trade argues that thrift is not the same as saving',
    'The Coal Question: dismissed in the clubs, read at the Treasury',
    'Statistician adds up the whole country, alarms everyone',
    'New book on coal sells out; a second edition follows in 1866',
  ],
  leverEnacted: [
    'Bill passes after a long night in the House',
    'New measure welcomed by some, denounced by more',
    'Government acts; industry warns of “ruin”',
    'Reform enacted. Leader writers divide along the usual lines',
    'Measure passes by eleven votes; both sides claim victory',
    'Minister says the new rules will “bite gently”',
    'Order in council signed at breakfast, debated at dinner',
    'Trade associations “study the detail”; lawyers study it harder',
    'Measure in force from midnight; the queue at the office forms at six',
    'New rules published; a second edition corrects the first',
  ],
  leverLapsed: [
    'Measure quietly allowed to lapse',
    'Reform repealed amid cheers from the trade benches',
    'Public patience runs out; the policy goes with it',
    'Ministers drop scheme “for now”',
    'Funds exhausted, the measure lapses at midnight',
    'Rules suspended “pending review”; nobody is reviewing them',
    'The measure dies in committee, of neglect',
    'Inspectors stood down; the forms are kept, just in case',
  ],
  steadySector: [
    '{sector} steadies: use falls, and nobody goes without',
    'A curious thing: less {resource} burned, and everyone content',
    'Fifty years inside the line: {sector} declared “steady”',
    'Economy of {sector} steady, to general surprise',
    'Half a century of {sector} within budget; no one quite noticed',
    '{sector} holds its line for fifty years; the press finds other news',
  ],
  steadyAll: [
    'Every gauge within its line, every household fed. A first',
    'Steady State: the world grows better without growing',
    'Historians may call it the end of the rebound',
    'Nothing much happens, for fifty years, on purpose',
    'The ledgers balance in every Industry; the auditors go home',
  ],
  reckoning: [
    'An inquiry sits. The ledgers are read from the start',
    'A reckoning: what was saved, and what was spent',
    'Commission reports; recommends, as ever, doing better',
    'Lessons learned, the minutes say, and filed',
    'Inquiry finds everyone acted rationally, which was the trouble',
    'The books are closed, and opened again at page one',
  ],
  ageBegins: [
    '{age} begins, by most accounts, in {year}',
    'Historians to date {age} from this week, probably',
    'Correspondent declares {age} begun; editor sceptical',
    'Welcome to {age}. Mind the step',
    '{age}: the old appetites, with new machines',
  ],
  budgetDrawn: [
    'Government draws a line under the use of {resource}, in ink',
    'A budget for {resource}: so much this decade, less the next',
    'Treasury publishes a budget for {resource}; few read the footnotes',
    'Line drawn under {sector}: it is to fall, gently, for ever',
    'Budget set at today’s use of {resource}, and lower thereafter',
  ],
  decade: [
    'Decade {n} within budget; officials “cautiously pleased”',
    '{sector} completes decade {n} within its budget, without fuss',
    'Budget kept for decade {n}; nobody went without',
    'Another decade inside the line; {sector} takes it in its stride',
    'Decade {n} of restraint passes without incident, or headlines',
  ],
  budgetBroken: [
    '{sector} breaks its budget; the streak ends',
    'The line is crossed: use of {resource} above budget again',
    'Restraint ends in {year}; the ledger is reopened',
    'Budget breached. Ministers blame the weather',
    '“Temporary” overshoot of the budget, says minister',
  ],
  /* M2. {name} is a Commons project or a Charter, kept as authored: it goes at the start or after a colon. */
  clearSkies: [
    'The air over {sector} clears; the oldest residents cannot recall it',
    'Sky seen over {sector} for the first time in living memory',
    'Pressure below the line; {sector} reports a clear day',
    '{sector} under clear skies; the weather column has nothing to add',
    'A clear day over {sector}; the almanac is revised',
    'Inspectors find the air over {sector} fit to be seen through',
  ],
  settled: [
    '{sector} settles; the ledger closes at a sum the sky can bear',
    '{sector} frozen at what it needs; the clerks go home on time',
    'Settlement agreed for {sector}; nothing will grow there, on purpose',
    '{sector} settled in {year}; the papers move it to the back pages',
    'Figures for {sector} fixed; the inquiry adjourns indefinitely',
    '{sector} to stay as it is, by agreement; both sides claim the credit',
  ],
  unsettled: [
    'Settlement of {sector} lapses; the old demand arrives all at once',
    '{sector} unsettled; the town had grown into it while nobody looked',
    'Defence of {sector} abandoned; the queue at the door is let in',
    '{sector} back on the open market; prices fall, orders rise',
    'Settlement of {sector} ends; the files come out of storage',
    'Mandate runs dry; {sector} is unsettled and resumes its growth',
  ],
  commonsBuilt: [
    '{name}: opened by the mayor, and well attended',
    'Opened today: {name}. A letter to the editor objects to the cost',
    '{name}: ribbon cut, speeches made, gas turned up',
    'New for the town: {name}. The trams run extra on Sunday',
    '{name}: “a credit to the borough”, says the committee that built it',
    'Levy money laid out at last: {name}',
  ],
  charter: [
    'Charter granted: {name}',
    '{name}: the new run begins on new terms',
    'Terms of the run announced: {name}. The clubs are cautiously in favour',
    '{name}: and so the valley starts again, a little differently',
    'New charter sealed: {name}; the old one is framed in the hall',
    'The commission’s choice: {name}. The losing draft goes to the archive',
  ],
  /* The unfolding: a feature's headline is its own intro line (Content.features); none are drawn from here. */
  featureUnlocked: [],
  /* M3. {name} is the seam ('seamSunk'), the lever ('biteBack') or the History ('history'), kept as authored. */
  seamSunk: [
    '{name} sunk; {resource} cheaper again, and more of it burned',
    'Shaft reaches the {name}; the question of {resource} deferred again',
    '{name} opened; the reserve grows deeper, and dearer',
    'Pumps reach the {name}; owners call the reserve “good for a century”',
    '{name} worked at last, thanks to the engines that will burn it',
    'New winding gear over the {name}; the price at the pithead eases',
  ],
  biteBack: [
    '{name} works; the trouble is how well',
    'Second thoughts: {name}, and the side effects growing',
    '{name} succeeds, and its loophole succeeds faster',
    '{name} has bred its own exception, inquiry finds',
    '{name} “working as intended”, says the department; so is the dodge',
    '{name}: its critics find, to their dismay, that they were right',
  ],
  /* Content.dispatches and Content.ambient supply their own text; these keys only mark the item. */
  dispatch: [],
  answered: [],
  ambient: [],
  history: [
    '{name}: the historians concede the point',
    'The other road taken: {name}, and it held',
    '{name} written up for the archive; the footnotes run long',
    'What might have been, done: {name}',
    '{name}: the seminar ends in agreement, for once',
    '{name} settled; the counterfactual enters the textbooks',
  ],
  /* The household return's texts come from Content.proprietor. */
  return: [],
  returnWithdrawn: [],
  /* The first ending ({year}), beside 'steadyAll'; printed once ever. */
  ending: [
    'Fifty years at the sink line; the Gazette prints the date, {year}',
    'The ledgers balance, and stay balanced, in {year}',
    'Steady State everywhere in {year}; the leader column is left blank',
    'Every Industry within the sky’s means; the year is {year}',
    'The rebound runs out of road in {year}; the presses pause a minute',
    '{year}: enough, it turns out, and to spare',
  ],
};
