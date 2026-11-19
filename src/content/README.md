# src/content — the data

Every number and every word the core and the UI read, as `content: Content` (see `src/types.ts`). No game rules: a
balancing change edits numbers here, never logic in `src/core/`. Split from the old `src/content.ts` without changing
a value or an order (M2).

## Modules

| Module | Owns |
|---|---|
| `index.ts` | The registry: imports every module and assembles `content` (and re-exports `sig2`, `ladder`). |
| `helpers.ts` | `SectorContent` (one Industry's bundle); number series (`ladder`, `sig2`, `chain`), effect builders (`eta`, `sat`, …), `fork`, `lever`, and the shared lever tables (values, labels, the dividend catch). |
| `sectors/<id>.ts` | One Industry: its `SectorDef` with applications and unlock, its upgrades, its levers and its own headlines (`Content.sectorHeadlines[id]`). Exports `<id>: SectorContent`. |
| `ages.ts` | The Ages: calendar spans, themes, which Industries belong to each. |
| `prestige.ts` | Know-how trees and Institutions. M2 adds Charters here. |
| `achievements.ts` | Achievements, in display order (the five built in first). |
| `news/fallback.ts` | The fallback headlines (`Content.headlines`), fit for any Industry. |
| `global.ts` | `GlobalParams`: start, click, population, Mandate, crises, Hindsight weights, offline cap, Steady State, levy, seats. |

Dependencies point one way: `index.ts` → every other module → `helpers.ts` → `src/types.ts`. Modules never import
each other otherwise, and nothing here imports `src/core/`.

## Order matters

`index.ts`'s `SECTORS` list **is** `sectorOrder` (the first Industry is open at the start of every run; the others
unlock in this order by default), and upgrades and levers are concatenated in that order, which is the order of the
cards and levers on screen. Inside a module, keep array order unless a change to the display order is intended:
achievements and Know-how are shown in content order, and headline variants are picked by index.

## Where new things go

- **A new Industry**: `sectors/<id>.ts` modelled on an existing one (export `<id>: SectorContent`), add it to `SECTORS`
  in `index.ts` at its place in the order, and to its Age in `ages.ts`. Ids are unique across the whole game.
- **Industry numbers, cards, levers, Industry-specific headlines**: that Industry's file only (one agent per Industry
  is safe).
- **Know-how, Institutions, Charters, Articles, Measures**: `prestige.ts`.
- **Text**: fallback headlines in `news/`; M3's dispatches in `dispatches/` and Archive notes in `archive/`, each
  imported by `index.ts`.
- **M2's Commons projects**: a new `commons.ts`, imported by `index.ts`.
- **A global knob**: `global.ts`.

Keep every comment that explains a number next to the number. The lint (`content.test.ts`) checks ids, references,
conditions, lever tables, words and headline lengths; it runs over the assembled `content`, so it covers new modules
without changes.
