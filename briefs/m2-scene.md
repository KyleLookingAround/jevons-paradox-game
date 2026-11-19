# Brief: M2 SCENE lane

You extend the world scene engine of "Rebound" (`src/ui/scene/`) for milestone M2 ("Restraint has a game; run 2 is
different"). Four other lanes work at the same time and do not talk to you:

- core (`src/core/**`, `tools/balance.ts`);
- content (`src/content/**`);
- UI (`src/ui/*.ts` outside `scene/`, `src/main.ts`, `src/styles.css`, `index.html`, `tools/shot.mjs`, `tools/perf.mjs`);
- balance, afterwards.

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`. The UI lane calls
your public interface; if you change it, keep the old calls working and document the new ones in your README.

## Read first, in full

1. `src/ui/scene/README.md` and `src/ui/scene/types.ts` (your interface), `adapter.ts` (your only reader of the
   contract).
2. `src/types.ts` (search "M2"): `SectorDerived` (`clear`, `clearP`, `clearYears`, `sinkHeld`, `settled`, `stage`,
   `standingDrawIn`), `Derived.populationRef`, `GameState.events` and `GameEvent`, `GameState.commons`, `CommonsDef`
   (`icon`, `sector`), `CharterDef.landmark`, `UpgradeDef.stage`.
3. `design/m2-contract-notes.md`; `design/visual-direction.md`; the M2 "Scene" paragraph of `design/roadmap.md`.

## Your files (only these)

`src/ui/scene/**` (engine, adapter, types, styles, props, layouts, demo, tests), `tools/scene-demo.ts`,
`tools/scene-shot.mjs`.

## Work

1. **Adapter, new inputs** (`adapter.ts`, `types.ts`). Still pure, total and rule-free:
   - `stage`: use `SectorDerived.stage` when it is a number (clamp to your range); keep `machineStage()` only as the
     fallback when it is null.
   - `popFraction`: population / `Derived.populationRef` (0–1), so the town is scaled against the player's own peak
     rather than a constant; keep a gentle curve.
   - New `SceneView` fields (names yours): `clear` (bool), `clearProgress` (`clearYears / STEADY_STATE_YEARS`, 0–1),
     `pressureToClear` (how far `pressureFraction` is above `clearP / collapseAt`, 0–1, for a sky that clears
     gradually), `settled` (bool), `commons` (the founded projects of this Industry: `{ id, icon, level }` from
     `GameState.commons.levels` and `CommonsDef.sector`), `landmark` (the Charter's `landmark` if the Charter in force
     names this Industry), and `events` (the events of this sector newer than the last update, passed in by the host).
   - Events (fixed here so the UI lane can code against it without talking to you): `sceneViewFrom(content, state,
     derived, sectorId, events?: GameEvent[])`. The UI passes the events with seq greater than the last ones it handed
     over (all sectors; may be empty or absent); the adapter keeps those of this sector, plus sector-less ones it cares
     about, as `SceneView.events` in seq order. The engine reacts to each event once (remember the highest seq seen per
     scene; a `setSector` call resets nothing, since seqs are global). Never infer events by diffing views any more.
2. **Clear skies.** Below the sink line the weather goes: as `pressureToClear` falls, haze thins by band; when `clear`
   turns true the sky takes a distinct "clearing" state in each style (not yet the full Steady State look): stars at
   night in `cyberpunk`, a washed blue in `ledger`'s stipple, a lifted gradient in `chrome`. `clearProgress` brings the
   Steady State look in over the 50 years, replacing the M1 `steadyProgress` haze lift (keep `steadyProgress` for
   saves without M2 fields).
3. **A settled Industry's quiet look.** `settled`: motion slows to a calm idle (no puffing chimneys, slow wheels,
   lights steady), the palette shifts to the style's "held" wash, and a small emblem (a seal on the plate, a lettered
   "SETTLED 1840" in the legend) names it. It must read as calm, not dead: never the frozen-grey Reckoning.
4. **Commons props.** Props for the content lane's icon keys (`baths`, `library`, `park`, `allotments`, `institute`,
   `clock`, `shortweek`, `repair`; confirm the list against their report, and fall back to a generic civic building for
   any unknown key) in `ledger` and `gaslight` at least, with generic fallbacks for the other styles. Place them in the
   town near the population plots (add a `commons` slot list to each layout, or a shared placer). Levels add a small
   detail (a second wing, more lamps).
5. **The Market's purchases build themselves.** An `upgradeBought` event with `by: 'market'` puts a short scaffold on the
   machine or plot it affects (it rises and comes down over a few seconds), distinct from the player's founding moment;
   `appFounded` by `'market'` plays the founding moment with scaffolding but no player highlight. Cap concurrent
   scaffolds (three) and drop them under reduced motion (show a static scaffold for a few seconds instead).
6. **Events instead of diffs.** Use events for the crisis fog (`crisis`), the founding moment (`appFounded`), the
   machine change (`stageReached`, so the new machine appears with a flourish), a lever's sign going up
   (`leverEnacted`), a decade tick (`decade`: a brief brightening), Steady State (`steadyState`), settled
   (`settled`), Industry opened (`sectorOpened`, `ageBegins`), and `clearSkies`. Keep a fallback for hosts that pass no
   events (the demo, old saves).
7. **Demo and shots.** Extend the demo controls (clear skies, settled, Commons levels, a Market purchase, events) and
   `scene-shot.mjs` to capture: each style clearing, a settled Steam and a settled Code, Commons props in `ledger` and
   `gaslight`, a scaffold mid-rise.

## Rules that still hold

SVG; static scenery and movers in separate layers; motion only by transform and opacity on small elements; caps on
live effects; paused off-screen and in hidden tabs; reduced motion respected; no libraries, no images; every place a
real labelled control; the text alternative (`describe()`) updated to mention clear skies, settled and Commons.

## Checks

```
bunx tsc -p .                       # src/ui/scene clean
bun test src/ui/scene
bun run tools/scene-demo.ts
node tools/scene-shot.mjs --perf    # frame timings with 4× CPU throttling no worse than M1
```

Read the PNGs. Add adapter tests for every new field (null `stage` falls back; `popFraction` against `populationRef`;
`commons` filtered by sector; events filtered by sector; missing M2 fields on an old state give the M1 picture).

## Final report (concise)

- Files changed; new props and layout slots.
- The `SceneView` fields you added and how events reach the scene (the call the UI lane must make).
- Icon and landmark keys you support, and the fallback.
- Frame timings before and after.
