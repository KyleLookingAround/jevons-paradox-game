/**
 * M3: the load curve (LoadDef), a general utilisation kind. The arithmetic (profiles → shapes, H[h], the load factor and
 * c_eff) runs inside the solver (solver.ts: mechOf, loadFactor), because c_eff depends on the demand mix at each price
 * tried; this module turns a solved flow (or a settled snapshot) into SectorDerived.load.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { LoadView, SectorDef, SectorState } from '../types';
import type { SectorFlow } from './solver';

/** SectorDerived.load for an open sector: live from the flow, frozen from SettledState.load while settled (null when
 *  settled before M3 or without `load`). The feature gate is the caller's. */
export function loadView(def: SectorDef, es: SectorState, f: SectorFlow): LoadView | null {
  if (!def.load) return null;
  if (es.settled) {
    const l = es.settled.load;
    if (!l) return null;
    let peak = 0;
    for (const h of l.hours) if (h > peak) peak = h;
    return { factor: l.factor, hours: l.hours.slice(), peak, capCostBase: l.capCostEff / Math.max(1e-12, (1 - def.load.fixedShare) + def.load.fixedShare / Math.max(def.load.floor ?? 0.05, l.factor)), capCostEff: l.capCostEff };
  }
  const l = f.load;
  if (!l) return null;
  return { factor: l.factor, hours: l.hours.slice(), peak: l.peak, capCostBase: l.cBase, capCostEff: l.cEff };
}
