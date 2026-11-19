// The unfolding on the page: when a feature arrives (a 'featureUnlocked' event; the model decides when, the page only
// reads Derived.features), the panel or control it opens wears a small "New" mark, in the look's idiom, until the player
// has had it on screen for a moment. Never a modal; the broadsheet carries the one-line introduction, and a toast offers
// to show the place. Marks not yet seen survive a reload (prefs.newMarks).
import type { FeatureId } from '../types';
import type { Ctx } from './ctx';
import { h } from './dom';
import { getPrefs, setPrefs } from './prefs';

/** Where each feature lives on the page (the element that carries its mark). Display only. */
const TARGET: Record<FeatureId, string> = {
  reboundMeter: '.dial-reb .dial-head',
  levers: 'section.levers > .sec-h',
  population: '.popg .res-row',
  market: 'section.orders > .sec-h',
  moreLevers: 'section.levers > .sec-h',
  charters: '.charters > h3',
  budget: 'section.budget > .sec-h',
  leverRepeat: 'section.levers > .sec-h',
  dividendChoice: 'section.divs',
  budgetPace: 'section.budget > .sec-h',
  clearSkies: '.sky-box',
  steadyState: '.ss',
  commons: 'section.commons > .sec-h',
  settlement: 'section.budget > .sec-h',
};
/** Seconds a mark must have been on screen before it clears. */
const LOOKED = 1500;

export interface NewMarks {
  /** A feature arrived in play: mark its place. */
  add(id: FeatureId): void;
  /** Where a feature lives, for "Show" (null if it is not on the page now). */
  place(id: FeatureId): HTMLElement | null;
  /** Called each frame: attach marks to places that have appeared (cheap when nothing is pending). */
  update(): void;
}

export function createNewMarks(ctx: Ctx): NewMarks {
  const marks = new Map<FeatureId, { el: HTMLElement; host: HTMLElement | null; timer: number }>();
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
    for (const en of entries) {
      for (const [id, m] of marks) {
        if (m.el !== en.target) continue;
        clearTimeout(m.timer);
        if (en.isIntersecting) m.timer = window.setTimeout(() => clear(id), LOOKED);
      }
    }
  }, { threshold: 1 }) : null;

  function clear(id: FeatureId): void {
    const m = marks.get(id);
    if (m) { io?.unobserve(m.el); m.el.remove(); clearTimeout(m.timer); marks.delete(id); }
    const left = getPrefs().newMarks.filter((x) => x !== id);
    if (left.length !== getPrefs().newMarks.length) setPrefs({ newMarks: left });
  }
  const place = (id: FeatureId): HTMLElement | null => {
    const el = document.querySelector<HTMLElement>(TARGET[id]);
    return el && el.getClientRects().length && !el.closest('[hidden]') ? el : null;
  };
  function attach(id: FeatureId): void {
    let m = marks.get(id);
    if (!m) {
      const name = ctx.content.features?.[id]?.name;
      const el = h('span', { class: 'new-mark', title: name ? `New: ${name}` : 'New', text: 'New' });
      el.addEventListener('click', () => clear(id));
      m = { el, host: null, timer: 0 };
      marks.set(id, m);
    }
    const host = place(id);
    if (host && m.host !== host) {
      // Several features can share a place (the levers' header): one mark there is enough.
      for (const [k, o] of marks) if (k !== id && o.host === host) { clear(id); return; }
      host.append(m.el);
      m.host = host;
      io?.observe(m.el);
      if (!io) m.timer = window.setTimeout(() => clear(id), 8000);
    }
  }
  return {
    add(id) {
      const p = getPrefs().newMarks;
      if (!p.includes(id)) setPrefs({ newMarks: [...p, id].slice(-16) });
      attach(id);
    },
    place,
    update() {
      const p = getPrefs().newMarks;
      if (!p.length) return;
      for (const id of p as FeatureId[]) {
        if (!(id in TARGET) || !ctx.d?.features?.[id]) continue;
        const m = marks.get(id);
        if (!m || !m.host || !m.host.isConnected) attach(id);
      }
    },
  };
}
