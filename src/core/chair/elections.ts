/**
 * M5 (Core B): the Chair's politics: Confidence (C and its target C*), the Parliament clock (the pledge offer, polling
 * day, Opposition and its repeal, the 'defeated' end), pledges and their binds, a lever's popularity term, and the two
 * actions choosePledges and campaign. Layer 6 (reads flows, conditions, effects, the chair index); every rule runs only
 * in a Ministry (GameState.chair) while feature 'chair' is on. The rules are the contract's (src/types.ts: ChairDef,
 * ChairState, PledgeDef, LeverDef.popularity); this module adds no numbers of its own.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { CONFIDENCE_MAX, YEARS_PER_SECOND } from '../../types';
import type { ChairDef, ChairState, Content, GameState, LeverDef, LeverRecycle, LeverState, NewsItem, PledgeDef, PledgeView, SectorId } from '../../types';
import { yearAt } from '../calendar';
import { evalCond } from '../conditions';
import { idx } from '../contentIndex';
import { modsOf } from '../effects';
import type { Mods } from '../effects';
import type { EvDraft } from '../events';
import { emit } from '../events';
import { computeFlows } from '../flows';
import type { Flows } from '../flows';
import { headline, newsWith } from '../headlines';
import { leverLevelDef, sectorLevers, NO_LEVERS } from '../levers';
import { featureOn } from '../features';
import { clamp, fin, mix32 } from '../util';
import { chairIdx } from './chairIndex';
import { effectiveLevel } from './acting';

/* ------------------------------------------------------------------ */
/* Gates and small helpers                                             */
/* ------------------------------------------------------------------ */

/** The Chair's rules run: a Ministry, ChairDef present, feature 'chair' on. */
export function chairOn(state: GameState, content: Content): boolean {
  return !!state.chair && !!content.chair && featureOn(content, state.meta, 'chair');
}
const clampC = (c: number): number => clamp(fin(c), 0, CONFIDENCE_MAX);
/** Model-year boundaries crossed by a step from t0 to t1. */
export const yearsCrossed = (t0: number, t1: number): number =>
  Math.max(0, Math.floor(t1 * YEARS_PER_SECOND + 1e-9) - Math.floor(t0 * YEARS_PER_SECOND + 1e-9));

/** Terms after the first: termYears + Σ termYearsAdd, floored at 1 (model years). */
export function termYearsOf(cd: ChairDef, mods: Mods): number {
  return Math.max(1, fin(cd.elections.termYears) + fin(mods.termYearsAdd));
}
/** Pledges in force, as defs (unknown ids skipped). */
function pledgesInForce(ch: ChairState, content: Content): PledgeDef[] {
  const px = chairIdx(content).pledges;
  const out: PledgeDef[] = [];
  for (const id of ch.pledges) { const p = px.get(id); if (p) out.push(p); }
  return out;
}

/* ------------------------------------------------------------------ */
/* Popularity, binds                                                   */
/* ------------------------------------------------------------------ */

/** A lever's term in C* now (LeverDef.popularity), or null without popularity or outside office. */
export function popularityTerm(state: GameState, content: Content, def: LeverDef, mods?: Mods): number | null {
  const pop = def.popularity;
  if (!pop || !state.chair) return null;
  const ls = state.levers[def.id];
  const L = effectiveLevel(state, def.id);
  if (!ls || !(L > 0) || ls.since === undefined) return 0;
  const yrs = fin(pop.years) * fin((mods ?? modsOf(state, content)).popularityYearsMul, 1);
  const held = Math.max(0, (state.time - ls.since) * YEARS_PER_SECOND);
  const k = yrs > 0 ? Math.min(1, held / yrs) : 1;
  return fin(L * (fin(pop.start) + (fin(pop.after) - fin(pop.start)) * k));
}

/** The tightest bind a pledge in force puts on lever `def` ({ name, max }), or null. */
export function bindOf(state: GameState, content: Content, def: LeverDef): { name: string; max: number } | null {
  const ch = state.chair;
  if (!ch || !ch.pledges.length) return null;
  let out: { name: string; max: number } | null = null;
  for (const p of pledgesInForce(ch, content)) {
    const b = p.binds;
    if (!b) continue;
    const hit = b.lever !== undefined ? b.lever === def.id
      : b.leverKind !== undefined ? b.leverKind === def.kind && (b.sector === undefined || b.sector === def.sector) : false;
    if (!hit) continue;
    const max = Math.max(0, Math.floor(fin(b.max)));
    if (out === null || max < out.max) out = { name: p.name, max };
  }
  return out;
}

/** setLever (and the Civil Service) refuse this raise: in Opposition, or above a pledge's bind. Lowering is never
 *  refused (callers only ask for raises). */
export function raiseRefused(state: GameState, content: Content, def: LeverDef, target: number): boolean {
  const ch = state.chair;
  if (!ch || !chairOn(state, content)) return false;
  if (ch.inOpposition) return true;
  const b = bindOf(state, content, def);
  return b !== null && target > b.max;
}

/* ------------------------------------------------------------------ */
/* Confidence                                                          */
/* ------------------------------------------------------------------ */

const recycleWeight = (r: LeverRecycle | null): number => (r === 'dividend' ? -0.5 : 1);

/** The parts of C* (for tests, the forecast and the balancer). */
export interface ConfidenceParts {
  base: number; wellbeing: number; price: number; jobs: number; commons: number; pledges: number; popularity: number;
  priceShare: number; jobShare: number; target: number;
}

/** C* on a state and its flows (ChairDef doc). */
export function confidenceParts(state: GameState, content: Content, fl: Flows): ConfidenceParts {
  const cd = content.chair!;
  const k = cd.confidence;
  const ch = state.chair!;
  const cx = chairIdx(content);
  const levs = sectorLevers(state, content);
  // price share and jobs over open chair sectors (capstoned sectors have no levy and are not chair sectors)
  let wSum = 0;
  for (const s of cx.chairSectors) if (state.sectors[s]?.open && fl.sectors[s]) wSum += Math.max(0, content.sectors[s].wellbeingWeight);
  let priceShare = 0, jobShare = 0;
  for (const s of cx.chairSectors) {
    const es = state.sectors[s];
    const f = fl.sectors[s];
    if (!es?.open || !f) continue;
    if (wSum > 0 && f.ps > 0) {
      const lev = fl.inputs[s]?.lev ?? levs[s] ?? NO_LEVERS;
      const part = f.dutyPart * recycleWeight(lev.dutyRecycle) + f.permitPart * recycleWeight(lev.capRecycle)
        + (f.chargePart ?? 0) * recycleWeight(lev.chargeRecycle);
      priceShare += (Math.max(0, content.sectors[s].wellbeingWeight) / wSum) * part / f.ps;
    }
    const peak = ch.rival.peakIncome[s] ?? 0;
    if (peak > 0 && !((ch.compensated[s] ?? -Infinity) > state.time)) jobShare += Math.max(0, 1 - f.income / peak);
  }
  let commonsLevels = 0;
  for (const id in state.commons?.levels ?? {}) commonsLevels += Math.max(0, state.commons.levels[id] ?? 0);
  let pledges = 0;
  for (const p of pledgesInForce(ch, content)) pledges += fin(p.confidence);
  let popularity = 0;
  const mods = modsOf(state, content);
  for (const def of content.levers ?? []) {
    if (!def.popularity || !((state.levers[def.id]?.level ?? 0) > 0)) continue;
    popularity += popularityTerm(state, content, def, mods) ?? 0;
  }
  const wellbeing = fin(k.perWellbeing) * (fl.wellbeing - content.global.wellbeingTarget);
  const price = fin(k.perPriceShare) * priceShare;
  const jobs = fin(k.perJobShare) * jobShare;
  const commons = fin(k.perCommonsLevel) * commonsLevels;
  const target = fin(k.base) + wellbeing + price + jobs + commons + pledges + popularity;
  return { base: fin(k.base), wellbeing: fin(wellbeing), price: fin(price), jobs: fin(jobs), commons: fin(commons), pledges, popularity,
    priceShare: fin(priceShare), jobShare: fin(jobShare), target: fin(target) };
}

/** Levers the rival is lobbying now (the L of the yearly update). */
const lobbyingCount = (ch: ChairState): number => { let n = 0; for (const id in ch.rival.lobbying) if (ch.rival.lobbying[id]) n++; return n; };

/** C projected to polling day if C* held (ChairView.forecast). */
export function forecastOf(state: GameState, content: Content, fl: Flows): number {
  const ch = state.chair!;
  const cd = content.chair!;
  const target = confidenceParts(state, content, fl).target;
  const n = yearsCrossed(state.time, Math.max(state.time, ch.parliament.pollAt));
  const r = clamp(fin(cd.confidence.relaxPerYear), 0, 1);
  let c = ch.confidence;
  const lob = fin(cd.confidence.lobbyPerYear) * lobbyingCount(ch);
  for (let i = 0; i < Math.min(n, 1000); i++) c = clampC(c + r * (target - c) - lob);
  return c;
}

/* ------------------------------------------------------------------ */
/* The step: Confidence, the offer, polling day                        */
/* ------------------------------------------------------------------ */

export interface ChairStepOut { state: GameState; items: NewsItem[]; ev: EvDraft[] }

/**
 * The Chair's per-step rules on `next` (the step's result so far), reading `prev` and its flows `fl` (the state at the
 * start of the step): crisis one-offs, the yearly Confidence update, the pledge offer (live steps only), polling day.
 * Returns `next` itself when nothing changed. Events and news are returned to the caller (step order: EventKind doc).
 */
export function stepElections(prev: GameState, next0: GameState, content: Content, fl: Flows, year: number, away: boolean, lite: boolean): ChairStepOut {
  const items: NewsItem[] = [];
  const ev: EvDraft[] = [];
  if (!next0.chair || !chairOn(prev, content) || fl.pending) return { state: next0, items, ev };
  const cd = content.chair!;
  const k = cd.confidence;
  let next = next0;
  let ch: ChairState = next0.chair;
  const touch = (): ChairState => (ch === next0.chair ? (ch = { ...ch }) : ch);
  const t0 = prev.time, t1 = next0.time;
  // 1. crisis one-offs (any crisis this step, any sector)
  let crises = 0;
  const seq0 = prev.meta.eventSeq ?? 0;
  for (const e of next0.events ?? []) if (e.seq > seq0 && e.kind === 'crisis') crises++;
  if (crises > 0 && fin(k.crisis) !== 0) touch().confidence = clampC(ch.confidence + crises * fin(k.crisis));
  // 2. the yearly update at each model-year boundary (tick and fastForward alike)
  const nY = yearsCrossed(t0, t1);
  if (nY > 0) {
    const target = confidenceParts(prev, content, fl).target;
    const r = clamp(fin(k.relaxPerYear), 0, 1);
    const lob = fin(k.lobbyPerYear) * lobbyingCount(ch);
    let c = ch.confidence;
    for (let i = 0; i < nY; i++) c = clampC(c + r * (target - c) - lob);
    if (c !== ch.confidence) touch().confidence = c;
  }
  const mods = modsOf(prev, content);
  const par = ch.parliament;
  // 3. the offer (never while away: it waits for a live step, as letters do)
  const notice = Math.max(0, fin(cd.elections.noticeYears)) / YEARS_PER_SECOND;
  if (!away && !lite && par.offer === null && t1 >= par.pollAt - notice - 1e-9 && t1 < par.pollAt - 1e-9) {
    const offer = drawOffer(prev, content, par.index, mods);
    touch().parliament = { ...par, offer };
    const pollYear = Math.floor(yearAt(prev, content, par.pollAt));
    items.push(headline(prev, content, 'electionCalled', t1, { year: pollYear, n: par.index }));
    ev.push({ kind: 'electionCalled', n: par.index });
  }
  // 4. polling day
  if (t1 >= ch.parliament.pollAt - 1e-9) {
    const r = pollingDay(prev, next, content, ch, mods, t1, year, items, ev);
    ch = r.ch;
    next = r.next;
  }
  if (ch === next0.chair && next === next0) return { state: next0, items, ev };
  return { state: { ...next, chair: ch }, items, ev };
}

/** The offer drawn for Parliament `index` (ChairState doc): eligible pledges, mix32 without replacement, content order. */
export function drawOffer(state: GameState, content: Content, index: number, mods: Mods): string[] {
  const cd = content.chair!;
  const E = (content.pledges ?? []).filter((p) => p && typeof p.id === 'string' && (!p.when || evalCond(state, content, p.when))).map((p) => p.id);
  const n = Math.max(0, Math.floor(fin(cd.elections.offer) + fin(mods.pledgeOfferAdd)));
  if (E.length <= n) return E;
  const rem = E.slice();
  const drawn = new Set<string>();
  for (let kk = 0; kk < n; kk++) {
    const i = (mix32((state.seed >>> 0) ^ Math.imul(index + 1, 0x9E3779B1) ^ kk) >>> 0) % rem.length;
    drawn.add(rem[i]);
    rem.splice(i, 1);
  }
  return E.filter((id) => drawn.has(id));
}

function pollingDay(prev: GameState, next0: GameState, content: Content, ch0: ChairState, mods: Mods, t1: number, year: number, items: NewsItem[], ev: EvDraft[]):
  { ch: ChairState; next: GameState } {
  const cd = content.chair!;
  const px = chairIdx(content).pledges;
  const keep = Math.max(0, Math.floor(fin(cd.elections.keep)));
  const par = ch0.parliament;
  // (1) the pledges come into force
  const pledges = (par.chosen ?? par.offer?.slice(0, keep) ?? []).filter((id) => px.has(id));
  let meta = next0.meta;
  if (pledges.length) {
    const kept = { ...(meta.pledgesKept ?? {}) };
    for (const id of pledges) kept[id] = true;
    meta = { ...meta, pledgesKept: kept };
  }
  // (2) the poll
  let bonus = 0;
  for (const id of pledges) { const p = px.get(id)!; bonus += fin(p.atPoll ?? p.confidence); }
  const won = ch0.confidence + bonus >= fin(cd.confidence.winAt);
  const C = clampC(ch0.confidence + bonus);
  let ch: ChairState = { ...ch0, confidence: C, pledges };
  let levers = next0.levers;
  let mandate = next0.mandate;
  const label = String(Math.round(C));
  if (won) {
    ch.electionsWon = ch0.electionsWon + 1;
    ch.lostInARow = 0;
    ch.inOpposition = false;
    mandate = fin(mandate + Math.max(0, fin(cd.elections.winMandate)));
    items.push(headline(prev, content, 'electionWon', t1, { year, n: Math.round(C) }));
    ev.push({ kind: 'electionWon', n: par.index, label });
  } else {
    ch.lostInARow = ch0.lostInARow + 1;
    ch.electionsLost = (ch0.electionsLost ?? 0) + 1;
    ch.inOpposition = true;
    items.push(headline(prev, content, 'electionLost', t1, { year, n: Math.round(C) }));
    ev.push({ kind: 'electionLost', n: par.index, label });
    // (3) the incoming government's repeal (unless a Ratchet Clause stands)
    if (!mods.ratchet) {
      const per = Math.max(0, Math.floor(fin(cd.opposition.repealPerParliament)));
      const r = repeal(next0, content, ch, levers, per, par.index);
      levers = r.levers;
      if (r.repealed.length) {
        ch.repealed = ch0.repealed.concat(r.repealed.map((x) => ({ lever: x.lever, parliament: par.index })));
        for (const x of r.repealed) {
          const def = idx(content).levers.get(x.lever)!;
          items.push(headline(prev, content, 'leverRepealed', t1, { year, name: def.name }, def.sector));
          ev.push({ kind: 'leverRepealed', sector: def.sector, id: def.id, n: x.level, by: 'opposition' });
        }
      }
    }
  }
  // (4) defeated, or (5) the next Parliament
  if (ch.lostInARow >= Math.max(1, Math.floor(fin(cd.opposition.lostInARowEnds, 2)))) {
    items.push(headline(prev, content, 'ministryDefeated', t1, { year }));
    ev.push({ kind: 'ministryDefeated' });
    ch.parliament = { ...par, offer: par.offer, chosen: par.chosen };
  } else {
    const term = termYearsOf(cd, mods);
    ch.parliament = { index: par.index + 1, start: t1, pollAt: t1 + term / YEARS_PER_SECOND, offer: null, chosen: null };
  }
  return { ch, next: { ...next0, levers, mandate, meta } };
}

/** The repeal: `per` levels, one at a time, of the chair-sector lever at level ≥ 1 with the largest comply cost. */
function repeal(state: GameState, content: Content, ch: ChairState, levers0: Record<string, LeverState>, per: number, parliament: number):
  { levers: Record<string, LeverState>; repealed: { lever: string; level: number }[] } {
  void parliament;
  const cx = chairIdx(content);
  let levers = levers0;
  const out: { lever: string; level: number }[] = [];
  for (let i = 0; i < per; i++) {
    let best: LeverDef | null = null, bestCost = -Infinity;
    for (const def of content.levers ?? []) {
      if (!cx.chairSet.has(def.sector) || !((levers[def.id]?.level ?? 0) >= 1)) continue;
      const cost = fin(ch.rival.answers[def.id]?.comply ?? 0);
      if (cost > bestCost) { bestCost = cost; best = def; }
    }
    if (!best) break;
    const ls = levers[best.id];
    const lvl = ls.level - 1;
    const nl: LeverState = { ...ls, level: lvl, ref: lvl > 0 ? ls.ref : 0 };
    if (lvl === 0) delete nl.since;
    if (levers === levers0) levers = { ...levers };
    levers[best.id] = nl;
    out.push({ lever: best.id, level: lvl });
  }
  void state;
  return { levers, repealed: out };
}

/** The Reckoning 'defeated' is pending (ChairDef.opposition.lostInARowEnds lost in a row). */
export function defeatedPending(state: GameState, content: Content): boolean {
  const ch = state.chair;
  const cd = content.chair;
  return !!ch && !!cd && ch.lostInARow >= Math.max(1, Math.floor(fin(cd.opposition.lostInARowEnds, 2)));
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/** ModelApi.choosePledges (a decision; asDecision in index.ts). */
export function choosePledges(state: GameState, content: Content, ids: string[]): GameState {
  const ch = state.chair;
  if (!ch || !chairOn(state, content) || !Array.isArray(ids) || computeFlows(state, content).pending) return state;
  const par = ch.parliament;
  if (par.offer === null || state.time >= par.pollAt) return state;
  const keep = Math.max(0, Math.floor(fin(content.chair!.elections.keep)));
  const set = new Set(ids);
  if (set.size !== ids.length || ids.length !== Math.min(keep, par.offer.length) || !ids.every((id) => par.offer!.includes(id))) return state;
  const chosen = par.offer.filter((id) => set.has(id)); // content order (the offer is in content order)
  if (par.chosen && par.chosen.length === chosen.length && par.chosen.every((id, i) => id === chosen[i])) return state;
  return { ...state, chair: { ...ch, parliament: { ...par, chosen } } };
}

/** ModelApi.campaign (a decision). */
export function campaign(state: GameState, content: Content, mandate: number): GameState {
  const ch = state.chair;
  if (!ch || !chairOn(state, content) || !ch.inOpposition || !Number.isFinite(mandate) || !(mandate > 0)) return state;
  if (!(state.mandate >= mandate) || computeFlows(state, content).pending) return state;
  const c = clampC(ch.confidence + fin(content.chair!.confidence.campaignPerMandate) * mandate);
  return { ...state, mandate: fin(state.mandate - mandate), chair: { ...ch, confidence: c } };
}

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */

function bindWords(content: Content, p: PledgeDef): string | null {
  const b = p.binds;
  if (!b) return null;
  const ix = idx(content);
  const max = Math.max(0, Math.floor(fin(b.max)));
  const what = b.lever !== undefined ? ix.levers.get(b.lever)?.name ?? b.lever
    : `${b.leverKind ?? 'levers'}${b.sector !== undefined ? ` (${content.sectors[b.sector]?.name ?? b.sector})` : ''}`;
  const ld = b.lever !== undefined ? ix.levers.get(b.lever) : undefined;
  const lvl = ld ? leverLevelDef(ld, max)?.label : undefined;
  return max === 0 ? `No rise in ${what}` : `${what} at most ${lvl ?? `level ${max}`}`;
}
export function pledgeView(content: Content, p: PledgeDef): PledgeView {
  return { id: p.id, name: p.name, blurb: p.blurb, confidence: fin(p.confidence), atPoll: fin(p.atPoll ?? p.confidence), binds: bindWords(content, p) };
}
export function pledgeViews(content: Content, ids: string[] | null): PledgeView[] | null {
  if (ids === null) return null;
  const px = chairIdx(content).pledges;
  const out: PledgeView[] = [];
  for (const id of ids) { const p = px.get(id); if (p) out.push(pledgeView(content, p)); }
  return out;
}
/** Chair sectors open now. */
export function openChairSectors(state: GameState, content: Content): SectorId[] {
  return chairIdx(content).chairSectors.filter((s) => !!state.sectors[s]?.open);
}

/** The step's one line for the Chair (step.ts): stepElections with its news and events applied. */
export function stepChair(prev: GameState, next: GameState, content: Content, fl: Flows, year: number, lite: boolean, away: boolean): GameState {
  const r = stepElections(prev, next, content, fl, year, away, lite);
  let out = r.state;
  if (r.items.length) out = { ...out, ...newsWith(out, content, r.items) };
  if (r.ev.length) out = emit(out, r.ev, out.time, year);
  return out;
}
