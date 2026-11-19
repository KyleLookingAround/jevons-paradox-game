/**
 * Sector unlocks: which closed sectors may open next, whether one opens, and the checklist shown for each.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Cond, CondCheck, Content, Derived, GameState, SectorId } from '../types';
import { evalCond, condCheck, fmtNum } from './conditions';
import { idx } from './contentIndex';
import { computeFlows } from './flows';
import { clamp } from './util';

/* ------------------------------------------------------------------ */
/* Unlocks                                                             */
/* ------------------------------------------------------------------ */

function afterOf(content: Content, s: SectorId): SectorId[] {
  const ix = idx(content);
  const k = ix.pos.get(s) ?? 0;
  return content.sectors[s].unlock?.after ?? (k > 0 ? [ix.ids[k - 1]] : []);
}

/** Legacy price gate on the default predecessor. */
function legacyGate(state: GameState, content: Content, s: SectorId): { met: boolean; now: number; need: number; pred: SectorId } | null {
  const u = content.sectors[s].unlock;
  if (!u || u.when || u.prevServicePriceBelow === undefined) return null;
  const ix = idx(content);
  const pred = ix.ids[(ix.pos.get(s) ?? 0) - 1];
  const f = pred ? computeFlows(state, content).sectors[pred] : undefined;
  const now = f ? f.ps : Infinity;
  return { met: !!f && now < u.prevServicePriceBelow, now, need: u.prevServicePriceBelow, pred };
}

export function canOpen(state: GameState, content: Content, s: SectorId): boolean {
  const ix = idx(content);
  if ((ix.pos.get(s) ?? 0) === 0) return true;
  if (!afterOf(content, s).every((a) => !!state.sectors[a]?.open)) return false;
  const u = content.sectors[s].unlock;
  if (!u) return true;
  if (state.meta.reckonings < (u.minReckonings ?? 0)) return false;
  if (u.when) return evalCond(state, content, u.when);
  const lg = legacyGate(state, content, s);
  return lg ? lg.met : true;
}

export function nextSectorsOf(state: GameState, content: Content): Derived['nextSectors'] {
  const ix = idx(content);
  const out: Derived['nextSectors'] = [];
  for (let k = 1; k < ix.ids.length; k++) {
    const s = ix.ids[k];
    if (state.sectors[s]?.open) continue;
    if (!afterOf(content, s).every((a) => !!state.sectors[a]?.open)) continue;
    const u = content.sectors[s].unlock;
    const need = u?.minReckonings ?? 0;
    let checklist: CondCheck[] = [];
    if (u?.when) {
      const w = u.when as Record<string, unknown>;
      checklist = 'all' in w && Array.isArray(w.all) ? (w.all as Cond[]).map((c) => condCheck(state, content, c)) : [condCheck(state, content, u.when)];
    } else {
      const lg = legacyGate(state, content, s);
      if (lg) {
        checklist = [{
          label: `${content.sectors[lg.pred]?.name ?? lg.pred} service price < ${fmtNum(lg.need)}`, met: lg.met,
          progress: lg.met ? 1 : lg.now > 0 && Number.isFinite(lg.now) ? clamp(lg.need / lg.now, 0, 1) : 0,
        }];
      }
    }
    out.push({ id: s, reckoningsNeeded: need, reckoningsHave: state.meta.reckonings, checklist, ready: canOpen(state, content, s) });
  }
  return out;
}
