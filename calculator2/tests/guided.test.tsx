import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fortnightlyLeaseFromEffectiveAnnualRate } from "@engine/effectiveinterest";
import { computeDerived } from "@engine/derived";
import {
  atoMinimumResidualExGst,
  buildInputs,
  emptyDraft,
  financedExGst,
  missingForStep,
  moneyValue,
  parseAmount,
  estimateAssumptions,
  typicalMarketValueAtLeaseEnd,
  visibleSteps,
  type GuidedDraft,
  type Money,
} from "../src/guided/draft";
import {
  checkMarketValueEnd,
  checkPrices,
  checkResidual,
  diagnosePayment,
} from "../src/guided/checks";
import { GuidedMode } from "../src/guided/GuidedMode";

const m = (text: string): Money => ({ text, none: false, estimated: false });
const none: Money = { text: "", none: true, estimated: false };

function pricedDraft(): GuidedDraft {
  const d = emptyDraft();
  d.vehicleType = "Non-EV";
  d.vehicleCondition = "New";
  d.leaseStartDate = "2026-11-20";
  d.baseValue = m("48,990");
  d.driveaway = m("52400");
  d.leaseYears = 5;
  d.monthsDeferred = 2;
  d.docFee = m("395");
  d.residualBasis = "exGst";
  return d;
}

/** Adds a complete keep-current-car comparison, the only case where the lease-end market value is asked. */
function withCurrentCar(d: GuidedDraft): GuidedDraft {
  d.compareCurrent = true;
  d.curValueNow = m("18000");
  d.curValueEnd = m("9000");
  d.curService = m("1100");
  d.curRego = m("800");
  d.curFuel = m("2200");
  d.curInsurance = m("1500");
  return d;
}

function completeDraft(rate = 0.08): GuidedDraft {
  const d = pricedDraft();
  const residual = atoMinimumResidualExGst(d)!;
  d.residual = m(String(Math.round(residual)));
  const fn = fortnightlyLeaseFromEffectiveAnnualRate({
    financedAmountExGst: financedExGst(d)!,
    residualValueExGst: Math.round(residual),
    leaseYears: 5,
    deferMonths: 2,
    effectiveAnnualRate: rate,
  });
  d.marketValueEnd = m("20000");
  d.smartMillarx = false;
  d.paymentPeriod = "perFn";
  d.paymentBasis = "exGst";
  d.payment = m(fn.toFixed(2));
  d.gstPassedOn = "Yes";
  d.compareLoan = false;
  d.compareCurrent = false;
  d.runningPeriod = "perYear";
  d.mileage = m("12000");
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

describe("guided draft", () => {
  test("starts with nothing answered and no pre-filled numbers", () => {
    const d = emptyDraft();
    expect(moneyValue(d.docFee)).toBeNull();
    expect(missingForStep("lease", d)).toContain(
      "Documentation fee (or tick none)",
    );
    expect(buildInputs(d)).toBeNull();
  });

  test("parses typed amounts with symbols and separators", () => {
    expect(parseAmount("$48,990")).toBe(48990);
    expect(parseAmount("  ")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });

  test("a documentation fee must be entered or explicitly ticked as none", () => {
    const d = pricedDraft();
    d.docFee = emptyDraft().docFee;
    expect(missingForStep("lease", d).join()).toMatch(/Documentation fee/);
    d.docFee = none;
    expect(missingForStep("lease", d).join()).not.toMatch(/Documentation fee/);
    expect(moneyValue(d.docFee)).toBe(0);
  });

  test("builds engine inputs from a complete draft and the result computes", () => {
    const inputs = buildInputs(completeDraft());
    expect(inputs).not.toBeNull();
    expect(inputs!.leaseDocFee).toBe(395);
    expect(inputs!.vehicleBaseValue).toBe(48990);
    expect(inputs!.residualValueExGst).toBeGreaterThan(0);
    const derived = computeDerived(inputs!);
    expect(derived).toBeTruthy();
  });

  test("an inc-GST residual is converted to ex GST", () => {
    const d = completeDraft();
    const exGst = moneyValue(d.residual)!;
    d.residualBasis = "incGst";
    d.residual = m(String(Math.round(exGst * 1.1)));
    expect(buildInputs(d)!.residualValueExGst).toBeCloseTo(exGst, -1);
  });

  test("a monthly payment is converted to the engine's fortnightly figure", () => {
    const d = completeDraft();
    const fn = moneyValue(d.payment)!;
    d.paymentPeriod = "perMonth";
    d.payment = m(String(((fn * 26) / 12).toFixed(2)));
    expect(buildInputs(d)!.vehicleLeasePerFn).toBeCloseTo(fn, 1);
  });
});

describe("guided checks", () => {
  test("flags swapped or ex-GST prices", () => {
    expect(checkPrices(52000, 48000)[0].code).toBe("base_exceeds_driveaway");
    expect(checkPrices(48000, 48100)[0].code).toBe("base_equals_driveaway");
    expect(checkPrices(40000, 52000)[0].code).toBe("base_looks_ex_gst");
    expect(checkPrices(48990, 52400)).toEqual([]);
  });

  test("catches the inc-GST residual typed as ex GST", () => {
    const expected = 14000;
    expect(
      checkResidual({
        entered: 14000,
        basis: "exGst",
        expectedExGst: expected,
      }),
    ).toEqual([]);
    expect(
      checkResidual({
        entered: 15400,
        basis: "exGst",
        expectedExGst: expected,
      })[0].code,
    ).toBe("residual_looks_inc_gst");
    expect(
      checkResidual({
        entered: 15400,
        basis: "incGst",
        expectedExGst: expected,
      }),
    ).toEqual([]);
    expect(
      checkResidual({
        entered: 14000,
        basis: "incGst",
        expectedExGst: expected,
      })[0].code,
    ).toBe("residual_looks_ex_gst");
    expect(
      checkResidual({
        entered: 3000,
        basis: "exGst",
        expectedExGst: expected,
      })[0].code,
    ).toBe("residual_far_from_ato");
  });

  const args = {
    financedExGst: 42000,
    residualExGst: 12000,
    leaseYears: 5,
    deferMonths: 2,
  };
  const fnAt = (rate: number) =>
    fortnightlyLeaseFromEffectiveAnnualRate({
      financedAmountExGst: 42000,
      residualValueExGst: 12000,
      leaseYears: 5,
      deferMonths: 2,
      effectiveAnnualRate: rate,
    });

  test("accepts a typical payment", () => {
    const r = diagnosePayment(args, fnAt(0.08), "perFn");
    expect(r.status).toBe("ok");
    expect(r.rate!).toBeCloseTo(0.08, 3);
    expect(r.findings[0].level).toBe("ok");
  });

  test("a monthly figure entered as fortnightly is diagnosed", () => {
    const monthly = (fnAt(0.08) * 26) / 12;
    const r = diagnosePayment(args, monthly, "perFn");
    expect(r.findings.map((f) => f.code)).toContain("payment_wrong_period");
  });

  test("a fortnightly figure entered as monthly is diagnosed", () => {
    const r = diagnosePayment(args, fnAt(0.08), "perMonth");
    expect(r.findings.map((f) => f.code)).toContain("payment_wrong_period");
  });

  test("an inc-GST payment is diagnosed", () => {
    const r = diagnosePayment(args, fnAt(0.12) * 1.1, "perFn");
    expect(r.findings.map((f) => f.code)).toContain("payment_looks_inc_gst");
  });

  test("a rate below 6% is flagged as lower than expected", () => {
    const r = diagnosePayment(args, fnAt(0.045), "perFn");
    expect(r.findings.map((f) => f.code)).toContain("rate_unusually_low");
    expect(diagnosePayment(args, fnAt(0.065), "perFn").findings[0].code).toBe(
      "rate_typical",
    );
  });

  test("an impossible payment is an error", () => {
    expect(diagnosePayment(args, 5, "perFn").status).toBe("tooLow");
    expect(diagnosePayment(args, 5000, "perFn").status).toBe("tooHigh");
  });
});

describe("GuidedMode render", () => {
  test("opens on the intro screen with nothing pre-filled", () => {
    const html = renderToStaticMarkup(<GuidedMode onOpenAdvanced={() => {}} />);
    expect(html).toContain("Do you have a novated lease quote?");
    expect(html).not.toContain('value="450"');
  });
});

describe("guided: comparison, period and charging", () => {
  test("alternatives step only appears when a loan or current-car comparison is chosen", () => {
    const d = completeDraft();
    expect(visibleSteps(d)).not.toContain("alternatives");
    d.compareLoan = true;
    expect(visibleSteps(d)).toContain("alternatives");
    expect(missingForStep("alternatives", d)).toContain("Loan interest rate");
  });

  test("loan and current-car answers reach the engine inputs", () => {
    const d = completeDraft();
    d.compareLoan = true;
    d.loanDeposit = none;
    d.loanRate = m("7.5");
    d.loanFee = m("8");
    d.compareCurrent = true;
    d.curValueNow = m("18000");
    d.curValueEnd = m("9000");
    d.curService = m("1100");
    d.curRego = m("800");
    d.curFuel = m("2200");
    d.curInsurance = m("1500");
    expect(missingForStep("alternatives", d)).toEqual([]);
    const i = buildInputs(d)!;
    expect(i.compareWithCarLoan).toBe(true);
    expect(i.carLoanInterestRatePct).toBe(7.5);
    expect(i.carLoanMonthlyFee).toBe(8);
    expect(i.compareWithCurrentCar).toBe(true);
    expect(i.currentCarMarketValueNow).toBe(18000);
    expect(i.currentInsuranceAnnual).toBe(1500);
  });

  test("running costs entered per fortnight or month are annualised", () => {
    const d = completeDraft();
    d.runningPeriod = "perFn";
    d.service = m("50");
    d.mgmt = m("10");
    const i = buildInputs(d)!;
    expect(i.serviceMaintTyresAnnual).toBe(1300);
    expect(i.managementFeesAnnual).toBe(260);
    d.runningPeriod = "perMonth";
    expect(buildInputs(d)!.serviceMaintTyresAnnual).toBe(600);
  });

  test("fully solar EV accepts a zero or one-cent electricity price", () => {
    const d = completeDraft();
    d.vehicleType = "EV";
    d.chargingRate = emptyDraft().chargingRate;
    expect(missingForStep("running", d)).toContain(
      "Electricity price per kWh (0 if solar)",
    );
    d.chargingRate = none;
    expect(missingForStep("running", d)).toEqual([]);
    expect(buildInputs(d)!.avgAudPerKwh).toBe(0);
    d.chargingRate = m("0.01");
    expect(buildInputs(d)!.avgAudPerKwh).toBe(0.01);
  });
});

describe("guided: market value at the end of the lease", () => {
  test("is only asked against keeping the current car; otherwise the typical figure is used", () => {
    const d = completeDraft();
    d.marketValueEnd = emptyDraft().marketValueEnd;
    expect(missingForStep("lease", d).join()).not.toMatch(/market value/);
    expect(buildInputs(d)!.estimatedMarketValueAtEnd).toBe(
      Math.round((52400 * 0.4) / 1000) * 1000,
    );
    // An answer left over from an earlier comparison choice is ignored
    d.marketValueEnd = m("5000");
    expect(buildInputs(d)!.estimatedMarketValueAtEnd).not.toBe(5000);
  });

  test("a 5-year value passes straight through to the engine field", () => {
    const d = withCurrentCar(completeDraft());
    d.marketValueEnd = m("27000");
    expect(buildInputs(d)!.estimatedMarketValueAtEnd).toBe(27000);
  });

  test("a shorter-term value is converted back to the 5-year figure along the engine's own curve", () => {
    const d = withCurrentCar(completeDraft());
    d.leaseYears = 3;
    const p = moneyValue(d.driveaway)!;
    d.marketValueEnd = m(String(Math.round(p * 0.6)));
    const at5 = buildInputs(d)!.estimatedMarketValueAtEnd;
    expect(at5).toBeLessThan(p * 0.6);
    expect(p * Math.pow(at5 / p, 3 / 5)).toBeCloseTo(p * 0.6, -2);
  });

  test("is required against the current car, and the typical suggestion tracks the term", () => {
    const d = withCurrentCar(completeDraft());
    d.marketValueEnd = emptyDraft().marketValueEnd;
    expect(missingForStep("lease", d).join()).toMatch(/market value/);
    d.marketValueEnd = { text: "1", none: false, estimated: true };
    expect(missingForStep("lease", d).join()).not.toMatch(/market value/);
    const five = typicalMarketValueAtLeaseEnd(d)!;
    d.leaseYears = 3;
    expect(typicalMarketValueAtLeaseEnd(d)!).toBeGreaterThan(five);
  });

  test("a value at or above the price is an error; extreme depreciation is a warning", () => {
    expect(
      checkMarketValueEnd({ value: 60000, driveaway: 50000, years: 3 })[0]
        .level,
    ).toBe("error");
    expect(
      checkMarketValueEnd({ value: 2000, driveaway: 50000, years: 3 })[0].level,
    ).toBe("warn");
    expect(
      checkMarketValueEnd({ value: 30000, driveaway: 50000, years: 3 }),
    ).toEqual([]);
  });
});

describe("guided: NSW Health and Smart Leasing / MillarX", () => {
  test("the employer share is annualised from the period entered", () => {
    const d = completeDraft();
    d.nswHealth = true;
    d.nswAmount = m("100");
    expect(missingForStep("you", d).join()).toMatch(
      /fortnightly, monthly or yearly/,
    );
    d.nswPeriod = "perFn";
    expect(buildInputs(d)!.saveShareAnnual).toBe(2600);
    d.nswPeriod = "perMonth";
    expect(buildInputs(d)!.saveShareAnnual).toBe(1200);
    d.nswPeriod = "perYear";
    expect(buildInputs(d)!.saveShareAnnual).toBe(100);
  });

  test("the payment screen needs the provider question answered", () => {
    const d = completeDraft();
    d.smartMillarx = null;
    expect(missingForStep("payment", d).join()).toMatch(
      /Smart Leasing or MillarX/,
    );
  });
});

describe("guided: estimate path (no quote yet)", () => {
  function exploringDraft(): GuidedDraft {
    const d = emptyDraft();
    d.hasQuote = false;
    d.vehicleType = "EV";
    d.vehicleCondition = "New";
    d.driveaway = m("65000");
    d.leaseYears = 5;
    d.mileage = m("15000");
    d.compareLoan = false;
    d.compareCurrent = false;
    d.exploreStart = "before";
    d.income = m("110000");
    d.superPreNl = "Yes";
    d.cashHome = "offset";
    d.offsetRate = m("6.1");
    d.nswHealth = false;
    return d;
  }

  test("skips the quote-only screens and asks for the basics instead", () => {
    const d = exploringDraft();
    const steps = visibleSteps(d);
    expect(steps).toContain("quick");
    for (const s of ["price", "lease", "payment", "running"] as const)
      expect(steps).not.toContain(s);
    expect(visibleSteps({ ...d, hasQuote: true })).not.toContain("quick");
  });

  test("builds inputs from typical figures plus the reader's answers, and lists the assumptions", () => {
    const d = exploringDraft();
    const i = buildInputs(d)!;
    expect(i.driveawayCost).toBe(65000);
    expect(i.homeLoanOffsetInterestRate).toBe(6.1);
    expect(i.vehicleLeasePerFn).toBeGreaterThan(0);
    expect(estimateAssumptions(d)!.length).toBeGreaterThan(3);
  });

  test("a private-sale used car changes the financed amount (no GST credit)", () => {
    const d = exploringDraft();
    const base = buildInputs(d)!.financedAmountForInterestCalcExGst;
    d.vehicleCondition = "Used – private sale (no GST)";
    // A used EV before April 2027 now has to answer the history tests
    expect(buildInputs(d)).toBeNull();
    d.usedAfter2022 = true;
    d.usedLctNever = true;
    expect(buildInputs(d)!.financedAmountForInterestCalcExGst).toBeGreaterThan(
      base,
    );
  });

  test("super and NSW Health are optional on this path and default with a listed assumption; cash is asked", () => {
    const d = exploringDraft();
    d.superPreNl = null;
    d.cashHome = null;
    d.offsetRate = emptyDraft().offsetRate;
    d.nswHealth = null;
    expect(missingForStep("you", d)).toEqual(["Where your cash would sit"]);
    d.cashHome = "none";
    expect(missingForStep("you", d)).toEqual([]);
    d.nswHealth = true;
    d.nswAmount = m("100");
    d.nswPeriod = "perFn";
    expect(buildInputs(d)!.saveShareAnnual).toBe(0);
    d.nswHealth = null;
    const i = buildInputs(d)!;
    expect(i.superFromPreNlIncome).toBe("Yes");
    expect(i.saveShareAnnual).toBe(0);
    const labels = estimateAssumptions(d)!.map((a) => a.field);
    expect(labels).toEqual(
      expect.arrayContaining([
        "superFromPreNlIncome",
        "saveShareAnnual",
      ]),
    );
    // A "No" left over from the quote path doesn't leak into the estimate
    d.superPreNl = "No";
    expect(buildInputs(d)!.superFromPreNlIncome).toBe("Yes");
    expect(estimateAssumptions(d)!.map((a) => a.field)).toContain(
      "superFromPreNlIncome",
    );
  });

  test("still needs the three basics", () => {
    const d = exploringDraft();
    d.mileage = emptyDraft().mileage;
    expect(missingForStep("quick", d)).toContain("Annual kilometres");
    expect(buildInputs(d)).toBeNull();
    expect(missingForStep("intro", emptyDraft())).toContain(
      "Whether you have a quote yet",
    );
  });
});
