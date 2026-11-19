/**
 * Headless balancer: plays whole runs of Rebound with a fixed strategy and prints what happened.
 *
 *   bun run tools/balance.ts [efficiency|levers|idle|budget|forks|peakdraw] [runs] [flags]
 *
 *   efficiency  the backfire player: buy the cheapest affordable upgrade, found every app when affordable, never touch a
 *               lever, play until the run ends on its own; spend Hindsight on Know-how (cheapest first).
 *   levers      the same, plus raise the cheapest lever once revealed whenever Mandate allows and net Mandate stays
 *               positive; Institutions first (seated greedily), then Know-how.
 *   budget      the competent restraint player (M1 balance rewrite):
 *                 - buys The Coal Question as soon as it can, otherwise the cheapest affordable upgrade;
 *                 - before drawing a line, booms like `efficiency` but founds nothing that would push R above the
 *                   pressure-safe level (equilibrium smog under --safe-pressure of collapse, default 0.5);
 *                 - draws the line once revealed and wellbeing is at target + 2, or R is near the safe level, or
 *                   --draw-after minutes (default 4) after the reveal have passed;
 *                 - caps at the line as soon as Mandate allows, Tightens when over it, keeps buying efficiency (under a
 *                   cap, efficiency is wellbeing), founds only what the line holds;
 *                 - Reckons when its average Hindsight per minute has peaked (5 % below its best for 5 minutes,
 *                   at least 15 minutes in), or at the time cap;
 *                 - between runs: Institutions first (standing caps, then wellbeing, reveal, absorption, duty…),
 *                   seated in that order, then Know-how.
 *   forks       plays `efficiency` once per combination of fork arms (upgrades linked by `excludes`), at most 16
 *               combinations (random ones from --seed beyond that), each for [runs] runs from a fresh meta, and prints
 *               Hindsight per minute per combination and the spread (fork audit target ±10%). Forks of
 *               sectorOrder[0] only, unless --fork-sector=<id> or --fork-sector=all.
 *   peakdraw    the exploit check: `efficiency`, plus (once revealed) a budget redrawn at every new peak of R, so that
 *               depletion pulls R under a line drawn at the top.
 *   mixed       the intended learning path: `efficiency` in runs 1–2 (learn by failing), `budget` from run 3; Hindsight
 *               is spent as the budget player spends it throughout.
 *   idle        buy nothing, never click.
 *   market      (M2) run 1 as `efficiency`; from run 2 the Market is on everywhere and the player only founds applications
 *               the Market has left for 25 s, buys the research (reveal) cards the Market never buys, draws a line at
 *               the reveal, chooses dividends and Reckons as `budget` does.
 *   charter     (M2) for each Charter C, from a fresh meta: plays `mixed` for [runs] runs, choosing C whenever offered
 *               (else the first offered). To get C offered in run 2 it tries first-run seeds 1, 2, 3… (at most 200)
 *               until reckon()'s offer contains C. Prints Hindsight per minute over the runs C was in force, per
 *               Charter, and the deviation from the mean (target ±15%). Only ever chooses from what the core offers.
 *
 * M2 flags (restraint strategies budget, mixed, levers, market; peakdraw takes --pace):
 *   --pace=<id>          pace of the lines they draw (default: the sector's first pace)
 *   --dividend=0|1|best  which option of each pending dividend to choose (best: the larger one-offs, else 0; default 0)
 *   --settle             settle each sector as soon as it can
 *   --commons            buy the visible Commons project with the best wellbeing per £ when affordable above 60 s of income
 *   --market=on|off      the Market in runs ≥ 2 (default on for a player who never touches it; `budget` switches it off in
 *                        sectors with a line unless --market=on)
 *   --offline-check      every 10 minutes of play: clone, fastForward 8 h, print heldBy / heldSector / simulated / pending
 *   --decisions          longest stretch without a player decision in hour 1 and hours 1–10, decisions and automated
 *                        actions per model decade (mean); in --json: decisionsByDecade, automatedByDecade and the gaps
 *   --total-hours=N      keep playing consecutive runs until N hours cumulative (overrides [runs])
 *   --payback=S          the Market's paybackMax in seconds (default: the content's, 120 s unless set)
 *
 * Clicking (all strategies but idle): --cps taps per second (default 5) while a tap is worth it, i.e. while
 * cps × clickValue ≥ --click-until × income (default 0.5, the UI's shrink rule). --cps=0 turns it off.
 *
 * Flags: --fixture, --hours=3 (cap per run), --every=120 (series interval, s), --cps=5, --click-until=0.5, --seed=1,
 *        --no-series, --dt=1, --json (one JSON summary per run, no text), --summary (one line per run),
 *        --safe-pressure=0.5, --draw-after=4, --fork-sector=<id>|all.
 * Runs are consecutive (the prestige loop), except in `forks`.
 */
import { model } from '../src/core';
import { content as realContent } from '../src/content';
import { fixture } from '../src/core/fixture';
import { BUDGET_TOLERANCE, YEARS_PER_SECOND } from '../src/types';
import type { Content, EffectDef, GameState, HindsightTerms, InstitutionDef, SectorId, UpgradeView } from '../src/types';

declare const process: { argv: string[]; exit(code?: number): never };

/* ---------------- arguments ---------------- */

type Strategy = 'efficiency' | 'levers' | 'idle' | 'budget' | 'forks' | 'peakdraw' | 'mixed' | 'market' | 'charter';
const STRATEGIES: Strategy[] = ['efficiency', 'levers', 'idle', 'budget', 'forks', 'peakdraw', 'mixed', 'market', 'charter'];
const argv = process.argv.slice(2);
const flag = (name: string, dflt: string): string => {
  const a = argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  return a === undefined ? dflt : a.includes('=') ? a.slice(a.indexOf('=') + 1) : 'true';
};
const positional = argv.filter((a) => !a.startsWith('--'));
const strategy = (positional[0] ?? 'efficiency') as Strategy;
if (!STRATEGIES.includes(strategy)) {
  console.error(`unknown strategy "${strategy}" (${STRATEGIES.join(' | ')})`);
  process.exit(2);
}
const runs = Math.max(1, parseInt(positional[1] ?? '3', 10) || 3);
const realOk = Array.isArray((realContent as Partial<Content> | undefined)?.sectorOrder) && !!realContent?.sectors;
const useFixture = flag('fixture', 'false') === 'true' || !realOk;
const C: Content = useFixture ? fixture : realContent;
const HOURS = parseFloat(flag('hours', '3'));
const EVERY = parseFloat(flag('every', '120'));
const CPS = parseFloat(flag('cps', '5'));
const CLICK_UNTIL = parseFloat(flag('click-until', '0.5'));
const SEED = parseInt(flag('seed', '1'), 10);
const SERIES = flag('no-series', 'false') !== 'true';
const DT = parseFloat(flag('dt', '1'));
const JSON_OUT = flag('json', 'false') === 'true';
const SUMMARY = flag('summary', 'false') === 'true';
const SAFE_P = parseFloat(flag('safe-pressure', '0.5'));
const DRAW_AFTER = parseFloat(flag('draw-after', '4')) * 60;
const MIN_RUN = parseFloat(flag('min-run', '30')) * 60;
const MAX_RUN = parseFloat(flag('max-run', '90')) * 60;
const PROGRESS_AT = parseFloat(flag('progress-at', '40')) * 60;
const MAX_OPEN = parseFloat(flag('max-open', '120')) * 60;
const MIN_DRAW = parseFloat(flag('min-draw', '12')) * 60;
const FORK_SECTOR = flag('fork-sector', '');
const HOLD_FOR = parseFloat(flag('hold-for', '30')) * 60;
const PACE = flag('pace', '') || undefined;
const DIVIDEND = flag('dividend', '0');
const SETTLE = flag('settle', 'false') === 'true';
const COMMONS = flag('commons', 'false') === 'true';
const MARKET = flag('market', '');
const OFFLINE_CHECK = flag('offline-check', 'false') === 'true';
const DECISIONS = flag('decisions', 'false') === 'true';
const TOTAL_HOURS = parseFloat(flag('total-hours', '0'));
const PAYBACK = parseFloat(flag('payback', '0'));
const ORDER = C.sectorOrder;
const forkSector = FORK_SECTOR || ORDER[0];
const quiet = JSON_OUT || SUMMARY;
const log = (...a: unknown[]) => { if (!quiet) console.log(...a); };

/* ---------------- formatting ---------------- */

const SI = ['', 'k', 'M', 'G', 'T', 'P'];
function n(x: number | null | undefined, digits = 3): string {
  if (x === null || x === undefined) return '-';
  if (!Number.isFinite(x)) return Number.isNaN(x) ? 'NaN' : x > 0 ? '∞' : '-∞';
  const a = Math.abs(x);
  if (a < 1e-3 && a > 0) return x.toExponential(1);
  let i = 0, v = x;
  while (Math.abs(v) >= 1000 && i < SI.length - 1) { v /= 1000; i++; }
  const s = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(digits > 2 ? 1 : 0) : v.toFixed(digits > 1 ? 2 : 1);
  return s + SI[i];
}
const pct = (x: number | null | undefined) => (x === null || x === undefined ? '-' : Number.isFinite(x) ? `${(x * 100).toFixed(0)}%` : n(x));
const signedPct = (x: number | null) => (x === null ? '  -  ' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(0)}%`);
const min = (t: number) => (t / 60).toFixed(1).padStart(5);
const pad = (s: string, w: number) => s.padStart(w);
const termsLine = (t: HindsightTerms) =>
  `wellbeing ${n(t.wellbeing)} (${n(t.wellbeingYears)} W·y ÷ intensity ${n(t.intensity)}) · budget ${n(t.budget)} · unburnt ${n(t.unburnt)}` +
  ` · backfire ${n(t.backfire)} · sectors ${n(t.sectorsReached)} · steady ${n(t.steady)} → ${t.total}`;

/* ---------------- sanity ---------------- */

function badNumbers(x: unknown, path = '', out: string[] = []): string[] {
  if (out.length > 5) return out;
  if (typeof x === 'number') {
    if (Number.isNaN(x) || (!Number.isFinite(x) && !/secondsLeft$|visibleBelow$|maxLevel$/.test(path))) out.push(`${path}=${x}`);
  } else if (x && typeof x === 'object') {
    for (const [k, v] of Object.entries(x as object)) if (k !== 'def') badNumbers(v, `${path}.${k}`, out);
  }
  return out;
}
let failures = 0;
function check(s: GameState, where: string): void {
  const bad = badNumbers(s).concat(badNumbers(model.derive(s, C)));
  if (bad.length) {
    failures++;
    console.log(`  !! non-finite numbers at ${where}: ${bad.join(', ')}`);
  }
}

/* ---------------- deterministic PRNG (forks sampling) ---------------- */

function prng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- strategy helpers ---------------- */

/** Upgrade views without the (expensive) projections: cost and visibility do not depend on the reveal. */
const cheapViews = (s: GameState): UpgradeView[] => model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, C);

interface Ev { t: number; text: string }
interface EffBuy {
  sector: SectorId; t: number; id: string; promise: number; decade: number | null; reach: string; reachN: number;
  frontierLeft: boolean; rBefore: number; rAfter60?: number; rAfter120?: number; cumPromise: number; revealed: boolean;
}
interface RunCtx {
  ev: Ev[]; effBuys: EffBuy[]; skip: Set<string>; firsts: Record<string, number>; buyTimes: number[];
}

/** Effects of the seated institutions and owned know-how (for the budget player's pressure arithmetic). */
function absorptionOf(s: GameState, e: SectorId): number {
  let a = C.sectors[e].absorption;
  const add = (effs: EffectDef[], times: number) => { for (const x of effs) if (x.type === 'absorptionAdd' && x.sector === e) a += x.value * times; };
  for (const k of C.knowhow) add(k.effects, s.meta.knowhow[k.id] ?? 0);
  for (const id of s.meta.loadout) {
    const i = C.institutions.find((x) => x.id === id);
    const lvl = s.meta.institutions[id] ?? 0;
    if (!i || lvl < 1) continue;
    add(i.effects, 1);
    for (let l = 2; l <= lvl; l++) add(i.nextLevels?.[l - 2]?.effects ?? [], 1);
  }
  for (const [id, lvl] of Object.entries(s.upgrades)) add(C.upgrades.find((u) => u.id === id)?.effects ?? [], lvl);
  return a;
}
/** R at which the sector's smog would settle at SAFE_P of collapse. */
function safeR(s: GameState, e: SectorId): number {
  const d = C.sectors[e];
  if (d.pressureSource !== 'resource' || d.pressureIntensity <= 0) return Infinity;
  return (SAFE_P * d.collapseAt * absorptionOf(s, e)) / d.pressureIntensity;
}

function noteBuy(s: GameState, ctx: RunCtx, v: UpgradeView, decade: number | null, reach: { appId: string }[], rBefore: number): void {
  ctx.firsts[`buy:${v.def.id}`] ??= s.time;
  ctx.buyTimes.push(s.time);
  const lvl = s.upgrades[v.def.id];
  if (v.def.kind === 'efficiency') {
    const prev = ctx.effBuys.filter((b) => b.sector === v.def.sector);
    const cum = (1 + (prev.length ? prev[prev.length - 1].cumPromise : 0)) * (1 + (v.promisedChange ?? 0)) - 1;
    const es = s.sectors[v.def.sector];
    const frontierLeft = C.sectors[v.def.sector].applications.some((a) => !es.apps[a.id]?.founded);
    const reachS = reach.map((b) => b.appId).join(', ');
    ctx.effBuys.push({
      sector: v.def.sector, t: s.time, id: v.def.id, promise: v.promisedChange ?? 0, decade, reach: reachS, reachN: reach.length,
      frontierLeft, rBefore, cumPromise: cum, revealed: s.flags.revealed,
    });
    ctx.ev.push({ t: s.time, text: `buy  ${v.def.id} £${n(v.cost)}  card ${signedPct(v.promisedChange)}${s.flags.revealed ? `, decade ${signedPct(decade)}${reachS ? `, within reach: ${reachS}` : ''}` : ''}  R× before ${n(rBefore)}` });
  } else {
    ctx.ev.push({ t: s.time, text: `buy  ${v.def.id}${lvl > 1 ? ` (L${lvl})` : ''} £${n(v.cost)} [${v.def.kind}]` });
  }
}

function buyOne(s: GameState, ctx: RunCtx, v: UpgradeView): GameState {
  let decade: number | null = null;
  let reach: { appId: string; projectedChange: number }[] = [];
  let rBefore = 0;
  if (v.def.kind === 'efficiency') {
    if (s.flags.revealed) {
      const full = model.upgradeViews(s, C).find((u) => u.def.id === v.def.id);
      decade = full?.projectedDecade ?? null;
      reach = full?.bringsWithinReach ?? [];
    }
    rBefore = model.derive(s, C).sectors[v.def.sector]?.resourceUse ?? 0;
  }
  const next = model.buyUpgrade(s, C, v.def.id);
  if (next === s) return s;
  noteBuy(next, ctx, v, decade, reach, rBefore);
  return next;
}

function buyUpgrades(s: GameState, ctx: RunCtx, prefer: string[] = []): GameState {
  for (let guard = 0; guard < 60; guard++) {
    const views = cheapViews(s).filter((v) => v.visible && !v.maxed && !v.excludedBy && !ctx.skip.has(v.def.id));
    const pref = prefer.map((id) => views.find((v) => v.def.id === id)).find((v) => v !== undefined);
    if (pref && !pref.affordable) break; // save up for it
    const v = pref ?? views.filter((x) => x.affordable).sort((a, b) => a.cost - b.cost)[0];
    if (!v) break;
    const next = buyOne(s, ctx, v);
    if (next === s) break;
    s = next;
  }
  return s;
}

/** Found applications; `ok(next, sector)` may veto one (the budget player's line). */
function foundApps(s: GameState, ctx: RunCtx, ok?: (next: GameState, e: SectorId, appId: string) => string | null): GameState {
  for (const e of ORDER) {
    if (!s.sectors[e]?.open) continue;
    for (const a of C.sectors[e].applications) {
      const next = model.foundApp(s, C, a.id);
      if (next === s) continue;
      const why = ok ? ok(next, e, a.id) : null;
      if (why) {
        if (!ctx.skip.has(`app:${a.id}`)) { ctx.skip.add(`app:${a.id}`); ctx.ev.push({ t: s.time, text: `skip ${a.id}: ${why}` }); }
        continue;
      }
      ctx.skip.delete(`app:${a.id}`);
      s = next;
      ctx.firsts[`app:${a.id}`] ??= s.time;
      ctx.firsts.firstApp ??= s.time;
      ctx.buyTimes.push(s.time);
      ctx.ev.push({ t: s.time, text: `app  ${a.id} £${n(a.foundCost)}` });
    }
  }
  return s;
}

const upkeepStep = (s: GameState, id: string): number => {
  const v = model.leverViews(s, C).find((l) => l.def.id === id)!;
  return (v.next?.mandateUpkeep ?? 0) - (v.current?.mandateUpkeep ?? 0);
};

function raiseLevers(s: GameState, ctx: RunCtx): GameState {
  if (!s.flags.revealed) return s;
  for (let guard = 0; guard < 10; guard++) {
    const net = model.derive(s, C).mandatePerSec;
    const cands = model.leverViews(s, C)
      .filter((l) => l.canRaise && l.nextCost !== null && l.level < l.def.levels.length)
      .filter((l) => net - upkeepStep(s, l.def.id) > 0)
      .sort((a, b) => (a.nextCost ?? 0) - (b.nextCost ?? 0));
    if (!cands.length) break;
    const l = cands[0];
    const next = model.setLever(s, C, l.def.id, l.level + 1);
    if (next === s) break;
    s = next;
    ctx.firsts.firstLever ??= s.time;
    ctx.ev.push({ t: s.time, text: `lever ${l.def.id} → L${l.level + 1} (${l.next?.label}) mandate ${n(l.nextCost ?? 0)}` });
  }
  return s;
}

/* ---------------- the budget player ---------------- */

interface BudgetMemo { revealAt: number | null }

function budgetFoundOk(prev: GameState): (next: GameState, e: SectorId) => string | null {
  return (next, e) => {
    const d = model.derive(next, C).sectors[e]!;
    const es = next.sectors[e];
    if (d.budgetR !== null) {
      return d.resourceUse > d.budgetR * (1 + BUDGET_TOLERANCE) ? `R would be ${n(d.resourceUse)} over the line ${n(d.budgetR)}` : null;
    }
    const safe = safeR(prev, e);
    void es;
    return d.resourceUse > safe ? `R would be ${n(d.resourceUse)} above the smog-safe ${n(safe)}` : null;
  };
}

function holdTheLine(s: GameState, ctx: RunCtx, memo: BudgetMemo): GameState {
  if (!s.flags.revealed) return s;
  memo.revealAt ??= s.time;
  const g = C.global;
  const d0 = model.derive(s, C);
  for (const e of ORDER) {
    const es = s.sectors[e];
    const x = d0.sectors[e];
    if (!es?.open || es.budget || !x) continue;
    const since = s.time - Math.max(memo.revealAt, s.time - es.openFor);
    const ready = d0.wellbeing >= g.wellbeingTarget + 2 || x.resourceUse >= 0.9 * safeR(s, e)
      || (since >= DRAW_AFTER && es.openFor >= MIN_DRAW);
    if (!ready) continue;
    const next = model.drawBudget(s, C, e, PACE);
    if (next !== s) {
      s = next; ctx.firsts[`budget:${e}`] ??= s.time; ctx.ev.push({ t: s.time, text: `BUDGET ${e} drawn at R ${n(s.sectors[e].budget!.r0)} (W ${n(d0.wellbeing)}, ${s.sectors[e].budget!.pace})` });
      if (strategy !== 'market' && MARKET !== 'on') s = model.setOrders(s, C, { market: { sectors: { [e]: false } } });
    }
  }
  for (let guard = 0; guard < 6; guard++) {
    const d = model.derive(s, C);
    const views = model.leverViews(s, C);
    let acted = false;
    for (const e of ORDER) {
      const x = d.sectors[e];
      if (!x || x.budgetR === null) continue;
      // Tighten too when the held line would empty the reserve within 20 minutes (a finite stock)
      const over = x.resourceUse > x.budgetR * (1 + BUDGET_TOLERANCE * 0.5) || x.secondsLeft < 1200;
      const capViews = views.filter((l) => l.def.sector === e && l.def.kind === 'cap' && l.visible);
      const sufViews = views.filter((l) => l.def.sector === e && l.def.kind === 'sufficiency' && l.visible);
      const capOn = capViews.find((l) => l.level > 0);
      const suf = sufViews.find((l) => l.canRaise) ?? null;
      // over the line with a cap in force: Tighten to 90 % first, then lower appetite (a cap cannot squeeze out more
      // than 95 % of free demand, so past that point only sufficiency brings R_free down)
      let want = capOn ? (over ? (capOn.level >= 3 && suf ? suf : capOn) : null)
        : capViews.sort((a, b) => (a.nextCost ?? Infinity) - (b.nextCost ?? Infinity))[0] ?? null;
      if (!want && over) want = suf;
      if (!want || !want.canRaise || want.nextCost === null) continue;
      if (d.mandatePerSec - upkeepStep(s, want.def.id) <= 0 && want.level > 0) continue;
      const next = model.setLever(s, C, want.def.id, want.level + 1);
      if (next === s) continue;
      s = next;
      acted = true;
      ctx.firsts.firstLever ??= s.time;
      ctx.ev.push({ t: s.time, text: `lever ${want.def.id} → L${want.level + 1} (${want.next?.label}) mandate ${n(want.nextCost)}${over ? ' [over the line]' : ''}` });
    }
    if (!acted) break;
  }
  // keep Mandate positive: drop the costliest non-cap lever while net Mandate is negative and the reserve is thin
  const d = model.derive(s, C);
  if (d.mandatePerSec < 0 && s.mandate < -60 * d.mandatePerSec) {
    const worst = model.leverViews(s, C).filter((l) => l.level > 0 && l.def.kind !== 'cap').sort((a, b) => b.upkeep - a.upkeep)[0];
    if (worst) {
      s = model.setLever(s, C, worst.def.id, worst.level - 1);
      ctx.ev.push({ t: s.time, text: `lever ${worst.def.id} ↓ L${worst.level - 1} (Mandate)` });
    }
  }
  return s;
}

/* ---------------- M2: dividends, settlement, the Commons ---------------- */

/** One-offs of a dividend as a single number (mandateAdd + capitalAdd seconds), for --dividend=best. */
function oneOffSize(id: string): number {
  const d = (C.dividends ?? []).find((x) => x.id === id);
  let v = 0;
  for (const ef of d?.effects ?? []) if (ef.type === 'mandateAdd' || ef.type === 'capitalAdd') v += ef.value;
  return v;
}
function chooseDividends(s: GameState, ctx: RunCtx): GameState {
  for (let guard = 0; guard < 20 && s.pendingDividends.length; guard++) {
    const p = s.pendingDividends[0];
    const opt = DIVIDEND === '1' ? 1 : DIVIDEND === 'best' ? (oneOffSize(p.options[1]) > oneOffSize(p.options[0]) ? 1 : 0) : 0;
    const next = model.chooseDecadeDividend(s, C, p.sector, opt);
    if (next === s) break;
    s = next;
    ctx.ev.push({ t: s.time, text: `dividend ${p.sector} #${p.decade}: ${p.options[opt]} (×${p.mul})` });
  }
  return s;
}
function settleAll(s: GameState, ctx: RunCtx): GameState {
  const d = model.derive(s, C);
  for (const e of ORDER) {
    if (!d.sectors[e]?.canSettle) continue;
    const next = model.settle(s, C, e);
    if (next !== s) { s = next; ctx.firsts[`settle:${e}`] ??= s.time; ctx.ev.push({ t: s.time, text: `SETTLED ${e}` }); }
  }
  return s;
}
function buyCommonsBest(s: GameState, ctx: RunCtx): GameState {
  for (let guard = 0; guard < 5; guard++) {
    const d = model.derive(s, C);
    if (!d.commons.available) return s;
    const keep = 60 * d.incomePerSec;
    const v = model.commonsViews(s, C).filter((x) => x.canBuy && x.cost !== null && s.commons.fund + s.capital - keep >= x.cost)
      .sort((a, b) => b.nextWellbeing / Math.max(1e-9, b.cost!) - a.nextWellbeing / Math.max(1e-9, a.cost!))[0];
    if (!v) return s;
    const next = model.buyCommons(s, C, v.def.id);
    if (next === s) return s;
    s = next;
    ctx.ev.push({ t: s.time, text: `commons ${v.def.id} → L${v.level + 1} (+${n(v.nextWellbeing)} W, £${n(v.cost)})` });
  }
  return s;
}
/** The `market` player: found what the Market has left for 25 s; buy research cards (the Market never does). */
function marketPlayer(s: GameState, ctx: RunCtx, seen: Map<string, number>, ok?: (next: GameState, e: SectorId) => string | null): GameState {
  for (const e of ORDER) {
    if (!s.sectors[e]?.open) continue;
    for (const a of C.sectors[e].applications) {
      const st = s.sectors[e].apps[a.id];
      if (!st?.available || st.founded || s.capital < a.foundCost) { seen.delete(a.id); continue; }
      const since = seen.get(a.id) ?? s.time;
      seen.set(a.id, since);
      if (s.time - since < 25) continue;
      const next = model.foundApp(s, C, a.id);
      if (next !== s && (!ok || ok(next, e) === null)) { s = next; ctx.firsts[`app:${a.id}`] ??= s.time; ctx.buyTimes.push(s.time); ctx.ev.push({ t: s.time, text: `app  ${a.id} (player)` }); }
    }
  }
  // the cards the Market never buys: research (the reveal first), prospects and fork arms (cheapest first)
  for (let guard = 0; guard < 10; guard++) {
    const v = cheapViews(s).filter((x) => x.visible && x.affordable && !x.maxed && !x.excludedBy && !ctx.skip.has(x.def.id)
      && (x.def.kind === 'research' || x.def.kind === 'prospect' || (x.def.excludes?.length ?? 0) > 0))
      .sort((a, b) => (a.def.kind === 'research' ? -1 : 0) - (b.def.kind === 'research' ? -1 : 0) || a.cost - b.cost)[0];
    if (!v) break;
    const next = buyOne(s, ctx, v);
    if (next === s) break;
    s = next;
  }
  return s;
}

/* ---------------- between runs ---------------- */

function instRank(d: InstitutionDef): number {
  const effs = [d.effects, ...(d.nextLevels ?? []).map((l) => l.effects)].flat();
  const lever = (k: string) => effs.some((e) => e.type === 'startLever' && C.levers.find((l) => l.id === e.lever)?.kind === k);
  if (lever('cap')) return 0;
  if (effs.some((e) => e.type === 'wellbeingAdd')) return 1;
  if (effs.some((e) => e.type === 'reveal')) return 2;
  if (effs.some((e) => e.type === 'absorptionAdd')) return 3;
  if (lever('duty')) return 9; // a standing duty holds the price up and strangles the growth a capped economy needs
  return 5;
}

/** Seat the best loadout: by rank, greedily by seats. */
function seatLoadout(s: GameState): GameState {
  const owned = C.institutions.filter((i) => (s.meta.institutions[i.id] ?? 0) >= 1).sort((a, b) => instRank(a) - instRank(b));
  const ids: string[] = [];
  let used = 0;
  for (const i of owned) {
    if (used + (i.slots ?? 1) > s.meta.slots) continue;
    if ((strategy === 'budget' || strategy === 'mixed') && instRank(i) >= 9) continue;
    ids.push(i.id);
    used += i.slots ?? 1;
  }
  return model.setLoadout(s, C, ids);
}

function spendHindsight(s: GameState, mode: Strategy): { s: GameState; bought: string[] } {
  const bought: string[] = [];
  const instFirst = mode === 'levers' || mode === 'budget';
  for (let guard = 0; guard < 400; guard++) {
    const inst = model.institutionViews(s, C).filter((v) => v.canBuy)
      .sort((a, b) => (mode === 'budget' ? instRank(a.def) - instRank(b.def) : 0) || (a.nextCost ?? 0) - (b.nextCost ?? 0));
    // the budget player saves for its best-ranked unowned institution rather than spending on Know-how meanwhile
    const kh = model.knowhowViews(s, C).filter((v) => v.canBuy).sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
    let next = s;
    let what = '';
    if (instFirst && inst.length) { next = model.buyInstitution(s, C, inst[0].def.id); what = `${inst[0].def.id} L${inst[0].level + 1}`; }
    else if (kh.length) { next = model.buyKnowhow(s, C, kh[0].def.id); what = `${kh[0].def.id} L${kh[0].level + 1}`; }
    if (next === s) break;
    bought.push(what);
    s = next;
  }
  if (instFirst) s = seatLoadout(s);
  return { s, bought };
}

/* ---------------- one run ---------------- */

interface RunReport {
  strategy: string; run: number; arms?: string[]; seconds: number; cause: string; causeSector?: SectorId;
  revealMin: number | null; firstCrisisMin: number | null; hindsight: number; hindsightPerMin: number; terms: HindsightTerms;
  firsts: Record<string, number>;
  cadence: { purchases10: number; longestGap15: number; longestGapRun: number };
  felt: { boilersR60: number | null; condenserR120: number | null };
  click: { at30s: number | null; atCondenser: number | null; atReveal: number | null };
  crisisPopLoss: number | null;
  exitCards: { checked: number; failing: string[] };
  sectors: Record<SectorId, {
    etaFold: number; rFold: number; peakRFold: number; peakRebound: number | null; reboundAtReveal: number | null;
    frontierFold: number; budgetRatio: number | null; steadyYears: number; decades: number; steady: boolean;
    reserveFraction: number; pressureFraction: number; openedMin: number | null;
  }>;
  steadyYearsAll: number; won: boolean; slots: number; loadout: string[]; peakWellbeing: number; yearsAtTarget: number;
  sectorsOpen: SectorId[];
  /** player purchases and foundings in the run */
  purchases: number;
  /** M2 */
  m2: {
    firstDecadeMin: number | null; firstDecadeLean: boolean | null; firstClearMin: number | null; steadyMin: number | null;
    settlements: number; settledAtEnd: number; commonsLevels: number; marketBuys: number; charter: string | null;
    leanDecades: number; fullDecades: number; decisions: number; automated: number;
    decisionsByDecade: number[]; automatedByDecade: number[]; decisionTimes: number[];
    gaps: { hour1: number; run: number };
    offline: { at: number; heldBy: string | null; heldSector?: string; simulated: number; pending: boolean }[];
  };
}

function sampleRow(s: GameState, open: SectorId[], extra: boolean): string {
  const d = model.derive(s, C);
  let row = `${min(s.time)} ${pad(String(Math.floor(d.year)), 5)} ${pad(n(s.capital), 7)} ${pad(n(d.incomePerSec), 6)} ${pad(n(d.wellbeing), 5)} ${pad(n(s.mandate), 6)} ${pad(n(s.population), 5)}`;
  for (const e of open) {
    const x = d.sectors[e];
    if (!x) { row += ` │ ${'·'.padStart(extra ? 52 : 22)}`; continue; }
    row += ` │ ${pad(n(x.etaFold), 5)} ${pad(n(x.rFold), 5)} ${pad(pct(x.reserveFraction), 4)} ${pad(pct(x.pressureFraction), 4)}`;
    if (extra) {
      row += ` ${pad(pct(x.rebound), 5)} ${pad(n(x.frontierFold), 5)} ${pad(x.budgetR !== null && x.resourceUse > 0 ? n(x.budgetR / x.resourceUse) : '-', 5)}` +
        ` ${pad(n(x.steadyYears), 5)} ${pad(String(x.budgetDecades), 3)}`;
    }
  }
  return row;
}

/** Longest stretch in [from, to] with no time in `times`. */
function gapIn(times: number[], from: number, to: number): number {
  let g = 0, last = from;
  for (const t of times) { if (t < from) continue; if (t > to) break; g = Math.max(g, t - last); last = t; }
  return Math.max(g, to - last);
}
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const clickRatio = (s: GameState): number | null => {
  const d = model.derive(s, C);
  return d.incomePerSec > 0 ? (5 * d.clickValue) / d.incomePerSec : null;
};

function playRun(start: GameState, idx: number, mode: Strategy, skip: Set<string> = new Set(), arms?: string[]): { s: GameState; report: RunReport } {
  let s = start;
  const ctx: RunCtx = { ev: [], effBuys: [], skip: new Set(skip), firsts: {}, buyTimes: [] };
  const ev = ctx.ev;
  const memo: BudgetMemo = { revealAt: null };
  const series: string[] = [];
  const peakRebound: Record<SectorId, number> = {};
  const reboundAtReveal: Record<SectorId, number | null> = {};
  const openedAt: Record<SectorId, number> = {};
  const capT = HOURS * 3600;
  const extra = mode === 'budget' || mode === 'levers' || mode === 'forks' || mode === 'peakdraw';
  const coalQ = C.upgrades.filter((u) => u.effects.some((e) => e.type === 'reveal')).map((u) => u.id);
  let clickAcc = 0;
  let revealT: number | null = s.flags.revealed ? 0 : null;
  let crisisT: number | null = null;
  let crisisPopLoss: number | null = null;
  const click: RunReport['click'] = { at30s: null, atCondenser: null, atReveal: null };
  const hist: [number, number][] = [];
  const pHist: [number, Record<SectorId, number>][] = [];
  const kh = Object.entries(s.meta.knowhow).filter(([, v]) => v).map(([k, v]) => `${k}×${v}`).join(' ');
  const inst = Object.entries(s.meta.institutions).map(([k, v]) => `${k}${v > 1 ? ` L${v}` : ''}${s.meta.loadout.includes(k) ? '*' : ''}`).join(' ');
  log(`\n=== Run ${idx} · ${mode}${arms ? ` [${arms.join(', ')}]` : ''} · ${useFixture ? 'FIXTURE' : 'content'} · reckonings ${s.meta.reckonings} · hindsight left ${n(s.meta.hindsight)} · seats ${s.meta.slots}`);
  if (kh || inst) log(`    know-how: ${kh || '—'}   institutions (* seated): ${inst || '—'}`);
  if (s.meta.reckonings >= 1) {
    if (MARKET === 'off') s = model.setOrders(s, C, { market: { on: false } });
    else if (mode === 'market' || MARKET === 'on') s = model.setOrders(s, C, { market: { on: true, sectors: Object.fromEntries(ORDER.map((e) => [e, true])) } });
    if (PAYBACK > 0) s = model.setOrders(s, C, { market: { paybackMax: PAYBACK } });
  }
  const seenApps = new Map<string, number>();
  const restraint = mode === 'budget' || mode === 'levers' || mode === 'market';
  let firstDecadeLean: boolean | null = null;
  let settlements = 0;
  let marketBuys = 0;
  const decisionTimes: number[] = [];
  let lastDecisions = s.run.decisions;
  const offline: RunReport['m2']['offline'] = [];
  let prev = s;
  const open = (): SectorId[] => ORDER.filter((e) => s.sectors[e]?.open);
  let header = '';
  const pushSample = () => {
    const eras = open();
    const h = `  min  year  capital  inc/s     W  mandt   pop` + eras.map((e) => ` │ ${pad(e.slice(0, 5) + ' η×', 5)}    R×  res    P${extra ? '   reb  front  bud/R streak dec' : ''}`).join('');
    if (h !== header) { series.push(h); header = h; }
    series.push(sampleRow(s, eras, extra));
  };
  pushSample();
  let stopReason = '';
  while (true) {
    const pend = model.derive(s, C).pendingReckoning;
    if (pend) break;
    if (s.time >= capT) { stopReason = `time cap ${HOURS} h`; break; }
    if (mode !== 'idle') {
      const tick5 = Math.floor(s.time) % 5 === 0;
      if (mode === 'budget') {
        s = buyUpgrades(s, ctx, s.flags.revealed ? [] : coalQ);
        s = foundApps(s, ctx, budgetFoundOk(s));
        if (tick5) s = holdTheLine(s, ctx, memo);
      } else if (mode === 'market') {
        // the budget player with the Market on everywhere: it leaves routine efficiency and capital cards to the
        // Market and does what the Market never does (forks, research, prospects, foundings the Market passed over,
        // lines, levers, dividends)
        s = marketPlayer(s, ctx, seenApps, budgetFoundOk(s));
        if (tick5) s = holdTheLine(s, ctx, memo);
      } else {
        s = buyUpgrades(s, ctx);
        s = foundApps(s, ctx);
        if (mode === 'levers' && tick5) s = raiseLevers(s, ctx);
        if (mode === 'peakdraw' && tick5 && s.flags.revealed) {
          for (const e of ORDER) {
            const x = model.derive(s, C).sectors[e];
            if (!x) continue;
            const b = s.sectors[e].budget;
            if (!b || x.resourceUse > b.r0 * 1.02) s = model.drawBudget(s, C, e);
          }
        }
      }
      if (restraint && tick5) {
        s = chooseDividends(s, ctx);
        if (SETTLE) { const b = s; s = settleAll(s, ctx); if (s !== b) settlements++; }
        if (COMMONS) s = buyCommonsBest(s, ctx);
      }
      if (s.run.decisions > lastDecisions) { decisionTimes.push(s.time); lastDecisions = s.run.decisions; }
      if (CPS > 0) {
        const d = model.derive(s, C);
        if (CPS * d.clickValue >= CLICK_UNTIL * d.incomePerSec) {
          clickAcc += CPS * DT;
          while (clickAcc >= 1) { s = model.click(s, C); clickAcc--; }
        }
      }
    }
    prev = s;
    s = model.tick(s, C, DT);
    lastDecisions = s.run.decisions; // standing orders never count as decisions; nothing else moves it inside tick
    for (const e of s.events) if (e.seq > prev.meta.eventSeq && e.by === 'market' && (e.kind === 'upgradeBought' || e.kind === 'appFounded')) { marketBuys++; ctx.firsts.firstMarket ??= s.time; }
    if (prev.time < 30 && s.time >= 30) click.at30s = clickRatio(s);
    for (const e of ORDER) {
      const a = prev.sectors[e], b = s.sectors[e];
      if (!b) continue;
      if (!a?.open && b.open) { openedAt[e] = s.time; ev.push({ t: s.time, text: `SECTOR ${e} opens (year ${Math.floor(model.derive(s, C).year)})` }); }
      if (b.open && b.crisesFired > (a?.crisesFired ?? 0)) {
        if (crisisT === null) { crisisT = s.time; crisisPopLoss = 1 - s.population / prev.population; }
        ev.push({ t: s.time, text: `CRISIS ${e} #${b.crisesFired} (P ${pct(b.pressure / C.sectors[e].collapseAt)}, +${C.global.crisisMandate} mandate, pop ${n(prev.population)} → ${n(s.population)})` });
      }
      if (b.open && a?.open) {
        for (const ap of C.sectors[e].applications) {
          if (!a.apps[ap.id]?.available && b.apps[ap.id]?.available) ev.push({ t: s.time, text: `     ${ap.id} available (p_s ≤ ${ap.visibleBelow})` });
        }
        if (b.decadesWithin.length > a.decadesWithin.length) {
          const lean = b.decadesLean[b.decadesLean.length - 1] === true;
          if (ctx.firsts.firstDecade === undefined) firstDecadeLean = lean;
          ctx.firsts.firstDecade ??= s.time;
          ev.push({ t: s.time, text: `DECADE ${e} #${b.decadesWithin.length} within budget (${lean ? 'lean' : 'full'})` });
        }
        if (b.budget?.clearAt !== undefined && a.budget?.clearAt === undefined) { ctx.firsts.firstClear ??= s.time; ev.push({ t: s.time, text: `CLEAR SKIES ${e}` }); }
        if (s.run.steadySectors[e] && !prev.run.steadySectors[e]) { ctx.firsts.firstSteady ??= s.time; ev.push({ t: s.time, text: `STEADY STATE ${e}` }); }
        if (b.settled && !a.settled) ctx.firsts.firstSettle ??= s.time;
        if (!b.settled && a.settled) ev.push({ t: s.time, text: `     ${e} unsettled (defence lapsed)` });
        if (a.steadyYears >= 10 && b.steadyYears === 0) ev.push({ t: s.time, text: `     ${e} breaks its budget after ${n(a.steadyYears)} years` });
      }
      if (b.backfired && !a?.backfired) ev.push({ t: s.time, text: `     ${e} backfires (direct rebound > 100%)` });
    }
    if (revealT === null && s.flags.revealed) {
      revealT = prev.flags.revealed ? prev.time : s.time;
      click.atReveal = clickRatio(s);
      ev.push({ t: s.time, text: 'REVEAL' });
      const d = model.derive(s, C);
      for (const e of ORDER) if (d.sectors[e]) reboundAtReveal[e] = d.sectors[e]!.rebound;
    }
    if (click.atCondenser === null && (s.upgrades['steam.condenser'] ?? 0) > 0) click.atCondenser = clickRatio(s);
    if (!prev.flags.won && s.flags.won) ev.push({ t: s.time, text: 'WON: Steady State across every sector' });
    for (const l of C.levers) {
      const la = prev.levers[l.id]?.level ?? 0, lb = s.levers[l.id]?.level ?? 0;
      if (lb < la) ev.push({ t: s.time, text: `     lever ${l.id} lapses to L${lb}` });
    }
    const d = model.derive(s, C);
    for (const b of ctx.effBuys) {
      if (b.rAfter60 === undefined && s.time >= b.t + 60) b.rAfter60 = d.sectors[b.sector]?.resourceUse ?? 0;
      if (b.rAfter120 === undefined && s.time >= b.t + 120) b.rAfter120 = d.sectors[b.sector]?.resourceUse ?? 0;
    }
    for (const e of ORDER) {
      const x = d.sectors[e];
      if (x?.rebound !== null && x?.rebound !== undefined) peakRebound[e] = Math.max(peakRebound[e] ?? -Infinity, x.rebound);
    }
    if (Math.floor(s.time / EVERY) > Math.floor(prev.time / EVERY)) {
      pushSample();
      check(s, `run ${idx} t=${s.time}`);
    }
    if (OFFLINE_CHECK && Math.floor(s.time / 600) > Math.floor(prev.time / 600)) {
      const f = model.fastForward(s, C, 8 * 3600);
      const r = f.lastOffline!;
      const pending = !!model.derive(f, C).pendingReckoning;
      offline.push({ at: s.time, heldBy: r.heldBy, ...(r.heldSector ? { heldSector: r.heldSector } : {}), simulated: r.simulated, pending });
      if (pending) { failures++; console.log(`  !! offline check at ${min(s.time)} min returned a pending Reckoning`); }
      check(f, `offline check run ${idx} t=${s.time}`);
    }
    // the budget player Reckons once the last ten minutes earned less than its average rate (and no streak is
    // about to pay a decade or a Steady State)
    if ((mode === 'budget' || mode === 'market') && Math.floor(s.time) % 10 === 0) {
      hist.push([s.time, d.hindsightIfReckonNow]);
      const old = hist.find(([t]) => t >= s.time - 600);
      const T = d.hindsightTerms;
      const steady = T.wellbeing + T.budget + T.unburnt; // the earned-by-time part (one-off awards left out)
      hist[hist.length - 1][1] = steady;
      const avg = steady / (s.time / 60);
      const marginal = old && s.time - old[0] >= 590 ? (steady - old[1]) / ((s.time - old[0]) / 60) : Infinity;
      // a streak holds a competent player only while a Steady State is on its way (the clear streak running: a lump
      // of Hindsight within 50 model years). Decades are not worth waiting for: a full one pays a little Hindsight
      // (already in the marginal rate), a lean one only in-run dividends (M2).
      // It also waits for clear skies it can see coming: wellbeing at the target and pressure falling towards the clear
      // level fast enough to reach it within --hold-for minutes (default 30).
      pHist.push([s.time, Object.fromEntries(ORDER.map((e) => [e, s.sectors[e]?.pressure ?? 0]))]);
      while (pHist.length && pHist[0][0] < s.time - 120) pHist.shift();
      const streaking = ORDER.some((e) => {
        const es = s.sectors[e], x = d.sectors[e];
        if (!es?.open || !x || s.run.steadySectors[e] || es.settled || x.clearP === null) return false;
        if (es.clearYears > 0) return true;
        if (d.wellbeing < C.global.wellbeingTarget) return false;
        const old = pHist[0];
        const rate = old && s.time - old[0] >= 60 ? (old[1][e] - es.pressure) / (s.time - old[0]) : 0;
        return es.pressure <= x.clearP || (rate > 0 && (es.pressure - x.clearP) / rate <= HOLD_FOR);
      });
      // a competent player does not Reckon while an industry it is entitled to is still opening this run
      const opening = s.time < MAX_OPEN && d.nextSectors.some((x) => x.reckoningsHave >= x.reckoningsNeeded);
      if (s.time >= MIN_RUN && marginal < 0.9 * avg && !streaking && !opening) { stopReason = `marginal rate ${n(marginal)} below average ${n(avg)}`; break; }
      // progression: the next industry waits only on another Reckoning, so bank the run (once no streak is running)
      const gated = d.nextSectors.some((x) => x.reckoningsHave < x.reckoningsNeeded && x.checklist.every((c) => c.met));
      if (s.time >= PROGRESS_AT && gated && !streaking && !opening) { stopReason = 'the next industry waits on a Reckoning'; break; }
      const budgeted = ORDER.filter((e) => s.sectors[e]?.budget);
      if (s.time >= MAX_RUN && !opening && budgeted.length && budgeted.every((e) => s.run.steadySectors[e])) { stopReason = `every line steady after ${min(MAX_RUN).trim()} min`; break; }
    }
  }
  if (series[series.length - 1] !== sampleRow(s, open(), extra)) pushSample();
  check(s, `run ${idx} end`);

  // ----- report -----
  const d = model.derive(s, C);
  const pend = d.pendingReckoning;
  log('  events:');
  for (const e of ev) log(`  ${min(e.t)}  ${e.text}`);
  const cause = pend ? `${pend.cause}${pend.sector ? ` (${pend.sector})` : ''}` : `${stopReason} (chosen)`;
  log(`  ${min(s.time)}  RECKONING: ${cause}   reveal at ${revealT !== null ? `${min(revealT).trim()} min` : '-'}, first crisis at ${crisisT !== null ? `${min(crisisT).trim()} min` : '-'}`);
  log('  sectors at the end:');
  const sectors: RunReport['sectors'] = {};
  for (const e of ORDER) {
    const es = s.sectors[e], x = d.sectors[e];
    if (!es?.open || !x) continue;
    sectors[e] = {
      etaFold: x.etaFold, rFold: x.rFold, peakRFold: es.baseR > 0 ? es.peakR / es.baseR : 0, peakRebound: peakRebound[e] ?? null,
      reboundAtReveal: reboundAtReveal[e] ?? null, frontierFold: x.frontierFold,
      budgetRatio: x.budgetR !== null && x.resourceUse > 0 ? x.budgetR / x.resourceUse : null, steadyYears: x.steadyYears,
      decades: x.budgetDecades, steady: !!s.run.steadySectors[e], reserveFraction: x.reserveFraction, pressureFraction: x.pressureFraction,
      openedMin: openedAt[e] !== undefined ? openedAt[e] / 60 : e === ORDER[0] ? 0 : null,
    };
    log(`    ${e.padEnd(8)} η× ${pad(n(x.etaFold), 5)}  R× now ${pad(n(x.rFold), 5)}  peak R× ${pad(n(sectors[e].peakRFold), 5)}` +
      `  rebound peak ${pct(peakRebound[e])} at reveal ${pct(reboundAtReveal[e])} now ${pct(x.rebound)}  frontier× ${n(x.frontierFold)}` +
      `  budget/R ${sectors[e].budgetRatio !== null ? n(sectors[e].budgetRatio) : '-'}  streak ${n(x.steadyYears)} y  decades ${x.budgetDecades}${s.run.steadySectors[e] ? '  STEADY' : ''}` +
      `  reserve ${pct(x.reserveFraction)}  P ${pct(x.pressureFraction)}  p_s ${n(x.servicePrice)}  D ${n(x.demand)}  R ${n(x.resourceUse)}`);
  }
  const failing: string[] = [];
  let checked = 0;
  for (const e of ORDER) {
    const bs = ctx.effBuys.filter((b) => b.sector === e);
    if (!bs.length) continue;
    log(`  ${e} efficiency buys (R before → 60 s → 120 s after):`);
    for (const [i, b] of bs.entries()) {
      const r60 = b.rAfter60 !== undefined && b.rBefore > 0 ? b.rAfter60 / b.rBefore - 1 : null;
      const r120 = b.rAfter120 !== undefined && b.rBefore > 0 ? b.rAfter120 / b.rBefore - 1 : null;
      log(`    #${i + 1} m${(b.t / 60).toFixed(1)} ${b.id} card ${signedPct(b.promise)} (cum ${signedPct(b.cumPromise)}) decade ${signedPct(b.decade)}${b.reach ? ` reach ${b.reach}` : ''} R ${signedPct(r60)} in 60 s, ${signedPct(r120)} in 120 s`);
      if (b.revealed && b.frontierLeft) {
        checked++;
        if (!((b.decade ?? -1) > 0 || b.reachN > 0)) failing.push(`${b.id} ${signedPct(b.decade)}`);
      }
    }
  }
  const terms = d.hindsightTerms;
  const hpm = s.time > 0 ? terms.total / (s.time / 60) : 0;
  const bt = ctx.buyTimes;
  const gaps = (until: number) => { let g = 0, last = 0; for (const t of bt) { if (t > until) break; g = Math.max(g, t - last); last = t; } return Math.max(g, Math.min(until, s.time) - last); };
  const effAt = (id: string, w: 'rAfter60' | 'rAfter120') => {
    const b = ctx.effBuys.find((x) => x.id === id);
    return b && b[w] !== undefined && b.rBefore > 0 ? b[w]! / b.rBefore - 1 : null;
  };
  log(`  cadence: ${bt.filter((t) => t <= 600).length} purchases in the first 10 min; longest gap ${gaps(900).toFixed(0)} s in the first 15 min, ${gaps(Infinity).toFixed(0)} s in the run`);
  log(`  felt: Better boilers ${signedPct(effAt('steam.boilers', 'rAfter60'))} R in 60 s; condenser ×${n(1 + (effAt('steam.condenser', 'rAfter120') ?? NaN))} R in 120 s; tap (5/s) ÷ income: 0:30 ${n(click.at30s)}, condenser ${n(click.atCondenser)}, reveal ${n(click.atReveal)}`);
  log(`  exit check: ${checked} efficiency cards after the reveal with frontier left; failing (no positive decade, nothing within reach): ${failing.join(', ') || 'none'}`);
  for (const nx of d.nextSectors) log(`  next: ${nx.id} reckonings ${nx.reckoningsHave}/${nx.reckoningsNeeded} · ${nx.checklist.map((c) => `${c.label} ${c.met ? '✓' : pct(c.progress)}`).join(' · ')}`);
  log(`  peak wellbeing ${n(s.run.peakWellbeing)}  decoupled years ${n(s.run.decoupledYears)}  years at target ${n(s.run.yearsAtTarget)}  peak population ${n(s.peakPopulation)}  clicks ${s.run.clicks}`);
  log(`  Hindsight ${terms.total} (${n(hpm)} per minute): ${termsLine(terms)}`);
  if (SERIES) {
    log(`  series (every ${EVERY} s; per sector: η fold, R fold, reserve, pressure${extra ? ', direct rebound, frontier fold, budgetR/R, streak years, decades' : ''}):`);
    for (const r of series) log('  ' + r);
  }
  const report: RunReport = {
    strategy: mode, run: idx, ...(arms ? { arms } : {}), seconds: s.time, cause: pend?.cause ?? 'chosen',
    ...(pend?.sector ? { causeSector: pend.sector } : {}), revealMin: revealT !== null ? revealT / 60 : null,
    firstCrisisMin: crisisT !== null ? crisisT / 60 : null, hindsight: terms.total, hindsightPerMin: hpm, terms,
    firsts: Object.fromEntries(Object.entries(ctx.firsts).map(([k, v]) => [k, v / 60])),
    cadence: { purchases10: bt.filter((t) => t <= 600).length, longestGap15: gaps(900), longestGapRun: gaps(Infinity) },
    felt: { boilersR60: effAt('steam.boilers', 'rAfter60'), condenserR120: effAt('steam.condenser', 'rAfter120') },
    click, crisisPopLoss, exitCards: { checked, failing },
    sectors, steadyYearsAll: s.steadyYearsAll, won: s.flags.won, slots: s.meta.slots, loadout: s.meta.loadout,
    peakWellbeing: s.run.peakWellbeing, yearsAtTarget: s.run.yearsAtTarget, sectorsOpen: open(), purchases: bt.length,
    m2: {
      firstDecadeMin: ctx.firsts.firstDecade !== undefined ? ctx.firsts.firstDecade / 60 : null, firstDecadeLean,
      firstClearMin: ctx.firsts.firstClear !== undefined ? ctx.firsts.firstClear / 60 : null,
      steadyMin: ctx.firsts.firstSteady !== undefined ? ctx.firsts.firstSteady / 60 : null,
      settlements, settledAtEnd: ORDER.filter((e) => s.sectors[e]?.settled).length,
      commonsLevels: Object.values(s.commons.levels).reduce((a, b) => a + b, 0),
      marketBuys,
      charter: s.meta.charter, leanDecades: s.run.leanDecades, fullDecades: s.run.budgetDecades - s.run.leanDecades,
      decisions: s.run.decisions, automated: s.run.automated,
      decisionsByDecade: s.run.decisionsByDecade, automatedByDecade: s.run.automatedByDecade, decisionTimes,
      gaps: { hour1: gapIn(decisionTimes, 0, Math.min(3600, s.time)), run: gapIn(decisionTimes, 0, s.time) },
      offline,
    },
  };
  if (OFFLINE_CHECK && SUMMARY) console.log(`${mode} #${idx} offline checks (8 h): ${offline.map((o) => `${min(o.at).trim()}m ${o.heldBy ?? 'none'}${o.heldSector ? `(${o.heldSector})` : ''} ${(o.simulated / 3600).toFixed(2)} h${o.pending ? ' PENDING!' : ''}`).join(' · ') || '-'}`);
  if (OFFLINE_CHECK) log(`  offline checks (8 h): ${offline.map((o) => `${min(o.at).trim()}m ${o.heldBy ?? 'none'}${o.heldSector ? `(${o.heldSector})` : ''} ${n(o.simulated / 3600)} h${o.pending ? ' PENDING!' : ''}`).join(' · ') || '-'}`);
  if (DECISIONS) log(`  decisions: ${s.run.decisions} (per model decade ${n(mean(s.run.decisionsByDecade))}), automated ${s.run.automated} (${n(mean(s.run.automatedByDecade))}); longest gap ${gapIn(decisionTimes, 0, Math.min(3600, s.time)).toFixed(0)} s in hour 1, ${gapIn(decisionTimes, 0, s.time).toFixed(0)} s in the run`);
  if (JSON_OUT) console.log(JSON.stringify(report));
  return { s, report };
}

/* ---------------- main ---------------- */

interface CampaignOpts { seed?: number; chooseCharter?: (s: GameState) => string | null; quietSummary?: boolean }
function campaign(mode: Strategy, nRuns: number, skip?: Set<string>, arms?: string[], opts: CampaignOpts = {}): RunReport[] {
  let s = model.createState(C, undefined, opts.seed ?? SEED);
  const reports: RunReport[] = [];
  let cum = 0;
  const cumDecisions: number[] = [];
  const total = TOTAL_HOURS > 0 ? TOTAL_HOURS * 3600 : Infinity;
  for (let i = 1; TOTAL_HOURS > 0 ? cum < total : i <= nRuns; i++) {
    const runMode: Strategy = mode === 'mixed' || mode === 'charter' ? (i <= 2 ? 'efficiency' : 'budget')
      : mode === 'market' ? (i === 1 ? 'efficiency' : 'market') : mode;
    const r = playRun(s, i, runMode, skip, arms);
    reports.push(r.report);
    for (const t of r.report.m2.decisionTimes) cumDecisions.push(cum + t);
    cum += r.report.seconds;
    if (SUMMARY && !opts.quietSummary) {
      const R = r.report, f = R.firsts, M = R.m2;
      const t = (k: string) => (f[k] !== undefined ? f[k].toFixed(1) : '-');
      const T = R.terms;
      console.log(`${mode} #${i} cum ${(cum / 3600).toFixed(2)} h · ${(R.seconds / 60).toFixed(1)} min ${R.cause}${R.causeSector ? `(${R.causeSector})` : ''}` +
        ` · H ${R.hindsight} (${R.hindsightPerMin.toFixed(2)}/min) · open ${R.sectorsOpen.map((e) => `${e}@${R.sectors[e]?.openedMin?.toFixed(0) ?? '?'}`).join(',')}` +
        ` · reveal ${t('buy:steam.coalQuestion')} cond ${t('buy:steam.condenser')} crisis ${R.firstCrisisMin?.toFixed(1) ?? '-'} lever ${t('firstLever')}` +
        ` · dec ${M.firstDecadeMin?.toFixed(1) ?? '-'}${M.firstDecadeLean === null ? '' : M.firstDecadeLean ? ' lean' : ' full'} clear ${M.firstClearMin?.toFixed(1) ?? '-'} steady ${M.steadyMin?.toFixed(1) ?? '-'}` +
        ` · Wpk ${R.peakWellbeing.toFixed(1)} yAt ${R.yearsAtTarget.toFixed(0)} · dec ${Object.values(R.sectors).map((x) => x.decades).join('/')} lean ${M.leanDecades} full ${M.fullDecades}` +
        ` · settled ${M.settlements}/${M.settledAtEnd} commons ${M.commonsLevels} buys player ${R.purchases} market ${M.marketBuys}${f.firstMarket !== undefined ? ` (first ${f.firstMarket.toFixed(1)})` : ''} charter ${M.charter ?? '-'}` +
        ` · terms W ${T.wellbeing.toFixed(0)} B ${T.budget.toFixed(0)} U ${T.unburnt.toFixed(0)} F ${T.backfire.toFixed(0)} S ${T.sectorsReached.toFixed(0)} St ${T.steady.toFixed(0)} Se ${(T.settled ?? 0).toFixed(0)}` +
        (DECISIONS ? ` · decisions ${M.decisions} (${mean(M.decisionsByDecade).toFixed(1)}/dec) auto ${M.automated} (${mean(M.automatedByDecade).toFixed(1)}/dec) gap h1 ${M.gaps.hour1.toFixed(0)} s run ${M.gaps.run.toFixed(0)} s` : ''));
    }
    s = model.reckon(r.s, C);
    if (mode !== 'idle') {
      const sp = spendHindsight(s, mode === 'mixed' || mode === 'charter' ? 'budget' : mode === 'market' ? 'efficiency' : mode);
      s = sp.s;
      if (sp.bought.length) log(`  spent Hindsight on: ${sp.bought.join(', ')} (left ${n(s.meta.hindsight)}); loadout ${s.meta.loadout.join(', ') || '—'}`);
    }
    if (opts.chooseCharter && s.charterOffer.length) {
      const id = opts.chooseCharter(s);
      if (id !== null) { s = model.chooseCharter(s, C, id); log(`  charter: ${id} (offered ${s.charterOffer.join(', ')})`); }
    }
  }
  const nDone = reports.length;
  log(`\n${nDone} run(s) done. total Hindsight earned ${n(s.meta.hindsightEarned)}; sectors opened ${Object.keys(s.meta.sectorsOpened).join(', ')}; achievements: ${Object.keys(s.meta.achievements).join(', ') || '—'}`);
  log('  Hindsight per minute by run: ' + reports.map((r) => `#${r.run} ${n(r.hindsightPerMin)} (${r.hindsight} in ${(r.seconds / 60).toFixed(1)} min)`).join(' · '));
  if (SUMMARY && !opts.quietSummary) console.log(`${mode}: Hindsight/min by run ${reports.map((r) => r.hindsightPerMin.toFixed(2)).join(' ')}`);
  if (DECISIONS) {
    const out = {
      decisionsByDecade: mean(reports.map((r) => mean(r.m2.decisionsByDecade))),
      automatedByDecade: mean(reports.map((r) => mean(r.m2.automatedByDecade))),
      gapHour1: gapIn(cumDecisions, 0, Math.min(3600, cum)),
      gapHours1to10: cum > 3600 ? gapIn(cumDecisions, 3600, Math.min(36000, cum)) : null,
      perRun: reports.map((r) => ({ run: r.run, decisions: r.m2.decisions, automated: r.m2.automated, gapHour1: r.m2.gaps.hour1, gapRun: r.m2.gaps.run })),
    };
    if (JSON_OUT) console.log(JSON.stringify({ strategy: mode, decisions: out }));
    else console.log(`${mode} decisions: per model decade ${out.decisionsByDecade.toFixed(2)} (automated ${out.automatedByDecade.toFixed(2)}); longest gap without a decision: hour 1 ${out.gapHour1.toFixed(0)} s, hours 1–10 ${out.gapHours1to10 === null ? '-' : `${out.gapHours1to10.toFixed(0)} s`}`);
  }
  return reports;
}

/** The `charter` strategy: Hindsight per minute while each Charter was in force. */
function charterAudit(): void {
  const ids = (C.charters ?? []).map((c) => c.id);
  if (!ids.length) { console.log('charter: no Charters in this content'); return; }
  const results: { id: string; seed: number | null; hpm: number | null; runs: number }[] = [];
  for (const id of ids) {
    let seed: number | null = null;
    for (let k = 1; k <= 200 && seed === null; k++) {
      // reckon's offer for run 2 depends only on the first run's seed (and the eligible set)
      const r = model.reckon(model.createState(C, undefined, k), C);
      if (r.charterOffer.includes(id)) seed = k;
    }
    if (seed === null) { results.push({ id, seed: null, hpm: null, runs: 0 }); continue; }
    const reps = campaign('charter', runs, undefined, undefined, {
      seed, quietSummary: true, chooseCharter: (s) => (s.charterOffer.includes(id) ? id : s.charterOffer[0] ?? null),
    });
    const inForce = reps.filter((r) => r.m2.charter === id);
    const h = inForce.reduce((a, r) => a + r.hindsight, 0), m = inForce.reduce((a, r) => a + r.seconds / 60, 0);
    results.push({ id, seed, hpm: m > 0 ? h / m : null, runs: inForce.length });
  }
  const vals = results.map((r) => r.hpm).filter((x): x is number => x !== null);
  const mu = mean(vals);
  if (JSON_OUT) console.log(JSON.stringify({ strategy: 'charter', mean: mu, results: results.map((r) => ({ ...r, deviation: r.hpm !== null && mu > 0 ? r.hpm / mu - 1 : null })) }));
  else {
    console.log(`\ncharter audit (Hindsight per minute over the runs each Charter was in force; target ±15% of the mean ${n(mu)}):`);
    for (const r of results) {
      console.log(`  ${r.id.padEnd(24)} ${r.seed === null ? 'never offered (200 seeds)' : `seed ${r.seed}  ${r.hpm === null ? '-' : n(r.hpm)}/min over ${r.runs} run(s)  ${r.hpm !== null && mu > 0 ? signedPct(r.hpm / mu - 1) : ''}`}`);
    }
  }
}

/** Fork groups: connected components of the `excludes` graph (each member is one arm). */
function forkGroups(): string[][] {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => { (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b); };
  const ids = new Set(C.upgrades.map((u) => u.id));
  const inScope = (id: string) => forkSector === 'all' || C.upgrades.find((u) => u.id === id)?.sector === forkSector;
  for (const u of C.upgrades) for (const x of u.excludes ?? []) if (ids.has(x) && inScope(u.id) && inScope(x)) { link(u.id, x); link(x, u.id); }
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const u of C.upgrades) {
    if (!adj.has(u.id) || seen.has(u.id)) continue;
    const g: string[] = [];
    const stack = [u.id];
    while (stack.length) {
      const x = stack.pop()!;
      if (seen.has(x)) continue;
      seen.add(x); g.push(x);
      for (const y of adj.get(x) ?? []) stack.push(y);
    }
    groups.push(g);
  }
  return groups;
}

void YEARS_PER_SECOND;
if (strategy === 'forks') {
  const groups = forkGroups();
  let combos: string[][] = [[]];
  for (const g of groups) combos = combos.flatMap((c) => g.map((arm) => [...c, arm]));
  const total = combos.length;
  if (combos.length > 16) {
    const rnd = prng(SEED);
    const picked = new Set<number>();
    while (picked.size < 16) picked.add(Math.floor(rnd() * combos.length));
    combos = [...picked].sort((a, b) => a - b).map((i) => combos[i]);
  }
  if (!JSON_OUT) console.log(`forks (sector ${forkSector}): ${groups.length} fork group(s) [${groups.map((g) => g.join(' | ')).join('; ')}], ${total} combination(s), playing ${combos.length}`);
  const results: { arms: string[]; hpm: number; hindsight: number; minutes: number }[] = [];
  for (const arms of combos) {
    const skip = new Set(groups.flat().filter((id) => !arms.includes(id)));
    const reps = campaign('forks', runs, skip, arms);
    const h = reps.reduce((a, r) => a + r.hindsight, 0);
    const m = reps.reduce((a, r) => a + r.seconds / 60, 0);
    results.push({ arms, hpm: m > 0 ? h / m : 0, hindsight: h, minutes: m });
  }
  const best = Math.max(...results.map((r) => r.hpm)), worst = Math.min(...results.map((r) => r.hpm));
  const mean = results.reduce((a, r) => a + r.hpm, 0) / Math.max(1, results.length);
  const out = {
    strategy: 'forks', groups, combinations: total, played: results.length, results,
    spread: worst > 0 ? best / worst - 1 : null, maxDeviationFromMean: mean > 0 ? Math.max(best / mean - 1, 1 - worst / mean) : null,
  };
  if (JSON_OUT) console.log(JSON.stringify(out));
  else {
    console.log('\nfork audit (Hindsight per minute over the runs, target: every combination within ±10% of the mean):');
    for (const r of results.sort((a, b) => b.hpm - a.hpm)) console.log(`  ${n(r.hpm).padStart(6)}  ${r.hindsight} in ${r.minutes.toFixed(1)} min   ${r.arms.join(' + ') || '(no forks)'}`);
    console.log(`  spread best/worst ${out.spread !== null ? pct(out.spread) : '-'}; max deviation from the mean ${out.maxDeviationFromMean !== null ? pct(out.maxDeviationFromMean) : '-'}`);
  }
} else if (strategy === 'charter') {
  charterAudit();
} else {
  campaign(strategy, runs);
}
if (failures) {
  console.log(`!! ${failures} sanity failure(s)`);
  process.exit(1);
}
