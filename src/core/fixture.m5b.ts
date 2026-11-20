/**
 * Test-only M5 content for Core B's rules (office, elections, the Treasury, hidden flow, the charge, the Treaty), built
 * on Core A's fixtureM5 (fixture.ts: the motor Industry, ChairDef, RivalDef, OfficeDef). Adds: a 'plenty' Industry with
 * hidden flow (an aquifer; drip lowers the return share), its drip subsidy, a licence on water applied, a cap on water
 * consumed and a water charge; a congestion charge on motor with popularity; six pledges; two Articles and a playbook;
 * the Treaty's terms; a Statecraft-like tree and an industrial tree held by the rival. Never imported by the game.
 * Placeholder numbers, chosen for the experiments of design/m5-design.md §16 (E4, E6, E7, E8).
 */
import type { ArticleDef, Content, LeverDef, MetaState, PlaybookDef, PledgeDef, SectorDef, UpgradeDef } from '../types';
import { fixtureM5, M5_CHAIR } from './fixture';

const L = (mandateCost: number, mandateUpkeep: number, value: number, value2?: number) =>
  ({ mandateCost, mandateUpkeep, value, label: `v${value}`, ...(value2 !== undefined ? { value2 } : {}) });
const lever = (id: string, sector: string, kind: LeverDef['kind'], levels: ReturnType<typeof L>[], extra: Partial<LeverDef> = {}): LeverDef =>
  ({ id, sector, name: id, blurb: '', kind, levels, catch: { blurb: '' }, ...extra } as LeverDef);

const motor0 = fixtureM5.sectors.motor;
/** Plenty: grain on an aquifer; half the water applied returns to it until drip. */
export const plenty: SectorDef = {
  ...motor0, id: 'plenty', name: 'Plenty', firstYear: 1950, basePrice: 1, capCost: 0.04, margin: 0.2, alpha: 0.6, reserve: 3_000_000,
  pressureIntensity: 0.0004, absorption: 0.01, wellbeingWeight: 8, wellbeingScale: 200,
  service: { name: 'Calories', unit: 'kcal' }, resource: { name: 'Groundwater', unit: 'acre-ft' },
  hiddenFlow: { returnShare: 0.5, floor: 0.05 },
  applications: [
    { id: 'plenty.grain', name: 'Bread grain', blurb: '', icon: 'x', halfPrice: 2.5, saturation: 500, steepness: 2, visibleBelow: Infinity, foundCost: 0 },
    { id: 'plenty.orchards', name: 'Irrigated orchards', blurb: '', icon: 'x', halfPrice: 0.6, saturation: 300, steepness: 2, visibleBelow: Infinity, foundCost: 0 },
  ],
};
const plentyUpgrades: UpgradeDef[] = [
  { id: 'plenty.pivot', sector: 'plenty', name: 'Centre pivot', blurb: '', kind: 'efficiency', cost: 400, effects: [{ type: 'etaMul', sector: 'plenty', value: 1.2 }] },
  { id: 'plenty.drip', sector: 'plenty', name: 'Drip', blurb: '', kind: 'efficiency', cost: 20_000, requires: ['plenty.pivot'],
    effects: [{ type: 'etaMul', sector: 'plenty', value: 1.35 }, { type: 'returnShareMul', sector: 'plenty', value: 0.45 }] },
];
const plentyLevers: LeverDef[] = [
  lever('plenty.subsidy', 'plenty', 'subsidy', [L(20, 0.01, 0.3), L(40, 0.02, 0.6)], { targets: ['plenty.drip'] }),
  lever('plenty.licence', 'plenty', 'cap', [L(50, 0.03, 1.0, 3), L(150, 0.08, 0.8, 3)], { basis: 'applied' }),
  lever('plenty.consumptionCap', 'plenty', 'cap', [L(60, 0.03, 1.0, 3), L(180, 0.08, 0.8, 3)], { basis: 'consumed' }),
  lever('plenty.charge', 'plenty', 'charge', [L(30, 0.02, 0.2), L(80, 0.05, 0.5)], { basis: 'consumed', recycle: ['treasury', 'dividend'],
    popularity: { start: -3, after: 1, years: 10 } }),
];
const motorCharge = lever('motor.charge', 'motor', 'charge', [L(30, 0.02, 0.1), L(80, 0.05, 0.25), L(160, 0.1, 0.4)],
  { recycle: ['treasury', 'dividend'], popularity: { start: -3, after: 1, years: 10 } });

export const M5B_PLEDGES: PledgeDef[] = [
  { id: 'p.roads', name: 'Roads for all', blurb: '', confidence: 2 },
  { id: 'p.noDuty', name: 'No new taxes on motoring', blurb: '', confidence: 4, binds: { lever: 'motor.duty', max: 0 } },
  { id: 'p.homes', name: 'Homes fit for heroes', blurb: '', confidence: 3, atPoll: 5 },
  { id: 'p.noCharge', name: 'No congestion charge', blurb: '', confidence: 3, binds: { leverKind: 'charge', max: 0 } },
  { id: 'p.rail', name: 'A railway for every town', blurb: '', confidence: 2, treasuryShare: 0.1 },
  { id: 'p.water', name: 'Water for every farm', blurb: '', confidence: 2, when: { stat: 'time', op: '>=', value: 1e9 } },
];
const M5B_ARTICLES: ArticleDef[] = [
  { id: 'art.ratchet', name: 'The Ratchet Clause', blurb: '', cost: 3, effects: [{ type: 'ratchet' }] },
  { id: 'art.terms', name: 'Fixed-term Parliaments', blurb: '', cost: 5, effects: [{ type: 'termYearsAdd', value: 5 }] },
];
const M5B_PLAYBOOKS: PlaybookDef[] = [
  { id: 'pb.selfReport', name: 'Self-reporting', blurb: '', treaty: 1, effects: [{ type: 'quietYearsAdd', value: -2 }] },
];

/** Motor and Plenty both from the Chair; pledges, charges, the Treaty. */
export const fixtureM5B: Content = {
  ...fixtureM5,
  sectors: { motor: motor0, plenty },
  sectorOrder: ['motor', 'plenty'],
  ages: [{ ...fixtureM5.ages[0], sectors: ['motor', 'plenty'] }],
  upgrades: [...(fixtureM5.upgrades ?? []), ...plentyUpgrades],
  levers: [...(fixtureM5.levers ?? []), motorCharge, ...plentyLevers],
  pledges: M5B_PLEDGES,
  articles: M5B_ARTICLES,
  playbooks: M5B_PLAYBOOKS,
  chair: { ...M5_CHAIR, treaty: { when: { stat: 'time', op: '>=', value: 0 }, perCertifiedDecade: 0.5, perSettledFromChair: 3, perParliamentWon: 1, perWellbeingYear: 0.001 },
    hindsight: { perParliamentWon: 2 } },
  knowhowTrees: { industry: { name: 'Industry', holder: 'rival' }, statecraft: { name: 'Statecraft' } },
  knowhow: [
    { id: 'kh.engines', name: 'Engines', blurb: '', tree: 'industry', tier: 1, cost: 1, costGrowth: 1.5, maxLevel: 5, effects: [] },
    { id: 'kh.whips', name: 'Whips', blurb: '', tree: 'statecraft', tier: 1, cost: 1, costGrowth: 1.5, maxLevel: 1, effects: [{ type: 'pledgeOfferAdd', value: 1 }] },
  ] as Content['knowhow'],
};
/** Plenty alone, from the Chair (E6). */
export const fixturePlenty: Content = {
  ...fixtureM5B,
  sectors: { plenty }, sectorOrder: ['plenty'], ages: [{ ...fixtureM5.ages[0], sectors: ['plenty'] }],
  upgrades: plentyUpgrades, levers: plentyLevers, loopholes: [],
};

/** A meta in office (as takeOffice would leave it) on fixture content: default profile, nothing handed over. */
export function officeMeta(content: Content, meta: MetaState, handedOver: Record<string, number> = {}): MetaState {
  const p = content.rival!.defaultProfile;
  return {
    ...meta, flags: { ...(meta.flags ?? {}), office: true },
    office: {
      run: meta.reckonings, at: meta.totalSeconds, profile: { ...p },
      sources: { haste: { n: 0, d: null }, founder: { n: 0, d: 0 }, volume: { n: 0, d: 0 }, drawn: { n: -1, d: 1800 }, pliant: { n: 0, d: 0 } },
      handedOver, prospectus: { defaulted: true, first: [], motion: null },
      file: { accepted: [], declined: [], pliant: 0.5, automatedShare: 0, seasons: 0 }, ministries: 1,
      record: { certifiedDecades: 0, settledFromChair: 0, parliamentsWon: 0, wellbeingYears: 0 },
    },
  };
}
