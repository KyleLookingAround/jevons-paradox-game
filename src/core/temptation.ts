/**
 * M3 (finish): the temptation's trade at the point of decision. Each Industry's mechanic pays the player who burns
 * and tests the one who restrains: a night use, a sprawl use, a deeper seam or a "free" business model adds use that
 * a budget line must then hold back. Once the mechanic's feature is on and the Industry has a line drawn, the views
 * report by how much: the resource the Industry would burn with the thing taken now, against without it, both solved
 * free of any cap (AppDerived.wantedChange, SeamsView.wantedChange, UpgradeView.wantedChange).
 * One sector solve per candidate, cached per (state.upgrades, state.levers) and PROJECTION_BUCKET of run time.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { ApplicationDef, Content, FeatureId, GameState, SectorDef, SectorId, SectorState, UpgradeDef } from '../types';
import { PROJECTION_BUCKET } from './constants';
import { modsOf } from './effects';
import { featureOn } from './features';
import { computeFlows } from './flows';
import { sectorLevers, NO_LEVERS } from './levers';
import { solveSector } from './solver';
import { idx } from './contentIndex';
import { evalCond } from './conditions';
import { fin } from './util';

/** The feature that shows a sector's mechanic, or null when it has none of the four. */
function mechanicFeature(def: SectorDef): FeatureId | null {
  if (def.load) return 'load';
  if (def.travel) return 'travel';
  if (def.seams?.length && def.resourceKind === 'stock') return 'seams';
  if (def.applications.some((a) => a.priceSeen)) return 'freeAtUse';
  return null;
}

/** The application is its Industry's temptation: a non-default load profile, a travel use that locks in, a seen price. */
export function temptingApp(def: SectorDef, a: ApplicationDef): boolean {
  if ((a.feeds?.length ?? 0) > 0) return true; // M4: an input to other Industries (the order book)
  if (def.load && (a.profile ?? def.load.defaultProfile) !== def.load.defaultProfile) return true;
  if (def.travel && (!def.travel.apps || def.travel.apps.includes(a.id)) && (a.lockIn ?? 0) > 0) return true;
  return !!a.priceSeen;
}

/** The card is a temptation: it sets a seen price (a business model, a flat rate). */
export const temptingCard = (u: UpgradeDef): boolean => u.effects.some((e) => e.type === 'priceSeen');

/** Whether the trade is shown for sector `s` now: its feature on (`feature` overrides the sector's own), a line drawn. */
export function tradeShown(state: GameState, content: Content, s: SectorId, feature?: FeatureId): boolean {
  const def = content.sectors[s], es = state.sectors[s];
  if (!def || !es?.open || es.settled || !es.budget) return false;
  const f = feature ?? mechanicFeature(def);
  return f !== null && featureOn(content, state.meta, f);
}

const cache = new WeakMap<object, WeakMap<object, Map<string, number | null>>>();

/** R of sector `s` free of any cap, for the state with `es` in place of its sector state and `upgrades` in force. */
function wantedR(state: GameState, content: Content, s: SectorId, es: SectorState, upgrades: Record<string, number>): number {
  const fl = computeFlows(state, content);
  const inp = fl.inputs[s];
  const draft = upgrades === state.upgrades ? state : { ...state, upgrades };
  const mods = modsOf(draft, content);
  const lev = sectorLevers(state, content)[s] ?? NO_LEVERS;
  return solveSector(content.sectors[s], es, Math.max(0.01, fin(state.population, 1)), mods, lev, inp?.extraD ?? 0, inp?.spillMul ?? 1, Infinity,
    undefined, inp?.feedMul ?? 1, inp?.pr ?? NaN, inp?.seam ?? 1, undefined, inp?.feedSat ?? null).R;
}

/** M4 (amend): the fed part is left out while the sector's feeds are not known (SectorDef.mechanic.feedsKnownWhen). */
export function feedsKnownHere(state: GameState, content: Content, s: SectorId): boolean {
  const w = content.sectors[s]?.mechanic?.feedsKnownWhen;
  return !w || evalCond(state, content, w);
}

export const feedsKnown = (state: GameState, content: Content, s: SectorId): boolean => feedsKnownHere(state, content, s);

/** M4: the R the fed Industries burn now, and with application `a` of s founded (whole-state solves). */
function fedR(state: GameState, content: Content, s: SectorId, withEs: SectorState): number {
  const draft: GameState = { ...state, sectors: { ...state.sectors, [s]: withEs } };
  const a = computeFlows(state, content), b = computeFlows(draft, content);
  let d = 0;
  for (const t of idx(content).feedTargets.get(s) ?? []) if (a.sectors[t] && b.sectors[t]) d += b.sectors[t].R - a.sectors[t].R;
  return d;
}

/** wanted(with) / wanted(now) − 1, cached per bucket; null when R now is 0. */
function change(state: GameState, content: Content, s: SectorId, key: string, withEs: SectorState, withUp: Record<string, number>): number | null {
  let byLev = cache.get(state.upgrades);
  if (!byLev) { byLev = new WeakMap(); cache.set(state.upgrades, byLev); }
  let m = byLev.get(state.levers);
  if (!m) { m = new Map(); byLev.set(state.levers, m); }
  const es = state.sectors[s];
  const k = `${s}|${key}|${Math.floor(state.time / PROJECTION_BUCKET)}|${es.seamsSunk ?? 0}|${state.meta.reckonings}`;
  const hit = m.get(k);
  if (hit !== undefined) return hit;
  const r0 = wantedR(state, content, s, es, state.upgrades);
  // M4: an application with feeds also counts what the fed Industries add (ApplicationDef.feeds)
  const fed = key.startsWith('app:') && idx(content).feedTargets.has(s) && feedsKnownHere(state, content, s) ? fedR(state, content, s, withEs) : 0;
  const out = r0 > 0 ? fin((wantedR(state, content, s, withEs, withUp) + fed) / r0 - 1, 0) : null;
  if (m.size > 400) m.clear();
  m.set(k, out);
  return out;
}

/** AppDerived.wantedChange for application `a` of sector `s` (null unless shown). */
export function appWanted(state: GameState, content: Content, s: SectorId, a: ApplicationDef): number | null {
  const def = content.sectors[s], es = state.sectors[s];
  const st = es?.apps[a.id];
  const feeds = (a.feeds?.length ?? 0) > 0; // M4: the order book needs no feature, only a line
  if (!st?.available || st.founded || !temptingApp(def, a) || !(feeds ? !!es?.open && !es.settled && !!es.budget : tradeShown(state, content, s))) return null;
  const withEs: SectorState = { ...es, apps: { ...es.apps, [a.id]: { ...st, founded: true } } };
  return change(state, content, s, `app:${a.id}`, withEs, state.upgrades);
}

/** SeamsView.wantedChange: sinking the next seam (null unless shown, or no seam is left). */
export function seamWanted(state: GameState, content: Content, s: SectorId): number | null {
  const def = content.sectors[s], es = state.sectors[s];
  const sunk = es?.seamsSunk ?? 0;
  const seam = def?.seams?.[sunk];
  if (!seam || !tradeShown(state, content, s, 'seams')) return null;
  const tons = Math.max(0, fin(seam.tons));
  const withEs: SectorState = { ...es, seamsSunk: sunk + 1, reserve: es.reserve + tons, reserveMax: es.reserveMax + tons };
  return change(state, content, s, 'seam', withEs, state.upgrades);
}

/** UpgradeView.wantedChange for a temptation card (null unless shown). */
export function cardWanted(state: GameState, content: Content, u: UpgradeDef): number | null {
  if (!temptingCard(u) || !tradeShown(state, content, u.sector, 'freeAtUse')) return null;
  const withUp = { ...state.upgrades, [u.id]: (state.upgrades[u.id] ?? 0) + 1 };
  return change(state, content, u.sector, `card:${u.id}`, state.sectors[u.sector], withUp);
}
