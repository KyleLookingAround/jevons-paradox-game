/**
 * M4 (the text lane): the words of The Survey, M4's shift (design/m4-design.md §2A), and the few one-line notices M4
 * adds to the page. Content is data (see README.md): no game rules here.
 *
 *   surveyReveal   Content.surveyReveal (the contract's slot): the Board's Survey card, three variants, the two column
 *                  heads, the footer (the reach backwards: the Statistics Office's two notes), the button and the
 *                  follow-up headline. The Act lane registers it in index.ts (`surveyReveal`).
 *   The rest       strings the UI reads by importing this module (as it imports proprietor.ts's surveyDisclosure):
 *                  the contract has no slot for them. Agreed place: here, until a later contract gives them one.
 *
 * Placeholders in the reveal (formatted by the core): {reported} (catch per trip, integer per cent), {true} (the stock,
 * integer per cent), {sector}, {year}. The variant: 'failed' when the banks crossed their threshold this run, else
 * 'small' when reported − true < 0.15 (a careful fleet), else 'large'.
 */
import type { Content } from '../types';

export const surveyReveal: NonNullable<Content['surveyReveal']> = {
  variants: [
    {
      when: 'large',
      headline: 'Board’s survey finds the banks at {true}% of their natural stock',
      body:
        'The Board’s vessel has trawled the banks on a grid, as the skippers do not. Where the fleet finds fish it ' +
        'finds them as easily as ever: the shoals that are left are where the fleet goes. Between them the sea is empty.',
    },
    {
      when: 'small',
      headline: 'Board’s survey finds the banks somewhat below the skippers’ figure',
      body:
        'The Board’s vessel has trawled the banks on a grid, as the skippers do not. Where the fleet finds fish it ' +
        'finds them as easily as ever: the shoals that are left are where the fleet goes. The difference is not large. ' +
        'The Board notes that it will grow.',
    },
    {
      when: 'failed',
      headline: 'Board’s survey confirms what the fleet will not: the banks are empty',
      body:
        'The Board’s vessel has trawled the banks on a grid, as the skippers do not. Where the fleet finds fish it ' +
        'finds them as easily as ever: the shoals that are left are where the fleet goes. Between them the sea is ' +
        'empty. The Board does not expect a season soon.',
    },
  ],
  columns: { reported: 'The skippers’ report', surveyed: 'The Board’s survey' },
  footer:
    'The Statistics Office, asked how its own figures were made, publishes two notes. Coal will in future be counted ' +
    'where it is used as well as where it is burnt: the coke in a mile of rails is the railway’s. And “years of coal ' +
    'left” has always meant years at this year’s rate.',
  button: 'File the survey',
  followUp: 'Skippers dispute the survey; catch per trip, they say, is excellent',
};

/**
 * The card's rows under the two column heads (design §2A.1): the figures and one line each. No contract slot; the UI
 * substitutes {reported} and {true} from Derived.surveyReveal (integer per cent).
 */
export const surveyRevealRows = {
  reported: 'Catch per trip: {reported}% of the old figure',
  reportedLine: '“The shoals have never been thicker”',
  surveyed: 'The stock: {true}% of its natural size',
  surveyedLine: 'Young fish: few in the samples',
};

/**
 * Feature 'estimates' (design §2A.2–2A.3): the two readings on every Industry's gauges and their formula-sheet lines,
 * and the budget line's account label. "growing" is null while 'estimates' is off; then only `flat` shows, unlabelled
 * as before.
 */
export const estimatesText = {
  yearsLeft: {
    flat: 'At this year’s rate',
    growing: 'At the rate it is growing',
    /* Formula sheet, under the two figures. */
    flatNote: 'At this year’s rate assumes nobody burns more next year.',
    growingNote: 'At the rate it is growing assumes it goes on growing as it has. Neither counts a seam not yet sunk.',
  },
  fullAccount: {
    /* The fainter needle on the consumption gauge. */
    label: 'Counting the coal in its machines',
    /* Formula sheet. */
    note: 'Counting the coal in its machines: the coke Iron burnt for what it was fed, and the power it draws.',
  },
  /* The label on each budget line (BudgetState.account). */
  account: { full: 'on the full account', own: 'chimney only' },
};

/**
 * Fishing's panel, after a Reckoning while scarred: the one foreshadowing line for The Inheritance (design §18.6).
 * Printed under the scar line; nothing more is said about it.
 */
export const scarForeshadow = 'The Reckoning closes the books; it does not restock the sea.';

/**
 * The capstone's words (design §7.3): the folded group's heading ({name} = the Act's title, {year} = the year its
 * ending was reached), the cartouche on each capstoned postcard, and the one-line arrears notice in its panel.
 */
export const capstoneText = {
  group: '{name} (settled {year})',
  cartouche: 'Settled {year}',
  arrears: 'In arrears: the settlement is not being kept. Smoke returns over the valley.',
  arrearsCleared: 'The settlement is kept again.',
};

/**
 * Saves that meet M4 (design §3.2): printed once, in the broadsheet, the first time a save made before M4 loads.
 * `headline` is the paper's line (≤ 70 characters); `notice` the design's full sentence, for a toast or a card.
 */
export const m4SaveNotice = {
  headline: 'Iron and fish join the Coal Age; Motion and machines shown in preview',
  notice: 'Iron and fish join the Coal Age; Motion and the machines are shown in preview.',
};

/**
 * The Previews (design §7.4): the corner mark on a Preview Industry's postcard, and the Age title card for an Age in a
 * Preview Act ({age} = the Age's name). The only fourth-wall line in the game; it is honest and it is one line.
 */
export const previewText = {
  mark: 'Preview',
  card: { title: '{age}, in preview', body: 'The Industries as an industrialist would run them. The Age’s own rules are in preparation.' },
};

/**
 * Fishing's chart card (design §5.3, §5.8, §10): offered here so the UI has one content home for the gauge strings the
 * contract has no slot for (the Fishing lane reported the same gap). "{year}" = the year of the last survey.
 */
export const fishingGaugeText = {
  reported: 'Catch per trip',
  reportedNote: 'Catch per trip, as the skippers report it. It is not a survey.',
  surveyed: 'The stock, surveyed',
  unsurveyed: 'No survey',
  lapsed: 'No survey since {year}',
  scarLine: 'The banks have not recovered. Surveys find a few young fish; the Board does not expect a season soon.',
};
