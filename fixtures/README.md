# Fixtures

Saved game states (the output of `serialize()`) that tests and tools load. They are committed because CI runs the
tests; working files stay in `design/scratch/`, which is not.

- `m3/`: saves written by the M3 build (save version 4) by scripted players, before the M3 ending. They prove old
  saves keep loading.
- `m4/m3-human-after-ending.json`: an M3 save from after the M3 ending.
- `m4/hour6.json`, `hour6-after.json`: the budget player's run 6 with Fishing open, five seconds before the Board's
  Survey and at it. `act1-late.json`: three settled, run 9. `act1-ending.json`: five seconds before the Act I ending.

Regenerate the M4 states after a balance change (they are states the current content reaches):
`bun run tools/balance.ts budget 1 --total-hours=16.5 --commons --dispatch=thoughtful --survey=board --dump-ending=fixtures/m4 --dump-survey=fixtures/m4`
(the measured campaign's flags; `--dump-survey` alone writes to `design/scratch/m4-balance/`). Never regenerate `m3/`.
Last regenerated 20 Nov 2026 by the M4 polish pass (the spring surveys; the Act I ending at 15.9 h).

- `m5/office-offer.json`: the Reckoning at which office is first offered (run 11, 16.3 h; `officeOffer` true on a fresh
  run). `m5/ministry-1.json`: ten minutes into the first Ministry, played by the `steward` regulator bot (the Motion cap
  at level 1, two pledges in force; `flags.revealed` set by hand, as the regulator harness does, until the core sets it
  in a Ministry). Regenerate both after a content change: `bun run tools/m5-fixtures.ts` (from `m4/act1-ending.json`:
  the ending, ten minutes, Reckon; the capstone run with the Market until Motion has been open eight minutes; Reckon;
  Take office; ten minutes of the steward). Made 20 Nov 2026 by the M5 prestige lane.
