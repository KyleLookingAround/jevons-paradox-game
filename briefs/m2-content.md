# Brief: M2 CONTENT lane

You write the data and words of "Rebound" for milestone M2 ("Restraint has a game; run 2 is different"). Four other
lanes work from the same contract at the same time and do not talk to you:

- core (`src/core/**`, `tools/balance.ts`);
- UI (`src/ui/*.ts` outside `scene/`, `src/main.ts`, `src/styles.css`, `index.html`, `tools/shot.mjs`, `tools/perf.mjs`);
- scene (`src/ui/scene/**`);
- balance, after you (it retunes numbers in `src/content/**` and writes `src/balance.test.ts`).

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`. If the contract
is missing something, work around it and report it.

## Read first, in full

1. `src/types.ts`, the binding contract: every field's doc comment says what the number or word does. Search "M2".
2. `design/m2-contract-notes.md`: the decisions and why.
3. `CLAUDE.md`; `src/content/README.md` (modules, order, where new things go).
4. The M2 section of `design/roadmap.md`; "The run, as it will be after M2", "Idle, automation and the phone" and the
   Coal Age entries of `design/long-game.md`; P5, P6 and P11 in `design/proposals.md`.
5. Your current `src/content/**`.

The design documents may say "era". In code the unit is a **sector**; on screen it is an **Industry**, and the period an
**Age**. No player-facing string says "sector" or "era" for the unit.

## Your files (only these)

- `src/content/**`: `index.ts`, `global.ts`, `helpers.ts`, `ages.ts`, `prestige.ts`, `achievements.ts`,
  `sectors/*.ts`, `news/*`, `content.test.ts`, and new modules `commons.ts` and `dividends.ts` (import them in
  `index.ts`). Charters go in `prestige.ts` (as the README says) or a new `charters.ts` if `prestige.ts` grows past
  about 450 lines.

## Sources and tone

- **Facts.** Use `design/research/*.md` (`energy.md`, `sectors.md`, `restraint.md`, `digital.md`). Use a fact only if
  the dossier states it **without** an **[unverified]** or **[disputed]** mark; round **[approx.]** figures and never
  sharpen them. Starred (*) items in `long-game.md` are unchecked. If a fact you want is not in a dossier (the Baths and
  Washhouses Act of 1846 and the Public Libraries Act of 1850 are not, at the time of writing), write the blurb without
  the date or the claim, and list it in your report for checking. Never invent a citation, a quotation or a figure.
- **Tone.** British English; dry broadsheet and ledger wit that ages with the Industry; the game never lectures, the
  gauges do. Every new system names its rebound in its blurb or catch, dryly: a Commons project says what it will be
  lit by or what the leisure is spent on; a Charter says which rebound it tilts; a dividend says what the money does.
- **People.** Dead historical figures only, in blurbs only, with a date only where the dossier is sure. No living people,
  no real newspapers, no real political parties. Dark history is never a resource, an application or a joke (D4).
- **Headlines** ≤ 70 characters. The lint bans the Americanisms it already bans.

## Work

### 1. Global (`global.ts`)

- `offline: { capSeconds: 8 * 3600, holdBefore: 'crisis' }` (a night from the start). Remove `offlineCapSeconds`.
- `steady`:
  - `decadeWellbeing: 'drawn'`, `drawnSlack: 0.05`;
  - `clearBelow: 0.5`, `clearFloor: 0.03`, `clearCeiling: 0.25` (balance tunes; per-Industry overrides below);
  - `paces`: Gentle (`declinePerDecade` 0.05, `dividendMul` 1), Firm (0.10, 1.6), Severe (0.20, 2.5), with names and
    one-line blurbs ("Five per cent a decade. The dividend as it stands.");
  - `decadeChoices`: at least 6 pairs (ids into `dividends.ts`), ordered as a sequence: decade 1's pair teaches the
    choice, later pairs get sharper. Option 0 of every pair is the modest one (it is the default when offers pile up);
  - keep `decadeEffects` small (they now pay on lean decades too, scaled by pace).
- `orders: { marketFromReckoning: 1, marketPaybackMax: 120, paybackChoices: [30, 120, 600], intervalYears: 1 }`.
- `commons: { fromReckoning: 2, fundShare: 1 }`.
- `respecRefund: 1`.
- `hindsight.perLeanDecade: 0`, `hindsight.perSettledSector`: a placeholder about half of `perSteadySector`.

### 2. Dividends (`dividends.ts`, new): at least 14 `DividendDef`s in at least 7 pairs

- Each pair is a real choice between two shapes of the same money, and each option names what it does with it.
  Kinds that work: Mandate now against a standing `mandateRateMul`; capital (`capitalAdd`) against `absorptionAdd` in
  the decade's own Industry; `wellbeingAdd` against `commonsYieldMul`; `satMul` < 1 on one application (sufficiency
  as a habit) against `marginAdd`; `popGrowthMul` < 1 (a later-marriage dividend) against `halfPriceMul` > 1 (the
  dividend spent: name the rebound).
- No `slotAdd` (the lint forbids it: seats matter only between runs). Effects that name a sector must name the sector
  whose decade it is; use per-Industry `steady.decadeChoices` for those, and global pairs for sector-free effects.
- One-off amounts are multiplied by the pace's `dividendMul`; write blurbs that read well at ×1 and ×2.5.

### 3. Per Industry (`sectors/<id>.ts`, all five)

- `service.unitSingular` and `resource.unitSingular` where the unit has a plural ("feature", "ton", "barrel"…).
- `steady.clearBelow` (and `clearCeiling` where needed) so the sink line is reachable but needs substitution,
  circularity, absorption or sufficiency, not a held cap alone. **Code** has `absorption: 0`: its `sinkR` is null and its
  clear skies come only from deletion; keep its `clearBelow` and say so in a comment.
- `steady.paces` only where an Industry should differ from the global three (say why in a comment).
- `steady.decadeChoices`: one or two Industry-flavoured pairs each (Steam: a pit-head bath or a dividend in coal;
  Code: a refactoring week or a feature freeze bonus…).
- `settle` for all five: `dividend` (a standing effect that rewards keeping it settled: Mandate rate, wellbeing, a
  Commons yield, absorption elsewhere; one-offs fire once a run), `upkeepPerSpill` (start about 0.2 Mandate/s per unit
  excess), `freeExcess`, and a `blurb` for the ceremony in the Industry's voice.
- `stage` on efficiency upgrades: 1, 2 and 3 on the cards that change the machine (Steam: Separate condenser → 1,
  High-pressure or Cornish → 2, Turbine → 3; Light: mantle 1, filament 2, fluorescent 3; equivalents elsewhere). At most
  three stages per Industry; never on capital, prospect or research cards.
- Duty and cap levers: `recycle: ['treasury', 'dividend', 'commons']` (never 'commons' first). Extend each catch line
  to name the commons' rebound in a few words, or put it in `recycleBlurb.commons`.

### 4. The Commons (`commons.ts`, new): 8 projects

- At least five Coal Age projects with `sector: 'steam'` or `'light'` (baths and washhouses, a free library, a park,
  allotments, a mechanics' institute, a public clock or lamp scheme), two later ones (the shorter working week, repair
  cafés or a public broadcaster's evening service), one general project with no sector.
- Each has `icon` (a short scene key: `baths`, `library`, `park`, `allotments`, `institute`, `clock`, `shortweek`,
  `repair`; tell the scene lane in your report), `wellbeing { max, perLevel }`, and at least four of the eight have an
  `intensity` (a library is lit, baths are heated) and at least two a time rebound (`effects: [{ type: 'satMul', sector,
  app, value > 1 }]` on a leisure application: Light's picture palaces, Motion's motoring).
- One or two repeatable projects (`maxLevel` 3–5, `costGrowth`); the rest one-offs. Some need Mandate as well as money.
- `requires` only where a project needs a milestone (`{ owns }` or a stat); keep most always available.

### 5. Charters (`prestige.ts`): 8

- Each tilts one rebound and starts the run differently, mildly, with no goal: "The Northern Coalfield" (deep seams:
  `reserveAdd`, a cheaper engine card), "The Cotton Towns" (`startFounded: 'steam.mills'`), a Charter that lends an
  Institution (`institutionLoan` at level 1, for a player who does not own it), one that unlocks a locked fork pair
  (`unlock`), one with a `startLever`, one with `startCapitalMul` and a cost elsewhere (`marginAdd` < 0), one for Light
  whose `requires` is that Light has opened in some run (`{ owns: 'light' }`: a sector id in `owns` reads
  `meta.sectorsOpened`), one that favours restraint (`absorptionAdd`, slower
  `popGrowthMul`).
- Every Charter has a cost or a rebound named in its blurb; none is strictly better. `sector` set where it concerns one
  Industry; `landmark` a scene key where it adds a place (tell the scene lane).

### 6. Institutions (`prestige.ts`)

- **The Civil Service** (new; `orderUnlock: 'civilService'`), around the cost of a mid-tier Institution, with a blurb
  saying it holds a line with the levers you give it and asks for nothing (a closing automation).
- **Treasury rules** (new; `orderUnlock: 'treasury'`), dearer (hour 10 in `long-game.md`).
- **Offline steps**: give an existing Institution (or the Civil Service's level 2) `offlineCapAdd: 4 * 3600` so the cap
  reaches 12 h by about hour 5.
- Rename nothing that exists (saves depend on ids). The Know-how node `kh.civilService` keeps its id; change its display
  name if it now reads as the Institution.

### 7. Achievements (`achievements.ts`): 15 new, with `when`

Use the M2 stats and `owns`. Suggested set: first lean decade (`leanDecades` ≥ 1); first full decade
(`fullDecades` ≥ 1); clear skies
in Steam (`clear`, sector steam); clear skies in Code (deletion's reward); Steady State in two Industries in one run;
first settlement (`sectorsSettled` ≥ 1); three settled at once; ten Commons levels (`commonsLevels`); a Commons project
in each Coal Age Industry (`owns` of one project per Industry, `all`); the Market idle (`automated` ≤ 0 with
`reckonings` ≥ 1 and `time` ≥ 1800); 500 decisions in one run; Steady State with fewer than 100 decisions (an
"Enough" achievement, hidden); two or three Charter achievements (`owns` of the Charter plus a milestone). Pace is not
a stat: do not promise a "Severe" achievement. Hidden ones few and fair.

### 8. Words the UI needs

- `Content.knowhowTrees`: a name and blurb for every tree in use (`steam`, `general`).
- `Content.recycleText`: names and one-line blurbs for `treasury`, `dividend`, `commons` ("Into the Treasury",
  "Back to households", "To the Commons").
- Headlines for the new keys in `news/fallback.ts` (every key needs at least 4 variants: `clearSkies`, `settled`,
  `unsettled`, `commonsBuilt` with `{name}`, `charter` with `{name}`) and `sectorHeadlines` for `clearSkies`, `settled`
  and `unsettled` in each Industry (3 each). About 60 new lines in all.

### 9. Lint (`content.test.ts`)

Extend it: unique ids across dividends, Commons and Charters too; every `decadeChoices` id resolves; no `slotAdd` in a
dividend; every Commons `sector`, `intensity.sector` and effect sector resolves; every Charter `requires` resolves; every
`startFounded` app and `institutionLoan` id resolves; no recycle list starts with `'commons'`; every tree in use has a
`knowhowTrees` name; every `stage` is an integer 1–3 on an efficiency card, at most three distinct stages per Industry;
every unit with `unitSingular` differs from `unit`; every pace has 0 < declinePerDecade < 1; `clearCeiling` ≥
`clearFloor`; headlines for every HeadlineKey; and the existing checks (words, length, Americanisms) over all new text.

## Volume targets

8 Commons projects · 8 Charters · ≥ 14 dividends in ≥ 7 global pairs plus 5–10 Industry pairs · 5 settle blocks ·
3 paces · 2 new Institutions plus an offline step · 15 achievements · ~60 headlines · stages on 12–15 cards ·
`unitSingular` everywhere it applies.

## Numbers

Orders of magnitude and smooth curves; the balance lane tunes. Keep these rules: `wellbeingTarget` < transition;
Commons `max` small against the wellbeing target (a project is worth 1–4 points, all eight together under 12); Commons
intensity small against the Industry's demand (a few per cent at full levels); `dividendMul` keeps Severe's one-offs
worth having but not decisive.

## Checks

```
bunx tsc -p .                 # src/content clean (ignore core and UI until they land)
bun test src/content
```

Also run a throwaway `bun -e` script (not committed) that prints the dividend pair sequence, the Charters with their
effects, the Commons table (cost, max, perLevel, intensity) and the stages per Industry.

## Final report (concise)

- Tables: paces, dividend pairs in order, Commons, Charters, settle blocks, stages.
- Counts against the volume targets.
- Facts you could not source, flagged; scene keys you introduced (`icon`, `landmark`).
- Anything missing or awkward in `types.ts`.
- The numbers you are least sure of.
