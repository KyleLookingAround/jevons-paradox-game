# Rebound

An incremental game about Jevons paradox: every efficiency upgrade makes the world burn more, and the game is
learning why, then learning what actually works. Served by GitHub Pages from `main` (Actions build).

Read before changing anything: `DESIGN.md` (the game), `src/types.ts` (the contract), and
`docs/adr/ADR-2026-11-18-bun-built-static-site-with-pure-core.md` (the architecture).

## Commands

- `bun run build.ts` — build to `dist/` (`--single` for one inlined file)
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

## Status (19 Nov 2026)

M1 and M2 are built, balanced and live on `main`. Five Industries in three Ages; honest rebound instruments; budget lines
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
| `tools/shot.mjs`, `tools/perf.mjs` | Playwright screenshots and scripted flows; performance measurement. Run `shot.mjs` modes one at a time (`scenes`, `flow`, `checks`, `audit`, `m2`, `real`, `realplay`, `looks`, `first`); `all` in one go has run the container out of memory. |
| `design/` | `long-game.md` (four Ages, twelve Industries, three layers), `roadmap.md` (M3–M9), `paradigm-shifts.md`, `genre-audit.md`, `visual-direction.md`, `sound-direction.md`, `style-guide.md`, `research/` (sourced dossiers). |

The game is to be a very long one with a lot of content: three endings (about 15–17 h, 50 h and 100 h) and a post-game.
Each Act changes the player's role: industrialist, government, writer of the agents' objectives, the one who takes
things down. Owner decisions D2–D6 at the end of `design/roadmap.md` are open; until answered, work to the
recommendations given there.

Known gaps: only Chromium has been tested (no Safari, Firefox or real phone); nobody has listened to the sound; a Home
Screen install is unverified; in boom play most of a long absence is lost to the hold before a crisis (banked time is
planned); the restraint player has a stretch of about three minutes with nothing to decide late in runs 1–2 (M3's
dispatches address it); pacing figures come from scripted players, not people.

## Next steps, in order

1. **M3** every Industry its own mechanic, the cast and dispatches, the second reveal ("The Proprietor's Day"), a first
   ending at 15–20 h; then stop and look. Contract first and alone, then lanes, balance last.
2. **M4–M9** per `design/roadmap.md`.

Working rules for parallel agents (contract first and alone, lanes own folders, balance last by one agent) are at the
top of `design/roadmap.md`. Merge to `main` when tests pass, the tree typechecks and builds, and the result has been
looked at in a browser. Agents are stopped by container restarts and usage limits: have each keep a progress note in
`design/scratch/` and land one verified piece at a time.
