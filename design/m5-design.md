# M5 — "The Other Chair": Act II begins (design)

Design lead's document, 20 Nov 2026, written while another agent tunes M4's numbers. It designs M5 on the game **as M4
actually built it**, treats the roadmap's M5 paragraph and `paradigm-shifts.md` §1 as a sketch, and departs from them
where a measurement or an argument says so (§14 lists the amendments). Companions: `design/m5-contract-notes.md` (the
proposed `src/types.ts` changes, save v6), `briefs/m5-*.md` (one per lane), `design/m5-open-questions.md` (what is the
owner's, and what I assumed meanwhile).

As in M4: **[M]** marks a claim argued from a measurement (with where it comes from), **[J]** my judgement, **[S]** a
sourced real-world fact (from `design/research/*.md`, or checked this session and listed at the end). Player-facing text
here is in the house tone and uses "Industry" and "Age"; code names (`SectorId`, `chair`) are code.

---

## 0. M5 in one paragraph

At the Act I ending the player has learnt that efficiency backfires and that restraint, patiently built, works. M5 takes
the Works away. Pryce Consolidated buys them, the player is asked to form a government, and from then on **every run is a
Ministry**: the Industries of the Great Acceleration are run by Pryce, a deterministic agent paid to grow, who plays by
the very rule the player's own Market has used since run 2 (buy whatever pays back soonest) and who answers every rule
the player writes with the cheapest response on a table the player can read: comply, evade through a loophole, lobby,
litigate, or quietly under-report. The player never buys a card again. They legislate, read Pryce's answer before they
enact, inspect his figures, close loopholes by amendment, win elections on a Confidence line that falls with every price a
household feels, and spend a Treasury that fills fastest when Pryce burns most. **Motion**, a Preview in M4, leaves
Preview and becomes the first Industry seen from the Ministry window; **Plenty** (food, groundwater and two water gauges)
opens two Ministries later as the first Industry the player has never run, and carries the government's own rebound: a
subsidy for efficient irrigation that raises the water used. Compute and Code stay Previews of the Attention Age (M8).
M5 runs from about hour 16 to about hour 28, ends on Motion and Plenty settled from the Chair and the second Treaty, and
seeds the Second Ledger (M6) and the Inheritance (M7).

**The shift.** *Before:* I make the choices, and the gauges, once surveyed, are mine to read. *After:* someone paid to
grow makes them, reports them, and finds his way round every rule I write; my instruments are rules, inspections and
votes. **The moment:** Take office, with Pryce's prospectus quoting the player's own first morning in the trade, to the
second. **It reaches back** (the prospectus; the Market the player has run since run 2 revealed as Pryce's policy; the
settled Coal Age becoming figures Pryce reports and the Ministry must inspect; the player's own answers to Mr Pryce's
letters, read back as Pryce's file on them) and **it changes every later run** (no card is ever bought again; every rule
is read against Pryce's answer before it is enacted; every Industry, the capstone included, is inspected on a cadence;
every run is fought for at the polls).

---

## 1. Where M4 leaves the game (measured)

| Fact | Figure | Consequence for M5 |
|---|---|---|
| The Act I ending lands at 15.3–17.3 h for the scripted players **[M]** | `design/roadmap.md` M4 "Built"; `design/unlock-schedule.md` M4 | Take office lands at about hour 16.5–18.5 (§4). |
| After the ending, Motion opens as a Preview at minute 5–10 of the next run; Compute the run after **[M]** | same; my probe below (Motion opened at minute 10 from the `act1-ending` fixture) | The player has just run Motion as an industrialist when the invitation comes: the mirror the moment needs. |
| **Unopposed, Motion does not bite.** From `fixtures/m4/act1-ending.json`, Reckon, then no player action for 90 minutes with the Market on (Pryce's proxy): Motion's R rises 3.5× by minute 15 and then plateaus; smoke peaks at 0.17 of collapse; no crisis in 90 minutes; wellbeing 72 against a target of 34; oil 50% gone at minute 90 **[M]** | probe (`design/scratch/m5-design-progress.md`) | As tuned today the Chair would have nothing to regulate after minute 15. Motion under Pryce needs a growth tail (repeatable demand cards, calendar-dated uses) so that an unopposed Pryce reaches the first crisis in 18–35 minutes (exit criterion 5). This is content numbers, and the first experiment (§16). |
| Burning earns 0.6–0.7 of restraint's Hindsight a minute (budget ≈ 9.9, efficiency ≈ 6.5, runs 4–9) **[M]** | `design/scratch/m4-balance-progress.md` (q5) | Act II's equivalent of burning is letting Pryce run (abstaining). Its pay must be lower against good government (≤ 0.4×), and its temptation real (§9.2). |
| Letters: thoughtful beats default by 14.7% for `budget`, by 2.2% for `efficiency` (a 17-minute burning run receives about three letters, few of them wagers) **[M]** | same | Act II letters are wagers on the true state behind Pryce's reported figures, and every regulator style meets at least one a Parliament (§9.3). |
| Hours 8–15 were mostly saving for the Settlement Commission (5,500 Hindsight) **[M]** | `CLAUDE.md` M4 misses; `unlock-schedule.md` | No Act II gate is a single purchase; every Ministry should buy two to four things (§9.1). |
| The capstone's defence costs 1–2% of Mandate and never goes into arrears **[M]** | M4 balance final arc | The settled Coal Age is inert after the ending. M5 gives it something to do: Pryce owns it, reports it, and under-reports when not inspected (§3.2). |
| `meta.firstOpening` in the budget fixture: Better boilers at 18 s, another engine at 37 s, cotton mills at 86 s, the separate condenser at 291 s **[M]** | `fixtures/m4/act1-ending.json` | The prospectus's raw material is there in every save that has completed a run (§3.1). |
| `meta.runs` keeps each run's `decisions` and `automated` counts (20 runs) **[M]** | `src/types.ts` `RunSummary` | "Of the purchases made in your name since the second run, most were the Market's" can be printed from the save (§3.2). |
| The Alkali Inspectorate is an Act I Institution the scripted players own **[M]** | fixture `meta.institutions` | Inspection has an Act I ancestor; owning it gives the Ministry its first extra Inspector. |

---

## 2. The decisions, and why

1. **Motion first, at Take office; Plenty two Ministries later.** [J, argued from M] The roadmap opened Act II on Plenty
   and Motion at hour 20. Reversing them is better on three counts: the player has *just* run Motion as a Preview
   (row 2 above), so seeing Pryce run it faster and with their own method is the shift made visible; Motion carries the
   best-sourced loophole ladder (the light-truck boundary of CAFE [S, `restraint.md` §5.1]; Knittel 2011 [S]), so the
   first loophole is the clearest one; and Motion is built, so the first Ministry tests the Chair on known economics
   while Plenty is written. Plenty then arrives as the **first Industry the player has never run**: they meet it only
   through the Ministry window, which is the act's point.
2. **Compute and Code stay Previews of the Attention Age, and do not open in Ministries.** [J; owner question Q1] They
   belong to Act III (agents, M8). Under the Chair they would either be a second chair inside a Ministry (the player
   buying cards in Compute while legislating Motion: two games at once, which muddies the shift) or Pryce's with no verbs
   to regulate them (a burden without a decision). Before Take office they open as Previews as in M4; once office is
   taken they are "in preparation" (their tabs, for saves that opened them, become a sealed postcard with the player's
   record there). They return in M8 under the Objectives. This breaks D3's grandfathering for M4 saves after the ending;
   it is the owner's to approve.
3. **Pryce is the Market with his own purse.** [J] The roadmap's rival was "the `efficiency` strategy moved into core".
   Better: the purchasing half of Pryce **is** the M2 Market's payback rule (already pure, deterministic and in the step:
   `src/core/orders.ts`), run for Pryce's capital with his own payback limit. It costs little to build, it is exactly as
   predictable as the Market the player has watched for fifteen hours, and it is a reach-back in itself: "your Market,
   his purse". The responding half is a table of costs (§5.3).
4. **Pryce never acts on anything the player cannot see, and his next move is shown before the player moves.** [J]
   Every lever card in a Ministry carries **Pryce's answer**: the response he would choose if it were enacted now, its
   cost to him and the next cheapest. This is the Act II counterpart of the cards' "This decade" line after the reveal
   in Act I: a projection that turns a guess into a reading. It is what makes the agent an opponent and not a coin toss.
5. **Decades and clear skies are judged on the true figures; a cap is enforced against the reported ones.** [J, from
   M4's rule for the lying gauge] As with Fishing, the world and the rules use the truth, and the official gauge is
   labelled for what it is ("As reported by Pryce Consolidated"). Concealment then bites where it should: Pryce pays his
   levy on what he reports and holds his cap on what he reports, so his true burn runs over the line while the official
   gauge says it is within it. An inspection shows the truth for ten model years and fines what it finds.
6. **The Treasury fills from Pryce's income.** [J] In a Ministry the player's purse is the Treasury: a share of Pryce's
   income (taxation) plus levy revenue paid to it. So growth pays the government, and restraint costs it. That is the act's
   burning temptation, named and on screen; Hindsight is weighted so that good government still out-earns abstention
   (§9.2).
7. **Elections every fifteen model years (the first after ten).** [J] The roadmap's ten-year term put an election every
   3.3 minutes, alternating with decades every 1.7 minutes. Fifteen years (5 minutes) leaves a Parliament long enough to
   see a rule take effect through a litigation delay, and keeps the manifesto from becoming a chore; the first,
   caretaker Parliament is ten years so the first Ministry reaches its first election inside four minutes.
8. **At most two new things a Ministry, the confusing ones late.** [J, the owner's direction] Take office brings the
   Chair (Pryce, Confidence, elections and the answer line) and nothing else at its Reckoning; the first loophole comes
   mid-Ministry. Inspection and concealment wait for Ministry 2, Plenty for Ministry 3, the charge for Ministry 4, the
   Treaty for the Reckoning after the first settlement from the Chair (§8).
9. **Capture and Independence move to M6; so do Abroad, offshoring, the border adjustment and the ban.** [J] Capture is
   the most abstract of the responses and needs Institutions the player has rebuilt; the ban belongs with Montreal in
   Comfort (M6). M5's evasion is boundary migration, lobbying, litigation and concealment (§6).
10. **The Treaty and Precedent ship, small.** [J] Take office is the first Treaty. The second becomes available after the
    first settlement from the Chair (about hour 25–27), pays Precedent, and buys from four Articles; Pryce learns one
    playbook. It is the first rule that outlives a reset: the seed of the Inheritance. It is also the first thing to cut
    (§13).

---

## 3. The shift: The Other Chair

**Name: The Other Chair.** *Before:* I make the choices; the Market buys for me; the gauges, once surveyed, are mine to
read. *After:* a man paid to grow makes the choices, with my method and my Market; he reports the figures; and every rule
I write is a price he compares with the cost of getting round it.

Why this shift, and why here [J]: it is the turn `long-game.md` built the game around ("try stopping someone who is paid
to do it"); M4's Survey made the player distrust a clean gauge, which is exactly the habit inspection asks for; and it
needs nothing from Abroad, so it stands without M6.

### 3.1 The moment: Take office

**Guaranteed, once.** The invitation comes at the first Reckoning after the Act I ending at which Motion has been open
for at least five minutes in the run just ended (so the player has run Motion with their own hands once). A player who
Reckons sooner meets it a run later. The Reckoning card carries one extra button, **Take office**, and a quieter **Not
yet** (the invitation stands at every later Reckoning; nothing is lost by waiting; owner question Q2).

**On screen before.** The Reckoning card of the run just ended: the frozen grey valley with Motion's motorway in it, the
Hindsight terms, the Coal Age settled. The player expects the next run.

**The beat** (about twenty seconds; each step waits for a tap, nothing times out):

1. *The Gazette.* Over the frozen picture, the masthead prints one headline: "PRYCE CONSOLIDATED ACQUIRES THE WORKS".
   Sub-line: "Proprietor 'retires to public life'". The paper boy's cry is the only sound.
2. *A letter*, in the dispatch frame, from the Minister (the existing cast member, who has written to the proprietor
   since Act I): "Sir, the Prime Minister asks whether you will form a government. I am instructed to say that the
   Ministry's window has the better view of the valley, and to leave you the key to the drinks cabinet. I have taken the
   good pen. Yours, for the last time in this capacity, The Minister." One button: **Take office**.
3. *The pull back.* The scene does not reset. The frozen valley thaws to colour **inside a tall window frame** drawn in
   the Great Acceleration's airbrush style, which stays as the chrome of every Act II scene. On the sill: two small
   inspector figures (greyed, not yet used) and the Confidence line, empty.
4. *The prospectus.* The broadsheet prints Pryce Consolidated's prospectus as a full-width card, set as a company
   prospectus (rules, small capitals, a seal):

   > **PRYCE CONSOLIDATED. Prospectus for the motor trade.**
   > The method is not new. It was the late proprietor's, and is set out here as he practised it on his first morning
   > in the trade: improved boilers at the eighteenth second; a second engine at the thirty-seventh, and another every
   > twenty-odd seconds after; cotton mills at a minute and twenty-six seconds; the separate condenser inside five
   > minutes. Pryce Consolidated will do the same with motor cars, only sooner.
   > In the motor trade itself the late proprietor founded the suburbs at the seventh minute. We shall found them at the
   > sixth.
   > The directors are confident of the Ministry's goodwill. They have read its notebooks.

   Every time, name and count is the player's own, from `meta.firstOpening` (their first completed run) and, for the
   second paragraph, from the last run's opening if it founded a Motion application (else that paragraph is omitted).
   The last line is literal: the player's industrial Know-how passes to Pryce as a capped head start (D2, §5.5). A save
   without a first opening (imported, very old) quotes the balancer's `efficiency` opening and drops the "late
   proprietor" for "the trade's usual method". One button: **File it**.
5. *The first Parliament.* The Industry row shows Motion under Pryce's flag (his hoardings on the ring road), the Coal
   Age capstone group re-headed "Held by Pryce Consolidated under the Settlement Acts", and one line in the paper: "New
   Ministry formed; the first election is due in {year}." The Confidence line starts at 55. The run is on.

**After the moment** (the first minute of play), one more card, small, in the Ministry's file style: **The file on the
late proprietor** (§3.2, item 4), which says what Pryce has learnt from the player, and sets his opening character.

### 3.2 What reaches backwards

Nothing on Act I's screens was false. Four things the player did or trusted turn out to have been read by someone else.

1. **Their first morning, to the second** (the prospectus above). The player's 16-hours-old self is the rival's method.
2. **The Market was always a policy for someone paid to grow.** The orders panel's Market row, the automation the player
   has used since run 2, is shown in a Ministry as what it is: "Pryce Consolidated: buys whatever pays back within {n}
   seconds. (Your Market; his purse.)" The file card prints one line from `meta.runs`: "Of the purchases made in the
   Works' name in its last {k} seasons, {p}% were made by standing order." For the scripted players that figure is
   large [M: `automated` dominates from run 2 in the balancer's `--decisions` output]. It is the Game Rebounds on You,
   once more, without a word of comment.
3. **The settled Coal Age is now somebody's report.** Since the Act I ending the Coal Age has been settled for good and
   defended with Mandate. From Take office the capstone Industries are Pryce's to keep, their figures are his returns,
   and his concealment rule applies to them as to Motion: unvisited by an inspector for `quietYears`, the capstone's true
   burn creeps above its settled level while the settled row still reads as settled. An inspection resets it and fines
   it. On the capstone's folded rows: "Settled 1913 · last inspected 1961" (or "never"). The finished Act is no longer
   certain; it is inspected. (M4 measured its defence at 1–2% of Mandate; this gives it a verb.)
4. **The player's own answers to Mr Pryce, read back.** Every answer the player gave Josiah Pryce (Act I, Iron) and the
   younger Mr Pryce (the Motion Preview) is in `meta.dispatches.playerArms`. The file card lists the three most telling
   ("Accepted: a joint line of rails to the coast. Declined: a Belgian price for pig iron, the duty to be halved.") and
   one conclusion in Pryce's voice: "He will take an agreement if it is offered with a mechanics' institute attached." The
   share of Pryce's offers the player accepted becomes Pryce's `pliant` reading (§5.2): a player who took his bargains
   receives more of them.

### 3.3 What the player does differently afterwards, in every run

From Take office every run is a Ministry (until the Long Now, M7). In every one of them:

- **No card is ever bought.** Upgrade lists become Pryce's order book, read-only and folded to one line ("Pryce has
  bought 14; next: Lean-burn engine, payback 80 s").
- **Every rule is read against Pryce's answer before it is enacted.** The lever card's new line says what he will do
  and what it costs him. Pairing (a standard with a duty, a cap on consumption rather than application) is the skill.
- **Every Industry is inspected on a cadence**, the capstone included, because a decade on the official gauge is not a
  decade in the sky.
- **Every Ministry is fought for at the polls**: a manifesto every fifteen years binds the player's hands for a
  Parliament, and a lost election costs a lever.
- **Spending is the Treasury's, and the Treasury is Pryce's tax.** Commons, compensation and subsidies are paid from
  growth the player is trying to restrain.

---

## 4. Hour by hour

Targets for the human-like player; `mixed` and `budget` about 10% later. Hours before 16 are M4's, unchanged. New to M5
in **bold**.

| Active h | Run | What happens | New things this run |
|---|---|---|---|
| 15.3–17.3 | 9 | The Act I ending (M4): credits, "The ledger continues". | (M4) |
| 16–17.5 | 10 | The capstone run (M4). Motion opens as a Preview at minute 5–10; the younger Mr Pryce writes about motor cars (M3's letters). At its Reckoning: **the acquisition and Take office**. | (M4: Motion Preview) · **Take office** at the Reckoning |
| 17–19 | Ministry 1 | **Motion under Pryce** from minute 1, with his head start. The player has Motion's levers (duty, quota, walking distance, rail, insulation, the mileage rule, roads) and Mandate as before; **Confidence**, **the first election** at 3.3 minutes (manifesto: two pledges of three), then every 5 minutes. **Pryce's answer** on every lever: Comply, Lobby or Litigate. In the mid-run window (minutes 25–29) **the first loophole** arrives: the mileage rule, once it binds, makes light trucks cheaper than compliance; the exempt vans appear on the motorway; **Amend** (Mandate and five model years of drafting) closes it and opens the footprint rule. Unopposed, Pryce's Motion reaches its first crisis (The Summer Smog) at 18–35 minutes. | **the Chair** · **loopholes** |
| 19–21 | Ministry 2 | At the Reckoning: **inspection**. Two Inspectors on the sill; tap Pryce's refinery or a capstone works; the first inspection prints reported against found (a small echo of the Board's Survey: "Ministry finds 'clerical error' at Pryce refinery"). Pryce now **conceals** where nobody has called for six years. Mid-Ministry: **the Treasury** (its balance shown; compensation for closures; Commons from it). Opposition may come: a lost election repeals a lever level and forbids raises for a Parliament; two in a row end the Ministry. | **inspection** · **the Treasury** |
| 21–23 | Ministry 3 | At the Reckoning: **Statecraft** (the government's Know-how tree in the Hindsight shop; the Alkali Inspectorate's levels re-bought give inspectors). Mid-Ministry: **Plenty opens** under Pryce: bread grain and fertilised fields, the aquifer in the cut-away, **two water gauges** (applied, consumed), and its **drip subsidy**, the first lever that pays Pryce to do what he would have done anyway. | **Statecraft** · **Plenty** |
| 23–25 | Ministry 4 | At the Reckoning: **the charge** (a price on the service itself: the congestion charge in Motion, a charge per acre-foot consumed in Plenty; unpopular on the day, popular a decade later). Mid-Ministry: no new system. The steward is drawing Severe lines on Motion with a duty under the standard, inspecting both Industries each decade, and holding Plenty's consumption with the charge on the right gauge. Motion's first Steady State from the Chair. | **the charge** |
| 25–27 | Ministry 5 | **Motion settled from the Chair** ("The Motor Settlement": Pryce signs; the motorway's hoardings come down to one). At the next Reckoning, **the Treaty**: a reset that pays Precedent for the Ministries since Take office; four Articles; Pryce learns his first playbook. | **the Treaty** (at the Reckoning after the first settlement) |
| 27–30 | Ministry 6+ | After the second Treaty: Articles in force (an Independent Inspectorate, a Ratchet Clause…), Pryce's playbook (self-reporting: concealment begins sooner). Plenty settled from the Chair at about hour 28–30. The Great Acceleration's other Industries are not yet built: the paper says the Age continues ("Comfort and Freight are in preparation", as the Previews were). | Articles |

**A player arriving with an M4 save.** Before the Act I ending: nothing changes until the ending. After it (Previews
open): the invitation comes at their next Reckoning with Motion open five minutes; Compute and Code stay Previews in any
run before Take office and close at it (Q1); the broadsheet says it once: "The machines are to be the next Age's
business; the Ministry has the motor trade to see to."

**What the player does that they did not do before.** Read an opponent's answer before writing a rule; pair rules
because one alone is got round; inspect; draft an amendment while the loophole stays open; choose two promises of three
and keep them for five minutes; lose an election and play a Parliament in Opposition; spend a Treasury that shrinks when
they succeed; and, in Plenty, choose which of two honest gauges a rule should be written on.

---

## 5. Pryce: the agent

### 5.1 Who

**Sir Edmund Pryce, Chairman, Pryce Consolidated** (new cast member `pryceChair`; grandson of Josiah Pryce of
Ravensdale, son of the Mr Pryce of the motor letters). Genial, reasonable, always in favour of the cheaper thing, never
a villain: he answers rules as any well-advised company would, and says so. Voice notes for the text lane: he praises the
Ministry's intentions in the first sentence and prices them in the second; he never lies in a letter (he conceals in
returns, which is a different department); he signs "With every good wish for the Ministry".

### 5.2 His objective, as the player can read it

Published on his panel as the company's articles, in four lines, and never changed except by a playbook (§6.9):

1. **He buys whatever pays back soonest**, if it pays back within his limit (the Market's rule, his capital).
2. **He founds a use when it pays back within his founding limit.**
3. **He answers each rule with the cheapest response on his table**, priced in his own money a model year at a time.
4. **He acts only on what the player can see**: his costs are printed, his conditions are printed, and his concealment
   starts only where the Inspectorate has not called for a stated number of years.

**His character, from the player.** At Take office the player's record is distilled into five numbers (the roadmap's
four plus one), each shown on his panel with where it came from:

| Reading | From | What it does |
|---|---|---|
| `haste` | purchases per minute in the first ten minutes of `meta.firstOpening` | his payback limit: 60 s (hasty) to 240 s (patient); the scripted budget opening (12 actions in 316 s) reads hasty |
| `founder` | share of opening actions that founded rather than improved | his founding limit (a founder's Pryce founds sooner) |
| `volume` | how often the opening took the cheap, high-volume arm of a fork | which fork arms he takes |
| `drawn` | whether, and how early, the player first drew a line (`firstBudgetAt` across `meta.runs`) | how soon he starts lobbying (a player who drew early taught him to expect rules: his lobbying threshold is higher) |
| `pliant` | the share of Mr Pryce's and Josiah Pryce's offers the player accepted (`playerArms`, arms tagged `stance: 'accept'`) | the weight of his voluntary-agreement letters |

A save without a first opening uses `RivalDef.defaultProfile` (the balancer's `efficiency` opening). The profile is fixed
at Take office and kept for the Ministries after it; the second Treaty does not change it (M7 may hand it to an heir).

### 5.3 His responses, and what each costs him

Once a model year (each order tick), for each of his Industries, Pryce: (a) takes at most one purchase or founding by the
Market's rule; (b) for every lever in force on that Industry whose level changed since he last answered it, or once a
decade for all of them, chooses the cheapest response that is available. The table is content (`RivalDef.responses`);
the costs are formulas in content numbers, evaluated on the state the player sees.

| Response | Available when | Its cost to Pryce (a model year) | What it does | On screen |
|---|---|---|---|---|
| **Comply** | always | the income the rule takes from him: income without the rule minus income with it (one solve) | nothing more | the chimney thins |
| **Evade** | the lever has an open loophole rung (§6.2) | the rung's `premium` × his income in that Industry (the exempt thing pays a little less) | demand migrates into the exempt use; the rule's own effect on the migrated share lapses | the exempt thing appears (vans on the motorway; a well with no meter) |
| **Lobby** | Confidence is above the lever's carve-out line | `lobbyCost` × the Confidence points he needs to buy | Confidence falls each year he lobbies; once it is under the carve-out line, the lever acts one level lower for the rest of the Parliament (a carve-out) | a Pryce hoarding beside the lever's sign ("Freedom of the Road") |
| **Litigate** | the lever's level was raised within the last `litigateWindow` years and he has not litigated it | a fee, in years of his income | the new level is delayed `litigateYears` model years | the lever's sign draped in a court notice |
| **Conceal** | the Industry has not been inspected for `quietYears` (and feature `inspection`) | the expected fine: `fineMul` × the levy he would avoid × the Inspectorate's coverage | his reported R falls below his true R by a share that ramps to `concealMax`; levies are paid and caps held on the reported figure | the official gauge clean, the scene's sky dirty |

Concealment stands beside the other four (it is a choice about returns, not about the rule), so an Industry can be both
evading a standard and under-reporting. The player's lever card always shows the ranked list: "If enacted now: Pryce
evades through light trucks (£40 a year); next cheapest: comply (£120); lobby (£150)." His panel shows his last answer
to each rule and the reason.

**Why the table holds** [S]: boundary migration across a standard's category line is the CAFE light-truck history
(`restraint.md` §5.1; Knittel 2011 for the duty-paired remedy); litigation and lobbying as a cost a regulated firm weighs
against compliance is the economics of regulation since Stigler (1971), the origin of "regulatory capture"; concealment
of a regulated figure where the test does not look is the Volkswagen case (EPA notice of violation, 18 September 2015:
software that detected the test, emissions in normal driving 10–40 times the standard, found by independent road testing
rather than the official cycle). Nothing in the game names a real company: Pryce is fictional and the paper's jokes are
generic ("clerical error at Pryce refinery").

### 5.4 What he never does

He never acts on a hidden state; he never chooses at random; he never responds to a rule before it is enacted (the
player sees the answer first); he never conceals inside the quiet period after an inspection; he never offshores (M6);
he never captures an Institution (M6); and he never ends a Ministry by himself: only the voters, exhaustion and collapse
do.

### 5.5 The head start

"Pryce has read your notebooks." The player's industrial Know-how (every tree but Statecraft) passes to Pryce at Take
office: each Act II Industry starts with η × min(cap, 1 + k × Σ levels), k and cap in content (`RivalDef.knowhowTransfer`;
recommended k = 0.01, cap 1.25). The trees leave the player's shop (a line in the shop: "Industrial Know-how: held by
Pryce Consolidated"). The player's Institutions stay unlocked, their levels reset, the loadout empties (D2). Hindsight is
reset.

---

## 6. The instruments of government

Each with what it tempts, what it costs, and how the proprietor gets round it.

### 6.1 The levers the player already has

Duty, cap, quota, sufficiency, substitution, circularity, green spending and measures work as in Act I, with Pryce
answering each. **Tempts:** the duty and the cap are what won Act I. **Costs:** Mandate, as before, and now Confidence
(levies passed into household prices lower it, §6.4). **Got round by:** lobbying (a carve-out), litigation (a delay),
concealment (levied and capped on reported figures). The duty's catch line gains its Act II clause through `catchAfter`
on the `chair` feature: "Pryce Consolidated will pay it on the barrels it reports."

### 6.2 The standard, the loophole ladder, and amendment

A **standard** is a measure lever with a ladder of loopholes (no new lever kind: `LeverDef.ladder`). Motion's mileage
rule (M3) becomes the first.

- **Tempts:** the standard is cheap in Mandate, popular (efficiency is nobody's enemy) and visibly works on the gauge
  that matters to the Ministry's critics: miles per gallon.
- **Costs:** a mile gets cheaper, so there are more of them (the M3 bite, unchanged), and once the standard binds, Pryce's
  cheapest answer is the open rung of the ladder.
- **The ladder (Motion)** [S, `restraint.md` §5.1; Knittel 2011]:
  1. *Light trucks.* Vans and four-by-fours are counted separately; demand migrates to the heavier vehicles.
     **Amend:** "Count every vehicle under 8,500 lb" (Mandate, five model years of drafting while the vans keep coming).
  2. *The footprint rule.* The amended standard sets easier targets for larger vehicles, so the fleet grows larger
     (the 2011 footprint standards, `restraint.md` §5.1, marked there "not re-checked": the content lane checks it before
     a card names it). **Amend:** "A single target, whatever the size".
  3. *Robust only when paired.* The last rung is closed by a duty in force, not by drafting: with the fuel duty
     escalator raised the price of a mile reaches every category, and evasion stops paying. (`LoopholeDef.closedBy`.)
- **The ladder (Plenty):** on the abstraction licence (a cap on water applied): 1. *Unlicensed wells* (pumping moves to
  boreholes nobody meters); amend: "Meter every well". 2. *Robust only on the right gauge*: closed when the cap is written
  on water consumed (§6.7). (The third rung of the long-game sketch, produce imported from Abroad, waits for M6.)
- **Amendment** costs Mandate and drafting time; the loophole stays open while it drafts; an amendment can be drafted in
  Opposition and passes the day the Ministry returns. Ladders are short (two or three rungs) and end in a robust rung so
  it never reads as whack-a-mole (paradigm-shifts §1 risk).

### 6.3 Inspection and concealment (Ministry 2)

- **The verb.** Two Inspectors on the window sill. Tap an Industry's landmark in the scene (or its row) to send one:
  the true R is shown for ten model years ("Inspected 1961: true burn 14% above the return"), concealment found is fined
  (Mandate to the Ministry, Confidence +2, a headline), and Pryce's concealment resets to zero. An Inspector then rests
  five model years (100 s). The busiest verb of Act II, and its replacement for buying cards.
- **Tempts:** the fines pay Mandate, and finding a "clerical error" is the best headline a Minister gets.
- **Costs:** an Inspector's time; Statecraft and Institutions add Inspectors; Standing Inspection (a Statecraft node, a
  closing automation in the M2 sense) inspects one chosen Industry each decade on its own.
- **Got round by:** concealment, which begins only after `quietYears` (6 model years by default; Pryce's `drawn`
  reading moves it 4–8) and ramps slowly; the second Treaty's playbook makes it begin sooner.
- **The truth rule.** Decades, clear skies and Steady State are judged on true R; the decade strip shows "uncertified"
  over any decade in which nobody inspected, so the player knows when their reading is a guess.

### 6.4 Confidence, elections, pledges and Opposition

- **Confidence** (0–100) is the polling line in the masthead. It relaxes each model year toward a level set by:
  wellbeing above the target (up); the share of household prices that is levy (down; recycling a levy as a dividend
  offsets it); jobs lost (Pryce's income below his peak this Ministry, less what compensation covers: down); Commons
  (up); lobbying (down while Pryce lobbies); one-offs for fines found (+), crises (−) and a crisis well handled (+, the
  political window of Act I).
- **Elections**: the first after ten model years, then every fifteen. Three model years before polling day the
  manifesto sheet offers three **pledges** (drawn deterministically from those eligible); the player keeps two. A pledge
  buys Confidence and binds the player's hands for the next Parliament ("No new taxes on motoring": Motion's duty cannot
  rise). Ignored, the sheet resolves to the first two (content puts the mildest first). At polling, Confidence plus the
  pledges' bonus at or above 50 returns the Ministry (a Mandate bonus); below, the Ministry goes into Opposition.
- **Tempts:** pledges are cheap Confidence; a high Treasury buys Commons and compensation that win elections.
- **Opposition** is a Parliament out of office, not a game over: the player's levers cannot rise; the incoming
  government repeals one level of the lever that costs Pryce most (unless an Article ratchets it); amendments may be
  drafted; **Campaign** turns Mandate into Confidence. **Two lost elections in a row end the Ministry** (a new
  `ReckoningCause`, 'defeated').
- No real parties, no living politicians, no left or right: "the Ministry" and "the Opposition" (D4).

### 6.5 The Treasury (Ministry 2, mid-run)

- In a Ministry the player's money is the Treasury: `taxShare` of Pryce's income plus the levy revenue routed to it.
- **Spends on:** the Commons (as before), **compensation** (pays Pryce's displaced workers; holds Confidence through a
  closure for ten model years), subsidies (§6.6). No card is bought with it.
- **Tempts:** the more Pryce burns, the richer the Treasury: abstaining fills it fastest (exit criterion 8 makes sure it
  does). **Costs:** a cap that works shrinks it (the Acid Rain joke, `restraint.md` §2.1: a market that succeeds earns
  nothing).

### 6.6 The subsidy (with Plenty, Ministry 3)

A new lever kind, `subsidy`: the Treasury pays a share of the cost of named efficiency cards when Pryce buys them, so he
buys them sooner.

- **Tempts:** popular (Confidence on enactment), cheap in Mandate, and the "water applied" gauge falls at once.
- **Costs:** Treasury money, and the rebound: Plenty's drip subsidy cuts the return flow that recharged the aquifer and
  cheapens each crop, so the water **consumed** rises (Grafton et al. 2018; Pfeiffer & Lin 2014 for Kansas: the shift to
  more efficient irrigation increased groundwater extraction through changes in what was planted [S, checked]).
- **Got round by:** nobody needs to get round it: Pryce takes it gladly. It is the government's own rebound, and the
  lever's catch line says so without a lecture: "Every field uses less water. There are more fields."

### 6.7 The charge (Ministry 4, at the Reckoning)

A new lever kind, `charge`: a price on the service itself, per unit, fixed when enacted (unlike the duty, which tops
the price back up as η rises).

- **Tempts:** it reaches every category (vans pay the congestion charge too), so it closes ladders the standard opens.
- **Costs:** the steepest Confidence cost on the day, which turns into support after about a decade in force (Stockholm:
  about 36% support before the trial, a majority in the city's referendum after, over 70% by 2013 [S, `restraint.md`
  §7.2]); and, in Motion, reallocated slack (London: road space handed to buses and works, congestion back near its
  old level within a few years while volumes stayed lower [S, §7.1]), as a side effect unless paired with walking
  distance.
- **In Plenty** the charge can be written on water applied (metered at the pump, cheap, popular) or on water consumed
  (needs the Water Resources Board's accounts, an Institution): the choice of gauge is the lesson (§7.3).
- **Got round by:** lobbying (it is the most visible rule) and litigation.

### 6.8 Statecraft (Ministry 3, at the Reckoning)

The government's Know-how tree, bought with Hindsight between Ministries, about ten nodes in three tiers with one fork:
Parliamentary drafting (amendments draft faster) **or** the Inspectorate (an Inspector more); Standing inspection (one
Industry inspected each decade unasked: closing automation); Whips (four pledges offered, keep two); Polling (the
Confidence forecast to polling day on the line); the Compensation fund; Treasury solicitors (litigation delays halved);
Heavier fines; Plain words (a charge's support arrives sooner). Priced so that every Ministry buys two to four (§9.1).

### 6.9 The Treaty, Precedent, Articles and playbooks (the Reckoning after the first settlement from the Chair)

- **The Treaty** is the second-layer reset (Take office was the first). Offered between Ministries once an Industry has
  been settled from the Chair. It pays **Precedent** for the Ministries since the last Treaty (certified decades,
  settlements from the Chair, Parliaments won, wellbeing-years) and wipes Hindsight, Statecraft and Institution levels.
- **Articles** (bought with Precedent, kept for good): *An Independent Inspectorate* (one Inspector more, for ever);
  *The Ratchet Clause* (no lever is repealed in Opposition); *The Statistics Act* (Pryce's quiet period is four years
  longer); *Fixed-term Parliaments* (terms of twenty years instead of fifteen). Four in M5; M6 adds Abroad's.
- **Playbooks**: at each Treaty Pryce learns one: *Self-reporting* (concealment begins two years sooner) and *Friends in
  the Press* (lobbying a third cheaper) in M5. The player buys Articles; the rival learns tricks; each Treaty changes
  what the player has to anticipate.

### 6.10 Letters

Act II's letters come from Sir Edmund Pryce (voluntary agreements, threats to close, offers to fund an Institution), the
Permanent Secretary (new cast: dry, procedural, always right about the drafting time), the Chief Inspector (new: a
former Alkali Inspector, laconic), Mrs Okonedo of the Fenland Growers (new; Plenty; practical, distrusts the subsidy
because she has seen what it did to her neighbours' wells) and the Leader of the Opposition (new; courteous, waiting).
Half of Pryce's letters are **wagers on the truth behind his returns** (§9.3).

---

## 7. Motion leaves Preview; Compute and Code stay; Plenty

### 7.1 Motion

Content changes, no new mechanic: Act II's `preview` flag comes off (with the office rule, §7.4); Motion's unlock under
the Chair is "office taken"; its levers gain the ladder (mileage rule) and the charge; its cards become Pryce's; it gains
a **growth tail** so that an unopposed Pryce keeps growing past minute 15 (repeatable capital cards that raise demand:
"New model year", "Hire purchase" made repeatable; one or two calendar-dated uses: "The school run" 1970s, "Motorway
haulage"); pledges (six); Pryce's letters for Motion; the exempt-vehicle application (light trucks) that only Evade
founds. Numbers: an unopposed Pryce reaches The Summer Smog in 18–35 minutes; oil does not run out before minute 120
(criterion 5).

### 7.2 Compute and Code

Unchanged as Previews in industrialist runs (before Take office); not openable in a Ministry; their tabs, for saves that
opened them, become a sealed postcard ("The Attention Age · in preparation · your record: Code settled 1 time") with
their Archive notes kept. They return in M8 under agents (owner question Q1).

### 7.3 Plenty (1909–2000)

Calories · groundwater (a stock: the aquifer) · nitrogen (the pressure: fertiliser runoff). Seed-catalogue art (§11).

- **The mechanic: hidden flow, and two honest gauges.** Each unit of water applied to a field partly returns to the
  aquifer (the return share). Plenty's efficiency cards (centre pivot, drip, precision agriculture) raise crop per unit
  applied **and lower the return share**. The farmer's cost follows water *applied* (pumping), so efficiency cheapens
  food a great deal; the aquifer follows water *consumed* (applied × (1 − return share)), which falls far less per crop,
  or rises, and rises with every acre the cheaper water brings into use. **Water applied** and **water consumed** are both
  true and both shown; they move in opposite directions under the drip subsidy. [S: Grafton et al. 2018; Pfeiffer & Lin
  2014.]
- **Teaches:** an accounting illusion: the gauge you are paid to move can be the wrong one. As government the player
  meets it as the classic subsidy that raises water use.
- **Rebound named:** hidden flow (new).
- **Regimes on the applications.** Each application shows whether it is in the *elastic* regime (cheaper food clears
  more land: Jevons) or the *saturated* one (cheaper food spares land: Borlaug), read from its adoption curve; no new
  arithmetic, a label.
- **Applications (six):** Bread grain · Fertilised fields · Meat & dairy · Irrigated orchards · Air-freighted produce ·
  Biofuels (the last two late in the Age).
- **Chain:** Haber–Bosch (1913) → Tractors (1917) → Hybrid maize (1930s) → Centre pivot (1950s*) → Dwarf wheat (1960s) →
  Drip (1965*) → Precision agriculture (1990s). (* the content lane verifies before a card prints a date.)
- **Levers:** abstraction licence (cap on applied; ladder §6.2); consumption cap (cap on consumed; visible with the Water
  Resources Board); drip subsidy (subsidy; rebounds); diet (sufficiency); dryland farming (substitution); the water
  charge (charge, Ministry 4); a fertiliser duty.
- **Opens:** Ministry 3, mid-run, under Pryce. Land as a bounded stock (the long-game sketch) is cut (§13).

### 7.4 How Act II's rules switch on

`ActDef.chair = 'government'` on Act II. Before office is taken, Act II's Industries open as Previews under Act I's rules
(as M4); from Take office they open under the Chair and are not Previews. Act III keeps `preview: true` and is closed in
Ministries (`ActDef.closedInOffice`). Contract: `design/m5-contract-notes.md` §1.

---

## 8. The unfolding in M5

The M4 rule continues: at most one arrival at a Reckoning and one mid-run (the 25–29-minute window), never within five
minutes; an Industry opening is its run's mid-run arrival.

| Run | At the Reckoning | Mid-run | Notes |
|---|---|---|---|
| 10 (capstone run) | (M4) | Motion as a Preview | M4 as built |
| Ministry 1 | **the Chair** (Take office) | **loopholes** (once the mileage rule binds) | the shift's moment |
| Ministry 2 | **inspection** (and Pryce's concealment) | **the Treasury** | |
| Ministry 3 | **Statecraft** (shop) | **Plenty opens** | its subsidy and water gauges come with it, as an Industry's kit does |
| Ministry 4 | **the charge** | — | |
| Ministry 5 | — | — | Motion's settlement from the Chair (no new system: a year to play what has arrived) |
| next Reckoning after a Chair settlement | **the Treaty** | — | Articles with it |

Pryce's response table unfolds with the player's instruments: Comply, Lobby and Litigate from Take office; Evade with
loopholes; Conceal with inspection. He learns as the player learns. Targets: Plenty opens by hour 23 for every scripted
player; nothing in the table arrives in a run that already opened an Industry.

---

## 9. Designed against M4's weak points

### 9.1 No stretch that is mostly saving for one purchase

M4's hours 8–15 waited on the Settlement Commission (5,500 Hindsight) **[M]**. In M5:

- **No Act II gate is a currency threshold.** Plenty, the charge and the Treaty open on milestones (Ministries served,
  a settlement from the Chair), never on Hindsight or Precedent saved.
- **Parliament's room is not a gate**: capstones use no room and Act II has two Industries against `settleMax` 3.
- **The Statecraft tree is priced to the Ministry:** its tier-1 nodes cost about a third of a median Ministry's
  Hindsight, tier 3 about one Ministry's; every Ministry buys two to four things (criterion 16).
- **Take office resets Hindsight and Institution levels** (D2), so the shop is full of affordable things again exactly
  when the player starts a new kind of run.

### 9.2 Burning must not pay too well against restraint

In Act II the burner is Pryce; the player's version of burning is letting him (abstaining, or legislating naively). M4
measured burning at 0.6–0.7 of restraint's Hindsight a minute **[M]**. Targets: `abstain` ≤ 0.4× and `naive` ≤ 0.67×
`steward` [J]. How:

- Hindsight in a Ministry keeps wellbeing-years ÷ intensity^e (an abstaining Ministry's high wellbeing is divided by its
  high intensity), and **certified decades are worth more than uncertified wellbeing**: content raises
  `perBudgetDecade` for Act II Industries; a new term pays Parliaments won (a hawk wins none; an abstainer wins many,
  so the term is small).
- **The temptation is real and visible:** the abstainer's Treasury is the largest (criterion 8) and his Confidence the
  highest until the first crisis. The steward is poorer and better.
- **Crises cost Confidence**, and an unopposed Pryce causes them (criterion 5), so abstention wins the first election
  and loses the third.

### 9.3 Letters must matter to every style of play

M4's burner met three letters a run and +2.2% from thinking **[M]**. In Act II:

- **Ministries are long for every style but the hawk** (who loses office), so every regulator meets the dispatch clock.
- **At least one wager a Parliament**, guaranteed by a Pryce letter whose `when` is "no wager answered this
  Parliament" (content, `answered` leaves).
- **Pryce's wagers are bets on the truth behind his returns**, which inspection reveals: "Sir Edmund offers to report
  monthly in exchange for fewer inspections." *Accept* pays if his concealment is under 5% now (the thoughtful player
  inspected last year and knows); else it is the Ministry that has been had. "Pryce will fund the Inspectorate's new
  laboratory" pays if he has nothing to hide. The player who reads "last inspected" wins; the one who does not, loses.
- Stakes as M4's finish (`hindsightShare` ±0.022) and a target of thoughtful ≥ 1.05× default ≥ random for `steward`,
  `naive` and `abstain` (criterion 17).

---

## 10. The page

- **The Ministry window** frames the scene in every Ministry: a thin airbrushed frame (mullions at the top corners, not
  a border that eats the picture at 390 px) and a **sill bar** under the picture holding the Inspectors (tap to arm, then
  tap a landmark; greyed with a cooldown ring while resting) and the Confidence sparkline with the next polling day.
- **Pinned gauges**: Efficiency and Consumption as before, Consumption lettered "as reported" with a "true" tick when an
  inspection is in force; Confidence joins the masthead as a third small line.
- **Lever cards** gain **Pryce's answer** (one line, with a glyph per response and its cost; tap for the ranked list),
  a pledge lock ("Pledged: not this Parliament"), a court notice ("Litigated until 1967") and a carve-out mark.
- **Loophole cards** (under the lever): the rung, the exempt thing, the drafting cost and time, and a progress bar while
  drafting.
- **Pryce's panel** (one card per Ministry, folded by default): his articles (§5.2), his five readings and where they
  came from, his capital, his next purchase, and his last answer to each rule.
- **Pryce's order book** replaces the card list in each Industry: one folded line, opened to a read-only list.
- **The election sheet**: three pledge cards, keep two, one tap each; resolves itself if ignored; never modal.
- **The Treasury** line in the purse's place; compensation as a button on an Industry when jobs are being lost.
- **Plenty's widget**: two gauges side by side, *Water applied* and *Water consumed*, with the return share between them
  and each lever card naming the gauge it is written on.
- **Take office**: the sequence in §3.1; the prospectus card; the file card.
- **Opposition**: curtains half drawn in the window frame, the player's lever signs grey, the Campaign button.
- **The Treaty**: a second shop tab (Articles, Precedent), as the Hindsight shop is.
- **Folding**: Pryce's order book (one line per Industry) more than pays for the new cards; the late-Ministry fixture's
  scroll height is held at or under the M4 late-Act-I baseline (criterion 21).

---

## 11. Scene, art and sound

- **The Ministry window** (`ui/scene/frame/ministry.ts`, shared by every Act II scene and the capstone in a Ministry):
  airbrush mullions and sill in the Great Acceleration's palette; curtains in Opposition. It sits outside the scene's SVG
  band (a wrapper), so it costs no repaint of the band.
- **Pryce in the landscape** (props shared across styles): hoardings that go up with lobbying, a court notice on a
  lever's sign, Pryce bunting on the capstone works, the inspector figure walking to a landmark and back, the exempt
  thing per loophole (vans on the motorway; an unmetered borehole with a pump-jack in Plenty), the concealment split (the
  scene's sky honest while the gauge reads clean).
- **Motion in `chrome`**: unchanged layout; the exempt vans; the congestion-charge gantry; Pryce Motors on the
  hoardings.
- **Plenty in a new style, `seed`**: the seed catalogue and agricultural print, 1910s–50s: flat stone-litho colour a
  little out of register, crop rows as decorative bands, centre-pivot circles seen from a low hill, a root-and-aquifer
  cut-away with the water table as a line that falls, irrigation drawn down and return flow drawn back up (thinning with
  drip), the Dust Bowl as the paper yellowing at high pressure. One country throughout: the same river and hills as the
  valley. ≤ 1,900 SVG nodes.
- **Take office**: the thaw from grey to colour inside the frame is done by the 10 Hz timer in a few steps (no rAF loop,
  no CSS animation inside the SVG; the frame's own entrance may use a transform on the wrapper).
- **Art across Ages**: M5 adds the airbrush frame and the seed catalogue; the cyberpunk city remains Code's (M8).
- **Sound** (generated, off by default): the Ministry room (a clock, traffic through glass), polling night (a murmur and
  a count bell), the inspector's stamp, a hoarding pasted up, a court gavel once; Plenty's wind in wheat, a pivot's hiss,
  a pump's thud slowing as the water table falls.

---

## 12. Towards the second ending, and what M5 seeds

**How far M5 goes towards the Act II ending.** The Act II ending (the consumption ledger within budget for fifty years
across the Age, about hour 50) needs the consumption ledger and Abroad (M6) and the Act's other two Industries (Comfort,
Freight & Flight, M6). M5 delivers the Chair and two of the Age's four Industries, Motion and Plenty settled from the
Chair, and the Treaty. It takes the game to about hour 28–30, a little over half of Act II. No credits in M5. The
Act's checklist reads "The Great Acceleration: Motion settled, Plenty settled; Comfort and Freight in preparation".

**Seeds for The Second Ledger (M6).** Pryce's response table is open by kind (`offshore` joins it); the official gauge
already says "as reported" (M6 adds "as consumed"); the third rung of each ladder is the Abroad rung, written in the
design but not built ("credits bought from Abroad"; "produce imported"); Plenty's air-freighted produce and biofuels are
the uses that will go abroad first; the Treasury's taxShare is the incentive a government has to welcome offshoring.

**Seeds for The Inheritance (M7).** Articles are the first thing that survives a reset by the player's choice (rules
persist; M7 makes the world persist); Pryce's profile is a past run read forward (M7 hands it to an heir: the next
generation of Pryces); the capstone is inspected, so persistence already decays without attention; `MetaState.world` is
untouched by M5 (Pryce's state is run-scoped; Articles and Precedent live with the player's knowledge in `meta`, not in
`world`).

---

## 13. What is cut, and why

| Cut or deferred | Why |
|---|---|
| Abroad, offshoring, the two ledgers, the border adjustment | M6's shift (roadmap revision). |
| Capture and Independence | The most abstract response, best met once Institutions are rebuilt and with Abroad's trade lobby; M6. [J] |
| The `ban` lever kind | Belongs with Montreal in Comfort (M6). |
| Compute and Code in Ministries | Act III's (Q1). |
| Plenty's land as a bounded stock | The two water gauges are the lesson; land would be a second mechanic in one Industry. The regime label covers Borlaug against Jevons. |
| Public research (Treasury-funded efficiency Pryce takes free) | A good rebound, but a fifth Treasury verb; M6 with Comfort's appliance standards. |
| Eight of the roadmap's twelve Articles, four of six playbooks | Four and two are enough to make the Treaty a choice. |
| Twenty of the roadmap's 30 pledges (12 kept: 6 Motion, 4 Plenty, 2 general) | Elections draw three; twelve is enough variety for five Ministries. |
| Act II Histories | Histories are optional and were not shown to fill gaps (M4 §13). |
| A campaign budget and polling detail | One Campaign button in Opposition; Polling is a Statecraft node. |
| **Cut first if the milestone runs long** | (1) the Treaty, Precedent, Articles and playbooks (−3 days: the M7 seed moves to M6); (2) the charge (−1.5); (3) Statecraft's fork and Standing inspection (−1); (4) Plenty's scene style drawn as a re-palette of `chrome` (−2). Never cut: Take office, the answer line, inspection, loopholes, elections. |

---

## 14. Proposed amendments to `design/roadmap.md` and `design/paradigm-shifts.md`

For the coordinator to apply if accepted (I have not edited either file):

1. **Roadmap M5 heading**: "The Other Chair (layer 2: the Treaty as government; Motion re-ruled; Plenty)".
2. **Order of Act II**: Motion at Take office (about hour 17), Plenty in Ministry 3 (about hour 21–23); Comfort and
   Freight & Flight in M6. `long-game.md`'s progression map rows "Take office", "Plenty" and "Motion" swap accordingly.
3. **Compute and Code** stay Previews in industrialist runs and close in Ministries until M8 (D3 grandfathering amended,
   pending Q1).
4. **Contract list**: replace the roadmap's with `design/m5-contract-notes.md`. Notable departures: no `standard` kind
   (a measure lever with a ladder); new kinds `subsidy` and `charge`; `ban` and `borderAdjust` to M6; `setIndependence`
   to M6; `MetaState.articles`, `precedent`, `treaties`, `playbooks` as the roadmap says.
5. **Elections**: term 15 model years, first 10 (paradigm-shifts §1 said 10; its worked example still holds with "an
   election in two minutes").
6. **Rival**: "the Market's payback rule with Pryce's purse" replaces "the `efficiency` strategy moved into core";
   profile gains `pliant`.
7. **Exit criteria**: §15 below (25 criteria) replace the roadmap's six; the roadmap's "first loophole within 6
   minutes" becomes "within the first Ministry's mid-run window (25–29 minutes)", as the unfolding rule requires.
8. **Size**: about 46.5 agent-days, 43.5 without the Treaty (roadmap: 29). The difference: Motion's re-rule and growth tail (+2), Plenty's own art
   style and mechanic (+4), the answer line and Pryce's panel (+2), the M4-style finishing pass (+2), audio (+1.5), the
   contract's realistic size (+1.5), and a fuller UI (Treasury, Opposition, file card: +2); paid back in part by moving
   capture to M6.
9. **paradigm-shifts §1**: amend "The trigger" (the invitation at the first Reckoning after the ending with Motion
   run), "The rival" (the Market's rule; `pliant`; the answer line), the response table (no Offshore or Capture until
   M6), "Abroad" (already marked M6), Plenty's place, and add the reach-backs of §3.2 of this document.

---

## 15. Exit criteria (for the balance lane to turn into tests)

"Scripted players" are `mixed`, `budget` and `human` with M4's flags (`--commons --unlocks --dispatch=thoughtful
--survey=board`) and, from Take office, a regulator strategy. **Regulator bots** (new, in `tools/strategies/`):
`abstain` (never touches a lever), `naive` (raises the cheapest lever when Mandate allows; never amends, inspects or
compensates), `hawk` (every lever up as fast as Mandate allows), `steward` (reads Pryce's answer and pairs; amends as
rungs open; inspects on cooldown; compensates; chooses pledges that do not bind the lever it needs), `human` (steward
with reaction delays and imperfect pledges). **Rival profiles**: the default, each scripted player's own opening, and
20 from a seeded grid. [M] = argued from a measurement of the current game; [J] = design intent.

**Take office**

1. Take office is offered at the first Reckoning after the Act I ending with Motion open ≥ 5 minutes in the run just
   ended; every scripted player is offered it by hour 18.5. [M: ending 15.3–17.3 h; Motion at minute 5–10]
2. The prospectus card shows the player's own first-opening times and names (Playwright, from each `fixtures/m4/*`
   state with a first opening; a save without one shows the default text). [J]
3. After Take office: Hindsight 0, Institution levels 0 and loadout empty with Institutions still unlocked; industrial
   Know-how gone from the shop and Pryce's head start = min(cap, 1 + k × Σ levels) on every Act II Industry. [J]

**Pryce**

4. **Predictable:** in every regulator-bot run, every response Pryce makes to a newly raised lever equals the response
   `LeverView.rivalAnswer` showed on the step before the raise, unless the state changed between (then it equals the
   recomputed answer). Exact, as a core test. [J]
5. **Unopposed, he bites:** under `abstain`, Motion's first crisis comes 18–35 minutes into Ministry 1, and its oil is
   not exhausted before minute 120. [J, argued from M: today it saturates at 0.17 of collapse with no crisis in 90 min]
6. Concealment is never above 0 in an Industry inspected within its quiet period (exact). [J]

**Government against abstention, the temptation, the hawk**

7. `steward` earns ≥ 2.5× `abstain` and ≥ 1.5× `naive` Hindsight an hour over Ministries 1–5, against every rival
   profile. [J, against M: Act I burner/restraint 0.66]
8. `abstain`'s Treasury income over a Ministry ≥ 1.5× `steward`'s (the temptation is real). [J]
9. `hawk` loses an election within three Parliaments in ≥ 80% of profiles. [roadmap, J]
10. `abstain` wins the first election in ≥ 80% of profiles and loses one by the fourth in ≥ 50%. [J]
11. Opposition is playable: a `steward` that loses an election regains office within two Parliaments in ≥ 50% of the
    profiles where it lost. [J]

**Instruments**

12. **No single lever kind holds Motion within budget for a decade alone** against the default Pryce (ablation, as the
    roadmap). [roadmap]
13. **The ladder bites:** with the mileage rule at step 2 alone, Motion's R 30 model years later ≥ 0.95× the same start
    without it; with the rule and the duty at step 1, ≤ 0.85×. [J; Knittel 2011]
14. **Inspection matters:** a `steward` that never inspects completes ≤ 70% of the true decades of one that inspects on
    cooldown, over Ministries 2–5. [J]
15. **Hidden flow:** in Plenty, the drip subsidy at level 2 lowers water applied ≥ 10% and raises water consumed ≥ 10%
    within 30 model years; a cap on applied holds applied while consumed rises; a cap on consumed holds both. [J; Grafton
    2018, Pfeiffer & Lin 2014 for the direction]
16. **The charge's support turns:** its Confidence term is negative on enactment and positive after `years` in force
    (exact, content numbers). [J; Stockholm, `restraint.md` §7.2]

**Pacing, unfolding, saving, letters, decisions**

17. At most two new things a Ministry, never within five minutes; Plenty opens in Ministry 3 by hour 23 for every
    scripted player. [J, the owner's rule]
18. Longest gap between firsts (features, Industry openings, first loophole closed, first inspection finding, first
    election lost, first settlement from the Chair, the Treaty) ≤ 2.5 h from Take office to hour 28. [M: M4 measured
    2.65 and 3.10 h after hour 14 and missed 2.5]
19. **No saving stretch:** at every Reckoning from Take office to hour 28 the scripted steward buys at least one thing,
    and the median Ministry buys ≥ 2; no Act II unlock is priced in a currency. [J, answering M]
20. **Letters:** thoughtful ≥ 1.05× default ≥ random in Hindsight an hour for `steward`, `naive` and `abstain` over
    Ministries 1–5; every regulator but `hawk` meets ≥ 1 wager a Parliament. [M: the M4 miss for the burner, +2.2%]
21. **Decisions:** the `steward` makes ≥ 8 decisions in every 10 minutes of a Ministry and never goes 3 minutes without
    one. [J; paradigm-shifts §1's worked example counts 15 in 10]
22. **Hours:** Motion settled from the Chair at 23–27 h and Plenty by 30 h for `steward`-played scripted players; the
    Treaty offered by hour 28. [J]

**Save, page, performance**

23. v5 saves before the Act I ending, after it with Previews open (Compute and Code too) and at the ending load; office
    not taken; Compute and Code close only at Take office; a v6 round trip is lossless; a v7 save is refused. [J]
24. Scripted browser run at 390 × 844 on the real build: Take office from a fixture shows the prospectus and the file;
    the first Ministry reaches an election inside 4 minutes; an inspection shows reported against found; a loophole
    opens and an amendment closes it; Plenty's two gauges; Opposition's curtains. [J]
25. `build.ts --check` passes (first paint ≤ 240 KB gz; Act II prose in the late `text` part); `perf.budget.test.ts`
    passes with Pryce deciding (his yearly decision ≤ 2 ms per Industry; a step in a Ministry ≤ 1.25× M4's act1 step);
    `tools/perf.mjs --check` passes at fresh, mid, late, act1 and a new `ministry` state; Plenty ≤ 1,900 SVG nodes; the
    late-Ministry scroll height ≤ the M4 late-Act-I baseline. [the CLAUDE.md budgets]

---

## 16. Risks, and the cheapest experiment for each new mechanic

Every experiment below is for the **core lane on fixture content** (`src/core/fixture.ts` sectors, plus a small
two-application "motor" sector added there), **before** any content is written, and is reported as a number in
`design/scratch/m5-core-progress.md`. If an experiment fails, the design is revisited before the content lanes spend
on it.

| Mechanic | Risk | Cheapest experiment (core lane, fixture content) | Bites if |
|---|---|---|---|
| **Pryce = Market with his purse** | He saturates and stops, as the M4 Market does on Motion (§1) | E1: the fixture motor sector with one repeatable demand card; `abstain` for 60 min; log R and pressure per minute with and without the repeatable card | R still rising at minute 30 with the card; first crisis 18–35 min |
| **Response choice** | He always complies (rules too cheap) or always lobbies (Confidence too cheap) | E2: one duty and one standard with one loophole; sweep lever level 1–4; record the chosen response and its cost each year | each of comply, evade, lobby, litigate is chosen somewhere in the sweep; the answer line equals the action (criterion 4) |
| **Concealment and inspection** | Inspection is a chore that changes nothing, or concealment is invisible | E3: a capped fixture sector; `steward` with and without inspection for 30 model years; count true decades and the gap reported/true | never-inspect loses ≥ 30% of decades; the gap ≥ 10% at its peak |
| **Confidence and elections** | Everyone wins, or nobody can | E4: three bots (abstain, hawk, steward) on the fixture for six Parliaments with placeholder weights; plot Confidence | hawk under 50 by the third poll; abstain over 50 at the first; steward near 50–60 with a dividend recycle |
| **The Treasury temptation** | Abstention is not visibly richer | E4's runs: Treasury income per Ministry | abstain ≥ 1.5× steward |
| **The ladder and amendment** | Amending is whack-a-mole, or the robust rung is never reached | E5: the standard with a two-rung ladder; standard alone, standard + amend, standard + duty; R after 30 years | alone ≥ 0.95× baseline; + duty ≤ 0.85× |
| **Hidden flow (Plenty)** | Consumed does not rise, or the price effect swamps it | E6: one fixture sector with `hiddenFlow`; two cards (one lowers return share); subsidy on vs off | applied −10% and consumed +10% within 30 years |
| **The charge's turn** | It reads as a plain tax | E7: a unit test of the popularity curve and a 30-year Confidence trace | negative then positive inside `years` |
| **Head start** | Pryce's inherited Know-how makes the first Ministry collapse before the first election | E8: E1 with the act1-ending fixture's Know-how levels handed over | no crisis before the first polling day (200 s) |
| **The prospectus** | The times read badly (60 actions, all "another engine") | E9 (text lane, no core): render the template from the three `fixtures/m4` first openings and the default | the card reads in four lines; repeats are folded ("and another every twenty-odd seconds") |

Other risks:

| Risk | Likelihood · cost | Mitigation |
|---|---|---|
| **Act II reads as whack-a-mole** | medium · high | Short ladders ending in a robust rung; the answer line shows the next rung before the player enacts; pairing closes a whole ladder. |
| **Pryce feels unfair** | medium · high | He acts only on visible state, his table and costs are printed, his concealment has a printed quiet period, and the answer line is exact. |
| **Elections nag** | medium · medium | Fifteen-year terms; one sheet, two taps, resolves itself; never modal. |
| **Losing the cards feels like losing the game** | medium · high | The busiest verbs (inspect, amend, pledges) arrive in the first two Ministries; criterion 21 counts decisions. |
| **Decades judged on truth read as cheating** | medium · medium | "Uncertified" on any decade nobody inspected; the scene's sky is honest; the official gauge is labelled. The Survey taught the habit. |
| **The prospectus seeding feels creepy** | low · medium | Game actions and game time only; shown once; funny. Default text if the owner says no (D2). |
| **Closing Compute and Code annoys M4 players** | medium · low | One line in the paper; sealed postcards keep their record; they return in M8. Owner decides (Q1). |
| **Two new art pieces regress performance** | medium · high | The frame outside the band; Plenty within 1,900 nodes; lanes measure on the real page with `tools/perf.mjs --check`. |
| **Contract gaps** (M4 needed seven) | high · medium | The contract notes walk every content lane's needs (§12 there); one amendment slot reserved in the contract brief. |
| **Pacing from bots, not people** | certain · unknown | The owner plays the Take office fixture and a Ministry-3 fixture before balance closes (Q8). |

---

## 17. Sizes (agent-days)

| Lane | Work | Days |
|---|---|---|
| Contract | `types.ts` M5 hunks, save v6, one amendment slot | 2 |
| Core A: the rival | `chair/rival.ts` (the Market rule with his purse, the response table, the answer line), concealment and inspection, loopholes and amendment, head start; experiments E1–E3, E5, E8 | 6.5 |
| Core B: office | Take office and the Treaty resets, Confidence, elections, pledges, Opposition, the Treasury, subsidy and charge kinds, hidden flow, Articles and playbooks, save v6, regulator bots; experiments E4, E6, E7 | 6.5 |
| Content: Motion | the re-rule, growth tail, ladder, charge, pledges, numbers | 2 |
| Content: Plenty | the kit (6 uses, 8 cards, 6 levers, ladder, pledges), hidden-flow numbers | 3.5 |
| Content: prestige and Act | ChairDef, RivalDef, Statecraft (10 nodes), 2 Institutions, 4 Articles, 2 playbooks, features table, acts | 1.5 |
| Text | 5 cast, Take office card and the Minister's letter, prospectus and file templates, 26 letters (14 Pryce, 10 wagers), 100 headlines, 24 Archive notes, Plenty's prose | 4 |
| UI | Ministry chrome and sill, answer line, Pryce's panel and order book, election sheet, inspection taps, loophole cards, Treasury, Opposition, Take office sequence, prospectus and file cards, Plenty widget, Treaty shop, folding | 7 |
| Scene | the window frame, Pryce's props, the exempt things, the concealment split, `seed` and Plenty's layout, the capstone under Pryce | 6 |
| Audio | Ministry room, polling night, stamp, Plenty | 1.5 |
| Balance | regulator bots against profiles, the criteria, retuning Motion's tail and Act II Hindsight | 4 |
| Finishing pass | as M4's: make what does not bite bite | 2 |
| **Total** | | **≈ 46.5** |

**Order.** The contract alone (2 days, with one amendment slot in week two for the gaps the lanes find). Then Core A
and Core B start together: Core A's first job is the shared candidate rule and the fixture, then experiments E1–E3, E5,
E8; Core B's E4, E6, E7. The content lanes start with the contract on words and structure, but tune no number for a
mechanic until its experiment has been reported (M4's hour targets were wrong at first build). The UI and scene lanes
start with the contract against the dev mock and Core B's fixtures as they land. Balance, then the finishing pass.

Slightly over the 45 ceiling; I argue for keeping it because two lanes (scene's `seed` style, Plenty's kit) are a new
Industry that the long game needs anyway, and the finishing pass is the line M4 proved necessary (two mechanics did not
bite until one). Cutting the first item of §13's list (the Treaty) brings it to about 43.5.

---

## Sources checked this session

- U.S. EPA, "EPA, California Notify Volkswagen of Clean Air Act Violations" (18 September 2015),
  https://www.epa.gov/archive/epa/newsreleases/epa-california-notify-volkswagen-clean-air-act-violations-carmaker-allegedly-used.html;
  EPA testimony (Grundler and Brooks, 8 October 2015),
  https://www.epa.gov/sites/production/files/2015-10/documents/epa-grundler-brooks-testimony-_oct_8_hec_oversight_hearing_-vw.pdf
  — the software sensed the test and switched on the controls; normal-driving NOx 10–40 times the standard; found by
  West Virginia University and the ICCT's road testing.
- Stigler, G. J. (1971), "The Theory of Economic Regulation", *Bell Journal of Economics and Management Science* 2(1):
  3–21, https://ideas.repec.org/a/rje/bellje/v2y1971ispringp3-21.html.
- Grafton, R. Q. et al. (2018), "The paradox of irrigation efficiency", *Science* 361(6404): 748–750,
  doi:10.1126/science.aat9314.
- Pfeiffer, L. & Lin, C.-Y. C. (2014), "Does efficient irrigation technology lead to reduced groundwater extraction?
  Empirical evidence", *Journal of Environmental Economics and Management* 67(2): 189–208, doi:10.1016/j.jeem.2013.12.002
  (western Kansas; the subsidised shift to dropped-nozzle pivots increased extraction through cropping changes).
- Knittel, C. R. (2011), "Automobiles on Steroids: Product Attribute Trade-Offs and Technological Progress in the
  Automobile Sector", *American Economic Review* 101(7): 3368–3399, doi:10.1257/aer.101.7.3368 (fuel economy could have
  risen nearly 60% 1980–2006 at constant weight and power; it rose about 15%).

Everything else marked [S] is from `design/research/` (with that file's own caveats: items it marks "not re-checked",
such as the 2011 footprint rule, need the content author's check before they reach a card). Plenty's dates marked * need
checking likewise.
