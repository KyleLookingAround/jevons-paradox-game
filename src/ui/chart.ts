// M4: Fishing's chart card (SectorDerived.stock): two gauges side by side, "Catch per trip" (the fleet's figure, always)
// and "The stock, surveyed" (only while surveyed: otherwise a blank gauge lettered "No survey", or "No survey since
// {year}" once a survey has lapsed), and under them regrowth now, the foreign share, and while scarred the scar line.
// The page never reads stock.world (the scene's only) and never the true stock while unsurveyed. The words are the
// content's (boardSurvey.ts); every figure is read from the view. Built once; patched in place.
import type { Ctx } from './ctx';
import { sectorDef } from './ctx';
import type { SectorDerived } from '../types';
import { YEARS_PER_SECOND } from '../types';
import { h, setText, setAttr, show, cls, setFill, replay } from './dom';
import { fmt, pct, num, clamp } from './fmt';
import { fishingGaugeText, scarForeshadow } from '../content/boardSurvey';

export interface ChartPart { el: HTMLElement; update(e: SectorDerived): void; /** The survey has just been filed: the true gauge drains in once. */ drain(): void }

function gauge(label: string): { el: HTMLElement; v: HTMLElement; fill: HTMLElement; blank: HTMLElement } {
  const v = h('span', { class: 'cg-v num' });
  const fill = h('span', { class: 'cg-fill fillx' });
  const blank = h('span', { class: 'cg-blank', hidden: true });
  const el = h('div', { class: 'cg', role: 'group', 'aria-label': label },
    h('span', { class: 'cg-l', text: label }), v, h('span', { class: 'cg-bar', 'aria-hidden': 'true' }, fill), blank);
  return { el, v, fill, blank };
}

export function chartPart(ctx: Ctx): ChartPart {
  const rep = gauge(fishingGaugeText.reported);
  const tru = gauge(fishingGaugeText.surveyed);
  cls(tru.el, 'cg-true', true);
  const note = h('p', { class: 'cg-note muted', text: fishingGaugeText.reportedNote });
  const regen = h('span', { class: 'ch-regen num' });
  const foreign = h('span', { class: 'ch-foreign num' });
  const facts = h('p', { class: 'ch-facts' }, regen, foreign);
  const scar = h('p', { class: 'ch-scar', hidden: true });
  const fore = h('p', { class: 'ch-fore muted', hidden: true, text: scarForeshadow });
  const el = h('div', { class: 'chart-card' }, h('div', { class: 'cg-pair' }, rep.el, tru.el), note, facts, scar, fore);

  return {
    el,
    drain() { replay(tru.el, 'cg-drain', 2600); },
    update(e) {
      const st = e.stock;
      if (!st) return;
      const def = sectorDef(ctx);
      const r = clamp(num(st.reported), 0, 1);
      setText(rep.v, pct(r, false));
      setFill(rep.fill, r);
      const surveyed = st.surveyed && st.true != null;
      show(tru.v, surveyed);
      show(tru.fill.parentElement, surveyed);
      show(tru.blank, !surveyed);
      cls(tru.el, 'blank', !surveyed);
      if (surveyed) {
        const t = clamp(num(st.true), 0, 1);
        setText(tru.v, pct(t, false));
        setFill(tru.fill, t);
        cls(tru.el, 'low', t < 0.3);
      } else {
        // Seen once and taken away: "No survey since {year}" (SectorState.lastSurvey).
        const last = ctx.state.sectors?.[ctx.sector]?.lastSurvey;
        setText(tru.blank, last && Number.isFinite(last.year) ? fishingGaugeText.lapsed.replace('{year}', String(Math.floor(last.year))) : fishingGaugeText.unsurveyed);
      }
      setAttr(tru.el, 'aria-label', surveyed ? `${fishingGaugeText.surveyed}: ${pct(num(st.true), false)}` : `${fishingGaugeText.surveyed}: ${tru.blank.textContent}`);
      setAttr(rep.el, 'aria-label', `${fishingGaugeText.reported}: ${pct(r, false)}. ${fishingGaugeText.reportedNote}`);
      show(note, !surveyed);
      const unit = def?.resource.unit ?? '';
      // Regrowth (only the survey knows it), as a year's worth, and the foreign share (the sails are visible).
      setText(regen, st.regen != null && Number.isFinite(st.regen) ? `Regrowth ${fmt(Math.max(0, st.regen) / YEARS_PER_SECOND)} ${unit} a year` : '');
      show(regen, !!regen.textContent);
      const fs = st.foreign?.share;
      setText(foreign, fs != null && Number.isFinite(fs) && fs > 0.0005 ? `Foreign fleets take ${pct(fs, false)} of the catch` : '');
      show(foreign, !!foreign.textContent);
      show(facts, !!(regen.textContent || foreign.textContent));
      const scarred = !!st.scar;
      show(scar, scarred);
      if (scarred) setText(scar, `${fishingGaugeText.scarLine}${st.scar && Number.isFinite(st.scar.yearsLeft) ? ` (${fmt(Math.ceil(st.scar.yearsLeft))} years)` : ''}`);
      // After a Reckoning, still scarred (the scar was not made in this run): the one line that looks ahead.
      show(fore, scarred && !st.crossed && num(ctx.state.meta?.reckonings) > 0);
    },
  };
}
