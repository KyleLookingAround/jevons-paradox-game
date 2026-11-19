/**
 * M3: the Archive (ArchiveDef): notes unlocked the first time their subject is owned or seen, by a rule per subject
 * kind, recorded in MetaState.archive whether or not feature 'archive' is on (it gates only the viewer). Checked about
 * once a real second in the step and at the end of every action (index.ts); ArchiveView for the viewer.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { ArchiveView, Content, GameState, MetaState } from '../types';
import { idx } from './contentIndex';
import type { EvDraft } from './events';

/** The subject rule of a note holds now (ArchiveDef): first owned / available / opened / offered / chosen / earned. */
export function subjectMet(state: GameState, content: Content, subject: string): boolean {
  const ix = idx(content);
  const m = state.meta;
  if (ix.upgrades.has(subject)) return (state.upgrades[subject] ?? 0) >= 1;
  if (ix.levers.has(subject)) return (state.levers[subject]?.level ?? 0) >= 1;
  if (ix.commons.has(subject)) return (state.commons?.levels?.[subject] ?? 0) >= 1;
  const seam = ix.seams.get(subject);
  if (seam) return (state.sectors[seam.sector]?.seamsSunk ?? 0) > seam.idx;
  const app = ix.apps.get(subject);
  if (app) return !!state.sectors[app.sector]?.apps[subject]?.available;
  if (ix.pos.has(subject)) return m.sectorsOpened?.[subject] === true || !!state.sectors[subject]?.open;
  if (ix.dispatches.has(subject)) return (m.dispatches?.seen?.[subject] ?? 0) > 0;
  if (ix.charters.has(subject)) return m.charter === subject || (m.runs ?? []).some((r) => r.charter === subject);
  if (ix.histories.has(subject)) return m.history === subject || (m.histories?.[subject]?.runs ?? 0) > 0 || (m.histories?.[subject]?.cleared ?? false);
  if (ix.cast.has(subject)) {
    for (const d of content.dispatches ?? []) if (d.cast === subject && (m.dispatches?.seen?.[d.id] ?? 0) > 0) return true;
    return false;
  }
  if (ix.achievements.has(subject)) return m.achievements?.[subject] === true;
  return false;
}

/** Notes whose rule holds now and are not yet unlocked: the meta with them unlocked (at = meta.totalSeconds) and their
 *  'archiveUnlocked' events (when `ev` is given). The same meta when none. */
export function unlockNotes(state: GameState, content: Content, meta: MetaState, ev?: EvDraft[]): MetaState {
  const notes = content.archive;
  if (!notes || !notes.length) return meta;
  const have = meta.archive ?? {};
  let out: Record<string, number> | null = null;
  for (const n of notes) {
    if (have[n.id] !== undefined || (out && out[n.id] !== undefined)) continue;
    if (!subjectMet(state, content, n.subject)) continue;
    (out ??= { ...have })[n.id] = meta.totalSeconds;
    if (ev) ev.push({ kind: 'archiveUnlocked', id: n.id, label: n.subject });
  }
  return out ? { ...meta, archive: out } : meta;
}

export function archiveViews(state: GameState, content: Content): ArchiveView[] {
  const ix = idx(content);
  const have = state.meta.archive ?? {};
  return (content.archive ?? []).map((n) => {
    const at = have[n.id];
    const unlocked = at !== undefined;
    return {
      id: n.id, subject: n.subject, subjectName: ix.names.get(n.subject) ?? n.subject, title: n.title, date: n.date ?? '',
      unlocked, at: unlocked ? at : null, text: unlocked ? n.text : '', sources: n.sources.map((x) => ({ ...x })),
    };
  });
}

/** Derived.archive. */
export function archiveCounts(state: GameState, content: Content): { unlocked: number; total: number } {
  const have = state.meta.archive ?? {};
  let u = 0;
  for (const n of content.archive ?? []) if (have[n.id] !== undefined) u++;
  return { unlocked: u, total: content.archive?.length ?? 0 };
}
