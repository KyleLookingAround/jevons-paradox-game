# Fixtures

Saved game states (the output of `serialize()`) that tests and tools load. They are committed because CI runs the
tests; working files stay in `design/scratch/`, which is not.

- `m3/`: saves written by the M3 build (save version 4) by scripted players, before the M3 ending. They prove old
  saves keep loading.
- `m4/m3-human-after-ending.json`: an M3 save from after the M3 ending.
- `m4/hour6.json`, `hour6-after.json`: the budget player's run 6 with Fishing open, five seconds before the Board's
  Survey and at it. `act1-late.json`: three settled, run 9. `act1-ending.json`: five seconds before the Act I ending.

Regenerate the M4 states after a balance change (they are states the current content reaches):
`bun run tools/balance.ts budget 1 --total-hours=16.5 --dump-ending=fixtures/m4 --dump-survey`. Never regenerate `m3/`.
