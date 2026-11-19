# src/core — the simulation

Pure TypeScript implementing `ModelApi` from `src/types.ts`: no DOM, no `Date.now()`, no `Math.random()`, and no
function mutates the state it is given. `index.ts` is the only public entry point (`model`, plus `evalCond`,
`statValue`, `substitute`, `leverMaxLevel`, `leverLevelDef` and the constants); nothing outside this folder imports
any other module here, except the test fixture (`fixture.ts`, also used by `tools/balance.ts --fixture`). Split from the old `src/model.ts` without changing behaviour (M2).

## Modules, lowest layer first

A module imports only from modules in layers above it in this table (no cycles).

| Layer | Module | Owns |
|---|---|---|
| 0 | `constants.ts` | Constants chosen by the model (defaults, solver limits, history and news sizes, projection horizon). |
| 0 | `util.ts` | `fin`, `clamp`, `isObj`. |
| 0 | `contentIndex.ts` | `idx(content)`: lookups by id, solve order, fork graph, names. Cached per Content object. |
| 0 | `calendar.ts` | The calendar year and the current Age. |
| 1 | `steady.ts` | Budget lines (decline, floor, hold, tolerance), standing-cap draw delay, decade length and rewards. |
| 1 | `hindsight.ts` | The Hindsight terms a Reckoning would pay. |
| 1 | `headlines.ts` | Headline choice, case-aware placeholders, the news list. |
| 2 | `effects.ts` | Standing effects folded into `Mods` (cached), η and flow capacity, one-off effects. Institution levels and seats. |
| 3 | `levers.ts` | Lever levels (authored and repeat), visibility, recycle, upkeep, the per-sector aggregate, the levy's Mandate share. |
| 3 | `population.ts` | Population growth and the demographic transition. |
| 4 | `solver.ts` | One sector's price/demand fixed point (duty, cap, substitution, rationing, review). Hot path. |
| 5 | `flows.ts` | Every open sector solved in order (spill, drawsOn), cached per state; pending Reckoning; the shadow and instruments. |
| 6 | `conditions.ts` | `Cond`: stat values, evaluation, checklist labels. |
| 6 | `state.ts` | Fresh meta, run stats and sectors, baselines, history samples, `createState`. |
| 6 | `purchases.ts` | Upgrades (cost, visibility, forks, applying), founding applications, the click. |
| 6 | `policy.ts` | `setLever`, `setLeverRecycle`, `drawBudget`, lever views. |
| 7 | `unlocks.ts` | Which sectors may open next, whether one opens, their checklists. |
| 7 | `prestige.ts` | The Reckoning, Know-how, Institutions, the loadout; their views. |
| 7 | `serialise.ts` | `serialize`, `deserialize`, the v1 → v2 migration. |
| 8 | `step.ts` | `step`, `tick`, `fastForward`. Hot path; applies every per-step rule (streaks, decades, Steady State, crises, backfire, lapses, unlocks, the win, achievements). |
| 8 | `derive.ts` | `derive()`: the view the UI reads every frame. |
| 9 | `projections.ts` | The upgrade cards' "this decade" and "brings within reach" projections (cached), and upgrade views. |
| 10 | `index.ts` | The registry: assembles `model` and the public exports. |

Caches are module-level `WeakMap`s keyed by object identity (content, state, `state.upgrades`, `state.levers`,
flows), each owned by one module. They stay correct only because states are never mutated: always build a new object
for anything that changes.

## Where new things go

- **A new mechanic** (M2: `orders.ts`, `commons.ts`, `charters.ts`; M3: `dispatch.ts`, `history.ts`, one module per
  Industry mechanic): a new module, at the lowest layer its imports allow. Its pure rules and actions live there;
  `index.ts` wires its actions into `model`; `derive.ts` exposes its view.
- **A rule that runs every step** must also be called from `step.ts` (and so from `fastForward` and the projections).
  `step.ts` is therefore a shared integration point: keep the call there to one line per mechanic and the logic in the
  mechanic's own module, and agree changes to it with whoever owns it this milestone.
- **Steady State and budget changes** (M2's decades against the line's own day, the sink line, paces): the parameters
  and line arithmetic belong in `steady.ts`; the streak itself is in `step.ts`.
- **A new effect type**: `effects.ts` (`Mods` and `applyEffect`, or `fireOneOffs` for a one-off).
- **A new lever kind**: `levers.ts` (range and aggregate) and `solver.ts` (what it does to prices or quantities).
- **A save-format change**: `serialise.ts` (migration in `deserialize`), with the contract commit.

Keep the hot path (`solver.ts`, `flows.ts`, `step.ts`, `derive.ts`) free of new per-step allocations and indirection;
measure µs per tick before and after (a bench lives in `design/scratch/split-baseline/bench.ts` while it exists).

## Tests

Next to the code: `model.test.ts`, `model.review.test.ts`, and the M1 mechanism tests `m1.instruments.test.ts`,
`m1.steady.test.ts`, `m1.prestige.test.ts` (shared helpers in `m1.testkit.ts`), all against `fixture.ts` (test-only
content; never imported by the game). The real-content pacing targets are in `src/balance.test.ts`.
