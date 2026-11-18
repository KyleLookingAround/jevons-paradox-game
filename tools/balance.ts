/**
 * Headless balancer: plays whole runs of Rebound with a fixed strategy and prints what happened.
 *
 *   bun run tools/balance.ts [efficiency|levers|idle] [runs] [flags]
 *
 *   efficiency  buy the cheapest affordable upgrade, found every app when affordable, never touch levers;
 *               spend Hindsight on Know-how (cheapest first).
 *   levers      the same, plus raise the cheapest lever once revealed whenever Mandate allows and net Mandate
 *               stays positive; spend Hindsight on Institutions first, then Know-how.
 *   idle        buy nothing.
 *
 * Flags: --fixture (test fixture instead of src/content), --hours=3 (cap per run), --every=120 (series interval, s),
 *        --cps=0 (manual clicks per second), --seed=1, --no-series, --dt=1.
 * Runs are consecutive (the prestige loop). dt = 1 s.
 */
import { model } from '../src/model';
import { content as realContent } from '../src/content';
import { fixture } from '../src/fixture';
import { ERA_ORDER } from '../src/types';
import type { Content, EraId, GameState, UpgradeView } from '../src/types';

declare const process: { argv: string[]; exit(code?: number): never };

/* ---------------- arguments ---------------- */

const argv = process.argv.slice(2);
const flag = (name: string, dflt: string): string => {
  const a = argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  return a === undefined ? dflt : a.includes('=') ? a.slice(a.indexOf('=') + 1) : 'true';
};
const positional = argv.filter((a) => !a.startsWith('--'));
const strategy = (positional[0] ?? 'efficiency') as 'efficiency' | 'levers' | 'idle';
if (!['efficiency', 'levers', 'idle'].includes(strategy)) {
  console.error(`unknown strategy "${strategy}" (efficiency | levers | idle)`);
  process.exit(2);
}
const runs = Math.max(1, parseInt(positional[1] ?? '3', 10) || 3);
const useFixture = flag('fixture', 'false') === 'true' || !realContent?.eras?.steam;
const C: Content = useFixture ? fixture : realContent;
const HOURS = parseFloat(flag('hours', '3'));
const EVERY = parseFloat(flag('every', '120'));
const CPS = parseFloat(flag('cps', '0'));
const SEED = parseInt(flag('seed', '1'), 10);
const SERIES = flag('no-series', 'false') !== 'true';
const DT = parseFloat(flag('dt', '1'));

/* ---------------- formatting ---------------- */

const SI = ['', 'k', 'M', 'G', 'T', 'P'];
function n(x: number, digits = 3): string {
  if (x === null || x === undefined) return '-';
  if (!Number.isFinite(x)) return Number.isNaN(x) ? 'NaN' : x > 0 ? '∞' : '-∞';
  const a = Math.abs(x);
  if (a < 1e-3 && a > 0) return x.toExponential(1);
  let i = 0, v = x;
  while (Math.abs(v) >= 1000 && i < SI.length - 1) { v /= 1000; i++; }
  const s = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(digits > 2 ? 1 : 0) : v.toFixed(digits > 1 ? 2 : 1);
  return s + SI[i];
}
const pct = (x: number) => (Number.isFinite(x) ? `${(x * 100).toFixed(0)}%` : n(x));
const signedPct = (x: number | null) => (x === null ? '  -  ' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(0)}%`);
const min = (t: number) => (t / 60).toFixed(1).padStart(5);
const pad = (s: string, w: number) => s.padStart(w);

/* ---------------- sanity ---------------- */

function badNumbers(x: unknown, path = '', out: string[] = []): string[] {
  if (out.length > 5) return out;
  if (typeof x === 'number') {
    if (Number.isNaN(x) || (!Number.isFinite(x) && !/secondsLeft$|visibleBelow$|priceNeeded$|priceNow$/.test(path))) out.push(`${path}=${x}`);
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

/* ---------------- strategy ---------------- */

/** Upgrade views without the (expensive) projected line: cost/visibility do not depend on the reveal. */
const cheapViews = (s: GameState): UpgradeView[] => model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, C);

interface Ev { t: number; text: string }
interface EffBuy { era: EraId; t: number; id: string; promise: number; projected: number | null; rBefore: number; rAfter?: number; cumPromise: number }

function buyStuff(s: GameState, ev: Ev[], effBuys: EffBuy[]): GameState {
  // upgrades: cheapest affordable first, repeatedly
  for (let guard = 0; guard < 50; guard++) {
    const views = cheapViews(s).filter((v) => v.visible && !v.maxed && v.affordable).sort((a, b) => a.cost - b.cost);
    if (!views.length) break;
    const v = views[0];
    let projected: number | null = null;
    let rBefore = 0;
    if (v.def.kind === 'efficiency') {
      if (s.flags.revealed) projected = model.upgradeViews(s, C).find((u) => u.def.id === v.def.id)?.projectedChange ?? null;
      rBefore = model.derive(s, C).eras[v.def.era]?.rFold ?? 0;
    }
    const next = model.buyUpgrade(s, C, v.def.id);
    if (next === s) break;
    s = next;
    const lvl = s.upgrades[v.def.id];
    if (v.def.kind === 'efficiency') {
      const prev = effBuys.filter((b) => b.era === v.def.era);
      const cum = (1 + (prev.length ? prev[prev.length - 1].cumPromise : 0)) * (1 + (v.promisedChange ?? 0)) - 1;
      effBuys.push({ era: v.def.era, t: s.time, id: v.def.id, promise: v.promisedChange ?? 0, projected, rBefore, cumPromise: cum });
      ev.push({ t: s.time, text: `buy  ${v.def.id} £${n(v.cost)}  card ${signedPct(v.promisedChange)}${projected !== null ? `, projected ${signedPct(projected)}` : ''}  R× before ${n(rBefore)}` });
    } else {
      ev.push({ t: s.time, text: `buy  ${v.def.id}${lvl > 1 ? ` (L${lvl})` : ''} £${n(v.cost)} [${v.def.kind}]` });
    }
  }
  // applications
  for (const e of ERA_ORDER) {
    if (!s.eras[e]?.open) continue;
    for (const a of C.eras[e].applications) {
      const next = model.foundApp(s, C, a.id);
      if (next !== s) { s = next; ev.push({ t: s.time, text: `app  ${a.id} £${n(a.foundCost)}` }); }
    }
  }
  return s;
}

function raiseLevers(s: GameState, ev: Ev[]): GameState {
  if (!s.flags.revealed) return s;
  for (let guard = 0; guard < 10; guard++) {
    const net = model.derive(s, C).mandatePerSec;
    const cands = model.leverViews(s, C)
      .filter((l) => l.canRaise && l.nextCost !== null)
      .filter((l) => net - ((l.def.levels[l.level]?.mandateUpkeep ?? 0) - (l.level ? l.def.levels[l.level - 1].mandateUpkeep : 0)) > 0)
      .sort((a, b) => (a.nextCost ?? 0) - (b.nextCost ?? 0));
    if (!cands.length) break;
    const l = cands[0];
    const next = model.setLever(s, C, l.def.id, l.level + 1);
    if (next === s) break;
    s = next;
    ev.push({ t: s.time, text: `lever ${l.def.id} → L${l.level + 1} (${l.def.levels[l.level].label}) mandate ${n(l.nextCost ?? 0)}` });
  }
  return s;
}

function spendHindsight(s: GameState): { s: GameState; bought: string[] } {
  const bought: string[] = [];
  const instFirst = strategy === 'levers';
  for (let guard = 0; guard < 200; guard++) {
    const h = s.meta.hindsight;
    const inst = C.institutions
      .filter((i) => !s.meta.institutions[i.id] && (i.requires ?? []).every((r) => s.meta.institutions[r]) && i.cost <= h)
      .sort((a, b) => a.cost - b.cost);
    const kh = C.knowhow
      .map((k) => ({ k, lvl: s.meta.knowhow[k.id] ?? 0 }))
      .filter(({ k, lvl }) => lvl < k.maxLevel && k.cost * Math.pow(k.costGrowth, lvl) <= h)
      .sort((a, b) => a.k.cost * Math.pow(a.k.costGrowth, a.lvl) - b.k.cost * Math.pow(b.k.costGrowth, b.lvl));
    let next = s;
    if (instFirst && inst.length) next = model.buyInstitution(s, C, inst[0].id);
    else if (kh.length) next = model.buyKnowhow(s, C, kh[0].k.id);
    else if (instFirst && !inst.length) break;
    if (next === s) break;
    const diff = Object.keys(next.meta.institutions).find((k) => !s.meta.institutions[k])
      ?? Object.keys(next.meta.knowhow).find((k) => (next.meta.knowhow[k] ?? 0) !== (s.meta.knowhow[k] ?? 0));
    if (diff) bought.push(diff);
    s = next;
  }
  return { s, bought };
}

/* ---------------- one run ---------------- */

function sampleRow(s: GameState, openEras: EraId[]): string {
  const d = model.derive(s, C);
  let row = `${min(s.time)} ${pad(n(s.capital), 7)} ${pad(n(d.incomePerSec), 6)} ${pad(n(d.wellbeing), 5)} ${pad(n(s.mandate), 6)} ${pad(n(s.population), 5)}`;
  for (const e of openEras) {
    const x = d.eras[e];
    row += x
      ? ` │ ${pad(n(x.etaFold), 5)} ${pad(n(x.rFold), 5)} ${pad(pct(x.reserveFraction), 4)} ${pad(pct(x.pressureFraction), 4)}`
      : ` │ ${'·'.padStart(22)}`;
  }
  return row;
}

function playRun(start: GameState, idx: number): GameState {
  let s = start;
  const ev: Ev[] = [];
  const effBuys: EffBuy[] = [];
  const series: string[] = [];
  const peakRebound: Partial<Record<EraId, number>> = {};
  const capT = HOURS * 3600;
  let clickAcc = 0;
  const kh = Object.entries(s.meta.knowhow).filter(([, v]) => v).map(([k, v]) => `${k}×${v}`).join(' ');
  const inst = Object.keys(s.meta.institutions).filter((k) => s.meta.institutions[k]).join(' ');
  console.log(`\n=== Run ${idx} · ${strategy} · ${useFixture ? 'FIXTURE' : 'content'} · reckonings ${s.meta.reckonings} · hindsight left ${n(s.meta.hindsight)}`);
  if (kh || inst) console.log(`    know-how: ${kh || '—'}   institutions: ${inst || '—'}`);
  let prev = s;
  const seriesEras = (): EraId[] => ERA_ORDER.filter((e) => s.eras[e]?.open);
  let header = '';
  const pushSample = () => {
    const eras = seriesEras();
    const h = `  min  capital  inc/s     W  mandt   pop` + eras.map((e) => ` │ ${pad(e.slice(0, 5) + ' η×', 5)}    R×  res    P`).join('');
    if (h !== header) { series.push(h); header = h; }
    series.push(sampleRow(s, eras));
  };
  pushSample();
  while (true) {
    const pend = model.derive(s, C).pendingReckoning;
    if (pend || s.time >= capT) break;
    if (strategy !== 'idle') {
      s = buyStuff(s, ev, effBuys);
      if (strategy === 'levers' && Math.floor(s.time) % 5 === 0) s = raiseLevers(s, ev);
    }
    if (CPS > 0) {
      clickAcc += CPS * DT;
      while (clickAcc >= 1) { s = model.click(s, C); clickAcc--; }
    }
    prev = s;
    s = model.tick(s, C, DT);
    // events from the step
    for (const e of ERA_ORDER) {
      const a = prev.eras[e], b = s.eras[e];
      if (!b) continue;
      if (!a?.open && b.open) ev.push({ t: s.time, text: `ERA  ${e} opens` });
      if (b.open && b.crisesFired > (a?.crisesFired ?? 0)) ev.push({ t: s.time, text: `CRISIS ${e} #${b.crisesFired} (P ${pct(b.pressure / C.eras[e].collapseAt)}, +${C.global.crisisMandate} mandate)` });
      if (b.open && a?.open) {
        for (const ap of C.eras[e].applications) {
          if (!a.apps[ap.id]?.available && b.apps[ap.id]?.available) ev.push({ t: s.time, text: `     ${ap.id} available (p_s ≤ ${ap.visibleBelow})` });
        }
      }
      if (b.backfired && !a?.backfired) ev.push({ t: s.time, text: `     ${e} backfires (rebound > 100%)` });
    }
    if (!prev.flags.revealed && s.flags.revealed) ev.push({ t: s.time, text: 'REVEAL' });
    for (const l of C.levers) {
      const la = prev.levers[l.id]?.level ?? 0, lb = s.levers[l.id]?.level ?? 0;
      if (lb < la) ev.push({ t: s.time, text: `     lever ${l.id} lapses to L${lb}` });
    }
    // R fold 60 s after each efficiency purchase
    for (const b of effBuys) {
      if (b.rAfter === undefined && s.time >= b.t + 60) b.rAfter = model.derive(s, C).eras[b.era]?.rFold ?? 0;
    }
    const d = model.derive(s, C);
    for (const e of ERA_ORDER) {
      const x = d.eras[e];
      if (x?.rebound !== null && x?.rebound !== undefined) peakRebound[e] = Math.max(peakRebound[e] ?? -Infinity, x.rebound);
    }
    if (Math.floor(s.time / EVERY) > Math.floor(prev.time / EVERY)) {
      pushSample();
      check(s, `run ${idx} t=${s.time}`);
    }
  }
  if (series[series.length - 1] !== sampleRow(s, seriesEras())) pushSample();
  check(s, `run ${idx} end`);

  // ----- report -----
  const d = model.derive(s, C);
  const pend = d.pendingReckoning;
  console.log('  events:');
  for (const e of ev) console.log(`  ${min(e.t)}  ${e.text}`);
  const cause = pend ? `${pend.cause}${pend.era ? ` (${pend.era})` : ''}` : `time cap ${HOURS} h (chosen)`;
  const why = pend?.cause === 'exhausted' ? '' : '';
  console.log(`  ${min(s.time)}  RECKONING: ${cause}${why}`);
  console.log('  eras at the end:');
  for (const e of ERA_ORDER) {
    const es = s.eras[e], x = d.eras[e];
    if (!es?.open || !x) continue;
    console.log(`    ${e.padEnd(8)} η× ${pad(n(x.etaFold), 5)}  R× now ${pad(n(x.rFold), 5)}  peak R× ${pad(n(es.baseR > 0 ? es.peakR / es.baseR : 0), 5)}` +
      `  peak rebound ${peakRebound[e] !== undefined ? pct(peakRebound[e]!) : '-'}  reserve ${pct(x.reserveFraction)}  P ${pct(x.pressureFraction)}` +
      `  p_s ${n(x.servicePrice)}  p_r ${n(x.resourcePrice)}  D ${n(x.demand)}  R ${n(x.resourceUse)}  baseR ${n(es.baseR)}`);
  }
  for (const e of ERA_ORDER) {
    const bs = effBuys.filter((b) => b.era === e);
    if (!bs.length) continue;
    const parts = bs.map((b, i) => `#${i + 1} m${(b.t / 60).toFixed(1)} card ${signedPct(b.promise)} (cum ${signedPct(b.cumPromise)}) R× ${n(b.rBefore)}→${b.rAfter !== undefined ? n(b.rAfter) : '?'}`);
    console.log(`  ${e} efficiency buys (R× before → 60 s after):`);
    for (const p of parts) console.log(`    ${p}`);
    const four = bs[Math.min(3, bs.length - 1)];
    console.log(`    over the first ${Math.min(4, bs.length)}: cards promise ${signedPct(four.cumPromise)}, R× went ${n(bs[0].rBefore)} → ${n(four.rAfter ?? d.eras[e]?.rFold ?? 0)}`);
  }
  const hs = model.hindsightOnReckon(s, C);
  console.log(`  peak wellbeing ${n(s.run.peakWellbeing)}  decoupled years ${n(s.run.decoupledYears)}  peak population ${n(s.peakPopulation)}  clicks ${s.run.clicks}`);
  console.log(`  Hindsight gained ${hs}`);
  if (SERIES) {
    console.log(`  series (every ${EVERY} s; per era: η fold, R fold, reserve fraction, pressure fraction):`);
    for (const r of series) console.log('  ' + r);
  }
  return s;
}

/* ---------------- main ---------------- */

let s = model.createState(C, undefined, SEED);
for (let i = 1; i <= runs; i++) {
  s = playRun(s, i);
  s = model.reckon(s, C);
  if (strategy !== 'idle') {
    const r = spendHindsight(s);
    s = r.s;
    if (r.bought.length) console.log(`  spent Hindsight on: ${r.bought.join(', ')} (left ${n(s.meta.hindsight)})`);
  }
}
console.log(`\n${runs} run(s) done. total Hindsight earned ${n(s.meta.hindsightEarned)}; furthest era ${s.meta.furthestEra}; achievements: ${Object.keys(s.meta.achievements).join(', ') || '—'}`);
if (failures) {
  console.log(`!! ${failures} sanity failure(s)`);
  process.exit(1);
}
