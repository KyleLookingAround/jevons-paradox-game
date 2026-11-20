// M5 follow-up 2 (Core A): a real Take office (fixtures/m5/office-offer.json, the real content) leaves a playable
// Ministry: built revealed (the wipe sets every Institution to level 0 and the reveal card's Industry is capstoned), the
// chair Industry's levers visible and raisable, the budget drawable, the Market's order (Pryce's) available, the Commons
// offered, every feature unlocked before office still unlocked, letters still drawn. Nothing is set by hand.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
// @ts-ignore — node types are not installed
import { readFileSync } from 'node:fs';
import type { Content, GameState } from '../types';
import { model } from './index';
import { content as REAL } from '../content';
import { chairIdx } from './chair/chairIndex';

const C = REAL as Content;
const offer = (): GameState => model.deserialize(readFileSync('fixtures/m5/office-offer.json', 'utf8'), C)!;

describe('M5: a real Take office leaves a playable Ministry (no flag set by hand)', () => {
  const before = offer();
  const taken = model.takeOffice(before, C);
  let s = taken;
  for (let t = 0; t < 120; t++) s = model.tick(s, C, 1);
  const chairSector = chairIdx(C).chairSectors.find((x) => s.sectors[x]?.open)!;
  test('the Ministry is built revealed, and stays so', () => {
    expect(before.officeOffer).toBe(true);
    expect(taken.chair).toBeTruthy();
    expect(taken.flags.revealed).toBe(true);
    expect(s.flags.revealed).toBe(true);
  });
  test('the chair Industry\'s levers are visible and one can be raised as Mandate allows', () => {
    const lv = model.leverViews(s, C).filter((v) => v.def.sector === chairSector);
    expect(lv.length).toBeGreaterThan(0);
    expect(lv.every((v) => v.visible || (v.def.requires ?? []).length > 0 || !!v.def.when)).toBe(true);
    const r = lv.find((v) => v.canRaise)!;
    expect(r).toBeDefined();
    expect(model.setLever(s, C, r.def.id, r.level + 1).levers[r.def.id].level).toBe(r.level + 1);
  });
  test('the budget is drawable, the Market\'s order (Pryce\'s policy) available, the Commons offered', () => {
    expect(model.drawBudget(s, C, chairSector).sectors[chairSector].budget).toBeTruthy();
    const d = model.derive(s, C);
    expect(d.orders.market.available).toBe(true);
    expect(model.commonsViews(s, C).length).toBeGreaterThan(0);
  });
  test('every feature unlocked before office is still unlocked, and chair arrives', () => {
    const f0 = model.derive(before, C).features, f1 = model.derive(s, C).features;
    for (const k of Object.keys(f0) as (keyof typeof f0)[]) if (f0[k]) expect(f1[k]).toBe(true);
    expect(f1.chair).toBe(true);
  });
  test('letters are still drawn in the Ministry', () => {
    let x = s;
    for (let t = 0; t < 900 && !x.dispatch.offered.length; t++) x = model.tick(x, C, 1);
    expect(x.dispatch.offered.length).toBeGreaterThan(0);
  });
});
