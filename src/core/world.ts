/**
 * M4: the per-step rules of the M4 mechanics, each called from step.ts in one line: the shared reserve (an owner drained
 * by its drawers; drawers' gauges mirror it), the renewable stock's step (renewable.ts arithmetic, the crossing, the
 * scar and its healing, the foreign fleets' headline, the lowest stock), a depletion sector's derived pressure, the
 * capstone's pressure in and after arrears, arrears entered and cleared, the act's ending record and capstone, and,
 * after the M3 rules, the surveys (the Board's first survey and its reveal, 'surveyed', SectorState.lastSurvey), the
 * order book's peaks at each history sample, and the M4 news and events in the contract's order.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { ARREARS_COLLAPSE_HOLD, FOREIGN_ANNOUNCE_AT, SURVEY_SMALL_GAP, YEARS_PER_SECOND } from '../types';
import type { ActDef, Content, GameState, MetaState, NewsItem, SectorId, SectorState } from '../types';
import { HISTORY_EVERY } from './constants';
import { idx } from './contentIndex';
import { absorptionOf } from './effects';
import type { Mods } from './effects';
import type { EvDraft } from './events';
import { pushEvents } from './events';
import { computeFlows, depletionSink } from './flows';
import type { Flows } from './flows';
import { endingRecord } from './ending';
import { capstoneRecords } from './acts';
import { fillText, headline, newsWith, textItem } from './headlines';
import type { HeadlineCtx } from './headlines';
import { sectorLevers, NO_LEVERS } from './levers';
import type { SectorLevers } from './levers';
import { milestone, milestones } from './milestones';
import { evalCond } from './conditions';
import { addModifier } from './modifiers';
import { rAddedOf } from './orderBook';
import { foreignCatch, growthOf, renewableOf, reportedOf, scarMulOf, sizeOf, startStockOf, stepStock } from './renewable';
import { clearPOf } from './steady';
import type { SectorFlow } from './solver';
import { clamp, fin } from './util';

/** News, events and meta.world changes the M4 rules gather during a step (emitted after the M3 ones). */
export interface M4Step {
  items: NewsItem[];
  /** Events by kind group, each in sectorOrder: thresholdCrossed, scarHealed, arrears / arrearsCleared. */
  evThreshold: EvDraft[]; evScar: EvDraft[]; evArrears: EvDraft[];
  /** The new meta.world, or null when unchanged. */
  world: MetaState['world'] | null;
}
export const newM4Step = (): M4Step => ({ items: [], evThreshold: [], evScar: [], evArrears: [], world: null });

const worldOf = (state: GameState, w4: M4Step): NonNullable<MetaState['world']> => w4.world ?? state.meta.world ?? {};

/* ---- M4 (amend): levers that wait on a condition ---- */

/** LeverDef.when: the levers whose condition holds now are marked seen for the rest of the run (the map is written
 *  copy-on-write: the same reference when nothing changes). */
export function seenLevers(state: GameState, content: Content, levers: GameState['levers']): GameState['levers'] {
  let out = levers;
  for (const l of idx(content).whenLevers) {
    const ls = out[l.id] ?? { level: 0, ref: 0 };
    if (ls.seen || !evalCond(state, content, l.when!)) continue;
    if (out === levers) out = { ...levers };
    out[l.id] = { ...ls, seen: true };
  }
  return out;
}

/* ---- the shared reserve ---- */

/** Σ over the open, unsettled drawers of owner o: R × (1 − circularity), per second. */
export function drainOfDrawers(state: GameState, content: Content, fl: Flows, levs: Record<string, SectorLevers>, o: SectorId): number {
  let r = 0;
  for (const d of idx(content).drawers.get(o) ?? []) {
    const es = state.sectors[d];
    const f = fl.sectors[d];
    if (!es?.open || es.settled || !f) continue;
    r += f.R * (1 - (levs[d] ?? NO_LEVERS).circ);
  }
  return r;
}
/** Drawers' reserve and reserveMax follow their owner's (the map is the step's own copy). */
export function mirrorDrawers(content: Content, sectors: Record<SectorId, SectorState>): void {
  for (const [d, o] of idx(content).ownerOf) {
    const es = sectors[d], eo = sectors[o];
    if (!es || !eo || (es.reserve === eo.reserve && es.reserveMax === eo.reserveMax)) continue;
    sectors[d] = { ...es, reserve: eo.reserve, reserveMax: eo.reserveMax };
  }
}

/* ---- the renewable stock ---- */

/** P of a depletion sector: (1 − Q/K) × collapseAt. */
export const depletionP = (def: Content['sectors'][string], Q: number): number => clamp(1 - Q / sizeOf(def), 0, 1) * def.collapseAt;

/**
 * An open, unsettled renewable sector's stock over the step (es: the step's draft of it): Q stepped, the lowest stock,
 * the crossing (crossed, the scar, 'thresholdCrossed' and 'threshold'), the scar ticking and healing, the foreign
 * fleets' headline. Returns the draft with reserve, reserveMax, minStock, crossed, foreignAnnounced set.
 */
export function stepRenewableSector(state: GameState, content: Content, s: SectorId, es: SectorState, f: SectorFlow, lev: SectorLevers, mods: Mods, dt: number, time: number, hc: HeadlineCtx, w4: M4Step): SectorState {
  const def = content.sectors[s];
  const rn = renewableOf(def);
  const es0 = state.sectors[s];
  if (!rn) return es;
  const K = sizeOf(def);
  const sMul = scarMulOf(rn, state.meta, s);
  const share = f.ren ? f.ren.share : 0;
  const Q = stepStock(rn, K, es0.reserve, f.R, lev.circ, f.ren ? f.ren.rForeign : foreignCatch(f.R, share), sMul, dt); // M4 (finish): with the room
  const out: SectorState = { ...es, reserve: Q, reserveMax: K, minStock: Math.min(es0.minStock ?? es0.reserve / K, Q / K) };
  // the scar ticks while open and unsettled; healed at 0
  const sc = worldOf(state, w4).scars?.[s];
  if (sc) {
    const left = sc.yearsLeft - dt * YEARS_PER_SECOND;
    const scars = { ...(worldOf(state, w4).scars ?? {}) };
    if (left <= 1e-12) {
      delete scars[s];
      w4.items.push(headline(state, content, 'scarHealed', time, hc, s));
      w4.evScar.push({ kind: 'scarHealed', sector: s });
    } else scars[s] = { ...sc, yearsLeft: left };
    w4.world = { ...worldOf(state, w4), scars };
  }
  // the crossing: once a run, below θK
  if (Q < rn.threshold * K && !es0.crossed) {
    out.crossed = true;
    const years = Math.max(0, fin(rn.scar?.years ?? 0));
    const cur = worldOf(state, w4).scars?.[s];
    if (years > 0 && (!cur || cur.yearsLeft < years)) {
      w4.world = { ...worldOf(state, w4), scars: { ...(worldOf(state, w4).scars ?? {}), [s]: { yearsLeft: years, since: state.meta.totalSeconds + dt } } };
    }
    w4.items.push(headline(state, content, 'threshold', time, hc, s));
    w4.evThreshold.push({ kind: 'thresholdCrossed', sector: s });
  }
  // the foreign fleets' headline, once a run (no event)
  if (rn.foreign && !es0.foreignAnnounced && share >= (rn.foreign.announceAt ?? FOREIGN_ANNOUNCE_AT)) {
    out.foreignAnnounced = true;
    w4.items.push(headline(state, content, 'foreignFleets', time, hc, s));
  }
  void mods;
  return out;
}

/* ---- the capstone: pressure in and after arrears ---- */

/**
 * A capstoned sector over the step (sectors[s] already carries the step's clock): in arrears its pressure is stepped
 * with the arrears R (a depletion stock with it instead) and held below ARREARS_COLLAPSE_HOLD × collapseAt, crises fire
 * as usual; out of arrears it returns towards the recorded P (resp. the start stock) and is frozen there. Returns the
 * number of crises fired (the step's population loss and crisis Mandate).
 */
export function stepCapstone(state: GameState, content: Content, s: SectorId, f: SectorFlow, mods: Mods, sectors: Record<SectorId, SectorState>, time: number, hc: HeadlineCtx, items: NewsItem[], ev: EvDraft[], dt: number): number {
  const es0 = state.sectors[s];
  const st = es0.settled!;
  const def = content.sectors[s];
  const rn = renewableOf(def);
  const hold = ARREARS_COLLAPSE_HOLD * def.collapseAt;
  let P = es0.pressure, Q = es0.reserve;
  if (rn && def.pressureSource === 'depletion') {
    const K = sizeOf(def);
    const start = startStockOf(def, state.meta);
    if (!es0.arrears && Q >= start - 1e-12) return 0;
    const sMul = scarMulOf(rn, state.meta, s);
    const q1 = stepStock(rn, K, Q, f.R, 0, 0, sMul, dt);
    Q = es0.arrears ? q1 : Math.min(start, Math.max(Q, q1));
    P = Math.min(hold, depletionP(def, Q));
  } else {
    const ab = absorptionOf(def, mods);
    if (es0.arrears) {
      const intensity = def.pressureIntensity * (mods.intensityMul[s] ?? 1);
      const inflow = (def.pressureSource === 'service' ? f.D : f.R) * intensity;
      P = Math.min(hold, Math.max(0, fin(P * Math.exp(-ab * dt) + inflow * dt)));
    } else if (P > st.P + 1e-12) P = Math.max(st.P, fin(P * Math.exp(-ab * dt)));
    else return 0;
  }
  let n = 0;
  let crises = es0.crisesFired;
  while (crises < def.crisisAt.length && def.collapseAt > 0 && P >= def.crisisAt[crises] * def.collapseAt) {
    crises++; n++;
    items.push(headline(state, content, 'crisis', time, { ...hc, n: crises }, s));
    ev.push({ kind: 'crisis', sector: s, n: crises });
  }
  sectors[s] = { ...sectors[s], pressure: P, reserve: Q, crisesFired: crises, peakPressure: Math.max(es0.peakPressure ?? 0, P) };
  return n;
}

/**
 * Arrears entered (the lapse rule's capstoned picks, `entering`) and cleared (a sector in arrears at the step's start
 * whose defence Mandate now covers for the step: Mandate ≥ due × dt after every other upkeep, which it then pays).
 * Returns the Mandate after.
 */
export function arrearsStep(state: GameState, content: Content, fl: Flows, sectors: Record<SectorId, SectorState>, entering: SectorId[], mandate: number, dt: number, time: number, hc: HeadlineCtx, w4: M4Step): number {
  let m = mandate;
  for (const s of idx(content).ids) {
    const es0 = state.sectors[s];
    if (!es0?.capstoned) continue;
    if (entering.includes(s)) {
      sectors[s] = { ...sectors[s], arrears: true };
      w4.items.push(headline(state, content, 'arrears', time, hc, s));
      w4.evArrears.push({ kind: 'arrears', sector: s });
    } else if (es0.arrears) {
      const due = fl.settled[s]?.due ?? 0;
      if (m >= due * dt) {
        m = fin(m - due * dt);
        sectors[s] = { ...sectors[s], arrears: false };
        w4.evArrears.push({ kind: 'arrearsCleared', sector: s });
      }
    }
  }
  return m;
}

/* ---- the act's ending ---- */

/** The meta at an act's ending: meta.endings[id], the milestone 'ending:<id>', and the capstone records if the act has a
 *  capstone. `st` is the state the record is taken from (time and meta at the step's end). */
export function actEndingMeta(state: GameState, content: Content, act: ActDef, st: GameState, year: number): MetaState {
  let meta = st.meta;
  const id = act.ending!.id;
  if (!meta.endings?.[id]) meta = { ...meta, endings: { ...(meta.endings ?? {}), [id]: endingRecord(st, year) } };
  meta = milestone(meta, `ending:${id}`, null, year);
  if (act.capstone) meta = { ...meta, world: { ...(meta.world ?? {}), capstone: capstoneRecords({ ...state, meta }, content, act, year) } };
  return meta;
}

/* ---- after the M3 rules: surveys, the order book's peaks, the M4 news and events ---- */

/**
 * The surveys and the order book's peaks over the step from `prev` to `next`, then the M4 news and events in order:
 * thresholdCrossed, scarHealed, surveyed, arrears / arrearsCleared (each in sectorOrder).
 */
export function stepM4(prev: GameState, next0: GameState, content: Content, fl: Flows, mods: Mods, year: number, lite: boolean, away: boolean, w4: M4Step): GameState {
  const ix = idx(content);
  let next = next0;
  const time = next.time;
  const hc: HeadlineCtx = { year };
  const evSurvey: EvDraft[] = [];
  let sectors: Record<SectorId, SectorState> | null = null;
  let meta = next.meta;
  // the reveal's follow-up, on the step after it
  const rv = prev.surveyReveal;
  if (rv && !rv.followed) {
    const fu = content.surveyReveal?.followUp;
    if (fu) w4.items.push(textItem('surveyed', fillText(prev, content, fu, { year, extra: revealExtra(rv) }, rv.sector), time, year, rv.sector));
    next = { ...next, surveyReveal: { ...rv, followed: true } };
  }
  for (const s of ix.renewable) {
    const es0 = prev.sectors[s];
    if (!es0?.open) continue;
    const def = content.sectors[s];
    const rn = renewableOf(def)!;
    const f = fl.sectors[s];
    if (mods.survey.has(s)) {
      // surveyed: the first step this run says so; the last surveyed sink line is kept for a held quota
      const sinkR = f ? depletionSink(prev, content, s, f, clearPOf(es0, def, content)) : null;
      sectors ??= { ...next.sectors };
      if (!es0.lastSurvey) {
        w4.items.push(headline(prev, content, 'surveyed', time, hc, s));
        evSurvey.push({ kind: 'surveyed', sector: s });
      }
      sectors[s] = { ...sectors[s], lastSurvey: { sinkR, t: time, year: Math.floor(year) } };
    } else if (!lite && !away && rn.firstSurvey && !es0.settled && meta.flags?.[`survey:${s}`] !== true
      && (es0.crisesFired >= rn.firstSurvey.atCrisis || es0.openFor >= rn.firstSurvey.afterSeconds)) {
      // the Board's first survey: once per save, on a live step
      const es1 = (sectors ?? next.sectors)[s];
      const K = sizeOf(def);
      const tr = clamp(es1.reserve / K, 0, 1), rep = reportedOf(rn, K, es1.reserve);
      const variant: 'small' | 'large' | 'failed' = es1.crossed ? 'failed' : rep - tr < SURVEY_SMALL_GAP ? 'small' : 'large';
      const reveal = { sector: s, reported: rep, true: tr, variant, year: Math.floor(year), followed: false };
      const sinkR = f ? depletionSink(prev, content, s, f, clearPOf(es0, def, content)) : null;
      sectors ??= { ...next.sectors };
      sectors[s] = { ...sectors[s], lastSurvey: { sinkR, t: time, year: Math.floor(year) } };
      meta = { ...meta, flags: { ...(meta.flags ?? {}), [`survey:${s}`]: true } };
      next = {
        ...next, surveyReveal: reveal,
        modifiers: addModifier(next.modifiers ?? [], { source: `survey:${s}`, arm: 0, since: time, until: time + Math.max(0, fin(rn.firstSurvey.years)) / YEARS_PER_SECOND }),
      };
      const v = content.surveyReveal?.variants.find((x) => x.when === variant);
      w4.items.push(v ? textItem('surveyed', fillText(prev, content, v.headline, { year, extra: revealExtra(reveal) }, s), time, year, s)
        : headline(prev, content, 'surveyed', time, hc, s));
      evSurvey.push({ kind: 'surveyed', sector: s, first: true, label: 'reveal' });
    }
  }
  // the order book's peaks, at each history sample
  if (!lite && Math.floor(time / HISTORY_EVERY) > Math.floor(prev.time / HISTORY_EVERY)) {
    for (const [src] of ix.feedTargets) {
      const es = (sectors ?? next.sectors)[src];
      if (!es?.open) continue;
      const added = rAddedOf(next, content, src);
      let peak = es.feedPeak;
      for (const t in added) if (added[t] > (peak?.[t] ?? 0)) peak = { ...(peak ?? {}), [t]: added[t] };
      if (peak !== es.feedPeak) { sectors ??= { ...next.sectors }; sectors[src] = { ...es, feedPeak: peak }; }
    }
  }
  if (sectors) next = { ...next, sectors };
  if (meta !== next.meta) next = { ...next, meta };
  const ev = [...w4.evThreshold, ...w4.evScar, ...evSurvey, ...w4.evArrears];
  // M4 (amend): the Act I firsts as milestones (MetaState.milestones)
  const firsts: string[] = [];
  const ms = next.meta.milestones ?? {};
  for (const [src] of ix.feedTargets) {
    if (ms[`feed:${src}`] || !next.sectors[src]?.open) continue;
    const es = next.sectors[src];
    if (content.sectors[src].applications.some((a) => (a.feeds?.length ?? 0) > 0 && !!es.apps[a.id]?.founded)) firsts.push(`feed:${src}`);
  }
  for (const s of ix.renewable) if (!ms[`crisis:${s}`] && (next.sectors[s]?.crisesFired ?? 0) > (prev.sectors[s]?.crisesFired ?? 0)) firsts.push(`crisis:${s}`);
  for (const e of ev) {
    if (!e.sector) continue;
    if (e.kind === 'thresholdCrossed') firsts.push(`threshold:${e.sector}`);
    else if (e.kind === 'scarHealed') firsts.push(`scarHealed:${e.sector}`);
    else if (e.kind === 'surveyed') firsts.push(`surveyed:${e.sector}`);
  }
  if (firsts.length) next = { ...next, meta: milestones(next.meta, firsts, year) };
  if (w4.items.length) next = { ...next, ...newsWith(next, content, w4.items) };
  if (ev.length) {
    const r = pushEvents(next.events ?? [], next.meta.eventSeq ?? 0, ev, time, year);
    next = { ...next, events: r.events, meta: { ...next.meta, eventSeq: r.seq } };
  }
  void computeFlows; void sectorLevers; void growthOf;
  return next;
}

/** The reveal's placeholders: {reported} and {true} as whole per cent. */
function revealExtra(r: { reported: number; true: number }): Record<string, string> {
  return { reported: String(Math.round(r.reported * 100)), true: String(Math.round(r.true * 100)) };
}
