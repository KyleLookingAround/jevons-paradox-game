# Brief: CONTENT workstream

You write all the data and words of "Rebound". Two other agents work in parallel on the model (src/model.ts) and the UI
(src/ui/*). Do NOT edit their files or src/types.ts.

Read first, in full: DESIGN.md and src/types.ts (the `Content` interface and everything it references; the doc comments
say what each number does in the simulation).

## Your file (only this)

`src/content.ts` — replace the stub with `export const content: Content = {…}` fully populated for all five eras.
Must typecheck: `cd /home/claude/rebound && tsc -p .` (ignore errors in files you do not own).

## Eras

All five per the DESIGN.md table. Each: name, years, tagline, service/resource/pressure names and units, theme
('ledger' Steam, 'gaslight' Light, 'chrome' Motion, 'terminal' Compute, 'agentic' Code), every numeric parameter, and
4–5 applications with id `<era>.<slug>`, name, one-line blurb, icon, halfPrice, saturation, steepness, visibleBelow,
foundCost and twist fields. Icon vocabulary (the UI draws exactly these): pump, mill, train, ship, lamp, factory-night,
house, sign, van, car, suburb, plane, sheet, globe, play, brain, wrench, phone-app, scroll, robots.

- Steam uses the DESIGN.md reference numbers exactly (p_0, c, m, α, and the four applications' p_i, S_i, k_i). Mine
  pumping is the free starting application (visibleBelow Infinity, foundCost 0) with reserveGainPerService. Mills visible
  at p_s ≤ ~0.8, railways ≤ ~0.5, steamships ≤ ~0.3; found costs rise steeply.
- Steam efficiency chain, cumulative η 1.5, 2.5, 3.5, 5, 8, 12, 18 (etaMul 1.5, 1.667, 1.4, 1.4286, 1.6, 1.5, 1.5):
  Better boilers, Separate condenser (Watt, 1769), Double-acting engine, High-pressure steam (Trevithick), Compound
  engine, Triple expansion, Steam turbine (Parsons, 1884). Each requires the previous.
- Light: resource "Town gas & current"; spill into steam (rate ~0.3–0.5).
- Motion: suburbs and commuting with lockIn 0.7–0.85.
- Compute: autoEtaRate ≈ 0.0046 (η doubles about every 150 s); later apps (streaming, model training) with very high
  saturation and steepness.
- Code: resourceKind 'flow' (attention capacity), pressureSource 'service', absorption 0, pressureUpkeep > 0, drawsOn
  compute; apps: internal tools, throwaway personal apps, legacy rewrites, "Agents writing for agents" (enormous
  saturation, low halfPrice). Efficiency chain Autocomplete → Chat assistant → Coding agent → Agent fleets (×3, ×4, ×5, ×8).
- Unlocks: light needs steam p_s below ~0.12 and 1 Reckoning; motion 2; compute 3; code 4. Set price thresholds so each
  era opens after most but not all of the previous efficiency tree (p_s = p_r/η + c, p_r rising as the reserve depletes).

## Upgrades per era

The efficiency chain (4–7 cards, real historical names; one-line blurb with a person/date only where you are confident
it is true); 1–2 'capital' cards (capCostMul < 1 or marginAdd); one repeatable 'prospect' card per stock era (reserveAdd
~0.25, costGrowth ~2.2, maxLevel ~6: "Sink a deeper shaft", "North Sea licence"…); and in Steam the 'research' card
"The Coal Question" (id `steam.coalQuestion`, effect `{type:'reveal'}`, requires the Separate condenser, priced to land
around minute 8–12; blurb credits W. S. Jevons, 1865).

## Pacing targets (the coordinator fine-tunes with a headless balancer afterwards; get the order of magnitude and a smooth geometric cost curve)

Income/s = Σ m × p_s × D. Steam at the start (η = 1, only pumping, p_s = 1.04): D ≈ 25, income ≈ 5/s. Click = clickFlat ≈ 2
+ clickSeconds ≈ 1. First upgrade within 60–90 s; mills by ~3 min; condenser ~6–8 min; the reveal ~10 min; railways
~12–15 min; full Steam efficiency tree by ~30–35 min of efficiency-only play. Coal Q0 sized so efficiency-only play
exhausts it or hits smog collapse at 30–40 min (R runs roughly 25 → 350 per second, cumulative ≈ 400–600k; pumping's
reserve gain adds 10–20%). First smog crisis around minute 15–20 (crisisAt e.g. [0.35, 0.65, 0.85]). Later eras: each
about 5–10× the money scale of the one before, and a little longer.

Wellbeing: Steam alone reaches ~35–45 at full adoption, each later era adds ~15–25; wellbeingTarget ≈ 28; subsistence ≈ 8;
mandateFloor ≈ 12; mandateRate so mid-Steam earns ~0.2–0.5 Mandate/s; crisisMandate ≈ 150; crisisPopLoss ≈ 0.08;
popGrowth small (population about doubles over a healthy 40-minute run). offlineCapSeconds: 4 hours. Hindsight weights:
a 35-minute efficiency-only first run (peak wellbeing ~35, no decoupled years) yields ~35–50; decoupled years ≈ 2 each;
steady eras ≈ 150 each.

## Levers

3–5 per era, 3 levels each, Mandate costs rising ~3× per level (level 1 ≈ 60–150 in Steam), small real upkeep for
duty/cap/substitution/deletion. Read the LeverKind and LeverLevelDef comments for what value/value2 mean per kind.
- Steam: `steam.duty` Fuel duty escalator; `steam.cap` Smoke abatement cap; `steam.sufficiency` Temperance of
  consumption; `steam.circularity` Coke & slack recovery (share ≤ 0.35); `steam.substitution` Water wheels & wind.
- Light: duty, sufficiency, greenSpending (Public libraries & parks), substitution (hydro).
- Motion: duty, cap, sufficiency (15-minute town), substitution (electrified rail & trams), greenSpending.
- Compute: cap (Grid allocation), sufficiency (Digital sobriety), circularity (chip recovery), substitution (solar),
  duty (carbon price).
- Code: deletion (Deletion sprints), reviewGate (Review gates), sharedLibs (Shared libraries), sufficiency (Don't build it).
Each with name, blurb, a `catch` line in the game's dry voice, and clear level labels ("Hold price at 60% of the fall",
"Cap at 80% of today").

## Know-how, Institutions, Achievements

- Know-how (6–8, repeatable, tempting; the first Reckoning yields ~30–60 Hindsight): "Apprenticeships" (etaMul 1.15 on
  steam per level), an engineering school per era, "Patent pool" (costMul 0.9), "Seed capital" (startCapitalMul 2).
  Blurbs quietly hint that these make runs shorter.
- Institutions (8–10, one-off, pricier): "Statistics Office" (reveal; first and cheapest, ≈ 25), "Standing fuel duty"
  (startLever steam.duty 1), "Clean Air Act" (absorptionAdd steam), "Royal Commission on Coal" (startLever
  steam.circularity 1), "Green belt" (startLever motion.sufficiency 1), a commons/broadcaster (mandateRateMul 1.25), one
  for Compute, "Engineering guild" (startLever code.reviewGate 1); `requires` chains where natural.
- Achievements: jevonsWasRight ("Jevons Was Right"), degrowthByAccident (hidden), steadyState, firstReckoning, backfire.

## Headlines

For every HeadlineKey, 3–6 variants under ~70 characters, in the voice of a dry broadsheet that ages from Victorian to
modern, using {era} {app} {resource} {service} where useful. Register: "Engines thriftier than ever; collieries report
record sales". No real living people, no real newspaper names. British English.

## Quality bar

This text is the game's personality: witty, specific, historically grounded, never preachy. Verify (with a throwaway
`bun -e` check, not left in the file): ids unique, every `requires`/`startLever` id exists, each lever/upgrade era
matches its id prefix, each era has exactly one free starting application; print the cumulative η per era.

## Final report (concise)

A small table of era parameters; anything missing or awkward in types.ts; the numbers you are least sure of.
