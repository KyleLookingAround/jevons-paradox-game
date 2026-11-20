/**
 * The Ages: calendar spans, page themes, and the Industries that belong to each.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { AgeDef } from '../types';

/* ------------------------------------------------------------------ */
/* AGES                                                                */
/* ------------------------------------------------------------------ */

export const ages: AgeDef[] = [
  {
    id: 'coal',
    name: 'The Coal Age',
    tagline: 'Everything runs on coal, including the arguments about coal.',
    yearSpan: [1780, 1914],
    theme: 'ledger',
    /* M4: the Coal Age complete (Act I): Iron & Steel opens in run 4, Fishing in run 6 (design/m4-design.md §3). */
    sectors: ['steam', 'light', 'iron', 'fishing'],
  },
  {
    id: 'acceleration',
    name: 'The Great Acceleration',
    tagline: 'Every line on every chart turns upward at once. Nobody planned it.',
    yearSpan: [1909, 2010],
    theme: 'chrome',
    /* M5: Plenty, under the Chair from Ministry 3 (design/m5-design.md §7.3) */
    sectors: ['motion' /* , 'plenty' (PENDING: with its module) */],
  },
  {
    id: 'attention',
    name: 'The Attention Age',
    tagline: 'The machines are tireless. What runs short is anyone to read what they make.',
    yearSpan: [2000, 2100],
    theme: 'terminal',
    sectors: ['compute', 'code'],
  },
];
