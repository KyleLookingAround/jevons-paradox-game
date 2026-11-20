// M5: Plenty's widget. Two honest gauges side by side, Water applied and Water consumed, with the return share between
// them (SectorDerived.water), and each founded use's regime (AppDerived.regime: elastic, Jevons; saturated, Borlaug).
// Display only; the arrows compare with the figures a few seconds ago, kept here.
import type { Ctx, Comp } from './ctx';
import { sd, sectorDef } from './ctx';
import { h, setText, show, cls } from './dom';
import { fmt, pct, num } from './fmt';
import { MINISTRY_TEXT as MT } from '../content/officeText';

const REGIME: Record<string, string> = { elastic: MT.regimeElastic, saturated: MT.regimeSaturated };

export function buildWater(ctx: Ctx): Comp {
  const ap = h('b', { class: 'num wg-v' }), apA = h('span', { class: 'wg-a' });
  const co = h('b', { class: 'num wg-v' }), coA = h('span', { class: 'wg-a' });
  const ret = h('span', { class: 'num wg-r' });
  const unit = h('span', { class: 'wg-u' }), unit2 = h('span', { class: 'wg-u' });
  const regimes = h('ul', { class: 'wg-reg' });
  const el = h('section', { class: 'water', 'aria-label': 'Water', hidden: true },
    h('div', { class: 'wg-row' },
      h('div', { class: 'wg wg-ap' }, h('span', { class: 'wg-k', text: MT.waterApplied }), ap, unit, apA),
      h('div', { class: 'wg-mid', 'aria-hidden': 'true' }, '⇄'),
      h('div', { class: 'wg wg-co' }, h('span', { class: 'wg-k', text: MT.waterConsumed }), co, unit2, coA)),
    h('p', { class: 'wg-ret' }, ret), regimes);
  let was: { t: number; a: number; c: number } | null = null, trend = { a: 0, c: 0 };
  let regKey = '';
  function update(): void {
    const e = sd(ctx), w = e?.water;
    show(el, !!w);
    if (!w || !e) return;
    const u = `${sectorDef(ctx)?.resource.unit ?? ''}/s`;
    setText(unit, u); setText(unit2, u);
    setText(ap, fmt(w.applied)); setText(co, fmt(w.consumed));
    setText(ret, MT.returnShare.replace('{pct}', String(Math.round(w.returnShare * 100))));
    const t = num(ctx.state.time);
    if (!was || t < was.t) was = { t, a: w.applied, c: w.consumed };
    else if (t - was.t >= 5) { trend = { a: Math.sign(Math.round((w.applied / Math.max(1e-9, was.a) - 1) * 200)), c: Math.sign(Math.round((w.consumed / Math.max(1e-9, was.c) - 1) * 200)) }; was = { t, a: w.applied, c: w.consumed }; }
    const ar = (x: number) => (x > 0 ? '↑' : x < 0 ? '↓' : '');
    setText(apA, ar(trend.a)); setText(coA, ar(trend.c));
    cls(el, 'apart', trend.a < 0 && trend.c > 0);
    const apps = sectorDef(ctx)?.applications ?? [];
    const rows = apps.filter((a) => e.apps?.[a.id]?.founded && e.apps[a.id].regime).map((a) => [a.name, e.apps[a.id].regime!] as const);
    const k = rows.map((r) => r.join(':')).join(',');
    if (k !== regKey) { regKey = k; regimes.replaceChildren(...rows.map(([n, r]) => h('li', null, h('b', { text: `${n}: ` }), REGIME[r] ?? r))); }
    show(regimes, rows.length > 0);
  }
  return { el, update };
}
