# QA report: M2 played for real

19 Nov 2026. Independent QA of the live build at https://kylelookingaround.github.io/jevons-paradox-game/ (commit
`cf54b67` on `main`). Played through the page only, at 390×844 with touch emulation and a 4× CPU throttle, with a shorter
pass at 1280×800. Scripts, logs and screenshots: `design/scratch/qa/` (gitignored).

*Work in progress: written as I go.*

## How time was accelerated

Playwright's `context.clock.install({ time })` replaces `Date`, `performance.now`, timers and `requestAnimationFrame` in
the page. The page's loop (`src/ui/game.ts`) ticks the model once per 0.1 s of elapsed frame time, and sends any frame
gap over 5 s through `fastForward` (the offline path). So:

- **"Real ticking, compressed"**: `page.clock.fastForward(1000–4000 ms)` per step, with taps between steps. Each step
  fires one animation frame whose elapsed time is 1–4 s, which the loop spends as 10–40 ordinary `model.tick(0.1)` calls.
  This is identical to active play except that the player can only act between steps (every 1 s of game time for the
  first 5 minutes, 2 s to 15 minutes, 4 s after). About 80× faster than real time at a 4× throttle.
- **"Closed tab"**: a persistent browser profile is closed (pagehide saves and stamps the time) and reopened with the
  clock installed N hours later, so the page's own offline catch-up runs.
- Nothing was bought, raised or changed through `window.rebound`; it was only read.

## Bugs

Being filled in as found; final severity order at the end. Screenshot paths are under `design/scratch/qa/shots/`.

### Found in runs 1–2 (draft)

- **B1. Clear skies never count while wellbeing is below target, and the page does not say why.** Run 2, Firm line
  drawn at 5 min, cap enacted at 13.5 min. From 45 min the budget panel reads "Clear skies: smoke 1%, under the clear
  level of 2% and not rising" directly above "Clear skies: 0 of 50 years to Steady State", and stays at 0 for the rest
  of the run (`clearYears` 0 while `clear` true for 20+ minutes). The cause is the target-wellbeing rule (W 11–19
  against 34), which no line on the panel mentions. Expected: the streak line names what is missing ("needs wellbeing
  34; now 12"). Shots: `boom-peak2-budget.png` (peek2), `boom-r2-t050m.png`. Area: UI (budget panel).
- **B2. The budget line falls to nothing; "Over budget by 25.8B%".** Same held run, closed for 9 h: the line kept
  declining 10% a model decade with no floor through ~1,400 model years, to ~0 t/s, and the pinned header reads
  "▲ Over budget by 25.8B%". Expected: a floor (DESIGN.md: `max(floor·r0, …)`), and a sane figure. Shot:
  `hold-away-m540.png`. Area: content (`steady` has no floor) / core; UI formatting.
- **B3. The calendar runs on to 2109 in the Coal Age.** Same shot: "COAL AGE 2109". Opening Light at 10 min in run 2
  also jumped the year 1810 → 1870, so Steam's own headlines and decade ledger are dated 60 years late, and after 1914
  the calendar crawls (`CALENDAR_LATE_RATE`), so the decade ledger reads "1910s ✓ lean" six times and "1920s ✓ lean"
  six times. Shots: `boom-r2-0605-OPENED.png`, `hold-away-m540.png`; text in `run2.out`. Area: core (calendar) / UI
  (ledger labels).
- **B4. The shareable picture undersells the run: "Coal ×1.0 → ×6.0".** Run 1 ended by exhaustion; the summary says
  "Peak coal use ×46.4", but the time-lapse's last frame and both saved pictures print "Efficiency ×1.0 → ×20.4 · Coal
  ×1.0 → ×6.0" (use at the moment the pits ran dry). On the one artefact meant to be shared, efficiency appears to have
  won. Expected: peak, or "peak ×46.4, at the end ×6.0". Shots: `boom-rk1-Save_*.png`. Area: UI (timelapse.ts).
- **B5. The rebound meter reads "▲ backfire" in red while a cap holds the line.** Run 2 from the cap onwards: 100–114%
  "backfire", red, beside "✓ Within budget". The small print explains it ("The cap sets the coal; the savings became
  service") but the instrument scolds the restraint player for doing the right thing. Shot: `boom-r2-t050m.png`. Area:
  UI (gauges).
- **B6. Away from a held restraint run, the line breaks within minutes and levers lapse.** Run 2 copy, Firm line held
  (14 decades). Closed 10 min: "Steam: the line broke", Mandate −206 (upkeep). 2 h: "Lapsed for want of Mandate: Smoke
  abatement (2 steps), Coal duty". 9 h: Light (never touched, no line) went from 76% to 8% of its reserve; returning
  player faces a forced Reckoning within the hour. Nothing ended unseen, as promised, but a restraint player cannot
  leave at all without losing the streak. Shots: `hold-away-m10.png`, `hold-away-m120.png`, `hold-away-m540.png`.
  Area: content/balance (Civil Service is the planned answer; until then the ledger could warn before leaving).
- **B7. Run 2's first five minutes are run 1's.** With Apprenticeships, The Cornish school, Seed capital, two
  Institutions and the Northern Coalfield Charter: Better boilers at 0:30 (run 1: 0:32), Cotton mills at 1:40 (1:40),
  the same six purchases in the same order. The Market made one purchase in that time (I had bought everything first).
  New in the first five minutes: the run line, Mandate on show, projections on cards, the Market panel. Area: balance.
- **B8. Late run 1 is dead air.** Boom play from 28 min to exhaustion at 38 min: three purchases, a 211 s gap
  (30:34–34:05), capital piling to £66k and Mandate to 1,588 with nothing on screen to spend either on for a player who
  has not been told levers are for him. Area: balance/content.
- **B9. Two different crises print the same headline.** Run 1 crises 2 and 3 (1854, 1862): "Infirmaries full;
  physicians blame the smoke, owners the weather" both times. Area: content (news).
- **B10. Jevons is quoted in 1813.** The Coal Question bought at 11:07 in run 1, game year 1813; the Gazette prints
  "Economy of fuel “a confusion of ideas”, writes Mr Jevons" and the card says 1865. Area: content.
- **B11. "1 actions by standing orders this run".** Orders panel, run 2. Area: UI (plural).
- **B12. "upkeep 0.1/sin the picture ↑".** Lever "In force" line: no space between the upkeep and the "in the picture"
  link. Area: UI (panels.ts).
- **B13. The pace confirm row sits under the Sell dock.** Tapping "Draw the line" opens the pace cards; "Draw at
  Gentle" / "Not now" are half under the pinned Sell button until the player scrolls. Shot: `boom-r2-pace-steam.png`.
  Area: UI.
- **B14. Pace blurbs repeat the number** ("10% a decade · dividend ×1.6 / 10 per cent a decade."), against the style
  guide. Same shot. Area: content.
- **B15. Tab chip truncated:** "Motion 3 of 3 · 1 more Recko›" at 390 px once Light is open. Shot: `boom-r2-t050m.png`.
  Area: UI.
- **B16. "People −0.00" in the away ledger** after a 2-minute gap. Shot: `probe-after.png`. Area: UI (fmt).
- **B17. Restraint austerity spiral.** With a Firm line and the cap following it down, wellbeing fell from 38.8 (before
  the cap) to 19 at once and then steadily to 10.7 (drawn level 10.4) over 50 minutes; every one of 14 decades was
  "lean", none "full", so no decade paid Hindsight, and Hindsight on offer at 65 min was 76 against run 1's 88 at 38
  min. The decision cadence is a dividend every ~3.3 min and a lever every ~10 min; capital (£72k) has no use.
  Area: balance.
- **B18. The Commons dividend is offered in run 2** ("Endow the Commons … Of no use until the town has any"); the
  Commons open in run 3. Area: content.

## Pacing

## Not reached or not verified

## A player's review
