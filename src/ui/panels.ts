// Upgrade cards (the promise in large type, the decade and the frontier in small red), fork pairs, the budget panel
// and the counter-levers.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sd } from './ctx';
import type { EffectDef, LeverRecycle, LeverView, SectorDef, UpgradeView } from '../types';
import { STEADY_STATE_YEARS } from '../types';
import { h, setText, setStyle, setAttr, show, cls, syncChildren, reducedMotion } from './dom';
import { fmt, money, pct, num, clamp, lower } from './fmt';

/** Plain-words description of an effect, for cards and shop nodes. Unknown effect types give ''. */
export function effectText(ctx: Ctx, e: EffectDef): string {
  const def = 'sector' in e ? sectorDef(ctx, e.sector) : undefined;
  const res = lower(def?.resource.name ?? 'resource');
  const svc = def?.service.unit ?? 'unit';
  const appName = (id?: string) => (id && def ? def.applications.find((a) => a.id === id)?.name : undefined);
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
      return `${l?.name ?? 'A lever'} in force from the first day${e.level > 1 ? ` (step ${e.level})` : ''}`;
    }
    case 'costMul': return `${pct(e.value - 1)} on every improvement`;
    case 'satMul': return `${pct(e.value - 1)} appetite for ${appName(e.app) ?? (def ? lower(def.service.name) : 'the service')}`;
    case 'halfPriceMul': return `${appName(e.app) ?? (def ? def.service.name : 'The service')} taken up at ${pct(e.value - 1)} higher prices`;
    case 'popGrowthMul': return `Population grows ${pct(e.value - 1)} as fast`;
    case 'wellbeingAdd': return `${e.value >= 0 ? '+' : '−'}${fmt(Math.abs(e.value))} wellbeing`;
    case 'unlock': {
      const u = ctx.content.upgrades?.find((x) => x.id === e.id) ?? ctx.content.levers?.find((x) => x.id === e.id);
      return `Makes ${u?.name ?? 'something new'} possible`;
    }
    case 'slotAdd': return `+${fmt(e.value)} institution seat${e.value === 1 ? '' : 's'}`;
    case 'mandateAdd': return `+${fmt(e.value)} Mandate`;
    case 'capitalAdd': return `${fmt(e.value)} seconds of income at once`;
    default: return '';
  }
}

/* ------------------------------------------------------------------ */
/* Improvements                                                        */
/* ------------------------------------------------------------------ */

interface UpCard { el: HTMLElement; update(v: UpgradeView): void; }

function makeUpCard(ctx: Ctx, v0: UpgradeView): UpCard {
  const def = v0.def;
  const sec = sectorDef(ctx, def.sector);
  const kind = def.kind;
  const res = lower(sec?.resource.name ?? 'resource');
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
  setAttr(buy, 'aria-label', null);

  // The promise: sign drawn separately so that a display serif's thin, low minus does not spoil it.
  const pSign = h('span', { class: 'pm-sign', 'aria-hidden': 'true' });
  const pNum = h('span', { class: 'pm-num' });
  const promise = h('div', { class: 'promise num' }, pSign, pNum);
  const promiseCap = h('div', { class: 'promise-cap' });
  const decV = h('span', { class: 'proj-v num' });
  const decade = h('div', { class: 'proj' }, h('span', { class: 'proj-l', text: 'This decade: ' }), decV);
  const reach = h('div', { class: 'reach' });
  const ruled = h('p', { class: 'ruled' });
  const eff = h('p', { class: 'up-eff' });
  const projected = kind === 'efficiency' || kind === 'capital';

  let el: HTMLElement;
  if (kind === 'efficiency') {
    el = h('article', { class: 'up up-efficiency' },
      h('header', { class: 'up-h' }, name, lvl), blurb,
      h('div', { class: 'up-promise' }, promise, promiseCap), decade, reach, ruled, buy);
  } else if (kind === 'research') {
    el = h('article', { class: 'up up-research' },
      h('div', { class: 'pamph-k', text: 'A pamphlet' }), name, h('div', { class: 'pamph-rule', 'aria-hidden': 'true' }), blurb, eff, ruled, buy);
  } else {
    el = h('article', { class: `up up-${kind}` }, h('header', { class: 'up-h' }, name, lvl), blurb, eff, ...(projected ? [decade, reach] : []), ruled, buy);
  }
  setText(promiseCap, `${res} per unit of ${lower(sec?.service.name ?? 'service')}`);
  setText(eff, def.effects.map((e) => effectText(ctx, e)).filter(Boolean).join(' · '));
  let reachKey = '\u0000';

  function update(v: UpgradeView): void {
    setText(cost, money(v.cost));
    setAttr(buy, 'aria-disabled', v.affordable ? null : 'true');
    setStyle(fill, 'width', v.affordable ? '0%' : (clamp(num(ctx.state.capital) / Math.max(1e-9, v.cost), 0, 1) * 100).toFixed(1) + '%');
    cls(el, 'afford', v.affordable);
    const max = def.maxLevel;
    setText(lvl, def.repeatable ? (max && Number.isFinite(max) ? `${v.level}/${max}` : `Lv ${v.level}`) : '');
    // Fork already taken: the card stays as a record of the choice, without a button.
    const by = v.excludedBy;
    cls(el, 'excluded', !!by);
    show(buy, !by);
    if (by) setText(ruled, `Ruled out by ${ctx.content.upgrades.find((u) => u.id === by)?.name ?? 'another choice'}`);
    show(ruled, !!by);
    if (kind === 'efficiency') {
      const pc = v.promisedChange;
      const s = pc == null || !Number.isFinite(pc) ? '' : pc < -0.0005 ? 'minus' : pc > 0.0005 ? 'plus' : '';
      setAttr(pSign, 'data-s', s || null);
      setText(pNum, pc == null || !Number.isFinite(pc) ? '—' : pct(Math.abs(pc), false));
      setAttr(promise, 'aria-label', pc == null ? null : pct(pc));
    }
    if (projected) {
      const p = by ? null : v.projectedDecade;
      const showP = p != null && Number.isFinite(p);
      show(decade, showP);
      if (showP) {
        setText(decV, `${pct(p as number)} ${res}`);
        cls(decade, 'worse', (p as number) > 0.0005);
        cls(decade, 'better', (p as number) < -0.0005);
      }
      const list = by ? [] : Array.isArray(v.bringsWithinReach) ? v.bringsWithinReach : [];
      const k = list.map((r) => `${r.appId}:${pct(r.projectedChange)}`).join('|');
      if (k !== reachKey) {
        reachKey = k;
        reach.replaceChildren(...list.map((r) => {
          const a = sec?.applications.find((x) => x.id === r.appId);
          const ch = num(r.projectedChange);
          return h('p', { class: 'reach-l' + (ch > 0.0005 ? ' worse' : ch < -0.0005 ? ' better' : '') },
            `Brings ${a?.name ?? 'a new use'} within reach: `, h('b', { class: 'num', text: pct(ch) }), ` ${res} if founded`);
        }));
      }
      show(reach, list.length > 0);
    }
  }
  update(v0);
  return { el, update };
}

/** Connected groups of mutually exclusive upgrades among `views` (exclusion read both ways). */
function forkGroups(views: UpgradeView[]): UpgradeView[][] {
  const ids = new Map(views.map((v, i) => [v.def.id, i]));
  const parent = views.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  views.forEach((v, i) => {
    for (const x of v.def.excludes || []) { const j = ids.get(x); if (j != null) parent[find(i)] = find(j); }
  });
  const groups = new Map<number, UpgradeView[]>();
  views.forEach((v, i) => { const r = find(i); const g = groups.get(r); if (g) g.push(v); else groups.set(r, [v]); });
  return [...groups.values()];
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
  const forks = new Map<string, HTMLElement>();
  let key = '', ownedKey = '';

  const cardFor = (v: UpgradeView): UpCard => {
    let c = cards.get(v.def.id);
    if (!c) { c = makeUpCard(ctx, v); cards.set(v.def.id, c); }
    return c;
  };

  function update(): void {
    const def: SectorDef | undefined = sectorDef(ctx);
    const views = (ctx.ups || []).filter((v) => v && v.def && v.def.sector === ctx.sector);
    const avail = views.filter((v) => v.visible && !v.maxed);
    // Order: open choices by cost (a fork by its cheapest arm), then choices already ruled out.
    const groups = forkGroups(avail).map((g) => g.sort((a, b) => a.cost - b.cost));
    const rank = (g: UpgradeView[]) => (g.every((v) => v.excludedBy) ? 1e300 : 0) + Math.min(...g.map((v) => v.cost));
    groups.sort((a, b) => rank(a) - rank(b));
    const k = groups.map((g) => g.map((v) => v.def.id + (v.excludedBy ? '!' : '')).join('+')).join(',');
    if (k !== key) {
      key = k;
      syncChildren(list, groups.map((g) => {
        // A fork stays drawn as a pair only while it is still a choice (no arm ruled out yet).
        if (g.length === 1 || g.some((v) => v.excludedBy)) {
          if (g.length === 1) return cardFor(g[0]).el;
          const wrap = h('div', { class: 'fork-done' });
          wrap.append(...g.map((v) => cardFor(v).el));
          return wrap;
        }
        const fk = g.map((v) => v.def.id).join('+');
        let f = forks.get(fk);
        if (!f) { f = h('div', { class: 'fork', role: 'group', 'aria-label': 'A choice: one or the other' }); forks.set(fk, f); }
        const kids: Node[] = [];
        g.forEach((v, i) => { if (i) kids.push(h('span', { class: 'fork-or', 'aria-hidden': 'true', text: 'or' })); kids.push(cardFor(v).el); });
        syncChildren(f, kids);
        cls(f, 'n3', g.length > 2);
        return f;
      }));
    }
    for (const v of avail) cards.get(v.def.id)?.update(v);
    show(empty, avail.length === 0);
    setText(empty, `Nothing more to buy in ${def?.name ?? 'this industry'} for now.`);

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
/* The budget: the line, the streak, the decades ledger                */
/* ------------------------------------------------------------------ */

export function buildBudget(ctx: Ctx): Comp {
  const status = h('p', { class: 'bud-status num' });
  const line = h('p', { class: 'bud-line num muted' });
  const draw = h('button', { class: 'btn bud-draw', type: 'button', onclick: () => onDraw() });
  const confirmTxt = h('p', { text: 'Redraw the line at today’s use? It resets the streak; decades already earned are kept.' });
  const confirmBox = h('div', { class: 'confirm-box', hidden: true }, confirmTxt,
    h('div', { class: 'm-row' },
      h('button', { class: 'btn danger', type: 'button', onclick: () => { doDraw(); show(confirmBox, false); show(draw, true); } }, 'Redraw it'),
      h('button', { class: 'btn', type: 'button', onclick: () => { show(confirmBox, false); show(draw, true); draw.focus(); } }, 'Keep the line')));
  const ledger = h('ol', { class: 'ledger', 'aria-label': 'Decades within budget' });
  const ssTxt = h('span', { class: 'num' });
  const ssFill = h('span', {});
  const ss = h('div', { class: 'ss' }, ssTxt, h('span', { class: 'ss-bar' }, ssFill));
  const el = h('section', { class: 'budget', 'aria-label': 'The budget', hidden: true },
    h('header', { class: 'sec-h' }, h('h2', { class: 'sec-t', text: 'The budget' })), status, line, h('div', { class: 'm-row' }, draw), confirmBox, ledger, ss);
  let ledgerKey = '', sector = '';

  function doDraw(): void {
    if (!ctx.act('drawBudget', (m, s, c) => m.drawBudget(s, c, ctx.sector)) && !reducedMotion()) {
      draw.classList.remove('nope'); void draw.offsetWidth; draw.classList.add('nope');
    }
  }
  function onDraw(): void {
    if (ctx.state.sectors?.[ctx.sector]?.budget) { show(draw, false); show(confirmBox, true); (confirmBox.querySelector('button') as HTMLButtonElement | null)?.focus(); }
    else doDraw();
  }

  function update(): void {
    const revealed = !!ctx.state.flags?.revealed;
    show(el, revealed);
    if (!revealed) return;
    if (sector !== ctx.sector) { sector = ctx.sector; show(confirmBox, false); show(draw, true); }
    const e = sd(ctx), def = sectorDef(ctx);
    const unit = def?.resource.unit ?? '';
    const g = ctx.content.global;
    const dec = num(g?.steady?.decadeYears, 10) || 10;
    const bR = e?.budgetR;
    const has = bR != null;
    if (!has) setText(status, `No line drawn for ${def?.name ?? 'this industry'}. Nothing counts towards Steady State until one is.`);
    else if (e?.withinBudget) setText(status, e.decoupling ? `Within budget · ${Math.floor(num(e.steadyYears) % dec)} of ${dec} years to the next decade` : 'Within budget, but wellbeing is below target: the years do not count.');
    else setText(status, `Over budget by ${pct(bR > 0 ? num(e?.resourceUse) / bR - 1 : NaN, false)}`);
    cls(status, 'ok', !!e?.decoupling);
    cls(status, 'over', has && !e?.withinBudget);
    const decline = def?.steady?.declinePerDecade ?? g?.steady?.budgetDeclinePerDecade ?? 0.05;
    const b = ctx.state.sectors?.[ctx.sector]?.budget;
    setText(line, has ? `The line: ${fmt(bR)} ${unit}/s today, drawn in ${b?.drawnYear ?? '—'}, falling ${pct(decline, false)} a decade.` : '');
    show(line, has);
    setText(draw, has ? 'Redraw the line' : 'Draw the line');
    setAttr(draw, 'aria-disabled', num(e?.resourceUse) > 0 && !ctx.d?.pendingReckoning ? null : 'true');

    const decs = ctx.state.sectors?.[ctx.sector]?.decadesWithin ?? [];
    const lk = ctx.sector + ':' + decs.join(',');
    if (lk !== ledgerKey) {
      ledgerKey = lk;
      ledger.replaceChildren(...(decs.length
        ? decs.map((y) => h('li', { class: 'num' }, `${Math.floor(num(y) / 10) * 10}s `, h('span', { class: 'tick', text: '✓', 'aria-label': 'within budget' })))
        : [h('li', { class: 'none', text: 'No decade within budget yet.' })]));
    }
    const yrs = Math.floor(num(e?.steadyYears));
    setText(ssTxt, `Steady State: ${Math.min(yrs, STEADY_STATE_YEARS)} of ${STEADY_STATE_YEARS} years`);
    setStyle(ssFill, 'width', clamp(yrs / STEADY_STATE_YEARS * 100, 0, 100).toFixed(1) + '%');
    cls(ss, 'on', !!e?.decoupling);
  }
  return { el, update };
}

/* ------------------------------------------------------------------ */
/* Counter-levers                                                      */
/* ------------------------------------------------------------------ */

const RECYCLE_LABEL: Record<string, string> = { treasury: 'To the Treasury', dividend: 'As a dividend' };

interface LevCard { el: HTMLElement; update(v: LeverView): void; }

function makeLevCard(ctx: Ctx, v0: LeverView): LevCard {
  const def = v0.def;
  const authored = Array.isArray(def.levels) ? def.levels.length : 0;
  const pips = h('span', { class: 'pips', 'aria-hidden': 'true' });
  const pipMore = h('span', { class: 'pip-more num' });
  const now = h('span', { class: 'lev-now-v' });
  const next = h('div', { class: 'lev-next' });
  const upk = h('span', { class: 'lev-upk num' });
  const levy = h('p', { class: 'lev-levy num' });
  const lowerBtn = h('button', { class: 'btn lev-lower', type: 'button', onclick: () => {
    const lv = num(cur?.level);
    if (lv > 0) ctx.act('setLever', (m, s, c) => m.setLever(s, c, def.id, lv - 1));
  } }, h('span', { class: 'btn-l', text: 'Lower' }));
  const raiseC = h('span', { class: 'btn-c num' });
  const raiseL = h('span', { class: 'btn-l' });
  const raise = h('button', { class: 'btn lev-raise', type: 'button', onclick: () => {
    const lv = num(cur?.level);
    if (!ctx.act('setLever', (m, s, c) => m.setLever(s, c, def.id, lv + 1)) && !reducedMotion()) {
      raise.classList.remove('nope'); void raise.offsetWidth; raise.classList.add('nope');
    }
  } }, raiseL, raiseC);

  // Revenue recycling (duty and cap levers offering more than one destination).
  const opts = v0.recycleOptions || [];
  const recBtns = new Map<LeverRecycle, HTMLButtonElement>();
  const recNote = h('p', { class: 'rec-note' });
  const rec = h('div', { class: 'recycle', hidden: opts.length < 2 },
    h('span', { class: 'rec-k', id: `rec-${def.id}`, text: 'Revenue goes' }),
    h('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': `rec-${def.id}` }, ...opts.map((o) => {
      const b = h('button', { class: 'seg-b', type: 'button', role: 'radio', 'aria-checked': 'false',
        onclick: () => ctx.act('setLeverRecycle', (m, s, c) => m.setLeverRecycle(s, c, def.id, o)) }, RECYCLE_LABEL[o] ?? o);
      recBtns.set(o, b);
      return b;
    })), recNote);

  const el = h('article', { class: 'lever' },
    h('header', { class: 'lev-h' }, h('h3', { class: 'lev-name', text: def.name }), h('span', { class: 'pip-wrap' }, pips, pipMore)),
    h('p', { class: 'lev-blurb', text: def.blurb }),
    h('p', { class: 'lev-catch' }, h('span', { class: 'lev-catch-k', text: 'The catch. ' }), def.catch),
    h('div', { class: 'lev-now' }, h('span', { class: 'muted', text: 'In force: ' }), now, upk),
    levy, next, rec,
    h('div', { class: 'lev-btns' }, lowerBtn, raise));
  let cur: LeverView | null = null;
  let pipKey = '';

  function update(v: LeverView): void {
    cur = v;
    const lv = num(v.level);
    const max = Number.isFinite(v.maxLevel) ? num(v.maxLevel, authored) : Infinity;
    // Pips for every reachable step when there are few; past the authored ones, a count.
    const nPips = max <= 10 ? max : authored;
    if (pipKey !== String(nPips)) { pipKey = String(nPips); pips.replaceChildren(...Array.from({ length: nPips }, (_, i) => h('i', { class: i >= authored ? 'rep' : '' }))); }
    Array.from(pips.children).forEach((p, i) => cls(p, 'on', i < lv));
    setText(pipMore, lv > nPips ? `+${lv - nPips}` : '');
    setText(now, lv > 0 ? (v.current?.label ?? `Step ${lv}`) : 'Off');
    setText(upk, lv > 0 && num(v.upkeep) > 0 ? ` · upkeep ${fmt(v.upkeep)}/s` : '');
    if (v.next && v.nextCost != null) {
      setText(next, `Next: ${v.next.label}`);
      setText(raiseL, lv === 0 ? 'Enact' : lv >= authored ? 'Tighten' : 'Raise');
      setText(raiseC, v.nextCost > 0 ? `${fmt(v.nextCost)} Mandate` : 'Free');
      show(raise, true);
      setAttr(raise, 'aria-disabled', v.canRaise ? null : 'true');
    } else {
      setText(next, lv > 0 ? 'As far as it goes.' : '');
      show(raise, false);
    }
    show(next, !!next.textContent);
    lowerBtn.disabled = lv <= 0;
    cls(el, 'active', lv > 0);
    // Levy revenue (never income) for duty and cap levers in force.
    const isLevy = def.kind === 'duty' || def.kind === 'cap';
    const lr = num(sd(ctx, def.sector)?.levyRevenue);
    const showLevy = isLevy && lv > 0;
    show(levy, showLevy);
    if (showLevy) setText(levy, `Levy ${money(lr)}/s${v.recycle === 'dividend' ? ', paid back per head' : v.recycle === 'treasury' ? ', to the Treasury' : ''}`);
    if (opts.length >= 2) {
      for (const [o, b] of recBtns) { const on = v.recycle === o; setAttr(b, 'aria-checked', String(on)); cls(b, 'on', on); }
      const share = num(ctx.content.global?.levy?.mandateShare, 0.1);
      setText(recNote, v.recycle === 'dividend'
        ? 'Paid back per head and spent like income: wellbeing up, so more people, and more demand.'
        : `${pct(share, false)} of it becomes Mandate; the rest is general taxation.`);
    }
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
    const vis = all.filter((v) => v.visible && v.def.sector === ctx.sector);
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
    setText(empty, `No levers to pull in ${sectorDef(ctx)?.name ?? 'this industry'} yet.`);
  }
  return { el, update };
}


