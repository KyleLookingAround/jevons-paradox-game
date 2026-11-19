/**
 * The calendar year and the current Age (cosmetic; every timer runs on model years).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND, START_YEAR, CALENDAR_LATE_RATE } from '../types';
import type { AgeDef, Content, GameState, SectorId, SectorState } from '../types';

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

export function calendarYear(state: { time: number; sectors: Record<SectorId, SectorState> }, content: Content): number {
  let best = -Infinity;
  for (const age of content.ages ?? []) {
    let T = -1, sMax = -Infinity;
    for (const s of age.sectors ?? []) {
      const es = state.sectors[s];
      const def = content.sectors?.[s];
      if (!es?.open || !def) continue;
      T = Math.max(T, es.openFor);
      sMax = Math.max(sMax, (def.firstYear ?? age.yearSpan[0]) + es.openFor * YEARS_PER_SECOND);
    }
    if (T < 0) continue;
    let y = Math.max(age.yearSpan[0] + T * YEARS_PER_SECOND, sMax);
    if (y > age.yearSpan[1]) y = age.yearSpan[1] + (y - age.yearSpan[1]) * CALENDAR_LATE_RATE;
    if (y > best) best = y;
  }
  return Number.isFinite(best) ? best : START_YEAR + state.time * YEARS_PER_SECOND;
}

export function currentAge(state: GameState, content: Content): AgeDef | null {
  const ages = content.ages ?? [];
  for (let i = ages.length - 1; i >= 0; i--) if ((ages[i].sectors ?? []).some((s) => state.sectors[s]?.open)) return ages[i];
  return null;
}
