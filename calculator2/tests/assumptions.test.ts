import { describe, expect, test } from "vitest";
import {
  ASSUMED_EFFECTIVE_RATE,
  defaultSimpleModeAnswers,
  deriveInputsFromSimpleAnswers,
  evElectricityClaimAnnual,
  nonEvFuelAnnual,
} from "../src/assumptions";
import { effectiveAnnualRateFromFortnightlyLease } from "@engine/effectiveinterest";

/**
 * Direct tests for the Simple-mode derivation layer — previously the least-tested
 * part of the codebase (engine-level tests exercise a hand-written fixture, not
 * this derivation function, which is how the electricity claim/actual-cost
 * conflation bug went unnoticed for a while).
 */
describe("evElectricityClaimAnnual / nonEvFuelAnnual (shared formulas)", () => {
  test("electricity claim is annualMileageKm x ATO 5.47c/km rate, unrounded", () => {
    expect(evElectricityClaimAnnual(15000)).toBeCloseTo(820.5, 6);
    expect(evElectricityClaimAnnual(0)).toBe(0);
  });

  test("fuel estimate is ~6L/100km @ $1.80/L, rounded to the nearest dollar", () => {
    expect(nonEvFuelAnnual(15000)).toBe(1620);
    expect(nonEvFuelAnnual(0)).toBe(0);
  });
});

describe("deriveInputsFromSimpleAnswers", () => {
  test("EV default scenario: electricity claim uses the ATO rate, NOT the actual-cost (Wh/km x $/kWh) model", () => {
    const { inputs } = deriveInputsFromSimpleAnswers(defaultSimpleModeAnswers());

    expect(inputs.vehicleType).toBe("EV");
    expect(inputs.electricityAnnual).toBeCloseTo(evElectricityClaimAnnual(inputs.annualMileageKm), 6);

    // Regression guard for the exact bug fixed this session: the claim must not
    // equal the separate "actual out-of-pocket cost" model that also lives on
    // these inputs (avgWhPerKm x avgAudPerKwh) — if it did, "claim - actual"
    // (the NL electricity gain/loss line) would silently collapse to ~$0.
    const actualCostModel = (inputs.annualMileageKm * inputs.avgWhPerKm) / 1000 * inputs.avgAudPerKwh;
    expect(inputs.electricityAnnual).not.toBeCloseTo(actualCostModel, 0);

    // Non-EV field should be untouched/zeroed while in EV mode.
    expect(inputs.fuelAnnual).toBe(0);
  });

  test("Non-EV scenario: fuel uses the shared estimate, electricity is zeroed", () => {
    const { inputs } = deriveInputsFromSimpleAnswers({ ...defaultSimpleModeAnswers(), vehicleType: "Non-EV" });

    expect(inputs.fuelAnnual).toBe(nonEvFuelAnnual(inputs.annualMileageKm));
    expect(inputs.electricityAnnual).toBe(0);
  });

  test("assumes a 2-month deferred first payment, matching Advanced mode's default", () => {
    const { inputs } = deriveInputsFromSimpleAnswers(defaultSimpleModeAnswers());
    expect(inputs.monthsDeferred).toBe(2);
  });

  test("the back-solved fortnightly lease payment implies ASSUMED_EFFECTIVE_RATE", () => {
    const { inputs } = deriveInputsFromSimpleAnswers(defaultSimpleModeAnswers());
    const impliedRate = effectiveAnnualRateFromFortnightlyLease({
      financedAmountExGst: inputs.financedAmountForInterestCalcExGst,
      residualValueExGst: inputs.residualValueExGst,
      leaseYears: inputs.leaseDurationYears,
      deferMonths: inputs.monthsDeferred,
      fortnightlyLeasePayment: inputs.vehicleLeasePerFn,
    });
    expect(impliedRate).toBeCloseTo(ASSUMED_EFFECTIVE_RATE, 3);
  });

  test("lease duration is clamped to 1-5 whole years", () => {
    expect(deriveInputsFromSimpleAnswers({ ...defaultSimpleModeAnswers(), leaseDurationYears: 7 }).inputs.leaseDurationYears).toBe(5);
    expect(deriveInputsFromSimpleAnswers({ ...defaultSimpleModeAnswers(), leaseDurationYears: 0 }).inputs.leaseDurationYears).toBe(1);
    expect(deriveInputsFromSimpleAnswers({ ...defaultSimpleModeAnswers(), leaseDurationYears: 3.6 }).inputs.leaseDurationYears).toBe(4);
  });

  test("home loan offset rate is zeroed when the user says they have no offset account", () => {
    const { inputs } = deriveInputsFromSimpleAnswers({ ...defaultSimpleModeAnswers(), hasHomeLoanOffset: false, homeLoanOffsetInterestRate: 6.1 });
    expect(inputs.homeLoanOffsetInterestRate).toBe(0);
  });

  test("'compare with' pathway fields start from v1's non-zero starter figures, not all-zero", () => {
    const { inputs } = deriveInputsFromSimpleAnswers(defaultSimpleModeAnswers());
    expect(inputs.carLoanInitialDeposit).toBeGreaterThan(0);
    expect(inputs.carLoanMonthlyFee).toBeGreaterThan(0);
    expect(inputs.currentCarMarketValueNow).toBeGreaterThan(0);
    expect(inputs.currentCarMarketValueAtEnd).toBeGreaterThan(0);
    expect(inputs.currentServiceMaintTyresAnnual).toBeGreaterThan(0);
    expect(inputs.currentRegistrationAnnual).toBeGreaterThan(0);
    expect(inputs.currentFuelAnnual).toBeGreaterThan(0);
    expect(inputs.currentInsuranceAnnual).toBeGreaterThan(0);
  });

  test("assumptions list surfaces exactly one of electricityAnnual/fuelAnnual, matching vehicle type", () => {
    const evResult = deriveInputsFromSimpleAnswers(defaultSimpleModeAnswers());
    const evFields = evResult.assumptions.map((a) => a.field);
    expect(evFields).toContain("electricityAnnual");
    expect(evFields).not.toContain("fuelAnnual");

    const iceResult = deriveInputsFromSimpleAnswers({ ...defaultSimpleModeAnswers(), vehicleType: "Non-EV" });
    const iceFields = iceResult.assumptions.map((a) => a.field);
    expect(iceFields).toContain("fuelAnnual");
    expect(iceFields).not.toContain("electricityAnnual");
  });
});
