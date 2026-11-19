# src/core — the simulation

Pure TypeScript implementing `ModelApi` from `src/types.ts`: no DOM, no `Date.now()`, no `Math.random()`, and no
function mutates the state it is given. `index.ts` is the only public entry point (`model`, plus `evalCond`,
`statValue`, `substitute`, `leverMaxLevel`, `leverLevelDef` and the constants); nothing outside this folder imports
any other module here, except the test fixture (`fixture.ts`, also used by `tools/balance.ts --fixture`). Split from the old `src/model.ts` without changing behaviour (M2).

## Modules, lowest layer first

A module imports only from modules in layers above it in this table (no cycles).

| Layer | Module | Owns |
|---|---|---|
| 0 | `constants.ts` | Constants chosen by the model (defaults, solver limits, history and news sizes, projection horizon, bucket and step; M2 defaults). |
| 0 | `util.ts` | `fin`, `clamp`, `isObj`. |
| 0 | `contentIndex.ts` | `idx(content)`: lookups by id (M2: dividends, Commons, Charters, staged upgrades), solve order, fork graph, names. Cached per Content object. |
| 0 | `calendar.ts` | The calendar year, the current Age, `yearAt` (M2). |
| 0 | `events.ts` | M2: `emit` / `pushEvents` (seq from `meta.eventSeq`, the `EVENTS_MAX` trim), the headline → event mapping. |
| 0 | `features.ts` | The unfolding: `featureOn` (a feature absent from content is on), `featuresView` (Derived.features), grandfathering for saves from before it. |
| 0 | `record.ts` | M2: decisions and automated actions per model decade, `run.opening`, the `asDecision` wrapper. |
| 1 | `steady.ts` | Budget lines; M2: paces, the line's own day (`decadeWellbeing`), `clearP`, clear skies, `sinkR`, decade choices, `newBudget`. |
| 1 | `hindsight.ts` | The Hindsight terms a Reckoning would pay (M2: lean decades, settled sectors, less what was withheld for time away). |
| 1 | `headlines.ts` | Headline choice, case-aware placeholders (M2: `{name}`), the news list. |
| 2 | `effects.ts` | Standing effects folded into `Mods` (cached per state; M2 sources: Charter, dividends, Commons, settle dividends, institution loans; M2 effects), η and flow capacity, one-off effects. |
| 3 | `levers.ts` | Lever levels, visibility (M2: settled sectors, loans), recycle, upkeep, the per-sector aggregate, the levy's Mandate share. |
| 3 | `population.ts` | Population growth and the demographic transition. |
| 3 | `commons.ts` | M2: the Commons arithmetic (open, wellbeing, intensity, parameters). |
| 4 | `solver.ts` | One sector's price/demand fixed point (unchanged in M2: the 'commons' levy share is taken in flows.ts). Hot path. |
| 5 | `flows.ts` | Every open sector solved in order, cached per state; M2: settled sectors' frozen flows, excess and defence, Commons intensity and wellbeing, `steadyView` (the decade and Steady conditions), `primeFocusedFlows` for projections; the pending Reckoning; the shadow and instruments. |
| 6 | `conditions.ts` | `Cond`: stat values (M2 stats and `owns` kinds), evaluation, checklist labels. |
| 6 | `state.ts` | Fresh meta (M2: default orders), run stats and sectors, baselines, history samples (M2: the sink line), `createState`, `isFreshRun`, `withMeta` (the between-runs rebuild). |
| 6 | `purchases.ts` | Upgrades and foundings by any actor (M2: opening, events, `stageOf`), the click. |
| 6 | `policy.ts` | `setLever` / `setLeverAs`, `setLeverRecycle`, `drawBudget` (M2: paces), lever views (M2: `recycleChoices`). |
| 6 | `dividends.ts` | M2: decade offers, the overflow rule, `chooseDecadeDividend`. |
| 6 | `settlement.ts` | M2: `settle`, `unsettle`, `canSettle`, the forced unsettle. |
| 7 | `commonsActions.ts` | M2: `buyCommons` (fund first), `commonsViews`. |
| 7 | `unfold.ts` | The unfolding's unlock check (`dueFeature`, every 5 s of run time in the step, never away; and in reckon()), one feature at a time, spaced by `featureGapSeconds`. |
| 7 | `unlocks.ts` | Which sectors may open next, whether one opens, their checklists. |
| 8 | `orders.ts` | M2: order ticks, the Market, the Civil Service, Treasury rules, `setOrders`, `OrdersView`. |
| 8 | `charters.ts` | M2: `mix32`, the offer draw, `chooseCharter`. |
| 9 | `prestige.ts` | The Reckoning (M2: run history, openings, the offer, the 'reckoning' event), Know-how (M2: `knowhowPeak`, the respec), Institutions, the loadout; their views. |
| 9 | `serialise.ts` | `serialize`, `deserialize`, the v1 → v2 and v2 → v3 migrations, element-by-element validation. |
| 10 | `step.ts` | `step`, `tick`. Hot path; applies every per-step rule; one call per M2 mechanic (dividends, forced unsettles, events, `runOrders` last). |
| 11 | `offline.ts` | M2: `fastForward` with holds, the cap and the `OfflineReport`; the offline fix: Hindsight at `offline.hindsightRate` (`run.hindsightWithheld`) and steps run `away` (no dividend overflow). |
| 12 | `derive.ts` | `derive()`: the view the UI reads every frame (M2: every new field). |
| 12 | `projections.ts` | The cards' "this decade" and "brings within reach" projections (focused clones, structural cache with a 20 s bucket, optional per-sector laziness), and upgrade views. |
| 13 | `index.ts` | The registry: assembles `model` (every in-run player action wrapped by `asDecision`) and the public exports. |

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
measure µs per tick before and after (benches live in `design/scratch/split-baseline/bench.ts` and `design/scratch/m2core/ab.ts` while they exist).

## Tests

Next to the code: `model.test.ts`, `model.review.test.ts`, the M1 mechanism tests `m1.instruments.test.ts`,
`m1.steady.test.ts`, `m1.prestige.test.ts` (shared helpers in `m1.testkit.ts`), and the M2 tests `m2.steady.test.ts`,
`m2.orders.test.ts`, `m2.prestige.test.ts`, `m2.offline.test.ts`, `m2.events.test.ts`, `m2.save.test.ts`,
`m2.projections.test.ts`, and the unfolding's `unfold.test.ts`, all against `fixture.ts` (test-only content; never imported by the game) except the
projection tolerance test, which also runs the real content. The real-content pacing targets are in `src/balance.test.ts`.
