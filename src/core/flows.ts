/**
 * Whole-state flows (every open sector solved in solve order, with spill and drawsOn), cached per state object; the
 * pending Reckoning; the shadow and the instruments read from it (direct rebound, frontier fold).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { EXHAUSTED_BELOW } from '../types';
import type { Content, GameState, ReckoningCause, SectorDef, SectorId, SectorState } from '../types';
import { POP_MIN, REBOUND_MIN_FOLD } from './constants';
import { idx } from './contentIndex';
import { modsOf } from './effects';
import { sectorLevers, NO_LEVERS, leverNetUpkeep, mandateShareOf } from './levers';
import { solveSector } from './solver';
import type { SectorFlow } from './solver';
import { budgetROf } from './steady';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* Whole-state flows (cached per state object)                         */
/* ------------------------------------------------------------------ */

export interface Flows {
  sectors: Record<SectorId, SectorFlow>;
  /** Inputs each sector was solved with (re-used by the shadow solve). */
  inputs: Record<SectorId, { extraD: number; spillMul: number; capR: number }>;
  wellbeing: number;
  income: number;
  levyRevenue: number;
  treasuryLevy: number;
  mandateGain: number;
  upkeep: number;
  pending: { cause: ReckoningCause; sector?: SectorId } | null;
}

function pendingOf(state: GameState, content: Content): { cause: ReckoningCause; sector?: SectorId } | null {
  const ids = idx(content).ids;
  for (const s of ids) {
    const es = state.sectors[s];
    if (es?.open && content.sectors[s].resourceKind === 'stock' && es.reserve <= EXHAUSTED_BELOW * es.reserveMax) return { cause: 'exhausted', sector: s };
  }
  for (const s of ids) {
    const es = state.sectors[s];
    const def = content.sectors[s];
    if (es?.open && def.collapseAt > 0 && es.pressure >= def.collapseAt) return { cause: 'collapse', sector: s };
  }
  return null;
}

const flowsCache = new WeakMap<GameState, { content: Content; flows: Flows }>();
export function computeFlows(state: GameState, content: Content): Flows {
  const hit = flowsCache.get(state);
  if (hit && hit.content === content) return hit.flows;
  const ix = idx(content);
  const mods = modsOf(state, content);
  const levs = sectorLevers(state, content);
  const N = Math.max(POP_MIN, fin(state.population, 1));
  const spill: Record<string, number> = {};
  const extra: Record<string, number> = {};
  const sectors: Record<SectorId, SectorFlow> = {};
  const inputs: Flows['inputs'] = {};
  let wellbeing = 0, income = 0, levy = 0, treasury = 0;
  for (const s of ix.solveOrder) {
    const es = state.sectors[s];
    if (!es || !es.open) continue;
    const def = content.sectors[s];
    const lev = levs[s] ?? NO_LEVERS;
    let capR = Infinity;
    if (Number.isFinite(lev.capFrac)) {
      const b = budgetROf(es, def, content, state.time);
      if (b !== null) capR = lev.capFrac * b;
    }
    const inp = { extraD: extra[s] ?? 0, spillMul: spill[s] ?? 1, capR };
    const f = solveSector(def, es, N, mods, lev, inp.extraD, inp.spillMul, capR);
    sectors[s] = f;
    inputs[s] = inp;
    wellbeing += f.wellbeingShare;
    income += f.income;
    levy += f.dutyRevenue + f.permitRevenue;
    treasury += f.treasuryLevy;
    if (def.spill && state.sectors[def.spill.to]?.open && es.basePs > 0) {
      const a = def.spill.rate * (1 - lev.green) * Math.max(0, 1 - f.ps / es.basePs);
      spill[def.spill.to] = (spill[def.spill.to] ?? 1) * (1 + Math.max(0, a));
    }
    if (def.drawsOn && state.sectors[def.drawsOn.sector]?.open) {
      extra[def.drawsOn.sector] = (extra[def.drawsOn.sector] ?? 0) + Math.max(0, def.drawsOn.perService * f.D);
    }
  }
  wellbeing = Math.max(0, fin(wellbeing + mods.wellbeingAdd));
  const g = content.global;
  const mandateGain = g.mandateRate * Math.max(0, wellbeing - g.mandateFloor) * mods.mandateRateMul + mandateShareOf(content) * treasury;
  let upkeep = 0;
  for (const def of content.levers ?? []) {
    const ls = state.levers[def.id];
    if (ls && ls.level > 0) upkeep += leverNetUpkeep(def, ls.level, mods.startLevers[def.id] ?? 0);
  }
  const flows: Flows = {
    sectors, inputs, wellbeing, income: fin(income), levyRevenue: fin(levy), treasuryLevy: fin(treasury),
    mandateGain: fin(mandateGain), upkeep: fin(upkeep), pending: pendingOf(state, content),
  };
  flowsCache.set(state, { content, flows });
  return flows;
}

/** The shadow (η frozen at etaAtBase, everything else identical), lazily per sector, cached per flows object. */
const shadowCache = new WeakMap<Flows, Record<SectorId, number>>();
function shadowR(state: GameState, content: Content, fl: Flows, s: SectorId): number {
  let rec = shadowCache.get(fl);
  if (!rec) { rec = {}; shadowCache.set(fl, rec); }
  const hit = rec[s];
  if (hit !== undefined) return hit;
  const es = state.sectors[s];
  const f = fl.sectors[s];
  const inp = fl.inputs[s];
  let r = 0;
  if (es && f && inp && es.baseR > 0) {
    const etaBase = es.etaAtBase > 0 ? es.etaAtBase : f.eta / (f.etaFold || 1);
    if (Math.abs(etaBase - f.eta) <= 1e-12 * f.eta) r = f.R; // identical solve
    else {
      const def = content.sectors[s];
      const lev = sectorLevers(state, content)[s] ?? NO_LEVERS;
      r = solveSector(def, es, Math.max(POP_MIN, fin(state.population, 1)), modsOf(state, content), lev, inp.extraD, inp.spillMul, inp.capR, etaBase).R;
    }
  }
  rec[s] = fin(r);
  return rec[s];
}

interface Instruments { shadowR: number; promisedR: number; rebound: number | null; frontierFold: number }
export function instruments(state: GameState, content: Content, fl: Flows, s: SectorId): Instruments {
  const es = state.sectors[s];
  const f = fl.sectors[s];
  if (!es || !f || !(es.baseR > 0)) return { shadowR: 0, promisedR: 0, rebound: null, frontierFold: 1 };
  const sh = shadowR(state, content, fl, s);
  const promised = f.etaFold > 0 ? sh / f.etaFold : 0;
  const rebound = f.etaFold > REBOUND_MIN_FOLD && sh > 0 && sh - promised > 1e-9 * sh
    ? fin((f.R - promised) / (sh - promised)) : null;
  return { shadowR: sh, promisedR: fin(promised), rebound, frontierFold: fin(sh / es.baseR, 1) };
}

export function reserveFractionOf(def: SectorDef, es: SectorState, f: SectorFlow): number {
  return def.resourceKind === 'stock'
    ? (es.reserveMax > 0 ? clamp(es.reserve / es.reserveMax, 0, 1) : 0)
    : clamp(1 - f.util, 0, 1);
}
