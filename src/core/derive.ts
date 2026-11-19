/**
 * derive(): the Derived view the UI reads every frame (flows, instruments, budgets, Hindsight, next sectors).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { EXHAUSTED_BELOW } from '../types';
import type { AppDerived, Content, Derived, GameState, SectorDerived, SectorId } from '../types';
import { calendarYear, currentAge } from './calendar';
import { idx } from './contentIndex';
import { modsOf } from './effects';
import { computeFlows, instruments, reserveFractionOf } from './flows';
import { hindsightTerms } from './hindsight';
import { sectorLevers, NO_LEVERS } from './levers';
import { popGrowthRate } from './population';
import { isFreshRun, slotsUsed } from './prestige';
import { budgetROf, isWithin } from './steady';
import { nextSectorsOf } from './unlocks';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* Derive                                                              */
/* ------------------------------------------------------------------ */

export function derive(state: GameState, content: Content): Derived {
  const fl = computeFlows(state, content);
  const g = content.global;
  const ix = idx(content);
  const levs = sectorLevers(state, content);
  const mods = modsOf(state, content);
  const sectors: Record<SectorId, SectorDerived> = {};
  for (const s of ix.ids) {
    const f = fl.sectors[s];
    const es = state.sectors[s];
    if (!f || !es) continue;
    const def = content.sectors[s];
    const lev = levs[s] ?? NO_LEVERS;
    const ins = instruments(state, content, fl, s);
    const apps: Record<string, AppDerived> = {};
    def.applications.forEach((a, i) => {
      const st = es.apps[a.id];
      const sat = f.appSat[i];
      apps[a.id] = {
        available: !!st?.available, founded: !!st?.founded, demand: f.appD[i],
        adoption: sat > 0 ? clamp(f.appD[i] / sat, 0, 1) : 0,
        canFound: !!st?.available && !st.founded && state.capital >= a.foundCost && !fl.pending,
      };
    });
    let secondsLeft = Infinity;
    if (def.resourceKind === 'stock') {
      const drain = f.R * (1 - lev.circ) - f.reserveGain;
      if (drain > 0) secondsLeft = Math.max(0, es.reserve - EXHAUSTED_BELOW * es.reserveMax) / drain;
    }
    const budgetR = budgetROf(es, def, content, state.time);
    const withinBudget = isWithin(f.R, budgetR);
    sectors[s] = {
      eta: f.eta, etaFold: f.etaFold, resourcePrice: f.pr, resourcePriceBase: f.prBase, permitPrice: f.permit,
      capCost: f.c, margin: f.m, substitutedShare: f.sigma, preLevyPrice: f.pPre, permitPart: f.permitPart,
      dutyPart: f.dutyPart, servicePrice: f.ps, demand: f.D, resourceUse: f.R,
      rFold: es.baseR > 0 ? fin(f.R / es.baseR, 1) : 1,
      shadowR: ins.shadowR, promisedR: ins.promisedR, rebound: ins.rebound, frontierFold: ins.frontierFold,
      income: f.income, levyRevenue: f.dutyRevenue + f.permitRevenue,
      reserveFraction: reserveFractionOf(def, es, f), secondsLeft,
      pressureFraction: def.collapseAt > 0 ? Math.max(0, es.pressure / def.collapseAt) : 0,
      nextCrisisFraction: es.crisesFired < def.crisisAt.length ? def.crisisAt[es.crisesFired] : null,
      trendR: es.trendR, budgetR, withinBudget,
      decoupling: withinBudget && fl.wellbeing >= g.wellbeingTarget && !fl.pending,
      steadyYears: es.steadyYears, budgetDecades: es.decadesWithin.length, wellbeingShare: f.wellbeingShare, apps,
    };
  }
  const terms = hindsightTerms(state, content);
  return {
    year: calendarYear(state, content),
    age: currentAge(state, content)?.id ?? null,
    wellbeing: fl.wellbeing,
    incomePerSec: fl.income,
    clickValue: fl.pending ? 0 : fin(g.clickFlat + g.clickSeconds * fl.income),
    mandatePerSec: fl.mandateGain - fl.upkeep,
    populationGrowthPerSec: popGrowthRate(fl.wellbeing, content, mods) * state.population,
    pendingReckoning: fl.pending,
    hindsightIfReckonNow: terms.total,
    hindsightTerms: terms,
    sectors,
    nextSectors: nextSectorsOf(state, content),
    freshRun: isFreshRun(state),
    slots: { total: state.meta.slots, used: slotsUsed(state.meta, content) },
  };
}
