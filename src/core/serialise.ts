/**
 * Persistence: serialize, deserialize (deep merge onto a fresh state, sanitising), and the v1 → v2 migration.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { SAVE_VERSION, START_YEAR, YEARS_PER_SECOND } from '../types';
import type { BudgetState, Content, GameState, LeverRecycle, LeverState, MetaState, SectorId, SectorState } from '../types';
import { NEWS_MAX, HISTORY_MAX } from './constants';
import { calendarYear } from './calendar';
import { idx } from './contentIndex';
import { institutionMax } from './effects';
import { computeFlows } from './flows';
import { leverMaxLevel, recycleOptions } from './levers';
import { upgradeMax } from './purchases';
import { freshMeta, createState } from './state';
import { fin, clamp, isObj } from './util';

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

function merge(fresh: unknown, saved: unknown): unknown {
  if (saved === undefined) return fresh;
  if (fresh === undefined || fresh === null) return saved; // e.g. an id in a map, or budget: null
  if (typeof fresh === 'number') return typeof saved === 'number' && Number.isFinite(saved) ? saved : fresh;
  if (typeof fresh === 'boolean') return typeof saved === 'boolean' ? saved : fresh;
  if (typeof fresh === 'string') return typeof saved === 'string' ? saved : fresh;
  if (Array.isArray(fresh)) return Array.isArray(saved) ? saved : fresh;
  if (isObj(fresh)) {
    if (!isObj(saved)) return fresh;
    const out: Record<string, unknown> = { ...fresh };
    for (const k of Object.keys(saved)) out[k] = merge(fresh[k], saved[k]);
    return out;
  }
  return saved;
}

/** Map-valued fields whose keys a fresh state does not list: merge() cannot type-check their values, so do it here. */
function levelMap(x: unknown, maxOf: (id: string) => number | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 1) continue;
    const max = maxOf(k);
    out[k] = Math.floor(max === undefined ? v : Math.min(v, max));
  }
  return out;
}
function trueMap(x: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (isObj(x)) for (const [k, v] of Object.entries(x)) if (v === true) out[k] = true;
  return out;
}
function amountMap(x: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (isObj(x)) for (const [k, v] of Object.entries(x)) if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v;
  return out;
}
const numOr = (x: unknown, d: number): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);

/** v1 → v2 (types.ts SAVE_VERSION). Works on a JSON copy; returns the v2-shaped raw object. */
function migrateV1(raw: Record<string, unknown>, content: Content): Record<string, unknown> {
  const ix = idx(content);
  const r: Record<string, unknown> = JSON.parse(JSON.stringify(raw));
  const sectors = isObj(r.eras) ? r.eras : {};
  delete r.eras;
  r.sectors = sectors;
  if (Array.isArray(r.history)) {
    r.history = r.history.map((h) => {
      if (!isObj(h)) return h;
      const { eras, ...rest } = h;
      return { ...rest, sectors: isObj(eras) ? eras : {} };
    });
  }
  if (Array.isArray(r.news)) {
    r.news = r.news.map((n) => {
      if (!isObj(n)) return n;
      const { era, ...rest } = n;
      return typeof era === 'string' ? { ...rest, sector: era } : rest;
    });
  }
  const meta: Record<string, unknown> = isObj(r.meta) ? r.meta : {};
  r.meta = meta;
  if (isObj(meta.lastRun)) {
    const { eras, causeEra, ...rest } = meta.lastRun;
    meta.lastRun = { ...rest, sectors: isObj(eras) ? eras : {}, ...(typeof causeEra === 'string' ? { causeSector: causeEra } : {}) };
  }
  meta.steadySectors = trueMap(meta.steadyEras);
  delete meta.steadyEras;
  const furthest = Math.max(1, Math.floor(numOr(meta.furthestEra, 1)));
  meta.sectorsOpened = Object.fromEntries(ix.ids.slice(0, furthest).map((s) => [s, true]));
  delete meta.furthestEra;
  const owned: Record<string, number> = {};
  if (isObj(meta.institutions)) for (const [k, v] of Object.entries(meta.institutions)) if (v === true || (typeof v === 'number' && v >= 1)) owned[k] = 1;
  meta.institutions = owned;
  // types.ts says max(startingSlots, number owned); with multi-seat institutions that would unseat one of them, so the
  // seats cover the owned institutions' slots (identical when every institution takes one seat).
  meta.slots = Math.max(content.global?.startingSlots ?? 2,
    Object.keys(owned).reduce((a, id) => a + (ix.institutions.has(id) ? ix.institutions.get(id)!.slots ?? 1 : 1), 0));
  meta.loadout = (content.institutions ?? []).filter((i) => owned[i.id]).map((i) => i.id);
  const backfired: Record<string, boolean> = {};
  for (const [s, es] of Object.entries(sectors)) if (isObj(es) && es.backfired === true) backfired[s] = true;
  meta.backfiredSectors = backfired;
  const run: Record<string, unknown> = isObj(r.run) ? r.run : {};
  r.run = run;
  run.steadySectors = trueMap(run.steadyEras);
  delete run.steadyEras;
  run.decoupledYears = 0;
  run.wellbeingYears = 0;
  run.yearsAtTarget = 0;
  run.budgetDecades = 0;
  run.firstBackfires = {};
  r.steadyYearsAll = 0;
  const levers = isObj(r.levers) ? r.levers : {};
  const time = numOr(r.time, 0);
  for (const [s, es] of Object.entries(sectors)) {
    if (!isObj(es)) continue;
    const def = content.sectors?.[s];
    const baseR = numOr(es.baseR, 0), baseD = numOr(es.baseD, 0);
    es.etaAtBase = numOr(es.etaAtBase, 0) > 0 ? es.etaAtBase : baseR > 0 && baseD > 0 ? baseD / baseR : def?.baseEta ?? 1;
    es.serviceDelivered = 0;
    es.decadesWithin = [];
    es.steadyYears = 0;
    es.budget = null;
    if (es.open === true) {
      let ref = 0;
      for (const l of ix.leversBySector[s] ?? []) {
        const ls = levers[l.id];
        if (l.kind === 'cap' && isObj(ls) && numOr(ls.level, 0) > 0 && numOr(ls.ref, 0) > 0) ref = Math.max(ref, ls.ref as number);
      }
      if (ref > 0) es.budget = { r0: ref, since: time, drawnYear: -1 }; // year filled in once the state is built
    }
  }
  for (const [id, ls] of Object.entries(levers)) {
    const def = ix.levers.get(id);
    if (isObj(ls) && def && typeof ls.level === 'number') ls.level = clamp(Math.floor(ls.level), 0, leverMaxLevel(def));
    if (isObj(ls)) delete ls.recycle;
  }
  r.version = SAVE_VERSION;
  return r;
}

function validBudget(x: unknown): BudgetState | null {
  if (!isObj(x)) return null;
  const r0 = numOr(x.r0, NaN), since = numOr(x.since, NaN), drawnYear = numOr(x.drawnYear, NaN);
  if (!(r0 > 0) || !Number.isFinite(since) || !Number.isFinite(drawnYear)) return null;
  const heldAt = numOr(x.heldAt, NaN);
  return Number.isFinite(heldAt) ? { r0, since, drawnYear, heldAt } : { r0, since, drawnYear };
}

export function deserialize(text: string, content: Content): GameState | null {
  let raw0: unknown;
  try { raw0 = JSON.parse(text); } catch { return null; }
  if (!isObj(raw0) || typeof raw0.time !== 'number' || !Number.isFinite(raw0.time)) return null;
  const version = raw0.version === undefined ? 1 : raw0.version;
  if (typeof version !== 'number' || !Number.isFinite(version) || version > SAVE_VERSION) return null;
  let raw: Record<string, unknown>;
  try {
    if (version < 2) {
      if (!isObj(raw0.eras)) return null;
      raw = migrateV1(raw0, content);
    } else {
      if (!isObj(raw0.sectors)) return null;
      raw = raw0;
    }
  } catch { return null; }
  try {
    const ix = idx(content);
    const savedMeta = isObj(raw.meta) ? raw.meta : {};
    const merged0 = merge(freshMeta(content), savedMeta) as MetaState;
    const institutions = levelMap(merged0.institutions, (id) => { const d = ix.institutions.get(id); return d ? institutionMax(d) : undefined; });
    // loadout: owned, known, distinct, within the seats
    const loadout: string[] = [];
    let used = 0;
    const slots = Math.max(0, Math.floor(numOr(merged0.slots, content.global?.startingSlots ?? 2)));
    for (const id of Array.isArray(merged0.loadout) ? merged0.loadout : []) {
      const d = typeof id === 'string' ? ix.institutions.get(id) : undefined;
      if (!d || !institutions[id] || loadout.includes(id) || used + (d.slots ?? 1) > slots) continue;
      loadout.push(id);
      used += d.slots ?? 1;
    }
    const meta: MetaState = {
      ...merged0,
      knowhow: levelMap(merged0.knowhow, (id) => ix.knowhow.get(id)?.maxLevel),
      institutions,
      achievements: trueMap(merged0.achievements),
      steadySectors: trueMap(merged0.steadySectors),
      sectorsOpened: trueMap(merged0.sectorsOpened),
      backfiredSectors: trueMap(merged0.backfiredSectors),
      slots,
      loadout,
    };
    const fresh = createState(content, meta, typeof raw.seed === 'number' ? raw.seed : 1);
    const merged = merge(fresh, { ...raw, meta: undefined }) as GameState;
    // only sectors known to content; sanitise budgets and decades
    const sectors: Record<SectorId, SectorState> = {};
    for (const s of ix.ids) {
      const es = merged.sectors[s];
      sectors[s] = {
        ...es,
        budget: validBudget(es.budget),
        decadesWithin: Array.isArray(es.decadesWithin) ? es.decadesWithin.filter((y) => typeof y === 'number' && Number.isFinite(y)) : [],
      };
    }
    const levers: Record<string, LeverState> = {};
    for (const [id, ls] of Object.entries(isObj(merged.levers) ? merged.levers : {})) {
      if (!isObj(ls) || typeof ls.level !== 'number' || typeof ls.ref !== 'number') continue;
      const def = ix.levers.get(id);
      const level = clamp(Math.floor(fin(ls.level)), 0, def ? leverMaxLevel(def) : Infinity);
      const out: LeverState = { level, ref: level > 0 ? Math.max(0, fin(ls.ref)) : 0 };
      if (def && typeof ls.recycle === 'string' && recycleOptions(def).includes(ls.recycle as LeverRecycle)) out.recycle = ls.recycle as LeverRecycle;
      levers[id] = out;
    }
    const run = merged.run;
    let s: GameState = {
      ...merged, version: SAVE_VERSION, sectors, levers, meta,
      upgrades: levelMap(merged.upgrades, (id) => { const u = ix.upgrades.get(id); return u ? upgradeMax(u) : undefined; }),
      run: {
        ...run, resourceUsed: amountMap(run.resourceUsed), steadySectors: trueMap(run.steadySectors),
        firstBackfires: trueMap(run.firstBackfires),
      },
      news: Array.isArray(merged.news)
        ? merged.news.filter((n) => isObj(n) && typeof n.text === 'string' && typeof n.time === 'number')
          .map((n) => (typeof n.year === 'number' ? n : { ...n, year: Math.floor(START_YEAR + n.time * YEARS_PER_SECOND) }))
          .slice(0, NEWS_MAX)
        : [],
      history: Array.isArray(merged.history)
        ? merged.history.filter((h) => isObj(h) && Number.isFinite(h.time) && isObj(h.sectors)).slice(-HISTORY_MAX)
        : [],
    };
    // migrated budgets get the calendar year of the save
    if (version < 2) {
      const y = Math.floor(calendarYear(s, content));
      const s2 = { ...s.sectors };
      let changed = false;
      for (const id of ix.ids) {
        const b = s2[id].budget;
        if (b && b.drawnYear < 0) { s2[id] = { ...s2[id], budget: { ...b, drawnYear: y } }; changed = true; }
      }
      if (changed) s = { ...s, sectors: s2 };
    }
    // sanity: must be computable
    const d = computeFlows(s, content);
    if (!Number.isFinite(d.wellbeing) || !Number.isFinite(s.capital)) return null;
    return s;
  } catch {
    return null;
  }
}
