/**
 * M5 dispatches: the Ministry's letters (design/m5-design.md §§6.10, 9.3). Written to the Minister, not the proprietor:
 * every letter here waits for office ({ flag: 'office' }, through its writer's `when`), and the Act I cast stop writing
 * once office is taken (cast.ts). Sir Edmund Pryce (eleven here; his Plenty letter is in plenty.ts), the Permanent
 * Secretary (four), the Chief Inspector (three) and the Leader of the Opposition (two). Append, never reorder.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 *
 * WAGERS, AND A WAGER EVERY PARLIAMENT. Every wager is a bet on something the page shows before the player answers; the
 * comment above each says what a thinking player reads, and where. Two kinds:
 *   - From the first Ministry (no inspection yet): bets on what the Ministry window shows at once: Motion's clear-sky
 *     mark, its budget gauge against its line, Confidence on the masthead, a rung's state on the mileage rule's card.
 *   - From the second (feature 'inspection'): bets on the truth behind Pryce's returns (StatKey 'concealment', the TRUE
 *     share). The page shows what decides it: the Industry's "Last inspected {year}" (or "Never inspected"), Pryce's
 *     articles on his panel ("his returns slip only where no Inspector has called for {n} years"), and, for ten years
 *     after an inspection, the true figure beside the return. Concealment is 0 inside the quiet period after an
 *     inspection (criterion 6, exact) and ramps 2% a year after it, so "within 5% of the truth" holds for about two
 *     years past the quiet period. A Ministry that has inspected lately wins; one that never has, loses.
 * Every non-wager letter of the Ministry waits for a wager to have been answered by the player this Parliament
 * (PARLIAMENT_WAGERED), so the first letter of every Parliament is a wager while any is left to draw: the abstaining,
 * the hawkish and the stewarding Ministry all meet one (design §9.3; core findings: "every regulator style meets at
 * least one wager letter a Parliament"). With no repeats inside a run, the guarantee lasts as long as the wagers do:
 * five open in the first Ministry, twelve from the second, fourteen with Plenty (see the progress note).
 * Stakes: as M4's finish, ±2.2% of the run's Hindsight (kit.ts stake), plus a small effect each way. Every wager arm is
 * staked (a `cost`) and is never the default; every Pryce arm carries a `stance` (the rival's `pliant` reading).
 */
import type { Cond, DispatchDef, EffectDef, SectorId, StatKey } from '../../types';
import {
  all, any, BUDGET, cash, forbid, forbidKind, half, income, mandate, mrate, not, sat, smoke, stake, timed, wellbeing,
  WAGER_LOSE, WAGER_WIN,
} from './kit';

const M = 'motion';

/* ---- conditions ---- */
const st = (stat: StatKey, sector: SectorId, op: '<' | '<=' | '>' | '>=', value: number, label?: string): Cond =>
  (label ? { stat, sector, op, value, label } : { stat, sector, op, value });
const gst = (stat: StatKey, op: '<' | '<=' | '>' | '>=', value: number, label?: string): Cond =>
  (label ? { stat, op, value, label } : { stat, op, value });
/** A wager has been answered by the player this Parliament: the Ministry's ordinary letters wait for it. */
const PARLIAMENT_WAGERED: Cond = gst('parliamentWagers', '>=', 1);
/** The Chair has arrived (the Ministry's own feature: it implies office for the lint's run count). */
const CHAIR: Cond = { feature: 'chair' };
/** In office, not in Opposition (most letters are to a sitting Ministry). */
const SITTING: Cond = all(CHAIR, gst('inOpposition', '<', 1, 'In office'));
/* Systems from Act I that every Ministry has (named in a letter only with their feature, as the lint asks). */
const SETTLED: Cond = { feature: 'settlement' };
const COMMONS: Cond = { feature: 'commons' };
const INSPECTION: Cond = { feature: 'inspection' };
const TREASURY: Cond = { feature: 'treasury' };
const LOOPHOLES: Cond = { feature: 'loopholes' };
const CHARGE: Cond = { feature: 'charge' };
/** The concealed share in `s` is under `v` (the TRUE share). */
const HONEST = (s: SectorId, v: number, label: string): Cond => st('concealment', s, '<', v, label);
const LIGHT_TRUCKS = 'motion.mileage.lightTrucks';

/* ---- M5 effects (not in kit.ts) ---- */
const confidence = (value: number): EffectDef => ({ type: 'confidenceAdd', value });
const inspectors = (value: number): EffectDef => ({ type: 'inspectorAdd', value });
const quiet = (value: number): EffectDef => ({ type: 'quietYearsAdd', value });
const fines = (value: number): EffectDef => ({ type: 'fineMul', value });
const drafting = (value: number): EffectDef => ({ type: 'amendYearsMul', value });
const lobbyCheaper = (value: number): EffectDef => ({ type: 'rivalCostMul', response: 'lobby', value });

export const chairDispatches: DispatchDef[] = [
  /* ================================================================ */
  /* Sir Edmund Pryce: the first Ministry (no inspection yet)          */
  /* ================================================================ */
  {
    id: 'd.chair.pryceVoluntary', cast: 'pryceChair', sector: M, when: all(SITTING, BUDGET), weight: 2,
    headline: 'Sir Edmund Pryce offers a voluntary agreement on the motor fleet',
    body:
      'The Ministry’s concern for the fleet’s economy does it credit, and the motor trade shares it. In place of a ' +
      'rule, Pryce Consolidated offers an agreement: the fleet’s economy improved by the trade’s own efforts, reported ' +
      'each year, and no standard for ten years while it is. It is cheaper for everyone, and it is in the national ' +
      'interest. With every good wish for the Ministry.',
    arms: [
      {
        stance: 'refuse',
        label: 'Keep the rule in reserve',
        outcome: 'Sir Edmund regrets the decision in a speech to the motor show, warmly.',
        price: 'The motor trade’s goodwill, for a season',
        modifier: timed(8, mrate(0.94)),
      },
      {
        stance: 'accept',
        label: 'Sign the agreement',
        outcome: 'The agreement is signed at the motor show, and the fleet’s economy is reported each year.',
        price: 'Mandate, and no mileage rule for ten years',
        cost: { mandate: 40 },
        modifier: timed(10, forbid('motion.mileageRule')),
        /*
         * READS: Motion's budget gauge against its line (the Industry row). With a tenth of room an agreement is enough
         * for a decade; without a line, or with less room, it is a promise the fleet will not keep.
         */
        wager: {
          when: st('budgetHeadroom', M, '>=', 0.1, 'Motion a tenth inside its line'),
          hint: 'Pays if Motion is a tenth or more inside its line',
          win: {
            outcome: 'Motion had room: the fleet keeps the agreement, and nobody has to enforce it.',
            effects: [stake(WAGER_WIN), confidence(3)],
            reply: 'Motor trade keeps its word; the fleet within bounds',
          },
          lose: {
            outcome: 'Motion had none: the fleet’s economy improves, and the miles driven improve faster.',
            effects: [stake(WAGER_LOSE), smoke(M, 0.04)],
            modifier: timed(10, sat(M, 1.06)),
            reply: 'Voluntary agreement kept to the letter; the traffic grows',
          },
        },
      },
    ],
    rebound: 'A voluntary agreement on economy: the economy is delivered, and spent on miles',
  },
  {
    id: 'd.chair.pryceClosure', cast: 'pryceChair', sector: M, when: SITTING,
    headline: 'Pryce Consolidated may close its Midland works, Sir Edmund writes',
    body:
      'The Ministry is right to think about the price of petrol, and so are the four thousand men at the Midland works. ' +
      'Another rise in the duty and the works will not pay; the company would close it with the greatest regret. Hold ' +
      'the duty for a Parliament and the works stays open. I put the figures before the Ministry, as it would wish.',
    arms: [
      {
        stance: 'refuse',
        label: 'Leave the duty open',
        outcome: 'The works stays open for now, and Sir Edmund repeats the figure at every opportunity.',
        price: 'Four thousand men, in the papers',
        effects: [mandate(-20)],
      },
      {
        stance: 'accept',
        label: 'Hold the duty',
        outcome: 'The duty is held for ten years, and the Midland works takes on three hundred men.',
        price: 'Mandate, and no duty rise for ten years',
        cost: { mandate: 30 },
        modifier: timed(10, forbidKind('duty', M)),
        /*
         * READS: Motion's clear-sky mark on its pressure gauge. A clear sky can take ten years of cheaper petrol; a
         * smoky one is brought nearer The Summer Smog.
         */
        wager: {
          when: st('clear', M, '>=', 1, 'Motion’s sky clear'),
          hint: 'Pays if Motion’s sky is clear when the duty is held',
          win: {
            outcome: 'The sky had room: the works stays open, the air stays clean, and the town says so at the polls.',
            effects: [stake(WAGER_WIN), confidence(4)],
            reply: 'Midland works saved; the skies over the ring road hold',
          },
          lose: {
            outcome: 'The sky had none: the jobs are saved, and the haze over the ring road thickens all summer.',
            effects: [stake(WAGER_LOSE), smoke(M, 0.05)],
            modifier: timed(10, sat(M, 1.05)),
            reply: 'Duty held, jobs saved, and the haze on the ring road thickens',
          },
        },
      },
    ],
    rebound: 'A price held to save jobs: the jobs are real, and so are the extra miles',
  },
  {
    id: 'd.chair.pryceStatement', cast: 'pryceChair', sector: M, when: SITTING,
    headline: 'Sir Edmund proposes a joint statement on the motor trade’s prospects',
    body:
      'A Ministry and an industry that speak with one voice reassure the country. I propose a joint statement: the ' +
      'motor trade is sound, the roads are safe in the Ministry’s hands, and the air will look after itself. The ' +
      'company will pay for the advertisements. It would be a pity to issue it in a bad summer, of course.',
    arms: [
      {
        stance: 'refuse',
        label: 'Speak for the Ministry alone',
        outcome: 'The Ministry issues its own statement, which is shorter and costs the Treasury the advertisements.',
        price: 'The advertisements, at the public expense',
        effects: [cash(-20)],
      },
      {
        stance: 'accept',
        label: 'Issue it jointly',
        outcome: 'The joint statement runs in every paper, beside a photograph of a clear motorway.',
        price: 'Mandate, and the Ministry’s name beside his',
        cost: { mandate: 30 },
        /*
         * READS: Motion's crisis record this Ministry (the news and the Industry row's crisis count). A statement that
         * the air will look after itself survives a Ministry with no Summer Smog behind it, and not one with.
         */
        wager: {
          when: st('crises', M, '<', 1, 'No crisis in Motion this Ministry'),
          hint: 'Pays if Motion has had no crisis this Ministry',
          win: {
            outcome: 'Nobody remembers a bad summer, and the statement reads as plain good sense.',
            effects: [stake(WAGER_WIN), confidence(4)],
            reply: 'Ministry and motor trade agree; the country is reassured',
          },
          lose: {
            outcome: 'Everybody remembers the smog, and the statement is reprinted under it.',
            effects: [stake(WAGER_LOSE), confidence(-5)],
            reply: 'Joint statement reprinted beside last summer’s smog',
          },
        },
      },
    ],
    rebound: 'Reassurance: a public told the air will look after itself drives as if it will',
  },
  {
    id: 'd.chair.pryceVanCap', cast: 'pryceChair', sector: M, when: all(SITTING, LOOPHOLES, any({ loophole: LIGHT_TRUCKS, status: 'open' }, { loophole: LIGHT_TRUCKS, status: 'used' })),
    headline: 'Pryce Consolidated offers to limit its van sales of its own accord',
    body:
      'The Ministry has noticed the light vans, and so has the company. Rather than an amendment, which would take ' +
      'years and Parliament’s patience, Pryce Consolidated offers to hold its van sales where they are, of its own ' +
      'accord. The offer stands as long as the Ministry drafts nothing. The van is a fine vehicle, but the company is ' +
      'reasonable.',
    arms: [
      {
        stance: 'refuse',
        label: 'Draft the amendment',
        outcome: 'The Ministry keeps its drafting option, and Sir Edmund keeps his vans.',
        price: 'The motor trade’s patience',
        modifier: timed(8, income(0.96, M)),
      },
      {
        stance: 'accept',
        label: 'Take his word on the vans',
        outcome: 'Van sales are held by agreement, and the drafting is put away.',
        price: 'Mandate, and slower drafting for ten years',
        cost: { mandate: 30 },
        modifier: timed(10, drafting(1.25)),
        /*
         * READS: the mileage rule's card, its ladder ("Light trucks: In use by Pryce" or "Open"). A promise to hold van
         * sales is worth something while he is not yet using the rung; once he is, the vans are already sold.
         */
        wager: {
          when: not({ loophole: LIGHT_TRUCKS, status: 'used', label: 'Pryce using the light-truck loophole' }),
          hint: 'Pays if Pryce is not already using the light-truck loophole',
          win: {
            outcome: 'The vans were not yet selling: the agreement holds them where they are, and the drafting waits.',
            effects: [stake(WAGER_WIN), mandate(40)],
            reply: 'Pryce holds van sales of its own accord',
          },
          lose: {
            outcome: 'The vans were already selling: the agreement holds them at a great many.',
            effects: [stake(WAGER_LOSE), smoke(M, 0.04)],
            modifier: timed(10, sat(M, 1.06, 'motion.lightTrucks')),
            reply: 'Van sales held by agreement, at their highest ever',
          },
        },
      },
    ],
    rebound: 'Boundary migration: the rule binds the car, and the demand moves to the vehicle it does not cover',
  },

  /* ================================================================ */
  /* Sir Edmund Pryce: once there are Inspectors (from Ministry 2)     */
  /* ================================================================ */
  {
    id: 'd.chair.pryceMonthly', cast: 'pryceChair', sector: M, when: all(SITTING, INSPECTION), weight: 2,
    headline: 'Sir Edmund offers monthly returns, if the Inspectors call less often',
    body:
      'The Inspectors are always welcome at Pryce Consolidated, and always busy. The company proposes to save them the ' +
      'journey: returns for the motor trade every month instead of every year, in exchange for a longer interval ' +
      'between visits. The Ministry will have more figures than ever. I can think of no fairer arrangement.',
    arms: [
      {
        stance: 'refuse',
        label: 'Keep the visits as they are',
        outcome: 'The Inspectors keep calling, and the returns keep arriving yearly, punctually.',
        price: 'Sir Edmund’s offer, and his good humour',
        modifier: timed(8, income(0.96, M)),
      },
      {
        stance: 'accept',
        label: 'Take the monthly returns',
        outcome: 'Monthly returns arrive, beautifully bound, and the Inspectors call less often.',
        price: 'Mandate, and his returns free to slip sooner',
        cost: { mandate: 30 },
        modifier: timed(10, quiet(-2)),
        /*
         * READS: Motion's "Last inspected {year}" against Pryce's quiet period (his articles, on his panel), or the
         * true figure beside the return while an inspection is in force. Inspected lately: the returns are honest and
         * monthly figures are worth having. Not for years: they are monthly, and wrong.
         */
        wager: {
          when: HONEST(M, 0.05, 'Motion’s returns within 5% of the truth'),
          hint: 'Pays if Pryce’s Motion returns are within 5% of the truth now',
          win: {
            outcome: 'The returns were honest: the monthly figures are good ones, and the Inspectors are spared a journey.',
            effects: [stake(WAGER_WIN), mandate(40)],
            reply: 'Pryce’s monthly returns found accurate to the gallon',
          },
          lose: {
            outcome: 'The returns were not: the Ministry now receives twelve wrong figures a year instead of one.',
            effects: [stake(WAGER_LOSE), confidence(-4)],
            reply: 'Pryce files monthly returns; each a little low',
          },
        },
      },
    ],
    rebound: 'Self-reporting: more figures, filed by the party they measure',
  },
  {
    id: 'd.chair.pryceLaboratory', cast: 'pryceChair', sector: 'iron', when: all(SITTING, INSPECTION, SETTLED),
    headline: 'Pryce Consolidated would give the Inspectors a laboratory',
    body:
      'My grandfather’s furnaces at Ravensdale have been settled longer than anyone at the Ministry has been in office. ' +
      'The company would like to give the Inspectorate a laboratory there, fully fitted, in his memory. It asks only ' +
      'that the Ravensdale returns be accepted as filed while the building goes up. The company has nothing to hide.',
    arms: [
      {
        stance: 'refuse',
        label: 'Decline the laboratory',
        outcome: 'The Inspectorate makes do with its old bench, and Sir Edmund endows a hospital wing instead.',
        price: 'A laboratory the Inspectorate could have had',
        modifier: timed(8, mrate(0.95)),
      },
      {
        stance: 'accept',
        label: 'Accept the laboratory',
        outcome: 'The laboratory goes up at Ravensdale, with his grandfather’s portrait in the hall.',
        price: 'Mandate, and Ravensdale’s returns taken as filed',
        cost: { mandate: 40 },
        modifier: timed(10, quiet(-2)),
        /*
         * READS: the Coal Age group's folded rows ("Settled 1913 · last inspected …" for Iron & Steel). A works
         * inspected inside its quiet period hides nothing, and the laboratory is a gift; one never inspected has had
         * years to slip.
         */
        wager: {
          when: HONEST('iron', 0.02, 'Iron & Steel’s returns honest'),
          hint: 'Pays if Iron & Steel’s returns hide nothing now',
          win: {
            outcome: 'Ravensdale hid nothing: the laboratory is a gift, and the Inspectorate uses it on everyone else.',
            effects: [stake(WAGER_WIN)],
            modifier: timed(10, inspectors(1)),
            reply: 'Inspectorate opens its Ravensdale laboratory',
          },
          lose: {
            outcome: 'Ravensdale had been slipping: the laboratory’s first sample is from its own chimney.',
            effects: [stake(WAGER_LOSE), confidence(-4)],
            reply: 'Ravensdale laboratory’s first finding: Ravensdale',
          },
        },
      },
    ],
    rebound: 'An inspector housed by the inspected: the gift is real, and so is the interval',
  },
  {
    id: 'd.chair.pryceCollieries', cast: 'pryceChair', sector: 'steam', when: all(SITTING, INSPECTION, SETTLED),
    headline: 'Sir Edmund asks that the colliery returns be taken as read',
    body:
      'The collieries of the Coal Age have been settled for two generations, and their returns are as dull as a ' +
      'Settlement Act could wish. The company asks that they be taken as read for a decade, so that the Inspectors may ' +
      'spend their time on the motor trade, where the Ministry’s interest lies. It is a practical suggestion.',
    arms: [
      {
        stance: 'refuse',
        label: 'Keep inspecting the pits',
        outcome: 'The Inspectors keep calling at the collieries, and find the winding engines in order.',
        price: 'An Inspector’s time at the pits',
        modifier: timed(8, income(0.97)),
      },
      {
        stance: 'accept',
        label: 'Take the returns as read',
        outcome: 'The colliery returns are taken as read for a decade, and the Inspectors go to the motor trade.',
        price: 'Mandate, and the pits unwatched for a decade',
        cost: { mandate: 30 },
        modifier: timed(10, quiet(-2)),
        /*
         * READS: Steam's folded row ("Settled … · last inspected …") against Pryce's quiet period. Recently inspected:
         * honest, and a decade's trust costs little. Never: the settled row has been creeping for years already.
         */
        wager: {
          when: HONEST('steam', 0.05, 'Steam’s returns within 5% of the truth'),
          hint: 'Pays if the colliery returns are within 5% of the truth now',
          win: {
            outcome: 'The collieries were as dull as advertised, and the Inspectors find plenty in the motor trade.',
            effects: [stake(WAGER_WIN), mandate(40)],
            reply: 'Colliery returns taken as read; nothing to read',
          },
          lose: {
            outcome: 'The collieries had been burning above their settlement for years, and now have a decade more.',
            effects: [stake(WAGER_LOSE), smoke('steam', 0.04)],
            reply: 'Settled collieries found smoking above their settlement',
          },
        },
      },
    ],
    rebound: 'A settlement left unwatched: the settled figure is a return, not a sky',
  },
  {
    id: 'd.chair.pryceDecade', cast: 'pryceChair', sector: M, when: all(SITTING, INSPECTION, BUDGET),
    headline: 'Pryce Consolidated reports Motion inside its line, and asks for credit',
    body:
      'The company’s returns show the motor trade inside the Ministry’s line for the decade, which I am sure will ' +
      'please the Ministry as much as it pleases the board. I ask that the Ministry say so publicly, and credit the ' +
      'trade’s own efforts with a lighter year at the tax office. The figures are attached, and signed.',
    arms: [
      {
        stance: 'refuse',
        label: 'Await the Inspectors',
        outcome: 'The Ministry thanks the company for its figures and sends them to the Inspectorate.',
        price: 'Sir Edmund’s patience',
        modifier: timed(8, mrate(0.95)),
      },
      {
        stance: 'accept',
        label: 'Credit the trade publicly',
        outcome: 'The Minister praises the motor trade at the dispatch box, and the tax office is lenient for a year.',
        price: 'Mandate, and a year’s lenience at the tax office',
        cost: { mandate: 30, capitalSeconds: 20 },
        /*
         * READS: Motion's budget gauge as reported, and whether the true figure is shown beside it (an inspection in
         * force) or how long since the last one. The wager is on the TRUE burn against the line, not the return.
         */
        wager: {
          when: st('budgetHeadroom', M, '>=', 0, 'Motion truly inside its line'),
          hint: 'Pays if Motion is truly inside its line, not only on the return',
          win: {
            outcome: 'The return was the truth: the trade is inside its line, and the praise is deserved.',
            effects: [stake(WAGER_WIN), confidence(4)],
            reply: 'Motor trade inside its line, and the Inspectors agree',
          },
          lose: {
            outcome: 'The return was not: the Minister has praised a figure the sky disowns.',
            effects: [stake(WAGER_LOSE), confidence(-5)],
            reply: 'Minister praised Pryce’s figures; the sky disagrees',
          },
        },
      },
    ],
    rebound: 'A figure reported by the party it measures: the line is kept on paper',
  },
  {
    id: 'd.chair.pryceSelfCertify', cast: 'pryceChair', sector: 'light', when: all(SITTING, INSPECTION),
    headline: 'Sir Edmund proposes the power stations certify their own returns',
    body:
      'The company’s power stations employ more qualified engineers than the Inspectorate does, which is no criticism ' +
      'of the Inspectorate. Let the stations certify their own returns, under an engineer’s signature, and let the ' +
      'Inspectors spend the time where it is needed. A signature is a serious thing in our profession.',
    arms: [
      {
        stance: 'refuse',
        label: 'Keep the Inspectors on it',
        outcome: 'The Inspectors keep their visits to the power stations, and the engineers keep signing for them.',
        price: 'An Inspector’s time at the stations',
        modifier: timed(8, income(0.97)),
      },
      {
        stance: 'accept',
        label: 'Accept their signatures',
        outcome: 'The stations certify their own returns, each signed by a chartered engineer.',
        price: 'Mandate, and lighter fines for ten years',
        cost: { mandate: 30 },
        modifier: timed(10, fines(0.8)),
        /*
         * READS: Light's folded row ("last inspected …") against the quiet period. A station inspected lately signs an
         * honest return; one left alone signs whatever the board sends down.
         */
        wager: {
          when: HONEST('light', 0.05, 'Light’s returns within 5% of the truth'),
          hint: 'Pays if Light’s returns are within 5% of the truth now',
          win: {
            outcome: 'The stations were honest, and their engineers sign honest returns.',
            effects: [stake(WAGER_WIN), mandate(40)],
            reply: 'Power stations certify their own returns, correctly',
          },
          lose: {
            outcome: 'The stations were not, and the returns now carry an engineer’s signature as well.',
            effects: [stake(WAGER_LOSE), confidence(-4)],
            reply: 'Signed returns from the power stations; signed, and low',
          },
        },
      },
    ],
    rebound: 'Self-certification: the signature is real, and so is the employer',
  },

  /* ---- Sir Edmund: ordinary letters (after a wager this Parliament) ---- */
  {
    id: 'd.chair.pryceLaboratoryRoads', cast: 'pryceChair', sector: M, when: all(SITTING, PARLIAMENT_WAGERED),
    headline: 'Pryce Consolidated would endow a road research laboratory',
    body:
      'Better roads, better engines and better tyres are the surest way to economy, and the company would like to ' +
      'endow a laboratory to find them: a test track, a wind tunnel and a staff of thirty. Every saving it finds will ' +
      'be published for the whole trade. The Ministry need only open it.',
    arms: [
      {
        stance: 'refuse',
        label: 'Leave research to the trade',
        outcome: 'The company builds its test track anyway, and keeps what it finds.',
        price: 'The laboratory’s name over the Ministry’s door',
        modifier: timed(8, mrate(0.95)),
      },
      {
        stance: 'accept',
        label: 'Open the laboratory',
        outcome: 'The laboratory opens, finds a better engine in its first year, and the trade fits it at once.',
        price: 'Mandate, and cheaper miles for ten years',
        cost: { mandate: 30 },
        effects: [mandate(60)],
        modifier: timed(10, half(M, 0.94), sat(M, 1.04)),
        reply: 'Road research laboratory opens; the miles get cheaper',
      },
    ],
    rebound: 'Research for economy: each mile cheaper, and so more of them',
  },
  {
    id: 'd.chair.pryceCompensation', cast: 'pryceChair', sector: M, when: all(SITTING, TREASURY, PARLIAMENT_WAGERED),
    headline: 'Sir Edmund would keep a plant open, if the Treasury paid wages',
    body:
      'The body plant at the old aerodrome no longer pays, what with the Ministry’s rules, and the company must close ' +
      'it. Unless, of course, the Treasury cared to meet the wages for a few years while the market recovers. The men ' +
      'would be grateful, and so would their Members. I mention it only because the Ministry likes to be told.',
    arms: [
      {
        stance: 'refuse',
        label: 'Let the plant close',
        outcome: 'The plant closes, and its men write to their Members.',
        price: 'Confidence, in the towns that had the plant',
        modifier: timed(8, mrate(0.92)),
      },
      {
        stance: 'accept',
        label: 'Meet the wages',
        outcome: 'The Treasury meets the wages, the plant stays open, and it builds more cars than ever.',
        price: '£ from the Treasury, and the cars the plant builds',
        cost: { capitalSeconds: 40 },
        effects: [confidence(4)],
        modifier: timed(10, sat(M, 1.05)),
        reply: 'Treasury saves the body plant; it builds more cars than ever',
      },
    ],
    rebound: 'Jobs kept by subsidy: the plant is saved, and so is its output',
  },
  {
    id: 'd.chair.pryceCommiserates', cast: 'pryceChair', sector: M, when: all(CHAIR, gst('inOpposition', '>=', 1, 'In Opposition')),
    headline: 'Sir Edmund writes to the Minister in Opposition',
    body:
      'Please accept the company’s sympathy on the result. Pryce Consolidated works with every government, and will ' +
      'be glad to work with the Minister’s again; in the meantime the new Ministry has asked our advice on the motor ' +
      'trade, and we have given it. If the Minister would care to soften the Opposition’s stance on the duty, the company ' +
      'would not forget it.',
    arms: [
      {
        stance: 'refuse',
        label: 'Oppose as before',
        outcome: 'The Opposition keeps its stance on the duty, and Sir Edmund’s hoardings say so at every junction.',
        price: 'His hoardings, at every junction',
        modifier: timed(8, mrate(0.92)),
      },
      {
        stance: 'accept',
        label: 'Soften the stance',
        outcome: 'The Opposition softens its stance on the duty, and the company’s hoardings come down.',
        price: 'Mandate, and cheaper lobbying for him for ten years',
        cost: { mandate: 20 },
        effects: [confidence(5)],
        modifier: timed(10, lobbyCheaper(0.8)),
        reply: 'Opposition softens on the fuel duty; the hoardings come down',
      },
    ],
    rebound: 'A line softened in Opposition is the line he will lobby for in office',
  },

  /* ================================================================ */
  /* The Permanent Secretary                                           */
  /* ================================================================ */
  {
    id: 'd.chair.psDrafting', cast: 'permanentSecretary', when: all(SITTING, LOOPHOLES, PARLIAMENT_WAGERED),
    headline: 'Permanent Secretary’s minute: on drafting, and its pace',
    body:
      '1. The Minister has asked whether amendments could be drafted faster. 2. They could. 3. A second team of ' +
      'Parliamentary counsel would halve the time, at a cost in Mandate the Department would rather the Minister ' +
      'spent knowingly. 4. The present pace has served every Ministry since the war. 5. The Department notes this ' +
      'without comment.',
    arms: [
      {
        label: 'Keep the present pace',
        outcome: 'The Department drafts at the pace it always has, and the vans keep coming meanwhile.',
        price: 'Drafting time, as before',
        modifier: timed(8, mrate(0.96)),
      },
      {
        label: 'Engage a second team',
        outcome: 'A second team of counsel is engaged, and amendments arrive in half the time.',
        price: 'Mandate for the second team',
        cost: { mandate: 60 },
        modifier: timed(15, drafting(0.6)),
        reply: 'Ministry doubles its drafting staff; amendments sooner',
      },
    ],
    rebound: 'A loophole stays open while it is drafted shut: speed is a lever too',
  },
  {
    id: 'd.chair.psTreasury', cast: 'permanentSecretary', when: all(SITTING, TREASURY, COMMONS, PARLIAMENT_WAGERED),
    headline: 'Permanent Secretary’s minute: the Treasury’s view of the motor trade',
    body:
      '1. The Treasury observes that its income rises with Pryce Consolidated’s. 2. It asks that the Ministry bear ' +
      'this in mind. 3. The Department has borne it in mind. 4. The Treasury would welcome a year without a new rule ' +
      'on the motor trade, and offers a sum towards the Commons in exchange. 5. The sum is not large. Neither is the ' +
      'year.',
    arms: [
      {
        label: 'Note the Treasury’s view',
        outcome: 'The Treasury’s view is noted, filed and read by nobody, as usual.',
        price: 'The Treasury’s goodwill',
        modifier: timed(8, mrate(0.95)),
      },
      {
        label: 'Give the Treasury its year',
        outcome: 'No new rule on the motor trade this decade, and the Treasury’s sum arrives promptly.',
        price: 'No raised mileage rule or duty for ten years',
        effects: [cash(45)],
        modifier: timed(10, forbid('motion.mileageRule'), forbidKind('duty', M)),
        reply: 'Treasury buys a quiet decade for the motor trade',
      },
    ],
    rebound: 'A government paid by growth: restraint costs the Treasury, so the Treasury asks for less of it',
  },
  {
    id: 'd.chair.psStatistics', cast: 'permanentSecretary', when: all(SITTING, INSPECTION, COMMONS),
    headline: 'Permanent Secretary’s minute: the year’s levy, booked in advance',
    body:
      '1. The Treasury proposes to book the motor trade’s levy for the year on the company’s returns as filed, and to ' +
      'spend it in advance. 2. This saves a year. 3. It assumes the returns are right. 4. The Department expresses ' +
      'no view on the returns. 5. The Inspectorate, consulted, expressed one, which the Department has not minuted.',
    arms: [
      {
        label: 'Wait for the year’s end',
        outcome: 'The levy is booked when it is paid, and the Commons wait a year for it.',
        price: 'A year’s delay on the Commons',
        modifier: timed(8, mrate(0.96)),
      },
      {
        label: 'Book it on the returns',
        outcome: 'The year’s levy is booked on Pryce’s returns and spent at once on the Commons.',
        price: '£ advanced on the returns as filed',
        cost: { capitalSeconds: 30 },
        /*
         * READS: Motion's "Last inspected {year}" against Pryce's quiet period, or the true figure beside the return.
         * Honest returns: the advance is the levy. Slipping returns: the Treasury has spent money it will not get.
         */
        wager: {
          when: HONEST(M, 0.05, 'Motion’s returns within 5% of the truth'),
          hint: 'Pays if Pryce’s Motion returns are within 5% of the truth now',
          win: {
            outcome: 'The returns were right: the levy arrives as booked, and the Commons have it a year early.',
            effects: [stake(WAGER_WIN), cash(45)],
            reply: 'Levy booked in advance arrives to the penny',
          },
          lose: {
            outcome: 'The returns were low: the levy falls short of the booking, and the Treasury asks who signed it.',
            effects: [stake(WAGER_LOSE), mandate(-40)],
            reply: 'Motor levy falls short of the Treasury’s booking',
          },
        },
      },
    ],
    rebound: 'A budget written on a return: the shortfall is the concealment',
  },
  {
    id: 'd.chair.psManifesto', cast: 'permanentSecretary', when: all(SITTING, PARLIAMENT_WAGERED, gst('electionsWon', '>=', 1, 'An election won')),
    headline: 'Permanent Secretary’s minute: on promises, and their drafting',
    body:
      '1. The manifesto’s promises bind the Ministry for a Parliament. 2. The Department will honour them. 3. It ' +
      'could also, with notice, offer the Minister a wider choice at the next election, drafted so that fewer of them ' +
      'bind anything in particular. 4. This is called drafting. 5. It costs a little Mandate and a good deal of ' +
      'counsel’s time.',
    arms: [
      {
        label: 'Leave the manifesto be',
        outcome: 'The manifesto is drafted as before, three promises and two kept.',
        price: 'A narrower choice at the polls',
        modifier: timed(8, mrate(0.96)),
      },
      {
        label: 'Draft a wider choice',
        outcome: 'Counsel draft a fourth promise for every manifesto this Ministry, carefully vague.',
        price: 'Mandate for counsel’s time',
        cost: { mandate: 40 },
        effects: [{ type: 'pledgeOfferAdd', value: 1 }],
        reply: 'Manifesto grows a fourth promise, carefully worded',
      },
    ],
    rebound: 'A promise drafted to bind nothing binds nothing',
  },

  /* ================================================================ */
  /* The Chief Inspector                                               */
  /* ================================================================ */
  {
    id: 'd.chair.ciMotorCar', cast: 'chiefInspector', when: all(SITTING, INSPECTION, PARLIAMENT_WAGERED),
    headline: 'Chief Inspector asks for a second motor car for the district',
    body:
      'Minister. Two Inspectors, one motor car, nine works and a refinery forty miles off. The company knows our ' +
      'timetable better than we do. A second car would let us call when we are not expected. Cost: one car, one ' +
      'driver, petrol. The petrol is not lost on me. J.R.H.',
    arms: [
      {
        label: 'Make do with one',
        outcome: 'The Inspectors share the one car, and the company continues to expect them.',
        price: 'Visits the company sees coming',
        modifier: timed(8, mrate(0.96)),
      },
      {
        label: 'Buy the second car',
        outcome: 'A second car is bought, and the Inspectors begin to arrive on Thursdays.',
        price: '£ for a car, a driver and petrol',
        cost: { capitalSeconds: 30 },
        effects: [smoke(M, 0.01)],
        modifier: timed(15, quiet(1)),
        reply: 'Inspectorate buys a second car; visits now unannounced',
      },
    ],
    rebound: 'An Inspector who is expected finds what he is expected to find',
  },
  {
    id: 'd.chair.ciRest', cast: 'chiefInspector', sector: M, when: all(SITTING, INSPECTION, COMMONS),
    headline: 'Chief Inspector would rest his men a season on the motor returns',
    body:
      'Minister. The men are tired and the motor returns look right. I could stand the district down for a season and ' +
      'take the returns as read, which saves a season’s wages for the Commons. Or not. I would look at when we last ' +
      'called before deciding. J.R.H.',
    arms: [
      {
        label: 'Keep them at it',
        outcome: 'The district keeps working, and the men take their leave in turns.',
        price: 'A season’s wages, and the men’s temper',
        effects: [cash(-15)],
      },
      {
        label: 'Rest the district',
        outcome: 'The district stands down for a season, and the motor returns are taken as read.',
        price: '£ withheld from the Commons until the season ends',
        cost: { capitalSeconds: 20 },
        /*
         * READS: Motion's "Last inspected {year}" against the quiet period (the letter says as much). The Inspector is
         * right to rest when the last call was recent; wrong when it was not.
         */
        wager: {
          when: HONEST(M, 0.02, 'Motion’s returns honest'),
          hint: 'Pays if Pryce’s Motion returns hide nothing now',
          win: {
            outcome: 'The returns were right, the men come back rested, and the season’s wages go to the Commons.',
            effects: [stake(WAGER_WIN), cash(40)],
            reply: 'Inspectorate rests a season; the motor returns held',
          },
          lose: {
            outcome: 'The returns were not, and a season’s quiet is a season’s more of it.',
            effects: [stake(WAGER_LOSE), smoke(M, 0.04)],
            reply: 'Inspectors rest; Pryce’s returns do not',
          },
        },
      },
    ],
    rebound: 'An unwatched return drifts: the quiet period is the concealment’s clock',
  },
  {
    id: 'd.chair.ciAlkali', cast: 'chiefInspector', when: all(SITTING, INSPECTION, PARLIAMENT_WAGERED), once: true,
    headline: 'Chief Inspector recalls the Alkali Inspectorate’s rule',
    body:
      'Minister. When I joined the Alkali Inspectorate the rule was that a works should not know our next visit, and ' +
      'that a fine should cost more than the saving. Neither rule is in force here. I should like the second one ' +
      'back. The first I can see to myself. J.R.H.',
    arms: [
      {
        label: 'Keep the fines as they are',
        outcome: 'The fines stay where they are, and the company prices them in as usual.',
        price: 'Fines the company can afford',
        modifier: timed(8, mrate(0.96)),
      },
      {
        label: 'Raise the fines',
        outcome: 'The fines are raised, and the company’s chief accountant asks to see the Chief Inspector.',
        price: 'Mandate, and Pryce’s lobbyists',
        cost: { mandate: 50 },
        modifier: timed(15, fines(1.5)),
        reply: 'Fines for under-reporting raised; Pryce asks for a meeting',
      },
    ],
    rebound: 'A fine smaller than the saving is a fee',
  },

  /* ================================================================ */
  /* The Leader of the Opposition                                      */
  /* ================================================================ */
  {
    id: 'd.chair.oppMotorway', cast: 'opposition', sector: M, when: SITTING,
    headline: 'Leader of the Opposition proposes a pact on the motorway programme',
    body:
      'The Opposition would support the Ministry’s road programme, without amendment, in return for a voice in where ' +
      'the roads go. The country likes a road, and the Opposition likes the country. I would only add that a pact is ' +
      'worth more to a Ministry that is ahead in the polls than to one that is behind.',
    arms: [
      {
        label: 'Go it alone',
        outcome: 'The Ministry keeps the programme to itself, and the Opposition opposes it at every reading.',
        price: 'The Opposition’s votes, and a longer debate',
        modifier: timed(8, mrate(0.94)),
      },
      {
        label: 'Make the pact',
        outcome: 'The pact is made, the programme passes, and both front benches cut the ribbons.',
        price: 'Mandate, and the roads the pact builds',
        cost: { mandate: 30 },
        modifier: timed(10, sat(M, 1.04)),
        /*
         * READS: Confidence on the masthead against the line at 50. Ahead, the Ministry takes the credit for the roads;
         * behind, the Opposition does.
         */
        wager: {
          when: gst('confidence', '>=', 50, 'Confidence at 50 or more'),
          hint: 'Pays if the Ministry stands at 50 or more in the polls',
          win: {
            outcome: 'The Ministry was ahead, and the voters thank the Ministry for the roads.',
            effects: [stake(WAGER_WIN), confidence(4)],
            reply: 'Motorway pact passes; the Ministry takes the credit',
          },
          lose: {
            outcome: 'The Ministry was behind, and the voters thank the Opposition for the roads.',
            effects: [stake(WAGER_LOSE), confidence(-4)],
            reply: 'Motorway pact passes; the Opposition takes the credit',
          },
        },
      },
    ],
    rebound: 'Induced traffic: a road built by agreement fills as fast as any other',
  },
  {
    id: 'd.chair.oppCharge', cast: 'opposition', sector: M, when: all(SITTING, CHARGE, PARLIAMENT_WAGERED),
    headline: 'Opposition would not oppose a charge, if households had it back',
    body:
      'The Opposition will not oppose a charge on driving into town, on one condition: that the money goes back to ' +
      'households, and is seen to. A charge the public gets back is a charge the public forgives, in time. I say this ' +
      'in confidence, and will deny it at the next election.',
    arms: [
      {
        label: 'Keep the charge in hand',
        outcome: 'The Ministry keeps its own counsel on the charge, and the Opposition keeps its powder dry.',
        price: 'The Opposition’s silence, unbought',
        modifier: timed(8, mrate(0.95)),
      },
      {
        label: 'Give the charge back',
        outcome: 'A rebate on the charge is paid to every household, and the Opposition holds its fire.',
        price: '£ from the Treasury for the rebate',
        cost: { capitalSeconds: 40 },
        effects: [confidence(6)],
        modifier: timed(10, wellbeing(1)),
        reply: 'Charge rebate for every household; the Opposition is quiet',
      },
    ],
    rebound: 'A charge returned to households: the price stays, and so does the support',
  },
  {
    id: 'd.chair.oppInspector', cast: 'opposition', when: all(SITTING, INSPECTION, PARLIAMENT_WAGERED),
    headline: 'Opposition would vote for another Inspector, for an admission',
    body:
      'The Opposition would support the money for a third Inspector, and say so from the front bench. In return the ' +
      'Minister would tell the House that the returns the Ministry relied on were not all they seemed. It is a small ' +
      'admission, and the House is generous to Ministers who make them. Once.',
    arms: [
      {
        label: 'Make no admission',
        outcome: 'The Ministry admits nothing, and the Inspectorate keeps the Inspectors it has.',
        price: 'A third Inspector, unfunded',
        modifier: timed(8, mrate(0.96)),
      },
      {
        label: 'Admit it to the House',
        outcome: 'The Minister makes the admission, the House is generous, and a third Inspector is appointed.',
        price: 'Confidence, for the admission',
        effects: [confidence(-4)],
        modifier: timed(15, inspectors(1)),
        reply: 'Minister admits the returns misled; a third Inspector appointed',
      },
    ],
    rebound: 'A return believed because it was filed: inspection is the only meter the measured do not read',
  },
];
