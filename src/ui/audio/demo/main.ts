// Standalone soundscape demo: the real scene and the soundscape driven by the same SceneView, sliders for every
// input, buttons for every interface event, two 60-second auto-play runs, a live meter and voice count.
// Built by tools/audio-demo.ts into dist/audio-demo.html. Browser-only; imports no model or content.
import { createScene } from '../../scene';
import type { SceneHandle, SceneView, SceneApp } from '../../scene/types';
import { createSoundscape } from '../engine';
import { SOUND_EVENT_KINDS, SOUND_EVENT_ALIASES, type SoundEventKind, type SoundEventDetail } from '../types';
import { MOTIFS } from '../recipes';
import { DEMO_INDUSTRIES, preset, viewOf, runParams, PRESET_NAMES, type DemoParams, type PresetName } from '../views';
import { soundscapeFor } from '../defs';
import { exportPanel } from '../export/panel';

const LEVERS = ['duty', 'cap', 'sufficiency', 'substitution', 'circularity', 'greenSpending', 'deletion', 'reviewGate', 'sharedLibs'];
const EARLIER = ['steam', 'light', 'motion', 'compute'];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string)[]) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) (e as unknown as Record<string, unknown>)[k] = v;
  e.append(...kids);
  return e;
};

let sector = 'steam';
let p: DemoParams = preset(sector, 'early');
let playing: { ending: 'collapse' | 'steady'; t0: number } | null = null;
let syncers: (() => void)[] = [];

const app = document.getElementById('app')!;
const top = el('div', { className: 'top' });
const host = el('div', { className: 'scene-host' });
const side = el('div', { className: 'side' });
const panel = el('div', { className: 'panel' });
top.append(host, side);
// For visitors who arrive from a shared link.
const about = el('p', { className: 'what' }, 'Generated sound for ', el('a', { href: 'https://kylelookingaround.github.io/jevons-paradox-game/', textContent: 'Rebound' }),
  ', an incremental game about Jevons paradox. Everything you hear is synthesised in your browser as it plays (no recordings, no samples); turn the sound on, try the controls, or export it for a DAW below.');
const exportHost = el('div', { className: 'export-host' });
app.append(about, top, exportHost, panel);

const scene: SceneHandle = createScene(host, { card: false });
const sound = createSoundscape({ meter: true });

/* M3 inputs, each off (absent from the view) until switched on, as in the game. */
const LIGHT_QUIET = [0.2, 0.15, 0.12, 0.12, 0.15, 0.25, 0.45, 0.7, 0.8, 0.75, 0.7, 0.7, 0.72, 0.7, 0.68, 0.7, 0.8, 0.95, 1, 0.9, 0.7, 0.5, 0.35, 0.25];
const LIGHT_SOLD = LIGHT_QUIET.map((x, h) => (h < 6 || h > 21 ? 0.85 : x));
const m3s = {
  seamsOn: false, sunk: 0, total: 4,
  loadOn: false, sold: false,
  travelOn: false, speed: 1, sprawl: 0.2,
  freeOn: false, free: [] as string[],
  watch: 0,
  bite: {} as Record<string, number>,
};
function withM3(v: SceneView): SceneView {
  const o: SceneView = { ...v };
  if (m3s.seamsOn && sector === 'steam') o.seams = { sunk: m3s.sunk, total: m3s.total, next: m3s.sunk < m3s.total };
  if (m3s.loadOn && sector === 'light') { const h = m3s.sold ? LIGHT_SOLD : LIGHT_QUIET; o.load = { hours: h, factor: Math.round((h.reduce((a, b) => a + b, 0) / 24) * 100) / 100 }; }
  if (m3s.travelOn && sector === 'motion') o.travel = { speed: m3s.speed, sprawl: m3s.sprawl, sprawlShare: m3s.sprawl * 0.6 };
  if (m3s.freeOn && sector === 'compute') o.free = { apps: m3s.free };
  if (m3s.watch > 0) o.watch = m3s.watch;
  o.levers = v.levers.map((l) => (m3s.bite[l.kind] ? { ...l, bite: m3s.bite[l.kind] } : l));
  return o;
}
const view = (): SceneView => withM3(viewOf(sector, p));
let exportRefresh: ReturnType<typeof setTimeout> | null = null;
function render(): void {
  // The export panel's estimates follow the controls (debounced: it lays out every export it offers).
  if (exportRefresh) clearTimeout(exportRefresh);
  exportRefresh = setTimeout(() => { exportRefresh = null; xp?.refresh(); }, 400);
  document.documentElement.dataset.era = view().look;
  document.documentElement.dataset.theme = view().look;
  const v = view();
  scene.update(v);
  sound.update(v);
}

/* ---------------- sound controls and meter ---------------- */
const onBtn = el('button', { type: 'button', className: 'play', textContent: '♪ Sound on' }) as HTMLButtonElement;
let on = false;
onBtn.addEventListener('click', () => {
  on = !on;
  sound.setEnabled(on);   // inside the tap: creates and unlocks the AudioContext
  onBtn.textContent = on ? '♪ Sound off' : '♪ Sound on';
  render();
});
const vol = { master: 0.8, world: 0.7, interface: 0.7 };
const volRow = (k: keyof typeof vol) => {
  const i = el('input', { type: 'range', min: '0', max: '1', step: '0.01', value: String(vol[k]) }) as HTMLInputElement;
  i.addEventListener('input', () => { vol[k] = +i.value; sound.setVolume({ [k]: vol[k] }); });
  return el('label', { className: 'row' }, el('span', {}, k), i, el('span'));
};
const calm = el('input', { type: 'checkbox' }) as HTMLInputElement;
calm.addEventListener('change', () => sound.setCalm(calm.checked ? true : null));
const split = el('div', { className: 'btns' },
  el('button', { type: 'button', textContent: 'world only', onclick: () => sound.setVolume({ world: vol.world, interface: 0 }) }),
  el('button', { type: 'button', textContent: 'interface only', onclick: () => sound.setVolume({ world: 0, interface: vol.interface }) }),
  el('button', { type: 'button', textContent: 'both', onclick: () => sound.setVolume(vol) }));
const meterBar = el('div', { className: 'meter' }, el('i'));
const meterTxt = el('pre', { className: 'stats' });
side.append(onBtn, volRow('master'), volRow('world'), volRow('interface'), el('label', { className: 'chk' }, calm, 'Calmer (reduced motion)'), split, meterBar, meterTxt);

function meterLoop(): void {
  const s = sound.stats();
  const lv = s.levelDb ?? -120;
  (meterBar.firstChild as HTMLElement).style.width = `${Math.max(0, Math.min(100, (lv + 60) * (100 / 60)))}%`;
  const def = soundscapeFor(sector);
  meterTxt.textContent = `${s.state} · ${s.sampleRate || '–'} Hz · ${def.id} (${def.key.name})\n` +
    `level ${lv.toFixed(1)} dBFS  peak ${(s.peakDb ?? -120).toFixed(1)}\nvoices ${s.voices}  beds ${s.beds}  graphs ${s.graphs}\n` +
    `update ${s.updateMs.toFixed(2)} ms  tick ${s.tickMs.toFixed(2)} ms\ncache ${(s.bufferSamples / 24000).toFixed(0)} s of samples`;
  if (playing) {
    const t = Math.min(1, (performance.now() - playing.t0) / 60000);
    const prevCrises = p.crises;
    p = runParams(sector, t, playing.ending);
    if (p.crises > prevCrises) sound.event('crisis');
    if (t >= 1) playing = null;
    syncers.forEach((f) => f());
    render();
  }
  setTimeout(meterLoop, 100);   // the page drives update() at 10 Hz, as the game does
}

/* ---------------- inputs ---------------- */
function buildPanel(): void {
  syncers = [];
  panel.replaceChildren();
  const slider = (label: string, get: () => number, set: (v: number) => void, min = 0, max = 1, step = 0.01) => {
    const out = el('output');
    const inp = el('input', { type: 'range', min: String(min), max: String(max), step: String(step) }) as HTMLInputElement;
    syncers.push(() => { inp.value = String(get()); out.textContent = (+get()).toFixed(2); });
    inp.addEventListener('input', () => { set(+inp.value); out.textContent = (+inp.value).toFixed(2); playing = null; render(); });
    return el('label', { className: 'row' }, el('span', {}, label), inp, out);
  };
  const check = (label: string, get: () => boolean, set: (v: boolean) => void) => {
    const inp = el('input', { type: 'checkbox' }) as HTMLInputElement;
    syncers.push(() => { inp.checked = get(); });
    inp.addEventListener('change', () => { set(inp.checked); playing = null; render(); });
    return el('label', { className: 'chk' }, inp, label);
  };
  const ind = el('select') as HTMLSelectElement;
  for (const x of DEMO_INDUSTRIES) ind.append(el('option', { value: x.id, textContent: x.name }));
  ind.value = sector;
  ind.addEventListener('change', () => {
    playing = null; sector = ind.value; p = preset(sector, 'early');
    if (sector !== 'steam') p.heritage = Object.fromEntries(EARLIER.slice(0, Math.max(0, EARLIER.indexOf(sector) === -1 ? 4 : EARLIER.indexOf(sector))).map((s) => [s, 0.8]));
    scene.setSector(sector); sound.setSector(sector); buildPanel(); render();
  });
  const presets = el('div', { className: 'btns' });
  for (const name of PRESET_NAMES) presets.append(el('button', { type: 'button', textContent: name, onclick: () => { playing = null; const h = p.heritage; p = { ...preset(sector, name as PresetName), heritage: h }; syncers.forEach((f) => f()); render(); } }));
  const runs = el('div', { className: 'btns' },
    el('button', { type: 'button', className: 'play', textContent: '▶ Run to collapse (60 s)', onclick: () => { playing = { ending: 'collapse', t0: performance.now() }; } }),
    el('button', { type: 'button', className: 'play', textContent: '▶ Run to Steady State (60 s)', onclick: () => { playing = { ending: 'steady', t0: performance.now() }; } }),
    el('button', { type: 'button', textContent: '■ Stop', onclick: () => { playing = null; } }));
  const head = el('div', { className: 'grp' }, el('h3', {}, 'Industry'), ind, presets, runs);

  const events = el('div', { className: 'grp' }, el('h3', {}, 'Interface events (page calls event(kind))'));
  const eb = el('div', { className: 'btns' });
  for (const k of SOUND_EVENT_KINDS.slice(0, 15)) eb.append(el('button', { type: 'button', textContent: k, onclick: () => fire(k) }));
  const burst = el('button', { type: 'button', textContent: 'sell ×8/s for 2 s', onclick: () => { for (let i = 0; i < 16; i++) setTimeout(() => sound.event('sell', { pan: (i % 5) / 5 - 0.4 }), i * 125); } });
  events.append(eb, el('div', { className: 'btns' }, burst));

  const apps = el('div', { className: 'grp' }, el('h3', {}, 'Applications'));
  const ind0 = DEMO_INDUSTRIES.find((x) => x.id === sector)!;
  ind0.apps.forEach(([, name], k) => {
    const st = el('select') as HTMLSelectElement;
    for (const x of ['hidden', 'available', 'founded']) st.append(el('option', { value: x, textContent: x }));
    syncers.push(() => { st.value = p.status[k]; });
    st.addEventListener('change', () => { p.status[k] = st.value as SceneApp['status']; playing = null; render(); });
    apps.append(el('div', { className: 'app' }, el('strong', {}, name), st, slider('adoption', () => p.adoption[k], (v) => (p.adoption[k] = v))));
  });

  const world = el('div', { className: 'grp' }, el('h3', {}, 'World'),
    slider('machine stage', () => p.stage, (v) => (p.stage = v), 0, 3, 1),
    slider('pace', () => p.pace, (v) => (p.pace = v)),
    slider('pressure', () => p.pressure, (v) => (p.pressure = v), 0, 1.1),
    slider('reserve', () => p.reserve, (v) => (p.reserve = v)),
    slider('population', () => p.pop, (v) => (p.pop = v)),
    slider('steady progress', () => p.steadyProgress, (v) => (p.steadyProgress = v)),
    check('Decoupling', () => p.decoupling, (v) => (p.decoupling = v)),
    check('Steady State', () => p.steady, (v) => (p.steady = v)),
    el('div', { className: 'btns' }, el('button', { type: 'button', textContent: 'Fire a crisis (world)', onclick: () => { p.crises++; render(); } })));
  const rk = el('select') as HTMLSelectElement;
  for (const [v, t] of [['', 'No Reckoning'], ['exhausted', 'Reckoning: exhausted'], ['collapse', 'Reckoning: collapse'], ['chosen', 'Reckoning: chosen']]) rk.append(el('option', { value: v, textContent: t }));
  syncers.push(() => { rk.value = p.reckoning; });
  rk.addEventListener('change', () => { p.reckoning = rk.value as DemoParams['reckoning']; playing = null; render(); });
  world.append(rk);

  const lev = el('div', { className: 'grp' }, el('h3', {}, 'Levers in force'));
  for (const k of LEVERS) lev.append(check(k, () => p.levers.includes(k), (v) => { p.levers = v ? [...p.levers, k] : p.levers.filter((x) => x !== k); }));
  const her = el('div', { className: 'grp' }, el('h3', {}, 'Heritage (earlier Industries)'));
  for (const s of EARLIER) if (s !== sector) her.append(slider(s, () => p.heritage?.[s] ?? 0, (v) => { p.heritage = { ...(p.heritage ?? {}), [s]: v }; }));
  // Levers: how hard each bites back (M3)
  const bites = el('div', { className: 'grp' }, el('h3', {}, 'Levers biting back (M3: SceneLever.bite)'),
    el('p', {}, 'Tick a lever above first. Past 0.3 its small signature goes flat; past 0.5 a second voice beats against it.'));
  for (const k of LEVERS) bites.append(slider(k, () => m3s.bite[k] ?? 0, (v) => { m3s.bite[k] = v; }));

  // M3 world inputs
  const mech = el('div', { className: 'grp' }, el('h3', {}, 'M3 mechanics (each absent until ticked)'));
  if (sector === 'steam') mech.append(check('Steam: seam ladder shown (seams)', () => m3s.seamsOn, (v) => (m3s.seamsOn = v)),
    slider('seams sunk (of 4)', () => m3s.sunk, (v) => (m3s.sunk = v), 0, 4, 1),
    el('p', {}, 'Listen for: the winding engine running longer and lower, more often; the pump engine slower; a slow heave under it.'));
  if (sector === 'light') mech.append(check("Light: the day's load (load)", () => m3s.loadOn, (v) => (m3s.loadOn = v)),
    check('the hollows sold (night load high)', () => m3s.sold, (v) => (m3s.sold = v)),
    el('p', {}, 'The sound walks a day in a minute, from dusk (18:00), as the picture\'s clock does: the evening peak loudest and brightest, mills in the morning, crickets in a quiet small hours — or machinery all night when the hollows are sold. Calmer mode holds the peak hour.'));
  if (sector === 'motion') mech.append(check('Motion: travel shown (travel)', () => m3s.travelOn, (v) => (m3s.travelOn = v)),
    slider('speed (1 = empty roads)', () => m3s.speed, (v) => (m3s.speed = v)),
    slider('sprawl', () => m3s.sprawl, (v) => (m3s.sprawl = v)),
    el('p', {}, 'Low speed: the wash thickens, a queue idles, the odd horn. Sprawl: distant traffic, mowers and radios that stay when the cars thin.'));
  if (sector === 'compute') {
    mech.append(check('Compute: "free at the point of use" shown (free)', () => m3s.freeOn, (v) => (m3s.freeOn = v)));
    for (const [icon, name] of DEMO_INDUSTRIES.find((x) => x.id === 'compute')!.apps) mech.append(check(`free: ${name}`, () => m3s.free.includes(`compute.${icon}`), (v) => { m3s.free = v ? [...m3s.free, `compute.${icon}`] : m3s.free.filter((x) => x !== `compute.${icon}`); }));
    mech.append(el('p', {}, 'Paid uses ring a small till now and then. Free ones press the key and the drawer springs, and no bell rings. A dam and the grid hum, far off, as the free share grows.'));
  }
  if (!['steam', 'light', 'motion', 'compute'].includes(sector)) mech.append(el('p', {}, 'No Industry mechanic here; the watch below works everywhere.'));
  mech.append(slider("proprietor's watch (watch)", () => m3s.watch, (v) => (m3s.watch = v)),
    el('p', {}, 'After the Proprietor\'s Day: a faint tick now and then, at most one every two seconds.'));

  // M3 events with their details
  const m3ev = el('div', { className: 'grp' }, el('h3', {}, 'M3 moments (page calls event(kind, detail))'));
  const castSel = el('select') as HTMLSelectElement;
  for (const c of ['', 'correspondent', 'whitlow', 'whitlowChair', 'missWhitlow', 'fenwick', 'fenwickCouncil', 'ashworth', 'ashworthLater', 'pryce', 'minister']) castSel.append(el('option', { value: c, textContent: c || '(no writer)' }));
  castSel.value = 'correspondent';
  const leverSel = el('select') as HTMLSelectElement;
  for (const k of ['', ...LEVERS]) leverSel.append(el('option', { value: k, textContent: k || '(no lever)' }));
  leverSel.value = 'duty';
  let depth = 0.5;
  m3ev.append(el('div', { className: 'btns' },
    el('button', { type: 'button', textContent: 'letter', onclick: () => sound.event('letter', { cast: castSel.value || undefined }) }), castSel,
    el('button', { type: 'button', textContent: 'letterOpened', onclick: () => sound.event('letterOpened') }),
    el('button', { type: 'button', textContent: 'answer', onclick: () => sound.event('answer', { by: 'player' }) }),
    el('button', { type: 'button', textContent: 'answer (lapsed: by default)', onclick: () => sound.event('answer', { by: 'default' }) })),
    el('div', { className: 'btns' },
      el('button', { type: 'button', textContent: 'seam', onclick: () => sound.event('seam', { depth }) }),
      slider('seam depth', () => depth, (v) => (depth = v)),
      el('button', { type: 'button', textContent: 'bite', onclick: () => sound.event('bite', { lever: leverSel.value || undefined }) }), leverSel),
    el('div', { className: 'btns' }, ...(['survey', 'proprietor', 'arrived', 'history', 'ending', 'ledgerContinues'] as SoundEventKind[]).map((k) => el('button', { type: 'button', textContent: k, onclick: () => sound.event(k) }))),
    el('div', { className: 'btns' }, el('button', { type: 'button', textContent: 'ten letters in ten seconds (the nag test: the 2nd on are softer, no motif)', onclick: () => { for (let i = 0; i < 10; i++) setTimeout(() => sound.event('letter', { cast: 'pryce' }), i * 1000); } })));
  panel.append(audition(), head, events, m3ev, mech, apps, world, lev, bites, her);
  syncers.forEach((f) => f());
}

/* ---------------- audition every M3 sound, in order, with captions ---------------- */
interface Step { cap: string; secs: number; go: () => void }
const capBox = el('div', { className: 'side', style: 'font-size:15px;min-height:3.2em;margin:10px 0' }, 'Press “Audition all M3 sounds” (sound must be on). Each step says what you should hear.');
let auditionT: ReturnType<typeof setTimeout> | null = null;
function setInd(id: string, pr: PresetName): void { sector = id; p = preset(id, pr); scene.setSector(id); sound.setSector(id); buildPanel(); render(); }
function steps(): Step[] {
  const ev = (k: SoundEventKind, d?: SoundEventDetail) => () => sound.event(k, d);
  const st = (f: () => void) => () => { f(); syncers.forEach((g) => g()); render(); };
  return [
    { cap: '1. Steam, late, no seams: the valley as in M2 (winding engine now and then).', secs: 8, go: () => { Object.assign(m3s, { seamsOn: false, loadOn: false, travelOn: false, freeOn: false, watch: 0, bite: {} }); setInd('steam', 'late'); } },
    { cap: '2. A seam sunk (shallow): a muffled blast underground, the cage bell twice, a pump stroke rising, a chain.', secs: 6, go: ev('seam', { depth: 0.25 }) },
    { cap: '3. Four seams down: the winding runs longer and lower and comes more often; a slow heave under the pumps.', secs: 22, go: st(() => { m3s.seamsOn = true; m3s.sunk = 4; }) },
    { cap: '4. A deep seam sunk: the same moment, lower.', secs: 6, go: ev('seam', { depth: 1 }) },
    { cap: "5. Light, late, with the day's load: the sound walks a day in a minute from dusk. Evening peak first (loudest, brightest), then the small hours go quiet (crickets), mills strike up in the morning.", secs: 45, go: () => { m3s.seamsOn = false; m3s.loadOn = true; m3s.sold = false; setInd('light', 'late'); } },
    { cap: '6. The hollows sold: the night no longer goes quiet — the night shift keeps the machines going.', secs: 30, go: st(() => { m3s.sold = true; }) },
    { cap: '7. Motion, mid, free roads: as in M2.', secs: 8, go: () => { m3s.loadOn = false; m3s.travelOn = true; m3s.speed = 1; m3s.sprawl = 0.3; setInd('motion', 'mid'); } },
    { cap: '8. Journeys lengthen (speed 0.2): the wash thickens, a queue idles low, cars pass slower, the odd horn.', secs: 16, go: st(() => { m3s.speed = 0.2; }) },
    { cap: '9. Traffic thins but the sprawl stays: distant traffic, a mower, a radio over the fence.', secs: 16, go: st(() => { const h = p.heritage; p = { ...preset('motion', 'early'), heritage: h }; m3s.speed = 0.95; m3s.sprawl = 0.9; }) },
    { cap: '10. Compute, late, everything paid: a small till rings now and then (right).', secs: 16, go: () => { m3s.travelOn = false; m3s.freeOn = true; m3s.free = []; setInd('compute', 'late'); } },
    { cap: '11. Everything free at the point of use: the key and the drawer, and no bell (left) — the till that does not ring. Far off, a dam and the grid hum.', secs: 20, go: st(() => { m3s.free = ['compute.sheet', 'compute.globe', 'compute.cloud', 'compute.play', 'compute.brain']; }) },
    { cap: '12. A lever that bites back: duty and cap in force, biting hard — their signatures go flat and beat.', secs: 30, go: st(() => { m3s.freeOn = false; p.levers = ['duty', 'cap']; m3s.bite = { duty: 1, cap: 1 }; }) },
    { cap: "13. The bite's moment (biteBack): duty's own toll bell, twice, flat and beating.", secs: 4, go: ev('bite', { lever: 'duty' }) },
    { cap: '14. The post, Age by Age. Steam: a knock, the letter-box, then Our Correspondent\'s motif (a repeated note, down a fifth).', secs: 5, go: () => { m3s.bite = {}; setInd('steam', 'mid'); setTimeout(() => sound.event('letter', { cast: 'correspondent' }), 600); } },
    { cap: "15. Light: the telegraph sounder, then Mr Whitlow's motif (counting up, step by step).", secs: 5, go: () => { setInd('light', 'mid'); setTimeout(() => sound.event('letter', { cast: 'whitlow' }), 600); } },
    { cap: "16. Motion: the teleprinter and its bell, then Mr Pryce's motif (up a sixth and settle).", secs: 5, go: () => { setInd('motion', 'mid'); setTimeout(() => sound.event('letter', { cast: 'pryce' }), 600); } },
    { cap: "17. Compute: a mail chime, then Mrs Fenwick's motif (brisk thirds).", secs: 4, go: () => { setInd('compute', 'mid'); setTimeout(() => sound.event('letter', { cast: 'fenwick' }), 600); } },
    { cap: "18. Code: a soft notification, then the Minister's motif (slow, down a third, stays).", secs: 5, go: () => { setInd('code', 'mid'); setTimeout(() => sound.event('letter', { cast: 'minister' }), 600); } },
    { cap: '19. Opening a letter (paper; in Compute and Code a key), answering it (pen and stamp), and one that lapses (barely there).', secs: 6, go: () => { setInd('steam', 'mid'); setTimeout(() => sound.event('letterOpened'), 500); setTimeout(() => sound.event('answer'), 2200); setTimeout(() => sound.event('answer', { by: 'default' }), 4500); } },
    { cap: '20. Something has arrived (a new system unlocks): one small cue per Age — Steam, Light, Motion, Compute, Code.', secs: 8, go: () => { ['steam', 'light', 'motion', 'compute', 'code'].forEach((x, i) => setTimeout(() => sound.event('arrived', { sector: x }), 300 + i * 1500)); } },
    { cap: '21. A History cleared: a line ruled off, a small cadence.', secs: 4, go: ev('history') },
    { cap: '22. The household return published: a ledger page, a clock ticking, one note.', secs: 5, go: ev('survey') },
    { cap: "23. The Proprietor's Day: the world steps back; the lid of his watch, its hurried ticking, a considered chord left open, the lid shut. Dry, not an alarm.", secs: 7, go: ev('proprietor') },
    { cap: '24. After it, his watch ticks faintly now and then in the world (at most one every two seconds).', secs: 14, go: st(() => { m3s.watch = 1; }) },
    { cap: '25. The first ending: a bell, a slow chord, the air clears and the strain goes; then a held chord breathes under the credits, a bell now and then, while the place keeps working. About a minute.', secs: 60, go: () => { m3s.watch = 0; setInd('code', 'crisis'); setTimeout(() => sound.event('ending'), 800); } },
    { cap: '26. “The ledger continues”: a pen stroke and one note; the credits give way and play resumes.', secs: 8, go: ev('ledgerContinues') },
    { cap: 'Done. Every button is in the panels below to replay any one.', secs: 0, go: () => { /* end */ } },
  ];
}
function audition(): HTMLElement {
  const run = (i: number, list: Step[]) => {
    if (i >= list.length) { auditionT = null; return; }
    const s0 = list[i];
    capBox.textContent = s0.cap;
    try { s0.go(); } catch { /* keep going */ }
    auditionT = setTimeout(() => run(i + 1, list), s0.secs * 1000);
  };
  return el('div', { className: 'grp', style: 'grid-column:1/-1' }, el('h3', {}, 'Audition'),
    el('div', { className: 'btns' },
      el('button', { type: 'button', className: 'play', textContent: '▶ Audition all M3 sounds, in order (about 7 minutes)', onclick: () => { if (!on) onBtn.click(); playing = null; if (auditionT) clearTimeout(auditionT); run(0, steps()); } }),
      el('button', { type: 'button', textContent: '■ Stop the audition', onclick: () => { if (auditionT) clearTimeout(auditionT); auditionT = null; capBox.textContent = 'Stopped.'; } })),
    capBox);
}
void MOTIFS; void SOUND_EVENT_ALIASES;

function fire(k: SoundEventKind): void {
  sound.event(k);
  // The world's own moments follow the view, as in the game.
  if (k === 'crisis') { p.crises++; render(); }
  if (k === 'steady') { p.steady = true; p.steadyProgress = 1; p.decoupling = true; syncers.forEach((f) => f()); render(); }
  if (k === 'reckoning') { p.reckoning = 'collapse'; syncers.forEach((f) => f()); render(); }
}

const xp: ReturnType<typeof exportPanel> | null = exportPanel(() => ({ sector, view: view() }));
exportHost.append(xp.el);
buildPanel();
render();
meterLoop();
