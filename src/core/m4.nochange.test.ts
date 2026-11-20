// M4 test 1, "no fields, no change": scripted hours (m4.golden.ts) on the M2 and M3 fixtures reproduce, bit for bit,
// the trajectories the M3 core (12d42c3) produced before any M4 change. The real content of that commit is checked the
// same way by design/scratch/m4core/golden-real.ts (a snapshot of src/content; IDENTICAL on every line).
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model } from './index';
import { fixture, fixtureM3, fixtureM3Gated } from './fixture';
import { trajectoryM4 } from './m4.golden';

const GOLDEN: Record<string, { hash: string; events: number; last: number[] }> = {
  fixture: { hash: '3ad55921-dc3663c9', events: 92, last: [3600, 4333.978777379387, 58.15291726635991, 24.56092320201433, 198.83378677127402, -1, -1, -1] },
  fixtureM3: { hash: '5fbb757d-84a277f5', events: 128, last: [3600, 36429.08549612793, 61.72972393307287, 22.305338845103847, 249.01149578754325, -1, -1, -1] },
  fixtureM3Gated: { hash: '4e5a3220-486d11de', events: 126, last: [3600, 36429.08549612793, 61.72972393307287, 22.305338845103847, 249.01149578754325, -1, -1, -1] },
};
const C = { fixture, fixtureM3, fixtureM3Gated };

describe('M4: no fields, no change (M3 core trajectories, bit for bit)', () => {
  for (const k of Object.keys(GOLDEN) as (keyof typeof C)[]) {
    test(`${k}: a scripted hour matches the M3 core exactly`, () => {
      const t = trajectoryM4(model, C[k]);
      expect(t.samples[t.samples.length - 1]).toEqual(GOLDEN[k].last);
      expect(t.events).toBe(GOLDEN[k].events);
      expect(t.hash).toBe(GOLDEN[k].hash);
    });
  }
});
