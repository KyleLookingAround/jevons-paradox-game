/**
 * Upgrade cards: the "this decade" and "brings within reach" projections (two simulated clones, cached), and the
 * upgrade views.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import type { Content, GameState, UpgradeDef, UpgradeView } from '../types';
import { PROJECTION_SECONDS, PROJECTION_DT } from './constants';
import { idx } from './contentIndex';
import { modsOf } from './effects';
import { computeFlows } from './flows';
import { applyUpgrade, upgradeCost, upgradeMax, upgradeVisible, upgradeExcludedBy } from './purchases';
import { step } from './step';
import { fin } from './util';

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */

function simulate(state: GameState, content: Content, seconds: number, dt: number): GameState {
  let s = state;
  const n = Math.ceil(seconds / dt - 1e-9);
  for (let i = 0; i < n; i++) {
    const t = step(s, content, dt, true);
    if (t === s) break;
    s = t;
  }
  return s;
}

interface Projection { projectedDecade: number | null; bringsWithinReach: { appId: string; projectedChange: number }[] }
const projCache = new WeakMap<object, { t: number; meta: object; levers: object; sig: string; content: Content; res: Map<string, Projection>; base: GameState | null }>();

function foundedSig(state: GameState, content: Content): string {
  let sig = '';
  for (const s of idx(content).ids) {
    const es = state.sectors[s];
    if (!es?.open) continue;
    sig += s;
    for (const a of content.sectors[s].applications) sig += es.apps[a.id]?.founded ? '1' : es.apps[a.id]?.available ? 'a' : '0';
  }
  return sig;
}

function projectionFor(state: GameState, content: Content, def: UpgradeDef): Projection {
  const t = Math.round(state.time);
  const sig = foundedSig(state, content);
  let entry = projCache.get(state.upgrades);
  if (!entry || entry.t !== t || entry.meta !== state.meta || entry.levers !== state.levers || entry.sig !== sig || entry.content !== content) {
    entry = { t, meta: state.meta, levers: state.levers, sig, content, res: new Map(), base: null };
    projCache.set(state.upgrades, entry);
  }
  const hit = entry.res.get(def.id);
  if (hit) return hit;
  entry.base ??= simulate(state, content, PROJECTION_SECONDS, PROJECTION_DT);
  const without = entry.base;
  const withIt = simulate(applyUpgrade(state, content, def, state.time), content, PROJECTION_SECONDS, PROJECTION_DT);
  const fw = computeFlows(withIt, content);
  const rWithout = computeFlows(without, content).sectors[def.sector]?.R ?? 0;
  const rWith = fw.sectors[def.sector]?.R ?? 0;
  const projectedDecade = rWithout > 0 ? fin(rWith / rWithout - 1) : null;
  const bring: Projection['bringsWithinReach'] = [];
  if (projectedDecade !== null) {
    const sd = content.sectors[def.sector];
    const esNow = state.sectors[def.sector];
    const esW = withIt.sectors[def.sector];
    const esO = without.sectors[def.sector];
    const cands = sd.applications
      .filter((a) => !esNow?.apps[a.id]?.available && esW?.apps[a.id]?.available && !esO?.apps[a.id]?.available)
      .sort((a, b) => b.visibleBelow - a.visibleBelow);
    for (const a of cands) {
      const founded: GameState = {
        ...withIt,
        sectors: { ...withIt.sectors, [def.sector]: { ...esW, apps: { ...esW.apps, [a.id]: { ...esW.apps[a.id], available: true, founded: true } } } },
      };
      const r1 = computeFlows(founded, content).sectors[def.sector]?.R ?? 0;
      bring.push({ appId: a.id, projectedChange: rWith > 0 ? fin(r1 / rWith - 1) : 0 });
    }
  }
  const out: Projection = { projectedDecade, bringsWithinReach: bring };
  entry.res.set(def.id, out);
  return out;
}

export function upgradeViews(state: GameState, content: Content): UpgradeView[] {
  const mods = modsOf(state, content);
  const out: UpgradeView[] = [];
  for (const def of content.upgrades ?? []) {
    const level = state.upgrades[def.id] ?? 0;
    const maxed = level >= upgradeMax(def);
    const cost = upgradeCost(def, level, mods);
    const visible = upgradeVisible(state, def, mods);
    const excludedBy = level >= 1 ? null : upgradeExcludedBy(state, content, def.id);
    let promisedChange: number | null = null;
    if (def.kind === 'efficiency') {
      let m = 1;
      for (const ef of def.effects) if (ef.type === 'etaMul') m *= ef.value;
      promisedChange = 1 / m - 1;
    }
    let proj: Projection = { projectedDecade: null, bringsWithinReach: [] };
    if ((def.kind === 'efficiency' || def.kind === 'capital') && state.flags.revealed && visible && !maxed && !excludedBy) {
      proj = projectionFor(state, content, def);
    }
    out.push({
      def, level, cost, visible, affordable: visible && !maxed && !excludedBy && state.capital >= cost, maxed, excludedBy,
      promisedChange, projectedDecade: proj.projectedDecade, bringsWithinReach: proj.bringsWithinReach,
    });
  }
  return out;
}
