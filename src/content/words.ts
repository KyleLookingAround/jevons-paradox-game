/**
 * Words the UI needs that belong to no other module (M2): the recycle options' names and one-line explanations
 * (Content.recycleText). A lever may override an option's blurb (LeverDef.recycleBlurb, in its Industry's file).
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 *
 * M5 (the text lane): the formatter for Take office's texts (OfficeText). The core stores figures (ProspectusView,
 * FileView); the PAGE turns them into words here, so that a time reads "the eighteenth second" or "a minute and
 * twenty-six seconds", a folded repeat reads ", and another every thirty-odd seconds after", and a share of none reads
 * "none". Pure functions: no DOM, no clock. The page calls formatProspectus and formatFile and prints what they return.
 */
import type { Content, FileView, OfficeText, ProspectusView } from '../types';
import { FILE_SUBJECTS, OFFICE_WORDS, PROSE_NAMES } from './officeText';

export const recycleText: NonNullable<Content['recycleText']> = {
  treasury: {
    name: 'Into the Treasury',
    blurb: 'A small share comes back as Mandate. The rest is general taxation and is not seen again.',
  },
  dividend: {
    name: 'Back to households',
    blurb: 'Paid out per head and spent at once: wellbeing up, and the population grows on it.',
  },
  commons: {
    name: 'To the Commons',
    blurb: 'Banked for Commons projects only. They are heated, lit and enjoyed in their turn.',
  },
};

/* ------------------------------------------------------------------ */
/* M5: numbers and times in words                                       */
/* ------------------------------------------------------------------ */

const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const UNIT_ORD = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const TENS_ORD = ['', '', 'twentieth', 'thirtieth', 'fortieth', 'fiftieth', 'sixtieth', 'seventieth', 'eightieth', 'ninetieth'];

/** 0–99 in words ("twenty-six"); 100 and over as figures (house style: figures from 10 in prose, but times read aloud). */
export function numberWords(n: number): string {
  const k = Math.max(0, Math.round(n));
  if (k < 20) return UNITS[k];
  if (k < 100) return k % 10 ? `${TENS[Math.floor(k / 10)]}-${UNITS[k % 10]}` : TENS[k / 10];
  return k.toLocaleString('en-GB');
}

/** 1–99 as an ordinal in words ("thirty-seventh"); 100 and over as "100th". */
export function ordinalWords(n: number): string {
  const k = Math.max(1, Math.round(n));
  if (k < 20) return UNIT_ORD[k];
  if (k < 100) return k % 10 ? `${TENS[Math.floor(k / 10)]}-${UNIT_ORD[k % 10]}` : TENS_ORD[k / 10];
  return `${k}th`;
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/**
 * A run time read to the second, without its preposition: "the eighteenth second" (under a minute), "a minute and
 * twenty-six seconds", "two minutes", "ten minutes and forty seconds", "an hour and four minutes" (an hour or more:
 * seconds dropped). The template supplies "at".
 */
export function timeWords(t: number): string {
  const s = Math.max(1, Math.round(t));
  if (s < 60) return `the ${ordinalWords(s)} second`;
  if (s >= 3600) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    const hs = h === 1 ? 'an hour' : `${numberWords(h)} hours`;
    return m ? `${hs} and ${m === 1 ? 'a minute' : `${numberWords(m)} minutes`}` : hs;
  }
  const m = Math.floor(s / 60), r = s % 60;
  const ms = m === 1 ? 'a minute' : `${numberWords(m)} minutes`;
  return r ? `${ms} and ${r === 1 ? 'a second' : `${numberWords(r)} seconds`}` : ms;
}

/** The minute a run time falls in, as an ordinal: 6 min 12 s → "seventh" ("at the seventh minute"). */
export function minuteOrdinal(t: number): string {
  return ordinalWords(Math.floor(Math.max(0, t) / 60) + 1);
}

/** "inside five minutes": the whole minutes a time falls inside (for lines that round, not quote). */
export function insideWords(t: number): string {
  const m = Math.floor(Math.max(0, t) / 60) + 1;
  return m === 1 ? 'inside the minute' : `inside ${numberWords(m)} minutes`;
}

/**
 * A folded repeat's cadence, as a clause to follow its first time: ", and another every thirty-odd seconds after".
 * Mean interval in seconds; null (one purchase) gives ''. Bands: under 10 s "every few seconds"; 10–19 "every dozen
 * seconds or so"; 20–59 "every twenty-odd seconds" (tens, rounded down); 60–89 "every minute or so"; then "every two
 * minutes or so" (whole minutes, rounded).
 */
export function everyWords(every: number | null | undefined): string {
  if (every === null || every === undefined || !Number.isFinite(every) || every <= 0) return '';
  const e = every;
  const cadence =
    e < 10 ? 'every few seconds'
      : e < 20 ? 'every dozen seconds or so'
        : e < 60 ? `every ${TENS[Math.floor(e / 10)]}-odd seconds`
          : e < 90 ? 'every minute or so'
            : `every ${numberWords(Math.round(e / 60))} minutes or so`;
  return `, and another ${cadence} after`;
}

/** A share as words for a running sentence: 0 → "none", 100 → "all", else "7 per cent". */
export function shareWords(share: number): string {
  const p = Math.max(0, Math.min(100, Math.round(share)));
  return p === 0 ? 'none' : p === 100 ? 'all' : `${p} per cent`;
}

/** A card or use name as it reads mid-sentence: the house's prose name if there is one, else the name with its first
 *  letter lowered (unless it opens with an acronym or a proper noun listed in PROSE_NAMES). */
export function proseName(id: string, name: string, names: Record<string, string> = PROSE_NAMES): string {
  if (names[id]) return names[id];
  if (/^[A-Z]{2}/.test(name)) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/* ------------------------------------------------------------------ */
/* M5: Take office                                                      */
/* ------------------------------------------------------------------ */

/**
 * Fill {key} and {key:n} placeholders from `vars`. A clause (the text between "; " separators, or the text before the
 * first and after the last) that holds a placeholder with no value is dropped whole, so a template written for five
 * items reads correctly for three. Placeholders whose value is '' print nothing and keep their clause.
 */
export function fillClauses(template: string, vars: Record<string, string | undefined>): string {
  const missing = (clause: string) => [...clause.matchAll(/\{([a-z]+(?::\d+)?)\}/gi)].some((m) => vars[m[1]] === undefined);
  const fill = (clause: string) => clause.replace(/\{([a-z]+(?::\d+)?)\}/gi, (_, k: string) => vars[k] ?? '');
  // Split on "; " but keep the sentence that leads into a list (before its colon) and the one after it intact: the
  // first clause's text up to its colon, and the last clause's text after its full stop, are never dropped.
  const parts = template.split('; ');
  if (parts.length === 1) return missing(template) ? '' : fill(template);
  const first = parts[0], last = parts[parts.length - 1];
  const colon = first.lastIndexOf(': ');
  const lead = colon >= 0 ? first.slice(0, colon + 2) : '';
  const firstItem = colon >= 0 ? first.slice(colon + 2) : first;
  const stop = last.indexOf('. ');
  const lastItem = stop >= 0 ? last.slice(0, stop) : last.replace(/\.$/, '');
  const tail = stop >= 0 ? last.slice(stop) : (last.endsWith('.') ? '.' : '');
  const items = [firstItem, ...parts.slice(1, -1), lastItem].filter((c) => !missing(c)).map(fill);
  return `${fill(lead)}${items.join('; ')}${fill(tail)}`;
}

/** The prospectus card in words: its title, its paragraphs in order (the first opening or the default, the chair
 *  paragraph when there is one, the close) and its button. */
export function formatProspectus(text: OfficeText['prospectus'], view: ProspectusView): { title: string; paragraphs: string[]; button: string } {
  const paragraphs: string[] = [];
  if (view.defaulted || view.first.length === 0) paragraphs.push(text.firstDefault);
  else {
    const vars: Record<string, string> = {};
    view.first.forEach((it, i) => {
      const n = i + 1;
      vars[`item:${n}`] = proseName(it.id, it.name);
      vars[`t:${n}`] = timeWords(it.t);
      vars[`count:${n}`] = numberWords(it.count);
      vars[`every:${n}`] = it.kind === 'upgrade' && it.count > 1 ? everyWords(it.every) : '';
    });
    paragraphs.push(fillClauses(text.first, vars));
  }
  const m = view.motion?.[0];
  if (m && text.chair) {
    const minute = Math.floor(Math.max(0, m.t) / 60) + 1;
    paragraphs.push(fillClauses(text.chair, {
      'found:1': proseName(m.id, m.name), 'item:1': proseName(m.id, m.name), 't:1': timeWords(m.t),
      'minute:1': minuteOrdinal(m.t),
      'sooner:1': minute > 1 ? ordinalWords(minute - 1) : OFFICE_WORDS.prospectusSoonerFirst,
    }));
  }
  paragraphs.push(text.close);
  return { title: text.title, paragraphs, button: text.button };
}

/** One line of the file ({label}, {dispatch} as the offer's subject, {year}); a null year drops ", {year}" or " ({year})". */
export function fileLine(template: string, e: FileView['accepted'][number], subjects: Record<string, string> = FILE_SUBJECTS): string {
  const subject = subjects[e.dispatch] ?? `‘${e.label}’`;
  let t = template;
  if (e.year === null) t = t.replace(/,? ?\(?\{year\}\)?/g, '');
  return t.replace(/\{dispatch\}/g, subject).replace(/\{label\}/g, e.label).replace(/\{year\}/g, String(e.year ?? ''));
}

/** The file card in words: title, the accepted and declined lines (most recent first), `both` (offers answered each
 *  way in different seasons, printed after them), the standing-order line (null
 *  when there are no seasons to count), the conclusion for the pliant reading, the empty-file line when nothing was
 *  answered, and the button. */
export function formatFile(text: OfficeText['file'], view: FileView): {
  title: string; accepted: string[]; declined: string[]; both: string[]; automated: string | null; conclusion: string; empty: string | null; button: string;
} {
  const seasons = Math.max(0, Math.round(view.seasons));
  const automated = seasons === 0 ? null : text.automated
    .replace(/\{seasons\}/g, seasons === 1 ? OFFICE_WORDS.fileOneSeason : `last ${numberWords(seasons)} seasons`)
    .replace(/\{share\}%?/g, shareWords(view.automatedShare));
  const band = text.conclusion.find((c) => c.pliantBelow > view.pliant) ?? text.conclusion[text.conclusion.length - 1];
  // An offer answered both ways in different seasons (undated answers, before the year was kept) is one line, not two.
  const twice = new Set(view.accepted.filter((a) => a.year === null && view.declined.some((d) => d.dispatch === a.dispatch && d.year === null)).map((a) => a.dispatch));
  const both = [...twice].map((id) => fileLine(OFFICE_WORDS.fileBoth, { dispatch: id, label: '', year: null }));
  const accepted = view.accepted.filter((e) => !twice.has(e.dispatch)).map((e) => fileLine(text.accepted, e));
  const declined = view.declined.filter((e) => !twice.has(e.dispatch)).map((e) => fileLine(text.declined, e));
  return {
    title: text.title, accepted, declined, both, automated, conclusion: band?.text ?? '',
    empty: accepted.length + declined.length + both.length === 0 ? OFFICE_WORDS.fileEmpty : null, button: text.button,
  };
}
