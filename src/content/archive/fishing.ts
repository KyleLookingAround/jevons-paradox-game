/**
 * The Archive: Fishing (M4, the text lane). See index.ts for the rules. A separate module until the Act lane registers
 * Fishing (subjects must resolve): archive/index.ts adds ...fishingArchive after ...ironArchive. Every efficiency card,
 * lever and use has a note (the coverage lint), plus Huxley's exhibition, Garstang's inquiry and two letters (Tench's
 * full holds: hyperstability; Tench's foreigners: the Grand Banks).
 * Sources: design/research/sectors.md §3 ([S15]–[S17]) and restraint.md §6.2 ([R21], [R22]); the four the design lead
 * checked (Huxley 1883, Garstang 1900, Harley et al. 2001); and those the text lane checked on 20 Nov 2026
 * (design/scratch/m4-text-progress.md), or the Fishing lane did (design/scratch/m4-fishing-progress.md).
 * People (D4): the ports are named by place; the moratorium's people are counted only as the sources count them.
 */
import type { ArchiveDef } from '../../types';

type Source = ArchiveDef['sources'][number];
const thurstan: Source = { cite: 'R. H. Thurstan, S. Brockington and C. M. Roberts, “The effects of 118 years of industrial fishing on UK bottom trawl fisheries”, Nature Communications 1 (2010), doi:10.1038/ncomms1013', url: 'https://ore.exeter.ac.uk/repository/handle/10871/30201', grade: 'V' };
const yorkRelease: Source = { cite: 'University of York, news release on Thurstan et al. (May 2010)', url: 'https://york.ac.uk/news-and-events/news/2010/research/trawl', grade: 'S' };
const grandBanks: Source = { cite: 'Collapse of the Atlantic northwest cod fishery (catches 1959–1968; foreign share; the 200-mile limit)', url: 'https://en.wikipedia.org/wiki/Collapse_of_the_Atlantic_northwest_cod_fishery', grade: 'S' };
const codMoratorium: Source = { cite: 'The Canadian Encyclopedia, “Cod moratorium of 1992”', url: 'https://thecanadianencyclopedia.ca/en/article/cod-moratorium-of-1992', grade: 'S' };
const huxley: Source = { cite: 'T. H. Huxley, Inaugural address, Fisheries Exhibition, London (1883), Clark University Huxley archive', url: 'https://mathcs.clarku.edu/huxley/SM5/fish.html', grade: 'V' };
const kipper: Source = { cite: 'Kipper (Bibbesworth’s “heryng red”; Nashe, 1599; Woodger at Seahouses; the Peel kipper yards)', url: 'https://en.wikipedia.org/wiki/Kipper', grade: 'S' };
const fishMeal: Source = { cite: 'Fish meal (fertiliser before 1910; four to five tons of fish to a ton of meal; six million tons a year)', url: 'https://en.wikipedia.org/wiki/Fish_meal', grade: 'S' };
const iceland: Source = { cite: 'FAO, Iceland’s fisheries management (quotas from 1984 on catch history; ITQs, 1990)', url: 'https://www.fao.org/3/y2684e/y2684e05.htm', grade: 'S' };

export const fishingArchive: ArchiveDef[] = [
  {
    id: 'arc.fishing.industry',
    subject: 'fishing',
    title: 'A hundred and eighteen years of trawling, 1889–2007',
    date: '1889–2007',
    text:
      'In 2010 three marine scientists at York put together the bottom-trawl landings into England ' +
      'and Wales from 1889, where the records begin, to 2007, and divided them by the fishing power of the ' +
      'boats that landed them. Landings per unit of fishing power had fallen by 94 per cent: a seventeen-fold decline. ' +
      'It took about seventeen times the engine power to land the same fish as in 1889. Every new trawler, engine and net ' +
      'had been an improvement, and every improvement had been made against a smaller stock. The catch held up for a ' +
      'long time, because the power kept rising.',
    sources: [thurstan, yorkRelease],
  },
  {
    id: 'arc.fishing.freshFish',
    subject: 'fishing.freshFish',
    title: 'The carriers to Billingsgate',
    date: '1840s–1930s',
    text:
      'Before the fish train, fresh fish went to London by sea. Trawlers worked the North Sea in fleets that stayed out ' +
      'at sea under a senior skipper, and the catch was packed in boxes and rowed across to fast ' +
      'carriers that ran for Billingsgate every day. One Hull fleet worked 49 steam trawlers with six carriers and a ' +
      'hospital ship. The rowing across, in a heavy sea, was dangerous work. The system began in the 1840s and ran into ' +
      'the 1930s: fresh fish in the capital every morning, whatever it cost the men in the boats.',
    sources: [
      { cite: 'Scarborough’s Maritime Heritage, the Gamecock fleet of Hull (steam trawlers, carriers, boxing at sea)', url: 'https://scarboroughsmaritimeheritage.org.uk/agamecock.php', grade: 'S' },
      { cite: 'Shipping Wonders of the World, “Deep-sea fishing” (fleeting; carriers to Billingsgate)', url: 'https://shippingwondersoftheworld.com/deep_sea_fishing.html', grade: 'S' },
    ],
  },
  {
    id: 'arc.fishing.friedFish',
    subject: 'fishing.friedFish',
    title: 'The first fish and chip shop, 1860s',
    date: '1860s',
    text:
      'Nobody knows who opened the first fish and chip shop. London and Lancashire both ' +
      'claim it, each with a date in the 1860s, and the dispute is still conducted with feeling. What is not in dispute ' +
      'is what followed. Fried fish was cheap, hot and ready, a supper for a working family that needed no fire at home, ' +
      'and the shops multiplied. Cheap fish was a real gain to the poor. It was also, ' +
      'in time, a very large market for the trawlers.',
    sources: [
      { cite: 'Fish and chip shop (rival London and Lancashire claims, 1860s)', url: 'https://en.wikipedia.org/wiki/Fish_and_chip_shop', grade: 'S' },
    ],
  },
  {
    id: 'arc.fishing.saltSmoked',
    subject: 'fishing.saltSmoked',
    title: 'Red herring and the kipper',
    date: 'c. 1250–1843',
    text:
      'Fish that keeps is old. A poem of the mid-thirteenth century, by Walter of Bibbesworth, already mocks a man who ' +
      'eats no fish but red herring, and in 1599 Thomas Nashe told the story of a Yarmouth fisherman who discovered ' +
      'smoking by accident. The kipper has its own legend: John Woodger of Seahouses, in Northumberland, is said to have ' +
      'left split herring overnight in a room with a smoking stove, about 1843. Salt and smoke turned a catch that ' +
      'spoiled in days into a trade that reached the inland towns and the ships.',
    sources: [kipper],
  },
  {
    id: 'arc.fishing.fishMeal',
    subject: 'fishing.fishMeal',
    title: 'Fish for the fields',
    date: 'Before 1910',
    text:
      'Before 1910 the fish meal made in Britain went chiefly onto the land as fertiliser: the catch the market would ' +
      'not take, dried and ground, and sold to farmers by the sack. It takes four to five tons of fish to make a ton of ' +
      'meal. Later the meal went to animal feed, and later still to fish farms. Today about six million tons of fish a ' +
      'year are caught for no other purpose than to be made into meal. A use for what nobody would eat became a reason ' +
      'to catch fish that nobody eats.',
    sources: [fishMeal],
  },
  {
    id: 'arc.fishing.codLiverOil',
    subject: 'fishing.codLiverOil',
    title: 'A spoonful a day',
    date: '1820s–1922',
    text:
      'Observations in Germany in the 1820s that children given cod liver oil did not develop rickets made it a bottled ' +
      'medicine, a teaspoon a day, across northern Europe. The old way of getting it was to leave livers to rot in ' +
      'barrels and skim the oil, which tasted as that sounds; the Möller process of 1850 simmered them fresh. Nobody ' +
      'knew why it worked until 1922, when Elmer McCollum showed that the factor which cured rickets was a vitamin of ' +
      'its own. He called it vitamin D. A great many cod gave their livers to the experiment.',
    sources: [{ cite: 'Cod liver oil (Germany, 1820s; Möller, 1850; McCollum and vitamin D, 1922)', url: 'https://en.wikipedia.org/wiki/Cod_liver_oil', grade: 'S' }],
  },
  {
    id: 'arc.fishing.fishFingers',
    subject: 'fishing.fishFingers',
    title: 'Herring savouries, 1950s',
    date: '1953',
    text:
      'Fish fingers were sold under the Birds Eye name from 1953. When the idea was brought to Britain, the first ' +
      'trial was of herring, which was plentiful and cheap: the firm test-marketed “herring savouries” in ' +
      'Southampton and South Wales, with fingers of cod as the bland control. The shoppers overwhelmingly preferred the ' +
      'cod. A frozen oblong of white fish could be made from a block of any catch, eaten by people who never saw the ' +
      'sea, and sold in any season. Demand for cod no longer needed to be near the cod.',
    sources: [{ cite: 'Fish finger (Birds Eye, 1953; the herring savouries trial)', url: 'https://en.wikipedia.org/wiki/Fish_finger', grade: 'S' }],
  },
  {
    id: 'arc.fishing.ice',
    subject: 'fishing.ice',
    title: 'Ice from Norway, from 1822',
    date: '1822–1920',
    text:
      'Britain imported natural ice from Norway from 1822: blocks cut from frozen lakes and shipped across the North ' +
      'Sea to the ports. The fisheries were among the trade’s great customers. Ice in the hold meant fish ' +
      'that kept for the voyage home, so the boats could go further and stay out longer, and fish that kept on the quay ' +
      'until the train came. Less of the catch rotted, and more of the sea came ' +
      'within reach of the fleet that had the ice.',
    sources: [{ cite: 'B. Blain, “Melting markets: the rise and decline of the Anglo-Norwegian ice trade, 1850–1920”, LSE Economic History working paper (2006) (checked by the Fishing lane)', grade: 'S' }],
  },
  {
    id: 'arc.fishing.fishTrain',
    subject: 'fishing.fishTrain',
    title: 'Grimsby, 1848–1863',
    date: '1848–1863',
    text:
      'The railway reached Grimsby in 1848, and the town’s first fish dock was finished in 1856, with a second in 1877. ' +
      'The point was the train: fish landed at dusk could be in an inland market by morning, and a port with a railway ' +
      'to its quay had the whole country for a customer. Grimsby had 22 fishing vessels in 1857 and 112 six years later. ' +
      'By the 1950s it claimed to be the largest fishing port in the world. By 2013 five trawlers were left.',
    sources: [{ cite: 'Grimsby (railway, 1848; No. 1 Fish Dock, 1856; vessels 1857–1863; the 1950s claim; 2013)', url: 'https://en.wikipedia.org/wiki/Grimsby', grade: 'S' }],
  },
  {
    id: 'arc.fishing.smokehouses',
    subject: 'fishing.smokehouses',
    title: 'The kipper yards, 1882',
    date: '1882–1884',
    text:
      'Smoking needs a building: tall, narrow, black inside, hung with split fish over a smouldering fire. At Peel, on ' +
      'the Isle of Man, two kipper houses founded in 1882 and 1884 are still working, and Craster in Northumberland is ' +
      'known for its own. A smokehouse turned a glut into stock. A catch that would have been sold for nothing on ' +
      'Friday could be sold over a month instead, so a glut was no longer a reason to stop fishing, and the boats ' +
      'went out again on Monday.',
    sources: [kipper],
  },
  {
    id: 'arc.fishing.mealWorks',
    subject: 'fishing.mealWorks',
    title: 'Nothing landed is thrown away',
    date: '19th–20th century',
    text:
      'A meal works takes heads, guts, bones and the unsold catch and makes them into something saleable, at four to ' +
      'five tons of fish to the ton of meal. That is an improvement in the plain sense: less waste for every fish ' +
      'landed. It also changes what is worth catching. Fish too small or too bony for any market become worth landing, ' +
      'and a net that takes everything is no longer wasteful but thrifty. The works that used the waste of a fishery ' +
      'came, in time, to need fisheries of their own.',
    sources: [fishMeal],
  },
  {
    id: 'arc.fishing.gutting',
    subject: 'fishing.gutting',
    title: 'Halibut, five hundred times rarer',
    date: '1889–2007',
    text:
      'Gutting and icing at sea let a trawler stay out longer and work grounds further from home. The long series of ' +
      'trawl landings into England and Wales shows what that reach was spent on. Measured per unit of fishing power, ' +
      'the landings of halibut fell about five hundredfold between 1889 and 2007, haddock more than a hundredfold, and ' +
      'plaice, wolffish, hake and ling each more than twentyfold. The fleet did not notice in any one year. It went ' +
      'further, stayed longer, and landed about as much.',
    sources: [thurstan, { cite: 'ScienceDaily, “Fishing industry must work 17 times harder for same catch” (May 2010)', url: 'https://www.sciencedaily.com/releases/2010/05/100504113117.htm', grade: 'S' }],
  },
  {
    id: 'arc.fishing.longLiners',
    subject: 'fishing.longLiners',
    title: 'Hooks by the thousand',
    date: '19th–21st century',
    text:
      'A longline is a main line with baited hooks on short branches, often hundreds or thousands of them, set and ' +
      'hauled over hours. It takes the fish that bite rather than everything in the path of a net, and it does not ' +
      'drag the bottom. It is selective about fish, less so about birds: albatrosses diving for the bait as the line ' +
      'is set drown on the hooks, an estimated 8,000 a year, and weighted lines, streamers and setting at night are now ' +
      'used to keep them off. The gentler method has its own bill.',
    sources: [{ cite: 'Longline fishing (hooks per line; seabird bycatch, an estimated 8,000 albatrosses a year; mitigation)', url: 'https://en.wikipedia.org/wiki/Longline_fishing', grade: 'S' }],
  },
  {
    id: 'arc.fishing.limits',
    subject: 'fishing.limits',
    title: 'Three miles, then two hundred, 1882–1977',
    date: '1882–1977',
    text:
      'The North Sea Fisheries Convention, signed at The Hague in 1882, gave each coastal state the fishing within three ' +
      'miles of its shore. A century later the limits had grown to two hundred. Canada declared its 200-mile zone on ' +
      '1 January 1977, partly to push out the foreign trawlers that had taken about 80 per cent of the Grand Banks catch ' +
      'in 1968. The foreign boats left. One later review found that the overfishing that followed was “played mainly by ' +
      'Canadian trawlers”. The commons had been nationalised, and the nation fished it down.',
    sources: [
      { cite: 'Encyclopaedia Britannica (1911), “Fisheries” and “Trawling”: the North Sea Fisheries Convention, The Hague, 1882 (checked by the Fishing lane)', grade: 'S' },
      grandBanks,
    ],
  },
  {
    id: 'arc.fishing.landingsQuota',
    subject: 'fishing.landingsQuota',
    title: 'Quotas from the catch books, Iceland, 1984',
    date: '1984–2007',
    text:
      'When Iceland gave its demersal fishing vessels quotas in 1984, each boat’s share was set from its catches in the ' +
      'three years before. A quota drawn from the landings books holds the catch where the fleet already had it, which ' +
      'may be more than the stock can bear, and hands the right to fish to whoever was fishing hardest. The quotas became ' +
      'transferable and, under the Fisheries Management Act of 1990, general. In 2007 the United Nations Human Rights ' +
      'Committee found that the system breached equality by favouring the original recipients.',
    sources: [
      iceland,
      { cite: 'UN Human Rights Committee, Communication 1306/2004, Haraldsson and Sveinsson v Iceland (14 December 2007)', url: 'https://www.icsf.net/wp-content/uploads/2021/06/3150_art10.pdf', grade: 'S' },
    ],
  },
  {
    id: 'arc.fishing.surveyQuota',
    subject: 'fishing.surveyQuota',
    title: 'Two years, thirty-two, 1992–2024',
    date: '1992–2024',
    text:
      'On 2 July 1992 Canada’s fisheries minister announced a two-year moratorium on northern cod. By then the spawning ' +
      'stock was put at about one per cent of its estimated peak. Roughly 30,000 people in Newfoundland and Labrador lost ' +
      'their work, often called the largest industrial closure in Canadian history. The two years became thirty-two: the ' +
      'stock did not come back when the fishing stopped, and a commercial northern cod fishery reopened only in 2024. A ' +
      'quota of nought is the last level of any quota. It works best before it is needed.',
    sources: [codMoratorium, grandBanks],
  },
  {
    id: 'arc.fishing.closedSeason',
    subject: 'fishing.closedSeason',
    title: 'Six years ashore, 1939–1945',
    date: '1939–1945',
    text:
      'The longest closed season the North Sea has known was imposed by war. Between 1938 and 1941 the fishing effort of ' +
      'British steam trawlers fell by 97 per cent, and for six years a large part of the sea was hardly fished at all. ' +
      'When the boats went back their catches per trip were enormous. A fisheries scientist, John Gulland, cautioned in ' +
      '1963 that the rise in catch per unit of effort probably overstated the real recovery of the stocks. The stocks ' +
      'had recovered; the gauge had recovered faster.',
    sources: [
      { cite: 'G. H. Engelhard et al., Naturwissenschaften 97 (2010), doi:10.1007/s00114-010-0696-5: the Second World War as an unintended closure of the North Sea', url: 'https://link.springer.com/article/10.1007/s00114-010-0696-5', grade: 'S' },
      { cite: 'J. A. Gulland, paper to the ICES Symposium on the Measurement of Abundance of Fish Stocks (1963)', url: 'https://www.ices.dk/sites/pub/CM%20Doccuments/1963/Symposium%20on%20the%20Measurement%20of%20Abundance%20of%20Fish%20stocks/1963_Symposium%20on%20the%20Measurement%20of%20Abundance%20of%20Fish%20stocks%2014.pdf', grade: 'S' },
    ],
  },
  {
    id: 'arc.fishing.mesh',
    subject: 'fishing.mesh',
    title: 'The Overfishing Convention, 1946',
    date: '1946–1954',
    text:
      'A convention for the regulation of the meshes of fishing nets and the size limits of fish was signed in London on ' +
      '5 April 1946, for the waters of the north-east Atlantic and the North Sea. A wider mesh lets the young fish ' +
      'through to grow; a size limit forbids landing them if they are caught. It took seven years to come into force, ' +
      'because governments were slow to ratify, and the countries agreed to enforce the minimum mesh by 5 April 1954. ' +
      'Nothing in a mesh limits how many boats tow it.',
    sources: [
      { cite: 'Convention for the Regulation of the Meshes of Fishing Nets and the Size Limits of Fish (London, 5 April 1946), GOV.UK', url: 'https://www.gov.uk/government/publications/convention-for-the-regulation-of-the-meshes-of-fishing-nets-and-size-limits-of-fish-london-541946', grade: 'V' },
      { cite: 'Hansard, written answer, 11 March 1953, Overfishing Convention (London meeting)', url: 'https://api.parliament.uk/historic-hansard/written_answers/1953/mar/11/overfishing-convention-london-meeting', grade: 'V' },
    ],
  },
  {
    id: 'arc.fishing.surveyCruises',
    subject: 'fishing.surveyCruises',
    title: 'The International Council, 1902',
    date: '1902',
    text:
      'The International Council for the Exploration of the Sea was founded at Copenhagen on 22 July 1902 by eight ' +
      'countries, the United Kingdom among them, out of a growing concern for the fish stocks of the North Sea. Its ' +
      'business was measurement, its members’ research pooled across borders. It was the first standing attempt to measure the sea rather than the market. It could advise. Setting ' +
      'the catch was left to the governments, which took their time.',
    sources: [{ cite: 'International Council for the Exploration of the Sea (Copenhagen, 22 July 1902; eight founding nations)', url: 'https://en.wikipedia.org/wiki/International_Council_for_the_Exploration_of_the_Sea', grade: 'S' }],
  },
  {
    id: 'arc.fishing.exhibition',
    subject: 'fishing.exhibition',
    title: 'Professor Huxley at the Exhibition, 1883',
    date: '1883',
    text:
      'Opening the Fisheries Exhibition in London in 1883, Thomas Henry Huxley said that the cod fishery, the herring ' +
      'fishery, the pilchard fishery, the mackerel fishery, “and probably all the great sea fisheries, are ' +
      'inexhaustible”. He is usually quoted that far and no further. He also made the claim “in relation to our present ' +
      'modes of fishing”: as the fleets were then. The qualifier was the whole point, and it was overtaken within a ' +
      'decade by the steam trawler, the otter board and the ice in the hold.',
    sources: [huxley],
  },
  {
    id: 'arc.fishing.garstang',
    subject: 'fishing.garstang',
    title: 'The Impoverishment of the Sea, 1900',
    date: '1900',
    text:
      'In 1900 Walter Garstang published in the Journal of the Marine Biological Association a ' +
      'sixty-nine-page paper with an unhurried title: “The Impoverishment of the Sea: a critical summary of the ' +
      'experimental and statistical evidence bearing upon the alleged depletion of the trawling grounds”. Seventeen ' +
      'years after Huxley’s address, the question of whether the trawlers were emptying the North Sea was being asked ' +
      'with tables. The alleged depletion is the phrase to notice. Proof was a long time coming, and the trawlers did ' +
      'not wait for it.',
    sources: [{ cite: 'W. Garstang, “The Impoverishment of the Sea”, Journal of the Marine Biological Association of the UK 6(1) (1900): 1–69', url: 'https://plymsea.ac.uk/id/eprint/206', grade: 'V' }],
  },
  {
    id: 'arc.fishing.hyperstability',
    subject: 'd.fish.tenchFullHolds',
    title: 'Catch per trip, 2001',
    date: '2001',
    text:
      'A fleet’s catch per unit of effort is the oldest gauge of a fish stock, and the one the skippers keep themselves. ' +
      'In 2001 three fisheries scientists tested it against estimates of abundance made by other means in 297 ' +
      'series and found strong support for hyperstability, especially in cod and other groundfish: the catch per trip ' +
      'falls more slowly than the stock. Shoaling fish crowd into what is left, and the fleet finds them. The gauge ' +
      'reads healthy until very late. It is not lying; it is measuring the fleet.',
    sources: [{ cite: 'S. J. Harley, R. A. Myers and A. Dunn, “Is catch-per-unit-effort proportional to abundance?”, Canadian Journal of Fisheries and Aquatic Sciences 58(9) (2001): 1760–1772', url: 'https://doi.org/10.1139/cjfas-58-9-1760', grade: 'V' }],
  },
  {
    id: 'arc.fishing.grandBanks',
    subject: 'd.fish.tenchForeigners',
    title: 'Foreign trawlers on the Grand Banks, 1959–1977',
    date: '1959–1977',
    text:
      'Groundfish catches on the Grand Banks of Newfoundland more than doubled between 1959 and 1968, from about 360,000 ' +
      'tons to 810,000, and foreign fleets, with factory trawlers that could stay out for months, took about 80 per cent ' +
      'of the 1968 catch. Between 1962 and 1977 the harvestable biomass of cod fell by an estimated 82 per cent. The ' +
      'foreign boats were the obvious culprits, and they were shut out in 1977. They were not the only ones.',
    sources: [grandBanks, { cite: 'Heritage Newfoundland and Labrador, fishery technology (factory trawlers)', url: 'https://www.heritage.nf.ca/articles/economy/fishery-technology.php', grade: 'S' }],
  },
];
