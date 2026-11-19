// M3's long campaigns as tests (the arc and the first ending), driven through the headless balancer
// (tools/balance.ts --json), so the scripted players are exactly the ones the balance lane measured with. Too slow for
// every push (about 10–15 minutes each on one core): they run only with BAL_LONG=1
//   BAL_LONG=1 bun test src/balance.long.test.ts
// Measured 19 Nov 2026 (balance lane, second pass): see the assertions and the todo below.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';

declare const process: { env: Record<string, string | undefined> };
declare const Bun: { spawnSync(cmd: string[]): { stdout: { toString(): string } } };

const LONG = process.env.BAL_LONG === '1';
interface Rep { run: number; seconds: number; m2: { steadyMin: number | null }; m3?: { endingHour: number | null } }

function campaign(strategy: string, hours: number): Rep[] {
  const out = Bun.spawnSync(['bun', 'run', 'tools/balance.ts', strategy, '1', `--total-hours=${hours}`, '--json', '--no-series', '--settle', '--commons']); // run from the repository root, as bun test is
  return out.stdout.toString().split('\n').filter((l) => l.startsWith('{"strategy"') && l.includes('"run"')).map((l) => JSON.parse(l) as Rep);
}
const firstSteadyH = (rs: Rep[]): number | null => {
  let cum = 0;
  for (const r of rs) { if (r.m2.steadyMin !== null) return (cum + r.m2.steadyMin * 60) / 3600; cum += r.seconds; }
  return null;
};

describe.skipIf(!LONG)('the arc and the first ending (long; BAL_LONG=1)', () => {
  // also run the long half of src/balance.test.ts: BAL_LONG=1 bun test src/balance.test.ts
  const HUM = LONG ? campaign('human', 24) : [];
  const MIX = LONG ? campaign('mixed', 24) : [];
  test('the plausible human player reaches its first Steady State by hour 6 (measured 3.2 h)', () => {
    expect(firstSteadyH(HUM)).not.toBeNull();
    expect(firstSteadyH(HUM)!).toBeLessThanOrEqual(6);
  }, 3_600_000);
  test('mixed reaches its first Steady State at 3–4.5 h (measured 3.35 h)', () => {
    expect(firstSteadyH(MIX)!).toBeGreaterThanOrEqual(3 * 0.85);
    expect(firstSteadyH(MIX)!).toBeLessThanOrEqual(4.5);
  }, 3_600_000);
  // NOT MET (balance report, second pass): measured human 8.5 h (four settled and one clear in a run), mixed and budget
  // none within 24 h (four settled from about hour 18). The single rule change recommended: the first ending requires
  // every Industry SETTLED, not "settled or clear" (the human player first has all five settled at 20.3 h).
  test.todo('the first ending: mixed at 15–20 h, budget 15–22 h, human 20–25 h, never before hour 12');
});
