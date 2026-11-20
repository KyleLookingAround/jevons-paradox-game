# Brief: M4 BALANCE lane (runs last, by one agent)

You tune M4's numbers so that its exit criteria hold, and encode them as tests so later milestones cannot break them.
You run after the core, content, UI, scene and audio lanes have landed. The criteria are `design/m4-design.md` §15
(numbered 1–25, 22–25 added in the revision for the Survey shift; this brief refers to them by number); the knobs are named in the content lanes' reports.

Do NOT edit `src/types.ts`, `src/core/**` (report core bugs; the coordinator routes them), `src/ui/**`, `build.ts`,
`DESIGN.md`, `CLAUDE.md`, `design/roadmap.md`. Balancing changes numbers in content, never logic, never text.

## Standing instructions

- Keep `design/scratch/m4-balance-progress.md` with every measurement (command, result); land one verified change at a
  time (`bun test` green apart from targets still being tuned, marked `test.todo` until met).
- Long runs in the background, polled; never all strategies at once; the machine is shared.

## Read first

`design/m4-design.md` (§§1, 3, 9, 15, 16); `design/scratch/m3-finish-progress.md` and `design/unlock-schedule.md` (what
M3 measured, the human-like player, the pursuit of the ending in the bots); `src/balance.test.ts` and
`src/balance.long.test.ts`; `tools/balance.ts --help`.

## Your files

Numbers in `src/content/**` (keep the comment beside each number up to date); `src/balance.test.ts`,
`src/balance.long.test.ts`; `design/unlock-schedule.md` gets an "M4" section (the coordinator may move it).

## Order of work

1. **Measure everything once** as landed: 26-hour campaigns for `mixed`, `budget`, `human` (`--commons --unlocks
   --dispatch=thoughtful --survey=never` and again `--survey=board`); `efficiency` 3 runs; `fishsteward` from a run-6
   dump. Compare Hindsight per minute by run with the M3 finishing runs (`design/scratch/finish/g4-*.txt`) and say where
   the Act without Motion and Compute is poorer.
2. **The unfolding first** (criteria 2–4): feature `when`s and Industry openings, before economies.
3. **Iron** (5–7): feed multipliers, Iron's wellbeing weight and margin, the coke draw.
4. **Fishing** (8–12): r and θ for the first-run crossing; β for the gauge; the scar's mul and years for the ending's
   hour; foreign share0/growth/cap; the fishery limits' side effect; the Fishery Board's cost.
5. **Letters** (13–14): scale wager effects (never their words) until thoughtful ≥ 1.05× default ≥ random for `budget`
   and `efficiency`; report `oracle` as the ceiling. The quiet-stretch target with letters at `thoughtful`.
6. **The Act I ending** (1) last among the economy targets: the Settlement Commission's cost, the scar years and
   Fishing's regrowth are the levers; never a clock gate.
7. **Capstone and Previews** (16–17): incomeShare, Motion's spill against the capstone defence, Previews' openings.
8. **Audits** (15): forks ±10%, Charters ±15%, Histories within 2× the median.
9. **Carried over from M3** (must not regress): the first-hour beats; `efficiency` earns no decade in runs 1–2;
   `peakdraw` ≤ 0.5× `budget`; restraint ≥ 1.5× backfire from run 3; offline bounds; crisisFarm never beats budget after
   run 2; each M3 mechanic still a temptation (seams, load; travel and free now in the Previews, measured there).
10. **Encode** each target in `src/balance.test.ts` (fast) or `balance.long.test.ts` (BAL_LONG=1), with the measured
    value in a comment; keep the fast file under about two minutes.

## Page and performance (with the UI lane's tools, on the real build)

After your numbers settle, run once on a copied `dist/`: `bun run build.ts --check`; `node tools/perf.mjs --check` at
fresh, mid, late, `act1`; `node tools/shot.mjs m4` and `m4real` at 390 × 844. Your numbers change how much is on screen
(Industries open, settled, capstoned); report any budget your balance moved.

## Final report

A table of every criterion: target, measured before, measured after, test name. Every number changed and why. Criteria
not met and why. Fragile targets (sensitivity to the bots' Reckoning rule and to `--survey`). Contract or core issues.

## Revision (20 Nov 2026): The Survey and foresight

The full account changes the Act I ending's difficulty (Steam's line carries Iron's coke after the moment): measure it
first after the unfolding, and tune with Iron's feeds and the ending's own knobs, never by turning the account off.
