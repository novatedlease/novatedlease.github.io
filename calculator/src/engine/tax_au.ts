export type TaxResultAU = {
  taxableIncome: number;
  incomeTax: number;
  medicareLevy: number;
  totalTax: number;
  marginalRate: number; // ex Medicare
  marginalRateInclMedicare: number;
};

export function incomeTaxResident(income: number): number {
  const x = Math.max(0, income);
  if (x <= 18200) return 0;
  if (x <= 45000) return 0.16 * (x - 18200);
  if (x <= 135000) return 4288 + 0.30 * (x - 45000);
  if (x <= 190000) return 31288 + 0.37 * (x - 135000);
  return 51638 + 0.45 * (x - 190000);
}

export function marginalRateResident(income: number): number {
  const x = Math.max(0, income);
  if (x <= 18200) return 0;
  if (x <= 45000) return 0.16;
  if (x <= 135000) return 0.30;
  if (x <= 190000) return 0.37;
  return 0.45;
}

export function taxSummaryAUResident(income: number): TaxResultAU {
  const taxableIncome = Math.max(0, income);
  const incomeTax = incomeTaxResident(taxableIncome);
  const medicareLevy = 0.02 * taxableIncome; // simplified
  const totalTax = incomeTax + medicareLevy;

  const marginalRate = marginalRateResident(taxableIncome);
  const marginalRateInclMedicare = marginalRate + 0.02;

  return {
    taxableIncome,
    incomeTax,
    medicareLevy,
    totalTax,
    marginalRate,
    marginalRateInclMedicare,
  };
}