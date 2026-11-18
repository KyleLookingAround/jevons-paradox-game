# Brief: M1 UI lane

You bring the interface of "Rebound" up to the M1 contract. The v1 UI is finished (`briefs/ui.md` was its brief). Keep
its looks and structure, and change what the contract changed.

Three other lanes work at the same time and do not talk to you:

- core (`src/model.ts` …);
- content (`src/content.ts`);
- balance, afterwards.

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md` or `CLAUDE.md`.

## Read first, in full

1. `src/types.ts`, the binding contract. You read `Derived`, `SectorDerived`, the views, `GameState` and `Content`, and
   call ModelApi.
2. `design/m1-contract-notes.md`: the decisions and the old → new mapping.
3. `CLAUDE.md` and `briefs/ui.md` (its hosting and quality rules still apply, as amended in `CLAUDE.md`).
4. The first hour in `design/long-game.md`, and P1, P2, P4 and P7 in `design/proposals.md`.

## Your files (only these)

`src/ui/*`, `src/main.ts`, `src/styles.css`, `index.html`, `tools/shot.mjs`.

**Rename first.** Conforming to the contract starts with renaming inside your files, using the mapping table in
`design/m1-contract-notes.md`: `eras` → `sectors`, `EraId` → `SectorId` (a string now), `nextEra` → `nextSectors`, and
so on.

- Iterate `content.sectorOrder`; never assume five sectors.
- Update `src/ui/devmock.ts` to the new shapes, including ages, so `#mock` still works.

## The rule you were breaking, now fixed by the contract

The UI holds no game rules. Use these instead of recomputing anything:

| Use | Instead of |
|---|---|
| `knowhowViews` / `institutionViews` | cost, level, affordability, requirements, forks, seats |
| `Derived.clickValue` | the sell button amount |
| `SectorDerived.capCost`, `margin`, `resourcePriceBase`, `permitPrice`, `preLevyPrice`, `permitPart`, `dutyPart`, `substitutedShare` | the formula sheet's values |
| `nextCrisisFraction` | reading `crisisAt` / `crisesFired` |
| `LeverView.current` / `next` / `maxLevel` | lever levels and labels, including Tighten levels |
| `Derived.year` and `Derived.age` | the clock |

Reading content data (names, blurbs, units, theme keys) is fine. Deriving numbers from it is not.

## Words on screen

- A sector is an **Industry** (plural **Industries**); the period is an **Age**.
- No player-facing text says "sector" or "era": tab labels, the locked chip, sheets, aria-labels and the "How it works"
  card.
- Code identifiers use `sector`.

## Ages and themes

- The page theme comes from the **age** of the selected sector (`AgeDef.theme`). If the sector has `theme`, that
  transitional override wins: Light → `gaslight`, Code → `agentic`. All five v1 looks stay in use.
- A sector's `accent` key maps to a small token set layered over the theme: accent colour and pressure-weather tint.
  - Keep it cheap: three or four CSS custom properties per accent key, under `[data-accent="…"]`.
  - Keys from content: `iron`, `gas`, `chrome`, `phosphor`, `diff`. An unknown key means no accent.
- Unknown theme keys fall back to the default look.
- Show the current age's name quietly near the year (for example, "1842 · The Coal Age"). On `ageBegins`, give its
  headline the broadsheet's lead slot.

## Work (roadmap M1 UI)

1. **Third card line.** Efficiency and capital cards show:
   - the promise (large, efficiency only);
   - "This decade: +8%" (`projectedDecade`; red when positive, green when negative);
   - "Brings Railways within reach: +150% coal if founded" (`bringsWithinReach`; one line per app, application name from
     content).
   Excluded fork arms show "Ruled out by <name>".
2. **Fork pairs.** Upgrades that exclude each other are drawn side by side as one choice, with "or" between them.
3. **The rebound meter, honest.**
   - It reads `rebound` (direct) as before, with "Backfire" above 100%.
   - Add a quiet "Growth ×N since <first year>" readout from `frontierFold`.
   - Under a binding cap (R close to `budgetR`, cap lever active), add one line: "The cap sets the coal; savings became
     service."
   - The formula sheet shows shadowR, promisedR and the identity rFold = frontierFold × R / shadowR.
4. **Budget line and decades ledger.**
   - Draw the budget line on the sparkline from `history[i].budget`, in a distinct dashed style.
   - Under the gauges, show "Within budget · 7 of 10 years to the next decade" (from `steadyYears` and
     `global.steady.decadeYears ?? 10`), or "Over budget by 12%".
   - Add a "Draw the line" button (`drawBudget`) once revealed, with a confirm when redrawing ("resets the streak").
   - The ledger lists `decadesWithin` as years ("1840s ✓") and shows "Steady State: N of 50 years".
5. **Population gauge.** A small gauge for population and its growth (`populationGrowthPerSec`). Mark where growth
   stops, at `global.demography.transitionWellbeing` on the wellbeing scale, so the player sees growth slow as wellbeing
   rises.
6. **Levers.**
   - "Tighten" continues past the authored levels (`next`, `nextCost`, `maxLevel`).
   - A recycle toggle for duty and cap levers (`recycleOptions`, `setLeverRecycle`) with the content's wording.
   - Show levy revenue per second (`levyRevenue`).
7. **Loadout shop.**
   - The Hindsight shop has two panels:
     - Know-how as trees (rows by tier, branch forks side by side, excluded nodes struck through);
     - Institutions as a row of seats (`Derived.slots`).
   - Seat and unseat by building the new id list and calling `setLoadout`.
   - Buttons are enabled only from `canBuy` / `canSeat`.
   - Mid-run the shop is read-only, with a line saying it opens between runs (`Derived.freshRun`).
8. **Locked-industry checklist.** For each of `Derived.nextSectors`, a locked chip that opens a checklist (`label`, a
   tick or a progress bar) plus "Reckonings: 1 of 2".
9. **Reckoning card.**
   - Show `meta.lastRun.hindsightTerms` as a small ledger: wellbeing per ton, decades in budget, coal left unburnt,
     first backfire, industries reached, Steady State.
   - Show unburnt and decades per sector beside the efficiency-against-use bars.
   - The pre-Reckoning confirm shows `Derived.hindsightTerms`.
10. **Game loop.**
    - Do not tick while the Reckoning, summary or shop screens are open after a Reckoning (the run must stay fresh for
      purchases).
    - Resume on "Begin the next run".
    - `tick` now clamps to 60 s, so long gaps must go through `fastForward`, as they already do.
11. **Saves.** Keep the localStorage key; `deserialize` migrates v1 saves. If it returns null for an existing save,
    show the in-page "save could not be read" note with export of the raw text before starting fresh.

## Known rough edges to fix (from the v1 UI report)

- **Two-column clipping.** The desktop two-column layout clips at the right edge of the left column (seen in the
  terminal theme at 1280×800). Fix the grid (minmax(0, 1fr), and overflow on the sparkline/canvas).
- **Sell-button shrink.** The shrink rule can never fire while `clickSeconds` ≥ 1, because click value grows with income.
  The number belongs to the balance lane. Base your rule on `Derived.clickValue` against `incomePerSec`, and leave a
  comment saying which ratio you used.

## Checks

```
bunx tsc -p .     # your files clean (ignore model/content errors until they land)
bun run build.ts
node tools/shot.mjs
```

- Screenshots go to `shots/` at 390×844 and 1280×800 for all five looks (mock), plus one with a fork pair, the loadout
  shop, the checklist and the Reckoning ledger. Read the PNGs.
- Check the console for errors.
- Once model and content have landed, screenshot the real game too and fix what breaks on your side.

## Final report (concise)

- Files changed.
- Every Derived or view field you lacked and what you did instead (there should be none).
- How you mapped themes and accents.
- Known rough edges.
- Whether you tested against the real model and content.
