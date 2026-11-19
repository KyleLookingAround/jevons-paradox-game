# M2 contract notes

The M2 contract is `src/types.ts` at save version 3, in its own commit. These notes give the decisions the documents
did not dictate, with reasons; what was left out of M2 and why; and what no longer compiles. The lane briefs are
`briefs/m2-core.md`, `m2-content.md`, `m2-ui.md`, `m2-scene.md` and `m2-balance.md`.

The roadmap's M2 contract table was the draft. Every row is in, mostly as drafted; where it was vague or wrong for how
the core works, the change is below.

## 1. The decisions the brief asked for

### (a) Do decades in run 1 eat backfire's Hindsight lead? Lean decades pay no Hindsight

A decade judged against the drawn wellbeing (below the target) is **lean**; one whose every step had W ≥ target is
**full**. Both pay their dividend and offer a choice. Only full decades pay `perBudgetDecade`; lean ones pay
`perLeanDecade`, default 0.

- Why: the restraint player in runs 1–2 sits at wellbeing 21–25 against a target of 34, so every run-1 decade is lean.
  Paying Hindsight for them would push restraint's run-1 earnings up, and backfire's lead (1.10× measured, 1.2×
  wanted) down. The loop still pays inside run 1 where the player can feel it (Mandate, capital, a choice), and
  Hindsight still rewards the real thing (a decade at full wellbeing) from run 3, as owner decision D1 wants.
- How it is tracked: `SectorState.windowLean` (set on any decoupling step with W < target, before the crossing test,
  reset at each decade and each streak reset), `decadesLean[]` parallel to `decadesWithin[]` (so the ledger can mark
  them), `run.leanDecades`, the stat keys `leanDecades` and `fullDecades`, and the event's `id: 'lean' | 'full'`.
- `run.budgetDecades` keeps its meaning (all decades), so nothing in the UI or the M1 tests changes meaning.
- Balance has a knob (`perLeanDecade`) if run-1 restraint turns out too poor.

### (b) `peakdraw` against "wellbeing on the day drawn"

Three things close it, without a new rule for "R fell for the wrong reason":

1. Lean decades pay no Hindsight, so a line drawn at a low-wellbeing moment (at a peak, or just after a crisis) earns
   only in-run dividends.
2. A line drawn at peak R is usually drawn at peak pressure, which would make "half of p0" an easy clear level. The
   clear level is clamped: `clearP = clamp(clearBelow × p0, clearFloor × collapseAt, clearCeiling × collapseAt)`, with
   `clearCeiling` 0.25 by default, below the first crisis at 0.4. M1's `budget` runs held Steady State at 5–21% of
   collapse, so the ceiling rarely binds for honest play.
3. The drawn threshold is `min(target, w0 × 0.95)`, never above the target, and Steady State always needs the full
   target and clear skies.

Balance checks the roadmap's ≤ 0.5× and tunes `clearCeiling` per Industry first.

### (c) `sinkR` where an Industry has no absorption (Code)

`sinkR = (clearP × absorption + deletionOut) × R / pressureIn`: the R whose equilibrium pressure is `clearP` at
today's η and shares (pressure inflow is linear in R at fixed η whether its source is resource or service, so one
formula covers both). Where absorption ≤ 0 it is **null**. Clear skies stay well defined there (P ≤ clearP and the net
rate ≤ 0), and Code reaches them only by deleting: deletion's out-flow must at least match the in-flow and the stock
must be deleted down to `clearP`. The UI marks `clearP` on Code's pressure gauge instead of a sink line. "Not rising"
has a tolerance (`CLEAR_RATE_TOLERANCE`, 1e−6 × collapseAt per second) so solver noise cannot flicker it.

### (d) Settlement: spill, levers, forks, crises, and the price of unsettling

- **What freezes.** Settling snapshots the sector's flows into a self-contained `SettledState`, and the core stops
  solving it. Settled Industries are constants, as `long-game.md`'s performance budget wants. Pressure and the reserve
  are frozen too. That is a deliberate simplification: a settled Industry is drawn at a rate its sink absorbs, and it
  can never crisis, collapse or exhaust ("cannot collapse the run", P5). resourceUsed still grows, so Hindsight's
  intensity sees the burn.
- **Spill and the rest of the world.** A settled sector is not immune. Its inputs are still computed each step as if it
  were solved (spill from earlier Industries, `drawsOn`, Commons intensity), and population moves on. The excess is
  `max(0, N·spillMul / (N0·spillMul0) − 1) + max(0, extraD − extraD0) / D`. Population is included on purpose: the
  economy-wide rebound lands on settled Industries too. Defence costs `upkeepPerSpill × (excess − freeExcess)` Mandate
  per second, and green spending in the source Industry lowers it, as P5 intended.
- **When Mandate runs out,** levers lapse first, as in M1, because a lapse is cheap to undo. Only when no lever upkeep
  is left does the settlement with the largest defence unsettle. The order is deterministic (ties go by sectorOrder).
- **Levers.** Settling sets the sector's levers to 0 and hides them: the settlement is the institution now. That frees
  their upkeep, which is the incentive to settle. Their recycle choice is kept for later.
- **Forks and cards.** Owned forks stay owned; the sector's cards and foundings are not available while settled.
- **A later crisis** can't happen in a settled sector, since its pressure is frozen below `clearP`. Crises elsewhere
  cut population, which lowers the excess.
- **Unsettling** is free in Mandate. What it costs is what is lost: the settle dividend, the levers (all at 0, to be
  bought again), both streaks (Steady State must be earned again before re-settling; the line stays held), and the
  demand the world grew into while frozen, which arrives at once. η is recomputed for the time open, so Compute
  resumes with the gains of the settled years. Settle one-offs fire once per run per sector, so settling and
  unsettling farms nothing.
- **Forward.** `SettledState` needs nothing from the run that produced it, so M4's capstone (the Coal Age opens
  settled) can build one at `createState`.

### (e) Standing orders: deterministic, identical in `step` and `fastForward`, free when off

- **When.** At order ticks: a step from t0 to t1 is a tick when `floor(t1 × YPS / intervalYears) > floor(t0 × YPS /
  intervalYears)`, with `intervalYears = 1` (every 20 s of run time). Both tick's 1 s steps and fastForward's 5 s steps
  cross the same boundaries once each, so the same rules run in both. Results differ only as much as the step length
  already makes them differ.
- **Where.** One call at the very end of `step`, acting on the state the step produced: Market, then Civil Service, then
  Treasury rules. Never in projections (the step's `lite` flag), never while a Reckoning is pending. When the step is
  not a tick, or nothing is active, it costs one comparison (target ≤ 3% µs per tick).
- **What the Market buys.** At most one action per open, unsettled, switched-on sector per tick, in sectorOrder. The
  action is the affordable candidate with the shortest payback = cost ÷ gain, each gain measured on a solve of the
  state with that one action applied (`marketGain` in `src/core/orders.ts`). The gain is the running cost the card
  saves at today's output (Σ over solved Industries of today's demand × the fall in the pre-tax price: coal no longer
  bought, cheaper engines) plus any rise in whole-state income; neither part ever counts a loss. The first part is how
  an engine was sold ("a third of the coal it saves"), the second how an application is. The original rule (payback =
  cost ÷ the rise in income alone) saw no gain in a card that only cut running costs, so the Market never bought
  efficiency. Candidates are available foundings, plus efficiency and capital cards with no `excludes`: forks,
  research (the reveal) and prospects stay the player's (P11: never automate forks). It acts only if the payback is
  within `paybackMax` (120 s by default; the UI offers 30 s, 2 min, 10 min). Ties: foundings before cards, then content
  order.
- **One per sector per tick, not a global queue.** One action per sector per 20 s is the cadence of a busy player and
  scales with the number of Industries. A global best-payback queue would starve later Industries and cost more
  solves.
- **Telling its purchases apart.** `Actor = 'market'` in `run.opening`, on events (`upgradeBought`, `appFounded`), and
  in `run.automated`, never in `run.decisions`. M3's shift-3 target (decisions per model decade with the Market on
  against off) is measurable from day one.
- **Orders live in `MetaState`**, not `GameState` as the roadmap sketched. They are the player's standing settings
  ("the Market off for Light"), and making the player redo them every run would be a chore, not a decision. A new
  Industry starts with the Market on: a missing key means on.
- **The Civil Service and Treasury rules are in M2** (`long-game.md` puts them at hours 5 and 10, inside M2's 8–10 h),
  with deliberately simple rules. The Civil Service raises the cheapest listed lever when over the line, and lowers the
  costliest only when wellbeing is below the decade threshold and R is 10% under the line (hysteresis against
  oscillation). Treasury buys the first affordable project in a priority list above a reserve of `keepSeconds` of
  income. Both are unlocked by a new standing effect, `orderUnlock`.

### (f) Charters "two, from the seed"

The offer is drawn once, by `reckon()`, on the new run, and stored in `GameState.charterOffer`. Every between-runs
rebuild keeps it, so buying Know-how never reshuffles the offer. The draw:

- E = the eligible Charters in content order, minus the previous run's Charter if that still leaves two.
- `i = mix32(seed) mod n` and `j = (i + 1 + mix32(seed ^ 0x9E3779B9) mod (n − 1)) mod n`, so the two are always
  distinct.
- `mix32` is written out in the contract, so any lane can reproduce the offer.

Why store it rather than derive it:

- `requires` is a Cond, and Conds read state. Buying an Institution between runs could otherwise change which Charters
  are eligible.
- A stored list is also trivial for the UI.

Run 1 has no offer.

### (g) What `holdBefore` holds, and how a held game resumes

The options are `'crisis'`, `'collapse'` and `null`:

- `'crisis'` holds before any crisis, collapse or exhaustion;
- `'collapse'` holds before collapse or exhaustion;
- `null` holds nothing (M1).

Exhaustion is included because "offline never ends a run" covers both endings. Content will ship `'crisis'`, the
contract default is `'collapse'`, and the cap is 8 h.

**How.** fastForward checks each 5 s step's result. If that step fired a crisis or made a Reckoning pending, it
discards the step and returns the state one step earlier. The rest of the offline time is forfeited (banked time is
M4+). The held event happens in live play, seconds after the return. A second fastForward from a held state holds at
once (simulated 0), so the board waits for the player, as the audit asked.

**The report.** `OfflineReport` says what was held and what moved, and carries the event seq range. It keeps counts as
well as the range because 8 hours can emit more events than the list keeps. Per line it says one of:

- held: the streak was never reset;
- broken;
- drawn during the catch-up;
- settled.

### (h) The respec's cost and refund

The respec is free between runs: `respecRefund` defaults to 1, which refunds the price list of every removed level. It
is optional per tree, and content can set a lower refund. The audit's point is that permanent forks become
guide-slop, so a free respec between runs, when nothing else can be bought anyway, is the genre-friendly answer. The
in-run forks stay irreversible; they are the drama.

The only exploit is one-off effects (a `slotAdd` node bought, respecced and re-bought). `MetaState.knowhowPeak` closes
it: a level's one-offs fire only the first time that level is ever owned. Tier gates gate buying, not owning, so a
respec of tier 1 alone leaves tier-2 levels in place rather than silently refunding them.

### (i) Save version 3 and the v2 → v3 migration

It is written out in full on `SAVE_VERSION`, as seven ordered steps. The deep merge supplies most new fields. The
explicit rules cover the ones a merge cannot get right:

- `decadesLean` is all false (M1 decades were at the full target);
- `pace` is the sector's first pace;
- `w0` and `p0` are the wellbeing and pressure at load (the "day drawn" becomes the day loaded);
- `knowhowPeak` is a copy of the Know-how levels;
- `runs` is `[lastRun]`;
- `charterOffer` is drawn if the save is between runs.

v1 saves chain through v2.

### (j) Time away: ordinary income in full, Hindsight at a reduced rate (the offline fix)

**The problem.** Offline never ended a run, but it paid too well. An 8-hour return to a held restraint run (run 4,
minute 50) earned about +4,300 Hindsight, about six times what that whole run earned played (697). The catch-up ran
about 300 decades and the wellbeing-years at the full rate. Unchosen dividends overflowed to option 0 and compounded,
with wellbeing reaching 104 and the Mandate rate several times higher. A night away was worth more than hours of good
play, and restraint became a timewall to sleep through instead of a string of decisions.

**The rule, in two parts, both only inside `fastForward`:**

1. **Hindsight away accrues at `offline.hindsightRate`** (content: 0.15; the contract default 1 keeps old content
   as it was). Everything else counts in full: capital, Mandate, population, the reserve and pressure, decades and their
   base dividend, the streaks, Steady State, unlocks. Each call adds `(1 − rate) × (H1 − H0)` to
   `run.hindsightWithheld`. H0 and H1 are the unrounded sums of the seven weighted terms at the start and the end of
   the catch-up. `HindsightTerms.withheld` reports the amount, and the total pays the sum less what was withheld.
2. **No dividend overflow while away.** A decade that finds `PENDING_DIVIDENDS_MAX` offers waiting still counts and
   still pays its `decadeEffects`, but offers no choice (`OfflineReport.dividendsForgone`). Choices nobody was there to
   make no longer compound. The returning player finds eight choices to make, not eight made for them. `tick` keeps
   the overflow rule, so a player who leaves the tab open is treated as before.

**Why this shape.**

- **One rule covers every term.** The rate applies to the whole change in Hindsight, not to chosen quantities, so
  Steady State reached away, the unburnt ramp, decades and wellbeing-years are all treated alike. Any later term is
  covered without a new counter.
- **It is exact across sessions.** Hindsight is a function of the state, so the change telescopes. One 8-hour call
  and eight 1-hour calls run the same steps and withhold the same amount (tested).
- **One optional field, no version bump.** `run.hindsightWithheld` is absent unless set, and a Reckoning drops it.
  `deserialize` keeps it only when finite. An older save simply has no time away recorded.
- **Honest.** The report carries `hindsight` (the change in `hindsightIfReckonNow`) and `hindsightRate`. The ledger
  says what was entered and that the books were kept at a reduced rate in the proprietor's absence. It does not say
  what was "lost".

**Rejected.**

- *A cap per absence:* eight 1-hour returns would earn eight caps.
- *A cap per run:* a flat amount that ignores how good the board is.
- *Diminishing wellbeing-years without a decision:* it would change online idling too, and make the online path's
  maths depend on decision history.
- *The rate alone:* it leaves the overflow's compounding in place. That gift persists into active play after the
  return (wellbeing 104 against 78, and a multiplied Mandate rate).

**Measured** (`tools/balance.ts budget 5 --summary --offline-check`; 8 h from every tenth minute; multiples of the
run's own played Hindsight):

| State | Before | After |
|---|---|---|
| Boom (efficiency) | +1 to +35 (≤ 0.42×) | +0 to +7 (≤ 0.08×) |
| Early restraint, run 3 at 30 min | +340 (1.39×) | +42 (0.17×) |
| Held restraint, run 4 at 50 / 80 min | +4,286 / +4,621 (6.1× / 6.6×) | +554 / +613 (0.79× / 0.88×) |
| Run 5 at 40 min | +1,833 (0.94×) | +265 (0.14×) |

Online play is byte-for-byte unchanged. `src/balance.test.ts` E9b asserts the bound: from four restraint states, an
8-hour absence earns no more Hindsight than that run earns played.

Boom play still loses most of a night to the hold. That is accepted until banked time arrives, and it is not made
worse: the holds and simulated hours of boom states are identical before and after.

## 2. Other decisions not dictated by the documents

- **Decade wellbeing.** `decadeWellbeing` defaults to `'drawn'` and `drawnSlack` to 0.05, as drafted. `w0` is
  `Derived.wellbeing` at the moment of drawing, by any route (drawBudget, a lever raise, a standing cap).
- **Two streaks, not one.** `steadyYears` stays the decade streak (lean threshold); `clearYears` is the new Steady
  streak (full target, within budget, clear). Steady State, the held line and `firstSteadyEffects` move to
  `clearYears`. `SectorDerived.decoupling` changes meaning to the decade condition, and `sinkHeld` is the Steady
  condition. The win (`steadyYearsAll`) now needs every open Industry settled or within budget and clear, which is
  M3's first ending ("every Industry at its sink line").
- **The line still declines past the sink line.** `long-game.md` says the budget line declines towards the sink line.
  It is drawn that way, but the line is not floored at `sinkR`. `sinkR` moves with η and shares, and coupling the two
  would make the line jump. The line holds at Steady State, as in M1.
- **Paces.** Paces are content-defined (`PaceDef`, string ids; recommended `gentle`, `firm`, `severe`). The first pace
  is the default for lines the player did not draw by hand. A sector's `declinePerDecade` survives only to shape the
  implicit pace when no paces are given, so M1 content keeps its meaning.
- **`dividendMul`** scales one-off amounts only (`mandateAdd`, `capitalAdd`), both of the decade's own `decadeEffects`
  and of the chosen dividend. Scaling standing effects (an `etaMul`, a `satMul`) would have no clean meaning.
- **Dividend pairs are authored, not drawn.** The n-th decade of a sector offers pair (n − 1) mod length. Content can
  write a sequence (the first pair teaches the choice) and every pair is a designed dilemma, not two random effects.
  Pairs are ids into a flat `Content.dividends`, so the UI finds a definition by id without knowing where it came
  from. `decadeEffects` still pay on every decade (the base dividend); the choice comes on top.
- **Unchosen dividends.** They wait, never block play, and are discarded unpaid at a Reckoning. More than eight
  resolve the oldest as option 0 (content puts the modest option first). An 8-hour offline return could otherwise
  bring 140 offers. Offline fix: inside `fastForward` there is no overflow; further offers are forgone instead (see (j)). `slotAdd` is banned in dividends because seats matter only between runs; the audit's "+1 seat this
  run" cannot work mid-run.
- **The Commons.** A project's wellbeing is `max × (1 − exp(−L × perLevel / max))`: the first level gives about
  `perLevel` and nothing exceeds `max`. It is not per head; the population rebound acts through demography. The roadmap
  names three rebounds for the Commons, and each has a field:
  - intensity: price-proof demand per head per level, through the same `extraD` path as `drawsOn`;
  - time: standing effects per level, typically a `satMul` on a leisure application;
  - economy-wide: demography.

  `'commons'` recycling feeds a fund only Commons projects can spend. That keeps the three recycle options distinct:
  Mandate, wellbeing now, or low-intensity wellbeing later. Commons open at the third run (`fromReckoning: 2`), as P6
  and the long-game table say. Built levels are wiped by a Reckoning (the layers table).
- **Charters as effects.** A Charter applies like a seated Institution for one run, with one-offs ignored. Four new
  effects make the long-game examples expressible without new mechanics:
  - `startFounded` ("mills from the first minute");
  - `institutionLoan` ("a different starting Institution offer": try one you do not own; it counts as seated for lever
    requirements but not as owned);
  - `unlock`, which already exists ("a different fork pair");
  - `reserveAdd`, which already exists ("deep seams"; a different seam ladder waits for M3's seams).
- **Recording.** `run.opening` holds the run's first 40 upgrade purchases and foundings by anyone, each with its
  actor. `meta.opening` keeps the last completed run's and `meta.firstOpening` the first run's (M5's Pryce is seeded
  from it, per D2). `firstBudgetAt` is stored separately because the rival's `drawn` field needs it and a 40-action log
  may end before the first line. Decisions are counted per call that changes the state; the list is explicit in
  `RunStats.decisions`. Between-runs actions are not in-run decisions.
- **Events** live on `GameState` (newest last, at most 50); the sequence counter lives on `MetaState`, so it survives
  every rebuild and Reckoning. The no-replay rule is that the UI sets `lastSeen = meta.eventSeq` on load. That is
  simpler and more robust than storing a "consumed" mark in the save, which the core would have to be told about. The
  event list mirrors the headline list wherever both exist, and adds `upgradeBought`, `stageReached`,
  `dividendChosen` and `charterChosen`.
- **The scene's event API** is fixed in the briefs, not in `types.ts`: `sceneViewFrom(…, events?)`, so the UI and scene
  lanes need not talk.
- **Run history.** `meta.runs` holds the last 20 summaries (the audit's rec. 20, pulled forward from M4+ because the UI
  asked). Peak adoption, peak pressure and stage are recorded per Industry for M3's before-and-after pictures.
- **Stage.** `UpgradeDef.stage` is a visual key (1–3 today; the scene clamps). `SectorDerived.stage` is the largest
  owned stage, or null when the Industry has none authored, so the scene can keep its share-owned heuristic for
  content without stages.
- **Population reference.** `populationRef = max(1, peak this run, peak ever)`. The demographic transition sets a
  growth rate, not a level, so it has no ceiling to scale by. The all-time peak makes run 2's town start visibly
  smaller than run 1's.
- **Unit plurals.** `unit` stays the plural (as authored) and `unitSingular` is optional, defaulting to `unit`, so
  "hp" needs nothing.
- **Recycle wording** lives in `Content.recycleText` with per-lever overrides. `LeverView.recycleChoices` carries the
  resolved text and availability, so the UI does no fallback logic.
- **`offlineCapSeconds`** is deprecated rather than removed, so existing content compiles. `offline` wins when both
  exist.
- **Hindsight gains two terms with zero defaults,** `perLeanDecade` and `perSettledSector`, so M1 content keeps its
  totals.
- **Forward compatibility.**
  - `Actor`, `EventKind`, `OrderId` and the effect union are open for M3 (dispatch defaults become an order, the
    dispatch actor), M5 (the rival as an actor; `opening` as its seed) and M7 (agents).
  - Commons and settlement are per-sector state, so M5 can hold one per region.
  - `SettledState` serves M4's capstone.
  - Nothing in M2 assumes five Industries.

## 3. Left out of M2, and why

- **Seams, load, travel time and the other per-Industry mechanics; lever side-effects; dispatches and the cast;
  Histories; `fileReturn` and the play ledger's model half:** M3, as planned. The UI's local play ledger begins in M2
  but stays out of the core and the save (D6).
- **Banked offline time** (`MetaState.bankedSeconds`): M4+. Held or capped time is forfeited.
- **A Market capital reserve** (spend only above N seconds of income): `paybackMax` is the one knob. Treasury rules
  have `keepSeconds` because they compete with the player's own Commons plans.
- **A pace-weighted Hindsight per decade:** a Severe line earns a larger in-run dividend, not more Hindsight. The
  budget term stays a count, so D1 stays tunable with one weight.
- **Per-head dilution of Commons wellbeing:** left to demography, to keep the panel legible.
- **An in-run seat dividend:** seats only matter between runs.
- **Re-gating Motion, Compute and Code:** M4 (D3).

## 4. What no longer compiles (`bunx tsc -p .`, 46 errors)

This is expected; the lanes fix it. `src/types.ts` itself is clean. `tools/` is outside the tsconfig `include`, so
`tools/balance.ts` is not checked by tsc; it will fail at run time once the core changes.

| File | Errors | Main causes |
|---|---|---|
| `src/ui/devmock.ts` | 18 | mock BudgetState without `w0`/`p0`/`pace`; AppState without `peakAdoption`; mock Derived and SectorDerived without the M2 fields; mock HindsightTerms without `settled` |
| `src/core/state.ts` | 5 | fresh MetaState, RunStats, SectorState and AppState lack the M2 fields; GameState lacks `pendingDividends`, `commons`, `events`, `lastOffline`, `charterOffer` |
| `src/core/model.review.test.ts` | 3 | hand-built BudgetStates and HindsightTerms |
| `src/core/m1.steady.test.ts` | 3 | hand-built BudgetStates |
| `src/core/serialise.ts` | 2 | BudgetState shape (`w0`, `p0`, `pace`) in the migration and validation |
| `src/core/policy.ts` | 2 | BudgetState shape in `drawBudgetAt`; LeverView lacks `recycleChoices` |
| `src/core/derive.ts` | 2 | Derived and SectorDerived lack the M2 fields |
| `src/core/step.ts` | 1 | the standing-cap BudgetState |
| `src/core/hindsight.ts` | 1 | HindsightTerms lacks `settled` |
| `src/core/headlines.ts` | 1 | a record keyed by HeadlineKey lacks the five new keys |
| `src/core/conditions.ts` | 1 | the StatKey label record lacks the new keys |
| `src/core/index.ts` | 1 | `model` lacks the new ModelApi methods |
| `src/core/fixture.ts` | 1 | AppState lacks `peakAdoption` (its headlines will also need the five new keys) |
| `src/core/m1.testkit.ts` | 1 | a hand-built BudgetState |
| `src/core/m1.instruments.test.ts` | 1 | a Record<StatKey, …> lacks the new keys |
| `src/core/model.test.ts` | 1 | `offlineCapSeconds` is now optional |
| `src/content/news/fallback.ts` | 1 | headlines lack `clearSkies`, `settled`, `unsettled`, `commonsBuilt`, `charter` |
| `src/ui/game.ts` | 1 | a HindsightTerms literal lacks `settled` |

The content lane has one error, because every new content field is optional. The core lane has most of them, as it
should.
