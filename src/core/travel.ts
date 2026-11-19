/**
 * M3: travel time, congestion and sprawl (TravelDef), a general kind. The speed index v(D) and the fixed point in D run
 * inside the solver (solver.ts, demand at a price); this module gives the display quantities: hours a day per head,
 * the sprawl stock (Σ lockIn × peakD over founded applications) and SectorDerived.travel; and lockInDecay for the step.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { AppState, SectorDef, SectorState, TravelView } from '../types';
import { POP_MIN } from './constants';
import type { SectorFlow } from './solver';
import { fin } from './util';

/** Σ lockIn × peakD over founded applications (service per second locked in). */
export function sprawlOf(def: SectorDef, es: SectorState): number {
  let x = 0;
  for (const a of def.applications) {
    const st = es.apps[a.id];
    if (st?.founded && (a.lockIn ?? 0) > 0) x += (a.lockIn ?? 0) * fin(st.peakD);
  }
  return fin(x);
}
/** hoursPerHead = hoursScale × (D / N) / max(v, 1e-6). */
export const hoursPerHead = (def: SectorDef, D: number, N: number, v: number): number =>
  fin((def.travel?.hoursScale ?? 1) * (D / Math.max(POP_MIN, N)) / Math.max(v, 1e-6));

/** SectorDerived.travel: live, or frozen from SettledState.travel while settled (null if settled before M3). */
export function travelView(def: SectorDef, es: SectorState, f: SectorFlow, N: number): TravelView | null {
  if (!def.travel) return null;
  if (es.settled) {
    const t = es.settled.travel;
    if (!t) return null;
    return { speed: t.speed, freeSpeed: t.speed, roads: t.roads, congestion: 0, hoursPerHead: t.hoursPerHead, sprawl: t.sprawl, sprawlShare: f.D > 0 ? fin(t.sprawl / f.D) : 0 };
  }
  const tr = f.travel;
  if (!tr) return null;
  const sprawl = sprawlOf(def, es);
  return {
    speed: tr.v, freeSpeed: tr.s, roads: tr.K, congestion: tr.congestion, hoursPerHead: hoursPerHead(def, f.D, N, tr.v),
    sprawl, sprawlShare: f.D > 0 ? fin(sprawl / f.D) : 0,
  };
}

/** Sprawl that fades (ApplicationDef.lockInDecay): peakD ← max(d, peakD × exp(−decay × dt)) while d is below the peak.
 *  Returns the new peak (the same number when nothing decays). */
export function decayedPeak(st: AppState, d: number, decay: number, dt: number): number {
  if (!(decay > 0) || !(st.peakD > d)) return st.peakD;
  return Math.max(d, st.peakD * Math.exp(-decay * dt));
}
