// M4: folding what is finished, so the player scrolls less (owner's playtest feedback; design §10). A settled Industry
// is one card: its settled row (the budget panel) and its defence line; its improvements, levers and instrument wait
// behind "Show the Industry". A capstoned Industry (settled for good at its Act's ending) is one row in a group headed
// "The Coal Age (settled 1914)", each row a way to its tab, the arrears line where a settlement is not being kept.
// What the player opened is remembered per device (prefs.ts). Display only: every figure is read from the views.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sd, openSectors } from './ctx';
import type { SectorId } from '../types';
import { h, setText, show, cls, setAttr, syncChildren } from './dom';
import { fmt, money, num, pct } from './fmt';
import { isOpen, setOpen } from './prefs';
import { capstoneText } from '../content/boardSurvey';
import { capstoneYear } from './panels';

export interface FoldComp extends Comp {
  /** The selected Industry's own panels are folded away now (app.ts hides them). */
  folded(): boolean;
}

export function buildFold(ctx: Ctx, onChange: () => void): FoldComp {
  // The capstone group.
  const gTitle = h('h2', { class: 'sec-t' });
  const gList = h('ol', { class: 'cap-list' });
  const group = h('div', { class: 'cap-group', hidden: true }, h('header', { class: 'sec-h' }, gTitle), gList);
  // The switch.
  const lbl = h('span');
  const toggle = h('button', { class: 'btn small fold-show', type: 'button', 'aria-expanded': 'false', onclick: () => {
    const k = keyOf(ctx.sector);
    setOpen(k, !isOpen(k, false));
    update();
    onChange();
  } }, lbl);
  const note = h('p', { class: 'fold-note muted' });
  const bar = h('div', { class: 'fold-bar', hidden: true }, note, toggle);
  const el = h('section', { class: 'fold-sec', 'aria-label': 'Settled', hidden: true }, group, bar);
  const rows = new Map<SectorId, { li: HTMLElement; fig: HTMLElement; arr: HTMLElement; btn: HTMLButtonElement }>();
  let rowKey = '';
  let isFolded = false;

  const keyOf = (id: SectorId) => `industry:${id}`;

  function rowFor(id: SectorId) {
    let r = rows.get(id);
    if (!r) {
      const nm = sectorDef(ctx, id)?.name ?? id;
      const fig = h('span', { class: 'cap-fig num' });
      const arr = h('span', { class: 'cap-arr', hidden: true, text: capstoneText.arrears });
      const btn = h('button', { class: 'cap-row', type: 'button', onclick: () => ctx.selectSector(id) },
        h('span', { class: 'cap-n', text: nm }), fig, arr);
      const li = h('li', null, btn);
      r = { li, fig, arr, btn };
      rows.set(id, r);
    }
    return r;
  }

  function update(): void {
    const e = sd(ctx);
    const settled = !!e?.settled;
    const capped = !!e?.capstoned;
    // The capstone group shows on any capstoned Industry's page: one row each, the selected one marked.
    const caps = capped ? openSectors(ctx).filter((id) => ctx.d?.sectors?.[id]?.capstoned) : [];
    show(group, caps.length > 0);
    if (caps.length) {
      const yr = capstoneYear(ctx);
      setText(gTitle, capstoneText.group.replace('{name}', ctx.d?.ending?.act?.title ?? 'The Age').replace('{year}', yr != null ? String(yr) : '—'));
      const k = caps.join(',');
      if (k !== rowKey) { rowKey = k; syncChildren(gList, caps.map((id) => rowFor(id).li)); }
      for (const id of caps) {
        const r = rowFor(id), x = ctx.d?.sectors?.[id], st = ctx.state.sectors?.[id]?.settled;
        const dfc = num(x?.settleDefence);
        setText(r.fig, `${money(num(st?.income ?? x?.income))}/s${x?.arrears ? '' : dfc > 0 ? ` · defence ${fmt(dfc)} Mandate/s` : ` · excess ${pct(num(x?.settleExcess), false)}`}`);
        show(r.arr, !!x?.arrears);
        cls(r.btn, 'sel', id === ctx.sector);
        cls(r.btn, 'arrears', !!x?.arrears);
        setAttr(r.btn, 'aria-current', id === ctx.sector ? 'page' : null);
      }
    } else if (rowKey) { rowKey = ''; syncChildren(gList, []); }
    // The fold: any settled Industry (capstoned or not).
    const open = settled && isOpen(keyOf(ctx.sector), false);
    isFolded = settled && !open;
    show(bar, settled);
    if (settled) {
      setText(lbl, open ? 'Fold the Industry' : 'Show the Industry');
      setAttr(toggle, 'aria-expanded', String(open));
      setText(note, open ? '' : `Its improvements${capped ? '' : ', levers'} and instrument are folded away while it is settled.`);
      show(note, !open);
    }
    show(el, settled || caps.length > 0);
  }

  return { el, update, folded: () => isFolded };
}
