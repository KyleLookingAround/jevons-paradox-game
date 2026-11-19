# Rebound — the long game

The single source of truth for the game's structure: Ages, Industries, layers and resets, the progression map with
target hours, the content inventory, and the first hour as now built. Second design pass, 19 Nov 2026; it replaces the
first pass of 18 Nov. The four paradigm shifts are designed in `design/paradigm-shifts.md`; the build order is
`design/roadmap.md`; the proposals it cites (P-n) are in `design/proposals.md`.

Vocabulary: the unit of play is an **Industry** on screen (`Sector` in code). The period is an **Age**. Nothing
player-facing says "sector" or "era" for the unit. Older documents (`proposals.md`, `critique-v1.md`,
`research/*.md`) still say "era".

---

## What changed and why

| First pass (18 Nov) | Now | Why |
|---|---|---|
| Ten eras in three acts | **Twelve Industries in four Ages**: Fishing added to the Coal Age, Proof-of-Work to the Attention Age, and the Transition made its own Age | The two most mechanically distinct candidates from the research; Act I needed more than three Industries to carry 16 hours |
| Layer 2, the Treaty: pick a region among 3–6 run by scripts | **The Treaty is The Other Chair**: the player becomes the government; the Industries are run by a rival, Pryce Consolidated, seeded from the player's own first run; leakage goes to one neighbour, **Abroad** | The six-region World was the costliest and least legible part of the plan, and the audit asked for one neighbour. The Other Chair changes the verb, not the scale (shift 1) |
| The Treaty replays Act I in 10–15 minutes | **Act I is never replayed.** After the Act I ending, the Coal Age opens settled in every run | The audit's third risk: replay fatigue in hours 20–60 |
| Layer 3, the Long Now: planetary boundaries as constraints | **The Long Now is You Write the Objectives**: agents run the earlier Industries; the player writes their briefs; boundaries become the constraint vocabulary | Changes the verb again; uses the balancer's strategies as content (shift 2) |
| Transition: displacement and retirement levers inside Act III | **The Transition Age is Unbuilding**: progress is what you take down while wellbeing holds | The ending needed its own verb (shift 4) |
| No thread about the player | **The Game Rebounds on You**: the player's own decisions and hours are measured on the device and published, at about hour 7 | A second reveal as strong as the first (shift 3) |
| First ending at 110–120 h | **Three endings**: Act I at 15–17 h, Act II at about 50 h, the true ending at about 100 h | The audit: ship a real ending at 15–20 h |
| First Steady State "about hour 4", measured at 1.9 h | **Steady State needs clear skies** (the sink line), not only a held budget line; **decades are judged against the wellbeing the line was drawn at** | Measured: once second-run Institutions are bought, restraint decouples almost at once; and the first decade never came in runs 1–2 because the absolute wellbeing target is out of reach there |
| Run 2 offers a loadout and a Know-how fork | Run 2 opens with **the Market** (efficiency automates itself), a **Charter** choice, and a restraint loop already proven in run 1 | The audit's first risk: the joke lands once |
| True ending 110–120 active hours | **About 100 active hours** (range 90–115); post-game beyond | Act I replay and the six-region World cut about 15 weak hours; two Industries add about 8 |

---

## Pillars (the test for every addition)

1. **Every system names its rebound.** If a mechanic cannot say which rebound it expresses, it is cut.
2. **Every layer changes what the player is.** Industrialist, government, specifier, unbuilder. A layer that only
   makes the numbers bigger is cut.
3. **Efficiency is easy and restraint is built.** Growth automates itself early; restraint needs Institutions, Mandate
   and patience.
4. **The lesson is learnt by failing first, then rewarded.** Backfire pays best in runs 1–2; decoupling pays best from
   run 3 onward (owner decision D1, settled and measured: 4.6× by run 3).
5. **Every system has something to show.** The living scene is the game's face. A system with nothing to draw is not
   finished.
6. **History is right or it is not in.** Real names and dates only where sure. The cast is fictional; no living
   people; no real political parties.

---

## The shape: four Ages, three layers, three endings

| | Act I | Act II | Act III | Act IV |
|---|---|---|---|---|
| Age | **The Coal Age** (1780–1914) | **The Great Acceleration** (1909–2010) | **The Attention Age** (2000–2100) | **The Transition** (2030–2100) |
| Industries | Steam · Iron & Steel · Light & Current · Fishing | Plenty · Motion · Comfort · Freight & Flight | Compute · Proof-of-Work · Code | Transition |
| The player is | the industrialist | the government (shift 1) | the specifier (shift 2) | the unbuilder (shift 4) |
| Opponent | the rule itself | Pryce, paid to grow | the agents, obeying their briefs | lock-in, Pryce, debt |
| Binding resource | capital, then Mandate | Confidence | Attention | Ground, with wellbeing held |
| Prestige layer | **Reckoning** → Hindsight | **Treaty** → Precedent | **Long Now** → Legacy | (inside the Long Now) |
| Main verb | buy, found, hold a line | inspect, legislate, amend, win elections | brief, review, triage | retire, retrain, seal, rewild |
| Ends with | **Act I ending** (credits): all four at Steady State in one run, 15–17 h | **Act II ending** (credits): the consumption ledger within budget for 50 years across the Age, about 50 h | **True ending** (credits) at the end of Act IV, about 100 h | |
| Art | steel engraving → foundry lithograph → chromolithograph → harbour engraving | seed catalogue → airbrushed poster → appliance catalogue → route map and chart | vector CAD → red terminal → cyberpunk night city, then a neon overlay on every scene | risograph zine; every tab reprinted in riso as it is unbuilt |

Shift 3 (the game rebounds on you) runs through all four: decisions are counted from M2; the reveal is at about hour
7; real attention is the instrument in Act III; the last return is printed at the true ending.

---

## Layers: what each reset wipes

| | Reckoning (layer 1) | Treaty (layer 2; the first is **Take office**) | Long Now (layer 3; the first is **Hand over**) |
|---|---|---|---|
| Unlocks | Run 1 ends (exhaustion, collapse) or is called after the reveal | The Act I ending | The Act II ending |
| Wipes | The run: capital, upgrades, applications, levers, Mandate, population, Commons built, budgets | Hindsight; Know-how (the industrial trees pass to the rival as a capped head start; Statecraft in later Treaties); Institution levels; the loadout | Precedent; Articles except one (it becomes a **Standing Article**); Statecraft; Treaties count |
| Keeps | Hindsight, Know-how, Institutions, slots, achievements, records, Archive, Histories, `meta.opening` | Institutions unlocked; Commons unlocked; achievements; Histories; Archive; Precedent and Articles (from the second Treaty); **the Coal Age capstone** | Legacy; Measures (below); achievements; the Coal Age and Great Acceleration capstones |
| Pays | Hindsight: wellbeing-years (÷ intensity), budget decades, reserve unburnt, first backfires, Industries reached, Steady States | Precedent: decades within budget on the **consumption** ledger, Steady States, world reserve unburnt, wellbeing-years | Legacy: Ground, Steady States across all Industries, wellbeing per ton |
| Spent on | Know-how, Institutions (between runs only) | Articles (permanent): Border adjustment, Ratchet clause, Independent inspectorate, Keep it in the ground… | Measures: permanent independent measurement of one metric everywhere (it can no longer be gamed); Attention capacity |
| Expected count | ~25 in Act I; then one per Ministry in Act II | 4–6 (hours 16–52) | 2–3 (hours 52–100) |

**Capstones.** After the Act I ending every run opens with the Coal Age Industries settled; after the Act II ending,
the Great Acceleration's too, run by agents. Settled Industries pay dividends and can be unsettled by spill, so they
are defended, never replayed.

**Inside Act II**, a run is a **Ministry**. It ends at two lost elections in a row, exhaustion, collapse, or by
choice; its run-end screen is still the Reckoning, paying Hindsight that buys Statecraft and Institutions.

---

## The run, as it will be after M2

The M1 rules (shadow rebound, budget line, Hindsight terms) are in `DESIGN.md`. M2 changes these, to fix the two
unmet targets (first Steady State at 1.9 h against 3–4 h; first decade in run 3 against 18–25 min) and the audit's
first risk. Contract detail is in the roadmap.

- **Decades are judged against the line's own day.** A decade within budget needs R within the line and wellbeing at
  least `min(target, w0 × (1 − slack))`, where `w0` is the wellbeing when the line was drawn: nobody worse off than
  on the day you drew it. Measured cause: the budget player peaks at wellbeing 21.5 in run 1 and 24.9 in run 2,
  against a target of 34. Expected: first decade at about 18–22 minutes of run 1.
- **Steady State needs clear skies.** Fifty years within budget, wellbeing at the full target, **and** the Industry's
  pressure down to half what it was on the day the line was drawn (`clearBelow × p0`, with a small absolute floor) and
  not rising: throughput the sink can absorb. On the sparkline the **sink line** (`sinkR`, the R whose equilibrium
  pressure is that level) is drawn as a second dashed line, and the budget line declines toward it. On the scene, the
  sky clears. Holding a line with a seated cap no longer suffices: halving the pressure means roughly halving R, which
  a Gentle line alone takes about 13 decades to do, so reaching the sink needs a steeper pace or substitution,
  circularity, absorption and sufficiency at levels that come from runs 4–6. Measured reason for the relative
  definition: in M1's `budget` runs pressure at Steady State was already only 5–21% of collapse. `clearBelow` is the
  balance knob. Target: first Steady State at 3–4 h.
- **The pace of the line is a choice.** Drawing a line offers Gentle (5% a decade), Firm (10%) or Severe (20%). A
  steeper line pays a larger decade dividend and reaches the sink sooner, and is harder to hold.
- **Each decade offers a choice of two dividends** (audit rec. 12).
- **Settlement.** An Industry at Steady State can be Settled: frozen, paying a dividend, defended against spill with
  Mandate (P5).
- **The Commons** from run 3: where the savings go (P6).
- **The Market from the start of run 2.** Efficiency cards and foundings buy themselves when payback is short. On by
  default; switching it off, per Industry, is a restraint decision. Run 2's verbs are founding, forks, the line and
  the Charter, not buying cards.
- **Charters.** At each Reckoning, choose the next run's starting situation from two (deterministic from the seed):
  a different seam ladder, a different first application, a different fork pair, a different starting Institution
  offer. Mild, always on, no goal (Histories are the challenges).
- **Offline never collapses a run**: `fastForward` holds one step before a crisis or collapse; base cap 8 hours.
- **Know-how respec** between runs.
- **Recorded for later shifts**: the first 40 purchase and founding actions of each run (`meta.opening`, for Pryce)
  and decisions per model decade (for shift 3).

| M2 system | Rebound it expresses | What the player does differently | What it shows | Size (contract · core · content · UI) |
|---|---|---|---|---|
| Decades against the line's own day | economy-wide: the line must hold while population and wellbeing grow from that day | Draws a line in run 1 and is paid for holding it within minutes | the decade tick on the sparkline; a dividend card | S · S · S · S |
| Clear skies (the sink line) | direct and frontier: a held line is not enough while efficiency keeps refilling demand; only substitution, absorption and sufficiency reach the sink | Builds towards a second, lower line over several runs; seats Institutions for substitution, not just caps | a second dashed line on the sparkline; the scene's sky clearing | S · M · S · S |
| Pace of a line | none new; it prices the economy-wide rebound | Chooses how hard to restrain, and is paid for it | the line's slope | S · S · S · S |
| Two dividends a decade | names the respending choice at each tick (indirect) | Makes a decision every decade instead of waiting | the dividend card | S · S · M · S |
| The Market from run 2 | direct and frontier, automated: the cards buy themselves, so backfire runs faster | Founds, forks and draws lines instead of buying cards; switches the Market off per Industry | scaffolding building itself in the scene | S · M · S · M |
| Charters | each Charter tilts one rebound (cheap engines: embodied; mills first: frontier) | Picks a different starting situation each run | a different first landmark in the valley | S · S · M · S |

---

## The twelve Industries

Each entry gives the Age, its calendar, service, resource and pressure; its one mechanic of its own; what it teaches
that no other Industry does; the rebound it names; its art style; applications; the chain; its rebounding lever; when
it opens. Dates are only given where sure. Starred items (*) need a check by the content author before they ship.

### The Coal Age (Act I: the industrialist)

**1. Steam** (1780–1870) · motive power (hp) · coal (stock) · smog. *Built (M1).*

- **Mechanic:** seams (M3). The reserve is a ladder of seams of rising cost; cheap pumping power opens the next; the
  player decides whether to sink each one.
- **Teaches:** the rule itself. Efficiency lowers the price of the service; demand and new uses outgrow the saving.
  And supply-side rebound: efficiency enlarges the resource.
- **Rebound:** direct, frontier, economy-wide (through population), supply-side.
- **Art:** `ledger`, steel engraving from an illustrated paper, 1840s.
- **Applications:** Mine pumping · Cotton mills · Winding engines · Railways · Steamships · Steam ploughing.
- **Chain:** Better boilers → Separate condenser (Watt, 1769) → Double-acting → High-pressure (Trevithick, c. 1800) →
  Cornish engine → Compound → Triple expansion (1880s) → Turbine (Parsons, 1884); Engine duty reports (Lean, 1811);
  forks: Boulton & Watt licence / Pirate engine, Parliamentary trains (1844) / First-class lines, and two more.
- **Research:** The Coal Question (Jevons, 1865): the reveal.
- **Rebounding lever (M3):** coal duty with exemptions for "productive use"; the exempt applications grow.

**2. Iron & Steel** (1828–1914) · tons · coke, drawn from Steam's coal reserve (the first shared stock) · slag and
smoke. *M4.*

- **Mechanic:** inputs. Its service lowers capital cost `c` in Steam, Light and later Industries: cheap steel, more
  engines.
- **Teaches:** the embodied rebound. Efficiency in an intermediate good makes every other Industry's capital cheaper.
  Jevons's own example was iron smelting: the hot blast cut coal per ton of pig iron to about a third, and the trade's
  total coal rose (* verify the quotation against *The Coal Question*, ch. VII).
- **Rebound:** embodied (new name).
- **Art:** foundry lithograph: the `ledger` family in two printed colours, furnace orange over ink; the Black Country
  at night; slag heaps in the cut-away; Steam's viaduct seen from the other side.
- **Applications:** Rails · Ship plate · Bridges & girders · Machine tools · Tinplate & cans · Barbed wire.
- **Chain:** Hot blast (Neilson, 1828) → Bessemer (1856) → Siemens–Martin open hearth (1860s) → Gilchrist–Thomas
  (1878) → By-product coke ovens; fork: Sheffield crucible quality / Bessemer tonnage.
- **Rebounding lever:** tariff protection (keeps the price up; foreign steel arrives in Act II, from Abroad).
- **Opens:** about hour 2.5–3.5, beside Steam (`unlock.after: ['steam']`).

**3. Light & Current** (1870–1950) · lumens · town gas, then current · coal smoke. *Built (M1); mechanic M3.*

- **Mechanic:** load-building (M3). Capacity is built for the evening peak; income depends on utilisation; the player
  is tempted to sell the trough (off-peak tariffs, trams, appliances), as Insull did. Gas against electric as an
  in-run fork at about hour 9 (audit rec. 16).
- **Teaches:** a seller with fixed capital is paid to rebound; the cheapest unit is the next one sold. Revenue
  decoupling is the Institution that flips it.
- **Rebound:** utilisation (new name).
- **Art:** `gaslight`, chromolithograph poster, 1890s.
- **Applications:** Street lamps · Lit homes · Night shifts · Shop signs · Electric trams · Picture palaces.
- **Chain:** Batswing → Welsbach mantle → Carbon filament (Swan and Edison, c. 1880) → Drawn tungsten (Coolidge, c.
  1910) → Gas-filled (Langmuir, 1913) → Fluorescent (late 1930s). **Revival in Act III:** the LED; lit outdoor area
  grew about 2.2% a year in 2012–16 (Kyba et al., 2017).
- **Rebounding lever:** off-peak tariff (flattens the peak, creates night demand: the storage heater).
- **Opens:** about 50 minutes (measured: run 2 at 10–12 minutes).

**4. Fishing** (1880–1914, with a revival in Act II) · catch (tons landed) · the stock (**renewable**) · the
spawning stock. *M4.*

- **Mechanic:** a renewable stock with a threshold and a lying gauge.
  - The stock regenerates logistically: moderate catch is sustainable for ever.
  - Past a threshold the regeneration rate itself collapses, and stays collapsed **across Reckonings** for the next
    few runs (`meta.scars`): the northern cod moratorium of 1992 was announced for two years and lasted 32.
  - The Industry's own gauge is catch per unit effort, which stays healthy while the stock falls (hyperstability).
    Only a seated Survey Institution shows the true stock.
  - Foreign fleets take a share of the stock that grows with fishing power everywhere. The EEZ lever pushes them out;
    the home fleet then grows into the space (Canada, 1977: afterwards the overfishing was done by Canadian trawlers).
- **Teaches:** what no other Industry can: a resource that renews unless you cross a line, and does not come back if
  you do; that the instrument you trust can lie; and the commons shared with rivals. It foreshadows Pryce and Abroad.
- **Rebound:** direct (fishing power makes fish cheap: fried fish and the railway), plus **hysteresis** (new name:
  past the threshold, the resource's capacity to recover is what gets spent).
- **Art:** harbour engraving in the `ledger` family, with an Admiralty chart in the cut-away: soundings, and the
  shoals as stipple that thins; a scar is blank grey water.
- **Applications:** Fresh fish by rail · Fried fish shops · Salt and smoked trade · Fish meal for the fields (feeds
  Plenty later) · Cod liver oil · Fish fingers (the Act II revival, 1950s*).
- **Chain:** Steam trawlers (1880s) → Otter trawl* → Steam drifters* → Ice and the fish train → (revival) Factory
  freezer trawler (*Fairtry*, 1954*) → Sonar → Satellite navigation. Landings per unit of fishing power fell 94%
  over 1889–2007 (Thurstan et al., 2010).
- **Research:** a Huxley-style address that the fisheries are inexhaustible (1883; * check the wording); Garstang's
  "impoverishment of the sea" (1900*) as the Fishing reveal.
- **Levers:** EEZ (rebounds: the home fleet), quota set from catch data (over-allocated) or from the survey (works),
  moratorium.
- **Opens:** about hour 8.5. Its Settlement needs the Survey seated.

### The Great Acceleration (Act II: the government; Pryce runs the Industries)

Every Act II Industry is played from the Other Chair (`paradigm-shifts.md` §1): Pryce buys and founds; the player
inspects, legislates, amends loopholes, compensates, and wins elections. Each Industry contributes loophole ladders
and pledges as well as its mechanic. All are scored on the consumption ledger (home plus Abroad).

**5. Plenty** (1909–2000) · calories · groundwater (stock) and land (bounded) · nitrogen. *M5.*

- **Mechanic:** land and return flows, with **two water gauges**.
  - Yield cards spare land when food demand is saturated (Borlaug) and clear more when it is elastic (Jevons); each
    application shows which regime it is in.
  - **Water applied** (falls with drip and pivots) and **water consumed** (rises) are separate gauges. Efficiency
    cuts the return flow that recharged the aquifer (Grafton et al., *Science*, 2018; Pfeiffer & Lin, 2014, Kansas).
    Only a cap on consumption, not application, holds the aquifer.
- **Teaches:** an accounting illusion: the gauge you are paid to move is the wrong one. As government the player
  meets it as the classic: a subsidy for efficient irrigation that raises water use.
- **Rebound:** direct, plus **hidden flow** (new name).
- **Art:** seed catalogue and agricultural print, 1910s–50s: flat stone-litho colour slightly out of register, crop
  rows as decorative bands, a root-and-aquifer cut-away. The Dust Bowl as the paper yellowing.
- **Applications:** Bread grain · Fertilised fields · Meat & dairy · Irrigated orchards · Air-freighted produce ·
  Biofuels.
- **Chain:** Haber–Bosch (first plant 1913) → Tractors (Fordson, 1917) → Hybrid maize (1930s) → Centre pivot (Zybach,
  1952*) → Dwarf wheat (Borlaug, 1960s) → Drip (Netafim, 1965) → Precision agriculture (1990s).
- **Rebounding lever:** drip irrigation subsidy. **Loophole ladder:** "efficient" crops reclassified; pumping moved
  to unlicensed wells; produce imported from Abroad.
- **Opens:** at Take office (about hour 16.5).

**6. Motion** (1950–2000) · vehicle-miles · oil (shared with Abroad) · exhaust. *Built (M1); reworked M6.*

- **Mechanic:** a travel-time budget and sprawl. Speed buys distance, not time (Marchetti: about an hour a day); new
  road fills (Duranton & Turner, 2011); sprawl is a slowly decaying stock that sets floor demand (lock-in made
  visible); oil shocks (1973, 1979) are events.
- **Teaches:** induced demand and lock-in; removing capacity can improve service (Braess), mirroring Code's deletion.
- **Rebound:** induced demand, lock-in.
- **Art:** `chrome`, mid-century travel poster and airbrushed motoring advert; contrails, then haze.
- **Applications:** Delivery vans · Commuting · Suburbs · Out-of-town shopping · The school run · Motorway haulage
  (package holidays move to Freight & Flight).
- **Chain:** Radial tyres (Michelin, 1946) → Fuel injection → Lean burn → Wind-tunnel bodywork → Hybrid drive.
- **Rebounding levers:** fuel economy standard (CAFE, 1975) with its **loophole ladder**: light trucks → footprint
  rule → credits from Abroad; robust only paired with a duty (Knittel, 2011). Road building to relieve congestion
  (SACTRA, 1994).
- **Opens:** about hour 20 (re-gated from v1's Act I; owner decision D3).

**7. Comfort** (1920–2000) · household services · current, drawn from Light & Current · ozone, then heat. *M6.*

- **Mechanic:** ratcheting standards and the time rebound. Saturation rises with use and never falls back (Shove,
  2003); appliances save time that is re-spent (Cowan, 1983).
- **Teaches:** the standards ratchet; and that some restraint works cleanly. The Montreal Protocol (1987) is the
  game's proof that a ban with a substitute, few actors and compensation can win, and Kigali (2016) that the
  substitute needed its own fix.
- **Rebound:** time rebound, norm lock-in.
- **Art:** appliance catalogue, 1950s–60s: a cut-away house in pastel airbrush with callout numbers; the ozone hole
  as a cold band of sky. Shares `chrome`'s airbrush engine.
- **Applications:** Refrigerators · Washing machines · Central heating · Frozen food · Air conditioning · The second
  fridge.
- **Chain:** Hermetic compressor → Freon (c. 1930) → Loft insulation → Thermostats → Energy labels (EU, 1990s) →
  Inverter compressors.
- **Rebounding lever:** scrappage rebate (the old fridge goes to the garage). **The clean win:** Montreal, as an
  Article.
- **Opens:** about hour 28.

**8. Freight & Flight** (1956–2010) · tonne-km and passenger-km · jet and bunker fuel · carbon. *M6.*

- **Mechanic:** two ledgers at full strength. Cheap freight lets Pryce move production Abroad; the territorial gauge
  falls while the consumption gauge rises. Border adjustment (an Article) is the counter.
- **Teaches:** spatial rebound: your gauge can fall while the world's rises.
- **Rebound:** leakage.
- **Art:** airline route map and nautical chart, 1960s–70s: the only top-down scene; routes multiply as arcs,
  containers move as glyphs.
- **Applications:** Container trade · Package holidays (1950*) · Air freight · Fast fashion · Cruise ships · Long-haul
  weekends.
- **Chain:** The standard container (McLean, *Ideal X*, 1956) → Jet airliner (707, 1958) → High-bypass turbofan (747,
  1970) → Very large container ships → Composite airframes (787, 2011) → Slow steaming (a fork).
- **Rebounding lever:** frequent flyer levy with a free first flight. **Revival:** factory trawlers reopen Fishing's
  settled row in Act II (the Grand Banks, 1950s–1992).
- **Opens:** about hour 36.

### The Attention Age (Act III: the specifier; agents run everything)

From Hand over, every earlier Industry is run by an agent whose brief the player writes (`paradigm-shifts.md` §2);
the scenes keep their own styles and gain a neon agent overlay.

**9. Compute** (2000–2025) · operations · power, water and chips · carbon. *Built (M1); extended M7.*

- **Mechanic:** autopilot and free at the point of use. η rises on its own (Koomey); ad-funded applications show a
  price of zero and grow to saturation; Wirth's law drags η in Code.
- **Teaches:** the frontier at its limit: when the price seen is zero, efficiency cannot touch demand.
- **Rebound:** frontier.
- **Art:** `terminal`, vector display and early CAD.
- **Applications:** Spreadsheets · The web · Streaming · Cloud storage · Model training · Inference everywhere (the
  cost of fixed AI capability fell more than 280-fold, Nov 2022–Oct 2024; Stanford AI Index, 2025).
- **Revivals:** LED into Light; smart thermostats into Comfort.
- **Rebounding lever:** efficient data-centre certification (PUE falls; the build-out grows).
- **Opens:** at Hand over (about hour 52).

**10. Proof-of-Work** (2009–) · blocks settled · power · carbon. *M7.*

- **Mechanic:** **difficulty**. Total power is set by reward × coin price ÷ power price; efficiency cards change the
  player's share against rival miners and nothing else. The efficiency gauge climbs ×1,000 while consumption does not
  move. Halvings are fixed beats. The levers leak: a ban moves the hash rate Abroad; paying miners to stop pays them
  to exist (Texas, August 2023). The one lever that works is **Change the mechanism** (the Merge, 15 Sept 2022:
  electricity down more than 99.9%): one-off, irreversible, and it ends the Industry's income.
- **Teaches:** that some systems have backfire built into their rules; change the rules, not the machines. No brief
  about efficiency can fix it, which is the bridge to shift 2's lesson.
- **Rebound:** **protocol** (new name: exactly 100%, by design).
- **Art:** `terminal`, red-shifted: amber-red on black, warehouses of rigs as hatched blocks, a hash-rate
  oscilloscope for a sky. A deliberately ugly sibling of Compute.
- **Applications:** Payments (the pizza, 22 May 2010) · Speculation · Tokens · Stranded-gas mining · Grid demand
  response.
- **Chain:** CPU → GPU → FPGA → first ASICs (2013) → successive ASIC generations (about 10,000,000 J/TH to about
  10 J/TH).
- **Opens:** about hour 58.

**11. Code** (2025–) · working features · human attention (flow) · the code stock. *Built (M1); extended M7.*

- **Mechanic:** as v1 (code stock, upkeep, deletion, review gates) plus Lehman's laws; and Code is where agents come
  from: its service is agent capacity and its resource is the player's Attention. The **review queue** lives here.
- **Teaches:** the maintenance rebound; and that cheaper writing moves the bottleneck to reading.
- **Rebound:** maintenance (v1's own), measurement (with shift 2).
- **Art:** `cyberpunk`, night megacity in rain.
- **Applications:** Internal tools · Throwaway personal apps · Legacy rewrites · Chatbots on everything · Agents writing
  for agents · Briefs (agents for the earlier Industries).
- **Rebounding lever:** agent reviewers (review gets cheaper, so more is shipped).
- **Opens:** about hour 64.

### The Transition (Act IV: the unbuilder)

**12. Transition** (2030–2100) · clean energy · critical minerals (stock) · land and minerals. *M8.*

- **Mechanic:** displacement and **Unbuilding** (`paradigm-shifts.md` §4). Clean supply adds to fossil supply unless
  the old is retired (York, 2012: under a quarter of a unit displaced per unit); the player retires assets, retrains
  people, seals reserves and rewilds sites; Ground is the score. Minerals bring back Steam's pumping problem.
- **Teaches:** that progress can be subtraction; additionality; and that clean energy rebounds too.
- **Rebound:** additionality and replacement (new names); the green paradox on scheduled retirements.
- **Art:** risograph zine, solarpunk without naivety: mines visible in the cut-away, an extraction horizon, Steady
  State as maintenance.
- **Applications:** Solar farms · Electric cars · Heat pumps · Grid batteries · Green hydrogen · Desalination.
- **Opens:** about hour 76.

### Why twelve, and these twelve

The coordinator proposed adding Fishing and Proof-of-Work to the ten. I agree, with two placements that differ from
the obvious:

- **Fishing in the Coal Age, not with Freight.** Steam trawling (1880s) is a Coal Age story, Act I needed a fourth
  Industry to carry hours 8–16, and its foreign fleets introduce a rival before the player meets Pryce. The 1950s–1992
  collapse arrives as a revival when Freight & Flight opens.
- **Proof-of-Work beside Compute.** It teaches what shift 2 then generalises: you cannot specify your way out of a
  mechanism; you change it.
- **Irrigation is a mechanic inside Plenty** (two gauges), not an Industry: it shares Plenty's land and calories, and
  as its own Industry it would repeat Plenty's service.
- **Considered and left out:** Cooling as its own Industry (folded into Comfort's heat pressure), Whaling (close to
  Fishing; becomes a Fishing History), the Inbox (a strong Code dispatch arc), Paper (a hidden card in Compute that
  claims −80% paper), Safety and medicine (contested evidence; Archive notes).

---

## Progression map and target hours

"Active" is attention-on play; "wall" is calendar time for an engaged player who idles and checks in. Hours from the
M1 balancer are marked (m); everything later is a target for the balancer to hit. The audit's rules: something new at
least every 2 active hours to hour 20; the second layer at 14–20 h; a real ending at 15–20 h.

| Phase | Active h (cum.) | Wall h (cum.) | New this phase | What the player is deciding |
|---|---|---|---|---|
| Run 1, Steam | 0–0.7 | 0–0.8 | The rule; the reveal (8.6 min m); the first lever (13–17 min m); first decade (~20 min, M2); exhaustion at ~41 min (m) | Which card next; found Railways or not; when to draw the line |
| Run 2 | 0.7–1.3 | –1.6 | **The Market**; the first **Charter**; Light & Current opens (~50 min m); seats | Turn the Market off where? Restraint attempt or boom? |
| Runs 3–4 | 1.3–2.5 | –3.5 | Decade dividend choices; Light's load mechanic; the **Commons**; restraint out-earns burning (4.6× m) | Which dividend; Commons against applications |
| Iron & Steel | 2.5–3.5 | –5 | Inputs; the shared coal stock | Is cheap steel worth Steam's budget? |
| First Steady State | 3–4 | –6 | **Clear skies** and the sink line; **Settlement** of Steam; +1 seat | Gentle, Firm or Severe line; which Industry to settle first |
| Hours 4–6 | 4–6 | –9 | **The Civil Service** (a closing automation); Know-how respec; offline to 12 h; the cast's first arcs | Which levers to hand to the Civil Service |
| Hours 6–8 | 6–8 | –13 | **The Proprietor's Day** (shift 3's reveal, ~7 h); gas against electric | Closing or opening automations |
| Fishing | 8–10 | –17 | Renewable stock, the lying gauge, foreign fleets, the scar; the first five **Histories** | How hard to fish before the Survey is seated |
| Hours 10–12 | 10–12 | –21 | Treasury rules; revivals (steel boilers into Steam); Light and Iron settled | Settle order; defending against spill |
| Hours 12–14 | 12–14 | –25 | The next five Histories; Fishing settled (needs the Survey); the Archive | Loadout per History |
| Act I ending | 14–16 | –29 | All four at Steady State in one run → **credits**; "The ledger continues" | Whether to Take office now |
| Take office | 16–17 | –31 | **The Other Chair**: Pryce's prospectus, elections, inspection; Plenty opens | First manifesto |
| Plenty | 17–20 | –37 | Two water gauges; the first loopholes; Opposition | Subsidise drip, or cap consumption? |
| Motion | 20–28 | –55 | Travel-time, sprawl; the CAFE ladder; **Abroad** and offshoring; second Treaty (~24 h); first Articles | Standard plus duty; Border adjustment or Ratchet clause |
| Comfort | 28–36 | –75 | Ratchets; Montreal, the clean win; third Treaty | Which standards to lock in; compensation |
| Freight & Flight | 36–46 | –100 | Two ledgers at full; Fishing's revival; fourth Treaty | Your ledger or the world's |
| Act II ending | 46–52 | –115 | Consumption ledger within budget 50 years → **credits** | Which Article becomes Standing |
| Hand over: Compute | 52–58 | –135 | **You Write the Objectives**: agents for every earlier Industry; the overlay; Attention | First briefs; which agents to review |
| Proof-of-Work | 58–64 | –155 | Difficulty; Change the mechanism | When to change the protocol |
| Code | 64–76 | –195 | The review queue at full; agents for agents; second Long Now; real attention spent on review | Triage; which metrics to make honest (Measures) |
| Transition | 76–98 | –270 | **Unbuilding**: retire, retrain, seal, rewild; the riso reprint | Cover service first, or retire first? Announce or act? |
| True ending | ~95–100 | ~280 | The pit becomes a lake; the last return; **credits**; "You may stop" | — |
| Post-game | 100–200+ | 280–700+ | The History ladder, the weekly Almanac, records, the Archive plate, the Steady Century | Optimise wellbeing per ton under stacked rules |

**The cadence check to hour 20.** New things land at 0.7, 1.3, 2.5, 3, 4, 6, 7, 8.5, 10, 12, 14, 16, 17 and 20 hours:
no gap over 2 h. From 20 to 60 h a new Industry opens about every 8 h, a Treaty every 6–10 h changes Pryce's playbook
and the player's Articles, and inside a Ministry an election or a decade lands every 1.7 minutes. Act I is never
replayed. That is this structure's answer to the audit's third risk.

**Where the total lands, honestly.** About 100 active hours to the true ending (range 90–115, depending most on how
long the player stays in Act II), about 280 wall hours. That is below the 110–120 the first pass promised: dropping
the Act I replay and the six-region World removed about 15 hours of the weakest play, and Fishing and Proof-of-Work
add about 8. The game is still very long; the post-game adds 100 hours or more for those who want it. Padding the
main path to 120 would put filler back where the audit warned against it.

### Snapshots

- **Hour 1.** Run 2 has just begun. The Market buys the cards; the player is choosing between two Charters
  ("The Northern Coalfield": deep seams, cheap engines; "The Cotton Towns": mills from the first minute) and has
  already earned a decade in run 1.
- **Hour 5.** Steam settled, Iron open; a Firm line on Iron; choosing between a seat and Commons yield at the decade.
- **Hour 10.** Fishing's catch-per-trip gauge is green, the Survey is not yet seated, and the foreign fleets are
  growing. The player knows what a green gauge means now.
- **Hour 24.** In office. Light trucks on the motorway, a ship leaving for Abroad, an election in two minutes.
- **Hour 64.** Six agents and seven Attention; Steam's Decades agent has drawn its fourth line this decade.
- **Hour 92.** Retiring out-of-town shopping; the motorway tab has just reprinted in riso.

---

## Idle, automation and the phone

- **Session shape.** By hour 5 a phone session is about 2 minutes: read the "While you were away" ledger (what grew,
  what lapsed, what was held), answer one or two dispatches, choose a dividend, leave.
- **Offline.** Base cap 8 hours, 12 via the Civil Service, 24 via an Article. `fastForward` stays coarse (5 s steps),
  runs standing orders, and holds one step before a crisis or collapse; the return note says why.
- **Automation ladder.** Each step names its rebound and, after the hour-7 reveal, says whether it is closing or
  opening (shift 3):

  | When | Automation | Kind |
  |---|---|---|
  | Run 2 | The Market (efficiency and founding buy themselves) | opening |
  | Hour 5 | The Civil Service (holds a line with chosen levers) | closing |
  | Hour 10 | Treasury rules (Commons spending) | closing |
  | Act I ending | The Coal Age capstone (settled for good) | closing |
  | Act II | Standing inspection (an Article) | closing |
  | Act III | Agents (everything, under a brief) | opening, until the briefs are good |

- **Quality of life** (built in M1's UI lane): affordable signals, notation, text size, hotkeys, hold-to-repeat, fork
  confirmation, save safety, colour-independent signals. Later: banked time, PWA, run history.
- **Performance budget.** At most four Industries fully simulated at 10 Hz; settled Industries are constants; the
  rival and agents decide once per model year.

---

## Content inventory: have against need

"Have" is the M1 content as of 19 Nov 2026 (`src/content.ts`).

| Content | Have | Need (long game) | Authoring |
|---|---|---|---|
| Ages | 3 | 4 | Hand |
| Industries | 5 | 12 | Hand, to the Industry kit |
| Applications | 26 | ~72 (6 each) | Hand |
| Upgrades | 67, incl. 12 fork pairs and 5 repeatable growth cards | ~240 (≈ 20 each) | Hand; numbers from cost curves |
| Levers | 25, all repeatable | ~70 (≥ 1 rebounding per Industry) | Hand text, generated level tables |
| Know-how nodes | 18 (Steam and general trees) | ~45 (industrial trees, Statecraft) | Hand |
| Institutions | 16 | ~40 | Hand |
| Commons projects | 0 | 30 | Hand |
| Charters | 0 | 12 (Act I) | Hand |
| Histories | 0 | 30, plus the weekly Almanac | Hand modifiers |
| Dispatches | 0 | ~200 (incl. 40 for Pryce) | Hand: the long pole |
| Cast | 0 | 8, with descendants (Pryce, Whitlow, the Ashworths, Mrs Fenwick, the correspondent, a minister, an agent voice, Miss Whitlow) | Hand |
| Headlines | 207 | ~700 | Hand, plus templates for ambient news |
| Achievements | 26 | ~160 (incl. 8 "Enough") | Mixed |
| Pledges | 0 | 30 | Hand |
| Loopholes | 0 | ~25 (2–3 per Act II lever) | Hand |
| Articles | 0 | 12 | Hand |
| Pryce playbooks | 0 | 6 | Hand |
| Metrics / constraints / gaming moves | 0 | 8 / 5 / 30 | Hand |
| Incident vignettes | 0 | 60 | Hand |
| Assets (Unbuilding) | 0 | ~50 | Hand, with places and people |
| Statistics Office returns | 0 | 12 templates | Templates with numbers |
| Endings | 3 (Steady State, Backfire, Degrowth by accident) | 6 (Act I, Act II, the true ending, Degrowth by accident, Business as usual, Backfire) | Hand |
| Archive notes | 0 | ~400 | Hand, sourced |
| Art styles | 5 built (`ledger`, `gaslight`, `chrome`, `terminal`, `cyberpunk`) | 11, plus the agent overlay, the Ministry window and afterlife sprites | Scene lane |

Roughly 160,000 words of game text by the end. It is a book and is scheduled as one (the roadmap's text lane).

### Keeping volume from turning into filler

- **The Industry kit.** Every Industry ships: 6 applications, 8 efficiency cards, 3 capital cards, 4 forks, 2
  prospects or research, 5 levers (≥ 1 rebounding), 3 Commons, 18 dispatches, 60 headlines, achievement templates,
  Archive notes for all of it, **exactly one new mechanic with one new widget**, and **a layout in its Age's art style
  with at least one prop that shows the mechanic**. Act II Industries add 2 loophole ladders and 6 pledges.
- **Numbers are generated, words are not.** Cost curves, lever tables and saturation ladders come from helpers in
  content; each Industry is tuned by about eight knobs.
- **Templates only for commentary on state** (ambient headlines, achievement families, returns).
- **A content lint test** checks unique ids, resolving `Cond`s, a `catch` on every lever, a rebounding lever and one
  mechanic per Industry, headline length, banned Americanisms and banned words ("era", "sector" in player text),
  costs on every dispatch arm, and a source on every Archive note.

---

## The first hour, as now built

Measured with `bun run tools/balance.ts efficiency 1` and `budget 4` on the M1 content (19 Nov 2026), clicking at
5 taps a second while a tap is worth it. Targets are in `src/balance.test.ts`.

| Time | Beat (efficiency player, run 1) | Target |
|---|---|---|
| 0:18 | **Better boilers** (−33%). Coal use rises 232% within a minute, as Cotton mills come within reach and direct rebound passes 100% at once | first purchase 15–40 s; R +3% within 60 s |
| 0:36–4:24 | **Another engine works**, seven levels: the repeatable growth card that carries the cadence; Screw-cutting lathe at 2:24 | ≥ 12 purchases in 10 min; no gap over 90 s |
| 1:00 | **Cotton mills** founded (£250) | 1–2 min |
| 5:18 | **Separate condenser** (−40%). Coal use +129% within a minute, +150% within two. Winding engines come within reach | 4–6 min; R ×2 within 120 s |
| 6:18 | Pirate engine (the fork against the Boulton & Watt licence) | |
| 7:48 | Sink a deeper shaft | |
| 8:36 | **The Coal Question.** The reveal: cards gain "This decade" and "Brings within reach"; the meter shows direct rebound; Mandate appears with the first lever | 8–12 min |
| 12:24 | Double-acting engine: "−29% · this decade +10% · brings Railways within reach" | |
| 13:06 | **Railways** founded | |
| 13–17 | The budget player's first lever; the budget line is drawn | 10–14 min (budget player) |
| 19:12 | First crisis, The Black Fog: population −8%, Mandate +150 | 14–20 min |
| 30:18 | Compound engine; Steamships within reach | |
| 32:30 | Second crisis | |
| 40:48 | **Exhaustion.** Efficiency ×14.9, peak coal use ×45.6. The Reckoning: Hindsight 72 (1.76 a minute) | 30–45 min |
| run 2, 10–12 | Light & Current opens | ≤ 1.5 h |

**What the restraint player sees** (`budget`): runs 1 and 2 earn no decade (wellbeing peaks at 21.5 and 24.9,
target 34); run 3 earns its first decade at 24 minutes and Steady State at 40 minutes (cumulative 1.9 h); Hindsight
per minute by run 1.60, 2.05, 8.30, 12.05. Restraint out-earns backfire 4.6× by run 3 (target ≥ 1.5×); backfire
out-earns restraint about 1.1× in run 1 (target 1.2×).

**What M2 changes in this hour.** The first decade moves into run 1 at about 18–22 minutes (decades judged against
the line's own day); Steady State moves to 3–4 h (clear skies). Run 2 opens with the Market and a Charter, and the
player has already seen the restraint loop pay once.
