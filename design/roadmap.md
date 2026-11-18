# Rebound — roadmap

This replaces "Next steps" 3–7 in `CLAUDE.md`. Steps 1 (model tests and balancer, then a fresh review) and 2 (the UI per
`briefs/ui.md`) are in flight and unchanged. Everything below starts once both are merged.

Every milestone ends with a **shippable, playable game** deployed to Pages. The order is chosen to buy the most play per
unit of work:

1. Make the existing five eras honest and fun.
2. Give restraint a game.
3. Give every era its own identity and the broadsheet a cast.
4. Only then add layers and eras.

Sizes are in agent-days (one focused agent, one day). They are rough, for ordering, not promises.

## Working rules for parallel agents

- **Contract first, alone.** Each milestone opens with one commit to `src/types.ts` (plus the matching `SAVE_VERSION` bump
  and a migration in `deserialize`), written by the coordinator or a single contract agent. Then the lanes start. Nobody
  else edits `types.ts` during the milestone. Gaps are reported, as the v1 briefs already say.
- **Lanes own folders.** After the M2 split:

  | Lane | Owns |
  |---|---|
  | Core | `src/core/*` |
  | Content | `src/content/eras/<era>.ts` (one agent per era is safe) |
  | Prestige content | `src/content/prestige.ts` |
  | Text | `src/content/news/*` and `src/content/dispatches/*` |
  | UI | `src/ui/panels/<panel>.ts` |
  | Tools | `tools/*` |

  The registries (`src/content/index.ts`, `src/ui/main.ts`) each have a single owner per milestone.
- **Balance last, by one agent,** with `tools/balance.ts`. Balance changes numbers in content only, then encodes the
  targets as tests (`src/balance.test.ts`), so later milestones cannot silently break earlier pacing.
- **A content lint test** (see `long-game.md`) runs in CI from M1 onward.

---

## M1 — "v1, honest" (the five eras made fun and balanced) · ships first

**Goal.** The existing Steam → Code game teaches the right lesson, has decisions, and is balanced for the first 3–5 hours.
This fixes critique items 1–5, 8, 9, 11 and 12 in part.

**Contract** (one commit):

- `Cond` type.
- `EraDef.unlock.when` (keep `prevServicePriceBelow` optional and deprecated); `EraDef.yearSpan`.
- `EraState.budget`, `serviceDelivered`.
- `EraDerived.reboundDirect`, `frontierFold`, `shadowR`, `budgetR`, `withinBudget`.
- `UpgradeView.projectedDecade`, `bringsWithinReach`.
- `UpgradeDef.excludes`.
- `LeverDef.repeat`, `recycle`.
- `GlobalParams.steady`, `demography`, new `hindsight` weights.
- `InstitutionDef.levels`, `slot`; `MetaState.slots`, `loadout`; `ModelApi.setLoadout`.
- `KnowhowDef.branch`, `tier`.
- New `EffectDef` variants (`satMul`, `halfPriceMul`, `popGrowthMul`, `slotAdd`, `wellbeingAdd`, `unlock`).
- `SAVE_VERSION` 2 with migration.

**Core** (≈ 6 agent-days):

| Proposal | Work |
|---|---|
| P1 | Shadow solve, decade projections, "brings within reach" |
| P2 | Budget line, demography curve, lever repeat, decade milestones |
| P3 | Condition evaluator and unlock |
| P4 | Hindsight formula, loadout, Know-how branches |
| P7 | `excludes`, duty recycling |
| P14 | Calendar |

Tests for each.

**Content** (≈ 5 agent-days, parallel by era):

- Unlock conditions for eras 2–5.
- 12 forks (Steam 4, the others 2 each).
- 16 Know-how nodes in 2 trees; 14 Institutions with levels.
- Repeat tables for all levers.
- Headlines per era (about 150) and a first pass of era-aware crisis lines.
- 25 achievements.

**UI** (≈ 3 agent-days):

- Third card line.
- Budget line on the sparkline; decades ledger.
- Population gauge.
- Fork pairs.
- Loadout shop.
- Locked-era checklist.

**Balance** (≈ 3 agent-days):

- Era 1 against the first-hour table in `long-game.md`, then eras 2–5 for the 3–5 hour arc.
- Encode the pacing targets as tests, including the restraint against backfire Hindsight ratio (owner decision D1).
- New balancer strategies: `budget` (cap plus sufficiency, holds the line), `forks` (plays every fork arm), and `idle`.

**Docs.** The coordinator updates `DESIGN.md` (CLAUDE.md step 7):

- applications are founded by paying for them;
- Compute's η rises on its own;
- Steady State becomes "within a declining budget";
- unlocks are by milestone;
- the first-30-minutes curve is redrawn from balancer output.

**Playtest.** A Playwright script at a phone viewport covering the first 30 minutes and one Reckoning (CLAUDE.md step 4).

**Exit criteria:**

- the balancer's `budget` strategy reaches a 50-year Steady State in Steam by about hour 4 and the `efficiency` strategy
  never does;
- the reveal lands at 9–12 minutes;
- every efficiency card after the reveal shows a positive decade or within-reach line while frontier applications remain.

**Size:** about 17 agent-days, roughly 4 days wall-clock with 4–5 lanes.

---

## M2 — "Restraint has a game" (Settlement, the Commons, automation)

**Goal.** A player who restrains always has something to do, and the run no longer dies of its oldest era (critique items
6, 7, 14 and 16).

**First, the refactor** (CLAUDE.md step 5, moved here because every later lane needs it): split `src/model.ts` into
`src/core/` and `src/content.ts` into `src/content/` (one module per era, plus `prestige.ts`, `news/`, `global.ts`).
Behaviour must be unchanged: the M1 balance tests must pass byte-identically. One agent, about 2 days, alone.

**Contract:**

- `EraState.settled`; `EraDef.settle`; `ModelApi.settleEra`.
- `CommonsDef`, `GameState.commons`, `ModelApi.buyCommons`.
- `GameState.orders`, `ModelApi.setOrders`.
- `GlobalParams.offlineCapSeconds` becomes base plus `offlineCapAdd` effects.

**Core** (≈ 4 days):

- Settlement: freeze, spill check, unsettle.
- Commons: the wellbeing term, intensities, the time rebound.
- Standing orders inside `step`: the Market, the Civil Service, Treasury rules.
- `fastForward` runs the orders.

**Content** (≈ 3 days): settle dividends for 5 eras; 8 Commons projects; Institutions that unlock orders and offline cap
steps; 15 more achievements.

**UI** (≈ 3 days): settled rows; Settle ceremony card; Commons panel; orders panel; "While you were away" ledger.

**Balance** (≈ 2 days): a full lever run reaches Light alive; settled Steam survives Light's spill with green spending; the
efficiency-only player is never stuck (Settlement is optional).

**Exit criterion:** a 10-hour game across five eras for the budget strategy, with no stretch of more than 10 minutes with
nothing to buy or decide.

**Size:** about 14 agent-days.

---

## M3 — "Every era its own" (identities, the cast, dispatches, histories)

**Goal.** Eras stop being re-skins, and the broadsheet becomes a character (critique items 10, 12, 17 and 18).

**Contract:**

- Per-era mechanic fields: Steam `seams[]`; Light `load {…}` and rival supply; Motion `timeBudget` and the sprawl stock;
  Compute `priceSeen` and `rewardSetResource` for proof-of-work; Code unchanged.
- `LeverDef.sideEffects`.
- `DispatchDef`, `CastDef`, `GameState.dispatch`, `ModelApi.answerDispatch`.
- `AmbientDef`.
- `HistoryDef`; `createState(…, historyId?)`; `MetaState.histories`.
- `AchievementDef.when`.

**Core** (≈ 6 days): four era mechanics (seams, load, travel budget and sprawl, free at use and proof-of-work), lever
side-effects, the dispatch scheduler with timed modifiers, histories, ambient news.

**Content and text** (the big one, ≈ 10 days, highly parallel):

- Era retunes for the new mechanics.
- 5 rebounding levers.
- 6 cast members.
- **60 dispatches** (12 per era).
- 60 ambient templates.
- 10 histories.
- 75 Archive notes, one per card.

**UI** (≈ 5 days): seam ladder, load curve, travel-time dial, a "free" price tag; the dispatch panel; history picker;
Archive viewer.

**Balance** (≈ 3 days): a fork and dispatch audit (random arms ±10% on Hindsight per minute); each history completable;
each era's mechanic matters (a strategy that ignores it is ≥ 25% worse).

**Exit criterion:** 15–20 hours of distinct play across five eras.

**Size:** about 24 agent-days.

> Stop and look after M3. This is a complete, good, medium-length game (about 20 hours active). Everything after it
> lengthens the game. Ship M3, watch real players (or long balancer runs), and confirm the restraint loop is fun before
> building layers on top of it.

---

## M4 — "Act I complete" (generalised eras, Iron & Steel, revivals)

**Contract** (the largest single contract change, its own milestone for that reason):

- `EraId` becomes `string`; add `Content.eraOrder` and `Content.acts`.
- Shared stocks (`EraDef.resourceStock: string`, so Iron draws Steam's coal).
- `EraDef.feeds` for inputs.
- `UpgradeDef.unlockWhen` for revivals.
- Theme becomes a string (the UI keeps a theme registry).

**Core** (≈ 4 days): generalise every place that iterates `ERA_ORDER`; shared stocks; inputs.

**Content** (≈ 4 days): Iron & Steel to the era kit (`long-game.md`); revivals (steel boilers, and the LED stub for later);
the Act I finale ending.

**UI** (≈ 3 days): era tabs scale beyond 5 (a scrolling chip row); an Iron theme ("foundry"); an act-title card.

**Balance** (≈ 2 days).

**Size:** about 13 agent-days.

---

## M5 — "The World" (layer 2: Treaty, regions, leakage) and Plenty

**Contract:**

- `GameState.regions[]` (each with `eras`, `levers` and `commons`), world stocks and Pressure.
- `RegionDef`, `ArticleDef`.
- `MetaState.treaty`.
- `ModelApi.treaty`, `buyArticle`, `selectRegion`.
- Land as a bounded stock; return flows.

Motion, Compute and Code are re-gated behind the Treaty; existing saves are grandfathered (owner decision D3).

**Core** (≈ 8 days): world step with shared prices; the cheap script solve for rival regions; leakage; the green paradox;
the Treaty reset; Plenty's land and return-flow mechanic.

**Content** (≈ 6 days): 3 regions; 12 Articles; Plenty to the era kit; 18 dispatches for World events (oil, discovery,
summit).

**UI** (≈ 6 days): region switcher, world strip, Articles shop, Plenty land map.

**Balance** (≈ 3 days): the Act I replay inside a Treaty takes ≤ 15 minutes with typical Articles; each region plays
differently.

**Size:** about 25 agent-days.

## M6 — "The Great Acceleration" (Motion reworked inside the World, Comfort, Freight & Flight)

**Contract:** `ApplicationDef.ratchet`; `EraDef.offshore` (two ledgers); `EraDef.drawsOn` generalised to many targets.

**Core** (≈ 5 days). **Content** (≈ 8 days): three eras to the kit; 6 regions; 10 more histories; Articles to 25.

**UI** (≈ 5 days): two-ledger gauge; ratchet indicator; Comfort and Flight themes.

**Balance** (≈ 4 days). **Size:** about 22 agent-days.

## M7 — "The Attention Age" (layer 3: Long Now, boundaries, Compute and Code extended, Transition, endings)

**Contract:** Pressure as a map of boundaries; `BoundaryDef`; `MetaState.longNow`; `EraDef.displaces`; retirement levers.

**Core** (≈ 6 days). **Content** (≈ 10 days): Transition to the kit; Compute and Code extended (inference everywhere,
revivals); 6 boundaries; 8 endings; credits text.

**UI** (≈ 6 days): boundary rose; Transition theme; credits.

**Balance** (≈ 4 days): the hour targets in `long-game.md` through to the true ending.

**Size:** about 26 agent-days.

## M8 — "The Long Now" (post-game)

History ladder (stacking), weekly Almanac (the seed comes from the UI; the core stays pure), records, Archive completion,
the Steady Century epilogue.

**Size:** about 12 agent-days, mostly content and UI.

---

## Summary

| Milestone | Ships | Cumulative active hours of content (target) | Agent-days |
|---|---|---|---|
| M1 v1, honest | Five eras that teach the right lesson | 3–5 | 17 |
| M2 Restraint has a game | Settlement, Commons, automation | 8–10 | 14 |
| M3 Every era its own | Identities, cast, dispatches, histories | 15–20 | 24 |
| M4 Act I complete | Iron & Steel, generalised eras, revivals | 20–25 | 13 |
| M5 The World | Treaty, regions, Plenty | 35–45 | 25 |
| M6 Great Acceleration | Motion, Comfort, Freight & Flight | 55–65 | 22 |
| M7 Attention Age | Long Now, boundaries, Transition, endings | 110–120 | 26 |
| M8 Long Now | Post-game | 120–250+ | 12 |

That is about 150 agent-days in total, with the writing (dispatches, headlines, Archive) about a third of it. A dedicated
text lane from M3 onward keeps it off the critical path.

---

## Decisions for the owner

These are the only calls I think are genuinely yours. Each has a recommendation.

**D1. When does restraint out-earn backfire in prestige currency, and by how much?** The balancer needs a number.

*Recommendation:* backfire earns more Hindsight per minute in runs 1–2 (≥ 1.2×), so the player learns by failing.
From run 3, a competent budget run earns ≥ 1.5× backfire's rate, and backfire stays viable for speed-running Know-how and
some histories.

**D2. What does the Treaty reset (layer 2) wipe?**

*Recommendation:* wipe Hindsight, Know-how levels and the loadout. Keep Institutions *unlocked* (levels re-bought),
achievements, histories, records and the Archive. Precedent Articles must make the Act I replay take ≤ 15 minutes, or
the reset will feel like a punishment.

**D3. The ten-era roster, and moving Motion, Compute and Code behind the later layers.**

The roster (Steam, Iron & Steel, Light & Current, Plenty, Motion, Comfort, Freight & Flight, Compute, Code, Transition) puts
v1's Motion inside the World and Compute and Code inside the Long Now when M5 and M7 land.

*Recommendation:* approve. Keep v1 saves' access ("grandfathered"), and say so in a broadsheet item.

**D4. The editorial line on dark history.** This covers the cotton gin and slavery, colonial coaling stations, and famine
and the Green Revolution's politics.

*Recommendation:* acknowledge them in the Archive and, where the history demands it, in one sombre dispatch. Never make
them a resource, an application or a joke.

**D5. Ending and post-game.**

*Recommendation:* the credits roll at the true ending (all eras settled, Transition displacing, boundaries held for 50
years), the game continues, and the post-game is the history ladder and the Almanac. No hard end; no paid anything.

---

## Suggested replacement for CLAUDE.md "Next steps" 3–7

To paste in once steps 1–2 are merged.

> 3. **M1 "v1, honest"**: instruments (counterfactual rebound, decade and within-reach projections), budget-line Steady
>    State with demography, milestone unlocks, a new Hindsight formula with an Institution loadout and Know-how forks,
>    run forks, an era calendar; balance Eras 1–5; encode the pacing tests; Playwright phone playtest; bring DESIGN.md in
>    line. See `design/roadmap.md`.
> 4. **M2 "Restraint has a game"**: first split `src/model.ts` → `src/core/` and `src/content.ts` → `src/content/`
>    (behaviour unchanged), then Settlement, the Commons and standing orders.
> 5. **M3 "Every era its own"**: one mechanic per era, levers that rebound, the cast and dispatches, histories, the
>    Archive. Stop and evaluate.
> 6. **M4–M8**: Act I complete → the World (Treaty) → the Great Acceleration → the Attention Age (Long Now) → the
>    post-game. See `design/long-game.md` for structure and hour targets.

---

## Amendments from the genre audit (18 Nov 2026)

`design/genre-audit.md` scored this plan against what makes long incrementals work. These changes are adopted; where they
conflict with the text above, they win. Vocabulary has also changed since this document was written: the unit of play is
an Industry (a `Sector` in code) and the period is an Age; "era" above means Industry.

**M1 (in progress).**

- The paradox must be felt at the first cards: boilers raise coal use within a minute and the condenser roughly doubles it
  within two. These are the first balance tests.
- Purchase cadence: at least 12 purchases in the first 10 minutes, no gap over 90 s in the first 15 minutes, none over
  3 minutes in run 1. One repeatable growth card per Industry supplies the cadence.
- Clicking fades: worth at least 1.5× idle income at 0:30, at most 0.25× by the reveal.
- The Coal Question card poses the question; the answer arrives only once it is bought.
- UI: nothing shown before it can be used (Mandate, Call a Reckoning); an "affordable" signal on the first screen; save
  safety (persistent storage, a backup at each Reckoning, export reminder, installable); notation, hotkeys, text size,
  fork confirmation, colour never the only signal.

**M2.**

- Offline time never collapses a run: `fastForward` stops one step before a collapse or crisis and the return note says
  why. Base offline cap 8 hours. Contract: `GlobalParams.offline { capSeconds, holdBefore }`, `GameState.lastOffline`.
- Know-how can be re-chosen between runs: `ModelApi.respecKnowhow`. Permanent forks with no respec become "look up the
  one right build".
- Each decade within budget offers a choice of two dividends (`steady.decadeChoices`, `chooseDecadeDividend`), so holding
  a budget is a string of decisions and not a timewall. This is the audit's second-biggest risk.
- Exit criterion tightened from "no stretch of more than 10 minutes with nothing to buy or decide" to at most 3 minutes
  of active play in hour 1 and at most 5 minutes in hours 1–10.
- Run 2 must differ from run 1 in kind, not degree (the audit's biggest risk: "the joke lands once"). Settlement, the
  Commons and standing orders carry this; if M1 playtests show hours 1–2 are thin, pull the first automation (the Market)
  forward to 45–75 minutes.

**M3.**

- Ship a real ending: credits on the Act I Steady State, at about 15–20 active hours. The true ending stays later.
- Something new at least every 2 active hours up to hour 20. The Light phase (hours 7–13) currently has one mechanic in
  six hours and needs a second.
- Rules for Histories, written before any exist: their rewards are options and never required to progress; no
  quality-of-life feature is locked behind one; the stacking ladder is post-game and capped.

**M5 onwards.** The second prestige layer (Treaty) lands at 14–20 hours. The audit's third risk is replay and challenge
fatigue in hours 20–60: the Treaty must not make the player replay Act I at length (the 15-minute bound in D2 stands),
and no ending may be promised that the game does not deliver.

**Deliberately not adopted.** The audit lists where genre wisdom should be ignored because of what this game is about;
see its last section before "fixing" any of those.
