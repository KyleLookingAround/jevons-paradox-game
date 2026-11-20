# Brief: M5 AUDIO lane — the Ministry and Plenty

You give the Other Chair its sounds, generated as M3 and M4's are (no samples, off by default): the Ministry room tone,
polling night, the inspector's stamp, a hoarding pasted up, a court gavel, the Take office beat, and Plenty's
soundscape. Design: `design/m5-design.md` §11; `design/sound-direction.md`; events in `design/m5-contract-notes.md` §11.

Do NOT edit anything outside `src/ui/audio/**` (and your progress note). No git writes.

## Standing instructions

- Keep `design/scratch/m5-audio-progress.md`; one verified piece at a time.
- Performance: sound is driven by the same `SceneView` and events; nothing runs per frame; the audio part stays lazy
  (`src/ui/chunks.ts`) and within its size budget (`bun run build.ts --check`).
- Nobody has listened to the sound yet (CLAUDE.md known gaps): export each new sound to a WAV in `design/scratch/m5-audio/`
  (M4's export tool) so the owner can.

## Read first

`design/sound-direction.md`; `src/ui/audio/` notes; M4's audio progress note (`design/scratch/m4-audio-progress.md`).

## Work

1. **The Ministry room**: a slow clock and traffic through glass under every Act II scene while in office; curtains in
   Opposition muffle it.
2. **Events**: 'officeTaken' (the paper boy's cry, then the room); 'electionCalled' (a murmur), 'electionWon' and
   'electionLost' (a count bell; a cheer or a door closing); 'inspected' (footsteps and a stamp; a second stamp when
   concealment is found); 'rivalAnswered' with lobby (a paste brush), litigate (one gavel); 'loopholeClosed' (a quill and
   blotter).
3. **Plenty**: wind in wheat, a pivot's hiss, a pump's thud that slows as the water table falls (read from
   `SectorDerived.water` and the reserve).

## Done means

Each sound plays on the real page (Playwright or a manual check in the built game at 390 × 844 with sound on); WAVs
exported for the owner; the build's size check passes.

## Verified by

`bun run build.ts --check`; the WAV exports listed in your progress note; a short listening note in your report.
