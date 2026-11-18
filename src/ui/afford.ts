// The affordable signal: which purchases are worth telling the player about. Reads the views and derive() only; the
// model decides what is affordable, this decides what is news.
//
// The no-nag rule. An offer is news while it is affordable and the player has not yet passed it over. It is passed
// over when the player buys two *different* other things while it sits affordable (holding Buy on one repeatable card
// is one choice, not twenty). After that it stays affordable on its card, but leaves the count and the tab marker: the
// player has seen it and chosen otherwise. A repeatable card's next level is a new offer (its key carries the level),
// and every run starts with a clean slate. The memory lives in the UI preferences, so a reload does not undo it.
import type { GameState, SectorId } from '../types';
import type { Ctx } from './ctx';
import { openSectors } from './ctx';
import { getPrefs, setPrefs } from './prefs';

export interface AffordItem {
  /** Offer key: `u:<upgrade>@<level>` or `a:<sector>:<app>`. */
  key: string;
  kind: 'up' | 'app';
  id: string;
  sector: SectorId;
  cost: number;
}

export interface AffordState {
  /** Offers that are news, current industry first, then in tab order; within one, cheapest first. */
  items: AffordItem[];
  bySector: Map<SectorId, number>;
}

const PASS_LIMIT = 2;

function runKey(s: GameState): string {
  return `${s.seed ?? 0}:${s.meta?.reckonings ?? 0}`;
}

export function createAfford(ctx: Ctx): { state: AffordState; update(): void; afterAct(before: GameState, after: GameState): string[] } {
  const state: AffordState = { items: [], bySector: new Map() };
  /** Every affordable offer at the last update, passed over or not (for recording pass-overs). */
  let affordable: AffordItem[] = [];

  function passed(): Record<string, string[]> {
    const p = getPrefs().passed;
    return p.run === runKey(ctx.state) ? p.ids : {};
  }

  function update(): void {
    const all: AffordItem[] = [];
    if (!ctx.d?.pendingReckoning) {
      const open = new Set(openSectors(ctx));
      for (const v of ctx.ups || []) {
        if (!v?.def || !v.visible || v.maxed || !v.affordable || !open.has(v.def.sector)) continue;
        all.push({ key: `u:${v.def.id}@${v.level}`, kind: 'up', id: v.def.id, sector: v.def.sector, cost: v.cost });
      }
      for (const id of open) {
        const apps = ctx.d?.sectors?.[id]?.apps;
        const def = ctx.content.sectors?.[id];
        if (!apps || !def) continue;
        for (const a of def.applications || []) {
          const v = apps[a.id];
          if (v && v.canFound && !v.founded) all.push({ key: `a:${id}:${a.id}`, kind: 'app', id: a.id, sector: id, cost: a.foundCost ?? 0 });
        }
      }
    }
    affordable = all;
    const pass = passed();
    const order = openSectors(ctx);
    const rank = (s: SectorId) => (s === ctx.sector ? -1 : order.indexOf(s));
    state.items = all.filter((x) => (pass[x.key]?.length ?? 0) < PASS_LIMIT)
      .sort((a, b) => rank(a.sector) - rank(b.sector) || (a.kind === b.kind ? 0 : a.kind === 'up' ? -1 : 1) || a.cost - b.cost);
    state.bySector = new Map();
    for (const x of state.items) state.bySector.set(x.sector, (state.bySector.get(x.sector) ?? 0) + 1);
  }

  /** After an accepted action: what was bought (choice keys), and the pass-overs it implies. */
  function afterAct(before: GameState, after: GameState): string[] {
    const bought: string[] = [];
    const bu = before.upgrades || {}, au = after.upgrades || {};
    for (const id of Object.keys(au)) if ((au[id] ?? 0) > (bu[id] ?? 0)) bought.push('u:' + id);
    for (const sid of Object.keys(after.sectors || {})) {
      const ba = before.sectors?.[sid]?.apps || {}, aa = after.sectors[sid]?.apps || {};
      for (const id of Object.keys(aa)) if (aa[id]?.founded && !ba[id]?.founded) bought.push(`a:${sid}:${id}`);
    }
    if (!bought.length || runKey(before) !== runKey(after)) return bought;
    const rk = runKey(after);
    const p = getPrefs().passed;
    const ids: Record<string, string[]> = p.run === rk ? { ...p.ids } : {};
    let changed = p.run !== rk;
    for (const x of affordable) {
      const choice = x.kind === 'up' ? 'u:' + x.id : x.key;
      if (bought.includes(choice)) continue;
      const list = ids[x.key] ?? [];
      const add = bought.filter((b) => !list.includes(b));
      if (!add.length || list.length >= PASS_LIMIT) continue;
      ids[x.key] = [...list, ...add].slice(0, PASS_LIMIT);
      changed = true;
    }
    if (changed) setPrefs({ passed: { run: rk, ids } });
    return bought;
  }

  return { state, update, afterAct };
}
