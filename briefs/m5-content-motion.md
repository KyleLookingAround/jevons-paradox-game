# Brief: M5 CONTENT — Motion leaves Preview (and Act II's switch)

You turn Motion from an M4 Preview into the first Industry of the Other Chair: Pryce runs it from Take office, and the
player legislates. No new mechanic: Motion keeps its travel-time budget and sprawl. What changes is its act, its growth
tail, its loophole ladder, its charge, its pledges and its numbers under Pryce. Design: `design/m5-design.md` §§1, 6.2,
6.7, 7.1, 7.4; contract: `src/types.ts` `M5:` hunks and `design/m5-contract-notes.md` §§1, 2.3, 5, 6.

Do NOT edit `src/types.ts`, `src/core/**`, `src/ui/**`, other Industries' files, `build.ts`, `DESIGN.md`, `CLAUDE.md`.
No git writes. Content is data: numbers and words, never rules.

## Standing instructions

- Keep `design/scratch/m5-motion-progress.md`; land one verified piece at a time (`bun test src/content` green, `tsc`
  clean).
- Long runs (balancer) in the background with output to `design/scratch/m5-motion/`; never two at once.
- House style (`design/style-guide.md`): British English, dry broadsheet, never a lecture; "Industry" and "Age"; no real
  companies or living people; real history only from `design/research/` or checked by you with the source recorded.

## Read first

`design/m5-design.md` (all); `src/content/sectors/motion.ts`; `src/content/acts.ts`; `design/research/restraint.md` §§5.1,
7; `design/research/energy.md` §5; Core A's experiment E1 and E5 results (ask the coordinator; do not tune before them).

## Your files

`src/content/sectors/motion.ts`, `src/content/acts.ts` (Act II's `chair: 'government'` and Act III's `closedInOffice`),
Motion's loopholes and pledges (put them in `motion.ts` and export; the content registry owner wires them),
`src/content/dispatches/motion.ts` only for `stance` tags on the existing Pryce letters.

## Work

1. **The act switch**: Act II `chair: 'government'`, no `preview`; Act III `preview: true, closedInOffice: true`.
   Motion's `unlock.when` keeps its Preview path (before office) and gains the office path (`{ flag: 'office' }`,
   opening at minute 1 of a Ministry).
2. **The growth tail** (the measured problem: unopposed, Motion saturates by minute 15 at 0.17 of collapse;
   `design/m5-design.md` §1): two repeatable capital cards that raise demand ("New model year", hire purchase made
   repeatable), and one or two calendar-dated uses with `ApplicationDef.when` on the year ("The school run", motorway
   haulage). Target (criterion 5): under `abstain`, The Summer Smog at 18–35 minutes; oil not exhausted before 120.
3. **The ladder** on the mileage rule: rung 1 *Light trucks* (an exempt app with `when: { loophole }`, `escape`,
   rung effects on the exempt app, premium, amend "Count every vehicle under 8,500 lb"); rung 2 *The footprint rule*
   (verify the 2011 footprint standard before a card names it; `restraint.md` marks it "not re-checked"); rung 3 robust,
   `closedBy` the duty. Props 'vans'. Criterion 13: alone ≥ 0.95× baseline after 30 years; with the duty ≤ 0.85×.
4. **The charge**: a congestion charge (`kind: 'charge'`, `requires: ['charge']`, `popularity` start −3, after +1,
   years 10 as a first guess; side effect: reallocated road space unless walking distance, `restraint.md` §7.1).
5. **Pledges** (six), e.g. "No new taxes on motoring" (binds the duty), "A railway for every town" (substitution flow,
   Treasury cost), "Roads for the regions" (binds nothing, raises the road programme), each with a `when`.
6. **Catch lines**: `catchAfter` on `chair` for the duty and the cap ("Pryce Consolidated will pay it on the barrels it
   reports"); every lever's catch still names its own rebound.
7. **Stance tags** on every arm of the existing Pryce letters (Motion's; Iron's are the text lane's).

## Done means

The content lint passes; Motion plays as a Preview before office (unchanged numbers there) and under Pryce after;
criteria 5 and 13 measured on the bots (report numbers; balance finalises them); a list of every knob with its comment.

## Verified by

`bun test src/content`; `bun run tools/balance.ts abstain --office --summary` and `steward` from
`fixtures/m5/office-offer.json` (Core B's), output to files; on the real page at 390 × 844, with the UI lane's
`tools/shot.mjs m5` mode once it exists: the Motion tab under Pryce, the vans appearing on Evade, the ladder card. Check
the first-paint budget (`bun run build.ts --check`) after adding prose: long prose goes in the late text part
(`src/content/textsplit.ts`).
