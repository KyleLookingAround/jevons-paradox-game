// M5 "no fields, no change": scripted hours (m4.golden.ts) on the M3 and M4 fixtures (no office, chair, rival or other
// M5 field) reproduce, bit for bit, the trajectories the M4 core (515f9c7, the M5 contract commit, before any M5 core
// change) produced on the same fixtures.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model } from './index';
import { fixtureM3, fixtureM4, fixtureM4Acts } from './fixture';
import { trajectoryM4 } from './m4.golden';

const GOLDEN: Record<string, { hash: string; events: number; last: number[] }> = {
  fixtureM3: { hash: '5fbb757d-84a277f5', events: 128, last: [3600, 36429.08549612793, 61.72972393307287, 22.305338845103847, 249.01149578754325, -1, -1, -1] },
  fixtureM4: { hash: '216e0c4e-35e3253e', events: 178, last: [3600, 120340.62728328095, 87.12039532235326, 18.059847359616242, 65.4160167774592, 114.28708199952362, 224.50413719567217, -1, -1, -1] },
  fixtureM4Acts: { hash: '216e0c4e-35e3253e', events: 178, last: [3600, 120340.62728328095, 87.12039532235326, 18.059847359616242, 65.4160167774592, 114.28708199952362, 224.50413719567217, -1, -1, -1] },
};
const C = { fixtureM3, fixtureM4, fixtureM4Acts };

describe('M5: no fields, no change (M4 core trajectories, bit for bit)', () => {
  for (const k of Object.keys(GOLDEN) as (keyof typeof C)[]) {
    test(`${k}: a scripted hour matches the M4 core exactly`, () => {
      const t = trajectoryM4(model, C[k]);
      expect(t.samples[t.samples.length - 1]).toEqual(GOLDEN[k].last);
      expect(t.events).toBe(GOLDEN[k].events);
      expect(t.hash).toBe(GOLDEN[k].hash);
    });
  }
});
