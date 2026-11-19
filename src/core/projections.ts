/**
 * Upgrade cards: the "this decade" and "brings within reach" projections (two simulated clones, cached), and the
 * upgrade views.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 *
 * Cost control (M2 performance fix). The projection re-simulates the whole economy for PROJECTION_SECONDS, so:
 *   - the cache is keyed on STRUCTURE (upgrades, levers, know-how, seats, Charter, founded/available set, budgets,
 *     settlements, decades and dividends, Commons levels, crises fired, revealed) plus a coarse time bucket
 *     (PROJECTION_BUCKET seconds), not on the second: a card's line is recomputed at most once per bucket while nothing
 *     structural changes;
 *   - projections are lazy per card and per sector: `upgradeViews(state, content, sector)` projects only that
 *     sector's cards (the Industry on screen); the others are returned with projectedDecade null;
 *   - the clones step at PROJECTION_DT (10 s; the M1 method used 5 s). src/core/m2.projections.test.ts pins the
 *     difference against the exact M1 method (dt 5, recomputed every second).
 */
import type { Content, GameState, SectorId, UpgradeDef, UpgradeView } from '../types';
import { PROJECTION_SECONDS, PROJECTION_DT, PROJECTION_BUCKET } from './constants';
import { idx } from './contentIndex';
import { modsOf, isForbidden } from './effects';
import { computeFlows, primeFocusedFlows } from './flows';
import { applyUpgrade, upgradeCost, upgradeMax, upgradeVisible, upgradeExcludedBy } from './purchases';
import { step } from './step';
import { fin } from './util';
import { cardWanted } from './temptation';

/* ------------------------------------------------------------------ */
/* Projections                                                         */
/* ------------------------------------------------------------------ */

export function simulate(state: GameState, content: Content, seconds: number, dt: number, trail?: GameState[]): GameState {
  let s = state;
  const n = Math.ceil(seconds / dt - 1e-9);
  const h = seconds / n;
  if (trail) trail.push(s);
  for (let i = 0; i < n; i++) {
    const t = step(s, content, h, true);
    if (t === s) break;
    s = t;
    if (trail) trail.push(s);
  }
  return s;
}

/**
 * The with-upgrade clone, solving only the sectors the upgrade can change (`focus`) and reusing the without-clone's
 * flows (`trail`, one state per step) for the rest. Population, Mandate and everything else are stepped as usual.
 */
function simulateFocused(state: GameState, content: Content, seconds: number, dt: number, trail: GameState[], focus: ReadonlySet<SectorId>): GameState {
  let s = state;
  const n = Math.ceil(seconds / dt - 1e-9);
  const h = seconds / n;
  for (let i = 0; i < n; i++) {
    const b = trail[i];
    if (b !== undefined && Math.abs(b.time - s.time) < 1e-6) primeFocusedFlows(s, content, computeFlows(b, content), focus);
    const t = step(s, content, h, true);
    if (t === s) break;
    s = t;
  }
  return s;
}

/** Sectors an upgrade can change directly (its own and those its effects name), closed under spill and drawsOn. */
const focusCache = new WeakMap<UpgradeDef, { content: Content; set: Set<SectorId> }>();
function focusOf(def: UpgradeDef, content: Content): Set<SectorId> {
  const hit = focusCache.get(def);
  if (hit && hit.content === content) return hit.set;
  const set = new Set<SectorId>([def.sector]);
  let global = false;
  for (const ef of def.effects) {
    const sec = (ef as { sector?: SectorId }).sector;
    if (sec !== undefined) set.add(sec);
    else if (ef.type !== 'mandateAdd' && ef.type !== 'capitalAdd' && ef.type !== 'slotAdd' && ef.type !== 'reveal') global = true;
  }
  if (global) for (const s of idx(content).ids) set.add(s); // a global effect (costMul, wellbeingAdd…): solve everything
  for (let grew = true; grew;) {
    grew = false;
    for (const s of idx(content).ids) {
      if (!set.has(s)) continue;
      const d = content.sectors[s];
      for (const to of [d.spill?.to, d.drawsOn?.sector]) if (to !== undefined && content.sectors[to] && !set.has(to)) { set.add(to); grew = true; }
    }
  }
  focusCache.set(def, { content, set });
  return set;
}

export interface Projection { projectedDecade: number | null; bringsWithinReach: { appId: string; projectedChange: number }[] }

/** Everything about a state that changes a projection, apart from the identities checked separately and time. */
function structureSig(state: GameState, content: Content): string {
  let sig = state.flags.revealed ? 'r' : '-';
  for (const s of idx(content).ids) {
    const es = state.sectors[s];
    if (!es?.open) continue;
    sig += `|${s}:`;
    for (const a of content.sectors[s].applications) sig += es.apps[a.id]?.founded ? '1' : es.apps[a.id]?.available ? 'a' : '0';
    const b = es.budget;
    if (b) sig += `b${b.r0},${b.since},${b.heldAt ?? ''},${b.pace ?? ''}`;
    sig += `c${es.crisesFired}d${es.decadesWithin?.length ?? 0}v${es.dividends?.length ?? 0}${es.settled ? 'S' : ''}`;
  }
  const lv = state.commons?.levels;
  if (lv) for (const k in lv) sig += `|${k}${lv[k]}`;
  return sig;
}

interface Entry {
  bucket: number; sig: string; levers: object; kh: object; inst: object; loadout: object; charter: string | null;
  content: Content; res: Map<string, Projection>; base: GameState | null; trail: GameState[];
}
const projCache = new WeakMap<object, Entry>();

/** The cached entry for this state's structure and time bucket (a new one when either changed). */
function entryFor(state: GameState, content: Content): Entry {
  const bucket = Math.floor(state.time / PROJECTION_BUCKET);
  const m = state.meta;
  let e = projCache.get(state.upgrades);
  if (e && e.bucket === bucket && e.content === content && e.levers === state.levers && e.kh === m.knowhow
    && e.inst === m.institutions && e.loadout === m.loadout && e.charter === (m.charter ?? null)) {
    const sig = structureSig(state, content);
    if (e.sig === sig) return e;
    e = undefined;
  }
  e = {
    bucket, sig: structureSig(state, content), levers: state.levers, kh: m.knowhow, inst: m.institutions,
    loadout: m.loadout, charter: m.charter ?? null, content, res: new Map(), base: null, trail: [],
  };
  projCache.set(state.upgrades, e);
  return e;
}

/** One card's projection from `state` (no cache), with clones stepped at `dt`; `base` is the without-upgrade clone. */
export function projectOne(state: GameState, content: Content, def: UpgradeDef, base: GameState, dt: number, trail?: GameState[]): Projection {
  const without = base;
  const start = applyUpgrade(state, content, def, state.time);
  const withIt = trail ? simulateFocused(start, content, PROJECTION_SECONDS, dt, trail, focusOf(def, content))
    : simulate(start, content, PROJECTION_SECONDS, dt);
  const fw = computeFlows(withIt, content);
  const rWithout = computeFlows(without, content).sectors[def.sector]?.R ?? 0;
  const rWith = fw.sectors[def.sector]?.R ?? 0;
  const projectedDecade = rWithout > 0 ? fin(rWith / rWithout - 1) : null;
  const bring: Projection['bringsWithinReach'] = [];
  if (projectedDecade !== null) {
    const sd = content.sectors[def.sector];
    const esNow = state.sectors[def.sector];
    const esW = withIt.sectors[def.sector];
    const esO = without.sectors[def.sector];
    const cands = sd.applications
      .filter((a) => !esNow?.apps[a.id]?.available && esW?.apps[a.id]?.available && !esO?.apps[a.id]?.available)
      .sort((a, b) => b.visibleBelow - a.visibleBelow);
    for (const a of cands) {
      const founded: GameState = {
        ...withIt,
        sectors: { ...withIt.sectors, [def.sector]: { ...esW, apps: { ...esW.apps, [a.id]: { ...esW.apps[a.id], available: true, founded: true } } } },
      };
      const r1 = computeFlows(founded, content).sectors[def.sector]?.R ?? 0;
      bring.push({ appId: a.id, projectedChange: rWith > 0 ? fin(r1 / rWith - 1) : 0 });
    }
  }
  return { projectedDecade, bringsWithinReach: bring };
}

export function projectionFor(state: GameState, content: Content, def: UpgradeDef): Projection {
  const entry = entryFor(state, content);
  const hit = entry.res.get(def.id);
  if (hit) return hit;
  entry.base ??= simulate(state, content, PROJECTION_SECONDS, PROJECTION_DT, entry.trail);
  const out = projectOne(state, content, def, entry.base, PROJECTION_DT, entry.trail);
  entry.res.set(def.id, out);
  return out;
}

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */

const NO_PROJECTION: Projection = { projectedDecade: null, bringsWithinReach: [] };

/**
 * Upgrade views. CORE EXTENSION (not yet in ModelApi; see the M2 core report): `sector`, when given, limits the
 * projections to that sector's cards; every card is still returned, the others with projectedDecade null and
 * bringsWithinReach []. Omitted: every eligible card is projected (the contract's behaviour).
 */
export function upgradeViews(state: GameState, content: Content, sector?: SectorId): UpgradeView[] {
  const mods = modsOf(state, content);
  const out: UpgradeView[] = [];
  for (const def of content.upgrades ?? []) {
    const level = state.upgrades[def.id] ?? 0;
    const maxed = level >= upgradeMax(def);
    const cost = upgradeCost(def, level, mods);
    const visible = upgradeVisible(state, def, mods, content);
    const forbidden = isForbidden(mods, def.id);
    const excludedBy = level >= 1 ? null : upgradeExcludedBy(state, content, def.id);
    let promisedChange: number | null = null;
    if (def.kind === 'efficiency') {
      let m = 1;
      for (const ef of def.effects) if (ef.type === 'etaMul') m *= ef.value;
      promisedChange = 1 / m - 1;
    }
    let proj = NO_PROJECTION;
    if ((def.kind === 'efficiency' || def.kind === 'capital') && state.flags.revealed && visible && !maxed && !excludedBy
      && (sector === undefined || def.sector === sector)) {
      proj = projectionFor(state, content, def);
    }
    out.push({
      def, level, cost, visible, affordable: visible && !maxed && !excludedBy && !forbidden && state.capital >= cost, maxed, excludedBy,
      promisedChange, projectedDecade: proj.projectedDecade, bringsWithinReach: proj.bringsWithinReach, forbidden,
      wantedChange: visible && !maxed ? cardWanted(state, content, def) : null,
    });
  }
  return out;
}
