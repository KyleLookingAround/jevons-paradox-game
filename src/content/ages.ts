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
    sectors: ['steam', 'light'],
  },
  {
    id: 'acceleration',
    name: 'The Great Acceleration',
    tagline: 'Every line on every chart turns upward at once. Nobody planned it.',
    yearSpan: [1909, 2010],
    theme: 'chrome',
    sectors: ['motion'],
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
