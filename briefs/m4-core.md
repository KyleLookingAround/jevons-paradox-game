# Brief: M4 CORE lane

You bring the simulation core of "Rebound" up to the M4 contract ("The Coal Age complete": Acts and the capstone, the
shared reserve, Iron's feeds, Fishing's renewable stock with its threshold, scar, reported stock, survey and foreign
fleets, the `quota` lever, `settle.requires`, wager arms, save v5). Other lanes build from the same contract at the same
time and do not talk to you: content (Iron, Fishing, text, Act and prestige), UI, scene, audio; balance comes after.

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`. If the contract is
wrong or missing something, work around it locally and say so in your report.

## Standing instructions

- You will be interrupted by container restarts and usage limits. Keep `design/scratch/m4-core-progress.md`, update it
  after each piece, land one verified piece at a time (tests green, `src/core` typechecks).
- No git writes. The core stays pure: no DOM, no `Date.now()`, no `Math.random()`, never mutate the state passed in.

## Read first

1. `src/types.ts`: search "M4:" and every `/* --- M4 --- */` hunk.
2. `design/m4-contract-notes.md` (all; §12 is your module table) and `design/m4-design.md` §§4–8.
3. `src/core/README.md`, `CLAUDE.md`, the M3 core brief (`briefs/m3-core.md`) for the conventions that still hold.

## Your files

`src/core/**` (modules, README, tests, `fixture.ts`) and `tools/balance.ts` with `tools/strategies/*`. You alone own
`src/core/step.ts`, `index.ts`, `derive.ts` this milestone; one line per mechanic in `step.ts`.

New modules: `inherit.ts` (the one carry-over step), `survey.ts`, `acts.ts`, `renewable.ts` (with the foreign share, or `foreign.ts`), `feeds.ts`. Extended: `settlement.ts`,
`flows.ts`, `solver.ts`, `contentIndex.ts`, `levers.ts`, `policy.ts`, `effects.ts`, `dispatch.ts`, `conditions.ts`,
`offline.ts`, `hindsight.ts`, `temptation.ts`, `serialise.ts`. Keep the README's layering (no cycles) and update its
table.

## Work, in this order

1. **No fields, no change.** Before anything else, capture a byte-identical 1-hour `budget` trajectory on real content
   and the M3 fixture; every later step must reproduce it while content has no M4 fields.
2. **Shared reserve** (`resourceStock`): owner's p_r, combined drain, owner's exhaustion, `drawnBy`, reserve views.
3. **Feeds**: edges in the topological solve order ('*' expanded, cycles refused); factor into c before c_eff; settled
   sources feed their settled adoption; settled targets not fed; the shadow sees the same factor; `feeds` views with
   rAdded cached per derive bucket (reuse `temptation.ts`'s bucket); the Iron card's wantedChange includes the fed
   Industries.
4. **Renewable stock**: G(Q), substepped Q update, reported stock and p_r, derived depletion pressure, crossing and
   scar (ticks with open play, offline included, not while settled), start-of-run stock while scarred, sinkR and clearP
   for depletion (true values), the survey effect and `stock` view rules (sinkR/clearP null while unsurveyed;
   HistorySample.sink only while surveyed).
5. **Foreign fleets**: share, R_foreign, foreignMul, 'foreignFleets' headline once a run at announceAt.
6. **`quota`** and **`settle.requires`**, `settleBlocked`, `Derived.ending.next.need` 'requires'.
7. **Acts and the ending**: the current act, the M4 streak rule (the M3 rule unchanged without acts), the ending
   record, 'ending' with the act's id, `Derived.ending.act`.
8. **The capstone**: record at the ending; build in `reckon` and `createState(content, meta)`; per-head scaling;
   income share; excluded from room and unsettle; Hindsight exclusions; 'capstoned' events at build.
9. **Arrears**: the lapse rule's last step for capstoned sectors; stepping pressure (or the stock) with the excess R;
   collapse held at 0.99 × collapseAt; clearing; the offline hold and `heldBy` 'arrears'.
10. **Wagers**: resolution on answer, `won`, events, the view; the default-arm rule unchanged.
11. **Conditions**: `{ ending }`, every new StatKey.
12. **Persistence**: v4 → v5 exactly as the contract says; v1–v4 chain; v6 → null.

## Fixture (`src/core/fixture.ts`)

Add, without touching the existing sectors: a stock sector drawing on Steam's reserve with three apps, two of which
feed (one into Steam, one '*'); a renewable sector with a ForeignDef, a threshold, a scar, two apps, a quota lever and
a measure lever carrying the survey effect, and `settle.requires` on surveyed; an `acts` variant of the fixture (two
acts: the first with an ending over three sectors and a capstone, the second `preview`); two dispatches with wager arms
(one on a visible stat, one on `stockFraction`).

## Required tests (`bun test`; new files `m4.*.test.ts`)

1. No fields, no change (above), deep-equal for 3600 s on the M3 fixture and real content without M4 fields.
2. Shared reserve: drain = R_owner + R_drawer; p_r the owner's; exhaustion names the owner; a settled drawer drains
   nothing; seams sunk by the owner lower both prices' ladder alike.
3. Feeds: factor formula at adoption 0, 0.5, 1; '*' excludes the source; two feeds multiply; topological order (a feed
   into an earlier sector solves correctly); a cycle is refused by the index; settled source and target cases; rAdded
   equals a brute-force removal solve to 1e−9; the target's rebound meter unchanged by the feed.
4. Renewable: G at K/2 = r·K/4; logistic recovery from 0.5K with no catch matches the closed form to 1e−6 over 200 s;
   below θ regen × collapsed; the crossing fires once per run with its event and writes the scar; the scar ticks with
   open time in tick and fastForward alike and not while settled or closed; a Reckoning does not shorten it; the next
   run starts at startScarred × K while scarred; reported = (Q/K)^β and p_r follows it; P derived and crises at their
   fractions; never a forced Reckoning; sinkR = G(Q_clear) − R_foreign(Q_clear); sinkR/clearP null while unsurveyed and
   true values while surveyed.
5. Foreign: share formula and clamp; R_foreign = R_home × share/(1 − share); foreignMul; not on the line; a settled
   sector has none.
6. Quota: capR = value × sinkR; hidden unsurveyed; holds the last surveyed sinkR when the survey lapses; value 0 holds
   D at the floors; tightest of cap and quota applies.
7. settle.requires: canSettle false and settle refused while it fails; `settleBlocked` label; next.need 'requires'.
8. Acts: current act; the streak counts only with every ending sector settled (capstoned counts); flags.won, the
   record, the events in order; without acts the M3 rule is byte-identical.
9. Capstone: built at run start settled; per-head scaling below and above N0; income share; not in room; unsettle
   refused; levers hidden; Hindsight exclusions; createState with a capstone meta.
10. Arrears: entered only after levers have lapsed, only for a capstoned sector (others unsettle as before); R × (1 +
    excess − freeExcess); pressure stepped; no run collapse; cleared when Mandate covers it; offline holds one step
    before; `heldBy` 'arrears'.
11. Wagers: win when the Cond holds at answer time, lose otherwise; cost first, arm effects then branch; `won` stored;
    expiry never takes a wager (default arm rule).
12. Conditions: each new StatKey and `{ ending }`, including FALSE on the wrong kind of sector.
13. Migration: a hand-written v4 save before the M3 ending and one after it (with `steadyAll` and a won flag mid-run)
    load as the contract says (Iron and Fishing closed, Motion/Compute/Code openable through `owns`, `steadyAll` kept,
    `steadyYearsAll` 0, no events replayed); v1–v3 chain; v6 → null; v5 round trip lossless.
14. Purity, determinism, speed: no NaN after 3 h of `budget`, `efficiency` and `mixed` with every M4 kind in use;
    identical actions give deep-equal states; a step with the four Act I Industries open ≤ 1.3× M3's step with five
    (report both, µs); an 8-hour `fastForward` with the capstone and three Previews under 3 s in Bun;
    `src/core/perf.budget.test.ts` passes unchanged or with budgets the coordinator approves.

## Balancer (`tools/balance.ts`, strategies in `tools/strategies/`)

Each behind a flag; the balance lane depends on them:

- `--ignore=feeds` (founds no Iron use that feeds; for criterion 5) and the temptation probe for the order book.
- **Fishing play** for every strategy: founds uses as now; draws a line and raises the landings quota under restraint;
  `--survey=never|cruise|board` (never; survey cruises from the first poor season; seat the Fishery Board when offered).
- **`fishsteward`** (new): survey cruises from the first poor season, survey quota at 90% of the surplus, fishery limits
  only with the quota.
- **Letters**: `--dispatch=thoughtful` now reads only what the page shows (true stock only while surveyed; otherwise
  catch per trip), and takes a wager when its own estimate says the condition holds; `--dispatch=oracle` evaluates the
  Cond directly (an upper bound); keep default, first, random, best.
- **Acts**: `--ending` pursues the Act I ending (save for the Commission's first sitting; settle Fishing once surveyed);
  after it, continue into the Previews; summary columns: act ending hour, capstone defence share, arrears seconds.
- **Unlock log** (`--unlocks`): add Industry openings and Fishing's firsts (first poor season, banks fail, first survey,
  scar healed) as firsts; report "new things per run" (features + Industry openings) and the smallest gap.
- `--from=<dump>` and `--dump-at` already exist; add a fixture dump at the Act I ending for the UI and Playwright lanes
  (`design/scratch/m4-fixtures/act1-ending.json`) and one at the late-Act-I state (`act1-late.json`).

## Checks

```
bunx tsc -p .
bun test src/core
bun run tools/balance.ts budget 6 --fixture --summary --unlocks
bun run tools/balance.ts fishsteward 3 --fixture --summary
bun run tools/balance.ts budget 2 --summary            # real content, before and after the content lanes land
```

## Done means

Every rule in the contract implemented and tested as above; real content without M4 fields byte-identical to M3; the
balancer runs every strategy and flag on the fixture; speed targets met. Final report: modules and README table, every
contract gap and your workaround, constants chosen, test counts, µs per step before and after, what balance must know.

## Revision (20 Nov 2026): The Survey and foresight

Add, after step 9 of the work list, and before wagers:

- **`inherit.ts`**: move every carry-over into one function used by `reckon` and `createState(content, meta)`; the capstone
  and the scar are applied there and nowhere else; world records live in `meta.world` (contract notes §14).
- **The Survey** (`survey.ts`; contract notes §15): the free first survey (once per save per sector, at `atCrisis` or
  `afterSeconds`, never inside fastForward); `Derived.surveyReveal` with its variant; the full account (attribution that
  conserves totals, including settled sectors and drawsOn); `BudgetState.account` and every R-against-line test reading
  `fullR` on a 'full' line, with a cap pricing only own R; `yearsLeft` flat and growing; all gated on feature `estimates`.

Tests to add: (15) the first survey fires once per save, at the first of its two triggers, not offline, and its modifier
lapses after `years`; the reveal's variant by gap and crossing; (16) Σ fullR = Σ R to 1e−9 in states with feeds, drawsOn
and a settled source; a 'full' line counts received R; a 'full' cap prices own R only; old lines keep 'own'; (17)
yearsLeft.growing < flat when the trend is positive, equal when not; (18) a run started from a meta with a non-full
reserve and population 5 (a hand-built "inherited" fixture) satisfies every M4 rule (foresight: no code assumes a fresh
world); an unknown `ReckoningCause` in a save does not throw. Balancer: `--unlocks` logs the Board's Survey as a first;
summary column "account" per line.
