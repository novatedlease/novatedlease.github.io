import { describe, expect, test } from "vitest";
import { decodeInputsFromUrlParam, encodeInputsToUrlParam } from "@engine/urlState";
import { advancedDefaultInputs, sentinelDefaultInputs } from "../src/state/defaultInputs";

/** The "first-year insurance already financed" field survives share links; older links read it as 0. */
describe("share links and the financed first-year insurance field", () => {
  test("a new link keeps it", () => {
    const withIns = { ...advancedDefaultInputs, insuranceFinancedFirstYear: 1537.92 };
    expect(decodeInputsFromUrlParam(encodeInputsToUrlParam(withIns), sentinelDefaultInputs).insuranceFinancedFirstYear).toBe(1537.92);
  });

  test("a link made before the field existed loads it as 0, so its result is unchanged", () => {
    const { insuranceFinancedFirstYear: _drop, ...older } = { ...advancedDefaultInputs, driveawayCost: 61234 };
    void _drop;
    const back = decodeInputsFromUrlParam(encodeInputsToUrlParam(older as typeof advancedDefaultInputs), sentinelDefaultInputs);
    expect(back.insuranceFinancedFirstYear).toBe(0);
    expect(back.driveawayCost).toBe(61234);
  });
});

describe("financed first-year insurance: every lease-side total takes it off", () => {
  test("Guided's take-home line matches Advanced's lease section (owner's 3-year EV example, Nov 2026)", async () => {
    const { computeDerived } = await import("@engine/derived");
    const { takeHomeReductionPerFn } = await import("../src/components/payImpact");
    const inputs = {
      ...advancedDefaultInputs,
      vehicleType: "EV" as const,
      vehicleBaseValue: 46990, driveawayCost: 46990, leaseDocFee: 2545.64, leaseDurationYears: 3, monthsDeferred: 2,
      leaseStartDate: "2026-12-15", totalTaxableIncome: 170000, homeLoanOffsetInterestRate: 6.2,
      serviceMaintTyresAnnual: 1012.96, registrationAnnual: 995.02, electricityAnnual: 745.94, fuelAnnual: 0,
      insuranceAnnual: 1916.1133, insuranceFinancedFirstYear: 1916.2, managementFeesAnnual: 163.54,
      financedAmountForInterestCalcExGst: 45263.82, residualValueExGst: 20026.28, vehicleLeasePerFn: 478.92,
    };
    const advancedPerPay = computeDerived(inputs).fyRows[0].takeHomeImpactPerPay;
    expect(advancedPerPay).toBeCloseTo(390.56, 2);
    expect(takeHomeReductionPerFn(inputs)!).toBeCloseTo(advancedPerPay, 2);
  });
});
