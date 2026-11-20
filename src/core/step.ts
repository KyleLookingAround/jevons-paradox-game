/**
 * The step: advance one state by dt (every open sector, then population, Mandate and lapses, unlocks, the win, run
 * stats, achievements), and tick built on it (fastForward is in offline.ts). Hot path. It is the integration point for
 * the per-step rules of the other modules: decades and Steady State (steady.ts), crises, backfire, standing-cap draws,
 * dividend offers (dividends.ts), forced unsettles (settlement.ts), events (events.ts) and, last, the standing orders
 * (orders.ts).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND, STEADY_STATE_YEARS, EXHAUSTED_BELOW, MAX_TICK_SECONDS } from '../types';
import type { AppState, Content, GameState, LeverDef, MetaState, NewsItem, PendingDividend, RunStats, SectorId, SectorState } from '../types';
import { SUFFICIENCY_RECOVERY_RATE, TREND_TAU, POP_MIN, HISTORY_EVERY } from './constants';
import { calendarYear } from './calendar';
import { commonsCfg } from './commons';
import { evalCond } from './conditions';
import { idx } from './contentIndex';
import { appendDividend, decadeOffer } from './dividends';
import { modsOf, etaAt, fireOneOffs, absorptionOf, leverMulOf } from './effects';
import type { OneOffs } from './effects';
import { pushEvents } from './events';
import type { EvDraft } from './events';
import { computeFlows, instruments, steadyView } from './flows';
import { headline, newsWith } from './headlines';
import type { HeadlineCtx } from './headlines';
import { sectorLevers, NO_LEVERS, leverNetUpkeep } from './levers';
import { runOrders } from './orders';
import { popGrowthRate } from './population';
import { jevonsSet } from './purchases';
import { unsettleAs } from './settlement';
import { freshSector, snapshotBase, historySample, pushHistory } from './state';
import { steadyCfg, decadeEffectsOf, standingDrawYearsOf, newBudget, paceOf } from './steady';
import { canOpen } from './unlocks';
import { dueFeature, unlockFeature, FEATURE_CHECK_EVERY } from './unfold';
import { featureOn } from './features';
import { fin, clamp } from './util';
import { stepAmbient } from './ambient';
import { unlockNotes } from './archive';
import { stepDispatch } from './dispatch';
import { emit } from './events';
import { endingRecord, endingYearsOf, firstEnding } from './ending';
import { stepHistory } from './history';
import { milestone } from './milestones';
import { expireModifiers } from './modifiers';
import { publishOnFlag } from './returns';
import { stepBites } from './sideEffects';
import { decayedPeak } from './travel';
import type { ActDef } from '../types';
import { actStreak } from './acts';
import { actEndingMeta, arrearsStep, depletionP, drainOfDrawers, drawLine, mirrorDrawers, newM4Step, stepCapstone, stepM4, stepRenewableSector } from './world';
import type { M4Step } from './world';

/* ------------------------------------------------------------------ */
/* Tick                                                                */
/* ------------------------------------------------------------------ */

export function step(state: GameState, content: Content, dt: number, lite = false, away = false): GameState {
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
  const target = g.wellbeingTarget;
  const year = calendarYear(state, content);
  const hc: HeadlineCtx = { year };
  const secondTick = !lite && (dt >= 1 || Math.floor(time) !== Math.floor(state.time));
  const items: NewsItem[] = [];
  const ev: EvDraft[] = [];
  let ach = state.meta.achievements;
  const grant = (id: string) => { if (!ach[id]) ach = { ...ach, [id]: true }; };
  let runSteady = state.run.steadySectors;
  let metaSteady = state.meta.steadySectors;
  let backfiredSectors = state.meta.backfiredSectors;
  let firstBackfires = state.run.firstBackfires;
  let budgetDecades = state.run.budgetDecades;
  let leanDecades = state.run.leanDecades ?? 0;
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  const reserveAdds: { sector: SectorId; value: number }[] = [];
  const offers: PendingDividend[] = [];
  let revealNow = false;
  const firsts: string[] = []; // M3: milestone keys first reached in this step
  const resourceUsed = { ...state.run.resourceUsed };
  let crisisCount = 0;
  let anyDecoupling = false;
  // the unfolding: gated accruals (a feature absent from content is on)
  const fBudget = featureOn(content, state.meta, 'budget'), fDiv = featureOn(content, state.meta, 'dividendChoice');
  const fSkies = featureOn(content, state.meta, 'clearSkies'), fSteady = featureOn(content, state.meta, 'steadyState');
  let levers = state.levers;
  const sectors = { ...state.sectors };
  const tmp = state; // headlines read the seed, the news count and the open sectors, not the time (passed apart)
  const m4 = ix.anyM4;
  const w4: M4Step = newM4Step(); // M4: news and events after the M3 ones; meta.world changes

  for (const s of ix.ids) {
    const es0 = state.sectors[s];
    const f = fl.sectors[s];
    if (!es0?.open || !f) continue;
    if (es0.settled) {
      // M2: a settled sector is frozen; only its clock and its burn move. (M4: a capstone's burn is per head.)
      const st = es0.settled;
      resourceUsed[s] = (resourceUsed[s] ?? 0) + f.R * dt;
      sectors[s] = { ...es0, openFor: es0.openFor + dt, serviceDelivered: (es0.serviceDelivered ?? 0) + f.D * dy };
      if (es0.capstoned) crisisCount += stepCapstone(state, content, s, f, mods, sectors, time, hc, items, ev, dt); // M4: arrears
      if (W >= target) anyDecoupling = true;
      void st;
      continue;
    }
    const def = content.sectors[s];
    const lev = levs[s] ?? NO_LEVERS;
    const sv = steadyView(state, content, fl, s, mods, false);
    let es: SectorState = { ...es0 };
    es.openFor = es0.openFor + dt;
    es.eta = etaAt(def, mods, es.openFor);

    // applications
    const apps: Record<string, AppState> = { ...es0.apps };
    def.applications.forEach((a, i) => {
      const st = apps[a.id] ?? { available: false, founded: false, satMul: 1, peakD: 0, peakAdoption: 0 };
      const d = f.appD[i];
      let changed = !apps[a.id];
      const ns = { ...st };
      if (d > ns.peakD) { ns.peakD = d; changed = true; }
      else if ((a.lockInDecay ?? 0) > 0 && ns.peakD > d) { ns.peakD = decayedPeak(ns, d, a.lockInDecay!, dt); changed = true; } // M3: sprawl fades
      const sat = f.appSat[i];
      const adoption = sat > 0 ? clamp(d / sat, 0, 1) : 0;
      if (adoption > (ns.peakAdoption ?? 0)) { ns.peakAdoption = adoption; changed = true; }
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
        if (a.foundCost <= 0 || ns.founded) {
          ns.founded = true;
          items.push(headline(tmp, content, 'appFounded', time, { ...hc, app: a.name }, s));
          ev.push({ kind: 'appFounded', sector: s, id: a.id, by: 'default' });
        } else {
          items.push(headline(tmp, content, 'appAvailable', time, { ...hc, app: a.name }, s));
          ev.push({ kind: 'appAvailable', sector: s, id: a.id });
        }
      }
      if (changed) apps[a.id] = ns;
    });
    es.apps = apps;

    // resource
    if (def.resourceKind === 'stock') {
      if (!m4 || !ix.ownerOf.has(s)) { // M4: a drawer's reserve is its owner's (mirrored after the loop)
        const drawn = m4 && ix.drawers.has(s) ? drainOfDrawers(state, content, fl, levs, s) : 0; // M4: the owner's drawers
        es.reserve = Math.max(0, (drawn > 0 ? es0.reserve - drawn * dt : es0.reserve) - f.R * (1 - lev.circ) * dt + f.reserveGain * dt);
        es.reserveMax = es0.reserveMax + f.reserveGain * dt;
        if (es.reserve <= EXHAUSTED_BELOW * es.reserveMax) {
          items.push(headline(tmp, content, 'exhausted', time, hc, s));
          ev.push({ kind: 'exhausted', sector: s });
        }
      }
    } else if (def.resourceKind === 'renewable') {
      es = stepRenewableSector(state, content, s, es, f, lev, mods, dt, time, hc, w4); // M4: the stock, crossing, scar
    } else {
      es.reserve = es.reserveMax = f.capacity;
    }
    resourceUsed[s] = (resourceUsed[s] ?? 0) + f.R * dt;
    es.serviceDelivered = (es0.serviceDelivered ?? 0) + f.D * dy;

    // pressure
    const absorption = absorptionOf(def, mods);
    es.pressure = def.pressureSource === 'depletion' ? depletionP(def, es.reserve) // M4: derived from the stock
      : Math.max(0, fin(es0.pressure * Math.exp(-absorption * dt) + (f.pressureIn - f.deletionOut) * dt));
    while (es.crisesFired < def.crisisAt.length && def.collapseAt > 0 && es.pressure >= def.crisisAt[es.crisesFired] * def.collapseAt) {
      es.crisesFired++;
      crisisCount++;
      items.push(headline(tmp, content, 'crisis', time, { ...hc, n: es.crisesFired }, s));
      ev.push({ kind: 'crisis', sector: s, n: es.crisesFired });
    }
    if (def.collapseAt > 0 && es.pressure >= def.collapseAt) {
      items.push(headline(tmp, content, 'collapse', time, hc, s));
      ev.push({ kind: 'collapse', sector: s });
    }
    if (es.pressure > (es0.peakPressure ?? 0)) es.peakPressure = es.pressure;

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
        const firstEver = !backfiredSectors[s];
        ev.push(firstEver ? { kind: 'backfire', sector: s, first: true } : { kind: 'backfire', sector: s });
        grant('backfire');
        if (firstEver) {
          backfiredSectors = { ...backfiredSectors, [s]: true };
          firstBackfires = { ...firstBackfires, [s]: true };
          firsts.push(`backfire:${s}`);
        }
      }
    }
    // Jevons was right
    if (es.baseR > 0 && es.peakR / es.baseR >= 10 && !ach.jevonsWasRight) {
      const effs = jevonsSet(state, content, s, mods);
      if (effs.length && effs.every((u) => (state.upgrades[u.id] ?? 0) > 0)) grant('jevonsWasRight');
    }

    // budget auto-draw for an active cap (M2: the default pace, the line's own day)
    if (fBudget && (Number.isFinite(lev.capFrac) || Number.isFinite(lev.quotaFrac)) && !es0.budget && f.D > 0 && f.R > 0
      && es0.openFor * YEARS_PER_SECOND >= standingDrawYearsOf(def, content) - 1e-9) {
      es.budget = m4 ? drawLine(state, content, fl, s, f.R, state.time, year, W, es0.pressure) : newBudget(content, s, f.R, state.time, year, W, es0.pressure); // M4: the account
      items.push(headline(tmp, content, 'budgetDrawn', time, hc, s));
      ev.push({ kind: 'budgetDrawn', sector: s, id: es.budget.pace, by: 'default' });
    }

    // the decade streak (M2: against the line's own day), decades, dividend offers
    if (sv.decoupling) {
      anyDecoupling = true;
      const before = es0.steadyYears;
      const after = before + dy;
      es.steadyYears = after;
      let lean = (es0.windowLean ?? false) || W < target;
      es.windowLean = lean;
      const DY = sc.decadeYears;
      const crossed = Math.floor(after / DY + 1e-9) - Math.floor(before / DY + 1e-9);
      if (crossed > 0) {
        const effs = decadeEffectsOf(content, s);
        const mul = paceOf(content, s, es0.budget?.pace).dividendMul;
        for (let k = 0; k < crossed; k++) {
          es.decadesWithin = [...es.decadesWithin, Math.floor(year)];
          es.decadesLean = [...(es.decadesLean ?? []), lean];
          budgetDecades++;
          if (lean) leanDecades++;
          const o1: OneOffs = { capital: 0, mandate: 0, slots: 0 };
          fireOneOffs(effs, 1, fl.income, o1);
          one.capital += o1.capital * mul; one.mandate += o1.mandate * mul; one.slots += o1.slots;
          for (const ef of effs) {
            if (ef.type === 'reserveAdd') reserveAdds.push({ sector: ef.sector, value: ef.value });
            else if (ef.type === 'reveal') revealNow = true;
          }
          const n = es.decadesWithin.length;
          items.push(headline(tmp, content, 'decade', time, { ...hc, n }, s));
          ev.push({ kind: 'decade', sector: s, n, id: lean ? 'lean' : 'full' });
          firsts.push('decade');
          const offer = decadeOffer(content, s, n, mul, state.meta);
          if (offer && fDiv) offers.push(offer);
          lean = W < target;
          es.windowLean = false;
        }
      }
    } else {
      if (es0.steadyYears >= sc.decadeYears - 1e-9) {
        items.push(headline(tmp, content, 'budgetBroken', time, hc, s));
        ev.push({ kind: 'budgetBroken', sector: s });
      }
      es.steadyYears = 0;
      es.windowLean = false;
    }

    // the Steady streak (M2: within budget, at target, clear skies), clear skies, Steady State
    if (fSkies && es0.budget && sv.clear && es0.budget.clearAt === undefined && es.budget === es0.budget) {
      es.budget = { ...es0.budget, clearAt: state.time };
      items.push(headline(tmp, content, 'clearSkies', time, hc, s));
      ev.push({ kind: 'clearSkies', sector: s });
      firsts.push(`clearSkies:${s}`);
    }
    if (fSteady && sv.sinkHeld && sv.decoupling) {
      const before = es0.clearYears ?? 0;
      const after = before + dy;
      es.clearYears = after;
      if (before < STEADY_STATE_YEARS && after >= STEADY_STATE_YEARS) {
        // M1 balance: Steady State earned on this line holds it level from now on.
        if (es.budget && es.budget.heldAt === undefined) es.budget = { ...es.budget, heldAt: state.time };
        if (!runSteady[s]) {
          runSteady = { ...runSteady, [s]: true };
          grant('steadyState');
          items.push(headline(tmp, content, 'steadySector', time, hc, s));
          ev.push(!metaSteady[s] ? { kind: 'steadyState', sector: s, first: true } : { kind: 'steadyState', sector: s });
          firsts.push(`steady:${s}`);
        }
        if (!metaSteady[s]) {
          metaSteady = { ...metaSteady, [s]: true };
          fireOneOffs(sc.first, 1, fl.income, one);
        }
      }
    } else es.clearYears = 0;

    // degrowth by accident
    if (state.population < 0.6 * state.peakPopulation && es.trendR < 0 && W < target) grant('degrowthByAccident');
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
    if (d && es?.open && !es.settled && d.resourceKind === 'stock') {
      const a = ra.value * d.reserve;
      sectors[ra.sector] = { ...es, reserve: es.reserve + a, reserveMax: es.reserveMax + a };
    }
  }

  if (m4) mirrorDrawers(content, sectors); // M4: drawers' reserve gauges follow the owner's
  // population
  const growth = popGrowthRate(W, content, mods);
  let population = state.population * Math.exp(clamp(growth * dt, -50, 50));
  if (crisisCount) population *= Math.pow(1 - g.crisisPopLoss, crisisCount);
  population = Math.max(POP_MIN, fin(population, POP_MIN));

  // mandate & lapse (M2: settlement defences count as upkeep; once no lever upkeep is left, the largest defence unsettles)
  let mandate = state.mandate + (fl.mandateGain - fl.upkeep) * dt + crisisCount * g.crisisMandate + one.mandate;
  const unsettleList: SectorId[] = [];
  const arrearsList: SectorId[] = [];
  if (mandate <= 0) {
    mandate = 0;
    let upkeep = fl.upkeep;
    for (let guard = 0; upkeep > fl.mandateGain + 1e-12 && guard < 1000; guard++) {
      let worst: LeverDef | null = null, worstUp = 0;
      for (const ld of content.levers ?? []) {
        const ls = levers[ld.id];
        if (!ls || ls.level <= 0) continue;
        const up = leverNetUpkeep(ld, ls.level, mods.startLevers[ld.id] ?? 0, leverMulOf(mods, ld).upkeep);
        if (up > worstUp) { worstUp = up; worst = ld; }
      }
      if (!worst) {
        let ws: SectorId | null = null, wd = 0;
        for (const s of ix.ids) {
          const d = fl.settled[s];
          if (d && d.defence > wd && !unsettleList.includes(s) && !arrearsList.includes(s)) { wd = d.defence; ws = s; }
        }
        if (ws === null) break;
        if (state.sectors[ws]?.capstoned) arrearsList.push(ws); else unsettleList.push(ws); // M4: a capstone goes into arrears
        upkeep -= wd;
        continue;
      }
      const ls = levers[worst.id];
      if (levers === state.levers) levers = { ...levers };
      const lvl = ls.level - 1;
      levers[worst.id] = { ...ls, level: lvl, ref: lvl > 0 ? ls.ref : 0 };
      upkeep += leverNetUpkeep(worst, lvl, mods.startLevers[worst.id] ?? 0, leverMulOf(mods, worst).upkeep) - worstUp;
      items.push(headline(tmp, content, 'leverLapsed', time, hc, worst.sector));
      ev.push({ kind: 'leverLapsed', sector: worst.sector, id: worst.id, n: lvl, by: 'default' });
    }
  }
  mandate = fin(mandate);
  if (m4) mandate = arrearsStep(state, content, fl, sectors, arrearsList, mandate, dt, time, hc, w4); // M4: into and out of arrears
  // M3: side effects bite (after Mandate and lapses)
  const bites = stepBites(state, content, levers, dt);
  levers = bites.levers;

  // sector openings (conditions read the state at the start of the step, as Derived.nextSectors does)
  const opened: SectorId[] = [];
  let sectorsOpened = state.meta.sectorsOpened;
  for (let k = 1; k < ix.ids.length; k++) {
    const s = ix.ids[k];
    if (state.sectors[s]?.open || !canOpen(state, content, s)) continue;
    const def = content.sectors[s];
    sectors[s] = freshSector(def, mods, true, state.meta);
    const age = ix.ageOf.get(s);
    const ageNew = !!age && !(age.sectors ?? []).some((o) => state.sectors[o]?.open || opened.includes(o));
    opened.push(s);
    const firstOpen = !sectorsOpened[s];
    if (firstOpen) sectorsOpened = { ...sectorsOpened, [s]: true };
    items.push(headline(tmp, content, 'sectorOpened', time, hc, s));
    ev.push(firstOpen ? { kind: 'sectorOpened', sector: s, first: true } : { kind: 'sectorOpened', sector: s });
    firsts.push(`sectorOpened:${s}`);
    if (ageNew) {
      items.push(headline(tmp, content, 'ageBegins', time, hc, s));
      ev.push({ kind: 'ageBegins', sector: s, id: age!.id });
    }
    for (const a of def.applications) if (mods.startFounded.has(a.id)) ev.push({ kind: 'appFounded', sector: s, id: a.id, by: 'default' });
  }

  // The first ending's streak (M3 finish): every Industry in sectorOrder open and settled through the step
  let steadyYearsAll = state.steadyYearsAll;
  let flags = state.flags;
  if (revealNow && !flags.revealed) { flags = { ...flags, revealed: true }; firsts.push('reveal'); }
  let ending = false;
  let actWon: ActDef | null = null;
  if (ix.acts.length) { // M4: the act's ending set (acts.ts); without acts the M3 rule below, unchanged
    const r = actStreak(state, content, unsettleList, dy);
    steadyYearsAll = r.years;
    if (r.act && steadyYearsAll >= endingYearsOf(content) - 1e-9 && !flags.won) {
      flags = { ...flags, won: true };
      actWon = r.act;
      items.push(headline(tmp, content, 'steadyAll', time, hc));
      ev.push({ kind: 'won' });
      items.push(headline(tmp, content, 'actEnding', time, { ...hc, name: r.act.title }));
      ev.push({ kind: 'ending', id: r.act.ending!.id });
    }
  } else if (ix.ids.length > 0 && unsettleList.length === 0 && ix.ids.every((s) => !!state.sectors[s]?.open && !!state.sectors[s]?.settled)) {
    steadyYearsAll += dy;
    if (steadyYearsAll >= endingYearsOf(content) - 1e-9 && !flags.won) {
      flags = { ...flags, won: true };
      items.push(headline(tmp, content, 'steadyAll', time, hc));
      ev.push({ kind: 'won' });
      // M3: the first ending, once ever, immediately after the run's 'won'; the run continues
      if (!state.meta.endings?.steadyAll) {
        ending = true;
        items.push(headline(tmp, content, 'ending', time, hc));
        ev.push({ kind: 'ending', id: 'steadyAll' });
      }
    }
  } else steadyYearsAll = 0;

  // achievements with `when` (about once a real second)
  if (secondTick) {
    for (const a of content.achievements ?? []) if (a.when && !ach[a.id] && evalCond(state, content, a.when)) grant(a.id);
  }
  // the unfolding: at most one feature a check (every 5 s of run time), never while away (it arrives once the player is back)
  const feature = !lite && !away && Math.floor(time / FEATURE_CHECK_EVERY) > Math.floor(state.time / FEATURE_CHECK_EVERY) ? dueFeature(state, content) : null;
  let featMeta: MetaState | null = null;
  if (feature) featMeta = unlockFeature(state.meta, content, feature, time, year, items, ev);

  const run: RunStats = {
    ...state.run,
    peakWellbeing: Math.max(state.run.peakWellbeing, W),
    decoupledYears: state.run.decoupledYears + (anyDecoupling ? dy : 0),
    resourceUsed,
    steadySectors: runSteady,
    wellbeingYears: (state.run.wellbeingYears ?? 0) + Math.max(0, W - g.subsistence) * dy,
    yearsAtTarget: (state.run.yearsAtTarget ?? 0) + (W >= target ? dy : 0),
    budgetDecades,
    leanDecades,
    firstBackfires,
  };
  const evs = pushEvents(state.events ?? [], state.meta.eventSeq ?? 0, ev, time, year);
  let meta: MetaState = {
    ...(featMeta ?? state.meta),
    totalSeconds: state.meta.totalSeconds + dt,
    sectorsOpened,
    achievements: ach,
    steadySectors: metaSteady,
    backfiredSectors,
    slots: state.meta.slots + one.slots,
    eventSeq: evs.seq,
    peakPopulationEver: Math.max(state.meta.peakPopulationEver ?? 1, population),
  };
  if (firsts.length) for (const k of firsts) meta = milestone(meta, k, null, year);
  if (ending) meta = firstEnding(meta, endingRecord({ ...state, time, meta }, year), year) ?? meta;
  if (m4 && w4.world) meta = { ...meta, world: w4.world }; // M4: scars written and healed
  if (actWon) meta = actEndingMeta(state, content, actWon, { ...state, time, meta }, year); // M4: the record and the capstone
  const commonsIn = fl.commonsLevy > 0 ? commonsCfg(content).fundShare * fl.commonsLevy * dt : 0;

  let next: GameState = {
    ...state, time, capital: fin(state.capital + fl.income * dt + one.capital), mandate, population,
    peakPopulation: Math.max(state.peakPopulation, population), sectors, levers, flags, steadyYearsAll, run, meta,
    ...newsWith(state, content, items), events: evs.events,
    commons: commonsIn > 0 ? { ...state.commons, fund: fin(state.commons.fund + commonsIn) } : state.commons,
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
  for (const s of unsettleList) next = unsettleAs(next, content, s, 'default', time);
  for (const o of offers) next = appendDividend(next, content, o, fl.income, away);
  if (!lite && Math.floor(time / HISTORY_EVERY) > Math.floor(state.time / HISTORY_EVERY)) {
    next = { ...next, history: pushHistory(state.history, historySample(next, content, computeFlows(next, content))) };
  }
  next = stepM3(state, next, content, year, secondTick, bites.bitten, lite, away);
  if (m4) next = stepM4(state, next, content, fl, mods, year, lite, away, w4); // M4: surveys, the order book's peaks, M4 events
  next = runOrders(state, next, content, lite);
  return next;
}

/**
 * M3: the step's rules after the M2 ones, in the contract's event order: expiries ('modifierEnded', default answers),
 * a draw, 'biteBack', 'historyCleared', 'archiveUnlocked'; ambient news; the Proprietor's Day on its flag. Each costs a
 * comparison or two when its system is absent.
 */
function stepM3(prev: GameState, next0: GameState, content: Content, year: number, secondTick: boolean, bitten: string[], lite: boolean, away: boolean): GameState {
  let next = next0;
  const time = next.time;
  const mods = next.modifiers;
  if (mods && mods.length) {
    const x = expireModifiers(mods, time);
    if (x.ended.length) next = emit({ ...next, modifiers: x.list }, x.ended.map((m) => ({ kind: 'modifierEnded' as const, id: m.source, n: m.arm })), time, year);
  }
  next = stepDispatch(next, content, year, away, lite);
  const items: NewsItem[] = [];
  const ev: EvDraft[] = [];
  if (bitten.length && featureOn(content, prev.meta, 'sideEffects')) {
    const ix = idx(content);
    for (const id of bitten) {
      const def = ix.levers.get(id)!;
      items.push(headline(prev, content, 'biteBack', time, { year, name: def.name }, def.sector));
      ev.push({ kind: 'biteBack', sector: def.sector, id });
    }
  }
  next = stepHistory(prev, next, content, secondTick, year, items, ev);
  if (secondTick && content.archive?.length) {
    const m2 = unlockNotes(next, content, next.meta, ev);
    if (m2 !== next.meta) next = { ...next, meta: m2 };
  }
  if (!lite && !away && content.ambient?.length) next = stepAmbient(prev, next, content, year, items);
  if (items.length) next = { ...next, ...newsWith(next, content, items) };
  if (ev.length) next = emit(next, ev, time, year);
  return publishOnFlag(prev, next, content);
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
