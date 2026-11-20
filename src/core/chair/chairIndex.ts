/**
 * M5 (Core A): the Chair's content lookups (layer 0 beside contentIndex.ts): chair sectors (ActDef.chair 'government'),
 * loophole rungs and ladders, pledges, Articles, playbooks, the rival's response rows. Cached per Content object.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { ArticleDef, Content, LoopholeDef, PlaybookDef, PledgeDef, ResponseDef, SectorId } from '../../types';
import { idx } from '../contentIndex';

export interface ChairIndex {
  /** Sectors of an act played from the Chair (ActDef.chair 'government'), in sectorOrder. */
  chairSectors: SectorId[];
  chairSet: Set<SectorId>;
  loopholes: Map<string, LoopholeDef>;
  /** Lever id → its rungs in ladder order (LeverDef.ladder; only rungs that exist and name the lever). */
  ladders: Map<string, LoopholeDef[]>;
  pledges: Map<string, PledgeDef>;
  articles: Map<string, ArticleDef>;
  playbooks: Map<string, PlaybookDef>;
  /** The rival's rows by kind (the first row of a kind wins). */
  responses: Map<string, ResponseDef>;
  /** Content has a Ministry at all (office, chair and rival present). */
  ministry: boolean;
}

const cache = new WeakMap<Content, ChairIndex>();

export function chairIdx(content: Content): ChairIndex {
  const hit = cache.get(content);
  if (hit) return hit;
  const ix = idx(content);
  const chairSectors: SectorId[] = [];
  for (const s of ix.ids) {
    const age = ix.ageOf.get(s);
    const act = age ? ix.actOfAge.get(age.id) : undefined;
    if (act?.chair === 'government') chairSectors.push(s);
  }
  const loopholes = new Map<string, LoopholeDef>();
  for (const l of content.loopholes ?? []) if (l && typeof l.id === 'string' && !loopholes.has(l.id)) loopholes.set(l.id, l);
  const ladders = new Map<string, LoopholeDef[]>();
  for (const lv of content.levers ?? []) {
    if (!lv.ladder?.length) continue;
    const rungs = lv.ladder.map((id) => loopholes.get(id)).filter((r): r is LoopholeDef => !!r && r.lever === lv.id);
    if (rungs.length) ladders.set(lv.id, rungs);
  }
  const byId = <T extends { id: string }>(xs: T[] | undefined): Map<string, T> => {
    const m = new Map<string, T>();
    for (const x of xs ?? []) if (x && typeof x.id === 'string' && !m.has(x.id)) m.set(x.id, x);
    return m;
  };
  const responses = new Map<string, ResponseDef>();
  for (const r of content.rival?.responses ?? []) if (r && typeof r.kind === 'string' && !responses.has(r.kind)) responses.set(r.kind, r);
  const out: ChairIndex = {
    chairSectors, chairSet: new Set(chairSectors), loopholes, ladders,
    pledges: byId(content.pledges), articles: byId(content.articles), playbooks: byId(content.playbooks), responses,
    ministry: !!(content.office && content.chair && content.rival),
  };
  cache.set(content, out);
  return out;
}
