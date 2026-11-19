/**
 * REBOUND — content: every number and every word the simulation and UI read (M1 contract).
 * Owned by the content workstream. See src/types.ts for what each field does, design/m1-contract-notes.md for the
 * Sector/Age words. In code the unit is a `sector`; on screen it is an "Industry", and the period is an "Age".
 *
 * Numbers are generated where they form a series (cost ladders, lever level tables, know-how costs) by the helpers in
 * helpers.ts, so balance can retune a sector with a handful of knobs.
 *
 * The registry: assembles `content` from the modules in this folder, deterministically and in order. Module map:
 * README.md.
 */
import type { Content } from '../types';
import { achievements } from './achievements';
import { ages } from './ages';
import { charters } from './charters';
import { commons } from './commons';
import { global } from './global';
import type { SectorContent } from './helpers';
import { dividends } from './dividends';
import { headlines } from './news/fallback';
import { institutions, knowhow, knowhowTrees } from './prestige';
import { code } from './sectors/code';
import { compute } from './sectors/compute';
import { light } from './sectors/light';
import { motion } from './sectors/motion';
import { steam } from './sectors/steam';
import { recycleText } from './words';

export { sig2, ladder } from './helpers';

/**
 * The Industries in sectorOrder: the order they are listed, iterated and (by default) unlocked in. Their upgrades,
 * levers and headlines are concatenated in this order too, which fixes the order of cards and levers on screen.
 */
const SECTORS: SectorContent[] = [steam, light, motion, compute, code];

export const content: Content = {
  sectors: Object.fromEntries(SECTORS.map((s) => [s.def.id, s.def])),
  sectorOrder: SECTORS.map((s) => s.def.id),
  ages,
  upgrades: SECTORS.flatMap((s) => s.upgrades),
  levers: SECTORS.flatMap((s) => s.levers),
  knowhow,
  institutions,
  achievements,
  headlines,
  sectorHeadlines: Object.fromEntries(SECTORS.filter((s) => s.headlines).map((s) => [s.def.id, s.headlines!])),
  global,
  /* M2 */
  dividends,
  commons,
  charters,
  knowhowTrees,
  recycleText,
};
