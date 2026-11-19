# Rebound — house style

For anyone writing player-facing text in `src/content/`. One page; the lint (`src/content/content.test.ts`, "words"
and "house style") enforces the mechanical parts. When in doubt, cut.

## The voice

A dry British broadsheet, written by a subeditor who has read the ledgers. The paper reports; it does not explain.
The joke is in the juxtaposition of two true facts, never in a comment on them. **The game never lectures; the gauges
do.**

- **Register.** Plain, exact, slightly formal. Understatement over emphasis. One turn per line.
- **Person and tense.** Headlines: present tense, third person ("Mill owners order three more"). Card blurbs: present
  tense, imperative or description ("Stop cooling the cylinder every stroke"). Catch lines: second person is allowed
  ("Spends attention you could be shipping with"), sparingly. The game never says "I" or "we", and never "you" in a
  headline.
- **Never.** Exclamation marks. Rhetorical questions. Winking at the player ("see what happened there?"). Moralising
  adjectives (greedy, wasteful, sinful, shameful). "Ironically". Puns that need explaining. Modern slang outside the
  Attention Age. Explaining rebound before the reveal; preaching about it after.

## Headlines

- Sentence case, no full stop at the end, 70 characters at most (lint), 60 or fewer by preference.
- **The build:** a plain statement, a semicolon, and a dry second clause that is also true ("Engines thriftier than
  ever; collieries report record sales"). Or a single deadpan statement. A colon introduces a label or a quotation
  ("Black fog No. {n}: the shops shut, the chimneys do not").
- Verbs do the work; headlinese is fine (hail, eye, back, quit), but not twice in one line.
- Attribution after the quote: "“A lasting fall”, say makers". Curly quotes “ ” and ‘ ’, curly apostrophe ’.
- **Placeholders.** `{app}`, `{resource}` and `{service}` are lower-cased mid-sentence; write lines so the
  substituted forms read in every Industry ("Speculators eye cloud storage"), and check them with
  `bun run design/scratch/editor-subst.ts`. Avoid a/an before a placeholder, and verbs that must agree with it
  ("{app} is" fails on "Railways"). `{sector}` is a proper name (Steam, Light, Motion, Compute, Code): use it as
  one ("Steam settles"), not as an adjective ("the Steam industry").
- **Each Industry speaks in its own paper.** The Colliery Gazette (Steam), The Evening Lamp (Light), The Motorist
  (Motion), a system log (Compute: `info:`, `warn:`, `error:`, `fatal:` and a terse message), a changelog (Code:
  `Added:`, `Fixed:`, `Changed:`, `Removed:`, `Deprecated:`, `Known issue:`, `Released v{n}.0`). The fallback set
  must fit any of them, so it is plain broadsheet with no period props.

## Cards, levers and the rest

- **Name** says what the thing is, in its period's own words, sentence case, short enough for one line at 360 px
  (about 24 characters on a card, 22 on a lever). **Blurb** is one or two sentences, at most 140 characters: who
  and when if it is history (only verified facts), then the turn. It never repeats the number, which the **promise
  line** prints in large type; it never says "efficiency".
- **Before the reveal** (Steam, run 1) blurbs speak with the seller's optimism: the consequence is a boast ("The
  shipping lines are delighted, and order more ships"), never a mechanism ("cheaper, so more"). After it, a card may
  name what it will bring, still as a fact, not a warning.
- **Applications** are named as a merchant would list them; the blurb is the use in one breath.
- **Catch lines** say honestly what the lever costs — income, comfort, votes, leakage, time — in a sentence or two. Not
  a joke at the lever's expense, and not a sermon. Duty and cap catches end with the shared dividend sentence.
- **Know-how** blurbs end on the faster wall ("The pits empty all the sooner"); **Institutions** say what is in place
  from minute one. **Achievements**: Title Case names; the blurb is a ledger entry in the past tense.
- **Age taglines** are one sentence about the period, not the player.

## Period flavour without pastiche

Steam (1780–1870): engine houses, collieries, duty, the Exchange, Parliament; no "smog" (a 1905 word: say smoke,
black fog). Light (1870–1950): the parish, the gas company, the ratepayers, lamplighters, the Board. Motion (1950–2000):
the ring road, the forecourt, the motor show, the Minister of Transport. Compute (2000–2025): racks, chillers, the
grid operator, uptime. Code (2025–): tickets, pull requests, the pager rota, the backlog. Flavour comes from nouns, not
from mock-archaic grammar: no "ye", "'tis", "forsooth", "egad".

## Running jokes (keep; ration to a few uses each)

1. Thrift is greeted by ordering more ("order three more"). 2. The minister is "listening". 3. The inquiry will report
"in due course". 4. The clubs find the question tiresome. 5. Numbered disasters ("Black fog No. {n}"). 6. Efficiency
as a sport whose score is published and whose total is not.

## Facts, people, history

Only names, dates, figures and quotations marked [V] in `design/research/` or checked by the author against a primary
or scholarly source. Jevons's own words only as verified there (*The Coal Question*, 1865; ch. VII "Of the Economy of
Fuel"). Real people only in card blurbs, and only the dead. No real company or product used as a joke at its expense.
Dark history (child labour, colonial trade, mining deaths) is acknowledged where the history demands it, never as a
resource, an application or a joke.

## Spelling, punctuation, numbers

British spelling (-ise, colour, tyre, kerb, programme; "program" only for computer program). Spaced en dash is not
used; use a semicolon, a colon or a comma. Numbers one to nine in words in prose, figures from 10, and always figures
with units (£250, 12 mph, 1,000 hours). "Per cent" in prose; "%" in labels and headlines. Dates "1769", "c. 1800",
"the 1850s". Thousands with a comma. Units in lower case as the content defines them.

## Canonical terms

| Use | Not |
|---|---|
| Industry (the unit), Age (the period); capitalised when they mean the game's concepts | sector, era |
| Steam, Light, Motion, Compute, Code (Industry names, used as proper nouns) | the steam sector |
| use (an application, on screen "Uses of …"); found / founded; "within reach" | app (on screen), launch, "thinkable" |
| the budget line, "the line"; a decade within budget; Steady State (capitals) | the quota, steady-state |
| Reckoning, Hindsight, Know-how, Institution, Mandate, Capital | prestige, reset |
| counter-lever (UI heading), lever; Enact, Tighten | policy slider |
| backfire (rebound over 100%); rebound | Jevons effect |
| crisis by its name (The Black Fog, The Pea-Souper, The Summer Smog, The Heat Dome, The Great Outage) | event |
| coal duty (Steam), fuel duty escalator (Motion only; a 1993 term) | fuel duty in 1800 |

## Ten examples from the real content

| Before | After | Why |
|---|---|---|
| The Coal Question: "A pamphlet by a young economist, 1865, asks why each engine that saves coal is followed by a larger coal bill." | "Mr Jevons, 1865: an inquiry into the probable exhaustion of our coal-mines. Chapter VII asks whether thriftier engines will save them." | It was a book, not a pamphlet; the card now poses the question in his own chapter's terms and answers nothing. |
| Incandescent gas mantle: "Welsbach’s little sock of rare earths…" | "Welsbach’s little sock of thoria, glowing white in the flame. Gas lives to fight the bulb." | Thoria is not a rare earth (99% thoria, 1% ceria). |
| Steam lever: "Fuel duty escalator" | "Coal duty" | "Escalator" is a 1993 coinage; London levied coal duties for centuries. |
| Steam pressure: "Smog" | "Smoke" | "Smog" was coined in 1905. |
| Motorway programme: "No junctions, no lights, no reason to stay at home." | "The M1, 1959. No crossroads, no lights, no speed limit, and no reason to stay at home." | Motorways have junctions; the M1 had no limit until 1965. |
| Pirate engine: "…Cheaper engines, so many more engines." | "Nearly a Watt, from Bull or Hornblower, and no royalty to pay. Every pit in the county can afford one now." | Before the reveal the seller boasts; the card does not explain. |
| Open source everything: "…maintained by one person in Nebraska." | "Every wheel already invented, free, and kept turning by one unpaid volunteer." | The Nebraska line is someone else's joke. |
| Fallback: "Efficiency gains to ease demand for {resource}, experts agree" | "Experts agree the improvement will ease demand for {resource}" | Leads with the subject and drops the jargon; the irony is left to the gauges. |
| Code crisis: "Outage traced to a library nobody knew they used" | "Fixed: outage caused by a dependency nobody knew they had" | Code's paper is a changelog; keep the conceit. |
| Package holidays: "A fortnight on the Costa, for less than a week in Skegness." | "A fortnight on the Costa for the price of a week in Skegness, says the brochure." | An unverifiable price claim, now attributed to the people who made it. |
