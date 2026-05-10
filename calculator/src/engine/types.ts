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
  residualValueExGst: number;
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
 * - EV_FBT_EXEMPT: eligible for the full EV FBT-exempt pathway
 * - EV_FBT_DISCOUNTED: EV where 75% of full FBT applies (ECM at 15% statutory rate) — May 2026 phase-out rules
 * - EV_FBT_APPLICABLE: EV or non-EV with full FBT (ECM at 20% statutory rate)
 * - NON_EV_FBT_APPLICABLE: non-EV (always FBT-applicable)
 */
export type LeaseFbtCategory = "EV_FBT_EXEMPT" | "EV_FBT_DISCOUNTED" | "EV_FBT_APPLICABLE" | "NON_EV_FBT_APPLICABLE";

/**
 * EV LCT threshold for purchases before 1 July 2026.
 */
export const EV_LCT_THRESHOLD = 91387;

/**
 * EV LCT threshold projected from 1 July 2026 onward.
 * (From the May 2026 treasurer announcement and associated LCT indexation.)
 */
export const EV_LCT_THRESHOLD_FROM_JUL_2026 = 91661;

/**
 * Under the transitional phase-out rules (1 Apr 2027 – 31 Mar 2029), EVs at or below this
 * value retain full FBT exemption. Above this cap, 75% of full FBT applies.
 */
export const EV_TRANSITIONAL_FULL_EXEMPT_CAP = 75000;

/**
 * Returns the applicable EV LCT threshold based on the lease start date.
 * Pre 1 Jul 2026 → $91,387; from 1 Jul 2026 → $91,661.
 */
export function getEvLctThresholdForLeaseStart(leaseStartDate: string): number {
  const leaseStart = new Date(leaseStartDate + "T00:00:00Z");
  const jul2026 = new Date(Date.UTC(2026, 6, 1));
  return leaseStart >= jul2026 ? EV_LCT_THRESHOLD_FROM_JUL_2026 : EV_LCT_THRESHOLD;
}

/**
 * Returns the first financial year ending (30 June) from which the FBT base value
 * reduces to two-thirds of the original cost (the "4-year rule" under FBTAA s 11(2)).
 * ECM and RFBA both use this threshold.
 *
 * Logic: the reduction applies from the 5th FBT year of ownership.
 * A lease starting Jan–Mar is already in the FBT year ending that March, so it
 * "uses up" its first FBT year sooner, and the FY ending 5 years later is correct.
 * A lease starting Apr–Dec starts its first FBT year in April, so FY ending 6 years later.
 */
export function getEcmTwoThirdsFromFy(leaseStartDate: Date): number {
  const m = leaseStartDate.getMonth() + 1; // 1-12
  const y = leaseStartDate.getFullYear();
  return m < 4 ? y + 5 : y + 6;
}

/**
 * Returns the ECM base-value multiplier for a given financial year.
 *
 * The 2/3 rule is an FBT-year rule (triggers 1 April), but per-FY calculations
 * must approximate it. The threshold FY (twoThirdsFromFy) contains:
 *   - July – March  (9 months, FBT year 4): full ECM
 *   - April – June  (3 months, FBT year 5): 2/3 ECM
 * Weighted average for that FY = (9×1 + 3×⅔) / 12 = 11/12.
 * All subsequent FYs are entirely in FBT year 5+ → 2/3.
 */
export function getEcmMultiplierForFy(fy: number, twoThirdsFromFy: number): number {
  if (fy >= twoThirdsFromFy) return 2 / 3;
  if (fy === twoThirdsFromFy - 1) return 11 / 12; // transition year
  return 1;
}

/**
 * Returns the ECM statutory rate for a given FBT category.
 * - EV_FBT_EXEMPT → 0 (no ECM)
 * - EV_FBT_DISCOUNTED → 0.15 (75% of full FBT applies, i.e. 75% × 20% statutory rate)
 * - EV_FBT_APPLICABLE / NON_EV_FBT_APPLICABLE → 0.20 (full ECM)
 */
export function getEcmStatutoryRate(category: LeaseFbtCategory): number {
  if (category === "EV_FBT_EXEMPT") return 0;
  if (category === "EV_FBT_DISCOUNTED") return 0.15;
  return 0.2;
}

export type EvFbtEligibility = {
  isEv: boolean;
  eligible: boolean;
  isOverEvLctThreshold: boolean;
  needsUsedEligibilityChecks: boolean;
  usedEligibilityChecksOk: boolean;
};

/**
 * Derives basic EV FBT eligibility checks (used vehicle, LCT threshold).
 * The lease-start-date-aware tier logic lives in getLeaseFbtCategory.
 */
export function deriveEvFbtEligibility(i: Inputs): EvFbtEligibility {
  const isEv = i.vehicleType === "EV";
  const lctThreshold = getEvLctThresholdForLeaseStart(i.leaseStartDate);
  const isOverEvLctThreshold = i.vehicleBaseValue > lctThreshold;

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
 * Canonical FBT category derived from inputs, incorporating the May 2026 phase-out rules.
 *
 * Legacy (lease start before 1 Apr 2027):
 *   ≤ LCT threshold → EXEMPT; otherwise APPLICABLE.
 *
 * Transitional (1 Apr 2027 – 31 Mar 2029):
 *   ≤ $75,000 → EXEMPT; $75,001–LCT threshold → DISCOUNTED (75% of FBT applies); > LCT → APPLICABLE.
 *
 * Post phase-out (1 Apr 2029+):
 *   ≤ LCT threshold → DISCOUNTED (75% of FBT applies); > LCT → APPLICABLE.
 *
 * All EV categories also require: first held & used after 1/7/22, and LCT was never paid
 * (for used vehicles, confirmed via the usedCar* checkboxes).
 */
export function getLeaseFbtCategory(i: Inputs): LeaseFbtCategory {
  if (i.vehicleType !== "EV") return "NON_EV_FBT_APPLICABLE";

  const needsUsedEligibilityChecks = i.vehicleCondition !== "New";
  const usedEligibilityChecksOk =
    !needsUsedEligibilityChecks || (i.usedCarFirstHeldAfterJul2022 && i.usedCarLctNeverPayable);
  if (!usedEligibilityChecksOk) return "EV_FBT_APPLICABLE";

  const baseValue = i.vehicleBaseValue;
  if (baseValue <= 0) return "EV_FBT_APPLICABLE";

  const leaseStart = new Date(i.leaseStartDate + "T00:00:00Z");
  const TRANSITIONAL_START = new Date(Date.UTC(2027, 3, 1)); // 1 Apr 2027
  const POST_PHASEOUT_START = new Date(Date.UTC(2029, 3, 1)); // 1 Apr 2029

  const lctThreshold = getEvLctThresholdForLeaseStart(i.leaseStartDate);

  if (leaseStart < TRANSITIONAL_START) {
    // Legacy / grandfathered (covers all leases started before 1 Apr 2027)
    return baseValue <= lctThreshold ? "EV_FBT_EXEMPT" : "EV_FBT_APPLICABLE";
  }

  if (leaseStart < POST_PHASEOUT_START) {
    // Transitional: 1 Apr 2027 – 31 Mar 2029
    if (baseValue <= EV_TRANSITIONAL_FULL_EXEMPT_CAP) return "EV_FBT_EXEMPT";
    if (baseValue <= lctThreshold) return "EV_FBT_DISCOUNTED";
    return "EV_FBT_APPLICABLE";
  }

  // Post phase-out: 1 Apr 2029+
  return baseValue <= lctThreshold ? "EV_FBT_DISCOUNTED" : "EV_FBT_APPLICABLE";
}

export function isFbtExemptEv(i: Inputs): boolean {
  return getLeaseFbtCategory(i) === "EV_FBT_EXEMPT";
}

/** Returns true when ECM applies (i.e. the lease is NOT fully FBT-exempt). */
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