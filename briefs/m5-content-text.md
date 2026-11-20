# Brief: M5 TEXT lane — Pryce's voice, Take office, letters, headlines, Archive

You write M5's words: five cast members, the Take office sequence (the acquisition, the Minister's last letter, Pryce's
prospectus and the file on the late proprietor), 26 letters (14 from Sir Edmund Pryce, 10 of all letters wagers), about
100 headlines for the new keys and Plenty, 24 Archive notes, the feature intros, Plenty's prose, and the stance tags on
Iron's Pryce letters. Design: `design/m5-design.md` §§3, 5.1, 6.10, 9.3; contract: notes §§1, 10, 11.

Do NOT edit `src/types.ts`, `src/core/**`, `src/ui/**`, numbers in the Industries' files, `build.ts`, `DESIGN.md`,
`CLAUDE.md`. No git writes.

## Standing instructions

- Keep `design/scratch/m5-text-progress.md`; one verified batch at a time.
- House style (`design/style-guide.md`): British English; dry broadsheet; the game never lectures; "Industry" and "Age",
  never "sector" or "era" on screen; no real parties, living politicians or left/right labels (D4): "the Ministry", "the
  Opposition"; no real companies. Pryce is genial and never a villain. Facts only from `design/research/` or checked by
  you with the source in the Archive note.
- Prose that is not needed at first paint goes in the late `text` part (`src/content/textsplit.ts`); check
  `bun run build.ts --check` after each batch (first paint ≤ 240 KB gz).

## Read first

`design/m5-design.md` (all); `design/style-guide.md`; `src/content/cast.ts`; `src/content/dispatches/iron.ts` and
`motion.ts` (the Pryces so far); `src/content/boardSurvey.ts` (how M4 wrote its moment); `src/content/words.ts`.

## Your files

`src/content/cast.ts` (new cast: pryceChair, permanentSecretary, chiefInspector, okonedo, opposition); new
`src/content/office.ts` (OfficeDef.text: acquisition, the Minister's letter, the prospectus templates and their default,
the file templates); new `src/content/dispatches/chair.ts` and `plenty.ts`; `src/content/dispatches/iron.ts` (stance
tags only); `src/content/news/*` (new keys); `src/content/archive/{chair,plenty}.ts`; `src/content/words.ts` (the time
formatter: "the eighteenth second", "a minute and twenty-six seconds", "inside five minutes", folded repeats "another
every twenty-odd seconds").

## Work

1. **The prospectus first** (experiment E9): write the template and the formatter; render it from the first openings in
   `fixtures/m4/act1-ending.json`, `hour6.json` and `m3-human-after-ending.json` and from the default; it must read in
   four lines with repeats folded. Put the three renders in your progress note for the coordinator to read.
2. **Take office**: the acquisition headline and sub-line; the Minister's letter (the design's draft is a starting
   point); the prospectus close ("They have read its notebooks"); the file card's lines and its conclusion by pliant band
   (three bands).
3. **Letters (26)**: Sir Edmund Pryce 14 (voluntary agreements, threats to close, funding an Institution; 7 wagers on the
   truth of his returns, conditions on `concealment` and `yearsSinceInspection`, hints like "Pays if Pryce's returns are
   honest"; one guaranteed-a-Parliament wager with `parliamentWagers < 1`); the Permanent Secretary 4; the Chief
   Inspector 3; Mrs Okonedo 3 (Plenty; one wager on water consumed); the Leader of the Opposition 2. M3's and M4's rules
   (a price on every arm, defaults modest with no standing effects, wager lint) and stakes as M4's finish
   (`hindsightShare` ±0.022). Every Pryce arm tagged with `stance`.
4. **Headlines** for every new key (three to six variants each) and Plenty's sector headlines (about 40), e.g.
   "Ministry finds 'clerical error' at Pryce refinery"; "Light trucks outsell the family saloon; the standard is
   unchanged"; "Drip irrigation saves water on every acre; acres up".
5. **Archive** (24 notes, each with a source): CAFE and light trucks; the footprint rule (check it); Stigler 1971; the
   1975 Act; the Volkswagen notice (2015); Stockholm's charge; London's; Grafton 2018; Pfeiffer & Lin 2014 (Kansas);
   Haber–Bosch; the centre pivot; drip; the Green Revolution (with D4's care). Sources checked this session are listed at
   the end of `design/m5-design.md`.
6. **Feature intros** for the seven M5 features; **Plenty's prose** (tagline, mechanic blurb, applications, cards,
   levers' blurbs and catches) for the Plenty lane's ids.

## Done means

The content lint and `dispatches.test.ts` and `archive.test.ts` pass; first paint within budget; the prospectus renders
read well from three fixtures; a register of every new id (as M4's `m4-registry-text.md`) in `design/scratch/`.

## Verified by

`bun test src/content`; `bun run build.ts --check`; on the real page at 390 × 844 with the UI lane's `tools/shot.mjs m5`
mode: the prospectus card and the file card from `fixtures/m5/office-offer.json`, one Pryce wager letter, headlines
fitting the masthead width.
