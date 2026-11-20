# Soundscape: M4 notes (measured, not heard)

Nobody has listened to any of this, the lane that made it included (it cannot hear). Every figure below is an offline
render through the real engine in headless Chromium (48 kHz, default volumes) or a live run at 4× CPU throttle.
Reproduce at the end.

## Keys

Iron **A aeolian**, Fishing **C ionian**: both on the white notes, like Steam (D dorian) and Light (G mixolydian), so
the whole Coal Age shares one note set and Motion (C lydian, +F♯) is one note away. The key test now walks
steam, light, iron, fishing, motion, compute, code.

## Iron & Steel: the foundry by night (`defs.ts` `iron`)

| Layer | What | Driven by |
|---|---|---|
| `night` | night air (pink, slow filter drift) | always, thinning as the works fill |
| `furnace` | the furnace roar (brown, 170 Hz), breathing every other beat | any application founded (a soft step), `built`, `pace` (brighter) |
| `blast` | the blowing engines' breath on the same cycle | `built`, `pace` |
| `hammer` | **the drop hammer: the pulse**, on the beat, heavier on the one; anvil ring on A | any application founded, `built` |
| `tap` | tapping a furnace (~1 in 34 s): a rising hiss, a granular shower of sparks (140 metal grains, 1.9–4.1 kHz), the runner's roar | `built`, `pace` |
| `rolling` | a bar through the rolls: rumble, a squeal on degree 4/2/7 (the key), a clank at each end | Rails, Ship plate, Fencing wire |
| `rivets` | riveters' trains of blows | Bridges & girders, Ship plate |
| `cans` | tin cans down a chute | Tinplate & cans |
| `lathes` | machine-tool tones in beating pairs | Machine tools |
| `converter` | the Bessemer blow (stage 2 only) | `built`, `pace` |
| `hearth` | the open hearth's hum (stage 3 only) | `built`, `pace` |
| `town` | town murmur | `pop` |
| `nightjar` | a nightjar's churr | Steady State (and clearing), under the haze |

Crisis, The Orange Night: the furnaces' roar swells (`crisis.swell: 'roarSwell'`, new) and the works bell rings ten
times fast on A. Heritage trace: `hammer` (×0.75, `traceGain`, new).

## Fishing: the harbour at dawn (`defs.ts` `fishing`)

| Layer | What | Driven by |
|---|---|---|
| `swell`, `surf` | the swell on a 13 s cycle, the surf with it | always |
| `buoy` | a bell buoy in key, two or three uneven strokes | always |
| `gulls`, `porpoise`, `shoals` | **the sea life** (`life: true`) | **`life`, from `stock.truth`, never `reported`** |
| `trawlers` | trawlers' engines across the water, on the beat | `fleet` |
| `winch` | a steam capstan hauling: ratchet quickening, steam | `fleet` |
| `market` | the fish market's handbell | Fried fish, Fish train, `pop`; not when tied up |
| `fishTrain` | the fish train leaving (Steam's train, in C) | Fresh fish by rail; not when tied up |
| `foreign` | foreign engines further out (right) | `stock.foreign`; silent under a moratorium |
| `quay` | quay murmur | `pop`, `built`; quieter when tied up |
| `halyards` | halyards slapping masts | `tied` |

The drivers (`mix.ts`): `life = ((truth − 0.12) / 0.58)^1.3`, clamped 0–1, × 0.35 while `stock.scar`; without a `stock`
it reads `reserveFraction` (which the contract keeps true for a renewable). `tied = 1` under a moratorium, or after
`crossed` as the pace falls from 0.25 to 0.06. `fleet = clamp(1.4·built + 0.15·pace) × (1 − tied)`: it never reads the
stock, so **the fleet sounds normal until it ties up**. Moratorium: halyards, the sea and the gulls (as the truth
allows); no fleet, market, train or foreign engines.

Engine, for `life` layers only: a rise ramps with a 5 s time constant (≈ 15 s to 95%), a fall with 0.6 s, so after the
scar heals the sea life comes back slowly (a newly shown tab fades in normally: no slow ramp in a graph's first 3 s).

The sea life alone, held, against the gauge the player sees (catch per trip = truth^0.3):

| True stock | Catch per trip | Sea life RMS |
|---|---|---|
| 100% / 70% | 100% / 90% | −40.5 dBFS (full) |
| 50% | 81% | −48.4 |
| 35% | 73% | −56.2 |
| 25% | 66% | −66.1 |
| 19% (the Survey's example) | 61% | −74.5 (gone, in a mix at −33) |
| 12% | 53% | silent |
| 60%, scarred | 86% | −57.5 (17 dB under unscarred) |

So the gulls are 8 dB down while the gauge still reads 81%, and gone at 61%. A 90 s render of the decline with the
fleet working (`shots/audio/m4-fishing-decline.png`): mix RMS −33.3, 0 clicks, nothing above 6 kHz.

## Interface and world moments

| Kind (alias) | What | Peak / RMS alone (dBFS) | Nearest existing |
|---|---|---|---|
| `wager` (`answer`/`dispatchAnswered` with `label` 'won'/'lost'; `detail.outcome`) | a coin on the counter (spin, bounces, settle), then the palette's note: won on degree 4, lost a fifth lower on 0 | −15.5 / −41.9 (won), −40.6 (lost); Code −16.6 / −40.3 | buy −17 / −43; answer −16 / −43 |
| `actEnding` | the first ending's shape slower and lower (11 s); credits held 110 s, bells 1.5× sparser | −12.2 to −13.2 / −24 to −26 | ending −12 to −13.4 / −25.5 to −26 |
| `arrears` | a muffled toll: a low bell twice behind a wall (low-passed 900 Hz) | −17.1 to −17.6 / −35.4 to −38 | survey −15.4 / −38.6 |
| `thresholdCrossed` | **no sound of its own**: the sea life cut over ~2 s (scale 0, ramp tc 0.6), held 12 s, then the mix's own (thin) level returns slowly | silent alone (by design) | — |
| `surveyReveal` (`surveyed` with `label` 'reveal'; any other `surveyed` is silent) | **no sting**: the sea life ×1.6 (+4 dB) and called 1.5× as often for 2 s, and the life layers call once or twice at once (else a sparse sea gave no audible lift in 2 s) | silent alone | — |

Sea life alone around a reveal at 6 s (truth 0.45): 1 s windows −47 / −64 / −54 before, −39.4 and −42.7 in the two
seconds after, −58 / −72 after. In the full mix the lift is +0.2 dB (the bed dominates): it is the gulls you hear, not
a level change. With the Survey's own example (truth 0.19) there is almost nothing to lift: the moment is nearly silent.
That is the honest world, and it is the owner's call whether it should be.

All new sounds: 0 clicks, energy above 6 kHz ≤ 0.03%, no clipping. Act credits bed alone over 120 s: 1 s windows −32.4
to −28.2 after the sting (a 4 dB range), then a 6 s fade.

## Heritage

- Iron's hammer under an Industry it **feeds** (`fedBy`; heritage only lists earlier tabs and Iron comes after Steam
  and Light): trace level 0.45 + 0.8 × share, × 0.75. Under Steam fed by rails (share 0.3): adds −47.4 RMS / −23.9 peak
  to a −35.1 / −13.7 bed. Under Light (girders 0.2): −48.4 / −25.0 to −38.0 / −19.7.
- Light's own `buoy` layer: Fishing's bell buoy, far right, low-passed 1.4 kHz, gain 0.035, about one in 40 s.
- Under later Industries by heritage: Iron (−45.3 added to Motion's −34.3 bed) and Fishing (swell and buoy, −45.0)
  each sit ~4 dB under the existing Steam + Light pair (−40.9).

## Levels (presets, 14 s, analysed from 3 s)

| | empty | early | mid | late | crisis | steady | target |
|---|---|---|---|---|---|---|---|
| Iron | −39.2 | −37.2 | −34.8 | −32.2 | −31.0 | −33.4 | empty −36 to −40, late −31 to −34 |
| Fishing | −36.7 | −36.7 | −36.0 | −33.9 | −32.9 | −35.3 | |
| Steam (reference) | −35.7 | −35.7 | −35.1 | −32.7 | −30.9 | −34.0 | |

Peaks ≤ −12.2 dBFS; above 6 kHz ≤ 0.14%; 0 clicks in every preset and run. Solo layers at level 1 (20 s): Iron −35.4
(hammer) to −56.4 (cans); Fishing −36.1 (swell) to −64.8 (porpoise breaths, sparse); Steam's own span is −34.7 to
−54.1. Two layers are too sparse to register in a 20 s solo (`tap`, 1 in 34 s; `market`, 1 in 38 s).

Crossfades (tab switch at 6 s; 1 s windows against the quieter of the outgoing held and the incoming's 20th-percentile
window; the same metric on no switch at all, Fishing to Fishing, reads −1.6): Steam→Iron −3.1, Iron→Steam −1.6,
Light→Iron −0.4, Iron→Fishing 0, Fishing→Iron −2.5, Fishing→Light −0.3, Fishing→Motion −0.7, Motion→Fishing 0.
An engine change made this: a layer built while its graph is still fading in now starts at its level (the graph's own
crossfade is the fade); before, both ramped and Steam→Iron dipped 4.5 dB, Fishing→Iron 5.0. Steam→Light went from
−2.5 to −0.4 by the same change.

## CPU

- Bench (offline, unthrottled, 600 updates of a whole run): `update()` p95 0.1 ms (Iron, Fishing, Steam alike); tick
  p95 Iron 1.7, Fishing 3.3, Steam 1.2 ms. The bench's tick includes main-thread synthesis (offline renders synthesise
  in the tick, up to 6 ms); live, synthesis is in the worker.
- Live (`tools/audio-live.cjs 4 30 <industry>`, the demo page at 4×, stats sampled each second): update p95 Steam 1.1,
  Iron 1.7, Fishing 1.2 ms; tick p95 1.4, 1.2, 0.9 ms. Long tasks 5–7 per 30 s with sound and 4–7 without (the
  scene's), so none attributable to sound.
- Soundscape-only page (`tools/audio-stall.cjs 4`, two runs: on, switches through Light, Iron, Fishing, Motion, Compute,
  20 events including the M4 ones, off/on ×3): 0 long tasks. `event()` main-thread cost ≤ 3.1 ms for the M4 kinds.
- The `audio` lazy part: 37.93 KB gz of its 38 KB budget (about 33.4 before M4). The recipes are in it twice (the
  worker's string and the main-thread fallback), so the next sound needs the budget raised or the fallback reworked.

## Export (the DAW panel)

Iron and Fishing are in `EXPORT_INDUSTRIES` and the Coal Age; stem groups for both (and Light's `harbour` stem for the
buoy); one-shots `wager-won`, `wager-lost`, `actEnding`, `actEnding-credits`, `arrears`. Checked with
`tools/audio-export-check.*`: Iron stems (late, 14 s) sum to the mix at −88.9 dB residual; a Fishing loop is valid
(labelled `loop-xfade`: the 13 s swell does not divide into whole bars); Fishing one-shots, 61 WAVs, no issues, 0 long
tasks. The public copy `public/audio-demo/index.html` was **not** rebuilt (see the progress note).

## Reproduce

```
bun run tools/audio-worker.ts                    # after changing recipes/synth/music/jobs
bun test src/ui/audio
bun run tools/audio-bench.ts
node tools/audio-run.cjs "$(sed s/SECTOR/iron/ tools/audio-industry.js)" iron.json && python3 tools/audio-summ.py iron.json
node tools/audio-run.cjs "$(cat tools/audio-m4.js)" m4.json                  # shots/audio/m4-*.png
bun run tools/audio-demo.ts && node tools/audio-live.cjs 4 30 fishing        # "Audition the M4 sounds" in the demo
node tools/audio-stall.cjs 4
```
