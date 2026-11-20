// M3: the first ending. When the run's 'ending' event arrives (every Industry settled at once for fifty years, the first
// time in the save), the credits card (Content.ending.credits) and, a tap away, the retrospective Gazette assembled by
// the core from the player's own first times (ModelApi.retrospective), with the time-lapse of the valley. Dismissable;
// "The ledger continues" returns to play. Both are reachable again from the menu.
import type { Ctx } from './ctx';
import { sectorDef } from './ctx';
import type { RetroItem } from '../types';
import { h } from './dom';
import { fmt, num } from './fmt';
import type { Sheets } from './sheets';
import { lapseBlock, type Lapse } from './timelapse';
import { sound } from './sound';

export function creditsSheet(ctx: Ctx, sheets: Sheets, lapse: Lapse | null): void {
  const cr = ctx.content.ending?.credits;
  const rec = ctx.d?.ending?.record ?? ctx.state.meta?.endings?.steadyAll ?? null;
  sheets.open('credits', (b, close) => {
    const lines = cr?.lines ?? ['Every Industry settled at its sink line, for fifty years.'];
    const facts = rec ? `Run ${fmt(rec.run)} · ${(num(rec.totalSeconds) / 3600).toFixed(1)} hours of play · ${Math.floor(num(rec.year))}` : '';
    // M4: with Acts, the credits are the Act's (Derived.ending.act); a record made under M3's rule (meta.endings
    // .steadyAll) is shown under its own template (the retrospective's 'won' line), never as this Act's.
    const act = ctx.d?.ending?.act ?? null;
    const m3 = act ? ctx.state.meta?.endings?.steadyAll : undefined;
    const m3Tpl = ctx.content.ending?.retrospective?.find((t) => t.key === 'won')?.headline;
    const m3Line = m3 && m3Tpl ? m3Tpl.replace('{year}', String(Math.floor(num(m3.year)))).replace('{run}', fmt(m3.run)).replace('{hours}', (num(m3.totalSeconds) / 3600).toFixed(1)) : '';
    b.append(h('div', { class: 'paper credits' },
      h('div', { class: 'paper-mast' }, h('span', { text: act ? `${act.name} · Late final` : 'Late final' }), h('span', { class: 'num', text: rec ? String(Math.floor(num(rec.year))) : '' })),
      h('h1', { class: 'paper-head', text: cr?.title ?? 'Steady State' }),
      facts ? h('p', { class: 'cr-facts num', text: facts }) : null,
      h('div', { class: 'cr-lines' }, ...lines.map((l, i) => h('p', { class: 'cr-line', style: `--i:${i}`, text: l }))),
      m3Line ? h('p', { class: 'cr-m3 muted num', text: m3Line }) : null,
      lapseBlock(ctx, lapse, cr?.title ?? 'Steady State')),
    h('div', { class: 'sheet-foot' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => retrospectiveSheet(ctx, sheets, lapse) }, 'Read the retrospective'),
      h('button', { class: 'btn', type: 'button', onclick: () => { sound('ledgerContinues'); close(); } }, cr?.continueLabel ?? 'Carry on')));
  }, { label: 'Fifty years', full: true, cls: 'reckon-sheet credits-sheet' });
}

export function retrospectiveSheet(ctx: Ctx, sheets: Sheets, lapse: Lapse | null): void {
  let items: RetroItem[] = [];
  try { items = ctx.model.retrospective(ctx.state, ctx.content); } catch { items = []; }
  const rec = ctx.d?.ending?.record ?? ctx.state.meta?.endings?.steadyAll ?? null;
  sheets.open('retro', (b, close) => {
    // One column of the supplement per run, oldest first; "Earlier" for what happened before the records began.
    const byRun = new Map<number, RetroItem[]>();
    for (const it of items) { const l = byRun.get(it.run) ?? []; l.push(it); byRun.set(it.run, l); }
    const runs = [...byRun.keys()].sort((a, z) => a - z);
    b.append(h('div', { class: 'paper retro' },
      h('div', { class: 'paper-mast' }, h('span', { text: 'A retrospective supplement' }), h('span', { class: 'num', text: rec ? String(Math.floor(num(rec.year))) : '' })),
      h('h1', { class: 'paper-head', text: 'How the line was held' }),
      h('p', { class: 'paper-stand', text: 'The Gazette reprints, from its own files, the first time each thing happened in this ledger.' }),
      items.length ? h('div', { class: 'rt-cols' }, ...runs.map((r) => h('section', { class: 'rt-run' },
        h('h3', { class: 'paper-sub', text: r === 0 ? 'Before the records began' : `Run ${fmt(r)}` }),
        h('ol', { class: 'rt-list' }, ...(byRun.get(r) ?? []).map((it) => h('li', null,
          h('span', { class: 'rt-y num', text: it.run === 0 ? '—' : String(it.year) }),
          h('span', { class: 'rt-h', text: it.headline }),
          it.sector ? h('span', { class: 'rt-s muted', text: sectorDef(ctx, it.sector)?.name ?? '' }) : null))))))
        : h('p', { class: 'muted', text: 'The files are thin: little was recorded on this device.' })),
    h('div', { class: 'sheet-foot' },
      h('button', { class: 'btn', type: 'button', onclick: () => creditsSheet(ctx, sheets, lapse) }, '← The credits'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { sound('ledgerContinues'); close(); } }, ctx.content.ending?.credits.continueLabel ?? 'Carry on')));
  }, { label: 'The retrospective', full: true, cls: 'reckon-sheet retro-sheet' });
}
