// Upgrade cards (the promise in large type, the decade and the frontier in small red), fork pairs, the budget panel
// and the counter-levers.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sd } from './ctx';
import type { EffectDef, LeverRecycle, LeverView, SectorDef, UpgradeView } from '../types';
import { STEADY_STATE_YEARS } from '../types';
import { h, setText, setStyle, setAttr, show, cls, syncChildren, reducedMotion } from './dom';
import { fmt, money, pct, num, clamp, lower, fmtEpoch } from './fmt';

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
  const nope = () => { if (!reducedMotion()) { buy.classList.remove('nope'); void buy.offsetWidth; buy.classList.add('nope'); } };
  const tryBuy = (): boolean => ctx.act('buyUpgrade', (m, s, c) => m.buyUpgrade(s, c, def.id));
  // One arm of a fork rules the others out for the run: ask first (only when the purchase would go through).
  const forkArm = !!(def.excludes?.length || ctx.content.upgrades?.some((u) => u.excludes?.includes(def.id)));
  let held = false;
  const buy = h('button', { class: 'btn buy', type: 'button', onclick: () => {
    if (held) { held = false; return; } // a hold already bought; the click that ends it buys nothing more
    if (forkArm && cur?.affordable && !cur.excludedBy) { ctx.confirmFork(def.id, () => { if (!tryBuy()) nope(); }); return; }
    if (!tryBuy()) nope();
  } }, fill, h('span', { class: 'btn-l', text: buyLbl }), cost);
  setAttr(buy, 'aria-label', null);
  // Hold to repeat, for repeatable cards: one ModelApi call per beat, stopping at the first refusal.
  if (def.repeatable) {
    let timer = 0, beat = 0;
    const stop = () => { clearTimeout(timer); timer = 0; };
    const step = () => {
      if (!tryBuy()) { stop(); return; }
      held = true; beat++;
      timer = window.setTimeout(step, Math.max(110, 260 - beat * 30));
    };
    // The card may be re-sorted (moved in the DOM) between beats, so the hold ends on the window's pointerup, not on
    // events of the button itself.
    const end = () => { stop(); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
    buy.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !cur?.affordable) return;
      held = false; beat = 0; stop();
      timer = window.setTimeout(step, 450);
      window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    });
    buy.addEventListener('contextmenu', (e) => e.preventDefault());
    buy.classList.add('holdable');
    setAttr(buy, 'title', 'Hold to keep buying');
  }

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
  let cur: UpgradeView | null = null;
  el.setAttribute('data-up', def.id);

  function update(v: UpgradeView): void {
    cur = v;
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
        // Meaning in words and a glyph as well as colour: "▲ more coal, +8%" / "▼ less coal, −3%".
        const pv = p as number;
        setText(decV, pv > 0.0005 ? `▲ more ${res}, ${pct(pv)}` : pv < -0.0005 ? `▼ less ${res}, ${pct(pv)}` : `no change in ${res}`);
        cls(decade, 'worse', (p as number) > 0.0005);
        cls(decade, 'better', (p as number) < -0.0005);
      }
      const list = by ? [] : Array.isArray(v.bringsWithinReach) ? v.bringsWithinReach : [];
      const k = list.map((r) => `${r.appId}:${pct(r.projectedChange)}`).join('|') + fmtEpoch();
      if (k !== reachKey) {
        reachKey = k;
        reach.replaceChildren(...list.map((r) => {
          const a = sec?.applications.find((x) => x.id === r.appId);
          const ch = num(r.projectedChange);
          return h('p', { class: 'reach-l' + (ch > 0.0005 ? ' worse' : ch < -0.0005 ? ' better' : '') },
            `Brings ${a?.name ?? 'a new use'} within reach: `, h('b', { class: 'num', text: `${ch > 0.0005 ? '▲ ' : ch < -0.0005 ? '▼ ' : ''}${pct(ch)}` }), ` ${res} if founded`);
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
  const badge = h('span', { class: 'afford-n num', hidden: true });
  const list = h('div', { class: 'up-list' });
  const empty = h('p', { class: 'empty' });
  const ownedSum = h('summary', null);
  const ownedList = h('ul', { class: 'owned-list' });
  const owned = h('details', { class: 'owned' }, ownedSum, ownedList);
  const el = h('section', { class: 'upgrades', 'aria-label': 'Improvements' }, h('header', { class: 'sec-h' }, title, badge), list, empty, owned);
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
    const n = (ctx.afford?.items || []).filter((x) => x.kind === 'up' && x.sector === ctx.sector).length;
    show(badge, n > 0);
    setText(badge, `${n} affordable`);
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
    // A standing cap (from an Institution) is in force but draws its line only after the industry has been open
    // standingDrawYears; the years remaining are not exposed by derive(), so the total is given, not a countdown.
    const standing = !has && (ctx.levs || []).some((v) => v?.def?.sector === ctx.sector && v.def.kind === 'cap' && num(v.level) > 0);
    const drawYrs = def?.steady?.standingDrawYears ?? g?.steady?.standingDrawYears;
    if (standing) setText(status, `A standing cap is in force, with no line to hold it to yet. The line is drawn once ${def?.name ?? 'the industry'} has been open ${drawYrs ? `${fmt(drawYrs)} years` : 'a while'}; drawing it, or tightening the cap, draws it now.`);
    else if (!has) setText(status, `No line drawn for ${def?.name ?? 'this industry'}. Nothing counts towards Steady State until one is.`);
    else if (e?.withinBudget) setText(status, e.decoupling ? `Within budget · ${Math.floor(num(e.steadyYears) % dec)} of ${dec} years to the next decade` : 'Within budget, but wellbeing is below target: the years do not count.');
    else setText(status, `Over budget by ${pct(bR > 0 ? num(e?.resourceUse) / bR - 1 : NaN, false)}`);
    cls(status, 'ok', !!e?.decoupling);
    cls(status, 'over', has && !e?.withinBudget);
    const decline = def?.steady?.declinePerDecade ?? g?.steady?.budgetDeclinePerDecade ?? 0.05;
    const b = ctx.state.sectors?.[ctx.sector]?.budget;
    // A line held at Steady State (BudgetState.heldAt) no longer falls.
    const held = b?.heldAt != null;
    setText(line, has ? `The line: ${fmt(bR)} ${unit}/s, drawn in ${b?.drawnYear ?? '—'}, ${held ? 'held level since Steady State' : `falling ${pct(decline, false)} a decade`}.` : '');
    cls(line, 'held', held);
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
  const noLineEl = h('p', { class: 'lev-noline', hidden: true });
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
  // Raise as far as Mandate allows: repeated setLever calls inside one action, stopping at the first refusal.
  const maxBtn = h('button', { class: 'btn lev-max', type: 'button', 'aria-label': `${def.name}: raise as far as Mandate allows`, onclick: () => {
    let steps = 0;
    const ok = ctx.act('setLever', (m, s0, c) => {
      let s = s0;
      for (let i = 0; i < 500; i++) {
        const lv = num(s.levers?.[def.id]?.level);
        const n = m.setLever(s, c, def.id, lv + 1);
        if (n === s) break;
        s = n; steps++;
      }
      return s;
    });
    if (ok && steps > 1) ctx.toast(`${def.name}: ${steps} steps at once.`);
    else if (!ok && !reducedMotion()) { maxBtn.classList.remove('nope'); void maxBtn.offsetWidth; maxBtn.classList.add('nope'); }
  } }, h('span', { class: 'btn-l', text: 'Max' }));

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
    levy, noLineEl, next, rec,
    h('div', { class: 'lev-btns' }, lowerBtn, raise, maxBtn));
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
      // Offered only when there is more than one step left to take; whether the Mandate stretches is the model's call.
      show(maxBtn, v.canRaise && max - lv >= 2);
    } else {
      setText(next, lv > 0 ? 'As far as it goes.' : '');
      show(raise, false);
      show(maxBtn, false);
    }
    show(next, !!next.textContent);
    lowerBtn.disabled = lv <= 0;
    cls(el, 'active', lv > 0);
    // A cap in force with no budget line yet does nothing until the line is drawn (standingDrawYears, or a Tighten).
    const noLine = def.kind === 'cap' && lv > 0 && !ctx.state.sectors?.[def.sector]?.budget;
    show(noLineEl, noLine);
    if (noLine) {
      const yrs = sectorDef(ctx, def.sector)?.steady?.standingDrawYears ?? ctx.content.global?.steady?.standingDrawYears;
      setText(noLineEl, `No line yet, so the cap holds nothing back. One is drawn once the industry has been open ${yrs ? `${fmt(yrs)} years` : 'a while'}; tightening draws it now.`);
    }
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


