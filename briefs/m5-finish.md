# Brief: M5 FINISHING PASS (one agent, after balance)

M4 proved that a balance pass cannot make every mechanic bite: two of its mechanics needed rule changes (feeds acting on
demand; foreign fleets filling the room left) and letters needed a new stake before they mattered. Your job is the same
for M5: take the balance lane's list of criteria that numbers could not meet, and make each one bite with the smallest
change to rules, content or contract, then land M5 for merge.

You may edit, with the coordinator's agreement per item: `src/core/**`, `src/content/**`, `src/ui/**`, tests, tools, and
`src/types.ts` for additive `M5 (finish):` hunks only. Do NOT edit `build.ts`, `DESIGN.md`, `CLAUDE.md` or
`design/roadmap.md` except the M5 "Built" paragraph the coordinator asks for. No git writes.

## Standing instructions

- Keep `design/scratch/m5-finish-progress.md`; one verified item at a time; after each, `bun test` green and `tsc` clean.
- Long runs in the background to `design/scratch/m5-finish/`, polled; never two campaigns at once.
- Every change keeps the architecture: pure core, content as data, the UI holds no rules, Bun only, no runtime
  dependencies. A rule you add is documented in `src/types.ts` as M4's finish did.

## Read first

The balance lane's final report and progress note; `design/m5-design.md` §§15, 16; `design/m5-open-questions.md` (the
owner's answers, if any, override this design); `design/scratch/m4-balance-progress.md` "FINISHING PASS" (the form).

## Likely items (from the design's risks; confirm with measurements first)

1. **Pryce does not bite** even with a growth tail (criterion 5): consider his founding limit acting on calendar-dated
   uses, or his purchases ignoring saturation by advertising (a `halfPriceMul` growth card he alone buys).
2. **Abstention pays too well** (7): the parliaments term, certified decades only, or Confidence costs of crises.
3. **Inspection is a chore** (14, 21): Standing inspection earlier, or concealment slower.
4. **Letters do not matter to `abstain`** (20): more wagers on visible state for the Ministry that does not inspect.
5. **Elections nag or are trivial** (9, 10): term length, the relax rate, the pledge bonus.

## Done means

Every criterion met or recorded as a miss with the reason; `bun test` and `BAL_LONG=1` long files green; `tsc` clean;
`bun run build.ts --check` passes; `tools/perf.mjs --check` passes at every state; `tools/shot.mjs` modes `m5`,
`m5real`, `m4real`, `real`, `flow`, `checks` clear at 390 × 844, one at a time, with the phone screenshots looked at;
`fixtures/m5/` regenerated if states moved; a report for the coordinator with the M5 "Built" paragraph drafted (met,
missed, withdrawn, as M4's).

## Verified by

The commands above, their logs in `design/scratch/m5-finish/`, and a playthrough note from the Take office fixture to
Ministry 3 in the built game.
