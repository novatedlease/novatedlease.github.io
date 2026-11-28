import { describe, expect, test } from "vitest";
import { computeLeaseGuardBounds, nudgedVehicleLeasePerFn } from "../src/components/LeaseRateGuard";
import { financePaymentExGstPerFn, leaseRates } from "../src/financeRate";
import { baseEvInputs, withOverrides } from "./fixtures";

// Smart Leasing quote 8861960 (Nov 2026): FBT base $63,638.60, 36 months, 2 deferred, residual
// 46.88% = $28,110.50 ex GST, "Lease payment" $659.93 a fortnight in a "Running Cost Budgets (inc
// GST)" table with no GST credit. After the 34/36 correction the reader pays $623.27 inc GST.
const smartQuote = (gstSavingPassedOn: "Yes" | "No", vehicleLeasePerFn: number) =>
  withOverrides(baseEvInputs(), {
    vehicleBaseValue: 63638.6,
    driveawayCost: 28110.5 / 0.4688 + 63638.6 / 11,
    leaseDocFee: 1500, // not printed on the crop; ~$1,500 gives the 7.9% the owner got
    leaseDurationYears: 3,
    monthsDeferred: 2,
    residualValueExGst: 28110.5,
    gstSavingPassedOn,
    vehicleLeasePerFn,
  });

describe("finance payment when GST isn't passed on", () => {
  test("the rate comes from the ex GST payment; the second rate from the inc GST one", () => {
    const i = smartQuote("No", 623.27);
    expect(financePaymentExGstPerFn(i)).toBeCloseTo(566.61, 2);
    const { rate, asIfPassedOn } = leaseRates(i);
    expect(rate * 100).toBeCloseTo(7.9, 0);
    expect(asIfPassedOn! * 100).toBeCloseTo(11.0, 0);
    // Same as an employer that passes GST on with $566.61 ex GST.
    expect(rate).toBeCloseTo(leaseRates(smartQuote("Yes", 566.61)).rate, 5);
    expect(computeLeaseGuardBounds(i).liveRate).toBeCloseTo(rate, 6);
  });

  test("no second rate when GST is passed on", () => {
    expect(leaseRates(smartQuote("Yes", 566.61)).asIfPassedOn).toBeNull();
  });

  test("guard bounds and the rate nudge stay inc GST, like the field", () => {
    const no = smartQuote("No", 623.27);
    const yes = smartQuote("Yes", 566.61);
    expect(computeLeaseGuardBounds(no).maxFn).toBeCloseTo(computeLeaseGuardBounds(yes).maxFn * 1.1, 6);
    expect(nudgedVehicleLeasePerFn(no, 1)!).toBeCloseTo(nudgedVehicleLeasePerFn(yes, 1)! * 1.1, 6);
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);
import { LeaseRateGuard } from "../src/components/LeaseRateGuard";

describe("Advanced finance box when GST isn't passed on", () => {
  test("labels the field inc GST and shows both rates", () => {
    render(<LeaseRateGuard inputs={smartQuote("No", 623.27)} setInputs={() => {}} vehicleLeasePeriodMode="perFn" onVehicleLeasePeriodModeChange={() => {}} />);
    expect(screen.getByText("Vehicle finance (inc GST)")).toBeTruthy();
    expect(screen.getByText("7.87%")).toBeTruthy();
    expect(screen.getByText("11.00%")).toBeTruthy();
    expect(screen.getByText(/GST not passed on: you pay what a/)).toBeTruthy();
  });

  test("no second line when GST is passed on", () => {
    render(<LeaseRateGuard inputs={smartQuote("Yes", 566.61)} setInputs={() => {}} vehicleLeasePeriodMode="perFn" onVehicleLeasePeriodModeChange={() => {}} />);
    expect(screen.queryByText(/GST not passed on: you pay/)).toBeNull();
  });
});
