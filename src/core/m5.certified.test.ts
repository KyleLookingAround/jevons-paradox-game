// M5 (balance lane fix): certified decades were never recorded (nothing wrote SectorState.decadesCertified or
// RunStats.certifiedDecades), so the Treaty's largest term and the 'certifiedDecades' stat read 0 for every player. A
// decade recorded in a Ministry is certified when the sector's last inspection falls inside its ten model years.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
// @ts-ignore — node types are not installed
import { readFileSync } from 'node:fs';
import type { Content, GameState } from '../types';
import { model } from './index';
import { content as REAL } from '../content';

const C = REAL as Content;
function ministry(inspect: boolean): GameState {
  let s = model.takeOffice(model.deserialize(readFileSync('fixtures/m5/office-offer.json', 'utf8'), C)!, C);
  // Ministry 1 has no Inspectors (and no concealment); the first test puts the feature on as Ministry 2 does
  if (inspect) s = { ...s, meta: { ...s.meta, features: { ...s.meta.features, inspection: { at: 0 } as never } } };
  for (let t = 0; t < 90; t++) s = model.tick(s, C, 1);
  s = model.drawBudget(s, C, 'motion');
  s = { ...s, mandate: 5000 };
  s = model.setLever(s, C, 'motion.cap', 1);
  for (let t = 0; t < 900; t++) {
    if (inspect) s = model.inspect(s, C, 'motion');
    s = model.tick(s, C, 1);
  }
  return s;
}

describe('M5: certified decades', () => {
  test('inspected every cooldown: every decade within the line is certified, and the run counts them', () => {
    const s = ministry(true);
    const es = s.sectors.motion;
    expect(es.decadesWithin.length).toBeGreaterThan(0);
    expect(es.decadesCertified?.length).toBe(es.decadesWithin.length);
    expect(es.decadesCertified!.every(Boolean)).toBe(true);
    expect(s.run.certifiedDecades).toBe(es.decadesWithin.length);
  });
  test('no inspection (Ministry 1): decades are kept but none is certified', () => {
    const s = ministry(false);
    const es = s.sectors.motion;
    expect(es.decadesWithin.length).toBeGreaterThan(0);
    expect((es.decadesCertified ?? []).some(Boolean)).toBe(false);
    expect(s.run.certifiedDecades ?? 0).toBe(0);
  });
});
