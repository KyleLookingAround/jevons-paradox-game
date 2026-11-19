// Runs an export: renders each task's files, encodes each as WAV in one-second slices, and writes them into a
// store-only ZIP piece by piece. Every piece becomes a Blob as soon as it is made (the browser keeps Blob data out of
// the page's heap, on disk if it must), so a large export never holds the archive, or a file, twice. The page yields
// between slices and between render steps, and a cancel stops at the next step.
import { wavHeader, wavSamples, type WavFormat } from './wav';
import { ZipWriter, crc32Init, crc32Update, crc32Final, type Part } from './zip';
import { SR } from './naming';
import { dbfs } from './loop';
import { holdBank, prewarm, jobsFor, Cancelled } from './render';
import { readme, ROOT, type Task, type Ledger, type Settings, type Kind, type OutFile, seedOf } from './plan';
import type { Job } from '../jobs';

export interface Status {
  /** What is happening ('synthesising', 'rendering', 'writing', 'done'). */
  phase: string;
  /** The file being made. */
  file: string;
  /** Files written / expected (expected is an upper bound: silent stems are skipped). */
  done: number;
  total: number;
  bytes: number;
  /** 0–1 overall, seconds elapsed, seconds to go (null until there is a fair guess). */
  frac: number;
  elapsed: number;
  eta: number | null;
}

const yieldNow = () => new Promise<void>((r) => setTimeout(r, 0));
const SLICE = SR;   // frames per encoded piece (one second)

/** Encode one file as WAV pieces (header first) with its CRC-32, peak and RMS; yields between pieces. */
export async function encodePieces(chans: Float32Array[], fmt: WavFormat, signal?: AbortSignal): Promise<{ parts: Part[]; crc: number; size: number; peak: number; rms: number }> {
  const n = chans[0].length;
  const head = wavHeader(n, chans.length, SR, fmt);
  let crc = crc32Update(crc32Init(), head), size = head.length, peak = 0, ss = 0;
  const parts: Part[] = [head];
  for (let a = 0; a < n; a += SLICE) {
    if (signal?.aborted) throw new Cancelled();
    const b = Math.min(n, a + SLICE);
    for (const c of chans) for (let i = a; i < b; i++) { const x = c[i]; ss += x * x; const y = x < 0 ? -x : x; if (y > peak) peak = y; }
    const bytes = wavSamples(chans, fmt, a, b);
    crc = crc32Update(crc, bytes);
    size += bytes.length;
    parts.push(new Blob([bytes as Uint8Array<ArrayBuffer>]));
    await yieldNow();
  }
  if (size & 1) { const pad = new Uint8Array(1); crc = crc32Update(crc, pad); parts.push(pad); size++; }
  return { parts, crc: crc32Final(crc), size, peak, rms: Math.sqrt(ss / Math.max(1, n * chans.length)) };
}

/** One WAV as a Blob (the quick single-file downloads). */
export async function wavBlob(chans: Float32Array[], fmt: WavFormat, signal?: AbortSignal): Promise<Blob> {
  const e = await encodePieces(chans, fmt, signal);
  return new Blob(e.parts as BlobPart[], { type: 'audio/wav' });
}

function sectorsOf(tasks: Task[]): string[] { return [...new Set(tasks.map((t) => t.sector))]; }

/** Synthesise every buffer the tasks need, ahead of rendering. Returns a function that lets go of them. */
async function warm(tasks: Task[], s: Settings, signal: AbortSignal | undefined, on: (f: number) => void): Promise<() => void> {
  const jobs: Job[] = sectorsOf(tasks).flatMap((x) => jobsFor(x, undefined, seedOf(s.take)));
  return prewarm(jobs, signal, (d, of) => on(d / of));
}

export interface Result { blob: Blob | null; name: string; files: number; bytes: number; seconds: number }

/** Where the archive goes: Blob pieces gathered into one Blob for a download (any browser), or straight into a file
 *  the person chose (the File System Access API, where there is one), so an archive of any size never sits in memory. */
export interface FileTarget { write: (p: Part) => Promise<void>; close: () => Promise<void>; abort: () => Promise<void> }

type SaveWin = { showSaveFilePicker?: (o: unknown) => Promise<{ createWritable: () => Promise<{ write: (d: unknown) => Promise<void>; close: () => Promise<void>; abort: () => Promise<void> }> }> };
export const canWriteFiles = (): boolean => typeof (globalThis as unknown as SaveWin).showSaveFilePicker === 'function';

/** Ask where to save (call first thing in a click handler: the browser wants a user gesture). Null if refused. */
export async function pickFile(name: string): Promise<FileTarget | null> {
  try {
    const h = await (globalThis as unknown as SaveWin).showSaveFilePicker!({ suggestedName: name, types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }] });
    const w = await h.createWritable();
    return { write: (p) => w.write(p), close: () => w.close(), abort: () => w.abort().catch(() => {}) };
  } catch { return null; }
}

/** Run the tasks into one ZIP. */
export async function runExport(kind: Kind, tasks: Task[], s: Settings, ledger: Ledger, opts: { signal?: AbortSignal; onStatus?: (st: Status) => void; name?: string; target?: FileTarget | null } = {}): Promise<Result> {
  const { signal } = opts;
  const t0 = performance.now();
  const total = tasks.reduce((a, t) => a + t.files, 0);
  const work = tasks.reduce((a, t) => a + t.renderSec, 0) || 1;
  const pieces: Part[] = [];
  const target = opts.target ?? null;
  const zip = new ZipWriter(target ? (p) => target.write(p) : (p) => { pieces.push(p instanceof Uint8Array ? new Blob([p as Uint8Array<ArrayBuffer>]) : p); });
  let done = 0, before = 0, file = '', phase = 'synthesising';
  const status = (frac: number) => {
    const elapsed = (performance.now() - t0) / 1000;
    const f = Math.max(0, Math.min(1, frac));
    opts.onStatus?.({ phase, file, done, total, bytes: zip.bytes, frac: f, elapsed, eta: f > 0.03 && elapsed > 3 ? (elapsed * (1 - f)) / f : null });
  };
  holdBank(true);
  let release: (() => void) | null = null;
  try {
    release = await warm(tasks, s, signal, (f) => { file = 'synthesising the sounds'; status(0.02 * f); });
    phase = 'rendering';
    for (const t of tasks) {
      if (signal?.aborted) throw new Cancelled();
      file = t.label;
      const ctx = { settings: s, signal, progress: (f: number) => status(0.02 + (0.98 * (before + Math.min(1, f) * t.renderSec)) / work), info: (x: string) => { file = `${t.label} · ${x}`; } };
      for await (const f of t.run(ctx)) {
        await add(f);
      }
      before += t.renderSec;
      status(0.02 + (0.98 * before) / work);
    }
    phase = 'writing';
    const text = readme(kind, s, ledger, '');   // no date or timing in it: the same export gives the same archive
    await zip.add(`${ROOT}/README.txt`, new TextEncoder().encode(text.replace(/\n/g, '\r\n')));
    await zip.close();
    if (target) await target.close();
    phase = 'done';
    status(1);
    const name = opts.name ?? `rebound-audio_${kind}.zip`;
    return { blob: target ? null : new Blob(pieces as BlobPart[], { type: 'application/zip' }), name, files: ledger.files.length, bytes: zip.bytes, seconds: (performance.now() - t0) / 1000 };
  } catch (e) {
    if (target) await target.abort();
    throw e;
  } finally {
    release?.();
    holdBank(false);
  }

  async function add(f: OutFile): Promise<void> {
    phase = 'writing';
    file = f.path.slice(ROOT.length + 1);
    const e = await encodePieces(f.chans, s.fmt, signal);
    await zip.addParts(f.path, e.parts, e.crc);
    ledger.files.push({ path: f.path, seconds: f.chans[0].length / SR, peakDb: dbfs(e.peak), rmsDb: dbfs(e.rms), note: f.note, sector: f.sector, kind: f.kind });
    done++;
    phase = 'rendering';
  }
}

/** Run tasks and hand back their files (no ZIP): the quick single-file downloads. */
export async function runFiles(tasks: Task[], s: Settings, opts: { signal?: AbortSignal; onStatus?: (st: Status) => void; pick?: (f: OutFile) => boolean } = {}): Promise<{ name: string; blob: Blob }[]> {
  const out: { name: string; blob: Blob }[] = [];
  const t0 = performance.now();
  const work = tasks.reduce((a, t) => a + t.renderSec, 0) || 1;
  let before = 0;
  holdBank(true);
  let release: (() => void) | null = null;
  try {
    release = await warm(tasks, s, opts.signal, () => {});
    for (const t of tasks) {
      const ctx = { settings: s, signal: opts.signal, progress: (f: number) => { const fr = (before + f * t.renderSec) / work; const el = (performance.now() - t0) / 1000; opts.onStatus?.({ phase: 'rendering', file: t.label, done: out.length, total: 1, bytes: 0, frac: fr, elapsed: el, eta: fr > 0.05 ? (el * (1 - fr)) / fr : null }); }, info: () => {} };
      for await (const f of t.run(ctx)) {
        if (opts.pick && !opts.pick(f)) continue;
        out.push({ name: f.path.split('/').pop()!, blob: await wavBlob(f.chans, s.fmt, opts.signal) });
      }
      before += t.renderSec;
    }
    return out;
  } finally {
    release?.();
    holdBank(false);
  }
}
