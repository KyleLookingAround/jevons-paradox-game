// Content lint: structural checks on src/content/ that no simulation is needed for.
// bun-types are not installed and tsconfig has "types": [], so the test runner's own module has no declarations.
// @ts-ignore
import { describe, expect, test } from 'bun:test';
import { content } from './index';
import type { Cond, EffectDef, HeadlineKey, StatKey } from '../types';
import { FEATURE_IDS } from '../types';
import { MECHANICS_LIVE } from './helpers';
import { LOAD as LIGHT_LOAD } from './sectors/light';

const C = content;
const sectorIds = Object.keys(C.sectors);
/* M3 */
const seams = sectorIds.flatMap((s) => (C.sectors[s].seams ?? []).map((x) => ({ ...x, sector: s })));
const histories = C.histories ?? [];
const castDefs = C.cast ?? [];
const dispatches = C.dispatches ?? [];
const ambient = C.ambient ?? [];
const archive = C.archive ?? [];
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
const seamIds = new Set(seams.map((x) => x.id));
const historyIds = new Set(histories.map((h) => h.id));
const castIds = new Set(castDefs.map((c) => c.id));
const dispatchIds = new Set(dispatches.map((d) => d.id));
const archiveIds = new Set(archive.map((a) => a.id));
/** Everything a Cond `owns` leaf may name (M2: Commons projects, Charters, dividends, and sector ids; M3: seams,
 *  Histories, Archive notes). */
const ownable = new Set([
  ...upgradeIds, ...apps.map((a) => a.id), ...leverIds, ...instIds, ...khIds, ...achIds,
  ...divIds, ...commonsIds, ...charterIds, ...sectorIds,
  ...seamIds, ...historyIds, ...archiveIds,
]);

const ALL_KEYS: HeadlineKey[] = [
  'appFounded', 'appAvailable', 'sectorOpened', 'crisis', 'collapse', 'exhausted', 'backfire', 'reveal',
  'leverEnacted', 'leverLapsed', 'steadySector', 'steadyAll', 'reckoning', 'efficiency',
  'ageBegins', 'budgetDrawn', 'decade', 'budgetBroken',
  'clearSkies', 'settled', 'unsettled', 'commonsBuilt', 'charter',
];
/** M3 keys that print variants (the others take their text from a def: dispatch, answered, ambient, return, …). */
const M3_KEYS: HeadlineKey[] = ['seamSunk', 'biteBack', 'history', 'ending'];
const SECTOR_SCOPED: StatKey[] = [
  'etaFold', 'rFold', 'frontierFold', 'peakRFold', 'rebound', 'resourceUse', 'demand', 'servicePrice',
  'serviceDelivered', 'reserveFraction', 'pressureFraction', 'crises', 'steadyYears', 'budgetDecades',
  'withinBudget', 'appsFounded',
  'settled', 'clear', 'clearYears',
  /* M3 */
  'seamsSunk', 'loadFactor', 'travelHours', 'sprawl', 'bite',
  /* M4 (and the M4 amendment's feedShare) */
  'openFor', 'stockFraction', 'reportedStock', 'foreignShare', 'scarYears', 'surveyed', 'budgetHeadroom', 'feedFactor',
  'arrears', 'feedShare',
];
/** M4: sector stats that read FALSE unless the sector has the kind (renewable; foreign fleets). */
const RENEWABLE_STATS: StatKey[] = ['stockFraction', 'reportedStock', 'scarYears'];
const APP_SCOPED: StatKey[] = ['adoption', 'appDemand'];
/** Every StatKey there is (an unknown key evaluates false in the core: a typo would silently never hold). */
const ALL_STATS = new Set<string>([
  'time', 'year', 'wellbeing', 'population', 'capital', 'mandate', 'reckonings', 'steadyYearsAll', 'clicks',
  'decisions', 'automated', 'commonsLevels', 'sectorsSettled', 'leanDecades', 'fullDecades',
  'steadySectors', 'dispatchesAnswered', 'historiesCleared', 'totalHours', 'bankedSeconds',
  /* M4 */
  'capstoned',
  ...SECTOR_SCOPED, ...APP_SCOPED,
]);

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
  /* M3 */
  for (const l of C.levers) {
    for (const e of l.effects ?? []) out.push({ where: l.id, e });
    for (const e of l.sideEffects?.effects ?? []) out.push({ where: `${l.id}.sideEffects`, e });
  }
  for (const h of histories) for (const e of h.effects) out.push({ where: h.id, e });
  for (const d of dispatches) {
    d.arms.forEach((a, i) => {
      for (const e of a.effects ?? []) out.push({ where: `${d.id}[${i}]`, e });
      for (const e of a.modifier?.effects ?? []) out.push({ where: `${d.id}[${i}].modifier`, e });
      /* M4: a wager's two branches */
      for (const k of ['win', 'lose'] as const) {
        const b = a.wager?.[k];
        for (const e of b?.effects ?? []) out.push({ where: `${d.id}[${i}].${k}`, e });
        for (const e of b?.modifier?.effects ?? []) out.push({ where: `${d.id}[${i}].${k}.modifier`, e });
      }
    });
  }
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
  /* M3 */
  for (const u of C.upgrades) if (u.when) walk(u.id, u.when);
  for (const l of C.levers) if (l.sideEffects?.unless) walk(`${l.id}.unless`, l.sideEffects.unless);
  for (const x of seams) if (x.requires) walk(x.id, x.requires);
  for (const h of histories) {
    walk(`${h.id}.goal`, h.goal);
    if (h.requires) walk(`${h.id}.requires`, h.requires);
    if (h.forbidUntil) walk(`${h.id}.forbidUntil`, h.forbidUntil);
  }
  for (const c of castDefs) if (c.when) walk(c.id, c.when);
  for (const d of dispatches) if (d.when) walk(d.id, d.when);
  for (const a of ambient) walk(a.id, a.when);
  /* M4 (and the M4 amendment): settle.requires, wagers, lever and Institution conditions, the feeds known */
  for (const s of sectorIds) {
    const r = C.sectors[s].settle?.requires;
    if (r) walk(`${s}.settle.requires`, r);
    const k = C.sectors[s].mechanic?.feedsKnownWhen;
    if (k) walk(`${s}.mechanic.feedsKnownWhen`, k);
  }
  for (const d of dispatches) d.arms.forEach((a, i) => { if (a.wager) walk(`${d.id}[${i}].wager`, a.wager.when); });
  for (const l of C.levers) if (l.when) walk(`${l.id}.when`, l.when);
  for (const i of C.institutions) if (i.when) walk(`${i.id}.when`, i.when);
  return out;
}

/** Keys whose string values are ids, codes or enums rather than words a player reads. */
const NON_TEXT_KEYS = new Set([
  'id', 'icon', 'theme', 'accent', 'kind', 'type', 'sector', 'app', 'lever', 'to', 'owns', 'flag', 'stat', 'op',
  'resourceKind', 'pressureSource', 'tree', 'branch', 'requires', 'excludes', 'after', 'sectors', 'sectorOrder',
  'recycle',
  /* M2 */
  'landmark', 'order', 'decadeChoices', 'holdBefore', 'decadeWellbeing', 'pace',
  /* M3: ids and keys, never shown; `voice` is a note to writers; a source's `cite` and `url` are quoted verbatim (titles
   * keep their own spelling and quotes). */
  'profile', 'defaultProfile', 'apps', 'subject', 'cast', 'next', 'leverKind', 'suspend', 'unlock', 'cosmetic',
  'figure', 'voice', 'cite', 'url', 'grade', 'key', 'direction', 'answered', 'returned', 'machine',
  /* M4: an act's ages and ending id; the reveal variant's kind */
  'ages', 'ending',
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
const stripPlaceholders = (t: string) => t.replace(/\{[a-zA-Z]+\}/g, '');

describe('ids', () => {
  test('unique across the whole game', () => {
    const all = [
      ...sectorIds, ...C.ages.map((a) => a.id), ...apps.map((a) => a.id), ...C.upgrades.map((u) => u.id),
      ...C.levers.map((l) => l.id), ...C.knowhow.map((k) => k.id), ...C.institutions.map((i) => i.id),
      ...C.achievements.map((a) => a.id),
      ...dividends.map((d) => d.id), ...commons.map((c) => c.id), ...charters.map((c) => c.id),
      ...seams.map((x) => x.id), ...histories.map((h) => h.id), ...dispatches.map((d) => d.id),
      ...castDefs.map((c) => c.id), ...ambient.map((a) => a.id), ...archive.map((a) => a.id),
    ];
    const seen = new Set<string>();
    const dupes = all.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(dupes).toEqual([]);
  });

  test('the v1 sector ids are kept (saves depend on them)', () => {
    // M4: Iron and Fishing join the Coal Age; the five v1 ids are unchanged (saves key sectors by id, not position)
    expect(C.sectorOrder).toEqual(['steam', 'light', 'iron', 'fishing', 'motion', 'compute', 'code']);
    for (const id of ['steam', 'light', 'motion', 'compute', 'code']) expect(C.sectorOrder).toContain(id);
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

  test('firstYear sits inside its age; the Ages open in calendar order', () => {
    // M4 CHANGE: inside one Age, Industries may open out of calendar order (Iron, 1828, opens in run 4 after Light,
    // 1870: design/m4-design.md §3; the calendar's catch-up handles an earlier year). Across Ages the order holds: every
    // Industry of a later Age starts no earlier than every Industry of an earlier one, and sectorOrder keeps Ages together.
    const ageOf = (s: string) => C.ages.findIndex((a) => a.sectors.includes(s));
    const fyOf = (s: string) => C.sectors[s].firstYear ?? C.ages[ageOf(s)].yearSpan[0];
    for (const s of C.sectorOrder) {
      const age = C.ages[ageOf(s)];
      expect(fyOf(s)).toBeGreaterThanOrEqual(age.yearSpan[0]);
      expect(fyOf(s)).toBeLessThanOrEqual(age.yearSpan[1]);
    }
    const ixs = C.sectorOrder.map(ageOf);
    for (let i = 1; i < ixs.length; i++) expect(ixs[i]).toBeGreaterThanOrEqual(ixs[i - 1]);
    for (let a = 1; a < C.ages.length; a++) {
      const prev = Math.max(...C.ages.slice(0, a).flatMap((x) => x.sectors.map(fyOf)));
      for (const s of C.ages[a].sectors) expect(`${s} ${fyOf(s) >= prev}`).toBe(`${s} true`);
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

  test('Reckonings gate the sectors: Act I 1, 3, 5; the Previews 2, 3, 4 (their own gate is the Act I ending)', () => {
    // M4 CHANGE (design §3, §9): Light in run 2, Iron in run 4, Fishing in run 6. The Previews keep M3's floors so that a
    // save which opened them under M3 is never held back; a fresh player meets them after the Act I ending.
    expect(C.sectorOrder.slice(1).map((s) => C.sectors[s].unlock!.minReckonings)).toEqual([1, 3, 5, 2, 3, 4]);
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

/** Permanent flags content can set (the one-off metaFlag effect), which Cond { flag } may read. M4: the core sets
 *  'survey:<s>' at a renewable Industry's first survey (RenewableDef.firstSurvey). */
const metaFlags = [
  'proprietor', ...allEffects().flatMap(({ e }) => (e.type === 'metaFlag' ? [e.flag] : [])),
  ...sectorIds.filter((s) => C.sectors[s].renewable?.firstSurvey).map((s) => `survey:${s}`),
];

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
      if ('sector' in e && e.sector !== undefined) expect(sectorIds.includes(e.sector) ? '' : ctx).toBe('');
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
      if (e.type === 'orderUnlock') expect(['market', 'civilService', 'treasury', 'dispatch'].includes(e.order) ? '' : ctx).toBe('');
      if (e.type === 'unlock') {
        const target = C.upgrades.find((u) => u.id === e.id) ?? C.levers.find((l) => l.id === e.id)
          ?? commons.find((c) => c.id === e.id) ?? charters.find((c) => c.id === e.id);
        expect(target?.locked ? '' : ctx).toBe('');
      }
      /* M3 */
      if (e.type === 'priceSeen') {
        if (e.app) expect(appSector.get(e.app) === e.sector ? '' : ctx).toBe('');
        expect(e.share >= 0 && e.share <= 1 && (e.flat ?? 0) >= 0 ? '' : ctx).toBe('');
      }
      if (e.type === 'travelMul') expect(C.sectors[e.sector]?.travel && (e.speed ?? 1) > 0 && (e.roads ?? 1) > 0 ? '' : ctx).toBe('');
      if (e.type === 'resourcePriceMul' || e.type === 'intensityMul' || e.type === 'incomeMul') expect(e.value > 0 ? '' : ctx).toBe('');
      if (e.type === 'costMulOf') {
        const ok = upgradeIds.has(e.id) || appSector.has(e.id) || commonsIds.has(e.id) || seamIds.has(e.id) || sectorIds.includes(e.id);
        expect(ok && e.value > 0 ? '' : ctx).toBe('');
      }
      if (e.type === 'forbid') {
        const KINDS = ['duty', 'cap', 'sufficiency', 'substitution', 'circularity', 'greenSpending', 'deletion', 'reviewGate', 'sharedLibs', 'measure'];
        const ok = e.id !== undefined
          ? upgradeIds.has(e.id) || appSector.has(e.id) || seamIds.has(e.id) || commonsIds.has(e.id) || leverIds.has(e.id)
          : e.leverKind !== undefined && KINDS.includes(e.leverKind);
        expect(ok ? '' : ctx).toBe('');
      }
      if (e.type === 'pressureAdd') expect(Math.abs(e.value) <= 1 ? '' : ctx).toBe('');
      if (e.type === 'populationMul') expect(e.value > 0 ? '' : ctx).toBe('');
    }
  });

  // QA (the unfolding): text naming a system the player has not met waits for it (LeverDef.catchAfter,
  // DividendDef.requires, AchievementDef.feature).
  test('the unfolding: later clauses, offers and achievements wait for their feature', () => {
    const isF = (f: string) => (FEATURE_IDS as readonly string[]).includes(f);
    for (const l of C.levers) {
      for (const k of Object.keys(l.catchAfter ?? {})) expect(isF(k) ? '' : `${l.id}: ${k}`).toBe('');
      // the dividend sentence names the recycling choice, which comes with 'moreLevers'
      expect(/as a dividend/i.test(l.catch) ? l.id : '').toBe('');
      if (l.kind === 'duty' || l.kind === 'cap') expect(l.catchAfter?.moreLevers).toMatch(/^Paid out as a dividend instead/);
    }
    for (const d of C.dividends ?? []) {
      if (d.requires) expect(isF(d.requires)).toBe(true);
      // a dividend that names the Commons is offered only once they exist
      if (/Commons/.test(d.name + d.blurb) || d.effects.some((e) => e.type === 'commonsYieldMul')) expect(`${d.id} ${d.requires}`).toBe(`${d.id} commons`);
    }
    for (const a of C.achievements) if (a.feature) expect(isF(a.feature)).toBe(true);
    for (const a of C.achievements.filter((x) => /Commons|Settled|Steady State|budget|clear sk|sink line|charter/i.test(x.name + x.blurb))) expect(a.feature ? '' : a.id).toBe('');
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
      if ('flag' in c) expect(['revealed', 'won', ...metaFlags].includes(c.flag) ? '' : ctx).toBe('');
      /* M3 */
      if ('stat' in c) expect(ALL_STATS.has(c.stat) ? '' : `${ctx}: unknown stat`).toBe('');
      // (Light's curve is staged behind MECHANICS_LIVE; a condition on it simply never holds until it is live)
      if ('stat' in c && c.stat === 'loadFactor') expect(c.sector && (C.sectors[c.sector]?.load || c.sector === 'light') ? '' : ctx).toBe('');
      if ('stat' in c && (c.stat === 'travelHours' || c.stat === 'sprawl')) expect(c.sector && C.sectors[c.sector]?.travel ? '' : ctx).toBe('');
      if ('answered' in c) {
        expect(dispatchIds.has(c.answered) ? '' : ctx).toBe('');
        const d = dispatches.find((x) => x.id === c.answered);
        if (d && c.arm !== undefined) expect(c.arm >= 0 && c.arm < d.arms.length ? '' : ctx).toBe('');
      }
      if ('returned' in c) {
        expect(c.returned === 'household' ? '' : ctx).toBe('');
        const FIG = ['activeMinutesBefore', 'activeMinutesAfter', 'sessionsBefore', 'sessionsAfter', 'looksBefore', 'looksAfter',
          'decisionsBefore', 'decisionsAfter', 'automatedAfter', 'daysBefore', 'daysAfter', 'quietDays'];
        if (c.figure !== undefined) expect(FIG.includes(c.figure) && c.op !== undefined && c.value !== undefined ? '' : ctx).toBe('');
      }
      if ('feature' in c) expect((FEATURE_IDS as readonly string[]).includes(c.feature) ? '' : ctx).toBe('');
      /* M4 */
      if ('ending' in c) expect((C.acts ?? []).some((a) => a.ending?.id === c.ending) ? '' : ctx).toBe('');
      if ('stat' in c && RENEWABLE_STATS.includes(c.stat)) expect(c.sector && C.sectors[c.sector]?.renewable ? '' : ctx).toBe('');
      if ('stat' in c && c.stat === 'foreignShare') expect(c.sector && C.sectors[c.sector]?.renewable?.foreign ? '' : ctx).toBe('');
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
      measure: [0, Infinity],
      /* M4: a share of the surveyed surplus; 0 is the moratorium */
      quota: [0, 1],
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
      ...long(C.levers.map((l) => ({ id: l.id, t: l.catch })), 100),
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
    // M3: the Archive is the real history behind the game, sourced; it names companies as facts, never as a joke
    expect(text.filter((t) => !t.path.startsWith('content.archive') && BRANDS.test(t.text)).map((t) => `${t.path}: ${t.text}`)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* M2: dividends, paces, clear skies, Settlement, the Commons, Charters, orders, stages, words                        */
/* ------------------------------------------------------------------ */

const effectSectors = (effs: EffectDef[]): string[] => effs.flatMap((e) => ('sector' in e && e.sector !== undefined ? [e.sector] : []));
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

  test('a small wellbeing term: each project 0.3–4 points (a locked History reward 0.2–4), all together under 12', () => {
    for (const c of commons) expect(c.wellbeing.max >= (c.locked ? 0.2 : 0.3) && c.wellbeing.max <= 4 ? '' : c.id).toBe('');
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
    expect(C.global.offline).toEqual({ capSeconds: 8 * 3600, holdBefore: 'crisis', hindsightRate: 0.08, bankRate: 0, bankMax: 0 });
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

  test('{name} appears only where a name is given (commonsBuilt, charter; M3: seamSunk, biteBack, history), at the start or after a colon', () => {
    const NAMED = ['commonsBuilt', 'charter', 'seamSunk', 'biteBack', 'history', /* M4: the act's title */ 'actEnding'];
    const SECTOR_NAMED = ['seamSunk', 'biteBack', 'history'];
    const bad: string[] = [];
    for (const [k, v] of Object.entries(C.headlines)) {
      for (const h of v) {
        if (!h.includes('{name}')) continue;
        if (!NAMED.includes(k)) bad.push(`${k}: ${h}`);
        // a seam's name has no article ("Hutton seam"), so it reads anywhere; other names are proper names
        if (k !== 'seamSunk' && !/^\{name\}|: \{name\}/.test(h)) bad.push(`${k}: ${h}`);
      }
    }
    for (const hs of Object.values(C.sectorHeadlines ?? {})) {
      for (const [k, v] of Object.entries(hs)) {
        for (const h of v as string[]) {
          if (!h.includes('{name}')) continue;
          if (!SECTOR_NAMED.includes(k) || (k !== 'seamSunk' && !/^\{name\}|: \{name\}/.test(h))) bad.push(`${k}: ${h}`);
        }
      }
    }
    expect(seams.filter((x) => /^The /.test(x.name)).map((x) => x.id)).toEqual([]);
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
    // M4 CHANGE: the ceiling was 12 for five Industries (Steam three, the others two); Iron and Fishing bring two each,
    // so the ceiling is now per Industry: at most three own pairs each, and two beside Steam's
    expect(sectorPairs.size).toBeLessThanOrEqual(2 * sectorIds.length + 1);
  });

  test('8 Commons projects, 8 Charters, 5 settle blocks, 18 Institutions', () => {
    expect(commons.length).toBeGreaterThanOrEqual(8);
    expect(charters.length).toBeGreaterThanOrEqual(8);
    // M4 CHANGE: every Industry has a settle block (seven: the five of M2, Iron and Fishing)
    expect(sectorIds.filter((s) => C.sectors[s].settle).length).toBe(sectorIds.length);
    expect(C.institutions.length).toBeGreaterThanOrEqual(18);
  });

  test('15 new achievements with conditions (40 in all)', () => {
    expect(C.achievements.length).toBeGreaterThanOrEqual(40);
    expect(C.achievements.filter((a) => a.when).length).toBeGreaterThanOrEqual(35);
    expect(C.achievements.filter((a) => a.hidden).length).toBeLessThanOrEqual(8);
  });

  test('stages on 12–21 cards (M4: Iron and Fishing add three each; at most three per Industry)', () => {
    const n = C.upgrades.filter((u) => u.stage).length;
    expect(n >= 12 && n <= 3 * sectorIds.length).toBe(true);
    for (const s of sectorIds) expect(C.upgrades.filter((u) => u.sector === s && u.stage).length).toBeLessThanOrEqual(3);
  });

  test('about 450 headlines (M1’s 389 plus about 60)', () => {
    const n = Object.values(C.headlines).flat().length
      + Object.values(C.sectorHeadlines ?? {}).reduce((a, h) => a + Object.values(h).flat().length, 0);
    expect(n).toBeGreaterThanOrEqual(440);
  });
});

/* ---------------- the unfolding ---------------- */

describe('the unfolding (Content.features)', () => {
  test('every feature is defined, with an intro in house style (but those introduced by their own first item) and a name', () => {
    // The reveal has its own card and headline; ambient news, letters and the bite are introduced by their first item.
    // M4: the full account ('estimates') is introduced by the Board's Survey card and its follow-up headline.
    const OWN_INTRO = ['reboundMeter', 'ambient', 'dispatches', 'sideEffects', 'estimates'];
    for (const id of FEATURE_IDS) {
      const f = C.features?.[id];
      expect(`${id} ${!!f}`).toBe(`${id} true`);
      expect(f!.name?.length ?? 0).toBeGreaterThan(0);
      if (OWN_INTRO.includes(id)) { expect(`${id} ${f!.intro ?? ''}`).toBe(`${id} `); continue; }
      const t = f!.intro ?? '';
      expect(`${id} ${t.length > 0 && t.length <= 70}`).toBe(`${id} true`);
      expect(t).not.toMatch(/[.!?]$/);
      expect(t).not.toMatch(/\byou\b/i);
      // Compute's paper is a system log: its lines start with a lower-case level ("info: …").
      if (!/^(info|notice|warn|error|fatal): /.test(t)) expect(t.charAt(0)).toBe(t.charAt(0).toUpperCase());
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

/* ------------------------------------------------------------------ */
/* M3: mechanics, levers that bite back, Histories, the feature schedule, and the other lanes' data                 */
/* ------------------------------------------------------------------ */

const LOAD_HOURS = 24;
const ONE_OFFS_M3 = ['mandateAdd', 'capitalAdd', 'slotAdd', 'populationMul', 'pressureAdd', 'metaFlag'];
/** Condition leaves of a Cond, flattened. */
const leaves = (c: Cond): Cond[] => ('all' in c ? c.all.flatMap(leaves) : 'any' in c ? c.any.flatMap(leaves) : 'not' in c ? leaves(c.not) : [c]);
const rkFloor = (c: Cond): number | null => {
  // the least `reckonings ≥ n` an `all` requires at its top level (null if none)
  const top = 'all' in c ? c.all : [c];
  const ns = top.flatMap((x) => ('stat' in x && x.stat === 'reckonings' && (x.op === '>=' || x.op === '>') ? [x.op === '>' ? x.value + 1 : x.value] : []));
  return ns.length ? Math.max(...ns) : null;
};
const timeFloor = (c: Cond): number => {
  const top = 'all' in c ? c.all : [c];
  return Math.max(0, ...top.flatMap((x) => ('stat' in x && x.stat === 'time' && x.op === '>=' ? [x.value] : [])));
};

describe('M3: one mechanic per Industry', () => {
  test('every Industry names its mechanic (name, rebound, blurb)', () => {
    for (const s of sectorIds) {
      const m = C.sectors[s].mechanic;
      expect(m && m.name.length > 0 && m.name.length <= 28 && m.rebound.length > 0 && m.blurb.length >= 30 && m.blurb.length <= 140 ? '' : s).toBe('');
    }
  });

  test('Steam, Light, Motion and Compute carry their mechanic’s data', () => {
    expect((C.sectors.steam.seams ?? []).length).toBeGreaterThanOrEqual(4);
    expect(!!C.sectors.light.load).toBe(MECHANICS_LIVE); // staged: the curve is in light.ts (LOAD) either way
    expect(Object.keys(LIGHT_LOAD.profiles).length).toBeGreaterThanOrEqual(4);
    expect(C.sectors.motion.travel).toBeDefined();
    // Compute: free at the point of use, set by a card (a priceSeen effect) or on a use
    const free = C.upgrades.some((u) => u.sector === 'compute' && u.effects.some((e) => e.type === 'priceSeen' && e.share === 0))
      || C.sectors.compute.applications.some((a) => a.priceSeen?.share === 0);
    // staged (helpers.ts MECHANICS_LIVE): until the core solves the mechanics the advertising card keeps M2's numbers
    expect(free).toBe(MECHANICS_LIVE);
  });

  test('seams: ids unique, stock Industries only, dearer and deeper in order, positive tons and rising costs', () => {
    for (const s of sectorIds) {
      const list = C.sectors[s].seams ?? [];
      if (!list.length) continue;
      expect(C.sectors[s].resourceKind).toBe('stock');
      list.forEach((x, i) => {
        const ctx = x.id;
        expect(x.id.startsWith(`${s}.seam.`) && x.name.length > 0 && x.name.length <= 24 ? '' : ctx).toBe('');
        expect(x.tons > 0 && x.cost > 0 && x.priceMul >= 1 ? '' : ctx).toBe('');
        if (x.depth !== undefined) expect(/^\d[\d,]* fathoms$/.test(x.depth) ? '' : ctx).toBe('');
        if (i) {
          const p = list[i - 1];
          expect(x.priceMul >= p.priceMul ? '' : `${ctx}: priceMul falls`).toBe('');
          expect((x.reachBelow ?? Infinity) <= (p.reachBelow ?? Infinity) ? '' : `${ctx}: reachBelow rises`).toBe('');
          expect(x.cost >= p.cost ? '' : `${ctx}: cheaper than the seam above`).toBe('');
        }
      });
    }
    expect(new Set(seams.map((x) => x.id)).size).toBe(seams.length);
  });

  test('load: 24 non-negative hourly weights per profile, a default that exists, fixedShare in (0, 1), known app profiles', () => {
    for (const s of sectorIds) {
      const l = C.sectors[s].load ?? (s === 'light' ? LIGHT_LOAD : undefined);
      if (!l) { expect(C.sectors[s].applications.filter((a) => a.profile).map((a) => a.id)).toEqual([]); continue; }
      for (const [k, w] of Object.entries(l.profiles)) {
        expect(w.length === LOAD_HOURS && w.every((x) => Number.isFinite(x) && x >= 0) && w.some((x) => x > 0) ? '' : `${s}.${k}`).toBe('');
      }
      expect(l.profiles[l.defaultProfile]).toBeDefined();
      expect(l.fixedShare > 0 && l.fixedShare < 1).toBe(true);
      expect((l.floor ?? 0.05) > 0 && (l.floor ?? 0.05) <= 1).toBe(true);
      for (const a of C.sectors[s].applications) if (a.profile) expect(l.profiles[a.profile] ? '' : a.id).toBe('');
    }
  });

  test('travel: roads and scale positive, travel uses belong to the Industry; sprawl decays only where it is locked in', () => {
    for (const s of sectorIds) {
      const t = C.sectors[s].travel;
      for (const a of C.sectors[s].applications) {
        if (a.lockInDecay !== undefined) expect(a.lockInDecay > 0 && a.lockInDecay < 0.01 && (a.lockIn ?? 0) > 0 ? '' : a.id).toBe('');
        if (a.priceSeen) expect(a.priceSeen.share >= 0 && a.priceSeen.share <= 1 && (a.priceSeen.flat ?? 0) >= 0 ? '' : a.id).toBe('');
      }
      if (!t) continue;
      expect(t.roads > 0 && t.hoursScale > 0 && (t.exponent ?? 4) >= 1).toBe(true);
      const own = new Set(C.sectors[s].applications.map((a) => a.id));
      for (const id of t.apps ?? []) expect(own.has(id) ? '' : `${s}: ${id}`).toBe('');
    }
  });

  test('every staged card names its machine', () => {
    expect(C.upgrades.filter((u) => u.stage && !(u.machine && u.machine.length <= 24)).map((u) => u.id)).toEqual([]);
  });
});

describe('M3: levers that bite back', () => {
  test('every Industry has a lever that bites back, with its pairing, its line and a catch that names the risk', () => {
    for (const s of sectorIds) {
      const biting = C.levers.filter((l) => l.sector === s && l.sideEffects);
      expect(`${s} ${biting.length >= 1}`).toBe(`${s} true`);
    }
    for (const l of C.levers.filter((x) => x.sideEffects)) {
      const se = l.sideEffects!;
      const ctx = l.id;
      expect(se.effects.length > 0 && se.rampYears > 0 && (se.decayYears ?? se.rampYears) > 0 ? '' : ctx).toBe('');
      expect(se.unless ? '' : `${ctx}: no pairing`).toBe('');
      expect(/^unless /.test(se.unlessLabel ?? '') && (se.unlessLabel ?? '').length <= 60 ? '' : `${ctx}: unlessLabel`).toBe('');
      // the "bites back" line: one sentence, short
      expect(se.blurb.length > 10 && se.blurb.length <= 80 && /\.$/.test(se.blurb) && (se.blurb.match(/\. /g) ?? []).length === 0 ? '' : `${ctx}: blurb`).toBe('');
      expect(l.catch.length > 20 ? '' : `${ctx}: catch`).toBe('');
      // side effects are standing effects (× bite × level); a one-off would never fire
      expect(se.effects.filter((e) => ONE_OFFS_M3.includes(e.type)).length).toBe(0);
    }
  });

  test('measures act through effects; only measures carry effects', () => {
    for (const l of C.levers) {
      if (l.kind === 'measure') expect((l.effects ?? []).length > 0 ? '' : l.id).toBe('');
      else expect((l.effects ?? []).length === 0 ? '' : l.id).toBe('');
      expect((l.effects ?? []).filter((e) => ONE_OFFS_M3.includes(e.type)).length).toBe(0);
    }
  });

  test('one green-paradox lever (a side effect that cheapens the resource), paired', () => {
    const gp = C.levers.filter((l) => l.sideEffects?.effects.some((e) => e.type === 'resourcePriceMul' && e.value < 1));
    expect(gp.length).toBeGreaterThanOrEqual(1);
  });

  test('new M3 levers wait for a system the player has met (none in runs 1–2 beside the M2 levers)', () => {
    // runs 1–2 are levers only, and the scripted restraint player raises any visible lever there: an M3 lever must wait
    // for the budget (run 3), for a mechanic's feature, or for an Industry that opens in run 4 or later.
    const late = (l: (typeof C.levers)[number]) => (l.requires ?? []).some((r) => ['budget', 'load', 'travel', 'freeAtUse', 'seams', 'sideEffects'].includes(r))
      || (C.sectors[l.sector].unlock?.minReckonings ?? 0) >= 3;
    const m3 = C.levers.filter((l) => l.kind === 'measure' || l.sideEffects);
    expect(m3.filter((l) => !late(l)).map((l) => l.id)).toEqual([]);
  });
});

describe('M3: Histories (the History rules)', () => {
  const lockedCommons = commons.filter((c) => c.locked).map((c) => c.id);
  const lockedCharters = charters.filter((c) => c.locked).map((c) => c.id);

  test('ten Histories, each with its words, a goal in words and a rebound', () => {
    expect(histories.length).toBeGreaterThanOrEqual(10);
    expect(new Set(histories.map((h) => h.id)).size).toBe(histories.length);
    for (const h of histories) {
      expect(h.id.startsWith('history.') && h.name.length > 0 && h.name.length <= 28 ? '' : h.id).toBe('');
      expect(h.blurb.length >= 40 && h.blurb.length <= 160 ? '' : `${h.id} blurb ${h.blurb.length}`).toBe('');
      expect(h.goalLabel.length > 0 && h.goalLabel.length <= 80 && h.rebound.length > 0 ? '' : h.id).toBe('');
      expect(h.effects.length > 0 || (h.suspend ?? []).length > 0 ? '' : h.id).toBe('');
      for (const x of h.suspend ?? []) expect(['knowhow', 'institutions', 'charter', 'market']).toContain(x);
    }
  });

  test('rule 1: rewards are options only (locked Commons projects or Charters, a title, a cosmetic, an achievement)', () => {
    for (const h of histories) {
      const keys = Object.keys(h.reward);
      expect(keys.filter((k) => !['unlock', 'achievement', 'cosmetic', 'title'].includes(k))).toEqual([]);
      for (const id of h.reward.unlock ?? []) expect([...lockedCommons, ...lockedCharters].includes(id) ? '' : `${h.id}: ${id}`).toBe('');
      if (h.reward.achievement) expect(achIds.has(h.reward.achievement) ? '' : h.id).toBe('');
      if (h.reward.title) expect(h.reward.title.length <= 28).toBe(true);
      if (h.reward.cosmetic) expect(/^[a-z]+\.[a-zA-Z]+$/.test(h.reward.cosmetic) ? '' : h.id).toBe('');
    }
  });

  test('rule 2: no quality of life or automation behind a History; nothing a History unlocks is needed elsewhere', () => {
    const QOL = ['orderUnlock', 'offlineCapAdd', 'slotAdd'];
    const rewardIds = new Set(histories.flatMap((h) => h.reward.unlock ?? []));
    for (const id of rewardIds) {
      const def = commons.find((c) => c.id === id) ?? charters.find((c) => c.id === id)!;
      expect((def.effects ?? []).filter((e) => QOL.includes(e.type)).map((e) => `${id}: ${e.type}`)).toEqual([]);
    }
    for (const h of histories) {
      // one-offs are ignored on a History; QoL never belongs in one
      expect(h.effects.filter((e) => QOL.includes(e.type) || ONE_OFFS_M3.includes(e.type)).map((e) => `${h.id}: ${e.type}`)).toEqual([]);
    }
    // every locked project and Charter is some History's reward, and only that History's
    for (const id of [...lockedCommons, ...lockedCharters]) {
      expect(`${id} ${histories.filter((h) => (h.reward.unlock ?? []).includes(id)).length}`).toBe(`${id} 1`);
    }
    // no condition anywhere names a reward, except the reward's own `requires` (its History cleared)
    for (const { where, c } of allConds()) {
      if ('owns' in c && rewardIds.has(c.owns)) expect(where).toBe(c.owns);
    }
    // a locked reward also requires its History cleared (an M2 core, which ignores `locked`, then never offers it)
    for (const id of rewardIds) {
      const def = commons.find((c) => c.id === id) ?? charters.find((c) => c.id === id)!;
      const h = histories.find((x) => (x.reward.unlock ?? []).includes(id))!;
      expect(JSON.stringify(def.requires ?? {})).toContain(`"owns":"${h.id}"`);
    }
  });

  test('rule 3: one History at a time (nothing stacks); a History does not unlock another', () => {
    for (const h of histories) if (h.requires) expect(leaves(h.requires).filter((x) => 'owns' in x && historyIds.has(x.owns))).toEqual([]);
  });

  test('forbid effects name things that exist; a History that forbids levers lifts with a condition or forbids few', () => {
    for (const h of histories) {
      const kinds = h.effects.filter((e) => e.type === 'forbid' && e.leverKind).length;
      if (kinds >= 3) expect(h.forbidUntil ? '' : h.id).toBe('');
    }
  });
});

describe('M3: the feature schedule (the unfolding, continued)', () => {
  const F = C.features ?? {};
  const M3_FEATURES = ['archive', 'ambient', 'dispatches', 'seams', 'load', 'travel', 'sideEffects', 'freeAtUse', 'survey', 'histories', 'bank'] as const;

  test('every M3 feature has an entry; nothing M3 arrives in run 1', () => {
    for (const id of M3_FEATURES) {
      const f = F[id];
      expect(`${id} ${!!f}`).toBe(`${id} true`);
      if (['survey', 'histories', 'bank'].includes(id)) continue;
      // (a { feature } leaf counts as later than its own Reckoning)
      expect(`${id} ${(rkFloor(f!.when) ?? 0) >= 1}`).toBe(`${id} true`);
    }
  });

  test('mid-run arrivals keep clear of the Reckoning-anchored M2 arrivals and of run 3 (the budget’s unfolding)', () => {
    // run 2: the Archive at five minutes, more levers (M2) at about ten, the letters from fifteen and no later (a burning
    // run 2 collapses at about 21 minutes: an arrival in its last five would push the Charters out of run 3)
    expect(timeFloor(F.dispatches!.when)).toBe(900);
    // ambient news first in run 2 (five minutes in, the first check after the Market): no time floor that would push it
    // into more levers' slot
    expect(`${rkFloor(F.ambient!.when)} ${timeFloor(F.ambient!.when)}`).toBe('1 0');
    // M4 CHANGE (design/m4-design.md §9): the run floors follow the M4 schedule. Run 4 is the Commons and Iron; run 5
    // Settlement and the seams; run 6 Fishing and the Board's Survey only; run 7 the household survey and the load
    // curve; run 8 Histories and the Archive; run 9 the bite. The Previews' widgets wait on their Industries (rk floors
    // are only their Industries' own). M4 polish: the Archive in run 9 (the Act I ending's run, which had nothing new;
    // run 8 has the third spring survey), the bite in run 10.
    const floors = { seams: 4, load: 6, archive: 8, sideEffects: 9, survey: 6, histories: 7, travel: 2, freeAtUse: 3 } as const;
    for (const [id, n] of Object.entries(floors)) expect(`${id} ${rkFloor(F[id as keyof typeof floors]!.when)}`).toBe(`${id} ${n}`);
    // the mid-run arrivals share one window shorter than the gap between arrivals, so at most one of them arrives a run.
    // M4 CHANGE: the window is minutes 25 to 29 (Fishing reopens at minute 20 or later in every run from run 7).
    const gap = C.global.featureGapSeconds ?? 0;
    expect(leaves(F.sideEffects!.when).some((x) => 'feature' in x && x.feature === 'archive')).toBe(true);
    for (const id of ['seams', 'load', 'archive', 'sideEffects'] as const) {
      const top = (F[id]!.when as { all: Cond[] }).all;
      const lo = timeFloor(F[id]!.when);
      const hi = Math.min(...top.flatMap((x) => ('stat' in x && x.stat === 'time' && x.op === '<' ? [x.value] : [])));
      expect(`${id} ${lo} ${hi} ${hi - lo < gap}`).toBe(`${id} 1500 1740 true`);
    }
    // the Reckoning arrivals: only the check in reckon() sees a run under two seconds old
    for (const id of ['freeAtUse', 'travel', 'survey', 'histories', 'settlement'] as const) {
      expect(`${id} ${(F[id]!.when as { all: Cond[] }).all.some((x) => 'stat' in x && x.stat === 'time' && x.op === '<' && x.value <= 2)}`).toBe(`${id} true`);
    }
  });

  test('the survey from hour 6 with the Civil Service; Histories from hour 8 after a Steady State; the bank never', () => {
    const hours = (c: Cond) => Math.max(0, ...leaves(c).flatMap((x) => ('stat' in x && x.stat === 'totalHours' ? [x.value] : [])));
    expect(hours(F.survey!.when)).toBeGreaterThanOrEqual(6);
    expect(leaves(F.survey!.when).some((x) => 'owns' in x && x.owns === 'inst.civilService')).toBe(true);
    expect(hours(F.histories!.when)).toBeGreaterThanOrEqual(8);
    expect(leaves(F.histories!.when).some((x) => 'owns' in x && x.owns === 'steadyState')).toBe(true);
    expect(F.bank!.when).toEqual({ any: [] });
    expect(C.global.offline?.bankRate ?? 0).toBe(0);
  });

  test('scheduler and ambient knobs are explicit', () => {
    expect(C.global.dispatch).toEqual({ firstYears: 30, intervalYears: 8, jitter: 0.5, expiryYears: 12, maxPending: 1 });
    expect(C.global.ambient?.everyYears).toBe(4);
  });

  test('a standing dispatch order exists, behind an Institution of hour 8 or later', () => {
    const inst = C.institutions.filter((i) => [i.effects, ...(i.nextLevels ?? []).map((l) => l.effects)].flat().some((e) => e.type === 'orderUnlock' && e.order === 'dispatch'));
    expect(inst.length).toBe(1);
    expect(inst[0].cost).toBeGreaterThanOrEqual(280);
    expect(inst[0].requires?.length ?? 0).toBeGreaterThan(0);
  });
});

describe('M3: headlines for the new keys', () => {
  test('the fallback set covers the new variant keys; every Industry has its own bite-back lines; Steam its seam lines', () => {
    for (const k of M3_KEYS) expect(`${k} ${(C.headlines[k] ?? []).length >= 4}`).toBe(`${k} true`);
    for (const s of sectorIds) expect(`${s} ${(C.sectorHeadlines?.[s]?.biteBack ?? []).length >= 3}`).toBe(`${s} true`);
    expect((C.sectorHeadlines?.steam?.seamSunk ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

/* The other two content lanes' data, as registered in index.ts (their own tests hold their volume floors). */
describe('M3: dispatches, the cast and ambient news (registered)', () => {
  const OK_PH = new Set(['sector', 'resource', 'service', 'age', 'year', 'cast', 'app']);
  const noYou = (t: string) => !/\byou\b/i.test(t);

  test('cast ids resolve and every cast member writes', () => {
    for (const d of dispatches) expect(castIds.has(d.cast) ? '' : `${d.id}: ${d.cast}`).toBe('');
    if (C.proprietor) expect(castIds.has(C.proprietor.pamphlet.cast) ? '' : C.proprietor.pamphlet.cast).toBe('');
  });

  test('dispatch shape: 2–3 arms, each priced; the default arm has no cost and no standing effects; next resolves', () => {
    for (const d of dispatches) {
      const ctx = d.id;
      expect(d.arms.length >= 2 && d.arms.length <= 3 ? '' : ctx).toBe('');
      if (d.sector) expect(sectorIds).toContain(d.sector);
      if (d.age) expect(C.ages.map((a) => a.id)).toContain(d.age);
      const def = d.arms[d.defaultArm ?? 0];
      expect(def ? '' : `${ctx}: defaultArm`).toBe('');
      if (def) {
        expect(def.cost === undefined ? '' : `${ctx}: default arm has a cost`).toBe('');
        expect((def.effects ?? []).filter((e) => !ONE_OFFS_M3.includes(e.type) && e.type !== 'reserveAdd').map((e) => `${ctx}: ${e.type}`)).toEqual([]);
      }
      for (const a of d.arms) {
        expect(a.price.trim().length > 0 && a.label.length <= 28 && a.outcome.length > 0 ? '' : `${ctx}: ${a.label}`).toBe('');
        if (a.next) expect(dispatchIds.has(a.next) ? '' : `${ctx}: next ${a.next}`).toBe('');
        if (a.reply) expect(a.reply.length <= 70 && noYou(a.reply) && !/[.?]$/.test(a.reply) ? '' : `${ctx}: reply`).toBe('');
        if (a.modifier) expect(a.modifier.years > 0 ? '' : ctx).toBe('');
      }
    }
  });

  test('dispatch text: headline ≤ 70 with no full stop and never “you”; body ≤ 400; known placeholders only', () => {
    for (const d of dispatches) {
      expect(d.headline.length <= 70 && !/[.?]$/.test(d.headline) && noYou(d.headline) ? '' : `${d.id}: ${d.headline}`).toBe('');
      expect(d.body.length <= 400 ? '' : `${d.id}: body ${d.body.length}`).toBe('');
      for (const t of [d.headline, d.body, ...d.arms.flatMap((a) => [a.label, a.outcome, a.price, a.reply ?? ''])]) {
        for (const m of t.matchAll(/\{([a-zA-Z]+)\}/g)) expect(OK_PH.has(m[1]) ? '' : `${d.id}: {${m[1]}}`).toBe('');
      }
    }
  });

  test('ambient: when and stat resolve; variants ≤ 70 at value 1234.5; never “you”', () => {
    for (const a of ambient) {
      if (a.sector) expect(sectorIds).toContain(a.sector);
      if (a.stat) {
        expect(ALL_STATS.has(a.stat.stat) ? '' : a.id).toBe('');
        if (SECTOR_SCOPED.includes(a.stat.stat)) expect(a.stat.sector && sectorIds.includes(a.stat.sector) ? '' : a.id).toBe('');
      }
      for (const t of a.text) {
        const sub = t.replace('{value}', '1,230').replace('{pct}', '123450').replace('{fold}', '1234.5');
        expect(sub.length <= 70 && noYou(t) && !/[.?]$/.test(t) ? '' : `${a.id}: ${t}`).toBe('');
      }
    }
  });
});

describe('M3: the Archive, the Proprietor’s Day and the ending (registered)', () => {
  const subjects = new Set([...ownable, ...dispatchIds, ...castIds]);

  test('Archive notes: at least one graded source; a subject that exists; ids unique', () => {
    expect(new Set(archive.map((a) => a.id)).size).toBe(archive.length);
    for (const a of archive) {
      expect(a.sources.length >= 1 && a.sources.every((x) => x.grade === 'V' || x.grade === 'S') ? '' : a.id).toBe('');
      expect(subjects.has(a.subject) ? '' : `${a.id}: ${a.subject}`).toBe('');
      expect(a.title.length > 0 && a.text.length > 0 ? '' : a.id).toBe('');
      const words = a.text.trim().split(/\s+/).length;
      expect(words >= 60 && words <= 160 ? '' : `${a.id}: ${words} words`).toBe('');
    }
  });

  test('Archive coverage: every efficiency card, lever, use, Commons project and Industry, and The Coal Question', () => {
    const covered = new Set(archive.map((a) => a.subject));
    const need = [
      ...C.upgrades.filter((u) => u.kind === 'efficiency').map((u) => u.id), ...C.levers.map((l) => l.id), ...apps.map((a) => a.id),
      ...commons.map((c) => c.id), ...sectorIds, 'steam.coalQuestion',
    ];
    expect(need.filter((id) => !covered.has(id))).toEqual([]);
  });

  test('the Proprietor’s Day covers all three directions, and its headlines never say “you”', () => {
    const p = C.proprietor;
    if (!p) return;
    for (const dir of ['up', 'down', 'flat'] as const) expect(`${dir} ${p.returns.some((r) => r.direction === dir)}`).toBe(`${dir} true`);
    for (const r of p.returns) expect(r.headline.length <= 70 && !/\byou\b/i.test(r.headline) ? '' : r.headline).toBe('');
    const OK = new Set(['workdayBefore', 'workdayAfter', 'workdayChange', 'decisionsBefore', 'decisionsAfter', 'decisionsChange',
      'sessionsBefore', 'sessionsAfter', 'automatedPerHour', 'cast', 'year', 'age']);
    for (const t of [p.pamphlet.headline, p.pamphlet.body, ...p.returns.flatMap((r) => [r.headline, r.body]), p.withdrawn]) {
      for (const m of t.matchAll(/\{([a-zA-Z]+)\}/g)) expect(OK.has(m[1]) ? '' : `{${m[1]}}`).toBe('');
    }
  });

  test('the ending: retrospective headlines ≤ 70 with known placeholders', () => {
    const e = C.ending;
    if (!e) return;
    const OK = new Set(['year', 'run', 'hours', 'sector', 'age', 'resource', 'service']);
    for (const r of e.retrospective) {
      expect(r.headline.length <= 70 && !/\byou\b/i.test(r.headline) ? '' : r.headline).toBe('');
      for (const m of r.headline.matchAll(/\{([a-zA-Z]+)\}/g)) expect(OK.has(m[1]) ? '' : `${r.key}: {${m[1]}}`).toBe('');
    }
  });
});

/* ------------------------------------------------------------------ */
/* M3: text naming a gated system is gated by that system's feature                                                 */
/* ------------------------------------------------------------------ */

describe('M3: the unfolding in words (a thing that names a system waits for it)', () => {
  /** Words that name a gated system, and the feature that brings it. */
  const NAMES: [RegExp, string][] = [
    [/\bbudget line\b|\bthe line\b|\bdecades? within\b|\bcarbon budget|\bcoal budget|\boil budget|\bpower budget|\battention budget/i, 'budget'],
    [/\bCommons\b/, 'commons'],
    [/\bcharters?\b(?! (flights?|fares?|more flights))/i, 'charters'],
    [/\bSteady State\b/, 'steadyState'],
    [/\bSettle(d|ment)\b/, 'settlement'],
    [/\bseams?\b/i, 'seams'],
    [/\bbites? back\b/i, 'sideEffects'],
    [/\bclear skies\b|\bsink line\b/i, 'clearSkies'],
  ];
  /** Features a condition guarantees: { feature } leaves reachable through `all` (not through `any` or `not`). */
  const guaranteed = (c: Cond | undefined): Set<string> => {
    const out = new Set<string>();
    const walk = (x: Cond) => {
      if ('feature' in x) out.add(x.feature);
      // a seam sunk implies the seams have arrived (sinkSeam is refused before); the proprietor flag implies the survey
      if ('stat' in x && x.stat === 'seamsSunk' && (x.op === '>=' || x.op === '>') && x.value >= (x.op === '>' ? 0 : 1)) out.add('seams');
      if ('flag' in x && x.flag === 'proprietor') out.add('survey');
      if ('all' in x) x.all.forEach(walk);
    };
    if (c) walk(c);
    return out;
  };
  /** Feature arrivals that imply another (a later system's arrival implies the earlier one's). */
  const IMPLIES: Record<string, string[]> = {
    settlement: ['steadyState', 'clearSkies', 'budget'], steadyState: ['clearSkies', 'budget'], clearSkies: ['budget'],
    budgetPace: ['budget'], dividendChoice: ['budget'], leverRepeat: ['budget'],
    // the survey arrives at hour 6 with the Civil Service; Histories after a Steady State
    survey: ['budget', 'charters', 'commons'], histories: ['steadyState', 'clearSkies', 'budget', 'charters', 'commons'],
  };
  const close = (fs: Set<string>) => { for (const f of [...fs]) for (const g of IMPLIES[f] ?? []) fs.add(g); return fs; };
  const named = (t: string) => NAMES.filter(([re]) => re.test(t)).map(([, f]) => f);

  test('dispatches and ambient news that name a gated system carry its { feature } condition', () => {
    const bad: string[] = [];
    for (const d of dispatches) {
      const text = [d.headline, d.body, ...d.arms.flatMap((a) => [a.label, a.outcome, a.price, a.reply ?? ''])].join(' ');
      const cw = castDefs.find((c) => c.id === d.cast)?.when;
      const have = close(new Set([...guaranteed(d.when), ...guaranteed(cw)]));
      // a letter in a seam-, Commons- or budget-specific Industry pool is no exception: the words decide
      for (const f of named(text)) if (!have.has(f) && f !== 'seams') bad.push(`${d.id}: names ${f}`);
      if (named(text).includes('seams') && !have.has('seams')) bad.push(`${d.id}: names the seams`);
    }
    for (const a of ambient) {
      const have = close(guaranteed(a.when));
      for (const f of named(a.text.join(' '))) if (!have.has(f)) bad.push(`${a.id}: names ${f}`);
    }
    expect(bad).toEqual([]);
  });

  test('a lever whose words name a gated system waits for it (requires) or keeps those words in catchAfter', () => {
    const bad: string[] = [];
    for (const l of C.levers) {
      const have = close(new Set((l.requires ?? []).filter((r) => (FEATURE_IDS as readonly string[]).includes(r))));
      for (const f of named([l.name, l.blurb, l.catch, l.sideEffects?.unlessLabel ?? ''].join(' '))) if (!have.has(f)) bad.push(`${l.id}: names ${f}`);
    }
    expect(bad).toEqual([]);
  });

  test('Histories (offered from hour 8) and feature intros name only systems that have arrived by then', () => {
    // Histories arrive after the first Steady State: the budget, clear skies and Steady State are met; Settlement,
    // the seams and the bite may not be, so a History naming them requires that feature.
    const met = close(new Set(['steadyState', 'charters', 'commons']));
    const bad: string[] = [];
    for (const h of histories) {
      const have = close(new Set([...met, ...guaranteed(h.requires)]));
      for (const f of named([h.name, h.blurb, h.goalLabel, h.rebound].join(' '))) if (!have.has(f)) bad.push(`${h.id}: names ${f}`);
    }
    expect(bad).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* M4: the Act, the Previews, shared reserves and feeds, renewable stocks, the unfolding of the Coal Age complete     */
/* ------------------------------------------------------------------ */

const acts = C.acts ?? [];
const actOfAge = (age: string) => acts.find((a) => a.ages.includes(age));
const ageOfSector = (s: string) => C.ages.find((a) => a.sectors.includes(s))!.id;
const previewSectors = sectorIds.filter((s) => actOfAge(ageOfSector(s))?.preview);
/** Industries that open mid-run in some run (every one but sectorOrder[0]). */
const midRunOpeners = C.sectorOrder.slice(1);

describe('M4: the Acts and the Previews', () => {
  test('acts: ids unique; real ages, each in exactly one act; ending sectors in the act, with a settle block', () => {
    expect(acts.length).toBeGreaterThanOrEqual(1);
    expect(new Set(acts.map((a) => a.id)).size).toBe(acts.length);
    for (const age of C.ages) expect(`${age.id} ${acts.filter((a) => a.ages.includes(age.id)).length}`).toBe(`${age.id} 1`);
    for (const a of acts) {
      for (const g of a.ages) expect(C.ages.some((x) => x.id === g) ? '' : `${a.id}: ${g}`).toBe('');
      expect(a.name.length > 0 && a.title.length > 0 ? '' : a.id).toBe('');
      if (a.preview) expect(a.ending ? `${a.id}: a Preview act has no ending` : '').toBe('');
      if (a.capstone) {
        expect(a.ending ? '' : `${a.id}: capstone without an ending`).toBe('');
        const share = a.capstone.incomeShare ?? 0.25;
        expect(share > 0 && share <= 1 ? '' : a.id).toBe('');
      }
      for (const s of a.ending?.sectors ?? []) {
        expect(a.ages.includes(ageOfSector(s)) ? '' : `${a.id}: ${s} is not in the act`).toBe('');
        expect(C.sectors[s].settle ? '' : `${a.id}: ${s} cannot be settled`).toBe('');
      }
    }
  });

  test('Act I is the Coal Age: Steam, Light, Iron and Fishing settled at once, then capstoned; Acts II and III are Previews', () => {
    const one = acts[0];
    expect(one.id).toBe('actOne');
    expect(one.ages).toEqual(['coal']);
    expect(one.ending).toEqual({ id: 'actOne', sectors: ['steam', 'light', 'iron', 'fishing'] });
    expect(one.ending!.sectors).toEqual(C.ages.find((a) => a.id === 'coal')!.sectors);
    expect(one.capstone?.incomeShare).toBe(0.25);
    expect(acts.slice(1).every((a) => a.preview)).toBe(true);
    expect(previewSectors).toEqual(['motion', 'compute', 'code']);
  });

  test('a Preview opens only after an ending (from the next run) or once opened before (owns itself)', () => {
    const endings = new Set(acts.flatMap((a) => (a.ending ? [a.ending.id] : [])));
    for (const s of previewSectors) {
      const w = C.sectors[s].unlock?.when;
      const top = w && 'all' in w ? w.all : [];
      const gate = top.find((c) => 'any' in c);
      expect(gate ? '' : `${s}: no Preview gate`).toBe('');
      if (!gate || !('any' in gate)) continue;
      const ls = leaves(gate);
      expect(ls.some((x) => 'ending' in x && endings.has(x.ending)) ? '' : `${s}: no ending leaf`).toBe('');
      // not in the run that reached the ending (flags.won holds for the rest of it): from the next run, the capstone's
      expect(ls.some((x) => 'flag' in x && x.flag === 'won') ? '' : `${s}: opens in the ending's own run`).toBe('');
      expect(gate.any.some((x) => 'owns' in x && x.owns === s) ? '' : `${s}: an older save loses it`).toBe('');
      // its opening conditions may not need a card in a capstoned (settled) Coal Age Industry
      const coal = new Set(C.upgrades.filter((u) => !previewSectors.includes(u.sector)).map((u) => u.id));
      expect(top.flatMap(leaves).filter((x) => 'owns' in x && coal.has(x.owns)).map((x) => `${s}: ${JSON.stringify(x)}`)).toEqual([]);
    }
  });

  test('one Preview a run: each after the first waits for the widget that arrives at the Reckoning after the one before', () => {
    const top = (s: string) => { const w = C.sectors[s].unlock!.when!; return 'all' in w ? w.all : [w]; };
    expect(top('compute').some((x) => 'feature' in x && x.feature === 'travel')).toBe(true);
    expect(top('code').some((x) => 'feature' in x && x.feature === 'freeAtUse')).toBe(true);
    for (const [f, s] of [['travel', 'motion'], ['freeAtUse', 'compute']] as const) {
      const w = C.features![f]!.when;
      expect(leaves(w).some((x) => 'owns' in x && x.owns === s)).toBe(true);
      expect(leaves(w).some((x) => 'stat' in x && x.stat === 'time' && x.op === '<' && x.value <= 2)).toBe(true);
    }
  });
});

describe('M4: shared reserves, feeds and renewable stocks', () => {
  test('resourceStock names a stock sector that draws from no other; the drawer is a stock sector too', () => {
    for (const s of sectorIds) {
      const o = C.sectors[s].resourceStock;
      if (!o) continue;
      expect(o !== s && C.sectors[o] ? '' : `${s}: ${o}`).toBe('');
      expect(C.sectors[o]?.resourceKind === 'stock' && !C.sectors[o]?.resourceStock ? '' : `${s}: owner ${o}`).toBe('');
      expect(C.sectors[s].resourceKind === 'stock' ? '' : `${s}: not a stock sector`).toBe('');
    }
  });

  test('feeds name real targets with capCostMul in (0, 1); feeds, spill and drawsOn together have no cycle', () => {
    const edges = new Map<string, Set<string>>(sectorIds.map((s) => [s, new Set<string>()]));
    for (const s of sectorIds) {
      const d = C.sectors[s];
      if (d.spill) edges.get(s)!.add(d.spill.to);
      if (d.drawsOn) edges.get(s)!.add(d.drawsOn.sector);
      for (const a of d.applications) {
        for (const f of a.feeds ?? []) {
          expect(f.capCostMul > 0 && f.capCostMul < 1 ? "" : `${a.id}: ${f.capCostMul}`).toBe("");
          // M4 (finish): a demand feed widens (satMul ≥ 1, at most ×3) one named use of an explicit target, or all of it
          if (f.satMul !== undefined) expect(f.satMul >= 1 && f.satMul <= 3 ? '' : `${a.id}: satMul ${f.satMul}`).toBe('');
          if (f.app !== undefined) expect(f.sector !== '*' && C.sectors[f.sector]?.applications.some((x) => x.id === f.app) ? '' : `${a.id}: app ${f.app}`).toBe('');
          if (f.sector === '*') { for (const t of sectorIds) if (t !== s) edges.get(s)!.add(t); continue; }
          expect(sectorIds.includes(f.sector) && f.sector !== s ? '' : `${a.id}: ${f.sector}`).toBe('');
          edges.get(s)!.add(f.sector);
        }
      }
    }
    // only edges that start at a feed source can close a cycle through it: check every source
    const reaches = (from: string, to: string, seen = new Set<string>()): boolean => {
      for (const n of edges.get(from) ?? []) {
        if (n === to) return true;
        if (!seen.has(n)) { seen.add(n); if (reaches(n, to, seen)) return true; }
      }
      return false;
    };
    const sources = sectorIds.filter((s) => C.sectors[s].applications.some((a) => (a.feeds ?? []).length));
    expect(sources.filter((s) => reaches(s, s))).toEqual([]);
    expect(sources).toEqual(['iron']);
  });

  test('a renewable sector has its stock, pressure from depletion, and its last crisis at the threshold (1 − θ)', () => {
    for (const s of sectorIds) {
      const d = C.sectors[s];
      const isR = d.resourceKind === 'renewable';
      expect(`${s} ${isR} ${!!d.renewable}`).toBe(`${s} ${isR} ${isR}`);
      if (!isR) { expect(d.pressureSource === 'depletion' ? `${s}: depletion without a stock` : '').toBe(''); continue; }
      const r = d.renewable!;
      expect(d.pressureSource).toBe('depletion');
      expect(Math.abs(d.crisisAt[d.crisisAt.length - 1] - (1 - r.threshold)) < 1e-9 ? '' : `${s}: last crisis ${d.crisisAt[d.crisisAt.length - 1]}`).toBe('');
      expect(r.threshold > 0 && r.threshold < 0.5 && r.beta > 0 && r.beta < 1 ? '' : s).toBe('');
      // the Board's free first survey: the moment comes at least five minutes after the Industry opens (by clock)
      if (r.firstSurvey) expect(r.firstSurvey.afterSeconds).toBeGreaterThanOrEqual(300);
    }
  });

  test('quota levers only on renewable sectors, and only once the budget has arrived', () => {
    for (const l of C.levers.filter((x) => x.kind === 'quota')) {
      expect(C.sectors[l.sector].resourceKind === 'renewable' ? '' : l.id).toBe('');
      expect(l.requires ?? []).toContain('budget');
      expect(l.repeat!.valueStep).toBeLessThan(0);
    }
  });

  test('Fishing settles only surveyed; the full account arrives with the Board’s Survey (the core reads the flag)', () => {
    expect(leaves(C.sectors.fishing.settle!.requires!).some((x) => 'stat' in x && x.stat === 'surveyed')).toBe(true);
    expect(leaves(C.features!.estimates!.when).some((x) => 'flag' in x && x.flag === 'survey:fishing')).toBe(true);
    expect(C.surveyReveal ? ['small', 'large', 'failed'].map((k) => C.surveyReveal!.variants.filter((v) => v.when === k).length) : []).toEqual([1, 1, 1]);
  });
});

describe('M4: the Industry kit (Iron & Steel, Fishing)', () => {
  const M4_SECTORS = ['iron', 'fishing'];
  test('six uses (the first free), five or more efficiency cards, two forks, a research card, five levers, one that bites back', () => {
    for (const s of M4_SECTORS) {
      const d = C.sectors[s];
      const ups = C.upgrades.filter((u) => u.sector === s);
      const forks = new Set(ups.flatMap((u) => (u.excludes ?? []).map((x) => [u.id, x].sort().join('|'))));
      const levers = C.levers.filter((l) => l.sector === s);
      expect([
        `${s} apps ${d.applications.length >= 6}`, `${s} free ${d.applications[0].foundCost === 0}`,
        `${s} efficiency ${ups.filter((u) => u.kind === 'efficiency').length >= 5}`, `${s} forks ${forks.size >= 2}`,
        `${s} research ${ups.some((u) => u.kind === 'research')}`, `${s} levers ${levers.length >= 5}`,
        `${s} bites ${levers.some((l) => l.sideEffects)}`, `${s} mechanic ${!!d.mechanic}`, `${s} settle ${!!d.settle}`,
      ]).toEqual([
        `${s} apps true`, `${s} free true`, `${s} efficiency true`, `${s} forks true`, `${s} research true`,
        `${s} levers true`, `${s} bites true`, `${s} mechanic true`, `${s} settle true`,
      ]);
    }
  });

  test('sixty sector headlines each', () => {
    for (const s of M4_SECTORS) {
      const n = Object.values(C.sectorHeadlines?.[s] ?? {}).flat().length;
      expect(`${s} ${n >= 60}`).toBe(`${s} true`);
    }
  });

  test('Iron draws Steam’s coal; Fishing draws Steam’s power and is renewable', () => {
    expect(C.sectors.iron.resourceStock).toBe('steam');
    expect(C.sectors.fishing.drawsOn?.sector).toBe('steam');
    expect(C.sectors.fishing.resourceKind).toBe('renewable');
  });

  test('what serves an M4 Industry waits for it: its Institutions (when), Charters (requires) and its levers’ conditions', () => {
    const waits = (c: Cond | undefined, s: string) => !!c && leaves(c).some((x) => 'owns' in x && x.owns === s);
    for (const i of C.institutions) {
      const named = new Set(effectSectors([...i.effects, ...(i.nextLevels ?? []).flatMap((l) => l.effects)]).concat(
        [...i.effects, ...(i.nextLevels ?? []).flatMap((l) => l.effects)].flatMap((e) => (e.type === 'startLever' ? [C.levers.find((l) => l.id === e.lever)!.sector] : []))));
      for (const s of M4_SECTORS) if (named.size === 1 && named.has(s)) expect(waits(i.when, s) ? '' : `${i.id}: waits for ${s}`).toBe('');
    }
    for (const c of charters) if (c.sector && M4_SECTORS.includes(c.sector)) expect(waits(c.requires, c.sector) ? '' : `${c.id}: waits for ${c.sector}`).toBe('');
    // the fishery limits wait for the foreign fleets (design §5.7)
    const lim = C.levers.find((l) => l.id === 'fishing.limits')!;
    expect(lim.when && leaves(lim.when).some((x) => 'stat' in x && x.stat === 'foreignShare')).toBe(true);
    // M4 (finish): foreign fleets' room in [0, 1) (ForeignDef.room)
    for (const s of sectorIds) { const r = C.sectors[s].renewable?.foreign?.room; if (r !== undefined) expect(r >= 0 && r < 1 ? '' : `${s}: room ${r}`).toBe(''); }
    // the order book's lines wait for Jevons's chapter on iron
    expect(waits(C.sectors.iron.mechanic?.feedsKnownWhen, 'iron.economyOfFuel')).toBe(true);
  });
});

describe('M4: the unfolding of the Coal Age complete (design §9)', () => {
  const F = C.features ?? {};
  const PREVIEW_FEATURES = ['travel', 'freeAtUse'];
  const isGuard = (c: Cond) => 'not' in c && 'ending' in c.not && c.not.ending === 'actOne';

  test('nothing of Act I arrives after the Act I ending: every Act I feature carries the guard at its top level', () => {
    for (const id of FEATURE_IDS) {
      if (id === 'bank' || PREVIEW_FEATURES.includes(id)) continue;
      const w = F[id]!.when;
      const top = 'all' in w ? w.all : [w];
      expect(`${id} ${top.some(isGuard)}`).toBe(`${id} true`);
    }
    // the Previews' widgets wait on their Industries, which wait on the ending (or an older save's own opening)
    for (const id of PREVIEW_FEATURES) expect(leaves(F[id as 'travel']!.when).some((x) => 'owns' in x && previewSectors.includes(x.owns))).toBe(true);
  });

  test('Iron opens mid-run in run 4, clear of the Commons; Fishing in run 6, twenty minutes in, after Settlement', () => {
    const iron = C.sectors.iron.unlock!;
    const fishing = C.sectors.fishing.unlock!;
    expect(`${iron.minReckonings} ${timeFloor(iron.when!) >= 600}`).toBe('3 true');
    expect(`${fishing.minReckonings} ${timeFloor(fishing.when!) >= 1200}`).toBe('5 true');
    expect(leaves(fishing.when!).some((x) => 'feature' in x && x.feature === 'settlement')).toBe(true);
    expect(rkFloor(F.commons!.when)).toBe(3);
  });

  test('run 6 is Fishing’s and the Survey’s: no other feature has run 6 as its floor; the Survey needs no Reckoning', () => {
    const at6 = FEATURE_IDS.filter((id) => id !== 'bank' && rkFloor(F[id]!.when) === 5);
    expect(at6).toEqual([]);
    expect(rkFloor(F.estimates!.when)).toBeNull();
  });

  test('every mid-run feature keeps five minutes clear of any Industry opening (StatKey openFor)', () => {
    for (const id of ['seams', 'load', 'archive', 'sideEffects'] as const) {
      const guarded = new Set(leaves(F[id]!.when).flatMap((x) => ('stat' in x && x.stat === 'openFor' && x.op === '<' && x.value >= 300 && x.sector ? [x.sector] : [])));
      expect(`${id} ${midRunOpeners.filter((s) => !guarded.has(s)).join(',')}`).toBe(`${id} `);
    }
  });

  test('the Archive by run 9, the bite by run 10, the household survey a run after the Board’s Survey (M4 polish)', () => {
    expect(rkFloor(F.archive!.when)).toBeLessThanOrEqual(8);
    expect(rkFloor(F.sideEffects!.when)).toBeLessThanOrEqual(9);
    expect(rkFloor(F.survey!.when)).toBe(6);
  });
});
