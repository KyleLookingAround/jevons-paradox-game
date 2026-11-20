/**
 * The Archive: Plenty (M5, the text lane). See index.ts for the rules. A separate module until the registry registers
 * Plenty (subjects must resolve): archive/index.ts appends ...plentyArchive after ...chairArchive. Every efficiency
 * card, lever and use has a note (the coverage lint), and the Industry. Sources: design/research/sectors.md (marked [S]
 * there, with that file's caveats; nothing it marks unverified is printed) and those the text lane checked on 20 Nov
 * 2026 (design/scratch/m5-text-progress.md). Living authors are cited, not named. The Green Revolution note gives both
 * findings, as D4 asks: the evidence that it spared land and the evidence that intensification and expansion went
 * together; neither is the game's verdict.
 */
import type { ArchiveDef } from '../../types';

type Source = ArchiveDef['sources'][number];
const usgs: Source = { cite: 'design/research/sectors.md §2.3 (USGS High Plains aquifer reports: water-level and storage changes, predevelopment to 2019) [S14]', grade: 'S' };
const peakFarmland: Source = { cite: 'design/research/sectors.md §1.1 (Ausubel, Wernick and Waggoner, “Peak Farmland and the Prospect for Land Sparing”, 2013) [S6]', grade: 'S' };
const rudel: Source = { cite: 'design/research/sectors.md §1.2 (Rudel et al., “Agricultural intensification and changes in cultivated areas, 1970–2005”, PNAS 2009) [S7]', grade: 'S' };
const hertel: Source = { cite: 'design/research/sectors.md §1.2 (Hertel, Ramankutty and Baldos, PNAS 2014) [S5]', grade: 'S' };
const stevenson: Source = { cite: 'design/research/sectors.md §1.1–1.2 (Stevenson et al., PNAS 2013: land saved by Green Revolution research, 1965–2004) [S4]', grade: 'S' };
const cassidy: Source = { cite: 'E. S. Cassidy, P. C. West, J. S. Gerber and J. A. Foley, “Redefining agricultural yields: from tonnes to people nourished per hectare”, Environmental Research Letters 8 (2013) 034015', url: 'https://iopscience.iop.org/article/10.1088/1748-9326/8/3/034015', grade: 'V' };
const erisman: Source = { cite: 'J. W. Erisman et al., “How a century of ammonia synthesis changed the world”, Nature Geoscience 1 (2008): 636–639', url: 'https://www.iai.int/admin/site/sites/default/files/uploads/2008.Erisman-et-al_NatureGeo.pdf', grade: 'V' };
const haberSectors: Source = { cite: 'design/research/sectors.md §1.1 and §1.6 (Oppau, 1913; Haber’s Nobel Prize for 1918; Ypres, 1915) [S3]', grade: 'S' };
const olmstead: Source = { cite: 'A. L. Olmstead and P. W. Rhode, “Reshaping the Landscape: The Impact and Diffusion of the Tractor in American Agriculture, 1910–1960”, Journal of Economic History 61(3) (2001): 663–698', url: 'https://faculty.econ.ucdavis.edu/faculty/alolmstead/Recent_Publications/Reshaping_the_Landscape.pdf', grade: 'V' };
const griliches: Source = { cite: 'Z. Griliches, “Hybrid Corn: An Exploration in the Economics of Technological Change”, Econometrica 25(4) (1957): 501–522', url: 'https://www.econometricsociety.org/publications/econometrica/1957/10/01/hybrid-corn-exploration-economics-technological-change', grade: 'V' };
const sutch: Source = { cite: 'R. Sutch, “Henry Agard Wallace, the Iowa Corn Yield Tests, and the Adoption of Hybrid Corn”, NBER Working Paper 14141 (2008)', url: 'https://nber.org/system/files/working_papers/w14141/w14141.pdf', grade: 'V' };
const zybach: Source = { cite: 'F. L. Zybach, Self-propelled sprinkling irrigating apparatus, US Patent 2,604,359 (filed 27 June 1949, granted 22 July 1952)', url: 'https://patents.google.com/patent/US2604359A/en', grade: 'V' };
const pivotWiki: Source = { cite: 'Center-pivot irrigation (Kansas acreage; the Ogallala)', url: 'https://en.wikipedia.org/wiki/Center-pivot_irrigation', grade: 'S' };
const pfeifferLin: Source = { cite: 'L. Pfeiffer and C.-Y. C. Lin, “Does efficient irrigation technology lead to reduced groundwater extraction? Empirical evidence”, Journal of Environmental Economics and Management 67(2) (2014): 189–208', url: 'https://ideas.repec.org/a/eee/jeeman/v67y2014i2p189-208.html', grade: 'V' };
const grafton: Source = { cite: 'R. Q. Grafton et al., “The paradox of irrigation efficiency”, Science 361(6404) (2018): 748–750', url: 'https://doi.org/10.1126/science.aat9314', grade: 'V' };
const wardPulido: Source = { cite: 'F. A. Ward and M. Pulido-Velazquez, “Water conservation in irrigation can increase water use”, PNAS 105(47) (2008): 18215–18220', url: 'https://doi.org/10.1073/pnas.0805554105', grade: 'V' };
const dripWiki: Source = { cite: 'Drip irrigation (Blass’s first experimental system, 1959; the company with Kibbutz Hatzerim)', url: 'https://en.wikipedia.org/wiki/Drip_irrigation', grade: 'S' };
const rotation: Source = { cite: 'design/research/sectors.md §1.1 (the Norfolk four-course rotation; after Overton) [S1]', grade: 'S' };
const lema: Source = { cite: 'B. Golden, “Monitoring the Impacts of Sheridan County 6 Local Enhanced Management Area” (Kansas State University, 2018)', url: 'https://www.k-state.edu/irrigate/oow/p18/Golden18A.pdf', grade: 'V' };
const rationing: Source = { cite: 'design/research/restraint.md §3.1 (UK rationing, 1940–1954; Imperial War Museums) [R8]', grade: 'S' };
const fallowWiki: Source = { cite: 'Dryland farming (summer fallow: one crop on two seasons’ rain)', url: 'https://en.wikipedia.org/wiki/Dryland_farming', grade: 'S' };
const swedenTax: Source = { cite: 'Lag (1984:409) om skatt på gödselmedel (repealed with effect from 1 January 2010), Sveriges riksdag', url: 'https://data.riksdagen.se/dokument/sfs-1984-409.text', grade: 'V' };
const foodMiles: Source = { cite: 'AEA Technology for Defra, The Validity of Food Miles as an Indicator of Sustainable Development (2005); summary at Table Debates', url: 'https://tabledebates.org/research-library/validity-food-miles-indicator-sustainable-development', grade: 'S' };
const blsEthanol: Source = { cite: 'US Bureau of Labor Statistics, Beyond the Numbers 5: “What happened to ethanol producer prices after passage of the Renewable Fuel Standard”', url: 'https://www.bls.gov/opub/btn/volume-5/what-happened-to-ethanol-producer-prices-after-passage-of-the-renewable-fuel-standard.htm', grade: 'V' };

export const plentyArchive: ArchiveDef[] = [
  {
    id: 'arc.plenty.industry',
    subject: 'plenty',
    title: 'The water under the High Plains, 1950–2019',
    date: '1950–2019',
    text:
      'Under eight states of the American High Plains lies a single aquifer, filled over thousands of years and topped ' +
      'up now by very little rain. Pumping on any scale began around 1950. By 2019, the national geological survey ' +
      'reported, the water level had fallen by an average of 16.5 feet across the aquifer, and about 286 million ' +
      'acre-feet of recoverable storage had gone; in parts of Texas and Kansas the falls were measured in scores of ' +
      'feet. The wheat, maize and cattle of the plains are watered from a stock, not a flow.',
    sources: [usgs, pivotWiki],
  },
  /* ---- Uses ---- */
  {
    id: 'arc.plenty.bread',
    subject: 'plenty.bread',
    title: 'Peak farmland, 1961–2009',
    date: '1961–2009',
    text:
      'Between 1961 and 2009, a study of the world’s farms found, the land under crops grew by only about 12 per cent ' +
      'while the index of crop production rose by about 300 per cent. Producing the 2009 harvest at the yields of 1961 ' +
      'would have needed roughly three times the land. Its authors called this peak farmland. Bread is the best case ' +
      'for it: a person eats only so much bread, so a cheaper loaf does not sell four times over, and the acres saved ' +
      'can stay saved.',
    sources: [peakFarmland],
  },
  {
    id: 'arc.plenty.fertilised',
    subject: 'plenty.fertilised',
    title: 'Intensify, then expand, 1970–2005',
    date: '1970–2005',
    text:
      'If farms grow more on each acre, do they need fewer acres? A study of the countries of the world from 1970 to ' +
      '2005 looked for land being spared as yields rose and mostly did not find it: intensification and expansion ' +
      'went together, and its authors concluded that cropland would not be abandoned without a policy to make it so. ' +
      'Another study found that the answer depends on trade: a region that grows more cheaply can sell to the world, ' +
      'and ploughs more of its own land even while the world as a whole ploughs less.',
    sources: [rudel, hertel],
  },
  {
    id: 'arc.plenty.meat',
    subject: 'plenty.meat',
    title: 'Calories through a cow, 2013',
    date: '2013',
    text:
      'A study of the world’s crops published in 2013 found that about 36 per cent of the calories grown went to feed ' +
      'animals, and that only about 12 per cent of those feed calories reached people as meat, milk and eggs. The ' +
      'conversion loss grows with wealth: the richer a country, the more of its grain goes round through an animal ' +
      'first. A cheaper bushel makes a cheaper steak, and a cheaper steak is bought in a quantity that bread never is.',
    sources: [cassidy],
  },
  {
    id: 'arc.plenty.orchards',
    subject: 'plenty.orchards',
    title: 'Drip under the trees, 2018',
    date: '2018',
    text:
      'A review in Science in 2018 gathered the cases in which better irrigation had been expected to save water and ' +
      'had not. In the Souss and Tensift basins of Morocco, where drip lines spread under high-value crops, the ' +
      'review found that drip reduced the recharge of aquifers that were already over-exploited. Water that ' +
      'had once run off the field and soaked back down now went into the trees, and more trees were planted where it ' +
      'went.',
    sources: [grafton],
  },
  {
    id: 'arc.plenty.airFreight',
    subject: 'plenty.airFreight',
    title: 'Food miles, 2005',
    date: '2005',
    text:
      'A study for the British agriculture ministry in 2005 counted the distances food travelled to reach British ' +
      'tables. Flying food carried about one per cent of the tonne-kilometres and about a tenth of the carbon dioxide ' +
      'of all food transport: the highest emissions for every tonne moved, by a wide margin. The study concluded that ' +
      'distance alone was not a fair measure of a food’s harm. The green bean flown in January was, though, the one ' +
      'food whose distance was most of its cost.',
    sources: [foodMiles],
  },
  {
    id: 'arc.plenty.biofuels',
    subject: 'plenty.biofuels',
    title: 'The field and the fuel tank, 2005–2014',
    date: '2005–2014',
    text:
      'After an American law of 2005 required motor fuel to contain a rising volume of renewable fuel, most of it ethanol ' +
      'distilled from maize, the share of the country’s maize that went to fuel rose from about 18 per cent in 2005 to ' +
      'about 44 per cent in 2014, by the labour statistics bureau’s count. The motor car had become one of the largest ' +
      'customers of the farm. A gallon of fuel saved on the road made room for a gallon more from the field.',
    sources: [blsEthanol],
  },
  /* ---- The efficiency chain ---- */
  {
    id: 'arc.plenty.haberBosch',
    subject: 'plenty.haberBosch',
    title: 'Bread from the air, 1913',
    date: '1909–2008',
    text:
      'Fritz Haber fixed nitrogen from the air as ammonia in his laboratory in 1909, and Carl Bosch scaled the process ' +
      'up; the first plant opened at Oppau in 1913. The same chemistry made explosives, and Haber directed the German ' +
      'chlorine gas attack at Ypres in 1915; he received the Nobel Prize in Chemistry for 1918. By one estimate about ' +
      '44 per cent of humanity was fed by synthetic nitrogen in 2000, and about 48 per cent by 2008. The fields no ' +
      'longer waited for guano ships or clover.',
    sources: [haberSectors, erisman],
  },
  {
    id: 'arc.plenty.tractors',
    subject: 'plenty.tractors',
    title: 'The acres that fed the horses, 1915–1960',
    date: '1915–1960',
    text:
      'Before the tractor, a farm grew fuel for its engines: oats and hay for the horses and mules. Two economic ' +
      'historians calculated that in 1915 about 93 million acres of American cropland went to feeding them. As tractors ' +
      'replaced them the figure fell to 65 million acres by 1930 and about 5 million by 1960. The land released was ' +
      'turned over to crops for people and for sale: the tractor’s fuel came from the oil well, and the acres that ' +
      'had fed the horses fed the market.',
    sources: [olmstead],
  },
  {
    id: 'arc.plenty.hybridMaize',
    subject: 'plenty.hybridMaize',
    title: 'Hybrid corn, 1933–1960',
    date: '1933–1960',
    text:
      'Hybrid maize seed had to be bought new each spring, because the cross did not breed true; it gave a fuller cob ' +
      'and stood up to drought. In 1933 about a tenth of one per cent of American maize acreage was planted to it. ' +
      'Iowa passed a tenth in 1936, its neighbours a year later, and by 1960 the national figure was 96.3 per cent. ' +
      'A study of its spread in 1957 became a founding text on how new methods diffuse: fastest where they paid most.',
    sources: [griliches, sutch],
  },
  {
    id: 'arc.plenty.centrePivot',
    subject: 'plenty.centrePivot',
    title: 'Green circles, 1952',
    date: '1949–1952',
    text:
      'Frank Zybach, a Colorado farmer, filed a patent in 1949 for a self-propelled sprinkler: a pipe on wheeled towers ' +
      'that walked slowly round a well, watering a circle. It was granted in 1952. The centre pivot made rolling upland ' +
      'irrigable without levelling it, and the High Plains turned green in circles seen from the air. With pivots, ' +
      'nearly three million acres came to be irrigated in Kansas alone, every one of them from the aquifer beneath.',
    sources: [zybach, pivotWiki],
  },
  {
    id: 'arc.plenty.dwarfWheat',
    subject: 'plenty.dwarfWheat',
    title: 'Short straw, 1944–2004',
    date: '1944–2004',
    text:
      'From 1944 Norman Borlaug bred wheat in Mexico, and the semi-dwarf varieties that followed held a heavy ear on a ' +
      'short, stiff straw that did not fall over when fertilised and watered. With new rice from the Philippines, ' +
      'fertiliser and irrigation, they made the Green Revolution, and Borlaug received the Nobel Peace Prize in 1970. ' +
      'One study estimated that the research saved some 18 to 27 million hectares from the plough between 1965 and ' +
      '2004. Another, looking country by country, found intensification and expansion going together.',
    sources: [stevenson, rudel],
  },
  {
    id: 'arc.plenty.droppedNozzles',
    subject: 'plenty.droppedNozzles',
    title: 'The Kansas subsidy, 2014',
    date: '2014',
    text:
      'In western Kansas, state and federal cost-share schemes paid farmers to convert their centre pivots to more ' +
      'efficient systems, with the sprinklers dropped low over the crop so that less water was lost to the wind. A ' +
      'study published in 2014 looked at what happened to the wells. Groundwater extraction rose. Farmers who could ' +
      'now grow more from each acre-foot planted crops that needed more acre-feet. The subsidy had been paid to save ' +
      'water; it had bought a change of crop.',
    sources: [pfeifferLin],
  },
  {
    id: 'arc.plenty.drip',
    subject: 'plenty.drip',
    title: 'A drop at the root, 1959',
    date: '1959–1960s',
    text:
      'Simcha Blass, an Israeli water engineer, built his first experimental drip system in 1959, with emitters that ' +
      'let water out a drop at a time at the root of each plant, and later went into business with Kibbutz Hatzerim ' +
      'to make them. Nothing ran off and nothing soaked away. That was the point, and later the difficulty: the water ' +
      'that ran off a flooded field had been the recharge of the aquifer beneath it, and the field that wastes nothing ' +
      'returns nothing.',
    sources: [dripWiki, grafton],
  },
  {
    id: 'arc.plenty.precision',
    subject: 'plenty.precision',
    title: 'The yield map, 1990s',
    date: '1990s–2018',
    text:
      'From the 1990s satellite positioning let a combine map its yield yard by yard, and let the farmer water and feed ' +
      'each part of a field by what it returned. Every input went further. The review of irrigation efficiency in ' +
      'Science in 2018 set out the general result for water: advanced technology frequently increases the water a farm ' +
      'consumes and the groundwater it extracts, while cutting the flows that return. The saving is real on the field ' +
      'and is spent on the next field.',
    sources: [grafton],
  },
  {
    id: 'arc.plenty.mixedFarming',
    subject: 'plenty.mixedFarming',
    title: 'Turnips and clover, 18th century',
    date: 'mid-18th century',
    text:
      'The Norfolk four-course rotation, wheat, turnips, barley and clover, did away with the fallow year. Clover fixed ' +
      'nitrogen in the soil, the turnips fed the stock through the winter, more stock meant more manure, and the manure ' +
      'went back on the fields. It was the fertiliser of the age before the sack, and it was not widely known until the ' +
      'middle of the 18th century; the nobleman who usually gets the credit for it has had his part promoted rather ' +
      'than proven. A cow on the stubble was a link in the chain, not the end of it.',
    sources: [rotation],
  },
  {
    id: 'arc.plenty.sorghum',
    subject: 'plenty.sorghum',
    title: 'What is planted, 2014',
    date: '2014',
    text:
      'The Kansas study of subsidised irrigation found that the extra water went not on the same crops but on different ' +
      'ones: given a cheaper acre-foot, farmers planted what needed more of them. The choice of crop moved the wells ' +
      'more than the choice of sprinkler. The review of irrigation efficiency in 2018 listed a switch to thirstier crops ' +
      'among the ways better kit raises water use. Run the other way, the same arithmetic is the one saving no sprinkler ' +
      'can make: grow the crop that drinks less.',
    sources: [pfeifferLin, grafton],
  },
  /* ---- Levers ---- */
  {
    id: 'arc.plenty.licence',
    subject: 'plenty.licence',
    title: 'Sheridan County 6, 2013',
    date: '2013–2018',
    text:
      'In 2013 the irrigators of a district in north-west Kansas agreed among themselves, and had the state make it ' +
      'binding, to pump about a fifth less from the aquifer than they had been. A study of the first years found that ' +
      'farmers inside the district used about 23 per cent less groundwater than their neighbours outside it, that the ' +
      'water table fell markedly more slowly, and that their profits held up. A limit on what was lifted, enforced and ' +
      'metered, did what a better sprinkler had not.',
    sources: [lema],
  },
  {
    id: 'arc.plenty.consumptionCap',
    subject: 'plenty.consumptionCap',
    title: 'Counting what never comes back, 2008',
    date: '2008',
    text:
      'A model of the upper Rio Grande basin, published in 2008, asked why subsidies for water-saving irrigation did not ' +
      'save water. The answer was in the accounts. Efficient technology cut the water a farm applied and the water ' +
      'that flowed back to the river and the aquifer, so the basin lost as much or more. The authors concluded that ' +
      'conservation subsidies were unlikely to reduce water use in many basins, and that real savings needed accounting ' +
      'that tracked depletion: what is used up, not what is pumped.',
    sources: [wardPulido],
  },
  {
    id: 'arc.plenty.dripSubsidy',
    subject: 'plenty.dripSubsidy',
    title: 'The paradox of irrigation efficiency, 2018',
    date: '2018',
    text:
      'Irrigation takes about 70 per cent of the water the world withdraws. A review in Science in 2018 found that ' +
      'subsidies for efficient irrigation, offered in many countries to save it, frequently increased the water farms ' +
      'consumed and the groundwater they extracted, while reducing the flows that had returned to rivers and aquifers. ' +
      'In Rajasthan drip subsidies increased the water applied and consumed locally. The farmers saved water on every ' +
      'acre, and watered more acres.',
    sources: [grafton],
  },
  {
    id: 'arc.plenty.diet',
    subject: 'plenty.diet',
    title: 'Fair shares, 1940–1954',
    date: '1940–1954',
    text:
      'British rationing began on 8 January 1940 with bacon, butter and sugar, and reached all meat by March. Bread, ' +
      'never rationed in the war, was rationed from July 1946. Meat and bacon were the last foods freed, on 4 July ' +
      '1954. Over the same years infant mortality reached the lowest rates on record and children grew taller, though ' +
      'what caused what is not settled. A diet with less of the Sunday joint and more bread and greens was possible, ' +
      'and was eaten, by order.',
    sources: [rationing],
  },
  {
    id: 'arc.plenty.dryland',
    subject: 'plenty.dryland',
    title: 'Two seasons’ rain for one crop',
    date: '20th century',
    text:
      'Dryland farming grows a crop on rain alone. On the Great Plains its oldest method is the summer fallow: a field ' +
      'is left unplanted for a season so that the soil holds two seasons’ rain for a single crop, with the stubble left ' +
      'standing to catch the snow. The harvest is smaller than an irrigated one and varies with the weather. It draws ' +
      'nothing from the aquifer, which is why the centre pivot, when it came, made the same land so much more ' +
      'valuable, and so much thirstier.',
    sources: [fallowWiki],
  },
  {
    id: 'arc.plenty.chargeApplied',
    subject: 'plenty.chargeApplied',
    title: 'A price at the pump',
    date: '2008',
    text:
      'A charge on every acre-foot read from a meter is cheap to collect and easy to understand, and it pays a farmer ' +
      'to apply less water. The basin studies of 2008 and 2018 explain why that may not be enough. A farm that applies ' +
      'less by applying it better also returns less to the river and the aquifer, so the water it uses up can stay the ' +
      'same or rise. A price on the pump is a price on the wrong figure whenever the two figures part company.',
    sources: [wardPulido, grafton],
  },
  {
    id: 'arc.plenty.chargeConsumed',
    subject: 'plenty.chargeConsumed',
    title: 'A price on depletion',
    date: '2008',
    text:
      'The water a basin loses is what is evaporated from the soil and transpired by the crop, plus what is carried ' +
      'away in it: the water that never comes back. Measuring it takes a water board’s accounts, satellite estimates of ' +
      'evaporation and arguments over every figure. The basin study of 2008 concluded that savings worth the name had ' +
      'to be counted that way. A charge on consumption is dear to run and unpopular to levy, and is the only charge ' +
      'whose figure the aquifer itself would recognise.',
    sources: [wardPulido],
  },
  {
    id: 'arc.plenty.fertiliserDuty',
    subject: 'plenty.fertiliserDuty',
    title: 'The Swedish nitrogen tax, 1984–2010',
    date: '1984–2010',
    text:
      'Sweden passed a law in 1984 taxing the nitrogen in mineral fertiliser, to reduce the nitrogen washing from its ' +
      'fields into its waters. It stood for a quarter of a century and was repealed with effect from 1 ' +
      'January 2010. Fertiliser taxes are rare, and the reasons are not hard to find: they raise the price of bread, ' +
      'the farmers say so loudly, and the nitrogen that runs off a field is counted downstream, by somebody else.',
    sources: [swedenTax],
  },
];
