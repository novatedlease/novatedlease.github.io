// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, type GuidedDraft, type Money } from "../src/guided/draft";
import { longDate, residualAsTyped } from "../src/guided/answerText";
import { checkBaseValueAtCap, checkCurrentCarTotal, checkLoanFee, checkLoanRate } from "../src/guided/checks";

/** The owner's decisions on the 14 Nov 2026 UX review (notes/archive/UX_REVIEW_2026-11-14_DECISIONS.md). */

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

const m = (text: string): Money => ({ text, none: false, estimated: false });

/** Hovers the ⓘ inside `el` and returns its tooltip text. */
function tipIn(el: Element): string {
  fireEvent.mouseEnter(el.querySelector(".nlc-info-trigger")!.parentElement!);
  return document.querySelector('[role="tooltip"]')?.textContent ?? "";
}

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
    const tooltip = tipIn(pay);
    expect(tooltip).toMatch(/Compare this with your provider’s take-home impact/);
    expect(tooltip).toMatch(/Smart Leasing or MillarX correction/);
    expect(tooltip).toMatch(/LeaseGuard, incidentals or carbon offset/);
    expect(tooltip).toMatch(/Where do other lines on my quote go\?/);
    expect(tooltip).toMatch(/every running cost the same\s+GST treatment/);
    expect(document.querySelector('[role="tooltip"] a')?.getAttribute("href"))
      .toBe("/special-and-policy/smart-leasing-millarx-payment-structure/");
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
    expect(sup.textContent).toMatch(/^Super: not counted above, your employer pays about \$[\d,]+00 less into it over 5 years\./);
    expect(tipIn(sup)).toMatch(/after the lease\. After the 15% contributions tax, about \$[\d,]+00 of it would reach your account\./);
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
    const warn = lines.find((t) => t.startsWith("Super: if your employer works it out"));
    expect(warn).toMatch(/they'd pay\s+about \$[\d,]+ less into it over 5 years\. Ask payroll\./);
    const tip = tipIn(document.querySelector(".gd-headline__super")!);
    expect(tip).toMatch(/After the 15% contributions tax/);
    expect(tip).toMatch(/You chose “I'm not sure”, so the result above assumes super is unaffected\./);
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
      return text.match(/\$[\d,]+ less into it/)![0];
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

describe("results: running costs after a short lease", () => {
  test("a 3-year lease on the 5-year view says 2 years' running costs, paid in cash", () => {
    const d = fullQuote();
    d.leaseYears = 3;
    d.residual = m("26000");
    seedReview(d);
    render(<App />);
    // A short lease opens on its own term; the 5-year view is a tap away.
    expect(screen.getByRole("button", { name: "The 3-year lease" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector(".gd-headline__lead")!.textContent).toBe("Over 3 years, a novated lease leaves you:");
    fireEvent.click(screen.getByRole("button", { name: "5 years" }));
    expect(document.body.textContent).toContain("2 years' running costs after the lease ends, paid in cash");
    expect(document.body.textContent).not.toContain("Lease: running costs after it ends");
  });
});

describe("results: 'Before you decide' under a good result", () => {
  const decideFor = (patch: Partial<GuidedDraft>) => {
    seedReview({ ...fullQuote(), ...patch });
    const { unmount } = render(<App />);
    const text = document.querySelector(".gd-headline__decide")?.textContent ?? null;
    const link = document.querySelector(".gd-headline__decide a")?.getAttribute("href") ?? null;
    unmount();
    window.localStorage.clear();
    return { text, link };
  };

  test("an EV that comes out ahead: the big risks, the lease term and the risks link", () => {
    const { text, link } = decideFor({ vehicleType: "EV", fuel: { text: "", none: false, estimated: false }, chargingRate: m("0.3"), payment: m("420") });
    expect(text).toMatch(/^Before you decide: this assumes you keep your job and the car for all 5 years\./);
    expect(text).toMatch(/Leaving early, a write-off or needing to borrow\s+can cost more than you save\./);
    expect(link).toBe("/start-here/is-it-worth-it/#start-with-a-holistic-view-rather-than-the-savings-figure");
  });

  test("not shown when the lease comes out behind", () => {
    // The petrol fixture at $520 a fortnight comes out worse than paying cash.
    expect(decideFor({}).text).toBeNull();
  });
});

describe("take-home line: the pay cycle, not the payment's period", () => {
  const takeHome = (patch: Partial<GuidedDraft>) => {
    seedReview({ ...fullQuote(), ...patch });
    const { unmount } = render(<App />);
    const text = document.querySelector(".gd-headline__pay")!.textContent!;
    unmount();
    window.localStorage.clear();
    return text;
  };

  test("a monthly lease figure with fortnightly running costs shows per fortnight", () => {
    expect(takeHome({ paymentPeriod: "perMonth", payment: m("1127"), runningPeriod: "perFn", service: m("30.77"), rego: m("34.62"), insurance: m("57.69"), mgmt: m("11.54"), fuel: m("92.31") }))
      .toMatch(/less per fortnight\./);
  });

  test("weekly running costs show per week", () => {
    expect(takeHome({ runningPeriod: "perWeek", service: m("15.38"), rego: m("17.31"), insurance: m("28.85"), mgmt: m("5.77"), fuel: m("46.15") }))
      .toMatch(/less per week\./);
  });

  test("yearly running costs fall back to the payment's period", () => {
    expect(takeHome({ runningPeriod: "perYear" })).toMatch(/less per fortnight\./);
  });
});

describe("typical lease-end value says where it comes from", () => {
  const atAlternatives = (leaseYears: number) => {
    const d = { ...fullQuote(), compareCurrent: true, leaseYears };
    window.localStorage.setItem(
      "nlc2-guided-draft-v3",
      JSON.stringify({ draft: d, step: "alternatives", visited: ["intro", "car", "compare", "price", "lease", "payment", "running", "you", "alternatives"] }),
    );
    render(<App />);
    return document.body.textContent!;
  };

  test("5-year lease: 40% of the drive-away price after 5 years", () => {
    const text = atAlternatives(5);
    expect(text).toContain("Not sure? Use a typical figure (about $24,000)");
    expect(text).toContain("Based on 40% of the drive-away price after 5 years.");
  });

  test("shorter lease: scaled to the term", () => {
    expect(atAlternatives(3)).toContain("Based on 40% of the drive-away price after 5 years, scaled to your term.");
  });
});

describe("lost super: after contributions tax", () => {
  test("Division 293 incomes see the 30% rate", () => {
    const d = fullQuote();
    d.superPreNl = "No";
    d.income = m("240000");
    seedReview(d);
    render(<App />);
    expect(tipIn(document.querySelector(".gd-headline__super")!)).toMatch(/After the 30% contributions tax/);
  });
});
