// The household survey: a local play ledger (shift 3, owner decision D6). It measures how the game is played, on this
// device only, so that M3 can show it back. M2 records and discloses; it shows no figures.
//
// Never in the save, never in an export, never seen by the model. Its own localStorage key, `rebound.playledger`:
//   { v: 1, since: <ms>, activeSec, sessions, looks, decisions, automated,
//     days: { "YYYY-MM-DD": { sec, sessions, looks, decisions, automated } },   // local calendar days, at most 730
//     phases: { market?: <active minutes>, civilService?: …, treasury?: … },   // when each order first became available
//     mark: { hiddenAt: <ms> | null, run: "<seed>:<reckonings>", dec: <run.decisions seen>, auto: <run.automated seen> } }
// Counts and timestamps only. Definitions (design/paradigm-shifts.md): an active second is one with the page visible and
// an input in the last 60 s; a session is a visible span after at least 10 minutes hidden; a look is each return to
// visible; decisions and automated actions are the increases of run.decisions and run.automated as observed.
// The switch in the settings ("Close the Household Survey") deletes the key at once and stops it; reopening starts empty.
// M3: `before` snapshots the totals at the moment the Market first became available (the phase mark), and each day
// counts the sessions begun after it (`sa`), so the household return's figures (HouseholdFigures) split cleanly into
// before and after. A ledger kept before M3 has only the phase mark (active minutes): its `before` is rebuilt once
// from the days, in order, up to that many active minutes. The figures reach the model only when the player files a
// return (survey.ts → ModelApi.fileReturn); nothing else of the ledger ever does.
import type { Ctx } from './ctx';
import type { HouseholdFigures } from '../types';
import { lsGet, lsSet, lsDel } from './store';
import { getPrefs, setPrefs } from './prefs';

export const LEDGER_KEY = 'rebound.playledger';
const TICK_MS = 15000, IDLE_MS = 60000, SESSION_GAP_MS = 600000, SAVE_MS = 60000, DAYS_MAX = 730;

interface Day { sec: number; sessions: number; looks: number; decisions: number; automated: number; sa?: number }
interface Before { activeSec: number; sessions: number; looks: number; decisions: number; days: number; at: number }
interface Ledger {
  v: 1; since: number; activeSec: number; sessions: number; looks: number; decisions: number; automated: number;
  days: Record<string, Day>;
  phases: Partial<Record<'market' | 'civilService' | 'treasury', number>>;
  mark: { hiddenAt: number | null; run: string; dec: number; auto: number };
  before?: Before;
}

const fresh = (): Ledger => ({ v: 1, since: Date.now(), activeSec: 0, sessions: 0, looks: 0, decisions: 0, automated: 0, days: {}, phases: {}, mark: { hiddenAt: null, run: '', dec: 0, auto: 0 } });
const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0);
function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function read(): Ledger {
  try {
    const o = JSON.parse(lsGet(LEDGER_KEY) || 'null');
    if (o && o.v === 1 && o.days && typeof o.days === 'object') {
      const l = fresh();
      l.since = n(o.since) || l.since;
      for (const k of ['activeSec', 'sessions', 'looks', 'decisions', 'automated'] as const) l[k] = n(o[k]);
      for (const k of Object.keys(o.days).slice(-DAYS_MAX)) {
        const d = o.days[k];
        if (/^\d{4}-\d\d-\d\d$/.test(k) && d && typeof d === 'object') l.days[k] = { sec: n(d.sec), sessions: n(d.sessions), looks: n(d.looks), decisions: n(d.decisions), automated: n(d.automated), ...(d.sa != null ? { sa: n(d.sa) } : {}) };
      }
      for (const k of ['market', 'civilService', 'treasury'] as const) if (o.phases && typeof o.phases[k] === 'number') l.phases[k] = n(o.phases[k]);
      const b = o.before;
      if (b && typeof b === 'object') l.before = { activeSec: n(b.activeSec), sessions: n(b.sessions), looks: n(b.looks), decisions: n(b.decisions), days: n(b.days), at: n(b.at) };
      if (o.mark && typeof o.mark === 'object') l.mark = { hiddenAt: typeof o.mark.hiddenAt === 'number' ? o.mark.hiddenAt : null, run: String(o.mark.run ?? ''), dec: n(o.mark.dec), auto: n(o.mark.auto) };
      return l;
    }
  } catch { /* unreadable: start again */ }
  return fresh();
}

export interface PlayLedger {
  /** Stop and delete it now (the switch). */
  close(): void;
  /** Start again, empty (the switch turned back on). */
  open(): void;
  /** M3: the household return's figures, as HouseholdFigures defines them; null while the survey is closed. */
  figures(): HouseholdFigures | null;
  /** M3: standing orders' actions per session since the Market (for the closing/opening estimate), or null. */
  automatedPerSession(): number | null;
}

/** A ledger from before M3 has the Market's phase mark (active minutes) but no snapshot: rebuild it from the days. */
function rebuildBefore(l: Ledger): void {
  if (l.before || l.phases.market == null) return;
  const limit = l.phases.market * 60;
  const b: Before = { activeSec: 0, sessions: 0, looks: 0, decisions: 0, days: 0, at: 0 };
  for (const k of Object.keys(l.days).sort()) {
    if (b.activeSec >= limit) { l.days[k].sa = l.days[k].sessions; continue; }
    const d = l.days[k];
    b.activeSec += d.sec; b.sessions += d.sessions; b.looks += d.looks; b.decisions += d.decisions; if (d.sessions > 0) b.days++;
    d.sa = 0;
  }
  l.before = b;
}

export function startPlayLedger(ctx: Ctx, active: boolean): PlayLedger {
  let l: Ledger | null = null;
  let lastInput = 0, lastTick = Date.now(), lastSave = 0, timer = 0;

  const on = () => getPrefs().survey && !!l;
  const day = (ms: number): Day => {
    const k = dayKey(ms);
    let d = l!.days[k];
    if (!d) {
      d = l!.days[k] = { sec: 0, sessions: 0, looks: 0, decisions: 0, automated: 0 };
      const keys = Object.keys(l!.days);
      if (keys.length > DAYS_MAX) delete l!.days[keys.sort()[0]];
    }
    return d;
  };
  const save = (force = false) => {
    if (!on()) return;
    const now = Date.now();
    if (!force && now - lastSave < SAVE_MS) return;
    lastSave = now;
    try { lsSet(LEDGER_KEY, JSON.stringify(l)); } catch { /* storage refused: it simply is not kept */ }
  };
  const look = () => {
    if (!on()) return;
    const now = Date.now();
    l!.looks++; day(now).looks++;
    if (l!.mark.hiddenAt == null || now - l!.mark.hiddenAt >= SESSION_GAP_MS) {
      l!.sessions++; const d = day(now); d.sessions++;
      if (l!.before) d.sa = (d.sa ?? 0) + 1;
    }
    l!.mark.hiddenAt = null;
    lastTick = now;
  };
  const observe = () => {
    // Decisions and automated actions, as increases of the run's own counters (a new run starts from its own zero).
    const s = ctx.state, run = `${s.seed ?? 0}:${s.meta?.reckonings ?? 0}`;
    const dec = n(s.run?.decisions), auto = n(s.run?.automated);
    if (l!.mark.run !== run) { l!.mark.run = run; l!.mark.dec = 0; l!.mark.auto = 0; }
    const dd = Math.max(0, dec - l!.mark.dec), da = Math.max(0, auto - l!.mark.auto);
    if (dd || da) {
      const d = day(Date.now());
      l!.decisions += dd; l!.automated += da; d.decisions += dd; d.automated += da;
    }
    l!.mark.dec = dec; l!.mark.auto = auto;
    // Phases: the active-minute mark at which each standing order was first available.
    const o = ctx.d?.orders;
    for (const k of ['market', 'civilService', 'treasury'] as const) {
      if (l!.phases[k] == null && o?.[k]?.available) l!.phases[k] = Math.round(l!.activeSec / 6) / 10;
    }
    // The split for the household return: the totals the moment the Market is first seen available on this device.
    if (!l!.before && o?.market?.available) {
      const days = Object.values(l!.days).filter((d) => d.sessions > 0).length;
      l!.before = { activeSec: l!.activeSec, sessions: l!.sessions, looks: l!.looks, decisions: l!.decisions, days, at: Date.now() };
    }
  };
  const tick = () => {
    if (!on()) return;
    const now = Date.now();
    const dt = Math.min(TICK_MS * 2, Math.max(0, now - lastTick));
    lastTick = now;
    if (!document.hidden && now - lastInput < IDLE_MS) { const s = Math.round(dt / 1000); l!.activeSec += s; day(now).sec += s; }
    try { observe(); } catch { /* the survey never breaks the game */ }
    save();
  };
  const onInput = () => { lastInput = Date.now(); };
  const onVis = () => {
    if (!on()) return;
    if (document.hidden) { tick(); l!.mark.hiddenAt = Date.now(); save(true); }
    else look();
  };

  function open(): void {
    if (l) return;
    l = read();
    rebuildBefore(l);
    lastInput = Date.now();
    document.addEventListener('pointerdown', onInput, { passive: true, capture: true });
    document.addEventListener('keydown', onInput, { passive: true, capture: true });
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onVis);
    timer = window.setInterval(tick, TICK_MS);
    if (!document.hidden) look();
    save(true);
  }
  function close(): void {
    if (timer) clearInterval(timer);
    timer = 0;
    document.removeEventListener('pointerdown', onInput, { capture: true });
    document.removeEventListener('keydown', onInput, { capture: true });
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pagehide', onVis);
    l = null;
    lsDel(LEDGER_KEY);
  }
  if (active && getPrefs().survey) open();
  function figures(): HouseholdFigures | null {
    if (!on()) return null;
    try { observe(); } catch { /* the survey never breaks the game */ }
    const L = l!, b = L.before ?? { activeSec: L.activeSec, sessions: L.sessions, looks: L.looks, decisions: L.decisions, days: Object.values(L.days).filter((d) => d.sessions > 0).length, at: 0 };
    const split = !!L.before;
    const days = Object.values(L.days);
    const fl = Math.floor;
    const sessionsAfter = split ? Math.max(0, L.sessions - b.sessions) : 0;
    const looksAfter = split ? Math.max(sessionsAfter, L.looks - b.looks) : 0;
    const daysAfter = split ? Math.min(sessionsAfter, days.filter((d) => (d.sa ?? 0) > 0).length) : 0;
    const sessionsBefore = b.sessions;
    const daysBefore = Math.min(sessionsBefore, b.days);
    return {
      activeMinutesBefore: fl(b.activeSec / 60), activeMinutesAfter: split ? fl(Math.max(0, L.activeSec - b.activeSec) / 60) : 0,
      sessionsBefore, sessionsAfter,
      looksBefore: Math.max(sessionsBefore, b.looks), looksAfter,
      decisionsBefore: fl(b.decisions), decisionsAfter: split ? fl(Math.max(0, L.decisions - b.decisions)) : 0,
      automatedAfter: split ? fl(L.automated) : 0,
      daysBefore, daysAfter,
      quietDays: Math.min(daysBefore + daysAfter, days.filter((d) => d.sessions === 1 && d.sec <= 900).length),
    };
  }
  return {
    close() { setPrefs({ survey: false }); close(); },
    open() { setPrefs({ survey: true }); lsDel(LEDGER_KEY); open(); },
    figures,
    automatedPerSession() {
      const f = figures();
      return f && f.sessionsAfter > 0 ? f.automatedAfter / f.sessionsAfter : null;
    },
  };
}
