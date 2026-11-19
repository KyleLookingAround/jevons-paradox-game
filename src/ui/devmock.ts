// Development stand-in for the real model + content (M1 contract). Used with #mock, when the real content is not in
// the M1 shape, and by the mock-only entry (src/ui/mock-main.ts). Crude, but it follows the contract's formulas
// closely enough that every UI element moves plausibly. It deliberately exercises what the UI must not assume:
// six industries in three ages, two industries that can open next at once, an unknown theme and an unknown accent,
// fork pairs, a locked upgrade, levers that tighten past their authored levels, recycling, Know-how trees with
// branch forks, multi-level and two-seat Institutions, budgets and decades.
import type {
  Content, ModelApi, GameState, SectorId, SectorDef, SectorState, Derived, SectorDerived, UpgradeView, LeverView,
  MetaState, HeadlineKey, NewsItem, Cond, CondCheck, HindsightTerms, KnowhowView, InstitutionView, LeverLevelDef,
  LeverDef, EffectDef, ApplicationDef,
} from '../types';
import { START_YEAR, YEARS_PER_SECOND, STEADY_STATE_YEARS, BUDGET_TOLERANCE, MAX_TICK_SECONDS, CALENDAR_LATE_RATE } from '../types';

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
  service: { name: 'Motive power', unit: 'hp' }, resource: { name: 'Coal', unit: 'tons' }, pressure: { name: 'Smoke', crisisName: 'The Black Fog' },
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
  service: { name: 'Wrought iron', unit: 't' }, resource: { name: 'Coke', unit: 'tons' }, pressure: { name: 'Slag', crisisName: 'The Slag Heaps' },
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
  service: { name: 'Lumens', unit: 'klm' }, resource: { name: 'Town gas', unit: 'therms' }, pressure: { name: 'Soot', crisisName: 'The Black Fog' },
  basePrice: 2, capCost: 0.1, reserve: 900000, spill: { to: 'steam', rate: 0.4 },
  unlock: { minReckonings: 0, after: ['steam'], when: { all: [
    { owns: 'steam.double', label: 'Own the Double-acting engine' },
    { stat: 'appsFounded', sector: 'steam', op: '>=', value: 3, label: 'Three uses of motive power founded' },
  ] } },
  applications: [
    app('light.street', 'Street lamps', 'lamp', 3, 50, 1.6, Infinity, 0, 'The parish lights the lane.'),
    app('light.night', 'Night shifts', 'factory-night', 1.2, 400, 2, 1.8, 2000, 'The mill never sleeps now.'),
    app('light.homes', 'Homes', 'house', 0.6, 1500, 2.2, 1, 20000, 'A mantle in every parlour.'),
    app('light.signs', 'Shop signs', 'sign', 0.3, 3000, 2.4, 0.5, 2e5, 'OPEN, spelled in fire.'),
  ],
};
const motion: SectorDef = {
  ...base, id: 'motion', name: 'Motion', years: '1950–2000', firstYear: 1950, accent: 'chrome',
  tagline: 'Everywhere is twenty minutes away, give or take the traffic.',
  service: { name: 'Vehicle-miles', unit: 'vmi' }, resource: { name: 'Oil', unit: 'bbl' }, pressure: { name: 'Carbon', crisisName: 'The Long Summer' },
  basePrice: 3, capCost: 0.2, reserve: 2e6, spill: { to: 'light', rate: 0.3 },
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
  unlock: { minReckonings: 3, after: ['motion'], when: { all: [{ stat: 'serviceDelivered', sector: 'motion', op: '>=', value: 1e5, label: '100k vmi·years driven' }] } },
  applications: [
    app('compute.sheet', 'Spreadsheets', 'sheet', 6, 80, 1.6, Infinity, 0, 'What if the numbers moved themselves?'),
    app('compute.web', 'The web', 'globe', 3, 800, 2, 3, 1e5, 'Everything, linked to everything.'),
    app('compute.play', 'Streaming', 'play', 1, 3000, 2.2, 1.5, 1e6, 'Autoplay in 5, 4, 3…'),
    app('compute.brain', 'Model training', 'brain', 0.4, 9000, 2.4, 0.8, 1e7, 'Read everything; once more, with feeling.'),
  ],
};
const code: SectorDef = {
  ...base, id: 'code', name: 'Code', years: '2025–', firstYear: 2025, theme: 'agentic', accent: 'diff',
  tagline: 'Software is now cheaper to write than to read.',
  service: { name: 'Features', unit: 'features' }, resource: { name: 'Attention', unit: 'hrs' }, pressure: { name: 'Code stock', crisisName: 'The Great Outage' },
  basePrice: 4, capCost: 0.2, reserve: 3e6, resourceKind: 'flow', pressureSource: 'service', drawsOn: { sector: 'compute', perService: 2 },
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
    { id: 'steam.boilers', sector: 'steam', name: 'Better boilers', blurb: 'Rivets, mostly.', kind: 'efficiency', cost: 30, effects: E('steam', 1.5) },
    { id: 'steam.condenser', sector: 'steam', name: 'Separate condenser', blurb: 'Watt, 1769. Stop cooling the cylinder.', kind: 'efficiency', cost: 400, requires: ['steam.boilers'], effects: E('steam', 1.667) },
    { id: 'steam.bw', sector: 'steam', name: 'Boulton & Watt’s premium', blurb: 'A third of the coal saved, paid to Birmingham for ever.', kind: 'efficiency', cost: 900, requires: ['steam.boilers'], excludes: ['steam.pirate'],
      effects: [...E('steam', 1.6), { type: 'marginAdd', sector: 'steam', value: -0.03 }] },
    { id: 'steam.pirate', sector: 'steam', name: 'Pirate engines', blurb: 'Bull and Hornblower, cheaper and not quite legal.', kind: 'capital', cost: 700, requires: ['steam.boilers'], excludes: ['steam.bw'],
      effects: [{ type: 'capCostMul', sector: 'steam', value: 0.7 }, ...E('steam', 1.15)] },
    { id: 'steam.double', sector: 'steam', name: 'Double-acting engine', blurb: 'Push on the way back, too.', kind: 'efficiency', cost: 3000, requires: ['steam.condenser'], effects: E('steam', 1.4) },
    { id: 'steam.parl', sector: 'steam', name: 'Parliamentary trains', blurb: 'A penny a mile, by Act of 1844.', kind: 'capital', cost: 5000, requires: ['steam.double'], excludes: ['steam.first'],
      effects: [{ type: 'satMul', sector: 'steam', app: 'steam.rail', value: 1.5 }, { type: 'marginAdd', sector: 'steam', value: -0.02 }] },
    { id: 'steam.first', sector: 'steam', name: 'First-class lines', blurb: 'Plush seats, fewer of them.', kind: 'capital', cost: 5000, requires: ['steam.double'], excludes: ['steam.parl'],
      effects: [{ type: 'marginAdd', sector: 'steam', value: 0.04 }, { type: 'satMul', sector: 'steam', app: 'steam.rail', value: 0.8 }] },
    { id: 'steam.hp', sector: 'steam', name: 'High-pressure steam', blurb: 'Trevithick. Stand well back.', kind: 'efficiency', cost: 20000, requires: ['steam.double'], effects: E('steam', 1.4286) },
    { id: 'steam.turbine', sector: 'steam', name: 'Parsons turbine', blurb: 'Spin, don’t push.', kind: 'efficiency', cost: 60000, locked: true, effects: E('steam', 2) },
    { id: 'steam.coalQuestion', sector: 'steam', name: 'The Coal Question', blurb: 'W. S. Jevons, 1865. An inquiry concerning the progress of the nation.', kind: 'research', cost: 600, requires: ['steam.condenser'], effects: [{ type: 'reveal' }] },
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
    { id: 'steam.duty', sector: 'steam', kind: 'duty', name: 'Coal duty', blurb: 'A penny on the ton, rising.', catch: 'Your customers notice, and so does your income.', recycle: ['treasury', 'dividend'],
      levels: [L(60, 0.1, 0.3, 'Hold price at 30% of the fall'), L(180, 0.2, 0.6, 'Hold price at 60% of the fall'), L(540, 0.4, 0.9, 'Hold price at 90% of the fall')],
      repeat: { valueStep: 0.03, costGrowth: 1.6, upkeepGrowth: 1.3, label: 'Hold price at {pct}% of the fall' } },
    { id: 'steam.cap', sector: 'steam', kind: 'cap', name: 'Smoke abatement cap', blurb: 'So much and no more.', catch: 'Permits are dear, and smoke finds the gaps.', recycle: ['treasury', 'dividend'],
      levels: [L(100, 0.2, 1, 'Cap at the budget line'), L(300, 0.3, 0.9, 'Cap at 90% of the line'), L(900, 0.5, 0.8, 'Cap at 80% of the line')],
      repeat: { valueStep: -0.05, costGrowth: 1.5, upkeepGrowth: 1.25, label: 'Cap at {pct}% of the line' } },
    { id: 'iron.circ', sector: 'iron', kind: 'circularity', name: 'Scrap drives', blurb: 'Old railings into new rails.', catch: 'Scrap is dirtier than ore, and slower.',
      levels: [L(80, 0.1, 0.2, 'A fifth from scrap'), L(240, 0.2, 0.4, 'Two fifths from scrap')] },
    { id: 'light.sufficiency', sector: 'light', kind: 'sufficiency', name: 'Lights out by eleven', blurb: 'A civic habit.', catch: 'Fewer lamps lit, fewer shillings in the meter.',
      levels: [L(80, 0.1, 0.8, 'Aim for 80% of today', 0.01), L(240, 0.2, 0.6, 'Aim for 60% of today', 0.01)] },
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
    budgetBroken: ['The line is broken'],
  } as Record<HeadlineKey, string[]>,
  global: {
    startCapital: 10, clickSeconds: 1, clickFlat: 2, popGrowth: 0.0004, subsistence: 8, wellbeingTarget: 28, mandateRate: 0.03, mandateFloor: 12,
    crisisMandate: 150, crisisPopLoss: 0.08, offlineCapSeconds: 14400,
    hindsight: { perWellbeingYear: 0.02, intensityExponent: 0.5, perBudgetDecade: 6, perUnburnt: 30, perFirstBackfire: 10, perSectorReached: 10, perSteadySector: 150 },
    demography: { transitionWellbeing: 40 },
    steady: { budgetDeclinePerDecade: 0.05, decadeYears: 10, decadeEffects: [{ type: 'mandateAdd', value: 50 }], firstSteadyEffects: [{ type: 'slotAdd', value: 1 }] },
    levy: { mandateShare: 0.1 },
    startingSlots: 2,
  },
};

/* ---------------- crude sim ---------------- */
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x, (_k, v) => (v === Infinity ? 1e308 : v)));
const order = (c: Content): SectorId[] => c.sectorOrder.filter((id) => !!c.sectors[id]);
const decadeYears = (c: Content) => c.global.steady?.decadeYears ?? 10;

/** Standing effects in force: owned upgrades × level, know-how × level, seated institutions (each level once), unlocks. */
function effects(s: GameState, c: Content): EffectDef[] {
  const out: EffectDef[] = [];
  for (const u of c.upgrades) { const n = s.upgrades[u.id] || 0; for (let i = 0; i < n; i++) out.push(...u.effects); }
  for (const k of c.knowhow) { const n = s.meta.knowhow[k.id] || 0; for (let i = 0; i < n; i++) out.push(...k.effects); }
  for (const id of s.meta.loadout || []) {
    const d = c.institutions.find((x) => x.id === id); const n = s.meta.institutions[id] || 0;
    if (!d) continue;
    if (n >= 1) out.push(...d.effects);
    for (let i = 0; i < n - 1; i++) out.push(...(d.nextLevels?.[i]?.effects ?? []));
  }
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
  const d = c.sectors[id].steady?.declinePerDecade ?? c.global.steady?.budgetDeclinePerDecade ?? 0.05;
  return b.r0 * Math.pow(1 - d, ((s.time - b.since) * YEARS_PER_SECOND) / 10);
}
function etaOf(s: GameState, c: Content, id: SectorId): number {
  const def = c.sectors[id];
  return def.baseEta * mul(s, c, 'etaMul', id) * Math.exp(def.autoEtaRate * s.sectors[id].openFor);
}

interface Calc {
  eta: number; prBase: number; permit: number; cap: number; margin: number; sigma: number; pre: number; permitPart: number; dutyPart: number;
  ps: number; D: number; R: number; apps: Record<string, { d: number; ad: number }>; income: number; levy: number;
}
function calc(s: GameState, c: Content, id: SectorId, etaOverride?: number): Calc {
  const def = c.sectors[id], es = s.sectors[id];
  const eta = etaOverride ?? etaOf(s, c, id);
  const prBase = def.resourceKind === 'flow' ? def.basePrice * 1.2 : def.basePrice * Math.pow(es.reserveMax / Math.max(1, es.reserve), def.alpha);
  const cap = def.capCost * mul(s, c, 'capCostMul', id);
  const margin = Math.max(0, def.margin + add(s, c, 'marginAdd', id));
  const sub = activeLever(s, c, id, 'substitution'); const sigma = sub ? sub.lv.value : 0;
  const duty = activeLever(s, c, id, 'duty');
  const capL = activeLever(s, c, id, 'cap');
  const bR = budgetR(s, c, id);
  const solve = (permit: number) => {
    const pre = (1 - sigma) * (prBase / eta + cap) + sigma * 1.5 * cap;
    const permitPart = (1 - sigma) * permit / eta;
    const p = pre + permitPart;
    const dutyPart = duty && duty.ref > 0 ? duty.lv.value * Math.max(0, duty.ref - p) : 0;
    const ps = p + dutyPart;
    const apps: Record<string, { d: number; ad: number }> = {};
    let D = 0;
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
  return Math.max(0, w + add(s, c, 'wellbeingAdd'));
}
function popGrowth(s: GameState, c: Content, w: number): number {
  const g = c.global, m = mul(s, c, 'popGrowthMul');
  const x = w - g.subsistence;
  if (x < 0) return g.popGrowth * m * x * 0.25 * s.population;
  const wt = g.demography?.transitionWellbeing;
  const shape = wt && wt > g.subsistence ? Math.max(0, 1 - Math.pow(x / (wt - g.subsistence), 2)) : 1;
  return g.popGrowth * m * x * shape * s.population;
}
function yearOf(s: GameState, c: Content): number {
  let y = -Infinity;
  for (const age of c.ages) {
    const open = age.sectors.filter((id) => s.sectors[id]?.open);
    if (!open.length) continue;
    const T = Math.max(...open.map((id) => s.sectors[id].openFor));
    let ay = age.yearSpan[0] + T * YEARS_PER_SECOND;
    for (const id of open) ay = Math.max(ay, (c.sectors[id].firstYear ?? age.yearSpan[0]) + s.sectors[id].openFor * YEARS_PER_SECOND);
    if (ay > age.yearSpan[1]) ay = age.yearSpan[1] + (ay - age.yearSpan[1]) * CALENDAR_LATE_RATE;
    y = Math.max(y, ay);
  }
  return Number.isFinite(y) ? y : START_YEAR + s.time * YEARS_PER_SECOND;
}
function ageOf(s: GameState, c: Content): string | null {
  let a: string | null = null;
  for (const age of c.ages) if (age.sectors.some((id) => s.sectors[id]?.open)) a = age.id;
  return a;
}
function news(s: GameState, c: Content, key: HeadlineKey, vars: Record<string, string> = {}, sector?: SectorId) {
  const list = c.sectorHeadlines?.[sector ?? '']?.[key] ?? c.headlines[key] ?? ['News'];
  let text = list[Math.floor(s.time * 7 + s.news.length) % list.length];
  const all: Record<string, string> = { year: String(Math.floor(yearOf(s, c))), sector: sector ? c.sectors[sector]?.name ?? '' : '', resource: sector ? c.sectors[sector]?.resource.name.toLowerCase() ?? '' : '', n: '', ...vars };
  for (const k in all) text = text.split('{' + k + '}').join(all[k]);
  const item: NewsItem = { time: s.time, year: Math.floor(yearOf(s, c)), key, text, sector };
  s.news = [item, ...s.news].slice(0, 40);
}
function pending(s: GameState, c: Content): Derived['pendingReckoning'] {
  if ((s as unknown as { _forcePending?: boolean })._forcePending) return { cause: 'exhausted', sector: 'steam' };
  for (const id of order(c)) {
    const es = s.sectors[id], def = c.sectors[id];
    if (!es.open) continue;
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
  for (const a of c.sectors[id].applications) if (a.visibleBelow === Infinity) es.apps[a.id] = { available: true, founded: a.foundCost === 0, satMul: 1, peakD: 0 };
  baseline(s, c, id);
  s.meta.sectorsOpened[id] = true;
  s.steadyYearsAll = 0;
  if (quiet) return;
  news(s, c, 'sectorOpened', {}, id);
  if (!ageWasOpen && firstOfAge) news(s, c, 'ageBegins', { age: firstOfAge.name });
}
function baseline(s: GameState, c: Content, id: SectorId): void {
  const es = s.sectors[id];
  es.etaAtBase = etaOf(s, c, id);
  const k = calc(s, c, id); es.baseR = k.R || 1; es.baseD = k.D || 1; es.basePs = k.ps;
}

function step(s: GameState, c: Content, dt: number): void {
  s.time += dt;
  let income = 0, levyMandate = 0;
  const w0 = wellbeing(s, c);
  const share = c.global.levy?.mandateShare ?? 0.1;
  for (const id of order(c)) {
    const es = s.sectors[id], def = c.sectors[id];
    if (!es.open) continue;
    es.openFor += dt;
    const k = calc(s, c, id);
    es.eta = k.eta;
    for (const a of def.applications) {
      const st = es.apps[a.id];
      if (!st.available && k.ps <= a.visibleBelow) { st.available = true; if (a.foundCost === 0) st.founded = true; else news(s, c, 'appAvailable', { app: a.name, service: def.service.name.toLowerCase() }, id); }
      st.peakD = Math.max(st.peakD, k.apps[a.id].d);
      const suff = activeLever(s, c, id, 'sufficiency');
      const target = suff ? suff.lv.value : 1;
      st.satMul -= (st.satMul - target) * (1 - Math.exp(-(suff?.lv.value2 ?? 0.01) * dt));
      if (a.reserveGainPerService && def.resourceKind === 'stock') { const g = k.apps[a.id].d * a.reserveGainPerService * dt; es.reserve += g; es.reserveMax += g; }
    }
    if (def.resourceKind === 'stock') {
      const circ = activeLever(s, c, id, 'circularity');
      es.reserve = Math.max(0, es.reserve - k.R * (1 - (circ ? circ.lv.value : 0)) * dt);
    } else es.reserve = def.reserve;
    const src = def.pressureSource === 'service' ? k.D : k.R;
    es.pressure = Math.max(0, es.pressure + src * def.pressureIntensity * dt - es.pressure * (def.absorption + add(s, c, 'absorptionAdd', id)) * dt);
    while (es.crisesFired < def.crisisAt.length && es.pressure >= def.crisisAt[es.crisesFired] * def.collapseAt) {
      es.crisesFired++; s.mandate += c.global.crisisMandate; s.population *= 1 - c.global.crisisPopLoss; news(s, c, 'crisis', { n: String(es.crisesFired) }, id);
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
        es.backfired = true; news(s, c, 'backfire', {}, id);
        if (!s.meta.backfiredSectors[id]) { s.meta.backfiredSectors[id] = true; s.run.firstBackfires[id] = true; }
        s.meta.achievements.backfire = true;
      }
    }
    if (activeLever(s, c, id, 'cap') && !es.budget && k.R > 0) { es.budget = { r0: k.R, since: s.time, drawnYear: Math.floor(yearOf(s, c)) }; news(s, c, 'budgetDrawn', {}, id); }
    // Decoupling streak, decades, Steady State.
    const bR = budgetR(s, c, id);
    const decoupling = bR != null && k.R <= bR * (1 + BUDGET_TOLERANCE) && w0 >= c.global.wellbeingTarget;
    if (decoupling) {
      const before = es.steadyYears;
      es.steadyYears += dt * YEARS_PER_SECOND;
      const dy = decadeYears(c);
      if (Math.floor(es.steadyYears / dy) > Math.floor(before / dy)) {
        es.decadesWithin.push(Math.floor(yearOf(s, c))); s.run.budgetDecades++;
        for (const e of def.steady?.decadeEffects ?? c.global.steady?.decadeEffects ?? []) if (e.type === 'mandateAdd') s.mandate += e.value;
        news(s, c, 'decade', { n: String(es.decadesWithin.length) }, id);
      }
      if (before < STEADY_STATE_YEARS && es.steadyYears >= STEADY_STATE_YEARS) {
        s.run.steadySectors[id] = true; s.meta.steadySectors[id] = true; s.meta.achievements.steadyState = true; news(s, c, 'steadySector', {}, id);
      }
    } else if (es.steadyYears > 0) {
      if (es.steadyYears >= decadeYears(c)) news(s, c, 'budgetBroken', {}, id);
      es.steadyYears = 0;
    }
    s.run.resourceUsed[id] = (s.run.resourceUsed[id] || 0) + k.R * dt;
    income += k.income;
    const tre = ['duty', 'cap'].map((kind) => activeLever(s, c, id, kind)).find(Boolean);
    if (tre && (s.levers[tre.def.id].recycle ?? tre.def.recycle?.[0] ?? 'treasury') === 'treasury') levyMandate += k.levy * share;
  }
  // Unlocks.
  for (const n of nextSectors(s, c)) if (n.ready) openSector(s, c, n.id);
  s.capital += income * dt;
  const w = wellbeing(s, c);
  s.run.peakWellbeing = Math.max(s.run.peakWellbeing, w);
  s.run.wellbeingYears += Math.max(0, w - c.global.subsistence) * dt * YEARS_PER_SECOND;
  if (w >= c.global.wellbeingTarget) s.run.yearsAtTarget += dt * YEARS_PER_SECOND;
  let upkeep = 0;
  for (const l of c.levers) { const ls = s.levers[l.id]; const lv = ls ? leverLevel(l, ls.level) : null; if (lv) upkeep += lv.mandateUpkeep; }
  if (s.flags.revealed || s.mandate > 0) s.mandate = Math.max(0, s.mandate + (Math.max(0, w - c.global.mandateFloor) * c.global.mandateRate * mul(s, c, 'mandateRateMul') + levyMandate - upkeep) * dt);
  s.population = Math.max(0.01, s.population + popGrowth(s, c, w) * dt);
  s.peakPopulation = Math.max(s.peakPopulation, s.population);
  const lastT = s.history.length ? s.history[s.history.length - 1].time : -99;
  if (s.time - lastT >= 5) {
    const sectors: GameState['history'][number]['sectors'] = {};
    const budget: Record<SectorId, number> = {};
    for (const id of order(c)) if (s.sectors[id].open) {
      const k = calc(s, c, id), es = s.sectors[id];
      sectors[id] = [k.eta / (es.etaAtBase || 1), k.R / (es.baseR || 1)];
      const b = budgetR(s, c, id); if (b != null) budget[id] = b / (es.baseR || 1);
    }
    s.history.push({ time: s.time, sectors, budget, wellbeing: w });
    if (s.history.length > 240) s.history = s.history.filter((_, i) => i % 2 === 0 || i > 120);
  }
}

export interface MockOpts {
  reveal?: boolean; rich?: boolean; pending?: boolean; won?: boolean; light?: boolean; all?: boolean; budget?: boolean; persist?: boolean;
  smog?: number; sector?: SectorId;
}

/** `#mock` or `#mock:rich,reveal,all,budget,pending,won,persist,smog=0.8,sector=compute` (`era=` is accepted too). */
export function parseMockHash(hash: string): MockOpts | null {
  const m = /^#mock(?::(.*))?$/.exec(hash || '');
  if (!m) return null;
  const o: MockOpts = {};
  for (const part of (m[1] || '').split(',')) {
    const [k, v] = part.split('=');
    if (k === 'rich' || k === 'reveal' || k === 'pending' || k === 'won' || k === 'light' || k === 'all' || k === 'budget' || k === 'persist') o[k] = true;
    else if (k === 'smog') o.smog = Number(v) || 0;
    else if ((k === 'sector' || k === 'era') && mockContent.sectors[v]) o.sector = v;
  }
  if (o.all) { o.rich = true; o.reveal = true; }
  if (o.budget) { o.rich = true; o.reveal = true; }
  if (o.sector && o.sector !== 'steam') o.rich = true;
  return o;
}

export function makeMockModel(opts: MockOpts = {}): ModelApi {
  const freshMeta = (c: Content): MetaState => ({
    hindsight: 0, hindsightEarned: 0, reckonings: 0, knowhow: {}, institutions: {}, achievements: {}, steadySectors: {}, sectorsOpened: {},
    totalSeconds: 0, slots: c.global.startingSlots ?? 2, loadout: [], backfiredSectors: {},
  });
  const seatedReveal = (s: GameState, c: Content) => effects(s, c).some((e) => e.type === 'reveal');
  const terms = (s: GameState, c: Content): HindsightTerms => {
    const g = c.global.hindsight;
    let num = 0, den = 0, unb = 0, open = 0;
    for (const id of order(c)) {
      const es = s.sectors[id]; if (!es.open) continue;
      open++;
      if (es.baseR > 0 && es.openFor > 0) { num += (s.run.resourceUsed[id] || 0) / es.baseR; den += es.openFor; }
      if (c.sectors[id].resourceKind === 'stock') unb += es.reserve / Math.max(1, es.reserveMax);
    }
    const intensity = den > 0 ? num / den : 1;
    const t = {
      wellbeingYears: s.run.wellbeingYears, intensity,
      wellbeing: g.perWellbeingYear * s.run.wellbeingYears / Math.pow(Math.max(1, intensity), g.intensityExponent),
      budget: g.perBudgetDecade * s.run.budgetDecades,
      unburnt: g.perUnburnt * unb * Math.min(1, s.run.yearsAtTarget / STEADY_STATE_YEARS),
      backfire: g.perFirstBackfire * Object.keys(s.run.firstBackfires).length,
      sectorsReached: g.perSectorReached * Math.max(0, open - 1),
      steady: g.perSteadySector * Object.keys(s.run.steadySectors).length,
      total: 0,
    };
    t.total = Math.max(1, Math.round(t.wellbeing + t.budget + t.unburnt + t.backfire + t.sectorsReached + t.steady));
    return t;
  };
  const isFresh = (s: GameState) => s.time === 0 && Object.keys(s.upgrades).length === 0;
  const rebuild = (s0: GameState, c: Content, meta: MetaState): GameState => {
    const s = api.createState(c, meta, s0.seed);
    s.news = s0.news; s.mandate = s0.mandate; s.run.clicks = s0.run.clicks; s.capital = Math.max(s.capital, s0.capital);
    return s;
  };

  const api: ModelApi = {
    createState(c, meta, seed) {
      const sectors: Record<SectorId, SectorState> = {};
      for (const id of order(c)) {
        const def = c.sectors[id];
        const apps: SectorState['apps'] = {};
        for (const a of def.applications) apps[a.id] = { available: false, founded: false, satMul: 1, peakD: 0 };
        sectors[id] = {
          open: false, openFor: 0, eta: def.baseEta, etaAtBase: 0, reserve: def.reserve, reserveMax: def.reserve, pressure: 0, crisesFired: 0, apps,
          baseR: 0, baseD: 0, basePs: 0, smoothR: 0, trendR: 0, peakR: 0, steadyYears: 0, backfired: false, budget: null, serviceDelivered: 0, decadesWithin: [],
        };
      }
      const m = meta ? clone(meta) : freshMeta(c);
      const s: GameState = {
        version: 2, seed: seed ?? 1, time: 0, capital: c.global.startCapital, mandate: 0, population: 1, peakPopulation: 1, upgrades: {}, levers: {}, sectors,
        flags: { revealed: false, won: false }, steadyYearsAll: 0, news: [], history: [],
        run: { peakWellbeing: 0, decoupledYears: 0, resourceUsed: {}, clicks: 0, steadySectors: {}, wellbeingYears: 0, yearsAtTarget: 0, budgetDecades: 0, firstBackfires: {} },
        meta: m,
      };
      for (const l of c.levers) s.levers[l.id] = { level: 0, ref: 0 };
      s.capital *= mul(s, c, 'startCapitalMul');
      s.flags.revealed = seatedReveal(s, c);
      for (const e of effects(s, c)) if (e.type === 'startLever' && s.levers[e.lever]) s.levers[e.lever].level = Math.max(s.levers[e.lever].level, e.level);
      for (const e of effects(s, c)) if (e.type === 'reserveAdd' && sectors[e.sector]) { sectors[e.sector].reserve += e.value * c.sectors[e.sector].reserve; sectors[e.sector].reserveMax += e.value * c.sectors[e.sector].reserve; }
      openSector(s, c, order(c)[0], true);
      if (!meta && opts.rich) {
        s.capital = 2e5; s.upgrades = { 'steam.boilers': 1, 'steam.condenser': 1 };
        s.sectors.steam.apps['steam.mills'] = { available: true, founded: true, satMul: 1, peakD: 0 };
        s.meta = { ...s.meta, hindsight: 420, hindsightEarned: 470, reckonings: 1, knowhow: { 'kh.cornish': 1, 'kh.seed': 1 }, institutions: { 'in.stats': 1, 'in.duty': 1, 'in.museum': 1 },
          loadout: ['in.duty', 'in.museum'], achievements: { firstReckoning: true, backfire: true }, sectorsOpened: { steam: true, light: true } };
        if (opts.reveal) { s.upgrades['steam.coalQuestion'] = 1; s.flags.revealed = true; s.mandate = 420; }
        for (let i = 0; i < 300; i++) step(s, c, 1);
        s.sectors.steam.pressure = s.sectors.steam.pressure + c.sectors.steam.collapseAt * 0.45;
        const ids = order(c);
        const extra: SectorId[] = opts.all ? ids.slice(1) : opts.sector && opts.sector !== 'steam' ? ids.slice(1, ids.indexOf(opts.sector) + 1) : opts.light ? ['light'] : [];
        for (const id of extra) {
          if (!s.sectors[id]) continue;
          openSector(s, c, id, id !== 'light');
          for (const a of c.sectors[id].applications.slice(0, 2)) s.sectors[id].apps[a.id] = { available: true, founded: true, satMul: 1, peakD: 0 };
          for (const u of c.upgrades) if (u.sector === id && u.kind === 'efficiency' && !u.requires) s.upgrades[u.id] = 1;
          baseline(s, c, id);
          for (const u of c.upgrades) if (u.sector === id && u.kind === 'efficiency' && !u.requires) s.upgrades[u.id] = 1;
        }
        if (opts.budget) {
          s.sectors.steam.budget = { r0: calc(s, c, 'steam').R * 1.15, since: s.time - 60, drawnYear: Math.floor(yearOf(s, c)) - 3 };
          s.levers['steam.cap'] = { level: 1, ref: 0 };
          s.sectors.steam.steadyYears = 27; s.sectors.steam.decadesWithin = [1803, 1813]; s.run.budgetDecades = 2;
        }
        for (let i = 0; i < 60; i++) step(s, c, 1);
        if (opts.smog != null) for (const id of ids) if (s.sectors[id]?.open) s.sectors[id].pressure = c.sectors[id].collapseAt * opts.smog;
        s.meta.lastRun = {
          cause: 'exhausted', causeSector: 'steam', seconds: 2100, yearReached: 1885, hindsightGained: 42, peakWellbeing: 36,
          sectors: { steam: { etaFold: 12, peakRFold: 2.1, resourceUsed: 5.2e5, unburnt: 0.04, decades: 1 }, light: { etaFold: 3, peakRFold: 4.4, resourceUsed: 8e4, unburnt: 0.61, decades: 0 } },
          hindsightTerms: { wellbeingYears: 820, intensity: 2.4, wellbeing: 10.6, budget: 6, unburnt: 3.1, backfire: 10, sectorsReached: 10, steady: 0, total: 40 },
        };
      } else if (!meta && opts.reveal) { s.flags.revealed = true; }
      if (opts.pending && !meta) (s as unknown as { _forcePending: boolean })._forcePending = true;
      if (opts.won && !meta) (s as unknown as { _winAt: number })._winAt = s.time + 3;
      return s;
    },
    tick(s0, c, dt) {
      if (pending(s0, c)) return s0;
      const s = clone(s0);
      step(s, c, Math.max(0, Math.min(MAX_TICK_SECONDS, dt)));
      const w = s as unknown as { _winAt?: number };
      if (w._winAt && s.time >= w._winAt) { s.flags.won = true; delete w._winAt; }
      return s;
    },
    fastForward(s0, c, seconds) {
      const s = clone(s0);
      const total = Math.min(seconds, c.global.offlineCapSeconds);
      for (let t = 0; t < total; t += 5) { if (pending(s, c)) break; step(s, c, Math.min(5, total - t)); }
      return s;
    },
    derive(s, c) {
      const sectors: Derived['sectors'] = {};
      let income = 0, levyM = 0;
      const w = wellbeing(s, c);
      const pend = pending(s, c);
      for (const id of order(c)) {
        const es = s.sectors[id], def = c.sectors[id];
        if (!es.open) continue;
        const k = calc(s, c, id);
        const etaFold = k.eta / (es.etaAtBase || k.eta || 1), baseR = es.baseR || k.R || 1;
        const shadowR = calc(s, c, id, es.etaAtBase || k.eta).R;
        const promisedR = shadowR / etaFold;
        const rebound = etaFold > 1.001 && shadowR > 0 && shadowR - promisedR > 1e-9 * shadowR ? (k.R - promisedR) / (shadowR - promisedR) : null;
        const apps: SectorDerived['apps'] = {};
        for (const a of def.applications) {
          const st = es.apps[a.id];
          apps[a.id] = { available: st.available, founded: st.founded, demand: k.apps[a.id].d, adoption: k.apps[a.id].ad, canFound: st.available && !st.founded && s.capital >= a.foundCost && !pend };
        }
        const bR = budgetR(s, c, id);
        const within = bR != null && k.R <= bR * (1 + BUDGET_TOLERANCE);
        sectors[id] = {
          eta: k.eta, etaFold, resourcePrice: k.prBase + k.permit, resourcePriceBase: k.prBase, permitPrice: k.permit, capCost: k.cap, margin: k.margin,
          substitutedShare: k.sigma, preLevyPrice: k.pre, permitPart: k.permitPart, dutyPart: k.dutyPart, servicePrice: k.ps, demand: k.D, resourceUse: k.R,
          rFold: k.R / baseR, shadowR, promisedR, rebound, frontierFold: shadowR / baseR, income: k.income, levyRevenue: k.levy,
          reserveFraction: def.resourceKind === 'flow' ? 0.4 : es.reserveMax > 0 ? es.reserve / es.reserveMax : 1,
          secondsLeft: def.resourceKind === 'stock' && k.R > 0 ? es.reserve / k.R : Infinity,
          pressureFraction: es.pressure / def.collapseAt, nextCrisisFraction: def.crisisAt[es.crisesFired] ?? null, trendR: es.trendR,
          budgetR: bR, withinBudget: within, decoupling: within && w >= c.global.wellbeingTarget && !pend, steadyYears: es.steadyYears,
          budgetDecades: es.decadesWithin.length, wellbeingShare: 0, apps,
        };
        income += k.income;
        const tre = ['duty', 'cap'].map((kind) => activeLever(s, c, id, kind)).find(Boolean);
        if (tre && (s.levers[tre.def.id].recycle ?? tre.def.recycle?.[0] ?? 'treasury') === 'treasury') levyM += k.levy * (c.global.levy?.mandateShare ?? 0.1);
      }
      let upkeep = 0;
      for (const l of c.levers) { const ls = s.levers[l.id]; const lv = ls ? leverLevel(l, ls.level) : null; if (lv) upkeep += lv.mandateUpkeep; }
      const t = terms(s, c);
      const used = (s.meta.loadout || []).reduce((n, id) => n + (c.institutions.find((x) => x.id === id)?.slots ?? 1), 0);
      return {
        year: yearOf(s, c), age: ageOf(s, c), wellbeing: w, incomePerSec: income, clickValue: pend ? 0 : c.global.clickFlat + c.global.clickSeconds * income,
        mandatePerSec: s.flags.revealed || s.mandate > 0 ? Math.max(0, w - c.global.mandateFloor) * c.global.mandateRate * mul(s, c, 'mandateRateMul') + levyM - upkeep : 0,
        populationGrowthPerSec: popGrowth(s, c, w), pendingReckoning: pend, hindsightIfReckonNow: t.total, hindsightTerms: t, sectors,
        nextSectors: nextSectors(s, c), freshRun: isFresh(s), slots: { total: s.meta.slots, used },
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
      s.capital -= v.cost; s.upgrades[id] = (s.upgrades[id] || 0) + 1;
      for (const e of v.def.effects) {
        if (e.type === 'reveal') { s.flags.revealed = true; news(s, c, 'reveal'); }
        if (e.type === 'reserveAdd') { const es = s.sectors[e.sector]; es.reserve += e.value * c.sectors[e.sector].reserve; es.reserveMax += e.value * c.sectors[e.sector].reserve; }
      }
      if (v.def.kind === 'efficiency') news(s, c, 'efficiency', {}, v.def.sector);
      return s;
    },
    foundApp(s0, c, appId) {
      for (const id of order(c)) {
        const a = c.sectors[id].applications.find((x) => x.id === appId);
        const st = a && s0.sectors[id].apps[appId];
        if (a && st && st.available && !st.founded && s0.capital >= a.foundCost) {
          const s = clone(s0); s.capital -= a.foundCost; s.sectors[id].apps[appId].founded = true; news(s, c, 'appFounded', { app: a.name }, id); return s;
        }
      }
      return s0;
    },
    setLever(s0, c, id, level) {
      const def = c.levers.find((l) => l.id === id), cur = s0.levers[id]?.level ?? 0;
      if (!def || level < 0 || level > leverMax(def) || level === cur) return s0;
      const s = clone(s0);
      if (level > cur) {
        if (level !== cur + 1) return s0;
        const cost = leverLevel(def, level)!.mandateCost;
        if (s.mandate < cost) return s0;
        s.mandate -= cost;
        if (cur === 0) {
          s.levers[id] = { ...s.levers[id], level, ref: calc(s, c, def.sector).ps };
          const es = s.sectors[def.sector];
          if (!es.budget) { es.budget = { r0: calc(s0, c, def.sector).R, since: s.time, drawnYear: Math.floor(yearOf(s, c)) }; news(s, c, 'budgetDrawn', {}, def.sector); }
        }
        news(s, c, 'leverEnacted', {}, def.sector);
      }
      s.levers[id] = { ...(s.levers[id] || { ref: 0 }), level };
      return s;
    },
    setLeverRecycle(s0, c, id, option) {
      const def = c.levers.find((l) => l.id === id);
      if (!def || !(def.kind === 'duty' || def.kind === 'cap') || !(def.recycle ?? ['treasury']).includes(option)) return s0;
      const s = clone(s0); s.levers[id] = { ...s.levers[id], recycle: option }; return s;
    },
    drawBudget(s0, c, sector) {
      if (!s0.flags.revealed || !s0.sectors[sector]?.open || pending(s0, c)) return s0;
      const R = calc(s0, c, sector).R; if (!(R > 0)) return s0;
      const s = clone(s0);
      s.sectors[sector].budget = { r0: R, since: s.time, drawnYear: Math.floor(yearOf(s, c)) };
      s.sectors[sector].steadyYears = 0;
      news(s, c, 'budgetDrawn', {}, sector);
      return s;
    },
    reckon(s0, c) {
      const p = pending(s0, c);
      const t = terms(s0, c);
      const meta = clone(s0.meta);
      meta.hindsight += t.total; meta.hindsightEarned += t.total; meta.reckonings++; meta.achievements.firstReckoning = true; meta.totalSeconds += s0.time;
      const sectors: NonNullable<MetaState['lastRun']>['sectors'] = {};
      for (const id of order(c)) if (s0.sectors[id].open) {
        const es = s0.sectors[id];
        sectors[id] = {
          etaFold: etaOf(s0, c, id) / (es.etaAtBase || 1), peakRFold: es.peakR / (es.baseR || 1), resourceUsed: s0.run.resourceUsed[id] || 0,
          unburnt: c.sectors[id].resourceKind === 'stock' ? es.reserve / Math.max(1, es.reserveMax) : undefined, decades: es.decadesWithin.length,
        };
      }
      meta.lastRun = {
        cause: p?.cause ?? 'chosen', causeSector: p?.sector, seconds: s0.time, yearReached: Math.floor(yearOf(s0, c)), hindsightGained: t.total,
        peakWellbeing: s0.run.peakWellbeing, sectors, hindsightTerms: t,
      };
      const s = api.createState(c, meta, s0.seed + 1);
      news(s, c, 'reckoning');
      return s;
    },
    buyKnowhow(s0, c, id) {
      const v = api.knowhowViews(s0, c).find((x) => x.def.id === id);
      if (!v || !v.canBuy || v.cost == null) return s0;
      const meta = clone(s0.meta); meta.hindsight -= v.cost; meta.knowhow[id] = v.level + 1;
      for (const e of v.def.effects) if (e.type === 'slotAdd') meta.slots += e.value;
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
    upgradeViews(s, c) {
      const revealed = s.flags.revealed;
      return c.upgrades.map((u): UpgradeView => {
        const level = s.upgrades[u.id] || 0;
        const cost = u.cost * Math.pow(u.costGrowth || 1, level);
        const maxed = u.repeatable ? level >= (u.maxLevel ?? Infinity) : level >= 1;
        const visible = !!s.sectors[u.sector]?.open && (u.requires || []).every((r) => s.upgrades[r]) && (!u.locked || unlocked(s, c, u.id));
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
              const tt = clone(t); tt.sectors[u.sector].apps[a.id] = { available: true, founded: true, satMul: 1, peakD: 0 };
              const withApp = calc(tt, c, u.sector).R;
              reach.push({ appId: a.id, projectedChange: after.R > 0 ? withApp / after.R - 1 : 0 });
            }
          }
          reach.sort((x, y) => (c.sectors[u.sector].applications.find((a) => a.id === y.appId)?.visibleBelow ?? 0) - (c.sectors[u.sector].applications.find((a) => a.id === x.appId)?.visibleBelow ?? 0));
        }
        return {
          def: u, level, cost, visible, affordable: visible && !maxed && !excludedBy && s.capital >= cost, maxed, excludedBy, promisedChange: promised,
          projectedDecade: decade, bringsWithinReach: decade == null ? [] : reach,
        };
      });
    },
    leverViews(s, c) {
      return c.levers.map((l): LeverView => {
        const level = s.levers[l.id]?.level ?? 0;
        const max = leverMax(l);
        const next = level < max ? leverLevel(l, level + 1) : null;
        const free = effects(s, c).filter((e) => e.type === 'startLever' && e.lever === l.id).reduce((m, e) => Math.max(m, (e as { level: number }).level), 0);
        const cost = next ? (level + 1 <= free ? 0 : next.mandateCost) : null;
        const visible = (s.flags.revealed || free > 0) && !!s.sectors[l.sector]?.open && (!l.locked || unlocked(s, c, l.id));
        const cur = leverLevel(l, level);
        const levy = l.kind === 'duty' || l.kind === 'cap';
        return {
          def: l, level, maxLevel: max, current: cur, next, visible, nextCost: cost, canRaise: visible && cost != null && s.mandate >= cost,
          upkeep: cur && level > free ? cur.mandateUpkeep : 0,
          recycleOptions: levy ? (l.recycle ?? ['treasury']) : [], recycle: levy ? (s.levers[l.id]?.recycle ?? l.recycle?.[0] ?? 'treasury') : null,
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
    hindsightOnReckon(s, c) { return terms(s, c).total; },
    serialize(s) { return JSON.stringify(s, (_k, v) => (v === Infinity ? 1e308 : v)); },
    deserialize(text, c) {
      try {
        const s = JSON.parse(text) as GameState;
        if (!s || typeof s !== 'object' || !s.sectors || !s.meta || (s.version ?? 1) > 2) return null;
        void c; return s;
      } catch { return null; }
    },
  };
  return api;
}
