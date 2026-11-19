# Soundscape: M3 notes (measured, not heard)

Nobody has listened to any of this. Every number below comes from offline renders through the real engine in headless
Chromium (48 kHz, default volumes: master 0.8, world 0.7, interface 0.7) or from live runs under 4× CPU throttling.
How to reproduce is at the end.

## New event kinds (append-only; unknown kinds are ignored silently)

`event(kind, detail?)`. Each M3 kind also answers to the contract's event name (alias, same sound).

| Kind (alias) | When the page calls it | detail | What it is |
|---|---|---|---|
| `seam` (`seamSunk`) | a seam sunk | `depth` 0–1 (= n / total) | A muffled blast underground (low crack and rumble, high-passed at 70 Hz), the cage bell twice, a pump stroke rising, a chain. Deeper is lower. Ducks the world a little (0.75, 2.5 s). |
| `letter` (`dispatchArrived`) | a dispatch arrives | `cast` = GameEvent.label (cast id) | The post in the Age's idiom: Steam a knock and the letter-box; Light a telegraph sounder (·−·); Motion a teleprinter and its bell; Compute a mail chime; Code a soft two-note notification. Then the writer's motif. A letter within 30 s of another plays 4.4 dB softer and without the motif. |
| `letterOpened` | the player opens one | — | Paper unfolding (Compute, Code: a soft key or glass tap). |
| `answer` (`dispatchAnswered`) | a dispatch answered | `by`: `'default'` plays `letterExpired` | Pen stroke and stamp (Steam, Light); a stamp, an Enter key, a glass press (later Ages); one soft note. |
| `letterExpired` | a dispatch lapsed | — | A drawer's soft slide; barely there. |
| `bite` (`biteBack`) | a lever first bites back | `lever` = LeverDef.kind | That lever's own world signature twice, flat (×0.945, ×0.97) and beating. Without `lever`: a sour two-note in the palette. |
| `survey` (`returnPublished`) | the household return published | — | A ledger page, four clock ticks, one note. |
| `proprietor` | the Proprietor's Day (the card bought / `meta.flags.proprietor` set) | — | Ducks the world (0.4, 4.6 s); the watch lid snaps open, a hurried tick (5/s), a considered chord left open on the third, the lid snaps shut. |
| `ending` | the first ending (event `ending`) | — | A bell, a slow chord, the palette's arpeggio, a bird; the world's air clears, the strain goes, the world steps back 3 dB; then a held chord breathes under the credits with a bell every 7–12 s for 75 s, then fades over ~6 s. |
| `ledgerContinues` | "The ledger continues" | — | A pen stroke (a key in later Ages) and one note; the credits bed fades over ~3 s. |
| `arrived` (`featureUnlocked`) | a system unlocks | — | The palette's gesture, then a fourth up to the octave: one small, consistent cue per Age. |
| `history` (`historyCleared`) | a History cleared | — | A line ruled off, a small cadence. |

All take `sector`, `strength`, `first` (×1.1) as before. Cast motifs (degrees in the Age's key; later generations keep
the family's): correspondent 4-4-0 (repeated note, down a fifth), Whitlow (and the Whitlow Professor) 0-1-2-3 (counting),
Miss Whitlow 3-2-1-0 (her father's turned round), Fenwick (and Dr Fenwick) 0-2-0-2 (brisk thirds), Ashworth (both)
0-4-7 (up a fifth, to the octave), Pryce 0-5-4 (up a sixth and settle), the Minister 0-−2-−2 (slow, down a third and
stays). A test checks that no two share an interval sequence.

## World layers from the view (each silent when its field is absent)

| Field | Layer(s) | What changes |
|---|---|---|
| `seams` (Steam) | `winder` (variant by depth), `pumpHeave` (new), `eng0–2` pitch | Deeper: the winding run lasts 7.5 s → 12.9 s, is 12% lower and comes more often; the pump engine is 10% lower; a slow heave every other beat. |
| `load` (Light) | `loadHum`, `dayMill`, `crickets` (new); `town`, `tram`, `cabs`, `nightMill` follow the hour | The sound keeps its own day: 24 h in 60 s from dusk (18:00), like the picture's clock; calm mode stands at the peak hour. Hum louder and brighter with the hour's load; mills by day; crickets in a quiet small hours; with the hollows sold the night keeps its machinery and loses the crickets. |
| `travel` (Motion) | `queue`, `jamHorn`, `sprawlHum` (new); `wash`, `cars`, `mower`, `radio` | Congestion (1 − speed) thickens the wash, idles a low queue, slows the passes (−14% pitch), fewer of them, a horn now and then in a jam (∝ congestion²). Sprawl keeps distant traffic, mowers and radios when demand falls. |
| `free` (Compute) | `till`, `tillMute`, `dam`, `grid` (new) | Paid uses ring a small till every ~8 s; free ones press the key and the drawer springs and no bell rings; a dam and the grid hum far off as the free share grows. |
| `levers[].bite` | each lever's signature | Flat by 5% × bite; past 0.3 a second voice beats against it (+3.5% × bite). Lower bite (paired) is back in tune. |
| `watch` | a global layer in every Industry | A faint watch tick, rate 0.5 × watch per second, never closer than 2 s; silent in a Reckoning. |
| `figures` | — | Not used (the letter's writer is heard through `letter`'s `cast`). |

Light's hour is not in the view; if the scene's clock pauses or the two start at different moments they drift. A
`SceneView.hour` would lock them (a scene-lane change).

## The stalls (live, 4× CPU throttle, a page holding only the soundscape: `tools/audio-stall.cjs`)

| | Before | After |
|---|---|---|
| Turning sound on (the tap's handler) | 298 ms first, 102–158 ms on re-enable | 38–129 ms first, almost all of it the browser's own `new AudioContext()` (36–60 ms on a quiet machine, more with the container loaded; measured alone in an empty page too); ours is about 2 ms (buses only; the impulse and the worker start at the next idle moment). 3–16 ms on re-enable |
| First world update after it | (inside the tap) | 9–29 ms, building at most 5 ms of layers per update; the rest arrive over the next updates |
| Long tasks (> 50 ms) over the script (85 s: Steam on, three Industry switches, 15 events, off/on ×3) | 61, max 308 ms | 0 or 1 in 7 of 9 runs (the one is the AudioContext construction inside the tap); one run had 3 and one 4 (max 202 ms) with the container at load average 7 from other lanes' balance runs, unattributed |
| `event()` main-thread cost | 0.1–4 ms | 0–11 ms (first `backfire` while its buffer is copied), mostly < 2 ms |

What changed: every recipe, noise bed and the room's impulse is synthesised in a Blob worker (`worker.ts`, bundled to
the string in `worker-src.ts` by `tools/audio-worker.ts`); results arrive as transferred arrays and become context-free
`AudioBuffer`s in a module-wide bank that survives off/on (released two minutes after the last soundscape). Setting one
1.7 s convolver buffer cost 50–80 ms at 4×, so the impulse is split over 8 delayed convolvers (normalised as the spec
would), one set per idle callback. Graphs build lazily, per layer, the first time a layer has a level; the tap builds
only the context and buses, the world arrives at the next idle moment. Interface sounds not yet synthesised play when
ready if within 0.3 s (moments such as `reveal` or `ending` play late rather than not at all). Without a worker (no
Worker, a CSP), jobs run one per idle callback on the main thread: each is 2–40 ms on a desktop, so that fallback still
makes long tasks at 4× (not measured in a browser without workers).

Robustness: 15 quick off/on cycles with tab hide/show between leave exactly one set of listeners while on (document
`visibilitychange`; window `pagehide`, `pageshow`) and none after off; no long tasks; heap 10 MB after off and GC.
Turning off mid-scene (setEnabled(false), destroy) leaves a silent, click-free tail (Steam and Code).

## Levels and spectra (offline)

Interface moments alone (peak / RMS over the 9 s render, dBFS), against the existing ones (Steam; other Ages within 2 dB):

| New | peak / RMS | Nearest existing |
|---|---|---|
| seam | −16.3 / −39.6 (centroid 233 Hz) | found −14.5 / −37.5 |
| letter (post only) | −19 to −21 / −43 to −53 | headline −17 / −42 |
| letter + motif | −19 to −21 / −40 to −44 | headline |
| letterOpened | −21 to −24 / −46 to −60 | — (smallest of all) |
| answer | −16 to −19 / −43 to −51 | buy −17 to −19 / −43 to −49 |
| letterExpired | −25 / −51 | — (barely there) |
| bite (duty) | −18 to −20 / −46 to −48 | lever −15 to −18 / −39 to −44 |
| survey | −15.4 / −38.5 to −42 | lever |
| proprietor | −12.4 / −26 to −27 | reveal −12.4 / −25 to −26 |
| ending (sting) | −12.3 to −13.3 / −24 to −26 | reveal |
| ledgerContinues | −17 to −20 / −40 to −47 | headline |
| arrived | −17 / −39 to −43 | headline |
| history | −16 / −37 to −40 | decade, found |

All are within ±3 dB of their counterparts except where smaller by design (letterOpened, letterExpired). No clicks in
any; energy above 6 kHz ≤ 0.74% (letterOpened's paper), elsewhere ≤ 0.23%.

Letters over the late bed: bed RMS −30.5 to −33.4, bed peaks −11.7 to −19.1; a letter peaks at −19 to −21, 1.0–1.8 s
long with its motif, no ducking, so it sits 2–9 dB under the bed's own peaks. Ten in ten minutes (one a minute) are
ten 1–2 s sounds at about −20 dBFS peak; one closer than 30 s to the last is played 4.4 dB softer and without its motif.

World layers (what each adds, by difference render; bed RMS in brackets):

- Seams 4/4 on late Steam: RMS −31.4 → −28.7 (added −29.1, centroid 336 → 242 Hz, so lower); winder runs 7.5 → 12.9 s.
  The winder's gain was lowered 7 dB for everyone (it was 10 dB over the bed for 5–7 s per run). Below 200 Hz the
  seamed state is 69% of the energy (M2 busy states: 50–60%): heavy, by design, but the darkest state we have.
- Light's day (late town, 60 s from dusk): evening peak windows −29 to −34, small hours −37 (quiet curve); hollows
  sold, the small hours measure −31.6 against −33.8 with a quiet night. Added by the load curve: −35.3 (bed −34.1).
- Motion jam (speed 0.2): +1.1 dB, centroid 417 → 399 Hz; added −37.8. Sprawl on a thin early road: −37.5 with mowers,
  radios and distant traffic.
- Compute all free: +1.2 dB (added −38.2, centroid 166 Hz: the dam and the grid); the paid till's added level is −60
  RMS, −28 peak (small, now and then).
- Lever biting at 1: added −58 RMS, −25.6 peak (the second voice and the detune).
- Watch at 1: ticks peak −31 dBFS at 2.2 kHz over a bed of −35 RMS: faint, close.
- The credits bed alone (Code key), 9–72 s: 1 s windows −32.2 to −28.2 dBFS (a 4 dB range over a minute), centroid
  184 Hz, nothing above 6 kHz; under the crisis world of Code: −32.3 to −27.5. It is about as loud as a late world.

Spectrograms: `shots/audio/m3-*.png` (moments per Age, letters, cast, seams, Light's day, travel, free, bite, watch,
ending per Age, "the ledger continues").

## CPU

`update()` 0.4–1 ms and the tick 0.1–1.7 ms in live runs at 4× throttle with the M3 layers (M2: up to 1.1 ms and < 3 ms
p95), so no regression within noise; the bench's `perf()` numbers were not re-run for every Industry.

## Reproduce

```
bun run tools/audio-worker.ts      # after changing recipes/synth/music/jobs (a test fails while stale)
bun run tools/audio-bench.ts       # dist/audio-bench.html and dist/audio-stall.html
node tools/audio-run.cjs "$(cat tools/audio-m3.js)" m3.json      # every M3 measurement + shots/audio/m3-*.png
node tools/audio-stall.cjs 4       # long tasks at 4× throttle; add `cycle 15` for the off/on soak
bun run tools/audio-demo.ts        # dist/audio-demo.html: "Audition all M3 sounds"
```
