# Brief: M3 BALANCE lane (runs last)

You tune the numbers of "Rebound" M3 so that the milestone's exit criteria hold, and encode them as tests so later
milestones cannot silently break them. You run after the core, content, UI, scene and audio lanes have landed.

Do NOT edit `src/types.ts`, `src/core/**` (report core bugs; the coordinator routes them), `src/ui/**`, `build.ts`,
`DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`. Balancing changes numbers in content, never logic.

## Standing instructions

- You will be interrupted by container restarts and usage limits. Keep a progress note at
  `design/scratch/m3-balance-progress.md` with every measurement you take (command, result), and land one verified
  change at a time (`bun test` green apart from targets still being tuned, which you mark `test.todo` until met).
- Make no git writes; the coordinator commits.
- Long balancer runs: run them in the background and poll; never all strategies at once.

## Read first

`design/m3-contract-notes.md` (§0: the unfolding is a target, not decoration); the M3 section of `design/roadmap.md`;
`briefs/m2-balance.md` and `src/balance.test.ts` (the carried-over targets); `tools/balance.ts --help` as the core lane
left it; the content lanes' reports.

## Your files

Numbers in `src/content/**` (any file; keep the comment beside each number you change up to date, and never change
text), and `src/balance.test.ts`.

## Targets (encode each as a test; times are active play)

M3 exit criteria:

1. **15–20 hours of distinct play across five Industries; the first ending reached by `mixed` in that window**
   (`--total-hours=20`; ending hour from the summary).
2. **Something new at least every 2 active hours to hour 20** for `budget` (`--unlocks`: longest gap between firsts).
3. **Does not crowd the unfolding:** for `budget`, `mixed` and `efficiency`, no two feature unlocks within five
   minutes of each other through hour 10, and at most one new system per run in runs 1–4 (`--unlocks`).
4. **The pure half of shift 3:** `efficiency` with the Market on shows at least 20% more decisions per model decade
   than without (`--market=on|off`, decisions per decade from the summary). Closing automations (the Civil Service, the
   dispatch order) cut them at least 30% where they apply.
5. **Each mechanic matters:** for each of seams, load, travel and free, the strategy that ignores it
   (`--ignore=<kind>`) earns at least 25% less Hindsight per minute (or, for free, shows the expected demand) over the
   runs where the Industry is open.
6. **Dispatch and fork audit:** random arms within ±10% Hindsight per minute of each other per dispatch
   (`--dispatch-audit`); the existing fork audit still within ±10%.
7. **Each History cleared** by `budget` within 2× the median clearing time (`--history=<id>` for all ten).
8. **`crisisFarm` never beats `budget`** for Mandate or Hindsight per minute after run 2 (audit rec. 9a).
9. **The Proprietor's Day** triggers headlessly after filing a fixture return (`--file-return`) at about hour 7.
10. **Dispatches fill the quiet:** with dispatches answered at `random`, the restraint player's longest stretch without
    a decision is at most 3 minutes in hour 1 and at most 5 in hours 1–10 (the levers-only stretch late in runs 1–2 is
    where the first letters land).

Carried over from M2 (must not regress; adjust only as the owner's M2.1 direction changed them):

- `efficiency` earns no decade in runs 1–2 (now trivially: the budget opens at about run 3);
- first Steady State at 3–4 h for `budget` and `mixed` — re-measure after M2.1: if the budget's move to run 3 pushes it
  later, report the new figure rather than forcing it, and set the target with the coordinator;
- `peakdraw` ≤ 0.5× `budget`'s Hindsight per minute; restraint ≥ 1.5× backfire from run 3; backfire ≥ 1.2× in runs
  1–2;
- an 8-hour `fastForward` never ends in a crisis or collapse; the offline Hindsight bound (E9b);
- every Charter within ±15%;
- the first-hour beats (first purchase 15–40 s, the reveal at 8–12 min, run 1 ends at 30–45 min, cadence) — the seam
  ladder must not move run 1's end out of 30–45 min for the efficiency player who sinks nothing.

Withdrawn: "first decade within budget at 18–25 min of run 1" (M2.1 moved the budget to about run 3).

Known open items from M2 to address or report: first decade at 17.2 min against 18–25 (moot now; re-measure the first
decade's new time in run 3 and report it); the three-minute quiet patch (target 10 above); pacing figures' sensitivity
to the bot's Reckoning rule (report Hindsight per minute under two Reckoning rules, the current one and "reckon at the
first crisis after the reveal", for targets 1, 7 and the carried-over ratios, and say which targets are fragile).

## Order of work

1. Measure everything once with the content as landed (record in the progress note).
2. Unfolding first (target 3): move feature `when`s and spacing before tuning economies, since everything else depends
   on when things arrive.
3. Mechanics (5), then dispatches (6, 10), then Histories (7), crisisFarm (8), then the long runs (1, 2), then the
   carried-over targets, then shift 3 (4, 9).
4. Encode each target in `src/balance.test.ts` with the measured value in a comment; keep the whole file under about
   two minutes (split slow ones into a `describe` behind an env flag if needed, and say so).

## Final report (concise)

A table of every target: target, measured before, measured after, test name. Every number you changed with its reason.
Targets you could not meet and why. Fragile targets. Contract or core issues found.
