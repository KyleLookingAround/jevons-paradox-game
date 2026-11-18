# ADR-2026-11-18: Bun-built static site with a pure simulation core

## Status

Approved (architecture decisions delegated to the coordinating session by the repo owner)

## Context

Rebound is an incremental game about Jevons paradox. It was first scoped as one self-contained HTML file because it
was going to be published as a sandboxed page. It now lives in this repository and is served by GitHub Pages from an
Actions build, so that limit is gone. The game is built by several agents working in parallel and will carry on being
developed in Claude Code, so the structure has to keep workstreams out of each other's files, and the economy has to be
balanced by running whole games without a browser. The session that builds it cannot install npm packages, so anything
that needs `node_modules` cannot be run or tested where the code is written.

## Options Considered

### Option 1: Vite + TypeScript, optionally with a UI framework
**Description:** The usual stack: Vite dev server and bundler, Vitest, perhaps Preact for the interface.

**Pros:**
- Familiar; hot reload; large ecosystem.

**Cons:**
- Needs installed packages, so the authoring session cannot build or test it.
- A framework re-rendering ten times a second is the wrong shape for an idle game's steady stream of small number changes.

### Option 2: Single inlined HTML file
**Description:** Keep the original plan and inline all script and style.

**Pros:**
- One file to share.

**Cons:**
- Nothing cacheable, no static assets, awkward diffs, and no reason for it on Pages.

### Option 3: Bun as the whole toolchain, zero runtime dependencies
**Description:** Bun bundles, tests and runs scripts; plain TypeScript and DOM; a multi-file static site.

**Pros:**
- Builds and tests identically in the authoring session and in CI.
- No dependency upkeep.

**Cons:**
- No hot reload out of the box; hand-written DOM patching.

## Decision

Option 3. Bun bundles `src/main.ts` into `dist/` (`index.html`, `app.js`, `styles.css`, plus anything in `public/`),
runs the tests and the headless balancer, and the Pages workflow deploys `dist/` on every push to `main`.

The code is layered, with dependencies pointing one way only:

- `src/types.ts` — the contract: content schema, game state, derived view, model API.
- `src/core/` — the simulation. Pure functions over plain-JSON state: no DOM, clock or randomness.
- `src/content/` — data only, one module per era plus prestige and headlines. Balancing never touches core code.
- `src/ui/` — reads the derived view, calls the model API, patches the DOM in place. No game rules.
- `tools/` — headless balancer and browser playtest. `design/` — critique and proposals. `docs/adr/` — decisions.

Pacing targets from the design (time to the reveal, first Reckoning, peak rebound) are encoded as tests that play
scripted runs, so a balance change that breaks the first half hour fails CI.

## Rationale

The constraint that decides it is that the code must be runnable where it is written. Beyond that, a deterministic
pure core is what makes the game balanceable: the same function drives the browser, the balancer, offline catch-up and
the projected-consumption line on upgrade cards. Keeping content as data lets numbers and words change without
re-reviewing logic.

## Consequences and Trade-offs

**Positive:**
- One command builds, one tests; CI and local behave the same.
- Workstreams map to folders, so parallel agents do not collide.
- Saves are plain JSON and versioned; state can be replayed for bug reports.

**Negative / Risks:**
- No hot reload; UI iteration is rebuild-and-refresh.
- Hand-rolled DOM patching can drift into spaghetti.
- First versions of the core and content were written as single large files.

**Mitigations:**
- `bun build --watch` for development.
- UI modules own one panel each, with a build-once / patch-in-place rule.
- Split `model.ts` and `content.ts` into the folders above once their tests pass, as a behaviour-preserving refactor.

## Related

- `DESIGN.md` — the game design brief.
- `src/types.ts` — the contract this layering rests on.
