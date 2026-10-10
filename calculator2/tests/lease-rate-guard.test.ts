import { describe, expect, test } from "vitest";
import type { Inputs } from "@engine/types";
import { financedAmountExGstFromInputs, fortnightlyLeaseFromEffectiveAnnualRate } from "@engine/effectiveinterest";
import { computeLeaseGuardBounds, nextNudgeRate, nudgedVehicleLeasePerFn } from "../src/components/LeaseRateGuard";
import { baseEvInputs, withDerivedFinanceFields, withOverrides } from "./fixtures";

// Guard logic ported from calculator/src/App.tsx's "lease quote safeguard" — rejects
// a fortnightly lease payment implying an effective rate outside 0.1%-30% p.a.
describe("computeLeaseGuardBounds", () => {
  test("baseline fixture's own vehicleLeasePerFn falls within its own plausible bounds", () => {
    const inputs = baseEvInputs();
    const { minFn, maxFn, liveRate } = computeLeaseGuardBounds(inputs);
    expect(inputs.vehicleLeasePerFn).toBeGreaterThanOrEqual(minFn);
    expect(inputs.vehicleLeasePerFn).toBeLessThanOrEqual(maxFn);
    expect(liveRate).toBeGreaterThan(0.001);
    expect(liveRate).toBeLessThan(0.3);
  });

  test("a wildly low fortnightly payment (implying < 0.1% effective rate) falls outside the bounds", () => {
    const inputs = withOverrides(baseEvInputs(), { vehicleLeasePerFn: 1 });
    const { minFn } = computeLeaseGuardBounds(inputs);
    expect(inputs.vehicleLeasePerFn).toBeLessThan(minFn);
  });

  test("a wildly high fortnightly payment (implying > 30% effective rate) falls outside the bounds", () => {
    const inputs = withOverrides(baseEvInputs(), { vehicleLeasePerFn: 5000 });
    const { maxFn } = computeLeaseGuardBounds(inputs);
    expect(inputs.vehicleLeasePerFn).toBeGreaterThan(maxFn);
  });

  test("bounds widen for longer lease terms (more fortnights to amortise the same financed amount)", () => {
    const oneYear = computeLeaseGuardBounds(withOverrides(baseEvInputs(), { leaseDurationYears: 1 }));
    const fiveYear = computeLeaseGuardBounds(withOverrides(baseEvInputs(), { leaseDurationYears: 5 }));
    // A 1-year lease must repay the financed amount faster, so its minimum plausible
    // fortnightly payment is higher than a 5-year lease's.
    expect(oneYear.minFn).toBeGreaterThan(fiveYear.minFn);
  });
});

describe("rate-nudge arrows", () => {
  const liveRateOf = (i: Inputs) => computeLeaseGuardBounds(i).liveRate;
  const atRate = (i: Inputs, r: number) => ({ ...i, vehicleLeasePerFn: fortnightlyLeaseFromEffectiveAnnualRate({ financedAmountExGst: financedAmountExGstFromInputs(i), residualValueExGst: i.residualValueExGst, leaseYears: Math.round(i.leaseDurationYears), deferMonths: Math.round(i.monthsDeferred), effectiveAnnualRate: r }) });

  // Regression: on small loans the solver's tolerance left the rate just off the 0.1% grid
  // (e.g. 14.6002%), and stepping down landed back on the same rate (reader report, Oct 2026).
  test.each([15000, 25000, 60000])("every step moves 0.1%% in both directions (drive-away %i)", (price) => {
    for (const dir of [-1, 1] as const) {
      let inputs: Inputs = atRate(withDerivedFinanceFields(withOverrides(baseEvInputs(), { driveawayCost: price, vehicleBaseValue: price })), dir < 0 ? 0.15 : 0.03);
      for (let k = 0; k < 100; k++) {
        const before = liveRateOf(inputs);
        inputs = { ...inputs, vehicleLeasePerFn: nudgedVehicleLeasePerFn(inputs, dir)! };
        expect(liveRateOf(inputs) - before).toBeCloseTo(dir * 0.001, 4);
      }
    }
  });

  test("a luxury vehicle adjustment does not change the step size", () => {
    const inputs = atRate(withOverrides(baseEvInputs(), { luxuryVehicleAdjPerFn: 30 }), 0.1);
    const next = { ...inputs, vehicleLeasePerFn: nudgedVehicleLeasePerFn(inputs, -1)! };
    expect(liveRateOf(next)).toBeCloseTo(0.099, 5);
  });

  test("an off-grid rate steps to the adjacent grid point", () => {
    expect(nextNudgeRate(0.09834, -1)).toBeCloseTo(0.098, 10);
    expect(nextNudgeRate(0.09834, 1)).toBeCloseTo(0.099, 10);
    expect(nextNudgeRate(0.098004, -1)).toBeCloseTo(0.097, 10);
    // Displays as 9.80%, so up goes to 9.9%.
    expect(nextNudgeRate(0.097996, 1)).toBeCloseTo(0.099, 10);
  });
});
