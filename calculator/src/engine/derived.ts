import type { Inputs } from "./types";
import { buildFyBreakdown } from "./fy_breakdown";
import { annualChargingExpense } from "./charging";

export type AtiRow = {
  financialYearEnding: number;
  taxableIncomePostNL: number;
};

export type SgRow = {
  financialYearEnding: number;
  /** Reduced pre-tax income due to salary sacrifice in that FY. */
  reducedPretaxIncome: number;
};

export type Derived = {
  fortnights: number;

  /**
   * Derived running costs using the same assumptions as the FY breakdown.
   * (Includes the ATO EV home charging shortcut rate.)
   */
  assumedChargingClaimPerYear: number;
  runningCostAnnual: number;
  runningCostFn: number;
  preTaxTotalFn: number;

  /** FY breakdown rows (output of buildFyBreakdown). */
  fyRows: ReturnType<typeof buildFyBreakdown>;

  /** Convenience rows for ATI and SG sections. */
  atiRows: AtiRow[];
  sgRows: SgRow[];
};

/**
 * Compute shared derived values used across multiple report components.
 * Keep this as the single "source of truth" for FY allocation inputs.
 */
export function computeDerived(inputs: Inputs): Derived {
  const fortnights = Math.round(inputs.leaseDurationYears * 26);

  // LeaseReport includes ATO EV home charging shortcut (4.2c / km) in running costs.
  const assumedChargingClaimPerYear = annualChargingExpense(inputs);

  const runningCostAnnual =
    inputs.serviceMaintTyresAnnual +
    inputs.saveShareAnnual +
    inputs.registrationAnnual +
    inputs.insuranceAnnual +
    inputs.managementFeesAnnual +
    assumedChargingClaimPerYear;

  const runningCostFn = runningCostAnnual / 26;

  // Pre-tax total per fortnight used for FY allocation.
  const preTaxTotalFn = inputs.vehicleLeasePerFn + runningCostFn;

  const fyRows = buildFyBreakdown({
    inputs,
    fortnights,
    preTaxTotalFn,
  });

  const atiRows: AtiRow[] = fyRows.map((r) => ({
    financialYearEnding: r.fy,
    taxableIncomePostNL: r.postNlTaxableIncome,
  }));

  const sgRows: SgRow[] = fyRows.map((r) => ({
    financialYearEnding: r.fy,
    reducedPretaxIncome: r.originalTaxableIncome - r.postNlTaxableIncome,
  }));

  return {
    fortnights,
    assumedChargingClaimPerYear,
    runningCostAnnual,
    runningCostFn,
    preTaxTotalFn,
    fyRows,
    atiRows,
    sgRows,
  };
}