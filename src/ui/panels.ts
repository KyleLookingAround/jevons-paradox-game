// Upgrade cards (the promise in large type, the decade and the frontier in small red), fork pairs, the budget panel
// and the counter-levers.
import type { Ctx, Comp } from './ctx';
import { sectorDef, sd } from './ctx';
import type { EffectDef, LeverRecycle, LeverView, PaceDef, SectorDef, UpgradeView } from '../types';
import { STEADY_STATE_YEARS } from '../types';
import { h, setText, setStyle, setFill, setAttr, show, cls, syncChildren, reducedMotion, replay } from './dom';
import { fmt, money, pct, num, clamp, lower, fmtEpoch, perUnit, dur, unitOne } from './fmt';
import { sound } from './sound';

/** Plain-words description of an effect, for cards and shop nodes. Unknown effect types give ''. */
export function effectText(ctx: Ctx, e: EffectDef): string {
  const def = 'sector' in e ? sectorDef(ctx, e.sector) : undefined;
  const res = lower(def?.resource.name ?? 'resource');
  const svc = unitOne(def?.service) || 'unit';
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
    case 'startFounded': {
      const a = ctx.content.sectors ? Object.values(ctx.content.sectors).flatMap((sd) => sd.applications).find((x) => x.id === e.app) : undefined;
      return `${a?.name ?? 'A use'} founded from the first minute`;
    }
    case 'institutionLoan': return `${ctx.content.institutions?.find((i) => i.id === e.id)?.name ?? 'An Institution'} on loan for the run${e.level > 1 ? ` (level ${e.level})` : ''}`;
    case 'offlineCapAdd': return `Time away counted for ${dur(e.seconds)} longer`;
    case 'orderUnlock': return e.order === 'civilService' ? 'The Civil Service takes standing orders' : e.order === 'treasury' ? 'Treasury rules for the Commons' : 'The Market takes standing orders';
    case 'commonsYieldMul': return `Commons projects give ${pct(e.value - 1)} wellbeing`;
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
  const fill = h('span', { class: 'btn-fill fillx', 'aria-hidden': 'true' });
  const cost = h('span', { class: 'btn-c num' });
  const buyLbl = kind === 'research' ? 'Commission' : 'Buy';
  const nope = () => { sound('cannotAfford', { sector: def.sector }); if (!reducedMotion()) { buy.classList.remove('nope'); void buy.offsetWidth; buy.classList.add('nope'); } };
  const tryBuy = (): boolean => {
    const r = el.getBoundingClientRect();
    const ok = ctx.act('buyUpgrade', (m, s, c) => m.buyUpgrade(s, c, def.id));
    if (ok) stamp(el, r, !!def.repeatable && num(cur?.level) + 1 < num(def.maxLevel, Infinity));
    return ok;
  };
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
      h('div', { class: 'pamph-k', text: 'A study' }), name, h('div', { class: 'pamph-rule', 'aria-hidden': 'true' }), blurb, eff, ruled, buy);
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
    setFill(fill, v.affordable ? 0 : num(ctx.state.capital) / Math.max(1e-9, v.cost), 100);
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
          // The place is named as a link to it in the picture.
          const place = a ? h('button', { class: 'place-link', type: 'button', title: `Show ${a.name} in the picture`, onclick: () => ctx.showPlace(a.id) }, a.name) : 'a new use';
          return h('p', { class: 'reach-l' + (ch > 0.0005 ? ' worse' : ch < -0.0005 ? ' better' : '') },
            'Brings ', place, ' within reach: ', h('b', { class: 'num', text: `${ch > 0.0005 ? '▲ ' : ch < -0.0005 ? '▼ ' : ''}${pct(ch)}` }), ` ${res} if founded`);
        }));
      }
      show(reach, list.length > 0);
    }
  }
  update(v0);
  return { el, update };
}

/**
 * The purchase moment on the card: it is stamped in the look's idiom (the word comes from CSS, per look). A card that
 * stays (a repeatable) is stamped where it is; one that leaves the list (bought outright) leaves a ghost of itself,
 * stamped, fading where it stood. Composited (transform and opacity), never in the way of the next tap, and nothing
 * under reduced motion.
 */
export function stamp(card: HTMLElement, rect: DOMRect, stays = false): void {
  if (reducedMotion() || !rect.width) return;
  if (stays && card.isConnected && card.getClientRects().length && !card.closest('[hidden]')) {
    replay(card, 'stamped', 900);
    return;
  }
  const g = card.cloneNode(true) as HTMLElement;
  g.classList.add('up-ghost', 'stamped');
  g.setAttribute('aria-hidden', 'true');
  g.setAttribute('inert', '');
  g.style.cssText = `position:fixed;left:${rect.left.toFixed(0)}px;top:${rect.top.toFixed(0)}px;width:${rect.width.toFixed(0)}px;margin:0;`;
  document.body.append(g);
  setTimeout(() => g.remove(), 1100);
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
    // No views at all yet (the first frame of the page, before they are worked out) is not "nothing to buy".
    show(empty, avail.length === 0 && (ctx.ups || []).length > 0);
    setText(empty, `Nothing more to buy in ${def?.name ?? 'this Industry'} for now.`);

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

export interface BudgetHooks {
  /** The Settle ceremony (a sheet): settle on yes. */
  confirmSettle(sector: string, onYes: () => void): void;
}

/** The paces a line can be drawn at for a sector (the contract's resolution: its own list, else the global one, else one
 *  implicit Gentle pace built from the decline). Reading content, not a rule. */
export function pacesFor(ctx: Ctx, id: string): PaceDef[] {
  const def = sectorDef(ctx, id), g = ctx.content.global?.steady;
  return def?.steady?.paces ?? g?.paces
    ?? [{ id: 'gentle', name: 'Gentle', declinePerDecade: def?.steady?.declinePerDecade ?? g?.budgetDeclinePerDecade ?? 0.05, dividendMul: 1 }];
}
const mulTxt = (m: number) => `×${Number.isInteger(m) ? m : m.toFixed(1)}`;

export function buildBudget(ctx: Ctx, hooks: BudgetHooks): Comp {
  const status = h('p', { class: 'bud-status num' });
  const statusSub = h('p', { class: 'bud-sub muted' });
  const line = h('p', { class: 'bud-line num muted' });
  const draw = h('button', { class: 'btn bud-draw', type: 'button', onclick: () => openPaces() });
  const settleBtn = h('button', { class: 'btn primary bud-settle', type: 'button', hidden: true, onclick: () => hooks.confirmSettle(ctx.sector, () => {
    if (!ctx.act('settle', (m, s, c) => m.settle(s, c, ctx.sector))) nope(settleBtn);
  }) });

  // The pace choice: one card per pace (name, decline a decade, the dividend multiplier, blurb), then a confirm row.
  const paceList = h('div', { class: 'paces', role: 'radiogroup', 'aria-label': 'The pace of the line' });
  const paceWarn = h('p', { class: 'pace-warn' });
  const paceGo = h('button', { class: 'btn primary', type: 'button', onclick: () => doDraw() });
  const paceBox = h('div', { class: 'pace-box', hidden: true }, h('p', { class: 'pace-q', text: 'How steeply should the line fall?' }), paceList, paceWarn,
    h('div', { class: 'm-row' }, paceGo, h('button', { class: 'btn', type: 'button', onclick: () => closePaces(true) }, 'Not now')));
  let paceSel = '', paceKey = '';

  // The sky: pressure against the clear level, and the Steady streak (clear skies, the full target, within the line).
  const skyFill = h('span', { class: 'sky-fill fillx' });
  const skyClear = h('span', { class: 'sky-clear' });
  const skyBar = h('div', { class: 'sky-bar', 'aria-hidden': 'true' }, skyFill, skyClear);
  const skyTxt = h('p', { class: 'sky-txt num' });
  const skyCode = h('p', { class: 'sky-code muted', hidden: true });
  const ssTxt = h('span', { class: 'num' });
  const ssFill = h('span', { class: 'fillx' });
  const ss = h('div', { class: 'ss' }, ssTxt, h('span', { class: 'ss-bar' }, ssFill));
  const sky = h('div', { class: 'sky-box' }, skyTxt, skyBar, skyCode, ss);

  const ledger = h('ol', { class: 'ledger', 'aria-label': 'Decades within budget' });
  const ledgerNote = h('p', { class: 'ledger-note muted', text: 'Lean decades pay a dividend; full ones pay Hindsight too.' });

  // The settled row: frozen figures, held since, the excess and the defence, and Unsettle with a confirm.
  const stTitle = h('p', { class: 'st-t' });
  const stFig = h('p', { class: 'st-fig num' });
  const stDef = h('p', { class: 'st-def num' });
  const unsetQ = h('p');
  const unsetBox = h('div', { class: 'confirm-box', hidden: true }, unsetQ,
    h('div', { class: 'm-row' },
      h('button', { class: 'btn danger', type: 'button', onclick: () => { show(unsetBox, false); show(unsetAsk, true); ctx.act('unsettle', (m, s, c) => m.unsettle(s, c, ctx.sector)); } }, 'Unsettle it'),
      h('button', { class: 'btn', type: 'button', onclick: () => { show(unsetBox, false); show(unsetAsk, true); unsetAsk.focus(); } }, 'Keep it settled')));
  const unsetAsk = h('button', { class: 'btn small', type: 'button', onclick: () => { show(unsetAsk, false); show(unsetBox, true); (unsetBox.querySelector('button') as HTMLButtonElement | null)?.focus(); } }, 'Unsettle');
  const settledRow = h('div', { class: 'settled-row', hidden: true }, stTitle, stFig, stDef, h('div', { class: 'm-row' }, unsetAsk), unsetBox);

  const live = h('div', { class: 'bud-live' }, status, statusSub, line, h('div', { class: 'm-row' }, draw, settleBtn), paceBox, sky, ledger, ledgerNote);
  const title = h('h2', { class: 'sec-t', text: 'The budget' });
  const el = h('section', { class: 'budget', 'aria-label': 'The budget', hidden: true }, h('header', { class: 'sec-h' }, title), live, settledRow);
  let ledgerKey = '', sector = '';

  function nope(b: HTMLElement): void {
    if (reducedMotion()) return;
    b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
  }
  function openPaces(): void {
    const list = pacesFor(ctx, ctx.sector);
    const cur = ctx.d?.sectors?.[ctx.sector]?.pace;
    paceSel = cur && list.some((p) => p.id === cur) ? cur : list[0]?.id ?? '';
    paceKey = '';
    renderPaces();
    show(draw, false); show(paceBox, true);
    (paceList.querySelector('[aria-checked="true"]') as HTMLButtonElement | null)?.focus();
  }
  function closePaces(focus: boolean): void { show(paceBox, false); show(draw, true); if (focus) draw.focus(); }
  function renderPaces(): void {
    const list = pacesFor(ctx, ctx.sector);
    const k = ctx.sector + list.map((p) => p.id).join(',') + paceSel;
    if (k === paceKey) return;
    paceKey = k;
    paceList.replaceChildren(...list.map((p) => h('button', {
      class: 'pace' + (p.id === paceSel ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(p.id === paceSel),
      onclick: () => { paceSel = p.id; renderPaces(); },
    }, h('span', { class: 'pace-n', text: p.name }),
      h('span', { class: 'pace-f num', text: `${pct(num(p.declinePerDecade), false)} a decade · dividend ${mulTxt(num(p.dividendMul, 1))}` }),
      p.blurb ? h('span', { class: 'pace-b', text: p.blurb }) : null)));
    const redraw = !!ctx.state.sectors?.[ctx.sector]?.budget;
    const name = list.find((p) => p.id === paceSel)?.name ?? '';
    setText(paceGo, redraw ? `Redraw at ${name}` : `Draw at ${name}`);
    setText(paceWarn, redraw ? 'Redrawing resets both streaks; decades are kept.' : 'The line is drawn at today’s use and falls from there.');
    cls(paceWarn, 'warn', redraw);
  }
  function doDraw(): void {
    const pace = paceSel || undefined;
    if (ctx.act('drawBudget', (m, s, c) => m.drawBudget(s, c, ctx.sector, pace))) closePaces(false);
    else nope(paceGo);
  }

  function update(): void {
    const revealed = !!ctx.state.flags?.revealed;
    show(el, revealed);
    if (!revealed) return;
    if (sector !== ctx.sector) { sector = ctx.sector; closePaces(false); show(unsetBox, false); show(unsetAsk, true); }
    const e = sd(ctx), def = sectorDef(ctx);
    const unit = def?.resource.unit ?? '';
    const g = ctx.content.global;
    const st = ctx.state.sectors?.[ctx.sector];

    // Settled: the whole panel is one quiet row.
    const settled = !!e?.settled && !!st?.settled;
    show(live, !settled);
    show(settledRow, settled);
    cls(el, 'is-settled', settled);
    setText(title, settled ? `${def?.name ?? 'This Industry'}, settled` : 'The budget');
    if (settled && st?.settled) {
      const since = Math.floor(num(st.settled.sinceYear, num(ctx.model.yearAt(ctx.state, ctx.content, st.settled.since))));
      setText(stTitle, `Held since ${since}. Its levers are retired; Mandate defends it as the world grows into it.`);
      setText(stFig, `${fmt(st.settled.R)} ${unit}/s · ${money(st.settled.income)}/s income · ${def?.pressure.name ?? 'Pressure'} ${pct(num(e?.pressureFraction), false)}, frozen`);
      const ex = num(e?.settleExcess), dfc = num(e?.settleDefence);
      setText(stDef, dfc > 0 ? `The world has grown ${pct(ex, false)} into it: defence ${fmt(dfc)} Mandate/s` : `Excess ${pct(ex, false)}: within what it tolerates, no defence to pay`);
      cls(stDef, 'over', dfc > 0);
      setText(unsetQ, `Unsettle ${def?.name ?? 'it'}? Its dividend stops, its levers stay at nothing, both streaks start again, and the demand the world grew into arrives at once.`);
      return;
    }

    const dec = num(g?.steady?.decadeYears, 10) || 10;
    const bR = e?.budgetR;
    const has = bR != null;
    const dw = num(e?.decadeWellbeing, num(g?.wellbeingTarget));
    const tgt = num(g?.wellbeingTarget);
    const sdi = e?.standingDrawIn;
    if (!has && sdi != null) setText(status, `A standing cap is in force with no line to hold it to yet. Its line is drawn in ${fmt(Math.ceil(num(sdi)))} years; drawing it, or tightening the cap, draws it now.`);
    else if (!has) setText(status, `No line drawn for ${def?.name ?? 'this Industry'}. Nothing counts towards a decade or Steady State until one is.`);
    else if (e?.withinBudget) setText(status, e.decoupling ? `Within budget · ${Math.floor(num(e.steadyYears) % dec)} of ${dec} years to the next decade` : `Within budget, but wellbeing is under ${fmt(dw)}: the years do not count.`);
    else setText(status, `Over budget by ${pct(bR > 0 ? num(e?.resourceUse) / bR - 1 : NaN, false)}`);
    cls(status, 'ok', !!e?.decoupling);
    cls(status, 'over', has && !e?.withinBudget);
    setText(statusSub, has ? (dw < tgt - 1e-9 ? `A decade counts with wellbeing at least ${fmt(dw)}, as on the day the line was drawn.` : `A decade counts with wellbeing at the target, ${fmt(tgt)}.`) : '');
    show(statusSub, has);
    const b = st?.budget;
    const held = b?.heldAt != null;
    const pace = pacesFor(ctx, ctx.sector).find((p) => p.id === e?.pace);
    setText(line, has ? `The line: ${fmt(bR)} ${unit}/s, drawn in ${b?.drawnYear ?? '—'}${pace ? `, ${pace.name}` : ''}: ${held ? 'held level since Steady State' : `falling ${pct(num(pace?.declinePerDecade, 0.05), false)} a decade`}.` : '');
    cls(line, 'held', held);
    show(line, has);
    setText(draw, has ? 'Redraw the line' : 'Draw the line');
    setAttr(draw, 'aria-disabled', num(e?.resourceUse) > 0 && !ctx.d?.pendingReckoning ? null : 'true');
    show(settleBtn, !!e?.canSettle);
    setText(settleBtn, `Settle ${def?.name ?? ''}`.trim());
    if (!paceBox.hidden) renderPaces();

    // The sky: pressure as a fraction of collapse, with the clear level marked (clearP is absolute; ÷ collapseAt to place it).
    const pf = clamp(num(e?.pressureFraction), 0, 1);
    const cp = e?.clearP;
    const cpf = cp != null && def ? clamp(cp / Math.max(1e-12, def.collapseAt), 0, 1) : null;
    setFill(skyFill, pf, 200);
    show(skyClear, cpf != null);
    if (cpf != null) setStyle(skyClear, 'left', (cpf * 100).toFixed(1) + '%');
    const pName = def?.pressure.name ?? 'Pressure';
    if (cpf == null) setText(skyTxt, `${pName} ${pct(pf, false)}. The clear level is set when a line is drawn.`);
    else if (e?.clear) setText(skyTxt, `Clear skies: ${pName.toLowerCase()} ${pct(pf, false)}, under the clear level of ${pct(cpf, false)} and not rising.`);
    else if (pf > cpf) setText(skyTxt, `${pName} ${pct(pf, false)}: ${fmt(Math.max(1, Math.round((pf - cpf) * 100)))} points above the clear level (${pct(cpf, false)}).`);
    else setText(skyTxt, `${pName} ${pct(pf, false)}, under the clear level (${pct(cpf, false)}) but still rising.`);
    cls(sky, 'clear', !!e?.clear);
    // An Industry with nothing to absorb its pressure (Code) clears only by deletion: no sink line to draw.
    const noSink = cp != null && e?.sinkR == null && def ? (def.absorption ?? 0) <= 0 : false;
    show(skyCode, noSink);
    setText(skyCode, `Deleted down, not absorbed: nothing takes ${pName.toLowerCase()} away here but deletion.`);
    const cy = Math.floor(num(e?.clearYears));
    setText(ssTxt, cy >= STEADY_STATE_YEARS ? `Steady State: ${STEADY_STATE_YEARS} years of clear skies served` : `Clear skies: ${cy} of ${STEADY_STATE_YEARS} years to Steady State`);
    setFill(ssFill, cy / STEADY_STATE_YEARS, 100);
    cls(ss, 'on', !!e?.sinkHeld);
    show(sky, has || cpf != null);

    const decs = st?.decadesWithin ?? [];
    const lean = st?.decadesLean ?? [];
    const lk = ctx.sector + ':' + decs.join(',') + ':' + lean.join(',');
    if (lk !== ledgerKey) {
      ledgerKey = lk;
      ledger.replaceChildren(...(decs.length
        ? decs.map((y, i) => h('li', { class: 'num' + (lean[i] ? ' lean' : ' full') }, `${Math.floor(num(y) / 10) * 10}s `,
          h('span', { class: 'tick', text: '✓', 'aria-label': 'within budget' }), h('span', { class: 'dk', text: lean[i] ? ' lean' : ' full' })))
        : [h('li', { class: 'none', text: 'No decade within budget yet.' })]));
    }
    show(ledgerNote, has);
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
  // A lever in force stands in the world (the scene draws it as a thing): a way to go and look.
  const seeIt = h('button', { class: 'place-link lev-see', type: 'button', hidden: true, onclick: () => ctx.showPlace(null) }, 'in the picture ↑');
  const lowerBtn = h('button', { class: 'btn lev-lower', type: 'button', onclick: () => {
    const lv = num(cur?.level);
    if (lv > 0) ctx.act('setLever', (m, s, c) => m.setLever(s, c, def.id, lv - 1));
  } }, h('span', { class: 'btn-l', text: 'Lower' }));
  const raiseC = h('span', { class: 'btn-c num' });
  const raiseL = h('span', { class: 'btn-l' });
  const raise = h('button', { class: 'btn lev-raise', type: 'button', onclick: () => {
    const lv = num(cur?.level);
    if (!ctx.act('setLever', (m, s, c) => m.setLever(s, c, def.id, lv + 1))) {
      sound('cannotAfford', { sector: def.sector });
      if (!reducedMotion()) { raise.classList.remove('nope'); void raise.offsetWidth; raise.classList.add('nope'); }
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

  // Revenue recycling (duty and cap levers offering more than one destination), worded by the model (recycleChoices).
  const choices0 = Array.isArray(v0.recycleChoices) && v0.recycleChoices.length ? v0.recycleChoices
    : (v0.recycleOptions || []).map((o) => ({ option: o, name: RECYCLE_LABEL[o] ?? o, blurb: '', available: true }));
  const opts = choices0.map((x) => x.option);
  const recBtns = new Map<LeverRecycle, HTMLButtonElement>();
  const recNote = h('p', { class: 'rec-note' });
  const rec = h('div', { class: 'recycle', hidden: opts.length < 2 },
    h('span', { class: 'rec-k', id: `rec-${def.id}`, text: 'Revenue goes' }),
    h('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': `rec-${def.id}` }, ...choices0.map((ch) => {
      const o = ch.option;
      const b = h('button', { class: 'seg-b', type: 'button', role: 'radio', 'aria-checked': 'false',
        onclick: () => { if (b.getAttribute('aria-disabled') !== 'true') ctx.act('setLeverRecycle', (m, s, c) => m.setLeverRecycle(s, c, def.id, o)); } }, ch.name);
      recBtns.set(o, b);
      return b;
    })), recNote);

  const el = h('article', { class: 'lever' },
    h('header', { class: 'lev-h' }, h('h3', { class: 'lev-name', text: def.name }), h('span', { class: 'pip-wrap' }, pips, pipMore)),
    h('p', { class: 'lev-blurb', text: def.blurb }),
    h('p', { class: 'lev-catch' }, h('span', { class: 'lev-catch-k', text: 'The catch. ' }), def.catch),
    h('div', { class: 'lev-now' }, h('span', { class: 'muted', text: 'In force: ' }), now, upk, seeIt),
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
    show(seeIt, lv > 0);
    // A cap in force with no budget line yet does nothing until the line is drawn (standingDrawYears, or a Tighten).
    const noLine = def.kind === 'cap' && lv > 0 && !ctx.state.sectors?.[def.sector]?.budget;
    show(noLineEl, noLine);
    if (noLine) {
      const yrs = sectorDef(ctx, def.sector)?.steady?.standingDrawYears ?? ctx.content.global?.steady?.standingDrawYears;
      setText(noLineEl, `No line yet, so the cap holds nothing back. One is drawn once the Industry has been open ${yrs ? `${fmt(yrs)} years` : 'a while'}; tightening draws it now.`);
    }
    // Levy revenue (never income) for duty and cap levers in force.
    const isLevy = def.kind === 'duty' || def.kind === 'cap';
    const lr = num(sd(ctx, def.sector)?.levyRevenue);
    const showLevy = isLevy && lv > 0;
    show(levy, showLevy);
    if (showLevy) setText(levy, `Levy ${money(lr)}/s${v.recycle === 'dividend' ? ', paid back per head' : v.recycle === 'treasury' ? ', to the Treasury' : v.recycle === 'commons' ? ', to the Commons fund' : ''}`);
    if (opts.length >= 2) {
      const chs = Array.isArray(v.recycleChoices) ? v.recycleChoices : [];
      const fromRun = num(ctx.content.global?.commons?.fromReckoning, 2) + 1;
      for (const [o, b] of recBtns) {
        const on = v.recycle === o;
        const ch = chs.find((x) => x.option === o);
        const off = !!ch && !ch.available && !on;
        setAttr(b, 'aria-checked', String(on)); cls(b, 'on', on);
        setAttr(b, 'aria-disabled', off ? 'true' : null);
        setAttr(b, 'title', off ? `Opens with the Commons, from run ${fromRun}` : null);
      }
      const cur = chs.find((x) => x.option === v.recycle);
      const share = num(ctx.content.global?.levy?.mandateShare, 0.1);
      const locked = chs.find((x) => !x.available && x.option !== v.recycle);
      setText(recNote, (cur?.blurb || (v.recycle === 'dividend'
        ? 'Paid back per head and spent like income: wellbeing up, so more people, and more demand.'
        : `${pct(share, false)} of it becomes Mandate; the rest is general taxation.`))
        + (locked ? ` ${locked.name}: opens with the Commons, from run ${fromRun}.` : ''));
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
    setText(empty, `No levers to pull in ${sectorDef(ctx)?.name ?? 'this Industry'} yet.`);
  }
  return { el, update };
}


