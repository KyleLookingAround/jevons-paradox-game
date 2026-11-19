/**
 * M3: every dispatch, flat (Content.dispatches). Fixed order: general, then the Industries in sectorOrder, then the
 * Ages. APPEND, NEVER REORDER: content order is the tie-break order of the draw (see GameState.dispatch), so moving a
 * module changes which letter a given save receives next. New writers add letters at the end of their own module.
 */
import type { DispatchDef } from '../../types';
import { generalDispatches } from './general';
import { steamDispatches } from './steam';
import { lightDispatches } from './light';
import { motionDispatches } from './motion';
import { computeDispatches } from './compute';
import { codeDispatches } from './code';
import { ageDispatches } from './ages';

export const dispatches: DispatchDef[] = [
  ...generalDispatches,
  ...steamDispatches,
  ...lightDispatches,
  ...motionDispatches,
  ...computeDispatches,
  ...codeDispatches,
  ...ageDispatches,
];
