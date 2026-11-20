// The late text split (src/content/textsplit.ts; docs/adr/ADR-2026-11-20-late-content-text.md): the page's stub plus
// the late strings is the content, exactly; and the simulation on the stub (the page before the text arrives) equals
// the simulation on the whole content in every number, so the split can never move the game.
// @ts-ignore — bun-types are not installed (see model.test.ts)
import { describe, expect, test } from 'bun:test';
import { model } from '../core';
import { content as C } from './index';
import { applyLateText, dataLiteral, splitLateText, walkLateText } from './textsplit';
import { play, spend } from '../balance.kit';
import type { Content, GameState } from '../types';

const { stub, strings } = splitLateText(C);

/** Every non-string leaf of a value, with its path: the numbers, flags and shape, not the words. */
function numbers(v: unknown, path = '', out: string[] = []): string[] {
  if (typeof v === 'string') return out;
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) numbers((v as Record<string, unknown>)[k], path + '.' + k, out);
    return out;
  }
  out.push(path + '=' + String(v));
  return out;
}

describe('the late text split', () => {
  test('stub plus late strings is the content, exactly', () => {
    const again = splitLateText(C).stub;
    expect(applyLateText(again, strings)).toBe(true);
    // toStrictEqual tells undefined keys and Infinity apart (JSON would not).
    expect(again).toStrictEqual(C as unknown as typeof again);
  });

  test('the stub literal is the stub', () => {
    const back = new Function('return ' + dataLiteral(stub))();
    expect(back).toStrictEqual(stub);
  });

  test('a late part that does not fit changes nothing', () => {
    const s2 = splitLateText(C).stub;
    expect(applyLateText(s2, strings.slice(1))).toBe(false);
    expect(applyLateText(s2, [...strings.slice(0, -1), 3])).toBe(false);
    expect(s2).toStrictEqual(stub);
  });

  test('the split takes words only, and most of them', () => {
    // No id, kind, stat or condition key is ever late.
    const keys = new Set<string>();
    walkLateText(C, (h, k) => { if (typeof k === 'string') keys.add(k); else keys.add('[variant]'); });
    for (const k of keys) expect(['id', 'sector', 'type', 'kind', 'stat', 'op', 'owns', 'feature', 'cast', 'app', 'name', 'headline', 'title']).not.toContain(k);
    // The first Industry is whole in the stub: its card words are on the first screen.
    const first = C.sectorOrder[0];
    expect(stub.sectors[first]).toStrictEqual(C.sectors[first]);
    expect(stub.upgrades.filter((u) => u.sector === first)).toStrictEqual(C.upgrades.filter((u) => u.sector === first));
    expect(strings.join('').length).toBeGreaterThan(100_000);
    // No late string is an id of anything in the content (a rule reference blanked by mistake would be).
    const ids = new Set<string>();
    const collect = (v: unknown): void => { if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'id' && typeof x === 'string') ids.add(x); collect(x); } };
    collect(C);
    for (const id of C.sectorOrder) ids.add(id);
    expect(strings.filter((x) => ids.has(x))).toEqual([]);
  });

  test('no headline variant is blank in the stub (a news line made before the text arrives is a sentence)', () => {
    const lists: string[][] = [];
    for (const v of Object.values(stub.headlines ?? {})) lists.push(v as string[]);
    for (const s of Object.values(stub.sectorHeadlines ?? {})) for (const v of Object.values(s ?? {})) lists.push(v as string[]);
    for (const a of stub.ambient ?? []) lists.push(a.text);
    expect(lists.length).toBeGreaterThan(50);
    for (const l of lists) for (const x of l) expect(x.length).toBeGreaterThan(0);
  });
});

/** A plain scripted player that reads only the content it is given: ticks at dt = 1, the cheapest affordable card
 *  every 10 s, every affordable application every 20 s, a Reckoning when one is pending. */
function drive(s0: GameState, c: Content, seconds: number): GameState {
  let s = s0;
  for (let t = 0; t < seconds; t++) {
    s = model.tick(s, c, 1);
    if (t % 10 === 0) {
      const v = model.upgradeViews(s, c).filter((x) => x.affordable).sort((a, b) => a.cost - b.cost)[0];
      if (v) s = model.buyUpgrade(s, c, v.def.id);
    }
    if (t % 20 === 5) {
      for (const id of c.sectorOrder) for (const a of c.sectors[id].applications) {
        const n = model.foundApp(s, c, a.id);
        if (n !== s) s = n;
      }
    }
    if (model.derive(s, c).pendingReckoning) s = model.reckon(s, c);
  }
  return s;
}

describe('the simulation on the stub equals the simulation on the content, in every number', () => {
  // Starts: a fresh game; the end of an efficiency run 1; a budget run 2 at 30 minutes (letters on the way).
  const fresh = model.createState(C, undefined, 7);
  const r1 = play(model.createState(C, undefined, 3), 'efficiency', { stopAt: 1500 }).s;
  const r2 = play(spend(model.reckon(r1, C), true), 'budget', { stopAt: 1800 }).s;
  const cases: [string, GameState, number][] = [['fresh', fresh, 1500], ['run 1 end', r1, 900], ['run 2', r2, 1200]];
  for (const [name, s0, secs] of cases) {
    test(`${name}: ${secs} s of play`, () => {
      const a = drive(s0, C, secs);
      const b = drive(s0, stub, secs);
      expect(numbers(b)).toEqual(numbers(a));
      expect(numbers(model.derive(b, stub))).toEqual(numbers(model.derive(a, C)));
      expect(numbers(model.upgradeViews(b, stub))).toEqual(numbers(model.upgradeViews(a, C)));
      expect(numbers(model.leverViews(b, stub))).toEqual(numbers(model.leverViews(a, C)));
      // No news line made on the stub is empty.
      for (const n of b.news) expect(n.text.length).toBeGreaterThan(0);
    }, 60_000);
  }
  test('an hour away (fastForward) from run 2', () => {
    const a = model.fastForward(r2, C, 3600);
    const b = model.fastForward(r2, stub, 3600);
    expect(numbers(b)).toEqual(numbers(a));
  }, 60_000);
});
