import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { fortnightlyLeaseFromEffectiveAnnualRate } from "@engine/effectiveinterest";
import App from "../src/App";
import { diagnosePayment } from "../src/guided/checks";
import { annualOf, emptyDraft, luxAdjPerFn, paymentPerFn, toPerFn, type GuidedDraft, type Money } from "../src/guided/draft";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const m = (text: string): Money => ({ text, none: false, estimated: false });

// Weekly-pay quotes (SG Fleet, LeaseLab) and annual-only payments (Remunerator) seen in Nov 2026.
describe("weekly and yearly amounts", () => {
  test("convert to per fortnight", () => {
    expect(toPerFn(300, "perWeek")).toBe(600);
    expect(toPerFn(600, "perFn")).toBe(600);
    expect(toPerFn(1300, "perMonth")).toBe(600);
    expect(toPerFn(15600, "perYear")).toBe(600);
  });

  test("a weekly or yearly payment reaches the engine per fortnight", () => {
    const d = emptyDraft();
    d.payment = m("341.21");
    d.paymentBasis = "exGst";
    d.paymentPeriod = "perWeek";
    expect(paymentPerFn(d)).toBeCloseTo(682.42, 2);
    d.payment = m("16056");
    d.paymentPeriod = "perYear";
    expect(paymentPerFn(d)).toBeCloseTo(16056 / 26, 2);
  });

  test("the luxury adjustment follows the payment's period", () => {
    const d: GuidedDraft = { ...emptyDraft(), baseValue: m("85000"), driveaway: m("90000"), luxAdj: m("7.48") };
    d.paymentPeriod = "perWeek";
    expect(luxAdjPerFn(d)).toBeCloseTo(14.96, 2);
  });

  test("weekly running costs are ×52 a year", () => {
    const d = { ...emptyDraft(), runningPeriod: "perWeek" as const };
    expect(annualOf(d, m("17.06"))).toBeCloseTo(887.12, 2);
  });
});

describe("period slips", () => {
  const a = { financedExGst: 47636, residualExGst: 13400, leaseYears: 5, deferMonths: 2 };
  const fn = fortnightlyLeaseFromEffectiveAnnualRate({
    financedAmountExGst: a.financedExGst,
    residualValueExGst: a.residualExGst,
    leaseYears: 5,
    deferMonths: 2,
    effectiveAnnualRate: 0.08,
  });

  test("a weekly figure entered as fortnightly is spotted", () => {
    const diag = diagnosePayment(a, fn / 2, "perFn", "exGst");
    const f = diag.findings.find((x) => x.code === "payment_wrong_period");
    expect(f?.message).toMatch(/a weekly amount/);
  });

  test("a fortnightly figure entered as weekly is spotted", () => {
    const diag = diagnosePayment(a, fn, "perWeek", "exGst");
    expect(diag.findings.find((x) => x.code === "payment_wrong_period")?.message).toMatch(/a fortnightly amount/);
  });

  test("a monthly figure entered as fortnightly still suggests monthly first", () => {
    const diag = diagnosePayment(a, (fn * 26) / 12, "perFn", "exGst");
    expect(diag.findings.find((x) => x.code === "payment_wrong_period")?.message).toMatch(/a monthly amount/);
  });

  test("a weekly payment at a normal rate needs no warning", () => {
    const diag = diagnosePayment(a, fn / 2, "perWeek", "exGst");
    expect(diag.rate).toBeCloseTo(0.08, 3);
    expect(diag.findings.filter((x) => x.level === "warn" || x.level === "error")).toEqual([]);
  });
});

describe("Guided payment and running-cost screens", () => {
  function on(step: "payment" | "running", d: GuidedDraft) {
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step, visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
    );
    render(<App />);
  }

  test("offer Week and Year for the payment, and Per week for running costs", () => {
    const d = { ...emptyDraft(), hasQuote: true, vehicleType: "EV" as const, vehicleCondition: "New" as const };
    on("payment", d);
    expect(screen.getByText("How does your quote show the payment?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Per week/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Per year \(total\)/ })).toBeTruthy();
    cleanup();
    window.localStorage.clear();
    on("running", d);
    expect(screen.getByRole("button", { name: /^Per week/ })).toBeTruthy();
  });

  test("switching running costs from fortnightly to weekly halves what's typed", () => {
    const d = { ...emptyDraft(), hasQuote: true, vehicleType: "EV" as const, vehicleCondition: "New" as const, runningPeriod: "perFn" as const, service: m("40") };
    on("running", d);
    fireEvent.click(screen.getByRole("button", { name: /^Per week/ }));
    expect(screen.getByDisplayValue("20")).toBeTruthy();
  });
});
