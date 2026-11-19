/**
 * M3: Steam's seam ladder (SeamDef), a supply-side kind. The price multiplier of the deepest seam sunk acts inside the
 * solver (solver.ts: p_r of a stock sector); this module owns reachability, the cost, the action (sinkSeam) and
 * SectorDerived.seams. A seam never sunk changes nothing; the Market never sinks one.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState, SeamDef, SeamsView, SectorId } from '../types';
import { calendarYear } from './calendar';
import { evalCond } from './conditions';
import { costMulOfId, isForbidden, modsOf } from './effects';
import type { Mods } from './effects';
import { emit } from './events';
import { featureOn } from './features';
import { computeFlows } from './flows';
import { headline, newsWith } from './headlines';
import { milestone } from './milestones';
import { fin } from './util';

/** Capital to sink a seam now: cost × costMul × costMulOf (the seam id, its sector). */
export const seamCost = (seam: SeamDef, sector: SectorId, mods: Mods): number =>
  fin(seam.cost * mods.costMul * costMulOfId(mods, seam.id, sector));

/** The next seam of a sector, if any (stock sectors only). */
export function nextSeam(state: GameState, content: Content, s: SectorId): SeamDef | null {
  const def = content.sectors[s];
  if (!def || def.resourceKind !== 'stock' || !def.seams?.length) return null;
  return def.seams[state.sectors[s]?.seamsSunk ?? 0] ?? null;
}

/** p_s ≤ reachBelow (default Infinity) and `requires` hold now. */
function reachable(state: GameState, content: Content, s: SectorId, seam: SeamDef): boolean {
  const f = computeFlows(state, content).sectors[s];
  if (!f) return false;
  const below = seam.reachBelow ?? Infinity;
  return f.ps <= below && (!seam.requires || evalCond(state, content, seam.requires));
}

/** Why sinkSeam would refuse now, or null if it would accept. */
function refusal(state: GameState, content: Content, s: SectorId, mods: Mods): string | null {
  if (!featureOn(content, state.meta, 'seams')) return 'feature';
  const es = state.sectors[s];
  if (!es?.open || es.settled) return 'sector';
  const seam = nextSeam(state, content, s);
  if (!seam) return 'none';
  if (computeFlows(state, content).pending) return 'pending';
  if (!reachable(state, content, s, seam)) return 'reach';
  if (isForbidden(mods, seam.id)) return 'forbidden';
  if (!(state.capital >= seamCost(seam, s, mods))) return 'cash';
  return null;
}

export function sinkSeam(state: GameState, content: Content, sector: SectorId): GameState {
  const mods = modsOf(state, content);
  if (refusal(state, content, sector, mods) !== null) return state;
  const seam = nextSeam(state, content, sector)!;
  const es = state.sectors[sector];
  const cost = seamCost(seam, sector, mods);
  const tons = Math.max(0, fin(seam.tons));
  const n = (es.seamsSunk ?? 0) + 1;
  const year = calendarYear(state, content);
  let out: GameState = {
    ...state, capital: Math.max(0, state.capital - cost),
    sectors: { ...state.sectors, [sector]: { ...es, seamsSunk: n, reserve: es.reserve + tons, reserveMax: es.reserveMax + tons } },
    ...newsWith(state, content, [headline(state, content, 'seamSunk', state.time, { year, name: seam.name }, sector)]),
  };
  out = { ...out, meta: milestone(out.meta, `seam:${sector}`, state, year) };
  return emit(out, [{ kind: 'seamSunk', sector, id: seam.id, n, label: seam.name, by: 'player' }], state.time, year);
}

/** SectorDerived.seams (null without seams, on a flow sector, or while feature 'seams' is off). */
export function seamsView(state: GameState, content: Content, s: SectorId, mods: Mods): SeamsView | null {
  const def = content.sectors[s];
  if (!def?.seams?.length || def.resourceKind !== 'stock' || !featureOn(content, state.meta, 'seams')) return null;
  const es = state.sectors[s];
  const sunk = Math.min(es?.seamsSunk ?? 0, def.seams.length);
  const canNext = refusal(state, content, s, mods) === null;
  const ladder = def.seams.map((seam, i) => {
    const isNext = i === sunk;
    return {
      def: seam, sunk: i < sunk, reachable: isNext && !es?.settled && reachable(state, content, s, seam),
      cost: seamCost(seam, s, mods), canSink: isNext && canNext, forbidden: isForbidden(mods, seam.id),
    };
  });
  return { sunk, total: def.seams.length, priceMul: sunk > 0 ? Math.max(0, fin(def.seams[sunk - 1].priceMul, 1)) : 1, ladder };
}
