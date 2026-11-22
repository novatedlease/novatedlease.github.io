import { afterEach, describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { asksAmountFinanced, asksFinancedCovers, buildInputs, emptyDraft, extrasBoughtAnywayAmount, financedExGst, financedExtrasAmount, type GuidedDraft } from "../src/guided/draft";
import { computeFinancialSummary } from "../../calculator/src/components/FinancialReport";
import { financedAmountExGstFromInputs } from "@engine/effectiveinterest";
import { financedAmountHint } from "../src/components/InputsPanel";
import { checkExtrasFinanced, diagnosePayment } from "../src/guided/checks";
import { exampleFor } from "../src/guided/providerGuide";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const KEY = "nlc2-guided-draft-v3";
Element.prototype.scrollIntoView = () => {};

// Smart Leasing quote 1 (the Zeekr case study): drive-away $70,275, FBT base value $69,917.55; the terms
// print a total amount financed of $79,267.30; the GST saving is capped at $6,353.
function quote1(over: Partial<GuidedDraft> = {}): GuidedDraft {
  return {
    ...emptyDraft(),
    hasQuote: true,
    provider: "smartleasing",
    vehicleType: "EV",
    vehicleCondition: "New",
    baseValue: { text: "69917.55", none: false, estimated: false },
    driveaway: { text: "70275", none: false, estimated: false },
    docFee: { text: "550", none: false, estimated: false },
    leaseYears: 5,
    ...over,
  };
}

const printed = { text: "79267.30", none: false, estimated: false };

describe("amount financed (Smart Leasing)", () => {
  test("only Smart Leasing asks for it", () => {
    expect(asksAmountFinanced("smartleasing")).toBe(true);
    expect(asksAmountFinanced("maxxia")).toBe(false);
    expect(asksAmountFinanced(null)).toBe(false);
  });

  test("the extras are the printed total less the car, its GST saving and the fee", () => {
    // 79,267.30 − (70,275 − 6,353 + 550)
    expect(Math.round(financedExtrasAmount(quote1({ amountFinanced: printed })))).toBe(14795);
  });

  test("the financed amount the rate is measured on becomes the printed total", () => {
    expect(Math.round(financedExGst(quote1())!)).toBe(64472);
    expect(Math.round(financedExGst(quote1({ amountFinanced: printed }))!)).toBe(79267);
  });

  test("the reader's documentation fee is left as they typed it", () => {
    const d = quote1({ amountFinanced: printed });
    expect(d.docFee.text).toBe("550");
    // The extras ride along on the lease-side fees the engine already has.
    expect(Math.round(financedExGst(d)! - financedExGst(quote1())!)).toBe(14795);
  });

  test("blank, or another provider, changes nothing", () => {
    expect(financedExtrasAmount(quote1())).toBe(0);
    expect(financedExtrasAmount(quote1({ provider: "maxxia", amountFinanced: printed }))).toBe(0);
  });

  test("a total below what the car needs adds nothing", () => {
    expect(financedExtrasAmount(quote1({ amountFinanced: { text: "60000", none: false, estimated: false } }))).toBe(0);
  });

  test("if the reader already added a cover to the fee, it is not counted twice", () => {
    const withCover = quote1({ amountFinanced: printed, docFee: { text: "1986", none: false, estimated: false } });
    expect(Math.round(financedExGst(withCover)!)).toBe(79267);
  });

  test("the lease screen shows the question, the screenshot and what it found", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ draft: quote1({ amountFinanced: printed }), step: "lease", visited: ["intro", "car", "compare", "price", "lease"] }),
    );
    render(<App />);
    expect(screen.getByText(/Total amount financed \(optional\)/)).toBeTruthy();
    expect(screen.getByText(/\$14,795 of the amount financed is on top of the car and the fee/)).toBeTruthy();
    // The documentation fee box still says $550 and gets no "a lot for a fee" warning.
    expect(screen.queryByText(/is a lot for a documentation fee/)).toBeNull();
    expect(document.querySelector(".gd-pointers[data-field='amountFinanced']")).toBeTruthy();
  });

  test("it has a marked screenshot like the other fields", () => {
    const example = exampleFor("smartleasing", "amountFinanced");
    expect(example?.image).toBe("/assets/images/quote-guide/smartleasing/field-amountFinanced.webp");
    expect(existsSync(resolve(__dirname, "../../docs", example!.image.replace(/^\//, "")))).toBe(true);
  });
});

// Quote 1's lease payment after the 58/60 correction: $682.09 a fortnight ex GST.
const args = (financed: number) => ({ financedExGst: financed, residualExGst: 18857, leaseYears: 5, deferMonths: 2 });

describe("the high-rate warning on a Smart Leasing quote", () => {
  test("points at the total amount financed, with a button, not at GST", () => {
    const diag = diagnosePayment(args(67267), 682.09, "perFn", "exGst", { financesExtras: true });
    expect(diag.rate!).toBeGreaterThan(0.15);
    const warn = diag.findings.find((f) => f.code === "rate_high_extras_financed");
    expect(warn?.action?.field).toBe("amountFinanced");
    expect(diag.findings.map((f) => f.code)).not.toContain("payment_looks_inc_gst");
  });

  test("without the Smart option the GST flip is still suggested", () => {
    const diag = diagnosePayment(args(67267), 682.09, "perFn", "exGst");
    expect(diag.findings.map((f) => f.code)).toContain("payment_looks_inc_gst");
  });

  test("on the printed amount financed the rate is the quote's own, about 10.8%", () => {
    const diag = diagnosePayment(args(79267.3), 682.09, "perFn", "exGst", { financesExtras: false });
    expect(diag.rate!).toBeGreaterThan(0.105);
    expect(diag.rate!).toBeLessThan(0.11);
  });

  test("on the payment screen the warning button takes the reader to the lease question", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        draft: quote1({
          monthsDeferred: 2,
          residualBasis: "exGst",
          residual: { text: "18857.33", none: false, estimated: false },
          payment: { text: "682.09", none: false, estimated: false },
          paymentPeriod: "perFn",
          paymentBasis: "exGst",
          paymentCorrected: true,
          smartMillarx: true,
        }),
        step: "payment",
        visited: ["intro", "car", "compare", "price", "lease", "payment"],
      }),
    );
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Enter the total amount financed/ }));
    return new Promise<void>((done) => setTimeout(() => {
      expect(screen.getByText(/Total amount financed \(optional\)/)).toBeTruthy();
      done();
    }, 150));
  });
});

const m = (text: string) => ({ text, none: false, estimated: false });

/** Quote 1 with everything answered, so the result screen can be reached. */
function completeQuote1(over: Partial<GuidedDraft> = {}): GuidedDraft {
  return quote1({
    leaseStartDate: "2026-12-22",
    monthsDeferred: 2,
    residualBasis: "exGst",
    residual: m("18857.33"),
    payment: m("682.09"),
    paymentPeriod: "perFn",
    paymentBasis: "exGst",
    paymentCorrected: true,
    smartMillarx: true,
    luxAdj: { text: "", none: true, estimated: false },
    gstPassedOn: "Yes",
    runningGstHeading: "exGst",
    runningPeriod: "perFn",
    mileage: m("20000"),
    service: m("24"),
    tyres: m("29"),
    rego: m("30"),
    insurance: m("96"),
    mgmt: m("3"),
    fuel: { text: "", none: true, estimated: false },
    chargingRate: m("0.08"),
    chargingBudget: m("42"),
    income: m("100000"),
    superPreNl: "Yes",
    cashHome: "offset",
    offsetRate: m("6.22"),
    compareLoan: false,
    compareCurrent: false,
    nswHealth: false,
    amountFinanced: printed,
    ...over,
  });
}

describe("financed extras on the result screen", () => {
  test("a message under the field on the lease screen, an amber note at the top of the result and a row in the answers", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ draft: completeQuote1(), step: "review", visited: ["intro", "car", "compare", "price", "lease", "payment", "running", "you", "review"] }),
    );
    render(<App />);
    const flags = document.querySelector(".gd-review-flags");
    expect(flags?.textContent).toMatch(/Worth another look/);
    expect(flags?.textContent).toMatch(/\$14,795 of the amount financed is on top of the car and the fee/);
    expect(flags?.querySelector(".gd-finding--warn")).toBeTruthy();
    fireEvent.click(screen.getByText(/Your answers \(/));
    expect(document.body.textContent).toMatch(/Financed beyond the car and fee/);
  });

  test("nothing extra appears when the total was left blank", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ draft: completeQuote1({ amountFinanced: { text: "", none: false, estimated: false } }), step: "review", visited: ["intro", "car", "compare", "price", "lease", "payment", "running", "you", "review"] }),
    );
    render(<App />);
    fireEvent.click(screen.getByText(/Your answers \(/));
    expect(document.body.textContent).not.toMatch(/financed is on top of the car/);
    expect(document.body.textContent).not.toMatch(/Financed beyond the car and fee/);
  });

  test("small extras are noted, not flagged amber", () => {
    expect(checkExtrasFinanced(840)[0].level).toBe("info");
    expect(checkExtrasFinanced(14795)[0].level).toBe("warn");
    expect(checkExtrasFinanced(40)).toEqual([]);
  });
});

describe("splitting the extras into what a cash buyer would have bought anyway", () => {
  const anyway = (n: string) => ({ extrasBoughtAnyway: m(n) });

  test("the amount is capped at the extras, and blank means none", () => {
    expect(extrasBoughtAnywayAmount(completeQuote1())).toBe(0);
    expect(extrasBoughtAnywayAmount(completeQuote1(anyway("3000")))).toBe(3000);
    expect(extrasBoughtAnywayAmount(completeQuote1(anyway("99999")))).toBeCloseTo(14795, 0);
  });

  test("it moves into the price a cash buyer pays, the fee stays the fee, and the amount financed is the printed total", () => {
    const none = buildInputs(completeQuote1())!;
    const split = buildInputs(completeQuote1(anyway("3000")))!;
    expect(split.driveawayCost - none.driveawayCost).toBe(3000);
    // Advanced's own cells: the real fee, and an explicit financed amount holding the extras.
    expect(none.leaseDocFee).toBe(550);
    expect(split.leaseDocFee).toBe(550);
    expect(Math.round(none.financedAmountForInterestCalcExGst)).toBe(79267);
    expect(Math.round(split.financedAmountForInterestCalcExGst)).toBe(79267);
  });

  test("the cash pathway costs the buyer that much more, so the lease looks that much better", () => {
    const none = computeFinancialSummary({ inputs: buildInputs(completeQuote1())! });
    const split = computeFinancialSummary({ inputs: buildInputs(completeQuote1(anyway("3000")))! });
    expect(split.offsetTotalSpentAtLeaseEnd - none.offsetTotalSpentAtLeaseEnd).toBeCloseTo(3000, 0);
    expect(split.nlTotalSpentAtLeaseEnd).toBeCloseTo(none.nlTotalSpentAtLeaseEnd, 0);
  });

  test("the message says how it was treated", () => {
    const field = checkExtrasFinanced(14795)[0].message;
    expect(field).toMatch(/such as accessories, total loss benefit, lease protection insurance etc\./);
    expect(field).toMatch(/In the next question, we ask you to tell us the sum of these components you would have paid if you bought the car in cash\./);
    // On the result screen "the next question" would be wrong, so it points back to the lease screen.
    const result = checkExtrasFinanced(14795, 0, "result")[0].message;
    expect(result).not.toMatch(/next question/);
    expect(result).toMatch(/on the lease screen/);
    const msg = checkExtrasFinanced(14795, 3000)[0].message;
    expect(msg).toMatch(/\$3,000 of it you would have bought anyway/);
    expect(msg).toMatch(/other \$11,795 counts against the lease only/);
  });

  test("the box appears on the lease screen only when there are extras, and the answers list the split", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ draft: completeQuote1(anyway("3000")), step: "lease", visited: ["intro", "car", "compare", "price", "lease"] }),
    );
    render(<App />);
    expect(screen.getByText(/how much would you have bought anyway if paying cash/)).toBeTruthy();
    cleanup();
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ draft: completeQuote1({ amountFinanced: { text: "", none: false, estimated: false } }), step: "lease", visited: ["intro", "car", "compare", "price", "lease"] }),
    );
    render(<App />);
    expect(screen.queryByText(/how much would you have bought anyway if paying cash/)).toBeNull();
  });

  test("the result screen lists what was counted each way", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ draft: completeQuote1(anyway("3000")), step: "review", visited: ["intro", "car", "compare", "price", "lease", "payment", "running", "you", "review"] }),
    );
    render(<App />);
    fireEvent.click(screen.getByText(/Your answers \(/));
    expect(document.body.textContent).toMatch(/Of which you would have bought anyway/);
    expect(document.querySelector(".gd-review-flags")?.textContent).toMatch(/\$3,000 of it you would have bought anyway/);
  });
});

describe("the extras note while typing", () => {
  const visited = ["intro", "car", "compare", "price", "lease"];
  function seed() {
    window.localStorage.setItem(KEY, JSON.stringify({ draft: completeQuote1(), step: "lease", visited }));
    render(<App />);
  }
  const box = (label: RegExp) => screen.getAllByLabelText(label).find((el) => el.tagName === "INPUT") as HTMLInputElement;

  test("stays quiet while the total is being typed, then appears when focus moves to the next box (Tab, no click)", () => {
    seed();
    act(() => box(/Total amount financed/).focus());
    expect(screen.queryByText(/of the amount financed is on top of the car/)).toBeNull();
    act(() => box(/how much would you have bought anyway/).focus());
    expect(screen.getByText(/of the amount financed is on top of the car/)).toBeTruthy();
  });

  test("and stays visible while the reader types in that next box", () => {
    seed();
    act(() => box(/how much would you have bought anyway/).focus());
    fireEvent.change(box(/how much would you have bought anyway/), { target: { value: "3000" } });
    expect(screen.getByText(/\$3,000 of it you would have bought anyway/)).toBeTruthy();
  });
});

describe("the workings explain a higher cash drive-away price", () => {
  const visited = ["intro", "car", "compare", "price", "lease", "payment", "running", "you", "review"];
  function review(over: Partial<GuidedDraft>) {
    window.localStorage.setItem(KEY, JSON.stringify({ draft: completeQuote1(over), step: "review", visited }));
    render(<App />);
  }

  test("a note under Cash: drive-away says how much of it is extras the reader would have bought anyway", () => {
    review({ extrasBoughtAnyway: m("1436.05") });
    expect(document.body.textContent).toMatch(/Includes \$1,436 of the extras financed in your lease that you said you would have bought anyway/);
    expect(document.body.textContent).toMatch(/Cash: drive-away\$71,711/);
  });

  test("no note when nothing was said to be bought anyway", () => {
    review({});
    expect(document.body.textContent).not.toMatch(/you said you would have bought anyway/);
    expect(document.body.textContent).toMatch(/Cash: drive-away\$70,275/);
  });
});

describe("what Advanced shows when Guided hands the quote over", () => {
  test("a real documentation fee, and a financed amount that says what sits above the car", () => {
    const inputs = buildInputs(completeQuote1())!;
    expect(inputs.leaseDocFee).toBe(550);
    const hint = financedAmountHint(inputs);
    expect(hint).toMatch(/\$14,795 above drive-away \+ documentation fee − GST saving/);
    expect(hint).toMatch(/belongs in the drive-away price/);
  });

  test("with extras the reader would have bought anyway, the note covers only the rest", () => {
    const inputs = buildInputs(completeQuote1({ extrasBoughtAnyway: m("1436.05") }))!;
    expect(inputs.driveawayCost).toBeCloseTo(71711.05, 2);
    expect(financedAmountHint(inputs)).toMatch(/\$13,359 above/);
  });

  test("an ordinary quote keeps the plain hint", () => {
    const inputs = buildInputs(completeQuote1({ amountFinanced: { text: "", none: false, estimated: false } }))!;
    expect(financedAmountHint(inputs)).not.toMatch(/above drive-away/);
  });
});

describe("financed covers on Maxxia and Oly quotes", () => {
  const blank = { text: "", none: false, estimated: false };
  const maxxia = (over: Partial<GuidedDraft> = {}) =>
    completeQuote1({ provider: "maxxia", smartMillarx: false, paymentCorrected: false, amountFinanced: blank, insuranceFinanced: "No", ...over });
  const visited = ["intro", "car", "compare", "price", "lease", "payment", "running", "you", "review"];

  test("only Maxxia and Oly ask for them", () => {
    expect(asksFinancedCovers("maxxia")).toBe(true);
    expect(asksFinancedCovers("oly")).toBe(true);
    expect(asksFinancedCovers("smartleasing")).toBe(false);
    expect(asksFinancedCovers("sgfleet")).toBe(false);
  });

  test("the result is the same as the old way of adding the covers into the fee box", () => {
    const oldWay = buildInputs(maxxia({ docFee: m("1750") }))!;
    const newWay = buildInputs(maxxia({ docFee: m("550"), financedCovers: m("1200") }))!;
    expect(newWay.financedAmountForInterestCalcExGst).toBeCloseTo(oldWay.financedAmountForInterestCalcExGst, 2);
    expect(newWay.driveawayCost).toBe(oldWay.driveawayCost);
    const a = computeFinancialSummary({ inputs: oldWay });
    const b = computeFinancialSummary({ inputs: newWay });
    expect(b.nlTotalSpentAtLeaseEnd).toBeCloseTo(a.nlTotalSpentAtLeaseEnd, 0);
    expect(b.offsetTotalSpentAtLeaseEnd).toBeCloseTo(a.offsetTotalSpentAtLeaseEnd, 0);
  });

  test("Advanced then shows the real establishment fee and a financed amount above the car", () => {
    const inputs = buildInputs(maxxia({ docFee: m("550"), financedCovers: m("1200") }))!;
    expect(inputs.leaseDocFee).toBe(550);
    expect(financedAmountHint(inputs)).toMatch(/\$1,200 above drive-away/);
  });

  test("covers on another provider's draft are ignored", () => {
    const inputs = buildInputs(completeQuote1({ provider: "sgfleet", smartMillarx: false, paymentCorrected: false, amountFinanced: blank, financedCovers: m("1200") }))!;
    expect(financedAmountHint(inputs)).not.toMatch(/above drive-away/);
  });

  test("the question shows on Maxxia and Oly lease screens, not on others", () => {
    for (const [provider, shown] of [["maxxia", true], ["oly", true], ["smartleasing", false], ["sgfleet", false]] as const) {
      window.localStorage.setItem(KEY, JSON.stringify({ draft: maxxia({ provider }), step: "lease", visited }));
      render(<App />);
      const label = screen.queryAllByText(/Optional covers financed up front \(if any\)/);
      expect(label.length > 0).toBe(shown);
      cleanup();
      window.localStorage.clear();
    }
  });

  test("the answers list shows them", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ draft: maxxia({ financedCovers: m("1200") }), step: "review", visited }));
    render(<App />);
    fireEvent.click(screen.getByText(/Your answers \(/));
    expect(document.body.textContent).toMatch(/Optional covers financed up front\$1,200/);
  });
});
