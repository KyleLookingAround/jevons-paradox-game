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
| `prestige.ts` | Know-how trees (and their display names, `knowhowTrees`) and Institutions. |
| `charters.ts` | M2: the Charters, in content order (the order the deterministic draw indexes: append, never reorder). |
| `commons.ts` | M2: the Commons projects, in display order. |
| `dividends.ts` | M2: every decade dividend, flat. The global pair sequence is `DECADE_PAIRS` in `helpers.ts`; each Industry's own sequence is its `steady.decadeChoices`, built with `decadeSequence`. |
| `features.ts` | The unfolding: when each system arrives (a `Cond` per feature) and the headline that introduces it (`design/unlock-schedule.md`). |
| `words.ts` | M2: words that belong to no other module (the recycle options' wording, `recycleText`). |
| `achievements.ts` | Achievements, in display order (the five built in first). |
| `news/fallback.ts` | The fallback headlines (`Content.headlines`), fit for any Industry. |
| `global.ts` | `GlobalParams`: start, click, population, Mandate, crises, Hindsight weights, offline, Steady State (paces, clear skies, decade choices), levy, seats, orders, Commons, respec. |

Dependencies point one way: `index.ts` → every other module → `helpers.ts` → `src/types.ts`. (Ids crossing modules,
such as dividend ids in an Industry's decade pairs, are plain strings; the lint resolves them.) Modules never import
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
- **Know-how, Institutions, Articles, Measures**: `prestige.ts`; **Charters**: `charters.ts`.
- **Text**: fallback headlines in `news/`; M3's dispatches in `dispatches/` and Archive notes in `archive/`, each
  imported by `index.ts`.
- **M2's Commons projects**: `commons.ts`; **decade dividends**: `dividends.ts` (a dividend that names a sector goes in that
  Industry's own `steady.decadeChoices`, never the global sequence; the lint checks).
- **An Industry's M2 data** (unit singulars, `steady` overrides and decade pairs, `settle`, card `stage`s, recycle
  wording per lever): that Industry's file.
- **A global knob**: `global.ts`.

Keep every comment that explains a number next to the number. The lint (`content.test.ts`) checks ids, references,
conditions, lever tables, words and headline lengths; it runs over the assembled `content`, so it covers new modules
without changes.
