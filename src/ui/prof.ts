// Opt-in timing of the game loop's pieces, for tools/perf.mjs. Off by default: one boolean test per call.
// Turn on from the console with `rebound.prof.on = true`; read `rebound.prof.acc`; clear with `rebound.prof.reset()`.
export interface ProfEntry { n: number; t: number; max: number }

export const prof = {
  // tools/perf.mjs sets window.__reboundProf before the page loads, to time the boot as well.
  on: !!(globalThis as { __reboundProf?: boolean }).__reboundProf,
  acc: {} as Record<string, ProfEntry>,
  reset(): void { prof.acc = {}; },
};

export function timed<T>(name: string, f: () => T): T {
  if (!prof.on) return f();
  const t0 = performance.now();
  try { return f(); }
  finally {
    const dt = performance.now() - t0;
    const a = prof.acc[name] ?? (prof.acc[name] = { n: 0, t: 0, max: 0 });
    a.n++; a.t += dt; if (dt > a.max) a.max = dt;
  }
}
