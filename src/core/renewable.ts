/**
 * M4: the renewable stock (SectorDef.resourceKind 'renewable', RenewableDef) and its foreign fleets (ForeignDef):
 * regrowth G(Q), the reported stock and the price it sets, the foreign share and catch, the stock's step with its
 * substeps, the scar (meta.world.scars), and the sink line of a depletion sector. Pure arithmetic: flows.ts, step.ts,
 * steady.ts and derive.ts call it.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { RENEWABLE_SUBSTEP_SHARE, RENEWABLE_SUBSTEPS_MAX, RENEWABLE_FLOOR } from '../types';
import type { MetaState, RenewableDef, SectorDef, SectorId, SectorState } from '../types';
import { fin, clamp } from './util';

/** The renewable def of a sector that has one and is 'renewable' (else undefined). */
export const renewableOf = (def: SectorDef | undefined): RenewableDef | undefined =>
  def && def.resourceKind === 'renewable' && def.renewable ? def.renewable : undefined;

/** K: the natural size (SectorDef.reserve, not changed by reserveAdd). */
export const sizeOf = (def: SectorDef): number => Math.max(1e-12, fin(def.reserve, 1));

/** The scar on sector s (meta.world.scars), or undefined. */
export function scarOf(meta: MetaState, s: SectorId): { yearsLeft: number; since: number } | undefined {
  const sc = meta.world?.scars?.[s];
  return sc && sc.yearsLeft > 0 ? sc : undefined;
}
/** s in G: scar.mul while scarred, else 1. */
export function scarMulOf(r: RenewableDef, meta: MetaState, s: SectorId): number {
  return scarOf(meta, s) ? clamp(fin(r.scar?.mul ?? 1, 1), 0, 1) : 1;
}

/** G(Q) = regen × Q × (1 − Q/K) × d × s; d = collapsed below the threshold. */
export function growthOf(r: RenewableDef, K: number, Q: number, sMul: number): number {
  const d = Q < r.threshold * K ? clamp(fin(r.collapsed), 0, 1) : 1;
  return fin(Math.max(0, r.regen) * Q * (1 - Q / K) * d * sMul);
}

/** Catch per trip: (Q/K)^beta, 0–1. */
export function reportedOf(r: RenewableDef, K: number, Q: number): number {
  const b = r.beta > 0 && r.beta <= 1 ? r.beta : 1;
  return clamp(Math.pow(clamp(Q / K, 0, 1), b), 0, 1);
}

/** p_r before resourcePriceMul: basePrice × reported^(−alpha) (the floor keeps it finite). */
export function renewablePrice(def: SectorDef, r: RenewableDef, Q: number): number {
  const K = sizeOf(def);
  const rep = Math.max(reportedOf(r, K, Math.max(Q, RENEWABLE_FLOOR * K)), 1e-12);
  return def.basePrice * Math.pow(rep, -def.alpha);
}

/** The foreign share: clamp(share0 × (basePs / p_s)^growth × Π foreignMul, 0, cap); 0 without ForeignDef. */
export function foreignShareOf(r: RenewableDef, es: SectorState, ps: number, foreignMul: number): number {
  const f = r.foreign;
  if (!f) return 0;
  const cap = clamp(fin(f.cap), 0, 0.999);
  const rel = es.basePs > 0 && ps > 0 ? Math.pow(es.basePs / ps, fin(f.growth)) : 1;
  return clamp(fin(f.share0 * rel * foreignMul), 0, cap);
}
/** R_foreign = R_home × share / (1 − share). */
export const foreignCatch = (Rhome: number, share: number): number => (share > 0 && share < 1 ? fin(Rhome * share / (1 - share)) : 0);

/**
 * The stock's step (RenewableDef): dQ/dt = G(Q) − R_home × (1 − circ) − R_foreign over dt (integrated by RK4), split into
 * n = min(MAX, ceil(|dQ| / (SHARE × K))) substeps when |dQ| over the step exceeds SHARE × K; G re-evaluated per substep
 * (R_home and R_foreign held at the step's); clamped to [FLOOR × K, K] after each substep. Returns Q and the lowest Q
 * passed through.
 */
export function stepStock(r: RenewableDef, K: number, Q0: number, Rhome: number, circ: number, Rforeign: number, sMul: number, dt: number): number {
  const out = Math.max(0, Rhome * (1 - circ)) + Math.max(0, Rforeign);
  const lo = RENEWABLE_FLOOR * K;
  const d0 = (growthOf(r, K, Q0, sMul) - out) * dt;
  const n = Math.abs(d0) > RENEWABLE_SUBSTEP_SHARE * K ? Math.min(RENEWABLE_SUBSTEPS_MAX, Math.ceil(Math.abs(d0) / (RENEWABLE_SUBSTEP_SHARE * K))) : 1;
  const h = dt / n;
  const rate = (q: number) => growthOf(r, K, clamp(q, lo, K), sMul) - out;
  let Q = Q0;
  for (let i = 0; i < n; i++) {
    // classical Runge–Kutta on dQ/dt = G(Q) − out (explicit; G re-evaluated within the substep, the catch held): the
    // logistic recovery tracks its closed form to about 1e-9 K over 200 s at a one-second step, where Euler drifts 5e-4 K
    const k1 = rate(Q), k2 = rate(Q + 0.5 * h * k1), k3 = rate(Q + 0.5 * h * k2), k4 = rate(Q + h * k3);
    Q = clamp(fin(Q + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4), lo), lo, K);
  }
  return Q;
}

/**
 * The sink line of a depletion sector: the home catch that holds the stock at its clear level Q_clear = K × (1 − clearP
 * / collapseAt): sinkR = G(Q_clear) / ((1 − circ) + share / (1 − share)). The TRUE value (the page hides it while
 * unsurveyed). null without clearP.
 */
export function depletionSinkR(def: SectorDef, r: RenewableDef, clearP: number | null, circ: number, share: number, sMul: number, rho = 0): number | null {
  if (clearP === null || !(def.collapseAt > 0)) return null;
  const K = sizeOf(def);
  const Qc = clamp(K * (1 - clearP / def.collapseAt), 0, K);
  const den = Math.max(1e-12, (1 - circ) + (share > 0 && share < 1 ? share / (1 - share) : 0));
  const G = growthOf(r, K, Qc, sMul);
  if (!(rho > 0)) return fin(G / den);
  // M4 (finish): foreign boats also take rho of the surplus the home catch leaves (ForeignDef.room):
  // R(1 − circ) + R s/(1 − s) + rho (G − R) = G  ⇒  R = G (1 − rho) / (den − rho)
  return fin(G * (1 - rho) / Math.max(1e-12, den - rho));
}
/** M4 (finish): the room term's weight now: ForeignDef.room × foreignMul, clamped to [0, 0.99]. 0 without room. */
export function foreignRoomOf(r: RenewableDef, foreignMul: number): number {
  const room = r.foreign?.room;
  return room !== undefined && room > 0 ? clamp(fin(room * foreignMul), 0, 0.99) : 0;
}

/** The stock a run (or a sector opening mid-run) starts with: K, or min(K, startScarred × K) while scarred. */
export function startStockOf(def: SectorDef, meta: MetaState): number {
  const r = renewableOf(def);
  const K = sizeOf(def);
  if (!r || !scarOf(meta, def.id)) return K;
  const f = r.startScarred !== undefined && Number.isFinite(r.startScarred) ? r.startScarred : r.threshold;
  return clamp(Math.min(K, f * K), RENEWABLE_FLOOR * K, K);
}
