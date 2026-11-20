/**
 * M5 dispatches for Plenty (eligible once Plenty is open, in a Ministry): Mrs Okonedo of the Fenland Growers (three)
 * and Sir Edmund Pryce on the company's farms (one). A separate export until the registry registers Plenty:
 * dispatches/index.ts appends ...plentyDispatches after ...chairDispatches. Append, never reorder.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts; the Ministry's
 * letter rules (a wager first each Parliament, PARLIAMENT_WAGERED on the others) as in chair.ts.
 *
 * Plenty's two honest gauges are the reading: Water applied and Water consumed side by side, with the share that
 * returns to the aquifer printed between them (StatKey 'returnShare'). Mrs Okonedo's wager is on that share.
 */
import type { Cond, DispatchDef, EffectDef, SectorId, StatKey } from '../../types';
import { all, cash, intensity, mandate, mrate, sat, smoke, stake, timed, wellbeing, WAGER_LOSE, WAGER_WIN } from './kit';

const P = 'plenty';
const st = (stat: StatKey, sector: SectorId, op: '<' | '<=' | '>' | '>=', value: number, label?: string): Cond =>
  (label ? { stat, sector, op, value, label } : { stat, sector, op, value });
const SITTING: Cond = all({ feature: 'chair' }, { stat: 'inOpposition', op: '<', value: 1, label: 'In office' });
const PARLIAMENT_WAGERED: Cond = { stat: 'parliamentWagers', op: '>=', value: 1 };
const confidence = (value: number): EffectDef => ({ type: 'confidenceAdd', value });

export const plentyDispatches: DispatchDef[] = [
  {
    id: 'd.plenty.okonedoMeters', cast: 'okonedo', sector: P, when: SITTING, weight: 2,
    headline: 'Mrs Okonedo: the growers will take meters, if the Board stays away',
    body:
      'The Association will put a meter on every pump and keep to a figure for what we lift, which is fair. What we ' +
      'will not have is the Board’s men in our fields with their sums about what the crop breathes out. A meter we ' +
      'can read. Whether a limit on the pump is a limit on the water depends on how much of it soaks back, which my ' +
      'father could tell you by the ditches.',
    arms: [
      {
        label: 'Keep the Board’s accounts',
        outcome: 'The Board keeps its accounts, and the growers keep complaining about them at every show.',
        price: 'The growers’ goodwill',
        modifier: timed(8, mrate(0.95)),
      },
      {
        label: 'Take the meters instead',
        outcome: 'Every pump is metered and held to a figure, and the Board’s field men are recalled.',
        price: 'Mandate, and the Board’s accounts set aside',
        cost: { mandate: 30 },
        /*
         * READS: Plenty's two gauges and the share printed between them ("{pct}% returns to the aquifer"). While a
         * third or more of what is lifted soaks back, a limit on the pump is nearly a limit on the loss; once drip and
         * pivots have cut the return, the meters count the wrong water.
         */
        wager: {
          when: st('returnShare', P, '>=', 0.33, 'A third of the water returns'),
          hint: 'Pays if a third or more of the water applied returns to the aquifer',
          win: {
            outcome: 'Most of the water soaked back: the meters hold the pumps, and the aquifer with them.',
            effects: [stake(WAGER_WIN), confidence(3)],
            reply: 'Fenland meters hold the pumps, and the water table',
          },
          lose: {
            outcome: 'Little of it soaked back: the meters read steady while the water table goes on falling.',
            effects: [stake(WAGER_LOSE), smoke(P, 0.03)],
            modifier: timed(10, sat(P, 1.05)),
            reply: 'Every pump metered; the wells go on falling',
          },
        },
      },
    ],
    rebound: 'Hidden flow: a limit on the water lifted is not a limit on the water lost',
  },
  {
    id: 'd.plenty.okonedoWells', cast: 'okonedo', sector: P, when: all(SITTING, PARLIAMENT_WAGERED),
    headline: 'Mrs Okonedo reports the wells at Fen End are dry by August',
    body:
      'Three wells at Fen End were dry by August, and the Hollises have had to go down another forty feet at their ' +
      'own cost. The young men say deepen them all, with a grant, and be done with it. I say buy out the licences of ' +
      'the two farms that pump the most, and pay them fairly. Either costs the Treasury. Only one leaves water for my ' +
      'grandchildren.',
    arms: [
      {
        label: 'Leave it to the growers',
        outcome: 'The growers deepen what they can afford to, and the shallow wells are abandoned.',
        price: 'The small farms, and their wells',
        effects: [mandate(-20)],
      },
      {
        label: 'Grant for deeper wells',
        outcome: 'Every well in the parish is deepened at the public cost, and the pumps run as before.',
        price: '£ from the Treasury, and more water lifted',
        cost: { capitalSeconds: 30 },
        effects: [confidence(3)],
        modifier: timed(10, sat(P, 1.06)),
        reply: 'Treasury deepens the Fen wells; pumping resumes',
      },
      {
        label: 'Buy out two licences',
        outcome: 'The two largest licences are bought out, and the water table at Fen End steadies.',
        price: '£ from the Treasury, and two farms’ harvests',
        cost: { capitalSeconds: 45 },
        modifier: timed(10, intensity(P, 0.92), wellbeing(-1)),
        reply: 'Ministry buys out Fen licences; the water table steadies',
      },
    ],
    rebound: 'Deeper wells for a falling table: the cure is more pumping',
  },
  {
    id: 'd.plenty.okonedoGrant', cast: 'okonedo', sector: P, when: all(SITTING, PARLIAMENT_WAGERED, { owns: 'plenty.dripSubsidy' }),
    headline: 'Mrs Okonedo on what the drip grant did for her neighbours',
    body:
      'My neighbours took the drip grant, and very good it is: not a drop wasted on any field they had. Then they ' +
      'ploughed the old pasture and put drip on that, and the orchard men from the city bought the scrub. The ditches ' +
      'that used to run in March are dry. Attach a condition, if the Ministry pleases: the grant for the acres a farm ' +
      'has, and none for new ones.',
    arms: [
      {
        label: 'Keep the grant as it is',
        outcome: 'The grant is paid on every acre, old and new, and the new orchards go in.',
        price: 'The ditches, and the scrub',
        modifier: timed(8, sat(P, 1.04, 'plenty.orchards')),
      },
      {
        label: 'No grant for new acres',
        outcome: 'The grant is confined to land already farmed, and the orchard men look elsewhere.',
        price: 'Mandate, and the orchard trade’s displeasure',
        cost: { mandate: 40 },
        modifier: timed(15, sat(P, 0.94, 'plenty.orchards'), sat(P, 0.97)),
        reply: 'Drip grant confined to land already farmed',
      },
    ],
    rebound: 'A subsidy for saving water: every acre uses less, and there are more acres',
  },
  {
    id: 'd.plenty.pryceFarms', cast: 'pryceChair', sector: P, when: all(SITTING, { feature: 'inspection' }),
    headline: 'Sir Edmund asks that the company’s farms report their own water',
    body:
      'Pryce Agricultural now farms more acres than the county, and keeps better books than most of it. The company ' +
      'proposes that its farms report their own water, applied and consumed, under the farm manager’s signature, and ' +
      'that the Inspectors leave them a decade in peace. The figures will be beautifully kept. The company has always ' +
      'kept its figures beautifully.',
    arms: [
      {
        stance: 'refuse',
        label: 'Keep inspecting the farms',
        outcome: 'The Inspectors keep calling at the farms, with their sample jars and their questions.',
        price: 'An Inspector’s time on the farms',
        modifier: timed(8, mrate(0.96)),
      },
      {
        stance: 'accept',
        label: 'Accept the farm returns',
        outcome: 'The company’s farms report their own water, beautifully kept, and the Inspectors go elsewhere.',
        price: 'Mandate, and the farms unwatched for a decade',
        cost: { mandate: 30 },
        modifier: timed(10, { type: 'quietYearsAdd', value: -2 }),
        /*
         * READS: Plenty's "Last inspected {year}" against Pryce's quiet period (his panel), or the true figure beside
         * the return while an inspection is in force.
         */
        wager: {
          when: st('concealment', P, '<', 0.05, 'Plenty’s returns within 5% of the truth'),
          hint: 'Pays if Pryce’s Plenty returns are within 5% of the truth now',
          win: {
            outcome: 'The farm returns were honest, and the Inspectors find better use for the decade.',
            effects: [stake(WAGER_WIN), mandate(40)],
            reply: 'Pryce farms report their own water, correctly',
          },
          lose: {
            outcome: 'The farm returns were not, and the aquifer was not told.',
            effects: [stake(WAGER_LOSE), cash(-20)],
            modifier: timed(10, sat(P, 1.05)),
            reply: 'Pryce farm returns kept beautifully, and low',
          },
        },
      },
    ],
    rebound: 'Self-reporting on a hidden flow: the figure that matters is the one hardest to check',
  },
];
