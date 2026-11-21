# Soundscape: M5 notes (measured, not heard)

Nobody has listened to any of this, the lane that made it included (it cannot hear). Every figure is an offline render
through the real engine in headless Chromium (48 kHz, default volumes), a live run at 4× CPU throttle, or the real
built page. Reproduce at the end.

## The Ministry room and the window (`defs.ts` `MINISTRY_ROOM`, engine `applyRoom`)

Read from `SceneView.chair` (non-null in a Ministry, on every Industry's view; `opposition` draws the curtains). Also
accepted: `ministry.inOpposition` or a top-level `inOpposition` (earlier requested shapes). Absent: nothing changes.

- **The room** is not an Industry: a graph of its own beside whichever Industry is showing, built the first time a view
  says office, so a tab switch does not crossfade it. The clock on the mantelpiece: `watchTick` at rate 0.42, tick and
  tock, once a second at a fixed 60 bpm (its own time, not the Industry's), close and dry. Outside, through a 950 Hz
  glass low-pass: a brown-noise traffic wash and now and then a car (`carPass`, ~1 in 9 s).
- **The window**: in office the Industry's air is capped at 4200 Hz and its world gain × 0.85; in Opposition the air at
  1150 Hz, world × 0.6, and the traffic through 380 Hz, × 0.6. The Industry's layers are untouched (a test checks).
- Room alone: −43.0 dBFS RMS (office), −47.5 (Opposition); peaks −24.4 / −30.9. Each Industry at `mid`, out of office /
  in office / in Opposition: Steam −35.2 / −35.7 / −38.8; Iron −35.1 / −35.6 / −39.0; Motion −33.8 / −34.5 / −37.6;
  Plenty −36.9 / −37.0 / −40.5; Compute −38.0 / −37.9 / −41.2; Code −35.6 / −36.0 / −39.8. So office reads as the same
  loudness, darker; Opposition 3–4 dB quieter and darker still.
- Clock: every gap 1.000 s, also across tab switches in office (crossfade dip ≤ 0.1 dB). On the real page the clock
  lost two ticks at each tab switch (the new Industry's warm-up evicted its two buffers from the synthesis bank): its
  buffers are now pinned and it is scheduled 2.5 s ahead; 32 ticks in 28 s on the real page, all 1.000 s apart.

## Plenty (`defs.ts` `plenty`), G ionian (+F♯: Motion's and Compute's note set), 52–80 bpm, palette chrome

| Layer | What | Driven by |
|---|---|---|
| `wind` | wind over the fields | always, more when empty |
| `wheat` | the wheat rustling in gusts | Bread grain, `built`; thins under stress |
| `larks` | skylarks (the bird recipe) | empty, Steady State; gone in haze |
| `team` | a team at the plough: hooves on soft earth, harness (new `plough`) | stage 0 |
| `tractor` | the tractor's putter on the half-beat (`trawler` at 1.3) | stages 1–3 |
| `pivot` | the centre pivot's hiss, sweeping | stages 2–3, × `spray` |
| `drips` | the drip lines' drops | stage 3, more as `spray` falls |
| `pump` | **the aquifer's clock**: stroke and gulp (new `pumpThud`), lower as the reserve falls | always; every 2 beats, every bar below reserve 0.55, every other bar below 0.2 |
| `borehole` | Pryce's unlicensed borehole: a second, quicker pump, right | `exempt` includes 'borehole' |
| `grain`, `freight`, `town` | grain train, air freight, town | Bread grain / Fertilised fields, Air-freighted produce, `pop` |
| `dust` | the wind lifting the topsoil | stress, haze |

`spray` = clamp((returnShare − 0.1) / 0.32) from `SceneView.water.returnShare` (1 when absent): flood 0.5 and pivot
0.425 → 1; nozzles 0.34 → 0.75; drip 0.136 → 0.11. So drip thins the hiss to a ticking of drops: less water seen, more
water gone (the hidden flow, by ear). `grid.by` (new, defs) slows a pulse in whole doublings so the export's loops stay
whole-bar. Crisis: the generic swell and church bell. Heritage trace: `pump` (× 0.6).

Levels (14 s, from 3 s): empty −39.1, early −38.3, mid −36.9, late −34.4, crisis −34.1, steady −35.7 (Fishing −36.7 to
−32.9). Peaks ≤ −13.8; > 6 kHz ≤ 0.36%; 0 clicks. Pump strokes 1.86 / 3.72 / 7.43 s apart at reserve 1 / 0.5 / 0.15.
Crossfades: Motion→Plenty 0, Plenty→Motion 0, Plenty→Compute −0.3, Compute→Plenty −0.4, Fishing→Plenty 0 dB.

Motion: `vans` also rises with `exempt` 'vans' (light trucks exempt).

## The Ministry's moments (interface kinds named as the contract's events)

| Kind | What | Peak / RMS alone (Motion) |
|---|---|---|
| `officeTaken` | the Gazette: a paper boy's two-note cry ("Ex-tra!", a minor third down, through two formants) in the street, twice, the second further off; then the clock. Once per 20 s; ducks the world | −13.8 / −29.4 |
| `electionCalled` | a murmur rises and settles (seven voices of formant noise) | −16.7 / −32.3 |
| `electionWon` | the count bell (on the fifth), a cheer and applause | −17.1 / −33.8 |
| `electionLost` | the count bell (on the tonic), a murmur dying, a door closing | −14.8 / −40.1 |
| `inspected` | four footsteps coming closer, a stamp at 2.15 s | −15.4 / −39.6 |
| `concealmentFound` | a heavier stamp; lands 2.7 s after an `inspected` that just played (both arrive in one step) | −17.5 / −41.7 |
| `rivalAnswered` | label 'lobby' → `lobbied` (a hoarding pasted up: three wet brush strokes, the sheet slapped flat); 'litigate' → `litigated`; any other answer silent | −17.1 / −35.4 |
| `litigated` | one gavel; never twice within 2 s (the answer and the court event in one step strike it once) | −18.1 / −44.8 |
| `loopholeUsed` | a side door: the latch, a creak, the latch | −17.3 / −42.6 |
| `loopholeClosed` | a quill, then the blotter rocked | −16.4 / −36.3 |
| `treaty` | a signature, the seal pressed, a slow cadence over a held chord; ducks the world | −12.8 / −27.2 |

References: buy −18.6 / −47.1, lever −17.1 / −43.1, reveal −12.3 / −25.0. All 0 clicks, energy above 6 kHz ≤ 0.03%.
Physical sounds are the same in every palette; the bells and the Treaty's cadence take the Industry's key and
instrument. Not given a sound (by design): `ministryDefeated` (the lost election and the Reckoning carry it),
`leverRepealed`, `carveOut`, `compensated`, `loopholeOpened`, `playbookLearnt`, `articleBought`.

## Size

The `audio` part is **32.6 KB gz** (35.7 before M5, budget 38), with all of the above. The recipes had been shipping
twice: `WORLD_RECIPES = Object.keys(W)` is a top-level call, so the main-thread bundle kept the whole recipe table
beside the worker's copy (engine.ts imports constants from recipes.ts). Marked `/* @__PURE__ */`, it is dropped; M5's
own additions cost about 3.7 KB gz (recipes +1.1 in the worker string, defs and engine the rest).

## CPU

Bench (offline, 600 updates): `update()` p95 0.1 ms (Plenty, Motion); tick p95 0.2 / 2.5 ms (offline synthesis in the
tick). Live demo at 4× (`audio-live.cjs 4 30 plenty`): update p95 2.7 ms, tick p95 1.8 ms; 8 long tasks with sound, 7
without (the scene's). Soundscape-only page (`audio-stall.cjs 4`, now with office, a tab switch in office, Opposition,
Plenty and all eleven M5 kinds): 0 long tasks in two runs; M5 `event()` ≤ 7.4 ms on the main thread, mostly ≤ 1.2.

## Export (the DAW panel)

Plenty is in `EXPORT_INDUSTRIES` and the Great Acceleration; stem groups air, machines, water, pump, trade, dust; a
shared stem `ministry` (`room:*`); states `office` and `opposition` (loops for Motion and Plenty; any Industry from the
state menu); twelve M5 one-shots (`office-taken` … `treaty`, and `inspected-found`). The export's beat clock reads only
the Industry's graph (the room keeps 60 bpm). Checked: Plenty stems (late, 29 s) sum to the mix at −89 dB residual;
Steam in office loops seamlessly; Plenty loops are `loop-xfade` (an event crosses the seam); every WAV valid.

## Reproduce

```
bun run tools/audio-worker.ts                    # after changing recipes/synth/music/jobs
bun test src/ui/audio
bun run tools/audio-bench.ts
node tools/audio-run.cjs "$(cat tools/audio-m5.js)" m5.json                  # shots/audio/m5-*.png
node tools/audio-run.cjs "$(sed s/SECTOR/plenty/ tools/audio-industry.js)" plenty.json && python3 tools/audio-summ.py plenty.json
bun run tools/audio-demo.ts && node tools/audio-live.cjs 4 30 plenty         # "Audition the M5 sounds" in the demo
node tools/audio-stall.cjs 4
bun run build.ts && node tools/audio-real.cjs fixtures/m5/ministry-1.json    # the real page, in office
```
