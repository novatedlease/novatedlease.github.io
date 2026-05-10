import type { Inputs } from "./types";
import { isFbtApplicable, getLeaseFbtCategory, getEcmStatutoryRate, getEcmTwoThirdsFromFy, getEcmMultiplierForFy } from "./types";
import { buildFyBreakdown } from "./fy_breakdown";

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
   * For EVs, the packaged (claimable) electricity amount comes from `inputs.electricityAnnual`
   * (user-adjustable in InputsPanel; default may be the ATO 5.47c/km shortcut).
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

  // Packaged running costs: for EVs use the user-adjustable claimable electricity figure from InputsPanel.
  // (Default there may be the ATO shortcut 5.47c/km, but users can override it.)
  const packagedChargingClaimPerYear = inputs.vehicleType === "EV" ? inputs.electricityAnnual : 0;

  // Packaged energy cost: EV uses claimable electricity; non-EV uses user-entered fuel.
  const packagedEnergyAnnual = inputs.vehicleType === "EV" ? inputs.electricityAnnual : inputs.fuelAnnual;

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
  const fbtStatutoryRate = getEcmStatutoryRate(getLeaseFbtCategory(inputs));
  const ecmAnnual = vehicleDutiableValue * fbtStatutoryRate;
  const ecmPerFn = ecmAnnual / 26;

  const atiRows: AtiRow[] = fyRows.map((r) => ({
    financialYearEnding: r.fy,
    taxableIncomePostNL: r.postNlTaxableIncome,
  }));

  const leaseStartDate = new Date(inputs.leaseStartDate + "T00:00:00Z");
  const ecmTwoThirdsFromFy = getEcmTwoThirdsFromFy(leaseStartDate);

  const sgRows: SgRow[] = fyRows.map((r) => {
    const ecmMultiplier = fbtApplies ? getEcmMultiplierForFy(r.fy, ecmTwoThirdsFromFy) : 1;
    const ecmPerFnFy = ecmPerFn * ecmMultiplier;
    const actualPreTaxDeductionFnFy = preTaxTotalFn + (fbtApplies ? -(ecmPerFnFy) + ecmPerFnFy / 11 : 0);
    return {
      financialYearEnding: r.fy,
      reducedPretaxIncome: fbtApplies
        ? actualPreTaxDeductionFnFy * r.count
        : r.originalTaxableIncome - r.postNlTaxableIncome,
    };
  });

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