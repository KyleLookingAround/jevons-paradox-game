# ADR-2026-11-20: The content's late text, split from its rules by the build

## Status

Approved (architecture decisions delegated to the coordinating session by the repo owner). Amends
ADR-2026-11-19 (the split build): its "Not reached" section proposed a `ContentText` contract layer for this; this
decision reaches the same split without a contract change. Everything else in that ADR stands.

## Context

M4 registered two more Industries (Iron & Steel, Fishing) with their cards, levers, 138 headlines, 24 letters and the
Board's Survey. The first-paint script grew from 205 to 250.5 KB gzipped and the first paint to 272.2 KB, over the
240 KB budget that CI enforces, so the deploy would fail. The game is meant to grow for five more milestones, nearly
all of it words. Measured: the content is plain data (no functions); its prose, outside the Archive, is about 77 KB of
the main script gzipped; the core and the page are the other ~150 KB. A fresh game's first screen needs the first
Industry's words and little else; the letters, ambient items, other Industries, Histories, Charters, dividends,
Institutions, the ending and the cast's biographies are minutes to hours away.

The core copies some words into the state (headline variants into the news, a letter's headline and reply, the
Survey's headline), and the selection of a variant depends only on how many there are. Saves keep the news's words.

## Options Considered

### Option 1: A `ContentText` contract layer (the earlier proposal)
Content keeps ids and rules; text moves to a table keyed by id; views look words up; `NewsItem` keeps a key and the
page renders the words. **Cons:** a contract change touching the core's headline code, every view that carries words,
the save format (news words) and every content module; a large diff in a hot path for a size problem.

### Option 2: Lazy UI code (sheets, time-lapse, survey) as parts
**Cons:** the parts are not self-contained (they share the page's dom, fmt, ctx and panel helpers), so with classic
scripts each would carry duplicates; at most ~20 KB, and the next Industries' prose would eat it.

### Option 3: The build splits the assembled content value (chosen)
The build imports the assembled `content`, walks it with a fixed rule that picks only strings under keys that hold
words (`blurb`, `body`, `outcome`, `reply`, `label`, `tagline`, `catch`, headline variants…; never ids, kinds, stats or
conditions), and writes the main script's content as a literal with those strings replaced; the strings, in walk
order, are a lazy part. The page puts them back by walking its own copy with the same rule.

## Decision

Option 3.

- **The rule** (`src/content/textsplit.ts`, used by the build, the page and the tests). Kept whole: the first Industry
  in `sectorOrder` (its definition, cards and own headlines: the first screen), names and titles everywhere, the
  unfolding's intros (`features`), Acts, Ages, global paces and the recycle wording, the Survey card's words, and every
  `headline` (dispatch, Proprietor, ending: the core copies them into the news and its name index). Late: the rest of
  the prose. A late headline variant is never blank in the stub: a general headline keeps its first variant and its
  others hold a copy of it; an Industry's own variants hold the general headline of their kind; an ambient item holds
  "From our correspondent". So a news line the core makes before the words arrive is a sentence, and the save never
  keeps an empty one. Every other late string is `''` until the words arrive.
- **What loads when.** First paint: the main script with the stub (~192 KB gz). The part `text` (~58 KB gz) is in the
  service worker's precache with the shell. A save on file waits for it before the game starts (the shell's "stoking
  the engine" line has painted; from the precache it is a few milliseconds; a slow or missing part holds the start six
  seconds at most, then the game carries on with its fallbacks). A fresh game starts at once and asks for it when the
  main thread is first idle after the first paint; on arrival the page forgets what it built from the stub and draws
  again (`ui.reset()`, a full update; letters key their build on `textGen()`). A failed load retries a minute later.
- **Nothing in the simulation can move.** The walk picks strings only; the core reads none of the late keys as a rule
  (variant choice reads only counts, which the stub keeps). `src/content/textsplit.test.ts` runs a scripted player on
  the stub and on the content from a fresh game, the end of run 1 and run 2 with letters, plus an hour away, and
  requires every number, flag and the shape of state, `derive()` and the card and lever views to be identical, and no
  news line made on the stub to be empty. The core's goldens and the balancer read the source content, as before.
- **Fit check.** The page refuses a part whose length does not match its walk (nothing is changed; the fallbacks stay).
  The edition names both files, so they always come from the same build.
- **Fallbacks.** A late string shows as nothing (never `undefined`, never a crash); a letter's body shows "The rest of
  this is still in the post." until its words arrive.
- **`--single`** carries the part inline as inert text, as the other parts. The mock entry, the tests and the balancer
  use the whole content and never load the part (`textReady()` is true where no part is known).

The contract (`src/types.ts`) is unchanged.

## Rationale

The constraint is that the simulation must not notice: a split that only ever touches strings the core does not read as
rules, verified by running the sim on both, cannot change a number, and leaves the core, the save format and every
content module as they are. The rule lives in one function shared by build and page, so the two walks cannot drift; the
order depends only on the shape of the tree, which the literal keeps. Content authors change nothing: a new Industry,
letter or headline lands in the late part by the same rule.

## Consequences and Trade-offs

**Positive:** first paint 272.2 → 213.4 KB gz (main script 250.5 → 191.7) with every M4 word on the site; the next
milestones' prose costs the first paint almost nothing (it goes to the late part, which loads after the first paint);
no contract change.

**Negative / Risks:**
- A returning player's start waits for the part: from the precache a few milliseconds; on a cold load without the
  service worker (a cleared site, a first visit with a save imported later) one more request (~58 KB gz, ~0.4 s on
  slow 4G).
- Code that reads a late field before the part arrives sees `''`. On a fresh game nothing late is on screen in that
  second or two; new code that builds words once must key on `textGen()` (as the letters do) or be built after
  `onText()`.
- The main script's content is a literal: a rule key added to the late list by mistake would blank a rule. The sim
  test catches any that a scripted player exercises, and it also fails if any late string equals an id in the content.
- The fallback headlines are less various until the words arrive (a fresh game's first seconds only).

## The Archive (decided with this)

The Archive's text part grew from 54 to 67.7 KB gz with 46 sourced notes for Iron and Fishing. It is not split further;
its budget goes from 62 to 72 KB. Measured on the real page (Act I save, 4× CPU, slow 4G, cold): the first opening of the
sheet took 711 ms, of which compiling the part is ~9 ms; the rest is the network, once per device. Splitting it by
Industry would save about a third of that download for an Act I player (the Previews' notes), at the cost of a second
part, a loader per group and a sheet that must know which groups its rows need. Instead the page now fetches the part in
idle time as soon as the Archive feature has arrived (hours before most players open it), and the service worker keeps
it: the first opening then waits on nothing.

## The next 20 KB (not done)

What remains in the first paint is the core (~50 KB gz), the content's rules and first-screen words (~39 KB gz), the page
(~100 KB gz) and the stylesheet (~21 KB gz). The cheapest next 20 KB: the sheets that open only on a tap (settings,
the Reckoning summary with the time-lapse, credits and ending, the formula sheets, the Survey card: ~30 KB gz) as one
lazy part. That needs either ES-module splitting (Option 1 of ADR-2026-11-19, which breaks `file://`) or the shared
helpers (`dom`, `fmt`, `ctx`, `panels`) moved behind a handle the part receives at load, so it carries no duplicates.

## Related

- ADR-2026-11-19 (the split build, lazy parts, the service worker, budgets); `build.ts` (the `content-text-split`
  plugin; the `text` part and its budget); `src/content/textsplit.ts` and its test; `src/ui/text.ts`;
  `src/ui/game.ts` (`startGame`: a save waits; `boot`: a fresh game fetches after the first paint); `src/sw.js` (the
  part in the precache).
