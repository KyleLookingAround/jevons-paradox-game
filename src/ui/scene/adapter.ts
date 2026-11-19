// sceneViewFrom: the ONLY place the scene touches the contract. Pure, total (never throws), no game rules:
// it reads Content, GameState and Derived and maps them to cosmetic fractions.
import type { Content, GameState, Derived, SectorDef, UpgradeDef, GameEvent } from '../../types';
import type { SceneView, SceneApp, SceneLever, AppStatus, SceneCommons, SceneEvent } from './types';
import { STEADY_STATE_YEARS } from '../../types';

const n = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** Visual machine generation 0–3 from the share of this sector's efficiency upgrades owned (and η itself where it
 *  rises on its own). 0–24% → 0, 25–49% → 1, 50–99% → 2, all → 3. */
export function machineStage(owned: number, total: number, etaFold: number, autoEta: boolean): number {
  let s = 0;
  if (total > 0) {
    const f = owned / total;
    s = f >= 1 ? 3 : f >= 0.5 ? 2 : f >= 0.25 ? 1 : 0;
  }
  if (autoEta || total === 0) {
    const e = etaFold >= 64 ? 3 : etaFold >= 12 ? 2 : etaFold >= 3 ? 1 : 0;
    s = Math.max(s, e);
  }
  return s;
}

/** Event kinds the scene reacts to without a sector (they concern every picture). */
const GLOBAL_KINDS = new Set(['reckoning', 'won', 'charterChosen']);

/** The events of one sector (plus the sector-less ones the scene cares about), in seq order, as plain objects. */
export function sceneEvents(events: readonly GameEvent[] | null | undefined, sectorId: string): SceneEvent[] {
  if (!Array.isArray(events)) return [];
  const out: SceneEvent[] = [];
  for (const e of events) {
    if (!e || typeof e !== 'object' || !Number.isFinite(e.seq)) continue;
    const mine = e.sector === sectorId || (!e.sector && GLOBAL_KINDS.has(String(e.kind)));
    if (!mine) continue;
    const se: SceneEvent = { seq: e.seq, kind: String(e.kind) };
    if (e.sector) se.sector = String(e.sector);
    if (e.id != null) se.id = String(e.id);
    if (Number.isFinite(e.n)) se.n = e.n;
    if (e.by) se.by = String(e.by);
    out.push(se);
  }
  return out.sort((a, b) => a.seq - b.seq);
}

/**
 * Map the contract to a SceneView for one sector. `events` (optional, M2): the GameEvents newer than the last ones
 * the host handed over (all sectors; the adapter keeps this sector's). Calls without it keep working.
 */
export function sceneViewFrom(content: Content, state: GameState, derived: Derived | null | undefined, sectorId: string, events?: readonly GameEvent[] | null): SceneView {
  const def: SectorDef | undefined = content?.sectors?.[sectorId];
  const sd = derived?.sectors?.[sectorId];
  const ss = state?.sectors?.[sectorId];
  const age = Array.isArray(content?.ages) ? content.ages.find((a) => Array.isArray(a.sectors) && a.sectors.includes(sectorId)) : undefined;
  const look = def?.theme ?? age?.theme ?? 'ledger';
  const capital = n(state?.capital);

  const apps: SceneApp[] = (Array.isArray(def?.applications) ? def!.applications : []).map((a) => {
    const ad = sd?.apps?.[a.id];
    const as = ss?.apps?.[a.id];
    const founded = !!(ad?.founded ?? as?.founded);
    const available = !!(ad?.available ?? as?.available);
    const status: AppStatus = founded ? 'founded' : available ? 'available' : 'hidden';
    const cost = n(a.foundCost);
    return {
      id: String(a.id), name: String(a.name ?? a.id), icon: String(a.icon ?? ''), blurb: String(a.blurb ?? ''),
      status,
      adoption: founded ? clamp(n(ad?.adoption), 0, 1) : 0,
      demand: n(ad?.demand),
      foundCost: cost,
      canFound: !!ad?.canFound,
      affordFraction: cost > 0 ? clamp(capital / cost, 0, 1) : 1,
      visibleBelow: Number.isFinite(a.visibleBelow) ? a.visibleBelow : null,
    };
  });

  // Efficiency upgrades of this sector (tolerates the v1 `era` key while content migrates).
  const sec = (u: UpgradeDef) => (u as { sector?: string }).sector ?? (u as unknown as { era?: string }).era;
  const eff = (Array.isArray(content?.upgrades) ? content.upgrades : []).filter((u) => u && sec(u) === sectorId && u.kind === 'efficiency');
  const owned = eff.filter((u) => n(state?.upgrades?.[u.id]) >= 1).length;
  const etaFold = n(sd?.etaFold, 1);
  const rFold = n(sd?.rFold, 1);

  const levers: SceneLever[] = [];
  for (const l of Array.isArray(content?.levers) ? content.levers : []) {
    const lsec = (l as { sector?: string }).sector ?? (l as unknown as { era?: string }).era;
    if (!l || lsec !== sectorId) continue;
    const lv = n(state?.levers?.[l.id]?.level);
    if (lv >= 1) levers.push({ id: l.id, kind: String(l.kind), level: lv, name: String(l.name ?? l.id) });
  }

  // What the earlier Industries built: it still stands in this one's picture (cosmetic, 0–1 each).
  const heritage: Record<string, number> = {};
  const order = Array.isArray(content?.sectorOrder) ? content.sectorOrder : [];
  for (const sid of order.slice(0, Math.max(0, order.indexOf(sectorId)))) {
    const sdef = content?.sectors?.[sid];
    const list = Array.isArray(sdef?.applications) ? sdef!.applications : [];
    if (!list.length) continue;
    let tot = 0;
    for (const a of list) {
      const ad = derived?.sectors?.[sid]?.apps?.[a.id], as = state?.sectors?.[sid]?.apps?.[a.id];
      if (ad?.founded ?? as?.founded) tot += 0.3 + 0.7 * clamp(n(ad?.adoption), 0, 1);
    }
    heritage[sid] = Math.round((tot / list.length) * 100) / 100;
  }

  // M2: the town is scaled against the player's own peak (Derived.populationRef), on a gentle curve.
  const pop = n(state?.population, 1);
  const popRef = n((derived as { populationRef?: number } | null | undefined)?.populationRef, 0);
  const popFraction = popRef >= 1
    ? clamp(Math.pow(clamp(pop / popRef, 0, 1), 0.7), 0, 1)
    : clamp(Math.log(Math.max(1, pop)) / Math.log(12), 0, 1);

  // M2: stage from the contract when authored; the share-owned heuristic otherwise.
  const sdStage = (sd as { stage?: number | null } | undefined)?.stage;
  const stage = typeof sdStage === 'number' && Number.isFinite(sdStage)
    ? clamp(Math.round(sdStage), 0, 3)
    : machineStage(owned, eff.length, etaFold, n(def?.autoEtaRate) > 0);

  // M2: clear skies, settlement, Commons, the Charter's landmark.
  const sdx = sd as (Partial<{ clear: boolean; clearP: number | null; clearYears: number; settled: boolean }> | undefined);
  const collapseAt = n((def as { collapseAt?: number } | undefined)?.collapseAt, 0);
  const pf = clamp(n(sd?.pressureFraction), 0, 1.5);
  const clearFrac = collapseAt > 0 && typeof sdx?.clearP === 'number' && Number.isFinite(sdx.clearP) ? clamp(sdx.clearP / collapseAt, 0, 0.99) : null;
  const ssx = ss as (Partial<{ settled: { sinceYear?: number } | null; clearYears: number }> | undefined);
  const settled = !!(sdx?.settled ?? ssx?.settled);
  const clearYears = n(sdx?.clearYears ?? ssx?.clearYears);
  const commons: SceneCommons[] = [];
  const levels = (state as { commons?: { levels?: Record<string, number> } } | undefined)?.commons?.levels ?? {};
  for (const c of Array.isArray((content as { commons?: unknown[] })?.commons) ? (content as { commons: { id: string; icon?: string; name?: string; sector?: string }[] }).commons : []) {
    if (!c || c.sector !== sectorId) continue;
    const lv = n(levels[c.id]);
    if (lv >= 1) commons.push({ id: String(c.id), icon: String(c.icon ?? ''), level: Math.floor(lv), name: String(c.name ?? c.id) });
  }
  let landmark: string | null = null;
  const charterId = (state as { meta?: { charter?: string | null } } | undefined)?.meta?.charter ?? (derived as { charter?: string | null } | null | undefined)?.charter ?? null;
  if (charterId) {
    const ch = (Array.isArray((content as { charters?: unknown[] })?.charters) ? (content as { charters: { id: string; sector?: string; landmark?: string }[] }).charters : []).find((x) => x && x.id === charterId);
    if (ch && ch.sector === sectorId && ch.landmark) landmark = String(ch.landmark);
  }

  const pr = derived?.pendingReckoning ?? null;
  const steadyYears = n(sd?.steadyYears ?? ss?.steadyYears);

  return {
    sectorId,
    sectorName: String(def?.name ?? sectorId),
    look: String(look),
    serviceName: String(def?.service?.name ?? 'Service'),
    serviceUnit: String(def?.service?.unit ?? ''),
    resourceName: String(def?.resource?.name ?? 'Resource'),
    pressureName: String(def?.pressure?.name ?? 'Pressure'),
    crisisName: String(def?.pressure?.crisisName ?? 'A crisis'),
    resourceKind: def?.resourceKind === 'flow' ? 'flow' : 'stock',
    apps,
    stage,
    etaFold,
    rFold,
    pace: clamp(Math.log2(Math.max(1, rFold)) / 4, 0, 1),
    reserveFraction: clamp(n(sd?.reserveFraction, 1), 0, 1),
    pressureFraction: pf,
    nextCrisisFraction: sd?.nextCrisisFraction ?? null,
    population: pop,
    popFraction,
    crises: n(ss?.crisesFired),
    levers,
    decoupling: !!sd?.decoupling,
    steadyProgress: clamp(steadyYears / STEADY_STATE_YEARS, 0, 1),
    steady: !!state?.run?.steadySectors?.[sectorId],
    reckoning: pr ? { cause: String(pr.cause), here: !pr.sector || pr.sector === sectorId } : null,
    year: Number.isFinite(derived?.year) ? Math.floor(derived!.year) : null,
    heritage,
    clear: !!sdx?.clear,
    clearProgress: clamp(clearYears / STEADY_STATE_YEARS, 0, 1),
    pressureToClear: clearFrac == null ? clamp(pf, 0, 1) : clamp((pf - clearFrac) / (1 - clearFrac), 0, 1),
    settled,
    settledYear: settled && Number.isFinite(ssx?.settled?.sinceYear) ? Math.floor(ssx!.settled!.sinceYear!) : null,
    commons,
    landmark,
    events: sceneEvents(events, sectorId),
  };
}
