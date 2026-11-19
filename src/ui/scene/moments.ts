// Moments: what the picture should play once (a fog rolling in, a landmark rising, a machine replaced), decided from
// the contract's event list (SceneView.events) or, for hosts that pass none, by comparing successive views. Pure and
// DOM-free so it can be tested; the engine turns moments into classes and timers. It holds no game rules: every
// moment is the picture's reading of something the core already decided.
import type { SceneView, SceneEvent } from './types';

export type MomentKind =
  | 'crisis'     // fog and the crisis name
  | 'found'      // a landmark rises (by the player: toast; by the Market: scaffold, no toast)
  | 'scaffold'   // the Market bought something: a scaffold on the machine it affects, up and down
  | 'stage'      // the machines changed generation: the new one appears with a flourish
  | 'lever'      // a sign of restraint goes up
  | 'decade'     // a decade earned: a brief brightening
  | 'clear'      // clear skies (the weather goes)
  | 'steady'     // Steady State
  | 'settled'    // the Industry settled
  | 'opened'     // the Industry opened or an Age began: the picture is unveiled
  | 'backfire'   // the first backfire: the valley takes a breath and burns harder
  | 'commons'    // a Commons building rises
  /* M3 */
  | 'seamSunk'   // a shaft sinks to the next seam, a puff of steam at the head, the gallery lights
  | 'biteBack'   // a lever's side effect appears where it stands
  | 'ending';    // the first ending: the sky clears completely and a paper boy runs through

export interface Moment { kind: MomentKind; app?: string; id?: string; by?: string; n?: number; text?: string }

interface Prev { crises: number; steady: boolean; stage: number; clear: boolean; settled: boolean; status: Map<string, string>; commons: Map<string, number>; seams: number; bitten: Set<string> }

export class MomentDesk {
  /** Highest event seq seen by this scene (seqs are global across sectors, so a sector switch resets nothing). */
  maxSeq = 0;
  sector = '';
  /** A caption shown over the picture until `until` (ms, host clock), owned by `sector`. */
  caption: { text: string; until: number; sector: string } | null = null;
  /** The crisis fog is running for this sector until this time (ms); 0 = none. */
  crisisUntil = 0;
  private prev = new Map<string, Prev>();

  /** The Industry on screen changed: whatever was playing for the old one (fog, its caption) stops. */
  setSector(id: string): void {
    if (id === this.sector) return;
    this.sector = id;
    this.crisisUntil = 0;
    if (this.caption && this.caption.sector !== id) this.caption = null;
  }

  /** The caption to show now (null when none, expired or not this sector's). */
  captionNow(now: number): string | null {
    const c = this.caption;
    return c && c.sector === this.sector && c.until > now ? c.text : null;
  }

  crisisActive(now: number): boolean { return this.crisisUntil > now; }

  /**
   * The moments for this view. `quiet` (replay, a static render): remember everything, play nothing.
   * `now` is the host's clock in ms (for caption and fog timers only).
   */
  take(v: SceneView, now: number, quiet = false): Moment[] {
    this.setSector(v.sectorId);
    const out: Moment[] = [];
    const p = this.prev.get(v.sectorId);
    const status = new Map(v.apps.map((a) => [a.id, a.status as string]));
    const commons = new Map((v.commons ?? []).map((c) => [c.id, c.level]));
    if (Array.isArray(v.events)) {
      for (const e of v.events) {
        if (!e || !(e.seq > this.maxSeq)) continue;
        this.maxSeq = e.seq;
        if (e.sector && e.sector !== v.sectorId) continue;
        const m = fromEvent(e, v);
        if (m) out.push(m);
      }
    } else if (p) {
      // No event list (the demo, an M1 host): compare with the last view of this sector.
      if (v.crises > p.crises) out.push({ kind: 'crisis', n: v.crises, text: v.crisisName });
      if (v.stage !== p.stage) out.push({ kind: 'stage', n: v.stage });
      if (!p.steady && v.steady) out.push({ kind: 'steady' });
      if (!p.clear && v.clear) out.push({ kind: 'clear' });
      if (!p.settled && v.settled) out.push({ kind: 'settled', n: v.settledYear ?? undefined });
      const founded = v.apps.filter((a) => a.status === 'founded' && p.status.has(a.id) && p.status.get(a.id) !== 'founded');
      // Founding moments only when one or two places change at once (not on a jump or a load).
      if (founded.length <= 2) for (const a of founded) out.push({ kind: 'found', app: a.id, by: 'player' });
      for (const [id, lv] of commons) if ((p.commons.get(id) ?? 0) < lv) out.push({ kind: 'commons', id, n: lv });
      if (v.seams && v.seams.sunk > p.seams && v.seams.sunk === p.seams + 1) out.push({ kind: 'seamSunk', n: v.seams.sunk });
      for (const l of v.levers) if ((l.bite ?? 0) >= 0.5 && !p.bitten.has(l.id)) out.push({ kind: 'biteBack', id: l.id });
    }
    const bitten = new Set(v.levers.filter((l) => (l.bite ?? 0) >= 0.5).map((l) => l.id));
    this.prev.set(v.sectorId, { crises: v.crises, steady: !!v.steady, stage: v.stage, clear: !!v.clear, settled: !!v.settled, status, commons, seams: v.seams?.sunk ?? 0, bitten });
    if (quiet) return [];
    for (const m of out) {
      if (m.kind === 'crisis') { this.crisisUntil = now + 7200; this.caption = { text: m.text ?? v.crisisName, until: now + 7000, sector: v.sectorId }; }
      else if (m.kind === 'steady') this.caption = { text: 'The sky clears.', until: now + 6000, sector: v.sectorId };
      else if (m.kind === 'settled') this.caption = { text: m.n ? `Settled, ${m.n}.` : 'Settled.', until: now + 5000, sector: v.sectorId };
    }
    return out;
  }
}

function fromEvent(e: SceneEvent, v: SceneView): Moment | null {
  switch (e.kind) {
    case 'crisis': return { kind: 'crisis', n: e.n, text: v.crisisName };
    case 'appFounded': return e.by === 'default' ? null : { kind: 'found', app: e.id, by: e.by ?? 'player' };
    case 'upgradeBought': return e.by === 'market' ? { kind: 'scaffold', id: e.id, by: 'market' } : null;
    case 'stageReached': return { kind: 'stage', n: e.n, id: e.id };
    case 'leverEnacted': return { kind: 'lever', id: e.id, n: e.n, by: e.by };
    case 'decade': return { kind: 'decade', n: e.n, id: e.id };
    case 'clearSkies': return { kind: 'clear' };
    case 'steadyState': return { kind: 'steady' };
    case 'settled': return { kind: 'settled', n: v.settledYear ?? undefined };
    case 'sectorOpened': case 'ageBegins': return { kind: 'opened', id: e.id };
    case 'backfire': return { kind: 'backfire' };
    case 'commonsBuilt': return { kind: 'commons', id: e.id, n: e.n, by: e.by };
    case 'seamSunk': return { kind: 'seamSunk', id: e.id, n: e.n, text: e.label };
    case 'biteBack': return { kind: 'biteBack', id: e.id };
    case 'ending': return { kind: 'ending', id: e.id };
    default: return null;
  }
}
