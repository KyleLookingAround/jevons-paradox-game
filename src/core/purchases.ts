/**
 * Capital spending: upgrades (cost, visibility, forks, applying one), founding applications, and the click.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Actor, Content, GameState, NewsItem, SectorId, UpgradeDef } from '../types';
import { calendarYear } from './calendar';
import { idx } from './contentIndex';
import { modsOf, etaAt, flowCapacity, fireOneOffs, applyM3OneOffs, costMulOfId, isForbidden } from './effects';
import { evalCond } from './conditions';
import { milestone } from './milestones';
import type { Mods, OneOffs } from './effects';
import { computeFlows } from './flows';
import { headline, newsWith } from './headlines';
import { emit } from './events';
import type { EvDraft } from './events';
import { recordOpening } from './record';
import { fin } from './util';
import { chairIdx } from './chair/chairIndex';

/** M5: in a Ministry a chair sector's cards and applications are the rival's: refused to every other actor. */
const rivalOnly = (state: GameState, content: Content, s: SectorId, by: Actor): boolean =>
  !!state.chair && by !== 'rival' && chairIdx(content).chairSet.has(s);

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
  if (fl.pending || state.chair) return state; // M5: no click in a Ministry
  const g = content.global;
  return {
    ...state, capital: fin(state.capital + g.clickFlat + g.clickSeconds * fl.income),
    run: { ...state.run, clicks: state.run.clicks + 1 },
  };
}

export function upgradeCost(def: UpgradeDef, level: number, mods: Mods): number {
  const growth = def.repeatable ? Math.pow(def.costGrowth ?? 1, level) : 1;
  const of = costMulOfId(mods, def.id, def.sector);
  return of === 1 ? def.cost * mods.costMul * growth : def.cost * mods.costMul * growth * of;
}
/** M3: an application's found cost after costMulOf effects (AppDerived.foundCost). */
export function foundCostOf(a: { id: string; foundCost: number }, sector: SectorId, mods: Mods): number {
  const of = costMulOfId(mods, a.id, sector);
  return of === 1 ? a.foundCost : a.foundCost * of;
}
export function upgradeMax(def: UpgradeDef): number {
  return def.repeatable ? def.maxLevel ?? Infinity : 1;
}
export function upgradeVisible(state: GameState, def: UpgradeDef, mods: Mods, content: Content): boolean {
  const es = state.sectors[def.sector];
  return !!es?.open && !es.settled && (def.requires ?? []).every((r) => (state.upgrades[r] ?? 0) > 0)
    && (!def.locked || mods.unlocked.has(def.id)) && (!def.when || evalCond(state, content, def.when));
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
  let revealed = false;
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
      revealed = true;
    }
  }
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  fireOneOffs(def.effects, 1, computeFlows(state, content).income, one);
  if (def.kind === 'efficiency') items.push(headline(state, content, 'efficiency', time, { year }, def.sector));
  let out: GameState = {
    ...state, upgrades, sectors, flags, ...newsWith(state, content, items),
    capital: one.capital < 0 ? Math.max(0, state.capital + one.capital) : state.capital + one.capital,
    mandate: one.mandate < 0 ? Math.max(0, state.mandate + one.mandate) : state.mandate + one.mandate,
    meta: one.slots ? { ...state.meta, slots: state.meta.slots + one.slots } : state.meta,
  };
  out = applyM3OneOffs(out, content, one);
  if (revealed) out = { ...out, meta: milestone(out.meta, 'reveal', null, year) };
  return revealed ? emit(out, [{ kind: 'reveal', sector: def.sector }], time, year) : out;
}

/** M2: the sector's machine stage (largest `stage` among owned upgrades, 0 if none), null when none is authored. */
export function stageOf(state: GameState, content: Content, s: SectorId): number | null {
  const staged = idx(content).stagedBySector[s];
  if (!staged) return null;
  let st = 0;
  for (const u of staged) if ((state.upgrades[u.id] ?? 0) >= 1 && (u.stage as number) > st) st = u.stage as number;
  return st;
}

export function buyUpgrade(state: GameState, content: Content, upgradeId: string): GameState {
  return buyUpgradeAs(state, content, upgradeId, 'player');
}
/** buyUpgrade by any actor (the Market uses 'market'): recorded in run.opening; 'upgradeBought' and 'stageReached'. */
export function buyUpgradeAs(state: GameState, content: Content, upgradeId: string, by: Actor): GameState {
  const def = idx(content).upgrades.get(upgradeId);
  if (!def || computeFlows(state, content).pending || rivalOnly(state, content, def.sector, by)) return state;
  const level = state.upgrades[def.id] ?? 0;
  const mods = modsOf(state, content);
  if (level >= upgradeMax(def) || !upgradeVisible(state, def, mods, content) || upgradeExcludedBy(state, content, def.id)) return state;
  if (isForbidden(mods, def.id)) return state;
  const cost = upgradeCost(def, level, mods);
  if (!(state.capital >= cost)) return state;
  const s = applyUpgrade(state, content, def, state.time);
  const stage0 = stageOf(state, content, def.sector);
  const stage1 = stageOf(s, content, def.sector);
  const ev: EvDraft[] = [{ kind: 'upgradeBought', sector: def.sector, id: def.id, n: level + 1, by }];
  if (stage1 !== null && stage1 > (stage0 ?? 0)) ev.push({ kind: 'stageReached', sector: def.sector, n: stage1, id: def.id, label: def.machine ?? def.name });
  const out = { ...s, capital: Math.max(0, s.capital - cost), run: recordOpening(s.run, state.time, 'upgrade', def.id, by) };
  return emit(out, ev, state.time, calendarYear(state, content));
}

export function foundApp(state: GameState, content: Content, appId: string): GameState {
  return foundAppAs(state, content, appId, 'player');
}
/** foundApp by any actor: recorded in run.opening; 'appFounded' event. Refused in a settled sector. */
export function foundAppAs(state: GameState, content: Content, appId: string, by: Actor): GameState {
  const loc = idx(content).apps.get(appId);
  if (!loc || rivalOnly(state, content, loc.sector, by)) return state;
  const es = state.sectors[loc.sector];
  const def = content.sectors[loc.sector].applications[loc.idx];
  const st = es?.apps[appId];
  if (!es?.open || es.settled || !st || !st.available || st.founded) return state;
  const mods = modsOf(state, content);
  const cost = foundCostOf(def, loc.sector, mods);
  if (!(state.capital >= cost) || isForbidden(mods, appId)) return state;
  if (computeFlows(state, content).pending) return state;
  const sectors = { ...state.sectors, [loc.sector]: { ...es, apps: { ...es.apps, [appId]: { ...st, founded: true } } } };
  const year = calendarYear(state, content);
  const out: GameState = {
    ...state, capital: state.capital - cost, sectors,
    ...newsWith(state, content, [headline(state, content, 'appFounded', state.time, { year, app: def.name }, loc.sector)]),
    run: recordOpening(state.run, state.time, 'found', appId, by),
  };
  return emit(out, [{ kind: 'appFounded', sector: loc.sector, id: appId, by }], state.time, year);
}
