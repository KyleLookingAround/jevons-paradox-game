# Rebound — ranked proposals

Each proposal says:

- **Idea**: what it is.
- **Rebound**: which form of rebound it expresses (direct, indirect, economy-wide, frontier, or a newly named form). This is
  the theme guard; anything that could not answer this has been cut (list at the end).
- **Player**: what the player does differently because of it.
- **Cost**: what it needs from `src/types.ts` (contract), `src/model.ts` (core), content and UI, with sizes S (≤ 1 day for
  one agent), M (2–4 days) and L (a week or more).
- **Risks**.

Priority labels, for the goal of a very long game:

- **Must**: the game is broken or too short without it.
- **Should**: it carries the long game.
- **Could**: depth and the post-game.

Evidence references (C-n) point at items in `design/critique-v1.md`. Structure and hour targets are in
`design/long-game.md`; build order is in `design/roadmap.md`.

Two engine primitives recur in many proposals, so I describe them once here.

**`Cond`, a data-only condition.** Content needs to say "when X" without code:

```ts
type StatKey = 'rebound' | 'reboundDirect' | 'rFold' | 'etaFold' | 'pressureFraction' | 'reserveFraction'
  | 'wellbeing' | 'population' | 'steadyYears' | 'withinBudget' | 'year' | 'time' | 'reckonings' | 'mandate'
  | 'capital' | 'adoption' | 'servicePrice' | 'serviceDelivered';
type Cond =
  | { stat: StatKey; era?: string; app?: string; op: '<' | '<=' | '>' | '>='; value: number }
  | { owns: string }            // upgrade, app (founded), lever (level ≥ 1), institution, commons, article
  | { flag: string }
  | { all: Cond[] } | { any: Cond[] } | { not: Cond };
```

The core evaluates it against `state` and the derived flows it already computes. This is about 120 lines of pure code
with tests (size S). It is used by era unlocks, dispatches, histories, achievements, standing orders and revivals.

**New `EffectDef` variants.** The list is long but each is a one-line case in `applyEffect`:

`satMul {era, app?}`, `halfPriceMul {era, app?}`, `popGrowthMul`, `pressureIntensityMul {era}`,
`pressureExport {era, share}`, `offlineCapAdd`, `slotAdd`, `wellbeingAdd`, `mandateAdd` (one-off),
`capitalAdd` (one-off), `unlock {id}`.

---

## P1. Honest instruments: a counterfactual rebound meter and projections that include the frontier — **Must**

**Idea.**

- **Rebound meter.** Measure the meter against a *shadow*: the same era, same founded applications, same population and
  same depletion, but with η frozen at its base value. Then:
  - `R_shadow` is "what this economy would burn with no efficiency gains".
  - `promised = R_shadow / etaFold`.
  - Direct rebound is `(R − promised) / (R_shadow − promised)`.
  - Frontier growth (new applications) moves `R_shadow` too, so it no longer counts as direct rebound. Report it as its
    own number: "Frontier: +340% since 1780".
- **Upgrade cards** get three lines instead of two:
  1. The promise: "−40% coal per horsepower".
  2. *This decade*: a projection 10 in-game years ahead (200 s), which includes population response. For coarse
     projections, increase `PROJECTION_DT`.
  3. *Brings within reach*: the applications whose `visibleBelow` the projected service price crosses, with their
     projected demand once founded. Example: "Brings Railways within reach: +180% coal if founded".

**Rebound.** Direct, frontier and economy-wide, each shown separately. This is the game's teaching instrument, and today it
teaches the wrong thing (C-3, C-4).

**Player.** Reads three numbers on every efficiency card and starts to plan around the third. Founding an application
becomes a visible, deliberate act of rebound.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `EraDerived.reboundDirect`, `frontierFold`, `shadowR`. `UpgradeView.projectedDecade`, `bringsWithinReach: {appId, projectedChange}[]` | S |
| Core | One extra `solveEra` per open era per derive (cheap: closed form unless caps or flow apply). Projections with a longer horizon at coarser dt. | M |
| UI | A third card line and a "Frontier" readout. | S |
| Content | None. | — |

**Risks.** The cost of projection: upgrade views already simulate 120 s for every card, about once a second. Cache by
`(state.time rounded, upgrades hash)`. A 200 s horizon at dt = 5 costs less than today's 120 s at dt = 2.

---

## P2. Steady State that can be reached: a budget line, a demographic transition, tighter levers — **Must**

**Idea.**

1. **Replace "R falling" with "R within a budget".** Each era gets a *budget line*, set when it is first drawn (by a lever,
   an institution or the reveal) at the current R, which then declines by `budgetDecline` per decade. A cap that holds R
   flat is within budget. A decade within budget and at or above the wellbeing target counts towards Steady State, and
   so the existing cap lever becomes the tool for the job.
2. **Demographic transition.** Population growth is shaped like a hump in wellbeing: it rises from subsistence, peaks,
   then falls towards zero above a transition level `W_t`:

   ```
   g(W) = popGrowth · (W − sub) · max(0, 1 − ((W − sub) / (W_t − sub))²)
   ```

   This is historically right (the demographic transition) and it bounds the economy-wide rebound, so restraint can win.
   It also makes wellbeing a two-edged dial: richer societies stop growing.
3. **Levers that can keep tightening.** Each lever gets an optional `repeat: { valueStep, costGrowth, upkeepGrowth }`, so
   that after the authored levels a "Tighten" button continues the series. Caps become fractions of the *budget*, not of
   "R when enacted".
4. **Milestones on the streak.** Every 10 years within budget pays a dividend (Mandate, wellbeing, or a one-off capital
   grant from the content), shown as a ledger of decades. The 50-year goal stops being a silent wait.

**Rebound.** Economy-wide, made visible and bounded. Restraint gets a measurable target that can actually be reached.

**Player.** Draws a budget, then plays to stay under a declining line, which is a classic incremental "keep the number
inside the band" loop and a different skill from maximising. The economy-wide rebound shows up as a population gauge
whose growth slows as wellbeing rises.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `EraState.budget {R0, since}`, `EraDerived.budgetR` and `withinBudget`. `GlobalParams.steady {budgetDeclinePerDecade, milestoneYears, milestoneEffects}` and `demography {transitionWellbeing}`. `LeverDef.repeat`. | S |
| Core | Budget, the population curve, lever repeat. | M |
| Content | Retune `wellbeingTarget` and levers. | M |
| UI | The budget line on the sparkline, a decades ledger, a Tighten button. | M |

**Risks.** Too easy. The balancer must show that efficiency-only play never stays within budget for 50 years (frontier
growth must break any budget not defended by a lever) and that cap plus sufficiency can.

---

## P3. Era unlocks that are neutral about restraint — **Must**

**Idea.** Drop `prevServicePriceBelow`. An era opens on `unlock: { when: Cond; minReckonings }`. The condition is built from
milestones that restraint does not block: an efficiency upgrade owned (knowledge exists whether or not it is cheap), a
number of applications founded, a cumulative quantity of service delivered (`serviceDelivered`, which accrues under
restraint, only more slowly). Example for Light: "own the Separate condenser and 50,000 hp·years delivered and 1
Reckoning".

**Rebound.** Neutral. This is a fairness repair (C-5).

**Player.** Can follow the lesson and still see the game.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `EraDef.unlock.when`; `EraState.serviceDelivered`. | S |
| Core | Evaluate the condition. | S |
| Content | Write the conditions. | S |
| UI | The locked chip lists conditions as a checklist. | S |

**Risks.** None of note. Keep the old field as an optional legacy so v1 saves still load.

---

## P4. Prestige that rewards decoupling, and a Know-how / Institutions choice that stays open — **Must**

**Idea.**

**(a) A new Hindsight formula.** It is earned from:

- *Wellbeing-years*: the integral of wellbeing above subsistence, divided by the resource used. The point is "how well did
  people live per ton", not how big the boom was.
- *Decades within budget*.
- *Unburnt*: the share of each stock reserve left in the ground at the Reckoning.
- *Settled eras* (P5).
- A small flat award for an era's first Backfire, so failure teaches and does not stall progress.

The target ratios for the balancer are an owner decision (see the roadmap):

- In runs 1–2, backfire earns more Hindsight than restraint. The lesson must be learnt by failing.
- From run 3, a competent restraint run earns at least 1.5× the Hindsight per minute of a backfire run.

**(b) Institutions become a loadout.** The player holds a limited number of *slots* (2 at first, 8 by late game; slots come
from Steady State and Settlement). Institutions have levels (1–3) and cost Hindsight to unlock. Choosing which to *seat*
is free between runs. Different eras and histories call for different seats, so the choice never fully closes.

**(c) Know-how has trade-offs and forks.** Each era gets a small tree (6–8 nodes) with one exclusive fork per tier.
Example for Steam: *Cornish school* (η up, so efficiency, so rebound) against *Manchester school* (capital cost down, so
cheaper engines, so more of them). Every efficiency node carries a visible `satMul` or `halfPriceMul` side-effect, so
"runs start faster and hit the wall sooner" is printed on the node and not left to the blurb.

**Rebound.** Know-how is the paradox one level up: it makes the next run faster and hungrier, as DESIGN.md intended, but
now visibly and as a choice. Institutions express "what works is structural".

**Player.** Between runs, chooses a loadout for the run they intend to play. A veteran keeps several.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `GlobalParams.hindsight` gets new weights. `InstitutionDef.levels`, `slot` cost. `MetaState.slots` and `loadout`. `ModelApi.setLoadout`. `KnowhowDef.branch` (exclusive group) and `tier`. | M |
| Core | All of the above. | M |
| Content | About 40 Know-how nodes and 40 Institutions by the long game; for v1, 16 and 14. | L |
| UI | The shop becomes two panels: a tree and a seated row. | M |

**Risks.** Slot scarcity can feel mean. Start with 2 slots against 4 owned Institutions, so the first choice is easy.

---

## P5. Settlement: restraint as the way forward — **Must**

**Idea.** An era that holds Steady State (P2) for 50 in-game years can be **Settled**. A settled era:

- Stops simulating its applications. Its demand and R freeze at the settled values.
- Cannot collapse the run.
- Pays a **dividend** for as long as it stays settled (data effects, for example a wellbeing floor, Mandate per second, or
  `slotAdd`).
- Counts towards Hindsight.

It does not become immune. Indirect spill from later eras still lands on a settled era, and if the spill pushes it over
budget it must be defended with Mandate upkeep (green spending), or it *unsettles* and starts ticking again.

Settlement is also how the long game stays playable on a phone: by the late game, eras 1–6 are settled rows paying
dividends and the player actively manages two or three.

**Rebound.** Indirect: settling an era does not stop later eras' savings spilling into it. Settlement makes the
"oldest era kills the run" problem (C-7) into a goal: you cannot safely push into Motion until Steam is under control.

**Player.** For the first time, has an instrumental reason to restrain: settling Steam is how a run survives long enough to
play Light properly. It gives the restraint player something to do with Mandate (defending settlements) and something to
aim at.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `EraState.settled {D, R, since}`. `EraDef.settle {years, dividend: EffectDef[], upkeepPerSpill}`. `ModelApi.settleEra`. | S |
| Core | Freeze, spill check, unsettle. | M |
| Content | Dividends per era. | S |
| UI | The settled row, a "Settle" ceremony card. | M |

**Risks.** Settlement could become the only strategy. Keep backfire runs valuable for speed-running Know-how and for
histories (P12).

---

## P6. The Commons: where the savings go — **Must**

**Idea.** A second build list, available from the third Reckoning, bought with capital and Mandate, that turns money into
low-intensity wellbeing:

- *Steam/Light*: public baths (1846 Act), free libraries (1850 Act), parks, allotments, mechanics' institutes.
- *Later*: the 8-hour day, the shorter working week (Keynes, *Economic Possibilities for our Grandchildren*, 1930: the
  15-hour week), public health, repair cafés, commons broadband.

Each project has:

- a wellbeing yield that saturates;
- a small resource *intensity* in some era (a library still needs lighting, so it is not zero);
- for some projects, a **time rebound**: more leisure raises saturation of leisure applications (motoring, package
  holidays, streaming).

This is the sink for the capital that restraint piles up (£1.2M idle in the lev run, C-6), and it is the genre's
maximising instinct pointed at sufficiency: you maximise wellbeing per ton.

**Rebound.** Indirect. The respending problem is the core of the macro rebound literature: money saved on energy is spent
on something, and what it is spent on decides the rebound. The Commons are the low-intensity choice, and the time rebound
(Binswanger 2001) keeps even them honest.

**Player.** Has a second thing to buy all run long. The savings of restraint become visible wellbeing. Choosing Commons
projects that do not feed leisure rebound is a real puzzle.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `CommonsDef {id, era, name, blurb, cost, mandateCost?, wellbeing {max, scale}, intensity? {era, perUnit}, timeRebound? {era, app?, satAdd}, requires?: Cond, repeatable?}`. `GameState.commons`. `ModelApi.buyCommons`. | S |
| Core | The wellbeing term and the extra demand. | M |
| Content | About 30 projects across eras (v1 scope: 8). | M |
| UI | A Commons panel. | M |

**Risks.** It must not become a second Know-how (a flat wellbeing multiplier). Yields saturate and the intensities are
real.

---

## P7. Choices inside a run: forks, optional applications, revenue recycling — **Must**

**Idea.** Three or four genuine forks per era, written as upgrades with `excludes`. Historically grounded examples:

- **Boulton & Watt's premium.** Boulton & Watt charged mine owners a royalty of one third of the coal saved against a
  Newcomen engine. Pay it (η up, plus a £ drain proportional to the coal saved) or build pirate engines (Bull and
  Hornblower designs: cheaper, slower η gain, a dispatch-driven lawsuit risk).
- **Parliamentary trains** (Railway Regulation Act 1844, a penny a mile) against first-class-only lines: more railway
  demand at a lower margin, against higher margin and less demand.
- **Gas against electric** for Light (see P8).
- **Revenue recycling on duty**: send duty revenue to Mandate (today's 10%), to a per-head dividend (fee-and-dividend:
  wellbeing up, rebound up), or to the Commons (P6). This is chosen per duty lever.

**Rebound.** Each fork names its rebound on the card. Dividend recycling, for instance, is an income rebound.

**Player.** Stops buying everything. Plans a run around 3–4 forks per era.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `UpgradeDef.excludes`, `UpgradeDef.drain?` (a £/s cost formula), `LeverDef.recycle?` options. | S |
| Core | Forks and recycling. | S–M |
| Content | About 4 forks per era. | M |
| UI | Forked cards drawn side by side. | S |

**Risks.** A fork can be strictly dominant. The balancer needs a "fork audit" strategy that plays both arms.

---

## P8. Every era gets a mechanic of its own — **Must** (eras 1–5 in v1; eras 6–10 are **Should**)

**Idea.** Each era changes *how* you play. The full roster is in `long-game.md`; these are the mechanics:

| Era | Mechanic of its own | Rebound form it adds |
|---|---|---|
| Steam | **Seams.** The reserve is a ladder of seams of rising cost; pumping power opens the next one. Visible and decided: sink the next seam or not. | Supply-side: efficiency enlarges the resource |
| Iron & Steel | **Inputs.** Its service lowers capital cost `c` in other eras. Cheap steel makes cheaper engines, rails and ships. | **Embodied** (new name): the rebound travels through capital, not fuel |
| Light & Current | **Load-building.** Capacity is built for the evening peak; income depends on utilisation. The utility (you) sells off-peak demand to fill the trough (Insull's Chicago Edison). | **Utilisation rebound** (new name): fixed capacity invites new demand |
| Plenty (food and water) | **Land and return flows.** Yield gains spare land only if demand is saturated (Borlaug) or clear more if it is elastic (Jevons). Irrigation efficiency cuts return flows to the aquifer (Grafton et al., 2018). | Direct, plus a **hidden-flow rebound** (new name) |
| Motion | **Travel-time budget and sprawl.** Speed upgrades buy distance, not time (the Marchetti constant, about an hour a day). Roads fill (Downs–Thomson; Duranton & Turner 2011). Sprawl is a slowly decaying stock that sets minimum demand. Oil shocks are events. | **Induced demand**, lock-in |
| Comfort | **Ratcheting standards.** Saturation rises with use and never falls back (Shove, 2003). Appliances save time that is re-spent (Cowan, *More Work for Mother*, 1983). | **Time rebound** and norm lock-in |
| Freight & Flight | **Two ledgers.** Territorial and consumption accounts. Offshoring makes your gauge fall while the world's rises. | **Leakage** (spatial rebound) |
| Compute | **Autopilot and free at the point of use.** Koomey's η rises on its own. Ad-funded applications have a consumer price of zero and grow to saturation. Proof-of-work is a use whose energy is set by price, so efficiency cannot touch it. | Frontier at its limit |
| Code | **Attention and the code stock** (as v1). Upkeep, deletion, review. | **Maintenance rebound** (v1's own) |
| Transition | **Displacement.** Clean supply adds to fossil supply rather than replacing it unless the old is capped (York 2012: under a quarter of a unit displaced per unit). Materials mining loops back to Steam's pumping problem. | **Additionality rebound** (new name) |

**Player.** Learns a new rule every era. A veteran's knowledge of Steam does not solve Motion.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | One small field group per mechanic. Seams: `EraDef.seams[]`. Inputs: `EraDef.feeds {era, capCostPerService}`. Load: `EraDef.load {peakShare, capacityCost}`. Land: a second bounded stock. Travel budget: `EraDef.timeBudget`. Ratchet: `ApplicationDef.ratchet`. Ledgers: `EraDef.offshore`. Free-at-use: `ApplicationDef.priceSeen: 0`. Displacement: `EraDef.displaces {era, ratio}`. | M in total, but spread across milestones |
| Core | Each mechanic is a pure term in `solveEra` or `step`. | M each |
| Content | Per era. | M each |
| UI | One bespoke widget per era (seam ladder, load curve, land map, two ledgers…). | M each |

**Risks.** Complexity creep. Rule: one new mechanic per era, introduced by its first dispatch, never more than one new
gauge.

---

## P9. The broadsheet cast and dispatches — **Should**

**Idea.** A fictional recurring cast, with descendants across eras:

- the Ashworth family of engineers;
- the Pryce mill and motor dynasty;
- the economist "Mr Whitlow" (a fictional pupil of Jevons), later Dr and then Prof. Whitlow;
- a minister for the age;
- the *Ledger*'s own correspondent (the narrator, who ages);
- a reformer: Mrs Fenwick of the Smoke Abatement Society, later a Fenwick at the climate committee;
- a speculator.

Real dead historical figures appear only in card blurbs (Watt, Jevons, Parsons, Insull, McLean). No living people.

**Dispatches** are broadsheet items with 2–3 choices that fire on a `Cond`, at most one active at a time, with optional
expiry. Each choice applies effects, optionally for a duration, and may schedule a follow-up dispatch, so the cast have
arcs. Example: Whitlow's pamphlet is ignored, then cited, then made an institution.

**Rebound.** Each dispatch dramatises one named rebound. The cast make the economy-wide argument personal: Pryce always
wants the cheaper thing, Fenwick always pays for the slower one.

**Player.** Makes a short, flavourful decision every few minutes. Remembers people.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `DispatchDef {id, era, cast, when: Cond, weight, once?, cooldown?, headline, body, choices: {label, effects: EffectDef[], duration?, costs?, next?}[]}`. `CastDef`. `GameState.dispatch {active?, seen, modifiers: {effects, until}[]}`. `ModelApi.answerDispatch`. Selection is deterministic from `state.seed`. | M |
| Core | Selection, timed modifiers. | M |
| Content | The writing is the long pole: 18 dispatches per era, 180 in the long game, 60 for v1 scope. | L |
| UI | A broadsheet "item with choices" panel. | M |

**Risks.** Choices that are strictly better. Every dispatch needs a cost on each arm; the balancer can audit by playing
random arms. Dispatches must also never block the game, so unanswered ones expire with a default.

---

## P10. Levers that rebound — **Should**

**Idea.** Every era gets at least one lever that works and then bites back, with a side-effect that grows with level and
time. Historical cases:

- **Efficiency standards (CAFE, 1975).** η up in Motion, but it creates a *Light truck loophole* application (the SUV) whose
  saturation grows with the standard. Knittel (2011) found that most of the technical progress went into weight and
  power, not miles per gallon.
- **Road building to relieve congestion.** Capacity up, then induced traffic (SACTRA, 1994).
- **Tall chimneys** (the 1956 Clean Air Act era). Local Pressure falls and is *exported* to a neighbour as acid rain (in
  the World layer) or to another era's Pressure.
- **Renewables subsidy without a cap.** Clean supply rises, and fossil use falls by under a quarter of a unit per unit
  added (York 2012), unless a cap is also held.
- **Fridge scrappage rebate.** The old fridge goes to the garage as the second fridge.
- **Sufficiency's own rebound: the green paradox.** Cutting demand lowers the resource price, so others burn more (in a
  single region, an earlier era; in the World layer, other regions). Announced-but-delayed caps cause extraction to rush
  ahead (Sinn, 2008). The fix is supply-side: *Keep it in the ground*.

**Rebound.** Every named form, applied to policy itself. This is the handover's "a lever that itself rebounds", and it is
the most honest thing the game can say about "what works": most single policies leak, and combinations hold.

**Player.** Learns to pair levers (a standard *with* a duty, renewables *with* a cap). Combination is the skill.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `LeverDef.sideEffects {perLevel: EffectDef[], ramp: seconds, unless?: Cond}`. The `unless` field is how pairing switches the side-effect off: "unless steam.cap ≥ 1". | S |
| Core | Side-effects. | S–M |
| Content | One per era. | M |
| UI | A "bites back" line on the lever. | S |

**Risks.** Feels like a trick. The `catch` line must say up front what the side-effect is; the surprise is only in how big
it gets.

---

## P11. Standing orders: automation as policy — **Should**

**Idea.** Automation lives in the pure core (so offline catch-up is faithful), unlocked by Institutions and Know-how. It is
cheap for growth and dear for restraint, because that is how it works in the world:

- *The Market* (free from run 2): auto-buys efficiency cards and auto-founds applications once their payback is under N
  minutes. Efficiency happens by itself.
- *The Civil Service* (an Institution): holds a budget by raising and lowering a chosen set of levers.
- *Treasury rules*: auto-spend on the Commons above a capital threshold.
- *Standing Orders* for dispatches: a default answer per cast member.
- *Offline cap*: 4 h, rising to 12 h and then 24 h through Institutions.

**Rebound.** Frontier and direct. The thing you automate first is the rebound engine, and switching *off* the Market is a
restraint decision.

**Player.** By hour 10, sets policy and checks in. A phone session is 2 minutes of decisions, then idle.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `GameState.orders {market: {on, paybackMax}, civilService: {on, budgetTarget}, treasury: {on, threshold}, dispatchDefaults}`. `ModelApi.setOrders`. | S |
| Core | Run inside `step`, at most once per in-game year. | M |
| Content | — | — |
| UI | An orders panel. | M |

**Risks.** Automation that removes all decisions. Never automate forks, Settlement, histories or the Reckoning.

---

## P12. Histories: run modifiers and challenges — **Should**

**Idea.** About 30 named counterfactual runs, each a set of modifiers plus a goal, with a permanent reward (an unlock, a
slot, a Commons project, an achievement):

- *Coal-rich*: reserve ×3, depletion α halved. The resource curse.
- *No Watt*: the condenser never comes. Iron arrives early.
- *The Statistician*: revealed from minute one, but no Know-how.
- *Laissez-faire*: no levers until the second crisis.
- *Island nation*: no prospects.
- *Peak oil, 1970*.
- *Moore forever*: compute η doubles twice as fast.
- *Austerity*: Mandate ×0.5.
- *Plague year*: population halves at 1850.
- *Carbon-blind*: no Pressure gauge, only weather.
- *Fee and dividend*: duty revenue is all dividend.
- …and so on.

There is also a deterministic **Almanac** run each week: three modifiers drawn from the pool by a seed the UI passes in
(the week number). It has a personal best only; no server.

**Rebound.** Each history isolates one rebound mechanism and makes the player beat it under pressure.

**Player.** Re-plays known eras under new rules. This is the main fuel for weeks 3+ (it is what challenges do in
Antimatter Dimensions or Kittens Game).

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `HistoryDef {id, name, blurb, modifiers: EffectDef[], startYear?, goal: Cond, reward: EffectDef[]}`. `createState(content, meta, seed, historyId?)`. `MetaState.histories {best}`. | S |
| Core | — | S |
| Content | — | M |
| UI | A history picker on the Reckoning screen. | M |

**Risks.** Histories need effects that exist. They reuse the EffectDef list plus a few "disable X" effects.

---

## P13. The World: a second prestige layer with regions and leakage — **Should** (the main structural lengthener)

**Idea.** After Act I (Steam, Iron and Light all settled once), a **Treaty** reset opens the World:

- You play one region actively among 3, and later 6, others (*the Workshop*, *the Colonies* / *the Periphery*, *the New
  World*, *the Gulf*, *the Tigers*, *the Commons of the Sea*).
- The others run on simple *policy scripts* whose behaviour depends on your Articles.
- Stock resources and carbon Pressure become **global**: your cap lowers the world oil price, so the others burn more
  (the green paradox, P10). Your cotton mills can move offshore, so your gauge falls and theirs rises (two ledgers, P8).
- The Treaty currency is **Precedent**, earned from regions settled and global budget held. It buys **Articles**:
  structural rules such as border carbon adjustment (stops leakage), technology transfer (spreads your efficiency to
  others, which raises global rebound), loss and damage (Mandate per crisis abroad), or a supply-side treaty ("keep it in
  the ground", which takes reserve off the board).

**Rebound.** Leakage, the green paradox and the global economy-wide rebound: the rebound at the scale where it actually
decides outcomes.

**Player.** Changes from managing a number to managing a system with other actors. Your best local play can make the world
worse, and Articles are how you stop that.

**Cost.** This is the largest item. Contract (L): `GameState.regions[]`, each holding today's `eras` and `levers` per region;
world-level stocks and Pressure; `RegionDef` and `ArticleDef`; `MetaState.treaty {precedent, articles}`; `ModelApi.treaty`,
`buyArticle` and `selectRegion`. The core needs a world step that solves each region against shared prices (L); only one
region needs full detail, the rest can use a cheaper "script" solve. Content (M) and UI (L: a region switcher and a world
map strip).

**Risks.** Performance (do not run 6 full regions at 10 Hz) and comprehension. Introduce 1 neighbour first, then 3, then 6.

---

## P14. A calendar that follows the eras — **Must** (S)

**Idea.** The year shown is the newest open era's `years[0] + openFor × yearsPerSecond`, held at the era's end year until the
next era opens. The Steady State timer uses in-game years as now.

**Rebound.** None; this repairs voice and plausibility (C-11).

**Player.** Sees headlines with believable dates.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `EraDef.yearSpan: [number, number]`. | S |
| Core | Year derivation. | S |

**Risks.** Two eras with overlapping dates. Use the newest open era.

---

## P15. Era-aware news at volume — **Should**

**Idea.**

- Headlines get keyed per era with a fallback: `headlines[era]?.[key] ?? headlines.any[key]`.
- **Ambient headlines** are driven by state through `Cond`: "Coal up a third on the decade; chairman 'delighted'". These
  are templated with formatted numbers (`{pct}`, `{fold}`, `{year}`).
- **Retrospective headlines** appear on the Reckoning card ("Looking back: the decade the engines doubled").

**Rebound.** All forms, through commentary. The broadsheet is where the game makes its argument without lecturing.

**Player.** Reads the paper.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `headlines` keyed by era; `AmbientDef {when, text[], cooldown}`. | S |
| Core | — | S |
| Content | About 600 hand-written lines for the long game; 150 for v1. | L |
| UI | — | — |

**Risks.** Repetition. Each line has a cooldown and variants are rotated deterministically.

---

## P16. Revivals: later eras retrofit earlier ones — **Should**

**Idea.** When a later era opens, it unlocks a short late chain in an earlier one:

- Compute brings the **LED** to Light (blue LED, Nobel Prize 2014). Light's demand restarts: outdoor lit area grew about
  2.2% a year in 2012–16 (Kyba et al., 2017), and citizen observations show night skies brightening about 9.6% a year
  (Kyba et al., 2023).
- Transition brings the **EV** to Motion.
- Compute brings **smart thermostats** to Comfort.
- Iron brings **steel boilers** to Steam.

**Rebound.** Frontier, recurring: a settled era can be shaken loose by a new technology. Buying a revival can *unsettle* it.

**Player.** Weighs a cheap, large efficiency gain in an old era against reopening its rebound.

**Cost.** Content only, plus `UpgradeDef.unlockWhen: Cond` (S). UI: a revival badge.

**Risks.** None of note.

---

## P17. Achievements, records and the Archive — **Should**

**Idea.**

- About 150 achievements: 80 templated per era (Backfire, Jevons Was Right, First budget decade, Settled, Unlocked
  frugally…), plus about 70 hand-written, including hidden ones.
- A *Ledger of records* per era (least resource used to unlock the next era, longest streak, highest wellbeing per ton).
- The **Archive**: an encyclopedia in which every card, application, lever and dispatch has a short sourced history note,
  unlocked on first sight.

**Rebound.** The Archive is where the history lives, so the game never has to lecture in play. Records reward frugality.

**Player.** Hunts records. Reads history at their own pace.

**Cost.**

| Area | Work | Size |
|---|---|---|
| Contract | `AchievementDef.when: Cond`. `MetaState.records`. `ArchiveDef` (or a `note` field on existing defs). | S |
| Core | — | S |
| Content | — | L (notes) |
| UI | — | M |

**Risks.** None of note.

---

## P18. Planetary boundaries: a third layer — **Could**

**Idea.** In Act III, Pressure becomes several global boundaries (after Rockström et al., 2009): climate, nitrogen,
freshwater, land, novel entities (code stock counts here, half in jest), and materials. Each era feeds several. The
**Long Now** reset (layer 3) carries one boundary forward per reset as a permanent constraint. Currency: *Legacy*, which
buys late Articles and post-game modifiers.

**Rebound.** Problem-shifting, a named form: fixing one boundary with efficiency loads another (biofuels move climate
Pressure onto land and nitrogen).

**Player.** Optimises under 6 constraints at once.

**Cost.** Contract M: Pressure becomes a map. Core M. Content M. UI M: a boundary rose.

**Risks.** Gauge overload on a phone. Show only the two worst boundaries by default.

---

## P19. Post-game: the Long Now — **Could**

**Idea.** After the true ending:

- A sandbox world with all eras and an endless calendar.
- A **History ladder**: histories stack, with each completed one adding a permanent modifier to the next, as with
  Antimatter Dimensions' challenges or Evolve's universes.
- The weekly Almanac.
- Records.
- An epilogue run, *The Steady Century*: 100 years in which nothing much happens, on purpose, scored on wellbeing per ton.

**Rebound.** Mastery of all forms together.

**Player.** Optimises, completes, and comes back on Mondays.

**Cost.** Mostly content and UI on top of P12, P13 and P18 (M).

**Risks.** None of note.

---

## Cut, and why

- **A clicker minigame for efficiency research.** It adds clicking, not rebound.
- **Random loot or gacha-like boosts.** They express nothing about rebound and violate the determinism the core relies on.
- **Generic multiplier layers ("Infinity", "Eternity").** Each layer must change how you play (see `long-game.md`).
- **A real-company sponsor era (named tech firms).** It conflicts with the no-living-people rule and the tone.
- **Pollution as a click-to-clean chore.** Deletion in Code already does "spend effort to shrink the stock" with meaning.
- **The cotton gin and slavery as a mechanic.** This is the canonical labour rebound (the gin made enslaved labour more
  profitable and expanded it), but it must not be gamified as a resource. It is acknowledged in the Archive and in one
  sombre dispatch at most. This is an owner decision (see the roadmap).
