# Brief: M4 CONTENT lane — Iron & Steel

You write Iron & Steel, the Coal Age's third Industry, to the Industry kit, and its revivals in Steam.
The design is `design/m4-design.md` §4 (identity, the order book, the kit, text examples) and §6. Other lanes
work at the same time: core, Fishing, text (letters, Archive, headlines beyond the kit), Act and prestige, UI, scene,
audio; balance comes after and owns the final numbers.

Do NOT edit `src/types.ts`, `src/core/**`, `src/ui/**`, other Industries' files except the revival cards named below,
`src/content/index.ts`, `features.ts` or `content.test.ts` (the Act lane owns them; send it your registry line). No git
writes.

## Standing instructions

- Keep `design/scratch/m4-content-iron-progress.md`; land one verified piece at a time.
- House style: `design/style-guide.md` (British English, dry broadsheet, never lectures; blurbs ≤ 140 characters and
  never repeat the number; "Industry" and "Age", never "sector" or "era", in player text). Facts only from
  `design/research/*.md` marked [V] or [S], or checked by you with the source written in your progress note; anything
  marked * in the design is unchecked: check it or leave it out.

## Your files

- `src/content/sectors/iron.ts` (new): the SectorDef, applications with `feeds`, upgrades, levers, `settle`,
  `mechanic`, sector headlines (60, Iron's own paper: the iron market report).
- Revival cards only, appended to `src/content/sectors/steam.ts` (Steel boilers, Steel rails), each with `when` on the
  Iron card it needs. Touch nothing else in that file. (Light's and Fishing's revivals were cut in the revision.)

## Work

1. **The SectorDef.** 1828–1914 (`firstYear` 1828); service iron and steel (tons); resource coke with
   `resourceStock: 'steam'`; pressure slag and smoke, crises The Orange Night (0.4) and The Slag Slide (0.7); spill none;
   `unlock` with `minReckonings: 3` and `when` on Steam's Cornish engine owned and Railways founded (labels on each
   child), never a price gate. `mechanic: { name: 'The order book', rebound: 'Embodied', blurb: … }`.
2. **Applications (6)** with the feeds in the design's table (Rails → Steam 0.85; Ship plate → Steam 0.92 and Fishing
   0.85; Bridges & girders → Light 0.88; Machine tools → '*' 0.92; Tinplate & cans → Fishing 0.90; Barbed wire none).
   Profiles not needed (Iron has no load curve).
3. **Upgrades**: 8 efficiency with stages 0–3 and `machine` names; 3 capital including the repeatable "Blow in another
   furnace"; the two forks (Sheffield crucible quality / Bessemer tonnage; Acid / Basic lining) with `excludes` on both
   sides; the research card (*The Coal Question*, ch. VII on iron) adding the feed projection lines. Costs from the
   content helpers' curves; the comment beside each number says what it is for.
4. **Levers (5)**: Coke duty (duty; Jevons's "a small tax on the ton of coal would be a heavy tax on the ton of iron"
   [V] goes in the blurb, attributed); Furnace licences (cap); Build to last (sufficiency); Scrap bounty (circularity
   with `sideEffects`: satMul on Iron's uses, `unless` the coke duty is in force; source Zink & Geyer 2017, in the
   design's source list); Smoke inspector (substitution). Every lever a `catch` (and `catchAfter` where it names a later
   system), repeat tables from the helpers.
5. **Settle** dividend and blurb.
6. **Revivals** (2 cards, as above), each a card the Market may buy.
7. Hand the Act lane: the registry line, the `ages.ts` change (Iron in the Coal Age's `sectors`), and Iron's features
   needs (none).

## Done means

- The lint passes for Iron (kit counts, `Cond`s resolve, a catch per lever, a rebounding lever, the mechanic heading,
  headline lengths, banned words), and the feeds graph is acyclic.
- On real content with the core lane's build: `bun run tools/balance.ts efficiency 1 --from=<run-4 dump> --summary`
  shows Iron opening and its feeds raising Steam's R (report the figure against `--ignore=feeds`); `budget` 5 runs plays
  without errors.
- A screenshot at 390 × 844 of Iron's panel on the real page (`node tools/shot.mjs real`, the UI lane's mode for the new
  Industry when it exists; otherwise the dev page) checked for line length and wrapping: names on one line at 360 px,
  blurbs within two lines.

## Final report

The card and lever list with numbers' intent; facts checked and their sources; anything left out for want of a source;
what the balance lane should tune first (the feed multipliers, Iron's wellbeing weight, the coke draw).

## Revision (20 Nov 2026)

After the Board's Survey (feature `estimates`) new lines are drawn on the full account, so each feeding use's card
also reads as a cost on the fed Industry's line; write the use blurbs so they stay true under both accounts.
