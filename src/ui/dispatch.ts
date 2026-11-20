// M3: letters (Derived.dispatch) and the timed consequences in force (Derived.modifiers). A letter arrives on the note
// line and waits here, in its own place in the feed: never over the page, never modal, never a nagging badge. It says
// how long it will wait and what happens if it is left (its default answer). Each answer is a clearly priced choice;
// one the purse cannot meet says why. What was chosen is remembered in the paper (the core prints the reply) and in a
// folded list of this run's letters. The letter is built when it arrives; only its countdown and prices are patched.
import type { Ctx, Comp } from './ctx';
import { sectorDef } from './ctx';
import type { GameEvent, PendingDispatchView } from '../types';
import { YEARS_PER_SECOND } from '../types';
import { h, setText, setAttr, show, cls, syncChildren, reducedMotion } from './dom';
import { fmt, money, num } from './fmt';
import { effectText } from './panels';
import { foldSection } from './sheets';
import { sound } from './sound';

/** "3 min", "40 s": a quiet countdown in play time. */
export function left(sec: number): string {
  const s = Math.max(0, Math.round(num(sec)));
  return s >= 90 ? `${Math.round(s / 60)} min` : `${s} s`;
}

export interface LettersComp extends Comp {
  onEvents(ev: GameEvent[]): void;
  /** Scroll to the waiting letter (from the note line). */
  showLetter(): void;
}

interface Letter { id: string; el: HTMLElement; update(v: PendingDispatchView): void }

function makeLetter(ctx: Ctx, v0: PendingDispatchView): Letter {
  const cast = v0.cast;
  const def = v0.def;
  const sector = def.sector ? sectorDef(ctx, def.sector) : undefined;
  // The seal: the writer's initial, in the look's idiom (CSS). The figure itself stands in the picture.
  const initial = (cast?.name ?? '?').replace(/^(Mr|Mrs|Miss|Ms|Dr|The|Our)\s+/, '').charAt(0).toUpperCase();
  const lapse = h('span', { class: 'lt-lapse num' });
  const body = h('div', { class: 'lt-body' }, ...v0.body.split(/\n+/).map((p) => h('p', { text: p })));
  const more = h('button', { class: 'linkish lt-more', type: 'button', 'aria-expanded': 'false', onclick: () => {
    const open = !el.classList.contains('open');
    if (open) sound('letterOpened', { sector: def.sector });
    cls(el, 'open', open); setAttr(more, 'aria-expanded', String(open)); setText(more, open ? 'Fold the letter' : 'Read the whole letter');
  } }, 'Read the whole letter');
  const arms = v0.arms.map((a, i) => {
    const costEl = h('span', { class: 'lt-cost num' });
    const why = h('span', { class: 'lt-why' });
    const fx = [...a.effects.map((e) => effectText(ctx, e)), ...(a.modifier ? [`for ${fmt(a.modifier.years)} years: ${a.modifier.effects.map((e) => effectText(ctx, e)).filter(Boolean).join(', ')}`] : [])].filter(Boolean).join(' · ');
    const b = h('button', { class: 'lt-arm', type: 'button', onclick: () => {
      if (b.getAttribute('aria-disabled') === 'true') { sound('cannotAfford'); if (!reducedMotion()) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); } return; }
      ctx.act('answerDispatch', (m, s, c) => m.answerDispatch(s, c, i, v0.id));
    } },
    h('span', { class: 'lt-label', text: a.label }),
    i === v0.defaultArm ? h('span', { class: 'lt-default', text: 'if left' }) : null,
    h('span', { class: 'lt-outcome', text: a.outcome }),
    h('span', { class: 'lt-price' }, h('span', { class: 'lt-pk', text: 'Price: ' }), a.price, costEl),
    fx ? h('span', { class: 'lt-fx num', text: fx }) : null,
    why);
    // M4: a wager arm (PendingDispatchView arms[].wager): the hint under the label, both outcomes, and a small mark.
    // The view never says which way it would go, and neither does the page.
    const w = a.wager;
    if (w) {
      cls(b, 'lt-wager', true);
      b.querySelector('.lt-label')?.after(
        h('span', { class: 'lt-bet', text: 'A bet on the state of things' }),
        h('span', { class: 'lt-hint', text: w.hint }),
        h('span', { class: 'lt-branches' },
          h('span', { class: 'lt-br win' }, h('span', { class: 'lt-bk', text: 'If so: ' }), w.win),
          h('span', { class: 'lt-br lose' }, h('span', { class: 'lt-bk', text: 'If not: ' }), w.lose)));
    }
    return { b, costEl, why };
  });
  const from = h('p', { class: 'lt-from' },
    h('span', { class: 'lt-seal', 'aria-hidden': 'true', text: initial }),
    h('span', { class: 'lt-who' }, h('b', { text: cast?.name ?? 'A correspondent' }), cast?.role ? h('span', { class: 'lt-role', text: cast.role }) : null));
  const el = h('article', { class: 'letter', 'data-letter': v0.id },
    h('div', { class: 'lt-top' }, h('span', { class: 'lt-k', text: sector ? `A letter about ${sector.name}` : 'A letter' }), lapse),
    from,
    h('h3', { class: 'lt-head', text: v0.headline }),
    body, more,
    h('div', { class: 'lt-arms', role: 'group', 'aria-label': 'Answers' }, ...arms.map((a) => a.b)));
  // A short letter is shown whole; a long one opens to three lines (the answers stay in reach), whole on a tap.
  if (v0.body.length <= 240) { el.classList.add('open'); more.hidden = true; }
  return {
    id: v0.id, el,
    update(v) {
      const dflt = v.arms[v.defaultArm]?.label ?? '';
      setText(lapse, `waits ${left(v.expiresIn)}; if left, “${dflt}”`);
      v.arms.forEach((a, i) => {
        const x = arms[i]; if (!x) return;
        const parts: string[] = [];
        if (a.capital > 0) parts.push(money(a.capital));
        if (a.mandate > 0) parts.push(`${fmt(a.mandate)} Mandate`);
        setText(x.costEl, parts.length ? ` · ${parts.join(' and ')}` : '');
        setAttr(x.b, 'aria-disabled', a.affordable ? null : 'true');
        cls(x.b, 'off', !a.affordable);
        // Why it cannot be chosen, in figures.
        let why = '';
        if (!a.affordable) {
          if (ctx.d?.pendingReckoning) why = 'Not while the Reckoning waits.';
          else if (a.mandate > num(ctx.state.mandate)) why = `Needs ${fmt(a.mandate)} Mandate; there is ${fmt(Math.floor(num(ctx.state.mandate)))}.`;
          else if (a.capital > num(ctx.state.capital)) why = `Needs ${money(a.capital)}; there is ${money(num(ctx.state.capital))}.`;
          else why = 'Cannot be afforded now.';
        }
        setText(x.why, why); show(x.why, !!why);
      });
    },
  };
}

export function buildLetters(ctx: Ctx): LettersComp {
  const count = h('span', { class: 'lt-n num muted' });
  const list = h('div', { class: 'lt-list' });
  const mods = h('ul', { class: 'mods', 'aria-label': 'In force for a time' });
  const modWrap = h('div', { class: 'mod-wrap', hidden: true }, h('p', { class: 'mod-k', text: 'In force for a time' }), mods);
  const past = foldSection('letters.past', 'lt-past');
  const pastList = h('ul', { class: 'lt-past-list' });
  past.body.append(pastList);
  const el = h('section', { class: 'letters', 'aria-label': 'Letters', hidden: true },
    h('header', { class: 'sec-h' }, h('h2', { class: 'sec-t', text: 'Letters' }), count), list, modWrap, past.el);
  const letters = new Map<string, Letter>();
  const modRows = new Map<string, { li: HTMLElement; t: HTMLElement }>();
  let key = '', modKey = '', pastKey = '';

  function update(): void {
    const on = !!ctx.d?.features?.dispatches;
    const pend = on ? ctx.d.dispatch?.pending ?? [] : [];
    const mv = on ? ctx.d.modifiers ?? [] : [];
    const answered = on ? ctx.state.dispatch?.answered ?? [] : [];
    show(el, on && (pend.length > 0 || mv.length > 0 || answered.length > 0));
    if (!on) return;
    const k = pend.map((p) => p.id).join(',');
    if (k !== key) {
      key = k;
      for (const id of [...letters.keys()]) if (!pend.some((p) => p.id === id)) letters.delete(id);
      syncChildren(list, pend.map((p) => { let l = letters.get(p.id); if (!l) { l = makeLetter(ctx, p); letters.set(p.id, l); } return l.el; }));
    }
    for (const p of pend) letters.get(p.id)?.update(p);
    setText(count, pend.length ? `${pend.length} waiting` : '');

    // Timed consequences in force: one slim line each, ending soonest first, with the time left.
    const mk = mv.map((m) => `${m.source}:${m.arm}`).join(',');
    if (mk !== modKey) {
      modKey = mk;
      syncChildren(mods, mv.map((m) => {
        const id = `${m.source}:${m.arm}`;
        let r = modRows.get(id);
        if (!r) {
          const fx = m.effects.map((e) => effectText(ctx, e)).filter(Boolean).join(', ');
          const t = h('span', { class: 'mod-t num' });
          const li = h('li', { title: fx }, h('span', { class: 'mod-n', text: m.label }), fx ? h('span', { class: 'mod-fx num', text: fx }) : null, t);
          r = { li, t }; modRows.set(id, r);
        }
        return r.li;
      }));
    }
    for (const m of mv) {
      const r = modRows.get(`${m.source}:${m.arm}`);
      if (r) setText(r.t, `${left(m.remaining)} left · ${fmt(Math.max(0, Math.ceil(m.remaining * YEARS_PER_SECOND)))} yrs`);
    }
    show(modWrap, mv.length > 0);

    // Letters answered this run, folded: what was chosen, and by whom.
    const pk = answered.map((a) => `${a.id}:${a.arm}:${a.by}`).join(',');
    if (pk !== pastKey) {
      pastKey = pk;
      setText(past.sum, `Letters this run, ${answered.length}`);
      pastList.replaceChildren(...answered.slice().reverse().map((a) => {
        const d = ctx.content.dispatches?.find((x) => x.id === a.id);
        const writer = ctx.content.cast?.find((c) => c.id === d?.cast)?.name;
        const arm = d?.arms[a.arm]?.label ?? '';
        // M4: a wager answered: won or lost, in the paper's words.
        const bet = a.won === true ? ' The bet paid.' : a.won === false ? ' The bet was lost.' : '';
        return h('li', null, h('span', { class: 'lp-h', text: d?.headline ?? a.id }),
          h('span', { class: 'lp-a muted' }, `${writer ? writer + ': ' : ''}${a.by === 'player' ? 'answered' : a.by === 'dispatch' ? 'a standing reply' : 'left; taken as'} “${arm}”.${bet}`));
      }));
    }
    show(past.el, answered.length > 0);
  }

  function showLetter(): void {
    const t = list.querySelector<HTMLElement>('.letter') ?? el;
    const cockpit = document.querySelector('.cockpit')?.getBoundingClientRect();
    const beside = !!cockpit && cockpit.right <= t.getBoundingClientRect().left + 1;
    const top = t.getBoundingClientRect().top + window.scrollY - (beside || !cockpit ? 16 : cockpit.height + 10);
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
    try { t.querySelector<HTMLButtonElement>('.lt-arm:not([aria-disabled])')?.focus({ preventScroll: true }); } catch { /* ignore */ }
  }

  function onEvents(ev: GameEvent[]): void {
    for (const e of ev) {
      const d = e.id ? ctx.content.dispatches?.find((x) => x.id === e.id) : undefined;
      const writer = d ? ctx.content.cast?.find((c) => c.id === d.cast) : undefined;
      if (e.kind === 'dispatchArrived') {
        sound('letter', { sector: e.sector, cast: e.label });
        ctx.toast(`A letter from ${writer?.name ?? 'a correspondent'}.`, { label: 'Read it', run: showLetter });
      } else if (e.kind === 'dispatchAnswered') {
        sound('answer', { sector: e.sector, by: e.by, label: e.label, outcome: e.label === 'won' || e.label === 'lost' ? e.label : undefined });
        // M4: a wager is settled at the answer: say how it went, with the outcome that came.
        if (e.label === 'won' || e.label === 'lost') {
          const w = d?.arms[num(e.n)]?.wager;
          const o = e.label === 'won' ? w?.win.outcome : w?.lose.outcome;
          ctx.toast(`${e.label === 'won' ? 'The bet pays' : 'The bet is lost'}${o ? `: ${o.replace(/\.$/, '')}` : ''}.`, undefined);
        }
        // A letter left to lapse is reported once, quietly, with what was taken.
        if (e.by === 'default' && d) ctx.toast(`${writer?.name ?? 'The'}${writer ? '’s' : ''} letter lapsed: “${d.arms[num(e.n)]?.label ?? ''}” was taken.`);
      }
    }
  }
  return { el, update, onEvents, showLetter };
}
