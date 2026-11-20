/**
 * The Archive (M3): the real history behind the things in the game, one note per thing (or several), in display order.
 * Each module exports one array; a new writer adds a module or appends to one, and adds it here. Order matters only for
 * display (content order): the Industries in sectorOrder, then the Commons, then the general notes. Append, never
 * reorder, inside a module unless a display change is intended.
 *
 * Rules (ArchiveDef in src/types.ts; the lane's own checks are in archive.test.ts):
 *   - `subject` is a content id that exists (upgrade, lever, application, Commons project, Charter, Institution,
 *     Know-how node, seam, dispatch, History, cast member, achievement or Industry). The note unlocks when its subject
 *     is first owned or seen, and is recorded whether or not the Archive viewer is open.
 *   - `text` 60–160 words, the paper's archive voice: who, when, the figure, the turn. It may explain; it never
 *     preaches. Dark history (slavery behind the mills, empire behind the coaling stations, child labour, famine) is
 *     stated plainly where it belongs, never as a joke.
 *   - Every fact is either marked [V] or [S] in design/research/*.md or was verified by the writer; `sources` records
 *     where (grade 'V' a primary or scholarly source, 'S' a reputable secondary). No living person is named in a note's
 *     text (a citation may name its author).
 *   - Ids: 'arc.<module>.<thing>' (unique game-wide: `owns` can name an Archive note).
 */
import type { ArchiveDef } from '../../types';
import { codeArchive } from './code';
import { commonsArchive } from './commons';
import { computeArchive } from './compute';
import { generalArchive, generalArchiveM4 } from './general';
import { fishingArchive } from './fishing';
import { ironArchive } from './iron';
import { lightArchive } from './light';
import { motionArchive } from './motion';
import { steamArchive } from './steam';

export const archive: ArchiveDef[] = [
  ...steamArchive,
  ...lightArchive,
  ...ironArchive,
  ...fishingArchive,
  ...motionArchive,
  ...computeArchive,
  ...codeArchive,
  ...commonsArchive,
  ...generalArchive,
  ...generalArchiveM4,
];
