# Sound direction: the world made audible

Status (19 Nov 2026): built in `src/ui/audio/`, not yet adopted by the page. **No human or model has heard it.**
Everything below was checked by measurement only (offline renders in headless Chromium, analysed for level, spectrum,
clicks and change over time). What to listen for first is at the end.

## What it is

There is one generative soundscape per Industry, in the sonic idiom of its Age, driven by the same `SceneView` as the
picture (`src/ui/scene/types.ts`), so sound and picture cannot disagree. It is ambience with a pulse rather than a
soundtrack: you hear the valley fill up, speed up and go dull under the smog, the crisis roll in, the machines wind
down at a Reckoning, and the quiet come back at Steady State. A small set of interface sounds uses each Age's own
instrument. There are no audio files: everything is synthesised in the browser, and it is off by default.

## Architecture

| File | Role | Pure? |
|---|---|---|
| `types.ts` | Public interface, the event list, the `Mix` type | — |
| `mix.ts` | `mixFrom(view, def, {calm})` → `Mix`: the whole mapping from a view to levels, densities, pitch, tempo, air | yes, tested |
| `defs.ts` | One `SoundscapeDef` per Industry, **as data** (layers, what drives them, key, tempo, palette, crisis, heritage trace) | data |
| `recipes.ts` + `synth.ts` | Every transient synthesised in plain JS into a buffer, once (24 kHz mono, zero-edged, deterministic) | yes, tested |
| `music.ts` | Keys and modes; degrees → Hz | yes |
| `engine.ts` | Web Audio graph, the scheduler, interface sounds, lifecycle (gesture unlock, visibility, suspend) | no |
| `views.ts` | Hand-made views and a 60 s run, used by the tests, the bench and the demo | yes |
| `bench/page.ts`, `demo/main.ts` | The measurement page and the demo page (browser only; not in the game bundle) | — |

The tooling lives in `tools/`: `audio-demo.ts` builds the demo, `audio-bench.ts` builds the bench, `audio-run.cjs`
drives it, `audio-industry.js` and `audio-extras.js` hold the batches, `audio-summ.py` summarises, and
`audio-live.cjs` runs a real-time check under CPU throttling.

The graph, per Industry: each layer (a bed or a transient lane) feeds a level gain, then a blackout gain, then an
optional pan, into the **air** (a low-pass the smog closes), then a 60 Hz high-pass, the **thickening** (a low-mid
peak), the **fog** (a low-pass a crisis closes), the **world** gain (the Reckoning) and the **crossfade** gain, and
out to the world bus. Sends go to one shared convolver with a generated impulse. The buses run world, then duck, then
master, then a limiter; the interface has its own bus into master. Each Industry's graph is built once when shown and
crossfaded (about 2 s). The previous one is torn down after the fade, and is revived if you switch straight back.

## The sonic idiom per Age

| Industry | Key | Pulse (bpm, pace 0 → 1) | Idiom | Layers (driver) |
|---|---|---|---|---|
| Steam | D dorian | 54 → 84 | An engraving with sound: open air, iron, wood, a church across the valley | wind (empty); birds (empty, clean air, Steady State); beam engine, one voice per machine stage: Newcomen thump and wheeze every 4 beats → Watt stroke every 2 → high-pressure chuffs on the half-beat → turbine whine (pump, built); mill rumble pulsing on the beat plus looms on the pulse (mills); pithead bell and winding drum (winders); a train across the viaduct, panned left to right, whistle in key (railways, more often with adoption); ship's horn from the harbour (steamships); distant ploughing engine (ploughing); town murmur and church bell (population) |
| Light | G mixolydian | 60 → 90 | Dusk in a gaslit poster town | dusk air and evening birds (fewer as the light spreads); gas hiss (lamps); lamps lit one by one, each a small chime-like pop on a scale degree (lamps); night-shift hum and muffled machinery (night shifts); trams passing with bells, motor and sparks (trams); a parlour piano through a window (lit homes); sign buzz (signs); hansom cabs, hooves on cobbles (population); town |
| Motion | C lydian | 72 → 110 | The airbrushed open road, then the wash | breeze and birds (empty); road wash that brightens with pace (cars, vans, malls, population); cars and vans passing with Doppler and stereo travel (commuting, vans); a jet climbing out (package holidays); shop-centre chime and car doors (malls); a lawnmower and a transistor radio playing a tune in key over the fence (suburbs); traffic hum |
| Compute | E aeolian | 80 → 120 | A phosphor landscape: beating machine tones, packets as grain | air and birds (empty); fan tones in beating pairs plus fan noise (built, pitch with pace); cooling (cloud, training); relay and packet ticks on a 16th grid, density from adoption (web, streaming, cloud); mains hum at 50 Hz with harmonics that sag under load (haze); vector-display beeps (spreadsheets); streaming whooshes; a training throb on the beat (model training) |
| Code | B aeolian | 70 → 100 | A night city in rain | rain and drips (stop at Steady State); a low pad (Bm9 colour) that brightens as the haze clears; neon buzz and flicker (more flicker with haze); traffic; the elevated line; drones (chatbots, agents); **six warm rooms** in the old block (typing, a page turned, cups, a guitar chord, a kettle, a child's pencil) that go silent one by one as attention (reserve) is spent until one is left; **rolling blackouts** that cut layers above 80% pressure; an emergency tone (stress); an owl at Steady State |
| generic | D dorian | 60 → 96 | Any Industry without its own | wind, birds, a drone, a works rumble and knocks (built), town |

**Why these keys.** Neighbouring Ages differ by at most one note (a test enforces this), walking round the circle of
fifths as the calendar advances: Steam and Light use the white notes, Motion and Compute add F♯, Code adds C♯. So a tab
switch is a modulation (two related keys crossfading), not a jolt. The tonal layers (engine and turbine tones, bells,
lamp pops, hum, pad, whistles, the radio tune, the guitar) are all built on degrees of the Industry's key, and pitched
transients pick their degree from a list.

**Why a shared pulse.** Every grid layer (engines, looms, ticks, the training throb, the mill rumble's pulse, the
Code emergency tone's alternation) reads one beat clock per Industry, whose tempo glides from `pace`. So the mills, the
engine and the packets lock loosely together and quicken together. Random events (trains, cars, birds) follow seeded
exponential gaps, so nothing repeats on a cycle.

## Mapping: inputs to what you hear

| `SceneView` field | What you hear |
|---|---|
| `apps[i].status` / `adoption` | Each application has its own layer(s); founded sets presence 0.25 + 0.75 × adoption. Adoption raises the level and, for transient lanes, the rate (more trains, more cars, denser ticks) |
| `stage` | Steam's engine voice changes per stage (crossfade); elsewhere `built` carries it |
| `pace` | Tempo of the shared pulse; mechanical layers rise in pitch by up to 4–8%; Motion's road wash brightens |
| `pressureFraction` → **haze** | The air low-pass closes by up to 2.4 octaves (to about 1.3–1.7 kHz at full pressure); low-mids thicken by up to +4.5 dB; reverb send grows (fog is diffuse); birds thin; Code's flicker multiplies; Compute's mains hum sags |
| pressure ≥ 0.8 → **stress** | Rolling blackouts (Code: pad, neon, flicker, drones; Compute: fans, ticks, beeps, throb; Light: signs) and the Code emergency tone |
| `reserveFraction` | Code: the six rooms go dark at reserve 0.83, 0.67, 0.5, 0.33, 0.17, 0.02 |
| `popFraction` | Town murmur, church, cabs, traffic |
| `crises` (increase) | The world's crisis: a fog low-pass sweeps down to 700 Hz and back over 12 s under a low swell, plus the Age's alarm: a church bell (Steam), a fog horn (Light), a two-tone siren (Motion), alarm beeps (Compute), an outage fall (Code) |
| `levers` | A small occasional signature per kind: duty, a toll bell; cap, a ratchet; sufficiency, a spade and a robin; substitution, sails or turbine swish; circularity, bottles; green spending, a fountain; deletion, a hush; review gate, a stamp; shared libraries, a page |
| `decoupling` / `steadyProgress` | Haze × (1 − 0.6 × clear), so the highs return as the streak builds |
| `steady` | The quiet comes back while the machines still run: birds (or Code's owl), rain stops in Code, the pad opens; a short burst of birds at the moment |
| `reckoning` | Everything winds down to near silence over about 5 s: world gain to 0.08, tempo halves, mechanical pitch drops 15%, transients at a tenth |
| `heritage` | The earlier Industries' trace layers, faint and distant (low-passed at 900 Hz): Steam's mills under Motion's wash, Light's gas and trams, Compute's fans under Code |
| unknown `sectorId` | The generic bed; the interface palette follows `look` |

## Interface sounds

`event(kind, detail?)`, with `kind` from `SOUND_EVENT_KINDS`, named for the game's moments so that the coming
contract event list can map one to one:

`sell · buy · cannotAfford · found · lever · fork · headline · reveal · backfire · crisis · decade · steady ·
reckoning · industryOpened · ageBegun`

Each Age has an instrument and a gesture: Steam (ledger) has a brass handbell and a pen-nib scratch, with a stamp to
commit; Light (gaslight) a celesta and a type-key press; Motion (chrome) a vibraphone, a relay click and a chrome ding;
Compute (terminal) soft square blips; Code (neon) glassy FM bells and glass taps.

- **sell** survives 8 taps a second. It drops taps closer than 45 ms, softens as the rate climbs (8/s measures only
  about 3 dB above 1/s), allows at most 3 sell voices, rotates 6 variants, and climbs a little five-step scale on a
  streak that resets after half a second.
- **backfire** is the signature: a slide-whistle up past the octave, a sprung *boing*, and a deflating slide down to the
  fifth. The rebound is the joke.
- **reveal**, **ageBegun**, **steady**, **reckoning** and **backfire** duck the world for a few seconds.
- The world plays its own crisis from `SceneView.crises`; `event('crisis')` is the interface sting on top. The page
  calls both; the soundscape has no other auto events.

## Measured (offline renders, 48 kHz, default volumes: master 0.8, world 0.7)

- **Levels**, dBFS RMS over 11 s:

  | Industry | empty | late | crisis | collapse |
  |---|---|---|---|---|
  | Steam | −35.7 | −32.7 | −30.9 | −50.0 |
  | Light | −39.3 | −33.4 | −32.2 | −55.2 |
  | Motion | −39.8 | −30.5 | −29.3 | −50.6 |
  | Compute | −39.6 | −33.2 | −31.5 | −50.8 |
  | Code | −37.4 | −33.1 | −32.1 | −50.3 |

  Over a 60 s run the level climbs by 10–12 dB as the place fills. Peaks stay at or below −11 dBFS everywhere; there
  is no clipping and no DC.
- **Spectrum.** Energy above 6 kHz is at most 0.7% of any state (most are 0.0%). Below 200 Hz the share is 40–60% in
  busy states, down from 80% before tuning; the centroid of a busy state is 300–580 Hz and that of an empty one
  750–1170 Hz. Busy industrial states are darker by design.
- **Clicks.** A high-frequency transient detector (above 15 kHz, 5 ms windows) flags nothing in any preset, run,
  crossfade or event (the largest window is 24 dB above the median; the flag is set at 29.5 dB).
- **Crossfade.** Tab switches dip by at most about 4 dB mid-fade and do not click.
- **Interface.** Peaks run from −12 dBFS (reveal, backfire, ageBegun, steady, reckoning) to −21 dBFS (sell). Sell at
  8 taps a second peaks at −18 to −22 dBFS.
- **Crisis.** 6–12 dB above the bed for about 4 s.
- **Calmer.** −1 to −1.5 dB RMS and a lower crest factor; the pulse keeps its beat.
- **CPU, main thread.** `update()` at 10 Hz takes about 0.1 ms (p95 0.2 ms; up to 1.1 ms under 4× CPU throttling in a
  live run), and the scheduler tick under 3 ms (p95). One-off costs remain:
  - turning sound on: about 400 ms at 4× throttle (context, noise buffers, impulse, first graph);
  - recipe synthesis on first use: 10–40 ms on desktop per recipe, prewarmed one per tick in the background for the
    first ~15 s after an Industry is shown, so at 4× throttle there are roughly ten long tasks of 100–150 ms in that
    window.

  The scene alone already makes long tasks of 60–110 ms at 4× throttle in the same demo.
- **Memory.** The synthesised-buffer cache is capped at 2.4 M samples (24 kHz) by LRU. A two-minute soak cycling all
  Industries returned to the same JS heap on each cycle (22–34 MB including the demo and the scene).
- **CPU, audio thread.** Offline rendering runs at about 7–15× real time on this machine, including JS synthesis. There
  are 6–23 continuous sources per Industry, at most 18 world and 6 interface transient voices, and one convolver.

## Adding an Industry's soundscape

Mostly data, like a scene layout:

1. Add a `SoundscapeDef` to `defs.ts` (or call `registerSoundscape(sectorId, def)`): a key from `music.ts` (keep it one
   note from its neighbours), a tempo range, an air brightness and reverb, an interface palette, and the layers. A
   **bed** is `src: 'pink' | 'white' | 'brown' | 'tones'` with a filter, an optional LFO (in beats to lock to the
   pulse), tones as scale degrees, and pitch and tone drivers. **Hits** are a `recipe` with `grid` (beats and a
   pattern of probabilities) or `rate` (events per second), `notes`, `pan` or `sweep`, and `variants`. The `level`
   (and optional `density`) of each layer is a `Drive` over sources: `'app:<icon>'`, `'pop'`, `'built'`, `'empty'`,
   `'haze'`, `'pace'`, `'reserve'`, `'steady'`, `'clear'`, `'stress'`, `'lever:<kind>'`, with `'inv:'` and
   `'step<t>:'` modifiers. Set `crisis`, `trace` (the layers heard faintly in later Industries) and optional
   `levers`.
2. If it needs a new sound, add a recipe to `recipes.ts`: a pure function returning samples. The tests check it for
   bounds, edges, DC, determinism and highs automatically.
3. Measure: `bun run tools/audio-bench.ts`, then `node tools/audio-run.cjs "$(sed s/SECTOR/<id>/
   tools/audio-industry.js)" out.json && python3 tools/audio-summ.py out.json`. Aim for empty at −36 to −40 and late
   at −31 to −34 dBFS RMS, nothing above 1% beyond 6 kHz, no clicks, and solo layers within ±6 dB of their
   neighbours.

## Proposals for the planned Industries and Ages (`design/long-game.md`)

- **Iron & Steel** (Coal Age; A dorian, one sharp from Steam's set via F♯, or stay in D for the shared valley). The
  drop hammer is the pulse. A furnace roar bed swells and breathes. Tapping the furnace is a rising hiss and a shower
  of sparks (granular). The rolling mill gives a pitched squeal and rumble, riveting a rapid tick train, and the slag
  run a low pour. The quiet is a nightjar at dusk; at pressure the slag slide is a long rockfall.
- **Fishing fleet** (Coal Age; D mixolydian). The bed is the sea, a wave swell on a slow LFO, with a bell buoy in key,
  gulls (pitched cries, dense around the fleet), trawler chuffs and winches. The renewable stock is audible as gulls
  and whale or seal calls offshore. Hysteresis is a soundscape that stays thin long after the fleet is restrained: the
  quiet returns slowly, which is the lesson.
- **Plenty / agriculture** (Acceleration; F lydian). Skylarks over fields, a two-cylinder tractor, irrigation pumps,
  the combine's drone at harvest. The Dust Bowl is wind with grit, a low-passed sun-baked hum, and no birds. Steady
  State is hedgerow birdsong and bees.
- **Freight & Flight** (Acceleration; a top-down chart, so a control tower's ear). Airband chatter as filtered noise
  syllables (no words), container cranes clanking on the pulse, ship horns at the port, jets overhead, a
  departure-board flap. The second ledger is the sound moving off-screen, Doppler going away.
- **Comfort** (Acceleration; an appliance catalogue). Fridge hum, AC compressors cycling (they lock to the pulse),
  washing-machine spin, a toaster pop, the TV through the wall. Ozone is a thin, cold high band; heat is cicadas and
  AC load climbing until the blackout. Shares Motion's vibraphone palette.
- **Proof-of-Work** (Attention Age, beside Compute). Deliberately ugly and atonal: an ASIC fan wall, a relentless
  16th-note hash grid at full density that pace cannot calm, and a chime per block. It is the one soundscape not
  tuned to its neighbours, and the contrast is the point.
- **The Transition** (risograph; G ionian, the circle turning home towards Steam's notes). **Quiet is the reward.**
  Each thing unbuilt removes a layer for good. What fills the space is rain on leaves, wind turbines' slow whoosh
  (locked to a slow pulse), and a dawn chorus that thickens with wellbeing. Extraction in the cut-away is distant
  blasting and haul trucks that never quite go away. Steady State is near silence with birds and the hum of
  maintenance, not a fanfare.

## Integrating into the page (for the page lane)

1. **Create** the soundscape once in `src/main.ts` (or wherever the scene is created), with nothing started:
   `const sound = createSoundscape({ enabled: prefs.sound, volumes: prefs.volumes, calm: prefs.calm });` from
   `src/ui/audio`. With `enabled: true` from a saved preference it arms a one-time unlock on the next tap anywhere;
   no AudioContext exists until then.
2. **Feed** it the same view as the scene, in the same 10 Hz loop: `const v = sceneViewFrom(...); scene.update(v);
   sound.update(v);`. On a tab change call `sound.setSector(id)` beside `scene.setSector(id)`.
3. **Gesture.** The settings toggle's click handler calls `sound.setEnabled(true)`, which creates and unlocks the
   context inside that tap. Optionally call `sound.unlock()` from the page's main tap handler (cheap, idempotent) to
   recover after an iOS interruption sooner.
4. **Settings** (in `prefs.ts`):
   - `sound: boolean`, default false;
   - `volumes: { master, world, interface }`, defaults 0.8 / 0.7 / 0.7, as three sliders (world at 0 means interface
     only; interface at 0 means world only);
   - `calm: 'system' | 'on' | 'off'`, passing `null` for system, which follows `prefers-reduced-motion`.

   Call `sound.setVolume()` and `sound.setCalm()` on change.
5. **Events**, from the model actions' results:

   | Event | When the page calls it |
   |---|---|
   | `sell` | on each sell, with `pan` from the tap's x |
   | `buy` | an upgrade bought |
   | `cannotAfford` | a disabled buy tapped |
   | `found` | `foundApp` succeeded |
   | `lever` | a lever enacted or raised |
   | `fork` | a run fork chosen |
   | `headline` | a news item shown |
   | `reveal` | The Coal Question read |
   | `backfire` | the first time rebound passes 100% |
   | `crisis` | `crisesFired` rose (the world plays its own fog from the view too) |
   | `decade` | a milestone decade |
   | `steady` | Steady State reached |
   | `reckoning` | the Reckoning dialog opens |
   | `industryOpened` | with `{ sector }` |
   | `ageBegun` | — |

6. **Suspend** with `sound.suspend()` / `sound.resume()` when a full-screen modal wants quiet. A hidden tab suspends by
   itself. Call `sound.destroy()` only on teardown.
7. Nothing throws: without Web Audio, `stats().state` is `'unavailable'` and every call is a no-op.

## Not verified (cannot be, here)

- **Nobody has listened.** Pleasantness over an hour, how well it sits under a podcast, whether the mix is
  musical, whether the backfire is funny: all unjudged.
- **Safari / iOS.** Only Chromium is installed. Untested:
  - the `webkitAudioContext` fallback;
  - `navigator.audioSession.type = 'ambient'` (set so that it mixes with a podcast and respects the ringer switch);
  - the legacy silent-buffer unlock;
  - `interrupted` state recovery (a call, Siri);
  - 24 kHz `AudioBuffer`s being resampled on a 44.1/48 kHz context;
  - `StereoPannerNode` absence on old iOS (the engine falls back to centred);
  - Safari's convolver and biquad cost on older phones.
- **Real phones.** CPU was measured with Chromium's 4× throttling on a desktop, not on a phone's audio thread;
  Bluetooth latency was not measured.
- Phone speakers reproduce little below 200 Hz, so the engine's character on a speaker rests on the 200–600 Hz knock
  content, which was raised for that reason but not auditioned.

## What the owner should listen for first

1. Steam, from empty to late (demo, "Run to collapse"). Does the beam engine read as an engine on a phone speaker? Do
   the looms and the engine sit together on the pulse? Is the smog's dulling audible but not stuffy?
2. Sell ×8/s, and the backfire.
3. Code's rooms going dark one by one, and the blackouts. Are the blackouts unsettling rather than broken-sounding?
4. Twenty minutes under a podcast at default volumes. Is anything fatiguing (the rain, the gas hiss, the fan beating)?
5. Tab switches. Do they feel like modulations?
