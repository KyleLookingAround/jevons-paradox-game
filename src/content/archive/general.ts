/**
 * The Archive: general notes: the economists and the evidence, the reception of The Coal Question, and restraint that
 * worked (and how). Their subjects are Institutions, Know-how and achievements, so they unlock as those are first
 * owned or earned. See index.ts for the rules. Living scholars are cited, not named in the text.
 */
import type { ArchiveDef } from '../../types';
import { hansardCoal1913 } from './sources';

const restraint = (s: string) => ({ cite: `design/research/restraint.md ${s}`, grade: 'S' as const });
const energy = (s: string) => ({ cite: `design/research/energy.md ${s}`, grade: 'S' as const });

export const generalArchive: ArchiveDef[] = [
  {
    id: 'arc.general.jevons',
    subject: 'firstReckoning',
    title: 'Mr Jevons, 1835–1882',
    date: '1835–1882',
    text:
      'William Stanley Jevons was born in Liverpool in 1835, worked as an assayer at the new Sydney Mint in his early ' +
      'twenties, and came home to study political economy. The Coal Question made his name at 29; his Theory of ' +
      'Political Economy of 1871 helped found the marginal school of economics. He drowned while bathing near Bexhill ' +
      'in August 1882, aged 46. Keynes, in a memoir, recorded that Jevons had laid in such a stock of writing and ' +
      'packing paper, against its future scarcity, that his children had not used it up decades after his death.',
    sources: [
      { cite: 'Dictionary of National Biography, vol. 29, “Jevons, William Stanley”', url: 'https://kwx.liehendr.com/content/wikisource_en_all_maxi_2022-09/A/Page%3ADictionary_of_National_Biography_volume_29.djvu/381', grade: 'S' },
      energy('§1.6 (Keynes’s memoir of Jevons, 1936; paraphrased)'),
    ],
  },
  {
    id: 'arc.general.royalCommission',
    subject: 'inst.royalCommission',
    title: 'The Royal Commission finds plenty, 1871',
    date: '1866–1913',
    text:
      'Partly in answer to Jevons, a Royal Commission on Coal Supplies was appointed in 1866 under the Duke of Argyll. It ' +
      'reported in 1871, at great length, that the country had an abundant supply of coal for the present, reckoning on ' +
      'the order of 146 billion tons workable within 4,000 feet. A retrospective in 1901 judged that its chief error had ' +
      'been to assume that exports would stay at about twelve million tons a year. British output then nearly trebled, ' +
      'to 287.3 million tons in 1913, and never reached so high again.',
    sources: [
      energy('§1.5 (Royal Commission on Coal Supplies; the 1901 retrospective, Papers Past)'),
      { cite: 'The Spectator, 12 August 1871, “The exhaustion of coal”', url: 'https://archive.spectator.co.uk/article/12th-august-1871/9/the-exhaustion-of-coal', grade: 'S' },
      hansardCoal1913,
    ],
  },
  {
    id: 'arc.general.statisticsOffice',
    subject: 'inst.statisticsOffice',
    title: 'The Khazzoom–Brookes postulate, 1980–1992',
    date: '1980–1992',
    text:
      'Jevons was half forgotten for a century. In 1980 an economist argued in the Energy Journal that California’s new ' +
      'appliance standards had ignored the extra use that cheaper running would bring; through the 1980s the chief ' +
      'economist of the United Kingdom Atomic Energy Authority argued that efficiency raised energy demand across the ' +
      'whole economy. In 1992 a third economist named their claim the Khazzoom–Brookes postulate: that “with fixed real ' +
      'energy prices, energy efficiency gains will increase energy consumption above what it would be without these ' +
      'gains.” The argument has continued ever since, with better statistics on both sides.',
    sources: [
      { cite: 'H. D. Saunders, “The Khazzoom–Brookes Postulate and Neoclassical Growth”, Energy Journal 13(4) (1992)', url: 'https://econpapers.repec.org/RePEc:aen:journl:1992v13-04-a07', grade: 'S' },
      energy('§7 (Khazzoom 1980; Brookes)'),
    ],
  },
  {
    id: 'arc.general.backfire',
    subject: 'backfire',
    title: 'How much rebound, 2007',
    date: '2007–2021',
    text:
      'The UK Energy Research Centre’s review of 2007 gathered the evidence on rebound. For households in rich countries ' +
      'the direct effect, more use of the same service, was generally under 30 per cent: most of an efficiency saving ' +
      'survived. The economy-wide effect, through cheaper production, growth and respending, was larger and poorly ' +
      'measured, and a review of 2021 put it at possibly more than half. Backfire, a rebound above 100 per cent, is best ' +
      'documented where a general-purpose technology was young and cheap power opened new uses: steam, and light.',
    sources: [
      { cite: 'S. Sorrell, The Rebound Effect: an assessment of the evidence for economy-wide energy savings from improved energy efficiency (UKERC, 2007)', url: 'https://ukerc.ac.uk/publications/the-rebound-effect-an-assessment-of-the-evidence-for-economy-wide-energy-savings-from-improved-energy-efficiency/download', grade: 'V' },
      { cite: 'P. E. Brockway et al., Renewable and Sustainable Energy Reviews 141 (2021): 110781', url: 'https://www.creds.ac.uk/publications/energy-efficiency-and-economy-wide-rebound-effects-a-review-of-the-evidence-and-its-implications/', grade: 'V' },
    ],
  },
  {
    id: 'arc.general.overplayed',
    subject: 'jevonsWasRight',
    title: 'Overplayed, 2013',
    date: '1972–2013',
    text:
      'Not everyone thinks Jevons was right about everything. In Nature in 2013 four economists argued that the rebound ' +
      'effect, though real, was overplayed and had become a distraction, and that it was no excuse for inaction on ' +
      'efficiency. Their best witness is the American refrigerator: the average new model used about 1,941 ' +
      'kilowatt-hours a year in 1972 and about 587 in 2002, while growing larger and cheaper. Efficiency saved energy ' +
      'there because almost every household already had one fridge, and standards forced the gains. A saturated use ' +
      'is where efficiency finally saves.',
    sources: [
      { cite: 'K. Gillingham, M. J. Kotchen, D. S. Rapson, G. Wagner, “The rebound effect is overplayed”, Nature 493 (2013): 475–476', url: 'https://cases.som.yale.edu/sites/default/files/Gillingham-Kotchen_2013_Nature.pdf', grade: 'V' },
      { cite: 'J. E. McMahon, ACEEE Summer Study 2004 (refrigerator energy use, 1972–2002)', url: 'https://aceee.org/files/proceedings/2004/data/papers/SS04_Panel11_Paper02.pdf', grade: 'S' },
    ],
  },
  {
    id: 'arc.general.lightingRebound',
    subject: 'ach.backfire.light',
    title: 'Three hundred years of light, misread, 2010–2012',
    date: '2010–2012',
    text:
      'In 2010 a group led from Sandia National Laboratories reported that over three centuries, ' +
      'six continents and five lighting technologies, the world had spent its gains in lighting efficiency almost ' +
      'entirely on more light: a rebound of about 100 per cent. Newspapers took this to mean that efficient lamps were ' +
      'pointless. Two of the authors replied in 2012 that they had said no such thing: more light was a benefit, and ' +
      'better lamps were still worth having. The light had been wanted. That was the point.',
    sources: [
      { cite: 'J. Y. Tsao, H. D. Saunders et al., “Solid-state lighting: an energy-economics perspective”, Journal of Physics D 43 (2010); Sandia news release', url: 'https://newsreleases.sandia.gov/led_energy/', grade: 'S' },
      { cite: 'H. D. Saunders and J. Y. Tsao, “Rebound effects for lighting”, Energy Policy 49 (2012): 477–478', url: 'https://econpapers.repec.org/RePEc:eee:enepol:v:49:y:2012:i:c:p:477-478', grade: 'S' },
    ],
  },
  {
    id: 'arc.general.montreal',
    subject: 'steadyState',
    title: 'The treaty that worked, 1987',
    date: '1987–2066',
    text:
      'The Montreal Protocol, signed on 16 September 1987, phased out the chemicals destroying the ozone layer; it was ' +
      'the first United Nations treaty ratified by every country. Its substitutes, the HFCs, were potent greenhouse ' +
      'gases, so the Kigali Amendment of 2016 began phasing those out too. The ozone over Antarctica is expected to ' +
      'recover to its 1980 level around 2066. It worked because the producers were few, substitutes existed, the crisis ' +
      'was visible and a fund paid poorer countries’ costs. All four are rare.',
    sources: [restraint('§4.1 (Montreal Protocol; Kigali Amendment; Scientific Assessment Panel 2022)')],
  },
  {
    id: 'arc.general.acidRain',
    subject: 'inst.smokeAbatement',
    title: 'A cap that held, 1990–2020',
    date: '1990–2020',
    text:
      'The American Clean Air Act Amendments of 1990 capped the sulphur dioxide emitted by power stations and let them ' +
      'trade allowances under the cap, from 1995. Emissions from the programme’s sources fell to 778,000 tons by 2020, ' +
      '95 per cent below 1990, by the Environmental Protection Agency’s count. Allowances proved far cheaper than ' +
      'feared, helped by low-sulphur coal and cheaper scrubbers, and in time the cap was so slack that their price fell ' +
      'nearly to nothing. A ceiling written into law did what thriftier boilers had not.',
    sources: [restraint('§2.1 (EPA Acid Rain Program progress reports)')],
  },
  {
    id: 'arc.general.leaded',
    subject: 'ach.clear.motion',
    title: 'Ninety-nine years of leaded petrol, 1921–2021',
    date: '1921–2021',
    text:
      'Thomas Midgley, a General Motors chemist, found in late 1921 that tetraethyl lead stopped engines knocking. In 2002 ' +
      'leaded petrol was still sold in 117 countries. The last, Algeria, stopped in July 2021, and the United Nations ' +
      'Environment Programme announced the end of leaded petrol worldwide, 99 years and seven months after its ' +
      'invention. Midgley also developed the chlorofluorocarbon refrigerants that the Montreal Protocol would later ban. ' +
      'Two of the century’s great phase-outs undid the work of one man.',
    sources: [restraint('§4.2 (UNEP, August 2021)')],
  },
  {
    id: 'arc.general.ostrom',
    subject: 'ach.tenCommons',
    title: 'Governing the commons, 1990',
    date: '1968–2009',
    text:
      'In 1968 Garrett Hardin wrote in Science that freedom in a commons brings ruin to all. Elinor Ostrom spent her ' +
      'career finding commons that had not been ruined: Swiss alpine pastures, Japanese village forests, the irrigation ' +
      'tribunals of Valencia. In Governing the Commons, 1990, she set out eight principles that long-lived commons ' +
      'shared, among them clear boundaries, monitoring and graduated sanctions; a review of 112 studies in 2010 found ' +
      'them robust. She received the Nobel memorial prize in economics in 2009, the first woman to do so.',
    sources: [
      restraint('§6.1 (Ostrom; Cox, Arnold and Villamayor-Tomás 2010; Hardin 1968)'),
      { cite: 'The Nobel Prize, Elinor Ostrom, Prize in Economic Sciences 2009', url: 'https://www.nobelprize.org/prizes/economic-sciences/2009/ostrom/facts/', grade: 'V' },
    ],
  },
  {
    id: 'arc.general.norway',
    subject: 'inst.sovereignFund',
    title: 'The spending rule, 1990',
    date: '1990–2025',
    text:
      'Norway created its Government Petroleum Fund by law in 1990 and made its first transfer in 1996, just under two ' +
      'billion kroner. Renamed the Government Pension Fund Global in 2006, it is governed by a rule that the state may ' +
      'spend only the expected real return each year, now 3 per cent. At the end of 2025 it held about 21 trillion ' +
      'kroner. The oil is still pumped and sold. What the rule changed is that a stock spent once became an income ' +
      'spent for ever.',
    sources: [restraint('§11.1 (Norges Bank Investment Management; the fiscal rule)')],
  },
  {
    id: 'arc.general.decoupling',
    subject: 'ach.century.steam',
    title: 'Decoupling, rare and slow, 2020–2023',
    date: '2020–2023',
    text:
      'A systematic review in 2020 screened more than 11,500 papers and analysed 835 studies of whether economies had ' +
      'grown while using less. Examples of absolute long-term decoupling were rare, it concluded, though some rich ' +
      'countries had recently managed it for carbon. A study of 2023 found eleven high-income countries that had cut ' +
      'consumption-based emissions while growing, between 2013 and 2019, and calculated that at those rates they would ' +
      'take more than 220 years to cut emissions by 95 per cent. Decoupling happens. Steady State takes longer.',
    sources: [
      { cite: 'H. Haberl et al., “A systematic review of the evidence on decoupling of GDP, resource use and GHG emissions, part II”, Environmental Research Letters 15 (2020)', grade: 'S' },
      { cite: 'J. Vogel and J. Hickel, “Is green growth happening?”, Lancet Planetary Health (2023)', grade: 'S' },
      restraint('§10.2'),
    ],
  },
  {
    id: 'arc.general.climateCommittee',
    subject: 'inst.climateCommittee',
    title: 'Carbon budgets in law, 2008',
    date: '2008–2019',
    text:
      'The Climate Change Act of 2008 made Britain the first country to set a legally binding long-term target for cutting ' +
      'its emissions, and set up an independent committee to advise on carbon budgets: ceilings on emissions for ' +
      'five-year periods, legislated years in advance. In 2019 the target was tightened to net zero by 2050. A ' +
      'budget fixed years ahead is harder for the next government to wave away, though any later Parliament may amend ' +
      'the Act.',
    sources: [restraint('§11.2 (Climate Change Act 2008; the Climate Change Committee)'), { cite: 'Climate Change Act 2008', url: 'https://www.legislation.gov.uk/ukpga/2008/27/contents', grade: 'V' }],
  },
  {
    id: 'arc.general.alkali',
    subject: 'inst.alkaliInspectorate',
    title: 'The Alkali Inspectorate, 1863',
    date: '1863–1865',
    text:
      'The Leblanc soda works poured hydrochloric acid gas into the air, killing hedges and crops for miles. The Alkali ' +
      'Act of 1863 required that at least 95 per cent of it be condensed, and the Board of Trade appointed a chemist, ' +
      'Robert Angus Smith, with four sub-inspectors, to see that it was. His first report found condensation running at ' +
      'nearly 99 per cent. It was among the first laws anywhere to put inspectors in charge of what came out of a ' +
      'chimney. The condensed acid ran into the rivers instead.',
    sources: [
      { cite: 'Hansard, HL Deb 22 May 1865, vol. 179, cc. 631–6: Alkali Act, inspector’s report', url: 'https://api.parliament.uk/historic-hansard/lords/1865/may/22/alkali-act-inspectors-report', grade: 'V' },
      { cite: 'Alkali Act 1863', url: 'https://en.wikipedia.org/wiki/Alkali_Act_1863', grade: 'S' },
    ],
  },
  {
    id: 'arc.general.proprietorsDay',
    subject: 'ach.m3.proprietor',
    title: 'More work for mother, 1974–1983',
    date: '1974–1983',
    text:
      'In 1974 a sociologist, comparing time diaries back to the 1920s, reported that full-time American housewives spent ' +
      'no less time on housework than their grandmothers had, despite the washing machine, the vacuum cleaner and the ' +
      'refrigerator. In 1983 a historian explained why in More Work for Mother: the machines raised the standard of clean ' +
      'and moved onto one person work that servants and family had shared. Later researchers ' +
      'dispute the diaries. The labour-saving machine had saved effort; it had not, on that evidence, saved ' +
      'time.',
    sources: [
      { cite: 'R. S. Cowan, More Work for Mother: The Ironies of Household Technology from the Open Hearth to the Microwave (Basic Books, 1983)', grade: 'V' },
      { cite: 'J. Vanek, “Time Spent in Housework”, Scientific American 231(5) (November 1974)', grade: 'S' },
      { cite: 'Harms and Gershuny (UCL), re-examination of the diary evidence', url: 'https://discovery-pp.ucl.ac.uk/id/eprint/10072385/1/Harms_sow073.pdf', grade: 'S' },
    ],
  },
  {
    id: 'arc.general.civilService',
    subject: 'kh.civilService',
    title: 'Appointment by open competition, 1854–1870',
    date: '1854–1870',
    text:
      'In 1854 Sir Stafford Northcote and Sir Charles Trevelyan reported that the civil service was filled by patronage ' +
      'and recommended that clerks be recruited by competitive examination and promoted on merit. The Civil Service ' +
      'Commission began examining candidates the next year, and an Order in Council of 1870 made open competition the ' +
      'rule for most departments. A permanent, impartial service could hold a policy steady across changes of ' +
      'government, which was its virtue and, to some ministers, its fault.',
    sources: [{ cite: 'Northcote–Trevelyan Report (1854); Order in Council of 4 June 1870', url: 'https://en.wikipedia.org/wiki/Northcote%E2%80%93Trevelyan_Report', grade: 'S' }],
  },
];

/*
 * M4 (the text lane): the Act I credits note and "years at this year's rate" (the reach backwards of The Survey: "years of coal
 * left" was always years at this year's rate). A separate export until the Act lane registers the letter its first
 * note hangs on: archive/index.ts appends ...generalArchiveM4 after ...generalArchive. The Act lane may re-point
 * arc.general.coalAgeEnd at the Act I achievement ("The Coal Age, Settled") once its id exists; until then it unlocks
 * with the Gazette's supplement letter, which asks for exactly this history.
 */
export const generalArchiveM4: ArchiveDef[] = [
  {
    id: 'arc.general.coalAgeEnd',
    subject: 'd.age.coal.supplement',
    title: 'The end of the Coal Age, 1913',
    date: '1913',
    text:
      'Great Britain raised 287.3 million tons of coal in 1913, the most it ever raised in a year. The engines that ' +
      'burned it were the thriftiest the world had seen, and the iron that carried it was the cheapest; the railways, ' +
      'the steamers, the furnaces and the gasworks had all grown on the saving. The next year the war came, and output ' +
      'never reached that figure again. The Coal Age did not end because the coal ran out or because anyone settled it. ' +
      'It ended because something else became cheaper.',
    sources: [hansardCoal1913],
  },
  {
    id: 'arc.general.yearsLeft',
    subject: 'steam.coalQuestion',
    title: 'Years at this year’s rate',
    date: '1871–1913',
    text:
      'The number of years a reserve will last is the reserve divided by a year’s use, and the answer depends entirely on ' +
      'which year. The Royal Commission on Coal Supplies, reporting in 1871, divided by something close to the year it ' +
      'had: a retrospective of 1901 found its chief error in supposing that exports would stay at about twelve million ' +
      'tons. Output nearly tripled instead, to 287.3 million tons in 1913. No figure in the report was false. The ' +
      'arithmetic was sound and the assumption sat in the divisor, where nobody reads it.',
    sources: [
      { cite: 'The Press (Christchurch), 6 July 1901, retrospective on the Royal Commission of 1871 (Papers Past)', url: 'https://paperspast.natlib.govt.nz/newspapers/CHP19010706.2.33', grade: 'S' },
      { cite: 'The Spectator, 12 August 1871, “The Exhaustion of Coal”', url: 'https://archive.spectator.co.uk/article/12th-august-1871/9/the-exhaustion-of-coal', grade: 'S' },
      energy('§1.5 (the Commission, 1866–1871; the exports assumption) and §1.2 (output to 1913)'),
      hansardCoal1913,
    ],
  },
];
