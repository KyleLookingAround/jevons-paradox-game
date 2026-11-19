/**
 * The step: advance one state by dt (every open sector, then population, Mandate and lapses, unlocks, the win, run
 * stats, achievements), and tick / fastForward built on it. Hot path. It is the integration point for the per-step
 * rules of the other modules (decades and Steady State, crises, backfire, standing-cap draws).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND, STEADY_STATE_YEARS, EXHAUSTED_BELOW, MAX_TICK_SECONDS } from '../types';
import type { AppState, Content, GameState, LeverDef, MetaState, NewsItem, RunStats, SectorId, SectorState } from '../types';
import { SUFFICIENCY_RECOVERY_RATE, TREND_TAU, POP_MIN, HISTORY_EVERY, FAST_FORWARD_STEP } from './constants';
import { calendarYear } from './calendar';
import { evalCond } from './conditions';
import { idx } from './contentIndex';
import { modsOf, etaAt, fireOneOffs } from './effects';
import type { OneOffs } from './effects';
import { computeFlows, instruments } from './flows';
import { headline, withNews } from './headlines';
import type { HeadlineCtx } from './headlines';
import { sectorLevers, NO_LEVERS, leverNetUpkeep } from './levers';
import { popGrowthRate } from './population';
import { jevonsSet } from './purchases';
import { freshSector, snapshotBase, historySample, pushHistory } from './state';
import { steadyCfg, decadeEffectsOf, budgetROf, standingDrawYearsOf, isWithin } from './steady';
import { canOpen } from './unlocks';
import { fin, clamp } from './util';

/* ------------------------------------------------------------------ */
/* Tick                                                                */
/* ------------------------------------------------------------------ */

export function step(state: GameState, content: Content, dt: number, lite = false): GameState {
  if (!(dt > 0)) return state;
  const fl = computeFlows(state, content);
  if (fl.pending) return state;
  const g = content.global;
  const ix = idx(content);
  const mods = modsOf(state, content);
  const levs = sectorLevers(state, content);
  const sc = steadyCfg(content);
  const time = state.time + dt;
  const dy = dt * YEARS_PER_SECOND;
  const W = fl.wellbeing;
  const year = calendarYear(state, content);
  const hc: HeadlineCtx = { year };
  const secondTick = !lite && (dt >= 1 || Math.floor(time) !== Math.floor(state.time));
  const items: NewsItem[] = [];
  let ach = state.meta.achievements;
  const grant = (id: string) => { if (!ach[id]) ach = { ...ach, [id]: true }; };
  let runSteady = state.run.steadySectors;
  let metaSteady = state.meta.steadySectors;
  let backfiredSectors = state.meta.backfiredSectors;
  let firstBackfires = state.run.firstBackfires;
  let budgetDecades = state.run.budgetDecades;
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  const reserveAdds: { sector: SectorId; value: number }[] = [];
  let revealNow = false;
  const resourceUsed = { ...state.run.resourceUsed };
  let crisisCount = 0;
  let anyDecoupling = false;
  let allDecoupling = true;
  let levers = state.levers;
  const sectors = { ...state.sectors };
  const tmp = { ...state, time };

  for (const s of ix.ids) {
    const es0 = state.sectors[s];
    const f = fl.sectors[s];
    if (!es0?.open || !f) continue;
    const def = content.sectors[s];
    const lev = levs[s] ?? NO_LEVERS;
    let es: SectorState = { ...es0 };
    es.openFor = es0.openFor + dt;
    es.eta = etaAt(def, mods, es.openFor);

    // applications
    const apps: Record<string, AppState> = { ...es0.apps };
    def.applications.forEach((a, i) => {
      const st = apps[a.id] ?? { available: false, founded: false, satMul: 1, peakD: 0 };
      const d = f.appD[i];
      let changed = !apps[a.id];
      const ns = { ...st };
      if (d > ns.peakD) { ns.peakD = d; changed = true; }
      const target = lev.sufTarget;
      if (ns.satMul > target + 1e-12) {
        ns.satMul = Math.max(target, ns.satMul - (ns.satMul - target) * (1 - Math.exp(-lev.sufRate * dt)));
        changed = true;
      } else if (ns.satMul < target - 1e-12) {
        ns.satMul = Math.min(target, ns.satMul + (target - ns.satMul) * (1 - Math.exp(-SUFFICIENCY_RECOVERY_RATE * dt)));
        changed = true;
      }
      if (!ns.available && f.ps <= a.visibleBelow) {
        ns.available = true; changed = true;
        if (a.foundCost <= 0) {
          ns.founded = true;
          items.push(headline(tmp, content, 'appFounded', time, { ...hc, app: a.name }, s));
        } else items.push(headline(tmp, content, 'appAvailable', time, { ...hc, app: a.name }, s));
      }
      if (changed) apps[a.id] = ns;
    });
    es.apps = apps;

    // resource
    if (def.resourceKind === 'stock') {
      es.reserve = Math.max(0, es0.reserve - f.R * (1 - lev.circ) * dt + f.reserveGain * dt);
      es.reserveMax = es0.reserveMax + f.reserveGain * dt;
      if (es.reserve <= EXHAUSTED_BELOW * es.reserveMax) items.push(headline(tmp, content, 'exhausted', time, hc, s));
    } else {
      es.reserve = es.reserveMax = f.capacity;
    }
    resourceUsed[s] = (resourceUsed[s] ?? 0) + f.R * dt;
    es.serviceDelivered = (es0.serviceDelivered ?? 0) + f.D * dy;

    // pressure
    const absorption = Math.max(0, def.absorption + (mods.absorptionAdd[s] ?? 0));
    es.pressure = Math.max(0, fin(es0.pressure * Math.exp(-absorption * dt) + (f.pressureIn - f.deletionOut) * dt));
    while (es.crisesFired < def.crisisAt.length && def.collapseAt > 0 && es.pressure >= def.crisisAt[es.crisesFired] * def.collapseAt) {
      es.crisesFired++;
      crisisCount++;
      items.push(headline(tmp, content, 'crisis', time, { ...hc, n: es.crisesFired }, s));
    }
    if (def.collapseAt > 0 && es.pressure >= def.collapseAt) items.push(headline(tmp, content, 'collapse', time, hc, s));

    // baseline, trend, peaks
    if (es.baseR <= 0) {
      es = snapshotBase(es, f);
      es.trendR = 0;
    } else {
      const old = es0.smoothR > 0 ? es0.smoothR : f.R;
      const sm = old + (f.R - old) * (1 - Math.exp(-dt / TREND_TAU));
      es.smoothR = fin(sm);
      es.trendR = old > 0 ? fin((sm - old) / old / dy) : 0;
    }
    es.peakR = Math.max(es.peakR, f.R);

    // backfire (direct rebound against the shadow), checked about once a real second
    if (secondTick && !es0.backfired && es0.baseR > 0) {
      const rb = instruments(state, content, fl, s).rebound;
      if (rb !== null && rb > 1) {
        es.backfired = true;
        items.push(headline(tmp, content, 'backfire', time, hc, s));
        grant('backfire');
        if (!backfiredSectors[s]) {
          backfiredSectors = { ...backfiredSectors, [s]: true };
          firstBackfires = { ...firstBackfires, [s]: true };
        }
      }
    }
    // Jevons was right
    if (es.baseR > 0 && es.peakR / es.baseR >= 10 && !ach.jevonsWasRight) {
      const effs = jevonsSet(state, content, s, mods);
      if (effs.length && effs.every((u) => (state.upgrades[u.id] ?? 0) > 0)) grant('jevonsWasRight');
    }

    // budget auto-draw for an active cap
    if (Number.isFinite(lev.capFrac) && !es0.budget && f.D > 0 && f.R > 0
      && es0.openFor * YEARS_PER_SECOND >= standingDrawYearsOf(def, content) - 1e-9) {
      es.budget = { r0: f.R, since: state.time, drawnYear: Math.floor(year) };
      items.push(headline(tmp, content, 'budgetDrawn', time, hc, s));
    }

    // decoupling streak, decades, Steady State
    const decoupling = isWithin(f.R, budgetROf(es0, def, content, state.time)) && W >= g.wellbeingTarget;
    if (decoupling) {
      anyDecoupling = true;
      const before = es0.steadyYears;
      const after = before + dy;
      es.steadyYears = after;
      const DY = sc.decadeYears;
      const crossed = Math.floor(after / DY + 1e-9) - Math.floor(before / DY + 1e-9);
      if (crossed > 0) {
        const effs = decadeEffectsOf(content, s);
        for (let k = 0; k < crossed; k++) {
          es.decadesWithin = [...es.decadesWithin, Math.floor(year)];
          budgetDecades++;
          fireOneOffs(effs, 1, fl.income, one);
          for (const ef of effs) {
            if (ef.type === 'reserveAdd') reserveAdds.push({ sector: ef.sector, value: ef.value });
            else if (ef.type === 'reveal') revealNow = true;
          }
          items.push(headline(tmp, content, 'decade', time, { ...hc, n: es.decadesWithin.length }, s));
        }
      }
      if (before < STEADY_STATE_YEARS && after >= STEADY_STATE_YEARS) {
        // M1 balance: Steady State earned on this line holds it level from now on.
        if (es.budget && es.budget.heldAt === undefined) es.budget = { ...es.budget, heldAt: state.time };
        if (!runSteady[s]) {
          runSteady = { ...runSteady, [s]: true };
          grant('steadyState');
          items.push(headline(tmp, content, 'steadySector', time, hc, s));
        }
        if (!metaSteady[s]) {
          metaSteady = { ...metaSteady, [s]: true };
          fireOneOffs(sc.first, 1, fl.income, one);
        }
      }
    } else {
      if (es0.steadyYears >= sc.decadeYears - 1e-9) items.push(headline(tmp, content, 'budgetBroken', time, hc, s));
      es.steadyYears = 0;
      allDecoupling = false;
    }
    // degrowth by accident
    if (state.population < 0.6 * state.peakPopulation && es.trendR < 0 && W < g.wellbeingTarget) grant('degrowthByAccident');
    // duty ref snapshots (standing levers, or enacted before demand existed)
    if (f.D > 0) {
      for (const ld of ix.leversBySector[s] ?? []) {
        if (ld.kind !== 'duty') continue;
        const ls = levers[ld.id];
        if (ls && ls.level > 0 && !(ls.ref > 0)) {
          const ref = f.pPre + f.permitPart;
          if (ref > 0) {
            if (levers === state.levers) levers = { ...levers };
            levers[ld.id] = { ...ls, ref };
          }
        }
      }
    }
    sectors[s] = es;
  }
  // decade rewards of reserveAdd act like a purchase
  for (const ra of reserveAdds) {
    const d = content.sectors[ra.sector];
    const es = sectors[ra.sector];
    if (d && es?.open && d.resourceKind === 'stock') {
      const a = ra.value * d.reserve;
      sectors[ra.sector] = { ...es, reserve: es.reserve + a, reserveMax: es.reserveMax + a };
    }
  }

  // population
  const growth = popGrowthRate(W, content, mods);
  let population = state.population * Math.exp(clamp(growth * dt, -50, 50));
  if (crisisCount) population *= Math.pow(1 - g.crisisPopLoss, crisisCount);
  population = Math.max(POP_MIN, fin(population, POP_MIN));

  // mandate & lapse
  let mandate = state.mandate + (fl.mandateGain - fl.upkeep) * dt + crisisCount * g.crisisMandate + one.mandate;
  if (mandate <= 0) {
    mandate = 0;
    // Drop the costliest-upkeep lever one level, repeatedly, until upkeep is covered (independent of tick length).
    let upkeep = fl.upkeep;
    for (let guard = 0; upkeep > fl.mandateGain + 1e-12 && guard < 1000; guard++) {
      let worst: LeverDef | null = null, worstUp = 0;
      for (const ld of content.levers ?? []) {
        const ls = levers[ld.id];
        if (!ls || ls.level <= 0) continue;
        const up = leverNetUpkeep(ld, ls.level, mods.startLevers[ld.id] ?? 0);
        if (up > worstUp) { worstUp = up; worst = ld; }
      }
      if (!worst) break;
      const ls = levers[worst.id];
      if (levers === state.levers) levers = { ...levers };
      const lvl = ls.level - 1;
      levers[worst.id] = { ...ls, level: lvl, ref: lvl > 0 ? ls.ref : 0 };
      upkeep += leverNetUpkeep(worst, lvl, mods.startLevers[worst.id] ?? 0) - worstUp;
      items.push(headline(tmp, content, 'leverLapsed', time, hc, worst.sector));
    }
  }
  mandate = fin(mandate);

  // sector openings (conditions read the state at the start of the step, as Derived.nextSectors does)
  const opened: SectorId[] = [];
  let sectorsOpened = state.meta.sectorsOpened;
  for (let k = 1; k < ix.ids.length; k++) {
    const s = ix.ids[k];
    if (state.sectors[s]?.open || !canOpen(state, content, s)) continue;
    const def = content.sectors[s];
    sectors[s] = freshSector(def, mods, true);
    const age = ix.ageOf.get(s);
    const ageNew = !!age && !(age.sectors ?? []).some((o) => state.sectors[o]?.open || opened.includes(o));
    opened.push(s);
    if (!sectorsOpened[s]) sectorsOpened = { ...sectorsOpened, [s]: true };
    items.push(headline(tmp, content, 'sectorOpened', time, hc, s));
    if (ageNew) items.push(headline(tmp, content, 'ageBegins', time, hc, s));
  }

  // Steady State across the board
  const allOpen = ix.ids.every((s) => sectors[s]?.open);
  let steadyYearsAll = state.steadyYearsAll;
  let flags = state.flags;
  if (revealNow && !flags.revealed) flags = { ...flags, revealed: true };
  if (allDecoupling && anyDecoupling && opened.length === 0) {
    steadyYearsAll += dy;
    if (allOpen && steadyYearsAll >= STEADY_STATE_YEARS && !flags.won) {
      flags = { ...flags, won: true };
      items.push(headline(tmp, content, 'steadyAll', time, hc));
    }
  } else steadyYearsAll = 0;

  // achievements with `when` (about once a real second)
  if (secondTick) {
    for (const a of content.achievements ?? []) if (a.when && !ach[a.id] && evalCond(state, content, a.when)) grant(a.id);
  }

  const run: RunStats = {
    ...state.run,
    peakWellbeing: Math.max(state.run.peakWellbeing, W),
    decoupledYears: state.run.decoupledYears + (anyDecoupling ? dy : 0),
    resourceUsed,
    steadySectors: runSteady,
    wellbeingYears: (state.run.wellbeingYears ?? 0) + Math.max(0, W - g.subsistence) * dy,
    yearsAtTarget: (state.run.yearsAtTarget ?? 0) + (W >= g.wellbeingTarget ? dy : 0),
    budgetDecades,
    firstBackfires,
  };
  const meta: MetaState = {
    ...state.meta,
    totalSeconds: state.meta.totalSeconds + dt,
    sectorsOpened,
    achievements: ach,
    steadySectors: metaSteady,
    backfiredSectors,
    slots: state.meta.slots + one.slots,
  };

  let next: GameState = {
    ...state, time, capital: fin(state.capital + fl.income * dt + one.capital), mandate, population,
    peakPopulation: Math.max(state.peakPopulation, population), sectors, levers, flags, steadyYearsAll, run, meta,
    news: withNews(state.news, items),
  };
  // A newly opened sector records its baseline now, before the player can buy anything for it.
  if (opened.length) {
    const fo = computeFlows(next, content);
    const s2 = { ...next.sectors };
    for (const s of opened) {
      const f = fo.sectors[s];
      if (f) s2[s] = snapshotBase(s2[s], f);
    }
    next = { ...next, sectors: s2 };
  }
  if (!lite && Math.floor(time / HISTORY_EVERY) > Math.floor(state.time / HISTORY_EVERY)) {
    next = { ...next, history: pushHistory(state.history, historySample(next, content, computeFlows(next, content))) };
  }
  return next;
}

export function tick(state: GameState, content: Content, dt: number): GameState {
  if (!(dt > 0) || Number.isNaN(dt)) return state;
  const total = Math.min(dt, MAX_TICK_SECONDS);
  const n = Math.ceil(total);
  const h = total / n;
  let s = state;
  for (let i = 0; i < n; i++) {
    const t = step(s, content, h);
    if (t === s) break;
    s = t;
  }
  return s;
}

export function fastForward(state: GameState, content: Content, seconds: number): GameState {
  const total = Math.min(Math.max(0, fin(seconds)), content.global.offlineCapSeconds ?? 14400);
  if (!(total > 0)) return state;
  const n = Math.ceil(total / FAST_FORWARD_STEP);
  const h = total / n;
  let s = state;
  for (let i = 0; i < n; i++) {
    const t = step(s, content, h);
    if (t === s) break;
    s = t;
  }
  return s;
}
