import type { Inputs } from "@engine/types";
import {
  financedAmountExGstFromInputs,
  fortnightlyLeaseFromEffectiveAnnualRate,
} from "@engine/effectiveinterest";
import { residualFractionForYears } from "@engine/ato";

/**
 * Market-typical effective interest rate used to derive a plausible fortnightly
 * lease payment when the user doesn't have a real quote. Documented in the
 * calculator's own FAQ as a common market range (8-12% p.a.); 9.5% is the
 * midpoint. Advanced mode lets the user override this via the real payment.
 */
export const ASSUMED_EFFECTIVE_RATE = 0.095;

export type SimpleModeAnswers = {
  vehicleType: "EV" | "Non-EV";
  driveawayCost: number;
  totalTaxableIncome: number;
  leaseDurationYears: number;
  annualMileageKm: number;
  hasHomeLoanOffset: boolean;
  homeLoanOffsetInterestRate: number;
};

export function defaultSimpleModeAnswers(): SimpleModeAnswers {
  return {
    vehicleType: "EV",
    driveawayCost: 65000,
    totalTaxableIncome: 110000,
    leaseDurationYears: 5,
    annualMileageKm: 12000,
    hasHomeLoanOffset: false,
    homeLoanOffsetInterestRate: 6.0,
  };
}

export type Assumption = {
  /** Inputs field this assumption sets, for the "edit in Advanced" deep link. */
  field: keyof Inputs;
  label: string;
  value: string;
};

export type SimpleModeResult = {
  inputs: Inputs;
  assumptions: Assumption[];
  leaseStartDate: string;
};

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

function isoDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Derives a full engine Inputs object (plus a human-readable list of the
 * assumptions made) from the small Simple-mode question set. Every derived
 * value flows through the same engine as Advanced mode — there is no
 * separate simplified calculation path.
 */
export function deriveInputsFromSimpleAnswers(answers: SimpleModeAnswers): SimpleModeResult {
  const leaseStartDate = isoDatePlusDays(30);
  const isEv = answers.vehicleType === "EV";
  const leaseYears = Math.max(1, Math.min(5, Math.round(answers.leaseDurationYears)));

  // Vehicle dutiable/FBT base value from drive-away price: drive-away typically
  // includes ~8% on top of the dutiable/base value (stamp duty, rego, dealer/CTP
  // fees). This is a rough heuristic — Advanced mode lets the user enter the
  // real figure from a quote.
  const vehicleBaseValue = Math.round((answers.driveawayCost / 1.08) / 100) * 100;

  // 5-year market value estimate, same rule-of-thumb as v1 (App.tsx
  // estMarketValueFromDriveaway): ~40% of drive-away price. The engine
  // interpolates this down for shorter terms.
  const estimatedMarketValueAtEnd = Math.round((answers.driveawayCost * 0.4) / 1000) * 1000;

  const leaseDocFee = 450;

  // Running-cost heuristics, scaled by annual km. Deliberately conservative
  // round numbers — flagged to the user as assumptions, not hidden.
  const serviceMaintTyresAnnual = Math.round(
    (isEv ? 500 + answers.annualMileageKm * 0.015 : 700 + answers.annualMileageKm * 0.025) / 10
  ) * 10;
  const registrationAnnual = 900;
  const insuranceAnnual = 1300;
  const managementFeesAnnual = 500;

  const avgAudPerKwh = 0.3;
  const avgWhPerKm = 170;
  const electricityAnnual = isEv
    ? Math.round(((answers.annualMileageKm * avgWhPerKm) / 1000) * avgAudPerKwh)
    : 0;
  // ~9 L/100km at ~$1.85/L — a common mid-size-car assumption.
  const fuelAnnual = isEv ? 0 : Math.round(answers.annualMileageKm * 0.09 * 1.85);

  const partialInputs: Omit<Inputs, "financedAmountForInterestCalcExGst" | "residualValueExGst" | "vehicleLeasePerFn"> = {
    vehicleType: answers.vehicleType,
    vehicleCondition: "New",
    usedCarFirstHeldAfterJul2022: false,
    usedCarLctNeverPayable: false,
    vehicleBaseValue,
    driveawayCost: answers.driveawayCost,
    estimatedMarketValueAtEnd,
    annualMileageKm: answers.annualMileageKm,

    leaseDocFee,
    leaseStartDate,
    leaseDurationYears: leaseYears,
    monthsDeferred: 0,

    totalTaxableIncome: answers.totalTaxableIncome,
    homeLoanOffsetInterestRate: answers.hasHomeLoanOffset ? answers.homeLoanOffsetInterestRate : 0,

    luxuryVehicleAdjPerFn: 0,

    superFromPreNlIncome: "Yes",
    gstSavingPassedOn: "Yes",

    serviceMaintTyresAnnual,
    saveShareAnnual: 0,
    registrationAnnual,
    electricityAnnual,
    fuelAnnual,
    insuranceAnnual,
    managementFeesAnnual,

    avgAudPerKwh,
    avgWhPerKm,

    compareWithCurrentCar: false,
    currentCarMarketValueNow: 0,
    currentCarMarketValueAtEnd: 0,
    currentServiceMaintTyresAnnual: 0,
    currentRegistrationAnnual: 0,
    currentFuelAnnual: 0,
    currentInsuranceAnnual: 0,

    compareWithCarLoan: false,
    carLoanInitialDeposit: 0,
    carLoanInterestRatePct: 8,
    carLoanMonthlyFee: 0,
  };

  const financedAmountForInterestCalcExGst = financedAmountExGstFromInputs(partialInputs as Inputs);
  const residualValueExGst =
    Math.max(0, financedAmountForInterestCalcExGst - leaseDocFee) * residualFractionForYears(leaseYears);

  const vehicleLeasePerFn = fortnightlyLeaseFromEffectiveAnnualRate({
    financedAmountExGst: financedAmountForInterestCalcExGst,
    residualValueExGst,
    leaseYears,
    deferMonths: 0,
    effectiveAnnualRate: ASSUMED_EFFECTIVE_RATE,
  });

  const inputs: Inputs = {
    ...partialInputs,
    financedAmountForInterestCalcExGst,
    residualValueExGst,
    vehicleLeasePerFn,
  };

  const assumptions: Assumption[] = [
    {
      field: "leaseStartDate",
      label: "Lease start date",
      value: `${leaseStartDate} (30 days from today)`,
    },
    {
      field: "vehicleBaseValue",
      label: "Vehicle dutiable / FBT base value",
      value: `${fmtMoney(vehicleBaseValue)} (estimated from drive-away price)`,
    },
    {
      field: "estimatedMarketValueAtEnd",
      label: "Estimated market value after 5 years",
      value: `${fmtMoney(estimatedMarketValueAtEnd)} (~40% of drive-away price)`,
    },
    {
      field: "vehicleLeasePerFn",
      label: "Fortnightly lease payment",
      value: `${vehicleLeasePerFn.toFixed(2)}/fortnight (assumes a ${(ASSUMED_EFFECTIVE_RATE * 100).toFixed(1)}% p.a. effective interest rate — get a real quote to check this)`,
    },
    {
      field: "residualValueExGst",
      label: "Residual value",
      value: `${fmtMoney(residualValueExGst)} (ATO minimum residual for a ${leaseYears}-year term)`,
    },
    {
      field: "leaseDocFee",
      label: "Lease documentation fee",
      value: fmtMoney(leaseDocFee),
    },
    {
      field: "serviceMaintTyresAnnual",
      label: "Service / maintenance / tyres",
      value: `${fmtMoney(serviceMaintTyresAnnual)}/year (estimated from annual km)`,
    },
    {
      field: "registrationAnnual",
      label: "Registration",
      value: `${fmtMoney(registrationAnnual)}/year (flat assumption — varies by state)`,
    },
    {
      field: "insuranceAnnual",
      label: "Insurance",
      value: `${fmtMoney(insuranceAnnual)}/year (flat assumption — varies a lot by vehicle/driver)`,
    },
    {
      field: "managementFeesAnnual",
      label: "Management fees",
      value: `${fmtMoney(managementFeesAnnual)}/year`,
    },
    isEv
      ? {
          field: "electricityAnnual",
          label: "Electricity (packaged)",
          value: `${fmtMoney(electricityAnnual)}/year (${avgWhPerKm} Wh/km @ $${avgAudPerKwh.toFixed(2)}/kWh)`,
        }
      : {
          field: "fuelAnnual",
          label: "Fuel",
          value: `${fmtMoney(fuelAnnual)}/year (~9 L/100km @ ~$1.85/L)`,
        },
    {
      field: "superFromPreNlIncome",
      label: "Super Guarantee basis",
      value: "Assumed calculated on pre-NL income (most common)",
    },
    {
      field: "gstSavingPassedOn",
      label: "GST saving",
      value: "Assumed passed on by your provider",
    },
  ];

  return { inputs, assumptions, leaseStartDate };
}
