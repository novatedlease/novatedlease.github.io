import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, type GuidedDraft, type Money } from "../src/guided/draft";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const m = (text: string): Money => ({ text, none: false, estimated: false });
const est = (text: string): Money => ({ text, none: false, estimated: true });

function onPayment(d: GuidedDraft) {
  window.localStorage.setItem(
    "nlc2-guided-draft-v3",
    JSON.stringify({ draft: d, step: "payment", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
  );
  render(<App />);
}

function luxuryDraft(): GuidedDraft {
  return {
    ...emptyDraft(),
    hasQuote: true,
    vehicleType: "EV",
    vehicleCondition: "New",
    baseValue: m("77139"),
    driveaway: m("81308"),
    leaseYears: 3,
    paymentPeriod: "perWeek",
    paymentBasis: "exGst",
    payment: m("341.21"),
  };
}

const diagram = () => document.querySelector(".gd-quote")!.textContent!;

describe("the quote diagram shows the reader's own figures", () => {
  test("luxury vehicle adjustment, in the payment's period", () => {
    onPayment({ ...luxuryDraft(), luxAdj: m("7.48") });
    expect(diagram()).toContain("$7.48 per week");
  });

  test("running costs: the total of what the reader typed, in their period", () => {
    onPayment({ ...luxuryDraft(), runningPeriod: "perFn", service: m("16.02"), rego: m("31.38"), insurance: m("121.76") });
    expect(diagram()).toContain("$169 per fortnight");
  });

  test("our typical estimates alone don't replace the example", () => {
    onPayment({ ...luxuryDraft(), runningPeriod: "perFn", service: est("20") });
    expect(diagram()).toContain("$148.00 per fortnight");
  });

  test("an EV's leftover fuel figure isn't counted", () => {
    onPayment({ ...luxuryDraft(), runningPeriod: "perYear", rego: m("900"), fuel: m("2000") });
    expect(diagram()).toContain("$900 per year");
  });
});

describe("copy", () => {
  test("the luxury adjustment mentions the names quotes use", () => {
    onPayment(luxuryDraft());
    expect(screen.getByText(/May be called a luxury levy or non-deductible depreciation/)).toBeTruthy();
  });
});
