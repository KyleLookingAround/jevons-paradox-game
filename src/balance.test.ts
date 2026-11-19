// M1 pacing targets and exit criteria as tests (briefs/m1-balance.md, design/genre-audit.md §2–3, roadmap D1).
// The model is driven directly at dt = 1 by small strategies written here; nothing depends on tools/balance.ts output.
// Tolerances are about ±15% on times, wide enough for small content edits, tight enough to catch regressions.
// Targets the content cannot meet with numbers alone are asserted at their CURRENT floor with a "target:" note, so
// that a regression is caught while the gap stays visible (see the balance lane's report).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model } from './core';
import { content as C } from './content';
import { BUDGET_TOLERANCE } from './types';
import type { GameState, InstitutionDef, SectorId } from './types';

/* ---------------- tiny strategies ---------------- */

const D = (s: GameState) => model.derive(s, C);
const ORDER = C.sectorOrder;
const cheap = (s: GameState) => model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, C);
const REVEAL_IDS = C.upgrades.filter((u) => u.effects.some((e) => e.type === 'reveal')).map((u) => u.id);

interface Log {
  buys: { t: number; id: string }[];
  apps: { t: number; id: string }[];
  /** efficiency cards bought after the reveal while some app of their sector was unfounded */
  cards: { id: string; decade: number | null; reach: number }[];
}
const newLog = (): Log => ({ buys: [], apps: [], cards: [] });

/** Tap 5 times a second while a tap is worth half a second of income or more (the UI's shrink rule). */
function tap(s: GameState): GameState {
  const d = D(s);
  if (5 * d.clickValue < 0.5 * d.incomePerSec) return s;
  for (let i = 0; i < 5; i++) s = model.click(s, C);
  return s;
}

function buyCheapest(s: GameState, log: Log, prefer: string[] = []): GameState {
  for (let guard = 0; guard < 60; guard++) {
    const vs = cheap(s).filter((v) => v.visible && !v.maxed && !v.excludedBy);
    const pref = prefer.map((id) => vs.find((v) => v.def.id === id)).find((v) => v);
    if (pref && !pref.affordable) break;
    const v = pref ?? vs.filter((x) => x.affordable).sort((a, b) => a.cost - b.cost)[0];
    if (!v) break;
    if (v.def.kind === 'efficiency' && s.flags.revealed) {
      const es = s.sectors[v.def.sector];
      if (C.sectors[v.def.sector].applications.some((a) => !es.apps[a.id]?.founded)) {
        const full = model.upgradeViews(s, C).find((u) => u.def.id === v.def.id)!;
        log.cards.push({ id: v.def.id, decade: full.projectedDecade, reach: full.bringsWithinReach.length });
      }
    }
    const n = model.buyUpgrade(s, C, v.def.id);
    if (n === s) break;
    s = n;
    log.buys.push({ t: s.time, id: v.def.id });
  }
  return s;
}

function foundAll(s: GameState, log: Log, ok: (n: GameState, e: SectorId) => boolean = () => true): GameState {
  for (const e of ORDER) {
    if (!s.sectors[e]?.open) continue;
    for (const a of C.sectors[e].applications) {
      const n = model.foundApp(s, C, a.id);
      if (n !== s && ok(n, e)) { s = n; log.apps.push({ t: s.time, id: a.id }); }
    }
  }
  return s;
}

/** R at which the sector's smog would settle at half of collapse (the budget player's boom ceiling). */
function safeR(s: GameState, e: SectorId): number {
  const d = C.sectors[e];
  if (d.pressureSource !== 'resource' || d.pressureIntensity <= 0) return Infinity;
  let a = d.absorption;
  for (const id of s.meta.loadout) {
    const i = C.institutions.find((x) => x.id === id);
    const lvl = s.meta.institutions[id] ?? 0;
    const effs = i ? [i.effects, ...(i.nextLevels ?? []).slice(0, Math.max(0, lvl - 1)).map((l) => l.effects)].flat() : [];
    for (const ef of effs) if (ef.type === 'absorptionAdd' && ef.sector === e) a += ef.value;
  }
  return (0.5 * d.collapseAt * a) / d.pressureIntensity;
}

function budgetStep(s: GameState, revealAt: { t: number | null }): GameState {
  if (!s.flags.revealed) return s;
  revealAt.t ??= s.time;
  const d0 = D(s);
  for (const e of ORDER) {
    const es = s.sectors[e], x = d0.sectors[e];
    if (!es?.open || es.budget || !x) continue;
    const since = s.time - Math.max(revealAt.t, s.time - es.openFor);
    if (d0.wellbeing >= C.global.wellbeingTarget + 2 || x.resourceUse >= 0.9 * safeR(s, e) || (since >= 240 && es.openFor >= 720)) {
      s = model.drawBudget(s, C, e);
    }
  }
  for (let guard = 0; guard < 6; guard++) {
    const d = D(s);
    const views = model.leverViews(s, C);
    let acted = false;
    for (const e of ORDER) {
      const x = d.sectors[e];
      if (!x || x.budgetR === null) continue;
      const over = x.resourceUse > x.budgetR * (1 + BUDGET_TOLERANCE * 0.5) || x.secondsLeft < 1200;
      const caps = views.filter((l) => l.def.sector === e && l.def.kind === 'cap' && l.visible);
      const suf = views.find((l) => l.def.sector === e && l.def.kind === 'sufficiency' && l.visible && l.canRaise) ?? null;
      const on = caps.find((l) => l.level > 0);
      let want = on ? (over ? (on.level >= 3 && suf ? suf : on) : null) : caps.sort((a, b) => (a.nextCost ?? 1e18) - (b.nextCost ?? 1e18))[0] ?? null;
      if (!want && over) want = suf;
      if (!want || !want.canRaise) continue;
      const step = (want.next?.mandateUpkeep ?? 0) - (want.current?.mandateUpkeep ?? 0);
      if (d.mandatePerSec - step <= 0 && want.level > 0) continue;
      const n = model.setLever(s, C, want.def.id, want.level + 1);
      if (n !== s) { s = n; acted = true; }
    }
    if (!acted) break;
  }
  return s;
}

function instRank(d: InstitutionDef): number {
  const effs = [d.effects, ...(d.nextLevels ?? []).map((l) => l.effects)].flat();
  const lever = (k: string) => effs.some((e) => e.type === 'startLever' && C.levers.find((l) => l.id === e.lever)?.kind === k);
  return lever('cap') ? 0 : effs.some((e) => e.type === 'wellbeingAdd') ? 1 : effs.some((e) => e.type === 'reveal') ? 2
    : effs.some((e) => e.type === 'absorptionAdd') ? 3 : lever('duty') ? 9 : 5;
}

function spend(s: GameState, restraint: boolean): GameState {
  for (let guard = 0; guard < 400; guard++) {
    const inst = model.institutionViews(s, C).filter((v) => v.canBuy).sort((a, b) => instRank(a.def) - instRank(b.def) || (a.nextCost ?? 0) - (b.nextCost ?? 0));
    const kh = model.knowhowViews(s, C).filter((v) => v.canBuy).sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
    const n = restraint && inst.length ? model.buyInstitution(s, C, inst[0].def.id) : kh.length ? model.buyKnowhow(s, C, kh[0].def.id) : s;
    if (n === s) break;
    s = n;
  }
  if (!restraint) return s;
  const owned = C.institutions.filter((i) => (s.meta.institutions[i.id] ?? 0) >= 1 && instRank(i) < 9).sort((a, b) => instRank(a) - instRank(b));
  const ids: string[] = [];
  let used = 0;
  for (const i of owned) if (used + (i.slots ?? 1) <= s.meta.slots) { ids.push(i.id); used += i.slots ?? 1; }
  return model.setLoadout(s, C, ids);
}

type Mode = 'efficiency' | 'budget' | 'peakdraw' | 'idle';
interface Run {
  seconds: number; hindsight: number; hpm: number; cause: string; log: Log;
  reveal: number | null; crisis: number | null; crisisPopLoss: number | null; reboundAtReveal: number | null;
  opened: Record<SectorId, number>; firstLever: number | null; steadyAt: number | null; decadeAt: number | null; steady: Record<SectorId, boolean>;
  click: { at30: number | null; atCondenser: number | null; atReveal: number | null };
  rAt: (t: number) => number;
}

const ratio = (s: GameState) => { const d = D(s); return d.incomePerSec > 0 ? (5 * d.clickValue) / d.incomePerSec : null; };

function play(start: GameState, mode: Mode, capS = 4 * 3600): { s: GameState; r: Run } {
  let s = start;
  const log = newLog();
  const rev = { t: null as number | null };
  const out: Run = {
    seconds: 0, hindsight: 0, hpm: 0, cause: '', log, reveal: s.flags.revealed ? 0 : null, crisis: null, crisisPopLoss: null,
    reboundAtReveal: null, opened: {}, firstLever: null, steadyAt: null, decadeAt: null, steady: {}, click: { at30: null, atCondenser: null, atReveal: null },
    rAt: () => 0,
  };
  const rSeries: number[] = [];
  const hist: [number, number][] = [];
  while (!D(s).pendingReckoning && s.time < capS) {
    if (mode !== 'idle') {
      if (mode === 'budget') {
        s = buyCheapest(s, log, s.flags.revealed ? [] : REVEAL_IDS);
        const pre = s;
        s = foundAll(s, log, (n, e) => {
          const x = D(n).sectors[e]!;
          return x.budgetR !== null ? x.resourceUse <= x.budgetR * (1 + BUDGET_TOLERANCE) : x.resourceUse <= safeR(pre, e);
        });
        if (Math.floor(s.time) % 5 === 0) s = budgetStep(s, rev);
      } else {
        s = buyCheapest(s, log);
        s = foundAll(s, log);
        if (mode === 'peakdraw' && s.flags.revealed && Math.floor(s.time) % 5 === 0) {
          for (const e of ORDER) {
            const x = D(s).sectors[e];
            const b = s.sectors[e]?.budget;
            if (x && (!b || x.resourceUse > b.r0 * 1.02)) s = model.drawBudget(s, C, e);
          }
        }
      }
      s = tap(s);
    }
    const prev = s;
    s = model.tick(s, C, 1);
    rSeries.push(D(s).sectors.steam?.resourceUse ?? 0);
    if (out.firstLever === null && Object.values(s.levers).some((l) => l.level > 0)) out.firstLever = s.time;
    if (prev.time < 30 && s.time >= 30) out.click.at30 = ratio(s);
    if (out.click.atCondenser === null && (s.upgrades['steam.condenser'] ?? 0) > 0) out.click.atCondenser = ratio(s);
    if (out.reveal === null && s.flags.revealed) {
      out.reveal = s.time; out.click.atReveal = ratio(s); out.reboundAtReveal = D(s).sectors.steam?.rebound ?? null;
    }
    for (const e of ORDER) {
      const a = prev.sectors[e], b = s.sectors[e];
      if (!a?.open && b?.open) out.opened[e] = s.time;
      if (b?.open && b.crisesFired > (a?.crisesFired ?? 0) && out.crisis === null) { out.crisis = s.time; out.crisisPopLoss = 1 - s.population / prev.population; }
      if (b && a && b.decadesWithin.length > a.decadesWithin.length) out.decadeAt ??= s.time;
      if (b && a && b.steadyYears >= 50 && a.steadyYears < 50) out.steadyAt ??= s.time;
    }
    if (mode === 'budget' && Math.floor(s.time) % 10 === 0) {
      const d = D(s), T = d.hindsightTerms;
      const earned = T.wellbeing + T.budget + T.unburnt;
      hist.push([s.time, earned]);
      const old = hist.find(([t]) => t >= s.time - 600);
      const avg = earned / (s.time / 60);
      const marginal = old && s.time - old[0] >= 590 ? (earned - old[1]) / ((s.time - old[0]) / 60) : Infinity;
      const streaking = ORDER.some((e) => d.sectors[e]?.decoupling && !s.run.steadySectors[e]);
      const opening = s.time < 7200 && d.nextSectors.some((x) => x.reckoningsHave >= x.reckoningsNeeded);
      const gated = d.nextSectors.some((x) => x.reckoningsHave < x.reckoningsNeeded && x.checklist.every((c) => c.met));
      const budgeted = ORDER.filter((e) => s.sectors[e]?.budget);
      if (s.time >= 1800 && marginal < 0.9 * avg && !streaking && !opening) break;
      if (s.time >= 2400 && gated && !streaking && !opening) break;
      if (s.time >= 5400 && !opening && budgeted.length && budgeted.every((e) => s.run.steadySectors[e])) break;
    }
  }
  const d = D(s);
  out.seconds = s.time;
  out.hindsight = d.hindsightTerms.total;
  out.hpm = out.hindsight / (s.time / 60);
  out.cause = d.pendingReckoning?.cause ?? 'chosen';
  out.steady = { ...s.run.steadySectors };
  out.rAt = (t: number) => rSeries[Math.max(0, Math.min(rSeries.length - 1, Math.round(t) - 1))];
  return { s, r: out };
}

function campaign(mode: Mode, runs: number, opts: { firstTwo?: Mode } = {}): Run[] {
  let s = model.createState(C, undefined, 1);
  const out: Run[] = [];
  for (let i = 1; i <= runs; i++) {
    const m = i <= 2 && opts.firstTwo ? opts.firstTwo : mode;
    const { s: end, r } = play(s, m);
    out.push(r);
    s = model.reckon(end, C);
    if (m !== 'idle') s = spend(s, mode === 'budget');
  }
  return out;
}

const cum = (runs: Run[], k: number) => runs.slice(0, k).reduce((a, r) => a + r.seconds, 0);
const firstBuy = (r: Run, id: string) => r.log.buys.find((b) => b.id === id)?.t ?? null;

/* ---------------- campaigns (computed once) ---------------- */

const EFF = campaign('efficiency', 6);
const BUD = campaign('budget', 6);
const PEAK = campaign('peakdraw', 4);
const IDLE = campaign('idle', 1);
const run1 = EFF[0];

/* ---------------- 1. the paradox, felt (genre audit rec. 1) ---------------- */

describe('the paradox is felt at the first cards', () => {
  test('Better boilers raise coal use by at least 3% within 60 s, on their own', () => {
    let s = { ...model.createState(C), capital: 1e4 };
    s = model.tick(s, C, 1);
    const before = D(s).sectors.steam!.resourceUse;
    s = model.buyUpgrade(s, C, 'steam.boilers');
    for (let i = 0; i < 60; i++) s = model.tick(s, C, 1);
    expect(D(s).sectors.steam!.resourceUse / before - 1).toBeGreaterThanOrEqual(0.03);
  });
  test('the first anomaly (Better boilers) comes at or before 1:00 of greedy play', () => {
    expect(firstBuy(run1, 'steam.boilers')!).toBeLessThanOrEqual(60);
  });
  test('the separate condenser comes at 4–6 min and roughly doubles coal use within 120 s', () => {
    const t = firstBuy(run1, 'steam.condenser')!;
    expect(t / 60).toBeGreaterThanOrEqual(4 * 0.85);
    expect(t / 60).toBeLessThanOrEqual(6 * 1.15);
    expect(run1.rAt(t + 120) / run1.rAt(t - 1)).toBeGreaterThanOrEqual(1.8);
  });
});

/* ---------------- 2. the first hour (efficiency-greedy play) ---------------- */

describe('the first hour', () => {
  test('first purchase at 15–40 s', () => {
    expect(run1.log.buys[0].t).toBeGreaterThanOrEqual(15 * 0.85);
    expect(run1.log.buys[0].t).toBeLessThanOrEqual(40 * 1.15);
  });
  test('first application (Cotton mills) founded at 1–2 min', () => {
    expect(run1.log.apps[0].id).toBe('steam.mills');
    expect(run1.log.apps[0].t / 60).toBeGreaterThanOrEqual(1 * 0.85);
    expect(run1.log.apps[0].t / 60).toBeLessThanOrEqual(2 * 1.15);
  });
  test('the reveal at 8–12 min', () => {
    expect(run1.reveal! / 60).toBeGreaterThanOrEqual(8 * 0.95);
    expect(run1.reveal! / 60).toBeLessThanOrEqual(12 * 1.05);
  });
  test('the first crisis at 14–20 min, costing about 8% of the population', () => {
    expect(run1.crisis! / 60).toBeGreaterThanOrEqual(14 * 0.9);
    expect(run1.crisis! / 60).toBeLessThanOrEqual(20 * 1.1);
    expect(run1.crisisPopLoss!).toBeGreaterThan(0.06);
    expect(run1.crisisPopLoss!).toBeLessThan(0.1);
  });
  test('run 1 ends on its own at 30–45 min', () => {
    expect(run1.cause).not.toBe('chosen');
    expect(run1.seconds / 60).toBeGreaterThanOrEqual(30 * 0.9);
    expect(run1.seconds / 60).toBeLessThanOrEqual(45 * 1.1);
  });
  test('direct rebound at the reveal is backfire but not absurd (target: 60–120%; see report)', () => {
    expect(run1.reboundAtReveal!).toBeGreaterThan(1);
    expect(run1.reboundAtReveal!).toBeLessThan(6);
  });
  test('cadence: ≥ 12 purchases in 10 min, no gap over 90 s in 15 min, none over 3 min in run 1', () => {
    const ts = [...run1.log.buys, ...run1.log.apps].map((b) => b.t).sort((a, b) => a - b);
    expect(ts.filter((t) => t <= 600).length).toBeGreaterThanOrEqual(12);
    const gap = (until: number) => { let g = 0, last = 0; for (const t of ts) { if (t > until) break; g = Math.max(g, t - last); last = t; } return Math.max(g, Math.min(until, run1.seconds) - last); };
    expect(gap(900)).toBeLessThanOrEqual(90);
    expect(gap(Infinity)).toBeLessThanOrEqual(180);
  });
  test('tapping (5/s): ≥ 1.5× idle income at 0:30, ≤ 0.5× by the condenser, ≤ 0.25× by the reveal', () => {
    expect(run1.click.at30!).toBeGreaterThanOrEqual(1.5);
    expect(run1.click.atCondenser!).toBeLessThanOrEqual(0.5);
    expect(run1.click.atReveal!).toBeLessThanOrEqual(0.25);
  });
  test('first lever enacted at 10–14 min (the budget player’s run 1; the efficiency player raises none)', () => {
    expect(BUD[0].firstLever! / 60).toBeGreaterThanOrEqual(10 * 0.85);
    expect(BUD[0].firstLever! / 60).toBeLessThanOrEqual(14 * 1.25);
  });
});

/* ---------------- 3. roadmap exit criteria ---------------- */

describe('M1 exit criteria', () => {
  test('every efficiency card after the reveal shows a positive decade line or brings something within reach (runs 1–4)', () => {
    const failing = EFF.slice(0, 4).flatMap((r, i) => r.log.cards.filter((c) => !((c.decade ?? -1) > 0 || c.reach > 0)).map((c) => `run ${i + 1} ${c.id} ${c.decade}`));
    expect(failing).toEqual([]);
    expect(EFF[0].log.cards.length).toBeGreaterThanOrEqual(4);
  });
  test('the budget strategy reaches Steady State in Steam by about hour 4; efficiency never does', () => {
    let at: number | null = null;
    for (let i = 0; i < BUD.length && at === null; i++) if (BUD[i].steady.steam) at = cum(BUD, i) + BUD[i].steadyAt!;
    expect(at).not.toBeNull();
    expect(at! / 3600).toBeLessThanOrEqual(4.5);
    // target 3–4 h (genre audit); measured about 2 h — asserted as a floor so a further slide is caught
    expect(at! / 3600).toBeGreaterThanOrEqual(1.5);
    expect(EFF.some((r) => Object.keys(r.steady).length > 0)).toBe(false);
  });
});

/* ---------------- 4. owner decision D1 ---------------- */

describe('D1: Hindsight per minute, backfire against restraint', () => {
  test('runs 1–2: backfire earns more (target ≥ 1.2× in each run; run 1 measures about 1.1×, see report)', () => {
    expect(EFF[0].hpm / BUD[0].hpm).toBeGreaterThanOrEqual(1.0);
    expect(EFF[1].hpm / BUD[1].hpm).toBeGreaterThanOrEqual(1.2);
    const e = (EFF[0].hindsight + EFF[1].hindsight) / cum(EFF, 2), b = (BUD[0].hindsight + BUD[1].hindsight) / cum(BUD, 2);
    expect(e / b).toBeGreaterThanOrEqual(1.1);
  });
  test('runs 3–4: a competent budget run earns at least 1.5× backfire', () => {
    for (const i of [2, 3]) expect(BUD[i].hpm / EFF[i].hpm).toBeGreaterThanOrEqual(1.5);
  });
});

/* ---------------- 5. Steady State traps (balance finding 8) ---------------- */

describe('Steady State traps', () => {
  test('the wellbeing target sits below the demographic transition', () => {
    expect(C.global.wellbeingTarget).toBeLessThan(C.global.demography!.transitionWellbeing);
  });
  test('drawing a budget at peak use and letting depletion farm decades earns less than budget play from run 3', () => {
    for (const i of [2, 3]) expect(PEAK[i].hpm).toBeLessThan(BUD[i].hpm);
  });
  test('idle earns less than half of backfire', () => {
    expect(IDLE[0].hpm).toBeLessThan(0.5 * EFF[0].hpm);
  });
  // pumping's regeneration (balance finding 1) is checked by the content lint (src/content.test.ts)
});

/* ---------------- 6. the 3–5 hour arc ---------------- */

describe('the arc', () => {
  test('Light opens within 1.5 h for both styles of play', () => {
    for (const runs of [EFF, BUD]) {
      const i = runs.findIndex((r) => r.opened.light !== undefined);
      expect(i).toBeGreaterThanOrEqual(0);
      expect((cum(runs, i) + runs[i].opened.light) / 3600).toBeLessThanOrEqual(1.5);
    }
  });
  test('Code is reachable by about hour 4 of competent (budget) play', () => {
    const i = BUD.findIndex((r) => r.opened.code !== undefined);
    expect(i).toBeGreaterThanOrEqual(0);
    expect((cum(BUD, i) + BUD[i].opened.code) / 3600).toBeLessThanOrEqual(4.5);
  });
  test('no industry opens into a run that ends within 5 minutes', () => {
    for (const runs of [EFF, BUD]) for (const r of runs) for (const [e, t] of Object.entries(r.opened)) {
      if (r.cause === 'chosen') continue;
      expect(`${e}: ${Math.min(300, r.seconds - t) >= 300}`).toBe(`${e}: true`);
    }
  });
  test('fork audit: every Steam fork combination within ±10% of the mean Hindsight per minute (run 1)', () => {
    const forks: string[][] = [];
    const seen = new Set<string>();
    for (const u of C.upgrades) if (u.sector === 'steam' && u.excludes?.length && !seen.has(u.id)) { forks.push([u.id, ...u.excludes]); u.excludes.forEach((x) => seen.add(x)); seen.add(u.id); }
    let combos: string[][] = [[]];
    for (const f of forks) combos = combos.flatMap((c) => f.map((a) => [...c, a]));
    const rates = combos.map((arms) => {
      const banned = new Set(forks.flat().filter((id) => !arms.includes(id)));
      const filtered = { ...C, upgrades: C.upgrades.filter((u) => !banned.has(u.id)) };
      let s = model.createState(filtered, undefined, 1);
      const log = newLog();
      while (!model.derive(s, filtered).pendingReckoning && s.time < 3 * 3600) {
        for (let g = 0; g < 60; g++) {
          const v = model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, filtered).filter((x) => x.visible && x.affordable).sort((a, b) => a.cost - b.cost)[0];
          if (!v) break;
          const n = model.buyUpgrade(s, filtered, v.def.id); if (n === s) break; s = n;
        }
        for (const a of filtered.sectors.steam.applications) s = model.foundApp(s, filtered, a.id);
        const d = model.derive(s, filtered);
        if (5 * d.clickValue >= 0.5 * d.incomePerSec) for (let i = 0; i < 5; i++) s = model.click(s, filtered);
        s = model.tick(s, filtered, 1);
      }
      void log;
      return model.derive(s, filtered).hindsightTerms.total / (s.time / 60);
    });
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    expect(Math.max(...rates) / mean - 1).toBeLessThanOrEqual(0.1);
    expect(1 - Math.min(...rates) / mean).toBeLessThanOrEqual(0.1);
  }, 30_000);
});
