/**
 * Charters (M2): one of two starting situations offered at each Reckoning, for the next run. A Charter acts like a
 * seated Institution for that run only (standing and start-of-run effects; one-offs ignored). Mild, always on, no goal:
 * each suggests a different way to play the run and tilts one rebound, which its blurb names along with its cost.
 * None is strictly better than another. The draw indexes this list in content order: append, never reorder.
 * (In their own module rather than prestige.ts so the draw-order list stands alone and prestige.ts stays under 450
 * lines as more Charters arrive; see README.md.)
 * Content is data (see README.md): every number and word here is read by the core and the UI; no game rules.
 */
import type { CharterDef } from '../types';
import { absorb, capCost, half, margin, reserve, sat, startLever } from './helpers';

/* ------------------------------------------------------------------ */
/* CHARTERS                                                            */
/* ------------------------------------------------------------------ */

/*
 * Magnitudes: about one Know-how level's worth each (a reserveAdd of 0.2 is under two levels of Deep-mining surveys;
 * startCapitalMul 3 is one level of Seed capital), paid for by a cost of similar size. Balance checks every Charter
 * within ±15% of the mean Hindsight per minute.
 */
export const charters: CharterDef[] = [
  {
    /* Supply-side rebound: more coal, found cheaply, burned sooner. */
    id: 'charter.northernCoalfield', name: 'The Northern Coalfield', sector: 'steam', landmark: 'deepShaft',
    blurb: 'Deep seams under the moor and engine shops in every town. More coal than any run before, and engines cheap enough to burn it all.',
    effects: [reserve('steam', 0.2), capCost('steam', 0.92)],
  },
  {
    /* Frontier rebound: the first big use is there before the first engine is improved. */
    id: 'charter.cottonTowns', name: 'The Cotton Towns', sector: 'steam', landmark: 'millTown',
    blurb: 'The mills are built and waiting for power from the first minute. Every thrifty engine finds a loom ready to use what it saves.',
    effects: [{ type: 'startFounded', app: 'steam.mills' }],
  },
  {
    /* Lends a cap for a run, to a player who has never seated it; the cap is paid for in income. */
    id: 'charter.smokeCommissioners', name: 'The Smoke Commissioners', sector: 'steam',
    blurb: 'The borough’s ceiling on coal, on trial for one run, without the Act. The furnaces that would move away begin to look outside the boundary.',
    effects: [{ type: 'institutionLoan', id: 'inst.smokeAbatement', level: 1 }, margin('steam', -0.01)],
    requires: { not: { owns: 'inst.smokeAbatement' } },
  },
  {
    /* Unlocks Steam's locked fork: burn the smoke, or blow the fire harder. Which, is the run. */
    id: 'charter.smokeInquiry', name: 'The Smoke Nuisance Inquiry', sector: 'steam',
    blurb: 'A select committee asks every mill owner how he fires his boilers. Two new answers on the table, and only one may be chosen.',
    effects: [{ type: 'unlock', id: 'steam.smokeFurnace' }, { type: 'unlock', id: 'steam.forcedDraught' }],
  },
  {
    /* Sufficiency from the first minute; appetite is lower, and so is everything sold. */
    id: 'charter.temperanceTown', name: 'A Temperance Town', sector: 'steam', landmark: 'chapel',
    blurb: 'The chapel came before the colliery and the pledge before the engine. Wants are modest from the start, and so are the takings.',
    effects: [startLever('steam.sufficiency', 1), margin('steam', -0.01)],
  },
  {
    /* A fast start that reaches the wall faster; the City takes its share of every sale. */
    id: 'charter.londonMoney', name: 'Money from London',
    blurb: 'A heavy purse from the City at the start, at interest. The run begins quickly, and every horsepower sold pays a little to London.',
    effects: [{ type: 'startCapitalMul', value: 3 }, margin('steam', -0.02), margin('light', -0.01)],
  },
  {
    /* Utilisation rebound: a gasworks built for the evening peak wants the night sold too. */
    id: 'charter.gaslitBorough', name: 'The Gaslit Borough', sector: 'light', landmark: 'gasholder',
    blurb: 'A gasworks already built, and mains under every street. The night shift starts on the first evening, so that the holder never stands full.',
    effects: [{ type: 'startFounded', app: 'light.nightShifts' }, capCost('light', 0.9)],
    requires: { owns: 'light', label: 'Light has opened in some run' },
  },
  {
    /* Restraint: cleaner air and smaller families, slower to grow and slower to get rich. */
    id: 'charter.gardenParish', name: 'The Garden Parish', sector: 'steam', landmark: 'orchard',
    blurb: 'Orchards, a commons and families of four. The air clears faster and the town grows slowly, and so does the purse.',
    effects: [absorb('steam', 0.002), { type: 'popGrowthMul', value: 0.94 }, { type: 'startCapitalMul', value: 0.6 }],
  },
  {
    /* Frontier rebound at its largest: the railway arrives first, and every engine after is bought to feed it. */
    id: 'charter.railwayMania', name: 'Railway Mania', sector: 'steam', landmark: 'viaduct',
    blurb: 'The line is surveyed, the shares are sold and the navvies are on site. Railways from the start, and every card dearer: the capital is all in rails.',
    effects: [{ type: 'startFounded', app: 'steam.railways' }, { type: 'costMul', value: 1.1 }, half('steam', 1.05, 'steam.railways')],
  },
  {
    /* The time rebound: a short week from the first day, spent on excursions. */
    id: 'charter.saturdayHalf', name: 'The Saturday Half-Holiday', sector: 'steam',
    blurb: 'The works close at noon on Saturdays. Everyone is a little better off, and the excursion trains are full every weekend once there are any.',
    effects: [{ type: 'wellbeingAdd', value: 1.5 }, sat('steam', 1.1, 'steam.railways'), margin('steam', -0.01)],
  },
  /* ---- M3: locked Charters, History rewards (histories.ts) ----
   * Left out of the draw until a History unlocks them (CharterDef.locked); each also `requires` its History cleared,
   * which an M2 core reads as false, so no save's offers change. Appended: never reorder what is above. */
  {
    /* Supply-side rebound, deeper: the dear coal is within reach from the start. */
    id: 'charter.deepPits', name: 'The Deep Pits', sector: 'steam', landmark: 'deepShaft', locked: true,
    blurb: 'Shafts sunk past the Low Main by the last owners and left to flood. The deep coal is half paid for, and dearer to raise.',
    effects: [
      { type: 'costMulOf', id: 'steam.seam.lowMain', value: 0.5 }, { type: 'costMulOf', id: 'steam.seam.hutton', value: 0.5 },
      { type: 'resourcePriceMul', sector: 'steam', value: 1.05 },
    ],
    requires: { owns: 'history.islandNation' },
  },
  {
    /* Economy-wide rebound: the dividend is spent, and the town grows on it. */
    id: 'charter.dividendTown', name: 'The Dividend Town', sector: 'steam', landmark: 'chapel', locked: true,
    blurb: 'A coal duty from the first year, and every penny of it paid back to the households. The town is content, and larger every census.',
    effects: [startLever('steam.duty', 1), { type: 'wellbeingAdd', value: 1 }, { type: 'popGrowthMul', value: 1.1 }],
    requires: { owns: 'history.feeAndDividend' },
  },
  /* ---------------- M4 (design §12): the Coal Age's new Industries. Appended (the draw indexes content order). ------ */
  {
    /* Embodied rebound from the first minute: Rails founded before the run starts makes Steam's engines cheaper to build
     * (Iron's order book), and Steam's coal rises. Margin up a point: the price of being the workshop. Rails is not free
     * in Iron, so the gift is real; so is the bill on Steam's line. */
    id: 'charter.blackCountry', name: 'The Black Country', sector: 'iron',
    blurb: 'Furnaces from Wolverhampton to Dudley, and the first rails already rolled. Every engine in the land is cheaper to build, and burns.',
    effects: [{ type: 'startFounded', app: 'iron.rails' }, margin('iron', 0.01)],
    requires: { owns: 'iron', label: 'Iron & Steel has opened in some run' },
  },
  {
    /* The frontier rebound in Fishing: the fish train's quay is laid before the run (the card at a quarter of its price),
     * and fresh fish finds a city market at once; the appetite for it grows a tenth (the rebound named). */
    id: 'charter.fishTrains', name: 'The Fish Trains', sector: 'fishing',
    blurb: 'The railway companies have laid the fish sidings already. The catch is in Billingsgate by dawn, and the city wants more of it.',
    effects: [{ type: 'costMulOf', id: 'fishing.fishTrain', value: 0.25 }, sat('fishing', 1.1, 'fishing.freshFish')],
    requires: { owns: 'fishing', label: 'Fishing has opened in some run' },
  },
  {
    /* A cartel's run: prices held, margins two points up, and the coke duty off the table for the run (forbid). The
     * restraint lever the player would reach for first is gone; the others remain. */
    id: 'charter.ironmastersRing', name: 'The Ironmasters’ Ring', sector: 'iron',
    blurb: 'The masters meet quarterly at the Stork Hotel and agree a price. Takings are handsome, and no duty on coke will pass this session.',
    effects: [margin('iron', 0.02), { type: 'forbid', id: 'iron.cokeDuty' }],
    requires: { owns: 'iron', label: 'Iron & Steel has opened in some run' },
  },
  {
    /* The Survey on loan: surveyed for one run (the Fishery Board at level 1), offered only once Fishing has opened and
     * only to a player without the Board. The Board's levy is a point of Fishing's margin. */
    id: 'charter.fisheryBoard', name: 'A Fishery Board on Trial', sector: 'fishing',
    blurb: 'The Board’s vessel and its naturalists, voted for one season of grants. The banks are counted for a run, and the levy is on the catch.',
    effects: [{ type: 'institutionLoan', id: 'inst.fisheryBoard', level: 1 }, margin('fishing', -0.01)],
    requires: { all: [{ owns: 'fishing', label: 'Fishing has opened in some run' }, { not: { owns: 'inst.fisheryBoard' } }] },
  },
];
