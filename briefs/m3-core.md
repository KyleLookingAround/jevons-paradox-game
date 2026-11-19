# Brief: M3 CORE lane

You bring the simulation core of "Rebound" up to the M3 contract ("Every Industry its own": mechanics, the cast,
Histories, the second reveal, a first ending). Other lanes work from the same contract at the same time and do not talk
to you: content (three lanes: mechanics, dispatches, archive), UI, scene, audio, and balance afterwards.

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`. If the contract
is wrong or missing something, work around it locally and say so in your report.

## Standing instructions

- You will be interrupted by container restarts and usage limits. Keep a progress note at
  `design/scratch/m3-core-progress.md` (what is done and verified, what is next, decisions taken), update it after each
  piece, and land one verified piece at a time (tests green, `src/core` typechecks) before starting the next.
- Make no git writes (no commit, branch, stash or push); the coordinator commits.
- The core stays pure: no DOM, no `Date.now()`, no `Math.random()`; never mutate the state passed in.

## Read first, in full

1. `src/types.ts`: the binding contract. Search "M3:", "M3 CHANGE", "M3 MECHANICS" and every `/* --- M3 --- */` hunk.
2. `design/m3-contract-notes.md`: the decisions and why, section 0 (feature gating, the unfolding) in particular.
3. `CLAUDE.md`; `src/core/README.md`; `design/m2-contract-notes.md` for the M2 rules you build on.
4. The M3 section of `design/roadmap.md`; shift 3 in `design/paradigm-shifts.md`; P8–P12 in `design/proposals.md`.
5. Your own `src/core/*.ts`, the tests, `fixture.ts` and `tools/balance.ts`.

## Feature gating (M2.1)

M2.1 adds a feature gate (`Content.features`, `Derived.features`, a `featureUnlocked` event, unlocked features in
`MetaState`). If it is merged when you start, use its helper (`featureOn(state, content, id)` or whatever it exports);
if not, write a one-line local `featureOn` that returns true and replace it when it lands. Each M3 rule says which
feature gates it (`M3FeatureId`); load, travel and priceSeen arithmetic is never gated, only their views.

## Your files (only these)

- `src/core/**` (modules, README, tests, `fixture.ts`) and `tools/balance.ts` (you may split strategies into
  `tools/strategies/<name>.ts`).
- You alone own `src/core/step.ts`, `src/core/index.ts` and `src/core/derive.ts` this milestone. Keep one line per
  mechanic in `step.ts`.

| Module (new unless marked) | Owns |
|---|---|
| `seams.ts` | seam price multiplier, reachability, cost, `sinkSeam`, `SeamsView` |
| `load.ts` | profiles → shapes, H[h], load factor, c_eff (exported for the solver), `LoadView` |
| `travel.ts` | K, s, v(D), the inner fixed point helper for the solver, hoursPerHead, sprawl, `TravelView` |
| `pricing.ts` | seen price per app (definition and effects, lowest-share rule), price-proof floors, `free` view |
| `solver.ts` (extend) | the four kinds in the order the contract gives; the bisection path for `load`; c_eff everywhere c appears; squeeze-limit floors from share-0 apps; `resourcePriceMul`, `intensityMul`, `incomeMul` |
| `sideEffects.ts` | bite ramp, `unless`, 'biteBack', the 'measure' kind's effects, `LeverView.bite` |
| `modifiers.ts` | timed modifiers: add with the stacking rule, expiry, `ModifierView` |
| `dispatch.ts` | scheduler (expiry, draw, `dispatchGap`, `dispatchFirstAt`), `answerDispatch`, default resolution, the dispatch standing order, `DispatchesView` |
| `ambient.ts` | ambient ticks, choice, stat formatting |
| `history.ts` | `chooseHistory`, `suspend`, `forbidUntil`, goal check, rewards, `historyViews` |
| `returns.ts` | `fileReturn` validation and storage, publication, `withdrawReturn`, `SurveyView` |
| `archive.ts` | subject rules, unlocking, `archiveViews` |
| `ending.ts` | milestones, the ending record, `retrospective` |
| `bank.ts` | banking after fastForward, `useBank` (reuse offline.ts's loop) |
| `effects.ts` (extend) | the ten new effects; M3 sources (side effects, measures, modifiers, dispatch standing effects, the History, `suspend`); `forbid` matching; `costMulOf` |
| `orders.ts` (extend) | `orderLog`, `marketWhy`, the Market skipping forbidden candidates and the 'market' suspend, `OrdersView.dispatch` and `kind` |
| `serialise.ts` (extend) | v3 → v4 exactly as `SAVE_VERSION` says; validation of the new fields |

Keep the README's layering (no cycles) and update its module table.

## Work, in this order

1. **Effects and sources** (`effects.ts`): the new effect types; `Mods` gains resourcePriceMul, intensityMul,
   incomeMul (per sector and global), costMulOf (per id), forbid (a matcher), travel speed/roads, priceSeen. M3
   sources: measures (× value), side effects (× bite × level), modifiers (once each, while unexpired), dispatch standing
   effects (once per `dispatch.standing` entry), the History (like a Charter), and `suspend` (no Know-how, no seated
   Institutions, no Charter). Side effects and modifiers change often: keep the base `Mods` cached as now and layer the
   run-varying sources in a cheap overlay keyed on their values, so a step without side effects or modifiers costs
   nothing new. New one-offs (`populationMul`, `pressureAdd`, `metaFlag`) in `fireOneOffs` and every place one-offs
   fire (purchases, know-how, decades, first Steady State, dividends, Commons, settlement, dispatch arms).
2. **The four mechanic kinds** (solver and the four modules). Exactly the formulas in the contract. Hot path: no new
   allocations per solve beyond what the kind needs; precompute shapes per content object (cached). The shadow runs the
   same code. Without the fields, the solver must take exactly the M2 path (prove it: every M2 test unchanged, and a
   byte-identical 1-hour `budget` run on real content before content adds fields).
3. **Seams action and views**; `lockInDecay` in the step; `SettledState.load`, `travel`, `appPriceSeen` at settle and
   the frozen views while settled.
4. **Measures and side effects**; `forbid` in buyUpgrade, foundApp, setLever (raises), buyCommons, sinkSeam, the Market
   and the Civil Service; `costMulOf` in every cost; `UpgradeDef.when`; locked Commons and Charters with
   `meta.unlocks`.
5. **Modifiers, dispatches, the dispatch order** — scheduler exactly as `GameState.dispatch` says, including no draws
   inside fastForward/useBank, defaults paying what there is, the order of events in a step.
6. **Ambient news.**
7. **Histories.**
8. **Returns and the Proprietor's Day**, publication rules, `withdrawReturn`, `SurveyView`.
9. **Archive, milestones, the ending, the retrospective.**
10. **Market idle reasons, first-ever and label event fields, RunSummary and RunStats additions, new StatKeys and Cond
    leaves (`returned`, `answered`, `owns` extensions, the meta-flag reading of `{ flag }`), new headline keys and
    `{cast}`.**
11. **Bank** (default off; tests with a fixture that turns it on).
12. **Persistence:** v3 → v4 steps 1–7 in order; v1 and v2 chain; a v5 save → null.

## Fixture (`src/core/fixture.ts`)

Extend it so every M3 rule is testable without real content: a stock sector with three seams (one with `reachBelow`,
one with `requires`); a sector with `load` (two profiles, a night app and an evening app, fixedShare 0.6); a sector with
`travel` (roads small enough to congest, two travel apps with lockIn and lockInDecay); an app with `priceSeen` share 0
and one with a flat price; a 'measure' lever with `effects` and `sideEffects` with `unless`; a cast of three (one held
back by `when`); eight dispatches (two-armed and three-armed, one `once`, one with `next`, one sector, one age, one with
a modifier, one with a cost); five ambient templates; three Histories (one with `suspend`, one with `forbidUntil`, one
rewarding a locked Commons project and a locked Charter); four Archive notes of different subject kinds; a
`proprietor` text with a template per direction; an `ending` text; and `offline.bankRate` 0.5, `bankMax` 7200 in a
second fixture variant. Steam stays exactly the `DESIGN.md` reference economy.

## Required tests (`bun test`; new files `m3.*.test.ts`)

1. **No fields, no change.** On the M2 fixture and on real content as it stands, flows and a 1-hour trajectory are
   identical before and after your change (deep-equal on R, D, p_s per step for 3600 s).
2. **Seams.** priceMul of the deepest seam multiplies p_r; sinking adds tons to reserve and reserveMax, charges the cost
   with costMul and costMulOf; refused when unreachable (p_s > reachBelow), when `requires` fails, when forbidden, when
   unaffordable, when the feature is off, in a settled or flow sector; a decision; the event carries label and n.
3. **Load.** LF = mean/peak computed from shapes; c_eff formula; a flat profile set gives LF 1 and c_eff = c; adding a
   night application raises LF and lowers p_s; the shadow uses its own mix; `capCost` in SectorDerived is c_eff; the
   bisection result matches a brute-force price scan to 1e−6 relative.
4. **Travel.** v(D) and the fixed point (residual < 1e−9 relative); doubling `roads` raises D and returns v toward its
   former level (induced demand); raising speed raises D roughly in proportion at saturation while hoursPerHead moves
   less than 10%; lockInDecay makes peakD fall at the stated rate; very large roads reproduce M2 flows to 1e−9.
5. **priceSeen.** share 0 makes the app's demand independent of p_s; flat price respected; the lowest-share effect wins;
   income and R use p_s; a cap with only share-0 demand stops at the squeeze limit without looping; `free.bill`.
6. **Measures and side effects.** effects × value; bite ramps with the stated time constant and decays when `unless`
   holds or the lever is lowered; times = bite × level; 'biteBack' once per run at 0.5; settled sectors' bites decay.
7. **New effects.** each of the ten, standing and one-off, including a negative capitalAdd flooring capital at 0 and
   `pressureAdd` firing a crisis on the next step.
8. **Dispatches.** first draw at firstYears; gap with jitter pinned for three seeds; least-seen first across runs (no
   repeats until the pool is exhausted); `once`; queue priority for `next`; sector and age pools; cast `when`; expiry to
   the default arm by 'default' with costs paid as far as possible; maxPending; no draw inside fastForward (an 8-hour
   catch-up from a state with one pending dispatch defaults it and draws none; OfflineReport.dispatchesDefaulted 1);
   tick and fastForward over the same 10 minutes with no draw due resolve the same defaults; answer counts one decision,
   updates meta.dispatches.arms and playerArms; the standing order answers at once by 'dispatch' and counts automated;
   a Reckoning clears pending, queue and modifiers unpaid.
9. **Modifiers.** applied until `until`, removed with 'modifierEnded'; same source refreshes, different sources stack;
   MODIFIERS_MAX trim.
10. **Ambient.** at most one per tick; least recently used; cooldown; stat placeholders formatted as specified; none
    away, none in projections, none while the feature is off.
11. **Histories.** only while fresh and offered; runs counter (switching back and forth counts one); composes with the
    Charter; each `suspend`; `forbidUntil` lifts the forbids; goal clears once, best time, rewards into meta.unlocks,
    locked Commons and Charter appear afterwards (the Charter only in later offers); reward lint rules hold in the
    fixture.
12. **Returns.** every validation rule refuses (missing key, negative, NaN, above max, sessions > looks, a second
    filing in the run with different figures) and an identical refiling returns the same reference; floors to
    integers; extra keys dropped; publication on metaFlag, at reckon, at most one per run; direction from
    workdayChange with the 5% band; a 'down' return picks a 'down' template; `withdrawReturn` deletes the figures and
    prints the line; Derived.survey rates with zero denominators are null.
13. **Archive, milestones, ending.** each subject rule; notes recorded with the feature off; milestones written once;
    the first win writes meta.endings.steadyAll, emits 'ending' after 'won' once ever, and the run continues;
    `retrospective` orders by time and matches 'steady:*' templates.
14. **Orders.** marketWhy for each static reason and each logged outcome; the Market never buys a forbidden card; a
    History suspending 'market' makes it unavailable.
15. **Events.** `first` on backfire, steadyState, sectorOpened; `label` on stageReached (machine or name); the order
    of M3 events within a step.
16. **Bank.** banked = bankRate × forfeited, capped; nothing banked when 'pending' or rate 0; useBank simulates
    min(seconds, bank) with the away rules and no cap, subtracts what it simulated, emits 'bankUsed'.
17. **Migration.** a hand-written v3 save (mid-run, a won flag, past runs, levers, a settled sector) loads with every
    step 1–7 (milestones backfilled, ending record for the won flag, nextAt not immediate, archive notes for owned
    things, no events replayed); v1 and v2 chain; v5 → null; a v4 round trip is lossless.
18. **Purity, determinism, speed.** No NaN after 3 h of `budget`, `market` and `efficiency` play with every kind in
    use; identical action sequences give deep-equal states; µs per tick on real content without M3 fields within 3% of
    M2; with the fixture's load and travel sectors open, a step costs at most 2× the M2 step (report both); an 8-hour
    `fastForward` with five Industries and the Market on under 3 s in Bun.

## Balancer (`tools/balance.ts`)

Bring every strategy to M3 and add what the exit criteria need, each behaviour behind a flag:

- **Seams:** restraint and efficiency strategies sink the next seam when reachable and affordable after keeping 60 s
  of income (`--seams=on|off`, default on).
- **Dispatches:** `--dispatch=default|first|random|best` (answer policy: let it expire, always arm 0, a seeded random
  arm, or the arm whose one-offs pay most). Default `random` with a fixed seed. `--dispatch-audit` plays each arm of
  each dispatch against the rest at `random` and prints Hindsight per minute per arm (target ±10%).
- **Ignore a mechanic** (`--ignore=seams|load|travel|free`): the strategy is blind to it (never sinks; never founds
  night or travel uses that the mechanic favours; for free, avoids the priceSeen card) — for "each mechanic matters"
  (≥ 25% worse).
- **`crisisFarm`** (new): drives pressure to just past each crisis for its Mandate, then restrains; compare Mandate
  and Hindsight per minute with `budget` after run 2.
- **Histories** (`--history=<id>`): plays `budget` with that History chosen whenever offered (and offers it by
  construction: start from a fixture meta with the feature on); prints time to the goal and whether cleared.
- **Unlock log** (`--unlocks`): per run and cumulatively, the active-time stamp of every first: feature unlocked (M2.1
  event), Industry opened, new application, new mechanic widget, first dispatch, first History, the reveal, the
  Proprietor's Day, the ending; the longest gap between consecutive firsts to hour 20, and the smallest gap between two
  feature unlocks to hour 10.
- **Returns** (`--file-return=<json>`): files a fixed household return at a given hour (for the Proprietor's Day in
  headless runs).
- `--total-hours=N` for the 15–20 h runs; new summary columns: seams, load factor, speed, sprawl, dispatches answered
  and defaulted, History, ending reached (hour).

## Checks

```
bunx tsc -p .            # src/core clean
bun test src/core
bun run tools/balance.ts budget 3 --fixture --summary --unlocks
bun run tools/balance.ts efficiency 2 --fixture --summary --dispatch=default
bun run tools/balance.ts mixed 2 --fixture --summary --history=<id>
bun run tools/balance.ts crisisFarm 4 --fixture --summary
bun run tools/balance.ts budget 2 --summary          # real content, before and after the content lanes land
```

## Exit criteria (yours)

- Every ModelApi method and view exactly as typed; every test above passing; `src/core` typechecks.
- Real content without M3 fields plays byte-identically to M2.
- The balancer runs every strategy and flag above on the fixture without errors.
- Speed targets in test 18 met.

## Final report (concise)

- Modules implemented and the README's new module table; every gap in or deviation from `types.ts`, with your
  workaround; constants you chose; test count and M2 tests you changed (and why); µs per tick before and after, with and
  without load/travel sectors; what the balance lane must know (knobs that matter, traps).
