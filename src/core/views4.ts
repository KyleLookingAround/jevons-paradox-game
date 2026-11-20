/**
 * M4: SectorDerived's new views that need more than one sector: years and seconds left on a shared reserve, the
 * owner's drain by source (drawnBy), the renewable stock's gauges (stock), and Derived.surveyReveal.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { EXHAUSTED_BELOW, YEARS_PER_SECOND } from '../types';
import type { Content, Derived, GameState, SectorDerived, SectorId } from '../types';
import { calendarYear } from './calendar';
import { idx } from './contentIndex';
import type { Mods } from './effects';
import type { Flows } from './flows';
import { fillText } from './headlines';
import type { SectorLevers } from './levers';
import { NO_LEVERS } from './levers';
import { growthOf, renewableOf, reportedOf, scarMulOf, scarOf, sizeOf } from './renewable';
import type { SectorFlow } from './solver';
import { clamp, fin } from './util';

/** SectorDerived.secondsLeft: a stock sector's own net drain to exhaustion; an owner's includes its drawers; a drawer
 *  reports its owner's; Infinity otherwise (settled, flow, renewable, no net drain). */
export function secondsLeftOf(state: GameState, content: Content, fl: Flows, levs: Record<string, SectorLevers>, s: SectorId): number {
  const ix = idx(content);
  const o = ix.ownerOf.get(s) ?? s;
  const def = content.sectors[o];
  const es = state.sectors[o];
  const f = fl.sectors[o];
  if (def?.resourceKind !== 'stock' || !es?.open) return Infinity;
  let drain = 0;
  if (!es.settled && f) drain = f.R * (1 - (levs[o] ?? NO_LEVERS).circ) - f.reserveGain;
  for (const d of ix.drawers.get(o) ?? []) {
    const ed = state.sectors[d], fd = fl.sectors[d];
    if (ed?.open && !ed.settled && fd) drain += fd.R * (1 - (levs[d] ?? NO_LEVERS).circ);
  }
  return drain > 0 ? Math.max(0, es.reserve - EXHAUSTED_BELOW * es.reserveMax) / drain : Infinity;
}

/** SectorDerived.drawnBy on an owner: R × (1 − circ) by source, own included; null when no drawer draws now. */
export function drawnByOf(state: GameState, content: Content, fl: Flows, levs: Record<string, SectorLevers>, o: SectorId): Record<SectorId, number> | null {
  const out: Record<SectorId, number> = {};
  let any = false;
  for (const d of idx(content).drawers.get(o) ?? []) {
    const ed = state.sectors[d], fd = fl.sectors[d];
    if (!ed?.open || ed.settled || !fd) continue;
    out[d] = fin(fd.R * (1 - (levs[d] ?? NO_LEVERS).circ));
    any = true;
  }
  if (!any) return null;
  const eo = state.sectors[o], fo = fl.sectors[o];
  return { [o]: eo && !eo.settled && fo ? fin(fo.R * (1 - (levs[o] ?? NO_LEVERS).circ)) : 0, ...out };
}

/** SectorDerived.yearsLeft ('stock' sectors and drawers): flat from secondsLeft; growing at the owner's trend. */
export function yearsLeftOf(state: GameState, content: Content, s: SectorId, secondsLeft: number, estimates: boolean): SectorDerived['yearsLeft'] {
  if (content.sectors[s]?.resourceKind !== 'stock') return null;
  const flat = Number.isFinite(secondsLeft) ? fin(secondsLeft * YEARS_PER_SECOND) : null;
  if (!estimates || flat === null) return { flat, growing: null };
  const o = idx(content).ownerOf.get(s) ?? s;
  const g = fin(state.sectors[o]?.trendR ?? 0);
  return { flat, growing: g > 0 ? fin(Math.log(1 + g * flat) / g) : flat };
}

/** SectorDerived.stock for a renewable sector. */
export function stockView(state: GameState, content: Content, s: SectorId, f: SectorFlow, mods: Mods): SectorDerived['stock'] {
  const def = content.sectors[s];
  const rn = renewableOf(def);
  const es = state.sectors[s];
  if (!rn || !es) return null;
  const K = sizeOf(def);
  const Q = es.reserve;
  const surveyed = mods.survey.has(s);
  const reported = reportedOf(rn, K, Q);
  const sc = scarOf(state.meta, s);
  const G = f.ren ? f.ren.G : growthOf(rn, K, Q, scarMulOf(rn, state.meta, s));
  return {
    reported, true: surveyed ? clamp(Q / K, 0, 1) : null, surveyed, regen: surveyed ? G : null,
    foreign: rn.foreign && !es.settled && f.ren ? { share: f.ren.share, R: f.ren.rForeign } : null,
    scar: sc ? { yearsLeft: sc.yearsLeft } : null, crossed: !!es.crossed, reportedPressureFraction: 1 - reported,
    world: clamp(Q / K, 0, 1),
  };
}

/** Derived.surveyReveal from GameState.surveyReveal and Content.surveyReveal (null when either is absent). */
export function surveyRevealView(state: GameState, content: Content): Derived['surveyReveal'] {
  const r = state.surveyReveal;
  const v = r ? content.surveyReveal?.variants.find((x) => x.when === r.variant) : undefined;
  if (!r || !v) return null;
  const ctx = { year: r.year, extra: { reported: String(Math.round(r.reported * 100)), true: String(Math.round(r.true * 100)) } };
  void calendarYear;
  return {
    sector: r.sector, reported: r.reported, true: r.true, variant: r.variant,
    headline: fillText(state, content, v.headline, ctx, r.sector), body: fillText(state, content, v.body, ctx, r.sector),
  };
}
