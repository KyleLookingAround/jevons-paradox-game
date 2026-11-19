/**
 * M3 dispatches for Compute (eligible while Compute is open, from run 4). Compute's paper is a system log: the
 * headlines keep its `info:` and `warn:` lines; the letters are in their writers' own voices. Append, never reorder.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 */
import type { DispatchDef } from '../../types';
import { AFTER_FIRST, cash, eta, half, income, intensity, mandate, mrate, sat, smoke, timed, wellbeing } from './kit';

const P = 'compute';

export const computeDispatches: DispatchDef[] = [
  {
    id: 'd.compute.certifiedCampus', cast: 'ashworthLater', sector: P,
    headline: 'info: Ms Ashworth submits plans for a certified campus',
    body:
      'Ashworth Systems has designed a campus that wastes almost nothing on cooling. Every watt goes to the racks. The ' +
      'client is delighted, and has asked for a second campus beside it on the strength of the first, since computing ' +
      'there will be so cheap. The family has seen this film before. We can also retrofit the old halls, more modestly.',
    arms: [
      {
        label: 'Keep the halls as they are',
        outcome: 'The old halls hum on, and the client builds elsewhere.',
        price: 'The client builds elsewhere',
        modifier: timed(8, income(0.96, P)),
      },
      {
        label: 'Build the certified campus',
        outcome: 'The campus opens to a framed certificate, and the second campus breaks ground.',
        price: '£, and the second campus beside it',
        cost: { capitalSeconds: 45 },
        effects: [eta(P, 1.05), sat(P, 1.025, 'compute.training')],
        reply: 'info: certified campus online; second campus approved',
      },
      {
        label: 'Retrofit the old halls',
        outcome: 'The old halls are made thriftier, and nothing new is built for a while.',
        price: '£ for the retrofit',
        cost: { capitalSeconds: 25 },
        modifier: timed(15, intensity(P, 0.88)),
      },
    ],
    rebound: 'The efficient campus as a sales brochure: cheaper computing sells the next campus',
  },
  {
    id: 'd.compute.freeAtUse', cast: 'pryce', sector: P,
    headline: 'info: Mr Pryce proposes the service be free to the user',
    body:
      'Pryce Digital proposes to stop charging the user at all. The advertisers will pay, and pay well, for every ' +
      'hour the user spends with us. A free service is the cheapest thing my family has ever sold, and my family has ' +
      'sold a great many cheap things. The user will be delighted, and will use it all day.',
    arms: [
      {
        label: 'Charge a fair price',
        outcome: 'The service keeps its price, and its users use it when they need it.',
        price: 'Mr Pryce’s advertisers',
        modifier: timed(10, income(0.95, P)),
      },
      {
        label: 'Make it free',
        outcome: 'The service is free, and the user is the point of use, all day.',
        price: 'A price that can never fall again, and use without a ceiling',
        effects: [cash(40)],
        modifier: timed(15, sat(P, 1.05, 'compute.web'), mrate(0.96)),
        reply: 'info: price shown to user set to £0.00',
      },
    ],
    rebound: 'Free at the point of use: a nil price cannot be lowered, and demand has no ceiling',
  },
  {
    id: 'd.compute.perWatt', cast: 'whitlowChair', sector: P,
    headline: 'info: Whitlow tables find computing per watt doubled, and watts too',
    body:
      'The tables for the decade are in. Computing per watt has doubled, as it does. Watts have also doubled, as they ' +
      'do. The industry would like the first figure published and the second left in the appendix. The founder kept ' +
      'both on the same page, and so should we, though it will not make us popular.',
    arms: [
      {
        label: 'Publish the thrift only',
        outcome: 'The headline figure is splendid, and the appendix is unread.',
        price: 'Nobody reads the appendix',
        effects: [cash(30)],
        modifier: timed(10, sat(P, 1.025)),
      },
      {
        label: 'Print both on page one',
        outcome: 'Both figures run side by side, and the industry writes to the editor.',
        price: 'The industry’s goodwill',
        effects: [mandate(40)],
        modifier: timed(10, income(0.95, P)),
        reply: 'warn: watts doubled with computing per watt, say Whitlow tables',
      },
    ],
    rebound: 'Koomey’s gift spent: computing per watt doubles and so does the computing',
  },
  {
    id: 'd.compute.intake', cast: 'fenwickCouncil', sector: P,
    headline: 'warn: Dr Fenwick reports the river low at the cooling intakes',
    body:
      'In the third week of the heatwave the river at the data centre intakes is lower than the Council has recorded. ' +
      'The campuses draw it for cooling and return it warm. We ask for the draw to be rationed until the rain, or for ' +
      'dry cooling, which uses no water and more power. Either has a cost, and I have set both out in the annex.',
    arms: [
      {
        label: 'Note the drought',
        outcome: 'The draw continues, and the river is warmer below the intakes.',
        price: 'A warmer, thinner river',
        effects: [smoke(P, 0.015)],
      },
      {
        label: 'Ration the cooling water',
        outcome: 'The campuses throttle back until the rain.',
        price: 'Slower racks, and lower takings',
        modifier: timed(15, sat(P, 0.94), income(0.96, P)),
        reply: 'warn: campuses throttled until the rain; river recovers',
      },
      {
        label: 'Pay for dry cooling',
        outcome: 'The campuses stop drinking the river and draw more from the grid.',
        price: '£, and more power to cool with',
        cost: { capitalSeconds: 40 },
        effects: [mandate(30)],
        modifier: timed(15, eta(P, 0.97)),
      },
    ],
    rebound: 'Substitution rebound: the cure for the water bill is paid in power',
  },
  {
    id: 'd.compute.gridQueue', cast: 'minister', sector: P,
    headline: 'info: the Minister on the queue for grid connections',
    body:
      'The Minister presents his compliments. The queue for connections to the grid is now longer than the grid. ' +
      'Several campuses ask to be moved to the front, citing jobs. The Minister is listening, and would welcome the ' +
      'proprietor’s view on whether the queue should be connected, held, or reviewed in due course.',
    arms: [
      {
        label: 'Review the queue',
        outcome: 'The queue is reviewed, and grows while it is.',
        price: 'Mandate comes slower while the review sits',
        modifier: timed(8, mrate(0.95)),
      },
      {
        label: 'Connect them all',
        outcome: 'Every campus is connected, and every campus fills.',
        price: 'A grid built for the campuses',
        effects: [cash(40)],
        modifier: timed(15, sat(P, 1.04)),
        reply: 'info: queue cleared; all campuses connected',
      },
      {
        label: 'Hold to the queue',
        outcome: 'The queue holds, first come first served, and the campuses complain of it.',
        price: 'The campuses’ custom',
        effects: [mandate(40)],
        modifier: timed(10, income(0.94, P)),
      },
    ],
    rebound: 'Supply on demand: capacity granted to the queue is filled by the queue',
  },
  {
    id: 'd.compute.oldPhone', cast: 'correspondent', sector: P, when: AFTER_FIRST,
    headline: 'info: readers keep their old phones another year',
    body:
      'The paper’s readers report keeping their phones a year longer than they used to. The money saved has gone, by ' +
      'their own account, on more streaming, more storage and a larger plan. The repair shops would like a mention. ' +
      'So would the phone makers, who are offering a credit for the old one. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Mention the repair shops',
        outcome: 'The repair shops are busy, and the savings go on streaming.',
        price: '£ for the advertisement, and the savings spent online',
        cost: { capitalSeconds: 20 },
        modifier: timed(12, sat(P, 0.97), wellbeing(0.45), half(P, 1.03, 'compute.streaming')),
      },
      {
        label: 'Run the trade-in credit',
        outcome: 'The old phones go back, the new ones come out, and the plans grow.',
        price: 'More devices, and more to fill them',
        effects: [cash(30)],
        modifier: timed(10, sat(P, 1.03)),
        reply: 'info: trade-in credit taken up; data plans upgraded',
      },
    ],
    defaultArm: 1,
    rebound: 'Respending: money saved by keeping the device is spent on what runs on it',
  },
];
