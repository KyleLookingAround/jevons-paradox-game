// The demo's "Export for a DAW" panel: choose what to export, see its size and time before starting, follow it file
// by file, cancel. Rendering is offline (faster than real time), so nothing is recorded from the speakers.
import { DEMO_INDUSTRIES } from '../views';
import { mb, dur } from './naming';
import { DEFAULTS, LENGTHS, RUN_LENGTHS, STATE_NAMES, tasksFor, newLedger, stateView, describeLoop, oneShotList, oneShotsTask, type Settings, type Source, type Kind, type StateName } from './plan';
import { runExport, runFiles, canWriteFiles, pickFile, type Status } from './run';
import { EXPORT_INDUSTRIES } from './plan';
import { Cancelled } from './render';

/** Seconds of audio rendered per second of wall time, for the estimate (measured in headless Chromium on a laptop-class
 *  container; refined from the running export once it has started). */
const SPEED = 6;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string)[]) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.includes('-') || k === 'role') e.setAttribute(k, String(v));
    else (e as unknown as Record<string, unknown>)[k] = v;
  }
  e.append(...kids);
  return e;
};

function save(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name }) as HTMLAnchorElement;
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export interface ExportPanel { el: HTMLElement; refresh: () => void }

/** `controls()` gives the Industry and the view currently set on the demo's controls. */
export function exportPanel(controls: () => { sector: string; view: Source['view'] }): ExportPanel {
  const s: Settings = { ...DEFAULTS };
  let toDisk = canWriteFiles();
  const root = el('section', { className: 'grp export', id: 'export' });
  const sel = (opts: [string, string][], value: string, on: (v: string) => void, label: string) => {
    const x = el('select', { 'aria-label': label }) as HTMLSelectElement;
    for (const [v, t] of opts) x.append(el('option', { value: v, textContent: t }));
    x.value = value;
    x.addEventListener('change', () => { on(x.value); refresh(); });
    return x;
  };
  const chk = (label: string, get: boolean, on: (v: boolean) => void) => {
    const x = el('input', { type: 'checkbox', checked: get }) as HTMLInputElement;
    x.addEventListener('change', () => { on(x.checked); refresh(); });
    return el('label', { className: 'chk' }, x, label);
  };
  let srcState = 'controls';
  const srcSel = el('select', { 'aria-label': 'State to export' }) as HTMLSelectElement;
  const fillSrc = () => {
    const name = DEMO_INDUSTRIES.find((x) => x.id === controls().sector)?.name ?? controls().sector;
    srcSel.replaceChildren(el('option', { value: 'controls', textContent: `${name}: as set on the controls` }), ...STATE_NAMES.map((n) => el('option', { value: n, textContent: `${name}: ${n}` })));
    srcSel.value = srcState;
  };
  srcSel.addEventListener('change', () => { srcState = srcSel.value; refresh(); });
  const source = (): Source => {
    const c = controls();
    return srcState === 'controls' ? { sector: c.sector, state: 'controls', view: c.view } : { sector: c.sector, state: srcState, view: stateView(c.sector, srcState as StateName) };
  };
  const lenName = (x: number) => (x < 60 ? `${x} s` : `${x / 60} min`);
  const row = (label: string, ...kids: (Node | string)[]) => el('div', { className: 'xrow' }, el('span', { className: 'xl' }, label), el('span', { className: 'xc' }, ...kids));
  const loopInfo = el('span', { className: 'xnote' });
  const take = el('input', { type: 'number', min: '1', max: '99', step: '1', value: '1', 'aria-label': 'Take', style: 'width:4.5em' }) as HTMLInputElement;
  take.addEventListener('change', () => { s.take = Math.max(1, Math.min(99, Math.round(+take.value) || 1)); take.value = String(s.take); refresh(); });
  const fmtSel = sel([['pcm24', '24-bit PCM'], ['f32', '32-bit float']], s.fmt, (v) => (s.fmt = v as Settings['fmt']), 'Bit depth');
  const controlsBox = el('div', { className: 'xgrid' },
    row('State', srcSel),
    row('Length', sel(LENGTHS.map((x) => [String(x), lenName(x)]), String(s.loopSec), (v) => (s.loopSec = +v), 'Loop length'), loopInfo),
    row('Loop', chk('seamless (whole bars, crossfaded)', s.seamless, (v) => (s.seamless = v)),
      sel([['all', 'everything'], ['noevents', 'beds and pulse (no events)'], ['beds', 'beds only']], s.content, (v) => (s.content = v as Settings['content']), 'Loop content')),
    row('Stems', chk('add a dry set (room off)', s.dry, (v) => (s.dry = v))),
    row('One-shots', chk('normalise to −1 dBFS', s.normalise, (v) => (s.normalise = v))),
    row('Runs', sel(RUN_LENGTHS.map((x) => [String(x), x === 60 ? '60 s (as the demo)' : `${x / 60} min, slower`]), String(s.runSec), (v) => (s.runSec = +v), 'Run length')),
    row('Format', el('span', {}, '48 kHz stereo WAV, '), fmtSel),
    ...(canWriteFiles() ? [row('Saving', chk('write straight to a file (asks where first; best for big exports)', toDisk, (v) => (toDisk = v)))] : []),
    row('Take', take, el('span', { className: 'xnote' }, '1 is the game’s own; others are other, equally repeatable takes')));
  const kinds: [Kind, string][] = [['loop', 'Loop'], ['stems', 'Stems'], ['oneshots', 'One-shots'], ['runs', 'Full runs'], ['industry', 'Everything for this Industry'], ['everything', 'Everything']];
  const btns = new Map<Kind, HTMLButtonElement>();
  const bar = el('div', { className: 'btns xbtns' });
  for (const [k, label] of kinds) {
    const b = el('button', { type: 'button', className: k === 'loop' ? 'play' : '', onclick: () => void go(k) }) as HTMLButtonElement;
    b.dataset.kind = k; b.dataset.label = label;
    btns.set(k, b); bar.append(b);
  }
  const shotSel = el('select', { 'aria-label': 'One-shot' }) as HTMLSelectElement;
  const quick = el('div', { className: 'btns' },
    el('button', { type: 'button', textContent: 'Loop as one WAV', onclick: () => void quickLoop() }),
    shotSel,
    el('button', { type: 'button', textContent: 'That one-shot as WAV', onclick: () => void quickShot() }));
  const meter = el('progress', { max: 1, value: 0, className: 'xprog' }) as HTMLProgressElement;
  const statusTxt = el('div', { className: 'xstatus', role: 'status', 'aria-live': 'polite' }, 'Nothing exporting.');
  const cancelBtn = el('button', { type: 'button', textContent: 'Cancel', disabled: true }) as HTMLButtonElement;
  const est = el('div', { className: 'xnote' });
  root.append(
    el('h3', {}, 'Export for a DAW'),
    el('p', { className: 'xintro' }, 'Renders the sound offline, faster than real time and sample-exact (nothing is recorded from the speakers), and downloads WAV files in one ZIP: loops of a state, its stems, every interface sound, and whole runs. A README inside gives the key, tempo and contents of each.'),
    controlsBox, bar, est,
    el('div', { className: 'xquick' }, el('span', { className: 'xl' }, 'Quick try'), quick),
    el('div', { className: 'xrun' }, meter, cancelBtn), statusTxt);

  let busy: AbortController | null = null;
  cancelBtn.addEventListener('click', () => busy?.abort());

  function estimate(k: Kind): { bytes: number; secs: number; files: number } {
    const tasks = tasksFor(k, source(), s, newLedger());
    const bytes = tasks.reduce((a, t) => a + t.bytes, 0);
    return { bytes, secs: tasks.reduce((a, t) => a + t.renderSec, 0) / SPEED, files: tasks.reduce((a, t) => a + t.files, 0) };
  }

  function refresh(): void {
    fillSrc();
    const src = source();
    loopInfo.textContent = describeLoop(src, s);
    for (const [k, b] of btns) {
      const e = estimate(k);
      b.textContent = `${b.dataset.label} · ${k === 'stems' || k === 'industry' || k === 'everything' ? 'up to ' : '≈ '}${mb(e.bytes)}`;
      b.title = `${e.files} files, about ${dur(e.secs)} to make`;
    }
    const ev = estimate('everything');
    est.textContent = `48 kHz 24-bit stereo is about 17 MB a minute per file (32-bit float: 23 MB). “Everything” at these settings is up to ${mb(ev.bytes)} and about ${dur(ev.secs)} of rendering; shorter lengths and no dry set make it much smaller.`;
    const cur = shotSel.value;
    shotSel.replaceChildren(...oneShotList(src.sector).map((x) => el('option', { value: x.what, textContent: x.what })));
    shotSel.value = cur && [...shotSel.options].some((o) => o.value === cur) ? cur : 'reveal';
  }

  function show(st: Status): void {
    meter.value = st.frac;
    statusTxt.textContent = `${st.phase}: ${st.file} · file ${Math.min(st.done + 1, st.total)} of ${st.done >= st.total ? st.done : `≤ ${st.total}`} · ${mb(st.bytes)} written · ${dur(st.elapsed)} gone${st.eta != null ? ` · about ${dur(st.eta)} to go` : ''}`;
  }

  function lock(on: boolean): void {
    for (const b of btns.values()) b.disabled = on;
    for (const b of quick.querySelectorAll('button')) (b as HTMLButtonElement).disabled = on;
    cancelBtn.disabled = !on;
  }

  async function guard(f: (sig: AbortSignal) => Promise<string>): Promise<void> {
    if (busy) return;
    busy = new AbortController();
    lock(true);
    root.dataset.state = 'busy';
    try {
      statusTxt.textContent = await f(busy.signal);
      root.dataset.state = 'done';
    } catch (e) {
      root.dataset.state = e instanceof Cancelled ? 'cancelled' : 'error';
      statusTxt.textContent = e instanceof Cancelled ? 'Cancelled. Nothing was downloaded.' : `Export failed: ${(e as Error)?.message ?? e}`;
      meter.value = 0;
    } finally {
      busy = null;
      lock(false);
    }
  }

  async function go(k: Kind): Promise<void> {
    if (busy) return;
    const src = source();
    const name = `rebound-audio_${k === 'everything' ? 'everything' : `${src.sector}_${k}`}${k === 'loop' || k === 'stems' ? `_${src.state}` : ''}.zip`;
    // The file picker wants the click's gesture, so it comes first.
    const target = toDisk && canWriteFiles() ? await pickFile(name) : null;
    if (toDisk && canWriteFiles() && !target) { statusTxt.textContent = 'No file chosen: nothing exported.'; return; }
    const e = estimate(k);
    if (!target && e.bytes > 600e6 && !confirm(`This export is up to ${mb(e.bytes)} (${e.files} files) and takes about ${dur(e.secs)}.${k === 'everything' ? ' It comes as one ZIP per Industry, so that no single download is held in memory whole.' : ''} The page stays usable meanwhile. Go ahead?`)) return;
    await guard(async (signal) => {
      // Without a file to write into, "Everything" is one ZIP per Industry (each still has the whole layout and its
      // own README): a browser holds a download in memory until it is saved.
      const parts = k === 'everything' && !target ? EXPORT_INDUSTRIES.map((x) => [x, `rebound-audio_everything_${x}.zip`] as const) : [[null, name] as const];
      let files = 0, bytes = 0, secs = 0;
      for (const [only, nm] of parts) {
        const ledger = newLedger();
        const tasks = tasksFor(k, src, s, ledger).filter((t) => !only || t.sector === only);
        const r = await runExport(k, tasks, s, ledger, { signal, onStatus: show, name: nm, target });
        if (r.blob) save(r.blob, r.name);
        files += r.files; bytes += r.bytes; secs += r.seconds;
      }
      return `Done: ${files} files, ${mb(bytes)}, in ${dur(secs)}. ${target ? `Written to ${name}.` : `Downloaded ${parts.map((x) => x[1]).join(', ')}.`}`;
    });
  }

  async function quickLoop(): Promise<void> {
    await guard(async (signal) => {
      const files = await runFiles(tasksFor('loop', source(), s, newLedger()), s, { signal, onStatus: show });
      for (const f of files) save(f.blob, f.name);
      return `Downloaded ${files.map((f) => f.name).join(', ')}.`;
    });
  }

  async function quickShot(): Promise<void> {
    const want = shotSel.value;
    await guard(async (signal) => {
      const src = source();
      const one = oneShotList(src.sector).filter((x) => x.what === want);
      const files = await runFiles([oneShotsTask(src.sector, s, newLedger(), one)], s, { signal, onStatus: show });
      for (const f of files) save(f.blob, f.name);
      return `Downloaded ${files.map((f) => f.name).join(', ')}.`;
    });
  }

  refresh();
  return { el: root, refresh };
}
