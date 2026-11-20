# Brief: M4 SCENE lane — two new plates, the order book drawn, the honest sea

You draw M4's world: Iron & Steel as a foundry lithograph (`foundry`), Fishing as a harbour engraving with an Admiralty
chart in the cut-away (`harbour`), Iron's feeds visible in Steam's and Light's pictures, the Age dissolve, postcards for
the tab row, the capstone's settled look and arrears, the Preview mark, three new figures and spots for the new
headline keys. The design is `design/m4-design.md` §§4.2, 5.3, 11; the art history is `design/visual-direction.md`
("Art styles by Age", items 7 and 10, and the M3 pass).

Do NOT edit `src/types.ts`, `src/core/**`, `src/content/**`, the page outside `src/ui/scene/**`, `src/ui/audio/**`. No
git writes.

## Standing instructions

- Keep `design/scratch/m4-scene-progress.md`; land one verified piece at a time (scene tests green, a screenshot looked
  at **on the real page** at 390 × 844, not only in the scene demo).
- Performance rules (CLAUDE.md), binding: no per-frame `requestAnimationFrame` loop; no CSS animation or transition
  inside the scene's SVG (main thread, repaints the band); no custom property set on a scene root many nodes inherit;
  never insert a `<style>` per update; moving things composited as M3 did (sprites); nothing loops; reduced motion gets
  statics. One country: the same hills, coast and viaduct (`geography.ts`).

## Your files

`src/ui/scene/**` (single owner of `registry.ts` and `adapter.ts` this milestone): `styles/foundry.ts`,
`styles/harbour.ts` (or `harbour` as a `ledger` variant if that is cheaper), `props/foundry.ts`, `props/harbour.ts`,
`props/chart.ts`, `layouts/iron.ts`, `layouts/fishing.ts`, additions to `props/figures.ts`, `spots.ts`, `moments.ts`;
`tools/scene-demo.ts`, `tools/scene-shot.mjs`.

## SceneView additions (yours to define in `scene/types.ts`; write them in the README the day you add them — the audio
lane reads them)

- `feeds?: { to: string; factor: number }[]` on Iron; and on the fed Industry `fedBy?: { from: string; app: string;
  share: number }[]` (what to draw: a second track, iron hulls, a steel gasholder frame).
- `stock?: { reported: number; truth: number; surveyed: boolean; foreign: number; scar: boolean; crossed: boolean;
  moratorium: boolean }` on Fishing. **The rule:** the chart's stipple reads `reported` until `surveyed`, then `truth`;
  the world (gulls, porpoises, surface shoals, boats out) always reads `truth`. The adapter reads `truth` from
  `SectorDerived.stock.world` (the contract's field for the living world only; never compute game rules here).
- `capstoned?: { year: number; arrears: boolean }`, `preview?: boolean`.
- `figures` gains `pryceElder`, `skipper`, `naturalist`.

## Work

1. **`foundry` style**: two printed colours (furnace orange over ink), heavier blacks than `ledger`, slightly coarse
   registration; a plate legend in the `ledger` manner ("Plate III. — Ravensdale, by night"). **Iron layout**: the same
   country from across the valley (Steam's viaduct from the other side, the mill town's stacks far, a canal near);
   furnaces with hot-blast stoves and a flat orange glow plate each in blast; casting floor; converter shed (stage 2,
   the blow a flat flame cone); open-hearth shop (stage 3); the goods yard with wagons lettered by destination leaving
   the frame (the order book); slag heaps in the cut-away beside Steam's shared strata prop (both draws hollow it).
   Crises: The Orange Night (sky plated orange), The Slag Slide (a heap slumps; no figures).
2. **`harbour` style and Fishing layout**: dawn; harbour walls, smokehouses, the fish market hall, the quay railway,
   trawlers and drifters, open sea far. **The chart** replaces the cut-away (and may take half again its height):
   soundings, the banks, shoals as stipple, foreign sails as pennant-coloured glyphs (no real flags), the scar as blank
   grey water lettered "No fish found"; a survey vessel with a sampling net while surveyed; the fleet tied up at a
   moratorium or a failed bank. **Design it at 390 px first**: soundings legible or omitted, never noise.
3. **Feeds in other pictures**: Steam (a second track and new engine house for Rails; iron hulls for Ship plate), Light
   (a steel gasholder frame for Girders), Fishing (iron hulls). From `fedBy`, as `heritage` does.
4. **The Age dissolve** (item 10): two scene instances for about a second on `sectorOpened` for Iron and Fishing, along
   the shared horizon; reduced motion: a cut.
5. **Postcards** (item 7): `postcard(sectorId, view)` → a static 64 × 40 crop, rendered once per layout change; the
   settled wash, the capstone cartouche "Settled {year}", the Preview corner mark, the warning dot.
6. **Capstone look and arrears**: the settled wash and an engraved cartouche; in arrears the wash withdraws and smoke (or
   empty water) returns.
7. **Figures** (the three new cast, by Age, in each style) and **spots** for the new headline keys (threshold, scar
   healed, surveyed, arrears, foreign fleets, the act ending).
8. **Moments**: 'thresholdCrossed' (the shoals' stipple drains from the chart over a few seconds, once), 'surveyed' (the
   survey vessel puts out), 'scarHealed' (gulls return), 'capstoned' (the cartouche stamps), 'arrears'.

## Budgets (exit criteria)

- Iron and Fishing each ≤ 1,900 SVG nodes at their busiest; report Steam's and Light's node change from the feeds.
- `node tools/perf.mjs --check` on the real build at the M4 states (fresh, mid, late, `act1`): p95 frame ≤ 20 ms at 4×
  throttle; main-thread paint while animating near zero in Iron and Fishing; tab switch within budget with seven tabs.
- Nothing new drawn before its Industry or system; an M3 host draws the M3 picture (pixel check against M3 strips).

## Checks

`bun test src/ui/scene`; `node tools/scene-shot.mjs` per mode; then on the real page with the UI lane's `m4` shot mode at
390 × 844, light and dark. Look at each: is the chart readable on a phone; is the honest sea visible (gulls thin while
the gauge is still green); does the foundry read as the same country.

## Final report

What you drew; SceneView fields with exact meanings (for audio); node counts and frame figures before and after;
screenshot paths; contract gaps.
