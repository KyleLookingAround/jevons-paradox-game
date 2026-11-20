/**
 * The Acts (M4; Content.acts): runs of Ages with one ending each, after which the Act's Industries open settled in every
 * later run (the capstone). Design: design/m4-design.md §7; contract: design/m4-contract-notes.md §§1–2.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 *
 * Act I is the Coal Age's four Industries. Acts II and III are Previews in M4: their Industries (Motion, Compute, Code)
 * open after the Act I ending under Act I's rules, labelled "Preview", and have no ending yet (M5 builds Act II's).
 */
import type { ActDef } from '../types';

export const acts: ActDef[] = [
  {
    id: 'actOne',
    name: 'Act I',
    title: 'The Coal Age',
    ages: ['coal'],
    ending: { id: 'actOne', sectors: ['steam', 'light', 'iron', 'fishing'] },
    /* A quarter of the settled income while capstoned (design §7.3): enough that the settled Coal Age is felt in every
     * later run's purse, not so much that it pays for the Previews by itself. No Hindsight for being capstoned (the
     * ending is not replayed for its rewards). */
    capstone: { incomeShare: 0.25 },
  },
  {
    id: 'actTwo',
    name: 'Act II',
    title: 'The Great Acceleration',
    ages: ['acceleration'],
    preview: true,
  },
  {
    id: 'actThree',
    name: 'Act III',
    title: 'The Attention Age',
    ages: ['attention'],
    preview: true,
  },
];
