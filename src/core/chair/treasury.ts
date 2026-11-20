/**
 * M5 (Core B): the Treasury. In a Ministry GameState.capital is the Treasury: it takes ChairDef.treasury.taxShare of
 * the rival's income and levyShare of the levy routed 'treasury', plus the income of any sector the player still runs
 * (none in M5 content), all × (1 − Σ PledgeDef.treasuryShare of pledges in force). compensate() spends it; a 'subsidy'
 * lever spends it when the rival buys a target (subsidyShareOf / paySubsidy, called by the rival's purchase). Layer 6.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { SUBSIDY_MAX, YEARS_PER_SECOND } from '../../types';
import type { Content, GameState, SectorId } from '../../types';
import { calendarYear } from '../calendar';
import { idx } from '../contentIndex';
import { modsOf } from '../effects';
import { emit } from '../events';
import { featureOn } from '../features';
import { computeFlows } from '../flows';
import type { Flows } from '../flows';
import { headline, newsWith } from '../headlines';
import { leverLevelDef } from '../levers';
import { clamp, fin } from '../util';
import { chairIdx } from './chairIndex';
import { effectiveLevel } from './acting';

/** A rival sector: an open chair sector, or a capstoned one, in a Ministry. */
export function isRivalSectorB(state: GameState, content: Content, s: SectorId): boolean {
  if (!state.chair) return false;
  const es = state.sectors[s];
  return !!es?.open && (chairIdx(content).chairSet.has(s) || !!es.capstoned);
}

/** The rival's income per second (before tax), total and by sector, from the flows. 0 outside a Ministry. */
export function rivalIncomeOf(state: GameState, content: Content, fl: Flows): { total: number; bySector: Record<SectorId, number> } {
  const bySector: Record<SectorId, number> = {};
  let total = 0;
  if (!state.chair) return { total, bySector };
  for (const s of idx(content).ids) {
    const f = fl.sectors[s];
    if (!f || !isRivalSectorB(state, content, s)) continue;
    bySector[s] = f.income;
    total += f.income;
  }
  return { total: fin(total), bySector };
}

/** The Treasury's income per second and its parts (Derived.incomePerSec in a Ministry; ChairView.treasury). */
export function treasuryOf(state: GameState, content: Content, fl: Flows): { perSec: number; taxPerSec: number; levyPerSec: number } {
  const t = content.chair?.treasury;
  const rv = rivalIncomeOf(state, content, fl).total;
  const own = Math.max(0, fl.income - rv);
  const taxPerSec = clamp(fin(t?.taxShare ?? 0), 0, 1) * rv;
  const levyPerSec = clamp(fin(t?.levyShare ?? 0), 0, 1) * fl.treasuryLevy;
  let share = 0;
  const px = chairIdx(content).pledges;
  for (const id of state.chair?.pledges ?? []) share += clamp(fin(px.get(id)?.treasuryShare ?? 0), 0, 1);
  const keep = 1 - clamp(share, 0, 1);
  return { perSec: fin((taxPerSec + levyPerSec + own) * keep), taxPerSec: fin(taxPerSec * keep), levyPerSec: fin(levyPerSec * keep) };
}

/** What the step adds to capital per second: the flows' income outside a Ministry (M4), the Treasury's inside. */
export function capitalPerSec(state: GameState, content: Content, fl: Flows): number {
  return state.chair ? treasuryOf(state, content, fl).perSec : fl.income;
}

/* ------------------------------------------------------------------ */
/* Compensation                                                        */
/* ------------------------------------------------------------------ */

/** compensate(s)'s cost now and whether it would be accepted. */
export function compensationOf(state: GameState, content: Content, s: SectorId, fl?: Flows): { canCompensate: boolean; cost: number; until: number | null } {
  const ch = state.chair;
  const cd = content.chair;
  if (!ch || !cd) return { canCompensate: false, cost: 0, until: null };
  const flows = fl ?? computeFlows(state, content);
  const f = flows.sectors[s];
  const peak = ch.rival.peakIncome[s] ?? 0;
  const lost = f ? Math.max(0, peak - f.income) : 0;
  const cost = fin(Math.max(0, fin(cd.compensation.costYears)) / YEARS_PER_SECOND * lost * fin(modsOf(state, content).compensationMul, 1));
  const held = ch.compensated[s] ?? null;
  const until = held !== null && held > state.time ? held : null;
  const ok = featureOn(content, state.meta, 'treasury') && !flows.pending && chairIdx(content).chairSet.has(s) && !!state.sectors[s]?.open
    && lost > 0 && until === null && state.capital >= cost;
  return { canCompensate: ok, cost, until };
}

/** ModelApi.compensate (a decision). */
export function compensate(state: GameState, content: Content, s: SectorId): GameState {
  const ch = state.chair;
  if (!ch || !content.chair) return state;
  const c = compensationOf(state, content, s);
  if (!c.canCompensate) return state;
  const years = Math.max(0, fin(content.chair.compensation.years));
  const year = calendarYear(state, content);
  const next: GameState = {
    ...state, capital: fin(state.capital - c.cost),
    chair: { ...ch, compensated: { ...ch.compensated, [s]: state.time + years / YEARS_PER_SECOND } },
    ...newsWith(state, content, [headline(state, content, 'compensated', state.time, { year }, s)]),
  };
  return emit(next, [{ kind: 'compensated', sector: s, by: 'player' }], state.time, year);
}

/* ------------------------------------------------------------------ */
/* Subsidy                                                             */
/* ------------------------------------------------------------------ */

/** The share of target `id`'s capital cost the Treasury pays when the rival buys it (the largest 'subsidy' lever value
 *  in force naming it; 0 outside a Ministry). */
export function subsidyShareOf(state: GameState, content: Content, id: string): number {
  if (!state.chair) return 0;
  let best = 0;
  for (const def of content.levers ?? []) {
    if (def.kind !== 'subsidy' || !def.targets?.includes(id)) continue;
    const L = effectiveLevel(state, def.id);
    if (!(L > 0)) continue;
    const v = leverLevelDef(def, L)?.value ?? 0;
    if (v > best) best = v;
  }
  return clamp(fin(best), 0, SUBSIDY_MAX);
}

/** The Treasury's part of a rival purchase of `id` costing `cost`: { rivalPays, treasuryPays }; the Treasury pays only
 *  if it can pay its share in full (else the rival pays the whole). */
export function subsidySplit(state: GameState, content: Content, id: string, cost: number): { rivalPays: number; treasuryPays: number } {
  const sh = subsidyShareOf(state, content, id);
  const tp = sh * cost;
  if (!(sh > 0) || !(state.capital >= tp)) return { rivalPays: cost, treasuryPays: 0 };
  return { rivalPays: fin(cost - tp), treasuryPays: fin(tp) };
}
