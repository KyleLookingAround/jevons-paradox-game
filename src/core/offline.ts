/**
 * Offline catch-up (M2): fastForward in steps of at most FAST_FORWARD_STEP, capped at the effective cap, holding before
 * what GlobalParams.offline.holdBefore names (the step that would fire it is discarded), with the OfflineReport.
 * Standing orders run inside the steps exactly as in tick (step.ts calls them). M2 offline fix: Hindsight accrues at
 * offline.hindsightRate (run.hindsightWithheld, written once at the end: Hindsight is a function of the state, so the
 * withheld amount telescopes across calls), and the steps run `away`, so a full dividend list forgoes new offers.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState, OfflineReport, SectorId } from '../types';
import { DEFAULT_OFFLINE_CAP, FAST_FORWARD_STEP } from './constants';
import { idx } from './contentIndex';
import { modsOf } from './effects';
import type { Mods } from './effects';
import { computeFlows } from './flows';
import { hindsightTerms, termsSum } from './hindsight';
import { sectorSteady } from './steady';
import { step } from './step';
import { fin, clamp } from './util';
import { calendarYear } from './calendar';
import { emit } from './events';
import { featureOn } from './features';

/** GlobalParams.offline with its defaults (the deprecated offlineCapSeconds only when `offline` is absent). */
export function offlineCfg(content: Content): { capSeconds: number; holdBefore: 'crisis' | 'collapse' | null; hindsightRate: number; bankRate: number; bankMax: number } {
  const g = content.global;
  if (g.offline) {
    const h = g.offline.holdBefore;
    return {
      capSeconds: Math.max(0, fin(g.offline.capSeconds, DEFAULT_OFFLINE_CAP)), holdBefore: h === 'crisis' || h === 'collapse' ? h : null,
      hindsightRate: clamp(fin(g.offline.hindsightRate ?? 1, 1), 0, 1),
      bankRate: clamp(fin(g.offline.bankRate ?? 0), 0, 1), bankMax: Math.max(0, fin(g.offline.bankMax ?? 0)),
    };
  }
  return { capSeconds: Math.max(0, fin(g.offlineCapSeconds ?? DEFAULT_OFFLINE_CAP, DEFAULT_OFFLINE_CAP)), holdBefore: 'collapse', hindsightRate: 1, bankRate: 0, bankMax: 0 };
}
/** Derived.offlineCapSeconds: the base cap plus every standing offlineCapAdd. */
export const offlineCapOf = (content: Content, mods: Mods): number => Math.max(0, offlineCfg(content).capSeconds + mods.offlineCapAdd);

export function fastForward(state: GameState, content: Content, seconds: number): GameState {
  const requested = Math.max(0, fin(seconds));
  if (!(requested > 0)) return state;
  const s = catchUp(state, content, requested, true);
  const report = s.lastOffline!;
  // M3: banked time, after a catch-up that stopped short because of a hold or the cap (never 'pending'); feature 'bank'
  const cfg = offlineCfg(content);
  const short = requested - report.simulated;
  if (report.heldBy !== null && report.heldBy !== 'pending' && short > 0 && cfg.bankRate > 0 && cfg.bankMax > 0 && featureOn(content, s.meta, 'bank')) {
    const before = s.meta.bankedSeconds ?? 0;
    const after = Math.min(cfg.bankMax, before + cfg.bankRate * short);
    const banked = fin(Math.max(0, after - before));
    return { ...s, meta: { ...s.meta, bankedSeconds: Math.max(before, after) }, lastOffline: { ...report, banked } };
  }
  return s;
}

/** M3: ModelApi.useBank: simulate min(seconds, bank) with the away rules and the holds, without the cap; subtract what
 *  was simulated; 'bankUsed'; no lastOffline. */
export function useBank(state: GameState, content: Content, seconds: number): GameState {
  if (!featureOn(content, state.meta, 'bank')) return state;
  const want = Math.min(Math.max(0, fin(seconds)), Math.max(0, state.meta.bankedSeconds ?? 0));
  if (!(want > 0) || computeFlows(state, content).pending) return state;
  const s = catchUp(state, content, want, false);
  const sim = s.lastOffline!.simulated;
  const out: GameState = { ...s, lastOffline: state.lastOffline, meta: { ...s.meta, bankedSeconds: Math.max(0, fin((s.meta.bankedSeconds ?? 0) - sim)) } };
  return emit(out, [{ kind: 'bankUsed', n: sim }], out.time, calendarYear(out, content));
}

/** The catch-up loop shared by fastForward (capped) and useBank (uncapped): the holds, the away rules, the report
 *  (returned as lastOffline). */
function catchUp(state: GameState, content: Content, requested: number, capped: boolean): GameState {
  const ix = idx(content);
  const cfg = offlineCfg(content);
  const report: OfflineReport = {
    requested, simulated: 0, heldBy: null, from: state.time, to: state.time, capital: 0, mandate: 0, population: 0,
    decades: 0, dividends: 0, crises: 0, marketBuys: 0, civilServiceRaises: 0, treasuryBuys: 0, lapsed: [], opened: [],
    unsettled: [], lines: {}, fromSeq: state.meta.eventSeq ?? 0, toSeq: state.meta.eventSeq ?? 0,
    dividendsForgone: 0, hindsight: 0, hindsightRate: cfg.hindsightRate, dispatchesDefaulted: 0,
  };
  if (computeFlows(state, content).pending) return { ...state, lastOffline: { ...report, heldBy: 'pending' } };
  const total = capped ? Math.min(requested, offlineCapOf(content, modsOf(state, content))) : requested;
  const broken = new Set<SectorId>();
  const unsettled = new Set<SectorId>();
  // QA fix (B6): a budget line does not decline while the proprietor is away. Before each step every line still
  // declining (no heldAt) has its `since` moved on by the step, so the step sees the line where it stood: Parliament
  // does not tighten in the player's absence, and a line held on leaving is not lost to its own decline. `shifted` is
  // the total moved per sector (to tell a redraw from the pause in the report).
  const shifted: Record<SectorId, number> = {};
  const pause = (x: GameState, by: number): GameState => {
    let sectors: GameState['sectors'] | null = null;
    for (const id of ix.ids) {
      const es = x.sectors[id];
      const b = es?.budget;
      if (!es?.open || !b || es.settled || (b.heldAt !== undefined && Number.isFinite(b.heldAt))) continue;
      sectors ??= { ...x.sectors };
      sectors[id] = { ...es, budget: { ...b, since: b.since + by } };
      shifted[id] = (shifted[id] ?? 0) + by;
    }
    return sectors ? { ...x, sectors } : x;
  };
  let s = state;
  let held: { by: OfflineReport['heldBy']; sector?: SectorId } | null = null;
  if (total > 0) {
    const n = Math.ceil(total / FAST_FORWARD_STEP - 1e-9);
    const h = total / n;
    for (let i = 0; i < n; i++) {
      const snap = { ...shifted };
      const t = step(pause(s, h), content, h, false, true);
      if (t === s) { for (const k of Object.keys(shifted)) shifted[k] = snap[k] ?? 0; break; }
      // the hold: discard a step that fires what holdBefore names
      if (cfg.holdBefore !== null) {
        const pend = computeFlows(t, content).pending;
        const undo = () => { for (const k of Object.keys(shifted)) shifted[k] = snap[k] ?? 0; };
        if (pend) { held = { by: pend.cause === 'chosen' ? 'collapse' : pend.cause, sector: pend.sector }; undo(); break; }
        if (cfg.holdBefore === 'crisis') {
          const cs = ix.ids.find((id) => (t.sectors[id]?.crisesFired ?? 0) > (s.sectors[id]?.crisesFired ?? 0));
          if (cs !== undefined) { held = { by: 'crisis', sector: cs }; undo(); break; }
        }
        // M4: nor a capstone going into arrears (under 'crisis' and 'collapse' alike)
        if (ix.anyM4) {
          const ar = ix.ids.find((id) => !!t.sectors[id]?.arrears && !s.sectors[id]?.arrears);
          if (ar !== undefined) { held = { by: 'arrears', sector: ar }; undo(); break; }
        }
      }
      // what this step did (its events are the newest in t.events)
      const seq0 = s.meta.eventSeq ?? 0;
      let choices = 0;
      for (const e of t.events ?? []) {
        if (e.seq <= seq0) continue;
        switch (e.kind) {
          case 'decade':
            report.decades++;
            if (e.sector && sectorSteady(content, e.sector).choices.length) choices++;
            break;
          case 'crisis': report.crises++; break;
          case 'upgradeBought': case 'appFounded': if (e.by === 'market') report.marketBuys++; break;
          case 'leverEnacted': if (e.by === 'civilService') report.civilServiceRaises++; break;
          case 'commonsBuilt': if (e.by === 'treasury') report.treasuryBuys++; break;
          case 'leverLapsed': if (e.id) report.lapsed.push(e.id); break;
          case 'sectorOpened': if (e.sector) report.opened.push(e.sector); break;
          case 'unsettled': if (e.sector) { report.unsettled.push(e.sector); unsettled.add(e.sector); } break;
          case 'dispatchAnswered': if (e.by === 'default') report.dispatchesDefaulted!++; break;
          default: break;
        }
      }
      // offers made (no overflow away: nothing else changes the list inside a step) and choices forgone
      const made = Math.max(0, Math.min(choices, t.pendingDividends.length - s.pendingDividends.length));
      report.dividends += made;
      report.dividendsForgone! += choices - made;
      // a line is broken when a step leaves its decade streak at 0 (it reset, or never held)
      for (const id of ix.ids) {
        const b = t.sectors[id];
        if (b?.open && b.budget && !b.settled && !(b.steadyYears > 0)) broken.add(id);
      }
      s = t;
      report.simulated += h;
    }
  }
  report.simulated = fin(report.simulated);
  report.heldBy = held ? held.by : total < requested ? 'cap' : null;
  if (held?.sector !== undefined && held.by !== 'cap') report.heldSector = held.sector;
  for (const id of ix.ids) {
    const b = s.sectors[id], a = state.sectors[id];
    if (!b?.open || !b.budget) continue;
    if (b.settled && !unsettled.has(id)) report.lines[id] = 'settled';
    else if (!a?.budget || Math.abs(a.budget.since + (shifted[id] ?? 0) - b.budget.since) > 1e-6 || a.budget.r0 !== b.budget.r0) report.lines[id] = 'drawn';
    else if (broken.has(id)) report.lines[id] = 'broken';
    else report.lines[id] = 'held';
  }
  report.to = s.time;
  report.capital = fin(s.capital - state.capital);
  report.mandate = fin(s.mandate - state.mandate);
  report.population = fin(s.population - state.population);
  report.toSeq = s.meta.eventSeq ?? 0;
  // Hindsight at offline.hindsightRate: withhold (1 − rate) of the change in the unrounded terms (types.ts)
  const t0 = hindsightTerms(state, content);
  if (s !== state && cfg.hindsightRate < 1) {
    const dW = fin((1 - cfg.hindsightRate) * (termsSum(hindsightTerms(s, content)) - termsSum(t0)));
    if (dW !== 0) s = { ...s, run: { ...s.run, hindsightWithheld: fin((s.run.hindsightWithheld ?? 0) + dW) } };
  }
  report.hindsight = s === state ? 0 : hindsightTerms(s, content).total - t0.total;
  return { ...s, lastOffline: report };
}
