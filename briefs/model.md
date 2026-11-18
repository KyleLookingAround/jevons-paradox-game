# Brief: MODEL workstream

You build the simulation core of "Rebound". Two other agents work in parallel on content (src/content.ts) and UI
(src/ui/*, src/main.ts, src/styles.css, index.html, tools/shot.mjs). Do NOT edit their files, src/types.ts or build.ts.

Read first, in full: DESIGN.md and src/types.ts (the binding contract; its doc comments define formulas and semantics).

## Your files (only these)

1. `src/model.ts` — replace the stub. `export const model: ModelApi`, every method implemented exactly as typed. Pure
   TypeScript: no DOM, no Date.now(), no Math.random(). Never mutate the input state. tick runs ~10×/s in the browser and
   thousands of times/s in the balancer: keep it cheap (copy history/news arrays only when you change them).
2. `src/fixture.ts` — a self-contained `Content` fixture used ONLY by tests: Era 1 exactly per DESIGN.md reference numbers,
   a minimal 'light' era (with spill), a minimal 'code' era (resourceKind 'flow', pressureSource 'service',
   pressureUpkeep > 0, drawsOn compute), minimal others, and at least one lever of every LeverKind.
3. `src/model.test.ts` — `bun test`.
4. `tools/balance.ts` — headless balancer, `bun run tools/balance.ts [strategy] [runs]`. Imports `content` from
   ../src/content (falls back to the fixture while that file is still a stub `{}`). Strategies played at dt=1 for up to
   3 game-hours per run, over several consecutive runs (prestige loop):
   (a) `efficiency`: buy the cheapest affordable upgrade, found every app when affordable, never touch levers, spend Hindsight on Know-how;
   (b) `levers`: same, plus spends Mandate on levers once revealed, spends Hindsight on Institutions first;
   (c) `idle`: buys nothing.
   Output, dense and readable: per run — minute of each upgrade / app founding / era opening / crisis, time and cause of
   Reckoning, per era peak R fold and rebound, peak wellbeing, Hindsight gained; plus a time series every 2 minutes
   (capital, income/s, wellbeing, mandate, population, and per open era: eta fold, R fold, reserve fraction, pressure fraction).
   The coordinator tunes the game with this tool.

## Semantics beyond types.ts (use judgement where neither says)

- Year = START_YEAR + time × YEARS_PER_SECOND.
- Effects come from this run's upgrades (× level for repeatables), meta.knowhow (× level) and owned institutions.
  eta = baseEta × Π etaMul × accumulated autoEta growth. Prefer recomputing over new state fields; if you truly need a
  field the types lack, say so in your report (do not edit types.ts).
- Applications: `available` flips true the first time p_s ≤ visibleBelow ('appAvailable' headline); foundCost 0 →
  founded automatically. Demand is 0 until founded. Lock-in: D_i = max(D_i, lockIn × peakD). Pumping: reserve and
  reserveMax both grow by reserveGainPerService × D_i × dt.
- Stock: reserve −= R × dt (+ circularity return). Pending Reckoning is derived purely from state: any open stock era
  with reserve ≤ 0 → 'exhausted'; any open era with pressure ≥ collapseAt → 'collapse'. While pending, tick returns
  the state unchanged; the UI calls reckon().
- Price/demand is a fixed point when caps or flow-capacity pricing apply. Solve robustly (bisection or damped
  iteration), stable at dt=1, never NaN/Infinity/negative. Flow eras must self-limit as utilisation → capacity.
- `drawsOn`: adds perService × D_this as extra service demand in the target era.
- Spill per EraDef.spill, reduced by greenSpending share on the spilling era.
- Wellbeing: Σ open eras wellbeingWeight × ln(1 + D_e / (N × wellbeingScale)) − Σ pressureWellbeingCost × pressureFraction,
  clamped ≥ 0. Era 5 defect penalty: unreviewedShare = utilisation above 0.8 mapped to 0..1; that era's wellbeing share
  × (1 − 0.5 × unreviewedShare). reviewGate value v removes v of the penalty and cuts D by v × unreviewedShare.
- Population: dN/dt = popGrowth × (W − subsistence) × N (at ¼ strength when negative); each crisis × (1 − crisisPopLoss).
- Mandate: += mandateRate × max(0, W − mandateFloor) × Π mandateRateMul − lever upkeep; floor 0. At 0 with upkeep due,
  drop the costliest-upkeep lever one level ('leverLapsed'). Crisis: += crisisMandate. Levers are visible/usable only
  once flags.revealed, except those started by an institution's 'startLever' effect (level set at run start, `ref`
  snapshotted on the first tick the era has demand).
- Implement all nine LeverKinds as documented. Duty: tax revenue is not income; 10% of it trickles to Mandate (name the
  constant). Cap leak: when permit price > value2 × p_r the effective cap rises by up to 25%. Substitution: share of
  service ≤ value and ≤ value2 units/s uses no resource and makes no pressure, at 1.5× capCost (blended into p_s).
- Trend: smoothR = EMA of R, time constant 60 s; trendR = fractional change of smoothR per in-game year. Decoupling =
  trendR < −0.001 AND wellbeing ≥ wellbeingTarget AND era open ≥ 120 s. steadyYears accumulates while decoupling,
  else resets. At STEADY_STATE_YEARS: meta.steadyEras[era], achievement 'steadyState', headline 'steadyEra'.
  steadyYearsAll accumulates while all five eras are open and decoupling; at STEADY_STATE_YEARS set flags.won ('steadyAll').
- Backfire: first time rebound > 1 in an era → backfired, headline, achievement 'backfire'.
- Achievements: 'firstReckoning'; 'jevonsWasRight' = every efficiency upgrade of an era owned and peakR / baseR ≥ 10
  (report what fold is realistically reachable); 'degrowthByAccident' = population < 0.6 × peak and an open era has
  trendR < 0 while wellbeing < target.
- Era opening: previous era open, its servicePrice < unlock.prevServicePriceBelow, meta.reckonings ≥ minReckonings.
  On open: reserve = reserveMax = def.reserve, record basePs/baseR/baseD on the first tick with demand (rebound is
  null until baseR > 0 and etaFold > 1.001). Update meta.furthestEra. Headline 'eraOpened'.
- Rebound: promisedR = baseR / etaFold; rebound = (R − promisedR) / (baseR − promisedR).
- upgradeViews: promisedChange = 1/Π etaMul − 1 for efficiency cards. projectedChange (only if flags.revealed):
  simulate two clones 120 s ahead at dt=2, one with the upgrade applied free, neither buying anything else; return
  R_with / R_without − 1 for the upgrade's era. Only for visible, non-maxed efficiency cards. Called ~1×/s by the UI.
- Costs: × Π costMul; repeatables × costGrowth^level.
- click: capital += clickFlat + clickSeconds × incomePerSec; run.clicks++.
- reckon: hindsight = max(1, round(perPeakWellbeing × peakWellbeing + perDecoupledYear × decoupledYears +
  perEraReached × (open eras − 1) + perSteadyEra × eras that reached Steady State this run)). Fill meta.lastRun,
  reckonings++, then return createState(content, newMeta, nextSeed) with a 'reckoning' headline.
- createState: Era 1 open at t=0 with its free starting application founded; apply knowhow/institution effects.
- History: sample every 5 s; above 240 samples drop every other one from the older half. News newest first, cap 40.
  Headline text = content.headlines[key][n % length] with {era} {app} {resource} {service} substituted; plain fallback
  string if the key has no variants.
- fastForward: steps ≤ 5 s, capped by offlineCapSeconds, stops at a pending Reckoning.
- deserialize: deep-merge the save over a fresh state so missing eras/apps/levers/fields are rebuilt; null on garbage.
- Robustness: tolerate content with no levers/knowhow/institutions, apps missing from a save, unknown ids (return the
  same state reference).

## Tests (minimum)

1. Fixture Era 1, all four apps founded, N = 1, reserve full: R at η = 1, 1.5, 2.5, 3.5, 5, 8, 12, 18 ≈ 202, 257, 321,
   348, 355, 324, 269, 205 (±2%).
2. Purity (deep-freeze the input). 3. Determinism.
4. Buying an efficiency upgrade while demand is elastic raises R; projectedChange positive after reveal, null before.
5. Exhaustion → pendingReckoning, tick is a no-op, reckon() gives a fresh run with reckonings 1 and hindsight > 0.
6. Each lever kind moves things the right way. 7. Mandate at zero lapses a lever.
8. serialize/deserialize round-trip; tolerates a save missing an era/app.
9. No NaN/Infinity anywhere after 3 simulated hours of greedy play at dt=1, and 5 minutes at dt=0.1.
10. Flow era: demand self-limits, utilisation < 1, pressure upkeep shrinks capacity.

Check: `cd /home/claude/rebound && tsc -p . && bun test && bun run tools/balance.ts` (ignore tsc errors in files you do not own).

## Final report (concise)

What you implemented; any deviation from or gap in types.ts; constants you chose; fixture balancer headline numbers for
Era 1; what the content author must know to make numbers work (sensible ranges for pressureIntensity, collapseAt, reserve…).
