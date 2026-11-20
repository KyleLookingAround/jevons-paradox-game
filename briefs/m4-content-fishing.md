# Brief: M4 CONTENT lane — Fishing

You write Fishing, the Coal Age's fourth Industry and Act I's finale, to the Industry kit: the renewable stock and its
numbers, the lying gauge, the survey, the foreign fleets, the fishery limits, the quotas and the moratorium. The design
is `design/m4-design.md` §5 (read all of it, including §5.7, Fishing's own unfolding) and §6. Other lanes work at the
same time: core, Iron, text, Act and prestige, UI, scene, audio; balance comes after and owns the final numbers.

Do NOT edit `src/types.ts`, `src/core/**`, `src/ui/**`, other Industries' files, `src/content/index.ts`, `features.ts`
or `content.test.ts` (the Act lane owns them). No git writes.

## Standing instructions

- Keep `design/scratch/m4-content-fishing-progress.md`; land one verified piece at a time.
- House style (`design/style-guide.md`). Facts only from `design/research/*.md` ([V], [S]) or checked by you, with the
  source in your progress note. The design checked four sources this session (its last section): Huxley's 1883 wording,
  Garstang 1900, Harley et al. 2001, Zink & Geyer 2017. Items marked * in the design need your check (fried fish shops,
  ice from Norway, the otter trawl, steam drifters, the three-mile limit) or must be left undated.
- Dark history and people (owner decision D4): the moratorium's people are named by place; no deaths as content; no
  joke at the ports' expense.

## Your files

`src/content/sectors/fishing.ts` (new): the SectorDef with `resourceKind: 'renewable'`, `renewable` (regen, threshold,
collapsed, beta, scar, startScarred, foreign), `pressureSource: 'depletion'`, `drawsOn` Steam, spill into Light (small),
`settle` with `requires` (surveyed), applications, upgrades, levers, `mechanic`, sector headlines (60, Fishing's own
paper: harbour notes and landings).

## Work

1. **Numbers' intent first** (write them as named constants with comments; balance will tune):
   - θ (threshold) about 0.2; collapsed about 0.1; β about 0.3 (catch per trip ≥ 65% at a true 30%); scar mul about
     0.15 for about 150 model years; startScarred = θ.
   - regen r such that the unrestrained `efficiency` player's first Fishing run crosses θ in 20–40 minutes and a
     surveyed 90%-of-surplus quota holds the stock above 0.5 K.
   - foreign: about 10% at opening, cap 0.6, growth so that it passes 15% (the sails appear) within about 10 minutes of
     ordinary play; announceAt 0.15.
   - crisisAt [0.5, 0.8] (0.8 = 1 − θ: The Banks Fail is the second crisis); collapseAt chosen so pressureWellbeingCost
     reads like Steam's smoke at the same fraction.
2. **Applications (6)**: Fresh fish by rail; Fried fish shops (date checked or undated); Salt and smoked trade; Fish
   meal for the fields; Cod liver oil; Fish fingers (`locked`: the Act II revival).
3. **Upgrades**: 5 efficiency (fish landed per fish killed: spoilage and discard), 4 capital (fishing power) plus the
   repeatable "Another trawler", 2 forks (Long-liners / Beam and otter trawl; Grimsby / Hull), the prospect *The
   Fisheries Exhibition, 1883* (Huxley's wording exactly as the design gives it), the research card *The Impoverishment
   of the Sea* (Garstang 1900) which unlocks the survey cruises lever and becomes visible after the first poor season
   (`when` on `{ stat: 'crises', sector: 'fishing', op: '>=', value: 1 }`).
4. **Levers (6)**: Fishery limits (measure: foreignMul per level; `sideEffects` satMul on home uses `unless` the survey
   quota is in force; levels "Close the bays", "Twelve miles", "Fifty miles", "Two hundred miles"; visible once
   `{ stat: 'foreignShare', … '>=', 0.15 }` has held, via `requires` or the lever's `when` the contract offers);
   Quota (from landings) (cap); Quota (from the survey) (`quota`; last authored level 0 = the moratorium with its catch
   line); Closed season (sufficiency); Mesh size (measure: a little η, a little less catch); Survey cruises (measure with
   the survey effect; `locked`, unlocked by Garstang).
5. **Settle**: `requires` surveyed (label "The stock surveyed"), dividend and blurb ("The Board sets the catch at what
   the banks will bear. Skipper Tench complains, and goes out on Monday.").
6. **Formula and gauge text** the UI shows (in content, as strings the UI reads): "Catch per trip, as the skippers report
   it. It is not a survey." and the scar line. Agree the field names with the UI lane through the coordinator if the
   contract has no slot (then they live in the UI's copy).
7. Hand the Act lane: the registry line; `ages.ts` (Fishing in the Coal Age); the Fishery Board Institution's id and
   effects you need (the Act lane writes it); `unlock`: `minReckonings: 5`, Settlement arrived, Steam's Steamships and
   Railways founded, and the run's mid-run window.

## Done means

- The lint passes for Fishing (kit, renewable fields present and in range, a rebounding lever, the mechanic heading,
  `settle.requires` resolves, headline rules, banned words).
- With the core lane's build, headlessly: `efficiency` and `budget` (unsurveyed) cross θ in their first Fishing run;
  `fishsteward` does not; the scar holds the next run's stock at minute 20 ≤ 0.4 K; catch per trip ≥ 0.65 at a true 0.3
  (report each with its command).
- A 390 × 844 screenshot of the Fishing panel unsurveyed and surveyed on the real page (with the UI lane's chart when it
  lands), checked for wrapping.

## Final report

Constants and why; facts checked and sources; what was left undated; the measurements above; what balance should tune
first (r and θ for the first-run crossing; scar years for the ending's hour).

## Revision (20 Nov 2026): The Survey and foresight

- Add `renewable.firstSurvey` (atCrisis 1, afterSeconds 1800, years 10; balance tunes) so every player meets the Board's
  Survey in the run Fishing opens.
- The survey cruises lever's catch line now says what the player has already seen once ("The Board's vessel again, for
  as long as the House will pay for her").
- Revival "Steel trawlers" is cut.
