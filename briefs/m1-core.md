# Brief: M1 CORE lane

You bring the simulation core of "Rebound" up to the M1 contract. Three other lanes work at the same time from the same
contract and do not talk to you:

- content (`src/content.ts`);
- UI (`src/ui/*`, `src/main.ts`, `src/styles.css`, `index.html`, `tools/shot.mjs`);
- balance, afterwards (numbers in `src/content.ts` and `src/balance.test.ts`).

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md` or `CLAUDE.md`. If the contract is wrong or
missing something, work around it locally and say so in your report.

## Read first, in full

1. `src/types.ts`, the binding contract. Its doc comments are the specification: every formula, default and edge case.
2. `design/m1-contract-notes.md`: the decisions and why, plus the old → new name mapping.
3. `CLAUDE.md`.
4. The M1 section of `design/roadmap.md`.
5. P1–P4, P7 and P14 in `design/proposals.md`.
6. Your own `src/model.ts`, `src/model.test.ts`, `src/model.review.test.ts`, `src/fixture.ts` and `tools/balance.ts`.

`DESIGN.md` and `design/*.md` still say "era"; the contract's word is **sector** (and **age** for the period).

## Your files (only these)

- `src/model.ts`
- `src/fixture.ts`
- `src/model.test.ts`, `src/model.review.test.ts`, and any new `src/model.*.test.ts`
- `tools/balance.ts`

**Rename first.** Conforming to the contract starts with the mechanical rename in your files: era → sector, `eras` →
`sectors`, `ERA_ORDER` → `content.sectorOrder`, and the other rows of the mapping table in
`design/m1-contract-notes.md`. `SectorId` is a string now:

- iterate `content.sectorOrder`;
- never assume five sectors or the v1 ids, except in the fixture's data;
- "all sectors" means every id in `sectorOrder`.

Commit the rename, behaviour unchanged, before any behaviour change. It makes review possible.

## Work, by proposal

### P1 instruments

- **Shadow solve.** Run `solveEra` again with η = `etaAtBase`; nothing else changes. It yields `shadowR`, `promisedR`,
  `rebound` (direct), `frontierFold` and `backfired`.
  - Use the closed form where possible: a stock sector with no cap and no substitution needs no bisection.
  - Compute it in `derive`. In `step`, compute it at least once per real second for backfire detection and Cond
    `rebound`.
- **Upgrade projections.** Fill `projectedDecade` and `bringsWithinReach` per `UpgradeView`:
  - horizon `PROJECTION_YEARS` = 200 s at dt = 5;
  - for `efficiency` and `capital` cards only.
  - Cache by (state.time rounded to 1 s, the upgrades object, the meta object). Budget: `upgradeViews` at most about
    15 ms for 8 visible cards in Bun.
- **Price parts on SectorDerived:** `capCost`, `margin`, `resourcePriceBase`, `permitPrice`, `preLevyPrice`,
  `permitPart`, `dutyPart`, `substitutedShare`. The `servicePrice` identity must hold to 1e−9.
- **Other new Derived fields:** `nextCrisisFraction`, `clickValue`, `age` and `year`.

### P2 budget, demography, lever repeat, decades

- **Budget lines (`SectorState.budget`).** Drawn in three ways, each per the contract:
  - auto-draw on the first lever raise;
  - auto-draw for an active cap;
  - `drawBudget`.
- **Lines and streaks:** `budgetR(t)`, `withinBudget`, `decoupling`, the streak, decades (`decadesWithin`, decade
  effects, headlines), Steady State per sector (once per run) and `firstSteadyEffects`.
- **Steady State across all sectors.** `steadyYearsAll` and `won` are defined over `sectorOrder`.
- **Caps follow the budget:** capR = value × budgetR(t). Duty keeps `ref`.
- **The demography curve** in `GlobalParams.popGrowth`.
- **Lever `repeat`:** synthesise level definitions (values, costs, upkeep, labels) and respect the kind ranges.
  `setLever` accepts levels up to `maxLevel`. `LeverView.current`, `next` and `maxLevel` come from the same function.
- **Levy and recycling.** Income becomes `m × preLevyPrice × D`. The levy is the duty part plus the permit part.
  - Treasury share comes from `global.levy.mandateShare` (default 0.1), replacing the `DUTY_MANDATE_SHARE` constant.
  - The `dividend` option feeds wellbeing as `D_div`.
  - `setLeverRecycle`.

### P3 conditions and unlocks

- Write `evalCond(state, content, cond)` and export it from `model.ts` for tests and the balancer. It is not part of
  ModelApi.
  - Pure, using the same flows as `derive`.
  - Unknown stat or leaf → false.
- Unlock rules per `SectorDef.unlock` (with `after`, `when`, and the deprecated price gate).
- `Derived.nextSectors` with checklists. Write fallback labels for unlabelled leaves.
- Achievements with `when`, checked at least once per real second.

### P4 Hindsight, loadout, Know-how trees

- The new formula and `HindsightTerms` in `derive` and in `meta.lastRun`.
- `run.wellbeingYears`, `run.yearsAtTarget`, `run.budgetDecades`, `run.firstBackfires` and `meta.backfiredSectors`.
- Institutions:
  - levels (`nextLevels`);
  - effects apply only while seated;
  - `slots` and `meta.slots` (fresh meta: `startingSlots ?? 2`);
  - `setLoadout`.
- Know-how:
  - `tree`, `tier` and `branch` gating;
  - `knowhowViews` and `institutionViews`.
- Shop spending only while `freshRun`. A purchase rebuilds the run (keep v1's `withMeta`).

### P7 forks

- `excludes` (symmetric) and `excludedBy` on UpgradeView.
- The new effects:
  - `satMul` and `halfPriceMul` (per app or the whole sector);
  - `popGrowthMul` and `wellbeingAdd`;
  - `unlock` (with `locked` on upgrades and levers);
  - the one-offs `slotAdd`, `mandateAdd` and `capitalAdd` (seconds of income), fired at grant time only.

### P14 calendar

- `Derived.year` and `Derived.age` from `AgeDef.yearSpan`, `SectorDef.firstYear` and `CALENDAR_LATE_RATE`.
- `NewsItem.year` and `RunSummary.yearReached` use the calendar.
- Headline placeholders: `{sector}`, `{age}`, `{year}` and `{n}`.
- `sectorHeadlines` take precedence over `headlines`.
- The `ageBegins` headline.

### Persistence

- `SAVE_VERSION` 2. Implement the v1 → v2 migration exactly as the comment on `SAVE_VERSION` says, including `eras` →
  `sectors` in state, history, news and `lastRun`.
- Refuse saves from the future.
- Keep the type validation of map-valued fields from the review. `institutions` now holds numbers.

## Known model follow-ups from the review (fix them)

1. **Start-of-run effects bought mid-run.** The contract now forbids mid-run Hindsight spending (`freshRun`). Remove the
   mid-run institution branch in `buyInstitution`.
2. **Repeated steady headline.** The `steadySector` headline and achievement fire once per sector per run
   (`run.steadySectors`), even if the streak breaks and is earned again.
3. **Unbounded `tick` with huge dt.** Clamp to `MAX_TICK_SECONDS` (60) before sub-stepping. `fastForward` is the only
   long path.
4. **`etaAtBase` and `steadySectors` are now typed.** Drop the `EraStateX`/`RunStatsX` casts.

## Fixture

Update `src/fixture.ts` to the new shape:

- `sectors`, `sectorOrder`, and `ages`: at least two ages, one sector with a `theme` override, and a sector with
  `firstYear`;
- a lever with `repeat` and one with `recycle: ['treasury', 'dividend']`;
- a fork pair, a Know-how tree with two tiers and a branch, and an institution with `nextLevels` and `slots: 2`;
- unlocks using `when` (with labels) and one using the deprecated price gate;
- `demography` and `steady` (with a decade effect and `firstSteadyEffects: [{ type: 'slotAdd', value: 1 }]`);
- an achievement with `when`.

Steam must stay exactly the `DESIGN.md` reference economy.

## Balancer (`tools/balance.ts`)

Keep `efficiency`, `levers` and `idle`, renamed to the new contract. Add two strategies.

**`budget`** holds the line.

- Before the reveal it plays like `efficiency`, but does not found an application if that would put R above a budget
  it intends to draw.
- At the reveal it calls `drawBudget` on every open sector, then raises cap and sufficiency levers (and repeats) to stay
  within budget, and keeps Mandate positive.
- Between runs it buys Institutions first and seats a cap, duty or reveal loadout, then Know-how.
- It reports decades and Steady State.

**`forks`** plays every fork arm.

- It runs `efficiency` once per combination of arms. With 4 Steam forks, cap at 16 combinations, or at random arms
  chosen by `--seed`.
- It prints Hindsight per minute per arm combination and the spread. The fork audit target is ±10%; just report it.

Both strategies, and `levers`, print these extra columns:

- per sector: rebound (direct), `frontierFold`, `budgetR`/R, streak and decades;
- Hindsight terms at each Reckoning;
- Hindsight per minute per run.

Add `--json` to emit a machine-readable run summary per run. The balance lane will build `src/balance.test.ts` on top of
`model` and `evalCond` (not on balancer output), but the JSON helps.

## Required tests (`bun test`)

Keep every v1 test that still applies, renamed. Add:

1. **Shadow.** With no efficiency bought, `rebound` is null and `shadowR` equals R.
   - After founding a second application, `frontierFold` > 1, and with no efficiency bought `rebound` is still null.
     The v1 bug (meter at 552% from mills alone) must be impossible.
   - After an efficiency purchase, rFold = frontierFold × R / shadowR (1e−9).
   - Under a binding cap, rebound ≈ 1.
2. **Projections.** `projectedDecade` is null before the reveal. After the reveal, it is non-null for visible efficiency
   and capital cards.
   - The fixture Steam with only pumping founded shows mills in `bringsWithinReach` for Better boilers when it crosses
     0.8.
   - No application already available is ever listed.
3. **Budget.**
   - `drawBudget` before the reveal is refused.
   - The first lever raise draws a budget.
   - Redraw resets the streak and keeps decades.
   - `budgetR` declines by (1 − d) per 10 model years.
   - A cap at value 1.0 keeps `withinBudget` true (tolerance).
   - Decoupling needs wellbeing ≥ target.
   - A decade fires its effects and headline once.
   - 50 years gives per-sector Steady State, with the headline once even after a break and re-earn.
   - `firstSteadyEffects` adds a slot only the first time ever.
4. **The win** needs every sector in `sectorOrder` open plus 50 years. Opening a sector resets `steadyYearsAll`.
5. **Demography.** Growth peaks at s + (W_t − s)/√3 and is zero at W ≥ W_t. Without `demography`, v1 behaviour holds.
6. **Lever repeat.** Synthesised values and costs follow the formula. The level stops at the kind's range.
   `setLever` beyond `maxLevel` is refused.
7. **Levy.**
   - Income excludes the permit and duty parts.
   - Treasury gives `mandateShare` × levy to Mandate.
   - Dividend gives 0 Mandate and more wellbeing than treasury at the same levy.
8. **Cond.** Every StatKey on the fixture, scope rules (closed sector → false), `owns` for each kind, empty `all`/`any`,
   and `not`. Unlock with `when`, `after` and the legacy price gate. Checklist progress values.
9. **Hindsight.**
   - Each term in isolation.
   - Idle play earns no unburnt term.
   - Reckoning at t = 1 s earns 1.
   - `firstBackfires` only counts sectors new to `meta.backfiredSectors`.
   - `lastRun.hindsightTerms.total` equals `hindsightGained`.
10. **Loadout.**
    - Only in a fresh run.
    - Over-slot or unowned ids are refused.
    - Unseated institutions do nothing; seated ones apply all owned levels.
    - Shop purchases are refused mid-run and rebuild the run when fresh.
11. **Know-how.** Tier gate, branch exclusion (permanent), and one-off `slotAdd` on purchase.
12. **Forks.** Excluded both ways, visible but not affordable, and "Jevons Was Right" ignores excluded arms.
13. **Calendar.**
    - The year is monotone across a sector opening.
    - Light opens at ≥ its `firstYear`.
    - Past the age's last year the calendar runs at 10% speed.
    - Without ages, the v1 clock.
14. **Migration.** A hand-written v1 save loads:
    - `eras` → `sectors`, institutions → levels, grandfathered slots and loadout, cap ref → budget;
    - steady counters reset.
    A v3 save → null.
15. **Purity, determinism, no NaN.** No NaN or Infinity after 3 h of `efficiency`, `budget` and `levers` play at dt = 1.
    `tick(huge dt)` returns promptly (at most 60 s advanced).

## Checks

```
bunx tsc -p .     # your files clean; ignore errors in content and UI files
bun test
bun run tools/balance.ts efficiency 3 --fixture
bun run tools/balance.ts budget 4 --fixture
bun run tools/balance.ts forks 1 --fixture
bun run tools/balance.ts efficiency 2     # real content, once the content lane has landed
```

## Exit criteria (yours)

- Every ModelApi method implemented exactly as typed, and every test above passing.
- On the fixture, `budget` reaches at least one decade and `efficiency` none.
- The balancer runs all five strategies on the fixture without errors.

The roadmap's game-level exit criteria are the balance lane's to prove:

- `budget` reaches Steady State in Steam by about hour 4, and `efficiency` never does;
- the reveal lands at 9–12 minutes;
- every efficiency card after the reveal shows a positive decade or within-reach line while frontier applications
  remain.

Make sure the tools let them prove these.

## Final report (concise)

- What you implemented, file by file.
- Every place you deviated from or found a gap in `types.ts`, with your local workaround.
- Constants you chose, with their values.
- Test count.
- Fixture balancer headlines for `efficiency` and `budget`: run length, reveal minute, peak rebound, decades, and
  Hindsight per minute by run.
- Projection timing.
- What the balance lane must know (ranges that keep the solver sane, and any trap you saw).
