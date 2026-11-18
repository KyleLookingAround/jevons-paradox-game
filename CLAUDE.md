# Rebound

An incremental game about Jevons paradox: every efficiency upgrade makes the world burn more, and the game is
learning why, then learning what actually works. Served by GitHub Pages from `main` (Actions build).

Read before changing anything: `DESIGN.md` (the game), `src/types.ts` (the contract), and
`docs/adr/ADR-2026-11-18-bun-built-static-site-with-pure-core.md` (the architecture).

## Commands

- `bun run build.ts` — build to `dist/` (`--single` for one inlined file)
- `bun test` — tests
- `tsc -p .` (or `bunx tsc -p .`) — typecheck
- `bun run tools/balance.ts [efficiency|levers|idle] [runs]` — headless balancer

Bun is the whole toolchain; there are no runtime dependencies. Keep it that way unless an ADR says otherwise.

## Rules

- `src/types.ts` is the contract between the simulation, the content and the UI. Change it deliberately, in its own commit.
- The simulation is pure: no DOM, no `Date.now()`, no `Math.random()`, never mutate the state passed in.
- Content is data. Balancing changes numbers in content, not logic in the core.
- The UI holds no game rules. It reads `derive()`, calls the model API, and patches the DOM in place (build structure
  once per layout change; never rebuild per tick).
- British English, dry broadsheet tone. The game never lectures.
- Words: the unit of play is a `Sector` in code and an "Industry" on screen; the period is an "Age". Player-facing text
  never says "sector" or "era" for the unit. (`DESIGN.md` and `design/*.md` predate this and still say "era".)

## Status (18 Nov 2026)

| Piece | State |
|---|---|
| `src/types.ts` | M1 contract (save version 2). Decisions and the old → new name mapping are in `design/m1-contract-notes.md`. |
| `src/model.ts` | All of `ModelApi`, tested (`src/model.test.ts`, fixture in `src/fixture.ts`). Independent review in progress. |
| `src/content.ts` | Five eras drafted. Runs without error; numbers unbalanced (see `design/critique-v1.md`). |
| `tools/balance.ts` | Headless balancer: `efficiency`, `levers`, `idle`; `--fixture` for the test content. |
| `src/ui/`, `src/main.ts`, `index.html` | In progress per `briefs/ui.md`. |
| `design/` | Critique of v1, ranked proposals, the long-game structure and the roadmap. `design/research/` holds sourced dossiers for content authors. |

The game is to be a very long one with a lot of content (true ending at roughly 110–120 active hours). The plan is
`design/roadmap.md`; the structure is `design/long-game.md`. Owner decisions D1–D5 at the end of the roadmap are open;
until answered, work to the recommendations given there.

## Next steps, in order

M1 is in progress: core, content and UI lanes are conforming to the new contract per `briefs/m1-*.md`, then balance.
Until they finish, the branch does not typecheck; `main` holds the last playable build (v1).

1. Finish the independent model review and the UI; browser playtest script (Playwright, phone viewport).
2. **M1 "v1, honest"**: instruments (counterfactual rebound, decade and within-reach projections), budget-line Steady
   State with demography, milestone unlocks, a new Hindsight formula with an Institution loadout and Know-how forks,
   run forks, an era calendar; balance Eras 1–5; encode the pacing targets as tests; bring `DESIGN.md` in line.
3. **M2 "Restraint has a game"**: first split `src/model.ts` into `src/core/` and `src/content.ts` into `src/content/`
   (behaviour unchanged), then Settlement, the Commons and standing orders.
4. **M3 "Every era its own"**: one mechanic per era, levers that rebound, the cast and dispatches, histories, the
   Archive. Stop and evaluate before building layers.
5. **M4–M8**: Act I complete, the World (Treaty), the Great Acceleration, the Attention Age (Long Now), the post-game.

Working rules for parallel agents (contract first and alone, lanes own folders, balance last by one agent) are at the
top of `design/roadmap.md`.
