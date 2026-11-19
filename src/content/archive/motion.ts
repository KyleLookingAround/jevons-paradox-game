/**
 * The Archive: Motion (oil and the road, 1946–2000, with its consequences). See index.ts for the rules.
 */
import type { ArchiveDef } from '../../types';
import { durantonTurner2011, epaTrends } from './sources';

const marchetti = {
  cite: 'C. Marchetti, “Anthropological invariants in travel behavior”, Technological Forecasting and Social Change 47 (1994): 75–88 (IIASA RR-95-04)',
  url: 'https://pure.iiasa.ac.at/id/eprint/4071/1/RR-95-04.pdf', grade: 'V',
} as const;
const knittel = {
  cite: 'C. R. Knittel, “Automobiles on Steroids: Product Attribute Trade-Offs and Technological Progress in the Automobile Sector”, American Economic Review 101(7) (2011): 3368–3399',
  url: 'https://www.ourenergypolicy.org/wp-content/uploads/2012/07/aer.101.7.pdf', grade: 'V',
} as const;

export const motionArchive: ArchiveDef[] = [
  {
    id: 'arc.motion.industry',
    subject: 'motion',
    title: 'The hour a day, 1994',
    date: '1994',
    text:
      'In 1994 the Italian physicist Cesare Marchetti gathered travel surveys from across the world and found the same ' +
      'number in nearly all of them: people spend about an hour a day getting about, whether they walk, ride or drive. He ' +
      'credited the finding to an earlier transport researcher, who had called it the travel time budget. Its corollary ' +
      'is that faster travel does not save time; it buys distance. The village that walked to the next village became the ' +
      'suburb that drove to the next town, in the same hour.',
    sources: [marchetti],
  },
  {
    id: 'arc.motion.radial',
    subject: 'motion.radial',
    title: 'The radial tyre, 1946',
    date: '1946–1949',
    text:
      'Michelin filed the patent for its radial tyre on 4 June 1946: cords running straight across from bead to bead, ' +
      'under a belt of steel. The engineer usually credited is Marius Mignol. A radial flexed less as it rolled, so it ' +
      'wasted less energy, wore more slowly and gripped better. The tyre went on sale as the X, about 1949, and rival ' +
      'makers had to wait years for the patent to run out. Radials took over most of the world’s cars within a few ' +
      'decades. Each mile cost a little less in petrol and rubber, and there were a great many more miles.',
    sources: [
      { cite: 'Michelin UK, “The triumph of the radial tyre” (patent filed 4 June 1946)', url: 'https://news.michelin.co.uk/articles/the-triumph-of-the-radial-tyre', grade: 'S' },
      { cite: 'Radial tire (Marius Mignol; the X, 1949)', url: 'https://en.wikipedia.org/wiki/Radial_tire', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.injection',
    subject: 'motion.injection',
    title: 'Fuel injection, 1954–1967',
    date: '1954–1967',
    text:
      'A carburettor mixes petrol with air by suction and approximation. Injection meters it. The Mercedes-Benz 300 SL of ' +
      '1954 used a Bosch mechanical system to spray petrol straight into the cylinders, the first four-stroke production ' +
      'car to do so. Bosch’s electronic D-Jetronic followed in 1967 on the American Volkswagen 1600, to help it meet ' +
      'California’s exhaust rules. Precise metering was what catalytic converters later needed to work, and injection ' +
      'became universal. The engines were thriftier and more powerful at once, and the power was generally taken.',
    sources: [
      { cite: 'Mercedes-Benz, milestones: 300 SL (W 198), first four-stroke production car with direct injection', url: 'https://mercedes-benz.com/en/innovation/milestones/mercedes-benz-300-sl-gullwing-w-198', grade: 'S' },
      { cite: 'Bosch press archive, “Fifty years ago: Bosch makes gasoline injection electronic” (D-Jetronic, 1967)', url: 'https://www.bosch-presse.de/pressportal/de/en/fifty-years-ago-bosch-makes-gasoline-injection-electronic-125568.html', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.leanBurn',
    subject: 'motion.leanBurn',
    title: 'Lean burn against the catalyst, 1985–1989',
    date: '1985–1989',
    text:
      'In the 1980s the European Community argued over how to clean car exhausts. Ford and the other British-based makers ' +
      'preferred lean-burn engines, which burned more air and less petrol and made less carbon monoxide; Germany pressed ' +
      'for the three-way catalytic converter, as used in America. Lean burn still needed a catalyst of its own for ' +
      'hydrocarbons, and Volkswagen reported in 1989 that it was clean only at low speeds. The catalyst won. The British ' +
      'government noted in 1989 that the new standards would do nothing for carbon dioxide and might make it worse.',
    sources: [
      { cite: 'Hansard, HC Deb 26 April 1989, vol. 151, cc. 933–4: catalytic converters', url: 'https://api.parliament.uk/historic-hansard/commons/1989/apr/26/catalytic-converters', grade: 'V' },
      { cite: 'Hansard, HL Deb 13 December 1988, vol. 502, cc. 817–9: emission standards, lean-burn engine', url: 'https://api.parliament.uk/historic-hansard/lords/1988/dec/13/emission-standards-lean-burn-engine', grade: 'V' },
      { cite: 'Commercial Motor, “Lean forward”, 1 February 1986; “Speeding lean burn is unclean, says VW”, 2 February 1989', url: 'https://archive.commercialmotor.com/article/2nd-february-1989/26/speeding-lean-burn-is-unclean-says-vw', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.aero',
    subject: 'motion.aero',
    title: 'The jelly mould, 1982',
    date: '1982',
    text:
      'Air resistance grows with the square of speed, so at motorway speeds most of a car’s fuel goes on pushing air ' +
      'aside. In 1982 Audi’s third-generation 100, with flush side windows and wipers tucked out of the wind, recorded a ' +
      'drag coefficient of 0.30, a record for a production saloon. Ford’s Sierra, launched the same year at about 0.34, ' +
      'was mocked as a jelly mould. Within a decade most family cars were rounded the same way, and looked it. The fuel ' +
      'saved at speed made speed cheaper.',
    sources: [
      { cite: 'Audi MediaCenter, “After windschnittig comes form vollendet” (Audi 100 C3, Cd 0.30)', url: 'https://www.audi-mediacenter.com/en/press-releases/after-windschnittig-comes-form-vollendet-a-new-special-exhibition-at-the-audi-museum-mobile-16117', grade: 'S' },
      { cite: 'Motor Sport, May 2010, Ford Sierra Cosworth (Sierra at 0.34)', url: 'https://www.motorsportmagazine.com/archive/article/may-2010/122/ford-sierra-cosworth', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.hybrid',
    subject: 'motion.hybrid',
    title: 'The first mass-produced hybrid, 1997',
    date: '1997',
    text:
      'The first-generation Toyota Prius went on sale in Japan on 10 December 1997, the first mass-produced car to pair a ' +
      'petrol engine with an electric motor and a battery that recovered energy under braking. Toyota had hurried it to ' +
      'market to coincide with the Kyoto climate conference that month. About 123,000 of the first model were sold. Later ' +
      'generations sold by the million, and hybrid drive spread to every class of car, including the largest, where it ' +
      'made a heavy vehicle cheaper to run.',
    sources: [
      { cite: 'Engineering and Technology History Wiki, IEEE Milestone: Toyota Prius, the World’s First Mass-Produced Hybrid Vehicle, 1997', url: 'https://ethw.org/Milestones:Toyota_Prius,_the_World%27s_First_Mass-Produced_Hybrid_Vehicle,_1997', grade: 'S' },
      { cite: 'Toyota, 75 years: vehicle lineage, Prius (released 10 December 1997)', url: 'https://www.toyota-global.com/company/history_of_toyota/75years/vehicle_lineage/car/id60012360/index.html', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.economyStandard',
    subject: 'motion.economyStandard',
    title: 'The fleet standard, 1975',
    date: '1975–1985',
    text:
      'After the oil embargo of 1973 the United States Congress passed the Energy Policy and Conservation Act of 1975, ' +
      'which required each maker’s new cars to average 27.5 miles per gallon within ten years, roughly double the level ' +
      'of the day. The target was met in 1985. Light trucks, then about a fifth of new sales, were given a separate and ' +
      'lower standard. For about two decades after the early 1980s, the Environmental Protection Agency’s figures show, ' +
      'cars grew heavier and more powerful and fleet fuel economy stopped improving, and then fell.',
    sources: [
      { cite: 'design/research/restraint.md §5.1 (EPCA 1975; 27.5 mpg; light trucks)', grade: 'S' },
      epaTrends,
    ],
  },
  {
    id: 'arc.motion.mileageRule',
    subject: 'motion.mileageRule',
    title: 'Vans are not cars, 1979–2025',
    date: '1979–2025',
    text:
      'Under the American fuel economy rules a vehicle classed as a light truck met an easier target than a car, and the ' +
      'definition reached as far as 8,500 pounds from 1980. Sport utility vehicles were built to it. Light trucks rose from ' +
      'under a tenth of light vehicles in 1979 to nearly 45 per cent in 2000, and a study for the Pew climate institute found that their rise ' +
      '“actually drove down fleetwide efficiency during the 1990s.” By the Environmental Protection Agency’s 2025 report, ' +
      'truck-based utility vehicles alone were about half of all new American vehicles. The rule worked; the boundary ' +
      'moved.',
    sources: [
      { cite: 'design/research/restraint.md §5.1 (EIA and Pew figures on light trucks)', grade: 'S' },
      epaTrends,
    ],
  },
  {
    id: 'arc.motion.horsepower',
    subject: 'motion.horsepower',
    title: 'Automobiles on steroids, 1980–2006',
    date: '1980–2006',
    text:
      'Between 1980 and 2006 American cars and light trucks became far more efficient engines and barely more economical ' +
      'vehicles. An economist at the Massachusetts Institute of Technology calculated that if their weight, horsepower ' +
      'and torque had been held at 1980 levels, fuel economy could have risen by nearly 60 per cent. It rose by about 15. ' +
      'Average weight went up by about a quarter and horsepower more than doubled. The engineers had delivered the ' +
      'savings; the customers spent them on size and speed.',
    sources: [knittel],
  },
  {
    id: 'arc.motion.reliefRoads',
    subject: 'motion.reliefRoads',
    title: 'The fundamental law of road congestion, 2011',
    date: '2011',
    text:
      'Two urban economists compared the growth of interstate highways in American cities with the growth of driving on ' +
      'them, and found that vehicle-kilometres travelled rose almost exactly in proportion to lane-kilometres built: an ' +
      'elasticity of about one. The new traffic came from residents driving more, from commercial traffic and from people ' +
      'moving in. Building public transport made no measurable difference to the driving. They called the result the ' +
      'fundamental law of road congestion, and published it in 2011, some decades after the roads.',
    sources: [durantonTurner2011],
  },
  {
    id: 'arc.motion.roadPricing',
    subject: 'motion.roadPricing',
    title: 'From Smeed to the congestion charge, 1964–2006',
    date: '1964–2006',
    text:
      'In 1964 a Ministry of Transport panel under Reuben Smeed of the Road Research Laboratory reported that charging ' +
      'for road space by time and place was technically possible and could ' +
      'ease congestion, though it stopped short of an outright recommendation. Nothing was done for almost ' +
      'forty years. London’s congestion charge began on 17 February 2003 at £5 a day; in its first year traffic entering ' +
      'the zone fell by 18 per cent and cars by 30 per cent. By 2006 congestion was back near its old level, chiefly ' +
      'because the road space freed had been given to buses, cyclists, pavements and street works.',
    sources: [
      { cite: 'Hansard, written answers, 11 March 1964: road pricing report', url: 'https://api.parliament.uk/historic-hansard/written-answers/1964/mar/11/road-pricing-report', grade: 'V' },
      { cite: 'Road Pricing: The Economic and Technical Possibilities (the Smeed Report), HMSO 1964 (TRL catalogue)', url: 'https://www.trl.co.uk/publications/misc17', grade: 'V' },
      { cite: 'design/research/restraint.md §7.1 (Transport for London monitoring)', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.motorways',
    subject: 'motion.motorways',
    title: 'The M1, 1959',
    date: '1959–1967',
    text:
      'The first long stretch of the M1, from near Watford to Crick near Rugby, was opened by the Minister of Transport, ' +
      'Ernest Marples, on 2 November 1959. It had no speed limit. Drivers found out what their cars could do, and some ' +
      'raced the trains alongside. After a run of accidents a 70 mph limit was imposed on 22 December 1965 as a temporary ' +
      'measure, and made permanent in 1967. The motorway cut journey times between cities by hours, and the hours were ' +
      'soon spent on longer journeys.',
    sources: [
      { cite: 'Historic England, “Crowd and police car at the opening of the M1 on the 2nd November 1959”', url: 'https://historicengland.org.uk/services-skills/education/educational-images/crowd-and-police-car-at-the-opening-of-the-m1-on-the-2nd-november-195-12059', grade: 'S' },
      { cite: 'M1 motorway', url: 'https://en.wikipedia.org/wiki/M1_motorway', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.hirePurchase',
    subject: 'motion.hirePurchase',
    title: 'The never-never, 1952–1967',
    date: '1952–1967',
    text:
      'Most post-war British cars were bought on hire purchase, and the Treasury learned to use the terms as a tap. In ' +
      'February 1952 the Board of Trade imposed a minimum deposit of a third and repayment within eighteen months; in ' +
      'later years it cut the deposit to a fifth and stretched the term to three years, then tightened again. In 1967 ' +
      'it cut the deposit on a car from 40 to 30 per cent. Each loosening was followed by a rush on the showrooms, which ' +
      'was the point of loosening it.',
    sources: [
      { cite: 'Hansard, HC Deb 22 March 1955, vol. 538, cc. 1993–2031: hire purchase', url: 'https://api.parliament.uk/historic-hansard/commons/1955/mar/22/hire-purchase', grade: 'V' },
      { cite: 'Hansard, HC Deb 4 June 1962, vol. 661, cc. 28–30: hire purchase controls', url: 'https://api.parliament.uk/historic-hansard/commons/1962/jun/04/hire-purchase-controls', grade: 'V' },
      { cite: 'Hansard, HC Deb 7 June 1967: motor cars, hire purchase restrictions', url: 'https://api.parliament.uk/historic-hansard/commons/1967/jun/07/motor-cars-hire-purchase-restrictions', grade: 'V' },
    ],
  },
  {
    id: 'arc.motion.northSea',
    subject: 'motion.northSea',
    title: 'North Sea oil, 1975',
    date: '1975',
    text:
      'The first British North Sea oil came from the Argyll field in June 1975, loaded straight into a tanker from a ' +
      'converted drilling rig; the first cargo was discharged at a Thameside refinery on 18 June. On 3 November the Queen ' +
      'formally started the flow from the Forties field, by pipeline to Cruden Bay and on to Grangemouth. The fields lay ' +
      'under some of the roughest water in the world, and the oil was dear to raise. It was raised anyway, because two ' +
      'oil shocks had made it worth raising.',
    sources: [
      { cite: 'Hansard, written answers, 17 February 1976, vol. 905, c. 651W: North Sea oil (deliveries in 1975)', url: 'https://api.parliament.uk/historic-hansard/written_answers/1976/feb/17/north-sea-oil', grade: 'V' },
      { cite: 'MoneyWeek, “3 November 1975: British North Sea oil begins to flow”', url: 'https://moneyweek.com/354538/3-november-1975-the-queen-inaugurates-british-north-sea-oil', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.delivery',
    subject: 'motion.delivery',
    title: 'Fifty-eight boxes, 1956',
    date: '1956',
    text:
      'On 26 April 1956 the converted tanker Ideal X left Port Newark, New Jersey, for Houston with 58 truck-trailer ' +
      'bodies on her deck. Malcom McLean, a trucking owner, had calculated that loading a ship the old way cost $5.83 a ' +
      'ton, and loading his boxes less than 16 cents. The arithmetic left out the cost of the boxes and cranes, but the ' +
      'container won. Freight became so cheap to move that it was worth making things far away and delivering them ' +
      'everywhere, by sea and then by van.',
    sources: [
      { cite: 'The Geography of Transport Systems, “First Containership, Ideal-X, 1956”', url: 'https://transportgeography.org/contents/chapter1/the-setting-of-global-transportation-systems/idealx-first-containeriship-1956/', grade: 'S' },
      { cite: 'New York Review of Books, review of M. Levinson, The Box (2006)', url: 'https://www.nybooks.com/articles/2006/08/10/shipping-news/', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.commuting',
    subject: 'motion.commuting',
    title: 'Faster, and further away',
    date: '1994',
    text:
      'Marchetti’s survey of travel found the daily hour holding steady across the countries he surveyed, and from ' +
      'the age of walking to the age of the motor car. What changed was the radius. A walking town is a few kilometres ' +
      'across; a car-commuter region, at the same hour a day, is tens of kilometres across. The researcher he credited had made the point ' +
      'first: an improvement in speed is taken as distance, not as time at home. The commuter town is the hour, spent ' +
      'at sixty miles an hour.',
    sources: [marchetti],
  },
  {
    id: 'arc.motion.shopping',
    subject: 'motion.shopping',
    title: 'Southdale, 1956',
    date: '1956–1976',
    text:
      'Southdale, in Edina, Minnesota, opened on 8 October 1956: the first fully enclosed, climate-controlled ' +
      'shopping mall in the United States, designed by Victor Gruen, an Austrian émigré architect who had hoped to give ' +
      'the suburbs a town centre. It was surrounded by car parks. The type spread wherever cars did; Brent Cross, in ' +
      'north London, opened in 1976 beside the North Circular Road. Gruen lived to dislike what had been built in his ' +
      'name.',
    sources: [
      { cite: 'MNopedia (Minnesota Historical Society), Southdale Center', url: 'https://www.mnopedia.org/node/1535', grade: 'S' },
      { cite: 'Southdale Center', url: 'https://en.wikipedia.org/wiki/Southdale_Center', grade: 'S' },
      { cite: 'Designing Buildings Wiki, shopping centre (Brent Cross, 1976)', url: 'https://www.designingbuildings.co.uk/wiki/Shopping_centre', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.suburbs',
    subject: 'motion.suburbs',
    title: 'Room per person, 1973–2015',
    date: '1973–2015',
    text:
      'The median new American single-family house grew from 1,525 square feet in 1973 to 2,467 in 2015, while the ' +
      'average household shrank from about three people to about two and a half. Living space per person in new homes ' +
      'roughly doubled. Insulation codes and better furnaces cut the energy needed to heat or cool each square foot. ' +
      'There were twice as many square feet each, further from everything, reached by car. Efficiency per square foot ' +
      'and sprawl per head arrived together.',
    sources: [
      { cite: 'design/research/sectors.md §6.1 (US Census figures via FEE and Pro Builder; flagged for a check against Census “Characteristics of New Housing”)', url: 'https://fee.org/articles/new-homes-today-have-twice-the-square-feet-per-person-as-in-1973/', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.flights',
    subject: 'motion.flights',
    title: 'The package holiday, 1950',
    date: '1950–2019',
    text:
      'In May 1950 Vladimir Raitz’s Horizon Holidays flew a party of students and teachers to Calvi, in Corsica, in a ' +
      'war-surplus Dakota, and put them up in army tents, everything included, for about £32. The ministry had allowed ' +
      'the charter only if the passengers were students or teachers. By the next year there were chalets. The fuel burned ' +
      'by a new aircraft fell by about 45 per cent between 1968 and 2014; in the 2010s fleet efficiency improved by more ' +
      'than 2.5 per cent a year while passenger-kilometres grew by more than six.',
    sources: [
      { cite: 'Travel Weekly, obituary of Vladimir Raitz, founder of the package holiday', url: 'https://travelweekly.co.uk/news/obituary-vladimir-raitz-founder-of-the-package-holiday', grade: 'S' },
      { cite: 'International Council on Clean Transportation, fuel burn of new commercial jet aircraft, 1960 to 2019 (2020)', url: 'https://theicct.org/wp-content/uploads/2021/06/Aircraft-fuel-burn-trends-sept2020.pdf', grade: 'V' },
      { cite: 'International Energy Agency, Aviation', url: 'https://iea.org/reports/aviation', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.duty',
    subject: 'motion.duty',
    title: 'The fuel duty escalator, 1993–2000',
    date: '1993–2000',
    text:
      'In March 1993 the Chancellor announced that road fuel duty would rise every year by 3 per cent more than ' +
      'inflation, to cut emissions from road transport. In November the rate became 5 per cent; in 1997 a new government ' +
      'made it 6. The automatic escalator was ended in November 1999, with future rises to be decided budget by budget. ' +
      'On 8 September 2000 farmers and hauliers blockaded the refineries and fuel depots; within four days about 3,000 ' +
      'petrol stations had closed. No British government has restored an escalator since.',
    sources: [
      { cite: 'Institute for Fiscal Studies, fuel duty (the escalator, 1993–1999)', url: 'https://www.ifs.org.uk/publications/3374', grade: 'S' },
      { cite: 'Fuel protests in the United Kingdom (September 2000)', url: 'https://en.wikipedia.org/wiki/Fuel_protests_in_the_United_Kingdom', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.cap',
    subject: 'motion.cap',
    title: 'The oil import quota, 1959–1973',
    date: '1959–1973',
    text:
      'In March 1959 President Eisenhower made the United States’ voluntary limits on imported oil compulsory, so that ' +
      'the country should not come to depend on foreign supplies. From 1962 imports were capped at 12.2 per cent of ' +
      'domestic production, and the licences to import were valuable and much lobbied over. The quota kept American oil ' +
      'dear; its critics said it drained America first. It was suspended on 18 April 1973, replaced by licence fees, six months ' +
      'before the Arab oil embargo.',
    sources: [
      { cite: 'The American Presidency Project, statement by the President upon signing the proclamation governing petroleum imports (1959)', url: 'https://www.presidency.ucsb.edu/documents/statement-the-president-upon-signing-proclamation-governing-petroleum-imports', grade: 'V' },
      { cite: 'Mandatory Oil Import Quota Program (Proclamation 3279; 12.2 per cent from 1962; suspended 18 April 1973)', url: 'https://en.wikipedia.org/wiki/Mandatory_Oil_Import_Quota_Program', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.sufficiency',
    subject: 'motion.sufficiency',
    title: 'Car-free Sundays, 1973',
    date: '1973–1974',
    text:
      'When the Arab oil embargo of 1973 singled out the Netherlands, the Dutch cabinet banned private driving on ' +
      'Sundays. There were ten car-free Sundays, from 4 November 1973 to 6 January 1974, and the photographs of horses, ' +
      'cyclists and roller-skaters on empty motorways are still reprinted. The fuel saved disappointed, and the measure ' +
      'was dropped. Distance was the trouble: a town built for walking can be walked on a Sunday, and a suburb built for ' +
      'the car cannot.',
    sources: [
      { cite: 'design/research/restraint.md §3.4 (Dutch National Archives via secondary source; Hellema, Wiebes and Witte)', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.substitution',
    subject: 'motion.substitution',
    title: 'The trams that went, and came back, 1962–1992',
    date: '1962–1992',
    text:
      'Britain’s towns tore up their tramways in the middle of the century in favour of buses and cars. Glasgow’s, one ' +
      'of the largest, ran for the last time on 4 September 1962, and of the first-generation systems only Blackpool’s ' +
      'kept running. Thirty years later the trams began to come back. Manchester Metrolink opened on 6 April 1992, ' +
      'converting two old suburban railways and joining them with track laid through the city streets. Some of the old ' +
      'rails elsewhere had only been tarmacked over.',
    sources: [
      { cite: 'Glasgow Corporation Tramways (closed 4 September 1962)', url: 'https://en.wikipedia.org/wiki/Glasgow_Corporation_Tramways', grade: 'S' },
      { cite: 'Blackpool Tramway (the surviving first-generation system)', url: 'https://en.wikipedia.org/wiki/Blackpool_tramway', grade: 'S' },
      { cite: 'Manchester Metrolink (opened 6 April 1992)', url: 'https://en.wikipedia.org/wiki/Manchester_Metrolink', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.greenSpending',
    subject: 'motion.greenSpending',
    title: 'The warmer house, 1970–2014',
    date: '1970–2014',
    text:
      'The government’s Housing Energy Fact File estimated that most British homes averaged about 12 °C in winter in ' +
      '1970, and that average internal temperatures had risen by about four degrees since. Insulation, double glazing and ' +
      'central heating cut the fuel needed for each degree, and a good part of the saving was taken as warmth. A study of ' +
      'living rooms found little change in them when occupied; the gain was in more rooms heated for more hours. In cold, ' +
      'poor homes the rebound was largest, and it was taken as health.',
    sources: [
      { cite: 'Department of Energy and Climate Change, Great Britain’s Housing Energy Fact File (2011)', url: 'https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/48195/3224-great-britains-housing-energy-fact-file-2011.pdf', grade: 'S' },
      { cite: 'K. Vadodaria, D. Loveday, V. Haines, “Measured winter and spring-time indoor temperatures in UK homes over the period 1969–2010”, Energy Policy 64 (2014): 252–262', url: 'https://ideas.repec.org/a/eee/enepol/v64y2014icp252-262.html', grade: 'S' },
    ],
  },
  {
    id: 'arc.motion.roadProgramme',
    subject: 'motion.roadProgramme',
    title: 'Roads for Prosperity, 1989–1994',
    date: '1989–1994',
    text:
      'The white paper Roads for Prosperity, published in May 1989, set out what was described as the largest road ' +
      'building programme in Britain since the Romans: widened motorways, new trunk roads and bypasses, among them the M3 ' +
      'across Twyford Down. The same year ministers asked their advisory committee on trunk road assessment to look into ' +
      'the traffic new roads generate. Its report of 1994, Trunk Roads and the Generation of Traffic, accepted that new ' +
      'capacity creates new traffic, and the programme was cut back. Twyford Down was built.',
    sources: [
      { cite: 'Hansard, HC Deb 18 May 1989, vol. 153, cc. 482–96: roads white paper', url: 'https://api.parliament.uk/historic-hansard/commons/1989/may/18/roads-white-paper', grade: 'V' },
      { cite: 'Hansard, written answers, 19 December 1994, vol. 251, cc. 880–1W: Standing Advisory Committee on Trunk Road Assessment', url: 'https://api.parliament.uk/historic-hansard/written-answers/1994/dec/19/standing-advisory-committee-on-trunk', grade: 'V' },
      { cite: 'Roads for Prosperity', url: 'https://en.wikipedia.org/wiki/Roads_for_Prosperity', grade: 'S' },
    ],
  },
];
