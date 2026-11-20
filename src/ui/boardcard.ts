// M4: the Board's Survey card (design §2A.1; Derived.surveyReveal, Content.surveyReveal), the milestone's moment. Over
// the Fishing panel, in the harbour engraving's frame, set as two columns of one page: the skippers' report beside the
// Board's survey, the body, the footer (the reach backwards) and one button, "File the survey". The game runs behind it.
// Shown once a save (its own "seen" key, per device); kept afterwards as an entry at the head of the Archive (its figures
// are kept on this device, since the run's record of them ends at the Reckoning). The words are the content's; the
// rows' templates are boardSurvey.ts's (no contract slot); every figure is the view's.
import type { Ctx } from './ctx';
import { sectorDef } from './ctx';
import type { Derived } from '../types';
import { h } from './dom';
import { lsGet, lsSet } from './store';
import { isOpen, setOpen } from './prefs';
import type { Sheets } from './sheets';
import { surveyRevealRows } from '../content/boardSurvey';

type Reveal = NonNullable<Derived['surveyReveal']>;
/** What the Archive keeps of the card (device-local). */
export interface KeptCard extends Reveal { year: number }

const KEPT_KEY = 'rebound.ui.surveyCard';

/** The "seen" key of this save's reveal: one per sector and year it was made (the reveal is once a save per sector). */
function seenKey(ctx: Ctx, r: Reveal): string {
  const yr = ctx.state.surveyReveal?.year ?? 0;
  return `seen:survey:${r.sector}:${yr}:${ctx.state.seed ?? 0}`;
}

/** The reveal waiting to be shown (present in the views, not yet seen on this device), else null. */
export function pendingReveal(ctx: Ctx): Reveal | null {
  const r = ctx.d?.surveyReveal;
  if (!r || !ctx.content.surveyReveal) return null;
  return isOpen(seenKey(ctx, r), false) ? null : r;
}

export function keptCard(): KeptCard | null {
  try {
    const o = JSON.parse(lsGet(KEPT_KEY) || 'null');
    return o && typeof o.reported === 'number' && typeof o.true === 'number' && typeof o.headline === 'string' ? o as KeptCard : null;
  } catch { return null; }
}

const pc = (v: number) => String(Math.round(Math.max(0, Math.min(1, v)) * 100));
const sub = (t: string, r: Reveal) => t.replace(/\{reported\}/g, pc(r.reported)).replace(/\{true\}/g, pc(r.true));

/**
 * Open the card. `live`: the moment itself (marks it seen, keeps its figures for the Archive, and runs `onFiled` when
 * the button is pressed); otherwise a reading from the Archive.
 */
export function surveyCardSheet(ctx: Ctx, sheets: Sheets, r: Reveal, live: boolean, onFiled?: () => void): void {
  const text = ctx.content.surveyReveal;
  const year = ctx.state.surveyReveal?.year ?? (r as Partial<KeptCard>).year ?? Math.floor(Number(ctx.d?.year) || 0);
  if (live) {
    setOpen(seenKey(ctx, r), true);
    try { lsSet(KEPT_KEY, JSON.stringify({ ...r, year } satisfies KeptCard)); } catch { /* the Archive goes without it */ }
  }
  const cols = text?.columns ?? { reported: 'The skippers’ report', surveyed: 'The Board’s survey' };
  const sname = sectorDef(ctx, r.sector)?.name ?? '';
  sheets.open('boardSurvey', (b, close) => {
    const body = r.body.split(/\n+/).filter(Boolean);
    b.append(h('div', { class: 'paper board-card', 'data-variant': r.variant },
      h('div', { class: 'paper-mast' }, h('span', { text: sname ? `${sname} · The Fishery Board` : 'The Fishery Board' }), h('span', { class: 'num', text: year ? String(year) : '' })),
      h('h1', { class: 'paper-head', text: r.headline }),
      h('div', { class: 'bc-cols' },
        h('section', { class: 'bc-col rep' },
          h('h3', { class: 'bc-h', text: cols.reported }),
          h('p', { class: 'bc-fig num' }, sub(surveyRevealRows.reported, r)),
          h('p', { class: 'bc-line', text: surveyRevealRows.reportedLine })),
        h('section', { class: 'bc-col tru' },
          h('h3', { class: 'bc-h', text: cols.surveyed }),
          h('p', { class: 'bc-fig num' }, sub(surveyRevealRows.surveyed, r)),
          h('p', { class: 'bc-line', text: surveyRevealRows.surveyedLine }))),
      // Two bars, one page: the skippers' figure, and the Board's drawn down from it once (composited, no loop).
      h('div', { class: 'bc-bars', 'aria-hidden': 'true' },
        h('span', { class: 'bc-bar rep' }, h('i', { style: `--v:${r.reported.toFixed(3)}` })),
        h('span', { class: 'bc-bar tru' }, h('i', { style: `--v:${r.true.toFixed(3)};--from:${r.reported.toFixed(3)}` }))),
      ...body.map((p) => h('p', { class: 'bc-body', text: p })),
      text?.footer ? h('p', { class: 'bc-foot', text: text.footer }) : null),
    h('div', { class: 'sheet-foot' },
      h('button', { class: 'btn primary big', type: 'button', onclick: () => { close(); if (live) onFiled?.(); } }, text?.button ?? 'File the survey')));
  }, { label: 'The Board’s survey', cls: 'board-sheet' });
}
