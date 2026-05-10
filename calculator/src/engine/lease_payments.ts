import type { Inputs } from "./types";
import { buildFyBreakdown } from "./fy_breakdown";
import { taxSummaryAUResident } from "./tax_au";
import { isFbtApplicable } from "./types"; // whichever canonical truth helper you added

export type LeasePaymentsFyRow = {
  fy: number;
  count: number;
  takeHomeImpactPerPay: number;
};

export type LeasePaymentsResult = {
  leasePaymentsOverLease: number;
  fyRows: LeasePaymentsFyRow[];
};

export function computeLeasePaymentsOverLease(opts: {
  inputs: Inputs;
  fortnights: number;
  preTaxTotalFn: number; // from caller (so we keep single source of truth for packaged items)
  actualPreTaxDeductionFn?: number; // optional: only used when FBT applies
  ecmPerFn?: number;               // optional: only used when FBT applies
  /** Per-FY overrides — take precedence over the flat values when provided. */
  actualPreTaxDeductionFnForFy?: (fy: number) => number;
  ecmPerFnForFy?: (fy: number) => number;
}): LeasePaymentsResult {
  const { inputs, fortnights, preTaxTotalFn } = opts;

  // If NOT FBT-applicable: use existing engine behaviour
  if (!isFbtApplicable(inputs)) {
    const fy = buildFyBreakdown({ inputs, fortnights, preTaxTotalFn });
    const rows = fy.map((r) => ({ fy: r.fy, count: r.count, takeHomeImpactPerPay: r.takeHomeImpactPerPay }));
    const leasePaymentsOverLease = rows.reduce((acc, r) => acc + r.takeHomeImpactPerPay * r.count, 0);
    return { leasePaymentsOverLease, fyRows: rows };
  }

  // FBT-applicable: exact-tax method (requires these inputs)
  const flatPreTax = opts.actualPreTaxDeductionFn ?? 0;
  const flatEcm = opts.ecmPerFn ?? 0;
  const getPreTax = (fy: number) => opts.actualPreTaxDeductionFnForFy?.(fy) ?? flatPreTax;
  const getEcm = (fy: number) => opts.ecmPerFnForFy?.(fy) ?? flatEcm;

  // Build FY buckets using existing helper, but we won't use its takeHomeImpactPerPay
  const fy = buildFyBreakdown({ inputs, fortnights, preTaxTotalFn });

  const rows: LeasePaymentsFyRow[] = fy.map((r) => {
    const preTaxDeductionThisFy = getPreTax(r.fy) * r.count;
    const postTaxEcmThisFy = getEcm(r.fy) * r.count;

    const postNlTaxableIncome = r.originalTaxableIncome - preTaxDeductionThisFy;
    const postNlTax = taxSummaryAUResident(postNlTaxableIncome).totalTax;

    const postNlTakeHome = postNlTaxableIncome - postNlTax - postTaxEcmThisFy;

    const takeHomeImpactPerPay =
      r.count > 0 ? (r.originalTakeHome - postNlTakeHome) / r.count : 0;

    return { fy: r.fy, count: r.count, takeHomeImpactPerPay };
  });

  const leasePaymentsOverLease = rows.reduce((acc, r) => acc + r.takeHomeImpactPerPay * r.count, 0);
  return { leasePaymentsOverLease, fyRows: rows };
}