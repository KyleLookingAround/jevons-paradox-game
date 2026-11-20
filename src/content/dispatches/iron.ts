/**
 * M4 dispatches for Iron & Steel (eligible while Iron is open): Mr Josiah Pryce, ironmaster at Ravensdale (seven), and
 * Mr Whitlow on the order book (one). The iron market report's register: furnaces in and out of blast, pig iron at
 * Wolverhampton, the rolling mill, the counting-house. Append, never reorder.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 *
 * WAGERS (DispatchArm.wager; design/m4-design.md §8). Each is a bet on something the page shows BEFORE the player
 * answers; the comment above each wager says what a thinking player reads, and where. Sizes are the design's intent,
 * written so the balance lane can scale the numbers without changing a word: a win is worth about +4–8% of the run's
 * Hindsight per minute over the ten model years after answering, a loss about the same the other way ("intent ±6%"
 * below). Every wager arm is staked (a `cost`), so it is priced under the M3 rule on its own; the default arm is never a
 * wager and stays modest.
 *
 * Ids this module assumes from the Iron lane (checked at the end of the text lane's work; see
 * design/scratch/m4-text-progress.md): the Industry 'iron' and its coke duty lever COKE_DUTY.
 * Facts: Jevons on the coal tax and iron (ch. VII [V], energy.md 1.5) is NOT quoted in a letter (real words belong in
 * card blurbs); the scrap letter's mechanism is Zink & Geyer, “Circular Economy Rebound” (2017), as the lever's.
 */
import type { Cond, DispatchDef, SectorId, StatKey } from '../../types';
import {
  BUDGET, all, cash, feature, forbidKind, income, intensity, leak, mandate, mrate, sat, smoke, timed, wellbeing,
} from './kit';

const I = 'iron';
/** Iron's coke duty (the Iron lane's duty lever). */
const COKE_DUTY = 'iron.cokeDuty';

/* M4 stats are not in kit.ts's `sec`; a local, typed leaf. */
const st = (stat: StatKey, sector: SectorId, op: '<' | '<=' | '>' | '>=', value: number, label?: string): Cond =>
  (label ? { stat, sector, op, value, label } : { stat, sector, op, value });
/** True while `s` has a budget line drawn ('budgetHeadroom' is FALSE without one). */
const HAS_LINE = (s: SectorId): Cond => st('budgetHeadroom', s, '>', -1e9, 'A line drawn');
/** `s` is at least `v` (a fraction) inside its own line: 1 − R / budgetR ≥ v. */
const HEADROOM = (s: SectorId, v: number, label: string): Cond => st('budgetHeadroom', s, '>=', v, label);

export const ironDispatches: DispatchDef[] = [
  /* ---- Mr Josiah Pryce, ironmaster ---- */
  {
    id: 'd.iron.pryceJointRailway', cast: 'prycePater', sector: I, when: all(BUDGET, HAS_LINE('steam')),
    headline: 'Mr Josiah Pryce proposes a joint railway to the coast',
    body:
      'Ravensdale rolls more rail than the county can lay. I propose a joint railway to the coast: my rails at cost, ' +
      'the proprietor’s engines, the freight shared. Rails were never so cheap, and a railway that pays its way is a ' +
      'railway that runs more trains. Come and see the mill lit at night; it is a sight.',
    arms: [
      {
        label: 'Let him lay his own',
        outcome: 'Mr Pryce lays a single track of his own and says no more about it.',
        price: 'Ravensdale’s goodwill, for a while',
        modifier: timed(8, income(0.96, I)),
      },
      {
        label: 'Go halves on the railway',
        outcome: 'The proprietor puts up half, and the joint railway is laid within the year.',
        price: '£ for half the railway, and the coal it carries',
        cost: { capitalSeconds: 40 },
        /*
         * READS: Steam's budget gauge, its R against its line (the letter only comes while Steam has one). A tenth of
         * headroom absorbs the railway's growth; less, and the cheaper rails push Steam over its line.
         * Intent ±6%: win, ten years of better takings in Steam and Iron; lose, Steam's railways grow over the line
         * (smoke now, demand up for ten years: decades within budget are lost).
         */
        wager: {
          when: HEADROOM('steam', 0.1, 'Steam a tenth inside its line'),
          hint: 'Pays if Steam is a tenth or more inside its line',
          win: {
            outcome: 'Steam had room: the coast trains run within its allowance, and the freight pays for the track.',
            modifier: timed(10, income(1.12, 'steam'), income(1.06, I), wellbeing(1)),
            reply: 'Joint railway to the coast opens; the coal trains keep within bounds',
          },
          lose: {
            outcome: 'Steam had no room: the railway grows to meet the cheap rails, and its coal goes over the line.',
            effects: [smoke('steam', 0.05)],
            modifier: timed(10, sat('steam', 1.1), income(0.95, 'steam')),
            reply: 'Coast railway opens; Steam’s coal trains run over the line',
          },
        },
      },
    ],
    rebound: 'Embodied: cheap rails lower the cost of a railway, and the railway burns the coal the rails saved',
  },
  {
    id: 'd.iron.pryceBelgian', cast: 'prycePater', sector: I,
    headline: 'Mr Josiah Pryce could match the Belgian price, with no coke duty',
    body:
      'The Belgians are landing pig iron at Hull for less than it costs me to keep a furnace in blast. Give me ten years ' +
      'without a duty on coke and I will meet their price, keep three hundred men at work and sell every ton at home. ' +
      'A small tax on coal is a large one on iron, as even the economists allow. I am not asking for a favour, only ' +
      'for the want of a burden.',
    arms: [
      {
        label: 'Keep the duty open',
        outcome: 'The duty stays a possibility, and Mr Pryce blows out a furnace to make the point.',
        price: 'Ravensdale’s output, for a season',
        modifier: timed(8, income(0.95, I)),
      },
      {
        label: 'Promise ten clear years',
        outcome: 'Mr Pryce meets the Belgian price, and his furnaces never go out of blast.',
        price: 'No coke duty for a decade, and the coke he burns',
        effects: [cash(20), smoke(I, 0.06)],
        modifier: timed(10, forbidKind('duty', I), income(1.06, I)),
        reply: 'Ravensdale meets the Belgian price; no coke duty this decade',
      },
    ],
    rebound: 'A promise not to price the coal: the cheaper ton is made, and sold, in greater number',
  },
  {
    id: 'd.iron.pryceInstitute', cast: 'prycePater', sector: I, when: feature('clearSkies'),
    headline: 'Ravensdale offers a mechanics’ institute, if the licences are eased',
    body:
      'The licences hold Ravensdale to six furnaces. Let me blow in two more and I will build the town a mechanics’ ' +
      'institute, with a reading room, a lecture hall and gas laid on. My men want learning as much as wages. If the ' +
      'sky over the works can take two more chimneys, nobody is the worse; if it cannot, the institute will teach ' +
      'them why.',
    arms: [
      {
        label: 'Keep the six furnaces',
        outcome: 'Ravensdale keeps to six furnaces, and the institute waits for a better year.',
        price: 'The institute, and Mr Pryce’s good humour',
        modifier: timed(8, income(0.96, I)),
      },
      {
        label: 'Ease the licences',
        outcome: 'Two more furnaces are blown in, and the institute’s foundation stone is laid.',
        price: 'Mandate to ease the licences, and two more chimneys',
        cost: { mandate: 40 },
        /*
         * READS: Iron's clear-skies mark (SectorDerived.clear) on its pressure gauge. A clear sky has room for two more
         * chimneys; a smoky one is brought nearer The Orange Night.
         * Intent ±6%: win, Iron's takings and wellbeing for ten years and most of the stake back; lose, smoke now and
         * more furnaces for ten years, with the town the worse for it.
         */
        wager: {
          when: st('clear', I, '>=', 1, 'Iron’s sky clear'),
          hint: 'Pays if Iron & Steel’s sky is clear when the licences are eased',
          win: {
            outcome: 'The sky had room: the furnaces keep within it, and the institute fills on lecture nights.',
            effects: [mandate(30)],
            modifier: timed(10, income(1.1, I), wellbeing(1)),
            reply: 'Mechanics’ institute opens at Ravensdale; the sky holds',
          },
          lose: {
            outcome: 'The sky had none: two more chimneys bring the orange nights nearer, and the lectures are on smoke.',
            effects: [smoke(I, 0.06)],
            modifier: timed(10, sat(I, 1.08), wellbeing(-1)),
            reply: 'Institute opens at Ravensdale; its first lecture is on smoke',
          },
        },
      },
    ],
    rebound: 'A licence eased for a good cause: the cause is real, and so are the furnaces',
  },
  {
    id: 'd.iron.pryceLathes', cast: 'prycePater', sector: I, when: all(BUDGET, HAS_LINE('steam'), HAS_LINE('light')),
    headline: 'Mr Josiah Pryce would sell machine tools at cost to every works',
    body:
      'Planers, shapers, the slide rest: my shops can make a lathe a week, and I would sell them at cost to any works ' +
      'that asks. Every engine, every lamp and every gasholder in the kingdom would be cheaper to build. I ask only ' +
      'that the proprietor take the first fifty, as an example to the trade. Cheap tools make a busy country, and a ' +
      'busy country buys iron.',
    arms: [
      {
        label: 'Decline the fifty',
        outcome: 'Mr Pryce sells his lathes elsewhere, more slowly, and remarks on it.',
        price: 'Mr Pryce’s custom, for a while',
        modifier: timed(8, income(0.96, I)),
      },
      {
        label: 'Take the first fifty',
        outcome: 'Fifty lathes go into the proprietor’s works, and the trade follows the example.',
        price: '£ for fifty lathes, and every line they reach',
        cost: { capitalSeconds: 30 },
        /*
         * READS: Steam's and Light's budget gauges (both have lines when the letter comes). Machine tools cheapen every
         * Industry's machines (the order book's '*' feed); with a tenth of room in both the extra machines fit.
         * Intent ±6%: win, a tenth more income everywhere for ten years; lose, both Industries' demand up for ten years
         * and smoke in both now.
         */
        wager: {
          when: all(HEADROOM('steam', 0.1, 'Steam a tenth inside its line'), HEADROOM('light', 0.1, 'Light a tenth inside its line')),
          hint: 'Pays if Steam and Light are both a tenth inside their lines',
          win: {
            outcome: 'Both had room: the cheaper machines are bought within the allowances, and the savings stay saved.',
            modifier: timed(10, income(1.08), wellbeing(1)),
            reply: 'Lathes at cost for every works; the allowances hold',
          },
          lose: {
            outcome: 'One had none: cheaper machines mean more machines, and the coal they burn goes over the line.',
            effects: [smoke('steam', 0.04), smoke('light', 0.04)],
            modifier: timed(10, sat('steam', 1.06), sat('light', 1.06)),
            reply: 'Lathes at cost for every works; the coal follows the lathes',
          },
        },
      },
    ],
    rebound: 'Embodied: the lathe makes every machine cheaper, and every machine burns',
  },
  {
    id: 'd.iron.pryceScrap', cast: 'prycePater', sector: I,
    headline: 'Mr Josiah Pryce would buy back every old rail, for a bounty',
    body:
      'Old rails, broken boilers, the bridge the river took last winter: there is iron enough lying about the kingdom ' +
      'to feed a furnace for a year. Pay a bounty on scrap and Ravensdale will melt it, and save the coke that new iron ' +
      'would have cost. The ton will be cheaper, of course. I have never known a cheaper ton that did not find a buyer.',
    arms: [
      {
        label: 'Leave scrap to the dealers',
        outcome: 'The dealers buy the scrap, and most of it is shipped abroad for melting.',
        price: 'The coke that scrap might have saved',
        modifier: timed(8, intensity(I, 1.04)),
      },
      {
        label: 'Pay the scrap bounty',
        outcome: 'A bounty is paid on every ton of scrap, and Ravensdale melts it.',
        price: '£ for the bounty, and cheaper iron',
        cost: { capitalSeconds: 30 },
        /*
         * READS: Iron's levers: the coke duty's level (in force or not). The scrap bounty lever's own side effect, in
         * a letter: recycling that lowers the price of iron sells more iron unless a duty holds the price (Zink & Geyer
         * 2017).
         * Intent ±6%: win, less smoke per ton and better takings for ten years; lose, Iron's uses grow for ten years.
         */
        wager: {
          when: { owns: COKE_DUTY, label: 'The coke duty in force' },
          hint: 'Pays if the coke duty is in force when the bounty is paid',
          win: {
            outcome: 'The duty holds the price: scrap saves coke, and the ton costs what it did.',
            modifier: timed(10, intensity(I, 0.9), income(1.06, I), wellbeing(1)),
            reply: 'Scrap bounty saves coke at Ravensdale; the price holds',
          },
          lose: {
            outcome: 'Nothing holds the price: scrap makes the ton cheaper, and cheap iron sells in greater tonnage.',
            effects: [smoke(I, 0.04)],
            modifier: timed(10, sat(I, 1.1)),
            reply: 'Scrap bounty cheapens iron; Ravensdale blows in two more',
          },
        },
      },
    ],
    rebound: 'Circular economy rebound: recycling that makes the material cheaper sells more of it',
  },
  {
    id: 'd.iron.pryceCokeContract', cast: 'prycePater', sector: I,
    headline: 'Mr Josiah Pryce would buy ten years of coke at this year’s price',
    body:
      'I should like to buy my coke for ten years at this year’s price. The pits are deep, the coal is thick, and the ' +
      'proprietor’s own viewers say there is enough for a century. A fixed price lets me plan, and planning lets me ' +
      'build. If the coal ran short the proprietor would wish he had not signed; but the viewers say it will not.',
    arms: [
      {
        label: 'Sell year by year',
        outcome: 'Mr Pryce buys his coke at the season’s price and grumbles every quarter-day.',
        price: 'Mr Pryce’s long custom',
        modifier: timed(8, income(0.96, I)),
      },
      {
        label: 'Sign the ten-year contract',
        outcome: 'The coke is sold to Ravensdale for ten years at this year’s price.',
        price: 'Mandate to back the contract, and the coal it binds',
        cost: { mandate: 30 },
        /*
         * READS: Steam's reserve gauge, which shows the coal left (both draws: Steam's and Iron's). Plenty in the ground
         * and a fixed price is a steady trade; little, and the contract binds coal that is growing dear.
         * Intent ±6%: win, steady takings in both for ten years and a sum now; lose, Steam's takings fall and Iron keeps
         * drawing at the old price.
         */
        wager: {
          when: st('reserveFraction', 'steam', '>=', 0.5, 'Half of Steam’s coal left'),
          hint: 'Pays if half or more of Steam’s coal is still in the ground',
          win: {
            outcome: 'The coal was there: the contract runs smoothly, and both trades plan a decade ahead.',
            effects: [cash(25)],
            modifier: timed(10, income(1.08, 'steam'), income(1.08, I)),
            reply: 'Ravensdale’s coke contract signed; the pits work steadily',
          },
          lose: {
            outcome: 'The coal was not: Ravensdale draws at the old price while the pits grow dear to work.',
            modifier: timed(10, income(0.88, 'steam'), sat(I, 1.05)),
            reply: 'Coke contract binds the pits; Ravensdale pays last year’s price',
          },
        },
      },
    ],
    rebound: 'The shared reserve: coal sold cheap for iron is coal the engines cannot burn, and both draw on one valley',
  },
  {
    id: 'd.iron.pryceSon', cast: 'prycePater', sector: I,
    headline: 'Mr Josiah Pryce asks a place for his son in the proprietor’s office',
    body:
      'My boy Samuel has his letters, his sums and a head for a ledger, and I would have him learn the proprietor’s ' +
      'trade before he learns mine. A year in the counting-house, at no wage; he will copy what he is given and ask ' +
      'about the rest. He has my nose for a bargain, his mother says, and she means it kindly.',
    arms: [
      {
        label: 'Regret there is no place',
        outcome: 'Samuel goes to a bank in Birmingham instead, and does well there.',
        price: 'Mr Pryce’s good opinion',
        modifier: timed(8, mrate(0.97)),
      },
      {
        label: 'Take the boy on',
        outcome: 'Samuel copies the ledgers for a year and learns where every figure comes from.',
        price: 'A Pryce who knows where the inspectors look',
        effects: [mandate(30), cash(15)],
        modifier: timed(15, leak('steam', 1.3)),
        reply: 'Young Samuel Pryce enters the proprietor’s counting-house',
      },
    ],
    rebound: 'Capture, learnt young: the regulated learn the regulator’s ledger',
  },

  /* ---- Mr Whitlow on the order book ---- */
  {
    id: 'd.iron.whitlowRails', cast: 'whitlow', sector: I, when: BUDGET,
    headline: 'Mr Whitlow counts the coal in a mile of rails',
    body:
      'Ravensdale reports its coke per ton of iron, and the railways their coal per train mile; nobody reports the coal ' +
      'in the rails. I have counted it. It follows that a cheaper rail is a busier railway, and that Steam’s coal rises ' +
      'with Iron’s thrift. I propose a duty on rails sold to the railways while the feed is large. If it is small, the ' +
      'duty is a nuisance.',
    arms: [
      {
        label: 'Leave the rails untaxed',
        outcome: 'The rails go untaxed, and Mr Whitlow publishes his count as a pamphlet.',
        price: 'Steam’s coal rises with the rails',
        modifier: timed(8, sat('steam', 1.02)),
      },
      {
        label: 'Tax the rails by the mile',
        outcome: 'A duty is laid on every mile of rail sold to the railways.',
        price: 'Mandate, and the ironmasters’ fury',
        cost: { mandate: 40 },
        /*
         * READS: Iron's order book, which lists each fed Industry with its feed factor ("engines × 0.88"); the stat is
         * the product of every factor into Steam. At 0.9 or below the feed is large enough for the duty to bite.
         * Intent ±6%: win, Steam's growth slowed and wellbeing for ten years, most of the stake back; lose, Iron's
         * takings and Mandate's pace down for ten years.
         */
        wager: {
          when: st('feedFactor', 'steam', '<=', 0.9, 'Iron feeds Steam a tenth or more'),
          hint: 'Pays if the order book makes Steam’s engines a tenth cheaper',
          win: {
            outcome: 'The feed was large: the duty slows the railways’ growth, and Steam’s coal with it.',
            effects: [mandate(30)],
            modifier: timed(10, sat('steam', 0.92), wellbeing(1)),
            reply: 'Rail duty bites; the railway companies build more slowly',
          },
          lose: {
            outcome: 'The feed was small: the duty catches little coal and a great deal of resentment.',
            modifier: timed(10, income(0.9, I), mrate(0.95)),
            reply: 'Rail duty collects little; Ravensdale complains of a great deal',
          },
        },
      },
    ],
    rebound: 'Embodied: the coal in the rails is burnt in the railway’s name and booked in Iron’s',
  },
];
