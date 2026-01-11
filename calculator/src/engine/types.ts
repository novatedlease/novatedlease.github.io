export type YesNo = "Yes" | "No";

export type Inputs = {
  // Vehicle + lease
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
  saveSharePerFn: number; // per fn credit
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
};

export type SummarySection = {
  title: string;
  bullets: string[];
};

export type CalculationResult = {
  summaries: SummarySection[];
  warnings: string[];
  assumptionsVersion: string;
};