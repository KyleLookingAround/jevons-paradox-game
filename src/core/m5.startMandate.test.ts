// M5 (amend), balance lane: ChairDef.startMandate. A Ministry opens with the grant (createState in office), takeOffice's
// rebuild keeps it, the between-runs rebuild (spending Hindsight) keeps it, and a run out of office still opens at 0.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
// @ts-ignore — node types are not installed
import { readFileSync } from 'node:fs';
import type { Content, GameState } from '../types';
import { model } from './index';
import { content as REAL } from '../content';

const C = REAL as Content;
const offer = (): GameState => model.deserialize(readFileSync('fixtures/m5/office-offer.json', 'utf8'), C)!;
const withGrant = (g: number | undefined): Content => ({ ...C, chair: { ...C.chair!, startMandate: g } });

describe('M5 (amend): ChairDef.startMandate', () => {
  test('a Ministry opens with the grant; the offer run before office opens at 0', () => {
    const c = withGrant(150);
    const before = offer();
    expect(before.mandate).toBe(0);
    const taken = model.takeOffice(before, c);
    expect(taken.mandate).toBe(150);
    const again = model.createState(c, taken.meta, taken.seed);
    expect(again.mandate).toBe(150);
  });
  test('absent means 0 (the opening before M5 balance)', () => {
    const taken = model.takeOffice(offer(), withGrant(undefined));
    expect(taken.mandate).toBe(0);
  });
});
