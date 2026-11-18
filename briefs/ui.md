# Brief: UI workstream

You build the interface of "Rebound" for a veteran incremental-game player who will mostly play on a phone. Two other
agents work in parallel: the model (src/model.ts, currently a stub that throws; will `export const model: ModelApi`) and
the content (src/content.ts, currently `{}`; will `export const content: Content`). Do NOT edit those files, src/types.ts
or build.ts.

Read first, in full: DESIGN.md (especially "UI direction" and "Arc of a run"), src/types.ts (you read `Derived`,
`UpgradeView`, `LeverView`, `GameState`, `Content` and call `ModelApi` methods — nothing else), and build.ts.

## Your files (only these)

`index.html` (project root; must contain `/*__CSS__*/` inside a <style> and `/*__JS__*/` inside a <script>),
`src/styles.css`, `src/main.ts`, `src/ui/*.ts`, `tools/shot.mjs`. No frameworks or libraries. TypeScript strict;
`tsc -p .` must pass for your files. Build: `bun run build.ts` → dist/index.html.

## Hosting constraints (sandboxed single-file page)

<!DOCTYPE html>; <title>Rebound</title>; everything inline except fonts, which may come from Google Fonts with real
fallback stacks; inline SVG/canvas only, no remote images; no alert/confirm/prompt (build dialogs in the page); no
downloads (save export = textarea + Copy button using navigator.clipboard.writeText inside a click handler in
try/catch, plus a paste-to-import field); every localStorage access in try/catch and the game must run without it;
height:100% on html and body, never 100vh; leave viewport-fit=cover out; visible keyboard focus; respect
prefers-reduced-motion; the body never scrolls sideways at 360px; ≥ 16px side gutters.

## Game loop (src/main.ts)

Load from localStorage key `rebound.save.v1` via model.deserialize (else model.createState(content)). Store a wall-clock
timestamp beside the save (wall-clock lives only in the UI); on load call model.fastForward for the time away and show a
small "While you were away…" note when over 60 s. Tick at a fixed 10 Hz step, accumulating real elapsed time; cap
catch-up at 5 s per frame (longer gaps go through fastForward). Recompute `derive` after each batch of ticks. Call
model.upgradeViews / leverViews at most once a second and after every player action (they run projections). Autosave
every 10 s and on visibilitychange/pagehide. Every state change goes through ModelApi (same reference back = refused).
When derive.pendingReckoning is set, stop ticking and show the Reckoning screen.

Rendering: never rebuild the whole DOM per tick. Build structure once per layout change (era opened, card list
changed, tab switched) and patch text/attributes/styles in place. Buttons must remain the same DOM nodes between
updates so taps always register and scroll position holds.

## Screens (mobile-first single column, max ~720px; two columns allowed ≥ 1000px)

1. Pinned top bar: year (integer), Capital £, income/s; Mandate (hidden until the reveal or mandate > 0); Wellbeing vs
   target. Top bar + gauges together ≤ ~25–30% of a phone screen.
2. THE TWIN GAUGES — the signature element, spend your craft here. For the selected era: **Efficiency** (etaFold,
   "×3.5") and **Consumption** (rFold "×1.7" and R per second in the resource's unit), two instruments that visibly move
   the same way when they "should" oppose. Below: a twin sparkline from state.history (R line emphasised, eta line
   quieter, a faint dashed "promised" line = 1/eta). After the reveal: the REBOUND METER (EraDerived.rebound, 0–200%+),
   e.g. "Rebound 143%", reading "Backfire" with a glow above 100%; before the reveal a blank dial marked "?". Also:
   reserve gauge (reserveFraction, "≈ N min left" when secondsLeft is finite and under 2 h) and a trend arrow for trendR.
   When EraDerived.decoupling: a quiet "Decoupling: N of 50 years" progress line.
3. Era tabs: open eras, plus a locked chip for derive.nextEra (price now vs needed, Reckonings needed). Selecting a tab
   switches gauges, applications, upgrades and levers, and re-themes the page. Warning dot on eras with pressure near a
   crisis or reserve under 15%.
4. Applications: small illustrated vignettes — inline SVG line-art pictograms keyed by ApplicationDef.icon. Draw a
   consistent, charming set for: pump, mill, train, ship, lamp, factory-night, house, sign, van, car, suburb, plane,
   sheet, globe, play, brain, wrench, phone-app, scroll, robots; plus a generic fallback. Each shows name, an adoption
   fill (0–1) that feels like the vignette filling with activity, its demand, and a "Found — £X" button when available
   but not founded (model.foundApp). Unavailable apps: hidden or a "?" silhouette.
   PRESSURE AS WEATHER: haze/smog over the vignette area, density following pressureFraction (CSS layers or a small
   canvas; "clutter"/static for the code era) — not a bar. Only a small text readout ("Smog: heavy").
5. The big manual button: "Sell {service}" with "+£X" (clickFlat + clickSeconds × income); shrinks once income/s is
   ~50× its value. model.click.
6. Upgrades: model.upgradeViews filtered to the selected era, visible, not maxed (owned ones collapse into an "Owned"
   list). Efficiency cards: name, blurb, the PROMISE in large type ("−40% coal per unit of power"), cost, Buy button
   (dimmed with a thin capital/cost progress fill when unaffordable). After the reveal a second line, red when positive,
   green when negative: "Projected total use: +24%". The big promise against the small red line is the game's central
   joke: make it land. Other kinds get a plainer card; the research card "The Coal Question" looks like a pamphlet.
7. Counter-levers (hidden until any lever is visible): name, blurb, the `catch` line, level pips, current and next level
   labels, Mandate cost of the next level, upkeep, raise/lower buttons (model.setLever).
8. The broadsheet: newspaper-styled strip with the latest headline and year, expandable to the last 40. New headlines
   arrive with a subtle animation.
9. Reckoning: (a) "Call a Reckoning" control with an in-page confirmation showing derive.hindsightIfReckonNow;
   (b) when pendingReckoning is set, a full-screen broadsheet card naming the cause ("The seams are spent", "The air
   gives out"…, using the era's resource/pressure names) and a "Face the Reckoning" button → model.reckon;
   (c) then the RUN SUMMARY from meta.lastRun: per era, efficiency gained vs resource used as two bars side by side
   (the screenshot moment), Hindsight gained; (d) then the Hindsight shop.
10. Hindsight shop (also in the menu once meta.reckonings ≥ 1): two sections presented as a choice — "Know-how" (the
    obvious buy) and "Institutions" (the slow buy) — with cost, level, blurb, buy buttons, `requires` respected, balance shown.
11. Menu sheet: achievements (hidden ones "???" until earned), run and lifetime stats, save export/import, hard reset
    with in-page confirmation, a short "How it works" card with R = D(p_s)/η and p_s = p_r/η + c.
12. Formula behind a number: an (i) on the gauges, rebound meter and service price opens a small sheet with the formula
    and live values (η, p_r, c, p_s, D, R). Keep it small.
13. Win: when flags.won first turns true, a Steady State credits card (dismissable; the game continues).
14. Onboarding: no tutorial modals. One line on a fresh game ("Lancashire, 1780. You have one atmospheric engine and a
    flooded pit.") that fades after the first purchase.

## Themes

Tokens (background, surface, ink, muted ink, accent, backfire red, good green, rule colour, display/body/numeric fonts)
switched by an attribute on the root, e.g. data-era="ledger". 'ledger' (Steam): engraved ledger paper, ruled lines,
iron-gall ink, a Victorian display serif. 'gaslight' (Light): evening blue with warm gas-yellow glow, poster lettering.
'chrome' (Motion): mid-century dashboard — cream, teal, chrome, dials, a grotesque face. 'terminal' (Compute): dark,
phosphor green/amber, monospace. 'agentic' (Code): your call, reading as 2026 dev tooling without the purple-gradient
cliché (e.g. pale paper-grey, diff green/red, crisp mono). Each is a deliberate single-look world: set background,
colours and color-scheme explicitly; do not follow the viewer's light/dark preference. tabular-nums on every changing
number. Avoid: Inter/Space Grotesk, purple-blue gradients, emoji as icons, everything centred, one rounded card
everywhere. Two or three Google Fonts families in total, degrading gracefully.

## Numbers

`fmt` helper: up to 1 decimal under 1000; then 1.23k, 4.56M, 7.89B, T, then scientific; £ for money; "×3.5"; signed
percentages with a real minus sign ("+24%", "−60%"); durations "12m 05s". Never render NaN/undefined/Infinity.

## Developing against stubs

Create src/ui/devmock.ts with a tiny fake ModelApi + Content (two eras, a few apps/upgrades/levers, a crude tick). main.ts
uses it ONLY when location.hash is '#mock' or when the real `content.eras` is undefined. Everything else goes through the
real imports. Be defensive: missing optional fields, empty arrays, eras absent from derive.eras, unknown icon keys —
nothing may throw.

## Verify visually

Chrome: /usr/bin/google-chrome. Playwright for Node: require from /opt/npm-tools/node_modules
(`chromium.launch({executablePath:'/usr/bin/google-chrome', args:['--no-sandbox']})`). No network here, so Google Fonts
will not load: make sure fallbacks look acceptable. tools/shot.mjs opens dist/index.html (file://…#mock) at 390×844 and
1280×800, runs a few seconds, clicks the main button and a Buy button, and writes screenshots to shots/. Look at them
(Read the PNGs) for all five themes (give the mock a way to force a theme), fix overlap, clipping and contrast, and
check the console for errors. Before finishing, check whether the real model and content have landed (neither file
contains "STUB"); if both have, build without #mock, screenshot the real game and fix what breaks on your side.

## Final report (concise)

Files written; how the mock is detected; any ModelApi/Derived field you lacked and what you did instead; known rough
edges; whether you tested against the real model and content.
