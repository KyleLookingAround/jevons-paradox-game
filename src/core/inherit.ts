/**
 * M4: the ONE carry-over step (design/m4-contract-notes.md §14): what a fresh run inherits from the world
 * (MetaState.world), applied by createState (state.ts) for reckon() and createState(content, meta) alike. M4 applies the
 * capstone (every sector with a CapstoneRecord opens capstoned) and the scar (a scarred renewable starts low; the start
 * stock itself is read by freshSector through renewable.ts, so a sector opening mid-run starts the same way). M7 (The
 * Inheritance) replaces "fresh world" with "inherited world" here and nowhere else.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { CONFIDENCE_MAX, YEARS_PER_SECOND } from '../types';
import type { CapstoneRecord, ChairState, Content, LeverState, MetaState, SectorDef, SectorId, SectorState } from '../types';
import { idx } from './contentIndex';
import { clamp, fin } from './util';

/** A capstoned sector built from its record on top of the fresh sector state (CapstoneRecord): open, settled with
 *  since 0 (sinceYear filled by the caller once the calendar exists), pressure = the recorded P, its founded uses, its
 *  baseline at the recorded per-head service, settledBefore. The reserve is the fresh run's. */
export function capstonedSector(def: SectorDef, fresh: SectorState, rec: CapstoneRecord): SectorState {
  const st = rec.settled;
  const apps: SectorState['apps'] = { ...fresh.apps };
  for (const a of def.applications) {
    if (st.appAdoption[a.id] === undefined && st.appD[a.id] === undefined) continue;
    apps[a.id] = { available: true, founded: true, satMul: 1, peakD: Math.max(0, fin(st.appD[a.id] ?? 0)), peakAdoption: clamp(fin(st.appAdoption[a.id] ?? 0), 0, 1) };
  }
  const P = Math.max(0, fin(st.P));
  let crises = 0;
  while (crises < def.crisisAt.length && def.collapseAt > 0 && P >= def.crisisAt[crises] * def.collapseAt) crises++;
  return {
    ...fresh, open: true, openFor: 0, eta: st.eta, etaAtBase: st.eta, pressure: P, peakPressure: P, crisesFired: crises, apps,
    baseR: st.R, baseD: st.D, basePs: st.ps, smoothR: st.R, peakR: st.R,
    settled: { ...st, since: 0, appD: { ...st.appD }, appAdoption: { ...st.appAdoption } }, settledBefore: true,
    capstoned: true,
  };
}

/** Apply the world to a fresh run's sectors and levers (both maps owned by the caller, written in place); `opened`
 *  builds a sector as an opening would (its reserve as a fresh run builds it). */
export function inheritWorld(content: Content, meta: MetaState, sectors: Record<SectorId, SectorState>, levers: Record<string, LeverState>, opened: (def: SectorDef) => SectorState): void {
  const cap = meta.world?.capstone;
  if (!cap) return;
  const ix = idx(content);
  for (const s of ix.ids) {
    const rec = cap[s];
    if (!rec || !sectors[s]) continue;
    sectors[s] = capstonedSector(content.sectors[s], sectors[s].open ? sectors[s] : opened(content.sectors[s]), rec);
    for (const l of ix.leversBySector[s] ?? []) if (levers[l.id]) levers[l.id] = { ...levers[l.id], level: 0, ref: 0 };
  }
}

/** The capstoned sectors' sinceYear set to the run's start year (once the calendar can be read). */
export function stampCapstones(sectors: Record<SectorId, SectorState>, year: number): Record<SectorId, SectorState> {
  let out: Record<SectorId, SectorState> | null = null;
  for (const s in sectors) {
    const es = sectors[s];
    if (!es.capstoned || !es.settled) continue;
    out ??= { ...sectors };
    out[s] = { ...es, settled: { ...es.settled, sinceYear: Math.floor(year) } };
  }
  return out ?? sectors;
}

/**
 * M5: a Ministry's chair state, fresh (GameState.chair): built for every run while meta.office is present and content
 * has office, chair and rival; null otherwise. Confidence at confidence.start; the first (caretaker) Parliament polls
 * firstTermYears from the start; every map empty; the rival's purse 0 until a chair sector opens (createState and the
 * rival's step add RivalDef.startCapitalSeconds × that sector's income). M7 hands an heir's state on here.
 */
export function freshChair(content: Content, meta: MetaState): ChairState | null {
  const cd = content.chair;
  if (!meta.office || !cd || !content.rival || !content.office) return null;
  const c0 = Number.isFinite(cd.confidence.start) ? cd.confidence.start : 50;
  const first = Math.max(1, Number.isFinite(cd.elections.firstTermYears) ? cd.elections.firstTermYears : 10);
  return {
    confidence: clamp(c0, 0, CONFIDENCE_MAX),
    parliament: { index: 0, start: 0, pollAt: first / YEARS_PER_SECOND, offer: null, chosen: null },
    pledges: [], inOpposition: false, lostInARow: 0, electionsWon: 0,
    inspectors: [], inspected: {}, found: {}, compensated: {}, loopholes: {}, carveOuts: {}, litigation: {}, repealed: [],
    rival: { capital: 0, peakIncome: {}, concealment: {}, answers: {}, lobbying: {} }, // = rival.ts freshRivalState()
  };
}

/** M5: the act of sector s is closed while office is taken (ActDef.closedInOffice; Act III in M5). */
export function sealedInOffice(content: Content, meta: MetaState, s: SectorId): boolean {
  if (!meta.office) return false;
  const ix = idx(content);
  const age = ix.ageOf.get(s);
  const act = age ? ix.actOfAge.get(age.id) : undefined;
  return !!act?.closedInOffice;
}
