# Brief: M4 CONTENT lane — the Act, the unfolding, prestige, re-gating, the lint

You own the content registries and everything that ties the Act together: `Content.acts`, the Coal Age's four
Industries in `ages.ts`, the re-gating of Motion, Compute and Code as Previews, the M4 unfolding in `features.ts`, the
new Charters, Histories, Institutions, Commons and achievements, and the content lint's M4 rules. The design is
`design/m4-design.md` §§2, 3, 7, 9, 12; the contract `design/m4-contract-notes.md` §§1, 2, 9.

Do NOT edit `src/types.ts`, `src/core/**`, `src/ui/**`, the Iron and Fishing files (those lanes send you their registry
lines), or the text lane's files. No git writes.

## Standing instructions

- Keep `design/scratch/m4-content-act-progress.md`; land one verified piece at a time.
- House style. History rules (`HistoryDef` comment) are binding.

## Your files

`src/content/index.ts` (single owner this milestone), `ages.ts`, `acts.ts` (new), `features.ts`, `global.ts` (the
numbers the Act needs), `prestige.ts` (the two Institutions), `charters.ts`, `histories.ts`, `commons.ts`,
`achievements.ts`, `content.test.ts`; the `unlock` blocks only of `sectors/motion.ts`, `compute.ts`, `code.ts`.

## Work

1. **Acts**: `actOne` ("Act I", "The Coal Age", ages ['coal'], ending { id 'actOne', sectors steam, light, iron,
   fishing }, capstone { incomeShare 0.25 }); `actTwo` and `actThree` with `preview: true` and no ending. Register Iron
   and Fishing; `sectorOrder` steam, light, iron, fishing, motion, compute, code; the Coal Age's `sectors` in that order.
2. **Re-gating**: Motion, Compute and Code `unlock.when` = any(ending 'actOne', owns self) AND opening conditions that can
   hold in a capstoned run (Motion: run time ≥ 300 s; Compute: Motion's first Steady State or 10,000 vehicle-mile-years;
   Code: as now on Compute). Labels on every child. `minReckonings` such that the first post-Act-I run opens Motion.
3. **The unfolding** (design §9): the M4 schedule; mid-run features guarded so that an Industry opening is the run's
   mid-run arrival (a helper using StatKey `openFor`); travel and the free price gated on their Industries (so they
   arrive in the Previews); the Archive by run 8 and the bite by run 9; nothing of Act I after the ending (a test).
4. **Prestige**: the Fishery Board (L1 survey on Fishing; L2 also `startLever` the survey quota at 1; shown in the shop
   once Fishing has opened); the Inspector of Furnaces (`startLever` Iron's smoke inspector at 1). The Settlement
   Commission: first sitting is Act I's fourth room; keep its second sitting for the Previews; check its cost against the
   new Hindsight economy with the balance lane.
5. **Charters (4)** and **achievements (8)** as in design §12 (no new Histories or Commons: cut in the revision), each with its numbers'
   intent in a comment. The Fishery Board Charter (an institutionLoan) is offered only once Fishing has opened.
6. **The lint (`content.test.ts`)**: acts reference real ages and sectors, each age in at most one act, ending sectors
   all in the act; feeds acyclic with spill and drawsOn; `resourceStock` names a stock sector with no resourceStock of its
   own; a renewable sector has `renewable` and `pressureSource: 'depletion'` and its last crisis at 1 − θ; `quota` levers
   only on renewable sectors; wager rules (never the default arm, a hint ≤ 70 characters, both branches have an effect,
   Cond resolves); the Industry kit for Iron and Fishing; "no Act I feature after the ending" as a data check on the
   `when`s; banned words still enforced.

## Done means

- `bun test src/content` green; the whole content typechecks.
- Headlessly with the core build: `bun run tools/balance.ts budget 1 --total-hours=20 --unlocks --summary` shows Iron in
  run 4, Fishing in run 6, at most two new things a run from run 4, Motion only after the Act I ending (report the log).
- An M3 save (the coordinator's fixture) loads with Motion, Compute and Code open and marked Preview on the real page at
  390 × 844 (screenshot).

## Final report

The schedule as data and as measured; the prestige numbers' intent; lint rules added; anything the Industry lanes still
owe you.

## Revision (20 Nov 2026): The Survey and foresight

- Feature `estimates` (`when: { flag: 'survey:fishing' }`, intro: the reveal's follow-up line or none, since the card is the
  introduction).
- The revised schedule (design §9): run 6 brings Fishing and then the Board's Survey; the household survey moves to run 7
  at the Reckoning; Histories to run 8. Test: the moment comes at least five minutes after Fishing opens and nothing else
  arrives in run 6.
- Revival cards in Light and Fishing are cut; achievements include one for the moment ("Filed: the Board's Survey").
