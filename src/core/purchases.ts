/**
 * Capital spending: upgrades (cost, visibility, forks, applying one), founding applications, and the click.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState, NewsItem, SectorId, UpgradeDef } from '../types';
import { calendarYear } from './calendar';
import { idx } from './contentIndex';
import { modsOf, etaAt, flowCapacity, fireOneOffs } from './effects';
import type { Mods, OneOffs } from './effects';
import { computeFlows } from './flows';
import { headline, withNews } from './headlines';
import { fin } from './util';

export function upgradeExcludedBy(state: GameState, content: Content, id: string): string | null {
  for (const o of idx(content).conflicts.get(id) ?? []) if ((state.upgrades[o] ?? 0) >= 1) return o;
  return null;
}

export function jevonsSet(state: GameState, content: Content, s: SectorId, mods: Mods): UpgradeDef[] {
  return (idx(content).efficiencyBySector[s] ?? []).filter((u) =>
    (!u.locked || mods.unlocked.has(u.id)) && ((state.upgrades[u.id] ?? 0) >= 1 || !upgradeExcludedBy(state, content, u.id)));
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export function click(state: GameState, content: Content): GameState {
  const fl = computeFlows(state, content);
  if (fl.pending) return state;
  const g = content.global;
  return {
    ...state, capital: fin(state.capital + g.clickFlat + g.clickSeconds * fl.income),
    run: { ...state.run, clicks: state.run.clicks + 1 },
  };
}

export function upgradeCost(def: UpgradeDef, level: number, mods: Mods): number {
  const growth = def.repeatable ? Math.pow(def.costGrowth ?? 1, level) : 1;
  return def.cost * mods.costMul * growth;
}
export function upgradeMax(def: UpgradeDef): number {
  return def.repeatable ? def.maxLevel ?? Infinity : 1;
}
export function upgradeVisible(state: GameState, def: UpgradeDef, mods: Mods): boolean {
  return !!state.sectors[def.sector]?.open && (def.requires ?? []).every((r) => (state.upgrades[r] ?? 0) > 0)
    && (!def.locked || mods.unlocked.has(def.id));
}

/** Applies an upgrade (one level) without charging for it. One-off effects fire. */
export function applyUpgrade(state: GameState, content: Content, def: UpgradeDef, time: number): GameState {
  const level = state.upgrades[def.id] ?? 0;
  const upgrades = { ...state.upgrades, [def.id]: level + 1 };
  const draft = { ...state, upgrades };
  const mods = modsOf(draft, content);
  const items: NewsItem[] = [];
  const sectors = { ...state.sectors };
  let flags = state.flags;
  const year = calendarYear(state, content);
  for (const s of idx(content).ids) {
    const es = sectors[s];
    if (es?.open) sectors[s] = { ...es, eta: etaAt(content.sectors[s], mods, es.openFor) };
  }
  for (const ef of def.effects) {
    if (ef.type === 'reserveAdd') {
      const sd = content.sectors[ef.sector];
      const es = sectors[ef.sector];
      if (sd && es?.open && sd.resourceKind === 'stock') {
        const a = ef.value * sd.reserve;
        sectors[ef.sector] = { ...es, reserve: es.reserve + a, reserveMax: es.reserveMax + a };
      } else if (sd && es?.open) {
        const cap = flowCapacity(sd, mods);
        sectors[ef.sector] = { ...es, reserve: cap, reserveMax: cap };
      }
    } else if (ef.type === 'reveal' && !flags.revealed) {
      flags = { ...flags, revealed: true };
      items.push(headline(state, content, 'reveal', time, { year }, def.sector));
    }
  }
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  fireOneOffs(def.effects, 1, computeFlows(state, content).income, one);
  if (def.kind === 'efficiency') items.push(headline(state, content, 'efficiency', time, { year }, def.sector));
  return {
    ...state, upgrades, sectors, flags, news: withNews(state.news, items),
    capital: state.capital + one.capital, mandate: state.mandate + one.mandate,
    meta: one.slots ? { ...state.meta, slots: state.meta.slots + one.slots } : state.meta,
  };
}

export function buyUpgrade(state: GameState, content: Content, upgradeId: string): GameState {
  const def = idx(content).upgrades.get(upgradeId);
  if (!def || computeFlows(state, content).pending) return state;
  const level = state.upgrades[def.id] ?? 0;
  const mods = modsOf(state, content);
  if (level >= upgradeMax(def) || !upgradeVisible(state, def, mods) || upgradeExcludedBy(state, content, def.id)) return state;
  const cost = upgradeCost(def, level, mods);
  if (!(state.capital >= cost)) return state;
  const s = applyUpgrade(state, content, def, state.time);
  return { ...s, capital: s.capital - cost };
}

export function foundApp(state: GameState, content: Content, appId: string): GameState {
  const loc = idx(content).apps.get(appId);
  if (!loc) return state;
  const es = state.sectors[loc.sector];
  const def = content.sectors[loc.sector].applications[loc.idx];
  const st = es?.apps[appId];
  if (!es?.open || !st || !st.available || st.founded || !(state.capital >= def.foundCost)) return state;
  if (computeFlows(state, content).pending) return state;
  const sectors = { ...state.sectors, [loc.sector]: { ...es, apps: { ...es.apps, [appId]: { ...st, founded: true } } } };
  return {
    ...state, capital: state.capital - def.foundCost, sectors,
    news: withNews(state.news, [headline(state, content, 'appFounded', state.time, { year: calendarYear(state, content), app: def.name }, loc.sector)]),
  };
}
