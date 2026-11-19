# Brief: M3 AUDIO lane

You give the generated soundscape of "Rebound" a voice for each M3 mechanic and moment: seams, the load curve, travel and
sprawl, "free", a dispatch arriving and being answered, a lever biting back, the second reveal and the first ending.
Nobody has yet listened to the engine, so every change is checked by measurement, as before. Other lanes work from the
same contract and do not talk to you: core, content, UI (calls your API), scene (owns `SceneView`; you read it).

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`.

## Standing instructions

- You will be interrupted by container restarts and usage limits. Keep a progress note at
  `design/scratch/m3-audio-progress.md`; land one verified piece at a time (audio tests green, offline renders measured).
- Make no git writes; the coordinator commits.

## Read first

`src/ui/audio/types.ts`, `mix.ts`, `recipes.ts`, `audio.test.ts`; `design/sound-direction.md` (idioms per Age, the
measured section, "Adding an Industry's soundscape", "Not verified"); `briefs/m3-scene.md` (the SceneView fields the
scene lane adds, with their exact names: `seams`, `load`, `travel`, `free`, `figures`, `watch` — read them as optional;
until the scene lane lands them, test with views you build by hand); the M3 event kinds in `src/types.ts`.

## Your files (only these)

`src/ui/audio/**` (including `bench/` and `demo/`).

## Work

1. **New interface moments** (`SoundEventKind`, append only): `'seam'` (a seam sunk: a deep thud and a rising pump
   stroke), `'letter'` (a dispatch arrives: paper, a soft bell in the Age's idiom), `'answer'` (a dispatch answered: a
   pen stroke; quieter when by default), `'bite'` (a lever's side effect first bites: the lever's own sound, detuned),
   `'survey'` (the household return published: a ledger page and a clock's tick), `'ending'` (the first ending: the
   world's beds resolve to a held chord and the air clears). The UI maps events to them (its brief says so).
2. **World layers from the view**: Steam's pumping deepens with `seams.sunk`; Light's hum follows the hour of the load
   curve the picture shows (louder at the peak, a night shift's machinery in the hollows); Motion's traffic bed thickens
   with congestion (`1 − travel.speed`) and the sprawl's distant traffic stays when demand falls; Compute's "free" uses
   carry no cash-register tick (their absence is the point); the proprietor's watch ticks faintly at `watch` rate after
   the reveal (off when 0; at most one tick every two seconds).
3. **Calm**: every new transient respects calm mode and the voice limits; nothing loops attention; no new sound on
   every tick (Paperclips' silence: mark changes of state only).

## Checks (measured, as `design/sound-direction.md` "Measured")

- Offline renders at 48 kHz of each new moment and of each new layer at three view states: peak and RMS dBFS, no
  clipping (peak ≤ −1 dBFS at default volumes), the new moments within ±3 dB of the existing moments' loudness.
- CPU: `stats().updateMs` and `tickMs` unchanged within 10% with all M3 layers active (bench page).
- `bun test src/ui/audio` green, with tests for the pure mapping of each new field.
- Record the measurements in your report and in `src/ui/audio/NOTES-m3.md` (new); `design/sound-direction.md` is not
  yours, and the coordinator folds the numbers in.

## Exit criteria (yours)

Six new moments and the four layer mappings, measured, calm-safe, no CPU regression; nothing audible for a feature that
is off (the fields are absent).

## Final report (concise)

What each new sound is (recipe in a line), the measurements, CPU numbers, what the owner should listen for first, gaps.
