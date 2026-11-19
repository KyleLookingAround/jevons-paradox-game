// "While you were away": the ledger of the last catch-up (GameState.lastOffline), at the head of the feed under the
// pinned gauges (never over them), until the player dismisses it. Shown once per report: the report's key is
// remembered in the UI preferences. Reads the report and derive() only; every figure is the model's.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sectorIds } from './ctx';
import type { OfflineReport } from '../types';
import { h, setText, show } from './dom';
import { fmt, money, dur, num, pct, lower } from './fmt';
import { getPrefs, setPrefs } from './prefs';

export function awayKey(ctx: Ctx, r: OfflineReport): string {
  return `${ctx.state.seed ?? 0}:${ctx.state.meta?.reckonings ?? 0}:${Math.round(num(r.from))}:${Math.round(num(r.to))}:${num(r.toSeq)}`;
}

const LINE_WORDS: Record<string, string> = { held: 'the line held', broken: 'the line broke', drawn: 'a line was drawn', settled: 'settled' };

export interface AwayComp extends Comp {
  /** Show the current report now if it has not been shown (after a catch-up). */
  check(): void;
}

export function buildAway(ctx: Ctx, announce: (t: string) => void): AwayComp {
  const when = h('span', { class: 'aw-when num' });
  const held = h('p', { class: 'aw-held' });
  const grid = h('dl', { class: 'aw-grid' });
  const lines = h('ul', { class: 'aw-lines' });
  const more = h('p', { class: 'aw-more' });
  const ok = h('button', { class: 'btn', type: 'button', onclick: () => dismiss() }, 'Carry on');
  const toDiv = h('button', { class: 'btn linkish', type: 'button', hidden: true, onclick: () => { dismiss(); document.querySelector<HTMLElement>('.divs')?.scrollIntoView({ block: 'center' }); } }, 'Choose the dividends ↓');
  const el = h('section', { class: 'away', 'aria-label': 'While you were away', hidden: true },
    h('header', { class: 'aw-h' }, h('h2', { class: 'aw-t', text: 'While you were away' }), when),
    held, grid, lines, more, h('div', { class: 'm-row' }, ok, toDiv));
  let shownKey = '';

  function dismiss(): void {
    const r = ctx.state.lastOffline;
    if (r) { const k = awayKey(ctx, r); setPrefs({ awaySeen: [...getPrefs().awaySeen.filter((x) => x !== k), k].slice(-8) }); }
    shownKey = '';
    show(el, false);
  }

  function render(r: OfflineReport): void {
    const req = num(r.requested), sim = num(r.simulated);
    setText(when, sim < req - 1 ? `${dur(sim)} of ${dur(req)} counted` : dur(sim));
    // What stopped the clock short.
    let heldTxt = '';
    if (r.heldBy === 'crisis' || r.heldBy === 'collapse' || r.heldBy === 'exhausted') {
      const def = r.heldSector ? sectorDef(ctx, r.heldSector) : undefined;
      const e = r.heldSector ? ctx.d?.sectors?.[r.heldSector] : undefined;
      if (r.heldBy === 'exhausted') heldTxt = `The board waited for you: ${lower(def?.resource.name ?? 'the reserve')} at ${pct(num(e?.reserveFraction), false)} left.`;
      else heldTxt = `The board waited for you: ${lower(def?.pressure.name ?? 'pressure')} at ${pct(num(e?.pressureFraction), false)}${def ? ` in ${def.name}` : ''}.`;
      if (req - sim >= 60) heldTxt += ` The other ${dur(req - sim)} were not played.`;
    } else if (r.heldBy === 'cap' && req - sim >= 60) heldTxt = `Time past ${dur(num(ctx.d?.offlineCapSeconds, sim))} is not counted.`;
    else if (r.heldBy === 'pending') heldTxt = 'A Reckoning was already waiting; nothing moved.';
    setText(held, heldTxt);
    show(held, !!heldTxt);

    const rows: [string, string][] = [];
    const signed = (x: number, f: (n: number) => string) => (x >= 0 ? '+' : '−') + f(Math.abs(x));
    rows.push(['Capital', signed(num(r.capital), money)]);
    if (num(r.mandate) !== 0) rows.push(['Mandate', signed(num(r.mandate), (n) => fmt(Math.round(n)))]);
    rows.push(['People', signed(num(r.population), (n) => (n >= 10 ? fmt(n) : n.toFixed(2)))]);
    if (num(r.decades)) rows.push(['Decades within the line', fmt(num(r.decades))]);
    if (num(r.crises)) rows.push(['Crises', fmt(num(r.crises))]);
    if (num(r.marketBuys)) rows.push(['Bought by the Market', fmt(num(r.marketBuys))]);
    if (num(r.civilServiceRaises)) rows.push(['Levers raised by the Civil Service', fmt(num(r.civilServiceRaises))]);
    if (num(r.treasuryBuys)) rows.push(['Built under Treasury rules', fmt(num(r.treasuryBuys))]);
    grid.replaceChildren(...rows.map(([k, v]) => h('div', null, h('dt', { text: k }), h('dd', { class: 'num', text: v }))));

    const ln = Object.keys(r.lines || {}).filter((id) => sectorDef(ctx, id));
    const order = sectorIds(ctx.content);
    ln.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    lines.replaceChildren(...ln.map((id) => {
      const st = r.lines[id];
      return h('li', { class: 'awl-' + st }, h('b', { text: sectorDef(ctx, id)!.name }), `: ${LINE_WORDS[st] ?? st}`);
    }));
    show(lines, ln.length > 0);

    const extra: string[] = [];
    const levName = (id: string) => ctx.content.levers?.find((l) => l.id === id)?.name ?? id;
    const lapsed = Array.isArray(r.lapsed) ? r.lapsed : [];
    if (lapsed.length) {
      const counts = new Map<string, number>();
      for (const id of lapsed) counts.set(id, (counts.get(id) ?? 0) + 1);
      extra.push(`Lapsed for want of Mandate: ${[...counts].map(([id, n]) => `${levName(id)}${n > 1 ? ` (${n} steps)` : ''}`).join(', ')}.`);
    }
    const names = (ids: string[] | undefined) => (ids || []).map((id) => sectorDef(ctx, id)?.name).filter(Boolean).join(', ');
    if (names(r.opened)) extra.push(`Opened: ${names(r.opened)}.`);
    if (names(r.unsettled)) extra.push(`No longer settled: ${names(r.unsettled)}.`);
    const waiting = (ctx.state.pendingDividends || []).length;
    if (num(r.dividends) > 0 || waiting) extra.push(`${waiting === 1 ? 'One dividend waits' : `${fmt(waiting)} dividends wait`} for a choice.`);
    setText(more, extra.join(' '));
    show(more, extra.length > 0);
    show(toDiv, waiting > 0);
    announce(`While you were away: ${dur(sim)} counted. ${heldTxt}`);
  }

  function check(): void {
    const r = ctx.state.lastOffline;
    if (!r || ctx.d?.freshRun) { if (shownKey) { shownKey = ''; show(el, false); } return; }
    const k = awayKey(ctx, r);
    if (k === shownKey) return;
    // Under a minute away is not news (the report still exists; it is simply not shown).
    if (getPrefs().awaySeen.includes(k) || num(r.requested) < 60) return;
    shownKey = k;
    render(r);
    show(el, true);
  }

  return { el, update: check, check };
}
