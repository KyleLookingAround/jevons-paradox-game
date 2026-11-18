# Rebound v1 — critique

Reviewer: design pass, 18 Nov 2026. Read: `CLAUDE.md`, `DESIGN.md`, `src/types.ts`, `src/content.ts`, `briefs/*`, and `src/model.ts`.

**Method.** I did not judge v1 on paper alone. The model already runs (44 of 46 tests pass), so I played the real `content`
headlessly with three scripted strategies, at dt = 1 s, for up to 3 game-hours a run. The scripts are in `design/scratch/`
(`sim.ts`, `proj.ts`):

- **eff**: click for the first 2 minutes, buy the cheapest affordable upgrade, found every application, never touch a
  lever, spend Hindsight on Know-how.
- **lev**: the same, plus raise every visible lever whenever Mandate allows. Spends Hindsight on Institutions first.
- **cap**: the same as eff, plus raise only the cap, substitution and circularity levers.

These are greedy bots, not good players. They are enough to show the shape of the incentives. Every number quoted below
comes from those runs.

---

## What v1 gets right (keep all of it)

1. **The core rule is honest and produces Jevons on its own.** Nothing is scripted. In the first eff run, Steam efficiency
   rose ×18 and peak coal use rose ×15.7, which is the same order as Jevons' own Scottish iron example. Logistic
   applications, depletion pricing and a frontier of new uses together make a believable machine for backfire.
2. **The promise against the projection is the right central joke.** A big "−40% coal" with a small red "+24% total" is
   the whole game in one card. (Below I show that it does not currently land, but the idea is right.)
3. **The pure, deterministic core pays for itself already.** Projections, offline catch-up and the balancer all run on one
   function. Every proposal in this pass relies on that.
4. **Era 5 (Code) is genuinely new.** Pressure is a stock fed by output that never decays, its upkeep eats the very
   resource you produce with, and Deletion is the only lever that lowers Pressure directly. I have not seen this in
   another incremental, and it is the best design in v1.
5. **The writing is the personality and it is good.** Examples: "Coal hauling coal to the people who burn coal", "The
   user is the point of use", "Every wheel already invented, free, and maintained by one person in Nebraska". The level
   of historical care (Maudslay, Langmuir 1913, the Limited Liability Act 1855) is right.
6. **The four named rebounds (direct, indirect, economy-wide, frontier) each map onto a mechanic.** That is the correct
   discipline, and this pass extends it rather than replacing it.
7. **Institutions that start a lever at level 1 are the right shape for "what actually works".** Restraint is something
   you build once, not something you click every run. The shape is right; the economics around it are wrong (see 9).

---

## Failures, ranked by severity

### Severity 1: the game teaches the opposite of its thesis

**1. Restraint is punished in the prestige currency, by a factor of about 15.**

| Strategy | Run length | End | Hindsight | Hindsight per minute | Decoupled years |
|---|---|---|---|---|---|
| eff (pure efficiency) | 50 min | smog collapse | 102 | 2.0 | 0 |
| cap (cap, substitution, circularity) | 103 min | smog collapse after the cap lapsed | 40 | 0.39 | 0 |
| lev (every lever) | 180 min (time limit) | still running | 25 | 0.14 | 0 |

The cause is the formula: `hindsight = 1 × peakWellbeing + 2 × decoupledYears + …`. Peak wellbeing rewards the boom. No
strategy ever earns a single decoupled year (item 2), so in practice the formula is "how big was your boom". The design
doc says Hindsight comes "NOT from peak output", but peak wellbeing is peak output under a logarithm.

A veteran will notice by the third run that the fastest way through the game is to backfire as hard as possible and
collapse early. Know-how then makes the collapse come sooner and higher: run 4 reached wellbeing 55 and earned 106
Hindsight in 33 minutes.

**2. Steady State, the true ending, cannot be reached.**

- Decoupling requires `trendR < −0.001` per year. A cap that works perfectly holds R exactly flat. In the cap run, R sat
  at 206/s with `trendR = 0.0000` from minute 20 to minute 50, wellbeing was 29–34 (above the 28 target), and
  `steadyYears` stayed at 0. The lever built for this job scores zero.
- The economy-wide rebound then destroys the position. Population grows with wellbeing: N went from 1 to 18 over three
  hours with no ceiling. At a fixed R, per-capita service falls, and wellbeing slid from 34 to 18 while the cap held.
  Holding "R falling and wellbeing ≥ target" for 50 in-game years would need ever-tighter levers. Every lever has
  exactly 3 levels, and caps are fractions of "R when first enacted", so it cannot be done.
- The "learning what actually works" half of the game therefore has no mechanical payoff. The ending exists only in text.

**3. The central joke does not land: after the reveal, the cards mostly say efficiency works.**

`projectedChange` at the moment of purchase (eff run, after The Coal Question):

| Card | Promise | Projected total |
|---|---|---|
| Double-acting engine | −29% | **+5%** |
| High-pressure steam | −30% | **−2%** |
| Compound engine | −38% | **−2%** |
| Triple expansion | −33% | **−0%** |
| Steam turbine | −33% | **−6%** |

Meanwhile realised coal use was ×13. There are two causes. First, the projection is a 120-second look-ahead with nothing
else bought, so it leaves out the frontier rebound: applications that the cheaper service brings within reach and that
the player then founds. Second, by mid-Steam the founded applications sit close to unit elasticity. The red line, the
game's signature, reads "−2%". A thoughtful player concludes that the cards were right and the professor was wrong.

**4. The rebound meter is meaningless from minute two.**

Its baseline (`baseR`) is snapshotted while only Mine pumping exists. Founding Mills then counts as "rebound": the meter
read **552% at 5 minutes and 1,428% at 15 minutes**. It says "Backfire" before the player has bought a single efficiency
card after the boilers, and it carries no information for the rest of the run. It mixes frontier growth (new uses) with
direct rebound (more of the same use), which is exactly the distinction the game should be teaching.

**5. Era unlocks require cheap service, so the correct play locks you out of the content.**

`unlock.prevServicePriceBelow` gates every era on the previous era's service price. Fuel duty holds that price up by
design. In the lev runs, Steam's service price sat at 0.45 against the 0.25 Light needs, so **Light never opened.**
Anyone who follows the game's lesson never sees four fifths of it.

### Severity 2: it will fail as a game

**6. Restraint has nothing to do after half an hour.** By minute 30 the lev bot had bought all 15 lever levels in Steam.
For the next 150 minutes, Mandate piled up to 260,000 and capital to £1.2M with nothing to spend either on. There is no
reward loop for holding steady, no sink, no milestone and no next goal. This is the handover's "restraint has no reward
loop" stated in numbers.

**7. The oldest era ends the run.** Earlier eras keep running and any one of them can end the run. Light spills demand
into Steam, so opening Light makes Steam's smog collapse arrive sooner. Eff run lengths by run: 50, 30, 26 and 33 minutes.
In run 5 Motion opened at minute 32 and the run collapsed minutes later, from Steam smog. Each new era shortens the time
you get to spend in it. That works once, as a lesson. As the structure of a long game it means eras 3–5 are seen for
minutes at a time.

**8. There are no decisions inside a run.** All 42 upgrades are linear chains. "Buy the cheapest affordable" is close to
optimal, founding every application is always right, and the lever choice is "all of them". The game has 0 exclusive
choices, 0 events with options and 0 trade-offs between upgrades. An incremental can survive thin decisions early. It
cannot survive them for tens of hours.

**9. Know-how against Institutions is solved by run three.**

- Institutions are ten one-offs worth 1,535 Hindsight in total, in mostly linear `requires` chains. The Statistics Office
  (25 Hindsight, reveals from minute one) is the obvious first buy, and there is never a reason not to own all ten
  eventually. Owning one costs nothing to keep.
- Know-how is 64,285 Hindsight of pure multipliers (+15% η per level). It makes runs shorter, which raises Hindsight per
  minute (item 1), so it is not a temptation, just the correct choice.
- With no slots, no upkeep and no exclusivity, there are no build choices. Once both are bought down, the meta layer
  is over.

**10. The eras are re-skins.** Every era has 4 logistic applications, a 4–7-card chain of `etaMul`, 1–2 capital cards, one
repeatable prospect, and 3–5 levers drawn from the same six kinds with three levels and template labels (duty appears in
4 eras, sufficiency in 5, substitution in 4). Only four fields make an era different:

| Era | Its twist | Does it change what the player does? |
|---|---|---|
| Steam | `reserveGainPerService` (pumping deepens the reserve) | Barely visible; no decision |
| Light | `spill` into Steam | No. It is a coefficient; nothing in Light is played differently |
| Motion | `lockIn` floors on two applications | A little: levers bite less. Invisible until you try to cut |
| Compute | `autoEtaRate` | Yes, but passively; the player watches |
| Code | flow resource, service-sourced Pressure, upkeep | Yes, genuinely |

The handover's fear ("Eras 2–4 risk being re-skins of Steam") is correct, and it applies to Light most of all.

**11. The clock is wrong.** Year = 1780 + 0.05 × seconds. Light opened in "1857" (run 3), thirteen years before its own
1870 start. Motion opened in "1876". A 3-hour Steam run ends in "2320". Headlines and the period voice depend on the year
being plausible. Steady State is also a fixed 16.7 real minutes whatever the era.

**12. The broadsheet is era-blind and thin.** There are 59 headlines over 14 keys, about 4 per event. The crisis lines are
Victorian ("Fog so thick the cattle choke at market") and will fire during Compute's heat dome. A player sees every
variant within the first hour. There is no recurring cast, no choices, and no ambient news driven by state.

### Severity 3: it will fail as a long game

**13. The game holds about 4–8 hours of content.** There is one prestige layer, ten Institutions (about 15 runs), five eras
and no challenges. The owner wants tens of hours active and hundreds with idle, which is 10–30 times this.

**14. There is no automation or idle path.** The idle bot buys nothing. There are no autobuyers, and offline progress is
capped at 4 hours. On a phone, a long game needs automation that unlocks over time. In a game about rebound, the
automation itself can carry the theme (proposal P11).

**15. The economy-wide rebound is real but invisible.** Population growth is the mechanism that breaks the cap strategy
(item 2), yet the UI has no gauge for it and no lever touches it. The player will think the cap "stopped working".

**16. Mandate is funded by the boom.** Mandate comes from wellbeing above a floor, plus a spike at each crisis. The eff bot
ended with 1,565 unspent Mandate without ever using a lever. Growth funds restraint and crises are a windfall. The
politics are plausible, but there is no tension: Mandate is never scarce when it matters.

**17. There are no external events.** Crises are the only events, and they are self-inflicted. Real rebound history is
full of shocks (1973, 1979), discoveries and booms that the player should have to react to.

**18. There are five achievements.** Long-form incrementals rely on a deep achievement and record layer to steer
experimentation.

### Severity 4: smaller points to fix in passing

- **Frontier founding is paid for by the player.** That is thematically right: you are the industrialist, and the rebound
  is your choice. But it is why projections cannot show it (item 3). Keep paying, and make the card say what it brings
  within reach.
- **The duty lever's revenue disappears.** Ten per cent becomes Mandate and the rest goes nowhere. "Revenue recycling"
  (the fee-and-dividend argument) is a decision the player should get to make.
- **Code needs compute price below 0.015 *and* four Reckonings.** Nobody greedy reaches it in a reasonable time. It is the
  best era and it is the hardest to see.
- **The DESIGN.md target ("coal use rises ~1.5–2× over the first four efficiency upgrades") does not match the content.**
  The content gives ×13, almost all of it frontier growth. One of the two needs to change. I recommend redrawing the
  target from balancer output (CLAUDE.md step 7) once the instruments in proposal P1 exist.

---

## Summary

v1 is a sound engine with honest economics and very good writing, wrapped around a progression that rewards the
behaviour the game warns against. Five fixes come before any lengthening:

1. Instruments: a rebound meter measured against a counterfactual, and projections that include the frontier.
2. A reachable Steady State: a budget line instead of a falling trend, plus a demographic transition.
3. Era unlocks that are neutral about restraint.
4. A Hindsight formula that rewards decoupling.
5. A reward loop for restraint (Settlement and the Commons).

Without these, more content multiplies a broken lesson. The proposals are in `design/proposals.md`.
