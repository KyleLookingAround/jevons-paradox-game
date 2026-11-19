# ADR-2026-11-19: A split build with lazy parts, a service worker, and performance budgets

## Status

Approved (architecture decisions delegated to the coordinating session by the repo owner). Amends the build described
in ADR-2026-11-18 (one IIFE bundle, `app.js` + `styles.css`); everything else in that ADR stands.

## Context

Three milestones of systems, content, pictures and sound took the one bundle from 370 KB (133 KB gzipped) to 1,062 KB
(369 KB gzipped), all of it parsed before the first paint, on a game played mostly on phones. Most of it is not needed
then: the sound engine (sound is off by default), the Archive's 162 sourced notes, and the scene engine with five
Industries' art styles, layouts and props. QA's B24 (no offline play, no installable app) was open: the manifest and
icons were made in the page from script because the build could ship no other files. Performance had slipped with no
owner and no tripwire. The constraints of ADR-2026-11-18 hold: Bun is the whole toolchain, no runtime dependencies,
the site is static on GitHub Pages under `/jevons-paradox-game/`, the tools open `dist/index.html` from `file://`, and
`bun run build.ts --single` must still give one self-contained file.

## Options Considered

### Option 1: ES modules with code splitting (`Bun.build({ splitting: true, format: 'esm' })`, dynamic `import()`)
**Pros:** shared modules are shared, not duplicated; the standard mechanism.
**Cons:** module scripts do not load from `file://` (CORS), so every tool and a downloaded copy would need a server;
`--single` needs a second build anyway; very old Safari lacks dynamic import.

### Option 2: Classic-script lazy parts with a small loader (chosen)
**Description:** the main script stays one IIFE. Each self-contained part (no shared mutable modules with the page) is
built as its own IIFE that registers itself on `self.__rb[name]`; the page loads it by injecting a `<script>`, with a
content-hashed name written into the page as `self.__rbChunks`.
**Pros:** loads from `file://`, Pages and old Safari alike; no CORS; trivial to inline for `--single`; retries are
simple; no new tooling.
**Cons:** only parts with no shared state can be split (a shared module would be duplicated); the page must call the
part through a handle (`sceneRt.ts`, `sound.ts`), not import it.

### Option 3: Keep one bundle, minify harder
**Cons:** cannot approach the budget; the data is text and rules the core reads.

## Decision

Option 2, with a hand-written service worker and budgets enforced in CI.

- **What loads when.** First paint: `index.html`, `styles.<hash>.css` (minified), `app.<hash>.js` (the core, the
  content's rules and words, the page; ~605 KB, ~205 KB gzipped). Right after the first paint: `scene.<hash>.js` (the
  scene engine, every art style, layout and prop library, ~82 KB gzipped); until it arrives, or if it cannot be loaded,
  the picture's place shows a plain list of the uses with their Found buttons. When sound is on or the settings sheet
  opens: `audio.<hash>.js` (~33 KB gzipped; the AudioContext is still made inside the toggle's tap). When the Archive is
  first opened: `archive.<hash>.js` (~54 KB gzipped).
- **The Archive's text without a contract change.** The core's rules read only each note's `id` and `subject`. The build
  (a Bun plugin on `src/content/archive/index.ts`) gives the main script the notes with empty title/text/sources and
  puts those in the lazy part; `src/ui/archive.ts` fills them in before the sheet first opens. The data files are not
  touched, and tests, the balancer and the mock read the source as before. Other text the core reads synchronously
  (dispatches, headlines, ambient items, blurbs: ~120 KB raw) stays in the main script; see "Not reached".
- **Loader** (`src/ui/chunks.ts`): once per part, concurrent callers share the load, three tries with back-off, then the
  caller's fallback; a later call tries again. The single-file build carries each part as inert
  `<script type="text/plain">` and runs it on first use.
- **Service worker** (`src/sw.js`, emitted as `dist/sw.js`): precaches the shell and the scene part under the edition's
  cache name; caches the other parts on first use; serves the game's navigation from the cache (the game reloads with
  no connection); leaves other origins and other pages on the site (e.g. `/audio-demo/`) alone. A new edition installs
  and waits; the page offers it through the note line ("A new edition of Rebound is ready. Load it" saves, activates it
  and reloads), never reloading under the player; old caches are deleted on activation; the save (localStorage) is never
  touched. It registers only over https or on localhost, never from `file://` or in `--single`. **Kill switch:**
  `REBOUND_SW=off bun run build.ts` and deploy: that `sw.js` deletes the game's caches and unregisters itself, and the
  page registers none (browsers re-fetch `sw.js` at least daily). For one browser: open the game with `?nosw`.
- **Manifest and icons are files.** `dist/manifest.webmanifest` from the build; icons in `public/icons/` (rendered by
  `node tools/icons.mjs` from `src/ui/install.ts`'s drawing); `index.html` links them. The script-set data-URL manifest
  is gone.
- **Budgets.** `bun run build.ts --check` fails when a shipped file is over its gzipped budget (first paint 240 KB,
  main 218, styles 22, scene 92, audio 38, Archive text 62); the Pages workflow runs it. `src/core/perf.budget.test.ts`
  holds per-call budgets for `tick`, `derive`, the views and `serialize` on a late-game state (in `bun test`, so in CI).
  `node tools/perf.mjs --check` adds the browser budgets (frames, long tasks, taps, tab switch, DOM size, heap, network
  load) with generous margins; it is run by hand, not in CI (headless timings on shared machines are not stable enough
  to gate a deploy).

The workflow is unchanged apart from `--check` on the build step; it still uploads `dist/` (now also `sw.js`, the
manifest, `build.json` and the hashed files), and copies `public/` as before.

## Rationale

The constraint that decides the format is that the game must run from `file://` for the tools and from one file when
shared; classic scripts do both, and the three big parts that are not needed for the first paint (picture, sound,
Archive text) happen to be self-contained. The service worker is the cheapest way to make a warm start fast and offline
play possible, and it is safe only if it is small, versioned, never reloads under the player and can be switched off.

## Consequences and Trade-offs

**Positive:** first paint needs 224 KB gzipped instead of 394; a warm start comes from the service worker (no bytes,
ready in ~0.2 s at 4× CPU); the game reloads offline; Home Screen install has real files; size and core-cost
regressions fail CI.

**Negative / Risks:**
- A part that fails to load leaves a fallback (plain uses list, silent sound, Archive titles missing) until it loads.
- Parts cannot share state with the page: a new lazy part must be self-contained, or it will duplicate modules.
- The Archive stubs differ from the source content until the text arrives; any new code that reads an Archive note's
  title, text or sources must first await `ensureArchiveText` (src/ui/archive.ts).
- A service worker adds a way for a bad deploy to stick; hence the kill switch and the edition-named caches.

## Not reached (and what would reach it)

The target of ~150 KB gzipped before the first paint is not met (224 KB). What remains is the core (~49 KB gz), the
content the core reads synchronously (~75 KB gz: rules plus dispatch letters, headlines, ambient items and blurbs) and
the page (~80 KB gz). The smallest contract change that would allow lazy text: an optional `ContentText` layer — content
keeps ids and rules, and text fields (DispatchDef body/arms text, AmbientDef text, blurbs) move to a table keyed by id
that the views look up and the core copies into state only by id (NewsItem keeps `key` + `id` and the page renders the
words). That is a contract change for its own commit; it was not made here.

## Alternatives rejected

- ESM splitting (above): breaks `file://`.
- Rasterising the scene's static bands to bitmaps: measured, not needed: the scene's cost on the real page came from a
  rAF loop forcing a main-thread frame every vsync, an SVG animation, stylesheet churn and world-wide custom properties
  (all fixed), not from the number of nodes; bitmaps would cost crispness at every pixel ratio and the scene's styling.
- A service worker that skips waiting: it would swap code under a running game.

## Related

- ADR-2026-11-18 (the architecture), `build.ts`, `src/ui/chunks.ts`, `src/sw.js`, `src/ui/edition.ts`,
  `tools/perf.mjs` (`--check`, `--load`, `--dist`), `src/core/perf.budget.test.ts`.
