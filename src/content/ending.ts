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
  /*
   * M4 (the text lane): the first ending is now the Act I ending (design/m4-design.md §7.2): the Coal Age's four
   * Industries settled at once and held fifty years. The credits close the Coal Age, not the game; the Previews follow.
   * (M3's credits, "Fifty Years Within the Line", spoke for five Industries and every Age; they are retired with the
   * M3 rule. A later Act's credits need EndingText per act: a contract gap noted for M5.)
   */
  credits: {
    title: 'The Coal Age, settled',
    lines: [
      'Every engine in this ledger was thriftier than the one before it.',
      'Nearly every one of them burned more than the last.',
      'The iron that saved coal at the furnace spent it in every engine its rails made cheaper.',
      'The fleet that found the fish found the last of them, and the catch per trip said nothing.',
      'Mr Jevons said as much of the coal in 1865, and was read, and thanked, and filed.',
      'What held at last was not a better engine.',
      'It was a line drawn on a chart and a survey paid for, and both defended in Parliament.',
      'The pits are worked to the sink line and no further.',
      'The furnaces are banked to the order book.',
      'The banks are fished to what they bear; the Board counts them every spring.',
      'The lamps are lit at dusk and put out at midnight.',
      'For fifty years the Coal Age has burned no more than the sky and the sea could carry.',
      'The Statistics Office notes that this has not happened before, and that the next Age has not been asked.',
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
    /* M3's record (milestone 'won', written by M3's rule or by the v3 → v4 migration): kept, under its own words. */
    { key: 'won', headline: '{year}: everything settled, under the earlier rule' },
    /* --- M4 (the text lane) --- */
    /* The contract's two new milestone keys: an Act's ending ('ending:<act id>') and the first run with a capstone. */
    { key: 'ending:actOne', headline: '{year}: the Coal Age settled and held fifty years, at hour {hours}' },
    { key: 'capstone', headline: '{year}: run {run} opens on a settled Coal Age' },
    /*
     * The Act I firsts the design lists (§7.2), under the milestone keys the contract names (MetaState.milestones, the
     * M4 amendment). 'feed:<source>' is keyed by the SOURCE (Iron), so {sector} is Iron (Act lane's correction).
     */
    { key: 'feed:*', headline: '{year}: {sector} fills its first order for other Industries’ machines' },
    { key: 'crisis:fishing', headline: '{year}: a poor season on the banks; the catch per trip holds' },
    { key: 'threshold:*', headline: '{year}: the banks fail, and {sector} ties up the fleet' },
    { key: 'surveyed:*', headline: '{year}: the Board’s first survey of {sector}; the skippers dispute it' },
    { key: 'scarHealed:*', headline: '{year}: {sector} recovers, after long years; the gulls come back' },
  ],
};
