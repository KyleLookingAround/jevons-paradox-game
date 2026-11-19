/**
 * M3: ambient news (AmbientDef): at an ambient tick (GlobalParams.ambient.everyYears), outside fastForward, useBank and
 * projections, while feature 'ambient' is on, at most one templated headline, least recently printed first.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND } from '../types';
import type { AmbientDef, Content, GameState, NewsItem } from '../types';
import { evalCond, statValue } from './conditions';
import { DEFAULT_AMBIENT } from './constants';
import { featureOn } from './features';
import { fillText, textItem } from './headlines';
import { fin, mix32 } from './util';

export function ambientCfg(content: Content): { everyYears: number; cooldownYears: number } {
  const a = content.global?.ambient;
  const pos = (x: number | undefined, d: number) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : d);
  return { everyYears: pos(a?.everyYears, DEFAULT_AMBIENT.everyYears), cooldownYears: Math.max(0, fin(a?.cooldownYears ?? DEFAULT_AMBIENT.cooldownYears, DEFAULT_AMBIENT.cooldownYears)) };
}

/** {value}: 3 significant figures with thousands commas. */
export function fmtValue(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return '0';
  const r = Number(v.toPrecision(3));
  const a = Math.abs(r);
  if (a >= 100) {
    const int = Math.round(a).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (r < 0 ? '-' : '') + int;
  }
  return String(r);
}
/** The number placeholders of a template (AmbientDef): {value}, {pct}, {fold}; none without `stat`. */
export function statPlaceholders(v: number | null): Record<string, string> {
  if (v === null || !Number.isFinite(v)) return {};
  return { value: fmtValue(v), pct: String(Math.round(v * 100)), fold: v.toFixed(1) };
}

/** The step's ambient tick from `prev` to `next` (conditions read `prev`): pushes at most one item and returns the
 *  new ambientLast (or the same object). Caller has checked: not away, not lite, not pending, not fresh. */
export function stepAmbient(prev: GameState, next: GameState, content: Content, year: number, items: NewsItem[]): GameState {
  const defs = content.ambient;
  if (!defs || !defs.length || !featureOn(content, prev.meta, 'ambient')) return next;
  const cfg = ambientCfg(content);
  const k1 = Math.floor((next.time * YEARS_PER_SECOND) / cfg.everyYears + 1e-9);
  if (k1 <= Math.floor((prev.time * YEARS_PER_SECOND) / cfg.everyYears + 1e-9)) return next;
  const last = prev.ambientLast ?? {};
  const cands: AmbientDef[] = [];
  for (const d of defs) {
    if (d.sector !== undefined) { const es = prev.sectors[d.sector]; if (!es?.open || es.settled) continue; }
    const t = last[d.id];
    const cd = (d.cooldownYears ?? cfg.cooldownYears) / YEARS_PER_SECOND;
    if (t !== undefined && next.time - t < cd) continue;
    if (!d.text?.length || !evalCond(prev, content, d.when)) continue;
    cands.push(d);
  }
  if (!cands.length) return next;
  // least recently printed (never first); ties by weight
  let best = Infinity;
  for (const d of cands) best = Math.min(best, last[d.id] ?? -Infinity);
  const tied = cands.filter((d) => (last[d.id] ?? -Infinity) === best);
  const w = (d: AmbientDef) => (d.weight !== undefined && Number.isFinite(d.weight) && d.weight >= 0 ? d.weight : 1);
  let total = 0;
  for (const d of tied) total += w(d);
  const u = mix32((prev.seed ^ Math.imul(k1, 0x85EBCA6B)) >>> 0) / 4294967296;
  let pick = tied[0], run = 0;
  if (total > 0) for (const d of tied) { run += w(d) / total; if (run > u) { pick = d; break; } }
  const text = pick.text[mix32((prev.seed ^ k1) >>> 0) % pick.text.length];
  const v = pick.stat ? statValue(prev, content, pick.stat) : null;
  items.push(textItem('ambient', fillText(prev, content, text, { year, extra: statPlaceholders(v) }, pick.sector), next.time, year, pick.sector));
  return { ...next, ambientLast: { ...last, [pick.id]: next.time } };
}
