// M3: the History picker, between runs beside the Charter (ModelApi.historyViews, chooseHistory). Each History is a
// named counterfactual run with a goal; it names the rebound it isolates and offers options as rewards, never power.
// What can be chosen comes first; Histories already cleared fold away with their best time. Shown only once feature
// 'histories' has arrived and only while the run is fresh.
import type { Ctx } from './ctx';
import type { HistoryView } from '../types';
import { h, setText, setAttr, show, cls, syncChildren } from './dom';
import { dur, fmt } from './fmt';
import { foldSection } from './sheets';

function rewardText(ctx: Ctx, v: HistoryView): string {
  const r = v.def.reward || {};
  const parts: string[] = [];
  for (const id of r.unlock ?? []) {
    const n = ctx.content.commons?.find((x) => x.id === id)?.name ?? ctx.content.charters?.find((x) => x.id === id)?.name;
    if (n) parts.push(n);
  }
  if (r.title) parts.push(`the title “${r.title}”`);
  if (r.achievement) parts.push(ctx.content.achievements?.find((a) => a.id === r.achievement)?.name ?? 'an achievement');
  if (r.cosmetic) parts.push('a new sight in the picture');
  return parts.length ? `Opens: ${parts.join(', ')}` : '';
}

export function historyPicker(ctx: Ctx): { el: HTMLElement; update(): void } {
  const list = h('div', { class: 'hs-list', role: 'radiogroup', 'aria-label': 'A History for the next run' });
  const done = foldSection('histories.cleared', 'hs-done');
  const doneList = h('div', { class: 'hs-list' });
  done.body.append(doneList);
  const none = h('button', { class: 'ch-none', type: 'button', role: 'radio', onclick: () => ctx.act('chooseHistory', (m, s, c) => m.chooseHistory(s, c, null)) },
    h('span', { class: 'ch-n', text: 'The century as it was' }));
  const el = h('section', { class: 'histories', hidden: true },
    h('h3', { class: 'paper-sub', text: 'A History for the next run' }),
    h('p', { class: 'muted small', text: 'Run the century again under other rules, with a goal. Rewards are options, never power. Or none.' }),
    list, none, done.el);
  const cards = new Map<string, { b: HTMLButtonElement; runs: HTMLElement }>();
  let key = '';

  function card(v: HistoryView): { b: HTMLButtonElement; runs: HTMLElement } {
    let c = cards.get(v.def.id);
    if (c) return c;
    const runs = h('span', { class: 'hs-runs num muted' });
    const rw = rewardText(ctx, v);
    const b = h('button', { class: 'ch-card hs-card', type: 'button', role: 'radio', 'aria-checked': 'false',
      onclick: () => { if (b.getAttribute('aria-disabled') !== 'true') ctx.act('chooseHistory', (m, s, ct) => m.chooseHistory(s, ct, v.def.id)); } },
    h('span', { class: 'ch-k', text: v.def.rebound }),
    h('span', { class: 'ch-n', text: v.def.name }),
    h('span', { class: 'ch-b', text: v.def.blurb }),
    h('span', { class: 'hs-goal' }, h('b', { text: 'Goal: ' }), v.def.goalLabel),
    rw ? h('span', { class: 'ch-fx', text: rw }) : null, runs) as HTMLButtonElement;
    c = { b, runs };
    cards.set(v.def.id, c);
    return c;
  }

  function update(): void {
    const on = !!ctx.d?.features?.histories && !!ctx.d?.freshRun && typeof ctx.model.historyViews === 'function';
    show(el, on);
    if (!on) return;
    let views: HistoryView[] = [];
    try { views = ctx.model.historyViews(ctx.state, ctx.content).filter((v) => v.offered || v.inForce); } catch { views = []; }
    const open = views.filter((v) => !v.cleared), cleared = views.filter((v) => v.cleared);
    const k = open.map((v) => v.def.id).join(',') + '|' + cleared.map((v) => v.def.id).join(',');
    if (k !== key) {
      key = k;
      syncChildren(list, open.map((v) => card(v).b));
      syncChildren(doneList, cleared.map((v) => card(v).b));
      setText(done.sum, `Cleared, ${cleared.length}`);
    }
    show(done.el, cleared.length > 0);
    for (const v of views) {
      const c = cards.get(v.def.id); if (!c) continue;
      setAttr(c.b, 'aria-checked', String(v.inForce)); cls(c.b, 'on', v.inForce);
      setAttr(c.b, 'aria-disabled', v.canChoose || v.inForce ? null : 'true');
      setText(c.runs, v.cleared ? `Cleared${v.best != null ? `, best ${dur(v.best)}` : ''} · ${fmt(v.runs)} run${v.runs === 1 ? '' : 's'}` : v.runs ? `${fmt(v.runs)} run${v.runs === 1 ? '' : 's'}, not yet cleared` : 'Not yet tried');
    }
    const cur = ctx.d?.history?.id ?? null;
    setAttr(none, 'aria-checked', String(cur == null)); cls(none, 'on', cur == null);
  }
  return { el, update };
}
