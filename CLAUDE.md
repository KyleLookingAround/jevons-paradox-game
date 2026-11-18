# Rebound

An incremental game about Jevons paradox: every efficiency upgrade makes the world burn more, and the game is
learning why, then learning what actually works. Served by GitHub Pages from `main` (Actions build).

Read before changing anything: `DESIGN.md` (the game), `src/types.ts` (the contract), and
`docs/adr/ADR-2026-11-18-bun-built-static-site-with-pure-core.md` (the architecture).

## Commands

- `bun run build.ts` — build to `dist/` (`--single` for one inlined file)
- `bun test` — tests
- `tsc -p .` (or `bunx tsc -p .`) — typecheck
- `bun run tools/balance.ts [efficiency|levers|idle] [runs]` — headless balancer (not written yet)

Bun is the whole toolchain; there are no runtime dependencies. Keep it that way unless an ADR says otherwise.

## Rules

- `src/types.ts` is the contract between the simulation, the content and the UI. Change it deliberately, in its own commit.
- The simulation is pure: no DOM, no `Date.now()`, no `Math.random()`, never mutate the state passed in.
- Content is data. Balancing changes numbers in content, not logic in the core.
- The UI holds no game rules. It reads `derive()`, calls the model API, and patches the DOM in place (build structure
  once per layout change; never rebuild per tick).
- British English, dry broadsheet tone. The game never lectures.

## Status (handover, 18 Nov 2026)

Version 1 was being built by four parallel agents, each with a brief in `briefs/`. They were stopped part-way.
What exists is a first draft, typechecked but NEVER RUN:

| Piece | State | Brief |
|---|---|---|
| `src/types.ts` | Done. | — |
| `src/model.ts` | Full first draft of every `ModelApi` method (1,300 lines). Typechecks. Untested: no fixture, no tests, no balancer yet. | `briefs/model.md` |
| `src/content.ts` | Full first draft of all five eras, upgrades, levers, Know-how, Institutions, headlines (1,250 lines). Typechecks. Numbers are unbalanced guesses. | `briefs/content.md` |
| `src/ui/` | Early: `fmt`, `dom`, `icons`, `gauges`, `ctx`, `devmock`. No `main.ts`, `index.html` or `styles.css`, so there is nothing to open yet. | `briefs/ui.md` |
| `design/` | Only scratch scripts. No critique or proposals written. | prompt summarised below |
| Pages workflow | Deploys a placeholder page until `src/main.ts` and `index.html` exist. | — |

## Next steps, in order

1. Model: write `src/fixture.ts`, `src/model.test.ts` and `tools/balance.ts` per `briefs/model.md`; fix what the tests find.
   Then have a fresh reviewer check `model.ts` against the contract and the formulas in `DESIGN.md`.
2. UI: finish per `briefs/ui.md`. The brief predates the move to Pages: the page is no longer sandboxed or single-file,
   so file download for save export is fine, and `index.html` keeps `<style>/*__CSS__*/</style>` and
   `<script>/*__JS__*/</script>` holding only the placeholders (see `build.ts`).
3. Balance Era 1 against the pacing targets in `DESIGN.md` using the balancer, then encode the targets as tests.
4. Browser playtest script (Playwright, phone viewport): first 30 minutes and a Reckoning.
5. Split `src/model.ts` into `src/core/` and `src/content.ts` into `src/content/` (one module per era), behaviour unchanged.
6. Design pass: critique v1 and write ranked proposals into `design/`. Known weak spots: restraint has no reward loop
   of its own; Eras 2–4 risk being re-skins of Steam; Know-how vs Institutions may be solved after two Reckonings;
   wanted: a recurring broadsheet cast with choices, a lever that itself rebounds, run modifiers, a post-game.
7. Bring the design doc back in line with decisions made in the contract: applications are founded by paying for them;
   Compute's efficiency rises on its own; the first-30-minutes curve should be redrawn from real balancer output.
