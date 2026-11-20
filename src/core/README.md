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
| 0 | `contentIndex.ts` | `idx(content)`: lookups by id (M2: dividends, Commons, Charters, staged upgrades), solve order, fork graph, names. Cached per Content object. M4: acts and previews, resourceStock owners and drawers, feed edges in the solve order ('*' expanded; an edge that would close a cycle refused), renewables, `anyM4`. |
| 0 | `calendar.ts` | The calendar year, the current Age, `yearAt` (M2); QA fix: clocks that open ahead catch up over `CALENDAR_CATCHUP_SECONDS` (no jump), and the slowing past an Age levels off within `CALENDAR_LATE_SPAN` years. |
| 0 | `events.ts` | M2: `emit` / `pushEvents` (seq from `meta.eventSeq`, the `EVENTS_MAX` trim), the headline → event mapping. |
| 0 | `features.ts` | The unfolding: `featureOn` (a feature absent from content is on), `featuresView` (Derived.features), grandfathering for saves from before it. |
| 0 | `leverLevels.ts` | M3: lever level resolution and each kind's range (split from levers.ts so effects.ts can read a measure's value). M5: re-exports `effectiveLevel`. |
| 0 | `chair/chairIndex.ts` | M5 (Core A): the Chair's lookups per Content: chair sectors (ActDef.chair), loophole rungs and ladders, pledges, Articles, playbooks, the rival's rows. |
| 0 | `chair/acting.ts` | M5 (Core A): how a lever acts in a Ministry: `effectiveLevel` (carve-outs, litigation), `effKey`, used rungs and `leverEscape`, `concealOf`. Read by effects.ts and levers.ts; the M4 value at one null check outside a Ministry. |
| 0 | `dispatchClock.ts` | M3: GlobalParams.dispatch with defaults, `dispatchFirstAt`, `dispatchGap`. |
| 0 | `milestones.ts` | M3: `milestone` (first time ever of each thing, written once, MILESTONES_MAX). |
| 0 | `record.ts` | M2: decisions and automated actions per model decade, `run.opening`, the `asDecision` wrapper. |
| 1 | `renewable.ts` | M4: the renewable stock: G(Q), the reported stock and its price, the foreign share and catch, the stock's step (RK4 substeps), the scar, a depletion sector's sink line, the start stock. |
| 1 | `steady.ts` | Budget lines; M2: paces, the line's own day (`decadeWellbeing`), `clearP`, clear skies, `sinkR`, decade choices, `newBudget`. M3 finish: `holdEach` / `holdTotal` (GlobalParams.settleHold). |
| 1 | `hindsight.ts` | The Hindsight terms a Reckoning would pay (M2: lean decades, settled sectors, less what was withheld for time away). |
| 1 | `headlines.ts` | Headline choice, case-aware placeholders (M2: `{name}`), the news list. |
| 2 | `effects.ts` | Standing effects folded into `Mods` (cached per state; M2 sources: Charter, dividends, Commons, settle dividends, institution loans; M2 effects), η and flow capacity, one-off effects. M3: the ten new effects; the History (and `suspend`) in the cached base; a run-varying overlay (measures × value, side effects × bite × level, timed modifiers, dispatch standing effects) that costs nothing when absent; `isForbidden`, `costMulOfId`, `applyM3OneOffs`, `refreshEta`. M5 (Core A): the thirteen M5 effects; Articles and playbooks in the base; pledges in force, used rungs' effects (× effective level) and the Know-how transfer in the overlay; measures and side effects at the effective level, a measure × (1 − escape); 'confidenceAdd'. |
| 3 | `levers.ts` | Lever levels, visibility (M2: settled sectors, loans), recycle, upkeep, the per-sector aggregate, the levy's Mandate share. M5: the aggregate reads the effective level; a used rung's escape (duty and charge × (1 − e), cap and quota ÷ (1 − e)) and concealment (cap and quota ÷ (1 − c)). |
| 3 | `population.ts` | Population growth and the demographic transition. |
| 3 | `commons.ts` | M2: the Commons arithmetic (open, wellbeing, intensity, parameters). |
| 4 | `feeds.ts` | M4: a feed's factor on c, the combined factor into a target, how a source's R is handed on to its targets (the full account's feed part). |
| 4 | `solver.ts` | One sector's price/demand fixed point (unchanged in M2: the 'commons' levy share is taken in flows.ts). Hot path. M3: the four kinds in the contract's order (priceSeen per app, travel's inner fixed point in D, load's c_eff from the mix at each price with the bisection path, seams' and resourcePriceMul's p_r); incomeMul, intensityMul; share-0 apps as squeeze-limit floors. Without the fields the M2 path runs unchanged. |
| 5 | `load.ts` | M3: SectorDerived.load (live or frozen). |
| 5 | `travel.ts` | M3: hours per head, sprawl, SectorDerived.travel, lockInDecay. |
| 5 | `account.ts` | M4 (The Survey): the full account (fullR, embodied; one deterministic pass per flows, Σ conserved), `accountOn` ('estimates' defined and unlocked), `lineR`, `drawLine` (a line on the account of the moment). |
| 5 | `inherit.ts` | M4: the ONE carry-over step (capstoned sectors built from meta.world.capstone; the scarred start through freshSector); M7 extends only this. M5: `freshChair` (a Ministry's chair state, built every run while office is taken), `sealedInOffice` (ActDef.closedInOffice). |
| 5 | `flows.ts` | Every open sector solved in order, cached per state; M2: settled sectors' frozen flows, excess and defence, Commons intensity and wellbeing, `steadyView` (the decade and Steady conditions), `primeFocusedFlows` for projections; the pending Reckoning; the shadow and instruments. M4: feeds into c, a drawer's owner's price, a renewable's reported price and `ren` (G, foreign share and catch; a depletion sector's net rate in pressureIn), the quota (two solves), a capstone scaled per head and in arrears, a 'full' line's cap, `flowsWithoutFeeds`, `depletionSink`. |
| 6 | `conditions.ts` | `Cond`: stat values (M2 stats and `owns` kinds), evaluation, checklist labels. |
| 6 | `state.ts` | Fresh meta (M2: default orders), run stats and sectors, baselines, history samples (M2: the sink line), `createState`, `isFreshRun`, `withMeta` (the between-runs rebuild). |
| 6 | `purchases.ts` | Upgrades and foundings by any actor (M2: opening, events, `stageOf`), the click. |
| 6 | `policy.ts` | `setLever` / `setLeverAs`, `setLeverRecycle`, `drawBudget` (M2: paces), lever views (M2: `recycleChoices`). |
| 6 | `dividends.ts` | M2: decade offers, the overflow rule, `chooseDecadeDividend`. |
| 6 | `sideEffects.ts` | M3: the bite ramp, 'biteBack' once per lever per run. |
| 6 | `seams.ts` | M3: seam cost and reachability, `sinkSeam`, SectorDerived.seams. |
| 6 | `modifiers.ts` | M3: timed modifiers (stacking, expiry, views). |
| 6 | `archive.ts` | M3: subject rules, `unlockNotes`, `archiveViews`. |
| 6 | `ending.ts` | M3: the ending record, `retrospective`; M3 finish: `endingYearsOf`, `settledCount` (the streak itself is counted in `step.ts`: every Industry settled). |
| 6 | `chair/inspect.ts` | M5 (Core A): Inspectors and their rest, the quiet period and coverage, the concealment ramp (`concealTick`), `inspect` and Standing inspection, `reportedR`, `levyScale`, `capTargetScale`, `certifyDecade`, the sector fields of the views. |
| 6 | `chair/loopholes.ts` | M5 (Core A): rung states (`loopholeStep` every step: first rung opens, drafting completes, held in Opposition; `robustReopen` at ticks), evade's rung (`evadeRung`, `useRung`: the exempt app), `amend`, `loopholeViews`. |
| 6 | `temptation.ts` | M3 finish: the temptation's trade at the point of decision (`appWanted`, `seamWanted`, `cardWanted`: the views' `wantedChange`), one sector solve per candidate, cached per bucket. |
| 6 | `returns.ts` | M3: `fileReturn` validation, publication, `withdrawReturn`, SurveyView. |
| 6 | `ambient.ts` | M3: ambient ticks, the pick, stat formatting. |
| 6 | `bank.ts` | M3: Derived.bank (banking and useBank live in offline.ts with the shared catch-up loop). |
| 6 | `acts.ts` | M4: the current act, the ending act (Derived.ending), the act's streak, the capstone records at an act's ending. |
| 6 | `orderBook.ts` | M4: the order book's views (SectorDerived.feeds with rAdded per bucket, AppDerived.feeds). |
| 6 | `views4.ts` | M4: secondsLeft and yearsLeft on a shared reserve, drawnBy, the stock gauges, Derived.surveyReveal. |
| 6 | `settlement.ts` | M2: `settle`, `unsettle`, `canSettle`, the forced unsettle; M3 finish: `settleRoom` (GlobalParams.settleMax + settleSlotAdd). M4: `settle.requires` and `settleBlockedOf`, `roomCount` (capstones use no room), unsettle refuses a capstone. |
| 7 | `commonsActions.ts` | M2: `buyCommons` (fund first), `commonsViews`. |
| 7 | `unfold.ts` | The unfolding's unlock check (`dueFeature`, every 5 s of run time in the step, never away; and in reckon()), one feature at a time, spaced by `featureGapSeconds`. |
| 7 | `unlocks.ts` | Which sectors may open next, whether one opens, their checklists. |
| 7 | `candidates.ts` | M5 (Core A): the candidate rule shared by the Market and the rival (`bestCandidate`, `marketGain`, flows with a card raised or a use founded), split out of orders.ts with no change to the Market. |
| 7 | `chair/rival.ts` | M5 (Core A): the rival: profile from the opening, policy, income and opening purse, `rivalStep` (the one step call: income, rungs, THE YEARLY DECISION at order ticks: housekeeping, purchase, answers, concealment; Standing inspection), `priceResponses`, the answer line (`rivalAnswerView`, cached per lever per bucket), `leverChairFields`, `rivalView`. |
| 8 | `orders.ts` | M2: order ticks, the Market, the Civil Service, Treasury rules, `setOrders`, `OrdersView`. |
| 8 | `dispatch.ts` | M3: the scheduler (expiry, draw), answers, default resolution, the standing dispatch order, DispatchesView. |
| 8 | `history.ts` | M3: `chooseHistory`, forbidUntil and the goal in the step, rewards, `historyViews`. |
| 8 | `charters.ts` | M2: `mix32`, the offer draw, `chooseCharter`. |
| 9 | `prestige.ts` | The Reckoning (M2: run history, openings, the offer, the 'reckoning' event), Know-how (M2: `knowhowPeak`, the respec), Institutions, the loadout; their views. |
| 9 | `serialise.ts` | `serialize`, `deserialize`, the v1 → v2 and v2 → v3 migrations, element-by-element validation. |
| 9 | `world.ts` | M4: the step's M4 rules, each one line in step.ts: an owner drained by its drawers and drawers mirrored, the renewable stock's step (crossing, scar, healing, foreign fleets' headline), a depletion sector's derived P, the capstone in and after arrears, arrears entered and cleared, the act's ending meta; after the M3 rules the surveys (the Board's first survey and its reveal, 'surveyed', lastSurvey), the order book's peaks, the M4 events in order. |
| 10 | `step.ts` | `step`, `tick`. Hot path; applies every per-step rule; one call per M2 mechanic (dividends, forced unsettles, events, `runOrders` last). M3: lockInDecay and bites in the body; `stepM3` (modifier expiry, dispatches, 'biteBack', the History, the Archive, ambient news, the Proprietor's Day) before the orders, in the contract's event order. |
| 11 | `offline.ts` | M2: `fastForward` with holds, the cap and the `OfflineReport`; the offline fix: Hindsight at `offline.hindsightRate` (`run.hindsightWithheld`) and steps run `away` (no dividend overflow); QA fix: budget lines do not decline while away (`since` moved on per step). |
| 12 | `derive.ts` | `derive()`: the view the UI reads every frame (M2: every new field). |
| 12 | `projections.ts` | The cards' "this decade" and "brings within reach" projections (focused clones, structural cache with a 20 s bucket, optional per-sector laziness), and upgrade views. |
| 3 | `hiddenFlow.ts` | M5 (Core B): a hiddenFlow sector's return share r (returnShare × Mods.returnShareMul, floored, clamped). |
| 6 | `chair/elections.ts` | M5 (Core B): Confidence (C*, the yearly update, crisis one-offs), the pledge offer (mix32), polling day, Opposition and its repeal, 'defeated', binds, popularity, `choosePledges`, `campaign`, `stepChair` (step.ts's one line). |
| 6 | `chair/treasury.ts` | M5 (Core B): the Treasury's income (tax, levy share, pledges' treasuryShare), `capitalPerSec` (step.ts), `compensate`, the subsidy's share and split (called by the rival's purchase). |
| 9 | `chair/office.ts` | M5 (Core B): `takeOffice` (the first Treaty reset, `resetForOffice`), the prospectus and the file, `treaty`, `buyArticle`, Derived.office and Derived.treaty. |
| 9 | `serialise5.ts` | M5 (Core B): save v6: the v5 → v6 step, validation of every M5 field, the invitation on migration. |
| 12 | `chair/views.ts` | M5 (Core B): Derived.chair (ChairView, with Core A's rival, inspector and loophole views), SectorDerived's M5 fields, AppDerived.regime. |
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
`m2.projections.test.ts`, the unfolding's `unfold.test.ts`, and the M3 tests `m3.nochange.test.ts` (a golden hour from
the M2 core, via `m3.golden.ts`), `m3.mechanics.test.ts`, `m3.dispatch.test.ts`, `m3.meta.test.ts`, `m3.save.test.ts`,
`m3.perf.test.ts` (against `fixtureM3`, `fixtureM3Bank` and `fixtureM3Gated` in `fixture.ts`), and the M4 tests
`m4.nochange.test.ts` (golden hours from the M3 core, via `m4.golden.ts`), `m4.reserve.test.ts`, `m4.renewable.test.ts`,
`m4.acts.test.ts`, `m4.survey.test.ts`, `m4.misc.test.ts`, `m4.perf.test.ts` (against `fixtureM4` and `fixtureM4Acts`;
helpers in `m4.testkit.ts`), the M5 Core A tests `m5.nochange.test.ts` (golden hours from the M4 core), `m5.rival.test.ts`,
`m5.inspect.test.ts`, `m5.loopholes.test.ts` (against `fixtureM5`; helpers in `m5.testkit.ts`), all against `fixture.ts` (test-only content; never imported by the game) except the
projection tolerance test, which also runs the real content. The real-content pacing targets are in `src/balance.test.ts`.
