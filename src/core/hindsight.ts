/**
 * Hindsight: the seven weighted terms a Reckoning would pay now, less what was withheld for time away (M2 offline fix).
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
  const ix = idx(content);
  const ids = ix.ids;
  const run = state.run;
  let burn = 0, open = 0, openTime = 0, unburnt = 0, settled = 0;
  for (const s of ids) {
    const es = state.sectors[s];
    if (!es?.open) continue;
    // M4: a capstoned sector counts in reached and settled only when its act's capstone says so
    const counts = !es.capstoned || capstoneCounts(state, content, s);
    if (counts) open++;
    if (es.settled && counts) settled++;
    if (es.baseR > 0 && es.openFor > 0) { burn += (run.resourceUsed[s] ?? 0) / es.baseR; openTime += es.openFor; }
    const kind = content.sectors[s].resourceKind;
    // M4: a renewable counts as Q / K; a resourceStock drawer not at all (its reserve is the owner's, counted once)
    if ((kind === 'stock' && !ix.ownerOf.has(s) || kind === 'renewable') && es.reserveMax > 0) unburnt += clamp(es.reserve / es.reserveMax, 0, 1);
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
  const sum = termsSum(terms);
  // M2 offline fix: Hindsight that accrued inside fastForward at less than the full rate (types.ts RunStats.hindsightWithheld)
  const withheld = Math.max(0, fin(run.hindsightWithheld ?? 0));
  if (withheld > 0) return { wellbeingYears: wy, intensity, ...terms, withheld, total: Math.max(1, Math.round(fin(sum - withheld))) };
  return { wellbeingYears: wy, intensity, ...terms, total: Math.max(1, Math.round(fin(sum))) };
}

/** M4: a capstoned sector counts in perSectorReached and perSettledSector when its act's capstone.hindsight is true. */
function capstoneCounts(state: GameState, content: Content, s: string): boolean {
  const rec = state.meta.world?.capstone?.[s];
  return !!rec && idx(content).acts.some((a) => a.id === rec.act && a.capstone?.hindsight === true);
}

/** The unrounded sum of the seven weighted terms (before withholding): what fastForward's offline rate is applied to. */
export function termsSum(t: Pick<HindsightTerms, 'wellbeing' | 'budget' | 'unburnt' | 'backfire' | 'sectorsReached' | 'steady' | 'settled'>): number {
  return t.wellbeing + t.budget + t.unburnt + t.backfire + t.sectorsReached + t.steady + t.settled;
}

export function hindsightOnReckon(state: GameState, content: Content): number {
  return hindsightTerms(state, content).total;
}
