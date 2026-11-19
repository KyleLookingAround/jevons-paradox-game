// M3, shift 3: the household survey and the Proprietor's Day. The page keeps a local play ledger (playledger.ts); the
// player chooses to file a return, and only then does the page assemble a PlayReturn from it and call fileReturn. The
// core validates and stores it; nothing else of the ledger reaches the model. The Statistics Office's card (an ordinary
// research card) publishes it; then the second pair of twin gauges (decisions automated against the proprietor's own
// decisions an hour), the paper's return (up, down or flat, in the content's words) and, on the standing orders, which
// close and which open (orders.ts). Closing the survey in the settings deletes the ledger and withdraws the return.
// Never scolds: a working day that went down is printed as gladly as one that went up.
import type { Ctx, Comp } from './ctx';
import type { HouseholdFigures, PlayReturn } from '../types';
import { h, svg, setText, setStyle, show, cls, reducedMotion } from './dom';
import { fmt, num, clamp, pct } from './fmt';
import { getPrefs } from './prefs';
import { surveyDisclosure } from '../content/proprietor';

/** The figures the return will carry, as a small two-column table (before the Market / since). */
function figureTable(): { el: HTMLElement; set(f: HouseholdFigures | null): void } {
  const rows: [string, keyof HouseholdFigures, keyof HouseholdFigures | null][] = [
    ['Minutes at play', 'activeMinutesBefore', 'activeMinutesAfter'],
    ['Visits', 'sessionsBefore', 'sessionsAfter'],
    ['Days played', 'daysBefore', 'daysAfter'],
    ['Decisions by hand', 'decisionsBefore', 'decisionsAfter'],
    ['Decisions by standing order', 'automatedAfter', null],
  ];
  const cells = new Map<string, HTMLElement>();
  const tb = h('tbody');
  for (const [lbl, a, b] of rows) {
    const ca = h('td', { class: 'num' }), cb = h('td', { class: 'num' });
    cells.set(a, b ? ca : cb); if (b) cells.set(b, cb); else setText(ca, '—');
    tb.append(h('tr', null, h('th', { scope: 'row', text: lbl }), ca, cb));
  }
  const el = h('table', { class: 'sv-table' }, h('thead', null, h('tr', null, h('th'), h('th', { scope: 'col', text: 'Before the Market' }), h('th', { scope: 'col', text: 'Since' }))), tb);
  return {
    el,
    set(f) { for (const [k, c] of cells) setText(c, f ? fmt(num(f[k as keyof HouseholdFigures])) : '—'); },
  };
}

/** The return filer: what will be filed, and the one control. Used in the feed and in the statistics sheet. */
export function surveyFiler(ctx: Ctx): { el: HTMLElement; update(): void } {
  const lead = h('p', { class: 'sv-lead', text: 'The Statistics Office asks for a return of how this household spends its day: counts from this device’s ledger, split at the moment the Market arrived.' });
  const table = figureTable();
  const note = h('p', { class: 'sv-note muted' });
  const btn = h('button', { class: 'btn primary sv-file', type: 'button', onclick: () => file() }, 'File the household return');
  const status = h('p', { class: 'sv-status', 'aria-live': 'polite' });
  const el = h('div', { class: 'sv-filer' }, lead, table.el, h('div', { class: 'm-row' }, btn), note, status);
  let shown = 0;
  function file(): void {
    const f = ctx.ledger?.figures();
    if (!f) { setText(status, 'The survey is closed on this device: there is nothing to file.'); return; }
    const ret: PlayReturn = { id: 'household', figures: { ...f } };
    const ok = ctx.act('fileReturn', (m, s, c) => m.fileReturn(s, c, ret));
    setText(status, ok ? 'Filed. The Statistics Office has the figures.' : 'The Office returned it: one return a run is accepted, and these figures do not add up yet.');
    cls(status, 'warn', !ok);
  }
  return {
    el,
    update() {
      const on = getPrefs().survey && !!ctx.ledger;
      // The ledger is read when shown (cheap), at most once every few seconds.
      const now = performance.now();
      if (now - shown > 4000) { shown = now; table.set(on ? ctx.ledger!.figures() : null); }
      const filed = ctx.state.meta?.returns?.household;
      const thisRun = !!filed && filed.run === num(ctx.state.meta?.reckonings);
      setText(btn, filed ? 'File this run’s return' : 'File the household return');
      show(table.el, on && !thisRun);
      show(lead, !filed);
      show(btn, on && !thisRun);
      setText(note, !on ? `${surveyDisclosure.title} is closed on this device; reopen it in the settings to keep a ledger.`
        : thisRun ? `This run’s return is on file. The Office accepts one a run.`
          : filed ? `Last filed in run ${fmt(filed.run + 1)}. One return a run is accepted; a new one replaces it.`
            : 'One return a run is accepted. The figures stay on this device until filed, and leave the save when the survey is closed.');
    },
  };
}

/** One of the second pair of twin gauges: a needle against a shared scale, with a ghost needle for "before". */
function miniDial(label: string): { el: HTMLElement; set(v: number | null, ghost: number | null, max: number): void } {
  const CX = 60, CY = 58, R = 46;
  const pt = (t: number, r = R) => { const a = Math.PI * (1 - t); return [CX + r * Math.cos(a), CY - r * Math.sin(a)].map((x) => x.toFixed(1)).join(' '); };
  const s = svg(`<svg class="dial-svg" viewBox="0 0 120 66" aria-hidden="true"><path class="d-bezel" d="M${pt(0, R + 6)}A${R + 6} ${R + 6} 0 0 1 ${pt(1, R + 6)}"/>
    <path class="d-track" d="M${pt(0)}A${R} ${R} 0 0 1 ${pt(1)}"/>
    <g class="d-ghost"><line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R + 9}"/></g>
    <g class="d-needle"><line x1="${CX}" y1="${CY + 4}" x2="${CX}" y2="${CY - R + 4}"/></g><circle class="d-hub" cx="${CX}" cy="${CY}" r="3.4"/></svg>`);
  const val = h('div', { class: 'dial-val num' });
  const sub = h('div', { class: 'dial-sub num' });
  const el = h('div', { class: 'dial sv-dial', role: 'group', 'aria-label': label }, h('div', { class: 'dial-head' }, h('span', { class: 'dial-lbl', text: label })), s, h('div', { class: 'dial-read' }, val, sub));
  const rot = (sel: string, t: number) => setStyle(s.querySelector(sel) as SVGElement, 'transform', `rotate(${(Math.round((clamp(t, 0, 1) - 0.5) * 360) / 2).toFixed(1)}deg)`);
  return {
    el,
    set(v, ghost, max) {
      rot('.d-needle', v == null ? 0 : num(v) / max);
      show(s.querySelector('.d-ghost') as SVGElement, ghost != null);
      if (ghost != null) rot('.d-ghost', num(ghost) / max);
      setText(val, v == null ? '—' : fmt(Math.round(num(v))));
      setText(sub, ghost == null ? 'an hour' : `an hour; ${fmt(Math.round(num(ghost)))} before`);
    },
  };
}

export function buildSurvey(ctx: Ctx): Comp {
  const title = h('h2', { class: 'sec-t' });
  const filer = surveyFiler(ctx);
  // The pamphlet (Miss Whitlow's question), printed as a letter when the research card is first on offer.
  const pp = ctx.content.proprietor?.pamphlet;
  const writer = pp ? ctx.content.cast?.find((c) => c.id === pp.cast) : undefined;
  const toCard = h('button', { class: 'linkish', type: 'button', onclick: () => {
    const card = document.querySelector<HTMLElement>('.upgrades .up[data-up$="proprietorsDay"]');
    if (card) { card.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }); card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
  } }, 'The Statistics Office’s card is among the improvements ↓');
  const pamphlet = h('article', { class: 'letter pamphlet open', hidden: true },
    h('div', { class: 'lt-top' }, h('span', { class: 'lt-k', text: 'A pamphlet' })),
    h('p', { class: 'lt-from' }, h('span', { class: 'lt-seal', 'aria-hidden': 'true', text: (writer?.name ?? 'W').replace(/^(Mr|Mrs|Miss|Ms|Dr)\s+/, '').charAt(0) }),
      h('span', { class: 'lt-who' }, h('b', { text: writer?.name ?? 'A correspondent' }), writer?.role ? h('span', { class: 'lt-role', text: writer.role }) : null)),
    h('h3', { class: 'lt-head', text: pp?.headline ?? '' }),
    h('div', { class: 'lt-body' }, h('p', { text: pp?.body ?? '' })), toCard);
  // After the reveal: the second pair of twin gauges, the working day, and the printed return.
  const auto = miniDial('Decisions automated');
  const mine = miniDial('The proprietor’s decisions');
  const day = h('p', { class: 'sv-day num' });
  const pure = h('p', { class: 'sv-pure num muted' });
  const clipHead = h('h3', { class: 'sv-clip-h' });
  const clipBody = h('p', { class: 'sv-clip-b' });
  const clip = h('div', { class: 'sv-clip' }, h('p', { class: 'sv-clip-k', text: 'Household survey, as printed' }), clipHead, clipBody);
  const gauges = h('div', { class: 'sv-gauges', hidden: true }, h('div', { class: 'dials sv-dials' }, auto.el, mine.el), day, pure, clip);
  const waiting = h('p', { class: 'sv-wait muted' });
  const el = h('section', { class: 'survey', 'aria-label': 'The household survey', hidden: true },
    h('header', { class: 'sec-h' }, title), gauges, pamphlet, waiting, filer.el);

  function update(): void {
    const on = !!ctx.d?.features?.survey;
    const sv = ctx.d?.survey ?? null;
    const revealed = !!ctx.state.meta?.flags?.proprietor;
    show(el, on || (revealed && !!sv));
    if (!on && !(revealed && sv)) return;
    const card = revealed ? undefined : (ctx.ups || []).find((u) => u.def.id.endsWith('proprietorsDay') && u.visible && u.level === 0);
    setText(title, revealed && sv?.published ? 'The proprietor’s day' : 'The household survey');
    show(pamphlet, !!pp && !!card && !revealed);
    const published = !!sv?.published && revealed;
    show(gauges, published);
    if (published && sv) {
      const max = Math.max(4, num(sv.automatedPerHour) * 1.15, num(sv.decisionsPerHourAfter) * 1.15, num(sv.decisionsPerHourBefore) * 1.15);
      auto.set(sv.automatedPerHour, null, max);
      mine.set(sv.decisionsPerHourAfter, sv.decisionsPerHourBefore, max);
      const wc = sv.workdayChange;
      setText(day, sv.workdayBefore != null && sv.workdayAfter != null
        ? `Working day: ${fmt(Math.round(sv.workdayBefore))} min before the Market, ${fmt(Math.round(sv.workdayAfter))} min since${wc != null ? ` (${wc > 0 ? '+' : wc < 0 ? '−' : ''}${pct(Math.abs(wc), false)})` : ''}.`
        : 'Working day: not enough days on either side to say.');
      cls(day, 'down', sv.direction === 'down');
      const pb = sv.pure.decisionsPerDecadeBefore, pa = sv.pure.decisionsPerDecadeAfter;
      setText(pure, pb != null && pa != null ? `In the ledger’s own time: ${fmt(Math.round(pb))} decisions a model decade before the Market, ${fmt(Math.round(pa))} after.` : '');
      show(pure, pb != null && pa != null);
      show(clip, !!sv.text);
      if (sv.text) { setText(clipHead, sv.text.headline); setText(clipBody, sv.text.body); }
    }
    const filed = ctx.state.meta?.returns?.household;
    setText(waiting, filed && !revealed ? (card ? 'The return is on file. The Office will publish it when commissioned.' : `The return is on file. The Office needs three visits on each side of the Market before it will print.`)
      : filed && revealed && !filed.published ? 'This run’s return is on file; the paper prints it at the next Reckoning.' : '');
    show(waiting, !!waiting.textContent);
    filer.update();
    show(filer.el, on);
  }
  return { el, update };
}
