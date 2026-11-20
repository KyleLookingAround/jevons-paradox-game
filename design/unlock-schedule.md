# The unfolding: when each system arrives

19 Nov 2026. Owner's direction, after playing M2: "I think options should be unlocked more slowly. like the budget thing
is confusing and should be in the later game." Before this change the reveal in run 1 (about minute 9) brought, in one
step, the rebound meter, both card lines, Mandate, five counter-levers with recycling and Tighten, the Budget panel (a
line, three paces, the decades ledger, lean and full decades, clear skies, the sink line, Steady State progress) and
the Reckoning button; the population gauge was there from the first second, and run 2 brought the shop, a Charter and
the Market at once.

Now each system arrives alone, when the player has a reason to want it, introduced by one headline in the broadsheet
(and a toast offering to show it), and wears a small "New" mark until it has been on screen. Nothing is greyed out:
what is locked is not shown. The rule is in the model, from data: `Content.features` (`src/content/features.ts`), a
`Cond` per feature, at most one feature per check and never two within `featureGapSeconds` (300 s of play); unlocks
are checked every 5 s of run time and at each Reckoning, never while away. Once unlocked, a feature stays unlocked for
good (`MetaState.features`). Saves from before the change keep everything the old build showed them.

| # | What appears | When (scripted players) | Gated by | Introduced by |
|---|---|---|---|---|
| — | Efficiency cards, applications, the broadsheet, Sell | from the start | — | the opening line |
| 1 | **The rebound meter** and the cards' "This decade" / "Brings within reach" lines (`reboundMeter`) | run 1, ~8.6 min | The Coal Question bought (`flags.revealed`) | its own card and the reveal headline |
| 2 | **Counter-levers and Mandate**: the duty and the temperance pledge only, Enact and Raise, no recycling choice, no Tighten (`levers`) | run 1, ~13.5 min | revealed, and Steam's smoke at 22% of collapse (or a crisis); ≥ 5 min after the reveal | "Smoke noticed in Parliament; a coal duty is proposed" |
| 3 | **The population gauge** (`population`) | run 1, ~19 min | Steam's first crisis (it takes people), or population ×1.3 | "Parish registers record more mouths; the vicar orders more pews" |
| 4 | "Call a Reckoning" (page rule) | run 1, with the levers | revealed and levers arrived (or any Reckoning before) | — |
| — | **The Hindsight shop** (Know-how and Institutions) | first Reckoning | the Reckoning itself | the Reckoning card |
| 5 | **The Market** (`market`) | first Reckoning: run 2 opens with it | 1 Reckoning | "Engine makers now call unasked; routine orders place themselves" |
| 6 | **More levers** (slack recovery, water wheels, Light's parks…) **and where a levy's money goes** (`moreLevers`) | run 2, ~11 min | 1 Reckoning, and a duty or the pledge in force again | "Parliament, having tried one measure, will hear of others" |
| 7 | **Charters** (`charters`) | second Reckoning: run 3 | 2 Reckonings | "Two charters on the table; a select committee sits" |
| 8 | **The budget**, in its simplest form: draw a line at today's use, keep under it, each decade kept pays; the cap levers; one (Gentle) pace (`budget`) | run 3, ~7 min | 2 Reckonings, revealed, the year 1801 (the first census) | "First census taken; the Treasury asks how much coal is enough" |
| 9 | **Tighten** (cap levels past the authored three, all levers' repeat steps) (`leverRepeat`) | run 3, ~15–19 min | a cap in force and its line has paid a decade | "Committee finds the cap can be tightened further, by statute" |
| 10 | **The choice of decade dividend** (`dividendChoice`) | run 3, ~20–24 min | Steam's second decade | "Another decade within the line; the Treasury offers a choice" |
| 11 | **The pace of a line** (Gentle, Firm, Severe) (`budgetPace`) | run 3, ~25–29 min | Steam's third decade | "Members divide on how steeply the line should fall" |
| 12 | **Clear skies and the sink line**, and lean against full decades (`clearSkies`) | run 3, ~30–34 min | a decade paid, and wellbeing at the target (or five decades) | "Inspectors measure how much smoke the sky can carry off" |
| 13 | **The Commons** (`commons`) | third Reckoning: run 4 | 3 Reckonings (`commons.fromReckoning` 3) | "Ratepayers petition for baths and libraries out of the levies" |
| 14 | **Steady State**: the fifty-year streak and its progress (`steadyState`) | run 4, ~40–64 min | clear skies due, and any Industry's sky clear | "First clear sky in living memory; the clubs ask how long it lasts" |
| 15 | **Settlement** (`settlement`) | the Reckoning after the first Steady State (run 5) | Steady State achieved, 4 Reckonings | "A settled industry proposed: burn at the sink line, and no more" |
| — | The Civil Service, Treasury rules, the respec | as before (Institutions; the respec once Know-how is owned) | — | the shop |

## Why it differs from the coordinator's proposal

- **The Market opens run 2, not mid-run.** The first draft held it to five minutes into run 2 (the shop had just
  arrived). QA (B7, `design/qa-report-m2.md`) then found run 2's first five minutes identical to run 1's; the Market
  buying the routine cards from the first minute is what makes them different, so it arrives with the Reckoning that
  begins run 2. The shop is between runs, the Market is the first thing in the run; the next arrival (more levers) is
  at least five minutes later.
- **Charters move to run 3**, so that run 2 brings one system to the run (the Market) besides the shop. They arrive
  at the Reckoning, seven minutes before the budget.
- **"Call a Reckoning" waits for the levers**: it used to appear at the reveal, a third thing at once.
- **Lean against full decades arrives with clear skies** (both are about the full wellbeing target), and **Steady
  State a step after**, at the first clear sky, so the panel never shows "0 of 50 years" before the player can earn
  one. Every progress line now says what it is waiting on ("waiting on wellbeing at 34 (now 19)").
- **Settlement waits for the Reckoning after the first Steady State**, not the moment of it: arriving with Steady State
  it would have been two things at once, and the first Settlement would have fallen to 3.4 h against the 4–6 h target.
- **The Commons move to run 4**, as proposed, so they do not arrive with the budget.
- **One forgiving rule in the model** (QA B17): a cap enacted over a line the economy has outgrown redraws the line at
  today's use instead of cutting use to the old line at a stroke; and the line now has a floor (half its start, QA B2).

## Per-run summary

Run 1: the reveal, the levers, people (three arrivals, 5 min apart). Run 2: the shop, the Market, ambient news, more
levers, the first letter. Run 3: Charters, the budget, Tighten, dividends, the pace, clear skies (the budget's own
unfolding, each tied to a decade the player has just earned), Steady State. From run 4: at most two arrivals a run,
one at the Reckoning and one mid-run (M3, below).

## M3: from run 4, two arrivals a run at most (balance lane, 19 Nov 2026)

The owner's direction again: "options should be unlocked more slowly". The content lane had put the Archive, the seams,
the load curve and the travel dial into run 4 at five-minute steps, on top of the Commons. Now, from run 4 on, a run
brings **at most two** systems: one **at the Reckoning** that begins it, and one **mid-run**, never within five minutes
of each other. The rule is in the data (`src/content/features.ts`), not the core:

- **Mid-run** arrivals (the seams, the load curve, the travel dial, the Archive, the bite) share one window, **minutes 20 to 24** of a
  run. The window is shorter than the five-minute gap, so at most one of them can arrive in a run. Each needs the one
  before it and a run floor, so they come one run apart and in order. Twenty minutes in, the run's Industries are open
  and the player knows them.
- **Reckoning** arrivals (Settlement, the free price, the household survey, Histories) hold only while the run is
  under two seconds old, which only the check in `reckon()` sees; one per Reckoning, in `FEATURE_IDS` order. The free
  price gives way to the survey and to Histories when they are due, so the Proprietor's Day stays near hour 6–7 and
  Histories come soon after hour 8. (Second pass: the Archive moved to the mid-run chain, after the travel dial; at the
  Reckoning it queued behind the others and slipped to hour 12.) Settlement moved here too: a Steady State earned early in a run used to bring it mid-run.
- The letters stay at **run 2, from minute 15** (not later: a burning run 2 collapses at about 21–27 minutes, and an
  arrival in its last five minutes would push the Charters, which are drawn only at a Reckoning, out of run 3).
  Ambient news stays at run 2, minute 5.

| What | When (scripted players: budget · mixed · human) | Gated by | Introduced by |
|---|---|---|---|
| Ambient news (`ambient`) | run 2, 5 min (all) | 1 Reckoning | none: the paper has more in it |
| Letters (`dispatches`) | run 2, 15 min (all) | 1 Reckoning, revealed, 15 min in | the correspondent's first letter |
| The Commons (M2) | run 4 at the Reckoning (all) | 3 Reckonings | "Ratepayers petition for baths and libraries…" |
| The seams (`seams`) | run 4 · run 6 · run 4, at 20 min | Steady State has arrived (an earlier run), 3 Reckonings, Steam's price ≤ 0.6 (the condenser), the window | "Colliery agents report good coal below the old workings" |
| Settlement (M2) | the Reckoning after the first Steady State: run 5–6 · run 6 · run 8 | Steady State achieved, 4 Reckonings, at the Reckoning | "A settled industry proposed…" |
| The load curve (`load`) | the run after the seams, 20 min: run 5–6 · run 7 · run 5 | the seams, 4 Reckonings, Light delivering, the window | "Evening Lamp notes the works stand idle every afternoon" |
| The Archive (`archive`) | the run after the travel dial, 20 min | the travel dial, 6 Reckonings, the window | "The Gazette opens its archive to subscribers" |
| Travel time (`travel`) | the run after the load curve, 20 min: run 6–7 · run 8 · run 6 | the load curve, 5 Reckonings, Motion delivering, the window | "Motorist survey: faster roads, and the same hour at the wheel" |
| Free at the point of use (`freeAtUse`) | a Reckoning after the travel dial: run 7–8 · run 9 · run 7 | the travel dial, 6 Reckonings, a business model ever bought in Compute (its Archive note), at the Reckoning, gives way to the survey | "info: price shown to user: £0.00" |
| The household survey (`survey`) | the first Reckoning from hour 6 with the Civil Service owned: ≈ 7–10 h · ≈ 13 h · ≈ 7.8 h | 5 Reckonings, hour 6, the Civil Service, at the Reckoning | "Statistics Office proposes a survey of how households spend the day" |
| The Proprietor's Day (card) | minutes after the survey once a return is on file (`--file-return=6`): ≈ 7–10 h · — · 8.2 h | the survey, three sessions each side | its own card |
| Levers that bite back (`sideEffects`) | the window of a run after the Archive, once a lever has bitten (0.3): the human player enacts an attractive measure alone from run 4 and pairs it once it sours | the Archive, 7 Reckonings, a bite ≥ 0.3, the window | the first 'biteBack' headline |
| Histories (`histories`) | the first Reckoning from hour 8 after a Steady State held (≈ 9–10 h) | Steady State achieved, hour 8, 6 Reckonings, at the Reckoning | "Historians invited to run the century again, under other rules" |
| Banked time (`bank`) | never in M3 | — | — |

Measured with `bun run tools/balance.ts <budget|mixed|human> 1 --total-hours=12 --summary --unlocks --file-return=6`
(19 Nov 2026); asserted in `src/balance.test.ts` ("the unfolding"). The budget player's runs from run 5 last about
three hours, so its later Reckoning arrivals come late in hours; the human player's runs are 40–110 minutes.

## M3 finish: the first ending (20 Nov 2026)

The coordinator's rule: the first ending needs **every Industry settled at once**, held fifty years
(`GlobalParams.endingYears`). Settlement still arrives where M2 put it, at the Reckoning after the first Steady State
(run 5, about hour 4–6), but Parliament holds only **three** settled Industries at once (`GlobalParams.settleMax`). The
**Settlement Commission**, an Institution in the Hindsight shop (1,500 Hindsight; its second sitting 3,750; one seat),
makes room for the fourth and the fifth (`settleSlotAdd`). The ending is then one long run in which all five reach
Steady State and are settled together, and held. Nothing is gated on the clock: the wait is the Hindsight the
Commission costs and the run it takes. The budget panel's last line is the checklist, read from `Derived.ending`
("Settled 3 of 5. Motion needs clear skies for 50 years (12 so far)", or "…as many as Parliament will hold; an
Institution can make room for more"). An hours gate (Settlement from hour 11) was tried and withdrawn: a timewall the
player could not see, and it left hours 4–11 without Settlement.

The scripted players pursue it as a competent player would (`tools/balance.ts --ending`, on by default; mirrored in
`src/balance.kit.ts`): they save Hindsight for the Commission once Settlement has arrived and seat it first; settle each
Industry once it reaches Steady State and the net Mandate rate can hold it; under a held line whose sky has not cleared
they buy the Industry's efficiency cards and tighten its cap; and they stay in the run, past the three-hour cap, while
the room for all five exists and four are settled (or two, with a clear streak running in another).

| Player | Industries open (h): Light · Motion · Compute · Code | First Steady State | Commission | Settled in the ending's run (h) | Ending |
|---|---|---|---|---|---|
| `mixed` | 0.9 · 1.5 · 2.8 · 4.1 | 3.5 h (Compute) | L1 after run 5, L2 after run 7 | Code 13.7, Compute 13.8, Light 14.7, Steam 14.8, Motion 18.0 | **18.2 h** (run 8) |
| `budget` | 0.9 · 1.6 · 2.7 · 4.2 | 3.6 h (Compute) | L1 after run 5, L2 after run 7 | Code 13.7, Compute 13.7, Light 14.9, Steam 14.9, Motion 18.6 | **18.9 h** (run 8) |
| `human` | 0.7 · 1.4 · 2.3 · 3.7 | 4.7 h (Compute) | L1 after run 5, L2 after run 7 | Code 13.3, Compute 13.5, Steam 13.7, Light 15.0, Motion 15.1 | **15.4 h** (run 8) |

Measured with `bun run tools/balance.ts <player> 1 --total-hours=24 --commons --no-series --unlocks`; asserted in
`src/balance.long.test.ts` (BAL_LONG=1). Motion is the last to settle for the restraint players: its sprawl holds its
smoke up until the cap has been tightened several times (about three hours into the run); a player who does not found
the sprawl uses clears it in forty minutes. Persistent Settlement across Reckonings was not needed.

## M4: the Coal Age complete (balance lane, 20 Nov 2026)

Act I is now the Coal Age's four Industries (Steam, Light, Iron & Steel, Fishing); Motion, Compute and Code open after the
Act I ending as Previews. The Act I ending is every Coal Age Industry settled at once for fifty years. From run 4 a run
still brings at most two new things, and an Industry opening is the run's mid-run arrival (design/m4-design.md §9). The
mid-run window is minutes 25–29 (clear of any Industry's opening by five minutes); the Reckoning arrivals are unchanged.

| Run | At the Reckoning | Mid-run | Scripted players (budget · mixed · human) |
|---|---|---|---|
| 1–3 | as M3, without Motion | | Light 0.86 · 0.77 · 0.65 h; first Steady State 3.3 · 2.2 · 2.5 h (run 3) |
| 4 | the Commons | **Iron & Steel opens** (minute 10–15) | Iron 3.59 · 3.31 · 3.26 h |
| 5 | Settlement | the seams (minute 25) | first settlement 6.3 · 6.1 · 6.8 h |
| 6 | — | **Fishing opens** (minute 20); **the Board's Survey** at its first poor season (minute 31–33) | Fishing 7.67 · 7.42 · 7.42 h; Survey 7.84 · 7.60 · 7.64 h (catch per trip 0.81, the stock 0.50); the foreign boats reach 27–31% of the catch, so the fishery limits are offered |
| 7 | the household survey | the load curve | |
| 8 | Histories | the Archive | |
| 9 | — | (levers that bite back, once a lever has bitten) | **the Act I ending 16.65 · 15.31 · 17.27 h**; Fishing settles last, 77–154 minutes in |
| 10+ | the capstone | Motion (Preview) at minute 5; Compute the run after; Code after | capstone defence 0–1% of Mandate, never in arrears |

Measured with `bun run tools/balance.ts <player> 1 --total-hours=24 --json --no-series --unlocks --commons
--dispatch=thoughtful --survey=board` (design/scratch/m4-balance/g-*.json, after the finishing pass; summarise with
design/scratch/m4-balance/an.py and crit.py); asserted in src/balance.long.test.ts and src/balance.test.ts.

What sets the pace (no clock anywhere): the first Steady State needs Steam's line held under its clear level for fifty
years (Steam's coal is 760,000 tons since M4, so a held line no longer runs out before it clears); Fishing waits for
Settlement and five Reckonings; the Act I ending waits for the Settlement Commission's first sitting (5,500 Hindsight:
room for the fourth settlement, bought after run 8), and in the ending's run Fishing: surveyed (the Fishery Board or
survey cruises), held within its line for fifteen decades, and clear against the foreign boats, which fill the room a
held home fleet leaves (the fishery limits answer them). Every player meets the Board's Survey in the run Fishing opens, before hour 8.

Longest gap between firsts (features, Industry openings, the first poor season, the first survey, each Industry's first
settlement): to hour 14 budget 2.08 h, mixed 2.31 h, human 1.86 h; from hour 14 to the ending 2.65 / 1.03 / 3.10 h.

## M4 polish: the spring surveys (20 Nov 2026)

The M4 arc's hours 8–15 were mostly saving: three Industries settled in each of runs 7 and 8 by minute 70–80, and the
only thing ahead was 5,500 Hindsight for the Settlement Commission's first sitting (room for the fourth settlement),
bought after run 8. Now the first sitting waits on **evidence**: the Board's **spring survey passed in three runs**, each
to a stricter standard (achievements with a headline, `src/content/achievements.ts` `SPRINGS`; the Commission's
`InstitutionDef.needs`, shown on its card as "Sits once: …" and in the ending checklist). Its price falls to 2,500,
which is to hand when the third spring passes. Each spring is a thing done in a run, not a number:

| Spring | The Board's standard (Fishing surveyed, 15 decades within its line this run, and…) | Needs |
|---|---|---|
| The Spring Survey | the banks at ¾ of K or more, foreign boats under 10% of the catch | — (in practice, the run Fishing opens: rebuild the bank after the Board's Survey at half, buy Garstang's inquiry and keep a survey vessel at sea, raise the limits) |
| A Second Spring | ⅘ of K, foreign under 7% | the first, in an earlier run |
| Three Springs | 85% of K, foreign under 5% | the second, in an earlier run |

The fishery limits are offered once the first spring has passed (as well as at a 15% foreign share), since the later
standards ask for fewer foreign boats than that; Garstang's inquiry (which unlocks survey cruises) costs £25,000 (was
£60,000), so the first spring can be passed in the run Fishing opens without the Fishery Board. The Archive moves from
run 8 to run 9 (the ending's run had nothing new in it; run 8 has the third spring), the bite from run 9 to run 10.

| Run | At the Reckoning | In the run | budget · mixed · human (h) |
|---|---|---|---|
| 6 | — | Fishing opens; the Board's Survey; **the Spring Survey** (minute 73–110) | Survey 7.84 · 7.54 · 7.75; spring 8.69 · 8.88 · 8.41 |
| 7 | the household survey | the load curve; **A Second Spring** (minute 70–87) | 11.13 · 10.49 · 10.63 |
| 8 | Histories | **Three Springs** (minute 70) | 13.10 · 12.49 · 12.72 |
| 9 | **the Commission's first sitting** (room for a fourth) | the Archive (minute 25); four settled at once (minute 103–147); **the Act I ending** | sitting 13.93 · 13.57 · 13.95; ending **15.93 · 15.68 · 16.68** |

Longest gap between firsts (as criterion 2 counts them, plus each spring, the sitting and the room first used): to hour
14 1.75 · 1.75 · 1.83 h (M4: 2.08 · 2.31 · 1.86); hour 14 to the ending 1.30 · 1.41 · 2.03 h (M4: 2.65 · 1.03 · 3.10).
Counting every first the tool logs (letters, applications too): 108 · 108 · 122 minutes to hour 20 (M4: 258 · 217 · 269).
Measured with `bun run tools/balance.ts <player> 1 --total-hours=24 --json --no-series --unlocks --commons
--dispatch=thoughtful --survey=board` (design/scratch/m4-polish/s7-*.json; summarise with crit2.py there).

One caution about the scripted players: every restraint run from run 3 is held to its 120th minute while Motion, a
Preview that opens only after the Act I ending, counts as an Industry still to open (`opening` in tools/balance.ts). The
M4 pacing was tuned with that hold; without it (`--opening-fix`) the whole arc runs about two hours earlier (Iron 2.3 h,
Fishing 5.2 h, the ending 14.4 h for `budget`). It also leaves `budget` and `mixed` sitting 39–64 minutes at the end of
runs 7 and 8 after their spring and third settlement; the human-like player Reckons once a run's work is done (tails
of 0–17 minutes in hours 8–15).
