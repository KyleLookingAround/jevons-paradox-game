/**
 * Events (M2): GameState.events, the stream the scene and the page react to. Every event takes seq = ++meta.eventSeq
 * (unique and increasing across the save); the list keeps the newest EVENTS_MAX. Also the headline → event mapping.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { EVENTS_MAX } from '../types';
import type { Actor, EventKind, GameEvent, GameState, HeadlineKey, SectorId } from '../types';

/** An event before it has a seq, a time and a year. */
export interface EvDraft { kind: EventKind; sector?: SectorId; id?: string; n?: number; by?: Actor; first?: boolean; label?: string }

/** The event kind a headline stands for, where both exist (the step emits them together). */
export const HEADLINE_EVENT: Partial<Record<HeadlineKey, EventKind>> = {
  appFounded: 'appFounded', appAvailable: 'appAvailable', sectorOpened: 'sectorOpened', crisis: 'crisis',
  collapse: 'collapse', exhausted: 'exhausted', backfire: 'backfire', reveal: 'reveal', leverEnacted: 'leverEnacted',
  leverLapsed: 'leverLapsed', steadySector: 'steadyState', steadyAll: 'won', reckoning: 'reckoning',
  ageBegins: 'ageBegins', budgetDrawn: 'budgetDrawn', decade: 'decade', budgetBroken: 'budgetBroken',
  clearSkies: 'clearSkies', settled: 'settled', unsettled: 'unsettled', commonsBuilt: 'commonsBuilt', charter: 'charterChosen',
};

/** Appends drafts to a list starting after `seq`; returns the new list (trimmed) and the last seq. */
export function pushEvents(events: GameEvent[], seq: number, drafts: EvDraft[], time: number, year: number): { events: GameEvent[]; seq: number } {
  if (!drafts.length) return { events, seq };
  const out = events.slice();
  const y = Math.floor(year);
  for (const d of drafts) {
    const e: GameEvent = { seq: ++seq, kind: d.kind, time, year: y };
    if (d.sector !== undefined) e.sector = d.sector;
    if (d.id !== undefined) e.id = d.id;
    if (d.n !== undefined) e.n = d.n;
    if (d.by !== undefined) e.by = d.by;
    if (d.first) e.first = true;
    if (d.label !== undefined) e.label = d.label;
    out.push(e);
  }
  return { events: out.length > EVENTS_MAX ? out.slice(out.length - EVENTS_MAX) : out, seq };
}

/** The state with the drafts emitted at `time` (calendar `year`). Same reference when there are none. */
export function emit(state: GameState, drafts: EvDraft[], time: number, year: number): GameState {
  if (!drafts.length) return state;
  const r = pushEvents(state.events ?? [], state.meta.eventSeq ?? 0, drafts, time, year);
  return { ...state, events: r.events, meta: { ...state.meta, eventSeq: r.seq } };
}
