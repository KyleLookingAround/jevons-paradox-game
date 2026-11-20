/**
 * M5: save version 6 (types.ts SAVE_VERSION, the v5 → v6 steps): the migration step and the element-by-element
 * validation of every M5 field (meta: office, Precedent, Articles, playbooks, pledgesKept, dispatches.lastPlayer,
 * Institutions at level 0; the run: chair, officeOffer; LeverState since/raisedAt; SectorState decadesCertified and
 * returnAtBase; RunStats.certifiedDecades). serialise.ts calls these; nothing else does. Layer 9.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { CONFIDENCE_MAX } from '../types';
import type { ChairState, Content, FileView, GameState, LoopholeState, MetaState, ProspectusView, RivalProfile, RivalState } from '../types';
import { idx } from './contentIndex';
import { institutionMax } from './effects';
import { freshChair } from './inherit';
import { chairIdx } from './chair/chairIndex';
import { fileOf, prospectusOf } from './chair/office';
import { rivalProfile } from './chair/rival';
import { clamp, fin, isObj } from './util';

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const num = (x: unknown, d: number): number => (isNum(x) ? x : d);

/** v5 → v6 steps 1–3 on a JSON copy (the deep merge from a fresh state supplies the rest). */
export function migrateV5(raw: Record<string, unknown>): Record<string, unknown> {
  const r: Record<string, unknown> = JSON.parse(JSON.stringify(raw));
  const meta: Record<string, unknown> = isObj(r.meta) ? r.meta : {};
  r.meta = meta;
  meta.precedent = 0; meta.precedentEarned = 0; meta.articles = {}; meta.treaties = 0; meta.playbooks = []; meta.pledgesKept = {};
  delete meta.office;
  r.chair = null;
  r.officeOffer = false;
  r.version = 6;
  return r;
}

/** Institutions: known ids, levels 0 (unlocked, M5) to max. */
export function institutionLevels(x: unknown, content: Content): Record<string, number> {
  const ix = idx(content);
  const out: Record<string, number> = {};
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    const d = ix.institutions.get(k);
    if (!d || !isNum(v) || v < 0) continue;
    out[k] = Math.floor(Math.min(v, institutionMax(d)));
  }
  return out;
}

const PROFILE_KEYS: (keyof RivalProfile)[] = ['haste', 'founder', 'volume', 'drawn', 'pliant'];
function validProspectus(x: unknown): ProspectusView | null {
  if (!isObj(x) || typeof x.defaulted !== 'boolean' || !Array.isArray(x.first)) return null;
  const first = x.first.filter((i): i is ProspectusView['first'][number] => isObj(i) && typeof i.id === 'string' && typeof i.name === 'string'
    && isNum(i.t) && isNum(i.count) && (i.every === null || isNum(i.every)) && (i.kind === 'upgrade' || i.kind === 'found'));
  const motion = x.motion === null ? null : Array.isArray(x.motion)
    ? x.motion.filter((i): i is { id: string; name: string; t: number } => isObj(i) && typeof i.id === 'string' && typeof i.name === 'string' && isNum(i.t)) : null;
  if (first.length !== x.first.length) return null;
  return { defaulted: x.defaulted, first, motion };
}
function validFile(x: unknown): FileView | null {
  if (!isObj(x) || !Array.isArray(x.accepted) || !Array.isArray(x.declined) || !isNum(x.pliant) || !isNum(x.automatedShare) || !isNum(x.seasons)) return null;
  const line = (i: unknown): i is FileView['accepted'][number] => isObj(i) && typeof i.dispatch === 'string' && typeof i.label === 'string' && (i.year === null || isNum(i.year));
  if (!x.accepted.every(line) || !x.declined.every(line)) return null;
  return { accepted: x.accepted, declined: x.declined, pliant: x.pliant, automatedShare: x.automatedShare, seasons: x.seasons };
}

/** The M5 meta fields, validated (step 7). `meta` is the meta built so far (for recomputing a prospectus or file). */
export function validMeta5(saved: Record<string, unknown>, content: Content, meta: MetaState): Partial<MetaState> {
  const cx = chairIdx(content);
  const ix = idx(content);
  const out: Partial<MetaState> = {};
  // each written only where the save has it (absent = the default), so a v6 round trip is lossless
  if ('precedent' in saved) out.precedent = Math.max(0, num(saved.precedent, 0));
  if ('precedentEarned' in saved) out.precedentEarned = Math.max(out.precedent ?? 0, num(saved.precedentEarned, 0));
  if ('treaties' in saved) out.treaties = Math.max(0, Math.floor(num(saved.treaties, 0)));
  if ('articles' in saved) {
    const articles: Record<string, true> = {};
    if (isObj(saved.articles)) for (const [k, v] of Object.entries(saved.articles)) if (v === true && cx.articles.has(k)) articles[k] = true;
    out.articles = articles;
  }
  if ('playbooks' in saved) out.playbooks = Array.isArray(saved.playbooks) ? saved.playbooks.filter((p, i, a): p is string => typeof p === 'string' && cx.playbooks.has(p) && a.indexOf(p) === i) : [];
  if ('pledgesKept' in saved) {
    const kept: Record<string, true> = {};
    if (isObj(saved.pledgesKept)) for (const [k, v] of Object.entries(saved.pledgesKept)) if (v === true && cx.pledges.has(k)) kept[k] = true;
    out.pledgesKept = kept;
  }
  // dispatches.lastPlayer (validMeta3 rebuilt dispatches without it)
  const d = isObj(saved.dispatches) ? saved.dispatches : {};
  if (isObj(d.lastPlayer)) {
    const lp: NonNullable<MetaState['dispatches']['lastPlayer']> = {};
    for (const [k, v] of Object.entries(d.lastPlayer)) {
      if (!ix.dispatches.has(k) || !isObj(v) || !isNum(v.arm) || !isNum(v.year) || !isNum(v.run)) continue;
      lp[k] = { arm: Math.max(0, Math.floor(v.arm)), year: Math.floor(v.year), run: Math.floor(v.run) };
    }
    out.dispatches = { ...meta.dispatches, lastPlayer: lp };
  }
  // office
  const o = saved.office;
  if (isObj(o) && content.rival) {
    const def = content.rival.defaultProfile;
    const pr = isObj(o.profile) ? o.profile : {};
    const profile = PROFILE_KEYS.every((k) => isNum(pr[k])) ? Object.fromEntries(PROFILE_KEYS.map((k) => [k, clamp(pr[k] as number, 0, 1)])) as unknown as RivalProfile : { ...def };
    const src0 = rivalProfile(meta, content).sources;
    const so = isObj(o.sources) ? o.sources : {};
    const sources = Object.fromEntries(PROFILE_KEYS.map((k) => {
      const v = so[k];
      return [k, isObj(v) && isNum(v.n) && (v.d === null || isNum(v.d)) ? { n: v.n, d: v.d } : src0[k]];
    })) as Record<keyof RivalProfile, { n: number; d: number | null }>;
    const handedOver: Record<string, number> = {};
    if (isObj(o.handedOver)) for (const [k, v] of Object.entries(o.handedOver)) if (ix.knowhow.has(k) && isNum(v) && v > 0) handedOver[k] = v;
    const rec = isObj(o.record) ? o.record : {};
    out.office = {
      run: Math.max(0, Math.floor(num(o.run, meta.reckonings))), at: Math.max(0, num(o.at, meta.totalSeconds)), profile, sources, handedOver,
      prospectus: validProspectus(o.prospectus) ?? prospectusOf(meta, content),
      file: validFile(o.file) ?? fileOf(meta, content, profile.pliant),
      ministries: Math.max(1, Math.floor(num(o.ministries, 1))),
      record: {
        certifiedDecades: Math.max(0, num(rec.certifiedDecades, 0)), settledFromChair: Math.max(0, num(rec.settledFromChair, 0)),
        parliamentsWon: Math.max(0, num(rec.parliamentsWon, 0)), wellbeingYears: Math.max(0, num(rec.wellbeingYears, 0)),
      },
    };
  }
  return out;
}

const numMap = (x: unknown, keep: (k: string) => boolean): Record<string, number> => {
  const out: Record<string, number> = {};
  if (isObj(x)) for (const [k, v] of Object.entries(x)) if (keep(k) && isNum(v)) out[k] = v;
  return out;
};

/** GameState.chair, validated; rebuilt fresh (as inherit.ts builds a Ministry's) when it fails its shape; null when
 *  office is not taken (or content has no Ministry). */
export function validChair(x: unknown, content: Content, meta: MetaState): ChairState | null {
  const fresh = freshChair(content, meta);
  if (!fresh) return null;
  if (!isObj(x) || !isNum(x.confidence) || !isObj(x.parliament) || !isObj(x.rival)) return fresh;
  const p = x.parliament;
  if (!isNum(p.index) || !isNum(p.start) || !isNum(p.pollAt)) return fresh;
  const cx = chairIdx(content);
  const ix = idx(content);
  const isSector = (k: string) => ix.pos.has(k);
  const isLever = (k: string) => ix.levers.has(k);
  const ids = (a: unknown, ok: (k: string) => boolean): string[] | null => Array.isArray(a) ? a.filter((v): v is string => typeof v === 'string' && ok(v)) : null;
  const r = x.rival;
  const answers: RivalState['answers'] = {};
  if (isObj(r.answers)) for (const [k, v] of Object.entries(r.answers)) {
    if (!isLever(k) || !isObj(v) || typeof v.kind !== 'string' || !isNum(v.level) || !isNum(v.t) || !isNum(v.cost)) continue;
    answers[k] = { kind: v.kind, level: v.level, t: v.t, cost: v.cost, comply: num(v.comply, 0) };
  }
  const lobbying: Record<string, boolean> = {};
  if (isObj(r.lobbying)) for (const [k, v] of Object.entries(r.lobbying)) if (isLever(k) && v === true) lobbying[k] = true;
  const concealment = numMap(r.concealment, isSector);
  for (const k in concealment) concealment[k] = clamp(concealment[k], 0, 0.99);
  const loopholes: Record<string, LoopholeState> = {};
  if (isObj(x.loopholes)) for (const [k, v] of Object.entries(x.loopholes)) {
    if (!cx.loopholes.has(k) || !isObj(v) || !isNum(v.since) || !['open', 'used', 'drafting', 'closed'].includes(v.status as string)) continue;
    const st: LoopholeState = { status: v.status as LoopholeState['status'], since: v.since };
    if (isNum(v.draftUntil)) st.draftUntil = v.draftUntil;
    if (v.before === 'open' || v.before === 'used') st.before = v.before;
    loopholes[k] = st;
  }
  const found: ChairState['found'] = {};
  if (isObj(x.found)) for (const [k, v] of Object.entries(x.found)) if (isSector(k) && isObj(v) && isNum(v.share) && isNum(v.t)) found[k] = { share: v.share, t: v.t };
  const litigation: ChairState['litigation'] = {};
  if (isObj(x.litigation)) for (const [k, v] of Object.entries(x.litigation)) if (isLever(k) && isObj(v) && isNum(v.from) && isNum(v.until)) litigation[k] = { from: v.from, until: v.until };
  const offer = p.offer === null ? null : ids(p.offer, (k) => cx.pledges.has(k));
  const chosen = p.chosen === null ? null : ids(p.chosen, (k) => cx.pledges.has(k));
  const out: ChairState = {
    confidence: clamp(x.confidence, 0, CONFIDENCE_MAX),
    parliament: { index: Math.max(0, Math.floor(p.index)), start: p.start, pollAt: p.pollAt, offer: offer ?? null, chosen: chosen ?? null },
    pledges: ids(x.pledges, (k) => cx.pledges.has(k)) ?? [],
    inOpposition: x.inOpposition === true,
    lostInARow: Math.max(0, Math.floor(num(x.lostInARow, 0))),
    electionsWon: Math.max(0, Math.floor(num(x.electionsWon, 0))),
    inspectors: Array.isArray(x.inspectors) ? x.inspectors.map((v) => num(v, 0)) : [],
    inspected: numMap(x.inspected, isSector), found, compensated: numMap(x.compensated, isSector), loopholes,
    carveOuts: numMap(x.carveOuts, isLever), litigation,
    repealed: Array.isArray(x.repealed) ? x.repealed.filter((v): v is { lever: string; parliament: number } => isObj(v) && typeof v.lever === 'string' && isLever(v.lever) && isNum(v.parliament)) : [],
    rival: { capital: Math.max(0, num(r.capital, 0)), peakIncome: numMap(r.peakIncome, isSector), concealment, answers, lobbying },
  };
  for (const k of ['electionsLost', 'inspections', 'findings'] as const) if (isNum(x[k])) out[k] = Math.max(0, Math.floor(x[k] as number));
  if (isObj(x.litigatedAt)) out.litigatedAt = numMap(x.litigatedAt, isLever);
  if (isObj(x.due)) { const due: Record<string, true> = {}; for (const [k, v] of Object.entries(x.due)) if (isLever(k) && v === true) due[k] = true; out.due = due; }
  return out;
}

/** v5 → v6 step 6: a fresh run after a run that, as far as its summary can say, met OfficeDef.when gets the offer. The
 *  stand-in names 'motion' and 'actOne' only here (types.ts SAVE_VERSION). */
export function officeOfferOnMigration(s: GameState, content: Content, fresh: boolean): boolean {
  if (!content.office || s.meta.office || !fresh || s.meta.reckonings < 1) return false;
  const lr = s.meta.lastRun;
  return !!s.meta.endings?.actOne && !!lr && fin(lr.sectors?.motion?.resourceUsed ?? 0) > 0;
}
