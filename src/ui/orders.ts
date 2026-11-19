// Standing orders: automation as policy (Derived.orders). The Market (on or off, a payback, a switch per open Industry),
// the Civil Service (which levers it may move, per Industry) and Treasury rules (a priority list of Commons projects and
// how much income to keep back). Unavailable orders say what unlocks them, named from content. Every change is one
// setOrders patch; the model decides when they act (nextTickIn).
import type { Ctx, Comp } from './ctx';
import { sectorDef, openSectors } from './ctx';
import type { GameEvent, OrderId, OrdersPatch } from '../types';
import { h, setText, setAttr, show, cls, syncChildren } from './dom';
import { fmt, num, dur } from './fmt';

/** "2 minutes", "30 seconds", "10 minutes", for the payback wording. */
function span(sec: number): string {
  if (sec < 90) return `${fmt(Math.round(sec))} seconds`;
  if (sec < 5400) return `${fmt(Math.round(sec / 60))} minute${Math.round(sec / 60) === 1 ? '' : 's'}`;
  return `${fmt(Math.round(sec / 3600))} hours`;
}
const short = (sec: number) => (sec < 60 ? `${Math.round(sec)} s` : sec < 5400 ? `${Math.round(sec / 60)} min` : `${Math.round(sec / 3600)} h`);

function toggle(label: string, onTap: () => void): { el: HTMLButtonElement; set(on: boolean, disabled?: boolean): void } {
  const el = h('button', { class: 'tog', type: 'button', role: 'switch', 'aria-checked': 'false', onclick: () => { if (el.getAttribute('aria-disabled') !== 'true') onTap(); } },
    h('span', { class: 'tog-k', 'aria-hidden': 'true' }), h('span', { class: 'tog-l', text: label }));
  return { el, set(on, disabled) { setAttr(el, 'aria-checked', String(on)); cls(el, 'on', on); setAttr(el, 'aria-disabled', disabled ? 'true' : null); } };
}

export function buildOrders(ctx: Ctx): Comp & { onEvents(ev: GameEvent[]): void } {
  const patch = (p: OrdersPatch) => ctx.act('setOrders', (m, s, c) => m.setOrders(s, c, p));
  const o = () => ctx.d?.orders;

  /** Who grants an order (an Institution whose effects unlock it), for the "what unlocks it" line. */
  const unlockedBy = (order: OrderId): string | null => {
    const inst = ctx.content.institutions?.find((i) => [...(i.effects || []), ...(i.nextLevels || []).flatMap((l) => l.effects)].some((e) => e.type === 'orderUnlock' && e.order === order));
    return inst?.name ?? null;
  };

  /* --- The Market --- */
  const mOn = toggle('The Market', () => patch({ market: { on: !o()?.market.on } }));
  const mPay = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Payback' });
  const mPayTxt = h('p', { class: 'od-txt' });
  const mSecs = h('div', { class: 'od-chips', role: 'group', 'aria-label': 'Industries the Market buys for' });
  const mNext = h('p', { class: 'od-next muted num' });
  // What the Market has done this run (from the events it caused), or that it is waiting.
  const mDid = h('p', { class: 'od-did' });
  let bought: { name: string; where: string; year: number }[] = [];
  let boughtRun = '';
  const runKey = () => `${ctx.state.seed ?? 0}:${ctx.state.meta?.reckonings ?? 0}`;
  function onEvents(ev: GameEvent[]): void {
    if (boughtRun !== runKey()) { boughtRun = runKey(); bought = []; }
    for (const e of ev) {
      if (e.by !== 'market' || (e.kind !== 'upgradeBought' && e.kind !== 'appFounded')) continue;
      const name = e.kind === 'upgradeBought' ? ctx.content.upgrades?.find((u) => u.id === e.id)?.name
        : sectorDef(ctx, e.sector ?? '')?.applications.find((a) => a.id === e.id)?.name;
      bought = [{ name: name ?? 'something', where: sectorDef(ctx, e.sector ?? '')?.name ?? '', year: Math.floor(num(e.year)) }, ...bought].slice(0, 3);
    }
  }
  const mOff = h('p', { class: 'od-off muted' });
  const market = h('div', { class: 'od od-market' }, h('div', { class: 'od-h' }, mOn.el), mPayTxt, mPay, mSecs, mDid, mNext, mOff);
  let payKey = '', secKey = '';
  const secBtns = new Map<string, HTMLButtonElement>();

  /* --- The Civil Service --- */
  const cOn = toggle('The Civil Service', () => patch({ civilService: { on: !o()?.civilService.on } }));
  const cTxt = h('p', { class: 'od-txt' });
  const cLevs = h('div', { class: 'od-chips', role: 'group', 'aria-label': 'Levers the Civil Service may move' });
  const cOff = h('p', { class: 'od-off muted' });
  const civil = h('div', { class: 'od od-civil' }, h('div', { class: 'od-h' }, cOn.el), cTxt, cLevs, cOff);
  let levKey = '';

  /* --- Treasury rules --- */
  const tOn = toggle('Treasury rules', () => patch({ treasury: { on: !o()?.treasury.on } }));
  const tTxt = h('p', { class: 'od-txt' });
  const tKeep = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Income kept back' });
  const tKeepRow = h('div', { class: 'od-keep' }, h('span', { class: 'muted', text: 'Keep back' }), tKeep);
  const tList = h('ol', { class: 'od-prio' });
  const tAdd = h('div', { class: 'od-chips', role: 'group', 'aria-label': 'Projects to add' });
  const tOff = h('p', { class: 'od-off muted' });
  const treasury = h('div', { class: 'od od-treasury' }, h('div', { class: 'od-h' }, tOn.el), tTxt, tKeepRow, tList, tAdd, tOff);
  let prioKey = '', keepKey = '';
  const KEEP = [0, 60, 300, 1800];

  const el = h('section', { class: 'orders', 'aria-label': 'Standing orders', hidden: true },
    h('header', { class: 'sec-h' }, h('h2', { class: 'sec-t', text: 'Standing orders' })),
    h('p', { class: 'od-lead muted', text: 'Orders act on their own at each look at the books, here and while you are away. Forks, research and levies stay yours.' }),
    market, civil, treasury);

  function update(): void {
    const ov = o();
    // The panel appears once any order exists to give (the Market from run 2), or with any order already on.
    const any = !!ov && (ov.market.available || ov.civilService.available || ov.treasury.available);
    show(el, any);
    if (!ov || !any) return;
    const open = openSectors(ctx);

    // The Market
    const ma = ov.market.available;
    mOn.set(ma && ov.market.on, !ma);
    show(mPay, ma); show(mSecs, ma && ov.market.on); show(mNext, ma && ov.market.on); show(mPayTxt, ma);
    const choices = Array.isArray(ov.market.paybackChoices) ? ov.market.paybackChoices : [];
    const pk = choices.join(',') + '|' + ov.market.paybackMax;
    if (pk !== payKey) {
      payKey = pk;
      mPay.replaceChildren(...choices.map((sec) => {
        const on = Math.abs(sec - ov.market.paybackMax) < 1e-6;
        return h('button', { class: 'seg-b' + (on ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(on), 'aria-label': `Pays back within ${span(sec)}`,
          onclick: () => patch({ market: { paybackMax: sec } }) }, short(sec));
      }));
    }
    setText(mPayTxt, ov.market.on ? `Buys what pays back within ${span(num(ov.market.paybackMax))}: improvements and new uses, one at a time in each Industry.` : 'Off: nothing is bought unless you buy it.');
    const sk = open.join(',');
    if (sk !== secKey) {
      secKey = sk;
      syncChildren(mSecs, open.map((id) => {
        let b = secBtns.get(id);
        if (!b) {
          b = h('button', { class: 'chip-t', type: 'button', role: 'switch', onclick: () => patch({ market: { sectors: { [id]: !(o()?.market.sectors?.[id] ?? true) } } }) }, sectorDef(ctx, id)?.name ?? id);
          secBtns.set(id, b);
        }
        return b;
      }));
    }
    for (const id of open) {
      const b = secBtns.get(id); if (!b) continue;
      const on = ov.market.sectors?.[id] ?? true;
      const settled = !!ctx.d?.sectors?.[id]?.settled;
      setAttr(b, 'aria-checked', String(on && !settled)); cls(b, 'on', on && !settled);
      setAttr(b, 'aria-disabled', settled ? 'true' : null);
      setAttr(b, 'title', settled ? 'Settled: the Market leaves it alone' : null);
    }
    setText(mNext, `Next look at the books in ${dur(Math.max(0, num(ov.nextTickIn)))} of play.`);
    if (boughtRun !== runKey()) { boughtRun = runKey(); bought = []; }
    const auto = num(ctx.state.run?.automated);
    setText(mDid, bought.length
      ? `Bought lately: ${bought.map((b) => `${b.name} (${b.where}, ${b.year})`).join('; ')}.${auto > bought.length ? ` ${fmt(auto)} actions by standing orders this run.` : ''}`
      : auto > 0 ? `${fmt(auto)} actions by standing orders this run.`
        : `Waiting: nothing on offer has paid back within ${span(num(ov.market.paybackMax))} yet this run.`);
    show(mDid, ma && ov.market.on);
    setText(mOff, ma ? '' : `The Market takes standing orders from run ${fmt(num(ctx.content.global?.orders?.marketFromReckoning, 1) + 1)}.`);
    show(mOff, !ma);

    // The Civil Service: levers of this Industry it may move.
    const ca = ov.civilService.available;
    cOn.set(ca && ov.civilService.on, !ca);
    const def = sectorDef(ctx);
    const levs = (ctx.levs || []).filter((v) => v?.def?.sector === ctx.sector && v.visible);
    const chosen = ov.civilService.levers?.[ctx.sector] ?? [];
    show(cTxt, ca); show(cLevs, ca && levs.length > 0);
    setText(cTxt, !levs.length ? `No levers in ${def?.name ?? 'this Industry'} for it to move.` : ov.civilService.on
      ? `Over the line in ${def?.name ?? 'this Industry'}, it raises the cheapest lever you allow; when wellbeing falls short and use is well under, it lowers the dearest.`
      : 'Off. Choose the levers it may move, then switch it on.');
    const lk = ctx.sector + '|' + levs.map((v) => v.def.id).join(',') + '|' + chosen.join(',');
    if (lk !== levKey) {
      levKey = lk;
      cLevs.replaceChildren(...levs.map((v) => {
        const on = chosen.includes(v.def.id);
        return h('button', { class: 'chip-t' + (on ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': String(on), onclick: () => {
          const cur = o()?.civilService.levers?.[ctx.sector] ?? [];
          patch({ civilService: { levers: { [ctx.sector]: on ? cur.filter((x) => x !== v.def.id) : [...cur, v.def.id] } } });
        } }, v.def.name);
      }));
    }
    const cBy = unlockedBy('civilService');
    setText(cOff, ca ? '' : `Opens with ${cBy ?? 'an Institution'}, seated.`);
    show(cOff, !ca);

    // Treasury rules: a priority list of Commons projects, and income kept back.
    const ta = ov.treasury.available;
    tOn.set(ta && ov.treasury.on, !ta);
    const commonsOpen = !!ctx.d?.commons?.available;
    show(tTxt, ta); show(tKeepRow, ta && commonsOpen); show(tList, ta && commonsOpen); show(tAdd, ta && commonsOpen);
    setText(tTxt, !commonsOpen ? 'They build Commons projects, once the Commons are open.'
      : `Builds the first project on the list it can pay for, keeping back ${span(num(ov.treasury.keepSeconds))} of income.`);
    const kk = String(ov.treasury.keepSeconds);
    if (kk !== keepKey) {
      keepKey = kk;
      tKeep.replaceChildren(...KEEP.map((sec) => {
        const on = Math.abs(sec - ov.treasury.keepSeconds) < 1e-6;
        return h('button', { class: 'seg-b' + (on ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(on), 'aria-label': `Keep ${span(sec)} of income`,
          onclick: () => patch({ treasury: { keepSeconds: sec } }) }, sec ? short(sec) : 'none');
      }));
    }
    const prio = Array.isArray(ov.treasury.projects) ? ov.treasury.projects : [];
    const all = (ctx.content.commons || []);
    const pk2 = prio.join(',') + '|' + all.map((p) => p.id).join(',');
    if (pk2 !== prioKey) {
      prioKey = pk2;
      const name = (id: string) => all.find((p) => p.id === id)?.name ?? id;
      tList.replaceChildren(...(prio.length ? prio.map((id, i) => h('li', null,
        h('span', { class: 'od-pn', text: name(id) }),
        h('button', { class: 'btn small', type: 'button', 'aria-label': `Move ${name(id)} up`, disabled: i === 0, onclick: () => { const n = [...prio]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; patch({ treasury: { projects: n } }); } }, '↑'),
        h('button', { class: 'btn small', type: 'button', 'aria-label': `Take ${name(id)} off the list`, onclick: () => patch({ treasury: { projects: prio.filter((x) => x !== id) } }) }, '×')))
        : [h('li', { class: 'none muted', text: 'Nothing on the list.' })]));
      tAdd.replaceChildren(...all.filter((p) => !prio.includes(p.id)).map((p) => h('button', { class: 'chip-t', type: 'button', onclick: () => patch({ treasury: { projects: [...prio, p.id] } }) }, `+ ${p.name}`)));
    }
    const tBy = unlockedBy('treasury');
    setText(tOff, ta ? '' : `Opens with ${tBy ?? 'an Institution'}, seated.`);
    show(tOff, !ta);
  }
  return { el, update, onEvents };
}
