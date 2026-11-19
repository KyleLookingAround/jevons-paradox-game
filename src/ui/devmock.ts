// Development stand-in for the real model + content (M3 contract, save version 4). Used with #mock, when the real content is not in
// the M1 shape, and by the mock-only entry (src/ui/mock-main.ts). Crude, but it follows the contract's formulas
// closely enough that every UI element moves plausibly. It deliberately exercises what the UI must not assume:
// six industries in three ages, two industries that can open next at once, an unknown theme and an unknown accent,
// fork pairs, a locked upgrade, levers that tighten past their authored levels, recycling, Know-how trees with
// branch forks, multi-level and two-seat Institutions, budgets and decades; and for M2 paces, decade dividends, lean
// decades, the sink line, Settlement, the Commons, standing orders, Charters, respec, run history, events and the
// offline report (with a hold).
import type {
  Content, ModelApi, GameState, SectorId, SectorDef, SectorState, Derived, SectorDerived, UpgradeView, LeverView,
  MetaState, HeadlineKey, NewsItem, Cond, CondCheck, HindsightTerms, KnowhowView, InstitutionView, LeverLevelDef,
  LeverDef, EffectDef, ApplicationDef, AppState, PaceDef, CommonsDef, CommonsView, EventKind, GameEvent, Actor, OrderId, OrdersState,
  OfflineReport, RunSummary, UpgradeDef, LeverRecycle, FeatureId,
  DispatchDef, HistoryView, ArchiveView, RetroItem, SurveyView, PendingDispatchView, ModifierView, MarketWhy, PlayReturn, FiledReturn,
} from '../types';
// M3: the mock borrows the real content's words (the cast, a few letters, the Histories, the Archive, the Proprietor's
// Day and the ending), so its screenshots read as the game will. Only the mock entry bundles them.
import { cast as realCast } from '../content/cast';
import { dispatches as realDispatches } from '../content/dispatches';
import { histories as realHistories } from '../content/histories';
import { archive as realArchive } from '../content/archive';
import { proprietor as realProprietor } from '../content/proprietor';
import { ending as realEnding } from '../content/ending';
import { features as realFeatures } from '../content/features';
import {
  START_YEAR, YEARS_PER_SECOND, STEADY_STATE_YEARS, BUDGET_TOLERANCE, MAX_TICK_SECONDS, CALENDAR_LATE_RATE, EVENTS_MAX, PENDING_DIVIDENDS_MAX,
  OPENING_MAX, RUN_HISTORY_MAX, FEATURE_IDS,
} from '../types';

const app = (id: string, name: string, icon: string, halfPrice: number, saturation: number, steepness: number, visibleBelow: number, foundCost: number, blurb: string): ApplicationDef =>
  ({ id, name, icon, halfPrice, saturation, steepness, visibleBelow, foundCost, blurb });

const base = {
  basePrice: 1, capCost: 0.04, margin: 0.2, baseEta: 1, autoEtaRate: 0, resourceKind: 'stock' as const, reserve: 400000, alpha: 0.6,
  pressureSource: 'resource' as const, pressureIntensity: 0.02, absorption: 0.002, collapseAt: 3000, crisisAt: [0.35, 0.65, 0.85],
  pressureWellbeingCost: 20, pressureUpkeep: 0, wellbeingWeight: 10, wellbeingScale: 10,
};

const steam: SectorDef = {
  ...base, id: 'steam', name: 'Steam', years: '1780–1870', firstYear: 1780, accent: 'iron',
  tagline: 'Coal, iron, and a great deal of water to be got out of holes.',
  service: { name: 'Motive power', unit: 'hp' }, resource: { name: 'Coal', unit: 'tons', unitSingular: 'ton' }, pressure: { name: 'Smoke', crisisName: 'The Black Fog' },
  settle: { dividend: [{ type: 'mandateAdd', value: 200 }, { type: 'wellbeingAdd', value: 2 }], upkeepPerSpill: 4, blurb: 'The engine houses keep their fires banked; the valley keeps its sky.' },
  seams: [
    { id: 'steam.seam.fiveQuarter', name: 'Five-Quarter seam', depth: '178 fathoms', blurb: 'The first seam below the old workings.', tons: 120_000, cost: 2_000, priceMul: 1.1, reachBelow: 9 },
    { id: 'steam.seam.main', name: 'Main coal', depth: '204 fathoms', blurb: 'Another 26 fathoms of shaft, every one kept dry.', tons: 180_000, cost: 5_000, priceMul: 1.2, reachBelow: 9 },
    { id: 'steam.seam.lowMain', name: 'Low Main seam', depth: '226 fathoms', blurb: 'Deep enough that the pumps never stop.', tons: 260_000, cost: 12_000, priceMul: 1.35, reachBelow: 0.05 },
    { id: 'steam.seam.hutton', name: 'Hutton seam', depth: '246 fathoms', blurb: 'Where only the best pumping engine keeps the water out.', tons: 380_000, cost: 30_000, priceMul: 1.55, reachBelow: 0.02 },
    { id: 'steam.seam.busty', name: 'Busty seam', blurb: 'Below what most owners will pay to reach.', tons: 550_000, cost: 70_000, priceMul: 1.8, reachBelow: 0.01 },
  ],
  mechanic: { name: 'The seams', rebound: 'Supply-side', blurb: 'Cheap pumping reaches deeper coal. Each seam sunk postpones the end, and enlarges the burn.' },
  applications: [
    { ...app('steam.pump', 'Mine pumping', 'pump', 1.5, 40, 1.5, Infinity, 0, 'Keep the pit dry; reach the deeper seams.'), reserveGainPerService: 0.05 },
    app('steam.mills', 'Cotton mills', 'mill', 0.6, 300, 2, 0.8, 150, 'Spindles by the thousand.'),
    app('steam.rail', 'Railways', 'train', 0.3, 1200, 2.2, 0.5, 4000, 'Distance, abolished at a penny a mile.'),
    app('steam.ships', 'Steamships', 'ship', 0.15, 3000, 2.4, 0.3, 40000, 'The Atlantic, on a timetable.'),
    app('steam.weird', 'Unknown icon test', 'zeppelin', 0.05, 100, 2, 0.1, 1e6, 'Fallback pictogram.'),
  ],
};
// Iron opens beside Light (both after Steam): proves the UI handles several next industries, an unknown theme key
// (falls back to the default look) and an unknown accent key (no accent).
const iron: SectorDef = {
  ...base, id: 'iron', name: 'Iron & Steel', years: '1790–1900', firstYear: 1790, theme: 'foundry', accent: 'forge',
  tagline: 'Puddled, rolled and riveted into everything.',
  service: { name: 'Wrought iron', unit: 't' }, resource: { name: 'Coke', unit: 'tons', unitSingular: 'ton' }, pressure: { name: 'Slag', crisisName: 'The Slag Heaps' },
  basePrice: 1.5, capCost: 0.08, reserve: 300000,
  unlock: { minReckonings: 1, after: ['steam'], when: { all: [
    { owns: 'steam.condenser', label: 'Own the Separate condenser' },
    { stat: 'serviceDelivered', sector: 'steam', op: '>=', value: 4000, label: '4,000 hp·years of motive power delivered' },
  ] } },
  applications: [
    app('iron.rails', 'Rails', 'train', 1.5, 60, 1.6, Infinity, 0, 'Iron roads for iron horses.'),
    app('iron.bridges', 'Bridges', 'factory-night', 0.8, 400, 2, 1.2, 3000, 'Span the gorge; charge a toll.'),
  ],
};
const light: SectorDef = {
  ...base, id: 'light', name: 'Light', years: '1870–1950', firstYear: 1870, theme: 'gaslight', accent: 'gas', tagline: 'Night, abolished.',
  service: { name: 'Lumens', unit: 'klm' }, resource: { name: 'Town gas', unit: 'therms', unitSingular: 'therm' },
  settle: { dividend: [{ type: 'wellbeingAdd', value: 3 }], upkeepPerSpill: 3, blurb: 'The lamps are lit at dusk and put out at eleven, by long custom.' }, pressure: { name: 'Soot', crisisName: 'The Black Fog' },
  basePrice: 2, capCost: 0.1, reserve: 900000, spill: { to: 'steam', rate: 0.4 },
  load: {
    profiles: {
      evening: [0.2, 0.15, 0.1, 0.1, 0.1, 0.2, 0.5, 0.8, 0.7, 0.5, 0.4, 0.4, 0.4, 0.4, 0.4, 0.5, 0.8, 1.4, 2, 2.2, 2, 1.6, 1, 0.5],
      night: [1.2, 1.2, 1.2, 1.2, 1.2, 1.1, 0.9, 0.6, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.2],
      flat: Array.from({ length: 24 }, () => 1),
    },
    defaultProfile: 'evening', fixedShare: 0.6,
  },
  mechanic: { name: 'The load curve', rebound: 'Utilisation', blurb: 'The works are built for the evening and idle by day. The cheapest unit to sell is the next one.' },
  unlock: { minReckonings: 0, after: ['steam'], when: { all: [
    { owns: 'steam.double', label: 'Own the Double-acting engine' },
    { stat: 'appsFounded', sector: 'steam', op: '>=', value: 3, label: 'Three uses of motive power founded' },
  ] } },
  applications: [
    app('light.street', 'Street lamps', 'lamp', 3, 50, 1.6, Infinity, 0, 'The parish lights the lane.'),
    { ...app('light.night', 'Night shifts', 'factory-night', 1.2, 400, 2, 1.8, 2000, 'The mill never sleeps now.'), profile: 'night' },
    app('light.homes', 'Homes', 'house', 0.6, 1500, 2.2, 1, 20000, 'A mantle in every parlour.'),
    app('light.signs', 'Shop signs', 'sign', 0.3, 3000, 2.4, 0.5, 2e5, 'OPEN, spelled in fire.'),
  ],
};
const motion: SectorDef = {
  ...base, id: 'motion', name: 'Motion', years: '1950–2000', firstYear: 1950, accent: 'chrome',
  tagline: 'Everywhere is twenty minutes away, give or take the traffic.',
  service: { name: 'Vehicle-miles', unit: 'vmi' }, steady: { paces: [{ id: 'gentle', name: 'Gentle', declinePerDecade: 0.04, dividendMul: 1, blurb: 'The ring road can wait.' }, { id: 'firm', name: 'Firm', declinePerDecade: 0.08, dividendMul: 1.5, blurb: 'One car per household.' }] }, resource: { name: 'Oil', unit: 'bbl' }, pressure: { name: 'Carbon', crisisName: 'The Long Summer' },
  basePrice: 3, capCost: 0.2, reserve: 2e6, spill: { to: 'light', rate: 0.3 },
  travel: { roads: 900, exponent: 4, hoursScale: 0.004, apps: ['motion.car', 'motion.suburb'] },
  mechanic: { name: 'The travel-time budget', rebound: 'Induced demand and lock-in', blurb: 'Faster roads buy distance, not time: the hour a day stays, and the miles grow. Sprawl outlasts the traffic.' },
  unlock: { minReckonings: 2, after: ['light'], when: { all: [{ stat: 'serviceDelivered', sector: 'light', op: '>=', value: 20000, label: '20,000 klm·years of light delivered' }] } },
  applications: [
    app('motion.van', 'Delivery', 'van', 4, 60, 1.6, Infinity, 0, 'The shop comes to you.'),
    app('motion.car', 'Commuting', 'car', 2, 500, 2, 2.5, 5e4, 'Live here, work there.'),
    { ...app('motion.suburb', 'Suburbs', 'suburb', 1, 2000, 2.2, 1.2, 4e5, 'A lawn each.'), lockIn: 0.8 },
    app('motion.plane', 'Flights', 'plane', 0.5, 4000, 2.4, 0.6, 3e6, 'Lunch in Lisbon.'),
  ],
};
const compute: SectorDef = {
  ...base, id: 'compute', name: 'Compute', years: '2000–2025', firstYear: 2000, accent: 'phosphor',
  tagline: 'Twice as thrifty every eighteen months. Ten times as busy.',
  service: { name: 'Operations', unit: 'Gop' }, resource: { name: 'Electricity', unit: 'MWh' }, pressure: { name: 'Carbon', crisisName: 'The Heat Dome' },
  basePrice: 5, capCost: 0.3, reserve: 5e6, autoEtaRate: 0.01,
  mechanic: { name: 'Free at the point of use', rebound: 'The frontier at its limit', blurb: 'A price shown as nothing cannot be lowered. The free uses fill to saturation, whatever the chips do.' },
  unlock: { minReckonings: 3, after: ['motion'], when: { all: [{ stat: 'serviceDelivered', sector: 'motion', op: '>=', value: 1e5, label: '100k vmi·years driven' }] } },
  applications: [
    app('compute.sheet', 'Spreadsheets', 'sheet', 6, 80, 1.6, Infinity, 0, 'What if the numbers moved themselves?'),
    { ...app('compute.web', 'The web', 'globe', 3, 800, 2, 3, 1e5, 'Everything, linked to everything.'), priceSeen: { share: 0 } },
    { ...app('compute.play', 'Streaming', 'play', 1, 3000, 2.2, 1.5, 1e6, 'Autoplay in 5, 4, 3…'), priceSeen: { share: 0, flat: 0.4 } },
    app('compute.brain', 'Model training', 'brain', 0.4, 9000, 2.4, 0.8, 1e7, 'Read everything; once more, with feeling.'),
  ],
};
const code: SectorDef = {
  ...base, id: 'code', name: 'Code', years: '2025–', firstYear: 2025, theme: 'agentic', accent: 'diff',
  tagline: 'Software is now cheaper to write than to read.',
  service: { name: 'Features', unit: 'features', unitSingular: 'feature' }, resource: { name: 'Human attention', unit: 'hrs' }, pressure: { name: 'Code stock', crisisName: 'The Great Outage' },
  basePrice: 4, capCost: 0.2, reserve: 3e6, resourceKind: 'flow', pressureSource: 'service', absorption: 0, drawsOn: { sector: 'compute', perService: 2 },
  pressureUpkeep: 0.0004,
  mechanic: { name: 'The code stock', rebound: 'Maintenance', blurb: 'Everything shipped must be kept. Upkeep eats the attention that writes the next feature; only deletion shrinks it.' },
  unlock: { minReckonings: 4, after: ['compute'], when: { all: [{ owns: 'compute.node', label: 'Own a Die shrink' }] } },
  applications: [
    app('code.tools', 'Internal tools', 'wrench', 5, 60, 1.6, Infinity, 0, 'A dashboard for the dashboard.'),
    app('code.apps', 'Throwaway apps', 'phone-app', 2, 600, 2, 2.5, 1e5, 'Built Tuesday, forgotten Thursday.'),
    app('code.legacy', 'Legacy rewrites', 'scroll', 1, 2000, 2.2, 1.2, 1e6, 'Now in a language nobody here knows either.'),
    app('code.agents', 'Agents for agents', 'robots', 0.3, 20000, 2.6, 0.6, 1e7, 'Nobody asked. Everybody uses it.'),
  ],
};

const E = (sector: SectorId, value: number): EffectDef[] => [{ type: 'etaMul', sector, value }];
const L = (mandateCost: number, mandateUpkeep: number, value: number, label: string, value2?: number): LeverLevelDef =>
  ({ mandateCost, mandateUpkeep, value, label, ...(value2 != null ? { value2 } : {}) });

export const mockContent: Content = {
  sectors: { steam, iron, light, motion, compute, code },
  sectorOrder: ['steam', 'iron', 'light', 'motion', 'compute', 'code'],
  ages: [
    { id: 'coal', name: 'The Coal Age', tagline: 'Everything runs on what is under Lancashire.', yearSpan: [1780, 1914], theme: 'ledger', sectors: ['steam', 'iron', 'light'] },
    { id: 'acceleration', name: 'The Great Acceleration', tagline: 'Everything, everywhere, at once and by road.', yearSpan: [1909, 2010], theme: 'chrome', sectors: ['motion'] },
    { id: 'attention', name: 'The Attention Age', tagline: 'The scarce thing is now you.', yearSpan: [2000, 2100], theme: 'terminal', sectors: ['compute', 'code'] },
  ],
  upgrades: [
    { id: 'steam.boilers', sector: 'steam', name: 'Better boilers', blurb: 'Rivets, mostly.', kind: 'efficiency', cost: 30, stage: 1, effects: E('steam', 1.5) },
    { id: 'steam.condenser', sector: 'steam', name: 'Separate condenser', blurb: 'Watt, 1769. Stop cooling the cylinder.', kind: 'efficiency', cost: 400, stage: 2, requires: ['steam.boilers'], effects: E('steam', 1.667) },
    { id: 'steam.bw', sector: 'steam', name: 'Boulton & Watt’s premium', blurb: 'A third of the coal saved, paid to Birmingham for ever.', kind: 'efficiency', cost: 900, requires: ['steam.boilers'], excludes: ['steam.pirate'],
      effects: [...E('steam', 1.6), { type: 'marginAdd', sector: 'steam', value: -0.03 }] },
    { id: 'steam.pirate', sector: 'steam', name: 'Pirate engines', blurb: 'Bull and Hornblower, cheaper and not quite legal.', kind: 'capital', cost: 700, requires: ['steam.boilers'], excludes: ['steam.bw'],
      effects: [{ type: 'capCostMul', sector: 'steam', value: 0.7 }, ...E('steam', 1.15)] },
    { id: 'steam.double', sector: 'steam', name: 'Double-acting engine', blurb: 'Push on the way back, too.', kind: 'efficiency', cost: 3000, requires: ['steam.condenser'], effects: E('steam', 1.4) },
    { id: 'steam.parl', sector: 'steam', name: 'Parliamentary trains', blurb: 'A penny a mile, by Act of 1844.', kind: 'capital', cost: 5000, requires: ['steam.double'], excludes: ['steam.first'],
      effects: [{ type: 'satMul', sector: 'steam', app: 'steam.rail', value: 1.5 }, { type: 'marginAdd', sector: 'steam', value: -0.02 }] },
    { id: 'steam.first', sector: 'steam', name: 'First-class lines', blurb: 'Plush seats, fewer of them.', kind: 'capital', cost: 5000, requires: ['steam.double'], excludes: ['steam.parl'],
      effects: [{ type: 'marginAdd', sector: 'steam', value: 0.04 }, { type: 'satMul', sector: 'steam', app: 'steam.rail', value: 0.8 }] },
    { id: 'steam.hp', sector: 'steam', name: 'High-pressure steam', blurb: 'Trevithick. Stand well back.', kind: 'efficiency', cost: 20000, stage: 3, requires: ['steam.double'], effects: E('steam', 1.4286) },
    { id: 'steam.turbine', sector: 'steam', name: 'Parsons turbine', blurb: 'Spin, don’t push.', kind: 'efficiency', cost: 60000, locked: true, effects: E('steam', 2) },
    { id: 'steam.coalQuestion', sector: 'steam', name: 'The Coal Question', blurb: 'W. S. Jevons, 1865. An inquiry concerning the progress of the nation.', kind: 'research', cost: 600, requires: ['steam.condenser'], effects: [{ type: 'reveal' }] },
    { id: 'steam.proprietorsDay', sector: 'steam', name: 'The Proprietor’s Day', blurb: 'Miss Whitlow’s question, put to the Statistics Office: what has become of the proprietor’s working day since the Market.', kind: 'research', cost: 800,
      when: { all: [{ returned: 'household', figure: 'sessionsBefore', op: '>=', value: 3 }, { not: { flag: 'proprietor' } }] }, effects: [{ type: 'metaFlag', flag: 'proprietor' }] },
    { id: 'steam.foundry', sector: 'steam', name: 'Ironworks', blurb: 'Cheaper engines, cheaper power.', kind: 'capital', cost: 250, effects: [{ type: 'capCostMul', sector: 'steam', value: 0.7 }] },
    { id: 'steam.shaft', sector: 'steam', name: 'Sink a deeper shaft', blurb: 'There is always more, further down.', kind: 'prospect', cost: 200, repeatable: true, costGrowth: 2.2, maxLevel: 6, effects: [{ type: 'reserveAdd', sector: 'steam', value: 0.25 }] },
    { id: 'iron.puddling', sector: 'iron', name: 'Puddling furnace', blurb: 'Cort, 1784. Stir until it behaves.', kind: 'efficiency', cost: 2000, effects: E('iron', 1.5) },
    { id: 'iron.hotblast', sector: 'iron', name: 'Hot blast', blurb: 'Neilson, 1828. Warm the air first.', kind: 'efficiency', cost: 8000, requires: ['iron.puddling'], effects: E('iron', 1.6) },
    { id: 'light.mantle', sector: 'light', name: 'Gas mantle', blurb: 'Welsbach, 1885.', kind: 'efficiency', cost: 5000, effects: E('light', 3) },
    { id: 'light.tungsten', sector: 'light', name: 'Tungsten filament', blurb: 'Brighter, longer, cheaper. Leave it on.', kind: 'efficiency', cost: 40000, requires: ['light.mantle'], effects: E('light', 2) },
    { id: 'motion.injection', sector: 'motion', name: 'Fuel injection', blurb: 'Every drop, metered.', kind: 'efficiency', cost: 6000, effects: E('motion', 1.4) },
    { id: 'motion.ring', sector: 'motion', name: 'Ring roads', blurb: 'Bypass the bypass.', kind: 'capital', cost: 9000, effects: [{ type: 'capCostMul', sector: 'motion', value: 0.8 }] },
    { id: 'compute.node', sector: 'compute', name: 'Die shrink', blurb: 'Half the joules per operation. Again.', kind: 'efficiency', cost: 8000, repeatable: true, costGrowth: 3, maxLevel: 8, effects: E('compute', 2) },
    { id: 'compute.dc', sector: 'compute', name: 'Hyperscale halls', blurb: 'A warehouse of warm air.', kind: 'capital', cost: 12000, effects: [{ type: 'marginAdd', sector: 'compute', value: 0.05 }] },
    { id: 'code.agent', sector: 'code', name: 'Coding agent', blurb: 'It writes the tests too. Mostly.', kind: 'efficiency', cost: 9000, effects: E('code', 3) },
    { id: 'code.fleet', sector: 'code', name: 'Agent fleets', blurb: 'Forty of them, none of them sleeps.', kind: 'efficiency', cost: 90000, requires: ['code.agent'], effects: E('code', 4) },
  ],
  levers: [
    { id: 'steam.duty', sector: 'steam', kind: 'duty', name: 'Coal duty', blurb: 'A penny on the ton, rising.', catch: 'Your customers notice, and so does your income. Owners may dig deeper to beat it.', recycle: ['treasury', 'dividend', 'commons'],
      sideEffects: { effects: [{ type: 'resourcePriceMul', sector: 'steam', value: 0.9 }], rampYears: 8, blurb: 'Owners rush the coal out before the next rise.', unless: { owns: 'kh.wash' }, unlessLabel: 'unless coal washing is learnt' },
      levels: [L(60, 0.1, 0.3, 'Hold price at 30% of the fall'), L(180, 0.2, 0.6, 'Hold price at 60% of the fall'), L(540, 0.4, 0.9, 'Hold price at 90% of the fall')],
      repeat: { valueStep: 0.03, costGrowth: 1.6, upkeepGrowth: 1.3, label: 'Hold price at {pct}% of the fall' } },
    { id: 'steam.cap', sector: 'steam', kind: 'cap', name: 'Smoke abatement cap', blurb: 'So much and no more.', catch: 'Permits are dear, and smoke finds the gaps.', recycle: ['treasury', 'dividend'],
      levels: [L(100, 0.2, 1, 'Cap at the budget line'), L(300, 0.3, 0.9, 'Cap at 90% of the line'), L(900, 0.5, 0.8, 'Cap at 80% of the line')],
      repeat: { valueStep: -0.05, costGrowth: 1.5, upkeepGrowth: 1.25, label: 'Cap at {pct}% of the line' } },
    { id: 'iron.circ', sector: 'iron', kind: 'circularity', name: 'Scrap drives', blurb: 'Old railings into new rails.', catch: 'Scrap is dirtier than ore, and slower.',
      levels: [L(80, 0.1, 0.2, 'A fifth from scrap'), L(240, 0.2, 0.4, 'Two fifths from scrap')] },
    { id: 'light.sufficiency', sector: 'light', kind: 'sufficiency', name: 'Lights out by eleven', blurb: 'A civic habit.', catch: 'Fewer lamps lit, fewer shillings in the meter.',
      levels: [L(80, 0.1, 0.8, 'Aim for 80% of today', 0.01), L(240, 0.2, 0.6, 'Aim for 60% of today', 0.01)] },
    { id: 'motion.standard', sector: 'motion', kind: 'measure', name: 'Fuel-economy standard', blurb: 'So many miles to the gallon, by law.', catch: 'Cheaper miles are driven. Heavier cars may fill the gap.',
      effects: [{ type: 'etaMul', sector: 'motion', value: 1.2 }], levels: [L(80, 0.1, 1, 'Ten per cent better'), L(240, 0.2, 2, 'Twenty per cent better')],
      sideEffects: { effects: [{ type: 'satMul', sector: 'motion', app: 'motion.car', value: 1.15 }], rampYears: 6, blurb: 'Heavier cars fill the forecourt.', unless: { owns: 'motion.duty' }, unlessLabel: 'unless a fuel duty is in force' } },
    { id: 'motion.duty', sector: 'motion', kind: 'duty', name: 'Fuel duty escalator', blurb: 'Pence on the litre, rising.', catch: 'Hauliers blockade the refineries.', recycle: ['treasury'],
      levels: [L(60, 0.1, 0.3, 'Hold price at 30% of the fall'), L(180, 0.2, 0.6, 'Hold price at 60% of the fall')] },
    { id: 'compute.cap', sector: 'compute', kind: 'cap', name: 'Grid connection cap', blurb: 'Queue for the substation.', catch: 'The halls move abroad.',
      levels: [L(100, 0.2, 1, 'Cap at the budget line'), L(300, 0.3, 0.85, 'Cap at 85% of the line')] },
    { id: 'code.deletion', sector: 'code', kind: 'deletion', name: 'Deletion', blurb: 'The best code is the code you remove.', catch: 'Every hour spent deleting is an hour not shipping.',
      levels: [L(50, 0.1, 0.1, 'A tenth of attention on deletion', 1), L(150, 0.2, 0.25, 'A quarter on deletion', 1)] },
  ],
  knowhow: [
    { id: 'kh.cornish', tree: 'steam', tier: 1, branch: 'school', name: 'Cornish school', blurb: 'Squeeze the coal. Wring the steam.', cost: 6, costGrowth: 1.8, maxLevel: 3,
      effects: [...E('steam', 1.15), { type: 'satMul', sector: 'steam', value: 1.08 }] },
    { id: 'kh.manchester', tree: 'steam', tier: 1, branch: 'school', name: 'Manchester school', blurb: 'Cheaper engines, and more of them.', cost: 6, costGrowth: 1.8, maxLevel: 3,
      effects: [{ type: 'capCostMul', sector: 'steam', value: 0.85 }, { type: 'halfPriceMul', sector: 'steam', value: 1.1 }] },
    { id: 'kh.apprentice', tree: 'steam', tier: 2, name: 'Apprenticeships', blurb: 'Better engines from minute one. Funny how the coal goes quicker.', cost: 10, costGrowth: 1.6, maxLevel: 5,
      effects: [...E('steam', 1.1), { type: 'satMul', sector: 'steam', value: 1.05 }] },
    { id: 'kh.parsons', tree: 'steam', tier: 2, name: 'Parsons’ notebooks', blurb: 'The turbine, a century early.', cost: 40, costGrowth: 1, maxLevel: 1, effects: [{ type: 'unlock', id: 'steam.turbine' }] },
    { id: 'kh.deep', tree: 'steam', tier: 3, branch: 'seam', name: 'Deep-seam survey', blurb: 'More down there than anyone admitted.', cost: 30, costGrowth: 2, maxLevel: 2, effects: [{ type: 'reserveAdd', sector: 'steam', value: 0.2 }] },
    { id: 'kh.wash', tree: 'steam', tier: 3, branch: 'seam', name: 'Coal washing', blurb: 'Less smoke per ton, same tons.', cost: 30, costGrowth: 2, maxLevel: 2, effects: [{ type: 'absorptionAdd', sector: 'steam', value: 0.001 }] },
    { id: 'kh.seed', name: 'Seed capital', blurb: 'Start richer. Arrive at the wall sooner.', cost: 8, costGrowth: 2, maxLevel: 5, effects: [{ type: 'startCapitalMul', value: 2 }] },
    { id: 'kh.chairs', name: 'More chairs', blurb: 'Room at the table for another institution.', cost: 50, costGrowth: 3, maxLevel: 2, effects: [{ type: 'slotAdd', value: 1 }] },
    { id: 'kh.census', tier: 2, name: 'The census', blurb: 'Counting people makes them plan.', cost: 20, costGrowth: 2, maxLevel: 3, effects: [{ type: 'popGrowthMul', value: 0.9 }] },
  ],
  institutions: [
    { id: 'in.stats', name: 'Statistics Office', blurb: 'Someone, at last, is counting. Reveals the rebound from minute one.', cost: 25, effects: [{ type: 'reveal' }] },
    { id: 'in.duty', name: 'Standing fuel duty', blurb: 'The escalator, already escalating.', cost: 60, requires: ['in.stats'], effects: [{ type: 'startLever', lever: 'steam.duty', level: 1 }],
      nextLevels: [{ cost: 90, effects: [{ type: 'startLever', lever: 'steam.duty', level: 2 }], label: 'Starts at the second step' }, { cost: 160, effects: [{ type: 'startLever', lever: 'steam.duty', level: 3 }], label: 'Starts at the third step' }] },
    { id: 'in.cap', name: 'Alkali Inspectorate', blurb: 'A cap from the first day, enforced by men in bowler hats.', cost: 120, slots: 2, requires: ['in.stats'], effects: [{ type: 'startLever', lever: 'steam.cap', level: 1 }] },
    { id: 'in.museum', name: 'Mechanics’ Institutes', blurb: 'Reading rooms. Wellbeing without coal.', cost: 40, effects: [{ type: 'wellbeingAdd', value: 3 }] },
    { id: 'in.board', name: 'Board of Trade', blurb: 'Parliament listens a little sooner.', cost: 35, effects: [{ type: 'mandateRateMul', value: 1.3 }] },
    { id: 'in.civil', name: 'The Civil Service', blurb: 'Permanent secretaries who move the levers you name.', cost: 80, effects: [{ type: 'orderUnlock', order: 'civilService' }] },
    { id: 'in.treasury', name: 'Treasury rules', blurb: 'A standing order to build what the Commons fund allows.', cost: 140, effects: [{ type: 'orderUnlock', order: 'treasury' }] },
  ],
  achievements: [
    { id: 'firstReckoning', name: 'First Reckoning', blurb: 'Close the books once.' },
    { id: 'backfire', name: 'Backfire', blurb: 'Rebound past 100%.' },
    { id: 'jevonsWasRight', name: 'Jevons Was Right', blurb: 'Max an efficiency tree while use grows many-fold.' },
    { id: 'degrowthByAccident', name: 'Degrowth by accident', blurb: 'Decoupled, technically.', hidden: true },
    { id: 'steadyState', name: 'Steady State', blurb: 'Fifty years of a decent life within budget.' },
  ],
  headlines: {
    appFounded: ['{app} founded; investors delighted'], appAvailable: ['Cheap {service} brings {app} within reach'], sectorOpened: ['{sector}: a new industry, {year}'],
    crisis: ['{sector}: crisis number {n}; Parliament stirs'], collapse: ['The air gives out'], exhausted: ['Last seam worked out'],
    backfire: ['Engines thriftier than ever; collieries report record sales'], reveal: ['Professor asks why coal use rises as engines improve'],
    leverEnacted: ['Act passed'], leverLapsed: ['Act lapses for want of support'], steadySector: ['{sector} holds steady'], steadyAll: ['Steady state'],
    reckoning: ['The books are closed'], efficiency: ['Engines thriftier than ever; collieries report record sales', 'New engine burns half the coal, says inventor'],
    ageBegins: ['{age} begins: the calendar turns'], budgetDrawn: ['A line is drawn under {resource}'], decade: ['Decade {n} within the line'],
    budgetBroken: ['The line is broken'], clearSkies: ['{sector}: clear skies over the valley'], settled: ['{sector} settles'], unsettled: ['{sector} unsettled'],
    commonsBuilt: ['{name} opens to the public'], charter: ['{name} granted for the run'],
  } as Record<HeadlineKey, string[]>,
  dividends: [
    { id: 'dv.rates', name: 'A rates rebate', blurb: 'Money back to the parish. Modest, certain.', effects: [{ type: 'capitalAdd', value: 60 }] },
    { id: 'dv.reading', name: 'Reading rooms', blurb: 'Wellbeing that burns nothing, until someone lights the lamps.', effects: [{ type: 'wellbeingAdd', value: 1.5 }] },
    { id: 'dv.mandate', name: 'A vote of confidence', blurb: 'Parliament remembers the decade.', effects: [{ type: 'mandateAdd', value: 120 }] },
    { id: 'dv.seams', name: 'The next seam', blurb: 'A survey finds more coal. More is what it finds.', effects: [{ type: 'reserveAdd', sector: 'steam', value: 0.1 }] },
  ],
  commons: [
    { id: 'cm.baths', name: 'Public baths', blurb: 'Hot water for the town; the boilers want coal.', icon: 'baths', sector: 'steam', cost: 900, costGrowth: 1.8, maxLevel: 3, mandateCost: 20,
      wellbeing: { max: 6, perLevel: 2 }, intensity: { sector: 'steam', perLevel: 0.4 } },
    { id: 'cm.park', name: 'A people’s park', blurb: 'Grass, a bandstand, Sunday crowds. Excursion trains fill up.', icon: 'park', sector: 'steam', cost: 2500, maxLevel: 1,
      wellbeing: { max: 4, perLevel: 3 }, effects: [{ type: 'satMul', sector: 'steam', app: 'steam.rail', value: 1.1 }] },
    { id: 'cm.library', name: 'Free library', blurb: 'Books for anyone; gaslight to read them by.', icon: 'library', sector: 'light', cost: 4000, costGrowth: 2, maxLevel: 2, mandateCost: 40,
      wellbeing: { max: 5, perLevel: 2.5 }, intensity: { sector: 'light', perLevel: 0.3 } },
    { id: 'cm.holiday', name: 'Bank holidays', blurb: 'Four days a year off. The trains to Blackpool are full.', icon: 'holiday', cost: 6000, maxLevel: 1, mandateCost: 80,
      wellbeing: { max: 3, perLevel: 3 }, effects: [{ type: 'satMul', sector: 'steam', app: 'steam.rail', value: 1.15 }] },
  ],
  charters: [
    { id: 'ch.coalfield', name: 'The Northern Coalfield', blurb: 'Deep seams from the first day. Cheap coal is spent like cheap coal.', sector: 'steam', effects: [{ type: 'reserveAdd', sector: 'steam', value: 0.3 }] },
    { id: 'ch.mills', name: 'The Mill Charter', blurb: 'Cotton mills founded from the first minute; so is their appetite.', sector: 'steam', effects: [{ type: 'startFounded', app: 'steam.mills' }] },
    { id: 'ch.board', name: 'A Board of Health', blurb: 'An Institution you do not own, on loan for one run.', effects: [{ type: 'institutionLoan', id: 'in.museum', level: 1 }] },
  ],
  knowhowTrees: { steam: { name: 'The engine shop' }, general: { name: 'General' } },
  /* M3: the real words (see the imports): a few letters with two and three answers, the cast, Histories, the Archive. */
  cast: realCast,
  dispatches: ['d.gen.firstLetter', 'd.steam.tallChimney', 'd.gen.whitlowChair', 'd.gen.advertisements'].map((id) => realDispatches.find((d) => d.id === id)).filter((d): d is DispatchDef => !!d),
  histories: realHistories,
  archive: realArchive,
  proprietor: realProprietor,
  ending: realEnding,
  features: Object.fromEntries((['archive', 'ambient', 'dispatches', 'seams', 'load', 'travel', 'sideEffects', 'freeAtUse', 'survey', 'histories', 'bank'] as FeatureId[])
    .map((id) => [id, { when: { all: [] }, intro: realFeatures[id]?.intro, name: realFeatures[id]?.name }])),
  recycleText: {
    treasury: { name: 'To the Treasury', blurb: '10% becomes Mandate; the rest is general taxation.' },
    dividend: { name: 'As a dividend', blurb: 'Paid back per head: wellbeing up, so more people, and more demand.' },
    commons: { name: 'To the Commons', blurb: 'A fund only Commons projects can spend. They have rebounds of their own.' },
  },
  global: {
    startCapital: 10, clickSeconds: 1, clickFlat: 2, popGrowth: 0.0004, subsistence: 8, wellbeingTarget: 28, mandateRate: 0.03, mandateFloor: 12,
    crisisMandate: 150, crisisPopLoss: 0.08,
    hindsight: { perWellbeingYear: 0.02, intensityExponent: 0.5, perBudgetDecade: 6, perUnburnt: 30, perFirstBackfire: 10, perSectorReached: 10, perSteadySector: 150 },
    demography: { transitionWellbeing: 40 },
    steady: { budgetDeclinePerDecade: 0.05, decadeYears: 10, decadeEffects: [{ type: 'mandateAdd', value: 50 }], firstSteadyEffects: [{ type: 'slotAdd', value: 1 }],
      paces: [
        { id: 'gentle', name: 'Gentle', declinePerDecade: 0.05, dividendMul: 1, blurb: 'The dividend as it stands.' },
        { id: 'firm', name: 'Firm', declinePerDecade: 0.1, dividendMul: 1.6, blurb: 'Harder to hold; it pays better.' },
        { id: 'severe', name: 'Severe', declinePerDecade: 0.2, dividendMul: 2.5, blurb: 'A cut that bites from the first year.' },
      ],
      decadeChoices: [['dv.rates', 'dv.reading'], ['dv.mandate', 'dv.seams']] },
    levy: { mandateShare: 0.1 },
    startingSlots: 2,
    offline: { capSeconds: 28800, holdBefore: 'crisis' },
    orders: { marketFromReckoning: 1, marketPaybackMax: 120, paybackChoices: [30, 120, 600], intervalYears: 1 },
    commons: { fromReckoning: 2, fundShare: 1 },
    respecRefund: 1,
  },
};


/* ---------------- crude sim ---------------- */
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x, (_k, v) => (v === Infinity ? 1e308 : v)));
const order = (c: Content): SectorId[] => c.sectorOrder.filter((id) => !!c.sectors[id]);
const decadeYears = (c: Content) => c.global.steady?.decadeYears ?? 10;
const newApp = (available: boolean, founded: boolean): AppState => ({ available, founded, satMul: 1, peakD: 0, peakAdoption: 0 });
const INTERVAL_YEARS = 1;

function paces(c: Content, id: SectorId): PaceDef[] {
  const def = c.sectors[id];
  return def?.steady?.paces ?? c.global.steady?.paces
    ?? [{ id: 'gentle', name: 'Gentle', declinePerDecade: def?.steady?.declinePerDecade ?? c.global.steady?.budgetDeclinePerDecade ?? 0.05, dividendMul: 1 }];
}
function paceOf(c: Content, id: SectorId, pace: string | undefined): PaceDef {
  const list = paces(c, id);
  return list.find((p) => p.id === pace) ?? list[0];
}

/** Standing effects in force: upgrades × level, know-how × level, seated (and loaned) institutions, dividends, Commons, Charter, settlements. */
function effects(s: GameState, c: Content): EffectDef[] {
  const out: EffectDef[] = [];
  for (const u of c.upgrades) { const n = s.upgrades[u.id] || 0; for (let i = 0; i < n; i++) out.push(...u.effects); }
  for (const k of c.knowhow) { const n = s.meta.knowhow[k.id] || 0; for (let i = 0; i < n; i++) out.push(...k.effects); }
  const inst = (id: string, n: number) => {
    const d = c.institutions.find((x) => x.id === id);
    if (!d) return;
    if (n >= 1) out.push(...d.effects);
    for (let i = 0; i < n - 1; i++) out.push(...(d.nextLevels?.[i]?.effects ?? []));
  };
  for (const id of s.meta.loadout || []) inst(id, s.meta.institutions[id] || 0);
  const ch = s.meta.charter ? (c.charters || []).find((x) => x.id === s.meta.charter) : undefined;
  if (ch) {
    out.push(...ch.effects);
    for (const e of ch.effects) if (e.type === 'institutionLoan' && !(s.meta.loadout || []).includes(e.id)) inst(e.id, e.level);
  }
  for (const id of order(c)) {
    for (const dv of s.sectors[id]?.dividends || []) out.push(...((c.dividends || []).find((x) => x.id === dv)?.effects ?? []));
    if (s.sectors[id]?.settled) out.push(...(c.sectors[id].settle?.dividend ?? []));
  }
  for (const p of c.commons || []) { const n = s.commons?.levels?.[p.id] || 0; for (let i = 0; i < n; i++) out.push(...(p.effects ?? [])); }
  return out;
}
function unlocked(s: GameState, c: Content, id: string): boolean { return effects(s, c).some((e) => e.type === 'unlock' && e.id === id); }
function mul(s: GameState, c: Content, type: string, sector?: SectorId, appId?: string): number {
  let m = 1;
  for (const e of effects(s, c)) {
    if (e.type !== type) continue;
    const ee = e as { sector?: string; app?: string; value: number };
    if (sector && ee.sector && ee.sector !== sector) continue;
    if (appId && ee.app && ee.app !== appId) continue;
    if (!appId && ee.app) continue;
    m *= ee.value;
  }
  return m;
}
function add(s: GameState, c: Content, type: string, sector?: SectorId): number {
  let a = 0;
  for (const e of effects(s, c)) if (e.type === type && (!sector || (e as { sector?: string }).sector === sector)) a += (e as { value: number }).value;
  return a;
}
function orderUnlocked(s: GameState, c: Content, o: OrderId): boolean { return effects(s, c).some((e) => e.type === 'orderUnlock' && e.order === o); }
function leverLevel(def: LeverDef, level: number): LeverLevelDef | null {
  if (level <= 0) return null;
  const n = def.levels.length;
  if (level <= n) return def.levels[level - 1];
  const r = def.repeat; if (!r) return null;
  const k = level - n, last = def.levels[n - 1];
  const value = +(last.value + k * r.valueStep).toFixed(4);
  return {
    value, value2: last.value2, mandateCost: last.mandateCost * Math.pow(r.costGrowth, k), mandateUpkeep: last.mandateUpkeep * Math.pow(r.upkeepGrowth, k),
    label: r.label ? r.label.replace('{pct}', String(Math.round(value * 100))).replace('{n}', String(level)) : `${last.label} +${k}`,
  };
}
function leverMax(def: LeverDef): number {
  const n = def.levels.length; const r = def.repeat; if (!r) return n;
  let k = 0;
  while (k < (r.maxSteps ?? 40)) {
    const v = def.levels[n - 1].value + (k + 1) * r.valueStep;
    if (def.kind === 'cap' ? v < 0.05 : v < 0 || v > (def.kind === 'duty' ? 0.999 : 0.95)) break;
    k++;
  }
  return n + k;
}
function activeLever(s: GameState, c: Content, sector: SectorId, kind: string): { def: LeverDef; lv: LeverLevelDef; ref: number } | null {
  let best: { def: LeverDef; lv: LeverLevelDef; ref: number } | null = null;
  for (const l of c.levers) {
    if (l.sector !== sector || l.kind !== kind) continue;
    const st = s.levers[l.id]; const lv = st ? leverLevel(l, st.level) : null;
    if (!lv) continue;
    if (!best || (kind === 'cap' ? lv.value < best.lv.value : lv.value > best.lv.value)) best = { def: l, lv, ref: st.ref };
  }
  return best;
}
function budgetR(s: GameState, c: Content, id: SectorId): number | null {
  const b = s.sectors[id].budget; if (!b) return null;
  const d = paceOf(c, id, b.pace).declinePerDecade;
  const t = Math.min(s.time, b.heldAt ?? Infinity);
  return b.r0 * Math.pow(1 - d, ((t - b.since) * YEARS_PER_SECOND) / 10);
}
function etaOf(s: GameState, c: Content, id: SectorId): number {
  const def = c.sectors[id];
  return def.baseEta * mul(s, c, 'etaMul', id) * Math.exp(def.autoEtaRate * s.sectors[id].openFor);
}
function commonsWb(c: Content, p: CommonsDef, L: number, yieldMul: number): number {
  return L > 0 ? p.wellbeing.max * (1 - Math.exp(-L * p.wellbeing.perLevel / p.wellbeing.max)) * yieldMul : 0;
}
/** Price-proof demand the Commons add to a sector (L × perLevel × N). */
function commonsExtra(s: GameState, c: Content, id: SectorId): number {
  let x = 0;
  for (const p of c.commons || []) if (p.intensity?.sector === id) x += (s.commons?.levels?.[p.id] || 0) * p.intensity.perLevel * s.population;
  return x;
}

interface Calc {
  eta: number; prBase: number; permit: number; cap: number; margin: number; sigma: number; pre: number; permitPart: number; dutyPart: number;
  ps: number; D: number; R: number; apps: Record<string, { d: number; ad: number }>; income: number; levy: number;
}
function calc(s: GameState, c: Content, id: SectorId, etaOverride?: number): Calc {
  const def = c.sectors[id], es = s.sectors[id];
  const st0 = es.settled;
  if (st0 && etaOverride == null) {
    const apps: Calc['apps'] = {};
    for (const a of def.applications) apps[a.id] = { d: st0.appD[a.id] ?? 0, ad: st0.appAdoption[a.id] ?? 0 };
    return { eta: st0.eta, prBase: 0, permit: 0, cap: 0, margin: 0, sigma: 0, pre: st0.pPre, permitPart: 0, dutyPart: 0, ps: st0.ps, D: st0.D, R: st0.R, apps, income: st0.income, levy: 0 };
  }
  const eta = etaOverride ?? etaOf(s, c, id);
  const prBase = def.resourceKind === 'flow' ? def.basePrice * 1.2 : def.basePrice * seamMul(s, c, id) * Math.pow(es.reserveMax / Math.max(1, es.reserve), def.alpha);
  const cap = def.capCost * mul(s, c, 'capCostMul', id);
  const margin = Math.max(0, def.margin + add(s, c, 'marginAdd', id));
  const sub = activeLever(s, c, id, 'substitution'); const sigma = sub ? sub.lv.value : 0;
  const duty = activeLever(s, c, id, 'duty');
  const capL = activeLever(s, c, id, 'cap');
  const bR = budgetR(s, c, id);
  const extra = commonsExtra(s, c, id);
  const solve = (permit: number) => {
    const pre = (1 - sigma) * (prBase / eta + cap) + sigma * 1.5 * cap;
    const permitPart = (1 - sigma) * permit / eta;
    const p = pre + permitPart;
    const dutyPart = duty && duty.ref > 0 ? duty.lv.value * Math.max(0, duty.ref - p) : 0;
    const ps = p + dutyPart;
    const apps: Record<string, { d: number; ad: number }> = {};
    let D = extra;
    for (const a of def.applications) {
      const st = es.apps[a.id];
      const sat = s.population * a.saturation * (st?.satMul ?? 1) * mul(s, c, 'satMul', id, a.id) * mul(s, c, 'satMul', id);
      const hp = a.halfPrice * mul(s, c, 'halfPriceMul', id);
      let d = st?.founded ? sat / (1 + Math.pow(ps / hp, a.steepness)) : 0;
      if (st?.founded && a.lockIn) d = Math.max(d, a.lockIn * st.peakD);
      apps[a.id] = { d, ad: sat > 0 ? d / sat : 0 };
      D += d;
    }
    const R = D * (1 - sigma) / eta;
    return { pre, permitPart, dutyPart, ps, D, R, apps };
  };
  let permit = 0;
  let r = solve(0);
  if (capL && bR != null && r.R > capL.lv.value * bR) {
    const target = capL.lv.value * bR;
    let lo = 0, hi = prBase * 50;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (solve(m).R > target) lo = m; else hi = m; }
    permit = hi; r = solve(permit);
  }
  const income = margin * r.pre * r.D;
  return { eta, prBase, permit, cap, margin, sigma, ...r, income, levy: r.dutyPart * r.D + permit * r.R };
}
function wellbeing(s: GameState, c: Content): number {
  let w = 0;
  for (const id of order(c)) {
    if (!s.sectors[id].open) continue;
    const def = c.sectors[id], k = calc(s, c, id);
    w += def.wellbeingWeight * Math.log(1 + k.D / (s.population * def.wellbeingScale));
    w -= def.pressureWellbeingCost * Math.min(1, s.sectors[id].pressure / def.collapseAt);
  }
  return Math.max(0, w + add(s, c, 'wellbeingAdd') + commonsWellbeing(s, c));
}
function commonsWellbeing(s: GameState, c: Content): number {
  const ym = mul(s, c, 'commonsYieldMul');
  return (c.commons || []).reduce((a, p) => a + commonsWb(c, p, s.commons?.levels?.[p.id] || 0, ym), 0);
}
function popGrowth(s: GameState, c: Content, w: number): number {
  const g = c.global, m = mul(s, c, 'popGrowthMul');
  const x = w - g.subsistence;
  if (x < 0) return g.popGrowth * m * x * 0.25 * s.population;
  const wt = g.demography?.transitionWellbeing;
  const shape = wt && wt > g.subsistence ? Math.max(0, 1 - Math.pow(x / (wt - g.subsistence), 2)) : 1;
  return g.popGrowth * m * x * shape * s.population;
}
function yearOf(s: GameState, c: Content, back = 0): number {
  let y = -Infinity;
  for (const age of c.ages) {
    const open = age.sectors.filter((id) => s.sectors[id]?.open && s.sectors[id].openFor - back >= 0);
    if (!open.length) continue;
    const T = Math.max(...open.map((id) => s.sectors[id].openFor - back));
    let ay = age.yearSpan[0] + T * YEARS_PER_SECOND;
    for (const id of open) ay = Math.max(ay, (c.sectors[id].firstYear ?? age.yearSpan[0]) + (s.sectors[id].openFor - back) * YEARS_PER_SECOND);
    if (ay > age.yearSpan[1]) ay = age.yearSpan[1] + (ay - age.yearSpan[1]) * CALENDAR_LATE_RATE;
    y = Math.max(y, ay);
  }
  return Number.isFinite(y) ? y : START_YEAR + (s.time - back) * YEARS_PER_SECOND;
}
function ageOf(s: GameState, c: Content): string | null {
  let a: string | null = null;
  for (const age of c.ages) if (age.sectors.some((id) => s.sectors[id]?.open)) a = age.id;
  return a;
}
function emit(s: GameState, c: Content, kind: EventKind, f: Partial<GameEvent> = {}): void {
  s.meta.eventSeq = (s.meta.eventSeq || 0) + 1;
  s.events = [...(s.events || []), { seq: s.meta.eventSeq, kind, time: s.time, year: Math.floor(yearOf(s, c)), ...f }].slice(-EVENTS_MAX);
}
function news(s: GameState, c: Content, key: HeadlineKey, vars: Record<string, string> = {}, sector?: SectorId) {
  const list = c.sectorHeadlines?.[sector ?? '']?.[key] ?? c.headlines[key] ?? ['News'];
  let text = list[Math.floor(s.time * 7 + s.news.length) % list.length];
  const all: Record<string, string> = { year: String(Math.floor(yearOf(s, c))), sector: sector ? c.sectors[sector]?.name ?? '' : '', resource: sector ? c.sectors[sector]?.resource.name.toLowerCase() ?? '' : '', n: '', name: '', ...vars };
  for (const k in all) text = text.split('{' + k + '}').join(all[k]);
  const item: NewsItem = { time: s.time, year: Math.floor(yearOf(s, c)), key, text, sector };
  s.news = [item, ...s.news].slice(0, 40);
}
function pending(s: GameState, c: Content): Derived['pendingReckoning'] {
  if ((s as unknown as { _forcePending?: boolean })._forcePending) return { cause: 'exhausted', sector: 'steam' };
  for (const id of order(c)) {
    const es = s.sectors[id], def = c.sectors[id];
    if (!es.open || es.settled) continue;
    if (def.resourceKind === 'stock' && es.reserve <= 0.002 * es.reserveMax) return { cause: 'exhausted', sector: id };
    if (es.pressure >= def.collapseAt) return { cause: 'collapse', sector: id };
  }
  return null;
}

function owns(s: GameState, c: Content, id: string): boolean {
  if ((s.upgrades[id] || 0) >= 1) return true;
  if ((s.levers[id]?.level || 0) >= 1) return true;
  if ((s.meta.institutions[id] || 0) >= 1 || (s.meta.knowhow[id] || 0) >= 1 || s.meta.achievements[id]) return true;
  for (const sid of order(c)) if (s.sectors[sid].apps[id]?.founded) return true;
  return false;
}
function stat(s: GameState, c: Content, key: string, sector?: SectorId): number | null {
  if (key === 'reckonings') return s.meta.reckonings;
  if (key === 'time') return s.time;
  if (!sector || !s.sectors[sector]?.open) return null;
  const es = s.sectors[sector];
  if (key === 'serviceDelivered') return es.serviceDelivered;
  if (key === 'appsFounded') return Object.values(es.apps).filter((a) => a.founded).length;
  if (key === 'etaFold') return etaOf(s, c, sector) / (es.etaAtBase || 1);
  return null;
}
function check(s: GameState, c: Content, cond: Cond): CondCheck {
  if ('owns' in cond) { const met = owns(s, c, cond.owns); return { label: cond.label ?? `Own ${cond.owns}`, met, progress: met ? 1 : 0 }; }
  if ('stat' in cond) {
    const v = stat(s, c, cond.stat, cond.sector);
    const lbl = cond.label ?? `${cond.sector ?? ''} ${cond.stat} ${cond.op} ${cond.value}`;
    if (v == null) return { label: lbl, met: false, progress: 0 };
    const met = cond.op === '>=' ? v >= cond.value : cond.op === '>' ? v > cond.value : cond.op === '<=' ? v <= cond.value : v < cond.value;
    const p = cond.op[0] === '>' ? v / cond.value : cond.value / Math.max(1e-9, v);
    return { label: lbl, met, progress: Math.max(0, Math.min(1, p)) };
  }
  if ('flag' in cond) { const met = !!(s.flags as unknown as Record<string, boolean>)[cond.flag]; return { label: cond.label ?? cond.flag, met, progress: met ? 1 : 0 }; }
  if ('all' in cond) { const ks = cond.all.map((x) => check(s, c, x)); return { label: cond.label ?? 'All of', met: ks.every((k) => k.met), progress: null }; }
  if ('any' in cond) { const ks = cond.any.map((x) => check(s, c, x)); return { label: cond.label ?? 'Any of', met: ks.some((k) => k.met), progress: null }; }
  if ('not' in cond) { const k = check(s, c, cond.not); return { label: cond.label ?? 'Not', met: !k.met, progress: null }; }
  return { label: '?', met: false, progress: 0 };
}
function nextSectors(s: GameState, c: Content): Derived['nextSectors'] {
  const out: Derived['nextSectors'] = [];
  const ids = order(c);
  ids.forEach((id, i) => {
    if (i === 0 || s.sectors[id].open) return;
    const def = c.sectors[id];
    const after = def.unlock?.after ?? [ids[i - 1]];
    if (!after.every((a) => s.sectors[a]?.open)) return;
    const w = def.unlock?.when;
    const checklist = !w ? [] : 'all' in w ? w.all.map((x) => check(s, c, x)) : [check(s, c, w)];
    const need = def.unlock?.minReckonings ?? 0;
    out.push({ id, reckoningsNeeded: need, reckoningsHave: s.meta.reckonings, checklist, ready: checklist.every((k) => k.met) && s.meta.reckonings >= need });
  });
  return out;
}

function openSector(s: GameState, c: Content, id: SectorId, quiet = false): void {
  const es = s.sectors[id];
  const firstOfAge = c.ages.find((a) => a.sectors.includes(id));
  const ageWasOpen = firstOfAge ? firstOfAge.sectors.some((x) => s.sectors[x]?.open) : true;
  es.open = true; es.openFor = 0;
  for (const a of c.sectors[id].applications) if (a.visibleBelow === Infinity) es.apps[a.id] = newApp(true, a.foundCost === 0);
  for (const e of effects(s, c)) if (e.type === 'startFounded' && es.apps[e.app]) es.apps[e.app] = newApp(true, true);
  baseline(s, c, id);
  s.meta.sectorsOpened[id] = true;
  s.steadyYearsAll = 0;
  if (quiet) return;
  news(s, c, 'sectorOpened', {}, id); emit(s, c, 'sectorOpened', { sector: id });
  if (!ageWasOpen && firstOfAge) { news(s, c, 'ageBegins', { age: firstOfAge.name }); emit(s, c, 'ageBegins', { sector: id, id: firstOfAge.id }); }
}
function baseline(s: GameState, c: Content, id: SectorId): void {
  const es = s.sectors[id];
  es.etaAtBase = etaOf(s, c, id);
  const k = calc(s, c, id); es.baseR = k.R || 1; es.baseD = k.D || 1; es.basePs = k.ps;
}
function drawLine(s: GameState, c: Content, id: SectorId, R: number, pace: string | undefined, w: number): void {
  const es = s.sectors[id];
  es.budget = { r0: R, since: s.time, drawnYear: Math.floor(yearOf(s, c)), w0: w, p0: es.pressure, pace: paceOf(c, id, pace).id };
  es.steadyYears = 0; es.clearYears = Math.min(es.clearYears, es.clearYears >= STEADY_STATE_YEARS ? es.clearYears : 0); es.windowLean = false;
}
function clearP(s: GameState, c: Content, id: SectorId): number | null {
  const b = s.sectors[id].budget, def = c.sectors[id]; if (!b) return null;
  return Math.min(Math.max(0.5 * b.p0, 0.03 * def.collapseAt), 0.25 * def.collapseAt);
}
function absorption(s: GameState, c: Content, id: SectorId): number { return c.sectors[id].absorption + add(s, c, 'absorptionAdd', id); }
function pressureIn(c: Content, id: SectorId, k: Calc): number { const def = c.sectors[id]; return (def.pressureSource === 'service' ? k.D : k.R) * def.pressureIntensity; }
function isClear(s: GameState, c: Content, id: SectorId, k: Calc): boolean {
  const es = s.sectors[id]; if (es.settled) return true;
  const cp = clearP(s, c, id); if (cp == null) return false;
  const del = activeLever(s, c, id, 'deletion');
  const out = del ? del.lv.value * (del.lv.value2 ?? 1) * 40 : 0;
  return es.pressure <= cp && pressureIn(c, id, k) - out - absorption(s, c, id) * es.pressure <= 1e-6 * c.sectors[id].collapseAt;
}
function decadeW(s: GameState, c: Content, id: SectorId): number {
  const b = s.sectors[id].budget, tgt = c.global.wellbeingTarget;
  return b ? Math.min(tgt, b.w0 * 0.95) : tgt;
}
function decide(s: GameState): void {
  s.run.decisions = (s.run.decisions || 0) + 1;
  const k = Math.min(599, Math.floor(s.time * YEARS_PER_SECOND / 10));
  const arr = [...(s.run.decisionsByDecade || [])]; while (arr.length <= k) arr.push(0); arr[k]++; s.run.decisionsByDecade = arr;
}
function automate(s: GameState): void {
  s.run.automated = (s.run.automated || 0) + 1;
  const k = Math.min(599, Math.floor(s.time * YEARS_PER_SECOND / 10));
  const arr = [...(s.run.automatedByDecade || [])]; while (arr.length <= k) arr.push(0); arr[k]++; s.run.automatedByDecade = arr;
}
function offerDividend(s: GameState, c: Content, id: SectorId, n: number): void {
  const list = (c.sectors[id].steady?.decadeChoices ?? c.global.steady?.decadeChoices ?? []).filter((p) => p.every((x) => (c.dividends || []).some((d) => d.id === x)));
  if (!list.length) return;
  const pair = list[(n - 1) % list.length];
  const mulD = paceOf(c, id, s.sectors[id].budget?.pace).dividendMul;
  s.pendingDividends = [...(s.pendingDividends || []), { sector: id, decade: n, options: [pair[0], pair[1]], mul: mulD }];
  while (s.pendingDividends.length > PENDING_DIVIDENDS_MAX) {
    const old = s.pendingDividends[0];
    resolveDividend(s, c, old.sector, 0, 'default');
  }
}
function resolveDividend(s: GameState, c: Content, sector: SectorId, option: number, by: Actor): boolean {
  const i = (s.pendingDividends || []).findIndex((p) => p.sector === sector);
  if (i < 0 || (option !== 0 && option !== 1)) return false;
  const p = s.pendingDividends[i];
  s.pendingDividends = s.pendingDividends.filter((_, j) => j !== i);
  const id = p.options[option];
  s.sectors[sector].dividends = [...s.sectors[sector].dividends, id];
  const def = (c.dividends || []).find((d) => d.id === id);
  for (const e of def?.effects ?? []) {
    if (e.type === 'mandateAdd') s.mandate += e.value * p.mul;
    if (e.type === 'capitalAdd') s.capital += e.value * p.mul * Math.max(1, totalIncome(s, c));
    if (e.type === 'reserveAdd' && s.sectors[e.sector]) { s.sectors[e.sector].reserve += e.value * c.sectors[e.sector].reserve; s.sectors[e.sector].reserveMax += e.value * c.sectors[e.sector].reserve; }
  }
  emit(s, c, 'dividendChosen', { sector, id, n: p.decade, by });
  return true;
}
function totalIncome(s: GameState, c: Content): number { let x = 0; for (const id of order(c)) if (s.sectors[id].open) x += calc(s, c, id).income; return x; }
function stageOf(s: GameState, c: Content, id: SectorId): number | null {
  const ups = c.upgrades.filter((u) => u.sector === id && u.stage != null);
  if (!ups.length) return null;
  return ups.reduce((m, u) => ((s.upgrades[u.id] || 0) >= 1 ? Math.max(m, u.stage ?? 0) : m), 0);
}
function applyUpgrade(s: GameState, c: Content, u: UpgradeDef, cost: number, by: Actor): void {
  const st0 = stageOf(s, c, u.sector);
  s.capital -= cost; s.upgrades[u.id] = (s.upgrades[u.id] || 0) + 1;
  for (const e of u.effects) {
    if (e.type === 'reveal') { s.flags.revealed = true; news(s, c, 'reveal'); emit(s, c, 'reveal', { sector: u.sector }); }
    if (e.type === 'reserveAdd') { const es = s.sectors[e.sector]; es.reserve += e.value * c.sectors[e.sector].reserve; es.reserveMax += e.value * c.sectors[e.sector].reserve; }
    if (e.type === 'metaFlag') { s.meta.flags[e.flag] = true; if (e.flag === 'proprietor') publishReturn(s, c); }
  }
  if (u.kind === 'efficiency') news(s, c, 'efficiency', {}, u.sector);
  if (s.run.opening.length < OPENING_MAX) s.run.opening = [...s.run.opening, { t: s.time, kind: 'upgrade', id: u.id, by }];
  emit(s, c, 'upgradeBought', { sector: u.sector, id: u.id, n: s.upgrades[u.id], by });
  const st1 = stageOf(s, c, u.sector);
  if (st1 != null && st1 > (st0 ?? 0)) emit(s, c, 'stageReached', { sector: u.sector, id: u.id, n: st1, label: u.machine ?? u.name });
}

/** One step. Returns nothing; mutates the clone. */
function step(s: GameState, c: Content, dt: number, live = true): void {
  const t0 = s.time;
  s.time += dt;
  let income = 0, levyMandate = 0, levyCommons = 0;
  const w0 = wellbeing(s, c);
  const share = c.global.levy?.mandateShare ?? 0.1;
  const tgt = c.global.wellbeingTarget;
  for (const id of order(c)) {
    const es = s.sectors[id], def = c.sectors[id];
    if (!es.open) continue;
    es.openFor += dt;
    if (es.settled) {
      s.run.resourceUsed[id] = (s.run.resourceUsed[id] || 0) + es.settled.R * dt;
      es.serviceDelivered += es.settled.D * dt * YEARS_PER_SECOND;
      income += es.settled.income;
      continue;
    }
    const k = calc(s, c, id);
    es.eta = k.eta;
    for (const a of def.applications) {
      const st = es.apps[a.id];
      if (!st.available && k.ps <= a.visibleBelow) {
        st.available = true;
        if (a.foundCost === 0) st.founded = true;
        else { news(s, c, 'appAvailable', { app: a.name, service: def.service.name.toLowerCase() }, id); emit(s, c, 'appAvailable', { sector: id, id: a.id }); }
      }
      st.peakD = Math.max(st.peakD, k.apps[a.id].d);
      st.peakAdoption = Math.max(st.peakAdoption || 0, k.apps[a.id].ad);
      const suff = activeLever(s, c, id, 'sufficiency');
      const target = suff ? suff.lv.value : 1;
      st.satMul -= (st.satMul - target) * (1 - Math.exp(-(suff?.lv.value2 ?? 0.01) * dt));
      if (a.reserveGainPerService && def.resourceKind === 'stock') { const g = k.apps[a.id].d * a.reserveGainPerService * dt; es.reserve += g; es.reserveMax += g; }
    }
    if (def.resourceKind === 'stock') {
      const circ = activeLever(s, c, id, 'circularity');
      es.reserve = Math.max(0, es.reserve - k.R * (1 - (circ ? circ.lv.value : 0)) * dt);
    } else es.reserve = def.reserve;
    const del = activeLever(s, c, id, 'deletion');
    es.pressure = Math.max(0, es.pressure + pressureIn(c, id, k) * dt - es.pressure * absorption(s, c, id) * dt - (del ? del.lv.value * 40 * dt : 0));
    es.peakPressure = Math.max(es.peakPressure || 0, es.pressure);
    while (es.crisesFired < def.crisisAt.length && es.pressure >= def.crisisAt[es.crisesFired] * def.collapseAt) {
      es.crisesFired++; s.mandate += c.global.crisisMandate; s.population *= 1 - c.global.crisisPopLoss;
      news(s, c, 'crisis', { n: String(es.crisesFired) }, id); emit(s, c, 'crisis', { sector: id, n: es.crisesFired });
    }
    const prevSmooth = es.smoothR || k.R;
    es.smoothR = prevSmooth + (k.R - prevSmooth) * Math.min(1, dt / 60);
    es.trendR = prevSmooth > 0 ? ((es.smoothR - prevSmooth) / prevSmooth) / (dt * YEARS_PER_SECOND) : 0;
    es.peakR = Math.max(es.peakR, k.R);
    es.serviceDelivered += k.D * dt * YEARS_PER_SECOND;
    const etaFold = k.eta / (es.etaAtBase || 1);
    if (!es.backfired && etaFold > 1.001) {
      const shadow = calc(s, c, id, es.etaAtBase).R, prom = shadow / etaFold;
      if (shadow - prom > 1e-9 && (k.R - prom) / (shadow - prom) > 1) {
        es.backfired = true; news(s, c, 'backfire', {}, id); emit(s, c, 'backfire', { sector: id });
        if (!s.meta.backfiredSectors[id]) { s.meta.backfiredSectors[id] = true; s.run.firstBackfires[id] = true; }
        s.meta.achievements.backfire = true;
      }
    }
    if (activeLever(s, c, id, 'cap') && !es.budget && k.R > 0) { drawLine(s, c, id, k.R, undefined, w0); news(s, c, 'budgetDrawn', {}, id); emit(s, c, 'budgetDrawn', { sector: id, id: es.budget!.pace, by: 'default' }); }
    // The decade streak (against the drawn wellbeing), decades and dividends.
    const bR = budgetR(s, c, id);
    const within = bR != null && k.R <= bR * (1 + BUDGET_TOLERANCE);
    const decoupling = within && w0 >= decadeW(s, c, id);
    if (decoupling) {
      if (w0 < tgt) es.windowLean = true;
      const before = es.steadyYears;
      es.steadyYears += dt * YEARS_PER_SECOND;
      const dy = decadeYears(c);
      if (Math.floor(es.steadyYears / dy) > Math.floor(before / dy)) {
        es.decadesWithin.push(Math.floor(yearOf(s, c))); es.decadesLean.push(es.windowLean); s.run.budgetDecades++;
        if (es.windowLean) s.run.leanDecades++;
        const mulD = paceOf(c, id, es.budget?.pace).dividendMul;
        for (const e of def.steady?.decadeEffects ?? c.global.steady?.decadeEffects ?? []) if (e.type === 'mandateAdd') s.mandate += e.value * mulD;
        news(s, c, 'decade', { n: String(es.decadesWithin.length) }, id);
        emit(s, c, 'decade', { sector: id, n: es.decadesWithin.length, id: es.windowLean ? 'lean' : 'full' });
        es.windowLean = false;
        offerDividend(s, c, id, es.decadesWithin.length);
      }
    } else {
      if (es.steadyYears >= decadeYears(c)) { news(s, c, 'budgetBroken', {}, id); emit(s, c, 'budgetBroken', { sector: id }); }
      es.steadyYears = 0; es.windowLean = false;
    }
    // The Steady streak (full target, within budget, clear). Mock simplification: once earned it is kept.
    const clear = isClear(s, c, id, k);
    if (es.budget && clear && es.budget.clearAt == null) { es.budget.clearAt = s.time; news(s, c, 'clearSkies', {}, id); emit(s, c, 'clearSkies', { sector: id }); }
    const sinkHeld = within && w0 >= tgt && clear;
    if (sinkHeld) {
      const before = es.clearYears;
      es.clearYears += dt * YEARS_PER_SECOND;
      if (before < STEADY_STATE_YEARS && es.clearYears >= STEADY_STATE_YEARS) {
        if (es.budget) es.budget.heldAt = s.time;
        s.run.steadySectors[id] = true; s.meta.steadySectors[id] = true; s.meta.achievements.steadyState = true;
        news(s, c, 'steadySector', {}, id); emit(s, c, 'steadyState', { sector: id });
      }
    } else if (es.clearYears < STEADY_STATE_YEARS) es.clearYears = 0;
    s.run.resourceUsed[id] = (s.run.resourceUsed[id] || 0) + k.R * dt;
    income += k.income;
    const tre = ['duty', 'cap'].map((kind) => activeLever(s, c, id, kind)).find(Boolean);
    if (tre) {
      const r = s.levers[tre.def.id].recycle ?? tre.def.recycle?.[0] ?? 'treasury';
      if (r === 'treasury') levyMandate += k.levy * share;
      if (r === 'commons') levyCommons += k.levy;
    }
  }
  for (const n of nextSectors(s, c)) if (n.ready) openSector(s, c, n.id);
  s.capital += income * dt;
  s.commons = { ...s.commons, fund: (s.commons?.fund || 0) + levyCommons * (c.global.commons?.fundShare ?? 1) * dt };
  const w = wellbeing(s, c);
  s.run.peakWellbeing = Math.max(s.run.peakWellbeing, w);
  s.run.wellbeingYears += Math.max(0, w - c.global.subsistence) * dt * YEARS_PER_SECOND;
  if (w >= tgt) s.run.yearsAtTarget += dt * YEARS_PER_SECOND;
  const upkeep = leverUpkeep(s, c) + settleDefence(s, c);
  if (s.flags.revealed || s.mandate > 0) s.mandate = Math.max(0, s.mandate + (Math.max(0, w - c.global.mandateFloor) * c.global.mandateRate * mul(s, c, 'mandateRateMul') + levyMandate - upkeep) * dt);
  s.population = Math.max(0.01, s.population + popGrowth(s, c, w) * dt);
  s.peakPopulation = Math.max(s.peakPopulation, s.population);
  s.meta.peakPopulationEver = Math.max(s.meta.peakPopulationEver || 1, s.population);
  const lastT = s.history.length ? s.history[s.history.length - 1].time : -99;
  if (s.time - lastT >= 5) {
    const sectors: GameState['history'][number]['sectors'] = {};
    const budget: Record<SectorId, number> = {};
    const sink: Record<SectorId, number> = {};
    for (const id of order(c)) if (s.sectors[id].open) {
      const k = calc(s, c, id), es = s.sectors[id];
      sectors[id] = [k.eta / (es.etaAtBase || 1), k.R / (es.baseR || 1)];
      const b = budgetR(s, c, id); if (b != null) budget[id] = b / (es.baseR || 1);
      const sr = sinkROf(s, c, id, k); if (sr != null) sink[id] = sr / (es.baseR || 1);
    }
    s.history.push({ time: s.time, sectors, budget, sink, wellbeing: w });
    if (s.history.length > 240) s.history = s.history.filter((_, i) => i % 2 === 0 || i > 120);
  }
  // Standing orders, at order ticks.
  if (!ordersPaused && Math.floor(s.time * YEARS_PER_SECOND / INTERVAL_YEARS) > Math.floor(t0 * YEARS_PER_SECOND / INTERVAL_YEARS) && !pending(s, c) && s.time > 0) runOrders(s, c);
  if (s.dispatch) stepM3(s, c, dt, live);
}
function leverUpkeep(s: GameState, c: Content): number {
  let u = 0;
  for (const l of c.levers) { const ls = s.levers[l.id]; const lv = ls ? leverLevel(l, ls.level) : null; if (lv) u += lv.mandateUpkeep; }
  return u;
}
function settleExcess(s: GameState, id: SectorId): number {
  const st = s.sectors[id].settled; if (!st) return 0;
  return Math.max(0, s.population / Math.max(1e-9, st.N0) - 1);
}
function settleDefenceOf(s: GameState, c: Content, id: SectorId): number {
  const def = c.sectors[id]; if (!s.sectors[id].settled || !def.settle) return 0;
  return def.settle.upkeepPerSpill * Math.max(0, settleExcess(s, id) - (def.settle.freeExcess ?? 0.05));
}
function settleDefence(s: GameState, c: Content): number { return order(c).reduce((a, id) => a + settleDefenceOf(s, c, id), 0); }
function sinkROf(s: GameState, c: Content, id: SectorId, k: Calc): number | null {
  const cp = clearP(s, c, id), ab = absorption(s, c, id), pin = pressureIn(c, id, k);
  if (cp == null || ab <= 0 || pin <= 0 || k.R <= 0 || s.sectors[id].settled) return null;
  return cp * ab * k.R / pin;
}
function runOrders(s: GameState, c: Content): void {
  const o = s.meta.orders;
  const inc = totalIncome(s, c);
  if (o.market.on && marketAvailable(s, c)) {
    for (const id of order(c)) {
      const es = s.sectors[id];
      if (!es.open || es.settled || o.market.sectors[id] === false) continue;
      const cands = viewsOf(s, c).filter((v) => v.def.sector === id && v.affordable && (v.def.kind === 'efficiency' || v.def.kind === 'capital') && !v.def.excludes?.length);
      const best = cands.sort((a, b) => a.cost - b.cost)[0];
      if (best && best.cost <= inc * o.market.paybackMax * 0.5) { applyUpgrade(s, c, best.def, best.cost, 'market'); automate(s); }
    }
  }
  if (o.civilService.on && orderUnlocked(s, c, 'civilService')) {
    for (const id of order(c)) {
      const ids = o.civilService.levers[id] || [];
      const bR = budgetR(s, c, id);
      if (!ids.length || bR == null || s.sectors[id].settled) continue;
      if (calc(s, c, id).R > bR * (1 + BUDGET_TOLERANCE)) {
        const lv = ids.map((x) => c.levers.find((l) => l.id === x)).filter((l): l is LeverDef => !!l)
          .map((l) => ({ l, nx: leverLevel(l, (s.levers[l.id]?.level || 0) + 1) })).filter((x) => x.nx && s.mandate >= x.nx.mandateCost)
          .sort((a, b) => a.nx!.mandateCost - b.nx!.mandateCost)[0];
        if (lv) {
          s.mandate -= lv.nx!.mandateCost; s.levers[lv.l.id] = { ...s.levers[lv.l.id], level: (s.levers[lv.l.id]?.level || 0) + 1 };
          emit(s, c, 'leverEnacted', { sector: id, id: lv.l.id, n: s.levers[lv.l.id].level, by: 'civilService' }); automate(s);
        }
      }
    }
  }
  if (o.treasury.on && orderUnlocked(s, c, 'treasury') && commonsOpen(s, c)) {
    const keep = o.treasury.keepSeconds * inc;
    for (const pid of o.treasury.projects) {
      const v = commonsViewsOf(s, c).find((x) => x.def.id === pid);
      if (v && v.visible && !v.maxed && v.cost != null && s.commons.fund + s.capital - keep >= v.cost && s.mandate >= (v.mandateCost ?? 0)) {
        buildCommons(s, c, v, 'treasury'); automate(s); break;
      }
    }
  }
}
function marketAvailable(s: GameState, c: Content): boolean { return s.meta.reckonings >= (c.global.orders?.marketFromReckoning ?? 1) || orderUnlocked(s, c, 'market'); }
function commonsOpen(s: GameState, c: Content): boolean { return s.meta.reckonings >= (c.global.commons?.fromReckoning ?? 2); }
function buildCommons(s: GameState, c: Content, v: CommonsView, by: Actor): void {
  const cost = v.cost ?? 0;
  const fromFund = Math.min(s.commons.fund, cost);
  s.commons = { levels: { ...s.commons.levels, [v.def.id]: v.level + 1 }, fund: s.commons.fund - fromFund };
  s.capital -= cost - fromFund; s.mandate -= v.mandateCost ?? 0;
  news(s, c, 'commonsBuilt', { name: v.def.name }, v.def.sector);
  emit(s, c, 'commonsBuilt', { id: v.def.id, n: v.level + 1, sector: v.def.sector, by });
}
let viewsOf: (s: GameState, c: Content) => UpgradeView[] = () => [];
/** Standing orders wait while the mock builds its starting states (so `rich` starts where it always did). */
let ordersPaused = false;

/* ---------------- M3 (crude; display-shaped) ---------------- */
/** M3 features the mock switches on (set by makeMockModel from the hash). */
let m3Feat = new Set<FeatureId>();
let mockOptsNow: MockOpts = {};
const M3_IDS: FeatureId[] = ['archive', 'ambient', 'dispatches', 'seams', 'load', 'travel', 'sideEffects', 'freeAtUse', 'survey', 'histories', 'bank'];
const featOn = (id: FeatureId): boolean => m3Feat.has(id);
const DISPATCH_EXPIRY = 12 / YEARS_PER_SECOND;
const DISPATCH_GAP = 6 / YEARS_PER_SECOND;
function freshDispatch(): GameState['dispatch'] {
  return { pending: [], queue: [], answered: [], offered: [], draws: 0, nextAt: 30, standing: [] };
}
function seamMul(s: GameState, c: Content, id: SectorId): number {
  const n = s.sectors[id]?.seamsSunk ?? 0;
  return n > 0 ? c.sectors[id].seams?.[n - 1]?.priceMul ?? 1 : 1;
}
function ownsM3(s: GameState, id: string): boolean {
  return (s.upgrades[id] || 0) >= 1 || (s.levers[id]?.level ?? 0) >= 1 || (s.meta.knowhow[id] || 0) >= 1;
}
function oneOffs(s: GameState, c: Content, effs: EffectDef[], income: number): void {
  for (const e of effs) {
    if (e.type === 'capitalAdd') s.capital = Math.max(0, s.capital + e.value * income);
    else if (e.type === 'mandateAdd') s.mandate = Math.max(0, s.mandate + e.value);
    else if (e.type === 'pressureAdd' && s.sectors[e.sector]) s.sectors[e.sector].pressure = Math.max(0, s.sectors[e.sector].pressure + e.value * c.sectors[e.sector].collapseAt);
  }
}
function resolveDispatch(s: GameState, c: Content, id: string, arm: number, by: Actor): void {
  const d = (c.dispatches || []).find((x) => x.id === id);
  if (!d) return;
  const a = d.arms[arm];
  const income = totalIncome(s, c);
  if (a.cost) { s.mandate = Math.max(0, s.mandate - (a.cost.mandate ?? 0)); s.capital = Math.max(0, s.capital - (a.cost.capitalSeconds ?? 0) * income); }
  oneOffs(s, c, a.effects ?? [], income);
  if (a.modifier) {
    const until = s.time + a.modifier.years / YEARS_PER_SECOND;
    const ex = s.modifiers.find((m) => m.source === id && m.arm === arm);
    if (ex) ex.until = Math.max(ex.until, until); else s.modifiers.push({ source: id, arm, since: s.time, until });
  }
  s.dispatch.pending = s.dispatch.pending.filter((p) => p.id !== id);
  s.dispatch.answered = [...s.dispatch.answered, { id, arm, t: s.time, by }].slice(-60);
  const arms = s.meta.dispatches.arms[id] ?? []; arms[arm] = (arms[arm] ?? 0) + 1; s.meta.dispatches.arms[id] = arms;
  if (by === 'player') { const pa = s.meta.dispatches.playerArms[id] ?? []; pa[arm] = (pa[arm] ?? 0) + 1; s.meta.dispatches.playerArms[id] = pa; s.run.dispatchesAnswered++; }
  else s.run.dispatchesDefaulted++;
  if (a.reply) news(s, c, 'answered' as HeadlineKey, {}, d.sector);
  if (a.reply) s.news[0] = { ...s.news[0], text: a.reply };
  emit(s, c, 'dispatchAnswered', { id, n: arm, sector: d.sector, by });
  if (!s.meta.milestones.dispatch) s.meta.milestones.dispatch = { run: s.meta.reckonings + 1, at: s.meta.totalSeconds + s.time, year: Math.floor(yearOf(s, c)) };
  s.dispatch.nextAt = Math.max(s.dispatch.nextAt, s.time + DISPATCH_GAP);
}
function drawDispatch(s: GameState, c: Content): void {
  const list = c.dispatches || [];
  const cand = list.filter((d) => !s.dispatch.offered.includes(d.id));
  const d = cand[0] ?? list[s.dispatch.draws % Math.max(1, list.length)];
  if (!d) return;
  s.dispatch.draws++;
  s.dispatch.pending.push({ id: d.id, arrivedAt: s.time, expiresAt: s.time + (d.expiryYears ?? 12) / YEARS_PER_SECOND });
  s.dispatch.offered.push(d.id);
  s.meta.dispatches.seen[d.id] = (s.meta.dispatches.seen[d.id] ?? 0) + 1;
  news(s, c, 'dispatch' as HeadlineKey, {}, d.sector);
  s.news[0] = { ...s.news[0], text: d.headline };
  emit(s, c, 'dispatchArrived', { id: d.id, sector: d.sector, label: d.cast });
}
/** The M3 part of a step (after the M2 part). `live`: not inside a catch-up (letters need a reader). */
function stepM3(s: GameState, c: Content, dt: number, live: boolean): void {
  const dy = dt * YEARS_PER_SECOND;
  for (const l of c.levers) {
    const se = l.sideEffects; if (!se) continue;
    const st = s.levers[l.id]; if (!st) continue;
    const active = st.level >= 1 && !(se.unless && 'owns' in se.unless && ownsM3(s, se.unless.owns));
    const b = st.bite ?? 0;
    st.bite = active ? b + (1 - b) * (1 - Math.exp(-dy / se.rampYears)) : b * Math.exp(-dy / (se.decayYears ?? se.rampYears));
    if (st.bite >= 0.5 && !st.bitten) { st.bitten = true; if (featOn('sideEffects')) news(s, c, 'biteBack' as HeadlineKey, {}, l.sector); emit(s, c, 'biteBack', { sector: l.sector, id: l.id }); }
  }
  for (const m of [...s.modifiers]) if (m.until <= s.time) { s.modifiers = s.modifiers.filter((x) => x !== m); emit(s, c, 'modifierEnded', { id: m.source, n: m.arm }); }
  for (const p of [...s.dispatch.pending]) if (p.expiresAt <= s.time) resolveDispatch(s, c, p.id, (c.dispatches || []).find((d) => d.id === p.id)?.defaultArm ?? 0, 'default');
  if (live && featOn('dispatches') && !pending(s, c) && s.dispatch.pending.length < 1 && s.time >= s.dispatch.nextAt) drawDispatch(s, c);
}
function m3SectorViews(s: GameState, c: Content, id: SectorId, k: Calc): Pick<SectorDerived, 'seams' | 'load' | 'travel' | 'free' | 'upkeep'> {
  const def = c.sectors[id], es = s.sectors[id];
  let seams: SectorDerived['seams'] = null, load: SectorDerived['load'] = null, travel: SectorDerived['travel'] = null, free: SectorDerived['free'] = null, upkeep: SectorDerived['upkeep'] = null;
  if (def.seams?.length && def.resourceKind === 'stock' && featOn('seams')) {
    const n = es.seamsSunk ?? 0;
    seams = { sunk: n, total: def.seams.length, priceMul: seamMul(s, c, id), ladder: def.seams.map((sd, i) => {
      const reachable = i === n && k.ps <= (sd.reachBelow ?? Infinity);
      return { def: sd, sunk: i < n, reachable, cost: sd.cost, canSink: reachable && s.capital >= sd.cost && !es.settled && !pending(s, c), forbidden: false };
    }) };
  }
  if (def.load && featOn('load')) {
    const L = def.load;
    const shape = (key?: string) => { const w = L.profiles[key ?? ''] ?? L.profiles[L.defaultProfile] ?? []; const sum = w.reduce((a, x) => a + x, 0) || 1; return w.map((x) => 24 * x / sum); };
    const hours = Array.from({ length: 24 }, () => 0);
    for (const a of def.applications) { const d = k.apps[a.id]?.d ?? 0; if (!d) continue; const sh = shape(a.profile); for (let h = 0; h < 24; h++) hours[h] += d * (sh[h] ?? 1); }
    const D = hours.reduce((a, x) => a + x, 0) / 24, peak = Math.max(...hours);
    const LF = peak > 0 ? D / peak : 1;
    load = { factor: LF, hours, peak, capCostBase: k.cap, capCostEff: k.cap * ((1 - L.fixedShare) + L.fixedShare / Math.max(L.floor ?? 0.05, LF)) };
  }
  if (def.travel && featOn('travel')) {
    const T = def.travel, b = T.exponent ?? 4;
    const cong = Math.pow(k.D / T.roads, b), v = 1 / (1 + cong);
    let sprawl = 0;
    for (const a of def.applications) if (es.apps[a.id]?.founded && a.lockIn) sprawl += a.lockIn * es.apps[a.id].peakD;
    travel = { speed: v, freeSpeed: 1, roads: T.roads, congestion: cong, hoursPerHead: T.hoursScale * (k.D / Math.max(0.01, s.population)) / Math.max(v, 1e-6), sprawl, sprawlShare: k.D > 0 ? Math.min(1, sprawl / k.D) : 0 };
  }
  if (featOn('freeAtUse')) {
    let bill = 0, fd = 0, any = false;
    for (const a of def.applications) {
      if (!a.priceSeen || !es.apps[a.id]?.founded) continue;
      const pa = a.priceSeen.share * k.ps + (a.priceSeen.flat ?? 0);
      if (pa !== k.ps) any = true;
      if (pa < k.ps) { bill += (k.ps - pa) * k.apps[a.id].d; fd += k.apps[a.id].d; }
    }
    if (any) free = { bill, freeShare: k.D > 0 ? fd / k.D : 0 };
  }
  if ((def.pressureUpkeep ?? 0) > 0) {
    const cap = def.reserve || 1;
    upkeep = { share: Math.min(0.95, es.pressure * (def.pressureUpkeep ?? 0) * 40 / cap * 1000), deletionOut: (activeLever(s, c, id, 'deletion')?.lv.value ?? 0) * 40, pressureIn: pressureIn(c, id, k) };
  }
  return { seams, load, travel, free, upkeep };
}

/** M3 fixture on a rich state (#mock:m3): letters, modifiers, a biting lever, the Archive, Histories, the survey. */
function m3Fixture(s: GameState, c: Content): void {
  const o = mockOptsNow;
  s.meta.reckonings = 5;
  const ms = (run: number, at: number, year: number) => ({ run, at, year });
  s.meta.milestones = {
    reveal: ms(1, 540, 1806), 'backfire:steam': ms(1, 700, 1811), 'sectorOpened:light': ms(2, 4200, 1871), dispatch: ms(2, 5400, 1823),
    decade: ms(3, 9600, 1812), 'seam:steam': ms(3, 10400, 1826), 'clearSkies:steam': ms(4, 15800, 1844), 'steady:steam': ms(4, 17600, 1862),
    'sectorOpened:motion': ms(4, 19800, 1952), 'settled:light': ms(5, 24000, 1921), history: ms(5, 29000, 1858),
  };
  s.sectors.steam.seamsSunk = 1; s.sectors.steam.reserve += 120_000; s.sectors.steam.reserveMax += 120_000;
  // A biting lever (the duty, unpaired).
  s.levers['steam.duty'] = { ...s.levers['steam.duty'], level: 2, bite: 0.62, bitten: true };
  if (s.levers['motion.standard']) s.levers['motion.standard'] = { level: 1, ref: 0, bite: 0.3 };
  // Answered letters and the modifiers they left.
  const ids = (c.dispatches || []).map((d) => d.id);
  s.dispatch.answered = [{ id: ids[3] ?? ids[0], arm: 1, t: s.time - 200, by: 'player' }, { id: ids[2] ?? ids[0], arm: 0, t: s.time - 90, by: 'default' }];
  s.dispatch.offered = [...new Set(s.dispatch.answered.map((a) => a.id))];
  s.modifiers = [];
  for (const a of s.dispatch.answered) {
    const arm = (c.dispatches || []).find((d) => d.id === a.id)?.arms[a.arm];
    if (arm?.modifier) s.modifiers.push({ source: a.id, arm: a.arm, since: a.t, until: s.time + 150 + s.modifiers.length * 140 });
  }
  s.run.dispatchesAnswered = 1; s.run.dispatchesDefaulted = 1;
  const letter = o.letter ?? 2;
  if (letter) {
    const id = letter === 3 ? 'd.steam.tallChimney' : 'd.gen.firstLetter';
    s.dispatch.pending = [{ id, arrivedAt: s.time - 20, expiresAt: s.time + 190 }];
    s.dispatch.offered.push(id);
    if (letter === 3) s.mandate = 30;
  }
  s.dispatch.nextAt = letter ? s.time + 9999 : s.time + 70;
  // The Archive: two notes in three unlocked, spread over the save.
  (c.archive || []).forEach((a, i) => { if (i % 3 !== 2) s.meta.archive[a.id] = 600 + i * 170; });
  // Histories: one cleared, one in force this run.
  const hs = c.histories || [];
  if (hs[1]) s.meta.histories[hs[1].id] = { runs: 2, cleared: true, best: 3120 };
  if (hs[0]) { s.meta.histories[hs[0].id] = { runs: 1, cleared: false, best: null }; s.meta.history = hs[0].id; }
  s.meta.unlocks = { 'title:Coal owner': true };
  // The survey.
  const sv = o.survey ?? 'none';
  if (sv !== 'none') {
    const dir = sv === 'filed' ? 'up' : sv;
    s.meta.returns.household = { figures: fixtureFigures(dir), run: 5, at: s.meta.totalSeconds, published: false, template: null };
    if (sv !== 'filed') { s.meta.flags.proprietor = true; s.meta.returns.household.published = true; s.meta.returns.household.template = 0; }
  }
  s.meta.institutions['inst.civilService'] = 1;
  if (o.ending) {
    s.steadyYearsAll = 49.6;
    (s as unknown as { _winAt: number })._winAt = s.time + 64;
  }
}
function householdDerived(s: GameState, c: Content): SurveyView | null {
  const r = s.meta.returns?.household;
  if (!r || !featOn('survey')) return null;
  const f = r.figures;
  const div = (a: number, b: number) => (b > 0 ? a / b : null);
  const wb = div(f.activeMinutesBefore, f.daysBefore), wa = div(f.activeMinutesAfter, f.daysAfter);
  const db = div(f.decisionsBefore, f.activeMinutesBefore / 60), da = div(f.decisionsAfter, f.activeMinutesAfter / 60);
  const ch = (a: number | null, b: number | null) => (a != null && b != null && b !== 0 ? a / b - 1 : null);
  const wc = ch(wa, wb);
  const direction: SurveyView['direction'] = wc == null ? 'flat' : wc > 0.05 ? 'up' : wc < -0.05 ? 'down' : 'flat';
  let text: SurveyView['text'] = null;
  if (r.published) {
    const tpl = (c.proprietor?.returns || []).filter((x) => x.direction === direction)[r.template ?? 0];
    const vars: Record<string, string> = {
      workdayBefore: String(Math.round(wb ?? 0)), workdayAfter: String(Math.round(wa ?? 0)), workdayChange: String(Math.round(Math.abs((wc ?? 0) * 100))),
      decisionsBefore: String(Math.round(db ?? 0)), decisionsAfter: String(Math.round(da ?? 0)),
      sessionsBefore: (div(f.sessionsBefore, f.daysBefore) ?? 0).toFixed(1), sessionsAfter: (div(f.sessionsAfter, f.daysAfter) ?? 0).toFixed(1),
      automatedPerHour: String(Math.round(div(f.automatedAfter, f.activeMinutesAfter / 60) ?? 0)),
    };
    const sub = (t: string) => t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
    if (tpl) text = { headline: sub(tpl.headline), body: sub(tpl.body) };
  }
  return {
    filedRun: r.run, published: r.published, workdayBefore: wb, workdayAfter: wa, workdayChange: wc,
    decisionsPerHourBefore: db, decisionsPerHourAfter: da, decisionsChange: ch(da, db),
    automatedPerHour: div(f.automatedAfter, f.activeMinutesAfter / 60),
    sessionsPerDayBefore: div(f.sessionsBefore, f.daysBefore), sessionsPerDayAfter: div(f.sessionsAfter, f.daysAfter),
    minutesPerSessionBefore: div(f.activeMinutesBefore, f.sessionsBefore), minutesPerSessionAfter: div(f.activeMinutesAfter, f.sessionsAfter),
    direction, pure: { decisionsPerDecadeBefore: 14, decisionsPerDecadeAfter: 9 }, text,
  };
}
function publishReturn(s: GameState, c: Content): void {
  const r = s.meta.returns?.household;
  if (!r || r.published) return;
  r.published = true; r.template = 0;
  const v = householdDerived(s, c);
  if (v?.text) { news(s, c, 'return' as HeadlineKey); s.news[0] = { ...s.news[0], text: v.text.headline }; }
  emit(s, c, 'returnPublished', { id: 'household', n: Math.round((v?.workdayChange ?? 0) * 100) });
  if (!s.meta.milestones.proprietor) s.meta.milestones.proprietor = { run: s.meta.reckonings + 1, at: s.meta.totalSeconds + s.time, year: Math.floor(yearOf(s, c)) };
}
/** Household figures shaped to give a direction (for the mock's fixtures). */
function fixtureFigures(dir: 'up' | 'down' | 'flat'): Record<string, number> {
  const after = dir === 'up' ? 1800 : dir === 'down' ? 700 : 1040;
  return { activeMinutesBefore: 1000, activeMinutesAfter: after, sessionsBefore: 14, sessionsAfter: 22, looksBefore: 40, looksAfter: 96,
    decisionsBefore: 1500, decisionsAfter: dir === 'up' ? 2100 : 800, automatedAfter: 2600, daysBefore: 10, daysAfter: 10, quietDays: 3 };
}
function marketWhyOf(s: GameState, c: Content, id: SectorId, i: number): MarketWhy {
  if (s.sectors[id]?.settled) return { reason: 'settled' };
  if (s.meta.orders?.market?.sectors?.[id] === false) return { reason: 'sectorOff' };
  const opts: MarketWhy[] = [
    { reason: 'payback', payback: 380 + 40 * i, at: s.time - 12 },
    { reason: 'bought', id: c.upgrades.find((u) => u.sector === id)?.id ?? id, at: s.time - 8 },
    { reason: 'cash', at: s.time - 5 },
    { reason: 'none', at: s.time - 20 },
  ];
  return opts[i % opts.length];
}
function commonsViewsOf(s: GameState, c: Content): CommonsView[] {
  const open = commonsOpen(s, c), pend = !!pending(s, c), ym = mul(s, c, 'commonsYieldMul');
  return (c.commons || []).map((p): CommonsView => {
    const level = s.commons?.levels?.[p.id] || 0, maxLevel = p.maxLevel ?? 1, maxed = level >= maxLevel;
    const cost = maxed ? null : p.cost * Math.pow(p.costGrowth ?? 1, level);
    const mandateCost = maxed ? null : p.mandateCost ?? 0;
    const visible = open && (!p.sector || !!s.sectors[p.sector]?.open);
    const affordable = !maxed && (s.commons?.fund || 0) + s.capital >= (cost ?? 0) && s.mandate >= (mandateCost ?? 0);
    const wb = commonsWb(c, p, level, ym);
    return {
      def: p, level, maxLevel, cost, mandateCost, visible, maxed, affordable, canBuy: visible && !maxed && affordable && !pend,
      wellbeing: wb, nextWellbeing: maxed ? 0 : commonsWb(c, p, level + 1, ym) - wb,
      intensityNow: p.intensity && s.sectors[p.intensity.sector]?.open ? level * p.intensity.perLevel * s.population : 0,
    };
  });
}
function freshOrders(c: Content): OrdersState {
  return { market: { on: true, paybackMax: c.global.orders?.marketPaybackMax ?? 120, sectors: {} }, civilService: { on: false, levers: {} }, treasury: { on: false, keepSeconds: 60, projects: [] }, dispatch: { on: false, cast: {} } };
}

export interface MockOpts {
  reveal?: boolean; rich?: boolean; pending?: boolean; won?: boolean; light?: boolean; all?: boolean; budget?: boolean; persist?: boolean;
  smog?: number; sector?: SectorId;
  /** M2: run 3 with every M2 element live (Commons, orders, dividends, a settled Industry, run history). */
  m2?: boolean;
  /** M2: a "While you were away" report on load: held by a crisis, or plain. */
  away?: 'held' | 'plain';
  /** M2: between runs, as after a Reckoning: a Charter offer and a respec (with m2). */
  fresh?: boolean;
  /** Many affordable things and a late, depleting Industry (rebound well past 1,000%). */
  late?: boolean;
  /** The unfolding: every feature locked except those named by `feat=a+b` (Derived.features). Default: all unlocked. */
  locked?: boolean;
  feat?: string[];
  /** M3: run 6 with every M3 system on (a pending letter, modifiers, a biting lever, the Archive, a History in force). */
  m3?: boolean;
  /** M3: the pending letter: 2 or 3 answers (3 has one the purse cannot meet); 0 = none waiting. */
  letter?: number;
  /** M3: the household survey: not filed, filed (the card waits), or published with that direction. */
  survey?: 'none' | 'filed' | 'up' | 'down' | 'flat';
  /** M3: at the brink of the first ending (credits and the retrospective a few seconds in). */
  ending?: boolean;
}

/** `#mock` or `#mock:rich,reveal,all,budget,pending,won,persist,smog=0.8,sector=compute,m2,away=held,fresh,late`. */
export function parseMockHash(hash: string): MockOpts | null {
  const m = /^#mock(?::(.*))?$/.exec(hash || '');
  if (!m) return null;
  const o: MockOpts = {};
  for (const part of (m[1] || '').split(',')) {
    const [k, v] = part.split('=');
    if (k === 'rich' || k === 'reveal' || k === 'pending' || k === 'won' || k === 'light' || k === 'all' || k === 'budget' || k === 'persist' || k === 'm2' || k === 'fresh' || k === 'late') o[k] = true;
    else if (k === 'smog') o.smog = Number(v) || 0;
    else if (k === 'locked') o.locked = true;
    else if (k === 'feat') o.feat = (v || '').split('+').filter(Boolean);
    else if (k === 'away') o.away = v === 'plain' ? 'plain' : 'held';
    else if (k === 'm3') o.m3 = true;
    else if (k === 'ending') { o.ending = true; o.m3 = true; }
    else if (k === 'letter') o.letter = Number(v) || 0;
    else if (k === 'survey' && ['none', 'filed', 'up', 'down', 'flat'].includes(v)) o.survey = v as MockOpts['survey'];
    else if ((k === 'sector' || k === 'era') && mockContent.sectors[v]) o.sector = v;
  }
  if (o.m3) o.m2 = true;
  if (o.m2) { o.all = true; o.budget = true; }
  if (o.all) { o.rich = true; o.reveal = true; }
  if (o.budget) { o.rich = true; o.reveal = true; }
  if (o.sector && o.sector !== 'steam') o.rich = true;
  return o;
}

export function makeMockModel(opts: MockOpts = {}): ModelApi {
  mockOptsNow = opts;
  m3Feat = new Set(M3_IDS.filter((f) => f !== 'bank' && (opts.m3 || (opts.feat ?? []).includes(f))));
  const freshMeta = (c: Content): MetaState => ({
    hindsight: 0, hindsightEarned: 0, reckonings: 0, knowhow: {}, institutions: {}, achievements: {}, steadySectors: {}, sectorsOpened: {},
    totalSeconds: 0, slots: c.global.startingSlots ?? 2, loadout: [], backfiredSectors: {},
    charter: null, orders: freshOrders(c), runs: [], eventSeq: 0, knowhowPeak: {}, peakPopulationEver: 1,
    dispatches: { seen: {}, arms: {}, playerArms: {} }, history: null, histories: {}, unlocks: {}, returns: {}, archive: {}, flags: {}, endings: {},
    milestones: {}, bankedSeconds: 0,
  });
  const seatedReveal = (s: GameState, c: Content) => effects(s, c).some((e) => e.type === 'reveal');
  const terms = (s: GameState, c: Content): HindsightTerms => {
    const g = c.global.hindsight;
    let num = 0, den = 0, unb = 0, open = 0, settled = 0;
    for (const id of order(c)) {
      const es = s.sectors[id]; if (!es.open) continue;
      open++;
      if (es.settled) settled++;
      if (es.baseR > 0 && es.openFor > 0) { num += (s.run.resourceUsed[id] || 0) / es.baseR; den += es.openFor; }
      if (c.sectors[id].resourceKind === 'stock') unb += es.reserve / Math.max(1, es.reserveMax);
    }
    const intensity = den > 0 ? num / den : 1;
    const t: HindsightTerms = {
      wellbeingYears: s.run.wellbeingYears, intensity,
      wellbeing: g.perWellbeingYear * s.run.wellbeingYears / Math.pow(Math.max(1, intensity), g.intensityExponent),
      budget: g.perBudgetDecade * (s.run.budgetDecades - s.run.leanDecades) + (g.perLeanDecade ?? 0) * s.run.leanDecades,
      unburnt: g.perUnburnt * unb * Math.min(1, s.run.yearsAtTarget / STEADY_STATE_YEARS),
      backfire: g.perFirstBackfire * Object.keys(s.run.firstBackfires).length,
      sectorsReached: g.perSectorReached * Math.max(0, open - 1),
      steady: g.perSteadySector * Object.keys(s.run.steadySectors).length,
      settled: (g.perSettledSector ?? 0) * settled,
      total: 0,
    };
    t.total = Math.max(1, Math.round(t.wellbeing + t.budget + t.unburnt + t.backfire + t.sectorsReached + t.steady + t.settled));
    return t;
  };
  const isFresh = (s: GameState) => s.time === 0 && Object.keys(s.upgrades).length === 0;
  const rebuild = (s0: GameState, c: Content, meta: MetaState): GameState => {
    const s = api.createState(c, meta, s0.seed);
    s.news = s0.news; s.mandate = s0.mandate; s.run.clicks = s0.run.clicks; s.capital = Math.max(s.capital, s0.capital);
    s.events = s0.events; s.charterOffer = s0.charterOffer; s.lastOffline = s0.lastOffline;
    return s;
  };
  const drawOffer = (s: GameState, c: Content, last?: string): string[] => {
    let e = (c.charters || []).map((x) => x.id);
    if (last && e.filter((x) => x !== last).length >= 2) e = e.filter((x) => x !== last);
    if (e.length <= 2) return e;
    const i = s.seed % e.length, j = (i + 1 + ((s.seed >> 3) % (e.length - 1))) % e.length;
    return [e[Math.min(i, j)], e[Math.max(i, j)]];
  };
  /** Fills meta.runs with a plausible history (newest last). */
  const fakeRuns = (c: Content, n: number): RunSummary[] => {
    const out: RunSummary[] = [];
    const causes: RunSummary['cause'][] = ['exhausted', 'collapse', 'chosen', 'exhausted', 'chosen'];
    for (let i = 0; i < n; i++) {
      const seconds = 1500 + i * 640;
      out.push({
        cause: causes[i % causes.length], causeSector: causes[i % causes.length] === 'chosen' ? undefined : 'steam', seconds, yearReached: 1850 + i * 18,
        hindsightGained: 22 + i * 19, peakWellbeing: 24 + i * 3,
        sectors: {
          steam: { etaFold: 8 + i * 2, peakRFold: 3.2 - i * 0.4, resourceUsed: 4e5 + i * 5e4, unburnt: 0.05 + i * 0.12, decades: i, leanDecades: Math.max(0, i - 1), peakPressure: 0.95 - i * 0.12,
            peakAdoption: { 'steam.pump': 0.9, 'steam.mills': 0.7, 'steam.rail': 0.4 + i * 0.05 }, stage: Math.min(3, i + 1), steady: i >= 3, settled: i >= 3 },
          ...(i >= 1 ? { light: { etaFold: 3 + i, peakRFold: 2.5, resourceUsed: 8e4, unburnt: 0.5, decades: Math.max(0, i - 2), peakPressure: 0.4, stage: 1 } } : {}),
        },
        hindsightTerms: { wellbeingYears: 600 + i * 200, intensity: 2.4 - i * 0.3, wellbeing: 8 + i * 3, budget: i * 6, unburnt: 2 + i, backfire: i === 0 ? 10 : 0, sectorsReached: i >= 1 ? 10 : 0, steady: i >= 3 ? 150 : 0, settled: 0, total: 22 + i * 19 },
        index: i + 1, totalSecondsAtEnd: 1500 * (i + 1) + 300 * i * i, charter: i >= 1 ? c.charters?.[i % (c.charters?.length || 1)]?.id : undefined,
        decisions: 140 - i * 10, automated: i >= 1 ? 30 + i * 25 : 0, decisionsByDecade: [], automatedByDecade: [], commonsLevels: i >= 2 ? i : 0, peakPopulation: 3 + i,
      });
    }
    return out;
  };

  const api: ModelApi = {
    createState(c, meta, seed) {
      const sectors: Record<SectorId, SectorState> = {};
      for (const id of order(c)) {
        const def = c.sectors[id];
        const apps: SectorState['apps'] = {};
        for (const a of def.applications) apps[a.id] = newApp(false, false);
        sectors[id] = {
          open: false, openFor: 0, eta: def.baseEta, etaAtBase: 0, reserve: def.reserve, reserveMax: def.reserve, pressure: 0, crisesFired: 0, apps,
          baseR: 0, baseD: 0, basePs: 0, smoothR: 0, trendR: 0, peakR: 0, steadyYears: 0, backfired: false, budget: null, serviceDelivered: 0, decadesWithin: [],
          decadesLean: [], windowLean: false, clearYears: 0, settled: null, settledBefore: false, dividends: [], peakPressure: 0, seamsSunk: 0,
        };
      }
      const m = meta ? clone(meta) : freshMeta(c);
      const s: GameState = {
        version: 4, seed: seed ?? 1, time: 0, capital: c.global.startCapital, mandate: 0, population: 1, peakPopulation: 1, upgrades: {}, levers: {}, sectors,
        flags: { revealed: false, won: false }, steadyYearsAll: 0, news: [], history: [],
        run: {
          peakWellbeing: 0, decoupledYears: 0, resourceUsed: {}, clicks: 0, steadySectors: {}, wellbeingYears: 0, yearsAtTarget: 0, budgetDecades: 0, firstBackfires: {},
          leanDecades: 0, decisions: 0, decisionsByDecade: [], automated: 0, automatedByDecade: [], opening: [], firstBudgetAt: null,
          dispatchesAnswered: 0, dispatchesDefaulted: 0,
        },
        meta: m,
        pendingDividends: [], commons: { levels: {}, fund: 0 }, events: [], lastOffline: null, charterOffer: [],
        dispatch: freshDispatch(), modifiers: [], ambientLast: {}, orderLog: {}, historyLifted: false,
      };
      for (const l of c.levers) s.levers[l.id] = { level: 0, ref: 0 };
      s.capital *= mul(s, c, 'startCapitalMul');
      s.flags.revealed = seatedReveal(s, c);
      for (const e of effects(s, c)) if (e.type === 'startLever' && s.levers[e.lever]) s.levers[e.lever].level = Math.max(s.levers[e.lever].level, e.level);
      for (const e of effects(s, c)) if (e.type === 'reserveAdd' && sectors[e.sector]) { sectors[e.sector].reserve += e.value * c.sectors[e.sector].reserve; sectors[e.sector].reserveMax += e.value * c.sectors[e.sector].reserve; }
      openSector(s, c, order(c)[0], true);
      if (!meta && opts.rich) {
        ordersPaused = true;
        s.capital = 2e5; s.upgrades = { 'steam.boilers': 1, 'steam.condenser': 1 };
        s.sectors.steam.apps['steam.mills'] = newApp(true, true);
        s.meta = { ...s.meta, hindsight: 420, hindsightEarned: 470, reckonings: 1, knowhow: { 'kh.cornish': 1, 'kh.seed': 1 }, knowhowPeak: { 'kh.cornish': 1, 'kh.seed': 1 },
          institutions: { 'in.stats': 1, 'in.duty': 1, 'in.museum': 1 },
          loadout: ['in.duty', 'in.museum'], achievements: { firstReckoning: true, backfire: true }, sectorsOpened: { steam: true, light: true }, runs: fakeRuns(c, 1) };
        if (opts.m2) {
          s.meta.reckonings = 4; s.meta.slots = 4; s.meta.runs = fakeRuns(c, 4); s.meta.charter = 'ch.coalfield';
          s.meta.institutions = { ...s.meta.institutions, 'in.civil': 1, 'in.treasury': 1 };
          s.meta.loadout = ['in.duty', 'in.museum', 'in.civil', 'in.treasury'];
          s.meta.orders = { market: { on: true, paybackMax: 120, sectors: { iron: false } }, civilService: { on: true, levers: { steam: ['steam.cap'] } }, treasury: { on: false, keepSeconds: 60, projects: ['cm.baths', 'cm.park'] }, dispatch: { on: false, cast: {} } };
        }
        if (opts.reveal) { s.upgrades['steam.coalQuestion'] = 1; s.flags.revealed = true; s.mandate = 420; }
        for (let i = 0; i < 300; i++) step(s, c, 1);
        s.sectors.steam.pressure = s.sectors.steam.pressure + c.sectors.steam.collapseAt * 0.45;
        const ids = order(c);
        const extra: SectorId[] = opts.all ? ids.slice(1) : opts.sector && opts.sector !== 'steam' ? ids.slice(1, ids.indexOf(opts.sector) + 1) : opts.light ? ['light'] : [];
        for (const id of extra) {
          if (!s.sectors[id]) continue;
          openSector(s, c, id, id !== 'light');
          for (const a of c.sectors[id].applications.slice(0, 2)) s.sectors[id].apps[a.id] = newApp(true, true);
          for (const u of c.upgrades) if (u.sector === id && u.kind === 'efficiency' && !u.requires) s.upgrades[u.id] = 1;
          baseline(s, c, id);
          for (const u of c.upgrades) if (u.sector === id && u.kind === 'efficiency' && !u.requires) s.upgrades[u.id] = 1;
        }
        if (opts.budget) {
          const w = wellbeing(s, c);
          drawLine(s, c, 'steam', calc(s, c, 'steam').R * 1.15, opts.m2 ? 'firm' : undefined, w);
          s.sectors.steam.budget!.since = s.time - 60; s.sectors.steam.budget!.drawnYear -= 3;
          s.levers['steam.cap'] = { level: 1, ref: 0 };
          s.sectors.steam.steadyYears = 27; s.sectors.steam.decadesWithin = [1803, 1813]; s.sectors.steam.decadesLean = [true, false]; s.run.budgetDecades = 2; s.run.leanDecades = 1;
        }
        if (opts.m2) {
          // Commons, a settled Industry, Steady State earned in Steam (so Settle is offered), dividends waiting.
          s.commons = { levels: { 'cm.baths': 1 }, fund: 1400 };
          if (s.sectors.light.open) {
            const w = wellbeing(s, c);
            drawLine(s, c, 'light', calc(s, c, 'light').R, 'gentle', w);
            s.sectors.light.clearYears = STEADY_STATE_YEARS;
            const k = calc(s, c, 'light');
            const appD: Record<string, number> = {}, appAd: Record<string, number> = {};
            for (const a of c.sectors.light.applications) if (s.sectors.light.apps[a.id].founded) { appD[a.id] = k.apps[a.id].d; appAd[a.id] = k.apps[a.id].ad; }
            s.sectors.light.settled = { since: s.time - 120, sinceYear: Math.floor(yearOf(s, c, 120)), D: k.D, R: k.R, ps: k.ps, pPre: k.pre, income: k.income, P: s.sectors.light.pressure,
              eta: k.eta, defect: 1, N0: s.population / 1.18, spillMul0: 1, extraD0: 0, appD, appAdoption: appAd };
            s.sectors.light.settledBefore = true;
            for (const l of c.levers) if (l.sector === 'light') s.levers[l.id] = { level: 0, ref: 0 };
          }
          s.sectors.steam.clearYears = STEADY_STATE_YEARS;
          s.sectors.steam.budget!.clearAt = s.time - 30;
          s.pendingDividends = [
            { sector: 'steam', decade: 1, options: ['dv.rates', 'dv.reading'], mul: 1.6 },
            { sector: 'steam', decade: 2, options: ['dv.mandate', 'dv.seams'], mul: 1.6 },
            { sector: 'iron', decade: 1, options: ['dv.rates', 'dv.reading'], mul: 1 },
          ];
          s.run.decisions = 96; s.run.automated = 41;
        }
        if (opts.m3) m3Fixture(s, c);
        for (let i = 0; i < 60; i++) step(s, c, 1);
        if (opts.m3 && opts.letter === 3) s.mandate = 0;
        if (opts.smog != null) for (const id of ids) if (s.sectors[id]?.open && !s.sectors[id].settled) s.sectors[id].pressure = c.sectors[id].collapseAt * opts.smog;
        if (opts.late) {
          // A depleting Steam late in a run: reserve nearly gone and an efficiency fold far past its shadow.
          s.sectors.steam.reserve = s.sectors.steam.reserveMax * 0.03;
          for (const u of c.upgrades) if (u.sector === 'steam' && u.kind === 'efficiency' && !u.excludes) s.upgrades[u.id] = 1;
          s.population *= 3;
        }
        const lr = s.meta.runs[s.meta.runs.length - 1];
        s.meta.lastRun = lr ?? {
          cause: 'exhausted', causeSector: 'steam', seconds: 2100, yearReached: 1885, hindsightGained: 42, peakWellbeing: 36,
          sectors: { steam: { etaFold: 12, peakRFold: 2.1, resourceUsed: 5.2e5, unburnt: 0.04, decades: 1 }, light: { etaFold: 3, peakRFold: 4.4, resourceUsed: 8e4, unburnt: 0.61, decades: 0 } },
          hindsightTerms: { wellbeingYears: 820, intensity: 2.4, wellbeing: 10.6, budget: 6, unburnt: 3.1, backfire: 10, sectorsReached: 10, steady: 0, settled: 0, total: 40 },
        };
        ordersPaused = false;
        if (opts.away) {
          const held = opts.away === 'held';
          s.lastOffline = {
            requested: held ? 6 * 3600 + 1200 : 2 * 3600 + 300, simulated: held ? 3 * 3600 + 840 : 2 * 3600 + 300, heldBy: held ? 'crisis' : null, heldSector: held ? 'steam' : undefined,
            from: s.time - (held ? 13440 : 7500), to: s.time, capital: 1.84e6, mandate: 610, population: 0.42, decades: 3, dividends: 2, crises: 0,
            marketBuys: 7, civilServiceRaises: 2, treasuryBuys: held ? 1 : 0, lapsed: held ? [] : ['steam.duty'], opened: held ? [] : ['iron'], unsettled: [],
            lines: held ? { steam: 'held', light: 'settled' } : { steam: 'broken', light: 'settled', iron: 'drawn' }, fromSeq: s.meta.eventSeq, toSeq: s.meta.eventSeq,
          };
          if (held) s.sectors.steam.pressure = c.sectors.steam.collapseAt * 0.64;
        }
      } else if (!meta && opts.reveal) { s.flags.revealed = true; }
      if (opts.fresh && !meta) {
        // Between runs: the state reckon() would hand back (fresh, a Charter offer, Know-how to unlearn).
        const r = api.reckon({ ...s, ...({ _forcePending: false } as object) } as GameState, c);
        r.meta.hindsight += 200;
        return r;
      }
      if (opts.pending && !meta) (s as unknown as { _forcePending: boolean })._forcePending = true;
      if (opts.won && !meta) (s as unknown as { _winAt: number })._winAt = s.time + 3;
      return s;
    },
    tick(s0, c, dt) {
      if (pending(s0, c)) return s0;
      const s = clone(s0);
      step(s, c, Math.max(0, Math.min(MAX_TICK_SECONDS, dt)));
      const w = s as unknown as { _winAt?: number };
      if (w._winAt && s.time >= w._winAt) {
        s.flags.won = true; delete w._winAt; emit(s, c, 'won');
        if (!s.meta.endings.steadyAll) {
          const rec = { run: s.meta.reckonings + 1, runSeconds: s.time, totalSeconds: s.meta.totalSeconds + s.time, year: Math.floor(yearOf(s, c)) };
          s.meta.endings.steadyAll = rec; s.meta.milestones.won = { run: rec.run, at: rec.totalSeconds, year: rec.year };
          news(s, c, 'steadyAll'); emit(s, c, 'ending', { id: 'steadyAll' });
        }
      }
      return s;
    },
    fastForward(s0, c, seconds) {
      const want = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
      if (want <= 0) return s0;
      const s = clone(s0);
      const cap = c.global.offline?.capSeconds ?? c.global.offlineCapSeconds ?? 14400;
      const total = Math.min(want, cap);
      const hold = c.global.offline?.holdBefore ?? 'collapse';
      const start = clone(s0);
      let heldBy: OfflineReport['heldBy'] = pending(s, c) ? 'pending' : null, heldSector: SectorId | undefined;
      let cur = s, t = 0;
      if (!heldBy) {
        for (; t < total; t += 5) {
          const nx = clone(cur);
          step(nx, c, Math.min(5, total - t), false);
          const crisis = order(c).find((id) => nx.sectors[id].crisesFired > cur.sectors[id].crisesFired);
          const p = pending(nx, c);
          if ((hold === 'crisis' && crisis) || (hold && p)) { heldBy = p ? (p.cause === 'collapse' ? 'collapse' : 'exhausted') : 'crisis'; heldSector = p?.sector ?? crisis; break; }
          cur = nx;
        }
        if (!heldBy && want > cap) heldBy = 'cap';
      }
      const ev = (cur.events || []).filter((e) => e.seq > (start.meta.eventSeq || 0));
      const lines: OfflineReport['lines'] = {};
      for (const id of order(c)) {
        const a = start.sectors[id], b = cur.sectors[id];
        if (!b.budget && !b.settled) continue;
        lines[id] = b.settled ? 'settled' : !a.budget ? 'drawn' : ev.some((e) => e.kind === 'budgetBroken' && e.sector === id) || b.steadyYears < a.steadyYears ? 'broken' : 'held';
      }
      cur.lastOffline = {
        requested: want, simulated: Math.min(t, total), heldBy, heldSector, from: start.time, to: cur.time,
        capital: cur.capital - start.capital, mandate: cur.mandate - start.mandate, population: cur.population - start.population,
        decades: ev.filter((e) => e.kind === 'decade').length, dividends: (cur.pendingDividends || []).length - (start.pendingDividends || []).length,
        crises: ev.filter((e) => e.kind === 'crisis').length,
        marketBuys: ev.filter((e) => e.by === 'market').length, civilServiceRaises: ev.filter((e) => e.by === 'civilService').length,
        treasuryBuys: ev.filter((e) => e.by === 'treasury').length, lapsed: [], opened: ev.filter((e) => e.kind === 'sectorOpened').map((e) => e.sector!),
        unsettled: [], lines, fromSeq: start.meta.eventSeq || 0, toSeq: cur.meta.eventSeq || 0,
      };
      return cur;
    },
    derive(s, c) {
      const sectors: Derived['sectors'] = {};
      let income = 0, levyM = 0;
      const w = wellbeing(s, c);
      const pend = pending(s, c);
      const tgt = c.global.wellbeingTarget;
      for (const id of order(c)) {
        const es = s.sectors[id], def = c.sectors[id];
        if (!es.open) continue;
        const k = calc(s, c, id);
        const settled = !!es.settled;
        const etaFold = k.eta / (es.etaAtBase || k.eta || 1), baseR = es.baseR || k.R || 1;
        const shadowR = settled ? k.R : calc(s, c, id, es.etaAtBase || k.eta).R;
        const promisedR = settled ? k.R : shadowR / etaFold;
        let rebound = !settled && etaFold > 1.001 && shadowR > 0 && shadowR - promisedR > 1e-9 * shadowR ? (k.R - promisedR) / (shadowR - promisedR) : null;
        if (opts.late && id === 'steam' && rebound != null) rebound = Math.max(rebound, 13.7);
        const apps: SectorDerived['apps'] = {};
        for (const a of def.applications) {
          const st = es.apps[a.id];
          apps[a.id] = { available: st.available, founded: st.founded, demand: k.apps[a.id].d, adoption: k.apps[a.id].ad, canFound: !settled && st.available && !st.founded && s.capital >= a.foundCost && !pend,
            priceSeen: a.priceSeen ? a.priceSeen.share * k.ps + (a.priceSeen.flat ?? 0) : k.ps, foundCost: a.foundCost, forbidden: false };
        }
        const bR = settled ? null : budgetR(s, c, id);
        const within = bR != null && k.R <= bR * (1 + BUDGET_TOLERANCE);
        const clear = isClear(s, c, id, k);
        const dW = decadeW(s, c, id);
        const capOn = !!activeLever(s, c, id, 'cap');
        const sinkHeld = !settled && within && w >= tgt && clear && !pend;
        sectors[id] = {
          eta: k.eta, etaFold, resourcePrice: k.prBase + k.permit, resourcePriceBase: k.prBase, permitPrice: k.permit, capCost: k.cap, margin: k.margin,
          substitutedShare: k.sigma, preLevyPrice: k.pre, permitPart: k.permitPart, dutyPart: k.dutyPart, servicePrice: k.ps, demand: k.D, resourceUse: k.R,
          rFold: k.R / baseR, shadowR, promisedR, rebound, frontierFold: shadowR / baseR, income: k.income, levyRevenue: k.levy,
          reserveFraction: def.resourceKind === 'flow' ? 0.4 : es.reserveMax > 0 ? es.reserve / es.reserveMax : 1,
          secondsLeft: def.resourceKind === 'stock' && k.R > 0 && !settled ? es.reserve / k.R : Infinity,
          pressureFraction: es.pressure / def.collapseAt, nextCrisisFraction: def.crisisAt[es.crisesFired] ?? null, trendR: es.trendR,
          budgetR: bR, withinBudget: within, decoupling: settled ? w >= tgt : within && w >= dW && !pend, steadyYears: es.steadyYears,
          budgetDecades: es.decadesWithin.length, wellbeingShare: 0, apps,
          decadeWellbeing: dW, leanDecades: es.decadesLean.filter(Boolean).length, pace: es.budget ? paceOf(c, id, es.budget.pace).id : null,
          clearP: clearP(s, c, id), clear, sinkR: sinkROf(s, c, id, k), clearYears: es.clearYears, sinkHeld, settled,
          canSettle: !settled && !!def.settle && s.flags.revealed && !pend && es.clearYears >= STEADY_STATE_YEARS && !!es.budget,
          settleExcess: settleExcess(s, id), settleDefence: settleDefenceOf(s, c, id), stage: stageOf(s, c, id),
          standingDrawIn: capOn && !es.budget ? Math.max(0, (def.steady?.standingDrawYears ?? c.global.steady?.standingDrawYears ?? 0) - es.openFor * YEARS_PER_SECOND) : null,
          ...m3SectorViews(s, c, id, k),
        };
        income += k.income;
        const tre = ['duty', 'cap'].map((kind) => activeLever(s, c, id, kind)).find(Boolean);
        if (tre && (s.levers[tre.def.id].recycle ?? tre.def.recycle?.[0] ?? 'treasury') === 'treasury') levyM += k.levy * (c.global.levy?.mandateShare ?? 0.1);
      }
      const upkeep = leverUpkeep(s, c) + settleDefence(s, c);
      const t = terms(s, c);
      const used = (s.meta.loadout || []).reduce((n, id) => n + (c.institutions.find((x) => x.id === id)?.slots ?? 1), 0);
      const fresh = isFresh(s);
      const o = s.meta.orders ?? freshOrders(c);
      const openIds = order(c).filter((id) => s.sectors[id].open);
      const refundByTree: Record<string, number> = {};
      for (const k of c.knowhow) {
        const lv = s.meta.knowhow[k.id] || 0; if (!lv) continue;
        let r = 0; for (let l = 0; l < lv; l++) r += k.cost * Math.pow(k.costGrowth, l);
        const tr = k.tree ?? 'general'; refundByTree[tr] = (refundByTree[tr] ?? 0) + r * (c.global.respecRefund ?? 1);
      }
      const refund = Object.values(refundByTree).reduce((a, x) => a + x, 0);
      return {
        year: yearOf(s, c), age: ageOf(s, c), wellbeing: w, incomePerSec: income, clickValue: pend ? 0 : c.global.clickFlat + c.global.clickSeconds * income,
        mandatePerSec: s.flags.revealed || s.mandate > 0 ? Math.max(0, w - c.global.mandateFloor) * c.global.mandateRate * mul(s, c, 'mandateRateMul') + levyM - upkeep : 0,
        populationGrowthPerSec: popGrowth(s, c, w), pendingReckoning: pend, hindsightIfReckonNow: t.total, hindsightTerms: t, sectors,
        nextSectors: nextSectors(s, c), freshRun: fresh, slots: { total: s.meta.slots, used },
        populationRef: Math.max(1, s.peakPopulation, s.meta.peakPopulationEver || 1),
        offlineCapSeconds: (c.global.offline?.capSeconds ?? c.global.offlineCapSeconds ?? 14400) + effects(s, c).reduce((a, e) => a + (e.type === 'offlineCapAdd' ? e.seconds : 0), 0),
        charterOffer: fresh ? s.charterOffer || [] : [], charter: s.meta.charter ?? null,
        commons: { available: commonsOpen(s, c), fund: s.commons?.fund || 0, wellbeing: commonsWellbeing(s, c) },
        orders: {
          market: { available: marketAvailable(s, c), on: o.market.on, paybackMax: o.market.paybackMax, paybackChoices: c.global.orders?.paybackChoices ?? [30, 120, 600],
            sectors: Object.fromEntries(openIds.map((id) => [id, o.market.sectors[id] !== false])) },
          civilService: { available: orderUnlocked(s, c, 'civilService'), on: o.civilService.on, levers: o.civilService.levers },
          treasury: { available: orderUnlocked(s, c, 'treasury'), on: o.treasury.on, keepSeconds: o.treasury.keepSeconds, projects: o.treasury.projects },
          nextTickIn: (INTERVAL_YEARS / YEARS_PER_SECOND) - (s.time % (INTERVAL_YEARS / YEARS_PER_SECOND)),
          marketWhy: Object.fromEntries(openIds.map((id, i) => [id, marketAvailable(s, c) ? (o.market.on ? marketWhyOf(s, c, id, i) : { reason: 'off' }) : { reason: 'unavailable' }])) as Record<SectorId, MarketWhy>,
          dispatch: { available: featOn('dispatches') && s.meta.reckonings >= 4, on: o.dispatch?.on ?? false, cast: o.dispatch?.cast ?? {} },
          kind: { market: 'opening', civilService: 'closing', treasury: 'closing', dispatch: 'closing' },
        },
        respec: { allowed: fresh && refund > 0, refund, refundByTree },
        features: Object.fromEntries(FEATURE_IDS.map((f) => [f, M3_IDS.includes(f) ? featOn(f) : !opts.locked || (opts.feat ?? []).includes(f)])) as Record<FeatureId, boolean>,
        dispatch: featOn('dispatches') ? {
          pending: s.dispatch.pending.map((p): PendingDispatchView | null => {
            const d = (c.dispatches || []).find((x) => x.id === p.id); if (!d) return null;
            const castDef = (c.cast || []).find((x) => x.id === d.cast) ?? null;
            return { id: p.id, def: d, cast: castDef, headline: d.headline, body: d.body, expiresIn: Math.max(0, p.expiresAt - s.time), defaultArm: d.defaultArm ?? 0,
              arms: d.arms.map((a) => {
                const capital = Math.max(0, (a.cost?.capitalSeconds ?? 0) * income), mandate = a.cost?.mandate ?? 0;
                return { label: a.label, outcome: a.outcome, price: a.price, capital, mandate, affordable: !pend && s.capital >= capital && s.mandate >= mandate, effects: a.effects ?? [], modifier: a.modifier ?? null };
              }) };
          }).filter((x): x is PendingDispatchView => !!x),
          nextIn: s.dispatch.pending.length || pend || fresh ? null : Math.max(0, s.dispatch.nextAt - s.time),
        } : { pending: [], nextIn: null },
        modifiers: s.modifiers.map((m): ModifierView | null => {
          const a = (c.dispatches || []).find((x) => x.id === m.source)?.arms[m.arm];
          return a?.modifier ? { source: m.source, arm: m.arm, label: a.modifier.label ?? a.label, effects: a.modifier.effects, remaining: Math.max(0, m.until - s.time) } : null;
        }).filter((x): x is ModifierView => !!x).sort((a, b) => a.remaining - b.remaining),
        history: { id: s.meta.history, cleared: !!(s.meta.history && s.meta.histories[s.meta.history]?.cleared), lifted: s.historyLifted },
        survey: householdDerived(s, c),
        bank: { seconds: s.meta.bankedSeconds, max: 0, usable: false },
        ending: { reached: !!s.meta.endings.steadyAll, record: s.meta.endings.steadyAll ?? null, progress: Math.min(1, s.steadyYearsAll / (c.global.endingYears ?? STEADY_STATE_YEARS)), allOpen: openIds.length === order(c).length, settled: order(c).filter((x) => !!s.sectors[x]?.settled).length, total: order(c).length, years: s.steadyYearsAll, yearsNeeded: c.global.endingYears ?? STEADY_STATE_YEARS },
        archive: { unlocked: Object.keys(s.meta.archive).length, total: (c.archive || []).length },
      };
    },
    click(s0, c) {
      const d = api.derive(s0, c);
      if (d.pendingReckoning) return s0;
      const s = clone(s0);
      s.capital += d.clickValue; s.run.clicks++;
      return s;
    },
    buyUpgrade(s0, c, id) {
      const v = api.upgradeViews(s0, c).find((u) => u.def.id === id);
      if (!v || !v.visible || !v.affordable || v.maxed || v.excludedBy || pending(s0, c)) return s0;
      const s = clone(s0);
      applyUpgrade(s, c, v.def, v.cost, 'player'); decide(s);
      return s;
    },
    foundApp(s0, c, appId) {
      for (const id of order(c)) {
        const a = c.sectors[id].applications.find((x) => x.id === appId);
        const st = a && s0.sectors[id].apps[appId];
        if (a && st && st.available && !st.founded && s0.capital >= a.foundCost && !s0.sectors[id].settled) {
          const s = clone(s0); s.capital -= a.foundCost; s.sectors[id].apps[appId].founded = true; news(s, c, 'appFounded', { app: a.name }, id);
          if (s.run.opening.length < OPENING_MAX) s.run.opening = [...s.run.opening, { t: s.time, kind: 'found', id: appId, by: 'player' }];
          emit(s, c, 'appFounded', { sector: id, id: appId, by: 'player' }); decide(s);
          return s;
        }
      }
      return s0;
    },
    setLever(s0, c, id, level) {
      const def = c.levers.find((l) => l.id === id), cur = s0.levers[id]?.level ?? 0;
      if (!def || level < 0 || level > leverMax(def) || level === cur || s0.sectors[def.sector]?.settled) return s0;
      const s = clone(s0);
      if (level > cur) {
        if (level !== cur + 1) return s0;
        const cost = leverLevel(def, level)!.mandateCost;
        if (s.mandate < cost) return s0;
        s.mandate -= cost;
        if (cur === 0) s.levers[id] = { ...s.levers[id], level, ref: calc(s, c, def.sector).ps };
        const es = s.sectors[def.sector];
        if (!es.budget) {
          drawLine(s, c, def.sector, calc(s0, c, def.sector).R, undefined, wellbeing(s0, c));
          news(s, c, 'budgetDrawn', {}, def.sector); emit(s, c, 'budgetDrawn', { sector: def.sector, id: es.budget!.pace, by: 'player' });
          if (s.run.firstBudgetAt == null) s.run.firstBudgetAt = s.time;
        }
        news(s, c, 'leverEnacted', {}, def.sector);
        emit(s, c, 'leverEnacted', { sector: def.sector, id, n: level, by: 'player' });
      }
      s.levers[id] = { ...(s.levers[id] || { ref: 0 }), level };
      decide(s);
      return s;
    },
    setLeverRecycle(s0, c, id, option) {
      const def = c.levers.find((l) => l.id === id);
      if (!def || !(def.kind === 'duty' || def.kind === 'cap') || !(def.recycle ?? ['treasury']).includes(option)) return s0;
      if (option === 'commons' && !commonsOpen(s0, c)) return s0;
      if ((s0.levers[id]?.recycle ?? def.recycle?.[0] ?? 'treasury') === option) return s0;
      const s = clone(s0); s.levers[id] = { ...s.levers[id], recycle: option }; decide(s); return s;
    },
    drawBudget(s0, c, sector, pace) {
      if (!s0.flags.revealed || !s0.sectors[sector]?.open || pending(s0, c) || s0.sectors[sector].settled) return s0;
      if (pace != null && !paces(c, sector).some((p) => p.id === pace)) return s0;
      const R = calc(s0, c, sector).R; if (!(R > 0)) return s0;
      const s = clone(s0);
      drawLine(s, c, sector, R, pace, wellbeing(s0, c));
      s.sectors[sector].clearYears = 0;
      news(s, c, 'budgetDrawn', {}, sector); emit(s, c, 'budgetDrawn', { sector, id: s.sectors[sector].budget!.pace, by: 'player' });
      if (s.run.firstBudgetAt == null) s.run.firstBudgetAt = s.time;
      decide(s);
      return s;
    },
    chooseDecadeDividend(s0, c, sector, option) {
      if (pending(s0, c)) return s0;
      const s = clone(s0);
      if (!resolveDividend(s, c, sector, option, 'player')) return s0;
      decide(s);
      return s;
    },
    settle(s0, c, sector) {
      const d = api.derive(s0, c).sectors[sector];
      if (!d?.canSettle) return s0;
      const s = clone(s0), es = s.sectors[sector], k = calc(s, c, sector);
      const appD: Record<string, number> = {}, appAd: Record<string, number> = {};
      for (const a of c.sectors[sector].applications) if (es.apps[a.id].founded) { appD[a.id] = k.apps[a.id].d; appAd[a.id] = k.apps[a.id].ad; }
      es.settled = { since: s.time, sinceYear: Math.floor(yearOf(s, c)), D: k.D, R: k.R, ps: k.ps, pPre: k.pre, income: k.income, P: es.pressure, eta: k.eta, defect: 1,
        N0: s.population, spillMul0: 1, extraD0: commonsExtra(s, c, sector), appD, appAdoption: appAd };
      for (const l of c.levers) if (l.sector === sector) s.levers[l.id] = { ...s.levers[l.id], level: 0, ref: 0 };
      if (!es.settledBefore) for (const e of c.sectors[sector].settle?.dividend ?? []) if (e.type === 'mandateAdd') s.mandate += e.value;
      es.settledBefore = true;
      news(s, c, 'settled', {}, sector); emit(s, c, 'settled', { sector, by: 'player' }); decide(s);
      return s;
    },
    unsettle(s0, c, sector) {
      if (!s0.sectors[sector]?.settled || pending(s0, c)) return s0;
      const s = clone(s0), es = s.sectors[sector];
      es.settled = null; es.steadyYears = 0; es.clearYears = 0; es.windowLean = false;
      news(s, c, 'unsettled', {}, sector); emit(s, c, 'unsettled', { sector, by: 'player' }); decide(s);
      return s;
    },
    buyCommons(s0, c, id) {
      const v = commonsViewsOf(s0, c).find((x) => x.def.id === id);
      if (!v || !v.canBuy) return s0;
      const s = clone(s0); buildCommons(s, c, v, 'player'); decide(s); return s;
    },
    setOrders(s0, c, patch) {
      const o = s0.meta.orders ?? freshOrders(c);
      const n: OrdersState = {
        market: { ...o.market, ...(patch.market ?? {}), sectors: { ...o.market.sectors, ...(patch.market?.sectors ?? {}) } },
        civilService: { ...o.civilService, ...(patch.civilService ?? {}), levers: { ...o.civilService.levers, ...(patch.civilService?.levers ?? {}) } },
        treasury: { ...o.treasury, ...(patch.treasury ?? {}) },
        dispatch: { on: patch.dispatch?.on ?? o.dispatch?.on ?? false, cast: { ...(o.dispatch?.cast ?? {}), ...(patch.dispatch?.cast ?? {}) } },
      };
      n.market.paybackMax = Math.min(86400, Math.max(1, n.market.paybackMax));
      n.treasury.keepSeconds = Math.min(86400, Math.max(0, n.treasury.keepSeconds));
      if (JSON.stringify(n) === JSON.stringify(o)) return s0;
      const s = clone(s0); s.meta.orders = n;
      if (!isFresh(s0)) decide(s);
      return s;
    },
    reckon(s0, c) {
      const p = pending(s0, c);
      const t = terms(s0, c);
      const meta = clone(s0.meta);
      meta.hindsight += t.total; meta.hindsightEarned += t.total; meta.reckonings++; meta.achievements.firstReckoning = true; meta.totalSeconds += s0.time;
      const sectors: RunSummary['sectors'] = {};
      for (const id of order(c)) if (s0.sectors[id].open) {
        const es = s0.sectors[id];
        const peakAdoption: Record<string, number> = {};
        for (const a of c.sectors[id].applications) if (es.apps[a.id].founded) peakAdoption[a.id] = es.apps[a.id].peakAdoption;
        sectors[id] = {
          etaFold: etaOf(s0, c, id) / (es.etaAtBase || 1), peakRFold: es.peakR / (es.baseR || 1), resourceUsed: s0.run.resourceUsed[id] || 0,
          unburnt: c.sectors[id].resourceKind === 'stock' ? es.reserve / Math.max(1, es.reserveMax) : undefined, decades: es.decadesWithin.length,
          leanDecades: es.decadesLean.filter(Boolean).length, peakPressure: es.peakPressure / c.sectors[id].collapseAt, peakAdoption,
          stage: stageOf(s0, c, id) ?? 0, steady: !!s0.run.steadySectors[id], settled: !!es.settled,
        };
      }
      const summary: RunSummary = {
        cause: p?.cause ?? 'chosen', causeSector: p?.sector, seconds: s0.time, yearReached: Math.floor(yearOf(s0, c)), hindsightGained: t.total,
        peakWellbeing: s0.run.peakWellbeing, sectors, hindsightTerms: t, index: meta.reckonings, totalSecondsAtEnd: meta.totalSeconds,
        charter: s0.meta.charter ?? undefined, decisions: s0.run.decisions, automated: s0.run.automated, decisionsByDecade: s0.run.decisionsByDecade,
        automatedByDecade: s0.run.automatedByDecade, commonsLevels: Object.values(s0.commons.levels).reduce((a, x) => a + x, 0), peakPopulation: s0.peakPopulation,
      };
      meta.runs = [...(meta.runs || []), summary].slice(-RUN_HISTORY_MAX);
      meta.lastRun = summary;
      meta.charter = null;
      const s = api.createState(c, meta, s0.seed + 1);
      s.charterOffer = drawOffer(s, c, summary.charter);
      s.events = [];
      news(s, c, 'reckoning');
      emit(s, c, 'reckoning', { id: summary.cause, sector: summary.causeSector });
      return s;
    },
    buyKnowhow(s0, c, id) {
      const v = api.knowhowViews(s0, c).find((x) => x.def.id === id);
      if (!v || !v.canBuy || v.cost == null) return s0;
      const meta = clone(s0.meta); meta.hindsight -= v.cost; meta.knowhow[id] = v.level + 1;
      if (v.level + 1 > (meta.knowhowPeak[id] || 0)) { for (const e of v.def.effects) if (e.type === 'slotAdd') meta.slots += e.value; meta.knowhowPeak[id] = v.level + 1; }
      return rebuild(s0, c, meta);
    },
    buyInstitution(s0, c, id) {
      const v = api.institutionViews(s0, c).find((x) => x.def.id === id);
      if (!v || !v.canBuy || v.nextCost == null) return s0;
      const meta = clone(s0.meta); meta.hindsight -= v.nextCost; meta.institutions[id] = v.level + 1;
      return rebuild(s0, c, meta);
    },
    setLoadout(s0, c, ids) {
      if (!isFresh(s0) || new Set(ids).size !== ids.length || ids.some((id) => !(s0.meta.institutions[id] >= 1))) return s0;
      const used = ids.reduce((n, id) => n + (c.institutions.find((x) => x.id === id)?.slots ?? 1), 0);
      if (used > s0.meta.slots) return s0;
      const meta = clone(s0.meta); meta.loadout = [...ids];
      return rebuild(s0, c, meta);
    },
    chooseCharter(s0, c, id) {
      if (!isFresh(s0) || (id != null && !(s0.charterOffer || []).includes(id)) || (s0.meta.charter ?? null) === id) return s0;
      const meta = clone(s0.meta); meta.charter = id;
      const s = rebuild(s0, c, meta);
      const ch = (c.charters || []).find((x) => x.id === id);
      if (ch) { news(s, c, 'charter', { name: ch.name }, ch.sector); emit(s, c, 'charterChosen', { id: ch.id }); }
      return s;
    },
    respecKnowhow(s0, c, tree) {
      const d = api.derive(s0, c);
      if (!d.freshRun) return s0;
      const meta = clone(s0.meta);
      let refund = 0;
      for (const k of c.knowhow) {
        if (tree != null && (k.tree ?? 'general') !== tree) continue;
        const lv = meta.knowhow[k.id] || 0; if (!lv) continue;
        for (let l = 0; l < lv; l++) refund += k.cost * Math.pow(k.costGrowth, l) * (c.global.respecRefund ?? 1);
        delete meta.knowhow[k.id];
      }
      if (refund <= 0) return s0;
      meta.hindsight += refund;
      return rebuild(s0, c, meta);
    },
    upgradeViews(s, c) {
      const revealed = s.flags.revealed;
      return c.upgrades.map((u): UpgradeView => {
        const level = s.upgrades[u.id] || 0;
        const cost = u.cost * Math.pow(u.costGrowth || 1, level);
        const maxed = u.repeatable ? level >= (u.maxLevel ?? Infinity) : level >= 1;
        const visible = !!s.sectors[u.sector]?.open && !s.sectors[u.sector]?.settled && (u.requires || []).every((r) => s.upgrades[r]) && (!u.locked || unlocked(s, c, u.id));
        // Mock: the one `when` in its content (the Proprietor's Day card): a household return on file, no reveal yet.
        const whenOk = !u.when || (!!s.meta.returns?.household && !s.meta.flags.proprietor && featOn('survey'));
        const excl = c.upgrades.find((o) => (s.upgrades[o.id] || 0) >= 1 && o.id !== u.id && ((o.excludes || []).includes(u.id) || (u.excludes || []).includes(o.id)));
        const excludedBy = excl ? excl.id : null;
        let promised: number | null = null, decade: number | null = null;
        const reach: UpgradeView['bringsWithinReach'] = [];
        const etaM = u.effects.reduce((m, e) => (e.type === 'etaMul' ? m * e.value : m), 1);
        if (u.kind === 'efficiency') promised = 1 / etaM - 1;
        if ((u.kind === 'efficiency' || u.kind === 'capital') && revealed && visible && !maxed && !excludedBy && s.sectors[u.sector]?.open) {
          const before = calc(s, c, u.sector);
          const t = clone(s); t.upgrades[u.id] = level + 1; t.population *= 1.08;
          const after = calc(t, c, u.sector);
          decade = before.R > 0 ? after.R / before.R - 1 : null;
          for (const a of c.sectors[u.sector].applications) {
            const st = s.sectors[u.sector].apps[a.id];
            if (st.available || !Number.isFinite(a.visibleBelow)) continue;
            if (after.ps * 0.85 <= a.visibleBelow && before.ps * 0.85 > a.visibleBelow) {
              const tt = clone(t); tt.sectors[u.sector].apps[a.id] = newApp(true, true);
              const withApp = calc(tt, c, u.sector).R;
              reach.push({ appId: a.id, projectedChange: after.R > 0 ? withApp / after.R - 1 : 0 });
            }
          }
          reach.sort((x, y) => (c.sectors[u.sector].applications.find((a) => a.id === y.appId)?.visibleBelow ?? 0) - (c.sectors[u.sector].applications.find((a) => a.id === x.appId)?.visibleBelow ?? 0));
        }
        return {
          def: u, level, cost, visible: visible && whenOk, affordable: visible && whenOk && !maxed && !excludedBy && s.capital >= cost, maxed, excludedBy, promisedChange: promised,
          projectedDecade: decade, bringsWithinReach: decade == null ? [] : reach, forbidden: false,
        };
      });
    },
    leverViews(s, c) {
      const open = commonsOpen(s, c);
      return c.levers.map((l): LeverView => {
        const level = s.levers[l.id]?.level ?? 0;
        const max = leverMax(l);
        const next = level < max ? leverLevel(l, level + 1) : null;
        const free = effects(s, c).filter((e) => e.type === 'startLever' && e.lever === l.id).reduce((m, e) => Math.max(m, (e as { level: number }).level), 0);
        const cost = next ? (level + 1 <= free ? 0 : next.mandateCost) : null;
        const visible = (s.flags.revealed || free > 0) && !!s.sectors[l.sector]?.open && !s.sectors[l.sector]?.settled && (!l.locked || unlocked(s, c, l.id));
        const cur = leverLevel(l, level);
        const levy = l.kind === 'duty' || l.kind === 'cap';
        const options: LeverRecycle[] = levy ? (l.recycle ?? ['treasury']) : [];
        const txt = c.recycleText || {};
        return {
          def: l, level, maxLevel: max, current: cur, next, visible, nextCost: cost, canRaise: visible && cost != null && s.mandate >= cost,
          upkeep: cur && level > free ? cur.mandateUpkeep : 0,
          recycleOptions: options, recycle: levy ? (s.levers[l.id]?.recycle ?? l.recycle?.[0] ?? 'treasury') : null,
          recycleChoices: options.map((o) => ({
            option: o, name: txt[o]?.name ?? o.charAt(0).toUpperCase() + o.slice(1), blurb: l.recycleBlurb?.[o] ?? txt[o]?.blurb ?? '', available: o !== 'commons' || open,
          })),
          bite: l.sideEffects && featOn('sideEffects') ? {
            value: s.levers[l.id]?.bite ?? 0, growing: level >= 1 && !(l.sideEffects.unless && 'owns' in l.sideEffects.unless && ownsM3(s, l.sideEffects.unless.owns)),
            unlessMet: !!(l.sideEffects.unless && 'owns' in l.sideEffects.unless && ownsM3(s, l.sideEffects.unless.owns)), blurb: l.sideEffects.blurb, unlessLabel: l.sideEffects.unlessLabel ?? '',
          } : null,
          forbidden: false,
        };
      });
    },
    knowhowViews(s, c) {
      const fresh = isFresh(s);
      return c.knowhow.map((k): KnowhowView => {
        const level = s.meta.knowhow[k.id] || 0;
        const maxed = level >= k.maxLevel;
        const tier = k.tier ?? 1, tree = k.tree ?? 'general';
        const requirementsMet = tier <= 1 || c.knowhow.some((o) => (o.tree ?? 'general') === tree && (o.tier ?? 1) === tier - 1 && (s.meta.knowhow[o.id] || 0) >= 1);
        const ex = k.branch ? c.knowhow.find((o) => o.id !== k.id && o.branch === k.branch && (s.meta.knowhow[o.id] || 0) >= 1) : undefined;
        const cost = maxed ? null : k.cost * Math.pow(k.costGrowth, level);
        const affordable = cost != null && s.meta.hindsight >= cost;
        return { def: k, level, cost, requirementsMet, maxed, excludedBy: ex ? ex.id : null, affordable, canBuy: requirementsMet && !maxed && !ex && affordable && fresh };
      });
    },
    institutionViews(s, c) {
      const fresh = isFresh(s);
      const used = (s.meta.loadout || []).reduce((n, id) => n + (c.institutions.find((x) => x.id === id)?.slots ?? 1), 0);
      return c.institutions.map((d): InstitutionView => {
        const level = s.meta.institutions[d.id] || 0;
        const maxLevel = 1 + (d.nextLevels?.length ?? 0);
        const nextCost = level >= maxLevel ? null : level === 0 ? d.cost : d.nextLevels![level - 1].cost;
        const requirementsMet = (d.requires || []).every((r) => (s.meta.institutions[r] || 0) >= 1);
        const affordable = nextCost != null && s.meta.hindsight >= nextCost;
        const seated = (s.meta.loadout || []).includes(d.id);
        const slots = d.slots ?? 1;
        return {
          def: d, level, maxLevel, nextCost, requirementsMet, affordable, seated, slots,
          canBuy: requirementsMet && level < maxLevel && affordable && fresh, canSeat: level >= 1 && !seated && s.meta.slots - used >= slots && fresh,
        };
      });
    },
    commonsViews(s, c) { return commonsViewsOf(s, c); },
    yearAt(s, c, time) { return yearOf(s, c, s.time - Math.max(0, time)); },
    hindsightOnReckon(s, c) { return terms(s, c).total; },
    /* --- M3 --- */
    sinkSeam(s0, c, sector) {
      const v = api.derive(s0, c).sectors[sector]?.seams;
      const next = v?.ladder[v.sunk];
      if (!v || !next?.canSink) return s0;
      const s = clone(s0), es = s.sectors[sector];
      s.capital -= next.cost; es.reserve += next.def.tons; es.reserveMax += next.def.tons; es.seamsSunk = (es.seamsSunk ?? 0) + 1;
      news(s, c, 'seamSunk' as HeadlineKey, {}, sector); s.news[0] = { ...s.news[0], text: `${next.def.name} sunk at ${next.def.depth || 'depth'}; the pumps work day and night` };
      emit(s, c, 'seamSunk', { sector, id: next.def.id, n: es.seamsSunk, label: next.def.name, by: 'player' });
      if (!s.meta.milestones[`seam:${sector}`]) s.meta.milestones[`seam:${sector}`] = { run: s.meta.reckonings + 1, at: s.meta.totalSeconds + s.time, year: Math.floor(yearOf(s, c)) };
      decide(s);
      return s;
    },
    answerDispatch(s0, c, arm, id) {
      const d = api.derive(s0, c);
      const p = id ? d.dispatch.pending.find((x) => x.id === id) : d.dispatch.pending[0];
      if (!p || !p.arms[arm]?.affordable) return s0;
      const s = clone(s0);
      resolveDispatch(s, c, p.id, arm, 'player'); decide(s);
      return s;
    },
    chooseHistory(s0, c, id) {
      if (!isFresh(s0) || !featOn('histories') || (s0.meta.history ?? null) === id) return s0;
      if (id != null && !(c.histories || []).some((x) => x.id === id)) return s0;
      const meta = clone(s0.meta);
      if (meta.history) { const h0 = meta.histories[meta.history]; if (h0) h0.runs = Math.max(0, h0.runs - 1); }
      meta.history = id;
      if (id) { const h1 = meta.histories[id] ?? { runs: 0, cleared: false, best: null }; h1.runs++; meta.histories[id] = h1; }
      const s = rebuild(s0, c, meta);
      if (id) emit(s, c, 'historyChosen', { id });
      return s;
    },
    fileReturn(s0, c, ret: PlayReturn) {
      if (!featOn('survey') || !ret || ret.id !== 'household' || !ret.figures) return s0;
      const keys = ['activeMinutesBefore', 'activeMinutesAfter', 'sessionsBefore', 'sessionsAfter', 'looksBefore', 'looksAfter', 'decisionsBefore', 'decisionsAfter', 'automatedAfter', 'daysBefore', 'daysAfter', 'quietDays'];
      const f: Record<string, number> = {};
      for (const k of keys) { const v = ret.figures[k]; if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1e7) return s0; f[k] = Math.floor(v); }
      if (f.sessionsBefore > f.looksBefore || f.sessionsAfter > f.looksAfter || f.daysBefore > f.sessionsBefore || f.daysAfter > f.sessionsAfter) return s0;
      const old = s0.meta.returns.household;
      if (old && old.run === s0.meta.reckonings) return s0;
      const s = clone(s0);
      s.meta.returns.household = { figures: f, run: s.meta.reckonings, at: s.meta.totalSeconds, published: false, template: null } as FiledReturn;
      emit(s, c, 'returnFiled', { id: 'household' });
      if (s.meta.flags.proprietor) publishReturn(s, c);
      return s;
    },
    withdrawReturn(s0, c, id) {
      if (!s0.meta.returns?.[id]) return s0;
      const s = clone(s0);
      delete s.meta.returns[id];
      news(s, c, 'returnWithdrawn' as HeadlineKey); s.news[0] = { ...s.news[0], text: c.proprietor?.withdrawn ?? 'Survey discontinued' };
      emit(s, c, 'returnWithdrawn', { id });
      return s;
    },
    useBank(s0) { return s0; },
    historyViews(s, c) {
      const fresh = isFresh(s);
      return (c.histories || []).map((d): HistoryView => {
        const r = s.meta.histories[d.id];
        const offered = featOn('histories');
        const inForce = s.meta.history === d.id;
        return { def: d, offered, inForce, runs: r?.runs ?? 0, cleared: !!r?.cleared, best: r?.best ?? null, canChoose: offered && fresh && !inForce };
      });
    },
    archiveViews(s, c) {
      const nameOf = (id: string): string => {
        const u = c.upgrades.find((x) => x.id === id) ?? c.levers.find((x) => x.id === id);
        if (u) return u.name;
        if (c.sectors[id]) return c.sectors[id].name;
        for (const sd of Object.values(c.sectors)) { const a = sd.applications.find((x) => x.id === id) ?? sd.seams?.find((x) => x.id === id); if (a) return a.name; }
        const k = (c.commons || []).find((x) => x.id === id) ?? (c.cast || []).find((x) => x.id === id) ?? (c.histories || []).find((x) => x.id === id) ?? c.achievements.find((x) => x.id === id) ?? (c.knowhow || []).find((x) => x.id === id) ?? c.institutions.find((x) => x.id === id);
        if (k) return k.name;
        const tail = id.split('.').pop() ?? id;
        return tail.charAt(0).toUpperCase() + tail.slice(1).replace(/([A-Z])/g, ' $1').toLowerCase();
      };
      return (c.archive || []).map((a): ArchiveView => {
        const at = s.meta.archive[a.id];
        const un = at != null;
        return { id: a.id, subject: a.subject, subjectName: nameOf(a.subject), title: a.title, date: a.date ?? '', unlocked: un, at: un ? at : null, text: un ? a.text : '', sources: a.sources };
      });
    },
    retrospective(s, c) {
      const out: RetroItem[] = [];
      for (const [key, m] of Object.entries(s.meta.milestones).sort((a, b) => a[1].at - b[1].at)) {
        const t = (c.ending?.retrospective || []).find((r) => r.key === key || (r.key.endsWith(':*') && key.startsWith(r.key.slice(0, -1))));
        if (!t) continue;
        const sector = key.includes(':') ? key.split(':')[1] : undefined;
        const headline = t.headline.replace('{year}', m.run === 0 ? 'Earlier' : String(m.year)).replace('{run}', String(m.run)).replace('{hours}', (m.at / 3600).toFixed(1)).replace('{sector}', sector ? c.sectors[sector]?.name ?? sector : '');
        out.push({ key, run: m.run, year: m.year, at: m.at, sector, headline });
      }
      return out;
    },
    serialize(s) { return JSON.stringify(s, (_k, v) => (v === Infinity ? 1e308 : v)); },
    deserialize(text, c) {
      try {
        const s = JSON.parse(text) as GameState;
        if (!s || typeof s !== 'object' || !s.sectors || !s.meta || (s.version ?? 1) > 4) return null;
        void c; return s;
      } catch { return null; }
    },
  };
  viewsOf = (s, c) => api.upgradeViews(s, c);
  return api;
}
