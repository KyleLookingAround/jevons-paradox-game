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
 *   --minutes=M              a Ministry ends at M minutes if nothing ends it first (default 60)
 *   --json                   one JSON object per Ministry instead of the line
 * Per Ministry: cause, minutes, elections won/lost, inspections/found, rungs closed, Treasury income per second, the
 * Hindsight it paid and per hour, Confidence at each poll. Between Ministries: Hindsight spent on the cheapest Know-how
 * and Institutions it can buy (Statecraft first), the Treaty taken when offered.
 * tools/balance.ts delegates here for `gov:<bot>` (one line); this file also runs on its own.
 */
import { readFileSync } from 'node:fs';
import { model } from '../src/core';
import { mix32 } from '../src/core/util';
import { freshMeta } from '../src/core/state';
import { content as REAL } from '../src/content';
import { fixtureM5B, officeMeta } from '../src/core/fixture.m5b';
import type { Content, GameState, RivalProfile } from '../src/types';
import { GOV } from './strategies/govkit';

export function profileGrid(n: number, seed = 1): RivalProfile[] {
  const out: RivalProfile[] = [];
  const u = (k: number, j: number) => (mix32((seed * 7919) ^ Math.imul(k + 1, 0x9E3779B1) ^ (j * 0x85EBCA6B)) >>> 0) / 4294967296;
  for (let k = 0; k < n; k++) out.push({ haste: u(k, 1), founder: u(k, 2), volume: u(k, 3), drawn: u(k, 4), pliant: u(k, 5) });
  return out;
}

function spendBetween(s0: GameState, c: Content): GameState {
  let s = s0;
  for (let guard = 0; guard < 50; guard++) {
    const kv = model.knowhowViews(s, c).filter((v) => v.canBuy).sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))[0];
    const iv = model.institutionViews(s, c).filter((v) => v.canBuy).sort((a, b) => (a.nextCost ?? 0) - (b.nextCost ?? 0))[0];
    const n = kv ? model.buyKnowhow(s, c, kv.def.id) : iv ? model.buyInstitution(s, c, iv.def.id) : s;
    if (n === s) break;
    s = n;
  }
  const owned = model.institutionViews(s, c).filter((v) => v.level >= 1).map((v) => v.def.id);
  const seat = model.setLoadout(s, c, owned.slice(0, s.meta.slots));
  return seat;
}

export interface MinistryLine {
  n: number; cause: string; minutes: number; won: number; lost: number; inspections: number; found: number; closed: number;
  treasuryPerSec: number; hindsight: number; perHour: number; polls: number[]; precedent: number;
}

/** Play `ministries` Ministries from `start` with bot `name`; the profile, if given, is written into meta.office. */
export function playMinistries(start: GameState, c: Content, name: string, ministries: number, minutes: number, profile?: RivalProfile): MinistryLine[] {
  const bot = GOV[name];
  if (!bot) throw new Error(`unknown bot ${name}`);
  let s = start;
  const out: MinistryLine[] = [];
  for (let m = 1; m <= ministries; m++) {
    if (s.officeOffer && !s.meta.office) s = model.takeOffice(s, c);
    if (!s.meta.office) { s = { ...s, meta: officeMeta(c, s.meta) }; s = model.createState(c, s.meta, s.seed); }
    if (profile) s = { ...s, meta: { ...s.meta, office: { ...s.meta.office!, profile } } };
    if (model.derive(s, c).treaty?.available) s = model.treaty(s, c);
    s = spendBetween(s, c);
    s = { ...s, flags: { ...s.flags, revealed: true } };
    const polls: number[] = [];
    let treas = 0, t = 0;
    const cap = minutes * 60;
    for (; t < cap; t++) {
      s = bot(s, c, t);
      const d = model.derive(s, c);
      if (d.pendingReckoning) break;
      treas += d.incomePerSec;
      const idx0 = s.chair?.parliament.index ?? 0;
      s = model.tick(s, c, 1);
      if ((s.chair?.parliament.index ?? 0) !== idx0 || model.derive(s, c).pendingReckoning?.cause === 'defeated') polls.push(Math.round(s.chair?.confidence ?? 0));
    }
    const ch = s.chair!;
    const cause = model.derive(s, c).pendingReckoning?.cause ?? 'chosen';
    const h = model.hindsightOnReckon(s, c);
    let closed = 0;
    for (const id in ch.loopholes) if (ch.loopholes[id].status === 'closed') closed++;
    out.push({ n: m, cause, minutes: +(s.time / 60).toFixed(1), won: ch.electionsWon, lost: ch.electionsLost ?? 0,
      inspections: ch.inspections ?? 0, found: ch.findings ?? 0, closed, treasuryPerSec: +(treas / Math.max(1, t)).toFixed(2),
      hindsight: h, perHour: +(h / Math.max(1e-9, s.time / 3600)).toFixed(1), polls, precedent: s.meta.precedent ?? 0 });
    s = model.reckon(s, c);
  }
  return out;
}

function main(argv: string[]): void {
  const name = argv[0] ?? 'steward';
  const n = Number.isFinite(Number(argv[1])) ? Number(argv[1]) : 3;
  const flag = (k: string): string | undefined => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const from = flag('from');
  const which = flag('content') ?? (from ? 'real' : 'fixture');
  const c: Content = which === 'real' ? REAL : fixtureM5B;
  const minutes = Number(flag('minutes') ?? 60);
  const json = argv.includes('--json');
  const start = (): GameState => from ? model.deserialize(readFileSync(from, 'utf8'), c)! : model.createState(c, officeMeta(c, freshMeta(c)), 7);
  const rp = flag('rival-profile');
  const profiles: (RivalProfile | undefined)[] = !rp ? [undefined] : rp.startsWith('grid:') ? profileGrid(Number(rp.slice(5))) : [JSON.parse(rp)];
  for (const p of profiles) {
    const lines = playMinistries(start(), c, name, n, minutes, p);
    for (const l of lines) {
      if (json) console.log(JSON.stringify({ bot: name, profile: p ?? null, ...l }));
      else console.log(`${name} ${p ? JSON.stringify(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, +v.toFixed(2)]))) + ' ' : ''}M${l.n} ${l.cause} ${l.minutes}min won ${l.won} lost ${l.lost} insp ${l.inspections}/${l.found} closed ${l.closed} treasury ${l.treasuryPerSec}/s hindsight ${l.hindsight} (${l.perHour}/h) polls ${l.polls.join(',')}`);
    }
  }
}

// @ts-ignore — import.meta.main is Bun's
if (import.meta.main) main(process.argv.slice(2));
export { main as mainM5 };
