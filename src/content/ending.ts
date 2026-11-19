/**
 * M3: the first ending (Content.ending): the credits card shown when every Industry has been settled at its sink line,
 * all at once, for fifty years (GlobalParams.endingYears; flags.won; meta.endings.steadyAll), and the templates from
 * which the core assembles the retrospective Gazette out of the player's own milestones (ModelApi.retrospective,
 * MetaState.milestones). Owned by the content-archive lane.
 *
 * The credits are the game's argument closing, in the paper's voice; who made the game is not needed. The
 * retrospective reads as a newspaper's supplement: one headline per first time, oldest first, each dated. Templates
 * match a milestone key exactly or by the prefix before ':' ('backfire:*'). Placeholders: {year}, {run}, {hours}
 * (cumulative active hours, one decimal), {sector} (a proper name: "Steam settles", never "the Steam industry").
 * Content is data (see README.md): every word here is read by the core and the UI; no game rules.
 */
import type { EndingText } from '../types';

export const ending: EndingText = {
  credits: {
    title: 'Fifty Years Within the Line',
    lines: [
      'Every engine in this ledger was thriftier than the one before it.',
      'Nearly every one of them burned more than the last: coal, gas, oil, power, attention.',
      'That was not a failure of engineering. It was what cheap power was bought for.',
      'Mr Jevons said as much in 1865, and was read, and thanked, and filed.',
      'What held at last was not a better engine.',
      'It was a line, drawn on a chart and defended in Parliament.',
      'A duty that rose as the engines improved; a cap that fell as the decades passed.',
      'Money from the levies spent on baths, books and parks instead of furnaces.',
      'And a public that decided, now and then, that it had enough.',
      'For fifty years every Industry has been settled at its sink line, burning no more than the sky can carry off;',
      'none of them was settled while anyone went without.',
      'The efficiency gauge is still rising. This time the consumption gauge is not.',
      'The Statistics Office notes that this has not happened before, and may not last.',
    ],
    continueLabel: 'The ledger continues',
  },
  retrospective: [
    { key: 'reveal', headline: '{year}: Mr Jevons’s question is asked, and the meters wake' },
    { key: 'sectorOpened:*', headline: '{year}: {sector} opens for business, in run {run}' },
    { key: 'backfire:*', headline: '{year}: {sector} saves on every unit and burns more in all' },
    { key: 'seam:*', headline: '{year}: {sector} sinks a deeper seam; more coal, and more burned' },
    { key: 'dispatch', headline: '{year}: the proprietor answers a letter, the first of many' },
    { key: 'decade', headline: '{year}: a decade inside the line, the first, at hour {hours}' },
    { key: 'clearSkies:*', headline: '{year}: clear skies over {sector}, for the first time in memory' },
    { key: 'steady:*', headline: '{year}: {sector} holds Steady State for fifty years' },
    { key: 'settled:*', headline: '{year}: {sector} settles at its sink line, and stays there' },
    { key: 'history', headline: '{year}: a History cleared, in run {run}' },
    { key: 'proprietor', headline: '{year}: the Statistics Office publishes the proprietor’s day' },
    { key: 'won', headline: '{year}: every Industry settled at its sink line; the ledger balances, for now' },
  ],
};
