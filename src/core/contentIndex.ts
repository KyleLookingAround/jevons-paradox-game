/**
 * The content index: lookups by id, the solve order and the fork graph, built once per content object (cached by
 * identity in a WeakMap, so a new Content object gets a new index).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type {
  ActDef, AchievementDef, AgeDef, ArchiveDef, CastDef, CharterDef, CommonsDef, Content, DispatchDef, DividendDef, HistoryDef, InstitutionDef,
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
  /* M4 */
  /** Content.acts (valid entries, in order) and each age's act. */
  acts: ActDef[];
  actOfAge: Map<string, ActDef>;
  /** Sectors whose age belongs to a Preview act (ActDef.preview). */
  preview: Set<SectorId>;
  /** SectorDef.resourceStock, valid only (both 'stock', the owner in content and drawing on no one): drawer → owner,
   *  and owner → its drawers in sectorOrder. */
  ownerOf: Map<SectorId, SectorId>;
  drawers: Map<SectorId, SectorId[]>;
  /** Feeds accepted into the solve order (ApplicationDef.feeds, '*' expanded), by target in solve order of their
   *  sources: source sector, the app's index in it, capCostMul. A feed that would close a cycle is refused. */
  feedsInto: Record<SectorId, { src: SectorId; app: number; mul: number; /** M4 (finish) */ sat?: number; /** M4 (finish) */ tApp?: string }[]>;
  /** Feed sources → their targets (accepted, sectorOrder). */
  feedTargets: Map<SectorId, SectorId[]>;
  /** Feeds refused because they would close a cycle in the solve order (the lint's job; the core ignores them). */
  refusedFeeds: { app: string; sector: SectorId }[];
  /** 'renewable' sectors with a RenewableDef, in sectorOrder. */
  renewable: SectorId[];
  /** Content uses any M4 kind (acts, resourceStock, feeds, renewable): a fast exit for the M4 rules. */
  anyM4: boolean;
  /** M4 (amend): levers with LeverDef.when. */
  whenLevers: LeverDef[];
  /** M5 (follow-up): any application has ApplicationDef.when (a fast exit for its rules). */
  whenApps: boolean;
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
    acts: [], actOfAge: new Map(), preview: new Set(), ownerOf: new Map(), drawers: new Map(), feedsInto: {},
    feedTargets: new Map(), refusedFeeds: [], renewable: [], anyM4: false, whenLevers: [], whenApps: false,
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
    if (l.when) ix.whenLevers.push(l);
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
  // M4: acts, previews, shared reserves, renewables
  for (const a of content.acts ?? []) {
    if (!a || typeof a.id !== 'string' || !Array.isArray(a.ages)) continue;
    ix.acts.push(a);
    for (const g of a.ages) if (!ix.actOfAge.has(g)) ix.actOfAge.set(g, a);
  }
  for (const s of ids) {
    const d = sectors[s];
    const act = ix.ageOf.get(s) ? ix.actOfAge.get(ix.ageOf.get(s)!.id) : undefined;
    if (act?.preview) ix.preview.add(s);
    const o = d.resourceStock;
    if (o !== undefined && o !== s && d.resourceKind === 'stock' && sectors[o] && ix.pos.has(o) && sectors[o].resourceKind === 'stock' && sectors[o].resourceStock === undefined) {
      ix.ownerOf.set(s, o);
      const l = ix.drawers.get(o) ?? [];
      l.push(s);
      ix.drawers.set(o, l);
    }
    if (d.resourceKind === 'renewable' && d.renewable) ix.renewable.push(s);
  }
  // Solve order (Kahn): a source of spill / drawsOn is solved before its target; ties go to the later sector in
  // sectorOrder, which for v1-shaped content (spill and drawsOn point backwards) is simply the reverse order.
  // M4: a feed is an edge source → target too ('*' expanded to every other sector); a feed edge that would close a
  // cycle is refused (not added), so content without feeds keeps exactly the M3 order.
  const edges = new Map<SectorId, SectorId[]>(ids.map((s) => [s, []]));
  for (const s of ids) {
    const d = sectors[s];
    const t = edges.get(s)!;
    if (d.spill && ix.pos.has(d.spill.to) && d.spill.to !== s) t.push(d.spill.to);
    if (d.drawsOn && ix.pos.has(d.drawsOn.sector) && d.drawsOn.sector !== s) t.push(d.drawsOn.sector);
  }
  const reaches = (from: SectorId, to: SectorId): boolean => {
    const seen = new Set<SectorId>([from]);
    const stack = [from];
    while (stack.length) {
      const x = stack.pop()!;
      if (x === to) return true;
      for (const y of edges.get(x) ?? []) if (!seen.has(y)) { seen.add(y); stack.push(y); }
    }
    return false;
  };
  const feedList: { src: SectorId; tgt: SectorId; app: number; mul: number; sat?: number; tApp?: string }[] = [];
  for (const s of ids) {
    sectors[s].applications.forEach((a, i) => {
      for (const fd of a.feeds ?? []) {
        if (!fd || typeof fd.capCostMul !== 'number' || !Number.isFinite(fd.capCostMul)) continue;
        const explicit = fd.sector !== '*';
        const tgts = explicit ? [fd.sector] : ids.filter((x) => x !== s);
        for (const t of tgts) {
          if (!ix!.pos.has(t) || t === s) continue;
          if (reaches(t, s)) { if (explicit) ix!.refusedFeeds.push({ app: a.id, sector: t }); continue; }
          const e = edges.get(s)!;
          if (!e.includes(t)) e.push(t);
          // M4 (finish): a demand feed (satMul, on one application of the target or all of it)
          const sat = typeof fd.satMul === 'number' && Number.isFinite(fd.satMul) && fd.satMul !== 1 ? fd.satMul : undefined;
          feedList.push(sat === undefined ? { src: s, tgt: t, app: i, mul: fd.capCostMul } : { src: s, tgt: t, app: i, mul: fd.capCostMul, sat, ...(explicit && fd.app ? { tApp: fd.app } : {}) });
        }
      }
    });
  }
  const indeg = new Map(ids.map((s) => [s, 0]));
  for (const s of ids) for (const t of edges.get(s)!) indeg.set(t, (indeg.get(t) ?? 0) + 1);
  const left = new Set(ids);
  while (left.size) {
    let pick: SectorId | null = null;
    for (let k = ids.length - 1; k >= 0; k--) if (left.has(ids[k]) && indeg.get(ids[k]) === 0) { pick = ids[k]; break; }
    if (pick === null) for (let k = ids.length - 1; k >= 0; k--) if (left.has(ids[k])) { pick = ids[k]; break; } // cycle
    left.delete(pick!);
    ix.solveOrder.push(pick!);
    for (const t of edges.get(pick!)!) indeg.set(t, (indeg.get(t) ?? 1) - 1);
  }
  const solvePos = new Map(ix.solveOrder.map((s, i) => [s, i]));
  for (const f of feedList) {
    if ((solvePos.get(f.src) ?? 0) >= (solvePos.get(f.tgt) ?? 0)) continue; // defensive: only edges the order honours
    (ix.feedsInto[f.tgt] ??= []).push(f.sat === undefined ? { src: f.src, app: f.app, mul: f.mul } : { src: f.src, app: f.app, mul: f.mul, sat: f.sat, ...(f.tApp ? { tApp: f.tApp } : {}) });
    const l = ix.feedTargets.get(f.src) ?? [];
    if (!l.includes(f.tgt)) l.push(f.tgt);
    ix.feedTargets.set(f.src, l);
  }
  for (const [k, l] of ix.feedTargets) ix.feedTargets.set(k, l.sort((a, b) => ix!.pos.get(a)! - ix!.pos.get(b)!));
  for (const s of ix.ids) if (content.sectors[s].applications.some((a) => !!a.when)) ix.whenApps = true;
  ix.anyM4 = ix.acts.length > 0 || ix.ownerOf.size > 0 || feedList.length > 0 || ix.renewable.length > 0;
  indexCache.set(content, ix);
  return ix;
}
