# M3 contract notes

The M3 contract is `src/types.ts` at save version 4, in its own commit (`57f2e76`). These notes give the decisions the
documents did not dictate, with reasons; what was left out and why; how the later mechanics attach; and what no longer
compiles. The lane briefs are `briefs/m3-core.md`, `m3-content-mechanics.md`, `m3-content-dispatches.md`,
`m3-content-archive.md`, `m3-ui.md`, `m3-scene.md`, `m3-audio.md` and `m3-balance.md`.

Every M3 hunk of `types.ts` is additive and marked `M3:` or `/* --- M3 --- */`, because the M2.1 feature-gating work
touches the same file in the main tree (section 0). Nothing existing was reordered or reformatted.

## 0. The owner's direction: slow unfolding (M2.1), and what it changes in M3

After playing the live build the owner asked for options to unlock more slowly (the budget is confusing early; owned
Hindsight items should get out of the way). A separate "M2.1" adds a general, content-driven feature gate
(`Content.features`, `Derived.features`, a `featureUnlocked` event, unlocked features remembered in `MetaState`; the
core refuses gated actions; the UI hides locked systems). M3 therefore:

- **Defines no gate of its own.** It names eleven feature ids (`M3FeatureId`: `seams`, `load`, `travel`, `freeAtUse`,
  `sideEffects`, `dispatches`, `ambient`, `histories`, `archive`, `survey`, `bank`) for the coordinator to merge into
  M2.1's `FeatureId`, and says per id what is hidden and refused while it is off. Until the merge, "on" reads as true.
- **Separates the physics from the widget.** Load, travel and priceSeen are an Industry's economics from the moment it
  opens (gating them would change the balance when a widget appears). Their *feature* gates only the widget and its
  headline. Seams, dispatches, ambient news, Histories, the survey and the bank are gated in full (no draws, no
  actions). The Archive records notes quietly from the start and gates only the viewer. A lever's bite always acts (its
  `catch` line names the risk from the start); the gate hides the "bites back" line.
- **Places M3 after M2.1's moves in the unfolding.** M2.1 moves the Budget (decades, dividends, paces, clear skies,
  Steady State) to about run 3, the Commons to about run 4 and Settlement later. M3's systems are scheduled around
  them, at most one new system per early run and never two within five minutes, each introduced by one dry line in the
  paper. The schedule (content sets the `when`s; balance tests the spacing):

  | Feature | Window (runs / active hours) | Gate (Cond, content) | Introduced by |
  |---|---|---|---|
  | `archive` | at the first Reckoning (≈ 0.7 h) | `reckonings ≥ 1` | "The Gazette opens its archive to subscribers." |
  | `ambient` | run 2, from minute 5 | `reckonings ≥ 1` and `time ≥ 300` | none: the paper simply has more in it |
  | `dispatches` | run 2, 20–30 min (≈ 1.0–1.2 h) | `reckonings ≥ 1`, `time ≥ 1200`, revealed | the correspondent's first letter |
  | `seams` | run 2–3, when Steam's reserve is half gone | `reckonings ≥ 1`, Steam `reserveFraction < 0.5` | a Colliery Gazette line on the next seam |
  | `load` | run 3, a few minutes after Light opens | `reckonings ≥ 2`, Light open with some service delivered | an Evening Lamp line on the idle plant |
  | `travel` | with Motion (≈ run 3–4), a few minutes in | Motion open with some service delivered | a Motorist line on the hour a day |
  | `sideEffects` | run 4+, once levers are familiar | `reckonings ≥ 3` | the first 'biteBack' headline itself |
  | `freeAtUse` | with Compute (≈ hour 3) | Compute open with some service delivered | a system-log line: "info: price shown to user: £0.00" |
  | `survey` | ≈ hour 6–7, after the Civil Service | `totalHours ≥ 6` and the Civil Service available | the pamphlet (shift 3) |
  | `histories` | after the first Steady State, not before hour 8 | some `meta.steadySectors` and `totalHours ≥ 8` | one line on the Reckoning screen |
  | `bank` | off in M3 content (`bankRate` 0) | — | — |

  The cast grows from one correspondent: `CastDef.when` lets content hold each member back (Mr Whitlow after the
  budget, Mrs Fenwick with the Commons, Pryce with Motion). Early dispatches are two-armed and simple.
- **The quiet patch is now levers-only.** With the budget moved to run 3, the restraint player's three-minute stretch
  late in runs 1–2 has only levers to decide. The first simple dispatches land exactly there (run 2, 20–30 min), which
  makes them the fix. The M2 target "first decade at 18–25 minutes of run 1" is withdrawn.
- **Shop principle.** Histories and the Archive follow the reorganised Hindsight shop: what the player can act on first,
  completed things compact and out of the way (cleared Histories collapse; read Archive notes collapse to titles).

## 1. The mechanic kinds, and where each enters the solve

Four general kinds, each one optional field on `SectorDef` (or `ApplicationDef`), each with a default that leaves a
sector exactly as in M2. They are listed in the contract under "M3 MECHANICS", with the order they apply inside the
solve for a trial price p.

| Kind | Fields | Where it enters | Rebound it names | Widget |
|---|---|---|---|---|
| **seams** (Steam) | `SectorDef.seams: SeamDef[]`, `SectorState.seamsSunk`, `sinkSeam` | resource price of a stock: `p_r = basePrice × priceMul(deepest sunk) × (reserveMax/Q)^α`; sinking adds `tons` to reserve and reserveMax | supply-side: cheap power reaches the next seam; depletion postponed and enlarged | the seam ladder |
| **load** (Light) | `SectorDef.load {profiles, defaultProfile, fixedShare, floor}`, `ApplicationDef.profile` | capital cost per unit: `c_eff = c × ((1 − k) + k / max(floor, LF))`, LF = mean/peak of the hourly sum of per-app demand × profile; c_eff replaces c everywhere in the solve; such a sector takes the bisection path | utilisation: idle plant makes the next unit the cheapest to sell; night uses fill the hollows | the load curve |
| **travel** (Motion) | `SectorDef.travel {roads, exponent, hoursScale, apps}`, `ApplicationDef.lockInDecay`, `travelMul` | travel apps' saturation × the speed index `v(D) = s / (1 + (D/K)^b)`; demand at p is the unique fixed point in D (inner bisection, so the stock closed form survives) | induced demand (speed buys distance; roads refill) and lock-in (sprawl) | the travel-time dial |
| **priceSeen** (Compute) | `ApplicationDef.priceSeen {share, flat}`, the `priceSeen` effect | each app's demand reads `p_a = share × p_s + flat`; income, R and levies still at p_s; share-0 apps count as floors in the cap's squeeze limit | the frontier at its limit: a nil price cannot be lowered | the "free" tag and the bill |

Decisions:

- **Why fixed points rather than lagged state.** Load and travel could have been lagged (store the load factor or the
  speed, update each step). The exact fixed point keeps three things true that a lag would break: `derive()` agrees with
  the step; the shadow solve (η frozen) gets its own mix and congestion, so the rebound meter stays a counterfactual of
  the whole system; and projections and the Market's payback see the mechanic with no special case. The cost is one
  bisection path for Light (as flow sectors already pay) and an inner bisection for Motion; the core brief sets a
  speed budget.
- **Seams are a decision, never automated.** `sinkSeam` is the player's (the Market never sinks), gated by p_s ≤
  `reachBelow` ("cheap pumping reaches it"), so efficiency literally enlarges the reserve, and by a capital cost. The
  deepest seam's price multiplier applies to all coal (the marginal ton sets the price). Exhaustion keeps its rule: a
  player who does not sink the next seam in time still exhausts; the widget warns.
- **Load needs no tariff field.** Off-peak tariffs remain content (satMul and halfPriceMul on night uses, the existing
  fork); the mechanic makes them matter because the night uses raise the load factor and cheapen every unit. "Rival
  supply, gas against electric" stays the existing in-run fork (`light.gasWorks` / `light.powerStation`), with
  different profiles and `fixedShare` effects left to content; a two-supplier solve was not worth its cost in M3.
- **Sprawl is lock-in with decay.** M1's `lockIn` floor (a share of each app's peak) is exactly sprawl; M3 adds
  `lockInDecay` so the peak fades slowly, and reports the stock (Σ lockIn × peakD). Faster roads raise demand, which
  raises the peaks, which lock in: the sprawl that stays.
- **Code needs nothing new.** Its flow resource, the code stock with upkeep, and deletion as the only sink are its
  mechanic; M3 exposes them (`SectorDerived.upkeep`) and asks content for a `mechanic` heading. Wirth's law (Compute
  dragging Code) waits for M7.
- **`SectorDef.mechanic`** gives every Industry a one-line name, rebound and blurb, which the lint uses for "one
  mechanic per Industry" and the UI for the widget heading.

## 2. Levers that rebound

- **A new lever kind, `'measure'`**, acting through `LeverDef.effects` with times = the level's `value`. Without it a
  fuel-economy standard, a road programme or a scrappage scheme could not be levers at all (every M2 kind is a price or
  a share). M5's `standard` and `ban` can be measures.
- **`LeverDef.sideEffects`** = `{ effects, rampYears, decayYears?, unless?, blurb, unlessLabel? }`. The bite is a ramp
  in model years toward 1 while the lever is raised and the pairing does not hold, decaying as slowly when paired or
  lowered; effects apply with times = bite × level. So the side effect grows with level and time, as P10 asked, and the
  pairing (`unless`, a Cond such as `{ owns: 'motion.duty' }`) is how "a standard WITH a duty" works. The first time a
  bite reaches 0.5 in a run, a 'biteBack' headline and event fire.
- Bite is per lever (`LeverState.bite`), optional in the state (absent = 0) so that hand-built test states and migrated
  saves need nothing.

## 3. The cast, dispatches, modifiers, ambient news

- **Scheduler.** Deterministic in run time: the first draw at `firstYears`, then one draw a gap after each resolution
  (`intervalYears` with seeded jitter via the contract's `mix32`). At most `maxPending` (default 1) wait; a draw is
  skipped while full. Candidates are filtered by feature, cast member's `when`, sector open, current age, `when`, not
  offered this run, and `once`. A queued follow-up wins; otherwise the least-seen candidates across the save are
  weighed (no repeats until the eligible pool is exhausted). Pools extend one another; nothing replaces anything.
- **Expiry.** Every dispatch expires to its default arm after `expiryYears` (default 12 model years, four minutes), so
  nothing blocks play. The lint forbids hard costs and standing ("rest of run") effects on default arms, so defaults
  can never compound.
- **Offline: a letter needs a reader.** Inside `fastForward` (and `useBank`) pending dispatches still expire, but none
  is drawn. This is the lesson of M2's dividend overflow: choices nobody was there to make must not pile up. Live idle
  play (a tab left open) draws and defaults as usual.
- **Answers are decisions** (`run.decisions`) and records: this run's list (`GameState.dispatch.answered`), and the
  save's counts per arm, by anyone and by the player (`meta.dispatches`). M5's rival and the retrospective read them.
- **Actor 'dispatch'** is the standing dispatch order (`OrdersState.dispatch`): default answers for chosen cast
  members, a closing automation for shift 3, available only through an `orderUnlock 'dispatch'` effect.
- **Timed modifiers** store a reference (dispatch id and arm), not the effects, so a content fix applies to saves.
  Different sources stack; the same source refreshes its end time and never stacks with itself; at most 12.
- **One-offs of a re-answered dispatch** fire again: a letter offered again after the pool is exhausted is a new
  letter. Standing effects of an answer stand for the rest of the run (`dispatch.standing`, never trimmed).
- **Ambient news** prints at most one templated headline every `everyYears` (4 model years, 80 s), least recently used
  first, never away, never in projections. Numbers come from one `stat` per template.
- **The effect vocabulary grew by ten**, chosen for what dispatches, Histories and side effects will obviously say:
  `resourcePriceMul` (a strike, a shock, the green paradox), `intensityMul` (a tall chimney), `incomeMul` ("raise the
  rents"), `costMulOf` ("make one card cheaper"), `forbid` (Histories' "no X" and a suspended measure), `travelMul`,
  `priceSeen`, and three one-offs: `populationMul`, `pressureAdd`, `metaFlag`.

## 4. Histories

- Chosen between runs like a Charter (`MetaState.history`, `chooseHistory` while fresh), not passed to `createState`
  as the roadmap sketched: a Charter already works that way, and every between-runs rebuild then keeps it.
- A History composes with the Charter (both apply) unless its `suspend` lists `'charter'`. `suspend` also removes
  Know-how, the seated Institutions or the Market for that run ("The Statistician: no Know-how").
- `forbidUntil` lifts the History's `forbid` effects once a Cond holds ("no levers until the second crisis").
- Completion is the `goal` Cond, checked about once a real second; recorded in `meta.histories` (runs, cleared, best
  time). Rewards are options only: `reward.unlock` names locked Commons projects or locked Charters (new `locked`
  flags on both), plus an achievement, a cosmetic and a title. The History rules are written into the type's comment
  and enforced by the lint where mechanical.
- No ladder in M3 (post-game, M9, capped at 30).

## 5. The second reveal: the household return and the Proprietor's Day

- **The return's shape is fixed in the contract** (`HouseholdFigures`, twelve counts, split before and after the
  Market became available on the device), so the UI and the core agree without talking. Named keys, not the sketch's
  `number[]` with indices: indices are where the M2 lanes lost time.
- **Validation** (it is untrusted input): every key present, finite, between 0 and `RETURN_FIGURE_MAX`, floored to
  integers, internally consistent (days ≤ sessions ≤ looks); extra keys dropped; the whole return refused on any
  failure. One filing per run (the paper's annual statistics).
- **Where it lives:** `MetaState.returns`, not `GameState.returns` as the roadmap sketched, because the survey is
  cumulative and must survive Reckonings; filing is still a plain action, so the state stays a pure function of its
  inputs. Filing is not a decision (it would measure itself).
- **The reveal** is an ordinary research card with a `when` (new `UpgradeDef.when`, which M4's revivals reuse) on the
  `returned` Cond (at least three sessions each side), whose effect is a one-off `metaFlag 'proprietor'`. Setting it
  publishes the return: a 'return' headline, the template picked by direction (`'up' | 'down' | 'flat'`), so if the
  figures went down the paper says so. Later returns are published at each Reckoning, never mid-session.
- **The second twin gauges** are `SurveyView.automatedPerHour` against `decisionsPerHourAfter`, with the model's pure
  half (decisions per model decade before and after the Market, from `meta.runs`) beside them.
- **Withdrawal.** `withdrawReturn` deletes the figures from the save when the player closes the survey, and prints
  the one line ("discontinued for want of funding"). The ledger itself stays the UI's, never in the save.
- **Closing and opening** labels are fixed per order in `OrdersView.kind` and shown only after the reveal.

## 6. The Archive

`Content.archive` (notes with a `subject` id and at least one graded source) and `MetaState.archive` (unlock times).
Unlocked when the subject is first owned or seen, per a rule per kind, recorded whether or not the viewer is open, so
nothing is lost before the feature arrives. Notes are separate defs, not a field on each card, so the archive writer
never edits Industry files.

## 7. The first ending

`flags.won` already means "every Industry at its sink line for 50 years" (M2). M3 records the first win in
`meta.endings.steadyAll` (an `EndingRecord`), emits 'ending' after 'won', and keeps the run going. The retrospective
Gazette is assembled by the core (`ModelApi.retrospective`) from `meta.milestones` (first times ever of fourteen kinds
of thing, written as they happen) and the templates in `Content.ending`, so the UI holds no rules. The Archive and run
history give the rest.

## 8. Things the lanes asked for

- **Why the Market is idle:** `OrdersView.marketWhy` per open sector, from static reasons and the last tick's outcome
  (`GameState.orderLog`: bought, none, cash, payback).
- **First-ever backfire:** `GameEvent.first` on 'backfire' (and 'steadyState', 'sectorOpened', 'historyCleared').
- **The machine's display name on stage changes:** `GameEvent.label` from `UpgradeDef.machine`.
- **Frozen shapes complete:** `SettledState` gains the load, travel and seen-price snapshots a consumer needs to redraw
  a settled Industry's widgets; `RunSummary.sectors` gains seams, load factor, speed and sprawl for the after picture.
- **Timing:** every M3 step event takes the time at the end of the step, and the contract fixes their order within a
  step and that two thresholds crossed in one step emit two events.
- **Actors** are named for every resolution (player, default, dispatch).
- **Placeholders:** the same substitution rules everywhere, `{cast}` added as a proper noun.
- **Banked time:** small, so specified now, default OFF: `offline.bankRate` and `bankMax` (both 0), `meta.bankedSeconds`,
  `useBank` (the away rules, no cap, the same holds), feature `bank`. M3 content leaves it off; turning it on is one
  number once the owner wants it.

## 9. Left out of M3, and why

- A two-supplier solve for gas against electric (a fork does the teaching).
- Time-of-use pricing per application under `load` (one load factor for the sector teaches the same thing).
- Downs–Thomson (transit against roads): a substitution lever can carry it in content.
- The History ladder, the weekly Almanac, records (M9).
- Wirth's law into Code (M7). Revivals (M4; `UpgradeDef.when` is ready for them).
- Return kinds other than `'household'` (later returns will add ids and their own figure lists).
- A dispatch standing order with per-arm policies (only "answer with the default" now).

## 10. How the later mechanics attach (M4–M6)

- **Fishing's renewable stock with a collapse threshold** (M4): a new `resourceKind: 'renewable'` with its own reserve
  arithmetic; `seams` stays stock-only, so nothing conflicts. The lying gauge is a new SectorDerived field.
- **Shared stocks** (Iron, M4): `resourceStock: SectorId`; seams and `seamsSunk` live on the stock's owner (Steam), and
  `sinkSeam` takes the owner's id. Iron's demand adds to the owner's drain; the seam price multiplier applies to both.
- **Inputs** (`feeds`, M4): a capCostMul-like term computed in solve order, beside spill and drawsOn; `load`'s c_eff
  multiplies whatever c results.
- **Two water gauges** (Plenty, M5): a second stock per sector; independent of all four kinds.
- **Ratchets** (Comfort, M6): `ApplicationDef.ratchet` raising satMul with use, beside `lockInDecay`.
- **Difficulty** (Proof-of-Work, M7): its own solve path selected by a field, as `load` selects bisection.
- **The rival** (M5) reads `meta.opening`, `meta.dispatches.playerArms` and History choices; `Actor` gains 'rival'.

## 11. What no longer compiles (`bunx tsc -p .`, 33 errors)

Expected; the lanes fix it. `src/types.ts` itself is clean. `tools/` is outside the tsconfig `include`.

| File | Errors | Main causes |
|---|---|---|
| `src/ui/devmock.ts` | 11 | mock MetaState, RunStats, SectorState, OrdersState, Derived, SectorDerived, AppDerived, UpgradeView, LeverView lack the M3 fields |
| `src/core/state.ts` | 5 | fresh GameState, MetaState, RunStats, SectorState and OrdersState lack the M3 fields |
| `src/core/derive.ts` | 3 | Derived, SectorDerived, AppDerived lack the M3 fields |
| `src/core/orders.ts` | 2 | OrdersState and OrdersView lack `dispatch`, `marketWhy`, `kind` |
| `src/content/content.test.ts` | 2 | `forbid`'s optional `id` widens an effect-id collection to `string \| undefined` |
| `src/core/levers.ts` | 1 | the lever-kind range record lacks 'measure' |
| `src/content/helpers.ts` | 1 | the repeat-table record lacks 'measure' |
| `src/core/policy.ts` | 1 | LeverView lacks `bite`, `forbidden` |
| `src/core/projections.ts` | 1 | UpgradeView lacks `forbidden` |
| `src/core/index.ts` | 1 | `model` lacks the M3 methods |
| `src/core/headlines.ts` | 1 | the fallback record lacks the nine new headline keys |
| `src/core/conditions.ts` | 1 | the StatKey label record lacks the new keys |
| `src/core/m1.instruments.test.ts` | 1 | a Record<StatKey, …> lacks the new keys |
| `src/content/news/fallback.ts` | 1 | headlines lack the nine new keys |
| `src/ui/game.ts` | 1 | an OrdersView literal lacks the M3 fields |

`LeverState.bite`/`bitten` are optional precisely so that the many hand-built lever states in tests still compile.

## 12. M3 finish (20 Nov 2026): what changed in the contract, additively (save version unchanged at 4)

- **The first ending's rule** (doc change, no shape change): `GameState.steadyYearsAll` now counts years with every
  Industry in `sectorOrder` open and settled; `flags.won` at `GlobalParams.endingYears` (new, default 50).
  `Derived.ending` gains `settled`, `total`, `years`, `yearsNeeded`, `hold`, `nextHold`, `room` and `next` (the
  checklist the page shows). `GlobalParams.settleMax` (new) and the effect `settleSlotAdd` (new) limit how many
  Industries may be settled at once; `GlobalParams.settleHold` (new; content leaves it 0) prices holding several.
- **The temptation's trade**: `AppDerived.wantedChange`, `UpgradeView.wantedChange`, `SeamsView.wantedChange`
  (optional; `src/core/temptation.ts`).
- **Small fixes**: `GameState.headlineUse` (headline variants least recently used first), `RunStats.historyCleared`
  and `RunStats.returnPublished` (run flags; migrated from the news when absent).
- **Effects the letter-writer asked for**: `leverCostMul`, `suspendOrder`, `leakMul`, `spillMul`.
