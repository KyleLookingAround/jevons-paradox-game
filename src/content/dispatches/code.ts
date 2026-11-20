/**
 * M3 dispatches for Code (eligible while Code is open, from run 5). Code's paper is a changelog: the headlines keep
 * its `Added:`, `Changed:`, `Fixed:` and `Known issue:` lines; the letters are in their writers' own voices.
 * Append, never reorder.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 */
import type { DispatchDef } from '../../types';
import {
  AFTER_FIRST, cash, eta, half, income, intensity, mandate, mrate, owns, sat, smoke, timed, wellbeing,
} from './kit';

const K = 'code';

export const codeDispatches: DispatchDef[] = [
  {
    id: 'd.code.agentReview', cast: 'ashworthLater', sector: K,
    headline: 'Changed: Ms Ashworth proposes an agent to review every change',
    body:
      'Review is the bottleneck: the agents write faster than anyone can read. Ashworth Systems has an agent that ' +
      'reviews, and it reads everything, instantly. My great-great-grandfather built a pump that made a deeper pit ' +
      'workable, and I have read what happened next. I offer it anyway, with that footnote.',
    arms: [
      {
        label: 'Trial it on one team',
        outcome: 'One team tries it, ships twice as much, and asks for more agents.',
        price: 'A cautious trial, and a slower year',
        modifier: timed(8, income(0.97, K)),
      },
      {
        label: 'Review everything by agent',
        outcome: 'Review is cheap, so everything is shipped, and the code stock grows accordingly.',
        price: '£, and everything that is now shipped',
        cost: { capitalSeconds: 40 },
        effects: [eta(K, 1.05), sat(K, 1.025)],
        modifier: timed(10, wellbeing(1), intensity(K, 0.9)),
        reply: 'Added: agent review on every change; merge queue empties hourly',
      },
      {
        label: 'Keep a person on every merge',
        outcome: 'Shipping slows to the speed of reading, and some of the code gets smaller.',
        price: 'Fewer features shipped',
        modifier: timed(15, sat(K, 0.94), income(0.96, K)),
      },
    ],
    rebound: 'The bottleneck removed: cheap review ships everything that was waiting to be refused',
  },
  {
    id: 'd.code.fortySeats', cast: 'pryce', sector: K,
    headline: 'Added: Mr Pryce offers forty agent seats for the price of one clerk',
    body:
      'Pryce Agents will supply forty agents for less than the cost of one clerk, billed by the seat. My great-' +
      'grandfather sold cars on hire purchase and my grandfather sold servers by the hour. I sell agents by the seat, ' +
      'and the customer saves on every one. I recommend forty. Ten would be timid.',
    arms: [
      {
        label: 'Take ten',
        outcome: 'Ten agents arrive, and the backlog is ten agents’ worth shorter.',
        price: 'A timid order, as Mr Pryce says',
        modifier: timed(10, income(0.96, K)),
      },
      {
        label: 'Take the forty',
        outcome: 'Forty agents arrive, and find forty agents’ worth of work.',
        price: 'Forty agents’ worth of new code to keep',
        effects: [cash(45)],
        modifier: timed(15, sat(K, 1.05), wellbeing(1), intensity(K, 0.9)),
        reply: 'Added: forty agents; Known issue: forty agents’ worth of code',
      },
    ],
    rebound: 'Cheap labour hired by the dozen: a saving per seat becomes a fleet of seats',
  },
  {
    id: 'd.code.backlog', cast: 'whitlowChair', sector: K,
    headline: 'Known issue: the Whitlow Professor finds the backlog has grown',
    body:
      'The tables for Code are in. Hours of attention saved per feature: up eightfold. Features: up twentyfold. Hours ' +
      'spent keeping old features working: up twelvefold, which is where the saved hours went. The founder would have ' +
      'recognised the shape. I set out three remedies, each with its price.',
    arms: [
      {
        label: 'Let the backlog grow',
        outcome: 'The backlog grows, and so does the stock of code beneath it.',
        price: 'More code to keep for ever',
        effects: [cash(30), smoke(K, 0.03)],
      },
      {
        label: 'Cap the agents’ hours',
        outcome: 'The agents work fewer hours, and the backlog stops growing.',
        price: 'Mandate, and the features not built',
        cost: { mandate: 35 },
        modifier: timed(15, sat(K, 0.93)),
        reply: 'Changed: agent hours capped; backlog steady for the first time',
      },
      {
        label: 'Fund a deletion fortnight',
        outcome: 'A fortnight in which only deletions are merged, and nobody is promoted.',
        price: '£ for a fortnight with nothing new',
        cost: { capitalSeconds: 30 },
        effects: [smoke(K, -0.04)],
        modifier: timed(10, wellbeing(1), intensity(K, 0.9)),
        reply: 'Removed: one fortnight’s worth of code nobody used',
      },
    ],
    defaultArm: 0,
    rebound: 'Attention saved is spent on upkeep: the stock of code eats the hours it freed',
  },
  {
    id: 'd.code.billSplitter', cast: 'correspondent', sector: K, when: AFTER_FIRST,
    headline: 'Known issue: a bill-splitting app now has a pager rota',
    body:
      'An app written in an afternoon to split one restaurant bill now has forty thousand users, two dependencies ' +
      'nobody understands and a pager rota of three. Its author would like to retire it. Its users would not. The ' +
      'editor would be glad of a line by return.',
    arms: [
      {
        label: 'Keep it running',
        outcome: 'The app lives on, and so does the rota.',
        price: 'Another service to keep for ever',
        effects: [cash(25), smoke(K, 0.03)],
      },
      {
        label: 'Retire it',
        outcome: 'The app is switched off, and forty thousand users write in.',
        price: 'Forty thousand letters to the editor',
        effects: [smoke(K, -0.03)],
        modifier: timed(10, mrate(0.93)),
        reply: 'Removed: the bill-splitting app; users split the bill by hand',
      },
    ],
    rebound: 'The throwaway kept: code that was cheap to write is dear to keep',
  },
  {
    id: 'd.code.limits', cast: 'minister', sector: K,
    headline: 'Changed: the Minister notes every rival is lifting its usage limits',
    body:
      'The Minister presents his compliments. Every rival jurisdiction is lifting its limits on agent usage, and the ' +
      'firms that write here are writing, in some numbers, to say they may write elsewhere. The Minister is ' +
      'listening. He would value the proprietor’s view before the industry’s.',
    arms: [
      {
        label: 'Consult the industry',
        outcome: 'The industry is consulted, at length, and the limits stay as they are meanwhile.',
        price: 'Mandate comes slower while it consults',
        modifier: timed(8, mrate(0.95)),
      },
      {
        label: 'Hold the limits',
        outcome: 'The limits hold, and a few firms leave to write elsewhere.',
        price: 'The firms that leave',
        effects: [mandate(30)],
        modifier: timed(12, income(0.94, K), wellbeing(1), intensity(K, 0.9)),
      },
      {
        label: 'Lift them with the rest',
        outcome: 'The limits go, and the firms stay and write more.',
        price: 'Everything the firms now write, added to the stock',
        effects: [cash(40), smoke(K, 0.08)],
        modifier: timed(15, sat(K, 1.04)),
        reply: 'Changed: usage limits lifted; firms stay and write more',
      },
    ],
    rebound: 'Leakage as a threat: the race to the most permissive jurisdiction',
  },
  {
    id: 'd.code.offsets', cast: 'fenwickCouncil', sector: K, when: owns('compute'),
    headline: 'Known issue: Dr Fenwick counts the power behind each request',
    body:
      'The Council has estimated the power behind the agents’ requests, most of which are now made by other agents. ' +
      'We ask for the cost to be shown on each request. The firms propose instead to buy offsets and carry on. I set ' +
      'out, without comment, what the offsets have done elsewhere: people feel easier, and request more.',
    arms: [
      {
        label: 'Acknowledge the report',
        outcome: 'The report is acknowledged, and the requests continue.',
        price: 'The campuses run a little hotter',
        effects: [smoke('compute', 0.015)],
      },
      {
        label: 'Show the cost per request',
        outcome: 'Every request shows what it costs, and some are not made.',
        price: 'Mandate, and some requests not made',
        cost: { mandate: 30 },
        modifier: timed(15, half(K, 0.95)),
        reply: 'Added: the cost of each request, shown on each request',
      },
      {
        label: 'Buy offsets and carry on',
        outcome: 'The offsets are bought, and the requests feel lighter for it.',
        price: '£, and requests made with a clear conscience',
        cost: { capitalSeconds: 25 },
        modifier: timed(10, sat(K, 1.02)),
      },
    ],
    rebound: 'Moral licence: the offset bought makes the next request feel free',
  },
];
