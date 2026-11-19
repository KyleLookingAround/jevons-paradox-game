/**
 * M3: timed modifiers (GameState.modifiers): a dispatch arm's `modifier`, standing effects for a number of model years.
 * Stored as a reference (source dispatch id and arm), so a content fix applies to saves; their effects enter Mods in
 * effects.ts (the overlay). Here: adding with the stacking rule, expiry, and the views.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { MODIFIERS_MAX } from '../types';
import type { ActiveModifier, Content, GameState, ModifierView } from '../types';
import { idx } from './contentIndex';
import { fin } from './util';

/** The list with a modifier added: the same source and arm refreshes `until` to the later of the two (never stacks with
 *  itself); different sources stack; beyond MODIFIERS_MAX the one ending soonest is removed (no event). */
export function addModifier(list: ActiveModifier[], m: ActiveModifier): ActiveModifier[] {
  const i = list.findIndex((x) => x.source === m.source && x.arm === m.arm);
  if (i >= 0) {
    if (list[i].until >= m.until) return list;
    const out = list.slice();
    out[i] = { ...list[i], until: m.until };
    return out;
  }
  const out = [...list, m];
  while (out.length > MODIFIERS_MAX) {
    let k = 0;
    for (let j = 1; j < out.length; j++) if (out[j].until < out[k].until) k = j;
    out.splice(k, 1);
  }
  return out;
}

/** Split at the end time of a step: those with until ≤ end are ended (in list order). */
export function expireModifiers(list: ActiveModifier[], end: number): { list: ActiveModifier[]; ended: ActiveModifier[] } {
  if (!list.length) return { list, ended: [] };
  let ended: ActiveModifier[] | null = null;
  for (const m of list) if (m.until <= end) (ended ??= []).push(m);
  if (!ended) return { list, ended: [] };
  return { list: list.filter((m) => m.until > end), ended };
}

/** Derived.modifiers: ending soonest first. */
export function modifierViews(state: GameState, content: Content): ModifierView[] {
  const ix = idx(content);
  const out: ModifierView[] = [];
  for (const m of state.modifiers ?? []) {
    const arm = ix.dispatches.get(m.source)?.arms[m.arm];
    if (!arm?.modifier) continue;
    out.push({ source: m.source, arm: m.arm, label: arm.modifier.label ?? arm.label, effects: arm.modifier.effects.slice(), remaining: Math.max(0, fin(m.until - state.time)) });
  }
  return out.sort((a, b) => a.remaining - b.remaining);
}
