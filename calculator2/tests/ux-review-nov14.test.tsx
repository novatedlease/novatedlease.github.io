// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, type GuidedDraft, type Money } from "../src/guided/draft";
import { longDate, residualAsTyped } from "../src/guided/answerText";
import { checkBaseValueAtCap } from "../src/guided/checks";

/** The owner's decisions on the 14 Nov 2026 UX review (UX_REVIEW_2026-11-14_DECISIONS.md). */

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

const m = (text: string): Money => ({ text, none: false, estimated: false });

function partialQuote(): GuidedDraft {
  const d = emptyDraft();
  d.hasQuote = true;
  d.vehicleType = "Non-EV";
  d.vehicleCondition = "New";
  d.compareLoan = false;
  d.compareCurrent = false;
  d.leaseStartDate = "2026-12-15";
  d.baseValue = m("56000");
  d.driveaway = m("60000");
  d.leaseYears = 5;
  return d;
}

function seedReview(d: GuidedDraft) {
  window.localStorage.setItem(
    "nlc2-guided-draft-v3",
    JSON.stringify({
      draft: d,
      step: "review",
      visited: ["intro", "car", "compare", "price", "lease", "payment", "running", "you", "review"],
    }),
  );
}

/** The answers list as label → value. */
function answers(): Record<string, string> {
  const rows = [...document.querySelectorAll(".gd-answers__row")];
  return Object.fromEntries(rows.map((r) => [r.querySelector("dt")!.textContent!, r.querySelector("dd")!.textContent!]));
}

describe("UX 5: the answers list shows what the reader typed", () => {
  test("dates read as 15 Dec 2026", () => {
    expect(longDate("2026-12-15")).toBe("15 Dec 2026");
    expect(longDate("2027-04-01")).toBe("1 Apr 2027");
    expect(longDate("")).toBeNull();
  });

  test("the residual keeps the figure and GST answer from the quote", () => {
    const d = partialQuote();
    d.residual = m("16860");
    d.residualBasis = "incGst";
    expect(residualAsTyped(d)).toBe("$16,860 including GST");
    d.residualBasis = "exGst";
    expect(residualAsTyped(d)).toBe("$16,860 excluding GST");
    d.residualBasis = "unknown";
    expect(residualAsTyped(d)).toMatch(/^\$16,860, GST not stated \(we read it as (including|excluding) GST\)$/);
    d.residual = m("");
    expect(residualAsTyped(d)).toMatch(/^Not on your quote: the ATO minimum, \$[\d,]+ excluding GST$/);
  });

  test("on the review screen", () => {
    const d = partialQuote();
    d.residual = m("16860");
    d.residualBasis = "incGst";
    seedReview(d);
    render(<App />);
    const a = answers();
    expect(a["Lease start"]).toBe("15 Dec 2026");
    expect(a["Residual"]).toBe("$16,860 including GST");
    expect(a["Residual (ex GST)"]).toBeUndefined();
  });
});

describe("UX 6: gaps read 'Not answered', never $0 or ?", () => {
  test("a partial draft on the review screen", () => {
    const d = partialQuote();
    d.vehicleType = null;
    d.baseValue = m("");
    seedReview(d);
    render(<App />);
    const a = answers();
    expect(a["Car"]).toBe("New (type not answered)");
    expect(a["FBT base value"]).toBe("Not answered");
    expect(a["Term"]).toBe("5 years, first payment not answered");
    expect(a["Documentation fee"]).toBe("Not answered");
    expect(a["Lease payment"]).toBe("Not answered");
    expect(a["Taxable income"]).toBe("Not answered");
    expect(Object.values(a).some((v) => v.includes("?") || v === "$0")).toBe(false);
    expect(document.querySelectorAll(".gd-answers__na").length).toBeGreaterThanOrEqual(4);
  });

  test("a ticked 'no documentation fee' still shows $0", () => {
    const d = partialQuote();
    d.docFee = { text: "", none: true, estimated: false };
    seedReview(d);
    render(<App />);
    expect(answers()["Documentation fee"]).toBe("$0");
  });
});

describe("UX 23: a base value at 11 × the GST cap", () => {
  test("warns within $30 of either cap, not elsewhere", () => {
    for (const v of [69674, 69883, 69660, 69900]) expect(checkBaseValueAtCap(v)[0]?.code).toBe("base_value_at_gst_cap");
    for (const v of [69600, 69950, 56000, null]) expect(checkBaseValueAtCap(v)).toEqual([]);
    expect(checkBaseValueAtCap(69883)[0].level).toBe("warn");
  });
});
