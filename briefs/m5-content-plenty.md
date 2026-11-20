# Brief: M5 CONTENT — Plenty (the first Industry the player never runs)

You write Plenty to the Industry kit: food, groundwater and nitrogen, with its own mechanic, **hidden flow** (water
applied against water consumed), opened in Ministry 3 under Pryce. Design: `design/m5-design.md` §§6.6, 6.7, 7.3;
contract: `design/m5-contract-notes.md` §§5, 6, 7 and the `M5:` hunks in `src/types.ts`.

Do NOT edit `src/types.ts`, `src/core/**`, `src/ui/**`, other Industries, `build.ts`, `DESIGN.md`, `CLAUDE.md`. No git
writes. Content is data.

## Standing instructions

- Keep `design/scratch/m5-plenty-progress.md`; one verified piece at a time; long runs in the background to
  `design/scratch/m5-plenty/`.
- House style; facts only from `design/research/sectors.md` §§1–2 or checked by you with the source recorded (Plenty's
  dates marked * in the design need checking: centre pivot, drip). Nothing on dark history beyond what D4 allows: the
  Archive may acknowledge the Green Revolution's politics; no famine is a resource or a joke.

## Read first

`design/m5-design.md`; `design/long-game.md` "5. Plenty"; `design/research/sectors.md` §§1, 2; Core B's experiment E6
results (do not tune the return share before them); an existing kit for the shape (`src/content/sectors/iron.ts`).

## Your files

New `src/content/sectors/plenty.ts` (the SectorDef, applications, upgrades, levers, loopholes, pledges, sector
headlines); `src/content/dispatches/plenty.ts` is the text lane's.

## Work

1. **The Industry**: calories; groundwater as a `stock` with a pumping-cost alpha; nitrogen as the pressure;
   `hiddenFlow.returnShare` (start about 0.5); `firstYear` 1909; its Age is the Great Acceleration; unlock: office taken,
   `ministries ≥ 3`, the mid-run window (`time` 25–29 minutes, and no other Industry opened this run).
2. **Applications (six)**: Bread grain · Fertilised fields · Meat & dairy · Irrigated orchards · Air-freighted produce ·
   Biofuels, the last two calendar-dated (`when` on the year). Each reads elastic or saturated (`AppDerived.regime`) at
   some point in a Ministry: tune half-prices so the player sees both.
3. **Upgrades (eight efficiency, three capital, two forks)**: the chain in the design; the irrigation cards carry
   `returnShareMul` < 1 as well as η; at least one card spares water honestly (it saturates a use).
4. **Levers (six)**: abstraction licence (cap, `basis: 'applied'`, ladder: *Unlicensed wells* (amend "Meter every
   well"), then robust `closedBy` the consumption cap); consumption cap (`basis: 'consumed'`, `requires` the Water
   Resources Board); drip subsidy (`subsidy`, `targets` the irrigation cards; catch "Every field uses less water. There
   are more fields."); diet (sufficiency); dryland farming (substitution); water charge (`charge`, `requires:
   ['charge']`, `basis` chosen by two levels or two levers: the lane decides and says why). One lever bites back (the
   subsidy does, by construction; give a second its `sideEffects` only if it is honest).
5. **Pledges (four)**: e.g. "Cheap bread for every table" (binds the fertiliser duty), "Water for the farms" (binds the
   abstraction licence), each with `when: { owns: 'plenty' }`-style gating.
6. **Numbers** (criterion 15): the subsidy at level 2 lowers applied ≥ 10% and raises consumed ≥ 10% within 30 model
   years; a cap on applied holds applied while consumed rises; a cap on consumed holds both.

## Done means

The lint passes (one mechanic, a rebounding lever, a catch on every lever, sector headlines, no "sector"/"era" in player
text); Plenty opens in Ministry 3 for the bots; criterion 15 measured; every knob commented.

## Verified by

`bun test src/content`; the bots from `fixtures/m5/ministry3-plenty.json`; on the real page at 390 × 844 with the scene
lane's `seed` style once landed: both gauges legible, the regime label on each use, the ladder card. `build.ts --check`
after adding prose (prose to the late text part).
