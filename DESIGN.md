# Rebound — design brief (shared by all workstreams)

An incremental game about Jevons paradox. Every efficiency upgrade makes the world burn *more*; the game is
learning why, then learning what actually works. Mobile-first single-page web game, one self-contained HTML file.

Tone: dry, ledger-and-broadsheet wit. Never lectures; the gauges do. British English.

## The rule

    R = D(p_s) / η            p_s = p_r / η + c

η efficiency, p_r resource price, c capital cost per unit service, p_s service price, D service demand, R resource use.

Demand is a sum of **applications**, each a logistic adoption curve (N population, S_i saturation, p_i half-price, k_i steepness):

    D_i = N · S_i / (1 + (p_s / p_i)^k_i)

While p_s >> p_i the use is elastic (elasticity ≈ k_i > 1 → efficiency backfires). Once p_s << p_i it is saturated and
efficiency finally saves resource. New cheaper applications restart the climb. That is the historical engine of Jevons.

Depletion brake (stock resources): p_r = p_0 · (Q_0 / Q)^α.
Pressure (smog, carbon, code stock): P += source · intensity − P · absorption.
Player income = m · p_s · D (a cut of spending). Elastic demand → cheaper service → more income. Saturation → income stalls.

Four rebounds, each a mechanic: **direct** (adoption curve), **indirect** (savings in a later era spill demand into an
earlier one), **economy-wide** (population grows with wellbeing, saturation scales with population), **frontier**
(applications become available when p_s crosses a threshold; the player pays to found them).

## Currencies

- **Capital (£)** — from income; buys upgrades and founds applications.
- **Mandate** — from wellbeing above a floor, plus a spike after each Pressure crisis; buys counter-levers and pays their upkeep.
- **Hindsight** — from a Reckoning (prestige); buys permanent Know-how or Institutions.

## Arc of a run

1. 0–2 min: one Newcomen engine pumping a pit. Click to sell power. Buy the first boiler upgrade.
2. 2–5 min: cotton mills. Income jumps. Coal gauge ticks up, unremarked.
3. 5–10 min: Watt's condenser, the big "−60% coal" card. Coal use rises anyway. A broadsheet asks why.
4. ~10 min: research *The Coal Question* (Jevons, 1865) — "the reveal". Upgrade cards gain a second red line: the
   projected change in TOTAL use. The rebound meter appears. Counter-levers appear.
5. 10–20 min: railways; first smog crisis; first Mandate.
6. 20–30 min: first lever choice, then the first Reckoning.

Target for Era 1 on efficiency-only play: coal use rises ~1.5–2× over the first four efficiency upgrades while the
cards cumulatively promise −80%; reserve exhaustion or smog collapse somewhere around 25–40 minutes.

## Eras (stack; earlier ones keep running)

| Era | Service | Resource | Efficiency path | Applications | Twist |
|---|---|---|---|---|---|
| 1 Steam 1780–1870 | Motive power | Coal (stock) | Newcomen → better boilers → Watt separate condenser → double-acting → high-pressure → compound → triple expansion → turbine | Mine pumping, cotton mills, railways, steamships | Mine pumping adds to the coal reserve (cheap power reaches deeper seams) |
| 2 Light 1870–1950 | Lumens | Town gas then electricity (stock) | Tallow → gas mantle → carbon filament → tungsten → fluorescent | Street lamps, night shifts, homes, shop signs | Indirect rebound: spills demand into Steam |
| 3 Motion 1950–2000 | Vehicle-miles | Oil (stock) | Carburettor → fuel injection → lean burn → hybrid | Delivery, commuting, suburbs, flights | Lock-in: suburbs and commuting demand won't fall back |
| 4 Compute 2000–2025 | Operations | Electricity, water, chips (stock) | Auto: energy per operation halves on a short cycle whether you like it or not; plus bought upgrades | Spreadsheets, web, streaming, model training | Efficiency outruns every brake; only caps and sufficiency hold |
| 5 Code 2025– | Working features | Human attention (flow, has a ceiling) + draws on Compute | Autocomplete → chat assistant → coding agent → agent fleets | Internal tools, throwaway personal apps, legacy rewrites, agents writing code for other agents | Pressure = the *stock* of code (maintenance debt), fed by service shipped, no natural absorption; upkeep eats attention. Agent-on-agent app is nearly unsaturable |

Era 1 reference numbers: p_0 = 1, c = 0.04, m = 0.2, α = 0.6. Applications (p_i, S_i, k_i): Mine pumping (1.5, 40, 1.5),
Cotton mills (0.6, 300, 2.0), Railways (0.3, 1200, 2.2), Steamships (0.15, 3000, 2.4). Efficiency steps
η: 1 → 1.5 → 2.5 → 3.5 → 5 → 8 → 12 → 18. With all four apps active and N = 1 these give R ≈ 202, 257, 321, 348, 355, 324, 269, 205.

An era opens when the previous era's service price falls below a threshold AND the player has enough Reckonings behind them.

## Counter-levers (cost Mandate, mostly cut income)

Fuel duty escalator (holds p_s up as η rises) · Hard cap (ceiling on R, permit price, leaks if far below demand) ·
Sufficiency (slowly lowers saturation) · Substitution (renewable flow, capped) · Circularity (returns a share of R to the reserve) ·
Green spending (cuts indirect spill). Era 5 adds: Deletion (spend attention to shrink the code stock — the only lever that
lowers Pressure directly) · Review gates · Shared libraries · "Don't build it" (sufficiency).

Crises open the window: each Pressure crisis grants a Mandate spike.

## Prestige: the Reckoning

A run ends when a reserve runs dry or a Pressure hits its collapse line; the player can also call one. Hindsight is earned
from peak wellbeing and years spent decoupling, NOT from peak output.

- **Know-how** (the obvious buy): permanent efficiency / cost multipliers. Runs start faster and hit the wall sooner —
  the paradox again, one level up.
- **Institutions** (the slow buy): permanent counter-levers in place at the start of each run — e.g. a Statistics Office
  that reveals the rebound line from minute one, a standing fuel duty, an absorption sink.

Run summary card: efficiency gained vs resource used, side by side.

## Endings and achievements

- **Steady State** (true ending): wellbeing ≥ target while resource use falls, for 50 in-game years — per era (badge) and
  then across all five eras at once (credits).
- **Backfire**: the default Reckoning.
- **Degrowth by accident** (hidden): population crashes until use falls; technically decoupled, wellbeing fails the bar.
- **"Jevons Was Right"**: max out an era's efficiency tree while its resource use has grown many-fold.

## UI direction

Two gauges that should move in opposite directions and don't — **Efficiency** and **Consumption** — pinned at the top.
Upgrade cards show the promise in large type; after the reveal a red second line shows projected total use.
Rebound meter: share of promised savings eaten by demand; over 100% reads "Backfire" and glows.
Applications are small illustrated vignettes that fill with activity as adoption rises. Pressure is weather over the
vignettes (smog thickens), not a bar. Each era restyles the page: engraved ledger (Steam), gaslit poster (Light),
chrome dashboard (Motion), terminal green (Compute), and a fifth look for Code. Mobile-first: one column, gauges pinned,
thumb-reach controls, tap-and-hold (or an info button) to see the formula behind a number.
