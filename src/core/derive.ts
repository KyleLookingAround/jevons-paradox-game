/**
 * derive(): the Derived view the UI reads every frame (flows, instruments, budgets, Hindsight, next sectors).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { EXHAUSTED_BELOW, YEARS_PER_SECOND } from '../types';
import type { AppDerived, Content, Derived, GameState, SectorDerived, SectorId } from '../types';
import { calendarYear, currentAge } from './calendar';
import { idx } from './contentIndex';
import { modsOf } from './effects';
import { commonsOpen } from './commons';
import { computeFlows, instruments, reserveFractionOf, steadyView } from './flows';
import { hindsightTerms } from './hindsight';
import { sectorLevers, NO_LEVERS } from './levers';
import { offlineCapOf } from './offline';
import { ordersView } from './orders';
import { popGrowthRate } from './population';
import { isFreshRun, slotsUsed, respecRefunds } from './prestige';
import { stageOf } from './purchases';
import { canSettle } from './settlement';
import { standingDrawYearsOf } from './steady';
import { nextSectorsOf } from './unlocks';
import { featuresView } from './features';
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
  const features = featuresView(state, content);
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
        canFound: !!st?.available && !st.founded && state.capital >= a.foundCost && !fl.pending && !es.settled,
      };
    });
    let secondsLeft = Infinity;
    if (def.resourceKind === 'stock' && !es.settled) {
      const drain = f.R * (1 - lev.circ) - f.reserveGain;
      if (drain > 0) secondsLeft = Math.max(0, es.reserve - EXHAUSTED_BELOW * es.reserveMax) / drain;
    }
    const sv = steadyView(state, content, fl, s);
    const budgetR = sv.budgetR;
    const withinBudget = sv.withinBudget;
    const sd = fl.settled[s];
    const lean = (es.decadesLean ?? []).filter((x) => x).length;
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
      decoupling: sv.decoupling,
      steadyYears: es.steadyYears, budgetDecades: es.decadesWithin.length, wellbeingShare: f.wellbeingShare, apps,
      decadeWellbeing: sv.decadeW, leanDecades: lean, pace: es.budget?.pace ?? null, clearP: features.clearSkies ? sv.clearP : null, clear: sv.clear,
      sinkR: features.clearSkies ? sv.sinkR : null, clearYears: es.clearYears ?? 0, sinkHeld: sv.sinkHeld, settled: !!es.settled,
      canSettle: canSettle(state, content, s), settleExcess: sd?.excess ?? 0, settleDefence: sd?.defence ?? 0,
      stage: stageOf(state, content, s),
      standingDrawIn: Number.isFinite(lev.capFrac) && !es.budget
        ? Math.max(0, standingDrawYearsOf(def, content) - es.openFor * YEARS_PER_SECOND) : null,
    };
  }
  const terms = hindsightTerms(state, content);
  const fresh = isFreshRun(state);
  const refundByTree = respecRefunds(state, content);
  const respecAny = Object.values(state.meta.knowhow).some((l) => (l ?? 0) > 0);
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
    freshRun: fresh,
    slots: { total: state.meta.slots, used: slotsUsed(state.meta, content) },
    populationRef: Math.max(1, state.peakPopulation, state.meta.peakPopulationEver ?? 1),
    offlineCapSeconds: offlineCapOf(content, mods),
    charterOffer: fresh ? (state.charterOffer ?? []).slice() : [],
    charter: state.meta.charter ?? null,
    commons: { available: commonsOpen(state, content), fund: state.commons?.fund ?? 0, wellbeing: fl.commonsWellbeing },
    orders: ordersView(state, content),
    respec: { allowed: fresh && respecAny, refund: Object.values(refundByTree).reduce((a, b) => a + b, 0), refundByTree },
    features,
  };
}
