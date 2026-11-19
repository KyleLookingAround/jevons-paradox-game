// The synthesis queue: where every buffer the soundscape plays comes from, without blocking the page.
//
// Live (a real AudioContext): jobs go to one synthesis worker started from a Blob (./worker-src.ts), so recipe
// synthesis never runs on the main thread; results arrive as transferred sample arrays and become AudioBuffers. If no
// worker can be made (no Worker, a CSP, an error), jobs run on the main thread one per idle callback instead (each job
// is 2–40 ms on a desktop; see NOTES-m3.md). Offline and in tests (`sync`), jobs run at once, so renders are complete.
//
// The bank of finished buffers is module-wide and outlives a soundscape: AudioBuffers made with the AudioBuffer
// constructor are not tied to a context, so turning sound off and on again (the page destroys and re-creates the
// soundscape) reuses them instead of synthesising again. The bank is capped by least-recently-used and released two
// minutes after the last soundscape is destroyed. The worker is shared the same way.
import { runJob, jobId, type Job, type JobResult } from './jobs';
import { WORKER_SRC } from './worker-src';

const BANK_CAP = 2_400_000;      // cached samples (≈ 9.6 MB of float) before least-recently-used buffers are dropped
const RELEASE_MS = 120_000;      // bank and worker released this long after the last soundscape goes

type Done = (b: AudioBuffer | null) => void;

const bank = new Map<string, AudioBuffer>();
const used = new Map<string, number>();
const pinned = new Set<string>();     // noise beds and impulses: never dropped while in use
let samples = 0;
const waiting = new Map<string, Done[]>();
let worker: Worker | null | undefined;           // undefined: not tried yet; null: unavailable
let workerUrl: string | null = null;
const idleQ: [string, Job][] = [];
let idleArmed = false;
let users = 0;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
let clock = 0;
let ctorOk: boolean | undefined;
let fallbackCtx: BaseAudioContext | null = null;
/** Main-thread synthesis time spent so far (ms), for stats and tests. */
export const synthStats = { mainMs: 0, workerJobs: 0, mainJobs: 0, maxMainMs: 0 };

function makeBuffer(r: JobResult): AudioBuffer | null {
  const len = r.chans[0]?.length ?? 0;
  if (!len) return null;
  if (ctorOk !== false) {
    try {
      const b = new AudioBuffer({ length: len, numberOfChannels: r.chans.length, sampleRate: r.sr });
      r.chans.forEach((c, i) => b.copyToChannel(c as Float32Array<ArrayBuffer>, i));
      ctorOk = true;
      return b;
    } catch { ctorOk = false; }
  }
  // Older WebKit: no AudioBuffer constructor; buffers belong to the context that made them (the bank is cleared when
  // that soundscape goes).
  if (!fallbackCtx) return null;
  try {
    const b = fallbackCtx.createBuffer(r.chans.length, len, r.sr);
    r.chans.forEach((c, i) => b.getChannelData(i).set(c));
    return b;
  } catch { return null; }
}

function store(id: string, b: AudioBuffer | null): void {
  if (b) { bank.set(id, b); used.set(id, ++clock); samples += b.length * b.numberOfChannels; trim(); }
  const cbs = waiting.get(id);
  waiting.delete(id);
  if (cbs) for (const cb of cbs) { try { cb(b); } catch { /* a listener's error is not ours */ } }
}

function trim(): void {
  if (samples <= BANK_CAP) return;
  const order = [...bank.keys()].filter((k) => !pinned.has(k)).sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0));
  for (const id of order) {
    if (samples <= BANK_CAP * 0.75) break;
    if (clock - (used.get(id) ?? 0) < 40) continue;     // recently used: keep
    const b = bank.get(id)!;
    samples -= b.length * b.numberOfChannels;
    bank.delete(id); used.delete(id);
  }
}

function startWorker(): Worker | null {
  if (worker !== undefined) return worker;
  worker = null;
  try {
    if (typeof Worker !== 'function' || typeof Blob !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL) return null;
    workerUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    const w = new Worker(workerUrl);
    w.onmessage = (e: MessageEvent) => {
      const d = e.data as { id: string; chans?: Float32Array[]; sr?: number; error?: string };
      synthStats.workerJobs++;
      lost.delete(d.id);
      store(d.id, d.chans && d.sr ? makeBuffer({ chans: d.chans, sr: d.sr }) : null);
    };
    w.onerror = (ev) => {
      // The worker failed (a CSP, a parse error): everything waiting goes to the main thread's idle queue.
      try { ev.preventDefault(); } catch { /* ignore */ }
      try { w.terminate(); } catch { /* ignore */ }
      if (worker === w) worker = null;
      for (const id of waiting.keys()) if (lost.has(id)) { idleQ.push([id, lost.get(id)!]); }
      lost.clear();
      armIdle();
    };
    worker = w;
  } catch { worker = null; }
  return worker;
}
const lost = new Map<string, Job>();   // jobs sent to the worker and not yet answered (re-run if it dies)

type IdleWin = { requestIdleCallback?: (cb: (d: { timeRemaining(): number }) => void, o?: { timeout: number }) => number };
function armIdle(): void {
  if (idleArmed || !idleQ.length) return;
  idleArmed = true;
  const w = globalThis as unknown as IdleWin;
  const run = () => {
    idleArmed = false;
    const it = idleQ.shift();
    if (it) {
      const t0 = performance.now();
      let b: AudioBuffer | null = null;
      try { b = makeBuffer(runJob(it[1])); } catch { b = null; }
      const ms = performance.now() - t0;
      synthStats.mainMs += ms; synthStats.mainJobs++; synthStats.maxMainMs = Math.max(synthStats.maxMainMs, ms);
      store(it[0], b);
    }
    armIdle();
  };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(run, { timeout: 600 });
  else setTimeout(run, 30);
}

/** A soundscape starts using the queue (live), or stops. */
export function attach(ctx: BaseAudioContext | null): void {
  users++;
  if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
  if (ctx && ctorOk === false) fallbackCtx = ctx;
  if (ctx && !fallbackCtx) fallbackCtx = ctx;
}
export function detach(ctx: BaseAudioContext | null): void {
  users = Math.max(0, users - 1);
  if (ctorOk === false && ctx && fallbackCtx === ctx) { clearBank(); fallbackCtx = null; }
  else if (fallbackCtx === ctx) fallbackCtx = null;
  if (users === 0 && !releaseTimer) releaseTimer = setTimeout(() => { releaseTimer = null; if (users === 0) releaseAll(); }, RELEASE_MS);
}

function clearBank(): void { bank.clear(); used.clear(); pinned.clear(); samples = 0; }
function releaseAll(): void {
  clearBank();
  idleQ.length = 0;
  try { worker?.terminate(); } catch { /* ignore */ }
  if (workerUrl) { try { URL.revokeObjectURL(workerUrl); } catch { /* ignore */ } }
  worker = undefined; workerUrl = null; waiting.clear(); lost.clear();
}

/** The buffer for a job if it is ready; otherwise null, and the job is queued (cb is called when it is ready). With
 *  `sync`, the job runs now on this thread (offline rendering and tests). */
export function obtain(job: Job, opts: { sync?: boolean; cb?: Done; pin?: boolean; ctx?: BaseAudioContext | null } = {}): AudioBuffer | null {
  const id = jobId(job);
  if (opts.pin) pinned.add(id);
  const b = bank.get(id);
  if (b) { used.set(id, ++clock); return b; }
  if (opts.sync) {
    if (opts.ctx && !fallbackCtx) fallbackCtx = opts.ctx;
    const t0 = performance.now();
    let nb: AudioBuffer | null = null;
    try { nb = makeBuffer(runJob(job)); } catch { nb = null; }
    const ms = performance.now() - t0;
    synthStats.mainMs += ms; synthStats.mainJobs++; synthStats.maxMainMs = Math.max(synthStats.maxMainMs, ms);
    store(id, nb);
    return nb;
  }
  const cbs = waiting.get(id);
  if (cbs) { if (opts.cb) cbs.push(opts.cb); return null; }
  waiting.set(id, opts.cb ? [opts.cb] : []);
  const w = startWorker();
  if (w) {
    try { lost.set(id, job); w.postMessage({ id, job }); return null; } catch { lost.delete(id); }
  }
  idleQ.push([id, job]);
  armIdle();
  return null;
}

/** The buffer if it is in the bank, without queueing anything. */
export function peek(job: Job): AudioBuffer | null {
  const id = jobId(job);
  const b = bank.get(id);
  if (b) used.set(id, ++clock);
  return b ?? null;
}

/** Export: let go of buffers pinned for an export (they become ordinary least-recently-used entries again). */
export function unpin(jobs: Job[]): void { for (const j of jobs) pinned.delete(jobId(j)); trim(); }

/** Queued and not yet ready. */
export function pending(): number { return waiting.size; }
export function bankSamples(): number { return samples; }
/** Whether jobs are running off the main thread (a worker is up). */
export function offThread(): boolean { return !!worker; }
/** Tests only. */
export function _reset(): void { releaseAll(); users = 0; synthStats.mainMs = 0; synthStats.mainJobs = 0; synthStats.workerJobs = 0; synthStats.maxMainMs = 0; }
