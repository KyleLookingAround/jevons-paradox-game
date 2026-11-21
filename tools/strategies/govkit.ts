/**
 * M5 regulator bots (design/m5-design.md §15): what a government does each second of a Ministry, through the model API
 * and derive() only (no rules of their own). Five strategies:
 *   abstain   never touches a lever (pledges left to their default).
 *   naive     raises the cheapest lever it can afford whenever Mandate allows; never amends, inspects or compensates.
 *   hawk      every lever up as fast as Mandate allows (cheapest first), caps and charges included.
 *   steward   draws a line in each chair Industry, holds it (raise the cheapest levy or cap while over the line, recycled
 *             as a dividend), reads the rival's answer where the core gives one (prefers a lever he would comply with),
 *             amends rungs as they open, inspects on cooldown (the longest-unvisited Industry), compensates closures,
 *             chooses pledges that bind nothing it needs (else the mildest), campaigns in Opposition.
 *   humanGov  the steward acting every 10 s, with the default pledges (no sheet read).
 * Each strategy: (state, content, t) → state, called once a second of run time by the harness (tools/balance.m5.ts).
 */
import { model } from '../../src/core';
import type { Content, GameState, LeverView, SectorId } from '../../src/types';

export type GovStrategy = (s: GameState, c: Content, t: number) => GameState;

export const chairSectors = (s: GameState, c: Content): SectorId[] => {
  const out: SectorId[] = [];
  for (const id of c.sectorOrder) {
    const es = s.sectors[id];
    if (!es?.open || es.settled || es.capstoned) continue;
    const age = (c.ages ?? []).find((a) => (a.sectors ?? []).includes(id));
    const act = (c.acts ?? []).find((a) => age && a.ages.includes(age.id));
    if (act?.chair === 'government') out.push(id);
  }
  return out;
};

/** M5: Mandate a steward would pay to avoid a point of Confidence (a lever's popularity on enactment). */
// GOV_POP_MANDATE=0 gives the steward who ignores a lever's popularity (straight to the duty): an experiment knob.
const POP_MANDATE = Number((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.GOV_POP_MANDATE ?? 60);
const popularityCost = (v: LeverView): number => {
  const p = v.def.popularity;
  if (!p) return 0;
  // the next level takes what one level's term is now (the start figure from level 0)
  const term = v.level === 0 ? p.start : (v.popularity ?? 0) / Math.max(1, v.level);
  return Math.max(0, -term) * POP_MANDATE;
};
/** Raise one level of the cheapest raisable lever among `list` (Mandate, plus `extra` if given); the same state if none. */
function raiseCheapest(s: GameState, c: Content, list: LeverView[], extra: (v: LeverView) => number = () => 0): GameState {
  const ok = list.filter((v) => v.visible && v.canRaise && v.nextCost !== null).sort((a, b) => (a.nextCost! + extra(a)) - (b.nextCost! + extra(b)));
  for (const v of ok) {
    const n = model.setLever(s, c, v.def.id, v.level + 1);
    if (n !== s) return n;
  }
  return s;
}

/** Pledges: keep the `keep` that bind nothing the steward needs (no binds first, then by confidence). */
function choosePledges(s: GameState, c: Content): GameState {
  const ch = s.chair;
  if (!ch || !ch.parliament.offer || ch.parliament.chosen || !c.chair) return s;
  const px = new Map((c.pledges ?? []).map((p) => [p.id, p]));
  const keep = c.chair.elections.keep;
  const ids = ch.parliament.offer.slice().sort((a, b) => {
    const pa = px.get(a)!, pb = px.get(b)!;
    return (pa.binds ? 1 : 0) - (pb.binds ? 1 : 0) || (pb.atPoll ?? pb.confidence) - (pa.atPoll ?? pa.confidence);
  }).slice(0, keep);
  return model.choosePledges(s, c, ids);
}

export const abstain: GovStrategy = (s) => s;

export const naive: GovStrategy = (s, c) => raiseCheapest(s, c, model.leverViews(s, c).filter((v) => chairSectors(s, c).includes(v.def.sector)));

export const hawk: GovStrategy = (s, c) => {
  let x = s;
  for (let i = 0; i < 20; i++) {
    const n = raiseCheapest(x, c, model.leverViews(x, c).filter((v) => chairSectors(x, c).includes(v.def.sector) && v.def.kind !== 'subsidy'));
    if (n === x) break;
    x = n;
  }
  return x;
};

const LEVY = new Set(['duty', 'cap', 'charge', 'quota']);
/** M5 balance: the levers that lower the burn under a held line (towards the clear sky a settlement needs), in the
 *  order a steward reaches for them: the line's own instrument (the quota tightened), rail, walking distance, the
 *  levies; the standard only with the duty in force (without it the cheaper mile adds miles: its catch says so). */
const SKY_KINDS = new Set(['cap', 'quota', 'substitution', 'sufficiency', 'duty', 'charge']);
/** Per-state memory of the steward (keyed on nothing the model sees: one bot instance per campaign). */
interface Memo { overSince: Record<string, number>; lastSky: Record<string, number>; skyP: Record<string, number> }
const memoOf = new WeakMap<object, Memo>();
let memoKey: object = {};
/** A new campaign (the harness calls it between profiles): forgets the over-the-line and sky timers. */
export function resetGovMemo(): void { memoKey = {}; }
const memo = (): Memo => { let m = memoOf.get(memoKey); if (!m) { m = { overSince: {}, lastSky: {}, skyP: {} }; memoOf.set(memoKey, m); } return m; };
/** The pace a steward draws at: the middle one once paces are offered (the human Act I player's), else the default. */
const stewardPace = (c: Content, id: SectorId): string | undefined => {
  const paces = c.sectors[id]?.steady?.paces ?? c.global.steady?.paces ?? [];
  return paces.length >= 2 ? paces[1].id : undefined;
};

function stewardOnce(s0: GameState, c: Content, readSheet: boolean, every: number): GameState {
  let s = s0;
  if (!s.chair) return s;
  const d = model.derive(s, c);
  if (d.pendingReckoning) return s;
  const mm = memo();
  // pledges, campaign
  if (readSheet) s = choosePledges(s, c);
  if (s.chair!.inOpposition && s.mandate > 40) s = model.campaign(s, c, Math.floor(s.mandate / 2));
  for (const id of chairSectors(s, c)) {
    const sd = model.derive(s, c).sectors[id];
    if (!sd) continue;
    if (sd.budgetR === null) { s = model.drawBudget(s, c, id, stewardPace(c, id)); continue; }
    const views = model.leverViews(s, c).filter((v) => v.def.sector === id);
    // recycle every levy as a dividend (it offsets the price in Confidence)
    for (const v of views) if (v.level > 0 && v.recycle !== 'dividend' && v.recycleOptions.includes('dividend')) s = model.setLeverRecycle(s, c, v.def.id, 'dividend');
    // M5 balance: the burn as the page shows it (as reported, unless an inspection is showing the truth)
    const shown = sd.reportedR ?? sd.resourceUse;
    const over = shown > sd.budgetR * 1.01;
    if (over) mm.overSince[id] ??= s.time; else delete mm.overSince[id];
    if (over) {
      // M5 (registry lane): the card prints the lever's Confidence term (LeverDef.popularity) as well as Pryce's answer;
      // the steward weighs both. Candidates: the levies and the standard-style measures (the road programme, which adds
      // traffic, is no answer to a line); cost = Mandate + POP_MANDATE Mandate a point of Confidence the lever would take
      // on enactment. Prefer levers he would comply with (or evade: a rung is a lesson, and the bot amends it).
      const cands = model.leverViews(s, c).filter((v) => v.def.sector === id
        && (LEVY.has(v.def.kind) || (v.def.kind === 'measure' && (v.def.ladder?.length ?? 0) > 0)));
      const ok = cands.filter((v) => v.visible && v.canRaise && v.nextCost !== null);
      const fine = ok.filter((v) => !v.rivalAnswer || ['comply', 'evade'].includes(v.rivalAnswer.chosen));
      const n = raiseCheapest(s, c, fine.length ? fine : ok, popularityCost);
      // M5 balance: a line a long way under the burn for a minute and a half, with nothing left to raise that would
      // bring it back, is redrawn at today's burn (a person does not keep a line nobody can meet: its clear level was
      // set by the smoke on the day it was drawn)
      if (n === s && shown > sd.budgetR * 1.25 && s.time - mm.overSince[id] >= 90) {
        const r = model.drawBudget(s, c, id, stewardPace(c, id));
        if (r !== s) { s = r; delete mm.overSince[id]; continue; }
      }
      s = n;
    } else if (sd.clearP !== null && s.sectors[id].pressure > sd.clearP && sd.sinkR !== null && shown > sd.sinkR * 0.97
      && s.time - (mm.lastSky[id] ?? -Infinity) >= 30) {
      // M5 balance: towards a clear sky (the Act I `--ending` player's rule, towardsSky in tools/balance.ts): under a held
      // line whose sky has not cleared, the steward pushes the burn down to the sink line the page draws, one level every
      // 30 s while the smoke is not already falling (3% in 30 s), weighing each lever's Mandate, its popularity and
      // Pryce's answer as above. Settlement (and so the Treaty) needs fifty clear years.
      const p0 = mm.skyP[id];
      mm.skyP[id] = s.sectors[id].pressure;
      mm.lastSky[id] = s.time;
      if (p0 === undefined || s.sectors[id].pressure >= p0 * 0.97) {
        const duty = views.some((v) => v.def.kind === 'duty' && v.level > 0);
        const cands = model.leverViews(s, c).filter((v) => v.def.sector === id
          && (SKY_KINDS.has(v.def.kind) || (duty && v.def.kind === 'measure' && (v.def.ladder?.length ?? 0) > 0)));
        const ok = cands.filter((v) => v.visible && v.canRaise && v.nextCost !== null);
        const fine = ok.filter((v) => !v.rivalAnswer || ['comply', 'evade'].includes(v.rivalAnswer.chosen));
        s = raiseCheapest(s, c, fine.length ? fine : ok, popularityCost);
      }
    }
    // M5 (registry lane): settle a chair Industry as soon as it can be (Steady State on its line: the Treaty's gate)
    if (model.derive(s, c).sectors[id]?.canSettle) { const n = model.settle(s, c, id); if (n !== s) { s = n; continue; } }
    // compensate a closure
    const comp = model.derive(s, c).chair?.compensation?.[id];
    if (comp?.canCompensate && comp.cost < s.capital * 0.5) s = model.compensate(s, c, id);
  }
  // amend every rung that can be
  for (const l of model.derive(s, c).chair?.loopholes ?? []) if (l.canAmend) s = model.amend(s, c, l.id);
  // inspect on cooldown. M5 balance: first a chair Industry under a line whose quiet period is nearly up (the one the
  // steward is trying to settle: concealment there breaks the clear streak and the decades), then the longest-unvisited
  const ch = s.chair!;
  const quiet = model.derive(s, c).chair?.rival.quietYears ?? 6;
  const since = (x: SectorId) => (s.time - (ch.inspected[x] ?? -1e9)) * 0.05;
  const urgent = chairSectors(s, c).filter((x) => s.sectors[x]?.budget && since(x) >= quiet - 1).sort((a, b) => since(b) - since(a));
  const sec = urgent.concat(chairSectors(s, c).concat(c.sectorOrder.filter((x) => s.sectors[x]?.capstoned))
    .sort((a, b) => (ch.inspected[a] ?? -1) - (ch.inspected[b] ?? -1)));
  for (const id of sec) { const n = model.inspect(s, c, id); if (n !== s) { s = n; break; } }
  void every;
  return s;
}
export const steward: GovStrategy = (s, c) => stewardOnce(s, c, true, 1);
export const humanGov: GovStrategy = (s, c, t) => (Math.floor(t) % 10 === 0 ? stewardOnce(s, c, false, 10) : s);

export const GOV: Record<string, GovStrategy> = { abstain, naive, hawk, steward, humanGov };
