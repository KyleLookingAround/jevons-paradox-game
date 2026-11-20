// Shared helpers of the M4 tests (m4.*.test.ts): states with chosen sectors open and applications founded, against
// fixtureM4 (fixture.ts) unless another content is given.
import type { Content, GameState, MetaState, SectorId, SectorState } from '../types';
import { model } from './index';
import { fixtureM4 } from './fixture';
import { modsOf } from './effects';
import { freshSector } from './state';

export const C4 = fixtureM4;
export function patch(s: GameState, e: SectorId, p: Partial<SectorState>): GameState {
  return { ...s, sectors: { ...s.sectors, [e]: { ...s.sectors[e], ...p } } };
}
/** Sectors opened (fresh, as an opening would) with the named applications founded; the Market off; revealed. */
export function openWith(c: Content, open: SectorId[], founded: string[] = [], meta?: Partial<MetaState>, extra: Partial<GameState> = {}): GameState {
  const m0 = model.createState(c).meta;
  const m: MetaState = { ...m0, ...meta, orders: { ...m0.orders, market: { ...m0.orders.market, on: false } } };
  let s: GameState = { ...model.createState(c, m), capital: 1e6, mandate: 1e4, flags: { revealed: true, won: false }, ...extra };
  const mods = modsOf(s, c);
  const sectors = { ...s.sectors };
  for (const id of open) if (!sectors[id].open) sectors[id] = freshSector(c.sectors[id], mods, true, s.meta);
  for (const a of founded) {
    const id = c.sectorOrder.find((x) => c.sectors[x].applications.some((p) => p.id === a))!;
    sectors[id] = { ...sectors[id], apps: { ...sectors[id].apps, [a]: { available: true, founded: true, satMul: 1, peakD: 0, peakAdoption: 0 } } };
  }
  s = { ...s, sectors };
  return model.tick(s, c, 0.001); // baselines
}
export const D4 = (s: GameState, c: Content = C4) => model.derive(s, c);
export const run4 = (s: GameState, secs: number, c: Content = C4, dt = 1) => { for (let t = 0; t < secs - 1e-9; t += dt) s = model.tick(s, c, dt); return s; };
