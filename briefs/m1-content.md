# Brief: M1 CONTENT lane

You write the data and words of "Rebound" for milestone M1 ("v1, honest"). Three other lanes work from the same contract
at the same time and do not talk to you:

- core (`src/model.ts`, fixture, model tests, `tools/balance.ts`);
- UI (`src/ui/*`, `src/main.ts`, `src/styles.css`, `index.html`, `tools/shot.mjs`);
- balance, after you (it retunes numbers in `src/content.ts` and writes `src/balance.test.ts`).

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md` or `CLAUDE.md`.

## Read first, in full

1. `src/types.ts`, the binding contract. Every field's doc comment says what the number does in the simulation.
2. `design/m1-contract-notes.md`: the decisions, and the old → new name mapping.
3. `CLAUDE.md`.
4. The M1 section of `design/roadmap.md`.
5. `design/long-game.md`: the Steam, Light, Motion, Compute and Code sections, the first hour beat by beat, and the
   content inventory.
6. P2, P3, P4, P7 and P15 in `design/proposals.md`.
7. Your current `src/content.ts`.

The design documents still say "era". The contract's word is **sector** in code. On screen a sector is an
**Industry**, and the period is an **Age**.

## Your files (only these)

- `src/content.ts`, which keeps `export const content: Content`.
- `src/content.test.ts`, a new content lint test (see below).

**Rename first.** Conforming to the contract starts with renaming inside `content.ts`, using the mapping table in
`design/m1-contract-notes.md`:

- `eras` → `sectors`;
- `era:` → `sector:` on every effect, upgrade and lever;
- `drawsOn.era` → `drawsOn.sector`;
- headline keys `eraOpened` → `sectorOpened` and `steadyEra` → `steadySector`;
- the placeholder `{era}` → `{sector}`;
- drop `index`; move `theme` to the ages (below);
- add `sectorOrder: ['steam', 'light', 'motion', 'compute', 'code']`. Keep the v1 ids: saves depend on them.

## Words on screen

- No player-facing string says "sector" or "era" for the unit. It is an "industry" (plural "industries"), and the
  period is an "age".
- This covers headlines, blurbs, catch lines, labels and achievement text.
- The `{sector}` placeholder is replaced by the sector's name ("Steam"), so write "{sector} industry" or just
  "{sector}".

## Tone rules

- British English throughout ("organise", "colour", "programme", "kerb"). The lint test bans a small list of
  Americanisms.
- Dry broadsheet wit that ages from Victorian to modern. The game never lectures; the gauges do.
- Register: "Engines thriftier than ever; collieries report record sales".
- Headlines are at most 70 characters.
- Real people: dead historical figures only, in card blurbs only, with a date only where you are sure.
  - No living people. No real newspaper names.
  - Starred names in `long-game.md` need checking before they ship.
- Dark history (cotton and slavery, coaling stations, famine): never a resource, an application or a joke
  (recommendation D4).
- **Sources.** `design/research/` holds sourced dossiers being written now: `energy.md`, `digital.md`, `sectors.md` and
  `restraint.md`. Use them for names, dates and figures.
  - If a dossier is not there yet, take only what `long-game.md` states as sure, and mark anything else for checking in
    your report.
  - Never invent a citation.

## Work

### Ages (new)

Add `ages` exactly as the table in `design/m1-contract-notes.md` gives them:

| Age id | Name | yearSpan | theme | Sectors |
|---|---|---|---|---|
| `coal` | The Coal Age | [1780, 1914] | `ledger` | steam, light |
| `acceleration` | The Great Acceleration | [1909, 2010] | `chrome` | motion |
| `attention` | The Attention Age | [2000, 2100] | `terminal` | compute, code |

- Write a tagline for each age.
- Give Light `theme: 'gaslight'` and Code `theme: 'agentic'` (transitional overrides that keep the v1 looks).
- Set `firstYear` on each sector: steam 1780, light 1870, motion 1950, compute 2000, code 2025.
- Give each sector an `accent` key: `'iron'`, `'gas'`, `'chrome'`, `'phosphor'`, `'diff'`. The UI maps these.

### Unlock conditions for sectors 2–5 (P3)

Replace `prevServicePriceBelow` with `when` milestones that restraint does not block:

- an efficiency upgrade owned;
- applications founded;
- `serviceDelivered`, which accrues under restraint, only more slowly.

Label every child of the top-level `all`, in player words ("Own the Separate condenser", "40,000 hp·years delivered").

Example for Light: own the condenser, 40,000 hp·years delivered, 1 Reckoning. Keep the v1 `minReckonings`
progression of 1, 2, 3 and 4. The critique found Code's v1 gate unreachable, so make Code reachable by about hour 4 of
competent play.

### Forks (P7): 12 in total

- Steam has 4; Light, Motion, Compute and Code have 2 each.
- Each fork is two upgrades that list each other in `excludes`, and each card's blurb names its rebound.
- Use `marginAdd < 0` for a royalty or premium, `satMul`/`halfPriceMul` for "more of it", and `capCostMul` for "cheaper
  engines, so more of them".
- Historically grounded: Boulton & Watt's premium against pirate engines; Parliamentary trains (1844) against
  first-class lines; gas works against power station; and so on, per `long-game.md`.
- Neither arm may be strictly better: each needs a real cost.

### Know-how: 16 nodes in 2 trees

- A Steam tree and a general tree. Use `tree`, `tier` (1–3) and one `branch` fork per tier.
- Cornish school (η up) against Manchester school (capCost down) is the first fork.
- Every efficiency node carries a visible rebound side-effect, `satMul` or `halfPriceMul` > 1. The blurb hints dryly
  that runs get shorter.
- Include at least one node with a one-off `slotAdd`.

### Institutions: 14, with levels and slots

- Use `nextLevels` (most have 2–3 levels) and `slots` (1, with one or two heavy ones at 2).
- Keep the Statistics Office as the cheap first buy.
- The first loadout choice should be easy (2 slots against about 4 affordable candidates) and get harder.
- `startLever` levels should rise with institution level.

### Levers

- **Repeat tables for every lever** (`repeat`): valueStep, costGrowth, upkeepGrowth and a label template with
  `{pct}`/`{n}`.
- **Caps are now fractions of the budget line**, so authored values sit near 1.0, 0.95, 0.9, with a negative
  valueStep.
- Give duty and cap levers `recycle: ['treasury', 'dividend']`. The catch line names the dividend's rebound.

### Steady and demography (`global`)

- `demography: { transitionWellbeing }`, above `wellbeingTarget`.
- `steady`:
  - `budgetDeclinePerDecade` about 0.05;
  - a small `decadeEffects` set, such as `mandateAdd` and `capitalAdd` in seconds of income;
  - `firstSteadyEffects: [{ type: 'slotAdd', value: 1 }]`.
- `levy: { mandateShare }` and `startingSlots: 2`.
- The new `hindsight` shape, with placeholder weights. Balance tunes them.

### Headlines: about 150 new lines

- Every HeadlineKey, including the new `ageBegins`, `budgetDrawn`, `decade` and `budgetBroken`.
- Era-aware lines go under `sectorHeadlines[sector]`: at least `crisis`, `collapse`, `exhausted`, `sectorOpened` and
  `efficiency` for each sector. Victorian fog must never fire during Compute's heat dome.
- Use `{year}` and `{n}` where they help.

### Achievements: 25 in total

- The 5 built-in ids, plus 20 with `when` conditions.
- Per-sector families such as "Backfire in Light", "First decade within budget" and "Unlocked frugally", plus a few
  hidden ones.

### Optional, if time allows

Raise applications to 5–6 per sector (26 in total), toward the v1 ship inventory.

## Volume targets (roadmap M1)

- unlock conditions for sectors 2–5;
- 12 forks;
- 16 Know-how nodes in 2 trees;
- 14 Institutions with levels;
- repeat tables for all levers;
- about 150 headlines, plus era-aware crisis lines;
- 25 achievements.

## Numbers

Get orders of magnitude and smooth cost curves; balance tunes afterwards. Generate level tables and cost ladders with
small helper functions in the file, as v1 does for labels.

Keep these rules:

- **Pumping:** `reserveGainPerService × η × pumping's share of demand < 1` at every reachable η.
- **Wellbeing:** `wellbeingTarget < transitionWellbeing`.

## Content lint test (`src/content.test.ts`, runs in `bun test`)

The test checks that:

- ids are unique across the whole game;
- `sectorOrder` lists every sector exactly once;
- every sector is in exactly one age, and age spans ascend;
- every `requires`, `excludes`, `startLever`, `unlock` id, `after`, Cond `owns` / `sector` / `app`, and `spill.to` /
  `drawsOn.sector` resolves;
- excludes are symmetric;
- every lever has a `catch`;
- every unlock `all` child has a `label`;
- every headline is at most 70 characters;
- there are no banned Americanisms (a small list: color, honor, center, program (except "computer program"), gray,
  tire, curb, aluminum, -ize where -ise is normal);
- no player-facing string contains the words "sector" or "era";
- every Know-how tier ≥ 2 has a tier − 1 node in its tree.

## Checks

```
bunx tsc -p .    # content.ts and content.test.ts clean (ignore other files)
bun test src/content.test.ts
```

Also run a throwaway `bun -e` script, not committed, that prints the cumulative η per sector and the fork pairs.

## Final report (concise)

- A table of sector parameters and ages.
- Counts against the volume targets.
- Facts you could not source, flagged.
- Anything missing or awkward in `types.ts`.
- The numbers you are least sure of.
