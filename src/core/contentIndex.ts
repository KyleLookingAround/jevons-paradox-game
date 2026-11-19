/**
 * The content index: lookups by id, the solve order and the fork graph, built once per content object (cached by
 * identity in a WeakMap, so a new Content object gets a new index).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type {
  AchievementDef, AgeDef, ArchiveDef, CastDef, CharterDef, CommonsDef, Content, DispatchDef, DividendDef, HistoryDef, InstitutionDef,
  KnowhowDef, LeverDef, SectorId, SeamDef, UpgradeDef,
} from '../types';

/* ------------------------------------------------------------------ */
/* Content index (cached per content object)                           */
/* ------------------------------------------------------------------ */

export interface ContentIndex {
  /** sectorOrder, restricted to ids present in content.sectors. */
  ids: SectorId[];
  pos: Map<SectorId, number>;
  /** Order in which sectors are solved: a sector before the sectors it spills into or draws on. */
  solveOrder: SectorId[];
  ageOf: Map<SectorId, AgeDef>;
  upgrades: Map<string, UpgradeDef>;
  levers: Map<string, LeverDef>;
  knowhow: Map<string, KnowhowDef>;
  institutions: Map<string, InstitutionDef>;
  achievements: Map<string, AchievementDef>;
  apps: Map<string, { sector: SectorId; idx: number }>;
  efficiencyBySector: Record<string, UpgradeDef[]>;
  leversBySector: Record<string, LeverDef[]>;
  /** Symmetric fork adjacency: id → ids it excludes or is excluded by. */
  conflicts: Map<string, string[]>;
  names: Map<string, string>;
  /* M2 */
  dividends: Map<string, DividendDef>;
  commons: Map<string, CommonsDef>;
  charters: Map<string, CharterDef>;
  /** Upgrades of each sector with an authored `stage` (absent: the sector has none). */
  stagedBySector: Record<string, UpgradeDef[]>;
  /* M3 */
  /** Seam id → its sector, index in the ladder and def. */
  seams: Map<string, { sector: SectorId; idx: number; def: SeamDef }>;
  /** Levers of kind 'measure' with effects, and levers with sideEffects (the run-varying Mods sources). */
  measureLevers: LeverDef[];
  sideLevers: LeverDef[];
  dispatches: Map<string, DispatchDef>;
  cast: Map<string, CastDef>;
  histories: Map<string, HistoryDef>;
  archive: Map<string, ArchiveDef>;
  /** Any sector with an M3 mechanic kind (load, travel, priceSeen on an app), or applications with lockInDecay. */
  anyMechanic: boolean;
}
const indexCache = new WeakMap<Content, ContentIndex>();
export function idx(content: Content): ContentIndex {
  let ix = indexCache.get(content);
  if (ix) return ix;
  const sectors = content.sectors ?? {};
  const ids = (content.sectorOrder ?? []).filter((s, i, a) => !!sectors[s] && a.indexOf(s) === i);
  ix = {
    ids, pos: new Map(ids.map((s, i) => [s, i])), solveOrder: [], ageOf: new Map(), upgrades: new Map(),
    levers: new Map(), knowhow: new Map(), institutions: new Map(), achievements: new Map(), apps: new Map(),
    efficiencyBySector: {}, leversBySector: {}, conflicts: new Map(), names: new Map(),
    dividends: new Map(), commons: new Map(), charters: new Map(), stagedBySector: {},
    seams: new Map(), measureLevers: [], sideLevers: [], dispatches: new Map(), cast: new Map(), histories: new Map(),
    archive: new Map(), anyMechanic: false,
  };
  for (const a of content.ages ?? []) for (const s of a.sectors ?? []) if (!ix.ageOf.has(s)) ix.ageOf.set(s, a);
  const conflict = (a: string, b: string) => {
    if (a === b) return;
    const l = ix!.conflicts.get(a) ?? [];
    if (!l.includes(b)) l.push(b);
    ix!.conflicts.set(a, l);
  };
  for (const u of content.upgrades ?? []) {
    ix.upgrades.set(u.id, u);
    ix.names.set(u.id, u.name);
    if (u.kind === 'efficiency') (ix.efficiencyBySector[u.sector] ??= []).push(u);
    for (const x of u.excludes ?? []) { conflict(u.id, x); conflict(x, u.id); }
    if (typeof u.stage === 'number' && Number.isFinite(u.stage)) (ix.stagedBySector[u.sector] ??= []).push(u);
  }
  for (const d of content.dividends ?? []) { ix.dividends.set(d.id, d); ix.names.set(d.id, d.name); }
  for (const c of content.commons ?? []) { ix.commons.set(c.id, c); ix.names.set(c.id, c.name); }
  for (const c of content.charters ?? []) { ix.charters.set(c.id, c); ix.names.set(c.id, c.name); }
  for (const l of content.levers ?? []) {
    ix.levers.set(l.id, l);
    ix.names.set(l.id, l.name);
    (ix.leversBySector[l.sector] ??= []).push(l);
    if (l.kind === 'measure' && l.effects && l.effects.length) ix.measureLevers.push(l);
    if (l.sideEffects && l.sideEffects.effects && l.sideEffects.effects.length) ix.sideLevers.push(l);
  }
  for (const d of content.dispatches ?? []) if (!ix.dispatches.has(d.id)) { ix.dispatches.set(d.id, d); ix.names.set(d.id, d.headline); }
  for (const c of content.cast ?? []) if (!ix.cast.has(c.id)) { ix.cast.set(c.id, c); ix.names.set(c.id, c.name); }
  for (const h of content.histories ?? []) if (!ix.histories.has(h.id)) { ix.histories.set(h.id, h); ix.names.set(h.id, h.name); }
  for (const a of content.archive ?? []) if (!ix.archive.has(a.id)) ix.archive.set(a.id, a);
  for (const k of content.knowhow ?? []) { ix.knowhow.set(k.id, k); ix.names.set(k.id, k.name); }
  for (const i of content.institutions ?? []) { ix.institutions.set(i.id, i); ix.names.set(i.id, i.name); }
  for (const a of content.achievements ?? []) { ix.achievements.set(a.id, a); ix.names.set(a.id, a.name); }
  for (const s of ids) {
    sectors[s].applications.forEach((a, i) => { ix!.apps.set(a.id, { sector: s, idx: i }); ix!.names.set(a.id, a.name); });
    ix.names.set(s, sectors[s].name);
    const d = sectors[s];
    if (d.resourceKind === 'stock') (d.seams ?? []).forEach((m, i) => { ix!.seams.set(m.id, { sector: s, idx: i, def: m }); ix!.names.set(m.id, m.name); });
    if (d.load || d.travel || d.applications.some((a) => a.priceSeen || (a.lockInDecay ?? 0) > 0)) ix.anyMechanic = true;
  }
  // Solve order (Kahn): a source of spill / drawsOn is solved before its target; ties go to the later sector in
  // sectorOrder, which for v1-shaped content (spill and drawsOn point backwards) is simply the reverse order.
  const targets = (s: SectorId): SectorId[] => {
    const d = sectors[s];
    const t: SectorId[] = [];
    if (d.spill && ix!.pos.has(d.spill.to) && d.spill.to !== s) t.push(d.spill.to);
    if (d.drawsOn && ix!.pos.has(d.drawsOn.sector) && d.drawsOn.sector !== s) t.push(d.drawsOn.sector);
    return t;
  };
  const indeg = new Map(ids.map((s) => [s, 0]));
  for (const s of ids) for (const t of targets(s)) indeg.set(t, (indeg.get(t) ?? 0) + 1);
  const left = new Set(ids);
  while (left.size) {
    let pick: SectorId | null = null;
    for (let k = ids.length - 1; k >= 0; k--) if (left.has(ids[k]) && indeg.get(ids[k]) === 0) { pick = ids[k]; break; }
    if (pick === null) for (let k = ids.length - 1; k >= 0; k--) if (left.has(ids[k])) { pick = ids[k]; break; } // cycle
    left.delete(pick!);
    ix.solveOrder.push(pick!);
    for (const t of targets(pick!)) indeg.set(t, (indeg.get(t) ?? 1) - 1);
  }
  indexCache.set(content, ix);
  return ix;
}
