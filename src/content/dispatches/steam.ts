/**
 * M3 dispatches for Steam (eligible while Steam is open). The Colliery Gazette's register: engine houses, collieries,
 * the duty table, the Exchange, the vestry. Append, never reorder.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 *
 * Facts: the Cornish duty table (design/research/energy.md 1.7); Jevons on the coal tax, ch. VII [V] (energy.md 1.5).
 * The firedamp letter is fictional; its mechanism is the finding of the 1835 Select Committee on Accidents in Mines,
 * that the safety lamp led to more accidents by encouraging the working of districts once closed as unsafe (checked:
 * Grace's Guide, "Davy Lamp", and the Davy lamp article's account of the 1835 report). Sombre, and never a joke.
 */
import type { DispatchDef } from '../../types';
import {
  AFTER_FIRST, BUDGET, SEAMS, absorb, all, answered, any, cash, cheaper, eta, income, intensity, mandate, mrate,
  owns, price, sat, sec, smoke, timed, wellbeing,
} from './kit';

const S = 'steam';

export const steamDispatches: DispatchDef[] = [
  /* ---- Run 2: the correspondent ---- */
  {
    id: 'd.steam.nightPump', cast: 'correspondent', sector: S, when: AFTER_FIRST,
    headline: 'Low Fell colliery asks to rent the proprietor’s engine by night',
    body:
      'The owners at Low Fell have watched the proprietor’s engine stand idle from dusk to dawn and would rent it for ' +
      'the night, at a price that pays for the coal and a little over. Their pit floods by morning without it. With it, ' +
      'they say, they could work the lower level. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Rent the engine by night',
        outcome: 'The engine works round the clock, and Low Fell opens its lower level.',
        price: 'The night shift burns coal too, and smokes',
        effects: [cash(30), smoke(S, 0.08)],
        modifier: timed(10, sat(S, 1.06, 'steam.pumping')),
        reply: 'Proprietor’s engine to pump Low Fell by night; the lower level opens',
      },
      {
        label: 'Keep the nights quiet',
        outcome: 'The engine rests, the street sleeps, and Low Fell floods by morning.',
        price: 'The rent forgone',
        modifier: timed(8, wellbeing(0.6), income(0.95, S)),
      },
    ],
    defaultArm: 1,
    rebound: 'Utilisation: idle plant sold cheap finds a use, and the use burns coal',
  },
  {
    id: 'd.steam.millMoves', cast: 'correspondent', sector: S, when: all(AFTER_FIRST, owns('steam.mills')),
    headline: 'Mill leaves the river for the coalfield',
    body:
      'Mr Hebden is taking his mill off the river, where it has turned on water since his grandfather’s day, and ' +
      'rebuilding it beside the pit, where it will turn on steam. The river was free and often low. The coal costs ' +
      'money and is never low. He asks the proprietor for a contract, or for advice.',
    arms: [
      {
        label: 'Supply the new mill',
        outcome: 'The mill is rebuilt by the pithead and runs in every season.',
        price: 'A second chimney on the skyline',
        effects: [cash(40), smoke(S, 0.03)],
        reply: 'Hebden’s mill quits the river for the pithead; the wheel is sold',
      },
      {
        label: 'Advise him to keep the wheel',
        outcome: 'Mr Hebden keeps the wheel for low water and the engine for droughts.',
        price: 'The bigger contract',
        modifier: timed(15, intensity(S, 0.925), income(0.94, S), wellbeing(0.5)),
      },
    ],
    rebound: 'The frontier: cheap power frees the mill from the river, and the mill goes where the coal is',
  },
  {
    id: 'd.steam.infirmary', cast: 'correspondent', sector: S, when: all(AFTER_FIRST, sec('crises', S, '>=', 1)),
    headline: 'Infirmary asks for subscriptions after the fog',
    body:
      'The infirmary took in more patients in the week of the fog than in the quarter before it, and has spent its ' +
      'year’s coal on keeping them warm. It asks the trade for subscriptions. The colliery owners’ association has ' +
      'replied that the fog was weather, and offers to say so in the Gazette at its own expense.',
    arms: [
      {
        label: 'Print the owners’ letter',
        outcome: 'The fog is weather, the owners pay for the column, and the clubs are unconvinced.',
        price: 'Mandate comes slower for a while',
        effects: [cash(15)],
        modifier: timed(10, mrate(0.9)),
      },
      {
        label: 'Subscribe to the infirmary',
        outcome: 'The wards are warm again, and the town remembers who paid.',
        price: '£, and the owners’ coolness',
        cost: { capitalSeconds: 25 },
        effects: [mandate(25)],
        modifier: timed(15, wellbeing(0.9)),
        reply: 'Proprietor subscribes to the infirmary; owners call it “weather”',
      },
    ],
    rebound: 'The bill for the smoke is booked as trade: the fog’s cost appears in nobody’s ledger as coal',
  },
  {
    id: 'd.steam.pitShares', cast: 'correspondent', sector: S, when: all(AFTER_FIRST, sec('rebound', S, '>=', 1)),
    headline: 'Coal owners offer the proprietor shares in a new pit',
    body:
      'The coal owners have had their best year on record and are grateful. Each engine of the proprietor’s that saves ' +
      'a ton, they say, has sold them three. They are sinking a new pit at Whinfield on the strength of it and offer ' +
      'the proprietor shares at par. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Take the shares',
        outcome: 'Whinfield is sunk, and the proprietor profits on both sides of every ton.',
        price: 'A stake in burning more, and the smoke of it',
        effects: [smoke(S, 0.08)],
        modifier: timed(12, income(1.08, S), sat(S, 1.025)),
        reply: 'Proprietor takes shares in Whinfield; the engines and the coal agree',
      },
      {
        label: 'Decline the shares',
        outcome: 'Whinfield is sunk without the proprietor, and the owners are hurt.',
        price: 'Their dividend, and their custom for a while',
        effects: [mandate(35)],
        modifier: timed(8, income(0.95, S)),
      },
    ],
    defaultArm: 1,
    rebound: 'Backfire: the coal saved at the engine is sold again at the pithead',
  },
  {
    id: 'd.steam.washDay', cast: 'correspondent', sector: S, when: all(AFTER_FIRST, sec('pressureFraction', S, '>=', 0.25)),
    headline: 'Laundresses petition the proprietor on behalf of Monday',
    body:
      'The laundresses of the lower town have signed a petition, in a fair hand, asking that the engine fires be banked ' +
      'on Mondays, when the washing is out. They do not ask for less smoke, only for none on Monday. Their husbands ' +
      'work the engines, and are content with any arrangement that keeps the peace at home.',
    arms: [
      {
        label: 'Send the parish soap',
        outcome: 'Soap arrives by the cartload, and the washing comes in grey as before.',
        price: '£ for the soap, and a grey Monday',
        effects: [cash(-12), mandate(20)],
      },
      {
        label: 'Bank the fires on Mondays',
        outcome: 'Monday’s washing comes in white, and Tuesday’s comes in twice as grey.',
        price: 'A day’s output in seven',
        modifier: timed(15, intensity(S, 0.85), income(0.95, S), wellbeing(0.5)),
        reply: 'Fires banked on wash day; Tuesday “the new Monday”, say laundresses',
      },
    ],
    rebound: 'Shifted, not cut: the smoke moves to the days nobody complains of it',
  },
  {
    id: 'd.steam.excursion', cast: 'correspondent', sector: S, when: all(AFTER_FIRST, owns('steam.railways')),
    headline: 'Shilling excursions to the sea fill the Sunday trains',
    body:
      'The railway ran its first Sunday excursion to the coast last week: eleven hundred passengers, a band, and a ' +
      'shilling a head. The company would run one every Sunday if the proprietor will supply the extra power at the ' +
      'weekday rate. The chapel has written separately, and at length.',
    arms: [
      {
        label: 'Run the Sunday excursions',
        outcome: 'Every Sunday the trains fill, and the town goes to the sea and back by coal.',
        price: 'Sunday coal, and the chapel’s displeasure',
        modifier: timed(15, sat(S, 1.05, 'steam.railways'), wellbeing(0.6)),
        reply: 'Sunday excursions to run weekly; the chapel preaches on the Sabbath',
      },
      {
        label: 'Keep Sunday quiet',
        outcome: 'The trains stay in the shed on Sundays, and the chapel is full.',
        price: 'The excursion fares',
        effects: [mandate(20)],
        modifier: timed(10, income(0.94, S)),
      },
    ],
    defaultArm: 1,
    rebound: 'Time saved is spent travelling: a cheaper journey makes a new journey, not a shorter one',
  },

  /* ---- Run 3 on: Mr Whitlow ---- */
  {
    id: 'd.steam.slackLine', cast: 'whitlow', sector: S, when: all(BUDGET, owns('steam.cap')),
    headline: 'Mr Whitlow on a coal line drawn from the owners’ own forecasts',
    body:
      'I have compared the coal line with the owners’ forecasts, from which the clerks drew it. They are the same ' +
      'figures, to the ton. The owners forecast generously in the year the line was drawn. It follows that the line ' +
      'will not bite for some years, and that the permits will be worth nothing until it does.',
    arms: [
      {
        label: 'Keep the line as drawn',
        outcome: 'The line stands, the permits trade at a farthing, and the owners grow fond of it.',
        price: 'A line that does not bite',
        modifier: timed(10, sat(S, 1.025)),
      },
      {
        label: 'Redraw from his tables',
        outcome: 'The line is redrawn from Mr Whitlow’s tables, and the permits are worth having.',
        price: 'Mandate, and the owners’ fondness',
        cost: { mandate: 35 },
        modifier: timed(15, sat(S, 0.94), income(0.95, S)),
        reply: 'Coal line redrawn from Whitlow’s tables; owners dispute the decimals',
      },
    ],
    rebound: 'Over-allocation: a cap drafted from the forecasts of those it caps starts slack',
  },
  {
    id: 'd.steam.ironmasters', cast: 'whitlow', sector: S, when: all(BUDGET, owns('steam.duty')),
    headline: 'Mr Whitlow quotes his master to the ironmasters',
    body:
      'My old master wrote that “a small tax on the ton of coal would be a heavy tax on the ton of iron”. It was never ' +
      'an argument against the duty; it is an argument for knowing who pays it. The ironmasters will ask this week to ' +
      'be exempted. If they are, the cheapest coal in the valley goes to the largest furnaces in it.',
    arms: [
      {
        label: 'Exempt the ironmasters',
        outcome: 'The furnaces are spared the duty and burn accordingly.',
        price: 'Untaxed coal for the hungriest furnaces',
        effects: [mandate(50), wellbeing(1), absorb(S, 0.002)],
        modifier: timed(12, price(S, 0.93)),
        reply: 'Ironmasters exempted from the coal duty; furnaces relit',
      },
      {
        label: 'Refuse the exemption',
        outcome: 'The duty falls on every ton alike, and the ironmasters remember it.',
        price: 'The ironmasters’ votes',
        modifier: timed(10, mrate(0.9)),
      },
    ],
    defaultArm: 1,
    rebound: 'Leakage by exemption: the heaviest user is spared the measure',
  },

  /* ---- Run 4 on: Mr Ashworth and the seams ---- */
  {
    id: 'd.steam.ashworthPump', cast: 'ashworth', sector: S, when: SEAMS,
    headline: 'Mr Ashworth offers a pumping engine for the next seam down',
    body:
      'Ashworth & Sons have built a pumping engine that lifts water at half the coal of any in the county. It will keep ' +
      'the next seam down dry, which no engine has managed before. My eldest has tested it at our own pit. I offer it ' +
      'to the proprietor first, at a fair price, and with every confidence that it will save a great deal of coal.',
    arms: [
      {
        label: 'Decline with thanks',
        outcome: 'Mr Ashworth sells the engine to a rival pit, with every confidence.',
        price: 'Mr Ashworth’s next offer goes elsewhere first',
        modifier: timed(8, income(0.96, S)),
      },
      {
        label: 'Order the new engine',
        outcome: 'The deep seams come within easy reach, and the reserve grows to be burned.',
        price: '£, a deeper pit to keep dry, and more smoke',
        cost: { capitalSeconds: 40 },
        effects: [cheaper(S, 0.93), sat(S, 1.03, 'steam.pumping'), smoke(S, 0.08)],
        next: 'd.steam.firedamp',
        reply: 'Ashworth engine to pump the deep seams “at half the coal”',
      },
      {
        label: 'Use it on the old seam',
        outcome: 'The old workings run drier and cheaper, and go a little deeper anyway.',
        price: '£, and some deeper working all the same',
        cost: { capitalSeconds: 25 },
        effects: [eta(S, 1.03), sat(S, 1.02, 'steam.pumping'), wellbeing(1), absorb(S, 0.002)],
      },
    ],
    rebound: 'Supply rebound: cheap pumping reaches the next seam, and the reserve grows to be burned',
  },
  {
    id: 'd.steam.firedamp', cast: 'ashworth', sector: S, once: true,
    when: any(answered('d.steam.ashworthPump', 1), sec('seamsSunk', S, '>=', 3)),
    headline: 'Firedamp at the deep workings; eleven men and boys lost',
    body:
      'There was an explosion at the deep workings on Thursday, in a district our engine made workable. Eleven men and ' +
      'boys did not come up. The firm has sent the families what a firm can send. The lamps are sound, but I fear the ' +
      'lamps are what let the viewers open districts they once left alone. I ask the proprietor to close them, or to ' +
      'pay for ventilation.',
    arms: [
      {
        label: 'Order an inquiry',
        outcome: 'The inspector’s report is thorough, and the districts stay open while he writes it.',
        price: 'Time, and the colliers’ trust',
        modifier: timed(10, mrate(0.9)),
      },
      {
        label: 'Close the gassy districts',
        outcome: 'The districts are walled up with the coal still in them.',
        price: 'Dearer coal for a while',
        modifier: timed(15, price(S, 1.1)),
        reply: 'Gassy districts closed at the deep workings',
      },
      {
        label: 'Pay for ventilation',
        outcome: 'A ventilating furnace is built at the upcast shaft, and the districts are worked again.',
        price: '£, and the districts worked on',
        cost: { capitalSeconds: 50 },
        effects: [mandate(20), wellbeing(1), absorb(S, 0.002)],
        reply: 'Ventilating furnace ordered for the deep workings',
      },
    ],
    rebound: 'Risk compensation: the safety lamp opened the districts it made safe enough to enter',
  },

  /* ---- Run 4 on: Mrs Fenwick's tall chimney, and its sequel ---- */
  {
    id: 'd.steam.tallChimney', cast: 'fenwick', sector: S, when: sec('pressureFraction', S, '>=', 0.15),
    headline: 'Mrs Fenwick proposes a chimney three hundred feet tall',
    body:
      'The Society has a remedy. A chimney of three hundred feet carries the smoke above the town, and the town’s ' +
      'washing, lungs and lamps are spared. Our engineer has drawn one. Smoke-consuming grates would do more, but cost ' +
      'more, and the owners will not fit them unasked. The Society meets on the first Tuesday.',
    arms: [
      {
        label: 'Thank the Society',
        outcome: 'The drawing is framed in the Society’s rooms, and the smoke stays where it is.',
        price: 'A little more smoke over the town',
        effects: [smoke(S, 0.015)],
      },
      {
        label: 'Build the tall chimney',
        outcome: 'The town’s air clears, and the smoke goes somewhere further off.',
        price: '£, and the next valley’s air',
        cost: { capitalSeconds: 35 },
        effects: [intensity(S, 0.85), wellbeing(1), absorb(S, 0.002)],
        next: 'd.steam.nextValley',
        reply: 'Three-hundred-foot chimney finished; the town sees the hills again',
      },
      {
        label: 'Require smokeless grates',
        outcome: 'The grates are fitted under protest and burn their own smoke.',
        price: 'Mandate, and the owners’ protest in the takings',
        cost: { mandate: 35 },
        modifier: timed(15, intensity(S, 0.85), income(0.95, S)),
      },
    ],
    rebound: 'Displacement: a tall chimney exports the smoke it removes',
  },
  {
    id: 'd.steam.nextValley', cast: 'fenwick', sector: S, once: true, when: answered('d.steam.tallChimney', 1),
    headline: 'The next valley writes about the proprietor’s chimney',
    body:
      'Our sister society in the next valley reports that its washing now comes in grey on the days ours comes in ' +
      'white, and when the wind is in the west, on all of them. They ask, civilly, for compensation, or for the ' +
      'chimney to be made shorter. I have told them we will put it to the proprietor.',
    arms: [
      {
        label: 'Ignore the next valley',
        outcome: 'The next valley petitions Parliament, which takes its time and its Mandate.',
        price: 'Mandate comes slower for a while',
        modifier: timed(10, mrate(0.92)),
      },
      {
        label: 'Pay compensation',
        outcome: 'The next valley is paid for its washing, and the chimney keeps its height.',
        price: '£, every quarter it blows from the west',
        cost: { capitalSeconds: 30 },
        effects: [mandate(30)],
      },
      {
        label: 'Burn less, not higher',
        outcome: 'The engines run lighter, and both valleys see the hills.',
        price: 'Lower sales for a while',
        effects: [mandate(40), wellbeing(1), absorb(S, 0.002)],
        modifier: timed(15, sat(S, 0.94)),
        reply: 'Proprietor to burn less rather than higher; both valleys see the hills',
      },
    ],
    rebound: 'Displacement, returned: the exported smoke comes back as a bill',
  },

  /* ---- Mr Pryce, of the mills ---- */
  {
    id: 'd.steam.pryceNight', cast: 'pryce', sector: S, when: owns('steam.mills'),
    headline: 'Mr Pryce would run his mills all night, at a price',
    body:
      'Pryce & Sons would put on a night shift at the mills if power were cheaper after dark. The engines idle then in ' +
      'any case; the proprietor would be selling what is now wasted. My hands want the work and my customers want the ' +
      'calico. Everybody is the better for it, and I cannot see who is the worse.',
    arms: [
      {
        label: 'Hold the night price',
        outcome: 'The mills close at dusk, and Mr Pryce says so in the Exchange.',
        price: 'Mr Pryce’s night custom',
        modifier: timed(10, income(0.95, S)),
      },
      {
        label: 'Sell night power cheap',
        outcome: 'The mills never stop, and neither do their chimneys.',
        price: 'Mills that never stop, and their smoke',
        effects: [wellbeing(1), absorb(S, 0.002)],
        modifier: timed(15, sat(S, 1.06, 'steam.mills'), income(1.04, S)),
        reply: 'Pryce mills to run all night on cheap power; the hands are glad of it',
      },
    ],
    rebound: 'Utilisation: power sold cheap in the idle hours makes the idle hours busy',
  },
];
