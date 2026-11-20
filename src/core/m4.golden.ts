/**
 * M4 test support ("no fields, no change"): a scripted hour that touches most of the M3 game (greedy purchases and
 * foundings, every budget line, levers raised, settlements, letters answered, seams sunk, a fastForward, a Reckoning,
 * Know-how), folding per-step R, D, p_s, pressure and reserve of every open sector, capital, Mandate, population,
 * wellbeing and every event's kind into a hash, with a sample every 300 s. The golden values in m4.nochange.test.ts were
 * produced by the M3 core (12d42c3) before any M4 change; design/scratch/m4core/golden-real.ts does the same for the
 * real content of that commit (a snapshot in design/scratch/m4core/snap).
 */
import type { Content, GameState, ModelApi } from '../types';

export function trajectoryM4(model: ModelApi, C: Content, seconds = 3600): { hash: string; samples: number[][]; events: number } {
  let h1 = 0x811c9dc5 >>> 0, h2 = 0x01000193 >>> 0;
  const mixS = (s: string) => {
    for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0; h2 = Math.imul(h2 + s.charCodeAt(i), 2246822519) >>> 0; }
  };
  const mix = (x: number) => mixS(x.toPrecision(17));
  const samples: number[][] = [];
  let s: GameState = model.createState(C, undefined, 7);
  let lastSeq = 0;
  const half = Math.floor(seconds / 2);
  const step = (t: number) => {
    for (const v of model.upgradeViews(s, C)) if (v.visible && v.affordable && !v.excludedBy) s = model.buyUpgrade(s, C, v.def.id);
    for (const e of C.sectorOrder) if (s.sectors[e]?.open) for (const a of C.sectors[e].applications) s = model.foundApp(s, C, a.id);
    if (t % 50 === 0) {
      for (const e of C.sectorOrder) if (s.sectors[e]?.open && !s.sectors[e].budget) s = model.drawBudget(s, C, e);
      for (const lv of model.leverViews(s, C)) if (lv.visible && lv.canRaise && lv.level < 2) s = model.setLever(s, C, lv.def.id, lv.level + 1);
      const d = model.derive(s, C);
      for (const e of C.sectorOrder) if (d.sectors[e]?.canSettle) s = model.settle(s, C, e);
      for (const e of C.sectorOrder) s = model.sinkSeam(s, C, e);
    }
    if (t % 13 === 0 && s.dispatch.pending.length) {
      const p = s.dispatch.pending[0];
      const n = C.dispatches?.find((x) => x.id === p.id)?.arms.length ?? 1;
      s = model.answerDispatch(s, C, t % n, p.id);
    }
    if (t % 7 === 0) s = model.click(s, C);
    if (t === 1000) s = model.fastForward(s, C, 600);
    else s = model.tick(s, C, 1);
    const d = model.derive(s, C);
    for (const e of C.sectorOrder) {
      const x = d.sectors[e];
      if (x) { mix(x.resourceUse); mix(x.demand); mix(x.servicePrice); mix(x.pressureFraction); mix(x.reserveFraction); }
    }
    mix(s.capital); mix(s.mandate); mix(s.population); mix(d.wellbeing); mix(s.steadyYearsAll);
    for (const ev of s.events) if (ev.seq > lastSeq) { mixS(ev.kind); mixS(ev.sector ?? ''); mixS(ev.id ?? ''); lastSeq = ev.seq; }
    if (t % 300 === 0) samples.push([t, s.capital, d.wellbeing, ...C.sectorOrder.map((e) => d.sectors[e]?.resourceUse ?? -1)]);
  };
  for (let t = 1; t <= half; t++) step(t);
  s = model.reckon(s, C);
  for (const k of model.knowhowViews(s, C)) if (k.canBuy) s = model.buyKnowhow(s, C, k.def.id);
  for (let t = half + 1; t <= seconds; t++) step(t);
  return { hash: `${h1.toString(16)}-${h2.toString(16)}`, samples, events: s.meta.eventSeq };
}
