/**
 * M3: ambient news (Content.ambient): the small print of the paper, printed at most one every ambient tick (about
 * 80 s of play) while feature 'ambient' is on (run 2 from minute 5). Shipping notices, prices, weather, society, sport
 * and small ads, which register drily what the proprietor is doing (smoke, prices, crowding, light, traffic, queues,
 * outages). Commentary, never instruction. Each Industry keeps its own paper's conceit: the Colliery Gazette, the
 * Evening Lamp, the Motorist, Compute's system log (`info:`, `warn:`, `error:`), Code's changelog (`Added:`, `Fixed:`…).
 * Numbers: {fold} on folds and the population index, {pct} on fractions only, {value} on counts (see AmbientDef).
 * Lines that need a later system (the budget, the Commons, Steady State) wait for it in their `when`.
 * Content is data (see ../README.md); the lint is in dispatches/dispatches.test.ts.
 */
import type { AmbientDef, Cond, SectorId, StatKey } from '../../types';
import { BUDGET, COMMONS, all, owns, rk, sec, year } from '../dispatches/kit';

const g = (stat: 'population' | 'wellbeing' | 'mandate' | 'decisions' | 'commonsLevels' | 'steadySectors' | 'dispatchesAnswered',
  op: '<' | '>=', value: number): Cond => ({ stat, op, value });

export const ambient: AmbientDef[] = [
  /* ---- General: the town, the House, the small ads ---- */
  {
    id: 'amb.gen.parishSize', when: g('population', '>=', 1.5), stat: { stat: 'population' },
    text: ['Parish {fold} times the size it was; the vicar adds a gallery', 'Census clerks count {fold} heads for every one counted at the start'],
  },
  { id: 'amb.gen.briskWeek', when: g('wellbeing', '>=', 30), text: ['Shops report a brisk week; the pawnbroker reports a quiet one', 'Bakers sell out of white bread by ten; brown unsold'] },
  { id: 'amb.gen.leanWeek', when: g('wellbeing', '<', 15), text: ['Pawnbrokers busy; the soup kitchen opens an hour earlier', 'Price of bread chalked higher; the queue is longer than the board'] },
  { id: 'amb.gen.generousHouse', when: g('mandate', '>=', 300), text: ['Members in a generous mood; a backbencher proposes a statue', 'The House sits late, in good humour; nothing is decided'] },
  { id: 'amb.gen.stoker', when: year('<', 1900), text: ['Wanted: a reliable stoker, good character; apply at the engine house', 'For sale: one water wheel, little used of late; offers'] },
  { id: 'amb.gen.weather', when: year('<', 1950), text: ['Weather: dull, with smoke later; the almanac is not consulted', 'Weather: fair in the hills, grey in the town, as usual'] },
  { id: 'amb.gen.cricket', when: all(year('<', 1950), sec('pressureFraction', 'steam', '>=', 0.15)), text: ['Cricket: the county match abandoned for bad light at three o’clock', 'Cricket: play suspended at noon; the umpires cannot see the bowler'] },
  { id: 'amb.gen.assembly', when: owns('light'), text: ['Assembly rooms lit by four hundred lamps; dancing till three', 'Ball at the assembly rooms; the gas bill read aloud as a joke'] },
  {
    id: 'amb.gen.clerk', when: g('decisions', '>=', 100), stat: { stat: 'decisions' },
    text: ['The proprietor’s clerk records {value} decisions; asks for help', 'Second clerk engaged to minute the proprietor’s decisions'],
  },
  { id: 'amb.gen.freshPage', when: BUDGET, text: ['Treasury clerks rule a fresh page for the decade’s returns', 'Budget line pinned in the Exchange; members of the public stare'] },
  { id: 'amb.gen.band', when: all(COMMONS, g('commonsLevels', '>=', 2)), text: ['Band plays in the park on Sunday; the bandstand lit till dusk', 'Library reading room full on a weekday; the librarian bemused'] },
  { id: 'amb.gen.quietDesk', when: g('steadySectors', '>=', 1), text: ['Nothing to report from the steadier trades; the subeditor takes lunch'] },
  { id: 'amb.gen.terms', when: year('>=', 2000), text: ['Small ads: wanted, a person to read the terms and conditions', 'Lost: one afternoon, last seen in a notification; reward'] },
  {
    id: 'amb.gen.letters', when: g('dispatchesAnswered', '>=', 5), stat: { stat: 'dispatchesAnswered' },
    text: ['Letters page full again; the editor engages a second reader', 'The proprietor’s answers to {value} letters bound in calf'],
  },

  /* ---- Steam: the Colliery Gazette ---- */
  {
    id: 'amb.steam.coalFold', sector: 'steam', when: sec('rFold', 'steam', '>=', 2), stat: { stat: 'rFold', sector: 'steam' },
    text: ['Coal raised up {fold}-fold since the first engine; chairman delighted', 'Tonnage {fold} times the first year’s; the Gazette prints it small'],
  },
  {
    id: 'amb.steam.gauge', sector: 'steam', when: sec('pressureFraction', 'steam', '>=', 0.2), stat: { stat: 'pressureFraction', sector: 'steam' },
    text: ['Smoke gauge at the town hall reads {pct}; the inspector taps it', 'Soot on the sills measured at {pct} grains; the clubs unmoved'],
  },
  {
    id: 'amb.steam.reserve', sector: 'steam', when: sec('reserveFraction', 'steam', '<', 0.5), stat: { stat: 'reserveFraction', sector: 'steam' },
    text: ['Viewers report {pct}% of the coal still in the ground; owners calm', 'Coal left in the valley put at {pct}%; the Exchange unworried'],
  },
  { id: 'amb.steam.priceBoard', sector: 'steam', when: sec('etaFold', 'steam', '>=', 3), text: ['Price of power chalked lower at the Exchange; buyers chalk more orders', 'Engine makers’ catalogue thicker by a third this year'] },
  { id: 'amb.steam.shippingPage', sector: 'steam', when: sec('appsFounded', 'steam', '>=', 3), text: ['Colliery Gazette adds a second page of shipping notices'] },
  { id: 'amb.steam.staithes', sector: 'steam', when: owns('steam.steamships'), text: ['Shipping: forty steamers coaling at the staithes this week', 'Shipping: a collier sails on every tide; the harbour master sleeps'] },
  { id: 'amb.steam.timetable', sector: 'steam', when: owns('steam.railways'), text: ['Railway timetable revised: four more trains a day, all full', 'Excursion fares to the coast; the coast asks for fewer'] },
  { id: 'amb.steam.noonLamps', sector: 'steam', when: sec('crises', 'steam', '>=', 1), text: ['Lamps lit at noon again; the gas company records a good day'] },
  { id: 'amb.steam.newShaft', sector: 'steam', when: owns('steam.deeperShaft'), text: ['New shaft at the Low Pit; the winding gear heard two parishes off'] },
  { id: 'amb.steam.tables', sector: 'steam', when: all(rk(1), sec('rebound', 'steam', '>=', 1)), text: ['Monthly duty tables published; total tonnage left off, as usual', 'Champion engine burns a fifth less; its owner buys a second'] },
  {
    id: 'amb.steam.seams', sector: 'steam', when: sec('seamsSunk', 'steam', '>=', 2), stat: { stat: 'seamsSunk', sector: 'steam' },
    text: ['{value} seams now worked beneath the valley; the ponies unconsulted'],
  },
  { id: 'amb.steam.redChalk', sector: 'steam', when: owns('steam.duty'), text: ['Coal merchants chalk the duty on the board in red', 'Coal duty collected at the posts; carters take the long way round'] },

  /* ---- Light: the Evening Lamp ---- */
  {
    id: 'amb.light.gasFold', sector: 'light', when: sec('rFold', 'light', '>=', 2), stat: { stat: 'rFold', sector: 'light' },
    text: ['Gas sold up {fold}-fold since the first lamp; the Board takes credit', 'Therms sold {fold} times the first year’s; the holders raised again'],
  },
  {
    id: 'amb.light.brighter', sector: 'light', when: sec('etaFold', 'light', '>=', 4), stat: { stat: 'etaFold', sector: 'light' },
    text: ['Lamps {fold} times as bright for the gas; the streets brighter still'],
  },
  { id: 'amb.light.signs', sector: 'light', when: owns('light.shopSigns'), text: ['Electric sign over the arcade seen from the next town', 'Sign on the music hall now lit all night, to advertise the night'] },
  { id: 'amb.light.fogPost', sector: 'light', when: sec('pressureFraction', 'light', '>=', 0.2), text: ['Fog delays the evening post; the lamplighter finds his way by feel', 'Fog: the lamps lit, and as much use as candles in soup'] },
  { id: 'amb.light.nightShift', sector: 'light', when: owns('light.nightShifts'), text: ['Night shift at the mill goes in at ten, whistling'] },
  { id: 'amb.light.lastTram', sector: 'light', when: owns('light.trams'), text: ['Last tram now leaves at midnight; the public houses object', 'Trams run every four minutes; the horses retire to the country'] },
  { id: 'amb.light.printed', sector: 'light', when: sec('appsFounded', 'light', '>=', 3), text: ['The Evening Lamp now printed by electric light, and later'] },
  { id: 'amb.light.library', sector: 'light', when: owns('light.homes'), text: ['Circulating library extends its hours; novels borrowed after dark', 'Spectacle makers report a record year; the evenings are longer'] },
  { id: 'amb.light.thousand', sector: 'light', when: owns('light.phoebus'), text: ['Lamp fails after a thousand hours, to the minute; owner impressed'] },
  { id: 'amb.light.permits', sector: 'light', when: all(BUDGET, owns('light.cap')), text: ['Gas allowance permits change hands at the Corn Exchange'] },

  /* ---- Motion: the Motorist ---- */
  {
    id: 'amb.motion.petrolFold', sector: 'motion', when: sec('rFold', 'motion', '>=', 2), stat: { stat: 'rFold', sector: 'motion' },
    text: ['Petrol sales up {fold}-fold; forecourts add another pump', 'Barrels sold {fold} times the first year’s; tankers queue at the depot'],
  },
  { id: 'amb.motion.bankHoliday', sector: 'motion', when: owns('motion.motorways'), text: ['Bank holiday: the motorway full by nine, the coast by ten', 'Traffic report: everyone left early, together'] },
  { id: 'amb.motion.cabbages', sector: 'motion', when: owns('motion.shopping'), text: ['Car park at the ring road store full; overflow in the cabbage field'] },
  { id: 'amb.motion.haze', sector: 'motion', when: sec('pressureFraction', 'motion', '>=', 0.2), text: ['Summer haze over the ring road; the Motorist blames the weather', 'Pollen and exhaust counts high; joggers advised to drive'] },
  { id: 'amb.motion.estate', sector: 'motion', when: owns('motion.suburbs'), text: ['New estate has no shop, no pub and a two-car garage per house'] },
  { id: 'amb.motion.sameHour', sector: 'motion', when: owns('motion.commuting'), text: ['Commuters spend the hour on the road their fathers spent on the tram'] },
  { id: 'amb.motion.easyTerms', sector: 'motion', when: owns('motion.hirePurchase'), text: ['Motor show: every model on easy terms, the larger ones on easier'] },
  {
    id: 'amb.motion.oilLeft', sector: 'motion', when: sec('reserveFraction', 'motion', '<', 0.6), stat: { stat: 'reserveFraction', sector: 'motion' },
    text: ['Oil reserves at {pct}% of the first survey; forecourts unmoved'],
  },
  { id: 'amb.motion.airport', sector: 'motion', when: owns('motion.flights'), text: ['Airport car park extended again; passengers drive further to fly'] },

  /* ---- Compute: the system log ---- */
  {
    id: 'amb.compute.drawFold', sector: 'compute', when: sec('rFold', 'compute', '>=', 2), stat: { stat: 'rFold', sector: 'compute' },
    text: ['info: power draw up {fold}x since the first rack', 'info: grid draw {fold}x baseline; capacity request filed'],
  },
  { id: 'amb.compute.peak', sector: 'compute', when: owns('compute.streaming'), text: ['info: peak load at 21:00; the same film sent eleven million times'] },
  { id: 'amb.compute.storage', sector: 'compute', when: owns('compute.cloudStorage'), text: ['info: storage at 99%; procurement notified; nothing deleted'] },
  { id: 'amb.compute.chiller', sector: 'compute', when: sec('pressureFraction', 'compute', '>=', 0.2), text: ['warn: chiller fault in hall 4; ambient temperature above spec', 'warn: outside air too warm to cool with; chillers at full'] },
  { id: 'amb.compute.checkpoint', sector: 'compute', when: owns('compute.training'), text: ['info: training run resumed at checkpoint 41 of an unknown total'] },
  {
    id: 'amb.compute.perWatt', sector: 'compute', when: sec('etaFold', 'compute', '>=', 3), stat: { stat: 'etaFold', sector: 'compute' },
    text: ['info: computing per watt up {fold}x; total watts not logged'],
  },
  { id: 'amb.compute.session', sector: 'compute', when: owns('compute.adFunded'), text: ['info: average session length up again; advertisers satisfied'] },
  { id: 'amb.compute.throttle', sector: 'compute', when: sec('crises', 'compute', '>=', 1), text: ['error: heat alarm; campus throttled; users report no difference'] },

  /* ---- Code: the changelog ---- */
  { id: 'amb.code.reminders', sector: 'code', when: owns('code.personalApps'), text: ['Added: an app to remind users of their other apps'] },
  { id: 'amb.code.build', sector: 'code', when: sec('pressureFraction', 'code', '>=', 0.2), text: ['Known issue: the build takes longer than the feature took to write', 'Deprecated: the old way, the new way, and the way before that'] },
  { id: 'amb.code.kettle', sector: 'code', when: owns('code.chatbots'), text: ['Added: the kettle can now summarise the news'] },
  {
    id: 'amb.code.reviewFold', sector: 'code', when: sec('rFold', 'code', '>=', 2), stat: { stat: 'rFold', sector: 'code' },
    text: ['Changed: hours of review up {fold}-fold; reviewers unchanged'],
  },
  { id: 'amb.code.rewrite', sector: 'code', when: owns('code.rewrites'), text: ['Fixed: the rewrite reproduces every bug in the original, faithfully'] },
  { id: 'amb.code.agentTickets', sector: 'code', when: owns('code.agentsForAgents'), text: ['Added: agents now file tickets for other agents to close'] },
  { id: 'amb.code.deleted', sector: 'code', when: owns('code.deletion'), text: ['Removed: 11,000 lines; nobody noticed, which was the point'] },
  { id: 'amb.code.outageFix', sector: 'code', when: sec('crises', 'code', '>=', 1), text: ['Fixed: the outage; Known issue: the fix'] },
];

/*
 * M4 (the text lane): the small print for Iron and Fishing, and one line for The Survey. A separate export until the Act
 * lane registers both Industries (the lint resolves sectors): Content.ambient becomes [...ambient, ...ambientM4]
 * (appended, so the least-recently-printed order of the M3 lines is unchanged). Iron prints the iron market report
 * (pig iron, furnaces in blast, Wolverhampton and Ravensdale); Fishing prints harbour notes and landings.
 * The gulls follow the TRUE stock, as the scene and the sound do (design §5.3): the world tells the truth in the small
 * print, while the catch per trip, quoted beside it, does not. {pct} on fractions only: reportedStock, stockFraction,
 * foreignShare and feedFactor are fractions (the lint's FRACTION_STATS needs them; m4-registry-text.md).
 */
const m4 = (stat: StatKey, sector: SectorId, op: '<' | '<=' | '>' | '>=', value: number): Cond => ({ stat, sector, op, value });

export const ambientM4: AmbientDef[] = [
  /* ---- Iron & Steel: the iron market report ---- */
  {
    id: 'amb.iron.cokeFold', sector: 'iron', when: m4('rFold', 'iron', '>=', 2), stat: { stat: 'rFold', sector: 'iron' },
    text: ['Iron market: coke up {fold}-fold since the first year; more in blast', 'More furnaces in blast; coke up {fold}-fold, the report notes'],
  },
  { id: 'amb.iron.wolverhampton', sector: 'iron', when: { owns: 'iron.hotBlast' }, text: ['Pig iron firm at Wolverhampton; three furnaces blown in at Ravensdale', 'Iron market: buyers plentiful, coke plentiful, prices easier'] },
  { id: 'amb.iron.glare', sector: 'iron', when: m4('pressureFraction', 'iron', '>=', 0.2), text: ['Dudley complains of the glare; Ravensdale lit all night, as usual', 'Slag tip at Ravensdale now taller than the church; a footpath diverted'] },
  {
    id: 'amb.iron.feedSteam', sector: 'iron', when: m4('feedFactor', 'steam', '<=', 0.95), stat: { stat: 'feedFactor', sector: 'steam' },
    text: ['Iron market: rails bring Steam’s engines to {pct}% of their old cost', 'Engine builders’ prices at {pct}% of the old list; iron cheaper'],
  },
  { id: 'amb.iron.sharedCoal', sector: 'iron', when: m4('reserveFraction', 'steam', '<', 0.5), text: ['Coke dearer as the valley’s coal runs down; ironmasters buy on'] },
  { id: 'amb.iron.converter', sector: 'iron', when: { owns: 'iron.bessemer' }, text: ['Steel quoted lower at Sheffield; the railways relay their lines'] },

  /* ---- Fishing: harbour notes and landings ---- */
  {
    id: 'amb.fishing.catchPerTrip', sector: 'fishing', when: m4('reportedStock', 'fishing', '>=', 0.4), stat: { stat: 'reportedStock', sector: 'fishing' },
    text: ['Landings at Grimsby: catch per trip {pct}% of the old; prime firm', 'Skippers put the catch per trip at {pct}%, and call it good'],
  },
  { id: 'amb.fishing.gulls', sector: 'fishing', when: m4('stockFraction', 'fishing', '<', 0.35), text: ['Fewer gulls follow the boats out; the catch per trip unchanged', 'No porpoises in the bay this summer; the fleet reports a fair season'] },
  {
    id: 'amb.fishing.foreign', sector: 'fishing', when: m4('foreignShare', 'fishing', '>=', 0.15), stat: { stat: 'foreignShare', sector: 'fishing' },
    text: ['Foreign boats land {pct}% of the Dogger catch, the Board counts'],
  },
  { id: 'amb.fishing.glut', sector: 'fishing', when: m4('appsFounded', 'fishing', '>=', 3), text: ['Billingsgate glutted on Monday; the late cod sold to the meal works', 'Fish train runs late; the fried fish shops send to the next town'] },
  {
    id: 'amb.fishing.surveyed', sector: 'fishing', when: m4('surveyed', 'fishing', '>=', 1), stat: { stat: 'stockFraction', sector: 'fishing' },
    text: ['The Board’s survey puts the banks at {pct}% of their natural stock'],
  },
  {
    id: 'amb.fishing.scar', sector: 'fishing', when: m4('scarYears', 'fishing', '>', 0), stat: { stat: 'scarYears', sector: 'fishing' },
    text: ['Harbour notes: the Board expects the banks to need {value} years yet', 'Boats laid up at Grimsby; the Board finds no sign of the shoals'],
  },

  /* ---- The Survey ---- */
  { id: 'amb.gen.twoRates', when: { feature: 'estimates' }, text: ['Years of coal left now printed twice, at two rates; both correct'] },
];

/*
 * M5 (the text lane): the Ministry's small print, and Plenty's (the seed merchant's almanac and the drainage board's
 * notices). Separate exports until the registry folds them in: Content.ambient becomes [...ambient, ...ambientM4,
 * ...ambientM5] and, with Plenty, ...ambientM5Plenty. {pct} on fractions only: returnShare and reserveFraction are
 * fractions (the lint's FRACTION_STATS needs returnShare); Confidence is a count ({value}).
 */
const IN_OFFICE: Cond = { flag: 'office' };
const m5g = (stat: StatKey, op: '<' | '<=' | '>' | '>=', value: number): Cond => ({ stat, op, value });

export const ambientM5: AmbientDef[] = [
  { id: 'amb.chair.hoardings', when: IN_OFFICE, text: ['Hoardings at the crossroads: Pryce Consolidated wishes motorists well', 'New hoarding by the bypass: Pryce, building the future, it says'] },
  {
    id: 'amb.chair.poll', when: all(IN_OFFICE, { feature: 'chair' }, m5g('inOpposition', '<', 1)), stat: { stat: 'confidence' },
    text: ['Opinion poll: the Ministry on {value}; nobody asked the weather', 'Latest poll puts the Ministry at {value}; the Opposition is unmoved'],
  },
  { id: 'amb.chair.drinks', when: IN_OFFICE, text: ['Ministry drinks cabinet restocked; the good pen still missing', 'Lost: one good pen, Ministry pattern; the finder may keep it'] },
  { id: 'amb.chair.inspectorCar', when: all(IN_OFFICE, { feature: 'inspection' }), text: ['An Inspector’s car seen outside the refinery; the canteen goes quiet', 'Inspector’s bicycle found chained to the works gate at dawn'] },
  { id: 'amb.chair.treasury', when: all(IN_OFFICE, { feature: 'treasury' }), text: ['Treasury receipts up again; the Chancellor thanks the motor trade', 'Treasury buoyant; officials attribute it to growth, and frown'] },
  { id: 'amb.chair.opposition', when: all(IN_OFFICE, m5g('inOpposition', '>=', 1)), text: ['Opposition front bench rehearses its questions in the tea room', 'Former Minister seen on the back benches, taking notes'] },
  {
    id: 'amb.motion.vanSale', sector: 'motion', when: { loophole: 'motion.mileage.lightTrucks', status: 'used' },
    text: ['For sale: family van, seven seats, counted as a truck; offers', 'Motor show: the new van has carpets, a radio and an exemption'],
  },
  { id: 'amb.motion.courtNotice', sector: 'motion', when: all(IN_OFFICE, { feature: 'chair' }), text: ['Pryce Motors’ counsel booked for the season; the clerks rejoice'] },
];

export const ambientM5Plenty: AmbientDef[] = [
  {
    id: 'amb.plenty.waterTable', sector: 'plenty', when: m4('reserveFraction', 'plenty', '<', 0.8), stat: { stat: 'reserveFraction', sector: 'plenty' },
    text: ['Drainage board notes: the aquifer at {pct}% of its first measure', 'Fen wells deepened again; the aquifer stands at {pct}%'],
  },
  {
    id: 'amb.plenty.soakBack', sector: 'plenty', when: m4('returnShare', 'plenty', '<', 0.4), stat: { stat: 'returnShare', sector: 'plenty' },
    text: ['Water Board’s accounts: {pct}% of the water lifted soaks back', 'Ditches dry in March; only {pct}% of the pumping soaks back'],
  },
  { id: 'amb.plenty.greenTide', sector: 'plenty', when: m4('pressureFraction', 'plenty', '>=', 0.3), text: ['Weed on the drains at Fen End; the anglers write to the paper', 'River green by June; the water company blames the weather'] },
  { id: 'amb.plenty.loaf', sector: 'plenty', when: { owns: 'plenty.haberBosch' }, text: ['Loaf a halfpenny cheaper; the bakers sell no more of it'] },
  { id: 'amb.plenty.circles', sector: 'plenty', when: { owns: 'plenty.centrePivot' }, text: ['From the excursion train: green circles to the horizon', 'Almanac: the plains seen from the air are now mostly circles'] },
  { id: 'amb.plenty.show', sector: 'plenty', when: { owns: 'plenty.drip' }, text: ['County show: a drip line wins silver, and its acreage the gold', 'Seed merchant reports record orders for thirsty varieties'] },
  { id: 'amb.plenty.orchards', sector: 'plenty', when: { owns: 'plenty.orchards' }, text: ['Almond blossom on the old sheepwalk; the shepherd has retired'] },
  { id: 'amb.plenty.airFreight', sector: 'plenty', when: { owns: 'plenty.airFreight' }, text: ['Strawberries at Christmas, by air; the greengrocer stops apologising'] },
];
