/**
 * The Archive: Iron & Steel (M4, the text lane). See index.ts for the rules. A separate module until the Act lane
 * registers Iron (subjects must resolve): archive/index.ts adds ...ironArchive after ...lightArchive. Every efficiency
 * card, lever and use has a note (the coverage lint), plus Steam's revival card Steel boilers, which arrives with Iron.
 * Sources were checked by the text lane on 20 Nov 2026 (design/scratch/m4-text-progress.md) or are marked [V]/[S] in
 * design/research/energy.md §§1.2, 1.5, 2.
 */
import type { ArchiveDef } from '../../types';
import { jevons } from './sources';

type Source = ArchiveDef['sources'][number];
const hotBlast: Source = { cite: 'Hot blast (Neilson’s patent of 1828; fuel per ton, Calder output, licensees by 1840; after Belford)', url: 'https://en.wikipedia.org/wiki/Hot_blast', grade: 'S' };
const graceNeilson: Source = { cite: 'Grace’s Guide, James Beaumont Neilson', url: 'https://www.gracesguide.co.uk/James_Beaumont_Neilson', grade: 'S' };
const bishop: Source = { cite: 'P. W. Bishop, The Beginnings of Cheap Steel (Smithsonian Institution, 1959)', url: 'https://gutenberg.org/files/29633/29633-h/29633-h.htm', grade: 'V' };
const graceBessemer: Source = { cite: 'Grace’s Guide, Henry Bessemer', url: 'https://www.gracesguide.co.uk/Henry_Bessemer', grade: 'S' };
const zinkGeyer: Source = { cite: 'T. Zink and R. Geyer, “Circular Economy Rebound”, Journal of Industrial Ecology 21(3) (2017): 593–602', url: 'https://doi.org/10.1111/jiec.12545', grade: 'V' };

export const ironArchive: ArchiveDef[] = [
  {
    id: 'arc.iron.industry',
    subject: 'iron',
    title: 'Mr Jevons’s Scottish figure, 1830–1863',
    date: '1830–1863',
    text:
      'The Coal Question has one sentence about iron that does two things at once. The reduction of the consumption of ' +
      'coal, per ton of iron, to less than one-third of its former amount, Jevons wrote, had been followed in Scotland ' +
      'by a ten-fold total consumption. That is the direct rebound, which the engines had already shown. He added “the ' +
      'indirect effect of cheap iron in accelerating other coal-consuming branches of industry”, and that is a different ' +
      'thing. Cheap iron made cheap rails, cheap boilers and cheap machines, and each of them burned coal somewhere ' +
      'else, in a ledger the ironmaster never saw.',
    sources: [jevons.ch7],
  },
  {
    id: 'arc.iron.hotBlast',
    subject: 'iron.hotBlast',
    title: 'Neilson’s hot blast, 1828',
    date: '1828',
    text:
      'James Beaumont Neilson, with partners, patented in 1828 the idea of heating the air before it ' +
      'was blown into the furnace. The saving was immediate. Coal per ton of iron fell from about 8.06 long tons to ' +
      '5.16, and at the Calder ironworks the output of a furnace rose from 5.6 tons a day in 1828 to 8.2 in 1833. ' +
      'Ironmasters who had never cared about fuel cared about output. By 1840 fifty-eight of them had taken licences, ' +
      'paying Neilson and his partners about £30,000 a year in royalties for coal saved: the business model of Boulton ' +
      'and Watt, applied to iron.',
    sources: [hotBlast, graceNeilson],
  },
  {
    id: 'arc.iron.rawCoal',
    subject: 'iron.rawCoal',
    title: 'Raw coal and the blackband ironstone',
    date: '1830s',
    text:
      'Hot blast did more than save coke. With the air already hot, the Scottish masters found they could charge the ' +
      'furnace with raw coal and dispense with the coke ovens altogether, and that the “black band” ironstone of the ' +
      'Scottish coalfields, long thought too poor to bother with, could now be smelted at a profit. A saving of fuel had ' +
      'opened a new reserve of ore. This is the window in which Jevons placed his Scottish figure: coal per ton cut to ' +
      'under a third, and the trade’s whole consumption multiplied tenfold. Cheaper iron found its buyers, and they ' +
      'wanted more of it.',
    sources: [hotBlast, jevons.ch7],
  },
  {
    id: 'arc.iron.cowper',
    subject: 'iron.cowper',
    title: 'Mr Cowper’s stoves, 1857',
    date: '1857',
    text:
      'Neilson heated his blast in iron pipes over a separate fire. Edward Alfred Cowper, patenting in 1857, turned the ' +
      'furnace’s own waste gas to the job. His stoves were tall towers packed with firebrick: the hot gas from the ' +
      'furnace top was burned in one stove until its brickwork glowed, and then the cold blast was turned through it and ' +
      'came out hot, while the next stove heated in its place. The furnace heated its own air with what it had been ' +
      'throwing away, and a hotter blast made a bigger furnace worth building.',
    sources: [{ cite: 'Cowper stove (E. A. Cowper’s patent, 1857; regenerative firebrick stoves)', url: 'https://en.wikipedia.org/wiki/Cowper_stove', grade: 'S' }],
  },
  {
    id: 'arc.iron.bessemer',
    subject: 'iron.bessemer',
    title: 'Steel “without fuel”, 1856',
    date: '1856',
    text:
      'In August 1856 Henry Bessemer read a paper to the British Association at Cheltenham under the title “The ' +
      'Manufacture of Malleable Iron and Steel without Fuel”. Air blown through molten pig iron burned out the carbon, ' +
      'and the burning supplied its own heat: a charge of steel in minutes, where the puddler took hours. Bessemer’s own ' +
      'firm was soon underselling its rivals by £10 to £15 a ton. The process was called fuelless. Steel at that ' +
      'price was wanted for rails, hulls, boilers and bridges, and the furnaces that made it all burned coal by the train.',
    sources: [graceBessemer, bishop],
  },
  {
    id: 'arc.iron.siemens',
    subject: 'iron.siemens',
    title: 'The regenerative furnace, 1850s–1865',
    date: '1865',
    text:
      'The Siemens brothers’ regenerative furnace, worked out in the 1850s, passed its hot exhaust through chambers of ' +
      'brick and then reversed the flow, so that the incoming air and gas were heated by the heat that would otherwise ' +
      'have gone up the chimney. Pierre-Émile Martin applied it to steel in France in 1865, and the open hearth was the ' +
      'result: slower than Bessemer’s converter, and easier to control. By 1900 the ' +
      'open hearth had superseded the converter in Britain, and it melted scrap by the ton.',
    sources: [{ cite: 'Open-hearth furnace (Siemens’s regenerative furnace; Martin, 1865)', url: 'https://en.wikipedia.org/wiki/Open-hearth_furnace', grade: 'S' }],
  },
  {
    id: 'arc.iron.largerFurnaces',
    subject: 'iron.largerFurnaces',
    title: 'Middlesbrough, 1829–1871',
    date: '1850–1905',
    text:
      'In 1850 John Vaughan and the geologist John Marley found ironstone in the Cleveland Hills near Eston. The next ' +
      'year Bolckow Vaughan built the first blast furnace on Teesside. Middlesbrough had forty inhabitants in 1829; it ' +
      'had 7,600 in 1851 and 40,000 in 1871. By 1887 the Cleveland district had 91 blast furnaces. The firm itself made ' +
      '20,000 tons of pig iron in 1845 and 820,000 in 1905, about one ton in twelve of the whole kingdom’s output. Each ' +
      'furnace was bigger and thriftier than the last, and there were always more of them.',
    sources: [{ cite: 'Bolckow Vaughan (Eston, 1850; Middlesbrough population; Cleveland furnaces, Bulmer 1890; output 1845–1913)', url: 'https://en.wikipedia.org/wiki/Bolckow_Vaughan', grade: 'S' }],
  },
  {
    id: 'arc.iron.byProductOvens',
    subject: 'iron.byProductOvens',
    title: 'Ovens that keep what they burn',
    date: 'Late 19th century',
    text:
      'The old beehive coke oven made coke by burning off everything in the coal that was not carbon: the tar, the ' +
      'ammonia and the gas went up as smoke and flame. The by-product oven, heated from outside, kept them. The gas ' +
      'fired the works, and the ammonia and the tar were sold to other industries as their raw material. ' +
      'Nothing about the method cut the coal a ton of coke needed. It made every ton of coal worth more, which is a ' +
      'different thing, and a reason to dig more of it.',
    sources: [{ cite: 'Coke (fuel): beehive and by-product ovens (tar, ammonia, gas recovered)', url: 'https://en.wikipedia.org/wiki/Coke_(fuel)', grade: 'S' }],
  },
  {
    id: 'arc.iron.basicLining',
    subject: 'iron.basicLining',
    title: 'The cousins’ lining, 1877',
    date: '1877',
    text:
      'Bessemer’s converter had a lining of packed sand, and it could not remove phosphorus: the steel came out brittle ' +
      'unless the ore was free of it, and the ore that was free of it was dear. In 1877 Sidney Gilchrist Thomas and his ' +
      'cousin Percy Gilchrist patented a lining of dolomite fired with tar, which drew the phosphorus out into the slag. ' +
      'Phosphoric ore was the most abundant kind. The process let steel be made from it, and the industry grew fastest ' +
      'outside Britain and the United States, where that ore lay. A cleverer furnace had enlarged the reserve.',
    sources: [{ cite: 'Gilchrist–Thomas process (patent of 1877; dolomite lining; phosphoric ores)', url: 'https://en.wikipedia.org/wiki/Gilchrist%E2%80%93Thomas_process', grade: 'S' }],
  },
  {
    id: 'arc.iron.cokeDuty',
    subject: 'iron.cokeDuty',
    title: 'A heavy tax on the ton of iron',
    date: '1865',
    text:
      'Jevons considered a tax on coal and put the difficulty in one line: “A small tax on the ton of coal would be a ' +
      'heavy tax on the ton of iron.” Iron took so many tons of coal to the ton that any duty worth having would fall on ' +
      'the ironmasters first and hardest. Britain had taxed coal before. The City of London levied dues on coal entering ' +
      'the port for centuries, and its last ran on until 1889 or 1890; the posts that marked the boundary still stand ' +
      'round London. Those dues never cut the use of coal. They were not meant to.',
    sources: [jevons.ch7, { cite: 'Coal tax (London coal duties; the boundary posts)', url: 'https://en.wikipedia.org/wiki/Coal_tax', grade: 'S' }],
  },
  {
    id: 'arc.iron.licences',
    subject: 'iron.licences',
    title: 'The only furnace licences, 1828–1842',
    date: '1840',
    text:
      'The only licences Britain’s furnaces ever needed were Neilson’s. His hot-blast patent of 1828 required every ' +
      'ironmaster who heated his blast to take a licence and pay a royalty, and by 1840 fifty-eight had done so, for ' +
      'about £30,000 a year between them. The licence limited nothing. It was a charge on thrift, and the thrift paid ' +
      'for it many times over, so the number of licensed furnaces grew with the saving. A licence that is meant to ' +
      'hold the furnaces down is another instrument, and has to be issued by somebody with no share in the royalty.',
    sources: [hotBlast, graceNeilson],
  },
  {
    id: 'arc.iron.buildToLast',
    subject: 'iron.buildToLast',
    title: 'Huntsman’s crucible, 1740',
    date: '1740',
    text:
      'Benjamin Huntsman, a clockmaker in search of a better steel for clock springs, began making his own in crucibles at ' +
      'Handsworth, near Sheffield, in 1740. The melts were small and slow, and the steel was the most uniform yet ' +
      'made: for springs, then knives, tools, scissors and machinery. Sheffield crucible steel was dear and it lasted, and for more than a ' +
      'century it was the trade’s standard of quality. Bessemer’s converter made steel by the ton; Huntsman’s pot made it ' +
      'by the pound. A thing that lasts twice as long needs half as many furnaces to replace it.',
    sources: [{ cite: 'Crucible steel (Huntsman, c. 1740, Handsworth near Sheffield)', url: 'https://en.wikipedia.org/wiki/Crucible_steel', grade: 'S' }],
  },
  {
    id: 'arc.iron.scrapBounty',
    subject: 'iron.scrapBounty',
    title: 'The circular economy rebound, 2017',
    date: '2017',
    text:
      'Melting scrap takes far less energy than smelting ore, so recycling looks like pure saving. Two industrial ' +
      'ecologists, writing in the Journal of Industrial Ecology in 2017, pointed out the catch. Recycled material ' +
      'competes with new material and lowers its price; a lower price sells more of it; and if the secondary material ' +
      'does not displace the primary ton for ton, total production can rise. They called it circular economy rebound. ' +
      'The remedy is not to stop recycling but to stop the price falling, which is a different lever.',
    sources: [zinkGeyer],
  },
  {
    id: 'arc.iron.smokeInspector',
    subject: 'iron.smokeInspector',
    title: 'The first inspectors, 1863',
    date: '1863',
    text:
      'The Alkali Act of 1863 was, in its own words, an Act for the more effectual condensation of muriatic acid gas in ' +
      'alkali works. The Leblanc soda works were discharging the gas into the air of the country round them, and the Act appointed ' +
      'an inspector and four sub-inspectors to make them condense it instead. It came into force on 1 January 1864. From ' +
      '1874 the head of the inspectorate was styled Chief ' +
      'Inspector, a post first held by Dr Robert Angus Smith. Coal smoke, the commoner nuisance, waited for the Clean Air Act of 1956.',
    sources: [{ cite: 'Alkali Act 1863 (royal assent 28 July 1863, in force 1 January 1864; inspector and four sub-inspectors)', url: 'https://en.wikipedia.org/wiki/Alkali_Act_1863', grade: 'S' },
      { cite: 'Encyclopaedia Britannica, Great Smog of London (the Clean Air Act 1956)', url: 'https://www.britannica.com/event/Great-Smog-of-London', grade: 'S' }],
  },
  {
    id: 'arc.iron.wire',
    subject: 'iron.wire',
    title: 'Barbs, 1874',
    date: '1874',
    text:
      'Plain drawn wire made a cheap fence that cattle leaned on until it gave. In 1874 Joseph Glidden ' +
      'patented a wire with barbs twisted into it, and the fence held. Cheap wire changed what land was. On the ' +
      'American plains the open range, grazed in common, was fenced into private holdings within a few years, and the ' +
      'cutting of fences became a crime in Texas in 1884. Wire is the smallest thing a furnace makes. It enclosed more ' +
      'country than any railway reached.',
    sources: [{ cite: 'Barbed wire (Glidden’s patent, 1874; enclosure of the open range; Texas, 1884)', url: 'https://en.wikipedia.org/wiki/Barbed_wire', grade: 'S' }],
  },
  {
    id: 'arc.iron.rails',
    subject: 'iron.rails',
    title: 'Rails in longer lengths, 1820–1857',
    date: '1820–1857',
    text:
      'Early railways ran on short cast-iron rails that cracked. John Birkinshaw’s patent of 1820 rolled wrought iron in ' +
      'longer lengths, and it replaced cast iron and contributed to the explosive growth of the railways between 1825 ' +
      'and 1840. Then steel replaced wrought iron: Robert Mushet laid the first steel rails at Derby station in 1857, and ' +
      'steel, being much stronger, let longer rails be rolled. Each cheaper, longer-lived rail made a mile of railway ' +
      'cheaper to build and to keep. The engines on it burned the coal.',
    sources: [{ cite: 'Rail profile (Birkinshaw’s patent, 1820; Mushet’s steel rails at Derby, 1857)', url: 'https://en.wikipedia.org/wiki/Rail_profile', grade: 'S' }],
  },
  {
    id: 'arc.iron.shipPlate',
    subject: 'iron.shipPlate',
    title: 'An iron ship across the Atlantic, 1845',
    date: '1843–1845',
    text:
      'Isambard Kingdom Brunel meant the Great Britain to be built of wood. Two of his associates came back converts from ' +
      'a voyage in the iron-hulled Rainbow, and he changed his mind. Floated out at Bristol in 1843, she crossed the ' +
      'Atlantic in 1845 in fourteen days, the first iron steamer to do so, and the first large ocean-going ship to ' +
      'combine an iron hull with a screw. Iron did not rot or harbour worm and could be built longer than any timber ' +
      'would allow. Bigger hulls carried more cargo for the coal, and the shipping lines ordered more hulls.',
    sources: [{ cite: 'SS Great Britain (floated out 1843; Atlantic crossing 1845; iron hull and screw)', url: 'https://en.wikipedia.org/wiki/SS_Great_Britain', grade: 'S' }],
  },
  {
    id: 'arc.iron.girders',
    subject: 'iron.girders',
    title: 'The Britannia Bridge, 1850',
    date: '1850',
    text:
      'To carry a railway over the Menai Strait, Robert Stephenson, with William Fairbairn, built ' +
      'the trains a tunnel in the air: rectangular tubes of riveted wrought iron, the longest span 460 feet, through ' +
      'which the trains ran. The first tube opened in March 1850. Wrought-iron girders went on to carry station roofs, ' +
      'gasholders, warehouses and mills, each a little lighter and cheaper than the last design. Every one of them made ' +
      'the building it held up cheaper, and so made more of them worth building.',
    sources: [{ cite: 'Britannia Bridge (Stephenson and Fairbairn; opened 1850; wrought-iron tubes, 460 ft span)', url: 'https://en.wikipedia.org/wiki/Britannia_Bridge', grade: 'S' }],
  },
  {
    id: 'arc.iron.tinplate',
    subject: 'iron.tinplate',
    title: 'Tinned iron at Bermondsey, 1812–1813',
    date: '1812–1813',
    text:
      'In 1812 John Hall bought Peter Durand’s patent for preserving food in tinned containers for £1,000, and with Bryan ' +
      'Donkin set up at Bermondsey the first cannery to use tinned iron. By the late spring of 1813 the firm had agents ' +
      'on the south coast selling preserved food to outward-bound ships, and the Admiralty soon placed large orders. ' +
      'Tinplate is iron sheet with a coat of tin, and the can made food keep: meat for a voyage, fish for an inland ' +
      'town months after the catch. A market that keeps is a market that grows.',
    sources: [{ cite: 'Bryan Donkin (Durand’s patent bought by Hall, 1812; Bermondsey cannery; agents by 1813; Admiralty orders)', url: 'https://en.wikipedia.org/wiki/Bryan_Donkin', grade: 'S' }],
  },
  {
    id: 'arc.iron.machineTools',
    subject: 'iron.machineTools',
    title: 'Mr Maudslay’s lathe, 1800',
    date: '1800',
    text:
      'Henry Maudslay did not invent the slide rest. About 1800 he combined it with a lead screw and change gears in the ' +
      'first industrially practical screw-cutting lathe, which let screw threads be made to standard sizes for the first ' +
      'time. His workshop trained Joseph Whitworth, who later standardised threads across the trade, and James Nasmyth, ' +
      'who built the steam hammer. Machines that make machines lower the price of everything downstream of them. The ' +
      'lathe made the engine cheaper, and the engine made the coal worth more.',
    sources: [{ cite: 'Henry Maudslay (screw-cutting lathe, 1800; standard threads; Whitworth and Nasmyth trained there)', url: 'https://en.wikipedia.org/wiki/Henry_Maudslay', grade: 'S' }],
  },
  {
    id: 'arc.iron.steelBoilers',
    subject: 'steam.steelBoilers',
    title: 'Steel boilers and the Aberdeen, 1881',
    date: '1881',
    text:
      'The steamer Aberdeen, built by Robert Napier and Sons in 1881, was the first ship to be successfully powered by a ' +
      'triple-expansion engine, and her two boilers were of steel, working at 125 pounds to the square inch. On trial ' +
      'she burned 1.28 pounds of coal per indicated horsepower an hour, about 60 per cent less than a typical steamer of ' +
      'a decade before. Within a few years the older compound engine was hardly built at all. Steel had let the boiler ' +
      'take the pressure, and the cheaper ton-mile filled the oceans with steamers.',
    sources: [{ cite: 'SS Aberdeen (1881): steel boilers at 125 psi; triple expansion; 1.28 lb of coal per ihp', url: 'https://en.wikipedia.org/wiki/SS_Aberdeen_(1881)', grade: 'S' }],
  },
];
