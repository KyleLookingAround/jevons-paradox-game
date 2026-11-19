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
the disused viaduct, chimneys and Light's gasholders by the estuary; Compute the hill line as a survey contour and
the mills as data halls; Code the hills behind the towers and Steam's viaduct arches carrying the elevated line. The
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
| `reserveFraction` | Steam: the seam in the cut-away hollows out from the shaft and spoil heaps rise; Light: gasholder bells sink; Motion: the oil lens shrinks and tanks empty; Compute: the reservoir drops; Code: six lamplit rooms in the old block (a figure at a desk with the cat on the sill, a reader, two at a table, a guitarist, someone at the window, a child drawing) go dark one by one (`driver: 'reserve'`, `fade: true`); the first is the last left on |
| `pressureFraction` | weather and light: the sky browns, haze thickens with depth, the sun dims, landscape washes desaturate; Code: magenta smog-glow and signal noise, cables, lean-tos, dead neon and pipework growing up from the street |
| `popFraction` | houses, terraces, towers |
| `crises` (increase) | a fog rolls across and the crisis name is shown |
| pressure ≥ 0.8 | root class `stress`: Code sheds load tower by tower, signs fail, emergency lighting comes on |
| `levers` | signs of restraint in the world: customs house or toll (duty), permit board (cap), allotments, cycle lane or a garden lot (sufficiency), windmill, turbines or solar (substitution), kiln (circularity), park (green spending), demolition that opens a gap of sky and stars in the skyline (deletion), a checkpoint (review gates), a library (shared libraries). The root also carries `lv-<kind>` classes so a style can react |
| `decoupling` / `steadyProgress` / `steady` | haze lifts with the streak; at Steady State the sky turns fresh, the wash greens, birds cross; Code: the rain stops, flicker stops, stars and a moon come out |
| `reckoning` | the world stops: every animation pauses, colour drains, a banner names the end |

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

`bun run tools/scene-demo.ts` → `dist/scene-demo.html` (self-contained). Scrub every input, switch industry and look,
fire a crisis, call a Reckoning, toggle reduced motion, or press **Auto-play a run** (empty valley to collapse in
60 s). `#strip=steam` shows the seven stages frozen. `node tools/scene-shot.mjs [industries] [--perf]` writes
`shots/scene/` and measures frame timings with 4× CPU throttling.
