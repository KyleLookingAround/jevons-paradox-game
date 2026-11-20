# Brief: M4 UI lane — the page

You bring the page of "Rebound" to M4: the Industry tabs as postcards (seven Industries), folding of everything
finished, Iron's order book, Fishing's chart with its two gauges, wager arms in letters, the Act title card and the
Act I credits, the capstone rows and arrears, the Preview label, and the notices for saves that meet M4. The design is
`design/m4-design.md` §§5.3, 5.7, 7, 8.2, 10; the views are in `src/types.ts` (M4 hunks) and
`design/m4-contract-notes.md` §10.

The UI holds no game rules: it reads `derive()` and the views, calls the model API, and patches the DOM in place
(structure built once per layout change; never rebuilt per tick).

Do NOT edit `src/types.ts`, `src/core/**`, `src/content/**`, `src/ui/scene/**` (the scene lane's; you call its API),
`src/ui/audio/**`, `build.ts`, `DESIGN.md`, `CLAUDE.md`. No git writes.

## Standing instructions

- Keep `design/scratch/m4-ui-progress.md`; land one verified piece at a time.
- **Measure on the real page, not a demo.** An earlier milestone regressed because lanes measured only in isolated
  demos. Every piece is checked in the built game at 390 × 844 with `tools/shot.mjs` (one mode at a time; `all` has run
  the container out of memory) and against the budgets below with `tools/perf.mjs` on a copied `dist/`.
- Performance rules (CLAUDE.md): no per-frame `requestAnimationFrame` loop (the game loop is the 10 Hz timer); no CSS
  animation or transition inside the scene's SVG; no custom property set on a scene root that many nodes inherit; never
  insert a `<style>` per update; bars and needles ease only for jumps (`dom.ts snapSmall`); lazy parts are called through
  `src/ui/chunks.ts` handles.

## Your files

`src/ui/**` except `scene/` and `audio/`: in particular `tabs.ts`, `panels.ts`, `mechanics.ts`, `dispatch.ts`,
`ending.ts`, `sheets.ts`, `layout.ts`, `unfold.ts`, `world.ts`, `prefs.ts`, `devmock.ts`, `app.ts` (single owner this
milestone); new `orderbook.ts`, `chart.ts`, `fold.ts`; and `tools/shot.mjs` modes `m4` and `m4real` (new).

## Work

1. **Baseline first.** Before changing anything, measure and record in your progress note: `tools/perf.mjs --check` at
   fresh, mid, late; the main column's scroll height at a late M3 fixture (`design/scratch/m4-fixtures/act1-late.json`
   once the core lane provides it; meanwhile the M3 late state); tab-switch time.
2. **Postcards.** Each tab a static 64 × 40 crop from the scene lane's `postcard(sectorId)` (rendered once per layout
   change), with the warning dot, the settled wash or capstone cartouche, "Preview", and the affordable dot; a sideways
   scrolling row that keeps the selected tab in view; keyboard and screen-reader labels; colour-independent marks.
3. **Folding** (`fold.ts`): one line each for owned cards ("Owned · 14"), maxed levers, a settled Industry (settled
   card, defence line; the rest behind "Show the Industry"), the capstone group ("The Coal Age (settled {year})"), and
   owned-and-maxed shop items; per-device memory of what was opened (`prefs.ts`, try/catch around storage).
4. **The order book** (`orderbook.ts`) from `SectorDerived.feeds`: per fed Industry, name, factor in words ("engines ×
   0.88"), and under a drawn line its share of the line this decade; tap to select that tab. Iron's use cards show their
   feed line via the existing `wantedChange` line.
5. **The chart** (`chart.ts`) from `SectorDerived.stock`: "Catch per trip" always; "The stock, surveyed" only while
   surveyed (a blank gauge lettered "No survey" otherwise); regrowth, the foreign share, the scar line. While unsurveyed
   the pressure gauge shows `reportedPressureFraction`, the sparkline draws no sink line, and the formula sheet says
   "Catch per trip, as the skippers report it. It is not a survey."
6. **Wager arms** in the letter panel: the hint under the label, both outcomes, a small "A bet on the state of things"
   label; after answering, the reply and won/lost in the paper's words.
7. **Act title card** at a new save's first run ("Act I · The Coal Age") and the **Act I credits** (from `Content.ending`
   and `ModelApi.retrospective`) with the continue label; the M3 record shown under its own template.
8. **Capstone and arrears**: capstone rows in their group; an arrears line and the defence in Mandate terms.
9. **Previews**: the label on postcards and the Age title card's Preview line; `Derived.nextSectors` checklists for
   Previews as for any Industry.
10. **Settlement blocked** reason (`settleBlocked`) on the settle control and the ending checklist ("Settled 3 of 4.
    Fishing needs the stock surveyed").
11. **Save notices** for saves that meet M4 (the text lane's strings), shown once.
12. `devmock.ts` and the dev page brought to the M4 views.
13. **The Board's Survey card** (design §2A.1; `Derived.surveyReveal`, `Content.surveyReveal`): over the Fishing panel, in
    the harbour frame, two columns, the footer, "File the survey"; once a save (own "seen" key); the game runs behind it;
    kept as an Archive entry. **The two readings** once `estimates` is on: every Industry's consumption gauge gains the
    fainter full-account needle with `embodied` in its formula sheet; Steam's reserve shows "At this year's rate · At the
    rate it is growing" from `yearsLeft`; each budget line is labelled with its account. **Unknown reckoning causes**
    (foresight for M7) get a default label, never a throw.

## Budgets (exit criteria for this lane)

- `bun run build.ts --check` passes (first paint ≤ 240 KB gz); report the main bundle's growth (target ≤ 8 KB gz).
- `node tools/perf.mjs --check` passes at fresh, mid, late and the new `act1` state (frames, taps, tab switch with seven
  tabs, DOM, heap), and `--load` cold and warm within budget; report before and after.
- Main column scroll height at `act1-late.json` ≤ the baseline you measured in step 1; every settled or capstone Industry
  is one card.
- Postcards render once per layout change (prove with the profiler: no postcard work in a 60-second idle trace).

## Checks (Playwright at 390 × 844 on the real build)

New `shot.mjs` modes, run one at a time: `m4` (Iron opens, the order book with feed lines; Fishing unsurveyed then
surveyed; a wager answered both ways; the postcard row scrolled with seven tabs), `m4real` (from `act1-ending.json`: the
credits, then the next run with the capstone group and Motion as a Preview; from an M3 save: Previews marked and the
notice shown once). Look at every screenshot yourself: wrapping at 360 px, nothing over the scene, labels legible in
dark and light themes.

## Final report

What changed per file; screenshots' paths; budget figures before and after; contract gaps.

## Revision (20 Nov 2026): The Survey and foresight

The Age dissolve is cut. Add to the `m4` shot mode: the reveal card at 390 × 844 (both variants from fixtures), and Steam's
panel before and after `estimates`.
