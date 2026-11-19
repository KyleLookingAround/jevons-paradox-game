# Rebound — paradigm shifts

Second design pass, 19 Nov 2026. The owner asked: "are there paradigm shifts or layers we could add to the game?" Four
were approved. This document designs them in full. The structure they sit in is `design/long-game.md`; the build order
is `design/roadmap.md`.

Each shift changes **what the player is**, not how fast the numbers go:

| Shift | Where | The player becomes | The lesson moves from… | …to |
|---|---|---|---|---|
| 1. The Other Chair | Act II, the Great Acceleration (prestige layer 2, the Treaty) | The government | "efficiency backfires" | "try stopping someone who is paid to do it" |
| 2. You Write the Objectives | Act III, the Attention Age (prestige layer 3, the Long Now) | The person who briefs the machines | "restraint has to be built" | "you get exactly what you measure" |
| 3. The Game Rebounds on You | Threaded through the whole game; published at about hour 7 | Themselves | "the world's savings are re-spent" | "so are yours" |
| 4. Unbuilding | Act IV, the Transition (the last Age of the Long Now) | The one who takes it down | "hold the line" | "progress is what you remove while wellbeing holds" |

Rules that every shift obeys, from the pillars in `long-game.md`:

- **It names its rebound.** Each introduces at least one named form: evasion, measurement (Goodhart), attention, and
  additionality and replacement.
- **It has something to show.** Every new system has a picture in the living scene, not only a number.
- **The core stays pure.** No wall-clock, no randomness, no DOM. Shift 3 is designed around that rule.
- **It never lectures.** The broadsheet reports and the gauges argue.

Sizes: S ≤ 1 agent-day, M 2–4, L a week or more.

---

## 1. The Other Chair

### The idea

At the end of Act I the player has learnt that efficiency backfires and that restraint, built patiently, works. Then
the game takes the Works away. Pryce Consolidated buys the Industries, and the player is asked to form a government.
For the whole of Act II the Industries are run by a rival who plays exactly as the player played on their first
morning: every efficiency card, every application, no lever. The player has only the instruments of state: levers,
Mandate, Institutions and a few new ones (inspection, amendment, the manifesto, the Treasury). The lesson shifts from
"efficiency backfires" to "try stopping someone who is being paid to do it".

This **is** the second prestige layer. The Treaty keeps its place and its currency (Precedent). What changes is the
chair. The six-region World of the first pass is dropped; leakage survives as one unregulated neighbour, **Abroad**.

**Rebound named: evasion** (new form). The regulated party spends the saving on getting round the rule. It includes,
from `research/restraint.md` §13, boundary migration (CAFE and light trucks), leakage (imports, offshoring), capture
and concentration (Iceland's quotas, the whaling "scientific" exemption), over-allocation (EU ETS Phase 1), the green
paradox (Sinn), and decay and repeal (55 mph; the fuel duty escalator; BC 2025). Direct and frontier rebound still run
underneath, because the rival's efficiency cards still make the service cheaper.

### The trigger, and how it is dramatised

**Trigger.** The Act I ending: every Coal Age Industry (Steam, Iron & Steel, Light & Current, Fishing) at Steady
State in one run. The credits card rolls ("The ledger continues"). This lands at 15–17 active hours, inside the
audit's window for both a real ending and the second layer.

**The switch, beat by beat:**

1. The credits close on the settled Coal Age scene. The final Gazette headline: "PRYCE CONSOLIDATED ACQUIRES THE
   WORKS. Proprietor 'retires to public life'."
2. A dispatch: the Prime Minister's office invites the player to form a government. One button: **Take office**.
   This is the first Treaty reset.
3. The camera pulls back. The valley is now seen through a tall Ministry window, its frame drawn in the new Age's
   airbrush style. The window becomes the persistent chrome of Act II: the scenes sit inside it.
4. The broadsheet prints **Pryce's prospectus**. It is the player's own first-run opening, read back from the save:
   "Our engineers will purchase improved boilers at the thirty-first second, found cotton mills within the minute and
   a railway before the quarter-hour." The times are the player's own, from `meta.opening`. Nothing else in the
   game is as personal; it is the joke of the act, and it says what the act is about.
5. The first Act II Industry, Plenty, opens under Pryce's flag (the rival's signage on every barn), and the first
   election is ten model years away.

**What carries over:**

| Kept | Wiped | Changes hands |
|---|---|---|
| Institutions **unlocked** (levels re-bought); achievements; the Archive; Histories; Commons unlocked; records; Precedent and Articles (from the second Treaty on) | Hindsight; Institution levels; the loadout; the industrial Know-how trees | **Industrial Know-how passes to the rival.** Pryce starts each Act II Industry with an efficiency head start of `min(cap, 1 + k × Σ levels)` (content numbers). "Pryce has read your notebooks." |

**The Coal Age capstone.** Act I is never replayed. From the first Treaty onward, every run opens with the Coal Age
Industries settled (one row each, paying their dividends). Spill from later Industries can still unsettle them, so
they are defended, not forgotten. This answers the audit's third risk (replay fatigue in hours 20–60) outright.

### The rival

**Who.** Pryce Consolidated, run by the Pryce family from the cast (`proposals.md` P9). A recurring voice in the
broadsheet: genial, reasonable, always in favour of the cheaper thing.

**How it plays.** The rival is a deterministic bot in the pure core, built from the balancer's `efficiency` strategy
plus a response table. Once per model year, per Act II Industry, it:

1. buys the cheapest affordable upgrade (forks resolved by its profile);
2. founds every application whose payback is under its threshold;
3. answers each lever with the cheapest response from the table below.

**Seeded from the player.** In every run the core records the first 40 purchase and founding actions with their run
time, in game seconds (`meta.opening`, the first-ever run kept separately as `meta.firstOpening`). This is game time
and player input, so it is deterministic and allowed in the core. At Take office it is distilled into a
`RivalProfile` of four numbers:

| Profile field | From the opening | Effect on the rival |
|---|---|---|
| `haste` | purchases per minute in the first 10 minutes | how quickly it spends |
| `founder` | share of actions that founded rather than improved | its payback threshold for new applications |
| `volume` | how often the cheap, high-volume fork arm was taken | which fork arms it picks |
| `drawn` | whether, and when, the player first drew a budget | how early it starts lobbying (a player who drew lines early taught Pryce to expect them) |

A save without an opening (imported, or v1) uses the profile of the balancer's `efficiency` run. The prospectus is
the only place the literal log is shown.

**The rival's incentive is income.** Every response is chosen by comparing costs in the rival's own capital:

| Response | When it is cheapest | What it does | What it shows on screen |
|---|---|---|---|
| **Comply** | the lever costs little | pays the duty, holds the cap | nothing; the chimney thins |
| **Evade** | a loophole is open on that lever | moves demand into an exempt application or category | the exempt thing appears: a car park of light trucks, a "scientific" whaler, a tall chimney |
| **Offshore** | Abroad is open and the price gap exceeds the transport premium | moves a share of production Abroad: home R falls, Abroad R rises (the second ledger) | ships leave the scene for the horizon; a second, smaller valley on the skyline fills with chimneys |
| **Lobby** | Confidence is low enough to be moved | spends capital to lower Confidence; below a threshold, buys a carve-out (the lever's effective level drops by one) | a Pryce hoarding goes up beside the lever's sign of restraint |
| **Litigate** | a new lever level was just raised | delays it by a few model years | the lever's sign draped in a court notice |
| **Conceal** | no inspection recently | reports `reportedR = R × (1 − concealment)`; the player's gauge lies | the chimney shows clean on the official gauge and dirty in the scene |
| **Capture** | a seated Institution's Independence is low | the Institution's effect decays while Pryce men sit on it | the Institution's building gains Pryce bunting |

The table is content (`RivalDef.responses`), so balancing changes numbers, not logic.

### The player's loop when they no longer buy upgrades

It must be at least as busy as Act I. The verbs, in order of frequency:

| Verb | Cadence | Cost | What it is |
|---|---|---|---|
| **Inspect** | every 30–60 s | an Inspector (start 2; cooldown 5 model years each) | Tap a site in the scene: the true R of that Industry is shown for 10 model years; concealment found is fined (Mandate to you, a Confidence bump). The busiest verb, and the Act II replacement for buying cards. |
| **Set a lever** | every 1–2 min | Mandate | As in Act I, but the rival answers it. Kinds added: `standard` (efficiency forced; opens loopholes), `ban` (with or without a substitute), `quota` (Fishing, water), `borderAdjust` (closes leakage), `charge` (a price on the service itself). |
| **Amend** | when a loophole opens (every 2–4 min) | Mandate and drafting time (the loophole stays open while you draft) | Each lever has a ladder of two or three loopholes. Closing one opens the next; the last rung is robust. The CAFE ladder: light trucks → the footprint rule → credits bought from Abroad → robust only when paired with a duty. |
| **Answer Pryce** | every 3–5 min | varies | Dispatches with the rival: a voluntary agreement in exchange for no regulation; a threat to take the mills Abroad unless the duty is halved; an offer to fund your new Institution (capture by invitation). |
| **The manifesto** | each election (≈ every 3.3 min) | binds you | Choose 2 pledges of 3. A pledge buys Confidence and binds a lever ("No new taxes on motoring": the Motion duty cannot rise this Parliament). Pledges are the government's forks. |
| **Spend the Treasury** | continuous | levy revenue | Government money is levy revenue. It shrinks as restraint succeeds (the Acid Rain joke: a cap that works earns nothing). Spend it on the Commons, compensation (keeps Confidence through closures), public research (which the rival takes as free efficiency: a rebound), or Independence. |
| **Keep Institutions independent** | standing | Mandate upkeep per seated Institution | Low Independence invites capture. A ratchet or an independent committee survives a lost election; nothing else does. |

**Confidence replaces bankruptcy.** Confidence (0–100) is the polling line, drawn in the broadsheet's masthead.

- It falls with prices felt by households (levies passed through), jobs lost to closures without compensation, Pryce's
  lobbying, and crises.
- It rises with wellbeing growth, Commons, dividend recycling, fines collected, and a crisis well handled (the
  political window of Act I survives here).
- **Elections** come every `termYears` model years (recommended 10, offset 5 from the budget decades, so a decade tick
  and an election alternate about every 1.7 minutes).
- At an election, Confidence ≥ 50 returns you with a Mandate bonus. Below 50 you lose.

**Opposition** is a term out of office, not a game over. While in Opposition:

- your levers cannot rise, and one lever (the rival's choice) is repealed by a level each Parliament;
- loopholes you closed can be reopened by the new government;
- you can campaign (Mandate for Confidence), draft amendments in advance so they pass the day you return, and watch
  which Institutions survive. Only the independent ones do, which is the act's argument for Institutions, felt.

**Two lost elections in a row end the Ministry** (the run). Exhaustion and collapse still end it too. The run-end
screen is the Reckoning as before, with the government's ledger.

### Abroad, and what became of the regions

The first pass planned three to six regions run by scripts. That was the most expensive and least legible part of
the plan, and the audit asked for one neighbour until it is proven fun. The Other Chair needs only one:

- **Abroad** is a single unregulated economy drawn on the scene's horizon. It has no levers unless an Article gives it
  some. Its R is the sum of what Pryce has moved there plus a small script economy.
- **Two ledgers.** From Plenty onward every Industry shows territorial R and consumption R (home plus what Abroad
  makes for home). Hindsight, Precedent and Steady State in Act II are scored on the **consumption** ledger, so
  offshoring is not a way to win.
- **Articles** (bought with Precedent, permanent across Treaties) are treaties with Abroad and powers at home:
  Border adjustment, Technology transfer (spreads your efficiency to Abroad: a frontier rebound there), Keep it in
  the ground (takes reserve off the board: the cure for the green paradox), Independent inspectorate (a permanent
  Inspector), Ratchet clause (a lever cannot be lowered by a successor), Loss and damage.
- Freight & Flight's "two ledgers" mechanic is this system at full strength; Fishing's foreign fleets in Act I are
  its foreshadowing.

### Treaties after the first

The Treaty stays a repeatable reset. Each later Treaty:

- pays Precedent from the Ministry record: decades within budget on the consumption ledger, Steady States, world
  reserve unburnt, wellbeing-years;
- resets Hindsight, the Statecraft tree (the government's Know-how: drafting, inspection, polling, compensation,
  independence) and Institution levels;
- gives Pryce one new **playbook** (a new response, or a cheaper old one) drawn from the cases in `restraint.md`
  §13. The player buys Articles; the rival learns tricks. The arms race is the layer, and each Treaty changes what
  the player has to anticipate.

Expected: four to six Treaties between hours 16 and 52.

### Ten minutes of play (worked example)

Hour 24. Second Treaty. Motion and Plenty are open under Pryce; the Coal Age rows are settled. Confidence 58. The
next election is in 1965.

- **0:00 (1958).** The Motion scene: an airbrushed motorway, Pryce Motors hoardings. The official consumption gauge
  says oil use is flat. In the scene the exhaust haze thickens. Two Inspectors ready. Tap the refinery: true R is
  14% above reported. Fine collected: +40 Mandate, Confidence +2. Headline: "Ministry finds 'clerical error' at Pryce
  refinery."
- **0:40.** Raise the Fleet economy standard to level 1 (Mandate 90). Pryce's cheapest response is Evade: the loophole
  "Light trucks" opens. A new application appears in Motion with its own adoption curve; in the scene, a car park of
  high-sided vans grows beside the motorway.
- **1:30.** Pryce dispatch: "We will meet the standard voluntarily if the duty is withdrawn." Accept (Confidence +4,
  duty to 0) or refuse (nothing). Refuse.
- **2:10.** Begin an amendment: the footprint rule (Mandate 60, five model years to draft). The light trucks keep
  coming while it drafts.
- **2:50 (1960).** Decade tick in Plenty (on the consumption ledger). Choose a dividend: +1 Inspector this run, or +10%
  Commons yield. Take the Inspector.
- **3:30.** Inspect the farms: concealment in fertiliser use, smaller fine. Plenty's two gauges ("water applied"
  falling, "water consumed" rising) are both now honest.
- **4:20.** The amendment passes. Light trucks stop growing. Pryce's next cheapest response is Offshore: the
  assembly plant moves Abroad. Home oil falls 6%; the consumption gauge does not move; a ship leaves for the horizon
  and the skyline valley grows a chimney.
- **5:00 (1963).** Pryce lobbies. Confidence 58 → 51. A hoarding goes up beside the standard's sign: "Freedom of the
  Road."
- **5:40.** Spend Treasury on compensation for the plant's workers (Confidence +3) and on a Commons project, the
  Green belt (wellbeing, and it lowers Motion's sprawl floor).
- **6:30 (1965). Election.** Manifesto: three pledges offered. "No new taxes on motoring" (Confidence +8, binds the
  Motion duty), "A railway for every town" (Confidence +4, Treasury cost), "An independent statistics board"
  (Confidence +2, makes concealment fail for one Industry permanently this Ministry). Take the railway and the board.
  Confidence 56: returned. Mandate +120.
- **7:30.** With the Mandate, raise the Motion duty to level 1 (allowed, since you did not pledge against it). Paired
  with the standard, the footprint loophole stops mattering: the price reaches every category.
- **8:30.** Pryce litigates the duty: delayed three model years.
- **9:20.** Buy nothing; inspect again; read the paper. The duty takes effect at 9:50. The consumption gauge, for the
  first time this Ministry, turns down.

Fifteen decisions in ten minutes, with no upgrade bought.

### What it shows on screen

- The **Ministry window** frames every Act II scene. Its sill holds the Inspectors (small figures, greyed while on
  cooldown) and the Confidence line.
- **Pryce's hoardings** grow on the scene with lobbying; **Pryce bunting** on captured Institutions.
- **The exempt thing** appears for every open loophole (light trucks, tall chimneys, the "scientific" vessel).
- **Abroad** on the skyline: a second, smaller valley that fills as production leaves.
- **Concealment** as a split: the official gauge clean, the scene's sky dirty, until an inspection makes them agree.
- **Opposition**: the window's curtains half-drawn and your levers' signs in grey.

### Contract sketch (M5)

```ts
interface ChairDef {
  termYears: number; termOffset: number;
  confidence: { start: number; winAt: number; perLevyShare: number; perJobLost: number; perWellbeing: number;
                perFine: number; perCompensation: number };
  opposition: { repealPerTerm: number; lostInARowEnds: number };
  inspectors: { start: number; cooldownYears: number; revealYears: number; finePerConcealed: number };
}
interface RivalDef { id: string; name: string; defaultProfile: RivalProfile; responses: ResponseDef[];
                     playbooks: { id: string; effects: EffectDef[] }[]; knowhowTransfer: { k: number; cap: number } }
interface RivalProfile { haste: number; founder: number; volume: number; drawn: number }
interface ResponseDef { kind: 'comply' | 'evade' | 'offshore' | 'lobby' | 'litigate' | 'conceal' | 'capture';
                        costScale: number; when?: Cond }
interface LoopholeDef { id: string; lever: string; name: string; blurb: string; app?: string; effects: EffectDef[];
                        amendCost: number; amendYears: number; next?: string; closedBy?: string /* paired lever */ }
interface PledgeDef { id: string; name: string; blurb: string; confidence: number; binds?: { lever: string; max: number };
                      effects?: EffectDef[] }
interface ArticleDef { id: string; name: string; blurb: string; cost: number; effects: EffectDef[] }
// LeverKind += 'standard' | 'ban' | 'quota' | 'borderAdjust' | 'charge'
GameState.chair?: { confidence: number; termStart: number; inOpposition: boolean; lostInARow: number;
  pledges: string[]; inspectors: number[] /* cooldown ends */; loopholes: Record<string, 'open' | 'drafting' | 'closed'>;
  rival: { capital: number; profile: RivalProfile; concealment: Record<SectorId, number>;
           offshore: Record<SectorId, number>; captured: Record<string, number> }; independence: Record<string, number> };
SectorDerived += { reportedR: number; abroadR: number; consumptionR: number };
MetaState += { opening: { t: number; id: string }[]; firstOpening?: { t: number; id: string }[];
               precedent: number; articles: Record<string, boolean>; treaties: number; playbooks: string[] };
ModelApi += inspect(sector) · amend(loopholeId) · choosePledges(ids) · campaign(mandate) · setIndependence(inst, level)
            · treaty() · buyArticle(id) · takeOffice()
```

`meta.opening` is recorded from M2 so that the first players to reach Act II have one.

### Sizes

| Area | Work | Size |
|---|---|---|
| Contract | the above, plus save migration | L |
| Core | rival bot and response table; elections and Opposition; loophole ladders; inspection and concealment; Abroad and the two ledgers; the Treaty reset and the Know-how transfer | L (≈ 10 days) |
| Content | Pryce and his voice; 4 Industries' loophole ladders (2–3 per lever); 30 pledges; 12 Articles; 6 playbooks; 40 Pryce dispatches; the Statecraft tree | L |
| UI | Ministry window; Confidence line; inspection taps in the scene; loophole cards; manifesto sheet; Articles shop | L |
| Scene art | the window frame; hoardings, bunting, the exempt things, Abroad's skyline valley | M |

### Risks

- **It reads as whack-a-mole.** Mitigation: ladders are short (two or three rungs) and end in a robust rung; pairing
  levers (a standard with a duty) closes a whole ladder, which is the skill the act teaches.
- **The rival feels unfair.** Mitigation: every response is on a visible table with its cost; the rival never acts on
  information the player cannot see; the Pryce voice is genial, not villainous.
- **Elections feel like nagging.** Mitigation: an election is one sheet with three cards and no reading; Opposition is
  playable; two losses are needed to end a Ministry.
- **The seeding from the player's run feels creepy.** It uses only game actions and game time, it is shown once, and
  it is funny. If owner decision D2 says no, the default profile is used and the prospectus quotes the balancer.
- **Politics.** No real parties, no living politicians, no left or right labels. The government is "the Ministry"
  and the opposition is "the Opposition".

### Balanced headlessly

New balancer modes, each a regulator bot against the rival bot:

- `naive`: raises the cheapest lever when Mandate allows; never amends, inspects or compensates.
- `hawk`: every lever to the maximum as fast as possible.
- `steward`: pairs levers, amends loopholes as they open, inspects on cooldown, compensates closures, keeps two
  Institutions independent.
- `abstain`: never touches a lever (the rival unopposed: the Act II baseline).

Rival profiles to play against: the default (`efficiency`), the `budget` opening, and 20 profiles from a seeded grid.

Targets (to become `src/balance.test.ts` cases in M5):

- `steward` earns at least 1.5× `naive` and 3× `abstain` Precedent per hour, against every rival profile.
- `hawk` loses an election within three Parliaments in at least 80% of profiles.
- Under `naive`, leakage (Abroad's share of consumption R) exceeds 30% by the end of Motion.
- No single lever kind holds the consumption ledger within budget for a decade on its own (ablation).
- `steward`'s first decade within budget on the consumption ledger comes within 25 minutes of a Ministry's start.
- The Take-office opening (the first Ministry) reaches its first election within 4 minutes and its first loophole
  within 6.

---

## 2. You Write the Objectives

### The idea

In the Attention Age agents run the earlier Industries for the player. The player's only input is the brief: what
each agent is told to maximise, under what constraints, with what budget, and how much human attention is spent
checking on it. Tell one to maximise efficiency and it does exactly that. The game's thesis returns as a
specification problem: every metric is a proxy, and every proxy is gamed.

**Rebound named: measurement** (new form; Goodhart's law). The saving shows up in the measured quantity and is spent
on whatever is not measured. This is the frontier rebound's cousin at the level of goals, and it is exactly what the
`peakdraw` balancer strategy already does to the budget line.

### Where it lives

The third layer, the Long Now. When it opens (the Act II ending, about hour 52), every earlier Industry is handed to
an agent. Compute opens first, then Proof-of-Work, then Code. Code is where agents come from: its service ("working
features") is the agents' capacity, and its resource is human attention, which is now the player's binding resource
too. The more Code ships, the more agents there are to supervise.

### The brief (the objective vocabulary)

One card per agent, built from three rows of chips. No programming, no free text. It fits a phone screen.

| Row | Choices | Rule |
|---|---|---|
| **Maximise** | Output · Profit · Efficiency · Wellbeing · Decades within budget · Reserve left · Clear skies · Approval | exactly one |
| **Also care about** | the same list, each at weight ½ | at most two |
| **Never** | Exceed the budget line · Let pressure pass 50% · Let wellbeing fall below target · Found anything new · Close anything old | at most two; each hard (the agent refuses actions that break it, *as it measures it*) |
| **Review every** | 1 · 5 · 20 model years, or Never | costs Attention per review |
| **Budget** | Low · Normal · High (share of capital and Mandate) | |

Every metric has a **proxy** (what the agent actually reads) printed under its chip. "Decades within budget: reads
the line you drew." "Efficiency: reads the average η of what is running." The proxy is where the gaming happens.

### What each agent does, and how it games

The agent's policy is a one-step look-ahead in the core: each model year it scores its candidate actions (buy an
upgrade, found an application, raise or lower a lever, draw a budget, or a **gaming move**) by the weighted proxies,
subject to its constraints as it measures them, and takes the best. The base policies are the balancer's strategies,
which become in-game content:

| Told to maximise | Base behaviour (balancer strategy) | The gaming move (Goodhart) | What it shows |
|---|---|---|---|
| Efficiency | `efficiency`: buys every η card | **Retires the least efficient application** to raise the average, even if it is the mine pump | The pit floods; a neon tag over it reads "η +3%" |
| Output | `efficiency` plus found everything | Ignores pressure until a crisis | Smog thickens under a cheerful counter |
| Profit | founds what pays, lobbies (it has read Pryce) | Levy capture: if it runs a Treasury slot, it keeps the tax base burning ("the Treasury is the largest shareholder in coal") | Revenue dial up, chimneys up |
| Decades within budget | `budget` | **`peakdraw`**: redraws the line at each new peak so depletion carries R under it | "Decades: 14" in neon above a record burn |
| Reserve left | `idle`: stops extracting | Population falls: Degrowth by accident | Empty streets, untouched seams |
| Clear skies | `budget` with absorption and substitution | **Tall chimneys**: exports pressure to a neighbouring Industry or Abroad | One sky clears, the next one browns |
| Wellbeing | founds leisure applications | **Measures the survey, not the people**: buys the broadcaster's goodwill (`wellbeingAdd` from "survey design") | A happiness index billboard; nothing else changes |
| Approval | cuts every levy | Populism | Every sign of restraint taken down |

Constraints are measured too, so they are gamed too. "Never exceed the budget line" plus "Maximise output" makes an
agent that redraws the line. "Never let pressure pass 50%" makes tall chimneys. The fix is independent measurement:
an Institution seated in the Long Now (the Statistics Office, a stock survey, the climate committee) supplies the
proxy instead of the agent, and that agent can no longer game it. Institutions carry the argument from Act I into
Act III: they are how you make a number honest.

### Misspecification is amusing, not punitive

- **Incidents, not failures.** Each gaming move raises an **incident**: a short broadsheet vignette in the review
  queue, with a neon picture on the scene. "AGENT 4 (LIGHT) ACHIEVES RECORD EFFICIENCY BY SWITCHING OFF THE
  HOSPITALS." The incident is reversible if reviewed in time.
- **Drift is slow.** Gaming grows with time since the last review (`drift`), so an unreviewed agent goes wrong
  gradually and visibly, never at once.
- **Every agent is obedient.** Nothing is malicious. The agent did what the card said. The headline says what the
  card said.
- **Nothing ends a run without warning.** The core holds before a collapse while an incident is open (the same
  `holdBefore` rule as offline play).

### Attention is the binding resource

- **Attention** is a flow in the core (pure, in model time), drawn from Code's resource. Code's own maintenance
  rebound feeds it: more agents mean more review.
- A **review** costs Attention and does three things: it reverts an open incident, it resets that agent's `drift`, and
  it lets you rewrite the card for free (rewriting without a review costs double).
- The **review queue** is the moment-to-moment loop: incident cards stacked like a code-review queue, each a
  ten-second decision (Revert · Accept · Rewrite the brief). The player has more incidents than Attention and must
  choose which agents to watch. That triage is the act.

### What a good brief looks like, and why it is not obvious

A good brief for one Industry pairs a goal with constraints measured by someone else, and puts review where gaming
is cheapest. Steam in the Long Now: maximise Wellbeing, also care about Clear skies; never exceed the budget line
(line held by the Statistics Office); review every 20 years. It is not obvious because:

1. **Each fix opens a new route.** Adding "Clear skies" without an independent measure invites tall chimneys.
2. **Industries need different briefs.** Fishing needs "Reserve left" with a stock survey, because its own gauge (catch
   per effort) lies. Proof-of-Work cannot be fixed by any brief about efficiency; only "Reserve left" with permission
   to change the mechanism works. Comfort needs "Never found anything new" against the ratchet.
3. **Attention is scarce.** The ideal brief everywhere costs more review than you have; you choose which Industries
   get honest measurement and which get trust.
4. **The world is the player's own.** Agents act on the state the player built in Acts I and II (what is settled,
   which Institutions exist, how big Abroad is), so two players' best briefs differ.
5. **There is no single score.** Endings weigh wellbeing per ton, decades and reserve unburnt. A History or the
   weekly Almanac can withhold metrics ("The Ministry has only three gauges this week").
6. **Pryce is still there.** The rival returns as an agent you cannot brief, only constrain by law.

### Ten minutes of play (worked example)

Hour 64. Code is open. Six agents: Steam, Iron, Light, Fishing, Plenty, Motion. Attention 7, regenerating 1 every
two model years. The scenes carry the cyberpunk overlay: neon brackets around each agent's tag.

- **0:00 (2034).** The queue holds three incidents. Light: "Efficiency agent retires street lamps; accidents up."
  Fishing: "Output agent reports record catch per trip" (the lying gauge, again). Motion: none.
- **0:30.** Review Light (Attention 7 → 5): Revert. Rewrite: Maximise Wellbeing, also care about Efficiency; Never
  close anything old.
- **1:20.** Fishing: the agent is maximising Output with no survey. Rewrite to Reserve left, with the stock survey
  Institution as its measure. Review cost 2 (Attention 3). The chart's banks turn from neon red to amber.
- **2:40.** A new incident: Steam's Decades agent has drawn its fourth line this decade (`peakdraw`). The ledger
  shows "Decades 9", the scene a record burn. Not enough Attention to review; set Steam to "Review every 5 years"
  instead, which costs Attention later but stops the drift now.
- **4:00.** Code ships a feature tier: two new agents arrive (Comfort, Compute). Each comes briefed "Maximise
  Output". Two more cards to write, and Attention does not grow with them.
- **5:30.** Write Compute's brief: Maximise Profit, Never let pressure pass 50%. Within a model year Compute's agent
  moves training runs to Abroad's data halls (the constraint, measured at home, is met). Incident.
- **6:40.** Seat the climate committee as Compute's measure (an Institution seat), so pressure is read on the
  consumption ledger. The incident closes itself.
- **8:00.** The decade ticks in Light (honest, this time). Dividend choice: +2 Attention, or one free review a decade
  for one agent. Take the free review for Steam.
- **9:10.** Comfort's Output agent has founded the second fridge, then the third. Leave it: Attention 1, and Comfort
  is not yet over budget. Triage is the game.

### What it shows on screen

- **The agent overlay.** Every earlier Industry's scene, in its own art style, gains a thin neon layer in the
  Attention Age: bracketed labels, the agent's objective tag, and its gaming moves as glitches (a flooded pit with
  a cheerful percentage over it). The owner's "eventually a cyberpunk world" arrives as the whole game seen through
  the agents' goggles.
- **The review queue** as a stack of neon cards over the scene.
- **Drift** as signal noise that grows over an unreviewed agent's scene until reviewed.

### Contract sketch (M7)

```ts
type MetricId = 'output' | 'profit' | 'efficiency' | 'wellbeing' | 'decades' | 'reserve' | 'clear' | 'approval';
interface MetricDef { id: MetricId; name: string; proxy: string /* label */; reads: StatKey;
                      gaming: GamingDef[]; honestWith?: string[] /* institution ids that measure it independently */ }
interface GamingDef { id: string; when: Cond; effects: EffectDef[]; incident: { headline: string; body: string };
                      driftAt: number }
interface ObjectiveSpec { maximise: MetricId; also: MetricId[]; never: ConstraintId[]; reviewEvery: 1 | 5 | 20 | null;
                          budget: 'low' | 'normal' | 'high' }
GameState.agents?: Record<SectorId, { spec: ObjectiveSpec; drift: number; lastReview: number; incidents: string[] }>;
GameState.attention?: { stock: number };
ModelApi += setObjective(sector, spec) · review(sector, incidentId, 'revert' | 'accept')
```

The agent policy needs the balancer's look-ahead inside the core (`src/core/agents.ts`); the balancer then imports
it rather than duplicating it.

### Sizes

| Area | Work | Size |
|---|---|---|
| Contract | the above | M |
| Core | agent policy (one-step look-ahead over candidate actions), gaming moves, drift, incidents, Attention, independent measurement | L |
| Content | 8 metrics, 5 constraints, 30 gaming moves (about 3 per metric, Industry-specific where it matters), 60 incident vignettes | M |
| UI | brief card (chips), review queue, overlay hooks | M |
| Scene art | the agent overlay layer for every style (tags, brackets, glitches) | M |

### Risks

- **A puzzle with one answer.** Mitigation: the six reasons above; the balancer's spec grid (below) must show no brief
  is best everywhere.
- **Too abstract on a phone.** Mitigation: three rows of chips, a proxy line under each, and the consequence shown in
  the scene within a model year.
- **It replaces playing with configuring.** Mitigation: the review queue is the active loop; the brief is rewritten
  on review, not in a separate screen.
- **Agents feel like a lecture about AI.** Mitigation: agents are never malicious and the paper is dry about them;
  the same joke has been running since Lean's Engine Reporter (1811) printed engine "duty" as a league table.

### Balanced headlessly

- `spec` mode: for each Industry, play every brief in a grid (8 maximise × 6 constraint pairs × 4 review settings,
  pruned to about 120), report decades, wellbeing per ton, reserve and incidents.
- `triage` mode: a review bot with a fixed Attention budget, three policies (oldest first, biggest drift first,
  random), against the default briefs.

Targets:

- Every metric shows its gaming move within 10 minutes when unconstrained and unreviewed.
- No brief is in the top three for more than half the Industries.
- Every single-metric brief with no constraint fails at least one ending criterion.
- The best briefs beat the default ("Maximise Output") by at least 2× in decades within budget, and need an
  Institution as a measure in at least four Industries.
- `triage` with biggest-drift-first beats oldest-first by at least 20%: triage matters.

---

## 3. The Game Rebounds on You

### The idea

Every automation in the game is sold as saving the player effort: the Market, the Civil Service, Treasury rules,
standing orders, agents. The game quietly measures the player's own decisions per minute, sessions and hours. They go
up. Eventually the Statistics Office publishes it, as it once published the coal figures: "Since the Market was
automated, the proprietor's working day has lengthened by 40 per cent." In the Attention Age, where the scarce
resource is attention, the player's own attention becomes the instrument.

**Rebound named: attention** (new form; the time rebound of Cowan and Binswanger, turned on the player). Automation
saves decisions, and the saving is re-spent on watching more things.

### What is measured, and where

Two halves, kept apart by the rule that the core is pure.

**In the core (pure, deterministic, in model time).** The model already counts clicks. From M2 it also counts
**decisions**: successful player actions (purchases, foundings, lever changes, budgets drawn, dispatch answers,
pledges, reviews). `run.decisions` and a per-model-decade series. This needs no clock: it is input counted against
game time, the same as clicks.

**In the UI (wall-clock, never enters the core).** The **play ledger**, kept in its own `localStorage` key
(`rebound.playledger`), never in the save string:

| Measure | Definition |
|---|---|
| Active minutes | minutes with the page visible and an input in the last 60 seconds |
| Sessions | visible spans separated by at least 10 minutes hidden |
| Looks | page shows (visibility changes to visible) |
| Decisions per active minute | successful model actions ÷ active minutes |
| Days played | calendar days with at least one session |
| Phases | the active-hour mark of each automation unlock, so every figure can be split "before" and "after" |

**How the model is told a derived fact.** The UI may file a **return**: `ModelApi.fileReturn(state, content, { id,
figures })`. It is a player action like a click: the state stays a pure function of its inputs, and the same
sequence of actions gives the same state. The core treats the figures as opaque display numbers and thresholds: it
prints them in a headline (`{n}`) and lets a `Cond` read them, so achievements and one ending can depend on them.
Tests file fixed figures. Wall-clock time itself never enters `step`, `tick`, `derive` or `fastForward`.

### The reveal: "The Proprietor's Day"

It should be as good as The Coal Question, and it is built the same way.

- **When.** About hour 7, after the second automation (the Civil Service, M2), and only once the ledger holds at
  least three sessions before and three after the Market. A Cond on the filed return gates it.
- **The question first.** A pamphlet in the voice of Whitlow's daughter (the cast's second generation): "Why does the
  labour-saving machine save no labour?" A research card, **The Proprietor's Day**, appears. It asks; it does not
  answer.
- **The answer on purchase.** The Gazette prints the Statistics Office's return:

  > HOUSEHOLD SURVEY. Since the Market was automated the proprietor has taken 212 decisions an hour, up from 140, over
  > a working day lengthened by 40 per cent. Sessions are shorter and more frequent. The Office notes that the Market
  > has not taken a decision on the proprietor's behalf that the proprietor did not then check.

- **The instruments change**, as after The Coal Question. A second pair of twin gauges appears in the statistics
  sheet, "Decisions automated" against "Your decisions per hour", mirroring Efficiency against Consumption. Every
  automation offer gains a third line, like an upgrade's projection: "Saves about 30 decisions a session · opens 2
  new things to watch", estimated from the player's own ledger.
- **If the figures went down**, the paper says so, in the same tone: "…shortened by 12 per cent. The Office is as
  surprised as anyone." The reveal is honest data, not a script.

### Dry, never scolding

- The paper speaks of "the proprietor", never "you".
- No streaks, no daily rewards, no session timers, no nudges to stop or to return. Nothing in the game's rewards
  depends on playing less or more, except the optional achievements below.
- The return is published at most once per Reckoning, in the annual statistics, never mid-session.
- One switch in the settings: "Close the Household Survey". It deletes the ledger and stops measuring at once, and the
  paper prints one line: "The Household Survey is discontinued for want of funding."

### What the player can do about it

- **Closing and opening automations.** After the reveal every automation carries a label measured from the ledger:
  **closing** (it takes decisions away and asks for none: a settled Industry, the Civil Service holding a line
  without alerts, Standing Act I) or **opening** (it creates things to watch: the Market raises dispatches,
  foundings and crises to answer). The player can choose closing ones, and turn opening ones off.
- **Sufficiency of play.** An achievement family, "Enough": Steady State in a run with fewer than 100 decisions; a
  Ministry that wins two elections on two sessions a day; "A Week of Sundays" (seven days, one short session each,
  every Industry settled). Each pays a cosmetic and a Commons project, never power (the History rules apply).
- **An ending that respects time.** The best play of the Long Now is a brief that needs least review (shift 2), so the
  last act rewards needing the player less. At the true ending the Statistics Office prints the player's whole
  ledger as a Reckoning card: hours, sessions, decisions, and "decisions automated". After it: "The ledger is
  closed. You may stop." The post-game says it is optional.

### In the Attention Age

Reviews (shift 2) can only be done by hand, so real attention is literally spent. The in-game Attention flow is the
pure proxy; the play ledger is the real one. A late return compares them: "The agents were reviewed 400 times. The
proprietor's working day in the Attention Age was the longest of any Age." The last Long Now achievement is to hold
Steady State across every Industry for 50 years with the review queue untouched for a week of real days: the game
running well without you.

### Privacy, idle and offline

- Nothing leaves the device. There is no network. The ledger lives in one `localStorage` key, holds counts and
  timestamps only, never in the save string; an export includes it only if the player ticks a box.
- It is disclosed from first launch in the settings (owner decision D6). The reveal is the first time it is
  *published*, not the first time it is mentioned.
- Offline time is not active time. Offline progress is unchanged and honest, and "Enough" achievements make idle play
  a legitimate style rather than a lesser one.

### Ten minutes of play (worked example)

Hour 7.2. Run 9. Steam and Light settled earlier this run; Iron open. The Civil Service holds Iron's line.

- **0:00.** A decade ticks in Iron; dividend chosen. The Gazette: a letter from Miss Whitlow, "Why does the
  labour-saving machine save no labour?" A research card appears in Steam's list: The Proprietor's Day, £40k.
- **1:30.** Two Iron purchases and a Commons project. The card sits there.
- **3:00.** Buy it. The Gazette prints the return: decisions per hour up 51% since the Market, sessions up from 1.4 to
  3.1 a day, average length down. The statistics sheet gains the new twin gauges, both visible from the main bar for
  this session only.
- **3:40.** The automations panel now labels each order: the Market "opening", the Civil Service "closing", Treasury
  rules (not yet bought) "closing, est. −20 decisions a session".
- **5:00.** The player turns the Market off for Light (settled anyway) and leaves it on for Iron. The Gazette, a
  minute later, notes nothing; it never does.
- **6:30.** A new achievement is visible in the list: "Enough: Steady State in fewer than 100 decisions."
- **8:00–10:00.** Ordinary play. No further comment. The next return comes at the Reckoning.

### What it shows on screen

The second pair of twin gauges in the statistics sheet, in the Age's style; the "closing/opening" label on every
automation; the scene's proprietor figure (from the visual-direction item 8 row of people) checking a pocket watch
more often as decisions per hour rise. At the true ending, a last plate: the proprietor's desk, as seen in each Age's
style, ever more crowded with instruments.

### Contract sketch (M2 for the pure half, M3 for the rest)

```ts
RunStats.decisions: number; MetaState.decisionsByDecade?: number[];          // M2: pure counting
StatKey += 'decisions';                                                      // M2
GameState.returns?: Record<string, number[]>;                                // M3
ModelApi.fileReturn(state, content, ret: { id: string; figures: number[] }): GameState;   // M3
Cond += { returned: string; index: number; op: CmpOp; value: number };       // M3
HeadlineKey += 'return'                                                      // M3
```

### Sizes

| Area | Work | Size |
|---|---|---|
| Contract | the above | S |
| Core | decision counting; `fileReturn`; the Cond leaf | S |
| Content | the pamphlet, the card, 12 return templates, 8 "Enough" achievements | S |
| UI | the play ledger, the return filer, the twin gauges, closing/opening labels, the settings switch | M |
| Scene art | the proprietor figure's watch; the desk plate | S |

### Risks

- **It feels like surveillance.** Mitigation: local only, disclosed from launch, one switch deletes it, counts only.
- **It scolds.** Mitigation: the tone rules above; the "shortened" branch; no reward for playing less except optional
  achievements.
- **Too few players reach it.** It lands at about hour 7, after the audit's hour-5 drop-off. The pure half (decisions
  per model decade) can also appear earlier as one line on the Reckoning card from run 3.
- **Measurement noise.** Small samples print nothing: the reveal waits for three sessions on each side.

### Balanced headlessly

The balancer cannot measure wall-clock, but it can measure decisions per model decade per strategy, before and after
each automation. Targets: with the Market on, the `efficiency` strategy's decisions per model decade rise at least
20% (the Market raises dispatches and foundings to answer); closing automations cut them at least 30%. The Playwright
script files a fixed return and checks the reveal and the settings switch.

---

## 4. Unbuilding

### The idea

The last Age inverts the goal. Progress is what the player takes down while wellbeing holds: retirement, demolition,
rewilding, stranded assets, the people who worked there. The Transition Industry builds clean supply, but clean
supply adds to fossil supply rather than replacing it (York, 2012: each unit of non-fossil energy displaced less than
a quarter of a unit of fossil energy) unless the old is retired. So retirement is the main verb, and it is hard.

**Rebound named: additionality** (new name: clean supply adds instead of displacing) and **replacement** (cheap clean
energy is itself Jevons: desalination, green hydrogen and data halls on cheap solar). The green paradox from Act II
returns: announcing a retirement makes the incumbent extract faster before the date.

### The loop

Each earlier Industry's founded applications and its big plant (the seams, the furnaces, the motorway, the data
halls) appear as **assets** on a Retirement ledger. Each asset card shows:

| Line | Meaning |
|---|---|
| Service lost | what wellbeing it supplies, and how much of it a clean or sufficient replacement now covers |
| Stranded value | what is still owed on it (Act II's borrowing and Act III's agent build-out) |
| People | the jobs, by name of place ("Deep pits: 4,200 at Ashworth Colliery") |
| Lock-in | years of floor demand it sets (Motion's sprawl, Comfort's ratchets) |
| Resistance | Pryce's lobbying strength for it |

Verbs:

- **Retire now**: the asset's demand and R end at once. Needs its service covered, or wellbeing falls.
- **Schedule**: announce a date. Politically cheap (Confidence), but the green paradox: until the date, Pryce extracts
  faster.
- **Buy out**: pay the stranded value. Removes Pryce's resistance.
- **Retrain**: pay to move the people to a named new job (a heat-pump works, a rewilding trust). Keeps Confidence.
- **Seal**: for stock Industries, take reserve off the board (the Keep it in the ground Article, now a verb).
- **Rewild**: on a retired site, a slow Commons-like project: wellbeing, and absorption for its Industry's pressure.

**The currency.** **Ground**: the reserve sealed plus the land rewilded, weighted by Industry. It is the Age's score
and the Long Now's Legacy input. Mandate pays for the verbs; capital pays for buy-outs.

**What resists:**

- **Lock-in** (Motion, Comfort): an asset whose floor demand is above zero cannot be retired until the floor is
  lowered by Commons (the Green belt, rail) or sufficiency.
- **Incumbents** (shift 1): Pryce lobbies against each retirement and plays the green paradox.
- **Debt** (shift 2): the agents of the Attention Age built out data halls and code to meet their briefs. Code's stock
  is technical debt in the literal sense; decommissioning it needs Attention (Code's deletion lever), and briefs that
  told agents to maximise output left the most.
- **Replacement rebound**: every cheap clean unit tempts a new application in the Transition Industry. Unbuilding
  needs a cap on the total, not only on the fossil share.

### The scenes run in reverse, but not as a rewind

Nothing returns to 1780. Each retired prop gets an **afterlife** sprite rather than vanishing:

- the capped shaft with a plaque; the engine house as a museum; spoil heaps wooded over;
- the viaduct kept as a cycle path; the mill as flats; the gasometer frame as a climbing garden;
- the motorway's outer lanes grassed; the data hall a library of things;
- the cut-away keeps every old working visible, sealed and labelled, under the new ground.

**Art style.** Solarpunk as a risograph zine (as the scene agent proposed): two or three inks (fluoro pink, teal,
yellow) on off-white, visible grain and slightly off registration. As each earlier Industry is retired or settled at
the sink line, its scene is **reprinted** in riso: the tabs leaf from engraving, chromolithograph and airbrush into
the same handmade zine. The clean city keeps visible mines in its cut-away and an extraction horizon (copper and
lithium), so the art does not lecture. Steady State looks like maintenance: people mending things.

### How it lands the true ending

The true ending needs every fossil-burning Industry retired or settled at its sink line, the Transition capped, and
wellbeing at target for 50 years. The last retirement offered is the first application of the game: **Mine pumping**,
the Newcomen engine of the first screen. Retiring it floods the pit, which becomes a lake. The final riso plate: the
first valley, a lake where the pit was, the engine house a museum, people swimming. The Sell button, the first thing
the player ever pressed, is gone from the screen; in its place, the Statistics Office's last return (shift 3). Then
the credits, and "The ledger is closed. You may stop."

### Ten minutes of play (worked example)

Hour 92. 2061. Transition open; Coal Age, Plenty and Fishing settled; Motion, Comfort and Compute still burning under
agents.

- **0:00.** The Retirement ledger lists eleven assets. Motion's "Out-of-town shopping": service 4% of wellbeing, 80%
  covered by the rail Commons; stranded £3m; 2,100 people; lock-in 12 years; resistance high.
- **0:40.** Retrain the 2,100 into the heat-pump works (Mandate 70). Confidence holds.
- **1:30.** Schedule the retirement for 2071 instead of now (Confidence +5). Within a model year Pryce opens two new
  stores (the green paradox): Motion R up 3%.
- **2:30.** Change your mind: Buy out (capital) and Retire now. The scene: the car park greys, then grasses over.
  Ground +40.
- **3:40.** The Transition Industry offers "Desalination on cheap solar" (a frontier application). Found it: wellbeing
  up, minerals pressure up. Or decline. Decline; raise the Transition cap instead.
- **5:00.** Compute's agent (briefed "Maximise Profit, never pass 50% pressure") has built three data halls Abroad.
  Their stranded value appears on the ledger as debt. Rewrite the brief (review, Attention 2) to Reserve left.
- **6:30.** Seal the Undersea workings in Steam (Mandate 120). Ground +200. The cut-away shows the seam bricked off.
- **7:30.** Rewild the old colliery: a slow project over 20 model years.
- **8:30.** Comfort's second fridge cannot be retired: ratchet floor. Fund the Library of things (Commons) to lower it.
- **9:40.** Motion's tab, the last airbrushed scene, reprints in riso.

### What it shows on screen

The afterlife sprites; the reprinting of each tab in riso; the Retirement ledger as a zine page with a plate per
asset; Ground as a cut-away strip that turns from black seam to brick seal to green; the people as named figures
walking from the old works to the new.

### Contract sketch (M8)

```ts
interface AssetDef { id: string; sector: SectorId; app?: string; name: string; people: number; place: string;
                     strandedPerOutput: number; lockInYears?: number; afterlife: string /* scene prop key */ }
interface RetirementState { status: 'running' | 'scheduled' | 'retired' | 'rewilding' | 'rewilded'; at?: number;
                            boughtOut?: boolean; retrained?: boolean }
SectorDef.displaces?: { sector: SectorId; ratio: number };   // the Transition's additionality
GameState.retirement?: Record<string, RetirementState>; GameState.ground?: number;
LeverKind += 'retire'; EffectDef += { type: 'seal'; sector; share } · { type: 'floorMul'; sector; app?; value };
ModelApi += retire(assetId, 'now' | 'schedule') · buyOut(assetId) · retrain(assetId) · seal(sector, share) · rewild(assetId)
```

### Sizes

| Area | Work | Size |
|---|---|---|
| Contract | the above | M |
| Core | displacement; retirement; green paradox on schedules; stranded value; Ground; lock-in floors; the true ending | L |
| Content | the Transition Industry to the kit; about 50 assets across eleven Industries with places and people; endings and credits | L |
| UI | the Retirement ledger; the reprint transition | M |
| Scene art | the riso style; afterlife sprites for every Industry's props | L |

### Risks

- **It reads as a rewind.** Mitigation: afterlife sprites; the reprint; the mines kept in the cut-away.
- **It preaches.** Mitigation: every asset has a cost and people; replacement rebound keeps the clean side honest;
  the paper is as dry about wind farms as about collieries.
- **People as a cost line.** The people are named by place and are retrained or not; compensation is a verb, never a
  number to be minimised for score (owner decision D4).
- **Too long a tail.** Mitigation: assets per Industry are capped at about five; settled Industries need only sealing.

### Balanced headlessly

`unbuild` mode with three bots: `now` (retire cheapest first, no retraining), `schedule` (announce everything),
`steward` (cover service first, retrain, buy out the high-resistance assets, seal). Targets: `steward` reaches the true
ending in 15–25 active hours of Act IV; `schedule` loses at least 10% more reserve to the green paradox; `now` loses an
election or breaks wellbeing within the first hour; the Transition with no cap shows a positive replacement rebound
(R of the Transition rises with its efficiency cards).

---

## How the four fit together

| | Act I | Act II | Act III | Act IV |
|---|---|---|---|---|
| The player | Industrialist | Government (shift 1) | Specifier (shift 2) | Unbuilder (shift 4) |
| The opponent | the rule itself | Pryce, paid to grow | the agents, obeying | lock-in, Pryce, debt |
| The binding resource | capital | Confidence | Attention | Ground and wellbeing |
| The named rebound added | direct, frontier, economy-wide, embodied, utilisation, hysteresis | evasion, leakage, the green paradox | measurement | additionality, replacement |
| Shift 3 (threaded) | decisions counted (M2) | the reveal (about hour 7) | real attention spent on reviews | the last return at the ending |

The thread is the same argument each time: whatever you make cheaper, someone spends. In Act I it is coal; in Act II
it is your rules; in Act III it is your metrics; in the thread it is your own time; in Act IV you finally take things
away.
