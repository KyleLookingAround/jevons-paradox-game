# Visual direction: what else should become a picture

The owner asked: "I'd like to see a world with the mines and the railways and everything instead of just boxes with
text. Make everything more visual." The living scene (`src/ui/scene/`) answers the first half. This list answers the
second half. It is ranked by how much each item adds to the feeling that the player's choices *made* the world, for
the effort. Sizes: S ≈ half a day, M ≈ one to two days, L ≈ three days or more. Nothing here is built yet; the main UI
lane picks from it. Every item reuses the scene's prop libraries and look CSS, so the art stays one family.

## 1. Upgrade cards show the machine changing (M)

The central joke deserves a picture. An efficiency card shows a small before-and-after: today's engine on the left,
the one you are buying on the right (the scene's `engine` prop at stage n and n + 1, or the locomotive, lamp, car or
data hall for other industries). Under it, after the reveal, a *third* frame: the valley "this decade" with more
chimneys (a miniature scene rendered at the projected density from `UpgradeView.projectedDecade` and
`bringsWithinReach`). The big green "−60% coal" sits over a picture that gets busier. No words needed.

- Needs: a `renderProp(look, key, args)` helper exported from the scene (a few lines) and a "mini scene" mode of
  `createScene` (fixed size, no card, no motion).
- Contract: nothing new; the stage for "next" is the stage `machineStage()` would return with one more efficiency
  upgrade owned.

## 2. The Reckoning is the scene at its end (S)

When `pendingReckoning` is set the scene already stops, drains of colour and names the end. Use it full-bleed as the
Reckoning screen: the frozen valley under the cause banner ("Coal: spent."), the broadsheet headline beneath, and the
"Face the Reckoning" button. The player sees exactly what they built, stopped.

- Needs: let the main UI mount a second scene instance (or move the existing one) into the Reckoning sheet.

## 3. Run summary as before-and-after pictures (M)

Replace the two bars with two pictures of the same valley: as it was at the start of the run, and as it was at the
end, side by side or as a slider. Under them the two numbers (efficiency ×18, coal ×2.3). This is the screenshot
moment people will share.

- Needs: the end-of-run SceneView captured at the Reckoning (the UI can keep the last view it rendered), and a
  "start" view (all hidden but the first application, stage 0, clean air).
- Contract wish: `RunSummary` could carry per-sector peak adoption and peak pressure so the "after" picture can be
  rebuilt after a reload (today only `etaFold`, `peakRFold` and `resourceUsed` are stored).

## 4. The reserve as a seam cross-section (S)

The scene's cut-away strip already hollows out the seam from the shaft. Promote it to the reserve gauge: a thin
cross-section under the twin gauges (coal seam, oil lens, reservoir, the attention sun) instead of a progress bar,
with "≈ 37 min left" as the only text.

- Needs: export the cut-away art per layout as a standalone strip.

## 5. Levers as things in the world (M)

Each counter-lever card gets the same sign of restraint the scene shows when it is in force (the customs house,
the permit board, allotments, the windmill, the bulldozer clearing ground), drawn grey and dashed when off and in ink
when enacted. Raising a level adds to the picture (a second permit sheet, a taller windmill, more allotment strips).
Tapping a sign in the scene could open its lever card.

- Needs: `levers` already reach the scene; add `onSelectLever` to the scene interface and hit rectangles for
  restraint props.
- Design wish: "a lever that itself rebounds" (design/proposals.md) would show here too: the bypass road round the
  toll gate.

## 6. The broadsheet with engraved spot illustrations (M)

Each headline key gets a small engraving in the masthead column: a crisis (fog over chimneys), a founding (the
landmark under scaffold), a reveal (Jevons's pamphlet), a Steady State (the clear valley with birds). Ten to twelve
spots cover every `HeadlineKey`, drawn in the industry's look.

- Needs: a `spot(key, look)` function in the scene props; the news item's `key` and `sector`.

## 7. Industry tabs as postcards (S)

The tab chips become tiny live thumbnails of each industry's scene (a 64 × 40 crop of the landscape, static), with
the warning dot when its pressure nears a crisis. Locked industries show their ghosted empty land with the survey
stakes.

- Needs: the mini-scene mode from item 1, rendered once per structure change (cheap: no animation).

## 8. Wellbeing and population as people (S)

The population figure becomes a little row of figures at the scene's edge (or in the top bar) that grows and thins
with population and stoops when wellbeing falls below subsistence. Wellbeing at target: they stand straight.

- Needs: nothing new (`population`, `wellbeing`, `wellbeingTarget` are in Derived/Content).

## 9. Hindsight shop as a drawing office (M)

Know-how nodes drawn as blueprints of better machines (cyanotype lines); Institutions drawn as buildings (a
Statistics Office, a standing customs house, a commons) that will stand in the next run's scene from minute one.
Seating an institution places its building in a preview of next run's empty valley.

- Needs: institution → restraint prop mapping (by the lever kind its `startLever` names); a mini scene.

## 10. Era/Age transitions as a dissolve (S)

When a new industry opens, cross-fade from the old scene into the new one along a shared horizon (Steam's valley at
noon dissolving into Light's town at dusk). It sells "the same country, later".

- Needs: two scene instances stacked for a second; `ageBegins` / `sectorOpened` headlines as the trigger.

## Smaller touches (S each)

- The big sell button shows a lump of coal (or a lamp, a fuel can, a chip, a cursor) that jumps into the scene when
  pressed.
- The rebound meter's "Backfire" glow takes the colour of the scene's smoke.
- Formula sheets get a tiny diagram: the price falling, the demand curve, the coal pile.
- Achievement badges as engraved medals with the landmark of the industry that earned them.

## What the scene still lacks (for the scene lane, not the UI lane)

- Hand-tuned seasonal or time-of-day variation (Steam at dusk late in its age would bridge into Light).
- Bespoke props for planned industries (iron and steel, agriculture, fishing, freight, comfort, proof-of-work); the
  generic fallback covers them meanwhile.
- A visible "lock-in" for Motion (suburbs that stay when demand falls) and a visible "indirect rebound" link between
  industries (Light's glow appearing in Steam's sky).

## Art styles by Age

The owner: "slightly different art styles throughout would be cool. eventually a cyberpunk world." The game's history
is told by its drawing style as well as its contents: each Industry is drawn the way its period pictured itself, so
leafing through the tabs is leafing through 250 years of illustration. What stays constant so it reads as one game:
the 600 × 400 picture with a horizon in its upper third, far/mid/near bands with haze between them, the cut-away strip
under the ground, places that grow outward from a landmark as adoption rises, survey stakes for a site to found,
weather as pressure, the frozen grey world at a Reckoning, and the same tap behaviour. In code a style is an
`ArtStyle` (`src/ui/scene/style.ts`); an Industry's `Layout` names its style. A new Age gets a style; a new Industry
in an Age reuses it with a new place.

Built (Act I and the Attention Age):

| Industry (era) | Style id | Idiom | What makes it that idiom |
|---|---|---|---|
| Steam | `ledger` | Steel engraving from an illustrated paper, 1840s | Ink line, hatch and cross-hatch chosen by depth, stipple sky, engraved sun, a double-ruled plate border and a legend under the picture ("Plate I. — The coal valley, looking towards the sea.") |
| Light & Current | `gaslight` | Chromolithograph poster, 1890s | Flat inked silhouettes with a dark keyline, a stepped (not smooth) dusk sky, glow printed as three halftone screens, a lettered title band, lettered shop fascias (TEAS, DRAPER, OYSTERS…) |
| Motion | `chrome` | Mid-century travel poster and airbrushed motoring advert | Airbrushed gradient hills, ground and sky, a haloed sun, glossy cars, an italic headline ("THE OPEN ROAD — by motor, to everywhere"); contrails accumulate across the optimistic sky as flying spreads, then the haze |
| Compute | `terminal` | Vector display and early CAD, 1980s | Phosphor wireframe, scanlines, a perspective floor grid, isometric extrusions, text-mode labels on landmarks (`[ SHEETS.01 ]`, `[ TRAIN/CLUSTER ]`), HUD brackets and headers |
| Code | `cyberpunk` | Night megacity in rain | Dense verticals, magenta/cyan/amber neon on near-black (tube plus halo, no blur), invented signage, holographic hoarding, wet reflections, rain, signal noise as pressure, pipework growing up from the street as debt |

Proposed for the planned Industries (`design/long-game.md`), in calendar order:

| Industry / Age | Proposed style | Why it fits, and what it would do |
|---|---|---|
| Iron & Steel (Act I, beside Steam) | **Foundry lithograph** (S–M, reuses `ledger` props) | Same Age as Steam, so the same engraved family, but tinted lithograph: two printed colours (furnace orange over ink), heavier blacks. The Black Country at night: blast furnaces whose glow is a flat orange plate, slag heaps as the cut-away. Shares the valley's geography (the viaduct seen from the other side). |
| Plenty (Act II) | **Seed catalogue / agricultural print, 1910s–50s** | Flat bright stone-litho colour with registration slightly off, crop rows as decorative bands, a scale-and-diagram feel (cut-away of groundwater and roots). The Dust Bowl as the paper itself yellowing and the colour plates drifting out of register. |
| Comfort (Act II) | **Appliance catalogue, 1950s–60s** | Cutaway house in clean pastel airbrush with callout lines and catalogue numbers, every room filling with fridges and heaters; ozone as a cold sky band. Shares `chrome`'s airbrush engine with a different palette (mint, cream, chrome trim) and an interior rather than a landscape. |
| Freight & Flight (Act II) | **Airline route map and nautical chart, 1960s–70s** | Top-down, unlike every other scene: a coast and ocean drawn as a chart (soundings, rhumb lines), arcs of routes multiplying, container ships as moving glyphs, airports as roundels. The "two ledgers" mechanic suits a map that shows where things are made and where they are used. (Fishing, if it is added, belongs here too: the same chart with banks and quotas.) |
| Proof-of-work (Attention Age, beside Compute) | **Terminal, red-shifted** | Same vector display as Compute but in amber-red on black, warehouses of rigs as dense hatched blocks, a hash-rate oscilloscope as the sky. A deliberately ugly sibling. |
| Transition (2020–2100) | **Solarpunk, but not naive: risograph** | After cyberpunk the obvious move is solarpunk (greenery, light, community), and the owner will expect it; I would draw it as a two- or three-colour risograph zine (fluoro pink, teal, yellow on off-white, visible grain), which keeps it handmade and slightly rough. That matters: the Transition's pressure is critical minerals, so the bright clean city needs visible mines in the cut-away and a horizon of extraction, or the art lectures. Steady State there should look like maintenance, not utopia. |
| Long Now / post-game | **Archive plate** | The whole history recapitulated: each Industry's scene reprinted small, in its own style, on one archival sheet, with the player's own peaks marked. |

What each new style needs: a `styles/<id>.ts` (tokens, class treatments, defs, plate or legend, washes, weather
weights), a props file for its distinctive props (the shared props render acceptably in any style meanwhile), and a
layout per Industry. Rough sizes: a style in an existing family (Iron, Proof-of-work) is S–M; a new family (Plenty,
Freight & Flight's top-down chart, Transition) is L.
