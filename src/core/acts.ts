/**
 * M4: Acts (Content.acts): the current act, the ending act the page reads (Derived.ending), the M4 streak rule over the
 * act's ending set (counted from step.ts in one call; without acts step.ts keeps the M3 rule), and the capstone records
 * written at an act's ending (MetaState.world.capstone). Building capstoned sectors at a run's start is inherit.ts.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { ActDef, CapstoneRecord, Content, GameState, MetaState, SectorId } from '../types';
import { idx } from './contentIndex';

/** The current act: the first whose ending has not been reached (an act with no ending is never reached), or null. */
export function currentAct(content: Content, meta: MetaState): ActDef | null {
  for (const a of idx(content).acts) if (!a.ending || !meta.endings?.[a.ending.id]) return a;
  return null;
}

/** The ending act E (Derived.ending): the current act if it has an ending, else the last act whose ending was reached. */
export function endingAct(content: Content, meta: MetaState): ActDef | null {
  const cur = currentAct(content, meta);
  if (cur?.ending) return cur;
  let last: ActDef | null = null;
  for (const a of idx(content).acts) if (a.ending && meta.endings?.[a.ending.id]) last = a;
  return last;
}

/** The ending set of an act, restricted to sectors in content, in sectorOrder. */
export function endingSectors(content: Content, act: ActDef): SectorId[] {
  const ix = idx(content);
  return (act.ending?.sectors ?? []).filter((s) => ix.pos.has(s)).sort((a, b) => ix.pos.get(a)! - ix.pos.get(b)!);
}

/**
 * The M4 streak (GameState.steadyYearsAll with Content.acts): the step counts when every sector of the current act's
 * ending set is open and settled (capstoned counts) at the step's start and stays settled through it (`leaving`: sectors
 * the lapse rule unsettles in this step); otherwise 0. No current act, or one without an ending: 0.
 */
export function actStreak(state: GameState, content: Content, leaving: SectorId[], dy: number): { years: number; act: ActDef | null } {
  const act = currentAct(content, state.meta);
  if (!act?.ending) return { years: 0, act: null };
  const set = endingSectors(content, act);
  if (!set.length || leaving.some((s) => set.includes(s))) return { years: 0, act };
  for (const s of set) if (!state.sectors[s]?.open || !state.sectors[s].settled) return { years: 0, act };
  return { years: state.steadyYearsAll + dy, act };
}

/** The capstone records of an act's ending set at this state (each sector's SettledState as it stands; a sector already
 *  in meta.world.capstone keeps its record). */
export function capstoneRecords(state: GameState, content: Content, act: ActDef, year: number): Record<SectorId, CapstoneRecord> {
  const out: Record<SectorId, CapstoneRecord> = { ...(state.meta.world?.capstone ?? {}) };
  for (const s of endingSectors(content, act)) {
    const st = state.sectors[s]?.settled;
    if (!st || out[s]) continue;
    out[s] = { act: act.id, year: Math.floor(year), settled: { ...st, appD: { ...st.appD }, appAdoption: { ...st.appAdoption } } };
  }
  return out;
}

/** SectorDerived.preview. */
export const isPreview = (content: Content, s: SectorId): boolean => idx(content).preview.has(s);
