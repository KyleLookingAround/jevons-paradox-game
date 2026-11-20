/**
 * M5 (Core A): helpers for the rival, inspection and loophole tests and experiments, on fixtureM5 (fixture.ts).
 * `ministry` builds a run with a fresh Ministry by hand (the chair state Core B's inherit.ts builds, with the rival's
 * opening purse); `adv` advances it one-second steps, calling rivalStep after each step only while step.ts does not
 * yet call it itself (detected once per content), so the same tests run before and after Core B wires it.
 */
import { YEARS_PER_SECOND } from '../types';
import type { ChairState, Content, GameState, MetaState } from '../types';
import { createState } from './state';
import { step } from './step';
import { rivalStep, freshRivalState, openingPurse } from './chair/rival';
import { computeFlows } from './flows';
import { chairIdx } from './chair/chairIndex';

export function freshChairForTest(content: Content): ChairState {
  const cd = content.chair!;
  return {
    confidence: cd.confidence.start,
    parliament: { index: 0, start: 0, pollAt: cd.elections.firstTermYears / YEARS_PER_SECOND, offer: null, chosen: null },
    pledges: [], inOpposition: false, lostInARow: 0, electionsWon: 0, inspectors: [], inspected: {}, found: {},
    compensated: {}, loopholes: {}, carveOuts: {}, litigation: {}, repealed: [], rival: freshRivalState(),
  };
}

/** A Ministry on `content` (fixtureM5): createState, the levers revealed, a fresh chair with the opening purse. */
export function ministry(content: Content, meta?: Partial<MetaState>): GameState {
  let s = createState(content, meta as MetaState | undefined);
  s = { ...s, flags: { ...s.flags, revealed: true }, mandate: 10_000 };
  if (!s.chair) s = { ...s, chair: freshChairForTest(content) };
  if (!(s.chair!.rival.capital > 0)) s = { ...s, chair: { ...s.chair!, rival: { ...s.chair!.rival, capital: openingPurse(s, content) } } };
  return s;
}

const wired = new WeakMap<Content, boolean>();
/** Does step.ts already call rivalStep (Core B's line)? Probed once per content. */
function stepWired(content: Content, s: GameState): boolean {
  const hit = wired.get(content);
  if (hit !== undefined) return hit;
  const probe = { ...s, time: Math.max(s.time, 1) };
  const n = step(probe, content, 0.5);
  const inc = computeFlows(probe, content).sectors[chairIdx(content).chairSectors[0]]?.income ?? 0;
  const w = inc > 0 && (n.chair?.rival.capital ?? 0) !== (probe.chair?.rival.capital ?? 0);
  wired.set(content, w);
  return w;
}

/** Advance `secs` seconds in 1 s steps (rivalStep after each step unless step.ts calls it); stop early at a pending
 *  Reckoning. `each` sees every state. */
export function adv(s0: GameState, content: Content, secs: number, each?: (s: GameState) => void): GameState {
  let s = s0;
  const w = stepWired(content, s0);
  for (let i = 0; i < secs; i++) {
    const n = step(s, content, 1);
    if (n === s) break;
    s = w ? n : rivalStep(s, n, content, 1);
    each?.(s);
  }
  return s;
}
