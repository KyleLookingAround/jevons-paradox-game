// Upgrade cards (the promise in large type, the projected total in small red) and counter-levers.
import type { Ctx, Comp } from './ctx';
import { eraDef } from './ctx';
import type { EffectDef, EraDef, LeverView, UpgradeView } from '../types';
import { h, setText, setStyle, setAttr, show, cls, syncChildren, reducedMotion } from './dom';
import { fmt, money, pct, num, clamp, lower } from './fmt';

/** Plain-words description of an effect, for cards that are not efficiency cards. */
export function effectText(ctx: Ctx, e: EffectDef): string {
  const def = 'era' in e ? eraDef(ctx, e.era) : undefined;
  const res = lower(def?.resource.name ?? 'resource');
  const svc = def?.service.unit ?? 'unit';
  switch (e.type) {
    case 'etaMul': return `${pct(1 / e.value - 1)} ${res} per ${svc}`;
    case 'capCostMul': return `${pct(e.value - 1)} running cost per ${svc}`;
    case 'marginAdd': return `${e.value >= 0 ? '+' : '−'}${fmt(Math.abs(e.value * 100))} points on your cut`;
    case 'reserveAdd': return def?.resourceKind === 'flow' ? `${pct(e.value)} ${res} capacity` : `${pct(e.value)} ${res} in reserve`;
    case 'absorptionAdd': return `${def?.pressure.name ?? 'Pressure'} clears faster: +${fmt(e.value * 100)}% a second`;
    case 'reveal': return 'Shows what the figures are actually doing';
    case 'startCapitalMul': return `Start each run with ${fmt(e.value)}× the capital`;
    case 'mandateRateMul': return `${pct(e.value - 1)} Mandate`;
    case 'startLever': {
      const l = ctx.content.levers?.find((x) => x.id === e.lever);
      return `${l?.name ?? 'A lever'} in force from the first day${e.level > 1 ? ` (level ${e.level})` : ''}`;
    }
    case 'costMul': return `${pct(e.value - 1)} on every upgrade`;
    default: return '';
  }
}

interface UpCard { el: HTMLElement; update(v: UpgradeView): void; }

function makeUpCard(ctx: Ctx, v0: UpgradeView): UpCard {
  const def = v0.def;
  const era = eraDef(ctx, def.era);
  const kind = def.kind;
  const name = h('h3', { class: 'up-name', text: def.name });
  const lvl = h('span', { class: 'up-lvl num' });
  const blurb = h('p', { class: 'up-blurb', text: def.blurb });
  const fill = h('span', { class: 'btn-fill', 'aria-hidden': 'true' });
  const cost = h('span', { class: 'btn-c num' });
  const buyLbl = kind === 'research' ? 'Commission' : 'Buy';
  const buy = h('button', { class: 'btn buy', type: 'button', onclick: () => {
    if (!ctx.act('buyUpgrade', (m, s, c) => m.buyUpgrade(s, c, def.id)) && !reducedMotion()) {
      buy.classList.remove('nope'); void buy.offsetWidth; buy.classList.add('nope');
    }
  } }, fill, h('span', { class: 'btn-l', text: buyLbl }), cost);

  const promise = h('div', { class: 'promise num' });
  const promiseCap = h('div', { class: 'promise-cap' });
  const proj = h('div', { class: 'proj' }, h('span', { class: 'proj-l', text: 'Projected total use: ' }), h('span', { class: 'proj-v num' }));
  const projV = proj.lastElementChild as HTMLElement;
  const eff = h('p', { class: 'up-eff' });

  let el: HTMLElement;
  if (kind === 'efficiency') {
    el = h('article', { class: 'up up-efficiency' },
      h('header', { class: 'up-h' }, name, lvl), blurb,
      h('div', { class: 'up-promise' }, promise, promiseCap), proj, buy);
  } else if (kind === 'research') {
    el = h('article', { class: 'up up-research' },
      h('div', { class: 'pamph-k', text: 'A pamphlet' }), name, h('div', { class: 'pamph-rule', 'aria-hidden': 'true' }), blurb, eff, buy);
  } else {
    el = h('article', { class: `up up-${kind}` }, h('header', { class: 'up-h' }, name, lvl), blurb, eff, buy);
  }
  setText(promiseCap, `${lower(era?.resource.name ?? 'resource')} per unit of ${lower(era?.service.name ?? 'service')}`);
  setText(eff, def.effects.map((e) => effectText(ctx, e)).filter(Boolean).join(' · '));

  function update(v: UpgradeView): void {
    setText(cost, money(v.cost));
    setAttr(buy, 'aria-disabled', v.affordable ? null : 'true');
    setStyle(fill, 'width', v.affordable ? '0%' : (clamp(num(ctx.state.capital) / Math.max(1e-9, v.cost), 0, 1) * 100).toFixed(1) + '%');
    cls(el, 'afford', v.affordable);
    const max = def.maxLevel;
    setText(lvl, def.repeatable ? (max && Number.isFinite(max) ? `${v.level}/${max}` : `Lv ${v.level}`) : '');
    if (kind === 'efficiency') {
      setText(promise, v.promisedChange != null ? pct(v.promisedChange) : '—');
      const p = v.projectedChange;
      const showP = !!ctx.state.flags?.revealed && p != null && Number.isFinite(p);
      show(proj, showP);
      if (showP) {
        setText(projV, pct(p as number));
        cls(proj, 'worse', (p as number) > 0.0005);
        cls(proj, 'better', (p as number) < -0.0005);
      }
    }
  }
  update(v0);
  return { el, update };
}

export function buildUpgrades(ctx: Ctx): Comp {
  const title = h('h2', { class: 'sec-t', text: 'Improvements' });
  const list = h('div', { class: 'up-list' });
  const empty = h('p', { class: 'empty' });
  const ownedSum = h('summary', null);
  const ownedList = h('ul', { class: 'owned-list' });
  const owned = h('details', { class: 'owned' }, ownedSum, ownedList);
  const el = h('section', { class: 'upgrades', 'aria-label': 'Improvements' }, h('header', { class: 'sec-h' }, title), list, empty, owned);
  const cards = new Map<string, UpCard>();
  let key = '', ownedKey = '';

  function update(): void {
    const def: EraDef | undefined = eraDef(ctx);
    const views = (ctx.ups || []).filter((v) => v && v.def && v.def.era === ctx.era);
    const avail = views.filter((v) => v.visible && !v.maxed).sort((a, b) => a.cost - b.cost);
    const k = avail.map((v) => v.def.id).join(',');
    if (k !== key) {
      key = k;
      syncChildren(list, avail.map((v) => {
        let c = cards.get(v.def.id);
        if (!c) { c = makeUpCard(ctx, v); cards.set(v.def.id, c); }
        return c.el;
      }));
    }
    for (const v of avail) cards.get(v.def.id)?.update(v);
    show(empty, avail.length === 0);
    setText(empty, `Nothing more to buy in ${def?.name ?? 'this era'} for now.`);

    const own = views.filter((v) => v.level > 0);
    const ok = own.map((v) => v.def.id + ':' + v.level).join(',');
    if (ok !== ownedKey) {
      ownedKey = ok;
      setText(ownedSum, `Owned (${own.length})`);
      ownedList.replaceChildren(...own.map((v) => h('li', null, h('span', { text: v.def.name }),
        h('span', { class: 'num muted', text: v.def.repeatable ? `×${v.level}` : (v.def.kind === 'efficiency' && v.promisedChange != null ? pct(v.promisedChange) : '') }))));
    }
    show(owned, own.length > 0);
  }
  return { el, update };
}

/* ------------------------------------------------------------------ */
/* Counter-levers                                                      */
/* ------------------------------------------------------------------ */

interface LevCard { el: HTMLElement; update(v: LeverView): void; }

function makeLevCard(ctx: Ctx, v0: LeverView): LevCard {
  const def = v0.def;
  const levels = Array.isArray(def.levels) ? def.levels : [];
  const pips = h('span', { class: 'pips', 'aria-hidden': 'true' }, ...levels.map(() => h('i')));
  const now = h('span', { class: 'lev-now-v' });
  const next = h('div', { class: 'lev-next' });
  const upk = h('span', { class: 'lev-upk num' });
  const lowerBtn = h('button', { class: 'btn lev-lower', type: 'button', onclick: () => {
    const lv = ctx.state.levers?.[def.id]?.level ?? 0;
    if (lv > 0) ctx.act('setLever', (m, s, c) => m.setLever(s, c, def.id, lv - 1));
  } }, h('span', { class: 'btn-l', text: 'Lower' }));
  const raiseC = h('span', { class: 'btn-c num' });
  const raise = h('button', { class: 'btn lev-raise', type: 'button', onclick: () => {
    const lv = ctx.state.levers?.[def.id]?.level ?? 0;
    if (!ctx.act('setLever', (m, s, c) => m.setLever(s, c, def.id, lv + 1)) && !reducedMotion()) {
      raise.classList.remove('nope'); void raise.offsetWidth; raise.classList.add('nope');
    }
  } }, h('span', { class: 'btn-l' }), raiseC);
  const raiseL = raise.querySelector('.btn-l') as HTMLElement;
  const el = h('article', { class: 'lever' },
    h('header', { class: 'lev-h' }, h('h3', { class: 'lev-name', text: def.name }), pips),
    h('p', { class: 'lev-blurb', text: def.blurb }),
    h('p', { class: 'lev-catch' }, h('span', { class: 'lev-catch-k', text: 'The catch. ' }), def.catch),
    h('div', { class: 'lev-now' }, h('span', { class: 'muted', text: 'In force: ' }), now, upk),
    next,
    h('div', { class: 'lev-btns' }, lowerBtn, raise));

  function update(v: LeverView): void {
    const lv = num(v.level);
    Array.from(pips.children).forEach((p, i) => cls(p, 'on', i < lv));
    setText(now, lv > 0 ? (levels[lv - 1]?.label ?? `Level ${lv}`) : 'Off');
    setText(upk, lv > 0 && num(v.upkeep) > 0 ? ` · upkeep ${fmt(v.upkeep)}/s` : '');
    const nl = levels[lv];
    if (nl && v.nextCost != null) {
      setText(next, `Next: ${nl.label}`);
      setText(raiseL, lv === 0 ? 'Enact' : 'Raise');
      setText(raiseC, `${fmt(v.nextCost)} Mandate`);
      show(raise, true);
      setAttr(raise, 'aria-disabled', v.canRaise ? null : 'true');
    } else {
      setText(next, lv > 0 ? 'As far as it goes.' : '');
      show(raise, false);
    }
    show(next, !!next.textContent);
    lowerBtn.disabled = lv <= 0;
    cls(el, 'active', lv > 0);
  }
  update(v0);
  return { el, update };
}

export function buildLevers(ctx: Ctx): Comp {
  const bal = h('span', { class: 'sky num' });
  const list = h('div', { class: 'lev-list' });
  const empty = h('p', { class: 'empty' });
  const el = h('section', { class: 'levers', 'aria-label': 'Counter-levers', hidden: true },
    h('header', { class: 'sec-h' }, h('h2', { class: 'sec-t', text: 'Counter-levers' }), bal), list, empty);
  const cards = new Map<string, LevCard>();
  let key = '';

  function update(): void {
    const all = (ctx.levs || []).filter((v) => v && v.def);
    const anyVisible = all.some((v) => v.visible);
    show(el, anyVisible);
    if (!anyVisible) return;
    const vis = all.filter((v) => v.visible && v.def.era === ctx.era);
    const k = vis.map((v) => v.def.id).join(',');
    if (k !== key) {
      key = k;
      syncChildren(list, vis.map((v) => {
        let c = cards.get(v.def.id);
        if (!c) { c = makeLevCard(ctx, v); cards.set(v.def.id, c); }
        return c.el;
      }));
    }
    for (const v of vis) cards.get(v.def.id)?.update(v);
    setText(bal, `Mandate ${fmt(Math.floor(num(ctx.state.mandate)))}`);
    show(empty, vis.length === 0);
    setText(empty, `No levers to pull in ${eraDef(ctx)?.name ?? 'this era'} yet.`);
  }
  return { el, update };
}
