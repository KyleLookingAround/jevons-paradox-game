/**
 * Headless balancer: plays whole runs of Rebound with a fixed strategy and prints what happened.
 *
 *   bun run tools/balance.ts [efficiency|levers|idle|budget|forks] [runs] [flags]
 *
 *   efficiency  buy the cheapest affordable upgrade, found every app when affordable, never touch levers;
 *               spend Hindsight on Know-how (cheapest first).
 *   levers      the same, plus raise the cheapest lever once revealed whenever Mandate allows and net Mandate
 *               stays positive; spend Hindsight on Institutions first (seated greedily), then Know-how.
 *   budget      holds the line. Before the reveal it plays like `efficiency` but does not found an application that
 *               would put R above the budget it intends to draw (--budget-fold × baseR). At the reveal it draws a
 *               budget in every open sector (and in each sector as it opens), then raises cap levers (and Tightens)
 *               and sufficiency to stay within budget, keeping Mandate positive. Between runs: Institutions first,
 *               seating a cap / duty / reveal loadout, then Know-how.
 *   forks       plays `efficiency` once per combination of fork arms (upgrades linked by `excludes`), at most 16
 *               combinations (random ones from --seed beyond that), each for [runs] runs from a fresh meta, and prints
 *               Hindsight per minute per combination and the spread (fork audit target ±10%).
 *   idle        buy nothing.
 *
 * Flags: --fixture (test fixture instead of src/content), --hours=3 (cap per run), --every=120 (series interval, s),
 *        --cps=0 (manual clicks per second), --seed=1, --no-series, --dt=1, --json (one JSON summary per run, no
 *        text), --budget-fold=2.5.
 * Runs are consecutive (the prestige loop), except in `forks`.
 */
import { model } from '../src/model';
import { content as realContent } from '../src/content';
import { fixture } from '../src/fixture';
import { BUDGET_TOLERANCE } from '../src/types';
import type { Content, GameState, HindsightTerms, InstitutionDef, SectorId, UpgradeView } from '../src/types';

declare const process: { argv: string[]; exit(code?: number): never };

/* ---------------- arguments ---------------- */

type Strategy = 'efficiency' | 'levers' | 'idle' | 'budget' | 'forks';
const STRATEGIES: Strategy[] = ['efficiency', 'levers', 'idle', 'budget', 'forks'];
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
const CPS = parseFloat(flag('cps', '0'));
const SEED = parseInt(flag('seed', '1'), 10);
const SERIES = flag('no-series', 'false') !== 'true';
const DT = parseFloat(flag('dt', '1'));
const JSON_OUT = flag('json', 'false') === 'true';
const BUDGET_FOLD = parseFloat(flag('budget-fold', '2.5'));
const ORDER = C.sectorOrder;
const log = (...a: unknown[]) => { if (!JSON_OUT) console.log(...a); };

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

/* ---------------- strategy ---------------- */

/** Upgrade views without the (expensive) projections: cost and visibility do not depend on the reveal. */
const cheapViews = (s: GameState): UpgradeView[] => model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, C);

interface Ev { t: number; text: string }
interface EffBuy { sector: SectorId; t: number; id: string; promise: number; decade: number | null; reach: string; rBefore: number; rAfter?: number; cumPromise: number }
interface RunCtx {
  ev: Ev[]; effBuys: EffBuy[]; skip: Set<string>; firsts: Record<string, number>;
}

function buyStuff(s: GameState, ctx: RunCtx, budgetCap: boolean): GameState {
  for (let guard = 0; guard < 50; guard++) {
    const views = cheapViews(s).filter((v) => v.visible && !v.maxed && v.affordable && !ctx.skip.has(v.def.id)).sort((a, b) => a.cost - b.cost);
    if (!views.length) break;
    const v = views[0];
    let decade: number | null = null, reach = '';
    let rBefore = 0;
    if (v.def.kind === 'efficiency') {
      if (s.flags.revealed) {
        const full = model.upgradeViews(s, C).find((u) => u.def.id === v.def.id);
        decade = full?.projectedDecade ?? null;
        reach = (full?.bringsWithinReach ?? []).map((b) => `${b.appId} ${signedPct(b.projectedChange)}`).join(', ');
      }
      rBefore = model.derive(s, C).sectors[v.def.sector]?.rFold ?? 0;
    }
    const next = model.buyUpgrade(s, C, v.def.id);
    if (next === s) break;
    s = next;
    ctx.firsts[`buy:${v.def.id}`] ??= s.time;
    const lvl = s.upgrades[v.def.id];
    if (v.def.kind === 'efficiency') {
      const prev = ctx.effBuys.filter((b) => b.sector === v.def.sector);
      const cum = (1 + (prev.length ? prev[prev.length - 1].cumPromise : 0)) * (1 + (v.promisedChange ?? 0)) - 1;
      ctx.effBuys.push({ sector: v.def.sector, t: s.time, id: v.def.id, promise: v.promisedChange ?? 0, decade, reach, rBefore, cumPromise: cum });
      ctx.ev.push({ t: s.time, text: `buy  ${v.def.id} £${n(v.cost)}  card ${signedPct(v.promisedChange)}${s.flags.revealed ? `, decade ${signedPct(decade)}${reach ? `, within reach: ${reach}` : ''}` : ''}  R× before ${n(rBefore)}` });
    } else {
      ctx.ev.push({ t: s.time, text: `buy  ${v.def.id}${lvl > 1 ? ` (L${lvl})` : ''} £${n(v.cost)} [${v.def.kind}]` });
    }
  }
  for (const e of ORDER) {
    if (!s.sectors[e]?.open) continue;
    for (const a of C.sectors[e].applications) {
      const next = model.foundApp(s, C, a.id);
      if (next === s) continue;
      if (budgetCap) {
        const d = model.derive(next, C).sectors[e]!;
        const es = next.sectors[e];
        const line = d.budgetR ?? (es.baseR > 0 ? BUDGET_FOLD * es.baseR : Infinity);
        if (d.resourceUse > line * (1 + BUDGET_TOLERANCE)) {
          if (!ctx.skip.has(`app:${a.id}`)) { ctx.skip.add(`app:${a.id}`); ctx.ev.push({ t: s.time, text: `skip ${a.id}: R would be ${n(d.resourceUse)} over the line ${n(line)}` }); }
          continue;
        }
      }
      s = next;
      ctx.firsts[`app:${a.id}`] ??= s.time;
      ctx.ev.push({ t: s.time, text: `app  ${a.id} £${n(a.foundCost)}` });
    }
  }
  return s;
}

const upkeepStep = (s: GameState, id: string): number => {
  const v = model.leverViews(s, C).find((l) => l.def.id === id)!;
  return (v.next?.mandateUpkeep ?? 0) - (v.current?.mandateUpkeep ?? 0);
};

function raiseLevers(s: GameState, ev: Ev[]): GameState {
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
    ev.push({ t: s.time, text: `lever ${l.def.id} → L${l.level + 1} (${l.next?.label}) mandate ${n(l.nextCost ?? 0)}` });
  }
  return s;
}

/** The budget player's line keeping: draw, cap at the line, Tighten / sufficiency when the line is not held. */
function holdTheLine(s: GameState, ev: Ev[]): GameState {
  if (!s.flags.revealed) return s;
  for (const e of ORDER) {
    if (s.sectors[e]?.open && !s.sectors[e].budget) {
      const next = model.drawBudget(s, C, e);
      if (next !== s) { s = next; ev.push({ t: s.time, text: `BUDGET ${e} drawn at R ${n(s.sectors[e].budget!.r0)}` }); }
    }
  }
  for (let guard = 0; guard < 6; guard++) {
    const d = model.derive(s, C);
    const views = model.leverViews(s, C);
    let acted = false;
    for (const e of ORDER) {
      const x = d.sectors[e];
      if (!x || x.budgetR === null) continue;
      const over = x.resourceUse > x.budgetR * (1 + BUDGET_TOLERANCE * 0.5);
      const capViews = views.filter((l) => l.def.sector === e && l.def.kind === 'cap' && l.visible);
      const sufViews = views.filter((l) => l.def.sector === e && l.def.kind === 'sufficiency' && l.visible);
      // a cap in force at the line, else the cheapest one
      const capOn = capViews.find((l) => l.level > 0);
      let want = capOn ? (over ? capOn : null) : capViews.sort((a, b) => (a.nextCost ?? Infinity) - (b.nextCost ?? Infinity))[0] ?? null;
      if (!want && over) want = sufViews.find((l) => l.canRaise) ?? null;
      if (!want || !want.canRaise || want.nextCost === null) continue;
      if (d.mandatePerSec - upkeepStep(s, want.def.id) <= 0 && want.level > 0) continue;
      const next = model.setLever(s, C, want.def.id, want.level + 1);
      if (next === s) continue;
      s = next;
      acted = true;
      ev.push({ t: s.time, text: `lever ${want.def.id} → L${want.level + 1} (${want.next?.label}) mandate ${n(want.nextCost)}${over ? ' [over the line]' : ''}` });
    }
    if (!acted) break;
  }
  // keep Mandate positive: drop the costliest non-cap lever while net Mandate is negative and the reserve is thin
  const d = model.derive(s, C);
  if (d.mandatePerSec < 0 && s.mandate < -60 * d.mandatePerSec) {
    const worst = model.leverViews(s, C).filter((l) => l.level > 0 && l.def.kind !== 'cap').sort((a, b) => b.upkeep - a.upkeep)[0];
    if (worst) {
      s = model.setLever(s, C, worst.def.id, worst.level - 1);
      ev.push({ t: s.time, text: `lever ${worst.def.id} ↓ L${worst.level - 1} (Mandate)` });
    }
  }
  return s;
}

/** Seat the best loadout: cap > duty > reveal > anything else, greedily by seats. */
function seatLoadout(s: GameState): GameState {
  const rank = (d: InstitutionDef): number => {
    const effs = [d.effects, ...(d.nextLevels ?? []).map((l) => l.effects)].flat();
    const lever = (k: string) => effs.some((e) => e.type === 'startLever' && C.levers.find((l) => l.id === e.lever)?.kind === k);
    return lever('cap') ? 0 : lever('duty') ? 1 : effs.some((e) => e.type === 'reveal') ? 2 : 3;
  };
  const owned = C.institutions.filter((i) => (s.meta.institutions[i.id] ?? 0) >= 1).sort((a, b) => rank(a) - rank(b));
  const ids: string[] = [];
  let used = 0;
  for (const i of owned) {
    if (used + (i.slots ?? 1) > s.meta.slots) continue;
    // requirements: a lever institution is useless without what reveals its lever; take it anyway (startLever shows it)
    ids.push(i.id);
    used += i.slots ?? 1;
  }
  return model.setLoadout(s, C, ids);
}

function spendHindsight(s: GameState): { s: GameState; bought: string[] } {
  const bought: string[] = [];
  const instFirst = strategy === 'levers' || strategy === 'budget';
  for (let guard = 0; guard < 400; guard++) {
    const inst = model.institutionViews(s, C).filter((v) => v.canBuy).sort((a, b) => (a.nextCost ?? 0) - (b.nextCost ?? 0));
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
  sectors: Record<SectorId, {
    etaFold: number; rFold: number; peakRFold: number; peakRebound: number | null; reboundAtReveal: number | null;
    frontierFold: number; budgetRatio: number | null; steadyYears: number; decades: number; steady: boolean;
    reserveFraction: number; pressureFraction: number;
  }>;
  steadyYearsAll: number; won: boolean; slots: number; loadout: string[];
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

function playRun(start: GameState, idx: number, mode: Strategy, skip: Set<string> = new Set(), arms?: string[]): { s: GameState; report: RunReport } {
  let s = start;
  const ctx: RunCtx = { ev: [], effBuys: [], skip: new Set(skip), firsts: {} };
  const ev = ctx.ev;
  const series: string[] = [];
  const peakRebound: Record<SectorId, number> = {};
  const reboundAtReveal: Record<SectorId, number | null> = {};
  const capT = HOURS * 3600;
  const extra = mode === 'budget' || mode === 'levers' || mode === 'forks';
  let clickAcc = 0;
  let revealT: number | null = s.flags.revealed ? 0 : null;
  let crisisT: number | null = null;
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
  while (true) {
    const pend = model.derive(s, C).pendingReckoning;
    if (pend || s.time >= capT) break;
    if (mode !== 'idle') {
      s = buyStuff(s, ctx, mode === 'budget');
      if (mode === 'levers' && Math.floor(s.time) % 5 === 0) s = raiseLevers(s, ev);
      if (mode === 'budget' && Math.floor(s.time) % 5 === 0) s = holdTheLine(s, ev);
    }
    if (CPS > 0) {
      clickAcc += CPS * DT;
      while (clickAcc >= 1) { s = model.click(s, C); clickAcc--; }
    }
    prev = s;
    s = model.tick(s, C, DT);
    for (const e of ORDER) {
      const a = prev.sectors[e], b = s.sectors[e];
      if (!b) continue;
      if (!a?.open && b.open) ev.push({ t: s.time, text: `SECTOR ${e} opens (year ${Math.floor(model.derive(s, C).year)})` });
      if (b.open && b.crisesFired > (a?.crisesFired ?? 0)) {
        crisisT ??= s.time;
        ev.push({ t: s.time, text: `CRISIS ${e} #${b.crisesFired} (P ${pct(b.pressure / C.sectors[e].collapseAt)}, +${C.global.crisisMandate} mandate, pop ${n(prev.population)} → ${n(s.population)})` });
      }
      if (b.open && a?.open) {
        for (const ap of C.sectors[e].applications) {
          if (!a.apps[ap.id]?.available && b.apps[ap.id]?.available) ev.push({ t: s.time, text: `     ${ap.id} available (p_s ≤ ${ap.visibleBelow})` });
        }
        if (b.decadesWithin.length > a.decadesWithin.length) ev.push({ t: s.time, text: `DECADE ${e} #${b.decadesWithin.length} within budget` });
        if (b.steadyYears >= 50 && a.steadyYears < 50) ev.push({ t: s.time, text: `STEADY STATE ${e}` });
        if (a.steadyYears >= 10 && b.steadyYears === 0) ev.push({ t: s.time, text: `     ${e} breaks its budget after ${n(a.steadyYears)} years` });
      }
      if (b.backfired && !a?.backfired) ev.push({ t: s.time, text: `     ${e} backfires (direct rebound > 100%)` });
    }
    if (revealT === null && s.flags.revealed) {
      revealT = prev.flags.revealed ? prev.time : s.time;
      ev.push({ t: s.time, text: 'REVEAL' });
      const d = model.derive(s, C);
      for (const e of ORDER) if (d.sectors[e]) reboundAtReveal[e] = d.sectors[e]!.rebound;
    }
    if (!prev.flags.won && s.flags.won) ev.push({ t: s.time, text: 'WON: Steady State across every sector' });
    for (const l of C.levers) {
      const la = prev.levers[l.id]?.level ?? 0, lb = s.levers[l.id]?.level ?? 0;
      if (lb < la) ev.push({ t: s.time, text: `     lever ${l.id} lapses to L${lb}` });
    }
    for (const b of ctx.effBuys) {
      if (b.rAfter === undefined && s.time >= b.t + 60) b.rAfter = model.derive(s, C).sectors[b.sector]?.rFold ?? 0;
    }
    const d = model.derive(s, C);
    for (const e of ORDER) {
      const x = d.sectors[e];
      if (x?.rebound !== null && x?.rebound !== undefined) peakRebound[e] = Math.max(peakRebound[e] ?? -Infinity, x.rebound);
    }
    if (Math.floor(s.time / EVERY) > Math.floor(prev.time / EVERY)) {
      pushSample();
      check(s, `run ${idx} t=${s.time}`);
    }
  }
  if (series[series.length - 1] !== sampleRow(s, open(), extra)) pushSample();
  check(s, `run ${idx} end`);

  // ----- report -----
  const d = model.derive(s, C);
  const pend = d.pendingReckoning;
  log('  events:');
  for (const e of ev) log(`  ${min(e.t)}  ${e.text}`);
  const cause = pend ? `${pend.cause}${pend.sector ? ` (${pend.sector})` : ''}` : `time cap ${HOURS} h (chosen)`;
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
    };
    log(`    ${e.padEnd(8)} η× ${pad(n(x.etaFold), 5)}  R× now ${pad(n(x.rFold), 5)}  peak R× ${pad(n(sectors[e].peakRFold), 5)}` +
      `  rebound peak ${pct(peakRebound[e])} at reveal ${pct(reboundAtReveal[e])} now ${pct(x.rebound)}  frontier× ${n(x.frontierFold)}` +
      `  budget/R ${sectors[e].budgetRatio !== null ? n(sectors[e].budgetRatio) : '-'}  streak ${n(x.steadyYears)} y  decades ${x.budgetDecades}${s.run.steadySectors[e] ? '  STEADY' : ''}` +
      `  reserve ${pct(x.reserveFraction)}  P ${pct(x.pressureFraction)}  p_s ${n(x.servicePrice)}  D ${n(x.demand)}  R ${n(x.resourceUse)}`);
  }
  for (const e of ORDER) {
    const bs = ctx.effBuys.filter((b) => b.sector === e);
    if (!bs.length) continue;
    log(`  ${e} efficiency buys (R× before → 60 s after):`);
    for (const [i, b] of bs.entries()) {
      log(`    #${i + 1} m${(b.t / 60).toFixed(1)} card ${signedPct(b.promise)} (cum ${signedPct(b.cumPromise)}) decade ${signedPct(b.decade)}${b.reach ? ` reach ${b.reach}` : ''} R× ${n(b.rBefore)}→${b.rAfter !== undefined ? n(b.rAfter) : '?'}`);
    }
  }
  const terms = d.hindsightTerms;
  const hpm = s.time > 0 ? terms.total / (s.time / 60) : 0;
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
    sectors, steadyYearsAll: s.steadyYearsAll, won: s.flags.won, slots: s.meta.slots, loadout: s.meta.loadout,
  };
  if (JSON_OUT) console.log(JSON.stringify(report));
  return { s, report };
}

/* ---------------- main ---------------- */

function campaign(mode: Strategy, nRuns: number, skip?: Set<string>, arms?: string[]): RunReport[] {
  let s = model.createState(C, undefined, SEED);
  const reports: RunReport[] = [];
  for (let i = 1; i <= nRuns; i++) {
    const r = playRun(s, i, mode, skip, arms);
    reports.push(r.report);
    s = model.reckon(r.s, C);
    if (mode !== 'idle') {
      const sp = spendHindsight(s);
      s = sp.s;
      if (sp.bought.length) log(`  spent Hindsight on: ${sp.bought.join(', ')} (left ${n(s.meta.hindsight)}); loadout ${s.meta.loadout.join(', ') || '—'}`);
    }
  }
  log(`\n${nRuns} run(s) done. total Hindsight earned ${n(s.meta.hindsightEarned)}; sectors opened ${Object.keys(s.meta.sectorsOpened).join(', ')}; achievements: ${Object.keys(s.meta.achievements).join(', ') || '—'}`);
  log('  Hindsight per minute by run: ' + reports.map((r) => `#${r.run} ${n(r.hindsightPerMin)} (${r.hindsight} in ${(r.seconds / 60).toFixed(1)} min)`).join(' · '));
  return reports;
}

/** Fork groups: connected components of the `excludes` graph (each member is one arm). */
function forkGroups(): string[][] {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => { (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b); };
  const ids = new Set(C.upgrades.map((u) => u.id));
  for (const u of C.upgrades) for (const x of u.excludes ?? []) if (ids.has(x)) { link(u.id, x); link(x, u.id); }
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
  log(`forks: ${groups.length} fork group(s) [${groups.map((g) => g.join(' | ')).join('; ')}], ${total} combination(s), playing ${combos.length}`);
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
  log('\nfork audit (Hindsight per minute over the runs, target: every combination within ±10% of the mean):');
  for (const r of results.sort((a, b) => b.hpm - a.hpm)) log(`  ${n(r.hpm).padStart(6)}  ${r.hindsight} in ${r.minutes.toFixed(1)} min   ${r.arms.join(' + ') || '(no forks)'}`);
  log(`  spread best/worst ${out.spread !== null ? pct(out.spread) : '-'}; max deviation from the mean ${out.maxDeviationFromMean !== null ? pct(out.maxDeviationFromMean) : '-'}`);
} else {
  campaign(strategy, runs);
}
if (failures) {
  console.log(`!! ${failures} sanity failure(s)`);
  process.exit(1);
}
