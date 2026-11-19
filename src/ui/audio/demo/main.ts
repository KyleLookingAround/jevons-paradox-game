// Standalone soundscape demo: the real scene and the soundscape driven by the same SceneView, sliders for every
// input, buttons for every interface event, two 60-second auto-play runs, a live meter and voice count.
// Built by tools/audio-demo.ts into dist/audio-demo.html. Browser-only; imports no model or content.
import { createScene } from '../../scene';
import type { SceneHandle, SceneView, SceneApp } from '../../scene/types';
import { createSoundscape } from '../engine';
import { SOUND_EVENT_KINDS, type SoundEventKind } from '../types';
import { DEMO_INDUSTRIES, preset, viewOf, runParams, PRESET_NAMES, type DemoParams, type PresetName } from '../views';
import { soundscapeFor } from '../defs';

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
app.append(top, panel);

const scene: SceneHandle = createScene(host, { card: false });
const sound = createSoundscape({ meter: true });

const view = (): SceneView => viewOf(sector, p);
function render(): void {
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
  for (const k of SOUND_EVENT_KINDS) eb.append(el('button', { type: 'button', textContent: k, onclick: () => fire(k) }));
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
  panel.append(head, events, apps, world, lev, her);
  syncers.forEach((f) => f());
}

function fire(k: SoundEventKind): void {
  sound.event(k);
  // The world's own moments follow the view, as in the game.
  if (k === 'crisis') { p.crises++; render(); }
  if (k === 'steady') { p.steady = true; p.steadyProgress = 1; p.decoupling = true; syncers.forEach((f) => f()); render(); }
  if (k === 'reckoning') { p.reckoning = 'collapse'; syncers.forEach((f) => f()); render(); }
}

buildPanel();
render();
meterLoop();
