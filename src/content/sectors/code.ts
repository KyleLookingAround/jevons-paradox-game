/**
 * Code (on screen an Industry): its SectorDef and applications, upgrades, levers and its own headlines.
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { HeadlineKey, LeverDef, SectorDef, UpgradeDef } from '../../types';
import {
  eta, capCost, margin, absorb, sat, half, chain, fork, ladder, lever, RECYCLE, CAP_LABEL, CAP_FIRST, SUFF_LABEL,
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
  service: { name: 'Working features', unit: 'features' },
  resource: { name: 'Human attention', unit: 'hours' },
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
const codeUpgrades: UpgradeDef[] = [
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
    blurb: 'Every wheel already invented, free, and maintained by one person in Nebraska.',
    cost: 6_000_000, requires: ['code.autocomplete'], effects: [capCost('code', 0.6)],
  },
];

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
    name: 'Usage caps',
    blurb: 'So many hours of human attention a week for the agents’ output, and no more. Rate limits for the reviewers.',
    catch: `Every rival is lifting its limits. Customers notice whose are lower. ${DIVIDEND}`,
    values: CAP_VALUES, value2: CAP_LEAK, cost: 550, upkeep: 0.25, label: CAP_LABEL, labels: CAP_FIRST,
    repeat: { value2Step: 0.5 }, recycle: RECYCLE,
  }),
];

/* ------------------------------------------------------------------ */
/* HEADLINES (Content.sectorHeadlines)                                 */
/* ------------------------------------------------------------------ */

const codeHeadlines: Partial<Record<HeadlineKey, string[]>> = {
  efficiency: [
    'Code written ten times faster; read exactly as slowly',
    'Productivity “transformed”; the backlog somehow longer',
    'New tool writes the feature; the old team maintains it',
    'Developers feel faster, measure slower, ship more anyway',
  ],
  sectorOpened: [
    'Software now free to write; reading it a personal matter',
    'Code for anyone: the backlog opens to the public',
    'Every idea now has an app; most of them are still running',
  ],
  appFounded: [
    '{app} ships Friday; the pager rota is drawn up Monday',
    '{app} goes live; nobody recalls commissioning it',
  ],
  backfire: [
    'Features ten times cheaper; attention spent on them up twelvefold',
    'Agents save a million hours; reviewers lose two million',
  ],
  crisis: [
    'Outage traced to a library nobody knew they used',
    'Half the internet down; cause “a small configuration change”',
    'Maintainers drown in machine-written bug reports',
    'Outage No. {n}: the status page is also down',
  ],
  collapse: [
    'The Great Outage: every system down, nobody knows why',
    'Code stock buckles under its own weight; nothing ships',
    'Nothing works, and there is far too much of it',
  ],
  exhausted: [
    'Attention runs out: not one more pull request can be read',
    'No one left to review anything; merges halt',
    'The last reviewer resigns; the queue reaches the horizon',
  ],
};

export const code: SectorContent = {
  def: sector, upgrades: codeUpgrades, levers: codeLevers, headlines: codeHeadlines,
};
