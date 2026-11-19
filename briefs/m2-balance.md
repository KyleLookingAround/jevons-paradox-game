# Brief: M2 BALANCE lane

You run after the core, content, UI and scene lanes have merged. You make M2 ("Restraint has a game; run 2 is
different") play to its targets, then lock them in as tests so later milestones cannot silently break the pacing.
One agent, alone.

Do NOT edit `src/types.ts`, `src/core/**`, `tools/**`, `src/ui/**`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or the
roadmap.

- If a target cannot be met by numbers alone, stop and report: logic belongs to the core lane.
- If the balancer lacks a column, strategy or flag you need, write a local throwaway script (not committed) and report
  the gap.

## Read first, in full

1. `src/types.ts` (search "M2"): every number's meaning.
2. `design/m2-contract-notes.md`, decisions (a) and (b) above all.
3. `CLAUDE.md`; the M2 section and decisions D1 and D6 of `design/roadmap.md`; "The run, as it will be after M2", the
   progression map to hour 10 and "The first hour, as now built" in `design/long-game.md`; section 3 (pacing table) and
   section 5 (the three risks) of `design/genre-audit.md`.
4. `briefs/m1-balance.md` and the current `src/balance.test.ts` (the M1 targets you must keep).

## Your files (only these)

- **Numbers in `src/content/**`**: parameters, costs, levels, weights, paces, `clearBelow`/`clearFloor`/`clearCeiling`,
  `dividendMul`, settle upkeep, Commons yields and costs, Charter magnitudes, Hindsight weights. Leave words, ids and
  structure as the content lane wrote them, except renumbering helper arguments.
- **`src/balance.test.ts`**: the targets as tests driving `model` directly at dt = 1 (coarser where a test only checks a
  run's end), with small in-test strategies; never parsing balancer output. Keep the suite under about 90 s.

## Tools

```
bun run tools/balance.ts efficiency|levers|idle|budget|forks|peakdraw|mixed|market|charter [runs]
    [--hours=3] [--total-hours=N] [--seed=1] [--json] [--summary] [--decisions] [--offline-check]
    [--pace=gentle|firm|severe] [--dividend=0|1|best] [--settle] [--commons] [--market=on|off]
```

## Targets

### M2 exit criteria (roadmap), as measurable targets

| # | Target | How measured |
|---|---|---|
| E1 | `budget` run 1 earns its first decade at 18–25 min | first `decade` event of run 1 (lean is fine) |
| E2 | `efficiency` earns no decade in runs 1–2 | `run.budgetDecades` = 0 |
| E3 | First Steady State at 3–4 h cumulative for `budget` and for `mixed` | cumulative play time at the first `steadyState` event |
| E4 | `efficiency` never reaches Steady State (6 h) | no `steadyState` event |
| E5 | `peakdraw` earns ≤ 0.5× `budget`'s Hindsight per minute (runs 3–6) | Hindsight per minute, averaged |
| E6 | Restraint (`budget`) ≥ 1.5× backfire (`efficiency`) Hindsight per minute from run 3 | per run, runs 3–5 |
| E7 | Backfire ≥ 1.2× restraint in runs 1–2 (each run) | per run |
| E8 | ≤ 3 min of active play without a player purchase or decision in hour 1; ≤ 5 min in hours 1–10 | `--decisions` (budget and mixed) |
| E9 | An 8-hour `fastForward` from any point of `efficiency`, `budget` and `market` play never ends in a crisis or collapse; `lastOffline.heldBy` names the hold | `--offline-check` |
| E10 | A 10-hour game across five Industries for `budget`, with Settlement used | `--total-hours=10 --settle`: all five open, at least one `settled` |
| E11 | Every Charter within ±15% of the mean Hindsight per minute | `charter` |
| E12 | Run 2 opens with the Market on and buys within its first 5 minutes (the Playwright half is the UI lane's) | `market`, run 2 |

### Decision (a): the backfire lead in runs 1–2

Run 1's lead was 1.10× in M1, below 1.2×. Decades in run 1 are lean (the restraint player's wellbeing sits below the
target), and lean decades pay no Hindsight by default (`perLeanDecade: 0`). Tune so E1 and E7 hold together. Prefer, in
order: `perFirstBackfire`, `perWellbeingYear` and `intensityExponent`; then decade dividends' one-offs; only then a
non-zero `perLeanDecade`. Report the ratio per run before and after.

### Decision (b): `peakdraw`

A line drawn at a pressure peak makes "half of p0" easy; the contract's `clearCeiling` caps the clear level (default
0.25 of collapse). Lean decades pay no Hindsight. Check E5 with `--pace=gentle` and `--pace=severe`; tune
`clearCeiling` per Industry before anything else.

### Steady State at 3–4 h (E3), not 1.9

Levers: `clearBelow` (the main knob), `clearCeiling`, the paces' `declinePerDecade`, absorption and substitution
strengths in Institutions, and `steady.standingDrawYears`. Steady State must need more than a seated cap: check that a
`budget` run with only cap Institutions seated never reaches it before hour 3, and that one with substitution or
absorption Institutions does by hour 4.

### Restraint as decisions (E8)

The dividend pairs (one per decade), the Commons, paces, settlement and the orders are the decisions inside a held
line. If E8 fails in hours 1–10, tune the cadence (decade length stays 10 years; adjust Commons costs so a project is
affordable about every 5 minutes of restraint play, Settlement timing, dividend pairs) and report which knob moved it.

### Settlement and the Commons

- A settled Steam must be defensible: with population still growing at the target, its defence should cost under half
  of the Mandate income of a restraint player at that point, so Settlement is worth taking; the forced unsettle should
  be possible (spill from Light under efficiency play) but rare in `budget` play.
- The Commons must not become a flat wellbeing multiplier: all eight projects together under 12 wellbeing points;
  intensity and time rebound visible (Commons-buying `budget` play burns at least 2% more than without, per Industry
  with intensity).

### The Market (E12) and the decisions series

- `market` run 2 opens with purchases within 5 minutes and reaches Light no later than `efficiency` run 2.
- Report decisions per model decade for `efficiency` with the Market on and off (the M3 target is ≥ 20% more with it
  on; no test yet).

### Known unmet M1 targets (carry them, report status)

- First Steady State 1.9 h → 3–4 h (E3).
- First decade in run 3 → run 1 at 18–25 min (E1).
- Backfire 1.1× in run 1 → ≥ 1.2× (E7).

### The genre-audit pacing table (keep, or meet)

First purchase 15–40 s · first founding 1–2 min · ≥ 12 purchases or decisions in the first 10 min · longest gap in the
first 15 min ≤ 90 s · first anomaly ≤ 1:00 · condenser 4–6 min with R ×2 within 2 min · the reveal 8–12 min · first
Mandate spend 10–14 min (budget) · first crisis 14–20 min · first decade 18–25 min · run 1 end 30–45 min · run 2 reaches
the condenser 2× faster and shows a new thing within 5 min · first automation 45–75 min · Light ≤ 1.5 h for both styles
· first Steady State 3–4 h · first Settlement 4–6 h · ten-hour checkpoint with no active gap over 5 min.

## Tests (`src/balance.test.ts`)

- Keep every M1 test that still applies; update those whose meaning M2 changed (Steady State now needs clear skies; the
  D1 run-1 ratio target is now enforced) and say which.
- One test per E-target E1–E12 that a headless run can check (E12's Playwright half excepted), with tolerances wide
  enough for small content edits (about ±15% on times).
- The decision-(a) and decision-(b) checks above, and the Settlement and Commons checks.
- Mark long tests clearly and keep the whole file under about 90 s (coarser dt where only the end matters).

## Checks

```
bunx tsc -p .
bun test
bun run tools/balance.ts efficiency 3 --summary
bun run tools/balance.ts budget 6 --summary --decisions --settle --commons
bun run tools/balance.ts mixed 6 --summary --decisions
bun run tools/balance.ts market 3 --summary
bun run tools/balance.ts peakdraw 6 --summary
bun run tools/balance.ts charter 3 --summary
bun run tools/balance.ts budget 1 --total-hours=10 --settle --commons --summary
bun run tools/balance.ts budget 4 --offline-check --summary
```

## Final report (concise)

- E1–E12: pass or fail, with the measured value.
- The D1 ratios by run, before and after.
- The pacing table: target, before and after.
- Every number you changed and why, grouped by module.
- Targets you could not meet with numbers alone, and what core change would meet them.
- Data for `DESIGN.md`'s first-run table and the "what the restraint player sees" paragraph (first decade, first clear
  skies, Steady State, first Settlement, Hindsight per minute by run). The coordinator updates `DESIGN.md`.
