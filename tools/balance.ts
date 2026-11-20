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
 *                 - spends spare Mandate on circularity (one level a minute at most, keeping a reserve);
 *                 - Reckons (from 30 minutes) when the last ten minutes earned under 90 % of its average rate, or (from
 *                   40 minutes) when the next industry waits only on a Reckoning, or at the time cap; but waits while a
 *                   Steady State is on its way: a clear streak running, or (wellbeing at the target) pressure falling to
 *                   the clear level within --hold-for minutes, for at most 1.5 × that; once the run has paid a Steady
 *                   State, a waiting industry wins (M2 balance: lean decades pay no Hindsight, so they hold nobody);
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
 *   market      (M2) run 1 as `efficiency`; from run 2 the Market is on everywhere and the player is the budget player
 *               who leaves routine efficiency and capital cards to the Market: it founds what the Market has left for
 *               25 s, buys the cards the Market never buys (research, prospects, fork arms), holds lines as `budget`
 *               does (the Market stays on there), chooses dividends and Reckons as `budget` does.
 *   charter     (M2) each Charter in force for one run against a shared history, in two settings (see charterAudit):
 *               run 2 as `efficiency`, and run 3 as `budget` for a fixed 60 minutes; Hindsight per minute and the
 *               deviation from each setting's mean (target ±15%). Only ever chooses from what the core offers.
 *
 * M2 flags (restraint strategies budget, mixed, levers, market; peakdraw takes --pace):
 *   --pace=<id>          pace of the lines they draw (default: the sector's first pace)
 *   --dividend=0|1|best|look  which option of each pending dividend to choose (best: the larger one-offs, else 0; look:
 *                        the one whose next 10 minutes earn more Hindsight; default 0)
 *   --settle             settle each sector as soon as it can
 *   --commons            buy the visible Commons project with the best wellbeing per £ when affordable above 60 s of income
 *   --market=on|off      the Market in runs ≥ 2 (default on for a player who never touches it; `budget` switches it off in
 *                        sectors with a line unless --market=on)
 *   --offline-check      every 10 minutes of play: clone, fastForward 8 h, print heldBy / heldSector / simulated / pending,
 *                        decades, Hindsight gained while away (OfflineReport.hindsight) and its multiple of the Hindsight
 *                        the run itself earned at its end (×run), dividends forgone, wellbeing after
 *   --decisions          longest stretch without a player decision in hour 1 and hours 1–10, decisions and automated
 *                        actions per model decade (mean); in --json: decisionsByDecade, automatedByDecade and the gaps
 *   --total-hours=N      keep playing consecutive runs until N hours cumulative (overrides [runs])
 *   --payback=S          the Market's paybackMax in seconds (default: the content's, 120 s unless set)
 *   --hold-for=M         the restraint player waits for clear skies it sees coming within M minutes (default 30)
 *   --fixed-run=M        runs 3 onwards of budget/market last exactly M minutes (to compare like with like)
 *
 * Clicking (all strategies but idle): --cps taps per second (default 5) while a tap is worth it, i.e. while
 * cps × clickValue ≥ --click-until × income (default 0.5, the UI's shrink rule). --cps=0 turns it off.
 *
 * M3 (each behaviour behind a flag; on content without M3 data every one of them is a no-op, and the output is as M2's):
 *   crisisFarm           (strategy) booms like `efficiency` until every open Industry has fired all its crises (for their
 *                        Mandate), then restrains as `budget`; compare Mandate and Hindsight per minute with `budget`
 *   --fixture[=m3|m2|bank]  the test fixture: fixtureM3 (default; every M3 mechanism), the M2 fixture, or fixtureM3Bank
 *   --seams=on|off       restraint and efficiency strategies sink the next seam when reachable and affordable after
 *                        keeping 60 s of income (default on)
 *   --dispatch=default|first|random|best|thoughtful  answer policy: let it expire, arm 0, a seeded random arm (default),
 *                        the arm whose one-offs pay most, or the arm that suits the situation (holding a line or booming)
 *   --dispatch-audit     each arm of each dispatch forced, the rest at `random`; Hindsight per minute per arm (±10%)
 *   --ignore=seams|load|travel|free[,…]  the strategy is blind to the mechanic: never sinks; never founds night-profile,
 *                        travel (sprawl) or free-at-use applications
 *   --history=<id>       chooses that History whenever offered; prints time to its goal and whether cleared
 *   --unlocks            the active-time stamp of every first (features, Industries, applications, first dispatch,
 *                        first History, the reveal, the Proprietor's Day, the ending) per run and cumulatively; the
 *                        longest gap between firsts to hour 20 and the smallest gap between two feature unlocks to hour 10
 *   --file-return=H      files a fixed household return at cumulative hour H (--return-json=<figures> to override)
 *   summary columns (content with M3 data only): seams, load factor, speed, sprawl, dispatches answered/defaulted,
 *                        History, ending reached (hour)
 *
 * Flags: --fixture, --hours=3 (cap per run), --every=120 (series interval, s), --cps=5, --click-until=0.5, --seed=1,
 *        --no-series, --dt=1, --json (one JSON summary per run, no text), --summary (one line per run),
 *        --safe-pressure=0.5, --draw-after=4, --fork-sector=<id>|all.
 * Runs are consecutive (the prestige loop), except in `forks`.
 */
import { model, evalCond, leverLevelDef } from '../src/core';
import { content as realContent } from '../src/content';
import { fixture, fixtureM3, fixtureM3Bank, fixtureM4, fixtureM4Acts } from '../src/core/fixture';
import { BUDGET_TOLERANCE, YEARS_PER_SECOND } from '../src/types';
import type { Content, EffectDef, GameState, HindsightTerms, InstitutionDef, SectorId, UpgradeView } from '../src/types';
// @ts-ignore — node types are not installed; Bun provides node:fs
import { readFileSync, writeFileSync } from 'node:fs';

declare const process: { argv: string[]; exit(code?: number): never };

/* ---------------- arguments ---------------- */

type Strategy = 'efficiency' | 'levers' | 'idle' | 'budget' | 'forks' | 'peakdraw' | 'mixed' | 'market' | 'charter' | 'human' | 'crisisFarm';
const STRATEGIES: Strategy[] = ['efficiency', 'levers', 'idle', 'budget', 'forks', 'peakdraw', 'mixed', 'market', 'charter', 'human', 'crisisFarm'];
const argv = process.argv.slice(2);
const flag = (name: string, dflt: string): string => {
  const a = argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  return a === undefined ? dflt : a.includes('=') ? a.slice(a.indexOf('=') + 1) : 'true';
};
const positional = argv.filter((a) => !a.startsWith('--'));
/** M4: `fishsteward` is the budget player with the steward's Fishing rules (see m4Actions). */
const STEWARD = positional[0] === 'fishsteward';
const strategy = (STEWARD ? 'budget' : positional[0] ?? 'efficiency') as Strategy;
if (!STRATEGIES.includes(strategy)) {
  console.error(`unknown strategy "${strategy}" (${STRATEGIES.join(' | ')})`);
  process.exit(2);
}
const runs = Math.max(1, parseInt(positional[1] ?? '3', 10) || 3);
const realOk = Array.isArray((realContent as Partial<Content> | undefined)?.sectorOrder) && !!realContent?.sectors;
const FIXTURE = flag('fixture', 'false');
const useFixture = FIXTURE !== 'false' || !realOk;
const C0: Content = useFixture
  ? (FIXTURE === 'm2' ? fixture : FIXTURE === 'bank' ? fixtureM3Bank : FIXTURE === 'm4' ? fixtureM4 : FIXTURE === 'm4acts' ? fixtureM4Acts : fixtureM3)
  : realContent;
/**
 * --off=load,travel,free (balance experiments): the content with a mechanic's physics stripped, to attribute a change in
 * pacing to it. load: no LoadDef (capCost × the load term the sector would have at its opening profile is NOT restored;
 * compare like with like); travel: roads infinite, no speed or roads effects, no lockInDecay; free: no priceSeen anywhere;
 * dispatch: no letters at all.
 */
const OFF = new Set(flag('off', '').split(',').filter(Boolean));
/** --feature-on=<id>[,…]: those features dropped from Content.features, so they are on from the start (views print). */
const FEATURE_ON = new Set(flag('feature-on', '').split(',').filter(Boolean));
function stripMechanics(c: Content): Content {
  if (!OFF.size && !FEATURE_ON.size) return c;
  const keep = (e: EffectDef) => !((OFF.has('travel') && e.type === 'travelMul') || (OFF.has('free') && e.type === 'priceSeen'));
  const sectors = Object.fromEntries(Object.entries(c.sectors).map(([id, d]) => [id, {
    ...d,
    ...(OFF.has('load') && d.load ? { load: undefined } : {}),
    ...(OFF.has('travel') && d.travel ? { travel: { ...d.travel, roads: 1e15 } } : {}),
    applications: d.applications.map((a) => ({
      ...a,
      ...(OFF.has('travel') ? { lockInDecay: undefined } : {}),
      ...(OFF.has('free') ? { priceSeen: undefined } : {}),
    })),
  }]));
  return { ...c, sectors, ...(OFF.has('dispatch') ? { dispatches: [] } : {}), features: FEATURE_ON.size ? Object.fromEntries(Object.entries(c.features ?? {}).filter(([k]) => !FEATURE_ON.has(k))) : c.features, upgrades: c.upgrades.map((u) => ({ ...u, effects: u.effects.filter(keep) })), levers: c.levers.map((l) => ({ ...l, ...(l.effects ? { effects: l.effects.filter(keep) } : {}) })) } as Content;
}
/** --set=<sector>.<field>.<sub>=<number>[,…] (balance experiments): override one numeric field of a sector's def,
 *  e.g. --set=steam.steady.clearBelow=0.45 or --set=code.unlock.minReckonings=6. */
function applySets(c: Content): Content {
  const sets = flag('set', '').split(',').filter(Boolean);
  if (!sets.length) return c;
  const sectors = { ...c.sectors };
  const out: any = { ...c, sectors, global: structuredClone(c.global), institutions: structuredClone(c.institutions), knowhow: structuredClone(c.knowhow), upgrades: structuredClone(c.upgrades), features: structuredClone(c.features) };
  const setIn = (root: any, keys: string[], val: string) => {
    let o = root;
    for (const k of keys.slice(0, -1)) o = o[k] ??= {};
    o[keys[keys.length - 1]] = parseFloat(val);
  };
  for (const kv of sets) {
    const [path, val] = kv.split('=');
    const [sec, ...keys] = path.split('.');
    // M4 balance: --set=global.wellbeingTarget=28, --set=inst:inst.fisheryBoard.cost=100, --set=kh:kh.deepMining.cost=20,
    // --set=up:steam.boilers.cost=100, --set=app:iron.rails.saturation=300 (ids contain dots: the prefix names the table)
    if (sec === 'global') { setIn(out.global, keys, val); continue; }
    const m = /^(inst|kh|up|app):(.*)$/.exec(path);
    if (m) {
      const [, table, rest] = m;
      const parts = rest.split('.');
      if (table === 'app') {
        const [s, a, ...ks] = parts;
        const root: any = structuredClone(sectors[s]);
        const app = root.applications.find((x: any) => x.id === `${s}.${a}`);
        setIn(app, ks, val);
        sectors[s] = root;
        continue;
      }
      const list: any[] = table === 'inst' ? out.institutions : table === 'kh' ? out.knowhow : out.upgrades;
      // the id is the longest prefix of parts that names an entry
      let k = parts.length - 1;
      while (k > 0 && !list.find((x) => x.id === parts.slice(0, k).join('.'))) k--;
      const item = list.find((x) => x.id === parts.slice(0, k).join('.'));
      if (!item) throw new Error(`--set: no ${table} entry for ${rest}`);
      setIn(item, parts.slice(k), val);
      continue;
    }
    const root: any = structuredClone(sectors[sec]);
    setIn(root, keys, val);
    sectors[sec] = root;
  }
  return out as Content;
}
const C: Content = applySets(stripMechanics(C0));
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
const FIXED_RUN = parseFloat(flag('fixed-run', '0')) * 60;
const PACE = flag('pace', '') || undefined;
const DIVIDEND = flag('dividend', '0');
/**
 * --ending=on|off (M3 finish; default on): the restraint players (budget, mixed from run 3, market, human) pursue the
 * first ending as a competent player would under its rule (every Industry settled at once, held endingYears): they
 * settle each Industry as soon as it can be settled; under a held line whose sky is not yet clear they reach for the
 * cap (one Tighten every --sky-every seconds, 60 by default; the human every 300 s once the line has held ten
 * minutes), then the levers under the line; and they stay in the run, past the --hours cap (to --ending-hours, 8),
 * while four or more Industries are settled or a clear streak is running towards the fifth.
 */
const ENDING = flag('ending', 'on') !== 'off';
const SKY_EVERY = parseFloat(flag('sky-every', '60'));
const ENDING_HOURS = parseFloat(flag('ending-hours', '8'));
const SETTLE = flag('settle', 'false') === 'true' || ENDING;
const COMMONS = flag('commons', 'false') === 'true';
const MARKET = flag('market', '');
const OFFLINE_CHECK = flag('offline-check', 'false') === 'true';
const DECISIONS = flag('decisions', 'false') === 'true';
const TOTAL_HOURS = parseFloat(flag('total-hours', '0'));
const PAYBACK = parseFloat(flag('payback', '0'));
/** --dump-at=K [--dump-to=<file>]: write the serialize()d state at the start of run K (after the Hindsight spend); --from=<file>
 *  starts a campaign from such a state (balance experiments: replay one long run without the hours before it). */
const DUMP_AT = parseInt(flag('dump-at', '0'), 10) || 0;
const DUMP_TO = flag('dump-to', `design/scratch/state-run${DUMP_AT}.json`);
const FROM = flag('from', '');
const SKY = flag('sky', 'false') === 'true';
const ORDER = C.sectorOrder;
/* M3 flags */
const SEAMS = flag('seams', 'on') !== 'off';
const DISPATCH = flag('dispatch', 'random');
const DISPATCH_AUDIT = flag('dispatch-audit', 'false') === 'true';
const IGNORE = new Set(flag('ignore', '').split(',').filter(Boolean));
const HISTORY = flag('history', '');
/** --history-at=K: choose the History only from the K-th Reckoning (with --feature-on=histories, a History audit can
 *  share runs 1–K with the plain strategy and compare run K+1 like with like). Default 0: whenever offered. */
const HISTORY_AT = parseInt(flag('history-at', '0'), 10) || 0;
const UNLOCKS = flag('unlocks', 'false') === 'true';
const FILE_RETURN = parseFloat(flag('file-return', '0'));
const RETURN_JSON = flag('return-json', '');
/** The content has M3 data (only then do the M3 summary columns print). */
const M3C = Object.values(C.sectors).some((d) => d.seams?.length || d.load || d.travel || d.applications.some((a) => a.priceSeen))
  || !!(C.dispatches?.length || C.ambient?.length || C.histories?.length || C.archive?.length);
const ANY_SEAMS = Object.values(C.sectors).some((d) => d.seams?.length);
/** Applications a strategy blind to a mechanic never founds (--ignore). */
const IGNORED_APPS = new Set<string>();
for (const d of Object.values(C.sectors)) for (const a of d.applications) {
  if (IGNORE.has('load') && d.load && (a.profile ?? d.load.defaultProfile) !== d.load.defaultProfile) IGNORED_APPS.add(a.id);
  if (IGNORE.has('travel') && d.travel && (!d.travel.apps || d.travel.apps.includes(a.id)) && ((a.lockIn ?? 0) > 0 || (a.lockInDecay ?? 0) > 0)) IGNORED_APPS.add(a.id);
  if (IGNORE.has('free') && a.priceSeen) IGNORED_APPS.add(a.id);
  if (IGNORE.has('feeds') && a.feeds?.length) IGNORED_APPS.add(a.id); // M4: founds no use that feeds (criterion 5)
}
/** --ignore=free also skips the cards that set a seen price (Compute's business models, Light's flat rate). */
const IGNORED_CARDS = new Set(IGNORE.has('free') ? C.upgrades.filter((u) => u.effects.some((e) => e.type === 'priceSeen')).map((u) => u.id) : []);
/** --dispatch-audit: the arm forced for one dispatch. */
let ARM_OVERRIDE: { id: string; arm: number } | null = null;
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
    // a frontier left to bring within reach: an application not yet available (one available but unaffordable cannot be)
    const frontierLeft = C.sectors[v.def.sector].applications.some((a) => !es.apps[a.id]?.available);
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
    const views = cheapViews(s).filter((v) => v.visible && !v.maxed && !v.excludedBy && !ctx.skip.has(v.def.id) && !IGNORED_CARDS.has(v.def.id));
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
      if (IGNORED_APPS.size && IGNORED_APPS.has(a.id)) continue;
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

interface BudgetMemo { revealAt: number | null; lastSpare?: number; budgetAt?: number; overSince?: Record<string, number>; lastStock?: number; stockP?: Record<string, number>; lastPush?: Record<string, number>; lastSky?: Record<string, number>; skyP?: Record<string, number> }

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
    // M3 balance: a later Industry's line waits until it has been open MIN_DRAW (12 min): drawn the moment it opens, its
    // pressure is near nothing and the clear level sits at the floor, out of reach for good (a competent player learns
    // to let the smoke show first). Steam, open from the start, keeps the old rule.
    const ready = (e === ORDER[0] || es.openFor >= MIN_DRAW) && (d0.wellbeing >= g.wellbeingTarget + 2 || x.resourceUse >= 0.9 * safeR(s, e)
      || (since >= DRAW_AFTER && es.openFor >= MIN_DRAW));
    if (!ready) continue;
    const next = model.drawBudget(s, C, e, PACE);
    if (next !== s) {
      s = next; ctx.firsts[`budget:${e}`] ??= s.time; ctx.ev.push({ t: s.time, text: `BUDGET ${e} drawn at R ${n(s.sectors[e].budget!.r0)} (W ${n(d0.wellbeing)}, ${s.sectors[e].budget!.pace})` });
      if (strategy !== 'market' && MARKET !== 'on') s = model.setOrders(s, C, { market: { sectors: { [e]: false } } });
    }
  }
  // the unfolding: before budgets arrive (runs 1–2), restraint is levers only: every lever raised once Mandate allows
  // with the net rate kept positive (the `levers` player's rule), and nothing founded past the smoke-safe level
  if (!d0.features.budget) return raiseLevers(s, ctx);
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
  // spare Mandate: stretch the reserve with circularity (it changes the coal, not the air), one level a minute at most,
  // keeping a reserve of Mandate and a positive net rate after the upkeep
  if (s.time - (memo.lastSpare ?? -Infinity) >= 60) {
    const dm = model.derive(s, C);
    const circ = model.leverViews(s, C).filter((l) => l.def.kind === 'circularity' && l.visible && l.canRaise && l.nextCost !== null)
      .filter((l) => s.mandate >= 400 + 3 * (l.nextCost ?? 0) && dm.mandatePerSec - upkeepStep(s, l.def.id) > 0.05)
      .sort((a, b) => (a.nextCost ?? 0) - (b.nextCost ?? 0))[0];
    if (circ) {
      const next = model.setLever(s, C, circ.def.id, circ.level + 1);
      if (next !== s) { s = next; memo.lastSpare = s.time; ctx.ev.push({ t: s.time, text: `lever ${circ.def.id} → L${circ.level + 1} (spare Mandate)` }); }
    }
  }
  s = tendStock(s, ctx, memo);
  s = pushToSink(s, ctx, memo, 120, 0);
  s = towardsSky(s, ctx, memo, SKY_EVERY, 0);
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

/**
 * M3 balance: a stock nothing absorbs (Code's code stock: pressure fed by service, absorption 0) cannot be held by a cap
 * on the resource; only its own levers lower it (deletion first, then shared libraries and review). The restraint
 * player raises one a minute while that pressure is above 15% of collapse and still rising, keeping net Mandate
 * positive. (Without it every long budget run from run 5 ended in Code's collapse at 160–175 minutes.)
 */
function tendStock(s: GameState, ctx: RunCtx, memo: BudgetMemo): GameState {
  if (s.time - (memo.lastStock ?? -Infinity) < 60) return s;
  const d = model.derive(s, C);
  for (const e of ORDER) {
    const def = C.sectors[e], x = d.sectors[e];
    if (!x || x.settled || def.pressureSource !== 'service' || def.absorption > 0) continue;
    const prevP = memo.stockP?.[e];
    memo.stockP = { ...(memo.stockP ?? {}), [e]: s.sectors[e].pressure };
    if (x.pressureFraction < 0.15 || prevP === undefined || s.sectors[e].pressure <= prevP) continue;
    const order: string[] = ['deletion', 'sharedLibs', 'reviewGate'];
    const l = model.leverViews(s, C).filter((v) => v.def.sector === e && order.includes(v.def.kind) && v.visible && v.canRaise && v.nextCost !== null)
      .filter((v) => d.mandatePerSec - upkeepStep(s, v.def.id) > 0)
      .sort((a, b) => order.indexOf(a.def.kind) - order.indexOf(b.def.kind))[0];
    if (!l) continue;
    const next = model.setLever(s, C, l.def.id, l.level + 1);
    if (next === s) continue;
    s = next; memo.lastStock = s.time;
    ctx.ev.push({ t: s.time, text: `lever ${l.def.id} → L${l.level + 1} (the code stock at ${pct(x.pressureFraction)}, rising)` });
  }
  return s;
}

/**
 * M3 balance, second pass: a held line does not clear the sky by itself (it settles the smoke at about half the drawn
 * level, above Steam's clear level of 0.45). A competent player then reaches under the line: water wheels
 * (substitution) first, then temperance (sufficiency), then green spending, one step every `every` seconds per
 * Industry while the line holds, the sky is not clear, the line has held for `heldFor` seconds, and Mandate allows.
 */
function pushToSink(s: GameState, ctx: RunCtx, memo: BudgetMemo, every: number, heldFor: number): GameState {
  const d = model.derive(s, C);
  memo.lastPush ??= {};
  const order = ['substitution', 'sufficiency', 'greenSpending'];
  for (const e of ORDER) {
    const x = d.sectors[e], es = s.sectors[e];
    if (!x || !es?.open || es.settled || x.budgetR === null || x.clearP === null) continue;
    if (es.pressure <= x.clearP || x.resourceUse > x.budgetR * (1 + BUDGET_TOLERANCE) || es.steadyYears * 20 < heldFor) continue;
    if (s.time - (memo.lastPush[e] ?? -Infinity) < every) continue;
    const l = model.leverViews(s, C).filter((v) => v.def.sector === e && order.includes(v.def.kind) && v.visible && v.canRaise && v.nextCost !== null)
      .filter((v) => s.mandate >= (v.nextCost ?? 0) + 100 && d.mandatePerSec - upkeepStep(s, v.def.id) > 0.05)
      .sort((a, b) => order.indexOf(a.def.kind) - order.indexOf(b.def.kind) || a.level - b.level)[0];
    if (!l) continue;
    const next = model.setLever(s, C, l.def.id, l.level + 1);
    if (next === s) continue;
    s = next; memo.lastPush[e] = s.time;
    ctx.ev.push({ t: s.time, text: `lever ${l.def.id} → L${l.level + 1} (under the line, towards clear skies: P ${n(es.pressure)} > ${n(x.clearP)})` });
  }
  return s;
}

/**
 * M3 finish (--ending): under a held line whose sky has not cleared, a player who wants the Industry settled tightens
 * its cap (the line's own instrument: R falls, and the smoke with it), one level every `every` seconds per Industry
 * while the smoke is not already falling, wellbeing is at the target and Mandate allows; with no cap left to tighten,
 * the levers under the line (pushToSink's order). Code's stock (absorbed by nothing) is cleared by deletion.
 */
function towardsSky(s: GameState, ctx: RunCtx, memo: BudgetMemo, every: number, heldFor: number): GameState {
  if (!ENDING) return s;
  const d = model.derive(s, C);
  if (!d.features.settlement || d.wellbeing < C.global.wellbeingTarget) return s;
  memo.lastSky ??= {};
  memo.skyP ??= {};
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
    if (s.time - (memo.lastSky[e] ?? -Infinity) < every) continue;
    const p0 = memo.skyP[e];
    memo.skyP[e] = es.pressure;
    memo.lastSky[e] = s.time;
    if (p0 === undefined || es.pressure < p0 * 0.97) continue; // falling on its own: wait
    const views = model.leverViews(s, C).filter((v) => v.def.sector === e && v.visible && v.canRaise && v.nextCost !== null
      && s.mandate >= (v.nextCost ?? 0) + 50 && d.mandatePerSec - upkeepStep(s, v.def.id) > 0.02);
    const order = C.sectors[e].pressureSource === 'service' ? ['deletion', 'sharedLibs', 'reviewGate'] : ['cap', 'substitution', 'sufficiency', 'greenSpending'];
    const l = views.filter((v) => order.includes(v.def.kind)).sort((a, b) => order.indexOf(a.def.kind) - order.indexOf(b.def.kind) || a.level - b.level)[0];
    if (!l) continue;
    const next = model.setLever(s, C, l.def.id, l.level + 1);
    if (next === s) continue;
    s = next;
    ctx.ev.push({ t: s.time, text: `lever ${l.def.id} → L${l.level + 1} (towards a clear sky to settle: P ${n(es.pressure)} > ${n(x.clearP)})` });
  }
  return s;
}

/** --ending: the run is worth staying in for the first ending: not yet won this run, and four or more Industries
 *  settled, or two with a clear streak running in another, and room for all (Settlement does not survive a Reckoning). */
function pursuing(s: GameState): boolean {
  if (s.flags.won || (C.features?.settlement && s.meta.features?.settlement === undefined)) return false;
  // (M3 finish: and room for every Industry: GlobalParams.settleMax and the Settlement Commission)
  // M4 balance: the ending's own set (Derived.ending.total: the Act I Industries; M3 content: every Industry), not ORDER
  // (which now holds the Previews): M3's "4 of 5, or 2 and a streak" becomes "all but one, or two and a streak"
  const en = model.derive(s, C).ending;
  if (en.room < en.total) return false;
  const act = C.acts?.find((a) => a.ending);
  const set = act?.ending ? act.ending.sectors.filter((e) => !!C.sectors[e]) : ORDER;
  const streak = set.some((e) => s.sectors[e]?.open && !s.sectors[e].settled && (s.sectors[e].clearYears ?? 0) > 0);
  return en.settled >= en.total - 1 || (en.settled >= Math.max(2, en.total - 3) && streak);
}

/* ---------------- the plausible human restraint player (QA, 19 Nov 2026) ---------------- */

/**
 * Restraint as a person plays it, not as the optimal bot does: before budgets, levers whenever Mandate allows; once the
 * budget has arrived, the line is drawn HUMAN_DRAW minutes later at whatever the use is then (the middle pace once paces
 * are offered), the cap's first level is enacted as soon as Mandate allows, and it is tightened only when the panel says
 * "over budget" and has said so for a minute. Founds everything, buys the cheapest card, leaves the Market on.
 */
const HUMAN_DRAW = parseFloat(flag('human-draw', '3')) * 60;
function humanStep(s: GameState, ctx: RunCtx, memo: BudgetMemo): GameState {
  if (!s.flags.revealed) return s;
  const d0 = model.derive(s, C);
  if (!d0.features.budget) return raiseLevers(s, ctx);
  memo.budgetAt ??= s.time;
  memo.overSince ??= {};
  for (const e of ORDER) {
    const es = s.sectors[e];
    if (!es?.open || es.budget || s.time - Math.max(memo.budgetAt, s.time - es.openFor) < HUMAN_DRAW) continue;
    const paces = C.sectors[e].steady?.paces ?? C.global.steady?.paces ?? [];
    const pace = d0.features.budgetPace && paces.length >= 2 ? paces[1].id : undefined;
    const next = model.drawBudget(s, C, e, pace);
    if (next !== s) { s = next; ctx.firsts[`budget:${e}`] ??= s.time; ctx.ev.push({ t: s.time, text: `BUDGET ${e} drawn (human) at R ${n(s.sectors[e].budget!.r0)} W ${n(d0.wellbeing)} ${s.sectors[e].budget!.pace}` }); }
  }
  const d = model.derive(s, C);
  const views = model.leverViews(s, C);
  for (const e of ORDER) {
    const x = d.sectors[e];
    if (!x || x.budgetR === null) continue;
    const cap = views.find((l) => l.def.sector === e && l.def.kind === 'cap' && l.visible);
    if (!cap) continue;
    const over = x.resourceUse > x.budgetR * (1 + BUDGET_TOLERANCE);
    if (over) memo.overSince[e] ??= s.time; else delete memo.overSince[e];
    const prompted = cap.level === 0 || (over && s.time - memo.overSince[e] >= 60);
    if (!prompted) continue;
    // M3 balance: when the cap will go no further (its last level, or the panel refuses), a person tries the next lever
    // on the page: the Industry's sufficiency
    const suf = views.find((l) => l.def.sector === e && l.def.kind === 'sufficiency' && l.visible && l.canRaise);
    const want = cap.canRaise ? cap : over ? suf : undefined;
    if (!want) continue;
    const next = model.setLever(s, C, want.def.id, want.level + 1);
    if (next !== s) {
      const w0 = d.wellbeing;
      s = next; ctx.firsts.firstLever ??= s.time; delete memo.overSince[e];
      ctx.ev.push({ t: s.time, text: `lever ${want.def.id} → L${want.level + 1} (human) W ${n(w0)} R/line ${n(x.resourceUse / x.budgetR)}` });
    }
  }
  // a stock nothing absorbs (Code's) is tended once it has cost a crisis this run: the crisis is the prompt
  if (ORDER.some((e) => C.sectors[e].pressureSource === 'service' && (s.sectors[e]?.crisesFired ?? 0) > 0)) s = tendStock(s, ctx, memo);
  // once a line has held ten minutes and the panel says the sky waits, a person reaches for the next lever on the page,
  // every five minutes; and settles an Industry as soon as it is offered (M3 balance, second pass)
  s = pushToSink(s, ctx, memo, 300, 600);
  s = towardsSky(s, ctx, memo, 300, 600);
  s = humanBite(s, ctx);
  for (const e of ORDER) { const nx = settleIfHeld(s, e); if (nx !== s) { s = nx; ctx.ev.push({ t: s.time, text: `SETTLED ${e} (human)` }); } }
  return s;
}

/**
 * The plausible mistake (M3 balance, item 6): from run 4, once a run, the human enacts an attractive measure that bites
 * back (a lever with sideEffects) on its own; when its bite has soured it (0.5, the 'biteBack' headline), it enacts the
 * pairing the lever's line names (its `unless`, when that is owning a lever).
 */
function humanBite(s: GameState, ctx: RunCtx): GameState {
  if (s.meta.reckonings < 3) return s;
  const views = model.leverViews(s, C);
  for (const v of views) {
    const se = v.def.sideEffects;
    if (!se || !v.visible) continue;
    const pair = se.unless && 'owns' in se.unless ? views.find((x) => x.def.id === (se.unless as { owns: string }).owns) : undefined;
    if (v.level === 0 && v.canRaise && !ctx.skip.has(`bite:${v.def.id}`) && (!pair || pair.level === 0)) {
      const next = model.setLever(s, C, v.def.id, 1);
      if (next !== s) { s = next; ctx.skip.add(`bite:${v.def.id}`); ctx.ev.push({ t: s.time, text: `lever ${v.def.id} → L1 (human: the attractive measure, alone)` }); }
    } else if (v.level > 0 && (s.levers[v.def.id]?.bite ?? 0) >= 0.5 && pair && pair.level === 0 && pair.canRaise) {
      const next = model.setLever(s, C, pair.def.id, 1);
      if (next !== s) { s = next; ctx.ev.push({ t: s.time, text: `lever ${pair.def.id} → L1 (human: pairs ${v.def.id}, which bit back)` }); }
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
/** --dividend=look: the option whose next 10 minutes (coarse 5 s steps, nothing else bought) earn more Hindsight by time. */
function lookAhead(s: GameState, sector: SectorId): 0 | 1 {
  const score = (opt: 0 | 1): number => {
    let t = model.chooseDecadeDividend(s, C, sector, opt);
    for (let i = 0; i < 120 && !model.derive(t, C).pendingReckoning; i++) t = model.tick(t, C, 5);
    const T = model.derive(t, C).hindsightTerms;
    return T.wellbeing + T.budget + T.unburnt + T.steady;
  };
  return score(1) > score(0) ? 1 : 0;
}
function chooseDividends(s: GameState, ctx: RunCtx): GameState {
  for (let guard = 0; guard < 20 && s.pendingDividends.length; guard++) {
    const p = s.pendingDividends[0];
    const opt = DIVIDEND === '1' ? 1 : DIVIDEND === 'best' ? (oneOffSize(p.options[1]) > oneOffSize(p.options[0]) ? 1 : 0)
      : DIVIDEND === 'look' ? lookAhead(s, p.sector) : 0;
    const next = model.chooseDecadeDividend(s, C, p.sector, opt);
    if (next === s) break;
    s = next;
    ctx.ev.push({ t: s.time, text: `dividend ${p.sector} #${p.decade}: ${p.options[opt]} (×${p.mul})` });
  }
  return s;
}
/** M3 finish: a settlement the player can hold: after settling, the net Mandate rate stays at or above 0 (the hold
 *  cost of settlements together, GlobalParams.settleHold, against the lever upkeep the settled Industry frees). */
function settleIfHeld(s: GameState, e: SectorId): GameState {
  if (!model.derive(s, C).sectors[e]?.canSettle) return s;
  const next = model.settle(s, C, e);
  return next !== s && model.derive(next, C).mandatePerSec >= 0 ? next : s;
}
function settleAll(s: GameState, ctx: RunCtx): GameState {
  for (const e of ORDER) {
    const next = settleIfHeld(s, e);
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
      if (IGNORED_APPS.has(a.id)) continue; // --ignore (balance lane fix: the market player founded them regardless)
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
      && !IGNORED_CARDS.has(x.def.id) && (x.def.kind === 'research' || x.def.kind === 'prospect' || (x.def.excludes?.length ?? 0) > 0))
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
  if (effs.some((e) => e.type === 'settleSlotAdd')) return -1; // M3 finish: room to settle, seated first
  // M4 balance: a surveying Institution (the Fishery Board) with --survey=board is seated beside the Commission (Fishing
  // cannot be settled without a survey); otherwise it is never bought by the generic loop (boardSeat, below, only)
  if (effs.some((e) => e.type === 'survey')) return SURVEY === 'board' ? -0.5 : 99;
  if (lever('cap')) return 0;
  if (effs.some((e) => e.type === 'wellbeingAdd')) return 1;
  if (effs.some((e) => e.type === 'reveal')) return 2;
  if (effs.some((e) => e.type === 'absorptionAdd')) return 3;
  // M3 balance: an automation (the Civil Service, Treasury rules) before further levels of anything; a person buys the
  // Civil Service once it is on offer, and the household survey (hour 6) waits for it
  if (effs.some((e) => e.type === 'orderUnlock')) return 4;
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
    if (instRank(i) === 4) continue; // owned (the survey waits for it), not seated: the bots do their own orders
    ids.push(i.id);
    used += i.slots ?? 1;
  }
  return model.setLoadout(s, C, ids);
}

function spendHindsight(s: GameState, mode: Strategy): { s: GameState; bought: string[] } {
  const bought: string[] = [];
  const instFirst = mode === 'levers' || mode === 'budget';
  // M3: from the fourth Reckoning, an affordable automation's first level (the Civil Service) is bought at once, not
  // saved behind dearer levels (earlier, its 120 Hindsight cost run 3 its Steady State: the Reckon rule is fragile)
  if (instFirst && s.meta.reckonings >= 4) for (const v of model.institutionViews(s, C).filter((x) => x.canBuy && x.level === 0 && instRank(x.def) === 4)) {
    const next = model.buyInstitution(s, C, v.def.id);
    if (next !== s) { s = next; bought.push(`${v.def.id} L1`); }
  }
  // M4 balance (--survey=board): the surveying Institution first (cheap; Fishing cannot be settled without it)
  if (instFirst || mode === 'levers') s = boardSeat(s);
  // M3 finish (--ending): once Settlement has arrived, the room to settle every Industry (the Settlement Commission) is
  // bought before anything else, saving for it run by run: the first ending waits on it
  if (ENDING && (mode === 'budget' || mode === 'levers') && (!C.features?.settlement || s.meta.features?.settlement !== undefined)) {
    for (let g = 0; g < 4; g++) {
      const room = model.institutionViews(s, C).find((v) => v.nextCost !== null && [v.def.effects, ...(v.def.nextLevels ?? []).map((l) => l.effects)].flat().some((e) => e.type === 'settleSlotAdd'));
      if (!room) break;
      if (!room.canBuy) { if (instFirst) s = seatLoadout(s); return { s, bought }; }
      const next = model.buyInstitution(s, C, room.def.id);
      if (next === s) break;
      s = next; bought.push(`${room.def.id} L${room.level + 1}`);
    }
  }
  for (let guard = 0; guard < 400; guard++) {
    const inst = model.institutionViews(s, C).filter((v) => v.canBuy && instRank(v.def) < 99)
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

/* ---------------- M3: seams, dispatches, returns, the unlock log ---------------- */

const dispatchRng = prng(SEED * 7919 + 13);
/** One-offs of an arm as one number (Mandate + capital seconds), for --dispatch=best. */
function armPay(effects: EffectDef[] | undefined, cost?: { mandate?: number; capitalSeconds?: number }): number {
  let x = -(cost?.mandate ?? 0) - (cost?.capitalSeconds ?? 0);
  for (const e of effects ?? []) if (e.type === 'mandateAdd') x += e.value; else if (e.type === 'capitalAdd') x += e.value;
  return x;
}
/**
 * --dispatch=thoughtful: the arm that suits the player's situation (M3 finish: reweighed to what each effect is worth
 * in Hindsight in that situation). Holding a line (in the letter's Industry, or any line for a general letter): demand
 * strains the line (a cap leaks; the streak breaks) and income buys little (capital piles up under a line); what pays is wellbeing,
 * efficiency (under a cap it is service, and so wellbeing), clearer skies (smoke per ton, absorption: Steady State),
 * and Mandate while it is short (it buys the levers). Booming (no line): demand, income, capital and cheap coal are
 * wellbeing-years; smoke matters near a crisis; Mandate is worth little. A standing effect counts as 60 model years.
 */
function armSuits(s: GameState, sector: SectorId | undefined, a: { effects?: EffectDef[]; modifier?: { effects: EffectDef[]; years: number }; cost?: { mandate?: number; capitalSeconds?: number } }): number {
  // the player's posture, not the letter's Industry: a player holding any line is a restraint player, and will draw
  // one in a newly opened Industry soon (judging that Industry as booming chose the arms that fill it)
  void sector;
  const holding = ORDER.some((e) => s.sectors[e]?.budget);
  const short = s.mandate < 20_000; // Mandate is short until the pile covers many Tightenings (a cap step costs hundreds to thousands)
  const mVal = holding ? (short ? 30 : 300) : 200;
  const ONE = new Set(['mandateAdd', 'capitalAdd', 'populationMul', 'pressureAdd', 'metaFlag', 'reserveAdd']);
  let v = -(a.cost?.mandate ?? 0) / mVal - (a.cost?.capitalSeconds ?? 0) / 40; // capital buys the efficiency that is wellbeing under a cap
  const weigh = (e: EffectDef, years: number) => {
    const t = years / 10;
    const x = (e as { value?: number }).value ?? 1;
    if (holding) {
      switch (e.type) {
        case 'mandateAdd': v += x / mVal; return;
        case 'capitalAdd': v += x / 40; return;
        case 'pressureAdd': v -= x * 40; return;
        case 'populationMul': v += (x - 1) * 2; return;
        case 'satMul': case 'halfPriceMul': v -= (x - 1) * 20 * t; return; // more appetite strains the line (a cap leaks): a broken streak
        case 'etaMul': v += (x - 1) * 20 * t; return;
        case 'intensityMul': v -= (x - 1) * 20 * t; return;
        case 'incomeMul': v += (x - 1) * 20 * t; return;
        case 'mandateRateMul': v += (x - 1) * (short ? 40 : 5) * t; return;
        case 'wellbeingAdd': v += x * 6 * t; return;
        case 'absorptionAdd': v += x * 4000 * t; return;
        case 'forbid': v -= 2 * t; return;
        case 'leverCostMul': v += ((1 - (e.cost ?? 1)) + (1 - (e.upkeep ?? 1))) * (short ? 20 : 3) * t; return;
        case 'leakMul': v -= (x - 1) * 5 * t; return;
        case 'spillMul': v -= (x - 1) * 3 * t; return;
        default: return;
      }
    }
    switch (e.type) {
      case 'mandateAdd': v += x / mVal; break;
      case 'capitalAdd': v += x / 40; break;
      case 'pressureAdd': v -= x * 10; break;
      case 'populationMul': v += (x - 1) * 20; break;
      case 'satMul': case 'halfPriceMul': v += (x - 1) * 15 * t; break;
      case 'etaMul': v += (x - 1) * 10 * t; break;
      case 'intensityMul': v += -(x - 1) * 8 * t; break;
      case 'resourcePriceMul': v += -(x - 1) * 10 * t; break;
      case 'incomeMul': v += (x - 1) * 20 * t; break;
      case 'costMulOf': v += -(x - 1) * 10 * t; break;
      case 'mandateRateMul': v += (x - 1) * 4 * t; break;
      case 'wellbeingAdd': v += x * 3 * t; break;
      case 'spillMul': v += (x - 1) * 3 * t; break;
      default: break;
    }
  };
  for (const e of a.effects ?? []) weigh(e, ONE.has(e.type) ? 0 : 60);
  for (const e of a.modifier?.effects ?? []) weigh(e, a.modifier!.years);
  return v;
}
const FIXED_RETURN: Record<string, number> = RETURN_JSON ? JSON.parse(RETURN_JSON) : {
  activeMinutesBefore: 600, activeMinutesAfter: 420, sessionsBefore: 20, sessionsAfter: 18, looksBefore: 60, looksAfter: 70,
  decisionsBefore: 900, decisionsAfter: 300, automatedAfter: 1500, daysBefore: 10, daysAfter: 10, quietDays: 4,
};
/* ---------------- M4: Fishing play, the steward, wagers, the act's ending ---------------- */
/** The content has M4 data (only then do the M4 behaviours act and the M4 summary columns print). */
const M4C = !!C.acts?.length || Object.values(C.sectors).some((d) => d.resourceKind === 'renewable' || d.resourceStock || d.applications.some((a) => a.feeds?.length));
/** --survey=never|cruise|board: never survey; raise a survey measure from the first poor season (a crisis in that
 *  Industry this run); seat an Institution that surveys whenever one can be bought and seated (between runs).
 *  Default: cruise for fishsteward, never otherwise. */
const SURVEY = flag('survey', STEWARD ? 'cruise' : 'never');
/** --dump-ending[=<dir>]: write the state at the Act I ending (act1-ending.json) and late in Act I, the first moment all
 *  but one of the ending set are settled (act1-late.json), for the UI and Playwright lanes. */
const DUMP_ENDING = flag('dump-ending', 'false');
const DUMP_DIR = DUMP_ENDING === 'true' ? 'design/scratch/m4-fixtures' : DUMP_ENDING;
const dumped = new Set<string>();
let M4R: { endingHour: number | null; arrears: number; minStock: Record<string, number>; surveyedMin: Record<string, number>; crossed: Record<string, boolean>; capDefence: number; capDefenceN: number; accounts: Record<string, string> } =
  { endingHour: null, arrears: 0, minStock: {}, surveyedMin: {}, crossed: {}, capDefence: 0, capDefenceN: 0, accounts: {} };
const surveyLevers = (e: SectorId) => C.levers.filter((l) => l.sector === e && (l.effects ?? []).some((x) => x.type === 'survey' && x.sector === e));
const isRenewable = (e: SectorId) => C.sectors[e]?.resourceKind === 'renewable';

/** What the page shows of a wager's condition: an unsurveyed stock reads as its catch per trip (thoughtful). */
function pageCond(s: GameState, c: import('../src/types').Cond): import('../src/types').Cond {
  const x = c as Record<string, unknown>;
  if ('all' in x) return { ...c, all: (x.all as import('../src/types').Cond[]).map((y) => pageCond(s, y)) } as import('../src/types').Cond;
  if ('any' in x) return { ...c, any: (x.any as import('../src/types').Cond[]).map((y) => pageCond(s, y)) } as import('../src/types').Cond;
  if ('not' in x) return { ...c, not: pageCond(s, x.not as import('../src/types').Cond) } as import('../src/types').Cond;
  if (x.stat === 'stockFraction' && typeof x.sector === 'string' && !model.derive(s, C).sectors[x.sector]?.stock?.surveyed) return { ...c, stat: 'reportedStock' } as import('../src/types').Cond;
  return c;
}
/** A wager arm's branch worth to this player: the branch its own estimate says will happen (thoughtful: from what the
 *  page shows; oracle: the true condition, an upper bound). 0 for an ordinary arm. */
function wagerValue(s: GameState, sector: SectorId | undefined, a: import('../src/types').DispatchArm): number {
  if (!a.wager) return 0;
  const win = DISPATCH === 'oracle' ? evalCond(s, C, a.wager.when) : evalCond(s, C, pageCond(s, a.wager.when));
  return armSuits(s, sector, win ? a.wager.win : a.wager.lose);
}
/** Between runs (--survey=board): buy and seat an Institution that surveys, when Hindsight and a seat allow. */
function boardSeat(s: GameState): GameState {
  if (SURVEY !== 'board') return s;
  for (const d of C.institutions ?? []) {
    if (!d.effects.some((x) => x.type === 'survey')) continue;
    if ((s.meta.institutions[d.id] ?? 0) < 1) { const t = model.buyInstitution(s, C, d.id); if (t !== s) s = t; }
    if ((s.meta.institutions[d.id] ?? 0) >= 1 && !s.meta.loadout.includes(d.id)) { const t = model.setLoadout(s, C, [...s.meta.loadout, d.id]); if (t !== s) s = t; }
  }
  return s;
}
/** The M4 parts of a strategy, every 5 s: Fishing (survey, line, quota, the steward's limits), the run's M4 records, the
 *  fixture dumps. */
function m4Actions(s: GameState, ctx: RunCtx, restraint: boolean): GameState {
  let d = model.derive(s, C);
  for (const e of ORDER) {
    const x = d.sectors[e];
    if (!x || !isRenewable(e) || !x.stock) continue;
    M4R.minStock[e] = Math.min(M4R.minStock[e] ?? 1, x.stock.world);
    if (x.stock.crossed) M4R.crossed[e] = true;
    if (x.stock.surveyed && M4R.surveyedMin[e] === undefined) M4R.surveyedMin[e] = s.time / 60;
    if (x.settled) continue;
    // M4 balance: with --survey=board, a restraint player whose Fishing has reached Steady State unsurveyed (it cannot
    // be settled: SettleDef.requires) and has no Board seated pays for survey cruises, as a person reading the checklist
    // ("Fishing needs the stock surveyed") would
    const needSurvey = SURVEY === 'board' && restraint && !x.stock.surveyed && (s.run.steadySectors?.[e] || d.ending.next?.sector === e && d.ending.next.need === 'requires');
    if ((SURVEY === 'cruise' && !x.stock.surveyed && s.sectors[e].crisesFired >= 1) || needSurvey) {
      for (const l of surveyLevers(e)) {
        const v = model.leverViews(s, C).find((y) => y.def.id === l.id);
        if (v?.canRaise && v.level < 1) { const t = model.setLever(s, C, l.id, 1); if (t !== s) { s = t; ctx.ev.push({ t: s.time, text: `SURVEY ${e} (${l.id})` }); } }
      }
    }
    if (restraint && x.stock.surveyed) {
      if (!s.sectors[e].budget) s = model.drawBudget(s, C, e, PACE);
      const want = STEWARD ? 0.9 : 1;
      for (const v of model.leverViews(s, C).filter((y) => y.def.sector === e && y.def.kind === 'quota' && y.visible)) {
        let best = 0, bv = Infinity;
        for (let k = 1; k <= v.maxLevel; k++) { const lv = leverLevelDef(v.def, k); const val = lv?.value ?? NaN; if (Number.isFinite(val) && Math.abs(val - want) < bv) { bv = Math.abs(val - want); best = k; } }
        if (best && v.level !== best) { const t = model.setLever(s, C, v.def.id, best); if (t !== s) { s = t; ctx.ev.push({ t: s.time, text: `QUOTA ${v.def.id} → level ${best}` }); } }
      }
      if (STEWARD && C.levers.some((l) => l.sector === e && l.kind === 'quota' && (s.levers[l.id]?.level ?? 0) >= 1)) {
        for (const v of model.leverViews(s, C).filter((y) => y.def.sector === e && y.visible && y.canRaise && y.level < 1 && (y.def.effects ?? []).some((f) => f.type === 'foreignMul'))) {
          const t = model.setLever(s, C, v.def.id, 1); if (t !== s) { s = t; ctx.ev.push({ t: s.time, text: `LIMITS ${v.def.id}` }); }
        }
      }
    }
  }
  d = model.derive(s, C);
  // records: arrears time, the capstone's share of the Mandate, the line accounts, the act's ending hour
  if (ORDER.some((e) => s.sectors[e]?.arrears)) M4R.arrears += 5;
  let capDef = 0;
  for (const e of ORDER) if (s.sectors[e]?.capstoned) capDef += d.sectors[e]?.settleDefence ?? 0;
  if (ORDER.some((e) => s.sectors[e]?.capstoned)) { M4R.capDefence += Math.min(1, capDef / Math.max(1e-9, d.mandatePerSec + capDef + 1e-9)); M4R.capDefenceN++; }
  for (const e of ORDER) { const b = s.sectors[e]?.budget; if (b) M4R.accounts[e] = b.account ?? 'own'; }
  const act = C.acts?.find((a) => a.ending);
  if (act?.ending && M4R.endingHour === null && s.meta.endings?.[act.ending.id] && s.flags.won) M4R.endingHour = s.meta.totalSeconds / 3600;
  if (DUMP_ENDING !== 'false' && act?.ending) {
    const set = act.ending.sectors.filter((e) => !!C.sectors[e]);
    const settled = set.filter((e) => s.sectors[e]?.open && s.sectors[e].settled).length;
    const write = (name: string) => { if (dumped.has(name)) return; dumped.add(name); writeFileSync(`${DUMP_DIR}/${name}`, model.serialize(s)); log(`  state written to ${DUMP_DIR}/${name}`); };
    if (settled >= set.length - 1 && set.length > 1 && !s.meta.endings?.[act.ending.id]) write('act1-late.json');
    if (s.meta.endings?.[act.ending.id] && s.flags.won) write('act1-ending.json');
  }
  return s;
}

/** The M3 parts of a strategy, every second of play: seams (every 5 s), dispatch answers, the household return. */
function m3Actions(s: GameState, ctx: RunCtx, mode: Strategy, tick5: boolean): GameState {
  if (SEAMS && ANY_SEAMS && !IGNORE.has('seams') && tick5 && mode !== 'idle') {
    const d = model.derive(s, C);
    for (const e of ORDER) {
      const sv = d.sectors[e]?.seams;
      const next = sv?.ladder.find((x) => !x.sunk);
      if (!next?.canSink || s.capital - next.cost < 60 * d.incomePerSec) continue;
      s = model.sinkSeam(s, C, e);
      ctx.ev.push({ t: s.time, text: `SEAM ${next.def.id} sunk £${n(next.cost)}` });
      ctx.firsts[`seam:${next.def.id}`] ??= s.time;
    }
  }
  const pending = s.dispatch?.pending ?? [];
  if (pending.length && (DISPATCH !== 'default' || (ARM_OVERRIDE && pending.some((x) => x.id === ARM_OVERRIDE!.id)))) {
    const p = DISPATCH === 'default' ? pending.find((x) => x.id === ARM_OVERRIDE?.id)! : pending[0];
    const def = C.dispatches?.find((x) => x.id === p.id);
    if (def) {
      let arm = 0;
      if (ARM_OVERRIDE && ARM_OVERRIDE.id === p.id) arm = ARM_OVERRIDE.arm;
      else if (DISPATCH === 'random') arm = Math.floor(dispatchRng() * def.arms.length);
      else if (DISPATCH === 'best') { let b = -Infinity; def.arms.forEach((a, i) => { const v = armPay(a.effects, a.cost); if (v > b) { b = v; arm = i; } }); }
      else if (DISPATCH === 'thoughtful' || DISPATCH === 'oracle') { let b = -Infinity; def.arms.forEach((a, i) => { const v = armSuits(s, def.sector, a) + wagerValue(s, def.sector, a); if (v > b) { b = v; arm = i; } }); }
      const next = model.answerDispatch(s, C, arm, p.id);
      if (next !== s) { s = next; ctx.ev.push({ t: s.time, text: `DISPATCH ${p.id} → arm ${arm}` }); ctx.firsts.firstAnswer ??= s.time; }
    }
  }
  if (FILE_RETURN > 0 && s.meta.totalSeconds >= FILE_RETURN * 3600 && !s.meta.returns?.household) {
    const next = model.fileReturn(s, C, { id: 'household', figures: FIXED_RETURN });
    if (next !== s) { s = next; ctx.ev.push({ t: s.time, text: 'RETURN filed' }); }
  }
  return s;
}

/** --unlocks: every first, stamped with cumulative active seconds (meta.totalSeconds). */
const unlockLog: { t: number; run: number; what: string; feature?: boolean }[] = [];
const seenFirst = new Set<string>();
let unlockSeq = 0;
function scanUnlocks(s: GameState): void {
  if (!UNLOCKS) return;
  const run = s.meta.reckonings + 1;
  const note = (key: string, what: string, feature = false) => {
    if (seenFirst.has(key)) return;
    seenFirst.add(key);
    unlockLog.push({ t: s.meta.totalSeconds, run, what, ...(feature ? { feature } : {}) });
  };
  for (const e of s.events) {
    if (e.seq <= unlockSeq) continue;
    switch (e.kind) {
      case 'featureUnlocked': note(`f:${e.id}`, `feature ${e.id}`, true); break;
      case 'sectorOpened': note(`s:${e.sector}`, `Industry ${e.sector}`); break;
      case 'appAvailable': case 'appFounded': note(`a:${e.id}`, `application ${e.id}`); break;
      case 'dispatchArrived': {
        note('dispatch', `first dispatch ${e.id}`);
        const cast = C.dispatches?.find((x) => x.id === e.id)?.cast;
        if (cast) note(`cast:${cast}`, `first letter from ${cast}`);
        break;
      }
      case 'historyChosen': note('history', `first History ${e.id}`); break;
      case 'reveal': note('reveal', 'the reveal'); break;
      case 'returnPublished': note('proprietor', "the Proprietor's Day"); break;
      case 'ending': note('ending', 'the ending'); break;
      case 'seamSunk': note('seam', 'first seam'); break;
      /* M4: Fishing's firsts and the capstone */
      case 'crisis': if (e.sector && C.sectors[e.sector]?.resourceKind === 'renewable') note(`poor:${e.sector}`, `first poor season ${e.sector}`); break;
      case 'thresholdCrossed': note(`banks:${e.sector}`, `banks fail ${e.sector}`); break;
      case 'surveyed': note(`survey:${e.sector}`, e.first ? `the Board's Survey ${e.sector}` : `first survey ${e.sector}`); break;
      case 'scarHealed': note(`scar:${e.sector}`, `scar healed ${e.sector}`); break;
      case 'capstoned': note('capstone', 'the capstone'); break;
      default: break;
    }
  }
  unlockSeq = Math.max(unlockSeq, s.meta.eventSeq);
}
function printUnlocks(): void {
  if (!UNLOCKS) return;
  console.log(`unlocks (cumulative active minutes · run · what):`);
  for (const u of unlockLog) console.log(`  ${(u.t / 60).toFixed(1).padStart(7)} · run ${u.run} · ${u.what}`);
  const upTo = (h: number) => unlockLog.filter((u) => u.t <= h * 3600).map((u) => u.t);
  const ts = [0, ...upTo(20)];
  let gap = 0, at = 0;
  for (let i = 1; i < ts.length; i++) if (ts[i] - ts[i - 1] > gap) { gap = ts[i] - ts[i - 1]; at = ts[i - 1]; }
  const fs = unlockLog.filter((u) => u.feature && u.t <= 36000).map((u) => u.t);
  let small = Infinity;
  for (let i = 1; i < fs.length; i++) small = Math.min(small, fs[i] - fs[i - 1]);
  console.log(`unlocks: longest gap between firsts to hour 20: ${(gap / 60).toFixed(1)} min (from ${(at / 60).toFixed(1)}); smallest gap between two feature unlocks to hour 10: ${Number.isFinite(small) ? `${(small / 60).toFixed(1)} min` : '-'}`);
  // M4: new things per run (features and Industry openings) and the smallest gap between two of them
  const news = unlockLog.filter((u) => u.feature || u.what.startsWith('Industry '));
  const byRun: Record<number, number> = {};
  for (const u of news) byRun[u.run] = (byRun[u.run] ?? 0) + 1;
  let sm = Infinity;
  for (let i = 1; i < news.length; i++) sm = Math.min(sm, news[i].t - news[i - 1].t);
  console.log(`unlocks: new things per run (features + Industry openings) ${Object.entries(byRun).map(([r, k]) => `#${r} ${k}`).join(' ') || '-'}; smallest gap ${Number.isFinite(sm) ? `${(sm / 60).toFixed(1)} min` : '-'}`);
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
    reserveFraction: number; pressureFraction: number; openedMin: number | null; clearFraction: number | null; clearYears: number;
  }>;
  steadyYearsAll: number; won: boolean; slots: number; loadout: string[]; peakWellbeing: number; yearsAtTarget: number;
  sectorsOpen: SectorId[];
  /** player purchases and foundings in the run */
  purchases: number;
  /** what the player and the standing orders bought or founded in the first five minutes (ids, in order) */
  opening5: { player: string[]; market: string[] };
  /** M2 */
  m2: {
    firstDecadeMin: number | null; firstDecadeLean: boolean | null; firstClearMin: number | null; steadyMin: number | null;
    settlements: number; settledAtEnd: number; defenceShare: number; forcedUnsettles: number; commonsLevels: number; marketBuys: number; charter: string | null;
    leanDecades: number; fullDecades: number; decisions: number; automated: number;
    decisionsByDecade: number[]; automatedByDecade: number[]; decisionTimes: number[];
    gaps: { hour1: number; run: number };
    offline: { at: number; heldBy: string | null; heldSector?: string; simulated: number; pending: boolean; decades?: number; dH?: number; W?: number; forgone?: number }[];
  };
  /** M3 (content with M3 data only) */
  m3?: {
    seams: Record<SectorId, number>; loadFactor: Record<SectorId, number>; speed: Record<SectorId, number>; sprawl: Record<SectorId, number>;
    answered: number; defaulted: number; history: string | null; historyClearedMin: number | null; endingHour: number | null; mandateEnd: number;
    wy: Record<string, number>;
    /** M3 finish: each Industry's player income this run (Σ SectorDerived.income × dt, £), and when each opened (s) */
    inc: Record<string, number>;
    /** M3 finish: the highest gross Mandate rate of the run (per second, sampled each minute). */
    peakGross: number;
  };
}

function sampleRow(s: GameState, open: SectorId[], extra: boolean): string {
  const d = model.derive(s, C);
  let row = `${min(s.time)} ${pad(String(Math.floor(d.year)), 5)} ${pad(n(s.capital), 7)} ${pad(n(d.incomePerSec), 6)} ${pad(n(d.wellbeing), 5)} ${pad(n(s.mandate), 6)} ${pad(n(s.population), 5)}`;
  for (const e of open) {
    const x = d.sectors[e];
    if (!x) { row += ` │ ${'·'.padStart(extra ? 52 : 22)}`; continue; }
    row += ` │ ${pad(n(x.etaFold), 5)} ${pad(n(x.rFold), 5)} ${pad(pct(x.reserveFraction), 4)} ${pad(pct(x.pressureFraction), 4)}`;
    if (x.load) row += ` LF${x.load.factor.toFixed(2)} c${n(x.load.capCostEff)} p${n(x.servicePrice)}`;
    if (x.travel) row += ` v${x.travel.speed.toFixed(2)} h${x.travel.hoursPerHead.toFixed(2)}`;
    // --sky: smoke over its clear level, the clear streak (years) and S when settled
    if (SKY) row += x.settled ? ' SETTLED' : ` P/clr ${x.clearP ? (s.sectors[e].pressure / x.clearP).toFixed(2) : '-'} cy${Math.floor(s.sectors[e].clearYears ?? 0)}`;
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
  M4R = { endingHour: null, arrears: 0, minStock: {}, surveyedMin: {}, crossed: {}, capDefence: 0, capDefenceN: 0, accounts: {} };
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
  const holdMemo: { since: number | null; steady: number } = { since: null, steady: 0 };
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
  /** each Industry's own wellbeing-years this run (Σ W_s dt): its contribution to the main Hindsight term (--ignore) */
  const wy: Record<string, number> = {};
  const inc: Record<string, number> = {};
  let peakGross = 0;
  const restraint = mode === 'budget' || mode === 'levers' || mode === 'market' || mode === 'human' || mode === 'crisisFarm';
  let firstDecadeLean: boolean | null = null;
  let settlements = 0;
  let marketBuys = 0;
  let defenceShare = 0;
  let forcedUnsettles = 0;
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
    if (s.time >= capT && !(ENDING && restraint && s.time < ENDING_HOURS * 3600 && pursuing(s))) { stopReason = s.flags.won && s.time > capT + 1 ? 'the ending reached, past the time cap' : `time cap ${s.time >= ENDING_HOURS * 3600 ? ENDING_HOURS : HOURS} h`; break; }
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
      } else if (mode === 'crisisFarm') {
        // boom (for the crises' Mandate) until every open Industry has fired its crises, then restrain as `budget`
        const d0 = model.derive(s, C);
        const farming = ORDER.some((e) => d0.sectors[e] && !d0.sectors[e]!.settled && d0.sectors[e]!.nextCrisisFraction !== null);
        if (farming) { s = buyUpgrades(s, ctx); s = foundApps(s, ctx); }
        else { s = buyUpgrades(s, ctx, s.flags.revealed ? [] : coalQ); s = foundApps(s, ctx, budgetFoundOk(s)); if (tick5) s = holdTheLine(s, ctx, memo); }
      } else if (mode === 'human') {
        // with the Market on (run 2 onwards), the routine cards are left to it; the player founds and chooses
        if (model.derive(s, C).orders.market.available && s.meta.orders.market.on) s = marketPlayer(s, ctx, seenApps);
        else { s = buyUpgrades(s, ctx, s.flags.revealed ? [] : coalQ); s = foundApps(s, ctx); }
        if (tick5) s = humanStep(s, ctx, memo);
      } else {
        s = buyUpgrades(s, ctx);
        s = foundApps(s, ctx);
        if (mode === 'levers' && tick5) s = raiseLevers(s, ctx);
        if (mode === 'peakdraw' && tick5 && s.flags.revealed) {
          for (const e of ORDER) {
            const x = model.derive(s, C).sectors[e];
            if (!x) continue;
            const b = s.sectors[e].budget;
            if (!b || x.resourceUse > b.r0 * 1.02) s = model.drawBudget(s, C, e, PACE);
          }
        }
      }
      s = m3Actions(s, ctx, mode, tick5);
      if (M4C && tick5 && mode !== 'idle') s = m4Actions(s, ctx, restraint);
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
    if (M3C) {
      for (const e of s.events) {
        if (e.seq <= prev.meta.eventSeq) continue;
        if (e.kind === 'historyCleared') ctx.firsts.historyCleared ??= s.time;
        else if (e.kind === 'ending') ctx.firsts.ending ??= s.meta.totalSeconds;
      }
      scanUnlocks(s);
    }
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
        if ((globalThis as any).process?.env?.FEAT_DEBUG && b.budget?.clearAt !== undefined && a.budget?.clearAt === undefined) {
          const f = C.features?.steadyState;
          if (f) console.log(`  [debug] clear ${e} at ${min(s.time)}: steadyState due ${evalCond(s, C, f.when)}, parts ${JSON.stringify((f.when as any).all.map((c: any) => evalCond(s, C, c)))}, clear steam ${evalCond(s, C, { stat: 'clear', sector: 'steam', op: '>=', value: 1 })} W ${model.derive(s, C).wellbeing.toFixed(1)}`);
        }
        if (s.run.steadySectors[e] && !prev.run.steadySectors[e]) { ctx.firsts.firstSteady ??= s.time; ev.push({ t: s.time, text: `STEADY STATE ${e}` }); }
        if (b.settled && !a.settled) ctx.firsts.firstSettle ??= s.time;
        if (!b.settled && a.settled) ev.push({ t: s.time, text: `     ${e} unsettled (defence lapsed)` });
        if (a.steadyYears >= 10 && b.steadyYears === 0) ev.push({ t: s.time, text: `     ${e} breaks its budget after ${n(a.steadyYears)} years` });
      }
      if (b.backfired && !a?.backfired) ev.push({ t: s.time, text: `     ${e} backfires (direct rebound > 100%)` });
    }
    for (const k of Object.keys(s.meta.features ?? {})) {
      if (prev.meta.features?.[k as keyof typeof prev.meta.features] === undefined) { ctx.firsts[`feature:${k}`] ??= s.time; ev.push({ t: s.time, text: `FEATURE ${k}` }); }
    }
    if (revealT === null && s.flags.revealed) {
      revealT = prev.flags.revealed ? prev.time : s.time;
      click.atReveal = clickRatio(s);
      ev.push({ t: s.time, text: 'REVEAL' });
      const d = model.derive(s, C);
      for (const e of ORDER) if (d.sectors[e]) reboundAtReveal[e] = d.sectors[e]!.rebound;
    }
    if (click.atCondenser === null && (s.upgrades['steam.condenser'] ?? 0) > 0) click.atCondenser = clickRatio(s);
    if (!prev.flags.won && s.flags.won) ev.push({ t: s.time, text: 'WON: every Industry settled, held for the ending years' });
    for (const l of C.levers) {
      const la = prev.levers[l.id]?.level ?? 0, lb = s.levers[l.id]?.level ?? 0;
      if (lb < la) ev.push({ t: s.time, text: `     lever ${l.id} lapses to L${lb}` });
    }
    const d = model.derive(s, C);
    for (const e of ORDER) if (d.sectors[e]) { wy[e] = (wy[e] ?? 0) + d.sectors[e]!.wellbeingShare * DT * YEARS_PER_SECOND; inc[e] = (inc[e] ?? 0) + d.sectors[e]!.income * DT; }
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
    if (Math.floor(s.time / 60) > Math.floor(prev.time / 60)) {
      // M3 finish: the gross Mandate rate (net + lever upkeep + defences), the economy settlements are held from
      const up = model.leverViews(s, C).reduce((a, l) => a + Math.max(0, l.upkeep), 0) + ORDER.reduce((a, e) => a + (d.sectors[e]?.settleDefence ?? 0), 0);
      peakGross = Math.max(peakGross, d.mandatePerSec + up);
    }
    if (SETTLE && Math.floor(s.time / 10) > Math.floor(prev.time / 10)) {
      const def = ORDER.reduce((a, e) => a + (d.sectors[e]?.settleDefence ?? 0), 0);
      if (def > 0) {
        const up = model.leverViews(s, C).reduce((a, l) => a + Math.max(0, l.upkeep), 0);
        const gross = d.mandatePerSec + up + def;
        if (gross > 0) defenceShare = Math.max(defenceShare, def / gross);
      }
    }
    for (const e of s.events) if (e.seq > prev.meta.eventSeq && e.kind === 'unsettled' && e.by === 'default') forcedUnsettles++;
    if (OFFLINE_CHECK && Math.floor(s.time / 600) > Math.floor(prev.time / 600)) {
      if ((globalThis as any).process?.env?.AWAY10) {
        const g = model.fastForward(s, C, 600);
        const L = g.lastOffline!.lines;
        console.log(`  [away 10 min at ${min(s.time)}] lines ${JSON.stringify(L)} lapsed ${g.lastOffline!.lapsed.join(',') || '-'} mandate ${n(s.mandate)}→${n(g.mandate)} net/s ${n(model.derive(s, C).mandatePerSec)}`);
      }
      const f = model.fastForward(s, C, 8 * 3600);
      const r = f.lastOffline!;
      const pending = !!model.derive(f, C).pendingReckoning;
      offline.push({ at: s.time, heldBy: r.heldBy, ...(r.heldSector ? { heldSector: r.heldSector } : {}), simulated: r.simulated, pending, decades: r.decades, dH: r.hindsight ?? 0, W: model.derive(f, C).wellbeing, forgone: r.dividendsForgone ?? 0 });
      if (pending) { failures++; console.log(`  !! offline check at ${min(s.time)} min returned a pending Reckoning`); }
      check(f, `offline check run ${idx} t=${s.time}`);
    }
    // the budget player Reckons once the last ten minutes earned less than its average rate (and no streak is
    // about to pay a decade or a Steady State)
    if (fixedRun <= 0 && FIXED_RUN > 0 && idx >= 3 && s.time >= FIXED_RUN && !pend) { stopReason = `fixed ${min(FIXED_RUN).trim()} min`; break; }
    if (fixedRun > 0 && s.time >= fixedRun) { stopReason = `fixed ${min(fixedRun).trim()} min`; break; }
    if (fixedRun <= 0 && !(FIXED_RUN > 0 && idx >= 3) && (mode === 'budget' || mode === 'market' || mode === 'human') && Math.floor(s.time) % 10 === 0 && !(ENDING && pursuing(s))) {
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
      const streakingRaw = ORDER.some((e) => {
        const es = s.sectors[e], x = d.sectors[e];
        if (!es?.open || !x || s.run.steadySectors[e] || es.settled || x.clearP === null) return false;
        if (es.clearYears > 0) return false; // counted in `sure` below
        if (d.wellbeing < C.global.wellbeingTarget) return false;
        const old = pHist[0];
        const rate = old && s.time - old[0] >= 60 ? (old[1][e] - es.pressure) / (s.time - old[0]) : 0;
        return es.pressure <= x.clearP || (rate > 0 && (es.pressure - x.clearP) / rate <= HOLD_FOR);
      });
      // patience runs out: no wait for a Steady State lasts longer than 1.5 × --hold-for without one arriving
      const steadyNow = Object.values(s.run.steadySectors).filter(Boolean).length;
      if (!streakingRaw || steadyNow > holdMemo.steady) holdMemo.since = streakingRaw ? s.time : null;
      holdMemo.steady = steadyNow;
      if (streakingRaw) holdMemo.since ??= s.time;
      // a clear streak already running (Steady State within 50 model years unless it breaks) always holds
      const sure = ORDER.some((e) => !s.run.steadySectors[e] && !s.sectors[e]?.settled && (s.sectors[e]?.clearYears ?? 0) > 0);
      const streaking = sure || (streakingRaw && s.time - (holdMemo.since ?? s.time) <= 1.5 * HOLD_FOR);
      // a competent player does not Reckon while an industry it is entitled to is still opening this run
      const opening = s.time < MAX_OPEN && d.nextSectors.some((x) => x.reckoningsHave >= x.reckoningsNeeded);
      if (s.time >= MIN_RUN && marginal < 0.9 * avg && !streaking && !opening) { stopReason = `marginal rate ${n(marginal)} below average ${n(avg)}`; break; }
      // progression: the next industry waits only on another Reckoning, so bank the run (once no streak is running)
      const gated = d.nextSectors.some((x) => x.reckoningsHave < x.reckoningsNeeded && x.checklist.every((c) => c.met));
      // (once this run has paid a Steady State, the next industry outranks waiting for another)
      if (s.time >= PROGRESS_AT && gated && (!streaking || steadyNow > 0) && !opening) { stopReason = 'the next industry waits on a Reckoning'; break; }
      // the human player calls the Reckoning once the next Industry waits on one and nothing has been decided for 150 s
      // (it does not sit through a dead stretch at the end of a run; QA's late run 1)
      if (mode === 'human' && s.time >= MIN_RUN && gated && !streaking && !opening && s.time - (decisionTimes[decisionTimes.length - 1] ?? 0) >= 150) { stopReason = 'nothing left to decide'; break; }
      const budgeted = ORDER.filter((e) => s.sectors[e]?.budget || s.sectors[e]?.settled);
      if (s.time >= MAX_RUN && !opening && budgeted.length && budgeted.every((e) => s.run.steadySectors[e] || s.sectors[e]?.settled)) { stopReason = `every line steady after ${min(MAX_RUN).trim()} min`; break; }
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
      clearFraction: x.clearP !== null ? x.clearP / C.sectors[e].collapseAt : null, clearYears: es.clearYears,
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
    opening5: {
      player: (s.run.opening ?? []).filter((a) => a.t <= 300 && a.by === 'player').map((a) => a.id.split('.')[1]),
      market: (s.run.opening ?? []).filter((a) => a.t <= 300 && a.by !== 'player').map((a) => a.id.split('.')[1]),
    },
    m2: {
      firstDecadeMin: ctx.firsts.firstDecade !== undefined ? ctx.firsts.firstDecade / 60 : null, firstDecadeLean,
      firstClearMin: ctx.firsts.firstClear !== undefined ? ctx.firsts.firstClear / 60 : null,
      steadyMin: ctx.firsts.firstSteady !== undefined ? ctx.firsts.firstSteady / 60 : null,
      settlements, settledAtEnd: ORDER.filter((e) => s.sectors[e]?.settled).length, defenceShare, forcedUnsettles,
      commonsLevels: Object.values(s.commons.levels).reduce((a, b) => a + b, 0),
      marketBuys,
      charter: s.meta.charter, leanDecades: s.run.leanDecades, fullDecades: s.run.budgetDecades - s.run.leanDecades,
      decisions: s.run.decisions, automated: s.run.automated,
      decisionsByDecade: s.run.decisionsByDecade, automatedByDecade: s.run.automatedByDecade, decisionTimes,
      gaps: { hour1: gapIn(decisionTimes, 0, Math.min(3600, s.time)), run: gapIn(decisionTimes, 0, s.time) },
      offline,
    },
    ...(M3C ? { m3: {
      seams: Object.fromEntries(ORDER.filter((e) => C.sectors[e].seams?.length && s.sectors[e]?.open).map((e) => [e, s.sectors[e].seamsSunk])),
      loadFactor: Object.fromEntries(ORDER.filter((e) => d.sectors[e]?.load).map((e) => [e, d.sectors[e]!.load!.factor])),
      speed: Object.fromEntries(ORDER.filter((e) => d.sectors[e]?.travel).map((e) => [e, d.sectors[e]!.travel!.speed])),
      sprawl: Object.fromEntries(ORDER.filter((e) => d.sectors[e]?.travel).map((e) => [e, d.sectors[e]!.travel!.sprawl])),
      answered: s.run.dispatchesAnswered, defaulted: s.run.dispatchesDefaulted, history: s.meta.history,
      historyClearedMin: ctx.firsts.historyCleared !== undefined ? ctx.firsts.historyCleared / 60 : null,
      endingHour: ctx.firsts.ending !== undefined ? ctx.firsts.ending / 3600 : null, mandateEnd: s.mandate, wy, inc, peakGross,
    } } : {}),
  };
  if (COMMONS && SUMMARY) {
    const share: Record<string, number> = {};
    for (const v of model.commonsViews(s, C)) if (v.def.intensity && v.intensityNow > 0) share[v.def.intensity.sector] = (share[v.def.intensity.sector] ?? 0) + v.intensityNow;
    const parts = Object.entries(share).map(([e, x]) => `${e} ${((x / Math.max(1e-9, (d.sectors[e]?.demand ?? 0) - x)) * 100).toFixed(1)}%`);
    console.log(`${mode} #${idx} Commons at the end: wellbeing ${n(d.commons.wellbeing)}, intensity (extra demand over the rest) ${parts.join(', ') || '-'}; levels ${JSON.stringify(s.commons.levels)}`);
  }
  const xRun = (o: { dH?: number }) => (terms.total > 0 ? (o.dH ?? 0) / terms.total : 0);
  if (OFFLINE_CHECK && SUMMARY) {
    const rate = C.global.offline?.hindsightRate ?? 1;
    console.log(`${mode} #${idx} offline checks (8 h; Hindsight away at ${rate} of the rate, ×run = multiple of this run's ${terms.total} H): ${offline.map((o) => `${min(o.at).trim()}m ${o.heldBy ?? 'none'}${o.heldSector ? `(${o.heldSector})` : ''} ${(o.simulated / 3600).toFixed(2)} h${o.pending ? ' PENDING!' : ''} (+${o.decades} dec, +${o.dH?.toFixed(0)} H = ${xRun(o).toFixed(2)}×run, ${o.forgone} forgone, W ${o.W?.toFixed(0)})`).join(' · ') || '-'}`);
    if (offline.length) console.log(`${mode} #${idx} offline Hindsight: max ${Math.max(...offline.map(xRun)).toFixed(2)}× this run's active Hindsight`);
  }
  if (OFFLINE_CHECK) log(`  offline checks (8 h): ${offline.map((o) => `${min(o.at).trim()}m ${o.heldBy ?? 'none'}${o.heldSector ? `(${o.heldSector})` : ''} ${n(o.simulated / 3600)} h${o.pending ? ' PENDING!' : ''} +${(o.dH ?? 0).toFixed(0)} H (${xRun(o).toFixed(2)}×run)`).join(' · ') || '-'}`);
  if (DECISIONS) log(`  decisions: ${s.run.decisions} (per model decade ${n(mean(s.run.decisionsByDecade))}), automated ${s.run.automated} (${n(mean(s.run.automatedByDecade))}); longest gap ${gapIn(decisionTimes, 0, Math.min(3600, s.time)).toFixed(0)} s in hour 1, ${gapIn(decisionTimes, 0, s.time).toFixed(0)} s in the run`);
  if (JSON_OUT) console.log(JSON.stringify(report));
  return { s, report };
}

/* ---------------- main ---------------- */

interface CampaignOpts { seed?: number; chooseCharter?: (s: GameState) => string | null; quietSummary?: boolean }
function campaign(mode: Strategy, nRuns: number, skip?: Set<string>, arms?: string[], opts: CampaignOpts = {}): RunReport[] {
  let s = model.createState(C, undefined, opts.seed ?? SEED);
  // --from=<file> (balance experiments): start from a serialize()d state (e.g. written by --dump-at); the run numbers
  // and the cumulative hours start from that save
  if (FROM) { const t = model.deserialize(readFileSync(FROM, 'utf8'), C); if (!t) { console.error(`--from: unusable save ${FROM}`); process.exit(2); } s = t; }
  const base = FROM ? s.meta.totalSeconds : 0;
  const run0 = FROM ? s.meta.reckonings : 0;
  if (HISTORY && HISTORY_AT <= 0 && model.historyViews(s, C).find((v) => v.def.id === HISTORY)?.canChoose) s = model.chooseHistory(s, C, HISTORY);
  const reports: RunReport[] = [];
  let cum = 0;
  const cumDecisions: number[] = [];
  const total = TOTAL_HOURS > 0 ? TOTAL_HOURS * 3600 : Infinity;
  for (let i = run0 + 1; TOTAL_HOURS > 0 ? base + cum < total : i <= run0 + nRuns; i++) {
    if (DUMP_AT === i) { writeFileSync(DUMP_TO, model.serialize(s)); log(`  state at the start of run ${i} written to ${DUMP_TO}`); }
    const runMode: Strategy = mode === 'mixed' || mode === 'charter' ? (i <= 2 ? 'efficiency' : 'budget')
      : mode === 'market' ? (i === 1 ? 'efficiency' : 'market') : mode;
    const r = playRun(s, i, runMode, skip, arms);
    reports.push(r.report);
    if (JSON_OUT && M4C) console.log(JSON.stringify({ m4run: i, ...M4R })); // M4 balance: the run's M4 records (an.py)
    for (const t of r.report.m2.decisionTimes) cumDecisions.push(cum + t);
    cum += r.report.seconds;
    if (SUMMARY && !opts.quietSummary) {
      const R = r.report, f = R.firsts, M = R.m2;
      const t = (k: string) => (f[k] !== undefined ? f[k].toFixed(1) : '-');
      const T = R.terms;
      console.log(`${mode} #${i} cum ${((base + cum) / 3600).toFixed(2)} h · ${(R.seconds / 60).toFixed(1)} min ${R.cause}${R.causeSector ? `(${R.causeSector})` : ''}` +
        ` · H ${R.hindsight} (${R.hindsightPerMin.toFixed(2)}/min) · open ${R.sectorsOpen.map((e) => `${e}@${R.sectors[e]?.openedMin?.toFixed(0) ?? '?'}`).join(',')}` +
        ` · reveal ${t('buy:steam.coalQuestion')} cond ${t('buy:steam.condenser')} crisis ${R.firstCrisisMin?.toFixed(1) ?? '-'} lever ${t('firstLever')}` +
        ` · dec ${M.firstDecadeMin?.toFixed(1) ?? '-'}${M.firstDecadeLean === null ? '' : M.firstDecadeLean ? ' lean' : ' full'} clear ${M.firstClearMin?.toFixed(1) ?? '-'} steady ${M.steadyMin?.toFixed(1) ?? '-'}` +
        ` · Wpk ${R.peakWellbeing.toFixed(1)} yAt ${R.yearsAtTarget.toFixed(0)} · dec ${Object.values(R.sectors).map((x) => x.decades).join('/')} lean ${M.leanDecades} full ${M.fullDecades}` +
        ` · settled ${M.settlements}/${M.settledAtEnd}${SETTLE ? ` (defence ≤ ${(M.defenceShare * 100).toFixed(0)}% of Mandate, forced unsettles ${M.forcedUnsettles})` : ''} commons ${M.commonsLevels} buys player ${R.purchases} market ${M.marketBuys}${f.firstMarket !== undefined ? ` (first ${f.firstMarket.toFixed(1)})` : ''} charter ${M.charter ?? '-'}` +
        ` · terms W ${T.wellbeing.toFixed(0)} B ${T.budget.toFixed(0)} U ${T.unburnt.toFixed(0)} F ${T.backfire.toFixed(0)} S ${T.sectorsReached.toFixed(0)} St ${T.steady.toFixed(0)} Se ${(T.settled ?? 0).toFixed(0)}` +
        ` · features ${Object.entries(f).filter(([k]) => k.startsWith('feature:')).map(([k, v]) => `${k.slice(8)}@${v.toFixed(1)}`).join(',') || '-'}` +
        (mode === 'human' ? ` · first 5 min: player ${R.opening5.player.join(' ')} | market ${R.opening5.market.join(' ')}` : '') +
        (R.m3 ? ` · m3 seams ${Object.entries(R.m3.seams).map(([e, v]) => `${e}:${v}`).join(',') || '-'} LF ${Object.entries(R.m3.loadFactor).map(([e, v]) => `${e}:${v.toFixed(2)}`).join(',') || '-'}` +
          ` speed ${Object.entries(R.m3.speed).map(([e, v]) => `${e}:${v.toFixed(2)}`).join(',') || '-'} sprawl ${Object.entries(R.m3.sprawl).map(([e, v]) => `${e}:${n(v)}`).join(',') || '-'}` +
          ` disp ${R.m3.answered}/${R.m3.defaulted} hist ${R.m3.history ?? '-'}${R.m3.history ? ` ${R.m3.historyClearedMin !== null ? `cleared@${R.m3.historyClearedMin.toFixed(1)}` : 'not cleared'}` : ''}` +
          ` ending ${R.m3.endingHour !== null ? `${R.m3.endingHour.toFixed(2)} h` : '-'} mandate ${n(R.m3.mandateEnd)} gross/s ${R.m3.peakGross.toFixed(1)}` +
          ` Wy ${Object.entries(R.m3.wy).map(([e, v]) => `${e}:${v.toFixed(0)}`).join(',')}` : '') +
        (M4C ? ` · m4 ending ${M4R.endingHour !== null ? `${M4R.endingHour.toFixed(2)} h` : '-'} capstone defence ${M4R.capDefenceN ? `${(100 * M4R.capDefence / M4R.capDefenceN).toFixed(0)}%` : '-'} arrears ${M4R.arrears.toFixed(0)} s` +
          ` stock ${Object.entries(M4R.minStock).map(([e, v]) => `${e}:min ${v.toFixed(2)}${M4R.crossed[e] ? ' crossed' : ''}${M4R.surveyedMin[e] !== undefined ? ` surveyed@${M4R.surveyedMin[e].toFixed(1)}` : ''}`).join(',') || '-'}` +
          ` account ${Object.entries(M4R.accounts).map(([e, v]) => `${e}:${v}`).join(',') || '-'}` : '') +
        (DECISIONS ? ` · decisions ${M.decisions} (${mean(M.decisionsByDecade).toFixed(1)}/dec) auto ${M.automated} (${mean(M.automatedByDecade).toFixed(1)}/dec) gap h1 ${M.gaps.hour1.toFixed(0)} s run ${M.gaps.run.toFixed(0)} s` : ''));
    }
    s = model.reckon(r.s, C);
    if (mode !== 'idle') {
      const sp = spendHindsight(s, mode === 'mixed' || mode === 'charter' || mode === 'crisisFarm' ? 'budget' : mode === 'market' ? 'efficiency' : mode === 'human' ? 'levers' : mode);
      s = boardSeat(sp.s);
      if (sp.bought.length) log(`  spent Hindsight on: ${sp.bought.join(', ')} (left ${n(s.meta.hindsight)}); loadout ${s.meta.loadout.join(', ') || '—'}`);
    }
    if (HISTORY && s.meta.reckonings >= HISTORY_AT) {
      const h = model.historyViews(s, C).find((v) => v.def.id === HISTORY);
      if (h?.canChoose) { s = model.chooseHistory(s, C, HISTORY); log(`  history: ${HISTORY}`); }
    }
    if (M3C) scanUnlocks(s);
    if (opts.chooseCharter && s.charterOffer.length) {
      const id = opts.chooseCharter(s);
      if (id !== null) { s = model.chooseCharter(s, C, id); log(`  charter: ${id} (offered ${s.charterOffer.join(', ')})`); }
    }
  }
  if (DUMP_AT === run0 + reports.length + 1) { writeFileSync(DUMP_TO, model.serialize(s)); log(`  state at the start of run ${DUMP_AT} written to ${DUMP_TO}`); }
  const nDone = reports.length;
  log(`\n${nDone} run(s) done. total Hindsight earned ${n(s.meta.hindsightEarned)}; sectors opened ${Object.keys(s.meta.sectorsOpened).join(', ')}; achievements: ${Object.keys(s.meta.achievements).join(', ') || '—'}`);
  log('  Hindsight per minute by run: ' + reports.map((r) => `#${r.run} ${n(r.hindsightPerMin)} (${r.hindsight} in ${(r.seconds / 60).toFixed(1)} min)`).join(' · '));
  if (SUMMARY && !opts.quietSummary) {
    console.log(`${mode}: Hindsight/min by run ${reports.map((r) => r.hindsightPerMin.toFixed(2)).join(' ')}`);
    const totH = reports.reduce((a, r) => a + r.hindsight, 0), totM = reports.reduce((a, r) => a + r.seconds / 60, 0);
    const wyAll: Record<string, number> = {};
    for (const r of reports) for (const [e, v] of Object.entries(r.m3?.wy ?? {})) wyAll[e] = (wyAll[e] ?? 0) + v;
    console.log(`${mode}: total ${totH} H in ${totM.toFixed(1)} min (${(totH / Math.max(1e-9, totM)).toFixed(2)}/min); each Industry's wellbeing-years ${Object.entries(wyAll).map(([e, v]) => `${e} ${v.toFixed(0)}`).join(', ') || '-'}`);
    // M3 finish (the temptation audit): each Industry's income summed over the campaign, and when it first opened
    const incAll: Record<string, number> = {};
    for (const r of reports) for (const [e, v] of Object.entries(r.m3?.inc ?? {})) incAll[e] = (incAll[e] ?? 0) + v;
    let cumO = 0;
    const openH: Record<string, number> = {};
    for (const r of reports) { for (const e of ORDER) if (r.sectors[e]?.openedMin != null && openH[e] === undefined) openH[e] = (cumO + r.sectors[e]!.openedMin! * 60) / 3600; cumO += r.seconds; }
    console.log(`${mode}: each Industry's income £ ${Object.entries(incAll).map(([e, v]) => `${e} ${n(v)}`).join(', ') || '-'}; first opened (h) ${Object.entries(openH).map(([e, v]) => `${e} ${v.toFixed(3)}`).join(', ')}`);
  }
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

/**
 * The `charter` strategy: each Charter in force for one run against the same history, in two settings, and Hindsight per
 * minute in each: (A) run 2 played as `efficiency` after an `efficiency` run 1, (B) run 3 played as `budget` for a fixed
 * 60 minutes after `mixed`'s runs 1–2 (Hindsight spent as the budget player spends it; a fixed length, because the budget
 * player's own Reckon rule makes run 3 either about 45 minutes or about two hours, and that, not the Charter, would
 * decide its Hindsight per minute). The Charter is only ever chosen from what the core
 * offers: the end state of the previous run is Reckoned with seeds 1, 2, 3… (at most 4000; the seed changes nothing but
 * the draw) until reckon()'s offer contains it. A Charter whose `requires` fails in a setting is not offered there
 * (The Gaslit Borough needs Light opened in some run: setting B only). Deviation is from each setting's mean.
 */
/** A fixed run length (seconds) for audits that compare like with like; 0 = the strategies' own Reckon rules. */
let fixedRun = 0;
function charterAudit(): void {
  const ids = (C.charters ?? []).map((c) => c.id);
  if (!ids.length) { console.log('charter: no Charters in this content'); return; }
  // the shared histories
  const r1 = playRun(model.createState(C, undefined, SEED), 1, 'efficiency').s;
  let m2s = spendHindsight(model.reckon(r1, C), 'budget').s;
  const r2 = playRun(m2s, 2, 'efficiency').s;
  m2s = r2;
  const settings: { name: string; end: GameState; mode: Strategy; run: number }[] = [
    { name: 'A run 2 efficiency', end: r1, mode: 'efficiency', run: 2 },
    { name: 'B run 3 budget', end: m2s, mode: 'budget', run: 3 },
  ];
  const rows: Record<string, (number | null)[]> = {};
  for (const id of ids) rows[id] = [];
  const means: number[] = [];
  const mins: Record<string, number[]> = {};
  for (const st of settings) {
    const vals: number[] = [];
    for (const id of ids) {
      let next: GameState | null = null;
      for (let k = 1; k <= 4000 && next === null; k++) {
        const r = model.reckon({ ...st.end, seed: k }, C);
        if (r.charterOffer.includes(id)) next = r;
      }
      if (next === null) { rows[id].push(null); continue; }
      let s = spendHindsight(next, st.mode === 'efficiency' ? 'efficiency' : 'budget').s;
      s = model.chooseCharter(s, C, id);
      if (s.meta.charter !== id) { rows[id].push(null); continue; }
      fixedRun = st.mode === 'budget' ? 3600 : 0;
      const rep = playRun(s, st.run, st.mode).report;
      fixedRun = 0;
      rows[id].push(rep.hindsightPerMin);
      vals.push(rep.hindsightPerMin);
      mins[id] = [...(mins[id] ?? []), rep.seconds / 60];
    }
    means.push(mean(vals));
  }
  const out = ids.map((id) => ({ id, hpm: rows[id], deviation: rows[id].map((v, i) => (v === null ? null : v / means[i] - 1)) }));
  if (JSON_OUT) console.log(JSON.stringify({ strategy: 'charter', settings: settings.map((x) => x.name), means, results: out }));
  else {
    console.log(`\ncharter audit (Hindsight per minute with each Charter in force; target ±15% of each setting's mean):`);
    console.log(`  ${''.padEnd(26)} ${settings.map((x, i) => `${x.name} (mean ${n(means[i])})`.padEnd(34)).join('')}`);
    for (const r of out) {
      console.log(`  ${r.id.padEnd(26)} ${r.hpm.map((v, i) => (v === null ? 'not offered' : `${n(v)}  ${signedPct(r.deviation[i])}  (${(mins[r.id]?.[i - (r.hpm[0] === null ? 1 : 0)] ?? 0).toFixed(0)} min)`).padEnd(34)).join('')}`);
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
} else if (DISPATCH_AUDIT) {
  // M3: each arm of each dispatch forced (the rest at the policy), Hindsight per minute per arm (target ±10% of the mean)
  const rows: { id: string; arm: number; hpm: number; answered: number }[] = [];
  // --audit-slice=i:j (M3 finish): only letters i…j−1 of Content.dispatches, so the audit can run in pieces
  const [ai, aj] = flag('audit-slice', '').split(':').map((x) => parseInt(x, 10));
  for (const d of (C.dispatches ?? []).slice(Number.isFinite(ai) ? ai : 0, Number.isFinite(aj) ? aj : undefined)) {
    for (let a = 0; a < d.arms.length; a++) {
      ARM_OVERRIDE = { id: d.id, arm: a };
      const reps = campaign(strategy, runs, undefined, undefined, { quietSummary: true });
      const h = reps.reduce((x, r) => x + r.hindsight, 0), m = reps.reduce((x, r) => x + r.seconds / 60, 0);
      rows.push({ id: d.id, arm: a, hpm: m > 0 ? h / m : 0, answered: reps.reduce((x, r) => x + (r.m3?.answered ?? 0), 0) });
    }
  }
  ARM_OVERRIDE = null;
  const meanH = rows.reduce((x, r) => x + r.hpm, 0) / Math.max(1, rows.length);
  if (JSON_OUT) console.log(JSON.stringify({ strategy, dispatchAudit: rows, mean: meanH }));
  else {
    console.log(`dispatch audit (${strategy}, ${runs} run(s) each; Hindsight per minute; target ±10% of the mean ${meanH.toFixed(2)}):`);
    for (const r of rows) console.log(`  ${r.id.padEnd(24)} arm ${r.arm}  ${r.hpm.toFixed(2).padStart(7)}  ${signedPct(meanH > 0 ? r.hpm / meanH - 1 : null)}  (answered ${r.answered})`);
  }
} else {
  campaign(strategy, runs);
}
printUnlocks();
if (failures) {
  console.log(`!! ${failures} sanity failure(s)`);
  process.exit(1);
}
