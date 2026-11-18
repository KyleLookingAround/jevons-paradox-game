// Shared UI context: the one mutable place the UI reads game data from.
import type { Content, Derived, EraDef, EraDerived, EraId, GameState, LeverView, ModelApi, UpgradeView } from '../types';
import { ERA_ORDER } from '../types';

export type FormulaKind = 'eff' | 'cons' | 'rebound' | 'price';

export interface Ctx {
  model: ModelApi;
  content: Content;
  mock: boolean;
  state: GameState;
  d: Derived;
  ups: UpgradeView[];
  levs: LeverView[];
  /** Selected era tab. Always an open era (falls back to the first open). */
  era: EraId;
  /** Run a ModelApi action. Returns true if the model accepted it (new reference). */
  act(name: string, f: (m: ModelApi, s: GameState, c: Content) => GameState): boolean;
  /** Replace the whole state (import / reset / new run). */
  replace(s: GameState): void;
  selectEra(id: EraId): void;
  openFormula(kind: FormulaKind): void;
  openMenu(): void;
  openShop(): void;
  confirmReckoning(): void;
  toast(text: string, action?: { label: string; run: () => void }): void;
  save(): void;
}

export interface Comp {
  el: HTMLElement;
  update(): void;
}

export function eraIds(c: Content): EraId[] {
  return ERA_ORDER.filter((id) => !!(c && c.eras && c.eras[id]));
}
export function eraDef(ctx: Ctx, id: EraId = ctx.era): EraDef | undefined {
  return ctx.content.eras ? ctx.content.eras[id] : undefined;
}
export function openEras(ctx: Ctx): EraId[] {
  return eraIds(ctx.content).filter((id) => ctx.state.eras?.[id]?.open);
}
export function ed(ctx: Ctx, id: EraId = ctx.era): EraDerived | undefined {
  return ctx.d?.eras ? ctx.d.eras[id] : undefined;
}
export function clickValue(ctx: Ctx): number {
  const g = ctx.content.global;
  const v = (g?.clickFlat ?? 0) + (g?.clickSeconds ?? 0) * (ctx.d?.incomePerSec ?? 0);
  return Number.isFinite(v) ? v : 0;
}
/** Era warning: pressure close to its next crisis line (or the collapse line), or reserve under 15%. */
export function eraWarning(ctx: Ctx, id: EraId): boolean {
  const e = ed(ctx, id), def = eraDef(ctx, id), st = ctx.state.eras?.[id];
  if (!e || !def) return false;
  const pf = Number.isFinite(e.pressureFraction) ? e.pressureFraction : 0;
  const next = def.crisisAt?.[st?.crisesFired ?? 0];
  if (pf >= 0.85 || (next != null && pf >= next - 0.06)) return true;
  return def.resourceKind === 'stock' && Number.isFinite(e.reserveFraction) && e.reserveFraction < 0.15;
}
