// The dispatches lane's own lint: the cast, the dispatches, ambient news and the new headline keys, checked against
// the rest of the content (read-only). The shared lint (content.test.ts) will take these rules over once the registry
// wires our modules in; until then this file keeps our content honest. Rules: design/scratch/m3-register-dispatches.md.
// @ts-ignore
import { describe, expect, test } from 'bun:test';
import { content } from '../index';
import { dispatches } from './index';
import { headlines } from '../news/fallback';
import type { Cond, DispatchDef, EffectDef, StatKey } from '../../types';
import { FEATURE_IDS } from '../../types';

const C = content;
/* M4: the registered cast and ambient news (M3's plus the text lane's M4 additions, folded in by the registry). */
const cast = C.cast ?? [];
const ambient = C.ambient ?? [];
const coalSectors = new Set(C.ages.find((a) => a.id === 'coal')!.sectors);
const sectorIds = Object.keys(C.sectors);
const ageIds = C.ages.map((a) => a.id);
const apps = sectorIds.flatMap((s) => C.sectors[s].applications.map((a) => ({ id: a.id, sector: s })));
const appIds = new Set(apps.map((a) => a.id));
const upgradeIds = new Set(C.upgrades.map((u) => u.id));
const leverIds = new Set(C.levers.map((l) => l.id));
const commonsIds = new Set((C.commons ?? []).map((c) => c.id));
const castIds = new Set(cast.map((c) => c.id));
const dispatchIds = new Set(dispatches.map((d) => d.id));
const ownable = new Set([
  ...upgradeIds, ...appIds, ...leverIds, ...C.institutions.map((i) => i.id), ...C.knowhow.map((k) => k.id),
  ...C.achievements.map((a) => a.id), ...(C.dividends ?? []).map((d) => d.id), ...commonsIds,
  ...(C.charters ?? []).map((c) => c.id), ...sectorIds,
  /* M5: pledges, Articles, playbooks and loophole rungs are ownable */
  ...(C.pledges ?? []).map((p) => p.id), ...(C.articles ?? []).map((a) => a.id), ...(C.playbooks ?? []).map((p) => p.id),
  ...(C.loopholes ?? []).map((l) => l.id),
]);
const loopholeIds = new Set((C.loopholes ?? []).map((l) => l.id));
const GLOBAL_STATS: StatKey[] = [
  'time', 'year', 'wellbeing', 'population', 'capital', 'mandate', 'reckonings', 'steadyYearsAll', 'clicks',
  'decisions', 'automated', 'commonsLevels', 'sectorsSettled', 'leanDecades', 'fullDecades',
  'steadySectors', 'dispatchesAnswered', 'historiesCleared', 'totalHours', 'bankedSeconds',
  /* M4 */
  'capstoned',
  /* M5 */
  'confidence', 'inOffice', 'inOpposition', 'electionsWon', 'ministries', 'treaties', 'precedent', 'settledFromChair',
  'parliamentWagers', 'rivalCapital',
];
const SECTOR_STATS: StatKey[] = [
  'etaFold', 'rFold', 'frontierFold', 'peakRFold', 'rebound', 'resourceUse', 'demand', 'servicePrice',
  'serviceDelivered', 'reserveFraction', 'pressureFraction', 'crises', 'steadyYears', 'budgetDecades',
  'withinBudget', 'appsFounded', 'settled', 'clear', 'clearYears', 'leanDecades', 'fullDecades',
  'seamsSunk', 'loadFactor', 'travelHours', 'sprawl', 'bite',
  /* M4 (and the amendment's feedShare) */
  'openFor', 'stockFraction', 'reportedStock', 'foreignShare', 'scarYears', 'surveyed', 'budgetHeadroom', 'feedFactor',
  'arrears', 'feedShare',
  /* M5 */
  'concealment', 'yearsSinceInspection', 'certifiedDecades', 'waterApplied', 'waterConsumed', 'returnShare', 'loopholesUsed',
];
const APP_STATS: StatKey[] = ['adoption', 'appDemand'];
const FRACTION_STATS: StatKey[] = ['reserveFraction', 'pressureFraction', 'rebound', 'adoption', 'loadFactor', 'withinBudget',
  /* M4 */ 'reportedStock', 'stockFraction', 'foreignShare', 'feedFactor', 'feedShare'];
/** M4: the act endings a { ending } leaf may name. */
const endingIds = new Set((C.acts ?? []).flatMap((a) => (a.ending ? [a.ending.id] : [])));

function condProblems(where: string, c: Cond | undefined, out: string[]) {
  if (!c) return;
  if ('all' in c) { c.all.forEach((x) => condProblems(where, x, out)); return; }
  if ('any' in c) { c.any.forEach((x) => condProblems(where, x, out)); return; }
  if ('not' in c) { condProblems(where, c.not, out); return; }
  if ('owns' in c) { if (!ownable.has(c.owns)) out.push(`${where}: owns ${c.owns}`); return; }
  if ('answered' in c) { if (!dispatchIds.has(c.answered)) out.push(`${where}: answered ${c.answered}`); return; }
  if ('flag' in c) return;
  // M3 (added by the content-mechanics lane): { feature } is true once that feature has arrived
  if ('feature' in c) { if (!(FEATURE_IDS as readonly string[]).includes(c.feature)) out.push(`${where}: feature ${c.feature}`); return; }
  if ('returned' in c) return;
  /* M4 */
  if ('ending' in c) { if (!endingIds.has(c.ending)) out.push(`${where}: ending ${c.ending}`); return; }
  /* M5 */
  if ('loophole' in c) { if (!loopholeIds.has(c.loophole)) out.push(`${where}: loophole ${c.loophole}`); return; }
  if ('stat' in c) {
    if (GLOBAL_STATS.includes(c.stat)) return;
    if (SECTOR_STATS.includes(c.stat)) { if (!c.sector || !sectorIds.includes(c.sector)) out.push(`${where}: ${c.stat} needs a real sector`); return; }
    if (APP_STATS.includes(c.stat)) { if (!c.app || !appIds.has(c.app)) out.push(`${where}: ${c.stat} needs a real app`); return; }
    out.push(`${where}: unknown stat ${c.stat}`);
    return;
  }
  out.push(`${where}: unknown leaf ${JSON.stringify(c)}`);
}

/** The least number of Reckonings a condition implies (conservative: unknown leaves imply 0). */
function minRk(c: Cond | undefined): number {
  if (!c) return 0;
  if ('all' in c) return Math.max(0, ...c.all.map(minRk));
  if ('any' in c) return c.any.length ? Math.min(...c.any.map(minRk)) : 0;
  if ('stat' in c && c.stat === 'reckonings' && (c.op === '>=' || c.op === '>')) return c.op === '>' ? c.value + 1 : c.value;
  if ('owns' in c && sectorIds.includes(c.owns)) return C.sectors[c.owns].unlock?.minReckonings ?? 0;
  if ('owns' in c && c.owns === 'steadyState') return 3;
  if ('flag' in c && c.flag === 'proprietor') return 3;
  if ('feature' in c) return FEATURE_RK[c.feature] ?? 0;
  return 0;
}
/** The least Reckonings before each feature can arrive (src/content/features.ts; conservative). */
const FEATURE_RK: Record<string, number> = {
  market: 1, moreLevers: 1, ambient: 1, dispatches: 1, charters: 2, budget: 2, leverRepeat: 2, dividendChoice: 2,
  budgetPace: 2, clearSkies: 2, commons: 3, steadyState: 3, archive: 3, seams: 3, load: 3, travel: 3, sideEffects: 3,
  freeAtUse: 3, survey: 3, histories: 3, settlement: 4,
  /* M4: the full account arrives with the Board's Survey in run 6 */
  estimates: 5,
  /* M5: after the Act I ending (run 9 at the earliest) */
  chair: 9, loopholes: 9, inspection: 10, treasury: 10, statecraft: 11, charge: 12, treaty: 13,
};
const hasFeature = (c: Cond, ...ids: string[]) => implies(c, (l) => 'feature' in l && ids.includes(l.feature));
/** Does the condition contain this leaf (as a conjunct along `all` paths, or in every branch of an `any`)? */
function implies(c: Cond | undefined, test: (leaf: Cond) => boolean): boolean {
  if (!c) return false;
  if (test(c)) return true;
  if ('all' in c) return c.all.some((x) => implies(x, test));
  if ('any' in c) return c.any.length > 0 && c.any.every((x) => implies(x, test));
  return false;
}
const gateOf = (d: DispatchDef): Cond => {
  const cw = cast.find((c) => c.id === d.cast)?.when;
  return { all: [...(cw ? [cw] : []), ...(d.when ? [d.when] : []), ...(d.sector ? [{ owns: d.sector }] : [])] };
};

const ONE_OFF = new Set(['mandateAdd', 'capitalAdd', 'populationMul', 'pressureAdd', 'metaFlag', 'slotAdd', /* M5 */ 'confidenceAdd']);
function effectProblems(where: string, e: EffectDef, out: string[], wager = false) {
  const s = (e as { sector?: string }).sector;
  if (s !== undefined && !sectorIds.includes(s)) out.push(`${where}: sector ${s}`);
  const a = (e as { app?: string }).app;
  if (a !== undefined && !appIds.has(a)) out.push(`${where}: app ${a}`);
  if (e.type === 'costMulOf' && !(upgradeIds.has(e.id) || appIds.has(e.id) || commonsIds.has(e.id) || sectorIds.includes(e.id))) out.push(`${where}: costMulOf ${e.id}`);
  if (e.type === 'forbid' && e.id && !(upgradeIds.has(e.id) || appIds.has(e.id) || commonsIds.has(e.id) || leverIds.has(e.id))) out.push(`${where}: forbid ${e.id}`);
  /* magnitudes */
  const v = (e as { value?: number }).value;
  const mul = ['etaMul', 'capCostMul', 'satMul', 'halfPriceMul', 'popGrowthMul', 'mandateRateMul', 'costMul', 'resourcePriceMul', 'intensityMul', 'incomeMul', 'costMulOf', 'commonsYieldMul', /* M4 */ 'foreignMul'];
  if (mul.includes(e.type) && (v! < 0.8 || v! > 1.25)) out.push(`${where}: ${e.type} ${v} outside [0.8, 1.25]`);
  if (e.type === 'mandateAdd' && Math.abs(v!) > 150) out.push(`${where}: mandateAdd ${v}`);
  if (e.type === 'capitalAdd' && Math.abs(v!) > 90) out.push(`${where}: capitalAdd ${v}`);
  if (e.type === 'populationMul' && (v! < 0.95 || v! > 1.05)) out.push(`${where}: populationMul ${v}`);
  if (e.type === 'pressureAdd' && Math.abs(v!) > 0.08) out.push(`${where}: pressureAdd ${v}`);
  if (e.type === 'wellbeingAdd' && Math.abs(v!) > 1) out.push(`${where}: wellbeingAdd ${v}`);
  if (e.type === 'absorptionAdd' && Math.abs(v!) > 0.002) out.push(`${where}: absorptionAdd ${v}`);
  if (e.type === 'marginAdd' && Math.abs(v!) > 0.03) out.push(`${where}: marginAdd ${v}`);
  /* M4 (finish): a wager's branches may stake Hindsight itself (a share of the run's, at most 4% each way); an ordinary
   * arm may not (its bounds are M3's) */
  if (e.type === 'hindsightShare' && (!wager || Math.abs(v!) > 0.04)) out.push(`${where}: hindsightShare ${v}${wager ? ' outside ±0.04' : ' only on a wager branch'}`);
  /* M3 finish: the three new kinds */
  if ((e.type === 'leakMul' || e.type === 'spillMul') && (v! < 0.5 || v! > 2)) out.push(`${where}: ${e.type} ${v} outside [0.5, 2]`);
  if (e.type === 'leverCostMul' && [e.cost ?? 1, e.upkeep ?? 1].some((x) => x < 0.5 || x > 2)) out.push(`${where}: leverCostMul outside [0.5, 2]`);
  if (e.type === 'leverCostMul' && e.lever !== undefined && !leverIds.has(e.lever)) out.push(`${where}: leverCostMul ${e.lever}`);
  /* M5 */
  if (e.type === 'confidenceAdd' && Math.abs(v!) > 8) out.push(`${where}: confidenceAdd ${v}`);
  if ((e.type === 'inspectorAdd' || e.type === 'pledgeOfferAdd') && Math.abs(v!) > 1) out.push(`${where}: ${e.type} ${v}`);
  if (e.type === 'quietYearsAdd' && Math.abs(v!) > 3) out.push(`${where}: quietYearsAdd ${v}`);
  if (['fineMul', 'amendYearsMul', 'litigateYearsMul', 'compensationMul', 'rivalCostMul', 'popularityYearsMul'].includes(e.type) && (v! < 0.5 || v! > 2)) out.push(`${where}: ${e.type} ${v} outside [0.5, 2]`);
  if (['certify', 'ratchet', 'termYearsAdd', 'returnShareMul'].includes(e.type)) out.push(`${where}: ${e.type} is not for dispatches`);
  if (['slotAdd', 'reveal', 'unlock', 'startLever', 'startFounded', 'institutionLoan', 'orderUnlock', 'offlineCapAdd', 'startCapitalMul', 'metaFlag', 'settleSlotAdd'].includes(e.type)) out.push(`${where}: ${e.type} is not for dispatches`);
}
/** An effect that costs the player something (or trades one good for another). */
function adverse(e: EffectDef): boolean {
  const v = (e as { value?: number }).value ?? 0;
  switch (e.type) {
    case 'pressureAdd': return v > 0;
    case 'populationMul': return v < 1;
    case 'mandateAdd': case 'capitalAdd': case 'wellbeingAdd': case 'absorptionAdd': case 'marginAdd': case 'hindsightShare': return v < 0;
    case 'incomeMul': case 'mandateRateMul': case 'commonsYieldMul': return v < 1;
    case 'intensityMul': case 'costMul': case 'costMulOf': case 'capCostMul': return v > 1;
    case 'satMul': case 'halfPriceMul': case 'resourcePriceMul': case 'popGrowthMul': return v !== 1;
    case 'forbid': case 'suspendOrder': return true;
    case 'leakMul': case 'spillMul': case 'foreignMul': return v > 1;
    case 'leverCostMul': return (e.cost ?? 1) > 1 || (e.upkeep ?? 1) > 1;
    /* M5 */
    case 'confidenceAdd': case 'inspectorAdd': case 'quietYearsAdd': case 'pledgeOfferAdd': return v < 0;
    case 'fineMul': return v < 1;
    case 'amendYearsMul': case 'litigateYearsMul': case 'compensationMul': return v > 1;
    case 'rivalCostMul': return v < 1;
    default: return false;
  }
}

const words = (t: string) => t.replace(/\{[a-z]+\}/g, '');
const M5_CAST = new Set(['pryceChair', 'permanentSecretary', 'chiefInspector', 'opposition', 'okonedo']);
const SYSTEM_WORDS: { re: RegExp; gate: (c: Cond) => boolean; name: string; m5?: boolean }[] = [
  { name: 'budget', re: /\b(budget|the line|its line|their lines|decade within|decades within|lean decade|full decade)\b/i, gate: (c) => hasFeature(c, 'budget', 'leverRepeat', 'dividendChoice', 'budgetPace', 'clearSkies', 'steadyState', 'settlement') },
  { name: 'Commons', re: /\bCommons\b/, gate: (c) => hasFeature(c, 'commons') },
  { name: 'Charter', re: /\bcharters?\b(?! (flights?|fares?|more flights))/i, gate: (c) => hasFeature(c, 'charters') },
  { name: 'Steady State', re: /\bSteady State\b/, gate: (c) => hasFeature(c, 'steadyState', 'settlement') || implies(c, (l) => 'owns' in l && l.owns === 'steadyState') },
  { name: 'Settlement', re: /\bsettle(d|ment)?\b/i, gate: (c) => hasFeature(c, 'settlement') },
  { name: 'seams', re: /\bseams?\b/i, gate: (c) => hasFeature(c, 'seams') },
  { name: 'Hindsight', re: /\b(Hindsight|Know-how)\b/, gate: () => false },
  /* M5 */
  { m5: true, name: 'Inspector', re: /\b(Inspectors?|Inspectorate|inspection)\b/i, gate: (c) => hasFeature(c, 'inspection') },
  { m5: true, name: 'loophole', re: /\bloopholes?\b/i, gate: (c) => hasFeature(c, 'loopholes') || implies(c, (l) => 'loophole' in l) },
  { m5: true, name: 'Opposition', re: /\b(Opposition|election|manifesto|polls)\b/, gate: (c) => hasFeature(c, 'chair') || implies(c, (l) => 'flag' in l && l.flag === 'office') },
  { m5: true, name: 'Treaty', re: /\b(Treaty|Precedent)\b/, gate: (c) => hasFeature(c, 'treaty') },
];

describe('the cast', () => {
  test('ids unique; six people plus successors and Miss Whitlow', () => {
    expect(castIds.size).toBe(cast.length);
    for (const id of ['correspondent', 'whitlow', 'fenwick', 'ashworth', 'pryce', 'minister', 'missWhitlow']) expect(castIds.has(id)).toBe(true);
  });
  test('every member has a role, a voice, a figure and a gate that resolves', () => {
    const out: string[] = [];
    for (const c of cast) {
      if (!c.role || !c.voice || !c.figure) out.push(`${c.id}: incomplete`);
      condProblems(`cast.${c.id}`, c.when, out);
    }
    expect(out).toEqual([]);
  });
  test('Miss Whitlow writes only after the Proprietor’s Day', () => {
    expect(cast.find((c) => c.id === 'missWhitlow')!.when).toEqual({ flag: 'proprietor' });
  });
});

describe('dispatches: shape and references', () => {
  test('ids unique, and unique against every other content id', () => {
    expect(dispatchIds.size).toBe(dispatches.length);
    const clash = dispatches.filter((d) => ownable.has(d.id) || castIds.has(d.id)).map((d) => d.id);
    expect(clash).toEqual([]);
  });
  test('cast, sector, age, next and conditions resolve', () => {
    const out: string[] = [];
    for (const d of dispatches) {
      if (!castIds.has(d.cast)) out.push(`${d.id}: cast ${d.cast}`);
      if (d.sector && !sectorIds.includes(d.sector)) out.push(`${d.id}: sector ${d.sector}`);
      if (d.age && !ageIds.includes(d.age)) out.push(`${d.id}: age ${d.age}`);
      condProblems(d.id, d.when, out);
      d.arms.forEach((a, i) => { if (a.next && !dispatchIds.has(a.next)) out.push(`${d.id}[${i}]: next ${a.next}`); });
    }
    expect(out).toEqual([]);
  });
  test('two or three arms; every arm labelled, explained and priced; the default harmless', () => {
    const out: string[] = [];
    for (const d of dispatches) {
      if (d.arms.length < 2 || d.arms.length > 3) out.push(`${d.id}: ${d.arms.length} arms`);
      const di = d.defaultArm ?? 0;
      if (di < 0 || di >= d.arms.length) out.push(`${d.id}: defaultArm ${di}`);
      d.arms.forEach((a, i) => {
        const w = `${d.id}[${i}]`;
        if (!a.label || a.label.length > 28) out.push(`${w}: label (${a.label.length}) ${a.label}`);
        if (!/^[A-Z]/.test(a.label)) out.push(`${w}: label not capitalised`);
        if (!a.outcome || !/\.$/.test(a.outcome) || (a.outcome.match(/\. [A-Z]/g) ?? []).length > 0) out.push(`${w}: outcome must be one sentence: ${a.outcome}`);
        if (!a.price || a.price.length > 60) out.push(`${w}: price (${a.price?.length})`);
        const effs = [...(a.effects ?? []), ...(a.modifier?.effects ?? [])];
        for (const e of effs) effectProblems(w, e, out);
        if (a.modifier && (a.modifier.years < 5 || a.modifier.years > 15)) out.push(`${w}: modifier ${a.modifier.years} years`);
        if (a.cost?.mandate && a.cost.mandate > 200) out.push(`${w}: mandate cost ${a.cost.mandate}`);
        if (a.cost?.capitalSeconds && a.cost.capitalSeconds > 90) out.push(`${w}: capital cost ${a.cost.capitalSeconds}`);
        const priced = !!(a.cost?.mandate || a.cost?.capitalSeconds) || effs.some(adverse);
        if (!priced) out.push(`${w}: no mechanical price (P9: no free answer)`);
        if (i === di) {
          if (a.cost) out.push(`${w}: default arm has a cost`);
          if ((a.effects ?? []).some((e) => !ONE_OFF.has(e.type))) out.push(`${w}: default arm has standing effects`);
          if (a.modifier && a.modifier.years > 10) out.push(`${w}: default modifier over 10 years`);
        }
      });
      if (!d.rebound) out.push(`${d.id}: no named rebound`);
    }
    expect(out).toEqual([]);
  });
  test('text: lengths, house style, placeholders', () => {
    const out: string[] = [];
    const OK = new Set(['sector', 'resource', 'service', 'age', 'year', 'cast']);
    const headline = (w: string, h: string) => {
      if (h.length > 70) out.push(`${w}: headline ${h.length}: ${h}`);
      if (/[.?]$/.test(h) || /\?/.test(h)) out.push(`${w}: headline punctuation: ${h}`);
      if (/\byou(r|rs)?\b/i.test(h)) out.push(`${w}: headline says you: ${h}`);
      if (!/^([A-Z“‘{]|(info|warn|error|fatal): )/.test(h)) out.push(`${w}: headline not sentence case: ${h}`);
    };
    for (const d of dispatches) {
      headline(d.id, d.headline);
      if (d.body.length > 400) out.push(`${d.id}: body ${d.body.length}`);
      if (/\?/.test(d.body)) out.push(`${d.id}: rhetorical question in body`);
      d.arms.forEach((a, i) => { if (a.reply) headline(`${d.id}[${i}].reply`, a.reply); });
      const strings = [d.headline, d.body, ...d.arms.flatMap((a) => [a.label, a.outcome, a.price, a.reply ?? ''])];
      for (const t of strings) {
        if (/!|"|'| - | – /.test(t)) out.push(`${d.id}: punctuation: ${t}`);
        if (/\b(sector|sectors|era|eras|ironically|smog)\b/i.test(words(t)) && !(/\bsmog\b/i.test(t) && d.sector && !coalSectors.has(d.sector))) out.push(`${d.id}: banned word: ${t}`);
        for (const m of t.matchAll(/\{([a-z]+)\}/gi)) {
          if (!OK.has(m[1])) out.push(`${d.id}: placeholder {${m[1]}}`);
          if (['sector', 'resource', 'service'].includes(m[1]) && !d.sector) out.push(`${d.id}: {${m[1]}} without a sector`);
        }
        if (/\b(colou?rs?|centers?|tires?|curbs?|program)\b/.test(t) && /\b(colors?|centers?|tires?|curbs?)\b/i.test(t)) out.push(`${d.id}: Americanism: ${t}`);
        if (/\b[a-z]+iz(e|es|ed|ing|ation)\b/i.test(t) && !/\b(size|sizes|sized|prize|prizes|seize|seized|seizes)\b/i.test(t)) out.push(`${d.id}: -ize: ${t}`);
      }
    }
    expect(out).toEqual([]);
  });
});

describe('dispatches: the unfolding', () => {
  test('the first letter comes first: every other correspondent letter waits for it', () => {
    const first = dispatches.find((d) => d.id === 'd.gen.firstLetter')!;
    expect(first.once).toBe(true);
    const bad = dispatches.filter((d) => d.cast === 'correspondent' && d.id !== first.id && !implies(d.when, (l) => 'answered' in l && l.answered === first.id)).map((d) => d.id);
    expect(bad).toEqual([]);
  });
  test('run-2 letters: the correspondent only, two arms, nothing that stands for the rest of the run, modifiers ≤ 15 years', () => {
    const out: string[] = [];
    for (const d of dispatches) {
      if (minRk(gateOf(d)) >= 2) continue;
      if (d.cast !== 'correspondent') out.push(`${d.id}: ${d.cast} writes in run 2`);
      if (d.arms.length !== 2) out.push(`${d.id}: ${d.arms.length} arms in run 2`);
      d.arms.forEach((a, i) => {
        if ((a.effects ?? []).some((e) => !ONE_OFF.has(e.type))) out.push(`${d.id}[${i}]: standing effect in run 2`);
        if (a.modifier && a.modifier.years > 15) out.push(`${d.id}[${i}]: long modifier in run 2`);
      });
    }
    expect(out).toEqual([]);
  });
  test('three-armed letters only once three of the cast are writing (reckonings ≥ 3)', () => {
    expect(dispatches.filter((d) => d.arms.length === 3 && minRk(gateOf(d)) < 3).map((d) => d.id)).toEqual([]);
  });
  test('no letter names a system before its feature', () => {
    const out: string[] = [];
    for (const d of dispatches) {
      const g = gateOf(d);
      const text = words([d.headline, d.body, ...d.arms.flatMap((a) => [a.label, a.outcome, a.price, a.reply ?? ''])].join(' '));
      for (const w of SYSTEM_WORDS) if ((!w.m5 || M5_CAST.has(d.cast)) && w.re.test(text) && !w.gate(g)) out.push(`${d.id}: names ${w.name}`);
    }
    expect(out).toEqual([]);
  });
  test('an hour of run 2 without a repeat: at least 12 correspondent letters open to run 2', () => {
    expect(dispatches.filter((d) => minRk(gateOf(d)) < 2).length).toBeGreaterThanOrEqual(12);
  });
});

describe('dispatches: volume', () => {
  test('sixty, spread across the Industries, the Ages and general', () => {
    expect(dispatches.length).toBeGreaterThanOrEqual(60);
    const by = (s: string) => dispatches.filter((d) => d.sector === s).length;
    expect(by('steam')).toBeGreaterThanOrEqual(10);
    expect(by('light')).toBeGreaterThanOrEqual(8);
    for (const s of ['motion', 'compute', 'code']) expect(by(s)).toBeGreaterThanOrEqual(5);
    expect(dispatches.filter((d) => !d.sector && !d.age).length).toBeGreaterThanOrEqual(10);
    expect(dispatches.filter((d) => d.age).length).toBeGreaterThanOrEqual(3);
  });
  test('every cast member who writes letters has at least three; chains exist', () => {
    for (const c of cast.filter((x) => !['missWhitlow'].includes(x.id))) expect(`${c.id}: ${Math.min(3, dispatches.filter((d) => d.cast === c.id).length)}`).toBe(`${c.id}: 3`);
    expect(dispatches.filter((d) => d.arms.some((a) => a.next)).length).toBeGreaterThanOrEqual(5);
  });
});

describe('ambient news', () => {
  test('ids unique; sixty; at least six per Industry', () => {
    expect(new Set(ambient.map((a) => a.id)).size).toBe(ambient.length);
    expect(ambient.length).toBeGreaterThanOrEqual(60);
    for (const s of sectorIds) expect(`${s}: ${Math.min(6, ambient.filter((a) => a.sector === s).length)}`).toBe(`${s}: 6`);
  });
  test('conditions and stats resolve; {pct} only on fractions; numbers only with a stat', () => {
    const out: string[] = [];
    for (const a of ambient) {
      if (a.sector && !sectorIds.includes(a.sector)) out.push(`${a.id}: sector`);
      condProblems(a.id, a.when, out);
      if (a.stat) condProblems(a.id, { ...a.stat, op: '>=', value: 0 } as Cond, out);
      for (const t of a.text) {
        if (/\{(value|pct|fold)\}/.test(t) && !a.stat) out.push(`${a.id}: number without a stat`);
        if (/\{pct\}/.test(t) && a.stat && !FRACTION_STATS.includes(a.stat.stat)) out.push(`${a.id}: {pct} on ${a.stat.stat}`);
        for (const m of t.matchAll(/\{([a-z]+)\}/gi)) if (!['value', 'pct', 'fold', 'year', 'sector', 'resource', 'service', 'age'].includes(m[1])) out.push(`${a.id}: {${m[1]}}`);
        if (['sector', 'resource', 'service'].some((p) => t.includes(`{${p}}`)) && !a.sector) out.push(`${a.id}: industry placeholder without a sector`);
      }
    }
    expect(out).toEqual([]);
  });
  test('variants: 1–3, at most 70 characters at value 1234.5, headline style', () => {
    const out: string[] = [];
    for (const a of ambient) {
      if (a.text.length < 1 || a.text.length > 3) out.push(`${a.id}: ${a.text.length} variants`);
      for (const t of a.text) {
        const s = t.replace('{value}', '1,230').replace('{pct}', '123450').replace('{fold}', '1234.5').replace('{year}', '1850')
          .replace('{sector}', 'Compute').replace('{resource}', 'power, water & chips').replace('{service}', 'computation').replace('{age}', 'the Great Acceleration');
        if (s.length > 70) out.push(`${a.id}: ${s.length}: ${t}`);
        if (/[.?]$/.test(t) || /\?|!|"|'/.test(t)) out.push(`${a.id}: punctuation: ${t}`);
        if (/\byou(r|rs)?\b/i.test(t)) out.push(`${a.id}: says you: ${t}`);
        if (/\b(sector|sectors|era|eras)\b/i.test(words(t))) out.push(`${a.id}: banned word: ${t}`);
      }
    }
    expect(out).toEqual([]);
  });
  test('the Coal Age never says smog, and no ambient line repeats another headline', () => {
    const coal = coalSectors;
    expect(ambient.filter((a) => a.sector && coal.has(a.sector) && a.text.some((t) => /\bsmog\b/i.test(t))).map((a) => a.id)).toEqual([]);
    const existing = new Set([...Object.values(C.headlines).flat(), ...Object.values(C.sectorHeadlines ?? {}).flatMap((h) => Object.values(h).flat() as string[])]);
    const seen = new Set<string>();
    const dup = ambient.flatMap((a) => a.text).filter((t) => existing.has(t) || (seen.has(t) ? true : (seen.add(t), false)));
    expect(dup).toEqual([]);
  });
});

describe('the nine M3 headline keys', () => {
  test('present; the four with text have at least five variants that fit', () => {
    const H = headlines as Record<string, string[]>;
    for (const k of ['dispatch', 'answered', 'ambient', 'return', 'returnWithdrawn']) expect(Array.isArray(H[k])).toBe(true);
    for (const k of ['seamSunk', 'biteBack', 'history', 'ending']) {
      expect(`${k}: ${Math.min(5, H[k]?.length ?? 0)}`).toBe(`${k}: 5`);
      for (const h of H[k]) {
        expect(h.length <= 70 && !/[.?]$/.test(h) && !/\byou\b/i.test(h) ? '' : h).toBe('');
        for (const m of h.matchAll(/\{([a-z]+)\}/gi)) expect(['sector', 'age', 'app', 'resource', 'service', 'year', 'n', 'name'].includes(m[1]) ? '' : h).toBe('');
      }
    }
    expect(H.seamSunk.every((h) => h.includes('{name}'))).toBe(true);
    expect(H.biteBack.every((h) => h.includes('{name}'))).toBe(true);
    expect(H.history.every((h) => h.includes('{name}'))).toBe(true);
  });
});

/* M4: wager arms (DispatchArm.wager; design/m4-design.md §8.2; rules from the text lane, design/scratch/m4-registry-text.md). */
describe('M4: wager arms', () => {
  const wagerArms = dispatches.flatMap((d) => d.arms.map((a, i) => ({ d, a, i })).filter((x) => x.a.wager));
  const sentence = (w: string, t: string, max: number, out: string[]) => {
    if (!t || t.length > max) out.push(`${w}: ${t?.length} > ${max}: ${t}`);
    if (!/\.$/.test(t ?? '') || ((t ?? '').match(/\. [A-Z]/g) ?? []).length) out.push(`${w}: one sentence: ${t}`);
  };

  test('there are wagers (twelve of the twenty-four M4 letters), and a wager is never the default arm', () => {
    expect(wagerArms.length).toBeGreaterThanOrEqual(12);
    expect(wagerArms.filter(({ d, i }) => i === (d.defaultArm ?? 0)).map(({ d }) => d.id)).toEqual([]);
  });

  test('hint ≤ 70 characters in the house form ("Pays …", no full stop); the condition resolves; staked', () => {
    const out: string[] = [];
    for (const { d, a, i } of wagerArms) {
      const w = `${d.id}[${i}]`;
      const x = a.wager!;
      if (x.hint.length > 70) out.push(`${w}: hint ${x.hint.length}`);
      if (!/^Pays /.test(x.hint) || /[.?!]$/.test(x.hint)) out.push(`${w}: hint form: ${x.hint}`);
      condProblems(`${w}.wager`, x.when, out);
      if (!(a.cost?.mandate || a.cost?.capitalSeconds)) out.push(`${w}: a wager is staked (a cost)`);
    }
    expect(out).toEqual([]);
  });

  test('both branches: one sentence ≤ 120, an effect or a modifier, effects within the arms’ bounds, replies as headlines', () => {
    const out: string[] = [];
    for (const { d, a, i } of wagerArms) {
      for (const k of ['win', 'lose'] as const) {
        const w = `${d.id}[${i}].${k}`;
        const b = a.wager![k];
        sentence(w, b.outcome, 120, out);
        const effs = [...(b.effects ?? []), ...(b.modifier?.effects ?? [])];
        if (!effs.length) out.push(`${w}: no effect`);
        for (const e of b.effects ?? []) effectProblems(w, e, out, true);
        for (const e of b.modifier?.effects ?? []) { effectProblems(w, e, out); }
        if (b.modifier && (b.modifier.years < 5 || b.modifier.years > 15)) out.push(`${w}: modifier ${b.modifier.years} years`);
        if (b.reply && (b.reply.length > 70 || /[.?]$/.test(b.reply) || /\byou(r|rs)?\b/i.test(b.reply))) out.push(`${w}: reply: ${b.reply}`);
      }
    }
    expect(out).toEqual([]);
  });

  test('hint and branch texts follow the house style and name no system before its feature', () => {
    const out: string[] = [];
    for (const { d, a, i } of wagerArms) {
      const x = a.wager!;
      const texts = [x.hint, x.win.outcome, x.lose.outcome, x.win.reply ?? '', x.lose.reply ?? ''];
      for (const t of texts) {
        if (/!|"|'| - | – /.test(t)) out.push(`${d.id}[${i}]: punctuation: ${t}`);
        if (/\b(sector|sectors|era|eras|ironically)\b/i.test(words(t))) out.push(`${d.id}[${i}]: banned word: ${t}`);
        if (/\bsmog\b/i.test(t) && (!d.sector || coalSectors.has(d.sector))) out.push(`${d.id}[${i}]: smog: ${t}`);
        if (/\b[a-z]+iz(e|es|ed|ing|ation)\b/i.test(t) && !/\b(size|sizes|sized|prize|prizes|seize|seized|seizes)\b/i.test(t)) out.push(`${d.id}[${i}]: -ize: ${t}`);
      }
      const g = gateOf(d);
      const all = words(texts.join(' '));
      for (const s of SYSTEM_WORDS) if ((!s.m5 || M5_CAST.has(d.cast)) && s.re.test(all) && !s.gate(g)) out.push(`${d.id}[${i}]: names ${s.name}`);
    }
    expect(out).toEqual([]);
  });
});
