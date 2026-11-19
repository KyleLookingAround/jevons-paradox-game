/**
 * The calendar year and the current Age (cosmetic; every timer runs on model years).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 *
 * QA fix (B3, see AgeDef.yearSpan): the calendar never jumps and never runs absurdly far past an Age. A clock that opens
 * ahead of the calendar (Light's 1870 when Steam has reached 1810; an Age whose first year is ahead) catches up over
 * CALENDAR_CATCHUP_SECONDS from the year it opened in, instead of jumping; past an Age's last year the calendar slows
 * to CALENDAR_LATE_RATE and then levels off, never more than CALENDAR_LATE_SPAN years past it.
 */
import { YEARS_PER_SECOND, START_YEAR, CALENDAR_LATE_RATE } from '../types';
import type { AgeDef, Content, GameState, SectorId, SectorState } from '../types';

/** Run seconds over which a clock that opens ahead of the calendar catches up with it (smoothly, from the year it opened). */
export const CALENDAR_CATCHUP_SECONDS = 120;
/** Past an Age's last year the calendar slows to CALENDAR_LATE_RATE and levels off below last year + this. */
export const CALENDAR_LATE_SPAN = 36;

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

/** The slowing past an Age's last year: slope 1 up to it, CALENDAR_LATE_RATE just past it, levelling off below
 *  last + CALENDAR_LATE_SPAN. Continuous and increasing. */
function late(y: number, last: number): number {
  if (!(y > last)) return y;
  return last + CALENDAR_LATE_SPAN * (1 - Math.exp(-((y - last) * CALENDAR_LATE_RATE) / CALENDAR_LATE_SPAN));
}
const smooth = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** One clock: an Age's own (from yearSpan[0]) or a sector's (from its firstYear), opened at run time `at`. */
interface Clock { age: number; first: number; at: number; last: number; start: number }

export function calendarYear(state: { time: number; sectors: Record<SectorId, SectorState> }, content: Content): number {
  const ages = content.ages ?? [];
  const now = state.time;
  // Every open clock with the run time it opened at (now − openFor): each Age's own from its first sector to open.
  const clocks: Clock[] = [];
  ages.forEach((age, ai) => {
    let ageAt = Infinity;
    for (const s of age.sectors ?? []) {
      const es = state.sectors[s];
      const def = content.sectors?.[s];
      if (!es?.open || !def) continue;
      const at = now - Math.max(0, es.openFor);
      ageAt = Math.min(ageAt, at);
      clocks.push({ age: ai, first: def.firstYear ?? age.yearSpan[0], at, last: age.yearSpan[1], start: -Infinity });
    }
    if (ageAt < Infinity) clocks.push({ age: ai, first: age.yearSpan[0], at: ageAt, last: age.yearSpan[1], start: -Infinity });
  });
  if (!clocks.length) return START_YEAR + now * YEARS_PER_SECOND;
  // In the order they opened, each clock starts from the calendar as it stood the moment before (earlier clocks only).
  clocks.sort((a, b) => a.at - b.at);
  const value = (c: Clock, t: number): number => {
    const o = t - c.at;
    const target = late(c.first + o * YEARS_PER_SECOND, c.last);
    const gap = c.start > -Infinity ? Math.max(0, late(c.first, c.last) - c.start) : 0;
    return gap > 0 ? target - gap * (1 - smooth(o / CALENDAR_CATCHUP_SECONDS)) : target;
  };
  const at = (t: number, upto: number): number => {
    let y = -Infinity;
    for (let i = 0; i < upto; i++) if (clocks[i].at <= t) { const v = value(clocks[i], t); if (v > y) y = v; }
    return y;
  };
  for (let i = 0; i < clocks.length; i++) {
    // Clocks that open together (an Age and its first sector) share the calendar from before any of them.
    let j = i;
    while (j > 0 && clocks[j - 1].at === clocks[i].at) j--;
    clocks[i].start = at(clocks[i].at, j);
  }
  const y = at(now, clocks.length);
  return Number.isFinite(y) ? y : START_YEAR + now * YEARS_PER_SECOND;
}

export function currentAge(state: GameState, content: Content): AgeDef | null {
  const ages = content.ages ?? [];
  for (let i = ages.length - 1; i >= 0; i--) if ((ages[i].sectors ?? []).some((s) => state.sectors[s]?.open)) return ages[i];
  return null;
}

/**
 * M2: the calendar year at run time `time` of the current run: each sector's openFor shifted by (state.time − time), a
 * sector counting as open then when that is ≥ 0. Times after state.time extrapolate; negative times count as 0.
 */
export function yearAt(state: GameState, content: Content, time: number): number {
  const t = Math.max(0, Number.isFinite(time) ? time : 0);
  const shift = state.time - t;
  const sectors: Record<SectorId, SectorState> = {};
  for (const s in state.sectors) {
    const es = state.sectors[s];
    if (!es?.open) continue;
    const o = es.openFor - shift;
    if (o >= -1e-9) sectors[s] = { ...es, openFor: Math.max(0, o) };
  }
  return calendarYear({ time: t, sectors }, content);
}
