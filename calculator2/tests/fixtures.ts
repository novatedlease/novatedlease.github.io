import type { Inputs } from "@engine/types";
import { financedAmountExGstFromInputs } from "@engine/effectiveinterest";
import { residualFractionForYears } from "@engine/ato";

/**
 * Baseline scenario: EV, new, 5-year lease starting well before the transitional
 * FBT phase-out window, comfortably under both LCT thresholds. Numbers are
 * deliberately round so diffs in the generated snapshot are easy to reason about.
 */
export function baseEvInputs(): Inputs {
  const base: Inputs = {
    vehicleType: "EV",
    vehicleCondition: "New",
    usedCarFirstHeldAfterJul2022: false,
    usedCarLctNeverPayable: false,
    vehicleBaseValue: 60000,
    driveawayCost: 65000,
    estimatedMarketValueAtEnd: 26000,
    annualMileageKm: 15000,

    leaseDocFee: 450,
    leaseStartDate: "2026-08-02",
    leaseDurationYears: 5,
    residualValueExGst: 0, // recomputed below
    monthsDeferred: 0,

    totalTaxableIncome: 120000,
    homeLoanOffsetInterestRate: 6.1,

    vehicleLeasePerFn: 550,
    luxuryVehicleAdjPerFn: 0,
    financedAmountForInterestCalcExGst: 0, // recomputed below

    superFromPreNlIncome: "Yes",
    gstSavingPassedOn: "Yes",

    serviceMaintTyresAnnual: 600,
    saveShareAnnual: 0,
    registrationAnnual: 900,
    electricityAnnual: 820.5,
    fuelAnnual: 0,
    insuranceAnnual: 1300,
    managementFeesAnnual: 500,

    avgAudPerKwh: 0.3,
    avgWhPerKm: 170,
    overrideAnnualChargingExpense: undefined,

    compareWithCarLoan: false,
    carLoanInitialDeposit: 5000,
    carLoanInterestRatePct: 8,
    carLoanMonthlyFee: 15,

    compareWithCurrentCar: false,
    currentCarMarketValueNow: 20000,
    currentCarMarketValueAtEnd: 11000,

    currentServiceMaintTyresAnnual: 800,
    currentRegistrationAnnual: 900,
    currentFuelAnnual: 2200,
    currentInsuranceAnnual: 1000,
  };

  return withDerivedFinanceFields(base);
}

/**
 * Recomputes `financedAmountForInterestCalcExGst` and `residualValueExGst` from the
 * canonical engine formulas, mirroring the auto-sync effects in App.tsx (lines ~744-798).
 * Call this after changing any of: vehicleCondition, vehicleBaseValue, driveawayCost,
 * leaseDocFee, leaseDurationYears — matching v1's dependency list for those effects.
 */
export function withDerivedFinanceFields(i: Inputs): Inputs {
  const financed = financedAmountExGstFromInputs(i);
  const leaseYears = Math.max(1, Math.min(5, Math.round(i.leaseDurationYears)));
  const residual = Math.max(0, financed - i.leaseDocFee) * residualFractionForYears(leaseYears);
  return {
    ...i,
    financedAmountForInterestCalcExGst: financed,
    residualValueExGst: residual,
  };
}

export function withOverrides(base: Inputs, overrides: Partial<Inputs>): Inputs {
  return withDerivedFinanceFields({ ...base, ...overrides });
}
