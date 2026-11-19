// Shared helpers of the M1 mechanism tests (m1.*.test.ts), moved verbatim from model.m1.test.ts.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { expect } from 'bun:test';
import { model } from './index';
import { fixture as C, FOUNDED, STEAM_EFFICIENCY, STEAM_REFERENCE } from './fixture';
import type { Content, GameState, MetaState, SectorId, SectorState } from '../types';

export const SECTORS = C.sectorOrder;
export function patchSector(s: GameState, e: SectorId, patch: Partial<SectorState>): GameState {
  return { ...s, sectors: { ...s.sectors, [e]: { ...s.sectors[e], ...patch } } };
}
export function foundAll(s: GameState, c: Content, e: SectorId): GameState {
  const apps = { ...s.sectors[e].apps };
  for (const a of c.sectors[e].applications) apps[a.id] = { ...FOUNDED, peakD: apps[a.id]?.peakD ?? 0 };
  return patchSector(s, e, { apps });
}
export function steamAt(k: number, extra: Partial<GameState> = {}, c: Content = C): GameState {
  let s = model.createState(c);
  const upgrades: Record<string, number> = {};
  for (let i = 0; i < k; i++) upgrades[STEAM_EFFICIENCY[i]] = 1;
  s = { ...s, upgrades, ...extra };
  s = foundAll(s, c, 'steam');
  return patchSector(s, 'steam', { eta: STEAM_REFERENCE.eta[k], baseR: 0, baseD: 0, basePs: 0, smoothR: 0, peakR: 0, etaAtBase: 0 });
}
export const run = (s: GameState, secs: number, c: Content = C, dt = 1) => {
  for (let t = 0; t < secs - 1e-9; t += dt) s = model.tick(s, c, dt);
  return s;
};
export const D = (s: GameState, c: Content = C) => model.derive(s, c);
export const steamD = (s: GameState, c: Content = C) => D(s, c).sectors.steam!;
export const rich = (s: GameState): GameState => ({ ...s, mandate: 1e6, capital: 1e9, flags: { ...s.flags, revealed: true } });
export function greedy(s: GameState, c: Content): GameState {
  for (const v of model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, c)) if (v.visible && v.affordable) s = model.buyUpgrade(s, c, v.def.id);
  for (const e of c.sectorOrder) if (s.sectors[e]?.open) for (const a of c.sectors[e].applications) s = model.foundApp(s, c, a.id);
  return s;
}
export function openAll(c: Content = C, maxSeconds = 60): GameState {
  // the Market off: with this much capital it would buy every card at every order tick (M2 balance: it buys what
  // saves running cost), which is noise for the mechanisms these states test
  const m0 = model.createState(c).meta;
  const meta: MetaState = { ...m0, reckonings: 9, orders: { ...m0.orders, market: { ...m0.orders.market, on: false } } };
  let s = { ...model.createState(c, meta), capital: 1e15 };
  for (let i = 0; i < maxSeconds && !c.sectorOrder.every((e) => s.sectors[e].open); i++) s = greedy(model.tick(greedy(s, c), c, 1), c);
  return s;
}
/** No pressure in Steam: a long, calm economy to hold a line in. */
export const CALM: Content = { ...C, sectors: { ...C.sectors, steam: { ...C.sectors.steam, pressureIntensity: 0 } } };
/** Steam saturated (η 18, population 5), wellbeing above target, within a generous budget: decoupling. */
export function decoupling(c: Content = CALM): GameState {
  let s = run({ ...steamAt(7, {}, c), population: 5, flags: { revealed: true, won: false } }, 2, c);
  s = patchSector(s, 'steam', { budget: { r0: 10 * steamD(s, c).resourceUse, since: s.time, drawnYear: 1800, w0: 1e3, p0: 0, pace: "gentle" } });
  expect(steamD(s, c).decoupling).toBe(true);
  return s;
}
export const count = (s: GameState, key: string) => s.news.filter((n) => n.key === key).length;
export function badNumbers(x: unknown, path = '', out: string[] = []): string[] {
  if (typeof x === 'number') {
    if (Number.isNaN(x) || (!Number.isFinite(x) && !/secondsLeft$|visibleBelow$|maxLevel$/.test(path))) out.push(`${path}=${x}`);
  } else if (x && typeof x === 'object') {
    if ('def' in (x as object)) x = { ...(x as object), def: undefined };
    for (const [k, v] of Object.entries(x as object)) badNumbers(v, `${path}.${k}`, out);
  }
  return out;
}
/**
 * M3 (finish): the sector frozen as settled at its current flows (a hand-built SettledState, as settle() would record
 * with no excess to defend: N0 = today's population, spillMul0 1 and extraD0 0 are generous bases).
 */
export function settledNow(s: GameState, c: Content, e: SectorId): GameState {
  const x = model.derive(s, c).sectors[e]!;
  const settled = {
    since: s.time, sinceYear: 1900, D: x.demand, R: x.resourceUse, ps: x.servicePrice, pPre: x.servicePrice, income: 0,
    P: s.sectors[e].pressure, eta: s.sectors[e].eta, defect: 1, N0: s.population * 100, spillMul0: 100, extraD0: 1e12, appD: {}, appAdoption: {},
  };
  return patchSector(s, e, { settled, settledBefore: true });
}
