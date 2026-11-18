# Rebound against the genre: an audit

18 Nov 2026. Measures our plan against `design/research/genre.md` (cited below as **G§n**, its section numbers).

**What I read:** `CLAUDE.md`, `DESIGN.md`, `design/critique-v1.md`, `design/proposals.md`, `design/long-game.md`,
`design/roadmap.md`, `design/m1-contract-notes.md`, `briefs/m1-balance.md` and `briefs/m1-ui.md`, with skims of
`briefs/ui.md`, `src/types.ts` and `src/content.ts`.

**Playtest.** I played the first ten minutes of the live v1 at a 390×844 phone viewport. A Playwright bot tapped Sell
about once a second and bought anything affordable. Script and logs: `design/scratch/play.js` and
`design/scratch/shots/`.

**Vocabulary.** The unit of play is a Sector in code and an Industry on screen. The period is an Age. Older documents
say "era".

---

## 0. The first ten minutes, as a genre veteran

The live build is v1, so it predates the M1 work. These are honest reactions, with the bot's timestamps.

| Time | What happened | Reaction |
|---|---|---|
| 0:00 | One handsome screen: three dial gauges, a broadsheet, a pump vignette, three "?" tiles ("Thinkable below £0.8/hp"), a big Sell button. The rebound dial reads "? not yet understood". The Light tab shows "£1.04 → £0.25 · 1 more Reckoning". | Good. The "?" tiles and the locked tab hand me goals and a mystery in one glance (G§2, G§5). |
| 0:00–0:26 | I tap Sell. Each tap pays +£7.3 against £5.3/s passive. | Tapping is worth 1.4 s of income. At 5 taps/s I earn 7× the idle rate. Clicking is mandatory from the start. |
| 0:26 | **Better boilers** (−33%, £400). Consumption falls to ×0.79; the log says "coal use −6% a year". | First purchase at 26 s is on target. But the first anomaly the plan wants ("Consumption ticks *up*", long-game.md 0:40) does not happen: the card did exactly what it promised. |
| 1:24 | Cotton mills founded (£500). Income ×4, consumption ×4.1. The Gazette: "Economist puzzled: savings 'appear to have been spent'". Mandate appears (+0.1/s). | This is the hook. The headline is the right length and the right tone. Mandate appears with nothing to spend it on. |
| 2:18 | Screw-cutting lathe. | Fine. |
| 3:27 | **Separate condenser** (−40%). Consumption falls from ×4.1 to ×3.7. | The paradox is *not* felt at the big card. A thoughtful player concludes efficiency works. |
| 3:27–5:18 | Nothing affordable for 111 s. The Coal Question pamphlet is on offer (£4k). | The pamphlet prints Jevons' punchline *before* I buy it: "It is wholly a confusion of ideas to suppose that the economical use of fuel is equivalent to a diminished consumption." The reveal is spoiled on its own card. |
| 5:18 | Sink a deeper shaft (repeatable prospect). | The only repeatable purchase. It is welcome. |
| 5:18–7:30 | 132 s with nothing to buy. Mandate climbs. | Longest gap. Income is flat at about £21/s for 6 minutes. |
| 7:30 | Railways founded. Consumption ×9.7. | A second big jump, and the gauges now plainly disagree: efficiency ×2.5, consumption ×9.7. |
| 8:19 | A crisis: Mandate jumps from 64 to 219. | A windfall in a currency I still cannot spend. |
| 8:42 | Double-acting engine. | — |
| 10:00 | Seven purchases in total. Mandate 262, unspent. Coal "≈ 30m 19s" left. "Call a Reckoning, Hindsight on offer: 28" is offered before the reveal. Sell still pays about 1 s of income per tap. | The genre's cadence (G§2) wants 15–30 decisions by now. Being offered a prestige before I have learnt what the game is about is premature. |

No console errors. On the phone, the Improvements list sits below the fold, behind the vignettes and the Sell button.
Nothing on the first screen says that a card has become affordable.

**Verdict.** The presentation and the writing are already at the level of the genre's best browser games. The pacing
is a v1 placeholder: too few purchases, two-minute gaps, an anomaly that does not fire, and a currency with nothing to
buy. Most of this is already a target in `briefs/m1-balance.md`. The items it lacks are below.

---

## 1. Scorecard

Ratings: **Good** (already right) · **Under-specified** (planned, but no number, owner or test) · **Missing** ·
**Wrong** (works against the finding).

| Principle (genre.md) | Rating | Evidence in our documents |
|---|---|---|
| Theme lives in the mechanics, not the text (G§1, G§19) | **Good** | DESIGN.md "the gauges do [the lecturing]"; pillar 1 "every system names its rebound"; Paperclips is the explicit model for the acts. |
| Let the player be wrong first (G§19, Case's "place your bets") | **Good** in plan · **Wrong** in v1 | D1: backfire pays best in runs 1–2. In v1 neither boilers nor condenser raise use, and the pamphlet states the answer before purchase. |
| Always something to buy (G§2) | **Under-specified** | M1 has pacing targets for six beats only. The roadmap's M2 exit allows "no stretch of more than 10 minutes with nothing to buy" (see Wrong below). There is no cadence target, and only one repeatable card per sector. |
| Exponential cost against polynomial production (G§3) | **Missing as a rhythm** | Upgrades are one-off chains (`ladder(4_000, 1.5, 6)`). The genre's constant small purchases at ×1.07–1.15 do not exist; the only repeatable is the prospect at ×2.2. |
| Visible next goal (G§2) | **Good** | Locked-industry checklist (M1 UI 8), "Thinkable below £x" tiles, decades ledger. |
| Affordable indicator from the main screen (G§2) | **Missing** | Not in `briefs/m1-ui.md`. On a phone the cards are below the fold. |
| First five minutes (G§4) | **Good** in plan · **Under-specified** in tests | The long-game.md beat table is excellent: a beat every 1.5–2 min. Only six beats are tests; cadence and gaps are not. |
| Unfolding, one thing at a time (G§5) | **Good** | P8 rule "one new mechanic per era … never more than one new gauge"; ages restyle the page. |
| Reveal changes what the player does (G§5) | **Good** | Cards gain the decade and within-reach lines; levers appear. |
| First prestige: timing (G§6) | **Good** | Run 1 ends at 30–45 min, the run has its own arc, and a Reckoning card reads as a ledger. |
| First prestige: not offered too early (G§6) | **Missing** | v1 offers a Reckoning with 28 Hindsight at 10 min, before the reveal. No rule hides it. |
| Prestige that is not "bigger multiplier" (G§6) | **Good** in plan | Pillar 2; Institutions as a loadout; Know-how prints its side-effect; Treaty and Long Now change the verb. |
| Prestige choice made *at the reset* (G§6, thread 1utmy54) | **Good** | Hindsight is spent only between runs (`Derived.freshRun`); the loadout is chosen per run. |
| Meaningful choices without guide-slop (G§7) | **Under-specified** | P7 forks and P4 loadouts. **Wrong:** Know-how forks are permanent with no respec in M1 (m1-contract-notes §2), which is "one right answer, punished for a month". |
| Active and idle both viable (G§8) | **Wrong** in numbers | `clickSeconds: 0.5`, `clickFlat: 3`. At 5 taps/s, clicking pays 2.5× passive income plus £15/s, for the whole game. |
| Offline that does not punish (G§8) | **Wrong** | `offlineCapSeconds: 4 h` until hour 5 (long-game.md) loses half a night's sleep. In a game whose runs end by collapse, `fastForward` can carry a run into a collapse while the player sleeps: they return to "The air gives out". |
| Automation as reward (G§9) | **Good** | P11: the Market (run 2), Civil Service, Treasury. Automating efficiency first *is* the rebound. Settled eras collapse to one row. |
| QoL veterans expect (G§10) | **Under-specified** | Export/import, hard reset, stats and a formula sheet are in v1. Notation, hotkeys, bulk Tighten, backups and save persistence are not mentioned (checklist §4). |
| Number feel without noise (G§11) | **Good** | Dry broadsheet; pressure as weather, not a bar; tabular numerals. |
| Achievements and challenges (G§12) | **Good** in volume · **Under-specified** in rules | 25 → 50 → 150 achievements; Histories P12. No rule against stacking challenges or locking QoL behind them, which is the thing players say makes them quit. |
| Finite with an ending (G§13) | **Good** in shape · **Wrong** in timing | Credits at the true ending, then a post-game. But the first ending is at about 110–120 active hours, and the M3 "stop and look" game (about 20 h) ships without one. |
| Tone (G§14) | **Good** | "Never lectures"; real people only in blurbs; a fictional cast. |
| Content cadence and filler (G§15) | **Good** in discipline · **Under-specified** in cadence | Era kit; "numbers generated, words not"; content lint. But long-game.md's Light phase runs 7–13 active hours with one new mechanic. |
| Phone and browser (G§16) | **Under-specified** | Background catch-up uses `fastForward` (good). Nothing about Safari's 7-day storage deletion, `storage.persist()`, Home Screen install or battery. |
| Accessibility (G§17) | **Under-specified** | `prefers-reduced-motion` and keyboard focus are in `briefs/ui.md`. The signature signal is red against green; no text-size option; no `aria-live` for headlines. |
| Restraint is an optimisation, not a tax (G§19) | **Good** in plan | Budget line, wellbeing per ton, Settlement, Commons. |
| Suppression never cheaper than cause (G§19, Factorio) | **Under-specified** | A crisis grants +150 Mandate (`crisisMandate`). No test that provoking crises is never the best Mandate source. |
| No verdict on the player's play (G§19, Frostpunk) | **Good** | The run summary is a ledger. Keep endings as data. |

---

## 2. Ranked recommendations

Each is tied to a finding and states the change. **Lane** says where it lands.

### Do in M1 (cheap, high value)

1. **Make the first anomaly and the condenser actually backfire.** *(G§19 "be wrong first"; playtest 0:26 and 3:27.)*
   Already a beat in `briefs/m1-balance.md`; promote it to the first test written. Targets: Better boilers raise R by
   ≥ +3% within 60 s; R doubles within 120 s of the condenser. Both currently fall. **Lane:** M1 balance.

2. **Add one repeatable "growth" card per sector with genre cost growth.** *(G§3: purchases at ×1.07–1.15 are the
   genre's heartbeat; playtest: 7 purchases in 10 min, gaps of 111 s and 132 s.)*
   - The contract already supports it: `UpgradeDef.repeatable`, `costGrowth`, `maxLevel`.
   - Make it thematic: Steam "Another engine works" (`capCost ×0.97` per level, `kind: 'capital'`, so it shows the
     decade projection). Cheaper engines mean more engines, which is the embodied rebound.
   - Numbers: first cost about £150, `costGrowth` 1.15, `maxLevel` 25.
   - Add the cadence targets as tests (efficiency-greedy play):
     - ≥ 12 purchases or decisions in the first 10 minutes;
     - no gap over **90 s** in the first 15 minutes;
     - no gap over **3 min** to the end of run 1.

   **Lanes:** M1 content (card) and M1 balance (numbers, tests).

3. **Fix clicking so it matters for three minutes, then fades.** *(G§8: mandatory clicking is the oldest complaint.)*
   `clickSeconds` 0.5 → about **0.03**, `clickFlat` 3 → about **1.5**. Targets at 5 taps/s:
   - click income ≥ 1.5× passive at 0:30;
   - ≤ 0.5× at the condenser;
   - ≤ 0.25× at the reveal.

   This also lets the UI's shrink rule fire (balance finding 7). **Lane:** M1 balance.

4. **Don't spoil the reveal on its own card.** *(G§19, Case: the answer only "after they've wrestled with the
   question".)*
   - Before purchase, The Coal Question's blurb asks a question, in Whitlow's voice: "Why does thrift breed appetite?"
   - The Jevons quotation appears in the Gazette on purchase.

   **Lane:** M1 content (words only).

5. **Show Mandate and the Reckoning only when they mean something.** *(G§2 "unclear next goal", G§6; playtest:
   Mandate idle from 1:24, 262 unspent at 10:00; Reckoning offered at 10:00 before the reveal.)*
   - Mandate shows once any lever is visible. This replaces `briefs/ui.md`'s "until the reveal or mandate > 0".
   - "Call a Reckoning" shows once `flags.revealed` or a Reckoning is pending.

   **Lane:** M1 UI.

6. **An "affordable" signal on the first screen.** *(G§2, thread 1uytrlm.)*
   - A count badge on the Improvements heading.
   - A chip beside the Sell button ("2 affordable ↓") that scrolls to the first affordable card.
   - A dot on any Industry tab with an affordable card, separate from the existing danger dot.

   **Lane:** M1 UI. Size S.

7. **A save-safety pack.** *(G§16: Safari deletes script-writable storage after 7 days of Safari use without visiting;
   G§10.)*
   - Call `navigator.storage.persist()` once after the first purchase.
   - Keep a rolling backup of the previous save under a second key, written at each Reckoning.
   - Show "last exported N days ago" in the menu, and offer a one-tap export file after each Reckoning.
   - On iOS Safari, add one quiet line in the menu: "Add to Home Screen to keep your save safe".

   **Lane:** M1 UI. Size S.

8. **QoL basics that are cheap now** (checklist §4):
   - notation setting (suffix / scientific / engineering) in `fmt`;
   - desktop hotkeys (1–5 Industries, S sell, R Reckoning, Esc close);
   - "Tighten to max affordable" on levers;
   - confirm dialogs on fork purchases ("rules out X");
   - text size (100 / 115 / 130%);
   - `aria-live="polite"` on the lead headline;
   - signs and arrows on every red/green number. Partly done: "+24%" already carries a sign.

   **Lane:** M1 UI. Size S each.

9. **Add two balance tests the genre would insist on.** *(G§19 Factorio; G§6.)*
   - (a) A `crisisFarm` strategy, which deliberately provokes crises for Mandate, never beats `budget` for Mandate per
     minute or Hindsight per minute after run 2.
   - (b) Run 2 shows something new within 5 minutes: the Market offer, a fork arm not seen in run 1, or the Light
     checklist moving.

   **Lane:** M1 balance (test (b) may need a UI check in the Playwright script).

### Do in M2 or M3

10. **Offline must never kill a run unseen.** *(G§8 "why punish offline play?"; our runs end by collapse.)*
    - **Contract (M2 commit):**
      - `GlobalParams.offline?: { capSeconds: number; holdBefore: 'crisis' | 'collapse' | null }`;
      - `GameState.lastOffline?: { requested: number; simulated: number; heldBy: 'crisis' | 'collapse' | 'exhausted' | 'cap' | null }`.
    - **Core:** `fastForward` stops one step before the first crisis or collapse it would cross (default
      `holdBefore: 'collapse'`) and records why.
    - **UI:** the "While you were away" ledger says "The board waited for you: smog at 96%".
    - **Content:** base cap **8 h** (a night) from the start; 12 h (Civil Service) and 24 h (a Treaty Article) as planned.

11. **Know-how respec between runs.** *(G§7: permanent forks become guide-slop.)*
    - **Contract:** `ModelApi.respecKnowhow(state, content): GameState`, allowed only while `freshRun`. It refunds all
      Hindsight spent on Know-how, at a cost of `GlobalParams.respecCost?: number` (a fraction refunded, default 1 =
      free) or free once per Reckoning.
    - Keep run forks (P7) irreversible within a run; they are the drama.
    - **Lanes:** M2 contract and core; UI S.

12. **Turn the restraint timer into a decision cadence.** *(G§15: "after 2–3 days you're not really making new
    decisions"; G§8.)*
    - Each decade within budget currently pays fixed `decadeEffects`. Make each decade offer **a choice of two
      dividends**, for example "+1 seat this run" or "+10% Commons yield". A 50-year streak then means five decisions,
      not 17 minutes of watching a line.
    - **Contract:** `steady.decadeChoices?: EffectDef[][]` and `ModelApi.chooseDecadeDividend(state, content, sector,
      index)`. Or fold it into `DispatchDef` in M3.
    - **Lanes:** M2 contract, core and content.

13. **Change the M2 exit criterion.** *(G§2.)* "No stretch of more than 10 minutes with nothing to buy or decide"
    becomes:
    - ≤ **3 min** of active play without a purchase or decision in hour 1;
    - ≤ **5 min** in hours 1–10;
    - longer only while the player can leave (idle, offline-safe).

    **Lane:** roadmap.

14. **Rules for Histories (P12) before any are written.** *(G§12, G§15: "challenges, then infinity challenges, then
    eternity challenges … permanently loses me"; "locking QoL and automation behind challenges".)*
    - Rewards are options: a Commons project, a cosmetic, an achievement, a record. Never a power multiplier needed to
      progress.
    - No QoL or automation is ever locked behind a History.
    - The History ladder (P19) is post-game only, and capped (30 rungs, no "History challenges").
    - Every History is completable without a guide: the balancer must clear it with a generic `budget` strategy within
      2× the median time.

    **Lane:** roadmap M3, M3 content brief.

15. **Ship an ending at the stop-and-look point.** *(G§13: Spaceplan, Paperclips and Antimatter Dimensions end;
    Synergism's broken promise.)*
    - M3 is billed as "a complete, good, medium-length game (about 20 hours)" but its first ending is in M4 (Act I
      finale) or M7 (true ending).
    - Move a real ending into M3: Steady State with every open Industry decoupling, which v1 already has as
      `flags.won`. It gets a credits card, a retrospective Gazette, and the line "The ledger continues".
    - **Lane:** roadmap M3, content and UI.

16. **Novelty every ≤ 2 active hours through hour 20.** *(G§5, G§15.)*
    - long-game.md's Light & Current phase spans active hours 7–13 with one mechanic.
    - Put a beat in the middle: gas against electric as an in-run fork at about hour 9, then the first five Histories at
      about hour 10, then Light Settlement.
    - Add a table column "new thing this phase" and test it in the balancer as "time between unlocks ≤ 2 h for the
      `budget` strategy".

    **Lane:** long-game structure, M3 balance.

17. **The red line must not depend on colour.** *(G§17.)*
    - Projection lines carry a word as well as a colour: "This decade: **more** coal, +8%" / "**less** coal, −3%".
    - Backfire carries a glyph (▲) as well as the glow.
    - Run a deuteranopia filter in `tools/shot.mjs`.

    **Lane:** M1 UI if cheap; otherwise M2.

### Later (M4+)

18. **Banked time as an option to offline.** *(G§8: "simulate gains at your own pace".)* Offline time over the cap
    becomes a bank the player can spend at 2× speed. Pure core: `fastForward` already exists. **Contract:**
    `MetaState.bankedSeconds`.
19. **PWA manifest and service worker** for true offline play and Home Screen install, which also earns `persist()` on
    Safari more often. Size M. **Lane:** UI and build.
20. **Run history.** `MetaState.runs?: RunSummary[]` (last 20) for statistics and records (P17). **Contract** S.

---

## 3. Pacing table

Times are cumulative **active** play for an attentive first-time player, except where wall time is given.
"Benchmarks" draws on genre.md. **[U]** marks a benchmark I could not verify against a primary source.

| Milestone | Our plan says | Live v1 (playtest / critique) | Recommended | Benchmarks behind the recommendation |
|---|---|---|---|---|
| First purchase | 30–60 s | 26 s | **15–40 s** | Cookie Clicker's first Cursor < 10 s [U]; Paperclips' first autoclipper about 1 min [U]; "slow first purchase undercuts the promise" (G§4) |
| First new verb (found an application) | 1–2 min | 1:24 | **1–2 min** (keep) | A Dark Room's builder in 1–2 min [U] |
| Purchases or decisions in the first 10 min | none | 7 | **≥ 12** | Practitioner cadence 10–30 s early (G§2) [U] |
| Longest gap, first 15 min | none | 132 s | **≤ 90 s** | Rajan "cut lulls" (G§4) |
| First anomaly (efficiency raises use) | 0:40 | never (use fell) | **≤ 1:00** | Case: the guess before the answer (G§19) |
| The big promise backfires (condenser) | 4–6 min | 3:27, use fell | **4–6 min**, R ×2 within 2 min | — |
| The reveal | 9–12 min | not reached by the bot (available from 3:27) | **8–12 min** | Paperclips' first stage change within the first quarter-hour [U]; GameAnalytics "value clear in 5–15 min" |
| First spend of a second currency (Mandate on a lever) | 12 min | — (Mandate idle from 1:24) | **10–14 min**; Mandate hidden until then | G§2 |
| First crisis | 14–20 min | about 8 min (Mandate spike) | **14–20 min** | — |
| First decade within budget | 20 min | — | **18–25 min** | First "restraint payout" inside the first session |
| First prestige (run 1 end) | 30–45 min | 50 min collapse (critique); offered at 10 min | **30–45 min**; not offered before the reveal | Realm Grinder's first abdication < 1 h [U]; Pecorella's worked example 120 min; short-loop games 10–30 min (G§6) |
| Run 2 reaches the condenser | 2× faster | — | **2× faster**, plus a new thing within 5 min | "NG+ slower than run 1" complaint (G§6) |
| First automation | Run 2, the Market (about 45–60 min) | none | **45–75 min** (keep) | Antimatter Dimensions' autobuyers after the first challenges, hours [U]; Paperclips automates clicking at once |
| Second Industry (Light) | Runs 2–3 (about 1–1.5 h) | never opened under restraint (critique C-5) | **≤ 1.5 h** for both strategies | — |
| First Steady State | about hour 4 (budget play) | unreachable | **3–4 h** | Restraint's first big payoff must precede the hour-5 drop-off |
| First Settlement | 5–7 h | — | **4–6 h** | — |
| A new mechanic or system | about every 2–6 h (long-game.md table) | — | **every ≤ 2 h** to hour 20 | G§15 |
| First ending (credits card) | about 110–120 h (true ending) | v1 `flags.won` | **15–20 h** (an Act I / M3 ending), the true ending later | Spaceplan 5–6 h, Paperclips about 6–12 h, A Dark Room 2–5 h [U]; AD's definitive end |
| Second prestige layer (Treaty) | 16 h active, 45 h wall | — | **14–20 h** (keep) | Second layers in long games commonly arrive at 10–30 h [U] |
| Ten-hour checkpoint | M2 exit: 10 h across five Industries for `budget` | about 4–8 h of content (critique C-13) | 10 h; no active gap > 5 min | — |

---

## 4. QoL checklist (what veterans expect)

"Have" means in v1 or the M1 UI brief. Sizes: S ≤ 1 day, M 2–4 days, L a week or more.

| Feature | State | Size | Note |
|---|---|---|---|
| Autosave (10 s, on hide and on pagehide) | Have | — | `briefs/ui.md` |
| Export and import save (text and file) | Have | — | File download allowed since the move to Pages |
| Hard reset with in-page confirm | Have | — | Make it two steps (type "RESET" or hold) |
| Offline catch-up from wall-clock time | Have | — | `fastForward`, 5 s steps |
| "While you were away" note | Have (basic) · Planned (ledger, M2) | M | Must say what was *held* (rec. 10) |
| Correct background-tab behaviour | Have | — | Catch-up via `fastForward`, not timers |
| Run summary at each Reckoning | Have | — | The efficiency against use bars |
| Lifetime and run statistics | Have (basic) | S | Add run history (rec. 20) |
| Achievements, with hidden ones | Have (5) · Planned (25 / 50 / 150) | M | |
| Formula sheet behind every number | Have | — | Better than most of the genre |
| In-game "How it works" | Have | — | |
| Owned cards collapse | Have | — | |
| Reduced motion | Have | — | |
| Keyboard focus visible | Have | — | |
| Affordable indicator on the first screen and on tabs | **Missing** | S | Rec. 6 |
| Buy max / bulk | Partly N/A | S | Cards are one-off. Needed for the repeatable growth card (rec. 2), the prospect, and lever Tighten |
| Hold-to-buy on touch | **Missing** | S | For repeatables |
| Hotkeys (desktop) | **Missing** | S | Rec. 8 |
| Number notation choice | **Missing** | S | `fmt` is fixed |
| Confirm on irreversible choices (fork, redraw budget) | Planned (redraw) · **Missing** (fork) | S | |
| Backup save on Reckoning | **Missing** | S | Rec. 7 |
| `storage.persist()` and Home Screen nudge | **Missing** | S | Rec. 7 |
| Export reminder | **Missing** | S | Rec. 7 |
| Text size option | **Missing** | S | Rec. 8 |
| Colour-independent signals | Partial | S | Rec. 17 |
| Screen-reader live region for headlines and the offline ledger | **Missing** | S | |
| Animation and update-rate setting (battery) | **Missing** | S | Drop to 2 Hz when nothing visible changes |
| Know-how respec | **Missing** | M | Rec. 11 (contract) |
| Offline that never collapses a run unseen | **Missing** | M | Rec. 10 (contract) |
| Offline cap ≥ one night from the start | **Missing** (4 h) | S | Content number: 8 h |
| Automation of the previous layer | Planned (M2) | M | P11 |
| PWA, works offline | **Missing** | M | Rec. 19 |
| Performance over many-hour sessions | Planned (budget in long-game.md) | M | Add a 4-hour soak to the Playwright script: heap and frame time |
| No account, no server | Have | — | Keep |

---

## 5. The three biggest risks of losing a genre veteran

1. **Hour 1–2: "the joke lands once".** By minute 12 the veteran has understood the paradox. Run 2 in M1 offers:
   - a loadout of two seats;
   - a Know-how fork;
   - the same Steam with the same one-off cards.

   Settlement, the Commons, dispatches and Era mechanics are M2–M3. If run 2 is run 1 with a +15% η node, a veteran
   who got the joke has no game left, and message games are especially exposed because the message *is* the novelty.

   *Mitigation:* recs 2, 9b, 11 and 16. Pull one M2/M3 item into M1 if any is cheap: P16's revivals are content-only,
   and two Steam dispatches could be written as forks.

2. **Hours 4–10: restraint feels like a timewall.** The restraint loop is: draw a line, raise levers, hold for 50 model
   years (about 17 real minutes per Industry), then settle. Holding a line is waiting unless there are decisions inside
   it. The genre's evidence is blunt: waiting with no new decisions is why people quit CIFI, Ouro and Synergism. In a
   message game, the risk is that the *right* play is the boring one. That would teach the opposite of the thesis, and
   it would read as a morality tax.

   *Mitigation:* recs 12 and 13, the Commons (P6) as the active sink, and Mandate kept scarce (critique C-16).

3. **Hours 20–60: replay and challenge fatigue.** Three things arrive together:
   - the Treaty replays Act I;
   - Histories and the History ladder are challenge layers;
   - permanent Know-how forks and a 6-region World on a phone screen.

   This is the exact profile of the 2026 "guide-slop" complaint: one correct build, challenges on challenges, weeks of
   focused runs. Add the promise of an ending at about 120 active hours, and the Synergism failure becomes possible.

   *Mitigation:* recs 11, 14 and 15, the D2 target (Act I replay ≤ 15 min), and keeping the World to one neighbour until
   it is proven fun.

**At every hour: a lost save.** An iPhone player who does not open Safari's tab for a week can lose everything.
Rec. 7 is cheap; do it in M1.

---

## 6. Where to ignore the genre's received wisdom, deliberately

1. **"Prestige should make the next run faster."** Know-how makes the next run faster *and hit the wall sooner*. That is
   the paradox one level up and the best idea in DESIGN.md. Keep it.
   - Make the slower, richer path (Institutions, Settlement) pay more Hindsight per minute from run 3, as D1 already
     says.
   - Say so on the node.
   - The genre complaint ("NG+ slower than run 1") is answered by giving the player the choice, not by removing it.

2. **"Numbers must always go up."** The winning play makes the headline number (coal per second) go *down* while
   another goes up: wellbeing per ton, decades in the ledger, coal left in the ground. Give the second set of numbers the
   celebration the genre gives the first: the decade tick, the ledger, the Gazette.

3. **"Automate everything evenly."** Automating efficiency first and cheaply (the Market), and restraint late and dear
   (the Civil Service), is the argument (pillar 3). Veterans will ask for auto-levers early. The answer is "yes, at hour
   5, through an Institution", not "yes, now".

4. **"Offline should always pay a windfall."** In a backfire run, time away makes things worse. Do not fake a windfall.
   - Make the return honest: a ledger of what grew and what was held (rec. 10).
   - Never let offline time end a run unseen.

5. **"No strategy should dominate."** From run 3, decoupling *should* dominate backfire. That is the thesis (D1). What
   must not dominate is any single *way* of decoupling.
   - The balancer's fork audit (±10%) and the History rules (rec. 14) keep several routes open: cap, duty, sufficiency
     or Commons.

6. **"Juice every number."** The dry broadsheet is the tone. Follow Paperclips' silence: mark changes of state (a decade
   ticked, a seam sunk, the reveal), never every tick.

7. **"Endless is better for retention."** The argument needs an end state that can be reached: Steady State, Daybreak's
   lesson, Fate of the World's warning. Ship endings (rec. 15). The post-game is optional and says so.

8. **"Hide the optimal path; let players discover it."** For the *rule*, yes: the reveal must be discovered. For the
   *instruments*, no. The formula sheet, the decade line and "brings within reach" deliberately show the player the
   model. The game is about reading the system, not guessing it, which is also the cure for guide-slop.
