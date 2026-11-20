/**
 * M5 (Core B): office and the Treaty: takeOffice (the first Treaty reset, D2), the prospectus and the file (computed
 * once, from meta), treaty() and buyArticle(), and
 * their views (Derived.office, Derived.treaty). Both resets go through one helper (resetForOffice) so M7's Hand over can
 * call it with a different keep-list. Layer 9 (rebuilds the run through state.ts).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { FILE_ITEMS, PROSPECTUS_ITEMS, YEARS_PER_SECOND } from '../../types';
import type {
  ArticleView, Content, FileView, GameState, MetaState, NewsItem, ProspectusView, SectorId,
} from '../../types';
import { calendarYear, yearAt } from '../calendar';
import { evalCond } from '../conditions';
import { idx } from '../contentIndex';
import { emit } from '../events';
import type { EvDraft } from '../events';
import { featureOn } from '../features';
import { computeFlows } from '../flows';
import { headline, newsWith } from '../headlines';
import { isFreshRun, withMeta } from '../state';
import { unlockFeature } from '../unfold';
import { clamp, fin } from '../util';
import { chairIdx } from './chairIndex';
import { rivalProfile } from './rival';

/* ------------------------------------------------------------------ */
/* The prospectus and the file                                         */
/* ------------------------------------------------------------------ */

const nameOf = (content: Content, kind: 'upgrade' | 'found', id: string): string => {
  const ix = idx(content);
  if (kind === 'upgrade') return ix.upgrades.get(id)?.name ?? id;
  const loc = ix.apps.get(id);
  return loc ? content.sectors[loc.sector].applications[loc.idx].name : id;
};

/** ProspectusView from meta (types.ts doc). */
export function prospectusOf(meta: MetaState, content: Content): ProspectusView {
  const acts = meta.firstOpening?.actions ?? [];
  const n = Math.max(1, Math.floor(fin(content.office?.prospectusItems ?? PROSPECTUS_ITEMS, PROSPECTUS_ITEMS)));
  const items: ProspectusView['first'] = [];
  const byId = new Map<string, { item: ProspectusView['first'][number]; times: number[] }>();
  for (const a of acts) {
    if (a.kind === 'upgrade') {
      const hit = byId.get(a.id);
      if (hit) { hit.times.push(a.t); continue; }
      const item = { id: a.id, name: nameOf(content, 'upgrade', a.id), t: a.t, count: 1, every: null as number | null, kind: 'upgrade' as const };
      byId.set(a.id, { item, times: [a.t] });
      items.push(item);
    } else items.push({ id: a.id, name: nameOf(content, 'found', a.id), t: a.t, count: 1, every: null, kind: 'found' });
  }
  items.sort((x, y) => x.t - y.t);
  // M5 (follow-up): `every` is the mean interval among that card's purchases made up to the LAST QUOTED item's time (the
  // pace the card reads at, not the whole opening's: a card bought every twenty seconds, then twice more late, reads
  // "every twenty-odd seconds"); null with fewer than two purchases in that window. `count` is all its purchases.
  const lastT = items.length ? items[Math.min(n, items.length) - 1].t : 0;
  for (const { item, times } of byId.values()) {
    item.count = times.length;
    const w = times.filter((t) => t <= lastT + 1e-9);
    item.every = w.length > 1 ? fin((w[w.length - 1] - w[0]) / (w.length - 1)) : null;
  }
  const cx = chairIdx(content);
  const ix = idx(content);
  const chairFounds = (meta.opening?.actions ?? []).filter((a) => a.kind === 'found' && cx.chairSet.has(ix.apps.get(a.id)?.sector ?? ''))
    .map((a) => ({ id: a.id, name: nameOf(content, 'found', a.id), t: a.t }));
  return { defaulted: acts.length === 0, first: items.slice(0, n), motion: chairFounds.length ? chairFounds : null };
}

/** FileView from meta (types.ts doc). */
export function fileOf(meta: MetaState, content: Content, pliant: number): FileView {
  const casts = new Set(content.rival?.profileFrom.casts ?? []);
  type E = { dispatch: string; label: string; year: number | null; run: number; ord: number };
  const acc: E[] = [], dec: E[] = [];
  let ord = 0;
  for (const d of content.dispatches ?? []) {
    ord++;
    if (!casts.has(d.cast)) continue;
    const last = meta.dispatches?.lastPlayer?.[d.id];
    const push = (arm: number, year: number | null, run: number) => {
      const a = d.arms[arm];
      if (!a?.stance) return;
      const e = { dispatch: d.id, label: a.label, year, run, ord };
      if (a.stance === 'accept') acc.push(e); else if (a.stance === 'refuse') dec.push(e);
    };
    if (last) { push(last.arm, last.year, last.run); continue; }
    (meta.dispatches?.playerArms?.[d.id] ?? []).forEach((n, i) => { if (n > 0) push(i, null, -1); });
  }
  // dated first, most recent first; undated after, in content order
  const order = (x: E, y: E): number => (x.year === null) !== (y.year === null) ? (x.year === null ? 1 : -1)
    : x.year !== null && y.year !== null ? (y.run - x.run) || (y.year - x.year) : x.ord - y.ord;
  const strip = (xs: E[]) => xs.sort(order).slice(0, FILE_ITEMS).map(({ dispatch, label, year }) => ({ dispatch, label, year }));
  let auto = 0, dec2 = 0;
  for (const r of meta.runs ?? []) { auto += Math.max(0, r.automated ?? 0); dec2 += Math.max(0, r.decisions ?? 0); }
  return {
    accepted: strip(acc), declined: strip(dec), pliant: fin(pliant),
    automatedShare: auto + dec2 > 0 ? Math.round((100 * auto) / (auto + dec2)) : 0, seasons: (meta.runs ?? []).length,
  };
}

/* ------------------------------------------------------------------ */
/* Take office                                                         */
/* ------------------------------------------------------------------ */

/** takeOffice would accept. */
export function canTakeOffice(state: GameState, content: Content): boolean {
  return !!state.officeOffer && !state.meta.office && !!content.office && !!content.chair && !!content.rival && isFreshRun(state);
}

/**
 * The reset both Take office and the Treaty make (D2): Hindsight 0, every Institution kept unlocked at level 0, the
 * loadout empty, and Know-how entries removed where `dropKnowhow(tree)` says (knowhowPeak kept). M7's Hand over calls it
 * with its own keep-list.
 */
export function resetForOffice(meta: MetaState, content: Content, dropKnowhow: (tree: string) => boolean): MetaState {
  const institutions: Record<string, number> = {};
  for (const id in meta.institutions ?? {}) institutions[id] = 0;
  const knowhow: Record<string, number> = {};
  const ix = idx(content);
  for (const id in meta.knowhow ?? {}) {
    const tree = ix.knowhow.get(id)?.tree ?? 'general';
    if (!dropKnowhow(tree)) knowhow[id] = meta.knowhow[id];
  }
  return { ...meta, hindsight: 0, institutions, loadout: [], knowhow };
}

const heldByRival = (content: Content, tree: string): boolean => content.knowhowTrees?.[tree]?.holder === 'rival';

/** ModelApi.takeOffice (types.ts doc). Not a decision. */
export function takeOffice(state: GameState, content: Content): GameState {
  if (!canTakeOffice(state, content)) return state;
  const meta0 = state.meta;
  const ix = idx(content);
  const handedOver: Record<string, number> = {};
  for (const id in meta0.knowhow ?? {}) {
    const lvl = meta0.knowhow[id] ?? 0;
    if (lvl > 0 && heldByRival(content, ix.knowhow.get(id)?.tree ?? 'general')) handedOver[id] = lvl;
  }
  const { profile, sources } = rivalProfile(meta0, content);
  let meta: MetaState = {
    ...resetForOffice(meta0, content, (tree) => heldByRival(content, tree)),
    flags: { ...(meta0.flags ?? {}), office: true },
    office: {
      run: meta0.reckonings, at: meta0.totalSeconds, profile, sources, handedOver,
      prospectus: prospectusOf(meta0, content), file: fileOf(meta0, content, profile.pliant), ministries: 1,
      record: { certifiedDecades: 0, settledFromChair: 0, parliamentsWon: 0, wellbeingYears: 0 },
    },
  };
  const items: NewsItem[] = [];
  const ev: EvDraft[] = [];
  const year0 = calendarYear(state, content);
  // the Chair arrives at once (ignoring featureGapSeconds) when its `when` holds
  const fc = content.features?.chair;
  if (fc && meta.features?.chair === undefined && evalCond({ ...state, meta }, content, fc.when)) meta = unlockFeature(meta, content, 'chair', 0, year0, items, ev);
  let s = withMeta(state, content, meta);
  s = { ...s, officeOffer: false };
  const year = calendarYear(s, content);
  const pollYear = s.chair ? Math.floor(yearAt(s, content, s.chair.parliament.pollAt)) : Math.floor(year);
  const text = content.office!.text;
  items.unshift({ time: 0, year: Math.floor(year), key: 'acquisition', text: text.acquisition.headline });
  items.push(headline(s, content, 'officeTaken', 0, { year: pollYear }));
  if (text.sealed && sealedSectors(s, content).length) items.push({ time: 0, year: Math.floor(year), key: 'officeTaken', text: text.sealed });
  s = { ...s, ...newsWith(s, content, items) };
  return emit(s, [{ kind: 'officeTaken' }, ...ev], 0, year);
}

/** Sectors of closedInOffice acts the player has opened before (the sealed postcards), while office is taken. */
export function sealedSectors(state: GameState, content: Content): SectorId[] {
  if (!state.meta.office) return [];
  const ix = idx(content);
  return ix.ids.filter((s) => {
    const age = ix.ageOf.get(s);
    const act = age ? ix.actOfAge.get(age.id) : undefined;
    return !!act?.closedInOffice && !!state.meta.sectorsOpened[s];
  });
}

/* ------------------------------------------------------------------ */
/* The Treaty, Articles                                                */
/* ------------------------------------------------------------------ */

/** The four weighted Precedent terms over office.record (unrounded) and what treaty() would pay now. */
export function treatyTerms(meta: MetaState, content: Content): { terms: Record<string, number>; pay: number } {
  const t = content.chair?.treaty;
  const r = meta.office?.record ?? { certifiedDecades: 0, settledFromChair: 0, parliamentsWon: 0, wellbeingYears: 0 };
  const terms = {
    certifiedDecades: fin((t?.perCertifiedDecade ?? 0) * r.certifiedDecades),
    settledFromChair: fin((t?.perSettledFromChair ?? 0) * r.settledFromChair),
    parliamentsWon: fin((t?.perParliamentWon ?? 0) * r.parliamentsWon),
    wellbeingYears: fin((t?.perWellbeingYear ?? 0) * r.wellbeingYears),
  };
  const sum = terms.certifiedDecades + terms.settledFromChair + terms.parliamentsWon + terms.wellbeingYears;
  return { terms, pay: Math.max(1, Math.round(sum)) };
}

/** treaty() would accept. */
export function treatyAvailable(state: GameState, content: Content): boolean {
  const t = content.chair?.treaty;
  return !!t && !!state.meta.office && featureOn(content, state.meta, 'treaty') && isFreshRun(state) && evalCond(state, content, t.when);
}

/** ModelApi.treaty (types.ts doc). Not a decision. */
export function treaty(state: GameState, content: Content): GameState {
  if (!treatyAvailable(state, content)) return state;
  const meta0 = state.meta;
  const office = meta0.office!;
  const { pay } = treatyTerms(meta0, content);
  const treaties = (meta0.treaties ?? 0) + 1;
  const pb = (content.playbooks ?? []).find((p) => p.treaty === treaties);
  const meta: MetaState = {
    ...resetForOffice(meta0, content, (tree) => !heldByRival(content, tree)),
    office: { ...office, record: { certifiedDecades: 0, settledFromChair: 0, parliamentsWon: 0, wellbeingYears: 0 } },
    precedent: fin((meta0.precedent ?? 0) + pay), precedentEarned: fin((meta0.precedentEarned ?? 0) + pay),
    treaties, playbooks: pb ? [...(meta0.playbooks ?? []), pb.id] : meta0.playbooks ?? [],
  };
  let s = withMeta(state, content, meta);
  const year = calendarYear(s, content);
  const items: NewsItem[] = [headline(s, content, 'treaty', 0, { year, n: treaties })];
  const ev: EvDraft[] = [{ kind: 'treaty', n: treaties }];
  if (pb) { items.push(headline(s, content, 'playbookLearnt', 0, { year, name: pb.name })); ev.push({ kind: 'playbookLearnt', id: pb.id }); }
  s = { ...s, ...newsWith(s, content, items) };
  return emit(s, ev, 0, year);
}

const articleOffered = (state: GameState, content: Content, req: ArticleView['def']['requires']): boolean => !req || evalCond(state, content, req);

/** ModelApi.buyArticle (types.ts doc). Not a decision. */
export function buyArticle(state: GameState, content: Content, id: string): GameState {
  const a = chairIdx(content).articles.get(id);
  if (!a || !state.meta.office || !featureOn(content, state.meta, 'treaty') || !isFreshRun(state)) return state;
  if (state.meta.articles?.[id] || !articleOffered(state, content, a.requires)) return state;
  const cost = Math.max(0, fin(a.cost));
  if (!((state.meta.precedent ?? 0) >= cost)) return state;
  let s = withMeta(state, content, { ...state.meta, precedent: fin((state.meta.precedent ?? 0) - cost), articles: { ...(state.meta.articles ?? {}), [id]: true } });
  const year = calendarYear(s, content);
  s = { ...s, ...newsWith(s, content, [headline(s, content, 'articleBought', 0, { year, name: a.name })]) };
  return emit(s, [{ kind: 'articleBought', id }], 0, year);
}

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */

/** Derived.office. */
export function officeView(state: GameState, content: Content): NonNullable<import('../../types').Derived['office']> {
  const o = state.meta.office;
  const offered = !o && !!state.officeOffer && isFreshRun(state) && !!content.office;
  let preview: { prospectus: ProspectusView; file: FileView } | null = null;
  if (offered && content.rival) {
    const p = rivalProfile(state.meta, content).profile;
    preview = { prospectus: prospectusOf(state.meta, content), file: fileOf(state.meta, content, p.pliant) };
  }
  return { offered, taken: !!o, prospectus: o?.prospectus ?? null, file: o?.file ?? null, sealed: sealedSectors(state, content), preview };
}

/** Derived.treaty (null while 'treaty' is off or office is not taken). */
export function treatyView(state: GameState, content: Content): import('../../types').Derived['treaty'] {
  if (!state.meta.office || !featureOn(content, state.meta, 'treaty')) return null;
  const { terms, pay } = treatyTerms(state.meta, content);
  const fresh = isFreshRun(state);
  const precedent = fin(state.meta.precedent ?? 0);
  const articles: ArticleView[] = (content.articles ?? []).map((def) => {
    const bought = !!state.meta.articles?.[def.id];
    const offered = articleOffered(state, content, def.requires);
    return { def, bought, offered, canBuy: offered && !bought && precedent >= def.cost && fresh };
  });
  return { available: treatyAvailable(state, content), precedentIfNow: pay, terms, precedent, articles };
}

/** The 'settledFromChair' figure: office.record plus this run's chair sectors settled now (0 outside office). */
export function settledFromChairNow(state: GameState, content: Content): number {
  if (!state.meta.office || !state.chair) return 0;
  let n = state.meta.office.record.settledFromChair;
  for (const s of chairIdx(content).chairSectors) if (state.sectors[s]?.open && state.sectors[s].settled) n++;
  return n;
}

void YEARS_PER_SECOND; void computeFlows;
