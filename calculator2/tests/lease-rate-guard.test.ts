import { describe, expect, test } from "vitest";
import { computeLeaseGuardBounds } from "../src/components/LeaseRateGuard";
import { baseEvInputs, withOverrides } from "./fixtures";

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
