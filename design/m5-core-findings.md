# M5: what the core lanes' experiments found, and what the coordinator decided (20 Nov 2026)

Every M5 lane reads this before its brief; where it differs from a brief or from `design/m5-design.md`, this wins. The
experiments ran on fixture content (`fixtureM5` in `src/core/fixture.ts`, `src/core/fixture.m5b.ts`); the full tables
are in the core lanes' progress notes (`design/scratch/m5-core-rival-progress.md`, `m5-core-office-progress.md`: local
working files, they may be missing after a container restart).

## Decisions

- The owner's open questions are decided as recommended (`design/m5-open-questions.md`). There are no other players at
  present: saves may be broken where that is cleaner, so long as an old save loads without crashing.
- **Every Motion loophole rung is closed by the fuel duty** ("the price of a mile reaches every category"). Measured:
  standard alone 1.04× the no-lever burn; standard + amendment 0.98× (he moves to the next rung); standard + duty with
  every rung closed by it 0.76–0.87×. Criterion 13 stands as written.
- **The prospectus's "and another every …"** is the mean interval among that card's purchases made before the last
  quoted item's time, not across the whole opening (core: a small follow-up; the text lane writes to that meaning).
- The file card must not claim the Market did most of the buying: measured automated share is 0–9% for the scripted
  players. Word it for any share, including none.

## Numbers the experiments constrain (content lanes: start here, balance tunes after)

- **Pryce needs a repeatable demand card in each chair Industry** or he saturates and causes no crisis. One card at
  demand ×1.15 a level and cost ×1.7 a level gave a first crisis at 24.8 minutes (target 18–35). Cost ×1.3 against
  demand ×1.25 collapses the Industry by minute 6: price the card so its payback at the opening is above his limit.
- **Lobby and litigation prices must sit inside the range of comply costs** (comply ran from 0 to about 90% of a model
  year of the Industry's income), or those answers are never chosen. A duty costs nothing to comply with at enactment;
  the cost grows as efficiency rises.
- **A used rung keeps leaking** after later raises stop offering "evade": the page shows the used rung beside his
  recorded answer. Each rung's exempt application needs `when: { loophole, status: 'used' }`. The duty fixes its
  reference price when enacted, so the order of enactment changes its strength.
- **Inspection:** never inspecting loses every decade (0 against 9 in 100 years); but with two Inspectors on a 5-year
  cooldown and a 7-year quiet period, inspecting on cooldown never finds anything. Findings need more rival Industries
  than the Inspectors can cover inside the quiet period, or a lapse. Target: the first finding lands in Ministry 2.
- **Treasury:** keep `levyShare` at about 0.02 or less (or give caps a dividend recycle), or the steward's permit
  revenue outweighs the tax and abstaining is not the richer chair. `campaignPerMandate` about 0.002 (at 0.05 one
  campaign takes Confidence to 100). Keep `perParliamentWon` small: abstaining paid 0.48× good government in Hindsight
  against a target of at most 0.4, because the abstainer wins every poll.
- **The charge's popularity** must turn positive with revenue to the Treasury: its `after` has to exceed
  `perPriceShare` × the charge's share of the price (about +5 a level on the fixture).
- **Plenty's hidden flow** bites by arithmetic (subsidised drip: water applied −17%, water consumed +28%), but only
  when the main crop is in the saturated regime; with very elastic demand, applied water falls only 2%.
- **Confidence:** on the plain fixture an abstaining government was defeated at about 500 s in one lane's run and won
  six of six in the other's (different weights). Content sets the weights so that the abstainer is safe at the polls
  and poor in Hindsight, the hawk who legislates everything at once is defeated, and the steward wins narrowly.
- The know-how handed to Pryce at Take office makes him cleaner early (near saturation, higher efficiency lowers the
  burn): no collapse before the first poll at any head start tried.

## For the UI

- Ministry, office and Treaty views appear only for content with M5 fields. The answer line's `options` include
  Infinity costs (JSON null). Core tools: `tools/balance.m5.ts`, bots `gov:abstain|steward|humanGov|hawk`.
