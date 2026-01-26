import type { Inputs } from "./types";
import { isFbtApplicable } from "./types";
import { buildFyBreakdown } from "./fy_breakdown";
import { atoChargingClaimAnnual } from "./charging";

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
  packagedChargingClaimPerYear: number;
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

  // Packaged running costs use the ATO EV home charging shortcut (4.2c / km) for EVs only.
  const packagedChargingClaimPerYear = inputs.vehicleType === "EV" ? atoChargingClaimAnnual(inputs) : 0;

  // Packaged energy cost: EV uses the ATO shortcut claim; non-EV uses user-entered fuel.
  const packagedEnergyAnnual = inputs.vehicleType === "EV" ? packagedChargingClaimPerYear : inputs.fuelAnnual;

  const runningCostAnnual =
    inputs.serviceMaintTyresAnnual +
    inputs.saveShareAnnual +
    inputs.registrationAnnual +
    inputs.insuranceAnnual +
    inputs.managementFeesAnnual +
    packagedEnergyAnnual;

  const runningCostFn = runningCostAnnual / 26;

  // Pre-tax total per fortnight used for FY allocation.
  const preTaxTotalFn = inputs.vehicleLeasePerFn + runningCostFn;

  const fyRows = buildFyBreakdown({
    inputs,
    fortnights,
    preTaxTotalFn,
  });

  // For FBT-applicable leases, the *actual* pre-tax deduction is reduced by ECM and increased by the GST credit on ECM.
  // This matches the mechanism used in LeaseReport section 1.2.
  const fbtApplies = isFbtApplicable(inputs);
  const vehicleDutiableValue = Math.max(0, inputs.vehicleBaseValue);
  const fbtStatutoryRate = 0.2;
  const ecmAnnual = vehicleDutiableValue * fbtStatutoryRate;
  const ecmPerFn = ecmAnnual / 26;
  const ecmGstPerFn = ecmPerFn / 11;
  const actualPreTaxDeductionFn = preTaxTotalFn + (fbtApplies ? -ecmPerFn + ecmGstPerFn : 0);

  const atiRows: AtiRow[] = fyRows.map((r) => ({
    financialYearEnding: r.fy,
    taxableIncomePostNL: r.postNlTaxableIncome,
  }));

  const sgRows: SgRow[] = fyRows.map((r) => ({
    financialYearEnding: r.fy,
    reducedPretaxIncome: fbtApplies
      ? actualPreTaxDeductionFn * r.count
      : r.originalTaxableIncome - r.postNlTaxableIncome,
  }));

  return {
    fortnights,
    packagedChargingClaimPerYear,
    runningCostAnnual,
    runningCostFn,
    preTaxTotalFn,
    fyRows,
    atiRows,
    sgRows,
  };
}