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
import { ageDispatches, ageDispatchesM4 } from './ages';
/* M4 (the text lane): appended at the end, never inserted (the draw's tie-break is content order). */
import { ironDispatches } from './iron';
import { fishingDispatches } from './fishing';
/* M5 (the text lane's letters from the Chair; wired by the registry lane, design/scratch/m5-registry-text.md): appended. */
import { chairDispatches } from './chair';
import { plentyDispatches } from './plenty';

/** M5 (DispatchDef.recur): the Ministry's wager letters may come again once a Parliament (design §9.3: at least one
 *  wager a Parliament for every style of play; the text lane's PARLIAMENT_WAGERED holds the ordinary letters back until
 *  one is answered, so without recurrence the guarantee ran out with the pool). A letter marked `once` keeps it. */
const recurEachParliament = (ds: DispatchDef[]): DispatchDef[] =>
  ds.map((d) => (d.arms.some((a) => a.wager) && !d.once ? { ...d, recur: 'parliament' as const } : d));

export const dispatches: DispatchDef[] = [
  ...generalDispatches,
  ...steamDispatches,
  ...lightDispatches,
  ...motionDispatches,
  ...computeDispatches,
  ...codeDispatches,
  ...ageDispatches,
  ...ironDispatches,
  ...fishingDispatches,
  ...ageDispatchesM4,
  ...recurEachParliament(chairDispatches),
  ...recurEachParliament(plentyDispatches),
];
