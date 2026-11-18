# Brief: M1 BALANCE lane

You run after the core, content and UI lanes have merged. You make M1 "v1, honest" play to the targets, then lock the
targets in as tests, so later milestones cannot silently break the pacing. One agent, alone.

Do NOT edit `src/types.ts`, `src/model.ts`, `tools/balance.ts`, `src/ui/*`, `build.ts`, `DESIGN.md` or `CLAUDE.md`.

- If a target cannot be met by numbers alone, stop and report: logic changes belong to the core lane.
- If the balancer lacks a column or a strategy you need, write a local throwaway script, do not commit it, and report
  the gap.

## Read first, in full

1. `src/types.ts`: every number's meaning.
2. `design/m1-contract-notes.md`.
3. `CLAUDE.md`.
4. The M1 section and decision D1 in `design/roadmap.md`.
5. The first hour and its pacing table in `design/long-game.md`.
6. Items 1–5 in `design/critique-v1.md`.

The design documents say "era"; the contract says **sector** (on screen "Industry").

## Your files (only these)

- **Numbers in `src/content.ts`:** parameters, costs, levels, weights. Leave words, ids and structure as the content
  lane wrote them, apart from renumbering helper arguments.
- **`src/balance.test.ts`** (new): the pacing targets as tests that drive `model` directly at dt = 1 with small
  in-test strategies. They must not depend on balancer output text. You may import `evalCond` from `src/model`.

## Tools

```
bun run tools/balance.ts efficiency|levers|budget|forks|idle [runs] [--hours=3] [--seed=1] [--json]
```

## Targets

### The first hour (efficiency-only greedy play unless stated)

From `design/long-game.md`:

| Target | Value |
|---|---|
| First upgrade | 30–60 s |
| Mills founded | 1–2 min |
| Condenser | 4–6 min |
| Reveal (The Coal Question) | 9–12 min |
| First crisis | 14–20 min |
| Run 1 end | 30–45 min |
| Backfire, Hindsight per minute, runs 1–2 | ≥ 1.2× a lever/budget run's (owner decision D1) |
| Restraint (`budget`), Hindsight per minute, run 3+ | ≥ 1.5× backfire's (D1) |
| Within budget for 50 years | Never in efficiency-only play; reachable by about hour 4 of cumulative `budget` play |

### Beat-level shape

These come from the first-hour table. Encode the ones that are measurable:

- Better boilers raise consumption, not lower it.
- After the condenser, consumption about doubles within 2 minutes.
- At the reveal, direct rebound reads about 60–120%, not 1,500%.
- The first efficiency card after the reveal shows a positive decade line, or a within-reach line, for Railways.
- The first crisis costs about 8% of population.
- Run 2 reaches the condenser about 2× faster.

### Roadmap M1 exit criteria

- The `budget` strategy reaches a 50-year Steady State in Steam by about hour 4, and `efficiency` never does.
- The reveal lands at 9–12 minutes.
- Every efficiency card after the reveal shows a positive `projectedDecade` or a non-empty `bringsWithinReach` while
  frontier applications remain unfounded in that sector.

### The 3–5 hour arc

Then balance sectors 2–5 for the 3–5 hour arc:

- Light opens in run 2 or 3 for both strategies. Unlocks must not need cheap service.
- Each later sector is about 5–10× the money scale of the one before, and a little longer.
- Code is reachable by about hour 4 of competent play.
- The `forks` audit shows no arm combination more than about 10% better than another in Hindsight per minute. Report the
  spread; a test is optional.

## Findings already known

These come from the v1 runs, the critique and the model review. Start here.

1. **Mine pumping regenerates the reserve.** Keep `reserveGainPerService × η_max × pumping's share of demand < 1` for
   every reachable η, including Know-how.
2. **Direct rebound is too weak on the Era 1 (Steam) cards.** By mid-Steam the founded applications sit near unit
   elasticity, so the "red line" read −2%. Raise steepness, or move halfPrices, so that the applications founded by then
   are still elastic.
   - The shadow meter now separates direct from frontier, so this shows directly in `rebound`.
3. **Duty revenue floods Mandate.** It is now `global.levy.mandateShare`. Tune it so a duty lever helps fund upkeep
   without making Mandate free.
   - Remember that Mandate must be scarce when it matters (critique item 16).
4. **Substitution undercuts coal.** At 1.5 × c, renewable service can be cheaper than coal service while p_r is low.
   Keep flowCaps and shares so substitution is a top-up, not a replacement, in Steam.
5. **The first run lasts 162 min instead of 25–40.** Tighten the Steam reserve or pressure (Q0, `pressureIntensity`,
   `collapseAt`, absorption) for efficiency-only play.
6. **Lever play earns a quarter of efficiency play's Hindsight.** The new formula fixes the shape. Tune the weights
   (`perWellbeingYear`, `intensityExponent`, `perBudgetDecade`, `perUnburnt`, `perFirstBackfire`) to hit D1 in both
   directions.
7. **The sell button never shrinks.** The UI's shrink rule cannot fire while `clickSeconds` ≥ 1. You own `clickSeconds`
   and `clickFlat`: pick values so manual clicking matters for the first few minutes and fades by the condenser.
   Report the ratio for the UI lane.
8. **Steady State traps.**
   - Without `demography`, population growth defeats any cap. Keep `wellbeingTarget` < `transitionWellbeing`.
   - Check that an efficiency player who calls `drawBudget` at peak cannot farm decades from depletion. Their Hindsight
     per minute must stay below `budget`'s from run 3.
   - Check that `idle` earns less than half of backfire's Hindsight per minute.

## Tests (`src/balance.test.ts`)

- One test per pacing target above, with tolerances wide enough for small content edits (about ±15% on times).
- The D1 ratios over runs 1–2 and 3–4.
- The three roadmap exit criteria.
- The Steady State traps in finding 8.

Run time: keep the suite under about 60 s. Use dt = 1, and coarser where a test only checks run end.

## Checks

```
bunx tsc -p .
bun test
bun run tools/balance.ts efficiency 3
bun run tools/balance.ts budget 6 --hours=4
bun run tools/balance.ts forks 1
bun run tools/balance.ts idle 1
```

## Final report (concise)

- The first-hour table: target, before and after.
- The D1 ratios by run.
- The exit criteria: pass or fail.
- Every number you changed and why, grouped by sector.
- Targets you could not meet with numbers alone, and what core change would meet them.
- The sell-button ratio for the UI.
- Data for redrawing `DESIGN.md`'s first-30-minutes curve: R, η and rFold every 2 minutes of run 1. The coordinator
  updates `DESIGN.md`.
