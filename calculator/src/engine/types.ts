export type YesNo = "Yes" | "No";

export type Inputs = {
  // Vehicle + lease
  vehicleCondition:
    | "New"
    | "Used – dealer sale (GST inc)"
    | "Used – private sale (no GST)"; // affects GST treatment
  vehicleBaseValue: number; // dutiable / FBT base
  driveawayCost: number;
  estimatedMarketValueAtEnd: number;
  annualMileageKm: number;

  leaseDocFee: number;
  leaseStartDate: string; // ISO yyyy-mm-dd
  leaseDurationYears: number;

  // Income + benchmark
  totalTaxableIncome: number;
  homeLoanOffsetInterestRate: number; // percent, e.g. 6.2

  // Fortnightly quote items
  vehicleLeasePerFn: number;
  luxuryVehicleAdjPerFn: number;

  superFromPreNlIncome: YesNo;
  gstSavingPassedOn: YesNo;

  // Running costs (annual unless stated)
  serviceMaintTyresAnnual: number;
  saveShareAnnual: number;
  registrationAnnual: number;
  electricityAnnual: number;
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