/**
 * Hindsight: the seven weighted terms a Reckoning would pay now.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { STEADY_STATE_YEARS } from '../types';
import type { Content, GameState, HindsightTerms } from '../types';
import { idx } from './contentIndex';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* Hindsight                                                           */
/* ------------------------------------------------------------------ */

export function hindsightTerms(state: GameState, content: Content): HindsightTerms {
  const h = content.global.hindsight;
  const ids = idx(content).ids;
  const run = state.run;
  let burn = 0, open = 0, openTime = 0, unburnt = 0, settled = 0;
  for (const s of ids) {
    const es = state.sectors[s];
    if (!es?.open) continue;
    open++;
    if (es.settled) settled++;
    if (es.baseR > 0 && es.openFor > 0) { burn += (run.resourceUsed[s] ?? 0) / es.baseR; openTime += es.openFor; }
    if (content.sectors[s].resourceKind === 'stock' && es.reserveMax > 0) unburnt += clamp(es.reserve / es.reserveMax, 0, 1);
  }
  const intensity = openTime > 0 ? fin(burn / openTime, 1) : 1;
  const wy = fin(run.wellbeingYears ?? 0);
  const count = (r: Record<string, boolean> | undefined) => Object.values(r ?? {}).filter((x) => x === true).length;
  const terms = {
    wellbeing: fin(h.perWellbeingYear * wy / Math.pow(Math.max(1, intensity), h.intensityExponent)),
    budget: fin(h.perBudgetDecade * Math.max(0, (run.budgetDecades ?? 0) - (run.leanDecades ?? 0)) + (h.perLeanDecade ?? 0) * (run.leanDecades ?? 0)),
    unburnt: fin(h.perUnburnt * unburnt * Math.min(1, (run.yearsAtTarget ?? 0) / STEADY_STATE_YEARS)),
    backfire: fin(h.perFirstBackfire * count(run.firstBackfires)),
    sectorsReached: fin(h.perSectorReached * Math.max(0, open - 1)),
    steady: fin(h.perSteadySector * count(run.steadySectors)),
    settled: fin((h.perSettledSector ?? 0) * settled),
  };
  const sum = terms.wellbeing + terms.budget + terms.unburnt + terms.backfire + terms.sectorsReached + terms.steady + terms.settled;
  return { wellbeingYears: wy, intensity, ...terms, total: Math.max(1, Math.round(fin(sum))) };
}

export function hindsightOnReckon(state: GameState, content: Content): number {
  return hindsightTerms(state, content).total;
}
