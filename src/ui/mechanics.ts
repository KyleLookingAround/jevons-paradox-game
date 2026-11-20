// M3: each Industry's own mechanic, as a small instrument under its picture (SectorDerived.seams/load/travel/free/upkeep).
// The scene draws the same mechanic in the picture; the instrument carries the figures and the one decision (Sink).
// Each part is shown only while the core reports its view (null while its feature is off), so a locked mechanic is not
// on the page at all. Structure is built once per Industry and kind; numbers are patched in place (the load curve's 24
// bars by attribute). Holds no rules: every figure is read from the views.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sd } from './ctx';
import type { SectorDerived } from '../types';
import { h, s as sv, svg, setText, setAttr, setStyle, setFill, show, cls, syncChildren, reducedMotion, snapSmall } from './dom';
import { fmt, fmtPrice, money, pct, num, clamp, lower, unitOne } from './fmt';
import { sound } from './sound';
import { tradeText } from './trade';
import { orderBookPart, hasOrderBook, fedLine } from './orderbook';
import { chartPart, type ChartPart } from './chart';

/** "1 h 04 min", "52 min" (hours given as a fraction of an hour). */
export function hm(hours: number): string {
  const m = Math.max(0, Math.round(num(hours) * 60));
  const hh = Math.floor(m / 60), mm = m % 60;
  return hh ? `${hh} h ${String(mm).padStart(2, '0')} min` : `${mm} min`;
}

// M4: 'feeds' (Iron's order book) and 'stock' (Fishing's chart).
type Kind = 'seams' | 'load' | 'travel' | 'free' | 'upkeep' | 'feeds' | 'stock';
const kindOf = (e: SectorDerived | undefined): Kind | null =>
  !e ? null : e.stock ? 'stock' : hasOrderBook(e) ? 'feeds' : e.seams ? 'seams' : e.load ? 'load' : e.travel ? 'travel' : e.free ? 'free' : e.upkeep ? 'upkeep' : null;

interface Part { el: HTMLElement; update(e: SectorDerived): void }

export function buildMechanics(ctx: Ctx): Comp & { drain(): void } {
  const title = h('h2', { class: 'sec-t' });
  const tag = h('span', { class: 'mech-tag' });
  const lead = h('p', { class: 'mech-lead' });
  const see = h('button', { class: 'place-link mech-see', type: 'button', onclick: () => ctx.showPlace(null) }, 'in the picture ↑');
  const body = h('div', { class: 'mech-body' });
  // M3 finish: under a drawn line, one sentence on what the mechanic is doing to it now (figures from the views)
  const line = h('p', { class: 'mech-line', hidden: true });
  // M4: on an Industry fed by the order book (SectorDerived.fed), one line from its side.
  const fed = h('p', { class: 'mech-fed', hidden: true });
  const el = h('section', { class: 'mech', 'aria-label': 'This Industry’s mechanic', hidden: true },
    h('header', { class: 'sec-h' }, title, tag), lead, body, line, fed, see);
  let key = '';
  let part: Part | null = null;
  let chart: ChartPart | null = null;

  function update(): void {
    const e = sd(ctx), def = sectorDef(ctx);
    const k = kindOf(e);
    const fl = k !== 'feeds' ? fedLine(ctx) : '';
    show(fed, !!fl);
    if (fl) setText(fed, fl);
    // A settled Industry's instrument folds away with the rest of it (fold.ts); its picture still shows it.
    show(el, !!k && !!def);
    show(body, !!k);
    if (!k || !e || !def) { key = ''; return; }
    const kk = `${def.id}:${k}`;
    if (kk !== key) {
      key = kk;
      // The heading and the one plain sentence come from content (SectorDef.mechanic); the instrument follows.
      setText(title, def.mechanic?.name ?? '');
      setText(tag, def.mechanic?.rebound ?? '');
      show(tag, !!def.mechanic?.rebound);
      setText(lead, def.mechanic?.blurb ?? '');
      show(lead, !!def.mechanic?.blurb);
      chart = k === 'stock' ? chartPart(ctx) : null;
      part = chart ?? (k === 'feeds' ? orderBookPart(ctx) : k === 'seams' ? seamsPart(ctx) : k === 'load' ? loadPart(ctx) : k === 'travel' ? travelPart(ctx) : k === 'free' ? freePart(ctx) : upkeepPart(ctx));
      body.replaceChildren(part.el);
      el.setAttribute('data-kind', k);
    }
    part?.update(e);
    const t = e.budgetR != null ? lineFor(k, e, def) : '';
    show(line, !!t);
    if (t) setText(line, t);
  }
  return { el, update, drain: () => chart?.drain() } as Comp & { drain(): void };
}

/** M3 finish: the mechanic's effect on the player's line, in one sentence; '' when there is nothing to say. */
function lineFor(k: Kind, e: SectorDerived, def: NonNullable<ReturnType<typeof sectorDef>>): string {
  const res = lower(def.resource.name), svc = lower(def.service.name);
  if (k === 'feeds' || k === 'stock') return '';
  if (k === 'seams' && e.seams) {
    const v = e.seams;
    return v.sunk === 0 ? `Under the line: no seam sunk; when the old workings give out, so does the run.`
      : `Under the line: the deeper ${res} sells at ×${num(v.priceMul, 1).toFixed(2)}, which the line welcomes; the extra tons are what tempt the next engine.`;
  }
  if (k === 'load' && e.load && def.load) {
    const dflt = def.load.defaultProfile;
    let night = 0;
    for (const a of def.applications) if (e.apps?.[a.id]?.founded && (a.profile ?? dflt) !== dflt) night += num(e.apps[a.id].demand);
    const share = num(e.demand) > 0 ? night / num(e.demand) : 0;
    return share > 0.005 ? `Under the line: night uses carry ${pct(share, false)} of the ${svc}; each fills idle plant, cheapens the next unit, and adds to what the cap must hold back.`
      : `Under the line: no night uses yet; the idle plant keeps every unit dear, which suits the line.`;
  }
  if (k === 'travel' && e.travel) {
    const sh = num(e.travel.sprawlShare);
    return sh > 0.005 ? `Under the line: ${pct(sh, false)} of the miles are sprawl, which no quota squeezes out; the line has to be held above them.`
      : `Under the line: no sprawl yet; every mile is still one a quota can reach.`;
  }
  if (k === 'free' && e.free) {
    const sh = num(e.free.freeShare);
    return sh > 0.005 ? `Under the line: ${pct(sh, false)} of the use sees no price, so no duty or thriftier chip moves it; only the cap and sufficiency reach it.` : '';
  }
  if (k === 'upkeep' && e.upkeep) return `Under the line: ${pct(num(e.upkeep.share), false)} of attention goes on keeping the code alive; only deletion shrinks the stock.`;
  return '';
}

/* ------------------------------------------------------------------ */
/* Steam: the seam ladder                                              */
/* ------------------------------------------------------------------ */

function seamsPart(ctx: Ctx): Part {
  const def = sectorDef(ctx);
  const res = lower(def?.resource.name ?? 'coal');
  const unitR = def?.resource.unit ?? 'tons';
  const ladder = h('ol', { class: 'seam-ladder', 'aria-label': 'The seams, from the surface down' });
  const shaft = h('span', { class: 'seam-shaft', 'aria-hidden': 'true' });
  const cut = h('div', { class: 'seam-cut' }, h('span', { class: 'seam-ground', 'aria-hidden': 'true' }), shaft, ladder);
  // The next seam: what it adds and costs, whether pumping reaches it, and the one button.
  const nName = h('b');
  const nFacts = h('span', { class: 'num' });
  const nReach = h('p', { class: 'seam-reach num' });
  const cost = h('span', { class: 'btn-c num' });
  const fill = h('span', { class: 'btn-fill fillx', 'aria-hidden': 'true' });
  const sink = h('button', { class: 'btn seam-sink', type: 'button', onclick: () => {
    if (!ctx.act('sinkSeam', (m, s, c) => m.sinkSeam(s, c, ctx.sector))) {
      sound('cannotAfford', { sector: ctx.sector });
      if (!reducedMotion()) { sink.classList.remove('nope'); void sink.offsetWidth; sink.classList.add('nope'); }
    }
  } }, fill, h('span', { class: 'btn-l', text: 'Sink it' }), cost);
  const nTrade = h('p', { class: 'up-trade', hidden: true });
  const next = h('div', { class: 'seam-next' }, h('p', null, 'Next: ', nName, ' ', nFacts), nReach, nTrade, sink);
  const mul = h('p', { class: 'seam-mul num muted' });
  const done = h('p', { class: 'seam-done muted' });
  const el = h('div', { class: 'seams' }, cut, next, done, mul);
  const rows = new Map<string, { li: HTMLElement; st: HTMLElement }>();
  let rowKey = '';

  return {
    el,
    update(e) {
      const v = e.seams!;
      const k = v.ladder.map((r) => r.def.id).join(',');
      if (k !== rowKey) {
        rowKey = k;
        // The old workings first (always sunk), then the ladder, deepest last.
        const items: HTMLElement[] = [h('li', { class: 'seam sunk old' }, h('span', { class: 'seam-band', 'aria-hidden': 'true' }),
          h('span', { class: 'seam-n', text: 'The old workings' }), h('span', { class: 'seam-d muted', text: 'worked' }))];
        for (const r of v.ladder) {
          let row = rows.get(r.def.id);
          if (!row) {
            const st = h('span', { class: 'seam-st' });
            const li = h('li', { class: 'seam', title: r.def.blurb ?? '' }, h('span', { class: 'seam-band', 'aria-hidden': 'true' }),
              h('span', { class: 'seam-n', text: r.def.name }), h('span', { class: 'seam-d muted num', text: r.def.depth || '' }), st);
            row = { li, st }; rows.set(r.def.id, row);
          }
          items.push(row.li);
        }
        syncChildren(ladder, items);
      }
      for (const r of v.ladder) {
        const row = rows.get(r.def.id); if (!row) continue;
        cls(row.li, 'sunk', r.sunk); cls(row.li, 'reach', !r.sunk && r.reachable); cls(row.li, 'next', !r.sunk && v.ladder.indexOf(r) === v.sunk);
        cls(row.li, 'locked', !r.sunk && !r.reachable);
        setText(row.st, r.sunk ? 'sunk' : r.forbidden ? 'forbidden' : r.reachable ? 'within reach' : '');
      }
      // The shaft runs down to the deepest seam sunk (the old workings count as row 0).
      setStyle(shaft, '--n', String(v.sunk + 1));
      const n = v.ladder[v.sunk];
      show(next, !!n); show(done, !n);
      setText(done, `Every seam is sunk. Below the last there is nothing anyone would pay to raise.`);
      if (n) {
        setText(nName, n.def.name);
        setText(nFacts, `· +${fmt(n.def.tons)} ${unitR} · ${res} ×${n.def.priceMul.toFixed(2)} dearer`);
        const rb = n.def.reachBelow;
        const ps = num(e.servicePrice);
        const unitS = unitOne(def?.service);
        setText(nReach, n.forbidden ? 'Forbidden for this run.' : rb == null || !Number.isFinite(rb) ? 'Within reach of today’s pumps.'
          : n.reachable ? `Within reach: pumping is cheap enough (power under £${fmtPrice(rb)} per ${unitS}; now £${fmtPrice(ps)}).`
            : `Out of reach until power sells under £${fmtPrice(rb)} per ${unitS} (now £${fmtPrice(ps)}). Thriftier engines will get there.`);
        cls(nReach, 'warn', !n.reachable);
        const wc = v.wantedChange;
        show(nTrade, wc != null && Number.isFinite(wc));
        if (wc != null && Number.isFinite(wc)) setText(nTrade, tradeText(res, wc, 'sink'));
        setText(cost, money(n.cost));
        setAttr(sink, 'aria-disabled', n.canSink ? null : 'true');
        setFill(fill, n.canSink ? 0 : num(ctx.state.capital) / Math.max(1e-9, n.cost), 100);
        show(sink, !n.forbidden);
      }
      setText(mul, v.priceMul > 1.0001 ? `Deeper ${res} is dearer to raise: the whole reserve sells at ×${v.priceMul.toFixed(2)} the price of the first.` : `${fmt(v.sunk)} of ${fmt(v.total)} seams sunk.`);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Light: the load curve                                               */
/* ------------------------------------------------------------------ */

function loadPart(ctx: Ctx): Part {
  const W = 240, H = 64, BW = W / 24;
  const chart = sv('svg', { class: 'load-chart', viewBox: `0 0 ${W} ${H + 12}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  const bars: SVGRectElement[] = [];
  for (let i = 0; i < 24; i++) {
    const r = sv('rect', { class: 'lb', x: (i * BW + 0.8).toFixed(1), y: String(H), width: (BW - 1.6).toFixed(1), height: '0' });
    bars.push(r); chart.append(r);
  }
  const peakLine = sv('line', { class: 'lp-peak', x1: '0', x2: String(W), y1: '1', y2: '1' });
  const meanLine = sv('line', { class: 'lp-mean', x1: '0', x2: String(W), y1: String(H), y2: String(H) });
  chart.append(peakLine, meanLine);
  for (const [hr, lbl] of [[0, 'midnight'], [6, '6 a.m.'], [12, 'noon'], [18, '6 p.m.']] as [number, string][]) {
    const t = sv('text', { class: 'lx', x: (hr * BW + 1).toFixed(1), y: String(H + 10) }); t.textContent = lbl; chart.append(t);
  }
  const idle = h('span', { class: 'load-idle' });
  const chartWrap = h('div', { class: 'load-wrap' }, chart, idle);
  const lf = h('b', { class: 'num' });
  const lfTxt = h('span');
  const mark = h('p', { class: 'load-mark num' });
  const el = h('div', { class: 'load' }, h('p', { class: 'load-lf' }, 'Load factor ', lf, lfTxt), chartWrap,
    h('p', { class: 'load-key muted' }, h('span', { class: 'k-peak', text: 'the peak the works are built for' }), h('span', { class: 'k-mean', text: 'the average hour' })), mark);
  let last = '';
  return {
    el,
    update(e) {
      const v = e.load!;
      const peak = Math.max(1e-12, num(v.peak));
      const hs = Array.isArray(v.hours) ? v.hours : [];
      // Quantised to 1/64 of the chart so a creeping load does not restyle 24 bars every tick.
      const q = hs.map((x) => Math.round(clamp(num(x) / peak, 0, 1) * 64)).join(',');
      if (q !== last) {
        last = q;
        hs.slice(0, 24).forEach((x, i) => {
          const f = clamp(num(x) / peak, 0, 1);
          const hh = (f * (H - 2)).toFixed(1);
          setAttr(bars[i], 'y', (H - Number(hh)).toFixed(1));
          setAttr(bars[i], 'height', hh);
          setAttr(bars[i], 'class', f > 0.97 ? 'lb pk' : 'lb');
        });
        const my = (H - clamp(num(v.factor), 0, 1) * (H - 2)).toFixed(1);
        setAttr(meanLine, 'y1', my); setAttr(meanLine, 'y2', my);
        setStyle(idle, '--top', ((1 - clamp(num(v.factor), 0, 1)) * 100).toFixed(1) + '%');
      }
      const f = clamp(num(v.factor), 0, 1);
      setText(lf, pct(f, false));
      setText(lfTxt, `: the works stand idle ${pct(1 - f, false)} of the day.`);
      const def = sectorDef(ctx);
      const unitS = unitOne(def?.service);
      const up = num(v.capCostEff) - num(v.capCostBase);
      setText(mark, up > 1e-9 ? `Idle plant adds £${fmtPrice(up)} to every ${unitS} sold (running cost £${fmtPrice(v.capCostBase)} → £${fmtPrice(v.capCostEff)}). Fill the hollows and every unit gets cheaper.` : 'The works run flat out all day: no idle plant to pay for.');
    },
  };
}

/* ------------------------------------------------------------------ */
/* Motion: the travel-time dial                                        */
/* ------------------------------------------------------------------ */

function travelPart(ctx: Ctx): Part {
  // A clock-face dial, 0 to 3 hours a day at the wheel; the needle barely moves while the miles grow.
  const CX = 60, CY = 58, R = 46, MAXH = 3;
  const pt = (t: number, r = R): string => { const a = Math.PI * (1 - t); return `${(CX + r * Math.cos(a)).toFixed(1)} ${(CY - r * Math.sin(a)).toFixed(1)}`; };
  let ticks = '';
  for (let i = 0; i <= MAXH * 4; i++) {
    const t = i / (MAXH * 4), major = i % 4 === 0;
    ticks += `<line class="tk${major ? ' tk-major' : ''}" x1="${pt(t, R - 1).split(' ')[0]}" y1="${pt(t, R - 1).split(' ')[1]}" x2="${pt(t, R - (major ? 9 : 5)).split(' ')[0]}" y2="${pt(t, R - (major ? 9 : 5)).split(' ')[1]}"/>`;
    if (major) { const [x, y] = pt(t, R - 17).split(' '); ticks += `<text class="tk-l" x="${x}" y="${Number(y) + 3}" text-anchor="middle">${i / 4} h</text>`; }
  }
  const dial = svg(`<svg class="dial-svg tr-dial" viewBox="0 0 120 66" aria-hidden="true">
    <path class="d-track" d="M${pt(0)}A${R} ${R} 0 0 1 ${pt(1)}"/><g class="d-ticks">${ticks}</g>
    <g class="d-was"><line x1="${CX}" y1="${CY - R + 2}" x2="${CX}" y2="${CY - R + 12}"/></g>
    <g class="d-needle"><line x1="${CX}" y1="${CY + 4}" x2="${CX}" y2="${CY - R + 4}"/></g><circle class="d-hub" cx="${CX}" cy="${CY}" r="3.4"/></svg>`);
  const hv = h('div', { class: 'tr-val num' });
  const hsub = h('div', { class: 'tr-sub', text: 'a day at the wheel, per head' });
  const speedFill = h('span', { class: 'fillx' });
  const speedTxt = h('span', { class: 'num' });
  const sprawlFill = h('span', { class: 'fillx' });
  const sprawlTxt = h('span', { class: 'num' });
  const miles = h('p', { class: 'tr-miles num muted' });
  const el = h('div', { class: 'travel' },
    h('div', { class: 'tr-left' }, dial, hv, hsub),
    h('div', { class: 'tr-right' },
      h('div', { class: 'tr-row' }, h('span', { class: 'tr-k', text: 'Speed' }), speedTxt, h('span', { class: 'tr-bar' }, speedFill)),
      h('div', { class: 'tr-row' }, h('span', { class: 'tr-k', text: 'Sprawl' }), sprawlTxt, h('span', { class: 'tr-bar sprawl' }, sprawlFill)),
      miles));
  // Where the needle stood when first seen this session: a faint mark, so its stillness can be seen.
  let first: number | null = null, sector = '';
  const rot = (sel: string, t: number) => { const n = dial.querySelector(sel) as SVGElement; snapSmall(n, clamp(t, 0, 1)); setStyle(n, 'transform', `rotate(${(Math.round((clamp(t, 0, 1) - 0.5) * 360) / 2).toFixed(1)}deg)`); };
  return {
    el,
    update(e) {
      const v = e.travel!;
      const def = sectorDef(ctx);
      if (sector !== ctx.sector) { sector = ctx.sector; first = null; }
      const t = clamp(num(v.hoursPerHead) / MAXH, 0, 1);
      if (first == null) { first = t; rot('.d-was', t); }
      rot('.d-needle', t);
      setText(hv, hm(v.hoursPerHead));
      const sp = num(v.freeSpeed) > 0 ? num(v.speed) / num(v.freeSpeed) : num(v.speed);
      setFill(speedFill, sp, 100);
      setText(speedTxt, sp > 0.97 ? 'free-flowing' : `${pct(sp, false)} of free flow`);
      cls(speedFill.parentElement, 'jam', sp < 0.6);
      setFill(sprawlFill, num(v.sprawlShare), 100);
      setText(sprawlTxt, `${pct(num(v.sprawlShare), false)} of travel locked in`);
      const unit = def?.service.unit ?? '';
      setText(miles, `${fmt(num(e.demand))} ${unit}/s on the roads; ${fmt(num(v.sprawl))} ${unit}/s would stay if the traffic thinned.`);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Compute: the "free" price tag                                       */
/* ------------------------------------------------------------------ */

function freePart(ctx: Ctx): Part {
  const list = h('ul', { class: 'free-list' });
  const bill = h('p', { class: 'free-bill num' });
  const el = h('div', { class: 'free' }, list, bill);
  const rows = new Map<string, { li: HTMLElement; tag: HTMLElement; real: HTMLElement }>();
  let key = '';
  return {
    el,
    update(e) {
      const def = sectorDef(ctx);
      const unitS = unitOne(def?.service);
      const ps = num(e.servicePrice);
      const apps = (def?.applications ?? []).filter((a) => e.apps?.[a.id]?.founded && num(e.apps[a.id].priceSeen, ps) < ps - 1e-12);
      const k = apps.map((a) => a.id).join(',');
      if (k !== key) {
        key = k;
        syncChildren(list, apps.map((a) => {
          let r = rows.get(a.id);
          if (!r) {
            const tag = h('span', { class: 'ptag num' });
            const real = h('span', { class: 'free-real num muted' });
            const li = h('li', null, h('button', { class: 'place-link free-app', type: 'button', title: `Show ${a.name} in the picture`, onclick: () => ctx.showPlace(a.id) }, a.name), tag, real);
            r = { li, tag, real }; rows.set(a.id, r);
          }
          return r.li;
        }));
      }
      for (const a of apps) {
        const r = rows.get(a.id); if (!r) continue;
        const seen = num(e.apps[a.id].priceSeen);
        setText(r.tag, seen <= 1e-9 ? 'FREE' : `£${fmtPrice(seen)} flat`);
        cls(r.tag, 'flat', seen > 1e-9);
        setText(r.real, `costs £${fmtPrice(ps)} per ${unitS}`);
      }
      const f = e.free!;
      setText(bill, `The bill: ${money(num(f.bill))}/s, paid elsewhere. ${pct(num(f.freeShare), false)} of the use never sees a price, so no saving can make it cheaper.`);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Code: the code stock                                                */
/* ------------------------------------------------------------------ */

function upkeepPart(ctx: Ctx): Part {
  const fill = h('span', { class: 'fillx' });
  const big = h('b', { class: 'num' });
  const flows = h('p', { class: 'up-flows num muted' });
  const el = h('div', { class: 'upkeep' }, h('p', { class: 'up-big' }, big, ' of attention keeps the code alive'), h('div', { class: 'up-bar' }, fill), flows);
  return {
    el,
    update(e) {
      const u = e.upkeep!;
      const def = sectorDef(ctx);
      setText(big, pct(num(u.share), false));
      setFill(fill, num(u.share), 100);
      cls(el, 'heavy', num(u.share) > 0.5);
      const pName = lower(def?.pressure.name ?? 'code');
      setText(flows, num(u.deletionOut) > 0 ? `Deleted ${fmt(u.deletionOut)}/s against ${fmt(u.pressureIn)}/s shipped into the ${pName}.` : `${fmt(u.pressureIn)}/s shipped into the ${pName}; nothing deleted. Only deletion shrinks it.`);
    },
  };
}
