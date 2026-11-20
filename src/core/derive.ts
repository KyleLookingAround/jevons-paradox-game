/**
 * derive(): the Derived view the UI reads every frame (flows, instruments, budgets, Hindsight, next sectors).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { EXHAUSTED_BELOW, YEARS_PER_SECOND, STEADY_STATE_YEARS } from '../types';
import type { AppDerived, Content, Derived, GameState, SectorDerived, SectorId } from '../types';
import { calendarYear, currentAge } from './calendar';
import { idx } from './contentIndex';
import { endingYearsOf, settledCount, holdTotal } from './ending';
import { modsOf, isForbidden, institutionMax } from './effects';
import { archiveCounts } from './archive';
import { bankView } from './bank';
import { dispatchesView } from './dispatch';
import { clearedThisRun } from './history';
import { loadView } from './load';
import { modifierViews } from './modifiers';
import { foundCostOf } from './purchases';
import { surveyView } from './returns';
import { seamsView } from './seams';
import { appWanted, seamWanted } from './temptation';
import type { SeamsView } from '../types';
import { travelView } from './travel';
import { commonsOpen } from './commons';
import { computeFlows, instruments, reserveFractionOf, steadyView } from './flows';
import { hindsightTerms } from './hindsight';
import { sectorLevers, NO_LEVERS } from './levers';
import { offlineCapOf } from './offline';
import { ordersView } from './orders';
import { popGrowthRate } from './population';
import { isFreshRun, slotsUsed, respecRefunds, institutionNeeds } from './prestige';
import { stageOf } from './purchases';
import { canSettle, settleRoom, roomCount, settleBlockedOf } from './settlement';
import { accountOn, fullAccount } from './account';
import { drawnByOf, secondsLeftOf, stockView, surveyRevealView, yearsLeftOf } from './views4';
import { appFeedsView, feedsView, fedInto } from './orderBook';
import { feedsKnown } from './temptation';
import { renewableOf } from './renewable';
import { evalCond } from './conditions';
import { currentAct, endingAct, endingSectors } from './acts';
import { standingDrawYearsOf } from './steady';
import { nextSectorsOf } from './unlocks';
import { featuresView, featureOn } from './features';
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
  const m4 = ix.anyM4;
  const acct = accountOn(content, state.meta) ? fullAccount(state, content, fl) : null;
  for (const s of ix.ids) {
    const f = fl.sectors[s];
    const es = state.sectors[s];
    if (!f || !es) continue;
    const def = content.sectors[s];
    const lev = levs[s] ?? NO_LEVERS;
    void lev;
    const ins = instruments(state, content, fl, s);
    const rn = renewableOf(def);
    const hidden = !!rn && def.pressureSource === 'depletion' && !mods.survey.has(s); // M4: no sink line while unsurveyed
    const known = !m4 || !ix.feedTargets.has(s) || feedsKnown(state, content, s); // M4 (amend)
    const apps: Record<string, AppDerived> = {};
    const frozenSeen = es.settled?.appPriceSeen;
    let freeBill = 0, freeD = 0, anySeen = false;
    def.applications.forEach((a, i) => {
      const st = es.apps[a.id];
      const sat = f.appSat[i];
      const cost = foundCostOf(a, s, mods);
      const forbidden = isForbidden(mods, a.id);
      const seen = es.settled ? (frozenSeen?.[a.id] ?? f.ps) : f.appSeen ? f.appSeen[i] : f.ps;
      if (st?.founded && seen !== f.ps) {
        anySeen = true;
        if (seen < f.ps) { freeBill += (f.ps - seen) * f.appD[i]; freeD += f.appD[i]; }
      }
      apps[a.id] = {
        available: !!st?.available, founded: !!st?.founded, demand: f.appD[i],
        adoption: sat > 0 ? clamp(f.appD[i] / sat, 0, 1) : 0,
        canFound: !!st?.available && !st.founded && state.capital >= cost && !fl.pending && !es.settled && !forbidden,
        priceSeen: seen, foundCost: cost, forbidden,
        wantedChange: es.budget ? appWanted(state, content, s, a) : null,
        feeds: m4 && known ? appFeedsView(state, content, s, i) : null,
        feedsKnown: known,
      };
    });
    const secondsLeft = secondsLeftOf(state, content, fl, levs, s);
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
      decadeWellbeing: sv.decadeW, leanDecades: lean, pace: es.budget?.pace ?? null, clearP: features.clearSkies && !hidden ? sv.clearP : null, clear: sv.clear,
      sinkR: features.clearSkies && !hidden ? sv.sinkR : null, clearYears: es.clearYears ?? 0, sinkHeld: sv.sinkHeld, settled: !!es.settled,
      canSettle: canSettle(state, content, s), settleExcess: sd?.excess ?? 0, settleDefence: sd?.defence ?? 0,
      stage: stageOf(state, content, s),
      standingDrawIn: Number.isFinite(lev.capFrac) && !es.budget
        ? Math.max(0, standingDrawYearsOf(def, content) - es.openFor * YEARS_PER_SECOND) : null,
      seams: seamsWithTrade(state, content, s, seamsView(state, content, s, mods)),
      load: features.load ? loadView(def, es, f) : null,
      travel: features.travel ? travelView(def, es, f, state.population) : null,
      free: features.freeAtUse && anySeen ? { bill: fin(freeBill), freeShare: f.D > 0 ? fin(freeD / f.D) : 0 } : null,
      upkeep: def.pressureUpkeep > 0 ? {
        share: f.capacity > 0 ? Math.min(0.95, fin(es.pressure * def.pressureUpkeep / f.capacity)) : 0,
        deletionOut: f.deletionOut, pressureIn: f.pressureIn,
      } : null,
      // M4 (always written)
      preview: ix.preview.has(s), capstoned: !!es.capstoned, arrears: !!es.arrears,
      drawnBy: m4 && ix.drawers.has(s) ? drawnByOf(state, content, fl, levs, s) : null,
      feeds: m4 && known && ix.feedTargets.has(s) ? feedsView(state, content, s) : null,
      fed: m4 && ix.feedsInto[s] ? fedInto(state, content, s) : null,
      settleBlocked: settleBlockedOf(state, content, s, sv.sinkHeld),
      stock: m4 && rn ? stockView(state, content, s, f, mods) : null,
      fullR: acct ? acct.fullR[s] ?? null : null,
      embodied: acct ? acct.embodied[s] ?? [] : null,
      yearsLeft: yearsLeftOf(state, content, s, secondsLeft, acct !== null),
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
    dispatch: dispatchesView(state, content),
    modifiers: modifierViews(state, content),
    history: { id: state.meta.history ?? null, cleared: (state.meta.history ?? null) !== null && clearedThisRun(state), lifted: !!state.historyLifted },
    survey: surveyView(state, content),
    bank: bankView(state, content),
    ending: { ...(ix.acts.length ? actEndingView(state, content) : { ...endingView(state, content), act: null }), roomBy: roomByView(state, content) },
    archive: archiveCounts(state, content),
    surveyReveal: surveyRevealView(state, content),
  };
}

/** Derived.ending: the first ending reached, and this run's progress to it (every Industry settled, held endingYears). */
function endingView(state: GameState, content: Content): Derived['ending'] {
  const ix = idx(content);
  const need = endingYearsOf(content);
  const settled = settledCount(state, content);
  const years = Math.max(0, state.steadyYearsAll);
  return {
    reached: !!state.meta.endings?.steadyAll, record: state.meta.endings?.steadyAll ?? null,
    progress: need > 0 ? clamp(years / need, 0, 1) : settled === ix.ids.length && ix.ids.length > 0 ? 1 : 0,
    allOpen: ix.ids.every((x) => !!state.sectors[x]?.open),
    settled, total: ix.ids.length, years, yearsNeeded: need,
    room: Math.min(ix.ids.length, settleRoom(state, content)),
    hold: holdTotal(content, roomCount(state, content)), nextHold: settled < ix.ids.length ? holdTotal(content, roomCount(state, content) + 1) : holdTotal(content, roomCount(state, content)),
    next: nextToSettle(state, content),
  };
}

/** M4 (polish): Derived.ending.roomBy: the first Institution level in content order that adds room, not yet bought. */
function roomByView(state: GameState, content: Content): NonNullable<Derived['ending']['roomBy']> | null {
  for (const def of content.institutions ?? []) {
    const level = state.meta.institutions[def.id] ?? 0;
    if (level >= institutionMax(def)) continue;
    const lv = level === 0 ? { cost: def.cost, effects: def.effects } : def.nextLevels![level - 1];
    if (!lv.effects.some((e) => e.type === 'settleSlotAdd')) continue;
    return { name: def.name, cost: lv.cost, needs: institutionNeeds(state, content, def, level) };
  }
  return null;
}

/** M4: Derived.ending read from the ending act E (acts.ts endingAct): its set, its record; without E zeros. */
function actEndingView(state: GameState, content: Content): Derived['ending'] {
  const ix = idx(content);
  const E = endingAct(content, state.meta);
  const need = endingYearsOf(content);
  const years = Math.max(0, state.steadyYearsAll);
  const n = roomCount(state, content);
  const base = {
    years, yearsNeeded: need, room: Math.min(ix.ids.length, settleRoom(state, content)),
    hold: holdTotal(content, n), nextHold: holdTotal(content, n + 1),
  };
  if (!E) return { ...base, reached: false, record: null, progress: 0, allOpen: false, settled: 0, total: 0, next: null, act: null };
  const set = endingSectors(content, E);
  const record = state.meta.endings?.[E.ending!.id] ?? null;
  const settled = set.filter((x) => state.sectors[x]?.open && state.sectors[x].settled).length;
  const current = currentAct(content, state.meta) === E;
  return {
    ...base, reached: !!record, record,
    progress: record && !current ? 1 : need > 0 ? clamp(years / need, 0, 1) : settled === set.length && set.length > 0 ? 1 : 0,
    allOpen: set.every((x) => !!state.sectors[x]?.open), settled, total: set.length,
    next: nextToSettle(state, content, set), act: { id: E.id, name: E.name, title: E.title },
  };
}

/** Derived.ending.next: the first Industry in sectorOrder not settled, and what it waits on (M3 finish). */
function nextToSettle(state: GameState, content: Content, set?: SectorId[]): Derived['ending']['next'] {
  const ix = idx(content);
  const s = (set ?? ix.ids).find((x) => !(state.sectors[x]?.open && state.sectors[x]?.settled));
  if (s === undefined) return null;
  const es = state.sectors[s];
  const years = Math.max(0, fin(es?.clearYears ?? 0));
  if (!es?.open) return { sector: s, need: 'open', years: 0 };
  if (!es.budget) return { sector: s, need: 'line', years };
  if (canSettle(state, content, s)) return { sector: s, need: 'ready', years };
  const fl = computeFlows(state, content);
  if (!steadyView(state, content, fl, s).sinkHeld) return { sector: s, need: 'clear', years };
  if (years < STEADY_STATE_YEARS - 1e-9) return { sector: s, need: 'years', years };
  if (!featureOn(content, state.meta, 'settlement')) return { sector: s, need: 'feature', years };
  const req = content.sectors[s].settle?.requires;
  if (req && !evalCond(state, content, req)) return { sector: s, need: 'requires', years }; // M4
  return { sector: s, need: roomCount(state, content) >= settleRoom(state, content) ? 'room' : 'clear', years };
}

/** SeamsView with the temptation's trade for the next seam (M3 finish; null when no line is drawn). */
function seamsWithTrade(state: GameState, content: Content, s: SectorId, v: SeamsView | null): SeamsView | null {
  if (!v) return v;
  return { ...v, wantedChange: state.sectors[s]?.budget ? seamWanted(state, content, s) : null };
}
