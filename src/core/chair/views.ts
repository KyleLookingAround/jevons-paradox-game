/**
 * M5 (Core B): Derived.chair (ChairView) and the M5 parts of SectorDerived and AppDerived that are Core B's (water, the
 * charge part, preview under the Chair, the regime label, canFound in a chair sector), with Core A's parts (the rival's
 * view, inspectors, loopholes, the inspection fields) from its modules. Layer 12 (beside derive.ts).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { ChairView, Content, GameState, SectorDerived, SectorId } from '../../types';
import { yearAt } from '../calendar';
import { evalCond } from '../conditions';
import { idx } from '../contentIndex';
import { modsOf } from '../effects';
import { featureOn } from '../features';
import type { Flows } from '../flows';
import type { SectorFlow } from '../solver';
import { fin } from '../util';
import { chairIdx } from './chairIndex';
import { chairOn, confidenceParts, forecastOf, pledgeViews } from './elections';
import { compensationOf, treasuryOf } from './treasury';
import { rivalView } from './rival';
import { inspectorsView, sectorInspectFields } from './inspect';
import { loopholeViews } from './loopholes';

/** SectorDerived.preview under M5: act.preview, or a chair act before office is taken. */
export function previewOf(state: GameState, content: Content, s: SectorId): boolean {
  const ix = idx(content);
  if (ix.preview.has(s)) return true;
  return !state.meta.office && chairIdx(content).chairSet.has(s);
}

/** The M5 fields of SectorDerived that are Core B's, plus stand-ins for Core A's (reportedR, rival, inspection). */
export function sectorM5(state: GameState, content: Content, s: SectorId, f: SectorFlow): Partial<SectorDerived> {
  const ch = state.chair;
  const def = content.sectors[s];
  return {
    ...sectorInspectFields(state, content, s, f.R),
    preview: previewOf(state, content, s),
    chargePart: f.chargePart ?? 0,
    water: def.hiddenFlow ? { applied: fin(f.rApplied ?? f.R), consumed: f.R, returnShare: f.ret ?? 0 } : null,
    rivalBought: ch && chairIdx(content).chairSet.has(s) ? rivalBoughtIn(state, content, s) : null,
  };
}
/** M5 (follow-up 3): the rival's card purchases in chair sector s this run, as levels (in a Ministry every level of a
 *  chair sector's cards is his: the player cannot buy them). Exact, unlike a count of the trimmed event list. */
function rivalBoughtIn(state: GameState, content: Content, s: SectorId): number {
  let n = 0;
  for (const u of content.upgrades ?? []) if (u.sector === s) n += state.upgrades[u.id] ?? 0;
  return n;
}

/** AppDerived.regime: 'elastic' when (p_seen / p_half)^k > 1 (adoption below half), else 'saturated'. */
export function regimeOf(content: Content, s: SectorId, i: number, seen: number, mods: ReturnType<typeof modsOf>): 'elastic' | 'saturated' {
  const a = content.sectors[s].applications[i];
  const half = a.halfPrice * (mods.halfMulSector[s] ?? 1) * (mods.halfMulApp[a.id] ?? 1);
  return half > 0 && seen > half ? 'elastic' : 'saturated';
}

/** Derived.chair: null outside office or while feature 'chair' is off. */
export function chairView(state: GameState, content: Content, fl: Flows): ChairView | null {
  const ch = state.chair;
  if (!ch || !chairOn(state, content) || !content.rival) return null;
  const cd = content.chair!;
  const show = !cd.showTarget || evalCond(state, content, cd.showTarget);
  const par = ch.parliament;
  const insp = featureOn(content, state.meta, 'inspection');
  const treas = featureOn(content, state.meta, 'treasury');
  const compensation: ChairView['compensation'] = {};
  if (treas) for (const s of chairIdx(content).chairSectors) if (state.sectors[s]?.open) compensation[s] = compensationOf(state, content, s, fl);
  return {
    confidence: ch.confidence,
    target: show ? confidenceParts(state, content, fl).target : null,
    forecast: show ? forecastOf(state, content, fl) : null,
    winAt: cd.confidence.winAt,
    parliament: {
      index: par.index, pollIn: Math.max(0, fin(par.pollAt - state.time)), offer: pledgeViews(content, par.offer), chosen: par.chosen ? par.chosen.slice() : null,
      keep: cd.elections.keep, pollYear: Math.floor(yearAt(state, content, par.pollAt)),
    },
    pledges: pledgeViews(content, ch.pledges) ?? [],
    inOpposition: ch.inOpposition, lostInARow: ch.lostInARow, electionsWon: ch.electionsWon,
    canCampaign: ch.inOpposition && state.mandate > 0 && !fl.pending,
    inspectors: insp ? inspectorsView(state, content) : { ready: 0, total: 0, nextReadyIn: null, readyIn: [] },
    rival: rivalView(state, content)!,
    treasury: treas ? treasuryOf(state, content, fl) : null,
    loopholes: featureOn(content, state.meta, 'loopholes') ? loopholeViews(state, content) : [],
    repealed: ch.repealed.slice(),
    compensation,
  };
}
