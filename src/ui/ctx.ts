// Shared UI context: the one mutable place the UI reads game data from.
import type {
  AgeDef, Content, Derived, GameState, InstitutionView, KnowhowView, LeverView, ModelApi, SectorDef, SectorDerived, SectorId, UpgradeView,
} from '../types';

import type { AffordState } from './afford';

export type FormulaKind = 'eff' | 'cons' | 'rebound' | 'price';

export interface Ctx {
  model: ModelApi;
  content: Content;
  mock: boolean;
  state: GameState;
  d: Derived;
  ups: UpgradeView[];
  levs: LeverView[];
  khs: KnowhowView[];
  insts: InstitutionView[];
  /** Selected industry tab. Always an open sector (falls back to the first open). */
  sector: SectorId;
  /** Run a ModelApi action. Returns true if the model accepted it (new reference). */
  act(name: string, f: (m: ModelApi, s: GameState, c: Content) => GameState): boolean;
  /** Replace the whole state (import / reset / new run). */
  replace(s: GameState): void;
  selectSector(id: SectorId): void;
  openFormula(kind: FormulaKind): void;
  openMenu(focus?: 'keys'): void;
  openShop(): void;
  openLocked(id: SectorId): void;
  confirmReckoning(): void;
  /** Returns a function that dismisses the note early. */
  toast(text: string, action?: { label: string; run: () => void }): () => void;
  save(): void;
  /** The affordable signal (afford.ts), refreshed before the components update. */
  afford: AffordState;
  /** Bring the picture into view, selecting a place in it (null: the picture as a whole). */
  showPlace(appId: string | null): void;
  /** Scroll to (and focus) the first offer worth telling the player about. */
  jumpToAffordable(): void;
  /** Refresh views and redraw now (after a display setting changed). */
  refreshAll(): void;
  /** In-page confirmation before taking one arm of a fork. */
  confirmFork(upgradeId: string, onYes: () => void): void;
}

export interface Comp {
  el: HTMLElement;
  update(): void;
}

/** Every sector in content order (sectorOrder, keeping only ids that exist). */
export function sectorIds(c: Content): SectorId[] {
  return (c && Array.isArray(c.sectorOrder) ? c.sectorOrder : []).filter((id) => !!c.sectors?.[id]);
}
export function sectorDef(ctx: Ctx, id: SectorId = ctx.sector): SectorDef | undefined {
  return ctx.content.sectors ? ctx.content.sectors[id] : undefined;
}
export function openSectors(ctx: Ctx): SectorId[] {
  return sectorIds(ctx.content).filter((id) => ctx.state.sectors?.[id]?.open);
}
export function sd(ctx: Ctx, id: SectorId = ctx.sector): SectorDerived | undefined {
  return ctx.d?.sectors ? ctx.d.sectors[id] : undefined;
}
export function ageOfSector(c: Content, id: SectorId): AgeDef | undefined {
  return (c.ages || []).find((a) => (a.sectors || []).includes(id));
}
export function ageDef(c: Content, id: string | null | undefined): AgeDef | undefined {
  return id ? (c.ages || []).find((a) => a.id === id) : undefined;
}
/** 1-based position in sectorOrder (for the tab numeral). */
export function sectorIndex(c: Content, id: SectorId): number {
  return sectorIds(c).indexOf(id) + 1;
}

/** The looks the stylesheet knows. Anything else falls back to DEFAULT_LOOK. */
export const LOOKS = ['ledger', 'gaslight', 'chrome', 'terminal', 'agentic'] as const;
export const DEFAULT_LOOK = 'ledger';
/** Accent keys the stylesheet knows; an unknown key means no accent. */
export const ACCENTS = ['iron', 'gas', 'chrome', 'phosphor', 'diff'] as const;

/** Page look for a sector: its transitional `theme` override wins, else its age's theme; unknown keys fall back. */
export function lookFor(c: Content, id: SectorId | undefined): string {
  const def = id ? c.sectors?.[id] : undefined;
  const want = def?.theme ?? (id ? ageOfSector(c, id)?.theme : undefined) ?? DEFAULT_LOOK;
  return (LOOKS as readonly string[]).includes(want) ? want : DEFAULT_LOOK;
}
export function accentFor(c: Content, id: SectorId | undefined): string | null {
  const a = id ? c.sectors?.[id]?.accent : undefined;
  return a && (ACCENTS as readonly string[]).includes(a) ? a : null;
}

/** Tab warning dot: pressure close to its next crisis line (or collapse), or a stock reserve under 15%. Display only. */
export function sectorWarning(ctx: Ctx, id: SectorId): boolean {
  const e = sd(ctx, id), def = sectorDef(ctx, id);
  if (!e || !def) return false;
  const pf = Number.isFinite(e.pressureFraction) ? e.pressureFraction : 0;
  const next = e.nextCrisisFraction;
  if (pf >= 0.85 || (next != null && pf >= next - 0.06)) return true;
  return def.resourceKind === 'stock' && Number.isFinite(e.reserveFraction) && e.reserveFraction < 0.15;
}

/** Levers exist for the player once any is visible: only then does Mandate mean anything. */
export function leversVisible(ctx: Ctx): boolean {
  return (ctx.levs || []).some((v) => v && v.visible);
}

/**
 * "Call a Reckoning" is offered once the run has had its reveal, or once the player has been through a Reckoning
 * before (they know what it is). A forced Reckoning (collapse, exhaustion) is shown regardless.
 */
export function reckoningOffered(ctx: Ctx): boolean {
  return !!ctx.state.flags?.revealed || (ctx.state.meta?.reckonings ?? 0) >= 1;
}

export function roman(n: number): string {
  if (!(n > 0) || n > 3999) return '';
  const t: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
  return s;
}
