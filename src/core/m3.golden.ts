/**
 * M3 test support: a scripted one-hour trajectory on the M2 fixture (greedy purchases and foundings, a budget, a duty
 * and a cap, the Market on from a Reckoning, Know-how), returning per-step R, D and p_s of every open sector folded into
 * a hash, plus a sample every 300 s. The golden values in m3.nochange.test.ts were produced by the M2 core (5d6e410)
 * with design/scratch/m3core/golden.ts; the test checks the M3 core reproduces them exactly.
 */
import type { Content, GameState, ModelApi } from '../types';

export function trajectory(model: ModelApi, C: Content): { hash: string; samples: number[][] } {
  let h1 = 0x811c9dc5 >>> 0, h2 = 0x01000193 >>> 0;
  const mix = (x: number) => {
    const s = x.toPrecision(17);
    for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0; h2 = Math.imul(h2 + s.charCodeAt(i), 2246822519) >>> 0; }
  };
  const samples: number[][] = [];
  let s: GameState = model.createState(C, undefined, 11);
  const step = (t: number) => {
    for (const v of model.upgradeViews({ ...s, flags: { ...s.flags, revealed: false } }, C)) if (v.visible && v.affordable) s = model.buyUpgrade(s, C, v.def.id);
    for (const e of C.sectorOrder) if (s.sectors[e]?.open) for (const a of C.sectors[e].applications) s = model.foundApp(s, C, a.id);
    if (t === 400) s = model.drawBudget(s, C, 'steam');
    if (t === 500) s = model.setLever(s, C, 'steam.duty', 1);
    if (t === 900) s = model.setLever(s, C, 'steam.cap', 1);
    if (t % 7 === 0) s = model.click(s, C);
    s = model.tick(s, C, 1);
    const d = model.derive(s, C);
    for (const e of C.sectorOrder) { const x = d.sectors[e]; if (x) { mix(x.resourceUse); mix(x.demand); mix(x.servicePrice); } }
    mix(s.capital); mix(s.population); mix(d.wellbeing);
    if (t % 300 === 0) samples.push([t, s.capital, d.wellbeing, ...C.sectorOrder.map((e) => d.sectors[e]?.resourceUse ?? -1)]);
  };
  for (let t = 1; t <= 1800; t++) step(t);
  if (model.derive(s, C).pendingReckoning || s.time > 0) s = model.reckon(s, C);
  for (const k of model.knowhowViews(s, C)) if (k.canBuy) s = model.buyKnowhow(s, C, k.def.id);
  for (let t = 1801; t <= 3600; t++) step(t);
  return { hash: `${h1.toString(16)}-${h2.toString(16)}`, samples };
}
