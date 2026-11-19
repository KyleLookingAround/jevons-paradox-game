/**
 * M3 dispatches for Motion (eligible while Motion is open, from run 3). The Motorist's register: the ring road, the
 * forecourt, the motor show, the Minister of Transport. Mr Pryce arrives with Motion; write him genial.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 *
 * Facts: the fuel duty escalator and the hauliers' blockade of September 2000 (design/research/restraint.md 1.1); the
 * car-free Sundays of 1973–74, dropped because the savings disappointed (restraint.md 3.4). Neither is named in the
 * letters; the letters are the game's own and its people fictional.
 */
import type { DispatchDef } from '../../types';
import {
  AFTER_FIRST, answered, cash, eta, forbidKind, half, income, intensity, mandate, mrate, owns, rk, sat, smoke, timed, wellbeing, all,
} from './kit';

const M = 'motion';

export const motionDispatches: DispatchDef[] = [
  /* ---- Mr Pryce, of Pryce Motors ---- */
  {
    id: 'd.motion.familyVan', cast: 'pryce', sector: M, when: owns('motion.economyStandard'),
    headline: 'Mr Pryce on the family van',
    body:
      'The new standard says a car must do so many miles to the gallon. It says nothing about vans, quite rightly, ' +
      'since a tradesman needs a van. Pryce Motors has therefore built a van with windows and seven seats, and the ' +
      'families love it. I write only to be sure there is no objection. My grandfather sold mill engines the same way.',
    arms: [
      {
        label: 'Let vans be vans',
        outcome: 'The seven-seat van fills the suburban drives, and does fourteen miles to the gallon.',
        price: 'Heavier vehicles on every drive',
        effects: [cash(30)],
        modifier: timed(10, sat(M, 1.05, 'motion.suburbs')),
        reply: 'Pryce family van exempt from the standard, being a van',
      },
      {
        label: 'Close the van loophole',
        outcome: 'The van is a car under the standard, and Mr Pryce is disappointed in the proprietor.',
        price: 'Mandate, and Mr Pryce’s goodwill',
        cost: { mandate: 40 },
        modifier: timed(12, income(0.95, M)),
        next: 'd.motion.pryceAbroad',
      },
    ],
    rebound: 'Boundary migration: demand crosses the line the standard drew',
  },
  {
    id: 'd.motion.pryceAbroad', cast: 'pryce', sector: M, once: true, when: answered('d.motion.familyVan', 1),
    headline: 'Mr Pryce mentions, in passing, a works abroad',
    body:
      'I accept the ruling on the van, as a good citizen. I mention only that a works abroad, where the rules are ' +
      'kinder, would build the same van for less and ship it here duty paid. I should be sorry to do it; four ' +
      'generations of Pryces have built at home. A grace period of a few years would spare everyone the trouble.',
    arms: [
      {
        label: 'Hold firm',
        outcome: 'The ruling stands, Mr Pryce builds at home, and lobbies the House all season.',
        price: 'Mandate comes slower while he lobbies',
        modifier: timed(10, mrate(0.88)),
      },
      {
        label: 'Grant a grace period',
        outcome: 'The van is a van for a few years more, and Mr Pryce is all smiles.',
        price: 'The heavy vans sell on in the meantime',
        effects: [mandate(50)],
        modifier: timed(12, sat(M, 1.03, 'motion.suburbs')),
        reply: 'Grace period for the family van; Pryce Motors to build at home',
      },
    ],
    rebound: 'Leakage threatened: the measure’s boundary used as a bargaining chip',
  },
  {
    id: 'd.motion.ringRoadStore', cast: 'pryce', sector: M,
    headline: 'Mr Pryce would open a store in a field by the ring road',
    body:
      'Pryce & Sons would like to open a store on the ring road: everything the high street sells, under one roof, ' +
      'with free parking for two thousand cars. Prices will be lower than in town, which is the point. Nobody will ' +
      'walk to it, which is not the point, merely the arrangement. I ask the proprietor’s blessing.',
    arms: [
      {
        label: 'Refer it to the council',
        outcome: 'The council sits on it, and Mr Pryce builds in the next county.',
        price: 'The trade goes to the next county',
        modifier: timed(8, income(0.95, M)),
      },
      {
        label: 'Bless the store',
        outcome: 'The store opens, prices fall, and every household makes a weekly drive of it.',
        price: 'A weekly drive for every household',
        effects: [cash(35)],
        modifier: timed(15, sat(M, 1.05, 'motion.shopping')),
        reply: 'Pryce store opens by the ring road; two thousand spaces filled by noon',
      },
    ],
    rebound: 'Cheaper goods, longer journeys: the saving at the till is spent at the pump',
  },

  /* ---- The Whitlow Professor ---- */
  {
    id: 'd.motion.reliefRoad', cast: 'whitlowChair', sector: M, when: rk(3),
    headline: 'The Whitlow Professor on the relief road',
    body:
      'The Ministry proposes a relief road for the eastern approach. The Whitlow tables suggest it will relieve the jam ' +
      'for about as long as it takes the traffic to learn of it, three to five years, after which the jam returns, ' +
      'longer and from further out. A charge for the busy hour would hold. It would also be unpopular, which is not my department.',
    arms: [
      {
        label: 'Commission a study',
        outcome: 'A study is commissioned and will report in due course.',
        price: 'Time, and the patience of the eastern approach',
        modifier: timed(8, mrate(0.95)),
      },
      {
        label: 'Build the relief road',
        outcome: 'The jam clears for a season, and then the new estates fill it.',
        price: '£, and the traffic it will bring',
        cost: { capitalSeconds: 40 },
        effects: [mandate(40), sat(M, 1.03, 'motion.commuting')],
        reply: 'Relief road opens to the eastern approach; jam to return “in time”',
      },
      {
        label: 'Charge for the busy hour',
        outcome: 'The busy hour thins, and the motoring clubs take a page in the Motorist.',
        price: 'Mandate, and the motoring clubs',
        cost: { mandate: 35 },
        modifier: timed(15, sat(M, 0.92, 'motion.commuting'), income(0.97, M)),
      },
    ],
    rebound: 'Induced demand: a faster road fills with the journeys it made worth taking',
  },

  /* ---- Dr Fenwick ---- */
  {
    id: 'd.motion.carFreeSundays', cast: 'fenwickCouncil', sector: M, when: rk(3),
    headline: 'Dr Fenwick asks for car-free Sundays in the summer',
    body:
      'The Council recorded eleven days of summer smog last year, each worse in the afternoon and worst on Sundays. We ' +
      'propose closing the roads to private cars on summer Sundays. I should add, for honesty, that where this has been ' +
      'tried the driving moved to Saturday. A lower speed limit would cost less goodwill and save a little, every day.',
    arms: [
      {
        label: 'Take it under advisement',
        outcome: 'The proposal is advised upon, and the summer is hot.',
        price: 'Another summer of smog',
        effects: [smoke(M, 0.015)],
      },
      {
        label: 'Close the roads on Sundays',
        outcome: 'Sunday is quiet and the children skate on the bypass; Saturday is twice as busy.',
        price: 'Sundays’ fares, and a busier Saturday',
        effects: [mandate(30)],
        modifier: timed(15, sat(M, 0.97), wellbeing(0.6), income(0.97, M)),
        reply: 'Roads closed to cars on summer Sundays; Saturday traffic doubles',
      },
      {
        label: 'Lower the speed limit',
        outcome: 'Every journey takes a little longer and burns a little less.',
        price: 'The motorists’ patience',
        modifier: timed(15, intensity(M, 0.88), mrate(0.95)),
        reply: 'Lower speed limit on trunk roads; motorists arrive slightly later',
      },
    ],
    rebound: 'Sufficiency displaced: the Sunday drive taken on Saturday instead',
  },

  /* ---- Ms Ashworth ---- */
  {
    id: 'd.motion.lighterCar', cast: 'ashworthLater', sector: M, when: rk(3),
    headline: 'Ms Ashworth has a lighter car, and a question',
    body:
      'Our engineers have taken a fifth of the weight out of the family saloon. The question is what to spend it on. ' +
      'We can sell it as miles to the gallon, or as a bigger engine in the same car, which the showrooms say is what ' +
      'customers want. My great-great-grandfather’s engine faced the same question and was not asked.',
    arms: [
      {
        label: 'Keep the old model',
        outcome: 'The old saloon stays in the showrooms, and the rivals sell the lighter one.',
        price: 'The rivals take the sales',
        modifier: timed(8, income(0.95, M)),
      },
      {
        label: 'Sell it as economy',
        outcome: 'The saloon does more miles to the gallon, and its owners drive further.',
        price: '£ to retool, and longer drives',
        cost: { capitalSeconds: 40 },
        effects: [eta(M, 1.05), sat(M, 1.015)],
        reply: 'Ashworth saloon a fifth lighter; owners “find reasons to drive”',
      },
      {
        label: 'Sell it as power',
        outcome: 'The saloon is quicker off the lights, and sells to people who never wanted one.',
        price: 'The weight saved is spent on speed',
        effects: [cash(40), half(M, 1.05)],
      },
    ],
    rebound: 'The horsepower race: the engineers’ gains spent on weight and power, not miles per gallon',
  },

  /* ---- The Minister ---- */
  {
    id: 'd.motion.blockade', cast: 'minister', sector: M, when: owns('motion.duty'),
    headline: 'The Minister reports hauliers at the refinery gates',
    body:
      'The Minister presents his compliments. The hauliers and farmers have blockaded the refineries against the fuel ' +
      'duty escalator, and the forecourts are running dry. The Minister is listening. He would like to know whether ' +
      'the proprietor will stand by the escalator, end it, or buy the hauliers off.',
    arms: [
      {
        label: 'Stand by the escalator',
        outcome: 'The escalator stands, the blockade lifts in a week, and the House remembers.',
        price: 'Mandate comes slower for a long while',
        modifier: timed(10, mrate(0.85)),
      },
      {
        label: 'End the automatic rise',
        outcome: 'The blockade ends at once, and no fuel duty is raised for years.',
        price: 'No fuel duty can be raised for a while',
        effects: [mandate(80)],
        modifier: timed(10, forbidKind('duty', M)),
        reply: 'Fuel duty escalator ended; the forecourts reopen by the weekend',
      },
      {
        label: 'Pay the hauliers a rebate',
        outcome: 'The hauliers are paid off, and the duty stands for everybody else.',
        price: '£ for the rebate',
        cost: { capitalSeconds: 40 },
        effects: [mandate(30)],
      },
    ],
    rebound: 'Decay and repeal: a single blockade ends a measure that took years to build',
  },

  /* ---- The correspondent ---- */
  {
    id: 'd.motion.newEstates', cast: 'correspondent', sector: M, when: all(AFTER_FIRST, owns('motion.commuting')),
    headline: 'New estates advertised “forty minutes from the office”',
    body:
      'The builders of the new estates advertise them as forty minutes from the office, which is what the old terraces ' +
      'were by tram. The new road is faster; the estates are further. They would like the proprietor’s name on the ' +
      'hoardings. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Lend the name',
        outcome: 'The estates sell out, forty minutes away by a faster road.',
        price: 'The same hour on the road, from further out',
        effects: [cash(30)],
        modifier: timed(10, sat(M, 1.05, 'motion.commuting')),
        reply: 'New estates sell out; still forty minutes from the office',
      },
      {
        label: 'Keep the name off',
        outcome: 'The estates sell anyway, a little more slowly.',
        price: 'The builders’ fee',
        modifier: timed(10, income(0.95, M), wellbeing(0.45)),
      },
    ],
    defaultArm: 1,
    rebound: 'The travel-time constant: a faster road is spent on distance, not on time',
  },
  {
    id: 'd.motion.fortnightAbroad', cast: 'correspondent', sector: M, when: all(AFTER_FIRST, owns('motion.flights')),
    headline: 'Travel agents ask for more charter flights to the coast',
    body:
      'The travel agents report that a fortnight abroad now costs less than a week at home, and they cannot get seats ' +
      'enough. They ask for more charter flights this summer. The resorts at home have written separately, in a ' +
      'wounded tone. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Charter more flights',
        outcome: 'The flights fill, and the summer goes abroad.',
        price: 'A summer’s worth of fuel, abroad and back',
        effects: [cash(35)],
        modifier: timed(10, sat(M, 1.05, 'motion.flights')),
        reply: 'Charter flights doubled; home resorts “wounded”',
      },
      {
        label: 'Hold to the timetable',
        outcome: 'The flights stay as they were, and the home resorts have a good year.',
        price: 'The charter fares',
        effects: [mandate(15)],
        modifier: timed(8, income(0.95, M)),
      },
    ],
    rebound: 'Cheaper distance: the saving on the fare is spent on going further',
  },
];
