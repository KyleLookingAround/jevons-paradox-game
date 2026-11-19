/**
 * M3: the Proprietor's Day (Content.proprietor): the second reveal (design/paradigm-shifts.md, shift 3). Built like The
 * Coal Question: a pamphlet asks, a research card asks again, and on purchase the Statistics Office prints the
 * proprietor's own figures, split before and after the Market. If the working day went down, the paper says so in the
 * same tone. Owned by the content-archive lane.
 *
 * Rules the texts keep (and archive/archive.test.ts checks): the paper says "the proprietor", never "you"; it never
 * scolds, nudges, praises or counts streaks; it reports. A template asserts only what its direction guarantees
 * (direction is set by the working day alone, SurveyView), so decisions and sessions are printed as "before, since",
 * never as "up" or "down". No template uses {decisionsChange}: it is null when there were no decisions before.
 * Placeholders, formatted by the core: {workdayBefore} {workdayAfter} (minutes a day), {workdayChange} (per cent, no
 * sign), {decisionsBefore} {decisionsAfter} (an hour), {sessionsBefore} {sessionsAfter} (a day), {automatedPerHour}.
 * Content is data (see README.md): every word here is read by the core and the UI; no game rules.
 */
import type { ProprietorText } from '../types';

export const proprietor: ProprietorText = {
  pamphlet: {
    cast: 'missWhitlow',
    headline: 'Miss Whitlow asks why the labour-saving machine saves no labour',
    body:
      'Sir, my father spent his life counting the coal that thrift was meant to save. I have begun counting something ' +
      'nearer home. The proprietor now keeps a Market that places routine orders unasked, so that the proprietor need ' +
      'not. It was sold as saving labour. I should like to know where the labour went. I do not know the answer, and ' +
      'have asked the Statistics Office to find out. E. Whitlow',
  },
  returns: [
    /* ---- up: the working day lengthened (more than 5 per cent) ---- */
    {
      direction: 'up',
      headline: 'Household survey: the proprietor’s day lengthens by {workdayChange}%',
      body:
        'HOUSEHOLD SURVEY. Since the Market was automated the proprietor has taken {decisionsAfter} decisions an hour, ' +
        'against {decisionsBefore} before, over a working day lengthened by {workdayChange} per cent, from ' +
        '{workdayBefore} minutes to {workdayAfter}. The Market took {automatedPerHour} decisions an hour on the ' +
        'proprietor’s behalf. The Office has not asked what the extra minutes were for.',
    },
    {
      direction: 'up',
      headline: 'Proprietor works {workdayChange}% longer since the work was automated',
      body:
        'HOUSEHOLD SURVEY. Routine orders have been placed automatically since the Market arrived, at ' +
        '{automatedPerHour} an hour. The proprietor’s working day has lengthened from {workdayBefore} minutes to ' +
        '{workdayAfter}. The Office makes no recommendation. It was not asked for one, and in its experience ' +
        'recommendations are read, considered and filed.',
    },
    {
      direction: 'up',
      headline: 'Labour-saving machine installed; labour up {workdayChange}%, says Office',
      body:
        'HOUSEHOLD SURVEY. The proprietor’s working day stood at {workdayBefore} minutes before the Market and stands ' +
        'at {workdayAfter} since, an increase of {workdayChange} per cent. Decisions taken by hand: {decisionsBefore} ' +
        'an hour before, {decisionsAfter} since. The Office notes that the Market itself works no hours at all, and ' +
        'has filed no return.',
    },
    {
      direction: 'up',
      headline: 'Market takes {automatedPerHour} decisions an hour; the proprietor’s day grows',
      body:
        'HOUSEHOLD SURVEY. The Market now takes {automatedPerHour} decisions an hour that were once taken by hand. ' +
        'Over the same period the proprietor’s working day has grown by {workdayChange} per cent, to {workdayAfter} ' +
        'minutes, spread over {sessionsAfter} visits a day against {sessionsBefore}. The Office records the figures ' +
        'without comment, which it understands to be its function.',
    },
    /* ---- down: the working day shortened (more than 5 per cent) ---- */
    {
      direction: 'down',
      headline: 'Household survey: the proprietor’s day shortens by {workdayChange}%',
      body:
        'HOUSEHOLD SURVEY. Since the Market was automated the proprietor’s working day has shortened by ' +
        '{workdayChange} per cent, from {workdayBefore} minutes to {workdayAfter}. The proprietor takes ' +
        '{decisionsAfter} decisions an hour, against {decisionsBefore} before. The Office is as surprised as anyone, ' +
        'and has checked the figures twice.',
    },
    {
      direction: 'down',
      headline: 'Machine saves the proprietor time; Office checks its arithmetic',
      body:
        'HOUSEHOLD SURVEY. The Market takes {automatedPerHour} decisions an hour, and the proprietor’s working day has ' +
        'fallen by {workdayChange} per cent, to {workdayAfter} minutes. This is what labour-saving machinery is ' +
        'advertised to do. The Office has recounted, found the same answer, and reports it.',
    },
    {
      direction: 'down',
      headline: 'Proprietor’s day {workdayChange}% shorter; Statistics Office unsettled',
      body:
        'HOUSEHOLD SURVEY. Working day before the Market: {workdayBefore} minutes. Since: {workdayAfter}. Visits a ' +
        'day: {sessionsBefore} before, {sessionsAfter} since. The return runs against every other series the Office ' +
        'keeps, which it cannot explain and does not propose to. A copy has gone to Miss Whitlow.',
    },
    {
      direction: 'down',
      headline: 'A shorter day for the proprietor, by {workdayChange}%, the Office finds',
      body:
        'HOUSEHOLD SURVEY. The automation sold as saving the proprietor labour appears, unusually, to have done so: ' +
        'the working day is {workdayChange} per cent shorter, at {workdayAfter} minutes. Decisions by hand stand at ' +
        '{decisionsAfter} an hour, against {decisionsBefore}. The Office prints the figures as it found them, which ' +
        'is the only way it knows.',
    },
    /* ---- flat: within 5 per cent either way ---- */
    {
      direction: 'flat',
      headline: 'Household survey: the proprietor’s day is unchanged by the Market',
      body:
        'HOUSEHOLD SURVEY. The proprietor’s working day stood at {workdayBefore} minutes before the Market and ' +
        '{workdayAfter} since: within the Office’s margin of error. The Market takes {automatedPerHour} decisions an ' +
        'hour; the proprietor takes {decisionsAfter}, against {decisionsBefore}. Whatever the Market saved, the day ' +
        'absorbed. The Office cannot say how.',
    },
    {
      direction: 'flat',
      headline: 'No change in the proprietor’s day, the Statistics Office reports',
      body:
        'HOUSEHOLD SURVEY. The proprietor worked {workdayBefore} minutes a day before routine orders were automated ' +
        'and works {workdayAfter} now. Decisions by hand: {decisionsBefore} an hour, then {decisionsAfter}. The ' +
        'Office has seldom printed a return in which nothing happened, and found it restful.',
    },
    {
      direction: 'flat',
      headline: 'Market takes {automatedPerHour} decisions an hour; proprietor’s day holds',
      body:
        'HOUSEHOLD SURVEY. Visits a day: {sessionsBefore} before the Market, {sessionsAfter} since. Working day: ' +
        '{workdayBefore} minutes, then {workdayAfter}. The Market took {automatedPerHour} decisions an hour, and ' +
        'the proprietor’s day is the length it was. The Office finds this tidy, and has no further comment.',
    },
    {
      direction: 'flat',
      headline: 'The proprietor’s day, before and after the Market: much the same',
      body:
        'HOUSEHOLD SURVEY. Before the Market, {workdayBefore} minutes a day over {sessionsBefore} visits; since, ' +
        '{workdayAfter} minutes over {sessionsAfter}. The machine sold as saving labour has neither saved nor added ' +
        'any that the Office can measure. The Office would not presume to say whether that is the best outcome or ' +
        'the worst.',
    },
  ],
  withdrawn: 'The Household Survey is discontinued for want of funding',
};

/**
 * The research card's words, for the content-mechanics lane to place in a card list (the contract has no field for a
 * card's text outside an UpgradeDef). Suggested definition (design/scratch/m3-register-archive.md):
 *   id 'steam.proprietorsDay', kind 'research', requires feature 'survey',
 *   when: { all: [{ returned: 'household', figure: 'sessionsBefore', op: '>=', value: 3 },
 *                 { returned: 'household', figure: 'sessionsAfter', op: '>=', value: 3 },
 *                 { not: { flag: 'proprietor' } }] },
 *   effects: [{ type: 'metaFlag', flag: 'proprietor' }]. It asks; it does not answer.
 */
export const proprietorCard = {
  name: 'The Proprietor’s Day',
  blurb: 'Miss Whitlow’s question, put to the Statistics Office: what has become of the proprietor’s working day since the Market?',
};

/**
 * The settings wording for the survey (owner decision D6: disclosed from first launch; the reveal is the first time
 * the figures are published, not the first time the survey is mentioned). For the UI lane. The settings page may say
 * "you": it is the game speaking, not the paper.
 */
export const surveyDisclosure = {
  title: 'The Household Survey',
  body:
    'While the game is open, this browser keeps a small private ledger of your own play: active minutes, visits, ' +
    'decisions, and what the Market did for you, split at the moment the Market first arrived. Counts only. It is ' +
    'kept on this device, never in the save and never sent anywhere. Now and then the Statistics Office prints a ' +
    'summary in the paper. Closing the survey deletes the ledger at once.',
  closeLabel: 'Close the Household Survey',
  openLabel: 'Reopen the Household Survey',
};
