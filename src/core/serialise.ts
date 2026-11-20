/**
 * Persistence: serialize, deserialize (deep merge onto a fresh state, sanitising), the v1 → v2 and (M2) v2 → v3
 * migrations.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { SAVE_VERSION, START_YEAR, YEARS_PER_SECOND } from '../types';
import { EVENTS_MAX, PENDING_DIVIDENDS_MAX, RUN_HISTORY_MAX, OPENING_MAX, ANSWERED_MAX, MODIFIERS_MAX, MILESTONES_MAX, LOAD_HOURS } from '../types';
import type {
  ActiveModifier, AnsweredDispatch, AppState, BudgetState, Content, EndingRecord, FiledReturn, GameEvent, GameState, LeverRecycle,
  LeverState, MetaState, OpeningAction, OpeningRecord, PendingDispatch, PendingDividend, RunSummary, SectorId, SectorState, SettledState,
} from '../types';
import { DISPATCH_QUEUE_MAX } from './constants';
import { dispatchFirstAt, dispatchGap } from './dispatchClock';
import { unlockNotes } from './archive';
import { endingRecord } from './ending';
import { milestone } from './milestones';
import { validReturn } from './returns';
import { NEWS_MAX, HISTORY_MAX } from './constants';
import { calendarYear } from './calendar';
import { drawOffer } from './charters';
import { commonsMax } from './commons';
import { idx } from './contentIndex';
import { institutionMax } from './effects';
import { computeFlows } from './flows';
import { leverMaxLevel, recycleOptions } from './levers';
import { mergeOrders } from './orders';
import { upgradeMax } from './purchases';
import { freshMeta, createState, defaultOrders, isFreshRun } from './state';
import { pacesOf } from './steady';
import { fin, clamp, isObj } from './util';
import { grandfathered } from './features';
import { FEATURE_IDS } from '../types';

const FEATURE_SET: ReadonlySet<string> = new Set(FEATURE_IDS);

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
    if (max === undefined) continue; // an id no longer in content
    out[k] = Math.floor(Math.min(v, max));
  }
  return out;
}
function trueMap(x: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (isObj(x)) for (const [k, v] of Object.entries(x)) if (v === true) out[k] = true;
  return out;
}
/** M3 (finish) migration: "the History was cleared this run", as it used to be read: a 'history' news item, or a
 *  'historyCleared' event since the last 'reckoning' event. */
function legacyHistoryCleared(news: unknown, events: unknown): boolean {
  if (Array.isArray(news) && news.some((n) => isObj(n) && n.key === 'history')) return true;
  const ev = Array.isArray(events) ? events : [];
  for (let i = ev.length - 1; i >= 0; i--) {
    const e = ev[i];
    if (!isObj(e)) continue;
    if (e.kind === 'historyCleared') return true;
    if (e.kind === 'reckoning') return false;
  }
  return false;
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
      if (ref > 0) es.budget = { r0: ref, since: time, drawnYear: -1 }; // year filled in once the state is built (w0/p0/pace: v2 → v3)
    }
  }
  for (const [id, ls] of Object.entries(levers)) {
    const def = ix.levers.get(id);
    if (isObj(ls) && def && typeof ls.level === 'number') ls.level = clamp(Math.floor(ls.level), 0, leverMaxLevel(def));
    if (isObj(ls)) delete ls.recycle;
  }
  r.version = 2;
  return r;
}

/** v2 → v3 steps 1–5 (types.ts SAVE_VERSION), on a JSON copy. Steps 6–7 run once the state is built. */
function migrateV2(raw: Record<string, unknown>, content: Content): Record<string, unknown> {
  const r: Record<string, unknown> = JSON.parse(JSON.stringify(raw));
  // 1
  r.pendingDividends = [];
  r.commons = { levels: {}, fund: 0 };
  r.events = [];
  r.lastOffline = null;
  r.charterOffer = [];
  // 2, 3
  const sectors = isObj(r.sectors) ? r.sectors : {};
  for (const [id, es] of Object.entries(sectors)) {
    if (!isObj(es)) continue;
    es.clearYears = 0;
    es.settled = null;
    es.settledBefore = false;
    es.dividends = [];
    es.decadesLean = Array.isArray(es.decadesWithin) ? es.decadesWithin.map(() => false) : [];
    es.windowLean = false;
    es.peakPressure = numOr(es.pressure, 0);
    if (isObj(es.apps)) for (const a of Object.values(es.apps)) if (isObj(a)) a.peakAdoption = 0;
    if (isObj(es.budget)) {
      const b = es.budget;
      b.pace = content.sectors[id] ? pacesOf(content, id)[0].id : 'gentle';
      b.w0 = -1;
      b.p0 = -1;
      delete b.clearAt;
    }
  }
  // 4
  const run: Record<string, unknown> = isObj(r.run) ? r.run : {};
  r.run = run;
  Object.assign(run, { leanDecades: 0, decisions: 0, decisionsByDecade: [], automated: 0, automatedByDecade: [], opening: [], firstBudgetAt: null });
  // 5
  const meta: Record<string, unknown> = isObj(r.meta) ? r.meta : {};
  r.meta = meta;
  meta.charter = null;
  meta.orders = defaultOrders(content);
  meta.runs = isObj(meta.lastRun) ? [meta.lastRun] : [];
  delete meta.opening;
  delete meta.firstOpening;
  meta.eventSeq = 0;
  meta.knowhowPeak = isObj(meta.knowhow) ? { ...meta.knowhow } : {};
  meta.peakPopulationEver = Math.max(1, numOr(r.peakPopulation, 1));
  r.version = 3;
  return r;
}

/** M3: v3 → v4 steps 1–5 (types.ts SAVE_VERSION), on a JSON copy. Steps 6–7 run once the state is built. */
function migrateV3(raw: Record<string, unknown>, content: Content): Record<string, unknown> {
  const r: Record<string, unknown> = JSON.parse(JSON.stringify(raw));
  // 1
  r.modifiers = [];
  r.ambientLast = {};
  r.orderLog = {};
  r.historyLifted = false;
  r.dispatch = { pending: [], queue: [], answered: [], offered: [], draws: 0, standing: [], nextAt: -1 };
  // 2
  const sectors = isObj(r.sectors) ? r.sectors : {};
  for (const es of Object.values(sectors)) {
    if (!isObj(es)) continue;
    es.seamsSunk = 0;
    if (isObj(es.settled)) { delete es.settled.load; delete es.settled.travel; delete es.settled.appPriceSeen; }
  }
  // 3
  const run: Record<string, unknown> = isObj(r.run) ? r.run : {};
  r.run = run;
  run.dispatchesAnswered = 0;
  run.dispatchesDefaulted = 0;
  // 4
  const meta: Record<string, unknown> = isObj(r.meta) ? r.meta : {};
  r.meta = meta;
  Object.assign(meta, {
    dispatches: { seen: {}, arms: {}, playerArms: {} }, history: null, histories: {}, unlocks: {}, returns: {}, archive: {},
    flags: {}, endings: {}, bankedSeconds: 0,
  });
  const ms: Record<string, { run: number; at: number; year: number }> = {};
  const early = { run: 0, at: 0, year: 0 };
  const ids = idx(content).ids;
  const keyed = (rec: unknown, prefix: string) => { if (isObj(rec)) for (const s of ids) if (rec[s] === true) ms[`${prefix}:${s}`] = { ...early }; };
  keyed(meta.sectorsOpened, 'sectorOpened');
  keyed(meta.steadySectors, 'steady');
  keyed(meta.backfiredSectors, 'backfire');
  meta.milestones = ms;
  if (isObj(meta.orders)) meta.orders.dispatch = { on: false, cast: {} };
  // 5: RunSummary entries keep their M3 optional fields absent
  r.version = 4;
  return r;
}

/** M4: v4 → v5 (types.ts SAVE_VERSION, steps 1–6), on a JSON copy; step 7 (validation) runs for every version. */
function migrateV4(raw: Record<string, unknown>): Record<string, unknown> {
  const r: Record<string, unknown> = JSON.parse(JSON.stringify(raw));
  const meta: Record<string, unknown> = isObj(r.meta) ? r.meta : {};
  r.meta = meta;
  meta.world = { capstone: {}, scars: {} }; // 1 (2, 5, 6: nothing; 3: meta.endings.steadyAll kept as it is)
  if (isObj(r.flags) && r.flags.won === true) r.steadyYearsAll = 0; // 4: the Act I streak starts from the new rule
  r.version = 5;
  return r;
}

/* ---- M4 validation ---- */
/** MetaState.world: capstone records of known sectors and acts with a valid SettledState; scars of renewable sectors. */
function validWorld(x: unknown, content: Content): NonNullable<MetaState['world']> | undefined {
  if (!isObj(x)) return undefined;
  const ix = idx(content);
  const out: NonNullable<MetaState['world']> = {};
  if (isObj(x.capstone)) {
    const cap: NonNullable<NonNullable<MetaState['world']>['capstone']> = {};
    for (const [k, v] of Object.entries(x.capstone)) {
      if (!ix.pos.has(k) || !isObj(v) || typeof v.act !== 'string' || !ix.acts.some((a) => a.id === v.act) || !isNum(v.year)) continue;
      const st = validSettled(v.settled);
      if (st) cap[k] = { act: v.act, year: v.year, settled: st };
    }
    out.capstone = cap;
  }
  if (isObj(x.scars)) {
    const sc: NonNullable<NonNullable<MetaState['world']>['scars']> = {};
    for (const [k, v] of Object.entries(x.scars)) {
      if (!ix.renewable.includes(k) || !isObj(v) || !isNum(v.yearsLeft) || v.yearsLeft < 0) continue;
      sc[k] = { yearsLeft: v.yearsLeft, since: isNum(v.since) ? v.since : 0 };
    }
    out.scars = sc;
  }
  return out;
}
/** The optional M4 SectorState fields, as their types say (anything else dropped). */
function m4Sector(es: Record<string, unknown>, content: Content): Partial<SectorState> {
  const ix = idx(content);
  const out: Partial<SectorState> = {};
  for (const k of ['capstoned', 'arrears', 'crossed', 'foreignAnnounced'] as const) if (es[k] === true) out[k] = true;
  if (isNum(es.minStock)) out.minStock = clamp(es.minStock, 0, 1);
  const ls = es.lastSurvey;
  if (isObj(ls) && isNum(ls.t) && isNum(ls.year) && (ls.sinkR === null || isNum(ls.sinkR))) out.lastSurvey = { sinkR: ls.sinkR as number | null, t: ls.t, year: ls.year };
  if (isObj(es.feedPeak)) {
    const fp: Record<SectorId, number> = {};
    for (const [k, v] of Object.entries(es.feedPeak)) if (ix.pos.has(k) && isNum(v)) fp[k] = v;
    out.feedPeak = fp;
  }
  return out;
}
const M4_SECTOR_KEYS = ['capstoned', 'arrears', 'crossed', 'foreignAnnounced', 'minStock', 'lastSurvey', 'feedPeak'] as const;
function validReveal(x: unknown, content: Content): GameState['surveyReveal'] {
  if (!isObj(x) || typeof x.sector !== 'string' || !idx(content).renewable.includes(x.sector) || !isNum(x.reported) || !isNum(x.true) || !isNum(x.year)) return undefined;
  if (x.variant !== 'small' && x.variant !== 'large' && x.variant !== 'failed') return undefined;
  return { sector: x.sector, reported: clamp(x.reported, 0, 1), true: clamp(x.true, 0, 1), variant: x.variant, year: x.year, followed: x.followed === true };
}

/* ---- element-by-element validation of the M2 map- and array-valued fields ---- */

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const ACTORS = new Set(['player', 'market', 'civilService', 'treasury', 'default', 'dispatch']);
const EVENT_KINDS = new Set([
  'appAvailable', 'appFounded', 'upgradeBought', 'stageReached', 'leverEnacted', 'leverLapsed', 'budgetDrawn',
  'budgetBroken', 'decade', 'dividendChosen', 'clearSkies', 'steadyState', 'settled', 'unsettled', 'crisis', 'collapse',
  'exhausted', 'backfire', 'reveal', 'sectorOpened', 'ageBegins', 'commonsBuilt', 'charterChosen', 'won', 'reckoning',
  'featureUnlocked',
  'seamSunk', 'biteBack', 'dispatchArrived', 'dispatchAnswered', 'modifierEnded', 'historyChosen', 'historyCleared', 'returnFiled',
  'returnPublished', 'returnWithdrawn', 'archiveUnlocked', 'ending', 'bankUsed',
  'thresholdCrossed', 'scarHealed', 'surveyed', 'arrears', 'arrearsCleared', 'capstoned',
]);
function validEvents(x: unknown, maxSeq: number): GameEvent[] {
  if (!Array.isArray(x)) return [];
  const out: GameEvent[] = [];
  let last = 0;
  for (const e of x) {
    if (!isObj(e) || !isNum(e.seq) || e.seq <= last || e.seq > maxSeq || typeof e.kind !== 'string' || !EVENT_KINDS.has(e.kind)
      || !isNum(e.time) || !isNum(e.year)) continue;
    const ev: GameEvent = { seq: e.seq, kind: e.kind as GameEvent['kind'], time: e.time, year: e.year };
    if (typeof e.sector === 'string') ev.sector = e.sector;
    if (typeof e.id === 'string') ev.id = e.id;
    if (isNum(e.n)) ev.n = e.n;
    if (typeof e.by === 'string' && ACTORS.has(e.by)) ev.by = e.by as GameEvent['by'];
    if (e.first === true) ev.first = true;
    if (typeof e.label === 'string') ev.label = e.label;
    out.push(ev);
    last = e.seq;
  }
  return out.slice(-EVENTS_MAX);
}
function validPending(x: unknown, content: Content): PendingDividend[] {
  if (!Array.isArray(x)) return [];
  const ix = idx(content);
  const out: PendingDividend[] = [];
  for (const p of x) {
    if (!isObj(p) || typeof p.sector !== 'string' || !ix.pos.has(p.sector) || !Array.isArray(p.options) || p.options.length !== 2) continue;
    const [a, b] = p.options;
    if (typeof a !== 'string' || typeof b !== 'string' || !ix.dividends.has(a) || !ix.dividends.has(b)) continue;
    out.push({ sector: p.sector, decade: isNum(p.decade) ? p.decade : 1, options: [a, b], mul: isNum(p.mul) && p.mul >= 0 ? p.mul : 1 });
  }
  return out.slice(-PENDING_DIVIDENDS_MAX);
}
function validOpeningActions(x: unknown): OpeningAction[] {
  if (!Array.isArray(x)) return [];
  const out: OpeningAction[] = [];
  for (const a of x) {
    if (!isObj(a) || !isNum(a.t) || (a.kind !== 'upgrade' && a.kind !== 'found') || typeof a.id !== 'string'
      || typeof a.by !== 'string' || !ACTORS.has(a.by)) continue;
    out.push({ t: a.t, kind: a.kind, id: a.id, by: a.by as OpeningAction['by'] });
  }
  return out.slice(0, OPENING_MAX);
}
function validOpening(x: unknown): OpeningRecord | undefined {
  if (!isObj(x)) return undefined;
  const r: OpeningRecord = {
    actions: validOpeningActions(x.actions), firstBudgetAt: isNum(x.firstBudgetAt) ? x.firstBudgetAt : null,
    seconds: isNum(x.seconds) ? x.seconds : 0,
  };
  if (typeof x.charter === 'string') r.charter = x.charter;
  return r;
}
const ORDER_OUTCOMES = new Set(['bought', 'none', 'cash', 'payback']);
function validOrderLog(x: unknown, content: Content): GameState['orderLog'] {
  const out: GameState['orderLog'] = {};
  if (!isObj(x)) return out;
  const ix = idx(content);
  for (const [k, v] of Object.entries(x)) {
    if (!ix.pos.has(k) || !isObj(v) || !isNum(v.t) || typeof v.outcome !== 'string' || !ORDER_OUTCOMES.has(v.outcome)) continue;
    out[k] = { t: v.t, outcome: v.outcome as 'bought' };
    if (typeof v.id === 'string') out[k].id = v.id;
    if (isNum(v.payback)) out[k].payback = v.payback;
  }
  return out;
}
const validSummary = (x: unknown): x is RunSummary =>
  isObj(x) && typeof x.cause === 'string' && isNum(x.seconds) && isNum(x.hindsightGained) && isObj(x.sectors);
function validSettled(x: unknown): SettledState | null {
  if (!isObj(x)) return null;
  const keys = ['since', 'sinceYear', 'D', 'R', 'ps', 'pPre', 'income', 'P', 'eta', 'defect', 'N0', 'spillMul0', 'extraD0'] as const;
  for (const k of keys) if (!isNum(x[k])) return null;
  return {
    since: x.since as number, sinceYear: x.sinceYear as number, D: x.D as number, R: x.R as number, ps: x.ps as number,
    pPre: x.pPre as number, income: x.income as number, P: x.P as number, eta: x.eta as number, defect: x.defect as number,
    N0: x.N0 as number, spillMul0: x.spillMul0 as number, extraD0: x.extraD0 as number,
    appD: amountMap(x.appD), appAdoption: amountMap(x.appAdoption),
    ...m3Settled(x),
  };
}
function m3Settled(x: Record<string, unknown>): Partial<SettledState> {
  const out: Partial<SettledState> = {};
  const l = x.load;
  if (isObj(l) && isNum(l.factor) && isNum(l.capCostEff) && Array.isArray(l.hours) && l.hours.length === LOAD_HOURS && l.hours.every(isNum)) {
    out.load = { factor: l.factor, hours: (l.hours as number[]).slice(), capCostEff: l.capCostEff };
  }
  const t = x.travel;
  if (isObj(t) && isNum(t.speed) && isNum(t.hoursPerHead) && isNum(t.roads) && isNum(t.sprawl)) out.travel = { speed: t.speed, hoursPerHead: t.hoursPerHead, roads: t.roads, sprawl: t.sprawl };
  if (isObj(x.appPriceSeen)) out.appPriceSeen = amountMap(x.appPriceSeen);
  return out;
}

/* ---- M3 validation ---- */
function validModifiers(x: unknown, content: Content): ActiveModifier[] {
  if (!Array.isArray(x)) return [];
  const ix = idx(content);
  const out: ActiveModifier[] = [];
  for (const m of x) {
    if (!isObj(m) || typeof m.source !== 'string' || !isNum(m.arm) || !isNum(m.since) || !isNum(m.until)) continue;
    // M4: the Board's first survey ('survey:<s>', arm 0, a renewable sector with firstSurvey) and wager branches
    if (m.source.startsWith('survey:')) {
      const sd = content.sectors[m.source.slice(7)];
      if (m.arm === 0 && ix.renewable.includes(m.source.slice(7)) && sd?.renewable?.firstSurvey) out.push({ source: m.source, arm: 0, since: m.since, until: m.until });
      continue;
    }
    const branch = m.branch === 'win' || m.branch === 'lose' ? m.branch : undefined;
    const arm = ix.dispatches.get(m.source)?.arms[m.arm];
    if (branch ? !arm?.wager?.[branch]?.modifier : !arm?.modifier) continue;
    out.push(branch ? { source: m.source, arm: m.arm, since: m.since, until: m.until, branch } : { source: m.source, arm: m.arm, since: m.since, until: m.until });
  }
  return out.slice(-MODIFIERS_MAX);
}
function validDispatch(x: unknown, content: Content, fresh: GameState['dispatch']): GameState['dispatch'] {
  if (!isObj(x)) return fresh;
  const ix = idx(content);
  const known = (id: unknown): id is string => typeof id === 'string' && ix.dispatches.has(id);
  const pending: PendingDispatch[] = (Array.isArray(x.pending) ? x.pending : [])
    .filter((p): p is Record<string, unknown> => isObj(p) && known(p.id) && isNum(p.arrivedAt) && isNum(p.expiresAt))
    .map((p) => ({ id: p.id as string, arrivedAt: p.arrivedAt as number, expiresAt: p.expiresAt as number })).slice(0, 3);
  const answered: AnsweredDispatch[] = (Array.isArray(x.answered) ? x.answered : [])
    .filter((a): a is Record<string, unknown> => isObj(a) && known(a.id) && isNum(a.arm) && isNum(a.t) && typeof a.by === 'string' && ACTORS.has(a.by))
    .map((a) => {
      const out: AnsweredDispatch = { id: a.id as string, arm: a.arm as number, t: a.t as number, by: a.by as AnsweredDispatch['by'] };
      if (typeof a.won === 'boolean') out.won = a.won; // M4: a wager's result
      return out;
    }).slice(-ANSWERED_MAX);
  const standing: [string, number][] = (Array.isArray(x.standing) ? x.standing : [])
    .filter((e): e is [string, number] => Array.isArray(e) && e.length === 2 && known(e[0]) && isNum(e[1]) && !!ix.dispatches.get(e[0])?.arms[e[1]])
    .map((e) => [e[0], e[1]]);
  return {
    pending, answered, standing,
    queue: (Array.isArray(x.queue) ? x.queue : []).filter(known).slice(-DISPATCH_QUEUE_MAX),
    offered: (Array.isArray(x.offered) ? x.offered : []).filter(known),
    draws: isNum(x.draws) && x.draws >= 0 ? Math.floor(x.draws) : 0,
    nextAt: isNum(x.nextAt) ? x.nextAt : fresh.nextAt,
  };
}
function armCounts(x: unknown, content: Content): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  if (!isObj(x)) return out;
  const ix = idx(content);
  for (const [k, v] of Object.entries(x)) if (ix.dispatches.has(k) && Array.isArray(v)) out[k] = v.map((n) => (isNum(n) && n >= 0 ? Math.floor(n) : 0));
  return out;
}
function validMeta3(m: Record<string, unknown>, content: Content): Partial<MetaState> {
  const ix = idx(content);
  const d = isObj(m.dispatches) ? m.dispatches : {};
  const seen: Record<string, number> = {};
  if (isObj(d.seen)) for (const [k, v] of Object.entries(d.seen)) if (ix.dispatches.has(k) && isNum(v) && v > 0) seen[k] = Math.floor(v);
  const histories: MetaState['histories'] = {};
  if (isObj(m.histories)) {
    for (const [k, v] of Object.entries(m.histories)) {
      if (!ix.histories.has(k) || !isObj(v)) continue;
      histories[k] = { runs: isNum(v.runs) && v.runs >= 0 ? Math.floor(v.runs) : 0, cleared: v.cleared === true, best: isNum(v.best) ? v.best : null };
    }
  }
  const unlocks: Record<string, true> = {};
  if (isObj(m.unlocks)) {
    for (const [k, v] of Object.entries(m.unlocks)) {
      if (v !== true) continue;
      if (k.startsWith('cosmetic:') || k.startsWith('title:') || ix.commons.has(k) || ix.charters.has(k) || ix.upgrades.has(k) || ix.levers.has(k)) unlocks[k] = true;
    }
  }
  const returns: Record<string, FiledReturn> = {};
  if (isObj(m.returns)) {
    for (const [k, v] of Object.entries(m.returns)) {
      if (!isObj(v)) continue;
      const ok = validReturn({ id: k, figures: v.figures });
      if (!ok) continue;
      returns[k] = {
        figures: ok.figures, run: isNum(v.run) ? Math.floor(v.run) : 0, at: isNum(v.at) ? v.at : 0, published: v.published === true,
        template: isNum(v.template) && v.template >= 0 ? Math.floor(v.template) : null,
      };
    }
  }
  const archive: Record<string, number> = {};
  if (isObj(m.archive)) for (const [k, v] of Object.entries(m.archive)) if (ix.archive.has(k) && isNum(v)) archive[k] = v;
  const endings: Record<string, EndingRecord> = {};
  if (isObj(m.endings)) {
    for (const [k, v] of Object.entries(m.endings)) {
      if (isObj(v) && isNum(v.run) && isNum(v.runSeconds) && isNum(v.totalSeconds) && isNum(v.year)) endings[k] = { run: v.run, runSeconds: v.runSeconds, totalSeconds: v.totalSeconds, year: v.year };
    }
  }
  const milestones: MetaState['milestones'] = {};
  if (isObj(m.milestones)) {
    for (const [k, v] of Object.entries(m.milestones)) {
      if (Object.keys(milestones).length >= MILESTONES_MAX) break;
      if (isObj(v) && isNum(v.run) && isNum(v.at) && isNum(v.year)) milestones[k] = { run: v.run, at: v.at, year: v.year };
    }
  }
  return {
    dispatches: { seen, arms: armCounts(d.arms, content), playerArms: armCounts(d.playerArms, content) },
    history: typeof m.history === 'string' && ix.histories.has(m.history) ? m.history : null,
    histories, unlocks, returns, archive, flags: trueMap(m.flags), endings, milestones,
    bankedSeconds: Math.max(0, numOr(m.bankedSeconds, 0)),
  };
}

function validBudget(x: unknown, content: Content, s: SectorId): BudgetState | null {
  if (!isObj(x)) return null;
  const r0 = numOr(x.r0, NaN), since = numOr(x.since, NaN), drawnYear = numOr(x.drawnYear, NaN);
  if (!(r0 > 0) || !Number.isFinite(since) || !Number.isFinite(drawnYear)) return null;
  // w0 / p0 absent or invalid: the -1 markers, replaced with the loaded day (step 7)
  const b: BudgetState = {
    r0, since, drawnYear, w0: numOr(x.w0, -1), p0: numOr(x.p0, -1),
    pace: typeof x.pace === 'string' ? x.pace : pacesOf(content, s)[0].id,
  };
  const heldAt = numOr(x.heldAt, NaN);
  if (Number.isFinite(heldAt)) b.heldAt = heldAt;
  const clearAt = numOr(x.clearAt, NaN);
  if (Number.isFinite(clearAt)) b.clearAt = clearAt;
  if (x.account === 'full') b.account = 'full'; // M4: absent = 'own'
  return b;
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
    if (version < 3) raw = migrateV2(raw, content);
    if (version < 4) raw = migrateV3(raw, content);
    if (version < 5) raw = migrateV4(raw);
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
    const runs = (Array.isArray(merged0.runs) ? merged0.runs : []).filter(validSummary).slice(-RUN_HISTORY_MAX);
    const opening = validOpening(merged0.opening);
    const firstOpening = validOpening(merged0.firstOpening);
    const knowhow = levelMap(merged0.knowhow, (id) => ix.knowhow.get(id)?.maxLevel);
    const knowhowPeak = levelMap(merged0.knowhowPeak, (id) => ix.knowhow.get(id)?.maxLevel);
    for (const k in knowhow) knowhowPeak[k] = Math.max(knowhowPeak[k] ?? 0, knowhow[k]);
    const { opening: _o, firstOpening: _f, ...rest0 } = merged0;
    void _o; void _f;
    const meta: MetaState = {
      ...rest0,
      charter: typeof merged0.charter === 'string' && ix.charters.has(merged0.charter) ? merged0.charter : null,
      orders: mergeOrders(defaultOrders(content), merged0.orders, content),
      runs,
      ...(runs.length ? { lastRun: runs[runs.length - 1] } : merged0.lastRun && validSummary(merged0.lastRun) ? { lastRun: merged0.lastRun } : {}),
      ...(opening ? { opening } : {}),
      ...(firstOpening ? { firstOpening } : {}),
      eventSeq: Math.max(0, Math.floor(numOr(merged0.eventSeq, 0))),
      knowhowPeak,
      peakPopulationEver: Math.max(1, numOr(merged0.peakPopulationEver, 1)),
      knowhow,
      institutions,
      achievements: trueMap(merged0.achievements),
      steadySectors: trueMap(merged0.steadySectors),
      sectorsOpened: trueMap(merged0.sectorsOpened),
      backfiredSectors: trueMap(merged0.backfiredSectors),
      slots,
      loadout,
      // the unfolding: known feature ids with finite stamps; a save from before it (no features object) is grandfathered
      ...validMeta3(merged0 as unknown as Record<string, unknown>, content),
      world: validWorld(savedMeta.world, content), // M4
      features: isObj(savedMeta.features)
        ? Object.fromEntries(Object.entries(savedMeta.features).filter(([k, v]) => FEATURE_SET.has(k) && typeof v === 'number' && Number.isFinite(v)))
        : grandfathered(content, merged0, isObj(raw.flags) && raw.flags.revealed === true),
    };
    // M4: the merge base is built without the world (a capstone in meta would otherwise lend its built sector's fields
    // to a saved sector that lacks them); the saved run carries its own capstoned sectors
    const fresh = createState(content, { ...meta, world: undefined }, typeof raw.seed === 'number' ? raw.seed : 1);
    const merged = merge(fresh, { ...raw, meta: undefined }) as GameState;
    // only sectors known to content; sanitise budgets and decades
    const sectors: Record<SectorId, SectorState> = {};
    for (const s of ix.ids) {
      const es = merged.sectors[s];
      const decadesWithin = Array.isArray(es.decadesWithin) ? es.decadesWithin.filter((y) => typeof y === 'number' && Number.isFinite(y)) : [];
      const lean0 = Array.isArray(es.decadesLean) ? es.decadesLean : [];
      const apps: Record<string, AppState> = {};
      for (const [id, a] of Object.entries(isObj(es.apps) ? es.apps : {})) {
        if (!isObj(a)) continue;
        apps[id] = { ...(a as unknown as AppState), peakAdoption: clamp(numOr(a.peakAdoption, 0), 0, 1) };
      }
      const settled = es.open ? validSettled(es.settled) : null;
      const nSeams = content.sectors[s].resourceKind === 'stock' ? content.sectors[s].seams?.length ?? 0 : 0;
      const es4 = { ...es } as Record<string, unknown>;
      for (const k of M4_SECTOR_KEYS) delete es4[k];
      sectors[s] = {
        ...(es4 as unknown as SectorState),
        ...m4Sector(es as unknown as Record<string, unknown>, content),
        seamsSunk: clamp(Math.floor(numOr(es.seamsSunk, 0)), 0, nSeams),
        apps,
        budget: validBudget(es.budget, content, s),
        decadesWithin,
        decadesLean: decadesWithin.map((_, i) => lean0[i] === true),
        settled,
        dividends: Array.isArray(es.dividends) ? es.dividends.filter((d): d is string => typeof d === 'string' && ix.dividends.has(d)) : [],
      };
    }
    const levers: Record<string, LeverState> = {};
    for (const [id, ls] of Object.entries(isObj(merged.levers) ? merged.levers : {})) {
      if (!isObj(ls) || typeof ls.level !== 'number' || typeof ls.ref !== 'number') continue;
      const def = ix.levers.get(id);
      const level = clamp(Math.floor(fin(ls.level)), 0, def ? leverMaxLevel(def) : Infinity);
      const out: LeverState = { level, ref: level > 0 ? Math.max(0, fin(ls.ref)) : 0 };
      if (typeof ls.bite === 'number' && Number.isFinite(ls.bite) && ls.bite > 0) out.bite = clamp(ls.bite, 0, 1);
      if (ls.bitten === true) out.bitten = true;
      if (def && typeof ls.recycle === 'string' && recycleOptions(def).includes(ls.recycle as LeverRecycle)) out.recycle = ls.recycle as LeverRecycle;
      levers[id] = out;
    }
    // M2 offline fix: run.hindsightWithheld is optional (absent = 0); kept only when finite
    const { hindsightWithheld: withheld0, ...run } = merged.run;
    let s: GameState = {
      ...merged, version: SAVE_VERSION, sectors, levers, meta,
      upgrades: levelMap(merged.upgrades, (id) => { const u = ix.upgrades.get(id); return u ? upgradeMax(u) : undefined; }),
      run: {
        ...run, resourceUsed: amountMap(run.resourceUsed), steadySectors: trueMap(run.steadySectors),
        firstBackfires: trueMap(run.firstBackfires),
        decisionsByDecade: Array.isArray(run.decisionsByDecade) ? run.decisionsByDecade.map((x) => (isNum(x) && x >= 0 ? x : 0)) : [],
        automatedByDecade: Array.isArray(run.automatedByDecade) ? run.automatedByDecade.map((x) => (isNum(x) && x >= 0 ? x : 0)) : [],
        opening: validOpeningActions(run.opening),
        firstBudgetAt: isNum(run.firstBudgetAt) ? run.firstBudgetAt : null,
        ...(isNum(withheld0) ? { hindsightWithheld: withheld0 } : {}),
        // M3 (finish): run flags; a save without them is migrated from its news and events (the old reading)
        historyCleared: undefined, returnPublished: undefined,
        ...((run.historyCleared === undefined ? legacyHistoryCleared(merged.news, merged.events) : run.historyCleared === true) ? { historyCleared: true } : {}),
        ...((run.returnPublished === undefined ? Array.isArray(merged.news) && merged.news.some((n) => isObj(n) && n.key === 'return') : run.returnPublished === true) ? { returnPublished: true } : {}),
      },
      events: validEvents(merged.events, meta.eventSeq),
      pendingDividends: validPending(merged.pendingDividends, content),
      commons: {
        levels: levelMap(isObj(merged.commons) ? merged.commons.levels : {}, (id) => { const d = ix.commons.get(id); return d ? commonsMax(d) : undefined; }),
        fund: Math.max(0, numOr(isObj(merged.commons) ? merged.commons.fund : 0, 0)),
      },
      charterOffer: Array.isArray(merged.charterOffer) ? merged.charterOffer.filter((c): c is string => typeof c === 'string' && ix.charters.has(c)).slice(0, 2) : [],
      lastOffline: isObj(merged.lastOffline) ? merged.lastOffline : null,
      modifiers: validModifiers(merged.modifiers, content),
      dispatch: validDispatch(merged.dispatch, content, fresh.dispatch),
      ambientLast: amountMap(merged.ambientLast),
      orderLog: validOrderLog(merged.orderLog, content),
      historyLifted: merged.historyLifted === true,
      // M3 (finish): the headline rotation, kept only when well formed (absent = {})
      headlineUse: isObj(merged.headlineUse) ? amountMap(merged.headlineUse) : undefined,
      surveyReveal: validReveal(merged.surveyReveal, content), // M4
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
    // unknown Commons projects are dropped
    for (const k of Object.keys(s.commons.levels)) if (!ix.commons.has(k)) delete s.commons.levels[k];
    // v2 → v3 step 6: a fresh run between Reckonings gets the offer reckon() would have drawn
    if (version < 3) {
      s = { ...s, charterOffer: isFreshRun(s) && s.meta.reckonings >= 1 ? drawOffer(s, content, s.meta.lastRun?.charter) : [] };
    }
    // step 7 (and any budget without a valid w0/p0): the day drawn becomes the day loaded
    {
      const W = computeFlows(s, content).wellbeing;
      let s2: Record<SectorId, SectorState> | null = null;
      for (const id of ix.ids) {
        const b = s.sectors[id].budget;
        if (b && (b.w0 < 0 || b.p0 < 0)) {
          s2 ??= { ...s.sectors };
          s2[id] = { ...s2[id], budget: { ...b, w0: b.w0 < 0 ? W : b.w0, p0: b.p0 < 0 ? s.sectors[id].pressure : b.p0 } };
        }
      }
      if (s2) s = { ...s, sectors: s2 };
    }
    // M3 (v3 → v4) step 6: a won flag gets the ending record and the milestone, no event (nothing is replayed)
    if (version < 4) {
      const year = calendarYear(s, content);
      let meta = s.meta;
      if (s.flags.won && !meta.endings.steadyAll) meta = milestone({ ...meta, endings: { ...meta.endings, steadyAll: endingRecord(s, year) } }, 'won', null, year);
      // step 7: the next draw not at once; archive notes for what the loaded state owns or has seen, no event
      s = { ...s, meta, dispatch: { ...s.dispatch, nextAt: Math.max(dispatchFirstAt(content), s.time + dispatchGap(s.seed, 0, content)) } };
      const m2 = unlockNotes(s, content, s.meta);
      if (m2 !== s.meta) s = { ...s, meta: m2 };
    }
    // sanity: must be computable
    const d = computeFlows(s, content);
    if (!Number.isFinite(d.wellbeing) || !Number.isFinite(s.capital)) return null;
    return s;
  } catch {
    return null;
  }
}
