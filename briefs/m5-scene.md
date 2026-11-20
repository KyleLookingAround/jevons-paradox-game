# Brief: M5 SCENE lane — the Ministry window, Pryce in the landscape, Plenty's seed catalogue

You give the Other Chair its pictures: the Ministry window frame (the chrome of every Act II scene), Pryce's props in
every style (hoardings, court notices, bunting, the inspector figure, the exempt things), the concealment split, the
thaw at Take office, and a new art style, `seed`, for Plenty with its aquifer cut-away. Design: `design/m5-design.md`
§11; views and events: `design/m5-contract-notes.md` §§11, 12.

Do NOT edit `src/types.ts`, `src/core/**`, `src/content/**`, `src/ui/**` outside `src/ui/scene/`, `build.ts`,
`DESIGN.md`, `CLAUDE.md`. No git writes.

## Standing instructions

- Keep `design/scratch/m5-scene-progress.md`; one verified piece at a time.
- Measure on the real page at 390 × 844 (`tools/shot.mjs scenes` and the UI lane's `m5real`), never only in a demo;
  `tools/perf.mjs --check` on a copied `dist/`; long runs in the background to `design/scratch/m5-scene/`.
- Performance rules: no rAF loop; no CSS animation or transition inside the scene's SVG; no custom property on a scene
  root that many nodes inherit; only the active world in the document; each style ≤ 1,900 SVG nodes.
- One country throughout: Plenty's hills and river are the valley's, seen from the farmland.

## Read first

`design/visual-direction.md`; `src/ui/scene/README.md`; the `chrome` and `harbour` styles (an Age's style and M4's
newest); `design/m5-design.md` §§3.1, 6, 11.

## Your files

`src/ui/scene/**`: new `frame/ministry.ts`, `styles/seed.ts`, `layouts/plenty.ts`, `props/pryce.ts` (hoarding, court
notice, bunting, inspector, vans, borehole), extensions to `registry.ts` (single owner this milestone) and `SceneView`
readers; postcards for Plenty and the sealed postcard.

## Work

1. **The window frame** outside the scene's SVG band (a wrapper): airbrush mullions at the top corners, a sill the UI
   lane fills, curtains half drawn in Opposition. It must not shrink the picture at 390 px; it frames every Act II scene
   and the capstone's in a Ministry.
2. **Take office's thaw**: grey to colour inside the frame in a few steps on the 10 Hz timer (an API the UI lane calls);
   the frame may enter by a transform on the wrapper.
3. **Pryce's props**, shared across styles with a per-style tint: a hoarding per lever he lobbies ("Freedom of the
   Road"), a court notice draped on a litigated lever's sign, Pryce bunting on capstone works, the inspector figure
   walking to a landmark and back on an 'inspected' event, vans on the motorway while light trucks are used, a borehole
   with a pump-jack in Plenty while unlicensed wells are used, the congestion-charge gantry. Landmarks are tappable
   (hit areas the UI lane binds to inspect).
4. **The concealment split**: the scene keeps drawing true pressure (it already does); make sure nothing in the scene
   reads `reportedR`.
5. **`seed`** and Plenty's layout: flat stone-litho colour slightly out of register, crop rows as bands, centre-pivot
   circles from a low hill, the root-and-aquifer cut-away with the water table as a falling line, irrigation drawn down
   and return flow drawn up (thinning as the return share falls), the paper yellowing at high nitrogen (the Dust Bowl
   look), machines by stage (horse, tractor, pivot, drip lines), places growing out from a farmstead landmark.
6. **Postcards**: Plenty's crop; the sealed postcard for Compute and Code in a Ministry.

## Done means

Every item on the real page; Plenty ≤ 1,900 nodes; `tools/perf.mjs --check` passes at the `ministry` state (frames,
taps, tab switch, DOM, heap) and at the M4 states; screenshots at 390 × 844 of the frame, the thaw's final frame, each
prop and Plenty at three pressures, looked at by you.

## Verified by

`tools/shot.mjs scenes` and `m5real`; `tools/perf.mjs --check`; node counts logged in your progress note.
