# Brief: M4 TEXT lane — letters, cast, Archive, news, credits

You write the words M4 adds outside the Industry files: three new cast members, thirty letters (twelve of them wagers),
about forty Archive notes, ambient templates for the stock and the order book, the new headline keys' fallbacks, the
Act I credits and retrospective templates, and the one-line notices for saves that meet M4. The design is
`design/m4-design.md` §§3.2, 5.7, 5.8, 7, 8, 12 and §4.4 for Iron's voice.

Do NOT edit `src/types.ts`, `src/core/**`, `src/ui/**`, the Industry files, `index.ts`, `features.ts` or
`content.test.ts`. No git writes.

## Standing instructions

- Keep `design/scratch/m4-content-text-progress.md`; land one batch at a time (a cast member and their letters; then the
  Archive; then news; then the credits).
- House style (`design/style-guide.md`) without exception: no exclamation marks, no rhetorical questions, no moralising
  adjectives, never "you" in a headline, the game never says "I" or "we", curly quotes, British spelling. Real people
  only in card blurbs and Archive notes, and only the dead; the cast is fictional; no real company as a joke.
- Facts in Archive notes only from `design/research/*.md` ([V] or [S]) or the design's checked sources, or checked by
  you, with `sources` filled and graded.

## Your files

- `src/content/cast.ts` (append): `prycePater` (Mr Josiah Pryce, ironmaster at Ravensdale; the founder of the family
  whose company buys the Works in Act II; genial, always for the cheaper thing; `when` Iron open), `tench` (Skipper
  Ewart Tench, Grimsby; proud, practical, trusts catch per trip; `when` Fishing open), `isbister` (Miss Isbister,
  naturalist to the Fishery Board; precise, underfunded, right; `when` Fishing's first crisis). Figures: `pryceElder`,
  `skipper`, `naturalist` (tell the scene lane).
- `src/content/dispatches/iron.ts`, `fishing.ts` (new), and appends to `general.ts` and `ages.ts` for the Act's last
  letters; move the younger Pryce's Motion letters' `when` so they arrive only once Motion is open (they then fall in the
  Preview).
- `src/content/archive/iron.ts`, `fishing.ts` (new) and appends to `general.ts` (the Act I credits note).
- `src/content/news/ambient.ts` and `fallback.ts` (appends): the new HeadlineKeys' fallbacks; about 12 ambient templates
  (catch per trip, the foreign share, the order book's share of Steam's coal, the scar's years).
- `src/content/ending.ts`: Act I credits (title "The Coal Age, settled"; lines; continue label "The ledger continues")
  and retrospective templates for the new milestone keys and for the M3 record ("Everything settled, under the earlier
  rule").

## Work

1. **Thirty letters** as in the design's table (Pryce the elder 8, Tench 7, Isbister 6, existing cast 6, the Minister 3).
   Every arm with a `price`; defaults safe and modest, never a wager; at least **twelve wagers** whose conditions read:
   Steam's headroom under its line, Iron's feed share of Steam's line, a sky clear or not, Mandate in hand, the true
   stock (for Tench and Isbister: the lesson letters). Each wager's `hint` names the condition plainly in the paper's
   words ("Pays if the shoals are as thick as the catch says"); win and lose outcomes are both printed.
2. **Sizes for balance:** write every wager's effects as the design's intent (a win worth roughly 4–8% of the run's
   Hindsight over ten model years, a loss about the same the other way) and note the intent beside the numbers, so the
   balance lane can scale them without changing a word.
3. **Archive (≈ 40)**, including: hot blast and Jevons's Scottish figure; Bessemer's "without fuel" paper; the
   Gilchrist–Thomas process; Huxley's address with his own qualifier; Garstang 1900; Thurstan et al. 2010;
   hyperstability (Harley et al. 2001); the 1992 northern cod moratorium; the 200-mile limits; Iceland's quotas; Zink &
   Geyer on circular rebound; the end of the Coal Age (verify any figure, such as the 1913 peak of British coal output,
   against a source before writing it).
4. **News**: the six Fishing unfolding lines in design §5.7 are the Fishing lane's `intro`/headlines if it wants them;
   offer them. The new keys' fallbacks must read in every Industry's paper.
5. **Save notices**: the one line for saves that meet M4 ("Iron and fish join the Coal Age; Motion and the machines are
   shown in preview"), and the Preview title card line (design §7.4); give them to the UI lane as strings in content
   (agree the place through the coordinator).

## Done means

- The lint passes (dispatch rules including the wager rules, headline and body lengths, banned words, placeholders,
  a graded source on every note).
- `bun run design/scratch/editor-subst.ts` (or its successor) shows every new template reading in every Industry.
- Headlessly, with the core and balance tools: `--dispatch-audit` runs on the new letters (the balance lane tunes them).
- The Act I credits read on the real page at 390 × 844 from the fixture `act1-ending.json` (screenshot checked).

## Final report

The cast and letter list (wagers marked, with their conditions), Archive notes with their sources, anything withheld
for want of a source.
