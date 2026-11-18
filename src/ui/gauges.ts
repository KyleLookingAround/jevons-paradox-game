// THE TWIN GAUGES: Efficiency and Consumption on one shared log scale, plus the rebound meter,
// a twin sparkline, the reserve gauge, trend arrow and decoupling line.
import type { Ctx, Comp, FormulaKind } from './ctx';
import { eraDef, ed } from './ctx';
import { h, svg, setText, setAttr, setStyle, show, cls } from './dom';
import { fmt, fold, pct, dur, clamp, num, lower } from './fmt';
import { UI_ICONS } from './icons';

const CX = 60, CY = 60, R = 48;
const pt = (t: number, r = R): [number, number] => {
  const th = Math.PI * (1 - t);
  return [CX + r * Math.cos(th), CY - r * Math.sin(th)];
};
const arc = (t0: number, t1: number, r = R): string => {
  const a = clamp(Math.min(t0, t1), 0, 1), b = clamp(Math.max(t0, t1), 0, 1);
  if (b - a < 0.001) return '';
  const [x0, y0] = pt(a, r), [x1, y1] = pt(b, r);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

function dialSvg(extra = ''): SVGSVGElement {
  return svg(`<svg class="dial-svg" viewBox="0 0 120 66" aria-hidden="true">
    <path class="d-bezel" d="${arc(0, 1, R + 5)}"/>
    <path class="d-track" d="${arc(0, 1)}"/>
    <path class="d-zone" d=""/>
    <path class="d-sweep" d=""/>
    <g class="d-ticks"></g>
    ${extra}
    <g class="d-needle"><line x1="${CX}" y1="${CY + 5}" x2="${CX}" y2="${CY - R + 6}"/></g>
    <circle class="d-hub" cx="${CX}" cy="${CY}" r="3.2"/>
  </svg>`);
}

function rot(el: Element | null, t: number): void {
  if (!el) return;
  setStyle(el as SVGElement, 'transform', `rotate(${((clamp(t, 0, 1) - 0.5) * 180).toFixed(2)}deg)`);
}

function infoBtn(ctx: Ctx, kind: FormulaKind, label: string): HTMLButtonElement {
  const b = h('button', { class: 'info', type: 'button', 'aria-label': `How ${label} is worked out`, onclick: () => ctx.openFormula(kind) });
  b.append(svg(UI_ICONS.info));
  return b;
}

interface Dial { box: HTMLElement; svgEl: SVGSVGElement; val: HTMLElement; sub: HTMLElement; }
function dial(ctx: Ctx, key: string, label: string, kind: FormulaKind, extra = ''): Dial {
  const svgEl = dialSvg(extra);
  const val = h('div', { class: 'dial-val num' });
  const sub = h('div', { class: 'dial-sub' });
  const box = h('div', { class: `dial dial-${key}`, role: 'group', 'aria-label': label },
    h('div', { class: 'dial-head' }, h('span', { class: 'dial-lbl', text: label }), infoBtn(ctx, kind, label)), svgEl, val, sub);
  return { box, svgEl, val, sub };
}

function niceMax(v: number): number {
  const target = Math.max(4, v * 1.15);
  for (const m of [4, 8, 16, 32, 64]) if (m >= target) return m;
  return Math.pow(10, Math.ceil(Math.log10(target)));
}
function ticksFor(hi: number): number[] {
  if (hi <= 64) { const t: number[] = []; for (let v = 0.5; v <= hi + 1e-9; v *= 2) t.push(v); return t; }
  const t = [1]; for (let v = 10; v <= hi + 1e-9; v *= 10) t.push(v); return t;
}
const tickLabel = (v: number) => (v < 1 ? '½' : v >= 1000 ? fmt(v) : String(v));

export function buildGauges(ctx: Ctx): Comp {
  const eff = dial(ctx, 'eff', 'Efficiency', 'eff');
  const cons = dial(ctx, 'cons', 'Consumption', 'cons', `<g class="d-ghost"><line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R + 10}"/></g>`);
  const reb = dial(ctx, 'reb', 'Rebound', 'rebound', `<text class="d-q" x="${CX}" y="${CY - 12}" text-anchor="middle">?</text>`);
  // static rebound scale: 0..250%, 100% marked
  {
    const ticks = reb.svgEl.querySelector('.d-ticks')!;
    let m = '';
    for (const v of [0, 0.5, 1, 1.5, 2, 2.5]) {
      const t = v / 2.5, [x0, y0] = pt(t, R - 1), [x1, y1] = pt(t, R - (v === 1 ? 9 : 5));
      m += `<line class="${v === 1 ? 'tk tk-major' : 'tk'}" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`;
    }
    const [lx, ly] = pt(0.4, R - 15);
    m += `<text class="tk-l" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">100</text>`;
    ticks.innerHTML = m;
    setAttr(reb.svgEl.querySelector('.d-zone'), 'd', arc(0.4, 1));
  }

  const dials = h('div', { class: 'dials' }, eff.box, cons.box, reb.box);

  // sparkline
  const spark = svg(`<svg class="spark" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true">
    <line class="sp-base" x1="0" x2="200" y1="22" y2="22"/>
    <polyline class="sp-prom" points=""/><polyline class="sp-eta" points=""/><polyline class="sp-r" points=""/></svg>`);
  const sparkWrap = h('div', { class: 'spark-wrap' }, spark,
    h('div', { class: 'spark-key', 'aria-hidden': 'true' }, h('span', { class: 'k-r', text: 'use' }), h('span', { class: 'k-eta', text: 'efficiency' }), h('span', { class: 'k-prom', text: 'promised' })));

  const resLbl = h('span', { class: 'res-lbl' });
  const resLeft = h('span', { class: 'res-left num' });
  const resFill = h('span', { class: 'res-fill' });
  const reserve = h('div', { class: 'reserve' }, h('div', { class: 'res-row' }, resLbl, resLeft), h('div', { class: 'res-bar' }, resFill));
  const arrow = svg(UI_ICONS.arrow); arrow.classList.add('trend-arrow');
  const trendTxt = h('span', { class: 'num' });
  const trend = h('div', { class: 'trend' }, arrow, trendTxt);
  const decTxt = h('span', { class: 'num' });
  const decFill = h('span', {});
  const decoup = h('div', { class: 'decoup', hidden: true }, decTxt, h('span', { class: 'dec-bar' }, decFill));
  const side = h('div', { class: 'gauge-side' }, reserve, trend, decoup);
  const foot = h('div', { class: 'gauge-foot' }, sparkWrap, side);

  const el = h('section', { class: 'gauges', 'aria-label': 'Efficiency and consumption gauges' }, dials, foot);

  let scaleKey = '';
  let sparkKey = '';

  function update(): void {
    const e = ed(ctx), def = eraDef(ctx, ctx.era);
    const resName = def?.resource.name ?? 'Resource', unit = def?.resource.unit ?? '';
    const svcName = def?.service.name ?? 'service';
    const etaF = Math.max(1e-9, num(e?.etaFold, 1));
    const rF = Math.max(1e-9, num(e?.rFold, 1));
    const hi = niceMax(Math.max(etaF, rF, 1 / etaF > 0 ? 1 : 1));
    const lo = 0.5;
    const tv = (v: number) => (Math.log(Math.max(v, 1e-9)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));

    if (scaleKey !== String(hi)) {
      scaleKey = String(hi);
      const ts = ticksFor(hi);
      const every = ts.length > 6 ? 2 : 1;
      let m = '';
      ts.forEach((v, i) => {
        const t = tv(v), major = v === 1;
        const [x0, y0] = pt(t, R - 1), [x1, y1] = pt(t, R - (major ? 9 : 5));
        m += `<line class="tk${major ? ' tk-major' : ''}" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`;
        if (i % every === 0 || i === ts.length - 1 || major) {
          const [lx, ly] = pt(t, R - 15);
          m += `<text class="tk-l" x="${lx.toFixed(1)}" y="${(ly + 2).toFixed(1)}" text-anchor="middle">${tickLabel(v)}</text>`;
        }
      });
      for (const d of [eff, cons]) {
        d.svgEl.querySelector('.d-ticks')!.innerHTML = m;
        setAttr(d.svgEl.querySelector('.d-zone'), 'd', d === cons ? arc(tv(1), 1) : '');
      }
    }

    // Efficiency
    const t1 = tv(1);
    setAttr(eff.svgEl.querySelector('.d-sweep'), 'd', arc(t1, tv(etaF)));
    rot(eff.svgEl.querySelector('.d-needle'), tv(etaF));
    setText(eff.val, fold(etaF));
    setText(eff.sub, `${lower(svcName)} per ${lower(unit || resName)}`);

    // Consumption
    const sweep = cons.svgEl.querySelector('.d-sweep');
    setAttr(sweep, 'd', arc(t1, tv(rF)));
    cls(sweep, 'down', rF < 1);
    rot(cons.svgEl.querySelector('.d-needle'), tv(rF));
    rot(cons.svgEl.querySelector('.d-ghost'), tv(1 / etaF));
    setText(cons.val, fold(rF));
    setText(cons.sub, `${fmt(num(e?.resourceUse))} ${unit}/s`.trim());
    cls(cons.box, 'rising', rF > 1.02);

    // Rebound
    const revealed = !!ctx.state.flags?.revealed;
    const rb = e?.rebound;
    cls(reb.box, 'unknown', !revealed);
    const q = reb.svgEl.querySelector('.d-q') as SVGElement | null;
    show(q, !revealed);
    const needle = reb.svgEl.querySelector('.d-needle') as SVGElement | null;
    const has = revealed && rb != null && Number.isFinite(rb);
    show(needle, has);
    const rv = has ? (rb as number) : 0;
    setAttr(reb.svgEl.querySelector('.d-sweep'), 'd', has ? arc(0, clamp(rv, 0, 2.5) / 2.5) : '');
    rot(needle, clamp(rv, 0, 2.5) / 2.5);
    cls(reb.box, 'backfire', has && rv > 1);
    if (!revealed) { setText(reb.val, '?'); setText(reb.sub, 'Not yet understood'); }
    else if (!has) { setText(reb.val, '—'); setText(reb.sub, 'Nothing promised yet'); }
    else {
      setText(reb.val, pct(rv, false));
      setText(reb.sub, rv > 1 ? 'Backfire' : rv > 0.5 ? 'Most savings eaten' : rv > 0 ? 'Some savings eaten' : 'Savings kept');
    }

    // Sparkline (only when history moved)
    const hist = ctx.state.history || [];
    const last = hist[hist.length - 1];
    const k = `${ctx.era}|${hist.length}|${last?.time ?? 0}|${etaF.toFixed(3)}`;
    if (k !== sparkKey) {
      sparkKey = k;
      const pts: [number, number, number][] = [];
      for (const smp of hist) {
        const v = smp?.eras?.[ctx.era];
        if (v && Number.isFinite(v[0]) && Number.isFinite(v[1]) && v[0] > 0 && v[1] > 0) pts.push([smp.time, v[0], v[1]]);
      }
      if (e) pts.push([ctx.state.time, etaF, rF]);
      if (pts.length >= 2) {
        const t0 = pts[0][0], tN = pts[pts.length - 1][0], span = Math.max(1e-6, tN - t0);
        let mn = Infinity, mx = -Infinity;
        for (const [, a, b] of pts) for (const v of [a, b, 1 / a]) { const l = Math.log(v); if (l < mn) mn = l; if (l > mx) mx = l; }
        if (mx - mn < 0.4) { const mid = (mx + mn) / 2; mn = mid - 0.2; mx = mid + 0.2; }
        const y = (v: number) => (40 - ((Math.log(v) - mn) / (mx - mn)) * 36).toFixed(1);
        const x = (t: number) => (((t - t0) / span) * 200).toFixed(1);
        setAttr(spark.querySelector('.sp-r'), 'points', pts.map((p) => `${x(p[0])},${y(p[2])}`).join(' '));
        setAttr(spark.querySelector('.sp-eta'), 'points', pts.map((p) => `${x(p[0])},${y(p[1])}`).join(' '));
        setAttr(spark.querySelector('.sp-prom'), 'points', pts.map((p) => `${x(p[0])},${y(1 / p[1])}`).join(' '));
        const by = y(1);
        setAttr(spark.querySelector('.sp-base'), 'y1', by); setAttr(spark.querySelector('.sp-base'), 'y2', by);
      } else {
        for (const c of ['.sp-r', '.sp-eta', '.sp-prom']) setAttr(spark.querySelector(c), 'points', '');
      }
    }

    // Reserve
    const rf = clamp(num(e?.reserveFraction, 1), 0, 1);
    const flow = def?.resourceKind === 'flow';
    setText(resLbl, flow ? `${resName} free ${pct(rf, false)}` : `${resName} reserve ${pct(rf, false)}`);
    const sl = num(e?.secondsLeft, Infinity);
    setText(resLeft, !flow && Number.isFinite(sl) && sl < 7200 ? `≈ ${dur(sl)} left` : '');
    setStyle(resFill, 'width', (rf * 100).toFixed(1) + '%');
    cls(reserve, 'low', rf < 0.15);

    // Trend
    const tr = num(e?.trendR);
    setStyle(arrow, 'transform', `rotate(${(-clamp(tr * 900, -65, 65)).toFixed(1)}deg)`);
    cls(trend, 'up', tr > 0.001);
    cls(trend, 'downtrend', tr < -0.001);
    setText(trendTxt, Math.abs(tr) < 0.001 ? `${lower(resName)} use steady` : `${lower(resName)} use ${pct(tr)}/yr`);

    // Decoupling
    const dc = !!e?.decoupling;
    show(decoup, dc);
    if (dc) {
      const yrs = Math.floor(num(e?.steadyYears));
      setText(decTxt, `Decoupling: ${yrs} of 50 years`);
      setStyle(decFill, 'width', clamp(yrs / 50 * 100, 0, 100).toFixed(1) + '%');
    }
  }
  return { el, update };
}
