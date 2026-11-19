/**
 * Code (on screen an Industry): its SectorDef and applications, upgrades, levers and its own headlines.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { HeadlineKey, LeverDef, SectorDef, UpgradeDef } from '../../types';
import {
  eta, capCost, margin, absorb, sat, half, chain, fork, ladder, lever, withStages, decadeSequence, RECYCLE, CAP_LABEL, CAP_FIRST, SUFF_LABEL,
  CAP_VALUES, CAP_LEAK, SUFF_VALUES, DIVIDEND,
} from '../helpers';
import type { SectorContent } from '../helpers';

/* ------------------------------------------------------------------ */
/* CODE: the Industry                                                  */
/* ------------------------------------------------------------------ */

const sector: SectorDef = {
  id: 'code',
  name: 'Code',
  years: '2025–',
  firstYear: 2025,
  tagline: 'Software is now free to write. Reading it remains a personal matter.',
  service: { name: 'Features', unit: 'features', unitSingular: 'feature' },
  resource: { name: 'Human attention', unit: 'hours', unitSingular: 'hour' },
  pressure: { name: 'Code stock', crisisName: 'The Great Outage' },
  accent: 'diff',
  theme: 'agentic',

  basePrice: 1,
  capCost: 0.02,
  margin: 0.2,
  baseEta: 1,
  autoEtaRate: 0,

  resourceKind: 'flow',
  /** Attention capacity per second at population 1. */
  reserve: 50_000,
  alpha: 0.5,

  pressureSource: 'service',
  pressureIntensity: 0.000001,
  absorption: 0,
  collapseAt: 1000,
  crisisAt: [0.3, 0.6, 0.85],
  pressureWellbeingCost: 15,
  /** At P = 500 half the attention goes on keeping what exists alive. */
  pressureUpkeep: 50,

  wellbeingWeight: 4,
  wellbeingScale: 100_000,

  /*
   * M2: Code has absorption 0, so its sinkR is null and its clear skies come only from deletion: the code stock must be
   * deleted down to the clear level and deletion must at least match what ships. clearBelow stays at the global half
   * (written here so nobody removes it thinking it does nothing). The ceiling is 0.2 of collapse, not 0.25: Code's
   * first crisis comes at 0.3. No dividend here may add absorption.
   */
  steady: {
    clearBelow: 0.5,
    clearCeiling: 0.2,
    decadeChoices: decadeSequence([
      ['div.code.featureFreeze', 'div.code.shipIt'],
      ['div.code.refactoringWeek', 'div.code.hackathon'],
    ]),
  },

  /*
   * M2: Settlement. Standing while settled: a point of wellbeing (nobody is paged at night) and an easier Mandate; once
   * a run, a purse of Mandate. Defence 0.35 Mandate/s per unit of excess, the dearest of the five: every new user
   * expects the features everyone else has.
   */
  settle: {
    dividend: [{ type: 'wellbeingAdd', value: 1 }, { type: 'mandateRateMul', value: 1.05 }, { type: 'mandateAdd', value: 300 }],
    upkeepPerSpill: 0.35,
    freeExcess: 0.05,
    blurb: 'Released v1.0. Changed: nothing, on purpose. Known issue: none we intend to fix.',
  },

  drawsOn: { sector: 'compute', perService: 0.5 },
  /*
   * v1 gated Code on compute price < 0.015, which no greedy play reached (critique). The milestones below come within
   * about ten minutes of Compute opening, so four Reckonings are the real gate: about hour 4 of competent play.
   */
  unlock: {
    minReckonings: 4,
    when: {
      all: [
        { owns: 'compute.virtualisation', label: 'Own Virtualisation' },
        { stat: 'serviceDelivered', sector: 'compute', op: '>=', value: 200_000, label: '200,000 PFLOP·years computed' },
      ],
    },
  },

  /* M3: Code's mechanic is its M2 one, named: the code stock with upkeep (pressureUpkeep) and deletion as the only sink. */
  mechanic: {
    name: 'The code stock',
    rebound: 'Maintenance',
    blurb: 'Everything shipped must be kept. Upkeep eats the attention that writes the next feature; only deletion shrinks it.',
  },

  applications: [
    {
      id: 'code.internalTools',
      name: 'Internal tools',
      blurb: 'The spreadsheet that ran payroll, rewritten as an app that runs payroll.',
      icon: 'wrench',
      halfPrice: 1.5,
      saturation: 60_000,
      steepness: 1.5,
      visibleBelow: Infinity,
      foundCost: 0,
    },
    {
      id: 'code.personalApps',
      name: 'Throwaway personal apps',
      blurb: 'A bespoke app to split one restaurant bill. Kept in production indefinitely.',
      icon: 'phone-app',
      halfPrice: 0.5,
      saturation: 600_000,
      steepness: 2.2,
      visibleBelow: 0.7,
      foundCost: 3_000_000,
    },
    {
      id: 'code.rewrites',
      name: 'Legacy rewrites',
      blurb: 'Thirty years of COBOL, rewritten over a weekend. The bugs, faithfully.',
      icon: 'scroll',
      halfPrice: 0.2,
      saturation: 3_000_000,
      steepness: 2,
      visibleBelow: 0.3,
      foundCost: 30_000_000,
    },
    {
      id: 'code.chatbots',
      name: 'Chatbots on everything',
      blurb: 'The toaster now has opinions, a privacy policy and a release schedule.',
      icon: 'chatbot',
      halfPrice: 0.09,
      saturation: 20_000_000,
      steepness: 2.6,
      visibleBelow: 0.14,
      foundCost: 100_000_000,
    },
    {
      id: 'code.agentsForAgents',
      name: 'Agents writing for agents',
      blurb: 'Software commissioned by software, reviewed by software, for software.',
      icon: 'robots',
      halfPrice: 0.03,
      saturation: 100_000_000,
      steepness: 3,
      visibleBelow: 0.08,
      foundCost: 300_000_000,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* UPGRADES                                                            */
/* ------------------------------------------------------------------ */

/* ---- Code: chain to ×480 ---- */
/* M2 stages (the scene's agents): the chat assistant 1, the coding agent 2, agent fleets 3 (autocomplete is the caret). */
const codeUpgrades: UpgradeDef[] = withStages([
  ...chain('code', ladder(1_500_000, 7, 4), [
    {
      id: 'code.autocomplete', name: 'Autocomplete', fold: 3,
      blurb: 'It finishes your lines. Then your functions. Then your sentences.',
    },
    {
      id: 'code.chat', name: 'Chat assistant', fold: 12,
      blurb: 'Describe the feature; argue with it until it exists.',
    },
    {
      id: 'code.agent', name: 'Coding agent', fold: 60,
      blurb: 'Give it the ticket and go to lunch. Come back to a pull request.',
    },
    {
      id: 'code.fleets', name: 'Agent fleets', fold: 480,
      blurb: 'A hundred agents, one backlog, no lunch. You are now the reviewer.',
    },
  ]),

  /* Fork 1: who reads it. */
  ...fork(
    {
      id: 'code.agentReviewers', sector: 'code', kind: 'efficiency',
      name: 'Agent reviewers',
      blurb: 'Machines review what machines wrote. Review gets cheap, so everything gets shipped.',
      cost: 20_000_000, requires: ['code.chat'],
      effects: [eta('code', 1.5), sat('code', 1.3)],
    },
    {
      id: 'code.seniorReview', sector: 'code', kind: 'capital',
      name: 'Senior review',
      blurb: 'Someone who remembers why it was written that way. Slower, and some of the code even gets smaller.',
      cost: 20_000_000, requires: ['code.chat'],
      effects: [eta('code', 1.1), absorb('code', 0.0005)],
    },
  ),

  /* Fork 2: how to charge. */
  ...fork(
    {
      id: 'code.perSeat', sector: 'code', kind: 'capital',
      name: 'Per-seat pricing',
      blurb: 'Charge for every agent as if it were an employee. It is cheaper than one, so hire forty.',
      cost: 40_000_000, requires: ['code.agent'],
      effects: [margin('code', 0.03)],
    },
    {
      id: 'code.perToken', sector: 'code', kind: 'capital',
      name: 'Pay as you go',
      blurb: 'A fraction of a penny a request. Nobody counts fractions of a penny, so nobody stops.',
      cost: 40_000_000, requires: ['code.agent'],
      effects: [half('code', 1.3), margin('code', 0.01)],
    },
  ),

  {
    id: 'code.openSource', sector: 'code', kind: 'capital',
    name: 'Open source everything',
    blurb: 'Every wheel already invented, free, and kept turning by one unpaid volunteer.',
    cost: 6_000_000, requires: ['code.autocomplete'], effects: [capCost('code', 0.6)],
  },
], { 'code.chat': [1, 'Chat assistant'], 'code.agent': [2, 'Coding agent'], 'code.fleets': [3, 'Agent fleet'] });

/* ------------------------------------------------------------------ */
/* LEVERS                                                              */
/* ------------------------------------------------------------------ */

const codeLevers: LeverDef[] = [
  /* ---- Code ---- */
  lever({
    id: 'code.deletion', sector: 'code', kind: 'deletion',
    name: 'Deletion sprints',
    blurb: 'A fortnight in which the only acceptable pull request removes something.',
    catch: 'Spends attention you could be shipping with. Nobody gets promoted for it.',
    values: [0.05, 0.1, 0.2], value2: [0.001, 0.0012, 0.0015], cost: 600, upkeep: 0.3,
    label: 'Spend {pct}% of attention deleting', repeat: { value2Step: 0.0002 },
  }),
  lever({
    id: 'code.reviewGate', sector: 'code', kind: 'reviewGate',
    name: 'Review gates',
    blurb: 'Nothing ships until a person has read it. All of it.',
    catch: 'Shipping slows to the speed of reading. Which was rather the point.',
    values: [0.2, 0.35, 0.5], cost: 500, upkeep: 0.12, label: 'Review {pct}% of changes',
  }),
  lever({
    id: 'code.sharedLibs', sector: 'code', kind: 'sharedLibs',
    name: 'Shared libraries',
    blurb: 'One date picker for the whole company, instead of one per agent.',
    catch: 'Someone has to own the date picker. It will be you.',
    values: [0.25, 0.45, 0.65], cost: 450, upkeep: 0.1, label: 'Reuse {pct}% of new code',
  }),
  lever({
    id: 'code.sufficiency', sector: 'code', kind: 'sufficiency',
    name: 'Don’t build it',
    blurb: 'Before writing the app, ask whether a spreadsheet, or nothing, would do.',
    catch: 'The agents are idle and faintly reproachful. The backlog is shorter.',
    values: SUFF_VALUES, value2: [0.003, 0.004, 0.005], cost: 400, upkeep: 0.1, label: SUFF_LABEL,
    repeat: { value2Step: 0.0005 },
  }),
  lever({
    id: 'code.usageCap', sector: 'code', kind: 'cap',
    requires: ['budget'],
    name: 'Usage caps',
    blurb: 'So many hours of human attention a week for the agents’ output, fewer each decade, and not one more.',
    catch: `Every rival is lifting its limits. Customers notice whose are lower. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 550, upkeep: 0.25, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
    recycleBlurb: { commons: 'Spent on the Commons: a repair café for old laptops, which go on to run a great many more agents.' },
  }),
  /*
   * M3: the lever that bites back (design/long-game.md: agent reviewers). Machines review what machines wrote, so review
   * stops being the bottleneck (etaMul per step: features per hour of attention); review that cheap means more is
   * shipped (satMul on every use, × bite × level), unless the review gate keeps a person reading.
   */
  lever({
    id: 'code.machineReview', sector: 'code', kind: 'measure',
    name: 'Machine review',
    blurb: 'An agent reads every pull request before a person is asked to. Most of the time, nobody is asked.',
    catch: 'Review stops being the bottleneck, so it stops limiting what ships.',
    values: [1, 2, 3], cost: 450, upkeep: 0.1, label: 'Machine review, tier {n}',
    labels: { 0: 'Review the small changes', 1: 'Review most changes', 2: 'Review everything' },
    effects: [eta('code', 1.15)],
    sideEffects: {
      effects: [sat('code', 1.12)],
      rampYears: 20, decayYears: 25,
      unless: { owns: 'code.reviewGate' },
      blurb: 'Cheap review ships everything the agents write.',
      unlessLabel: 'unless the review gates keep a person reading',
    },
  }),
];

/* ------------------------------------------------------------------ */
/* HEADLINES (Content.sectorHeadlines)                                 */
/* ------------------------------------------------------------------ */

const codeHeadlines: Partial<Record<HeadlineKey, string[]>> = {
  /* Code's broadsheet is a changelog (CHANGELOG.md): Added, Changed, Fixed, Removed, Deprecated, Known issue, Released. */
  efficiency: [
    'Changed: code written ten times faster; read exactly as slowly',
    'Changed: productivity “transformed”; backlog somehow longer',
    'Added: a tool that writes the feature; the old team maintains it',
    'Changed: developers feel faster, measure slower, ship more anyway',
    'Changed: generation ten times faster; review speed unchanged',
    'Changed: lines written per day up again; nobody asked which lines',
  ],
  sectorOpened: [
    'Added: software anyone can write; reading it remains optional',
    'Added: the backlog, now open to the public',
    'Added: an app for every idea; most of them still running',
  ],
  appAvailable: [
    'Proposed: {app}; estimate “a weekend”',
    'Planned: {app}, pending someone to read it',
    'Proposed: {app}; nobody objected in time',
    'Unreleased: {app}, behind a feature flag nobody remembers',
  ],
  appFounded: [
    'Added: {app}; the pager rota is drawn up on Monday',
    'Added: {app}; nobody recalls commissioning it',
    'Added: {app}, with tests, some of which test something',
    'Added: {app}; see also: maintenance, indefinitely',
  ],
  backfire: [
    'Known issue: features ten times cheaper; attention spent up twelvefold',
    'Known issue: agents save a million hours; reviewers lose two million',
    'Known issue: every change smaller, and the changes beyond counting',
  ],
  crisis: [
    'Fixed: outage caused by a dependency nobody knew they had',
    'Fixed: half the internet down after “a small configuration change”',
    'Known issue: maintainers buried in machine-written bug reports',
    'Fixed: outage No. {n}; the status page was also down',
    'Security: agent granted itself admin rights; access “under review”',
  ],
  collapse: [
    'Known issue: every system down; nobody can find the cause',
    'Known issue: code stock buckles under its own weight; nothing ships',
    'Known issue: nothing works, and there is far too much of it',
  ],
  exhausted: [
    'Known issue: attention exhausted; not one more pull request read',
    'Blocked: no reviewers left; all merges halted',
    'Known issue: last reviewer resigns; the queue reaches the horizon',
  ],
  leverEnacted: [
    'Changed: new policy merged; enforcement “in a later release”',
    'Added: a process; velocity down, incidents down, morale contested',
    'Changed: rule enforced on main; three teams fork the repository',
    'Added: a policy, a linter for the policy, a meeting about the linter',
  ],
  leverLapsed: [
    'Reverted: the policy, as “slowing us down”',
    'Deprecated: the review rule; nobody followed it anyway',
    'Removed: the guardrail, in a hotfix',
  ],
  budgetDrawn: [
    'Added: an attention budget, smaller each decade',
    'Added: a limit on the {resource} the agents may spend',
  ],
  decade: [
    'Released v{n}.0: within the attention budget; no breaking changes',
    'Released v{n}.0: ten more years, and the codebase hardly larger',
  ],
  budgetBroken: [
    'Reverted: the attention budget; “we will fix it next quarter”',
    'Known issue: attention over budget; streak reset',
  ],
  steadySector: [
    'Stable: fifty years inside the line; the pager has not rung',
    'Released: half a century of {sector}, with a short changelog',
  ],
  reckoning: [
    'Postmortem: blameless, and apparently causeless',
    'Released: a retrospective; action items carried over',
  ],
  /* M2 */
  clearSkies: [
    'Fixed: code stock below the clear threshold for the first time',
    'Removed: more lines than were added this quarter',
    'Changed: the pager rota is now mostly a formality',
  ],
  settled: [
    'Deprecated: the roadmap. Code is settled',
    'Changed: feature freeze made permanent; Code settled',
    'Known issue: none. Code settled at current scope',
  ],
  /* M3 */
  biteBack: [
    'Changed: review automated; merged pull requests up fourfold',
    'Known issue: every change reviewed, by something; the stock doubles',
    'Added: an agent that approves the agents; approval rate 100%',
  ],
  unsettled: [
    'Added: everything on the backlog. Code unsettled',
    'Changed: feature freeze lifted; the agents resume',
    'Known issue: settlement lapsed; scope creep restored',
  ],
};

export const code: SectorContent = {
  def: sector, upgrades: codeUpgrades, levers: codeLevers, headlines: codeHeadlines,
};
