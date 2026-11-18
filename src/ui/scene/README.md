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
  // money?: (n) => string, num?: (n) => string
});
scene.update(sceneViewFrom(content, state, derived, sectorId)); // up to 10×/s: patches in place
scene.setSector(id);   // on tab change (clears the selection; the next update rebuilds)
scene.select(appId | null); scene.setReducedMotion(bool | null); scene.describe(); scene.destroy();
```

`sceneViewFrom` (in `adapter.ts`) is the only code that reads the contract. It is pure and total (never throws) and
holds no game rules: it reads `Content`, `GameState` and `Derived` and maps them to cosmetic fractions (`SceneView`
in `types.ts`). The scene ships its own CSS (`css.ts`, injected once as `<style id="scn-css">`), reading the page's
theme tokens (`--ink`, `--bg-solid`, `--accent`, …) with fallbacks.

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
- **Cheap to animate when it is done carefully.** Static scenery and moving things live in separate SVG layers;
  only fx layers repaint each frame. All motion is CSS transform/opacity on small elements (smoke puffs, trains,
  wheels, beams), capped (12 live chimneys), paused off-screen (IntersectionObserver) and when the tab is hidden,
  and removed under reduced motion (movers are then placed along their tracks so the picture is still informative).
  Rain is two tiled layers moved by transform (composited); neon glow is a wide faint stroke under the tube, never a
  filter; flicker is opacity steps on a handful of signs.
- No libraries, no images: about 175 KB of TypeScript source (the whole demo page, engine and controls included, is about 120 KB minified).

## How inputs become pictures

| SceneView field | What you see |
|---|---|
| `apps[i].status` | hidden: empty ground with a faint dashed ghost of the landmark · available: surveyor's stakes and string, a flag and a pulsing pin · founded: the landmark (founding plays a scaffold-and-rise moment) |
| `apps[i].adoption` | density: more buildings in a stable seeded order growing out from the landmark, more trains/ships/vans/planes moving, more lit windows and lamps |
| `stage` (0–3) | the machines evolve: Newcomen → Watt → Cornish → turbine hall; locomotives, ships, cars, lamps, data halls and agents change shape |
| `pace` (from rFold) | smoke puffs faster and darker, wheels and beams turn faster, traffic speeds up (3 steps) |
| `reserveFraction` | Steam: the seam in the cut-away hollows out from the shaft and spoil heaps rise; Light: gasholder bells sink; Motion: the oil lens shrinks and tanks empty; Compute: the reservoir drops; Code: the few warm windows with a person in them dwindle among the cold machine light (`driver: 'reserve'`) |
| `pressureFraction` | weather and light: the sky browns, haze thickens with depth, the sun dims, landscape washes desaturate; Code: magenta smog-glow and signal noise, cables, lean-tos, dead neon and pipework growing up from the street |
| `popFraction` | houses, terraces, towers |
| `crises` (increase) | a fog rolls across and the crisis name is shown |
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
