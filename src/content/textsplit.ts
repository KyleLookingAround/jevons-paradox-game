/**
 * The content's late text (M4 perf pass; docs/adr/ADR-2026-11-20-late-content-text.md).
 *
 * The page's first-paint script carries the content's numbers, ids and names, and the words a fresh game shows on its
 * first screen; the rest of the prose (other Industries' blurbs and headlines, the letters, the ambient items, the
 * Histories, Charters, dividends, Institutions, the ending...) arrives as the lazy part `text`, a plain array of
 * strings. The split is made by the build (build.ts) on the assembled `content` value, and undone on the page
 * (src/ui/text.ts) by walking the same tree with the same rule: the n-th late slot of the walk gets the n-th string.
 * The data files are not touched, and tests, the balancer and the mock read them whole, as before.
 *
 * Nothing here changes a number: the rule only ever picks strings, and only under keys that hold words (never ids,
 * stats, kinds or conditions). Headline variants are picked by index and copied into the news by the core, so a late
 * variant is not blanked in the stub but holds a copy of its array's first variant (kept): a news line made before the
 * text arrives is a real sentence, never empty. Every other late string is '' until the text arrives, and the page
 * shows a plain fallback for it (src/content/textsplit.test.ts proves the sim on the stub equals the sim on the
 * content in every number).
 *
 * Pure data code: no DOM, imported by the build, the page and the tests.
 */
import type { Content } from '../types';

/** Keys whose string values are words for the page (never read as rules by the core). */
const LATE_KEYS = new Set([
  'blurb', 'tagline', 'crisisName', 'depth', 'catch', 'commons', 'moreLevers', 'unlessLabel', 'rebound',
  'voice', 'role', 'body', 'outcome', 'reply', 'price', 'hint', 'footer', 'lines', 'goalLabel', 'text', 'label',
]);
/** Top-level areas left whole: small, read early or read as names (the unfolding's intros, Acts, Ages, the global
 *  paces, the recycle wording, the tree names), and the Archive (split on its own, see build.ts). */
const KEEP_AREAS = new Set(['features', 'acts', 'ages', 'sectorOrder', 'global', 'recycleText', 'knowhowTrees', 'archive', 'surveyReveal']);
/** Areas whose objects belong to an Industry: the first Industry's card words and own headlines (on screen from the
 *  first second) stay whole; its levers (minute 13 of run 1) do not. */
const BY_SECTOR = new Set(['sectors', 'upgrades', 'sectorHeadlines']);
/** What an ambient item says in the stub (only seen if the text never arrived; ambient items begin in run 2). */
export const AMBIENT_FALLBACK = 'From our correspondent';

/** A late slot: where it is, and what the stub holds there until the text arrives ('' or, for a headline variant, a
 *  sentence: its array's first variant, the general headline of its kind, or the ambient fallback). */
type Visit = (holder: Record<string, unknown> | unknown[], key: string | number, stubValue: string) => void;

/**
 * Walk the late slots of `c` in a fixed order (insertion order of keys, array order), calling `visit` for each. The
 * order depends only on the tree's shape, which the stub literal keeps (shared objects are walked once per place they
 * appear, as the literal repeats them).
 */
export function walkLateText(c: Content, visit: Visit): void {
  const keep = c.sectorOrder?.[0];
  const general = (c.headlines ?? {}) as Record<string, string[] | undefined>;
  for (const area of Object.keys(c)) {
    if (KEEP_AREAS.has(area)) continue;
    const v = (c as unknown as Record<string, unknown>)[area];
    if (area === 'headlines') {
      // The general headlines: the first variant of each kind stays (the fallback of every late variant).
      for (const list of Object.values(general)) if (Array.isArray(list)) for (let i = 1; i < list.length; i++) visit(list, i, list[0]);
    } else if (area === 'sectorHeadlines') {
      for (const [sec, kinds] of Object.entries((v ?? {}) as Record<string, Record<string, string[]>>)) {
        if (sec === keep || !kinds) continue;
        for (const [kind, list] of Object.entries(kinds)) if (Array.isArray(list)) for (let i = 0; i < list.length; i++) visit(list, i, general[kind]?.[0] ?? '');
      }
    } else if (area === 'ambient') {
      for (const a of (v ?? []) as { text?: string[] }[]) if (Array.isArray(a?.text)) for (let i = 0; i < a.text.length; i++) visit(a.text, i, AMBIENT_FALLBACK);
    } else walk(v, area, area, undefined, visit, keep);
  }
}

function walk(v: unknown, area: string, key: string, sector: string | undefined, visit: Visit, keep: string | undefined): void {
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const x = v[i];
      if (typeof x === 'string') { if (LATE_KEYS.has(key)) visit(v, i, ''); }
      else walk(x, area, key, sector, visit, keep);
    }
    return;
  }
  const o = v as Record<string, unknown>;
  // The Industry an object belongs to: its own `sector`, or its key under `sectors`.
  const own = typeof o.sector === 'string' ? o.sector : sector;
  if (BY_SECTOR.has(area) && own !== undefined && own === keep) return;
  for (const k of Object.keys(o)) {
    const x = o[k];
    const sec = area === 'sectors' && key === area ? k : own;
    if (BY_SECTOR.has(area) && sec !== undefined && sec === keep) continue;
    // Headlines (dispatch, Proprietor, ending) are not late keys: the core copies them into the news and the index.
    if (typeof x === 'string') { if (LATE_KEYS.has(k)) visit(o, k, ''); }
    else walk(x, area, k, sec, visit, keep);
  }
}

/** A copy of plain data (no shared objects: each place gets its own, as the stub literal will). */
function clone<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clone) as unknown as T;
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v)) o[k] = clone((v as Record<string, unknown>)[k]);
    return o as T;
  }
  return v;
}

/** The build's half: the content without its late text (a fresh copy) and the late strings in walk order. */
export function splitLateText(c: Content): { stub: Content; strings: string[] } {
  const stub = clone(c);
  const strings: string[] = [];
  walkLateText(stub, (h, k, stubValue) => {
    const at = h as Record<string | number, unknown>;
    strings.push(at[k] as string);
    at[k] = stubValue;
  });
  return { stub, strings };
}

/** The page's half: put the late strings back into `c` (in place). False, and nothing changed, if they do not fit. */
export function applyLateText(c: Content, strings: unknown): boolean {
  if (!Array.isArray(strings) || strings.some((s) => typeof s !== 'string')) return false;
  let n = 0;
  walkLateText(c, () => { n++; });
  if (n !== strings.length) return false;
  let i = 0;
  walkLateText(c, (h, k) => { (h as Record<string | number, unknown>)[k] = strings[i++]; });
  return true;
}

/**
 * A JavaScript literal for plain data: JSON, plus `undefined` (kept as a key, as the source has it), the infinities and
 * NaN, and -0. For the build's stub module.
 */
export function dataLiteral(v: unknown): string {
  if (v === undefined) return 'void 0';
  if (typeof v === 'number') return Number.isNaN(v) ? 'NaN' : v === Infinity ? '1/0' : v === -Infinity ? '-1/0' : Object.is(v, -0) ? '-0' : String(v);
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(dataLiteral).join(',') + ']';
  return '{' + Object.keys(v).map((k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ':' + dataLiteral((v as Record<string, unknown>)[k])).join(',') + '}';
}
