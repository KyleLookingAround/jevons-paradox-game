/**
 * M5: hidden flow (SectorDef.hiddenFlow; Plenty): the return share r of a sector now. Layer 3 (reads effects).
 * r = clamp(returnShare × Π returnShareMul effects on the sector, floor ?? 0, RETURN_SHARE_MAX).
 * The product is Mods.returnShareMul (effects.ts).
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { RETURN_SHARE_MAX } from '../types';
import type { SectorDef } from '../types';
import type { Mods } from './effects';
import { clamp, fin } from './util';

/** The return share r of a hiddenFlow sector (0 without hiddenFlow). */
export function returnShareOf(def: SectorDef, mods: Mods): number {
  const hf = def.hiddenFlow;
  if (!hf) return 0;
  const m = mods.returnShareMul[def.id] ?? 1;
  const floor = clamp(fin(hf.floor ?? 0), 0, RETURN_SHARE_MAX);
  return clamp(fin(hf.returnShare) * m, floor, RETURN_SHARE_MAX);
}
