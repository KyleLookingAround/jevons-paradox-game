/**
 * Citations the Archive notes share. Each is a source a writer checked (grade 'V': a primary or scholarly source read
 * at the URL; 'S': a reputable secondary). Add here only what more than one note cites.
 */
import type { ArchiveDef } from '../../types';

export type Source = ArchiveDef['sources'][number];

const CQ = 'https://www.econlib.org/library/YPDBooks/Jevons/jvnCQ.html?chapter_num=';

/** Jevons, The Coal Question, 2nd ed. 1866 (Econlib text), by chapter. */
export const jevons = {
  ch1: { cite: 'W. S. Jevons, The Coal Question, 2nd ed. (1866), ch. I, “Introduction and Outline”', url: `${CQ}3`, grade: 'V' },
  ch7: { cite: 'W. S. Jevons, The Coal Question, 2nd ed. (1866), ch. VII, “Of the Economy of Fuel” (duty table and text)', url: `${CQ}9`, grade: 'V' },
  ch9: { cite: 'W. S. Jevons, The Coal Question, 2nd ed. (1866), ch. IX', url: `${CQ}11`, grade: 'V' },
  ch17: { cite: 'W. S. Jevons, The Coal Question, 2nd ed. (1866), ch. XVII', url: `${CQ}19`, grade: 'V' },
  ch18: { cite: 'W. S. Jevons, The Coal Question, 2nd ed. (1866), ch. XVIII, “Concluding Reflections”', url: `${CQ}20`, grade: 'V' },
} satisfies Record<string, Source>;

export const smiles12: Source = {
  cite: 'S. Smiles, Lives of Boulton and Watt (1865), ch. 12 (the premium of one third of the fuel saved)',
  url: 'https://gracesguide.co.uk/Lives_of_Boulton_and_Watt_by_Samuel_Smiles:_Chapter_12', grade: 'S',
};

export const hansardCoal1913: Source = {
  cite: 'Hansard, written answers, 10 March 1925 (coal output, Great Britain, 1913: 287.3 million tons)',
  url: 'https://api.parliament.uk/historic-hansard/written-answers/1925/mar/10/output-disposal-and-employment', grade: 'V',
};

export const iea2024: Source = {
  cite: 'International Energy Agency, Coal 2024, executive summary (world demand about 8.77 billion tonnes)',
  url: 'https://www.iea.org/reports/coal-2024/executive-summary', grade: 'V',
};

export const masanet2020: Source = {
  cite: 'E. Masanet, A. Shehabi, N. Lei, S. Smith, J. Koomey, “Recalibrating global data center energy-use estimates”, Science 367 (2020): 984–986',
  url: 'https://www.science.org/doi/10.1126/science.aba3758', grade: 'V',
};

export const fouquetPearson2006: Source = {
  cite: 'R. Fouquet and P. J. G. Pearson, “Seven Centuries of Energy Services: The Price and Use of Light in the United Kingdom (1300–2000)”, Energy Journal 27(1) (2006): 139–177',
  url: 'https://researchonline.lse.ac.uk/id/eprint/50460', grade: 'V',
};

export const durantonTurner2011: Source = {
  cite: 'G. Duranton and M. A. Turner, “The Fundamental Law of Road Congestion: Evidence from US Cities”, American Economic Review 101(6) (2011): 2616–2652',
  url: 'https://www.nber.org/papers/w15376.pdf', grade: 'V',
};

export const epaTrends: Source = {
  cite: 'US Environmental Protection Agency, Automotive Trends Report (highlights)',
  url: 'https://www.epa.gov/automotive-trends/highlights-automotive-trends-report', grade: 'V',
};
