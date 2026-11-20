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
import { features } from './features';
import { headlines } from './news/fallback';
import { institutions, knowhow, knowhowTrees } from './prestige';
import { code } from './sectors/code';
import { compute } from './sectors/compute';
import { light } from './sectors/light';
import { motion, motionLoopholes, motionPledges } from './sectors/motion';
/* M5: Plenty (the Plenty lane's module; design/scratch/m5-registry-plenty.md) */
import { plenty, PLENTY_DIVIDENDS, PLENTY_LOOPHOLES, PLENTY_PLEDGES } from './sectors/plenty';
import { steam } from './sectors/steam';
/* M4: the Coal Age complete (the Iron and Fishing lanes' modules; design/scratch/m4-registry-*.md). */
import { iron } from './sectors/iron';
import { fishing } from './sectors/fishing';
import { acts } from './acts';
import { surveyReveal } from './boardSurvey';
import { recycleText } from './words';
/* M3: this lane's Histories; the other two content lanes' modules (design/scratch/m3-register-*.md), imported here and
 * linted by content.test.ts. The registry is the one place that wires them; their files are theirs. */
import { histories } from './histories';
import { cast, castM4, castM5, castM5Plenty } from './cast';
import { dispatches } from './dispatches';
import { ambient, ambientM4, ambientM5, ambientM5Plenty } from './news/ambient';
import { archive } from './archive';
import { proprietor } from './proprietor';
import { ending } from './ending';
/* M5: the Chair (this lane's numbers), and each lane's M5 exports as their notes land
 * (design/scratch/m5-registry-{motion,plenty,text}.md). */
import { articles, chair, generalPledges, officeDef, playbooks, rival } from './chair';
import { officeText } from './office';

export { sig2, ladder } from './helpers';

/**
 * The Industries in sectorOrder: the order they are listed, iterated and (by default) unlocked in. Their upgrades,
 * levers and headlines are concatenated in this order too, which fixes the order of cards and levers on screen.
 * M4: the Coal Age's four (Act I), then the Previews (Acts II and III). Saves key sectors by id, so the order is free.
 * M5: Plenty joins the Great Acceleration after Motion (it opens only in office, Ministry 3).
 */
const SECTORS: SectorContent[] = [steam, light, iron, fishing, motion, plenty, compute, code];

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
  /* M5: Plenty's decade dividends (written in its module; appended so earlier draws are unchanged) */
  dividends: [...dividends, ...PLENTY_DIVIDENDS],
  commons,
  charters,
  knowhowTrees,
  recycleText,
  features,
  /* M3 */
  /* M3; M4 appends the text lane's new cast and ambient templates (append only: content order is the draw's tie-break) */
  cast: [...cast, ...castM4, ...castM5, ...castM5Plenty],
  dispatches,
  ambient: [...ambient, ...ambientM4, ...ambientM5, ...ambientM5Plenty],
  histories,
  archive,
  proprietor,
  ending,
  /* M4 */
  acts,
  surveyReveal,
  /* M5: the Ministry. Pledges and loopholes: the general ones (chair.ts), then each Industry's in sectorOrder (content
   * order is the pledge draw's order). */
  office: officeDef(officeText),
  chair,
  rival,
  pledges: [...generalPledges, ...motionPledges, ...PLENTY_PLEDGES],
  loopholes: [...motionLoopholes, ...PLENTY_LOOPHOLES],
  articles,
  playbooks,
};
