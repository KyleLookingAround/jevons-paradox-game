/**
 * M4 dispatches for Fishing (eligible while Fishing is open): Skipper Ewart Tench (six), Miss Isbister of the Fishery
 * Board (five), Mrs Fenwick on the penny supper (one) and the Minister on the fishery limits (one). Harbour notes and
 * landings: the Dogger, the quay, prime and offal, a good trip, the Board's grid. Append, never reorder.
 * Content is data (see ../README.md); the rules and magnitudes are in kit.ts and dispatches.test.ts.
 *
 * WAGERS (DispatchArm.wager; design/m4-design.md §8): each is a bet on something the page shows before the player
 * answers; the comment above each says what a thinking player reads, and where. Sizes are the design's intent (a win
 * about +4–8% of the run's Hindsight per minute over the ten model years after answering, a loss about the same the
 * other way: "intent ±6%"), so the balance lane scales numbers without changing words. Every wager arm is staked.
 *
 * The stock wagers are the lesson letters, and they are FAIR: a wager never pays on the true stock unless the stock
 * is surveyed, so an unsurveyed player reads "No survey" on the stock gauge and knows the bet will lose. That is the
 * lesson stated as a rule the page shows: catch per trip is not a reason to buy a boat. (A condition on the unsurveyed
 * true stock would be a coin toss; none is written.)
 *
 * People (owner decision D4): the ports are named by place; no deaths; no joke at the ports' expense.
 * Ids this module assumes: the Industry 'fishing'; the stats 'stockFraction', 'surveyed', 'foreignShare', 'scarYears'
 * (M4 StatKeys); the crisis order of the Fishing lane's brief (crisisAt [0.5, 0.8]: the second crisis, at 1 − θ, is
 * The Banks Fail); the flag 'survey:fishing' (the Board's first survey).
 */
import type { Cond, DispatchDef, EffectDef, SectorId, StatKey } from '../../types';
import {
  BUDGET, all, any, cash, feature, income, mandate, mrate, sat, smoke, spill, timed, wellbeing,
 stake, WAGER_WIN, WAGER_LOSE } from './kit';

const F = 'fishing';

const st = (stat: StatKey, sector: SectorId, op: '<' | '<=' | '>' | '>=', value: number, label?: string): Cond =>
  (label ? { stat, sector, op, value, label } : { stat, sector, op, value });
const HAS_LINE = (s: SectorId): Cond => st('budgetHeadroom', s, '>', -1e9, 'A line drawn');
/** The Board's first survey has been made (meta flag; the reveal has been seen). */
const SURVEY_SEEN: Cond = { flag: 'survey:fishing', label: 'The Board’s first survey' };
/** The true stock is on the page: a survey is in force (the Board's, a cruise, a letter, the Institution). */
const SURVEYED: Cond = st('surveyed', F, '>=', 1, 'The stock surveyed');
/** The foreign boats have been announced (their sails on the chart; the fishery limits lever). */
const FOREIGN_SEEN: Cond = st('foreignShare', F, '>=', 0.15, 'Foreign boats on the banks');
/** The banks have failed (the second crisis, The Banks Fail) or are still scarred (the panel's scar line). */
const BANKS_FAILED: Cond = any(st('crises', F, '>=', 2, 'The Banks Fail'), st('scarYears', F, '>', 0, 'The banks scarred'));

const survey = (sector: SectorId): EffectDef => ({ type: 'survey', sector });
const foreign = (sector: SectorId, value: number): EffectDef => ({ type: 'foreignMul', sector, value });

export const fishingDispatches: DispatchDef[] = [
  /* ---- Skipper Ewart Tench ---- */
  {
    id: 'd.fish.tenchFullHolds', cast: 'tench', sector: F,
    headline: 'Skipper Tench reports full holds off the Dogger',
    body:
      'Eleven days out and home with the hold full of prime: cod, haddock and plaice, the best trip I have made in ' +
      'thirty years. The catch per trip says the shoals were never thicker, and the catch per trip has never lied to ' +
      'me. Buy the second boat, sir, and I will skipper her myself. The Board can count what it likes; I count what ' +
      'comes up in the net.',
    arms: [
      {
        label: 'Keep the one boat',
        outcome: 'Tench fishes the one boat hard, and says the second would have paid.',
        price: 'Tench’s good opinion, and the second boat’s catch',
        modifier: timed(8, income(0.95, F)),
      },
      {
        label: 'Buy the second boat',
        outcome: 'A second trawler is bought and sails for the Dogger under Skipper Tench.',
        price: '£ for the boat, and the fish she takes',
        cost: { capitalSeconds: 40 },
        /*
         * THE LESSON LETTER. READS: the stock gauge on Fishing's chart card. Unsurveyed it is blank, lettered "No
         * survey" (or "No survey since {year}"): the bet loses, whatever catch per trip says. Surveyed, it shows the
         * true stock: above half, the sea can spare a second boat.
         * Intent ±6%: win, Fishing's takings for ten years and a sum now; lose, more boats on the banks for ten years
         * (a step towards the threshold), and the town the worse for it.
         */
        wager: {
          when: all(SURVEYED, st('stockFraction', F, '>=', 0.5, 'The stock above half')),
          hint: 'Pays if the Board’s survey shows the stock above half',
          win: {
            outcome: 'The survey said there was room: the second boat fills her hold from a sea that can spare it.',
            effects: [stake(WAGER_WIN), cash(20)],
            modifier: timed(10, income(1.15, F), wellbeing(0.5)),
            reply: 'Second trawler lands a record trip; the Board’s figures agree',
          },
          lose: {
            outcome: 'No survey said there was room: the second boat finds the last shoals, and catch per trip says nothing.',
            effects: [stake(WAGER_LOSE)],
            modifier: timed(10, sat(F, 1.12), wellbeing(-0.5)),
            reply: 'Second trawler lands a record trip; the Board is not consulted',
          },
        },
      },
    ],
    rebound: 'Hyperstability: the fleet always finds the shoals that are left, so the catch per trip holds while the stock falls',
  },
  {
    id: 'd.fish.tenchClosedSeason', cast: 'tench', sector: F,
    headline: 'Skipper Tench on a closed season: the lads want none of it',
    body:
      'The Board talks of a closed season, three months ashore while the fish spawn. The lads want a closed season like ' +
      'a hole in the head. Three months ashore is three months’ rent unpaid and the boats lying idle at the quay. The ' +
      'fish have spawned without the Board’s help since Noah, and they will again.',
    arms: [
      {
        label: 'Keep the season open',
        outcome: 'The boats go out all year, and the lads are paid all year.',
        price: 'No pause for the spawning fish',
        modifier: timed(8, sat(F, 1.04)),
      },
      {
        label: 'Close it for the spawning',
        outcome: 'The fleet stays ashore three months a year, and the spawning grounds are left alone.',
        price: 'Mandate, three months’ wages, and Tench’s temper',
        cost: { mandate: 30 },
        modifier: timed(15, sat(F, 0.92), income(0.94, F), wellbeing(1)),
        reply: 'Closed season agreed; Grimsby’s fleet ashore until the spring',
      },
    ],
    rebound: 'Sufficiency at sea: a season not fished is the only catch that certainly stays in the water',
  },
  {
    id: 'd.fish.tenchForeigners', cast: 'tench', sector: F, when: FOREIGN_SEEN,
    headline: 'Skipper Tench finds foreign trawlers on his grounds',
    body:
      'A dozen foreign boats in sight at dawn, working the Dogger with our gear and selling in our markets. Every fish ' +
      'they take is one Grimsby does not. Push them off, sir, and the home fleet will have the banks to itself. We can ' +
      'fill the room ourselves; we have the boats for it, and the lads.',
    arms: [
      {
        label: 'Leave the grounds open',
        outcome: 'The foreign boats stay, and Skipper Tench writes to the newspapers.',
        price: 'Tench’s temper, and the fish they take',
        modifier: timed(8, mrate(0.97)),
      },
      {
        label: 'Push the foreigners off',
        outcome: 'Gunboats patrol the grounds and the foreign boats are warned off.',
        price: 'Mandate for the patrols',
        cost: { mandate: 40 },
        /*
         * READS: the foreign share, printed under Fishing's chart (beside regrowth), and the foreign sails on the chart.
         * Where foreign boats are a quarter of the catch or more, sending them home takes real weight off the banks;
         * where they are few, the home fleet fills the room (the fishery limits' own rebound).
         * Intent ±6%: win, foreign share × 0.8 and wellbeing and takings for ten years; lose, the home fleet grows for
         * ten years and Mandate comes slower.
         */
        wager: {
          when: st('foreignShare', F, '>=', 0.25, 'Foreign boats a quarter of the catch'),
          hint: 'Pays if foreign boats take a quarter or more of the catch',
          win: {
            outcome: 'They were many: their going takes real weight off the banks, more than the home fleet adds.',
            effects: [stake(WAGER_WIN)],
            modifier: timed(10, foreign(F, 0.8), wellbeing(1), income(1.06, F)),
            reply: 'Foreign trawlers warned off the Dogger; the banks breathe',
          },
          lose: {
            outcome: 'They were few: the home fleet fills the room they leave, and more besides.',
            effects: [stake(WAGER_LOSE)],
            modifier: timed(10, sat(F, 1.1), mrate(0.95)),
            reply: 'Foreign boats warned off; Grimsby orders three more trawlers',
          },
        },
      },
    ],
    rebound: 'The nationalised commons: exclude the foreign fleet and the home fleet grows into the room',
  },
  {
    id: 'd.fish.tenchDisputes', cast: 'tench', sector: F, when: SURVEY_SEEN,
    headline: 'Skipper Tench disputes the Board’s survey',
    body:
      'The Board’s vessel trawled a grid, the way no skipper ever fished, and found the sea empty between the shoals. ' +
      'Of course it did. We go where the fish are; that is what a skipper is for. My catch per trip is as good as ever ' +
      'it was. I ask the proprietor to say plainly which figure Grimsby is to be ruled by.',
    arms: [
      {
        label: 'Decline to choose',
        outcome: 'Both figures are printed, and the fleet goes on fishing to its own.',
        price: 'The fleet fishes to its own figure',
        modifier: timed(8, sat(F, 1.03)),
      },
      {
        label: 'Rule by the survey',
        outcome: 'The fleet is told to fish to the Board’s figure, and Tench says so in the Grimsby papers.',
        price: 'Mandate, and the skippers’ goodwill',
        cost: { mandate: 30 },
        modifier: timed(15, sat(F, 0.9), income(0.95, F), wellbeing(1)),
        reply: 'Fleet to fish to the survey; skippers call it fishing on paper',
      },
      {
        label: 'Rule by the catch per trip',
        outcome: 'The fleet fishes to its own figure, which stays healthy, as it always has.',
        price: 'The stock, as the Board measures it',
        effects: [cash(25)],
        modifier: timed(10, sat(F, 1.08), income(1.05, F)),
        reply: 'Proprietor backs the skippers; catch per trip “excellent”',
      },
    ],
    rebound: 'Two gauges: the fleet’s instrument measures the fleet, and the Board’s measures the sea',
  },
  {
    id: 'd.fish.tenchSteamFleet', cast: 'tench', sector: F, when: all(BUDGET, HAS_LINE('steam')),
    headline: 'Skipper Tench would put the whole fleet under steam',
    body:
      'Half the Grimsby fleet still goes out under sail. Put every smack under steam and we would fish in a calm, come ' +
      'home against the wind and land the catch fresh for the morning train. The coal is the only cost, and the ' +
      'proprietor sells coal. I call that a fair bargain on both sides of the quay.',
    arms: [
      {
        label: 'Let the smacks keep sail',
        outcome: 'The smacks keep their sails, and miss the morning train in a calm.',
        price: 'A slower fleet, and Tench’s patience',
        modifier: timed(8, income(0.95, F)),
      },
      {
        label: 'Steam for the whole fleet',
        outcome: 'Every smack in the fleet is fitted with an engine and bunkered with the proprietor’s coal.',
        price: '£ for the engines, and the coal they burn',
        cost: { capitalSeconds: 35 },
        /*
         * READS: Steam's budget gauge (Fishing draws Steam's power: the trawlers burn Steam's coal, drawsOn). A tenth of
         * headroom in Steam carries the fleet's bunkers; less, and the bunkers push Steam over its line.
         * Intent ±6%: win, Fishing's takings and wellbeing for ten years; lose, smoke in Steam now and demand up in both
         * for ten years.
         */
        wager: {
          when: st('budgetHeadroom', 'steam', '>=', 0.1, 'Steam a tenth inside its line'),
          hint: 'Pays if Steam is a tenth or more inside its line',
          win: {
            outcome: 'Steam had room: the trawlers’ coal fits within its allowance, and the fish catch the morning train.',
            effects: [stake(WAGER_WIN)],
            modifier: timed(10, income(1.12, F), wellbeing(1)),
            reply: 'Grimsby fleet under steam; the fish train leaves on time',
          },
          lose: {
            outcome: 'Steam had none: the trawlers’ bunkers push Steam over its line, and the fleet fishes harder for it.',
            effects: [stake(WAGER_LOSE), smoke('steam', 0.05)],
            modifier: timed(10, sat('steam', 1.06), sat(F, 1.06)),
            reply: 'Grimsby fleet under steam; the colliery takes the credit',
          },
        },
      },
    ],
    rebound: 'The full account: the fleet’s efficiency is burnt in Steam’s furnaces',
  },
  {
    id: 'd.fish.tenchLaidUp', cast: 'tench', sector: F, when: BANKS_FAILED,
    headline: 'Grimsby’s fleet laid up; Skipper Tench asks to keep the boats',
    body:
      'The fleet has been tied up since the banks failed, and the owners talk of selling the boats for scrap. Once a ' +
      'trawler goes she does not come back, and nor do the men who knew how to work her. Pay something to keep the ' +
      'fleet in being, sir, laid up and painted, and when the fish come back we shall be ready for them.',
    arms: [
      {
        label: 'Let the owners sell',
        outcome: 'The boats are sold for scrap, and the crews go inland to the towns.',
        price: 'The fleet, and Grimsby with it',
        modifier: timed(10, wellbeing(-0.5)),
      },
      {
        label: 'Keep the fleet in being',
        outcome: 'The boats are laid up, painted and paid for, and the crews stay in Grimsby.',
        price: '£ every quarter, for boats that do not fish',
        cost: { capitalSeconds: 30 },
        modifier: timed(15, wellbeing(1), income(0.95)),
        reply: 'Grimsby fleet kept in being; boats painted, crews kept on',
      },
    ],
    rebound: 'Hysteresis: the fleet outlasts the fish, and is ready to fish them out again when they return',
  },

  /* ---- Miss Isbister, naturalist to the Fishery Board ---- */
  {
    id: 'd.fish.isbisterVessel', cast: 'isbister', sector: F,
    headline: 'Miss Isbister asks for a survey vessel for the summer',
    body:
      'The Board has two naturalists, one microscope and no vessel. With a steam trawler for the summer, fishing a fixed ' +
      'grid at fixed hours, I could tell the proprietor what is in the sea, as distinct from what is in the market. The ' +
      'cost is modest. The figures will be exact. They may not be welcome.',
    arms: [
      {
        label: 'Not this summer',
        outcome: 'The Board makes do with the market returns, which are excellent.',
        price: 'Another season fished by the market’s figures',
        modifier: timed(8, sat(F, 1.03)),
      },
      {
        label: 'Hire the vessel',
        outcome: 'A survey vessel is hired, and the Board counts the banks for the next ten years.',
        price: '£ for the vessel and her crew',
        cost: { capitalSeconds: 45 },
        modifier: { years: 10, effects: [survey(F)], label: 'Miss Isbister’s survey' },
        reply: 'Board hires a survey vessel; Miss Isbister to sail with her',
      },
    ],
    rebound: 'The instrument costs money and the fleet’s is free: so the free one is read',
  },
  {
    id: 'd.fish.isbisterYoungFish', cast: 'isbister', sector: F,
    headline: 'Miss Isbister finds the young fish missing from the samples',
    body:
      'The samples this spring hold plenty of large fish and very few small ones. The large fish are the survivors of ' +
      'good years. The small ones are next year’s catch, and they are not there. A cut in the catch now would let what ' +
      'young fish there are grow up. It will help if the banks have not already failed. If they have, nothing done ' +
      'this year will.',
    arms: [
      {
        label: 'Await the next samples',
        outcome: 'The Board waits a year for more samples, and the fleet does not.',
        price: 'A year of the young fish caught',
        modifier: timed(8, sat(F, 1.03)),
      },
      {
        label: 'Cut the catch for a season',
        outcome: 'The catch is cut by order for a season, and the young fish are left in the water.',
        price: 'Mandate for the order, and a season’s catch',
        cost: { mandate: 40 },
        /*
         * READS: whether the banks have failed: The Banks Fail (Fishing's second crisis, printed and marked on the
         * pressure gauge) this run, or the scar line in Fishing's panel ("The banks have not recovered…"). Before the
         * threshold a cut lets the stock regrow; past it, with regrowth collapsed or scarred, nothing done this decade
         * shows.
         * Intent ±6%: win, less catch and fewer foreign boats for ten years (the stock regrows), wellbeing, most of the
         * stake back; lose, Fishing's takings and Mandate's pace down for ten years.
         */
        wager: {
          when: { not: BANKS_FAILED, label: 'The banks not failed' },
          hint: 'Pays unless the banks have failed and not yet recovered',
          win: {
            outcome: 'The banks had not failed: the young fish grow, and the Board’s count rises within the decade.',
            effects: [stake(WAGER_WIN), mandate(30)],
            modifier: timed(10, sat(F, 0.9), foreign(F, 0.9), wellbeing(1)),
            reply: 'Young fish spared; the Board’s count rises',
          },
          lose: {
            outcome: 'The banks had failed: there were too few young fish to spare, and the paper says so.',
            effects: [stake(WAGER_LOSE)],
            modifier: timed(10, income(0.9, F), mrate(0.95)),
            reply: 'Catch cut for a season; the young fish were never there',
          },
        },
      },
    ],
    rebound: 'Hysteresis: past the threshold the capacity to recover is what has been spent',
  },
  {
    id: 'd.fish.isbisterPaper', cast: 'isbister', sector: F,
    headline: 'Miss Isbister’s paper to the Board: a table, and no adjectives',
    body:
      'I enclose the paper I am to read to the Board on Thursday. It is a table: the landings of every port for twenty ' +
      'years, divided by the number and power of the boats that landed them. The landings have risen. The landings per ' +
      'boat have fallen by half. The skippers’ association has asked that it not be read. I leave that to the ' +
      'proprietor.',
    arms: [
      {
        label: 'Let the Board decide',
        outcome: 'The Board hears the paper in private and minutes it as received.',
        price: 'The table goes unread',
        modifier: timed(8, sat(F, 1.03)),
      },
      {
        label: 'Have it printed',
        outcome: 'The paper is printed in full, table and all, and read in every port.',
        price: 'Mandate, and the skippers’ association',
        cost: { mandate: 25 },
        modifier: timed(10, sat(F, 0.94), wellbeing(1)),
        reply: 'Board’s naturalist: more boats, and fewer fish for each',
      },
      {
        label: 'Ask her to soften it',
        outcome: 'The paper is read with its table in an appendix and its conclusion in the passive.',
        price: 'Miss Isbister’s confidence, and the table',
        effects: [mandate(20)],
        modifier: timed(10, sat(F, 1.04)),
      },
    ],
    rebound: 'Efficiency against a falling stock: each boat catches more, and every boat catches less',
  },
  {
    id: 'd.fish.isbisterBays', cast: 'isbister', sector: F,
    headline: 'Miss Isbister asks for the bays closed to trawling',
    body:
      'The bays are the nurseries. Close them to trawling and the young fish grow up undisturbed. It will work if our ' +
      'own boats are most of what fishes there. If foreign boats take a large share of the catch, they will fish the ' +
      'bays we close, and the young fish will be no better off for our restraint.',
    arms: [
      {
        label: 'Keep the bays open',
        outcome: 'The bays stay open, and the trawlers work them in bad weather.',
        price: 'The nurseries trawled',
        modifier: timed(8, sat(F, 1.03)),
      },
      {
        label: 'Close the bays',
        outcome: 'The bays are closed to the home fleet by order of the Board.',
        price: 'Mandate, and the inshore men’s catch',
        cost: { mandate: 35 },
        /*
         * READS: the foreign share under Fishing's chart (the same figure Tench's letter bets the other way). Home
         * restraint holds where the home fleet is most of the catch; where foreign boats are a quarter or more, they
         * fish what the home fleet leaves.
         * Intent ±6%: win, less home catch for ten years (the nurseries rest), wellbeing, most of the stake back; lose,
         * the foreign share up and Fishing's takings down for ten years.
         */
        wager: {
          when: st('foreignShare', F, '<', 0.25, 'Foreign boats under a quarter of the catch'),
          hint: 'Pays if foreign boats take less than a quarter of the catch',
          win: {
            outcome: 'The foreign boats were few: the bays rest, and the young fish come out of them in numbers.',
            effects: [stake(WAGER_WIN), mandate(25)],
            modifier: timed(10, sat(F, 0.9), wellbeing(1)),
            reply: 'Bays closed to trawling; the nurseries fill',
          },
          lose: {
            outcome: 'The foreign boats were many: they fish the bays the home fleet left, and nothing is spared.',
            effects: [stake(WAGER_LOSE)],
            modifier: timed(10, foreign(F, 1.15), income(0.92, F)),
            reply: 'Bays closed to Grimsby; foreign trawlers work them instead',
          },
        },
      },
    ],
    rebound: 'Restraint on a shared stock: what one fleet leaves, another takes',
  },
  {
    id: 'd.fish.isbisterGulls', cast: 'isbister', sector: F,
    when: all(SURVEYED, st('stockFraction', F, '>=', 0.4, 'The stock above two fifths')),
    headline: 'Miss Isbister reports the gulls back over the banks',
    body:
      'For the first time in some seasons the survey vessel was followed out by gulls, and the samples held young fish ' +
      'of three ages. The banks are recovering. They are not recovered. The Board recommends that the catch be held at ' +
      'what the survey says the banks can bear, and not at what the market says it would like.',
    arms: [
      {
        label: 'Note the report',
        outcome: 'The report is noted, and the fleet goes out to make the most of a good season.',
        price: 'A good season fished hard',
        modifier: timed(8, sat(F, 1.04)),
      },
      {
        label: 'Hold the catch to the survey',
        outcome: 'The catch is held at the survey’s figure, and the banks go on recovering.',
        price: 'Mandate, and the fleet’s good season',
        cost: { mandate: 30 },
        modifier: timed(15, sat(F, 0.9), wellbeing(1)),
        reply: 'Board holds the catch to the survey; the gulls stay',
      },
    ],
    rebound: 'A recovering stock is the cheapest to fish, so it is fished first',
  },

  /* ---- Mrs Fenwick on the penny supper ---- */
  {
    id: 'd.fish.fenwickSupper', cast: 'fenwick', sector: F, when: feature('clearSkies'),
    headline: 'Mrs Fenwick on the penny supper and the poor of the ports',
    body:
      'Fried fish and a pennyworth of chips have done more for the poor of this town than the Society’s soup in twenty ' +
      'years: a family can sup for fourpence. What is saved on the supper goes, I find, on coal for the grate and gas ' +
      'for the evening; the members see the lamps lit later in every street. We should like to help the shops in the ' +
      'poorest wards. The Society meets on Tuesday.',
    arms: [
      {
        label: 'Leave it to the shops',
        outcome: 'The shops fry on without help, and the poorest wards go without.',
        price: 'The poorest wards’ suppers',
        modifier: timed(8, wellbeing(-0.5)),
      },
      {
        label: 'Subsidise the suppers',
        outcome: 'The shops in the poorest wards are paid a farthing a portion, and fry until midnight.',
        price: '£ for the farthings, and the gas they leave money for',
        cost: { capitalSeconds: 30 },
        /*
         * READS: Light's clear-skies mark. Fishing's savings spill into Light (a cheap supper leaves money for the gas);
         * if Light's sky is clear there is room for the extra gas, if not it thickens the fog.
         * Intent ±6%: win, wellbeing and Mandate's pace for ten years and Mandate now; lose, fog in Light now and the
         * spill and Light's demand up for ten years.
         */
        wager: {
          when: st('clear', 'light', '>=', 1, 'Light’s sky clear'),
          hint: 'Pays if the sky over Light is clear when the suppers are paid',
          win: {
            outcome: 'Light had room: the money saved goes on gas the sky can carry, and the wards eat well.',
            effects: [stake(WAGER_WIN), mandate(25)],
            modifier: timed(10, wellbeing(1), mrate(1.08)),
            reply: 'Penny suppers in the poorest wards; the Society thanks the proprietor',
          },
          lose: {
            outcome: 'Light had none: the money saved goes on gas, and the fog thickens over the warm wards.',
            effects: [stake(WAGER_LOSE), smoke('light', 0.05)],
            modifier: timed(10, spill(F, 1.5), sat('light', 1.04)),
            reply: 'Penny suppers in the poorest wards; the lamps burn later',
          },
        },
      },
    ],
    rebound: 'Re-spending: the money a cheap supper saves is spent, and some of it on gas',
  },

  /* ---- The Minister on the fishery limits ---- */
  {
    id: 'd.fish.ministerLimits', cast: 'minister', sector: F, when: FOREIGN_SEEN,
    headline: 'The Minister would widen the fishery limits, for a consideration',
    body:
      'The Minister presents his compliments. Representations have been received from the ports about foreign vessels, ' +
      'and the Minister is listening. A wider limit could be proclaimed this session, if the proprietor would see the ' +
      'Ministry through the estimates. The Minister is advised that the home fleet may take up the room, unless the ' +
      'catch is set by survey.',
    arms: [
      {
        label: 'Leave the limits alone',
        outcome: 'The limits stay where they are, and the foreign boats with them.',
        price: 'The foreign boats stay on the banks',
        modifier: timed(8, mrate(0.97)),
      },
      {
        label: 'See the Ministry through',
        outcome: 'A wider limit is proclaimed, and the foreign boats are seen off the banks.',
        price: 'Mandate for the estimates',
        cost: { mandate: 50 },
        /*
         * READS: the stock gauge (surveyed or "No survey"). The fishery limits rebound unless the catch is set by the
         * survey: with a survey in force the room the foreign boats leave can be held empty; without one the home fleet
         * fills it. (The quota from the survey is only shown while surveyed, so "surveyed" is the readable half of the
         * lever's own `unless`.)
         * Intent ±6%: both branches cut the foreign share for ten years; win adds wellbeing, lose adds the home fleet's
         * growth.
         */
        wager: {
          when: SURVEYED,
          hint: 'Pays if the stock is surveyed when the limits are widened',
          win: {
            outcome: 'The banks were surveyed: the catch is set by the Board, and the room the foreigners leave stays empty.',
            effects: [stake(WAGER_WIN)],
            modifier: timed(10, foreign(F, 0.8), wellbeing(1)),
            reply: 'Fishery limits widened; the Board sets the catch',
          },
          lose: {
            outcome: 'Nobody was counting: the home fleet takes up the room, and more, within the decade.',
            effects: [stake(WAGER_LOSE)],
            modifier: timed(10, foreign(F, 0.8), sat(F, 1.12)),
            reply: 'Fishery limits widened; Grimsby fills the room',
          },
        },
      },
    ],
    rebound: 'The nationalised commons: a wider limit moves the overfishing home unless the catch is counted',
  },
];
