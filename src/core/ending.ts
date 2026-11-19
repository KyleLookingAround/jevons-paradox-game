/**
 * M3: the first ending (every Industry at its sink line for fifty years: flags.won) and the retrospective Gazette
 * assembled from MetaState.milestones and Content.ending (ModelApi.retrospective).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, EndingRecord, GameState, MetaState, RetroItem, SectorId } from '../types';
import { idx } from './contentIndex';
import { fillText } from './headlines';
import { milestone } from './milestones';

/** The EndingRecord for the state now (run = reckonings + 1, run time, total seconds, calendar year rounded down). */
export const endingRecord = (state: GameState, year: number): EndingRecord =>
  ({ run: state.meta.reckonings + 1, runSeconds: state.time, totalSeconds: state.meta.totalSeconds, year: Math.floor(year) });

/** The first win ever: meta.endings.steadyAll and the 'won' milestone (null when an ending is already recorded). */
export function firstEnding(meta: MetaState, record: EndingRecord, year: number): MetaState | null {
  if (meta.endings?.steadyAll) return null;
  return milestone({ ...meta, endings: { ...(meta.endings ?? {}), steadyAll: record } }, 'won', null, year);
}

export function retrospective(state: GameState, content: Content): RetroItem[] {
  const tpl = content.ending?.retrospective ?? [];
  const ms = state.meta.milestones ?? {};
  const ix = idx(content);
  const keys = Object.keys(ms).sort((a, b) => ms[a].at - ms[b].at || ms[a].run - ms[b].run || (a < b ? -1 : a > b ? 1 : 0));
  const out: RetroItem[] = [];
  for (const key of keys) {
    const colon = key.indexOf(':');
    const prefix = colon >= 0 ? key.slice(0, colon) : key;
    const t = tpl.find((x) => x.key === key) ?? tpl.find((x) => x.key === `${prefix}:*` || (colon >= 0 && x.key === prefix));
    if (!t) continue;
    const m = ms[key];
    const sector: SectorId | undefined = colon >= 0 && ix.pos.has(key.slice(colon + 1)) ? key.slice(colon + 1) : undefined;
    const headline = fillText(state, content, t.headline, {
      year: m.year, extra: { run: String(m.run), hours: (Math.round((m.at / 3600) * 10) / 10).toFixed(1) },
    }, sector);
    out.push({ key, run: m.run, year: m.year, at: m.at, ...(sector !== undefined ? { sector } : {}), headline });
  }
  return out;
}
