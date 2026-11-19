// M3's long campaigns as tests (the arc and the first ending), driven through the headless balancer
// (tools/balance.ts --json), so the scripted players are exactly the ones the balance lane measured with. Too slow for
// every push (three campaigns in parallel, about 15–20 minutes): they run only with BAL_LONG=1
//   BAL_LONG=1 bun test src/balance.long.test.ts
// Measured 19–20 Nov 2026 (M3 finish): see the assertions below.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';

declare const process: { env: Record<string, string | undefined> };
declare const Bun: { spawn(cmd: string[], opts: { stdout: 'pipe' }): { stdout: ReadableStream } };

const LONG = process.env.BAL_LONG === '1';
interface Rep { run: number; seconds: number; m2: { steadyMin: number | null }; m3?: { endingHour: number | null } }

// The three campaigns run side by side (one process each), so the file takes as long as the slowest (about 15–20 min).
function start(strategy: string, hours: number): Promise<Rep[]> {
  const p = Bun.spawn(['bun', 'run', 'tools/balance.ts', strategy, '1', `--total-hours=${hours}`, '--json', '--no-series', '--commons'], { stdout: 'pipe' }); // from the repository root, as bun test is; --ending is on by default (it settles)
  return new Response(p.stdout).text().then((out) => out.split('\n').filter((l) => l.startsWith('{"strategy"') && l.includes('"run"')).map((l) => JSON.parse(l) as Rep));
}
const firstSteadyH = (rs: Rep[]): number | null => {
  let cum = 0;
  for (const r of rs) { if (r.m2.steadyMin !== null) return (cum + r.m2.steadyMin * 60) / 3600; cum += r.seconds; }
  return null;
};
const endingH = (rs: Rep[]): number | null => rs.find((r) => r.m3?.endingHour != null)?.m3?.endingHour ?? null;

describe.skipIf(!LONG)('the arc and the first ending (long; BAL_LONG=1)', () => {
  // also run the long half of src/balance.test.ts: BAL_LONG=1 bun test src/balance.test.ts
  const HUM = LONG ? start('human', 26) : Promise.resolve([]);
  const MIX = LONG ? start('mixed', 24) : Promise.resolve([]);
  const BUD = LONG ? start('budget', 24) : Promise.resolve([]);
  test('the plausible human player reaches its first Steady State by hour 6 (measured 3.2 h)', async () => {
    const h = firstSteadyH(await HUM);
    expect(h).not.toBeNull();
    expect(h!).toBeLessThanOrEqual(6);
  }, 3_600_000);
  test('mixed reaches its first Steady State at 3–4.5 h (measured 3.35 h)', async () => {
    const h = firstSteadyH(await MIX)!;
    expect(h).toBeGreaterThanOrEqual(3 * 0.85);
    expect(h).toBeLessThanOrEqual(4.5);
  }, 3_600_000);
  // M3 finish: the first ending is every Industry settled at once, held fifty years; Settlement arrives at the first
  // Reckoning from hour 11 (src/content/features.ts). Measured 19–20 Nov 2026: mixed 15.4 h, budget 15.7 h, human 15.1 h.
  test('the first ending: mixed at 15–20 h, budget 15–22 h, human by 25 h, none before hour 12', async () => {
    const m = endingH(await MIX), b = endingH(await BUD), h = endingH(await HUM);
    expect(m).not.toBeNull(); expect(b).not.toBeNull(); expect(h).not.toBeNull();
    expect(m!).toBeGreaterThanOrEqual(15); expect(m!).toBeLessThanOrEqual(20);
    expect(b!).toBeGreaterThanOrEqual(15); expect(b!).toBeLessThanOrEqual(22);
    expect(h!).toBeGreaterThanOrEqual(12); expect(h!).toBeLessThanOrEqual(25);
  }, 3_600_000);
});

// M3 finish: each mechanic is a temptation (DESIGN.md). From one start (mixed's state at the start of run 5, written by
// --dump-at), the burning player (`efficiency`) plays one run engaging with everything, and once blind to each mechanic;
// engaging must earn at least 15% more income in that Industry. Measured 20 Nov 2026: seams +125%, load +330%, travel
// +82%, free +30%. About two minutes.
describe.skipIf(!LONG)('the mechanics as temptation (long; BAL_LONG=1)', () => {
  const STATE = 'design/scratch/temptation-run5.json';
  const run = (args: string[]): Promise<string> => new Response(Bun.spawn(['bun', 'run', 'tools/balance.ts', ...args], { stdout: 'pipe' }).stdout).text();
  const income = (out: string): Record<string, number> => {
    const line = out.split('\n').find((l) => l.startsWith('{"strategy"') && l.includes('"run"'));
    return line ? (JSON.parse(line).m3?.inc ?? {}) : {};
  };
  const probes = LONG ? run(['mixed', '4', '--json', '--no-series', `--dump-at=5`, `--dump-to=${STATE}`]).then(() => Promise.all([
    run(['efficiency', '1', `--from=${STATE}`, '--json', '--no-series']),
    run(['efficiency', '1', `--from=${STATE}`, '--json', '--no-series', '--seams=off']),
    run(['efficiency', '1', `--from=${STATE}`, '--json', '--no-series', '--ignore=load']),
    run(['efficiency', '1', `--from=${STATE}`, '--json', '--no-series', '--ignore=travel']),
    run(['efficiency', '1', `--from=${STATE}`, '--json', '--no-series', '--ignore=free']),
  ]).then((outs) => outs.map(income))) : Promise.resolve([]);
  test('the burner who engages earns at least 15% more in each mechanic\'s Industry', async () => {
    const [all, noSeams, noLoad, noTravel, noFree] = await probes;
    const gain = (a: Record<string, number>, b: Record<string, number>, e: string) => a[e] / Math.max(1e-9, b[e]) - 1;
    expect(gain(all, noSeams, 'steam')).toBeGreaterThanOrEqual(0.15);
    expect(gain(all, noLoad, 'light')).toBeGreaterThanOrEqual(0.15);
    expect(gain(all, noTravel, 'motion')).toBeGreaterThanOrEqual(0.15);
    expect(gain(all, noFree, 'compute')).toBeGreaterThanOrEqual(0.15);
  }, 1_800_000);
});
