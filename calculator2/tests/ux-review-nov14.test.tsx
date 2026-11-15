// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, type GuidedDraft, type Money } from "../src/guided/draft";
import { longDate, residualAsTyped } from "../src/guided/answerText";
import { checkBaseValueAtCap, checkCurrentCarTotal, checkLoanFee, checkLoanRate } from "../src/guided/checks";

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

describe("UX 4: Your alternatives has sanity checks", () => {
  test("loan rate outside 2–25%", () => {
    expect(checkLoanRate(1.5)[0].code).toBe("loan_rate_low");
    expect(checkLoanRate(26)[0].code).toBe("loan_rate_high");
    expect(checkLoanRate(7.5)).toEqual([]);
    expect(checkLoanRate(22)).toEqual([]);
  });

  test("a monthly fee over $30 reads like the establishment fee", () => {
    expect(checkLoanFee(400)[0].message).toBe("$400 a month is high for an account fee. Most loans charge $0–$15. Is this the one-off establishment fee?");
    expect(checkLoanFee(30)).toEqual([]);
    expect(checkLoanFee(10)).toEqual([]);
  });

  test("current car costs over $15,000 a year", () => {
    expect(checkCurrentCarTotal(18000)[0].code).toBe("current_running_high");
    expect(checkCurrentCarTotal(9000)).toEqual([]);
  });

  test("on screen: the fee hint and the warning under the box", () => {
    const d = partialQuote();
    d.hasQuote = false;
    d.compareLoan = true;
    d.loanFee = m("400");
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "alternatives", visited: ["intro", "car", "compare", "quick", "you", "alternatives"] }),
    );
    render(<App />);
    expect(screen.getByText("Monthly account-keeping fee, often $0–$15. Not the one-off establishment fee.")).toBeTruthy();
    expect(screen.getByText(/\$400 a month is high for an account fee/)).toBeTruthy();
  });
});

describe("UX 8: the payment amount comes first", () => {
  test("amount box before the period and GST questions; Still to answer in the same order", () => {
    const d = partialQuote();
    d.monthsDeferred = 2;
    d.docFee = { text: "", none: true, estimated: false };
    d.residual = m("16860");
    d.residualBasis = "incGst";
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "payment", visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
    );
    render(<App />);
    const text = document.body.textContent!;
    expect(text.indexOf("Finance (lease) payment")).toBeLessThan(text.indexOf("How does your quote show the payment?"));
    expect(text.indexOf("How does your quote show the payment?")).toBeLessThan(text.indexOf("Does the payment include or exclude GST?"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const items = [...document.querySelectorAll(".gd-missing__list li")].map((li) => li.textContent);
    // An unnamed provider is first asked about Smart Leasing / MillarX, which decides what comes next.
    expect(items.slice(0, 2)).toEqual(["Is your lease with Smart Leasing or MillarX?", "Finance (lease) payment"]);
  });

  test("Smart Leasing and MillarX go straight to the correction tool; the amount appears once it has run", () => {
    const d = partialQuote();
    d.monthsDeferred = 2;
    d.docFee = { text: "", none: true, estimated: false };
    d.residual = m("16860");
    d.residualBasis = "incGst";
    d.provider = "smartleasing";
    d.smartMillarx = true;
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "payment", visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
    );
    const { unmount } = render(<App />);
    const text = document.body.textContent!;
    expect(text).toContain("Open the correction tool");
    expect(text).not.toContain("Finance (lease) payment");
    expect(text).not.toContain("How does your quote show the payment?");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const items = [...document.querySelectorAll(".gd-missing__list li")].map((li) => li.textContent);
    expect(items).toEqual(["Run the payment correction tool"]);
    unmount();

    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({
        draft: { ...d, payment: m("480.00"), paymentPeriod: "perFn", paymentBasis: "exGst", paymentCorrected: true },
        step: "payment",
        visited: ["intro", "car", "compare", "price", "lease", "payment"],
      }),
    );
    render(<App />);
    expect(document.body.textContent).toContain("Finance (lease) payment");
    expect(document.body.textContent).toContain("Corrected payment entered above");
  });
});

function fullQuote(): GuidedDraft {
  const d = partialQuote();
  d.monthsDeferred = 2;
  d.docFee = { text: "", none: true, estimated: false };
  d.residualBasis = "unknown";
  d.smartMillarx = false;
  d.paymentPeriod = "perFn";
  d.paymentBasis = "exGst";
  d.payment = m("520");
  d.luxAdj = { text: "", none: true, estimated: false };
  d.gstPassedOn = "Yes";
  d.runningGstHeading = "exGst";
  d.mileage = m("15000");
  d.runningPeriod = "perYear";
  d.service = m("800");
  d.tyres = { text: "", none: true, estimated: false };
  d.rego = m("900");
  d.insurance = m("1500");
  d.mgmt = m("300");
  d.fuel = m("2400");
  d.income = m("120000");
  d.superPreNl = "Yes";
  d.cashHome = "offset";
  d.offsetRate = m("6.1");
  d.nswHealth = false;
  return d;
}

describe("UX 2 and 3: take-home pay and lost super beside the headline", () => {
  test("quote path: take-home per pay in the quote's period, with the compare prompt", () => {
    seedReview(fullQuote());
    render(<App />);
    const pay = document.querySelector(".gd-headline__pay")!;
    expect(pay.textContent).toMatch(/^Your take-home pay: about \$[\d,]+ less per fortnight\./);
    expect(pay.textContent).toMatch(/Compare this with the take-home figure on your quote\./);
    expect(document.querySelector(".gd-headline__super")).toBeNull();
  });

  test("a monthly quote shows it per month", () => {
    const d = fullQuote();
    d.paymentPeriod = "perMonth";
    d.payment = m("1127");
    seedReview(d);
    render(<App />);
    expect(document.querySelector(".gd-headline__pay")!.textContent).toMatch(/less per month\./);
  });

  test("super worked out after the lease: the shortfall shows, not subtracted", () => {
    const d = fullQuote();
    d.superPreNl = "No";
    seedReview(d);
    render(<App />);
    const sup = document.querySelector(".gd-headline__super")!;
    expect(sup.textContent).toMatch(/^Not counted above: about \$[\d,]+00 less super over 5 years\./);
    expect(document.body.textContent).not.toMatch(/Your super may also be reduced/);
  });
});

describe("UX 14: the quote path lists what we assumed", () => {
  test("'Not sure' answers first, then the method; the two italic notes move into it", () => {
    const d = fullQuote();
    d.monthsDeferred = 2;
    d.monthsDeferredUnsure = true;
    seedReview(d);
    render(<App />);
    const title = screen.getByRole("button", { name: /^What we assumed \(\d+\)/ });
    fireEvent.click(title);
    const text = document.body.textContent!;
    expect(text).toMatch(/You chose “Not sure”/);
    expect(text).toMatch(/Months until first payment.*2, the most common/);
    expect(text).toMatch(/How we work it out/);
    expect(text).toMatch(/Legislated rates for each year/);
    expect(text).toMatch(/6\.1% for the whole lease/);
    expect(text).not.toMatch(/Residual assumption:/);
  });

  test("no 'Not sure' group when everything was answered", () => {
    const d = fullQuote();
    d.residual = m("16860");
    d.residualBasis = "incGst";
    seedReview(d);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^What we assumed/ }));
    expect(document.body.textContent).not.toMatch(/You chose “Not sure”/);
  });
});

describe("Smart Leasing correction box links to the explainer", () => {
  test("the must-correct box links to the payment structure article", () => {
    const d = partialQuote();
    d.provider = "smartleasing";
    d.smartMillarx = true;
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "payment", visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
    );
    render(<App />);
    const link = screen.getByRole("link", { name: "Why the printed figure is too high" });
    expect(link.getAttribute("href")).toBe("/special-and-policy/smart-leasing-millarx-payment-structure/");
  });
});

describe("super: 'I'm not sure' shows what's at stake", () => {
  test("names the super that would be lost if the employer uses the after-lease salary", () => {
    const d = fullQuote();
    d.superPreNl = "Unsure";
    seedReview(d);
    render(<App />);
    const lines = [...document.querySelectorAll(".gd-headline__super")].map((el) => el.textContent!);
    const warn = lines.find((t) => t.startsWith("Check how your employer works out super."));
    expect(warn).toMatch(/you'd get about \$[\d,]+ less super over 5 years\./);
    expect(warn).toMatch(/You chose “I'm not sure”, so the result assumes super is unaffected\. Ask payroll\./);
  });

  test("the same amount as when the reader answers 'after lease salary'", () => {
    const amount = (answer: GuidedDraft["superPreNl"]) => {
      const d = fullQuote();
      d.superPreNl = answer;
      seedReview(d);
      const { unmount } = render(<App />);
      const text = document.querySelector(".gd-headline__super")!.textContent!;
      unmount();
      window.localStorage.clear();
      return text.match(/\$[\d,]+ less super/)![0];
    };
    expect(amount("Unsure")).toBe(amount("No"));
  });

  test("not shown when the reader knows super is worked out before the lease", () => {
    seedReview(fullQuote());
    render(<App />);
    expect(document.body.textContent).not.toMatch(/Check how your employer works out super/);
  });
});

describe("results: the interest row is named after where the cash would come from", () => {
  const rowLabels = (cashHome: GuidedDraft["cashHome"], rate: Partial<GuidedDraft>) => {
    const d = { ...fullQuote(), cashHome, ...rate };
    seedReview(d);
    render(<App />);
    return document.body.textContent!;
  };

  test("home loan offset: home loan interest", () => {
    expect(rowLabels("offset", {})).toMatch(/(Home loan interest saved|Extra home loan interest) with the lease/);
  });

  test("investments: investment returns, not home loan interest", () => {
    const text = rowLabels("invested", { investedRate: m("7") });
    expect(text).toMatch(/(Extra investment returns|Investment returns lost) with the lease/);
    expect(text).not.toMatch(/home loan interest (saved|with the lease)/i);
  });

  test("savings: savings interest", () => {
    expect(rowLabels("savings", { savingsRatePreTax: m("4.5") })).toMatch(/(Extra savings interest|Savings interest lost) with the lease/);
  });

  test("investment property offset: investment loan interest", () => {
    expect(rowLabels("ipOffset", { savingsRatePreTax: m("6") })).toMatch(/(Investment loan interest saved|Extra investment loan interest) with the lease/);
  });
});
