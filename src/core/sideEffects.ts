/**
 * M3: levers that bite back (LeverDef.sideEffects): the bite ramp in model years, 'biteBack' once per lever per run.
 * The effects act through Mods (effects.ts overlay, times = bite × level); this module only moves LeverState.bite.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { YEARS_PER_SECOND } from '../types';
import type { Content, GameState, LeverState } from '../types';
import { evalCond } from './conditions';
import { BITE_BACK_AT } from './constants';
import { idx } from './contentIndex';
import { fin } from './util';

/**
 * The bites after a step of dt from `prev` (`unless` read on prev), applied to `levers` (the step's levers after
 * Mandate and lapses: a lapsed lever is judged at its new level from the next step, so `active` reads prev's level).
 * Returns the new levers object (or the same) and the ids that first reached BITE_BACK_AT this run.
 */
export function stepBites(prev: GameState, content: Content, levers: Record<string, LeverState>, dt: number): { levers: Record<string, LeverState>; bitten: string[] } {
  const side = idx(content).sideLevers;
  if (!side.length) return { levers, bitten: [] };
  const dy = dt * YEARS_PER_SECOND;
  let out = levers;
  const bitten: string[] = [];
  for (const def of side) {
    const se = def.sideEffects!;
    const ls0 = prev.levers[def.id];
    const cur = levers[def.id];
    const b0 = fin(cur?.bite ?? 0);
    const active = (ls0?.level ?? 0) >= 1 && !(se.unless && evalCond(prev, content, se.unless));
    if (!active && b0 <= 0) continue;
    const ramp = se.rampYears > 0 ? se.rampYears : 1e-9;
    const decay = se.decayYears !== undefined && se.decayYears > 0 ? se.decayYears : ramp;
    const b1 = active ? b0 + (1 - b0) * (1 - Math.exp(-dy / ramp)) : b0 * Math.exp(-dy / decay);
    const bite = b1 < 1e-12 ? 0 : Math.min(1, fin(b1));
    const base: LeverState = cur ?? { level: 0, ref: 0 };
    const next: LeverState = { ...base, bite };
    if (bite >= BITE_BACK_AT && !base.bitten) { next.bitten = true; bitten.push(def.id); }
    if (out === levers) out = { ...levers };
    out[def.id] = next;
  }
  return { levers: out, bitten };
}
