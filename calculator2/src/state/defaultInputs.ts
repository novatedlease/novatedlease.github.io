import type { Inputs } from "@engine/types";
import { financedAmountExGstFromInputs } from "@engine/effectiveinterest";

function estMarketValueFromDriveaway(driveawayCost: number): number {
  return Math.round((driveawayCost * 0.4) / 1000) * 1000;
}

/**
 * Advanced-mode default inputs — mirrors calculator/src/App.tsx's `defaultInputs`
 * (same values) so an untouched Advanced-mode form matches v1's starting point.
 */
export const advancedDefaultInputs: Inputs = (() => {
  const base: Inputs = {
    vehicleType: "EV",
    vehicleCondition: "New",
    usedCarFirstHeldAfterJul2022: false,
    usedCarLctNeverPayable: false,
    vehicleBaseValue: 75500,
    driveawayCost: 81422.5,
    estimatedMarketValueAtEnd: estMarketValueFromDriveaway(81422.5),
    annualMileageKm: 15000,

    leaseDocFee: 450,
    leaseStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    leaseDurationYears: 5,
    residualValueExGst: 0,
    monthsDeferred: 2,

    totalTaxableIncome: 300000,
    homeLoanOffsetInterestRate: 6.1,

    vehicleLeasePerFn: 597.47,
    luxuryVehicleAdjPerFn: 0,
    financedAmountForInterestCalcExGst: 0,

    superFromPreNlIncome: "Yes",
    gstSavingPassedOn: "Yes",

    serviceMaintTyresAnnual: 100,
    saveShareAnnual: 0,
    registrationAnnual: 984.88,
    electricityAnnual: 820.5,
    fuelAnnual: 2362.5,
    insuranceAnnual: 1300,
    managementFeesAnnual: 516.88,

    avgAudPerKwh: 0.15,
    avgWhPerKm: 165,
    overrideAnnualChargingExpense: undefined,

    compareWithCarLoan: false,
    carLoanInitialDeposit: 10000,
    carLoanInterestRatePct: 6.0,
    carLoanMonthlyFee: 25,

    compareWithCurrentCar: false,
    currentCarMarketValueNow: 25000,
    currentCarMarketValueAtEnd: 14000,

    currentServiceMaintTyresAnnual: 800,
    currentRegistrationAnnual: 900,
    currentFuelAnnual: 2362.5,
    currentInsuranceAnnual: 1000,
  };

  return {
    ...base,
    financedAmountForInterestCalcExGst: financedAmountExGstFromInputs(base),
  };
})();
