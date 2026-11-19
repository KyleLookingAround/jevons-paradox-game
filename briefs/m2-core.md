# Brief: M2 CORE lane

You bring the simulation core of "Rebound" up to the M2 contract ("Restraint has a game; run 2 is different"). Four
other lanes work from the same contract and do not talk to you:

- content (`src/content/**`);
- UI (`src/ui/*.ts` outside `scene/`, `src/main.ts`, `src/styles.css`, `index.html`, `tools/shot.mjs`, `tools/perf.mjs`);
- scene (`src/ui/scene/**`, `tools/scene-demo.ts`, `tools/scene-shot.mjs`);
- balance, afterwards (numbers in `src/content/**` and `src/balance.test.ts`).

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`. If the contract
is wrong or missing something, work around it locally and say so in your report.

## Read first, in full

1. `src/types.ts`, the binding contract. Its doc comments are the specification: every formula, default, ordering and
   edge case. Search for "M2" and "M2 CHANGE".
2. `design/m2-contract-notes.md`: the decisions and why, decisions (a)–(i) in particular.
3. `CLAUDE.md`; `src/core/README.md` (module map, layering, caches, where new things go).
4. The M2 section of `design/roadmap.md`; "The run, as it will be after M2" in `design/long-game.md`; shift 3's
   "What is measured" in `design/paradigm-shifts.md`; recs 10–12 in `design/genre-audit.md`.
5. Your own `src/core/*.ts`, the tests beside them, `src/core/fixture.ts` and `tools/balance.ts`.

## Your files (only these)

- `src/core/**`: every module, `README.md`, the tests (`*.test.ts`, `m1.testkit.ts`) and `fixture.ts`.
- `tools/balance.ts` (you may split strategies into `tools/strategies/<name>.ts`, which you then own).

`src/core/step.ts` and `src/core/index.ts` are integration points you alone own this milestone. Keep each new mechanic a
one-line call in `step.ts` and its logic in its own module:

| Module (new unless marked) | Owns |
|---|---|
| `steady.ts` (extend) | paces (resolution, default pace), `decadeWellbeing`, `clearP`, `clear`, `sinkR`, decade-choice resolution |
| `dividends.ts` | pending offers (append, overflow), `chooseDecadeDividend`, the pace multiplier on one-offs |
| `settlement.ts` | the frozen flow of a settled sector, excess and defence, `settle`, `unsettle`, forced unsettle in the lapse rule |
| `commons.ts` | Commons availability, costs, wellbeing, intensity, the fund, `buyCommons`, `commonsViews` |
| `orders.ts` | order ticks, availability, the Market, the Civil Service, Treasury rules, `setOrders`, `OrdersView` |
| `charters.ts` | `mix32`, the offer draw, `chooseCharter` |
| `offline.ts` | `fastForward` with holds and the `OfflineReport` (step.ts keeps `step` and `tick`) |
| `events.ts` | `emit()`: seq from `meta.eventSeq`, the `EVENTS_MAX` trim; the headline-to-event mapping |
| `record.ts` | decisions and automated counts per model decade, `run.opening`, `firstBudgetAt`, the action wrapper |
| `prestige.ts` (extend) | `respecKnowhow`, `knowhowPeak`, the RunSummary's M2 fields, `meta.runs`, openings, the offer at reckon |
| `serialise.ts` (extend) | the v2 → v3 migration exactly as `SAVE_VERSION` says |
| `effects.ts` (extend) | the new effect types in `Mods`; Charter, loan, dividend, Commons and settle-dividend sources |

Keep the README's layering (no cycles) and update its module table.

## Work

### 1. Decades, the sink line, paces (steady.ts, step.ts)

- `BudgetState` gains `w0`, `p0`, `pace`, `clearAt`. Every draw (drawBudget, a lever raise, a standing cap) records
  them. A redraw also resets `clearYears` and `windowLean`.
- The decade streak's condition is `SectorDerived.decoupling` with `decadeWellbeing`; lean bookkeeping exactly as in
  the `tick` doc (windowLean is updated before the crossing test).
- The Steady streak is `clearYears` on `sinkHeld`; Steady State moves to it. `clearSkies` fires once per line.
- `clear` and `sinkR` use the same `pressureIn`, `deletionOut` and absorption the step uses (export one helper from
  `steady.ts` or `flows.ts` and use it in both `derive` and `step`).
- `decadeEffects` one-offs are multiplied by the line's pace `dividendMul`; standing decade effects are not.
- `steadyYearsAll` (the win) changes to "every open sector settled or within budget and clear, W ≥ target".
- `HistorySample.sink` from `sinkR`.

### 2. Dividends (dividends.ts)

- Resolution of pairs and the (n − 1) mod length rule; skip pairs with unknown ids.
- Append at the decade, overflow beyond `PENDING_DIVIDENDS_MAX` resolves the oldest as option 0 by `'default'`.
- `chooseDecadeDividend`: oldest offer of that sector; one-offs × `mul`; standing effects from
  `SectorState.dividends` (each entry once). Include the dividends in the `Mods` cache key.

### 3. Settlement (settlement.ts, flows.ts)

- In `computeFlows`, a settled sector yields a `SectorFlow` built from `SettledState` (no solve), but its inputs
  (`spillMul`, `extraD`) are still computed in solve order so excess can be measured, and it still spills and draws
  from its frozen values. Wellbeing share uses today's N (formula in `SettledState`).
- Defence goes into `Flows.upkeep`; the lapse loop in `step.ts` drops levers first, then unsettles the largest defence.
- `settle`: preconditions and effects exactly as typed; the snapshot comes from the current flows. Levers of the sector
  to 0. One-offs of `settle.dividend` only when `settledBefore` was false.
- `unsettle`: η recomputed, streaks reset, `heldAt` kept, `settle.dividend` stops.
- Everything that iterates sectors must treat settled ones as typed: the step's per-sector block (only openFor,
  resourceUsed, serviceDelivered), upgrades and levers not visible, foundings refused, orders skip them, `derive` reports
  the frozen values and `clear: true`, `sinkHeld: false`, `sinkR: null`.

### 4. The Commons (commons.ts, flows.ts, solver.ts)

- Wellbeing term, intensity as extra price-proof demand (exactly like `drawsOn`; add it to the same `extraD`), standing
  effects × level, one-offs on purchase, `commonsYieldMul`.
- `'commons'` recycle: the solver already splits levy revenue by recycle; add a `commonsLevy` output; the step adds
  `fundShare × commonsLevy × dt` to the fund. `setLeverRecycle('commons')` refused until the Commons are open.
- `buyCommons` pays from the fund first. `commonsViews` per the type.

### 5. Standing orders (orders.ts)

- The order tick test and the three orders exactly as `OrdersState` specifies. One line at the very end of `step`:
  `next = runOrders(state, next, content, lite)`. It must return `next` after a single comparison when the step is not
  an order tick, when `lite` is true (projections), or when no order is active. Measure µs per tick before and after
  with orders off; the target is no measurable change (≤ 3%).
- Market payback: income after an action comes from `computeFlows` of a draft state with that one action applied
  (upgrades map changed and η recomputed, or the app founded; no one-offs, no headlines). Only affordable, eligible
  candidates are evaluated. The real purchase then goes through the same code as `buyUpgrade` / `foundApp`, with the
  actor recorded as `'market'` and no decision counted. Budget: an 8-hour `fastForward` with the Market on in five
  Industries must take under 3 s in Bun.
- Civil Service and Treasury rules exactly as typed; their actions go through the same code as `setLever` /
  `buyCommons`.
- `setOrders`: validation and merge as typed. Orders live in `meta.orders` and survive Reckonings and rebuilds.

### 6. Charters (charters.ts, prestige.ts, effects.ts)

- `mix32` and the draw exactly as `GameState.charterOffer` says (write a test pinning the offer for three seeds on the
  fixture so a refactor cannot change it). The offer is drawn by `reckon` on the new run and kept by every between-runs
  rebuild (`withMeta` must carry `events`, `charterOffer`, `lastOffline`).
- `meta.charter` effects in `Mods`: standing once; start-of-run effects at `createState`; one-offs ignored.
- New effects: `startFounded` (at `createState`, and in the step when its sector opens), `institutionLoan` (the higher
  of loaned and seated level; counts as seated for `LeverDef.requires`), `offlineCapAdd`, `orderUnlock`,
  `commonsYieldMul`.

### 7. Offline (offline.ts)

- `fastForward`: effective cap, the hold check on each 5 s step (discard the step that would fire a crisis or make a
  Reckoning pending, per `holdBefore`), `heldBy`/`heldSector`, `'pending'`, and the full `OfflineReport` including
  `lines` (track per sector whether the decade streak reset between consecutive steps) and `fromSeq`/`toSeq`.
- `GlobalParams.offlineCapSeconds` is deprecated: read it only when `offline` is absent.

### 8. Respec (prestige.ts)

- `respecKnowhow(state, content, tree?)` per the type; `knowhowPeak` raised in `buyKnowhow`; one-offs only above it.
- `Derived.respec` with `refundByTree`.

### 9. Recording and events (record.ts, events.ts)

- Wrap every in-run player action in `index.ts` so that a changed result counts one decision in the right model decade
  (`setOrders` only when not fresh). Standing orders count `automated` instead. Both series capped at
  `DECISION_DECADES_MAX`.
- `run.opening` (upgrades and foundings, any actor, first `OPENING_MAX`), `run.firstBudgetAt` (player draws only).
- `reckon`: `RunSummary` M2 fields, `meta.runs` (trim to `RUN_HISTORY_MAX`, `lastRun` = last), `meta.opening`,
  `meta.firstOpening` (once), `meta.charter = null`, the offer, the `'reckoning'` event as the new run's first event.
- `emit()` everywhere a headline with an event counterpart is pushed (see `EventKind` for the fields), plus the
  events with no headline (`upgradeBought`, `stageReached`, `dividendChosen`, `charterChosen`). Events emitted in
  projections are harmless (clones are discarded) but must not cost a measurable amount.
- `peakAdoption`, `peakPressure`, `meta.peakPopulationEver` in the step.

### 10. Views and derive

- Every new `Derived`, `SectorDerived`, `LeverView` (`recycleChoices`) and `AppDerived` field; `commonsViews`;
  `yearAt`; `stage` (null when no upgrade of the sector has a `stage`); `standingDrawIn`; `populationRef`;
  `offlineCapSeconds`; `orders` (with `nextTickIn`).
- New `StatKey`s and `owns` kinds in `conditions.ts`; fallback labels for them.
- New headline keys and the `{name}` placeholder in `headlines.ts`.

### 11. Persistence (serialise.ts)

- `SAVE_VERSION` 3; the v2 → v3 steps 1–7 in order; v1 chains through v2. Validate the new map- and array-valued
  fields element by element (events, pendingDividends, runs, opening, settled, commons levels, orders); drop unknown
  ids. A v4 save → null.

## Fixture (`src/core/fixture.ts`)

Extend it so every M2 rule is testable without real content: `steady.paces` (three), `decadeChoices` (two pairs, one
global, one per-sector override), `clearBelow`/`clearCeiling` on one sector, a sector with `absorption: 0` (Code-like)
and one with `settle`, four `dividends`, three Commons projects (one with intensity, one with a `satMul` time rebound,
one repeatable), three Charters (one with `requires`, one with `startFounded`, one with `institutionLoan`), an
institution with `orderUnlock: 'civilService'` and one with `orderUnlock: 'treasury'` and `offlineCapAdd`, an upgrade
with `stage`, `offline: { capSeconds: 28800, holdBefore: 'crisis' }`, `recycle` including `'commons'`, and headlines for
the new keys. Steam stays exactly the `DESIGN.md` reference economy.

## Required tests (`bun test`)

Keep every M1 test that still applies (update the ones whose meaning M2 changed, and say which in your report). Add,
in new files such as `m2.steady.test.ts`, `m2.orders.test.ts`, `m2.settle.test.ts`, `m2.prestige.test.ts`,
`m2.offline.test.ts`, `m2.save.test.ts`:

1. **Decades against the drawn day.** A line drawn at W = 20 (target 34) earns a decade while W ≥ 19 holds; with
   `decadeWellbeing: 'target'` it does not. The decade is lean; it is recorded in `decadesLean`, `run.leanDecades`;
   Hindsight's budget term gives it `perLeanDecade` (0 by default) and a full decade `perBudgetDecade`. A decade whose
   window dipped below target once is lean even if it ends at target.
2. **Clear skies.** `clearP` = clamp rule (floor and ceiling each bite in a constructed case); `clear` false while
   pressure is rising even below `clearP`; `sinkR` is the R whose equilibrium pressure is `clearP` (step the sector at
   R = sinkR, constant, and pressure converges to `clearP` within 1%); `sinkR` null for absorption 0; the Code-like sector
   becomes clear through deletion. Steady State needs 50 years of `sinkHeld`; a held line without clear skies never
   reaches it; `clearSkies` fires once per line; a redraw resets `clearYears`.
3. **Paces.** Severe declines at its rate; `dividendMul` scales `mandateAdd` and `capitalAdd` of decade effects and of
   the chosen dividend, not standing effects; an unknown pace id is refused; lever-raise and standing-cap lines take the
   first pace.
4. **Dividends.** Pair order (n − 1) mod length, per-sector override; choose resolves the oldest of that sector; overflow
   at `PENDING_DIVIDENDS_MAX + 1` resolves the oldest with option 0 and emits `by: 'default'`; standing effects count
   once per choice; a Reckoning discards pending offers.
5. **Settlement.** Refused before Steady State, without `settle`, when not clear; levers go to 0 and their upkeep
   stops; the frozen flows hold across 1 h of steps (R, D, pressure, reserve unchanged); population growth and spill
   from a later sector raise `settleExcess` and the defence; Mandate exhaustion drops levers first, then unsettles;
   `unsettle` resets streaks and keeps `heldAt`; settle one-offs fire once per run across settle–unsettle–settle;
   a settled sector never crisis or collapses; `perSettledSector`.
6. **Commons.** Wellbeing formula (first level ≈ perLevel, never above max); intensity adds price-proof demand and R in
   its sector; the `satMul` time rebound raises that application's demand; the fund pays first; `'commons'` recycle
   refused before `fromReckoning`, then fills the fund at `fundShare`; levels wiped by a Reckoning.
7. **The Market.** Inert in run 1 (reckonings 0); in run 2 it buys at order ticks only, at most one action per sector
   per tick, shortest payback first, never a fork arm, research or prospect card, never in a settled sector or a sector
   switched off; purchases appear in `run.opening` with `by: 'market'`, in `run.automated`, never in `run.decisions`;
   `tick` (dt 1) and `fastForward` (5 s steps) over the same 10 minutes buy the same set of ids (order may differ by at
   most one tick's worth); projections are unchanged by the Market being on (identical `projectedDecade`).
8. **Civil Service and Treasury rules.** Unavailable without `orderUnlock`; Civil Service raises the cheapest listed
   lever when over budget and lowers per the rule; Treasury keeps `keepSeconds` of income and buys in priority order.
9. **Charters.** The pinned offers for three seeds; the previous Charter is excluded when that leaves two; `requires`
   respected; `chooseCharter` only while fresh, rebuilds, keeps the offer; `startFounded` founds at run start and when a
   later sector opens; `institutionLoan` applies the higher level and satisfies `LeverDef.requires`; one-offs ignored.
10. **Offline.** With `holdBefore: 'crisis'` an 8-hour `fastForward` from an efficiency state stops one step before the
    first crisis (no crisis fired, `heldBy: 'crisis'`, `heldSector` set) and a second call simulates 0; with
    `'collapse'` it passes crises but never returns a pending Reckoning; `null` reproduces M1. `offlineCapAdd` raises
    the cap. `lines` reports held, broken, drawn and settled correctly in constructed cases.
11. **Respec.** Only while fresh; refund = price list × `respecRefund`; branch exclusions lift; per-tree respec; a
    one-off `slotAdd` node bought, respecced and re-bought adds one slot in all.
12. **Recording.** Each listed action counts one decision; refused actions and clicks count none; decisions land in the
    right model-decade index; `setOrders` while fresh counts none; `run.opening` caps at `OPENING_MAX`;
    `firstBudgetAt` ignores standing caps; `reckon` writes `meta.opening`, `meta.firstOpening` once, `meta.runs` (trim
    at 21 runs), and the summary's peak adoption, peak pressure and stage.
13. **Events.** Seq strictly increasing across a Reckoning and every rebuild; `EVENTS_MAX` trim; each required kind fires
    in a constructed case (appFounded, crisis, stageReached, leverEnacted, decade, steadyState, sectorOpened,
    ageBegins, settled, clearSkies, upgradeBought by market); serialize → deserialize keeps `eventSeq` and the list, so a
    consumer that sets lastSeen = eventSeq on load sees nothing replayed.
14. **Views.** `yearAt(state.time)` = `Derived.year`; `yearAt` of a time before a sector opened ignores it;
    `standingDrawIn` counts down to 0 then null once drawn; `stage` null without authored stages; `recycleChoices`
    wording falls back per the type; `populationRef` ≥ population.
15. **Migration.** A hand-written v2 save (with a budget, a lastRun, institutions and a mid-run state) loads with every
    rule of steps 1–7, including w0 = loaded wellbeing and p0 = loaded pressure, `decadesLean` all false and
    `charterOffer` drawn for a fresh run; a v1 save chains to v3; a v4 save → null; a v3 round trip is lossless.
16. **Purity, determinism, no NaN, speed.** No NaN or Infinity after 3 h of `budget`, `market` and `efficiency` play at
    dt = 1; two identical action sequences give identical states (deep-equal), events included; µs per tick with
    orders off within 3% of M1 (report both numbers).

## Balancer (`tools/balance.ts`)

Bring every strategy to M2 and add what the balance lane needs. Give each new behaviour a flag so balance can vary it:

- **All restraint strategies** (`budget`, `mixed`, `levers`): `--pace=gentle|firm|severe` (pace id for lines they draw);
  `--dividend=0|1|best` (best: the option whose one-offs are larger, else 0); `--settle` (settle each sector as soon as
  `canSettle`); `--commons` (buy the visible Commons project with the best wellbeing per £ when affordable after keeping
  60 s of income); `--market=on|off` (the default for runs ≥ 2 is `on`, as for a player who does not touch it;
  `budget` switches it off in sectors with a line unless `--market=on`).
- **`market`** (new): from run 2, the Market on everywhere; the player only founds applications (when the Market has
  not), draws a line at the reveal, chooses dividends, and Reckons as `budget` does. Run 1 plays as `efficiency`.
- **`charter`** (new): for each Charter C, from a fresh meta, plays `mixed` for [runs] runs choosing C whenever it is
  offered and otherwise the first Charter offered. To get C offered in run 2, it tries seeds 1, 2, 3, … for the first
  run (`createState(content, undefined, seed)`) until reckon's offer contains C (at most 200 tries; else report "never
  offered"). Prints Hindsight per minute over the runs C was in force, per Charter, and each one's deviation from the
  mean (target ±15%). Never builds an offer itself: only `chooseCharter` on what the core offers.
- **`peakdraw`**: keep it (a line redrawn at every new peak of R), now also with `--pace`.
- **Offline check** (`--offline-check`): at every 10 minutes of a strategy's play, clone the state, `fastForward` 8 h,
  and print `heldBy`, `heldSector`, `simulated`, and whether a Reckoning is pending (must never be).
- **Decision log** (`--decisions`): per run and cumulatively, the longest stretch of active play without a player
  decision or purchase (from `run.decisions` and the player's own buys), in hour 1 and in hours 1–10, plus decisions
  and automated actions per model decade (mean). In `--json` add `decisionsByDecade`, `automatedByDecade` and the gaps.
- **`--total-hours=N`**: run consecutive runs until N hours cumulative (for the 10-hour game).
- New summary columns: first decade (and whether lean), first `clearSkies`, Steady State, settlements, Commons levels,
  Market buys, Charter, lean and full decades, Hindsight terms including `settled`.

## Checks

```
bunx tsc -p .     # src/core clean; ignore content and UI errors until they land
bun test src/core
bun run tools/balance.ts efficiency 3 --fixture --summary
bun run tools/balance.ts budget 4 --fixture --summary --decisions
bun run tools/balance.ts market 3 --fixture --summary
bun run tools/balance.ts charter 2 --fixture --summary
bun run tools/balance.ts budget 2 --fixture --offline-check --summary
bun run tools/balance.ts efficiency 2 --summary       # real content, once the content lane has landed
```

## Exit criteria (yours)

- Every ModelApi method implemented exactly as typed; every test above passing; `src/core` typechecks.
- On the fixture: `budget` earns a decade in run 1, `efficiency` none; the Market buys in run 2 only; an 8-hour
  offline check never returns a pending Reckoning; every Charter is offered at least once across 10 seeds.
- The balancer runs every strategy and flag above on the fixture without errors.
- µs per tick with orders off within 3% of the M1 baseline.

The game-level M2 exit criteria are the balance lane's to prove (`briefs/m2-balance.md`). Make sure the tools let them.

## Final report (concise)

- What you implemented, module by module; the README's new module table.
- Every gap in or deviation from `types.ts`, with your workaround.
- Constants you chose, with values.
- Test count; M1 tests you changed and why.
- Fixture balancer headlines: first decade (minute, lean?), Steady State, Market buys per run, Charter spread.
- µs per tick before and after; 8-hour `fastForward` time with the Market on.
- What the balance lane must know (knobs that matter most, traps).
