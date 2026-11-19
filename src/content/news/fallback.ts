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
    'New {service} saves a third of the {resource}, say makers',
    'Inventor hailed: “the {resource} problem is solved”',
    'Efficiency gains to ease demand for {resource}, experts agree',
    'Cheaper {service}; {resource} merchants order more stock',
    'Thriftier machines promise “a lasting fall” in {resource} use',
    'Makers boast record economy; buyers ask how much more they can buy',
  ],
  appAvailable: [
    '{app} now within reach of the ordinary purse',
    'Prospectus issued for {app}; subscribers queue',
    'Cheap {service} makes {app} a going concern',
    'Speculators eye {app} as costs tumble',
    '{app}, once a rich man’s fancy, now merely expensive',
    '{app} promoters find {service} cheap at last',
  ],
  appFounded: [
    'First {app} opens to crowds and a brass band',
    '{app} founded; “a new age”, says the chairman',
    '{app} draws investors; {resource} orders double',
    'Ribbon cut on {app}. Nobody asks what it will burn',
    '{app} declared “indispensable” within the week',
    '{app} opens; demand for {resource} “healthy”',
  ],
  sectorOpened: [
    '{sector} arrives. The old trades look on, unbothered',
    'Correspondent sees “the dawn of {sector}”',
    'Parliament welcomes {sector}; {resource} demand “manageable”',
    'The {sector} industry opens for business, {year}',
    'Investors flock to {sector}; nobody mentions {resource}',
  ],
  crisis: [
    'Doctors report a run on the hospitals; {resource} blamed',
    'Emergency No. {n} declared; minister “listening”',
    'Public meeting demands action; minister “listening”',
    '{sector} in crisis; officials blame “exceptional conditions”',
    'Inquiry into {resource} to report “in due course”',
  ],
  collapse: [
    'Collapse: commerce suspended until further notice',
    '{sector} grinds to a halt beneath its own waste',
    'Too late to argue: {sector} stops',
    'The machinery stops. The inquiry begins',
  ],
  exhausted: [
    '{resource} runs dry; price “no longer meaningful”',
    'Final consignment of {resource} sold at auction',
    'Reserves exhausted, decades ahead of the forecast',
    'Last of the {resource} gone; experts had said “centuries”',
  ],
  backfire: [
    'Thriftier machines, yet {resource} burned climbs to a record',
    'Economist puzzled: savings “appear to have been spent”',
    '{resource} use up again, despite the improvements',
    'Every saving promised, none delivered, figures show',
    'The more we save, the more we burn, a correspondent writes',
    'Half the {resource} per unit; more units than anyone imagined',
  ],
  reveal: [
    'Young economist’s book causes a stir: thrift breeds appetite',
    '“The very contrary is the truth”, writes Mr Jevons',
    'The Coal Question: dismissed in the clubs, read in the Treasury',
    'Statistician adds up the whole country, alarms everyone',
    'Fuel economy “a confusion of ideas”, says young economist',
  ],
  leverEnacted: [
    'Bill passes after a long night in the House',
    'New measure welcomed by some, denounced by more',
    'Government acts; industry warns of “ruin”',
    'Reform enacted. Leader writers divide along the usual lines',
    'Measure passes by eleven votes; both sides claim victory',
    'Minister says the new rules will “bite gently”',
  ],
  leverLapsed: [
    'Measure quietly allowed to lapse',
    'Reform repealed amid cheers from the trade benches',
    'Public patience runs out; the policy goes with it',
    'Ministers drop scheme “for now”',
    'Funds exhausted, the measure lapses at midnight',
  ],
  steadySector: [
    '{sector} settles: use falls, and nobody goes without',
    'A curious thing: {resource} down, and everyone content',
    'Fifty years inside the line: {sector} declared “steady”',
    'Economy of {sector} steady, to general surprise',
    'Half a century of {sector} within budget; no one quite noticed',
  ],
  steadyAll: [
    'Every gauge within its line, every household fed. A first',
    'Steady State: the world grows better without growing',
    'Historians may call it the end of the rebound',
    'Nothing much happens, for fifty years, on purpose',
  ],
  reckoning: [
    'An inquiry sits. The ledgers are read from the start',
    'A reckoning: what was saved, and what was spent',
    'Commission reports; recommends, as ever, doing better',
    'Lessons learned, the minutes say, and filed',
    'Inquiry finds everyone acted rationally, which was the trouble',
  ],
  ageBegins: [
    '{age} begins, by most accounts, in {year}',
    'Historians to date {age} from this week, probably',
    'Correspondent declares {age} begun; editor sceptical',
    'Welcome to {age}. Mind the step',
    '{age}: the old appetites, with new machines',
  ],
  budgetDrawn: [
    'Government draws a line under {resource} use, in ink',
    'A budget for {resource}: so much this decade, less the next',
    'Treasury publishes a {resource} budget; few read the footnotes',
    'Line drawn under {sector}: it is to fall, gently, for ever',
    '{resource} budget set at today’s level, and lower thereafter',
  ],
  decade: [
    'Decade {n} within budget; officials “cautiously pleased”',
    'Ten more years inside the line: {sector}, decade {n}',
    '{resource} budget kept for decade {n}; nobody went without',
    'Another decade, another ledger balanced: {sector} at {n}',
    'Decade {n} of restraint passes without incident, or headlines',
  ],
  budgetBroken: [
    '{sector} breaks its budget; the streak ends',
    'The line is crossed: {resource} use above budget again',
    'Restraint ends in {year}; the ledger is reopened',
    'Budget breached. Ministers blame the weather',
    '“Temporary” overshoot of the {resource} budget, says minister',
  ],
};
