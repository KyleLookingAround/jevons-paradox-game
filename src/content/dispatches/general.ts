/**
 * M3 dispatches for any Industry and Age (Content.dispatches): the correspondent's first letters (run 2), and the
 * letters of the cast that belong to no one Industry. Append, never reorder: content order is the draw's tie-break.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 */
import type { DispatchDef } from '../../types';
import {
  AFTER_FIRST, BUDGET, COMMONS, FIRST_LETTER, absorb, all, answered, cash, forbidKind, growth, income, intensity,
  leak, leverCost, mandate, mrate, not, owns, people, price, rk, sat, smoke, suspendOrder, timed, wellbeing,
} from './kit';

export const generalDispatches: DispatchDef[] = [
  /* ---- Run 2: the correspondent alone, two answers each, nothing that outlasts five minutes ---- */
  {
    id: FIRST_LETTER, cast: 'correspondent', once: true,
    headline: 'The Gazette’s correspondent asks for the engine’s figures',
    body:
      'The Gazette has taken me on to report from the coalfield. The editor asks that the proprietor’s engines be ' +
      'entered in the monthly duty table, as the Cornish mines enter theirs. Buyers read the table closely. They would ' +
      'read it more closely still if it printed the tonnage beside the thrift. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Enter the thrift only',
        outcome: 'The engine heads the table, and three pits order its twin.',
        price: 'More engines, and more smoke',
        effects: [cash(30), smoke('steam', 0.03)],
        reply: 'Proprietor’s engine heads the duty table; three pits order its twin',
      },
      {
        label: 'Print the tonnage too',
        outcome: 'The table gains a column nobody asked for, and the clubs take note.',
        price: 'Buyers haggle while the column runs',
        effects: [mandate(40)],
        modifier: timed(15, income(0.93, 'steam'), wellbeing(0.5)),
        reply: 'Gazette prints the tonnage beside the thrift; owners wince',
      },
    ],
    rebound: 'Efficiency as a sport: the thrift is scored and published, the total is not',
  },
  {
    id: 'd.gen.advertisements', cast: 'correspondent', when: AFTER_FIRST,
    headline: 'Engine makers offer to buy the Gazette’s front page',
    body:
      'Three engine makers have offered to take the front page every week, at a handsome rate, to tell the county how ' +
      'little coal their engines burn. The advertisements are well drawn and quite true. The editor notes that the last ' +
      'town to read them bought twice the engines it meant to. He asks whether the page is for sale.',
    arms: [
      {
        label: 'Sell the page',
        outcome: 'The advertisements run, and so do the orders for coal.',
        price: 'A keener appetite for power, for a time',
        effects: [cash(25)],
        modifier: timed(10, sat('steam', 1.04)),
        reply: 'Engine makers take the front page; coal merchants take the back',
      },
      {
        label: 'Keep it for the news',
        outcome: 'The front page prints the news, and the makers take their money to a rival sheet.',
        price: 'The advertising money',
        modifier: timed(15, wellbeing(0.5)),
        effects: [cash(-15), mandate(25)],
      },
    ],
    rebound: 'Demand made to order: the advertised saving sells the engine, and the engine sells the coal',
  },
  {
    id: 'd.gen.hardWinter', cast: 'correspondent', when: AFTER_FIRST,
    headline: 'Hard frost; the parish asks for coal at cost for the poor',
    body:
      'The canal froze on Tuesday and the barges with it. Coal in the town has doubled since. The overseers of the poor ' +
      'ask whether the proprietor would sell to the parish at cost until the thaw. They point out, fairly, that cheap ' +
      'coal goes first into cold rooms and only then into savings. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Sell at the usual price',
        outcome: 'The coal sells, the takings are good, and the burial register is longer than last winter’s.',
        price: 'A colder parish',
        effects: [cash(20), people(0.99)],
      },
      {
        label: 'Sell at cost till the thaw',
        outcome: 'The parish is warm, and burns more coal than it has ever burned.',
        price: 'Lower takings, and more coal burned',
        modifier: timed(15, wellbeing(1), income(0.9, 'steam'), sat('steam', 1.025)),
        reply: 'Coal at cost for the parish until the thaw; the chimneys smoke merrily',
      },
    ],
    rebound: 'Comfort first: cheaper warmth is taken as warmth before any of it is taken as saving',
  },
  {
    id: 'd.gen.lyingIn', cast: 'correspondent', when: AFTER_FIRST,
    headline: 'Subscription opened for a lying-in hospital',
    body:
      'The vicar has opened a subscription for a lying-in hospital, the town having outgrown the midwife. The list is ' +
      'pinned in the vestry and the coal owners have signed it handsomely, which the vicar finds touching and the ' +
      'editor finds instructive. More mothers safely delivered means more households, and more hearths. The list closes on Sunday.',
    arms: [
      {
        label: 'Send regrets',
        outcome: 'The list closes short, and the hospital waits another year.',
        price: 'The vicar’s good opinion',
        modifier: timed(8, { type: 'mandateRateMul', value: 0.92 }),
      },
      {
        label: 'Subscribe handsomely',
        outcome: 'The hospital opens in the spring, and the parish registers fill faster.',
        price: '£, and more hearths to keep in coal',
        cost: { capitalSeconds: 30 },
        effects: [people(1.02), mandate(30)],
        modifier: timed(15, growth(1.1), wellbeing(0.5)),
        reply: 'Lying-in hospital opens; the parish orders a larger font',
      },
    ],
    rebound: 'The economy-wide rebound: a better-off town is a larger town, and a larger town burns more',
  },
  {
    id: 'd.gen.dutyRumour', cast: 'correspondent', when: all(AFTER_FIRST, not(owns('steam.duty'))),
    headline: 'Talk of a coal duty; owners double the winding hours',
    body:
      'Since a coal duty was mentioned in the House the owners have doubled their winding hours, to raise and sell ' +
      'every ton they can before it comes. Coal has never been so cheap in the valley, nor so much of it burned. ' +
      'The owners ask the proprietor to say plainly that no duty is intended. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Say nothing',
        outcome: 'The rush goes on, the price falls, and the furnaces are fed.',
        price: 'A glut of cheap coal, burned',
        modifier: timed(10, price('steam', 0.88)),
      },
      {
        label: 'Deny it in print',
        outcome: 'The winding slows to its old pace, and the clubs remember what was promised.',
        price: 'The proprietor’s word, if a duty comes',
        modifier: timed(12, mrate(0.88)),
        reply: 'No coal duty intended, says proprietor; the clubs make a note',
      },
    ],
    rebound: 'The green paradox: restraint announced and not yet in force hurries the extraction it threatens',
  },
  {
    id: 'd.gen.cartsRound', cast: 'correspondent', when: all(AFTER_FIRST, owns('steam.duty')),
    headline: 'Coal carts take the long road round the duty posts',
    body:
      'Since the duty came in, carts have been seen at night on the drovers’ road, which happens to pass outside the ' +
      'borough. The coal they carry pays nothing and sells for less. The constable has one lantern and a bad knee. ' +
      'The excise would watch the road if the proprietor would speak for it in the House.',
    arms: [
      {
        label: 'Leave it to the constable',
        outcome: 'The carts keep coming, and untaxed coal is cheaper than the coal that pays.',
        price: 'Cheaper coal, more of it burned, and more of it smuggled',
        modifier: timed(10, price('steam', 0.92), leak('steam', 1.5)),
      },
      {
        label: 'Speak for the excise',
        outcome: 'Excisemen watch the drovers’ road, and the duty is paid on every cart.',
        price: 'Mandate, spent in the House',
        cost: { mandate: 30 },
        modifier: timed(15, mrate(1.12), leak('steam', 0.6), wellbeing(0.5)),
        reply: 'Excise to watch the drovers’ road; carters discover religion',
      },
    ],
    rebound: 'Leakage: a measure stops at its boundary, and the coal goes round',
  },
  {
    id: 'd.gen.petition', cast: 'correspondent', when: all(AFTER_FIRST, owns('steam.duty')),
    headline: 'Petition against the coal duty carried from town to town',
    body:
      'A petition against the coal duty is going round the market towns on a cart of its own. It has eleven thousand ' +
      'names and a band. The petitioners do not dispute that the smoke is thinner. They dispute that they should pay ' +
      'for it. They would like to present it to the proprietor in person, on Thursday, at the Lamb.',
    arms: [
      {
        label: 'Let it run its course',
        outcome: 'The petition reaches the House with twenty thousand names, and Members grow cautious.',
        price: 'The coal duty costs half as much again to keep, for a while',
        modifier: timed(10, leverCost({ lever: 'steam.duty' }, 1, 1.5)),
      },
      {
        label: 'Meet them at the Lamb',
        outcome: 'The petitioners are heard, fed, and sent home with a pamphlet on the smoke.',
        price: '£ for the dinner and the pamphlets',
        modifier: timed(15, wellbeing(0.5)),
        cost: { capitalSeconds: 25 },
        effects: [mandate(30)],
        reply: 'Proprietor dines the petitioners; the petition loses its band',
      },
    ],
    rebound: 'Decay and repeal: the measure works, and so does the petition against it',
  },
  {
    id: 'd.gen.savingsBank', cast: 'correspondent', when: AFTER_FIRST,
    headline: 'Grocers report a record year on the money saved on coal',
    body:
      'The grocers report their best year. Coal is cheaper, and the households have spent what they saved on tea, ' +
      'sugar and calico, all of which came by steam. A Friendly Society proposes a penny savings bank, so that some ' +
      'of the saving stays saved, and asks the proprietor to stand guarantor. The editor would be glad of a line by return.',
    arms: [
      {
        label: 'Leave it to the grocers',
        outcome: 'The pennies are spent on goods that came by steam.',
        price: 'Every saving spent on something that burns',
        effects: [cash(15)],
        modifier: timed(10, sat('steam', 1.03)),
      },
      {
        label: 'Stand guarantor',
        outcome: 'The savings bank opens in the chapel schoolroom, and the pennies stay put.',
        price: '£ to guarantee it, and a quieter market',
        cost: { capitalSeconds: 25 },
        modifier: timed(15, sat('steam', 0.95), wellbeing(0.6)),
        reply: 'Penny bank opens in the schoolroom; grocers report a quieter week',
      },
    ],
    rebound: 'Respending: the money saved on coal buys goods made with coal',
  },

  /* ---- Run 3: Mr Whitlow's arc (a pamphlet ignored, then cited, then a chair) ---- */
  {
    id: 'd.gen.whitlowPamphlet', cast: 'whitlow', once: true,
    headline: 'Mr Whitlow sends a pamphlet on the coal that thrift does not save',
    body:
      'I enclose a pamphlet, printed at my own expense, which applies my old master’s arithmetic to this valley. Each ' +
      'engine that saves a ton has been followed by two more engines. It follows that a budget line drawn under the ' +
      'coal, and kept, would do what the engines cannot. I ask only that the Gazette print it, and that the Treasury read it.',
    arms: [
      {
        label: 'Acknowledge receipt',
        outcome: 'The pamphlet is filed, unread, with the others.',
        price: 'Mr Whitlow’s patience',
        modifier: timed(8, mrate(0.95)),
      },
      {
        label: 'Print it in the Gazette',
        outcome: 'The pamphlet runs over three Saturdays and is argued about in every club.',
        price: '£ for the printing, and the owners’ goodwill',
        cost: { capitalSeconds: 30 },
        effects: [mandate(50), wellbeing(1), absorb('steam', 0.002)],
        next: 'd.gen.whitlowCited',
        reply: 'Mr Whitlow’s pamphlet printed; the clubs find it tiresome',
      },
    ],
    rebound: 'The direct rebound, named: thrift multiplies engines',
  },
  {
    id: 'd.gen.whitlowCited', cast: 'whitlow', once: true, when: answered('d.gen.whitlowPamphlet'),
    headline: 'Mr Whitlow’s pamphlet quoted in the House, by both sides',
    body:
      'My pamphlet was quoted in Parliament twice this week: once for a coal duty and once against, the second time ' +
      'accurately. A society of Members asks whether I would keep the tables for a standing committee, entering every ' +
      'decade against its line. I would, if the proprietor would lend the committee the books.',
    arms: [
      {
        label: 'Keep the books private',
        outcome: 'The committee sits without figures and will report in due course.',
        price: 'A committee that guesses',
        modifier: timed(10, mrate(0.92)),
      },
      {
        label: 'Lend the books',
        outcome: 'The Whitlow tables are kept, and every decade is entered against its line.',
        price: 'Rivals read the books as well',
        effects: [mandate(40), mrate(1.06), income(0.97), wellbeing(1), absorb('steam', 0.002)],
        next: 'd.gen.whitlowChair',
        reply: 'Whitlow tables adopted by a committee of Members',
      },
    ],
    rebound: 'What is not counted rebounds unseen: the case for keeping the tables',
  },
  {
    id: 'd.gen.whitlowChair', cast: 'whitlow', once: true, when: all(rk(3), answered('d.gen.whitlowCited', 1)),
    headline: 'A chair of political economy proposed in Mr Whitlow’s name',
    body:
      'The committee proposes an endowed chair at the college, to keep the tables after I am gone. My physician thinks ' +
      'that will not be long, though he has thought so since the condenser. It wants a founding subscription. I should ' +
      'like the tables to outlive the argument, and both of us.',
    arms: [
      {
        label: 'Wish it well',
        outcome: 'A chair is founded later, smaller, and named after a coal owner.',
        price: 'The name on the door',
        modifier: timed(5, mrate(0.95)),
      },
      {
        label: 'Endow the chair',
        outcome: 'The Whitlow chair is founded, and the tables will be kept for good.',
        price: '£, a great deal of it',
        cost: { capitalSeconds: 60 },
        effects: [mrate(1.08), wellbeing(1), absorb('steam', 0.002)],
        reply: 'Whitlow chair founded; the tables to be kept in perpetuity',
      },
      {
        label: 'Ask the Treasury to fund it',
        outcome: 'The chair is founded on a Treasury grant, and the Treasury reads the tables first.',
        price: 'Mandate, and the Treasury’s hand on the tables',
        cost: { mandate: 50 },
        effects: [mrate(1.06), income(0.98)],
        reply: 'Treasury to fund the Whitlow chair; the tables to be “consulted”',
      },
    ],
    rebound: 'Institutions against rebound: a measure that lasts needs someone paid to remember it',
  },

  /* ---- Run 4 on: the rest of the cast ---- */
  {
    id: 'd.gen.bathsBoilers', cast: 'fenwick', when: all(COMMONS, owns('commons.baths')),
    headline: 'Mrs Fenwick counts the bathers, and the boilers',
    body:
      'The Society welcomes the baths and wash-houses and has counted the bathers: four hundred on Saturday. It has ' +
      'also counted the boilers: two, burning a ton a day between them. Our members would rather they burned coke, ' +
      'which smokes less and costs more. The vestry will do as the proprietor advises. The Society meets on the first Tuesday.',
    arms: [
      {
        label: 'Leave the boilers be',
        outcome: 'The baths stay full and the chimney stays black.',
        price: 'A little more smoke over the town',
        effects: [smoke('steam', 0.02)],
      },
      {
        label: 'Pay for coke',
        outcome: 'The baths burn coke, and the chimney thins to a grey wisp.',
        price: '£ every week the baths are open',
        effects: [wellbeing(1), absorb('steam', 0.002)],
        cost: { capitalSeconds: 30 },
        modifier: timed(15, intensity('steam', 0.88)),
        reply: 'Baths to burn coke, at the proprietor’s expense',
      },
      {
        label: 'Close the baths on Sundays',
        outcome: 'The boilers rest one day in seven, and so, unwillingly, do the bathers.',
        price: 'Sunday’s bathers, and their goodwill',
        modifier: timed(15, intensity('steam', 0.94), wellbeing(-0.4)),
      },
    ],
    rebound: 'The Commons rebound: the bath-house is heated by the coal it was built to spare',
  },
  {
    id: 'd.gen.ministerSession', cast: 'minister',
    headline: 'The Minister is listening, and would like a quiet session',
    body:
      'The Minister presents his compliments. A measure in force this session may not survive the next unless the ' +
      'proprietor is seen to support it, and support is most clearly seen as a subscription to the Ministry’s fund. ' +
      'Failing that, a promise of no new duties for a while would be received with gratitude, and some Mandate.',
    arms: [
      {
        label: 'Offer warm words',
        outcome: 'The Minister is grateful, briefly, and the session is long.',
        price: 'Mandate comes slower until it ends',
        modifier: timed(10, mrate(0.9)),
      },
      {
        label: 'Subscribe to the fund',
        outcome: 'The Ministry’s fund is the richer, and so is the proprietor’s standing in the House.',
        price: '£, and the look of the thing',
        cost: { capitalSeconds: 45 },
        effects: [mandate(90), wellbeing(1), absorb('steam', 0.002)],
        reply: 'Proprietor subscribes to the Ministry’s fund; Minister “grateful”',
      },
      {
        label: 'Promise no new duties',
        outcome: 'Mandate arrives at once, and no duty may be raised until the session ends.',
        price: 'No duty raised for a while, and the smoke meanwhile',
        effects: [mandate(60), smoke('steam', 0.08)],
        modifier: timed(10, forbidKind('duty')),
      },
    ],
    rebound: 'Restraint that depends on annual courage: the measure lasts as long as the session',
  },
  {
    id: 'd.gen.pryceUnderstanding', cast: 'pryce',
    headline: 'Mr Pryce proposes a gentleman’s understanding',
    body:
      'My family has made things cheaper for four generations and the customer has thanked us every time. I hear a new ' +
      'duty is coming. I propose instead an understanding: Pryce & Sons will report its own figures, faithfully, and ' +
      'the inspectors need not trouble themselves. My father had the same arrangement with the proprietor’s.',
    arms: [
      {
        label: 'Decline the understanding',
        outcome: 'Mr Pryce takes it well, and takes his custom to the Exchange.',
        price: 'Mr Pryce’s goodwill, and his custom',
        modifier: timed(10, income(0.94)),
      },
      {
        label: 'Shake hands on it',
        outcome: 'The figures arrive on time, beautifully bound, and a little low.',
        price: 'Unchecked figures, no duty raised, and more smoke',
        effects: [mandate(30), cash(20), smoke('steam', 0.08)],
        modifier: timed(10, forbidKind('duty')),
        reply: 'Pryce & Sons to report its own figures; inspectors stood down',
      },
    ],
    rebound: 'Capture: the regulated offer to regulate themselves',
  },
  {
    id: 'd.gen.missWhitlowDiary', cast: 'missWhitlow', once: true,
    headline: 'Miss Whitlow asks the proprietor to keep a diary for a week',
    body:
      'My father counted coal. I count hours. The return shows that the routine orders were handed to the Market and ' +
      'the proprietor’s day grew longer. I should like to know where the hours went. A diary kept for one week would ' +
      'tell me. Nothing will be published without leave.',
    arms: [
      {
        label: 'Decline the diary',
        outcome: 'The question stays open, as questions do.',
        price: 'Miss Whitlow’s good opinion',
        modifier: timed(5, mrate(0.97)),
      },
      {
        label: 'Keep the diary',
        outcome: 'For a week every routine order is placed by hand and its hours entered in a ledger, which is longer than expected.',
        price: '£ for a clerk, and a week without the Market',
        effects: [wellbeing(1), absorb('steam', 0.002)],
        cost: { capitalSeconds: 20 },
        modifier: timed(10, mrate(1.1), suspendOrder('market')),
        reply: 'Proprietor’s diary sent to Miss Whitlow; she asks for a second week',
      },
    ],
    rebound: 'The labour-saving machine that saves no labour: the hours freed are filled at once',
  },
];
