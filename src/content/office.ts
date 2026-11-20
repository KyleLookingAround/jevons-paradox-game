/**
 * M5 (the text lane): Take office (Content.office): the invitation's condition and the texts of the sequence
 * (design/m5-design.md §3.1): the Gazette's headline, the outgoing Minister's last letter, the prospectus and the file
 * on the late proprietor. Content is data (see README.md): no game rules here.
 *
 * The page formats the prospectus and the file with words.ts (formatProspectus, formatFile), from the figures the core
 * stores (ProspectusView, FileView). Placeholders:
 *   prospectus.first  {item:n} the n-th item's name as it reads mid-sentence (PROSE_NAMES), {t:n} its time ("the
 *                     eighteenth second", "a minute and twenty-six seconds"), {every:n} a folded repeat's cadence as a
 *                     clause (", and another every thirty-odd seconds after"; '' for a single purchase). A clause (between
 *                     "; ") whose item does not exist is dropped, so five slots read correctly for three items.
 *   prospectus.chair  {found:1} the first use founded in a chair Industry in the run just ended, {minute:1} the minute it
 *                     fell in ("seventh"), {sooner:1} the minute before ("sixth"). Omitted when there was none.
 *   file.accepted / declined  {dispatch} the offer as the file names it (FILE_SUBJECTS), {year} (", {year}" is dropped
 *                     when the answer has no year), {label} the button that was pressed.
 *   file.automated    {seasons} "last eight seasons" (or "last season"), {share} "none", "7 per cent" or "all".
 *
 * The voice. The acquisition is the broadsheet's. The Minister's letter is the Minister's (passive, courteous, the
 * inquiry "in due course"; never named). The prospectus is a company prospectus: Pryce Consolidated in the third person,
 * every time and name the late proprietor's own, the joke left to the figures. The file is a file: telegraphic, no
 * subject, the company's clerk writing for the chairman. "The late proprietor" is the player, retired to public life.
 */
import type { OfficeDef, OfficeText } from '../types';

export const officeText: OfficeText = {
  acquisition: {
    headline: 'Pryce Consolidated acquires the Works',
    sub: 'Proprietor ‘retires to public life’',
  },
  letter: {
    cast: 'minister',
    body:
      'Sir, the Prime Minister asks whether you will form a government. I am instructed to say that the Ministry’s ' +
      'window has the better view of the valley. The inquiry into the sale of the Works will report in due course; I ' +
      'should not wait for it. The key to the drinks cabinet is in the top drawer. I have taken the good pen. Yours, for ' +
      'the last time in this capacity,',
    button: 'Take office',
  },
  offer: { take: 'Take office', notYet: 'Not yet' },
  prospectus: {
    title: 'Pryce Consolidated: prospectus for the motor trade',
    first:
      'The method is not new. It was the late proprietor’s, and is set out here as it was practised on the first ' +
      'morning in the trade: {item:1} at {t:1}{every:1}; {item:2} at {t:2}{every:2}; {item:3} at {t:3}{every:3}; ' +
      '{item:4} at {t:4}{every:4}; {item:5} at {t:5}{every:5}. Pryce Consolidated will do the same with motor cars, ' +
      'only sooner.',
    firstDefault:
      'The method is not new. It is the trade’s usual method, as any sound house practises it: better boilers within ' +
      'the minute; a second engine house soon after, and another whenever one pays; mills when the engines are paid ' +
      'for; the separate condenser before the morning is out. Pryce Consolidated will do the same with motor cars, ' +
      'only sooner.',
    chair:
      'In the motor trade itself the late proprietor founded {found:1} at the {minute:1} minute. The company proposes ' +
      'the {sooner:1}.',
    close: 'The directors are confident of the Ministry’s goodwill. They have read its notebooks.',
    button: 'File it',
  },
  file: {
    title: 'The file on the late proprietor',
    accepted: 'Accepted, {year}: {dispatch}.',
    declined: 'Declined, {year}: {dispatch}.',
    automated:
      'Of the decisions taken in the Works’ name in its {seasons}, {share} were left to standing order. Pryce ' +
      'Consolidated has one standing order, and leaves everything to it.',
    conclusion: [
      { pliantBelow: 0.34, text: 'Reads the terms, and declines them. Offers to be made in writing, sparingly, and with the costs shown.' },
      { pliantBelow: 0.67, text: 'Has given no firm answer either way. Offers to be made with something for the town attached.' },
      { pliantBelow: 2, text: 'Takes an agreement if a mechanics’ institute comes with it. More agreements to be offered.' },
    ],
    button: 'Close the file',
  },
  sealed: 'The machines are to be the next Age’s business; the Ministry has the motor trade to see to.',
};

/**
 * The OfficeDef (the registry may take it whole or only `officeText`): offered at the first Reckoning after the Act I
 * ending with Motion open five minutes in the run just ended (design §3.1; contract OfficeDef).
 */
export const office: OfficeDef = {
  when: { all: [{ ending: 'actOne' }, { stat: 'openFor', sector: 'motion', op: '>=', value: 300 }] },
  text: officeText,
};
