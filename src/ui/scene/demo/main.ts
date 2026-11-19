// Standalone demo for the scene engine: hand-made SceneViews, scrubbable inputs, a 60-second auto-play run, and a
// strip mode for screenshots (#strip=steam). Built by tools/scene-demo.ts into dist/scene-demo.html.
import { createScene } from '../engine';
import { spot, SPOT_OF, SPOT_KINDS } from '../spots';
import { injectSceneCss } from '../css';
import type { SceneView, SceneApp, SceneHandle } from '../types';

interface Ind {
  id: string; name: string; look: string; service: [string, string]; resource: string; pressure: string; crisis: string; flow?: boolean;
  apps: [string, string, string, number][]; // icon, name, blurb, cost
}

const IND: Ind[] = [
  { id: 'steam', name: 'Steam', look: 'ledger', service: ['Motive power', 'hp'], resource: 'Coal', pressure: 'Smog', crisis: 'The Black Fog', apps: [
    ['pump', 'Mine pumping', 'Keeps the pit dry. Dry pits go deeper.', 0], ['mill', 'Cotton mills', 'Now they can be anywhere there is coal.', 60],
    ['winder', 'Winding engines', 'Haul the coal up as fast as the pumps let the men dig it.', 180], ['train', 'Railways', 'Coal hauling coal to the people who burn coal.', 900],
    ['ship', 'Steamships', 'The trade winds are now optional.', 4000], ['plough', 'Steam ploughing', 'An engine at each headland, a plough between.', 12000]] },
  { id: 'light', name: 'Light', look: 'gaslight', service: ['Light', 'klm·h'], resource: 'Town gas & current', pressure: 'Coal smoke', crisis: 'The Pea-Souper', apps: [
    ['lamp', 'Street lamps', 'The night, abolished street by street.', 0], ['factory-night', 'Night shifts', 'The mill no longer waits for the sun.', 400],
    ['tram', 'Electric trams', 'The suburbs, connected.', 2000], ['house', 'Lit homes', 'Reading after dark becomes a habit.', 6000], ['sign', 'Shop signs', 'Selling to people who are only passing.', 20000]] },
  { id: 'motion', name: 'Motion', look: 'chrome', service: ['Vehicle-miles', 'veh·mi'], resource: 'Oil', pressure: 'Exhaust', crisis: 'The Summer Smog', apps: [
    ['van', 'Delivery vans', 'The shop comes to you.', 0], ['car', 'Commuting', 'Living here, working there.', 3000],
    ['mall', 'Out-of-town shopping', 'Free parking. Ample parking.', 9000], ['suburb', 'Suburbs', 'A lawn each.', 25000], ['plane', 'Package holidays', 'A fortnight in the sun, by Tuesday.', 80000]] },
  { id: 'compute', name: 'Compute', look: 'terminal', service: ['Computation', 'PFLOP'], resource: 'Power, water & chips', pressure: 'Carbon', crisis: 'The Heat Dome', apps: [
    ['sheet', 'Spreadsheets', 'Every business, modelled.', 0], ['globe', 'The web', 'Everything, linked.', 5000], ['cloud', 'Cloud storage', 'Keep everything. Forever.', 20000],
    ['play', 'Streaming', 'Whatever you like, whenever.', 60000], ['brain', 'Model training', 'Bigger is better, so far.', 300000]] },
  { id: 'code', name: 'Code', look: 'agentic', service: ['Working features', 'features'], resource: 'Human attention', pressure: 'Code stock', crisis: 'The Great Outage', flow: true, apps: [
    ['wrench', 'Internal tools', 'The spreadsheet, promoted.', 0], ['phone-app', 'Throwaway personal apps', 'Built Tuesday, forgotten Friday.', 2000],
    ['scroll', 'Legacy rewrites', 'Same system, new bugs.', 8000], ['chatbot', 'Chatbots on everything', 'Ask the toaster.', 20000], ['robots', 'Agents writing for agents', 'Nearly unsaturable.', 60000]] },
  { id: 'iron', name: 'Iron (no scene yet)', look: 'ledger', service: ['Iron', 't'], resource: 'Ore', pressure: 'Slag', crisis: 'The Slag Slide', apps: [
    ['furnace', 'Blast furnaces', 'Hot blast.', 0], ['rolling-mill', 'Rolling mills', 'Rails by the mile.', 500], ['bridge', 'Iron bridges', 'Span anything.', 3000], ['mystery', 'Something new', 'Unknown icon.', 9000]] },
];
const LEVERS: [string, string][] = [['duty', 'Fuel duty'], ['cap', 'Hard cap'], ['sufficiency', 'Sufficiency'], ['substitution', 'Substitution'],
  ['circularity', 'Circularity'], ['greenSpending', 'Green spending'], ['deletion', 'Deletion'], ['reviewGate', 'Review gates'], ['sharedLibs', 'Shared libraries']];

interface DemoState {
  ind: number; status: SceneApp['status'][]; adoption: number[]; stage: number; pressure: number; reserve: number; pop: number; pace: number;
  levers: Record<string, boolean>; crises: number; reckoning: '' | 'exhausted' | 'collapse' | 'chosen'; decoupling: boolean; steadyProgress: number; steady: boolean;
  look: string;
  /* M2 */
  clear: boolean; clearProgress: number; pressureToClear: number | null; settled: boolean; commons: number[]; landmark: string;
  /* M3 (each absent = its feature off) */
  m3?: Partial<Pick<SceneView, 'seams' | 'load' | 'travel' | 'free' | 'figures' | 'watch'>> & { bite?: Record<string, number> };
}

/** M3 demo data: Light's day (an evening peak and the small hours' hollow; `fill` 0–1 = how far night uses fill it). */
export function lightDay(fill: number): number[] {
  const base = [0.18, 0.14, 0.12, 0.12, 0.14, 0.22, 0.36, 0.5, 0.48, 0.42, 0.4, 0.4, 0.42, 0.4, 0.4, 0.44, 0.58, 0.82, 1, 0.96, 0.84, 0.62, 0.4, 0.26];
  return base.map((h, i) => { const night = i < 6 || i > 21 ? 1 : 0; return Math.round(Math.min(1, h + night * fill * (0.62 - h * 0.5)) * 100) / 100; });
}
/** Each Industry's M3 state at a preset ('early' … 'crisis'), as the adapter would fill it with every feature on. */
export function m3For(id: string, t: number): NonNullable<DemoState['m3']> {
  switch (id) {
    case 'steam': return { seams: { total: 4, sunk: t < 0.3 ? 0 : t < 0.6 ? 1 : t < 0.9 ? 2 : 3, next: t >= 0.2 }, figures: t > 0.4 ? ['correspondent'] : [] };
    case 'light': { const h = lightDay(Math.min(1, t * 1.1)); return { load: { hours: h, factor: Math.round(h.reduce((a, b) => a + b, 0) / 24 * 100) / 100 }, figures: t > 0.4 ? ['fenwick'] : [] }; }
    case 'motion': return { travel: { speed: Math.max(0.15, 1 - t * 0.9), sprawl: Math.min(1, t * 1.05), sprawlShare: t * 0.6, freeSpeed: 1 + t * 1.2 }, figures: t > 0.4 ? ['pryce'] : [], bite: t > 0.6 ? { measure: 0.7 } : {} };
    case 'compute': return { free: { apps: t > 0.3 ? ['compute.globe', 'compute.play'] : t > 0.1 ? ['compute.globe'] : [] }, figures: t > 0.4 ? ['minister'] : [] };
    case 'code': return { figures: t > 0.4 ? ['whitlow'] : [] };
    default: return {};
  }
}

/** The Commons the content lane writes, by Industry (the general 'holiday' shows in every town), and landmarks. */
const COMMONS: Record<string, [string, string][]> = {
  steam: [['baths', 'Baths and wash-houses'], ['park', 'People’s park'], ['institute', 'Mechanics’ institute'], ['holiday', 'Bank holidays']],
  light: [['library', 'Free library'], ['clock', 'Town clock'], ['allotments', 'Allotments'], ['holiday', 'Bank holidays']],
  motion: [['buses', 'Municipal buses'], ['shortweek', 'Shorter working week'], ['holiday', 'Bank holidays']],
  compute: [['repair', 'Repair cafés'], ['holiday', 'Bank holidays']],
  code: [['holiday', 'Bank holidays']],
  iron: [['mystery', 'A civic mystery']],
};
export const LANDMARKS: Record<string, string[]> = { steam: ['deepShaft', 'millTown', 'chapel', 'orchard', 'viaduct'], light: ['gasholder'] };

function blank(ind: number): DemoState {
  const n = IND[ind].apps.length;
  return { ind, status: Array.from({ length: n }, (_, i) => (i === 0 ? 'available' : 'hidden')), adoption: Array(n).fill(0), stage: 0, pressure: 0, reserve: 1,
    pop: 0, pace: 0, levers: {}, crises: 0, reckoning: '', decoupling: false, steadyProgress: 0, steady: false, look: '',
    clear: false, clearProgress: 0, pressureToClear: null, settled: false, commons: [], landmark: '' };
}

export const PRESETS: Record<string, (ind: number) => DemoState> = {
  empty: (i) => blank(i),
  early: (i) => ({ ...blank(i), status: IND[i].apps.map((_, k) => (k === 0 ? 'founded' : k === 1 ? 'available' : 'hidden')), adoption: IND[i].apps.map((_, k) => (k === 0 ? 0.3 : 0)), pressure: 0.05, reserve: 0.97, pop: 0.12, pace: 0.12 }),
  mid: (i) => ({ ...blank(i), status: IND[i].apps.map((_, k) => (k < 3 ? 'founded' : k === 3 ? 'available' : 'hidden')), adoption: IND[i].apps.map((_, k) => [0.75, 0.5, 0.2][k] ?? 0), stage: 1, pressure: 0.3, reserve: 0.78, pop: 0.45, pace: 0.45 }),
  late: (i) => ({ ...blank(i), status: IND[i].apps.map(() => 'founded'), adoption: IND[i].apps.map((_, k) => [0.97, 0.9, 0.8, 0.65, 0.5, 0.35][k] ?? 0.3), stage: 2, pressure: 0.6, reserve: 0.45, pop: 0.8, pace: 0.8, crises: 1 }),
  crisis: (i) => ({ ...PRESETS.late(i), stage: 3, adoption: IND[i].apps.map((_, k) => [1, 0.97, 0.9, 0.8, 0.7, 0.55][k] ?? 0.5), pressure: 0.88, reserve: 0.28, pop: 0.95, pace: 1, crises: 2 }),
  collapse: (i) => ({ ...PRESETS.crisis(i), pressure: 1.05, reserve: 0.08, crises: 3, reckoning: 'collapse' }),
  steady: (i) => ({ ...blank(i), status: IND[i].apps.map(() => 'founded'), adoption: IND[i].apps.map((_, k) => [0.85, 0.75, 0.62, 0.5, 0.42, 0.3][k] ?? 0.3), stage: 3, pressure: 0.14, reserve: 0.55, pop: 0.7, pace: 0.35,
    levers: { duty: true, cap: true, substitution: true, sufficiency: true, greenSpending: true, deletion: true, sharedLibs: true }, decoupling: true, steadyProgress: 1, steady: true, crises: 2 }),
  /* M2 */
  clearing: (i) => ({ ...PRESETS.late(i), pressure: 0.22, pressureToClear: 0, clear: true, clearProgress: 0.2, decoupling: true, crises: 2,
    levers: { duty: true, cap: true, sufficiency: true, deletion: true } }),
  settled: (i) => ({ ...PRESETS.steady(i), settled: true, steady: true, clear: true, clearProgress: 1, commons: (COMMONS[IND[i].id] ?? []).map(() => 2) }),
  commons: (i) => ({ ...PRESETS.mid(i), stage: 2, pop: 0.7, commons: (COMMONS[IND[i].id] ?? []).map((_, k) => 1 + (k % 3)), landmark: (LANDMARKS[IND[i].id] ?? [''])[0] }),
  /* M3: the same states with every M3 feature on */
  earlyM3: (i) => ({ ...PRESETS.early(i), m3: m3For(IND[i].id, 0.15) }),
  midM3: (i) => ({ ...PRESETS.mid(i), m3: m3For(IND[i].id, 0.45) }),
  lateM3: (i) => ({ ...PRESETS.late(i), m3: m3For(IND[i].id, 0.75) }),
  crisisM3: (i) => ({ ...PRESETS.crisis(i), m3: m3For(IND[i].id, 1) }),
  /* Motion's sprawl that stays: demand has fallen (adoption down, traffic thin) but the suburbs are still there */
  thinnedM3: (i) => ({ ...PRESETS.late(i), adoption: IND[i].apps.map(() => 0.18), pressure: 0.3, pace: 0.3, m3: { ...m3For(IND[i].id, 0.9), travel: { speed: 0.95, sprawl: 0.85, sprawlShare: 0.9, freeSpeed: 2 } } }),
  proprietorM3: (i) => ({ ...PRESETS.late(i), m3: { ...m3For(IND[i].id, 0.75), figures: ['proprietor'], watch: 0.8 } }),
  endingM3: (i) => ({ ...PRESETS.steady(i), clear: true, clearProgress: 1, m3: { ...m3For(IND[i].id, 0.6), figures: ['correspondent', 'whitlow', 'fenwick', 'pryce', 'minister', 'proprietor'], watch: 0.3 } }),
};

export function viewOf(s: DemoState): SceneView {
  const ind = IND[s.ind];
  return {
    sectorId: ind.id, sectorName: ind.name, look: s.look || ind.look, serviceName: ind.service[0], serviceUnit: ind.service[1],
    resourceName: ind.resource, pressureName: ind.pressure, crisisName: ind.crisis, resourceKind: ind.flow ? 'flow' : 'stock',
    apps: ind.apps.map(([icon, name, blurb, cost], k) => ({
      id: `${ind.id}.${icon}`, name, icon, blurb, status: s.status[k], adoption: s.status[k] === 'founded' ? s.adoption[k] : 0,
      demand: s.adoption[k] * 120 * Math.pow(3, k), foundCost: cost, canFound: cost <= 1000 || k % 2 === 0, affordFraction: 0.6, visibleBelow: 1 / (k + 1),
    })),
    stage: s.stage, etaFold: Math.pow(2, s.stage * 1.5), rFold: Math.pow(16, s.pace), pace: s.pace, reserveFraction: s.reserve,
    pressureFraction: s.pressure, nextCrisisFraction: 0.65, population: Math.exp(s.pop * Math.log(12)), popFraction: s.pop, crises: s.crises,
    levers: [...LEVERS.filter(([k]) => s.levers[k] || (s.m3?.bite?.[k] ?? 0) > 0), ...(s.m3?.bite?.measure ? [['measure', 'Fuel-economy standard'] as [string, string]] : [])]
      .map(([kind, name]) => ({ id: `${ind.id}.${kind}`, kind, level: 1, name, ...(s.m3?.bite?.[kind] ? { bite: s.m3.bite[kind] } : {}) })),
    decoupling: s.decoupling, steadyProgress: s.steadyProgress, steady: s.steady,
    reckoning: s.reckoning ? { cause: s.reckoning, here: true } : null, year: null,
    clear: s.clear, clearProgress: s.clearProgress, pressureToClear: s.pressureToClear ?? undefined, settled: s.settled, settledYear: s.settled ? 1841 + s.ind * 40 : null,
    commons: (COMMONS[ind.id] ?? []).map(([icon, name], k) => ({ id: `${ind.id}.c.${icon}`, icon, name, level: s.commons[k] ?? 0 })).filter((c) => c.level >= 1),
    landmark: s.landmark || null,
    ...(s.m3 ? { seams: s.m3.seams, load: s.m3.load, travel: s.m3.travel, free: s.m3.free, figures: s.m3.figures, watch: s.m3.watch } : {}),
  };
}

/** The demo's run, empty valley to collapse, at time t (0–1). */
export function runAt(ind: number, t: number): DemoState {
  const s = blank(ind);
  const n = IND[ind].apps.length;
  for (let k = 0; k < n; k++) {
    const tk = 0.02 + k * (0.75 / n);
    s.status[k] = t >= tk ? 'founded' : t >= tk - 0.06 || k === 0 ? 'available' : 'hidden';
    s.adoption[k] = t >= tk ? 1 / (1 + Math.exp(-(t - tk - 0.12) * 14)) : 0;
  }
  s.stage = Math.min(3, Math.floor(t * 4.2));
  s.pressure = Math.min(1.05, Math.pow(t, 1.5) * 1.08);
  s.reserve = Math.max(0.05, 1 - Math.pow(t, 1.3) * 0.95);
  s.pop = Math.min(1, t * 1.1);
  s.pace = Math.min(1, t * 1.2);
  s.crises = t > 0.85 ? 3 : t > 0.65 ? 2 : t > 0.4 ? 1 : 0;
  s.reckoning = t >= 0.99 ? 'collapse' : '';
  return s;
}

/* ------------------------------------------------------------------ */
/* Strip mode: one industry, seven stages, frozen (for screenshots)    */
/* ------------------------------------------------------------------ */
function stripMode(indId: string): void {
  const i = Math.max(0, IND.findIndex((x) => x.id === indId));
  document.documentElement.dataset.era = IND[i].look;
  document.documentElement.dataset.theme = IND[i].look;
  document.body.classList.add('strip');
  const wrap = document.getElementById('app')!;
  wrap.innerHTML = '';
  const m2 = /m2/.test(location.hash), m3 = /m3/.test(location.hash);
  for (const name of m3 ? ['earlyM3', 'midM3', 'lateM3', 'crisisM3', 'thinnedM3', 'proprietorM3', 'endingM3'] : m2 ? ['clearing', 'steady', 'settled', 'commons'] : ['empty', 'early', 'mid', 'late', 'crisis', 'collapse', 'steady']) {
    const fig = document.createElement('figure');
    const cap = document.createElement('figcaption');
    cap.textContent = name;
    const host = document.createElement('div');
    fig.append(cap, host);
    wrap.append(fig);
    const sc = createScene(host, { reducedMotion: true });
    const st = PRESETS[name](i);
    // The crisis frame shows the fog: bump crises after a first update.
    if (name === 'crisis' || name === 'crisisM3') { sc.update(viewOf({ ...st, crises: st.crises - 1 })); }
    sc.update(viewOf(st));
  }
}

/* ------------------------------------------------------------------ */
/* Interactive mode                                                    */
/* ------------------------------------------------------------------ */
function interactive(): void {
  const app = document.getElementById('app')!;
  const host = document.createElement('div');
  host.className = 'scene-host';
  const log = document.createElement('p');
  log.className = 'log';
  const panel = document.createElement('div');
  panel.className = 'panel';
  app.append(host, log, panel);

  let s: DemoState = PRESETS.early(0);
  let scene: SceneHandle = createScene(host, {
    onSelect: (id) => { log.textContent = id ? `Selected ${id}` : 'Selection cleared'; },
    onFound: (id) => {
      const k = IND[s.ind].apps.findIndex(([icon]) => `${IND[s.ind].id}.${icon}` === id);
      if (k >= 0) { s.status[k] = 'founded'; s.adoption[k] = 0.02; if (s.status[k + 1] === 'hidden') s.status[k + 1] = 'available'; render(); syncPanel(); }
      log.textContent = `onFound(${id}) — the host would call model.foundApp`;
    },
  });
  let playing = 0, t0 = 0, seq = 0;
  const fire = (kind: string, x: Record<string, unknown>) => {
    document.documentElement.dataset.era = s.look || IND[s.ind].look;
    scene.update({ ...viewOf(s), events: [{ seq: ++seq, kind, sector: IND[s.ind].id, ...x }] });
    log.textContent = `event ${seq}: ${kind}`;
  };

  const render = () => {
    // Only on change: writing the same data attribute on <html> still restyles the whole page.
    const lk = s.look || IND[s.ind].look, de = document.documentElement;
    if (de.dataset.era !== lk) de.dataset.era = lk;
    if (de.dataset.theme !== lk) de.dataset.theme = lk;
    scene.update(viewOf(s));
  };

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string)[]) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) (e as unknown as Record<string, unknown>)[k] = v;
    e.append(...kids);
    return e;
  };
  const slider = (label: string, get: () => number, set: (v: number) => void, min = 0, max = 1, step = 0.01) => {
    const out = el('output');
    const inp = el('input', { type: 'range', min: String(min), max: String(max), step: String(step) }) as HTMLInputElement;
    const sync = () => { inp.value = String(get()); out.textContent = (+get()).toFixed(2); };
    inp.addEventListener('input', () => { set(+inp.value); out.textContent = (+inp.value).toFixed(2); stop(); render(); });
    syncers.push(sync);
    return el('label', { className: 'row' }, el('span', {}, label), inp, out);
  };
  const check = (label: string, get: () => boolean, set: (v: boolean) => void) => {
    const inp = el('input', { type: 'checkbox' }) as HTMLInputElement;
    syncers.push(() => { inp.checked = get(); });
    inp.addEventListener('change', () => { set(inp.checked); stop(); render(); });
    return el('label', { className: 'chk' }, inp, label);
  };
  let syncers: (() => void)[] = [];
  const syncPanel = () => syncers.forEach((f) => f());

  function buildPanel(): void {
    syncers = [];
    panel.replaceChildren();
    const ind = el('select') as HTMLSelectElement;
    IND.forEach((x, i) => ind.append(el('option', { value: String(i), textContent: `${x.name} (${x.look})` })));
    ind.value = String(s.ind);
    ind.addEventListener('change', () => { stop(); s = PRESETS.early(+ind.value); scene.setSector(IND[s.ind].id); buildPanel(); render(); });
    const look = el('select') as HTMLSelectElement;
    ['', 'ledger', 'gaslight', 'chrome', 'terminal', 'agentic', 'unknown'].forEach((x) => look.append(el('option', { value: x, textContent: x || 'look: industry default' })));
    look.value = s.look;
    look.addEventListener('change', () => { s.look = look.value; render(); });
    const presets = el('div', { className: 'btns' });
    for (const name of Object.keys(PRESETS)) {
      presets.append(el('button', { type: 'button', textContent: name, onclick: () => { stop(); s = { ...PRESETS[name](s.ind), look: s.look }; syncPanel(); render(); } }));
    }
    const play = el('button', { type: 'button', textContent: '▶ Auto-play a run (60 s)', className: 'play', onclick: () => start() });
    const crisis = el('button', { type: 'button', textContent: 'Fire a crisis', onclick: () => { s.crises++; render(); } });
    const evb = el('div', { className: 'btns' });
    const evs: [string, () => void][] = [
      ['Market buys', () => fire('upgradeBought', { id: 'u' + seq, by: 'market' })],
      ['Market founds', () => { const k = s.status.findIndex((x) => x !== 'founded'); if (k >= 0) { s.status[k] = 'founded'; s.adoption[k] = 0.05; fire('appFounded', { id: `${IND[s.ind].id}.${IND[s.ind].apps[k][0]}`, by: 'market' }); } }],
      ['Stage up', () => { s.stage = (s.stage + 1) % 4; fire('stageReached', { n: s.stage }); }],
      ['First backfire', () => fire('backfire', {})],
      ['Decade', () => fire('decade', { n: 1, id: 'full' })],
      ['Lever enacted', () => { s.levers.duty = true; fire('leverEnacted', { id: `${IND[s.ind].id}.duty`, n: 1 }); }],
      ['Clear skies', () => { s.clear = true; s.pressureToClear = 0; s.pressure = Math.min(s.pressure, 0.2); fire('clearSkies', {}); }],
      ['Settle', () => { s.settled = true; s.steady = true; s.clear = true; s.clearProgress = 1; fire('settled', {}); }],
      ['Commons +1', () => { const list = COMMONS[IND[s.ind].id] ?? []; const k = s.commons.length < list.length ? s.commons.length : list.length - 1; s.commons[k] = Math.min(3, (s.commons[k] ?? 0) + 1); fire('commonsBuilt', { id: `${IND[s.ind].id}.c.${list[k]?.[0]}`, n: s.commons[k] }); }],
      ['Landmark', () => { const l = LANDMARKS[IND[s.ind].id] ?? []; s.landmark = l.length ? l[(l.indexOf(s.landmark) + 1) % l.length] : ''; render(); }],
      ['Industry opens', () => fire('sectorOpened', {})],
      /* M3 */
      ['M3: all features on', () => { s.m3 = m3For(IND[s.ind].id, 0.75); render(); }],
      ['M3: sink a seam', () => { const sm = s.m3?.seams ?? { sunk: 0, total: 4, next: true }; s.m3 = { ...(s.m3 ?? {}), seams: { ...sm, sunk: Math.min(sm.total, sm.sunk + 1) } }; fire('seamSunk', { id: 'seam' + seq, n: s.m3.seams!.sunk, label: ['The Barnsley Bed', 'The Silkstone', 'The Deep Hard', 'The Black Shale'][Math.min(3, s.m3.seams!.sunk - 1)] }); }],
      ['M3: a lever bites back', () => { const k = IND[s.ind].id === 'motion' ? 'measure' : 'duty'; s.m3 = { ...(s.m3 ?? {}), bite: { [k]: 0.6 } }; fire('biteBack', { id: `${IND[s.ind].id}.${k}` }); }],
      ['M3: a letter arrives', () => { s.m3 = { ...(s.m3 ?? {}), figures: [m3For(IND[s.ind].id, 1).figures?.[0] ?? 'correspondent'] }; render(); }],
      ['M3: letter answered', () => { s.m3 = { ...(s.m3 ?? {}), figures: (s.m3?.figures ?? []).filter((k) => k === 'proprietor') }; render(); }],
      ['M3: the Proprietor’s Day', () => { s.m3 = { ...(s.m3 ?? {}), figures: [...(s.m3?.figures ?? []), 'proprietor'], watch: 0.8 }; render(); }],
      ['M3: the ending', () => { s = { ...PRESETS.endingM3(s.ind), look: s.look }; fire('ending', { id: 'steadyAll' }); }],
      ['M3: frozen Reckoning still', async () => { const { renderStill } = await import('../engine'); const svg = await renderStill(viewOf({ ...PRESETS.crisisM3(s.ind), reckoning: 'collapse' }), { width: 600, height: 400 }); const w = window.open(''); w?.document.write(svg as string); }],
      ['Highlight a place', () => scene.highlight?.({ app: `${IND[s.ind].id}.${IND[s.ind].apps[1][0]}` })],
      ['Clear highlight', () => scene.highlight?.(null)],
      ['Replay a run (10 s)', () => { const vs: SceneView[] = []; for (let t = 0; t <= 1; t += 1 / 60) vs.push(viewOf(runAt(s.ind, t))); scene.replay?.(vs, { seconds: 10 }); }],
      ['Save picture', async () => { const { renderStill } = await import('../engine'); const b = await renderStill(viewOf(s), { width: 1200, height: 800, format: 'png' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b as Blob); a.download = 'valley.png'; a.click(); }],
    ];
    for (const [t, fn] of evs) evb.append(el('button', { type: 'button', textContent: t, onclick: () => { stop(); fn(); syncPanel(); } }));
    const rm = check('Reduced motion', () => !!rmOn, (v) => { rmOn = v; scene.setReducedMotion(v); });
    const head = el('div', { className: 'grp' }, el('h3', {}, 'Industry & look'), ind, look, presets, el('div', { className: 'btns' }, play, crisis), rm, el('h3', {}, 'Events (M2)'), evb);

    const apps = el('div', { className: 'grp' }, el('h3', {}, 'Applications'));
    IND[s.ind].apps.forEach(([, name], k) => {
      const stSel = el('select') as HTMLSelectElement;
      ['hidden', 'available', 'founded'].forEach((x) => stSel.append(el('option', { value: x, textContent: x })));
      syncers.push(() => { stSel.value = s.status[k]; });
      stSel.addEventListener('change', () => { s.status[k] = stSel.value as SceneApp['status']; stop(); render(); });
      apps.append(el('div', { className: 'app' }, el('strong', {}, name), stSel, slider('adoption', () => s.adoption[k], (v) => (s.adoption[k] = v))));
    });

    const world = el('div', { className: 'grp' }, el('h3', {}, 'World'),
      slider('machine stage', () => s.stage, (v) => (s.stage = v), 0, 3, 1),
      slider('pressure', () => s.pressure, (v) => (s.pressure = v), 0, 1.1),
      slider('reserve', () => s.reserve, (v) => (s.reserve = v)),
      slider('population', () => s.pop, (v) => (s.pop = v)),
      slider('pace (use rate)', () => s.pace, (v) => (s.pace = v)),
      slider('steady progress', () => s.steadyProgress, (v) => (s.steadyProgress = v)),
      check('Decoupling', () => s.decoupling, (v) => (s.decoupling = v)),
      check('Clear skies', () => s.clear, (v) => (s.clear = v)),
      slider('clear progress', () => s.clearProgress, (v) => (s.clearProgress = v)),
      check('Settled', () => s.settled, (v) => (s.settled = v)),
      check('Steady State', () => s.steady, (v) => (s.steady = v)));
    const rk = el('select') as HTMLSelectElement;
    [['', 'No Reckoning'], ['exhausted', 'Reckoning: exhausted'], ['collapse', 'Reckoning: collapse'], ['chosen', 'Reckoning: chosen']].forEach(([v, t]) => rk.append(el('option', { value: v, textContent: t })));
    syncers.push(() => { rk.value = s.reckoning; });
    rk.addEventListener('change', () => { s.reckoning = rk.value as DemoState['reckoning']; stop(); render(); });
    world.append(rk);
    const lev = el('div', { className: 'grp' }, el('h3', {}, 'Levers in force'));
    for (const [k, name] of LEVERS) lev.append(check(name, () => !!s.levers[k], (v) => (s.levers[k] = v)));
    panel.append(head, apps, world, lev);
    syncPanel();
  }
  let rmOn = false;

  function start(): void {
    stop();
    s = { ...blank(s.ind), look: s.look };
    t0 = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / 60000);
      s = { ...runAt(s.ind, t), look: s.look };
      render();
      syncPanel();
      if (t < 1) playing = window.setTimeout(step, 100); // the host calls update() ~10×/s
    };
    step();
  }
  function stop(): void { clearTimeout(playing); playing = 0; }

  buildPanel();
  render();
  const api = {
    set: (p: Partial<DemoState>) => { stop(); s = { ...s, ...p }; render(); syncPanel(); },
    raw: (p: Partial<DemoState>) => { s = { ...s, ...p }; render(); },
    preset: (name: string, ind?: string) => {
      stop();
      const i = ind ? Math.max(0, IND.findIndex((x) => x.id === ind)) : s.ind;
      if (i !== s.ind) scene.setSector(IND[i].id);
      s = { ...PRESETS[name](i), look: s.look };
      buildPanel(); render();
    },
    play: () => start(),
    fire: (kind: string, x: Record<string, unknown> = {}) => fire(kind, x),
    replay: (sec = 10) => { const vs: SceneView[] = []; for (let t = 0; t <= 1; t += 1 / 60) vs.push(viewOf(runAt(s.ind, t))); return scene.replay?.(vs, { seconds: sec }); },
    still: async (w = 600, h = 400) => { const { renderStill } = await import('../engine'); return renderStill(viewOf(s), { width: w, height: h }); },
    /** Time a switch to an Industry in a preset state: the scene's own cost (setSector + update), in ms. */
    timeSwitch: (ind: string, name = 'crisis') => {
      stop();
      const i = Math.max(0, IND.findIndex((x) => x.id === ind));
      s = { ...PRESETS[name](i), look: s.look };
      const v = viewOf(s);
      const t0 = performance.now();
      scene.setSector(IND[i].id);
      scene.update(v);
      return performance.now() - t0;
    },
    scene: () => scene,
    rebuild: () => { scene.destroy(); scene = createScene(host, {}); render(); },
  };
  (window as unknown as { __scene: typeof api }).__scene = api;
}

/** M3: the spot illustrations, every kind in every look (#spots). */
function spotsMode(): void {
  injectSceneCss(document);
  document.body.classList.add('strip');
  document.body.style.setProperty('--fig', '250px');
  const wrap = document.getElementById('app')!;
  wrap.innerHTML = '';
  const keyOf: Record<string, string> = {};
  for (const [k, kind] of Object.entries(SPOT_OF)) if (!keyOf[kind]) keyOf[kind] = k;
  for (const look of ['ledger', 'gaslight', 'chrome', 'terminal', 'cyberpunk']) {
    for (const kind of SPOT_KINDS) {
      const fig = document.createElement('figure');
      fig.innerHTML = `<figcaption>${look} · ${kind} (${keyOf[kind]})</figcaption>` + spot(keyOf[kind], look, { width: 240, height: 160 });
      wrap.append(fig);
    }
  }
}

const m = /strip=([\w-]+)/.exec(location.hash);
if (m) stripMode(m[1]); else if (/spots/.test(location.hash)) spotsMode(); else interactive();
