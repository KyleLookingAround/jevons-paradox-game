/**
 * Conditions (Cond): stat values, evaluation, and the checklist labels the UI shows.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Cond, CondCheck, Content, FeatureId, GameState, SectorId, StatKey } from '../types';
import { featureOn } from './features';
import { FEATURE_IDS } from '../types';
const FEATURE_SET: ReadonlySet<string> = new Set(FEATURE_IDS);
import { calendarYear } from './calendar';
import { idx } from './contentIndex';
import { computeFlows, instruments, reserveFractionOf, steadyView } from './flows';
import { budgetROf, isWithin } from './steady';
import { hoursPerHead, sprawlOf } from './travel';
import { clamp, isObj } from './util';

/* ------------------------------------------------------------------ */
/* Conditions                                                          */
/* ------------------------------------------------------------------ */

/** The value a stat leaf reads (null when the scope is closed, absent or the value is null). */
export function statValue(state: GameState, content: Content, cond: { stat: StatKey; sector?: SectorId; app?: string }): number | null {
  const fl = computeFlows(state, content);
  switch (cond.stat) {
    case 'time': return state.time;
    case 'year': return calendarYear(state, content);
    case 'wellbeing': return fl.wellbeing;
    case 'population': return state.population;
    case 'capital': return state.capital;
    case 'mandate': return state.mandate;
    case 'reckonings': return state.meta.reckonings;
    case 'steadyYearsAll': return state.steadyYearsAll;
    case 'clicks': return state.run.clicks;
    case 'decisions': return state.run.decisions ?? 0;
    case 'automated': return state.run.automated ?? 0;
    case 'commonsLevels': { let n = 0; for (const k in state.commons?.levels ?? {}) n += state.commons.levels[k] ?? 0; return n; }
    case 'sectorsSettled': return idx(content).ids.filter((x) => state.sectors[x]?.open && state.sectors[x].settled).length;
    case 'leanDecades': if (cond.sector === undefined) return state.run.leanDecades ?? 0; break;
    case 'fullDecades': if (cond.sector === undefined) return Math.max(0, state.run.budgetDecades - (state.run.leanDecades ?? 0)); break;
    /* M3, global */
    case 'steadySectors': { let n = 0; for (const k in state.run.steadySectors) if (state.run.steadySectors[k] === true) n++; return n; }
    case 'dispatchesAnswered': return state.run.dispatchesAnswered ?? 0;
    case 'historiesCleared': { let n = 0; const h = state.meta.histories ?? {}; for (const k in h) if (h[k]?.cleared) n++; return n; }
    case 'totalHours': return state.meta.totalSeconds / 3600;
    case 'bankedSeconds': return state.meta.bankedSeconds ?? 0;
    case 'adoption': case 'appDemand': {
      const loc = cond.app ? idx(content).apps.get(cond.app) : undefined;
      const f = loc ? fl.sectors[loc.sector] : undefined;
      if (!loc || !f || !state.sectors[loc.sector]?.open) return null;
      const d = f.appD[loc.idx] ?? 0, sat = f.appSat[loc.idx] ?? 0;
      return cond.stat === 'appDemand' ? d : sat > 0 ? clamp(d / sat, 0, 1) : 0;
    }
    default: break;
  }
  const s = cond.sector;
  const def = s ? content.sectors?.[s] : undefined;
  const es = s ? state.sectors[s] : undefined;
  const f = s ? fl.sectors[s] : undefined;
  if (!s || !def || !es?.open || !f) return null;
  switch (cond.stat) {
    case 'etaFold': return f.etaFold;
    case 'rFold': return es.baseR > 0 ? f.R / es.baseR : 1;
    case 'frontierFold': return instruments(state, content, fl, s).frontierFold;
    case 'peakRFold': return es.baseR > 0 ? es.peakR / es.baseR : 1;
    case 'rebound': return instruments(state, content, fl, s).rebound;
    case 'resourceUse': return f.R;
    case 'demand': return f.D;
    case 'servicePrice': return f.ps;
    case 'serviceDelivered': return es.serviceDelivered;
    case 'reserveFraction': return reserveFractionOf(def, es, f);
    case 'pressureFraction': return def.collapseAt > 0 ? Math.max(0, es.pressure / def.collapseAt) : 0;
    case 'crises': return es.crisesFired;
    case 'steadyYears': return es.steadyYears;
    case 'budgetDecades': return es.decadesWithin.length;
    case 'withinBudget': return isWithin(f.R, budgetROf(es, def, content, state.time)) ? 1 : 0;
    case 'appsFounded': return def.applications.filter((a) => es.apps[a.id]?.founded).length;
    case 'settled': return es.settled ? 1 : 0;
    case 'clear': return steadyView(state, content, fl, s).clear ? 1 : 0;
    case 'clearYears': return es.clearYears ?? 0;
    case 'leanDecades': return (es.decadesLean ?? []).filter((x) => x).length;
    case 'fullDecades': return es.decadesWithin.length - (es.decadesLean ?? []).filter((x) => x).length;
    /* M3, sector */
    case 'seamsSunk': return es.seamsSunk ?? 0;
    case 'loadFactor': {
      if (!def.load) return null;
      if (es.settled) return es.settled.load ? es.settled.load.factor : null;
      return f.load ? f.load.factor : null;
    }
    case 'travelHours': case 'sprawl': {
      if (!def.travel) return null;
      if (es.settled) { const t = es.settled.travel; return t ? (cond.stat === 'sprawl' ? t.sprawl : t.hoursPerHead) : null; }
      if (cond.stat === 'sprawl') return sprawlOf(def, es);
      return f.travel ? hoursPerHead(def, f.D, state.population, f.travel.v) : null;
    }
    case 'bite': {
      let b = 0;
      for (const l of idx(content).leversBySector[s] ?? []) b = Math.max(b, state.levers[l.id]?.bite ?? 0);
      return b;
    }
    default: return null;
  }
}

function ownsId(state: GameState, content: Content, id: string): boolean {
  const ix = idx(content);
  if (ix.upgrades.has(id)) return (state.upgrades[id] ?? 0) >= 1;
  const loc = ix.apps.get(id);
  if (loc) return !!state.sectors[loc.sector]?.apps[id]?.founded;
  if (ix.levers.has(id)) return (state.levers[id]?.level ?? 0) >= 1;
  if (ix.institutions.has(id)) return (state.meta.institutions[id] ?? 0) >= 1;
  if (ix.knowhow.has(id)) return (state.meta.knowhow[id] ?? 0) >= 1;
  if (ix.achievements.has(id)) return state.meta.achievements[id] === true;
  if (ix.commons.has(id)) return (state.commons?.levels?.[id] ?? 0) >= 1;
  if (ix.charters.has(id)) return state.meta.charter === id;
  if (ix.dividends.has(id)) return ix.ids.some((s) => (state.sectors[s]?.dividends ?? []).includes(id));
  if (ix.pos.has(id)) return state.meta.sectorsOpened?.[id] === true;
  /* M3 */
  const seam = ix.seams.get(id);
  if (seam) return (state.sectors[seam.sector]?.seamsSunk ?? 0) > seam.idx;
  if (ix.histories.has(id)) return state.meta.histories?.[id]?.cleared === true;
  if (ix.archive.has(id)) return state.meta.archive?.[id] !== undefined;
  return false;
}

/** M3: { returned } leaf. */
function returnedLeaf(state: GameState, c: Record<string, unknown>): boolean {
  if (typeof c.returned !== 'string') return false;
  const r = state.meta.returns?.[c.returned];
  if (!r) return false;
  if (c.figure === undefined) return true;
  if (typeof c.figure !== 'string' || typeof c.value !== 'number') return false;
  const v = r.figures[c.figure];
  return typeof v === 'number' && cmp(v, c.op as string, c.value);
}
/** M3: { answered } leaf. */
function answeredLeaf(state: GameState, c: Record<string, unknown>): boolean {
  if (typeof c.answered !== 'string') return false;
  const id = c.answered;
  const arm = typeof c.arm === 'number' ? c.arm : undefined;
  const byPlayer = c.by === 'player';
  const inRun = (state.dispatch?.answered ?? []).some((a) => a.id === id && (arm === undefined || a.arm === arm) && (!byPlayer || a.by === 'player'));
  if (inRun || c.run === true) return inRun;
  const counts = (byPlayer ? state.meta.dispatches?.playerArms : state.meta.dispatches?.arms)?.[id];
  if (!counts) return false;
  return arm === undefined ? counts.some((x) => x > 0) : (counts[arm] ?? 0) > 0;
}

function cmp(v: number, op: string, x: number): boolean {
  switch (op) {
    case '<': return v < x;
    case '<=': return v <= x;
    case '>': return v > x;
    case '>=': return v >= x;
    default: return false;
  }
}

/** Evaluate a Cond against a state (pure; the same flows as derive). Unknown stats and leaf shapes are false. */
export function evalCond(state: GameState, content: Content, cond: Cond): boolean {
  if (!isObj(cond)) return false;
  const c = cond as Record<string, unknown>;
  if ('stat' in c) {
    const v = statValue(state, content, cond as { stat: StatKey; sector?: SectorId; app?: string });
    return v !== null && typeof c.value === 'number' && cmp(v, c.op as string, c.value);
  }
  if ('owns' in c) return typeof c.owns === 'string' && ownsId(state, content, c.owns);
  if ('flag' in c) return (state.flags as unknown as Record<string, unknown>)[c.flag as string] === true
    || (typeof c.flag === 'string' && state.meta.flags?.[c.flag] === true);
  if ('feature' in c) return typeof c.feature === 'string' && FEATURE_SET.has(c.feature) && featureOn(content, state.meta, c.feature as FeatureId);
  if ('returned' in c) return returnedLeaf(state, c);
  if ('answered' in c) return answeredLeaf(state, c);
  if ('all' in c) return Array.isArray(c.all) && (c.all as Cond[]).every((x) => evalCond(state, content, x));
  if ('any' in c) return Array.isArray(c.any) && (c.any as Cond[]).some((x) => evalCond(state, content, x));
  if ('not' in c) return isObj(c.not) && !evalCond(state, content, c.not as Cond);
  return false;
}

const STAT_WORDS: Record<StatKey, string> = {
  time: 'time played (s)', year: 'year', wellbeing: 'wellbeing', population: 'population', capital: 'capital',
  mandate: 'Mandate', reckonings: 'Reckonings', steadyYearsAll: 'years of steady state', clicks: 'clicks',
  etaFold: 'efficiency gain', rFold: 'resource use fold', frontierFold: 'frontier growth', peakRFold: 'peak resource use fold',
  rebound: 'rebound', resourceUse: 'resource use', demand: 'demand', servicePrice: 'service price',
  serviceDelivered: 'service delivered', reserveFraction: 'reserve left', pressureFraction: 'pressure',
  crises: 'crises', steadyYears: 'years within budget', budgetDecades: 'decades within budget',
  withinBudget: 'within budget', appsFounded: 'applications founded', adoption: 'adoption', appDemand: 'demand',
  decisions: 'decisions', automated: 'actions by standing orders', commonsLevels: 'Commons built',
  sectorsSettled: 'industries settled', leanDecades: 'lean decades', fullDecades: 'full decades', settled: 'settled',
  clear: 'clear skies', clearYears: 'years of clear skies',
  steadySectors: 'industries at Steady State', dispatchesAnswered: 'letters answered', historiesCleared: 'histories written',
  totalHours: 'hours played', bankedSeconds: 'time banked (s)', seamsSunk: 'seams sunk', loadFactor: 'load factor',
  travelHours: 'hours a day travelling', sprawl: 'sprawl', bite: 'side effect',
  openFor: 'time open (s)', stockFraction: 'stock left', reportedStock: 'catch per trip', foreignShare: 'foreign share',
  scarYears: 'years of scar', surveyed: 'surveyed', budgetHeadroom: 'headroom under the line', feedFactor: 'input cost factor',
  arrears: 'in arrears', capstoned: 'industries settled for good',
};
const OP_SYM: Record<string, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' };
export function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return String(x);
  const a = Math.abs(x);
  const trim = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : String(Math.round(v * 10) / 10));
  if (a >= 1e9) return `${trim(x / 1e9)}G`;
  if (a >= 1e6) return `${trim(x / 1e6)}M`;
  if (a >= 1e3) return `${trim(x / 1e3)}k`;
  return String(Math.round(x * 1000) / 1000);
}

function condLabel(content: Content, cond: Cond): string {
  if (cond.label) return cond.label;
  const ix = idx(content);
  const c = cond as Record<string, unknown>;
  if ('stat' in c) {
    const stat = c.stat as StatKey;
    const scope = typeof c.app === 'string' ? ix.names.get(c.app) ?? c.app
      : typeof c.sector === 'string' ? ix.names.get(c.sector) ?? c.sector : '';
    return `${scope ? `${scope} ` : ''}${STAT_WORDS[stat] ?? String(stat)} ${OP_SYM[c.op as string] ?? c.op} ${fmtNum(c.value as number)}`;
  }
  if ('owns' in c) return `Own ${ix.names.get(c.owns as string) ?? c.owns}`;
  if ('flag' in c) return c.flag === 'revealed' ? 'The rebound revealed' : c.flag === 'won' ? 'Steady State won' : `${c.flag}`;
  if ('feature' in c) return content.features?.[c.feature as FeatureId]?.name ?? `${c.feature} arrived`;
  if ('returned' in c) return 'A household return on file';
  if ('answered' in c) return `Answer ${ix.names.get(c.answered as string) ?? c.answered}`;
  if ('all' in c) return 'All of these';
  if ('any' in c) return 'Any of these';
  if ('not' in c && isObj(c.not)) return `Not: ${condLabel(content, c.not as Cond)}`;
  return 'Unknown condition';
}

export function condCheck(state: GameState, content: Content, cond: Cond): CondCheck {
  const met = evalCond(state, content, cond);
  let progress: number | null;
  const c = cond as Record<string, unknown>;
  if ('stat' in c) {
    const v = statValue(state, content, cond as { stat: StatKey; sector?: SectorId; app?: string });
    const x = c.value as number;
    if (met) progress = 1;
    else if (v === null || !Number.isFinite(v)) progress = 0;
    else if (c.op === '>' || c.op === '>=') progress = x > 0 ? clamp(v / x, 0, 1) : 0;
    else progress = v > 0 ? clamp(x / v, 0, 1) : 0;
  } else if ('all' in c || 'any' in c || 'not' in c) progress = null;
  else progress = met ? 1 : 0;
  return { label: condLabel(content, cond), met, progress };
}
