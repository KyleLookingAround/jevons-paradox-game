# Brief: M3 SCENE lane

You give the living scene of "Rebound" the M3 mechanics and moments: seams in Steam's cut-away, Light's load as lit
windows by hour, Motion's sprawl that stays, Compute's "free" made visible, the cast as small figures where it suits,
engraved spot illustrations per headline key, the Reckoning as the frozen scene, before-and-after pictures, the
proprietor and his watch. Other lanes work from the same contract and do not talk to you: core, content, UI (owns the
page and calls your API), audio (reads the same SceneView); balance comes after.

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`.

## Standing instructions

- You will be interrupted by container restarts and usage limits. Keep a progress note at
  `design/scratch/m3-scene-progress.md`; land one verified piece at a time (scene tests green, a screenshot looked at).
- Make no git writes; the coordinator commits.

## Read first

`src/ui/scene/README.md` and `types.ts`; `src/types.ts` M3 views (`SeamsView`, `LoadView`, `TravelView`,
`SectorDerived.free/upkeep`, `SettledState.load/travel`, `RunSummary.sectors` M3 fields, the M3 event kinds, `CastDef.figure`);
`design/visual-direction.md` (items 2, 3, 6, 8 and "What the scene still lacks"); `design/m3-contract-notes.md` §0–§1.

## Your files (only these)

`src/ui/scene/**` (you alone own `registry.ts` and `adapter.ts`), `tools/scene-demo.ts`, `tools/scene-shot.mjs`.

## The SceneView additions (yours to define, all optional, in `scene/types.ts`)

The adapter reads the contract and fills, per Industry: `seams?: { sunk: number; total: number; next: boolean }`;
`load?: { hours: number[]; factor: number }` (normalised to the peak); `travel?: { speed: number; sprawl: number;
sprawlShare: number }`; `free?: { apps: string[] }` (ids of apps with a nil or flat seen price); `figures?: string[]`
(cast figure keys of the pending dispatch's writer, if any, and the proprietor once `meta.flags.proprietor`);
`watch?: number` (0–1: how often the proprietor checks his watch, from `Derived.survey.decisionsPerHourAfter` against
`Before`, 0 before the reveal). Each feature's field is absent while that feature is off (the adapter checks the same
`Derived.features` the UI does, or simply the null views). The audio lane reads these too: write them down in the
README the day you add them.

## Work

1. Steam: seams as strata in the cut-away, sunk ones with a shaft and a lit gallery, the next as a dotted shaft when
   reachable; deeper seams darker. Iron later shares this cut-away (M4): keep it a reusable prop.
2. Light: windows lit by hour from `load.hours` — the scene's clock walks the 24 hours slowly (a day in about a minute,
   reduced motion: a still at the peak hour), and the night uses (night shifts, trams) light their buildings in the
   hollows.
3. Motion: sprawl that stays: suburbs drawn from `travel.sprawl` (not adoption), so they remain when demand falls;
   congestion as queues on the arterial from `1 − speed`.
4. Compute: "free" made visible: the free uses' halls carry no meter on the cable (a struck-through price plate), and a
   thin cable to an "elsewhere" billboard (the bill paid by advertising).
5. The cast as small figures where it suits (a correspondent with a notebook at the station; Fenwick at the baths;
   Pryce at the motor show), only for the writer of a pending dispatch, gone when answered.
6. Engraved spot illustrations per headline key (item 6): a `spot(key, look)` export, about twelve spots covering every
   `HeadlineKey` including the M3 ones (seam sunk, a letter, a lever biting, the household survey, the ending), in each
   Age's style.
7. The Reckoning as the frozen scene (item 2) and the run summary as before and after (item 3): a still from a view
   rebuilt from `RunSummary` (peak adoption, peak pressure, stage, and the M3 seams, load factor, speed, sprawl).
8. The proprietor (item 8's row of people): a figure who checks his watch at the `watch` rate; at the ending, the whole
   valley under clear skies with the cast in the street.
9. Moments: 'seamSunk' (a shaft sinks, a puff of steam), 'biteBack' (the side effect appears: heavier cars, a new
   hall), 'ending' (the sky clears completely, the paper boy). Nothing loops; reduced motion gets statics.
10. The open items in `design/visual-direction.md`'s M2 pass (Compute's far campus, Motion's front gardens and parade
    of shops, Code's service ducts, Steam's foreground fields) as time allows, after the above.

## Checks

`bun test src/ui/scene`; `node tools/scene-shot.mjs` (one mode at a time); the scene's own frame budget as before (no
regression in `tools/perf.mjs`'s scene numbers: p95 frame ≤ 20 ms at 4× throttle).

## Exit criteria (yours)

Each of the four mechanics visible in its Industry's picture; spots for every headline key; the frozen Reckoning and
before-and-after stills; the proprietor's watch; moments for the three M3 events; nothing new drawn before its feature;
no performance regression.

## Final report (concise)

What you drew, the SceneView fields you added (with their exact meaning, for the audio lane), screenshots' paths,
frame numbers, contract gaps.
