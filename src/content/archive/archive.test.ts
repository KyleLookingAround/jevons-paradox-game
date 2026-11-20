/**
 * The content-archive lane's own checks (M3): the Archive, the Proprietor's Day, the first ending, and the M3
 * achievements. Imports the rest of the content read-only. The general lint (content.test.ts) also walks these once the
 * registry wires them; this file checks what that lint does not know about.
 */
// bun-types are not installed and tsconfig has "types": [], so the test runner's own module has no declarations.
// @ts-ignore
import { describe, expect, test } from 'bun:test';
import { content as C } from '../index';
import { archive } from './index';
import { proprietor, surveyDisclosure, proprietorCard } from '../proprietor';
import { ending } from '../ending';
import { achievements } from '../achievements';

/* eslint-disable @typescript-eslint/no-explicit-any */
const CA = C as any;

/** Every id an Archive subject may name (ArchiveDef: upgrade, lever, application, Commons project, seam, sector,
 *  dispatch, Charter, History, cast member, achievement; Institutions and Know-how too, as owned things). */
function contentIds(): Set<string> {
  const ids = new Set<string>();
  for (const s of C.sectorOrder) {
    const def: any = C.sectors[s];
    ids.add(s);
    for (const a of def.applications) ids.add(a.id);
    for (const seam of def.seams ?? []) ids.add(seam.id);
  }
  for (const xs of [C.upgrades, C.levers, C.knowhow, C.institutions, C.achievements, CA.commons ?? [], CA.charters ?? [],
    CA.histories ?? [], CA.cast ?? [], CA.dispatches ?? []]) for (const x of xs as { id: string }[]) ids.add(x.id);
  for (const a of achievements) ids.add(a.id);
  return ids;
}

const words = (t: string) => t.trim().split(/\s+/).length;
const STYLE_BAD = /!|"|'| - |\bironically\b|\byou\b|\byour\b/i;
const UNIT_WORDS = /\b(sector|sectors|era|eras)\b/i;
const AMERICAN = /\b(colors?|colored|honors?|honored|centers?|centered|grays?|tires?|curbs?|aluminum|programs?)\b/i;
const IZE = /\b([a-z]+)(ize|izes|ized|izing|ization|izations)\b/i;
const IZE_OK = new Set(['size', 'sizes', 'sized', 'prize', 'prizes', 'seize', 'seized', 'seizes', 'capsize', /* M5: a grain, not a suffix */ 'maize']);
const styleErrors = (where: string, t: string): string[] => {
  const out: string[] = [];
  if (STYLE_BAD.test(t)) out.push(`${where}: banned mark or word in “${t.match(STYLE_BAD)![0]}”`);
  if (UNIT_WORDS.test(t.replace(/\{[a-zA-Z]+\}/g, ''))) out.push(`${where}: sector/era`);
  const am = t.match(AMERICAN);
  if (am && !/computer programs?/i.test(t)) out.push(`${where}: Americanism ${am[0]}`);
  for (const w of t.match(new RegExp(IZE.source, 'gi')) ?? []) if (!IZE_OK.has(w.toLowerCase())) out.push(`${where}: ${w}`);
  return out;
};

describe('archive', () => {
  const ids = contentIds();

  test('ids are unique and prefixed arc.', () => {
    const seen = new Set<string>();
    const bad = archive.filter((n) => !n.id.startsWith('arc.') || seen.has(n.id) || !seen.add(n.id)).map((n) => n.id);
    expect(bad).toEqual([]);
  });

  test('every subject resolves to a real content id', () => {
    expect(archive.filter((n) => !ids.has(n.subject)).map((n) => `${n.id} → ${n.subject}`)).toEqual([]);
  });

  test('texts are 60–160 words; titles short; a date', () => {
    const bad: string[] = [];
    for (const n of archive) {
      const w = words(n.text);
      if (w < 60 || w > 160) bad.push(`${n.id}: ${w} words`);
      if (n.title.length > 64) bad.push(`${n.id}: title ${n.title.length} chars`);
      if (!n.date) bad.push(`${n.id}: no date`);
    }
    expect(bad).toEqual([]);
  });

  test('every note has at least one graded source; URLs are https', () => {
    const bad: string[] = [];
    for (const n of archive) {
      if (n.sources.length < 1) bad.push(`${n.id}: no source`);
      for (const s of n.sources) {
        if (!s.cite || s.cite.length < 8) bad.push(`${n.id}: empty cite`);
        if (s.grade !== 'V' && s.grade !== 'S') bad.push(`${n.id}: grade ${s.grade}`);
        if (s.url !== undefined && !/^https:\/\/\S+$/.test(s.url)) bad.push(`${n.id}: url ${s.url}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('house style in titles and texts (and no “you”)', () => {
    const bad = archive.flatMap((n) => [...styleErrors(`${n.id}.title`, n.title), ...styleErrors(`${n.id}.text`, n.text)]);
    expect(bad).toEqual([]);
  });

  test('citations use curly quotes and no exclamation marks', () => {
    const bad = archive.flatMap((n) => n.sources.filter((s) => /!|"/.test(s.cite)).map((s) => `${n.id}: ${s.cite}`));
    expect(bad).toEqual([]);
  });

  test('coverage: every efficiency card, lever, use, Commons project and Industry has a note; and The Coal Question', () => {
    const subjects = new Set(archive.map((n) => n.subject));
    const need: string[] = [
      ...C.upgrades.filter((u) => u.kind === 'efficiency').map((u) => u.id),
      ...C.levers.map((l) => l.id),
      ...C.sectorOrder.flatMap((s) => C.sectors[s].applications.map((a) => a.id)),
      ...((CA.commons ?? []) as { id: string }[]).map((c) => c.id),
      ...C.sectorOrder,
      'steam.coalQuestion',
    ];
    expect(need.filter((id) => !subjects.has(id))).toEqual([]);
  });

  test('a few run-1 subjects, so the viewer is not empty when it opens', () => {
    const subjects = new Set(archive.map((n) => n.subject));
    for (const id of ['steam', 'steam.pumping', 'steam.boilers', 'steam.condenser', 'steam.coalQuestion']) expect(subjects.has(id)).toBe(true);
  });
});

describe('the Proprietor’s Day', () => {
  const PLACEHOLDERS = new Set(['workdayBefore', 'workdayAfter', 'workdayChange', 'decisionsBefore', 'decisionsAfter',
    'decisionsChange', 'sessionsBefore', 'sessionsAfter', 'automatedPerHour']);
  const all = [proprietor.pamphlet, ...proprietor.returns];

  test('the pamphlet: a cast member, headline ≤ 70, body ≤ 400', () => {
    expect(proprietor.pamphlet.cast).toBe('missWhitlow');
    expect(proprietor.pamphlet.headline.length).toBeLessThanOrEqual(70);
    expect(proprietor.pamphlet.body.length).toBeLessThanOrEqual(400);
  });

  test('if the cast exists, the pamphlet’s writer is in it', () => {
    if (CA.cast) expect((CA.cast as { id: string }[]).some((c) => c.id === proprietor.pamphlet.cast)).toBe(true);
  });

  test('at least three returns per direction, twelve in all', () => {
    for (const d of ['up', 'down', 'flat'] as const) expect(proprietor.returns.filter((r) => r.direction === d).length).toBeGreaterThanOrEqual(3);
    expect(proprietor.returns.length).toBeGreaterThanOrEqual(12);
  });

  test('lengths, known placeholders, no “you”, headline rules', () => {
    const bad: string[] = [];
    for (const r of all) {
      if (r.headline.length > 70) bad.push(`headline ${r.headline.length}: ${r.headline}`);
      if (r.body.length > 400) bad.push(`body ${r.body.length}: ${r.body}`);
      if (/[.?]$/.test(r.headline) || r.headline.includes('?')) bad.push(`headline punctuation: ${r.headline}`);
      for (const t of [r.headline, r.body]) {
        for (const m of t.matchAll(/\{([a-zA-Z]+)\}/g)) if (!PLACEHOLDERS.has(m[1])) bad.push(`placeholder {${m[1]}}`);
        bad.push(...styleErrors('proprietor', t));
      }
    }
    if (proprietor.withdrawn.length > 70) bad.push('withdrawn too long');
    bad.push(...styleErrors('withdrawn', proprietor.withdrawn));
    expect(bad).toEqual([]);
  });

  test('templates by direction say which way the figures went', () => {
    for (const r of proprietor.returns) {
      if (r.direction !== 'flat') expect(`${r.headline} ${r.body}`.includes('{workdayChange}') || `${r.headline} ${r.body}`.includes('{decisionsChange}')).toBe(true);
    }
  });

  test('the card and the disclosure have their words', () => {
    expect(proprietorCard.name.length).toBeLessThanOrEqual(24);
    expect(proprietorCard.blurb.length).toBeLessThanOrEqual(140);
    expect(styleErrors('card', proprietorCard.blurb)).toEqual([]);
    expect(surveyDisclosure.title.length).toBeGreaterThan(0);
    expect(surveyDisclosure.body.length).toBeLessThanOrEqual(600);
    expect(surveyDisclosure.closeLabel.length).toBeLessThanOrEqual(32);
  });
});

describe('the first ending', () => {
  const KEYS = ['reveal', 'backfire', 'sectorOpened', 'decade', 'clearSkies', 'steady', 'settled', 'seam', 'dispatch',
    'history', 'proprietor', 'won'];
  const OK = new Set(['year', 'run', 'hours', 'sector', 'age']);

  test('credits: a title, 8–15 lines, the continue label', () => {
    expect(ending.credits.title.length).toBeGreaterThan(0);
    expect(ending.credits.lines.length).toBeGreaterThanOrEqual(8);
    expect(ending.credits.lines.length).toBeLessThanOrEqual(15);
    expect(ending.credits.continueLabel.length).toBeLessThanOrEqual(28);
    for (const l of [ending.credits.title, ...ending.credits.lines, ending.credits.continueLabel]) expect(styleErrors('credits', l)).toEqual([]);
  });

  test('a retrospective template for every milestone key; headlines ≤ 70 (with {sector} at its longest)', () => {
    const keys = new Set(ending.retrospective.map((r) => r.key.replace(/:\*$/, '')));
    expect(KEYS.filter((k) => !keys.has(k))).toEqual([]);
    const bad: string[] = [];
    for (const r of ending.retrospective) {
      const filled = r.headline.replace('{sector}', 'Compute').replace('{year}', '2025').replace('{run}', '12').replace('{hours}', '17.4');
      if (filled.length > 70) bad.push(`${r.key}: ${filled.length}`);
      if (/[.?]$/.test(r.headline)) bad.push(`${r.key}: ends with a stop`);
      for (const m of r.headline.matchAll(/\{([a-zA-Z]+)\}/g)) if (!OK.has(m[1])) bad.push(`${r.key}: {${m[1]}}`);
      bad.push(...styleErrors(r.key, r.headline));
    }
    expect(bad).toEqual([]);
  });
});

describe('achievements (M3 additions)', () => {
  test('ids unique; names ≤ 28 characters; ledger blurbs in house style', () => {
    const seen = new Set<string>();
    const bad: string[] = [];
    for (const a of achievements) {
      if (seen.has(a.id)) bad.push(`dupe ${a.id}`);
      seen.add(a.id);
      if (a.name.length > 28) bad.push(`${a.id}: name ${a.name.length}`);
      bad.push(...styleErrors(a.id, a.blurb));
    }
    expect(bad).toEqual([]);
  });

  test('eight Enough achievements, each veiled until its system arrives', () => {
    const enough = achievements.filter((a) => a.id.startsWith('ach.enough.'));
    expect(enough.length).toBeGreaterThanOrEqual(8);
    for (const a of enough) {
      expect(a.when).toBeDefined();
      expect(a.feature).toBeDefined();
    }
  });
});
