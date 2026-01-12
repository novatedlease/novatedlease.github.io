// engine/fy_breakdown.ts
import type { Inputs } from "./types";
import { taxSummaryAUResident } from "./tax_au";
import { buildFortnightSchedule, countFortnightsByFY } from "./lease_schedule";

export type FYRow = {
  fy: number;
  count: number;

  originalTaxableIncome: number;
  originalTax: number;
  originalTakeHome: number;

  postNlTaxableIncome: number;
  postNlTax: number;
  postNlTakeHome: number;

  takeHomeImpactPerPay: number;
  avgLeaseTaxBracketPct: number;
};

export function buildFyBreakdown(args: {
  inputs: Inputs;
  fortnights: number;
  preTaxTotalFn: number;
}): FYRow[] {
  const { inputs: i, fortnights, preTaxTotalFn } = args;

  const dates = buildFortnightSchedule(i.leaseStartDate, fortnights);
  const fyCounts = countFortnightsByFY(dates);

  return fyCounts.map(({ fy, count }) => {
    const originalTaxableIncome = i.totalTaxableIncome;
    const originalTax = taxSummaryAUResident(originalTaxableIncome).totalTax;
    const originalTakeHome = originalTaxableIncome - originalTax;

    const postNlTaxableIncome = Math.max(0, originalTaxableIncome - count * preTaxTotalFn);
    const postNlTax = taxSummaryAUResident(postNlTaxableIncome).totalTax;
    const postNlTakeHome = postNlTaxableIncome - postNlTax;

    const takeHomeImpactPerPay = count > 0 ? (originalTakeHome - postNlTakeHome) / count : 0;

    const avgLeaseTaxBracketPct =
      preTaxTotalFn > 0 ? (1 - takeHomeImpactPerPay / preTaxTotalFn) * 100 : 0;

    return {
      fy,
      count,
      originalTaxableIncome,
      originalTax,
      originalTakeHome,
      postNlTaxableIncome,
      postNlTax,
      postNlTakeHome,
      takeHomeImpactPerPay,
      avgLeaseTaxBracketPct,
    };
  });
}