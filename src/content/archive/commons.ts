/**
 * The Archive: the Commons (what restraint's money buys, 1823–2024). See index.ts for the rules.
 */
import type { ArchiveDef } from '../../types';

export const commonsArchive: ArchiveDef[] = [
  {
    id: 'arc.commons.baths',
    subject: 'commons.baths',
    title: 'The Baths and Washhouses Act, 1846',
    date: '1846',
    text:
      'In the crowded towns of the 1840s few houses had running water, let alone a bath, and cholera had made washing a ' +
      'public matter. The Baths and Washhouses Act, introduced by Sir George Grey and given royal assent on 26 August ' +
      '1846, was the first law to let British local authorities pay for public baths and wash-houses out of the rates. ' +
      'Boroughs built them by the dozen over the following decades, with boilers in the basement and a tall chimney ' +
      'above. Hot water for a whole street was a fine thing, and it was heated by the ton.',
    sources: [
      { cite: 'UK Parliament, Living Heritage: the Baths and Washhouses Act (Tyne and Wear case study)', url: 'https://webtest.parliament.uk/about/living-heritage/transformingsociety/towncountry/towns/tyne-and-wear-case-study/about-the-group/baths-and-washhouses/baths-and-washhouses-act', grade: 'V' },
      { cite: 'Baths and wash houses in Britain (royal assent 26 August 1846; Sir George Grey)', url: 'https://en.wikipedia.org/wiki/Baths_and_wash_houses_in_Britain', grade: 'S' },
    ],
  },
  {
    id: 'arc.commons.park',
    subject: 'commons.park',
    title: 'Birkenhead Park, 1847',
    date: '1847',
    text:
      'Birkenhead Park, laid out by Joseph Paxton under a local Improvement Act of 1843, opened on Easter Monday, 5 April ' +
      '1847; Historic England calls it the first municipally funded park in Britain. The commissioners paid for it by ' +
      'selling building plots around its edge. On 27 May 1850 a young American, Frederick Law Olmsted, walked through it ' +
      'and wrote that it was a democratic institution. Seven years later he and Calvert Vaux designed Central Park. The ' +
      'villas round Paxton’s lake sold well, and the town grew to meet them.',
    sources: [
      { cite: 'Historic England, Birkenhead Park (publication)', url: 'https://historicengland.org.uk/images-books/publications/birkenhead-park', grade: 'V' },
      { cite: 'Olmsted Network, “Olmsted’s first walk in a public park”', url: 'https://olmsted.org/olmsteds-first-walk-in-a-public-park/', grade: 'S' },
      { cite: 'Victorian Web, “Another glory on the Mersey’s side”: Birkenhead Park', url: 'https://victorianweb.org/art/parks/birkenhead/1.html', grade: 'S' },
    ],
  },
  {
    id: 'arc.commons.institute',
    subject: 'commons.institute',
    title: 'The London Mechanics’ Institution, 1823',
    date: '1823',
    text:
      'George Birkbeck, a physician who had lectured to Glasgow artisans, helped found the London Mechanics’ Institution ' +
      'in 1823 to teach working men science in the evenings, after their shifts. It survives as Birkbeck, University of ' +
      'London. Mechanics’ institutes spread to most industrial towns within a generation, with libraries, lecture halls ' +
      'and classes in chemistry and mechanics. The men who attended went back to the works and improved the machines. ' +
      'Education was a public good, and among its products was a great deal of cheaper power.',
    sources: [
      { cite: 'Birkbeck, University of London, history (founded 1823 as the London Mechanics’ Institution)', url: 'https://www.bbk.ac.uk/about-us/history', grade: 'S' },
      { cite: 'George Birkbeck', url: 'https://en.wikipedia.org/wiki/George_Birkbeck', grade: 'S' },
    ],
  },
  {
    id: 'arc.commons.library',
    subject: 'commons.library',
    title: 'Mr Ewart’s Act, 1850',
    date: '1850',
    text:
      'The Public Libraries Act of 1850, carried by William Ewart, gave English and Welsh boroughs the power to set up free ' +
      'public libraries out of the rates. The power was hedged: the rate was small, and it could be spent on buildings ' +
      'and staff but not on books, which had to be given. It established the principle all the same, and later Acts ' +
      'widened it. Free libraries kept long evening hours for working readers, and their reading rooms were lit, at first, ' +
      'by gas.',
    sources: [
      { cite: 'Public Libraries Act 1850 (William Ewart)', url: 'https://en.wikipedia.org/wiki/Public_Libraries_Act_1850', grade: 'S' },
      { cite: 'legislation.gov.uk, Acts of 1850 (13 & 14 Vict. c. 65)', url: 'https://www.legislation.gov.uk/1850?page=2', grade: 'S' },
    ],
  },
  {
    id: 'arc.commons.clock',
    subject: 'commons.clock',
    title: 'One time for the kingdom, 1880',
    date: '1847–1880',
    text:
      'Until the railways, every town kept its own time by the sun, and Bristol ran some ten minutes behind London. A ' +
      'timetable cannot work that way. The Railway Clearing House recommended London time for all lines from 1847, and ' +
      'town clocks followed the station clock, some with two minute hands. The Statutes (Definition of Time) Act of 1880 ' +
      'made Greenwich Mean Time the legal time of Great Britain. A public clock lit at night told everyone the same hour, ' +
      'and the hour, once shared, could be scheduled to the minute.',
    sources: [
      { cite: 'Railway time (Railway Clearing House, 1847; Bristol’s local time)', url: 'https://en.wikipedia.org/wiki/Railway_time', grade: 'S' },
      { cite: 'Statutes (Definition of Time) Act 1880', url: 'https://en.wikipedia.org/wiki/Statutes_(Definition_of_Time)_Act_1880', grade: 'S' },
    ],
  },
  {
    id: 'arc.commons.allotments',
    subject: 'commons.allotments',
    title: 'The Small Holdings and Allotments Act, 1908',
    date: '1908',
    text:
      'The Small Holdings and Allotments Act, given royal assent on 1 August 1908, consolidated the earlier law and placed ' +
      'a duty on councils in England and Wales to provide allotments where there was a demand for them. Plots of land ' +
      'for anyone who asked, to grow their own vegetables, had been a demand of reformers since enclosure took the ' +
      'commons. They came into their own in the two world wars, when Dig for Victory filled them. Most of them, in time, ' +
      'acquired a shed, and many of the sheds a stove.',
    sources: [
      { cite: 'Small Holdings and Allotments Act 1908 (8 Edw. 7 c. 36), s. 23', url: 'https://www.legislation.gov.uk/ukpga/Edw7/8/36/introduction', grade: 'V' },
    ],
  },
  {
    id: 'arc.commons.buses',
    subject: 'commons.buses',
    title: 'Buses, regulated and not, 1986',
    date: '1986',
    text:
      'For most of the century British towns ran their own buses, or licensed a few companies to, and fares were set ' +
      'with the town in mind. The Transport Act 1985 ended the licensing of bus services outside London from 26 October ' +
      'the next year. Operators could run what routes they liked; costs per bus-mile fell, and so did the average load on ' +
      'each bus, so that the cost of a passenger trip stayed much the same. Bus travel had been falling since the 1950s, ' +
      'as cars came in, and it went on falling.',
    sources: [
      { cite: 'Transport Act 1985 (commencement 26 October 1986)', url: 'https://www.legislation.gov.uk/ukpga/1985/67/introduction', grade: 'V' },
      { cite: 'Westminster Research, Thredbo 15 paper on the Bus Services Act (loads and costs after deregulation)', url: 'https://westminsterresearch.westminster.ac.uk/download/f72be495dd2b96585c327435e64a5deee911949688aa0a1ba8d2d75cfe884361/86339/Thredbo15%20Bus%20Services%20Act%20paper%20rev%205.pdf', grade: 'S' },
    ],
  },
  {
    id: 'arc.commons.shortWeek',
    subject: 'commons.shortWeek',
    title: 'The fifteen-hour week, 1930',
    date: '1930–2022',
    text:
      'In 1930, in the depths of the slump, John Maynard Keynes wrote an essay, “Economic Possibilities for our ' +
      'Grandchildren”, predicting that within a century productivity would make his readers’ grandchildren so rich that ' +
      '“three-hour shifts or a fifteen-hour week” would be enough. The productivity arrived; the hours did not, and most ' +
      'of the gain was taken as goods. In a British trial in 2022, 56 of the 61 firms that tried a four-day week kept it ' +
      'afterwards. Where the freed day went, the trial did not measure.',
    sources: [
      { cite: 'J. M. Keynes, “Economic Possibilities for our Grandchildren” (1930)', url: 'https://www.marxists.org/reference/subject/economics/keynes/1930/our-grandchildren.htm', grade: 'V' },
      { cite: 'design/research/restraint.md §3.6 (the UK four-day week pilot, 2022)', grade: 'S' },
    ],
  },
  {
    id: 'arc.commons.repair',
    subject: 'commons.repair',
    title: 'The first Repair Café, 2009',
    date: '2009–2024',
    text:
      'On Sunday 18 October 2009 the first Repair Café was held in the foyer of the Fijnhout Theater in Amsterdam-West: ' +
      'volunteers with soldering irons and sewing machines, and neighbours with broken things. It was meant as a single ' +
      'event, with backing from the city, and became a movement with groups in many countries. The European Union ' +
      'adopted a right-to-repair directive in 2024. A mended thing is a thing that need not be bought again, and the ' +
      'money not spent on it is spent on something else.',
    sources: [
      { cite: 'Repair Café International, about (first Repair Café, 18 October 2009)', url: 'https://www.repaircafe.org/en/about/', grade: 'S' },
      { cite: 'design/research/restraint.md §8 (EU Directive 2024/1799)', grade: 'S' },
    ],
  },
  {
    id: 'arc.commons.bankHolidays',
    subject: 'commons.bankHolidays',
    title: 'St Lubbock’s days, 1871',
    date: '1871',
    text:
      'The Bank Holidays Act of 1871, brought in by Sir John Lubbock, a banker and naturalist, named four days in England ' +
      'and Wales on which the banks would close: Easter Monday, Whit Monday, the first Monday in August and Boxing Day. ' +
      'Since little business could be done without the banks, nearly everyone else stopped too, and the days became ' +
      'holidays for all. Some called them St Lubbock’s days. The railway companies ran excursion trains to the coast, and ' +
      'filled them.',
    sources: [
      { cite: 'Bank Holidays Act 1871 (34 & 35 Vict. c. 17)', url: 'https://en.wikipedia.org/wiki/Bank_Holidays_Act_1871', grade: 'S' },
      { cite: 'Hansard, HC Deb 21 February 1871, vol. 204, cc. 661–2: Bank Holidays Bill', url: 'https://api.parliament.uk/historic-hansard/commons/1871/feb/21/bank-holidays-bill', grade: 'V' },
    ],
  },
  {
    id: 'arc.commons.welfareHall',
    subject: 'commons.welfareHall',
    title: 'A penny a ton, 1920',
    date: '1920',
    text:
      'Section 20 of the Mining Industry Act 1920, following a recommendation of the Sankey Commission, set up the ' +
      'Miners’ Welfare Fund, paid for by a levy on the colliery owners of a penny on every ton of coal raised. It was to be ' +
      'spent on the social wellbeing and recreation of mining communities: halls, institutes, libraries, baths at the pit ' +
      'head and brass bands. In 1921 it took in more than £675,000. The levy was later halved and extended. The finer ' +
      'the hall a village wanted, the more coal it needed to raise.',
    sources: [
      { cite: 'Mining Industry Act 1920 (10 & 11 Geo. 5 c. 50), s. 20', url: 'https://legislation.gov.uk/ukpga/1920/50/section/20/enacted', grade: 'V' },
      { cite: 'Hansard, written answers, 12 March 1923: Miners’ Welfare Fund (receipts for 1921)', url: 'https://api.parliament.uk/historic-hansard/written-answers/1923/mar/12/miners-welfare-fund', grade: 'V' },
    ],
  },
  {
    id: 'arc.commons.cycleTracks',
    subject: 'commons.cycleTracks',
    title: 'Western Avenue, 1934',
    date: '1934–1935',
    text:
      'In 1934 the Ministry of Transport opened a cycle track beside Western Avenue in west London, from Hanger Lane to ' +
      'Greenford Road, kerbed off from the motor traffic, after its engineers had studied the Dutch tracks. Leslie ' +
      'Hore-Belisha, the minister, declared it for the comfort and safety of cyclists. The cyclists’ organisations ' +
      'opposed it, fearing that tracks would be used to push them off the roads. A census in 1935 found more than 84 per ' +
      'cent of cyclists using it. The road beside it filled with cars.',
    sources: [
      { cite: 'Hansard, HC Deb 22 May 1935, vol. 302, cc. 334–5: cycle tracks', url: 'https://api.parliament.uk/historic-hansard/commons/1935/may/22/cycle-tracks', grade: 'V' },
      { cite: 'Londonist, “When London’s cyclists said no to segregated lanes” (2014)', url: 'https://londonist.com/2014/08/when-londons-cylists-said-no-to-segregated-lanes', grade: 'S' },
    ],
  },
];
