# Scene engine (`src/ui/scene/`)

One continuous, animated landscape per industry, driven entirely by data, that fills up, speeds up and darkens as a
consequence of what the player buys. It replaces the grid of application vignettes in `src/ui/world.ts`.

## Interface

```ts
import { createScene, sceneViewFrom } from './scene';

const scene = createScene(hostEl, {
  onSelect: (appId) => {},            // a place was tapped (null = cleared); the scene changes no game state
  onFound: (appId) => act('foundApp', (m, s, c) => m.foundApp(s, c, appId)),
  // reducedMotion?: boolean (default: prefers-reduced-motion), card?: boolean (default true),
  // money?: (n) => string, num?: (n) => string,
  // detail?: 'auto' | 'low' | 'full' (default 'auto': drops to low for the session if frames run long on screen)
});
scene.update(sceneViewFrom(content, state, derived, sectorId)); // up to 10×/s: patches in place
scene.setSector(id);   // on tab change (clears the selection; the next update rebuilds)
scene.select(appId | null); scene.setReducedMotion(bool | null); scene.describe(); scene.destroy();
scene.setDetail?.('auto' | 'low' | 'full'); // optional, for a page setting
```

### M2 additions (all optional; every M1 call above still works)

```ts
// Events: pass the GameEvents with seq > lastSeen (all sectors; set lastSeen = meta.eventSeq on load/import/new
// game so nothing in a save replays). The adapter keeps this Industry's (and reckoning/won/charterChosen).
scene.update(sceneViewFrom(content, state, derived, sectorId, newEvents));
createScene(host, { onStage: (sectorId, stage) => {} });   // the machines changed generation (not on a switch/build)
scene.highlight?.({ app: id } | { lever: kind } | { commons: id } | null);  // a ring over the place; false if absent
scene.prebuild?.(sceneViewFrom(content, state, derived, otherSector));      // when idle: later switch = re-attach
scene.toSVG?.({ width, height, plate });                    // the current picture, one self-contained SVG string
await renderStill(view, { width, height, format: 'svg' | 'png', scale });   // any view, static: string | Blob
await scene.replay?.(views, { seconds: 10 });   // a run back, no toasts or moments; update() ignored meanwhile
scene.stopReplay?.();
compactView(view);                              // a view trimmed for recording (~1.7 KB JSON for Steam)
```

- **Events, not diffs.** The engine reacts to each event once (it remembers the highest seq; seqs are global, so a
  switch resets nothing): `crisis` fog and name · `appFounded` (player: the landmark rises on a scaffold, a toast;
  Market: a scaffold, no toast; `default`: nothing) · `upgradeBought` by the Market: a scaffold rises and comes down on
  the nearest founded landmark (three at most) · `stageReached`: the old machines sink away as the new rise, a flash,
  the machine named (`onStage` fires) · `leverEnacted`: its sign goes up · `decade`: a brief brightening ·
  `clearSkies`, `steadyState`, `settled`: a clearing wash and a caption · `sectorOpened` / `ageBegins`: the picture is
  unveiled · `backfire` (the first): the valley takes a breath, then burns harder: landmarks kick, stacks puff black, a
  dark wave rolls through · `commonsBuilt`: the building rises. Hosts without events (the demo, old saves) get the M1
  behaviour by comparing views of the same Industry (`moments.ts`, tested).
- **Crisis state is per Industry**: the fog and its name stop on `setSector` (or on a view of another Industry) and
  never come back when the player returns (`moments.test.ts`).
- **What to record per sample** for a time-lapse: `compactView(sceneViewFrom(...))` at each sample; nothing else. The
  view is plain JSON. `renderStill` draws the picture at rest: movers at their resting points, no rain or crisis fog,
  the style's plate optional.

### M3 additions (all optional; every M1/M2 call above still works)

`sceneViewFrom` fills these per Industry, each **absent while its feature is off** (`Derived.features`) or while the
core reports nothing (the SectorDerived views are null): a host that is not yet on M3 draws the M2 picture.

| Field | Type | Meaning (the audio lane reads the same) |
|---|---|---|
| `seams` | `{ sunk: number; total: number; next: boolean }` | Steam's seam ladder: ladder seams sunk (0…total), the ladder's length, and whether the next seam is reachable now. The original bed is always above the ladder. |
| `load` | `{ hours: number[]; factor: number }` | Light's day: 24 hourly loads normalised to the peak hour (0–1, hour 0 = midnight) and the load factor (mean / peak). |
| `travel` | `{ speed: number; sprawl: number; sprawlShare: number; freeSpeed?: number }` | Motion: `speed` 0–1 = v / free speed (1 = empty roads, low = queues); `sprawl` 0–1 = the lock-in stock against full lock-in of the founded applications (it stays when traffic thins); `sprawlShare` = TravelView.sprawlShare; `freeSpeed` = the free speed index (above 1 = new roads). |
| `free` | `{ apps: string[] }` | Compute: founded applications whose users see under half the service price ("free at the point of use"). |
| `figures` | `string[]` | Cast figure keys (`CastDef.figure`) of the writer of a pending dispatch addressed to this Industry or to none; `'proprietor'` once `meta.flags.proprietor`; at the first ending, while that run lasts, the whole cast. Unknown keys draw nothing. |
| `watch` | `number` | 0–1, how often the proprietor checks his watch: `after / (after + before)` of `Derived.survey.decisionsPerHour*` (0.5 when unknown); absent before the Proprietor's Day. |
| `levers[i].bite` | `number` | 0–1 (`LeverState.bite`), only while feature `sideEffects` is on and above zero. From 0.5 the side effect is drawn. |
| `events[i].first`, `.label` | | Carried from the contract when set. |

New events the picture plays (nothing loops; reduced motion gets the static state): `seamSunk` (a shaft sinks to the
new seam, a puff of steam at the head, the gallery lights), `biteBack` (the lever's side effect appears where it
stands: heavier cars on the forecourt, a new road filling, another hall), `ending` (the sky clears completely and a
paper boy runs through with the news). New exports: `viewFromSummary(baseView, runSummary, start?)` (a still view of
a run's end, or its first morning, rebuilt from `RunSummary` for the before-and-after pictures) and
`spot(key, look, opts?)` (an engraved spot illustration per `HeadlineKey`, an SVG string; see "Spots" below).

### M4 additions (all optional; every M1–M3 call above still works)

`sceneViewFrom` fills these from the M4 contract, each **absent while the core reports nothing** (a host before M4 draws
the M3 picture; checked pixel for pixel against the M3 strips).

| Field | Type | Meaning (the audio lane reads the same) |
|---|---|---|
| `feeds` | `{ to: string; factor: number }[]` | On Iron (a feed source): the order book, per Industry it feeds now (`SectorDerived.feeds`): the target's id and the product of Iron's feed factors into it (≤ 1; 0.85 = that Industry's machines 15% cheaper). |
| `fedBy` | `{ from: string; app: string; share: number }[]` | On a fed Industry: each founded application of another Industry whose feeds name this one (or `'*'`), and its adoption 0–1. Drawn by a layout's `driver: 'fed'` plots matching `app`: Steam's second track, engine shed and extra train (`iron.rails`), iron hulls in its harbour (`iron.shipPlate`); Light's steel-framed gasholder (`iron.girders`); Fishing's iron trawlers (`iron.shipPlate`) and cannery (`iron.tinplate`). |
| `stock` | `{ reported; truth; surveyed; foreign; scar; crossed; moratorium }` | Fishing's stock, fractions 0–1. `reported` = catch per trip; `truth` = the true Q/K (`SectorDerived.stock.world`, for the world only, never a gauge); `surveyed` = a survey in force; `foreign` = the foreign fleets' share; `scar` = a scar lasts; `crossed` = below the threshold this run; `moratorium` = the quota lever at a level whose value is 0. **The rule:** the chart's stipple reads `reported` until `surveyed`, then `truth`; the living sea (gulls, porpoises, surface shoals, boats out) always reads `truth`. Captions and the text alternative speak of an unsurveyed stock only as reported. |
| `capstoned` | `{ year: number \| null; arrears: boolean }` | A capstoned Industry: the Act ending's year (`meta.world.capstone[s].year`) for the cartouche "Settled {year}"; in arrears the held wash withdraws (root class `arrears`) and the smoke, or the empty sea, returns with the pressure. |
| `preview` | `boolean` | A Preview Industry: a small "Preview" mark in the picture's corner. |

New drivers for plots (`layout.ts`): `fed`, `chart`, `world`, `boats`, `tied` (moratorium or a failed bank), `foreign`,
`surveyed`, `scar`, `crises` (a mark that stays for the run once the crisis count passes the slot). New `Layout` fields:
`crisisNames` (Iron's second crisis is lettered The Slag Slide), `chart` and `surveyRun` (Fishing's survey beat), `card`
(the postcard crop). `MAX_CACHED` is 7 (Act I's four Industries and three Previews: a switch is always a re-attach).

New moments (nothing loops; reduced motion gets the after): `surveyed` (the Board's vessel puts out from the harbour
mouth; with label `reveal`, the Board's first survey, the chart's stipple that the fleet's figure showed and the truth
does not fades out left to right, once: copies of the vanished shoals as composited sprites over a drawing that
already shows the truth), `thresholdCrossed` (a veil sweeps the chart), `scarHealed` (gulls fly in), `capstoned` (the
cartouche stamps), `arrears` (a dark wave, "In arrears"). Without events they are found by comparing views.

New art: `foundry` (Iron & Steel, Plate III, "Ravensdale, by night": a two-colour lithograph, furnace orange over a
heavy ink, the glow plates a hair out of register; the furnaces blow in as the works fill; stoves at stage 1, the
converter's flame cone at stage 2, the open-hearth shop at stage 3; the goods yard's lettered wagons leave the frame
for each Industry fed; slag heaps on the ground over Steam's seam section, which both draws hollow) and `harbour`
(Fishing, Plate IV, a ledger variant at dawn: the quay, market hall, smokehouses, fish train, piers and lighthouse,
and the Admiralty chart in the near band 358–400: banks, stipple shoals, foreign sails as pennant-coloured glyphs,
the home fleet's marks, the survey's track, a scar as grey water "No fish found"; soundings only on the wide picture).
Figures `pryceElder` (frock coat, a sample of rail), `skipper` (gansey), `naturalist` (sampling jar). Spots for the
six new headline keys (`banks`, `survey`, `sails`, `gulls`, `cartouche`; `arrears` uses `chimneys`).

`postcard(view, { standalone?, width?, height?, marks? })` (`postcard.ts`, exported) is a tab's static crop (64 × 40
by default) built as a string from the layout's scenery and the founded landmarks, with the settled wash, the
capstone's cartouche, and (unless `marks: false`) the Preview corner and the warning dot; `postcardKey(view)` says
when it must be redrawn. Standalone inlines only the drawing classes and that look's tokens (for an `<img>`).

Measure: `node tools/scene-shot.mjs [industries] --m4` (the strip `#strip=<id>&m4`), `--perf --m4`, `--switch --m4`,
`--trace --m4` (busiest: `crisisM4`); `#cards` shows every Industry's postcards.

### M5 additions (all optional; every M1–M4 call above still works)

`sceneViewFrom` fills these from the M5 contract (`m5Fields`), each **absent outside a Ministry or while the core reports
nothing**: a view without them draws the M4 picture (checked pixel for pixel against the M4 strips).

| Field | Type | Meaning (the audio lane reads the same) |
|---|---|---|
| `chair` | `{ opposition: boolean }` | Present only while office is taken (`Derived.chair` non-null): the Ministry window frames the picture. `opposition` = `ChairView.inOpposition`: the curtains are half drawn. |
| `rival` | `true` or absent | `SectorDerived.rival`: Pryce runs the Industry (a chair Industry, or a capstoned one, in a Ministry). No survey stakes and no founding offer on the card; a capstoned one carries Pryce's bunting. |
| `exempt` | `string[]` | `LoopholeDef.prop` of this Industry's rungs in state `'used'` (or `'drafting'` with `before: 'used'`), feature `loopholes` on: `'vans'`, `'fourByFours'`, `'borehole'`. Unknown keys draw nothing. |
| `water` | `{ applied; consumed; returnShare }` | Plenty (`SectorDerived.water`): water applied and consumed per second (acre-feet, three figures) and the return share r, 0–1 (consumed = applied × (1 − r)). |
| `sealed` | `true` or absent | In `Derived.office.sealed` (Compute, Code while office is taken): the sealed postcard. |
| `levers[i].lobbied` | `true` or absent | `chair.rival.lobbying[id]`: a hoarding by the lever's sign. |
| `levers[i].litigated` | `true` or absent | `chair.litigation[id].until > time`: a court notice on the sign. |
| `levers[i].carvedOut` | `true` or absent | `chair.carveOuts[id] === chair.parliament.index`: a carve-out acts this Parliament. |

The scene never reads `SectorDerived.reportedR`: under concealment the gauge reads clean and the sky stays honest.

`sceneViewFrom` (in `adapter.ts`) is the only code that reads the contract. It is pure and total (never throws) and
holds no game rules: it reads `Content`, `GameState` and `Derived` and maps them to cosmetic fractions (`SceneView`
in `types.ts`). The scene ships its own CSS (`css.ts`, injected once as `<style id="scn-css">`), reading the page's
theme tokens (`--ink`, `--bg-solid`, `--accent`, …) with fallbacks.

## One country (`geography.ts`)

Every Industry is the same valley running down to the same estuary, seen from the same hill over 250 years.
`COUNTRY` holds the shared land as data, in Steam's projection: the far and near hill lines, the coast where the hills
fall to the sea, the sea horizon, the viaduct's span, the mill town, the church, the pit and the harbour. Helpers draw
it in any style (`hills(dy)`, `hillCrest(dy)`, `hills2(dy)`, `sea(dy)`, `viaductArches()`, `millShells()`); a layout
whose horizon sits lower passes `dy`, and x never changes, so landmarks line up from tab to tab.

What earlier Industries built still stands: `SceneView.heritage` (optional, filled by `sceneViewFrom` from the
other sectors' foundings and adoption; absent = drawn as built) reaches a layout's backdrop as `c.heritage`, read with
`built(c.heritage, 'steam')`. Light shows Steam's viaduct and mill shells at dusk under the same hill line; Motion
the disused viaduct, chimneys and Light's gasholders by the estuary; Compute the hill line as a survey contour,
the viaduct as a wireframe carrying the fibre trunk and the mills as data halls; Code the hills behind the towers and Steam's viaduct arches carrying the elevated line. The
backdrop is rebuilt only when a heritage level crosses a quarter.

Within a scene: one wind (all smoke drifts to the right), places linked by routes their movers follow (Steam's
wagonway runs coal tubs pit → mills → quay), landmarks set on contact shadows / yards (`.cs`, drawn by the engine under
each application's landmark, styled per look), atmospheric haze between depth rows.

## Art styles (the drawing idiom of an Age)

Each Industry is drawn the way its period pictured itself. A **style** (`ArtStyle` in `style.ts`, one file per style
in `styles/`) owns *how* things are drawn; a **layout** owns *where*. A new Age gets a new style; a new Industry within
an Age reuses its Age's style with a new layout (`Layout.look` names the style).

| Style id | Idiom | Used by |
|---|---|---|
| `ledger` | Steel engraving from an illustrated paper, 1840s: hatch by depth, stipple sky, plate border, legend | Steam |
| `foundry` | Two-colour lithograph at night (M4): furnace orange over heavy ink, glow plates off register, Plate III | Iron & Steel |
| `harbour` | The ledger at dawn with an Admiralty chart for a cut-away (M4), Plate IV | Fishing |
| `gaslight` | Chromolithograph poster, 1890s: keylined flat shapes, stepped sky, halftone glow, lettered title and fascias | Light |
| `chrome` | Travel poster / airbrushed advert, 1950s–60s: gradient hills and sky, haloed sun, headline, contrails | Motion |
| `terminal` | Vector display / early CAD: phosphor wireframe, scanlines, isometric faces, text-mode labels, HUD | Compute |
| `cyberpunk` | Night megacity in rain: neon tube + halo, invented signage, wet reflections, rain, signal noise | Code |
| `agentic` | 2020s developer diagram (the v1 Code look, kept for generic scenes under that page theme) | — |
| `generic` | Follows the page's theme tokens | unknown industries |

A style defines:

- `css` — the `--s-*` tokens and the treatment of the shared drawing classes (`.b` body, `.b2`, `.rf`, `.k` line,
  `.K`, `.d` ink, `.w`/`.lit` windows, `.tr`, `.wa`, `.gd`, `.ac`, `.mt`, `.hz` hatch, `.gl` glow), scoped under
  `.scn[data-look=<id>]`, plus any classes of its own; also its sky (clean, smog and Steady State gradients);
- `defs(prefix)` — SVG patterns and gradients (hatch `h0–h3`, cross-hatch `x0–x3` by depth, `glow`, `pool`, `cyan`,
  `fade`, and its own: stipple, halftone screens, airbrush gradients, pipework);
- `props` — prop variants in the idiom (lookup falls back to shared props, any style, then a generic works);
- `wash(pf, clear)` — landscape colours that move with pressure and Steady State;
- `weather` — smog strength per band and a signal-noise strength;
- `plate(c)` / `legend(c)` — lettering and framing (an engraved legend under the picture, a poster title band, an
  advert headline, a HUD), from `Layout.caption`;
- `layers` / `noise` — extra animated overlays (rain) and a pressure-driven noise overlay.

To add one: write `styles/<id>.ts`, add it to `styles/index.ts` (or call `registerStyle(style)` from outside), put
its props in `props/<id>.ts`, and set `look: '<id>'` on the layouts drawn in it. The style wins over the page theme
(Code is always a night city, whatever the page look); only the `generic` layout follows the page look.

## Performance (M2)

- **One world per Industry, kept.** Each build keeps its own layers and animations; a switch back re-attaches it
  (`display: none` on the others, which also stops their CSS animations). At most six are kept; a build key change
  (stage, apps, heritage, Commons, landmark) rebuilds only that Industry. Def ids are unique per build.
- **Nothing restyles per frame.** Three things kept the main thread restyling every frame and are gone: Web Animations
  started before their sprite had a layout box ran on the main thread (they now start two frames after being shown);
  the auto-detail watcher's own rAF loop (now a passive long-animation-frame / long-task observer); the packet flow's
  `stroke-dashoffset` animation (now three dashed copies shown in turn by opacity).
- Measured in the demo (`node tools/scene-shot.mjs --switch`, 4× CPU, phone): style while animating 40–105 → ~0 ms/s;
  switching back to a kept Industry 1–7 ms of script.

## Performance (M3)

- **Hysteresis on everything pressure drives.** The weather layers, `--pf2`, `--pfc` and every plot's count move only
  when their input is a whole step past what is shown, so a value hovering at a boundary no longer starts an opacity
  transition or toggles a slot (and repaints its band) at every update.
- **Code's load-shedding** is a phase class stepped on the mid band every four seconds while under strain (one
  restyle and repaint per step), not a CSS animation inside the drawing.
- **Things lit by the hour** (Light's load) come on without the rise animation; Light's clock hand is a Web Animation
  on a sprite (composited); the town relights every 2.5 s only when the hour changes.
- **Measure:** `node tools/scene-shot.mjs [industries] --trace [--m3]` (a devtools timeline trace per Industry at its
  busiest state, 4× CPU, 10 Hz updates: style, layout, paint and layer ms per second; `JIT=pace|pressure|none` picks
  the jitter); `--perf --m3` and `--switch --m3` measure the M3 busiest state. `--m3` strips: `#strip=<id>&m3`;
  spots: `#spots`; stills: `#stills=<id>`.

## Performance (perf pass 2: the real page)

The demo measured the scene alone; on the real page it was most of the page's cost. What it was and what changed:

- **The host's rAF loop.** A `requestAnimationFrame` callback every vsync gives the page a main-thread frame every vsync,
  and Blink restyles every element under a running animation in every such frame, composited or not (the 30 smoke
  puffs, wheels, movers). The game loop is now a 10 Hz timer (src/ui/game.ts); the scene's own one-shot rAFs are fine.
  A host must not run a per-frame rAF loop over this scene.
- **No animation or transition inside the SVG.** The survey flag's flutter (`scn-flag`, on an SVG path) ran on the main
  thread and repainted its band every frame on every Industry with a staked plot: removed (the flag stands still).
  The reserve's drawings (`.rx .ry .dx .rsun .sx`) take `--res`/`--dep` on themselves, not on the world (a custom
  property on the world restyles every node of it), and a step of a fiftieth lands at once (`.tsnap`); a jump still glides.
- **`--smk-a`** is set on the sprite layers, not the bands (whose every drawing inherited it).
- **Spots in the page** are drawn without `standalone` (which inlines the whole scene stylesheet into the SVG): inserted
  into the document, that was a stylesheet change that restyled the entire page at every new headline. The page has the
  scene's CSS already; `standalone` is for an `<img>` or a saved file.
- The engine is a lazy part of the page (src/ui/lazy/scene.ts, loaded by src/ui/chunks.ts after the first paint); the
  pure adapter is imported directly.
- Proof the pictures are unchanged: before/after screenshots of all five Industries at early, late and crisis, phone and
  desk, motion reduced and time stopped, pixel-diffed (max channel difference ≤ 2 in all 30).

## Why SVG (and not canvas)

- **Every place is a real control.** Tap targets are HTML buttons laid over the picture, with labels; the art itself
  is DOM, so a selected place can be outlined and a text alternative is easy to keep true.
- **Crisp line art at any size and pixel density.** `vector-effect: non-scaling-stroke` keeps engraved lines one
  pixel wide on a phone and on a desktop; hatch patterns are chosen per depth so tone reads the same near and far.
- **Styling is CSS.** Props draw with a handful of classes (`.b` body, `.rf` roof, `.k` line, `.w`/`.lit` windows…);
  each art style restyles them. The same prop is an engraving under `ledger`, a silhouette under `gaslight`, a
  wireframe under `terminal`.
- **Cheap to animate when it is done carefully.** The drawing is static SVG and never repaints for motion. Moving
  things are HTML sprites (each a tiny overflow-visible SVG) in a 600 × 400 px plane scaled to the stage, animated
  only by transform and opacity on HTML elements, so the compositor runs them: smoke puffs and wheels by CSS, movers
  by Web Animations with concrete keyframes (no `var()` in keyframes, which neither composites nor travels well to
  Safari/Firefox). Only shown things animate (a hidden mover's animation would still tick on the main thread). Each
  depth band is split into static and sprite layers at the depth of every mover track, so a train passes behind
  nearer buildings (`MoverDef.z` overrides the depth). Capped (10 live chimneys, 4 in low detail), paused off-screen
  (IntersectionObserver) and when the tab is hidden, frozen at a Reckoning, and removed under reduced motion (movers
  then rest along their tracks). `update()` returns early when a coarse signature of the view has not changed. Rain
  is two tiled layers moved by transform; neon glow is a wide faint stroke, never a filter.
- **Detail.** `detail: 'auto'` watches 150 frames after each build while the scene is on screen and, if a quarter
  run over 24 ms, switches to low for the session: every second mover, 4 live chimneys, one rain sheet, no signal
  noise, no stepped packet flow.
- No libraries, no images: about 175 KB of TypeScript source (the whole demo page, engine and controls included, is about 120 KB minified).

## How inputs become pictures

| SceneView field | What you see |
|---|---|
| `apps[i].status` | hidden: empty ground with a faint dashed ghost of the landmark · available: surveyor's stakes and string, a flag and a pulsing pin · founded: the landmark (founding plays a scaffold-and-rise moment) |
| `apps[i].adoption` | density: more buildings in a stable seeded order growing out from the landmark, more trains/ships/vans/planes moving, more lit windows and lamps |
| `stage` (0–3) | the machines evolve: Newcomen → Watt → Cornish → turbine hall; locomotives, ships, cars, lamps, data halls and agents change shape |
| `pace` (from rFold) | smoke puffs faster and darker, wheels and beams turn faster, traffic speeds up (3 steps) |
| `reserveFraction` | Steam: the seam in the cut-away hollows out from the shaft and spoil heaps rise, and the old country (sheep, ricks, the cart in the ford, the waterwheel, the windmill) fades away; Light: gasholder bells sink; Motion: the oil lens shrinks and tanks empty; Compute: the reservoir drops to its contour rings and the aquifer under the floor shortens; Code: six lamplit rooms in the old block (a figure at a desk with the cat on the sill, a reader, two at a table, a guitarist, someone at the window, a child drawing) go dark one by one (`driver: 'reserve'`, `fade: true`), leaving a cold screen on in each; the first is the last left on |
| `pressureFraction` | weather and light: the sky browns, haze thickens with depth, the sun dims, landscape washes desaturate; Compute: a heat dome of isotherms over the campus; Code: magenta smog-glow and signal noise, cables, lean-tos, dead neon and pipework growing up from the street |
| `popFraction` | houses, terraces, towers |
| `crises` (increase) | a fog rolls across and the crisis name is shown |
| pressure ≥ 0.8 | root class `stress`: Code sheds load tower by tower, signs fail, emergency lighting comes on |
| `levers` | signs of restraint in the world: customs house or toll (duty), permit board (cap), allotments, cycle lane or a garden lot (sufficiency), windmill, turbines or solar (substitution), kiln (circularity), park (green spending), demolition that opens a gap of sky and stars in the skyline (deletion), a checkpoint (review gates), a library (shared libraries). The root also carries `lv-<kind>` classes so a style can react |
| `decoupling` / `steadyProgress` / `steady` | haze lifts with the streak; at Steady State the sky turns fresh, the wash greens, birds cross; Code: the rain stops, flicker stops, stars and a moon come out |
| `reckoning` | the world stops: every animation pauses, colour drains, a banner names the end |
| `pressureToClear` (M2) | the haze by band: as pressure falls towards the clear level, the near haze goes first, the far last |
| `clear` / `clearProgress` (M2) | clear skies: each style's fresh sky fades in over the 50 years (stars and thinner rain in the night city); `steady` completes it |
| `settled` / `settledYear` (M2) | the quiet look: slow wheels and soft smoke, no flicker or signal noise, a "held" wash in the style's colour, an emblem lettered "Settled 1841" in the style's idiom; never the Reckoning's grey |
| `commons` (M2) | civic buildings on each layout's civic sites (`Layout.commons`, else every third house of the town): baths and wash-house, people's park, mechanics' institute, free library, town clock, allotments, corporation buses, lido and cricket field (the shorter week), repair café, bank-holiday bunting (general projects show in whichever town is on screen); unknown icons get a civic hall. Levels 2–3 add a wing, villas, a bandstand, lamps |
| `landmark` (M2) | the Charter's landmark on `Layout.landmark`: a deep shaft, a cotton-town mill, a chapel, an orchard, a second viaduct, a great gasholder |

## Adding an industry

A scene is a **layout** (data) plus **props** (functions). Most of an industry is data.

1. Write `layouts/<id>.ts` exporting a `Layout`:
   - `look`: the art style of its Age (see above); `place`: a phrase for the text alternative; `caption`: what the
     style letters on or under the picture;
   - `backdrop(c)`: bespoke scenery for the `sky`, `far`, `mid`, `near` bands and the `cut` strip under the ground
     (return SVG strings; `bprop()` places a prop as scenery; `c.hatch(scale)` gives the right hatch);
   - `reserveWords(r)` (optional): the reserve in words for the text alternative;
   - `plots`: one per application, matched by `match: [iconKey | appId]`, with an `anchor` (the landmark), `slots`
     in the order they appear (use `scatter()`, `row()`, `weave()` from `layout.ts`), optional `movers` (things
     that cross: `{ p, x0, y0, x1, y1, dur, n }`), a tap `hit` rectangle and a survey `site`. Non-app plots use
     `driver: 'population' | 'pressure' | 'depletion' | 'light' | 'always'`; `overlayOf` draws lights over another
     plot's buildings (an overlay plot may also have its own anchor); `driver: 'reserve'` follows what is left;
   - `spares`: rectangles where an application with an unknown icon gets a generic works;
   - `restraint`: lever kind → slot.
   The viewBox is 600 × 400; the ground cut-away is y 372–400; `bands` and `depth` set where far/mid/near split and
   how scale falls off with distance.
2. Add bespoke props to the style's library (`props/<style>.ts`, or from outside with `registerProps(style, {...})`).
   A prop is `(a, out) => svgString`, drawn at its own origin (bottom centre, y up is negative), using the shared
   classes. `a.stage`, `a.v` (seeded variant), `a.w`/`a.h`, `a.r()` (seeded random) and `a.hatch()` are given;
   `out.fx('smoke' | 'steam' | 'spin' | 'rock' | 'blink' | 'flow', x, y, size, markup?)` adds motion.
3. Register it: `registerLayout('<sectorId>', layout)` (or add it to `LAYOUTS` in `registry.ts`).

Until then an unknown industry gets the generic layout (`layouts/generic.ts`): open country, a plot per application
using any prop library that knows the icon (else a generic works), houses, weather and restraint — so new content
never shows a blank.

## Demo and screenshots

`bun run tools/scene-demo.ts` → `dist/scene-demo.html` (self-contained). M2 controls: clear skies, settled, every
event (Market purchase and founding, stage, first backfire, decade, lever, Commons, landmark, Industry opens), a
highlight, a 10-second replay and "save picture". `#strip=steam&m2` shows clearing, steady, settled and Commons;
`node tools/scene-shot.mjs [industries] --m2` shoots it, `--switch` measures switching and style per second. Scrub every input, switch industry and look,
fire a crisis, call a Reckoning, toggle reduced motion, or press **Auto-play a run** (empty valley to collapse in
60 s). `#strip=steam` shows the seven stages frozen. `node tools/scene-shot.mjs [industries] [--perf]` writes
`shots/scene/` and measures frame timings with 4× CPU throttling.
