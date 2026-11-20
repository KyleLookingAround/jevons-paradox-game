/**
 * M3 dispatches that belong to an Age rather than one Industry (DispatchDef.age: eligible while it is the current
 * Age). They concern the Age's Industries together. Append, never reorder.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 */
import type { Cond, DispatchDef } from '../../types';
import {
  AFTER_FIRST, BUDGET, SETTLEMENT, absorb, all, cash, income, mandate, mrate, owns, price, rk, sat, smoke, timed, wellbeing,
 stake, WAGER_WIN, WAGER_LOSE } from './kit';

export const ageDispatches: DispatchDef[] = [
  {
    id: 'd.age.coal.gasCoal', cast: 'whitlow', age: 'coal', when: all(BUDGET, owns('light')),
    headline: 'Mr Whitlow on the gasworks’ appetite for coal',
    body:
      'The gas company boasts that the mantle has made a therm go three times as far. The gasworks have meanwhile ' +
      'tripled their order for coal, which they cook into the gas. It follows that the thrift of the lamp is the custom ' +
      'of the pit. A duty on the gasworks’ coal would reach both; it would also reach every lamp in the parish.',
    arms: [
      {
        label: 'Leave the gasworks be',
        outcome: 'The gasworks order more coal, and the pits sink another shaft.',
        price: 'The pits’ custom grows with the lamps',
        effects: [cash(20)],
        modifier: timed(10, sat('steam', 1.02)),
      },
      {
        label: 'Tax the gasworks’ coal',
        outcome: 'The gasworks pay more for coal, and the lamps cost a little more to burn.',
        price: 'Mandate, and dearer lamps',
        cost: { mandate: 30 },
        modifier: timed(15, price('light', 1.06), sat('steam', 0.97)),
        reply: 'Duty on gasworks’ coal; the parish lamps dearer by a farthing',
      },
    ],
    rebound: 'The indirect rebound: the thrift of one trade is the custom of another',
  },
  {
    id: 'd.age.acceleration.oilShock', cast: 'correspondent', age: 'acceleration', when: all(AFTER_FIRST, owns('motion')),
    headline: 'Oil quadruples over the winter; queues at the forecourts',
    body:
      'Oil has quadrupled since the autumn. The forecourts have queues round the block and handwritten signs. The ' +
      'motor trade expects a rush for small, thrifty cars once the queues clear, and a rush for large ones once the ' +
      'price falls back. The Ministry asks whether to ration by coupon or let the price do it.',
    arms: [
      {
        label: 'Let the price ration it',
        outcome: 'Oil is dear for a season, and the thrifty cars are filled once it falls.',
        price: 'Dear oil now, and thrifty cars filled later',
        modifier: timed(10, price('motion', 1.12), sat('motion', 1.02)),
      },
      {
        label: 'Ration by coupon',
        outcome: 'Coupons are printed and the queues shorten, and the Ministry is blamed for both.',
        price: 'A season’s takings, and the Ministry’s standing',
        effects: [mandate(30)],
        modifier: timed(15, sat('motion', 0.92), mrate(0.95)),
        reply: 'Petrol coupons issued; queues shorten, tempers do not',
      },
    ],
    rebound: 'Shock and recovery: dear oil buys thrifty engines, and cheap oil fills them',
  },
  {
    id: 'd.age.attention.eveningOff', cast: 'minister', age: 'attention', when: rk(4),
    headline: 'The Minister floats a national evening off the screens',
    body:
      'The Minister presents his compliments. The time saved by every machine in the house is now spent on the ' +
      'machines, and a backbench committee proposes one evening a week off the screens, by voluntary agreement. The ' +
      'Minister is listening, and would like to know whether the proprietor will back it.',
    arms: [
      {
        label: 'Refer it to a committee',
        outcome: 'The committee sits on Wednesday evenings, on its phones.',
        price: 'Mandate comes slower while it sits',
        modifier: timed(8, mrate(0.95)),
      },
      {
        label: 'Back the evening off',
        outcome: 'One evening a week is quiet, and the others are a little busier.',
        price: 'One evening’s takings a week',
        modifier: timed(15, sat('compute', 0.95), income(0.96), wellbeing(1), absorb('compute', 0.002)),
        reply: 'Wednesday declared an evening off the screens; Thursday busier',
      },
      {
        label: 'Leave it to households',
        outcome: 'Households are left to it, and the machines keep every evening.',
        price: 'Every evening on the machines, and the carbon of it',
        effects: [cash(25), smoke('compute', 0.08)],
        modifier: timed(10, sat('compute', 1.02)),
      },
    ],
    rebound: 'Time freed is filled: the hour saved by the machine is spent on the machine',
  },
];

/*
 * M4 (the text lane): the Coal Age's last letters, which concern its four Industries together (DispatchDef.age 'coal').
 * A separate export until the Act lane registers Fishing (these name it): Content.dispatches appends
 * ...ageDispatchesM4 at the END of the list (append, never reorder: content order is the draw's tie-break). The Coal
 * Age stops being the current Age after the Act I ending, so these never arrive in a Preview.
 */
const settledIn = (sector: string): Cond => ({ stat: 'settled', sector, op: '>=', value: 1, label: `${sector} settled` });

export const ageDispatchesM4: DispatchDef[] = [
  {
    id: 'd.age.coal.oneSentence', cast: 'minister', age: 'coal', when: all(SETTLEMENT, owns('fishing')),
    headline: 'The House would like a settlement it can explain',
    body:
      'The Minister presents his compliments. Members are asked by their constituents why coal, gas, iron and fish are ' +
      'each settled on a different principle, and find they cannot say. The House would be grateful for one rule, in ' +
      'one sentence, that a member could repeat at a public meeting. The Minister is listening.',
    arms: [
      {
        label: 'Send the full papers',
        outcome: 'The papers go to the House in eleven volumes, and are placed in the Library.',
        price: 'Patience at Westminster',
        modifier: timed(8, mrate(0.95)),
      },
      {
        label: 'Give them one sentence',
        outcome: 'The sentence is “no more than the sky and the sea can carry”, and members repeat it.',
        price: 'Mandate for the drafting',
        cost: { mandate: 30 },
        modifier: timed(15, mrate(1.1)),
        reply: 'House adopts a settlement in one sentence; members memorise it',
      },
      {
        label: 'Ask for an inquiry',
        outcome: 'An inquiry is appointed, and will report in due course.',
        price: 'Mandate comes slower while it sits',
        effects: [mandate(40)],
        modifier: timed(10, mrate(0.92)),
        reply: 'Inquiry into the settlements to report in due course',
      },
    ],
    rebound: 'A rule nobody can state is a rule nobody defends',
  },
  {
    id: 'd.age.coal.supplement', cast: 'correspondent', age: 'coal',
    when: all(AFTER_FIRST, SETTLEMENT, owns('fishing'), { stat: 'sectorsSettled', op: '>=', value: 3 }),
    headline: 'The Gazette proposes a supplement on the Coal Age',
    body:
      'The editor intends a supplement, to be printed when the coal, the gas, the iron and the fish have all been ' +
      'settled and held for fifty years: what was burnt, what was saved, and what it cost. The editor would like the ' +
      'proprietor’s figures, and a photograph of the works. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Decline the photograph',
        outcome: 'The supplement will be written from the public returns, which are thinner.',
        price: 'The Gazette’s goodwill',
        modifier: timed(8, mrate(0.97)),
      },
      {
        label: 'Open the books',
        outcome: 'The proprietor’s ledgers go to the Gazette, every figure, the bad years too.',
        price: '£ for the clerks, and some awkward columns',
        cost: { capitalSeconds: 20 },
        modifier: timed(10, mrate(1.1), wellbeing(1)),
        reply: 'Proprietor opens the books to the Gazette, bad years included',
      },
    ],
    rebound: 'The full account, published: what was burnt in the proprietor’s name, wherever it was burnt',
  },
  {
    id: 'd.age.coal.fiftyYears', cast: 'correspondent', age: 'coal',
    when: all(AFTER_FIRST, SETTLEMENT, owns('fishing'), { stat: 'sectorsSettled', op: '>=', value: 2 }),
    headline: 'The Gazette is asked to hold the stakes on the fifty years',
    body:
      'The clubs are laying odds on whether the Coal Age will be settled and held for fifty years, and the editor has ' +
      'been asked to hold the stakes. The editor would rather report than bet, but notes that the proprietor is the ' +
      'only party who can see every ledger. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Decline to bet',
        outcome: 'The proprietor declines, and the clubs bet on without inside knowledge.',
        price: 'The clubs think less of the proprietor’s nerve',
        modifier: timed(8, mrate(0.97)),
      },
      {
        label: 'Back the settlement',
        outcome: 'The proprietor’s stake is lodged with the editor, and the odds shorten at once.',
        price: '£ for the stake',
        cost: { capitalSeconds: 30 },
        /*
         * READS: the Act's checklist line ("Settled 3 of 4. Fishing needs the stock surveyed") and each Industry's
         * settled card. All four settled when answered: the clubs pay.
         * Intent ±6%: win, Mandate and capital now and Mandate's pace for ten years; lose, Mandate's pace down.
         */
        wager: {
          when: all(settledIn('steam'), settledIn('light'), settledIn('iron'), settledIn('fishing')),
          hint: 'Pays if all four Coal Age Industries are settled when answered',
          win: {
            outcome: 'All four were settled: the clubs pay up, and the House takes the proprietor’s word for the rest.',
            effects: [stake(WAGER_WIN), mandate(60), cash(30)],
            modifier: timed(10, mrate(1.1)),
            reply: 'Proprietor collects from the clubs; the Coal Age “as good as settled”',
          },
          lose: {
            outcome: 'Not all four were settled: the clubs collect, and the stake is talked about in the House.',
            effects: [stake(WAGER_LOSE)],
            modifier: timed(10, mrate(0.9)),
            reply: 'Proprietor’s stake lost to the clubs; members amused',
          },
        },
      },
    ],
    rebound: 'A settlement held is a settlement believed: the House lends on the proprietor’s record',
  },
];
