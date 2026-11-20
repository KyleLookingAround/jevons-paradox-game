/**
 * Headlines: variant choice (deterministic from the seed), case-aware placeholder substitution, the news list.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState, HeadlineKey, NewsItem, SectorId } from '../types';
import { NEWS_MAX } from './constants';
import { idx } from './contentIndex';
import { currentAge } from './calendar';

/* ------------------------------------------------------------------ */
/* Headlines                                                           */
/* ------------------------------------------------------------------ */

const FALLBACK: Record<HeadlineKey, string> = {
  appFounded: '{app} founded', appAvailable: '{app} now within reach', sectorOpened: 'A new industry: {sector}',
  crisis: 'Crisis in {sector}', collapse: '{sector} collapses', exhausted: '{resource} exhausted',
  backfire: 'Efficiency backfires in {sector}', reveal: 'The rebound revealed', leverEnacted: 'New measure enacted',
  leverLapsed: 'Measure lapses for want of mandate', steadySector: '{sector} reaches a steady state',
  steadyAll: 'A steady state, at last', reckoning: 'The Reckoning', efficiency: 'Engines thriftier than ever',
  ageBegins: '{age} begins', budgetDrawn: 'A budget for {resource}', decade: 'A decade within budget for {sector}',
  budgetBroken: '{sector} breaks its budget',
  clearSkies: 'Clear skies over {sector}', settled: '{sector} settles', unsettled: '{sector} unsettled',
  commonsBuilt: '{name} opens', charter: 'A charter: {name}', featureUnlocked: 'Something new',
  seamSunk: '{name} is sunk', biteBack: '{name} bites back', dispatch: 'A letter to the proprietor', answered: 'The proprietor replies',
  ambient: 'From our correspondent', history: 'A history written: {name}', return: 'Household survey published',
  returnWithdrawn: 'The Household Survey is discontinued', ending: 'A steady state in every industry, {year}',
  threshold: 'The {sector} stock falls below its threshold', scarHealed: 'The {sector} stock recovers',
  surveyed: 'A survey of the {sector} stock', arrears: '{sector} in arrears', foreignFleets: 'Foreign fleets on the {sector} grounds',
  actEnding: '{name} settled, {year}',
};

/** Common-noun placeholders: lower-cased mid-sentence (see Content.headlines). */
const COMMON_NOUNS = new Set(['app', 'resource', 'service']);
/** True when `before` ends where a sentence starts: nothing yet, or . ! ? and a space (opening quotes allowed). */
const atSentenceStart = (before: string): boolean => /(^|[.!?]\s+)[\s“‘"'(]*$/.test(before);
/** Lower-case the first letter of a common noun, unless it opens with an acronym ("AI models", "GPU time"). */
function lowerFirst(name: string): string {
  if (name.length < 2 || /^\p{Lu}[\p{Lu}\d]/u.test(name)) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}
/** Placeholder substitution, case-aware (M1 balance fix): "demand for coal", "Coal runs dry", "welcome to the Coal Age". */
export function substitute(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string, offset: number) => {
    const v = values[key];
    if (v === undefined) return whole;
    if (atSentenceStart(text.slice(0, offset))) return v;
    if (COMMON_NOUNS.has(key)) return lowerFirst(v);
    if (key === 'age') return v.replace(/^The\b/, 'the');
    return v;
  });
}

export interface HeadlineCtx { year: number; app?: string; n?: number; name?: string; cast?: string; extra?: Record<string, string> }
/** The placeholder values of a headline (Content.headlines; M3: {cast} and per-kind extras). */
function values(state: GameState, content: Content, ctx: HeadlineCtx, sector?: SectorId): Record<string, string> {
  const def = sector ? content.sectors[sector] : undefined;
  const age = sector ? idx(content).ageOf.get(sector) ?? currentAge(state, content) : currentAge(state, content);
  const v: Record<string, string> = {
    sector: def?.name ?? '', era: def?.name ?? '', age: age?.name ?? '', app: ctx.app ?? '',
    resource: def?.resource.name ?? '', service: def?.service.name ?? '', year: String(Math.floor(ctx.year)),
    n: ctx.n !== undefined ? String(ctx.n) : '', name: ctx.name ?? '',
  };
  if (ctx.cast !== undefined) v.cast = ctx.cast;
  if (ctx.extra) Object.assign(v, ctx.extra);
  return v;
}
/** M3: authored text (dispatches, ambient news, the Proprietor's Day, the retrospective) with the headline placeholders
 *  and the same case rules; `{cast}` and the extras as given; a placeholder with no value stays as typed. */
export function fillText(state: GameState, content: Content, text: string, ctx: HeadlineCtx, sector?: SectorId): string {
  const v = values(state, content, ctx, sector);
  // placeholders with no value in this context stay as typed (M3); the M2 keys always have one (possibly empty)
  if (ctx.app === undefined) delete v.app;
  if (ctx.n === undefined) delete v.n;
  if (ctx.name === undefined) delete v.name;
  if (!sector) { delete v.sector; delete v.era; delete v.resource; delete v.service; }
  return substitute(text, v);
}
/** M3: a news item with authored text (no variant choice). */
export function textItem(key: HeadlineKey, text: string, time: number, year: number, sector?: SectorId): NewsItem {
  const item: NewsItem = { time, year: Math.floor(year), key, text };
  if (sector) item.sector = sector;
  return item;
}
/** M3 (finish): the variant slot of a headline (GameState.headlineUse): '<key>:<sector>' for an Industry's own variants,
 *  else the key; null when the key has no variants at all. */
function slotOf(content: Content, key: HeadlineKey, sector?: SectorId): { slot: string; variants: string[] } | null {
  const own = sector ? content.sectorHeadlines?.[sector]?.[key] : undefined;
  if (own && own.length) return { slot: `${key}:${sector}`, variants: own };
  const all = content.headlines?.[key];
  return all && all.length ? { slot: key, variants: all } : null;
}
/** The fixed starting offset of a slot's rotation: (seed + Σ char codes of the slot) mod n. */
function slotOffset(seed: number, slot: string, n: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < slot.length; i++) h = (h + slot.charCodeAt(i)) >>> 0;
  return h % n;
}

export function headline(state: GameState, content: Content, key: HeadlineKey, time: number, ctx: HeadlineCtx, sector?: SectorId): NewsItem {
  // M3 (finish): the least recently used variant of the slot this run (a rotation from a fixed offset), not an index
  // from the time and the news count, which could repeat a crisis headline within a run
  const sl = slotOf(content, key, sector);
  let text = sl ? sl.variants[(slotOffset(state.seed, sl.slot, sl.variants.length) + (state.headlineUse?.[sl.slot] ?? 0)) % sl.variants.length] : FALLBACK[key] ?? key;
  const year = Math.floor(ctx.year);
  text = substitute(text, values(state, content, ctx, sector));
  const item: NewsItem = { time, year, key, text };
  if (sector) item.sector = sector;
  return item;
}

/**
 * M3 (finish): the news list with `items` added (as withNews) and GameState.headlineUse counting each item's slot, so
 * the next headline of that slot takes the next variant. Spread into the new state: { ...state, ...newsWith(...) }.
 */
export function newsWith(state: GameState, content: Content, items: NewsItem[]): { news: NewsItem[]; headlineUse?: Record<string, number> } {
  if (!items.length) return state.headlineUse ? { news: state.news, headlineUse: state.headlineUse } : { news: state.news };
  let use = state.headlineUse;
  for (const it of items) {
    const sl = slotOf(content, it.key, it.sector);
    if (!sl) continue;
    if (use === state.headlineUse) use = { ...(use ?? {}) };
    use![sl.slot] = (use![sl.slot] ?? 0) + 1;
  }
  const news = withNews(state.news, items);
  return use ? { news, headlineUse: use } : { news };
}

export function withNews(news: NewsItem[], items: NewsItem[]): NewsItem[] {
  if (!items.length) return news;
  const out = items.slice().reverse().concat(news);
  return out.length > NEWS_MAX ? out.slice(0, NEWS_MAX) : out;
}
