# M4 — "The Survey": the Coal Age complete (design)

Design lead's document, 20 Nov 2026, written while the M3 finishing agent lands M3. It designs what the roadmap calls
M4 ("Act I complete": Iron & Steel, Fishing, the Act I ending, re-gating) on the game **as M3 actually built it**, and
amends the roadmap where the measurements argue for it (§14). **Revised the same day** after the owner's decisions
(`design/m4-open-questions.md`): M4 is now designed as a paradigm shift, The Survey (§2A), and the prestige shift the
owner asked for is designed for M7 (§18). Companions: `design/m4-contract-notes.md` (the proposed
`src/types.ts` changes and save v5), `briefs/m4-*.md` (one per lane), `design/m4-open-questions.md` (the owner's
decisions, with what this document assumes meanwhile).

Throughout, **[M]** marks a claim argued from a measurement (with the file it comes from) and **[J]** marks my
judgement. Real-world facts are from `design/research/*.md` unless a source is given here; the four I checked this
session are listed in §16.

---

## 0. M4 in one paragraph

M4 finishes the first Act. The Coal Age becomes four Industries (Steam, Light & Current, **Iron & Steel**, **Fishing**),
and the first ending becomes the **Act I ending**: all four settled at once and held fifty years, at about 15–17 active
hours. Iron arrives in run 4 and teaches the **embodied** rebound: every use of cheap iron makes another Industry's
machines cheaper, so the coal is burnt somewhere else ("the order book"). Fishing arrives in run 6 and is the Act's
finale: a **renewable** stock that is safe to fish for ever until it crosses a line, after which it does not come back
for a long time (**hysteresis**), watched through a gauge that **lies** (catch per trip stays healthy while the stock
falls) until a survey is paid for, on banks shared with **foreign fleets** whose exclusion the home fleet fills. After
the Act I ending the Coal Age is **settled for good** (the capstone: defended, never replayed), and Motion, Compute and
Code, re-gated out of Act I, open as **Previews** of the later Ages under the industrialist's rules until M5 and M7 give
them their own. M4 also mends what M3 measured and missed: letters that reward reading the instruments, the restraint
player's quiet hours 6–14, systems that arrived after the ending, and a page that scrolls too far.

**The shift (§2A).** M4 is The Survey: the moment the player learns that a gauge is somebody's estimate and that a
resource is not theirs alone. It has a moment every player meets (the Board's first survey, printed against the
skippers' report), it reaches back (Steam's "years of coal left" turns out to assume nobody burns more next year;
every Industry's consumption gains the coal in its machines), and it changes every later run (budget lines are drawn
on the full account, so Iron's uses cost every fed Industry's line; the truth about the sea costs a seat or Mandate).

---

## 1. Where M3 leaves the game (measured)

From the M3 finishing runs (`design/scratch/finish/g4-{mixed,budget,human}.txt`, 26-hour campaigns, the final M3
content; `design/scratch/m3-finish-progress.md`; `design/unlock-schedule.md`):

| Fact | Figure | Consequence for M4 |
|---|---|---|
| All five Industries are open by about hour 3 for the human-like player (Light 0.7, Motion 1.4, Compute 2.3, Code 3.0 h) **[M]** | `human` unlock log | Hours 3–15 hold **no new Industry**. The Act's back half has only systems to look forward to. |
| Runs 5–7 are three-hour runs in which `mixed` and `budget` settle three or four Industries and then wait for Hindsight to buy the Settlement Commission **[M]** | `g4-mixed` runs 5–7: 180 min each, settled 3/3, 4/4, 4/4 | The restraint player's hours 6.5–12.5 are long stretches with frozen Industries. The ending's time comes from a Hindsight wait, not from play. |
| The longest gap between firsts before hour 20 is 2.7 h (`budget`) to 6 h (`mixed`, hours 13–19) **[M]** | `design/roadmap.md` M3 "Accepted miss" | M4's criterion of ≤ 2 h needs new things placed in hours 4–14. |
| Four M3 systems arrive **after** the first ending: the free price at 14.9 h, the Archive at 14.9 h, levers that bite back at 19.4 h, travel time at 12 h (human) **[M]** | `human` unlock log | Two of them are Motion's and Compute's mechanics; re-gating moves them into the Previews where they belong. The Archive and the bite must move earlier. |
| Letters: for the budget player, a thoughtful answer does not beat the default and random beats both; the largest single swing a letter makes is 0.8% of Hindsight per minute **[M]** | finishing note, item 4 (`pol2` runs) | Letters must carry stakes the instruments can read (§8). |
| Motion's sprawl alone sets when the last Industry settles (it clears in 40 minutes if the sprawl uses are never founded) **[M]** | `design/unlock-schedule.md`, M3 finish | Taking Motion out of Act I removes the ending's slowest, least legible gate and gives that role to Fishing, whose gate is the lesson. |
| A settled Industry's look and a lever's bite are on screen; Steam's seam section is "only just" legible on a phone **[M]** | `design/visual-direction.md`, M3 pass | Fishing's chart must be designed for 390 px first. |

What M3 left for M4 by name: persistent Settlement across Reckonings (the capstone), revivals (`UpgradeDef.when` is
ready), banked time (off), the History rules (kept), Wirth's law (M7, not here).

---

## 2. The decisions, and why

1. **Act I is the Coal Age's four Industries; Motion, Compute and Code leave it.** [J, supported by M] The Act I ending
   needs a set the player can see is complete and that sits in one period: the Coal Age ends in 1914, and Motion begins
   in 1950. Removing three Industries and adding two makes Act I four Industries over about 16 hours (one every four
   hours), against five in three hours today, which is the hours 3–15 problem in row 1 above. Owner decision D3
   recommended re-gating in M4 "when Act I has Iron, Fishing and an ending to fill 16 hours"; M4 is that moment.
2. **The three leave as Previews, not as nothing.** [J] M5 (Act II's rules) is not built when M4 ships. Taking Motion,
   Compute and Code away from a new player until M5 would shorten the game the owner has today. So after the Act I ending
   they open, in order, under the industrialist's rules they have now, labelled "Preview" (their Act's own rules arrive
   later), on top of the settled Coal Age. Saves that already opened them keep them in every run, also labelled Preview
   and not counted towards the Act I ending (D3's grandfathering). In the contract this is one content flag per Act
   (`ActDef.preview`), which M5 turns off for Act II.
3. **Fishing is the finale and carries hours 6–15.** [J, argued from M] Today's ending gets its time from a Hindsight wait
   in three-hour runs (row 2). In M4 the ending gets its time from Fishing: the first season under a lying gauge usually
   crosses the threshold (as run 1 always backfires in Steam), the scar lasts about an hour of play with Fishing open, the
   survey has to be seated or paid for, and the stock has to regrow to its clear level and hold fifty years. Every part
   of that wait is a decision, a gauge to read, or a lesson, and none of it is a clock.
4. **Iron opens in run 4, mid-run.** [J] Run 3 already brings the budget and its five-step unfolding, which the owner
   called confusing; it should not also bring an Industry (it brought Motion in M3). Run 4 brings the Commons at the
   Reckoning; Iron is its one mid-run arrival, about 2.5–3.5 h in, which is where `long-game.md` put it.
5. **The capstone is defended, never replayed.** [J] After the Act I ending every run opens with the four Coal Age
   Industries settled for good. They are never unsettled: a defence the Mandate cannot pay puts a capstone Industry **in
   arrears** (its smoke and catch rise with the excess, its sky darkens, wellbeing pays) until the defence is paid
   again. That keeps the D2 promise ("Act I is never replayed") without making defence toothless.
6. **Letters get stakes the instruments can read.** [J, answering M] A new kind of arm, the **wager**, pays one way if a
   stated condition about the world holds when it is answered and another way if not ("Pays if the shoals are as thick
   as the catch says"). The thoughtful player reads the gauges and wins; the careless one loses; the default stays
   modest. In Fishing the condition is about the true stock, which only a survey shows: the letter tests the lesson.
7. **At most two new things a run, and an Industry opening is one of them.** [J, the owner's direction] From run 4 a run
   brings at most one arrival at its Reckoning and one mid-run, never within five minutes; an Industry opening counts
   as the mid-run arrival. Fishing's own systems arrive over three runs (§5.7). Nothing of Act I arrives after the Act I
   ending; Motion's and Compute's mechanics arrive with the Previews.
8. **Fold what is finished.** [J, the owner's direction] Bought-out cards, maxed levers, settled Industries, the
   capstone and owned shop items fold to one line each; Industry tabs become a scrolling row of small postcards. A
   measured scroll height is an exit criterion (§15).
9. **No Take office in M4, and no Pryce acquisition beat.** [J] The credits close on the settled Coal Age and "The ledger
   continues". The acquisition and the Prime Minister's invitation (`paradigm-shifts.md` §1) are M5's opening: printing
   them now would promise a chair the game cannot yet offer. (Open question Q3.)
10. **M4 is a paradigm shift, The Survey** (§2A), added in the revision pass; and the prestige shift is designed now
   for M7 (§18), with M4 seeding it and leaving it room.

---

## 2A. The shift: The Survey

*Added in the revision pass (20 Nov 2026), on the owner's direction that every milestone from M4 on be a paradigm shift.*

M4 as first designed added two Industries with good mechanics. Judged honestly against "each one should be a paradigm
shift", it was two more tabs: the player's idea of what the game *is* did not change, because the lying gauge lived in
one tab and the order book was a line on Iron's cards. The coordinator's steer names the shift, and I agree with it:
until now every gauge was honest and every resource was the player's alone. M4 makes the player learn, once and
memorably, that both were assumptions, and then makes every later run be played knowing it.

**Name: The Survey.** *Before:* the gauges show the world as it is, and what I burn is mine and shows in my own tab.
*After:* every gauge is somebody's estimate, made on somebody's assumption, and what I burn is shared with people I do
not control and burnt in places I was not looking.

Why this and not another shift [J]: it is the shift the Coal Age's last two Industries teach by themselves (hysteresis,
hyperstability, the commons, the embodied rebound); it does not pull the Other Chair forward (the player is still the
industrialist); and it is the bridge Act II needs, because the Other Chair's inspection, concealment and two ledgers
are this lesson made into a government's verbs. A player who has had The Survey arrives in Act II already distrusting
a clean official gauge.

### 2A.1 The moment: the Board's Survey

**Guaranteed, once.** Every player meets it in the run Fishing opens (run 6, about hour 6–7.5): the Fishery Board makes
its **first survey free** (a ten-model-year survey, by rule) at Fishing's first poor season, or thirty minutes after
Fishing opens, whichever is first. The player does not have to buy the truth the first time; they have to buy it every
time after. (Contract: `RenewableDef.firstSurvey`.)

**On screen before.** The Fishing tab as it has been for twenty or thirty minutes: "Catch per trip" at, say, 74% and
green; the chart thick with stipple; the cheap supper selling; foreign sails on the banks; the sparkline with no sink
line. In the picture the gulls over the fleet have thinned and the surface shoals have gone. Nothing on the page has
said anything is wrong, because nothing on the page measures the sea.

**The beat** (about eight seconds; the game keeps running behind it, as the Proprietor's Day card does):

1. A small survey vessel puts out from the harbour in the scene; the paper prints the first line.
2. A card opens over the panel, in the harbour engraving's frame, set as two columns of one page:

   | The skippers' report | The Board's survey |
   |---|---|
   | Catch per trip: **74%** of the old figure | The stock: **19%** of its natural size |
   | "The shoals have never been thicker" | Young fish: few in the samples |

3. On the chart behind it the stipple drains from the reported density to the surveyed one, left to right, once.
4. The card's footer, the reach backwards (§2A.2), in the paper's voice.
5. One button: **File the survey**. The card closes; the true gauge stands beside catch per trip; the sink line is drawn
   on the sparkline, below where the fleet has been fishing.

**The text** (house tone; numbers from the state; the template chosen by the size of the gap):

- Headline: "Board's survey finds the banks at a fifth of their former stock"
- Next headline, a step later: "Skippers dispute the survey; the catch per trip, they say, is excellent"
- Card body: "The Board's vessel has trawled the banks on a grid, as the skippers do not. Where the fleet finds fish it
  finds them as easily as ever: the shoals that are left are where the fleet goes. Between them the sea is empty."
- Footer: "The Statistics Office, asked how its own figures were made, publishes two notes. Coal will in future be counted
  where it is used as well as where it is burnt: the coke in a mile of rails is the railway's. And ‘years of coal left’
  has always meant years at this year's rate."
- If the gap is small (a careful fleet): "Board's survey finds the banks somewhat below the skippers' figure", and the
  body's last sentence becomes "The difference is not large. The Board notes that it will grow."
- If the banks have already failed: "Board's survey confirms what the fleet will not: the banks are empty", and the
  body ends "The Board does not expect a season soon."

After ten model years the free survey lapses: the true gauge goes blank again, lettered "No survey since {year}". Having
seen the truth once and had it taken away is the reason to pay for it.

### 2A.2 What reaches backwards (feature `estimates`, arriving with the moment)

Nothing that was on screen before was false, and the game must not pretend otherwise; but two things the player already
trusted were figures on an assumption, and the moment says so. Both are cheap and both are honest.

1. **"Years of coal left" splits in two** (every stock Industry: Steam's coal, and Iron's share of it). The gauge the
   player has read since minute one becomes "At this year's rate: 140 years · At the rate it is growing: 31 years". The
   first figure is the old one, unchanged: it always assumed nobody would burn more next year, and the formula sheet now
   says so. The historical anchor: the Royal Commission on Coal Supplies (reported 1871) found coal "abundant", and a
   1901 retrospective put its main error down to assuming exports would stay flat [S, `research/energy.md` §1.5]; British
   output then nearly tripled to its 1913 peak [S]. (Contract: `SectorDerived.yearsLeft`.)
2. **Every Industry's consumption gains the full account.** The consumption gauge in every Industry gains a second,
   fainter needle: "counting the coal in its machines" (the coke Iron burnt for the rails, plate and girders it was fed,
   by Iron's order book) and the power it draws (Fishing's trawlers on Steam's coal). Iron's own needle falls by what it
   hands on; Steam's rises; the totals agree. The order book stops being a line on Iron's cards and becomes a figure on
   every tab. (Contract: `SectorDerived.fullR`, `embodied`.)

### 2A.3 What the player does differently afterwards, in every run

- **Every new budget line is drawn on the full account** (feature `estimates` on). Steam's line now holds Steam's chimney
  *and* the coke in its rails; Light's holds the steel in its gasholders. So from that moment Iron's uses are a cost on
  every fed Industry's line, in every run: the player chooses which uses of iron to found knowing whose line pays, or
  settles Iron first to freeze its feeds, or draws Steam's line Severe to make room. Lines drawn before the moment keep
  the account they were drawn on (labelled). Clear skies, which are about the local sky, are unchanged. (Contract:
  `BudgetState.account`.)
- **The truth costs a seat or Mandate in every run once Fishing is open**: the Fishery Board competes for a loadout seat
  with everything else, or survey cruises carry Mandate upkeep, or a letter buys a season. Fishing cannot be settled
  without it, so the Act I ending needs it.
- **Lines are drawn earlier**: the growing-rate figure (31 years, not 140) is the first thing on Steam's panel in a new
  run. [J: a soft change; the full account is the hard one.]
- **Wager letters read differently**: Tench's "full holds" letter is a bet the player now knows how to read (§8).

### 2A.4 Cost and placement

About **+6.5 agent-days** (contract 0.5, core 2, content and text 1, UI 1.5, scene 0.5, balance 1). Paid for by cuts in §13
(the four new Histories, the Age dissolve, six letters, the three Commons projects, two revivals, four achievements:
about −4.5), so M4 grows from about 41 to about 43 agent-days.

The moment lands in run 6, which then brings Fishing (mid-run) and the moment (at least five minutes later) and nothing
else: the household survey and the Proprietor's Day move one run later, to run 7 (about hour 8–9; `long-game.md` said
"about hour 7"). The two reveals are kin (the instruments' figures; then your own) and are better a run apart.

---

## 3. Hour by hour

### 3.1 A new player (targets for the human-like player; `mixed` and `budget` about 10% later)

New to M4 in **bold**. Runs 1–3 are M3's, less Motion.

| Active h | Run | What happens | New things this run |
|---|---|---|---|
| 0–0.7 | 1 | Steam: the reveal, two levers and Mandate, the population gauge, exhaustion | (as M3) |
| 0.7–1.3 | 2 | The Market buys the routine cards; Light opens at 7–12 min; ambient news; more levers; the first letter | (as M3) |
| 1.3–2.4 | 3 | Charters; the budget and its unfolding (line, Tighten, dividends, pace, clear skies) in Steam and Light. **No Industry opens.** | Charters · the budget |
| 2.4–3.5 | 4 | The Commons at the Reckoning. **Iron & Steel opens at 10–20 min**: Hot blast is its first card; the order book shows that founding Rails makes Steam's engines cheaper and Steam's coal rise. First Steady State (Steam or Light) late in the run. | Commons · **Iron** |
| 3.5–5.5 | 5 | Settlement at the Reckoning (three at once). Seams at minute 20. **Iron's revivals** appear in Steam (Steel boilers, Steel rails) once Bessemer is owned. **Pryce the elder** writes from his ironworks. | Settlement · seams |
| 5.5–8 | 6 | **Fishing opens at about minute 20**: fresh fish by rail, fried fish shops; "Catch per trip" is the only stock gauge; Huxley's card. Foreign sails on the chart as fishing power grows; the fishery limits lever. **The first season usually crosses the threshold**: "The banks fail". **The Board's Survey** (the free first survey) at the first poor season or 30 minutes in: the skippers' report against the survey; Steam's years-left splits; every Industry gains the full account. The Archive's first Fishing note is Garstang (1900). | **Fishing** · **the Board's Survey** |
| 8–10 | 7 | The household survey at the Reckoning; the Proprietor's Day minutes later once a return is filed. **The Fishery Board** is in the Hindsight shop (the standing survey). Fishing opens **scarred** if the banks failed: the stock does not regrow for about an hour of open play whatever the quota. The load curve at minute 20. Steam, Light and Iron settled; room for the fourth needs the Settlement Commission (first sitting). New lines on the full account: Iron's Rails now cost Steam's line. | survey · load |
| 10–13 | 8 | Histories at the Reckoning. With the survey seated the true stock gauge and the honest sink line appear; the **quota from the survey** holds catch under regrowth; the fishery limits bite back unless the quota is in force. The scar heals; the stock regrows towards its clear level. The Archive at minute 20. | Histories · Archive |
| 13–17 | 9 (long) | Fishing reaches Steady State; all four settled; fifty years held. **The Act I ending**: credits, the retrospective Gazette, "The ledger continues". Levers that bite back may arrive mid-run if a lever has bitten. | bite |
| 17– | 10+ | **The capstone**: every run opens with the Coal Age settled. **Motion opens as a Preview** within minutes, with the travel dial; Compute, with the free price, a run later; Code after. Capstone defences against Motion's spill into Light. | Previews, one a run |

### 3.2 A player arriving with an M3 save

- **Before the M3 ending.** Their Motion, Compute and Code stay open in every run as Previews (unchanged rules, not
  counted towards the ending, labelled). Iron opens on its own conditions in their next run; Fishing in the run after
  the survey and Settlement have arrived. The checklist line now reads from the Act I set ("Settled 2 of 4. Fishing
  needs clear skies for 50 years").
- **After the M3 ending.** Their record stands (the retrospective prints it as "Everything settled, under the earlier
  rule"). The Act I ending is new to them: Iron opens in their next run, Fishing a run later; the credits come again at
  the Act I ending, with Act I's own lines.
- In both cases the broadsheet says it once: "Iron and fish join the Coal Age; Motion and the machines are shown in
  preview". (Text lane.)

### 3.3 What the player does that they did not do before

- **Choose which uses of iron to found** knowing each one makes another Industry's machines cheaper, and watch the coal
  rise there (Iron's order book). Settle Iron early to freeze its feeds; or found Machine tools and accept the bill.
- **Fish a stock they cannot see**, read a gauge they learn to distrust, and decide what to pay to see the truth
  (a survey cruise lever in the run, a Fishery Board seat between runs, a survey letter).
- **Exclude the foreign fleets and then restrain their own**, because their own fleet grows into the space.
- **Live with a scar**: a run in which one Industry cannot be rushed, which is a reason to tend the others.
- **Answer letters that are bets on the state of the world.**
- **Defend a finished Act** against a new Industry's spill, and read Previews of the later Ages.

---

## 4. Iron & Steel (1828–1914)

### 4.1 Identity

| | |
|---|---|
| Service · resource · pressure | iron and steel (tons) · coke, drawn from **Steam's coal** (the first shared reserve) · slag and smoke |
| Mechanic | **The order book** (inputs): each use of iron makes another Industry's capital cheaper |
| Teaches | the **embodied** rebound: efficiency in an intermediate good lowers the price of every machine made of it, and the coal is burnt where the machines are |
| Its own paper | the iron market report: prices current, furnaces in and out of blast ("Pig iron firm at Wolverhampton; three furnaces blown in") |
| Art | foundry lithograph (the `ledger` family in two printed colours: furnace orange over ink); the Black Country at night; slag heaps in the cut-away; Steam's viaduct seen from the other side |
| Opens | run 4 (≥ 3 Reckonings), 10–20 minutes in, when Steam owns the Cornish engine and Railways are founded (`unlock.when`; never a price gate) |
| Settles | as any Industry; settling freezes its feeds at their settled values |

Jevons's own iron sentence carries it [V, `research/energy.md` §1.2]: the "reduction of the consumption of coal, per
ton of iron, to less than one-third of its former amount, has been followed, in Scotland, by a ten-fold total
consumption", with "the indirect effect of cheap iron in accelerating other coal-consuming branches of industry". The
first half is direct rebound, which Steam already teaches. The second half has never been in the game; it is Iron's
reason to exist.

### 4.2 The mechanic: the order book

Each Iron application may **feed** one or more Industries: while it is adopted, the fed Industry's capital cost per unit
of service is multiplied by `1 − (1 − m) × a`, where `a` is the Iron use's adoption (0–1) and `m` its full-adoption
multiplier. "Machine tools" feeds every other open Industry. The fed Industry's price falls, its uses grow, its coal
rises; Iron's coke comes out of the same reserve. Settling Iron freezes the feeds at their settled values; settling the
fed Industry stops it being fed (it is not solved).

| Use (Iron) | Feeds | Full-adoption intent | Why |
|---|---|---|---|
| Rails | Steam | c × 0.85 | rails are the railway's largest capital item |
| Ship plate | Steam, Fishing | c × 0.92, × 0.85 | iron hulls: steamships, then steam trawlers |
| Bridges & girders | Light | c × 0.88 | gasholders, then power stations and tram depots |
| Machine tools | every other open Industry | c × 0.92 | the lathe makes every machine cheaper |
| Tinplate & cans | Fishing | c × 0.90 | canned fish keeps; the catch has a market inland |
| Barbed wire | none in Act I | — | pure demand now; feeds Plenty in Act II |

**Numbers' intent.** With Iron engaged, Steam's R thirty minutes after Iron opens is at least 1.15× what it is with the
feeds ignored (exit criterion 9) **[target]**, and Iron's own income is high enough that the burning player wants every
use (the temptation, ≥ 15% more income across Iron and the fed Industries when engaged). Under a drawn line, each Iron
use card carries the plain line M3 introduced ("Brings Steam's engines 15% cheaper: +9% coal in Steam this decade"),
and the order book widget lists, per fed Industry, what Iron is doing to its line now.

**What it tempts, what it costs.** Iron pays well and makes the other Industries pay better; under a held line the same
feeds push Steam and Light into their lines, which then cost Mandate to hold. The restraint player's answers: found
fewer uses, choose the Sheffield arm of the quality fork (fewer tons, longer-lived), raise the scrap bounty paired with
the coke duty, or settle Iron early and freeze the feeds.

**How it teaches without lecturing.** Nothing says "embodied". The order book is a goods yard: wagons lettered
RAILS → STEAM and PLATE → HARBOUR leave the scene; in Steam's own picture a second track is laid and a new engine
house goes up. The rebound meter in Steam keeps reading its own direct rebound, and the formula sheet for c shows the
feed factor as a line ("Iron & Steel: rails, × 0.88").

### 4.3 The kit (content lane brief has the full list)

- **Applications (6):** Rails · Ship plate · Bridges & girders · Machine tools · Tinplate & cans · Barbed wire.
- **Efficiency (coal per ton; 8):** Hot blast (Neilson, 1828: coal per ton of iron from about 8 to about 5 long tons
  [S]) · Raw coal in the furnace (the Scottish practice that followed; to about 3 tons, a fragmentary source:
  author checks) · Waste-gas heating* · Bessemer converter (1856; the paper was titled "The Manufacture of Malleable
  Iron and Steel without Fuel" [S]) · Siemens regenerative furnace (1860s) · Basic lining (Gilchrist–Thomas, 1878) ·
  By-product coke ovens* · Larger furnaces. Stages 0–3: the cold-blast furnace → hot-blast stoves → the converter shed →
  the open-hearth shop.
- **Capital (3):** Blow in another furnace (the repeatable growth card) · Rolling mill · Steam hammer*.
- **Forks (2):** **Sheffield crucible quality** (margin up, saturation down, longer life) / **Bessemer tonnage**
  (cheap, everywhere); **Acid lining** (Spanish ore, dear) / **Basic lining** (phosphoric ore, cheap, more of it).
- **Research (1):** *The Coal Question*, chapter VII on iron: no new mechanic; it adds the feed lines to the use cards
  (the order book's projections), as The Coal Question did for Steam.
- **Levers (5):**
  - **Coke duty** (duty). Catch: "A small tax on the ton of coal would be a heavy tax on the ton of iron", says Mr
    Jevons [V]; the ironmasters agree, loudly. (The quotation goes in the blurb; catch lines do not quote people.)
  - **Furnace licences** (cap).
  - **Build to last** (sufficiency): the Sheffield standard as policy.
  - **Scrap bounty** (circularity, the **rebounding lever**). Scrap returns a share of the coke to the reserve; its side
    effect is cheaper iron and more of it (satMul on Iron's uses) **unless the coke duty is in force**. Source: Zink &
    Geyer, "Circular Economy Rebound", *Journal of Industrial Ecology* 21(3), 2017 (checked this session): recycling
    that lowers the price of the material can raise total production.
  - **Smoke inspector** (substitution of cleaner coke at a premium; a modest lever, the restraint player's first).
- **Settle dividend:** Commons yield and a little wellbeing; blurb: "Ravensdale banks its furnaces to the order book and
  no further. The night sky over Dudley is the colour of night."
- **Pressure and crises:** slag and smoke. Crises: **The Orange Night** (0.4), **The Slag Slide** (0.7). (Not modelled
  on a real disaster with deaths; D4.)
- **Revivals (new cards in older Industries, `UpgradeDef.when`):** in Steam, **Steel boilers** (when Iron owns the
  Siemens furnace: Steam η × 1.15) and **Steel rails** (when Iron owns Bessemer: Railways' saturation up, Steam c down);
  (Steel gas mains in Light and Steel trawlers in Fishing were cut in the revision.) Each is a card the Market may buy: so the embodied rebound arrives in the older Industry by itself unless the player
  turns the Market off there.

### 4.4 Example text

- Tagline: "Coal goes in at the top, iron comes out at the bottom, and the order book is never full."
- Headlines (each ≤ 70 characters):
  - "Hot blast saves a third of the coke; ironmasters blow in three more"
  - "Rails quoted at a new low; four more lines promoted in a week"
  - "Ravensdale works lit all night; Dudley complains of the glare"
  - "Machine-tool makers report a lathe on every bench, and orders for more"
  - "Coke duty debated; ironmasters warn of ruin, then of Belgium" (the second clause is the joke: the threat of a
    rival abroad, which Act II will make real)
- A use card: **Machine tools** — "Planers, shapers and the slide rest. Every engine in the kingdom is cheaper to make."
- The order-book line under a held Steam line: "Rails make Steam's engines 12% cheaper to build. Steam's coal: +8% this
  decade."

---

## 5. Fishing (1880–1914; revival in Act II)

### 5.1 Identity

| | |
|---|---|
| Service · resource · pressure | fish landed (tons) · **the stock** (renewable) · depletion ("the empty banks") |
| Mechanic | **The banks**: a renewable stock with a threshold, a lying gauge, and foreign fleets |
| Teaches | that a resource can renew for ever unless you cross a line, and not come back if you do; that the instrument you trust can lie; that a commons shared with rivals is fished down by whoever is let in |
| Rebound named | direct (fishing power makes fish cheap) and **hysteresis** (past the threshold, the capacity to recover is what is spent) |
| Its own paper | harbour notes and landings ("Landings at Grimsby: 412 tons, prime cod firm") |
| Art | harbour engraving in the `ledger` family, with an Admiralty chart in the cut-away: soundings, the shoals as stipple; a scar is blank grey water |
| Opens | run 6 (≥ 5 Reckonings, Settlement arrived), about minute 20, when Steam has Steamships and Railways founded (trawlers and the fish train) |
| Settles | only while the stock is **surveyed** (a seated Fishery Board, a held survey lever, or a survey letter's modifier), at Steady State as any Industry |

### 5.2 The stock

The stock Q regrows logistically towards its natural size K and is fished by the home fleet and the foreign fleets:

    dQ/dt = G(Q) − R_home − R_foreign
    G(Q) = r · Q · (1 − Q/K) · d(Q) · s        d(Q) = 1 above the threshold θK, dCollapsed below it
                                               s = scarMul while scarred, else 1

- **Moderate catch is sustainable for ever.** At Q = K/2 the stock regrows fastest (r·K/4): the surplus the sink line
  shows once surveyed.
- **The threshold.** Below θK (content: θ about 0.2) regrowth collapses to a small share (dCollapsed about 0.1). The
  first crossing in a run fires **The Banks Fail** (the Industry's "collapse": it does **not** end the run; the fleet
  ties up, income and the service's wellbeing fall away) and writes a **scar**.
- **The scar.** A scar multiplies regrowth by scarMul (about 0.15) for **scarYears of play with Fishing open**, in any
  run, offline included (content: about 150 model years, 50 minutes of play). It heals with play, not with Reckonings,
  so calling Reckonings cannot hurry it, and the next run opens with the stock where it was left (not at K) while the
  scar lasts. The northern cod moratorium of 1992 was announced for two years and lasted 32 [S, `research/sectors.md`
  §3.3]; the game's version is announced nowhere and says only "Surveys find no sign of the shoals".
- **Pressure is depletion**, derived each step: P = (1 − Q/K) × collapseAt (not stepped, not absorbed). Crises at 0.5
  (**A Poor Season**) and at the threshold (**The Banks Fail**). Because it is an ordinary pressure, clear skies, the sink
  line, decades and Steady State work as in every other Industry: Fishing is clear when depletion has halved from the
  day the line was drawn and is not rising, i.e. the stock has regrown; its **sink line** is G at the clear level, the
  catch that keeps it there. The empty sea costs wellbeing like smoke does.

### 5.3 The lying gauge

The fleet's own measure is **catch per trip**, and its cost of fishing follows it, not the stock:

    reported = (Q/K)^β        β about 0.3        p_r = basePrice × reported^(−α)

This is the standard model of catch per unit effort against abundance, CPUE = q·A^β, with β < 1 meaning
**hyperstability**: Harley, Myers & Dunn, "Is catch-per-unit-effort proportional to abundance?", *Canadian Journal of
Fisheries and Aquatic Sciences* 58(9): 1760–1772 (2001), 297 series, strong support for β < 1 in cod and other
groundfish (checked this session). At β = 0.3 a stock at 30% of K reads 70%, and at 10% reads 50%. So:

- **The price does not warn.** Fish stay cheap until the very end; efficiency keeps cutting the price; demand keeps
  growing. Thurstan, Brockington & Roberts (2010) found landings per unit of fishing power fell 94% over 1889–2007
  [S, `research/sectors.md` §3.4]: every fishing-power card was an efficiency gain against a shrinking stock.
- **The gauge on the page is the fleet's.** Until the stock is surveyed the Industry shows "Catch per trip" (reported)
  as its stock gauge and its depletion as reported, and draws **no sink line**. The formula sheet says, plainly, "Catch
  per trip, as the skippers report it. It is not a survey." The game's own rules (crises, wellbeing, clear skies) use the
  true stock: the game is honest, the fleet's instrument is not.
- **The world tells the truth.** Gulls over the fleet, porpoises in the bay, shoals breaking the surface and the
  soundscape's sea life follow the **true** stock, while the chart's stipple follows the reported one until surveyed.
  An attentive player hears the gulls go quiet before the catch does. That is the only hint, and it is enough. [J]

**Seeing the truth** (any of these makes Fishing *surveyed*; `SectorDerived.surveyed`):

| How | When | Cost |
|---|---|---|
| **Survey cruises** (a lever: measure) | after the research card *The Impoverishment of the Sea* (Garstang, 1900: "The Impoverishment of the Sea: a critical summary of the experimental and statistical evidence bearing upon the alleged depletion of the trawling grounds", *Journal of the Marine Biological Association* 6(1): 1–69; checked this session) | capital for the card; Mandate upkeep while held |
| **A survey letter** (Miss Isbister) | any time after the first poor season | capital; a ten-year timed modifier |
| **The Fishery Board** (an Institution) | in the Hindsight shop after the first Fishing run | Hindsight and a seat; level 2 also starts the survey quota at level 1 |
| **The Fishery Board charter** | a Charter, from the first Reckoning after Fishing opened | the Charter choice |

### 5.4 Foreign fleets and the fishery limits

- Foreign fleets take a share of the total catch that grows with fishing power everywhere (the home fleet's cheapness
  is copied): `share = min(cap, share0 × (basePs / p_s)^g)`, with `R_foreign = R_home × share / (1 − share)`. Content
  intent: about 10% at opening, up to 50–60% late in an unrestrained run (foreign fleets took about 80% of the Grand
  Banks catch in 1968 [S, `research/sectors.md` §3.2]; Act I stays below that).
- Foreign catch drains the stock and earns the player nothing, and it is not on the home budget line: a held home line
  does not save the stock while the foreign share grows. Foreign sails appear on the chart in other pennant colours
  (no real flags).
- **Fishery limits** (a measure lever; the **rebounding lever**): levels "Close the bays", "Twelve miles", "Fifty
  miles", "Two hundred miles" cut the foreign share. Its side effect: the home fleet grows into the space (satMul on
  home uses) **unless the quota from the survey is in force**. After Canada's 200-mile limit in 1977, one review found
  the overfishing "played mainly by Canadian trawlers" [S, `research/sectors.md` §3.2]. (The widths are later than the
  Coal Age; the lever is a ladder of widths, not dated. Content checks the earliest, the three-mile limit, before
  dating anything.)

### 5.5 Quotas and the moratorium

- **Quota (from landings)** is an ordinary cap on the home line. Drawn at today's catch, it holds the catch where it is,
  which may be above what the stock can bear: over-allocation, with no new rule. [J: the existing mechanism teaches it.]
- **Quota (from the survey)** is a new lever kind, `quota`: the catch is held at a fraction of the sink line (regrowth
  at the clear level), shown only while surveyed. Its levels: "90% of the surplus", "75%", "60%"; repeat "Tighten".
- **The moratorium** is the quota's last authored level (value 0). Catch stops; the fleet ties up; the service's
  wellbeing goes; a standing wellbeing cost for the ports is named in the catch line ("Grimsby's fleet is laid up and
  its men with it"). People are named by place, not counted for score (D4).

### 5.6 The kit

- **Applications (6):** Fresh fish by rail · Fried fish shops* (date checked by the author) · Salt and smoked trade ·
  Fish meal for the fields (feeds nothing in Act I; Plenty later) · Cod liver oil · Fish fingers (locked: the Act II
  revival).
- **Efficiency (fish landed per fish killed: less spoilage and discard; 5):** Ice from Norway* · The fish train ·
  Smokehouses · Fish-meal works (nothing wasted) · Gutting at sea*. **Capital (fishing power; 4):** Steam trawlers
  (1880s) · Otter trawl* · Steam drifters* · Steam capstan*; plus **Another trawler** (the repeatable growth card).
  Fishing's main rebound runs through capital cards (cheaper catching, cheaper fish), which carry the decade and
  within-reach lines like Steam's capital cards.
- **Forks (2):** **Long-liners** (selective, dear) / **Beam and otter trawl** (cheap, everything in the net);
  **Grimsby** (fresh trade, rail) / **Hull** (distant water, bigger boats, more fishing power).
- **Prospect (1):** *The Fisheries Exhibition, 1883* — blurb: "Professor Huxley, 1883: the cod, herring and mackerel
  fisheries, ‘in relation to our present modes of fishing’, are ‘inexhaustible’." (Wording checked this session against
  the Clark University text of the inaugural address.) Effect: halfPrice up on fresh fish (the exhibition sells fish).
- **Research (1):** *The Impoverishment of the Sea* (Garstang, 1900): unlocks the survey cruises lever.
- **Levers (6):** Fishery limits (rebounding) · Quota (from landings, cap) · Quota (from the survey) · Closed season
  (sufficiency) · Mesh size (a measure: η up a little, catch down a little) · Survey cruises (measure: surveyed while
  held).
- **Settle:** requires surveyed. Dividend: wellbeing, a little Mandate; blurb: "The Board sets the catch at what the
  banks will bear. Skipper Tench complains, and goes out on Monday."
- **Feeds in:** Ship plate and Tinplate (Iron); Steel trawlers (revival). **Draws on:** each ton landed draws a little
  of Steam's power (trawlers and fish trains burn coal): the existing `drawsOn` to Steam.

### 5.7 Fishing's own unfolding (three runs, never two things at once)

| When | What appears | Introduced by |
|---|---|---|
| Fishing opens (run 6) | the fleet, the uses, "Catch per trip", the landings quota and the closed season | "Steam trawlers land record catches; fish trains run through the night" |
| The foreign share passes 15% | foreign sails on the chart; the fishery limits lever | "Foreign trawlers on the Dogger; owners ask the Admiralty to look" |
| First poor season (crisis 1) | the Garstang card becomes visible; the first Isbister letter is eligible | the crisis headline |
| The banks fail (if they do) | the scar line in the Fishing panel | "The Dogger fleet tied up; surveys find no sign of the shoals" |
| The next Reckoning | the Fishery Board in the shop (and the Fishery Board Charter in the offer) | "The Fishery Board asks for a survey vessel and two naturalists" |
| Surveyed for the first time | the true stock gauge beside catch per trip, the honest sink line, the survey quota | "Board's survey finds the banks at a fifth of their former stock" |

These are lever and card visibility rules and one Institution in the shop; none is a new feature id. [J]

### 5.8 Example text

- Tagline: "The sea is wide, the fish are many, and the trawler is new."
- Headlines:
  - "Catch per trip holds steady; owners order three more trawlers" (running joke 1)
  - "Fried fish a penny; the shops cannot fry fast enough"
  - "Billingsgate glutted; prime cod sold for manure"
  - "Board's survey finds the banks at a fifth of their former stock"
  - "Skippers dispute the survey; the catch per trip, they say, is excellent"
  - "No sign of the shoals for a third season; the Board will report"
- Catch line, Fishery limits: "Foreign boats leave the banks. Your own fleet will want the room, unless the Board sets
  the catch."
- The panel's scar line: "The banks have not recovered. Surveys find a few young fish; the Board does not expect a
  season soon."

---

## 6. Across the Industries

- **The shared reserve.** Iron draws Steam's coal: one reserve, one seam ladder (the seams stay Steam's), one
  exhaustion. Iron's coke counts on Iron's own budget line; the reserve gauge in Steam shows both draws ("Coal: Steam
  71%, Iron 29%"). Exhaustion ends the run as now and names both.
- **Fishing draws Steam's power** (trawlers, fish trains) through `drawsOn`, a price-proof floor in Steam.
- **Revivals** (§4.3) and **Fishing's revival in Act II** (factory trawlers, Fish fingers) are the pattern: a later
  Industry reopens an earlier one's card list.
- **Spill.** Light keeps spilling into Steam; Iron spills into nothing (its rebound is the feeds, not households'
  savings); Fishing's savings spill into Light (a cheap supper leaves money for the gas) at a small rate. [J]

---

## 7. The Act I ending, the capstone, and the Previews

### 7.1 The rule

Every Industry of the Coal Age (Steam, Light, Iron, Fishing) open and settled at once, held fifty model years
(`GlobalParams.endingYears`, as M3). Parliament holds three settlements at once (`settleMax`); the Settlement
Commission's first sitting makes room for the fourth. (Its second sitting stays in the shop for the Previews.) Previews
are not part of the set and do not need settling.

### 7.2 What the player sees

- The checklist line from M3, now for the Act ("Settled 3 of 4. Fishing needs the stock surveyed").
- **Credits** on the settled Coal Age scene, the whole cast in the street, the paper boy. Title: "The Coal Age,
  settled". Lines (examples): "The pits are worked to the sink line and no further." · "The furnaces are banked to the
  order book." · "The banks are fished to what they bear; the Board counts them every spring." · "The lamps are lit at
  dusk and put out at midnight." Continue label: **The ledger continues**.
- **The retrospective Gazette** from the player's own milestones (M3's machinery), with Act I keys added (first Iron
  feed, first poor season, the banks fail, first survey, the scar healed).
- An achievement, **The Coal Age, Settled**, and an Archive note on the Coal Age's real end (the 1913 peak of British
  coal output is a candidate; the author verifies it before it is written).

### 7.3 The capstone

From the next run on, every run opens with the four Coal Age Industries settled, at the per-head service of the moment
the ending was reached (scaled to the run's population until it passes the population of that day; then the excess rule
applies as for any settlement). They:

- pay a share of their settled income (content: about a quarter) and their settle dividends;
- do not use Parliament's room, cannot be unsettled by the player, and earn no "Industries reached" or "settled"
  Hindsight (they earn wellbeing-years like anything that serves people);
- are defended against spill (Motion spills into Light) with Mandate like any settlement; when the defence cannot be
  paid, after lever levels lapse as now, the capstone Industry with the largest defence goes **into arrears**: its R
  grows with the excess, its pressure is stepped again, its sky darkens and wellbeing pays, until the defence is paid
  again (automatically, the step it can be). The panel says so in one line ("In arrears: the settlement is not being
  kept. Smoke returns over the valley.");
- show as one folded row each in a group headed "The Coal Age (settled {year})", the year the ending was reached, with the tab postcard in its settled
  wash and an engraved cartouche.

Offline, `fastForward` holds one step before a capstone goes into arrears, as it holds before a crisis.

### 7.4 The Previews

- After the Act I ending, Motion opens in the next run at about five minutes; Compute in the run after Motion's first
  Steady State or after its 10,000 vehicle-mile-years, whichever first; Code after Compute as now. Their mechanics'
  widgets (travel, the free price) arrive as features with them. Their headlines, letters (Pryce's Motion letters move
  here) and Archive notes are M3's.
- On screen: a small "Preview" on the tab postcard and the Age title card ("The Great Acceleration — in preview: the
  Industries as an industrialist would run them. The Age's own rules are in preparation."). That is the only
  fourth-wall line in the game; it is honest and it is one line. (Open question Q2.)
- They earn Hindsight as now. The Settlement Commission's second sitting makes room for settling them.
- **No second ending in M4.** The Act II ending (the consumption ledger within budget for fifty years) needs the
  Other Chair and Abroad (M5–M6). M4 goes as far as Act I and an honest bridge.

---

## 8. Letters that reward thought

### 8.1 What M3 measured

The budget player's thoughtful policy did not beat always-default (5.907 against 5.977 Hindsight a minute) and random
beat both; only six letters offered in a sample run moved anything, the largest by 0.8% (finishing note, item 4)
**[M]**. Letters were mostly trades of a modest boost for a modest cost, valued the same whatever the state of the run.

### 8.2 The wager arm

A **wager** is an arm whose result depends on a stated condition about the world, evaluated when it is answered:

- It shows its **hint** under the label ("Pays if the shoals are as thick as the catch says") and both outcomes in the
  paper's words, so nothing is hidden but the state itself.
- If the condition holds it pays the **win** (effects, modifier, reply); if not, the **lose**.
- A wager is never the default arm (lint), and a default arm stays a modest, safe answer.
- The condition is a `Cond` over the true state. Where the player can see that state (Steam's headroom under its line,
  a sky's clarity, Iron's feed into Steam), reading the instruments wins. Where the player cannot (the true stock,
  unsurveyed), the wager is the lesson: the catch per trip says yes, the sea says no.

Design targets for wagers [J, made measurable in §15]: a win should be worth about 4–8% of the Hindsight the run earns
over the letter's horizon (ten model years), a loss about the same in the other direction; a wager's condition should
hold about half the time for a player who does not look.

### 8.3 Twenty-four letters (the text lane writes them; sketches here; six cut in the revision)

| Writer | Count | Examples (wagers marked W) |
|---|---|---|
| **Mr Josiah Pryce**, ironmaster at Ravensdale (new; the founder of the family whose company buys the Works in Act II; genial, always in favour of the cheaper thing) | 7 | "A joint line of rails to the coast" (W: pays if Steam has 10% headroom under its line; else Steam's railways grow into the line) · "A Belgian price for pig iron, if the coke duty were halved" · "Ravensdale will found a mechanics' institute, if the licences are eased" |
| **Skipper Ewart Tench**, trawler skipper, Grimsby (new; proud, practical, trusts catch per trip) | 6 | "Full holds off the Dogger" (W: "Buy the second boat": pays if the true stock is above half; else it finds the last shoals) · "The lads want a closed season like a hole in the head" |
| **Miss Isbister**, naturalist to the Fishery Board (new; precise, underfunded, right) | 5 | "A survey vessel for the summer" (capital: ten years surveyed) · "The young fish are missing from the samples" (W on the stock being above the threshold: a quota now pays; if already below it, nothing helps and the paper says so) |
| The correspondent, Mr Whitlow, Mrs Fenwick (existing) | 4 | the cheap supper and the ports' poor (Fenwick); the order book in the *Economist*'s style (Whitlow); the Act's last letters before the credits (the correspondent) |
| The Minister (existing) | 2 | the fishery limits; foreign boats; "the House would like a settlement it can explain" |

All carry M3's rules (a price on every arm, expiring defaults, no standing effects on defaults) plus the wager lint.
Pryce the elder's letters move Pryce out of Motion's run 3 (M3) into Iron's run 4; the younger Pryce's Motion letters
go to the Preview.

---

## 9. The unfolding in M4

Rules (data in `src/content/features.ts`; the core rule is unchanged):

- Runs 1–3 as M3, except that Motion no longer opens in run 3.
- From run 4: at most one arrival at the Reckoning and one mid-run (the 20–24-minute window); **an Industry opening is
  that run's mid-run arrival**, so a feature's mid-run `when` includes "no Industry opened in this run" (new StatKey
  `openFor`). Never two arrivals within five minutes.
- Nothing of Act I arrives after the Act I ending. The Previews bring travel and the free price with their Industries.
- Fishing's own sub-steps (§5.7) are not features and may fall in any run, but none within five minutes of a feature.

| Run | At the Reckoning | Mid-run | Notes |
|---|---|---|---|
| 1 | — | reveal · levers · population | as M3 |
| 2 | Market | ambient · Light opens · more levers · letters | M3's exception, kept |
| 3 | Charters | budget (then Tighten, dividends, pace, clear skies, each on a decade) | Motion removed |
| 4 | Commons | **Iron opens**; Steady State (when earned) | |
| 5 | Settlement (after the first Steady State) | seams | |
| 6 | — | **Fishing opens**; then **the Board's Survey** (feature `estimates`) ≥ 5 min later | the shift's moment |
| 7 | household survey (Civil Service owned) | load curve | Proprietor's Day minutes after a return; Fishery Board in the shop |
| 8 | Histories (a Steady State held) | Archive | |
| 9 | — | levers that bite back (once a lever has bitten 0.3) | |
| post-Act I | — | Motion (travel), then Compute (free price), then Code | Previews |

Targets: Fishing opens by hour 8 for every scripted player; the Archive before hour 12; nothing Act I after the ending.

---

## 10. The page: folding, postcards, two widgets

- **Industry tabs as postcards** (`visual-direction.md` item 7). Seven Industries do not fit a row of words at 390 px.
  Each tab is a 64 × 40 static crop of its scene (rendered once per layout change, never per tick), with the warning dot
  near a crisis, the settled wash and cartouche, "Preview" where it applies, and the affordable dot. The row scrolls
  sideways and keeps the selected one in view. Locked Industries are not shown (M2.1's rule).
- **Folding.** One line each for: owned cards (as now, "Owned · 14"), maxed levers ("Coke duty · at its limit"), a
  settled Industry (its settled card and defence line; the rest behind "Show the Industry"), the capstone group, and
  owned-and-maxed shop items ("Owned · 9" at the foot of the shop). Folding remembers what the player opened, per
  device. Target: the main column's scroll height at the late-Act-I fixture is at most the M3 baseline at the same
  fixture (measured first by the UI lane), and each settled or capstone Industry is one card.
- **Iron's widget: the order book.** A small ledger: per fed Industry, its name, the feed factor ("engines × 0.88"), and,
  under a drawn line, what the feed adds to that line this decade. Tapping a row selects that Industry's tab.
- **Fishing's widget: the chart.** Two gauges side by side on a chart card: **Catch per trip** (always) and **The stock,
  surveyed** (shown only while surveyed; otherwise a blank gauge lettered "No survey"). Under them: regrowth now, the
  foreign share, and, while scarred, the scar line. The sparkline gets the sink line only while surveyed.
- **Wager arms** show the hint and both outcomes; a small "Bet on the state of things" label in the Age's type.
- **The Act title card** (M2's Age card, for an Act): "Act I · The Coal Age" at the start of a new save's first run, and
  the credits at its end.
- **The Board's Survey card** (§2A.1): two columns, the footer, "File the survey"; shown once a save, kept in the
  Archive afterwards. **The full account and years-left readings** (§2A.2) on every Industry's consumption and reserve
  gauges once `estimates` is on; each budget line labelled with its account ("on the full account" / "chimney only").
- (The Age dissolve was cut in the revision.)

---

## 11. Scene, art and sound

The owner wants a visual world with slightly different art styles per Age, eventually cyberpunk (built: Code's night
city). The Coal Age now has four plates in four sub-idioms of one family, which is the most visibly "one Age, many
hands" moment in the game.

### 11.1 Iron & Steel: the foundry lithograph (`foundry`)

- Two printed colours, furnace orange over ink, heavier blacks than `ledger`, slightly coarse registration. Night.
- Layout: Ravensdale, the same country seen from across the valley: Steam's viaduct from the other side, the mill town's
  stacks in the far band, a canal in the near band. Blast furnaces with hot-blast stoves, a flat orange glow plate per
  furnace in blast, the casting floor, a converter shed whose blow is a flat flame cone (stage 2), an open-hearth shop
  (stage 3).
- The order book drawn: a goods yard with wagons lettered by destination leaving the frame; in **Steam's** scene the
  feeds show as a second track and a new engine house (Rails), steamships with iron hulls in the harbour (Ship plate);
  in Light, the gasholder's steel frame (Girders). (`SceneView.heritage` and a new `feeds` field.)
- Cut-away: slag heaps growing, and Steam's coal section shared (the strata prop from M3), hollowing by both draws.
- Pressure: smoke as a lithographic tint; crises The Orange Night (the whole sky orange-plated) and The Slag Slide (a
  heap slumps in the cut-away; no figures).

### 11.2 Fishing: the harbour engraving with the chart (`harbour`)

- `ledger` family, at dawn: harbour walls, smokehouses, the fish market hall, the railway to the quay, trawlers and
  drifters. The far band is open sea.
- Cut-away replaced by **an Admiralty chart** (the Industry's mechanic prop): soundings, the banks outlined, the shoals
  as stipple whose density follows the **reported** stock until surveyed and the true stock after; foreign sails as
  pennant-coloured glyphs on the banks; a scar as blank grey water with "No fish found" in the chart's italic. Designed
  first for 390 px (the chart takes the cut-away's height plus 50%; legible soundings or none).
- The honest world: gulls over the fleet, porpoises, surface shoals, the number of boats out, all from the true stock;
  the tied-up fleet in harbour at a moratorium or a failed bank.
- The survey: a small survey vessel with a sampling net appears while surveyed.

### 11.3 Shared work

- Postcards (static crops), the capstone look (settled wash and cartouche "Settled {year}"; in arrears,
  the wash withdrawn and smoke returning), the Previews' "Preview" corner mark, the new figures (Pryce the elder in a
  frock coat with a sample of rail; Skipper Tench in a gansey; Miss Isbister with a sampling jar), spots for the new
  headline keys.
- **Performance** (CLAUDE.md rules, measured on the real page, not a demo): no rAF loop, no CSS animation or transition
  inside the scene SVG, no custom property set on a scene root, no `<style>` per update; Iron and Fishing each ≤ 1,900
  SVG nodes at their busiest; p95 frame ≤ 20 ms at 4× throttle; tab switch within its existing budget with seven tabs;
  postcards rendered once per layout change.

### 11.4 Sound

- **Iron** (A aeolian: the Coal Age keeps to the white notes so Steam's D dorian and Light's G mixolydian stay within
  one note): the drop hammer is the pulse; a furnace roar bed that breathes with blast; tapping the furnace is a rising
  hiss and a shower of sparks; the rolling mill's pitched squeal; riveting ticks; a nightjar at Steady State.
- **Fishing** (C ionian, white notes; the open, bright sea of 1883): sea swell on a slow LFO, a bell buoy in key, gulls
  and porpoise breaths that follow the **true** stock, trawler chuffs and winches, the fish market's bell. Hysteresis is
  audible: after the banks fail, the gulls and the sea life stay thin for the scar's whole length while the fleet
  sounds normal, and they return slowly.
- Interface: wagers' own short sound (a coin on the counter); the Act I credits a slower variant of `ending`; arrears a
  muffled toll.
- No audio files; synthesis off the main thread as M3; levels and spectra to the targets in `sound-direction.md`.

---

## 12. Smaller content

- **Charters (4):** The Black Country (Iron: Rails founded from the start, margin up) · The Fish Trains (Fishing: the
  fish train from the start) · The Ironmasters' Ring (Iron margin up, coke duty forbidden this run) · **The Fishery
  Board** (an institutionLoan of the Fishery Board level 1: surveyed for one run; offered only once Fishing has opened).
- **Histories: none new** (cut in the revision; the four sketched were: *Free Trade in Iron* (no levers in Iron; goal: Steady State in Iron) ·
  *No Bessemer* (Bessemer forbidden; goal: Iron at its sink line by 1900) · *The Cod Wars* (foreign share starts at 40%,
  fishery limits forbidden until the second crisis; goal: the stock above 60% of its natural size in 1914) · *The Whale
  Fishery* (Fishing's stock small and slow to regrow; goal: hold it above half for a century). Kept here for M9's post-game ladder.)
- **Commons: none new** (cut in the revision; the Seamen's mission, Allotments on the old tips and the fish market hall
  wait for a later pass).
- **Institutions (2 new):** the **Fishery Board** (L1 surveyed; L2 also starts the survey quota at level 1) and the
  **Inspector of Furnaces** (Iron's smoke inspector at level 1 from minute one).
- **Achievements (8)**, among them: The Coal Age, Settled; Embodied (Iron's feeds add 50% to Steam's coal); Huxley Was
  Wrong (the banks fail; hidden); The Gulls Came Back (a scar heals); Two Hundred Miles (and then the home fleet);
  Counted Every Spring (Fishing settled).
- **Archive notes (about 40)**, every one sourced: hot blast and Jevons's Scottish figure; Bessemer's "without fuel"
  paper; the Gilchrist–Thomas process; Huxley's address (with his qualifier); Garstang; Thurstan et al.;
  hyperstability (Harley et al.); the 1992 moratorium; the 200-mile limits; Iceland's quotas; Zink & Geyer's circular
  rebound; the Act I credits note.
- **Headlines:** 60 per new Industry (the Industry kit), ambient templates for the stock and the feeds (about 12), the
  new keys' fallbacks.

---

## 13. What is cut, and why

| Cut or deferred | Why |
|---|---|
| All ten of the roadmap's new Histories (revision: the four first kept are cut too) | Histories arrive around hour 9–10 and are optional; the M3 measurement does not show them filling gaps. Text effort goes to the letters, which the player meets every three minutes. [J] |
| Twelve of the roadmap's 36 dispatches (24 kept; six more cut in the revision) | Fewer, better: twelve of the twenty-four are wagers, which need more care than a two-arm trade. [J] |
| The Age dissolve (`visual-direction.md` item 10) | Cut in the revision to pay for The Survey; a nicety beside a moment. |
| Three Commons projects, two revivals (Light, Fishing), four achievements | Cut in the revision to pay for The Survey. |
| Iron's tariff protection lever | Its rebound needs Abroad (M5). The scrap bounty rebounds now, and is sourced. |
| A second supplier for Iron (foreign steel) | M5's Abroad. |
| A separate "Fishing reveal" research card that changes the rules | The lying gauge is the reveal; the survey shows it. A second reveal mechanic would be a second thing at once. |
| The Pryce acquisition and Take office | M5's opening (decision 9). |
| Persistent Settlement within Act I | Measured unnecessary for the ending (finishing note, item 2); the capstone is the persistent settlement. |
| Banked time | Stays off (`bankRate` 0). The offline hold now covers capstone arrears, which was its main risk; turn it on when the owner asks (Q5). |
| A two-supplier solve for gas against electric; time-of-use pricing | As M3: a fork teaches it. |
| Fishing as a top-down chart scene | The chart is the cut-away; the scene stays a harbour, so the country stays one country. Freight & Flight keeps the top-down idea. |

---

## 14. Amendments to `design/roadmap.md` (applied in the revision pass, 20 Nov 2026)

The coordinator, on the owner's delegation, accepted the design (open questions Q1–Q7 decided) and asked for one
paradigm shift per milestone. The amendments below are now **applied** to `design/roadmap.md` and
`design/paradigm-shifts.md`:

1. **M4's name:** "The Survey" (the Coal Age complete: Iron & Steel, Fishing, the Act I ending, the capstone, the
   Previews).
2. **M4's contract list** is `design/m4-contract-notes.md`.
3. **Re-gating:** Motion, Compute and Code open after the Act I ending as Previews (an Act flag); saves that opened them
   keep them as Previews. In M5 Act II's flag turns off.
4. **The capstone** is "settled for good; never unsettled; in arrears when undefended" (D2).
5. **Content counts** (after the revision's cuts): no new Histories, 24 letters of which 12 wagers, 4 Charters, 2
   Institutions, no new Commons projects, 3 cast.
6. **Exit criteria:** §15.
7. **Size:** about 43 agent-days.
8. **Abroad, the two ledgers and offshoring move from M5 to M6**, which becomes the Second Ledger shift; M5 is the Other
   Chair alone (and lighter).
9. **A new M7, The Inheritance** (the Long Now as generations; §18); You Write the Objectives becomes M8, Unbuilding M9,
   the post-game M10.

### 14.1 One shift per milestone, M4 to M10

| Milestone | Shift | Before → after (what the player believes) | The moment |
|---|---|---|---|
| **M4** | **The Survey** | The gauges show the world, and what I burn is mine → every gauge is somebody's estimate, and my burn is shared and burnt elsewhere | The Board's Survey: the skippers' report and the survey printed side by side; the chart drains |
| **M5** | **The Other Chair** | I make the choices → someone paid to grow makes them, and I can only write rules he will find his way round | Take office: Pryce's prospectus, quoting the times of the player's own first run |
| **M6** | **The Second Ledger** (was inside M5 and M6: Abroad, offshoring, Freight & Flight) | When my figures fall the world's fall → my figures can fall because I moved the burning abroad, and the world's rise | The first consumption ledger: the home gauge turns down as the consumption gauge, printed for the first time, turns up; a ship leaves for the horizon and a chimney rises on Abroad's skyline |
| **M7** | **The Inheritance** (the prestige shift) | A Reckoning wipes the slate → each run is a generation that receives what the last left and owes the next | Hand over: the next run opens on the same unwashed valley; "The books are closed. The world is not." |
| **M8** | **You Write the Objectives** | I act, and acting well is enough → I specify, and get exactly what I measured | The first agent's report: its target met to the decimal, and the scene showing how it was met |
| **M9** | **Unbuilding** | Progress is what I add → progress is what I take away while wellbeing holds | The first retirement: a pit sealed and its tab reprinted in riso |
| **M10** | **Enough** (post-game; the end of The Game Rebounds on You) | More play is more game → the ledger is closed, and stopping is a move the game counts | The last household return, every generation's hours on one page: "The ledger is closed. You may stop." |

Notes. Shift 3 (The Game Rebounds on You) had its moment in M3 (the Proprietor's Day) and its close in M10. M6 had no
shift of its own (three Industries inside the Other Chair); moving Abroad there gives it one and lightens M5, the
largest milestone. M10 is honestly a coda: if the owner prefers, its moment folds into M9's true ending and M10 stays
optional content with no claim to be a shift.

---

## 15. Exit criteria (for the balance lane to turn into tests)

Times are active play; "scripted players" are `mixed`, `budget` and `human` with `--commons --unlocks` and letters at
`thoughtful` unless stated.

**Act I**

1. The Act I ending at **14–17 h for `mixed`**, 15–18 h for `budget`, 13–17 h for `human`; none before hour 13.
2. The longest gap between firsts (features, Industry openings, the first poor season, the first survey, each
   Industry's first settlement) is **≤ 2 h to hour 14** for `budget` and `mixed`, and ≤ 2.5 h from hour 14 to the ending.
3. From run 4, **at most two new things a run** (feature unlocks plus Industry openings), never two within five minutes,
   through the ending, for all three players. No Act I feature unlocks after the Act I ending.
4. Iron opens in run 4 at 2.4–3.6 h; Fishing in run 6 by hour 8, for all three players.

**Iron**

5. **The embodied rebound is visible:** `efficiency` with Iron engaged shows Steam's R thirty minutes after Iron opens at
   ≥ 1.15× the same start with `--ignore=feeds`.
6. **The temptation:** `efficiency` engaging the order book earns ≥ 15% more income across Iron and the fed Industries
   than ignoring it; under a drawn line every Iron use card and the order book carry the feed line (UI check).
7. The scrap bounty bites back: with the coke duty off, Iron's demand at bite 1 is ≥ 10% above the same state at bite 0.

**Fishing**

8. **The lesson lands:** unsurveyed, `efficiency` and `budget` cross the threshold in their first Fishing run; a
   `fishsteward` strategy (survey cruises from the first poor season, survey quota) does not.
9. **The survey pays:** a Fishing strategy without the survey earns ≤ 0.6× the Hindsight per minute of the same strategy
   with it, over the Fishing runs to the ending (the roadmap's criterion, kept).
10. **The scar persists:** after a crossing, regrowth stays at scarMul for scarYears of open play across at least one
    Reckoning; in the next run the stock at minute 20 is ≤ 40% of its natural size whatever the quota; Reckonings alone
    do not shorten it.
11. **Hyperstability:** with the true stock at 30% of K, catch per trip reads ≥ 65%; the fishing price at that point is
    ≤ 1.5× its opening value.
12. **The limits rebound:** raising the fishery limits to "Fifty miles" without the survey quota raises home catch by
    ≥ 25% within 30 model years while total catch falls by ≤ 15%.

**Letters, quiet, temptation**

13. **Letters reward thought:** `thoughtful` ≥ 1.05× always-default and always-default ≥ random, for both `budget` and
    `efficiency`, over runs 4–9 (M3's miss, carried). Each wager's win and loss differ by ≥ 3% of the run's Hindsight per
    minute over ten model years.
14. **The restraint player always has a decision:** for `budget`, the longest stretch without a decision is ≤ 3 minutes
    in hour 1 and ≤ 5 minutes in hours 1–14 (letters at `thoughtful`).
15. Each new fork within ±10% Hindsight per minute; each new Charter within ±15%; each new History cleared by `budget`
    within 2× the median clearing time.

**Capstone and Previews**

16. After the Act I ending the next run opens with the four Coal Age Industries settled; with Motion open and `mixed`
    playing, the capstone's defence is ≤ 30% of gross Mandate income, and an 8-hour `fastForward` never puts a capstone
    Industry in arrears unseen.
17. Motion opens in the first post-Act-I run within ten minutes; Compute and Code follow, one a run at most.

**The Survey (the shift)**

22. Every scripted player meets the Board's Survey in the run Fishing opens, by hour 8.5; the card shows both figures and
    the reported figure is ≥ the surveyed one (always, by construction: β < 1).
23. After the moment, new lines are drawn on the full account: with Rails founded, Steam's full-account R is ≥ 1.1× its
    chimney R, and Iron's falls by the same amount (totals agree to 1e−9).
24. Steam's "at the rate it is growing" years-left is shorter than "at this year's rate" whenever its trend is positive.
25. Behaviour changes in every run: `budget` founds at least one fewer feeding Iron use, or settles Iron earlier, in the
    runs after the moment than in the runs before (report which; a soft check).

**Save, page, performance (Playwright at 390 × 844 on the real build, and the CLAUDE.md budgets)**

18. An M3 save before the ending, and one after it, load with Iron and Fishing closed and openable, Motion, Compute and
    Code open and marked Preview, the `steadyAll` record kept and the Act I ending not reached; a v5 round trip is
    lossless; a v6 save is refused.
19. Scripted browser run: Iron opens and the order book shows its feed lines; Fishing shows catch per trip alone, then
    both gauges after a survey; a fixture reaches the Act I credits and the next run opens with the capstone; the
    postcard row scrolls with seven tabs.
20. The main column's scroll height at the late-Act-I fixture ≤ the M3 baseline at the same fixture; every settled or
    capstone Industry renders as one card.
21. `build.ts --check` passes (first paint ≤ 240 KB gz); `src/core/perf.budget.test.ts` passes with the M4 content; a
    step with all four Act I Industries open costs ≤ 1.3× M3's with five; `tools/perf.mjs --check` passes at fresh, mid,
    late and a new `act1` state (frames, taps, tab switch with seven tabs, DOM, heap, load); Iron and Fishing ≤ 1,900 SVG
    nodes each.

---

## 16. Risks

| Risk | Likelihood · cost | Mitigation |
|---|---|---|
| **Fishing is too much at once** (renewable stock, threshold, scar, lying gauge, survey, fleets, limits, quotas) | high · high | §5.7 spreads it over three runs; nothing appears before its moment; the first run has one gauge and two levers. Watch the first real players here first. |
| **The lying gauge reads as the game cheating** | medium · high | The gauge is labelled as the skippers' report; the formula sheet says so; the world (gulls, shoals, sound) is honest; the game's rules use the truth. If playtests say "unfair", show the true stock faintly on the chart from the first poor season. |
| **The scar feels like lost hours** | medium · medium | It heals with play, not Reckonings, and is shown as a line that changes; the other three Industries have work in a scarred run; the Fishery Board Charter and survey cruises make a second crash avoidable. Knob: scarYears. |
| **Act I's early hours feel thinner without Motion and Compute** (they gave hours 1.4–3 their novelty and much Hindsight) | medium · high | Iron in run 4 and the budget's own unfolding in run 3 fill it; the balance lane measures Hindsight per minute against M3 runs 3–5 and retunes Iron's and Light's weights. Fallback (Q1): keep Motion as a Preview in Act I runs for everyone until M5. |
| **Previews feel like a placeholder** | medium · low | They are M3's finished Industries with a one-line label; M5 replaces them. |
| **The capstone's start-of-run wellbeing spike** (settled service at full per-head level from minute one) | medium · medium | Scaled to population; income at a share; measured in criterion 16; knobs in `ActDef.capstone`. |
| **Wagers feel like gambling** | low · medium | They are deterministic bets on visible (or deliberately invisible) state, with the condition printed; no randomness anywhere. |
| **Seven tabs and two new scenes regress performance** | medium · high | Postcards are static crops; lanes measure on the real page at 390 × 844 with `tools/perf.mjs --check`, never only in a demo (an earlier milestone regressed that way). |
| **Text volume** (24 letters, 120 headlines, 40 notes) | high · medium | One text lane, started on day one from this document's sketches; facts only from the research files or checked. |
| **Migration surprises** for M3 saves (grandfathered Previews, the old ending record) | medium · medium | Contract notes §9 specify every step; criterion 18. |
| **The Survey reads as one tab's gimmick** | medium · high | The moment's footer and the two readings put it on every tab; full-account lines make it bite in every run. |
| **The full account makes the Act I ending harder** (Steam's line now carries Iron's coke) | medium · medium | Balance knob; settling Iron first freezes the feeds, which is the lesson. |
| **Pacing from bots, not people** | certain · unknown | The owner plays the M4 build at the Act I ending fixture and at hour 6 before balance is final. |

---

## 17. Sizes (agent-days)

| Lane | Work | Days |
|---|---|---|
| Contract | `types.ts` M4 hunks, save v5 | 2 |
| Core | acts, capstone, arrears; shared reserve; feeds; renewable stock, scar, reported stock, survey, foreign fleets; quota; wagers; StatKeys; migration; balancer strategies | 8 |
| Content: Iron | the kit, revivals | 3 |
| Content: Fishing | the kit, levers, unfolding | 4 |
| Text | 24 letters, 3 cast, 120 headlines, ambient, 40 Archive notes, credits and retrospective | 5 |
| Prestige content | Charters, Histories, Institutions, Commons, achievements, features table | 1 |
| UI | postcards, folding, order book, chart, wagers, Act card, Previews, capstone rows, migration notices | 5 |
| Scene | `foundry`, `harbour` with the chart, feeds in Steam/Light, postcards, capstone look, figures, spots | 7 |
| Audio | two soundscapes, wager and arrears sounds | 2 |
| Balance | the criteria above, retuning the Act without Motion and Compute | 4 |
| Revision: The Survey | the moment, two readings, full-account lines (contract 0.5, core 2, content 1, UI 1.5, scene 0.5, balance 1) | +6.5 |
| Revision: cuts | Histories, dissolve, six letters, Commons, two revivals, four achievements | −4.5 |
| **Total** | | **≈ 43** |

The roadmap's 22 was written before the Previews, folding and wager arms existed; a lean M4 that drops the Previews
(Q1, option B) and the folding (not recommended) is about 33.

---

## 18. The prestige shift: The Inheritance (designed now; lands in M7)

*Added in the revision pass, on the owner's direction: "there should also eventually be a paradigm shift in the
prestige, so future runs after that point are massively effected".* Not built in M4; M4 seeds it and leaves room for it
(contract notes §14).

### 18.1 Before and after

- **Before.** A Reckoning is an ending the player chooses (or exhaustion or collapse forces). The world is rebuilt
  fresh: full reserves, a clean sky, population 1, nothing founded. Hindsight carries knowledge, which makes the next run
  faster and hits the wall sooner. Runs are attempts.
- **After.** There is no fresh world. A run is a **generation**: it starts in the world the last one left, it is played
  for what it hands on, and it ends on the world's schedule, not the player's.
- **Name: The Inheritance.** *Before:* a Reckoning wipes the slate and each run is a fresh world. *After:* each run is a
  generation that receives what the last one left and owes the next one; what one generation saves, the next can spend.

### 18.2 The candidates, weighed

| Candidate | Change of kind? | Verdict |
|---|---|---|
| The Reckoning stops resetting the world; damage carries over (smoke, scar, sprawl) | yes: a run starts differently | **the core of it** |
| A second currency earned only by what is left standing or in the ground | yes: a run is played for a different reason | **joined to it** (Bequest; it is what `long-game.md` already called Legacy, now defined) |
| The Reckoning on the world's schedule | yes: a run ends differently | **joined to it** (a generation is a fixed span) |
| The capstone generalised (each finished Act changes every later run) | partly: it changes starting worlds Act by Act, but runs between Acts still reset | **the seed** (M4's capstone and M6's second capstone lead to it) |

One mechanic carries all three changes the owner asked for: a run starts differently (in the inherited world), is
played for a different reason (Bequest, paid only for what is handed on), and ends differently (at the generation's end,
with a will). It is a change of kind, not a multiplier.

### 18.3 What every run looks like afterwards

- **It starts** in the world as left, after a 25-model-year interregnum: reserves where they were; pressure stocks
  decayed by their own absorption over the interval (Code's stock not at all); sprawl, ratchets and scars standing;
  founded uses and machines standing at a share of their adoption (the heirs keep the railways); settled and capstoned
  Industries standing; population and capital carried at a share. **Levers lapse** unless made permanent: rules are not
  inherited, the world is. Know-how is inherited whole and automatically (the heir knows everything the parent learnt).
- **It is played for Bequest**, earned only at the handover and only for what is handed on: reserve in the ground (more
  if sealed), pressure under each sink, stocks above their clear level, Industries settled, Ground (M9), and wellbeing per
  head at least what was received (the "day drawn" rule of M2, at the scale of a lifetime: nobody worse off than on the
  day you inherited). Nothing is paid for anything done during the generation. Bequest buys **Endowments**: permanent
  changes to every later world (a reserve sealed for ever; a sink protected; a Commons endowed; an Institution chartered
  beyond repeal). Hindsight remains, for in-generation Institutions.
- **It ends on the world's schedule**: a generation is a fixed span (content: about 75 model years, 25 active minutes);
  it cannot be called early or prolonged; collapse ends it early and the heir inherits the collapse. At the end, **the
  Will**: the handover ledger line by line (received, left), one Endowment chosen, and (from M8) the agents' briefs that
  pass on.
- **The rebound across time.** What one generation leaves in the ground the next can burn, and burns faster, because it
  inherits all the Know-how: Jevons across generations, and Sinn's green paradox (a resource left but not locked is
  extracted later, and faster). The only bequest the heir cannot spend is one made permanent. That is the argument the
  game has made about efficiency and about rules, now made about time.

### 18.4 The moment: Hand over

The first Long Now (the Act II ending's reset). The Reckoning screen shows the frozen grey valley, as it always has.
Then, where every run so far has opened on a washed valley, the next run opens on **the same picture**: the smoke still
in the sky, the pit still hollow, the estates standing, grey water where the banks failed. A card: "Generation II.
Received: …" in two columns (what the last generation was given; what it left), and one line in the paper:

> "The books are closed. The world is not."

### 18.5 Where it lands, and why there

**M7, as the Long Now's reset** (the third prestige layer, at the Act II ending, about hour 52), in its own milestone,
with "You Write the Objectives" moved to M8 (roadmap renumbered; §14):

- the Long Now is the game's generational frame by name, and its currency (Legacy) was already defined by what is left
  (Ground, wellbeing per ton): The Inheritance is what that layer always meant;
- about half the game's hours (52 to 100) are then played under it, which is "future runs massively affected";
- **Unbuilding (M9) needs it**: retiring, sealing and rewilding only mean something in a world that is not reset every
  run; Ground accumulates across generations;
- **the agents (M8) need it**: a brief that passes to the next generation is a will; a world that persists is what
  agents are worth running;
- it should not come earlier: Act II's Treaty already teaches persistence of *rules* (Articles survive Treaties), and
  stacking a world that persists on top of the Other Chair would be two shifts at once.

Its relation to the four shifts: it generalises the Other Chair's precedent (rules persist) to the world; it is the
precondition of Unbuilding; it gives You Write the Objectives its stake (briefs as wills); and it completes The Game
Rebounds on You: the one thing never inherited is the player's own time, which the Statistics Office's last return
counts across all generations.

### 18.6 Seeds, so it reads as inevitable

| Milestone | Seed |
|---|---|
| M4 | **The scar**: the first damage that crosses a Reckoning. **The capstone and arrears**: the first world that persists and can decay. Foreshadow in two lines only: Fishing's scar line after a Reckoning, "The Reckoning closes the books; it does not restock the sea", and the capstone's cartouche. |
| M5 | Articles and Precedent persist across Treaties (rules persist); Pryce's prospectus reads a past run back to the player. |
| M6 | Sprawl and ratchets that do not go back; the Second Ledger (burning moved, not removed); the Act II capstone. |
| M7 | The Inheritance. |

### 18.7 What M4 must not block (contract foresight; contract notes §14)

World-scoped records under one object (`MetaState.world`), all carry-over in one core function (`inherit`), no M4 code
that assumes a run starts with full reserves or population 1, and an open `ReckoningCause`.

---

## Sources checked this session

- Huxley, T. H., Inaugural address, Fisheries Exhibition, London (1883), Clark University Huxley archive,
  https://mathcs.clarku.edu/huxley/SM5/fish.html — "the cod fishery, the herring fishery, the pilchard fishery, the
  mackerel fishery, and probably all the great sea fisheries, are inexhaustible"; and earlier "in relation to our
  present modes of fishing … are inexhaustible".
- Garstang, W. (1900), "The Impoverishment of the Sea", *J. Mar. Biol. Assoc. UK* 6(1): 1–69,
  https://plymsea.ac.uk/id/eprint/206
- Harley, S. J., Myers, R. A. & Dunn, A. (2001), "Is catch-per-unit-effort proportional to abundance?", *Can. J. Fish.
  Aquat. Sci.* 58(9): 1760–1772, doi:10.1139/cjfas-58-9-1760 (abstract and later citations; full text not read).
- Zink, T. & Geyer, R. (2017), "Circular Economy Rebound", *J. Industrial Ecology* 21(3): 593–602,
  doi:10.1111/jiec.12545.

Everything else marked [S] or [V] is from `design/research/`; items marked * need the content author's check before
they reach a card.
