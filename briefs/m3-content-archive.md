# Brief: M3 CONTENT — the Archive, the Proprietor's Day, "Enough", the first ending

You write the long-form, sourced and reflective text of "Rebound" M3: 75 Archive notes, the Proprietor's Day (pamphlet,
research card text, 12 return templates, the withdrawal line), eight "Enough" achievements and the achievements M3 needs,
and the first ending's credits and retrospective templates. Other lanes work from the same contract and do not talk to
you: core, content-mechanics (owns the registry `src/content/index.ts`, the lint `content.test.ts`, and the Industry
files, where the Proprietor's Day card itself lives), content-dispatches, UI, scene, audio; balance comes after.

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`.

## Standing instructions

- You will be interrupted by container restarts and usage limits. Keep a progress note at
  `design/scratch/m3-archive-progress.md`, update it after every few notes, and land one verified file at a time.
- Make no git writes; the coordinator commits.

## Read first, in full

1. `src/types.ts`: `ArchiveDef`, `ProprietorText`, `EndingText`, `HouseholdFigures`, `SurveyView`, `FiledReturn`,
   `ModelApi.fileReturn` and `withdrawReturn`, `MetaState.milestones` (its keys), `AchievementDef`, the Cond leaves
   `returned` and `answered`, the new StatKeys.
2. `design/m3-contract-notes.md` §0, §5, §6, §7.
3. `design/paradigm-shifts.md` shift 3 in full ("The Proprietor's Day", "Dry, never scolding", "What the player can do
   about it"); `design/style-guide.md`, every line; P17 in `design/proposals.md`; D4 and D6 in `design/roadmap.md`.
4. The research dossiers (`design/research/*.md`), the source of every fact you print.

## Your files (only these)

- `src/content/archive/<industry>.ts` and `archive/general.ts`, `archive/index.ts` (exports `archive: ArchiveDef[]`,
  concatenated in a fixed order).
- `src/content/proprietor.ts` (exports `proprietor: ProprietorText`).
- `src/content/ending.ts` (exports `ending: EndingText`).
- `src/content/achievements.ts` (append; never reorder the existing list).
- Tell the content-mechanics lane in your report what to import, and give it the Proprietor's Day CARD's text (name,
  blurb) to place in Steam's (or a general) card list with `kind: 'research'`, `when` and `effects: [{ type: 'metaFlag',
  flag: 'proprietor' }]` — specify the `when` you want (default below).

## Work

### 1. Seventy-five Archive notes

The real history behind a card, lever, Commons project, seam, application, dispatch, History, Charter, cast member's
real counterpart (none: the cast is fictional; skip), or Industry. Spread: Steam 20, Light 16, Motion 14, Compute 10,
Code 7, general 8 (the economists, the Reckoning's pamphlet, the cartel, restraint that worked). Each: `subject` (an id
that exists; check `src/content/**`), `title` ("The separate condenser, 1769"), `text` 60–160 words in the paper's
archive voice (it may be more expository than a headline, never a sermon; the game never lectures, and the Archive
is where the history lives so play does not have to), `date`, and `sources` with at least one entry: `cite` (author,
title, year, page or section), `url` if any, `grade` 'V' (verified against a primary or scholarly source) or 'S'.
Facts only from the dossiers where marked [V] (or [S], graded 'S'), or verified by you with the source recorded. Never
an [unverified] figure. Dark history acknowledged where it belongs, plainly (D4). The Archive opens quietly at the first
Reckoning (feature `archive`); notes unlock as their subjects are first owned or seen, so put a few notes on run-1
subjects (the first cards, pumping, the condenser, the Coal Question) so the viewer is not empty when it opens.

### 2. The Proprietor's Day (`proprietor.ts`)

- **The card** (text for the mechanics lane): "The Proprietor's Day", a research card that asks and does not answer;
  `when`: `{ all: [{ returned: 'household', figure: 'sessionsBefore', op: '>=', value: 3 }, { returned: 'household',
  figure: 'sessionsAfter', op: '>=', value: 3 }, { not: { flag: 'proprietor' } }] }`. It lands about hour 7 (feature
  `survey` opens the return filer at about hour 6–7).
- **The pamphlet**: from Miss Whitlow (cast id `missWhitlow`, the dispatches lane adds her CastDef): "Why does the
  labour-saving machine save no labour?" in her voice; `headline` ≤ 70, `body` ≤ 400; it asks, it does not answer.
- **Twelve return templates**: at least three per direction ('up', 'down', 'flat'), the rest as you see fit, in the
  Statistics Office's voice: "HOUSEHOLD SURVEY. Since the Market was automated the proprietor has taken
  {decisionsAfter} decisions an hour, up from {decisionsBefore}, over a working day lengthened by {workdayChange} per
  cent…". The paper says "the proprietor", never "you"; it never scolds, nudges, praises or counts streaks; if the
  figures went down it says so in the same tone ("…shortened by {workdayChange} per cent. The Office is as surprised as
  anyone."). Headlines ≤ 70; bodies ≤ 400. Placeholders are exactly those listed on `ProprietorText`.
- **The withdrawal line**: "The Household Survey is discontinued for want of funding" (or better), ≤ 70.

### 3. Achievements (`achievements.ts`)

- Eight **"Enough"** achievements (shift 3: sufficiency of play), each paying nothing but its badge (History rules
  apply: never power). Expressible ones, e.g.: Steady State in a run with fewer than 100 decisions (`steadySectors ≥ 1`
  and `decisions < 100`); an Industry settled without the Market buying anything that run (`automated < 1`); a run
  ended by choice under 200 decisions with five decades; "A Week of Sundays": `{ returned: 'household', figure:
  'quietDays', op: '>=', value: 7 }` with every Industry settled; a dispatch arc declined throughout; a History cleared
  under N decisions. Title Case names; past-tense ledger blurbs.
- A few M3 achievements: first seam sunk; a load factor above 0.8; the hour a day held while miles doubled; the first
  ending; a History cleared; a lever that never bit (paired from the start).

### 4. The first ending (`ending.ts`)

- **Credits**: a title, 8–15 short lines (who made it is not needed: the credits are the game's argument closing, in
  the paper's voice), and `continueLabel` "The ledger continues".
- **Retrospective templates**: one per milestone key (MetaState.milestones: 'reveal', 'backfire:*', 'sectorOpened:*',
  'decade', 'clearSkies:*', 'steady:*', 'settled:*', 'seam:*', 'dispatch', 'history', 'proprietor', 'won'), each a
  headline ≤ 70 with `{year}`, `{run}`, `{hours}`, `{sector}`: the player's own history as a retrospective Gazette
  ("{year}: the engines doubled; the coal bill trebled").

## Checks

```
bunx tsc -p .
bun test src/content     # once wired by the mechanics lane
```

## Exit criteria (yours)

- 75 Archive notes, every one with a source and a resolving subject, every fact traceable; the Proprietor's Day text
  complete with all three directions; eight "Enough" achievements plus the M3 ones; credits and a template per milestone
  key. All text obeys the style guide.

## Final report (concise)

Files and export names; note counts per Industry and per subject kind; facts you verified yourself (with sources) and
any you dropped; the card's text and `when` for the mechanics lane; contract gaps.
