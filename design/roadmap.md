# Rebound — roadmap

Second design pass, 19 Nov 2026. This replaces the first-pass roadmap and its appendix of genre-audit amendments,
which are now folded into the milestones. Structure and hours are in `design/long-game.md`; the four paradigm shifts
in `design/paradigm-shifts.md`.

Every milestone ends with a **shippable, playable game** deployed to Pages, and with exit criteria a balancer run or a
scripted browser run can check. The order buys the most play per unit of work:

1. Make restraint a game and run 2 different (M2).
2. Give every Industry its own identity, the broadsheet a cast, and the game a first ending (M3). **Stop and look.**
3. Complete Act I as a shift of its own, The Survey (M4).
4. Then one shift per milestone: the Other Chair (M5), the Second Ledger (M6), the Inheritance (M7, the prestige
   shift), the Objectives (M8), Unbuilding (M9), Enough (M10, the post-game).

**Revised 20 Nov 2026** (M4 design revision, on the owner's direction "each one should be a paradigm shift" and "there
should also eventually be a paradigm shift in the prestige"): every milestone from M4 on must change what the player
understands the game to be. Abroad and the two ledgers move from M5 to M6; a new M7, The Inheritance, is inserted; the
old M7–M9 become M8–M10. Older documents (`long-game.md`, `paradigm-shifts.md` before its revision note, the M3 notes)
use the old numbers: their M7 is now M8, M8 is M9, M9 is M10.

| Milestone | Shift | Before → after (what the player believes) | The moment |
|---|---|---|---|
| M4 | **The Survey** | The gauges show the world, and what I burn is mine → every gauge is somebody's estimate, and my burn is shared and burnt elsewhere | The Board's Survey: the skippers' report and the survey printed side by side |
| M5 | **The Other Chair** | I make the choices → someone paid to grow makes them, and I write rules he finds his way round | Take office: Pryce's prospectus quoting the player's own first-run times |
| M6 | **The Second Ledger** | When my figures fall the world's fall → my figures can fall because the burning moved abroad | The first consumption ledger: home gauge down, consumption up, a ship leaving for the horizon |
| M7 | **The Inheritance** (prestige) | A Reckoning wipes the slate → each run is a generation that receives what the last left and owes the next | Hand over: the next run opens on the same unwashed valley; "The books are closed. The world is not." |
| M8 | **You Write the Objectives** | I act, and acting well is enough → I specify, and get exactly what I measured | The first agent's report: target met to the decimal, the scene showing how |
| M9 | **Unbuilding** | Progress is what I add → progress is what I take away while wellbeing holds | The first retirement: a pit sealed, its tab reprinted in riso |
| M10 | **Enough** | More play is more game → the ledger is closed, and stopping is a move | The last household return: "The ledger is closed. You may stop." |

Details: `design/m4-design.md` §14.1 (the table and its reasons) and §18 (The Inheritance).

Sizes are agent-days (one focused agent, one day): rough, for ordering, not promises. S ≤ 1, M 2–4, L a week or more.

---

## Working rules for parallel agents

- **Contract first, alone.** Each milestone opens with one commit to `src/types.ts` (with the `SAVE_VERSION` bump and
  a migration in `deserialize`), written by the coordinator or one contract agent. Then the lanes start. Nobody else
  edits `types.ts` during the milestone; gaps are reported, not patched.
- **Lanes own folders.** From the start of M2, after the split:

  | Lane | Owns |
  |---|---|
  | Core | `src/core/<module>.ts`: one owner per module per milestone (e.g. `steady.ts`, `orders.ts`, `commons.ts`, `chair/*.ts`, `agents.ts`, `unbuild.ts`) |
  | Content | `src/content/sectors/<id>.ts` (one agent per Industry is safe) |
  | Prestige content | `src/content/prestige.ts` (Know-how, Institutions, Charters, Articles, Measures) |
  | Text | `src/content/news/*`, `src/content/dispatches/*`, `src/content/archive/*` |
  | UI | `src/ui/panels/<panel>.ts` |
  | Scene | `src/ui/scene/styles/<id>.ts`, `props/<id>.ts`, `layouts/<id>.ts` |
  | Tools | `tools/*` (strategies in `tools/strategies/<name>.ts` after M2) |

  The registries (`src/core/index.ts`, `src/content/index.ts`, `src/ui/app.ts`, `src/ui/scene/registry.ts`) each have
  a single owner per milestone.
- **Balance last, by one agent,** with `tools/balance.ts`. Balance changes numbers in content only, then encodes the
  targets in `src/balance.test.ts`, so later milestones cannot silently break earlier pacing.
- **The content lint test** runs in CI (ids, `Cond`s, a `catch` per lever, one mechanic and a rebounding lever per
  Industry, headline length, banned Americanisms, no "era"/"sector" in player text, a cost on every dispatch arm, a
  source per Archive note).
- **The scripted browser run** (Playwright, 390 × 844) is extended every milestone with that milestone's exit beats.
  Run it in small batches: whole-suite runs have coincided with container kills.
- **The core stays pure.** No DOM, no `Date.now()`, no `Math.random()`, no wall-clock in `step`, `tick`, `derive` or
  `fastForward`. The one bridge from the UI's clock is a player action, `fileReturn` (M3).

---

## M1 — "v1, honest" · built

**Built** (commits `0a31065` to `028ad31` and the UI and scene work since):

- The contract on Sectors and Ages (save version 2): shadow rebound, decade and within-reach projections, the budget
  line (5% a decade until Steady State, then held), demography, milestone unlocks (`Cond`), the Hindsight formula,
  Institutions with levels and seats, Know-how trees with forks, upgrade forks (`excludes`), lever repeat tables,
  revenue recycling, the Age calendar.
- Content: five Industries, 26 applications, 67 upgrades (12 fork pairs, 5 repeatable growth cards), 25 levers, 18
  Know-how nodes, 16 Institutions, 26 achievements, 207 headlines.
- Balance and tests (`src/balance.test.ts`): the first-cards paradox, the first-hour beats, cadence, click fade, the
  reveal at 8.6 minutes, run 1 ending at about 41 minutes, restraint 4.6× by run 3, Light by about 50 minutes, Code by
  about 3.6 h of restraint play, the fork audit.
- UI: the cards' third line, budget line and decades ledger, population, fork pairs, the loadout shop, locked-Industry
  checklists, the audit's UI items (affordable signals, save safety, quality of life, statistics), and the living
  scene with five art styles.
- `DESIGN.md` rewritten (this pass).

**Unmet, carried to M2 by design** (numbers alone could not move them):

- First Steady State at about 1.9 h against 3–4 h: once second-run Institutions are seated, restraint decouples
  almost at once.
- First decade within budget in run 3, not at 18–25 minutes: the restraint player's wellbeing (21.5, 24.9) never
  reaches the target (34) in runs 1–2.
- Backfire out-earns restraint 1.1× in run 1 against 1.2×.

**Deferred:** the independent model review (in progress); a committed Playwright pacing script covering the first 30
minutes and one Reckoning (the UI lane's real-play checks exist but are not a CI script); per-Industry mechanics,
dispatches, Histories (M3).

---

## M2 — "Restraint has a game; run 2 is different"

**Goal.** A player who restrains always has a decision to make; the restraint loop pays inside run 1; Steady State is
earned at 3–4 h; run 2 differs from run 1 in kind. It answers the audit's first two risks.

**First, the split** (alone, about 2 days): `src/model.ts` → `src/core/` and `src/content.ts` → `src/content/` (one
module per Industry, plus `prestige.ts`, `news/`, `global.ts`). Behaviour unchanged: the M1 balance tests pass with
identical numbers.

**Contract** (one commit, save version 3):

| Change | Fields and rules |
|---|---|
| Decades against the line's own day | `BudgetState.w0` (wellbeing when drawn); `steady.decadeWellbeing: 'drawn' \| 'target'` (default `'drawn'`); `steady.drawnSlack` (default 0.05). A decade needs R ≤ line and W ≥ min(target, w0 × (1 − slack)). |
| Clear skies (the sink line) | `BudgetState.p0` (pressure when drawn); `steady.clearBelow` (default 0.5; Industry override) and `steady.clearFloor` (default 0.03 of `collapseAt`); `SectorDerived.clear` (P ≤ max(clearBelow × p0, clearFloor × collapseAt) and dP/dt ≤ 0); `SectorDerived.sinkR` (the R at which equilibrium pressure equals that level, or null where there is no absorption, as in Code, whose stock must be deleted down); `SectorState.clearYears` (the Steady streak). Steady State = 50 years with decoupling (target wellbeing, not the drawn one) **and** clear. The budget line holds once Steady State is reached, as now. Why relative to the day drawn: in M1's `budget` runs pressure at Steady State was already only 5–21% of collapse, so a fraction of `collapseAt` would not bite; halving the pressure the line was drawn under needs roughly halving R, which a Gentle line alone takes about 13 decades to do. |
| The pace of a line | `steady.paces: { id: 'gentle' \| 'firm' \| 'severe'; declinePerDecade: number; dividendMul: number }[]`; `BudgetState.pace`; `drawBudget(state, content, sector, pace?)`. |
| A choice of two dividends | `steady.decadeChoices: EffectDef[][]`; `GameState.pendingDividends: { sector; options: number[] }[]`; `ModelApi.chooseDecadeDividend(state, content, sector, index)`. Unchosen dividends wait; they never block play. |
| Settlement | `SectorState.settled: { D; R; since } \| null`; `SectorDef.settle: { dividend: EffectDef[]; upkeepPerSpill: number }`; `ModelApi.settle(sector)`. |
| The Commons | `CommonsDef`; `Content.commons`; `GameState.commons`; `ModelApi.buyCommons`; `LeverRecycle` gains `'commons'`. |
| Standing orders | `GameState.orders: { market: Record<SectorId, { on; paybackMax }>; civilService?; treasury? }`; `ModelApi.setOrders`. The Market is available from run 2 (`meta.reckonings ≥ 1`), on by default. |
| Charters | `CharterDef { id; name; blurb; effects; requires?: Cond }`; `Content.charters`; `MetaState.charter`; `Derived.charterOffer: string[]` (two, from the seed); `ModelApi.chooseCharter` (between runs only). |
| Offline never collapses a run | `GlobalParams.offline: { capSeconds; holdBefore: 'crisis' \| 'collapse' \| null }` (replaces `offlineCapSeconds`); `GameState.lastOffline`. |
| Know-how respec | `ModelApi.respecKnowhow` (between runs); `GlobalParams.respecCost`. |
| Recorded for later shifts | `MetaState.opening` and `firstOpening` (first 40 purchase and founding actions, game seconds); `RunStats.decisions`; `StatKey` `'decisions'`. |

**Core** (≈ 7 days): the decade and Steady State rules; the sink line; paces; dividend choices; Settlement (freeze,
spill check, unsettle); the Commons (wellbeing term, intensities, time rebound); standing orders inside `step` and
`fastForward`; Charters; offline hold; respec; recording. Tests for each.

**Content** (≈ 4 days): `clearBelow` and paces per Industry; dividend pairs; settle dividends for five Industries;
8 Commons projects; 8 Charters; Institutions that unlock the Civil Service, Treasury rules and offline steps; 15
achievements; base offline cap 8 h.

**UI** (≈ 4 days): the sink line on the sparkline; the pace choice when drawing; the dividend card; the settled row and
Settle ceremony; the Commons panel; the orders panel with per-Industry Market switches; the Charter choice on the
Reckoning screen; the "While you were away" ledger, saying what was held; respec. The UI begins recording the play
ledger (shift 3) now, so that the reveal in M3 has data, and states it in the settings (owner decision D6).

**Scene** (≈ 2 days): the sky-clearing state at the sink line (weather below `clearBelow`); a settled Industry's
quiet look; Commons props (baths, library, allotments); the Market's purchases appearing as scaffolding that builds
itself.

**Balance** (≈ 3 days): new strategies `market` (run 2 with the Market on and the player only founding and drawing)
and `charter` (each Charter arm); a decision log in the balancer for the cadence checks.

**Exit criteria** (balancer and Playwright):

- `budget` run 1 earns its first decade at 18–25 minutes; `efficiency` earns none in runs 1–2.
- First Steady State at 3–4 h cumulative for `budget` and `mixed`; `efficiency` never; `peakdraw` earns ≤ 0.5×
  `budget`'s Hindsight per minute.
- Restraint ≥ 1.5× backfire from run 3; backfire ≥ 1.2× in runs 1–2.
- At most 3 minutes of active play without a purchase or decision in hour 1, at most 5 in hours 1–10.
- Run 2 opens with the Market on and a Charter chosen, and shows a new verb within 5 minutes (Playwright).
- An 8-hour `fastForward` never ends in a crisis or collapse; the return note names what held.
- A 10-hour game across five Industries for `budget`, with Settlement used.
- Every Charter within ±15% of the mean Hindsight per minute (`charter`).

**Size:** about 24 agent-days.

---

## M3 — "Every Industry its own" (mechanics, the cast, Histories, the second reveal, a first ending) · built

**Built (20 Nov 2026), on the working branch.** As planned below, with these changes, withdrawals and deferrals:

- **The first ending's rule changed** (coordinator's decision): every Industry settled at once, held fifty years
  (`GlobalParams.endingYears`), not "settled or within budget and clear". Parliament holds three settlements at once
  (`GlobalParams.settleMax`); the Settlement Commission (an Institution bought with Hindsight) makes room for the fourth
  and fifth. Measured (20 Nov 2026): `mixed` 18.2 h, `budget` 18.9 h, the human-like player 15.4 h, none before
  hour 15; no clock gate (`design/unlock-schedule.md`).
- **The mechanics are temptations** (coordinator's decision): the "ignoring a mechanic is ≥ 25% worse" criterion is
  replaced by "the burner gains ≥ 15% income by engaging, and the trade is shown at the point of decision" (met: seams
  +125%, load +330%, travel +82%, free +30%).
- **Withdrawn:** "the first decade within budget in run 1" and "burning out-earns restraint by 1.2× in run 1" (the
  budget moved to run 3 by the owner's direction, so neither can be measured in run 1).
- **Accepted miss:** "something new every two active hours to hour 20": at most two systems arrive per run from run 4
  by the owner's direction, and the run in which the ending is played is long, so the longest gap between firsts
  before hour 20 is 2.7 h (`budget`) to 6 h (`mixed`, hours 13–19: the ending's own run, five settlements in it).
- **Not met:** the letters' "thoughtful beats always-default by 5–15% and always-default beats random" for the budget
  player (the burning player's thoughtful policy does beat default by 10%); see the M3 finishing report.
- **Deferred:** persistent Settlement across Reckonings (M4, with the Act I capstone); Wirth's law (M7).

**Goal.** Industries stop being re-skins, the broadsheet becomes a character, the game rebounds on the player, and
there is a real ending at 15–20 h (audit recs 14–16).

**Contract:** per-Industry mechanic fields (Steam `seams[]`; Light `load {…}` and rival supply for gas against
electric; Motion `timeBudget` and the sprawl stock; Compute `priceSeen`; Code unchanged); `LeverDef.sideEffects`
(levers that rebound, with `unless` for pairing); `DispatchDef`, `CastDef`, `GameState.dispatch`, `answerDispatch`
(expiring with a default); `AmbientDef`; `HistoryDef`, `createState(…, historyId?)`, `MetaState.histories`; shift 3:
`GameState.returns`, `ModelApi.fileReturn`, the `returned` Cond leaf, the `'return'` headline key; `RunSummary` peak
adoption and pressure per Industry (for the before-and-after pictures).

**Core** (≈ 6 days): four mechanics; lever side-effects; the dispatch scheduler with timed modifiers; Histories;
ambient news; `fileReturn`.

**Content and text** (≈ 12 days, highly parallel): mechanic retunes; one rebounding lever per Industry; 6 cast members;
**60 dispatches**; 60 ambient templates; **10 Histories**, written to the rules below; 75 Archive notes; the
Proprietor's Day pamphlet, card and 12 return templates; 8 "Enough" achievements; the first ending's credits and
retrospective Gazette.

**History rules** (audit rec. 14), written before any History: rewards are options (a Commons project, a cosmetic, an
achievement, a record), never power needed to progress; no quality-of-life feature or automation is locked behind a
History; the stacking ladder is post-game and capped at 30; each History is cleared by the generic `budget` strategy
within 2× the median time.

**UI** (≈ 6 days): the seam ladder, load curve, travel-time dial, a "free" price tag; the dispatch panel; the History
picker; the Archive viewer; the play ledger's return filer, the second twin gauges, closing/opening labels and the
"Close the Household Survey" switch; the credits card.

**Scene** (≈ 4 days): seams in the cut-away; Light's load as lit windows by hour; Motion's sprawl that stays; engraved
spot illustrations per headline key (visual-direction item 6); the Reckoning as the frozen scene (item 2); run summary
as before and after (item 3); the proprietor figure and his watch.

**Balance** (≈ 3 days): fork and dispatch audit (random arms within ±10% Hindsight per minute); each History clearable;
each mechanic is a temptation (M3 finish, the coordinator's decision, replacing "a strategy that ignores it is ≥ 25%
worse"): the burning player (`efficiency`) who engages with it earns at least 15% more income in that Industry than one
who ignores it, and the trade is shown at the point of decision (the card, the staked-out use, the next seam, and the
mechanic's instrument say under a drawn line what it does to the line); `crisisFarm` never beats `budget` for Mandate or
Hindsight per minute after run 2 (audit rec. 9a).

**The first ending.** Credits on Steady State with every open Industry at the sink line (v1's `flags.won`, now
reachable), at 15–20 active hours for `mixed`: a credits card, a retrospective Gazette, "The ledger continues". In M4
it becomes the Act I ending.

**Exit criteria:**

- 15–20 hours of distinct play across five Industries; the first ending reached by `mixed` in that window.
- Something new at least every 2 active hours to hour 20 (`budget`'s unlock log).
- The Proprietor's Day triggers in the Playwright run after filing a fixture return, and the settings switch deletes
  the ledger.
- `efficiency` with the Market on shows at least 20% more decisions per model decade than without (the pure half of
  shift 3).

**Size:** about 31 agent-days.

> **Stop and look after M3.** This is a complete, good, medium-length game with an ending. Everything after it
> lengthens the game. Ship it, watch real players (or long balancer runs), and confirm the restraint loop is fun before
> building layers on it.

---

## M4 — "The Survey" (the Coal Age complete: Iron & Steel, Fishing, the Act I ending, the capstone, Previews)

Designed in `design/m4-design.md` (revised 20 Nov 2026); contract `design/m4-contract-notes.md` (save version 5);
lanes `briefs/m4-*.md`; decisions `design/m4-open-questions.md` (Q1–Q7 decided on the owner's delegation).

**The shift.** The Survey: the instruments stop being true and the stock stops being yours. Fishing's catch per trip
stays healthy while the stock falls; the Board's first survey (free, once, in the run Fishing opens) prints the
skippers' report against the truth. It reaches back (Steam's "years of coal left" was always "at this year's rate";
every Industry's consumption gains the coal in its machines, from Iron's order book) and changes every later run
(budget lines on the full account; the survey costs a seat or Mandate).

**Contract:** Acts, the ending per Act and the capstone (settled for good, in arrears when undefended); Previews (an
Act flag); the shared reserve (`resourceStock`); feeds; the renewable stock (threshold, scar, reported stock, survey,
foreign fleets, depletion pressure); the `quota` lever; `settle.requires`; wager arms; the free first survey, the
`estimates` feature, the full account and years left; `MetaState.world` and one carry-over function (foresight for M7).

**Core** (≈ 10 days, including the revision's 2). **Content** (≈ 8: Iron, Fishing, the Act). **Text** (≈ 5: 24 letters,
12 of them wagers; 3 cast; the Board's Survey card; Archive). **UI** (≈ 6.5: postcards, folding, order book, chart,
wagers, the reveal card, the readings). **Scene** (≈ 6.5: foundry, harbour with the chart, the moment). **Audio** (≈ 2).
**Balance** (≈ 5).

**Re-gating (D3, decided for M4).** Motion, Compute and Code open after the Act I ending as Previews (labelled; the
industrialist's rules) until their Acts' rules ship; saves that opened them keep them as Previews, not counted towards
the Act I ending.

**Exit criteria:** `design/m4-design.md` §15 (25 criteria), among them: the Act I ending at 14–17 h for `mixed`; ≤ 2 new
things a run from run 4; the Board's Survey met by every scripted player by hour 8.5; unsurveyed players cross the
threshold in their first Fishing run, a surveying one does not; the scar survives Reckonings; Iron's feeds raise Steam's
R ≥ 1.15×; letters: thoughtful ≥ 1.05× default ≥ random; the CLAUDE.md performance budgets on the real page.

**Size:** about 43 agent-days (41 as first designed, +6.5 for the shift, −4.5 of cuts: no new Histories or Commons, no
Age dissolve, six fewer letters, two revivals, four achievements).

---

## M5 — "The Other Chair" (layer 2: the Treaty as government; Plenty)

Designed in `paradigm-shifts.md` §1.

**Contract:** `ChairDef`, `RivalDef`, `RivalProfile`, `ResponseDef`, `LoopholeDef`, `PledgeDef`, `ArticleDef`; new
lever kinds (`standard`, `ban`, `quota`, `borderAdjust`, `charge`); `GameState.chair`; `SectorDerived.reportedR`,
(`abroadR`, `consumptionR` move to M6); `MetaState.precedent`, `articles`, `treaties`, `playbooks`; `ModelApi.takeOffice`,
`treaty`, `buyArticle`, `inspect`, `amend`, `choosePledges`, `campaign`, `setIndependence`; Plenty's land stock and two
water gauges (`water applied`, `water consumed`).

**Core** (≈ 10 days): the rival bot (the `efficiency` strategy moved into `src/core/chair/rival.ts`, with the response
table); profiles from `meta.opening`; elections and Opposition; loophole ladders; inspection and concealment; the Treaty reset and the Know-how transfer; Plenty's mechanic.

**Content** (≈ 8 days): Pryce and his voice; the prospectus; Plenty to the kit; loophole ladders for Plenty's levers;
20 pledges; 8 Articles; 3 playbooks; the Statecraft tree; 30 dispatches (20 Pryce).

**UI** (≈ 7 days): the Ministry window chrome; the Confidence line; inspection taps in the scene; loophole cards; the
manifesto sheet; the Articles shop; the two-ledger gauge; Take office.

**Scene** (≈ 5 days): the seed-catalogue style and Plenty's layout; Pryce's hoardings and bunting; exempt things;
the window frame. (Abroad's skyline valley moves to M6.)

**Balance** (≈ 4 days): regulator bots `naive`, `hawk`, `steward`, `abstain` against rival profiles (`efficiency`,
`budget`, a seeded grid of 20).

**Exit criteria:** `steward` ≥ 1.5× `naive` and ≥ 3× `abstain` Precedent per hour against every profile; `hawk` loses an
election within three Parliaments in ≥ 80% of profiles; no single lever kind holds the ledger for a
decade alone; the first Ministry reaches an election within 4 minutes and a loophole within 6; Take office in the
Playwright run shows the prospectus with the player's own times.

**Size:** about 29 agent-days (Abroad and the two ledgers, about 5, moved to M6).

---

## M6 — "The Second Ledger" (Abroad, offshoring, Motion reworked, Comfort, Freight & Flight, the Act II ending)

**The shift.** The Second Ledger: when my figures fall, the world's need not. Abroad (one unregulated neighbour on the
skyline), offshoring and the two ledgers move here from M5, so that M5 is the Other Chair alone and M6 has a shift of its
own. The moment: the first consumption ledger, printed beside the home gauge the moment Pryce first offshores; the home
gauge turns down, the new one turns up, a ship leaves for the horizon and a chimney rises on Abroad's skyline. The Act II
ending is scored on the consumption ledger, so the Act ends on its own lesson. Contract adds (from M5): `SectorDerived
.abroadR`, `consumptionR`, the `offshore` response, `chair/abroad.ts`, Abroad's skyline in the scene. Size grows by
about 5 agent-days moved from M5.

**Contract:** `ApplicationDef.ratchet`; offshoring generalised (`SectorDef.offshore`); `drawsOn` to many targets; the
travel-time budget inside the Chair.

**Core** (≈ 5 days). **Content** (≈ 10 days): three Industries to the kit with loophole ladders and pledges; Fishing's
revival (factory trawlers); 4 more Articles; 3 playbooks; 10 more Histories; the Act II ending.

**UI** (≈ 5 days): ratchet indicator; travel-time dial in the window; the route-map interaction.

**Scene** (≈ 7 days): `chrome` reworked for Pryce; the appliance catalogue; the top-down route map and chart.

**Balance** (≈ 4 days): the Act II hour targets; leakage under `naive` ≥ 30% by the end of Motion; Montreal pays.

**Exit criteria:** the Act II ending at 46–55 h for `steward`; a Treaty every 6–10 h; a new Industry every ≤ 8 h.

**Size:** about 36 agent-days (31, plus Abroad from M5).

---

## M7 — "The Inheritance" (layer 3's reset: the Long Now as generations; the prestige shift)

Designed in `design/m4-design.md` §18 and `paradigm-shifts.md` §5. **The shift.** A Reckoning stops resetting the
world: from the first Long Now ("Hand over", the Act II ending's reset, about hour 52) each run is a **generation** that
starts in the world the last one left (reserves, decayed pressure, sprawl, ratchets, scars, founded uses at a share,
settled and capstoned Industries; levers lapse; Know-how inherited whole), is played for **Bequest** (earned only for what
is handed on: reserve in the ground, skies under their sinks, stocks above their clear level, wellbeing per head at least
what was received; spent on permanent Endowments), and ends on the world's schedule (a fixed span; a Will at the end).
The rebound across time: what one generation leaves unlocked the next burns, faster. The moment: the next run opens on
the same unwashed valley; "The books are closed. The world is not."

**Contract:** `MetaState.world` extended (reserves, pressure, lockIn, founded, population, generation, endowments);
`ReckoningCause` 'generation'; Bequest and `EndowmentDef`; `GlobalParams.generation` (span, interregnum, carry shares);
`inherit.ts` extended. **Core** (≈ 7). **Content** (≈ 5: Compute extended, Endowments, the Will). **UI** (≈ 5: the
handover ledger, the generation card). **Scene** (≈ 4: inherited states drawn; the interregnum). **Balance** (≈ 4).

**Exit criteria (sketch):** a generation's Bequest from `steward`-like play ≥ 2× a burning generation's; the heir of a
saving generation that does not seal burns the saved reserve ≥ 30% faster (the rebound across time is visible); runs
started in an inherited world reach their first decision within 30 s; no Act I replay.

**Size:** about 25 agent-days.

---

## M8 — "The Attention Age" (the Objectives: agents under briefs)

(Was M7. The Long Now's reset is now M7's; the agents arrive here, in the second generation of Act III.)

Designed in `paradigm-shifts.md` §2.

**Contract:** `MetricDef`, `GamingDef`, `ObjectiveSpec`, `GameState.agents`, `GameState.attention`,
`ModelApi.handOver`, `setObjective`, `review`; `MeasureDef` and `MetaState.legacy`, `measures`; Proof-of-Work's
difficulty (`SectorDef.difficulty`: R set by reward ÷ power price) and the one-off `changeMechanism`.

**Core** (≈ 8 days): the agent policy (one-step look-ahead, moved from the balancer into `src/core/agents.ts`; the
balancer imports it); gaming moves, drift, incidents; Attention from Code; independent measurement; the Long Now reset;
Proof-of-Work.

**Content** (≈ 8 days): 8 metrics, 5 constraints, 30 gaming moves, 60 incidents; Compute extended (inference
everywhere, revivals); Proof-of-Work and Code to the kit; Measures.

**UI** (≈ 6 days): the brief card (chips), the review queue, Hand over.

**Scene** (≈ 6 days): the agent overlay for every existing style; the red terminal for Proof-of-Work; drift as signal
noise.

**Balance** (≈ 4 days): `spec` grid and `triage` bots.

**Exit criteria:** every metric shows its gaming within 10 minutes unconstrained; no brief in the top three for more
than half the Industries; the best briefs beat "Maximise Output" ≥ 2× and need an Institution as a measure in ≥ 4
Industries; biggest-drift-first triage beats oldest-first by ≥ 20%; Proof-of-Work's R moves less than 2% across its
whole efficiency chain.

**Size:** about 30 agent-days (32, less the Long Now reset, now M7's).

---

## M9 — "Unbuilding" (the Transition and the true ending)

(Was M8. It needs M7: retiring and sealing only mean something in a world that is not reset.)

Designed in `paradigm-shifts.md` §4.

**Contract:** `AssetDef`, `RetirementState`, `SectorDef.displaces`, `GameState.retirement`, `GameState.ground`; the
`retire` lever kind, `seal` and `floorMul` effects; `ModelApi.retire`, `buyOut`, `retrain`, `seal`, `rewild`.

**Core** (≈ 6 days): displacement; retirement; the green paradox on schedules; stranded value; Ground; lock-in floors;
the true ending.

**Content** (≈ 8 days): the Transition to the kit; about 50 assets with places and people; the endings and credits;
the last Statistics Office return.

**UI** (≈ 4 days): the Retirement ledger; the reprint transition; the true-ending sequence.

**Scene** (≈ 8 days): the risograph style; afterlife sprites for every Industry's props; the lake.

**Balance** (≈ 3 days): `unbuild` bots (`now`, `schedule`, `steward`).

**Exit criteria:** `steward` reaches the true ending in 15–25 active hours of Act IV, at 90–115 h cumulative;
`schedule` loses ≥ 10% more reserve to the green paradox; the uncapped Transition shows a positive replacement rebound;
the Playwright run reaches the final plate from a fixture save.

**Size:** about 29 agent-days.

---

## M10 — "Enough" (post-game; was M9 "The Long Now")

**The shift.** Enough: the ledger is closed, and stopping is a move the game counts (the close of The Game Rebounds on
You). The moment: the last household return, every generation's hours on one page: "The ledger is closed. You may stop."

The History ladder (stacking, capped at 30), the weekly Almanac (the seed comes from the UI; the core stays pure),
records, Archive completion, the Archive plate (every scene reprinted small on one sheet, the player's peaks marked),
banked time, PWA, run history, the Steady Century epilogue (designed to be played for ten minutes and left).

**Size:** about 12 agent-days, mostly content and UI.

---

## Summary

| Milestone | Ships | Cumulative active hours of content | Agent-days |
|---|---|---|---|
| M1 v1, honest | Five Industries that teach the right lesson | 3–5 (built) | — |
| M2 Restraint has a game | Decades in run 1, clear skies, Settlement, Commons, the Market, Charters | 8–10 | 24 |
| M3 Every Industry its own | Mechanics, cast, Histories, the second reveal, a first ending | 15–20 | 31 |
| M4 The Survey | Iron & Steel, Fishing, the Act I ending, the capstone, Previews | 16–20 (Act I) + Previews | 43 |
| M5 The Other Chair | Government, Pryce, Plenty | 25–30 | 29 |
| M6 The Second Ledger | Abroad, Motion, Comfort, Freight & Flight, the Act II ending | 50–55 | 36 |
| M7 The Inheritance | Generations, Bequest, Endowments, Compute extended | 58–62 | 25 |
| M8 The Attention Age | Objectives, Proof-of-Work, Code | 75–80 | 30 |
| M9 Unbuilding | The Transition, the true ending | 95–105 | 29 |
| M10 Enough | Post-game | 100–200+ | 12 |

About 259 agent-days (215 before the 20 Nov revision added the M4 shift, the Previews and M7), a third of it writing. A dedicated text lane from M3 keeps it off the critical path, and a scene
lane from M4 does the same for the art.

### What can run in parallel without file conflicts

| Milestone | Alone first | Then in parallel |
|---|---|---|
| M2 | the split; then the contract | core (`steady.ts`, `orders.ts`, `commons.ts`, `charters.ts`: four owners) · content per Industry · prestige content · UI panels (sparkline, dividends, settle, Commons, orders, Charter) · scene (weather, settled look) · tools (`market`, `charter`, decision log) |
| M3 | contract | core (mechanics per Industry module, `dispatch.ts`, `history.ts`) · text (dispatches, Archive, news) · content per Industry · UI panels · scene (spots, Reckoning, before-and-after) |
| M4 | contract | core (`inherit`, `acts`, `renewable`, `feeds`, `survey`) · Iron, Fishing, Act and text content (four agents) · UI · scene (foundry, harbour) · audio |
| M5 | contract; then the rival core module (others depend on its interface) | `chair/elections.ts`, `chair/loopholes.ts`, `chair/inspect.ts` · Plenty content · Pryce text · UI window and sheets · scene (window, Plenty, hoardings) · regulator bots |
| M6 | contract | `chair/abroad.ts` · three Industries (three agents) · scene (three styles, Abroad) · UI |
| M7 | contract | `inherit.ts`, `bequest.ts` · Compute and Endowments content · UI handover ledger · scene inherited states |
| M8 | contract; then `agents.ts` | metrics and gaming content · incidents text · Proof-of-Work · UI brief and queue · overlay art |
| M9 | contract | `unbuild.ts` · assets content · riso style and afterlives (two agents) · UI ledger |

Balance is last in every milestone, by one agent.

---

## Decisions for the owner

D1 (when restraint out-earns backfire) is settled as recommended and measured: backfire pays more in runs 1–2 (1.1× in
run 1; target 1.2×), restraint 4.6× by run 3.

**D2. What the Treaty wipes, and the rival seeded from the player.** The Treaty is now Take office (the Other Chair).

*Recommendation:* wipe Hindsight, Institution levels and the loadout; keep Institutions unlocked, Commons unlocked,
achievements, Histories, records and the Archive. The industrial Know-how trees **pass to the rival** as a capped head
start ("Pryce has read your notebooks"). Act I is never replayed: the Coal Age opens settled in every later run. Pryce
is seeded from the player's own first-run opening (game actions and game time only), quoted once in the prospectus;
saves without one use the balancer's `efficiency` profile.

**D3. The twelve-Industry roster, and re-gating Motion, Compute and Code.** *Re-gating decided for M4 (20 Nov 2026,
by the coordinator on the owner's delegation): Motion, Compute and Code open after the Act I ending as Previews.*

The roster: Steam, Iron & Steel, Light & Current, Fishing (the Coal Age); Plenty, Motion, Comfort, Freight & Flight
(the Great Acceleration); Compute, Proof-of-Work, Code (the Attention Age); Transition (the Transition). Today Motion,
Compute and Code are reachable within 2–4 hours.

*Recommendation:* approve the twelve. Re-gate in M4, not earlier: by then Act I has Iron, Fishing and an ending to fill
16 hours, so nothing is taken away from a game that cannot spare it. Existing saves keep the three as "Previews",
and the broadsheet says so.

**D4. The editorial line on dark history, and on people.** This covers the cotton gin and slavery, colonial coaling
stations, famine and the Green Revolution's politics, and now the people who lose their work in Fishing's moratorium
and in Unbuilding.

*Recommendation:* acknowledge dark history in the Archive and, where the history demands it, in one sombre dispatch;
never a resource, an application or a joke. Workers in Unbuilding are named by place and are retrained or not;
compensation is a verb, never a number minimised for score. The Other Chair has no real parties, no living politicians
and no left/right labels.

**D5. Endings and the post-game.**

*Recommendation:* three credits: the Act I ending (15–17 h), the Act II ending (about 50 h) and the true ending (about
100 h, the pit becoming a lake). The game continues after each. The post-game (the History ladder, the Almanac) is
optional and says so: "The ledger is closed. You may stop." No hard end, no paid anything. The main path is about 100
active hours, not 110–120; padding it would put filler back.

**D6 (new). The play ledger (shift 3).** The game measures the player's own sessions, active minutes and decisions,
on the device, to publish them at about hour 7.

*Recommendation:* measure from first launch, locally, in its own storage key, never in the save or any export unless
ticked; say so plainly in the settings from day one ("The Statistics Office keeps a household survey on this device");
one switch deletes it. The reveal is the first time the figures are published, not the first time the survey is
mentioned. Nothing in the main path rewards playing less or more.
