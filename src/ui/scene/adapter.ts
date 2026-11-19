// sceneViewFrom: the ONLY place the scene touches the contract. Pure, total (never throws), no game rules:
// it reads Content, GameState and Derived and maps them to cosmetic fractions.
import type { Content, GameState, Derived, SectorDef, UpgradeDef } from '../../types';
import type { SceneView, SceneApp, SceneLever, AppStatus } from './types';
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

export function sceneViewFrom(content: Content, state: GameState, derived: Derived | null | undefined, sectorId: string): SceneView {
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

  const pop = n(state?.population, 1);
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
    stage: machineStage(owned, eff.length, etaFold, n(def?.autoEtaRate) > 0),
    etaFold,
    rFold,
    pace: clamp(Math.log2(Math.max(1, rFold)) / 4, 0, 1),
    reserveFraction: clamp(n(sd?.reserveFraction, 1), 0, 1),
    pressureFraction: clamp(n(sd?.pressureFraction), 0, 1.5),
    nextCrisisFraction: sd?.nextCrisisFraction ?? null,
    population: pop,
    popFraction: clamp(Math.log(Math.max(1, pop)) / Math.log(12), 0, 1),
    crises: n(ss?.crisesFired),
    levers,
    decoupling: !!sd?.decoupling,
    steadyProgress: clamp(steadyYears / STEADY_STATE_YEARS, 0, 1),
    steady: !!state?.run?.steadySectors?.[sectorId],
    reckoning: pr ? { cause: String(pr.cause), here: !pr.sector || pr.sector === sectorId } : null,
    year: Number.isFinite(derived?.year) ? Math.floor(derived!.year) : null,
    heritage,
  };
}
