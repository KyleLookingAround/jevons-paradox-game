// The scripted players behind the pacing tests (src/balance.test.ts, the fast set; src/balance.long.test.ts, the long
// campaigns behind BAL_LONG=1). They mirror tools/balance.ts (the same rules, fewer options) and drive the model directly
// at dt = 1; nothing depends on balancer output. Not a test file: shared so both files play exactly the same players.
import { model } from './core';
import { content as C } from './content';
import { BUDGET_TOLERANCE } from './types';
import type { FeatureId, GameState, InstitutionDef, SectorId } from './types';

export { C };
/* ---------------- tiny strategies (mirroring tools/balance.ts) ---------------- */

export const D = (s: GameState) => model.derive(s, C);
export const ORDER = C.sectorOrder;
export const TARGET = C.global.wellbeingTarget;
export const cheap = (s: GameState) => model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, C);
export const REVEAL_IDS = C.upgrades.filter((u) => u.effects.some((e) => e.type === 'reveal')).map((u) => u.id);

export interface Log {
  buys: { t: number; id: string }[];
  apps: { t: number; id: string }[];
  /** efficiency cards bought after the reveal while some app of their sector was unfounded */
  cards: { id: string; decade: number | null; reach: number }[];
  /** run times of player decisions (run.decisions rising) */
  decisions: number[];
  marketBuys: number[];
}
export const newLog = (): Log => ({ buys: [], apps: [], cards: [], decisions: [], marketBuys: [] });

/** Tap 5 times a second while a tap is worth half a second of income or more (the UI's shrink rule). */
export function tap(s: GameState): GameState {
  const d = D(s);
  if (5 * d.clickValue < 0.5 * d.incomePerSec) return s;
  for (let i = 0; i < 5; i++) s = model.click(s, C);
  return s;
}

export function buyCheapest(s: GameState, log: Log, prefer: string[] = []): GameState {
  for (let guard = 0; guard < 60; guard++) {
    const vs = cheap(s).filter((v) => v.visible && !v.maxed && !v.excludedBy);
    const pref = prefer.map((id) => vs.find((v) => v.def.id === id)).find((v) => v);
    if (pref && !pref.affordable) break;
    const v = pref ?? vs.filter((x) => x.affordable).sort((a, b) => a.cost - b.cost)[0];
    if (!v) break;
    if (v.def.kind === 'efficiency' && s.flags.revealed) {
      const es = s.sectors[v.def.sector];
      // a frontier left to bring within reach: some application not yet available (unfolding balance: an application
      // already available but not yet afforded cannot be brought within reach, and the decade line is honest about it)
      if (C.sectors[v.def.sector].applications.some((a) => !es.apps[a.id]?.available)) {
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

export function foundAll(s: GameState, log: Log, ok: (n: GameState, e: SectorId) => boolean = () => true): GameState {
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
export function safeR(s: GameState, e: SectorId): number {
  const d = C.sectors[e];
  if (d.pressureSource !== 'resource' || d.pressureIntensity <= 0) return Infinity;
  let a = d.absorption;
  for (const k of C.knowhow) for (const ef of k.effects) if (ef.type === 'absorptionAdd' && ef.sector === e) a += ef.value * (s.meta.knowhow[k.id] ?? 0);
  for (const id of s.meta.loadout) {
    const i = C.institutions.find((x) => x.id === id);
    const lvl = s.meta.institutions[id] ?? 0;
    const effs = i && lvl >= 1 ? [i.effects, ...(i.nextLevels ?? []).slice(0, lvl - 1).map((l) => l.effects)].flat() : [];
    for (const ef of effs) if (ef.type === 'absorptionAdd' && ef.sector === e) a += ef.value;
  }
  for (const [id, lvl] of Object.entries(s.upgrades)) for (const ef of C.upgrades.find((u) => u.id === id)?.effects ?? []) if (ef.type === 'absorptionAdd' && ef.sector === e) a += ef.value * lvl;
  return (0.5 * d.collapseAt * a) / d.pressureIntensity;
}

export const upkeepStep = (s: GameState, id: string): number => {
  const v = model.leverViews(s, C).find((l) => l.def.id === id)!;
  return (v.next?.mandateUpkeep ?? 0) - (v.current?.mandateUpkeep ?? 0);
};

export interface Memo { revealAt: number | null; lastSpare: number; lastStock?: number; stockP?: Record<string, number>; lastPush?: Record<string, number>; lastSky?: Record<string, number>; skyP?: Record<string, number> }

/** Before budgets arrive (the unfolding: runs 1–2), restraint is levers only: the cheapest lever raised whenever Mandate
 *  allows and the net rate stays positive (tools/balance.ts `levers` rule), authored levels only. */
export function leverStep(s: GameState): GameState {
  for (let guard = 0; guard < 10; guard++) {
    const net = D(s).mandatePerSec;
    const l = model.leverViews(s, C).filter((v) => v.canRaise && v.nextCost !== null && v.level < v.def.levels.length && net - upkeepStep(s, v.def.id) > 0)
      .sort((a, b) => (a.nextCost ?? 0) - (b.nextCost ?? 0))[0];
    if (!l) break;
    const n = model.setLever(s, C, l.def.id, l.level + 1);
    if (n === s) break;
    s = n;
  }
  return s;
}

/** The budget player's line: draw (switching the Market off there), cap, Tighten, sufficiency, spare circularity. */
export function budgetStep(s: GameState, m: Memo, marketOff: boolean): GameState {
  if (!s.flags.revealed) return s;
  m.revealAt ??= s.time;
  const d0 = D(s);
  if (!d0.features.budget) return leverStep(s);
  for (const e of ORDER) {
    const es = s.sectors[e], x = d0.sectors[e];
    if (!es?.open || es.budget || !x) continue;
    const since = s.time - Math.max(m.revealAt, s.time - es.openFor);
    // M3: a later Industry's line waits until it has been open 12 minutes (tools/balance.ts)
    if ((e === ORDER[0] || es.openFor >= 720) && (d0.wellbeing >= TARGET + 2 || x.resourceUse >= 0.9 * safeR(s, e) || (since >= 240 && es.openFor >= 720))) {
      const n = model.drawBudget(s, C, e);
      if (n !== s) { s = n; if (marketOff) s = model.setOrders(s, C, { market: { sectors: { [e]: false } } }); }
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
      let want = on ? (over ? (on.level >= 3 && suf ? suf : on) : null) : caps.sort((a, b) => (a.nextCost ?? Infinity) - (b.nextCost ?? Infinity))[0] ?? null;
      if (!want && over) want = suf;
      if (!want || !want.canRaise || want.nextCost === null) continue;
      if (d.mandatePerSec - upkeepStep(s, want.def.id) <= 0 && want.level > 0) continue;
      const n = model.setLever(s, C, want.def.id, want.level + 1);
      if (n !== s) { s = n; acted = true; }
    }
    if (!acted) break;
  }
  if (s.time - m.lastSpare >= 60) {
    const dm = D(s);
    const circ = model.leverViews(s, C).filter((l) => l.def.kind === 'circularity' && l.visible && l.canRaise && l.nextCost !== null)
      .filter((l) => s.mandate >= 400 + 3 * (l.nextCost ?? 0) && dm.mandatePerSec - upkeepStep(s, l.def.id) > 0.05)
      .sort((a, b) => (a.nextCost ?? 0) - (b.nextCost ?? 0))[0];
    if (circ) { const n = model.setLever(s, C, circ.def.id, circ.level + 1); if (n !== s) { s = n; m.lastSpare = s.time; } }
  }
  s = tendStock(s, m);
  s = pushToSink(s, m, 120, 0);
  s = towardsSky(s, m, 60, 0);
  const d = D(s);
  if (d.mandatePerSec < 0 && s.mandate < -60 * d.mandatePerSec) {
    const worst = model.leverViews(s, C).filter((l) => l.level > 0 && l.def.kind !== 'cap').sort((a, b) => b.upkeep - a.upkeep)[0];
    if (worst) s = model.setLever(s, C, worst.def.id, worst.level - 1);
  }
  return s;
}

/** M3 (tools/balance.ts pushToSink): under a held line that has not cleared the sky, water wheels, then temperance, then
 *  green spending, one step every `every` s per Industry once the line has held `heldFor` s, while Mandate allows. */
export function pushToSink(s: GameState, m: Memo, every: number, heldFor: number): GameState {
  const d = D(s);
  m.lastPush ??= {};
  const order = ['substitution', 'sufficiency', 'greenSpending'];
  for (const e of ORDER) {
    const x = d.sectors[e], es = s.sectors[e];
    if (!x || !es?.open || es.settled || x.budgetR === null || x.clearP === null) continue;
    if (es.pressure <= x.clearP || x.resourceUse > x.budgetR * (1 + BUDGET_TOLERANCE) || es.steadyYears * 20 < heldFor) continue;
    if (s.time - (m.lastPush[e] ?? -Infinity) < every) continue;
    const l = model.leverViews(s, C).filter((v) => v.def.sector === e && order.includes(v.def.kind) && v.visible && v.canRaise && v.nextCost !== null
      && s.mandate >= (v.nextCost ?? 0) + 100 && d.mandatePerSec - upkeepStep(s, v.def.id) > 0.05)
      .sort((a, b) => order.indexOf(a.def.kind) - order.indexOf(b.def.kind) || a.level - b.level)[0];
    if (!l) continue;
    const n = model.setLever(s, C, l.def.id, l.level + 1);
    if (n !== s) { s = n; m.lastPush[e] = s.time; }
  }
  return s;
}

/** M3 (tools/balance.ts tendStock): a stock nothing absorbs (Code's) is held by its own levers, one a minute while it is
 *  above 15% of collapse and rising: deletion, then shared libraries, then review. */
export function tendStock(s: GameState, m: Memo): GameState {
  if (s.time - (m.lastStock ?? -Infinity) < 60) return s;
  const d = D(s);
  for (const e of ORDER) {
    const def = C.sectors[e], x = d.sectors[e];
    if (!x || x.settled || def.pressureSource !== 'service' || def.absorption > 0) continue;
    const prevP = m.stockP?.[e];
    m.stockP = { ...(m.stockP ?? {}), [e]: s.sectors[e].pressure };
    if (x.pressureFraction < 0.15 || prevP === undefined || s.sectors[e].pressure <= prevP) continue;
    const order = ['deletion', 'sharedLibs', 'reviewGate'];
    const l = model.leverViews(s, C).filter((v) => v.def.sector === e && order.includes(v.def.kind) && v.visible && v.canRaise && v.nextCost !== null && d.mandatePerSec - upkeepStep(s, v.def.id) > 0)
      .sort((a, b) => order.indexOf(a.def.kind) - order.indexOf(b.def.kind))[0];
    if (!l) continue;
    const n = model.setLever(s, C, l.def.id, l.level + 1);
    if (n !== s) { s = n; m.lastStock = s.time; }
  }
  return s;
}

/** The plausible human restraint player (tools/balance.ts `human`; QA, 19 Nov 2026): levers before budgets; once the
 *  budget has arrived, the line drawn three minutes later at whatever the use is then (the middle pace once paces are
 *  offered), the cap's first level enacted at once, tightened only after a minute "over budget". */
export function humanStep(s: GameState, m: Memo & { budgetAt?: number; over?: Record<string, number> }): GameState {
  if (!s.flags.revealed) return s;
  const d0 = D(s);
  if (!d0.features.budget) return leverStep(s);
  m.budgetAt ??= s.time;
  m.over ??= {};
  for (const e of ORDER) {
    const es = s.sectors[e];
    if (!es?.open || es.budget || s.time - Math.max(m.budgetAt, s.time - es.openFor) < 180) continue;
    const paces = C.global.steady?.paces ?? [];
    s = model.drawBudget(s, C, e, d0.features.budgetPace && paces.length >= 2 ? paces[1].id : undefined);
  }
  const d = D(s);
  for (const e of ORDER) {
    const x = d.sectors[e];
    if (!x || x.budgetR === null) continue;
    const cap = model.leverViews(s, C).find((l) => l.def.sector === e && l.def.kind === 'cap' && l.visible);
    if (!cap) continue;
    const over = x.resourceUse > x.budgetR * (1 + BUDGET_TOLERANCE);
    if (over) m.over[e] ??= s.time; else delete m.over[e];
    if (!(cap.level === 0 || (over && s.time - m.over[e] >= 60))) continue;
    // the cap at its last level: the Industry's sufficiency next (tools/balance.ts)
    const want = cap.canRaise ? cap : over ? model.leverViews(s, C).find((l) => l.def.sector === e && l.def.kind === 'sufficiency' && l.visible && l.canRaise) : undefined;
    if (!want) continue;
    const n = model.setLever(s, C, want.def.id, want.level + 1);
    if (n !== s) { s = n; delete m.over[e]; }
  }
  if (ORDER.some((e) => C.sectors[e].pressureSource === 'service' && (s.sectors[e]?.crisesFired ?? 0) > 0)) s = tendStock(s, m);
  s = pushToSink(s, m, 300, 600);
  s = towardsSky(s, m, 300, 600);
  return s;
}

/** M3 finish (tools/balance.ts towardsSky, --ending): once Settlement has arrived, under a held line whose sky has not
 *  cleared, the cap tightened one level every `every` s per Industry while the smoke is not already falling, wellbeing
 *  is at the target and Mandate allows; with no cap left, the levers under the line; Code's stock by deletion. */
export function towardsSky(s: GameState, m: Memo, every: number, heldFor: number): GameState {
  const d = D(s);
  if (!d.features.settlement || d.wellbeing < TARGET) return s;
  m.lastSky ??= {};
  m.skyP ??= {};
  for (const e of ORDER) {
    const x = d.sectors[e], es = s.sectors[e];
    if (!x || !es?.open || es.settled || x.budgetR === null || x.clearP === null || es.clearYears > 0) continue;
    if (es.pressure > x.clearP) {
      // a thriftier engine first, where one can be bought (under a line it lowers the burn and so the smoke; the Market
      // leaves a capped Industry's cards alone, so a player who wants it settled buys them by hand)
      {
        const up = model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, C).filter((v) => v.def.sector === e && v.def.kind === 'efficiency' && v.affordable && !v.excludedBy).sort((a, b) => a.cost - b.cost)[0];
        if (up) { const nx = model.buyUpgrade(s, C, up.def.id); if (nx !== s) { s = nx; } }
      }
    }
    if (es.pressure <= x.clearP || x.resourceUse > x.budgetR * (1 + BUDGET_TOLERANCE) || es.steadyYears * 20 < heldFor) continue;
    if (s.time - (m.lastSky[e] ?? -Infinity) < every) continue;
    const p0 = m.skyP[e];
    m.skyP[e] = es.pressure;
    m.lastSky[e] = s.time;
    if (p0 === undefined || es.pressure < p0 * 0.97) continue;
    const order = C.sectors[e].pressureSource === 'service' ? ['deletion', 'sharedLibs', 'reviewGate'] : ['cap', 'substitution', 'sufficiency', 'greenSpending'];
    const l = model.leverViews(s, C).filter((v) => v.def.sector === e && order.includes(v.def.kind) && v.visible && v.canRaise && v.nextCost !== null
      && s.mandate >= (v.nextCost ?? 0) + 50 && d.mandatePerSec - upkeepStep(s, v.def.id) > 0.02)
      .sort((a, b) => order.indexOf(a.def.kind) - order.indexOf(b.def.kind) || a.level - b.level)[0];
    if (!l) continue;
    const n = model.setLever(s, C, l.def.id, l.level + 1);
    if (n !== s) s = n;
  }
  return s;
}

/** M3 finish (tools/balance.ts pursuing): worth staying in the run for the first ending: not yet won this run, and four
 *  or more Industries settled, or three with a clear streak running in another. */
export function pursuing(s: GameState): boolean {
  if (s.flags.won || (C.features?.settlement && s.meta.features?.settlement === undefined)) return false;
  // (M3 finish: and room for every Industry: GlobalParams.settleMax and the Settlement Commission)
  // M4 balance: the ending's own set (the Act I Industries), not ORDER (which holds the Previews); as tools/balance.ts
  const en = model.derive(s, C).ending;
  if (en.room < en.total) return false;
  const act = C.acts?.find((a) => a.ending);
  const set = act?.ending ? act.ending.sectors.filter((e) => !!C.sectors[e]) : ORDER;
  const streak = set.some((e) => s.sectors[e]?.open && !s.sectors[e].settled && (s.sectors[e].clearYears ?? 0) > 0);
  return en.settled >= en.total - 1 || (en.settled >= Math.max(2, en.total - 3) && streak);
}

/** Dividends (option 0, the modest one), Settlement and the Commons, as tools/balance.ts --settle --commons. */
export function restraintExtras(s: GameState, settle: boolean, commons: boolean): GameState {
  for (let g = 0; g < 20 && s.pendingDividends.length; g++) {
    const n = model.chooseDecadeDividend(s, C, s.pendingDividends[0].sector, 0);
    if (n === s) break;
    s = n;
  }
  // M3 finish: only a settlement that can be held (the net Mandate rate stays ≥ 0 after it; GlobalParams.settleHold)
  if (settle) for (const e of ORDER) if (D(s).sectors[e]?.canSettle) { const n = model.settle(s, C, e); if (n !== s && D(n).mandatePerSec >= 0) s = n; }
  if (commons) {
    for (let g = 0; g < 5; g++) {
      const d = D(s);
      if (!d.commons.available) break;
      const keep = 60 * d.incomePerSec;
      const v = model.commonsViews(s, C).filter((x) => x.canBuy && x.cost !== null && s.commons.fund + s.capital - keep >= x.cost)
        .sort((a, b) => b.nextWellbeing / Math.max(1e-9, b.cost!) - a.nextWellbeing / Math.max(1e-9, a.cost!))[0];
      if (!v) break;
      const n = model.buyCommons(s, C, v.def.id);
      if (n === s) break;
      s = n;
    }
  }
  return s;
}

/** The `market` player (run 2 on): leaves routine cards to the Market; founds what it passed over; forks, research, prospects. */
export function marketPlayer(s: GameState, log: Log, seen: Map<string, number>, okFound: (n: GameState, e: SectorId) => boolean): GameState {
  for (const e of ORDER) {
    if (!s.sectors[e]?.open) continue;
    for (const a of C.sectors[e].applications) {
      const st = s.sectors[e].apps[a.id];
      if (!st?.available || st.founded || s.capital < a.foundCost) { seen.delete(a.id); continue; }
      const since = seen.get(a.id) ?? s.time;
      seen.set(a.id, since);
      if (s.time - since < 25) continue;
      const n = model.foundApp(s, C, a.id);
      if (n !== s && okFound(n, e)) { s = n; log.apps.push({ t: s.time, id: a.id }); }
    }
  }
  for (let g = 0; g < 10; g++) {
    const v = cheap(s).filter((x) => x.visible && x.affordable && !x.maxed && !x.excludedBy
      && (x.def.kind === 'research' || x.def.kind === 'prospect' || (x.def.excludes?.length ?? 0) > 0))
      .sort((a, b) => (a.def.kind === 'research' ? -1 : 0) - (b.def.kind === 'research' ? -1 : 0) || a.cost - b.cost)[0];
    if (!v) break;
    const n = model.buyUpgrade(s, C, v.def.id);
    if (n === s) break;
    s = n;
    log.buys.push({ t: s.time, id: v.def.id });
  }
  return s;
}

export function instRank(d: InstitutionDef): number {
  const effs = [d.effects, ...(d.nextLevels ?? []).map((l) => l.effects)].flat();
  const lever = (k: string) => effs.some((e) => e.type === 'startLever' && C.levers.find((l) => l.id === e.lever)?.kind === k);
  return effs.some((e) => e.type === 'settleSlotAdd') ? -1 : lever('cap') ? 0 : effs.some((e) => e.type === 'wellbeingAdd') ? 1 : effs.some((e) => e.type === 'reveal') ? 2
    : effs.some((e) => e.type === 'absorptionAdd') ? 3 : effs.some((e) => e.type === 'orderUnlock') ? 4 : lever('duty') ? 9 : 5;
}

/** Between runs: restraint buys Institutions by rank then Know-how and seats the best loadout; backfire buys Know-how. */
export function spend(s: GameState, restraint: boolean, capsOnly = false): GameState {
  // M3 finish (tools/balance.ts): once Settlement has arrived, the restraint player saves for the room to settle
  let saving = false;
  if (restraint && (!C.features?.settlement || s.meta.features?.settlement !== undefined)) {
    for (let g = 0; g < 4; g++) {
      const room = model.institutionViews(s, C).find((v) => v.nextCost !== null && [v.def.effects, ...(v.def.nextLevels ?? []).map((l) => l.effects)].flat().some((e) => e.type === 'settleSlotAdd'));
      if (!room) break;
      if (!room.canBuy) { saving = true; break; }
      const n = model.buyInstitution(s, C, room.def.id);
      if (n === s) break;
      s = n;
    }
  }
  for (let guard = 0; guard < 400 && !saving; guard++) {
    const inst = model.institutionViews(s, C).filter((v) => v.canBuy).sort((a, b) => instRank(a.def) - instRank(b.def) || (a.nextCost ?? 0) - (b.nextCost ?? 0));
    const kh = model.knowhowViews(s, C).filter((v) => v.canBuy).sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
    const n = restraint && inst.length ? model.buyInstitution(s, C, inst[0].def.id) : kh.length ? model.buyKnowhow(s, C, kh[0].def.id) : s;
    if (n === s) break;
    s = n;
  }
  if (!restraint) return s;
  const owned = C.institutions.filter((i) => (s.meta.institutions[i.id] ?? 0) >= 1 && instRank(i) < (capsOnly ? 1 : 9) && instRank(i) !== 4).sort((a, b) => instRank(a) - instRank(b));
  const ids: string[] = [];
  let used = 0;
  for (const i of owned) if (used + (i.slots ?? 1) <= s.meta.slots) { ids.push(i.id); used += i.slots ?? 1; }
  return model.setLoadout(s, C, ids);
}

export type Mode = 'efficiency' | 'budget' | 'peakdraw' | 'idle' | 'market' | 'human';
/** ending (default true): the restraint players settle as soon as they can and stay in the run past capS (to 8 h)
 *  while pursuing() holds (tools/balance.ts --ending). */
export interface Opts { settle?: boolean; commons?: boolean; capS?: number; stopAt?: number; ending?: boolean }
export interface Run {
  seconds: number; hindsight: number; hpm: number; cause: string; log: Log; mode: Mode;
  reveal: number | null; crisis: number | null; crisisPopLoss: number | null; reboundAtReveal: number | null;
  opened: Record<SectorId, number>; firstLever: number | null; steadyAt: number | null; decadeAt: number | null;
  decadeLean: boolean | null; steady: Record<SectorId, boolean>; decades: number; fullDecades: number;
  settledAt: number | null; settledEnd: number; forcedUnsettles: number; commonsLevels: number;
  click: { at30: number | null; atCondenser: number | null; atReveal: number | null };
  rAt: (t: number) => number;
  /** the unfolding: features that unlocked during this run (run seconds), and at the Reckoning that began it (0) */
  features: Partial<Record<FeatureId, number>>;
  /** the player's own purchases and foundings in the first five minutes (ids), and the standing orders' */
  opening5: { player: string[]; market: string[] };
}

export const ratio = (s: GameState) => { const d = D(s); return d.incomePerSec > 0 ? (5 * d.clickValue) / d.incomePerSec : null; };

export function play(start: GameState, mode: Mode, opts: Opts = {}): { s: GameState; r: Run } {
  let s = start;
  const capS = opts.capS ?? 3 * 3600;
  const log = newLog();
  const memo: Memo = { revealAt: null, lastSpare: -Infinity };
  const seen = new Map<string, number>();
  const out: Run = {
    seconds: 0, hindsight: 0, hpm: 0, cause: '', log, mode, reveal: s.flags.revealed ? 0 : null, crisis: null, crisisPopLoss: null,
    reboundAtReveal: null, opened: {}, firstLever: null, steadyAt: null, decadeAt: null, decadeLean: null, steady: {}, decades: 0,
    fullDecades: 0, settledAt: null, settledEnd: 0, forcedUnsettles: 0, commonsLevels: 0,
    click: { at30: null, atCondenser: null, atReveal: null }, rAt: () => 0, features: {}, opening5: { player: [], market: [] },
  };
  for (const k of Object.keys(s.meta.features ?? {}) as FeatureId[]) if (s.meta.features![k] === s.meta.totalSeconds && s.time === 0 && s.meta.reckonings > 0) out.features[k] = 0;
  if (mode === 'market' && s.meta.reckonings >= 1) s = model.setOrders(s, C, { market: { on: true, sectors: Object.fromEntries(ORDER.map((e) => [e, true])) } });
  const restraint = mode === 'budget' || mode === 'market' || mode === 'human';
  const rSeries: number[] = [];
  const hist: [number, number][] = [];
  const pHist: [number, Record<SectorId, number>][] = [];
  const hold = { since: null as number | null, steady: 0 };
  let lastDecisions = s.run.decisions;
  const okLine = (pre: GameState) => (n: GameState, e: SectorId) => {
    const x = D(n).sectors[e]!;
    return x.budgetR !== null ? x.resourceUse <= x.budgetR * (1 + BUDGET_TOLERANCE) : x.resourceUse <= safeR(pre, e);
  };
  const ending = opts.ending !== false;
  const settleOn = !!opts.settle || ending;
  while (!D(s).pendingReckoning && (s.time < capS || (ending && restraint && s.time < 8 * 3600 && pursuing(s))) && (opts.stopAt === undefined || s.time < opts.stopAt)) {
    if (mode !== 'idle') {
      const tick5 = Math.floor(s.time) % 5 === 0;
      if (mode === 'budget') {
        s = buyCheapest(s, log, s.flags.revealed ? [] : REVEAL_IDS);
        s = foundAll(s, log, okLine(s));
        if (tick5) s = budgetStep(s, memo, true);
      } else if (mode === 'market') {
        s = marketPlayer(s, log, seen, okLine(s));
        if (tick5) s = budgetStep(s, memo, false);
      } else if (mode === 'human') {
        if (D(s).orders.market.available && s.meta.orders.market.on) s = marketPlayer(s, log, seen, () => true);
        else { s = buyCheapest(s, log, s.flags.revealed ? [] : REVEAL_IDS); s = foundAll(s, log); }
        if (tick5) s = humanStep(s, memo);
      } else {
        s = buyCheapest(s, log);
        s = foundAll(s, log);
        if (mode === 'peakdraw' && s.flags.revealed && tick5) {
          for (const e of ORDER) {
            const x = D(s).sectors[e];
            const b = s.sectors[e]?.budget;
            if (x && (!b || x.resourceUse > b.r0 * 1.02)) s = model.drawBudget(s, C, e);
          }
        }
      }
      // M3: the restraint players read their letters and answer with the default (as harmless as letting them expire,
      // but a decision, as a person reading the paper makes one; tools/balance.ts --dispatch=default lets them expire)
      if (restraint && s.dispatch?.pending?.length) { const n = model.answerDispatch(s, C, C.dispatches?.find((x) => x.id === s.dispatch!.pending[0].id)?.defaultArm ?? 0, s.dispatch.pending[0].id); if (n !== s) s = n; }
      if (restraint && tick5) {
        const b4 = s;
        s = restraintExtras(s, settleOn, !!opts.commons);
        for (const e of ORDER) if (s.sectors[e]?.settled && !b4.sectors[e]?.settled) out.settledAt ??= s.time;
      }
      if (s.run.decisions > lastDecisions) log.decisions.push(s.time);
      s = tap(s);
    }
    const prev = s;
    s = model.tick(s, C, 1);
    lastDecisions = s.run.decisions;
    for (const e of s.events) {
      if (e.seq <= prev.meta.eventSeq) continue;
      if (e.by === 'market' && (e.kind === 'upgradeBought' || e.kind === 'appFounded')) log.marketBuys.push(s.time);
      if (e.kind === 'unsettled' && e.by === 'default') out.forcedUnsettles++;
    }
    rSeries.push(D(s).sectors.steam?.resourceUse ?? 0);
    for (const k of Object.keys(s.meta.features ?? {}) as FeatureId[]) if (prev.meta.features?.[k] === undefined) out.features[k] ??= s.time;
    if (out.firstLever === null && Object.values(s.levers).some((l) => l.level > 0)) out.firstLever = s.time;
    if (prev.time < 30 && s.time >= 30) out.click.at30 = ratio(s);
    if (out.click.atCondenser === null && (s.upgrades['steam.condenser'] ?? 0) > 0) out.click.atCondenser = ratio(s);
    if (out.reveal === null && s.flags.revealed) { out.reveal = s.time; out.click.atReveal = ratio(s); out.reboundAtReveal = D(s).sectors.steam?.rebound ?? null; }
    for (const e of ORDER) {
      const a = prev.sectors[e], b = s.sectors[e];
      if (!a?.open && b?.open) out.opened[e] = s.time;
      if (b?.open && b.crisesFired > (a?.crisesFired ?? 0) && out.crisis === null) { out.crisis = s.time; out.crisisPopLoss = 1 - s.population / prev.population; }
      if (b && a && b.decadesWithin.length > a.decadesWithin.length && out.decadeAt === null) { out.decadeAt = s.time; out.decadeLean = b.decadesLean[b.decadesLean.length - 1] === true; }
      if (b?.settled && !a?.settled) out.settledAt ??= s.time;
    }
    if (out.steadyAt === null && Object.keys(s.run.steadySectors).length > Object.keys(prev.run.steadySectors).length) out.steadyAt = s.time;
    // the restraint player's Reckoning (tools/balance.ts: marginal rate, a gated next Industry, waiting for Steady State)
    if (restraint && opts.stopAt === undefined && Math.floor(s.time) % 10 === 0 && !(ending && pursuing(s))) {
      const d = D(s), T = d.hindsightTerms;
      const earned = T.wellbeing + T.budget + T.unburnt;
      hist.push([s.time, earned]);
      const old = hist.find(([t]) => t >= s.time - 600);
      const avg = earned / (s.time / 60);
      const marginal = old && s.time - old[0] >= 590 ? (earned - old[1]) / ((s.time - old[0]) / 60) : Infinity;
      pHist.push([s.time, Object.fromEntries(ORDER.map((e) => [e, s.sectors[e]?.pressure ?? 0]))]);
      while (pHist.length && pHist[0][0] < s.time - 120) pHist.shift();
      const coming = ORDER.some((e) => {
        const es = s.sectors[e], x = d.sectors[e];
        if (!es?.open || !x || s.run.steadySectors[e] || es.settled || x.clearP === null || es.clearYears > 0 || d.wellbeing < TARGET) return false;
        const o = pHist[0];
        const rate = o && s.time - o[0] >= 60 ? (o[1][e] - es.pressure) / (s.time - o[0]) : 0;
        return es.pressure <= x.clearP || (rate > 0 && (es.pressure - x.clearP) / rate <= 1800);
      });
      const steadyNow = Object.values(s.run.steadySectors).filter(Boolean).length;
      if (!coming || steadyNow > hold.steady) hold.since = coming ? s.time : null;
      hold.steady = steadyNow;
      if (coming) hold.since ??= s.time;
      const sure = ORDER.some((e) => !s.run.steadySectors[e] && !s.sectors[e]?.settled && (s.sectors[e]?.clearYears ?? 0) > 0);
      const streaking = sure || (coming && s.time - (hold.since ?? s.time) <= 2700);
      const opening = s.time < 7200 && d.nextSectors.some((x) => x.reckoningsHave >= x.reckoningsNeeded);
      const gated = d.nextSectors.some((x) => x.reckoningsHave < x.reckoningsNeeded && x.checklist.every((c) => c.met));
      const budgeted = ORDER.filter((e) => s.sectors[e]?.budget || s.sectors[e]?.settled);
      if (s.time >= 1800 && marginal < 0.9 * avg && !streaking && !opening) break;
      if (s.time >= 2400 && gated && (!streaking || steadyNow > 0) && !opening) break;
      // the human player Reckons once the next Industry waits and nothing has been decided for 150 s (tools/balance.ts)
      if (mode === 'human' && s.time >= 1800 && gated && !streaking && !opening && s.time - (log.decisions[log.decisions.length - 1] ?? 0) >= 150) break;
      // (M3: a settled Industry counts as held; with every one held there is nothing left to wait for)
      if (s.time >= 5400 && !opening && budgeted.length && budgeted.every((e) => s.run.steadySectors[e] || s.sectors[e]?.settled)) break;
    }
  }
  const d = D(s);
  out.seconds = s.time;
  out.hindsight = d.hindsightTerms.total;
  out.hpm = out.hindsight / (s.time / 60);
  out.cause = d.pendingReckoning?.cause ?? 'chosen';
  out.steady = { ...s.run.steadySectors };
  out.decades = s.run.budgetDecades;
  out.fullDecades = s.run.budgetDecades - s.run.leanDecades;
  out.settledEnd = ORDER.filter((e) => s.sectors[e]?.settled).length;
  out.commonsLevels = Object.values(s.commons.levels).reduce((a, b) => a + b, 0);
  out.rAt = (t: number) => rSeries[Math.max(0, Math.min(rSeries.length - 1, Math.round(t) - 1))];
  out.opening5 = {
    player: (s.run.opening ?? []).filter((a) => a.t <= 300 && a.by === 'player').map((a) => a.id),
    market: (s.run.opening ?? []).filter((a) => a.t <= 300 && a.by !== 'player').map((a) => a.id),
  };
  return { s, r: out };
}

/** Consecutive runs (the prestige loop). `firstTwo` plays runs 1–2 in another mode (mixed: efficiency, then budget). */
export function campaign(mode: Mode, runs: number, opts: Opts & { firstTwo?: Mode; untilHours?: number; capsOnly?: boolean } = {}): { runs: Run[]; ends: GameState[] } {
  let s = model.createState(C, undefined, 1);
  const out: Run[] = [];
  const ends: GameState[] = [];
  let cumS = 0;
  for (let i = 1; opts.untilHours !== undefined ? cumS < opts.untilHours * 3600 : i <= runs; i++) {
    const m = i <= 2 && opts.firstTwo ? opts.firstTwo : mode;
    const { s: end, r } = play(s, m, opts);
    out.push(r);
    ends.push(end);
    cumS += r.seconds;
    s = model.reckon(end, C);
    if (m !== 'idle') s = spend(s, mode === 'budget' || mode === 'market' || mode === 'human', opts.capsOnly);
  }
  return { runs: out, ends };
}

export const cum = (runs: Run[], k: number) => runs.slice(0, k).reduce((a, r) => a + r.seconds, 0);
export const firstBuy = (r: Run, id: string) => r.log.buys.find((b) => b.id === id)?.t ?? null;
/** Cumulative hours at the first Steady State of a campaign, or null. */
export const firstSteadyH = (runs: Run[]) => { const i = runs.findIndex((r) => r.steadyAt !== null); return i < 0 ? null : (cum(runs, i) + runs[i].steadyAt!) / 3600; };
export const openedH = (runs: Run[], e: SectorId) => { const i = runs.findIndex((r) => r.opened[e] !== undefined); return i < 0 ? null : (cum(runs, i) + runs[i].opened[e]) / 3600; };
/** Longest stretch without a player decision in [from, to] hours of the campaign's cumulative active play. */
export function decisionGap(runs: Run[], fromH: number, toH: number): number {
  const times: number[] = [];
  runs.forEach((r, i) => { const c = cum(runs, i); for (const t of r.log.decisions) times.push(c + t); });
  const from = fromH * 3600, to = Math.min(toH * 3600, cum(runs, runs.length));
  let g = 0, last = from;
  for (const t of times) { if (t < from) continue; if (t > to) break; g = Math.max(g, t - last); last = t; }
  return Math.max(g, to - last);
}

