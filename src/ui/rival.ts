// M5: the rival on the page. Pryce's answer on each lever card (with the ladder of loopholes under it), his order book in
// place of the card list in the Industries he runs, and his panel (folded). Reads the views only: every cost, answer and
// state here is the core's (LeverView.rivalAnswer, .answered, .ladder; ChairView.rival; SectorDerived.rivalBought).
// Words: content/officeText.ts (the text lane).
import type { Ctx, Comp } from './ctx';
import { sd, sectorDef, openSectors } from './ctx';
import type { LeverView, LoopholeView, ResponseKind, UpgradeView } from '../types';
import { YEARS_PER_SECOND } from '../types';
import { h, setText, show, cls, setAttr, setFill } from './dom';
import { fmt, money, num, pct, dur, clamp } from './fmt';
import { isOpen, setOpen } from './prefs';
import { RESPONSE_TEXT, RESPONSE_UNKNOWN, ANSWER_LINE, PRYCE_PANEL, MINISTRY_TEXT as MT } from '../content/officeText';

/** Fill {name} placeholders; an unknown one becomes ''. */
export const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_m, k: string) => (v[k] == null ? '' : String(v[k])));
const GLYPH: Record<string, string> = { comply: '✓', evade: '↷', lobby: '▤', litigate: '§', conceal: '◐' };
/** The words for an answer; an unknown kind (M6 adds some) gets the text lane's default and a neutral glyph. */
export function answerText(k: ResponseKind): { g: string; name: string; rank: string; voice: string; panel: string } {
  return { g: GLYPH[k] ?? '·', ...((RESPONSE_TEXT as Record<string, typeof RESPONSE_UNKNOWN>)[k] ?? RESPONSE_UNKNOWN) };
}
/** "Pryce" from "Pryce Consolidated": the short name the page uses in running text. */
export function rivalShort(ctx: Ctx): string { return (ctx.d?.chair?.rival.name ?? 'The company').split(' ')[0]; }
/** Calendar year of a run time (display: the clock's own conversion). */
export function yearAt(ctx: Ctx, t: number): number { return Math.floor(num(ctx.d?.year) + (t - num(ctx.state.time)) * YEARS_PER_SECOND); }
const cash = (c: number) => (!Number.isFinite(c) ? '—' : c < 0.5 ? '£0' : money(c));
const lc = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/* ------------------------------------------------------------------ the lever card's Ministry part */

export interface LeverChair { el: HTMLElement; ladder: HTMLElement; update(v: LeverView): void }

/** Pryce's answer, the marks of court, pledge and lobby, and the ladder of loopholes, for one lever card. */
export function leverChair(ctx: Ctx, leverId: string): LeverChair {
  const glyph = h('span', { class: 'ans-g', 'aria-hidden': 'true' });
  const word = h('span', { class: 'ans-w' });
  const nextEl = h('span', { class: 'ans-c' });
  const list = h('ol', { class: 'ans-list', hidden: true, 'aria-label': ANSWER_LINE.listTitle });
  const line = h('button', { class: 'ans-line', type: 'button', 'aria-expanded': 'false', onclick: () => {
    const on = !!list.hidden; show(list, on); setAttr(line, 'aria-expanded', String(on));
  } }, glyph, h('span', null, word, nextEl), h('span', { class: 'ans-more', 'aria-hidden': 'true', text: '▾' }));
  const rec = h('p', { class: 'ans-rec' });
  const marks = h('p', { class: 'lev-marks' });
  const el = h('div', { class: 'lev-chair', hidden: true }, line, list, rec, marks);
  const ladder = h('div', { class: 'ladder', hidden: true });
  const rungs = new Map<string, ReturnType<typeof rungCard>>();
  let listKey = '', ladderKey = '';

  function update(v: LeverView): void {
    const a = v.rivalAnswer;
    const on = !!ctx.d?.chair && (!!a || !!v.answered || !!v.ladder?.length);
    show(el, on);
    show(ladder, on && !!v.ladder?.length);
    if (!on) return;
    const rung = (v.ladder || []).find((r) => r.status === 'open')?.name ?? '';
    const rank = (k: ResponseKind, c: number) => fill(answerText(k).rank, { rung: lc(rung), cost: cash(c) });
    show(line, !!a);
    if (a) {
      const best = a.options.find((o) => o.kind === a.chosen);
      const next = a.options.find((o) => o.available && o.kind !== a.chosen);
      setText(glyph, answerText(a.chosen).g);
      const lv = num(v.level);
      // Not yet enacted: "If enacted now"; in force with a level to go: the same line for the raise; at its top: as it stands.
      const frame = lv === 0 ? ANSWER_LINE.ifEnacted : a.level > lv ? ANSWER_LINE.ifEnacted.replace('enacted now', 'raised') : `${ANSWER_LINE.maxed}: {kind}`;
      setText(word, fill(frame, { kind: rank(a.chosen, num(best?.cost)) }));
      setText(nextEl, next ? `; ${fill(ANSWER_LINE.nextCheapest, { kind: rank(next.kind, num(next.cost)) })}` : '');
      setAttr(line, 'data-k', String(a.chosen));
      const lk = a.options.map((o) => `${o.kind}:${o.available ? Math.round(num(o.cost, Infinity)) : 'x'}`).join(',') + rung;
      if (lk !== listKey) {
        listKey = lk;
        list.replaceChildren(...a.options.map((o) => h('li', { class: o.available ? '' : 'off' },
          h('span', { class: 'ans-g', 'aria-hidden': 'true', text: answerText(o.kind).g }), ' ',
          o.available ? rank(o.kind, num(o.cost)) : `${answerText(o.kind).name}: ${ANSWER_LINE.unavailable[o.kind] ?? ANSWER_LINE.unavailableOther}`)));
      }
    }
    // His recorded answer, and a rung he has used that keeps leaking whatever he answered since (core finding E2).
    const used = (v.ladder || []).filter((r) => r.status === 'used');
    const ans = v.answered;
    const parts: string[] = [];
    if (ans && num(v.level) > 0) parts.push(fill(ANSWER_LINE.inForce, { kind: lc(answerText(ans.kind).name), year: yearAt(ctx, ans.since) }));
    for (const r of used) parts.push(`${r.name}: ${lc(MT.loopholeStatus.used)}`);
    setText(rec, parts.join(' · '));
    show(rec, parts.length > 0);
    cls(rec, 'leak', used.length > 0);
    const m: string[] = [];
    if (v.def.basis) m.push(v.def.basis === 'applied' ? MT.writtenOnApplied : MT.writtenOnConsumed);
    if (v.bound) m.push(`${MT.pledgeLock} (${v.bound})`);
    if (v.litigatedUntil != null) m.push(`§ ${fill(MT.litigated, { year: yearAt(ctx, v.litigatedUntil) })}`);
    if (v.carvedOut) m.push(`▤ ${MT.carvedOut}`);
    else if (v.lobbied) m.push(`▤ ${MT.lobbied}`);
    const eff = v.effectiveLevel;
    if (eff != null && eff !== num(v.level)) m.push(`Acting at level ${eff} of ${num(v.level)}`);
    if (v.popularity != null && Math.abs(v.popularity) >= 0.05) m.push(`${MT.confidence} ${v.popularity > 0 ? '+' : '−'}${fmt(Math.abs(v.popularity))}`);
    if (ctx.d?.chair?.inOpposition) m.push(MT.opposition);
    setText(marks, m.join(' · '));
    show(marks, m.length > 0);
    const lk = (v.ladder || []).map((r) => r.id).join(',');
    if (lk !== ladderKey) {
      ladderKey = lk;
      ladder.replaceChildren(...(v.ladder || []).map((r) => {
        let c = rungs.get(r.id);
        if (!c) { c = rungCard(ctx, leverId); rungs.set(r.id, c); }
        return c.el;
      }));
    }
    for (const r of v.ladder || []) rungs.get(r.id)?.update(r);
  }
  return { el, ladder, update };
}

function rungCard(ctx: Ctx, leverId: string): { el: HTMLElement; update(r: LoopholeView): void } {
  const name = h('b', { class: 'rung-n' });
  const st = h('span', { class: 'rung-s' });
  const blurb = h('p', { class: 'rung-b' });
  const robust = h('p', { class: 'rung-r' });
  const fillEl = h('span', { class: 'fillx' });
  const dl = h('span', { class: 'rung-dl num' });
  const bar = h('p', { class: 'rung-d' }, h('span', { class: 'rung-bar', 'aria-hidden': 'true' }, fillEl), dl);
  const amL = h('span', { class: 'btn-l' });
  const amC = h('p', { class: 'rung-c' });
  let id = '';
  const amend = h('button', { class: 'btn small rung-amend', type: 'button', onclick: () => {
    if (!ctx.act('amend', (m, s, c) => m.amend(s, c, id))) { amend.classList.remove('nope'); void amend.offsetWidth; amend.classList.add('nope'); }
  } }, amL);
  const el = h('article', { class: 'rung', 'data-lever': leverId }, h('header', null, h('span', { class: 'rung-k', text: `${MT.loophole} · ` }), name, st), blurb, robust, bar, amC, amend);
  function update(r: LoopholeView): void {
    id = r.id;
    setText(name, r.name); setText(blurb, r.blurb);
    setText(st, ` · ${MT.loopholeStatus[r.status] ?? r.status}`);
    el.setAttribute('data-s', r.status);
    cls(el, 'robust', r.robust);
    show(robust, !!r.robustLabel);
    // Content's label reads as a sentence ("Closed while the fuel duty escalator is in force"); a bare one gets the frame.
    if (r.robustLabel) setText(robust, `${r.robust ? '✓ ' : ''}${/^(closed|shut)\b/i.test(r.robustLabel) ? r.robustLabel : fill(MT.robust, { label: lc(r.robustLabel) })}${r.amendCost == null ? `. ${MT.robustNote}` : ''}`);
    const drafting = r.status === 'drafting' && r.draftLeft != null;
    show(bar, drafting);
    if (drafting) {
      const tot = Math.max(1e-9, num(r.draftTotal, num(r.draftLeft)));
      setFill(fillEl, clamp(1 - num(r.draftLeft) / tot, 0, 1), 100);
      setText(dl, ` ${fill(MT.draftingUntil, { year: yearAt(ctx, num(ctx.state.time) + num(r.draftLeft)) })}`);
    }
    const can = r.amendCost != null && (r.status === 'open' || r.status === 'used');
    show(amend, can); show(amC, can);
    if (can) {
      setText(amL, fill(MT.amend, { label: r.amendLabel ?? r.name }));
      setText(amC, fill(MT.amendCost, { n: fmt(num(r.amendCost)), years: fmt(num(r.amendYears)) }));
      setAttr(amend, 'aria-disabled', r.canAmend ? null : 'true');
    }
  }
  return { el, update };
}

/* ------------------------------------------------------------------ the order book */

/** In an Industry Pryce runs, the card list gives way to his order book: one folded line, opened to a read-only list. */
export function buildOrderBook(ctx: Ctx): Comp & { active(): boolean } {
  const sum = h('summary', { class: 'rb-sum' });
  const list = h('ul', { class: 'rb-list' });
  const det = h('details', { class: 'rb-book' }, sum, list);
  det.addEventListener('toggle', () => setOpen('rbook', det.open));
  const el = h('div', { class: 'rival-book', hidden: true }, det);
  let key = '', first = true;
  let on = false;
  function update(): void {
    const e = sd(ctx);
    on = !!e?.rival && !!ctx.d?.chair;
    show(el, on);
    if (!on) return;
    if (first) { first = false; det.open = isOpen('rbook', false); }
    const r = ctx.d.chair!.rival;
    const nx = r.next?.[ctx.sector];
    const nd = nx ? ctx.content.upgrades?.find((u) => u.id === nx.id) ?? sectorDef(ctx)?.applications.find((a) => a.id === nx.id) : undefined;
    setText(sum, nx && nd ? fill(PRYCE_PANEL.orderBook, { n: fmt(num(e?.rivalBought)), name: nd.name, payback: fmt(Math.round(nx.payback)) })
      : fill(PRYCE_PANEL.orderBookNone, { n: fmt(num(e?.rivalBought)), payback: fmt(Math.round(r.paybackMax)) }));
    const views = (ctx.ups || []).filter((v): v is UpgradeView => !!v?.def && v.def.sector === ctx.sector && (v.visible || v.level > 0));
    const k = views.map((v) => `${v.def.id}:${v.level}:${v.maxed ? 1 : 0}:${v.excludedBy ? 1 : 0}:${Math.round(num(v.subsidised) * 100)}`).join(',') + '|' + (nx?.id ?? '');
    if (k === key) return;
    key = k;
    list.replaceChildren(...views.map((v) => h('li', { class: (v.def.id === nx?.id ? 'next' : '') + (v.excludedBy ? ' off' : '') },
      h('span', { class: 'rb-n', text: v.def.name + (num(v.subsidised) > 0 ? ` · ${fill(PRYCE_PANEL.subsidised, { pct: Math.round(num(v.subsidised) * 100) })}` : '') }),
      h('span', { class: 'rb-v num', text: v.excludedBy ? '—' : v.level > 0 ? (v.def.repeatable ? `×${v.level}` : '✓') : money(v.cost) }))));
  }
  return { el, update, active: () => on };
}

/* ------------------------------------------------------------------ Pryce's panel */

const READINGS = ['haste', 'founder', 'volume', 'drawn', 'pliant'] as const;

/** One card per Ministry, folded: his articles, his five readings and their sources, his purse, next purchases, answers. */
export function buildRivalPanel(ctx: Ctx, hooks: { prospectus(): void; file(): void }): Comp {
  const sum = h('summary', { class: 'rp-sum' });
  const arts = h('ol', { class: 'rp-arts' });
  const reads = h('ul', { class: 'rp-reads' });
  const nexts = h('ul', { class: 'rp-next' });
  const answers = h('ul', { class: 'rp-ans' });
  const books = h('p', { class: 'rp-books' });
  const det = h('details', { class: 'rp' }, sum,
    h('p', { class: 'muted', text: PRYCE_PANEL.chairman }),
    h('h3', { class: 'rp-h', text: PRYCE_PANEL.articlesTitle }), arts,
    h('h3', { class: 'rp-h', text: PRYCE_PANEL.readingsTitle }), reads,
    h('h3', { class: 'rp-h', text: PRYCE_PANEL.orderBookTitle }), nexts,
    h('h3', { class: 'rp-h', text: PRYCE_PANEL.answersTitle }), answers, books,
    h('p', { class: 'rp-links' }, h('button', { class: 'linkish', type: 'button', onclick: () => hooks.prospectus() }, 'The prospectus'), ' · ',
      h('button', { class: 'linkish', type: 'button', onclick: () => hooks.file() }, 'The file')));
  const el = h('section', { class: 'rival-panel', 'aria-label': PRYCE_PANEL.title, hidden: true }, det);
  let key = '', dynKey = '';
  function update(): void {
    const ch = ctx.d?.chair;
    show(el, !!ch);
    if (!ch) return;
    const r = ch.rival;
    setText(sum, `${r.name} · ${PRYCE_PANEL.capital} ${money(r.capital)} · ${money(r.incomePerSec)}/s`);
    if (!det.open) return;
    const k = [r.paybackMax, r.foundPaybackMax, r.quietYears, r.playbooks.join()].join('|');
    if (k !== key) {
      key = k;
      const v = { payback: fmt(Math.round(r.paybackMax)), found: fmt(Math.round(r.foundPaybackMax)), years: fmt(r.quietYears) };
      arts.replaceChildren(...PRYCE_PANEL.articles.map((a) => h('li', { text: fill(a, v) })));
      reads.replaceChildren(...READINGS.map((id) => {
        const x = clamp(num(r.profile[id]), 0, 1), src = r.sources?.[id], t = PRYCE_PANEL.readings[id];
        return h('li', null, h('span', { class: 'rp-rn', text: t.name }), h('span', { class: 'rp-bar', 'aria-hidden': 'true' }, h('span', { class: 'fillx', style: `transform:scaleX(${x.toFixed(2)})` })),
          h('span', { class: 'num', text: pct(x, false) }), h('span', { class: 'rp-from', text: `${t.from}${src && src.d ? ` (${fmt(src.n)} / ${fmt(src.d)})` : ''}` }));
      }));
      const pb = r.playbooks.map((id) => ctx.content.playbooks?.find((p) => p.id === id)?.name ?? id);
      setText(books, pb.map((n) => fill(MT.playbookLearnt, { name: n })).join('. '));
      show(books, pb.length > 0);
    }
    const dk = JSON.stringify([r.next, r.answers.map((a) => [a.lever, a.kind, a.since])]);
    if (dk === dynKey) return;
    dynKey = dk;
    nexts.replaceChildren(...openSectors(ctx).filter((id) => sd(ctx, id)?.rival).map((id) => {
      const n = r.next?.[id];
      const nm = n ? ctx.content.upgrades?.find((u) => u.id === n.id)?.name ?? sectorDef(ctx, id)?.applications.find((a) => a.id === n.id)?.name ?? n.id : '';
      return h('li', null, h('b', { text: `${sectorDef(ctx, id)?.name ?? id}: ` }), n ? `${nm}, ${dur(n.payback)}` : '—');
    }));
    answers.replaceChildren(...(r.answers.length ? r.answers.map((a) => {
      const l = ctx.content.levers?.find((x) => x.id === a.lever);
      const t = answerText(a.kind);
      return h('li', null, h('span', { class: 'ans-g', 'aria-hidden': 'true', text: t.g }), ' ', fill(t.panel, { lever: l?.name ?? a.lever, year: yearAt(ctx, a.since), rung: lc(ch.loopholes.find((x) => x.lever === a.lever && x.status === 'used')?.name ?? ''), sector: sectorDef(ctx, l?.sector ?? '')?.name ?? '' }));
    }) : [h('li', { class: 'muted', text: PRYCE_PANEL.answersNone })]));
  }
  det.addEventListener('toggle', () => update());
  return { el, update };
}
