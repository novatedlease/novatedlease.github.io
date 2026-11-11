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
  currentCarFuelAnnual,
  typicalFigures,
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
  d.runningGstHeading = "exGst";
  d.mileage = m("12000");
  d.runningPeriod = "perYear";
  d.service = m("1200");
  d.rego = m("900");
  d.insurance = m("1600");
  d.mgmt = m("250");
  d.fuel = m("2400");
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
    expect(missingForStep("car", d).join()).toMatch(/first held and used on or after 1 July 2022/);
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
    expect(missingForStep("car", d).join()).toMatch(/When would the lease roughly start/);
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
    expect(missingForStep("payment", { ...d, paymentBasis: null }).join()).toMatch(/include or exclude GST/);
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
  test("the petrol cost entered in Guided reaches Advanced unchanged", () => {
    seedGuided(quoteDraft());
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Open full workings in Advanced mode/ }));
    expect(num("Fuel")).toBe(2400);
    expect(num(/Drive-away cost/)).toBe(52400);
  });

  test("petrol cost can never be $0 in Guided: no 'not packaged' tick, and $0 isn't accepted", () => {
    const d = quoteDraft();
    d.fuel = none; // a draft saved before the tick was removed
    expect(missingForStep("running", d)).toContain("Fuel");
    expect(buildInputs(d)).toBeNull();
    d.fuel = m("0");
    expect(missingForStep("running", d)).toContain("Fuel");
    d.fuel = m("2400");
    expect(missingForStep("running", d)).not.toContain("Fuel");
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: quoteDraft(), step: "running", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
    );
    render(<App />);
    expect(screen.queryByText(/Fuel is not packaged/)).toBeNull();
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
    expect(screen.getByText("Do you have a novated lease quote?")).toBeTruthy();
  });
});

describe("cash in an investment property offset", () => {
  test("is taxed like savings interest, with its own missing-answer wording", () => {
    const d = quoteDraft();
    d.cashHome = "ipOffset";
    expect(missingForStep("you", d)).toContain("Investment property loan interest rate");
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
    // "Your answers" is a collapsible section card on the results screen.
    fireEvent.click(screen.getByRole("button", { name: /^Your answers/ }));
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
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
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

describe("Smart Leasing / MillarX on the payment screen", () => {
  function onPayment(d: GuidedDraft) {
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "payment", visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
    );
    render(<App />);
  }

  test("is asked after the GST question", () => {
    onPayment(quoteDraft());
    const text = document.querySelector(".gd-card")!.textContent!;
    expect(text.indexOf("including or excluding GST")).toBeLessThan(text.indexOf("Smart Leasing or MillarX?"));
  });

  test("Yes shows an unmissable prompt to use the correction tool, which turns into a confirmation once applied", () => {
    const d = quoteDraft();
    d.smartMillarx = true;
    onPayment(d);
    expect(screen.getByText(/You need to correct your Smart Leasing \/ MillarX payment first/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open the correction tool" })).toBeTruthy();
    cleanup();
    window.localStorage.clear();
    onPayment({ ...d, paymentCorrected: true });
    expect(screen.queryByText(/You need to correct/)).toBeNull();
    expect(screen.getByText(/Corrected payment entered below/)).toBeTruthy();
  });
});

describe("luxury vehicle adjustment", () => {
  test("is entered in the payment's period and converted to fortnightly", () => {
    const d = quoteDraft();
    d.baseValue = m("80000");
    d.driveaway = m("86000");
    d.luxAdj = m("130");
    d.paymentPeriod = "perFn";
    expect(buildInputs({ ...d, payment: m("900") })!.luxuryVehicleAdjPerFn).toBe(130);
    d.paymentPeriod = "perMonth";
    expect(buildInputs({ ...d, payment: m("1950") })!.luxuryVehicleAdjPerFn).toBeCloseTo(60, 6);
  });
});

describe("results cards point to Advanced mode", () => {
  test("each card has a button that opens the full breakdown in Advanced", () => {
    const d = quoteDraft();
    d.compareLoan = true;
    d.loanDeposit = none;
    d.loanRate = m("7.5");
    d.loanFee = none;
    seedGuided(d);
    render(<App />);
    const buttons = screen.getAllByRole("button", { name: /See full details in Advanced mode/ });
    expect(buttons).toHaveLength(2); // vs cash, vs loan
    fireEvent.click(buttons[1]);
    expect(num(/Drive-away cost/)).toBe(52400);
    expect(screen.getByText(/Section 2: Financial summary/)).toBeTruthy();
  });
});

describe("final review pass", () => {
  function exploringSeed(type: "EV" | "Non-EV") {
    const d = exploringEv();
    d.vehicleType = type;
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "review", visited: ["intro", "car", "compare", "quick", "you", "review"] }),
    );
  }

  test("a Guided EV changed to petrol in Advanced gets its fuel auto-filled (its $0 fuel wasn't an answer)", () => {
    exploringSeed("EV");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Open full workings/ }));
    fireEvent.click(screen.getByRole("button", { name: "Petrol / diesel / hybrid" }));
    expect(num(/^Fuel/)).toBeGreaterThan(0);
  });

  for (const name of [/Open full workings/, /^See the full workings$/]) {
    test(`'${name.source}' opens Advanced on the Details tab (the Summary would repeat the Guided result)`, () => {
      exploringSeed("EV");
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name }));
      expect(screen.getByText(/Section 2: Financial summary/)).toBeTruthy();
      expect(screen.getByRole("tab", { name: /Details/ }).getAttribute("aria-selected")).toBe("true");
    });
  }

  test("a Guided petrol car changed to EV in Advanced gets its electricity auto-filled", () => {
    exploringSeed("Non-EV");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Open full workings/ }));
    fireEvent.click(screen.getByRole("button", { name: "Electric" }));
    expect(num(/^Electricity/)).toBeGreaterThan(0);
  });


  test("typical running costs are grossed up when the quote shows them inc GST", () => {
    const d = quoteDraft();
    const ex = typicalFigures(d)!;
    d.runningGstHeading = "incGst";
    const inc = typicalFigures(d)!;
    expect(inc.insurance).toBe(Math.round(ex.insurance * 1.1));
    expect(inc.rego).toBe(Math.round(ex.rego * 1.1));
  });

  test("a corrected payment keeps its value when the period is switched", () => {
    const d = quoteDraft();
    d.smartMillarx = true;
    d.paymentCorrected = true;
    d.payment = m("600.00");
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "payment", visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
    );
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Month/ }));
    expect(field(/Finance \(lease\) payment/).value).toBe("1300.00");
  });
});

describe("exploring results: Try different numbers", () => {
  function exploreReview() {
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: exploringEv(), step: "review", visited: ["intro", "car", "compare", "quick", "you", "review"] }),
    );
    render(<App />);
  }
  const headline = () => document.querySelector(".gd-try__result")!.textContent!;

  test("sliders change the answers and the result, and can be reset", () => {
    exploreReview();
    const before = headline();
    expect(screen.queryByRole("button", { name: "Back to my answers" })).toBeNull();
    fireEvent.change(screen.getByRole("slider", { name: "Taxable income" }), { target: { value: "250000" } });
    expect(headline()).not.toBe(before);
    fireEvent.click(screen.getByRole("button", { name: /^Your answers/ }));
    // on the slider and in Your answers
    expect(screen.getAllByText("$250,000")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Back to my answers" }));
    expect(headline()).toBe(before);
    expect(screen.queryByRole("button", { name: "Back to my answers" })).toBeNull();
  });

  test("the rate slider feeds the assumed lease payment, and Advanced gets the new figures", () => {
    const d = exploringEv();
    const base = buildInputs(d)!.vehicleLeasePerFn;
    expect(buildInputs({ ...d, estimateRatePct: 12 })!.vehicleLeasePerFn).toBeGreaterThan(base);
    exploreReview();
    fireEvent.change(screen.getByRole("slider", { name: "Drive-away price" }), { target: { value: "70000" } });
    fireEvent.click(screen.getByRole("button", { name: /Open full workings/ }));
    expect(num(/Drive-away cost/)).toBe(70000);
  });

  test("is only on the exploring path", () => {
    seedGuided(quoteDraft());
    render(<App />);
    expect(screen.queryByText("Try different numbers")).toBeNull();
  });
});

describe("Try different numbers: every chosen comparison", () => {
  test("shows loan and keep-current-car lines when chosen, matching the result cards", () => {
    const d = exploringEv();
    d.cashHome = "offset";
    d.offsetRate = m("6");
    d.compareLoan = true;
    d.loanDeposit = none;
    d.loanRate = m("8");
    d.loanFee = none;
    d.compareCurrent = true;
    d.curValueNow = m("20000");
    d.curValueEnd = m("13000");
    d.curService = m("800");
    d.curRego = m("900");
    d.curFuel = m("2000");
    d.curInsurance = m("1000");
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "review", visited: ["intro", "car", "compare", "quick", "you", "alternatives", "review"] }),
    );
    render(<App />);
    const lines = [...document.querySelectorAll(".gd-try__line")].map((l) => l.textContent!);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^buying with cash/);
    expect(lines[1]).toMatch(/^a car loan/);
    expect(lines[2]).toMatch(/^keeping your current car/);
    // Each line's figure is the hero figure of the matching card, rounded to the nearest $1,000
    const thousands = (t: string) => Math.round(Number(t.replace(/[$,]/g, "")) / 1000) * 1000;
    const heroes = [...document.querySelectorAll(".gd-results")].flatMap((r) =>
      [...r.querySelectorAll("div")].filter((el) => /^\$[\d,]+$/.test(el.textContent ?? "") && el.children.length === 0).map((el) => thousands(el.textContent!)),
    );
    for (const l of lines) {
      expect(l).toMatch(/about \$[\d,]+,000 (better|worse) off/);
      expect(heroes).toContain(thousands(l.match(/\$[\d,]+/)![0]));
    }
  });

  test("only the cash line when no other comparison was chosen", () => {
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: exploringEv(), step: "review", visited: ["intro", "car", "compare", "quick", "you", "review"] }),
    );
    render(<App />);
    expect(document.querySelectorAll(".gd-try__line")).toHaveLength(1);
  });
});

describe("current car fuel follows the km answer", () => {
  function withCurrentCarTyped() {
    const d = exploringEv();
    d.compareCurrent = true;
    d.curValueNow = m("20000");
    d.curValueEnd = m("13000");
    d.curService = m("800");
    d.curRego = m("900");
    d.curFuel = m("2000");
    d.curFuelBasisKm = 15000;
    d.curInsurance = m("1000");
    return d;
  }

  test("a typed figure scales with km from the km it was entered at", () => {
    const d = withCurrentCarTyped();
    expect(currentCarFuelAnnual(d)).toBe(2000);
    d.mileage = m("30000");
    expect(currentCarFuelAnnual(d)).toBe(4000);
    expect(buildInputs(d)!.currentFuelAnnual).toBe(4000);
    // a draft saved before the km was recorded keeps the figure as typed
    d.curFuelBasisKm = null;
    expect(currentCarFuelAnnual(d)).toBe(2000);
  });

  test("typing the fuel records the km, and dragging the km slider moves the keep-current-car line", () => {
    const d = withCurrentCarTyped();
    d.curFuel = emptyDraft().curFuel;
    d.curFuelBasisKm = null;
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "alternatives", visited: ["intro", "car", "compare", "quick", "you", "alternatives"] }),
    );
    render(<App />);
    fireEvent.change(field(/Fuel or electricity/), { target: { value: "2000" } });
    fireEvent.click(screen.getByRole("button", { name: "See my results" }));
    const keepLine = () => [...document.querySelectorAll(".gd-try__line")].find((l) => /current car/.test(l.textContent!))!.textContent;
    const before = keepLine();
    fireEvent.change(screen.getByRole("slider", { name: "Kilometres per year" }), { target: { value: "30000" } });
    expect(keepLine()).not.toBe(before);
    fireEvent.click(screen.getByRole("button", { name: /Open full workings/ }));
    const fuels = screen.getAllByLabelText("Fuel").filter((e): e is HTMLInputElement => e.tagName === "INPUT");
    // The keep-current-car fuel box in Advanced gets the scaled figure
    expect(fuels.map((e) => Number(e.value.replace(/[,$]/g, "")))).toContain(4000);
  });
});

describe("results screen is divided into signposted parts", () => {
  const titles = () => [...document.querySelectorAll(".gd-part__title")].map((h) => h.textContent);

  test("exploring: results, what they are based on, try numbers, then save/share", () => {
    const d = exploringEv();
    d.cashHome = "offset";
    d.offsetRate = m("6");
    d.compareLoan = true;
    d.loanDeposit = none;
    d.loanRate = m("8");
    d.loanFee = none;
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "review", visited: ["intro", "car", "compare", "quick", "you", "alternatives", "review"] }),
    );
    render(<App />);
    expect(titles()).toEqual(["Your result", "What this is based on", "Try different numbers", "What to do next", "Save, share or see the full workings"]);
    expect(screen.getByText("Compared with buying with cash and a car loan.")).toBeTruthy();
  });

  test("quote path: no Try different numbers part", () => {
    seedGuided(quoteDraft());
    render(<App />);
    expect(titles()).toEqual(["Your result", "What this is based on", "What to do next", "Save, share or see the full workings"]);
    const next = screen.getByRole("navigation", { name: "What to do next" });
    const hrefs = [...next.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/tools/checklist/", "/tools/byo-employer-check/", "/start-here/is-it-worth-it/"]);
    for (const a of next.querySelectorAll("a")) expect(a.getAttribute("target")).toBe("_blank");
  });
});

describe("no cash to pay outright: paying cash is shown last, for reference", () => {
  const seedExploring = (d: GuidedDraft) =>
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "review", visited: ["intro", "car", "compare", "quick", "you", "alternatives", "review"] }),
    );
  const headlineLines = () => [...document.querySelectorAll(".gd-headline__line")].map((l) => l.textContent!);
  const loanDraft = () => {
    const d = exploringEv();
    d.compareLoan = true;
    d.loanDeposit = none;
    d.loanRate = m("8");
    d.loanFee = none;
    return d;
  };

  test("loan first, keeping the current car next, cash last with a note", () => {
    const d = loanDraft();
    d.compareCurrent = true;
    d.curValueNow = m("20000");
    d.curValueEnd = m("13000");
    d.curService = m("800");
    d.curRego = m("900");
    d.curFuel = m("2000");
    d.curInsurance = m("1000");
    seedExploring(d);
    render(<App />);
    const lines = headlineLines();
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/than a car loan$/);
    expect(lines[1]).toMatch(/than keeping your current car$/);
    expect(lines[2]).toMatch(/than paying cash \(for reference: you said you don't have the cash\)$/);
    const tries = [...document.querySelectorAll(".gd-try__line")].map((l) => l.textContent!);
    expect(tries[0]).toMatch(/^a car loan/);
    expect(tries[2]).toMatch(/^buying with cash \(for reference/);
    expect(screen.getByText("Compared with a car loan, keeping your current car and buying with cash (for reference only).")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/you said you'd pay cash if you didn't lease/i);
  });

  test("breakdown cards: the cash card comes after the loan card", () => {
    seedExploring(loanDraft());
    render(<App />);
    const titles = [...document.querySelectorAll(".gd-results [class*=card], .gd-results div")]
      .map((el) => el.textContent ?? "")
      .filter((t) => /^Novated lease vs (paying cash|a car loan) — over/.test(t) && t.length < 80);
    expect(titles[0]).toMatch(/a car loan/);
    expect(titles[titles.length - 1]).toMatch(/paying cash/);
  });

  test("pay cash chosen but no cash: cash line is kept with a hint that the answers conflict", () => {
    seedExploring(exploringEv());
    render(<App />);
    const lines = headlineLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/paying cash \(for reference/);
    expect(document.body.textContent).toMatch(/you said you'd pay cash if you didn't lease/i);
    fireEvent.click(screen.getByRole("button", { name: "change what you're comparing" }));
    expect(screen.getByText("If you didn't lease, what would you do?")).toBeTruthy();
  });

  test("with cash, the order is unchanged and no note appears", () => {
    const d = loanDraft();
    d.cashHome = "offset";
    d.offsetRate = m("6");
    seedExploring(d);
    render(<App />);
    const lines = headlineLines();
    expect(lines[0]).toMatch(/than paying cash$/);
    expect(lines[1]).toMatch(/than a car loan$/);
  });
});


describe("running-cost GST: heading first, then the credit question", () => {
  const onRunning = (d: GuidedDraft) =>
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "running", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
    );

  test("the credit question appears only when the heading says inc GST", () => {
    const d = quoteDraft();
    d.gstPassedOn = null;
    d.runningGstHeading = null;
    onRunning(d);
    render(<App />);
    const credit = () => screen.queryByText(/is a GST credit taken off the running costs/);
    expect(credit()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Including GST/ }));
    expect(credit()).toBeTruthy();
    expect(missingForStep("running", JSON.parse(window.localStorage.getItem("nlc2-guided-draft-v3")!).draft)).toContain(
      "Anywhere on the quote, is a GST credit taken off the running costs?",
    );
    fireEvent.click(screen.getByRole("button", { name: /^Yes/ }));
    expect(screen.getByText(/We'll take the GST off/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Excluding GST/ }));
    expect(credit()).toBeNull();
    const saved = JSON.parse(window.localStorage.getItem("nlc2-guided-draft-v3")!).draft as GuidedDraft;
    expect(saved.gstPassedOn).toBe("Yes");
    expect(saved.runningGstCredit).toBeNull();
  });

  test("inc GST with a credit taken off: GST passed on, typed figures taken back to ex GST", () => {
    const d = quoteDraft();
    d.runningGstHeading = "incGst";
    d.runningGstCredit = "Yes";
    d.gstPassedOn = "Yes";
    d.insurance = m("1650");
    const i = buildInputs(d)!;
    expect(i.gstSavingPassedOn).toBe("Yes");
    expect(i.insuranceAnnual).toBeCloseTo(1500, 6);
    expect(missingForStep("running", d)).toEqual([]);
  });

  test("inc GST with no credit: GST not passed on, figures used as typed", () => {
    const d = quoteDraft();
    d.runningGstHeading = "incGst";
    d.runningGstCredit = "No";
    d.gstPassedOn = "No";
    d.insurance = m("1650");
    const i = buildInputs(d)!;
    expect(i.gstSavingPassedOn).toBe("No");
    expect(i.insuranceAnnual).toBe(1650);
  });
});

describe("worse off: one plain reason when the figures show it", () => {
  const seed = (d: GuidedDraft) =>
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "review", visited: ["intro", "car", "compare", "quick", "you", "alternatives", "review"] }),
    );
  const why = () => [...document.querySelectorAll(".gd-headline__why")].map((p) => p.textContent!);
  const headline = () => document.querySelector(".gd-headline")!.textContent!;

  test("a high lease rate is named, with the BYO checker", () => {
    const d = exploringEv();
    d.vehicleType = "Non-EV";
    d.income = m("60000");
    d.estimateRatePct = 16;
    seed(d);
    render(<App />);
    expect(headline()).toMatch(/worse off than paying cash/);
    expect(why()[0]).toMatch(/interest rate is about 16%\. Competitive leases tend to be around 10% or lower/);
    const a = document.querySelector(".gd-headline__why a")!;
    expect(a.getAttribute("href")).toBe("/tools/byo-employer-check/");
  });

  test("keeping the current car: spending versus the new car's end value", () => {
    const d = exploringEv();
    d.compareCurrent = true;
    d.curValueNow = m("15000");
    d.curValueEnd = m("8000");
    d.curService = m("500");
    d.curRego = m("800");
    d.curFuel = m("1500");
    d.curInsurance = m("700");
    seed(d);
    render(<App />);
    expect(headline()).toMatch(/worse off than keeping your current car/);
    expect(why().join(" ")).toMatch(/spending about \$[\d,]+,000 more over 5 years, and the new car is worth only about \$[\d,]+,000 more at the end/);
  });

  test("better off: no reason line", () => {
    seed(exploringEv());
    render(<App />);
    expect(headline()).toMatch(/better off/);
    expect(why()).toEqual([]);
  });
});

describe("Advanced opens with example figures: say so", () => {
  const banner = () => screen.queryByText("These are example figures, not yours.");

  test("shown on a fresh open, gone after an edit, back after Reset", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(banner()).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Petrol / diesel / hybrid" }));
    expect(banner()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(banner()).toBeTruthy();
  });

  test("its Guided mode link switches back to Guided", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    fireEvent.click(screen.getByRole("button", { name: "Guided mode" }));
    expect(banner()).toBeNull();
    expect(window.localStorage.getItem("nlc2-mode")).toBe("guided");
  });

  test("not shown when Guided's answers were carried across", () => {
    seedGuided(quoteDraft());
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Open full workings/ }));
    expect(banner()).toBeNull();
  });
});

describe("intro: choosing doesn't move on; the quote reminder shows first", () => {
  test("“Have your quote open” appears only after Yes, and Next moves on", () => {
    render(<App />);
    const list = () => screen.queryByText("Have your quote open.");
    expect(list()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /No, I'm just exploring/ }));
    expect(list()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Yes, I have a quote/ }));
    expect(list()).toBeTruthy();
    expect(screen.getByText("Do you have a novated lease quote?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByText("Do you have a novated lease quote?")).toBeNull();
  });
});

describe("Advanced residual: a visible GST switch", () => {
  test("Including GST shows the same residual with GST added, and the engine keeps ex GST", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    const group = screen.getByRole("group", { name: "Residual GST basis" });
    const ex = screen.getByRole("button", { name: "Excluding GST", pressed: true });
    expect(group.contains(ex)).toBe(true);
    const input = () =>
      screen.getAllByLabelText(/Residual value/).find((el): el is HTMLInputElement => el.tagName === "INPUT")!;
    const exValue = Number(input().value.replace(/,/g, ""));
    fireEvent.click(screen.getByRole("button", { name: "Including GST" }));
    expect(screen.getByRole("button", { name: "Including GST" }).getAttribute("aria-pressed")).toBe("true");
    expect(Number(input().value.replace(/,/g, ""))).toBeCloseTo(exValue * 1.1, 0);
  });
});

describe("Advanced vehicle finance: a visible period switch", () => {
  test("Per month shows the same payment as a monthly figure", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(screen.getByRole("group", { name: "Vehicle finance period" })).toBeTruthy();
    const input = () =>
      screen.getAllByLabelText(/Vehicle finance \(ex GST\)/).find((el): el is HTMLInputElement => el.tagName === "INPUT")!;
    const perFn = Number(input().value.replace(/,/g, ""));
    expect(screen.getByRole("button", { name: "Per fortnight" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Per month" }));
    expect(screen.getByRole("button", { name: "Per month" }).getAttribute("aria-pressed")).toBe("true");
    expect(Number(input().value.replace(/,/g, ""))).toBeCloseTo((perFn * 26) / 12, 0);
  });
});

describe("running costs: the period comes first, so typical figures can show", () => {
  test("period sits right after kilometres; a pointer shows until it's chosen, then the typical-figure buttons", () => {
    const d = quoteDraft();
    d.runningPeriod = null;
    d.service = { text: "", none: false, estimated: false };
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "running", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
    );
    render(<App />);
    const text = document.body.textContent!;
    expect(text.indexOf("Kilometres per year")).toBeLessThan(text.indexOf("How are costs shown on your quote?"));
    expect(text.indexOf("How are costs shown on your quote?")).toBeLessThan(text.indexOf("What does the running-cost heading"));
    expect(screen.getByText(/to see a typical figure for each/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Use a typical figure/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Per year" }));
    expect(screen.queryByText(/to see a typical figure for each/)).toBeNull();
    expect(screen.getAllByRole("button", { name: /Use a typical figure/ }).length).toBeGreaterThan(0);
    expect(missingForStep("running", { ...d, mileage: { text: "", none: false, estimated: false } }).slice(0, 2)).toEqual([
      "Kilometres per year",
      "How are costs shown on your quote?",
    ]);
  });
});

describe("the new car's end value is asked with the current car, not on the lease screen", () => {
  test("shown on Your alternatives above the current-car questions, and Edit goes there", () => {
    const d = quoteDraft();
    d.compareCurrent = true;
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "alternatives", visited: ["intro", "car", "compare", "price", "lease", "payment", "running", "you", "alternatives"] }),
    );
    render(<App />);
    const text = document.body.textContent!;
    expect(text).toMatch(/The new car at the end/);
    expect(text.indexOf("The new car at the end")).toBeLessThan(text.indexOf("Keeping your current car"));
  });

  test("not asked on the exploring path", () => {
    const d = exploringEv();
    d.compareCurrent = true;
    expect(missingForStep("alternatives", d).join()).not.toMatch(/New car: estimated market value/);
  });
});

describe("accessibility: answer groups are named by their question", () => {
  test("each Choices group takes its question as its accessible name", () => {
    render(<App />);
    expect(screen.getByRole("group", { name: "Do you have a novated lease quote?" })).toBeTruthy();
  });

  test("the Smart Leasing correction callout is polite, not an alert", () => {
    const d = quoteDraft();
    d.smartMillarx = true;
    d.paymentCorrected = false;
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "payment", visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
    );
    render(<App />);
    const callout = screen.getByText(/You need to correct your Smart Leasing/).closest(".gd-callout")!;
    expect(callout.getAttribute("role")).toBe("status");
  });
});

describe("visual polish on running costs", () => {
  test("km box has a km example; typical-estimate explanation shows once for the group", () => {
    const d = quoteDraft();
    for (const k of ["service", "rego", "insurance"] as const) d[k] = { text: "1000", none: false, estimated: true };
    d.mileage = { text: "", none: false, estimated: false };
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "running", visited: ["intro", "car", "compare", "price", "lease", "payment", "running"] }),
    );
    render(<App />);
    const km = screen.getAllByLabelText(/Kilometres per year/).find((el) => el.tagName === "INPUT") as HTMLInputElement;
    expect(km.placeholder).toBe("e.g. 15000");
    expect(screen.getAllByText("Typical estimate")).toHaveLength(3);
    expect(screen.getAllByText(/Typical estimates aren't from your quote/)).toHaveLength(1);
  });
});

describe("explorer wording", () => {
  test("the interest-rate slider says what a competitive rate looks like", () => {
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: exploringEv(), step: "review", visited: ["intro", "car", "compare", "quick", "you", "review"] }),
    );
    render(<App />);
    expect(screen.getByText("Competitive leases tend to be around 10% or lower.")).toBeTruthy();
  });
});
