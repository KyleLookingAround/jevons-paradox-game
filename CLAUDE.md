# Rebound

An incremental game about Jevons paradox: every efficiency upgrade makes the world burn more, and the game is
learning why, then learning what actually works. Served by GitHub Pages from `main` (Actions build).

Read before changing anything: `DESIGN.md` (the game), `src/types.ts` (the contract), and
`docs/adr/ADR-2026-11-18-bun-built-static-site-with-pure-core.md` (the architecture).

## Commands

- `bun run build.ts` — build to `dist/`: hashed main script and stylesheet, lazy parts (`text`, `scene`, `audio`, `archive`),
  `sw.js`, the manifest, `build.json` (`--single` for one inlined file; `--check` fails over the size budgets, as CI
  does; `REBOUND_SW=off` emits the service worker's kill switch). See `docs/adr/ADR-2026-11-19-split-build-lazy-parts-service-worker.md`
  and, for the content's late text, `docs/adr/ADR-2026-11-20-late-content-text.md`.
- `node tools/perf.mjs [fresh,mid,late] [4,6] [--tabs] [--soak=N]` — the real page's performance at 390×844 with CPU
  throttled; `--check` runs the budgets (exit 1 if one fails); `--load` times a cold and a warm load over slow 4G;
  `--dist=DIR` measures another build. Copy `dist/` elsewhere first if you will build while it runs.
- `bun test` — tests
- `tsc -p .` (or `bunx tsc -p .`) — typecheck
- `bun run tools/balance.ts <strategy> [runs]` — headless balancer (`--summary` for one line per run)

Bun is the whole toolchain; there are no runtime dependencies. Keep it that way unless an ADR says otherwise.

## Rules

- `src/types.ts` is the contract between the simulation, the content and the UI. Change it deliberately, in its own commit.
- The simulation is pure: no DOM, no `Date.now()`, no `Math.random()`, never mutate the state passed in.
- Content is data. Balancing changes numbers in content, not logic in the core.
- The UI holds no game rules. It reads `derive()`, calls the model API, and patches the DOM in place (build structure
  once per layout change; never rebuild per tick).
- British English, dry broadsheet tone. The game never lectures.
- Words: the unit of play is a `Sector` in code and an "Industry" on screen; the period is an "Age". Player-facing text
  never says "sector" or "era" for the unit.

## Status (20 Nov 2026)

M1 to M4 are built and live on `main` (M3 and M4 paragraphs below). Seven Industries: the Coal Age's four are Act I, the later three open after its ending as Previews; honest rebound instruments; budget lines
with paces, decades judged from the day drawn (lean or full), clear skies and Steady State; decade dividends; Settlement;
the Commons; standing orders (the Market from run 2); Charters; an offline hold with Hindsight entered at a reduced rate;
Know-how respec; a living illustrated scene per Industry in its Age's art style, one country throughout; generated sound
(off by default); a time-lapse of the run at each Reckoning; save safety and settings.

| Piece | State |
|---|---|
| `src/types.ts` | M2 contract (save version 3). Decisions: `design/m1-contract-notes.md`, `design/m2-contract-notes.md`. |
| `src/core/` | All of `ModelApi` (`src/core/index.ts`; module map in `src/core/README.md`). `step.ts` is a shared hotspot: one owner per milestone, one line per mechanic. |
| `src/content/` | One module per Industry, plus ages, prestige, commons, charters, dividends, achievements, news (`src/content/README.md`). Lint: `src/content/content.test.ts`. House style: `design/style-guide.md`. |
| `src/balance.test.ts` | Pacing targets and exit criteria as tests (about 50 s). |
| `tools/balance.ts` | Headless balancer: `efficiency`, `budget`, `levers`, `forks`, `peakdraw`, `mixed`, `market`, `charter`, `idle`; `--summary`, `--fixture`, `--offline-check`. |
| `src/ui/` | The page. `src/ui/scene/` is the world scene engine and `src/ui/audio/` the sound engine (each with its own README or notes; both driven by the same `SceneView`). |
| `tools/shot.mjs`, `tools/perf.mjs` | Playwright screenshots and scripted flows; performance measurement. Run `shot.mjs` modes one at a time (`scenes`, `flow`, `checks`, `audit`, `m2`, `m3`, `real`, `realplay`, `looks`, `first`); `all` in one go has run the container out of memory. |
| Performance (perf pass 2) | Budgets: first paint ≤ 240 KB gz (`build.ts --check`, in CI); core per-call costs (`src/core/perf.budget.test.ts`, in `bun test`); frames, taps, tab switch, DOM, heap, load (`tools/perf.mjs --check`, by hand). Rules that keep it so: no per-frame `requestAnimationFrame` loop (the game loop is a 10 Hz timer: a rAF loop makes Blink restyle every animated element every vsync); no CSS animation or transition inside the scene's SVG (main thread, repaints the band); no custom property set on a scene root that many nodes inherit; never insert a `<style>` per update; bars and needles ease only for jumps (`dom.ts snapSmall`); lazy parts are self-contained and called through `src/ui/chunks.ts` handles; most content prose is the late `text` part (`src/content/textsplit.ts`): a part of the page that builds late words once must fill them in `onText()` or key on `textGen()` (`src/ui/text.ts`); only the scene's active world is in the document (kept worlds wait detached). |
| `design/` | `long-game.md` (four Ages, twelve Industries, three layers), `roadmap.md` (M3–M9), `paradigm-shifts.md`, `genre-audit.md`, `visual-direction.md`, `sound-direction.md`, `style-guide.md`, `research/` (sourced dossiers). |

The game is to be a very long one with a lot of content: three endings (about 15–17 h, 50 h and 100 h) and a post-game.
Each Act changes the player's role: industrialist, government, writer of the agents' objectives, the one who takes
things down. Owner decisions D2–D6 at the end of `design/roadmap.md` are open; until answered, work to the
recommendations given there.

Known gaps: only Chromium has been tested (no Safari, Firefox or real phone); nobody has listened to the sound; a Home
Screen install is unverified; in boom play most of a long absence is lost to the hold before a crisis (banked time is
planned); the restraint player has a stretch of about three minutes with nothing to decide late in runs 1–2 (M3's
dispatches address it); pacing figures come from scripted players, not people.

**M3 (merged to `main` 20 Nov 2026).** Every Industry its own mechanic (seams, load, travel, the free price, the code stock), each a temptation
whose trade is shown under a drawn line; levers that bite back; the cast and 62 letters; Histories; the Archive; the
household return and the Proprietor's Day; the first ending: every Industry settled at once for fifty years, with
Parliament holding three settlements until the Settlement Commission (Hindsight) makes room for five — measured at about
18–19 h for `mixed`/`budget` and 15 h for the human-like player (`design/unlock-schedule.md`). Contract at save version 4
(`design/m3-contract-notes.md`; the finishing additions are listed in the M3 finishing report and marked "M3 (finish)" in
`src/types.ts`). `bun test` ≈ 70 s; `BAL_LONG=1 bun test src/balance.test.ts` ≈ 3 min; `BAL_LONG=1 bun test
src/balance.long.test.ts` ≈ 5–20 min. Open: the letters do not yet reward the budget player's thoughtful answers over
the defaults (see `design/roadmap.md`, M3).

**M4, "The Survey" (merged to `main` 20 Nov 2026).** Every milestone from M4 on is a paradigm shift (table at the head
of `design/roadmap.md`; M7 is the prestige shift, "The Inheritance"). M4's: the gauges are estimates and the burn is
shared. Act I is the Coal Age's four Industries (Steam, Light, Iron & Steel, Fishing); Motion, Compute and Code are
Previews after the Act I ending, which leaves the Coal Age settled for good (the capstone, with arrears). Iron's order
book feeds other Industries (cheaper machines and wider demand: Steam's coal 1.25x with it) and budget lines are drawn
on the full account; Fishing is a renewable stock with a threshold and a scar, foreign fleets that fill the room left,
and a gauge (catch per trip) that is the skippers' report until the Board's Survey (about hour 7.7: 81% reported, 50%
true). Wager letters stake 2.2% of a run's Hindsight. Measured Act I ending 15.3-17.3 h. Contract at save version 5
(`design/m4-contract-notes.md`; hunks marked `M4:`, `M4 (amend):`, `M4 (finish):`). Content prose loads as a lazy part
after first paint (`docs/adr/ADR-2026-11-20-late-content-text.md`): page code that builds late words once must fill
them in `onText()`. Recorded misses (`design/roadmap.md`, M4): hours 8-15 are mostly saving for the Settlement
Commission; letters barely matter to a burning player (+2.2%); burning earns 0.6-0.7 of restraint's Hindsight a minute
(M3: about 0.4); nobody has played it but scripted players.

## Next steps, in order

1. **Stop and look.** M4 is live. Have the owner play it (the Survey at hour 6-8; the Act I ending fixtures are in
   `design/scratch/m4-balance/`, local only) and listen to the sound.
2. **M5, The Other Chair**, then M6-M10 per `design/roadmap.md`: design first, contract alone, lanes, balance last.

Working rules for parallel agents (contract first and alone, lanes own folders, balance last by one agent) are at the
top of `design/roadmap.md`. Merge to `main` when tests pass, the tree typechecks and builds, and the result has been
looked at in a browser. Agents are stopped by container restarts and usage limits: have each keep a progress note in
`design/scratch/` and land one verified piece at a time.
