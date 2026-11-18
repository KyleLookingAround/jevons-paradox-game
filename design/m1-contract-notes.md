# M1 contract notes

The M1 contract is in `src/types.ts`, in its own commit. These notes cover four things:

- the decisions the documents did not dictate, with reasons;
- what was deliberately left out of M1;
- the full old → new name mapping for the Sector/Age split;
- what no longer compiles.

`DESIGN.md` and `design/*.md` still say "era". The coordinator will update them.

## 1. Sector and Age (owner decision, folded in)

- **Sector** (in code) is the unit of play: what `EraDef`, `EraState` and `EraDerived` were. On screen it is an
  **Industry** (plural Industries). No player-facing text says "sector" or "era" for the unit.
- **Age** (in code and on screen) is the period: a year span, the page theme, and the sectors that belong to it.
- `SectorId` is now `string`, pulled forward from M4:
  - `Content.sectorOrder` gives the listing, iteration and default unlock order;
  - nothing in the contract assumes five sectors;
  - the win is defined as "every sector in `sectorOrder` open, and 50 years with all of them decoupling".
- **Unlocks.** `unlock.after?: SectorId[]` names prerequisites. The default is the previous sector in `sectorOrder`.
  This lets parallel sectors such as Iron beside Steam unlock later without a contract change.
- **`Derived.nextSectors` is an array, not a single `nextEra`.** With `after`, more than one sector can be the next to
  open.
- **The calendar sits on the Age.** `AgeDef.yearSpan` is the age's span, and `SectorDef.firstYear` is the year a
  sector's own clock starts.
  - The age's calendar is the maximum of two values:
    - the age's first year plus the time since the age began;
    - each open sector's `firstYear` plus its time open.
  - After the age's last year, the calendar runs at 10% speed (`CALENDAR_LATE_RATE`).
  - `Derived.year` is the maximum over all ages with an open sector, so it never runs backwards.
  - This keeps Light from opening in "1810".
  - It departs from P14 in one respect: P14 held the year at the era's end. I chose the slowed clock because a
    four-hour Steam budget run would otherwise sit in "1870" for three hours and stamp every decade of the ledger
    "1870".
- **Theme and accent.** The page theme moved to `AgeDef.theme`. A sector carries an optional `accent` key, which the UI
  maps to a small token set, plus a **transitional** `theme` override.
  - **M1 assignment.** Three ages, following the acts in `long-game.md`. This is the least wasteful option: all five
    finished looks keep working with no new styling work. Five one-sector ages would have made Age a synonym for era.
  - Remove the sector `theme` overrides once each age has its final look (M3–M4).

  | Age id | Name | yearSpan | theme | sectors (firstYear) |
  |---|---|---|---|---|
  | `coal` | The Coal Age | [1780, 1914] | `ledger` | steam (1780), light (1870, theme override `gaslight`) |
  | `acceleration` | The Great Acceleration | [1909, 2010] | `chrome` | motion (1950) |
  | `attention` | The Attention Age | [2000, 2100] | `terminal` | compute (2000), code (2025, theme override `agentic`) |

- **Prestige layers.** An age can own a prestige layer later; a field such as `layer` will be added then. Nothing
  depends on it now.

### Old → new mapping (rename mechanically)

| v1 | M1 |
|---|---|
| `EraId` (5-member union) | `SectorId` (= `string`); new `AgeId` |
| `ERA_ORDER` (constant) | `content.sectorOrder` (removed from types) |
| `EraDef` / `EraState` / `EraDerived` | `SectorDef` / `SectorState` / `SectorDerived` |
| `Content.eras`, `GameState.eras`, `Derived.eras`, `HistorySample.eras` | `.sectors` |
| `Partial<Record<EraId, X>>` | `Record<SectorId, X>` (keys may be absent) |
| `EraDef.index` | removed (position in `sectorOrder`) |
| `EraDef.theme` | `AgeDef.theme`; optional `SectorDef.theme` (override) and `SectorDef.accent` |
| `EraDef.years` | `SectorDef.years` (display only, unchanged) |
| P14 `EraDef.yearSpan` (never shipped) | `AgeDef.yearSpan` + `SectorDef.firstYear` |
| `EffectDef.era` (every variant) | `EffectDef.sector` |
| `UpgradeDef.era`, `LeverDef.era` | `.sector` |
| `EraDef.drawsOn.era` | `SectorDef.drawsOn.sector` (`spill.to` unchanged) |
| `EraDef.unlock { prevServicePriceBelow, minReckonings }` | `{ when?, minReckonings, after?, prevServicePriceBelow? (deprecated) }` |
| `NewsItem.era`, `pendingReckoning.era` | `.sector` |
| `RunSummary.eras`, `RunSummary.causeEra` | `.sectors`, `.causeSector` |
| `RunStats.steadyEras` (model extra) | `RunStats.steadySectors` |
| `MetaState.steadyEras` | `MetaState.steadySectors` |
| `MetaState.furthestEra` (index) | `MetaState.sectorsOpened` (map of ids ever opened) |
| `hindsight.perEraReached`, `perSteadyEra` | `perSectorReached`, `perSteadySector` |
| `Derived.nextEra { priceNow, priceNeeded, … }` | `Derived.nextSectors[] { id, checklist, ready, … }` |
| HeadlineKey `'eraOpened'`, `'steadyEra'` | `'sectorOpened'`, `'steadySector'` (new: `'ageBegins'`) |
| headline placeholder `{era}` | `{sector}` (new: `{age}`, `{year}`, `{n}`) |
| `drawBudget(…, era)` (new) | `drawBudget(…, sector)` |
| `UpgradeView.projectedChange` | `UpgradeView.projectedDecade` (+ `bringsWithinReach`) |
| `MetaState.institutions: Record<string, boolean>` | `Record<string, number>` (level) |
| `EraState.etaAtBase` (model extra) | `SectorState.etaAtBase` (typed) |

Words in comments ("Era 4 twist") now name the sector ("Compute's twist").

## 2. Definitions settled (and why)

### Rebound: the shadow (P1), not per-purchase re-anchoring

`shadowR` is the sector solved again with η frozen at `etaAtBase`. Everything else is identical: founded applications,
population, depletion, levers and cap.

- `promisedR` = `shadowR` / `etaFold`.
- `rebound` = (R − promised) / (shadow − promised). This is direct rebound.
- `frontierFold` = `shadowR` / `baseR`. It covers new applications, population and scarcity together.
- R / baseR = `frontierFold` × R / `shadowR`, so the two factors multiply out exactly.

Why not the reviewer's per-purchase re-anchoring:

- The meter would jump at every purchase and lose its cumulative meaning.
- It would still mix frontier growth into the number between purchases.

The shadow is continuous and uses the same world. The per-purchase view the reviewer wanted is exactly the card's new
"This decade" line.

I kept the field name `rebound` and did not add `reboundDirect`, because one meter means one number. Under a binding cap,
direct rebound reads about 100%. That is correct: the savings became service, and the cap set the coal. The UI brief
asks for a line saying so.

### Decoupling and Steady State: one definition (P2, with the reviewer's intent)

The definitions:

- **Budget line.** Drawn at the current R, it declines 5% per decade (a content number).
- `withinBudget` is R ≤ budget × 1.005.
- `decoupling` is `withinBudget`, wellbeing at or above target, and no Reckoning pending.
- `steadyYears` is the unbroken streak.
- A **decade** is a completed 10-year streak.
- **Steady State** is a 50-year streak.

This replaces v1's `trendR` test everywhere: the meter, the Hindsight terms, `steadyYearsAll` and the achievements.

How it meets the reviewer's objections:

- **Short dips from scarcity or crises.** A dip earns nothing unless it lasts a whole decade. Hindsight counts decades,
  not years; I used 10 years rather than the reviewer's 5 for a round ledger. The slowly declining line plays the role
  of the reviewer's slow average.
- **"Service holding or rising"** was not adopted. It would block sufficiency, which is a legitimate way to decouple.
  The wellbeing target already blocks degrowth by accident.

When a budget is drawn:

- on the first lever the player raises in that sector;
- when the player draws one explicitly (`drawBudget`, so pure abstention also counts);
- automatically, for an institution's standing cap, on the first step with demand.

Redrawing resets the streak but keeps the decades already earned. Caps are a fraction of the budget line and follow it
down, which makes the cap the tool for the job (P2.3).

Risk for balance: an efficiency player could draw a budget at peak and let depletion pull R under the line for a
decade. The unburnt and intensity terms penalise this. The balance brief asks for a check.

### Hindsight (P4a, owner decision D1 as recommended)

The total is `max(1, round(…))` of six terms:

| Term | Value |
|---|---|
| Wellbeing | `perWellbeingYear` × wellbeing-years ÷ max(1, intensity)^`intensityExponent` |
| Budget | `perBudgetDecade` × decades |
| Unburnt | `perUnburnt` × Σ share of reserve left × min(1, years at target ÷ 50) |
| First backfire | `perFirstBackfire` × sectors backfiring for the first time ever |
| Sectors reached | `perSectorReached` × (open sectors − 1) |
| Steady State | `perSteadySector` × sectors reaching Steady State this run |

Intensity is the run's average burn fold, Σ (resourceUsed / baseR) ÷ Σ openFor. It is unit-free, so sectors with large
units do not dominate.

Peak wellbeing is dropped from the formula: it rewards the boom (critique item 1).

The unburnt term is ramped by years at target. That stops "reckon at minute one" and idle runs from earning it.

D1 is met through two mechanisms:

- In runs 1–2, restraint has no Institutions or slots and the reveal comes late. The first-backfire award pays failure.
- From run 3, budget decades and the intensity divisor take over.

The balancer must hit the ratios: at least 1.2× for backfire in runs 1–2, and at least 1.5× for a competent budget run
from run 3.

### Other decisions not dictated by the documents

- **Cap and duty revenue is "levy revenue", never income** (coordinator's decision).
  - Income is `m × p_pre × D`, where p_pre excludes the permit and the duty. In v1, income included the margin on
    permits.
  - The "duty floods Mandate" share moved to content as `global.levy.mandateShare`, so balance can tune it.
- **Recycling (P7).** Options are `treasury` (v1) and `dividend`.
  - A dividend is counted in wellbeing as the service it could buy, with no Mandate. The rebound arises economy-wide,
    through demography.
  - `commons` is reserved for M2.
  - I did not add `UpgradeDef.drain`: a negative `marginAdd` is the same thing (the Boulton & Watt premium).
- **Hindsight is spent only between runs** (`Derived.freshRun`). This applies to Know-how, Institutions and the loadout.
  - It removes the "start-of-run effects bought mid-run" defect class without storing a meta snapshot per run.
  - Hindsight is only earned at a Reckoning anyway.
  - A purchase in a fresh run rebuilds the run (as v1's `withMeta`).
- **Institutions only act while seated.**
  - Levels are `cost`/`effects` (level 1) plus `nextLevels[]`. Existing content keeps compiling.
  - Effects are cumulative across levels.
  - Slots are stored in `meta.slots` and raised by the one-off effect `slotAdd`, for example in
    `steady.firstSteadyEffects` or in Know-how.
- **v1 migration grandfathers v1 players.** `slots` is set to max(2, institutions owned), and every owned institution
  stays seated.
- **Know-how forks are permanent (no respec in M1).** The loadout is the part of the meta choice that stays open. Trees
  use `tree` (default `'general'`) and `tier` (requires a node of tier − 1 in the same tree) plus `branch`.
- **Upgrade forks.** `excludes` is symmetric, and excluded cards stay visible so the fork reads as a choice.
  "Jevons Was Right" ignores excluded efficiency cards.
- **`AchievementDef.when` brought forward from M3.** M1 content needs 25 achievements, and hard-coding 20 ids in the
  core would be worse.
- **Projections cover `capital` cards too.** Cheaper engines are a rebound driver too (the Manchester school).
  - "Brings within reach" lists only applications that the upgrade itself brings into reach within the decade.
  - Its percentage is the one-step effect of founding the application at the horizon. It is cheap, needing no third
    simulation.
- **New one-off effects.**
  - `capitalAdd` is measured in seconds of income, so that one number works in every sector.
  - `mandateAdd` and `slotAdd` are flat amounts.
  - The family (standing or one-off) of every effect is documented.
- **Contract constants.** `EXHAUSTED_BELOW` (0.2%), `BUDGET_TOLERANCE`, `PROJECTION_YEARS`, `MAX_TICK_SECONDS` (60)
  and `CALENDAR_LATE_RATE` are exported from types, because several lanes reason about them.
- **Model follow-ups written into the contract:**
  - `tick` clamps dt to 60 s;
  - the Steady State headline fires once per sector per run.
- **Doc corrections from the review:**
  - `steadyYearsAll` counts years with every open sector decoupling, resets when a sector opens, and the win needs all
    sectors open;
  - `LeverDef.requires` accepts `'revealed'`, upgrade ids and (now seated) institution ids; anything else counts as met;
  - the cap's 95% squeeze limit is documented;
  - substitution costs 1.5 × c, and there is no `capCostMul` on the lever.
- **UI-report additions:**
  - `KnowhowView` and `InstitutionView` (cost, level, affordability, requirements met);
  - `Derived.clickValue`;
  - the formula-sheet parts of the price: `capCost`, `margin`, `resourcePriceBase`, `permitPrice`, `preLevyPrice`,
    `permitPart`, `dutyPart`, `substitutedShare`;
  - `nextCrisisFraction`.
- **Optional with defaults, so existing content keeps its meaning:** `demography`, `steady`, `levy`, `startingSlots`,
  `sectorHeadlines`, `excludes`, `locked`, `repeat`, `recycle`, `tree`/`tier`/`branch`, `nextLevels`, `slots`, `when`,
  `firstYear`, `accent`.
- **Breaking changes in content:** `sectors`/`sectorOrder`/`ages`, the `sector` fields, the new hindsight shape and the
  new headline keys. The rename forces these anyway.

## 3. Left out of M1 on purpose

- Settlement, the Commons (and recycling to them), standing orders and the Market: M2.
- Per-sector mechanics (seams, load, travel budget, free at use), lever side-effects, dispatches and the cast, ambient
  headlines, histories and the Archive: M3. `AchievementDef.when` is the one M3 item brought forward.
- Shared stocks, `feeds` and revivals (`unlockWhen`): M4.
- Regions, Treaty, Articles: M5 and later.
- From P1: separating the economy-wide rebound from the frontier. `frontierFold` covers both, and the population gauge
  shows population on its own. A second shadow solve per sector per frame was not worth it yet.
- From P4: slot upkeep or cost per seat beyond `slots`, and a Know-how respec.
- From P15: retrospective headlines on the Reckoning card. The `{year}` and `{n}` placeholders are in.

## 4. What no longer compiles (`bunx tsc -p .`, 519 errors)

This is expected; the lanes fix it. `src/types.ts` itself is clean, and `tools/` is outside the tsconfig `include`.

| File | Errors | Main causes |
|---|---|---|
| `src/model.ts` | 110 | `eras` → `sectors` on Content, GameState and Derived; `era` on effects, upgrades and levers; `ERA_ORDER`/`EraId` imports; missing new Derived, SectorDerived, LeverView, RunStats and MetaState fields; `institutions` is now a number; new ModelApi methods |
| `src/model.test.ts` | 101 | the same renames; old hindsight fields; `projectedChange` |
| `src/model.review.test.ts` | 50 | the same |
| `src/fixture.ts` | 22 | `era` on effects; `eras` / no `sectorOrder` or `ages`; old hindsight and headline keys |
| `src/content.ts` | 77 | `era` on 27 effect lists, 23 levers and 22 upgrades; `eras`; `perPeakWellbeing`; `eraOpened`/`steadyEra` keys; missing `ages`/`sectorOrder` |
| `src/ui/devmock.ts` | 110 | mock content and state in the v1 shape |
| `src/ui/ctx.ts` | 13 | `EraId`/`EraDef` imports, `eras` |
| `src/ui/sheets.ts` | 11 | `RunSummary.eras`/`causeEra`, `furthestEra`, `institutions` as boolean |
| `src/ui/bar.ts` | 7 | `nextEra` → `nextSectors` |
| `src/main.ts` | 7 | `eras`, `EraId` |
| `src/ui/panels.ts` | 5 | `projectedChange`, `era` |
| `src/ui/world.ts` | 4 | `eras` |
| `src/ui/app.ts`, `src/ui/gauges.ts` | 1 each | `eras` |
