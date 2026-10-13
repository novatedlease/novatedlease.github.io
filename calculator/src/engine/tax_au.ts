export type TaxResultAU = {
  taxableIncome: number;
  incomeTax: number;
  medicareLevy: number;
  totalTax: number;
  marginalRate: number; // ex Medicare
  marginalRateInclMedicare: number;
};

/**
 * Rate for the $18,201–$45,000 bracket by financial year (fy = year the FY ends,
 * e.g. 2027 for 2026-27). 16% from 2024-25 (Stage 3), cut to 15% from 1 July 2026
 * and 14% from 1 July 2027 (Treasury Laws Amendment (More Cost of Living Relief) Act 2025).
 * With no fy, keeps the original 16% so existing callers are unchanged.
 */
export function lowBracketRate(fy?: number): number {
  if (fy === undefined || fy <= 2026) return 0.16;
  if (fy === 2027) return 0.15;
  return 0.14;
}

export function incomeTaxResident(income: number, fy?: number): number {
  const x = Math.max(0, income);
  const low = lowBracketRate(fy);
  const at45k = low * (45000 - 18200);
  const at135k = at45k + 0.30 * (135000 - 45000);
  const at190k = at135k + 0.37 * (190000 - 135000);
  if (x <= 18200) return 0;
  if (x <= 45000) return low * (x - 18200);
  if (x <= 135000) return at45k + 0.30 * (x - 45000);
  if (x <= 190000) return at135k + 0.37 * (x - 135000);
  return at190k + 0.45 * (x - 190000);
}

export function marginalRateResident(income: number, fy?: number): number {
  const x = Math.max(0, income);
  if (x <= 18200) return 0;
  if (x <= 45000) return lowBracketRate(fy);
  if (x <= 135000) return 0.30;
  if (x <= 190000) return 0.37;
  return 0.45;
}

export function taxSummaryAUResident(income: number, fy?: number): TaxResultAU {
  const taxableIncome = Math.max(0, income);
  const incomeTax = incomeTaxResident(taxableIncome, fy);
  const medicareLevy = 0.02 * taxableIncome; // simplified
  const totalTax = incomeTax + medicareLevy;

  const marginalRate = marginalRateResident(taxableIncome, fy);
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