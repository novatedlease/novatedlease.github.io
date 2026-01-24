export type YesNo = "Yes" | "No";

export type Inputs = {
  // Vehicle + lease
  vehicleType: "EV" | "Non-EV";
  vehicleCondition:
    | "New"
    | "Used – dealer sale (GST inc)"
    | "Used – private sale (no GST)"; // affects GST treatment
  // Used vehicle eligibility checks for EV FBT exemption
  usedCarFirstHeldAfterJul2022: boolean;
  usedCarLctNeverPayable: boolean;
  vehicleBaseValue: number; // dutiable / FBT base
  driveawayCost: number;
  estimatedMarketValueAtEnd: number;
  annualMileageKm: number;

  leaseDocFee: number;
  leaseStartDate: string; // ISO yyyy-mm-dd
  leaseDurationYears: number;
  monthsDeferred: number;

  // Income + benchmark
  totalTaxableIncome: number;
  homeLoanOffsetInterestRate: number; // percent, e.g. 6.2

  // Fortnightly quote items
  vehicleLeasePerFn: number;
  luxuryVehicleAdjPerFn: number;
  financedAmountForInterestCalcExGst: number;

  superFromPreNlIncome: YesNo;
  gstSavingPassedOn: YesNo;

  // Running costs (annual unless stated)
  serviceMaintTyresAnnual: number;
  saveShareAnnual: number;
  registrationAnnual: number;

  // Packaged energy cost: electricity for EV, fuel for Non‑EV
  electricityAnnual: number;
  fuelAnnual: number;

  insuranceAnnual: number;
  managementFeesAnnual: number;

  avgAudPerKwh: number;
  avgWhPerKm: number;
  overrideAnnualChargingExpense?: number;

  // Optional: Keep current car comparator
  compareWithCurrentCar: boolean;
  currentCarMarketValueNow: number;
  currentCarMarketValueAtEnd: number;

  currentServiceMaintTyresAnnual: number;
  currentRegistrationAnnual: number;
  currentFuelAnnual: number;
  currentInsuranceAnnual: number;

  // Optional: Compare with car loan
  compareWithCarLoan: boolean;
  carLoanInitialDeposit: number;
  carLoanInterestRatePct: number;
  carLoanMonthlyFee: number;
};

// --- Canonical lease category (single source of truth) ---

/**
 * Canonical categories used throughout the calculator.
 * - EV_FBT_EXEMPT: eligible for the EV FBT-exempt pathway
 * - EV_FBT_APPLICABLE: EV selected but NOT eligible for exemption (e.g. LCT threshold / used checks)
 * - NON_EV_FBT_APPLICABLE: non-EV (always FBT-applicable)
 */
export type LeaseFbtCategory = "EV_FBT_EXEMPT" | "EV_FBT_APPLICABLE" | "NON_EV_FBT_APPLICABLE";

/**
 * Current EV Luxury Car Tax threshold used for FBT-exempt EV eligibility.
 * Note: keep in one place so UI + engine stay consistent.
 */
export const EV_LCT_THRESHOLD = 91387;

export type EvFbtEligibility = {
  isEv: boolean;
  eligible: boolean;
  isOverEvLctThreshold: boolean;
  needsUsedEligibilityChecks: boolean;
  usedEligibilityChecksOk: boolean;
};

/**
 * Derives EV FBT-exemption eligibility from Inputs.
 * This mirrors the logic used in the InputsPanel "FBT-EXEMPT ELIGIBILITY" section.
 */
export function deriveEvFbtEligibility(i: Inputs): EvFbtEligibility {
  const isEv = i.vehicleType === "EV";
  const isOverEvLctThreshold = i.vehicleBaseValue > EV_LCT_THRESHOLD;

  // Used vehicle checks apply to any non-new condition.
  const needsUsedEligibilityChecks = i.vehicleCondition !== "New";
  const usedEligibilityChecksOk =
    !needsUsedEligibilityChecks || (i.usedCarFirstHeldAfterJul2022 && i.usedCarLctNeverPayable);

  const eligible = isEv && i.vehicleBaseValue > 0 && !isOverEvLctThreshold && usedEligibilityChecksOk;

  return {
    isEv,
    eligible,
    isOverEvLctThreshold,
    needsUsedEligibilityChecks,
    usedEligibilityChecksOk,
  };
}

/**
 * Canonical category used by downstream calculations and UI.
 */
export function getLeaseFbtCategory(i: Inputs): LeaseFbtCategory {
  if (i.vehicleType !== "EV") return "NON_EV_FBT_APPLICABLE";
  return deriveEvFbtEligibility(i).eligible ? "EV_FBT_EXEMPT" : "EV_FBT_APPLICABLE";
}

export function isFbtExemptEv(i: Inputs): boolean {
  return getLeaseFbtCategory(i) === "EV_FBT_EXEMPT";
}

export function isFbtApplicable(i: Inputs): boolean {
  return getLeaseFbtCategory(i) !== "EV_FBT_EXEMPT";
}

// --- Shared lease helpers (single source of truth) ---

/**
 * Residual payable at lease end (inc GST), based on financed amount net of lease doc fee.
 * Mirrors the formula used in LeaseReport and worksheet modelling.
 *
 * Note: financed amounts and doc fees are expected to be EX-GST.
 */
export function calcResidualPayableIncGst(args: {
  amountFinancedExGst: number;
  leaseDocFeeExGst: number;
  residualPct: number; // e.g. 28.13
  gstRate?: number; // default 10%
}): number {
  const gstMult = 1 + (args.gstRate ?? 0.1);
  const base = Math.max(0, args.amountFinancedExGst - args.leaseDocFeeExGst);
  return base * (args.residualPct / 100) * gstMult;
}

/**
 * Residual payable at lease end (ex GST).
 */
export function calcResidualPayableExGst(args: {
  amountFinancedExGst: number;
  leaseDocFeeExGst: number;
  residualPct: number;
}): number {
  const base = Math.max(0, args.amountFinancedExGst - args.leaseDocFeeExGst);
  return base * (args.residualPct / 100);
}

export type SummarySection = {
  title: string;
  bullets: string[];
};

export type CalculationResult = {
  summaries: SummarySection[];
  warnings: string[];
  assumptionsVersion: string;
};