// THE TWIN GAUGES. Efficiency and Consumption share one symmetric log scale with ×1 at twelve o'clock:
// efficiency swings right, and the dashed "promised" needle on Consumption mirrors it to the left.
// The real Consumption needle, of course, swings right as well. Plus the rebound meter, a twin
// sparkline with the budget line, the reserve, the population gauge and the budget readout.
import type { Ctx, Comp, FormulaKind } from './ctx';
import { sectorDef, sd, ageOfSector, shownStock } from './ctx';
import { estimatesText, fishingGaugeText } from '../content/boardSurvey';
import { h, svg, setText, setAttr, setStyle, setFill, show, cls } from './dom';
import { snapSmall } from './dom';
import { fmt, fold, pct, dur, clamp, num, lower, fmtEpoch, unitOne } from './fmt';
import { UI_ICONS } from './icons';
import { YEARS_PER_SECOND } from '../types';
import type { GameEvent } from '../types';
import { reducedMotion, replay } from './dom';
import { overText } from './panels';

const CX = 60, CY = 60, R = 47;
const pt = (t: number, r = R): [number, number] => {
  const th = Math.PI * (1 - t);
  return [CX + r * Math.cos(th), CY - r * Math.sin(th)];
};
const arc = (t0: number, t1: number, r = R): string => {
  // Quantised (1/360 of the dial, half a degree) for the same reason as the needles.
  const qz = (t: number) => Math.round(clamp(t, 0, 1) * 360) / 360;
  const a = qz(Math.min(t0, t1)), b = qz(Math.max(t0, t1));
  if (b - a < 0.002) return '';
  const [x0, y0] = pt(a, r), [x1, y1] = pt(b, r);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

function dialSvg(extra = ''): SVGSVGElement {
  return svg(`<svg class="dial-svg" viewBox="0 0 120 66" aria-hidden="true">
    <path class="d-bezel" d="${arc(0, 1, R + 6)}"/>
    <path class="d-zone" d=""/>
    <path class="d-track" d="${arc(0, 1)}"/>
    <path class="d-sweep" d=""/>
    <g class="d-ticks"></g>
    ${extra}
    <g class="d-needle"><line x1="${CX}" y1="${CY + 4}" x2="${CX}" y2="${CY - R + 4}"/></g>
    <circle class="d-hub" cx="${CX}" cy="${CY}" r="3.4"/>
  </svg>`);
}

/** Sweeps follow the needles' half-degree steps, so a creeping value rewrites the path (and repaints the dial) only
 *  when it moves visibly. */
const qa = (t: number): number => Math.round(t * 720) / 720;
/** querySelector, remembered per root and selector (the dials' parts never change; perf pass 2). */
const qsMemo = new WeakMap<Element, Map<string, Element | null>>();
function qs(root: Element, sel: string): Element | null {
  let m = qsMemo.get(root);
  if (!m) { m = new Map(); qsMemo.set(root, m); }
  if (!m.has(sel)) m.set(sel, root.querySelector(sel));
  return m.get(sel)!;
}

function rot(el: Element | null, t: number): void {
  if (!el) return;
  // Quantised to half a degree, and eased only for a jump (dom.ts snapSmall): a needle creeping every tick would
  // otherwise keep a transition running, and with it a main-thread frame every vsync.
  snapSmall(el, clamp(t, 0, 1));
  setStyle(el as SVGElement, 'transform', `rotate(${(Math.round((clamp(t, 0, 1) - 0.5) * 360) / 2).toFixed(1)}deg)`);
}

export function infoBtn(ctx: Ctx, kind: FormulaKind, label: string): HTMLButtonElement {
  const b = h('button', { class: 'info', type: 'button', 'aria-label': `How ${label} is worked out`, onclick: () => ctx.openFormula(kind) });
  b.append(svg(UI_ICONS.info));
  return b;
}

interface Dial { box: HTMLElement; svgEl: SVGSVGElement; val: HTMLElement; sub: HTMLElement; }
function dial(ctx: Ctx, key: string, label: string, kind: FormulaKind, extra = ''): Dial {
  const svgEl = dialSvg(extra);
  const val = h('div', { class: 'dial-val num' });
  const sub = h('div', { class: 'dial-sub num' });
  const box = h('div', { class: `dial dial-${key}`, role: 'group', 'aria-label': label },
    h('div', { class: 'dial-head' }, h('span', { class: 'dial-lbl', text: label }), infoBtn(ctx, kind, label)), svgEl,
    h('div', { class: 'dial-read' }, val, sub));
  return { box, svgEl, val, sub };
}

function niceMax(v: number): number {
  const target = Math.max(4, v * 1.12);
  for (const m of [4, 8, 16, 32, 64]) if (m >= target) return m;
  return Math.pow(10, Math.ceil(Math.log10(target)));
}
function ticksFor(hi: number): number[] {
  const t: number[] = [];
  if (hi <= 64) { for (let v = 1 / hi; v <= hi * 1.0001; v *= 2) t.push(v); return t; }
  for (let v = 1 / hi; v <= hi * 1.0001; v *= 10) t.push(v);
  return t;
}
function tickLabel(v: number): string {
  if (v >= 1) return v >= 1000 ? fmt(v) : String(Math.round(v));
  const inv = Math.round(1 / v);
  return inv === 2 ? '½' : inv === 4 ? '¼' : inv === 8 ? '⅛' : '1/' + (inv >= 1000 ? fmt(inv) : inv);
}

/** Is a cap lever of this sector in force? Reads the lever views (no rule): level > 0 on a lever of kind 'cap'. */
function capActive(ctx: Ctx): boolean {
  return (ctx.levs || []).some((v) => v?.def?.sector === ctx.sector && v.def.kind === 'cap' && num(v.level) > 0);
}

/** "140 years", "a year"; very long readings rounded to a figure that reads. */
export function yrs(y: number): string {
  const v = Math.max(0, num(y));
  if (v < 1.5) return v < 0.5 ? 'under a year' : 'a year';
  return `${fmt(v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v))} years`;
}

/** M4: what the line is compared with: the full account for a line drawn on it (BudgetState.account 'full'), else R. */
export function lineUse(ctx: Ctx, e: ReturnType<typeof sd>, id: string = ctx.sector): number {
  const full = ctx.state.sectors?.[id]?.budget?.account === 'full';
  return full && e?.fullR != null && Number.isFinite(e.fullR) ? e.fullR : num(e?.resourceUse);
}

/** The rebound dial's readable ceiling: past it the figure is honest but unreadable ("1.37k%"), so the dial says so. */
const REBOUND_SHOWN_MAX = 10;

export interface GaugesComp extends Comp {
  onEvents(ev: GameEvent[]): void;
  /** The sparkline, reserve and population: pinned with the dials while the header has room, else moved (app.ts) to
   *  the head of the feed, so that nothing pinned takes more than a third of a short screen. */
  more: HTMLElement;
  /** The quiet line (the budget, growth, the binding cap): app.ts places it in the header's note line. */
  note: HTMLElement;
}

export function buildGauges(ctx: Ctx): GaugesComp {
  const eff = dial(ctx, 'eff', 'Efficiency', 'eff');
  const cons = dial(ctx, 'cons', 'Consumption', 'cons',
    `<g class="d-was"><line x1="${CX}" y1="${CY - R + 2}" x2="${CX}" y2="${CY - R + 12}"/></g><g class="d-ghost"><line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R + 9}"/></g><g class="d-full"><line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R + 6}"/></g>`);
  const reb = dial(ctx, 'reb', 'Rebound', 'rebound');
  // Static rebound scale: 0..250%, the 100% line marked; everything past it is the backfire zone.
  {
    const ticks = reb.svgEl.querySelector('.d-ticks')!;
    let m = '';
    for (const v of [0, 0.5, 1, 1.5, 2, 2.5]) {
      const t = v / 2.5, [x0, y0] = pt(t, R - 1), [x1, y1] = pt(t, R - (v === 1 ? 10 : 5));
      m += `<line class="${v === 1 ? 'tk tk-major' : 'tk'}" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`;
    }
    ticks.innerHTML = m;
    setAttr(reb.svgEl.querySelector('.d-zone'), 'd', arc(0.4, 1));
  }
  // The "100%" label is drawn above the needle (with a halo in the page colour) and steps to whichever side of the
  // 100% tick the needle is not on, so the needle can never hide it.
  const rebLbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  rebLbl.setAttribute('class', 'tk-l tk-100');
  rebLbl.textContent = '100%';
  reb.svgEl.querySelector('.d-hub')?.after(rebLbl);
  let rebSide = 0;
  const placeRebLbl = (side: number) => {
    if (side === rebSide) return;
    rebSide = side;
    const t = 0.4 + side * 0.085;
    const [lx, ly] = pt(t, R - 18);
    rebLbl.setAttribute('x', lx.toFixed(1));
    rebLbl.setAttribute('y', (ly + 2.5).toFixed(1));
    rebLbl.setAttribute('text-anchor', 'middle');
  };

  const dials = h('div', { class: 'dials' }, eff.box, cons.box, reb.box);

  // Twin sparkline over the run: R emphasised, η quieter, "promised" (1/η) dashed, the budget line long-dashed.
  const spark = svg(`<svg class="spark" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
    <line class="sp-base" x1="0" x2="200" y1="20" y2="20"/>
    <polyline class="sp-sink" points=""/><polyline class="sp-bud" points=""/><polyline class="sp-prom" points=""/><polyline class="sp-eta" points=""/><polyline class="sp-r" points=""/></svg>`);
  const kBud = h('span', { class: 'k-bud', text: 'budget', hidden: true });
  const kSink = h('span', { class: 'k-sink', text: 'sink', hidden: true });
  const kProm = h('span', { class: 'k-prom', text: 'promised', hidden: true });
  const sparkWrap = h('div', { class: 'spark-wrap' }, spark,
    h('div', { class: 'spark-key', 'aria-hidden': 'true' },
      h('span', { class: 'k-r', text: 'use' }), h('span', { class: 'k-eta', text: 'efficiency' }), kProm, kBud, kSink));

  // The resource's name may be cut short on a narrow phone (it is in the title); its figures never are.
  const resLbl = h('span', { class: 'res-lbl', 'data-clip': 'ok' });
  const resPct = h('span', { class: 'res-pct num' });
  const resLeft = h('span', { class: 'res-left num' });
  const resFill = h('span', { class: 'res-fill fillx' });
  // M4 (The Survey): once 'estimates' is on, "years left" in two readings under the bar (SectorDerived.yearsLeft).
  const resYrs = h('div', { class: 'res-yrs num', hidden: true });
  const reserve = h('div', { class: 'reserve' }, h('div', { class: 'res-row' }, resLbl, resPct, resLeft), h('div', { class: 'res-bar' }, resFill), resYrs);

  // Population gauge: headcount and growth, over a wellbeing scale marking where growth starts (subsistence) and
  // stops (the demographic transition), with the current wellbeing as a needle.
  const popTxt = h('span', { class: 'pop-txt num' });
  const popZone = h('span', { class: 'pop-zone' });
  const popTgt = h('span', { class: 'pop-tgt' });
  const popStop = h('span', { class: 'pop-stop' });
  const popNow = h('span', { class: 'pop-now' });
  const popBar = h('div', { class: 'pop-bar', 'aria-hidden': 'true' }, popZone, popTgt, popStop, popNow);
  const pop = h('div', { class: 'popg' }, h('div', { class: 'res-row' }, popTxt), popBar);

  const side = h('div', { class: 'gauge-side' }, reserve, pop);
  const foot = h('div', { class: 'gauge-foot' }, sparkWrap, side);

  // One quiet line under the gauges: the budget, growth at frozen efficiency, and what a binding cap means.
  const budTxt = h('span', { class: 'note-bud num' });
  const growTxt = h('span', { class: 'note-grow num' });
  const capTxt = h('span', { class: 'note-cap' });
  const note = h('div', { class: 'gauge-note' }, budTxt, growTxt, capTxt);

  const el = h('section', { class: 'gauges', 'aria-label': 'Efficiency and consumption gauges' }, dials, foot);

  let scaleKey = '';
  // Whether the dials are drawn small: measured once, and again only when the window is resized.
  let tight = false;
  const measure = () => { const w = eff.box.getBoundingClientRect().width; tight = w > 0 && w < 128; };
  requestAnimationFrame(measure);
  window.addEventListener('resize', () => requestAnimationFrame(measure), { passive: true });
  let sparkKey = '', sparkBase = '', sparkAt = 0;
  let lastTv = { cons: 0.5 };

  /** A purchase in this Industry: the needles swing slowly while the player watches; the old consumption reading is
   *  left as a faint mark for a few seconds; the promised needle jumps to what the card promised. Never blocks input. */
  function onEvents(ev: GameEvent[]): void {
    const mine = ev.find((e) => e.sector === ctx.sector && e.by === 'player' && (e.kind === 'upgradeBought' || e.kind === 'appFounded'));
    if (!mine || reducedMotion()) return;
    const was = cons.svgEl.querySelector('.d-was') as SVGElement | null;
    rot(was, lastTv.cons);
    replay(el, 'swing', 3200);
  }

  function update(): void {
    const e = sd(ctx), def = sectorDef(ctx, ctx.sector);
    const resName = def?.resource.name ?? 'Resource', unit = def?.resource.unit ?? '';
    const svcName = def?.service.name ?? 'service';
    const etaF = Math.max(1e-9, num(e?.etaFold, 1));
    const rF = Math.max(1e-9, num(e?.rFold, 1));
    const hi = niceMax(Math.max(etaF, rF, 1 / etaF, 1 / rF));
    const Lg = Math.log(hi);
    const tv = (v: number) => 0.5 + Math.log(Math.max(v, 1e-12)) / (2 * Lg);
    const revealed = !!ctx.state.flags?.revealed;

    // A small dial (landscape phone, 320 px) labels every other tick, so the scale never crowds (QA carry-over).
    if (scaleKey !== `${hi}|${fmtEpoch()}|${tight}`) {
      scaleKey = `${hi}|${fmtEpoch()}|${tight}`;
      const ts = ticksFor(hi);
      const every = ts.length > 7 || (tight && ts.length > 4) ? 2 : 1;
      const mid = (ts.length - 1) / 2;
      let m = '';
      ts.forEach((v, i) => {
        const t = tv(v), major = Math.abs(v - 1) < 1e-9;
        const [x0, y0] = pt(t, R - 1), [x1, y1] = pt(t, R - (major ? 10 : 5));
        m += `<line class="tk${major ? ' tk-major' : ''}" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`;
        if ((i - mid) % every === 0) {
          const [lx, ly] = pt(t, R - 17);
          m += `<text class="tk-l" x="${lx.toFixed(1)}" y="${(ly + 2.5).toFixed(1)}" text-anchor="middle">${tickLabel(v)}</text>`;
        }
      });
      for (const d of [eff, cons]) {
        d.svgEl.querySelector('.d-ticks')!.innerHTML = m;
        setAttr(d.svgEl.querySelector('.d-zone'), 'd', d === cons ? arc(0.5, 1) : '');
      }
    }

    // Efficiency
    setAttr(qs(eff.svgEl, '.d-sweep'), 'd', arc(0.5, qa(tv(etaF))));
    rot(qs(eff.svgEl, '.d-needle'), tv(etaF));
    setText(eff.val, fold(etaF));
    // Units, not names: "hp per ton" fits a third of a 360 px phone where "motive power per ton" did not.
    const svcUnit = def?.service.unit;
    setText(eff.sub, svcUnit && unit ? `${svcUnit} per ${unitOne(def?.resource)}` : `${lower(svcName)} per ${unitOne(def?.resource) || lower(resName)}`);
    setAttr(eff.box, 'title', `${svcName} per ${unitOne(def?.resource) || lower(resName)} of ${lower(resName)}, against the start`);

    // Consumption (with the cosmetic trend as an arrow)
    const sweep = qs(cons.svgEl, '.d-sweep');
    setAttr(sweep, 'd', arc(0.5, qa(tv(rF))));
    cls(sweep, 'down', rF < 1);
    rot(qs(cons.svgEl, '.d-needle'), tv(rF));
    lastTv = { cons: tv(rF) };
    rot(qs(cons.svgEl, '.d-ghost'), tv(1 / etaF));
    show(qs(cons.svgEl, '.d-ghost') as SVGElement | null, etaF > 1.001);
    // M4 (The Survey): the full account's fainter needle (counting the coal in its machines; SectorDerived.fullR).
    const fullR = e?.fullR, ownR = num(e?.resourceUse);
    const hasFull = fullR != null && Number.isFinite(fullR) && ownR > 0;
    const fullEl = qs(cons.svgEl, '.d-full') as SVGElement | null;
    show(fullEl, hasFull);
    if (hasFull) rot(fullEl, tv(rF * (fullR as number) / ownR));
    setAttr(cons.box, 'aria-label', hasFull ? `Consumption; ${lower(estimatesText.fullAccount.label)}: ${fold(rF * (fullR as number) / ownR)}` : 'Consumption');
    setText(cons.val, fold(rF));
    const tr = num(e?.trendR);
    const arrow = tr > 0.001 ? ' ↑' : tr < -0.001 ? ' ↓' : '';
    setText(cons.sub, `${fmt(num(e?.resourceUse))} ${unit}/s${arrow}`.trim());
    cls(cons.box, 'rising', rF > 1.02);
    cls(el, 'paradox', etaF > 1.05 && rF > 1.02);

    // Rebound (direct, against the shadow)
    const rb = e?.rebound;
    cls(reb.box, 'unknown', !revealed);
    const needle = qs(reb.svgEl, '.d-needle') as SVGElement | null;
    const has = revealed && rb != null && Number.isFinite(rb);
    show(needle, has);
    const rv = has ? (rb as number) : 0;
    setAttr(qs(reb.svgEl, '.d-sweep'), 'd', has ? arc(0, qa(clamp(rv, 0, 2.5) / 2.5)) : '');
    rot(needle, clamp(rv, 0, 2.5) / 2.5);
    // A cap binds when it charges a permit price (SectorDerived.permitPrice > 0 only while a cap binds).
    const capped = has && capActive(ctx) && num(e?.permitPrice) > 0;
    cls(reb.box, 'backfire', has && rv > 1 && !capped);
    cls(reb.box, 'capped', capped);
    // Needle at or right of the 100% tick: label to its left; otherwise to its right.
    placeRebLbl(has && rv >= 0.9 ? -1 : 1);
    if (!revealed) { setText(reb.val, '?'); setText(reb.sub, 'not yet understood'); }
    else if (!has) { setText(reb.val, '—'); setText(reb.sub, 'no promise yet'); }
    else {
      // The figure is the reading; the word under it says what it means. Short enough for a third of a 360 px phone.
      // Past REBOUND_SHOWN_MAX (1,000%) the measured figure stays in the title and the formula sheet; the dial reads
      // "well past" rather than "1.37k%".
      const past = rv > REBOUND_SHOWN_MAX;
      setText(reb.val, past ? '>1,000%' : pct(rv, false));
      // Under a binding cap the cap sets the resource and direct rebound reads about 100% by construction (DESIGN.md):
      // the dial says so in the neutral colour rather than scolding the restraint that holds it (QA B5).
      if (capped) setText(reb.sub, 'the cap holds');
      else setText(reb.sub, rv > 1 ? '▲ backfire' : rv > 0 ? 'of savings eaten' : 'savings kept');
      setAttr(reb.box, 'title', past ? `Rebound ${pct(rv, false)}: the extra use is many times what efficiency saved` : null);
    }

    // Sparkline (only when history moved)
    const hist = ctx.state.history || [];
    const last = hist[hist.length - 1];
    const id = ctx.sector;
    const bRnow = e?.budgetR;
    const budNow = bRnow != null && num(e?.resourceUse) > 0 ? bRnow * rF / num(e?.resourceUse) : null;
    const sinkNow = e?.sinkR != null && num(e?.resourceUse) > 0 ? e.sinkR * rF / num(e?.resourceUse) : null;
    const k = `${id}|${hist.length}|${last?.time ?? 0}|${etaF.toFixed(3)}|${rF.toFixed(3)}|${budNow?.toFixed(3) ?? ''}|${sinkNow?.toFixed(3) ?? ''}`;
    // The samples change every few seconds; the live head every tick. A head-only move redraws at most twice a second
    // (five polylines rewritten and the gauge repainted at every tick were a steady cost; perf pass 2).
    const kBase = k.slice(0, k.indexOf('|', k.indexOf('|', k.indexOf('|') + 1) + 1));
    const nowMs = performance.now();
    if (k !== sparkKey && (kBase !== sparkBase || nowMs - sparkAt >= 500)) {
      sparkKey = k; sparkBase = kBase; sparkAt = nowMs;
      const pts: [number, number, number, number | null, number | null][] = [];
      const pos = (x: number | null | undefined) => (x != null && Number.isFinite(x) && x > 0 ? x : null);
      for (const smp of hist) {
        const v = smp?.sectors?.[id];
        if (v && Number.isFinite(v[0]) && Number.isFinite(v[1]) && v[0] > 0 && v[1] > 0) pts.push([num(smp.time), v[0], v[1], pos(smp?.budget?.[id]), pos(smp?.sink?.[id])]);
      }
      if (e) pts.push([num(ctx.state.time), etaF, rF, pos(budNow), pos(sinkNow)]);
      if (pts.length >= 2) {
        const t0 = pts[0][0], tN = pts[pts.length - 1][0], span = Math.max(1e-6, tN - t0);
        let mn = 0, mx = 0;
        for (const [, a, b, bu, sk] of pts) for (const v of [a, b, 1 / a, bu ?? 1, sk ?? 1]) { const l = Math.log(v); if (l < mn) mn = l; if (l > mx) mx = l; }
        if (mx - mn < 0.4) { const m2 = (mx + mn) / 2; mn = m2 - 0.2; mx = m2 + 0.2; }
        const y = (v: number) => (37 - ((Math.log(v) - mn) / (mx - mn)) * 34).toFixed(1);
        const x = (t: number) => (((t - t0) / span) * 200).toFixed(1);
        setAttr(qs(spark, '.sp-r'), 'points', pts.map((p) => `${x(p[0])},${y(p[2])}`).join(' '));
        setAttr(qs(spark, '.sp-eta'), 'points', pts.map((p) => `${x(p[0])},${y(p[1])}`).join(' '));
        // The promised line means something only once efficiency has moved off the start.
        const promised = pts.some((p) => p[1] > 1.001);
        setAttr(qs(spark, '.sp-prom'), 'points', promised ? pts.map((p) => `${x(p[0])},${y(1 / p[1])}`).join(' ') : '');
        // "promised" gives way to the budget and sink keys once those lines are drawn (one line of key on a phone).
        const lines = pts.filter((p) => p[3] != null).length >= 2 || pts.filter((p) => p[4] != null).length >= 2;
        show(kProm, promised && !lines);
        const bud = pts.filter((p) => p[3] != null);
        setAttr(qs(spark, '.sp-bud'), 'points', bud.length >= 2 ? bud.map((p) => `${x(p[0])},${y(p[3] as number)}`).join(' ') : '');
        show(kBud, bud.length >= 2);
        setText(kBud, ctx.state.sectors?.[id]?.budget?.heldAt != null ? 'budget, held' : 'budget');
        // The sink line: the use at which the sky clears and stays clear (SectorDerived.sinkR, sampled in history).
        const sink = pts.filter((p) => p[4] != null);
        setAttr(qs(spark, '.sp-sink'), 'points', sink.length >= 2 ? sink.map((p) => `${x(p[0])},${y(p[4] as number)}`).join(' ') : '');
        show(kSink, sink.length >= 2);
        const by = y(1);
        setAttr(qs(spark, '.sp-base'), 'y1', by); setAttr(qs(spark, '.sp-base'), 'y2', by);
      } else {
        for (const c of ['.sp-r', '.sp-eta', '.sp-prom', '.sp-bud', '.sp-sink']) setAttr(spark.querySelector(c), 'points', '');
        show(kBud, false);
        show(kSink, false);
        show(kProm, false);
      }
    }

    // Reserve. M4: a renewable stock shows the fleet's catch per trip until it is surveyed (never the true stock).
    const stk = shownStock(e);
    if (stk) {
      const v = clamp(stk.value, 0, 1);
      const lbl = stk.surveyed ? fishingGaugeText.surveyed : fishingGaugeText.reported;
      setText(resLbl, lbl);
      setText(resPct, pct(v, false));
      setAttr(reserve, 'title', `${lbl}: ${pct(v, false)}${stk.surveyed ? '' : `. ${fishingGaugeText.reportedNote}`}`);
      setText(resLeft, '');
      setFill(resFill, v);
      cls(reserve, 'low', stk.surveyed && v < 0.3);
      cls(reserve, 'reported', !stk.surveyed);
    } else {
      const rf = clamp(num(e?.reserveFraction, 1), 0, 1);
      const flow = def?.resourceKind === 'flow';
      setText(resLbl, resName);
      setText(resPct, `${pct(rf, false)} ${flow ? 'spare' : 'left'}`);
      setAttr(reserve, 'title', `${resName}: ${pct(rf, false)} ${flow ? 'spare' : 'left'}`);
      const sl = num(e?.secondsLeft, Infinity);
      setText(resLeft, !flow && Number.isFinite(sl) && sl < 7200 ? `≈ ${dur(sl)}` : '');
      setFill(resFill, rf);
      cls(reserve, 'low', rf < 0.15);
      cls(reserve, 'reported', false);
    }
    const yl = e?.yearsLeft;
    const twoRates = !!yl && yl.flat != null && yl.growing != null;
    show(resYrs, twoRates);
    if (twoRates && yl) setText(resYrs, `${estimatesText.yearsLeft.flat}: ${yrs(yl.flat as number)} · ${estimatesText.yearsLeft.growing}: ${yrs(yl.growing as number)}`);

    // Population (the unfolding: shown once people matter: the first crisis, or a town grown by a third)
    const g = ctx.content.global;
    const feats = ctx.d?.features;
    show(pop, !!feats?.population);
    const N = num(ctx.state.population, 1), dN = num(ctx.d?.populationGrowthPerSec);
    const perYear = N > 0 ? dN / N / YEARS_PER_SECOND : 0;
    setText(popTxt, `People ×${N >= 10 ? fmt(N) : N.toFixed(2)} · ${Math.abs(perYear) < 0.0005 ? 'steady' : `${pct(perYear)} a year`}`);
    cls(pop, 'growing', perYear >= 0.0005);
    cls(pop, 'shrinking', perYear <= -0.0005);
    const W = num(ctx.d?.wellbeing), sub = num(g?.subsistence), tgt = num(g?.wellbeingTarget), wt = g?.demography?.transitionWellbeing;
    const top = Math.max((wt ?? tgt) * 1.2, W * 1.05, tgt * 1.3, 1);
    const at = (v: number) => (Math.round(clamp(v / top, 0, 1) * 200) / 2).toFixed(1) + '%';
    setStyle(popZone, 'left', at(sub));
    setStyle(popZone, 'right', wt != null ? (100 - clamp(wt / top, 0, 1) * 100).toFixed(1) + '%' : '0%');
    setStyle(popTgt, 'left', at(tgt));
    show(popStop, wt != null);
    if (wt != null) setStyle(popStop, 'left', at(wt));
    setStyle(popNow, 'left', at(W));
    setAttr(pop, 'title', wt != null ? `Growth starts above wellbeing ${fmt(sub)} and stops at ${fmt(wt)}` : `Growth starts above wellbeing ${fmt(sub)}`);

    // Budget readout
    const bR = e?.budgetR;
    const dec = num(g?.steady?.decadeYears, 10) || 10;
    if (e?.settled) {
      setText(budTxt, '✓ Settled');
      setAttr(budTxt, 'title', null);
      cls(budTxt, 'ok', true); cls(budTxt, 'over', false);
    } else if (bR == null) {
      setText(budTxt, revealed && feats?.budget ? 'No budget drawn' : '');
      cls(budTxt, 'ok', false); cls(budTxt, 'over', false);
    } else if (e?.withinBudget) {
      // Compact, to keep the pinned header to one note line; the Budget panel below has the full sentence.
      const into = Math.floor(num(e.steadyYears) % dec);
      const dw = num(e.decadeWellbeing);
      setText(budTxt, e.decoupling ? `✓ Within budget · ${into} of ${dec} years` : `✓ Within budget · wellbeing under ${fmt(dw)}`);
      setAttr(budTxt, 'title', e.decoupling ? `Within budget: ${into} of ${dec} years to the next decade, with wellbeing at least ${fmt(dw)}` : `Within budget, but wellbeing is under ${fmt(dw)}, the day the line was drawn: the years do not count`);
      cls(budTxt, 'ok', !!e.decoupling); cls(budTxt, 'over', false);
    } else {
      const over = bR > 0 ? lineUse(ctx, e) / bR - 1 : NaN;
      setText(budTxt, `▲ ${overText(over, 'Over budget by')}`);
      setAttr(budTxt, 'title', null);
      cls(budTxt, 'ok', false); cls(budTxt, 'over', true);
    }
    show(budTxt, !!budTxt.textContent);
    const ff = num(e?.frontierFold, 1);
    const since = def ? (def.firstYear ?? ageOfSector(ctx.content, def.id)?.yearSpan?.[0]) : undefined;
    setText(growTxt, revealed && e ? `Growth ${fold(ff)}${since != null ? ` since ${since}` : ''}` : '');
    show(growTxt, !!growTxt.textContent);
    // A cap binds when it charges a permit price (SectorDerived.permitPrice > 0 only while a cap binds).
    show(capTxt, revealed && capActive(ctx) && num(e?.permitPrice) > 0);
    setText(capTxt, `The cap sets the ${lower(resName)}; the savings became service.`);
    show(note, !!(budTxt.textContent || growTxt.textContent));
  }
  return { el, update, onEvents, more: foot, note };
}
