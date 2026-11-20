# Brief: M5 CORE A — the rival (Pryce), inspection, loopholes

You build the half of the M5 core that makes Pryce Consolidated an opponent: the rival's yearly decision (the Market's
rule with his purse), his response table and the answer line, the effective level of a lever, concealment and
inspection, the loophole ladders and amendment. Core B (`briefs/m5-core-office.md`) builds office, elections, the
Treasury, hidden flow, the Treaty and save v6 at the same time; you share no module. Content, UI, scene and audio lanes
build from the contract and do not talk to you; balance comes after.

Do NOT edit `src/types.ts` (report gaps to the coordinator; work around locally and say so), Core B's modules, content,
UI, `build.ts`, `DESIGN.md`, `CLAUDE.md`, `design/roadmap.md`. No git writes. The core stays pure: no DOM, no
`Date.now()`, no `Math.random()`, never mutate the state passed in.

## Standing instructions

- Restarts will stop you. Keep `design/scratch/m5-core-rival-progress.md` and update it after each piece; land one
  verified piece at a time (tests green, `src/core` typechecks).
- Long runs (balancer campaigns, the full test suite) go in the background with output to a file in
  `design/scratch/m5core/`, polled; never two long runs at once (the machine is shared).

## Read first

1. `src/types.ts`: every `M5:` hunk. `design/m5-contract-notes.md` §§3, 4, 5, 8, 15, 16; `design/m5-design.md` §§1, 5,
   6.2, 6.3, 16.
2. `src/core/README.md` (layering), `src/core/orders.ts` (the Market), `src/core/temptation.ts` (the bucketed cache you
   will copy for the answer line), `briefs/m4-core.md` for conventions that still hold.

## Your files

New: `src/core/chair/rival.ts`, `src/core/chair/inspect.ts`, `src/core/chair/loopholes.ts`, their tests
(`src/core/m5.rival.test.ts`, `m5.inspect.test.ts`, `m5.loopholes.test.ts`). Extended (you own them this milestone):
`orders.ts` (the shared candidate rule; Pryce's tick before the player's orders; the 'inspection' order), `effects.ts`
and `leverLevels.ts` (new effects; pledge, Article and playbook sources; effective level), `conditions.ts` (your
StatKeys and the `{ loophole }` leaf). Core B owns `step.ts`, `index.ts`, `derive.ts`, `serialise.ts`, `solver.ts`: give
them one exported function per rule (`rivalTick`, `concealTick`, `inspect`, `amend`, `loopholeTick`, `capTargetScale`,
`levyScale`, `rivalAnswerView`) and they add one line each. Update `src/core/README.md`'s table for your modules.

## Work, in this order

1. **No fields, no change.** Before anything, re-run M4's golden trajectories (`m4.golden.ts`, `m4.nochange.test.ts`):
   every later step must reproduce them while content has no `chair`.
2. **The shared candidate rule.** Refactor the Market's candidate scan and payback out of `orders.ts` into one function
   both the Market and Pryce call. M4's golden runs must be byte-identical afterwards.
3. **Fixture first** (`src/core/fixture.ts`, shared with Core B: you add, they do not touch): a two-application "motor"
   sector in a chair act with one repeatable demand card, a duty, a cap and a measure lever with a two-rung ladder (one
   exempt app; the last rung `closedBy` the duty); a ChairDef and RivalDef with placeholder numbers.
4. **Run the experiments of `design/m5-design.md` §16 that are yours, on the fixture, BEFORE any real content exists:**
   E1 (Pryce saturates or keeps growing), E2 (each response chosen somewhere in a lever sweep; answer line = action),
   E3 (never-inspect loses decades; the reported/true gap), E5 (the ladder bites; the duty closes it), E8 (head start
   does not collapse before the first poll). Report each as numbers in your progress note and to the coordinator at
   once; a failed experiment stops content work on that mechanic until the design is revisited.
5. **The rival**: profile from the opening (pure, from meta), policy, the yearly decision (purchase, answers,
   concealment), response costs and effects exactly as notes §3.4, the effective level helper used everywhere a level is
   read, the answer line cached per lever per 20 s structural bucket.
6. **Inspection and concealment**: ramp, reportedR, levy and cap scaling (helpers for the solver), the capstone's
   excess (reuse M4's arrears stepping), `inspect`, standing inspection, certified decades.
7. **Loopholes**: rung states, evade's escape and rung effects in the effects overlay, exempt apps, `amend` (drafting,
   Opposition hold), Pryce re-answering after a close.
8. Tests for every rule; one test per exit criterion you can check in core: criterion 4 (the answer line equals the
   action, exactly), 6 (no concealment inside the quiet period), 12–14 on the fixture.

## Fixtures

Your core tests use `src/core/fixture.ts`. Save fixtures for other lanes are Core B's (`fixtures/m5/`, committed); never
read files from `design/scratch/` in a test (M4's CI failure).

## Done means

All of the above with tests; `bun test` green; `tsc -p .` clean; M4's golden runs unchanged with M5 fields absent;
experiments reported; the README updated; a report listing contract gaps and local workarounds.

## Verified by

`bun test` (fast suite; long files in the background to `design/scratch/m5core/`); `src/core/perf.budget.test.ts` with a
new case: Pryce's yearly decision ≤ 2 ms per chair sector and a Ministry step ≤ 1.25× M4's act1 step. The page is
checked by the UI lane with your views; you check the answer line's numbers against `derive()` in a test.
