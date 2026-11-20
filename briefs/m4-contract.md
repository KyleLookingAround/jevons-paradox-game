# Brief: M4 CONTRACT lane (alone, first)

You write the M4 contract of "Rebound" into `src/types.ts` in one commit's worth of work, with the save-version bump to
5, before any other M4 lane starts. The decisions are made: `design/m4-contract-notes.md` is the specification;
`design/m4-design.md` is why. Your job is to turn the notes into exact, documented TypeScript that the core, content,
UI, scene and audio lanes can build against without talking to each other.

Do NOT edit any other file except a progress note, and the content lint's type-only fixes if `tsc` demands them (say
so). No git writes; the coordinator commits.

## Standing instructions

- You may be stopped by a container restart. Keep `design/scratch/m4-contract-progress.md` (what is written, what is
  next) and save after each section.
- British English in comments; the house words ("Industry" and "Age" on screen; `Sector` in code).

## Read first

1. `CLAUDE.md`; `src/types.ts` as it stands after the M3 finish (re-read every type the notes touch: M3's finish may have
   changed it since the notes were written, in which case keep the notes' intent and record the difference).
2. `design/m4-contract-notes.md` (all of it) and `design/m4-design.md` §§2, 5, 7, 8.
3. `design/m3-contract-notes.md` §§0, 1, 11 for the conventions and the "what no longer compiles" table you will write.

## Work

1. Every hunk additive, marked `M4:` or `/* --- M4 --- */`; nothing reordered or reformatted; every new field optional
   or with a default that leaves M3 content playing exactly as before.
2. In order: `ActDef`, `Content.acts`, the ending rule in `GameState.steadyYearsAll`'s comment (with and without acts),
   `Derived.ending.act` and `next.need` 'requires'; `CapstoneRecord`, `MetaState.capstone`, `SectorState.capstoned` /
   `arrears` and the arrears rule in `SettledState`'s comment and the lapse rule's; `OfflineReport.heldBy` 'arrears';
   `SectorDerived.preview`; `SectorDef.resourceStock` and `drawnBy`; `ApplicationDef.feeds`, `SectorDerived.feeds`,
   `AppDerived.feeds`; `resourceKind` 'renewable', `RenewableDef`, `ForeignDef`, `pressureSource` 'depletion', the
   survey and foreignMul effects, `SectorState.crossed`, `MetaState.scars`, `SectorDerived.stock`; `LeverKind` 'quota';
   `settle.requires`, `SectorDerived.settleBlocked`; the wager on `DispatchArm`, `AnsweredDispatch.won`, the arm view;
   the Cond leaf `{ ending }`; the StatKeys; the EventKinds and HeadlineKeys and their order in a step; `RunSummary`
   additions; `SAVE_VERSION = 5` with the v4 → v5 steps written into its comment exactly as notes §11.
3. Where the notes leave a constant to you (a default, a substep limit), choose, write it in the comment, and list it in
   your report.
4. Run `bunx tsc -p .` and write `design/m4-contract-notes.md`-style "what no longer compiles" as a section at the end of
   your progress note (file, count, cause), for the lanes.

## Done means

- `src/types.ts` itself typechecks; every item of notes §§1–11 is present with a doc comment precise enough to test
  against; the M3 test fixture and real content still type-check except where the table says.
- A short report: every deviation from the notes and why; constants chosen; the compile table.

## Verified by

`bunx tsc -p .` (types.ts clean); the coordinator's read of the diff against the notes; no runtime change (no `src/`
file other than `types.ts` touched), so `bun test` is unchanged except compile errors listed.

## Revision (20 Nov 2026): The Survey and foresight

Also write `design/m4-contract-notes.md` §14 (foresight for The Inheritance: `MetaState.world` holding `capstone` and
`scars`; `ReckoningCause` documented as open) and §15 (the Survey: `RenewableDef.firstSurvey`, `Content.surveyReveal`,
`Derived.surveyReveal`, FeatureId `'estimates'` after `'survey'`, `SectorDerived.fullR` / `embodied` / `yearsLeft`,
`BudgetState.account`, 'surveyed' with first and label 'reveal'). These supersede the first version's top-level
`meta.capstone` and `meta.scars`.
