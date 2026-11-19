/**
 * The Archive: Compute (power, water and chips, 2000–2025). See index.ts for the rules. Fast-moving figures carry the
 * year they describe; a later writer should add a note rather than overwrite an old figure.
 */
import type { ArchiveDef } from '../../types';
import { masanet2020 } from './sources';

const iea2026 = {
  cite: 'International Energy Agency, Energy and AI (2025) and its 2026 update (data centres about 415 TWh in 2024; about 485 TWh in 2025)',
  url: 'https://www.iea.org/reports/energy-and-ai', grade: 'S',
} as const;
const dossier = (s: string) => ({ cite: `design/research/digital.md ${s}`, grade: 'S' as const });

export const computeArchive: ArchiveDef[] = [
  {
    id: 'arc.compute.industry',
    subject: 'compute',
    title: 'The plateau and the break, 2010–2025',
    date: '2010–2025',
    text:
      'Between 2010 and 2018, five researchers reported in Science in February 2020, the world’s data centres multiplied ' +
      'their computing instances six and a half times, their traffic eleven times and their storage twenty-six times, ' +
      'while their electricity rose by about 6 per cent, from 194 to 205 terawatt-hours. It was the clearest case on ' +
      'record of efficiency outrunning demand, and the authors warned that it would not last. By the International ' +
      'Energy Agency’s estimates data centres used about 415 terawatt-hours in 2024 and about 485 in 2025.',
    sources: [masanet2020, iea2026],
  },
  {
    id: 'arc.compute.multicore',
    subject: 'compute.multicore',
    title: 'The power wall, c. 2005',
    date: '1965–2005',
    text:
      'Gordon Moore predicted in Electronics, in April 1965, that the number of components on a chip would keep doubling. ' +
      'Robert Dennard and his colleagues showed in 1974 that a smaller transistor could run faster at the same power ' +
      'density, and for thirty years clock speeds rose for free. Around 2005 the arrangement broke: leakage current made ' +
      'faster chips too hot to cool, and Intel abandoned a planned 4 GHz processor, topping out at 3.8. The industry put ' +
      'several slower cores on each chip instead, and left the software to find uses for them. It did.',
    sources: [
      dossier('§3 (Moore 1965; Dennard 1974; the end of Dennard scaling and the 4 GHz Pentium 4)'),
      { cite: 'G. E. Moore, “Cramming more components onto integrated circuits”, Electronics 38(8), 19 April 1965', grade: 'V' },
    ],
  },
  {
    id: 'arc.compute.virtualisation',
    subject: 'compute.virtualisation',
    title: 'Ten servers in one, 1967–2018',
    date: '1967–2018',
    text:
      'IBM’s research laboratory at Cambridge, Massachusetts, ran several complete virtual machines on one mainframe in 1967, with its CP-40 ' +
      'and CP-67 systems. The idea returned to ordinary servers in the 2000s, when most of them spent most of the day idle. ' +
      'Running many virtual machines on each physical one raised the work done per server roughly fivefold between 2010 ' +
      'and 2018, by the Science paper’s reckoning. The servers freed were not switched off for long. Projects that would ' +
      'never have been given a machine of their own were given a virtual one.',
    sources: [
      { cite: 'IBM, “45 Years of Mainframe Virtualization” (GSE 2012) (CP-40 and CP-67, 1967)', url: 'https://public.dhe.ibm.com/s390/zos/vse/pdf3/gse2012/mainz/GS11_45_Years_of_Mainframe_Virtualization.pdf', grade: 'S' },
      masanet2020,
    ],
  },
  {
    id: 'arc.compute.hyperscale',
    subject: 'compute.hyperscale',
    title: 'Ireland’s share, 2015–2025',
    date: '2015–2025',
    text:
      'Large cloud campuses run at an overhead close to the practical minimum, and by 2018 they handled most of the ' +
      'world’s computing instances. They also cluster where land, power and tax suit them. Ireland’s Central Statistics ' +
      'Office reports that data centres took 5 per cent of the country’s metered electricity in 2015, 18 per cent in ' +
      '2022 and 23 per cent in 2025; in 2024 their use rose by a tenth while that of all other users rose by 3 per cent. ' +
      'The grid operator restricted new connections around Dublin. The halls are among the most efficient ever built.',
    sources: [
      { cite: 'Central Statistics Office (Ireland), Data Centres Metered Electricity Consumption (annual releases)', url: 'https://www.cso.ie/en/statistics/energy/datacentresmeteredelectricityconsumption/', grade: 'V' },
      masanet2020,
    ],
  },
  {
    id: 'arc.compute.gpu',
    subject: 'compute.gpu',
    title: 'AlexNet, 2012',
    date: '2012',
    text:
      'Graphics chips were built to shade millions of pixels at once, which is to say to do a great many small sums in ' +
      'parallel. In September 2012 a neural network from the University of Toronto, AlexNet, trained for five or six days ' +
      'on two consumer graphics cards with three gigabytes of memory each, won the ImageNet image-recognition contest ' +
      'with an error rate of 15.3 per cent against the runner-up’s 26.2. The field turned to graphics chips almost at ' +
      'once. Within a decade the largest training runs used tens of thousands of them.',
    sources: [
      { cite: 'A. Krizhevsky, I. Sutskever, G. E. Hinton, “ImageNet Classification with Deep Convolutional Neural Networks”, NIPS 2012 (republished in Communications of the ACM, 2017)', url: 'https://cacm.acm.org/research/imagenet-classification-with-deep-convolutional-neural-networks', grade: 'V' },
    ],
  },
  {
    id: 'arc.compute.accelerators',
    subject: 'compute.accelerators',
    title: 'Thirty-three times cheaper, twenty times more, 2024–2025',
    date: '2024–2025',
    text:
      'In August 2025 Google reported that the energy used by a median text prompt to its Gemini assistant had fallen ' +
      'thirty-three-fold in a year, to about 0.24 watt-hours; the figure was the company’s own and not independently ' +
      'checked. Over roughly the same period the tokens its products processed each month rose from 9.7 trillion in ' +
      'April 2024 to more than 1.3 quadrillion by October 2025, more than twentyfold in a year. Specialised chips did a ' +
      'great deal of the first. The second followed from it.',
    sources: [
      dossier('§9 (Google per-prompt figures, August 2025; monthly token counts, April 2024 to October 2025)'),
      { cite: 'Google, “Measuring the environmental impact of AI inference” (2025)', url: 'https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference', grade: 'S' },
    ],
  },
  {
    id: 'arc.compute.pueCertificate',
    subject: 'compute.pueCertificate',
    title: 'The flat line of PUE, 2007–2024',
    date: '2007–2024',
    text:
      'Power usage effectiveness divides all the electricity a data centre draws by the electricity that reaches its ' +
      'computers; 1.0 would mean no overhead at all. The Uptime Institute’s surveys put the industry average at about 2.5 ' +
      'in 2007, 1.98 in 2011, 1.65 in 2014 and 1.58 in 2018. Then it stopped. For five years the average sat between ' +
      '1.55 and 1.59, and the 2024 survey found 1.56. The newest halls were near the floor, and the old ones were still ' +
      'running. The certificates were real. There were simply more halls.',
    sources: [
      { cite: 'Uptime Institute, Global Data Center Survey (2024 and earlier)', grade: 'S' },
      dossier('§5 (Uptime PUE series)'),
    ],
  },
  {
    id: 'arc.compute.adFunded',
    subject: 'compute.adFunded',
    title: 'A gigabyte, free, 2004',
    date: '2004',
    text:
      'Google launched Gmail on 1 April 2004 with a gigabyte of free storage for every user, some five hundred times the ' +
      'two megabytes then offered by Hotmail, and paid for it with advertisements placed beside the mail. Many took it for ' +
      'an April Fool. A quota had once obliged users to delete their old mail; the new offer made deleting anything a ' +
      'waste of time. When a service costs the user nothing, the user stops economising on it, and the only limit left is ' +
      'the hours in the day.',
    sources: [dossier('§1, §6 (Gmail, 1 April 2004; 1 GB against Hotmail’s 2 MB)'), { cite: 'Gmail (launch, 1 April 2004)', url: 'https://en.wikipedia.org/wiki/Gmail', grade: 'S' }],
  },
  {
    id: 'arc.compute.subscriptions',
    subject: 'compute.subscriptions',
    title: 'The moon recedes, 2020–2024',
    date: '2020–2024',
    text:
      'In 2020 Microsoft promised to be carbon negative by 2030. Its sustainability report of 2024 recorded that, across ' +
      'all three scopes, its emissions were up 29.1 per cent on the 2020 baseline, and that Scope 3 had risen by 30.9 per ' +
      'cent, “primarily” from “the construction of more datacenters”. The company’s president told an interviewer that ' +
      'the moon was now “more than five times as far away as it was in 2020”. The profits were steady, the servers ' +
      'multiplied, and the promise stood.',
    sources: [
      { cite: 'Microsoft, 2024 Environmental Sustainability Report (as quoted in design/research/digital.md §5)', url: 'https://www.microsoft.com/en-us/corporate-responsibility/sustainability/report', grade: 'S' },
      dossier('§5 (Bloomberg Zero interview, May 2024)'),
    ],
  },
  {
    id: 'arc.compute.wasteHeat',
    subject: 'compute.wasteHeat',
    title: 'Heat for Odense, 2020',
    date: '2019–2025',
    text:
      'Meta’s data centre at Odense, in Denmark, was built with its heat in mind. Water from the town’s district heating ' +
      'network runs through the cooling units, and electric heat pumps beside the site raise it to 70–75 °C before it goes ' +
      'back to the radiators. The engineers who designed it describe about 45 megawatts of heat; the local heating company ' +
      'said in 2025 that it was supplying the equivalent of about 11,000 households. It is a genuine saving, and it makes ' +
      'the next data centre a little more welcome in the next town.',
    sources: [
      { cite: 'Ramboll, “Meta: surplus heat to district heating” (Fjernvarme Fyn, Odense)', url: 'https://www.ramboll.com/projects/energy/meta-surplus-heat-to-district-heating', grade: 'S' },
      { cite: 'Meta Engineering, Odense data centre (2018)', url: 'https://tech.facebook.com/engineering/2018/4/odense-dc', grade: 'S' },
    ],
  },
  {
    id: 'arc.compute.commodity',
    subject: 'compute.commodity',
    title: 'The datacenter as a computer, 2009',
    date: '2009',
    text:
      'In 2009 two Google engineers published a short book describing a building full of computers as a single machine. ' +
      'At that scale, they wrote, hardware failure is not an accident but a daily certainty, so it was cheaper to buy ' +
      'ordinary servers in bulk and write software that carried on when they broke than to pay for machines that seldom ' +
      'did. The approach made computing cheap enough to sell by the hour, and the hours sold made the warehouses larger.',
    sources: [
      { cite: 'L. A. Barroso and U. Hölzle, The Datacenter as a Computer: An Introduction to the Design of Warehouse-Scale Machines (Morgan and Claypool, 2009), ch. 7, “Dealing with Failures and Repairs”', url: 'https://research.google.com/pubs/pub35290.html', grade: 'V' },
    ],
  },
  {
    id: 'arc.compute.newFab',
    subject: 'compute.newFab',
    title: 'Chips and water, 2021',
    date: '2021',
    text:
      'A chip is rinsed many times in ultrapure water during its manufacture. Published estimates for a single large fab ' +
      'run from two million gallons a day to ten; TSMC reported using about 132 million tonnes of ultrapure water across ' +
      'its operations in 2022, a fifth more than the year before. Taiwan’s drought of 2020–21, the worst in 56 years, ' +
      'found the company ordering water by tanker truck while a reservoir serving Hsinchu stood at about 15 per cent. It ' +
      'built a plant to reclaim its own waste water. The chips kept shrinking, and the fabs kept growing.',
    sources: [
      { cite: 'Fortune, “The chip shortage and Taiwan’s drought” (12 June 2021)', url: 'https://fortune.com/2021/06/12/chip-shortage-taiwan-drought-tsmc-water-usage/', grade: 'S' },
      { cite: 'World Economic Forum, “The water challenge for semiconductor manufacturing” (July 2024)', url: 'https://weforum.org/agenda/2024/07/the-water-challenge-for-semiconductor-manufacturing-and-big-tech-what-needs-to-be-done', grade: 'S' },
      { cite: 'Manufacturing Dive, semiconductor ultrapure water (TSMC 2022 Sustainability Report figures)', url: 'https://www.manufacturingdive.com/news/semiconductor-chip-ultrapure-water-sustainability/756469/', grade: 'S' },
    ],
  },
  {
    id: 'arc.compute.spreadsheets',
    subject: 'compute.spreadsheets',
    title: 'The paperless office, 1975–1997',
    date: '1959–1997',
    text:
      'Xerox planned its 914 copier of 1959 for about 2,000 copies a month per customer; many made 10,000, and some ' +
      '100,000. The office of the future, the phrase went in the 1970s, would do without paper altogether. Instead ' +
      'worldwide office paper consumption more than doubled between 1980 and 1997, the years of the personal computer, ' +
      'the laser printer and the electronic spreadsheet, as two researchers documented in The Myth of the Paperless ' +
      'Office (2002). A ledger that could be redrafted in a second was redrafted, and printed, many times.',
    sources: [
      { cite: 'A. J. Sellen and R. H. R. Harper, The Myth of the Paperless Office (MIT Press, 2002)', grade: 'V' },
      dossier('§2 (Xerox 914 copy volumes; office paper consumption 1980–1997)'),
    ],
  },
  {
    id: 'arc.compute.web',
    subject: 'compute.web',
    title: 'A gigabyte for ten rupees, 2016–2021',
    date: '2016–2021',
    text:
      'Before Reliance Jio launched in India in September 2016, mobile data cost roughly 250 rupees a gigabyte. Prices ' +
      'fell to about 160 within months, and to 10.77 rupees by early 2021, by figures from the Indian telecom regulator: a ' +
      'fall of about fifteen times. Over the same four years the data used by each subscriber each month rose from about ' +
      '879 megabytes to 12.33 gigabytes, about fourteen times. Hundreds of millions of people came online for the first ' +
      'time. Few adoption curves on record are so close to the textbook.',
    sources: [dossier('§7 (TRAI-based figures on Indian mobile data prices and use, 2016–2021)')],
  },
  {
    id: 'arc.compute.cloudStorage',
    subject: 'compute.cloudStorage',
    title: 'Two cents a gigabyte, 1956–2022',
    date: '1956–2022',
    text:
      'IBM’s first disk drive, the RAMAC of 1956, held about five megabytes and was rented at about $3,200 a month. By ' +
      'November 2022 the backup company Backblaze was buying drives at about 1.4 cents a gigabyte. Between 2010 and 2018 ' +
      'the storage installed in the world’s data centres rose about twenty-six times while the energy it used roughly ' +
      'trebled, a genuine efficiency gain by any measure. It meant, among other things, that nobody ever had to delete ' +
      'anything, and on the whole nobody did.',
    sources: [
      { cite: 'Backblaze, hard drive cost per gigabyte (2009–2022), as summarised in design/research/digital.md §6', grade: 'S' },
      masanet2020,
    ],
  },
  {
    id: 'arc.compute.streaming',
    subject: 'compute.streaming',
    title: 'The resolution ladder, 2018–2022',
    date: '2018–2022',
    text:
      'Each new video codec roughly halves the bits needed for a picture of a given quality. Each new screen asks for a ' +
      'better picture. Netflix’s own guidance puts standard definition at up to a gigabyte an hour, and third parties ' +
      'citing it put high definition at up to three and ultra-high definition at up to seven. By the network company ' +
      'Sandvine’s count video was about 58 per cent of downstream traffic in 2018 and 65 per cent of all internet traffic ' +
      'in 2022. The codec saved the bits; the pixels spent them.',
    sources: [dossier('§7 (Sandvine Global Internet Phenomena reports; Netflix data per hour)')],
  },
  {
    id: 'arc.compute.training',
    subject: 'compute.training',
    title: 'One training run, 2020',
    date: '2020–2025',
    text:
      'A study of 2021 estimated that training GPT-3, in 2020, took about 1,287 megawatt-hours of electricity and emitted ' +
      'about 552 tonnes of carbon dioxide equivalent: a large number for one computation, and a small one beside what ' +
      'followed. The price of reaching a fixed level of capability then fell steeply, and the money moved to the next, ' +
      'larger model. By the International Energy Agency’s account the capital spending of five large technology firms ' +
      'passed $400 billion in 2025, and data centres built for artificial intelligence used about half as much again as ' +
      'the year before.',
    sources: [
      { cite: 'D. Patterson et al., “Carbon Emissions and Large Neural Network Training”, arXiv:2104.10350 (2021)', url: 'https://arxiv.org/abs/2104.10350', grade: 'V' },
      iea2026,
    ],
  },
  {
    id: 'arc.compute.cap',
    subject: 'compute.cap',
    title: 'Singapore pauses, 2019–2022',
    date: '2019–2022',
    text:
      'Singapore, short of land and power, stopped approving new data centres in 2019. When it reopened in 2022 it was ' +
      'with a capped quota and conditions, a power usage effectiveness below 1.3 among them, as reported at the time. ' +
      'Amsterdam paused too. Capacity that could not be built there was built elsewhere: in Johor, across the strait in ' +
      'Malaysia, and in the Nordic countries. The cap worked within its boundary. The computing went on outside it.',
    sources: [dossier('§5 (moratoria: Singapore 2019–2022; Amsterdam 2019; leakage to Johor and the Nordics)')],
  },
  {
    id: 'arc.compute.sufficiency',
    subject: 'compute.sufficiency',
    title: 'Digital sobriety, 2019',
    date: '2019',
    text:
      'In 2019 a French think tank, the Shift Project, published Lean ICT: Towards Digital Sobriety. It estimated that ' +
      'the energy used by digital technology was rising by about 9 per cent a year, and that its share of world ' +
      'greenhouse emissions had grown from 2.5 per cent in 2013 to 3.7 per cent. Its remedy was modest and personal: buy ' +
      'the least powerful equipment that will do, replace it as rarely as possible, and drop the uses that consume most ' +
      'for least. In a sobriety scenario it put growth at 1.5 per cent a year.',
    sources: [
      { cite: 'The Shift Project, Lean ICT: Towards Digital Sobriety, executive summary', url: 'https://theshiftproject.org/app/uploads/2025/04/Executive-Summary_Lean-ICT-Report_EN_lowdef.pdf', grade: 'V' },
    ],
  },
  {
    id: 'arc.compute.circularity',
    subject: 'compute.circularity',
    title: 'Sixty-two million tonnes, 2022',
    date: '2022',
    text:
      'The world discarded about 62 million tonnes of electrical and electronic equipment in 2022, 7.8 kilograms a person ' +
      'and 82 per cent more than in 2010, according to the United Nations’ Global E-waste Monitor. Only 22.3 per cent was ' +
      'documented as properly collected and recycled. The monitor projected 82 million tonnes by 2030 and a recycling ' +
      'rate falling to about 20 per cent: e-waste was rising five times faster than its recycling. The metals recovered ' +
      'were real, and they went into the next generation of devices.',
    sources: [
      { cite: 'ITU and UNITAR, The Global E-waste Monitor 2024', url: 'https://www.itu.int/en/ITU-D/Environment/Pages/Publications/The-Global-E-waste-Monitor-2024.aspx', grade: 'V' },
    ],
  },
  {
    id: 'arc.compute.substitution',
    subject: 'compute.substitution',
    title: 'Clean power, and more of it, 2019–2023',
    date: '2019–2023',
    text:
      'The largest technology companies became the largest corporate buyers of renewable electricity in the world, ' +
      'signing long contracts for wind and solar farms and pledging to match every hour of their use with clean power. ' +
      'Google’s reported greenhouse emissions for 2023 were nevertheless about 14.3 million tonnes, 48 per cent higher ' +
      'than in 2019, and its data centres’ water use rose by 17 per cent in a year. The clean power was real. The demand ' +
      'grew faster.',
    sources: [
      { cite: 'Google, 2024 Environmental Report', url: 'https://sustainability.google/reports/google-2024-environmental-report/', grade: 'S' },
      dossier('§5 (corporate clean-power procurement)'),
    ],
  },
  {
    id: 'arc.compute.duty',
    subject: 'compute.duty',
    title: 'Sweden’s carbon tax, 1991',
    date: '1991–2019',
    text:
      'Sweden introduced a carbon tax in 1991 at 250 kronor a tonne of carbon dioxide and raised it, steadily and without ' +
      'much drama, to more than 1,000 kronor by the late 2010s; industry and agriculture paid less from 1993. It came with ' +
      'a cut in income tax. A study published in 2019 found that the tax and the VAT on fuel together had cut transport ' +
      'emissions by almost 11 per cent against a synthetic comparison, about 6 per cent from the carbon tax alone. It is ' +
      'the oldest carbon tax still standing. Started low, rising slowly, it survived.',
    sources: [
      { cite: 'J. J. Andersson, “Carbon Taxes and CO2 Emissions: Sweden as a Case Study”, American Economic Journal: Economic Policy 11(4) (2019): 1–30', url: 'https://www.aeaweb.org/articles?id=10.1257/pol.20170144', grade: 'V' },
      { cite: 'design/research/restraint.md §1.2', grade: 'S' },
    ],
  },
  {
    id: 'arc.compute.hallStandard',
    subject: 'compute.hallStandard',
    title: 'The efficient hall and what fills it, 2020',
    date: '2020',
    text:
      'The authors of the Science paper of 2020 that found data-centre energy nearly flat for a decade recommended more ' +
      'of what had kept it flat: efficiency standards for servers, incentives for low-overhead buildings, better ' +
      'reporting. They also warned that the remaining gains could absorb perhaps the next doubling of computing but not ' +
      'much more, and that the next doubling might come within three or four years. A standard sets the cost of each ' +
      'sum. It does not set the number of sums.',
    sources: [masanet2020],
  },
  {
    id: 'arc.compute.phaseOut',
    subject: 'compute.phaseOut',
    title: 'The last coal station, 2024',
    date: '2015–2024',
    text:
      'Britain announced in 2015 that it would close its last coal-fired power stations within ten years, and did so a ' +
      'year early: Ratcliffe-on-Soar shut on 30 September 2024. A phase-out announced years ahead is a deadline for the ' +
      'owners of what is phased out, and economists have long warned of a green paradox, in which owners of a fuel sell ' +
      'all they can before the door closes. Britain’s coal stations mostly ran down early, priced out by gas and a carbon ' +
      'floor; the world as a whole burned a record tonnage that same year.',
    sources: [
      { cite: 'Ratcliffe-on-Soar power station (closed 30 September 2024)', url: 'https://en.wikipedia.org/wiki/Ratcliffe-on-Soar_power_station', grade: 'S' },
      { cite: 'design/research/restraint.md §13 (the green paradox, 2008)', grade: 'S' },
      { cite: 'International Energy Agency, Coal 2024, executive summary', url: 'https://www.iea.org/reports/coal-2024/executive-summary', grade: 'V' },
    ],
  },
];
