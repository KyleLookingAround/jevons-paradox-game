# UI copy notes (from the editor's pass, 19 Nov 2026)

Suggestions only, for whoever owns `src/ui/`. House style is in `design/style-guide.md`. Each line: file, the text as
it stands, the suggested text, and why.

## Must fix (accuracy or a spoiler)

1. `src/ui/sheets.ts:144` (rebound formula note before the reveal)
   - Now: "The engineers promised a saving; the coal merchants report otherwise. Nobody has yet put a figure on the
     difference. Perhaps someone should write a pamphlet."
   - Suggest: "The engineers promised a saving; the coal merchants report otherwise. Nobody has yet put a figure on the
     difference."
   - Why: *The Coal Question* is a book, not a pamphlet (the card no longer says pamphlet), and "Perhaps someone
     should…" winks at the player.
2. `src/ui/sheets.ts` `pendingSheet`, exhausted stand-first
   - Now: "…Every engine in the country is more efficient than it has ever been."
   - Suggest: "…Everything that used it is more efficient than it has ever been."
   - Why: shown for every Industry; "engine" is wrong for Light, Compute and Code.
3. A hard-coded "coal" in a shared string: `text: 'The cap sets the coal; savings became service.'` (the other copy
   already uses `lower(resName)`). Suggest the same template everywhere: "The cap sets the {resource}; the savings
   became service."
4. `src/ui/world.ts:258` toast and `src/ui/scene/engine.ts:816, 844`: "A new use is thinkable: …", "An empty plot, not
   yet thinkable", "Not yet thinkable: wants …". Suggest "Within reach: {name}. Founding it costs £…", "An empty plot",
   "Not yet within reach: wants {service} below £…/{unit}." Why: "within reach" is the canonical term on the cards
   ("Brings … within reach") and in the headlines; "thinkable" is a second name for the same thing.

## Consistency with the content pass

5. Pressure names changed in content: Steam's is now **Smoke** (not Smog: a 1905 word), Light's is **Fog**. The scene
   demo (`src/ui/scene/demo/main.ts:12, 16`) still says 'Smog' and 'Coal smoke'; the dev mock still has
   'Fuel duty escalator' for Steam (now **Coal duty**; the escalator is Motion's, a 1993 term). Worth matching so
   screenshots agree with the game. (`tools/shot.mjs` clicks a mock lever by the text "Fuel duty": change both
   together.)
6. Renamed in content, in case any UI copy or test names them: Steam levers **Smoke abatement**, **Temperance pledge**,
   **Slack recovery**, **Coal duty**; Light levers **Lighting rate**, **Gas allowance**, **Lights out**,
   **Public parks**; Light cards **Incandescent mantle**, **Tungsten filament**, **Rebuild the gasworks**,
   **Penny-slot meter**, **Lamp makers’ cartel**; Motion lever **Walking distance** (was "The 15-minute town", a 2016
   coinage) and use **Commuter towns** (was "Commuting"); Compute card **Power-use certificate**; Code's service
   **Features** (was "Working features", which wrapped the sell button at 360 px); Institution **Standing coal duty**.
7. `src/ui/sheets.ts:245`: "The slow buy. Only seated institutions act." → "The slow buy. Only seated Institutions
   act." (the game's concept, capitalised as on the tab).
8. Mastheads (`src/ui/world.ts:16`) follow the selected tab, but the news list is shared, so a Steam headline can sit
   under CHANGELOG.md. The content now writes each Industry's lines in its own paper (Compute `info:`/`warn:`, Code
   `Added:`/`Fixed:`). Suggest the list show each item's Industry by a small mark, or that the masthead follow the lead
   item's Industry (`news[0].sector`) rather than the tab.
9. `src/ui/app.ts:226` onboarding: "Lancashire, {y}. You have one atmospheric engine and a flooded pit." Good. The
   repeat-run line "Lancashire, {y}, again. The pit is flooded. You know more this time." could be drier: "Lancashire,
   {y}, again. The pit is flooded, and you have read the minutes."

## Smaller

10. Broadsheet empty state `src/ui/world.ts:63`: "Nothing in the papers yet. Give it time." → "Nothing in the papers
    yet." (the second sentence talks to the player).
11. The Reckoning summary row "{n} {unit} burned in all" reads oddly for Code ("hours burned"). Suggest "used in all".
12. "How it works" (`sheets.ts:669`): "c everything else" → "c the cost of everything else (capital, labour)"; and
    "Each Industry runs on its own pair of these" is unclear (pair of what?). Suggest: "Each Industry has its own
    service, resource and prices; an Age is the stretch of the calendar it belongs to."
13. The Jevons quotation in "How it works" is verified (Econlib, ch. VII "Of the Economy of Fuel"). Keep it as is; if
    room allows, the next sentence, "The very contrary is the truth.", completes it.
14. `"Revenue goes" / "To the Treasury" / "As a dividend"` then "0.3% of it becomes Mandate; the rest is general
    taxation." Fine. The dividend sentence now in every duty and cap catch reads "Paid out as a dividend instead, the
    levy is spent, and the population grows on it." so it makes sense whichever option is selected.

## Fields the contract lacks (for the coordinator; do not add to `src/types.ts` from here)

- **Singular unit** (`SectorDef.service.unitOne` or similar), for "£1.57 per feature". The UI already singularises
  naively. Suggested values: Steam `hp`, Light `klm·h`, Motion `veh·mi`, Compute `PFLOP`, Code `feature`.
- **Short service name for the sell button** (optional): not needed now; every "Sell {service}" fits one line at
  360 px after Code's service became "Features" (longest: "Sell vehicle-miles", 18 characters).
