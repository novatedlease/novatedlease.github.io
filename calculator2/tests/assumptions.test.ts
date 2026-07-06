import { describe, expect, test } from "vitest";
import {
  ASSUMED_EFFECTIVE_RATE,
  defaultSimpleModeAnswers,
  deriveInputsFromSimpleAnswers,
  evElectricityClaimAnnual,
  nonEvFuelAnnual,
  resolveAutoFields,
} from "../src/assumptions";
import { advancedDefaultInputs, sentinelDefaultInputs } from "../src/state/defaultInputs";
import { effectiveAnnualRateFromFortnightlyLease, financedAmountExGstFromInputs } from "@engine/effectiveinterest";
import { residualFractionForYears } from "@engine/ato";
import { getInputsFromLocationSearch } from "@engine/urlState";

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

describe("sentinelDefaultInputs", () => {
  test("zeroes exactly the 5 auto-derivable fields, leaving everything else matching advancedDefaultInputs", () => {
    const AUTO_FIELDS = ["financedAmountForInterestCalcExGst", "residualValueExGst", "estimatedMarketValueAtEnd", "electricityAnnual", "fuelAnnual"] as const;
    for (const f of AUTO_FIELDS) expect(sentinelDefaultInputs[f]).toBe(0);

    for (const key of Object.keys(advancedDefaultInputs) as (keyof typeof advancedDefaultInputs)[]) {
      if ((AUTO_FIELDS as readonly string[]).includes(key)) continue;
      expect(sentinelDefaultInputs[key]).toEqual(advancedDefaultInputs[key]);
    }
  });
});

describe("resolveAutoFields", () => {
  test("recomputes a 0-valued residual/financed amount/market value from the rest of the scenario", () => {
    const partial = { ...sentinelDefaultInputs, driveawayCost: 81422.5, vehicleBaseValue: 75500, leaseDurationYears: 5, leaseDocFee: 450 };
    const resolved = resolveAutoFields(partial);

    const financed = financedAmountExGstFromInputs(resolved);
    const expectedResidual = Math.max(0, financed - resolved.leaseDocFee) * residualFractionForYears(5);

    expect(resolved.financedAmountForInterestCalcExGst).toBeGreaterThan(0);
    expect(resolved.residualValueExGst).toBeCloseTo(expectedResidual, 2);
    expect(resolved.estimatedMarketValueAtEnd).toBeGreaterThan(0);
  });

  test("leaves already-set (non-zero) fields untouched, respecting an explicit user/quote value", () => {
    const customised = { ...advancedDefaultInputs, residualValueExGst: 12345 };
    expect(resolveAutoFields(customised).residualValueExGst).toBe(12345);
  });

  /**
   * Regression test for the exact bug reported in production: the "Open this example" link
   * on ev-nl-vs-keeping-petrol-car.md omits residualValueExGst entirely. Decoding it with
   * advancedDefaultInputs as the merge base silently inherited that unrelated scenario's own
   * residual (was $16,745.02) instead of the correct $21,117.05 for THIS link's own financed
   * amount — because advancedDefaultInputs no longer leaves residualValueExGst at the 0
   * sentinel once it became Simple-mode-derived (a real, non-zero value for its own scenario).
   */
  test("decoding a share link that omits residualValueExGst recomputes it correctly, not the calculator's unrelated current default", () => {
    const SHARE_LINK_C =
      "eyJ2IjoxLCJpbnB1dHMiOnsidmVoaWNsZVR5cGUiOiJFViIsInZlaGljbGVDb25kaXRpb24iOiJOZXciLCJ1c2VkQ2FyRmlyc3RIZWxkQWZ0ZXJKdWwyMDIyIjpmYWxzZSwidXNlZENhckxjdE5ldmVyUGF5YWJsZSI6ZmFsc2UsInZlaGljbGVCYXNlVmFsdWUiOjc1NTAwLCJkcml2ZWF3YXlDb3N0Ijo4MTQyMi41LCJlc3RpbWF0ZWRNYXJrZXRWYWx1ZUF0RW5kIjozMzAwMCwiYW5udWFsTWlsZWFnZUttIjoxNTAwMCwibGVhc2VEb2NGZWUiOjQ1MCwibGVhc2VTdGFydERhdGUiOiIyMDI2LTA0LTE3IiwibGVhc2VEdXJhdGlvblllYXJzIjo1LCJtb250aHNEZWZlcnJlZCI6MiwidG90YWxUYXhhYmxlSW5jb21lIjozMDAwMDAsImhvbWVMb2FuT2Zmc2V0SW50ZXJlc3RSYXRlIjo2LjEsInZlaGljbGVMZWFzZVBlckZuIjo1OTcuNDcsImx1eHVyeVZlaGljbGVBZGpQZXJGbiI6MCwiZmluYW5jZWRBbW91bnRGb3JJbnRlcmVzdENhbGNFeEdzdCI6NzU1MzguNSwic3VwZXJGcm9tUHJlTmxJbmNvbWUiOiJZZXMiLCJnc3RTYXZpbmdQYXNzZWRPbiI6IlllcyIsInNlcnZpY2VNYWludFR5cmVzQW5udWFsIjoxMDAsInNhdmVTaGFyZUFubnVhbCI6MCwicmVnaXN0cmF0aW9uQW5udWFsIjo5ODQuODgsImVsZWN0cmljaXR5QW5udWFsIjo2MzAsImZ1ZWxBbm51YWwiOjIzNjIuNSwiaW5zdXJhbmNlQW5udWFsIjoxMzAwLCJtYW5hZ2VtZW50RmVlc0FubnVhbCI6NTE2Ljg4LCJhdmdBdWRQZXJLd2giOjAuMTUsImF2Z1doUGVyS20iOjE2NSwiY29tcGFyZVdpdGhDYXJMb2FuIjpmYWxzZSwiY2FyTG9hbkluaXRpYWxEZXBvc2l0IjoxMDAwMCwiY2FyTG9hbkludGVyZXN0UmF0ZVBjdCI6NiwiY2FyTG9hbk1vbnRobHlGZWUiOjI1LCJjb21wYXJlV2l0aEN1cnJlbnRDYXIiOnRydWUsImN1cnJlbnRDYXJNYXJrZXRWYWx1ZU5vdyI6MjUwMDAsImN1cnJlbnRDYXJNYXJrZXRWYWx1ZUF0RW5kIjoxNDAwMCwiY3VycmVudFNlcnZpY2VNYWludFR5cmVzQW5udWFsIjo4MDAsImN1cnJlbnRSZWdpc3RyYXRpb25Bbm51YWwiOjkwMCwiY3VycmVudEZ1ZWxBbm51YWwiOjIzNjIuNSwiY3VycmVudEluc3VyYW5jZUFubnVhbCI6MTAwMH19";

    const decoded = getInputsFromLocationSearch(`?c=${SHARE_LINK_C}`, sentinelDefaultInputs);
    const resolved = resolveAutoFields(decoded);

    // Residual is derived from a freshly-recomputed financed amount (vehicleBaseValue/
    // driveawayCost/condition) — matching App.tsx's own residual auto-sync effect — not
    // from this link's own stored financedAmountForInterestCalcExGst field.
    const freshFinanced = financedAmountExGstFromInputs(decoded);
    const expectedResidual = Math.max(0, freshFinanced - decoded.leaseDocFee) * residualFractionForYears(5);
    expect(resolved.residualValueExGst).toBeCloseTo(expectedResidual, 2);
    // The old, buggy behaviour this replaces (today's unrelated default residual) — must NOT match.
    expect(resolved.residualValueExGst).not.toBeCloseTo(16745.02, 1);
  });
});
