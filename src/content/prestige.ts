/**
 * Prestige content: Know-how (the tempting kind) and Institutions (the slow kind), bought with Hindsight.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { EffectDef, InstitutionDef, InstitutionLevelDef, KnowhowDef } from '../types';
import { eta, capCost, reserve, absorb, sat, half, startLever, sig2 } from './helpers';

/* ------------------------------------------------------------------ */
/* KNOW-HOW (tempting): two trees                                      */
/* ------------------------------------------------------------------ */

/*
 * Steam tree: the Cornish school (η) against the Manchester school (cheaper engines) is the first fork. Every
 * efficiency node carries a satMul or halfPriceMul > 1: runs start faster and hit the wall sooner, and the node
 * says so in numbers. General tree: the later industries' schools plus the meta choices (purse or patents, Mandate
 * or smaller families, a seat at the table or a heavier purse).
 */
export const knowhow: KnowhowDef[] = [
  /* ---- Steam tree ---- */
  {
    id: 'kh.cornishSchool', name: 'The Cornish school', tree: 'steam', tier: 1, branch: 'steam-1',
    blurb: 'Engineers who can wring another million of duty from any engine. The pits go deeper, sooner.',
    cost: 12, costGrowth: 1.6, maxLevel: 5,
    effects: [eta('steam', 1.1), sat('steam', 1.05)],
  },
  {
    id: 'kh.manchesterSchool', name: 'The Manchester school', tree: 'steam', tier: 1, branch: 'steam-1',
    blurb: 'Engines by the gross, cheap and good enough. There are soon a great many of them.',
    cost: 12, costGrowth: 1.6, maxLevel: 5,
    effects: [capCost('steam', 0.9), half('steam', 1.04)],
  },
  {
    id: 'kh.apprenticeships', name: 'Apprenticeships', tree: 'steam', tier: 1,
    blurb: 'Every engine wright trains two more. The pits empty all the sooner.',
    cost: 10, costGrowth: 1.6, maxLevel: 5,
    effects: [eta('steam', 1.08), sat('steam', 1.03)],
  },
  {
    id: 'kh.deepMining', name: 'Deep-mining surveys', tree: 'steam', tier: 2, branch: 'steam-2',
    blurb: 'Maps of the concealed coalfields. More coal at the start of every run, and every reason to burn it.',
    cost: 40, costGrowth: 1.7, maxLevel: 5,
    effects: [reserve('steam', 0.12)],
  },
  {
    id: 'kh.smokeInspectors', name: 'Smoke inspectors', tree: 'steam', tier: 2, branch: 'steam-2',
    blurb: 'Men with notebooks who stand downwind of chimneys. The air clears a little faster.',
    cost: 40, costGrowth: 1.7, maxLevel: 5,
    effects: [absorb('steam', 0.001)],
  },
  {
    id: 'kh.machineShop', name: 'Machine-shop lore', tree: 'steam', tier: 2,
    blurb: 'Tricks of the trade, written down at last. Engines cost less to build, and every pit wants two.',
    cost: 20, costGrowth: 1.7, maxLevel: 6,
    effects: [capCost('steam', 0.92), half('steam', 1.03)],
  },
  {
    id: 'kh.dutyLeague', name: 'The duty league', tree: 'steam', tier: 3, branch: 'steam-3',
    blurb: 'Published league tables, monthly prizes, envy as a method. Each run reaches the bottom of the pit faster.',
    cost: 150, costGrowth: 1.8, maxLevel: 4,
    effects: [eta('steam', 1.1), sat('steam', 1.06)],
  },
  {
    id: 'kh.friendlySociety', name: 'Miners’ friendly societies', tree: 'steam', tier: 3, branch: 'steam-3',
    blurb: 'A penny a week against injury and old age. Nothing burns faster; people simply live a little better.',
    cost: 150, costGrowth: 1.8, maxLevel: 4,
    effects: [{ type: 'wellbeingAdd', value: 1 }],
  },

  /* ---- General tree ---- */
  {
    id: 'kh.seedCapital', name: 'Seed capital', tree: 'general', tier: 1, branch: 'general-1',
    blurb: 'Start each run with a heavier purse. Get to the bottom of the pit faster.',
    cost: 8, costGrowth: 1.5, maxLevel: 8,
    effects: [{ type: 'startCapitalMul', value: 3 }],
  },
  {
    id: 'kh.patentPool', name: 'Patent pool', tree: 'general', tier: 1, branch: 'general-1',
    blurb: 'Everyone licenses everyone. Improvements arrive cheap, and early.',
    cost: 15, costGrowth: 1.8, maxLevel: 8,
    effects: [{ type: 'costMul', value: 0.92 }],
  },
  {
    id: 'kh.royalInstitution', name: 'Evening lectures in electricity', tree: 'general', tier: 2,
    blurb: 'Packed halls, sparks on demand. The lamps get brighter, quicker, and stay on later.',
    cost: 25, costGrowth: 1.7, maxLevel: 8,
    effects: [eta('light', 1.12), sat('light', 1.04)],
  },
  {
    id: 'kh.motorSchool', name: 'Automotive engineering school', tree: 'general', tier: 2,
    blurb: 'Graduates who can find another mile in any gallon. They will drive it, too.',
    cost: 60, costGrowth: 1.7, maxLevel: 8,
    effects: [eta('motion', 1.12), half('motion', 1.04)],
  },
  {
    id: 'kh.pamphleteers', name: 'Pamphleteers', tree: 'general', tier: 2, branch: 'general-2',
    blurb: 'Cheap print and strong opinions. The public mood moves quicker, in both directions.',
    cost: 45, costGrowth: 1.7, maxLevel: 5,
    effects: [{ type: 'mandateRateMul', value: 1.1 }],
  },
  {
    id: 'kh.schooling', name: 'Elementary schooling', tree: 'general', tier: 2, branch: 'general-2',
    blurb: 'Children at school are not down the pit. Families grow smaller, and ask for more.',
    cost: 45, costGrowth: 1.7, maxLevel: 5,
    effects: [{ type: 'popGrowthMul', value: 0.92 }],
  },
  {
    id: 'kh.csDepartment', name: 'Computer science department', tree: 'general', tier: 3,
    blurb: 'A new building, a new chip, a new reason for a bigger data centre.',
    cost: 120, costGrowth: 1.8, maxLevel: 8,
    effects: [eta('compute', 1.15), sat('compute', 1.05)],
  },
  {
    id: 'kh.bootcamps', name: 'Prompt bootcamps', tree: 'general', tier: 3,
    blurb: 'Twelve weeks to ten-times productivity, and ten times as much to maintain.',
    cost: 250, costGrowth: 1.8, maxLevel: 8,
    effects: [eta('code', 1.15), sat('code', 1.05)],
  },
  {
    id: 'kh.civilService', name: 'Appointment by open competition', tree: 'general', tier: 3, branch: 'general-3',
    blurb: 'Appointment on merit, not on patronage. One more Institution may take a seat, for good.',
    cost: 400, costGrowth: 1, maxLevel: 1,
    effects: [{ type: 'slotAdd', value: 1 }],
  },
  {
    id: 'kh.ventureCapital', name: 'Venture capital', tree: 'general', tier: 3, branch: 'general-3',
    blurb: 'Money that wants a hundredfold back by Thursday. Every run starts richer and spends faster.',
    cost: 400, costGrowth: 1, maxLevel: 1,
    effects: [{ type: 'startCapitalMul', value: 3 }, { type: 'costMul', value: 0.85 }],
  },
];

/** M2: display names of the Know-how trees (Content.knowhowTrees); every tree in use is named (the lint checks). */
export const knowhowTrees: Record<string, { name: string; blurb?: string }> = {
  steam: {
    name: 'Engine wrights',
    blurb: 'Schools of engineering and the coal trade. Every node starts Steam faster, and the pits empty sooner.',
  },
  general: {
    name: 'The professions',
    blurb: 'Lecture halls, purses and the habits of government, for every Industry and for the runs themselves.',
  },
};

/* ------------------------------------------------------------------ */
/* INSTITUTIONS (slow): 20 (M4: +2), with levels and seats            */
/* ------------------------------------------------------------------ */

/** Levels 2 and 3 cost 2.5× and 6× level 1 by default. */
function levels(cost: number, defs: { effects: EffectDef[]; label: string }[], growth = [2.5, 6]): InstitutionLevelDef[] {
  return defs.map((d, i) => ({ cost: sig2(cost * growth[i]), effects: d.effects, label: d.label }));
}

/** An institution that starts one lever, at a level that rises with its own. */
function leverInstitution(
  s: Omit<InstitutionDef, 'effects' | 'nextLevels'> & { lever: string; maxLevel: number; leverName: string },
): InstitutionDef {
  const { lever: lv, maxLevel, leverName, ...rest } = s;
  const next: { effects: EffectDef[]; label: string }[] = [];
  for (let level = 2; level <= maxLevel; level++) {
    next.push({ effects: [startLever(lv, level)], label: `${leverName} starts at level ${level}` });
  }
  return { ...rest, effects: [startLever(lv, 1)], nextLevels: levels(s.cost, next) };
}

/** M3 finish: the Commission's first level, in Hindsight (its second costs 2.5×). Tuned so the first ending lands at
 *  15–20 h for the scripted restraint players (design/unlock-schedule.md).
 *  M4 balance: 4,000 (M3: 1,500). Act I needs only the first sitting (four Industries, three in Parliament's room). At
 *  1,500 it was bought after run 5 and the Act I ending came in Fishing's first run, at 11.3–11.5 h for `mixed` and
 *  `budget`; at 3,500 after run 7 (ending 13.0–13.6 h, human 15.3 h); at 4,000 after run 8 for `budget` and `mixed`
 *  (ending 17.4 and 15.0 h) and the human-like player (17.5 h); with full decades at 5 Hindsight (global.ts) 5,000
 *  puts it back there: budget 16.0 h, mixed 15.0, human 17.6 (design/scratch/m4-balance/v13-*50). The visible price of
 *  the room for the fourth settlement is the wait, not a clock. */
const SETTLE_COMMISSION = 5000;

export const institutions: InstitutionDef[] = [
  {
    id: 'inst.statisticsOffice', name: 'Statistics Office',
    blurb: 'Clerks who add up the whole country’s coal, not just the engine’s. The rebound is visible from minute one.',
    cost: 15, effects: [{ type: 'reveal' }],
    nextLevels: levels(15, [
      { effects: [{ type: 'mandateRateMul', value: 1.1 }], label: 'Monthly returns: Mandate accrues 10% faster' },
    ], [4]),
  },
  /*
   * Standing caps (restored in M1 balance): with steady.standingDrawYears the line is drawn across the grown economy,
   * twelve minutes into the industry (or earlier, if the player Tightens the cap or draws a line), not at its opening.
   */
  leverInstitution({
    id: 'inst.smokeAbatement', name: 'Smoke Abatement Act',
    blurb: 'The ceiling on the borough’s coal is law before the first engine is lit. The line itself is drawn once there is a town to draw it across.',
    cost: 110, lever: 'steam.cap', leverName: 'Smoke abatement', maxLevel: 3,
  }),
  leverInstitution({
    id: 'inst.gasReferees', name: 'Gas referees',
    blurb: 'Officials who test the gas, and in time ration it. The allowance waits until the town has lamps worth counting.',
    cost: 160, requires: ['inst.smokeAbatement'], lever: 'light.cap', leverName: 'Gas allowance', maxLevel: 3,
  }),
  {
    id: 'inst.alkaliInspectorate', name: 'Alkali Inspectorate',
    blurb: 'Alkali Act, 1863: the first inspectors of what chimneys put in the air. Steam’s smoke clears a little faster.',
    cost: 40, effects: [absorb('steam', 0.002)],
    nextLevels: levels(40, [
      { effects: [absorb('steam', 0.002)], label: 'More inspectors: the smoke clears faster again' },
      { effects: [absorb('steam', 0.002), { type: 'mandateRateMul', value: 1.05 }], label: 'Published reports: Mandate accrues 5% faster' },
    ]),
  },
  leverInstitution({
    id: 'inst.standingDuty', name: 'Standing coal duty',
    blurb: 'Parliament votes the coal duty before anyone has built an engine to tax.',
    cost: 45, requires: ['inst.statisticsOffice'], lever: 'steam.duty', leverName: 'Coal duty', maxLevel: 3,
  }),
  leverInstitution({
    id: 'inst.royalCommission', name: 'Royal Commission on Coal',
    blurb: 'Sits for five years and reports, at length, that there is plenty. Meanwhile, the slack heaps are burned too.',
    cost: 45, requires: ['inst.statisticsOffice'], lever: 'steam.circularity', leverName: 'Slack recovery', maxLevel: 3,
  }),
  leverInstitution({
    id: 'inst.temperance', name: 'Temperance societies',
    blurb: 'Tea, hymns and a pledge to want less. Appetite is already modest when the first engine is lit.',
    cost: 40, lever: 'steam.sufficiency', leverName: 'Temperance pledge', maxLevel: 3,
  }),
  {
    id: 'inst.cleanAirAct', name: 'Clean Air Act',
    blurb: 'Smokeless zones and grants for new grates. The air clears a little faster in every run.',
    cost: 80,
    effects: [absorb('steam', 0.003), absorb('light', 0.003)],
    nextLevels: levels(80, [
      { effects: [absorb('motion', 0.003)], label: 'Extended to exhaust: Motion’s air clears faster too' },
      { effects: [absorb('compute', 0.002), absorb('steam', 0.002)], label: 'Carbon added to the schedule; Steam tightened again' },
    ]),
  },
  {
    id: 'inst.broadcaster', name: 'A public broadcaster',
    blurb: 'Shared facts, nightly. Arguments for restraint find an audience.',
    cost: 90, effects: [{ type: 'mandateRateMul', value: 1.25 }],
    nextLevels: levels(90, [
      { effects: [{ type: 'mandateRateMul', value: 1.15 }], label: 'A second channel: Mandate accrues faster again' },
    ]),
  },
  {
    id: 'inst.sovereignFund', name: 'Sovereign wealth fund',
    blurb: 'Bank the windfall and spend only the interest. The spending rule is the real institution.',
    cost: 120, effects: [{ type: 'wellbeingAdd', value: 1.5 }],
    nextLevels: levels(120, [
      { effects: [{ type: 'wellbeingAdd', value: 1.5 }], label: 'The fund compounds: wellbeing +1.5 more' },
      { effects: [{ type: 'wellbeingAdd', value: 2 }, { type: 'startCapitalMul', value: 1.5 }], label: 'A dividend at the start of every run' },
    ]),
  },
  leverInstitution({
    id: 'inst.parksTrust', name: 'Municipal improvement trust',
    blurb: 'Libraries, baths and parks are funded before the lamps are lit.',
    cost: 110, requires: ['inst.broadcaster'], lever: 'light.greenSpending', leverName: 'Public parks', maxLevel: 3,
  }),
  {
    id: 'inst.revenueDecoupling', name: 'Revenue decoupling',
    blurb: 'Pay the gas company for light delivered, not for therms sold. It stops building load.',
    cost: 130, effects: [startLever('light.sufficiency', 1)],
    nextLevels: levels(130, [
      { effects: [startLever('light.duty', 1)], label: 'The lighting rate is law from the start' },
      { effects: [startLever('light.sufficiency', 2), startLever('light.duty', 2)], label: 'Both start a level higher' },
    ]),
  },
  leverInstitution({
    id: 'inst.greenBelt', name: 'Green belt',
    blurb: 'A ring of fields the suburbs may not cross. Towns stay walkable.',
    cost: 150, lever: 'motion.sufficiency', leverName: 'Walking distance', maxLevel: 3,
  }),
  {
    id: 'inst.climateCommittee', name: 'Independent climate committee',
    blurb: 'Carbon budgets set years ahead, out of reach of the next election. Every Industry’s duty is law from the start. Takes two seats.',
    cost: 300, requires: ['inst.alkaliInspectorate', 'inst.standingDuty'], slots: 2,
    effects: [
      startLever('steam.duty', 1), startLever('light.duty', 1), startLever('motion.duty', 1), startLever('compute.duty', 1),
      { type: 'mandateRateMul', value: 1.1 },
    ],
    nextLevels: levels(300, [
      {
        effects: [startLever('steam.duty', 2), startLever('light.duty', 2), startLever('motion.duty', 2), startLever('compute.duty', 2)],
        label: 'Every duty starts at level 2',
      },
      {
        effects: [startLever('steam.duty', 3), startLever('light.duty', 3), startLever('motion.duty', 3), startLever('compute.duty', 3)],
        label: 'Every duty starts at level 3',
      },
    ]),
  },
  /*
   * M2: the closing automations. The Civil Service (long-game hour 5) holds a line with the levers the player hands it;
   * its second level is the first offline step (8 h → 12 h by about hour 5). Treasury rules (hour 10) spend on the
   * Commons by a priority list. Both cost a seat, which is their real price.
   */
  /*
   * M3 finish: Parliament will hold only three settled Industries at once (GlobalParams.settleMax); the Commission
   * makes room for a fourth, and its second sitting for the fifth. The first ending needs all five settled together, so
   * it waits on this purchase and the run after it: the path, priced in Hindsight, puts the ending at 15–20 hours.
   */
  {
    id: 'inst.settlementCommission', name: 'Settlement Commission',
    blurb: 'A standing commission to hear the case for one more Industry kept at its sink line. It sits for years and reports in volumes.',
    cost: SETTLE_COMMISSION, effects: [{ type: 'settleSlotAdd', value: 1 }],
    nextLevels: levels(SETTLE_COMMISSION, [
      { effects: [{ type: 'settleSlotAdd', value: 1 }], label: 'A second sitting: room for the fifth' },
    ], [2.5]),
  },
  {
    id: 'inst.civilService', name: 'The Civil Service',
    blurb: 'Permanent officials who hold a line with the levers you give them, raise one when it is crossed, and ask for nothing.',
    cost: 120, effects: [{ type: 'orderUnlock', order: 'civilService' }],
    nextLevels: levels(120, [
      { effects: [{ type: 'offlineCapAdd', seconds: 4 * 3600 }], label: 'A night duty officer: the board keeps 12 hours while you are away' },
    ], [2.5]),
  },
  {
    id: 'inst.treasuryRules', name: 'Treasury rules',
    blurb: 'A standing rule that surplus money goes to the Commons, in an order agreed in advance. The minister need not be consulted.',
    cost: 280, requires: ['inst.civilService'], effects: [{ type: 'orderUnlock', order: 'treasury' }],
    nextLevels: levels(280, [
      { effects: [{ type: 'commonsYieldMul', value: 1.1 }], label: 'Value for money: every Commons project yields a tenth more' },
    ], [2.5]),
  },
  leverInstitution({
    id: 'inst.gridCode', name: 'Grid connection code',
    blurb: 'Data centres queue for power like everybody else, and are told to bring their own.',
    cost: 260, requires: ['inst.cleanAirAct'], lever: 'compute.substitution', leverName: 'Solar & storage', maxLevel: 3,
  }),
  {
    id: 'inst.engineeringGuild', name: 'Engineering guild',
    blurb: 'A profession with standards: nothing ships that no one has read.',
    cost: 350, requires: ['inst.gridCode'], effects: [startLever('code.reviewGate', 1)],
    nextLevels: levels(350, [
      { effects: [startLever('code.deletion', 1)], label: 'Deletion sprints are in the guild’s rules too' },
      { effects: [startLever('code.reviewGate', 2), startLever('code.sharedLibs', 1)], label: 'Stricter review; one shared library for all' },
    ]),
  },
  /*
   * M3: the standing dispatch order (OrdersState.dispatch): a closing automation for shift 3, after Treasury rules
   * (about hour 10; the brief asks hour 8 or later). It answers the chosen correspondents' letters with their default
   * arm; it never chooses. One level, one seat, which is its price. Appended last so the M2 loadout order is unchanged.
   */
  {
    id: 'inst.privateSecretary', name: 'A private secretary',
    blurb: 'Opens the letters, answers the ones you would have let lapse, and files the rest. You need never see them.',
    cost: 400, requires: ['inst.treasuryRules'], effects: [{ type: 'orderUnlock', order: 'dispatch' }],
  },
  /*
   * M4 (design §12): the Coal Age's two new Institutions, appended (the loadout order of M2/M3 is unchanged).
   *
   * The Fishery Board: the standing survey (design §2A.3: "the truth costs a seat or Mandate in every run once Fishing
   * is open"; Fishing cannot be settled unsurveyed, so the Act I ending needs it or a survey cruise or a letter). Priced
   * as a mid-shop Institution, about the Civil Service's: bought in run 7 or 8 with a run's Hindsight, so the seat is a
   * real choice against the Commission and the Civil Service rather than a second wait. Level 2 also holds the catch
   * to the surveyed surplus from the start (the survey quota at its first level, 90%). Shown once Fishing has opened
   * (InstitutionDef.when, the M4 amendment); the Inspector once Iron has.
   *
   * The Inspector of Furnaces: Iron's smoke inspector (clean smelting) at level 1 from minute one; levels as the other
   * lever Institutions. A cheaper seat than the Board: Iron's smoke is a nuisance, not the ending's gate.
   */
  {
    id: 'inst.fisheryBoard', name: 'The Fishery Board',
    blurb: 'A Board with a survey vessel and two naturalists, counting the banks every spring from minute one.',
    cost: 150, when: { owns: 'fishing', label: 'Fishing has opened' }, effects: [{ type: 'survey', sector: 'fishing' }],
    nextLevels: levels(150, [
      { effects: [startLever('fishing.surveyQuota', 1)], label: 'The survey quota at 90% of the surplus from the start' },
    ], [2.5]),
  },
  leverInstitution({
    id: 'inst.inspectorFurnaces', name: 'Inspector of Furnaces',
    blurb: 'An inspector with the right to enter any works, and a preference for charcoal and scrap wherever they still pay.',
    cost: 120, when: { owns: 'iron', label: 'Iron & Steel has opened' }, lever: 'iron.smokeInspector', leverName: 'Clean smelting', maxLevel: 3,
  }),
];
