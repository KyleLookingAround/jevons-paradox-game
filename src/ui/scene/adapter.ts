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
const GLOBAL_KINDS = new Set(['reckoning', 'won', 'charterChosen', 'ending']);

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
    const ex = e as { first?: boolean; label?: string };
    if (ex.first === true) se.first = true;
    if (typeof ex.label === 'string' && ex.label) se.label = ex.label;
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
    // This Industry's projects, and the general ones (no sector: drawn modestly in whichever town is on screen).
    if (!c || (c.sector && c.sector !== sectorId)) continue;
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

  // M3: each mechanic's view, only while its feature is on (and the core reports it).
  const m3 = m3Fields(content, state, derived, sectorId);
  const bites = m3.bites;
  if (bites) for (const l of levers) { const b = bites[l.id]; if (b && b > 0.005) l.bite = Math.round(clamp(b, 0, 1) * 100) / 100; }

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
    ...m3.fields,
    ...m4Fields(content, state, derived, sectorId),
    ...m5Fields(content, state, derived, sectorId, levers),
  };
}

/**
 * M5: the optional fields of one Industry's view (chair, rival, exempt, water, sealed; lever flags lobbied, litigated,
 * carvedOut). Each is left out outside a Ministry or while the core reports nothing, so an M4 host draws the M4 picture.
 */
function m5Fields(content: Content, state: GameState, derived: Derived | null | undefined, sectorId: string, levers: SceneLever[]): Partial<SceneView> {
  const out: Partial<SceneView> = {};
  type SD5 = Partial<{ rival: boolean; water: { applied?: number; consumed?: number; returnShare?: number } | null }>;
  const sd = derived?.sectors?.[sectorId] as SD5 | undefined;
  const dchair = (derived as { chair?: { inOpposition?: boolean } | null } | null | undefined)?.chair;
  if (dchair && typeof dchair === 'object') out.chair = { opposition: !!dchair.inOpposition };
  if (sd?.rival === true) out.rival = true;
  const w = sd?.water;
  if (w && typeof w === 'object') {
    const sig = (x: number) => (x > 0 ? Number(x.toPrecision(3)) : 0);
    out.water = { applied: sig(n(w.applied)), consumed: sig(n(w.consumed)), returnShare: Math.round(clamp(n(w.returnShare), 0, 1) * 100) / 100 };
  }
  const sealed = (derived as { office?: { sealed?: unknown } } | null | undefined)?.office?.sealed;
  if (Array.isArray(sealed) && sealed.includes(sectorId)) out.sealed = true;
  // In a Ministry only: the rival's answers in the landscape, and the exempt things of the rungs he uses.
  const ch = (state as { chair?: { parliament?: { index?: number }; carveOuts?: Record<string, number>; litigation?: Record<string, { until?: number }>;
    loopholes?: Record<string, { status?: string; before?: string }>; rival?: { lobbying?: Record<string, boolean> } } | null } | undefined)?.chair;
  if (!dchair || !ch || typeof ch !== 'object') return out;
  const t = n(state?.time);
  for (const l of levers) {
    if (ch.rival?.lobbying?.[l.id] === true) l.lobbied = true;
    const lit = ch.litigation?.[l.id];
    if (lit && n(lit.until) > t) l.litigated = true;
    const co = ch.carveOuts?.[l.id];
    if (typeof co === 'number' && co === n(ch.parliament?.index, -1)) l.carvedOut = true;
  }
  if (featureOn(derived, 'loopholes')) {
    const ex: string[] = [];
    const lsec = new Map<string, string>();
    for (const l of Array.isArray(content?.levers) ? content.levers : []) if (l) lsec.set(l.id, String((l as { sector?: string }).sector ?? ''));
    for (const r of Array.isArray((content as { loopholes?: unknown[] })?.loopholes) ? (content as { loopholes: { id: string; lever: string; prop?: string }[] }).loopholes : []) {
      if (!r || !r.prop || lsec.get(r.lever) !== sectorId) continue;
      const st = ch.loopholes?.[r.id];
      if (st && (st.status === 'used' || (st.status === 'drafting' && st.before === 'used')) && !ex.includes(r.prop)) ex.push(String(r.prop));
    }
    if (ex.length) out.exempt = ex;
  }
  return out;
}

/**
 * M4: the optional fields of one Industry's view (feeds, fedBy, stock, capstoned, preview). Each is left out while the
 * core reports nothing for it (a core before M4, an Industry without the mechanic), so an M3 host draws the M3 picture.
 */
function m4Fields(content: Content, state: GameState, derived: Derived | null | undefined, sectorId: string): Partial<SceneView> {
  const out: Partial<SceneView> = {};
  type SD4 = Partial<{ feeds: { to?: string; factor?: number }[] | null; preview: boolean; capstoned: boolean; arrears: boolean;
    stock: { reported?: number; true?: number | null; surveyed?: boolean; foreign?: { share?: number } | null; scar?: unknown; crossed?: boolean; world?: number } | null;
    apps: Record<string, { founded?: boolean; adoption?: number; feeds?: Record<string, number> | null }> }>;
  const sd = derived?.sectors?.[sectorId] as SD4 | undefined;
  // The order book (on Iron).
  if (Array.isArray(sd?.feeds) && sd.feeds.length) {
    out.feeds = sd.feeds.filter((x) => x && typeof x.to === 'string').map((x) => ({ to: String(x.to), factor: Math.round(clamp(n(x.factor, 1), 0, 1) * 100) / 100 }));
  }
  // What feeds this Industry: founded applications of other Industries whose feeds name it (or '*'). The core's
  // AppDerived.feeds is authoritative when present; the content's ApplicationDef.feeds otherwise.
  const fed: NonNullable<SceneView['fedBy']> = [];
  for (const [sid, sdef] of Object.entries(content?.sectors ?? {})) {
    if (sid === sectorId || !sdef || !Array.isArray(sdef.applications)) continue;
    for (const a of sdef.applications) {
      const fd = (a as { feeds?: { sector?: string }[] }).feeds;
      if (!Array.isArray(fd) || !fd.length) continue;
      const ad = (derived?.sectors?.[sid] as SD4 | undefined)?.apps?.[a.id];
      const as = state?.sectors?.[sid]?.apps?.[a.id];
      if (!(ad?.founded ?? as?.founded)) continue;
      const feedsHere = ad?.feeds && typeof ad.feeds === 'object' ? sectorId in ad.feeds : fd.some((x) => x && (x.sector === sectorId || x.sector === '*'));
      const here = state?.sectors?.[sectorId];
      if (!feedsHere || (here && here.open === false)) continue;
      fed.push({ from: sid, app: String(a.id), share: Math.round(clamp(n(ad?.adoption), 0, 1) * 100) / 100 });
    }
  }
  if (fed.length) out.fedBy = fed;
  // The stock (Fishing). The chart reads `reported` until surveyed; the world always reads the true stock.
  const st = sd?.stock;
  if (st && typeof st === 'object') {
    let moratorium = false;
    for (const l of Array.isArray(content?.levers) ? content.levers : []) {
      if (!l || (l as { sector?: string }).sector !== sectorId || String(l.kind) !== 'quota') continue;
      const lv = Math.floor(n(state?.levers?.[l.id]?.level));
      const ld = Array.isArray(l.levels) ? l.levels[lv - 1] : undefined;
      if (lv >= 1 && ld && n((ld as { value?: number }).value, 1) === 0) moratorium = true;
    }
    const r2 = (x: number) => Math.round(clamp(x, 0, 1) * 100) / 100;
    out.stock = {
      reported: r2(n(st.reported, 1)), truth: r2(n(st.world, n(st.true, n(st.reported, 1)))), surveyed: !!st.surveyed,
      foreign: r2(n(st.foreign?.share)), scar: !!st.scar, crossed: !!st.crossed, moratorium,
    };
  }
  // The capstone (the Act's ending) and the Preview mark.
  if (sd?.capstoned) {
    const rec = (state as { meta?: { world?: { capstone?: Record<string, { year?: number }> } } } | undefined)?.meta?.world?.capstone?.[sectorId];
    out.capstoned = { year: Number.isFinite(rec?.year) ? Math.floor(rec!.year!) : null, arrears: !!sd.arrears };
  }
  if (sd?.preview) out.preview = true;
  return out;
}

/** Is a feature on? Derived.features is the gate the UI reads too; a host without it (old saves, tests) reads "on". */
function featureOn(derived: Derived | null | undefined, id: string): boolean {
  const f = (derived as { features?: Record<string, boolean> } | null | undefined)?.features;
  return !f || typeof f !== 'object' || !(id in f) || f[id] !== false;
}

/**
 * M3: the optional fields of one Industry's view. Every field is left out while its feature is off or the core
 * reports nothing (the SectorDerived views are null then), so an M2 host draws the M2 picture.
 */
function m3Fields(content: Content, state: GameState, derived: Derived | null | undefined, sectorId: string): { fields: Partial<SceneView>; bites: Record<string, number> | null } {
  const out: Partial<SceneView> = {};
  const sd = derived?.sectors?.[sectorId] as (Partial<{ seams: unknown; load: unknown; travel: unknown; free: unknown; servicePrice: number; apps: Record<string, { founded?: boolean; adoption?: number; demand?: number; priceSeen?: number }> }> | undefined);
  // Seams (Steam).
  // M4: a drawer on another Industry's reserve (Iron on Steam's coal) shows the owner's seam section, hollowed by both.
  const owner = (content?.sectors?.[sectorId] as { resourceStock?: string } | undefined)?.resourceStock;
  const sv = (sd?.seams ?? (owner ? (derived?.sectors?.[owner] as { seams?: unknown } | undefined)?.seams : null)) as { sunk?: number; total?: number; ladder?: { sunk?: boolean; reachable?: boolean; forbidden?: boolean }[] } | null | undefined;
  if (sv && typeof sv === 'object' && featureOn(derived, 'seams')) {
    const ladder = Array.isArray(sv.ladder) ? sv.ladder : [];
    const total = Math.max(0, Math.floor(n(sv.total, ladder.length)));
    const sunk = clamp(Math.floor(n(sv.sunk)), 0, total);
    const nx = ladder[sunk];
    if (total > 0) out.seams = { sunk, total, next: !!(nx && nx.reachable && !nx.forbidden) };
  }
  // Load (Light): hours normalised to the peak hour.
  const lv = sd?.load as { factor?: number; hours?: number[]; peak?: number } | null | undefined;
  if (lv && typeof lv === 'object' && Array.isArray(lv.hours) && lv.hours.length && featureOn(derived, 'load')) {
    const hs = lv.hours.map((x) => Math.max(0, n(x)));
    const pk = Math.max(...hs, n(lv.peak));
    out.load = { hours: hs.map((x) => (pk > 0 ? Math.round((x / pk) * 100) / 100 : 0)), factor: Math.round(clamp(n(lv.factor, pk > 0 ? hs.reduce((a, b) => a + b, 0) / hs.length / pk : 1), 0, 1) * 100) / 100 };
  }
  // Travel (Motion): flow from the speed against the free speed; sprawl from the lock-in stock against what full
  // lock-in of every founded application would be (its effective saturation, read as demand / adoption).
  const tv = sd?.travel as { speed?: number; freeSpeed?: number; sprawl?: number; sprawlShare?: number } | null | undefined;
  if (tv && typeof tv === 'object' && featureOn(derived, 'travel')) {
    const fs = Math.max(1e-6, n(tv.freeSpeed, 1));
    const def = content?.sectors?.[sectorId];
    let full = 0;
    for (const a of Array.isArray(def?.applications) ? def!.applications : []) {
      const ad = sd?.apps?.[a.id];
      const as = state?.sectors?.[sectorId]?.apps?.[a.id] as { founded?: boolean; peakD?: number; peakAdoption?: number } | undefined;
      if (!(ad?.founded ?? as?.founded)) continue;
      const li = n((a as { lockIn?: number }).lockIn);
      const ado = n(ad?.adoption);
      const sat = ado > 0.02 ? n(ad?.demand) / ado : n(as?.peakD) / Math.max(0.02, n(as?.peakAdoption, 1));
      full += li * Math.max(0, sat);
    }
    const sp = Math.max(0, n(tv.sprawl));
    out.travel = {
      speed: Math.round(clamp(n(tv.speed, fs) / fs, 0, 1) * 100) / 100,
      sprawl: Math.round(clamp(full > 0 ? sp / full : 0, 0, 1) * 100) / 100,
      sprawlShare: Math.round(clamp(n(tv.sprawlShare), 0, 1) * 100) / 100,
      freeSpeed: Math.round(fs * 100) / 100,
    };
  }
  // Free at the point of use (Compute): founded applications whose users see under half the service price.
  if (sd?.free && featureOn(derived, 'freeAtUse')) {
    const ps = n(sd.servicePrice);
    const apps: string[] = [];
    for (const [id, ad] of Object.entries(sd.apps ?? {})) {
      if (ad?.founded && typeof ad.priceSeen === 'number' && Number.isFinite(ad.priceSeen) && ad.priceSeen <= ps * 0.5) apps.push(id);
    }
    out.free = { apps };
  }
  // Figures: the writer of a pending dispatch addressed to this Industry (or to none); the proprietor once his day
  // has come; at the first ending, while that run lasts, the whole cast in the street.
  const figs: string[] = [];
  const add = (k: unknown) => { if (typeof k === 'string' && k && !figs.includes(k)) figs.push(k); };
  if (featureOn(derived, 'dispatches')) {
    const pend = (derived as { dispatch?: { pending?: { def?: { sector?: string }; cast?: { figure?: string } | null }[] } } | null | undefined)?.dispatch?.pending;
    if (Array.isArray(pend)) for (const p of pend) if (p && (!p.def?.sector || p.def.sector === sectorId)) add(p.cast?.figure);
  }
  const meta = (state as { meta?: { flags?: Record<string, boolean> } } | undefined)?.meta;
  const prop = meta?.flags?.proprietor === true;
  const won = !!(state as { flags?: { won?: boolean } } | undefined)?.flags?.won && !!(derived as { ending?: { reached?: boolean } } | null | undefined)?.ending?.reached;
  if (won) for (const c of Array.isArray((content as { cast?: unknown[] })?.cast) ? (content as { cast: { figure?: string }[] }).cast : []) add(c?.figure);
  if (prop) add('proprietor');
  if (figs.length) out.figures = figs;
  // The proprietor's watch: decisions per hour after the Market against before (0.5 = unchanged).
  if (prop) {
    const sv2 = (derived as { survey?: { decisionsPerHourBefore?: number | null; decisionsPerHourAfter?: number | null } | null } | null | undefined)?.survey;
    const b = n(sv2?.decisionsPerHourBefore, NaN), a = n(sv2?.decisionsPerHourAfter, NaN);
    out.watch = Number.isFinite(a) && Number.isFinite(b) && a + b > 0 ? Math.round(clamp(a / (a + b), 0.05, 1) * 100) / 100 : 0.5;
  }
  // Bites of this Industry's levers (feature 'sideEffects').
  let bites: Record<string, number> | null = null;
  if (featureOn(derived, 'sideEffects')) {
    for (const [id, ls] of Object.entries(state?.levers ?? {})) {
      const b = n((ls as { bite?: number } | undefined)?.bite);
      if (b > 0) (bites ??= {})[id] = b;
    }
  }
  return { fields: out, bites };
}

/**
 * M3: a still view of how a run ended, rebuilt from its RunSummary (after a reload, when no recorded view is left):
 * the Industry at its peak adoption, peak pressure, stage and the M3 seams, load factor, speed and sprawl. `base` is
 * any view of the same Industry (sceneViewFrom with the current content and state) for names and the app list; the
 * result is a view for renderStill. With `start` true it is the run's first morning instead: nothing founded but the
 * first place, stage 0, clean air, the reserve whole.
 */
export function viewFromSummary(base: SceneView, summary: RunSummaryLike | null | undefined, start = false): SceneView {
  const s = summary?.sectors?.[base.sectorId];
  const cause = summary?.cause;
  if (start || !s) {
    return {
      ...base, events: undefined, stage: 0, pace: 0.1, pressureFraction: 0.02, pressureToClear: 0, reserveFraction: 1, popFraction: 0.1, crises: 0,
      levers: [], reckoning: null, clear: false, clearProgress: 0, settled: false, steady: false, decoupling: false, steadyProgress: 0, commons: base.commons,
      apps: base.apps.map((a, i) => ({ ...a, status: i === 0 ? 'founded' : i === 1 ? 'available' : 'hidden', adoption: i === 0 ? 0.15 : 0 })),
      seams: base.seams ? { ...base.seams, sunk: 0, next: false } : undefined, travel: base.travel ? { ...base.travel, sprawl: 0, speed: 1, sprawlShare: 0 } : undefined,
      figures: undefined, watch: undefined,
    };
  }
  const pk = s.peakAdoption ?? {};
  const v: SceneView = {
    ...base, events: undefined,
    apps: base.apps.map((a) => (a.id in pk ? { ...a, status: 'founded', adoption: clamp(n(pk[a.id]), 0, 1) } : { ...a, status: a.status === 'founded' ? 'available' : a.status, adoption: 0 })),
    stage: clamp(Math.round(n(s.stage, base.stage)), 0, 3),
    pressureFraction: clamp(n(s.peakPressure, base.pressureFraction), 0, 1.2),
    pressureToClear: undefined,
    reserveFraction: typeof s.unburnt === 'number' ? clamp(s.unburnt, 0, 1) : base.reserveFraction,
    pace: clamp(Math.log2(Math.max(1, n(s.peakRFold, 1))) / 4, 0, 1),
    steady: !!s.steady, settled: !!s.settled, clear: !!s.steady || !!s.settled, clearProgress: s.steady ? 1 : 0,
    reckoning: cause ? { cause: String(cause), here: !summary?.causeSector || summary.causeSector === base.sectorId } : null,
    figures: undefined, watch: undefined,
  };
  if (base.seams && typeof s.seams === 'number') v.seams = { ...base.seams, sunk: clamp(Math.floor(s.seams), 0, base.seams.total), next: false };
  if (base.load && typeof s.loadFactor === 'number') v.load = { ...base.load, factor: clamp(s.loadFactor, 0, 1) };
  if (base.travel && (typeof s.speed === 'number' || typeof s.sprawl === 'number')) v.travel = { ...base.travel, speed: typeof s.speed === 'number' ? clamp(s.speed / Math.max(1e-6, base.travel.freeSpeed ?? 1), 0, 1) : base.travel.speed };
  return v;
}

/** The parts of RunSummary viewFromSummary reads (structurally typed so a migrated summary also fits). */
export interface RunSummaryLike {
  cause?: string; causeSector?: string;
  sectors?: Record<string, { peakRFold?: number; unburnt?: number; peakPressure?: number; peakAdoption?: Record<string, number>; stage?: number; steady?: boolean; settled?: boolean; seams?: number; loadFactor?: number; speed?: number; sprawl?: number }>;
}

/**
 * A SceneView trimmed for recording (the time-lapse at each Reckoning, replay, a saved picture): everything the
 * picture draws, nothing the card or the text alternative alone needs (blurbs, demand, costs, events), numbers
 * rounded to what the picture can show. Still a valid SceneView. About 1.7 KB of JSON (2.2 KB uncompacted) for Steam's six-application
 * Industry (see adapter.test.ts).
 */
export function compactView(v: SceneView): SceneView {
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const out: SceneView = {
    ...v,
    apps: v.apps.map((a) => ({ ...a, blurb: '', demand: 0, foundCost: 0, canFound: false, affordFraction: 0, visibleBelow: null, adoption: r2(a.adoption) })),
    etaFold: r2(v.etaFold), rFold: r2(v.rFold), pace: r2(v.pace), reserveFraction: r2(v.reserveFraction), pressureFraction: r2(v.pressureFraction),
    popFraction: r2(v.popFraction), population: Math.round(v.population), steadyProgress: r2(v.steadyProgress), nextCrisisFraction: null,
    clearProgress: v.clearProgress == null ? undefined : r2(v.clearProgress), pressureToClear: v.pressureToClear == null ? undefined : r2(v.pressureToClear),
    events: undefined,
    // M3: figures and the watch belong to the live session, not to a record of the valley.
    figures: undefined, watch: undefined,
  };
  return out;
}
