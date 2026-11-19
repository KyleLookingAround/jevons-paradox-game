/**
 * Decade dividends (M2): the offer a decade appends, the overflow rule (none while away), and chooseDecadeDividend. The pace multiplier
 * applies to the chosen dividend's one-off amounts; standing effects come from SectorState.dividends (effects.ts).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { PENDING_DIVIDENDS_MAX } from '../types';
import type { Actor, Content, GameState, MetaState, PendingDividend, SectorId } from '../types';
import { featureOn } from './features';
import { calendarYear } from './calendar';
import { idx } from './contentIndex';
import { fireOneOffs, applyM3OneOffs } from './effects';
import type { OneOffs } from './effects';
import { emit } from './events';
import { computeFlows } from './flows';
import { sectorSteady } from './steady';
import { fin } from './util';

/** The offer of a sector's n-th decade this run (1-based), or null when it resolves no choices. */
export function decadeOffer(content: Content, s: SectorId, n: number, mul: number, meta?: MetaState): PendingDividend | null {
  const ch = sectorSteady(content, s).choices;
  if (!ch.length || !(n >= 1)) return null;
  let p = ch[(n - 1) % ch.length];
  // QA fix (DividendDef.requires): a pair naming a system not yet met gives way to the next pair whose options are all on.
  if (meta) {
    const dv = idx(content).dividends;
    const ok = (id: string) => { const r = dv.get(id)?.requires; return !r || featureOn(content, meta, r); };
    for (let k = 0; k < ch.length; k++) {
      const q = ch[(n - 1 + k) % ch.length];
      if (ok(q[0]) && ok(q[1])) { p = q; break; }
    }
  }
  return { sector: s, decade: n, options: [p[0], p[1]], mul: Math.max(0, fin(mul, 1)) };
}

/** Resolve pendingDividends[index] with option 0 or 1 (no validation beyond the index). */
export function resolveDividend(state: GameState, content: Content, index: number, option: 0 | 1, by: Actor, income?: number): GameState {
  const offer = state.pendingDividends[index];
  if (!offer) return state;
  const id = offer.options[option];
  const def = idx(content).dividends.get(id);
  const pendingDividends = state.pendingDividends.filter((_, i) => i !== index);
  const es = state.sectors[offer.sector];
  if (!def || !es) return { ...state, pendingDividends };
  const one: OneOffs = { capital: 0, mandate: 0, slots: 0 };
  fireOneOffs(def.effects, 1, income ?? computeFlows(state, content).income, one);
  const sectors = { ...state.sectors, [offer.sector]: { ...es, dividends: [...(es.dividends ?? []), id] } };
  let flags = state.flags;
  for (const ef of def.effects) {
    if (ef.type === 'reserveAdd') {
      const sd = content.sectors[ef.sector];
      const t = sectors[ef.sector];
      if (sd && t?.open && sd.resourceKind === 'stock') {
        const a = ef.value * sd.reserve;
        sectors[ef.sector] = { ...t, reserve: t.reserve + a, reserveMax: t.reserveMax + a };
      }
    } else if (ef.type === 'reveal' && !flags.revealed) flags = { ...flags, revealed: true };
  }
  let out: GameState = {
    ...state, pendingDividends, sectors, flags,
    capital: Math.max(0, fin(state.capital + one.capital * offer.mul)), mandate: Math.max(0, fin(state.mandate + one.mandate * offer.mul)),
  };
  out = applyM3OneOffs(out, content, one);
  return emit(out, [{ kind: 'dividendChosen', sector: offer.sector, id, n: offer.decade, by }], state.time, calendarYear(state, content));
}

/**
 * Append an offer; first resolve the oldest as option 0 ('default') while the list would overflow. Away (inside
 * fastForward; M2 offline fix): no overflow: a full list forgoes the new offer and the state is returned unchanged.
 */
export function appendDividend(state: GameState, content: Content, offer: PendingDividend, income: number, away = false): GameState {
  if (away && state.pendingDividends.length >= PENDING_DIVIDENDS_MAX) return state;
  let s = state;
  while (s.pendingDividends.length + 1 > PENDING_DIVIDENDS_MAX) s = resolveDividend(s, content, 0, 0, 'default', income);
  return { ...s, pendingDividends: [...s.pendingDividends, offer] };
}

export function chooseDecadeDividend(state: GameState, content: Content, sector: SectorId, option: number): GameState {
  if (option !== 0 && option !== 1) return state;
  const i = (state.pendingDividends ?? []).findIndex((p) => p.sector === sector);
  if (i < 0 || computeFlows(state, content).pending) return state;
  return resolveDividend(state, content, i, option, 'player');
}
