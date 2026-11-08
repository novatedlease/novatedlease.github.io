// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { fortnightlyLeaseFromEffectiveAnnualRate } from "@engine/effectiveinterest";
import { getLeaseFbtCategory } from "@engine/types";
import App from "../src/App";
import { COFFEE_NUDGE_AFTER_MODE_SWITCH_MS, COFFEE_NUDGE_GUIDED_RESULTS_DWELL_MS, COFFEE_NUDGE_MIN_ACTIVE_MS, _resetInputChangeCountForTests, getInputChangeCount, noteInputChange } from "../src/state/engagement";
import {
  PHASE_OUT_START,
  atoMinimumResidualExGst,
  buildInputs,
  emptyDraft,
  fbtCategoryOf,
  fbtLabel,
  financedExGst,
  missingForStep,
  nearEvThreshold,
  needsExploreStart,
  needsUsedEvChecks,
  paymentPerFn,
  visibleSteps,
  type GuidedDraft,
  type Money,
} from "../src/guided/draft";
import { checkEvThresholdEstimate, checkPaymentCorrected, diagnosePayment } from "../src/guided/checks";

/**
 * Regression cover for the November 2026 review of Guided mode: each block names the problem it
 * pins down, so a future change that reintroduces it fails here first.
 */

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

const m = (text: string): Money => ({ text, none: false, estimated: false });
const none: Money = { text: "", none: true, estimated: false };
const beforePhaseOut = new Date() < new Date("2027-03-01");

function quoteDraft(): GuidedDraft {
  const d = emptyDraft();
  d.hasQuote = true;
  d.vehicleType = "Non-EV";
  d.vehicleCondition = "New";
  d.leaseStartDate = "2026-12-20";
  d.compareLoan = false;
  d.compareCurrent = false;
  d.baseValue = m("48990");
  d.driveaway = m("52400");
  d.leaseYears = 5;
  d.monthsDeferred = 2;
  d.docFee = none;
  d.residualBasis = "unknown";
  const fn = fortnightlyLeaseFromEffectiveAnnualRate({
    financedAmountExGst: financedExGst(d)!,
    residualValueExGst: atoMinimumResidualExGst(d)!,
    leaseYears: 5,
    deferMonths: 2,
    effectiveAnnualRate: 0.08,
  });
  d.smartMillarx = false;
  d.paymentPeriod = "perFn";
  d.paymentBasis = "exGst";
  d.payment = m(fn.toFixed(2));
  d.gstPassedOn = "Yes";
  d.mileage = m("12000");
  d.runningPeriod = "perYear";
  d.service = m("1200");
  d.rego = m("900");
  d.insurance = m("1600");
  d.mgmt = m("250");
  d.fuel = none; // "Fuel is not packaged"
  d.income = m("110000");
  d.superPreNl = "Yes";
  d.cashHome = "none";
  d.nswHealth = false;
  return d;
}

function exploringEv(): GuidedDraft {
  const d = emptyDraft();
  d.hasQuote = false;
  d.vehicleType = "EV";
  d.vehicleCondition = "New";
  d.exploreStart = "before";
  d.compareLoan = false;
  d.compareCurrent = false;
  d.driveaway = m("50000");
  d.leaseYears = 5;
  d.mileage = m("15000");
  d.income = m("120000");
  d.cashHome = "none";
  return d;
}

describe("estimate path: used EVs and the phase-out date", () => {
  test("a used EV is asked the history tests, and passing them keeps the exemption", () => {
    const d = exploringEv();
    d.vehicleCondition = "Used – dealer sale (GST inc)";
    if (!beforePhaseOut) return; // after April 2027 the history tests no longer apply
    expect(needsUsedEvChecks(d)).toBe(true);
    expect(missingForStep("car", d).join()).toMatch(/first held after 1 July 2022/);
    expect(buildInputs(d)).toBeNull();
    d.usedAfter2022 = true;
    d.usedLctNever = true;
    expect(getLeaseFbtCategory(buildInputs(d)!)).toBe("EV_FBT_EXEMPT");
    d.usedLctNever = false;
    expect(getLeaseFbtCategory(buildInputs(d)!)).toBe("EV_FBT_APPLICABLE");
  });

  test("an EV estimate asks which side of 1 April 2027 the lease starts, and the answer reaches the engine", () => {
    const d = exploringEv();
    if (!beforePhaseOut) return;
    expect(needsExploreStart(d)).toBe(true);
    d.exploreStart = null;
    expect(missingForStep("car", d).join()).toMatch(/before 1 April 2027/);
    d.exploreStart = "after";
    d.driveaway = m("88000"); // base ≈ $81,500: over the $75k transitional cap
    expect(buildInputs(d)!.leaseStartDate).toBe(PHASE_OUT_START);
    expect(getLeaseFbtCategory(buildInputs(d)!)).toBe("EV_FBT_DISCOUNTED");
    d.exploreStart = "before";
    expect(getLeaseFbtCategory(buildInputs(d)!)).toBe("EV_FBT_EXEMPT");
    // Not asked for a petrol car
    expect(needsExploreStart({ ...d, vehicleType: "Non-EV" })).toBe(false);
  });

  test("warns when the guessed base value sits near an EV threshold", () => {
    const d = exploringEv();
    d.exploreStart = "after";
    d.driveaway = m(String(Math.round(75000 * 1.08)));
    const near = nearEvThreshold(d);
    if (!beforePhaseOut && !near) return;
    expect(near?.kind).toBe("cap");
    expect(checkEvThresholdEstimate(near)[0].message).toMatch(/\$75,000 cap/);
    d.driveaway = m("40000");
    expect(nearEvThreshold(d)).toBeNull();
  });
});

describe("keeping the current car", () => {
  test("the lease-end value is converted to the engine's 5-year figure", () => {
    const d = quoteDraft();
    d.leaseYears = 3;
    d.compareCurrent = true;
    d.marketValueEnd = { text: "", none: false, estimated: true };
    d.curValueNow = m("20000");
    d.curValueEnd = m("15000"); // after 3 years
    d.curService = m("800");
    d.curRego = m("900");
    d.curFuel = m("2000");
    d.curInsurance = m("1000");
    // payment for a 3-year term so the draft stays plausible
    const at5 = buildInputs(d)!.currentCarMarketValueAtEnd;
    expect(at5).toBeLessThan(15000);
    expect(20000 * Math.pow(at5 / 20000, 3 / 5)).toBeCloseTo(15000, -1);
  });

  test("typical figures can be accepted for the running costs", () => {
    const d = quoteDraft();
    d.compareCurrent = true;
    d.marketValueEnd = { text: "", none: false, estimated: true };
    d.curValueNow = m("20000");
    d.curValueEnd = { text: "", none: false, estimated: true };
    for (const k of ["curService", "curRego", "curFuel", "curInsurance"] as const)
      d[k] = { text: "1", none: false, estimated: true };
    expect(missingForStep("alternatives", d)).toEqual([]);
    const i = buildInputs(d)!;
    expect(i.currentRegistrationAnnual).toBe(900);
    expect(i.currentCarMarketValueAtEnd).toBeGreaterThan(0);
    expect(i.currentCarMarketValueAtEnd).toBeLessThan(20000);
  });
});

describe("payment: GST basis and the Smart Leasing / MillarX correction", () => {
  test("an inc-GST payment is converted to ex GST", () => {
    const d = quoteDraft();
    d.payment = m("550");
    d.paymentBasis = "incGst";
    expect(paymentPerFn(d)).toBeCloseTo(500, 6);
    expect(missingForStep("payment", { ...d, paymentBasis: null }).join()).toMatch(/inc or ex GST/);
  });

  test("an ex-GST payment labelled inc GST is diagnosed", () => {
    const a = { financedExGst: 47636, residualExGst: 13400, leaseYears: 5, deferMonths: 2 };
    const exFn = fortnightlyLeaseFromEffectiveAnnualRate({
      financedAmountExGst: a.financedExGst,
      residualValueExGst: a.residualExGst,
      leaseYears: 5,
      deferMonths: 2,
      effectiveAnnualRate: 0.065,
    });
    // Typed the ex-GST figure but said it includes GST: reads as a rate below 6%
    const diag = diagnosePayment(a, exFn, "perFn", "incGst");
    expect(diag.findings.map((f) => f.code)).toContain("payment_looks_ex_gst");
  });

  test("a typed Smart Leasing / MillarX payment is flagged until corrected", () => {
    expect(checkPaymentCorrected({ smartMillarx: true, corrected: false, typed: 600 })[0].code).toBe(
      "payment_not_corrected",
    );
    expect(checkPaymentCorrected({ smartMillarx: true, corrected: true, typed: 600 })).toEqual([]);
    expect(checkPaymentCorrected({ smartMillarx: false, corrected: false, typed: 600 })).toEqual([]);
  });
});

describe("plain-English FBT treatment and step order", () => {
  test("labels each category", () => {
    const d = quoteDraft();
    expect(fbtLabel(d, fbtCategoryOf(d)!)).toMatch(/not electric/);
    d.vehicleType = "EV";
    expect(fbtLabel(d, fbtCategoryOf(d)!)).toMatch(/Exempt from FBT/);
    d.baseValue = m("95000");
    d.driveaway = m("100000");
    expect(fbtLabel(d, fbtCategoryOf(d)!)).toMatch(/Luxury Car Tax threshold/);
  });

  test("the car comes before the comparison question", () => {
    const steps = visibleSteps(quoteDraft());
    expect(steps.indexOf("car")).toBeLessThan(steps.indexOf("compare"));
  });
});

// ─── App-level: the hand-off between Guided and Advanced ────────────────────

function seedGuided(d: GuidedDraft) {
  window.localStorage.setItem(
    "nlc2-guided-draft-v3",
    JSON.stringify({
      draft: d,
      step: "review",
      visited: ["intro", "car", "compare", "price", "lease", "payment", "running", "you", "review"],
    }),
  );
}
function field(label: string | RegExp): HTMLInputElement {
  return screen.getAllByLabelText(label).find((el): el is HTMLInputElement => el.tagName === "INPUT")!;
}
const num = (label: string | RegExp) => Number(field(label).value.replace(/[,$]/g, ""));

describe("Guided → Advanced hand-off", () => {
  test("a deliberate $0 fuel survives Advanced mode's auto-fill", () => {
    seedGuided(quoteDraft());
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Open full workings in Advanced mode/ }));
    expect(num("Fuel")).toBe(0);
    expect(num(/Drive-away cost/)).toBe(52400);
  });

  test("the header toggle carries finished answers across too", () => {
    seedGuided(quoteDraft());
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(num(/Drive-away cost/)).toBe(52400);
  });

  test("edits made in Advanced mode are never replaced without asking", () => {
    seedGuided(quoteDraft());
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Open full workings in Advanced mode/ }));
    fireEvent.change(field("Annual mileage"), { target: { value: "30000" } });
    fireEvent.blur(field("Annual mileage"));
    expect(num("Annual mileage")).toBe(30000);

    fireEvent.click(screen.getByRole("button", { name: "Guided" }));
    expect(screen.getByText(/Advanced mode has its own figures/)).toBeTruthy();
    // The header toggle now just switches, keeping the edit
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(num("Annual mileage")).toBe(30000);

    fireEvent.click(screen.getByRole("button", { name: "Guided" }));
    fireEvent.click(screen.getByRole("button", { name: /Open full workings in Advanced mode/ }));
    fireEvent.click(screen.getByRole("button", { name: /Keep my Advanced figures/ }));
    expect(num("Annual mileage")).toBe(30000);

    fireEvent.click(screen.getByRole("button", { name: "Guided" }));
    fireEvent.click(screen.getByRole("button", { name: /Open full workings in Advanced mode/ }));
    fireEvent.click(screen.getByRole("button", { name: /Replace with my guided answers/ }));
    expect(num("Annual mileage")).toBe(12000);
  });

  test("a returning reader is offered a fresh start", () => {
    seedGuided(quoteDraft());
    render(<App />);
    expect(screen.getByText(/Welcome back/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));
    expect(screen.getByText("Do you have a novated lease quote yet?")).toBeTruthy();
  });
});

describe("cash in an investment property offset", () => {
  test("is taxed like savings interest, with its own missing-answer wording", () => {
    const d = quoteDraft();
    d.cashHome = "ipOffset";
    expect(missingForStep("you", d)).toContain("Investment loan interest rate");
    d.savingsRatePreTax = m("6.5");
    const ip = buildInputs(d)!.homeLoanOffsetInterestRate;
    d.cashHome = "savings";
    expect(buildInputs(d)!.homeLoanOffsetInterestRate).toBeCloseTo(ip, 10);
    expect(ip).toBeLessThan(6.5);
    expect(ip).toBeGreaterThan(0);
    d.cashHome = "offset";
    d.offsetRate = m("6.5");
    expect(buildInputs(d)!.homeLoanOffsetInterestRate).toBe(6.5);
  });

  test("switching from savings clears the rate rather than reusing it as a loan rate", () => {
    seedGuided(quoteDraft());
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" }).find((b) => b.closest("div")?.textContent?.includes("Taxable income"))!);
    fireEvent.click(screen.getByRole("button", { name: /^Savings account/ }));
    fireEvent.change(field(/Savings account interest rate/), { target: { value: "4.5" } });
    fireEvent.click(screen.getByRole("button", { name: /Investment property offset/ }));
    expect(field(/Investment property loan interest rate/).value).toBe("");
  });
});

describe("coffee nudge in Guided mode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetInputChangeCountForTests();
    // jsdom has no scrollIntoView; the wizard scrolls to the top on each step
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => vi.useRealTimers());

  const passTime = () =>
    act(() => {
      vi.advanceTimersByTime(COFFEE_NUDGE_MIN_ACTIVE_MS + 10_000);
    });

  test("guided answers count as edited fields", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Yes, I have a quote/ }));
    fireEvent.click(screen.getByRole("button", { name: /Petrol, diesel or any hybrid/ }));
    fireEvent.click(screen.getByRole("button", { name: /^New$/ }));
    // hasQuote, vehicleType, vehicleCondition
    expect(getInputChangeCount()).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: /Use one month from now/ }));
    expect(getInputChangeCount()).toBe(4);
    // enough fields and time, but no results yet
    passTime();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("waits until 30 seconds on the results page, then shows and records mode and path", () => {
    const d = quoteDraft();
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "you", visited: ["intro", "car", "compare", "price", "lease", "payment", "running", "you"] }),
    );
    render(<App />);
    for (const f of ["a", "b", "c", "d", "e"]) noteInputChange(f);
    passTime();
    expect(screen.queryByRole("dialog")).toBeNull();
    const events: [string, Record<string, unknown>][] = [];
    window.gtag = (_kind: string, name: string, params: Record<string, unknown>) => {
      events.push([name, params]);
    };
    fireEvent.click(screen.getByRole("button", { name: "See my results" }));
    // Not straight away: the reader gets time to take in their result first
    act(() => {
      vi.advanceTimersByTime(COFFEE_NUDGE_GUIDED_RESULTS_DWELL_MS - 5000);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    // React applies the unpause after that jump; the nudge's next 5-second check then fires
    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    const shown = events.find(([n]) => n === "coffee_nudge_shown")![1];
    expect(shown).toMatchObject({ mode: "guided", guided_path: "quote" });
    delete window.gtag;
  });

  test("20 seconds on Guided results then straight to Advanced: held for 30 seconds after the switch, then shown", () => {
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: quoteDraft(), step: "you", visited: ["intro", "car", "compare", "price", "lease", "payment", "running", "you"] }),
    );
    render(<App />);
    for (const f of ["a", "b", "c", "d", "e"]) noteInputChange(f);
    act(() => {
      vi.advanceTimersByTime(COFFEE_NUDGE_MIN_ACTIVE_MS - 20_000);
    });
    fireEvent.click(screen.getByRole("button", { name: "See my results" }));
    act(() => {
      vi.advanceTimersByTime(20_000); // on the results page, past the 4 minutes, but under 30s there
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    act(() => {
      vi.advanceTimersByTime(COFFEE_NUDGE_AFTER_MODE_SWITCH_MS - 5000);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
