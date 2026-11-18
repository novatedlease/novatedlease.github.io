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

describe("tyres have their own box", () => {
  test("servicing plus tyres, except a typical servicing estimate, which already covers tyres", async () => {
    const { serviceAndTyresAnnual } = await import("../src/guided/draft");
    const d = quote();
    d.runningPeriod = "perYear";
    d.service = m("800");
    d.tyres = m("300");
    expect(serviceAndTyresAnnual(d)).toBe(1100);
    d.service = { text: "1000", none: false, estimated: true };
    expect(serviceAndTyresAnnual(d)).toBe(1000);
  });

  test("tyres are optional: a blank box isn't asked for", async () => {
    const { missingForStep } = await import("../src/guided/draft");
    const d = quote();
    d.runningPeriod = "perYear";
    d.service = m("800");
    expect(missingForStep("running", d).join()).not.toMatch(/Tyres/);
  });

  test("Easi's high combined budget warns under tyres when tyres drive the total", () => {
    const d = quote();
    d.provider = "easi";
    d.vehicleType = "EV";
    d.mileage = m("15000");
    d.runningPeriod = "perFn";
    d.runningGstHeading = "exGst";
    d.service = m("16.15");
    d.tyres = m("135.49");
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "running", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
    );
    render(<App />);
    const maintenance = document.querySelector('[data-field="service"]')!;
    const tyres = document.querySelector('[data-field="tyres"]')!;
    expect(maintenance.textContent).not.toMatch(/\$3,943/);
    expect(tyres.textContent).toMatch(/\$3,943 a year \(\$420 maintenance \+ \$3,523 tyres\)/);
  });
});

describe("high insurance budget", () => {
  test("Easi's $135.49 fortnightly cover prompts a comparison and links its own-insurance process", () => {
    const d = quote();
    d.provider = "easi";
    d.vehicleType = "EV";
    d.driveaway = m("58000");
    d.mileage = m("15000");
    d.runningPeriod = "perFn";
    d.runningGstHeading = "exGst";
    d.insurance = m("135.49");
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "running", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
    );
    render(<App />);
    const insurance = document.querySelector('[data-field="insurance"]')!;
    expect(insurance.textContent).toMatch(/\$3,523 a year is above our rough \$2,180 estimate/);
    expect(insurance.textContent).toMatch(/using your own insurer/);
    expect(insurance.querySelector("a")?.getAttribute("href"))
      .toBe("https://support.easifleet.com.au/self-insurance-policy");
  });

  test("the comparison prompt needs both 30% and $500 above the rough estimate", async () => {
    const { checkInsuranceCost } = await import("../src/guided/checks");
    expect(checkInsuranceCost(2833, 2180, "easi")).toEqual([]);
    expect(checkInsuranceCost(2834, 2180, "easi")[0].code).toBe("insurance_high_compare");
    expect(checkInsuranceCost(1499, 1000, "easi")).toEqual([]);
    expect(checkInsuranceCost(1500, 1000, "easi")[0].code).toBe("insurance_high_compare");
  });
});

describe("other lines help", () => {
  test("says where a carbon offset line goes", () => {
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: quote(), step: "running", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
    );
    render(<App />);
    expect(document.body.textContent).toMatch(/Carbon offset.*add it to Lease management\s+fees/s);
  });
});
