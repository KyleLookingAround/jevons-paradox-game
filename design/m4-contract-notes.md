# M4 contract notes (proposed)

The proposed M4 changes to `src/types.ts`, for the contract lane to write in one commit at the start of M4 (save
version 5). **Nothing here has been applied**: `src/types.ts` is at save version 4 and is being edited by the M3
finishing agent. Where M3's finish changes a type these notes touch, the contract lane re-reads it first and keeps the
intent. The design is `design/m4-design.md`; the briefs are `briefs/m4-*.md`.

Conventions, as in M3: every hunk additive and marked `M4:` or `/* --- M4 --- */`; nothing existing reordered; every new
field optional with a default that leaves an M3 content object playing exactly as before (the "no fields, no change"
test); one core module per mechanic.

Contents: 1 Acts, the ending and the capstone · 2 Previews · 3 The shared reserve · 4 Feeds (the order book) · 5 The
renewable stock · 6 Foreign fleets · 7 The `quota` lever kind and `settle.requires` · 8 Wager arms · 9 Conditions,
stats, events, headlines · 10 Views · 11 Save v5 · 12 What core implies · 13 Left out.

---

## 1. Acts, the ending and the capstone

### 1.1 Types

```ts
/**
 * M4: an Act (Content.acts): a run of Ages with one ending, after which its Industries are settled for good (the
 * capstone). Acts are in order; the CURRENT act is the first whose ending has not been reached
 * (meta.endings[ending.id] absent), or null once every act's has. Content without `acts` plays as M3 (the first ending
 * is every Industry in sectorOrder settled; no capstone).
 */
export interface ActDef {
  id: string;                 // 'actOne'
  /** On screen: "Act I". */
  name: string;
  /** "The Coal Age". Shown on the Act title card with `name`. */
  title: string;
  /** Ages in this act, in order (each age in at most one act). */
  ages: AgeId[];
  /**
   * The ending: every sector in `sectors` open and settled (a capstone sector counts as settled) at a step's start and
   * end, held GlobalParams.endingYears model years (GameState.steadyYearsAll; see 1.2). Reaching it writes
   * meta.endings[id] and, if `capstone`, meta.capstone (1.3). Absent: this act has no ending (its Industries are never
   * capstoned; a Preview act).
   */
  ending?: { id: string; sectors: SectorId[] };
  /**
   * The capstone (after the ending): every sector in ending.sectors opens settled at the start of every later run.
   *   incomeShare  share of the recorded settled income paid while capstoned, 0–1. Default 0.25.
   *   hindsight    whether capstone sectors count in perSectorReached and perSettledSector. Default false.
   * Absent: no capstone.
   */
  capstone?: { incomeShare?: number; hindsight?: boolean };
  /**
   * M4: this act's own rules are not built yet: its sectors play under Act I's rules and are labelled "Preview"
   * (SectorDerived.preview). Content sets it on Acts II and III in M4; M5 removes it from Act II. Default false.
   */
  preview?: boolean;
}

// Content (M4, optional):
/** M4: the Acts, in order (ActDef). Default: absent (the M3 game: one implicit ending over sectorOrder, no capstone). */
acts?: ActDef[];
```

### 1.2 The ending rule (replaces M3 finish's in `GameState.steadyYearsAll`)

```ts
/**
 * M4 RULE (with Content.acts): let A = the current act (ActDef above). If A has an `ending`, a step counts
 * (steadyYearsAll += the step's model years) when every sector in A.ending.sectors is open and settled (SectorState
 * .settled ≠ null, or capstoned) at the step's start and end; any other step resets it to 0. flags.won is set when
 * steadyYearsAll ≥ endingYears; at that step the core writes meta.endings[A.ending.id] (an EndingRecord), the milestone
 * 'ending:<id>', a 'won' event then an 'ending' event (id = A.ending.id), a 'steadyAll' headline then an 'ending'
 * headline, and (if A.capstone) meta.capstone (1.3). If A has no ending, steadyYearsAll stays 0.
 * Without Content.acts: the M3 (finish) rule, unchanged.
 * flags.won stays true for the rest of the run, as in M3. The NEXT run's current act is the following act.
 */
```

`Derived.ending` keeps its shape, read from the current act: `total` = A.ending.sectors.length; `allOpen`, `settled`,
`next` over A.ending.sectors (in sectorOrder); `reached` / `record` = meta.endings[A.ending.id]. New fields:

```ts
ending: {
  /* …M3 fields… */
  /** M4: the current act's id and name, or null (no acts, or every act's ending reached). */
  act: { id: string; name: string; title: string } | null;
  /** M4: next.need gains 'requires': at Steady State but settle.requires fails (Fishing unsurveyed); see 7.2. */
};
```

`next.need` gains `'requires'` (see 7.2), ordered after `'feature'` and before `'room'`.

### 1.3 The capstone

```ts
/**
 * M4: one capstoned sector's record (MetaState.capstone[s]), taken from its SettledState at the step the act's ending
 * was reached. The per-head service is what persists: at a run's population N the capstone serves
 *   k = min(1, N / N0);  D = D0 × k;  R = R0 × k;  appD[a] = appD0[a] × k;  income = income0 × k × incomeShare
 * and once N > N0 the ordinary settled excess rule applies (SettledState: excess, defence, freeExcess).
 * P, ps, pPre, eta, defect, appAdoption and the M3 snapshots (load, travel, appPriceSeen) are taken as recorded.
 */
export interface CapstoneRecord {
  act: string;                 // ActDef.id
  year: number;                // calendar year the ending was reached (the cartouche: "Settled 1911")
  settled: SettledState;       // as recorded; since/sinceYear are rewritten each run to the run's start
}

// MetaState (M4):
/** M4: capstoned sectors, by id (see CapstoneRecord). Absent = {}. Written once per act, never removed. */
capstone?: Record<SectorId, CapstoneRecord>;

// SectorState (M4):
/**
 * M4: this sector is capstoned this run (opened settled at run start from meta.capstone). Absent = false.
 * A capstoned sector: is open from the run's first step; SectorState.settled is the CapstoneRecord's SettledState with
 * since = 0 and D/R/appD/income scaled as in CapstoneRecord each step; counts as settled for every rule (ending, Cond
 * 'settled', excess, defence, the lapse rule's ordering) EXCEPT that it does not use room (Derived.ending.room,
 * GlobalParams.settleMax), cannot be unsettled by ModelApi.unsettle (refused: same state), and its levers stay hidden.
 */
capstoned?: boolean;
/**
 * M4: a capstoned sector whose defence could not be paid (see "arrears"). Absent = false.
 */
arrears?: boolean;
```

**Arrears** (the lapse rule's last step, changed only for capstoned sectors): when Mandate cannot pay upkeep and no
lever with upkeep is left to drop, the settled sector with the largest defence (ties: sectorOrder) is chosen as now; if
it is capstoned it goes **into arrears** instead of unsettling ('arrears' event, headline). In arrears:

- its defence is not charged;
- its R and D are the settled values × (1 + max(0, excess − freeExcess)) (the excess is served, undefended);
- its pressure is stepped again from P with that R (P += R × intensity × dt; P ×= exp(−absorption × dt); for a
  'depletion' sector, the stock is stepped instead, 5.4), and its wellbeing share uses that pressure;
- it cannot crisis-collapse the run: crises at its crisisAt fire headlines and Mandate as usual, collapse is held at
  0.99 × collapseAt (a capstone never ends a run);
- it leaves arrears on the first step at which Mandate would cover its defence for that step ('arrearsCleared' event);
  its pressure then decays back by absorption (not reset).

Offline: `GlobalParams.offline.holdBefore` 'crisis' and 'collapse' both also hold one step before a capstone goes into
arrears; `OfflineReport.heldBy` gains `'arrears'`.

Hindsight: capstoned sectors are excluded from perSectorReached and perSettledSector unless `capstone.hindsight`; they
count in wellbeing-years and intensity like any sector.

Why a record of the SettledState and a per-head scale: a fresh run starts at population 1; the ending's frozen totals
would give the first minute the ending's whole service (an absurd wellbeing and income spike). Per head, capped at the
recorded totals, the capstone is the settled Coal Age serving whoever lives there.

---

## 2. Previews

```ts
// SectorDerived (M4):
/** M4: this sector's age belongs to an act with `preview` (see ActDef.preview). The page labels it "Preview". It plays
 *  under the ordinary rules; it is never part of an act's ending set. False without Content.acts. */
preview: boolean;
```

Re-gating is **content only**: Motion's, Compute's and Code's `unlock.when` become
`{ all: [ { any: [ { ending: 'actOne', label: 'The Coal Age settled' }, { owns: '<self>' } ] }, …their opening
conditions… ] }`. `{ owns: '<sector id>' }` is already "opened in any run" (`meta.sectorsOpened`), so saves that opened
them keep them with no migration flag; a fresh M4 player meets them after the Act I ending. Their opening conditions
are rewritten by content so they can hold in a run whose Coal Age is capstoned (for instance a run time, and the
previous Preview's service delivered), because a capstoned Light owns no upgrades this run.

---

## 3. The shared reserve (Iron draws Steam's coal)

```ts
// SectorDef (M4):
/**
 * M4: this sector draws its resource from another stock sector's reserve (Iron's coke from Steam's coal). Requires
 * resourceKind 'stock' on both and `resourceStock` naming a sector that has no resourceStock of its own (lint).
 * Then:
 *   - this sector's p_r is the owner's p_r (seams, depletion, resourcePriceMul OF THE OWNER; this sector's own
 *     resourcePriceMul multiplies on top), and its own `reserve`, `alpha`, `basePrice` and `seams` are ignored;
 *   - each step the owner's reserve is drained by R_owner + Σ R of sectors drawing on it (circularity of each applies
 *     to its own draw);
 *   - exhaustion is the owner's ('exhausted' names the owner; RunSummary.causeSector = owner);
 *   - SectorDerived.reserveFraction and secondsLeft of this sector report the owner's;
 *   - a settled drawer drains nothing (as a settled owner: SettledState's simplification).
 * Budget lines stay per sector (this sector's R on its own line). Default: absent (own reserve).
 */
resourceStock?: SectorId;
```

```ts
// SectorDerived (M4), on the OWNER:
/** M4: the owner's drain by source this step, R per second by sector id (own included); null if nothing draws on it. */
drawnBy: Record<SectorId, number> | null;
```

---

## 4. Feeds (the order book)

```ts
// ApplicationDef (M4):
/**
 * M4: inputs. While this application is founded, each target sector's capital cost per unit is multiplied by
 *   f = 1 − (1 − capCostMul) × a,    a = this app's AppDerived.adoption (0–1) in the same solve
 * `sector` is a sector id, or '*' for every OTHER open sector (not this app's own). Several feeds into one sector
 * multiply. A feed acts only while both are open; a SETTLED source feeds its settled adoption (SettledState.appAdoption);
 * a settled target is not solved, so it is not fed. The factor joins c before `load`'s c_eff (c_eff multiplies whatever
 * c results). Solve order: a feed is an edge source → target in contentIndex's topological order, beside spill and
 * drawsOn ('*' expands to every other sector); the lint refuses a cycle. The shadow solve of the TARGET sees the same
 * factor (it is not efficiency of the target, so it is not frozen out): the target's rebound meter stays its own direct
 * rebound, and the feed shows in its frontierFold, as spill does. Default: none.
 */
feeds?: { sector: SectorId | '*'; capCostMul: number }[];
```

```ts
// SectorDerived (M4), on the SOURCE (Iron):
/**
 * M4: the order book: per target sector currently fed, the combined factor and what the feeds add to the target's R.
 *   factor   Π f over this sector's feeding apps into that target (≤ 1).
 *   rAdded   target R now − target R solved with this sector's feeds removed (same state, no time), per second; ≥ 0
 *            normally. Computed at most once per derive bucket (as M3's temptation views), null in projections.
 *   lineShare rAdded / target budgetR when the target has a budget line, else null.
 */
feeds: { to: SectorId; factor: number; rAdded: number | null; lineShare: number | null }[] | null;

// AppDerived (M4):
/** M4: this app's feeds as factors now (target id → f), or null if it has none. */
feeds: Record<SectorId, number> | null;
```

`UpgradeView.wantedChange` (M3) already prints "what this adds to the line"; for an Iron application card the
temptation view adds the fed Industries' R change (core: `temptation.ts`). No new view field.

---

## 5. The renewable stock (Fishing)

### 5.1 Types

```ts
// SectorDef.resourceKind (M4): 'stock' | 'flow' | 'renewable'.
/**
 * M4: 'renewable': a stock Q that regrows (RenewableDef). K = SectorDef.reserve (the natural size, not changed by
 * reserveAdd), reserveMax = K, SectorState.reserve = Q. Never exhausts (no forced Reckoning; Q floors at 1e-6 × K).
 *   p_r = basePrice × reported^(−alpha) × Π resourcePriceMul,   reported = (Q / K)^beta   (the fleet's cost follows
 *   catch per trip, not the stock).
 * Requires RenewableDef (lint) and pressureSource 'depletion' (lint).
 */

/** M4: SectorDef.renewable (required with resourceKind 'renewable'). */
export interface RenewableDef {
  /** r: intrinsic regrowth rate per second. G(Q) = r × Q × (1 − Q/K) × d × s. */
  regen: number;
  /** θ: threshold as a fraction of K. Below it d = collapsed; above it d = 1. */
  threshold: number;
  /** d below the threshold, 0–1 (depensation: the remnant cannot regrow). */
  collapsed: number;
  /** β of the reported stock (catch per unit effort = q × A^β; β < 1 is hyperstability). 0 < beta ≤ 1. */
  beta: number;
  /**
   * The scar written the first time Q falls below θK in a run (that step: 'thresholdCrossed' event and headline;
   * SectorState.crossed = true): meta.scars[s] = { yearsLeft: years } (replacing a shorter one). While a scar has
   * yearsLeft > 0: s = mul in G; yearsLeft −= the step's model years on every step the sector is open (tick and
   * fastForward alike; not while settled); at 0 the scar is removed ('scarHealed' event and headline).
   */
  scar: { mul: number; years: number };
  /**
   * The stock a run starts with: K, unless scarred, in which case min(K, startScarred × K) — the bank does not refill
   * between runs while the scar lasts. Default startScarred = the threshold θ.
   */
  startScarred?: number;
  /** Foreign fleets (see 6). Default: none. */
  foreign?: ForeignDef;
}

// SectorDef (M4):
renewable?: RenewableDef;

// SectorDef.pressureSource (M4): 'resource' | 'service' | 'depletion'.
/**
 * 'depletion' (renewable only): P is not stepped; it is DERIVED each step as P = (1 − Q/K) × collapseAt.
 * absorption and pressureIntensity are ignored. Crises fire at crisisAt fractions as usual. collapseAt itself is
 * never crossed while Q > 0, so a depletion sector never collapses the run; its last crisis should sit at 1 − θ
 * (the threshold) so that crossing the threshold is a named crisis.
 * Clear skies and the sink line use the ordinary rules (SteadyParams.clearBelow × p0, clearFloor): with P derived, the
 * Industry is clear when depletion has fallen to the clear level and is not rising (the stock has regrown).
 * sinkR for a depletion sector = G(Q_clear) − R_foreign(at Q_clear), Q_clear = K × (1 − clearP / collapseAt): the home
 * catch that holds the stock at its clear level (null while no line is drawn, as now). It is the TRUE value; the page
 * shows it only while surveyed (SectorDerived.stock.surveyed).
 */
```

### 5.2 State

```ts
// SectorState (M4):
/** M4: Q has crossed below θK in this run (renewable only). Absent = false. */
crossed?: boolean;

// MetaState (M4):
/** M4: scars by sector (RenewableDef.scar). Absent = {}. */
scars?: Record<SectorId, { yearsLeft: number; since: number /* meta.totalSeconds when written */ }>;
```

### 5.3 The survey

```ts
// EffectDef (M4): standing:
/** M4: the sector is surveyed while in force (SectorDerived.stock.surveyed): the true stock, the true depletion and the
 *  sink line are shown; `settle.requires` may test it. A seated Institution, a measure lever's effects (held), a timed
 *  modifier (a survey letter), a Charter's institutionLoan. */
| { type: 'survey'; sector: SectorId }
```

### 5.4 The step for a renewable sector

Per step of dt (inside `step`, one line in `step.ts`, module `renewable.ts`):

1. R_home from the solve (as any sector); R_foreign = ForeignDef rule (6).
2. Q ← Q + (G(Q) − R_home × (1 − circularity) − R_foreign) × dt, explicit with a substep when |dQ| > 0.05 K
   (deterministic: n = ceil(|dQ| / 0.05K) substeps, at most 8); floor 1e-6 K, ceiling K.
3. If Q < θK and not crossed: crossed = true; scar written; 'thresholdCrossed'.
4. P = (1 − Q/K) × collapseAt (derived), crises as usual.
5. Scar yearsLeft decremented if open and unsettled.

Settled: Q frozen (not stepped), as every settled stock. In arrears (1.3): Q stepped with the excess R.

---

## 6. Foreign fleets

```ts
/**
 * M4: RenewableDef.foreign. Rivals on the same stock whose fishing power follows the home fleet's cheapness:
 *   share = clamp(share0 × (basePs / p_s)^growth × Π foreignMul, 0, cap)      (basePs: the sector's baseline price)
 *   R_foreign = R_home × share / (1 − share)        (so share is the foreign part of the TOTAL catch)
 * R_foreign drains Q and earns nothing; it is not on the home budget line, not in Hindsight's intensity, not in
 * spill. A settled sector has no foreign catch (the settlement is a treaty as well as a quota).
 */
export interface ForeignDef { share0: number; growth: number; cap: number }

// EffectDef (M4): standing:
/** M4: the foreign share × value (multiplicative across effects; the fishery limits). */
| { type: 'foreignMul'; sector: SectorId; value: number }
```

Why a share tied to the home price rather than a second fleet with its own economy: one clamp and one multiplier carry
the lesson (the rivals copy your cheapness; excluding them leaves room your own fleet fills, through the fishery limits'
side effect), cost nothing per step, and need no rival bot. M5's Abroad replaces it with a real neighbour.

---

## 7. The `quota` lever kind and `settle.requires`

### 7.1 `quota`

```ts
// LeverKind (M4):
/**
 * M4: a cap on the TRUE sustainable catch: capR = value × sinkR (5.1) instead of value × budgetR. Hidden unless the
 * sector is surveyed (LeverView.visible needs SectorDerived.stock.surveyed); while unsurveyed a held quota acts on the
 * last surveyed sinkR (the Board's last figure). Otherwise exactly a 'cap' (permit price, leak, squeeze limit, levy,
 * recycle). value 0 = a moratorium (D held at the price-proof floors only). Range 0–1. Requires a budget line as a cap
 * does (drawn at today's R if absent). The tightest of the sector's cap and quota applies.
 */
| 'quota'
```

`LeverView` gains nothing; `requires` may name a FeatureId as now. The lever's catch line names the moratorium's cost.

### 7.2 `settle.requires`

```ts
// SectorDef.settle (M4):
/** M4: settling also needs this (Fishing: { stat: 'surveyed', sector: 'fishing', op: '>=', value: 1, label: 'The
 *  stock surveyed' }). SectorDerived.canSettle and settle() test it; Derived.ending.next.need reports 'requires' with
 *  its label in `settleBlocked`. Once settled, it is not re-tested. Default: none. */
requires?: Cond;

// SectorDerived (M4):
/** M4: the label of the failing settle.requires while at Steady State, else null. */
settleBlocked: string | null;
```

---

## 8. Wager arms

```ts
// DispatchArm (M4):
/**
 * M4: a wager. When this arm is answered, `when` is evaluated on the state at that moment: if it holds, `win` is
 * applied, else `lose` (each like an arm's own effects / modifier / reply, in that order); the arm's own `effects`,
 * `modifier` and `reply`, if any, apply as well, before the wager's branch. `cost` is charged as usual before.
 * `hint` is the condition in the paper's words, shown under the label with both outcomes ("Pays if the shoals are as
 * thick as the catch says"). AnsweredDispatch gains `won?: boolean`; the 'dispatchAnswered' event carries n = arm and
 * label 'won' | 'lost'. Lint: a wager arm is never the default arm; win and lose each have at least one effect or a
 * modifier; `when` resolves; the hint ≤ 70 characters; win/lose outcome lines ≤ 120 characters each.
 */
wager?: {
  when: Cond;
  hint: string;
  win: { outcome: string; effects?: EffectDef[]; modifier?: { effects: EffectDef[]; years: number; label?: string }; reply?: string };
  lose: { outcome: string; effects?: EffectDef[]; modifier?: { effects: EffectDef[]; years: number; label?: string }; reply?: string };
};

// PendingDispatchView arms (M4): each arm's view gains
wager: { hint: string; win: string; lose: string } | null;
```

Why the condition is evaluated on the true state even when the player cannot see it: that is the lesson in Fishing,
and everywhere else the condition is something the page shows. The balancer's `thoughtful` policy may read only what
the page shows (see the balance brief); evaluating the `Cond` directly is the `oracle` policy, kept as an upper bound.

---

## 9. Conditions, stats, events, headlines

```ts
// Cond (M4):
/** True once meta.endings[id] exists (an act's ending reached in any run). */
| { ending: string }

// StatKey (M4):
//  sector: 'openFor'        seconds since the sector opened this run (0 if closed → leaf FALSE as other sector stats)
//          'stockFraction'  Q / K (renewable; FALSE otherwise)
//          'reportedStock'  (Q / K)^β (renewable; FALSE otherwise)
//          'foreignShare'   the foreign share now (renewable with foreign; FALSE otherwise)
//          'scarYears'      meta.scars[s]?.yearsLeft ?? 0 (renewable; FALSE otherwise)
//          'surveyed'       1 or 0
//          'budgetHeadroom' 1 − R / budgetR (FALSE without a line)
//          'feedFactor'     Π of every feed factor into this sector (1 if none)
//          'arrears'        1 or 0
//  global: 'capstoned'      count of capstoned sectors this run
```

Mid-run features in content use `{ not: { any: [ { stat: 'openFor', sector: 'iron', op: '<', value: <window end> },
… ] } }`-style guards to make an Industry opening the run's mid-run arrival (design §9). (A small helper in
`features.ts` builds it; no core rule.)

```ts
// EventKind (M4):
// 'thresholdCrossed'  sector                       — first crossing below θK this run (also the crisis event, if any)
// 'scarHealed'        sector
// 'surveyed'          sector                       — first step surveyed in this run (the true gauge appears)
// 'arrears'           sector ; 'arrearsCleared' sector
// 'capstoned'         sector, id (act)             — at run build, one per capstoned sector (the page's cartouche)
// 'ending' now carries id = the act's ending id ('actOne'); M3's 'steadyAll' remains for content without acts.

// HeadlineKey (M4): 'threshold' · 'scarHealed' · 'surveyed' · 'arrears' · 'foreignFleets' (the share first passes
// RenewableDef.foreign announceAt, default 0.15; event-free) · 'actEnding' ({name} = act title, {year}).
```

`GameEvent` order within a step: the M3 order, then 'thresholdCrossed', 'scarHealed', 'surveyed', 'arrears' /
'arrearsCleared', then the standing orders' events.

---

## 10. Views

```ts
// SectorDerived (M4):
/**
 * M4: the stock gauges (renewable only; null otherwise).
 *   reported   catch per trip, (Q/K)^β, 0–1                       — always
 *   true       Q/K, 0–1, or null while NOT surveyed               — the survey's gauge
 *   surveyed   a survey effect is in force
 *   regen      G(Q) per second now (null while not surveyed)
 *   foreign    { share, R } now (null without ForeignDef); share is shown always (sails are visible)
 *   scar       { yearsLeft } or null
 *   crossed    SectorState.crossed
 *   reportedPressureFraction  (1 − reported) — what the fleet's depletion gauge shows while unsurveyed
 * And while NOT surveyed: SectorDerived.sinkR and clearP read null for this sector (the page draws no sink line);
 * pressureFraction keeps the TRUE value (the core's rules and crises use it), and the page shows
 * reportedPressureFraction instead while unsurveyed. HistorySample.sink is recorded only while surveyed.
 */
stock: {
  reported: number; true: number | null; surveyed: boolean; regen: number | null;
  foreign: { share: number; R: number } | null; scar: { yearsLeft: number } | null; crossed: boolean;
  reportedPressureFraction: number;
  /** The true Q/K, ALWAYS, for the scene's living world only (gulls, shoals, boats out; the soundscape's sea life).
   *  The page's gauges and text must not read it: they read `true` (null while unsurveyed). */
  world: number;
} | null;
capstoned: boolean;
arrears: boolean;
```

The scene adapter reads `stock.world` for the honest world (gulls, shoals) and `stock.reported` / `stock.true` for the
chart, as the design says. That is the one place a view consumer
sees the truth before the player does; it is a deliberate rule of the scene, documented in the scene brief.

`RunSummary.sectors[s]` (M4, optional): `minStock` (lowest Q/K this run), `crossed`, `feedR` (peak rAdded into each
target, for the after picture), `capstoned`.

`Derived` (M4): `act` duplicates nothing; the Act title card reads `Derived.ending.act`. `Derived.nextSectors` lists a
Preview with its checklist as any sector.

`ModelApi`: **no new methods.** The survey is a lever, an Institution, a modifier or a loan; the capstone and arrears
are rules; wagers are answered with `answerDispatch`. `unsettle` refuses a capstoned sector; `settle` tests
`settle.requires`; `reckon` builds capstoned sectors; `createState(content, meta)` does too when meta.capstone exists.

---

## 11. Save version 5

`SAVE_VERSION = 5`; versions chain 1 → 2 → 3 → 4 → 5; a version > 5 → null. v4 → v5, applied to a JSON copy, in
order; the deep merge from a fresh state supplies every other M4 field (all optional or with fresh defaults):

1. **MetaState:** `capstone {}`; `scars {}`.
2. **Every SectorState** (open or closed): nothing (`crossed`, `capstoned`, `arrears` absent = false). Sectors in
   content but not in the save (Iron, Fishing) are rebuilt closed by the existing rule.
3. **The M3 ending record.** `meta.endings.steadyAll`, if present, is kept as is (the retrospective prints it under its
   own template: "Everything settled, under the earlier rule"). It does **not** count as `actOne`: the Act I ending
   needs Iron and Fishing, which no v4 save has.
4. **flags.won** in a loaded mid-run state that won under the M3 rule: kept true for the rest of that run (it is the
   run's history), but `steadyYearsAll` is reset to 0 so that the Act I streak starts from the new rule's first step.
5. **Previews:** nothing to migrate: Motion, Compute and Code stay openable through `{ owns: '<id>' }` (2).
6. **Dispatches:** answered lists keep their entries; `AnsweredDispatch.won` absent on old entries.
7. **Validation** (element by element, invalid entries dropped): `meta.capstone` (unknown sectors or acts dropped; a
   record whose SettledState fails the M2 validation dropped), `meta.scars` (unknown or non-renewable sectors dropped;
   yearsLeft finite and ≥ 0).

No event is replayed. Round trip v5 lossless; a v4 save from before the M3 finish (with `steadyAll` under the earlier
rule) loads the same way.

---

## 12. What it implies in core (one owner per module)

| Module | New or extended | Owns |
|---|---|---|
| `acts.ts` (new) | new | current act, ending set, the M4 streak rule (called from `step.ts`, one line), capstone record at the ending, capstone build in `reckon`/`createState`, per-head scaling, `Derived.ending.act` |
| `settlement.ts` | extend | capstoned sectors excluded from room and unsettle; `settle.requires`; arrears in the lapse rule; arrears stepping hook |
| `flows.ts`, `solver.ts` | extend | feeds into c (before c_eff); shared reserve's p_r from the owner; renewable p_r from the reported stock; capstone scaled settled flows; arrears R |
| `contentIndex.ts` | extend | feed edges (with '*') in the topological solve order; cycle refusal; `resourceStock` owner map; act lookup |
| `renewable.ts` (new) | new | G(Q), the step for Q with substeps, crossing and scar, derived P, sinkR for depletion, `stock` view |
| `foreign.ts` (new, or inside `renewable.ts`) | new | the share, R_foreign, 'foreignFleets' headline |
| `feeds.ts` (new) | new | factors, `feeds` views with rAdded per bucket (shares the caching of `temptation.ts`) |
| `levers.ts`, `policy.ts` | extend | 'quota' (visibility on surveyed, capR from sinkR, last surveyed sinkR held) |
| `effects.ts` | extend | 'survey', 'foreignMul' |
| `dispatch.ts` | extend | wager resolution, `won`, view |
| `conditions.ts` | extend | `{ ending }`, the new StatKeys |
| `offline.ts` | extend | hold before arrears; scars tick offline |
| `hindsight.ts` | extend | capstone exclusions; renewable in perUnburnt as Q/K (ramped as now) |
| `serialise.ts` | extend | v4 → v5 |
| `step.ts`, `index.ts`, `derive.ts` | single owner | one line per mechanic |

Speed: the renewable step is a handful of flops; feeds add one multiply per fed sector and, for the view, one extra
solve per target per derive bucket (cached); the capstone's settled sectors cost what settled sectors cost now. Target:
a step with the four Act I Industries open ≤ 1.3× M3's step with five; `perf.budget.test.ts` passes.

---

## 13. Left out, and why

- **A rival bot for the foreign fleets.** A share is enough until Abroad (M5).
- **Persistent Settlement inside Act I.** Measured unnecessary (M3 finish); the capstone is it.
- **A `ModelApi.survey()` action.** The survey is reached through existing verbs (a lever, a seat, a letter, a Charter);
  a new verb would be a second way to do the same thing.
- **Feature ids for the order book and the chart.** Both widgets arrive with their Industries; nothing to gate.
- **Tariffs and foreign steel.** M5.
- **Changing what `flags.won` means without acts.** Content without `acts` (the test fixture) keeps the M3 rule exactly.
