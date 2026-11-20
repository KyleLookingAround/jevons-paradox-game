/**
 * M3 dispatches for Light (eligible while Light is open). The Evening Lamp's register: the parish, the gas company,
 * the Board, the ratepayers, the lamplighter's round. Append, never reorder.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 */
import type { DispatchDef } from '../../types';
import {
  AFTER_FIRST, BUDGET, absorb, all, cash, eta, half, income, intensity, mandate, mrate, not, owns, sat, smoke, timed,
  wellbeing,
stake, WAGER_WIN, WAGER_LOSE, sec } from './kit';

const L = 'light';

export const lightDispatches: DispatchDef[] = [
  /* ---- Run 2: the correspondent ---- */
  {
    id: 'd.light.alleys', cast: 'correspondent', sector: L, when: AFTER_FIRST,
    headline: 'The vestry would extend the lamplighter’s round to the alleys',
    body:
      'The lamps along the high street are so much brighter since the new burners that the alleys behind them look ' +
      'darker by comparison, and the vestry has had complaints. It proposes to extend the lamplighter’s round to every ' +
      'court and alley in the parish, and asks the proprietor to supply them. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Light the alleys',
        outcome: 'Every court in the parish gets its lamp, and the gas bill gets a new page.',
        price: 'More lamps, and more gas',
        modifier: timed(10, sat(L, 1.06, 'light.streetLamps'), wellbeing(0.45)),
        reply: 'Lamplighter’s round extended to every alley; he asks for a boy',
      },
      {
        label: 'Light the main streets only',
        outcome: 'The alleys stay dark, and the vestry minutes its disappointment.',
        price: 'The vestry’s custom for a while',
        effects: [mandate(15)],
        modifier: timed(8, income(0.95, L)),
      },
    ],
    rebound: 'The brighter lamp makes the dark more noticeable: a new standard of lighting, then a new demand',
  },
  {
    id: 'd.light.lateWindows', cast: 'correspondent', sector: L, when: AFTER_FIRST,
    headline: 'Mercers would keep their windows lit after closing',
    body:
      'The mercers of the arcade have found that a window lit after closing sells more silk the next morning than one ' +
      'left dark, and would keep their gas burning till midnight if the company would sell it cheaper after ten. The ' +
      'windows illuminate nothing in particular. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Supply the late windows',
        outcome: 'The arcade glows till midnight, and the next street asks for the same.',
        price: 'Light that lights nothing, all night',
        effects: [cash(30)],
        modifier: timed(10, sat(L, 1.03)),
        reply: 'Arcade windows to burn till midnight; the next street wants the same',
      },
      {
        label: 'Lights out at ten',
        outcome: 'The arcade goes dark at ten, and the mercers write to the Board.',
        price: 'The late custom',
        effects: [mandate(20)],
        modifier: timed(10, income(0.94, L), wellbeing(1), absorb(L, 0.002)),
      },
    ],
    rebound: 'Light for its own sake: the cheaper the lamp, the more of the night is lit',
  },
  {
    id: 'd.light.readingRoom', cast: 'correspondent', sector: L, when: AFTER_FIRST,
    headline: 'Mechanics ask for gas in the reading room after dark',
    body:
      'The reading room closes at dusk, which in December is four o’clock, before most of its members have left work. ' +
      'The committee asks for gas to be laid on so that it may open in the evenings. The members have offered to pay ' +
      'half. The vicar notes that the public houses are already lit.',
    arms: [
      {
        label: 'Close at dusk',
        outcome: 'The reading room closes at four, and the public houses do not.',
        price: 'The members’ goodwill',
        modifier: timed(8, mrate(0.93)),
      },
      {
        label: 'Pay the other half',
        outcome: 'The reading room is full every evening, and the evening is a new thing to fill.',
        price: '£, and gas for the new evenings',
        cost: { capitalSeconds: 20 },
        modifier: timed(12, sat(L, 1.02), wellbeing(1), absorb(L, 0.002)),
        reply: 'Reading room lit till ten; members read, and so do the gas meters',
      },
    ],
    rebound: 'The evening invented: light makes a new use of the hours it lights',
  },
  {
    id: 'd.light.slotMeters', cast: 'correspondent', sector: L, when: all(AFTER_FIRST, not(owns('light.slotMeter'))),
    headline: 'Gas by the penny proposed for the back streets',
    body:
      'The company proposes a meter that takes pennies, for households that cannot keep a quarterly account. Gas ' +
      'would reach streets that have never had it, a penny at a time. The company is candid that a penny at a time ' +
      'adds up to a great many therms. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Fit the penny meters',
        outcome: 'The back streets are lit, a penny at a time, and the pennies add up.',
        price: 'Thousands of new burners',
        effects: [cash(15)],
        modifier: timed(12, sat(L, 1.06, 'light.homes'), wellbeing(1), absorb(L, 0.002)),
        reply: 'Penny gas reaches the back streets; the company counts its coppers',
      },
      {
        label: 'Keep to quarterly accounts',
        outcome: 'Gas stays in the streets that can pay by the quarter.',
        price: 'The new custom',
        modifier: timed(8, income(0.95, L)),
      },
    ],
    defaultArm: 1,
    rebound: 'The frontier reaches the back streets: a penny at a time is still demand',
  },

  /* ---- Run 3 on: Mr Whitlow ---- */
  {
    id: 'd.light.cheaperTherm', cast: 'whitlow', sector: L, when: BUDGET,
    headline: 'Mr Whitlow on the gas company’s cheaper therm',
    body:
      'The mantle gives three times the light of the old burner for the same gas, and the company proposes to pass the ' +
      'saving on by cutting the price of a therm. I have no objection to cheap light. I note only that every cut in the ' +
      'price of a therm so far has sold more therms, and that the coal for them comes from the same pits.',
    arms: [
      {
        label: 'Let the price fall',
        outcome: 'The therm is cheaper, and the town buys more of them than ever.',
        price: 'More therms, and more coal for them',
        effects: [cash(20)],
        modifier: timed(10, sat(L, 1.04)),
      },
      {
        label: 'Hold the price up',
        outcome: 'The price holds, the saving stays a saving, and the ratepayers grumble.',
        price: 'The ratepayers’ grumbling, and fewer new lamps',
        modifier: timed(12, half(L, 0.92), income(1.03, L)),
        reply: 'Gas company holds the therm at its old price; the ratepayers grumble',
      },
    ],
    rebound: 'The direct rebound in the lamp: a thriftier burner sells more therms',
  },

  /* ---- Run 4 on: Mr Ashworth and the load ---- */
  {
    id: 'd.light.afternoons', cast: 'ashworth', sector: L,
    headline: 'Mr Ashworth would sell the power station’s afternoons',
    body:
      'Our station is built for the hour after dusk, and for the rest of the day it waits. That is capital standing ' +
      'idle. The tramway company will buy every afternoon we have, cheap. My sons have also drawn a smaller station ' +
      'that meets the evening alone, which would cost more per unit and idle less. Either is sound engineering.',
    arms: [
      {
        label: 'Leave the plant as it is',
        outcome: 'The station waits for dusk, as it always has.',
        price: 'Capital standing idle',
        modifier: timed(8, income(0.96, L)),
      },
      {
        label: 'Sell afternoons to trams',
        outcome: 'The trams run all afternoon on the station’s idle hours, and the station never cools.',
        price: 'A station that never idles, and never cools',
        modifier: timed(15, sat(L, 1.06, 'light.trams'), income(1.04, L), wellbeing(1), absorb(L, 0.002)),
        reply: 'Tramways to run on the power station’s idle afternoons',
      },
      {
        label: 'Build for the evening only',
        outcome: 'A smaller station meets the evening and idles little, at a higher price per unit.',
        price: '£ for the new plant, and dearer current',
        cost: { capitalSeconds: 35 },
        modifier: timed(15, half(L, 0.95)),
      },
    ],
    rebound: 'Utilisation: the idle plant sells its hollows, and the hollows fill',
  },
  {
    id: 'd.light.longLamp', cast: 'ashworth', sector: L, when: owns('light.phoebus'),
    headline: 'Mr Ashworth offers a lamp that lasts two thousand hours',
    body:
      'Ashworth & Sons can make a lamp that lasts two thousand hours, twice what the makers in Geneva agreed a lamp ' +
      'should last. It is a better lamp and we are proud of it. I am told it would sell half as many lamps. I do not see ' +
      'why that should concern an engineer, but my sons tell me it concerns a shareholder.',
    arms: [
      {
        label: 'Keep the agreed lamp',
        outcome: 'The thousand-hour lamp stays in the shops, and the public begins to notice.',
        price: 'The public’s patience',
        modifier: timed(10, income(1.04, L), mrate(0.93)),
      },
      {
        label: 'Sell the long-life lamp',
        outcome: 'The better lamp goes on sale, lamp sales halve, and people light another room.',
        price: '£ to retool, half the lamp sales, and another room lit',
        cost: { capitalSeconds: 30 },
        effects: [eta(L, 1.04), sat(L, 1.015), income(0.97, L)],
        modifier: timed(10, wellbeing(1), absorb(L, 0.002)),
        reply: 'Two-thousand-hour lamp on sale; Geneva “disappointed”',
      },
    ],
    rebound: 'Durability spent: a lamp that lasts longer is left on longer, in more rooms',
  },

  /* ---- Run 4 on: Mrs Fenwick ---- */
  {
    id: 'd.light.gasworks', cast: 'fenwick', sector: L,
    headline: 'Mrs Fenwick on the gasworks by the river',
    body:
      'The Society has walked the river path below the gasworks and counted what it saw: tar on the water, a smell ' +
      'that stops conversation, and fog that settles there first and lifts last. Lime purifiers would clean the gas ' +
      'and the air, and cost money. Coke ovens would sell the waste, and burn it. The Society meets on the first Tuesday.',
    arms: [
      {
        label: 'Note the complaint',
        outcome: 'The complaint is noted, and the river path is closed for the season.',
        price: 'A little more fog by the river',
        effects: [smoke(L, 0.015)],
      },
      {
        label: 'Fit lime purifiers',
        outcome: 'The gas burns cleaner, and the river path reopens.',
        price: '£ for the purifiers',
        cost: { capitalSeconds: 30 },
        modifier: timed(15, intensity(L, 0.85), wellbeing(1), absorb(L, 0.002)),
        reply: 'Lime purifiers fitted at the gasworks; the river path reopens',
      },
      {
        label: 'Sell the waste as coke',
        outcome: 'The waste is sold as coke, which the town burns in its grates instead.',
        price: 'The smoke moves into the town’s grates',
        effects: [cash(30)],
        modifier: timed(12, intensity(L, 0.925), sat('steam', 1.02)),
      },
    ],
    rebound: 'Waste made a product: a by-product sold is a by-product burned elsewhere',
  },

  /* ---- Mr Pryce ---- */
  {
    id: 'd.light.flatRate', cast: 'pryce', sector: L,
    headline: 'Mr Pryce asks for electric light at a flat rate',
    body:
      'Pryce & Sons would wire every floor of the works for electric light if the current came at a flat rate: so ' +
      'much a quarter, whatever is burned. Meters are a nuisance and my foremen cannot read them. A flat rate is ' +
      'simple, fair, and the station will sell more current than it ever has. I mean that as a compliment.',
    arms: [
      {
        label: 'Meter every lamp',
        outcome: 'Every lamp is metered, and Mr Pryce wires half the works.',
        price: 'Half Mr Pryce’s custom',
        effects: [mandate(20)],
        modifier: timed(10, income(0.95, L)),
      },
      {
        label: 'Grant the flat rate',
        outcome: 'The works are lit on every floor at every hour, since nothing is saved by switching off.',
        price: 'Lamps left burning, and the fog that comes of it',
        effects: [cash(25), smoke(L, 0.08)],
        modifier: timed(15, sat(L, 1.05)),
        reply: 'Pryce works lit at a flat rate; nobody at Pryce’s switches off',
      },
    ],
    rebound: 'A price that does not move: once the light costs nothing at the margin, nobody turns it off',
  },

  /* ---- Run 5 on: the Minister ---- */
  {
    id: 'd.light.dimOut', cast: 'minister', sector: L,
    headline: 'The Minister asks for the lamps to be dimmed for the winter',
    body:
      'The Minister presents his compliments. Coal is short this winter, and he proposes that street and shop lamps ' +
      'be dimmed until the spring, as an emergency measure, temporary, and to be reviewed in due course. He is ' +
      'listening to the shopkeepers, who are making themselves heard.',
    arms: [
      {
        label: 'Comply in part',
        outcome: 'Some lamps are dimmed, some are not, and the shopkeepers are only half annoyed.',
        price: 'A half-measure, and half the credit',
        modifier: timed(10, sat(L, 0.95), mrate(0.95)),
      },
      {
        label: 'Dim them all',
        outcome: 'The town is dim till spring, and in the spring it lights up brighter than before.',
        price: 'A dim winter, and Mandate to carry it',
        cost: { mandate: 20 },
        /* M4 (finish): a wager. READS: Steam's coal gauge (the Minister says coal is short; is it?). */
        wager: {
          when: sec('reserveFraction', 'steam', '<', 0.5),
          hint: 'Pays if coal really is short: more than half of it gone',
          win: {
            outcome: 'Coal was short: the dim winter saves it, and the House thanks the proprietor.',
            effects: [stake(WAGER_WIN), mandate(60)],
            modifier: timed(15, sat(L, 0.88), wellbeing(-0.5)),
            reply: 'Lamps dimmed for the winter by order; the coal lasts to spring',
          },
          lose: {
            outcome: 'Coal was plentiful: the town sat in the dark for nothing, and the shopkeepers say so.',
            effects: [stake(WAGER_LOSE)],
            modifier: timed(10, sat(L, 0.95), wellbeing(-0.5)),
            reply: 'Lamps dimmed by order; the coal yards are full',
          },
        },
      },
      {
        label: 'Ask for an exemption',
        outcome: 'The proprietor’s lamps are exempted, and the Minister remembers the favour.',
        price: 'Mandate, spent on a favour',
        cost: { mandate: 25 },
        effects: [cash(20)],
      },
    ],
    rebound: 'Rebound after rationing: an emergency measure lapses and use returns above where it was',
  },
];
