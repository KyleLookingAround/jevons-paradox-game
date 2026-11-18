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
 *
 * Clicking (all strategies but idle): --cps taps per second (default 5) while a tap is worth it, i.e. while
 * cps × clickValue ≥ --click-until × income (default 0.5, the UI's shrink rule). --cps=0 turns it off.
 *
 * Flags: --fixture, --hours=3 (cap per run), --every=120 (series interval, s), --cps=5, --click-until=0.5, --seed=1,
 *        --no-series, --dt=1, --json (one JSON summary per run, no text), --summary (one line per run),
 *        --safe-pressure=0.5, --draw-after=4, --fork-sector=<id>|all.
 * Runs are consecutive (the prestige loop), except in `forks`.
 */
import { model } from '../src/model';
import { content as realContent } from '../src/content';
import { fixture } from '../src/fixture';
import { BUDGET_TOLERANCE, YEARS_PER_SECOND } from '../src/types';
import type { Content, EffectDef, GameState, HindsightTerms, InstitutionDef, SectorId, UpgradeView } from '../src/types';

declare const process: { argv: string[]; exit(code?: number): never };

/* ---------------- arguments ---------------- */

type Strategy = 'efficiency' | 'levers' | 'idle' | 'budget' | 'forks' | 'peakdraw' | 'mixed';
const STRATEGIES: Strategy[] = ['efficiency', 'levers', 'idle', 'budget', 'forks', 'peakdraw', 'mixed'];
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
    const next = model.drawBudget(s, C, e);
    if (next !== s) { s = next; ctx.firsts[`budget:${e}`] ??= s.time; ctx.ev.push({ t: s.time, text: `BUDGET ${e} drawn at R ${n(s.sectors[e].budget!.r0)} (W ${n(d0.wellbeing)})` }); }
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
  const kh = Object.entries(s.meta.knowhow).filter(([, v]) => v).map(([k, v]) => `${k}×${v}`).join(' ');
  const inst = Object.entries(s.meta.institutions).map(([k, v]) => `${k}${v > 1 ? ` L${v}` : ''}${s.meta.loadout.includes(k) ? '*' : ''}`).join(' ');
  log(`\n=== Run ${idx} · ${mode}${arms ? ` [${arms.join(', ')}]` : ''} · ${useFixture ? 'FIXTURE' : 'content'} · reckonings ${s.meta.reckonings} · hindsight left ${n(s.meta.hindsight)} · seats ${s.meta.slots}`);
  if (kh || inst) log(`    know-how: ${kh || '—'}   institutions (* seated): ${inst || '—'}`);
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
        if (b.decadesWithin.length > a.decadesWithin.length) { ctx.firsts.firstDecade ??= s.time; ev.push({ t: s.time, text: `DECADE ${e} #${b.decadesWithin.length} within budget` }); }
        if (b.steadyYears >= 50 && a.steadyYears < 50) { ctx.firsts.firstSteady ??= s.time; ev.push({ t: s.time, text: `STEADY STATE ${e}` }); }
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
    // the budget player Reckons once the last ten minutes earned less than its average rate (and no streak is
    // about to pay a decade or a Steady State)
    if (mode === 'budget' && Math.floor(s.time) % 10 === 0) {
      hist.push([s.time, d.hindsightIfReckonNow]);
      const old = hist.find(([t]) => t >= s.time - 600);
      const T = d.hindsightTerms;
      const steady = T.wellbeing + T.budget + T.unburnt; // the earned-by-time part (one-off awards left out)
      hist[hist.length - 1][1] = steady;
      const avg = steady / (s.time / 60);
      const marginal = old && s.time - old[0] >= 590 ? (steady - old[1]) / ((s.time - old[0]) / 60) : Infinity;
      const streaking = ORDER.some((e) => d.sectors[e]?.decoupling && !s.run.steadySectors[e]);
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
    peakWellbeing: s.run.peakWellbeing, yearsAtTarget: s.run.yearsAtTarget, sectorsOpen: open(),
  };
  if (JSON_OUT) console.log(JSON.stringify(report));
  return { s, report };
}

/* ---------------- main ---------------- */

function campaign(mode: Strategy, nRuns: number, skip?: Set<string>, arms?: string[]): RunReport[] {
  let s = model.createState(C, undefined, SEED);
  const reports: RunReport[] = [];
  let cum = 0;
  for (let i = 1; i <= nRuns; i++) {
    const runMode: Strategy = mode === 'mixed' ? (i <= 2 ? 'efficiency' : 'budget') : mode;
    const r = playRun(s, i, runMode, skip, arms);
    reports.push(r.report);
    cum += r.report.seconds;
    if (SUMMARY) {
      const R = r.report, f = R.firsts;
      const t = (k: string) => (f[k] !== undefined ? f[k].toFixed(1) : '-');
      console.log(`${mode} #${i} cum ${(cum / 3600).toFixed(2)} h · ${(R.seconds / 60).toFixed(1)} min ${R.cause}${R.causeSector ? `(${R.causeSector})` : ''}` +
        ` · H ${R.hindsight} (${R.hindsightPerMin.toFixed(2)}/min) · open ${R.sectorsOpen.map((e) => `${e}@${R.sectors[e]?.openedMin?.toFixed(0) ?? '?'}`).join(',')}` +
        ` · reveal ${t('buy:steam.coalQuestion')} cond ${t('buy:steam.condenser')} crisis ${R.firstCrisisMin?.toFixed(1) ?? '-'} lever ${t('firstLever')} dec ${t('firstDecade')} steady ${t('firstSteady')}` +
        ` · Wpk ${R.peakWellbeing.toFixed(1)} yAt ${R.yearsAtTarget.toFixed(0)} · dec ${Object.values(R.sectors).map((x) => x.decades).join('/')}`);
    }
    s = model.reckon(r.s, C);
    if (mode !== 'idle') {
      const sp = spendHindsight(s, mode === 'mixed' ? 'budget' : mode);
      s = sp.s;
      if (sp.bought.length) log(`  spent Hindsight on: ${sp.bought.join(', ')} (left ${n(s.meta.hindsight)}); loadout ${s.meta.loadout.join(', ') || '—'}`);
    }
  }
  log(`\n${nRuns} run(s) done. total Hindsight earned ${n(s.meta.hindsightEarned)}; sectors opened ${Object.keys(s.meta.sectorsOpened).join(', ')}; achievements: ${Object.keys(s.meta.achievements).join(', ') || '—'}`);
  log('  Hindsight per minute by run: ' + reports.map((r) => `#${r.run} ${n(r.hindsightPerMin)} (${r.hindsight} in ${(r.seconds / 60).toFixed(1)} min)`).join(' · '));
  if (SUMMARY) console.log(`${mode}: Hindsight/min by run ${reports.map((r) => r.hindsightPerMin.toFixed(2)).join(' ')}`);
  return reports;
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
} else {
  campaign(strategy, runs);
}
if (failures) {
  console.log(`!! ${failures} sanity failure(s)`);
  process.exit(1);
}
