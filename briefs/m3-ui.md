# Brief: M3 UI lane

You bring the page of "Rebound" up to the M3 contract: the four mechanic widgets, the "bites back" line, the dispatch
panel, timed modifiers, the History picker, the Archive viewer, the household return filer with the second twin gauges
and the survey switch, closing/opening labels, the Market's idle reasons, the credits card and the retrospective
Gazette, and banked time if content turns it on. Other lanes work from the same contract and do not talk to you: core,
three content lanes, scene (`src/ui/scene/**`), audio (`src/ui/audio/**`); balance comes after.

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`.

## Standing instructions

- You will be interrupted by container restarts and usage limits. Keep a progress note at
  `design/scratch/m3-ui-progress.md`, update it after each piece, and land one verified piece at a time (builds,
  typechecks, looked at in the browser with `tools/shot.mjs`).
- Make no git writes; the coordinator commits.
- Run `tools/shot.mjs` modes one at a time (never `all`: it has run the container out of memory).

## Read first, in full

1. `src/types.ts` (search "M3"): every view you render is typed there — `SectorDerived.seams/load/travel/free/upkeep`,
   `LeverView.bite/forbidden`, `UpgradeView.forbidden`, `AppDerived.priceSeen`, `Derived.dispatch/modifiers/history/
   survey/bank/ending/archive`, `OrdersView.marketWhy/dispatch/kind`, `HistoryView`, `ArchiveView`, `RetroItem`,
   `HouseholdFigures`, `PlayReturn`, the new ModelApi methods and event kinds.
2. `design/m3-contract-notes.md` §0 (the unfolding and feature gating: the UI hides locked systems entirely), §5.
3. `CLAUDE.md` (UI rules: no game rules; build structure once per layout change, patch in place, never rebuild per tick).
4. Shift 3 in `design/paradigm-shifts.md`; `design/visual-direction.md` items 2, 3, 4, 6; the M2 UI report's
   performance targets (header of `tools/perf.mjs`).
5. `src/ui/playledger.ts` (you own it) and the rest of `src/ui/*.ts`.

## Your files (only these)

`src/ui/*.ts` outside `scene/` and `audio/`, `src/main.ts`, `src/styles.css`, `index.html`, `tools/shot.mjs`,
`tools/perf.mjs`. You alone own `src/ui/app.ts` (the page registry) this milestone. New panels go in new files
(`src/ui/dispatch.ts`, `history.ts`, `archive.ts`, `survey.ts`, `mechanics.ts`, `ending.ts`).

## Feature gating

Every M3 system is hidden entirely until its feature is on (`Derived.features[id]` from M2.1; if M2.1 has not landed,
treat all as on behind one helper you can switch). When a feature first unlocks, its system appears with the one-line
paper introduction content provides (M2.1's intro), never a tutorial overlay. Follow the reorganised Hindsight shop:
what the player can act on first; completed things (cleared Histories, read Archive notes) compact and out of the way.

## Work

1. **Mechanic widgets** (one per Industry, under the twin gauges, heading `SectorDef.mechanic.name`):
   - Steam, the seam ladder: a cut-away column of `SeamsView.ladder` (sunk, reachable, locked), the next seam's cost and
     "Sink" (calls `sinkSeam`), the current price multiplier; the reachability as "reachable below £x per hp".
   - Light, the load curve: 24 bars of `LoadView.hours` against the peak; the load factor; "idle plant" share; capCost
     base vs effective in the formula sheet.
   - Motion, the travel-time dial: `hoursPerHead` as "1 h 04 min a day" on a dial that barely moves while miles grow;
     speed and congestion; the sprawl stock as a figure and its share.
   - Compute, the "free" tag: on each application whose `priceSeen` < servicePrice, a FREE (or the flat price) tag, and
     "the bill: £x/s paid elsewhere" (`free.bill`).
   - Code: `upkeep.share` as "x% of attention keeps the code alive", deletion against inflow.
2. **Levers**: the "bites back" line (`LeverView.bite`: a small meter, the blurb, "unless …" with a tick when the pairing
   holds); forbidden levers and cards greyed with the reason. 'measure' levers render like any lever.
3. **The dispatch panel**: the pending letter as a broadsheet item (headline, the cast member's name and role, body),
   two or three arms with outcome, price and resolved costs, unaffordable arms disabled, the default marked, a quiet
   countdown ("lapses in 3 min" — no alarm), `answerDispatch` on tap. It never blocks play, never modal, never a badge
   that nags; at most a dot on the paper. Modifiers in force: a slim list with time left.
4. **The History picker** on the Reckoning screen beside the Charter choice (`historyViews`, `chooseHistory`): offered
   ones first, cleared ones collapsed with their best time; the goal and the rebound named; rewards as options.
5. **The Archive viewer** (statistics or a tab): unlocked notes by Industry, sources printed; locked ones as greyed
   titles only; a quiet "new" mark from 'archiveUnlocked' events.
6. **Shift 3.**
   - Extend the play ledger to record the "before" totals at the moment the Market first becomes available (a snapshot
     of activeSec, sessions, looks, decisions, days), and `quietDays`; compute `HouseholdFigures` exactly as their doc
     says. Never put the ledger in the save or an export (unless the player ticks the export box, as M2 planned).
   - The return filer (feature `survey`): a plain "File the household return" control in the statistics sheet showing
     the figures to be filed, calling `fileReturn` (once per run accepted; say so).
   - The pamphlet (Content.proprietor.pamphlet) as a broadsheet item when the card first becomes visible.
   - After the reveal (`meta.flags.proprietor`): the second pair of twin gauges ("Decisions automated" against "The
     proprietor's decisions per hour", from `Derived.survey`), the published return text, and the closing/opening label
     on each order (`OrdersView.kind`), with an estimate line from the ledger ("Saves about 30 decisions a session").
   - "Close the Household Survey": the switch deletes the ledger (as now) AND calls `withdrawReturn('household')` if a
     return is on file.
7. **Orders panel**: the Market's reason per Industry from `OrdersView.marketWhy` ("Waiting: the best card pays back in
   6 min, over your 2 min"); the dispatch order (cast switches) when available.
8. **The ending**: on the 'ending' event, the credits card (Content.ending.credits), then the retrospective Gazette
   (`retrospective()`), "The ledger continues" returns to play; both re-openable from statistics afterwards.
9. **Events**: 'seamSunk', 'biteBack', 'dispatchArrived', 'dispatchAnswered', 'historyCleared', 'returnPublished',
   'ending' to the scene and audio through the existing event path (SceneView.events; Soundscape.event with the new
   kinds the audio lane adds); 'stageReached' now carries `label` (show the machine's name).
10. **Bank** (only if content enables it): "Banked: 2 h 10 min" and a 2× control that calls `useBank` in small slices
    beside tick.
11. **Mocks**: bring `devmock.ts` and `game.ts` to M3 types.

## Scripted checks (`tools/shot.mjs`, new mode `m3`; Playwright, 390 × 844)

- Each mechanic widget renders with real content (a save fixture per Industry); screenshots in `design/scratch/`.
- A dispatch arrives, is answered, and its modifier shows; another lapses to its default.
- File a fixture household return; the card appears; buy it; the return is printed and the second gauges appear; the
  settings switch deletes the ledger key and withdraws the return (the save no longer holds figures).
- A fixture save at the brink of the win: the credits card and the retrospective appear once.
- Nothing M3 is visible in a fresh game before its feature (a fresh-game screenshot matches M2.1's).

## Performance (must not regress)

p95 frame ≤ 20 ms at 4× throttle in fresh and mid-game states, tap-to-paint under 100 ms, no long task over 50 ms in
ordinary play (`tools/perf.mjs`). Build each widget once per layout change and patch numbers in place; the load curve's
24 bars update by attribute; the dispatch panel builds on arrival only.

## Exit criteria (yours)

- Every view above rendered from Derived and the views, no rule recomputed in the UI; the scripted checks pass; the
  performance targets hold.
- Does not crowd the unfolding: nothing appears before its feature; each new system enters with one line, and the
  fresh-game and run-2 screens are no busier than M2.1's.

## Final report (concise)

What you built, panel by panel; screenshots' paths; perf numbers before and after; contract gaps and workarounds.
