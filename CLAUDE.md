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

M1 is built, balanced and live on `main`: five Industries on the sector-and-age contract, honest rebound instruments,
budget-line Steady State, milestone unlocks, Institutions with seats, Know-how trees, forks, a living illustrated scene
per Industry in the art style of its Age, save safety and settings.

| Piece | State |
|---|---|
| `src/types.ts` | M1 contract (save version 2). Decisions and the old → new name mapping: `design/m1-contract-notes.md`. |
| `src/core/` | All of `ModelApi` (`src/core/index.ts`; module map in `src/core/README.md`). Tests: `src/core/model.test.ts`, `model.review.test.ts`, `m1.*.test.ts`; fixture `src/core/fixture.ts`. |
| `src/content/` | Five Industries, three Ages (`src/content/index.ts`; module map in `src/content/README.md`). Lint: `src/content/content.test.ts`. Pacing targets: `src/balance.test.ts`. |
| `tools/balance.ts` | Headless balancer: `efficiency`, `budget`, `levers`, `forks`, `peakdraw`, `mixed`, `idle`; `--summary`, `--fixture`. |
| `src/ui/` | The page. `src/ui/scene/` is the world scene engine (own README; art styles are a layer). |
| `tools/shot.mjs` | Playwright screenshots and scripted flows. Run its modes one at a time (`scenes`, `flow`, `checks`, `audit`, `realplay`, `looks`); `all` in one go has run the container out of memory. |
| `design/` | `long-game.md` (structure: four Ages, twelve Industries, three layers), `roadmap.md` (M2–M9), `paradigm-shifts.md`, `genre-audit.md`, `visual-direction.md`, `research/` (sourced dossiers). |

The game is to be a very long one with a lot of content: three endings (about 15–17 h, 50 h and 100 h) and a post-game.
Each Act changes the player's role: industrialist, government, writer of the agents' objectives, the one who takes
things down. Owner decisions D2–D6 at the end of `design/roadmap.md` are open; until answered, work to the
recommendations given there.

Known gaps: only Chromium has been tested (no Safari, Firefox or real phone); a Home Screen install is unverified;
offline time can still end a run while the player is away (fixed in M2).

## Next steps, in order

1. **M2 "Restraint has a game; run 2 is different"**: the split into `src/core/` and `src/content/` is done; next the
   contract (save version 3), then the lanes. `src/core/step.ts` is a shared hotspot: one owner per milestone.
2. **M3** every Industry its own mechanic, the second reveal, a first ending; then stop and look.
3. **M4–M9** per `design/roadmap.md`.

Working rules for parallel agents (contract first and alone, lanes own folders, balance last by one agent) are at the
top of `design/roadmap.md`. Merge to `main` when tests pass, the tree typechecks and builds, and the result has been
looked at in a browser.
