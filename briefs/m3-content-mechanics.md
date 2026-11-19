# Brief: M3 CONTENT — mechanics, rebounding levers, Histories (and the registry)

You write the per-Industry data of "Rebound" for M3: each Industry's mechanic data and retunes, a lever that bites back
in every Industry, the ten Histories, and the feature schedule. You also own the content registry and the lint, which
the two other content lanes (dispatches; archive) feed without editing. Other lanes work from the same contract and do
not talk to you: core, content-dispatches, content-archive, UI, scene, audio; balance comes after you.

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`.

## Standing instructions

- You will be interrupted by container restarts and usage limits. Keep a progress note at
  `design/scratch/m3-content-mechanics-progress.md`, update it after each piece, and land one verified piece at a time
  (lint green for what you touched).
- Make no git writes; the coordinator commits.

## Read first, in full

1. `src/types.ts` (search "M3"); "M3 MECHANICS" above `SectorDef`; `LeverDef.sideEffects`; `HistoryDef` (the History
   rules); `M3FeatureId`.
2. `design/m3-contract-notes.md`, section 0 (the unfolding: this is a design constraint on everything you write) and
   sections 1, 2 and 4.
3. `design/style-guide.md` (all text obeys it); `src/content/README.md`.
4. `design/long-game.md` (each Industry's mechanic and rebounding lever); P8, P10, P12 in `design/proposals.md`;
   `design/genre-audit.md` rec. 14 (History rules); `design/research/energy.md` §1.1, §3, §5.1–5.2, `digital.md` §3–5,
   `restraint.md` (the ways restraint rebounds; the levers table).

## Your files (only these)

- `src/content/sectors/*.ts` (all five Industries), `src/content/histories.ts` (new), `global.ts`, `helpers.ts`,
  `prestige.ts`, `charters.ts`, `commons.ts`, `ages.ts`, `dividends.ts`, `words.ts`. (`achievements.ts` belongs to the
  archive lane; `news/` to the dispatches lane.)
- **The registry and the lint, single owner:** `src/content/index.ts` and `src/content/content.test.ts`. The other two
  content lanes put their data in their own files and list in their reports what to register and lint; you wire it in
  (import and assign `cast`, `dispatches`, `ambient`, `archive`, `proprietor`, `ending`, and their achievements) as soon
  as their files exist, even half-filled. Agree nothing with them directly: the file names are fixed below.
- **The M3 feature entries** in M2.1's content features file (if M2.1 has landed: whatever file holds
  `Content.features`; else note the entries in your report): one entry per `M3FeatureId`, with its `when` and its
  one-line introduction.

Files the other lanes own (import them; never edit): `src/content/cast.ts`, `src/content/dispatches/*.ts`
(each exports an array; `dispatches/index.ts` concatenates them), `src/content/news/ambient.ts`,
`src/content/archive/*.ts` (`archive/index.ts` concatenates), `src/content/proprietor.ts`, `src/content/ending.ts`,
`src/content/achievements.ts`.

## Work

### 1. The feature schedule

Write the eleven feature entries to the table in `design/m3-contract-notes.md` §0, as Conds. Rules: roughly one new
system per early run; never two feature unlocks within five minutes for the scripted players (if M2.1 offers a built-in
spacing, use it; otherwise add `time ≥` terms against the neighbours you know of — the Budget at about run 3, the
Commons at about run 4); each introduced by one dry line in the paper (the `intro` field M2.1 provides), never a
tutorial. Leave `bank` off (`offline.bankRate` 0) and its entry present but unreachable.

### 2. One mechanic per Industry (simplest form first)

Each Industry gets `mechanic: { name, rebound, blurb }` and its data. Retune so the Industry's opening price and first
minutes are as before (the mechanic should bite as the Industry grows, not on arrival); say in a comment next to each
number what it does.

- **Steam: seams.** Move most of the reserve into four to six `seams` (Coal Measures names, depths in fathoms where
  verified, else no depth), each dearer (`priceMul` rising), each reachable at a lower service price (`reachBelow`), so
  that the condenser and the Cornish engine are what reach the deep ones. Keep the efficiency player's run 1 ending at
  30–45 min in run 1 if they sink nothing (the balance lane checks); sinking postpones exhaustion and enlarges the
  burn. Keep pumping's `reserveGainPerService` balance rule.
- **Light: load.** Profiles at least `evening` (street lamps, homes, shop signs), `night` (night shifts),
  `day` (trams, motors) and `flat`; `fixedShare` about 0.5–0.7; compensate `capCost`. The off-peak and flat-rate fork
  stays: the off-peak arm now matters through the load factor; the flat-rate arm may use a `priceSeen` flat price on
  homes. The gas/electric fork gives the arms different profiles' worth (e.g. electric opens day uses).
- **Motion: travel.** `roads` so that congestion starts to bite about 15 minutes into Motion; `hoursScale` so that
  hoursPerHead reads about one hour a day at the start; `travel.apps` the commuting, shopping and suburb uses (vans are
  not); `lockInDecay` small (sprawl halves in about an hour of play) on the lock-in uses; the motorway and relief-road
  cards gain `travelMul` (speed, roads).
- **Compute: free at the point of use.** The web and streaming get `priceSeen` share 0 through the advertising card
  (a `priceSeen` effect), subscriptions a flat price; the free uses then sit near saturation and only sufficiency
  moves them.
- **Code:** `mechanic` naming its existing mechanic (the code stock, attention, deletion). No new data unless a retune is
  needed.

### 3. A lever that bites back, in every Industry

At least one per Industry, with `sideEffects` and an `unless` pairing that makes it work. The `catch` line states the
risk up front; `sideEffects.blurb` is the "bites back" line; `unlessLabel` the pairing in words. Use `'measure'` for
policies that act through effects. Suggested (each from the dossiers; verify dates):

- Steam: coal duty with exemptions for "productive use" (the exempt uses grow: satMul on them), unless a cap;
- Light: renewables without a cap (substitution; side effect satMul on the sector: additions, not displacement, York),
  unless the cap; or the off-peak tariff as a measure;
- Motion: fleet fuel-economy standard (measure: etaMul; side effect satMul on suburbs/the heavy car, the light-truck
  loophole), unless the fuel duty (Knittel); and road building (measure: travelMul roads; its rebound is endogenous now,
  so it needs no side effect — say so in its catch);
- Compute: efficient data-centre certification (measure: etaMul; side effect satMul on training: the build-out), unless
  the cap;
- Code: agent reviewers (side effect: more shipped), unless the review gate;
- one green-paradox lever somewhere (an announced phase-out: side effect `resourcePriceMul` < 1, the rush to extract),
  unless a cap or "Keep it in the ground".

### 4. Ten Histories (`histories.ts`)

Written to the History rules (HistoryDef comment): rewards are options only (a locked Commons project or locked
Charter you add, a cosmetic key, an achievement, a title); no QoL or automation behind one; one in force at a time; each
cleared by `budget` within 2× the median time. Each isolates one rebound. Candidates (P12): Coal-rich (reserveAdd,
resourcePriceMul < 1: the resource curse), No Watt (forbid the condenser), The Statistician (reveal; suspend knowhow),
Laissez-faire (forbid every lever kind until the second crisis: forbidUntil), Island nation (forbid prospects and
seams beyond the second), Austerity (mandateRateMul 0.5), Moore forever (Compute etaMul or autoEta via effects), Fee
and dividend (levers' recycle forced is not expressible: use incomeMul and a dividend Charter instead), Smoke-blind
(intensityMul, no warning: hide nothing the UI needs; only the rule), Gas against electric (a fork forced). Add the
locked rewards: two or three locked Commons projects (`commons.ts`) and two locked Charters (`charters.ts`, appended at
the end: never reorder). `requires` each after the first Steady State and hour 8 (the feature's gate covers it).

### 5. Other numbers

- `global.ts`: `dispatch` (firstYears, intervalYears about 8, expiryYears about 12, maxPending 1) and `ambient`
  (everyYears 4) explicitly; leave the bank off.
- `prestige.ts`: one Institution with `orderUnlock: 'dispatch'` (the standing dispatch order), hour 8 or later.
- `UpgradeDef.machine` on every card with a `stage` ("Watt engine", "Cornish engine", "turbine hall"…).
- New headline keys in `news/fallback.ts`?: NOT yours — the dispatches lane owns `news/`; it adds the nine new keys.

### 6. The lint (`content.test.ts`, yours)

Add: every Industry has `mechanic`; at least one lever per Industry has `sideEffects` with `unless`, a `blurb` and a
`catch`; `'measure'` levers have `effects`; seams resolve (ids unique, `priceMul` non-decreasing, `reachBelow`
non-increasing, stock sectors only); load profiles have LOAD_HOURS non-negative weights and the default exists; travel
apps exist; Histories obey the rules (reward ids are locked Commons or Charters only; no orderUnlock, offlineCapAdd,
slotAdd anywhere in a reward; goal and requires resolve); every M3FeatureId has a feature entry; and, for the other
lanes' data once wired: dispatch arms 2–3, each with `price`, default arm with no `cost` and no standing `effects`,
cast ids resolve, `next` resolves, headlines ≤ 70, bodies ≤ 400, labels ≤ 28; ambient `when` resolves, variants ≤ 70
at value 1234.5; Archive notes have ≥ 1 source and a resolving subject; proprietor templates cover all three
directions; placeholders all known; no "you" in headlines; banned words and Americanisms as now.

## Checks

```
bun test src/content
bunx tsc -p .                       # your files clean (core/UI errors are theirs)
bun run tools/balance.ts budget 3 --summary --unlocks     # once the core lane has landed
```

## Exit criteria (yours)

- Five Industries each with a named mechanic and its data; at least one rebounding lever with a pairing in each; ten
  Histories to the rules; eleven feature entries matching the schedule; the registry wires the other lanes' files; the
  lint covers everything above and passes.
- Does not crowd the unfolding: on the scripted players no two feature unlocks fall within five minutes through hour 10
  (check with `--unlocks` once available; the balance lane owns the final numbers).

## Final report (concise)

What you wrote per Industry (mechanic numbers and their reasons); the rebounding levers and pairings; the Histories
and their rewards; the feature table as written; facts you used and any you could not verify; contract gaps.
