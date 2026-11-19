// Live stall harness (headless Chromium, real AudioContext): a page with ONLY the soundscape (no scene), so every long
// task it records is the audio's. Driven by tools/audio-stall.cjs under CPU throttling. Not part of the game bundle.
import { createSoundscape } from '../engine';
import { runView } from '../views';
import type { Soundscape } from '../types';

interface W { __long: { at: number; ms: number }[]; __log: string[]; stall: typeof api }
const w = window as unknown as W;
w.__long = []; w.__log = [];
new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__long.push({ at: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });

let ss: Soundscape | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let sector = 'steam';
let t0 = 0;
const btn = document.createElement('button');
btn.id = 'on'; btn.textContent = 'on';
document.body.append(btn);
let clickMs = 0;
btn.addEventListener('click', () => {
  const a = performance.now();
  if (!ss) { ss = createSoundscape({ enabled: false, seed: 1 }); ss.setSector(sector); }
  ss.setEnabled(true);
  clickMs = performance.now() - a;
  // The page's 10 Hz loop feeds the next view in its own task, as the game does.
  setTimeout(() => { const b = performance.now(); ss?.update(runView(sector, 0.5, 'collapse')); w.__log.push(`first update ${(performance.now() - b).toFixed(1)} ms`); }, 0);
  w.__log.push(`click handler ${clickMs.toFixed(1)} ms`);
});

const api = {
  start(sec: string) {
    sector = sec; t0 = performance.now();
    timer = setInterval(() => { if (ss) ss.update(runView(sector, Math.min(1, 0.5 + (performance.now() - t0) / 120000), 'collapse')); }, 100);
  },
  switchTo(sec: string) { sector = sec; ss?.setSector(sec); },
  off() { const a = performance.now(); ss?.setEnabled(false); ss?.destroy(); ss = null; return performance.now() - a; },
  event(k: string) { const a = performance.now(); ss?.event(k as never); return performance.now() - a; },
  quiet(on: boolean) { if (on) ss?.suspend(); else ss?.resume(); },
  stats() { return ss?.stats() ?? null; },
  clickMs() { return clickMs; },
  stop() { if (timer) clearInterval(timer); timer = null; },
};
w.stall = api;
document.title = 'stall ready';
