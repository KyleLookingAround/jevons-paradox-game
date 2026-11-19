# Brief: M3 CONTENT — the cast, 60 dispatches, 60 ambient templates (and the new headline keys)

You write the broadsheet's characters for "Rebound" M3: a small recurring cast who write to the proprietor, sixty
dispatches with two or three answers each, and sixty ambient headline templates. Several writers may share this brief
(split by Industry: one file each under `dispatches/`); nobody else edits your files. Other lanes work from the same
contract and do not talk to you: core, content-mechanics (owns the registry `src/content/index.ts` and the lint
`content.test.ts`), content-archive, UI, scene, audio; balance comes after.

Do NOT edit their files, `src/types.ts`, `build.ts`, `DESIGN.md`, `CLAUDE.md` or `design/roadmap.md`.

## Standing instructions

- You will be interrupted by container restarts and usage limits. Keep a progress note at
  `design/scratch/m3-dispatches-progress.md` (one per writer if several: `m3-dispatches-<industry>-progress.md`), update
  it after every few dispatches, and land one verified file at a time (it typechecks; lint rules below met).
- Make no git writes; the coordinator commits.

## Read first, in full

1. `src/types.ts`: `CastDef`, `DispatchDef`, `DispatchArm`, `AmbientDef`, the M3 effects (search `/* --- M3`),
   `GameState.dispatch` (how the scheduler picks), the placeholder rules at the top of "M3 CONTENT".
2. `design/m3-contract-notes.md` §0 (the unfolding) and §3.
3. `design/style-guide.md`, every line. P9 and P15 in `design/proposals.md`; the cast list in `design/long-game.md`
   ("Content inventory": Pryce, Whitlow, the Ashworths, Mrs Fenwick, the correspondent, a minister).
4. The research dossiers for facts (`design/research/*.md`): only what is marked verified, or what you verify yourself
   and note in your report.

## Your files (only these)

- `src/content/cast.ts` (exports `cast: CastDef[]`).
- `src/content/dispatches/<industry>.ts` (each exports an array: `steamDispatches`, …), `dispatches/general.ts`, and
  `dispatches/index.ts` (exports `dispatches`, the concatenation in a fixed order: general, then Industries in
  sectorOrder; append, never reorder: content order is the draw's tie-break).
- `src/content/news/ambient.ts` (exports `ambient: AmbientDef[]`) and `src/content/news/fallback.ts` (add arrays for
  the nine new headline keys: `seamSunk`, `biteBack`, `dispatch` and `answered` and `ambient` may be `[]` since their
  text comes from elsewhere, `history`, `return` (may be `[]`), `returnWithdrawn` (may be `[]`), `ending`).
- Tell the content-mechanics lane in your report what to import (the names above); do not edit `index.ts`.

## The unfolding (a design constraint)

Dispatches arrive with feature `dispatches`, in run 2 at 20–30 minutes (about hour 1). Start small and grow:

- **First, one correspondent** (the paper's own correspondent) with simple TWO-armed letters, no costs beyond a one-off
  and no modifiers longer than five minutes. These land in the restraint player's levers-only stretch late in runs 1–2
  (M2.1 moved the budget to run 3): give that player a small, real choice between levers.
- **Then the cast grows, one member at a time**, each with a `when` on their CastDef: Mr Whitlow (the economist, a
  fictional pupil of Jevons) after the budget opens (about run 3); Mrs Fenwick of the Smoke Abatement Society with the
  Commons (about run 4); the Ashworth engineers with the seams or Light's load; Pryce (mill and motor dynasty: always
  wants the cheaper thing) with Motion; a minister for the Age last. Six in all. Three-armed letters only once the
  cast has three members writing.
- Never nag: a letter about every three minutes at most (the scheduler's gap), each expires quietly to a modest default.

## Work

### 1. The cast (`cast.ts`): six members

`id`, `name` (as printed), `role` (one line), `voice` (for writers: tics, what they always want, never shown), `figure`
(scene key: `correspondent`, `whitlow`, `fenwick`, `ashworth`, `pryce`, `minister`), `when`. Fictional people only; real
dead figures appear only in card blurbs, never as cast. Miss Whitlow (the second generation, who writes the Proprietor's
Day pamphlet) is a seventh CastDef that the archive lane's pamphlet names: add her with a `when` that never holds for
ordinary dispatches (`{ flag: 'proprietor' }`) so she writes only the pamphlet and its follow-ups.

### 2. Sixty dispatches

About twelve per Industry (Steam and Light most, Compute and Code fewer since they open later) plus general ones. Each:

- dramatises one named rebound (`rebound` field), in the cast member's voice, in the Industry's own paper's register
  (style guide: Colliery Gazette, Evening Lamp, Motorist, system log, changelog);
- `headline` ≤ 70 characters (sentence case, no full stop, never "you"); `body` ≤ 400 characters, a letter, no
  exclamation marks, no rhetorical questions, no sermon;
- 2 arms (early) or 3; each arm: `label` ≤ 28 characters, imperative; `outcome` one sentence stating what happens;
  `price` (REQUIRED: what it costs, in words); mechanical consequences as `cost`, `effects` (one-offs now, standing for
  the rest of the run) and/or a `modifier` (timed); `reply` a headline ≤ 70 when it makes the paper;
- `defaultArm` the modest one (usually "Note the letter" / "Decline politely"): no `cost`, no standing `effects`
  (lint), at most one-offs and a short modifier, so defaults never compound;
- costs on EVERY arm (P9: no strictly better arm). The balance lane plays random arms; every arm must land within ±10%
  Hindsight per minute of its siblings, so keep effects modest: one-offs of 10–60 s of income or 20–150 Mandate,
  modifiers of 5–15 model years, multipliers 0.85–1.2;
- eligibility: `sector`, `age`, `when` (Conds on stats the scheduler can read; keep them simple and true often enough);
  `once` for letters that would be odd twice; arcs with `next` (a follow-up queued) and the `answered` Cond leaf
  ("Whitlow's pamphlet ignored, then cited, then an institution").
- use the M3 effects where they say what you mean: `resourcePriceMul` (a strike), `intensityMul` (a tall chimney),
  `incomeMul` ("raise the rents"), `costMulOf` (one card cheaper), `forbid` (Parliament suspends a measure, as a
  modifier), `pressureAdd`, `populationMul`. One sombre dispatch is allowed where history demands it (D4); never a joke
  about dark history.
- placeholders: `{sector}` `{resource}` `{service}` `{age}` `{year}` `{cast}` with the case rules (common nouns lower-cased
  mid-sentence; `{cast}` and `{sector}` as written).

### 3. Sixty ambient templates (`news/ambient.ts`)

Minor headlines driven by state, so the paper is alive between events: about ten per Industry plus general. Each has a
`when` (often a stat threshold), optional `stat` for `{value}`, `{pct}` or `{fold}`, a `cooldownYears` if it should be
rare, and 1–3 variants ≤ 70 characters at value 1234.5. Commentary, not instruction: "Coal up a third on the decade;
chairman delighted" (`stat: rFold`). Feature `ambient` opens them in run 2 from minute 5; write early ones that read well
to a new player and later ones that need the budget or Steady State to make sense (gate those by `when`).

### 4. Headline keys (`news/fallback.ts`)

Fallback variants for `seamSunk` ({name} = the seam), `biteBack` ({name} = the lever), `history` ({name}), `ending`
({year}); empty arrays for `dispatch`, `answered`, `ambient`, `return`, `returnWithdrawn`.

## Checks

```
bunx tsc -p .            # your files clean
bun test src/content     # once the mechanics lane has wired your files into index.ts and the lint
```

## Exit criteria (yours)

- Six cast members (plus Miss Whitlow) with `when`s that stage the growth above; sixty dispatches and sixty ambient
  templates meeting every rule; the nine headline keys present.
- Does not crowd the unfolding: no dispatch is eligible before feature `dispatches`; early letters are two-armed with
  one correspondent.

## Final report (concise)

Files and export names for the registry; the cast and when each starts writing; counts per Industry; arcs (`next`
chains); facts used and any you could not verify; lint rules you wish existed; contract gaps.
