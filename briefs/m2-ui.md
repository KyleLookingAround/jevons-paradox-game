# Brief: M2 UI lane

You bring the interface of "Rebound" up to the M2 contract ("Restraint has a game; run 2 is different"). Four other
lanes work at the same time and do not talk to you:

- core (`src/core/**`, `tools/balance.ts`);
- content (`src/content/**`);
- scene (`src/ui/scene/**`, `tools/scene-demo.ts`, `tools/scene-shot.mjs`);
- balance, afterwards.

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`. The scene is
theirs: you call `createScene`, `sceneViewFrom` and the scene handle's methods, and report what you need from them.

## Read first, in full

1. `src/types.ts`, the binding contract (search "M2"). You read `Derived`, `SectorDerived`, the views, `GameState`
   (`pendingDividends`, `events`, `lastOffline`, `commons`), `MetaState` (`runs`, `orders`, `charter`) and `Content`,
   and call `ModelApi`.
2. `design/m2-contract-notes.md`.
3. `CLAUDE.md`, `briefs/ui.md` (hosting and quality rules) and `briefs/m1-ui.md` (what M1 built).
4. The M2 section of `design/roadmap.md`; "Idle, automation and the phone" in `design/long-game.md`; shift 3 in
   `design/paradigm-shifts.md` ("What is measured", "Privacy, idle and offline"); recs 10–13 and the QoL table of
   `design/genre-audit.md`; owner decision D6 at the end of the roadmap.

## Your files (only these)

`src/ui/*.ts` (everything in `src/ui/` except the `scene/` folder), `src/main.ts`, `src/styles.css`, `index.html`,
`tools/shot.mjs`, `tools/perf.mjs`. New panels go in new files (for example `src/ui/commons.ts`, `src/ui/orders.ts`,
`src/ui/dividends.ts`, `src/ui/ledger.ts`, `src/ui/playledger.ts`); `src/ui/app.ts` is the registry you own.

## The rule

The UI holds no game rules. Everything below has a field: use it, never recompute it.

| Use | Instead of |
|---|---|
| `SectorDerived.decadeWellbeing`, `decoupling`, `leanDecades` | comparing wellbeing with w0 yourself |
| `SectorDerived.clear`, `clearP`, `sinkR`, `clearYears`, `sinkHeld`, `history[i].sink` | pressure arithmetic, the sink line |
| `SectorDerived.pace`, content `steady.paces` (the sector's own list wins over the global one; else one implicit Gentle) | guessing the slope |
| `GameState.pendingDividends` (`options`, `mul`) and `Content.dividends` | which pair is due |
| `SectorDerived.settled`, `canSettle`, `settleExcess`, `settleDefence` | Settlement rules |
| `commonsViews`, `Derived.commons` | Commons costs, yields, availability |
| `Derived.orders` (`available`, resolved `sectors`, `paybackChoices`, `nextTickIn`) | when the Market may act |
| `Derived.charterOffer`, `Derived.charter`, `Content.charters` | drawing Charters |
| `GameState.lastOffline` | diffing states around a catch-up |
| `Derived.respec` | refund arithmetic |
| `LeverView.recycleChoices` | recycle wording and availability |
| `GameState.events` (seq) | diffing views to detect founding, crises, decades… |
| `model.yearAt(state, content, t)` | converting run time to a year |
| `SectorDerived.standingDrawIn` | "years until the standing cap draws its line" |
| `Derived.populationRef`, `Derived.offlineCapSeconds` | scaling and caps |
| `unitSingular` (default `unit`) | pluralising |

If you need a number that is not there, report it; do not compute a game rule.

## Work

1. **The decade, honestly labelled.** Under the gauges: "Within budget · 7 of 10 years to the next decade" now reads
   against `decadeWellbeing` ("wellbeing at least 20.4, the day the line was drawn"). The ledger marks lean decades
   ("1840s ✓ lean") and full ones; a line under it says lean decades pay a dividend and full ones pay Hindsight too.
2. **The sink line.** Draw `history[i].sink` on the sparkline as a second dashed line in its own style (label "the
   sink"), with the budget line declining towards it. For Code (`sinkR` null), mark `clearP` on the pressure gauge
   instead and say "deleted down, not absorbed". Show the Steady streak ("Clear skies: 12 of 50 years") from
   `clearYears`; before `clear`, say how far pressure is above `clearP`.
3. **The pace choice.** "Draw the line" opens a three-way choice (the sector's paces: name, `declinePerDecade` as "5%
   a decade", `dividendMul` as "dividend ×1.6", blurb). Redrawing confirms ("resets both streaks; decades are kept").
4. **The dividend card.** When `pendingDividends` is non-empty, a card (not a modal; it never blocks play) shows the
   oldest offer: the two `DividendDef`s with names, blurbs and their one-off amounts × `mul`; tapping one calls
   `chooseDecadeDividend(sector, 0|1)`. A count badge if more wait; a line saying offers left waiting are taken as the
   first option when more than eight pile up.
5. **The settled row and the Settle ceremony.** When `canSettle`, a "Settle" button on the Industry; confirming shows a
   ceremony card (`settle.blurb`, the dividend, "levers are retired; the Industry is held by Mandate when the world
   grows into it"). A settled Industry collapses to a quiet row: frozen figures, "held since 1840" (`yearAt(since)`), the
   excess and the defence per second, and "Unsettle" with a confirm naming what is lost.
6. **The Commons panel** (only while `Derived.commons.available`): projects grouped by Industry (`def.sector`; general
   ones apart), each with cost (fund first: "from the Commons fund"), Mandate cost, wellbeing now and next, the
   intensity it adds, and its blurb's rebound. The fund's balance at the top. `'commons'` appears in each duty and cap
   lever's recycle toggle via `recycleChoices` (disabled with a reason while unavailable).
7. **The orders panel.** The Market: on/off, a payback choice from `paybackChoices` ("buys what pays back within 2
   minutes"), a switch per open Industry; a line under it from `nextTickIn`. The Civil Service and Treasury rules when
   available: choose levers per Industry (Civil Service) and a priority list of projects plus "keep N seconds of income"
   (Treasury). Unavailable orders show what unlocks them (the Institution's name, from content). Changes call
   `setOrders` with a patch.
8. **The Charter choice** on the Reckoning screen, before "Begin the next run": two cards from `charterOffer` (name,
   blurb, the Industry), with "none" as a quiet third option; `chooseCharter`. The chosen Charter is named in the run's
   header thereafter.
9. **"While you were away".** On load and on return from a hidden tab, after `fastForward`, show the ledger from
   `lastOffline`: time simulated (and requested, if capped or held), capital, Mandate and population change, decades
   and dividends waiting, purchases by the Market, Civil Service raises, Treasury purchases, levers that lapsed,
   Industries opened, and per line "held", "broken", "drawn" or "settled". If held: "The board waited for you: smog at
   96%" (the held sector's pressure fraction from `derive`, its pressure name). Dismissed by the player; shown once per
   report (remember `lastOffline.to` locally).
10. **Respec.** In the Know-how shop, "Unlearn" per tree and for all (`Derived.respec.refundByTree`, `refund`), only
    while `allowed`, with a confirm stating the refund. Tree headings use `Content.knowhowTrees` names.
11. **Run history and statistics.** The statistics page lists `meta.runs` (newest first): run number, cause, length,
    year reached, Hindsight, Charter, decades (lean/full), settled, decisions and automated actions; tapping a run
    shows its per-Industry summary (peak use, unburnt, peak pressure). Keep the before-and-after pictures for the scene
    lane (M3); expose nothing scene-specific yourself.
12. **Events.** One consumer in `src/ui/` keeps `lastSeen`, set to `meta.eventSeq` on load, on import and on a new game
    (so nothing in a save is replayed), and dispatches events with seq > lastSeen to the page (toasts for decades,
    Steady State, settled, Industry opened, Age begun; a pulse on the affordable signal for Market purchases) and to the
    scene: call `sceneViewFrom(content, state, derived, sectorId, newEvents)` with the events newer than those you last
    passed (the scene lane adds this optional fifth argument; until both lanes are merged, the one tsc error on that call
    is expected). After a
    catch-up, do not animate every event: the ledger summarises them (`lastOffline.fromSeq`/`toSeq`); advance
    `lastSeen` past them and pass the scene none of them.
13. **Words.** Units via `unitSingular` ("£1.57 per feature", "1 ton", "2 tons"); recycle option wording from
    `recycleChoices`; never "sector" or "era" on screen.
14. **The play ledger (shift 3, owner decision D6).** Begin measuring now, so the M3 reveal has data:
    - Storage: its own `localStorage` key `rebound.playledger` (JSON, versioned), never in the save string and never in
      an export (there is no "include" box in M2). Wrap every access in try/catch; the game works without it.
    - Measures, as defined in `paradigm-shifts.md`: active minutes (page visible and an input in the last 60 s), sessions
      (visible spans separated by ≥ 10 minutes hidden), looks (visibility → visible), days played (local calendar days
      with a session), decisions (sum of `run.decisions` increases observed, and automated actions from
      `run.automated`), and phases (the active-minute mark when each order first became available: read `Derived.orders`).
      Counts and timestamps only.
    - Disclosure from first launch in the settings sheet: "The Statistics Office keeps a household survey on this
      device: minutes played, sessions and decisions. It never leaves the device and is not in your save." With one
      switch, "Close the Household Survey", which deletes the key at once and stops measuring (a flag in your prefs);
      reopening starts empty. Show nothing else of it in M2 (no figures, no reveal: that is M3).
    - Never in the core: the model never sees the ledger in M2.
15. **Phone.** Every new control in thumb reach at 390 × 844; the dividend card and the ledger never cover the gauges;
    affordable signals for Commons and pending dividends on the tab chips.

## Checks

```
bunx tsc -p .     # your files clean (ignore core/content errors until they land)
bun run build.ts
node tools/shot.mjs
node tools/perf.mjs
```

- Update `src/ui/devmock.ts` (M2 shapes: pending dividends, a settled Industry, Commons, orders, a Charter offer, a
  `lastOffline` report, `meta.runs`, events) so `#mock` shows every new panel.
- Screenshots at 390 × 844 and 1280 × 800: the pace choice, the dividend card, the sink line on the sparkline, a settled
  row and the ceremony, the Commons panel, the orders panel, the Charter choice, the return ledger (held and not), the
  respec confirm, the run history, the settings disclosure. Read the PNGs.
- Console clean; `perf.mjs` frame times no worse than M1's.
- Once core and content land, play the real game for one Reckoning and through an 8-hour simulated return, and fix what
  breaks on your side. Extend the Playwright pacing script, if one exists in `tools/`, with run 2's beats (Market on, a
  Charter chosen, a new verb within 5 minutes); run it in small batches.

## Final report (concise)

- Files changed; panels added.
- Every field you lacked and what you did instead (there should be none).
- The events you consume and what each does on the page.
- The play ledger's schema and where the disclosure lives.
- Whether you tested against the real model and content; known rough edges.
