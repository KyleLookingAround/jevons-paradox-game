// Content lint: structural checks on src/content/ that no simulation is needed for.
// bun-types are not installed and tsconfig has "types": [], so the test runner's own module has no declarations.
// @ts-ignore
import { describe, expect, test } from 'bun:test';
import { content } from './index';
import type { Cond, EffectDef, HeadlineKey, StatKey } from '../types';
import { FEATURE_IDS } from '../types';

const C = content;
const sectorIds = Object.keys(C.sectors);
const apps = sectorIds.flatMap((s) => C.sectors[s].applications.map((a) => ({ ...a, sector: s })));
const appSector = new Map(apps.map((a) => [a.id, a.sector]));
const upgradeIds = new Set(C.upgrades.map((u) => u.id));
const leverIds = new Set(C.levers.map((l) => l.id));
const instIds = new Set(C.institutions.map((i) => i.id));
const khIds = new Set(C.knowhow.map((k) => k.id));
const achIds = new Set(C.achievements.map((a) => a.id));
/* M2 */
const dividends = C.dividends ?? [];
const commons = C.commons ?? [];
const charters = C.charters ?? [];
const divIds = new Set(dividends.map((d) => d.id));
const commonsIds = new Set(commons.map((c) => c.id));
const charterIds = new Set(charters.map((c) => c.id));
/** Everything a Cond `owns` leaf may name (M2: Commons projects, Charters, dividends, and sector ids). */
const ownable = new Set([
  ...upgradeIds, ...apps.map((a) => a.id), ...leverIds, ...instIds, ...khIds, ...achIds,
  ...divIds, ...commonsIds, ...charterIds, ...sectorIds,
]);

const ALL_KEYS: HeadlineKey[] = [
  'appFounded', 'appAvailable', 'sectorOpened', 'crisis', 'collapse', 'exhausted', 'backfire', 'reveal',
  'leverEnacted', 'leverLapsed', 'steadySector', 'steadyAll', 'reckoning', 'efficiency',
  'ageBegins', 'budgetDrawn', 'decade', 'budgetBroken',
  'clearSkies', 'settled', 'unsettled', 'commonsBuilt', 'charter',
];
const SECTOR_SCOPED: StatKey[] = [
  'etaFold', 'rFold', 'frontierFold', 'peakRFold', 'rebound', 'resourceUse', 'demand', 'servicePrice',
  'serviceDelivered', 'reserveFraction', 'pressureFraction', 'crises', 'steadyYears', 'budgetDecades',
  'withinBudget', 'appsFounded',
  'settled', 'clear', 'clearYears',
];
const APP_SCOPED: StatKey[] = ['adoption', 'appDemand'];

/** Every effect anywhere in content, with where it came from. */
function allEffects(): { where: string; e: EffectDef }[] {
  const out: { where: string; e: EffectDef }[] = [];
  for (const u of C.upgrades) for (const e of u.effects) out.push({ where: u.id, e });
  for (const k of C.knowhow) for (const e of k.effects) out.push({ where: k.id, e });
  for (const i of C.institutions) {
    for (const e of i.effects) out.push({ where: i.id, e });
    for (const l of i.nextLevels ?? []) for (const e of l.effects) out.push({ where: i.id, e });
  }
  for (const e of C.global.steady?.decadeEffects ?? []) out.push({ where: 'global.steady', e });
  for (const e of C.global.steady?.firstSteadyEffects ?? []) out.push({ where: 'global.steady', e });
  for (const s of sectorIds) for (const e of C.sectors[s].steady?.decadeEffects ?? []) out.push({ where: s, e });
  /* M2 */
  for (const d of dividends) for (const e of d.effects) out.push({ where: d.id, e });
  for (const c of commons) for (const e of c.effects ?? []) out.push({ where: c.id, e });
  for (const c of charters) for (const e of c.effects) out.push({ where: c.id, e });
  for (const s of sectorIds) for (const e of C.sectors[s].settle?.dividend ?? []) out.push({ where: `${s}.settle`, e });
  return out;
}

/** Every Cond in content, with where it came from. */
function allConds(): { where: string; c: Cond }[] {
  const out: { where: string; c: Cond }[] = [];
  const walk = (where: string, c: Cond) => {
    out.push({ where, c });
    if ('all' in c) c.all.forEach((x) => walk(where, x));
    if ('any' in c) c.any.forEach((x) => walk(where, x));
    if ('not' in c) walk(where, c.not);
  };
  for (const s of sectorIds) { const w = C.sectors[s].unlock?.when; if (w) walk(`${s}.unlock`, w); }
  for (const a of C.achievements) if (a.when) walk(a.id, a.when);
  for (const c of commons) if (c.requires) walk(c.id, c.requires);
  for (const c of charters) if (c.requires) walk(c.id, c.requires);
  for (const [id, f] of Object.entries(C.features ?? {})) if (f) walk(`feature.${id}`, f.when);
  return out;
}

/** Keys whose string values are ids, codes or enums rather than words a player reads. */
const NON_TEXT_KEYS = new Set([
  'id', 'icon', 'theme', 'accent', 'kind', 'type', 'sector', 'app', 'lever', 'to', 'owns', 'flag', 'stat', 'op',
  'resourceKind', 'pressureSource', 'tree', 'branch', 'requires', 'excludes', 'after', 'sectors', 'sectorOrder',
  'recycle',
  /* M2 */
  'landmark', 'order', 'decadeChoices', 'holdBefore', 'decadeWellbeing', 'pace',
]);

/** Every player-facing string (with a path for error messages). Headline keys and sector keys are not text. */
function playerText(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (path: string, v: unknown, key: string) => {
    if (NON_TEXT_KEYS.has(key)) return;
    if (typeof v === 'string') { out.push({ path, text: v }); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(`${path}[${i}]`, x, key)); return; }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(`${path}.${k}`, x, k);
  };
  walk('content', C, '');
  return out;
}

/** Placeholders like {sector} are substituted before display; strip them before checking words. */
const stripPlaceholders = (t: string) => t.replace(/\{[a-z]+\}/g, '');

describe('ids', () => {
  test('unique across the whole game', () => {
    const all = [
      ...sectorIds, ...C.ages.map((a) => a.id), ...apps.map((a) => a.id), ...C.upgrades.map((u) => u.id),
      ...C.levers.map((l) => l.id), ...C.knowhow.map((k) => k.id), ...C.institutions.map((i) => i.id),
      ...C.achievements.map((a) => a.id),
      ...dividends.map((d) => d.id), ...commons.map((c) => c.id), ...charters.map((c) => c.id),
    ];
    const seen = new Set<string>();
    const dupes = all.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(dupes).toEqual([]);
  });

  test('the v1 sector ids are kept (saves depend on them)', () => {
    expect(C.sectorOrder).toEqual(['steam', 'light', 'motion', 'compute', 'code']);
  });

  test('sector keys match their ids', () => {
    for (const s of sectorIds) expect(C.sectors[s].id).toBe(s);
  });
});

describe('sectors and ages', () => {
  test('sectorOrder lists every sector exactly once', () => {
    expect([...C.sectorOrder].sort()).toEqual([...sectorIds].sort());
    expect(new Set(C.sectorOrder).size).toBe(C.sectorOrder.length);
  });

  test('every sector is in exactly one age', () => {
    for (const s of sectorIds) expect(C.ages.filter((a) => a.sectors.includes(s)).length).toBe(1);
    for (const a of C.ages) for (const s of a.sectors) expect(sectorIds).toContain(s);
  });

  test('age spans ascend and are well formed', () => {
    for (const a of C.ages) expect(a.yearSpan[0]).toBeLessThan(a.yearSpan[1]);
    for (let i = 1; i < C.ages.length; i++) {
      expect(C.ages[i].yearSpan[0]).toBeGreaterThan(C.ages[i - 1].yearSpan[0]);
      expect(C.ages[i].yearSpan[1]).toBeGreaterThan(C.ages[i - 1].yearSpan[1]);
    }
  });

  test('firstYear sits inside its age and sectors open in calendar order', () => {
    let last = -Infinity;
    for (const s of C.sectorOrder) {
      const def = C.sectors[s];
      const age = C.ages.find((a) => a.sectors.includes(s))!;
      const fy = def.firstYear ?? age.yearSpan[0];
      expect(fy).toBeGreaterThanOrEqual(age.yearSpan[0]);
      expect(fy).toBeLessThanOrEqual(age.yearSpan[1]);
      expect(fy).toBeGreaterThanOrEqual(last);
      last = fy;
    }
  });

  test('every sector after the first has a milestone unlock with labelled conditions', () => {
    C.sectorOrder.forEach((s, i) => {
      const u = C.sectors[s].unlock;
      if (i === 0) { expect(u).toBeUndefined(); return; }
      expect(u).toBeDefined();
      expect(u!.prevServicePriceBelow).toBeUndefined();
      const w = u!.when!;
      expect(w && 'all' in w).toBe(true);
      if ('all' in w) {
        expect(w.all.length).toBeGreaterThan(0);
        for (const c of w.all) expect(typeof c.label === 'string' && c.label.length > 0).toBe(true);
      }
      for (const a of u!.after ?? []) expect(sectorIds).toContain(a);
    });
  });

  test('Reckonings gate the sectors 1, 2, 3, 4 in order', () => {
    expect(C.sectorOrder.slice(1).map((s) => C.sectors[s].unlock!.minReckonings)).toEqual([1, 2, 3, 4]);
  });

  test('spill and drawsOn point at real sectors', () => {
    for (const s of sectorIds) {
      const d = C.sectors[s];
      if (d.spill) expect(sectorIds).toContain(d.spill.to);
      if (d.drawsOn) expect(sectorIds).toContain(d.drawsOn.sector);
    }
  });

  test('crisis thresholds ascend inside (0, 1)', () => {
    for (const s of sectorIds) {
      const t = C.sectors[s].crisisAt;
      t.forEach((x, i) => {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(1);
        if (i) expect(x).toBeGreaterThan(t[i - 1]);
      });
    }
  });

  test('every sector has a free first application available from the start', () => {
    for (const s of sectorIds) {
      const first = C.sectors[s].applications[0];
      expect(first.visibleBelow).toBe(Infinity);
      expect(first.foundCost).toBe(0);
    }
  });
});

describe('references resolve', () => {
  test('upgrades: sector, requires, excludes', () => {
    for (const u of C.upgrades) {
      expect(sectorIds).toContain(u.sector);
      for (const r of u.requires ?? []) expect(upgradeIds.has(r)).toBe(true);
      for (const x of u.excludes ?? []) expect(upgradeIds.has(x)).toBe(true);
    }
  });

  test('excludes are symmetric', () => {
    const byId = new Map(C.upgrades.map((u) => [u.id, u]));
    for (const u of C.upgrades) for (const x of u.excludes ?? []) expect(byId.get(x)!.excludes ?? []).toContain(u.id);
  });

  test('a fork arm never requires its own opposite', () => {
    for (const u of C.upgrades) for (const x of u.excludes ?? []) expect(u.requires ?? []).not.toContain(x);
  });

  test('effects name real sectors, applications, levers and lockable ids', () => {
    for (const { where, e } of allEffects()) {
      const ctx = `${where}: ${JSON.stringify(e)}`;
      if ('sector' in e) expect(sectorIds.includes(e.sector) ? '' : ctx).toBe('');
      if ((e.type === 'satMul' || e.type === 'halfPriceMul') && e.app) {
        expect(appSector.get(e.app) === e.sector ? '' : ctx).toBe('');
      }
      if (e.type === 'startLever') expect(leverIds.has(e.lever) ? '' : ctx).toBe('');
      if (e.type === 'startFounded') expect(appSector.has(e.app) ? '' : ctx).toBe('');
      if (e.type === 'institutionLoan') {
        const inst = C.institutions.find((i) => i.id === e.id);
        const max = inst ? 1 + (inst.nextLevels ?? []).length : 0;
        expect(inst && e.level >= 1 && e.level <= max && Number.isInteger(e.level) ? '' : ctx).toBe('');
      }
      if (e.type === 'orderUnlock') expect(['market', 'civilService', 'treasury'].includes(e.order) ? '' : ctx).toBe('');
      if (e.type === 'unlock') {
        const target = C.upgrades.find((u) => u.id === e.id) ?? C.levers.find((l) => l.id === e.id);
        expect(target?.locked ? '' : ctx).toBe('');
      }
    }
  });

  test('levers: sector, requires, catch, recycle', () => {
    for (const l of C.levers) {
      expect(sectorIds).toContain(l.sector);
      expect(l.catch.trim().length).toBeGreaterThan(0);
      expect(l.levels.length).toBeGreaterThan(0);
      for (const r of l.requires ?? []) {
        expect(r === 'revealed' || upgradeIds.has(r) || instIds.has(r) || (FEATURE_IDS as readonly string[]).includes(r)).toBe(true);
      }
      if (l.kind === 'duty' || l.kind === 'cap') expect(l.recycle).toEqual(['treasury', 'dividend', 'commons']);
      else expect(l.recycle).toBeUndefined();
      // M2: never 'commons' first (not selectable before the Commons open); overrides only for offered options.
      if (l.recycle) expect(l.recycle[0]).not.toBe('commons');
      for (const k of Object.keys(l.recycleBlurb ?? {})) expect(l.recycle ?? ['treasury']).toContain(k);
    }
  });

  test('institutions: requires', () => {
    for (const i of C.institutions) for (const r of i.requires ?? []) expect(instIds.has(r)).toBe(true);
  });

  test('every condition refers to things that exist', () => {
    for (const { where, c } of allConds()) {
      const ctx = `${where}: ${JSON.stringify(c)}`;
      if ('owns' in c) expect(ownable.has(c.owns) ? '' : ctx).toBe('');
      if ('stat' in c) {
        if (SECTOR_SCOPED.includes(c.stat)) expect(c.sector && sectorIds.includes(c.sector) ? '' : ctx).toBe('');
        else if (c.sector !== undefined) expect(sectorIds.includes(c.sector) ? '' : ctx).toBe('');
        if (APP_SCOPED.includes(c.stat)) expect(c.app && appSector.has(c.app) ? '' : ctx).toBe('');
        else if (c.app !== undefined) expect(appSector.has(c.app) ? '' : ctx).toBe('');
      }
      if ('flag' in c) expect(['revealed', 'won']).toContain(c.flag);
    }
  });
});

describe('levers', () => {
  test('every lever has a repeat table with a label template', () => {
    for (const l of C.levers) {
      expect(l.repeat).toBeDefined();
      expect(l.repeat!.label && /\{(pct|value|n)\}/.test(l.repeat!.label) ? '' : l.id).toBe('');
      expect(l.repeat!.costGrowth).toBeGreaterThan(1);
      expect(l.repeat!.upkeepGrowth).toBeGreaterThanOrEqual(1);
    }
  });

  test('caps are fractions of the budget line near 1 and tighten downwards', () => {
    for (const l of C.levers.filter((x) => x.kind === 'cap')) {
      expect(l.levels[0].value).toBeLessThanOrEqual(1);
      expect(l.levels[0].value).toBeGreaterThanOrEqual(0.9);
      expect(l.repeat!.valueStep).toBeLessThan(0);
    }
  });

  test('authored level values move in one direction and stay in the kind’s range', () => {
    const range: Record<string, [number, number]> = {
      duty: [0, 0.999], cap: [0.05, 1.5], sufficiency: [0.05, 1], substitution: [0, 1], greenSpending: [0, 1],
      reviewGate: [0, 1], circularity: [0, 0.95], sharedLibs: [0, 0.95], deletion: [0, 0.9],
    };
    for (const l of C.levers) {
      const vs = l.levels.map((x) => x.value);
      const [lo, hi] = range[l.kind];
      for (const v of vs) expect(v >= lo && v <= hi ? '' : `${l.id} ${v}`).toBe('');
      const dir = Math.sign(l.repeat!.valueStep);
      for (let i = 1; i < vs.length; i++) expect(Math.sign(vs[i] - vs[i - 1])).toBe(dir);
      for (let i = 1; i < l.levels.length; i++) {
        expect(l.levels[i].mandateCost).toBeGreaterThan(l.levels[i - 1].mandateCost);
      }
    }
  });
});

describe('know-how and institutions', () => {
  test('every tier ≥ 2 node has a tier − 1 node in its tree', () => {
    for (const k of C.knowhow) {
      const tier = k.tier ?? 1;
      if (tier < 2) continue;
      const tree = k.tree ?? 'general';
      expect(C.knowhow.some((o) => (o.tree ?? 'general') === tree && (o.tier ?? 1) === tier - 1)).toBe(true);
    }
  });

  test('each branch is a real fork inside one tree and tier, and every tier has one', () => {
    const branches = new Map<string, typeof C.knowhow>();
    for (const k of C.knowhow) if (k.branch) branches.set(k.branch, [...(branches.get(k.branch) ?? []), k]);
    for (const [, nodes] of branches) {
      expect(nodes.length).toBeGreaterThanOrEqual(2);
      expect(new Set(nodes.map((n) => n.tree ?? 'general')).size).toBe(1);
      expect(new Set(nodes.map((n) => n.tier ?? 1)).size).toBe(1);
    }
    const tierKeys = new Set(C.knowhow.map((k) => `${k.tree ?? 'general'}/${k.tier ?? 1}`));
    const forked = new Set(C.knowhow.filter((k) => k.branch).map((k) => `${k.tree ?? 'general'}/${k.tier ?? 1}`));
    expect([...tierKeys].filter((t) => !forked.has(t))).toEqual([]);
  });

  test('every efficiency node prints its rebound (satMul or halfPriceMul > 1)', () => {
    for (const k of C.knowhow) {
      if (!k.effects.some((e) => e.type === 'etaMul')) continue;
      const side = k.effects.some((e) => (e.type === 'satMul' || e.type === 'halfPriceMul') && e.value > 1);
      expect(side ? '' : k.id).toBe('');
    }
  });

  test('at least one node grants a seat', () => {
    expect(C.knowhow.some((k) => k.effects.some((e) => e.type === 'slotAdd'))).toBe(true);
  });

  test('institutions never carry one-off effects (ignored on institutions)', () => {
    for (const i of C.institutions) {
      const effs = [...i.effects, ...(i.nextLevels ?? []).flatMap((l) => l.effects)];
      expect(effs.filter((e) => ['mandateAdd', 'capitalAdd', 'slotAdd'].includes(e.type))).toEqual([]);
    }
  });

  test('institution levels cost more as they rise; start levers rise with them', () => {
    for (const i of C.institutions) {
      let prev = i.cost;
      for (const l of i.nextLevels ?? []) { expect(l.cost).toBeGreaterThan(prev); prev = l.cost; }
      const starts = new Map<string, number>();
      for (const e of i.effects) if (e.type === 'startLever') starts.set(e.lever, e.level);
      for (const l of i.nextLevels ?? []) {
        for (const e of l.effects) {
          if (e.type !== 'startLever') continue;
          expect(e.level).toBeGreaterThan(starts.get(e.lever) ?? 0);
          starts.set(e.lever, e.level);
        }
      }
    }
  });

  test('an institution may start a cap only where its line waits for a grown economy (standingDrawYears ≥ 20)', () => {
    // M1 balance fix 2: a standing cap draws its budget once the sector has been open steady.standingDrawYears model
    // years, so it is no longer frozen at the opening level. Below about 20 years (under 7 minutes) it still would be.
    const caps = new Map(C.levers.filter((l) => l.kind === 'cap').map((l) => [l.id, l.sector]));
    for (const i of C.institutions) {
      const effs = [...i.effects, ...(i.nextLevels ?? []).flatMap((l) => l.effects)];
      for (const e of effs) {
        if (e.type !== 'startLever' || !caps.has(e.lever)) continue;
        const sector = caps.get(e.lever)!;
        const years = C.sectors[sector].steady?.standingDrawYears ?? C.global.steady?.standingDrawYears ?? 0;
        expect(`${i.id}: ${years}`).toBe(`${i.id}: ${Math.max(20, years)}`);
      }
    }
  });

  test('the Statistics Office is the cheapest first buy and has no prerequisites', () => {
    const so = C.institutions.find((i) => i.id === 'inst.statisticsOffice')!;
    expect(so.requires ?? []).toEqual([]);
    expect(Math.min(...C.institutions.map((i) => i.cost))).toBe(so.cost);
  });

  test('the first loadout choice: about four affordable candidates for two seats', () => {
    const cheap = C.institutions.filter((i) => !(i.requires ?? []).length && i.cost <= 3 * Math.min(...C.institutions.map((x) => x.cost)));
    expect(cheap.length).toBeGreaterThanOrEqual(3);
    expect(C.global.startingSlots ?? 2).toBe(2);
  });
});

describe('words', () => {
  const text = playerText();

  test('no player-facing string calls an industry a sector or an era', () => {
    const bad = text.filter((t) => /\b(sector|sectors|era|eras)\b/i.test(stripPlaceholders(t.text)));
    expect(bad).toEqual([]);
  });

  test('no banned Americanisms', () => {
    const BANNED = /\b(colors?|colored|honors?|honored|centers?|centered|grays?|tires?|curbs?|aluminum)\b/i;
    const IZE = /\b([a-z]+)(ize|izes|ized|izing|ization|izations)\b/i;
    const IZE_OK = new Set(['size', 'sizes', 'sized', 'prize', 'prizes', 'seize', 'seized', 'seizes', 'capsize']);
    const bad: string[] = [];
    for (const { path, text: raw } of text) {
      const t = stripPlaceholders(raw);
      if (BANNED.test(t)) bad.push(`${path}: ${raw}`);
      const m = t.match(new RegExp(IZE.source, 'gi')) ?? [];
      for (const w of m) if (!IZE_OK.has(w.toLowerCase())) bad.push(`${path}: ${w}`);
      for (const pm of t.matchAll(/\bprograms?\b/gi)) {
        const before = t.slice(0, pm.index).toLowerCase();
        if (!before.endsWith('computer ')) bad.push(`${path}: program`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('every headline is at most 70 characters', () => {
    const all = [
      ...Object.values(C.headlines).flat(),
      ...Object.values(C.sectorHeadlines ?? {}).flatMap((h) => Object.values(h).flat() as string[]),
    ];
    expect(all.filter((h) => h.length > 70)).toEqual([]);
  });

  test('every headline key has variants', () => {
    for (const k of ALL_KEYS) expect(C.headlines[k]?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  test('headlines only use known placeholders', () => {
    const OK = new Set(['sector', 'age', 'app', 'resource', 'service', 'year', 'n', 'name']);
    const all = [
      ...Object.values(C.headlines).flat(),
      ...Object.values(C.sectorHeadlines ?? {}).flatMap((h) => Object.values(h).flat() as string[]),
    ];
    for (const h of all) for (const m of h.matchAll(/\{([a-z]+)\}/gi)) expect(OK.has(m[1]) ? '' : h).toBe('');
  });

  test('no duplicate headlines', () => {
    const all = [
      ...Object.values(C.headlines).flat(),
      ...Object.values(C.sectorHeadlines ?? {}).flatMap((h) => Object.values(h).flat() as string[]),
    ];
    const seen = new Set<string>();
    expect(all.filter((h) => (seen.has(h) ? true : (seen.add(h), false)))).toEqual([]);
  });

  test('sector-specific lines exist for the events that differ most by industry', () => {
    const need: HeadlineKey[] = ['crisis', 'collapse', 'exhausted', 'sectorOpened', 'efficiency'];
    for (const s of sectorIds) for (const k of need) expect(C.sectorHeadlines?.[s]?.[k]?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  test('sector headline keys belong to sectors that exist', () => {
    for (const s of Object.keys(C.sectorHeadlines ?? {})) expect(sectorIds).toContain(s);
  });

  test('the fallback crisis lines are fit for any industry (no fog, smoke or gridlock)', () => {
    const local = /\b(fog|smog|smoke|soot|chimney|pea-souper|gridlock|heat dome|outage)\b/i;
    for (const k of ['crisis', 'collapse', 'exhausted'] as HeadlineKey[]) {
      expect(C.headlines[k].filter((h) => local.test(h))).toEqual([]);
    }
  });

  test('every fork arm and every lever has a blurb', () => {
    for (const u of C.upgrades.filter((x) => x.excludes?.length)) expect(u.blurb.length).toBeGreaterThan(40);
    for (const l of C.levers) expect(l.blurb.length).toBeGreaterThan(0);
  });
});

describe('balance rules that are content-only', () => {
  test('wellbeingTarget sits below the demographic transition', () => {
    expect(C.global.demography).toBeDefined();
    expect(C.global.wellbeingTarget).toBeLessThan(C.global.demography!.transitionWellbeing);
    expect(C.global.subsistence).toBeLessThan(C.global.wellbeingTarget);
  });

  test('pumping never regenerates more coal than the industry burns', () => {
    // gain × η × (pumping's share of demand) < 1. Checked at two extremes with the most know-how efficiency:
    //  early: pumping alone, after the first efficiency card; late: every efficiency card, share by saturation.
    const khEta = (s: string) =>
      C.knowhow.reduce((m, k) => m * k.effects.reduce((x, e) => (e.type === 'etaMul' && e.sector === s ? x * e.value ** k.maxLevel : x), 1), 1);
    const upEta = (s: string, filter: (id: string) => boolean) =>
      C.upgrades.filter((u) => u.sector === s && filter(u.id)).reduce((m, u) => m * u.effects.reduce((x, e) => (e.type === 'etaMul' ? x * e.value : x), 1), 1);
    for (const s of sectorIds) {
      const sec = C.sectors[s];
      const total = sec.applications.reduce((a, x) => a + x.saturation, 0);
      for (const a of sec.applications) {
        const g = a.reserveGainPerService ?? 0;
        if (!g) continue;
        const first = C.upgrades.find((u) => u.sector === s && u.kind === 'efficiency' && !u.requires)!;
        // early: only this app founded (share 1). Branch arms that exclude each other never both carry etaMul here.
        const khBranchy = khEta(s);
        const early = g * sec.baseEta * upEta(s, (id) => id === first.id) * khBranchy;
        expect(early).toBeLessThan(1);
        const late = g * upEta(s, () => true) * khBranchy * (a.saturation * 1.5 / total);
        expect(late).toBeLessThan(1);
      }
    }
  });

  test('Steady State knobs are present and sane', () => {
    const st = C.global.steady!;
    expect(st.budgetDeclinePerDecade).toBeGreaterThan(0);
    expect(st.budgetDeclinePerDecade).toBeLessThan(0.2);
    expect(st.firstSteadyEffects).toEqual([{ type: 'slotAdd', value: 1 }]);
    expect(C.global.levy?.mandateShare).toBeGreaterThan(0);
  });
});

describe('volume floors (roadmap M1)', () => {
  test('12 forks: Steam 4, the others 2 each', () => {
    const pairs = new Set<string>();
    for (const u of C.upgrades) for (const x of u.excludes ?? []) pairs.add([u.id, x].sort().join('|'));
    expect(pairs.size).toBeGreaterThanOrEqual(12);
    const bySector = (s: string) => [...pairs].filter((p) => p.startsWith(`${s}.`)).length;
    expect(bySector('steam')).toBeGreaterThanOrEqual(4);
    for (const s of ['light', 'motion', 'compute', 'code']) expect(bySector(s)).toBeGreaterThanOrEqual(2);
  });

  test('16 know-how nodes in 2 trees', () => {
    expect(C.knowhow.length).toBeGreaterThanOrEqual(16);
    expect(new Set(C.knowhow.map((k) => k.tree ?? 'general')).size).toBeGreaterThanOrEqual(2);
  });

  test('14 institutions, most with levels, one or two heavy', () => {
    expect(C.institutions.length).toBeGreaterThanOrEqual(14);
    expect(C.institutions.filter((i) => (i.nextLevels ?? []).length >= 1).length).toBeGreaterThanOrEqual(10);
    const heavy = C.institutions.filter((i) => (i.slots ?? 1) >= 2).length;
    expect(heavy).toBeGreaterThanOrEqual(1);
    expect(heavy).toBeLessThanOrEqual(2);
  });

  test('25 achievements: the 5 built in plus 20 with conditions', () => {
    for (const id of ['jevonsWasRight', 'degrowthByAccident', 'steadyState', 'firstReckoning', 'backfire']) {
      expect(achIds.has(id)).toBe(true);
    }
    expect(C.achievements.length).toBeGreaterThanOrEqual(25);
    expect(C.achievements.filter((a) => a.when).length).toBeGreaterThanOrEqual(20);
  });

  test('about 150 headlines', () => {
    const n = Object.values(C.headlines).flat().length
      + Object.values(C.sectorHeadlines ?? {}).reduce((a, h) => a + Object.values(h).flat().length, 0);
    expect(n).toBeGreaterThanOrEqual(150);
  });

  test('26 applications, 5–6 per sector', () => {
    expect(apps.length).toBeGreaterThanOrEqual(26);
    for (const s of sectorIds) expect(C.sectors[s].applications.length).toBeGreaterThanOrEqual(5);
  });
});

/* House style (design/style-guide.md): the mechanical parts of the editor's rules. */
describe('house style', () => {
  const text = playerText();
  const allHeadlines = (): { where: string; h: string }[] => [
    ...Object.entries(C.headlines).flatMap(([k, v]) => v.map((h) => ({ where: `headlines.${k}`, h }))),
    ...Object.entries(C.sectorHeadlines ?? {}).flatMap(([s, hs]) =>
      Object.entries(hs).flatMap(([k, v]) => (v as string[]).map((h) => ({ where: `${s}.${k}`, h })))),
  ];
  const SECTOR_KEYS: HeadlineKey[] = [
    'appFounded', 'appAvailable', 'sectorOpened', 'crisis', 'collapse', 'exhausted', 'backfire', 'leverEnacted',
    'leverLapsed', 'steadySector', 'efficiency', 'budgetDrawn', 'decade', 'budgetBroken', 'reckoning',
  ];

  test('no exclamation marks, straight quotes or spaced hyphens in player text', () => {
    const bad = text.filter((t) => /!|"|'| - /.test(t.text)).map((t) => `${t.path}: ${t.text}`);
    expect(bad).toEqual([]);
  });

  test('headlines: no full stop at the end, no rhetorical questions', () => {
    expect(allHeadlines().filter(({ h }) => /[.?]$/.test(h) || /\?/.test(h)).map((x) => `${x.where}: ${x.h}`)).toEqual([]);
  });

  test('enough fallback variants that an hour does not repeat one', () => {
    for (const k of ALL_KEYS) expect(`${k}: ${Math.min(5, C.headlines[k].length)}`).toBe(`${k}: 5`);
    expect(C.headlines.leverEnacted.length).toBeGreaterThanOrEqual(10);
    expect(C.headlines.leverLapsed.length).toBeGreaterThanOrEqual(8);
  });

  test('every Industry has its own lines for every event that belongs to it', () => {
    const floor: Partial<Record<HeadlineKey, number>> = { efficiency: 6, appFounded: 4, appAvailable: 4, crisis: 5, leverEnacted: 4 };
    const short: string[] = [];
    for (const s of sectorIds) {
      for (const k of SECTOR_KEYS) {
        const n = C.sectorHeadlines?.[s]?.[k]?.length ?? 0;
        if (n < (floor[k] ?? 2)) short.push(`${s}.${k}: ${n}`);
      }
      if (!(C.sectorHeadlines?.[s]?.crisis ?? []).some((h) => h.includes('{n}'))) short.push(`${s}.crisis: no numbered line`);
    }
    expect(short).toEqual([]);
  });

  test('names fit their slots on a 360 px phone (measured 19 Nov 2026)', () => {
    const over = (xs: { id: string; name: string }[], max: number) => xs.filter((x) => x.name.length > max).map((x) => `${x.id} (${x.name.length} > ${max}): ${x.name}`);
    expect([
      ...over(C.upgrades, 24),
      ...over(C.levers, 24),
      ...over(apps, 26),
      ...over(C.achievements, 28),
      ...over([...C.knowhow, ...C.institutions], 32),
      // The sell button: "Sell vehicle-miles" (18) fits on one line at 360 px; "Sell working features" (21) wrapped.
      ...over(sectorIds.map((s) => ({ id: s, name: `Sell ${C.sectors[s].service.name}` })), 18),
    ]).toEqual([]);
  });

  test('blurbs and catches stay short enough to read on a card', () => {
    const long = (xs: { id: string; t: string }[], max: number) => xs.filter((x) => x.t.length > max).map((x) => `${x.id} (${x.t.length} > ${max})`);
    expect([
      ...long(C.upgrades.map((u) => ({ id: u.id, t: u.blurb })), 140),
      ...long(apps.map((a) => ({ id: a.id, t: a.blurb })), 110),
      ...long(C.levers.map((l) => ({ id: l.id, t: l.blurb })), 120),
      ...long(C.levers.map((l) => ({ id: l.id, t: l.catch.replace(/ Paid out as a dividend.*$/, '') })), 100),
      ...long([...C.knowhow, ...C.institutions].map((k) => ({ id: k.id, t: k.blurb })), 140),
    ]).toEqual([]);
  });

  test('card blurbs never say "efficiency" (the promise line does)', () => {
    expect([...C.upgrades, ...C.knowhow, ...C.institutions].filter((u) => /efficien/i.test(u.blurb)).map((u) => u.id)).toEqual([]);
  });

  test('the Coal Age never says "smog" (a 1905 word)', () => {
    const coal = C.ages.find((a) => a.id === 'coal')!.sectors;
    const strings = coal.flatMap((s) => [
      JSON.stringify(C.sectors[s]), JSON.stringify(C.sectorHeadlines?.[s] ?? {}),
      ...C.upgrades.filter((u) => u.sector === s).map((u) => u.name + u.blurb),
      ...C.levers.filter((l) => l.sector === s).map((l) => l.name + l.blurb + l.catch),
    ]);
    expect(strings.filter((t) => /\bsmog\b/i.test(t))).toEqual([]);
  });

  test('nothing on a Steam card or use explains rebound before the reveal', () => {
    const pre = [...C.upgrades.filter((u) => u.sector === 'steam'), ...C.sectors.steam.applications];
    expect(pre.filter((u) => /\b(rebound|backfire|paradox)\b/i.test(u.name + ' ' + u.blurb)).map((u) => u.id)).toEqual([]);
  });

  test('no real companies or products named in player text', () => {
    const BRANDS = /\b(Google|Apple|Amazon|Microsoft|Meta|Facebook|OpenAI|Anthropic|Nvidia|Tesla|Uber|Twitter|CrowdStrike|TSMC|Intel|Netflix|Excel|ChatGPT|Claude|Copilot)\b/;
    expect(text.filter((t) => BRANDS.test(t.text)).map((t) => `${t.path}: ${t.text}`)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* M2: dividends, paces, clear skies, Settlement, the Commons, Charters, orders, stages, words                        */
/* ------------------------------------------------------------------ */

const effectSectors = (effs: EffectDef[]): string[] => effs.flatMap((e) => ('sector' in e ? [e.sector] : []));
const ONE_OFF = ['mandateAdd', 'capitalAdd', 'slotAdd'];

describe('M2: decade dividends', () => {
  const pairsOf = (s?: string) => (s ? C.sectors[s].steady?.decadeChoices : undefined) ?? C.global.steady?.decadeChoices ?? [];

  test('no slotAdd in a dividend (seats matter only between runs)', () => {
    expect(dividends.filter((d) => d.effects.some((e) => e.type === 'slotAdd')).map((d) => d.id)).toEqual([]);
  });

  test('every dividend has a name, a blurb and at least one effect', () => {
    for (const d of dividends) {
      expect(d.name.length > 0 && d.blurb.length > 0 && d.effects.length > 0 ? '' : d.id).toBe('');
    }
  });

  test('every decadeChoices pair is two distinct dividend ids that exist', () => {
    const lists = [{ where: 'global', pairs: C.global.steady?.decadeChoices ?? [] },
      ...sectorIds.map((s) => ({ where: s, pairs: C.sectors[s].steady?.decadeChoices ?? [] }))];
    for (const { where, pairs } of lists) {
      for (const p of pairs) {
        expect(p.length).toBe(2);
        expect(divIds.has(p[0]) && divIds.has(p[1]) && p[0] !== p[1] ? '' : `${where}: ${p.join(' / ')}`).toBe('');
      }
    }
  });

  test('a dividend that names a sector is offered only in that sector’s own sequence', () => {
    const bad: string[] = [];
    for (const d of dividends) {
      const secs = new Set(effectSectors(d.effects));
      if (secs.size > 1) bad.push(`${d.id}: names two sectors`);
    }
    for (const p of C.global.steady?.decadeChoices ?? []) {
      for (const id of p) {
        const d = dividends.find((x) => x.id === id)!;
        if (effectSectors(d.effects).length) bad.push(`global pair offers ${id}, which names a sector`);
      }
    }
    for (const s of sectorIds) {
      for (const p of pairsOf(s)) {
        for (const id of p) {
          const d = dividends.find((x) => x.id === id)!;
          for (const sec of effectSectors(d.effects)) if (sec !== s) bad.push(`${s} offers ${id}, which names ${sec}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('every dividend is offered somewhere (no orphans)', () => {
    const offered = new Set([C.global.steady?.decadeChoices ?? [], ...sectorIds.map((s) => pairsOf(s))].flat(2));
    expect(dividends.filter((d) => !offered.has(d.id)).map((d) => d.id)).toEqual([]);
  });

  test('every Industry’s sequence starts with the global teaching pair and contains its own pairs', () => {
    const first = (C.global.steady?.decadeChoices ?? [])[0];
    for (const s of sectorIds) {
      const list = pairsOf(s);
      expect(list[0]).toEqual(first);
      expect(list.some((p) => p.some((id) => effectSectors(dividends.find((d) => d.id === id)!.effects).includes(s)))).toBe(true);
    }
  });

  test('no M2 source gives Code absorption (its clear skies come from deletion; only the Senior review fork adds any)', () => {
    const m2 = new Set([...divIds, ...commonsIds, ...charterIds, ...sectorIds.map((s) => `${s}.settle`)]);
    const bad = allEffects().filter(({ where, e }) => m2.has(where) && e.type === 'absorptionAdd' && e.sector === 'code').map((x) => x.where);
    expect(bad).toEqual([]);
  });
});

describe('M2: paces and clear skies', () => {
  const resolvedPaces = (s: string) => C.sectors[s].steady?.paces ?? C.global.steady?.paces ?? [];

  test('three paces, ids unique, 0 < decline < 1, steeper pays more', () => {
    for (const where of ['global', ...sectorIds]) {
      const paces = where === 'global' ? C.global.steady?.paces ?? [] : resolvedPaces(where);
      expect(paces.length).toBe(3);
      expect(new Set(paces.map((p) => p.id)).size).toBe(paces.length);
      for (const p of paces) {
        expect(p.declinePerDecade > 0 && p.declinePerDecade < 1 ? '' : `${where}.${p.id}`).toBe('');
        expect(p.dividendMul).toBeGreaterThanOrEqual(0);
        expect(p.name.length > 0 && (p.blurb ?? '').length > 0 ? '' : `${where}.${p.id}`).toBe('');
      }
      for (let i = 1; i < paces.length; i++) {
        expect(paces[i].declinePerDecade).toBeGreaterThan(paces[i - 1].declinePerDecade);
        expect(paces[i].dividendMul).toBeGreaterThan(paces[i - 1].dividendMul);
      }
      expect(paces.map((p) => p.id)).toEqual(['gentle', 'firm', 'severe']);
    }
  });

  test('clear levels: floor ≤ ceiling, ceiling below the first crisis, clearBelow in (0, 1)', () => {
    const g = C.global.steady!;
    for (const s of sectorIds) {
      const o = C.sectors[s].steady ?? {};
      const below = o.clearBelow ?? g.clearBelow ?? 0.5;
      const floor = o.clearFloor ?? g.clearFloor ?? 0.03;
      const ceil = o.clearCeiling ?? g.clearCeiling ?? 0.25;
      expect(below > 0 && below < 1 ? '' : s).toBe('');
      expect(ceil >= floor ? '' : s).toBe('');
      expect(ceil < C.sectors[s].crisisAt[0] ? '' : s).toBe('');
    }
  });

  test('decades are judged against the drawn day, with a small slack', () => {
    expect(C.global.steady?.decadeWellbeing).toBe('drawn');
    expect(C.global.steady?.drawnSlack).toBeGreaterThan(0);
    expect(C.global.steady?.drawnSlack).toBeLessThan(0.2);
  });
});

describe('M2: Settlement', () => {
  test('every Industry can be settled, with a standing dividend, an upkeep and a ceremony line', () => {
    for (const s of sectorIds) {
      const st = C.sectors[s].settle;
      expect(st ? '' : s).toBe('');
      if (!st) continue;
      expect(st.upkeepPerSpill).toBeGreaterThan(0);
      expect((st.freeExcess ?? 0.05) >= 0).toBe(true);
      expect((st.blurb ?? '').length).toBeGreaterThan(20);
      expect(st.dividend.some((e) => !ONE_OFF.includes(e.type)) ? '' : `${s}: no standing effect`).toBe('');
      expect(st.dividend.some((e) => e.type === 'slotAdd') ? s : '').toBe('');
    }
  });
});

describe('M2: the Commons', () => {
  test('every project has its words, a scene icon and sane numbers', () => {
    for (const c of commons) {
      const ctx = c.id;
      expect(c.name.length > 0 && c.blurb.length > 40 && /^[a-z]+$/.test(c.icon) ? '' : ctx).toBe('');
      expect(c.cost > 0 && c.wellbeing.max > 0 && c.wellbeing.perLevel > 0 ? '' : ctx).toBe('');
      expect((c.maxLevel ?? 1) >= 1 && Number.isInteger(c.maxLevel ?? 1) ? '' : ctx).toBe('');
      if ((c.maxLevel ?? 1) > 1) expect((c.costGrowth ?? 1) > 1 ? '' : `${ctx}: repeatable without costGrowth`).toBe('');
      if (c.sector) expect(sectorIds.includes(c.sector) ? '' : ctx).toBe('');
      if (c.intensity) expect(sectorIds.includes(c.intensity.sector) && c.intensity.perLevel > 0 ? '' : ctx).toBe('');
      expect((c.effects ?? []).filter((e) => e.type === 'slotAdd').length).toBe(0);
    }
  });

  test('a small wellbeing term: each project 0.3–4 points, all together under 12', () => {
    for (const c of commons) expect(c.wellbeing.max >= 0.3 && c.wellbeing.max <= 4 ? '' : c.id).toBe('');
    expect(commons.reduce((a, c) => a + c.wellbeing.max, 0)).toBeLessThan(12);
  });

  test('the brief’s shape: Coal Age projects, later ones, a general one; intensities and time rebounds', () => {
    const coal = C.ages.find((a) => a.id === 'coal')!.sectors;
    expect(commons.filter((c) => c.sector && coal.includes(c.sector)).length).toBeGreaterThanOrEqual(5);
    expect(commons.filter((c) => c.sector && !coal.includes(c.sector)).length).toBeGreaterThanOrEqual(2);
    expect(commons.filter((c) => !c.sector).length).toBeGreaterThanOrEqual(1);
    expect(commons.filter((c) => c.intensity).length).toBeGreaterThanOrEqual(4);
    const time = commons.filter((c) => (c.effects ?? []).some((e) => e.type === 'satMul' && e.app && e.value > 1));
    expect(time.length).toBeGreaterThanOrEqual(2);
    const rep = commons.filter((c) => (c.maxLevel ?? 1) > 1).length;
    expect(rep >= 1 && rep <= 2).toBe(true);
  });

  test('every project names its rebound (an intensity, a standing side-effect, or both)', () => {
    expect(commons.filter((c) => !c.intensity && !(c.effects ?? []).length).map((c) => c.id)).toEqual([]);
  });

  test('icons are unique scene keys', () => {
    expect(new Set(commons.map((c) => c.icon)).size).toBe(commons.length);
  });
});

describe('M2: Charters', () => {
  test('every Charter has its words, at least one effect, and no one-offs (ignored on Charters)', () => {
    for (const c of charters) {
      expect(c.name.length > 0 && c.blurb.length > 60 && c.effects.length > 0 ? '' : c.id).toBe('');
      expect(c.effects.filter((e) => ONE_OFF.includes(e.type)).map((e) => `${c.id}: ${e.type}`)).toEqual([]);
      if (c.sector) expect(sectorIds).toContain(c.sector);
      if (c.landmark) expect(/^[a-zA-Z]+$/.test(c.landmark) ? '' : c.id).toBe('');
    }
  });

  test('the brief’s shape: founded use, a loan, an unlock, a start lever, a purse with a cost, Light-gated, restraint', () => {
    const has = (t: string) => charters.some((c) => c.effects.some((e) => e.type === t));
    for (const t of ['startFounded', 'institutionLoan', 'unlock', 'startLever', 'startCapitalMul', 'reserveAdd', 'absorptionAdd', 'popGrowthMul']) {
      expect(has(t) ? '' : t).toBe('');
    }
    expect(charters.some((c) => c.requires && 'owns' in c.requires && c.requires.owns === 'light')).toBe(true);
    const purse = charters.find((c) => c.effects.some((e) => e.type === 'startCapitalMul' && e.value > 1))!;
    expect(purse.effects.some((e) => e.type === 'marginAdd' && e.value < 0)).toBe(true);
  });

  test('a loaned Institution is offered only to a player who does not own it', () => {
    for (const c of charters) {
      for (const e of c.effects) {
        if (e.type !== 'institutionLoan') continue;
        expect(JSON.stringify(c.requires ?? {})).toContain(`"not":{"owns":"${e.id}"}`);
      }
    }
  });

  test('every locked card or lever is unlocked by something', () => {
    const unlocked = new Set(allEffects().flatMap(({ e }) => (e.type === 'unlock' ? [e.id] : [])));
    const locked = [...C.upgrades.filter((u) => u.locked), ...C.levers.filter((l) => l.locked)].map((x) => x.id);
    expect(locked.filter((id) => !unlocked.has(id))).toEqual([]);
  });
});

describe('M2: orders, offline, Institutions, Know-how trees', () => {
  test('offline: a night from the start, holding before a crisis, Hindsight away at a reduced rate; the v2 field is gone', () => {
    expect(C.global.offline).toEqual({ capSeconds: 8 * 3600, holdBefore: 'crisis', hindsightRate: 0.15 });
    expect(C.global.offlineCapSeconds).toBeUndefined();
  });

  test('an Institution adds an offline step to 12 hours, and the two closing orders can be unlocked', () => {
    const effs = C.institutions.flatMap((i) => [...i.effects, ...(i.nextLevels ?? []).flatMap((l) => l.effects)]);
    const extra = effs.reduce((a, e) => (e.type === 'offlineCapAdd' ? Math.max(a, e.seconds) : a), 0);
    expect((C.global.offline?.capSeconds ?? 0) + extra).toBe(12 * 3600);
    for (const o of ['civilService', 'treasury']) {
      expect(effs.some((e) => e.type === 'orderUnlock' && e.order === o) ? '' : o).toBe('');
    }
  });

  test('orders, Commons and respec knobs are set', () => {
    expect(C.global.orders?.paybackChoices).toContain(C.global.orders?.marketPaybackMax);
    expect(C.global.commons?.fromReckoning).toBe(3); // the unfolding: run 4, not run 3 (features.ts)
    expect(C.global.respecRefund).toBe(1);
    expect(C.global.hindsight.perLeanDecade).toBe(0);
    expect(C.global.hindsight.perSettledSector).toBeGreaterThan(0);
  });

  test('every Know-how tree in use has a name', () => {
    for (const t of new Set(C.knowhow.map((k) => k.tree ?? 'general'))) {
      expect((C.knowhowTrees?.[t]?.name ?? '').length > 0 ? '' : t).toBe('');
    }
  });

  test('every recycle option has wording', () => {
    for (const r of ['treasury', 'dividend', 'commons'] as const) {
      expect((C.recycleText?.[r]?.name ?? '').length > 0 && (C.recycleText?.[r]?.blurb ?? '').length > 0 ? '' : r).toBe('');
    }
  });
});

describe('M2: stages and units', () => {
  test('every stage is an integer 1–3 on an efficiency card; at most three distinct per Industry', () => {
    for (const u of C.upgrades) {
      if (u.stage === undefined) continue;
      expect(Number.isInteger(u.stage) && u.stage >= 1 && u.stage <= 3 && u.kind === 'efficiency' ? '' : u.id).toBe('');
    }
    for (const s of sectorIds) {
      expect(new Set(C.upgrades.filter((u) => u.sector === s && u.stage).map((u) => u.stage)).size).toBeLessThanOrEqual(3);
    }
  });

  test('a staged card never requires a card of a higher stage', () => {
    const byId = new Map(C.upgrades.map((u) => [u.id, u]));
    const reqs = (id: string, seen = new Set<string>()): string[] => {
      for (const r of byId.get(id)?.requires ?? []) if (!seen.has(r)) { seen.add(r); reqs(r, seen); }
      return [...seen];
    };
    for (const u of C.upgrades.filter((x) => x.stage)) {
      for (const r of reqs(u.id)) expect((byId.get(r)!.stage ?? 0) <= u.stage! ? '' : `${u.id} after ${r}`).toBe('');
    }
  });

  test('a singular unit differs from its plural', () => {
    for (const s of sectorIds) {
      const d = C.sectors[s];
      for (const u of [d.service, d.resource]) if (u.unitSingular !== undefined) expect(u.unitSingular).not.toBe(u.unit);
    }
  });

  test('every plural unit ending in s has a singular', () => {
    for (const s of sectorIds) {
      const d = C.sectors[s];
      for (const u of [d.service, d.resource]) if (/[a-z]s$/.test(u.unit)) expect(u.unitSingular ? '' : `${s}: ${u.unit}`).toBe('');
    }
  });
});

describe('M2: words', () => {
  const nameOver = (xs: { id: string; name: string }[], max: number) => xs.filter((x) => x.name.length > max).map((x) => `${x.id}: ${x.name}`);

  test('new names fit their slots and new blurbs stay readable', () => {
    expect([
      ...nameOver(dividends, 28), ...nameOver(commons, 28), ...nameOver(charters, 28),
      ...dividends.filter((d) => d.blurb.length > 120).map((d) => `${d.id} (${d.blurb.length})`),
      ...commons.filter((c) => c.blurb.length > 150).map((c) => `${c.id} (${c.blurb.length})`),
      ...charters.filter((c) => c.blurb.length > 150).map((c) => `${c.id} (${c.blurb.length})`),
      ...sectorIds.filter((s) => (C.sectors[s].settle?.blurb ?? '').length > 120),
    ]).toEqual([]);
  });

  test('{name} appears only in the commonsBuilt and charter headlines, at the start or after a colon', () => {
    const bad: string[] = [];
    for (const [k, v] of Object.entries(C.headlines)) {
      for (const h of v) {
        if (!h.includes('{name}')) continue;
        if (k !== 'commonsBuilt' && k !== 'charter') bad.push(`${k}: ${h}`);
        if (!/^\{name\}|: \{name\}/.test(h)) bad.push(`${k}: ${h}`);
      }
    }
    for (const hs of Object.values(C.sectorHeadlines ?? {})) {
      for (const h of Object.values(hs).flat() as string[]) if (h.includes('{name}')) bad.push(h);
    }
    expect(bad).toEqual([]);
  });

  test('every Industry has its own lines for clear skies, settling and unsettling', () => {
    for (const s of sectorIds) {
      for (const k of ['clearSkies', 'settled', 'unsettled'] as HeadlineKey[]) {
        expect(`${s}.${k}: ${Math.min(3, C.sectorHeadlines?.[s]?.[k]?.length ?? 0)}`).toBe(`${s}.${k}: 3`);
      }
    }
  });
});

describe('volume floors (roadmap M2)', () => {
  test('dividends: ≥ 14 in ≥ 7 global pairs, plus 5–10 Industry pairs', () => {
    expect(dividends.length).toBeGreaterThanOrEqual(14);
    expect((C.global.steady?.decadeChoices ?? []).length).toBeGreaterThanOrEqual(7);
    const sectorPairs = new Set(sectorIds.flatMap((s) => (C.sectors[s].steady?.decadeChoices ?? [])
      .filter((p) => p.some((id) => effectSectors(dividends.find((d) => d.id === id)!.effects).length))
      .map((p) => p.join('|'))));
    expect(sectorPairs.size).toBeGreaterThanOrEqual(5);
    expect(sectorPairs.size).toBeLessThanOrEqual(12);
  });

  test('8 Commons projects, 8 Charters, 5 settle blocks, 18 Institutions', () => {
    expect(commons.length).toBeGreaterThanOrEqual(8);
    expect(charters.length).toBeGreaterThanOrEqual(8);
    expect(sectorIds.filter((s) => C.sectors[s].settle).length).toBe(5);
    expect(C.institutions.length).toBeGreaterThanOrEqual(18);
  });

  test('15 new achievements with conditions (40 in all)', () => {
    expect(C.achievements.length).toBeGreaterThanOrEqual(40);
    expect(C.achievements.filter((a) => a.when).length).toBeGreaterThanOrEqual(35);
    expect(C.achievements.filter((a) => a.hidden).length).toBeLessThanOrEqual(8);
  });

  test('stages on 12–15 cards', () => {
    const n = C.upgrades.filter((u) => u.stage).length;
    expect(n >= 12 && n <= 15).toBe(true);
  });

  test('about 450 headlines (M1’s 389 plus about 60)', () => {
    const n = Object.values(C.headlines).flat().length
      + Object.values(C.sectorHeadlines ?? {}).reduce((a, h) => a + Object.values(h).flat().length, 0);
    expect(n).toBeGreaterThanOrEqual(440);
  });
});

/* ---------------- the unfolding ---------------- */

describe('the unfolding (Content.features)', () => {
  test('every feature is defined, with an intro in house style (but the reveal\'s own) and a name', () => {
    for (const id of FEATURE_IDS) {
      const f = C.features?.[id];
      expect(`${id} ${!!f}`).toBe(`${id} true`);
      expect(f!.name?.length ?? 0).toBeGreaterThan(0);
      if (id === 'reboundMeter') continue;
      const t = f!.intro ?? '';
      expect(`${id} ${t.length > 0 && t.length <= 70}`).toBe(`${id} true`);
      expect(t).not.toMatch(/[.!?]$/);
      expect(t).not.toMatch(/\byou\b/i);
      expect(t.charAt(0)).toBe(t.charAt(0).toUpperCase());
    }
  });
  test('levers gated by a feature name a real one; every cap waits for the budget', () => {
    for (const l of C.levers) if (l.kind === 'cap') expect(l.requires ?? []).toContain('budget');
  });
  test('a gap between arrivals, and the Commons\' floor agrees with its feature', () => {
    expect(C.global.featureGapSeconds ?? 0).toBeGreaterThanOrEqual(300);
    expect(C.global.commons?.fromReckoning).toBe(3);
  });
});
