/**
 * M5 balancer: plays Ministries with a regulator bot (tools/strategies/govkit.ts) and prints one line per Ministry.
 *
 *   bun run tools/balance.m5.ts <abstain|naive|hawk|steward|humanGov> [ministries] [flags]
 *
 *   --from=<save.json>       start from a saved state (e.g. fixtures/m5/office-offer.json); Take office is taken when
 *                            offered. Default: the content's fresh state put in office by hand (officeMeta).
 *   --content=real|fixture   real content (src/content) or Core B's fixture (src/core/fixture.m5b.ts). Default: fixture
 *                            without --from, real with it.
 *   --rival-profile=<json>   the harness writes meta.office.profile (e.g. '{"haste":1,"founder":0,...}')
 *   --rival-profile=grid:N   N seeded profiles (mix32), one campaign each; prints one line per profile
 *   --minutes=M              a Ministry ends at M minutes if nothing ends it first (default 60). With --rule=player
 *                            this is the longest a Ministry runs (default 120).
 *   --rule=fixed|player      fixed (default): every Ministry runs --minutes. player (M5 balance): a person's Reckoning,
 *                            the Act I players' rule carried into office (see reckonNow): not before MIN_MINISTRY, never
 *                            while a clear streak runs or the mid-run window is to come, soon after a settlement from the
 *                            Chair (the Treaty waits at the Reckoning), else once the last ten minutes earned less than
 *                            0.9 of the Ministry's average Hindsight rate, else at --minutes.
 *   --until-treaty           stop after the Ministry in which the Treaty is signed (or `ministries`, whichever first)
 *   --json                   one JSON object per Ministry instead of the line
 *   --dump=<prefix>          write each Ministry's last state to <prefix>-m<N>.json
 * Per Ministry: cause, minutes, hours at its start, elections won/lost, inspections/found, rungs closed/used, Pryce's
 * answers by kind, certified decades, settlements, Treasury income per second, the Hindsight it paid and per hour,
 * Confidence at each poll. Between Ministries: Hindsight spent on the cheapest Know-how and Institutions it can buy
 * (Statecraft first), the Treaty taken when offered.
 * tools/balance.ts delegates here for `gov:<bot>` (one line); this file also runs on its own.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { model } from '../src/core';
import { mix32 } from '../src/core/util';
import { freshMeta } from '../src/core/state';
import { content as REAL } from '../src/content';
import { fixtureM5B, officeMeta } from '../src/core/fixture.m5b';
import type { Content, GameState, RivalProfile } from '../src/types';
import { GOV, resetGovMemo, chairSectors } from './strategies/govkit';

export function profileGrid(n: number, seed = 1): RivalProfile[] {
  const out: RivalProfile[] = [];
  const u = (k: number, j: number) => (mix32((seed * 7919) ^ Math.imul(k + 1, 0x9E3779B1) ^ (j * 0x85EBCA6B)) >>> 0) / 4294967296;
  for (let k = 0; k < n; k++) out.push({ haste: u(k, 1), founder: u(k, 2), volume: u(k, 3), drawn: u(k, 4), pliant: u(k, 5) });
  return out;
}

/** Between Ministries: Statecraft and the Ministry's Institutions first (the government's tree), then the cheapest of the
 *  rest; the owned Institutions seated, those the government needs first (the Water Board once Plenty is open). */
export function spendBetween(s0: GameState, c: Content): GameState {
  let s = s0;
  const rank = (id: string, tree?: string) => (tree === 'statecraft' || id === 'inst.waterBoard' ? 0 : 1);
  for (let guard = 0; guard < 50; guard++) {
    const kv = model.knowhowViews(s, c).filter((v) => v.canBuy).sort((a, b) => rank(a.def.id, a.def.tree) - rank(b.def.id, b.def.tree) || (a.cost ?? 0) - (b.cost ?? 0))[0];
    const iv = model.institutionViews(s, c).filter((v) => v.canBuy).sort((a, b) => rank(a.def.id) - rank(b.def.id) || (a.nextCost ?? 0) - (b.nextCost ?? 0))[0];
    const pickK = kv && (!iv || rank(kv.def.id, kv.def.tree) < rank(iv.def.id) || (rank(kv.def.id, kv.def.tree) === rank(iv.def.id) && (kv.cost ?? 0) <= (iv.nextCost ?? 0)));
    const n = pickK ? model.buyKnowhow(s, c, kv!.def.id) : iv ? model.buyInstitution(s, c, iv.def.id) : s;
    if (n === s) break;
    s = n;
  }
  const owned = model.institutionViews(s, c).filter((v) => v.level >= 1).map((v) => v.def.id)
    .sort((a, b) => rank(a) - rank(b));
  return model.setLoadout(s, c, owned.slice(0, s.meta.slots));
}

export interface MinistryLine {
  n: number; cause: string; minutes: number; startHour: number; won: number; lost: number; inspections: number; found: number;
  closed: number; used: number; treasuryPerSec: number; hindsight: number; perHour: number; polls: number[]; precedent: number;
  answers: Record<string, number>; certified: number; decades: number; settled: string[]; treaty: boolean; firsts: Record<string, number>;
  stop: string; crises: number; firstCrisisMin: number | null;
}

/** Minimum Ministry before a person's Reckoning (the mid-run window, minutes 25–29, has passed). */
const MIN_MINISTRY = 35 * 60;

/** --rule=player: a person's Reckoning in office (the Act I `budget`/`human` players' rule, tools/balance.ts, carried
 *  over). `hist` holds [time, Hindsight if Reckoned now] every 10 s. Returns the reason, or null to play on. */
export function reckonNow(s: GameState, c: Content, hist: [number, number][], maxSec: number, settledAt: number | null): string | null {
  if (Math.floor(s.time) % 10 !== 0) return null;
  const d = model.derive(s, c);
  hist.push([s.time, d.hindsightIfReckonNow]);
  const open = chairSectors(s, c);
  // a clear streak running: Steady State (and a settlement) within fifty model years unless it breaks
  const streak = open.some((id) => !s.sectors[id].settled && (s.sectors[id].clearYears ?? 0) > 0);
  if (s.time < MIN_MINISTRY) return null;
  // the Treaty waits at the Reckoning after a settlement from the Chair: once no other streak is running, ten minutes on
  if (settledAt !== null && !streak && s.time - settledAt >= 600) return 'the Treaty waits on a Reckoning';
  if (streak) return s.time >= maxSec * 1.5 ? 'cap (streak)' : null;
  const old = hist.find(([t]) => t >= s.time - 600);
  const avg = d.hindsightIfReckonNow / (s.time / 60);
  const marginal = old && s.time - old[0] >= 590 ? (d.hindsightIfReckonNow - old[1]) / ((s.time - old[0]) / 60) : Infinity;
  if (s.time >= 60 * 60 && marginal < 0.9 * avg) return `marginal ${marginal.toFixed(1)} < 0.9 × ${avg.toFixed(1)}`;
  if (s.time >= maxSec) return 'cap';
  return null;
}

export interface PlayOpts { rule?: 'fixed' | 'player'; untilTreaty?: boolean; dump?: string; log?: (line: string) => void }

/** Play `ministries` Ministries from `start` with bot `name`; the profile, if given, is written into meta.office. */
export function playMinistries(start: GameState, c: Content, name: string, ministries: number, minutes: number, profile?: RivalProfile, opts: PlayOpts = {}): MinistryLine[] {
  const bot = GOV[name];
  if (!bot) throw new Error(`unknown bot ${name}`);
  resetGovMemo();
  let s = start;
  let hours = s.meta.totalSeconds / 3600;
  const out: MinistryLine[] = [];
  for (let m = 1; m <= ministries; m++) {
    if (s.officeOffer && !s.meta.office) s = model.takeOffice(s, c);
    if (!s.meta.office) { s = { ...s, meta: officeMeta(c, s.meta) }; s = model.createState(c, s.meta, s.seed); }
    if (profile) s = { ...s, meta: { ...s.meta, office: { ...s.meta.office!, profile } } };
    let treaty = false;
    if (model.derive(s, c).treaty?.available) { s = model.treaty(s, c); treaty = true; }
    s = spendBetween(s, c);
    resetGovMemo();
    const polls: number[] = [];
    const answers: Record<string, number> = {};
    const firsts: Record<string, number> = {};
    const settled: string[] = [];
    let treas = 0, t = 0, seq = s.meta.eventSeq ?? 0, settledAt: number | null = null, stop = 'cap', crises = 0;
    let firstCrisis: number | null = null;
    const hist: [number, number][] = [];
    const cap = minutes * 60;
    for (; ; t++) {
      if (opts.rule === 'player') { const r = reckonNow(s, c, hist, cap, settledAt); if (r) { stop = r; break; } }
      else if (t >= cap) break;
      s = bot(s, c, t);
      const d = model.derive(s, c);
      if (d.pendingReckoning) { stop = d.pendingReckoning.cause; break; }
      treas += d.incomePerSec;
      const idx0 = s.chair?.parliament.index ?? 0;
      s = model.tick(s, c, 1);
      if ((s.chair?.parliament.index ?? 0) !== idx0 || model.derive(s, c).pendingReckoning?.cause === 'defeated') polls.push(Math.round(s.chair?.confidence ?? 0));
      for (const e of s.events) {
        if (e.seq <= seq) continue;
        seq = e.seq;
        const k = e.kind === 'featureUnlocked' ? `feature:${e.id}` : e.kind === 'settled' ? `settled:${e.sector}` : e.kind;
        if (['featureUnlocked', 'loopholeOpened', 'loopholeUsed', 'loopholeClosed', 'concealmentFound', 'electionLost', 'settled', 'crisis', 'litigated', 'carveOut', 'sectorOpened'].includes(e.kind)) firsts[k] ??= +(e.time / 60).toFixed(1);
        if (e.kind === 'rivalAnswered' && e.label) answers[e.label] = (answers[e.label] ?? 0) + 1;
        if (e.kind === 'settled' && e.sector) { settled.push(e.sector); settledAt = s.time; }
        if (e.kind === 'crisis' && e.sector && !s.sectors[e.sector]?.capstoned) { crises++; firstCrisis ??= +(e.time / 60).toFixed(1); }
        if (opts.log && ['featureUnlocked', 'settled', 'electionLost', 'loopholeUsed', 'loopholeClosed', 'concealmentFound', 'crisis', 'sectorOpened', 'steadyState', 'clearSkies'].includes(e.kind)) opts.log(`  M${m} ${(e.time / 60).toFixed(1)}m ${e.kind} ${e.sector ?? ''} ${e.id ?? ''}`);
      }
    }
    const ch = s.chair!;
    const cause = model.derive(s, c).pendingReckoning?.cause ?? 'chosen';
    const h = model.hindsightOnReckon(s, c);
    let closed = 0, used = 0;
    for (const id in ch.loopholes) { if (ch.loopholes[id].status === 'closed') closed++; if (ch.loopholes[id].status === 'used') used++; }
    let certified = 0, decades = 0;
    for (const id of c.sectorOrder) {
      const es = s.sectors[id];
      if (!es?.open) continue;
      certified += (es.decadesCertified ?? []).filter(Boolean).length;
      if (!es.capstoned) decades += es.decadesWithin?.length ?? 0;
    }
    out.push({ n: m, cause, minutes: +(s.time / 60).toFixed(1), startHour: +hours.toFixed(2), won: ch.electionsWon, lost: ch.electionsLost ?? 0,
      inspections: ch.inspections ?? 0, found: ch.findings ?? 0, closed, used, treasuryPerSec: +(treas / Math.max(1, t)).toFixed(2),
      hindsight: h, perHour: +(h / Math.max(1e-9, s.time / 3600)).toFixed(1), polls, precedent: s.meta.precedent ?? 0,
      answers, certified, decades, settled, treaty, firsts, stop, crises, firstCrisisMin: firstCrisis });
    hours += s.time / 3600;
    if (opts.dump) writeFileSync(`${opts.dump}-m${m}.json`, model.serialize(s));
    s = model.reckon(s, c);
    if (opts.untilTreaty && treaty) break;
  }
  return out;
}

export function formatLine(name: string, l: MinistryLine, p?: RivalProfile): string {
  const prof = p ? JSON.stringify(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, +v.toFixed(2)]))) + ' ' : '';
  const ans = Object.entries(l.answers).map(([k, v]) => `${k}${v}`).join(',');
  const fs = Object.entries(l.firsts).map(([k, v]) => `${k}@${v}`).join(' ');
  return `${name} ${prof}M${l.n} h${l.startHour} ${l.cause} ${l.minutes}min (${l.stop}) won ${l.won} lost ${l.lost} insp ${l.inspections}/${l.found} closed ${l.closed} used ${l.used} ans ${ans} cert ${l.certified}/${l.decades} settled [${l.settled.join(',')}]${l.treaty ? ' TREATY' : ''} crises ${l.crises}${l.firstCrisisMin !== null ? '@' + l.firstCrisisMin : ''} treasury ${l.treasuryPerSec}/s hindsight ${l.hindsight} (${l.perHour}/h) polls ${l.polls.join(',')} | ${fs}`;
}

function main(argv: string[]): void {
  const name = argv[0] ?? 'steward';
  const n = Number.isFinite(Number(argv[1])) ? Number(argv[1]) : 3;
  const flag = (k: string): string | undefined => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const from = flag('from');
  const which = flag('content') ?? (from ? 'real' : 'fixture');
  const c: Content = which === 'real' ? REAL : fixtureM5B;
  const rule = (flag('rule') ?? 'fixed') as 'fixed' | 'player';
  const minutes = Number(flag('minutes') ?? (rule === 'player' ? 120 : 60));
  const json = argv.includes('--json');
  const start = (): GameState => from ? model.deserialize(readFileSync(from, 'utf8'), c)! : model.createState(c, officeMeta(c, freshMeta(c)), 7);
  const rp = flag('rival-profile');
  const profiles: (RivalProfile | undefined)[] = !rp ? [undefined] : rp.startsWith('grid:') ? profileGrid(Number(rp.slice(5))) : [JSON.parse(rp)];
  const verbose = argv.includes('--events');
  for (const p of profiles) {
    const lines = playMinistries(start(), c, name, n, minutes, p, { rule, untilTreaty: argv.includes('--until-treaty'), dump: flag('dump'), log: verbose ? (x) => console.log(x) : undefined });
    for (const l of lines) {
      if (json) console.log(JSON.stringify({ bot: name, profile: p ?? null, ...l }));
      else console.log(formatLine(name, l, p));
    }
  }
}

// @ts-ignore — import.meta.main is Bun's
if (import.meta.main) main(process.argv.slice(2));
export { main as mainM5 };
