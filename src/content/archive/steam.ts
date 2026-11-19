/**
 * The Archive: Steam (the Coal Age, 1712–1913). See index.ts for the rules. Run-1 subjects come first (the first cards,
 * pumping, the condenser, the Coal Question), so the viewer is not empty when it opens at the first Reckoning.
 */
import type { ArchiveDef } from '../../types';
import { hansardCoal1913, iea2024, jevons, smiles12 } from './sources';

export const steamArchive: ArchiveDef[] = [
  {
    id: 'arc.steam.industry',
    subject: 'steam',
    title: 'Two centuries of coal, 1712–2024',
    date: '1712–2024',
    text:
      'The first steam engine known to have worked was Thomas Newcomen’s, near Dudley Castle in 1712, pumping water out of ' +
      'a coal pit. Two centuries later Great Britain raised 287.3 million tons of coal in a single year, 1913, and never ' +
      'raised so much again. The last deep mine, Kellingley, closed in December 2015; the last coal-fired power station, ' +
      'Ratcliffe-on-Soar, in September 2024. In that same year the world burned a record of about 8.77 billion tonnes, by ' +
      'the International Energy Agency’s reckoning. The industry did not end in Britain so much as leave it.',
    sources: [
      hansardCoal1913,
      iea2024,
      { cite: 'Coal mining in the United Kingdom (Newcomen, 1712; Kellingley, 2015; Ratcliffe, 2024)', url: 'https://en.wikipedia.org/wiki/Coal_mining_in_the_United_Kingdom', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.pumping',
    subject: 'steam.pumping',
    title: 'The first customer, 1712',
    date: '1712',
    text:
      'For its first half-century the steam engine had one use that paid: keeping mines dry. Newcomen’s atmospheric engine ' +
      'raised water by the weight of the air on a piston, and burned so much coal doing it that it was worth having only ' +
      'where coal was cheapest, which was at the coal pit itself. Jevons’s table puts the average old engine of 1769 at a ' +
      'duty of 5,590,000: that many pounds of water raised one foot by a bushel of coal. The arrangement fed on itself. A ' +
      'drier pit could be sunk deeper; a deeper pit needed more pumping; more pumping burned more of the coal it reached.',
    sources: [jevons.ch7, { cite: 'Newcomen atmospheric engine (Dudley Castle, 1712)', url: 'https://en.wikipedia.org/wiki/Newcomen_atmospheric_engine', grade: 'S' }],
  },
  {
    id: 'arc.steam.boilers',
    subject: 'steam.boilers',
    title: 'Mr Smeaton measures the engines, 1772',
    date: '1772',
    text:
      'John Smeaton invented no new engine; he measured the old ones. Surveying fifteen atmospheric engines about Newcastle, ' +
      'he found the best doing more than twice the work of the worst on the same coal. His own engine at Long Benton, 1772, ' +
      'with its proportions corrected and its cylinder bored true, worked to a duty of 9,450,000 against the old average of ' +
      '5,590,000. Nothing in it was patented, and nothing needed to be. The measure he used, duty, became the trade’s ' +
      'favourite number for the next ninety years.',
    sources: [
      jevons.ch7,
      { cite: 'D. Lardner, The Steam Engine Explained and Illustrated, ch. IX (Smeaton’s survey of the Newcastle engines)', url: 'https://textbase.scriptorium.ro/lardner/the_steam_engine/chap_ix/178', grade: 'S' },
      { cite: 'Grace’s Guide, Long Benton Colliery', url: 'https://gracesguide.co.uk/Long_Benton_Colliery', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.condenser',
    subject: 'steam.condenser',
    title: 'The separate condenser, 1769',
    date: '1769',
    text:
      'The trouble James Watt found in 1765 was that a Newcomen engine filled its cylinder with steam and then chilled it ' +
      'with a jet of cold water at every stroke, so that much of its coal went on reheating iron. His remedy was to condense ' +
      'the steam in a separate vessel and keep the cylinder hot. The patent is dated 5 January 1769; the first engines for ' +
      'sale were erected in 1776, after Matthew Boulton had joined him. Jevons gives Watt’s engine of that year a duty of ' +
      '21,600,000, nearly four times the old average. The Cornish copper and tin mines, which had to ship their coal in, ' +
      'became its great market.',
    sources: [
      jevons.ch7,
      { cite: 'Watt steam engine (patent of 5 January 1769; first commercial engines 1776)', url: 'https://en.wikipedia.org/wiki/Watt_steam_engine', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.coalQuestion',
    subject: 'steam.coalQuestion',
    title: 'The Coal Question, 1865',
    date: '1865',
    text:
      'William Stanley Jevons was 29, a former assayer at the Sydney Mint, when he published The Coal Question: An Inquiry ' +
      'concerning the Progress of the Nation, and the Probable Exhaustion of our Coal-mines. Its seventh chapter took the ' +
      'engineers’ hope that thriftier engines would make the coal last, and turned it over. “It is wholly a confusion of ' +
      'ideas to suppose that the economical use of fuel is equivalent to a diminished consumption. The very contrary is the ' +
      'truth.” His evidence was Scottish iron: coal per ton cut to less than a third, followed “by a ten-fold total ' +
      'consumption”. John Stuart Mill raised the book in the Commons in 1866, and Gladstone took up its proposal to pay down ' +
      'the National Debt while coal was cheap.',
    sources: [
      jevons.ch7,
      { cite: 'Dictionary of National Biography, vol. 29, “Jevons, William Stanley”', url: 'https://kwx.liehendr.com/content/wikisource_en_all_maxi_2022-09/A/Page%3ADictionary_of_National_Biography_volume_29.djvu/381', grade: 'S' },
      { cite: 'design/research/energy.md §1.5–1.6 (Mill in the Commons, 1866; Gladstone’s 1866 Budget)', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.coalQuestion.duty',
    subject: 'steam.coalQuestion',
    title: 'Jevons’s table of duty, 1769–1859',
    date: '1866',
    text:
      'Chapter VII of The Coal Question prints a table of engine duty, the pounds of water raised one foot by a bushel of ' +
      'coal: the old atmospheric engines of 1769, 5,590,000; Smeaton, 1772, 9,450,000; Watt, 1776, 21,600,000; Watt working ' +
      'expansively, 1779–88, 26,600,000; the Cornish engineers, 1820, 28,000,000, and their average in 1830, 43,350,000; ' +
      'in 1859 an average of 54,000,000 and a best engine of 80,000,000, those two reckoned per hundredweight, a heavier ' +
      'bushel. Jevons footnoted the change of measure as a source of “much confusion”. Over the same ninety years British ' +
      'coal output multiplied many times over. “The whole history of the steam-engine”, he wrote, “is one of economy.”',
    sources: [jevons.ch7],
  },
  {
    id: 'arc.steam.doubleActing',
    subject: 'steam.doubleActing',
    title: 'Rotation, 1781–1788',
    date: '1781–1788',
    text:
      'Between 1781 and 1788 Watt added to his engine the sun-and-planet gear, which turned a wheel; the double-acting ' +
      'cylinder, pushed by steam on the downstroke and the upstroke alike; the parallel motion; and the centrifugal ' +
      'governor. The dates are the standard ones. Together they amounted to rotation. An engine that had only pumped could ' +
      'now drive a mill, a brewery or a forge, and it could stand wherever coal could be carted. Jevons records the ' +
      'expansive engines of those years at a duty of 26,600,000. The mills, once tied to falling water, followed the coal.',
    sources: [jevons.ch7, { cite: 'Watt steam engine (rotative engines, 1781–1788)', url: 'https://en.wikipedia.org/wiki/Watt_steam_engine', grade: 'S' }],
  },
  {
    id: 'arc.steam.bwLicence',
    subject: 'steam.bwLicence',
    title: 'Paid by the coal not burned, 1776–1800',
    date: '1776–1800',
    text:
      'Boulton and Watt did not, at first, sell engines so much as the right to save coal. A mine erected the engine at its ' +
      'own cost and paid the partners a premium of one third of the value of the fuel saved against an atmospheric engine ' +
      'doing the same work, for as long as Watt’s patent ran, which an Act of 1775 extended to 1800. Engines carried ' +
      'counters so that the strokes, and so the saving, could be reckoned. The Cornish adventurers came to resent paying ' +
      'for coal they had never burned, and years of litigation followed. It was the first efficiency business, and its ' +
      'revenue was the gap.',
    sources: [
      smiles12,
      { cite: 'J. Kelly, account of Boulton and Watt licences, via the Hopkin Thomas Project (premium to 1800)', url: 'https://thehopkinthomasproject.com/TheHopkinThomasProject/TimeLine/Wales/Steam/JamesWatt/Kelly/Watt.htm', grade: 'S' },
      { cite: 'A treatise on the Cornish pumping engine, appendix (payment of one third of the fuel saved)', url: 'https://goobi.tib.eu/viewer/fulltext/1029262349/34', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.pirateEngine',
    subject: 'steam.pirateEngine',
    title: 'The pirates of Cornwall, 1793–1799',
    date: '1793–1799',
    text:
      'Cornish engineers who would not pay Watt’s premium built engines of their own. Edward Bull, once an erector for ' +
      'Boulton and Watt, put up inverted engines without a beam; Jonathan Hornblower patented a compound engine of two ' +
      'cylinders. Boulton and Watt sued Bull in 1793 and won, and sued Hornblower and Maberly in 1796; in 1799 the King’s ' +
      'Bench upheld Watt’s patent and Hornblower’s business collapsed. The patent expired the next year. Freed of it, the ' +
      'Cornish engineers improved the engine as they pleased: Jevons’s table has their duty at 28,000,000 in 1820 and ' +
      '43,350,000 by 1830.',
    sources: [
      { cite: 'Edward Bull (engineer): Boulton and Watt v. Bull, 1793 and 1799', url: 'https://en.wikipedia.org/wiki/Edward_Bull', grade: 'S' },
      { cite: 'Jabez Carter Hornblower: Hornblower and Maberly, King’s Bench, 1799', url: 'https://en.wikipedia.org/wiki/Jabez_Carter_Hornblower', grade: 'S' },
      jevons.ch7,
    ],
  },
  {
    id: 'arc.steam.highPressure',
    subject: 'steam.highPressure',
    title: 'Strong steam, 1801–1804',
    date: '1801–1804',
    text:
      'Watt kept his steam barely above the pressure of the air. Richard Trevithick, a Cornish mine engineer, raised it ' +
      'until the steam itself did the pushing, which made an engine small enough to move. His road engine ran at Camborne ' +
      'on Christmas Eve 1801; on 21 February 1804 his locomotive at Penydarren hauled ten tons of iron and some seventy men ' +
      'nine miles along a tramroad, and broke the rails doing it. Jevons quotes the arithmetic: old low-pressure engines ' +
      'burned “12 or 14 lbs. of coal per hour”, and engines at higher pressures “only 3½ or 4 lbs.” The boilers ' +
      'occasionally exploded.',
    sources: [
      jevons.ch7,
      { cite: 'National Museum Wales, “Birth of the Railway Locomotive” (Penydarren, 21 February 1804)', url: 'https://museum.wales/blog/2189/Birth-of-the-Railway-Locomotive/', grade: 'S' },
      { cite: 'Grace’s Guide, Richard Trevithick: Merthyr Tramroad Trial', url: 'https://gracesguide.co.uk/Richard_Trevithick:_Merthyr_Tramroad_Trial', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.cornishEngine',
    subject: 'steam.cornishEngine',
    title: 'The Cornish engine, 1830s–1860s',
    date: '1830s–1860s',
    text:
      'The Cornish engine was Watt’s, run on Trevithick’s strong steam, cut off early in the stroke and left to expand, ' +
      'its boilers lagged and its pipes cased. It was built for the deep tin and copper mines, where coal came by sea and ' +
      'every bushel was counted. Jevons gives the Cornish average in 1859 as 54,000,000 and the best engine as 80,000,000; ' +
      'in March 1866, he notes, 27 engines averaged 51,700,000. One engine at Fowey Consols set a record in the 1830s that ' +
      'was fiercely disputed and never repeated. Cheaper pumping did not shorten the life of the mines. It let them follow ' +
      'the lodes further down.',
    sources: [
      jevons.ch7,
      { cite: 'Austen’s engine, Fowey Consols (the disputed record)', url: 'https://streetguide.co.uk/image/6858592', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.engineReporter',
    subject: 'steam.engineReporter',
    title: 'Lean’s Engine Reporter, from 1810',
    date: 'c. 1810',
    text:
      'From about 1810 the Cornish mine owners paid Joel Lean to inspect their pumping engines and publish each one’s duty ' +
      'every month. A counter in a locked box recorded the strokes; the coal was weighed; the figures were printed and ' +
      'compared. Engineers competed to head the table, and the best of them were hired away on the strength of it. The ' +
      'Reporter stayed with the Lean family until 1904. It published the duty of every engine in the county and the ' +
      'county’s total coal not at all: efficiency was a sport, and its score was kept.',
    sources: [
      { cite: 'A. Nuvolari and B. Verspagen, “Lean’s Engine Reporter and the development of the Cornish engine: a reappraisal”, Transactions of the Newcomen Society 77 (2007)', url: 'https://research.tue.nl/nl/publications/b5bb00fa-5a16-4a61-a4c9-f09e25c0fc6d', grade: 'V' },
      { cite: 'Grace’s Guide, Joel Lean', url: 'https://gracesguide.co.uk/Joel_Lean', grade: 'S' },
      { cite: 'Lean’s Engine Reporter (founded 1810; in the family until 1904)', url: 'https://en.wikipedia.org/wiki/Lean%27s_Engine_Reporter', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.compound',
    subject: 'steam.compound',
    title: 'Steam used twice, 1804–1866',
    date: '1804–1866',
    text:
      'Arthur Woolf’s compound engine of 1804 passed the steam from a small high-pressure cylinder into a larger one, so ' +
      'that it worked twice before it was condensed. On land the Cornish engineers mostly preferred one cylinder worked ' +
      'expansively; at sea, where coal took up room that could carry cargo, compounding paid. Alfred Holt’s Agamemnon, ' +
      'completed in 1866, burned about 20 tons of coal a day at ten knots, little enough to make a steamer pay on the long ' +
      'run to China. Holt’s Blue Funnel Line followed, and then the rest of the trade.',
    sources: [
      { cite: 'SS Agamemnon (1865): Holt’s compound steamer, completed 1866', url: 'https://en.wikipedia.org/wiki/SS_Agamemnon_(1865)', grade: 'S' },
      { cite: 'design/research/energy.md §1.1 (Woolf, patent 1804)', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.corliss',
    subject: 'steam.corliss',
    title: 'Mr Corliss’s valves, 1849',
    date: '1849',
    text:
      'George Corliss of Providence, Rhode Island, took United States patent 6,162 on 10 March 1849 for valve gear in which ' +
      'the governor itself decided when to shut off the steam: the cylinder took exactly as much as the load in hand ' +
      'required, and no more. A saving of about 30 per cent in steam is the figure usually given. A New England mill that ' +
      'replaced its engine with a Corliss, an economic historian found, used about half the fuel. In 1876 a single Corliss ' +
      'engine drove nearly every machine in Machinery Hall at the Philadelphia Centennial Exhibition, through more than a ' +
      'mile of shafting.',
    sources: [
      { cite: 'G. H. Corliss, US Patent 6,162, 10 March 1849', url: 'https://patentimages.storage.googleapis.com/46/e5/57/c43ca0447d612c/US6162.pdf', grade: 'V' },
      { cite: 'P. Temin, “Steam and Waterpower in the Early Nineteenth Century”, Journal of Economic History 26(2) (1966): 187–205', url: 'https://www.cambridge.org/core/journals/journal-of-economic-history/article/steam-and-waterpower-in-the-early-nineteenth-century/0D4D16AF6C480D19B3F1C23E966F18A2', grade: 'V' },
      { cite: 'Smithsonian, National Museum of American History: Corliss valve gear; the Centennial Engine', url: 'https://www.si.edu/object/nmah_846117', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.smokeFurnace',
    subject: 'steam.smokeFurnace',
    title: 'A furnace that burns its own smoke, 1785–1853',
    date: '1785–1853',
    text:
      'Watt patented a furnace in 1785 that admitted air over the fire so that the smoke was burned instead of sent up the ' +
      'chimney. It was neither the first such scheme nor the last. In 1853 Parliament passed Palmerston’s Smoke Nuisance ' +
      'Abatement (Metropolis) Act, which required furnaces in London to consume their own smoke from the following August, ' +
      'glassworks and potteries excepted. Manufacturers told the Commons it could not be done. Members replied that the Act ' +
      'would teach them how. A smokeless furnace burned its coal a little more completely, which made it a little cheaper ' +
      'to run.',
    sources: [
      { cite: 'Hansard, HL Deb 16 August 1853, vol. 129, cc. 1752–5: Smoke Nuisance Abatement (Metropolis) Bill', url: 'https://api.parliament.uk/historic-hansard/lords/1853/aug/16/smoke-nuisance-abatement-metropolis-bill', grade: 'V' },
      { cite: 'Hansard, HC Deb 8 August 1853, vol. 129, cc. 1495–7', url: 'https://api.parliament.uk/historic-hansard/commons/1853/aug/08/smoke-nuisance-abatement-metropolis-bill', grade: 'V' },
      { cite: 'T. H. Marshall, James Watt, ch. 9 (the smokeless furnace patent)', url: 'https://areeweb.polito.it/strutture/cemed/SUST_didattica.bk/2003/2003_Storia%20della%20tecnologia/WEB%20Materials%20&%20Sources/Steam_Library/marshall/chapter9.html', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.forcedDraught',
    subject: 'steam.forcedDraught',
    title: 'The closed stokehold, 1877–1895',
    date: '1877–1895',
    text:
      'A chimney draws only as hard as hot air rises. Blow air into the fire with a fan and a boiler of a given size makes ' +
      'far more steam. The Navy’s torpedo boat Lightning of 1877 was among the first vessels to try it, with the stokers ' +
      'shut in a boiler room under pressure, entered through an air lock, as into a diving bell. By the mid-1880s forced ' +
      'draught was, as a member reminded the Commons in 1895, all the rage. Forced boilers made the speed on trials and ' +
      'sometimes failed at sea, and the shipbuilders answered with larger and stronger boilers to be forced harder.',
    sources: [
      { cite: 'Hansard, HC Deb 29 April 1895, vol. 33, cc. 70–112: Supply, Navy Estimates 1895–96', url: 'https://api.parliament.uk/historic-hansard/commons/1895/apr/29/supply-navy-estimates-1895-96', grade: 'V' },
      { cite: 'Science Museum Group, model of the forced draught arrangements of Thornycroft torpedo boats', url: 'https://collection.sciencemuseumgroup.org.uk/objects/co39546/model-scale-1-12-1-1-illustrating-the-syste-models', grade: 'S' },
      { cite: 'List of torpedo boat classes of the Royal Navy (Lightning, 1877)', url: 'https://en.wikipedia.org/wiki/List_of_torpedo_boat_classes_of_the_Royal_Navy', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.tripleExpansion',
    subject: 'steam.tripleExpansion',
    title: 'Three cylinders, 1881',
    date: '1881',
    text:
      'The SS Aberdeen, engined to Alexander Kirk’s design in 1881, expanded her steam through three cylinders in turn. The ' +
      'engine was the lesser part of the achievement: the breakthrough was a boiler that could hold the higher pressure ' +
      'that three expansions needed. Within a few years the triple-expansion engine was the standard power of the world’s ' +
      'cargo fleets. Cheaper ton-miles brought down freight rates, and lower freight rates brought cargoes that had never ' +
      'been worth carrying, such as grain from the far side of the world, into British ports.',
    sources: [
      { cite: 'SS Aberdeen (1881) and the triple-expansion engine', url: 'https://en.wikipedia.org/wiki/SS_Aberdeen_(1881)', grade: 'S' },
      { cite: 'design/research/energy.md §1.1 (Kirk; the boiler as the breakthrough)', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.turbine',
    subject: 'steam.turbine',
    title: 'Turbinia at Spithead, 1897',
    date: '1884–1897',
    text:
      'Charles Parsons patented his steam turbine in 1884: no pistons, only jets of steam on rings of blades turning at ' +
      'great speed. It found its first work driving dynamos. Thirteen years later, at the naval review for the Diamond ' +
      'Jubilee on 26 June 1897, his launch Turbinia, uninvited, ran up and down the lines of warships at about 34 knots, ' +
      'faster than anything the Navy could send after her. The Admiralty ordered turbines. So, in time, did the power ' +
      'stations, and the steam engine became the servant of the electric lamp.',
    sources: [
      { cite: 'Royal Collection Trust, The Naval Review at Spithead, 26 June 1897', url: 'https://col.rct.uk/collection/405260/the-naval-review-at-spithead-26-june-1897', grade: 'S' },
      { cite: 'Turbinia', url: 'https://en.wikipedia.org/wiki/Turbinia', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.auxiliarySail',
    subject: 'steam.auxiliarySail',
    title: 'The clipper launched too late, 1869',
    date: '1869',
    text:
      'Early steamers kept their masts, and burned coal only when the wind failed. The sailing ship’s last great trade was ' +
      'China tea, carried round the Cape by the clippers. On 17 November 1869 the Suez Canal opened, cutting the passage ' +
      'to the East by thousands of miles; it was of little use to a sailing ship, which could not count on a wind between ' +
      'its banks. Five days later, on 22 November, the clipper Cutty Sark was launched at Dumbarton. Steamers through the ' +
      'canal soon reached London with the new season’s tea before the clippers could, and Cutty Sark carried her last tea ' +
      'cargo in 1877.',
    sources: [
      { cite: 'Royal Museums Greenwich, Cutty Sark: history (launch, 22 November 1869; the tea trade)', url: 'https://www.rmg.co.uk/cutty-sark/history', grade: 'S' },
      { cite: 'Royal Museums Greenwich, “1870–78: the China tea years”', url: 'https://www.rmg.co.uk/explore/1870-78-china-tea-years', grade: 'S' },
      { cite: 'design/research/energy.md §1.3 (Suez opened 17 November 1869)', grade: 'V' },
    ],
  },
  {
    id: 'arc.steam.lathe',
    subject: 'steam.lathe',
    title: 'Parts that fit, c. 1800',
    date: 'c. 1800',
    text:
      'An engine is only as good as its fit. Watt’s first cylinders leaked until John Wilkinson, the ironmaster, bored them ' +
      'true with a cannon-boring machine in 1774; and Henry Maudslay’s screw-cutting lathe, about 1800, made screws that ' +
      'were alike enough to be interchangeable. A generation of engineers trained in his London shop carried his methods ' +
      'into the trade. Precision did not make one engine burn more coal. It made engines cheap enough to build in numbers, ' +
      'and so many more of them burned it.',
    sources: [
      { cite: 'Henry Maudslay (screw-cutting lathe, c. 1800; his pupils)', url: 'https://en.wikipedia.org/wiki/Henry_Maudslay', grade: 'S' },
      { cite: 'John Wilkinson (industrialist): the boring machine, 1774', url: 'https://en.wikipedia.org/wiki/John_Wilkinson_(industrialist)', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.mills',
    subject: 'steam.mills',
    title: 'Cotton, and who picked it, 1800–1860',
    date: '1800–1860',
    text:
      'The steam mill freed the cotton masters from the riverbank, and Lancashire grew round the coalfield. The raw cotton ' +
      'came across the Atlantic. About a quarter of the cotton landed at Liverpool in 1800 had been grown in the United ' +
      'States; by 1850 American cotton was 72 per cent of what Britain consumed, and by the late 1850s 77 per cent of some ' +
      '800 million pounds a year. Nearly all of it was grown and picked by enslaved people in the American South. Every ' +
      'improvement in the mill raised the demand for the crop. The Archive records it because the ledgers did not.',
    sources: [
      { cite: 'S. Beckert, Empire of Cotton: A Global History (2014); figures as given in Beckert’s essay adaptations', url: 'https://www.wcfia.harvard.edu/publications/turbulent-reign-king-cotton-dark-history-one-world%E2%80%99s-most-important-commodities', grade: 'S' },
      { cite: 'S. Beckert, “Emancipation and Empire: Reconstructing the Worldwide Web of Cotton Production in the Age of the American Civil War”, American Historical Review 109(5) (2004)', url: 'https://dash.harvard.edu/bitstream/handle/1/3207344/Beckert_EmancipationEmpire.pdf?sequence=2', grade: 'V' },
    ],
  },
  {
    id: 'arc.steam.winding',
    subject: 'steam.winding',
    title: 'Who hauled the coal before, 1842',
    date: '1842',
    text:
      'Before the engines wound the coal up the shaft, and for long after, people hauled it to the shaft bottom: women and ' +
      'girls harnessed to tubs, children opening and shutting the ventilation doors in the dark. The Children’s Employment ' +
      'Commission put their evidence before Parliament in 1842, with drawings, and within months the Mines and Collieries ' +
      'Act forbade women and girls to work underground and set ten as the youngest age for boys. One inspector was ' +
      'appointed for the whole country. The age was raised to twelve in 1860.',
    sources: [
      { cite: 'UK Parliament, Living Heritage: The 1842 Mines Act', url: 'https://webtest.parliament.uk/about/living-heritage/transformingsociety/livinglearning/19thcentury/overview/coalmines', grade: 'V' },
      { cite: 'Mines and Collieries Act 1842; Coal Mines Regulation Act 1860', url: 'https://en.wikipedia.org/wiki/Mines_and_Collieries_Act_1842', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.deeperShaft',
    subject: 'steam.deeperShaft',
    title: 'One shaft at Hartley, 1862',
    date: '1862',
    text:
      'On 16 January 1862 the beam of the pumping engine at the Hester Pit, New Hartley, Northumberland, broke, and half ' +
      'of it fell down the shaft. It was the only shaft. The men of two shifts were below, and the wreckage sealed them in. ' +
      'Rescuers took days to reach them; 204 men and boys had died. On 7 August Parliament passed an Act requiring every ' +
      'colliery to have at least two means of escape. Sinking a second shaft was expensive, and it was thereafter the law.',
    sources: [
      { cite: 'Hartley Colliery disaster (16 January 1862; 204 dead; the Act of 7 August 1862)', url: 'https://en.wikipedia.org/wiki/Hartley_Colliery_disaster', grade: 'S' },
      { cite: 'Northern Mine Research Society, New Hartley Colliery shaft accident, 1862', url: 'https://nmrs.org.uk/mines-map/accidents-disasters/durham/new-hartley-colliery-shaft-accident-hartley-1862/', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.railways',
    subject: 'steam.railways',
    title: 'Coal hauling coal, 1825–1830',
    date: '1825–1830',
    text:
      'The Stockton and Darlington opened on 27 September 1825 to carry coal from the pits of County Durham to the Tees. ' +
      'The Liverpool and Manchester, opened on 15 September 1830, was the first line to run every train by steam on a ' +
      'timetable, for passengers and goods alike. On its opening day William Huskisson, the member for Liverpool, stepped ' +
      'down onto the track and was struck by Rocket; he died that evening. The railways burned coal to haul coal, and in ' +
      'hauling it cheaply made it worth burning in places it had never reached.',
    sources: [
      { cite: 'University of Warwick, “A Day in History: 15 September 1830”', url: 'https://warwick.ac.uk/fac/arts/history/ecc/archive/emforum/projects/adayinhistory/15september1830', grade: 'S' },
      { cite: 'Grace’s Guide, Liverpool and Manchester Railway', url: 'https://gracesguide.co.uk/Liverpool_and_Manchester_Railway', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.parliamentaryTrains',
    subject: 'steam.parliamentaryTrains',
    title: 'The parliamentary train, 1844',
    date: '1844',
    text:
      'Gladstone’s Railway Regulation Act of 1844 required every company to run at least one train each way on every line ' +
      'each day, stopping at every station, at no more than a penny a mile, with seats, and with carriages protected from ' +
      'the weather. Before it, third-class passengers had often travelled in open wagons. The companies ran the minimum, ' +
      'frequently at the least convenient hour, and the parliamentary train became a byword for slowness. It also put ' +
      'travel within reach of people who had never left their parish, and they filled it.',
    sources: [
      { cite: 'Railway Regulation Act 1844 (7 & 8 Vict. c. 85), s. 6 (Irish Statute Book text)', url: 'https://www.irishstatutebook.ie/1844/en/act/pub/0085/sec0006.html', grade: 'V' },
      { cite: 'The Victorian Web, the Railway Act of 1844', url: 'https://victorianweb.org/history/1844act.html', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.limitedLiability',
    subject: 'steam.limitedLiability',
    title: 'Other people’s money, 1855',
    date: '1855',
    text:
      'Until the middle of the century an investor in an ordinary partnership was answerable for its debts to the last ' +
      'shilling he owned, and a debtor could go to prison. The Limited Liability Act, given royal assent on 14 August 1855, ' +
      'let companies of more than 25 members limit each shareholder’s loss to his stake. The Joint Stock Companies Act of ' +
      '1856 let any seven people register one by a simple procedure. Capital that had sat in the funds went looking for ' +
      'collieries, ironworks and lines to build.',
    sources: [
      { cite: 'Limited Liability Act 1855 (royal assent 14 August 1855)', url: 'https://en.wikipedia.org/wiki/Limited_Liability_Act_1855', grade: 'S' },
      { cite: 'Joint Stock Companies Act 1856 (royal assent 14 July 1856)', url: 'https://en.wikipedia.org/wiki/Joint_Stock_Companies_Act_1856', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.steamships',
    subject: 'steam.steamships',
    title: 'Coaling stations and the flag, 1839',
    date: '1839',
    text:
      'A steamer is only as free as its bunkers. In January 1839 the East India Company’s forces took Aden, at the mouth of ' +
      'the Red Sea, chiefly because the new steam route from Bombay to Suez needed a coaling station on the way; the ruler ' +
      'who owned the port had refused to sell it. Depots followed at intervals along every main route, and the Royal Navy ' +
      'came to plan its stations by them. The ocean steamship was a creature of empire as much as of engineering, and the ' +
      'coal it burned was shipped out from Britain to wait for it.',
    sources: [
      { cite: '“Aden, British India and the Development of Steam Power in the Red Sea, 1825–1839”, in an edited volume on imperial seas, 1780–1900 (Cambridge)', url: 'https://www.cambridge.org/core/product/identifier/9781846152450%23c5/type/book_part', grade: 'V' },
      { cite: 'Aden Expedition (1839)', url: 'https://en.wikipedia.org/wiki/Aden_Expedition', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.suez',
    subject: 'steam.suez',
    title: 'The canal for steamers, 1869',
    date: '1869',
    text:
      'The Suez Canal opened on 17 November 1869 and cut the voyage from London to Bombay from about 10,667 miles to 6,274. ' +
      'It was of little use to sailing ships, which had no reliable wind in the canal or the Red Sea and could not ' +
      'cheaply be towed, so in practice it was a road for steamers. Steam tonnage from Asia rose by about 178 per cent in ' +
      'the four years after it opened. In 1875 Disraeli bought the Khedive’s shares for the British government, and the ' +
      'route to India was, from then on, a matter of state.',
    sources: [
      { cite: 'design/research/energy.md §1.3 (opening date [V]; distances and tonnage [S], University of Colorado thesis)', url: 'https://scholar.colorado.edu/downloads/m039k5382', grade: 'S' },
      { cite: 'History.com, Suez Canal (1875 share purchase)', url: 'https://www.history.com/topics/19th-century/suez-canal', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.ploughing',
    subject: 'steam.ploughing',
    title: 'The steam plough, 1858',
    date: '1858',
    text:
      'An engine is too heavy to drag across a wet field, so the steam plough left it on the headland and pulled the plough ' +
      'to it on a wire rope. John Fowler, a Quaker engineer from Melksham, took the Royal Agricultural Society’s prize of ' +
      '£500 at the Chester trials of 1858. Steam tackle was dear to buy, and was hired from contractors by the day; it ' +
      'suited the heavy clays and the large farms. Ploughing by steam did not replace the horse on most farms. It did let ' +
      'land be broken that had not been worth breaking.',
    sources: [
      { cite: 'Museum of English Rural Life, John Fowler (online exhibition)', url: 'https://merl.reading.ac.uk/explore/online-exhibitions/john-fowler/', grade: 'S' },
      { cite: 'Grace’s Guide, 1858 Royal Agricultural Show', url: 'https://gracesguide.co.uk/1858_Royal_Agricultural_Show', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.duty',
    subject: 'steam.duty',
    title: 'The London coal duties, 1667–1889',
    date: '1667–1889',
    text:
      'The City of London levied dues on coal coming into the port from the Middle Ages. After the Great Fire Parliament ' +
      'added a duty on every ton to pay for the rebuilding, St Paul’s and the City churches among it. The government’s ' +
      'share ended in 1831; the City’s ran on until 1889. Some two hundred cast-iron posts still mark the boundary at which ' +
      'it fell due. The duty raised a great deal of money and cut very little coal: the coal was needed, and the revenue ' +
      'was the point. Jevons warned that “a small tax on the ton of coal would be a heavy tax on the ton of iron.”',
    sources: [
      { cite: 'Coal tax (London coal duties; the boundary posts)', url: 'https://en.wikipedia.org/wiki/Coal_tax', grade: 'S' },
      { cite: 'design/research/energy.md §1.5 (Jevons on coal taxes [V])', grade: 'V' },
    ],
  },
  {
    id: 'arc.steam.cap',
    subject: 'steam.cap',
    title: 'The Clean Air Act, 1956',
    date: '1952–1956',
    text:
      'From 5 to 9 December 1952 a smoke fog lay on London. About 4,000 deaths were counted at the time; later estimates, ' +
      'including the months after, reach 12,000. A committee under Sir Hugh Beaver reported in 1954 that clean air mattered ' +
      'as much as clean water had a century before, and the Clean Air Act of 5 July 1956 let councils declare smoke control ' +
      'areas where only smokeless fuel could be burned. It was slow to bite, and London had another bad fog in 1962. Tall ' +
      'chimneys carried some of the rest abroad. Sir Hugh, managing director of Guinness, also conceived the Guinness Book ' +
      'of Records.',
    sources: [
      { cite: 'design/research/restraint.md §4.4 (Great Smog; Beaver Committee; Clean Air Act 1956)', grade: 'S' },
      { cite: 'Greater London Authority, “70 years since the Great London Smog”', url: 'https://www.london.gov.uk/programmes-strategies/environment-and-climate-change/environment-and-climate-change-publications/70-years-great-london-smog', grade: 'S' },
      { cite: 'Britannica, Great Smog of London', url: 'https://www.britannica.com/event/Great-Smog-of-London', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.sufficiency',
    subject: 'steam.sufficiency',
    title: 'Seven men of Preston, 1832',
    date: '1832',
    text:
      'On 1 September 1832, at the Cockpit in Preston, seven working men signed a pledge drawn up by Joseph Livesey, a ' +
      'cheesemonger, to abstain from all intoxicating drink. The next year one of their speakers, Richard Turner, demanded ' +
      'not partial but “tee-total” abstinence, and the word stuck. The pledge was about beer, not coal, but its method was ' +
      'the one the game borrows: a promise, made in public and kept with company, to want less of something cheap. It ' +
      'spread slowly, took hold in chapels and lodges, and never once lowered the price of beer.',
    sources: [
      { cite: 'Lancashire Evening Post, “Seven men who tried to banish drink”', url: 'https://www.lep.co.uk/retro/seven-men-who-tried-banish-drink-673506', grade: 'S' },
      { cite: 'J. Livesey, Autobiography, ch. 13 (Preston History)', url: 'https://prestonhistory.com/preston-history-library/livesey-autobiography-chapter-13/', grade: 'V' },
    ],
  },
  {
    id: 'arc.steam.circularity',
    subject: 'steam.circularity',
    title: 'Heaps that burned for years, 1822',
    date: '1822',
    text:
      'About 1790, the geologists Conybeare and Phillips recorded in 1822, collieries working brittle coal began to put it ' +
      'over screens, sending the large coal to market and leaving the small. The practice became universal, and immense ' +
      'heaps of small coal grew at the pit mouths. They took fire, and some burned for years. A later writer reckoned that ' +
      'nearly a quarter of the coal brought up the shafts went in screening. Burning the slack under boilers ' +
      'stretched every seam, and every ton recovered from the heap went up the chimney in the end.',
    sources: [
      { cite: 'W. D. Conybeare and W. Phillips, Outlines of the Geology of England and Wales (1822), p. 372 (screening and burning heaps)', url: 'https://geology.19thcenturyscience.org/books/1822-Conybeare-Geology/PDFpages/1822-Conybeare-0372.pdf', grade: 'V' },
      { cite: 'R. L. Galloway, Annals of Coal Mining and the Coal Trade (1898), on screening losses', url: 'https://archive.org/download/annalsofcoalmini01gall/annalsofcoalmini01gall.pdf', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.substitution',
    subject: 'steam.substitution',
    title: 'The Laxey Wheel, 1854',
    date: '1854',
    text:
      'The Isle of Man had lead and zinc mines and no coal. So when the Great Laxey Mine needed pumping, Robert Casement ' +
      'built it a water wheel instead of an engine: the Lady Isabella, opened in 1854, 72 feet 6 inches across, fed by ' +
      'streams gathered off the hillside, working the pumps in the shaft through a long line of rods. It never needed a ' +
      'ton of fuel. It could pump only as much as the rain allowed, and the mine went no faster than the ' +
      'weather. The wheel still turns, for visitors.',
    sources: [
      { cite: 'Laxey Wheel (Lady Isabella, 1854; designed by Robert Casement)', url: 'https://en.wikipedia.org/wiki/Laxey_Wheel', grade: 'S' },
      { cite: 'Manx National Heritage, the Great Laxey Wheel', url: 'https://manxnationalheritage.im/?p=20415', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.exemptDuty',
    subject: 'steam.exemptDuty',
    title: 'Exempt for competitive reasons, 1991–2018',
    date: '1991–2018',
    text:
      'Sweden’s carbon tax of 1991 charged households the full rate and industry a fraction of it, for competitive ' +
      'reasons, and after protests in 1993 industry’s share was cut further. Mining, agriculture and forestry had ' +
      'exemptions of their own, and firms in the European emissions market were later exempted entirely. By one estimate ' +
      'the tax came to cover only about 40 per cent of Sweden’s greenhouse gases, and a study of firms found that the ' +
      'largest emitters faced the lowest marginal rates, some none at all. The reduced industrial rate outside the ' +
      'emissions market was phased out by 2018.',
    sources: [
      { cite: 'Government Offices of Sweden, “Sweden’s carbon tax”', url: 'https://government.se/carbontax', grade: 'V' },
      { cite: 'Tax Foundation, “Looking Back on 30 Years of Carbon Taxes in Sweden” (2023)', url: 'https://taxfoundation.org/research/all/eu/sweden-carbon-tax-revenue-greenhouse-gas-emissions/', grade: 'S' },
      { cite: 'American Economic Association 2022 conference paper on Swedish firms’ marginal carbon tax rates', url: 'https://www.aeaweb.org/conference/2022/preliminary/paper/fnEnstzn', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.seam.fiveQuarter',
    subject: 'steam.seam.fiveQuarter',
    title: 'One seam, two names, 1954',
    date: '1954',
    text:
      'Colliers named seams for what they found in them: their thickness, their quality, the pit that first worked them. ' +
      'Names were local, and the same coal could carry different names a few miles apart. In 1954 two geologists showed ' +
      'that the seam Durham miners called the Low Main lay higher in the strata than the Northumberland seam of the same ' +
      'name, and matched instead the Five-Quarter of the Northumberland sequence. Every pit had sunk through its own ' +
      'ladder of names. The coal had been laid down once, about 310 million years before.',
    sources: [
      { cite: 'Northumberland Coalfield (Armstrong and Price, 1954, on the correlation of the Durham Low Main)', url: 'https://en.wikipedia.org/wiki/Northumberland_Coalfield', grade: 'S' },
      { cite: 'British Geological Survey, Earthwise: Westphalian Coal Measures, Carboniferous, Northern England', url: 'https://earthwise.bgs.ac.uk/index.php/Westphalian_Coal_Measures,_Carboniferous,_Northern_England', grade: 'V' },
    ],
  },
  {
    id: 'arc.steam.seam.lowMain',
    subject: 'steam.seam.lowMain',
    title: 'Nine years to the coal, 1826–1835',
    date: '1826–1835',
    text:
      'East of Durham the coal lies beneath a thick cap of magnesian limestone, full of water, and for a long time it was ' +
      'thought not worth the sinking. At Monkwearmouth, on the Wear, Messrs Thompson, Pemberton and Company began a shaft ' +
      'in 1826. It took nine years. When the colliery began raising coal in 1835, at a depth of 1,578 feet, it was the ' +
      'deepest mine in the world. Pumping engines kept the shaft dry while the sinkers worked, and afterwards for as long ' +
      'as the pit was worked, which was until 1993.',
    sources: [
      { cite: 'Tyne and Wear HER 2743: Monkwearmouth, Wearmouth Colliery (Pemberton Main)', url: 'https://sitelines.newcastle.gov.uk/SMR/2743', grade: 'V' },
      { cite: 'Newcastle University, co-curate: Wearmouth Colliery (1835–1993)', url: 'https://co-curate.ncl.ac.uk/wearmouth-colliery-1835-1993', grade: 'S' },
    ],
  },
  {
    id: 'arc.steam.seam.brockwell',
    subject: 'steam.seam.brockwell',
    title: 'The lowest workable coal',
    date: 'Carboniferous',
    text:
      'Geologists traditionally drew the base of the Coal Measures of the Northumberland and Durham field not at a rock ' +
      'but at a price: the lowest workable coal, the Ganister Clay coal, or in parts of Northumberland the Brockwell. ' +
      'Beneath it there is coal, in thin and scattered seams, that nobody would pay to raise. The thicker, more ' +
      'productive seams begin with the Brockwell and run up through the middle of the measures. What counts as workable ' +
      'depends on the price of coal and the cost of pumping, so the bottom of the coalfield was always, in part, an ' +
      'economic line.',
    sources: [
      { cite: 'British Geological Survey, Earthwise: Westphalian Coal Measures, Carboniferous, Northern England', url: 'https://earthwise.bgs.ac.uk/index.php/Westphalian_Coal_Measures,_Carboniferous,_Northern_England', grade: 'V' },
      { cite: 'Durham Geodiversity Audit (Durham County Council, 2004), via the Scottish Geology Trust GeoGuide', url: 'https://geoguide.scottishgeologytrust.org/page/4073', grade: 'S' },
    ],
  },
];
