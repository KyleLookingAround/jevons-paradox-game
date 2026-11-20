// M5: the Ministry's own chrome on the page. The sill under the picture (the Inspectors, tap to arm and then a place in
// the picture or an Industry; the Confidence line with polling day), the election sheet (three pledges, keep two; never
// modal; it resolves itself), Opposition (the Campaign button) and compensation. Every figure is ChairView's; every act is
// a ModelApi call (inspect, choosePledges, campaign, compensate). Shown only in a Ministry (Derived.chair non-null).
import type { Ctx, Comp } from './ctx';
import { sd, sectorDef, openSectors } from './ctx';
import { h, s, setText, show, cls, setAttr, setStyle } from './dom';
import { fmt, money, num, clamp, dur } from './fmt';
import { rivalShort, yearAt } from './rival';
import { sound } from './sound';
import { YEARS_PER_SECOND } from '../types';
import { MINISTRY_TEXT as MT } from '../content/officeText';
import { fill } from './rival';

/** An Inspector armed by the sill waits for a place: the picture's tap (world.ts) or an Industry chip sends him. */
let armed = false;
let onArm: ((on: boolean) => void) | null = null;
export function inspectorArmed(): boolean { return armed; }
function setArmed(on: boolean): void { armed = on; onArm?.(on); }
/** The picture was tapped while an Inspector was armed: send him to the Industry on screen. True if he went. */
export function sendInspector(ctx: Ctx, sector = ctx.sector): boolean {
  if (!armed) return false;
  const ok = ctx.act('inspect', (m, st, c) => m.inspect(st, c, sector));
  if (ok) { setArmed(false); sound('surveyed', { sector, label: 'inspection' }); }
  return ok;
}

const W = 84, H = 26;

export function buildSill(ctx: Ctx): Comp {
  // Inspectors: one button per Inspector, a ring that fills while he rests.
  const insp = h('div', { class: 'sill-insp', role: 'group', 'aria-label': 'Inspectors' });
  const inspL = h('span', { class: 'sill-k', text: MT.inspectors });
  const prompt = h('p', { class: 'sill-prompt', hidden: true });
  const chips = h('div', { class: 'sill-chips', hidden: true });
  const cancel = h('button', { class: 'linkish', type: 'button', onclick: () => setArmed(false) }, 'Cancel');
  // Confidence: a sparkline from the run's history samples, the win line, and the poll.
  const line = s('polyline', { class: 'cf-line', points: '' });
  const win = s('line', { class: 'cf-win', x1: 0, x2: W, y1: 0, y2: 0 });
  const dot = s('circle', { class: 'cf-dot', r: 2.2, cx: W, cy: H / 2 });
  const spark = s('svg', { class: 'cf-spark', viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
  spark.append(win, line, dot);
  const cfV = h('b', { class: 'num cf-v' });
  const poll = h('span', { class: 'cf-poll num' });
  const conf = h('div', { class: 'sill-conf' }, h('span', { class: 'sill-k', text: MT.confidence + ' ' }), cfV, spark, poll);
  const opp = h('div', { class: 'sill-opp', hidden: true });
  const comp = h('div', { class: 'sill-comp', hidden: true });
  const el = h('section', { class: 'sill', 'aria-label': 'The Ministry', hidden: true },
    h('div', { class: 'sill-row' }, inspL, insp, conf), prompt, chips, opp, comp);
  const btns: { b: HTMLButtonElement; ring: HTMLElement }[] = [];
  let histKey = '', chipKey = '';

  onArm = (on) => { cls(el, 'armed', on); update(); };

  function update(): void {
    const ch = ctx.d?.chair;
    show(el, !!ch);
    document.documentElement.toggleAttribute('data-ministry', !!ch);
    if (!ch) { if (armed) armed = false; return; }
    document.documentElement.toggleAttribute('data-opposition', ch.inOpposition);
    // Inspectors (feature 'inspection': total 0 while off, and the sill shows only the Confidence line).
    const n = ch.inspectors.total;
    show(inspL, n > 0); show(insp, n > 0);
    while (btns.length < n) {
      const ring = h('span', { class: 'ring', 'aria-hidden': 'true' });
      const b = h('button', { class: 'insp', type: 'button', onclick: () => { if (num(ch2()?.inspectors.ready) > 0) setArmed(!armed); } }, ring, h('span', { class: 'insp-f', 'aria-hidden': 'true', text: '♟' }));
      btns.push({ b, ring }); insp.append(b);
    }
    while (btns.length > n) btns.pop()!.b.remove();
    const cd = num(ctx.content.chair?.inspection?.cooldownYears, 5) / YEARS_PER_SECOND;
    btns.forEach(({ b, ring }, i) => {
      const left = num(ch.inspectors.readyIn?.[i]);
      const ready = left <= 0;
      cls(b, 'resting', !ready);
      setStyle(ring, '--p', ready ? '1' : clamp(1 - left / cd, 0, 1).toFixed(2));
      setAttr(b, 'aria-label', ready ? `${MT.inspectors}: ${MT.inspectorReady}. ${MT.inspectHint}` : `${MT.inspectors}: ${fill(MT.inspectorResting, { year: yearAt(ctx, num(ctx.state.time) + left) })}`);
      setAttr(b, 'aria-pressed', ready ? String(armed) : null);
      setAttr(b, 'aria-disabled', ready ? null : 'true');
    });
    if (armed && ch.inspectors.ready <= 0) armed = false;
    cls(el, 'armed', armed);
    show(prompt, armed); show(chips, armed);
    if (armed) {
      setText(prompt, `${MT.inspectHint}, or its picture`);
      const ids = openSectors(ctx).filter((id) => sd(ctx, id)?.rival);
      const ck = ids.map((id) => `${id}:${sd(ctx, id)?.inspectedAt ?? ''}`).join(',');
      if (ck !== chipKey) {
        chipKey = ck;
        chips.replaceChildren(...ids.map((id) => {
          const at = sd(ctx, id)?.inspectedAt;
          return h('button', { class: 'chip', type: 'button', onclick: () => sendInspector(ctx, id) },
            h('b', { text: sectorDef(ctx, id)?.name ?? id }), h('span', { class: 'muted', text: ` · ${at != null ? fill(MT.lastInspected, { year: yearAt(ctx, at) }) : MT.neverInspected}` }));
        }), cancel);
      }
    }
    // Confidence
    const c = num(ch.confidence);
    setText(cfV, fmt(Math.round(c)));
    cls(conf, 'low', c < ch.winAt);
    const p = ch.parliament;
    setText(poll, `${ch.inOpposition ? MT.opposition + ' · ' : ''}${fill(MT.pollingDay, { year: p.pollYear })}${ch.inOpposition ? '' : ` · ${dur(p.pollIn)}`}`);
    setAttr(conf, 'aria-label', `Confidence ${Math.round(c)}; ${ch.winAt} wins. Polling day ${p.pollYear}${ch.forecast != null ? `; forecast ${Math.round(ch.forecast)}` : ''}.`);
    const y = (v: number) => (H - 2 - clamp(v, 0, 100) / 100 * (H - 4)).toFixed(1);
    setAttr(win, 'y1', y(ch.winAt)); setAttr(win, 'y2', y(ch.winAt));
    const hist = Array.isArray(ctx.state.history) ? ctx.state.history : [];
    const hk = `${hist.length}|${hist[hist.length - 1]?.time ?? 0}|${Math.round(c)}`;
    if (hk !== histKey) {
      histKey = hk;
      const pts = hist.filter((x) => x.confidence != null).slice(-40);
      const t0 = pts.length ? pts[0].time : 0, t1 = Math.max(t0 + 1, num(ctx.state.time));
      const xs = pts.map((x) => `${((x.time - t0) / (t1 - t0) * (W - 4)).toFixed(1)},${y(num(x.confidence))}`);
      xs.push(`${W - 4},${y(c)}`);
      setAttr(line, 'points', xs.join(' '));
      setAttr(dot, 'cx', String(W - 4)); setAttr(dot, 'cy', y(c));
    }
    // Opposition: the Campaign button turns Mandate into Confidence.
    show(opp, ch.inOpposition);
    if (ch.inOpposition) {
      if (!opp.firstChild) {
        const t = h('p', { class: 'opp-t' });
        const b = h('button', { class: 'btn small', type: 'button', onclick: () => {
          const m = Math.floor(num(ctx.state.mandate) / 4);
          if (m > 0) ctx.act('campaign', (mm, st, cc) => mm.campaign(st, cc, m));
        } }, MT.campaign);
        opp.append(t, b);
      }
      const m = Math.floor(num(ctx.state.mandate) / 4);
      setText(opp.firstChild as HTMLElement, `${MT.opposition}. ${MT.oppositionNote}`);
      const b = opp.lastChild as HTMLButtonElement;
      setText(b, `${MT.campaign}: ${fmt(m)} Mandate`);
      setAttr(b, 'aria-disabled', ch.canCampaign && m > 0 ? null : 'true');
    }
    // Compensation, while the company's income here is below its peak (ChairView.compensation).
    const cp = ch.compensation?.[ctx.sector];
    const showC = !!cp && (cp.canCompensate || cp.until != null);
    show(comp, showC);
    if (cp && showC) {
      if (!comp.firstChild) comp.append(h('p', { class: 'comp-t' }), h('button', { class: 'btn small', type: 'button', onclick: () => ctx.act('compensate', (m, st, cc) => m.compensate(st, cc, ctx.sector)) }));
      const nm = sectorDef(ctx)?.name ?? 'this Industry';
      setText(comp.firstChild as HTMLElement, cp.until != null && cp.until > num(ctx.state.time) ? `${nm}: ${fill(MT.compensated, { year: yearAt(ctx, cp.until) })}` : `${nm}: ${fill(MT.compensateNote, { years: fmt(num(ctx.content.chair?.compensation?.years, 10)) })}`);
      const b = comp.lastChild as HTMLButtonElement;
      show(b, cp.canCompensate);
      setText(b, `${MT.compensate}: ${money(cp.cost)}`);
    }
  }
  const ch2 = () => ctx.d?.chair;
  return { el, update };
}

/* ------------------------------------------------------------------ the election sheet */

/** Three pledge cards, keep two, one tap each; never modal, and if left alone the first two stand (the core's default). */
export function buildElection(ctx: Ctx): Comp {
  const head = h('p', { class: 'el-h' });
  const list = h('div', { class: 'el-list' });
  const note = h('p', { class: 'el-note muted small' });
  const el = h('section', { class: 'election', 'aria-label': 'The manifesto', hidden: true }, head, list, note);
  let key = '';
  let pick: string[] = [];
  const btns = new Map<string, HTMLButtonElement>();
  function update(): void {
    const p = ctx.d?.chair?.parliament;
    const offer = p?.offer;
    show(el, !!offer && !!offer.length);
    if (!p || !offer?.length) { key = ''; return; }
    const k = offer.map((x) => x.id).join(',') + '|' + p.index;
    if (k !== key) {
      key = k; btns.clear();
      pick = (p.chosen ?? []).slice();
      list.replaceChildren(...offer.map((pl) => {
        const b = h('button', { class: 'pledge', type: 'button', 'aria-pressed': 'false', onclick: () => tap(pl.id) },
          h('b', { class: 'pl-n', text: pl.name }), pl.blurb ? h('span', { class: 'pl-b', text: pl.blurb }) : null,
          h('span', { class: 'pl-c num', text: `+${fmt(pl.confidence)} Confidence${pl.atPoll !== pl.confidence ? `, +${fmt(pl.atPoll)} on the day` : ''}` }),
          pl.binds ? h('span', { class: 'pl-x', text: `${MT.pledgeKept}: ${pl.binds}` }) : null);
        btns.set(pl.id, b);
        return b;
      }));
    }
    const chosen = pick.length && pick.length < p.keep ? pick : p.chosen ?? offer.slice(0, p.keep).map((x) => x.id);
    for (const [id, b] of btns) { const on = chosen.includes(id); setAttr(b, 'aria-pressed', String(on)); cls(b, 'on', on); }
    setText(head, `${MT.manifestoTitle} · ${fill(MT.pollingDay, { year: p.pollYear })}. ${fill(MT.manifestoKeep, { n: p.keep === 2 ? 'two' : fmt(p.keep) })}`);
    setText(note, p.chosen ? '' : fill(MT.manifestoDefault, { n: p.keep === 2 ? 'two' : fmt(p.keep) }));
  }
  function tap(id: string): void {
    const p = ctx.d?.chair?.parliament;
    if (!p?.offer) return;
    const cur = p.chosen ?? [];
    pick = pick.length ? pick : cur.slice();
    if (pick.includes(id)) pick = pick.filter((x) => x !== id);
    else { pick.push(id); while (pick.length > p.keep) pick.shift(); }
    if (pick.length === p.keep) ctx.act('choosePledges', (m, st, c) => m.choosePledges(st, c, pick.slice()));
    // A half-made choice (one of two) is shown as the only one lit until the second tap.
    for (const [bid, b] of btns) { const on = pick.includes(bid); setAttr(b, 'aria-pressed', String(on)); cls(b, 'on', on); }
  }
  return { el, update };
}

/** The masthead's third small line: Confidence beside wellbeing. Empty outside a Ministry. */
export function confidenceLine(ctx: Ctx): string {
  const ch = ctx.d?.chair;
  if (!ch) return '';
  return `${MT.confidence} ${Math.round(num(ch.confidence))}`;
}
