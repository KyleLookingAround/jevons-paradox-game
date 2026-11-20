// Assembles the page and keeps the layout in step with the state. Holds no game rules.
import type { Ctx, Comp } from './ctx';
import { sectorDef, openSectors, lookFor, accentFor, ageOfSector, sectorIds, reckoningOffered } from './ctx';
import type { FeatureId, GameEvent, GameState, SectorId } from '../types';
import { h, setText, show, cls, setAttr, watchNear, isNear } from './dom';
import { buildTopbar, buildTabs } from './bar';
import { buildGauges } from './gauges';
import { buildNews, buildWorld, buildDock } from './world';
import { buildUpgrades, buildLevers, buildBudget } from './panels';
import {
  buildSheets, formulaSheet, menuSheet, shopSheet, confirmReckonSheet, pendingSheet, summarySheet, winSheet, lockedSheet,
  unreadSaveSheet, forkSheet, settleSheet, type MenuHooks, type Sheets,
} from './sheets';
import { fmt, num, lower } from './fmt';
import { createAfford, type AffordState } from './afford';
import { reducedMotion, replay } from './dom';
import { timed } from './prof';
import { buildAway } from './away';
import { buildDividends } from './dividends';
import { buildCommons } from './commons';
import { buildOrders } from './orders';
import { createRecorder, saveLast, loadLast, markLast } from './timelapse';
import { sound } from './sound';
import { createNewMarks } from './unfold';
import { buildNotes } from './notes';
import { fitLayout } from './layout';
import { buildMechanics } from './mechanics';
import { buildLetters } from './dispatch';
import { buildSurvey } from './survey';
import { creditsSheet } from './ending';
import { archiveSheet } from './archive';
import { dur } from './fmt';
import { buildFold } from './fold';
import { pendingReveal, surveyCardSheet } from './boardcard';
import { capstoneText } from '../content/boardSurvey';
import { buildSill, buildElection } from './ministry';
import { isOpen as isOpenPref, setOpen as setOpenPref } from './prefs';
import { MINISTRY_TEXT as MT } from '../content/officeText';
import { buildRivalPanel } from './rival';
import { buildWater } from './water';
import { officeCheck, prospectusSheet, fileSheet } from './office';

export interface UI {
  /** Patch the page. `quick` (straight after a tap): only what the tap changes and the cockpit; the rest follows in
   *  the next full update, after the frame (game.ts). */
  update(quick?: boolean): void;
  blocking(): boolean;
  sheets: Sheets;
  toast(text: string, action?: { label: string; run: () => void }): () => void;
  openFormula: Ctx['openFormula'];
  openMenu(focus?: 'keys'): void;
  openShop(): void;
  /** Between runs (a restored backup): the shop, with "Begin the next run". */
  openShopBetweenRuns(): void;
  /** A page reopened between runs: the summary again if it was closed on it, else the shop (QA B36). */
  openBetweenRuns(): void;
  openLocked(id: SectorId): void;
  confirmReckoning(): void;
  unreadSave(raw: string): void;
  /** Call after the whole state was swapped (import, reset, new run): forgets transient memory. */
  reset(): void;
  /** After every accepted action: returns the purchase keys it made (see afford.ts). */
  afterAct(before: GameState, after: GameState): string[];
  afford: AffordState;
  jumpToAffordable(): void;
  showPlace(target: string | null | { lever: string } | { commons: string }): void;
  confirmFork(id: string, onYes: () => void): void;
  /** Run `apply` (which switches the selected Industry) inside one composed page transition where the browser can. */
  composeSwitch(from: SectorId, to: SectorId, apply: () => void): void;
  /** New GameEvents (events.ts hands over only unseen ones; none after a catch-up). */
  onEvents(ev: GameEvent[]): void;
  /** Show the "While you were away" ledger if the current report has not been shown. */
  awayCheck(): void;
  /** Write the page's own local records (the time-lapse) beside an autosave. */
  saveLocal(): void;
  /** M3: the first ending's credits again (from the menu). */
  openCredits(): void;
  /** M3: the Archive sheet. */
  openArchive(): void;
}

const THEME_COLOUR: Record<string, string> = {
  ledger: '#efe6d0', gaslight: '#1c1630', chrome: '#ece5d6', terminal: '#070b08', agentic: '#0b0a14',
};

export interface AppHooks extends MenuHooks {
  /** End the run (model.reckon). True if accepted. */
  reckon(): boolean;
  /** The post-Reckoning screens are closed and the next run begins: restart the clock. */
  resume(): void;
}

/** Minimum gap between two headlines read out by a screen reader. */
const ANNOUNCE_EVERY = 12000;

export function mountUI(root: HTMLElement, ctx: Ctx, hooks: AppHooks): UI {
  const sheets = buildSheets();

  const topbar = buildTopbar(ctx);
  const tabs = buildTabs(ctx);
  const gauges = buildGauges(ctx);
  const dock = buildDock(ctx);
  const news = buildNews(ctx);
  const world = buildWorld(ctx);
  const ups = buildUpgrades(ctx);
  const budget = buildBudget(ctx, { confirmSettle: (id, yes) => settleSheet(ctx, sheets, id, yes) });
  const levs = buildLevers(ctx);
  const divs = buildDividends(ctx);
  const commons = buildCommons(ctx);
  const orders = buildOrders(ctx);
  const mech = buildMechanics(ctx);
  const letters = buildLetters(ctx);
  const survey = buildSurvey(ctx);
  // M4: folding of what is finished (a settled Industry as one card; the capstone group), fold.ts.
  const fold = buildFold(ctx, () => update());
  // M5: the Ministry (shown only in office): the sill under the picture, the manifesto, the company's panel, Plenty's
  // two water gauges.
  const sill = buildSill(ctx);
  const election = buildElection(ctx);
  const rivalPanel = buildRivalPanel(ctx, { prospectus: () => prospectusSheet(ctx, sheets), file: () => fileSheet(ctx, sheets) });
  const water = buildWater(ctx);

  const afford = createAfford(ctx);
  // The unfolding: a "New" mark on whatever a feature has just opened (unfold.ts).
  const marks = createNewMarks(ctx);
  // The time-lapse record (timelapse.ts): sampled as the run goes, kept apart from the save, replayed at the Reckoning.
  // Its replay follows the run's story, not the tab on screen (QA B27): the Industry that ended it, else the one whose line
  // earned most decades this run, else the one recorded longest (the first opened).
  const lapse = createRecorder(ctx, () => {
    const p = ctx.d?.pendingReckoning?.sector;
    if (p) return p;
    let best = '', most = 0;
    for (const id of openSectors(ctx)) { const n = ctx.state.sectors?.[id]?.decadesWithin?.length ?? 0; if (n > most) { most = n; best = id; } }
    return best;
  });
  // The affordable chip, by the sell button (thumb's reach, first screen); tapping it jumps to the first offer.
  const chipN = h('span', { class: 'chip-n num' });
  const chipL = h('span', { class: 'chip-l' });
  const chip = h('button', { class: 'afford-chip', type: 'button', hidden: true, onclick: () => ui.jumpToAffordable() }, chipN, chipL);
  dock.el.append(chip);
  // Screen readers hear the latest headline, politely and at most every ANNOUNCE_EVERY ms (the visible strip is not live).
  const live = h('p', { class: 'vh', 'aria-live': 'polite', 'aria-atomic': 'true' });
  let liveKey = '', liveAt = 0, liveTimer = 0;

  const onboard = h('p', { class: 'onboard', hidden: true });
  const away = buildAway(ctx, (t) => { live.textContent = t; });
  // The run's header line: which run this is, and the Charter in force (named for the rest of the run).
  const runN = h('span', { class: 'num' });
  const runCh = h('span', { class: 'rl-ch' });
  const runHs = h('span', { class: 'rl-hs' });
  const runline = h('p', { class: 'runline', hidden: true }, runN, runCh, runHs);
  // M3: banked time (only if content turns it on): the seconds kept, and a switch to play them at twice the pace.
  const bankTxt = h('span', { class: 'num' });
  const bankBtn = h('button', { class: 'tog', type: 'button', role: 'switch', 'aria-checked': 'false', onclick: () => { ctx.bankPlay = !ctx.bankPlay; } },
    h('span', { class: 'tog-k', 'aria-hidden': 'true' }), h('span', { class: 'tog-l', text: 'Play it at 2×' }));
  const bankRow = h('p', { class: 'bank-row', hidden: true }, h('span', { class: 'muted', text: 'Banked: ' }), bankTxt, bankBtn);
  const hb = h('b', { class: 'num' });
  const reckonBtn = h('button', { class: 'btn', type: 'button', onclick: () => ui.confirmReckoning() }, 'Call a Reckoning');
  const foot = h('footer', { class: 'run-foot' },
    h('p', { class: 'muted' }, 'Hindsight on offer: ', hb), reckonBtn);

  // The note line under the gauges: the gauges' quiet line when idle, a transient note over it when one is on show
  // (notes.ts). Its height is kept either way, so a note never moves the page.
  const noteLine = h('div', { class: 'note-line', 'data-clip': 'ok' }, gauges.note);
  const notes = buildNotes((on) => cls(noteLine, 'has-note', on));
  noteLine.append(notes.el);
  const toasts = notes;
  const cockpit = h('div', { class: 'cockpit' }, topbar.el, tabs.el, gauges.el, noteLine, dock.el);
  // Improvements sit above the world so that a phone shows the first purchase above the fold.
  // The scene leads the feed: on a phone it shares the first screen with the gauges, the headline and the start of the
  // improvements (the affordable chip by the sell button covers the rest).
  // M3: the mechanic's instrument sits under its picture; a waiting letter under the paper; the survey after the orders.
  const feed = h('main', { class: 'feed', id: 'main', tabindex: '-1' }, away.el, runline, bankRow, onboard, world.el, sill.el, election.el, water.el, fold.el, mech.el, news.el, letters.el, divs.el, ups.el, budget.el, levs.el, rivalPanel.el, commons.el, orders.el, survey.el, foot);
  root.replaceChildren(cockpit, feed, sheets.el, live);
  // M5: in a Ministry the panels of the proprietor's day (the standing orders, the household survey) fold to their
  // heading; a tap opens one (remembered per device). The player scrolls less to reach the Ministry's own work.
  const mfolds = ([[orders.el, 'mf:orders'], [survey.el, 'mf:survey']] as const).map(([sec, key]) => {
    const head = sec.querySelector('.sec-h');
    const btn = h('button', { class: 'mf-tog linkish', type: 'button', 'aria-expanded': 'false', onclick: () => { const on = !isOpenPref(key, false); setOpenPref(key, on); apply(); } }, 'Show');
    head?.append(btn);
    const apply = () => { const f = !!ctx.d?.chair && !isOpenPref(key, false); cls(sec, 'mfold', f); show(btn, !!ctx.d?.chair); setText(btn, f ? 'Show' : 'Fold'); setAttr(btn, 'aria-expanded', String(!f)); };
    return apply;
  });
  fitLayout(cockpit, feed, gauges.el, gauges.more);

  // A crisis is one event: the picture's fog (the scene), the headline (the broadsheet) and the gauges arrive together.
  document.addEventListener('rebound:moment', (e) => {
    const kind = (e as CustomEvent<string>).detail;
    if (kind !== 'crisis') return;
    replay(cockpit, 'm-crisis', 2400);
  });

  const comps: [string, Comp][] = [['away', away], ['topbar', topbar], ['tabs', tabs], ['gauges', gauges], ['dock', dock], ['news', news], ['world', world], ['ups', ups], ['budget', budget], ['levs', levs], ['divs', divs], ['commons', commons], ['orders', orders], ['mech', mech], ['letters', letters], ['survey', survey], ['fold', fold], ['sill', sill], ['election', election], ['rival', rivalPanel], ['water', water]];
  // Panels of the feed that only draw (no notes, sounds or moments from their update): while far from the screen they
  // are not patched; one comes up to date as it nears the screen, and all of them before a jump to a card (perf pass 2).
  // (Not the improvements, whose cards other parts of the page find and point at, nor the survey, whose reveal is a
  // moment of its own.)
  const nearOnly = new Set<Comp>([budget, divs, commons, orders, rivalPanel]);
  const stale = new Set<Comp>();
  for (const c of nearOnly) watchNear(c.el, () => { if (stale.delete(c)) c.update(); });
  function flush(): void { for (const c of stale) c.update(); stale.clear(); }

  let look = '', accent: string | null | undefined;
  let wasWon = !!ctx.state.flags?.won;
  let wasProprietor = !!ctx.state.meta?.flags?.proprietor;
  let endingNow = false;
  let onboardState: 'show' | 'fading' | 'gone' | '' = '';

  function reckonNow(): void {
    const p = ctx.d?.pendingReckoning;
    const rec = lapse.finish({ cause: p?.cause ?? 'chosen', here: true });
    if (hooks.reckon()) {
      // Kept apart from the save, so a page closed on the summary can show it again (QA B36).
      saveLast(ctx, rec, 'summary');
      openSummary(rec);
    }
  }
  function openSummary(rec: ReturnType<typeof lapse.finish>): void {
    markLast(ctx, 'summary');
    summarySheet(ctx, sheets, () => hooks.resume(), hooks.exportText, rec, () => markLast(ctx, 'shop'));
  }
  /** Between runs: the shop (with "Begin the next run"), and the last run's summary one tap away while it is kept. */
  function shopBetween(): void {
    const last = loadLast(ctx);
    shopSheet(ctx, sheets, () => hooks.resume(), last ? () => openSummary(last.lapse) : undefined);
  }

  function jumpToAffordable(): void {
    flush();
    const it = afford.state.items[0];
    if (!it) return;
    if (it.sector !== ctx.sector) ctx.selectSector(it.sector);
    const el = it.kind === 'up'
      ? document.querySelector<HTMLElement>(`.upgrades .up[data-up="${CSS.escape(it.id)}"]`) ?? ups.el
      : world.focusApp(it.id);
    if (!el) return;
    // Clear the pinned header on a phone; on the two-column desk layout the header sits beside the feed.
    const cr = cockpit.getBoundingClientRect(), fr = feed.getBoundingClientRect();
    const beside = cr.right <= fr.left + 1;
    const top = el.getBoundingClientRect().top + window.scrollY - (beside ? 16 : cr.height + 12);
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
    // One brief mark on the card (not a loop), and keyboard focus on its button.
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1800);
    const btn = el.querySelector<HTMLButtonElement>('.buy, .scn-found:not([hidden])');
    try { btn?.focus({ preventScroll: true }); } catch { /* ignore */ }
  }

  const ui: UI = {
    sheets,
    toast: (t, a) => toasts.push(t, a),
    openFormula: (k) => formulaSheet(ctx, sheets, k),
    openMenu: (focus) => menuSheet(ctx, sheets, { ...hooks, credits: () => ui.openCredits() }, focus),
    openShop: () => shopSheet(ctx, sheets),
    openShopBetweenRuns: shopBetween,
    openBetweenRuns: () => { const last = loadLast(ctx); if (last?.at === 'summary') openSummary(last.lapse); else shopBetween(); },
    openLocked: (id) => lockedSheet(ctx, sheets, id),
    confirmReckoning: () => confirmReckonSheet(ctx, sheets, () => { sound('reckoning'); reckonNow(); }),
    unreadSave: (raw) => {
      const info = hooks.backup();
      unreadSaveSheet(sheets, raw, info ? { info, restore: () => hooks.restoreBackup() } : undefined);
    },
    blocking: () => sheets.blocking(),
    reset() { world.reset(); lapse.reset(); wasWon = !!ctx.state.flags?.won; wasProprietor = !!ctx.state.meta?.flags?.proprietor; onboardState = ''; liveKey = ''; },
    afterAct: (before, after) => afford.afterAct(before, after),
    afford: afford.state,
    jumpToAffordable,
    showPlace: (id) => world.showPlace(id),
    confirmFork: (id, onYes) => forkSheet(ctx, sheets, id, onYes),
    composeSwitch,
    update,
    onEvents,
    awayCheck: () => away.check(),
    saveLocal: () => lapse.save(),
    openCredits: () => creditsSheet(ctx, sheets, lapse.finish(null)),
    openArchive: () => archiveSheet(ctx, sheets),
  };

  /** A brief mark on an element (a class for `ms`); restarts if already running. Never loops, never blocks input. */
  function pulse(el: Element | null, c: string, ms = 1600): void { replay(el, c, ms); }
  const nameOf = (id?: string) => (id ? sectorDef(ctx, id)?.name ?? '' : '');
  const goThere = (id?: string) => (id && id !== ctx.sector ? { label: 'Go there', run: () => ctx.selectSector(id) } : undefined);

  /** What each event does on the page (the scene gets them through world.ts; the gauges and cards through their own). */
  function onEvents(ev: GameEvent[]): void {
    world.queueEvents(ev);
    gauges.onEvents?.(ev);
    orders.onEvents(ev);
    letters.onEvents(ev);
    let automated = 0;
    for (const e of ev) {
      const def = e.sector ? sectorDef(ctx, e.sector) : undefined;
      switch (e.kind) {
        case 'sectorOpened':
          // The tagline is the title card over its picture; the note only says where it is.
          if (def) toasts.push(`New: ${def.name}, ${def.years}.`, { label: 'Go there', run: () => ctx.selectSector(e.sector!) }, 10000);
          sound('industryOpened', { sector: e.sector });
          break;
        case 'ageBegins': sound('ageBegun', { sector: e.sector }); break;
        case 'steadyState':
          toasts.push(`Steady State in ${def?.name ?? 'an Industry'}: the line holds level from here.`, goThere(e.sector), 12000);
          sound('steady', { sector: e.sector });
          break;
        case 'decade': {
          const waits = (ctx.state.pendingDividends || []).some((p) => p.sector === e.sector);
          toasts.push(`A ${e.id === 'lean' && ctx.d?.features?.clearSkies ? 'lean ' : ''}decade within the line in ${def?.name ?? 'an Industry'}.${waits ? ' A dividend waits.' : ''}`, goThere(e.sector), 7000);
          sound('decade', { sector: e.sector });
          break;
        }
        case 'clearSkies': toasts.push(`Clear skies over ${def?.name ?? 'an Industry'}.`, goThere(e.sector), 7000); break;
        case 'unsettled': if (e.by === 'default') toasts.push(`${def?.name ?? 'An Industry'} is unsettled: its defence could not be paid.`, goThere(e.sector), 10000); break;
        case 'leverLapsed': {
          const l = ctx.content.levers?.find((x) => x.id === e.id);
          toasts.push(`${l?.name ?? 'A lever'} lapses for want of Mandate.`, goThere(e.sector));
          break;
        }
        case 'dividendChosen':
          if (e.by === 'default') {
            const dv = ctx.content.dividends?.find((x) => x.id === e.id);
            toasts.push(`Eight dividends waiting: ${nameOf(e.sector)}’s oldest taken as ${dv?.name ?? 'the first'}.`);
          }
          break;
        /* --- M5 (placeholder words until the text lane's officeText lands; the headlines carry the news) --- */
        case 'electionCalled': toasts.push('Polling day is called: stand on two pledges of three.', { label: 'Show', run: () => document.querySelector<HTMLElement>('section.election')?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }) }, 9000); break;
        case 'electionWon': toasts.push(`${MT.electionWon.replace('{n}', e.label ?? '')}.`, undefined, 7000); break;
        case 'electionLost': toasts.push(`${MT.electionLost.replace('{n}', e.label ?? '')}. ${MT.oppositionNote}`, undefined, 10000); break;
        case 'concealmentFound': toasts.push(`Inspectors find ${fmt(num(e.n))}% unreported in ${nameOf(e.sector)}.`, goThere(e.sector), 9000); break;
        case 'loopholeUsed': {
          const lp = ctx.content.loopholes?.find((x) => x.id === e.id);
          toasts.push(`${ctx.d?.chair?.rival.name.split(' ')[0] ?? 'The company'} finds a way round: ${lp?.name ?? 'a loophole'}.`, goThere(e.sector), 9000);
          break;
        }
        case 'leverRepealed': {
          const l = ctx.content.levers?.find((x) => x.id === e.id);
          toasts.push(`The incoming government lowers ${l?.name ?? 'a lever'}.`, goThere(e.sector), 9000);
          break;
        }
        case 'upgradeBought':
          if (e.by === 'rival') break;
          if (e.by === 'player') {
            const arm = ctx.content.upgrades?.find((u) => u.id === e.id);
            const fork = !!(arm?.excludes?.length || ctx.content.upgrades?.some((u) => u.excludes?.includes(e.id ?? '')));
            sound(fork ? 'fork' : 'buy', { sector: e.sector });
          } else automated++;
          break;
        case 'appFounded': if (e.by === 'player') sound('found', { sector: e.sector }); else if (e.by === 'market') automated++; break; // M5: the rival's are his
        case 'leverEnacted': if (e.by === 'player') sound('lever', { sector: e.sector }); else automated++; break;
        case 'commonsBuilt': if (e.by === 'treasury') automated++; break;
        case 'crisis': sound('crisis', { sector: e.sector }); break;
        case 'reveal': sound('reveal', { sector: e.sector }); break;
        case 'backfire': backfireBeat(e); break;
        case 'featureUnlocked': {
          const id = e.id as FeatureId | undefined;
          if (!id || !ctx.content.features?.[id]) break;
          marks.add(id);
          sound('arrived', { sector: e.sector });
          // The broadsheet prints the introduction; the mark is on the thing; the note says where it is.
          const name = ctx.content.features[id]?.name;
          if (name && ctx.content.features[id]?.intro) toasts.push(`New: ${name}.`, { label: 'Show', run: () => showFeature(id) }, 9000);
          break;
        }
        /* --- M3 (the scene plays its own moments for seamSunk, biteBack and ending) --- */
        case 'seamSunk': {
          const total = e.sector ? ctx.content.sectors[e.sector]?.seams?.length ?? 0 : 0;
          sound('seam', { sector: e.sector, depth: total > 0 ? Math.min(1, num(e.n) / total) : undefined });
          break;
        }
        case 'biteBack': {
          const l = ctx.content.levers?.find((x) => x.id === e.id);
          sound('bite', { sector: e.sector, lever: l?.kind });
          if (ctx.d?.features?.sideEffects && l?.sideEffects) toasts.push(`${l.name} bites back: ${l.sideEffects.blurb.replace(/\.$/, '')}.`, e.sector !== ctx.sector ? goThere(e.sector) : undefined, 8000);
          break;
        }
        case 'historyCleared': {
          sound('history', { sector: e.sector });
          const hs = ctx.content.histories?.find((x) => x.id === e.id);
          toasts.push(`History cleared: ${hs?.name ?? 'the goal is met'}.${e.first ? ' Its reward is yours for good.' : ''}`, undefined, 9000);
          break;
        }
        case 'returnPublished': sound('survey'); toasts.push('The Statistics Office prints the household survey.', { label: 'Read it', run: () => { const el = document.querySelector<HTMLElement>('section.survey'); el?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }); } }, 9000); break;
        case 'stageReached': if (e.label && e.sector !== ctx.sector) toasts.push(`New machines in ${nameOf(e.sector)}: ${e.label}.`, goThere(e.sector)); break;
        /* --- M4 (the scene plays its own moments for these) --- */
        case 'surveyed': sound('surveyed', { sector: e.sector, label: e.label, first: e.first }); break;
        case 'thresholdCrossed': sound('thresholdCrossed', { sector: e.sector }); break;
        case 'arrears':
          sound('arrears', { sector: e.sector });
          toasts.push(`${def?.name ?? 'An Industry'}: ${capstoneText.arrears}`, goThere(e.sector), 12000);
          break;
        case 'arrearsCleared': toasts.push(`${def?.name ?? 'An Industry'}: ${capstoneText.arrearsCleared}`, goThere(e.sector), 7000); break;
        case 'ending':
          endingNow = true;
          sound(ctx.content.acts?.length ? 'actEnding' : 'ending');
          // The credits wait for any sheet the player is in, and never cover a pending Reckoning.
          setTimeout(() => { if (!ctx.d?.pendingReckoning) ui.openCredits(); }, reducedMotion() ? 0 : 1200);
          break;
        default: break; // unknown kinds are ignored (the union grows)
      }
    }
    // Standing orders acted: one quiet pulse on the affordable signal (or on Capital when it is hidden).
    if (automated) pulse(chip.hidden ? topbar.el.querySelector('.tb-cap') : chip, 'm-auto', 1400);
  }

  /** M4: the Board's first survey has a card. On its Industry's page it opens (after the vessel has put out in the
   *  picture); elsewhere a note offers it. Never over a sheet already open or a Reckoning. */
  let revealNoted = '';
  let revealSeenAt = { k: '', at: 0 };
  function surveyCheck(): void {
    const r = pendingReveal(ctx);
    if (!r || ctx.d?.pendingReckoning || sheets.kind()) return;
    const k = `${r.sector}|${r.variant}|${r.reported}`;
    const open = () => surveyCardSheet(ctx, sheets, r, true, () => { mech.drain(); sound('ledgerContinues'); });
    // On its own page the card waits a moment, while the Board's vessel puts out in the picture.
    if (r.sector === ctx.sector) {
      const now = performance.now();
      if (revealSeenAt.k !== k) revealSeenAt = { k, at: now };
      if (now - revealSeenAt.at < 1500) return;
      revealNoted = k; open(); return;
    }
    if (revealNoted === k) return;
    revealNoted = k;
    toasts.push(r.headline, { label: 'Read it', run: () => { ctx.selectSector(r.sector); setTimeout(() => { if (pendingReveal(ctx)) open(); }, 300); } }, 15000);
  }

  /** Bring a newly arrived feature's place into view (below the pinned header on a phone). */
  function showFeature(id: FeatureId): void {
    flush();
    marks.update();
    const el = marks.place(id);
    if (!el) return;
    const cr = cockpit.getBoundingClientRect(), fr = feed.getBoundingClientRect();
    const inCockpit = cockpit.contains(el);
    if (inCockpit) { window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); return; }
    const beside = cr.right <= fr.left + 1;
    const top = el.getBoundingClientRect().top + window.scrollY - (beside ? 16 : cr.height + 12);
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  /** The first backfire is the game's signature moment: one beat across the dial, the picture, the paper and the sound. */
  function backfireBeat(e: GameEvent): void {
    const firstEver = !!ctx.state.run?.firstBackfires?.[e.sector ?? ''];
    sound('backfire', { sector: e.sector, strength: firstEver ? 1 : 0.6 });
    if (e.sector !== ctx.sector) {
      toasts.push(`${nameOf(e.sector)} backfires: thriftier, and burning more.`, goThere(e.sector), 9000);
      return;
    }
    pulse(cockpit, 'm-backfire', 2600);
    news.backfire?.();
    world.backfire?.();
  }

  // View Transitions (Chrome 111+, Safari 18+): the old screen is held as a picture while the new look, picture and
  // panels are built underneath, then the two cross-fade (the picture slides a little, in the direction of travel).
  // Elsewhere, under reduced motion, or with a sheet up, the switch is immediate.
  function composeSwitch(from: SectorId, to: SectorId, apply: () => void): void {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (typeof doc.startViewTransition !== 'function' || reducedMotion() || sheets.blocking() || document.hidden) { apply(); return; }
    const ids = sectorIds(ctx.content);
    document.documentElement.setAttribute('data-dir', ids.indexOf(to) >= ids.indexOf(from) ? 'next' : 'prev');
    try { doc.startViewTransition(apply); } catch { apply(); }
  }

  // After a tap, only these patch before the frame (the purchase, the figures, the sell button); the picture, the paper
  // and the far panels follow in the full update a frame later (perf pass 2: tap to paint).
  const quickSet = new Set<Comp>([topbar, tabs, gauges, dock, ups, budget, levs, mech, divs, commons, orders, sill, election]);
  function update(quick = false): void {
    const open = openSectors(ctx);
    // Keep the selected tab on an open industry.
    if (!open.includes(ctx.sector) && open.length) ctx.sector = open[0];
    const lk = lookFor(ctx.content, ctx.sector);
    const ac = accentFor(ctx.content, ctx.sector);
    const html = document.documentElement;
    if (lk !== look) {
      look = lk;
      html.setAttribute('data-look', lk);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', THEME_COLOUR[lk] ?? '#efe6d0');
    }
    if (ac !== accent) { accent = ac; setAttr(html, 'data-accent', ac); }

    timed('ui.afford', () => afford.update());
    if (!quick) timed('ui.lapse', () => lapse.tick());
    for (const [n, c] of comps) {
      if (quick && !quickSet.has(c)) continue;
      // A hidden panel always patches (its update is what may show it; hidden, it is never "near").
      if (nearOnly.has(c) && !c.el.hidden && !isNear(c.el)) { stale.add(c); continue; }
      stale.delete(c);
      timed('ui.' + n, () => c.update());
    }
    marks.update();
    for (const f of mfolds) f();
    // M4: a settled Industry folds its own panels away until "Show the Industry" (fold.ts); a capstoned one shows its
    // group instead of the budget panel.
    const folded = fold.folded();
    cls(feed, 'folded-ind', folded);
    cls(feed, 'capped-ind', folded && !!ctx.d?.sectors?.[ctx.sector]?.capstoned);
    // M4: the Board's Survey card, once a save, over the Fishing panel (boardcard.ts); elsewhere, a note with the way.
    if (!quick) surveyCheck();
    // M5: the file on the late proprietor, once, in the first minute of the first Ministry (office.ts).
    if (!quick) officeCheck(ctx, sheets);

    // The chip: how many offers are news (afford.ts holds the no-nag rule), and where the first one is.
    const items = afford.state.items;
    show(chip, items.length > 0 && !sheets.blocking());
    if (items.length) {
      const first = items[0];
      const elsewhere = first.sector !== ctx.sector;
      const where = elsewhere ? sectorDef(ctx, first.sector)?.name ?? '' : '';
      setText(chipN, String(items.length));
      setText(chipL, elsewhere ? `affordable · ${where} →` : 'affordable ↓');
      chip.setAttribute('aria-label', `${items.length} affordable. Show the first${elsewhere ? `, in ${where}` : ''}.`);
    }

    // Onboarding: one line on a fresh run, gone after the first purchase, and never after a long time away (the
    // catch-up runs after the first update, so the run's clock is checked on every update, not only the first).
    // A genuinely new run only: nothing bought, and the first Industry the only one open (a forced or imported state
    // with later Industries open is not Lancashire in 1780).
    const firstId = sectorIds(ctx.content)[0];
    const fresh = Object.keys(ctx.state.upgrades || {}).length === 0 && open.length === 1 && open[0] === firstId && ctx.sector === firstId;
    // A long time away (the catch-up's own report says how long was asked for, whatever was simulated or held).
    const longAway = num(ctx.state.lastOffline?.requested) >= 600;
    if (onboardState === 'show' && (ctx.state.time >= 600 || longAway)) { onboardState = 'gone'; show(onboard, false); }
    if (onboardState === '') {
      onboardState = fresh && ctx.state.time < 600 && !longAway ? 'show' : 'gone';
      const again = (ctx.state.meta?.reckonings ?? 0) > 0;
      const y = ageOfSector(ctx.content, firstId)?.yearSpan?.[0] ?? 1780;
      setText(onboard, again
        ? `Lancashire, ${y}, again. The pit is flooded, and you have read the minutes.`
        : `Lancashire, ${y}. You have one atmospheric engine and a flooded pit.`);
      show(onboard, onboardState === 'show');
    } else if (onboardState === 'show' && !fresh) {
      onboardState = 'fading';
      cls(onboard, 'fade', true);
      setTimeout(() => { show(onboard, false); onboardState = 'gone'; }, 1200);
    }

    const rk = num(ctx.state.meta?.reckonings);
    const chName = ctx.d?.charter ? ctx.content.charters?.find((c) => c.id === ctx.d.charter)?.name : undefined;
    show(runline, rk >= 1 && !ctx.d?.freshRun);
    setText(runN, `Run ${fmt(rk + 1)}`);
    setText(runCh, chName ? ` · under ${chName}` : '');
    const hsId = ctx.d?.history?.id;
    const hsDef = hsId ? ctx.content.histories?.find((x) => x.id === hsId) : undefined;
    setText(runHs, hsDef ? ` · History: ${hsDef.name}${ctx.d.history.cleared ? ' ✓' : ''}` : '');
    setAttr(runHs, 'title', hsDef ? `${hsDef.rebound}. Goal: ${hsDef.goalLabel}${ctx.d.history.cleared ? ' (met)' : ''}` : null);
    const bk = ctx.d?.bank;
    show(bankRow, !!ctx.d?.features?.bank && !!bk && bk.seconds > 0);
    if (bk && bk.seconds > 0) {
      setText(bankTxt, dur(bk.seconds));
      if (!bk.usable && ctx.bankPlay) ctx.bankPlay = false;
      setAttr(bankBtn, 'aria-checked', String(!!ctx.bankPlay)); cls(bankBtn, 'on', !!ctx.bankPlay);
      setAttr(bankBtn, 'aria-disabled', bk.usable ? null : 'true');
    }
    setText(hb, fmt(Math.floor(ctx.d?.hindsightIfReckonNow ?? 0)));
    // Offered once the run has had its reveal (or after a first Reckoning); a forced Reckoning needs no button.
    show(foot, reckoningOffered(ctx) && !ctx.d?.pendingReckoning);

    // The polite live region: the newest headline, rate-limited. The first headline on load is not read out.
    const top = Array.isArray(ctx.state.news) ? ctx.state.news[0] : undefined;
    const nk = top ? `${top.time}|${top.text}` : '';
    if (liveKey === '') liveKey = nk || '\u0000';
    else if (nk && nk !== liveKey && !liveTimer) {
      const say = () => {
        liveTimer = 0;
        const t = Array.isArray(ctx.state.news) ? ctx.state.news[0] : undefined;
        if (!t) return;
        liveKey = `${t.time}|${t.text}`; liveAt = Date.now();
        live.textContent = `${t.text} (${Math.floor(t.year)})`;
      };
      const wait = liveAt + ANNOUNCE_EVERY - Date.now();
      if (wait <= 0) say(); else liveTimer = window.setTimeout(say, wait);
    }

    // Forced Reckoning: the loop has stopped; show the card.
    const k = sheets.kind();
    if (ctx.d?.pendingReckoning && k !== 'pending' && k !== 'summary' && k !== 'shop') {
      pendingSheet(ctx, sheets, () => reckonNow());
      sound('reckoning', { sector: ctx.d.pendingReckoning.sector });
    }
    // Win: first time only.
    // Win: the first ending has its own credits (the 'ending' event); a later win is a quiet note; content without
    // the M3 ending keeps the plain card.
    const won = !!ctx.state.flags?.won;
    if (won && !wasWon && !endingNow) {
      if (ctx.d?.ending?.reached && ctx.content.ending) toasts.push('Steady State everywhere again. The ledger continues.', { label: 'The credits', run: () => ui.openCredits() }, 9000);
      else if (!ctx.content.ending) winSheet(ctx, sheets);
    }
    wasWon = won;
    // The Proprietor's Day revealed (the flag rises in play; a save that already has it is not news).
    const prop = !!ctx.state.meta?.flags?.proprietor;
    if (prop && !wasProprietor) sound('proprietor');
    wasProprietor = prop;

    timed('ui.sheets', () => sheets.update());
  }

  return ui;
}
