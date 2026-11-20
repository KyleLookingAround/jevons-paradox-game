/**
 * The Archive: the Ministry and Motion's M5 additions (M5, the text lane). See index.ts for the rules. A separate module
 * until the registry adds it: archive/index.ts appends ...chairArchive after ...motionArchive (display order only).
 * Subjects: Motion's new uses and its congestion charge (the coverage lint), Sir Edmund Pryce (the cast) and two of his
 * letters. Sources were checked by the text lane on 20 Nov 2026 (design/scratch/m5-text-progress.md) or are marked
 * [V]/[S] in design/research/restraint.md, or are those design/m5-design.md lists as checked. No living person is
 * named in a note's text.
 */
import type { ArchiveDef } from '../../types';

type Source = ArchiveDef['sources'][number];
const stockholm: Source = { cite: 'design/research/restraint.md §7.2 (the Stockholm trial and referendum; support before and after) [R25]', grade: 'S' };
const eliasson: Source = { cite: 'J. Eliasson, “The Stockholm congestion charges: five years on”, CTS Working Paper 2012:3', url: 'https://www.transportportal.se/SWoPEc/CTS2012-3.pdf', grade: 'V' };
const lightTrucks: Source = { cite: 'design/research/restraint.md §5.1 (the 8,500 lb definition from 1980; EIA and Pew figures) [R17]', grade: 'S' };
const footprint2006: Source = { cite: 'NHTSA, Average Fuel Economy Standards for Light Trucks, Model Years 2008–2011, final rule, 71 Fed. Reg. 17566 (6 April 2006)', url: 'https://regulations.justia.com/regulations/fedreg/2006/04/06/06-3151.html', grade: 'V' };
const footprint2009: Source = { cite: 'NHTSA, Average Fuel Economy Standards, Passenger Cars and Light Trucks, Model Year 2011, final rule, 74 Fed. Reg. 14196 (30 March 2009)', url: 'https://www.govinfo.gov/link/fr/74/14196', grade: 'V' };
const hansardFreight: Source = { cite: 'Hansard, HC Deb 1 July 1981, vol. 7, c. 412W: freight statistics (rail 14 per cent, road 78 per cent of inland freight, 1980)', url: 'https://api.parliament.uk/historic-hansard/written-answers/1981/jul/01/freight-statistics', grade: 'V' };
const freight1953: Source = { cite: 'Rail freight in Great Britain (1953: 89 billion tonne-km; rail 42%, road 36%, water 22%)', url: 'https://en.wikipedia.org/wiki/Rail_freight_in_Great_Britain', grade: 'S' };
const oneFalseMove: Source = { cite: 'M. Hillman, J. Adams and J. Whitelegg, One False Move: A Study of Children’s Independent Mobility (Policy Studies Institute, 1990)', url: 'https://ora.ox.ac.uk/objects/uuid:89103856-a239-489a-8e7e-b6c1bad43a0f', grade: 'V' };
const overnight: Source = { cite: 'FedEx Express (operations began 17 April 1973: 14 aircraft, 25 cities, 186 packages)', url: 'https://en.wikipedia.org/wiki/FedEx_Express', grade: 'S' };
const stigler: Source = { cite: 'G. J. Stigler, “The Theory of Economic Regulation”, Bell Journal of Economics and Management Science 2(1) (1971): 3–21', url: 'https://ideas.repec.org/a/rje/bellje/v2y1971ispringp3-21.html', grade: 'V' };
const epaVw: Source = { cite: 'US EPA, “EPA, California Notify Volkswagen of Clean Air Act Violations” (18 September 2015)', url: 'https://www.epa.gov/archive/epa/newsreleases/epa-california-notify-volkswagen-clean-air-act-violations-carmaker-allegedly-used.html', grade: 'V' };
const epaTestimony: Source = { cite: 'US EPA, testimony to the House Energy and Commerce oversight hearing (8 October 2015): road testing by West Virginia University and the ICCT', url: 'https://www.epa.gov/sites/production/files/2015-10/documents/epa-grundler-brooks-testimony-_oct_8_hec_oversight_hearing_-vw.pdf', grade: 'V' };
const reg443: Source = { cite: 'Regulation (EC) No 443/2009 of 23 April 2009 setting emission performance standards for new passenger cars, recitals 7–9 and Article 1', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009R0443', grade: 'V' };

export const chairArchive: ArchiveDef[] = [
  /* ---- Motion under the Ministry ---- */
  {
    id: 'arc.chair.charge',
    subject: 'motion.charge',
    title: 'Stockholm changes its mind, 2006–2013',
    date: '2006–2013',
    text:
      'Stockholm tried a congestion charge from 3 January to 31 July 2006. Traffic across the cordon fell by about a ' +
      'fifth, and was still about a fifth lower five years later, although the city had grown. Before the trial about ' +
      '36 per cent of residents supported the idea. A referendum after it gave a majority for keeping the charge in ' +
      'the city itself, though the county as a whole voted against, and by 2013 support was above 70 per cent. ' +
      'Researchers who followed it called the pattern a syndrome: opposition before, support after. The charge had ' +
      'not changed. What the voters had seen had.',
    sources: [stockholm, eliasson],
  },
  {
    id: 'arc.chair.lightTrucks',
    subject: 'motion.lightTrucks',
    title: 'Vans with seats in the back, 1980–2002',
    date: '1980–2002',
    text:
      'The American fuel economy law of 1975 gave light trucks their own, easier standard, and in 1980 the definition ' +
      'of a light truck was extended to vehicles of up to 8,500 pounds. Sport utility vehicles and people carriers were ' +
      'built to fall inside it. Light trucks went from under a tenth of light vehicles in 1979 to nearly 45 per cent ' +
      'in 2000, and by 2002 they outsold cars. One study found that their rise had actually driven down the fleet’s ' +
      'efficiency through the 1990s, while every vehicle in each class met its target.',
    sources: [lightTrucks],
  },
  {
    id: 'arc.chair.footprint',
    subject: 'motion.fourByFours',
    title: 'The footprint rule, 2006–2011',
    date: '2006–2011',
    text:
      'In April 2006 the American regulator reformed the light-truck standard so that each vehicle’s target depended ' +
      'on its footprint, the area between its four wheels, with larger vehicles given lower targets; the reformed ' +
      'standard was compulsory from model year 2011. A rule of March 2009 set footprint-based targets for cars as well ' +
      'as light trucks. The aim was to stop makers being punished for selling large vehicles to people who wanted ' +
      'them. Its effect at the margin was that a bigger vehicle carried an easier target, and the fleet grew larger.',
    sources: [footprint2006, footprint2009],
  },
  {
    id: 'arc.chair.haulage',
    subject: 'motion.haulage',
    title: 'From the goods yard to the junction, 1953–1980',
    date: '1953–1980',
    text:
      'In 1953 about 89 billion tonne-kilometres of goods were moved in Great Britain, 42 per cent of them by rail, 36 ' +
      'per cent by road and the rest by water. The motorways and the heavier lorry did the rest. By 1980, a ' +
      'Parliamentary answer estimated, rail carried 14 per cent of inland freight and road 78 per cent. The warehouse ' +
      'moved from the goods yard to the motorway junction, where land was cheap and every town was within a day’s ' +
      'drive, and the lorries ran full in one direction and often empty in the other.',
    sources: [freight1953, hansardFreight],
  },
  {
    id: 'arc.chair.schoolRun',
    subject: 'motion.schoolRun',
    title: 'One false move, 1971–1990',
    date: '1971–1990',
    text:
      'In 1971 a survey of English schools found that 80 per cent of seven- and eight-year-olds were allowed to go to ' +
      'school without an adult. The same survey, repeated in the same five areas in 1990, found 9 per cent. The ' +
      'authors linked the change to traffic: the more parents drove, the more dangerous the roads seemed to the ' +
      'parents who did not, and the more of them drove too. The journey to school, half a mile on foot, became two ' +
      'car journeys a day, one of them empty.',
    sources: [oneFalseMove],
  },
  {
    id: 'arc.chair.nextDay',
    subject: 'motion.nextDay',
    title: 'Overnight, through one hub, 1973',
    date: '1973',
    text:
      'On the night of 17 April 1973 an American courier began flying parcels overnight through a single hub: 14 small ' +
      'jets, 25 cities and, that first night, 186 packages. The idea was that a parcel should travel further in order to ' +
      'arrive sooner, every route passing through one sorting centre in the small hours. Next-day delivery became a ' +
      'promise that the whole trade had to match, by air, by road and finally by van to the doorstep, and each saving ' +
      'in the cost of a delivery was spent on more of them.',
    sources: [overnight],
  },

  /* ---- Sir Edmund Pryce and his letters ---- */
  {
    id: 'arc.chair.stigler',
    subject: 'pryceChair',
    title: 'The theory of economic regulation, 1971',
    date: '1971',
    text:
      'In 1971 the Chicago economist George Stigler opened a paper with a sentence that has been quoted ever since: as a ' +
      'rule, regulation is acquired by the industry and is designed and operated primarily for its benefit. He treated ' +
      'regulation as a good like any other, supplied by the state and bought by those who valued it most, usually the ' +
      'few firms with much at stake rather than the many customers with a little each. Lobbying, litigation and ' +
      'carefully drafted exemptions were costs a firm weighed against the cost of complying. The paper is one origin of ' +
      'the phrase regulatory capture.',
    sources: [stigler],
  },
  {
    id: 'arc.chair.defeatDevice',
    subject: 'd.chair.pryceMonthly',
    title: 'The test and the road, 2015',
    date: '2015',
    text:
      'On 18 September 2015 the United States Environmental Protection Agency and the California Air Resources Board ' +
      'notified Volkswagen that some of its diesel cars carried software that detected when the car was being tested ' +
      'and switched on the full emission controls only then. In normal driving the cars emitted nitrogen oxides at 10 ' +
      'to 40 times the standard. The official tests had not found it. Road testing by West Virginia University for the ' +
      'International Council on Clean Transportation had: the figures measured where nobody was looking were not the ' +
      'figures returned.',
    sources: [epaVw, epaTestimony],
  },
  {
    id: 'arc.chair.voluntary',
    subject: 'd.chair.pryceVoluntary',
    title: 'A commitment, and then a regulation, 2009',
    date: '2009',
    text:
      'European carmakers, through their association, adopted a voluntary commitment to bring the average emissions ' +
      'of the new cars they sold down to 140 grams of carbon dioxide a kilometre by 2008. A regulation of 23 April ' +
      '2009 recorded the commitment and the progress made towards it, and replaced it with a binding average of 130 ' +
      'grams for new cars, phased in from 2012, with penalties for every gram over. The agreement had been cheaper to ' +
      'sign than a law. The law was what followed it.',
    sources: [reg443],
  },
];
