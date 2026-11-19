// The synthesis worker's entry (bundled into ./worker-src.ts by tools/audio-worker.ts; never imported by the page).
// Receives { id, job }, answers { id, chans, sr } with the sample arrays transferred.
import { runJob, type Job } from './jobs';

const scope = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage(m: unknown, t: Transferable[]): void };
scope.onmessage = (e: MessageEvent) => {
  const { id, job } = e.data as { id: string; job: Job };
  try {
    const r = runJob(job);
    scope.postMessage({ id, chans: r.chans, sr: r.sr }, r.chans.map((c) => c.buffer as ArrayBuffer));
  } catch (err) {
    scope.postMessage({ id, error: String(err) }, []);
  }
};
