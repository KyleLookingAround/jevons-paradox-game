# QA report: M2 played for real

19 Nov 2026. Independent QA of the live build at https://kylelookingaround.github.io/jevons-paradox-game/ (commit
`cf54b67` on `main`). Played through the page only, at 390×844 with touch emulation and a 4× CPU throttle, with a shorter
pass at 1280×800. Scripts, logs and screenshots: `design/scratch/qa/` (gitignored).

*Work in progress: written as I go.*

## How time was accelerated

Playwright's `context.clock.install({ time })` replaces `Date`, `performance.now`, timers and `requestAnimationFrame` in
the page. The page's loop (`src/ui/game.ts`) ticks the model once per 0.1 s of elapsed frame time, and sends any frame
gap over 5 s through `fastForward` (the offline path). So:

- **"Real ticking, compressed"**: `page.clock.fastForward(1000–4000 ms)` per step, with taps between steps. Each step
  fires one animation frame whose elapsed time is 1–4 s, which the loop spends as 10–40 ordinary `model.tick(0.1)` calls.
  This is identical to active play except that the player can only act between steps (every 1 s of game time for the
  first 5 minutes, 2 s to 15 minutes, 4 s after). About 80× faster than real time at a 4× throttle.
- **"Closed tab"**: a persistent browser profile is closed (pagehide saves and stamps the time) and reopened with the
  clock installed N hours later, so the page's own offline catch-up runs.
- Nothing was bought, raised or changed through `window.rebound`; it was only read.

## Bugs

(severity-ranked list below; being filled in)

## Pacing

## Not reached or not verified

## A player's review
