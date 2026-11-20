# M5 contract notes (proposed)

Proposed changes to `src/types.ts` for M5, "The Other Chair" (`design/m5-design.md`). Save version 5 → **6**. Nothing
here is in `src/types.ts` yet: the contract lane writes it, alone and first (`briefs/m5-contract.md`). Conventions as M4:
every hunk additive and marked `M5:`; every new field optional or with a default under which M4 content plays exactly as
before (no `chair` in content → no Ministry ever; no `hiddenFlow` → the M4 solve); every new rule reads the state at the
start of the step; nothing random, nothing wall-clock.

Section map: §1 office and acts · §2 the Chair (Confidence, elections, pledges, Opposition) · §3 the rival · §4
inspection and concealment · §5 loopholes and amendment · §6 the Treasury, subsidy and charge · §7 hidden flow (Plenty)
· §8 Statecraft and the Know-how transfer · §9 the Treaty · §10 dispatches · §11 features, conditions, stats, events,
headlines · §12 views · §13 ModelApi · §14 save v6 · §15 what it implies in core · §16 each lane's needs walked against
this sketch · §17 left out · §18 foresight for M6 and M7.

---

## 1. Office, and Acts played from the Chair

```ts
// ActDef (M5 additions)
interface ActDef {
  /**
   * M5: the chair this act is played from once office is taken. 'government': while MetaState.office is absent the
   * act's sectors open as Previews under Act I's rules (exactly as `preview: true` in M4); from Take office on, every run
   * is a Ministry (GameState.chair non-null), the act's sectors open under the Chair (§3: Pryce buys and founds; the
   * player's buyUpgrade/foundApp refuse them) and are not Previews. Default: absent (the industrialist's chair).
   */
  chair?: 'government';
  /**
   * M5: the act's sectors cannot open while office is taken (a Ministry): Act III in M5. Their SectorState stays closed;
   * SectorDerived.sealed = true for a sector in meta.sectorsOpened, so the page can show a sealed postcard. Default false.
   */
  closedInOffice?: boolean;
}
```

`SectorDerived.preview` becomes: `act.preview || (act.chair === 'government' && !meta.office)`.

```ts
/** M5: Content.office — the invitation, the acquisition, the prospectus and the file (texts are content). */
interface OfficeDef {
  /** Evaluated by reckon() on the run being ended (before the reset): if it holds, the fresh run has
   *  GameState.officeOffer = true. M5 content: { all: [ { ending: 'actOne' }, { stat: 'openFor', sector: 'motion',
   *  op: '>=', value: 300 } ] }. A run that does not take office keeps the offer for its own Reckoning only if `when`
   *  holds again (it does, for any later run with Motion open five minutes). */
  when: Cond;
  /** The Gazette headline and sub-line of the acquisition, the Minister's letter (from, body, button), the
   *  prospectus (title; template for the first opening; template for a Motion opening; the default when there is no
   *  first opening; the close), the file card (title, line templates, the conclusion by pliant band). Placeholders:
   *  {item:n} (the n-th prospectus item's name), {t:n} (its run time in seconds, an integer), {every:n} (mean interval of
   *  a folded repeat, seconds), {share} (automated share, integer per cent), {seasons}; formatted by content/words.ts. */
  text: OfficeText;
  /** How many opening actions the prospectus quotes (repeats of one upgrade fold into one item). Default 5. */
  prospectusItems?: number;
}
// Content (M5): office?: OfficeDef; chair?: ChairDef; rival?: RivalDef; pledges?: PledgeDef[];
//               loopholes?: LoopholeDef[]; articles?: ArticleDef[]; playbooks?: PlaybookDef[].
```

```ts
// MetaState (M5)
interface MetaState {
  /**
   * M5: set by takeOffice, never removed. While present every run is a Ministry. `run` = meta.reckonings at the time;
   * `at` = meta.totalSeconds; `profile` = the RivalProfile distilled then (§3.2), fixed; `handedOver` = the player's
   * industrial Know-how levels at that moment (the head start, §8); `prospectus` and `file` are computed once (the page
   * can show them again); `ministries` counts Ministries begun; `record` accumulates the Precedent terms since the last
   * Treaty (written by each Reckoning in office).
   */
  office?: {
    run: number; at: number; profile: RivalProfile; handedOver: Record<string, number>;
    prospectus: ProspectusView; file: FileView;
    ministries: number;
    record: { certifiedDecades: number; settledFromChair: number; parliamentsWon: number; wellbeingYears: number };
  };
}
// GameState (M5)
interface GameState {
  /** M5: reckon() sets it on the fresh run when OfficeDef.when held on the run just ended and office is not taken;
   *  false otherwise; takeOffice clears it. Like charterOffer, kept by the between-runs rebuild. Absent = false. */
  officeOffer?: boolean;
  /** M5: the Ministry (§2), or null/absent outside office. Built by takeOffice and by reckon()/createState when
   *  meta.office is present (the ONE carry-over step, inherit.ts, builds it fresh each Ministry). */
  chair?: ChairState | null;
}
```

**takeOffice** (allowed only while `Derived.freshRun` and `officeOffer`): the first Treaty reset (D2): `meta.hindsight` = 0;
every Institution's level → 0 but kept unlocked (`meta.institutions[id]` → 0 means "unlocked, no level"; see §14 for the
representation); `meta.loadout` = []; `meta.knowhow` entries of trees whose `KnowhowTreeDef.holder` is `'rival'` move to
`office.handedOver` and are removed from `meta.knowhow` (and `knowhowPeak` kept); `meta.flags.office = true`; `office` is
written; the run is rebuilt as a Ministry (createState with the same seed); events 'officeTaken'; headlines
'acquisition' then 'officeTaken'. Not a decision.

---

## 2. The Chair: Confidence, elections, pledges, Opposition

```ts
/** M5: Content.chair. All numbers are content; the core supplies only the defaults named. */
interface ChairDef {
  confidence: {
    start: number;            // 55
    winAt: number;            // 50
    relaxPerYear: number;     // share of the gap closed each model year, 0–1 (0.15)
    base: number;             // 50: the level with nothing happening
    perWellbeing: number;     // per point of Derived.wellbeing above wellbeingTarget (negative below)
    perPriceShare: number;    // per unit of household price share that is levy (§2.1), negative
    perJobShare: number;      // per unit of jobs lost share (§2.1), negative
    perCommonsLevel: number;
    lobbyPerYear: number;     // per lever Pryce is lobbying, negative, applied to C directly each year
    fineFound: number;        // one-off on an inspection that finds concealment
    crisis: number;           // one-off at any crisis in an open sector (negative)
    campaignPerMandate: number;
  };
  elections: { firstTermYears: number; termYears: number; noticeYears: number; offer: number; keep: number;
               winMandate: number };            // 10, 15, 3, 3, 2, …
  opposition: { repealPerParliament: number; lostInARowEnds: number };   // 1, 2
  inspection: { inspectors: number; cooldownYears: number; revealYears: number; quietYears: number;
                concealPerYear: number; concealMax: number; fineMul: number };   // 2, 5, 10, 6, 0.02, 0.2, …
  treasury: { taxShare: number; levyShare: number };                       // share of rival income; of levy revenue
  compensation: { costYears: number; years: number };  // cost = costYears × the income Pryce lost; holds for `years`
  amend: { mandateCost: number; years: number };       // defaults; LoopholeDef may override
  /** Hindsight in a Ministry: overrides of GlobalParams.hindsight while in office, plus the new term. */
  hindsight?: Partial<GlobalParams['hindsight']> & { perParliamentWon?: number };
}
```

### 2.1 Confidence (in the step, once per model year boundary, inside tick and fastForward alike)

`C ← C + relaxPerYear × (C* − C) + Σ one-offs this year`, clamped 0–100, with

```
C* = base + perWellbeing × (W − target)
          + perPriceShare × priceShare           priceShare = Σ_s w_s × levyPart_s / p_s   (open chair sectors and the
                                                 capstone; a levy recycled as 'dividend' counts at −0.5 of its part)
          + perJobShare × jobShare               jobShare = Σ_s max(0, 1 − income_s / peakIncome_s) over chair sectors
                                                 not compensated now (RivalState.peakIncome: this Ministry's peak)
          + perCommonsLevel × Σ commons levels
          + Σ over pledges in force PledgeDef.confidence
          + Σ over levers held LeverDef.popularity term (§2.3)
```

and `− lobbyPerYear × (levers Pryce is lobbying)` applied to C directly. `w_s` = the sector's wellbeingWeight normalised.

### 2.2 Elections

```ts
interface ChairState {
  confidence: number;
  parliament: {
    index: number;              // 0 for the first (caretaker) Parliament
    start: number;              // run time
    pollAt: number;             // run time of polling day
    /** Pledges offered (ids, `elections.offer` of them), drawn when run time reaches pollAt − noticeYears/YPS; null
     *  before. Draw: E = PledgeDef with `when` holding, in content order; i_k = mix32(seed ^ Math.imul(index + 1,
     *  0x9E3779B1) ^ k) mod |E| without replacement (k = 0, 1, …). */
    offer: string[] | null;
    /** Chosen by choosePledges (exactly `keep` ids from offer), or null; at polling an unchosen offer resolves to its
     *  first `keep` (by 'default'). */
    chosen: string[] | null;
  };
  /** Pledges binding this Parliament (chosen at the last polling day). */
  pledges: string[];
  inOpposition: boolean;
  lostInARow: number;
  electionsWon: number;
  /* §4 */ inspectors: number[]; inspected: Record<SectorId, number>; found: Record<SectorId, { share: number; t: number }>;
  /* §6 */ compensated: Record<SectorId, number>;
  /* §5 */ loopholes: Record<string, LoopholeState>;
  /** Lever id → parliament index of a carve-out won by lobbying (the lever acts one level lower that Parliament). */
  carveOuts: Record<string, number>;
  /** Lever id → a raise held up in court: the lever acts at `from` until run time `until`, then at its level. */
  litigation: Record<string, { from: number; until: number }>;
  /** Levers repealed by an incoming government, in order (for the page and the retrospective). */
  repealed: { lever: string; parliament: number }[];
  rival: RivalState;
}
```

**Polling day** (the step crossing pollAt): pledges in force ← chosen (or default); `won = C + Σ chosen PledgeDef.confidence
bonus ≥ winAt` (the bonus is already in C* for the coming Parliament; at polling it adds once as `PledgeDef.atPoll`).
Won: `electionsWon += 1`, `lostInARow = 0`, `inOpposition = false`, Mandate += winMandate; events 'electionWon'. Lost:
`lostInARow += 1`, `inOpposition = true`; the incoming government repeals `repealPerParliament` level(s) of the lever
with the largest comply cost to Pryce (RivalState.answers; ties content order), skipping levers under a standing
`ratchet` effect; 'electionLost', 'leverRepealed'. If `lostInARow ≥ lostInARowEnds`: a Reckoning becomes pending with
cause **'defeated'** (§13). Then the next Parliament: index + 1, start = now, pollAt = now + termYears / YPS (plus
`termYearsAdd` effects), offer = chosen = null.

### 2.3 Pledges and popularity

```ts
interface PledgeDef {
  id: string; name: string; blurb: string;   // "No new taxes on motoring"
  /** Confidence: added to C* while in force, and once at the poll it is chosen for (atPoll). */
  confidence: number; atPoll?: number;
  /** Binds the Ministry's hands for the Parliament: setLever refuses a raise above `max` on the lever, or every lever
   *  of `leverKind` (in `sector` if given). LeverView.bound carries the pledge's name. */
  binds?: { lever?: string; leverKind?: LeverKind; sector?: SectorId; max: number };
  /** Standing effects while in force (a railway for every town: substitution flow +). */
  effects?: EffectDef[];
  /** Offered only while this holds (sector open, feature on…). Default: always. */
  when?: Cond;
}
// LeverDef (M5)
interface LeverDef {
  /** M5: a lever's term in C* per level held, moving from `start` to `after` over `years` model years of being held at
   *  ≥ 1 (LeverState.since): term = level × (start + (after − start) × min(1, held / years)). The charge: start −3,
   *  after +1, years 10 (Stockholm). Default: none (the lever's effect on Confidence is only through prices and jobs). */
  popularity?: { start: number; after: number; years: number };
}
// LeverState (M5): since?: number — run time the lever last rose from 0 (absent = never this run).
```

---

## 3. The rival

### 3.1 Definition

```ts
interface RivalProfile {
  haste: number;    // 0–1
  founder: number;  // 0–1
  volume: number;   // 0–1
  drawn: number;    // 0–1 (0: never drew a line; 1: drew one in the first minutes of run 1)
  pliant: number;   // 0–1
}
type ResponseKind = 'comply' | 'evade' | 'lobby' | 'litigate' | 'conceal'
  /* M6 adds 'offshore' and 'capture'; the UI and core handle unknown kinds with a default label (open union). */
  | (string & {});
interface ResponseDef {
  kind: ResponseKind;
  /** Multiplies this response's cost (balance knob; playbooks multiply it further). Default 1. */
  costScale?: number;
  /** Available only once this feature is unlocked (evade: 'loopholes'; conceal: 'inspection'). Default: always. */
  feature?: FeatureId;
  /* per-kind numbers: */
  lobby?: { costPerPoint: number; carveOutAt: number };          // £ per Confidence point (× his income scale)
  litigate?: { windowYears: number; delayYears: number; feeYears: number };
}
interface RivalDef {
  id: string; name: string;                 // 'pryce', "Pryce Consolidated"
  cast: string;                             // 'pryceChair' (his letters)
  defaultProfile: RivalProfile;             // the balancer's efficiency opening
  responses: ResponseDef[];
  /** Profile → policy. paybackMax = lerp(slow, fast, haste); foundPaybackMax = lerp(…, founder); fork arm choice by
   *  volume (≥ 0.5: the arm with the larger satMul/halfPriceMul; else the other); lobbying threshold +drawn × drawnLobby;
   *  quiet period = inspection.quietYears + round((0.5 − drawn) × quietSpread); letter weight × (1 + pliant). */
  policy: { paybackSlow: number; paybackFast: number; foundSlow: number; foundFast: number; drawnLobby: number;
            quietSpread: number };
  /** Profile from the opening (§3.2). */
  profileFrom: { hasteAtPerMinute: [number, number]; drawnBySeconds: number };
  /** "Pryce has read your notebooks": η × min(cap, 1 + k × Σ handedOver levels) on every chair sector. */
  knowhowTransfer: { k: number; cap: number };
  startCapitalSeconds: number;              // his opening purse, in seconds of the head-started income
}
```

### 3.2 The profile (computed once, by takeOffice; pure)

From `meta.firstOpening` (else `defaultProfile`): `haste` = clamp((purchases in the first 600 s / 10 − a) / (b − a))
with [a, b] = `hasteAtPerMinute`; `founder` = founds / actions; `volume` = share of fork purchases that took the arm with
the larger demand effect (0.5 if none); `drawn` = 1 − min(1, firstBudgetAt / drawnBySeconds) over `meta.runs`' earliest
`firstBudgetAt` (0 if none); `pliant` = player arms tagged `stance: 'accept'` ÷ player answers, over dispatches of cast
'pryce' and 'prycePater' (0.5 if none). Recorded in `office.profile`; `RivalView.sources` carries the raw figures for the
page ("12 purchases in your first ten minutes").

### 3.3 State and the yearly decision

```ts
interface RivalState {
  capital: number;
  peakIncome: Record<SectorId, number>;
  /** True minus reported, as a share of true R (0 – concealMax), per chair or capstoned sector. */
  concealment: Record<SectorId, number>;
  /** Lever id → his last answer (kind, the level it answered, run time, its yearly cost to him). */
  answers: Record<string, { kind: ResponseKind; level: number; t: number; cost: number }>;
  /** Lever ids he is lobbying now. */
  lobbying: Record<string, boolean>;
}
// Actor (M5): += 'rival' | 'inspectorate' (standing inspection) | 'opposition' (a repeal).
```

**At each order tick** (the M2 rule: every `GlobalParams.orders.intervalYears` model year), in a Ministry, after the
step's other rules and before the player's standing orders:

1. **Income.** `capital += Σ chair sectors income_s × dt` happens every step, not at ticks (income_s = m × pPre × D as
   the player's income was); the Treasury takes `taxShare` of it (§6) and capital keeps the rest.
2. **Purchase**, per open, unsettled chair sector in sectorOrder: exactly the Market's candidate rule and payback
   (OrdersState doc) with `capital` = RivalState.capital, `paybackMax` from the profile, founding under
   `foundPaybackMax`, fork arms chosen by `volume` (the Market never buys forks; Pryce does), subsidised targets at his
   cost (§6.2), recorded with actor 'rival' (run.opening, events 'upgradeBought' / 'appFounded' by 'rival', run.automated
   is NOT incremented: these are not the player's automations).
3. **Answers**, per lever of a chair sector (or a capstoned sector's levers, none in M5) whose level changed since
   `answers[id].level`, or whose answer is older than `decadeYears`: evaluate each available response's cost (§3.4) on
   the state at the start of the tick; choose the cheapest (ties: comply, evade, lobby, litigate in that order); record
   it; apply it (§3.4); event 'rivalAnswered' (id = lever, label = kind) when the kind changed.
4. **Concealment** (§4), per chair and capstoned sector.

### 3.4 Response costs and effects (a model year, in his £)

| Kind | Cost | Effect |
|---|---|---|
| comply | `I(rule off) − I(rule on)` for that sector's income I (one solve of the sector with the lever at its previous answered level), ≥ 0 | none |
| evade | `premium × I` of the lever's first open rung (§5) | the rung's status → 'used' (§5) |
| lobby | `costPerPoint × max(0, C − carveOutAt) × incomeScale` (incomeScale = I / 100, so a large firm's points cost more) | `lobbying[id] = true`; C falls `lobbyPerYear` a year; once C < carveOutAt, `carveOuts[id] = parliament.index` |
| litigate | `feeYears × I`, available only if `now − LeverState.raisedAt ≤ windowYears` and not litigated at this level | `litigation[id] = { from: previous level, until: now + delayYears / YPS }` |

Costs × `costScale` × Π `rivalCostMul` effects (playbooks). **The answer line** (`LeverView.rivalAnswer`) evaluates the
same costs for the lever at its next level (or current, if maxed), on the current state, and returns the ranked list.
Cached per lever per 20 s structural bucket, as `temptation.ts`. Criterion 4 of the design asserts equality.

**Effective level.** Every rule that reads a lever's level in a Ministry reads `effectiveLevel = level − (carveOut this
Parliament ? 1 : 0)`, or `litigation.from` while litigated, floored at 0. One helper (`leverLevels.ts`), used by flows,
effects, side effects and views. `LeverView.effectiveLevel`.

---

## 4. Inspection and concealment

- **Concealment ramp** (per chair or capstoned sector, at order ticks, while feature 'inspection' is on): if `now −
  inspected[s] ≥ quietYears_eff / YPS` (never inspected counts from the Ministry's start) and the sector has a levy,
  cap or quota in force (or is capstoned), and conceal's expected fine `fineMul × levyAvoided × coverage` is below the
  levy he would avoid, `concealment[s] = min(concealMax, concealment[s] + concealPerYear × years)`; else unchanged. A
  standing `certify` effect on s holds it at 0. `coverage` = inspectors available ÷ chair sectors open (≤ 1).
- **What it does.** `SectorDerived.reportedR = R × (1 − c)`. Levy revenue of the sector × (1 − c). A cap's and a quota's
  target on the sector is enforced on reported R: the solver's target becomes `capR / (1 − c)`. Decades, clear skies,
  Steady State, pressure and the reserve use true R. For a **capstoned** sector the record's R is the reported figure;
  the true R is `R_rec / (1 − c)` and the excess is stepped into pressure as arrears are (M4's arrears stepping, reused),
  without entering arrears.
- **inspect(sector)** (feature 'inspection'; refused with no Inspector ready or the sector not open): the soonest-ready
  Inspector rests `cooldownYears`; `inspected[s] = now`; if `c > 0`: Mandate += `fineMul × c × levyRate_s × quietYears`
  (the levy dodged, roughly), C += `fineFound`, `found[s] = { share: c, t: now }`, `concealment[s] = 0`, events
  'inspected' (n = round(c × 100)) and 'concealmentFound', headline 'concealmentFound'; else 'inspected' with n 0 and
  headline 'inspectedClean'. A decision. Shown: true R for `revealYears` (`SectorDerived.inspectedUntil`).
- **Certified decades.** `SectorState.decadesCertified?: boolean[]` parallel to `decadesWithin`: a decade recorded while
  in office is certified if `inspected[s]` falls inside its ten-year window. `RunStats.certifiedDecades`. Display only,
  plus the Precedent term.
- **Standing inspection** (OrderId 'inspection', available with `orderUnlock 'inspection'`): at each decade boundary,
  inspects the chosen sector (by 'inspectorate'; run.automated += 1; no decision) if an Inspector is ready.
  `OrdersState.inspection?: { on: boolean; sector: SectorId | null }`.

---

## 5. Loopholes and amendment

```ts
// LeverDef (M5)
interface LeverDef {
  /** M5: the loophole ladder of this lever (LoopholeDef ids, rung order). Only while feature 'loopholes' is on. */
  ladder?: string[];
}
type LoopholeStatus = 'open' | 'used' | 'drafting' | 'closed';
interface LoopholeDef {
  id: string; lever: string; name: string; blurb: string;      // "Light trucks", "Vans are counted separately"
  /** The exempt application that the rival founds (free) when he first uses this rung; its ApplicationDef.when should
   *  be { loophole: id, status: 'used' }. Default: none. */
  app?: string;
  /** Share of the lever's grip that escapes while used: a measure's effects act with times × (1 − escape); a duty's or
   *  charge's levy part × (1 − escape); a cap's or quota's target ÷ (1 − escape). 0–0.9. */
  escape: number;
  /** Standing effects while used, times = the lever's effective level (the heavier vehicle: satMul on the exempt app). */
  effects?: EffectDef[];
  /** The evade cost: premium × the sector's income (§3.4). */
  premium: number;
  /** Amendment cost (default ChairDef.amend). Absent with closedBy: the rung cannot be amended, only closed by pairing. */
  amend?: { mandateCost: number; years: number; label: string };
  /** The rung is unavailable to the rival (evade cost infinite) while this holds: the robust rung (a duty in force). */
  closedBy?: Cond;
  /** Scene prop key for the exempt thing ('vans', 'borehole'); unknown → none. */
  prop?: string;
}
interface LoopholeState { status: LoopholeStatus; since: number; draftUntil?: number }
// ApplicationDef (M5): when?: Cond — available only while this holds, in addition to visibleBelow (calendar-dated uses;
// exempt uses). A founded app whose `when` stops holding keeps its adoption but cannot grow (satMul frozen). Default: always.
```

Rules: when a laddered lever first reaches level ≥ 1 in a Ministry with 'loopholes' on, its first rung's state is
created 'open' ('loopholeOpened'). Evade sets the first open rung 'used' ('loopholeUsed'; the exempt app founded by
'rival'). **amend(loopholeId)**: allowed when the rung is 'open' or 'used' and has `amend`; charges Mandate (× amend cost
effects) and sets 'drafting' with `draftUntil = now + years / YPS × Π amendYearsMul`; while drafting the rung acts as it
did before ('used' stays used). At draftUntil: 'closed' ('loopholeClosed'); the next rung (if any) becomes 'open'; Pryce
re-answers the lever at the next tick. Allowed in Opposition: an amendment that completes in Opposition is held and
closes the rung on the first step back in office. Reset each Ministry (rungs are run state; Articles may change that in
M6). A decision.

---

## 6. The Treasury; `subsidy` and `charge`

- **In a Ministry `GameState.capital` is the Treasury.** Income per second = `taxShare × Σ rival income + levyShare ×
  levy revenue routed 'treasury'` (the Mandate share of 'treasury' recycling is unchanged) + capstone income (now
  Pryce's: through taxShare). `Derived.incomePerSec` reports it. `click` is refused in a Ministry (`Derived.clickValue`
  0). buyCommons draws on it as on capital.
- **compensate(sector)** (feature 'treasury'; a decision): costs `costYears × (peakIncome_s − income_s)` from the
  Treasury; `compensated[s] = now + years / YPS` (the jobs term ignores s until then); event 'compensated'.

```ts
type LeverKind = /* … */
  /** M5: the Treasury pays `value` (0–0.9) of the capital cost of the lever's `targets` when the rival buys one: his
   *  payback is computed at (1 − value) × cost, the Treasury is charged value × cost at the purchase (if it cannot pay
   *  in full, the rival pays the whole and nothing is charged). No effect outside a Ministry. Revenue: none. */
  | 'subsidy'
  /** M5: a price on the service, fixed when enacted: chargePart = value × LeverState.ref, ref = p_s (or, with
   *  `basis`, the resource price per unit of that water) when the lever rose from 0. Levy revenue = chargePart × D (× (1 −
   *  concealment)); recycle as a duty. Several charges in a sector add. Range 0–1. */
  | 'charge';
// LeverDef (M5)
interface LeverDef {
  /** M5: 'subsidy' only: upgrade or application ids it pays towards. */
  targets?: string[];
  /** M5: on a hiddenFlow sector, which water a 'cap', 'quota' or 'charge' is written on: 'applied' (metered at the pump)
   *  or 'consumed' (the default: R). For a cap on 'applied' the solver's target is on R_applied. */
  basis?: 'applied' | 'consumed';
}
```

---

## 7. Hidden flow (Plenty)

```ts
// SectorDef (M5)
interface SectorDef {
  /**
   * M5: a share of the resource applied returns to the reserve (Plenty's return flow). With r = clamp(returnShare × Π
   * returnShareMul effects, floor ?? 0, 0.95):
   *   the price side uses water APPLIED: pPre = p_r / η + c (as now); R_applied = D / η;
   *   the resource side uses water CONSUMED: R = R_applied × (1 − r) — the reserve drains by R, pressure is fed by R,
   *   budget lines, caps (basis 'consumed'), decades and the instruments read R.
   * The shadow freezes η AND r at their base values. Default: absent (R = D / η, as M4).
   */
  hiddenFlow?: { returnShare: number; floor?: number };
}
// EffectDef (M5): | { type: 'returnShareMul'; sector: SectorId; value: number }   // standing; multiplicative
// SectorDerived (M5): water?: { applied: number; consumed: number; returnShare: number } | null  (hiddenFlow only)
// AppDerived (M5): regime: 'elastic' | 'saturated'   — 'elastic' when (p_seen / p_i)^k_i > 1 (any sector; a label)
// StatKey (M5, sector): 'waterApplied', 'waterConsumed', 'returnShare' (FALSE without hiddenFlow)
```

---

## 8. Statecraft and the Know-how transfer

```ts
// Content.knowhowTrees[tree] (M5): holder?: 'rival' — the tree passes to the rival at Take office (industrial trees).
// KnowhowDef (M5): when?: Cond — visible and buyable only while it holds (between runs). Statecraft: { feature: 'statecraft' }.
// EffectDef (M5, standing unless marked):
  | { type: 'inspectorAdd'; value: number }
  | { type: 'amendYearsMul'; value: number }
  | { type: 'pledgeOfferAdd'; value: number }          // offer + value pledges (keep unchanged)
  | { type: 'litigateYearsMul'; value: number }        // Pryce's delays × value
  | { type: 'fineMul'; value: number }
  | { type: 'popularityYearsMul'; value: number }      // a lever's popularity reaches `after` sooner
  | { type: 'compensationMul'; value: number }         // compensation cost × value
  | { type: 'quietYearsAdd'; value: number }           // Pryce's quiet period + value (negative: a playbook)
  | { type: 'termYearsAdd'; value: number }
  | { type: 'ratchet' }                                // no lever is repealed in Opposition
  | { type: 'certify'; sector: SectorId }              // concealment held at 0 in that sector
  | { type: 'rivalCostMul'; response: ResponseKind; value: number }
  | { type: 'confidenceAdd'; value: number }           // ONE-OFF (letters)
// OrderId (M5): += 'inspection'  (orderUnlock 'inspection' makes Standing inspection available)
```

Sources of standing effects gain **Articles** (`meta.articles`) and **playbooks** (`meta.playbooks`, effects on the
rival) and **pledges in force**. Effects that make no sense outside a Ministry are inert there.

---

## 9. The Treaty, Precedent, Articles and playbooks

```ts
interface ArticleDef { id: string; name: string; blurb: string; cost: number /* Precedent */; effects: EffectDef[];
                       requires?: Cond }
interface PlaybookDef { id: string; name: string; blurb: string; /** learnt at the n-th Treaty after Take office
                       (1 = the second Treaty) */ treaty: number; effects: EffectDef[] }
// ChairDef (M5): treaty: { when: Cond; perCertifiedDecade: number; perSettledFromChair: number;
//                          perParliamentWon: number; perWellbeingYear: number }
// MetaState (M5): precedent: number; precedentEarned: number; articles: Record<string, true>; treaties: number;
//                 playbooks: string[]
```

**treaty()** (feature 'treaty'; allowed only while `Derived.freshRun` and `Derived.treaty.available`, i.e. `treaty.when`
holds on meta: content `{ stat: 'settledFromChair', op: '>=', value: 1 }`): Precedent += the terms over `office.record`
(rounded, ≥ 1); `office.record` zeroed; Hindsight 0; Statecraft levels 0 (respec without refund); Institution levels 0;
loadout []; `treaties += 1`; the PlaybookDef with `treaty === treaties` joins `meta.playbooks`; the run rebuilt;
events 'treaty' and 'playbookLearnt'. **buyArticle(id)** (between runs): Precedent ≥ cost. Articles and playbooks stand
for good (in every Ministry). Not decisions.

---

## 10. Dispatches

```ts
// DispatchArm (M5): stance?: 'accept' | 'refuse' | 'bargain' — tags an arm for the rival's `pliant` reading and the
//   file card. Content tags every arm of Pryce's (both generations') letters, Act I and Preview included (content-only
//   change to M3/M4 dispatches: no save impact).
// CastDef: unchanged. New cast (content): pryceChair, permanentSecretary, chiefInspector, okonedo, opposition.
```

Wager conditions read the new stats (§11): `concealment` (TRUE share; the hint reads "Pays if Pryce's returns are
honest"), `yearsSinceInspection`, `confidence`. The guaranteed wager a Parliament uses `{ stat: 'parliamentWagers', op:
'<', value: 1 }` in its `when`.

---

## 11. Features, conditions, stats, events, headlines

- **FeatureId** (append after 'estimates', in arrival order): `'chair'` (Confidence, elections, the answer line,
  Pryce's panel; content `when`: `{ flag: 'office' }`; nothing in a Ministry works without it, so it arrives with the
  first Ministry's first unlock check), `'loopholes'`, `'inspection'`, `'treasury'`, `'statecraft'`, `'charge'`,
  `'treaty'`. Gating: 'loopholes' (ladders, evade, amend), 'inspection' (inspect, conceal, the reported label;
  `reportedR` = R while off), 'treasury' (compensate and the page's Treasury line; tax accrues regardless),
  'statecraft' (KnowhowDef.when in content), 'charge' (content `requires: ['charge']` on charge levers), 'treaty'
  (treaty(), buyArticle(), the Articles tab).
- **Cond**: `{ loophole: string; status?: LoopholeStatus }` (that rung's state this run; absent status = 'used' or
  'closed'). `owns` also resolves: a pledge id → in force now or kept in any Ministry (`meta`… see §14 `pledgesKept`);
  an article id → bought; a playbook id → learnt; a loophole id → used or closed this run.
- **StatKey** (M5, global): 'confidence', 'inOffice' (1/0), 'inOpposition', 'electionsWon' (this Ministry),
  'ministries' (meta.office?.ministries ?? 0), 'treaties', 'precedent', 'settledFromChair' (Σ over office.record and
  this run's chair sectors settled), 'parliamentWagers' (wagers answered by the player since this Parliament's start),
  'rivalCapital'. (Sector): 'concealment' (TRUE; FALSE outside office), 'yearsSinceInspection' (1e9 if never),
  'certifiedDecades', 'waterApplied', 'waterConsumed', 'returnShare', 'loopholesUsed'.
- **ReckoningCause**: += 'defeated' (two lost elections). Open union as M4 promised: the UI keeps a default label.
- **EventKind / HeadlineKey** (same names where both): 'officeTaken', 'acquisition' (headline only), 'electionCalled'
  (offer drawn), 'electionWon', 'electionLost', 'leverRepealed', 'ministryDefeated', 'inspected', 'concealmentFound',
  'inspectedClean' (headline only), 'rivalAnswered', 'loopholeOpened', 'loopholeUsed', 'loopholeClosed', 'litigated',
  'carveOut', 'compensated', 'treaty', 'playbookLearnt', 'articleBought'. Order within a step: after M4's events, in the
  order listed. Sector headlines (`sectorHeadlines`) apply as usual.
- **HindsightTerms**: += `parliaments?: number` = perParliamentWon × electionsWon (present only in office). In a
  Ministry, `GlobalParams.hindsight` is overlaid by `ChairDef.hindsight`.
- **RunSummary** (optional, office only): `ministry?: { electionsWon: number; lost: number; inspections: number; found:
  number; loopholesClosed: number; treasury: number; settledFromChair: SectorId[]; profile?: RivalProfile }`.

---

## 12. Views

```ts
// Derived (M5)
interface Derived {
  office: { offered: boolean; taken: boolean; prospectus: ProspectusView | null; file: FileView | null };
  chair: ChairView | null;        // null outside office
  treaty: { available: boolean; precedentIfNow: number; terms: Record<string, number> } | null;
}
interface ProspectusView {
  defaulted: boolean;   // no first opening: the default text
  /** Folded opening items (a repeated upgrade is one item with count and mean interval). */
  first: { id: string; name: string; t: number; count: number; every: number | null; kind: 'upgrade' | 'found' }[];
  /** The last run's Motion foundings (or null if none). */
  motion: { id: string; name: string; t: number }[] | null;
}
interface FileView {
  accepted: { dispatch: string; label: string; year: number }[];   // at most 3, most recent first
  declined: { dispatch: string; label: string; year: number }[];
  pliant: number; automatedShare: number; seasons: number;
}
interface ChairView {
  confidence: number; target: number;           // C and C* (target shown only with Polling: content `when`)
  parliament: { index: number; pollIn: number /* s */; offer: PledgeView[] | null; chosen: string[] | null };
  pledges: PledgeView[]; inOpposition: boolean; lostInARow: number; electionsWon: number;
  inspectors: { ready: number; total: number; nextReadyIn: number | null };
  rival: RivalView;
  treasury: { perSec: number; taxPerSec: number; levyPerSec: number };
  loopholes: LoopholeView[];
  repealed: { lever: string; parliament: number }[];
}
interface RivalView {
  name: string; capital: number; incomePerSec: number;
  profile: RivalProfile; sources: Record<keyof RivalProfile, string>;   // "12 purchases in your first ten minutes"
  paybackMax: number; foundPaybackMax: number;
  next: Record<SectorId, { id: string; payback: number } | null>;
  answers: { lever: string; kind: ResponseKind; cost: number; since: number }[];
}
interface PledgeView { id: string; name: string; blurb: string; confidence: number; binds: string | null }
interface LoopholeView { id: string; lever: string; status: LoopholeStatus; name: string; blurb: string;
  canAmend: boolean; amendCost: number | null; draftLeft: number | null; robustLabel: string | null; prop: string | null }
// LeverView (M5): rivalAnswer: { options: { kind: ResponseKind; cost: number; available: boolean }[]; chosen: ResponseKind
//   } | null; effectiveLevel: number; bound: string | null; litigatedUntil: number | null; carvedOut: boolean;
//   popularity: number | null (its current C* term)
// SectorDerived (M5): reportedR: number; inspectedUntil: number | null; found: { share: number; t: number } | null;
//   rival: boolean (run by the rival); sealed: boolean; water (§7)
// UpgradeView (M5): byRival: boolean (read-only; canBuy false for the player)
// OrdersView (M5): market shows `rival: true` in a Ministry (the page labels it "Pryce Consolidated"); inspection order.
```

The scene's `SceneView` (UI-owned) gains, from these views: lobbying levers (hoardings), litigated levers (court notices),
used loopholes' props, `inOpposition` (curtains), the inspector walking (from 'inspected' events), `rival` flags.

---

## 13. ModelApi

```ts
interface ModelApi {
  takeOffice(state, content): GameState;                    // §1; between runs; not a decision
  inspect(state, content, sector: SectorId): GameState;     // §4; a decision
  amend(state, content, loopholeId: string): GameState;     // §5; a decision
  choosePledges(state, content, ids: string[]): GameState;  // exactly `keep` ids of the offer; a decision
  campaign(state, content, mandate: number): GameState;     // Opposition only; C += campaignPerMandate × mandate; a decision
  compensate(state, content, sector: SectorId): GameState;  // §6; a decision
  treaty(state, content): GameState;                        // §9; between runs
  buyArticle(state, content, id: string): GameState;        // §9; between runs
}
```

Changed: `buyUpgrade`/`foundApp` refuse chair sectors (they are Pryce's); `click` refused in a Ministry; `setLever`
refuses raises in Opposition and above a pledge's `max`; `reckon` with cause 'defeated'; `settle` in a Ministry records
`settledFromChair` (office.record at the Reckoning); `createState(content, meta)` with `meta.office` builds a Ministry
(inherit.ts: the chair state fresh, Pryce's capital `startCapitalSeconds` × head-started income, rungs empty, the
capstone held by Pryce); `hindsightOnReckon` adds `parliaments`; `fastForward` holds one step before a polling day it
would lose (heldBy 'election') under holdBefore 'crisis' or 'collapse' — a player is never voted out while away, and
draws no pledges while away (the offer waits for a live step, as letters do).

---

## 14. Save version 6

`SAVE_VERSION = 6`. Version 5 → 6, applied to a JSON copy, in this order (the deep merge from a fresh state supplies the
rest; every M5 field is optional or has a fresh default):

1. MetaState: `precedent` 0, `precedentEarned` 0, `articles` {}, `treaties` 0, `playbooks` []; `office` absent.
2. GameState: `chair` null; `officeOffer` = false, then step 6.
3. LeverState: `since` absent (= never). SectorState: `decadesCertified` absent (= all false).
4. Institutions "unlocked with no level": M5 represents it as `meta.institutions[id] = 0` (an own key with 0). Every
   reader that tests "owned" (`level ≥ 1`) is unchanged; the shop shows level 0 as "unlocked, not bought" and
   `buyInstitution` accepts level 1 at the level-1 cost. (v5 saves have no zeros; nothing to migrate.)
5. Previews: a v5 save after the Act I ending keeps Motion, Compute and Code openable as Previews until office is taken
   (unchanged rules); at takeOffice Compute and Code close (`closedInOffice`), their meta records kept.
6. After the state is built: if `Derived.freshRun` and `meta.reckonings ≥ 1` and the last run (meta.lastRun) satisfies
   `OfficeDef.when` as far as a summary can say (`meta.endings.actOne` exists and `lastRun.sectors.motion` exists with
   `resourceUsed > 0`: RunSummary keeps no openFor, so "Motion ran in the last run" stands in for "open five minutes"),
   `officeOffer = true`. (M5 also adds `openFor?: number` to `RunSummary.sectors[s]`, so later summaries can say it
   exactly.)
7. Validation (element by element, invalid entries dropped): `meta.articles` and `playbooks` (unknown ids dropped);
   `meta.office` (a profile with non-finite numbers → defaultProfile; handedOver unknown ids dropped); `chair` (rebuilt
   fresh if it fails: unknown lever, pledge or loophole ids dropped; numbers finite; confidence clamped).

Round trip v6 lossless; v7 → null. No event is replayed.

---

## 15. What it implies in core (one owner per module)

| Module | Owner | Work |
|---|---|---|
| `chair/rival.ts` (new, layer 6) | Core A | profile from the opening; policy; the Market's candidate rule with his purse (refactor the rule out of `orders.ts` into a shared function both call: no behaviour change for the Market, tested by M4's golden runs); response costs and choice; the answer line (cached); effective level |
| `chair/inspect.ts` (new, layer 6) | Core A | concealment ramp; reportedR; levy and cap scaling; capstone excess; `inspect`; standing inspection; certified decades |
| `chair/loopholes.ts` (new, layer 6) | Core A | rung states; evade's effects (escape and rung effects in the effects overlay); `amend`; exempt apps |
| `chair/office.ts` (new, layer 9) | Core B | `takeOffice`, `treaty`, `buyArticle`; the prospectus and file views; the transfer |
| `chair/elections.ts` (new, layer 6) | Core B | Confidence; polling; pledges draw and binds; Opposition; repeal; `campaign`; 'defeated' |
| `chair/treasury.ts` (new, layer 6) | Core B | tax and levy shares; `compensate`; subsidy charging |
| `solver.ts` | Core B | `hiddenFlow` (R after the price solve), `charge` part, `basis` targets, cap target ÷ (1 − c) and ÷ (1 − escape) (inputs from Core A's helpers) |
| `effects.ts`, `leverLevels.ts` | Core A | new effects; sources (pledges, Articles, playbooks); effective level |
| `inherit.ts` | Core B | a Ministry's fresh chair state; Pryce holds the capstone (M4's records unchanged) |
| `step.ts`, `index.ts`, `derive.ts`, `serialise.ts` | Core B (registry owner) | one line per mechanic; the new actions wrapped by `asDecision`; views; v6 |
| `orders.ts` | Core A | the shared candidate rule; Pryce's tick before the player's orders; 'inspection' order |
| `tools/strategies/{abstain,naive,hawk,steward,humanGov}.ts`, `tools/balance.ts` | Core B | regulator bots; `--rival-profile=<json>|grid:N` (writes meta.office.profile in the harness) |

Performance: Pryce's yearly decision is one Market candidate scan per chair sector (as the Market) plus one solve per
lever whose answer is due (at most a few a year); the answer line is cached per bucket. Budget: ≤ 2 ms per sector per
decision on the perf test's machine; a Ministry step ≤ 1.25× M4's act1 step.

---

## 16. Each lane's needs walked against this sketch

M4's lanes found seven gaps. I walked each M5 lane's work through the sketch above; the gaps found and closed in the
sketch are marked ✓; what remains for the contract lane to decide is marked ◇.

| Lane | Needs | Where |
|---|---|---|
| Content: Motion | growth tail: repeatable capital cards (UpgradeDef.repeatable ✓ existing); calendar-dated uses ✓ `ApplicationDef.when` (new, §5); the exempt app ✓ (`when: { loophole }`); the ladder ✓ (`LeverDef.ladder`, `LoopholeDef`); the robust rung ✓ (`closedBy: { owns: 'motion.duty' }`); the charge ✓ (`'charge'`, `popularity`, `requires: ['charge']`); the charge's reallocated-slack bite ✓ (M3 `sideEffects` on the charge lever, `unless` walking distance); pledges ✓; Act II unlock ✓ (`unlock.when: { flag: 'office' }` plus `ActDef.chair`) | §§1, 2.3, 5, 6 |
| Content: Plenty | hidden flow ✓ (`hiddenFlow`, `returnShareMul`); two gauges ✓ (`SectorDerived.water`); regime label ✓; caps on applied/consumed ✓ (`basis`); consumption cap visible with an Institution ✓ (`requires: [inst id]`, existing); the drip subsidy ✓ (`'subsidy'`, `targets`); the unlicensed-wells rung on a cap ✓ (`escape` on a cap); its robust rung "on the right gauge" ✓ (`closedBy: { owns: 'plenty.consumptionCap' }`); a stock resource with alpha pumping cost ✓ (existing 'stock'); opening in Ministry 3 mid-run ✓ (`{ stat: 'ministries', op: '>=', value: 3 }` + `openFor`-style window via 'time'); ◇ Plenty's pressure (nitrogen) fed by consumed R is a simplification: if the lane wants it fed by applied, add `hiddenFlow.pressureOn?: 'applied'` (cheap) | §7 |
| Content: prestige | ChairDef ✓, RivalDef ✓, PledgeDef ✓, Statecraft ✓ (`KnowhowDef.when`, tree holder), the transfer ✓ (`holder: 'rival'`), Institutions granting Inspectors ✓ (`inspectorAdd`), the Water Resources Board ✓ (a plain Institution), the Independent Statistics Board ✓ (`certify`), Articles ✓, playbooks ✓ (`quietYearsAdd`, `rivalCostMul`), Standing inspection ✓ (`orderUnlock 'inspection'`), features ✓; ◇ whether Institution "unlocked, level 0" needs a lint change (it should: the lint must accept 0) | §§8, 9, 14 |
| Text | five cast ✓ (CastDef); Pryce's letters with stance ✓; wagers on concealment ✓ (stats); a wager a Parliament ✓ (`parliamentWagers`); the Take office texts, prospectus and file ✓ (`OfficeDef.text`); ordinal times ✓ (content/words.ts formats `{t:n}`); headlines for every new key ✓; Archive notes on loopholes, pledges, Articles ✓ (`owns` resolution, §11; ArchiveDef subject rules gain those kinds); ◇ the Minister's handover letter is a card in `OfficeDef.text`, not a dispatch (so it cannot be defaulted away) | §§1, 10, 11 |
| UI | everything in §12 ✓; the sealed postcard ✓ (`sealed`); Pryce's order book ✓ (`UpgradeView.byRival`); the "as reported" label ✓ (`reportedR`, `inspectedUntil`); the uncertified decade ✓ (`decadesCertified`); the Ministry frame state ✓ (`Derived.chair`, `inOpposition`); Take office sequence ✓ (`officeOffer`, events); ◇ the election sheet needs "seconds to polling" (✓ `pollIn`) and whether the offer can be re-drawn (no) | §12 |
| Scene | hoardings, court notices, props, curtains, inspector walk ✓ (views and events); Plenty's water table and two flows ✓ (`water`); the capstone under Pryce ✓ (`rival` on capstoned SectorDerived) | §12 |
| Audio | events ✓ | §11 |
| Balance | regulator bots ✓; profile grid ✓ (harness writes `meta.office.profile`); Precedent and Hindsight terms ✓; certified decades ✓ (RunStats); Treasury income ✓ (ChairView.treasury) | §§11, 12, 15 |

Gaps M4 had that I checked for specifically: a stat the letters need (✓ concealment, yearsSinceInspection, confidence,
parliamentWagers); a feed acting on demand rather than cost (here: loopholes acting on demand ✓ through rung effects on
the exempt app, not only on η); a rule that fills the room left (here: Pryce re-answers after an amendment ✓, so closing
a rung opens the next at once); a Hindsight term letters can stake (✓ `hindsightShare` unchanged); fixtures committed
(briefs).

---

## 17. Left out, and why

`'offshore'` and `'capture'` responses, `setIndependence`, Abroad, `abroadR` / `consumptionR`, the `ban` and
`borderAdjust` kinds (M6); public research; land as a bounded stock; per-Parliament rung resets by an incoming
government (rungs stay as they are in Opposition: simpler, and Opposition already repeals a lever); Pryce's own
Know-how purchases (his head start is fixed per Ministry); elections influenced by the calendar (no real-world dates).

---

## 18. Foresight for M6 (The Second Ledger) and M7 (The Inheritance)

**M6.**
1. `ResponseKind` is an open union; the response table is content. `'offshore'` (cheapest when Abroad's price gap
   beats the transport premium) and `'capture'` (an Institution's Independence below a threshold) are added by content
   and one core function each; the answer line shows them with no UI change beyond a label.
2. `SectorDerived.reportedR` is the first of three readings; M6 adds `consumptionR` (home plus Abroad for home) and
   `abroadR`. Keep every gauge's label from the view, not hard-coded, so "as consumed" is a content string.
3. Ladders' third rungs ("credits from Abroad", "produce imported") are LoopholeDefs whose `when` needs Abroad: no
   contract change.
4. The Act II ending is scored on the consumption ledger: `ActDef.ending` gains `ledger?: 'consumption'` in M6; M5's
   ending code must read R through one helper (`ledgerR`) so that change is one place.
5. Comfort and Freight & Flight join Act II as chair sectors: nothing in M5 may assume two chair sectors (loops over
   `rival` sectors; coverage divides by the count).

**M7.**
1. Articles and playbooks live in `meta`, not in `meta.world`: they are the player's and Pryce's knowledge, which the
   Inheritance keeps (Know-how is inherited whole). Pryce's run state (`chair.rival`) is run-scoped and rebuilt each
   Ministry by `inherit.ts`, so M7 can hand an heir's profile on in that one place (`office.profile` → a generation's).
2. The capstone's concealment is run-scoped (reset each Ministry); M7 may make it world-scoped (decay that carries)
   through `meta.world` only.
3. `ReckoningCause` 'defeated' and M7's 'generation' coexist; no exhaustive switch.
4. The Treaty and Long Now resets each go through one function (`chair/office.ts`'s reset helper); M7's Hand over
   calls the same helper with a different keep-list.
5. `office.record` is the template for Bequest's accounting (terms accumulated across runs, paid at a reset).
