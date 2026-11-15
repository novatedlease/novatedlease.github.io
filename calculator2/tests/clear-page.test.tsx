import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { STEP_DRAFT_FIELDS, clearStep, emptyDraft, type GuidedDraft, type Money } from "../src/guided/draft";

/** "Clear this page" resets one screen's answers; "Start over" still clears everything. */

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

const m = (text: string): Money => ({ text, none: false, estimated: false });

function quote(): GuidedDraft {
  const d = emptyDraft();
  d.hasQuote = true;
  d.provider = "smartleasing";
  d.smartMillarx = true;
  d.vehicleType = "Non-EV";
  d.vehicleCondition = "New";
  d.compareLoan = false;
  d.compareCurrent = false;
  d.leaseStartDate = "2026-12-15";
  d.baseValue = m("56000");
  d.driveaway = m("60000");
  d.leaseYears = 5;
  d.monthsDeferred = 2;
  d.docFee = m("500");
  d.residual = m("16860");
  d.residualBasis = "incGst";
  d.payment = m("480.00");
  d.paymentPeriod = "perFn";
  d.paymentBasis = "exGst";
  d.paymentCorrected = true;
  return d;
}

describe("clearStep", () => {
  test("every answer belongs to a page, apart from the first screen's", () => {
    const covered = new Set(Object.values(STEP_DRAFT_FIELDS).flat());
    const firstScreen = ["hasQuote", "provider", "estimateRatePct"];
    const orphans = Object.keys(emptyDraft()).filter((k) => !covered.has(k as keyof GuidedDraft) && !firstScreen.includes(k));
    expect(orphans).toEqual([]);
  });

  test("clears only that page and keeps Smart/MillarX tied to the named provider", () => {
    const d = quote();
    const out = clearStep(d, "payment");
    expect(out.payment).toEqual(emptyDraft().payment);
    expect(out.paymentPeriod).toBeNull();
    expect(out.paymentCorrected).toBe(false);
    expect(out.smartMillarx).toBe(true);
    expect(out.residual).toEqual(d.residual);
    expect(out.provider).toBe("smartleasing");
    expect(clearStep({ ...d, provider: null }, "payment").smartMillarx).toBeNull();
  });
});

describe("Clear this page", () => {
  test("asks first, then clears this screen's answers only", () => {
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: quote(), step: "lease", visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
    );
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Clear this page" }));
    expect(screen.getByText("Clear the answers on this page?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, clear this page" }));
    const saved = JSON.parse(window.localStorage.getItem("nlc2-guided-draft-v3")!).draft as GuidedDraft;
    expect(saved.residual.text).toBe("");
    expect(saved.leaseYears).toBeNull();
    expect(saved.docFee.text).toBe("");
    expect(saved.baseValue.text).toBe("56000");
    expect(saved.payment.text).toBe("480.00");
    expect(screen.getByRole("button", { name: "Start over" })).toBeTruthy();
  });

  test("Cancel leaves the answers alone", () => {
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: quote(), step: "price", visited: ["intro", "car", "compare", "price"] }),
    );
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Clear this page" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const saved = JSON.parse(window.localStorage.getItem("nlc2-guided-draft-v3")!).draft as GuidedDraft;
    expect(saved.baseValue.text).toBe("56000");
  });
});
