# Brief: M5 UI lane — the Ministry on the page

You bring the page of "Rebound" to the Other Chair: the Take office sequence (with the prospectus and the file), the
Ministry chrome and sill (Inspectors, Confidence), Pryce's answer on every lever card, Pryce's panel and his read-only
order book, the election sheet, inspection taps, loophole cards and amendment, the Treasury and compensation,
Opposition, Plenty's two water gauges, the sealed postcards, and the Treaty's Articles tab. Design:
`design/m5-design.md` §§3, 6, 10; views: `src/types.ts` `M5:` hunks and `design/m5-contract-notes.md` §12.

The UI holds no game rules: it reads `derive()` and the views, calls the model API, and patches the DOM in place
(structure built once per layout change; never rebuilt per tick).

Do NOT edit `src/types.ts`, `src/core/**`, `src/content/**`, `src/ui/scene/**` (call its API), `src/ui/audio/**`,
`build.ts`, `DESIGN.md`, `CLAUDE.md`. No git writes.

## Standing instructions

- Keep `design/scratch/m5-ui-progress.md`; land one verified piece at a time.
- **Measure on the real page, not a demo.** Every piece is checked in the built game at 390 × 844 with `tools/shot.mjs`
  (one mode at a time; `all` has run the container out of memory) and against the budgets with `tools/perf.mjs` on a
  copied `dist/` (copy it before building again). Long runs in the background, output to `design/scratch/m5-ui/`.
- Performance rules (CLAUDE.md): no per-frame `requestAnimationFrame` loop (the 10 Hz timer); no CSS animation or
  transition inside the scene's SVG; no custom property on a scene root that many nodes inherit; never a `<style>` per
  update; bars and needles ease only for jumps (`dom.ts snapSmall`); lazy parts through `src/ui/chunks.ts`; late prose
  filled in `onText()` or keyed on `textGen()` (`src/ui/text.ts`).
- Words: "Industry" and "Age" on screen; British English.

## Your files

`src/ui/**` except `scene/` and `audio/`, single owner of `app.ts` this milestone. New: `ministry.ts` (sill, Confidence,
election sheet, Opposition state), `rival.ts` (Pryce's panel, order book, answer line component), `office.ts` (Take
office sequence, prospectus and file cards), `water.ts` (Plenty's gauges), `treaty.ts` (Articles tab). Tools:
`tools/shot.mjs` modes `m5` (synthetic checks) and `m5real` (the real fixtures), `tools/perf.mjs` state `ministry`.

## Work

1. **Baseline first**: `tools/perf.mjs --check` at fresh, mid, late, act1; the main column's scroll height at
   `fixtures/m4/act1-late.json`; record both.
2. **Take office** (§3.1): the extra buttons on the Reckoning card while `officeOffer`; the four steps (headline, letter,
   the thaw into the frame via the scene lane's API, the prospectus card), then the file card in the first minute. Every
   step waits for a tap. Text from `Content.office.text` (late part: fill in `onText()`).
3. **Ministry chrome**: the sill bar under the picture (Inspectors: tap to arm, tap a landmark or the Industry row to
   inspect; greyed with a cooldown ring), the Confidence sparkline with polling day; Confidence as a third small line in
   the masthead; "as reported" on the Consumption gauge with a "true" tick while `inspectedUntil`.
4. **Lever cards**: Pryce's answer line (glyph and word per response, cost; tap for the ranked list), the pledge lock,
   the court notice, the carve-out mark, `effectiveLevel` when it differs; loophole cards under laddered levers (rung,
   exempt thing, Amend with cost and drafting bar, the robust rung's label).
5. **Pryce's panel** (folded by default) and his **order book** replacing card lists in his Industries (one folded line:
   "Pryce has bought 14; next: Lean-burn engine, payback 80 s").
6. **The election sheet**: three pledge cards, keep two, one tap each; never modal; resolves itself; the result as a
   headline and a Confidence tick.
7. **The Treasury** line in the purse's place; Compensate on an Industry while jobs are lost; Commons from the Treasury.
8. **Opposition**: lever signs grey, Campaign button, the scene lane's curtains.
9. **Plenty's widget**: *Water applied* and *Water consumed* side by side with the return share between; each lever names
   its gauge (`basis`); the regime label on applications.
10. **Sealed postcards** for Compute and Code in a Ministry (`sealed`); the "Preview" label before office as M4.
11. **The Treaty**: an Articles tab beside the Hindsight shop; Precedent if now; playbooks learnt shown on Pryce's panel.
12. **Folding**: the order book and the folded Pryce panel must keep the late-Ministry scroll height ≤ the M4 late-Act-I
    baseline (criterion 25).
13. **Unknown kinds**: a default label for an unknown `ResponseKind` and `ReckoningCause` (M6 and M7 add some).

## Done means

Every item above on the real page; `tools/shot.mjs m5` and `m5real` clear at 390 × 844 (Take office from
`fixtures/m5/office-offer.json`; the first election inside four minutes; an inspection finding; a loophole opened and
amended from `ministry1-min20.json`; Plenty's gauges from `ministry3-plenty.json`; Opposition); `tools/perf.mjs --check`
passes at fresh, mid, late, act1 and the new `ministry` state; `bun run build.ts --check` passes.

## Verified by

The shots above (look at the phone screenshots yourself, not only the checks); perf and build budgets; a keyboard and
screen-reader pass on the new controls; `bun test` (UI unit tests if any) green.
