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

Run 1: the reveal, the levers, people (three arrivals, 5 min apart). Run 2: the shop, the Market, more levers.
Run 3: Charters, the budget, Tighten, dividends, the pace, clear skies (the budget's own unfolding, each tied to a
decade the player has just earned). Run 4: the Commons, Steady State. Run 5: Settlement.
