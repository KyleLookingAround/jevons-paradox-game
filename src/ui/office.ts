// M5: Take office. The offer on the Reckoning card (Derived.office.offered), the four beats (the Gazette; the Minister's
// letter, whose button is the takeOffice call; the pull back, the valley thawing inside the Ministry window; the
// prospectus), then, in the first minute of the Ministry, the file on the late proprietor. Every beat waits for a tap.
// The prospectus and the file can be read again from the company's panel (rival.ts). Words: Content.office.text (late
// text: built when the sheet opens, which is always after the text has arrived), figures: ProspectusView / FileView.
import type { Ctx } from './ctx';
import type { Sheets } from './sheets';
import type { FileView, OfficeText, ProspectusView } from '../types';
import { formatProspectus, formatFile } from '../content/words';
import { h, show, reducedMotion } from './dom';
import { num } from './fmt';
import { lsGet, lsSet } from './store';
import { sound } from './sound';

function text(ctx: Ctx): OfficeText | null { return ctx.content.office?.text ?? null; }
const castName = (ctx: Ctx, id: string) => ctx.content.cast?.find((c) => c.id === id)?.name ?? '';

/** The prospectus as a card (set as a company prospectus: rules, small capitals, a seal). Words: words.ts. */
function prospectusCard(ctx: Ctx, p: ProspectusView): HTMLElement {
  const f = formatProspectus(text(ctx)!.prospectus, p);
  return h('article', { class: 'prospectus' },
    h('div', { class: 'pr-seal', 'aria-hidden': 'true', text: 'P·C' }),
    h('h2', { class: 'pr-t', text: f.title }), h('hr', { class: 'pr-rule' }),
    ...f.paragraphs.filter(Boolean).map((x) => h('p', { class: 'pr-p', text: x })));
}

function fileCard(ctx: Ctx, v: FileView): HTMLElement {
  const f = formatFile(text(ctx)!.file, v);
  const lines = [...f.accepted, ...f.declined, ...f.both];
  return h('article', { class: 'file-card' },
    h('p', { class: 'fc-k', text: ctx.content.rival?.name ?? '' }),
    h('h2', { class: 'fc-t', text: f.title }),
    lines.length ? h('ul', { class: 'fc-list' }, ...lines.map((x) => h('li', { text: x }))) : null,
    f.empty ? h('p', { class: 'fc-p', text: f.empty }) : null,
    f.automated ? h('p', { class: 'fc-p', text: f.automated }) : null,
    f.conclusion ? h('p', { class: 'fc-c', text: f.conclusion }) : null);
}

/** The prospectus again (from the company's panel). */
export function prospectusSheet(ctx: Ctx, sheets: Sheets): void {
  const p = ctx.d?.office?.prospectus;
  if (!p || !text(ctx)) return;
  sheets.open('prospectus', (b) => { b.append(prospectusCard(ctx, p)); }, { label: 'The prospectus', cls: 'office-sheet' });
}
/** The file (from the company's panel, and once in the first minute of the first Ministry). */
export function fileSheet(ctx: Ctx, sheets: Sheets): void {
  const f = ctx.d?.office?.file;
  if (!f || !text(ctx)) return;
  sheets.open('file', (b, close) => {
    b.append(fileCard(ctx, f), h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary', type: 'button', onclick: close }, text(ctx)!.file.button)));
  }, { label: 'The file', cls: 'office-sheet small-sheet' });
}

/** The offer on the Reckoning card: Take office and a quieter Not yet. Null when office is not offered. */
export function officeOffer(ctx: Ctx, take: () => void, notYet: () => void): HTMLElement | null {
  const t = text(ctx);
  if (!ctx.d?.office?.offered || !t) return null;
  return h('div', { class: 'office-offer' },
    h('p', { class: 'oo-k', text: 'A letter from the Ministry is waiting' }),
    h('div', { class: 'oo-btns' },
      h('button', { class: 'btn primary', type: 'button', onclick: take }, t.offer.take),
      h('button', { class: 'btn quiet', type: 'button', onclick: notYet }, t.offer.notYet)));
}

/**
 * The four beats. `done` starts the run (the clock), after "File it". The Minister's button is the takeOffice call; if
 * the model refuses it (it should not: the offer was on show), the sequence stops on the letter and the run begins as an
 * ordinary one.
 */
export function takeOfficeSequence(ctx: Ctx, sheets: Sheets, done: () => void): void {
  const t = text(ctx);
  if (!t) { done(); return; }
  sound('officeTaken');
  const beat = (kind: string, label: string, build: (b: HTMLElement, next: () => void) => void, next: () => void) =>
    sheets.open(kind, (b) => { build(b, next); }, { label, full: true, blocking: true, dismissable: false, cls: `office-sheet ${kind}` });
  const foot = (label: string, f: () => void) => h('div', { class: 'sheet-foot' }, h('button', { class: 'btn primary big', type: 'button', onclick: f }, label));
  // 1. The Gazette, over the frozen picture.
  beat('of-gazette', 'The Gazette', (b, next) => {
    b.append(h('div', { class: 'paper' },
      h('div', { class: 'paper-mast' }, h('span', { text: 'Special edition' }), h('span', { class: 'num', text: String(Math.floor(num(ctx.d?.year))) })),
      h('h1', { class: 'paper-head', text: t.acquisition.headline }),
      h('p', { class: 'paper-stand', text: t.acquisition.sub })), foot('Read on', next));
  }, letter);
  // 2. The Minister's letter; its button takes office.
  function letter(): void {
    beat('of-letter', 'A letter', (b) => {
      b.append(h('article', { class: 'letter of-letter-card' },
        h('p', { class: 'lt-body', text: t!.letter.body }),
        h('p', { class: 'lt-from', text: castName(ctx, t!.letter.cast) })), foot(t!.letter.button, take));
    }, take);
  }
  function take(): void {
    if (!ctx.act('takeOffice', (m, s, c) => m.takeOffice(s, c))) { sheets.close(); done(); return; }
    pullBack();
  }
  // 3. The pull back: the sheet goes, the picture thaws to colour inside the window, the sill appears under it.
  function pullBack(): void {
    sheets.close();
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.dispatchEvent(new CustomEvent('rebound:office', { detail: 'thaw' }));
    // The scene plays the thaw and draws the window on that event (src/ui/scene/frame/ministry.ts).
    const go = h('button', { class: 'btn primary', type: 'button', onclick: () => { card.remove(); prospectus(); } }, 'Continue');
    const card = h('div', { class: 'of-pull', role: 'dialog', 'aria-label': 'The Ministry window' },
      h('p', { text: 'The Ministry’s window has the better view of the valley.' }), go);
    document.body.append(card);
    setTimeout(() => { try { go.focus({ preventScroll: true }); } catch { /* ignore */ } }, 50);
  }
  // 4. The prospectus; File it starts the run.
  function prospectus(): void {
    const p = ctx.d?.office?.prospectus;
    if (!p) { done(); return; }
    beat('of-prospectus', 'The prospectus', (b) => {
      b.append(prospectusCard(ctx, p), foot(t!.prospectus.button, () => { sheets.close(); done(); }));
    }, done);
  }
}

/** In the first minute of a Ministry, once per office taken: the file card (never over another sheet or a Reckoning). */
export function officeCheck(ctx: Ctx, sheets: Sheets): void {
  const o = ctx.state.meta?.office;
  if (!o || !ctx.d?.office?.file || sheets.kind() || ctx.d.pendingReckoning) return;
  const t = num(ctx.state.time);
  if (t < 15 || t > 120 || num(o.ministries) > 1) return;
  const k = `rebound.ui.file.${o.at}`;
  if (lsGet(k)) return;
  lsSet(k, '1');
  fileSheet(ctx, sheets);
}

