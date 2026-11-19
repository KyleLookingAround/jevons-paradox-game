# QA report: M2 played for real

19 Nov 2026. Independent QA of the live build at https://kylelookingaround.github.io/jevons-paradox-game/ (commit
`cf54b67` on `main`). Played through the page only, at 390×844 with touch emulation and a 4× CPU throttle, with a shorter
pass at 1280×800. The live bundle was `app.js?v=39a968zr` at the start and at the end of the session. Scripts, logs and screenshots: `design/scratch/qa/` (gitignored).

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

**Count: 0 blocker · 8 major · 20 minor · 12 polish (40).** Nothing stopped play; no console error or warning was
raised by the game in any session (the only console lines were the blocked font requests I caused on purpose).

| Severity | Bugs |
|---|---|
| Blocker | none |
| Major | B1 clear-skies dead end · B2 line falls to nothing ("25.8B%") · B4 shareable picture says coal ×6 · B6 a held line cannot be left · B7 run 2 opens as run 1 · B17 restraint austerity spiral (no full decade, no Steady State in reach) · B19 landscape unplayable · B20 two tabs lose progress |
| Minor | B3 calendar (1870 jump, 2109, repeated decade labels) · B5 "backfire" under a held cap · B8 dead late run 1 · B9 repeated crisis headline · B10 Jevons in 1813 · B13 pace buttons under the dock · B21 storage-blocked silence · B22 toasts over the menu · B23 back button · B24 no offline reload · B27 replay picks the tab on screen · B28 "Decades in budget —" · B30 Know-how spoilers · B31 Market stays off · B32 silent lever lapse · B33 one renderer death · B34 away ledger returns · B35 boom time away lost · B36 summary lost on reload · B39 "machines are rebuilt" |
| Polish | B11 "1 actions" · B12 "0.1/sin" · B14 pace blurbs · B15 tab truncation · B16 "−0.00" · B18 Commons dividend in run 2 · B25 320 px truncations · B26 sound off suspends · B29 "points on your cut" · B37 dial label · B38 sheet gap · B40 wording |

Detail follows in the order found (numbers are stable references). Screenshot paths are under
`design/scratch/qa/shots/`; logs are `design/scratch/qa/run.log`, `run2.out`, `run3.out`, `run3b.out`.

### Found in runs 1–2 (draft)

- **B1. Clear skies never count while wellbeing is below target, and the page does not say why.** Run 2, Firm line
  drawn at 5 min, cap enacted at 13.5 min. From 45 min the budget panel reads "Clear skies: smoke 1%, under the clear
  level of 2% and not rising" directly above "Clear skies: 0 of 50 years to Steady State", and stays at 0 for the rest
  of the run (`clearYears` 0 while `clear` true for 20+ minutes). The cause is the target-wellbeing rule (W 11–19
  against 34), which no line on the panel mentions. Expected: the streak line names what is missing ("needs wellbeing
  34; now 12"). Shots: `boom-peek2-budget.png` (peek2), `boom-r2-t050m.png`. Area: UI (budget panel).
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

### Found in settings, edge cases and run 3 (draft)

- **B19. Landscape on a phone is unplayable.** 844×390: the pinned cockpit is 302 px of the 390 px height and the Sell
  dock takes the rest; no part of the feed (cards, scene, levers) is visible at all. Shot: `edge-landscape.png`.
  Area: UI (cockpit should unpin or compress when `innerHeight` is small).
- **B20. Two tabs on one save silently lose progress.** Two tabs open, 50 sales in tab 1, then 12 s: tab 1 shows 301
  sales, tab 2 251, and the stored save holds 251 (tab 2's autosave overwrote tab 1). No warning in either tab.
  Area: UI (game.ts save; a `storage` event or a lock would catch it).
- **B21. With storage blocked the game runs but never says nothing is being kept.** `localStorage` throwing: the game
  boots and plays (good), but the menu's save panel shows the ordinary "Not exported yet … the browser may clear the
  save if space runs short", so the player learns of it only by losing the run. Shot: `edge-nostorage-menu.png`.
  Area: UI (store.ts).
- **B22. A toast covers the menu button.** After "Load pasted save" the "Save loaded." toast sits over the header; a tap
  on the menu button lands on the toast and the menu does not open (it cost me a failed hard-reset step). Same with the
  long "Light, 1870–1950 … Go there" toast, which hides Mandate and wellbeing. Shots: `settings-erase-confirm.png`,
  `boom-r2-0605-OPENED.png`. Area: UI (toasts).
- **B23. The back button leaves the game instead of closing a sheet.** Menu open, browser back: the page navigates
  away (here to the previous history entry). Android players expect back to close the sheet. Area: UI.
- **B24. No offline reload.** After first load, offline: the open page keeps playing (good); a reload fails with the
  browser's offline page (no service worker). Known (audit rec. 19); listed for completeness.
- **B25. 320 px truncations.** "not yet underst…", "People ×1.00 · −0.1% a y…", "Light 0 of 2 · 1 more Reckonin›".
  Shot: `edge-w320.png`. Area: UI.
- **B26. Turning sound off suspends the AudioContext rather than closing it.** Verified: no context before sound is
  switched on (also none after five taps, and none after a reload with sound saved on until the first tap); on: one
  context, `running`; page hidden: `suspended`; visible plus a tap: `running`; off: `suspended` (still exists). No
  errors. If "torn down" is the intent, it is not closed. Area: audio/UI (sound.ts).
- **B27. The run-2 time-lapse showed Light, not Steam.** Run 2's whole story (a Firm line, 14 decades in Steam) ended
  with the summary replaying Light, 1870–1926, because Light happened to be the tab on screen. Area: UI (timelapse
  picks the current tab).
- **B28. "Decades in budget —" in the Hindsight terms beside "14 decades in budget".** All 14 were lean, which pays no
  Hindsight; the two lines on one summary read as a contradiction. Area: UI (say "14, all lean: none pay Hindsight").
- **B29. Charter wording: "−1 points on your cut"** (The Saturday Half-Holiday). Area: content.
- **B30. Know-how for Industries not yet seen.** The run-1 shop lists "Computer science department (… per PFLOP)",
  "Prompt bootcamps (… per feature)", "Automotive engineering school" in 1780: spoilers and noise for a new player.
  Area: UI/content.
- **B31. The Market stays off in the next run once switched off.** Switched off at 15 min in run 2; run 3 began with
  `orders.market.on` false. Possibly intended (a standing order), but DESIGN says "on by default" and nothing on the
  between-runs screen says so. Area: core/UI.
- **B32. A lever in force lapses mid-run for want of Mandate and the cap lets go at once.** Run 3: Smoke abatement
  enacted at 22 min took Steam from R 350 to 17.5; 50 s later, Mandate at 2–16, Steam was back at 484 and then 824 with a
  crisis. Area: balance/UI (a warning before lapse).
- **B33. The renderer died once in a long session.** Run 3, 26 min of game time (several hundred tab switches and
  ~10 Commons taps in): "Target page, context or browser has been closed" with no pageerror logged. Not reproduced;
  may be the container. Area: unknown.
- **B34. The "While you were away" ledger comes back after Carry on when the catch-up was held by exhaustion.** Boom
  run at 22 min (coal 45% left), tab closed 2 h: the ledger correctly says "26m 34s of 2h 00m counted / The board
  waited for you: coal at 0.2% left. The other 1h 33m were not played." Tap Carry on, reload: the same ledger is shown
  again; reopen 9 h later: the same 2-hour ledger again, above the forced Reckoning. (A held restraint run's ledger
  did not come back.) Shots: `boomaway-away-m120.png`, `boomaway-away-m540.png`. Area: UI (away.ts dismissal key).
- **B35. Time away in a boom run is mostly thrown away.** Same case: 1 h 33 m of the 2 h "were not played", and then
  the run is over the moment the player returns. Honest, and listed in CLAUDE.md as a known gap (banked time); recorded
  because it is the second thing a returning player sees.
- **B36. Closing or reloading on the run summary loses the replay and "Save picture" for good.** After a Reckoning,
  a reopened page goes straight to the between-runs shop (correct for the run's freshness), but the summary, its
  time-lapse and its picture buttons are never offered again. Verified after runs 1 and 3. Area: UI.
- **B37. The "EFFICIENCY" label is crossed by the dial's arc** on every phone screen (390 px, first screen onwards).
  Shot: `boom-000-first-screen.png`. Area: UI (gauges).
- **B38. The pending-Reckoning sheet opens with an empty band of ~40 px** between its title and the Special edition.
  Shot: `boom-pending.png`. Area: UI.
- **B39. "The machines are rebuilt. See them"** toast, stacked under "Within reach: Electric trams" at 22 min of run 3
  (tab switch to Light): no context for what was rebuilt or why. Shot: `boom-r3-1317-OPENED.png`. Area: UI/content.
- **B40. Wording:** "Population grows −8% as fast, per level" (Elementary schooling; also "−4% as fast",
  "−6% as fast" in dividends); the Motion sparkline legend is cut to "··· the" at 390 px. Area: content/UI.

## Pacing

All figures are **game time**, which equals active play time: they come from **real ticking, compressed**
(`clock.fastForward` ≤ 4 s per frame, every tick a normal `model.tick(0.1)`), with a scripted player acting between
steps. Only the "away" rows use the offline path. The player in run 1 tapped Sell 3×/s for 3 minutes, then about
every 2 s until the reveal, and bought whatever the affordable chip pointed at, the moment it did; a person will be
slower to notice things and faster to think, so treat these as a lower bound on time and an upper bound on purchases.

| Milestone | Target (genre audit / M2) | Measured | Run, source |
|---|---|---|---|
| First purchase | 15–40 s | **0:32** Better boilers | run 1, real ticking |
| First anomaly (efficiency raises use) | ≤ 1:00 | **0:32**: R 17.4 → 19.1 t/s at once; headline "Engines use half the coal; the nation burns twice as much" | run 1 |
| First new verb (found a use) | 1–2 min | **1:40** Cotton mills | run 1 |
| Purchases in first 10 min | ≥ 12 | **14** (8 of them levels of "Another engine works") | run 1 |
| Longest gap, first 15 min | ≤ 90 s | **81 s** (6:29–7:50) | run 1 |
| The big promise (condenser) | 4–6 min | **7:50**; R 58 → 133 (×2.3) within 26 s once Winding engines were founded | run 1 |
| The reveal | 8–12 min | **11:07** (The Coal Question bought as soon as affordable) | run 1 |
| First Mandate spend | 10–14 min | **never** in a boom run 1; 9:44 into run 2 (restraint) | runs 1, 2 |
| First crisis | 14–20 min | **18:16** The Black Fog | run 1 |
| Longest gap, whole run 1 | ≤ 3 min | **211 s** (30:34–34:05) | run 1 |
| Run 1 ends | 30–45 min | **38:20**, exhaustion, Hindsight 88 | run 1 |
| Run 2: anything new in 5 min | yes | Charter, run line, projections, Mandate shown, Market panel; the **same six purchases at the same times** as run 1 | run 2 |
| Market visibly buys | run 2 | yes: 1 buy in the first 5 min while I bought actively; 6+ (Boulton & Watt, double-acting, engine reports, high-pressure, two Light cards) once I stopped buying efficiency | run 2 |
| Second Industry (Light) | ≤ 1.5 h | **10:05 into run 2 (48 min in all)**, founded by the Market | run 2 |
| First decade within budget | 18–25 min (run 1, `budget`) | **16:57 into run 2** (line at 5:07, cap at 13:34); about 55 min in all. Not attempted in run 1 | run 2 |
| Decision cadence while holding a line | ≤ 3 min (hour 1), ≤ 5 min | a dividend every **3.3 min**, a lever every ~10 min; longest stretch without a purchase **23 min** | run 2 |
| Full (not lean) decade | — | **none in 14** | run 2 |
| Clear skies | — | reached at ~45 min of run 2; **0 years counted** (wellbeing below target) | run 2 |
| Third Industry (Motion) | M4 moves it later | **21:57 into run 3 (about 2 h 05 m in all)** | run 3 |
| The Commons | run 3 | open at the start of run 3; first project built 23:54 | run 3 |
| First Steady State | 3–4 h | **not reached** (see B1, B17) | — |
| First Settlement | 4–6 h | **not reached** | — |
| Restraint vs backfire Hindsight | backfire ≥ 1.2× in runs 1–2 | run 1 boom 88 H in 38 min (2.3/min); run 2 restraint 76 H in 66 min (1.15/min): 2.0× | runs 1, 2 |
| Away 10 min / 2 h / 9 h, boom | never ends a run | ok / **held by exhaustion at 26 min** (1 h 33 m unplayed) / run then ends on return | offline path |
| Away 10 min / 2 h / 9 h, held line | never ends a run | line broke in 10 min / levers lapsed / 8 h cap; Light 76% → 8% | offline path |

Feel, measured at a 4× CPU throttle in real time (390×844, then 1280×800):

| Action | Measured |
|---|---|
| Sell, tap to next paint | 40–73 ms (desk 33–79 ms); 20 fast taps: 20 sales registered |
| Hold Buy on a repeatable (touch, 1.6 s) | 6 levels bought; works |
| Double tap on Buy | one purchase (correct) |
| Tab switch Steam ↔ Light | 140–570 ms (first visit to Light 552–569 ms) |
| Open menu | 305–362 ms to paint (handler 178–199 ms) |
| Open a formula sheet | 108–131 ms |
| Scroll the feed | p50 16 ms, p95 22–25 ms, max 59–77 ms |
| Ticking idle 6 s | p50 16 ms, p95 26–31 ms, one frame of 134 ms |
| Long tasks > 100 ms | 8 in ~30 s of interaction, the worst 200–217 ms |
| DOM nodes | about 4,070 with two Industries |

## Not reached or not verified

- **Steady State and Settlement**: not reached in three runs (about 3 h 05 m of game time in all). The one restraint
  run hit B1/B17; the mixed run 3 drew its lines at minute 0 and never held them. So the Settle ceremony, the settled
  row, the settled scene and the Steady State win card were not seen in the real game.
- **A full (not lean) decade**, the sky-clearing state counting years, and the "first Steady State" seat.
- **The Civil Service and Treasury orders** (need Institutions I did not buy); the Market's "scaffolding that builds
  itself" in the scene was not singled out in a screenshot.
- **Compute and Code**: locked in run 3 ("Compute 1 …"); only the tab chip was seen.
- **Sound itself**: I cannot hear. Verified only the lifecycle (B26) and that nothing threw. Per-Industry sound on tab
  switch was not checked beyond Steam.
- **Reload mid-dividend**: not exercised (dividends live in `GameState.pendingDividends`, so they should survive);
  reload mid-sheet (the shop) and mid-summary (B36) were.
- **Real devices**: Chromium only, emulated touch and a CPU throttle; no Safari, Firefox, iOS storage eviction, Home
  Screen install, real thumbs, or real phone heat and battery.
- **Accelerated time**: purchases happened between 1–4 s steps, so reaction-time effects (a player missing a staked
  site for a minute) are not in the figures. Everything in the pacing table except the away rows is real ticking.
- **Memory over hours**: a 16-minute ticking soak with tab switches stayed at 6.8–7.8 MB of JS heap and ~7,500 nodes;
  `performance.memory` is unavailable in this Chromium, so the earlier figures use CDP. A multi-hour real-time soak was
  not run.
- **The Household Survey's counts**: the key is created, deleted when switched off, and restarted empty when switched
  on (verified); whether `activeSec` counts correctly could not be judged under a fake clock (it read 0).
- **Hard reset** leaves `rebound.ui.lapse` (the time-lapse frames) and the survey in storage; whether old frames can
  reach the next summary was not tested.

## A player's review

As a veteran incremental player, three runs and about three hours of game time in.

**The first twenty minutes are very good.** The page looks like nothing else in the genre: an engraved valley that
fills with mills and winding gear as I buy, a broadsheet with real jokes in it, two gauges at the top. The joke lands
at 0:32: I bought "Better boilers (−33%)" and the Gazette said "Engines use half the coal; the nation burns twice as
much" while the consumption needle went the wrong way. Cotton mills at 1:40 and the condenser at 7:50 repeat it with
more force (coal ×2.3 inside half a minute). The Coal Question at 11 minutes is a proper reveal: the third dial wakes
at 401% "▲ backfire", Mandate appears, cards gain "This decade: ▲ more coal". The Black Fog at 18 minutes greys the
picture and the headline is the best line in the game ("lamps lit at noon, and nobody can see them"). The time-lapse at
the Reckoning, replaying 115 years of the valley filling up while the two lines climb, is the moment I would show a
friend. Then the saved picture captions it "Coal ×1.0 → ×6.0" (B4) and the friend thinks efficiency won.

**Run 1's last ten minutes are empty.** From about 28 minutes there is nothing to buy that I want, £66k and 1,588
Mandate pile up, and I wait for the pits to run dry. A boom player is never told that the levers are for him too.

**Run 2 is run 1 again for five minutes.** Same purchases, same seconds. The Charter is a nice touch on paper ("Under
the Northern Coalfield") but it changes nothing I can feel. What does change: projections on every card from the
start, and the Market, which really does buy (it even opened Light for me at 10 minutes, which felt like a gift). Light
is gorgeous: a dusk town by gaslight, a different paper, a different typeface, a sold "SELL LIGHT" button.

**Restraint is a chore in M2, and worse, it feels like being punished.** I drew a Firm line, enacted a cap, and my
wellbeing halved at once (38.8 → 19) and then slid for an hour to 10.7 as the line kept falling. Every decade paid a
dividend card (good, a decision every 3.3 minutes), but all 14 were "lean", so none paid Hindsight; the sky cleared and
the panel told me "Clear skies: 0 of 50 years" without telling me why; the rebound dial stayed red, "▲ backfire", beside
"✓ Within budget". The restraint run earned half the Hindsight per minute of the boom run (by design in runs 1–2, but
nothing tells me that is temporary). If I close the tab the line breaks within ten minutes and the levers lapse. Left
for a night, the line fell to nothing and the header read "Over budget by 25.8B%" in the Coal Age year 2109. A player
who tries the "right" thing in run 2 is taught that it is joyless, which is the risk the genre audit named.

**After the reveal there is a game, but not yet the one promised.** The Commons in run 3 are a genuine new sink with
real choices, and opening Motion at two hours (a bright 1960s travel poster) was a lift. But Steady State and
Settlement stayed out of reach for me, so I never saw restraint pay off.

**Would I come back tomorrow?** For the art, the writing and the next Industry, yes. For the restraint loop as it
stands, no. Fix the wellbeing spiral and say on the panel what a decade or a clear-sky year still needs, and the second
half of the thesis will have a game to stand on.

Most worth fixing before M3: (1) restraint that does not crush wellbeing, with the panel naming what is missing (B1,
B17, B2); (2) a run 2 that differs in its first minutes (B7) and a run-1 tail with decisions in it (B8); (3) the phone
basics: landscape (B19), two tabs (B20), and the shareable picture (B4).
