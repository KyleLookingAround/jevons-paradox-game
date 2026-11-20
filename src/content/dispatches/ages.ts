/**
 * M3 dispatches that belong to an Age rather than one Industry (DispatchDef.age: eligible while it is the current
 * Age). They concern the Age's Industries together. Append, never reorder.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 */
import type { DispatchDef } from '../../types';
import {
  AFTER_FIRST, BUDGET, absorb, all, cash, income, mandate, mrate, owns, price, rk, sat, smoke, timed, wellbeing,
} from './kit';

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
