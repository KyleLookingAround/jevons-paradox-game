/**
 * Decade dividends (M2): every DividendDef, flat. A decade within budget offers a pair of these (the order is
 * helpers.ts DECADE_PAIRS for the global sequence, and each Industry's steady.decadeChoices for its own); the player
 * picks one. One-off amounts (mandateAdd, capitalAdd) are multiplied by the pace of the line (Gentle ×1 to Severe ×2.5),
 * so blurbs never quote a number. Standing effects stay for the rest of the run, once per time chosen.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 *
 * Rules (the lint checks them): no slotAdd (seats matter only between runs); an effect that names a sector names the
 * sector whose decade it is (sector dividends are listed under their Industry here and offered only in that Industry's own steady.decadeChoices,
 * written in sectors/<id>.ts); option
 * 0 of every pair is the modest one.
 */
import type { DividendDef } from '../types';
import { absorb, capCost, half, margin, reserve, sat } from './helpers';
/* M4: Iron's pairs are written in its own module (the Iron lane); registered here with the others. */
import { ironDividends } from './sectors/iron';

/* ------------------------------------------------------------------ */
/* GLOBAL PAIRS (no sector): the sequence every Industry shares        */
/* ------------------------------------------------------------------ */

/*
 * Magnitudes against M1's decade base (mandateAdd 60, capitalAdd 30 s of income, wellbeingAdd 0.3, on every decade):
 * a one-off option is worth one to three decades' base; a standing option is worth less at once and more by the end of
 * a long run. mandateRateMul and commonsYieldMul compound across picks (M2 balance: halved from the first guess; five
 * Industries offer each pair about 15 times in a long run, and 1.04¹⁵ × 1.03¹⁵ × 1.02¹⁵ made Mandate four times easier;
 * 1.05¹⁵ doubled the Commons).
 */
const globalDividends: DividendDef[] = [
  /* 1. The teaching pair: two shapes of the same money, both now. */
  {
    id: 'div.voteOfThanks', name: 'A vote of thanks',
    blurb: 'The House notes the decade with approval and a little political credit. Spend it on the next measure.',
    effects: [{ type: 'mandateAdd', value: 80 }],
  },
  {
    id: 'div.shareholders', name: 'A bonus to shareholders',
    blurb: 'The decade’s savings paid out to the people who own the works. They will want to buy another.',
    effects: [{ type: 'capitalAdd', value: 60 }],
  },
  /* 2. Standing against now. */
  {
    id: 'div.standingOrders', name: 'New standing orders',
    blurb: 'A rule of the House that makes the next measure a little easier to carry, for the rest of the run.',
    effects: [{ type: 'mandateRateMul', value: 1.02 }],
  },
  {
    id: 'div.windfall', name: 'A windfall to spend',
    blurb: 'A large sum of political credit at once. Easy come.',
    effects: [{ type: 'mandateAdd', value: 160 }],
  },
  /* 3. Wellbeing now against the Commons later (worth nothing until the Commons open, from the third run). */
  {
    id: 'div.holiday', name: 'A day’s holiday',
    blurb: 'A day off for every household, every year. People are a little happier, and a little more numerous.',
    effects: [{ type: 'wellbeingAdd', value: 0.5 }],
  },
  {
    id: 'div.commonsEndowment', name: 'Endow the Commons',
    blurb: 'Money set aside so that every Commons project yields more, for the rest of the run.',
    effects: [{ type: 'commonsYieldMul', value: 1.04 }],
    requires: 'commons',
  },
  /* 4. The demography pair: a later-marriage dividend against a feast. */
  {
    id: 'div.laterMarriage', name: 'Later marriages',
    blurb: 'Apprenticeships run longer and weddings wait. The town grows a little more slowly, and nobody is poorer.',
    effects: [{ type: 'popGrowthMul', value: 0.96 }],
  },
  {
    id: 'div.feast', name: 'A public feast',
    blurb: 'Roast ox in the market square and better wages after. Wellbeing up; the birth rate follows it.',
    effects: [{ type: 'wellbeingAdd', value: 0.8 }, { type: 'popGrowthMul', value: 1.03 }],
  },
  /* 5. A steady purse against cheaper improvements (the improvements, of course, rebound). */
  {
    id: 'div.sinkingFund', name: 'A sinking fund',
    blurb: 'Put the decade’s surplus aside and live on the interest. The Mandate comes a little easier for good.',
    effects: [{ type: 'mandateRateMul', value: 1.015 }, { type: 'mandateAdd', value: 40 }],
  },
  {
    id: 'div.patentOffice', name: 'Reform the Patent Office',
    blurb: 'Cheaper patents, faster grants. Every improvement costs less, and there are soon a great many more.',
    effects: [{ type: 'costMul', value: 0.95 }],
  },
  /* 6. Low-intensity wellbeing later against a boom now. */
  {
    id: 'div.gardenCity', name: 'A garden suburb',
    blurb: 'Houses round greens, built to last. The Commons yield more, and the commute to them is short.',
    effects: [{ type: 'commonsYieldMul', value: 1.02 }, { type: 'wellbeingAdd', value: 0.3 }],
    requires: 'commons',
  },
  {
    id: 'div.buildingBoom', name: 'A building boom',
    blurb: 'Speculative terraces on every field. A great deal of money now, and a great many tenants later.',
    effects: [{ type: 'capitalAdd', value: 150 }, { type: 'popGrowthMul', value: 1.05 }],
  },
  /* 7. The civic purse against a tax cut (the dividend spent). */
  {
    id: 'div.civicPurse', name: 'Fill the civic purse',
    blurb: 'The surplus kept by the corporation. Enough credit for a measure now, and the habit of saving.',
    effects: [{ type: 'mandateAdd', value: 90 }, { type: 'mandateRateMul', value: 1.01 }],
  },
  {
    id: 'div.remitRates', name: 'Remit the rates',
    blurb: 'Give the money back to the ratepayers. They spend it, on more of everything, and feel much better.',
    effects: [{ type: 'wellbeingAdd', value: 0.8 }, { type: 'popGrowthMul', value: 1.04 }],
  },
  /* 8. The sharpest: quiet years against a jubilee. */
  {
    id: 'div.quietYears', name: 'Ten quiet years',
    blurb: 'No celebration, no new scheme. A smaller town, a steadier one, and a little credit in the bank.',
    effects: [{ type: 'popGrowthMul', value: 0.94 }, { type: 'mandateAdd', value: 60 }],
  },
  {
    id: 'div.jubilee', name: 'A jubilee',
    blurb: 'Bunting, medals, a new clock tower and a half-holiday. Everyone remembers the decade fondly.',
    effects: [{ type: 'wellbeingAdd', value: 1 }, { type: 'capitalAdd', value: 80 }, { type: 'popGrowthMul', value: 1.06 }],
  },
];

/* ------------------------------------------------------------------ */
/* INDUSTRY PAIRS (each offered only in its own Industry's sequence)   */
/* ------------------------------------------------------------------ */

/*
 * absorptionAdd steps are small against each Industry's absorption (Steam 0.008; the Alkali Inspectorate adds 0.002 a
 * level): a quarter to a sixteenth of a level each, stacking per pick. Satiation steps (satMul < 1) are a habit on one
 * use; the opposing option is the same money spent (halfPriceMul > 1, marginAdd, cheaper capital), and says so.
 * Code has no absorption and must not gain any here (its clear skies come only from deletion).
 */
const sectorDividends: DividendDef[] = [
  /* ---- Steam ---- */
  {
    id: 'div.steam.pitheadBaths', name: 'Pit-head baths',
    blurb: 'Hot water at the shaft head, so the men walk home clean. Paid for out of the decade’s thrift.',
    effects: [{ type: 'wellbeingAdd', value: 0.6 }],
  },
  {
    id: 'div.steam.dividendInCoal', name: 'A dividend in coal',
    blurb: 'Paid in kind, from a seam the decade’s thrift has spared. There is more coal to burn, and it will be.',
    effects: [reserve('steam', 0.04)],
  },
  {
    id: 'div.steam.smokeFund', name: 'A smoke inspectors’ fund',
    blurb: 'Pays for men with notebooks downwind of the chimneys. The valley clears a shade faster.',
    effects: [absorb('steam', 0.0006)],
  },
  {
    id: 'div.steam.engineBounty', name: 'An engine-makers’ bounty',
    blurb: 'A prize for the cheapest sound engine. Engines cost less to build, and every pit orders another.',
    effects: [capCost('steam', 0.95)],
  },
  {
    id: 'div.steam.sabbath', name: 'Sunday trains withdrawn',
    blurb: 'The company keeps the Sabbath and the engines stand. Fewer journeys; nobody seems to mind much.',
    effects: [sat('steam', 0.96, 'steam.railways')],
  },
  {
    id: 'div.steam.cheapTickets', name: 'Cheap return tickets',
    blurb: 'The decade’s savings spent on fares. Excursions to the sea, and coal for every one of them.',
    effects: [half('steam', 1.05, 'steam.railways')],
  },

  /* ---- Light ---- */
  {
    id: 'div.light.earlyClosing', name: 'Early closing',
    blurb: 'Shops shut at seven, by agreement. The signs go dark with them, and the assistants go home.',
    effects: [sat('light', 0.95, 'light.shopSigns')],
  },
  {
    id: 'div.light.lateOpening', name: 'Late opening',
    blurb: 'The decade’s savings spent on a cheaper lighting tariff after dark. The shops stay open till ten.',
    effects: [half('light', 1.05, 'light.shopSigns')],
  },
  {
    id: 'div.light.fogWardens', name: 'Fog wardens',
    blurb: 'A rate for clean air: inspectors, smokeless grates, a little less soot in the gas. The fog lifts sooner.',
    effects: [absorb('light', 0.0006)],
  },
  {
    id: 'div.light.meterRebate', name: 'A rebate on the meter',
    blurb: 'Every household’s share returned as cheaper gas. A second lamp in the parlour, then a third.',
    effects: [half('light', 1.05, 'light.homes')],
  },

  /* ---- Motion ---- */
  {
    id: 'div.motion.carFreeSundays', name: 'Car-free Sundays',
    blurb: 'Once a week the motorways belong to cyclists and horses. The out-of-town shops open later.',
    effects: [sat('motion', 0.95, 'motion.shopping')],
  },
  {
    id: 'div.motion.roadFund', name: 'A road fund',
    blurb: 'The decade’s savings spent on roads. The suburbs move further out to use them.',
    effects: [half('motion', 1.05, 'motion.suburbs')],
  },
  {
    id: 'div.motion.treePlanting', name: 'Plant the verges',
    blurb: 'A tree for every mile of trunk road. The air clears a shade faster, and the verges look better too.',
    effects: [absorb('motion', 0.0005)],
  },
  {
    id: 'div.motion.motorShow', name: 'A motor show prize',
    blurb: 'A trophy for the cheapest family saloon. Cars cost less to build, and the drive is longer.',
    effects: [capCost('motion', 0.95)],
  },

  /* ---- Compute ---- */
  {
    id: 'div.compute.sobrietyWeek', name: 'A sobriety week',
    blurb: 'Autoplay off by default, for a week, then for good. People watch a little less, and sleep a little more.',
    effects: [sat('compute', 0.95, 'compute.streaming')],
  },
  {
    id: 'div.compute.freeTier', name: 'A free tier',
    blurb: 'The decade’s savings spent on storage nobody pays for. Everyone keeps everything, twice.',
    effects: [half('compute', 1.06, 'compute.cloudStorage')],
  },
  {
    id: 'div.compute.peatBogs', name: 'Rewet the peat bogs',
    blurb: 'Block the drains and let the moors hold water and carbon again. Slow, cheap, and very boggy.',
    effects: [absorb('compute', 0.0005)],
  },
  {
    id: 'div.compute.chipSubsidy', name: 'A chip subsidy',
    blurb: 'The decade’s savings spent on a new fab. Every rack is cheaper to fill, and every rack is filled.',
    effects: [capCost('compute', 0.94)],
  },

  /* ---- Code ---- */
  {
    id: 'div.code.featureFreeze', name: 'A feature freeze',
    blurb: 'Nothing new ships this quarter, by order. The backlog shrinks; the roadmap is reissued in pencil.',
    effects: [sat('code', 0.95)],
  },
  {
    id: 'div.code.shipIt', name: 'A launch bonus',
    blurb: 'A bonus for everything shipped this quarter. Margins up; the release notes run to several pages.',
    effects: [margin('code', 0.01)],
  },
  {
    id: 'div.code.refactoringWeek', name: 'A refactoring week',
    blurb: 'A week to tidy what is already there. Everyone has a little more attention afterwards, and spends it.',
    effects: [reserve('code', 0.03)],
  },
  {
    id: 'div.code.hackathon', name: 'A hackathon prize',
    blurb: 'Pizza, a weekend and a trophy for the best new bot. Chatbots cheaper to make, and everywhere by Monday.',
    effects: [half('code', 1.06, 'code.chatbots')],
  },
  /* ---- Fishing (M4; the Fishing lane's pairs, design/scratch/m4-registry-fishing.md §3) ---- */
  {
    id: 'div.fishing.closedMonth', name: 'A closed month',
    blurb: 'The decade’s thrift buys the crews a month ashore in the spawning season. A little less landed; nobody starves.',
    effects: [sat('fishing', 0.96)], // a small standing cut in appetite (the closed season's gentle cousin)
  },
  {
    id: 'div.fishing.newSlip', name: 'A new slipway',
    blurb: 'A second slip at the yard, paid for out of the decade. Trawlers come off it cheaper, and more of them.',
    effects: [capCost('fishing', 0.95)], // the rebound arm: cheaper catching
  },
  {
    id: 'div.fishing.boardGrant', name: 'A grant to the Board',
    blurb: 'The decade’s savings voted to the Fishery Board for a vessel. The banks are counted for the rest of the run.',
    // surveyed while held (the run): one honest way to pay for the truth (a decade forgone). Balance may prefer a
    // wellbeingAdd (the Fishing lane's fallback: "A seamen’s mission", same id).
    effects: [{ type: 'survey', sector: 'fishing' }],
  },
  {
    id: 'div.fishing.pennySupper', name: 'The penny supper',
    blurb: 'Fish duty remitted for the decade. Suppers a penny cheaper, and the shops fry twice as many.',
    effects: [half('fishing', 1.05, 'fishing.friedFish')], // the rebound arm
  },
];

export const dividends: DividendDef[] = [...globalDividends, ...sectorDividends, ...ironDividends];

