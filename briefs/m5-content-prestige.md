# Brief: M5 CONTENT — the Chair's data: ChairDef, RivalDef, Statecraft, Institutions, Articles, playbooks, features

You write the data that defines the Ministry and the rival: `Content.chair`, `Content.rival`, `Content.office` (numbers;
the texts are the text lane's), the general pledges, the Statecraft tree, two Institutions, four Articles, two playbooks,
the M5 features table, and the content registry wiring for every M5 export. Design: `design/m5-design.md` §§5, 6, 8, 9;
contract: `design/m5-contract-notes.md` §§1–4, 8, 9, 11.

Do NOT edit `src/types.ts`, `src/core/**`, `src/ui/**`, the Industries' files (Motion and Plenty export their own
loopholes and pledges; you wire them), `build.ts`, `DESIGN.md`, `CLAUDE.md`. No git writes.

## Standing instructions

- Keep `design/scratch/m5-prestige-progress.md`; one verified piece at a time; you own `src/content/index.ts` (the
  registry) this milestone.
- Numbers are first guesses for the balance lane; comment each with what it is for and what would move it.

## Read first

`design/m5-design.md`; `src/content/prestige.ts`, `features.ts`, `acts.ts`, `global.ts`, `index.ts`; the core lanes'
experiment results E2 and E4 (the response costs and Confidence weights they found workable on the fixture).

## Your files

New `src/content/chair.ts` (ChairDef, RivalDef, OfficeDef numbers, general pledges, Articles, playbooks); extended
`src/content/prestige.ts` (Statecraft nodes with `tree: 'statecraft'`, `when: { feature: 'statecraft' }`; the
industrial trees' `holder: 'rival'` in `knowhowTrees`; the Water Resources Board and the Independent Statistics Board;
the Alkali Inspectorate gains `inspectorAdd` at a level), `features.ts` (the M5 rows), `index.ts` (registry).

## Work

1. **ChairDef**: Confidence weights (start 55, winAt 50, relax 0.15, perWellbeing, perPriceShare, perJobShare,
   lobbyPerYear, fineFound, crisis, campaignPerMandate), elections (10, 15, 3, 3, 2), opposition (1, 2), inspection (2,
   5, 10, 6, 0.02, 0.2, fineMul), treasury (taxShare, levyShare), compensation, amend defaults, the Hindsight overlay
   (`perBudgetDecade` up for Act II, `perParliamentWon` small), treaty terms and `when`.
2. **RivalDef** 'pryce': cast 'pryceChair', defaultProfile (from the balancer's `efficiency` opening), responses
   (comply; evade feature 'loopholes'; lobby with costPerPoint and carveOutAt; litigate window 5, delay 3, fee; conceal
   feature 'inspection'), policy (payback 240 → 60 s; founding limits; drawnLobby; quietSpread), profileFrom,
   knowhowTransfer (k 0.01, cap 1.25), startCapitalSeconds.
3. **OfficeDef** numbers: `when` (`{ ending: 'actOne' }` and Motion `openFor ≥ 300`), prospectusItems 5.
4. **Statecraft** (about ten nodes, three tiers, one fork: Parliamentary drafting **or** the Inspectorate; Standing
   inspection via `orderUnlock 'inspection'`; Whips; Polling; Compensation fund; Treasury solicitors; Heavier fines;
   Plain words). Priced to the Ministry (criterion 19): tier 1 about a third of a median Ministry's Hindsight, tier 3
   about one.
5. **Articles** (four: An Independent Inspectorate, The Ratchet Clause, The Statistics Act, Fixed-term Parliaments) and
   **playbooks** (two: Self-reporting at treaty 1, Friends in the Press at treaty 2).
6. **Features** in arrival order (`design/m5-design.md` §8): 'chair' `{ flag: 'office' }`; 'loopholes' (Ministry 1,
   mid-run window, a laddered lever binding); 'inspection' (Ministry 2 at the Reckoning); 'treasury' (Ministry 2
   mid-run); 'statecraft' (Ministry 3 at the Reckoning); 'charge' (Ministry 4 at the Reckoning); 'treaty' (the Reckoning
   after `settledFromChair ≥ 1`). Each with an intro headline (the text lane may rewrite the words).
7. **Lint**: the content test must accept `meta.institutions[id] = 0`, `stance` on arms, the new kinds; propose the
   lint changes to the coordinator if the test file is not yours (it is `src/content/content.test.ts`: you may extend
   it for M5 rules: every chair lever with a catch naming its Act II clause; every loophole reachable; every pledge with
   a `when`).

## Done means

`bun test src/content` green; a Ministry builds from the fixtures with real content; the bots run; every number
commented.

## Verified by

`bun test`; `tools/balance.ts steward --office` from `fixtures/m5/office-offer.json` reaching Ministry 3 (output to
`design/scratch/m5-prestige/`); the Hindsight shop and the Articles tab on the real page at 390 × 844 via the UI lane's
shots.
