# Rebound — design brief

Read this first. An incremental game about Jevons paradox: every efficiency upgrade makes the world burn more; the game
is learning why, then learning what actually works. Mobile-first single-page web game, served from GitHub Pages, no
runtime dependencies. Depth is in `design/`: the structure and hours in `long-game.md`, the four paradigm shifts in
`paradigm-shifts.md`, the build order in `roadmap.md`, the art in `visual-direction.md`, the contract decisions in
`m1-contract-notes.md`, sourced facts in `research/`. The contract itself is `src/types.ts`.

**Tone.** Dry broadsheet and ledger wit. British English. The game never lectures; the gauges do. Real people appear
only in card blurbs, and only the dead; the recurring cast is fictional.

**Words.** The unit of play is an **Industry** on screen and a `Sector` in code. The period is an **Age**. Player text
never says "sector" or "era" for the unit.

## The rule

    R = D(p_s) / η          p_s = p_pre + permit + duty          p_pre = p_r / η + c

η efficiency, p_r resource price, c capital cost per unit of service, p_s service price, D demand, R resource use per
second.

Demand is a sum of **applications**, each a logistic adoption curve (N population, S_i saturation, p_i half-price, k_i
steepness): `D_i = N · S_i / (1 + (p_s / p_i)^k_i)`. While p_s ≫ p_i use is elastic (k_i > 1: efficiency backfires);
once p_s ≪ p_i it saturates and efficiency finally saves. Cheaper service brings new applications within reach, which
the player **pays to found**: the frontier. That is the historical engine of Jevons.

- **Depletion** (stock resources): `p_r = p_0 · (Q_0 / Q)^α`.
- **Pressure** (smog, carbon, the code stock): `P += source · intensity − P · absorption`; crises at set fractions of
  `collapseAt`, collapse at it.
- **Income** = `m · p_pre · D`. Duty and permit revenue is **levy revenue**, never income; a small share becomes
  Mandate ('treasury') or it is paid back per head ('dividend').
- **Compute's η rises on its own** (`autoEtaRate`, after Koomey) as well as by cards.
- **Code's resource is a flow** (human attention), its pressure is the stock of code, fed by service shipped and never
  absorbed; upkeep eats attention; Deletion is the only lever that lowers pressure directly.

**The rebounds, each a mechanic:** direct (the adoption curve); indirect (`spill`: savings in a later Industry add
demand to an earlier one); economy-wide (population grows with wellbeing, and saturation scales with population);
frontier (applications within reach). Later Industries add named forms of their own (`long-game.md`).

## The instruments (as the contract defines them)

**Shadow rebound.** Each Industry is solved twice: as it is, and as a **shadow** with η frozen at `etaAtBase` and
everything else identical.

    promisedR = shadowR / etaFold        rebound = (R − promisedR) / (shadowR − promisedR)        frontierFold = shadowR / baseR

`rebound` is direct rebound: 100% means the savings were all eaten; above 100% reads **Backfire**. `frontierFold`
covers new applications, population and scarcity together, and `R / baseR = frontierFold × R / shadowR`. Under a
binding cap direct rebound reads about 100%, correctly: the savings became service and the cap set the coal.

**Projections on cards.** After the reveal, efficiency and capital cards show "This decade" (projected change in total
R over 10 model years with the card against without) and "Brings within reach" (applications the card makes foundable
within the decade, with the effect of founding each).

**The budget line.** Drawn at the current R: on the first lever raised in an Industry, when the player draws one, or
automatically for an Institution's standing cap once the Industry has been open `standingDrawYears`.

    budgetR(y) = max(floor · r0, r0 · (1 − d)^(y / 10))        d = 5% a decade        within budget: R ≤ budgetR × 1.005

The line declines until the Industry reaches Steady State on it, then holds. **Decoupling** = within budget, wellbeing
at or above target, no Reckoning pending. A **decade** is each 10-year step of the unbroken streak (it pays the decade
effects); **Steady State** is 50 years. Redrawing resets the streak and keeps earned decades. Caps are a fraction of the
line and follow it down.

*From M2:* a decade is judged against the wellbeing on the day the line was drawn (`min(target, w0 × 0.95)`), so the
first decade comes soon after the line; Steady State additionally needs **clear skies** (pressure down to half what it was
when the line was drawn, and not rising: the sink line, drawn on the sparkline and shown as the sky clearing); a line
can be drawn Gentle, Firm or Severe; each decade offers a choice of two dividends.

**Demography.** Population growth per second at wellbeing W, subsistence s, transition W_t:
`g = popGrowth · (W − s) · max(0, 1 − ((W − s) / (W_t − s))²)` above s, a quarter strength below; growth stops at W_t
(46), above the wellbeing target (34), so a steady economy can hold the target without growing.

## Currencies

- **Capital (£):** from income and clicking; buys upgrades, founds applications.
- **Mandate:** from wellbeing above a floor, a spike at each crisis, a share of levy revenue, decade dividends; buys
  lever levels and pays their upkeep.
- **Hindsight:** earned at a Reckoning, spent only between runs on Know-how and Institutions.
- **Later layers:** Precedent (the Treaty), Legacy (the Long Now); Confidence, Attention and Ground are the binding
  resources of Acts II, III and IV.

## Levers

`duty` (holds the service price up as η rises) · `cap` (a fraction of the budget line; a permit price until R meets it;
leaks under a high permit) · `sufficiency` (saturation drifts down) · `substitution` (a share from a renewable flow, at
1.5 × c) · `circularity` (a share of R returns to the reserve) · `greenSpending` (cuts spill) · and Code's `deletion`,
`reviewGate`, `sharedLibs`. Every lever has a `catch` line and a repeat table. Crises open the political window. From M3
at least one lever per Industry rebounds; from M5 the government gains `standard`, `ban`, `quota`, `borderAdjust` and
`charge`, and the rival answers each one.

## A first run, as measured

Efficiency-only play (`bun run tools/balance.ts efficiency 1`, 19 Nov 2026):

| Time | What happens |
|---|---|
| 0:18 | Better boilers (−33%). Coal use rises 232% within a minute: Cotton mills come within reach |
| 0:36–4:24 | Another engine works, seven levels (the repeatable growth card) |
| 1:00 | Cotton mills founded |
| 5:18 | Separate condenser (−40%). Coal use +150% within two minutes |
| 8:36 | **The Coal Question**: the reveal. Cards gain their projection lines; the rebound meter wakes. Nothing else |
| 13:36 | Smoke noticed in Parliament: the first two levers and Mandate |
| 13:06 | Railways founded (brought within reach by the double-acting engine) |
| 19:12 | First crisis, The Black Fog: population −8%, Mandate +150; the population gauge appears |
| 40:48 | Exhaustion. Efficiency ×14.9, peak coal use ×45.6. Hindsight 72 |

Run 2 opens with the Market and opens Light & Current at 10–12 minutes (about 50 minutes in all). Budgets arrive in
run 3 (the unfolding, below); the restraint player earns its first decade about 15 minutes into run 3 and Steady State
in run 4 (about 3.4 h in all).

## The unfolding

Systems arrive one at a time, each when the player has a reason to want it, never two within five minutes of play,
each introduced by one headline and marked "New" until seen; what is locked is not shown at all. The schedule, its
conditions and its reasons are in `design/unlock-schedule.md`; the data in `src/content/features.ts`; the rule in
`src/types.ts` (`FeatureDef`). In short: run 1 the reveal (meter and card lines only), then two levers and Mandate,
then the population gauge at the first crisis; run 2 the Hindsight shop and the Market, then more levers and the
recycling choice; run 3 Charters, then the budget in its simplest form (one pace), then Tighten, the dividend choice,
the pace and clear skies, each a decade later; run 4 the Commons and Steady State; run 5 Settlement. Once arrived, a
system stays for good.

## Industries and Ages

| Age (Act) | Industries | Art style | The player is |
|---|---|---|---|
| The Coal Age (I), 1780–1914 | **Steam** · **Light & Current** · Iron & Steel · Fishing | steel engraving · chromolithograph · foundry lithograph · harbour engraving with a chart | the industrialist |
| The Great Acceleration (II), 1909–2010 | Plenty · **Motion** · Comfort · Freight & Flight | seed catalogue · airbrushed travel poster · appliance catalogue · route map | the government |
| The Attention Age (III), 2000–2100 | **Compute** · Proof-of-Work · **Code** | vector CAD · red terminal · cyberpunk night city | the specifier |
| The Transition (IV), 2030–2100 | Transition | risograph zine | the unbuilder |

Bold: built. Each Industry has one mechanic of its own and one thing it teaches that no other does (`long-game.md`).

**Each mechanic is a temptation.** Steam's deeper seams, Light's night uses, Motion's roads and suburbs and Compute's
"free" business models pay the player who burns: engaging with each earns the `efficiency` player 30% to four times the
income in that Industry, and a longer run. The same moves test the player who restrains: each adds use that a budget
line must then hold back, so under a held line the restraint player who ignores Light's load curve or Motion's sprawl
does better than one who takes them (measured 57% and 34% better). The game does not lecture on this; under a drawn
line the card, the staked-out use and the next seam say plainly what they add to the line, and the instrument says what
the mechanic is doing to it now.
Industries open on milestone conditions (`unlock.when`, a data-only `Cond`, plus prerequisites and Reckonings), never
on a service price, so restraint never locks content away. Motion, Compute and Code move behind the later layers in
M4 (owner decision D3).

## Prestige and the four chairs

- **Reckoning** (layer 1). A run ends at exhaustion, collapse, or by choice after the reveal. Hindsight =
  wellbeing-years ÷ intensity^e + per budget decade + reserve unburnt (ramped by years at target) + first backfire per
  Industry + Industries reached + Steady States. Peak output earns nothing. **Know-how** (trees with forks) makes runs
  faster and hits the wall sooner: the paradox one level up. **Institutions** (levels, seats in a loadout) put restraint
  in place from minute one. From run 2 the **Market** automates efficiency; switching it off is a restraint decision.
- **Treaty** (layer 2): **The Other Chair**. The player becomes the government; Pryce Consolidated runs the Industries
  as the player once did, seeded from their own first run. Inspect, legislate, close loopholes, win elections.
- **Long Now** (layer 3): **You Write the Objectives**. Agents run every Industry; the player writes their briefs and
  reviews what they game.
- **Unbuilding** (the last Age): progress is what is taken down while wellbeing holds.
- Threaded through all: **the game rebounds on you**. The player's own decisions and hours are measured on the device
  and published by the Statistics Office at about hour 7.

## Endings

Three credits, and the game continues after each: the **Act I ending** (built in M3 as the first ending: every
Industry open and **settled** at once, in one run, and held so for fifty model years, `GlobalParams.endingYears`;
15–20 h), the **Act II ending** (the consumption ledger within budget for 50 years, about 50 h), the **true ending**
(everything retired or settled at its sink line, wellbeing held for 50 years, the first pit flooded into a lake, about
100 h). Also: **Backfire** (the default Reckoning), **Degrowth by accident** (hidden: population crashes until use
falls), **Business as usual**, and the achievement **Jevons Was Right**. Endings report as ledgers, never as verdicts.

## UI and art direction

- **The living scene.** Each Industry is an illustrated landscape that fills, speeds up and darkens with play: places
  grow out from a landmark as adoption rises, survey stakes mark a site that can be founded, pressure is weather, the
  cut-away under the ground shows the reserve hollowing out, a Reckoning freezes the scene grey, and Steady State clears
  it. Every new system must have something to show in it.
- **Art by Age.** Each Industry is drawn the way its period pictured itself; leafing through the tabs is leafing through
  250 years of illustration, ending in a cyberpunk city, then a riso zine. Constant across styles: the 600 × 400 picture,
  horizon in the upper third, far/mid/near bands, the cut-away strip, the frozen grey Reckoning.
- **Instruments.** Two gauges that should move in opposite directions and do not, **Efficiency** and **Consumption**,
  pinned at the top. Cards show the promise in large type; after the reveal, the decade and within-reach lines, with a
  word and a glyph as well as a colour. The rebound meter over 100% reads Backfire. The budget line (and, from M2, the
  sink line) on the sparkline. A formula sheet behind every number.
- **Phone first.** One column, gauges pinned, thumb-reach controls, an "affordable" signal on the first screen, nothing
  shown before it can be used, save safety, offline catch-up that never collapses a run unseen.
