/**
 * Words the UI needs that belong to no other module (M2): the recycle options' names and one-line explanations
 * (Content.recycleText). A lever may override an option's blurb (LeverDef.recycleBlurb, in its Industry's file).
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { Content } from '../types';

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
