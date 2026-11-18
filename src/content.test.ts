// Content lint: structural checks on src/content.ts that no simulation is needed for.
// bun-types are not installed and tsconfig has "types": [], so the test runner's own module has no declarations.
// @ts-ignore
import { describe, expect, test } from 'bun:test';
import { content } from './content';
import type { Cond, EffectDef, HeadlineKey, StatKey } from './types';

const C = content;
const sectorIds = Object.keys(C.sectors);
const apps = sectorIds.flatMap((s) => C.sectors[s].applications.map((a) => ({ ...a, sector: s })));
const appSector = new Map(apps.map((a) => [a.id, a.sector]));
const upgradeIds = new Set(C.upgrades.map((u) => u.id));
const leverIds = new Set(C.levers.map((l) => l.id));
const instIds = new Set(C.institutions.map((i) => i.id));
const khIds = new Set(C.knowhow.map((k) => k.id));
const achIds = new Set(C.achievements.map((a) => a.id));
/** Everything a Cond `owns` leaf may name. */
const ownable = new Set([...upgradeIds, ...apps.map((a) => a.id), ...leverIds, ...instIds, ...khIds, ...achIds]);

const ALL_KEYS: HeadlineKey[] = [
  'appFounded', 'appAvailable', 'sectorOpened', 'crisis', 'collapse', 'exhausted', 'backfire', 'reveal',
  'leverEnacted', 'leverLapsed', 'steadySector', 'steadyAll', 'reckoning', 'efficiency',
  'ageBegins', 'budgetDrawn', 'decade', 'budgetBroken',
];
const SECTOR_SCOPED: StatKey[] = [
  'etaFold', 'rFold', 'frontierFold', 'peakRFold', 'rebound', 'resourceUse', 'demand', 'servicePrice',
  'serviceDelivered', 'reserveFraction', 'pressureFraction', 'crises', 'steadyYears', 'budgetDecades',
  'withinBudget', 'appsFounded',
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
  return out;
}

/** Keys whose string values are ids, codes or enums rather than words a player reads. */
const NON_TEXT_KEYS = new Set([
  'id', 'icon', 'theme', 'accent', 'kind', 'type', 'sector', 'app', 'lever', 'to', 'owns', 'flag', 'stat', 'op',
  'resourceKind', 'pressureSource', 'tree', 'branch', 'requires', 'excludes', 'after', 'sectors', 'sectorOrder',
  'recycle',
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
        expect(r === 'revealed' || upgradeIds.has(r) || instIds.has(r)).toBe(true);
      }
      if (l.kind === 'duty' || l.kind === 'cap') expect(l.recycle).toEqual(['treasury', 'dividend']);
      else expect(l.recycle).toBeUndefined();
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

  test('no institution starts a cap (a standing cap draws its budget on the first step, at the opening R)', () => {
    const caps = new Set(C.levers.filter((l) => l.kind === 'cap').map((l) => l.id));
    for (const i of C.institutions) {
      const effs = [...i.effects, ...(i.nextLevels ?? []).flatMap((l) => l.effects)];
      expect(effs.filter((e) => e.type === 'startLever' && caps.has(e.lever)).map(() => i.id)).toEqual([]);
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
    const OK = new Set(['sector', 'age', 'app', 'resource', 'service', 'year', 'n']);
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
