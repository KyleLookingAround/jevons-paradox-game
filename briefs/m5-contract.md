# Brief: M5 CONTRACT lane (alone, first)

You write the M5 contract of "Rebound" ("The Other Chair") into `src/types.ts`, with the save-version bump to 6, before
any other M5 lane starts. The decisions are made: `design/m5-contract-notes.md` is the specification; `design/m5-design.md`
is why. Turn the notes into exact, documented TypeScript that the core, content, UI, scene and audio lanes can build
against without talking to each other.

Do NOT edit any other file except your progress note and, if `tsc` demands it, type-only fixes in the content lint (say
so). No git writes; the coordinator commits.

## Standing instructions

- Container restarts and usage limits will stop you. Keep `design/scratch/m5-contract-progress.md` (what is written,
  what is next) and save after each section; land one verified section at a time.
- British English in comments; "Industry" and "Age" in anything player-facing; `Sector` in code.
- Nothing long-running is needed; if you run `bunx tsc -p .` repeatedly, write its output to a file in
  `design/scratch/` rather than reading it whole.

## Read first

1. `CLAUDE.md`; `src/types.ts` as it stands now (re-read every type the notes touch: M4's finishing pass may have changed
   it since the notes were written; keep the notes' intent and record each difference).
2. `design/m5-contract-notes.md` (all of it), `design/m5-design.md` §§0, 3, 5, 6, 7.
3. `design/m4-contract-notes.md` §§11, 14 and `briefs/m4-contract.md` for the conventions.

## Work

1. Every hunk additive, marked `M5:` or `/* --- M5 --- */`; nothing reordered; every new field optional or defaulted so
   that M4 content plays exactly as before (no `Content.chair` → no Ministry; no `hiddenFlow` → the M4 solve).
2. In order: `ActDef.chair` / `closedInOffice`; `OfficeDef`, `Content.office`, `MetaState.office`, `GameState.officeOffer`;
   `ChairDef`, `ChairState`, the Confidence and polling rules in doc comments exactly as notes §2; `PledgeDef`,
   `LeverDef.popularity`, `LeverState.since`; `RivalProfile`, `ResponseKind` (open union), `ResponseDef`, `RivalDef`,
   `RivalState`, the yearly decision and the response table (§3) and the effective-level rule; inspection and
   concealment (§4), `SectorState.decadesCertified`, `RunStats.certifiedDecades`, `OrderId 'inspection'`,
   `OrdersState.inspection`; `LeverDef.ladder`, `LoopholeDef`, `LoopholeState`, `ApplicationDef.when` (§5); the Treasury,
   `'subsidy'`, `'charge'`, `targets`, `basis` (§6); `SectorDef.hiddenFlow`, `returnShareMul`, `SectorDerived.water`,
   `AppDerived.regime` (§7); the Statecraft and transfer fields and every new `EffectDef` (§8); `ArticleDef`,
   `PlaybookDef`, the Treaty and the MetaState fields (§9); `DispatchArm.stance` (§10); the FeatureIds, the Cond leaf
   `{ loophole }`, `owns` resolution, StatKeys, `ReckoningCause 'defeated'`, EventKinds and HeadlineKeys with their order,
   `HindsightTerms.parliaments`, `RunSummary.ministry` and `sectors[s].openFor` (§11); the views (§12); the ModelApi
   additions and the changed actions (§13); `SAVE_VERSION = 6` with the v5 → v6 steps in its comment (§14).
3. Where the notes leave a constant to you, choose it, write it in the comment, and list it in your report.
4. Run `bunx tsc -p .`; write a "what no longer compiles" table (file, count, cause) at the end of your progress note for
   the lanes.
5. **Reserve one amendment.** The lanes will find gaps (M4's found seven). Leave a short `/* M5 (amend): */` section at
   the end of the M5 hunks listing, empty, where amendments go; the coordinator routes gap reports to you (or a
   successor) for one consolidated amendment commit in week two.

## Done means

`src/types.ts` typechecks on its own; every item of the notes' §§1–14 is present with a doc comment precise enough to
test against; the M4 test fixture and real content still type-check except where your table says. A short report:
deviations from the notes and why; constants chosen; the compile table.

## Verified by

`bunx tsc -p .` (types.ts clean); the coordinator's read of the diff against the notes; no runtime change (no file in
`src/` other than `types.ts` touched), so `bun test` changes only by the compile errors listed. No page check is needed
for this lane (nothing renders differently); the UI lane's first job re-measures the budgets.
