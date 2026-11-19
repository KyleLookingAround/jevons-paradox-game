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
