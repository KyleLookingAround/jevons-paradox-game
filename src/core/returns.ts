/**
 * M3: the household return and the Proprietor's Day (shift 3): fileReturn (validation of untrusted input, storage in
 * MetaState.returns), publication (on the 'proprietor' meta flag, at fileReturn once it is set, or at reckon(); at most
 * one per run), withdrawReturn, and Derived.survey. Wall-clock time never enters the core.
 * Part of the simulation core (see README.md): pure, no DOM, no clock, no randomness; never mutates its inputs.
 */
import { RETURN_FIGURE_MAX } from '../types';
import type { Content, FiledReturn, GameState, HouseholdFigures, MetaState, NewsItem, PlayReturn, SurveyView } from '../types';
import { calendarYear } from './calendar';
import { SURVEY_FLAT_BAND } from './constants';
import { emit } from './events';
import type { EvDraft } from './events';
import { featureOn } from './features';
import { fillText, textItem, newsWith } from './headlines';
import { milestone } from './milestones';
import { fin, isObj, mix32 } from './util';

export const HOUSEHOLD_KEYS: (keyof HouseholdFigures)[] = [
  'activeMinutesBefore', 'activeMinutesAfter', 'sessionsBefore', 'sessionsAfter', 'looksBefore', 'looksAfter',
  'decisionsBefore', 'decisionsAfter', 'automatedAfter', 'daysBefore', 'daysAfter', 'quietDays',
];
const FALLBACK_HEADLINE = 'Household survey published';
const FALLBACK_WITHDRAWN = 'The Household Survey is discontinued for want of funding';

/** The validated, floored figures of a return, or null if any rule fails (ModelApi.fileReturn). */
export function validReturn(ret: unknown): { id: string; figures: Record<string, number> } | null {
  if (!isObj(ret) || typeof ret.id !== 'string' || !isObj(ret.figures)) return null;
  if (ret.id !== 'household') return null;
  const src = ret.figures;
  const f: Record<string, number> = {};
  for (const k of HOUSEHOLD_KEYS) {
    const v = src[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > RETURN_FIGURE_MAX) return null;
    f[k] = Math.floor(v);
  }
  if (f.sessionsBefore > f.looksBefore || f.sessionsAfter > f.looksAfter) return null;
  if (f.daysBefore > f.sessionsBefore || f.daysAfter > f.sessionsAfter) return null;
  if (f.quietDays > f.daysBefore + f.daysAfter) return null;
  return { id: ret.id, figures: f };
}

const rate = (num: number, den: number): number | null => (den > 0 ? fin(num / den) : null);
const change = (after: number | null, before: number | null): number | null =>
  after === null || before === null || before === 0 ? null : fin(after / before - 1);

/** The survey's numbers from a filed return (SurveyView without `text` and `published`). */
export function surveyOf(state: GameState, r: FiledReturn): Omit<SurveyView, 'text' | 'published'> {
  const f = r.figures;
  const workdayBefore = rate(f.activeMinutesBefore, f.daysBefore), workdayAfter = rate(f.activeMinutesAfter, f.daysAfter);
  const decisionsPerHourBefore = rate(f.decisionsBefore, f.activeMinutesBefore / 60);
  const decisionsPerHourAfter = rate(f.decisionsAfter, f.activeMinutesAfter / 60);
  const workdayChange = change(workdayAfter, workdayBefore);
  const direction = workdayChange === null ? 'flat' : workdayChange > SURVEY_FLAT_BAND ? 'up' : workdayChange < -SURVEY_FLAT_BAND ? 'down' : 'flat';
  const pureOf = (sel: (i: number) => boolean): number | null => {
    const xs: number[] = [];
    for (const run of state.meta.runs ?? []) {
      const s = run.decisionsByDecade;
      if (run.index === undefined || !sel(run.index) || !s || !s.length) continue;
      xs.push(s.reduce((a, b) => a + b, 0) / s.length);
    }
    return xs.length ? fin(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  };
  return {
    filedRun: r.run,
    workdayBefore, workdayAfter, workdayChange,
    decisionsPerHourBefore, decisionsPerHourAfter, decisionsChange: change(decisionsPerHourAfter, decisionsPerHourBefore),
    automatedPerHour: rate(f.automatedAfter, f.activeMinutesAfter / 60),
    sessionsPerDayBefore: rate(f.sessionsBefore, f.daysBefore), sessionsPerDayAfter: rate(f.sessionsAfter, f.daysAfter),
    minutesPerSessionBefore: rate(f.activeMinutesBefore, f.sessionsBefore), minutesPerSessionAfter: rate(f.activeMinutesAfter, f.sessionsAfter),
    direction,
    pure: { decisionsPerDecadeBefore: pureOf((i) => i === 1), decisionsPerDecadeAfter: pureOf((i) => i >= 2) },
  };
}

/** The placeholder values of a return template (ProprietorText), formatted as the contract says. */
function returnValues(sv: Omit<SurveyView, 'text' | 'published'>): Record<string, string> {
  const int = (x: number | null) => (x === null ? '' : String(Math.round(x)));
  const one = (x: number | null) => (x === null ? '' : (Math.round(x * 10) / 10).toFixed(1));
  const pct = (x: number | null) => (x === null ? '' : String(Math.abs(Math.round(x * 100))));
  return {
    workdayBefore: int(sv.workdayBefore), workdayAfter: int(sv.workdayAfter), workdayChange: pct(sv.workdayChange),
    decisionsBefore: int(sv.decisionsPerHourBefore), decisionsAfter: int(sv.decisionsPerHourAfter), decisionsChange: pct(sv.decisionsChange),
    sessionsBefore: one(sv.sessionsPerDayBefore), sessionsAfter: one(sv.sessionsPerDayAfter), automatedPerHour: int(sv.automatedPerHour),
  };
}
function templatesOf(content: Content, dir: SurveyView['direction']) {
  return (content.proprietor?.returns ?? []).filter((t) => t.direction === dir);
}
/** The substituted text of a published return (SurveyView.text). */
function returnText(state: GameState, content: Content, r: FiledReturn): { headline: string; body: string } {
  const sv = surveyOf(state, r);
  const ts = templatesOf(content, sv.direction);
  const t = r.template !== null ? ts[r.template % Math.max(1, ts.length)] : undefined;
  if (!t) return { headline: FALLBACK_HEADLINE, body: '' };
  const ctx = { year: calendarYear(state, content), extra: returnValues(sv) };
  return { headline: fillText(state, content, t.headline, ctx), body: fillText(state, content, t.body, ctx) };
}

/** A household return was published in this run already (the paper's annual statistics; RunStats.returnPublished, M3
 *  finish: a run flag, no longer read from the last 40 news items). */
const publishedThisRun = (state: GameState): boolean => state.run.returnPublished === true;

/** Publish the unpublished household return (if any): published, template, the 'return' item and event, milestone.
 *  `force` skips the once-a-run check (reckon() publishes into the new run). */
export function publish(state: GameState, content: Content, time: number, force = false): GameState {
  const r = state.meta.returns?.household;
  if (!r || r.published || (!force && publishedThisRun(state))) return state;
  const sv = surveyOf(state, r);
  const n = templatesOf(content, sv.direction).length;
  const template = n > 0 ? mix32((state.seed ^ state.meta.reckonings) >>> 0) % n : null;
  const filed: FiledReturn = { ...r, published: true, template };
  const year = calendarYear(state, content);
  let meta: MetaState = { ...state.meta, returns: { ...state.meta.returns, household: filed } };
  meta = milestone(meta, 'proprietor', null, year);
  const s0: GameState = { ...state, meta, run: { ...state.run, returnPublished: true } };
  const text = returnText(s0, content, filed);
  const out: GameState = { ...s0, ...newsWith(s0, content, [textItem('return', text.headline, time, year)]) };
  return emit(out, [{ kind: 'returnPublished', id: 'household', n: sv.workdayChange === null ? 0 : Math.round(sv.workdayChange * 100) }], time, year);
}

/** After any change of `prev` into `next`: the moment meta.flags.proprietor is first set, publish (one comparison when
 *  the flags did not change). */
export function publishOnFlag(prev: GameState, next: GameState, content: Content): GameState {
  if (next.meta.flags === prev.meta.flags || prev.meta.flags?.proprietor === true || next.meta.flags?.proprietor !== true) return next;
  return publish(next, content, next.time);
}

export function fileReturn(state: GameState, content: Content, ret: PlayReturn): GameState {
  if (!featureOn(content, state.meta, 'survey')) return state;
  const v = validReturn(ret);
  if (!v) return state;
  const old = state.meta.returns?.[v.id];
  if (old && old.run === state.meta.reckonings) {
    // one filing per id per run: an identical refiling returns the same reference (nothing written); different figures
    // are refused (the same reference too)
    return state;
  }
  const filed: FiledReturn = { figures: v.figures, run: state.meta.reckonings, at: state.meta.totalSeconds, published: false, template: null };
  const year = calendarYear(state, content);
  let s: GameState = { ...state, meta: { ...state.meta, returns: { ...(state.meta.returns ?? {}), [v.id]: filed } } };
  s = emit(s, [{ kind: 'returnFiled', id: v.id }], state.time, year);
  if (s.meta.flags?.proprietor === true) s = publish(s, content, state.time);
  return s;
}

export function withdrawReturn(state: GameState, content: Content, id: string): GameState {
  if (typeof id !== 'string' || !state.meta.returns?.[id]) return state;
  const returns = { ...state.meta.returns };
  delete returns[id];
  const year = calendarYear(state, content);
  const text = content.proprietor?.withdrawn || FALLBACK_WITHDRAWN;
  const items: NewsItem[] = [textItem('returnWithdrawn', fillText(state, content, text, { year }), state.time, year)];
  const ev: EvDraft[] = [{ kind: 'returnWithdrawn', id }];
  return emit({ ...state, meta: { ...state.meta, returns }, ...newsWith(state, content, items) }, ev, state.time, year);
}

/** Derived.survey: from meta.returns.household; null without one or while feature 'survey' is off. */
export function surveyView(state: GameState, content: Content): SurveyView | null {
  const r = state.meta.returns?.household;
  if (!r || !featureOn(content, state.meta, 'survey')) return null;
  return { ...surveyOf(state, r), published: r.published, text: r.published ? returnText(state, content, r) : null };
}
