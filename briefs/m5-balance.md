# Brief: M5 BALANCE lane (runs last, by one agent)

You tune M5's numbers so its exit criteria hold, and encode them as tests so later milestones cannot break them. You run
after the core, content, UI, scene and audio lanes have landed. The criteria are `design/m5-design.md` §15 (numbered
1–25; this brief refers to them by number); the knobs are named in the content lanes' reports.

Do NOT edit `src/types.ts`, `src/core/**` (report core bugs; the coordinator routes them), `src/ui/**`, `build.ts`,
`DESIGN.md`, `CLAUDE.md`, `design/roadmap.md`. Balancing changes numbers in content, never logic, never text. Act I's
numbers are M4's: change them only if an M5 criterion cannot be met otherwise, and then re-run M4's long tests.

## Standing instructions

- Keep `design/scratch/m5-balance-progress.md` with every measurement (command, result); land one verified change at a
  time (`bun test` green apart from targets still being tuned, marked `test.todo` until met).
- Long runs in the background, polled, output to `design/scratch/m5-balance/`; never all strategies at once; the machine
  is shared and containers restart: keep each campaign resumable from a dumped state.

## Read first

`design/m5-design.md` (§§1, 4, 8, 9, 15, 16); the core lanes' experiment results; `design/scratch/m4-balance-progress.md`
(how M4's balance and finishing passes went: what did not bite until the rules changed); `src/balance.test.ts`,
`src/balance.long.test.ts`; `tools/balance.ts` and the regulator bots in `tools/strategies/`.

## Your files

Numbers in `src/content/**` (keep each number's comment current); `src/balance.test.ts`, `src/balance.long.test.ts`
(M5 cases in a new describe block, or a new `src/balance.m5.test.ts` behind `BAL_LONG`); `design/unlock-schedule.md`
gets an "M5" section (the coordinator may move it).

## Order of work

1. **Measure everything once** as landed: from `fixtures/m5/office-offer.json`, each regulator (`abstain`, `naive`,
   `hawk`, `steward`, `humanGov`) for five Ministries against the default profile; then full campaigns from a new save to
   hour 30 for `mixed`, `budget`, `human` with `--office` and `steward` as the regulator.
2. **Pryce bites** (5) before anything else: Motion's growth tail (content numbers) until unopposed Pryce reaches the
   first crisis at 18–35 minutes.
3. **The Chair** (7–11): Confidence weights, the Treasury's shares, the Hindsight overlay; then the hawk and abstain
   targets across the profile grid (`--rival-profile=grid:20`).
4. **Instruments** (12–16): ladder escapes and premiums, inspection numbers, Plenty's return shares and the subsidy, the
   charge's popularity.
5. **Pacing** (17–19, 22): feature `when`s, Plenty's opening, Statecraft prices, the Treaty's `when`; never a clock gate,
   never a currency gate on progress.
6. **Letters** (20): scale wager effects (never words) until thoughtful ≥ 1.05× default ≥ random for `steward`, `naive`
   and `abstain`; report `oracle` as the ceiling.
7. **Decisions** (21) with `--decisions`.
8. **Must not regress**: every M4 criterion that passed (run M4's long tests once at the end).
9. **Encode** each target with its measured value in a comment; keep the fast file under about two minutes.

## Page and performance

After your numbers settle, once on a copied `dist/`: `bun run build.ts --check`; `node tools/perf.mjs --check` at fresh,
mid, late, act1 and `ministry`; `node tools/shot.mjs m5real` at 390 × 844 (one mode at a time). Regenerate
`fixtures/m5/` with Core B's documented command if your numbers moved the states, and say so.

## Final report

A table of every criterion: target, measured before, measured after, test name; every number changed and why; criteria
not met and why; fragile targets (sensitivity to the bots' rules and the profile); contract or core issues for the
finishing pass.
