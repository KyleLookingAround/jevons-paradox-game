/**
 * The Archive: Light (town gas and current, 1807–1950, with its long tail). See index.ts for the rules.
 */
import type { ArchiveDef } from '../../types';
import { fouquetPearson2006 } from './sources';

export const lightArchive: ArchiveDef[] = [
  {
    id: 'arc.light.industry',
    subject: 'light',
    title: 'Seven centuries of light, 1300–2000',
    date: '1800–2000',
    text:
      'Two energy economists, writing in 2006, reconstructed the price and use of light in the United Kingdom over seven ' +
      'centuries. Between 1800 and 2000, they found, the price of lighting fell to less than a three-thousandth of what it had been, ' +
      'while income per head rose about fifteen-fold. Lighting used per person rose 6,500 times, and total lighting ' +
      'consumption 25,000 times. Almost all of the gain came from changing the source of light, from candle to gas to ' +
      'filament to tube, rather than from improving any one of them. No household economised its way into darkness.',
    sources: [fouquetPearson2006, { cite: 'Our World in Data, “Light”', url: 'https://ourworldindata.org/light', grade: 'S' }],
  },
  {
    id: 'arc.light.streetLamps',
    subject: 'light.streetLamps',
    title: 'Gas in Pall Mall, 1807',
    date: '1807–1812',
    text:
      'On the King’s birthday, 4 June 1807, Frederick Winsor, a German-born promoter, lit ' +
      'a row of gas lamps along Pall Mall for the public to admire. Crowds came; investors followed, slowly. In 1812 the ' +
      'Gas Light and Coke Company received its charter to supply gas to the cities of London and Westminster and the ' +
      'borough of Southwark, the first gas undertaking in the world. Within a few decades lamplighters with ladders were ' +
      'a fixture of every town that could raise a rate. The streets were safer and longer used, and the coal was cooked ' +
      'into gas at the works by the river.',
    sources: [
      { cite: 'London Museum, “How gas lamps illuminated London”', url: 'https://www.londonmuseum.org.uk/collections/london-stories/gas-lamps-illuminated-london/', grade: 'S' },
      { cite: 'Science Museum Group, Gas Light and Coke Company (“the first gas undertaking in the world”)', url: 'https://collection.sciencemuseumgroup.org.uk/people/ap26609/gas-light-and-coke-company', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.nightShifts',
    subject: 'light.nightShifts',
    title: 'Fifty lamps in Salford, 1806',
    date: '1805–1808',
    text:
      'William Murdoch, Boulton and Watt’s man in Cornwall, had lit his own house with coal gas in the 1790s. In 1805 the ' +
      'Salford cotton mill of Philips and Lee ordered an apparatus, and on 1 January 1806 Murdoch wrote to Soho that fifty ' +
      'lamps had been lighted that night, to satisfaction. The installation grew room by room. In 1808 he laid a full ' +
      'account before the Royal Society, with a reckoning of what the mill saved against candles. The saving was real. ' +
      'So was the effect: a mill that could see its machines at night did not need to stop them.',
    sources: [
      { cite: 'W. Murdoch, “An Account of the Application of the Gas from Coal to Economical Purposes”, Philosophical Transactions of the Royal Society 98 (1808)', url: 'https://jimclifford.ca/philosophical-transactions-ocr-1665-1869/articles/jstor-107289/', grade: 'V' },
      { cite: 'Grace’s Guide, Philips and Lee', url: 'https://gracesguide.co.uk/Philips_and_Lee', grade: 'S' },
      { cite: 'Science Museum, diorama of Murdoch’s gas works for Phillips and Lee of Salford', url: 'https://collection.sciencemuseum.org.uk/objects/co11310/diorama-of-murdochs-gas-works-for-phillips-and-le-gas-works-diorama', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.batswing',
    subject: 'light.batswing',
    title: 'The batswing and the fishtail, 1816–1820',
    date: 'c. 1816',
    text:
      'The first gas burners were holes in a pipe. Within a few years makers were shaping the jet: the rat-tail and the ' +
      'cockspur about 1808, the batswing, a slit that spread the flame into a broad fan, about 1816, and the fishtail, two ' +
      'jets striking each other, in 1820. A wider, thinner flame burned hotter and gave more light for the same gas. By ' +
      '1884 one engineer, Owen Merriman, could fill a book with burners old and new. Each was sold on the saving it made, ' +
      'and each made a lit room cheaper to keep lit.',
    sources: [
      { cite: 'Ingenium (Canada Science and Technology Museum), burner tip, 1998.0326.001 (dates of rat-tail, cockspur, batswing and fishtail)', url: 'https://collections.ingeniumcanada.org/item/1998.0326.001', grade: 'S' },
      { cite: 'O. Merriman, Gas Burners Old and New (1884)', url: 'https://gutenberg.org/ebooks/37928', grade: 'V' },
    ],
  },
  {
    id: 'arc.light.mantle',
    subject: 'light.mantle',
    title: 'Welsbach’s mantle, 1890–91',
    date: '1891',
    text:
      'Carl Auer von Welsbach, an Austrian chemist, found that a fabric sock soaked in metal salts and burned away left a ' +
      'fragile ash that glowed brilliantly in a gas flame. His first mantles of the late 1880s gave a greenish light; the ' +
      'mixture he settled on about 1890–91, 99 parts thoria to one of ceria, gave a white one, several times brighter than ' +
      'an open flame for the same gas. It arrived just as electric light threatened the gas companies, and kept gas ' +
      'lighting in streets and homes for decades. Thoria is mildly radioactive; later mantles did without it.',
    sources: [
      { cite: 'Gas mantle (Welsbach’s 99:1 thoria–ceria mixture, 1890–91)', url: 'https://en.wikipedia.org/wiki/Gas_mantle', grade: 'S' },
      { cite: 'Carl Auer von Welsbach (first thorium patent, US 399,174, 1889)', url: 'https://en.wikipedia.org/wiki/Carl_Auer_von_Welsbach', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.carbon',
    subject: 'light.carbon',
    title: 'The carbon filament, 1878–1883',
    date: '1878–1883',
    text:
      'Joseph Swan showed a carbon-filament lamp in Newcastle in 1878 and 1879; Thomas Edison’s laboratory at Menlo Park ' +
      'had its own lamp burning in October 1879. The two men’s companies fought over the patents and then merged in ' +
      'Britain, in 1883, as Edison and Swan. In 1881 Richard D’Oyly Carte lit his new Savoy Theatre with some 1,200 of ' +
      'Swan’s lamps, and demonstrated their safety by breaking one wrapped in muslin. Reconstructions of lamp efficacy make ' +
      'Edison’s lamp of 1883 about ten times as efficient as the town-gas burners it replaced.',
    sources: [
      { cite: 'Gilbert and Sullivan Archive, the Savoy Theatre: the electric light demonstration (1881)', url: 'https://www.gsarchive.net/carte/savoy/electric.html', grade: 'V' },
      { cite: 'W. D. Nordhaus, “Do Real-Output and Real-Wage Measures Capture Reality? The History of Lighting Suggests Not” (1997), efficacy table as summarised in design/research/energy.md §3.1', grade: 'S' },
      { cite: 'Joseph Swan', url: 'https://en.wikipedia.org/wiki/Joseph_Swan', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.homes',
    subject: 'light.homes',
    title: 'Cragside, 1880',
    date: '1878–1880',
    text:
      'Sir William Armstrong, the Newcastle armaments manufacturer, dammed the burns on his Northumberland estate and ' +
      'drove a dynamo with the water. In 1878 the picture gallery at Cragside had an arc lamp; in 1880 the library had ' +
      'Swan’s new incandescent bulbs, among the first in any house, and the National Trust calls it the first house in ' +
      'the world lit by hydroelectricity, though the claim has its doubters. Demand outgrew the first plant within a few ' +
      'years. A century later every house had the light Armstrong had, and kept far more of it on.',
    sources: [
      { cite: 'National Trust, history of Cragside', url: 'https://www.nationaltrust.org.uk/visit/north-east/cragside/history-of-cragside', grade: 'S' },
      { cite: 'IET Archives blog, “Cragside: harnessing the power of water” (2023)', url: 'https://ietarchivesblog.org/2023/03/09/cragside-harnessing-the-power-of-water', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.tungsten',
    subject: 'light.tungsten',
    title: 'The tungsten filament, 1904',
    date: '1904–1910',
    text:
      'Tungsten melts at a higher temperature than any other metal, so a filament of it can run hotter, and a hotter ' +
      'filament gives whiter light for the same current. Alexander Just and Franjo Hanaman filed their patent in Budapest ' +
      'with a priority date of 7 October 1904, and a Hungarian lamp works began making the lamps the next year. Early ' +
      'filaments were pressed and brittle; William Coolidge at General Electric drew the metal into ductile wire about ' +
      '1910. The metal filament lamp used a fraction of the current of the carbon lamp, and electric light became cheap ' +
      'enough to leave on.',
    sources: [
      { cite: 'Hungarian Intellectual Property Office, “1913. Volfrámszálas izzólámpa” (Just and Hanaman patent, priority 7 October 1904)', url: 'https://www.sztnh.gov.hu/en/print/2763', grade: 'V' },
      { cite: 'design/research/energy.md §3.1 (Coolidge, ductile tungsten, 1910)', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.gasFilled',
    subject: 'light.gasFilled',
    title: 'A whiff of nitrogen, 1913–1916',
    date: '1913–1916',
    text:
      'A filament in a vacuum slowly boils away, blackening the bulb. Irving Langmuir at General Electric found that a ' +
      'filament coiled tight and surrounded by an inert gas lost far less metal, and so could be run hotter and brighter. ' +
      'The work dates from about 1913; his United States patent, 1,180,159, for a coiled tungsten filament in nitrogen, ' +
      'was granted on 18 April 1916, and argon came later. The gas-filled lamp became the ordinary household bulb of the ' +
      'twentieth century. Langmuir won the Nobel Prize in Chemistry in 1932, for other work.',
    sources: [
      { cite: 'I. Langmuir, US Patent 1,180,159, 18 April 1916 (as reported by the American Physical Society)', url: 'https://www.aps.org/apsnews/2003/04/this-month-in-physics-history', grade: 'S' },
      { cite: 'Lamptech, Irving Langmuir', url: 'https://www.lamptech.co.uk/Documents/People%20-%20Langmuir%20I.htm', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.fluorescent',
    subject: 'light.fluorescent',
    title: 'The fluorescent tube, 1938',
    date: '1936–1939',
    text:
      'A fluorescent tube passes a current through mercury vapour, which gives off ultraviolet light, which a coating of ' +
      'phosphor on the glass turns into visible light. General Electric made a large installation in the United States ' +
      'Patent Office in November 1936, put its lamps on general sale in April 1938, and showed them, with Westinghouse, at ' +
      'the New York World’s Fair and the Golden Gate Exposition in 1939. The tube gave several times the light of a ' +
      'filament for the same current. Offices, shops and factories were lit more brightly than ever, and all day.',
    sources: [
      { cite: 'Smithsonian, National Museum of American History, fluorescent lamp, nmah_703139', url: 'https://www.si.edu/object/nmah_703139', grade: 'S' },
      { cite: 'Edison Tech Center, fluorescent lamp development timeline', url: 'https://edisontechcenter.org/fourescentlampdev.html', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.gasWorks',
    subject: 'light.gasWorks',
    title: 'Coal made into light, 1800–1950',
    date: '1800–1950',
    text:
      'Town gas was coal, heated in closed retorts until it gave off a flammable vapour, with coke and tar left behind. ' +
      'Light drew on the same pits as Steam. The long British series shows the light got from gas rising from about ' +
      '68 lumen-hours per kilowatt-hour of fuel in 1800 to about 880 by 1950, a thirteen-fold gain from better retorts, ' +
      'holders and burners. Over the same period British towns built gasworks by the hundred, and the gasholder became as ' +
      'much a part of the skyline as the church. The works were lit, of course, by gas.',
    sources: [fouquetPearson2006, { cite: 'Our World in Data, “Light” (efficiency by source, UK)', url: 'https://ourworldindata.org/light', grade: 'S' }],
  },
  {
    id: 'arc.light.powerStation',
    subject: 'light.powerStation',
    title: 'Holborn Viaduct, 1882',
    date: '1882',
    text:
      'On 12 January 1882 Edison’s company began supplying electric light from a steam-driven station at 57 Holborn ' +
      'Viaduct, in the City of London: a coal-fired engine turned a dynamo nicknamed Jumbo, which fed lamps along the ' +
      'viaduct and in nearby buildings. Pearl Street in New York followed that September. Holborn Viaduct closed in 1886, ' +
      'unprofitable, and its lamps went back to gas. The principle stayed: one large plant, run as continuously as ' +
      'possible, selling current to as many customers as it could be wired to.',
    sources: [
      { cite: 'Thomas A. Edison Papers (Rutgers), Edison Electric Light Company Ltd (Holborn Viaduct, 12 January 1882)', url: 'https://edison.rutgers.edu/life-of-edison/companies/company-details/electric-light,-foreign/edison-electric-light-company-ltd', grade: 'V' },
      { cite: 'Grace’s Guide, Edison’s first public electricity generation station', url: 'https://gracesguide.co.uk/Edison%27s_first_public_electricity_generation_station', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.offPeak',
    subject: 'light.offPeak',
    title: 'Mr Insull builds load, 1892–1932',
    date: '1892–1932',
    text:
      'Samuel Insull, who had been Edison’s secretary, took over Chicago Edison in 1892 and saw that his costs were mostly ' +
      'the plant, not the coal. A station that stood idle all afternoon earned nothing on its capital. So he sold the idle ' +
      'hours cheap, to streetcars, elevated railways, ice houses and factories, and he used the Wright demand rate, named ' +
      'for Arthur Wright of Brighton, which charged by each customer’s peak. Insull held a financial interest in the ' +
      'Wright patents. Cheaper current raised sales, sales raised the load factor, and a higher load factor made current ' +
      'cheaper still. His holding companies collapsed in 1932.',
    sources: [
      { cite: 'J. L. Neufeld, “Price Discrimination and the Adoption of the Electricity Demand Charge”, Journal of Economic History 47(3) (1987): 693–709', url: 'https://cambridge.org/core/journals/journal-of-economic-history/article/price-discrimination-and-the-adoption-of-the-electricity-demand-charge/D4B23D409DE25FE29B96D869EC8306BF', grade: 'V' },
      { cite: 'Samuel Insull', url: 'https://en.wikipedia.org/wiki/Samuel_Insull', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.trams',
    subject: 'light.trams',
    title: 'Selling the afternoon, 1890s',
    date: '1890s',
    text:
      'A lighting station is busy for a few hours after dark and nearly idle the rest of the day, yet its engines, ' +
      'dynamos and mains cost the same whether they run or not. The engineers called the ratio of average to peak output ' +
      'the load factor, and the electric tramway was the first great customer to raise it: trams ran by day, when the ' +
      'lamps were off. Supply companies courted the street railways with cheap daytime rates, and sometimes owned them. ' +
      'The trams carried people further for less, and the towns spread along the lines.',
    sources: [
      { cite: 'J. L. Neufeld, Journal of Economic History 47(3) (1987) (lighting as most early utility income; rate structures)', url: 'https://cambridge.org/core/journals/journal-of-economic-history/article/price-discrimination-and-the-adoption-of-the-electricity-demand-charge/D4B23D409DE25FE29B96D869EC8306BF', grade: 'V' },
      { cite: 'design/research/energy.md §6 (Insull’s off-peak sales to streetcars and elevated railways)', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.flatRate',
    subject: 'light.flatRate',
    title: 'What lighting paid for, 1898',
    date: '1898–1915',
    text:
      'In a United States survey of 1897–98, lighting brought in about 88 per cent of the electric companies’ reported ' +
      'income: 49 per cent from arc lamps and 39 per cent from incandescent. The plant that earned it sat largely idle by ' +
      'day. Between 1905 and 1915, as states began to regulate prices, the companies spread the demand charge, a tariff ' +
      'set partly by each customer’s peak. One economic historian argues that it was less a way of pricing the peak than ' +
      'of undercutting the factories that might otherwise build their own plant. A simple price per lamp kept nobody ' +
      'awake at night, which was the problem.',
    sources: [
      { cite: 'J. L. Neufeld, “Price Discrimination and the Adoption of the Electricity Demand Charge”, Journal of Economic History 47(3) (1987): 693–709', url: 'https://cambridge.org/core/journals/journal-of-economic-history/article/price-discrimination-and-the-adoption-of-the-electricity-demand-charge/D4B23D409DE25FE29B96D869EC8306BF', grade: 'V' },
    ],
  },
  {
    id: 'arc.light.slotMeter',
    subject: 'light.slotMeter',
    title: 'The penny in the slot, late 1880s',
    date: 'late 1880s',
    text:
      'Gas had been a middle-class comfort, sold by the quarter on credit. From the late 1880s the companies installed ' +
      'prepayment meters that released a measured amount of gas for each penny dropped in, and rented out gas cookers on ' +
      'cheap weekly terms. Households with no credit and no savings could now buy gas as they bought bread. A New Zealand ' +
      'paper reported in 1908 that the penny meter was a recognised institution in hundreds of thousands of homes. By 1914 ' +
      'the coal range was giving way to the gas cooker in working-class kitchens across urban Britain.',
    sources: [
      { cite: 'University of the West of England, Victorian and Edwardian services (houses) 1850–1914, section 5', url: 'https://fet.uwe.ac.uk/conweb/house_ages/services/section5.htm', grade: 'S' },
      { cite: 'New Zealand Herald, 18 January 1908 (Papers Past)', url: 'https://paperspast.natlib.govt.nz/newspapers/NZH19080118.2.94', grade: 'V' },
    ],
  },
  {
    id: 'arc.light.grid',
    subject: 'light.grid',
    title: 'The National Grid, 1926–2023',
    date: '1926–2023',
    text:
      'The Electricity (Supply) Act of 1926 set up the Central Electricity Board to build a national transmission grid, ' +
      'linking the most efficient stations and closing the small ones; it was substantially complete by the early 1930s. ' +
      'Current became cheaper and reached nearly everywhere, and demand rose for most of the century. Then, in the twenty-' +
      'first, it fell: British electricity demand reached a record low of 316.8 terawatt-hours in 2023. Efficient ' +
      'appliances played a part. So did the departure of heavy industry, whose demand moved abroad with it.',
    sources: [
      { cite: 'Department for Energy Security and Net Zero, Digest of UK Energy Statistics 2024, ch. 5', url: 'https://assets.publishing.service.gov.uk/media/66a7da1bce1fd0da7b592f0a/DUKES_2024_Chapter_5.pdf', grade: 'V' },
      { cite: 'design/research/energy.md §6 (Electricity (Supply) Act 1926; Central Electricity Board)', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.phoebus',
    subject: 'light.phoebus',
    title: 'The Phoebus cartel, 1924',
    date: '1924–c. 1939',
    text:
      'On 23 December 1924, in Geneva, the leading lamp makers of Europe and associates of General Electric formed a ' +
      'cartel, Phoebus, to share out the world market. Among its rules was a standard life for a general-service lamp: ' +
      'a thousand hours. Makers whose lamps lasted much longer were penalised. The agreement ran until about the Second World War. It is the rare case in this archive ' +
      'of an industry choosing to make its product less durable in order to sell more of it, and saying so in writing.',
    sources: [
      { cite: 'Phoebus cartel (Geneva, 23 December 1924)', url: 'https://en.wikipedia.org/wiki/Phoebus_cartel', grade: 'S' },
      { cite: 'design/research/energy.md §3.1, §3.5', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.kentCoalfield',
    subject: 'light.kentCoalfield',
    title: 'Coal under Kent, 1890',
    date: '1890',
    text:
      'In 1890 engineers boring at Shakespeare Cliff, near Dover, for the first attempt at a Channel Tunnel, found coal. ' +
      'The tunnel had been stopped years before; its company, with men and equipment standing idle, had turned to ' +
      'investigating the geology. Its shareholders declined to go into mining, and the rights passed to a syndicate formed ' +
      'in 1896. The Shakespeare colliery struggled with water and closed in 1915, but others were sunk further inland, and ' +
      'Kent mined coal until 1989. The hop gardens had been sitting on it all along.',
    sources: [
      { cite: 'Dover Museum, “The Discovery of Coal in Kent”', url: 'https://dovermuseum.co.uk/Exhibitions/Coal-Mining-in-Kent/History/The-Discovery-of-Coal-in-Kent.aspx', grade: 'S' },
      { cite: 'Kent Coalfield', url: 'https://en.wikipedia.org/wiki/Kent_Coalfield', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.shopSigns',
    subject: 'light.shopSigns',
    title: 'The vanishing stars, 2011–2022',
    date: '2011–2022',
    text:
      'Between 2011 and 2022 volunteers around the world made more than 50,000 counts of how many stars they could see ' +
      'from where they lived. A team writing in Science in 2023 found that the night sky had ' +
      'brightened by about 9.6 per cent a year, enough to double its brightness in under eight years. Satellites had ' +
      'measured much less, partly because their sensors miss the blue end of the light from white LEDs. The LED is the ' +
      'most efficient lamp ever made. The sky glow is the light that went on because of it.',
    sources: [
      { cite: 'C. C. M. Kyba et al., “Citizen scientists report global rapid reductions in the visibility of stars from 2011 to 2022”, Science 379 (2023): 265–268; NOIRLab release noirlab2302', url: 'https://kpno.noirlab.edu/news/noirlab2302', grade: 'V' },
    ],
  },
  {
    id: 'arc.light.duty',
    subject: 'light.duty',
    title: 'The lighting rate, 1833',
    date: '1833',
    text:
      'The Lighting and Watching Act of 1833 let the ratepayers of a parish vote to light and police their streets and ' +
      'to levy a rate for it, appointing inspectors to buy the lamps, posts and gas. Nobody could compel a parish to adopt ' +
      'it, as ministers explained to the Commons in 1842, and many took their time. The rate was raised to buy light, not ' +
      'to discourage it. A rate that rose with every improvement ' +
      'in the lamps, to keep the streets as dim as before, was never proposed by anyone.',
    sources: [
      { cite: 'Hansard, HC Deb 18 February 1842, vol. 60, cc. 640–1: Metropolitan roads (parish powers to rate for lighting)', url: 'https://api.parliament.uk/historic-hansard/commons/1842/feb/18/metropolitan-roads', grade: 'V' },
      { cite: 'Hansard, written answers, 14 September 1909 (parish meeting fixing the sum under the Lighting and Watching Act 1833)', url: 'https://api.parliament.uk/historic-hansard/written-answers/1909/sep/14/hellifield-parish-council', grade: 'V' },
    ],
  },
  {
    id: 'arc.light.cap',
    subject: 'light.cap',
    title: 'A cap drafted by the capped, 2005–2007',
    date: '2005–2007',
    text:
      'The European Union’s emissions trading system opened in 2005 with caps set largely from the estimates of the ' +
      'industries and governments concerned. When the first verified figures came in, the allowances issued exceeded the ' +
      'emissions they were meant to limit; one study put the excess above 5 per cent in the old member states and above ' +
      '20 per cent in the new. Phase one allowances could not be carried forward, and in 2007 their price fell to about ' +
      'nothing. Later phases tightened the cap and added a reserve to absorb the surplus.',
    sources: [
      { cite: 'design/research/restraint.md §2.2 (EU ETS phase one; Cooper on over-allocation; the Commission’s account)', grade: 'S' },
      { cite: 'J. Cooper (Harvard), on over-allocation in the first phase, as summarised in design/research/restraint.md §2.2', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.sufficiency',
    subject: 'light.sufficiency',
    title: 'Setsuden, 2011',
    date: '2011',
    text:
      'After the Fukushima disaster of March 2011 the Tokyo region lost much of its generating capacity at once. Large ' +
      'customers of the Tokyo Electric Power Company were required to cut their peak demand by 15 per cent; offices ran ' +
      'warmer, lifts and signs were switched off, and the summer dress code, Super Cool Biz, ran from May to October. One ' +
      'analysis of the company’s figures found that the summer peak fell by about 18 per cent against 2010. Rolling ' +
      'blackouts were avoided. As the crisis passed, so did much of the saving.',
    sources: [
      { cite: 'design/research/restraint.md §3.5 (setsuden; the 15 per cent requirement; peak −18 per cent)', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.greenSpending',
    subject: 'light.greenSpending',
    title: 'Where the savings go, 2021',
    date: '2021',
    text:
      'Money saved on one fuel does not vanish. It is spent on something else, and most things take energy to make. ' +
      'Economists call the sum of these second-round effects economy-wide rebound. A review by five researchers in ' +
      '2021 concluded that it may offset more than half of the energy savings expected from efficiency, ' +
      'and that the scenario models used for climate policy largely leave it out. Steering the money towards things that ' +
      'burn little, such as parks, lectures or a walk, blunts the effect. It does not stop the lamps.',
    sources: [
      { cite: 'P. E. Brockway, S. Sorrell, G. Semieniuk, M. K. Heun, V. Court, “Energy efficiency and economy-wide rebound effects: A review of the evidence and its implications”, Renewable and Sustainable Energy Reviews 141 (2021): 110781', url: 'https://www.creds.ac.uk/publications/energy-efficiency-and-economy-wide-rebound-effects-a-review-of-the-evidence-and-its-implications/', grade: 'V' },
    ],
  },
  {
    id: 'arc.light.substitution',
    subject: 'light.substitution',
    title: 'Power from the glens, 1943',
    date: '1943',
    text:
      'In 1943 fewer than one Highland household in a hundred outside the towns had mains electricity. The ' +
      'Hydro-Electric Development (Scotland) Act, passed on 5 August 1943 at the urging of the Secretary of State, Tom ' +
      'Johnston, set up the North of Scotland Hydro-Electric Board to dam the glens. Its motto was Neart nan Gleann, power ' +
      'from the glens. Over the following decades it built 54 power stations, 78 dams and some 200 miles of tunnels. The ' +
      'current lit the crofts and was sold south, and there were, in the end, only so many glens.',
    sources: [
      { cite: 'Hansard, HC Deb 24 February 1943, vol. 387, cc. 180–262: Hydro-Electric Development (Scotland) Bill', url: 'https://api.parliament.uk/historic-hansard/commons/1943/feb/24/hydro-electric-development-scotland-bill', grade: 'V' },
      { cite: 'North of Scotland Hydro-Electric Board', url: 'https://en.wikipedia.org/wiki/North_of_Scotland_Hydro-Electric_Board', grade: 'S' },
    ],
  },
  {
    id: 'arc.light.hydroGrants',
    subject: 'light.hydroGrants',
    title: 'Addition, not displacement, 2012',
    date: '2012',
    text:
      'An American sociologist looked at fifty years of energy statistics from about 130 countries and asked how ' +
      'much fossil fuel each unit of non-fossil energy had actually displaced. His answer, in Nature Climate Change in ' +
      '2012, was that it had displaced rather little. For total energy it took more than four and a half units of non-fossil energy to displace one ' +
      'unit of fossil; for electricity, more than ten. Most of the new supply had been added on top of the old. He ' +
      'concluded that displacement depends on policy, not on the technology alone.',
    sources: [
      { cite: 'R. York, “Do alternative energy sources displace fossil fuels?”, Nature Climate Change 2 (2012): 441–443', url: 'https://www.nature.com/articles/nclimate1451', grade: 'V' },
    ],
  },
];
