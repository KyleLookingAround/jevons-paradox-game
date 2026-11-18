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
