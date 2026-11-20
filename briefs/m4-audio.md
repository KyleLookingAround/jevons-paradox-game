# Brief: M4 AUDIO lane — Iron and the sea

You give Iron & Steel and Fishing their soundscapes, make hysteresis audible, and add three interface sounds (a wager, the
Act I credits, arrears). The design is `design/m4-design.md` §11.4; the engine and idiom are `design/sound-direction.md`
and `src/ui/audio/NOTES-m3.md`. Sound is off by default; nobody has heard it yet, so every claim is a measurement.

Do NOT edit anything outside `src/ui/audio/**` and the `tools/audio-*` files. No git writes.

## Standing instructions

- Keep `design/scratch/m4-audio-progress.md`; land one verified soundscape at a time.
- Synthesis stays off the main thread (M3's worker and queue); no audio files; driven only by `SceneView` (read the
  scene lane's README for the M4 fields: `feeds`, `fedBy`, `stock`, `capstoned`, `preview`).

## Your files

`src/ui/audio/defs.ts` (two `SoundscapeDef`s), `recipes.ts` (new recipes), `mix.ts` (new drivers), `types.ts` (event
kinds), `views.ts` (hand-made M4 views), NOTES; `tools/audio-industry.js` batches for the two Industries.

## Work

1. **Iron** (A aeolian: white notes, so the Coal Age's three neighbours differ by no more than the existing test allows;
   check the key test): the drop hammer as the pulse; a furnace roar bed that breathes with blast (built); tapping the
   furnace: a rising hiss and a granular shower of sparks; the rolling mill's pitched squeal and rumble; riveting tick
   trains; the converter's roar at stage 2; a nightjar at Steady State; crisis The Orange Night (the roar swells, an alarm
   bell in key).
2. **Fishing** (C ionian, white notes): sea swell on a slow LFO; a bell buoy in key; trawler chuffs and steam winches;
   the market bell; gulls and porpoise breaths driven by **`stock.truth`** (never by `reported`): the honest world. After
   `crossed`, while `scar` holds, the sea life stays thin and returns slowly after healing; the fleet sounds normal until
   it ties up. A moratorium: halyards and gulls only.
3. **Heritage**: Iron's hammer faint under Steam and Light; the bell buoy faint in Light's harbour edge.
4. **Interface**: `wager` (a coin on a counter, in the Age's instrument; win and lose variants a fifth apart),
   `actEnding` (a slower `ending`), `arrears` (a muffled toll), `thresholdCrossed` (the world's own: the gulls cut out
   over two seconds; no sting). Map the contract's event names as aliases.

## Budgets and checks

- Levels as `sound-direction.md`: empty −36 to −40, late −31 to −34 dBFS RMS; nothing above 1% beyond 6 kHz; no clicks
  (the detector); solo layers within ±6 dB of neighbours; crossfades into and out of Iron and Fishing dip ≤ 4 dB.
- Main thread: `update()` p95 ≤ 0.2 ms; scheduler tick p95 < 3 ms; recipe prewarm long tasks no worse than M3's at 4×
  throttle, measured **on the real page** with `tools/audio-live.cjs`, not only the bench.
- `bun test src/ui/audio`; `bun run tools/audio-bench.ts` and the run/summary pipeline per Industry.

## Final report

The two soundscapes' layers and drivers; every measurement against its target; what the owner should listen for first
(the gulls going quiet while the catch is still good).
