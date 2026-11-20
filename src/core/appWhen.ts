/**
 * M5 (follow-up, Core A): ApplicationDef.when (calendar-dated uses; a loophole's exempt use). Available only while it
 * holds, evaluated on the state at the start of the step as visibleBelow is: an unfounded application whose `when` fails
 * is unavailable (refused to the player, the Market and the rival alike, since all three test AppState.available); a
 * founded one keeps its adoption but its effective saturation is capped at the value of the last step `when` held
 * (AppState.frozenSat, read by the solver) until it holds again. A sector opening founds free uses only where `when`
 * holds. A loophole's exempt use is founded by evade directly (useRung), whose `when` then holds. Without `when`: nothing
 * here runs (M4 exactly). Layer 6.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { ApplicationDef, Content, GameState, SectorId, SectorState } from '../types';
import { evalCond } from './conditions';
import type { Mods } from './effects';

export const appWhenOk = (state: GameState, content: Content, a: ApplicationDef): boolean => !a.when || evalCond(state, content, a.when);

/** A sector just built open (createState, a sector opening): uses whose `when` fails now are neither available nor
 *  founded (a startFounded use keeps its founding). The same object when nothing is gated. */
export function gateOpened(state: GameState, content: Content, s: SectorId, es: SectorState, mods: Mods): SectorState {
  let apps: SectorState['apps'] | null = null;
  for (const a of content.sectors[s].applications) {
    if (!a.when) continue;
    const st = es.apps[a.id];
    if (!st || (!st.available && !st.founded) || appWhenOk(state, content, a)) continue;
    (apps ??= { ...es.apps })[a.id] = { ...st, available: false, founded: st.founded && mods.startFounded.has(a.id) };
  }
  return apps ? { ...es, apps } : es;
}
